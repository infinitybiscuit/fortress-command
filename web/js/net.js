// Online play. One phone hosts and runs the simulation; up to three others
// join with a room code, send their orders as commands and render snapshots of
// the host's game. Phones connect peer-to-peer over WebRTC (PeerJS) in a star
// around the host; a matchmaking server only introduces the devices.
import { UNIT_TYPES, BUILDING_TYPES, RELAY_URL, MATCHMAKER_URL } from './config.js';
import { Game } from './game.js';
import { Unit, Building, deathEffect } from './entities.js';

const ID_PREFIX = 'slop-wars-v1-';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I/L mix-ups
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

// Add Cloudflare TURN relay servers when a relay Worker is configured, so
// phones that can't reach each other directly (e.g. on mobile data) still
// connect. Falls back to direct-only if the Worker can't be reached.
let relayCache = null;
async function iceConfig() {
  const params = new URLSearchParams(location.search);
  const relayUrl = params.get('relayUrl') || RELAY_URL;
  const relayOnly = params.get('relay') === 'only'; // testing: force the relay path
  let relay = [];
  if (relayUrl) {
    if (!relayCache || Date.now() - relayCache.at > 60 * 60 * 1000) {
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 5000);
        const res = await fetch(relayUrl, { signal: ctl.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (res.ok) relayCache = { at: Date.now(), servers: (await res.json()).iceServers || [] };
      } catch { /* relay unavailable — direct connections only */ }
    }
    relay = relayCache?.servers || [];
  }
  return {
    iceServers: [...ICE_SERVERS, ...relay],
    ...(relayOnly && relay.length ? { iceTransportPolicy: 'relay' } : {}),
  };
}

// Which matchmaking server to use: ours (MATCHMAKER_URL) if it answers,
// otherwise PeerJS's free public one. Both phones must pick the same, so a
// working choice is kept for the rest of the session. Testing overrides:
// ?broker=public, ?brokerUrl=http://localhost:8787/
let broker = null;
let brokerCheckedAt = 0;
async function brokerOptions() {
  const params = new URLSearchParams(location.search);
  if (params.get('broker') === 'public') return {};
  const base = params.get('brokerUrl') || MATCHMAKER_URL;
  if (!base) return {};
  if (broker && (broker.host || Date.now() - brokerCheckedAt < 30000)) return broker.opts;
  const url = new URL(base);
  let ok = false;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(new URL('peerjs/id', url), { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(timer);
    ok = res.ok;
  } catch { /* unreachable — use the public server */ }
  brokerCheckedAt = Date.now();
  const secure = url.protocol === 'https:';
  broker = ok
    ? { host: url.hostname, opts: { host: url.hostname, port: +url.port || (secure ? 443 : 80), path: url.pathname, secure, key: 'peerjs' } }
    : { host: null, opts: {} };
  return broker.opts;
}

// 'direct' or 'relay' once the connection is up (null if unknown).
export async function connectionRoute(transport) {
  const pc = transport.pc;
  if (!pc?.getStats) return null;
  try {
    const stats = await pc.getStats();
    let pair = null;
    stats.forEach((s) => { if (s.type === 'transport' && s.selectedCandidatePairId) pair = stats.get(s.selectedCandidatePairId); });
    if (!pair) stats.forEach((s) => { if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') pair = s; });
    if (!pair) return null;
    const local = stats.get(pair.localCandidateId);
    const remote = stats.get(pair.remoteCandidateId);
    return local?.candidateType === 'relay' || remote?.candidateType === 'relay' ? 'relay' : 'direct';
  } catch {
    return null;
  }
}

export const SNAPSHOT_INTERVAL = 1 / 12; // seconds between host → guest updates

export function makeRoomCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// ── Transports ─────────────────────────────────────────────────────────────
// Both expose { send(obj), close(), on('message' | 'close', fn) }.

class Emitter {
  constructor() { this.handlers = { message: [], close: [] }; }
  on(ev, fn) { this.handlers[ev].push(fn); }
  emit(ev, arg) { for (const fn of this.handlers[ev]) fn(arg); }
}

let peerLib = null;
function loadPeerJs() {
  if (peerLib) return peerLib;
  peerLib = new Promise((resolve, reject) => {
    if (window.Peer) { resolve(window.Peer); return; }
    const s = document.createElement('script');
    s.src = 'vendor/peerjs-1.5.4.min.js';
    s.onload = () => resolve(window.Peer);
    s.onerror = () => { peerLib = null; reject(new Error('Could not load the networking library. Check your connection.')); };
    document.head.appendChild(s);
  });
  return peerLib;
}

// Long messages are split into pieces of this many characters. Kept well under
// PeerJS's 16300-byte JSON limit, since quotes in the text grow when the piece
// is itself encoded as JSON.
const PIECE = 'piece';
const PIECE_SIZE = 6000;

// peer: the guest's own Peer, torn down with its only connection. The host's
// Peer outlives each guest's connection, so it passes null.
function wrapConnection(conn, peer) {
  const t = new Emitter();
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    t.emit('close');
  };
  // PeerJS's JSON channel refuses any message over ~16KB (and reports it as an
  // error), and a big battle's update plus the terrain is more than that. So
  // long messages go out in pieces and are joined up again on arrival.
  let nextId = 0;
  const pieces = new Map();
  conn.on('data', (d) => {
    if (d?.t !== PIECE) { t.emit('message', d); return; }
    const got = pieces.get(d.id) || [];
    got.push(d.d);
    if (got.length < d.n) { pieces.set(d.id, got); return; }
    pieces.delete(d.id);
    try { t.emit('message', JSON.parse(got.join(''))); } catch { /* garbled — skip it */ }
  });
  conn.on('close', close);
  // Errors such as an oversized message don't end the connection; a real drop
  // fires 'close', and the game's heartbeat catches anything else.
  conn.on('error', (e) => console.warn('connection error', e?.type || e));
  t.send = (obj) => {
    if (!conn.open) return;
    const text = JSON.stringify(obj);
    if (text.length <= PIECE_SIZE) { conn.send(obj); return; }
    const id = ++nextId;
    const n = Math.ceil(text.length / PIECE_SIZE);
    for (let i = 0; i < n; i++) conn.send({ t: PIECE, id, n, d: text.slice(i * PIECE_SIZE, (i + 1) * PIECE_SIZE) });
  };
  t.pc = conn.peerConnection;
  // Bytes queued but not yet sent: lets the host skip updates for a slow link.
  t.buffered = () => conn.dataChannel?.bufferedAmount ?? 0;
  t.close = () => {
    closed = true;
    try { conn.close(); } catch { /* already closed */ }
    if (peer) setTimeout(() => peer.destroy(), 300);
  };
  return t;
}

function friendlyPeerError(err) {
  switch (err?.type) {
    case 'peer-unavailable': return 'No game found with that code. Check it and try again.';
    case 'unavailable-id': return 'That room code is taken — try hosting again.';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed': return "Couldn't reach the matchmaking server. Check your internet connection.";
    case 'browser-incompatible': return "This browser doesn't support online play.";
    default: return err?.message || 'Connection failed.';
  }
}

// Same-browser transport over BroadcastChannel, for testing several tabs on
// one device (enable with ?net=local).
function localHost(code, onConnect) {
  const ch = new BroadcastChannel(`fc-${code}`);
  const guests = new Map(); // guest id → transport
  ch.onmessage = ({ data }) => {
    if (data.from !== 'g') return;
    const id = data.gid;
    let t = guests.get(id);
    if (data.knock) {
      if (t) return;
      t = new Emitter();
      let open = true;
      t.send = (d) => { if (open) ch.postMessage({ from: 'h', to: id, d }); };
      t.close = () => { if (open) ch.postMessage({ from: 'h', to: id, bye: true }); open = false; guests.delete(id); };
      guests.set(id, t);
      ch.postMessage({ from: 'h', to: id, welcome: true });
      onConnect(t);
    } else if (data.bye) { guests.delete(id); t?.emit('close'); } else if (t && 'd' in data) t.emit('message', data.d);
  };
  return {
    cancel: () => {
      for (const id of guests.keys()) ch.postMessage({ from: 'h', to: id, bye: true });
      ch.close();
    },
  };
}

function localJoin(code) {
  return new Promise((resolve, reject) => {
    const ch = new BroadcastChannel(`fc-${code}`);
    const gid = Math.random().toString(36).slice(2);
    const t = new Emitter();
    let open = true;
    t.send = (d) => { if (open) ch.postMessage({ from: 'g', gid, d }); };
    t.close = () => { if (!open) return; ch.postMessage({ from: 'g', gid, bye: true }); open = false; ch.close(); };
    const knock = setInterval(() => ch.postMessage({ from: 'g', gid, knock: true }), 200);
    const timeout = setTimeout(() => { clearInterval(knock); ch.close(); reject(new Error('No game found with that code. Check it and try again.')); }, 5000);
    ch.onmessage = ({ data }) => {
      if (data.from !== 'h' || data.to !== gid) return;
      if (data.welcome) { clearInterval(knock); clearTimeout(timeout); resolve(t); } else if (data.bye) { open = false; t.emit('close'); } else if ('d' in data) t.emit('message', data.d);
    };
    ch.postMessage({ from: 'g', gid, knock: true });
  });
}

const useLocal = () => new URLSearchParams(location.search).get('net') === 'local';

// Open a room. Resolves once the room is live; onConnect(transport) fires each
// time someone joins (the caller decides whether there's room for them).
// cancel() closes the room and every connection in it.
export async function hostRoom(code, onConnect) {
  if (useLocal()) return localHost(code, onConnect);
  const Peer = await loadPeerJs();
  const [config, server] = await Promise.all([iceConfig(), brokerOptions()]);
  return new Promise((resolve, reject) => {
    const peer = new Peer(ID_PREFIX + code, { ...server, config });
    let open = false;
    let closed = false;
    let retries = 0;
    let retryTimer = null;
    peer.on('open', () => {
      retries = 0;
      if (open) return; // back after a reconnect
      open = true;
      resolve({ cancel: () => { closed = true; clearTimeout(retryTimer); peer.destroy(); } });
    });
    peer.on('connection', (conn) => {
      conn.on('open', () => onConnect(wrapConnection(conn, null)));
    });
    // Stay reachable for late joiners if the matchmaking socket drops. A failed
    // reconnect reports another disconnect, so always wait (longer each time):
    // retrying instantly floods the free server, which then blocks this IP.
    peer.on('disconnected', () => {
      if (closed || peer.destroyed || retryTimer) return;
      const delay = Math.min(60000, 3000 * 2 ** retries++);
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (!closed && !peer.destroyed && peer.disconnected) peer.reconnect();
      }, delay);
    });
    peer.on('error', (err) => { if (!open) { peer.destroy(); reject(new Error(friendlyPeerError(err))); } });
  });
}

export async function joinRoom(code) {
  if (useLocal()) return localJoin(code);
  const Peer = await loadPeerJs();
  const [config, server] = await Promise.all([iceConfig(), brokerOptions()]);
  return new Promise((resolve, reject) => {
    const peer = new Peer({ ...server, config });
    let done = false;
    const fail = (msg) => { if (!done) { done = true; peer.destroy(); reject(new Error(msg)); } };
    const timer = setTimeout(() => fail("Couldn't connect. You may be on networks that block direct connections — try both phones on Wi-Fi."), 20000);
    peer.on('open', () => {
      const conn = peer.connect(ID_PREFIX + code, { reliable: true, serialization: 'json' });
      conn.on('open', () => { if (!done) { done = true; clearTimeout(timer); resolve(wrapConnection(conn, peer)); } });
    });
    peer.on('error', (err) => { clearTimeout(timer); fail(friendlyPeerError(err)); });
  });
}

// ── Snapshots (host → guest) ───────────────────────────────────────────────
const UNIT_KEYS = Object.keys(UNIT_TYPES);
const BUILD_KEYS = Object.keys(BUILDING_TYPES);
const SHOT_KINDS = ['bullet', 'shell', 'lob', 'bomb'];
const UI = Object.fromEntries(UNIT_KEYS.map((k, i) => [k, i]));
const BI = Object.fromEntries(BUILD_KEYS.map((k, i) => [k, i]));
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromBase64(str, out) {
  const s = atob(str);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
}

// The terrain only goes out when it changes (or to a player who has just
// (re)connected) — see encodeMap.
export function encodeSnapshot(game) {
  const snap = {
    t: 'snap',
    time: r1(game.time),
    pl: game.players.map((p) => [Math.floor(p.money), p.income, p.alive ? 1 : 0]),
    u: game.units.map((u) => [u.id, UI[u.type], u.faction, r1(u.x), r1(u.y), Math.ceil(u.hp), u.facing,
      u.flash > 0 ? 1 : 0, r2(u.cooldownTimer), r1(u.z)]),
    b: game.buildings.map((b) => [b.id, BI[b.type], b.faction, b.tx, b.ty, Math.ceil(b.hp), r2(b.progress),
      b.constructing ? 1 : 0, b.queue.map((t) => UI[t]), b.trainCurrent ? UI[b.trainCurrent] : -1,
      r2(b.trainTimer), b.trainTotal, b.flash > 0 ? 1 : 0, b.seg ? [b.seg.x1, b.seg.y1, b.seg.x2, b.seg.y2].map(r1) : 0, b.tz]),
    pr: game.projectiles.map((p) => [p.id, SHOT_KINDS.indexOf(p.kind), r1(p.x), r1(p.y), r2(p.angle),
      r2(p.exploded), p.splash, p.radius, r1(p.z || 0)]),
  };
  return snap;
}

export function encodeMap(game) { return toBase64(game.map.tiles); }

// The guest's copy of the game: same shape as Game so the renderer and UI
// work unchanged, but it never simulates — it eases toward the latest snapshot.
export function createMirror(mode) {
  const g = new Game(mode, {});
  g.units = [];
  g.buildings = [];
  g.projectiles = [];
  g.mirror = true;
  g.lastSnapshotAt = performance.now();
  g.update = (dt) => {
    const k = Math.min(1, dt * 14);
    for (const e of [...g.units, ...g.projectiles]) {
      if (e.nx == null) continue;
      e.x += (e.nx - e.x) * k;
      e.y += (e.ny - e.y) * k;
      e.z += (e.nz - e.z) * k;
    }
    for (const e of [...g.units, ...g.buildings]) if (e.flash > 0) e.flash -= dt;
  };
  return g;
}

export function applySnapshot(g, s) {
  g.time = s.time;
  g.lastSnapshotAt = performance.now();
  s.pl.forEach(([money, income, alive], i) => {
    if (!g.players[i]) return;
    Object.assign(g.players[i], { money, income, alive: !!alive });
  });

  const units = new Map(g.units.map((u) => [u.id, u]));
  const alive = new Set(s.u.map((r) => r[0]));
  for (const u of g.units) if (!alive.has(u.id)) g.effects.push(deathEffect(u));
  g.units = s.u.map(([id, ti, f, x, y, hp, facing, flash, cd, z = 0]) => {
    let u = units.get(id);
    if (!u) {
      u = new Unit(g, UNIT_KEYS[ti], x, y, f);
      u.id = id;
      u.z = z;
    }
    // Ease toward the new position; jump if it's far (e.g. just spawned).
    if (Math.hypot(u.x - x, u.y - y, u.z - z) > 160) { u.x = x; u.y = y; u.z = z; }
    Object.assign(u, { nx: x, ny: y, nz: z, hp, facing, cooldownTimer: cd });
    if (flash) u.flash = 0.15;
    return u;
  });

  const blds = new Map(g.buildings.map((b) => [b.id, b]));
  let changed = s.b.length !== g.buildings.length;
  g.buildings = s.b.map(([id, ti, f, tx, ty, hp, progress, constructing, queue, cur, timer, total, flash, seg, tz = 0]) => {
    let b = blds.get(id);
    if (!b) {
      b = new Building(g, BUILD_KEYS[ti], tx, ty, f, g.field ? tz : null);
      b.id = id;
      if (seg) b.setSeg({ x1: seg[0], y1: seg[1], x2: seg[2], y2: seg[3] });
      changed = true;
    }
    Object.assign(b, {
      hp, progress, constructing: !!constructing, queue: queue.map((q) => UNIT_KEYS[q]),
      trainCurrent: cur >= 0 ? UNIT_KEYS[cur] : null, trainTimer: timer, trainTotal: total,
    });
    if (flash) b.flash = 0.15;
    return b;
  });

  const shots = new Map(g.projectiles.map((p) => [p.id, p]));
  g.projectiles = s.pr.map(([id, kind, x, y, angle, exploded, splash, radius, z = 0]) => {
    const p = shots.get(id) || { id, x, y, z };
    return Object.assign(p, { kind: SHOT_KINDS[kind], nx: x, ny: y, nz: z, angle, exploded, splash, radius });
  });

  if (s.map) { fromBase64(s.map, g.map.tiles); changed = true; }
  if (changed) {
    // Rebuild footprint/wall bookkeeping so placement previews match the host.
    g.map.buildingTiles.clear();
    g.map.wallTiles.clear();
    g.map.ramps.clear();
    if (!g.field) for (const b of g.buildings) g.map.occupy(b);
  }
  g.players.forEach((p, i) => { p.hq = g.buildings.find((b) => b.type === 'hq' && b.faction === i) || null; });
}
