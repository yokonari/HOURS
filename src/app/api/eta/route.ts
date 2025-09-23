// src/app/api/eta/route.ts
// Next.js App Router の API Route（Node 実行前提：edge runtime を使わない）
// 日本では Google API の transit ETA は返ってこない仕様のため、公共交通機関は即スキップします。

type TravelMode = 'walking' | 'driving' | 'bicycling' | 'transit';

type Eta = { text: string; seconds: number; distanceMeters: number };
type EtaMap = Record<string, Eta | null>;

type DebugElement = {
  status: string;
  durationText?: string;
  durationSec?: number;
  distanceMeters?: number;
};

type DebugMeta = {
  requestUrlRedacted?: string[]; // Distance Matrix が複数バッチになる可能性
};

type EtaReq = {
  origin: { lat: number; lng: number };
  items: { key: string; lat: number; lng: number }[];
  mode?: TravelMode;
};

type EtaRes = {
  etas: EtaMap;
  debug?: Record<string, DebugElement>;
  debugMeta?: DebugMeta;
};

// ---- utilities ----
const DM_MAX_DEST = 25;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function redactKey(u: string) {
  return u.replace(/([?&]key=)[^&]+/g, '$1REDACTED');
}

function buildDMUrl(params: {
  origin: { lat: number; lng: number };
  items: { lat: number; lng: number }[];
  mode: Exclude<TravelMode, 'transit'>; // transit は使わない方針
  apiKey: string;
}) {
  const origin = `${params.origin.lat},${params.origin.lng}`;
  const destinations = params.items.map(i => `${i.lat},${i.lng}`).join('|');

  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(origin)}` +
    `&destinations=${encodeURIComponent(destinations)}` +
    `&mode=${encodeURIComponent(params.mode)}` +
    `&language=ja&region=JP&units=metric` +
    `&key=${encodeURIComponent(params.apiKey)}`;

  return url;
}

// ---- handler ----
export async function POST(req: Request) {
  // 入力
  let body: EtaReq | null = null;
  try {
    body = (await req.json()) as EtaReq;
  } catch {
    return new Response(JSON.stringify({ code: 400, message: 'invalid json' }), { status: 400 });
  }
  if (!body?.origin || !Array.isArray(body.items) || body.items.length === 0) {
    return new Response(JSON.stringify({ code: 400, message: 'invalid request' }), { status: 400 });
  }

  const urlQ = new URL(req.url);
  const debugLevel = Number(urlQ.searchParams.get('debug') ?? '0'); // 0/1/2

  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ code: 500, message: 'PLACES_API_KEY is missing' }), {
      status: 500,
    });
  }

  const mode = (body.mode ?? 'walking') as TravelMode;

  // --- 日本では transit が API 非対応：早期スキップ（クォータ節約） ---
  if (mode === 'transit') {
    const etas: EtaMap = {};
    const dbg: Record<string, DebugElement> = {};
    for (const it of body.items) {
      etas[it.key] = null;
      if (debugLevel >= 1) dbg[it.key] = { status: 'UNSUPPORTED_IN_JAPAN' };
    }
    const payload: EtaRes = { etas, ...(debugLevel >= 1 ? { debug: dbg } : {}) };
    return new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
  }

  // --- walking / driving / bicycling は Distance Matrix でバッチ取得 ---
  const outEtas: EtaMap = {};
  const outDbg: Record<string, DebugElement> = {};
  const meta: DebugMeta = { requestUrlRedacted: [] };

  // mode は transit 以外が確定
  const dmMode = mode as Exclude<TravelMode, 'transit'>;
  const batches = chunk(body.items, DM_MAX_DEST);

  for (const batch of batches) {
    const dmUrl = buildDMUrl({
      origin: body.origin,
      items: batch,
      mode: dmMode,
      apiKey,
    });

    if (debugLevel >= 2) meta.requestUrlRedacted!.push(redactKey(dmUrl));

    const r = await fetch(dmUrl);
    const j: any = await r.json().catch(() => null);

    if (!r.ok || !j || j.status !== 'OK') {
      const msg = j?.error_message || j?.status || 'Distance Matrix API error';
      return new Response(JSON.stringify({ code: r.status || 400, message: msg }), {
        status: r.status || 400,
      });
    }

    const elements: any[] = j.rows?.[0]?.elements ?? [];
    elements.forEach((el, idx) => {
      const it = batch[idx];
      if (!it) return;
      const st = String(el?.status ?? 'UNKNOWN');
      if (st === 'OK') {
        const seconds = Number(el.duration?.value ?? 0);
        const text = String(el.duration?.text ?? '');
        const distanceMeters = Number(el.distance?.value ?? 0);
        outEtas[it.key] = { text, seconds, distanceMeters };
        if (debugLevel >= 1)
          outDbg[it.key] = { status: st, durationText: text, durationSec: seconds, distanceMeters };
      } else {
        outEtas[it.key] = null;
        if (debugLevel >= 1) outDbg[it.key] = { status: st };
      }
    });
  }

  const payload: EtaRes = {
    etas: outEtas,
    ...(debugLevel >= 1 ? { debug: outDbg } : {}),
    ...(debugLevel >= 2 ? { debugMeta: meta } : {}),
  };

  return new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
}

export async function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}
