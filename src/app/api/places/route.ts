// app/api/places/route.ts

interface Env {
  PLACES_API_KEY?: string;
}

export async function GET(req: Request) {
  // 環境変数（Cloudflare/Node どちらでも拾えるよう二重化）
  const key =
    (process.env as Env).PLACES_API_KEY ||
    (globalThis as any)?.ctx?.cloudflare?.env?.PLACES_API_KEY;

  if (!key) {
    return new Response('PLACES_API_KEY is missing', { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? 'cafe tokyo';
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const cursor = searchParams.get('cursor');         // ★ ここで受け取る
  const pageSize = Number(searchParams.get('pageSize') ?? '20'); // 最大20

  const body: any = {
    textQuery: q,
    languageCode: 'ja',
    regionCode: 'JP',
    rankPreference: 'DISTANCE',
    pageSize,
  };

  // 2ページ目以降は pageToken を使う
  if (cursor) {
    body.pageToken = cursor;
  } else if (lat && lng) {
    // 初回のみ近接バイアス（5km）
    body.locationBias = {
      circle: {
        center: { latitude: Number(lat), longitude: Number(lng) },
        radius: 5000,
      },
    };
  }

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.primaryType',
        'places.primaryTypeDisplayName',
        'places.rating',
        'places.googleMapsUri',
        'places.websiteUri',
        'places.currentOpeningHours',
        'places.photos',
        'nextPageToken', // ★ 無限スクロールに必須
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  if (!resp.ok) {
    return new Response(text, { status: resp.status });
  }

  // GoogleのJSONをそのまま返す（nextPageToken をフロントで拾う）
  return new Response(text, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
