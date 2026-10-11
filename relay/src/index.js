// Slop Wars online services — a Cloudflare Worker.
//
// 1. Matchmaking (/peerjs/…): a small PeerJS-compatible signalling server.
//    Phones register their room code here and swap the few messages WebRTC
//    needs to connect directly; after that, games don't touch it. Running our
//    own avoids the free public PeerJS server and its shared rate limits.
//    Connections live in one Durable Object (SQLite-backed, so it works on
//    the Workers Free plan) using the hibernation API, so idle sockets cost
//    nothing.
//
// 2. Relay credentials (/): when a network blocks direct connections (common
//    on mobile data), traffic goes through Cloudflare's TURN relay. That needs
//    short-lived credentials signed with your TURN key, which must stay
//    secret, so the game asks this Worker for them.
//
// Secrets (Workers → this Worker → Settings → Variables and Secrets):
//   TURN_KEY_ID         the TURN key's ID          (Realtime → TURN Server)
//   TURN_KEY_API_TOKEN  the TURN key's API token
// Optional plain variable:
//   ALLOWED_ORIGINS     comma-separated origins allowed to use the Worker
//                       (default: the GitHub Pages site + localhost for testing)

import { DurableObject } from 'cloudflare:workers';

const DEFAULT_ORIGINS = 'https://infinitybiscuit.github.io,http://localhost:8000,http://localhost:8765';
const TTL_SECONDS = 4 * 60 * 60; // long enough for any match; Cloudflare allows up to 48h
const PEERJS_KEY = 'peerjs';     // the PeerJS client's default API key
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
    // Only serve the game itself (browsers always send Origin on cross-site
    // fetches and WebSockets, so other websites can't use your quota).
    if (!allowed.includes(origin)) return json({ error: 'origin not allowed' }, 403, cors);

    // ── Matchmaking ──
    if (url.pathname === `/${PEERJS_KEY}/id`) {
      return new Response(crypto.randomUUID(), { headers: { ...cors, 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/peerjs') {
      if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected a WebSocket' }, 426, cors);
      const hub = env.MATCHMAKER.get(env.MATCHMAKER.idFromName('hub'));
      return hub.fetch(request);
    }

    // ── Relay credentials ──
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

// Every connected phone has one WebSocket here, tagged with its PeerJS ID.
// Messages addressed to an ID are passed to that socket with the sender
// added — the same protocol as the official PeerServer.
export class Matchmaker extends DurableObject {
  async fetch(request) {
    const params = new URL(request.url).searchParams;
    const id = params.get('id') || '';
    const token = params.get('token') || '';
    const [client, server] = Object.values(new WebSocketPair());

    let reply;
    if (params.get('key') !== PEERJS_KEY) reply = { type: 'INVALID-KEY', payload: { msg: 'Invalid key provided' } };
    else if (!ID_RE.test(id) || !token) reply = { type: 'ERROR', payload: { msg: 'No id, token, or key supplied to websocket server' } };
    else {
      const existing = this.ctx.getWebSockets(id);
      // A peer coming back with its own token replaces its old socket;
      // anyone else asking for a live ID is turned away.
      if (existing.some((ws) => ws.deserializeAttachment()?.token !== token)) reply = { type: 'ID-TAKEN', payload: { msg: 'ID is taken' } };
      else for (const ws of existing) closeQuietly(ws, 1000, 'Replaced by a new connection');
    }

    if (reply) {
      server.accept();
      server.send(JSON.stringify(reply));
      server.close(1008, reply.type);
    } else {
      this.ctx.acceptWebSocket(server, [id]);
      server.serializeAttachment({ id, token });
      server.send(JSON.stringify({ type: 'OPEN' }));
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > 64 * 1024) return;
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    const me = ws.deserializeAttachment();
    if (!me || !msg || msg.type === 'HEARTBEAT') return;
    if (!['OFFER', 'ANSWER', 'CANDIDATE', 'LEAVE', 'EXPIRE'].includes(msg.type) || typeof msg.dst !== 'string') return;
    const [dst] = this.ctx.getWebSockets(msg.dst);
    if (dst) {
      try { dst.send(JSON.stringify({ type: msg.type, src: me.id, dst: msg.dst, payload: msg.payload })); } catch { /* closing */ }
    } else if (msg.type === 'OFFER') {
      // Nobody's there (e.g. a wrong room code): the client reports "peer unavailable".
      ws.send(JSON.stringify({ type: 'EXPIRE', src: msg.dst, dst: me.id }));
    }
  }

  async webSocketClose(ws, code, reason) { closeQuietly(ws, code, reason); }
  async webSocketError(ws) { closeQuietly(ws, 1011, 'error'); }
}

function closeQuietly(ws, code, reason) {
  try { ws.close(code === 1005 || code === 1006 ? 1000 : code, reason); } catch { /* already closed */ }
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
