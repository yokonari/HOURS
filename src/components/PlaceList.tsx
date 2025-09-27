'use client';
import { Eta, Place, TravelMode } from '@/types/place';
import { PlaceCard } from './PlaceCard';

export function PlaceList({
  results,
  etaMap,
  dateStr,
  origin,
  mode,
  loaderRef,
}: {
  results: Place[];
  etaMap: Record<string, Eta | null>;
  dateStr: string;
  origin?: { lat?: number; lng?: number };
  mode: TravelMode;
  loaderRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <ul className="mt-4 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
        {results.map((p) => (
          <PlaceCard key={p.id ?? `${p.displayName?.text ?? ''}-${p.formattedAddress ?? ''}`} place={p} dateStr={dateStr} etaMap={etaMap} origin={origin} mode={mode} />
        ))}
      </ul>
      {/* 無限スクロール監視ターゲット */}
      <div ref={loaderRef} className="h-10" />
    </>
  );
}
