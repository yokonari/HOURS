'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

type Place = {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  rating?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  currentOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  photos?: {
    name: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: { displayName?: string; uri?: string }[];
  }[];
};

type ApiResponse = {
  places?: Place[];
  nextPageToken?: string; // 将来的にページング対応したい場合
};

// ヘルパー: ハバースイン距離（メートル）
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371_000; // 地球半径[m]
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const fmtDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

export default function HomePage() {
  const [q, setQ] = useState('カフェ');     // ← 検索確定用（実際にAPIへ送る）
  const [qInput, setQInput] = useState('カフェ'); // ← 入力欄表示用
  const dirty = qInput !== q; // 入力が確定していない = true
  // 追加
  const [hasSearched, setHasSearched] = useState(false);
  const [etaMap, setEtaMap] = useState<Record<string, { text: string; seconds: number; distanceMeters: number }>>({});

  const [useGeo, setUseGeo] = useState(true);
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const [sortByDistance, setSortByDistance] = useState(true); // 既定で距離順にするなら true

  const makeKey = (p: Place) =>
    p.id ?? `${p.displayName?.text ?? ''}|${p.formattedAddress ?? ''}`;

  useEffect(() => {
    if (!useGeo) return;
    let cancelled = false;
    if (!navigator.geolocation) {
      setError('このブラウザでは位置情報が利用できません。');
      setUseGeo(false);
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
        setUseGeo(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 }
    );
    return () => {
      cancelled = true;
    };
  }, [useGeo]);

  const fetchPlaces = useCallback(
    async (
      append = false,
      overrides?: Partial<{ q: string; useGeo: boolean; lat: number; lng: number; cursor: string | null }>
    ) => {
      setLoading(true);
      setError(null);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // ここで毎回 params を構築（最新値 or overrides）
      const Q       = overrides?.q       ?? q;
      const USE_GEO = overrides?.useGeo  ?? useGeo;
      const LAT     = overrides?.lat     ?? lat;
      const LNG     = overrides?.lng     ?? lng;
      // cursor は null を明示指定できるよう厳密に見る
      const CURSOR  = (overrides && 'cursor' in overrides) ? overrides.cursor : cursor;

      const params = new URLSearchParams();
      if (Q) params.set('q', Q);
      if (USE_GEO && LAT != null && LNG != null) {
        params.set('lat', String(LAT));
        params.set('lng', String(LNG));
      }
      if (CURSOR) params.set('cursor', CURSOR);
      params.set('rank', sortByDistance ? 'distance' : 'relevance'); // ← 追加

      try {
        const res = await fetch(`/api/places?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        const text = await res.text();

        if (!res.ok) {
          let message = text || `検索に失敗しました (HTTP ${res.status})`;
          try {
            const errJson = JSON.parse(text);
            if (errJson?.message) message = errJson.message;
            if (res.status === 400 && String(errJson?.message).includes('Request parameters for paging requests must match')) {
              message = '検索条件を変更したため続きの取得に失敗しました。もう一度検索してください。';
              setCursor(null); // これ以上のページングを止める
            }
          } catch {}
          if (!append) setResults([]);
          setError(message);
          return;
        }

        const data: ApiResponse = text ? JSON.parse(text) : { places: [] };

        if (!append) seenRef.current = new Set();

        const incoming = data.places ?? [];
        const unique: Place[] = [];
        for (const p of incoming) {
          const key = p.id ?? `${p.displayName?.text ?? ''}|${p.formattedAddress ?? ''}`;
          if (!key) continue;
          if (seenRef.current.has(key)) continue;
          seenRef.current.add(key);
          unique.push(p);
        }

        // ↓ 置き換え
        setResults(prev => (append ? [...prev, ...unique] : unique));

        setCursor(data.nextPageToken ?? null);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError(e?.message ?? '不明なエラーが発生しました');
          if (!append) setResults([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [q, useGeo, lat, lng, cursor]
  );

  // クエリ/位置条件が変わったら cursor をリセットして再検索
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 1) 状態を確定
    setQ(qInput);
    setCursor(null);
    seenRef.current = new Set();
    setHasSearched(true);
    setEtaMap({});
    setError(null);

    // 現在地バイアスを使いたいのに、まだ座標が未確定ならここで確保
    if (useGeo && (lat == null || lng == null) && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          setLat(newLat);
          setLng(newLng);
          // 取得後に locationBias を付与して 1 ページ目から
          fetchPlaces(false, { q: qInput, cursor: null, useGeo: true, lat: newLat, lng: newLng });
        },
        (err) => {
          // 失敗したら現在地なしで検索に切り替え
          setUseGeo(false);
          setError(`位置情報の取得に失敗しました: ${err.message}（現在地なしで検索しました）`);
          fetchPlaces(false, { q: qInput, cursor: null, useGeo: false });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
      );
      return; // 座標待ちなのでここで抜ける
    }

    // 変更後（最新入力を使う）
    fetchPlaces(false, { q: qInput, cursor: null });
  };

  // 無限スクロール: 次ページがある時だけ発火
  useEffect(() => {
    if (!loaderRef.current) return;
    const ob = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && cursor && !dirty && hasSearched) {
        fetchPlaces(true);
      }
    }, { threshold: 1.0, rootMargin: '200px' });
    ob.observe(loaderRef.current);
    return () => ob.disconnect();
  }, [loading, cursor, fetchPlaces]);

  // 結果が変わったら未取得分の ETA をまとめて取得（ファイル末尾の useEffect 群の後ろに追加）
  useEffect(() => {
    if (!hasSearched) return;
    if (!useGeo || lat == null || lng == null) return;
    if (!results.length) return;

    const pending = results
      .map((p) => {
        const key = makeKey(p);
        const plat = p.location?.latitude;
        const plng = p.location?.longitude;
        if (!key || plat == null || plng == null) return null;
        if (etaMap[key]) return null;
        return { key, lat: plat, lng: plng };
      })
      .filter(Boolean) as { key: string; lat: number; lng: number }[];

    if (pending.length === 0) return;

    const batches: { key: string; lat: number; lng: number }[][] = [];
    for (let i = 0; i < pending.length; i += 25) {
      batches.push(pending.slice(i, i + 25));
    }

    let aborted = false;
    (async () => {
      for (const items of batches) {
        if (aborted) break;
        const res = await fetch('/api/eta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            origin: { lat, lng },
            items,
            mode: 'walking', // あとで UI で切替可能
          }),
        }).catch(() => null);
        if (!res || !res.ok) continue;
        const data = await res.json().catch(() => null) as { etas?: Record<string, { text: string; seconds: number; distanceMeters: number }> } | null;
        if (!data?.etas) continue;
        setEtaMap((prev) => ({ ...prev, ...data.etas }));
      }
    })();

    return () => { aborted = true; };
  }, [results, useGeo, lat, lng, hasSearched]); // 依存に注意


  const getTodayHours = (opening?: { weekdayDescriptions?: string[] }) => {
    if (!opening?.weekdayDescriptions) return null;
    const today = new Date().getDay();
    const index = today === 0 ? 6 : today - 1;
    return opening.weekdayDescriptions[index] ?? null;
  };

  const waitingGeo = useGeo && (lat == null || lng == null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Places 検索デモ</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Google Places API の検索結果を表示します。現在地を使うにチェックで 5km の位置バイアスを付与。
      </p>

      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={qInput}
          onChange={(e) => {
            setQInput(e.target.value);
            setError(null);
            setCursor(null);      // ← 入力中は古いカーソルを無効化
          }}
          placeholder="例: 24時間 カフェ 新宿 / ramen shinjuku"
          aria-label="検索ワード"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-black/10"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl border border-gray-900 bg-gray-900 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '検索中…' : waitingGeo ? '現在地を取得して検索' : '検索'}
        </button>

        {/* // 検索フォームにトグルを追加（ラベルの近くに） */}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={sortByDistance}
          onChange={(e) => {
            setSortByDistance(e.target.checked);
            setCursor(null);           // ← 条件が変わるのでカーソル破棄
            setError(null);
          }}
          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
        />
        <span>距離が近い順</span>
      </label>

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={useGeo}
            onChange={(e) => {
              setError(null);
              setUseGeo(e.target.checked);
              setCursor(null);     // ← 条件変更＝カーソル破棄
            }}
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <span>現在地を使う（5km バイアス）</span>
        </label>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700"
        >
          {error}
        </div>
      )}

      {!hasSearched && results.length === 0 && !loading && !error && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          キーワードを入力して「検索」を押してください。現在地を使うと5kmの位置バイアスがかかります。
        </div>
      )}


      <ul className="mt-4 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((p) => {
          const name = p.displayName?.text ?? '(名称不明)';
          const address = p.formattedAddress ?? '';
          const latlng =
            p.location?.latitude != null && p.location?.longitude != null
              ? `${p.location.latitude},${p.location.longitude}`
              : undefined;
          const mapsUrl =
            p.googleMapsUri
              ? p.googleMapsUri
              : latlng
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(latlng)}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

          const todayHours = getTodayHours(p.currentOpeningHours);

          return (
            <li key={p.id ?? name + address} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
              {p.photos?.[0] ? (
                <img
                  src={`/api/photo?name=${encodeURIComponent(p.photos[0].name)}&w=400`}
                  alt={name}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
                  No image
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="line-clamp-2 text-base font-semibold text-gray-900">{name}</h2>
                  {typeof p.rating === 'number' && (
                    <span
                      title={`${p.rating} / 5`}
                      className="whitespace-nowrap rounded-full border border-gray-200 px-2 py-0.5 text-sm font-bold"
                    >
                      ★ {p.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="mt-1 line-clamp-2 text-sm text-gray-600">{address}</div>

                <div className="mt-2 text-xs text-gray-500">
                  {p.primaryTypeDisplayName?.text && <span>{p.primaryTypeDisplayName.text}</span>}
                </div>

                {todayHours && (
                  <div className="mt-1 text-sm text-gray-700">{todayHours}</div>
                )}

                {/* カード内の表示（公式サイトリンクの少し上あたりに追加） */}
                {(() => {
                  const key = makeKey(p);
                  const eta = key ? etaMap[key] : undefined;
                  if (!eta) return null;
                  const km = eta.distanceMeters >= 1000 ? `${(eta.distanceMeters / 1000).toFixed(1)} km` : `${eta.distanceMeters} m`;
                  return (
                    <div className="mt-1 text-sm text-gray-700">
                      到着目安: {eta.text}（約 {km}）
                    </div>
                  );
                })()}


                {p.websiteUri && (
                  <a
                    href={p.websiteUri}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    公式サイト
                  </a>
                )}

                <div className="mt-3 flex gap-2">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Googleマップで見る
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* 無限スクロール用の監視ターゲット */}
      <div ref={loaderRef} className="h-10" />

      {loading && (
        <div className="mt-4 text-center text-gray-500">読み込み中…</div>
      )}
    </main>
  );
}
