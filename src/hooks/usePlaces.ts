'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Place } from '@/types/place';
import {
  isOpenOnWeekday,
  isOpenAt,
  todayStr,
  weekdayFromDateString,
  jpWeek,
  getClosingTimeForMinutes,
} from '@/lib/openingHours';
import { useSearchHistory } from '@/hooks/useSearchHistory';

const pad2 = (n: number) => String(n).padStart(2, '0');

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

export function usePlaces() {
  // 検索ワード
  const [q, setQ] = useState('');      // 確定値（API送信用）
  const [qInput, setQInput] = useState(''); // 入力欄表示用
  const dirty = qInput !== q;

  // 位置情報
  const [lat, setLat] = useState<number>();
  const [lng, setLng] = useState<number>();
  const hasLatLng = lat != null && lng != null;

  // 並び替え / ページング（常に近い順で固定）
  const sortByDistance = true;
  const [cursor, setCursor] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  // 日付・時刻フィルタ
  const [dateStr, setDateStr] = useState<string>(todayStr());
  const [timeStr, setTimeStrState] = useState<string>(''); // "HH:MM" or ''
  const [timeSource, setTimeSource] = useState<'auto' | 'manual'>('auto');
  const timeSourceRef = useRef<'auto' | 'manual'>(timeSource);
  const {
    history: searchHistory,
    addHistory,
    clearHistory,
  } = useSearchHistory();

  // 最終受付考慮
  const [finalReception, setFinalReceptionState] = useState<'none' | '30min' | '60min'>('none');

  // 検索状態
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 結果
  const [allResults, setAllResults] = useState<Place[]>([]);

  // 無限スクロール監視ターゲット
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const [currentHHMM, setCurrentHHMM] = useState<string>('');
  const [currentMinutes, setCurrentMinutes] = useState<number | null>(null);
  const [todayDateStr, setTodayDateStr] = useState<string>(dateStr);

  // サーバーとクライアントで同じ初期表示になるよう、マウント後に現在時刻と日付を設定します
  const refreshNow = useCallback((source?: 'auto' | 'manual') => {
    const now = new Date();
    const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    setCurrentHHMM(hhmm);
    setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    setTodayDateStr(todayStr(now));
    const effectiveSource = source ?? timeSourceRef.current;
    if (effectiveSource === 'auto') {
      timeSourceRef.current = 'auto';
      setTimeSource('auto');
      setTimeStrState(hhmm);
    }
    return hhmm;
  }, []);

  useEffect(() => {
    refreshNow('auto');
  }, [refreshNow]);

  useEffect(() => {
    timeSourceRef.current = timeSource;
  }, [timeSource]);

  const handleFinalReceptionChange = useCallback((value: typeof finalReception) => {
    setFinalReceptionState(value);
    refreshNow();
  }, [refreshNow]);

  const setTimeStrExternal = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      refreshNow('auto');
      return;
    }
    timeSourceRef.current = 'manual';
    setTimeSource('manual');
    setTimeStrState(value);
  }, [refreshNow]);

  // 現在地取得
  useEffect(() => {
    let cancelled = false;
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      (err) => {
        if (cancelled) return;
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 }
    );
    return () => { cancelled = true; };
  }, []);

  // 検索
  const abortRef = useRef<AbortController | null>(null);
  const fetchPlaces = useCallback(
    async (
      append = false,
      overrides?: Partial<{ q: string; lat: number; lng: number; cursor: string | null }>
    ) => {
      const Q = (overrides?.q ?? q).trim();
      if (Q.length === 0) {
        if (!append) {
          setAllResults([]);
          setCursor(null);
          setHasSearched(false);
        }
        return;
      }

      if (!append) {
        setAllResults([]);
      }

      setLoading(true);
      setError(null);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const LAT = overrides?.lat ?? lat;
      const LNG = overrides?.lng ?? lng;
      const CUR = (overrides && 'cursor' in overrides) ? overrides.cursor : cursor;
      const USE_COORDS = LAT != null && LNG != null;
      const MODE = USE_COORDS && sortByDistance ? 'distance' : 'relevance';

      const params = new URLSearchParams();
      if (Q) params.set('q', Q);
      if (USE_COORDS) { params.set('lat', String(LAT)); params.set('lng', String(LNG)); }
      if (CUR) params.set('cursor', CUR);
      params.set('rank', MODE);

      try {
        const res = await fetch(`/api/places?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        const dataUnknown: unknown = await res.json();
        if (!res.ok) {
          const msg = isObject(dataUnknown) && typeof dataUnknown.message === 'string'
            ? dataUnknown.message : '検索に失敗しました';
          throw new Error(msg);
        }
        const list: Place[] =
          isObject(dataUnknown) && Array.isArray((dataUnknown as any).places)
            ? ((dataUnknown as any).places as Place[])
            : [];
        const token: string | null =
          isObject(dataUnknown) && typeof (dataUnknown as any).nextPageToken === 'string'
            ? ((dataUnknown as any).nextPageToken as string)
            : null;

        const unique = list.filter((p) => {
          const key = p.id;
          if (!key) return true;
          if (seenRef.current.has(key)) return false;
          seenRef.current.add(key);
          return true;
        });

        setAllResults((prev) => (append ? [...prev, ...unique] : unique));
        setCursor(token);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError(e?.message ?? '不明なエラーが発生しました');
          if (!append) setAllResults([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [q, lat, lng, cursor, sortByDistance]
  );

  // フォーム submit（検索確定）
  const executeSearch = useCallback((rawTerm: string) => {
    const trimmed = rawTerm.trim();
    setQInput(trimmed);
    setQ(trimmed);
    setCursor(null);
    seenRef.current = new Set();
    setError(null);

    if (typeof window !== 'undefined') {
      const active = document.activeElement as HTMLElement | null;
      active?.blur();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (trimmed.length === 0) {
      setHasSearched(false);
      setAllResults([]);
      return;
    }

    refreshNow();
    setHasSearched(true);
    addHistory(trimmed);
    fetchPlaces(false, { q: trimmed, cursor: null });
  }, [addHistory, fetchPlaces, refreshNow]);

  const submitSearch = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(qInput);
  }, [executeSearch, qInput]);

  const searchFromHistory = useCallback((term: string) => {
    executeSearch(term);
  }, [executeSearch]);

  const resetSearch = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setQ('');
    setQInput('');
    setCursor(null);
    seenRef.current = new Set();
    setAllResults([]);
    setHasSearched(false);
    setError(null);
    setLoading(false);
  }, []);

  const isToday = useMemo(() => dateStr === todayDateStr, [dateStr, todayDateStr]);

  // 表示用: 日付/時刻に基づくフィルタ済み結果
  const filteredResults = useMemo(() => {
    const wd = weekdayFromDateString(dateStr); // 0..6

    const parseHM = (s: string) => {
      const [h, m] = (s || '00:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const minutesFromInput = timeStr ? parseHM(timeStr) : null;
    const minutes = minutesFromInput ?? (currentMinutes ?? 0);

    return allResults
      .filter((p) => isOpenOnWeekday(p as any, wd))
      .filter((p) => isOpenAt(p as any, wd, minutes))
      .filter((p) => {
        // 最終受付考慮のフィルタリング
        if (finalReception === 'none') return true;

        const closingAbsolute = getClosingTimeForMinutes(p as any, wd, minutes);
        if (closingAbsolute === null) return true; // 終了時間不明の場合は表示

        const bufferMinutes = finalReception === '30min' ? 30 : 60;
        const dayStart = wd * 1440;
        const targetAbsolute = dayStart + minutes;
        const cutoffAbsolute = closingAbsolute - bufferMinutes;

        // 自身の日の営業時間に属する場合はそのまま比較
        if (closingAbsolute >= dayStart) {
          return targetAbsolute <= cutoffAbsolute;
        }

        // 前日からの持ち越し営業の場合
        if (closingAbsolute < dayStart) {
          return targetAbsolute + 1440 <= cutoffAbsolute + 1440;
        }

        return true;
      });
  }, [allResults, dateStr, timeStr, finalReception, currentMinutes]);

  // 無限スクロール
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && cursor && !dirty && hasSearched) {
        fetchPlaces(true);
      }
    }, { threshold: 1.0, rootMargin: '200px' });

    observer.observe(el);

    return () => observer.disconnect();
  }, [loading, cursor, dirty, hasSearched, fetchPlaces]);

  // ラベル（UI側で利用）
  const dateLabel = useMemo(() => {
    const sel = new Date(`${dateStr}T00:00:00`);
    const wd = jpWeek[sel.getDay()];
    if (todayDateStr) {
      const today = new Date(`${todayDateStr}T00:00:00`);
      if (sel.getTime() === today.getTime()) return `今日(${wd})`;
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (sel.getTime() === tomorrow.getTime()) return `明日(${wd})`;
    }
    return `${sel.getMonth() + 1}/${sel.getDate()}(${wd})`;
  }, [dateStr, todayDateStr]);

  const timeLabel = useMemo(() => {
    if (timeSource === 'auto') return '今から';
    if (!timeStr) return '今から';
    return timeStr;
  }, [timeSource, timeStr]);


  return {
    // 入力
    qInput, setQInput, submitSearch, resetSearch,
    searchHistory,
    searchFromHistory,
    clearSearchHistory: clearHistory,
    // 検索状態
    loading, error, hasSearched,
    // 結果
    results: filteredResults,
    // 日付/時刻
    dateStr, setDateStr, timeStr, setTimeStr: setTimeStrExternal, dateLabel, timeLabel,
    // 位置/並び順
    lat, lng, hasLatLng,
    // 最終受付考慮
    finalReception,
    setFinalReception: handleFinalReceptionChange,
    // 無限スクロール
    loaderRef,
    hasMore: cursor != null,
  };
}
