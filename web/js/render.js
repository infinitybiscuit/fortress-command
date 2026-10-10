// Pixel-art renderer (style homage to early-90s home-computer war games).
//
// The world is drawn into a low-resolution buffer where one "art pixel" is
// G world units. Every sprite is pre-rendered pixel art, and everything is
// placed on whole art pixels, so the image stays razor sharp when the buffer
// is scaled up by a whole number of screen pixels (see main.js).
import {
  TILE_SIZE, MAP_W, MAP_H, WORLD_W, WORLD_H, UNIT_H, PLAYER_COLORS, BUILDING_TYPES,
  TILE_EMPTY, TILE_GROUND, TILE_PLATFORM, TILE_BRIDGE, TILE_RAMP,
} from './config.js';

export const G = 2;              // world units per art pixel
const T = TILE_SIZE / G;         // tile size in art pixels (16)
const A = (v) => Math.round(v / G);

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  O: '#1b1a12',                       // outline
  skin: '#f2c08a', skinDark: '#c98f5a',
  boot: '#2a2418', gun: '#2b2b2b', gunLight: '#6a6a6a',
  yellow: '#f2c230', yellowDark: '#c99a1c', red: '#e8402a', redDark: '#a3261a', white: '#f4f8ff',
  sky: ['#4f9fe8', '#62acee', '#78bbf2', '#8fc9f5', '#a9d8f8'],
  cloud: '#f4f8ff', cloudShade: '#cbdcf0',
  hillFar: '#5f9e4c', hillNear: '#468a39',
  leaf: '#2f7a2a', leafLight: '#45a03a', leafDark: '#1f5a1d', trunk: '#6e4824', trunkDark: '#4e321a',
  grass: '#4cb83a', grassLight: '#86df4f', grassDark: '#2d7a24',
  dirt: '#9a6232', dirtMid: '#82502a', dirtDeep: '#663c1e', pebble: '#c09060', pebbleDark: '#55321a',
  rock: '#948466', rockLight: '#b4a482', rockDark: '#6a5c44',
  sand: '#d8bb7e', sandDark: '#a88a52', sandLight: '#ecd7a2',
  concrete: '#b7aa82', concreteLight: '#d4c8a0', concreteDark: '#857a5a',
  wood: '#9a6a3a', woodLight: '#be8a52', woodDark: '#6e4824',
  metal: '#7f8b8f', metalLight: '#a8b4b8', metalDark: '#4f5a5e',
  glass: '#8fd0f0', shadow: 'rgba(0,0,0,0.28)',
  olive: [0.36, 0.43, 0.2],
};

const hex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Per-team colours: helmets, flags and roofs in the team colour; uniforms are
// olive with a hint of it, so armies read as soldiers first, teams second.
const teamCache = [];
function team(f) {
  if (teamCache[f]) return teamCache[f];
  const c = PLAYER_COLORS[f % PLAYER_COLORS.length];
  const uni = mix(C.olive, c, 0.35);
  const roof = mix(c, [0.6, 0.55, 0.4], 0.25);
  teamCache[f] = {
    main: hex(c), light: hex(mix(c, [1, 1, 1], 0.4)), dark: hex(mix(c, [0, 0, 0], 0.35)),
    uni: hex(uni), uniDark: hex(mix(uni, [0, 0, 0], 0.35)), uniLight: hex(mix(uni, [1, 1, 1], 0.2)),
    roof: hex(roof), roofDark: hex(mix(roof, [0, 0, 0], 0.35)),
  };
  return teamCache[f];
}

// ── Sprite toolkit ─────────────────────────────────────────────────────────
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

// Draw parts as one silhouette with a 1px dark outline: an outline pass for
// every part first, then the fills, so only the outer edge is outlined.
// A part is [x, y, w, h, colour]; `details` are drawn on top without outline.
function outlined(g, parts, details = []) {
  g.fillStyle = C.O;
  for (const [x, y, w, h] of parts) g.fillRect(x - 1, y - 1, w + 2, h + 2);
  for (const [x, y, w, h, col] of parts) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  for (const [x, y, w, h, col] of details) { g.fillStyle = col; g.fillRect(x, y, w, h); }
}

function flip(src) {
  const [c, g] = canvas(src.width, src.height);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

const sprites = new Map();
// Cached sprite + its mirror. `build` returns { c, ax, ay } (anchor in art px).
function sprite(key, facing, build) {
  let s = sprites.get(key);
  if (!s) {
    const r = build();
    s = { right: r, left: { c: flip(r.c), ax: r.c.width - r.ax, ay: r.ay } };
    sprites.set(key, s);
  }
  return facing < 0 ? s.left : s.right;
}

function rect(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

// Filled pixel disc (no anti-aliasing).
function disc(ctx, cx, cy, r, col) {
  ctx.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

function hash(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// ── Soldiers ───────────────────────────────────────────────────────────────
function buildSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const heavy = type === 'heavy';
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  const torso = heavy ? [4, 8, 9, 4] : [5, 8, 7, 4];
  const parts = [
    ...legs.map((l) => [...l, t.uniDark]),
    ...boots.map((b) => [...b, C.boot]),
    [...torso, t.uni],
    [6, 3, 6, 5, C.skin], // big head
  ];
  const details = [
    [torso[0], 11, torso[2], 1, t.uniDark], // belt
    [10, 5, 1, 1, C.O],                    // eye
    [7, 7, 4, 1, C.skinDark],              // jaw shadow
    [9, 9, 3, 2, t.uniLight],              // arm
  ];
  // Weapon by role
  if (type === 'sniper') parts.push([10, 9, 9, 1, C.gun]);
  else if (type === 'engineer') {
    parts.push([11, 9, 4, 1, C.gunLight], [14, 8, 1, 3, C.gunLight]);
    details.push([torso[0], 10, torso[2], 1, C.yellow]);
  } else if (heavy) {
    parts.push([11, 9, 7, 2, C.gun]);
    details.push([5, 8, 6, 2, '#3b3b2a']);
  } else parts.push([11, 9, 6, 1, C.gun]);
  // Headgear by role
  if (type === 'scout') {
    parts.push([6, 2, 6, 2, t.main]);
    details.push([4, 3, 2, 1, t.main], [6, 2, 6, 1, t.light]);
  } else if (type === 'engineer') {
    parts.push([5, 1, 8, 3, C.yellow]);
    details.push([4, 3, 10, 1, C.yellowDark], [6, 1, 5, 1, '#ffe27a']);
  } else if (type === 'sniper') {
    parts.push([5, 1, 8, 3, '#4f6b2a']);
    details.push([4, 3, 10, 1, '#3c5420']);
  } else {
    parts.push([5, 1, 8, 3, t.main]);
    details.push([4, 3, 10, 1, t.dark], [6, 1, 5, 1, t.light]);
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── Vehicles & aircraft ────────────────────────────────────────────────────
function wheels(g, xs, y, r, frame) {
  for (const x of xs) {
    g.fillStyle = C.O; g.fillRect(x - 1, y - 1, r + 2, r + 2);
    g.fillStyle = '#262626'; g.fillRect(x, y, r, r);
    g.fillStyle = C.metal; g.fillRect(x + 1, y + 1, r - 2, r - 2);
    g.fillStyle = C.metalDark; g.fillRect(x + (frame ? 1 : r - 2), y + 1, 1, 1);
  }
}

function buildJeep(f, frame) {
  const t = team(f);
  const [c, g] = canvas(22, 13);
  outlined(g, [
    [2, 5, 17, 4, t.uni], [12, 4, 7, 2, t.uni], [8, 2, 2, 3, C.metalDark], [8, 1, 9, 1, C.gun],
  ], [
    [2, 5, 17, 1, t.uniLight], [2, 8, 17, 1, t.uniDark], [13, 3, 3, 1, C.glass], [18, 6, 1, 1, C.yellow],
    [4, 6, 2, 1, t.main],
  ]);
  wheels(g, [3, 14], 8, 4, frame);
  return { c, ax: 11, ay: 12 };
}

function buildTank(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 16);
  outlined(g, [
    [2, 9, 21, 5, '#2e2e2a'], [3, 6, 19, 4, t.uni], [8, 3, 9, 4, t.uni], [16, 4, 10, 2, C.gun],
  ], [
    [3, 6, 19, 1, t.uniLight], [8, 3, 9, 1, t.uniLight], [10, 4, 3, 1, t.main], [3, 9, 19, 1, t.uniDark],
  ]);
  // Road wheels, and track links that shift between frames
  for (let i = 0; i < 5; i++) { g.fillStyle = C.metal; g.fillRect(4 + i * 4, 11, 2, 2); }
  g.fillStyle = '#4a4a44';
  for (let x = 3 + frame * 2; x < 23; x += 4) g.fillRect(x, 13, 1, 1);
  return { c, ax: 12, ay: 15 };
}

function buildArtillery(f, frame) {
  const t = team(f);
  const [c, g] = canvas(26, 15);
  outlined(g, [
    [10, 6, 3, 1, C.gun], [12, 5, 3, 1, C.gun], [14, 4, 3, 1, C.gun], [16, 3, 3, 1, C.gun], [18, 2, 3, 1, C.gun], [20, 1, 3, 2, C.gun],
    [2, 7, 16, 4, t.uni], [8, 5, 6, 3, t.uniDark],
  ], [
    [2, 7, 16, 1, t.uniLight], [4, 8, 2, 1, t.main],
  ]);
  g.fillStyle = C.metalDark; g.fillRect(0, 10, 3, 1); g.fillRect(0, 11, 2, 2);
  wheels(g, [3, 12], 10, 4, frame);
  return { c, ax: 11, ay: 14 };
}

function buildHeli(f) {
  const t = team(f);
  const [c, g] = canvas(26, 13);
  outlined(g, [
    [1, 5, 10, 2, t.uniDark], [1, 3, 2, 3, t.uniDark], [10, 4, 11, 6, t.uni], [12, 11, 9, 1, C.metalDark], [15, 2, 1, 2, C.metalDark],
  ], [
    [10, 4, 11, 1, t.uniLight], [17, 5, 3, 2, C.glass], [12, 7, 3, 1, t.main], [14, 10, 1, 1, C.metalDark], [19, 10, 1, 1, C.metalDark],
    [19, 8, 4, 1, C.gun],
  ]);
  return { c, ax: 13, ay: 12 };
}

function buildBomber(f) {
  const t = team(f);
  const [c, g] = canvas(34, 13);
  outlined(g, [
    [1, 1, 5, 5, t.uniDark], [1, 5, 29, 4, t.uni], [30, 6, 2, 2, t.uniDark], [12, 8, 11, 3, t.uniDark], [17, 8, 4, 2, C.metalDark],
  ], [
    [2, 5, 27, 1, t.uniLight], [26, 6, 3, 1, C.glass], [8, 6, 3, 2, t.main], [12, 8, 11, 1, t.uni],
  ]);
  return { c, ax: 17, ay: 11 };
}

const VEHICLE_BUILD = { jeep: buildJeep, tank: buildTank, artillery: buildArtillery };

// ── Buildings ──────────────────────────────────────────────────────────────
function sandbags(g, x, y, w, rows = 2) {
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? 3 : 0;
    for (let bx = x - off; bx < x + w; bx += 6) {
      const by = y - (r + 1) * 3;
      const x0 = Math.max(x, bx);
      const ww = Math.min(bx + 6, x + w) - x0;
      if (ww <= 1) continue;
      g.fillStyle = C.O; g.fillRect(x0, by, ww, 3);
      g.fillStyle = C.sand; g.fillRect(x0 + 1, by, ww - 2, 2);
      g.fillStyle = C.sandLight; g.fillRect(x0 + 1, by, ww - 3, 1);
    }
  }
}

function camo(g, x, y, w, h, t, seed) {
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? t.dark : '#6b6a3c';
    g.fillRect(x + Math.floor(hash(seed + i) * (w - 6)), y + Math.floor(hash(seed + i + 9) * (h - 3)), 4 + Math.floor(hash(seed + i + 3) * 5), 2);
  }
}

const BUILD = {
  hq(g, t) {
    // Sandbagged command bunker with radio mast and team flag
    outlined(g, [
      [4, 16, 56, 26, C.concrete], [2, 12, 60, 5, t.roof], [52, 0, 1, 12, C.metalDark], [9, 0, 1, 12, C.woodDark],
      [10, 1, 9, 5, t.main], [26, 8, 12, 4, C.concreteDark],
    ], [
      [4, 16, 56, 1, C.concreteLight], [2, 12, 60, 1, t.light], [2, 16, 60, 1, t.roofDark],
      [10, 1, 9, 1, t.light], [10, 4, 9, 1, t.dark], [49, 3, 7, 1, C.metalDark], [50, 6, 5, 1, C.metalDark],
      [28, 9, 8, 2, C.yellow],
    ]);
    camo(g, 6, 18, 52, 20, t, 11);
    outlined(g, [], [
      [10, 22, 12, 3, C.O], [42, 22, 12, 3, C.O], [11, 23, 10, 1, '#3b3a2a'], [43, 23, 10, 1, '#3b3a2a'],
      [27, 28, 10, 14, C.O], [28, 29, 8, 13, '#3a3326'], [34, 35, 1, 1, C.yellow],
    ]);
    sandbags(g, 0, 48, 64, 2);
  },
  barracks(g, t) {
    // Corrugated army hut
    outlined(g, [
      [3, 12, 42, 20, t.roof], [7, 8, 34, 5, t.roof], [13, 5, 22, 4, t.roof],
    ], [
      [7, 8, 34, 1, t.light], [13, 5, 22, 1, t.light], [3, 12, 4, 1, t.light], [41, 12, 4, 1, t.light],
    ]);
    g.fillStyle = t.roofDark;
    for (let x = 5; x < 45; x += 4) g.fillRect(x, 13, 1, 18);
    outlined(g, [[20, 20, 8, 12, '#3a3326']], [
      [25, 26, 1, 1, C.yellow], [7, 17, 7, 4, C.O], [34, 17, 7, 4, C.O], [8, 18, 5, 2, C.glass], [35, 18, 5, 2, C.glass],
    ]);
    sandbags(g, 0, 32, 18, 1);
    sandbags(g, 30, 32, 18, 1);
  },
  turret(g, t) {
    // Sandbag gun nest with a shielded gun
    outlined(g, [
      [8, 10, 14, 10, C.metal], [21, 13, 11, 2, C.gun], [11, 7, 8, 4, C.metalDark],
    ], [
      [8, 10, 14, 1, C.metalLight], [9, 14, 12, 2, t.main], [12, 8, 4, 1, C.metalLight], [30, 13, 2, 1, C.gunLight],
    ]);
    sandbags(g, 1, 32, 30, 4);
  },
  wall(g, t) {
    // Sandbag wall topped with barbed wire
    sandbags(g, 0, 32, 16, 9);
    g.fillStyle = C.woodDark; g.fillRect(2, 2, 1, 4); g.fillRect(13, 2, 1, 4);
    g.fillStyle = C.metalDark;
    for (let x = 0; x < 16; x++) g.fillRect(x, 2 + ((x % 4) < 2 ? 0 : 1), 1, 1);
    g.fillStyle = t.main; g.fillRect(6, 25, 4, 2);
  },
  mine(g, t) {
    // Wooden pithead (wheel animated live), mine entrance and ore cart
    outlined(g, [
      [6, 10, 2, 22, C.wood], [24, 10, 2, 22, C.wood], [6, 9, 20, 2, C.wood], [10, 20, 12, 12, C.woodDark],
    ], [
      [11, 21, 10, 11, '#241a10'], [6, 9, 20, 1, C.woodLight], [27, 4, 4, 3, t.main], [26, 4, 1, 10, C.woodDark],
    ]);
    outlined(g, [[22, 26, 9, 4, C.metal]], [[23, 25, 2, 1, C.yellow], [26, 25, 3, 1, C.yellow], [22, 26, 9, 1, C.metalLight]]);
    g.fillStyle = C.O; g.fillRect(23, 30, 2, 2); g.fillRect(28, 30, 2, 2);
  },
  workshop(g, t) {
    // Garage with sawtooth roof, roller door and oil drums
    outlined(g, [
      [2, 10, 44, 22, C.concrete], [2, 6, 14, 5, t.roof], [16, 6, 14, 5, t.roof], [30, 6, 14, 5, t.roof], [37, 0, 5, 7, C.metalDark],
    ], [
      [2, 10, 44, 1, C.concreteLight], [2, 6, 3, 1, t.light], [16, 6, 3, 1, t.light], [30, 6, 3, 1, t.light],
      [14, 15, 20, 17, C.O], [15, 16, 18, 16, C.metal], [36, 0, 7, 1, C.metal],
    ]);
    g.fillStyle = C.metalDark;
    for (let y = 18; y < 32; y += 3) g.fillRect(15, y, 18, 1);
    g.fillStyle = C.yellow; g.fillRect(15, 16, 18, 1);
    outlined(g, [[4, 24, 4, 7, C.red], [9, 24, 4, 7, t.main]], [[4, 26, 4, 1, C.redDark], [9, 26, 4, 1, t.dark]]);
  },
  airbase(g, t) {
    // Arched hangar, control tower, windsock and apron
    outlined(g, [
      [2, 12, 40, 18, t.roof], [6, 8, 32, 5, t.roof], [12, 5, 20, 4, t.roof], [48, 8, 6, 22, C.concrete], [45, 2, 12, 7, C.concreteDark],
      [60, 12, 1, 18, C.woodDark],
    ], [
      [6, 8, 32, 1, t.light], [12, 5, 20, 1, t.light], [10, 16, 24, 14, '#2a2620'],
      [46, 3, 10, 4, C.glass], [48, 8, 6, 1, C.concreteLight], [61, 12, 2, 2, '#f28a30'], [63, 12, 1, 2, C.white],
    ]);
    g.fillStyle = t.roofDark;
    for (let x = 4; x < 42; x += 4) if (x < 10 || x > 33) g.fillRect(x, 13, 1, 16);
    g.fillStyle = '#3a3a34'; g.fillRect(0, 30, 64, 2);
    g.fillStyle = C.yellow;
    for (let x = 2; x < 64; x += 8) g.fillRect(x, 30, 4, 1);
  },
  bridge(g, t) {
    outlined(g, [[1, 1, 14, 4, C.wood], [2, 5, 2, 10, C.woodDark], [12, 5, 2, 10, C.woodDark]], [[1, 1, 14, 1, C.woodLight], [13, 2, 2, 2, t.main]]);
    g.fillStyle = C.wood; g.fillRect(0, 1, 16, 4);
    g.fillStyle = C.woodLight; g.fillRect(0, 1, 16, 1);
    g.fillStyle = C.woodDark;
    for (let x = 3; x < 16; x += 4) g.fillRect(x, 2, 1, 3);
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 1); g.fillRect(0, 5, 16, 1);
  },
  ramp(g, t) {
    g.fillStyle = C.wood; g.fillRect(0, 0, 16, 16);
    g.fillStyle = C.woodLight; g.fillRect(1, 1, 14, 1);
    g.fillStyle = C.woodDark;
    g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    for (let i = 2; i < 14; i++) { g.fillRect(i, i, 1, 1); g.fillRect(15 - i, i, 1, 1); }
    g.fillStyle = t.main; g.fillRect(2, 2, 3, 2);
  },
};

function buildingSprite(b) {
  return sprite(`b:${b.type}:${b.faction}`, 1, () => {
    const [c, g] = canvas(b.wt * T, b.ht * T);
    BUILD[b.type](g, team(b.faction));
    return { c, ax: 0, ay: 0 };
  });
}

// ── Terrain tiles ──────────────────────────────────────────────────────────
const tiles = {};
function tile(kind, variant) {
  const key = `${kind}${variant}`;
  if (tiles[key]) return tiles[key];
  const [c, g] = canvas(T, T);
  const seed = variant * 97 + kind.length * 13;
  const speckle = (n, a, b, y0 = 0) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = hash(seed + i + 40) < 0.5 ? a : b;
      g.fillRect(Math.floor(hash(seed + i) * (T - 2)), y0 + Math.floor(hash(seed + i + 20) * (T - y0 - 1)), 2, 1);
    }
  };
  const grassTop = () => {
    g.fillStyle = C.grass; g.fillRect(0, 0, T, 4);
    g.fillStyle = C.grassLight; g.fillRect(0, 0, T, 1);
    g.fillStyle = C.grassDark; g.fillRect(0, 4, T, 1);
    for (let x = 0; x < T; x += 3) if (hash(seed + x) < 0.6) g.fillRect(x, 5, 1, 1);
  };
  if (kind.startsWith('dirt')) {
    g.fillStyle = kind === 'dirtDeep' ? C.dirtDeep : kind === 'dirtMid' ? C.dirtMid : C.dirt;
    g.fillRect(0, 0, T, T);
    speckle(6, C.pebble, C.pebbleDark, kind === 'dirtTop' ? 5 : 0);
    if (kind === 'dirtTop') grassTop();
  } else {
    // Floating rock ledge with a grass top; L/R variants round off the ends.
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.rock; g.fillRect(0, 0, T, T);
    g.fillStyle = C.rockDark; g.fillRect(0, T - 4, T, 3);
    speckle(4, C.rockLight, C.rockDark, 6);
    grassTop();
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
  tiles[key] = c;
  return c;
}

export function drawTerrain(ctx, map, view) {
  const l = Math.floor(view.x / TILE_SIZE) - 1;
  const r = Math.ceil((view.x + view.w) / TILE_SIZE) + 1;
  const t0 = Math.max(0, Math.floor(view.y / TILE_SIZE));
  const t1 = Math.min(MAP_H, Math.ceil((view.y + view.h) / TILE_SIZE) + 1);
  const from = map.wrap ? l : Math.max(0, l);
  const to = map.wrap ? r : Math.min(MAP_W, r);
  for (let tx = from; tx < to; tx++) {
    const col = ((tx % MAP_W) + MAP_W) % MAP_W;
    for (let ty = t0; ty < t1; ty++) {
      const k = map.get(tx, ty);
      if (k === TILE_EMPTY || k === TILE_RAMP || k === TILE_BRIDGE) continue;
      const x = tx * T;
      const y = ty * T;
      const v = Math.floor(hash(col * 31 + ty) * 4);
      const surface = map.get(tx, ty - 1) === TILE_EMPTY;
      let img;
      if (k === TILE_GROUND) {
        const depth = ty - map.groundTop;
        img = surface ? tile('dirtTop', v) : tile(depth >= 2 ? 'dirtDeep' : depth === 1 ? 'dirtMid' : 'dirt', v);
      } else {
        const L = map.get(tx - 1, ty) !== TILE_PLATFORM;
        const R = map.get(tx + 1, ty) !== TILE_PLATFORM;
        img = tile(L && R ? 'rockLR' : L ? 'rockL' : R ? 'rockR' : 'rock', v);
      }
      ctx.drawImage(img, x, y);
      if (surface) {
        // Grass tufts and the odd red flower poking up above the surface
        const h = hash(col * 7 + ty * 3);
        ctx.fillStyle = C.grass;
        ctx.fillRect(x + Math.floor(h * 12), y - 2, 1, 2);
        ctx.fillRect(x + Math.floor(h * 12) + 2, y - 1, 1, 1);
        if (k === TILE_GROUND && h > 0.88) {
          ctx.fillStyle = C.red; ctx.fillRect(x + 8, y - 3, 2, 2);
          ctx.fillStyle = C.grassDark; ctx.fillRect(x + 8, y - 1, 1, 1);
        }
      }
    }
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};
function cloudSprite(k) {
  const key = `cloud${k}`;
  if (scenery[key]) return scenery[key];
  const w = 18 + Math.floor(hash(k + 5) * 16);
  const [c, g] = canvas(w + 2, 10);
  g.fillStyle = C.cloudShade; g.fillRect(1, 5, w, 4);
  g.fillStyle = C.cloud; g.fillRect(3, 3, w - 4, 4); g.fillRect(Math.floor(w * 0.3), 0, Math.floor(w * 0.35), 4);
  scenery[key] = c;
  return c;
}

function treeSprite(k) {
  const key = `tree${k}`;
  if (scenery[key]) return scenery[key];
  const palm = hash(k + 7) < 0.5;
  const th = 18 + Math.floor(hash(k + 3) * 20);
  const [c, g] = canvas(30, th + 12);
  const cx = 15;
  g.fillStyle = C.trunkDark; g.fillRect(cx - 1, 10, 3, th + 2);
  g.fillStyle = C.trunk; g.fillRect(cx - 1, 10, 2, th + 2);
  if (palm) {
    for (const [dx, dy, w] of [[-11, 4, 10], [2, 4, 10], [-7, 1, 14], [-12, 7, 4], [9, 7, 4], [-2, 0, 5]]) {
      g.fillStyle = C.leafDark; g.fillRect(cx + dx, dy + 1, w, 2);
      g.fillStyle = C.leaf; g.fillRect(cx + dx, dy, w, 2);
    }
    g.fillStyle = C.leafLight; g.fillRect(cx - 6, 1, 6, 1);
  } else {
    const r = 9 + Math.floor(hash(k + 9) * 4);
    disc(g, cx, 8, r, C.leafDark);
    disc(g, cx - 1, 7, r - 2, C.leaf);
    g.fillStyle = C.leafLight; g.fillRect(cx - 4, 2, 5, 2);
  }
  scenery[key] = c;
  return c;
}

export function drawBackground(ctx, bw, bh, camAX, camAY) {
  const groundY = (WORLD_H - 3 * TILE_SIZE) / G - camAY;
  const bands = C.sky.length;
  for (let i = 0; i < bands; i++) {
    const y0 = Math.floor((groundY * i) / bands);
    rect(ctx, 0, y0, bw, Math.ceil(groundY / bands) + 1, C.sky[i]);
  }
  rect(ctx, 0, groundY, bw, bh, C.sky[bands - 1]);

  // Clouds
  const cPer = ((WORLD_W / G) * 0.15) / 8;
  const cOff = Math.round(camAX * 0.15);
  for (let i = Math.floor(cOff / cPer) - 1; i * cPer - cOff < bw + 40; i++) {
    const k = ((i % 8) + 8) % 8;
    ctx.drawImage(cloudSprite(k), Math.round(i * cPer - cOff + hash(k) * 30), Math.round(10 + hash(k + 11) * 36 - camAY * 0.1));
  }

  // Hills: columns of flat colour
  const hills = (p, col, amp, base, periods) => {
    const per = ((WORLD_W / G) * p) / periods;
    const off = Math.round(camAX * p);
    ctx.fillStyle = col;
    for (let x = 0; x < bw; x += 2) {
      const tt = ((x + off) / per) * Math.PI * 2;
      const hh = Math.round(amp * (0.55 + 0.3 * Math.sin(tt) + 0.15 * Math.sin(tt * 3 + 1.3)));
      ctx.fillRect(x, groundY - base - hh, 2, base + hh + 2);
    }
  };
  hills(0.25, C.hillFar, 45, 15, 5);
  hills(0.4, C.hillNear, 30, 5, 8);

  // Jungle treeline
  const count = 64;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    const img = treeSprite(k);
    ctx.drawImage(img, Math.round(i * spacing - jOff + hash(k) * spacing * 0.6) - 15, groundY - img.height + 2);
  }
}

// ── Units ──────────────────────────────────────────────────────────────────
export function drawUnit(ctx, u) {
  const x = A(u.x);
  const y = A(u.y);
  const frame = Math.floor(u.x / 6) & 1;
  let s;
  if (u.air) {
    s = sprite(`a:${u.type}:${u.faction}`, u.facing, () => (u.type === 'bomber' ? buildBomber : buildHeli)(u.faction));
    drawAirShadow(ctx, u);
  } else if (u.vehicle) {
    s = sprite(`v:${u.type}:${u.faction}:${frame}`, u.facing, () => VEHICLE_BUILD[u.type](u.faction, frame));
    rect(ctx, x - Math.floor(s.c.width / 2) + 1, y, s.c.width - 2, 1, C.shadow);
  } else {
    s = sprite(`s:${u.type}:${u.faction}:${frame}`, u.facing, () => buildSoldier(u.type, u.faction, frame));
    rect(ctx, x - 5, y, 10, 1, C.shadow);
  }
  ctx.drawImage(s.c, x - s.ax, y - s.ay);
  if (u.air) drawRotor(ctx, u, x, y);
  if (u.flash > 0) flashSprite(ctx, s.c, x - s.ax, y - s.ay);
  const w = Math.min(s.c.width, 16);
  const top = y - s.ay;
  if (u.selected) brackets(ctx, x - s.ax - 1, top - 1, s.c.width + 2, s.c.height + 2);
  if (u.hp < u.maxHp || u.selected) hpBar(ctx, x - Math.floor(w / 2), top - 4, w, u.hp / u.maxHp);
}

// Hit flash: redraw the sprite brightened.
function flashSprite(ctx, img, x, y) {
  ctx.globalAlpha = 0.6;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(img, x, y);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

function drawAirShadow(ctx, u) {
  const map = u.game.map;
  const tx = Math.floor(u.x / TILE_SIZE);
  let gy = Math.floor(u.y / TILE_SIZE);
  while (gy < MAP_H && !map.isSolid(tx, gy)) gy++;
  const sy = A(gy * TILE_SIZE);
  ctx.globalAlpha = Math.max(0.12, 0.3 - (sy - A(u.y)) / 400);
  rect(ctx, A(u.x) - 8, sy, 16, 1, '#000');
  ctx.globalAlpha = 1;
}

function drawRotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 50);
  if (u.type === 'helicopter') {
    const half = tick % 2 ? 12 : 5;
    rect(ctx, x + 2 * u.facing - half, y - 12, half * 2, 1, '#e8e8e8');
    rect(ctx, x - 13 * u.facing - (u.facing > 0 ? 0 : 1), y - 9 + (tick % 2 ? -1 : 1), 1, 2, '#d8d8d8');
  } else {
    const fx = x + (u.facing > 0 ? 4 : -5);
    rect(ctx, fx, y - 5 - (tick % 2 ? 2 : 0), 1, tick % 2 ? 5 : 2, '#d8d8d8');
  }
}

function brackets(ctx, x, y, w, h) {
  ctx.fillStyle = C.white;
  const l = 3;
  ctx.fillRect(x, y, l, 1); ctx.fillRect(x, y, 1, l);
  ctx.fillRect(x + w - l, y, l, 1); ctx.fillRect(x + w - 1, y, 1, l);
  ctx.fillRect(x, y + h - 1, l, 1); ctx.fillRect(x, y + h - l, 1, l);
  ctx.fillRect(x + w - l, y + h - 1, l, 1); ctx.fillRect(x + w - 1, y + h - l, 1, l);
}

function hpBar(ctx, x, y, w, ratio) {
  rect(ctx, x - 1, y - 1, w + 2, 3, C.O);
  rect(ctx, x, y, Math.max(1, Math.round(w * ratio)), 1, ratio > 0.5 ? '#5ee03a' : ratio > 0.25 ? C.yellow : C.red);
}

// ── Buildings ──────────────────────────────────────────────────────────────
export function drawBuilding(ctx, b) {
  const s = buildingSprite(b);
  const x = A(b.x);
  const y = A(b.y);
  const w = s.c.width;
  const h = s.c.height;
  if (b.constructing) {
    // Rises from the ground behind wooden scaffolding and hazard tape
    ctx.globalAlpha = 0.35;
    ctx.drawImage(s.c, x, y);
    ctx.globalAlpha = 1;
    const built = Math.round(h * b.progress);
    if (built > 0) ctx.drawImage(s.c, 0, h - built, w, built, x, y + h - built, w, built);
    ctx.fillStyle = C.woodDark;
    for (let sx = x + 1; sx < x + w; sx += 8) ctx.fillRect(sx, y, 1, h);
    for (let sy = y + 3; sy < y + h; sy += 8) ctx.fillRect(x, sy, w, 1);
    for (let i = 0; i < w; i++) { ctx.fillStyle = Math.floor(i / 3) % 2 ? C.O : C.yellow; ctx.fillRect(x + i, y + h - 3, 1, 2); }
    progressBar(ctx, x, y + h + 2, w, b.progress, C.yellow);
  } else {
    ctx.drawImage(s.c, x, y);
    animateBuilding(ctx, b, x, y, w);
  }
  if (b.trainCurrent) progressBar(ctx, x, y + h + 2, w, 1 - b.trainTimer / b.trainTotal, '#5ee03a');
  if (b.flash > 0) flashSprite(ctx, s.c, x, y);
  // Damage: smoke, then fire
  const r = b.hp / b.maxHp;
  if (r < 0.5 && b.type !== 'bridge' && b.type !== 'ramp') {
    const tt = performance.now() / 1000;
    for (let i = 0; i < 3; i++) {
      const k = (tt * 0.6 + i / 3) % 1;
      const sz = 2 + Math.round(k * 3);
      ctx.globalAlpha = 0.7 * (1 - k);
      rect(ctx, x + Math.floor(w * (0.3 + 0.2 * i)) + Math.round(Math.sin(tt * 2 + i) * 2), y + 2 - Math.round(k * 16), sz, sz, '#4a4740');
      ctx.globalAlpha = 1;
    }
    if (r < 0.25) {
      const fl = Math.floor(tt * 10) % 2;
      rect(ctx, x + Math.floor(w * 0.4), y + 1 - fl, 3, 2 + fl, '#f28a30');
      rect(ctx, x + Math.floor(w * 0.4) + 1, y - fl, 1, 1, C.yellow);
    }
  }
  if (b.selected) brackets(ctx, x - 2, y - 2, w + 4, h + 4);
  if (b.hp < b.maxHp) hpBar(ctx, x, y - 4, w, r);
}

function progressBar(ctx, x, y, w, ratio, col) {
  rect(ctx, x - 1, y - 1, w + 2, 4, C.O);
  rect(ctx, x, y, Math.round(w * Math.max(0, Math.min(1, ratio))), 2, col);
}

function animateBuilding(ctx, b, x, y, w) {
  const tick = Math.floor(performance.now() / 160);
  if (b.type === 'hq') {
    // Flag flutter
    rect(ctx, x + 19, y + 1 + (tick % 2), 1, 4, team(b.faction).main);
  } else if (b.type === 'mine') {
    // Spinning pithead wheel
    const cx = x + 16;
    const cy = y + 5;
    ctx.fillStyle = C.O;
    for (let a = 0; a < 16; a++) ctx.fillRect(cx + Math.round(Math.cos((a / 16) * Math.PI * 2) * 5), cy + Math.round(Math.sin((a / 16) * Math.PI * 2) * 5), 1, 1);
    ctx.fillStyle = C.metalLight;
    const ang = tick * 0.4;
    for (let r = 1; r < 5; r++) {
      ctx.fillRect(cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), 1, 1);
      ctx.fillRect(cx - Math.round(Math.cos(ang) * r), cy - Math.round(Math.sin(ang) * r), 1, 1);
    }
  } else if (b.type === 'workshop') {
    // Chimney smoke
    for (let i = 0; i < 2; i++) {
      const k = (performance.now() / 1500 + i / 2) % 1;
      ctx.globalAlpha = 0.6 * (1 - k);
      rect(ctx, x + 38 + Math.round(Math.sin(k * 6) * 2), y - 2 - Math.round(k * 12), 3, 3, '#6b675d');
      ctx.globalAlpha = 1;
    }
  } else if (b.type === 'airbase') {
    if (tick % 4 < 2) rect(ctx, x + 50, y + 1, 2, 1, C.red); // tower beacon
  }
  void w;
}

// ── Projectiles ────────────────────────────────────────────────────────────
export function drawProjectile(ctx, p) {
  const x = A(p.x);
  const y = A(p.y);
  if (p.exploded > 0) {
    // Pixel explosion: hot core, orange body, red rim, then smoke
    const k = 1 - p.exploded / 0.3;
    const r = Math.max(2, Math.round((p.splash / G) * (0.35 + 0.5 * k)));
    disc(ctx, x, y - 1, r, k < 0.6 ? C.red : '#5a5148');
    disc(ctx, x, y - 1, Math.max(1, r - 2), k < 0.6 ? '#f28a30' : '#7a7266');
    if (k < 0.5) disc(ctx, x, y - 1, Math.max(1, r - 4), C.yellow);
    return;
  }
  const dx = Math.round(Math.cos(p.angle) * 3);
  const dy = Math.round(Math.sin(p.angle) * 3);
  if (p.kind === 'bullet') {
    rect(ctx, x - dx, y - dy, 1, 1, '#f2a630');
    rect(ctx, x, y, 2, 1, '#fff6a0');
  } else if (p.kind === 'bomb') {
    rect(ctx, x - 1, y - 2, 3, 4, C.O);
    rect(ctx, x - 1, y - 3, 3, 1, C.metalDark);
  } else {
    rect(ctx, x - dx, y - dy, 1, 1, 'rgba(200,200,200,0.7)');
    rect(ctx, x - 1, y - 1, 2, 2, C.O);
    rect(ctx, x - 1, y - 1, 1, 1, '#f28a30');
  }
}

// ── Effects (visual only) ──────────────────────────────────────────────────
export function updateEffects(effects, dt) {
  for (const e of effects) e.t += dt;
  return effects.filter((e) => e.t < e.life);
}

export function drawEffects(ctx, effects) {
  for (const e of effects) {
    const x = A(e.x);
    const y = A(e.y);
    const fade = Math.max(0, Math.min(1, (e.life - e.t) / 1.2));
    ctx.globalAlpha = fade;
    if (e.kind === 'fall') {
      const s = sprite(`dead:${e.f}`, e.facing, () => {
        const t = team(e.f);
        const [c, g] = canvas(14, 6);
        outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, t.uni], [11, 3, 2, 2, C.boot]], [[0, 1, 3, 2, t.main]]);
        return { c, ax: 7, ay: 5 };
      });
      rect(ctx, x - 5, y - 1, 9, 1, C.redDark);
      rect(ctx, x - 3, y - 1, 5, 1, C.red);
      ctx.drawImage(s.c, x - s.ax, y - s.ay);
    } else if (e.kind === 'wreck') {
      ctx.fillStyle = C.O; ctx.fillRect(x - 9, y - 5, 18, 5); ctx.fillRect(x - 6, y - 7, 10, 3);
      ctx.fillStyle = '#2c2924'; ctx.fillRect(x - 8, y - 4, 16, 4);
      ctx.fillStyle = '#3a3630'; ctx.fillRect(x - 5, y - 6, 8, 2);
      if (e.t < 0.35) disc(ctx, x, y - 4, Math.round(10 * (1 - e.t / 0.35)) + 2, '#f28a30');
      for (let i = 0; i < 4; i++) {
        const k = (e.t * 0.7 + i * 0.25) % 1;
        const sz = 2 + Math.round(k * 4);
        ctx.globalAlpha = Math.min(fade, 0.65 * (1 - k));
        rect(ctx, x - 2 + Math.round(Math.sin(i * 2 + e.t) * 3), y - 7 - Math.round(k * 24), sz, sz, '#4a4740');
      }
      ctx.globalAlpha = fade;
      if (Math.floor(e.t * 10) % 2 && e.t < 3) rect(ctx, x - 1, y - 7, 2, 2, '#f28a30');
    } else if (e.kind === 'debris') {
      for (const p of e.parts) {
        rect(ctx, x + Math.round((p.vx * e.t) / G), y + Math.round((p.vy * e.t + 450 * e.t * e.t) / G), 2, 2, p.c);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ── Placement overlays & markers ───────────────────────────────────────────
// Dim everything outside the build zone and mark its edges (zones in tiles).
export function drawBuildZones(ctx, zones, view) {
  const top = A(view.y) - 1;
  const h = A(view.h) + 3;
  let x = A(view.x) - 1;
  const right = A(view.x + view.w) + 2;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (const [from, to] of zones) {
    const z0 = from * T;
    const z1 = to * T;
    if (z0 > x) ctx.fillRect(x, top, Math.min(z0, right) - x, h);
    x = Math.max(x, z1);
  }
  if (x < right) ctx.fillRect(x, top, right - x, h);
  ctx.fillStyle = '#5ee03a';
  for (const [from, to] of zones) {
    for (const ex of [from * T, to * T - 1]) {
      for (let yy = top; yy < top + h; yy += 6) ctx.fillRect(ex, yy, 1, 3);
    }
  }
}

export function drawGhost(ctx, pl) {
  const x = pl.tx * T;
  const y = pl.ty * T;
  const w = pl.w * T;
  const h = pl.h * T;
  const col = pl.valid ? '#5ee03a' : C.red;
  ctx.globalAlpha = 0.25;
  rect(ctx, x, y, w, h, col);
  ctx.globalAlpha = 1;
  ctx.fillStyle = col;
  for (let i = 0; i < w; i += 4) { ctx.fillRect(x + i, y, 2, 1); ctx.fillRect(x + i, y + h - 1, 2, 1); }
  for (let i = 0; i < h; i += 4) { ctx.fillRect(x, y + i, 1, 2); ctx.fillRect(x + w - 1, y + i, 1, 2); }
}

// Order feedback: a pixel square ring that expands as it fades.
export function drawMarker(ctx, m) {
  const r = Math.round(3 + (1.2 - m.t) * 8);
  const x = A(m.x);
  const y = A(m.y);
  ctx.globalAlpha = Math.min(1, m.t * 2);
  ctx.fillStyle = m.color;
  ctx.fillRect(x - r, y - r, r * 2, 1);
  ctx.fillRect(x - r, y + r, r * 2 + 1, 1);
  ctx.fillRect(x - r, y - r, 1, r * 2);
  ctx.fillRect(x + r, y - r, 1, r * 2);
  ctx.globalAlpha = 1;
}

// ── Minimap ────────────────────────────────────────────────────────────────
export function drawMinimap(ctx, game, cw, ch, view, terrainCache, zones = null) {
  const sx = cw / WORLD_W;
  const sy = ch / WORLD_H;
  if (terrainCache.version !== game.map.version || terrainCache.w !== cw || terrainCache.h !== ch) {
    const c = terrainCache.canvas || (terrainCache.canvas = document.createElement('canvas'));
    c.width = cw;
    c.height = ch;
    const t = c.getContext('2d');
    t.fillStyle = '#3d7fc4';
    t.fillRect(0, 0, cw, ch);
    const colors = { [TILE_GROUND]: '#7a4a24', [TILE_PLATFORM]: '#8f7f62', [TILE_BRIDGE]: '#b98552', [TILE_RAMP]: '#a8763e' };
    for (let tx = 0; tx < MAP_W; tx++) {
      for (let ty = 0; ty < MAP_H; ty++) {
        const k = game.map.get(tx, ty);
        if (k === TILE_EMPTY) continue;
        t.fillStyle = colors[k];
        t.fillRect(Math.floor(tx * TILE_SIZE * sx), Math.floor(ty * TILE_SIZE * sy), Math.ceil(TILE_SIZE * sx), Math.ceil(TILE_SIZE * sy));
      }
    }
    t.fillStyle = '#4cb83a';
    for (let tx = 0; tx < MAP_W; tx++) {
      for (let ty = 1; ty < MAP_H; ty++) {
        if (game.map.get(tx, ty) !== TILE_EMPTY && game.map.get(tx, ty - 1) === TILE_EMPTY) {
          t.fillRect(Math.floor(tx * TILE_SIZE * sx), Math.floor(ty * TILE_SIZE * sy), Math.ceil(TILE_SIZE * sx), Math.max(1, Math.ceil(TILE_SIZE * sy * 0.35)));
        }
      }
    }
    Object.assign(terrainCache, { version: game.map.version, w: cw, h: ch });
  }
  ctx.drawImage(terrainCache.canvas, 0, 0);
  if (zones) {
    ctx.fillStyle = 'rgba(0,255,102,0.28)';
    for (const shift of game.wrap ? [-WORLD_W, 0, WORLD_W] : [0]) {
      for (const [from, to] of zones) ctx.fillRect((from * TILE_SIZE + shift) * sx, 0, (to - from) * TILE_SIZE * sx, ch);
    }
  }
  for (const b of game.buildings) {
    if (b.type === 'bridge' || b.type === 'ramp') continue;
    ctx.fillStyle = team(b.faction).main;
    ctx.fillRect(Math.floor(b.x * sx), Math.floor(b.y * sy), Math.max(3, Math.ceil(b.w * sx)), Math.max(3, Math.ceil(b.h * sy)));
  }
  for (const u of game.units) {
    ctx.fillStyle = team(u.faction).light;
    ctx.fillRect(Math.floor(u.x * sx) - 1, Math.floor((u.y - UNIT_H) * sy), u.vehicle ? 5 : 3, Math.max(3, Math.ceil(UNIT_H * sy)));
  }
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  const box = (vx) => ctx.strokeRect(Math.round(vx * sx) + 1, Math.round(view.y * sy) + 1, Math.round(view.w * sx) - 2, Math.round(view.h * sy) - 2);
  box(view.x);
  if (game.wrap && view.x + view.w > WORLD_W) box(view.x - WORLD_W);
}

export { BUILDING_TYPES };
