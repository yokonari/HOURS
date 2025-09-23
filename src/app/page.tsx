'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

// --- 営業日フィルタ用ヘルパー ---
const pad2 = (n: number) => String(n).padStart(2, '0');
const todayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

const weekdayFromDateString = (s: string) => new Date(`${s}T00:00:00`).getDay(); // 0=Sun..6=Sat

// 指定曜日に営業なら true / 定休日なら false。hours 情報が無ければ true（除外しない）。
// 引数 weekdayJS: Date#getDay() の値（0=Sun..6=Sat）
function isOpenOnWeekday(place: any, weekdayJS: number): boolean {
  const oh = place?.regularOpeningHours;
  // 1) weekdayDescriptions を優先（[月,火,水,木,金,土,日]）
  const wdIdx = (weekdayJS + 6) % 7; // JS(日0)→説明配列(月0) へ変換
  const wdText: string | undefined =
    Array.isArray(oh?.weekdayDescriptions) ? oh.weekdayDescriptions[wdIdx] : undefined;
  if (typeof wdText === 'string') {
    const t = wdText.toLowerCase();
    // 定休日ワード（必要に応じて追加）
    if (t.includes('定休日') || t.includes('休業') || t.includes('closed')) return false;
    // ここで「営業中の時間帯（〜時〜分）」等が含まれていれば営業扱い
    return true;
  }
  // 2) periods で判定（Googleの day は 0=Sun..6=Sat で JS と同じ表現）
  const periods = oh?.periods;
  if (Array.isArray(periods)) {
    const opened = periods.some((p: any) => {
      const d = p?.open?.day; // 数値想定（0..6）
      return typeof d === 'number' ? d === weekdayJS : false;
    });
    return opened; // 対象曜日の open が無ければ休み
  }
  // 3) 情報が無ければ除外しない
  return true;
}

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

type Eta = { text: string; seconds: number; distanceMeters: number };

export default function HomePage() {
  const [q, setQ] = useState('カフェ');     // ← 検索確定用（実際にAPIへ送る）
  const [qInput, setQInput] = useState('カフェ'); // ← 入力欄表示用
  const dirty = qInput !== q; // 入力が確定していない = true
  // 追加
  const [hasSearched, setHasSearched] = useState(false);
  const [etaMap, setEtaMap] = useState<Record<string, Eta | null>>({});

  const [useGeo, setUseGeo] = useState(true);
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allResults, setAllResults] = useState<Place[]>([]);
  const [dateStr, setDateStr] = useState<string>(todayStr());
  const results = useMemo(() => {
    const wd = weekdayFromDateString(dateStr);
    return allResults.filter((p) => isOpenOnWeekday(p as any, wd));
  }, [allResults, dateStr]);

  const abortRef = useRef<AbortController | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const [sortByDistance, setSortByDistance] = useState(true); // 既定で距離順にするなら true
  // 先頭の state 群の近くに追加
  type TravelMode = 'walking' | 'driving' | 'bicycling' | 'transit';
  const [mode, setMode] = useState<TravelMode>('walking');


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
      params.set('rank', USE_GEO && sortByDistance ? 'distance' : 'relevance');

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

        // 重複排除
        const unique = list.filter((p) => {
          const key = p.id;
          if (!key) return true;
          if (seenRef.current.has(key)) return false;
          seenRef.current.add(key);
          return true;
        });

        // ↓ 置き換え
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
        const res = await fetch('/api/eta?debug=2&force=dir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            origin: { lat, lng },
            items,
            mode, // ← ここを 'walking' 固定から差し替え
            // 例: とりあえず「乗り換え少なめ」優先、モードは未指定（全部）
            ...(mode === 'transit' ? { transit: { routingPreference: 'fewer_transfers' } } : {}),
          }),
        }).catch(() => null);
        if (!res || !res.ok) continue;
        const data = await res.json() as { etas?: Record<string, Eta | null> } | null;
        if (!data?.etas) continue;
        setEtaMap((prev) => ({ ...prev, ...data.etas }));
      }
    })();

    return () => { aborted = true; };
  }, [results, useGeo, lat, lng, hasSearched, mode]); // 依存に注意


  const getTodayHours = (opening?: { weekdayDescriptions?: string[] }) => {
    if (!opening?.weekdayDescriptions) return null;
    const today = new Date().getDay();
    const index = today === 0 ? 6 : today - 1;
    return opening.weekdayDescriptions[index] ?? null;
  };

  const waitingGeo = useGeo && (lat == null || lng == null);

  const modeLabel = (m: TravelMode) =>
    m === 'walking' ? '徒歩' : m === 'driving' ? '車' : m === 'bicycling' ? '自転車' : '公共交通機関';

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Places 検索デモ</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Google Places API の検索結果を表示します。
      </p>

      <form
         onSubmit={onSubmit}
         className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
      >
        {/* 左側：日付（=曜日）フィルタ */}
        <label className="flex items-center gap-2 text-sm">
          <span className="whitespace-nowrap">今日</span>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="rounded-lg border px-2 py-1"
          />
        </label>

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
            checked={useGeo}
            onChange={(e) => {
              setError(null);
              setCursor(null);     // ← 条件変更＝カーソル破棄
              const on = e.target.checked;
              setUseGeo(on);
              setEtaMap({});
              if (!on) {
                // 現在地オフ時は距離順を無効化・モードは任意（維持でもOK）
                setSortByDistance(false);
              }
            }}
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <span>現在地を使う</span>
        </label>

        {useGeo && (
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
        )}
      </form>

      {/* 移動手段 */}
      {useGeo && (
        <div className="sm:col-span-2 mt-1 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="travel-mode"
              value="walking"
              checked={mode === 'walking'}
              onChange={() => { setMode('walking'); setEtaMap({}); }}
            />
            徒歩
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="travel-mode"
              value="driving"
              checked={mode === 'driving'}
              onChange={() => { setMode('driving'); setEtaMap({}); }}
            />
            車
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="travel-mode"
              value="bicycling"
              checked={mode === 'bicycling'}
              onChange={() => { setMode('bicycling'); setEtaMap({}); }}
            />
            自転車
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="travel-mode"
              value="transit"
              checked={mode === 'transit'}
              onChange={() => { setMode('transit'); setEtaMap({}); }}
            />
            公共交通機関
          </label>
        </div>
      )}


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
          キーワードを入力して「検索」を押してください。
        </div>
      )}


      <ul className="mt-4 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((p) => {
          const name = p.displayName?.text ?? '(名称不明)';
          const address = p.formattedAddress ?? '';
          const plat = p.location?.latitude;
          const plng = p.location?.longitude;
          const latlng =
            plat != null && plng != null
              ? `${plat},${plng}`
              : undefined;
          const mapsUrl =
            p.googleMapsUri
              ? p.googleMapsUri
              : latlng
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(latlng)}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
          // 追加：ETA 表示位置にだけ出す「公共交通機関の経路」URL（mapsUrl は変更しない）
          const transitDirUrl =
            mode === 'transit' &&
            lat != null && lng != null &&
            plat != null && plng != null
              ? `https://www.google.com/maps/dir/?api=1` +
                `&origin=${lat},${lng}` +
                `&destination=${plat},${plng}` +
                `&travelmode=transit`
              : null;

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
                  if (!useGeo) return null;

                  // 公共交通機関は API で ETA が取れないのでここでリンクだけ出す
                  if (mode === 'transit') {
                    return (
                      <div className="mt-1 text-sm text-gray-700">
                        {transitDirUrl && (
                          <a
                            className="underline ml-2"
                            href={transitDirUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Googleマップで経路
                          </a>
                        )}
                      </div>
                    );
                  }

                  // それ以外（徒歩・車・自転車）は従来通りETAを表示
                  if (!eta) return null;
                  const km =
                    typeof eta.distanceMeters === 'number'
                      ? eta.distanceMeters >= 1000
                        ? `${(eta.distanceMeters / 1000).toFixed(1)} km`
                        : `${eta.distanceMeters} m`
                      : '';

                  return (
                    <div className="mt-1 text-sm text-gray-700">
                      到着目安: {eta.text}{km ? `（約 ${km}）` : ''}
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
