// ─── Shared Data API Route ───────────────────────────────────────────────────
// GET  /api/data  → returns the full shared app state from Upstash Redis
// POST /api/data  → saves the full shared app state to Upstash Redis
//
// Environment variables required (set in Vercel dashboard → Storage → Redis):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { Redis } from '@upstash/redis';

const DATA_KEY = 'mess-manager:app-state';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null; // KV not configured — fall back to local-only mode
  }

  return new Redis({ url, token });
}

export async function GET() {
  const redis = getRedis();

  if (!redis) {
    // No KV configured — tell the client to use local data
    return Response.json({ ok: false, reason: 'no-kv' }, { status: 503 });
  }

  try {
    const data = await redis.get(DATA_KEY);
    if (!data) {
      return Response.json({ ok: false, reason: 'no-data' }, { status: 404 });
    }
    return Response.json({ ok: true, data });
  } catch (err) {
    console.error('[GET /api/data]', err);
    return Response.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const redis = getRedis();

  if (!redis) {
    return Response.json({ ok: false, reason: 'no-kv' }, { status: 503 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return Response.json({ ok: false, reason: 'invalid-body' }, { status: 400 });
    }

    // Validate it's app data (must have members and months)
    if (!Array.isArray(body.members) || !Array.isArray(body.months)) {
      return Response.json({ ok: false, reason: 'invalid-schema' }, { status: 400 });
    }

    await redis.set(DATA_KEY, body);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/data]', err);
    return Response.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}
