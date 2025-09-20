// app/api/eta/route.ts
type EtaReq = {
  origin: { lat: number; lng: number };
  items: { key: string; lat: number; lng: number }[]; // key はフロントの makeKey と一致させる
  mode?: 'walking' | 'driving' | 'bicycling' | 'transit';
};

type EtaRes = {
  etas: Record<string, { text: string; seconds: number; distanceMeters: number }>;
};

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ code: status, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// 追加：型ガード
function hasStatus(x: unknown): x is { status: string; error_message?: string } {
  return typeof x === 'object' && x !== null && 'status' in x && typeof (x as any).status === 'string';
}

export async function POST(req: Request) {
  const body = (await req.json()) as EtaReq;
  if (!body?.origin || !Array.isArray(body.items) || body.items.length === 0) {
    return jsonError(400, 'invalid request');
  }
  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey) return jsonError(500, 'PLACES_API_KEY is missing');

  const origin = `${body.origin.lat},${body.origin.lng}`;
  const destinations = body.items.map((i) => `${i.lat},${i.lng}`).join('|');
  const mode = body.mode ?? 'walking';

  // Distance Matrix v1（わかりやすいJSON、最大25件/回）
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(origin)}` +
    `&destinations=${encodeURIComponent(destinations)}` +
    `&mode=${encodeURIComponent(mode)}` +
    `&language=ja&region=JP&units=metric` +
    `&key=${encodeURIComponent(apiKey)}`;

  const resp = await fetch(url, { method: 'GET' });
  const jsonUnknown = await resp.json().catch(() => null) as unknown;
  if (!resp.ok || !jsonUnknown) {
    return jsonError(resp.status || 502, 'Distance Matrix API error');
  }
  if (!hasStatus(jsonUnknown) || jsonUnknown.status !== 'OK') {
    const msg = hasStatus(jsonUnknown) ? (jsonUnknown.error_message || jsonUnknown.status) : 'Distance Matrix error';
    return jsonError(400, msg);
  }

  // destinations と items は同順で返る前提
  const out: EtaRes['etas'] = {};
  const rows = (jsonUnknown as any).rows?.[0]?.elements ?? [];
  rows.forEach((el: any, idx: number) => {
    const item = body.items[idx];
    if (!item) return;
    if (el.status !== 'OK') return;
    const seconds = Number(el.duration?.value ?? 0);
    const text = String(el.duration?.text ?? '');
    const distanceMeters = Number(el.distance?.value ?? 0);
    out[item.key] = { text, seconds, distanceMeters };
  });

  return new Response(JSON.stringify({ etas: out } satisfies EtaRes), {
    headers: { 'Content-Type': 'application/json' },
  });
}
