'use client';
import { useEffect, useMemo, useState } from 'react';
import { Place } from '@/types/place';
import { PlaceCard } from './PlaceCard';

export function PlaceList({
  results,
  dateStr,
  timeStr,
}: {
  results: Place[];
  dateStr: string;
  timeStr: string;
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
      // PC 表示ではカード幅を480pxに固定し、情報量を見やすく取ります。
      return 480;
    }
    // モバイル/タブレットは画面幅からコンテンツ余白ぶんを差し引いたサイズで固定します
    const horizontalPadding = viewportWidth >= 640 ? 48 : 32; // sm: px-6 (=24px) / base: px-4 (=16px)
    const safetyMargin = viewportWidth >= 640 ? 20 : 12; // 境界で横スクロールを避けるための余白
    const width = viewportWidth - horizontalPadding - safetyMargin;
    return width > 0 ? width : viewportWidth;
  }, [viewportWidth]);

  return (
    <>
      {results.length > 0 && (
        <p className="mt-1 lg:text-sm text-orange-600 text-xs font-medium">
          ※この一覧はデモ用に生成された架空の店舗データです。
        </p>
      )}
      {/* モバイル/タブレットでは縦並び、PC では幅480pxカードを横並びにします */}
      <ul
        className={[
          'flex w-full list-none flex-col gap-3 p-0',
          results.length > 0 ? 'mt-2 mb-2 sm:mt-3 sm:mb-3 sm:gap-4 lg:mt-6 lg:mb-6 lg:grid lg:grid-cols-[repeat(2,minmax(0,480px))] lg:justify-center lg:gap-5'
            : 'mt-0 mb-0 sm:mt-0 sm:mb-0'
        ].join(' ')}
      >
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
    </>
  );
}
