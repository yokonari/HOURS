// openingHours.ts — 指定時間フィルタ対応（24h店の取りこぼし無し）
// - weekdayDescriptions（月→日）と periods を両対応
// - 日またぎ(overnight)対応
// - JSX用の表示テキストは曜日プレフィックスを除去

// ========= Types =========
export type DayTime = { day?: number; hour?: number; minute?: number };
export type Period = { open?: DayTime; close?: DayTime | null };
export type OpeningHours = { periods?: Period[]; weekdayDescriptions?: string[] };
export type Place = { regularOpeningHours?: OpeningHours; currentOpeningHours?: OpeningHours };

// ========= Exports you already import =========
export const jpWeek = ["日", "月", "火", "水", "木", "金", "土"] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");
export const todayStr = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const weekdayFromDateString = (s: string): number =>
  new Date(`${s}T00:00:00`).getDay();

export const getOpeningHoursFromPlace = (place: Place): OpeningHours | undefined =>
  place?.currentOpeningHours ?? place?.regularOpeningHours ?? undefined;

// ========= Internals =========
const jsDayToMonFirstIdx = (jsDay: number) => (jsDay + 6) % 7;
const normalize = (s: string) => s.replace(/\u3000/g, " ").trim();

const is24hText = (raw: string) => {
  const t = normalize(raw).toLowerCase();
  return /\b24\s*時間/.test(t) || /24\s*hours/.test(t) || /open\s*24\s*hours/.test(t);
};
const isClosedText = (raw: string) => /休業|定休日|closed/i.test(normalize(raw));

const getDescForJsDay = (wd: string[] | undefined, jsDay: number): string =>
  wd?.[jsDayToMonFirstIdx(jsDay)] ?? "";

// 曜日接頭辞の除去
const jpWeekFull = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"] as const;
const enWeekFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const enWeekAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export function stripWeekdayPrefix(line: string, jsDay: number): string {
  if (!line) return "";
  const sp = "[\\s\\u3000]*";
  const colon = "[:：]";
  const dayJP = jpWeek[jsDay];
  const dayJPFull = jpWeekFull[jsDay];
  const dayEN = enWeekFull[jsDay];
  const dayENAbbr = enWeekAbbr[jsDay];
  const pattern = new RegExp(
    `^(?:${dayJPFull}|${dayJP}曜?日?|${dayEN}|${dayENAbbr})${sp}${colon}${sp}`,
    "i"
  );
  return line.replace(pattern, "");
}

// ========= 24h 判定 =========
function is24hByWeekdayDescriptions(wd: string[] | undefined, jsDay: number): boolean | undefined {
  if (!wd?.length) return undefined;
  const desc = getDescForJsDay(wd, jsDay);
  if (!desc) return undefined;
  if (is24hText(desc)) return true;
  if (isClosedText(desc)) return false;
  return undefined;
}
function is24hByPeriods(periods?: Period[]): boolean {
  const ps = periods ?? [];
  return ps.some((p: Period) => {
    const o = p.open;
    const c = p.close;
    return !!o && o.hour === 0 && o.minute === 0 && !c; // 00:00開始・close無し → 24h
  });
}
export function isOpenAllDayThisWeekday(place: Place, jsDay: number): boolean {
  const desc24h =
    is24hByWeekdayDescriptions(place?.currentOpeningHours?.weekdayDescriptions, jsDay) ??
    is24hByWeekdayDescriptions(place?.regularOpeningHours?.weekdayDescriptions, jsDay);
  if (desc24h !== undefined) return desc24h;
  return is24hByPeriods(place?.regularOpeningHours?.periods);
}

// ========= 表示・軽解析 =========
export const getHoursForWeekdayText = (text: string) => {
  const original = text ?? "";
  return { is24h: is24hText(original), isClosed: isClosedText(original), text: original };
};
export function getHoursForPlaceOnWeekday(place: Place, jsDay: number) {
  const wd =
    place?.currentOpeningHours?.weekdayDescriptions ??
    place?.regularOpeningHours?.weekdayDescriptions;
  const text = getDescForJsDay(wd, jsDay);
  return getHoursForWeekdayText(text);
}
export function getWeekdayStatusText(place: Place, jsDay: number): string {
  const info = getHoursForPlaceOnWeekday(place, jsDay);
  if (info.is24h) return "24時間営業";
  if (info.isClosed) return "休業";
  return stripWeekdayPrefix(info.text, jsDay) || "—";
}

// ========= 時間帯パース & 指定時間判定 =========
type Interval = { start: number; end: number }; // minutes-from-week-start [start, end)

// 週の分数
const DAY_MIN = 24 * 60;
const WEEK_MIN = 7 * DAY_MIN;

// "6時40分" / "6:40" / "6時" / "06:40" 等 → 分（0..1440）
function parseTimeToMinutes(s: string): number | null {
  const t = normalize(s);
  const re = /(\d{1,2})\s*(?:時\s*(\d{1,2})?\s*分?|[：:]\s*(\d{2}))/i;
  const m = t.match(re);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = m[2] != null ? Number(m[2]) : (m[3] != null ? Number(m[3]) : 0);
  if (Number.isNaN(h) || Number.isNaN(mm)) return null;
  if (h === 24 && mm === 0) return DAY_MIN; // 24:00 を翌日の 0:00 として扱う
  if (h < 0 || h > 24 || mm < 0 || mm > 59) return null;
  return Math.min(h * 60 + mm, DAY_MIN); // 安全側で 24:00 上限
}

// 1行テキストから時刻をすべて抽出（登場順）
function extractAllTimesInMinutes(line: string): number[] {
  const res: number[] = [];
  const reGlobal = /(\d{1,2})\s*(?:時\s*(\d{1,2})?\s*分?|[：:]\s*(\d{2}))/gi;
  let m: RegExpExecArray | null;
  while ((m = reGlobal.exec(line)) !== null) {
    const h = Number(m[1]);
    const mm = m[2] != null ? Number(m[2]) : (m[3] != null ? Number(m[3]) : 0);
    if (Number.isNaN(h) || Number.isNaN(mm)) continue;
    if (h === 24 && mm === 0) { res.push(DAY_MIN); continue; }
    if (h < 0 || h > 24 || mm < 0 || mm > 59) continue;
    res.push(Math.min(h * 60 + mm, DAY_MIN));
  }
  return res;
}

// 曜日テキスト（曜日プレフィックス除去済み）→ その日の week-min Interval 群
function buildIntervalsFromDayText(jsDay: number, raw: string): Interval[] {
  const line = normalize(stripWeekdayPrefix(raw, jsDay));
  if (!line) return [];
  if (isClosedText(line)) return [];
  if (is24hText(line)) {
    const s = jsDay * DAY_MIN;
    return [{ start: s, end: s + DAY_MIN }];
  }

  // 例: "6時40分～20時50分" / "9:00-17:00" / 複数 "9:00-12:00, 13:00-17:00"
  const times = extractAllTimesInMinutes(line);
  const ivals: Interval[] = [];
  for (let i = 0; i + 1 < times.length; i += 2) {
    const a = times[i];
    const b = times[i + 1];
    if (a == null || b == null) continue;
    const start = jsDay * DAY_MIN + a;
    const end = (b > a ? jsDay * DAY_MIN + b : (jsDay + 1) * DAY_MIN + b); // 日またぎ
    ivals.push({ start, end });
  }
  return ivals;
}

// periods → 週単位 Interval 群
function buildIntervalsFromPeriods(periods?: Period[]): Interval[] {
  const ps = periods ?? [];
  const ivals: Interval[] = [];
  for (const p of ps) {
    const o = p.open;
    const c = p.close;
    if (!o) continue;
    const oDay = (o.day ?? 0);
    const oMin = (o.hour ?? 0) * 60 + (o.minute ?? 0);
    const start = oDay * DAY_MIN + oMin;

    if (!c) {
      // close 無しは「常時開店」に近い扱い → 全週 True で良いが、
      // インターバルとしては全域にしておく
      ivals.push({ start: 0, end: WEEK_MIN });
      continue;
    }
    const cDay = (c.day ?? oDay);
    const cMin = (c.hour ?? 0) * 60 + (c.minute ?? 0);
    let end = cDay * DAY_MIN + cMin;
    if (end <= start) end += WEEK_MIN; // 念のため

    ivals.push({ start, end });
  }
  return ivals;
}

// 週境界を跨ぐ Interval は [start, WEEK) と [0, end-WEEK) に分割
function normalizeIntervalsToWeek(ivals: Interval[]): Interval[] {
  const res: Interval[] = [];
  for (const { start, end } of ivals) {
    if (end <= WEEK_MIN) {
      res.push({ start, end });
    } else {
      res.push({ start, end: WEEK_MIN });
      res.push({ start: 0, end: end - WEEK_MIN });
    }
  }
  return res;
}

// 指定 (jsDay, minutesFromMidnight) が ivals のどれかに含まれるか
function hitIntervals(ivals: Interval[], jsDay: number, minutes: number): boolean {
  const m = jsDay * DAY_MIN + minutes;
  for (const { start, end } of ivals) {
    if (start <= m && m < end) return true; // 終了時刻は含めない（半開区間）
  }
  return false;
}

// ========= 公開API：指定時間で開店しているか =========

/**
 * isOpenAt(place, at: Date)
 * isOpenAt(place, jsDay: number, minutesFromMidnight?: number)
 */
export function isOpenAt(place: Place, at: Date): boolean;
export function isOpenAt(place: Place, jsDay: number, minutesFromMidnight?: number): boolean;
export function isOpenAt(
  place: Place,
  arg2: Date | number,
  minutesFromMidnight?: number
): boolean {
  const jsDay = arg2 instanceof Date ? arg2.getDay() : arg2;
  const minutes =
    arg2 instanceof Date ? arg2.getHours() * 60 + arg2.getMinutes() : (minutesFromMidnight ?? 0);

  // 1) 24h は常に true
  if (isOpenAllDayThisWeekday(place, jsDay)) return true;

  const oh = getOpeningHoursFromPlace(place);

  // 2) periods があれば最優先
  const fromPeriods = buildIntervalsFromPeriods(oh?.periods);
  if (fromPeriods.length > 0) {
    const normalized = normalizeIntervalsToWeek(fromPeriods);
    if (hitIntervals(normalized, jsDay, minutes)) return true;
    // periods があっても、API品質の関係で weekdayDescriptions との食い違いがあり得るので、
    // 最後に weekdayDescriptions も確認しておく
  }

  // 3) weekdayDescriptions から当日の営業時間を確認
  const wd = oh?.weekdayDescriptions ?? [];
  const todayLine = getDescForJsDay(wd, jsDay);
  const todayIntervals = buildIntervalsFromDayText(jsDay, todayLine);

  // まず選択日時（曜日・時間）に合致しているか確認
  if (hitIntervals(normalizeIntervalsToWeek(todayIntervals), jsDay, minutes)) {
    return true;
  }

  // 合致していない場合、前日の営業時間を確認
  const prevDay = (jsDay + 6) % 7;
  const prevLine = getDescForJsDay(wd, prevDay);
  const prevIntervals = buildIntervalsFromDayText(prevDay, prevLine);

  // 前日の営業時間が日またぎしているかチェック
  const overnightIntervals = prevIntervals.filter(interval => {
    const startDay = Math.floor(interval.start / DAY_MIN) % 7;
    const endDay = Math.floor((interval.end - 1) / DAY_MIN) % 7;
    return startDay !== endDay; // 日またぎしている
  });

  // 前日の営業時間が日またぎしていて、かつ選択時刻が含まれている場合のみ表示
  if (overnightIntervals.length > 0) {
    const normalizedOvernight = normalizeIntervalsToWeek(overnightIntervals);
    if (hitIntervals(normalizedOvernight, jsDay, minutes)) {
      return true;
    }
  }

  // 上記に合致しない場合は結果から弾く
  return false;
}

// ========= “曜日だけ”のゆるい判定 =========
export function isOpenOnWeekday(place: Place, jsDay: number): boolean {
  if (isOpenAllDayThisWeekday(place, jsDay)) return true;

  // weekdayDescriptions の明示休業なら false
  const wd =
    place?.currentOpeningHours?.weekdayDescriptions ??
    place?.regularOpeningHours?.weekdayDescriptions;
  const desc = getDescForJsDay(wd, jsDay);
  if (desc && isClosedText(desc)) return false;

  // periods/weekdayDescriptions のどちらかでその日の区間があれば true
  const fromPeriods = buildIntervalsFromPeriods(getOpeningHoursFromPlace(place)?.periods);
  if (fromPeriods.some(({ start, end }) => {
    const sDay = Math.floor(start / DAY_MIN) % 7;
    const eDay = Math.floor((end - 1) / DAY_MIN) % 7; // endは開区間
    return sDay === jsDay || eDay === jsDay;
  })) return true;

  const fromDesc = buildIntervalsFromDayText(jsDay, desc);
  if (fromDesc.length > 0) return true;

  // 不明は落とさない方針
  return true;
}

/**
 * 営業時間の表示情報を取得する
 * @param place 店舗情報
 * @param jsDay 曜日（0=日曜, 1=月曜, ...）
 * @param minutes 時刻（分単位）
 * @returns 営業時間の表示情報
 */
export function getOpeningHoursDisplayInfo(place: Place, jsDay: number, minutes: number): {
  isOpen: boolean;
  displayDay: number;
  displayText: string;
} {
  const oh = getOpeningHoursFromPlace(place);

  const filterHoursByMinutes = (hoursText: string, minutesValue: number): string => {
    if (!hoursText) return '';
    if (hoursText === '24時間営業' || hoursText === '休業') return hoursText;

    const segments = hoursText.split(/[,、]/).map(seg => seg.trim()).filter(Boolean);
    if (segments.length === 0) return hoursText;

    const parseTime = (text: string): number | null => {
      const match = text.match(/(\d{1,2})[時:](\d{2})/);
      if (!match) return null;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      return hour * 60 + minute;
    };

    const normalizeSegment = (segment: string): string => segment.replace(/(\d{1,2})時(\d{2})分?/, '$1:$2');

    const selectedSegment = segments.find(segment => {
      const times = segment.match(/(\d{1,2})[時:](\d{2})/g);
      if (!times || times.length < 2) return false;

      const start = parseTime(normalizeSegment(times[0]));
      const end = parseTime(normalizeSegment(times[1]));
      if (start == null || end == null) return false;

      if (end < start) {
        return minutesValue >= start || minutesValue <= end;
      }
      return minutesValue >= start && minutesValue <= end;
    });

    if (selectedSegment) return selectedSegment;
    return segments[0] ?? hoursText;
  };

  // 1) 24h は常に true
  if (isOpenAllDayThisWeekday(place, jsDay)) {
    const filtered = filterHoursByMinutes(getWeekdayStatusText(place, jsDay), minutes);
    return {
      isOpen: true,
      displayDay: jsDay,
      displayText: filtered
    };
  }

  // 3) weekdayDescriptions から当日の営業時間を確認
  const wd = oh?.weekdayDescriptions ?? [];
  const todayLine = getDescForJsDay(wd, jsDay);
  const todayIntervals = buildIntervalsFromDayText(jsDay, todayLine);

  // まず選択日時（曜日・時間）に合致しているか確認
  const normalizedToday = normalizeIntervalsToWeek(todayIntervals);
  if (hitIntervals(normalizedToday, jsDay, minutes)) {
    const hoursText = getWeekdayStatusText(place, jsDay);
    const filteredText = filterHoursByMinutes(hoursText, minutes);
    return {
      isOpen: true,
      displayDay: jsDay,
      displayText: filteredText
    };
  }

  // 合致していない場合、前日の営業時間を確認
  const prevDay = (jsDay + 6) % 7;
  const prevLine = getDescForJsDay(wd, prevDay);
  const prevIntervals = buildIntervalsFromDayText(prevDay, prevLine);

  // 前日の営業時間が日またぎしているかチェック
  const overnightIntervals = prevIntervals.filter(interval => {
    const startDay = Math.floor(interval.start / DAY_MIN) % 7;
    const endDay = Math.floor((interval.end - 1) / DAY_MIN) % 7;
    return startDay !== endDay; // 日またぎしている
  });

  // 前日の営業時間が日またぎしていて、かつ選択時刻が含まれている場合のみ表示
  if (overnightIntervals.length > 0) {
    const normalizedOvernight = normalizeIntervalsToWeek(overnightIntervals);
    if (hitIntervals(normalizedOvernight, jsDay, minutes)) {
      // ただし、選択時刻が当日の営業時間の開始時刻以降の場合は、当日の営業時間を優先
      const todayStartTime = todayIntervals.length > 0 ? todayIntervals[0].start % DAY_MIN : 0;
      if (minutes >= todayStartTime) {
        const filtered = filterHoursByMinutes(getWeekdayStatusText(place, jsDay), minutes);
        return {
          isOpen: true,
          displayDay: jsDay,
          displayText: filtered
        };
      }

      const prevText = getWeekdayStatusText(place, prevDay);
      const filteredPrev = filterHoursByMinutes(prevText, minutes);
      return {
        isOpen: true,
        displayDay: prevDay,
        displayText: filteredPrev
      };
    }
  }

  // 上記に合致しない場合は結果から弾く
  return {
    isOpen: false,
    displayDay: jsDay,
    displayText: ''
  };
}

/**
 * 営業終了時間を取得する（分単位）
 * @param place 店舗情報
 * @param jsDay 曜日（0=日曜, 1=月曜, ...）
 * @returns 営業終了時間（分単位）、不明の場合はnull
 */
export function getClosingTime(place: Place, jsDay: number): number | null {
  const desc = place?.currentOpeningHours?.weekdayDescriptions ?? place?.regularOpeningHours?.weekdayDescriptions;
  if (!desc || desc.length === 0) return null;

  const dayText = getDescForJsDay(desc, jsDay);
  if (!dayText) return null;

  // 24時間営業の場合はnull（終了時間なし）
  if (dayText.includes('24時間') || dayText.includes('24時間営業')) return null;

  // 休業の場合はnull
  if (dayText.includes('休業') || dayText.includes('定休日')) return null;

  // 営業時間から終了時間を抽出
  const timeMatches = dayText.match(/(\d{1,2})[時:](\d{2})[分]?/g);
  if (!timeMatches || timeMatches.length < 2) return null;

  // 最後の時間を終了時間とする
  const lastTime = timeMatches[timeMatches.length - 1];
  const timeMatch = lastTime.match(/(\d{1,2})[時:](\d{2})[分]?/);
  if (!timeMatch) return null;

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  return hours * 60 + minutes;
}

export function getClosingTimeForMinutes(place: Place, jsDay: number, minutes: number): number | null {
  if (isOpenAllDayThisWeekday(place, jsDay)) return null;

  const targetAbsolute = jsDay * DAY_MIN + minutes;
  const oh = getOpeningHoursFromPlace(place);

  const candidateEnds: { end: number; displayDay: number }[] = [];

  const recordInterval = (interval: Interval, displayDay: number) => {
    if (interval.start <= targetAbsolute && targetAbsolute < interval.end) {
      const duration = interval.end - interval.start;
      if (duration >= DAY_MIN) {
        candidateEnds.push({ end: -1, displayDay });
      } else {
        candidateEnds.push({ end: interval.end, displayDay });
      }
    }
  };

  const fromPeriods = normalizeIntervalsToWeek(buildIntervalsFromPeriods(oh?.periods));
  fromPeriods.forEach((interval) => recordInterval(interval, Math.floor(interval.end / DAY_MIN) % 7));

  const wd = oh?.weekdayDescriptions ?? [];
  const todayIntervalsRaw = buildIntervalsFromDayText(jsDay, getDescForJsDay(wd, jsDay));
  const todayIntervals = normalizeIntervalsToWeek(todayIntervalsRaw);
  todayIntervals.forEach((interval) => recordInterval(interval, jsDay));

  const prevDay = (jsDay + 6) % 7;
  const prevIntervalsRaw = buildIntervalsFromDayText(prevDay, getDescForJsDay(wd, prevDay));
  const prevIntervals = normalizeIntervalsToWeek(prevIntervalsRaw);
  prevIntervals.forEach((interval) => recordInterval(interval, prevDay));

  if (candidateEnds.length === 0) {
    return null;
  }

  if (candidateEnds.some((c) => c.end === -1)) {
    return null;
  }

  candidateEnds.sort((a, b) => a.end - b.end);
  const primary = candidateEnds[0];

  const dayStart = jsDay * DAY_MIN;
  const dayEnd = dayStart + DAY_MIN;

  const normalizedEnd = ((primary.end % WEEK_MIN) + WEEK_MIN) % WEEK_MIN;
  const isPrevDay = normalizedEnd < dayStart;

  if (isPrevDay) {
    const prevText = getWeekdayStatusText(place, prevDay);
    const segments = prevText.split(/[,、]/).map((seg) => seg.trim()).filter(Boolean);
    const parsedSegments = segments
      .map((seg) => {
        const times = seg.match(/(\d{1,2})[時:](\d{2})/g);
        if (!times || times.length < 2) return null;
        const parse = (raw: string): number | null => {
          const m = raw.match(/(\d{1,2})[時:](\d{2})/);
          if (!m) return null;
          const h = Number(m[1]);
          const mm = Number(m[2]);
          return h * 60 + mm;
        };
        const start = parse(times[0]);
        const end = parse(times[1]);
        if (start == null || end == null) return null;
        return { start, end, text: seg };
      })
      .filter((v): v is { start: number; end: number; text: string } => !!v);

    const matched = parsedSegments.find((seg) => {
      const startAbs = prevDay * DAY_MIN + seg.start;
      let endAbs = prevDay * DAY_MIN + seg.end;
      if (endAbs <= startAbs) {
        endAbs += DAY_MIN;
      }
      return targetAbsolute < endAbs;
    });

    if (matched) {
      let endAbs = prevDay * DAY_MIN + matched.end;
      if (endAbs <= prevDay * DAY_MIN + matched.start) {
        endAbs += DAY_MIN;
      }
      return endAbs;
    }
  }

  return primary.end;
}
