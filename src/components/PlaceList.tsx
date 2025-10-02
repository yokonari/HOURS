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
      {/* 大きい画面では幅400pxのカードを2列で中央揃えにします */}
      <ul className="mt-2 mb-2 grid list-none grid-cols-1 gap-3 p-0 sm:mt-3 sm:mb-3 sm:gap-4 lg:mt-6 lg:mb-6 lg:[grid-template-columns:repeat(2,400px)] lg:justify-center lg:gap-5">
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
