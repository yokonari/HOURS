'use client';
import { useEffect, useMemo, useState, type MutableRefObject } from 'react';
import { Place } from '@/types/place';
import { PlaceCard } from './PlaceCard';

export function PlaceList({
  results,
  dateStr,
  timeStr,
  loaderRef,
  hasMore,
}: {
  results: Place[];
  dateStr: string;
  timeStr: string;
  loaderRef: MutableRefObject<HTMLDivElement | null>;
  hasMore: boolean;
}) {
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => setViewportWidth(window.innerWidth);

    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  const cardWidth = useMemo(() => {
    if (viewportWidth == null) return null;
    if (viewportWidth >= 1024) {
      // PC 表示は 400px 固定です
      return 400;
    }
    // モバイル/タブレットは画面幅からコンテンツ余白ぶんを差し引いたサイズで固定します
    const horizontalPadding = viewportWidth >= 640 ? 48 : 32; // sm: px-6 (=24px) / base: px-4 (=16px)
    const safetyMargin = viewportWidth >= 640 ? 20 : 12; // 境界で横スクロールを避けるための余白
    const width = viewportWidth - horizontalPadding - safetyMargin;
    return width > 0 ? width : viewportWidth;
  }, [viewportWidth]);

  return (
    <>
      {/* モバイル/タブレットでは縦並び、PC では幅400pxカードを横並びにします */}
      <ul className="mt-2 mb-2 flex w-full list-none flex-col gap-3 p-0 sm:mt-3 sm:mb-3 sm:gap-4 lg:mt-6 lg:mb-6 lg:grid lg:grid-cols-[repeat(2,minmax(0,400px))] lg:justify-center lg:gap-5">
        {results.map((p) => (
          <PlaceCard
            key={p.id ?? `${p.displayName?.text ?? ''}-${p.formattedAddress ?? ''}`}
            place={p}
            dateStr={dateStr}
            timeStr={timeStr}
            cardWidth={cardWidth}
          />
        ))}
      </ul>
      {/* 無限スクロール監視ターゲット */}
      <div
        ref={loaderRef}
        className="transition-[height] duration-200"
        style={{ height: hasMore ? '2.5rem' : 0 }}
        aria-hidden="true"
      />
    </>
  );
}
