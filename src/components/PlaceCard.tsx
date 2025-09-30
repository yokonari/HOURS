'use client';
import { Place } from '@/types/place';
import { jpWeek, getOpeningHoursDisplayInfo } from '@/lib/openingHours';

export function PlaceCard({
  place: p,
  dateStr,
  timeStr,
}: {
  place: Place;
  dateStr: string;
  timeStr: string;
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

  const photoName = p.photos?.[0]?.name as string | undefined;
  const imgSrc = photoName ? `/api/photo?name=${encodeURIComponent(photoName)}&w=200&h=200` : undefined;

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

  // 表示テキスト（選択時刻に基づいて適切な時間帯のみ表示）
  const formatHoursText = (text: string | undefined) => {
    if (!text) return 'ー';

    const withColon = text.replace(/(\d{1,2})時(\d{2})分/g, (_match, h, m) => `${Number(h)}:${m}`);
    const noLeadingZero = withColon.replace(/(\d{1,2}):(\d{2})/g, (_match, h, m) => `${Number(h)}:${m}`);
    return noLeadingZero.replace(/[〜～]/g, ' ー ');
  };

  const hoursText = formatHoursText(baseHoursText);
  const displayAddress = (() => {
    const addr = p.formattedAddress;
    if (!addr) return undefined;
    // Remove Japanese postal codes like "〒123-4567" and trim leftover whitespace or commas
    const withoutPostal = addr.replace(/〒\s*\d{3}-\d{4}[ ,，　]?/g, '').trim().replace(/^[,，\s]+/, '');
    return withoutPostal.length > 0 ? withoutPostal : undefined;
  })();

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
    <li>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="group flex h-18 overflow-hidden rounded-2xl bg-white border border-gray-200"
      >
        <div className="shrink-0 relative h-full">
          <div className="h-full w-24 overflow-hidden bg-gray-100">
            {imgSrc ? (
              <img src={imgSrc} alt={name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 p-2 flex flex-col overflow-hidden">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-on-surface leading-tight" title={name}>
              {name}
            </h2>
            {displayAddress && (
              <div className="mt-0.5 text-xs text-on-surface-light truncate" title={displayAddress}>
                {displayAddress}
              </div>
            )}
          </div>

          <div className="mt-auto pt-1 flex items-center gap-2 text-xs leading-tight">
            <div className="text-on-surface truncate flex items-center gap-1 leading-tight">
              <span>{wdJp}:</span>
              <span>{renderHoursText(hoursText)}</span>
            </div>
            {typeof p.rating === 'number' && (
              <div
                className="ml-2 inline-flex items-center text-[12px] leading-tight"
                title={`${p.rating.toFixed(1)} / 5`}
              >
                <span aria-hidden className="mr-1 text-[12px] text-[#4688A2]">★</span>
                <span className="text-[#4688A2]">
                  {p.rating.toFixed(1)}
                </span>
                {typeof p.userRatingCount === 'number' && p.userRatingCount > 0 && (
                  <span className="ml-1 text-on-surface-light">
                    ({p.userRatingCount})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </a>
    </li>
  );
}
