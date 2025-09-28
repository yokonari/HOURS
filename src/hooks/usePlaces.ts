'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Place, TravelMode } from '@/types/place';
import {
  isOpenOnWeekday,
  isOpenAt,
  todayStr,
  weekdayFromDateString,
  jpWeek,
  getClosingTime,
} from '@/lib/openingHours';

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
  const [timeStr, setTimeStr] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }); // "HH:MM" or ''

  // 交通手段
  const [mode, setMode] = useState<TravelMode>('walking');

  // 最終受付考慮
  const [finalReception, setFinalReception] = useState<'none' | '30min' | '60min'>('none');

  // 検索状態
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 結果
  const [allResults, setAllResults] = useState<Place[]>([]);

  // 無限スクロール監視ターゲット
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // 現在地取得
  useEffect(() => {
    let cancelled = false;
    if (!navigator.geolocation) {
      setError('このブラウザでは位置情報が利用できません。');
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
        setError(`位置情報の取得に失敗しました: ${err.message}`);
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

      setLoading(true);
      setError(null);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const LAT = overrides?.lat ?? lat;
      const LNG = overrides?.lng ?? lng;
      const CUR = (overrides && 'cursor' in overrides) ? overrides.cursor : cursor;
      const USE_COORDS = LAT != null && LNG != null;

      const params = new URLSearchParams();
      if (Q) params.set('q', Q);
      if (USE_COORDS) { params.set('lat', String(LAT)); params.set('lng', String(LNG)); }
      if (CUR) params.set('cursor', CUR);
      params.set('rank', USE_COORDS && sortByDistance ? 'distance' : 'relevance');

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
  const submitSearch = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = qInput.trim();
    setQ(trimmed);
    setCursor(null);
    seenRef.current = new Set();
    setError(null);

    if (typeof window !== 'undefined') {
      const active = document.activeElement as HTMLElement | null;
      active?.blur();
    }

    if (trimmed.length === 0) {
      setHasSearched(false);
      setAllResults([]);
      return;
    }

    setHasSearched(true);
    fetchPlaces(false, { q: trimmed, cursor: null });
  }, [qInput, fetchPlaces]);

  const isToday = useMemo(() => {
    const today = new Date();
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // 00:00
    const sel = new Date(`${dateStr}T00:00:00`);
    return (
      sel.getFullYear() === base.getFullYear() &&
      sel.getMonth() === base.getMonth() &&
      sel.getDate() === base.getDate()
    );
  }, [dateStr]);

  // 表示用: 日付/時刻に基づくフィルタ済み結果
  const filteredResults = useMemo(() => {
    const wd = weekdayFromDateString(dateStr); // 0..6

    const parseHM = (s: string) => {
      const [h, m] = (s || '00:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const minutes = timeStr ? parseHM(timeStr) : nowMinutes;

    return allResults
      .filter((p) => isOpenOnWeekday(p as any, wd))
      .filter((p) => isOpenAt(p as any, wd, minutes))
      .filter((p) => {
        // 最終受付考慮のフィルタリング
        if (finalReception === 'none') return true;

        const closingTime = getClosingTime(p as any, wd);
        if (closingTime === null) return true; // 終了時間不明の場合は表示

        const bufferMinutes = finalReception === '30min' ? 30 : 60;
        const cutoffTime = closingTime - bufferMinutes;

        return minutes <= cutoffTime;
      });
  }, [allResults, dateStr, isToday, timeStr, finalReception]);

  // 無限スクロール
  useEffect(() => {
    if (!loaderRef.current) return;
    const el = loaderRef.current;
    const ob = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && cursor && !dirty && hasSearched) {
        fetchPlaces(true);
      }
    }, { threshold: 1.0, rootMargin: '200px' });
    ob.observe(el);
    return () => ob.disconnect();
  }, [loading, cursor, dirty, hasSearched, fetchPlaces]);

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const currentHHMM = useMemo(() => {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }, []);


  // ラベル（UI側で利用）
  const dateLabel = useMemo(() => {
    // dateStr は "YYYY-MM-DD"
    // ユーティリティ
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

    // 選択日
    const sel = new Date(`${dateStr}T00:00:00`);
    const wd = jpWeek[sel.getDay()];

    // 今日/明日
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (isSameDay(sel, today)) return `今日(${wd})`;
    if (isSameDay(sel, tomorrow)) return `明日(${wd})`;

    // それ以降 → M/D(曜)
    return `${sel.getMonth() + 1}/${sel.getDate()}(${wd})`;
  }, [dateStr]);

  const timeLabel = useMemo(() => {
    if (isToday) {
      // 今日の場合、時刻が現在時刻と同じなら「今から」を表示
      if (timeStr === currentHHMM) {
        return '今から';
      }
      return timeStr || '今から';
    }
    // 今日以外の日付 → 入力がなければ "現在時刻" を表示
    return timeStr || currentHHMM;
  }, [isToday, timeStr, currentHHMM]);


  return {
    // 入力
    qInput, setQInput, submitSearch,
    // 検索状態
    loading, error, hasSearched,
    // 結果
    results: filteredResults,
    // 日付/時刻
    dateStr, setDateStr, timeStr, setTimeStr, dateLabel, timeLabel,
    // 位置/並び順
    lat, lng, hasLatLng,
    // 交通手段
    mode, setMode,
    // 最終受付考慮
    finalReception, setFinalReception,
    // 無限スクロール
    loaderRef,
  };
}
