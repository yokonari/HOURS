// src/app/api/events/route.ts
import { z } from "zod";

const EventSchema = z.object({
    title: z.string(),
    starts_at: z.string(),
});

// まず Env 型を定義しておくと便利
interface Env {
    DB: D1Database;              // wrangler.jsonc で binding = "DB" としたもの
    PLACES_API_KEY: string;      // wrangler secret に入れたもの
}

export async function GET(
    _req: Request,
    ctx: any
) {
    const { env } = ctx as { env: Env };
    const { results } = await env.DB
        .prepare("SELECT id, title, starts_at FROM events ORDER BY starts_at DESC")
        .all();

    return Response.json(results);
}

export async function POST(
    req: Request,
    ctx: any
) {
    const { env } = ctx as { env: Env };
    const json = await req.json();
    const { title, starts_at } = EventSchema.parse(json);

    await env.DB
        .prepare("INSERT INTO events (title, starts_at) VALUES (?1, ?2)")
        .bind(title, starts_at)
        .run();

    return new Response(null, { status: 201 });
}
