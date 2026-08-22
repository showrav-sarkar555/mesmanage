// Enhanced debug endpoint — tests actual Redis connection and shows stored data
import { Redis } from '@upstash/redis';

const DATA_KEY = 'mess-manager:app-state';

export async function GET() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return Response.json({ error: 'No Redis env vars found' });
  }

  try {
    const redis = new Redis({ url, token });

    // Try a ping first
    const ping = await redis.ping();

    // Try reading the stored data
    const raw = await redis.get(DATA_KEY);

    let dataInfo = null;
    if (raw && typeof raw === 'object') {
      const d = raw as any;
      dataInfo = {
        membersCount: Array.isArray(d.members) ? d.members.length : 'not array',
        memberNames: Array.isArray(d.members) ? d.members.map((m: any) => `${m.name}:${m.pin || 'no-pin'}`) : [],
        monthsCount: Array.isArray(d.months) ? d.months.length : 'not array',
      };
    }

    return Response.json({
      ping,
      hasData: raw !== null,
      dataInfo,
    });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Unknown error' });
  }
}
