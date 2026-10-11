// Steam Shogun: Japanese steampunk. Samurai tradition meets brass, boilers and
// airships under Mount Fuji, with cherry blossom drifting through the steam.
// Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#1a1214',                        // outline
  skin: '#efc090', skinDark: '#c08a5a', hair: '#1a1416',
  boot: '#2a1e18', gun: '#3a2a22', gunLight: '#7a6450',
  yellow: '#f2c24a', yellowDark: '#b8862a', red: '#c8322a', redDark: '#7e1a16', white: '#f6f0e4',
  sky: ['#2a2450', '#3e2c5e', '#5e3666', '#8a4a66', '#c06a62', '#e8946a', '#f2b884'],
  brass: '#c8964a', brassLight: '#ecc272', brassDark: '#8a6028', copper: '#b86a3a', copperDark: '#7a3e22',
  lacquer: '#2a1a1c', lacquerRed: '#8e2a26', lacquerLight: '#4a3236',
  plaster: '#ece4d4', plasterDark: '#c8bca4', tile: '#3a3e4a', tileLight: '#5a6070', tileDark: '#24262e',
  stone: '#8a867e', stoneLight: '#aca89e', stoneDark: '#5e5a54',
  wood: '#7a4e30', woodLight: '#a8703e', woodDark: '#4e321e',
  steam: '#e8e4ea', sakura: '#f4a8c0', sakuraLight: '#fcd0dc', sakuraDark: '#d27896',
  fuji: '#6a6e98', snow: '#f2f0f6', vermilion: '#d23a26',
  grass: '#6a9a4a', grassLight: '#94c06a', grassDark: '#46703a',
  dirt: '#5a4434', dirtMid: '#4a3628', dirtDeep: '#3a2a20', pebble: '#8a7a6a', pebbleDark: '#2a1e16',
  fire: '#f28a30', glass: '#f6d27a', shadow: 'rgba(0,0,0,0.3)',
};
const ARMOUR = [0.22, 0.16, 0.17];

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right — the same frame as Classic.
function sashimono(parts, details, t) {
  // A team banner on a pole strapped to the back
  parts.push([3, 0, 1, 10, C.woodDark], [0, 0, 3, 5, t.main]);
  details.push([1, 1, 1, 3, t.light], [0, 0, 3, 1, C.white]);
}

function buildSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'heavy') {
    // Steam samurai: lacquered armour, crested kabuto, boiler backpack, katana
    parts = [
      ...legs.map((l) => [...l, C.lacquer]), ...boots.map((b) => [...b, C.boot]),
      [1, 6, 4, 6, C.copper], [2, 2, 2, 4, C.brassDark],
      [4, 8, 9, 4, C.lacquerRed], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, C.lacquer], [4, 3, 2, 2, C.lacquer], [12, 3, 2, 2, C.lacquer],
      [13, 4, 1, 7, C.white], [12, 9, 3, 1, C.brass],
    ];
    details = [
      [6, 0, 6, 1, C.brassLight], [5, 0, 1, 1, C.brass], [12, 0, 1, 1, C.brass], [10, 5, 1, 1, C.O],
      [6, 6, 6, 2, C.lacquerLight], [7, 7, 4, 1, C.brassDark], [4, 9, 9, 1, t.main], [4, 11, 9, 1, C.lacquer],
      [1, 8, 4, 1, C.brass], [2, 10, 2, 1, C.brassLight], [13, 10, 1, 1, C.lacquer],
    ];
  } else if (type === 'scout') {
    // Ninja: black garb, eye slit, brass goggles, team scarf, a short blade
    parts = [
      ...legs.map((l) => [...l, '#1e1a1e']), ...boots.map((b) => [...b, '#1e1a1e']),
      [5, 8, 7, 4, '#1e1a1e'], [6, 3, 6, 5, '#262026'], [11, 9, 4, 1, C.white],
    ];
    details = [
      [7, 4, 5, 2, C.skin], [8, 4, 1, 1, C.brass], [10, 4, 1, 1, C.brass], [8, 5, 1, 1, C.O], [10, 5, 1, 1, C.O],
      [7, 4, 5, 1, C.brassDark], [4, 7, 8, 1, t.main], [3, 8, 2, 2, t.main], [11, 9, 1, 1, C.brassDark],
    ];
  } else if (type === 'engineer') {
    // Tinkerer: leather apron, goggles up, a giant wrench
    parts = [
      ...legs.map((l) => [...l, C.lacquerLight]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, '#5a6a7a'], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair],
      [11, 9, 4, 1, C.brassDark], [14, 7, 3, 2, C.brass], [14, 10, 3, 1, C.brass],
    ];
    details = [
      [6, 2, 6, 1, C.brass], [7, 2, 1, 1, '#9ad0e0'], [10, 2, 1, 1, '#9ad0e0'], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [6, 9, 5, 3, C.wood], [6, 9, 5, 1, t.main], [15, 8, 1, 1, C.O],
    ];
  } else if (type === 'sniper') {
    // Teppo gunner: hakama, headband, long matchlock with a brass scope
    parts = [
      ...legs.map((l) => [...l, '#3a3a5a']), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, t.uni], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair], [5, 0, 3, 2, C.hair],
      [10, 9, 9, 1, C.wood], [13, 8, 4, 1, C.brass],
    ];
    details = [
      [6, 3, 6, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [5, 8, 7, 1, t.main], [5, 11, 7, 1, '#3a3a5a'],
      [16, 8, 1, 1, '#9ad0e0'], [18, 9, 1, 1, C.brassDark],
    ];
  } else {
    // Ashigaru: jingasa hat, armour over a tunic, sashimono, brass steam rifle
    parts = [
      ...legs.map((l) => [...l, C.lacquerLight]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.lacquer], [6, 4, 6, 4, C.skin], [3, 3, 12, 1, C.lacquer], [5, 2, 8, 1, C.lacquer], [7, 1, 4, 1, C.lacquer],
      [11, 9, 7, 1, C.brass], [12, 10, 2, 2, C.copper],
    ];
    details = [
      [8, 1, 2, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [5, 9, 7, 1, C.lacquerLight], [7, 8, 1, 4, t.main],
      [17, 8, 1, 1, C.steam], [12, 10, 1, 1, C.brassLight],
    ];
    sashimono(parts, details, t);
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── Steam vehicles & flyers ────────────────────────────────────────────────
function gearWheel(g, x, y, r, frame) {
  disc(g, x, y, r, C.O);
  disc(g, x, y, r - 1, C.brassDark);
  disc(g, x, y, r - 2, C.brass);
  g.fillStyle = C.O;
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + (frame ? 0.4 : 0);
    g.fillRect(x + Math.round(Math.cos(ang) * r), y + Math.round(Math.sin(ang) * r), 1, 1);
  }
  disc(g, x, y, Math.max(1, r - 4), C.copperDark);
  g.fillStyle = C.brassLight; g.fillRect(x, y, 1, 1);
}

// Rickshaw: a steam-driven rickshaw — boiler and chimney up front, a hooded seat.
function buildRickshaw(f, frame) {
  const t = team(f);
  const [c, g] = canvas(26, 17);
  outlined(g, [
    [3, 5, 10, 6, C.lacquerRed], [2, 1, 9, 4, t.main], [14, 6, 7, 5, C.copper], [18, 1, 2, 5, C.brassDark],
    [5, 3, 4, 3, C.lacquer], [5, 1, 4, 2, C.lacquer], [20, 8, 4, 1, C.brassDark],
  ], [
    [2, 1, 9, 1, t.light], [3, 4, 9, 1, t.dark], [6, 4, 2, 1, C.skin], [14, 6, 7, 1, C.brassLight], [15, 8, 2, 2, C.brassLight],
    [18, 1, 2, 1, C.brassLight], [3, 9, 10, 1, C.brassDark], [23, 8, 1, 1, C.glass],
  ]);
  gearWheel(g, 8, 12, 4, frame);
  gearWheel(g, 20, 13, 3, frame);
  return { c, ax: 12, ay: 16 };
}

// Kabuto tank: a rhinoceros-beetle crawler — lacquered shell, horn cannon,
// clanking legs that step between frames, a chimney.
function buildBeetle(f, frame) {
  const t = team(f);
  const [c, g] = canvas(36, 20);
  const legs = frame
    ? [[6, 14, 2, 5], [12, 14, 2, 4], [18, 14, 2, 5], [24, 14, 2, 4]]
    : [[5, 14, 2, 4], [11, 14, 2, 5], [19, 14, 2, 4], [25, 14, 2, 5]];
  outlined(g, [
    ...legs.map((l) => [...l, C.brassDark]),
    [3, 7, 26, 8, C.lacquer], [6, 4, 18, 4, C.lacquer], [28, 9, 5, 4, C.lacquerRed], [31, 4, 2, 6, C.brass], [32, 2, 3, 3, C.brass],
    [9, 1, 2, 4, C.copperDark],
  ], [
    [6, 4, 18, 1, C.lacquerLight], [3, 7, 26, 1, C.lacquerLight], [15, 4, 1, 11, C.brassDark],
    [4, 11, 24, 1, t.main], [6, 13, 20, 1, C.brass], [30, 10, 1, 1, C.glass], [33, 2, 2, 1, C.brassLight],
    [10, 8, 3, 2, C.brass], [19, 8, 3, 2, C.brass], [9, 1, 2, 1, C.copper],
  ]);
  return { c, ax: 16, ay: 19 };
}

// Hanabi mortar: a wheeled firework mortar with a rack of rockets.
function buildMortar(f, frame) {
  const t = team(f);
  const [c, g] = canvas(28, 19);
  outlined(g, [
    [2, 10, 20, 3, C.wood], [9, 3, 6, 8, C.copper], [11, 0, 6, 5, C.copper], [2, 5, 5, 5, C.lacquerRed],
  ], [
    [2, 10, 20, 1, C.woodLight], [9, 5, 6, 1, C.brass], [9, 8, 6, 1, C.brass], [11, 0, 6, 1, C.O], [12, 1, 4, 1, C.brassDark],
    [3, 6, 1, 3, t.main], [5, 6, 1, 3, C.yellow], [3, 5, 1, 1, C.red], [5, 5, 1, 1, C.red], [10, 11, 6, 1, t.main],
  ]);
  gearWheel(g, 7, 15, 3, frame);
  gearWheel(g, 18, 15, 3, frame);
  return { c, ax: 12, ay: 18 };
}

// Tengu flyer: a crow-masked pilot on a brass airframe (wings flap and the
// propeller spins live).
function buildTengu(f) {
  const t = team(f);
  const [c, g] = canvas(30, 16);
  outlined(g, [
    [6, 7, 16, 3, C.brassDark], [21, 6, 4, 4, C.lacquer], [25, 7, 3, 2, C.lacquerRed], [12, 3, 5, 5, t.main], [12, 1, 5, 3, C.lacquer],
    [16, 2, 3, 1, C.lacquerRed], [2, 6, 5, 3, C.brassDark], [10, 10, 1, 3, C.brassDark], [18, 10, 1, 3, C.brassDark],
  ], [
    [6, 7, 16, 1, C.brassLight], [13, 2, 1, 1, C.yellow], [12, 5, 5, 1, t.light], [8, 9, 12, 1, C.copper],
    [22, 7, 2, 2, C.brass], [3, 7, 3, 1, C.brass],
  ]);
  return { c, ax: 15, ay: 13 };
}

// Koi airship: a zeppelin painted as a koi carp, with a gondola below.
function buildKoi(f) {
  const t = team(f);
  const [c, g] = canvas(46, 21);
  outlined(g, [
    [8, 3, 30, 10, C.white], [37, 5, 4, 6, C.white], [3, 4, 6, 3, C.white], [1, 2, 4, 4, t.main], [1, 9, 4, 4, t.main],
    [16, 13, 14, 4, C.lacquer], [20, 0, 6, 3, t.main],
  ], [
    [12, 4, 7, 4, t.main], [24, 6, 6, 3, t.main], [30, 3, 5, 3, C.red], [14, 9, 6, 2, C.red], [38, 6, 1, 1, C.O], [39, 9, 2, 1, C.sakuraDark],
    [8, 12, 30, 1, C.plasterDark], [17, 14, 2, 1, C.glass], [21, 14, 2, 1, C.glass], [25, 14, 2, 1, C.glass],
    [16, 13, 14, 1, C.brass], [21, 1, 4, 1, t.light],
  ]);
  return { c, ax: 23, ay: 16 };
}

// Flapping brass wings and a spinning prop for the tengu; a wagging tail and
// propellers for the koi.
function rotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 70);
  const s = u.facing;
  if (u.type === 'helicopter') {
    const up = Math.floor(performance.now() / 140) % 2 === 0;
    for (let i = 0; i < 10; i++) {
      const lift = up ? Math.round((10 - i) * 0.8) + 1 : 1;
      const px = x - (2 + i) * s;
      rect(ctx, px, y - 7 - lift, 1, lift + 1, i % 3 ? C.lacquer : C.brass);
    }
    const px = s > 0 ? x - 15 : x + 14;
    rect(ctx, px, y - 7 - (tick % 2 ? 2 : 0), 1, tick % 2 ? 5 : 2, C.steam);
  } else {
    const wag = tick % 4 < 2 ? 0 : 1;
    const tx = s > 0 ? x - 23 : x + 22;
    rect(ctx, tx, y - 13 + wag, 1, 2, C.steam);
    for (const dx of [-8, 8]) rect(ctx, x + dx, y + 1 - (tick % 2), 1, tick % 2 ? 3 : 1, C.steam);
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
// Curved tiled roof with upturned eaves and gold fish finials.
function roof(g, cx, y, w, h) {
  for (let i = 0; i < h; i++) {
    const half = Math.round(((i + 1) / h) * (w / 2) * 0.7 + (w / 2) * 0.3);
    g.fillStyle = C.O; g.fillRect(cx - half - 1, y + i, half * 2 + 2, 1);
    g.fillStyle = i % 2 ? C.tileDark : C.tile; g.fillRect(cx - half, y + i, half * 2, 1);
  }
  const half = Math.round(w / 2);
  g.fillStyle = C.O; g.fillRect(cx - half - 2, y + h - 3, 2, 3); g.fillRect(cx + half, y + h - 3, 2, 3);
  g.fillStyle = C.tile; g.fillRect(cx - half - 1, y + h - 2, 1, 2); g.fillRect(cx + half, y + h - 2, 1, 2);
  g.fillStyle = C.tileLight; g.fillRect(cx - Math.round(w * 0.15), y, Math.round(w * 0.3), 1);
  g.fillStyle = C.yellow; g.fillRect(cx - Math.round(w * 0.15) - 1, y - 2, 2, 2); g.fillRect(cx + Math.round(w * 0.15) - 1, y - 2, 2, 2);
}

function ishigaki(g, x, y, w, h) {
  // Sloped stone base: rows of fitted stones
  for (let r = 0; r < h; r++) {
    const inset = Math.round((h - r) * 0.25);
    g.fillStyle = C.O; g.fillRect(x + inset - 1, y + r, w - inset * 2 + 2, 1);
    g.fillStyle = C.stone; g.fillRect(x + inset, y + r, w - inset * 2, 1);
  }
  g.fillStyle = C.stoneDark;
  for (let yy = y + 3; yy < y + h; yy += 4) {
    g.fillRect(x, yy, w, 1);
    for (let xx = x + ((yy / 4) % 2 ? 3 : 6); xx < x + w; xx += 7) g.fillRect(xx, yy - 3, 1, 3);
  }
  g.fillStyle = C.stoneLight;
  for (let yy = y + 1; yy < y + h; yy += 4) g.fillRect(x + 2, yy, w - 4, 1);
}

function gear(g, cx, cy, r) {
  disc(g, cx, cy, r + 1, C.O);
  disc(g, cx, cy, r, C.brassDark);
  g.fillStyle = C.brass;
  for (let a = 0; a < 8; a++) { const ang = (a / 8) * Math.PI * 2; g.fillRect(cx + Math.round(Math.cos(ang) * r) - 1, cy + Math.round(Math.sin(ang) * r) - 1, 2, 2); }
  disc(g, cx, cy, Math.max(1, r - 2), C.brass);
  disc(g, cx, cy, 1, C.copperDark);
}

function chimney(g, x, y, h) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 5, h + 1);
  g.fillStyle = C.copper; g.fillRect(x, y, 3, h);
  g.fillStyle = C.brass; g.fillRect(x - 1, y, 5, 1);
  g.fillStyle = C.copperDark; g.fillRect(x + 2, y + 1, 1, h - 1);
}

function noren(g, x, y, w, t) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, 6);
  g.fillStyle = t.main; g.fillRect(x, y, w, 5);
  g.fillStyle = t.dark; for (let i = x + 3; i < x + w; i += 4) g.fillRect(i, y + 1, 1, 4);
  g.fillStyle = C.white; g.fillRect(x + Math.floor(w / 2) - 1, y + 1, 2, 2);
}

const BUILD = {
  hq(g, t) {
    // Steam castle: ishigaki base, white plaster tiers, tiled roofs, brass
    // smokestacks and a great gear
    ishigaki(g, 2, 34, 60, 14);
    outlined(g, [[10, 24, 44, 11, C.plaster]], [[10, 24, 44, 1, C.white], [10, 33, 44, 1, C.plasterDark]]);
    roof(g, 32, 18, 54, 7);
    outlined(g, [[18, 11, 28, 8, C.plaster]], [[18, 11, 28, 1, C.white]]);
    roof(g, 32, 5, 36, 7);
    for (const x of [14, 22, 40, 48]) { g.fillStyle = C.O; g.fillRect(x, 27, 3, 4); g.fillStyle = C.glass; g.fillRect(x + 1, 28, 1, 2); }
    for (const x of [22, 40]) { g.fillStyle = C.O; g.fillRect(x, 13, 3, 4); g.fillStyle = C.glass; g.fillRect(x + 1, 14, 1, 2); }
    gear(g, 32, 29, 4);
    outlined(g, [[28, 38, 8, 10, C.lacquer]], [[31, 38, 1, 10, C.O], [28, 38, 8, 1, C.brass]]);
    chimney(g, 6, 22, 12);
    chimney(g, 55, 20, 14);
    // Team mon on the keep and banners
    disc(g, 32, 14, 2, C.O); disc(g, 32, 14, 1, t.main);
    for (const x of [3, 59]) { g.fillStyle = C.O; g.fillRect(x - 1, 33, 4, 10); g.fillStyle = t.main; g.fillRect(x, 34, 2, 8); g.fillStyle = C.white; g.fillRect(x, 34, 2, 1); }
  },
  barracks(g, t) {
    // Dojo: wooden hall with shoji panels, curved roof, team noren at the door
    outlined(g, [[3, 14, 42, 18, C.wood]], [[3, 14, 42, 1, C.woodLight]]);
    for (const x of [6, 13, 30, 37]) {
      g.fillStyle = C.O; g.fillRect(x - 1, 17, 7, 10);
      g.fillStyle = C.plaster; g.fillRect(x, 18, 5, 8);
      g.fillStyle = C.plasterDark; g.fillRect(x + 2, 18, 1, 8); g.fillRect(x, 21, 5, 1); g.fillRect(x, 24, 5, 1);
    }
    roof(g, 24, 6, 46, 8);
    outlined(g, [[20, 20, 8, 12, C.lacquer]], []);
    noren(g, 19, 18, 10, t);
    chimney(g, 40, 5, 9);
  },
  turret(g, t) {
    // Yagura: a timber watchtower on stone with a steam gatling
    ishigaki(g, 5, 22, 22, 10);
    outlined(g, [[8, 10, 16, 12, C.plaster]], [[8, 10, 16, 1, C.white], [8, 17, 16, 1, C.woodDark]]);
    roof(g, 16, 4, 22, 6);
    outlined(g, [[22, 12, 8, 4, C.brassDark]], [[22, 12, 8, 1, C.brass], [29, 13, 1, 1, C.O], [29, 15, 1, 1, C.O], [23, 14, 3, 1, C.copper]]);
    g.fillStyle = C.O; g.fillRect(12, 13, 3, 3); g.fillStyle = t.main; g.fillRect(13, 14, 1, 1);
  },
  wall(g, t) {
    // Ishigaki stone base with a white plaster wall and tiled cap
    ishigaki(g, 0, 18, 16, 14);
    outlined(g, [[1, 7, 14, 11, C.plaster]], [[1, 7, 14, 1, C.white], [1, 16, 14, 1, C.plasterDark]]);
    g.fillStyle = C.O; g.fillRect(0, 3, 16, 4);
    g.fillStyle = C.tile; g.fillRect(0, 4, 16, 2);
    g.fillStyle = C.tileLight; g.fillRect(0, 4, 16, 1);
    g.fillStyle = C.O; g.fillRect(6, 10, 4, 4);
    g.fillStyle = t.main; g.fillRect(7, 11, 2, 2);
  },
  mine(g, t) {
    // Boiler: a riveted copper boiler with gauges, pipes, a chimney and coal
    outlined(g, [[4, 12, 22, 16, C.copper], [8, 28, 14, 4, C.stoneDark]], [[4, 12, 22, 1, C.brassLight], [4, 26, 22, 1, C.copperDark]]);
    g.fillStyle = C.brassLight;
    for (let x = 6; x < 26; x += 4) { g.fillRect(x, 14, 1, 1); g.fillRect(x, 24, 1, 1); }
    disc(g, 11, 19, 3, C.O); disc(g, 11, 19, 2, C.white); g.fillStyle = C.red; g.fillRect(11, 18, 1, 2);
    disc(g, 20, 19, 3, C.O); disc(g, 20, 19, 2, C.white); g.fillStyle = C.O; g.fillRect(20, 19, 2, 1);
    chimney(g, 21, 2, 11);
    g.fillStyle = C.O; g.fillRect(25, 16, 6, 3); g.fillStyle = C.brass; g.fillRect(26, 17, 5, 1);
    for (const [x, y] of [[26, 28], [29, 28], [27, 26]]) { disc(g, x + 1, y + 1, 1, '#1e1a1e'); }
    g.fillStyle = t.main; g.fillRect(6, 21, 3, 2);
  },
  workshop(g, t) {
    // Karakuri works: open timber shed, a great gear, a crane, a half-built automaton
    outlined(g, [[3, 12, 2, 20, C.woodDark], [43, 12, 2, 20, C.woodDark], [3, 12, 42, 2, C.wood]], []);
    roof(g, 24, 4, 46, 8);
    gear(g, 13, 23, 6);
    gear(g, 22, 27, 3);
    outlined(g, [[30, 18, 6, 6, C.brass], [31, 24, 4, 8, C.brassDark], [29, 15, 8, 3, C.lacquer]], [[31, 20, 1, 1, C.red], [34, 20, 1, 1, C.red], [30, 18, 6, 1, C.brassLight]]);
    g.fillStyle = C.O; g.fillRect(39, 14, 1, 10);
    noren(g, 4, 14, 8, t);
  },
  airbase(g, t) {
    // Sky dock: a brass mooring mast with lanterns and a koinobori windsock
    outlined(g, [[0, 20, 36, 12, C.wood]], [[0, 20, 36, 1, C.woodLight]]);
    roof(g, 18, 14, 40, 6);
    outlined(g, [[13, 24, 10, 8, C.lacquer]], [[17, 24, 1, 8, C.O]]);
    g.fillStyle = C.O; g.fillRect(47, 0, 5, 32);
    g.fillStyle = C.brassDark; g.fillRect(48, 1, 3, 31);
    g.fillStyle = C.brass; for (let y = 3; y < 32; y += 5) g.fillRect(48, y, 3, 1);
    g.fillStyle = C.O; g.fillRect(43, 0, 13, 3);
    g.fillStyle = C.brassLight; g.fillRect(44, 1, 11, 1);
    for (const [x, y] of [[41, 10], [55, 16]]) { g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 5, 6); g.fillStyle = C.red; g.fillRect(x, y, 3, 4); g.fillStyle = C.glass; g.fillRect(x + 1, y + 1, 1, 2); }
    g.fillStyle = t.main; g.fillRect(52, 4, 9, 3);
    g.fillStyle = C.white; g.fillRect(58, 5, 1, 1);
    g.fillStyle = t.dark; g.fillRect(54, 4, 1, 3); g.fillRect(56, 4, 1, 3);
  },
  bridge(g, t) {
    // Red taiko bridge deck with a railing
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 7);
    g.fillStyle = C.wood; g.fillRect(0, 2, 16, 3);
    g.fillStyle = C.woodLight; g.fillRect(0, 2, 16, 1);
    g.fillStyle = C.vermilion; g.fillRect(0, 0, 16, 1); g.fillRect(2, 0, 1, 2); g.fillRect(8, 0, 1, 2); g.fillRect(14, 0, 1, 2); g.fillRect(0, 5, 16, 1);
    g.fillStyle = C.brass; g.fillRect(2, 0, 1, 1); g.fillRect(8, 0, 1, 1); g.fillRect(14, 0, 1, 1);
    g.fillStyle = t.main; g.fillRect(10, 3, 2, 1);
  },
  ramp(g, t) {
    // Stone steps
    g.fillStyle = C.stone; g.fillRect(0, 0, 16, 16);
    g.fillStyle = C.stoneDark; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = C.stoneLight; for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = C.O; g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = t.main; g.fillRect(2, 1, 3, 2);
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
  if (kind.startsWith('dirt')) {
    g.fillStyle = kind === 'dirtDeep' ? C.dirtDeep : kind === 'dirtMid' ? C.dirtMid : C.dirt;
    g.fillRect(0, 0, T, T);
    speckle(6, C.pebble, C.pebbleDark, kind === 'dirtTop' ? 5 : 0);
    if (kind !== 'dirtTop' && hash(seed + 33) < 0.3) {
      // A buried pipe
      g.fillStyle = C.copperDark; g.fillRect(0, 9, T, 3);
      g.fillStyle = C.copper; g.fillRect(0, 9, T, 1);
      g.fillStyle = C.brass; g.fillRect(6, 8, 2, 5);
    }
    if (kind === 'dirtTop') {
      g.fillStyle = C.grass; g.fillRect(0, 0, T, 4);
      g.fillStyle = C.grassLight; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.grassDark; g.fillRect(0, 4, T, 1);
      for (let x = 0; x < T; x += 3) if (hash(seed + x) < 0.6) g.fillRect(x, 5, 1, 1);
      g.fillStyle = C.sakura;
      if (hash(seed + 9) < 0.5) g.fillRect(Math.floor(hash(seed + 10) * 14), 1, 1, 1);
    }
  } else {
    // Brass-plated girder with a riveted deck and a copper pipe beneath
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.lacquer; g.fillRect(0, 0, T, T);
    g.fillStyle = C.brass; g.fillRect(0, 0, T, 4);
    g.fillStyle = C.brassLight; g.fillRect(0, 0, T, 1);
    g.fillStyle = C.brassDark; g.fillRect(0, 4, T, 1);
    g.fillStyle = C.brassLight; for (let x = 2; x < T; x += 5) g.fillRect(x, 2, 1, 1);
    g.fillStyle = C.lacquerLight;
    for (let i = 0; i < 5; i++) { g.fillRect(2 + i * 2, 6 + i, 1, 1); g.fillRect(13 - i * 2, 6 + i, 1, 1); }
    g.fillStyle = C.copperDark; g.fillRect(0, T - 5, T, 3);
    g.fillStyle = C.copper; g.fillRect(0, T - 5, T, 1);
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Grass tufts, fallen petals and the odd brass cog.
function surface(ctx, x, y, ground, h) {
  ctx.fillStyle = C.grass;
  ctx.fillRect(x + Math.floor(h * 12), y - 2, 1, 2);
  if (!ground) return;
  if (h > 0.9) {
    ctx.fillStyle = C.brassDark; ctx.fillRect(x + 6, y - 3, 3, 3);
    ctx.fillStyle = C.brass; ctx.fillRect(x + 7, y - 3, 1, 1); ctx.fillRect(x + 6, y - 2, 1, 1); ctx.fillRect(x + 8, y - 2, 1, 1);
  } else if (h > 0.66) {
    ctx.fillStyle = C.sakura; ctx.fillRect(x + 3, y - 1, 1, 1); ctx.fillRect(x + 9, y - 1, 2, 1);
    ctx.fillStyle = C.sakuraLight; ctx.fillRect(x + 12, y - 1, 1, 1);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};

function fuji(ctx, cx, base, w, h) {
  for (let y = 0; y < h; y++) {
    const half = Math.round(4 + (y / h) * (w / 2));
    ctx.fillStyle = y < h * 0.28 ? (y % 3 === 2 && y > h * 0.18 ? C.fuji : C.snow) : C.fuji;
    ctx.fillRect(cx - half, base - h + y, half * 2, 1);
  }
}

// Far town: pagodas, a castle keep and factory chimneys (smoke drawn live).
function townPiece(k) {
  const key = `town${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(40, 60);
  const col = '#4a3456';
  const kind = Math.floor(hash(k + 1) * 3);
  g.fillStyle = col;
  if (kind === 0) {
    // Five-storey pagoda
    for (let i = 0; i < 5; i++) {
      const y = 12 + i * 9;
      const w = 12 + i * 3;
      g.fillRect(20 - w / 2 - 2, y, w + 4, 2);
      g.fillRect(20 - w / 2 + 2, y + 2, w - 4, 7);
    }
    g.fillRect(19, 2, 2, 10);
  } else if (kind === 1) {
    // Factory with chimneys
    g.fillRect(4, 36, 32, 24);
    for (const x of [8, 18, 28]) g.fillRect(x, 14 + (x % 3) * 4, 4, 30);
    g.fillStyle = '#f2b05a'; for (let x = 7; x < 34; x += 5) g.fillRect(x, 44, 2, 3);
  } else {
    // Distant castle keep
    g.fillRect(8, 40, 24, 20); g.fillRect(4, 34, 32, 6); g.fillRect(11, 24, 18, 10); g.fillRect(8, 20, 24, 4); g.fillRect(14, 12, 12, 8); g.fillRect(11, 9, 18, 3);
    g.fillStyle = '#f2b05a'; g.fillRect(15, 28, 2, 2); g.fillRect(23, 28, 2, 2);
  }
  scenery[key] = c;
  return c;
}

function sakuraTree(k) {
  const key = `sak${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(34, 40);
  g.fillStyle = '#3a2420'; g.fillRect(16, 16, 3, 24); g.fillRect(12, 18, 5, 2); g.fillRect(18, 14, 6, 2); g.fillRect(10, 16, 2, 3);
  for (let i = 0; i < 9; i++) {
    const cx = 6 + Math.floor(hash(k * 7 + i) * 22);
    const cy = 4 + Math.floor(hash(k * 7 + i + 30) * 12);
    disc(g, cx, cy, 4 + Math.floor(hash(k + i) * 2), i % 3 ? C.sakura : C.sakuraDark);
  }
  for (let i = 0; i < 8; i++) { g.fillStyle = C.sakuraLight; g.fillRect(4 + Math.floor(hash(k + i + 50) * 26), 2 + Math.floor(hash(k + i + 60) * 14), 2, 1); }
  scenery[key] = c;
  return c;
}

function torii(ctx, x, base) {
  const red = '#a82a22';
  rect(ctx, x, base - 26, 2, 26, red); rect(ctx, x + 14, base - 26, 2, 26, red);
  rect(ctx, x - 3, base - 28, 22, 2, '#1e1416'); rect(ctx, x - 2, base - 26, 20, 1, red); rect(ctx, x - 1, base - 22, 18, 2, red);
}

function background(ctx, bw, bh, camAX, camAY) {
  const groundY = (WORLD_H - 3 * TILE_SIZE) / G - camAY;
  const bands = C.sky.length;
  for (let i = 0; i < bands; i++) {
    const y0 = Math.floor((groundY * i) / bands);
    rect(ctx, 0, y0, bw, Math.ceil(groundY / bands) + 1, C.sky[i]);
  }
  rect(ctx, 0, groundY, bw, bh, C.sky[bands - 1]);
  const t = performance.now() / 1000;

  // A great red setting sun beside Mount Fuji (both far beyond parallax)
  const sx = Math.round(bw * 0.22), sy = Math.round(groundY - 78);
  disc(ctx, sx, sy, 17, '#d8482e');
  fuji(ctx, Math.round(bw * 0.55), groundY - 8, 200, 92);

  // Airships drifting across the far sky
  for (let i = 0; i < 2; i++) {
    const ax = Math.round(((t * (5 + i * 3) + i * 211 - camAX * 0.08) % (bw + 80) + bw + 80) % (bw + 80)) - 40;
    const ay = Math.round(24 + i * 22 - camAY * 0.05);
    rect(ctx, ax, ay, 22, 6, '#4a3a5e'); rect(ctx, ax + 2, ay - 1, 18, 1, '#4a3a5e'); rect(ctx, ax - 3, ay + 1, 3, 4, '#4a3a5e');
    rect(ctx, ax + 8, ay + 6, 6, 2, '#3a2c4a'); rect(ctx, ax + 9, ay + 7, 1, 1, '#f2b05a');
  }

  // Far town with steam rising from its chimneys
  const tCount = 12;
  const tSpacing = ((WORLD_W / G) * 0.25) / tCount;
  const tOff = Math.round(camAX * 0.25);
  for (let i = Math.floor((tOff - 50) / tSpacing); i * tSpacing - tOff < bw + 50; i++) {
    const k = ((i % tCount) + tCount) % tCount;
    const img = townPiece(k);
    const x = Math.round(i * tSpacing - tOff + hash(k + 3) * tSpacing * 0.4);
    ctx.drawImage(img, x, groundY - img.height - 2);
    if (Math.floor(hash(k + 1) * 3) === 1) {
      for (let j = 0; j < 3; j++) {
        const kk = (t / 3 + j / 3 + k * 0.1) % 1;
        ctx.globalAlpha = 0.45 * (1 - kk);
        rect(ctx, x + 9 + j * 10 + Math.round(Math.sin(kk * 6 + j) * 3), groundY - 62 - Math.round(kk * 30) + (j % 3) * 4, 4 + Math.round(kk * 4), 3 + Math.round(kk * 3), C.steam);
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.globalAlpha = 0.3; rect(ctx, 0, groundY - 20, bw, 20, '#f2b884'); ctx.globalAlpha = 1;

  // Cherry trees and torii gates in front
  const count = 40;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    const x = Math.round(i * spacing - jOff + hash(k) * spacing * 0.5);
    if (hash(k + 70) < 0.18) torii(ctx, x, groundY + 2);
    else if (hash(k + 70) < 0.8) { const img = sakuraTree(k); ctx.drawImage(img, x - 17, groundY - img.height + 2); }
  }
}

// Cherry blossom petals drifting across everything.
function weather(ctx, bw, bh, camAX, camAY) {
  const t = performance.now() / 1000;
  const n = Math.min(90, Math.floor((bw * bh) / 4000));
  for (let i = 0; i < n; i++) {
    const speed = 12 + hash(i * 5 + 1) * 14;
    const y = ((hash(i * 5 + 2) * (bh + 20) + t * speed + camAY * 0.3) % (bh + 20)) - 10;
    const sway = Math.sin(t * 1.5 + i) * 6;
    const x = Math.round((((hash(i * 5 + 3) * (bw + 40) + sway - t * 8 - camAX * 0.4) % (bw + 40)) + bw + 40) % (bw + 40)) - 20;
    ctx.fillStyle = i % 3 ? C.sakura : C.sakuraLight;
    ctx.fillRect(x, Math.round(y), (i + Math.floor(t * 2)) % 2 ? 2 : 1, 1);
  }
}

// Bamboo scaffolding wreathed in steam.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = '#6a8a3a';
  for (let sx = x + 1; sx < x + w; sx += 7) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(x, sy, w, 1);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = C.steam; ctx.fillRect(x + Math.floor(w * 0.6), y + 2, 6, 5);
  ctx.globalAlpha = 1;
}

function puff(ctx, x, y, ms, i) {
  const k = (ms / 1500 + i / 2) % 1;
  ctx.globalAlpha = 0.6 * (1 - k);
  rect(ctx, x + Math.round(Math.sin(k * 6 + i) * 2), y - Math.round(k * 12), 3 + Math.round(k * 2), 3 + Math.round(k * 2), C.steam);
  ctx.globalAlpha = 1;
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  const t = team(b.faction);
  if (b.type === 'hq') {
    for (let i = 0; i < 2; i++) { puff(ctx, x + 6, y + 20, ms, i); puff(ctx, x + 55, y + 18, ms + 400, i); }
  } else if (b.type === 'mine') {
    for (let i = 0; i < 2; i++) puff(ctx, x + 21, y, ms, i);
    if (tick % 4 < 2) rect(ctx, x + 30, y + 16, 1, 1, C.steam);
  } else if (b.type === 'barracks') {
    for (let i = 0; i < 2; i++) puff(ctx, x + 40, y + 3, ms, i);
  } else if (b.type === 'airbase') {
    // The koinobori ripples
    rect(ctx, x + 60 + (tick % 2), y + 5, 1, 1, t.light);
  } else if (b.type === 'turret') {
    if (tick % 7 === 0) puff(ctx, x + 30, y + 12, ms, 0);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  if (p.kind === 'bullet') {
    // Brass slug with a wisp of steam
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, 'rgba(232,228,234,0.6)');
    rect(ctx, x - dx, y - dy, 1, 1, C.brassDark);
    rect(ctx, x, y, 2, 1, C.brassLight);
  } else if (p.kind === 'bomb') {
    // Round bomb with a fizzing fuse
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, C.lacquerLight);
    if (Math.floor(performance.now() / 80) % 2) rect(ctx, x, y - 3, 1, 1, C.yellow);
  } else if (p.kind === 'lob') {
    // Firework shell trailing sparks
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.yellow);
    rect(ctx, x - dx, y - dy, 1, 1, C.fire);
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, C.red);
  } else {
    // Cannonball
    rect(ctx, x - dx, y - dy, 1, 1, 'rgba(232,228,234,0.6)');
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, '#4a4650');
  }
}

// Every blast blooms like hanabi: rings of coloured sparks and a puff of smoke.
const SPARKS = ['#f6d27a', '#f4a8c0', '#9ad0f0', '#f6f0e4', '#f28a30'];
function explode(ctx, x, y, r, k, seed) {
  if (k > 0.7) {
    ctx.globalAlpha = 1 - (k - 0.7) / 0.3;
    disc(ctx, x, y, Math.max(1, Math.round(r * 0.6)), C.steam);
    ctx.globalAlpha = 1;
    return;
  }
  disc(ctx, x, y, Math.max(1, Math.round(r * 0.3 * (1 - k))), '#ffffff');
  const rays = 12;
  for (let i = 0; i < rays; i++) {
    const ang = (i / rays) * Math.PI * 2 + hash(seed) * 0.5;
    const col = SPARKS[(i + Math.floor(hash(seed + 3) * 5)) % SPARKS.length];
    for (let j = 0; j < 3; j++) {
      const d = r * (0.4 + k * 0.9) - j * 2;
      if (d <= 0) continue;
      rect(ctx, Math.round(x + Math.cos(ang) * d), Math.round(y + Math.sin(ang) * d + k * 3), j === 0 ? 2 : 1, j === 0 ? 2 : 1, col);
    }
  }
}

function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(14, 6);
  outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, e.type === 'heavy' ? C.lacquerRed : C.lacquer], [11, 3, 2, 2, C.boot]], [[0, 1, 2, 2, C.hair], [5, 3, 2, 1, t.main]]);
  return { c, ax: 7, ay: 5 };
}

export default {
  id: 'steampunk',
  name: 'Steam Shogun',
  palette,
  teamBase: ARMOUR,
  roofBase: [0.25, 0.25, 0.3],
  soldier: buildSoldier,
  vehicle: { jeep: buildRickshaw, tank: buildBeetle, artillery: buildMortar },
  aircraft: { helicopter: buildTengu, bomber: buildKoi },
  buildings: BUILD,
  drawTile,
  surface,
  background,
  weather,
  skyTop: palette.sky[0],
  rotor,
  construction,
  animate,
  projectile,
  explode,
  explosion: { rim: '#c8964a', body: '#f6d27a', core: '#ffffff', smoke: '#e8e4ea', smoke2: '#f6f0e4' },
  corpse,
  debris: { '#7a4a24': '#c8964a', '#5c361a': '#b86a3a' },
  minimap: { sky: '#5e3666', ground: '#5a4434', platform: '#c8964a', bridge: '#d23a26', ramp: '#8a867e', surface: '#6a9a4a' },
  names: {
    soldier: 'Ashigaru', heavy: 'Steam Samurai', scout: 'Ninja', engineer: 'Tinkerer', sniper: 'Teppo',
    jeep: 'Rickshaw', tank: 'Kabuto Tank', artillery: 'Hanabi Mortar', helicopter: 'Tengu Flyer', bomber: 'Koi Airship',
    hq: 'Castle', barracks: 'Dojo', turret: 'Yagura', wall: 'Ishigaki', mine: 'Boiler', workshop: 'Karakuri Works',
    airbase: 'Sky Dock', bridge: 'Taiko Bridge', ramp: 'Steps',
  },
  // Units are shown with their own sprites in menus.
  spriteIcons: true,
  icons: { hq: '🏯', barracks: '🥋', turret: '💥', wall: '🧱', mine: '♨️', workshop: '⚙️', airbase: '🎏', bridge: '🌉', ramp: '🪜' },
};
