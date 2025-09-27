'use client';
import { Eta, Place, TravelMode } from '@/types/place';
import { EtaMap } from '@/hooks/useEta';
import { jpWeek, getHoursForWeekdayText, getOpeningHoursFromPlace, getWeekdayStatusText } from '@/lib/openingHours';

function makeKey(p: Place) {
  return p.id ?? `${p.displayName?.text ?? ''}|${p.formattedAddress ?? ''}`;
}

export function PlaceCard({
  place: p,
  dateStr,
  etaMap,
  origin,
  mode,
}: {
  place: Place;
  dateStr: string;
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
  const wdJp = jpWeek[weekdayJS];

  const km = eta && typeof eta.distanceMeters === 'number'
    ? (eta.distanceMeters >= 1000 ? `${(eta.distanceMeters / 1000).toFixed(1)} km` : `${eta.distanceMeters} m`)
    : '';

  // 表示テキスト（そのまま JSX に差せます）
  const hoursText = getWeekdayStatusText(p as any, weekdayJS);

  return (
    <li className="group flex overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      <div className="mr-3 shrink-0">
        <div className="h-24 w-24 overflow-hidden rounded-lg bg-gray-100">
          {imgSrc ? (
            <img src={imgSrc} alt={name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-base font-semibold text-gray-900" title={name}>{name}</h2>
          {typeof p.rating === 'number' && (
            <span title={`${p.rating} / 5`} className="shrink-0 text-[11px] font-semibold text-amber-700">★ {p.rating.toFixed(1)}</span>
          )}
        </div>

        <div className="mt-1 text-xs text-gray-700">営業時間({wdJp}): {hoursText}</div>

        {origin?.lat != null && origin?.lng != null && (
          <div className="mt-1 text-xs text-gray-800">
            {mode === 'transit' ? (
              <>
                {transitDirUrl && (
                  <a className="underline" href={transitDirUrl} target="_blank" rel="noreferrer">マップで経路検索</a>
                )}
              </>
            ) : (
              eta && (
                <>
                  到着目安: {eta.text}
                  {km && <span className="ml-1 text-gray-600">（約 {km}）</span>}
                </>
              )
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {p.websiteUri && (
            <a href={p.websiteUri} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-50">公式サイト</a>
          )}
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-50">マップで開く</a>
        </div>
      </div>
    </li>
  );
}
