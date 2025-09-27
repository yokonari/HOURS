// useEta.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { Eta } from '@/types/place';

// ===== Types =====
export type TravelMode = 'walking' | 'driving' | 'bicycling' | 'transit';
export type LatLng = { lat: number; lng: number };
export type EtaMap = Record<string, Eta>; // 例: key は placeId / id

type Destination = { id: string; lat: number; lng: number };

type UseEtaParams = {
  origin?: LatLng | null;
  destinations: Destination[];
  mode: TravelMode;
  /** APIエンドポイント（必要なら変更可能） */
  endpoint?: string; // default '/api/eta'
};

// 小文字UIモード -> サーバー/Google向け大文字モード
function toApiMode(mode: TravelMode): 'WALKING' | 'DRIVING' | 'BICYCLING' | 'TRANSIT' | undefined {
  switch (mode) {
    case 'walking':
      return 'WALKING';
    case 'driving':
      return 'DRIVING';
    case 'bicycling':
      return 'BICYCLING';
    case 'transit':
      // サーバーが未対応なら undefined を返し、フェッチをスキップする運用にしてもOK
      return 'TRANSIT';
    default:
      return undefined;
  }
}

export function useEta({ origin, destinations, mode, endpoint = '/api/eta' }: UseEtaParams) {
  const [etaMap, setEtaMap] = useState<EtaMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // destinations が再生成されても無限フェッチにならないよう、丸めてキー化
  const destinationsKey = useMemo(() => {
    return JSON.stringify(
      destinations.map(d => [d.id, Math.round(d.lat * 1e6), Math.round(d.lng * 1e6)])
    );
  }, [destinations]);

  // mode 変更時は見た目をリセット（古いETAを残さない）
  useEffect(() => {
    setEtaMap({});
  }, [mode]);

  // URLは mode も必ず含める（これがキーになり、切替1回目でも確実にフェッチが走る）
  const url = useMemo(() => {
    if (!origin) return null;
    const apiMode = toApiMode(mode);
    if (!apiMode) return null; // 非対応モードはフェッチしない
    const u = new URL(endpoint, location.origin);
    u.searchParams.set('lat', String(origin.lat));
    u.searchParams.set('lng', String(origin.lng));
    u.searchParams.set('mode', apiMode);
    return u.toString();
  }, [origin?.lat, origin?.lng, mode, endpoint]);

  // 前回のリクエストを中断するための AbortController
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url || !origin || destinations.length === 0) return;

    // ★重要: 直前のフェッチをキャンセル → 新しいフェッチを開始
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin,
            items: destinations.map(dest => ({
              key: dest.id,
              lat: dest.lat,
              lng: dest.lng
            }))
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`ETA HTTP ${res.status}`);
        const response = await res.json() as { etas: EtaMap };
        setEtaMap(response.etas ?? {});
      } catch (e: any) {
        if (e?.name === 'AbortError') return; // 切替直後の中断は正常
        setEtaMap({});
        setError(e instanceof Error ? e : new Error(String(e)));
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();

    // この effect の controller だけをクリーンアップ
    return () => controller.abort();
    // 依存: url に lat/lng/mode/endpoint が含まれている + destinationsKey
  }, [url, destinationsKey]);

  const refresh = () => {
    // キャッシュだけクリア（必要なら外から再レンダで再フェッチ）
    setEtaMap({});
  };

  return { etaMap, loading, error, refresh };
}
