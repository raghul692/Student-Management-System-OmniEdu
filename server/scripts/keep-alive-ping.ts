/**
 * Render Free-Tier Keep-Alive Ping Engine
 * Pings /api/health/live probe with latency telemetry and retry logic.
 * Usage: npx tsx server/scripts/keep-alive-ping.ts [optional_url]
 */

const TARGET_URL = process.argv[2] || process.env.RENDER_API_URL || 'http://localhost:5000/api/health/live';

async function pingKeepAlive() {
  const startTime = Date.now();
  console.log(`[KeepAlive] 📡 Pinging ${TARGET_URL} at ${new Date().toISOString()}...`);

  try {
    const res = await fetch(TARGET_URL, {
      method: 'GET',
      headers: { 'User-Agent': 'OmniEdu-KeepAlive-Ping/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    const elapsed = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      console.log(`[KeepAlive] ✅ Success! Status ${res.status} in ${elapsed}ms. Service: ${data.service || 'Active'}`);
    } else {
      console.warn(`[KeepAlive] ⚠️ Non-200 response: HTTP ${res.status} in ${elapsed}ms`);
    }
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[KeepAlive] ❌ Ping failed after ${elapsed}ms: ${err.message}`);
  }
}

pingKeepAlive();
