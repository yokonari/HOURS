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
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.websiteUri',
  'places.currentOpeningHours.weekdayDescriptions',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.regularOpeningHours.periods',
  'places.photos.name',
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
  const qRaw = url.searchParams.get('q') ?? '';
  const q = qRaw.trim();
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const cursor = url.searchParams.get('cursor');
  const rank = (url.searchParams.get('rank') ?? 'relevance').toLowerCase();
  // Cloudflare 環境の取り回し（process.env が無い場合のフォールバックも残す）
  const apiKey = process.env.PLACES_API_KEY;

  if (!apiKey) return jsonError(500, 'PLACES_API_KEY is missing');

  const latNum = lat != null ? Number(lat) : null;
  const lngNum = lng != null ? Number(lng) : null;

  const textQueryValue = q.length > 0 ? q : 'popular places';

  const body: any = {
    // テキスト入力が無い場合でも API 要件を満たすためにデフォルトクエリをセットします
    textQuery: textQueryValue,
    languageCode: 'ja',
    regionCode: 'JP',
    rankPreference: rank === 'distance' ? 'DISTANCE' : 'RELEVANCE',
  };

  if (latNum != null && lngNum != null) {
    body.locationBias = {
      circle: {
        center: { latitude: latNum, longitude: lngNum },
        radius: 5000,
      },
    };
  }

  if (cursor) {
    body.pageToken = cursor;
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
