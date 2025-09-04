// app/api/photo/route.ts
// Places Photo API をサーバーでプロキシして返す（サムネイル用）

// 例: /api/photo?name=places/XXXXX/photos/YYYYY&w=400
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name'); // 必須: places/.../photos/...
  const maxWidthPx = Number(searchParams.get('w') ?? '400');

  if (!name) {
    return new Response('Missing photo name', { status: 400 });
  }

  // name の形式を簡易バリデーション（places/<id>/photos/<token>）
  const valid = /^places\/[^/]+\/photos\/[^/]+$/.test(name);
  if (!valid) {
    return new Response('Invalid photo name', { status: 400 });
  }

  const key =
    process.env.PLACES_API_KEY ||
    (globalThis as any)?.ctx?.cloudflare?.env?.PLACES_API_KEY;

  if (!key) {
    return new Response('PLACES_API_KEY is missing', { status: 500 });
  }

  // ★ name は encode しない（スラッシュを残す）
  const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidthPx}&key=${encodeURIComponent(
    key
  )}`;

  const upstream = await fetch(url, {
    // 画像を取りに行くので Accept を明示（任意）
    headers: { Accept: 'image/*' },
    redirect: 'follow',
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, { status: upstream.status });
  }

  // 画像をストリームで返す
  const headers = new Headers(upstream.headers);
  headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  // Content-Type は upstream のものを維持（image/jpeg など）
  return new Response(upstream.body, { status: 200, headers });
}
