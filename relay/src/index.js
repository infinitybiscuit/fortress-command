// Fortress Command relay credentials — a Cloudflare Worker.
//
// Online games connect the two phones directly when they can. When a network
// blocks that (common on mobile data), traffic goes through Cloudflare's TURN
// relay instead. Relay access needs short-lived credentials signed with your
// TURN key, which must stay secret, so the game asks this Worker for them.
//
// Secrets (Workers → this Worker → Settings → Variables and Secrets):
//   TURN_KEY_ID         the TURN key's ID          (Realtime → TURN Server)
//   TURN_KEY_API_TOKEN  the TURN key's API token
// Optional plain variable:
//   ALLOWED_ORIGINS     comma-separated origins allowed to fetch credentials
//                       (default: the GitHub Pages site + localhost for testing)

const DEFAULT_ORIGINS = 'https://infinitybiscuit.github.io,http://localhost:8000,http://localhost:8765';
const TTL_SECONDS = 4 * 60 * 60; // long enough for any match; Cloudflare allows up to 48h

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map((s) => s.trim());
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, cors);
    // Only hand credentials to the game itself (browsers always send Origin on
    // cross-site fetches, so this blocks other websites from using your quota).
    if (!allowed.includes(origin)) return json({ error: 'origin not allowed' }, 403, cors);
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) {
      return json({ error: 'relay not configured: add TURN_KEY_ID and TURN_KEY_API_TOKEN secrets' }, 500, cors);
    }

    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TTL_SECONDS }),
      },
    );
    if (!res.ok) return json({ error: `cloudflare returned ${res.status}` }, 502, cors);

    const { iceServers } = await res.json();
    // Browsers tend to time out on the port-53 alternates; drop them.
    const cleaned = (Array.isArray(iceServers) ? iceServers : [iceServers]).map((s) => ({
      ...s,
      urls: [].concat(s.urls).filter((u) => !/:53(\?|$)/.test(u)),
    })).filter((s) => s.urls.length);

    return json({ iceServers: cleaned }, 200, { ...cors, 'Cache-Control': 'no-store' });
  },
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
