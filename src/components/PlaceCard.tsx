'use client';
import { Eta, Place, TravelMode } from '@/types/place';
import { EtaMap } from '@/hooks/useEta';
import { jpWeek, getHoursForWeekdayText, getWeekdayStatusText, getHoursForPlaceOnWeekday, stripWeekdayPrefix } from '@/lib/openingHours';

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

  // 日またぎ営業の場合、開店の曜日を表示する
  const getDisplayWeekday = () => {
    const info = getHoursForPlaceOnWeekday(p as any, weekdayJS);
    if (info.is24h || info.isClosed) return weekdayJS;

    // 営業時間テキストから日またぎを検出
    const rawText = stripWeekdayPrefix(info.text, weekdayJS);
    if (!rawText) return weekdayJS;

    // より確実な日またぎパターンを検出
    // パターン1: 「9時30分～5時00分」のような形式
    const dayOverPattern1 = /(\d{1,2})[時:](\d{2})[分]?[～-](\d{1,2})[時:](\d{2})[分]?/;
    const match1 = rawText.match(dayOverPattern1);

    if (match1) {
      const [, startHour, startMin, endHour, endMin] = match1;
      const startMinutes = parseInt(startHour) * 60 + parseInt(startMin);
      const endMinutes = parseInt(endHour) * 60 + parseInt(endMin);

      // 終了時刻が開始時刻より早い場合は日またぎ
      if (endMinutes < startMinutes) {
        return (weekdayJS + 6) % 7;
      }
    }

    // パターン2: 曜日名が含まれている場合（例：「土曜日: 9時30分～5時00分」）
    const dayOverPattern2 = /(月|火|水|木|金|土|日)曜日[：:]\s*(\d{1,2})[時:](\d{2})[分]?[～-](\d{1,2})[時:](\d{2})[分]?/;
    const match2 = rawText.match(dayOverPattern2);

    if (match2) {
      const [, dayName, startHour, startMin, endHour, endMin] = match2;
      const startMinutes = parseInt(startHour) * 60 + parseInt(startMin);
      const endMinutes = parseInt(endHour) * 60 + parseInt(endMin);

      // 終了時刻が開始時刻より早い場合は日またぎ
      if (endMinutes < startMinutes) {
        return (weekdayJS + 6) % 7;
      }
    }

    // パターン3: 直接的な日またぎ表現を検出
    if (rawText.includes('～5時') || rawText.includes('～4時') || rawText.includes('～3時') ||
      rawText.includes('～2時') || rawText.includes('～1時') || rawText.includes('～0時')) {
      return (weekdayJS + 6) % 7;
    }

    // パターン4: 前日の曜日が日またぎ営業の場合、その曜日を表示
    const prevWeekdayJS = (weekdayJS + 6) % 7;
    const prevInfo = getHoursForPlaceOnWeekday(p as any, prevWeekdayJS);
    if (!prevInfo.is24h && !prevInfo.isClosed) {
      const prevRawText = stripWeekdayPrefix(prevInfo.text, prevWeekdayJS);
      if (prevRawText) {
        // 前日の営業時間が日またぎかチェック
        const prevDayOverPattern = /(\d{1,2})[時:](\d{2})[分]?[～-](\d{1,2})[時:](\d{2})[分]?/;
        const prevMatch = prevRawText.match(prevDayOverPattern);

        if (prevMatch) {
          const [, startHour, startMin, endHour, endMin] = prevMatch;
          const startMinutes = parseInt(startHour) * 60 + parseInt(startMin);
          const endMinutes = parseInt(endHour) * 60 + parseInt(endMin);

          // 前日が日またぎ営業の場合、前日を表示
          if (endMinutes < startMinutes) {
            return prevWeekdayJS;
          }
        }
      }
    }

    return weekdayJS;
  };

  const displayWeekdayJS = getDisplayWeekday();
  const wdJp = jpWeek[displayWeekdayJS];

  const km = eta && typeof eta.distanceMeters === 'number'
    ? (eta.distanceMeters >= 1000 ? `${(eta.distanceMeters / 1000).toFixed(1)} km` : `${eta.distanceMeters} m`)
    : '';

  // 表示テキスト（選択時刻に基づいて適切な時間帯のみ表示）
  const getFilteredHoursText = () => {
    const info = getHoursForPlaceOnWeekday(p as any, displayWeekdayJS);
    if (info.is24h) return "24時間営業";
    if (info.isClosed) return "休業";

    const rawText = stripWeekdayPrefix(info.text, displayWeekdayJS);
    if (!rawText) return "—";

    // 午前と午後に分かれている場合、選択時刻に応じて片方のみ表示
    const lines = rawText.split(/[,、]/).map((line: string) => line.trim()).filter((line: string) => line);
    if (lines.length <= 1) return rawText;

    // 選択時刻を分に変換
    const parseTimeToMinutes = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const selectedMinutes = parseTimeToMinutes(timeStr || '00:00');

    // 各時間帯が選択時刻を含むかチェック
    const relevantLines = lines.filter((line: string) => {
      // 日本の時刻表記（「12時00分」形式）と通常の時刻表記（「12:00」形式）の両方に対応
      const times = line.match(/(\d{1,2})[時:](\d{2})[分]?/g);
      if (!times || times.length < 2) return true; // 時刻が2つ未満の場合は表示

      const startTime = times[0];
      const endTime = times[1];

      // 日本の時刻表記を通常の時刻表記に変換
      const normalizeTime = (timeStr: string): string => {
        return timeStr.replace(/(\d{1,2})時(\d{2})分?/, '$1:$2');
      };

      const startMinutes = parseTimeToMinutes(normalizeTime(startTime));
      const endMinutes = parseTimeToMinutes(normalizeTime(endTime));

      // 日またぎの場合（終了時刻が開始時刻より早い）
      if (endMinutes < startMinutes) {
        return selectedMinutes >= startMinutes || selectedMinutes <= endMinutes;
      } else {
        return selectedMinutes >= startMinutes && selectedMinutes <= endMinutes;
      }
    });

    // フィルタリング結果が空の場合は、最初の時間帯を表示
    if (relevantLines.length === 0) {
      return lines[0] || rawText;
    }

    // 複数の時間帯がマッチした場合は、最初の1つだけを表示
    return relevantLines[0];
  };

  const hoursText = getFilteredHoursText();

  return (
    <li className="group flex h-26 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="shrink-0 relative">
        <div className="h-full w-24 overflow-hidden bg-gray-100">
          {imgSrc ? (
            <img src={imgSrc} alt={name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
          )}
        </div>
        {typeof p.rating === 'number' && (
          <div className="absolute top-1 left-1 bg-black/10 backdrop-blur-sm rounded-full px-2 py-0">
            <span title={`${p.rating} / 5`} className="text-[10px] font-semibold text-white">★ {p.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 p-2 flex flex-col justify-start overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-base font-semibold text-on-surface" title={name}>{name}</h2>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs">
          <div className="text-on-surface truncate">{wdJp}: {hoursText}</div>
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

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-gray-400 px-2.5 py-1.5 text-xs text-on-surface transition-colors hover:bg-gray-100"
          >
            マップで開く
          </a>
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
        </div>
      </div>
    </li>
  );
}
