// hooks/useEta.ts
'use client';
import { useEffect, useState } from 'react';
import type { Eta, Place, TravelMode } from '@/types/place';

type InputWithKey = { key: string; lat: number; lng: number };

export function useEta(
  results: Place[],
  origin?: { lat?: number; lng?: number },
  mode: TravelMode = 'walking'
) {
  const [etaMap, setEtaMap] = useState<Record<string, Eta | null>>({});

  // ★ 交通手段が変わったら表示を一旦クリア（古いETAを見せない）
  useEffect(() => {
    setEtaMap({});
  }, [mode]);

  useEffect(() => {
    const lat = origin?.lat, lng = origin?.lng;
    if (lat == null || lng == null) return;
    if (!results.length) return;

    // 未取得のものだけをまとめて問い合わせ
    const pending: InputWithKey[] = [];
    for (const p of results) {
      const key = p.id ?? `${p.displayName?.text ?? ''}|${p.formattedAddress ?? ''}`;
      const plat = p.location?.latitude, plng = p.location?.longitude;
      if (!key || plat == null || plng == null) continue;
      if (etaMap[key]) continue;
      pending.push({ key, lat: plat, lng: plng });
    }
    if (!pending.length) return;

    let aborted = false;

    (async () => {
      // 適当にバッチ化
      for (let i = 0; i < pending.length && !aborted; i += 25) {
        const slice = pending.slice(i, i + 25);
        const res = await fetch('/api/eta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: { lat, lng }, items: slice, mode }),
        }).catch(() => null);
        if (!res?.ok) continue;
        const data = (await res.json()) as { etas?: Record<string, Eta | null> } | null;
        if (!data?.etas) continue;
        if (aborted) break;
        setEtaMap(prev => ({ ...prev, ...data.etas }));
      }
    })();

    return () => { aborted = true; };
  }, [results, origin?.lat, origin?.lng, mode, /* etaMap intentionally not included */]);

  return etaMap;
}
