'use client';
import { useState } from 'react';
import type { TravelMode } from '@/types/place';

const modes: { key: TravelMode; label: string; glyph: string }[] = [
  { key: 'walking', label: '徒歩', glyph: 'directions_walk' },
  { key: 'driving', label: '車', glyph: 'directions_car' },
  { key: 'bicycling', label: '自転車', glyph: 'directions_bike' },
  { key: 'transit', label: '公共交通機関', glyph: 'directions_transit' },
];

export function TransportModeSelector({
  mode, setMode,
}: { mode: TravelMode; setMode: (m: TravelMode) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentMode = modes.find(m => m.key === mode);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
        aria-label={`交通手段を選択（現在: ${currentMode?.label}）`}
        aria-expanded={isOpen}
        title={currentMode?.label}
      >
        <span
          className="material-symbols-rounded text-[20px] leading-none"
          style={{
            fontVariationSettings: `'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24`,
          }}
          aria-hidden="true"
        >
          {currentMode?.glyph}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {modes.map(({ key, label, glyph }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  setIsOpen(false);
                }}
                className={[
                  'w-full flex items-center justify-center px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                ].join(' ')}
                title={label}
                aria-label={label}
              >
                <span
                  className="material-symbols-rounded text-[20px] leading-none"
                  style={{
                    fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' ${active ? 600 : 500}, 'GRAD' 0, 'opsz' 20`,
                  }}
                  aria-hidden="true"
                >
                  {glyph}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
