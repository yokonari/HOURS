// app/api/places/route.ts
import coffeeData from './places/coffee_places.json';
import barData from './places/bar_places.json';
import bookData from './places/book_places.json';
import cakeData from './places/cake_places.json';
import curryData from './places/curry_places.json';
import donutData from './places/donut_places.json';
import familyData from './places/family_places.json';
import burgerData from './places/burger_places.json';
import drugstoreData from './places/drugstore_places.json';
import omuriceData from './places/omurice_places.json';
import bakeryData from './places/bakery_places.json';
import ramenData from './places/ramen_places.json';
import izakayaData from './places/izakaya_places.json';
import shishaData from './places/shisha_places.json';
import sobaData from './places/soba_places.json';
import superData from './places/super_places.json';
import takoyakiData from './places/takoyaki_places.json';
import afternoonTeaData from './places/afternoontea_places.json';
import chineseData from './places/chinese_places.json';
import crepeData from './places/crepe_places.json';
import { weekdayFromDateString, isOpenOnWeekday, isOpenAt, getClosingTimeForMinutes } from '@/lib/openingHours';
import type { Place as OpeningHoursPlace } from '@/lib/openingHours';

type SamplePlace = (typeof coffeeData.places)[number];

const coffeePlaces: SamplePlace[] = Array.isArray(coffeeData.places) ? [...coffeeData.places] : [];
const barPlaces: SamplePlace[] = Array.isArray(barData.places) ? [...barData.places] : [];
const bookPlaces: SamplePlace[] = Array.isArray(bookData.places) ? [...bookData.places] : [];
const cakePlaces: SamplePlace[] = Array.isArray(cakeData.places) ? [...cakeData.places] : [];
const curryPlaces: SamplePlace[] = Array.isArray(curryData.places) ? [...curryData.places] : [];
const donutPlaces: SamplePlace[] = Array.isArray(donutData.places) ? [...donutData.places] : [];
const familyPlaces: SamplePlace[] = Array.isArray(familyData.places) ? [...familyData.places] : [];
const burgerPlaces: SamplePlace[] = Array.isArray(burgerData.places) ? [...burgerData.places] : [];
const drugstorePlaces: SamplePlace[] = Array.isArray(drugstoreData.places) ? [...drugstoreData.places] : [];
const omuricePlaces: SamplePlace[] = Array.isArray(omuriceData.places) ? [...omuriceData.places] : [];
const bakeryPlaces: SamplePlace[] = Array.isArray(bakeryData.places) ? [...bakeryData.places] : [];
const ramenPlaces: SamplePlace[] = Array.isArray(ramenData.places) ? [...ramenData.places] : [];
const izakayaPlaces: SamplePlace[] = Array.isArray(izakayaData.places) ? [...izakayaData.places] : [];
const shishaPlaces: SamplePlace[] = Array.isArray(shishaData.places) ? [...shishaData.places] : [];
const sobaPlaces: SamplePlace[] = Array.isArray(sobaData.places) ? [...sobaData.places] : [];
const superPlaces: SamplePlace[] = Array.isArray(superData.places) ? [...superData.places] : [];
const takoyakiPlaces: SamplePlace[] = Array.isArray(takoyakiData.places) ? [...takoyakiData.places] : [];
const afternoonTeaPlaces: SamplePlace[] = Array.isArray(afternoonTeaData.places) ? [...afternoonTeaData.places] : [];
const chinesePlaces: SamplePlace[] = Array.isArray(chineseData.places) ? [...chineseData.places] : [];
const crepePlaces: SamplePlace[] = Array.isArray(crepeData.places) ? [...crepeData.places] : [];

const SAMPLE_PLACES: SamplePlace[] = [
  ...coffeePlaces,
  ...barPlaces,
  ...bookPlaces,
  ...cakePlaces,
  ...curryPlaces,
  ...donutPlaces,
  ...familyPlaces,
  ...burgerPlaces,
  ...drugstorePlaces,
  ...omuricePlaces,
  ...bakeryPlaces,
  ...ramenPlaces,
  ...izakayaPlaces,
  ...shishaPlaces,
  ...sobaPlaces,
  ...superPlaces,
  ...takoyakiPlaces,
  ...afternoonTeaPlaces,
  ...chinesePlaces,
  ...crepePlaces,
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qRaw = (url.searchParams.get('q') ?? '').trim();
  const qLower = qRaw.toLowerCase();
  const cafeKeywords = ['カフェ', '喫茶', 'コーヒー'];
  const barKeywords = ['バー'];
  const bookKeywords = ['本屋', '本', '書店'];
  const cakeKeywords = ['ケーキ'];
  const curryKeywords = ['カレー'];
  const donutKeywords = ['ドーナツ'];
  const familyKeywords = ['ファミレス'];
  const burgerKeywords = ['ハンバーガー'];
  const drugstoreKeywords = ['ドラッグストア', '薬'];
  const omuriceKeywords = ['オムライス'];
  const bakeryKeywords = ['パン'];
  const ramenKeywords = ['ラーメン'];
  const izakayaKeywords = ['居酒屋'];
  const shishaKeywords = ['シーシャ'];
  const sobaKeywords = ['蕎麦', 'そば'];
  const superKeywords = ['スーパー'];
  const takoyakiKeywords = ['たこ焼き'];
  const afternoonTeaKeywords = ['アフタヌーンティー', '紅茶'];
  const chineseKeywords = ['中華'];
  const crepeKeywords = ['クレープ'];
  // ファイルとの対応を明確にするため、キーワードは完全一致で判定します。
  const hasCafeKeyword = cafeKeywords.some((keyword) => qRaw === keyword);
  const hasBarKeyword = barKeywords.some((keyword) => qRaw === keyword);
  const hasBookKeyword = bookKeywords.some((keyword) => qRaw === keyword);
  const hasCakeKeyword = cakeKeywords.some((keyword) => qRaw === keyword);
  const hasCurryKeyword = curryKeywords.some((keyword) => qRaw === keyword);
  const hasDonutKeyword = donutKeywords.some((keyword) => qRaw === keyword);
  const hasFamilyKeyword = familyKeywords.some((keyword) => qRaw === keyword);
  const hasBurgerKeyword = burgerKeywords.some((keyword) => qRaw === keyword);
  const hasDrugstoreKeyword = drugstoreKeywords.some((keyword) => qRaw === keyword);
  const hasOmuriceKeyword = omuriceKeywords.some((keyword) => qRaw === keyword);
  const hasBakeryKeyword = bakeryKeywords.some((keyword) => qRaw === keyword);
  const hasRamenKeyword = ramenKeywords.some((keyword) => qRaw === keyword);
  const hasIzakayaKeyword = izakayaKeywords.some((keyword) => qRaw === keyword);
  const hasShishaKeyword = shishaKeywords.some((keyword) => qRaw === keyword);
  const hasSobaKeyword = sobaKeywords.some((keyword) => qRaw === keyword);
  const hasSuperKeyword = superKeywords.some((keyword) => qRaw === keyword);
  const hasTakoyakiKeyword = takoyakiKeywords.some((keyword) => qRaw === keyword);
  const hasAfternoonTeaKeyword = afternoonTeaKeywords.some((keyword) => qRaw === keyword);
  const hasChineseKeyword = chineseKeywords.some((keyword) => qRaw === keyword);
  const hasCrepeKeyword = crepeKeywords.some((keyword) => qRaw === keyword);

  const dateParam = url.searchParams.get('date');
  const timeParam = url.searchParams.get('time');
  const finalReceptionParam = url.searchParams.get('finalReception') ?? 'none';

  const minutesFilter = (() => {
    if (!timeParam) return null;
    const [h, m] = timeParam.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  })();
  const weekdayFilter = dateParam ? weekdayFromDateString(dateParam) : null;

  const applyScheduleFilter = (list: SamplePlace[]) => {
    if (weekdayFilter == null || minutesFilter == null) return list;
    const bufferMinutes =
      finalReceptionParam === '30min'
        ? 30
        : finalReceptionParam === '60min'
          ? 60
          : 0;

    return list.filter((place) => {
      const typedPlace = place as unknown as OpeningHoursPlace;
      if (!isOpenOnWeekday(typedPlace as any, weekdayFilter)) return false;
      if (!isOpenAt(typedPlace as any, weekdayFilter, minutesFilter)) return false;

      if (bufferMinutes === 0) return true;

      const closingAbsolute = getClosingTimeForMinutes(typedPlace as any, weekdayFilter, minutesFilter);
      if (closingAbsolute === null) return true;

      const dayStart = weekdayFilter * 1440;
      const targetAbsolute = dayStart + minutesFilter;
      const cutoffAbsolute = closingAbsolute - bufferMinutes;

      if (closingAbsolute >= dayStart) {
        return targetAbsolute <= cutoffAbsolute;
      }

      return targetAbsolute + 1440 <= cutoffAbsolute + 1440;
    });
  };

  const categoryMatches = [
    hasCafeKeyword ? coffeePlaces : null,
    hasBarKeyword ? barPlaces : null,
    hasBookKeyword ? bookPlaces : null,
    hasCakeKeyword ? cakePlaces : null,
    hasCurryKeyword ? curryPlaces : null,
    hasDonutKeyword ? donutPlaces : null,
    hasFamilyKeyword ? familyPlaces : null,
    hasBurgerKeyword ? burgerPlaces : null,
    hasDrugstoreKeyword ? drugstorePlaces : null,
    hasOmuriceKeyword ? omuricePlaces : null,
    hasBakeryKeyword ? bakeryPlaces : null,
    hasRamenKeyword ? ramenPlaces : null,
    hasIzakayaKeyword ? izakayaPlaces : null,
    hasShishaKeyword ? shishaPlaces : null,
    hasSobaKeyword ? sobaPlaces : null,
    hasSuperKeyword ? superPlaces : null,
    hasTakoyakiKeyword ? takoyakiPlaces : null,
    hasAfternoonTeaKeyword ? afternoonTeaPlaces : null,
    hasChineseKeyword ? chinesePlaces : null,
    hasCrepeKeyword ? crepePlaces : null,
  ].filter((p): p is SamplePlace[] => Array.isArray(p));

  const filtered = (() => {
    if (categoryMatches.length > 0) {
      const combined = Array.from(
        new Map(
          categoryMatches
            .flat()
            .map((place) => [place.id ?? place.displayName?.text ?? Math.random().toString(36), place])
        ).values()
      );
      // カテゴリが特定できた場合は、そのカテゴリに属する全件を対象にします。
      return combined;
    }
    // カテゴリ未特定時も、サンプルデータ全体を候補として返します。
    return SAMPLE_PLACES;
  })();

  // 必要なフィールドだけをコピーし、クライアント側の型に合う形で返します。
  const scheduleFiltered = applyScheduleFilter(filtered);

  const places = scheduleFiltered.map((place) => ({
    ...place,
    photos: place.photos?.map((photo) => ({
      ...photo,
      // 既存実装との互換性を保つため、写真名はそのまま返します。
      name: photo.name,
    })),
  }));

  return new Response(JSON.stringify({
    places,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
