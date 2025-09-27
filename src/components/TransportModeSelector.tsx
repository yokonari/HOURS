'use client';
import { useState, useEffect, useRef } from 'react';
import type { TravelMode } from '@/types/place';

const modes: { key: TravelMode; label: string; glyph: string }[] = [
  { key: 'walking', label: '徒歩', glyph: 'directions_walk' },
  { key: 'driving', label: '車', glyph: 'directions_car' },
  { key: 'bicycling', label: '自転車', glyph: 'directions_bike' },
  { key: 'transit', label: '公共交通機関', glyph: 'train' },
];

export function TransportModeSelector({
  mode, setMode,
}: { mode: TravelMode; setMode: (m: TravelMode) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentMode = modes.find(m => m.key === mode);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 外側クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 focus:bg-white focus:ring-2 focus:ring-gray-300 transition cursor-pointer"
        style={{ color: 'var(--on-surface)' }}
        aria-label={`交通手段を選択（現在: ${currentMode?.label}）`}
        aria-expanded={isOpen}
        title={currentMode?.label}
      >
        <span
          className="material-symbols-rounded text-[18px] leading-none"
          style={{
            fontVariationSettings: `'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 20`,
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
                  'w-full flex items-center justify-center px-3 py-2 text-left text-sm transition-colors cursor-pointer',
                  active
                    ? 'bg-gray-100 text-on-surface'
                    : 'text-on-surface hover:bg-gray-50'
                ].join(' ')}
                title={label}
                aria-label={label}
              >
                <span
                  className="material-symbols-rounded text-[18px] leading-none"
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
