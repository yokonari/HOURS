'use client';
import { Eta, Place, TravelMode } from '@/types/place';
import { EtaMap } from '@/hooks/useEta';
import { jpWeek, getOpeningHoursDisplayInfo } from '@/lib/openingHours';

const modeIcons: Record<TravelMode, string> = {
  walking: 'directions_walk',
  driving: 'directions_car',
  bicycling: 'directions_bike',
  transit: 'directions_transit',
};

function makeKey(p: Place) {
  return p.id ?? `${p.displayName?.text ?? ''}|${p.formattedAddress ?? ''}`;
}

export function PlaceCard({
  place: p,
  dateStr,
  timeStr,
  etaMap,
  origin,
  mode,
}: {
  place: Place;
  dateStr: string;
  timeStr: string;
  etaMap: EtaMap;
  origin?: { lat?: number; lng?: number };
  mode: TravelMode;
}) {
  const name = p.displayName?.text ?? '(名称不明)';
  const plat = p.location?.latitude ?? null;
  const plng = p.location?.longitude ?? null;
  const latlng = plat != null && plng != null ? `${plat},${plng}` : undefined;
  const mapsUrl = p.googleMapsUri
    ? p.googleMapsUri
    : latlng
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(latlng)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

  const transitDirUrl =
    mode === 'transit' && origin?.lat != null && origin?.lng != null && plat != null && plng != null
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${plat},${plng}&travelmode=transit`
      : null;

  const photoName = p.photos?.[0]?.name as string | undefined;
  const imgSrc = photoName ? `/api/photo?name=${encodeURIComponent(photoName)}&w=200&h=200` : undefined;

  const key = makeKey(p);
  const eta = key ? etaMap[key] : undefined;

  const weekdayJS = new Date(`${dateStr}T00:00:00`).getDay();

  const selectedMinutes = (() => {
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    }
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  })();

  const openingInfo = getOpeningHoursDisplayInfo(p as any, weekdayJS, selectedMinutes);
  const displayWeekdayJS = openingInfo.displayDay;
  const wdJp = jpWeek[displayWeekdayJS];
  const baseHoursText = openingInfo.displayText;

  const km = eta && typeof eta.distanceMeters === 'number'
    ? (eta.distanceMeters >= 1000 ? `${(eta.distanceMeters / 1000).toFixed(1)} km` : `${eta.distanceMeters} m`)
    : '';

  // 表示テキスト（選択時刻に基づいて適切な時間帯のみ表示）
  const formatHoursText = (text: string | undefined) => {
    if (!text) return 'ー';

    const withColon = text.replace(/(\d{1,2})時(\d{2})分/g, (_match, h, m) => `${Number(h)}:${m}`);
    const noLeadingZero = withColon.replace(/(\d{1,2}):(\d{2})/g, (_match, h, m) => `${Number(h)}:${m}`);
    return noLeadingZero.replace(/[〜～]/g, ' ー ');
  };

  const hoursText = formatHoursText(baseHoursText);

  const renderHoursText = (text: string) => {
    const parts = text.split(/\s+ー\s+/);
    if (parts.length !== 2) {
      return text;
    }
    const [start, end] = parts;
    return (
      <span className="inline-flex items-center gap-1">
        <span>{start}</span>
        <span className="inline-block w-1 h-px bg-current align-middle" aria-hidden />
        <span>{end}</span>
      </span>
    );
  };

  return (
    <li className="group flex h-26 overflow-hidden rounded-2xl bg-white border border-gray-200">
      <div className="shrink-0 relative">
        <div className="h-full w-24 overflow-hidden bg-gray-100">
          {imgSrc ? (
            <img src={imgSrc} alt={name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
          )}
        </div>
        {typeof p.rating === 'number' && (
          <div className="absolute bottom-1 left-1 bg-black/10 backdrop-blur-sm rounded-full px-2 py-0">
            <span title={`${p.rating} / 5`} className="text-[10px] text-white leading-none">★ {p.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 pl-3 pr-3 py-3 flex flex-col justify-start overflow-hidden relative">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-base font-semibold text-on-surface" title={name}>{name}</h2>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs">
          <div className="text-on-surface truncate flex items-center gap-1">
            <span>{wdJp}:</span>
            <span>{renderHoursText(hoursText)}</span>
          </div>
          {origin?.lat != null && origin?.lng != null && (
            <div className="flex items-center gap-1 text-on-surface-light shrink-0">
              <span
                className="material-symbols-rounded leading-none"
                style={{
                  fontSize: '16px',
                  fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 12`,
                }}
                aria-hidden="true"
              >
                {modeIcons[mode]}
              </span>
              {mode === 'transit' ? (
                <>
                  {transitDirUrl && (
                    <a className="underline" href={transitDirUrl} target="_blank" rel="noreferrer">マップで経路検索</a>
                  )}
                </>
              ) : (
                eta && (
                  <>
                    <span>{eta.text}</span>
                  </>
                )
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs">
          {p.websiteUri && (
            <a
              href={p.websiteUri}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-gray-400 px-2.5 py-1.5 text-xs text-on-surface transition-colors hover:bg-gray-100"
            >
              公式サイト
            </a>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full px-2.5 py-1.5 text-xs text-on-surface transition-colors"
            style={{ backgroundColor: '#E0DCCD', color: '#272343' }}
          >
            マップで開く
          </a>
        </div>
      </div>
    </li>
  );
}
