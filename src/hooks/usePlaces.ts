'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Place } from '@/types/place';
import { todayStr, jpWeek } from '@/lib/openingHours';
import { useSearchHistory } from '@/hooks/useSearchHistory';

const pad2 = (n: number) => String(n).padStart(2, '0');

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

export function usePlaces() {
  // 検索ワード
  const [q, setQ] = useState('');      // 確定値（API送信用）
  const [qInput, setQInput] = useState(''); // 入力欄表示用

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

  const [todayDateStr, setTodayDateStr] = useState<string>(dateStr);

  // サーバーとクライアントで同じ初期表示になるよう、マウント後に現在時刻と日付を設定します
  const refreshNow = useCallback((source?: 'auto' | 'manual') => {
    const now = new Date();
    const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
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

  // 検索
  const abortRef = useRef<AbortController | null>(null);
  const fetchPlaces = useCallback(async (term: string) => {
    const trimmed = term.trim();
    // 空検索時は通信を発生させず、静かに初期状態へ戻します。
    if (trimmed.length === 0) {
      setAllResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams();
    params.set('q', trimmed);
    if (dateStr) params.set('date', dateStr);
    if (timeStr) params.set('time', timeStr);
    if (finalReception !== 'none') params.set('finalReception', finalReception);

    try {
      const res = await fetch(`/api/places?${params.toString()}`, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      const dataUnknown: unknown = await res.json();
      if (!res.ok) {
        const msg = isObject(dataUnknown) && typeof (dataUnknown as any).message === 'string'
          ? (dataUnknown as any).message
          : '検索に失敗しました';
        throw new Error(msg);
      }
      const list: Place[] =
        isObject(dataUnknown) && Array.isArray((dataUnknown as any).places)
          ? ((dataUnknown as any).places as Place[])
          : [];
      setAllResults(list);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message ?? '不明なエラーが発生しました');
        setAllResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [dateStr, timeStr, finalReception]);

  // フォーム submit（検索確定）
  const executeSearch = useCallback((rawTerm: string) => {
    const trimmed = rawTerm.trim();
    setQInput(trimmed);
    setQ(trimmed);
    setError(null);

    if (typeof window !== 'undefined') {
      const active = document.activeElement as HTMLElement | null;
      active?.blur();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 空文字での検索はサンプルデータを再読み込みせずにリセットします。
    if (trimmed.length === 0) {
      setHasSearched(false);
      setAllResults([]);
      return;
    }

    refreshNow();
    setHasSearched(true);
    addHistory(trimmed);
  }, [addHistory, refreshNow]);

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
    setAllResults([]);
    setHasSearched(false);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!hasSearched || !q) return;
    fetchPlaces(q);
  }, [fetchPlaces, hasSearched, q]);

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
    results: allResults,
    // 日付/時刻
    dateStr, setDateStr, timeStr, setTimeStr: setTimeStrExternal, dateLabel, timeLabel,
    // 最終受付考慮
    finalReception,
    setFinalReception: handleFinalReceptionChange,
  };
}
