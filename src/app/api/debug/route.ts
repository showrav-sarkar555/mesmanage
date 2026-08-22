// Temporary debug endpoint — checks which Upstash/KV env vars are present
// Visit /api/debug in browser to see results
export async function GET() {
  const vars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'KV_REST_API_READ_ONLY_TOKEN',
    'KV_URL',
    'REDIS_URL',
    'STORAGE_REST_API_URL',
    'STORAGE_REST_API_TOKEN',
    'STORAGE_URL',
  ];

  const found: Record<string, string> = {};
  for (const v of vars) {
    found[v] = process.env[v] ? '✅ SET' : '❌ missing';
  }

  return Response.json({ found }, { status: 200 });
}
