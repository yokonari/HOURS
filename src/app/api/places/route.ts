// app/api/places/route.ts
type PlacesResp = {
  places?: any[];
  nextPageToken?: string;
};

const FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.rating',
  'places.googleMapsUri',
  'places.websiteUri',
  'places.currentOpeningHours.weekdayDescriptions',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.regularOpeningHours.periods',
  'places.photos.name',
  'places.photos.widthPx',
  'places.photos.heightPx',
  'places.photos.authorAttributions',
  'nextPageToken',
].join(',');

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ code: status, message, statusText: 'ERROR' }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const cursor = url.searchParams.get('cursor');
  const rank = (url.searchParams.get('rank') ?? 'relevance').toLowerCase(); // ← 追加

  // Cloudflare 環境の取り回し（process.env が無い場合のフォールバックも残す）
  const apiKey = process.env.PLACES_API_KEY;

  if (!apiKey) return jsonError(500, 'PLACES_API_KEY is missing');

  // ★ ページング時も含めて “毎回” 同じ検索条件を送る
  const body: any = {
    textQuery: q,
    languageCode: 'ja',
    regionCode: 'JP',
    maxResultCount: 20,
    // ← ここがポイント：取得時点から距離順
    rankPreference: rank === 'distance' ? 'DISTANCE' : 'RELEVANCE',
  };

  if (lat && lng) {
    body.locationBias = {
      circle: {
        center: { latitude: Number(lat), longitude: Number(lng) },
        radius: 5000,
      },
    };
  }

  if (cursor) {
    body.pageToken = cursor; // これを付けても、他パラメータは初回と同一である必要あり
  }

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  if (!resp.ok) {
    // 400 の “Request parameters for paging requests must match …” などをそのまま前段へ返す
    try {
      const j = JSON.parse(text);
      const msg =
        j?.error?.message || j?.message || 'Places API error';
      return jsonError(resp.status, msg);
    } catch {
      return jsonError(resp.status, text || 'Places API error');
    }
  }

  // 余計なフィールドを落として返す（クライアント側の型に合うように）
  let json: PlacesResp;
  try {
    json = JSON.parse(text);
  } catch {
    return jsonError(502, 'Invalid JSON from Places API');
  }

  return new Response(JSON.stringify({
    places: json.places ?? [],
    nextPageToken: json.nextPageToken ?? null,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
