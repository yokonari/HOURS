'use client';
import type { TravelMode } from '@/types/place';

const modes: { key: TravelMode; label: string; glyph: string }[] = [
  { key: 'walking',   label: '徒歩',           glyph: 'directions_walk' },
  { key: 'driving',   label: '車',             glyph: 'directions_car' },
  { key: 'bicycling', label: '自転車',         glyph: 'directions_bike' },
  { key: 'transit',   label: '公共交通機関',   glyph: 'directions_transit' },
];

export function TransportModeSelector({
  mode, setMode,
}: { mode: TravelMode; setMode: (m: TravelMode) => void }) {
  return (
    <div className="ml-2 flex items-center gap-2">
      {modes.map(({ key, label, glyph }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={[
              'inline-flex h-9 w-9 items-center justify-center rounded-full transition',
              active
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
            ].join(' ')}
          >
            <span
              className="material-symbols-rounded text-[22px] leading-none"
              style={{
                // アクティブ時だけ塗りつぶしに（Googleマップのトグル感に寄せる）
                fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' ${active ? 600 : 500}, 'GRAD' 0, 'opsz' 24`,
              }}
              aria-hidden="true"
            >
              {glyph}
            </span>
          </button>
        );
      })}
    </div>
  );
}
