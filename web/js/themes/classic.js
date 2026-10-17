// Classic theme: early-90s jungle war (the original look).
import { TILE_SIZE, WORLD_W, WORLD_H } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team, missileRack } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
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
  sam(g, t) {
    // Missile launcher on a turntable, with its tracking radar, behind sandbags
    outlined(g, [[9, 20, 16, 5, C.metalDark], [12, 17, 10, 4, C.metal]], [[12, 17, 10, 1, C.metalLight], [9, 22, 16, 1, t.main]]);
    missileRack(g, { x: 13, y: 18, len: 13, rail: C.metalDark, body: C.white, tip: C.red, fin: t.main, dish: [5, 12], mast: C.metal, dishCol: C.metalLight });
    sandbags(g, 0, 32, 32, 2);
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

// ── Terrain tiles ──────────────────────────────────────────────────────────
function drawTile(g, kind, variant) {
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
}

// Grass tufts and the odd red flower poking up above a surface tile.
function surface(ctx, x, y, ground, h) {
  ctx.fillStyle = C.grass;
  ctx.fillRect(x + Math.floor(h * 12), y - 2, 1, 2);
  ctx.fillRect(x + Math.floor(h * 12) + 2, y - 1, 1, 1);
  if (ground && h > 0.88) {
    ctx.fillStyle = C.red; ctx.fillRect(x + 8, y - 3, 2, 2);
    ctx.fillStyle = C.grassDark; ctx.fillRect(x + 8, y - 1, 1, 1);
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

function background(ctx, bw, bh, camAX, camAY) {
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

function rotor(ctx, u, x, y) {
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

// Wooden scaffolding and hazard tape around a building going up.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = C.woodDark;
  for (let sx = x + 1; sx < x + w; sx += 8) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 8) ctx.fillRect(x, sy, w, 1);
  for (let i = 0; i < w; i++) { ctx.fillStyle = Math.floor(i / 3) % 2 ? C.O : C.yellow; ctx.fillRect(x + i, y + h - 3, 1, 2); }
}

function animate(ctx, b, x, y, w) {
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

function projectile(ctx, p, x, y, dx, dy) {
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

// A fallen soldier.
function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(14, 6);
  outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, t.uni], [11, 3, 2, 2, C.boot]], [[0, 1, 3, 2, t.main]]);
  return { c, ax: 7, ay: 5 };
}

export default {
  id: 'classic',
  name: 'Classic',
  palette,
  teamBase: palette.olive,
  soldier: buildSoldier,
  vehicle: VEHICLE_BUILD,
  aircraft: { helicopter: buildHeli, bomber: buildBomber },
  buildings: BUILD,
  drawTile,
  surface,
  background,
  skyTop: palette.sky[0],
  rotor,
  construction,
  animate,
  projectile,
  explosion: { rim: palette.red, body: '#f28a30', core: palette.yellow, smoke: '#5a5148', smoke2: '#7a7266' },
  corpse,
  minimap: { sky: '#3d7fc4', ground: '#7a4a24', platform: '#8f7f62', bridge: '#b98552', ramp: '#a8763e', surface: '#4cb83a' },
  names: { sam: 'SAM Site' },
};
