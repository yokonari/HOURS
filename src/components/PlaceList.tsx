'use client';
import { Eta, Place, TravelMode } from '@/types/place';
import { EtaMap } from '@/hooks/useEta';
import { PlaceCard } from './PlaceCard';

export function PlaceList({
  results,
  etaMap,
  dateStr,
  timeStr,
  origin,
  mode,
  loaderRef,
}: {
  results: Place[];
  etaMap: EtaMap;
  dateStr: string;
  timeStr: string;
  origin?: { lat?: number; lng?: number };
  mode: TravelMode;
  loaderRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <ul className="mt-4 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
        {results.map((p) => (
          <PlaceCard key={p.id ?? `${p.displayName?.text ?? ''}-${p.formattedAddress ?? ''}`} place={p} dateStr={dateStr} timeStr={timeStr} etaMap={etaMap} origin={origin} mode={mode} />
        ))}
      </ul>
      {/* 無限スクロール監視ターゲット */}
      <div ref={loaderRef} className="h-10" />
    </>
  );
}
