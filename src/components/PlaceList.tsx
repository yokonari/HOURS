'use client';
import type { MutableRefObject } from 'react';
import { Place } from '@/types/place';
import { PlaceCard } from './PlaceCard';

export function PlaceList({
  results,
  dateStr,
  timeStr,
  loaderRef,
}: {
  results: Place[];
  dateStr: string;
  timeStr: string;
  loaderRef: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <ul className="mt-2 mb-2 grid list-none grid-cols-1 gap-y-2 gap-x-4 p-0 sm:mt-3 sm:mb-3 sm:grid-cols-1 sm:gap-y-3 sm:gap-x-6 md:grid-cols-1 lg:mt-6 lg:mb-6 lg:grid-cols-2 lg:gap-y-3 lg:gap-x-4">
        {results.map((p) => (
          <PlaceCard
            key={p.id ?? `${p.displayName?.text ?? ''}-${p.formattedAddress ?? ''}`}
            place={p}
            dateStr={dateStr}
            timeStr={timeStr}
          />
        ))}
      </ul>
      {/* 無限スクロール監視ターゲット */}
      <div ref={loaderRef} className="h-10" />
    </>
  );
}
