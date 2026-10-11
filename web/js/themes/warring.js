// Warring States: China, c. 475–221 BC. Seven kingdoms fight across loess
// plains under ink-wash mountains: halberdiers and crossbowmen, chariots and
// siege engines, Mohist engineers, spies — and kites and sky lanterns for an
// air force. Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#1a1210',                        // outline
  skin: '#e8b884', skinDark: '#b88452', hair: '#1c1614',
  boot: '#2a1e16', gun: '#3a2a1a', gunLight: '#7a6448',
  yellow: '#e8c060', yellowDark: '#b08a30', red: '#b8281a', redDark: '#7a160e', white: '#f6efdc',
  sky: ['#9fb2c0', '#b2c0c8', '#c6cec8', '#d8d8c8', '#e8dfc6', '#f0dcb8'],
  ink: '#5e6a74', inkLight: '#8a96a0', inkDark: '#3e4850', mist: '#ece4d0',
  lamellar: '#4a3a30', lamellarLight: '#6e5a48', lamellarDark: '#2e241e', robe: '#5a5048', robeDark: '#3a342e',
  bronze: '#c08a40', bronzeLight: '#e0b060', bronzeDark: '#7a5424',
  vermilion: '#c43a22', vermilionDark: '#8a2414', lacquer: '#241612', gold: '#e8c060',
  tile: '#4a4e54', tileLight: '#6e747a', tileDark: '#2e3236',
  loess: '#c89a5c', loessLight: '#dcb478', loessDark: '#9a7040', earth: '#a87a48', earthMid: '#8e6438', earthDeep: '#6e4a2a',
  pebble: '#d8b884', pebbleDark: '#6a4a2a',
  stone: '#8e8c84', stoneLight: '#b4b2a8', stoneDark: '#62605a',
  wood: '#7a5230', woodLight: '#a8743e', woodDark: '#4e321a', bamboo: '#7aa04a', bambooDark: '#4e7030',
  grass: '#8aa84a', grassLight: '#b4c86a', grassDark: '#5e7a30', pine: '#3a5a3a', pineDark: '#24402a',
  paper: '#f2e2b8', fire: '#f28a30', glass: '#f6d27a', shadow: 'rgba(0,0,0,0.25)',
};
const LAMELLAR = [0.3, 0.24, 0.2];

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right — the same frame as Classic.
function buildSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'heavy') {
    // Guardsman: bronze helm and plume, heavy lamellar, painted shield, sword
    parts = [
      ...legs.map((l) => [...l, C.lamellarDark]), ...boots.map((b) => [...b, C.boot]),
      [4, 8, 9, 4, C.lamellar], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, C.bronze], [8, -1, 2, 2, t.main],
      [13, 4, 1, 7, C.bronzeLight], [12, 9, 3, 1, C.bronzeDark], [1, 7, 5, 6, C.lacquer],
    ];
    details = [
      [5, 1, 8, 1, C.bronzeLight], [5, 3, 8, 1, C.bronzeDark], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [4, 9, 9, 1, C.lamellarLight], [4, 11, 9, 1, C.lamellarLight], [6, 8, 1, 4, t.main], [10, 8, 1, 4, t.main],
      [2, 8, 3, 4, t.main], [3, 9, 1, 2, C.gold], [1, 7, 5, 1, C.vermilion],
    ];
  } else if (type === 'scout') {
    // Spy: dark robes, face cloth, a wide conical straw hat, a short blade
    parts = [
      ...legs.map((l) => [...l, C.robeDark]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, '#2c2826'], [6, 4, 6, 4, C.skin], [3, 3, 12, 1, '#c8aa6a'], [5, 2, 8, 1, '#c8aa6a'], [7, 1, 4, 1, '#c8aa6a'],
      [11, 9, 4, 1, C.bronzeLight],
    ];
    details = [
      [6, 6, 6, 2, '#2c2826'], [10, 5, 1, 1, C.O], [3, 3, 12, 1, '#a8884a'], [8, 1, 2, 1, '#e0c88a'],
      [5, 10, 7, 1, t.main], [11, 9, 1, 1, C.bronzeDark],
    ];
  } else if (type === 'engineer') {
    // Mohist: plain hemp robe, headband, carpenter's mallet
    parts = [
      ...legs.map((l) => [...l, '#6a6458']), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, '#8a8272'], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair], [7, 0, 2, 1, C.hair],
      [11, 9, 4, 1, C.wood], [14, 7, 3, 4, C.woodLight],
    ];
    details = [
      [6, 3, 6, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [5, 10, 7, 1, '#5a5448'],
      [9, 9, 3, 2, '#8a8272'], [14, 7, 3, 1, C.woodDark],
    ];
  } else if (type === 'sniper') {
    // Crossbowman: armoured vest, cap, a heavy bronze-triggered crossbow
    parts = [
      ...legs.map((l) => [...l, C.robe]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.lamellar], [6, 3, 6, 5, C.skin], [6, 1, 6, 3, t.dark],
      [10, 9, 8, 1, C.wood], [17, 6, 1, 7, C.woodDark],
    ];
    details = [
      [6, 1, 6, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [5, 9, 7, 1, C.lamellarLight],
      [7, 8, 1, 4, t.main], [12, 10, 1, 1, C.bronze], [16, 8, 1, 3, '#d8cdb0'], [18, 9, 1, 1, C.bronzeLight],
    ];
  } else {
    // Halberdier: Terracotta-army infantryman — topknot, lamellar over a robe, ji
    parts = [
      ...legs.map((l) => [...l, C.robe]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.lamellar], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair], [5, 0, 3, 2, C.hair],
      [13, 0, 1, 15, C.wood], [14, 2, 3, 1, C.bronze], [12, 1, 1, 3, C.bronze],
    ];
    details = [
      [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [5, 9, 7, 1, C.lamellarLight], [5, 11, 7, 1, C.robeDark],
      [7, 8, 1, 4, t.main], [9, 8, 1, 4, t.main], [13, 4, 1, 1, t.main], [14, 2, 1, 1, C.bronzeLight], [5, 1, 2, 1, t.main],
    ];
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── Chariots & siege engines ───────────────────────────────────────────────
function spokeWheel(g, x, y, r, frame) {
  disc(g, x, y, r, C.O);
  disc(g, x, y, r - 1, C.woodDark);
  disc(g, x, y, r - 2, '#d8c8a0');
  g.fillStyle = C.wood;
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2 + (frame ? 0.5 : 0);
    for (let i = 1; i < r - 1; i++) g.fillRect(x + Math.round(Math.cos(ang) * i), y + Math.round(Math.sin(ang) * i), 1, 1);
  }
  g.fillStyle = C.bronzeDark; g.fillRect(x, y, 1, 1);
}

function banner(g, x, y, t, len = 9) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 1, len + 6);
  g.fillStyle = C.wood; g.fillRect(x, y - 1, 1, len + 5);
  g.fillStyle = C.O; g.fillRect(x + 1, y - 1, 5, len + 2);
  g.fillStyle = t.main; g.fillRect(x + 1, y, 4, len);
  g.fillStyle = t.light; g.fillRect(x + 2, y + 2, 2, 2);
  g.fillStyle = C.gold; g.fillRect(x + 1, y + len - 1, 4, 1);
}

// Chariot: two horses, a big spoked wheel, a driver and an archer, a banner.
function buildChariot(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 22);
  const legs = frame
    ? [[17, 15, 2, 5], [20, 15, 2, 4], [25, 15, 2, 4], [28, 15, 2, 5]]
    : [[16, 15, 2, 4], [21, 15, 2, 5], [24, 15, 2, 5], [29, 15, 2, 4]];
  outlined(g, [
    ...legs.map((l) => [...l, '#4a3220']), [15, 10, 15, 5, '#6e4a2c'], [27, 6, 3, 6, '#6e4a2c'], [29, 5, 3, 3, '#6e4a2c'],
    [2, 9, 12, 5, C.lacquer], [5, 4, 3, 5, C.lamellar], [9, 3, 3, 6, C.lamellar], [5, 2, 3, 2, C.hair], [9, 1, 3, 2, C.bronze],
    [12, 12, 4, 1, C.woodDark],
  ], [
    [15, 11, 14, 1, '#8a5e38'], [30, 6, 1, 1, C.O], [28, 6, 1, 4, '#2a1a10'], [2, 10, 12, 1, C.vermilion],
    [3, 12, 10, 1, t.main], [5, 5, 3, 1, t.main], [9, 4, 3, 1, t.main], [10, 3, 1, 1, C.skin],
    [6, 4, 1, 1, C.skin], [17, 13, 10, 1, t.dark],
  ]);
  // Archer's bow and the reins
  g.fillStyle = C.woodDark; g.fillRect(13, 2, 1, 6); g.fillRect(12, 1, 1, 1); g.fillRect(12, 8, 1, 1);
  g.fillStyle = '#d8cdb0'; g.fillRect(12, 2, 1, 6);
  g.fillStyle = '#2a1a10'; for (let i = 0; i < 18; i++) g.fillRect(8 + i, 6 + Math.round(i * 0.25), 1, 1);
  spokeWheel(g, 7, 15, 6, frame);
  banner(g, 3, 0, t, 6);
  return { c, ax: 15, ay: 21 };
}

// Bolt cart: a giant crossbow on a wheeled carriage, bolts loaded.
function buildBoltCart(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 18);
  outlined(g, [
    [2, 9, 24, 3, C.wood], [6, 5, 18, 4, C.woodDark], [22, 0, 2, 13, C.wood], [4, 3, 3, 6, C.lamellar], [4, 1, 3, 2, C.hair],
  ], [
    [2, 9, 24, 1, C.woodLight], [6, 5, 18, 1, C.wood], [21, 0, 1, 13, '#d8cdb0'], [8, 6, 20, 1, C.bronzeLight],
    [8, 7, 18, 1, C.bronze], [27, 6, 2, 1, C.bronzeLight], [5, 4, 2, 1, t.main], [10, 10, 4, 1, t.main], [16, 10, 4, 1, t.main],
  ]);
  spokeWheel(g, 7, 13, 4, frame);
  spokeWheel(g, 20, 13, 4, frame);
  return { c, ax: 14, ay: 17 };
}

// Stone thrower: a traction trebuchet — crew pull ropes on the short end.
function buildThrower(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 26);
  outlined(g, [
    [3, 19, 22, 3, C.wood], [10, 8, 2, 12, C.woodDark], [16, 8, 2, 12, C.woodDark], [10, 7, 8, 2, C.wood],
    [4, 13, 3, 2, C.wood], [7, 11, 3, 2, C.wood], [10, 9, 3, 2, C.wood], [13, 7, 3, 2, C.wood], [16, 5, 3, 2, C.wood],
    [19, 3, 3, 2, C.wood], [22, 1, 3, 2, C.wood], [25, 2, 1, 4, '#d8cdb0'], [24, 6, 3, 3, C.stone],
  ], [
    [3, 19, 22, 1, C.woodLight], [24, 6, 2, 1, C.stoneLight], [10, 7, 8, 1, C.woodLight], [12, 15, 4, 2, t.main],
  ]);
  // Traction ropes hanging from the short end
  g.fillStyle = '#d8cdb0';
  for (const x of [4, 5, 6]) g.fillRect(x, 15, 1, 4 + (x % 2));
  banner(g, 19, 9, t, 6);
  spokeWheel(g, 6, 22, 3, frame);
  spokeWheel(g, 21, 22, 3, frame);
  return { c, ax: 13, ay: 25 };
}

// War kite: a great wooden bird of bamboo and silk with an archer slung below.
function buildKite(f) {
  const t = team(f);
  const [c, g] = canvas(32, 18);
  outlined(g, [
    [6, 4, 20, 3, t.main], [2, 2, 6, 2, t.main], [24, 3, 5, 3, C.paper], [28, 4, 2, 2, C.gold],
    [13, 9, 4, 4, C.lamellar], [13, 7, 4, 2, C.hair],
  ], [
    [6, 4, 20, 1, t.light], [8, 5, 16, 1, C.bambooDark], [10, 4, 1, 3, C.bambooDark], [16, 4, 1, 3, C.bambooDark],
    [21, 4, 1, 3, C.bambooDark], [26, 4, 1, 1, C.O], [14, 10, 2, 1, t.main], [14, 8, 1, 1, C.skin],
  ]);
  g.fillStyle = '#d8cdb0'; g.fillRect(14, 7, 1, 2); g.fillRect(16, 7, 1, 2);
  g.fillStyle = C.woodDark; g.fillRect(18, 10, 5, 1); g.fillRect(22, 9, 1, 3);
  return { c, ax: 16, ay: 14 };
}

// Sky lantern: a giant paper lantern carrying a basket of fire pots.
function buildLantern(f) {
  const t = team(f);
  const [c, g] = canvas(30, 26);
  disc(g, 15, 9, 9, C.O);
  disc(g, 15, 9, 8, t.main);
  disc(g, 14, 8, 6, t.light);
  g.fillStyle = C.O; g.fillRect(9, 0, 13, 2); g.fillRect(10, 17, 11, 2);
  g.fillStyle = C.lacquer; g.fillRect(10, 0, 11, 1); g.fillRect(11, 17, 9, 1);
  g.fillStyle = t.dark;
  for (const x of [10, 15, 20]) g.fillRect(x, 2, 1, 15);
  g.fillStyle = C.gold; g.fillRect(13, 7, 5, 4);
  g.fillStyle = '#d8cdb0'; g.fillRect(11, 19, 1, 3); g.fillRect(19, 19, 1, 3);
  outlined(g, [[9, 22, 13, 3, C.wood]], [[9, 22, 13, 1, C.woodLight], [11, 21, 2, 1, C.fire], [17, 21, 2, 1, C.fire]]);
  return { c, ax: 15, ay: 20 };
}

// Kite streamers flutter; the lantern's flame flickers.
function rotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 120);
  const s = u.facing;
  if (u.type === 'helicopter') {
    const tailX = s > 0 ? x - 14 : x + 13;
    for (let i = 0; i < 6; i++) {
      const wob = (tick + i) % 2;
      rect(ctx, tailX - i * 2 * s, y - 11 + i + wob, 2, 1, i % 2 ? team(u.faction).light : C.gold);
    }
  } else {
    const fl = tick % 3;
    rect(ctx, x - 2, y - 12 - fl, 4, 2 + fl, C.fire);
    rect(ctx, x - 1, y - 11, 2, 1, C.glass);
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
// A curved tiled roof: rows widen downwards and the eaves flick up at the ends.
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
  g.fillStyle = C.gold; g.fillRect(cx - Math.round(w * 0.15) - 1, y - 1, 2, 1); g.fillRect(cx + Math.round(w * 0.15) - 1, y - 1, 2, 1);
}

function rammed(g, x, y, w, h) {
  g.fillStyle = C.loess; g.fillRect(x, y, w, h);
  g.fillStyle = C.loessDark;
  for (let yy = y + 3; yy < y + h; yy += 4) g.fillRect(x, yy, w, 1);
  g.fillStyle = C.loessLight;
  for (let yy = y + 1; yy < y + h; yy += 4) g.fillRect(x, yy, w, 1);
}

function pillars(g, xs, y, h) {
  for (const x of xs) { g.fillStyle = C.O; g.fillRect(x - 1, y, 4, h); g.fillStyle = C.vermilion; g.fillRect(x, y, 2, h); g.fillStyle = '#e05a3a'; g.fillRect(x, y, 1, h); }
}

function flag(g, x, y, t, len = 8) { banner(g, x, y, t, len); }

const BUILD = {
  hq(g, t) {
    // Palace hall: rammed-earth podium, red pillars, two-tier roof
    outlined(g, [[2, 38, 60, 10, C.stone]], [[2, 38, 60, 1, C.stoneLight]]);
    g.fillStyle = C.stoneDark;
    for (let x = 6; x < 62; x += 8) g.fillRect(x, 40, 1, 8);
    outlined(g, [[26, 38, 12, 10, C.stoneLight]], [[26, 41, 12, 1, C.stoneDark], [26, 44, 12, 1, C.stoneDark]]);
    outlined(g, [[8, 22, 48, 16, C.lacquer]], [[8, 22, 48, 1, C.vermilionDark]]);
    pillars(g, [10, 20, 42, 52], 22, 16);
    outlined(g, [[26, 26, 12, 12, C.vermilionDark]], [[31, 26, 2, 12, C.O], [28, 29, 1, 1, C.gold], [35, 29, 1, 1, C.gold], [28, 33, 1, 1, C.gold], [35, 33, 1, 1, C.gold]]);
    for (const x of [14, 46]) { g.fillStyle = C.O; g.fillRect(x - 1, 25, 5, 6); g.fillStyle = C.glass; g.fillRect(x, 26, 3, 4); g.fillStyle = C.vermilionDark; g.fillRect(x + 1, 26, 1, 4); }
    roof(g, 32, 14, 60, 8);
    outlined(g, [[16, 10, 32, 4, C.lacquer]], []);
    pillars(g, [19, 43], 10, 4);
    roof(g, 32, 3, 38, 7);
    flag(g, 3, 20, t, 10);
    flag(g, 56, 20, t, 10);
  },
  barracks(g, t) {
    // Garrison: rammed-earth walls, a tiled roof, a rack of ji
    outlined(g, [[3, 13, 42, 19, C.loess]], []);
    rammed(g, 3, 13, 42, 19);
    roof(g, 24, 5, 46, 8);
    outlined(g, [[19, 20, 10, 12, C.lacquer]], [[23, 20, 1, 12, C.O], [21, 24, 1, 1, C.gold], [26, 24, 1, 1, C.gold]]);
    g.fillStyle = C.wood;
    for (const x of [6, 9, 12]) { g.fillRect(x, 15, 1, 15); g.fillStyle = C.bronze; g.fillRect(x + 1, 16, 2, 1); g.fillStyle = C.wood; }
    g.fillStyle = C.woodDark; g.fillRect(5, 22, 9, 1);
    flag(g, 36, 10, t, 8);
  },
  turret(g, t) {
    // Watchtower: timber stilts, a railed platform and a little curved roof
    outlined(g, [[8, 14, 2, 18, C.woodDark], [22, 14, 2, 18, C.woodDark], [6, 11, 20, 4, C.wood]], [[6, 11, 20, 1, C.woodLight]]);
    g.fillStyle = C.woodDark;
    for (let y = 18; y < 32; y += 5) { g.fillRect(9, y, 14, 1); for (let i = 0; i < 4; i++) g.fillRect(10 + i * 3, y + 1 + (i % 2), 1, 1); }
    g.fillStyle = C.vermilion; for (let x = 7; x < 26; x += 3) g.fillRect(x, 8, 1, 3);
    g.fillStyle = C.vermilionDark; g.fillRect(6, 8, 20, 1);
    roof(g, 16, 2, 22, 5);
    g.fillStyle = C.O; g.fillRect(24, 9, 7, 3);
    g.fillStyle = C.wood; g.fillRect(24, 10, 6, 1);
    g.fillStyle = C.bronzeLight; g.fillRect(30, 10, 1, 1);
    g.fillStyle = t.main; g.fillRect(10, 12, 12, 2);
  },
  wall(g, t) {
    // Rammed-earth rampart with a tiled coping and crenels
    outlined(g, [[0, 6, 16, 26, C.loess]], []);
    rammed(g, 0, 6, 16, 26);
    for (let x = 0; x < 16; x += 6) { g.fillStyle = C.O; g.fillRect(x - 1, 1, 6, 6); g.fillStyle = C.tile; g.fillRect(x, 2, 4, 4); g.fillStyle = C.tileLight; g.fillRect(x, 2, 4, 1); }
    g.fillStyle = t.main; g.fillRect(5, 16, 6, 4);
    g.fillStyle = C.gold; g.fillRect(7, 17, 2, 2);
  },
  mine(g, t) {
    // Bronze foundry: a brick kiln with a glowing mouth, ingots and spade coins
    outlined(g, [[5, 12, 18, 20, C.stoneDark], [10, 2, 6, 11, C.stoneDark]], [[5, 12, 18, 1, C.stone], [10, 2, 6, 1, C.stone]]);
    g.fillStyle = C.stone;
    for (let y = 15; y < 32; y += 4) for (let x = 6 + ((y / 4) % 2) * 3; x < 22; x += 6) g.fillRect(x, y, 4, 1);
    outlined(g, [[10, 22, 8, 7, '#3a1a0e']], [[11, 24, 6, 5, '#e05a1a'], [12, 26, 4, 3, C.fire]]);
    for (const [x, y] of [[24, 28], [27, 28], [25, 25]]) { g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 5, 4); g.fillStyle = C.bronze; g.fillRect(x, y, 3, 2); g.fillStyle = C.bronzeLight; g.fillRect(x, y, 3, 1); }
    // A spade coin on the sign
    outlined(g, [[24, 13, 6, 8, t.dark]], [[25, 14, 4, 6, C.bronze], [26, 13, 2, 1, C.bronze], [26, 18, 1, 2, t.dark]]);
  },
  workshop(g, t) {
    // Arsenal: open timber shed, tiled roof, a half-built cart, sheaves of bolts
    outlined(g, [[3, 12, 2, 20, C.woodDark], [43, 12, 2, 20, C.woodDark], [3, 12, 42, 2, C.wood]], []);
    roof(g, 24, 4, 46, 8);
    outlined(g, [[12, 24, 18, 3, C.wood]], [[12, 24, 18, 1, C.woodLight], [26, 18, 2, 6, C.woodDark]]);
    spokeWheel(g, 15, 28, 3, 0);
    for (const x of [33, 36, 39]) { g.fillStyle = C.O; g.fillRect(x - 1, 20, 3, 12); g.fillStyle = C.wood; g.fillRect(x, 21, 1, 11); g.fillStyle = C.bronzeLight; g.fillRect(x, 20, 1, 1); }
    g.fillStyle = C.vermilion; g.fillRect(32, 25, 9, 1);
    flag(g, 6, 14, t, 7);
  },
  airbase(g, t) {
    // Kite tower: a bamboo scaffold launch platform, kites at rest, a winch
    g.fillStyle = C.O; g.fillRect(29, 4, 34, 2);
    g.fillStyle = C.bamboo; g.fillRect(30, 4, 32, 1);
    for (const x of [31, 41, 51, 61]) { g.fillStyle = C.O; g.fillRect(x - 1, 4, 3, 28); g.fillStyle = C.bamboo; g.fillRect(x, 5, 1, 27); g.fillStyle = C.bambooDark; for (let y = 8; y < 32; y += 6) g.fillRect(x, y, 1, 1); }
    g.fillStyle = C.bambooDark;
    for (let y = 12; y < 32; y += 8) g.fillRect(31, y, 31, 1);
    outlined(g, [[33, 0, 12, 3, t.main], [47, 1, 12, 3, t.dark]], [[33, 0, 12, 1, t.light], [38, 0, 1, 3, C.bambooDark], [52, 1, 1, 3, C.bambooDark]]);
    outlined(g, [[0, 18, 26, 14, C.loess]], []);
    rammed(g, 0, 18, 26, 14);
    roof(g, 13, 12, 30, 6);
    outlined(g, [[9, 24, 8, 8, C.lacquer]], [[12, 24, 1, 8, C.O]]);
    outlined(g, [[44, 24, 8, 6, C.woodDark]], [[47, 24, 2, 6, C.wood]]);
  },
  bridge(g, t) {
    // Plank bridge with a vermilion rail
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 7);
    g.fillStyle = C.wood; g.fillRect(0, 2, 16, 3);
    g.fillStyle = C.woodLight; g.fillRect(0, 2, 16, 1);
    g.fillStyle = C.vermilion; g.fillRect(0, 0, 16, 1); g.fillRect(1, 0, 1, 2); g.fillRect(8, 0, 1, 2); g.fillRect(14, 0, 1, 2);
    g.fillStyle = C.woodDark; for (let x = 3; x < 16; x += 4) g.fillRect(x, 3, 1, 2);
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
    // Loess: layered yellow earth with a thin grassy top
    const base = kind === 'dirtDeep' ? C.earthDeep : kind === 'dirtMid' ? C.earthMid : kind === 'dirtTop' ? C.loess : C.earth;
    g.fillStyle = base; g.fillRect(0, 0, T, T);
    g.fillStyle = kind === 'dirtTop' ? C.loessDark : C.earthDeep;
    for (let y = 4 + (variant % 2); y < T; y += 5) g.fillRect(0, y, T, 1);
    speckle(4, C.pebble, C.pebbleDark, kind === 'dirtTop' ? 4 : 0);
    if (kind === 'dirtTop') {
      g.fillStyle = C.grass; g.fillRect(0, 0, T, 2);
      g.fillStyle = C.grassLight; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.grassDark;
      for (let x = 0; x < T; x += 3) if (hash(seed + x) < 0.5) g.fillRect(x, 2, 1, 1);
      g.fillStyle = C.loessLight; g.fillRect(0, 3, T, 1);
    }
  } else {
    // Ink-grey cliff ledges with a mossy top
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.stone; g.fillRect(0, 0, T, T);
    g.fillStyle = C.stoneDark; g.fillRect(0, T - 5, T, 4);
    g.fillRect(variant % 2 ? 4 : 10, 5, 1, 6); g.fillRect(variant % 2 ? 11 : 6, 8, 1, 4);
    g.fillStyle = C.stoneLight; g.fillRect(variant % 2 ? 5 : 11, 5, 1, 3);
    g.fillStyle = C.grass; g.fillRect(0, 0, T, 3);
    g.fillStyle = C.grassLight; g.fillRect(0, 0, T, 1);
    g.fillStyle = C.grassDark; g.fillRect(0, 3, T, 1);
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Grass tufts, plum-blossom petals and bamboo shoots.
function surface(ctx, x, y, ground, h) {
  ctx.fillStyle = C.grass;
  ctx.fillRect(x + Math.floor(h * 12), y - 2, 1, 2);
  if (!ground) return;
  if (h > 0.88) {
    ctx.fillStyle = C.bamboo; ctx.fillRect(x + 6, y - 5, 1, 5); ctx.fillRect(x + 9, y - 3, 1, 3);
    ctx.fillStyle = C.bambooDark; ctx.fillRect(x + 6, y - 3, 1, 1);
  } else if (h > 0.72) {
    ctx.fillStyle = '#f0a8b8'; ctx.fillRect(x + 3, y - 1, 1, 1); ctx.fillRect(x + 7, y - 2, 1, 1); ctx.fillRect(x + 12, y - 1, 1, 1);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};

// A karst peak: a tall rounded pillar of rock, ink-wash style.
function peak(k, col, edge, minH, maxH) {
  const key = `pk${k}${col}`;
  if (scenery[key]) return scenery[key];
  const h = minH + Math.floor(hash(k + 1) * (maxH - minH));
  const w = 18 + Math.floor(hash(k + 2) * 20);
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const half = Math.round((w / 2) * Math.min(1, 0.35 + Math.sqrt(t) * 0.9));
    const lean = Math.round(Math.sin(t * 3 + k) * 2);
    g.fillStyle = col; g.fillRect(Math.round(w / 2) - half + lean, y, half * 2, 1);
    g.fillStyle = edge; g.fillRect(Math.round(w / 2) - half + lean, y, 1, 1);
  }
  // A pine clinging to the peak
  if (hash(k + 3) < 0.6) {
    const px = Math.round(w / 2 + (hash(k + 4) - 0.5) * w * 0.4);
    const py = Math.round(h * 0.2 + hash(k + 5) * h * 0.2);
    g.fillStyle = '#4a5a52'; g.fillRect(px - 3, py, 7, 1); g.fillRect(px - 2, py - 1, 5, 1); g.fillRect(px, py + 1, 1, 3);
  }
  scenery[key] = c;
  return c;
}

function bambooClump(k) {
  const key = `bam${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(22, 46);
  for (let i = 0; i < 4; i++) {
    const x = 3 + i * 5 + Math.floor(hash(k + i) * 2);
    const top = 4 + Math.floor(hash(k + i + 10) * 14);
    g.fillStyle = C.bambooDark; g.fillRect(x, top, 2, 46 - top);
    g.fillStyle = C.bamboo; g.fillRect(x, top, 1, 46 - top);
    g.fillStyle = C.bambooDark; for (let y = top + 5; y < 46; y += 7) g.fillRect(x, y, 2, 1);
    g.fillStyle = '#5e8a3a';
    for (let j = 0; j < 4; j++) { const ly = top + j * 6; g.fillRect(x + (j % 2 ? 2 : -4), ly, 4, 1); g.fillRect(x + (j % 2 ? 3 : -5), ly + 1, 3, 1); }
  }
  scenery[key] = c;
  return c;
}

function pineTree(k) {
  const key = `pine${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(30, 40);
  g.fillStyle = '#4a3424'; g.fillRect(14, 14, 3, 26); g.fillRect(12, 20, 3, 2); g.fillRect(17, 16, 4, 2);
  for (const [x, y, w] of [[3, 12, 14], [14, 8, 14], [6, 4, 12], [16, 15, 12], [1, 18, 12]]) {
    g.fillStyle = C.pineDark; g.fillRect(x, y + 1, w, 3);
    g.fillStyle = C.pine; g.fillRect(x + 1, y, w - 2, 2);
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
  const t = performance.now() / 1000;

  // The red sun, fixed far away
  disc(ctx, Math.round(bw * 0.7), Math.round(Math.min(40, groundY * 0.18) - camAY * 0.02), 12, '#d0442a');

  // Cranes crossing the sky
  for (let i = 0; i < 4; i++) {
    const cx = Math.round(((t * (8 + i * 2) + i * 113 - camAX * 0.15) % (bw + 60) + bw + 60) % (bw + 60)) - 30;
    const cy = Math.round(30 + hash(i + 80) * groundY * 0.3 - camAY * 0.1);
    const flap = Math.floor(t * 3 + i) % 2;
    ctx.fillStyle = C.white; ctx.fillRect(cx - 1, cy, 4, 1); ctx.fillRect(cx + 3, cy - 1, 2, 1);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(cx - 3, cy - (flap ? 2 : -1), 3, 1); ctx.fillRect(cx + 1, cy - (flap ? 2 : -1), 2, 1);
    ctx.fillStyle = C.red; ctx.fillRect(cx + 4, cy - 1, 1, 1);
  }

  // Layers of ink-wash peaks with mist between them
  const layer = (p, count, col, edge, minH, maxH, base, seed) => {
    const spacing = ((WORLD_W / G) * p) / count;
    const off = Math.round(camAX * p);
    for (let i = Math.floor((off - 40) / spacing); i * spacing - off < bw + 40; i++) {
      const k = ((i % count) + count) % count;
      const img = peak(k + seed, col, edge, minH, maxH);
      ctx.drawImage(img, Math.round(i * spacing - off + hash(k + seed) * spacing * 0.6), groundY - base - img.height);
    }
  };
  layer(0.1, 10, '#b4bec4', '#c6ced2', 70, 130, 20, 0);
  ctx.globalAlpha = 0.5; rect(ctx, 0, groundY - 40, bw, 24, C.mist); ctx.globalAlpha = 1;
  layer(0.22, 12, '#8e9aa2', '#a4aeb4', 50, 100, 12, 30);
  ctx.globalAlpha = 0.45; rect(ctx, 0, groundY - 26, bw, 18, C.mist); ctx.globalAlpha = 1;
  layer(0.35, 14, '#6a7680', '#7e8a92', 30, 64, 6, 60);
  ctx.globalAlpha = 0.35; rect(ctx, 0, groundY - 14, bw, 12, C.mist); ctx.globalAlpha = 1;

  // Bamboo groves and gnarled pines in front
  const count = 48;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    if (hash(k + 90) < 0.3) continue;
    const img = hash(k + 91) < 0.6 ? bambooClump(k) : pineTree(k);
    ctx.drawImage(img, Math.round(i * spacing - jOff + hash(k) * spacing * 0.5) - 11, groundY - img.height + 2);
  }
}

// Bamboo scaffolding lashed together while a building goes up.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = C.bambooDark;
  for (let sx = x + 1; sx < x + w; sx += 7) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(x, sy, w, 1);
  ctx.fillStyle = C.bamboo;
  for (let sx = x + 1; sx < x + w; sx += 7) for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(sx, sy, 1, 1);
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  const t = team(b.faction);
  if (b.type === 'hq' || b.type === 'barracks') {
    // Banners ripple
    const fx = b.type === 'hq' ? [4, 57] : [37];
    for (const bx of fx) rect(ctx, x + bx + 4, y + (b.type === 'hq' ? 21 : 11) + (tick % 2), 1, 4, t.light);
  } else if (b.type === 'mine') {
    // Furnace glow and smoke
    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(ms / 200);
    rect(ctx, x + 11, y + 24, 6, 5, '#ffd27a');
    ctx.globalAlpha = 1;
    for (let i = 0; i < 2; i++) {
      const k = (ms / 1700 + i / 2) % 1;
      ctx.globalAlpha = 0.5 * (1 - k);
      rect(ctx, x + 12 + Math.round(Math.sin(k * 5 + i) * 2), y - Math.round(k * 12), 3, 3, '#6a6460');
      ctx.globalAlpha = 1;
    }
  } else if (b.type === 'airbase') {
    rect(ctx, x + 33 + (tick % 3), y, 1, 1, t.light);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  if (p.kind === 'bullet') {
    // Crossbow bolt
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.wood);
    rect(ctx, x - dx, y - dy, 1, 1, C.wood);
    rect(ctx, x, y, 2, 1, C.bronzeLight);
  } else if (p.kind === 'bomb') {
    // Fire pot
    const fl = Math.floor(performance.now() / 90) % 2;
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, '#8a5a3a');
    rect(ctx, x, y - 3 - fl, 1, 2 + fl, C.fire);
  } else if (p.kind === 'lob') {
    // Stone from the thrower
    rect(ctx, x - dx, y - dy, 1, 1, 'rgba(160,150,130,0.6)');
    rect(ctx, x - 1, y - 1, 4, 4, C.O);
    rect(ctx, x - 1, y - 1, 3, 3, C.stone);
    rect(ctx, x - 1, y - 1, 1, 1, C.stoneLight);
  } else {
    // Great bolt from the bolt cart
    rect(ctx, x - dx * 2, y - dy * 2, 2, 1, C.woodDark);
    rect(ctx, x - dx, y - dy, 2, 1, C.wood);
    rect(ctx, x, y, 3, 1, C.bronzeLight);
  }
}

function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(14, 6);
  outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, C.lamellar], [11, 3, 2, 2, C.boot]], [[0, 1, 2, 2, C.hair], [5, 3, 2, 1, t.main]]);
  return { c, ax: 7, ay: 5 };
}

export default {
  id: 'warring',
  name: 'Warring States',
  palette,
  teamBase: LAMELLAR,
  roofBase: [0.3, 0.32, 0.34],
  soldier: buildSoldier,
  vehicle: { jeep: buildChariot, tank: buildBoltCart, artillery: buildThrower },
  aircraft: { helicopter: buildKite, bomber: buildLantern },
  buildings: BUILD,
  drawTile,
  surface,
  background,
  skyTop: palette.sky[0],
  rotor,
  construction,
  animate,
  projectile,
  explosion: { rim: '#9a7a4a', body: '#d8b47a', core: palette.fire, smoke: '#8a7e6a', smoke2: '#b0a48a' },
  corpse,
  debris: { '#7a4a24': '#c89a5c', '#5c361a': '#8e8c84' },
  minimap: { sky: '#b2c0c8', ground: '#c89a5c', platform: '#8e8c84', bridge: '#a8743e', ramp: '#8e8c84', surface: '#8aa84a' },
  names: {
    soldier: 'Halberdier', heavy: 'Guardsman', scout: 'Spy', engineer: 'Mohist', sniper: 'Crossbow',
    jeep: 'Chariot', tank: 'Bolt Cart', artillery: 'Stone Thrower', helicopter: 'War Kite', bomber: 'Sky Lantern',
    hq: 'Palace', barracks: 'Garrison', turret: 'Watchtower', wall: 'Rampart', mine: 'Foundry', workshop: 'Arsenal',
    airbase: 'Kite Tower', bridge: 'Bridge', ramp: 'Steps',
  },
  // Units are shown with their own sprites in menus.
  spriteIcons: true,
  icons: { hq: '👑', barracks: '🛡️', turret: '🏹', wall: '🧱', mine: '⚒️', workshop: '🪚', airbase: '🪁', bridge: '🌉', ramp: '🪜' },
};
