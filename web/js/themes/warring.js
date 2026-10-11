// Warring States: China, c. 475–221 BC. Seven kingdoms fight across loess
// plains under ink-wash mountains: halberdiers and crossbowmen, chariots and
// siege engines, Mohist engineers, spies — and kites and sky lanterns for an
// air force. Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team, sideOf } from '../pixel.js';

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
function qinSoldier(type, f, frame) {
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
  const K = kd(f);
  const [c, g] = canvas(32, 22);
  const legs = frame
    ? [[17, 15, 2, 5], [20, 15, 2, 4], [25, 15, 2, 4], [28, 15, 2, 5]]
    : [[16, 15, 2, 4], [21, 15, 2, 5], [24, 15, 2, 5], [29, 15, 2, 4]];
  outlined(g, [
    ...legs.map((l) => [...l, '#4a3220']), [15, 10, 15, 5, '#6e4a2c'], [27, 6, 3, 6, '#6e4a2c'], [29, 5, 3, 3, '#6e4a2c'],
    [2, 9, 12, 5, K.dark], [5, 4, 3, 5, K.armor], [9, 3, 3, 6, K.armor], [5, 2, 3, 2, C.hair], [9, 1, 3, 2, K.helm],
    [12, 12, 4, 1, C.woodDark],
  ], [
    [15, 11, 14, 1, '#8a5e38'], [30, 6, 1, 1, C.O], [28, 6, 1, 4, '#2a1a10'], [2, 10, 12, 1, K.trim],
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
  const K = kd(f);
  const [c, g] = canvas(32, 18);
  outlined(g, [
    [2, 9, 24, 3, C.wood], [6, 5, 18, 4, C.woodDark], [22, 0, 2, 13, C.wood], [4, 3, 3, 6, K.armor], [4, 1, 3, 2, C.hair],
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
  const K = kd(f);
  const [c, g] = canvas(30, 26);
  outlined(g, [
    [3, 19, 22, 3, C.wood], [10, 8, 2, 12, C.woodDark], [16, 8, 2, 12, C.woodDark], [10, 7, 8, 2, C.wood],
    [4, 13, 3, 2, C.wood], [7, 11, 3, 2, C.wood], [10, 9, 3, 2, C.wood], [13, 7, 3, 2, C.wood], [16, 5, 3, 2, C.wood],
    [19, 3, 3, 2, C.wood], [22, 1, 3, 2, C.wood], [25, 2, 1, 4, '#d8cdb0'], [24, 6, 3, 3, C.stone],
  ], [
    [3, 19, 22, 1, C.woodLight], [24, 6, 2, 1, C.stoneLight], [10, 7, 8, 1, C.woodLight], [12, 15, 4, 2, t.main], ...(K.id === 'qin' ? [] : [[10, 9, 2, 1, K.trim], [16, 9, 2, 1, K.trim], [24, 8, 2, 1, K.accent]]),
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
  const K = kd(f);
  const [c, g] = canvas(32, 18);
  outlined(g, [
    [6, 4, 20, 3, t.main], [2, 2, 6, 2, t.main], [24, 3, 5, 3, K.kite], [28, 4, 2, 2, K.accent],
    [13, 9, 4, 4, K.armor], [13, 7, 4, 2, C.hair],
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
  const K = kd(f);
  const [c, g] = canvas(30, 26);
  disc(g, 15, 9, 9, C.O);
  disc(g, 15, 9, 8, t.main);
  disc(g, 14, 8, 6, t.light);
  g.fillStyle = C.O; g.fillRect(9, 0, 13, 2); g.fillRect(10, 17, 11, 2);
  g.fillStyle = K.dark; g.fillRect(10, 0, 11, 1); g.fillRect(11, 17, 9, 1);
  g.fillStyle = t.dark;
  for (const x of [10, 15, 20]) g.fillRect(x, 2, 1, 15);
  g.fillStyle = K.accent; g.fillRect(13, 7, 5, 4);
  g.fillStyle = '#d8cdb0'; g.fillRect(11, 19, 1, 3); g.fillRect(19, 19, 1, 3);
  outlined(g, [[9, 22, 13, 3, C.wood]], [[9, 22, 13, 1, C.woodLight], [11, 21, 2, 1, C.fire], [17, 21, 2, 1, C.fire]]);
  return { c, ax: 15, ay: 20 };
}

// Kite streamers flutter; the lantern's flame flickers.
function qinRotor(ctx, u, x, y) {
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
function roof(g, cx, y, w, h, R) {
  // R = [tile, tileDark, tileLight, finial] for the other kingdoms' roofs
  const [tl, td, tli, fin] = R || [C.tile, C.tileDark, C.tileLight, C.gold];
  for (let i = 0; i < h; i++) {
    const half = Math.round(((i + 1) / h) * (w / 2) * 0.7 + (w / 2) * 0.3);
    g.fillStyle = C.O; g.fillRect(cx - half - 1, y + i, half * 2 + 2, 1);
    g.fillStyle = i % 2 ? td : tl; g.fillRect(cx - half, y + i, half * 2, 1);
  }
  const half = Math.round(w / 2);
  g.fillStyle = C.O; g.fillRect(cx - half - 2, y + h - 3, 2, 3); g.fillRect(cx + half, y + h - 3, 2, 3);
  g.fillStyle = tl; g.fillRect(cx - half - 1, y + h - 2, 1, 2); g.fillRect(cx + half, y + h - 2, 1, 2);
  g.fillStyle = tli; g.fillRect(cx - Math.round(w * 0.15), y, Math.round(w * 0.3), 1);
  g.fillStyle = fin; g.fillRect(cx - Math.round(w * 0.15) - 1, y - 1, 2, 1); g.fillRect(cx + Math.round(w * 0.15) - 1, y - 1, 2, 1);
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

function qinAnimate(ctx, b, x, y) {
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

function qinProjectile(ctx, p, x, y, dx, dy) {
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

function qinCorpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(14, 6);
  outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, C.lamellar], [11, 3, 2, 2, C.boot]], [[0, 1, 2, 2, C.hair], [5, 3, 2, 1, t.main]]);
  return { c, ax: 7, ay: 5 };
}

// ══ The seven kingdoms ═════════════════════════════════════════════════════
// Qin wears the original art above; Chu, Qi, Zhao, Yan, Wei and Han get their
// own uniforms, headgear, a signature war machine and their own palace,
// barracks and money-maker. Same units and stats for all — only the paint and
// the jokes differ.
const KD = {
  qin: {
    id: 'qin', armor: '#4a3a30', armorL: '#6e5a48', armorD: '#2e241e', robe: '#5a5048', robeD: '#3a342e',
    trim: '#c43a22', dark: '#241612', accent: '#e8c060', accentL: '#f6e4a0', helm: '#c08a40', kite: '#f2e2b8',
  },
  chu: {
    id: 'chu', armor: '#2a1c1a', armorL: '#5a2e26', armorD: '#160e0c', robe: '#8e2c20', robeD: '#5e1a12',
    trim: '#e04a2a', dark: '#1a0e0c', accent: '#f0a830', accentL: '#f8d070', helm: '#2a1c1a', kite: '#e04a2a',
    roof: ['#8a3424', '#621e14', '#b0503a', '#f0a830'],
  },
  qi: {
    id: 'qi', armor: '#2e4a74', armorL: '#527099', armorD: '#1c2e4c', robe: '#e2dccb', robeD: '#b0aa98',
    trim: '#3ab0b8', dark: '#1c2e4c', accent: '#f4f4f0', accentL: '#ffffff', helm: '#527099', kite: '#f4f4f0',
    roof: ['#2e6e70', '#1c4c4e', '#4e9496', '#f4f4f0'],
  },
  zhao: {
    id: 'zhao', armor: '#4e5e30', armorL: '#6e8244', armorD: '#2e3a1c', robe: '#a06a38', robeD: '#6e4624',
    trim: '#e0a040', dark: '#2e3a1c', accent: '#e6d4a6', accentL: '#f6ead0', helm: '#6e8244', kite: '#e0a040',
    roof: ['#3e6e3a', '#284c26', '#5e9254', '#e0a040'],
  },
  yan: {
    id: 'yan', armor: '#6e82a0', armorL: '#9cb0c8', armorD: '#46546c', robe: '#4e5868', robeD: '#343c4a',
    trim: '#f4f8fc', dark: '#2e3646', accent: '#8a6440', accentL: '#b88e5e', helm: '#8a6440', kite: '#f4f8fc',
    roof: ['#4a5a72', '#34405a', '#6a7a92', '#f4f8fc'],
  },
  wei: {
    id: 'wei', armor: '#3c404c', armorL: '#727a8c', armorD: '#22252e', robe: '#5e3c66', robeD: '#3e2646',
    trim: '#a060c8', dark: '#22252e', accent: '#c08a40', accentL: '#e0b060', helm: '#727a8c', kite: '#a060c8',
    roof: ['#4e3c62', '#342846', '#6e5a86', '#c08a40'],
  },
  han: {
    id: 'han', armor: '#94722c', armorL: '#bc9a48', armorD: '#5e4818', robe: '#3e6664', robeD: '#284442',
    trim: '#f0d870', dark: '#3a2c10', accent: '#b4bcc4', accentL: '#e0e6ea', helm: '#b4bcc4', kite: '#f0d870',
    roof: ['#7e6a34', '#5a4a22', '#a48c4c', '#f0d870'],
  },
};
const sideId = (f) => (KD[sideOf(f)] ? sideOf(f) : 'qin');
const kd = (f) => KD[sideId(f)];
const IRON = '#c8ced4';
const SWEAT = '#bfe6ff';
const SACK = '#c8a868';
const SALT = '#f4f4ee';
const HORSE = '#7a5434';

// Headgear, one look per kingdom: [parts, details]
function hat(K) {
  switch (K.id) {
    case 'chu': // tall black lacquer cap with a phoenix plume
      return [[[6, 1, 6, 2, K.armorD], [8, 0, 4, 1, K.armorD], [3, 0, 3, 1, K.accent], [4, 1, 2, 1, K.accent]],
        [[6, 2, 6, 1, K.trim], [3, 0, 1, 1, K.trim]]];
    case 'qi': // indigo headscarf with trailing ties
      return [[[6, 1, 6, 2, K.armor], [5, 2, 1, 4, K.armor], [4, 5, 1, 2, K.armor]], [[6, 1, 6, 1, K.armorL], [7, 2, 4, 1, K.robe]]];
    case 'zhao': // nomad felt cap with a fur brim and ear flap
      return [[[7, 0, 4, 1, K.armor], [6, 1, 6, 2, K.armor], [5, 2, 1, 3, K.accent]], [[6, 2, 6, 1, K.accent], [8, 0, 2, 1, K.armorL]]];
    case 'yan': // a big round fur hat
      return [[[5, 0, 8, 3, K.accent], [5, 3, 2, 3, K.accent]], [[6, 0, 2, 1, K.accentL], [9, 1, 2, 1, K.accentL], [12, 0, 1, 1, K.accentL], [5, 2, 8, 1, '#6a4a2c']]];
    case 'wei': // iron helmet with neck guard and a crest stub
      return [[[5, 1, 8, 3, K.armor], [5, 4, 2, 3, K.armor], [8, 0, 2, 1, K.trim]], [[5, 1, 8, 1, K.armorL], [5, 3, 8, 1, K.armorD], [6, 4, 1, 2, K.armorL]]];
    default: // Han: a small cap, and a bead of nervous sweat
      return [[[6, 1, 6, 2, K.armorD], [13, 2, 1, 2, SWEAT]], [[6, 2, 6, 1, K.trim]]];
  }
}

// Wei's famous kit: everyone carries three days' rations on their back.
const PACK = [[[1, 6, 4, 6, SACK]], [[1, 8, 4, 1, '#8a6a3a'], [2, 6, 2, 1, '#e0c890']]];

function kSoldier(type, f, frame) {
  const K = kd(f);
  if (K.id === 'zhao' && type === 'scout') return horseArcher(f, frame);
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const s = K.id;
  const run = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const feet = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  // Zhao wear trousers (revolutionary!) and tall riding boots; everyone else wears robes
  const legs = (col) => s === 'zhao'
    ? [...run.map(([x, y, w]) => [x, y, w, 2, K.robe]), ...run.map(([x, y, w]) => [x, y + 2, w, 1, C.boot]), ...feet.map((b) => [...b, C.boot])]
    : [...run.map((l) => [...l, col]), ...feet.map((b) => [...b, C.boot])];
  const face = [[10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark]];
  const [hp, hd] = hat(K);
  let parts = [];
  let details = [];
  const pack = s === 'wei' ? PACK : [[], []];
  if (type === 'scout') {
    if (s === 'chu') {
      // Shaman: antler headdress, red robe, a staff with a bronze bell
      parts = [...legs(K.robeD), [5, 8, 7, 5, K.robe], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, K.armorD],
        [5, 0, 1, 3, '#e0d0a8'], [4, 0, 1, 1, '#e0d0a8'], [11, 0, 1, 1, '#e0d0a8'], [12, 0, 1, 3, '#e0d0a8'], [13, 0, 1, 1, '#e0d0a8'],
        [14, 3, 1, 12, C.wood], [13, 1, 3, 2, C.bronze]];
      details = [...face, [7, 5, 2, 1, K.trim], [5, 10, 7, 1, t.main], [5, 12, 7, 1, K.armorD], [13, 1, 3, 1, C.bronzeLight],
        [15, 4, 1, 3, K.accent], [8, 9, 1, 1, K.accent]];
    } else if (s === 'qi') {
      // Salt smuggler: straw hat, indigo jacket, a bulging sack of salt
      parts = [...legs(K.armorD), [1, 5, 5, 7, SALT], [5, 8, 7, 4, K.armor], [6, 4, 6, 4, C.skin],
        [3, 3, 12, 1, '#c8aa6a'], [5, 2, 8, 1, '#c8aa6a'], [7, 1, 4, 1, '#c8aa6a']];
      details = [[10, 5, 1, 1, C.O], [8, 6, 3, 1, C.skinDark], [3, 3, 12, 1, '#a8884a'], [8, 1, 2, 1, '#e0c88a'],
        [2, 5, 3, 1, '#c0c0b8'], [1, 8, 4, 1, '#d8d8d0'], [5, 10, 7, 1, t.main], [5, 8, 1, 4, K.armorL]];
    } else if (s === 'yan') {
      // Ski scout: snow-white coat, fur hat, skis and poles
      const sl = frame ? [[6, 12, 2, 2], [9, 12, 2, 2]] : [[5, 12, 2, 2], [10, 12, 2, 2]];
      parts = [...sl.map((l) => [...l, K.robe]), [2, 15, 15, 1, C.woodLight], [17, 14, 1, 1, C.woodLight],
        [5, 8, 7, 4, '#e8eef4'], [6, 3, 6, 5, C.skin], ...hp,
        [3, 9, 1, 4, C.woodDark], [14, 9, 1, 4, C.woodDark]];
      details = [...face, ...hd, [6, 8, 6, 1, t.main], [5, 10, 7, 1, '#c8d4e0'], [2, 15, 15, 1, C.wood],
        ...sl.map(([x]) => [x - 1, 14, 3, 1, C.boot])];
    } else if (s === 'wei') {
      // Ration runner: a tower of food sacks and a steamed bun in hand
      parts = [...legs(K.robe), [0, 1, 5, 4, SACK], [0, 5, 5, 4, '#b8985a'], [0, 9, 5, 3, SACK],
        [5, 8, 7, 4, K.armor], [6, 3, 6, 5, C.skin], ...hp, [12, 8, 3, 2, '#f4ead8']];
      details = [...face, ...hd, [0, 3, 5, 1, '#8a6a3a'], [0, 7, 5, 1, '#8a6a3a'], [0, 10, 5, 1, '#8a6a3a'],
        [5, 9, 7, 1, t.main], [5, 11, 7, 1, K.armorL], [13, 8, 1, 1, '#d8c8a8']];
    } else {
      // Han lookout: hides behind a huge shield, eyes wide, sweating buckets
      parts = [...legs(K.robe), [5, 8, 6, 4, K.armor], [6, 3, 6, 5, C.skin], ...hp, [5, 2, 1, 2, SWEAT],
        [11, 3, 5, 12, K.dark]];
      details = [[9, 5, 2, 1, C.white], [10, 5, 1, 1, C.O], [8, 7, 2, 1, C.O], ...hd, [5, 9, 6, 1, t.main],
        [12, 4, 3, 10, t.main], [11, 3, 5, 1, K.trim], [13, 6, 1, 6, K.trim], [12, 8, 3, 1, K.trim]];
    }
  } else if (type === 'heavy') {
    const armLegs = s === 'wei'
      ? [...run.map((l) => [...l, K.armor]), ...feet.map((b) => [...b, C.boot])]
      : legs(K.armorD);
    parts = [...armLegs, ...pack[0], [4, 8, 9, 4, K.armor], [6, 3, 6, 5, C.skin], ...hp];
    details = [...face, ...hd, ...pack[1], [4, 9, 9, 1, K.armorL], [4, 11, 9, 1, K.armorL], [6, 8, 1, 4, t.main], [10, 8, 1, 4, t.main]];
    if (s === 'wei') {
      // Wuzu ironclad: armoured head to toe, plus the rations, plus a ji
      parts.push([3, 2, 3, 4, '#b8985a'], [13, 0, 1, 15, C.wood], [14, 2, 3, 1, IRON], [12, 1, 1, 3, IRON]);
      details.push([3, 4, 3, 1, '#8a6a3a'], ...run.map(([x]) => [x, 13, 2, 1, K.armorL]), [13, 4, 1, 1, t.main]);
    } else if (s === 'yan') {
      // Bear hat: fur-trimmed armour and a woodsman's axe
      parts.push([1, 7, 5, 6, K.dark], [13, 3, 1, 10, C.wood], [14, 3, 2, 3, IRON]);
      details.push([2, 8, 3, 4, t.main], [1, 7, 5, 1, K.trim], [3, 9, 1, 3, C.white], [2, 10, 3, 1, C.white], [4, 8, 9, 1, K.accentL], [14, 3, 2, 1, C.white]);
    } else if (s === 'han') {
      // Big shield: nearly as tall as he is
      parts.push([13, 4, 1, 7, IRON], [12, 9, 3, 1, C.bronzeDark], [0, 5, 6, 10, K.dark]);
      details.push([1, 6, 4, 8, t.main], [0, 5, 6, 1, K.trim], [2, 7, 2, 6, K.trim], [13, 4, 1, 1, C.white]);
    } else {
      parts.push([13, 4, 1, 7, IRON], [12, 9, 3, 1, C.bronzeDark], [1, 7, 5, 6, K.dark]);
      details.push([2, 8, 3, 4, t.main], [1, 7, 5, 1, K.trim]);
      if (s === 'chu') details.push([3, 9, 1, 2, K.accent], [2, 9, 3, 1, K.accent]);
      if (s === 'qi') details.push([2, 10, 1, 1, K.trim], [3, 9, 1, 1, K.trim], [4, 10, 1, 1, K.trim]);
      if (s === 'zhao') details.push([1, 7, 1, 6, K.accent], [3, 9, 1, 2, K.accent]);
    }
  } else if (type === 'engineer') {
    parts = [...legs(K.robeD), ...pack[0], [5, 8, 7, 4, K.robe], [6, 3, 6, 5, C.skin], ...hp];
    details = [...face, ...hd, ...pack[1], [5, 10, 7, 1, t.main]];
    if (s === 'chu') {
      // Lacquerer: a pot of red lacquer and a fine brush
      parts.push([12, 10, 4, 4, C.bronzeDark], [11, 6, 1, 4, C.wood]);
      details.push([12, 10, 4, 1, K.trim], [13, 12, 2, 1, K.trim], [11, 5, 1, 1, K.trim]);
    } else if (s === 'qi') {
      // Salt hauler: another sack of salt (there is always another sack of salt)
      parts.push([12, 6, 5, 6, SALT]);
      details.push([12, 6, 5, 1, '#c8c8c0'], [13, 9, 3, 1, '#d8d8d0'], [11, 8, 1, 1, C.skin]);
    } else if (s === 'zhao') {
      // Stable hand: a pitchfork of hay
      parts.push([14, 3, 1, 12, C.wood], [13, 1, 3, 2, IRON], [12, 0, 5, 1, '#e8cc60']);
      details.push([14, 1, 1, 1, C.O], [13, 0, 2, 1, '#f6e08a']);
    } else if (s === 'yan') {
      // Snow shoveller
      parts.push([14, 4, 1, 9, C.wood], [13, 4, 3, 1, C.wood], [13, 12, 3, 3, '#a8b0b8']);
      details.push([13, 12, 3, 1, C.white]);
    } else if (s === 'wei') {
      // Canal engineer: a striped surveying rod
      parts.push([14, 1, 1, 14, C.wood]);
      details.push([14, 2, 1, 2, K.trim], [14, 6, 1, 2, C.white], [14, 10, 1, 2, K.trim]);
    } else {
      // Essayist: a scroll of very persuasive legalism and a brush
      parts.push([12, 8, 5, 6, C.paper], [11, 5, 1, 4, C.wood]);
      details.push([13, 9, 3, 1, '#4a3a30'], [13, 11, 3, 1, '#4a3a30'], [13, 13, 2, 1, '#4a3a30'], [11, 4, 1, 1, C.O], [12, 8, 5, 1, '#d8c490']);
    }
  } else if (type === 'sniper') {
    if (s === 'qi') {
      // Debater from the Jixia Academy: a scroll of counter-arguments, mouth open
      parts = [...legs(K.robeD), [5, 8, 7, 5, K.robe], [6, 3, 6, 5, C.skin], [6, 0, 5, 3, K.armorD], [5, 2, 7, 1, K.armorD],
        [12, 6, 5, 6, C.paper], [12, 5, 1, 8, C.wood], [16, 5, 1, 8, C.wood]];
      details = [[10, 5, 1, 1, C.O], [10, 7, 1, 1, C.O], [7, 7, 2, 1, C.skinDark], [5, 10, 7, 1, t.main], [6, 1, 5, 1, K.armor],
        [13, 7, 3, 1, '#4a3a30'], [13, 9, 3, 1, '#4a3a30'], [13, 11, 2, 1, '#4a3a30'], [5, 12, 7, 1, K.robeD]];
    } else {
      parts = [...legs(K.robe), ...pack[0], [5, 8, 7, 4, K.armor], [6, 3, 6, 5, C.skin], ...hp];
      details = [...face, ...hd, ...pack[1], [5, 9, 7, 1, K.armorL], [7, 8, 1, 4, t.main]];
      if (s === 'chu' || s === 'zhao') {
        // A recurve bow, lacquered (Chu) or horn-backed (Zhao)
        const col = s === 'chu' ? K.armorD : C.woodDark;
        parts.push([15, 4, 1, 9, col], [14, 3, 1, 1, col], [14, 13, 1, 1, col], [10, 8, 7, 1, C.wood]);
        details.push([14, 4, 1, 9, '#d8cdb0'], [15, 6, 1, 1, K.trim], [15, 10, 1, 1, K.trim], [16, 8, 1, 1, IRON], [10, 8, 1, 1, K.accent]);
      } else if (s === 'han') {
        // The best crossbow under heaven, and he knows it
        parts.push([9, 9, 10, 2, C.wood], [18, 4, 1, 11, C.woodDark]);
        details.push([17, 5, 1, 9, '#d8cdb0'], [12, 10, 2, 1, K.trim], [14, 9, 1, 1, C.bronzeLight], [9, 9, 10, 1, C.woodLight], [18, 4, 1, 1, K.trim], [18, 14, 1, 1, K.trim]);
      } else {
        // Crossbow (Wei's is extra heavy; Yan's has a fur grip)
        parts.push([10, 9, 8, s === 'wei' ? 2 : 1, C.wood], [17, 6, 1, 7, C.woodDark]);
        details.push([16, 8, 1, 3, '#d8cdb0'], [12, 10, 1, 1, C.bronze], [18, 9, 1, 1, C.bronzeLight]);
        if (s === 'yan') details.push([10, 9, 2, 1, K.accentL]);
      }
    }
  } else {
    // Line infantry: each kingdom's favourite pole-arm
    parts = [...legs(K.robe), ...pack[0], [5, 8, 7, 4, K.armor], [6, 3, 6, 5, C.skin], ...hp];
    details = [...face, ...hd, ...pack[1], [5, 9, 7, 1, K.armorL], [7, 8, 1, 4, t.main], [9, 8, 1, 4, t.main]];
    if (s !== 'zhao') details.push([5, 11, 7, 1, K.robeD]);
    if (s === 'chu') { parts.push([13, 0, 1, 15, C.wood], [14, 1, 3, 2, C.bronze], [12, 3, 1, 3, K.trim]); details.push([14, 1, 3, 1, C.bronzeLight]); }
    else if (s === 'qi') { parts.push([13, 2, 1, 13, C.wood], [13, 0, 1, 2, IRON], [12, 3, 3, 1, K.trim]); }
    else if (s === 'zhao') {
      // A sabre forward and a bow slung behind
      parts.push([3, 5, 1, 7, C.woodDark], [11, 9, 2, 1, C.woodDark], [13, 7, 1, 2, IRON], [14, 5, 1, 2, IRON], [15, 4, 1, 1, IRON]);
      details.push([4, 6, 1, 5, '#d8cdb0']);
    } else if (s === 'yan') { parts.push([13, 2, 1, 13, C.wood], [13, 0, 1, 2, IRON], [12, 3, 3, 2, K.accent]); details.push([12, 3, 3, 1, K.accentL]); }
    else if (s === 'wei') { parts.push([13, 0, 1, 15, C.wood], [14, 2, 3, 1, IRON], [12, 1, 1, 3, IRON]); details.push([13, 4, 1, 1, t.main]); }
    else { parts.push([12, 8, 3, 2, C.bronze], [13, 2, 1, 6, IRON]); details.push([13, 2, 1, 1, C.white], [12, 8, 3, 1, C.bronzeLight]); }
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// Zhao's horse archer, in the famous trousers: 26×23, hooves on (13,22).
function horseArcher(f, frame) {
  const K = kd(f);
  const t = team(f);
  const [c, g] = canvas(26, 23);
  const legs = frame
    ? [[8, 17, 2, 4], [11, 17, 2, 5], [16, 17, 2, 5], [19, 17, 2, 4]]
    : [[7, 17, 2, 5], [10, 17, 2, 4], [17, 17, 2, 4], [20, 17, 2, 5]];
  outlined(g, [
    ...legs.map((l) => [...l, '#5a3a22']), [6, 11, 15, 6, HORSE], [19, 7, 3, 6, HORSE], [20, 5, 4, 3, HORSE], [3, 11, 3, 6, '#3a2616'],
    [10, 6, 5, 5, K.armor], [11, 2, 4, 4, C.skin], [11, 0, 4, 2, K.armor], [12, 11, 2, 4, K.robe], [12, 15, 3, 1, C.boot],
    [17, 2, 1, 9, C.woodDark],
  ], [
    ...legs.map(([x, y, w, h]) => [x, y + h - 1, w, 1, '#2a1a10']), [19, 7, 1, 5, '#3a2616'], [22, 6, 1, 1, C.O], [23, 7, 1, 1, '#3a2616'],
    [9, 11, 7, 2, t.main], [9, 13, 7, 1, K.trim], [13, 3, 1, 1, C.O], [11, 1, 4, 1, K.accent], [10, 8, 5, 1, t.main],
    [12, 14, 2, 1, C.boot], [14, 7, 3, 1, C.skin], [16, 2, 1, 9, '#d8cdb0'], [17, 2, 1, 1, K.trim], [17, 10, 1, 1, K.trim],
    [21, 5, 1, 1, '#a07a50'],
  ]);
  return { c, ax: 13, ay: 22 };
}

const buildSoldier = (type, f, frame) => (sideId(f) === 'qin' ? qinSoldier : kSoldier)(type, f, frame);

// ── Signature war machines ─────────────────────────────────────────────────
// Chu: a dragon boat on wheels, rowers paddling the air, drummer keeping time.
function dragonBoat(f, frame) {
  const K = kd(f);
  const t = team(f);
  const [c, g] = canvas(38, 21);
  const DR = '#3a8a4a';
  outlined(g, [
    [3, 10, 28, 4, K.trim], [0, 6, 2, 5, DR], [1, 9, 3, 2, DR], [30, 5, 2, 7, DR], [31, 3, 5, 3, DR], [34, 6, 2, 1, DR],
    [7, 7, 3, 3, K.armor], [13, 7, 3, 3, K.armor], [19, 7, 3, 3, K.armor], [25, 5, 3, 4, K.dark],
  ], [
    [3, 10, 28, 1, K.accent], [3, 12, 28, 1, t.main], [3, 13, 28, 1, K.dark], [5, 11, 1, 1, K.accent], [11, 11, 1, 1, K.accent], [17, 11, 1, 1, K.accent], [23, 11, 1, 1, K.accent],
    [33, 3, 1, 1, C.white], [34, 4, 1, 1, C.O], [31, 2, 1, 1, K.accent], [35, 5, 1, 1, C.white], [0, 6, 1, 1, K.accent],
    [8, 7, 2, 1, C.skin], [14, 7, 2, 1, C.skin], [20, 7, 2, 1, C.skin], [7, 6, 3, 1, K.armorD], [13, 6, 3, 1, K.armorD], [19, 6, 3, 1, K.armorD],
    [25, 5, 3, 1, K.trim], [26, 6, 1, 1, K.accent],
  ]);
  // Paddles dip together, then lift
  g.fillStyle = C.woodDark;
  for (const x of [10, 16, 22]) for (let i = 0; i < 4; i++) g.fillRect(x + (frame ? -i : i), 9 + i, 1, 1);
  g.fillStyle = C.woodLight;
  for (const x of [10, 16, 22]) g.fillRect(x + (frame ? -4 : 3), 13, 2, 1);
  spokeWheel(g, 9, 16, 4, frame);
  spokeWheel(g, 25, 16, 4, frame);
  banner(g, 4, 0, t, 5);
  return { c, ax: 17, ay: 20 };
}

// Qi: a merchant junk on wheels, battened sail, salt sacks and an eye on the bow.
function landJunk(f, frame) {
  const K = kd(f);
  const t = team(f);
  const [c, g] = canvas(36, 24);
  outlined(g, [
    [3, 12, 27, 5, C.wood], [1, 9, 7, 4, C.wood], [28, 10, 5, 3, C.wood], [17, 0, 1, 12, C.woodDark], [11, 1, 11, 3, '#c89a5c'], [10, 4, 13, 7, '#c89a5c'],
    [20, 9, 3, 3, SALT], [24, 9, 3, 3, SALT],
  ], [
    [3, 12, 27, 1, C.woodLight], [3, 15, 27, 1, t.main], [1, 9, 7, 1, C.woodLight], [30, 11, 1, 1, C.white], [31, 11, 1, 1, C.O],
    [11, 1, 11, 1, '#e0b878'], [11, 3, 11, 1, '#6e4a2a'], [10, 6, 13, 1, '#6e4a2a'], [10, 9, 13, 1, '#6e4a2a'], [17, 1, 1, 10, C.woodDark],
    [20, 9, 3, 1, '#c8c8c0'], [24, 9, 3, 1, '#c8c8c0'], [3, 13, 27, 1, K.trim],
  ]);
  g.fillStyle = C.O; g.fillRect(18, 0, 5, 3);
  g.fillStyle = t.main; g.fillRect(18, 0, 4, 2);
  spokeWheel(g, 9, 19, 4, frame);
  spokeWheel(g, 24, 19, 4, frame);
  return { c, ax: 17, ay: 23 };
}

// Zhao: chariots are out, cavalry is in. An armoured lancer on a barded horse.
function cavalry(f, frame) {
  const K = kd(f);
  const t = team(f);
  const [c, g] = canvas(32, 22);
  const legs = frame
    ? [[12, 16, 2, 4], [15, 16, 2, 5], [20, 16, 2, 5], [23, 16, 2, 4]]
    : [[11, 16, 2, 5], [14, 16, 2, 4], [21, 16, 2, 4], [24, 16, 2, 5]];
  outlined(g, [
    ...legs.map((l) => [...l, '#5a3a22']), [10, 10, 15, 6, HORSE], [23, 6, 3, 6, HORSE], [24, 4, 4, 3, HORSE], [7, 10, 3, 6, '#3a2616'],
    [14, 5, 5, 5, K.armor], [15, 1, 4, 4, C.skin], [15, 0, 4, 1, K.armor], [16, 10, 2, 5, K.robe], [16, 15, 3, 1, C.boot],
  ], [
    ...legs.map(([x, y, w, h]) => [x, y + h - 1, w, 1, '#2a1a10']), [23, 6, 1, 5, '#3a2616'], [26, 5, 1, 1, C.O], [27, 6, 1, 1, '#3a2616'],
    [24, 4, 3, 1, K.armorL], [25, 4, 1, 2, K.trim],
    [12, 10, 9, 3, K.armor], [12, 10, 9, 1, K.armorL], [12, 12, 9, 1, t.main], [13, 13, 7, 1, K.trim],
    [17, 2, 1, 1, C.O], [15, 1, 4, 1, K.accent], [14, 7, 5, 1, t.main], [16, 14, 2, 1, C.boot], [17, 7, 3, 1, C.skin],
  ]);
  // The lance, levelled over the horse's head
  g.fillStyle = C.O; g.fillRect(10, 6, 19, 1); g.fillRect(29, 5, 3, 3);
  g.fillStyle = C.woodLight; g.fillRect(11, 6, 17, 1);
  g.fillStyle = IRON; g.fillRect(28, 6, 3, 1); g.fillRect(29, 6, 2, 1);
  g.fillStyle = K.trim; g.fillRect(26, 7, 2, 1);
  banner(g, 4, 0, t, 6);
  return { c, ax: 15, ay: 21 };
}

// Yan: a horse sled on runners, fur blanket, driver in the obligatory fur hat.
function horseSled(f, frame) {
  const K = kd(f);
  const t = team(f);
  const [c, g] = canvas(32, 22);
  const legs = frame
    ? [[17, 15, 2, 5], [20, 15, 2, 4], [25, 15, 2, 4], [28, 15, 2, 5]]
    : [[16, 15, 2, 4], [21, 15, 2, 5], [24, 15, 2, 5], [29, 15, 2, 4]];
  outlined(g, [
    ...legs.map((l) => [...l, '#4a3220']), [15, 10, 15, 5, '#5e4a3a'], [27, 6, 3, 6, '#5e4a3a'], [29, 5, 3, 3, '#5e4a3a'],
    [1, 20, 15, 1, C.woodDark], [15, 18, 2, 2, C.woodDark], [2, 13, 12, 5, C.wood], [3, 11, 8, 3, K.accent],
    [5, 4, 4, 7, K.armor], [5, 1, 5, 3, K.accent],
  ], [
    ...legs.map(([x, y, w, h]) => [x, y + h - 1, w, 1, '#2a1a10']),
    [16, 10, 10, 4, K.accent], [16, 10, 10, 1, K.accentL], [17, 12, 8, 1, t.main], [30, 6, 1, 1, C.O], [28, 6, 1, 4, '#2a1a10'],
    [2, 13, 12, 1, C.woodLight], [3, 15, 10, 1, t.main], [3, 11, 8, 1, K.accentL], [6, 4, 3, 1, C.skin], [8, 4, 1, 1, C.O],
    [5, 1, 5, 1, K.accentL], [5, 7, 4, 1, t.main], [4, 17, 1, 3, C.woodDark], [12, 17, 1, 3, C.woodDark],
  ]);
  g.fillStyle = '#2a1a10'; for (let i = 0; i < 18; i++) g.fillRect(9 + i, 6 + Math.round(i * 0.25), 1, 1);
  // Snow kicked up behind the runners
  g.fillStyle = C.white; g.fillRect(0, frame ? 18 : 19, 2, 1); g.fillRect(frame ? 1 : 0, 17, 1, 1);
  return { c, ax: 15, ay: 21 };
}

// Wei: an iron tortoise — an armoured siege shed on wheels with a battering ram.
function ironTortoise(f, frame) {
  const K = kd(f);
  const t = team(f);
  const [c, g] = canvas(38, 21);
  outlined(g, [
    [3, 8, 26, 6, K.armor], [6, 5, 20, 3, K.armor], [10, 3, 12, 2, K.armor], [24, 11, 12, 3, C.wood], [35, 10, 2, 5, IRON],
    [13, 0, 4, 3, SACK],
  ], [
    [6, 5, 20, 1, K.armorL], [10, 3, 12, 1, K.armorL], [3, 8, 26, 1, K.armorL], [3, 12, 26, 1, t.main], [3, 13, 26, 1, K.armorD],
    [7, 10, 1, 1, K.accent], [12, 10, 1, 1, K.accent], [17, 10, 1, 1, K.accent], [22, 10, 1, 1, K.accent], [10, 6, 1, 1, K.accent], [20, 6, 1, 1, K.accent],
    [24, 11, 12, 1, C.woodLight], [13, 1, 4, 1, '#8a6a3a'], [27, 13, 1, 1, K.trim],
  ]);
  for (const x of [7, 16, 25]) spokeWheel(g, x, 16, 4, frame);
  return { c, ax: 17, ay: 20 };
}

// Han: three crossbows on one cart, because one is never enough when you're worried.
function tripleBow(f, frame) {
  const K = kd(f);
  const t = team(f);
  const [c, g] = canvas(32, 20);
  outlined(g, [
    [2, 11, 22, 3, C.wood], [4, 5, 3, 6, K.armor], [4, 3, 3, 2, K.armorD],
    [8, 2, 16, 2, C.woodDark], [8, 5, 16, 2, C.woodDark], [8, 8, 16, 2, C.woodDark], [22, 0, 2, 12, C.wood],
  ], [
    [2, 11, 22, 1, C.woodLight], [21, 0, 1, 12, '#d8cdb0'], [10, 2, 18, 1, C.bronzeLight], [10, 5, 18, 1, C.bronzeLight], [10, 8, 18, 1, C.bronzeLight],
    [28, 2, 1, 1, IRON], [28, 5, 1, 1, IRON], [28, 8, 1, 1, IRON], [5, 6, 2, 1, t.main], [10, 12, 4, 1, t.main], [16, 12, 4, 1, t.main],
    [22, 0, 2, 1, K.trim], [22, 11, 2, 1, K.trim], [6, 4, 1, 1, C.skin],
  ]);
  g.fillStyle = C.O; g.fillRect(2, 1, 2, 3); g.fillStyle = SWEAT; g.fillRect(2, 2, 1, 1); g.fillRect(3, 1, 1, 2);
  spokeWheel(g, 7, 15, 4, frame);
  spokeWheel(g, 20, 15, 4, frame);
  return { c, ax: 14, ay: 19 };
}

const SIDE_VEH = {
  chu: { tank: dragonBoat }, qi: { tank: landJunk }, zhao: { jeep: cavalry }, yan: { jeep: horseSled }, wei: { tank: ironTortoise }, han: { tank: tripleBow },
};
const BASE_VEH = { jeep: buildChariot, tank: buildBoltCart, artillery: buildThrower };
const veh = (k) => (f, frame) => (SIDE_VEH[sideId(f)]?.[k] || BASE_VEH[k])(f, frame);

// ── The other kingdoms' buildings ──────────────────────────────────────────
function pillarsK(g, xs, y, h, col, hi) {
  for (const x of xs) { g.fillStyle = C.O; g.fillRect(x - 1, y, 4, h); g.fillStyle = col; g.fillRect(x, y, 2, h); g.fillStyle = hi; g.fillRect(x, y, 1, h); }
}
function podium(g, col = C.stone, hi = C.stoneLight, lo = C.stoneDark) {
  outlined(g, [[2, 38, 60, 10, col]], [[2, 38, 60, 1, hi]]);
  g.fillStyle = lo;
  for (let x = 6; x < 62; x += 8) g.fillRect(x, 40, 1, 8);
  outlined(g, [[26, 38, 12, 10, hi]], [[26, 41, 12, 1, lo], [26, 44, 12, 1, lo]]);
}
// Snow on a roof() drawn at the same place, plus icicles under the eaves.
function snowRoof(g, cx, y, w, h) {
  for (let i = 0; i < 2; i++) {
    const half = Math.round(((i + 1) / h) * (w / 2) * 0.7 + (w / 2) * 0.3);
    g.fillStyle = i ? '#dce6f0' : C.white; g.fillRect(cx - half, y + i, half * 2, 1);
  }
  const half = Math.round(w / 2);
  g.fillStyle = '#dce6f0';
  for (let x = cx - half + 2; x < cx + half - 1; x += 4) g.fillRect(x, y + h, 1, 1 + (x % 3 === 0 ? 1 : 0));
}
function zongzi(g, x, y) {
  // A 5×4 rice dumpling in a bamboo leaf, tied with string
  g.fillStyle = C.O; g.fillRect(x + 1, y - 1, 3, 1); g.fillRect(x, y, 5, 4);
  g.fillStyle = '#5a9a3a'; g.fillRect(x + 2, y, 1, 1); g.fillRect(x + 1, y + 1, 3, 1); g.fillRect(x + 1, y + 2, 3, 1);
  g.fillStyle = '#86c050'; g.fillRect(x + 1, y + 1, 1, 1);
  g.fillStyle = '#e8d8a0'; g.fillRect(x + 1, y + 2, 3, 1);
}
function pile(g, cx, top, h, col, hi) {
  for (let i = 0; i < h; i++) {
    g.fillStyle = C.O; g.fillRect(cx - i - 1, top + i, 2 * i + 3, 1);
    g.fillStyle = col; g.fillRect(cx - i, top + i, 2 * i + 1, 1);
  }
  g.fillStyle = hi; g.fillRect(cx, top, 1, 1); g.fillRect(cx - 1, top + 2, 1, 1);
}
function coins(g, x, y, n, col = C.bronze, hi = C.bronzeLight) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - n, 5, n + 1);
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? col : hi; g.fillRect(x, y - i, 3, 1); }
}

const CHU_BUILD = {
  hq(g, t, f) {
    // Lacquer palace: black lacquer walls with red cloud swirls, a set of bronze bells, phoenix finials
    const K = kd(f);
    podium(g);
    outlined(g, [[8, 22, 48, 16, K.dark]], [[8, 22, 48, 1, K.trim]]);
    g.fillStyle = K.trim;
    for (const x of [12, 44]) { g.fillRect(x, 33, 5, 1); g.fillRect(x + 4, 31, 1, 2); g.fillRect(x + 2, 31, 2, 1); }
    pillarsK(g, [10, 20, 42, 52], 22, 16, K.trim, '#f07a5a');
    outlined(g, [[26, 26, 12, 12, K.robeD]], [[31, 26, 2, 12, C.O], [28, 29, 1, 1, K.accent], [35, 29, 1, 1, K.accent], [28, 33, 1, 1, K.accent], [35, 33, 1, 1, K.accent]]);
    // A rack of bianzhong bells
    g.fillStyle = C.woodDark; g.fillRect(12, 24, 7, 1);
    for (const x of [12, 15, 18]) { g.fillStyle = C.O; g.fillRect(x - 1, 25, 3, 4); g.fillStyle = C.bronze; g.fillRect(x, 25, 1, 3); }
    g.fillStyle = C.woodDark; g.fillRect(44, 24, 7, 1);
    for (const x of [45, 48]) { g.fillStyle = C.O; g.fillRect(x - 1, 25, 3, 4); g.fillStyle = C.bronze; g.fillRect(x, 25, 1, 3); }
    roof(g, 32, 14, 60, 8, K.roof);
    outlined(g, [[16, 10, 32, 4, K.dark]], [[16, 12, 32, 1, K.trim]]);
    pillarsK(g, [19, 43], 10, 4, K.trim, '#f07a5a');
    roof(g, 32, 3, 38, 7, K.roof);
    // Phoenix on the ridge
    outlined(g, [[29, 0, 5, 2, K.accent], [33, 0, 2, 1, K.accent]], [[29, 0, 1, 1, K.trim], [34, 0, 1, 1, C.O]]);
    flag(g, 3, 20, t, 10);
    flag(g, 56, 20, t, 10);
  },
  barracks(g, t, f) {
    // Dragon boathouse: a long boat shed, the dragon's head poking out of the door
    const K = kd(f);
    outlined(g, [[3, 13, 42, 19, C.wood]], []);
    g.fillStyle = C.woodDark; for (let x = 5; x < 45; x += 4) g.fillRect(x, 13, 1, 19);
    outlined(g, [[8, 18, 34, 14, '#2a1a14']], []);
    roof(g, 24, 5, 46, 8, K.roof);
    outlined(g, [[10, 25, 32, 4, K.trim], [41, 20, 2, 7, '#3a8a4a'], [42, 18, 5, 3, '#3a8a4a']], [
      [10, 25, 32, 1, K.accent], [10, 27, 32, 1, t.main], [45, 18, 1, 1, C.O], [46, 20, 1, 1, C.white], [42, 17, 1, 1, K.accent],
    ]);
    g.fillStyle = C.woodLight; for (const x of [14, 20, 26, 32]) { g.fillRect(x, 22, 1, 3); g.fillRect(x - 1, 21, 3, 1); }
    flag(g, 4, 9, t, 6);
  },
  mine(g, t, f) {
    // Zongzi kitchen: a stove, a tower of bamboo steamers and a heap of rice dumplings
    const K = kd(f);
    outlined(g, [[2, 21, 18, 11, C.stoneDark]], [[2, 21, 18, 1, C.stone]]);
    outlined(g, [[7, 25, 8, 6, '#3a1a0e']], [[8, 27, 6, 4, '#e05a1a'], [9, 28, 4, 3, C.fire]]);
    for (const y of [16, 11]) outlined(g, [[4, y, 14, 4, '#c8a060']], [[4, y, 14, 1, '#e0c080'], [4, y + 2, 14, 1, '#a07a40']]);
    outlined(g, [[6, 8, 10, 2, '#c8a060'], [10, 7, 2, 1, C.woodDark]], [[6, 8, 10, 1, '#e0c080']]);
    zongzi(g, 21, 28); zongzi(g, 26, 28); zongzi(g, 23, 24);
    outlined(g, [[23, 9, 7, 9, t.dark]], [[24, 10, 5, 7, K.trim]]);
    zongzi(g, 24, 12);
    g.fillStyle = C.O; g.fillRect(25, 17, 2, 4); g.fillStyle = C.wood; g.fillRect(25, 18, 1, 3);
  },
};

const QI_BUILD = {
  hq(g, t, f) {
    // Jixia Academy: white walls, an open hall where two scholars argue forever
    const K = kd(f);
    podium(g);
    outlined(g, [[8, 22, 48, 16, K.robe]], [[8, 22, 48, 1, K.armor], [8, 30, 48, 1, K.robeD]]);
    pillarsK(g, [10, 20, 42, 52], 22, 16, K.armor, K.armorL);
    outlined(g, [[23, 25, 18, 13, '#3a3a40']], []);
    // Two debaters, one shaking a scroll, the other pointing
    for (const [x, col] of [[26, K.armor], [36, K.trim]]) {
      g.fillStyle = C.O; g.fillRect(x - 1, 29, 4, 9);
      g.fillStyle = C.skin; g.fillRect(x, 30, 2, 2);
      g.fillStyle = col; g.fillRect(x, 32, 2, 5);
      g.fillStyle = K.armorD; g.fillRect(x, 29, 2, 1);
    }
    g.fillStyle = C.paper; g.fillRect(28, 32, 2, 2); g.fillStyle = C.skin; g.fillRect(34, 32, 2, 1);
    // Speech bubbles: "!" and "?"
    outlined(g, [[28, 26, 3, 3, C.white], [33, 26, 3, 3, C.white]], [[29, 26, 1, 2, C.O], [34, 26, 2, 1, C.O], [35, 27, 1, 1, C.O]]);
    for (const x of [13, 45]) { g.fillStyle = C.O; g.fillRect(x - 1, 25, 5, 9); g.fillStyle = C.paper; g.fillRect(x, 26, 3, 7); g.fillStyle = '#4a3a30'; g.fillRect(x + 1, 27, 1, 1); g.fillRect(x + 1, 29, 1, 1); g.fillRect(x + 1, 31, 1, 1); }
    roof(g, 32, 14, 60, 8, K.roof);
    outlined(g, [[16, 10, 32, 4, K.robe]], [[26, 10, 12, 4, K.armor], [28, 11, 1, 1, K.accent], [31, 11, 2, 1, K.accent], [35, 11, 1, 1, K.accent]]);
    roof(g, 32, 3, 38, 7, K.roof);
    flag(g, 3, 20, t, 10);
    flag(g, 56, 20, t, 10);
  },
  barracks(g, t, f) {
    // Harbour barracks: a whitewashed hall by the quay, a merchant junk moored alongside
    const K = kd(f);
    outlined(g, [[3, 14, 26, 18, K.robe]], [[3, 20, 26, 1, K.robeD]]);
    roof(g, 16, 6, 30, 8, K.roof);
    outlined(g, [[12, 22, 8, 10, K.armor]], [[16, 22, 1, 10, C.O]]);
    g.fillStyle = C.O; g.fillRect(5, 16, 5, 4); g.fillStyle = C.glass; g.fillRect(6, 17, 3, 2);
    outlined(g, [[30, 29, 18, 3, '#3a6a8a']], [[30, 29, 18, 1, '#6a9ab8']]);
    outlined(g, [[31, 24, 15, 4, C.wood], [30, 22, 4, 2, C.wood], [38, 9, 1, 15, C.woodDark], [33, 10, 10, 11, K.robe]], [
      [31, 24, 15, 1, C.woodLight], [31, 26, 15, 1, t.main], [33, 13, 10, 1, K.armor], [33, 16, 10, 1, K.armor], [33, 19, 10, 1, K.armor], [38, 10, 1, 11, C.woodDark],
      [44, 25, 1, 1, C.O],
    ]);
    g.fillStyle = C.O; g.fillRect(39, 7, 6, 3); g.fillStyle = t.main; g.fillRect(39, 8, 5, 1);
  },
  mine(g, t, f) {
    // Salt pans: evaporating pools, glittering heaps, and the iron monopoly's ingots
    const K = kd(f);
    outlined(g, [[1, 26, 14, 6, '#8aaabb'], [17, 26, 14, 6, '#8aaabb']], [[1, 26, 14, 1, '#b4ccd8'], [3, 29, 4, 1, SALT], [21, 28, 5, 1, SALT]]);
    pile(g, 8, 16, 10, SALT, C.white);
    pile(g, 24, 19, 7, SALT, C.white);
    g.fillStyle = '#d8d8d0'; g.fillRect(6, 23, 5, 1); g.fillRect(22, 24, 4, 1);
    for (const [x, y] of [[26, 13], [27, 10]]) { g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 6, 4); g.fillStyle = '#6a7078'; g.fillRect(x, y, 4, 2); g.fillStyle = '#9aa2aa'; g.fillRect(x, y, 4, 1); }
    // A rake leaning on the pile, and a team pennant
    g.fillStyle = C.wood; for (let i = 0; i < 10; i++) g.fillRect(14 + Math.round(i * 0.4), 14 + i, 1, 1);
    g.fillStyle = C.woodDark; g.fillRect(12, 13, 5, 1);
    g.fillStyle = C.O; g.fillRect(1, 4, 1, 22); g.fillRect(2, 4, 6, 5); g.fillStyle = t.main; g.fillRect(2, 5, 5, 3); g.fillStyle = K.trim; g.fillRect(3, 6, 3, 1);
  },
};

const ZHAO_BUILD = {
  hq(g, t, f) {
    // Congtai Terrace: a stepped earth terrace with a pavilion on top, for admiring one's cavalry
    const K = kd(f);
    outlined(g, [[3, 34, 58, 14, C.loess]], []);
    rammed(g, 3, 34, 58, 14);
    outlined(g, [[10, 22, 44, 12, C.loess]], []);
    rammed(g, 10, 22, 44, 12);
    outlined(g, [[27, 22, 10, 26, C.stone]], []);
    g.fillStyle = C.stoneDark; for (let y = 24; y < 48; y += 2) g.fillRect(27, y, 10, 1);
    pillarsK(g, [17, 25, 38, 46], 12, 10, K.trim, '#f0c070');
    outlined(g, [[15, 20, 34, 2, K.armor]], [[15, 20, 34, 1, K.armorL]]);
    roof(g, 32, 4, 44, 8, K.roof);
    // A little horse statue on the lower terrace
    outlined(g, [[48, 29, 7, 3, HORSE], [54, 26, 2, 3, HORSE], [55, 25, 2, 2, HORSE], [48, 32, 1, 2, HORSE], [53, 32, 1, 2, HORSE]], [[49, 29, 5, 1, t.main]]);
    flag(g, 4, 22, t, 10);
    flag(g, 12, 10, t, 8);
  },
  barracks(g, t, f) {
    // Stables: three stalls, three horses who would like to go out now
    const K = kd(f);
    outlined(g, [[2, 14, 44, 18, C.wood]], [[2, 14, 44, 1, t.main]]);
    g.fillStyle = C.woodDark; for (let y = 17; y < 32; y += 3) g.fillRect(2, y, 44, 1);
    roof(g, 24, 6, 48, 8, K.roof);
    for (const x of [5, 18, 31]) {
      outlined(g, [[x, 19, 11, 13, '#2a1a10']], []);
      outlined(g, [[x, 26, 11, 6, C.woodLight]], [[x, 26, 11, 1, C.wood], [x + 1, 28, 9, 1, C.wood]]);
      outlined(g, [[x + 4, 20, 4, 6, HORSE], [x + 6, 21, 4, 3, HORSE]], [[x + 4, 20, 1, 5, '#3a2616'], [x + 8, 21, 1, 1, C.O], [x + 7, 22, 1, 2, C.white], [x + 5, 19, 1, 1, HORSE]]);
    }
    outlined(g, [[40, 26, 5, 6, '#e0c060']], [[40, 28, 5, 1, '#b89a40']]);
  },
  mine(g, t, f) {
    // Trouser tailor: the fashion that changed warfare, on a washing line
    const K = kd(f);
    outlined(g, [[2, 15, 18, 17, C.loess]], []);
    rammed(g, 2, 15, 18, 17);
    roof(g, 11, 8, 22, 7, K.roof);
    outlined(g, [[7, 22, 8, 10, '#3a2a1e']], []);
    outlined(g, [[5, 16, 12, 5, C.paper]], []);
    // A trouser icon on the shop sign
    g.fillStyle = K.robe; g.fillRect(9, 17, 4, 1); g.fillRect(9, 18, 1, 2); g.fillRect(12, 18, 1, 2);
    g.fillStyle = C.O; g.fillRect(22, 6, 1, 26); g.fillRect(31, 6, 1, 26);
    g.fillStyle = '#d8cdb0'; g.fillRect(22, 8, 10, 1);
    const pants = (x, col) => {
      g.fillStyle = col; g.fillRect(x, 9, 4, 4); g.fillRect(x, 13, 1, 5); g.fillRect(x + 3, 13, 1, 5);
      g.fillStyle = C.O; g.fillRect(x, 9, 4, 1); g.fillRect(x + 1, 12, 2, 1); g.fillRect(x, 17, 1, 1); g.fillRect(x + 3, 17, 1, 1);
    };
    pants(23, K.robe); pants(27, t.main);
    coins(g, 25, 31, 5);
  },
};

const YAN_BUILD = {
  hq(g, t, f) {
    // Snow palace: everything the others have, under a foot of snow, with a snowman on guard
    const K = kd(f);
    podium(g, '#b4bcc8', '#dce4ee', '#8a94a4');
    outlined(g, [[8, 22, 48, 16, K.armor]], [[8, 22, 48, 1, K.armorL]]);
    pillarsK(g, [10, 20, 42, 52], 22, 16, '#7a4a2a', '#9a6a40');
    outlined(g, [[26, 26, 12, 12, K.armorD]], [[31, 26, 2, 12, C.O], [28, 29, 1, 1, C.gold], [35, 29, 1, 1, C.gold], [28, 33, 1, 1, C.gold], [35, 33, 1, 1, C.gold]]);
    for (const x of [14, 46]) { g.fillStyle = C.O; g.fillRect(x - 1, 25, 5, 6); g.fillStyle = C.glass; g.fillRect(x, 26, 3, 4); g.fillStyle = K.armorD; g.fillRect(x + 1, 26, 1, 4); }
    roof(g, 32, 14, 60, 8, K.roof); snowRoof(g, 32, 14, 60, 8);
    outlined(g, [[16, 10, 32, 4, K.armorD]], []);
    roof(g, 32, 3, 38, 7, K.roof); snowRoof(g, 32, 3, 38, 7);
    // Snowman with a fur hat (of course) and a team scarf
    disc(g, 58, 43, 4, C.O); disc(g, 58, 43, 3, C.white);
    disc(g, 58, 37, 3, C.O); disc(g, 58, 37, 2, C.white);
    g.fillStyle = C.O; g.fillRect(55, 33, 7, 3); g.fillStyle = K.accent; g.fillRect(56, 33, 5, 2);
    g.fillStyle = t.main; g.fillRect(56, 39, 5, 1); g.fillStyle = C.O; g.fillRect(59, 37, 1, 1);
    g.fillStyle = C.fire; g.fillRect(60, 37, 2, 1);
    flag(g, 3, 20, t, 10);
  },
  barracks(g, t, f) {
    // Fur lodge: a log hall, smoke from the chimney, pelts by the door, a sled outside
    const K = kd(f);
    outlined(g, [[3, 14, 42, 18, C.wood]], []);
    for (let y = 14; y < 32; y += 3) { g.fillStyle = C.woodLight; g.fillRect(3, y, 42, 1); g.fillStyle = C.woodDark; g.fillRect(3, y + 2, 42, 1); }
    outlined(g, [[35, 1, 5, 9, C.stone]], [[35, 1, 5, 1, C.stoneLight]]);
    roof(g, 24, 6, 46, 8, K.roof); snowRoof(g, 24, 6, 46, 8);
    outlined(g, [[19, 21, 10, 11, '#2a1a10']], [[19, 21, 10, 1, t.main]]);
    for (const x of [7, 13]) outlined(g, [[x, 18, 4, 7, K.accent], [x - 1, 18, 1, 2, K.accent], [x + 4, 18, 1, 2, K.accent]], [[x + 1, 19, 2, 4, K.accentL]]);
    outlined(g, [[33, 26, 10, 3, C.woodLight], [32, 29, 12, 1, C.woodDark], [43, 27, 1, 2, C.woodDark]], [[34, 27, 8, 1, t.main]]);
    g.fillStyle = C.white; g.fillRect(0, 31, 48, 1);
  },
  mine(g, t, f) {
    // Fur trader: a trapper's hut, a drying rack of pelts and a stack ready for market
    const K = kd(f);
    outlined(g, [[2, 17, 16, 15, C.wood]], []);
    for (let y = 17; y < 32; y += 3) { g.fillStyle = C.woodLight; g.fillRect(2, y, 16, 1); g.fillStyle = C.woodDark; g.fillRect(2, y + 2, 16, 1); }
    roof(g, 10, 11, 20, 6, K.roof); snowRoof(g, 10, 11, 20, 6);
    outlined(g, [[7, 24, 6, 8, '#2a1a10']], [[7, 24, 6, 1, t.main]]);
    g.fillStyle = C.O; g.fillRect(20, 9, 1, 23); g.fillRect(30, 9, 1, 23); g.fillRect(19, 9, 13, 1);
    for (const [x, col, hi] of [[21, K.accent, K.accentL], [26, '#d8d0c0', C.white]]) {
      outlined(g, [[x, 11, 4, 8, col], [x - 1, 11, 1, 2, col], [x + 4, 11, 1, 2, col], [x - 1, 17, 1, 2, col], [x + 4, 17, 1, 2, col]], [[x + 1, 12, 2, 5, hi]]);
    }
    outlined(g, [[20, 26, 11, 2, K.accent], [21, 28, 9, 2, '#d8d0c0'], [20, 30, 11, 2, K.accentL]], []);
    g.fillStyle = C.white; g.fillRect(0, 31, 32, 1);
  },
  wall(g, t, f) {
    // The Northern Wall (Yan had one before it was cool): stone blocks, snow-capped crenels
    outlined(g, [[0, 6, 16, 26, C.stone]], []);
    g.fillStyle = C.stoneDark;
    for (let y = 9; y < 32; y += 4) { g.fillRect(0, y, 16, 1); for (let x = (y / 4) % 2 ? 2 : 6; x < 16; x += 8) g.fillRect(x, y - 3, 1, 3); }
    for (let x = 0; x < 16; x += 6) { g.fillStyle = C.O; g.fillRect(x - 1, 1, 6, 6); g.fillStyle = C.stone; g.fillRect(x, 2, 4, 4); g.fillStyle = C.white; g.fillRect(x, 1, 4, 2); }
    g.fillStyle = C.white; g.fillRect(0, 6, 16, 1);
    g.fillStyle = t.main; g.fillRect(5, 16, 6, 4);
    g.fillStyle = C.white; g.fillRect(7, 17, 2, 2);
  },
};

const WEI_BUILD = {
  hq(g, t, f) {
    // Iron citadel: iron-studded walls and gate, with a canal running past the steps
    const K = kd(f);
    podium(g, C.stoneDark, C.stone, '#4a4842');
    outlined(g, [[2, 44, 60, 4, '#3a6a9a']], [[2, 44, 60, 1, '#6a9ac8'], [8, 46, 4, 1, '#6a9ac8'], [44, 46, 5, 1, '#6a9ac8']]);
    outlined(g, [[24, 43, 16, 2, C.wood]], [[24, 43, 16, 1, C.woodLight]]);
    outlined(g, [[8, 22, 48, 16, K.armorD]], [[8, 22, 48, 1, K.armorL]]);
    g.fillStyle = K.armorL; for (let y = 25; y < 37; y += 4) for (let x = 11; x < 55; x += 4) g.fillRect(x, y, 1, 1);
    pillarsK(g, [10, 20, 42, 52], 22, 16, K.robe, '#8a5a92');
    outlined(g, [[24, 24, 16, 14, K.armor]], [[31, 24, 2, 14, C.O], [27, 28, 1, 1, K.accent], [36, 28, 1, 1, K.accent], [27, 33, 1, 1, K.accent], [36, 33, 1, 1, K.accent]]);
    disc(g, 29, 31, 1, K.accentL); disc(g, 34, 31, 1, K.accentL);
    roof(g, 32, 14, 60, 8, K.roof);
    outlined(g, [[16, 10, 32, 4, K.armorD]], [[16, 12, 32, 1, K.trim]]);
    pillarsK(g, [19, 43], 10, 4, K.robe, '#8a5a92');
    roof(g, 32, 3, 38, 7, K.roof);
    flag(g, 3, 20, t, 10);
    flag(g, 56, 20, t, 10);
  },
  barracks(g, t, f) {
    // Wuzu armoury: suits of armour on stands and a mountain of three-day ration sacks
    const K = kd(f);
    outlined(g, [[3, 13, 42, 19, C.stoneDark]], []);
    g.fillStyle = '#4a4842'; for (let y = 16; y < 32; y += 4) g.fillRect(3, y, 42, 1);
    roof(g, 24, 5, 46, 8, K.roof);
    outlined(g, [[5, 16, 24, 16, '#2a2428']], []);
    for (const x of [7, 15, 23]) {
      outlined(g, [[x + 2, 26, 1, 6, C.wood], [x, 19, 5, 7, K.armor], [x + 1, 17, 3, 2, K.armor]], [
        [x, 20, 5, 1, K.armorL], [x, 22, 5, 1, K.armorL], [x, 24, 5, 1, K.armorL], [x + 2, 17, 1, 1, K.trim], [x + 2, 21, 1, 3, t.main],
      ]);
    }
    for (const [x, y] of [[31, 26], [37, 26], [34, 21], [40, 21]]) outlined(g, [[x, y, 5, 5, SACK]], [[x, y + 1, 5, 1, '#8a6a3a'], [x + 1, y, 3, 1, '#e0c890']]);
    flag(g, 36, 10, t, 8);
  },
  mine(g, t, f) {
    // Canal toll lock: wooden lock gates, a winch, and the toll box filling up
    const K = kd(f);
    outlined(g, [[0, 22, 32, 10, '#3a6a9a']], [[0, 22, 32, 1, '#6a9ac8'], [4, 26, 4, 1, '#6a9ac8'], [16, 28, 5, 1, '#6a9ac8']]);
    outlined(g, [[0, 20, 32, 2, C.stone]], [[0, 20, 32, 1, C.stoneLight]]);
    for (const x of [8, 20]) outlined(g, [[x, 12, 3, 20, C.wood]], [[x, 12, 3, 1, C.woodLight], [x + 1, 14, 1, 16, C.woodDark]]);
    outlined(g, [[6, 9, 17, 3, C.woodDark]], [[6, 9, 17, 1, C.wood]]);
    disc(g, 14, 6, 3, C.O); disc(g, 14, 6, 2, K.armorL); g.fillStyle = K.armorD; g.fillRect(14, 6, 1, 1);
    outlined(g, [[24, 13, 7, 7, K.robe]], [[24, 13, 7, 1, K.trim], [26, 15, 3, 3, t.main], [27, 16, 1, 1, K.accentL]]);
    coins(g, 2, 19, 4); coins(g, 27, 11, 3);
  },
};

const HAN_BUILD = {
  hq(g, t, f) {
    // Tiny palace: the smallest kingdom's palace, squeezed between two enormous walls
    const K = kd(f);
    for (const x of [0, 50]) {
      outlined(g, [[x, 10, 14, 38, C.loess]], []);
      rammed(g, x, 10, 14, 38);
      for (let cx = x; cx < x + 14; cx += 5) { g.fillStyle = C.O; g.fillRect(cx - 1, 5, 5, 6); g.fillStyle = C.tile; g.fillRect(cx, 6, 3, 4); }
      for (const y of [18, 30]) { g.fillStyle = C.O; g.fillRect(x + 6, y, 2, 5); }
    }
    outlined(g, [[16, 42, 32, 6, C.stone]], [[16, 42, 32, 1, C.stoneLight]]);
    outlined(g, [[19, 31, 26, 11, K.armor]], [[19, 31, 26, 1, K.armorL]]);
    pillarsK(g, [20, 42], 31, 11, K.trim, '#fff0a0');
    outlined(g, [[28, 33, 8, 9, K.dark]], [[31, 33, 2, 9, C.O]]);
    roof(g, 32, 24, 32, 7, K.roof);
    roof(g, 32, 18, 16, 5, K.roof);
    // A sentry peeking over each wall, sweating
    for (const x of [5, 55]) { g.fillStyle = C.O; g.fillRect(x - 1, 2, 5, 4); g.fillStyle = C.skin; g.fillRect(x, 3, 3, 3); g.fillStyle = K.armorD; g.fillRect(x, 2, 3, 1); g.fillStyle = C.O; g.fillRect(x + 1, 4, 1, 1); g.fillStyle = SWEAT; g.fillRect(x + 3, 2, 1, 2); }
    flag(g, 2, 14, t, 9);
    flag(g, 56, 14, t, 9);
  },
  barracks(g, t, f) {
    // Crossbow range: a shed of the finest crossbows, and targets full of bolts
    const K = kd(f);
    outlined(g, [[2, 14, 26, 18, K.armor]], [[2, 14, 26, 1, K.armorL]]);
    roof(g, 15, 6, 30, 8, K.roof);
    outlined(g, [[11, 22, 9, 10, K.dark]], [[15, 22, 1, 10, C.O]]);
    g.fillStyle = C.woodDark; for (const y of [18, 21, 24]) { g.fillRect(3, y, 6, 1); g.fillRect(4, y - 1, 1, 3); }
    for (const [cx, cy] of [[36, 20], [44, 23]]) {
      g.fillStyle = C.O; g.fillRect(cx - 1, cy + 3, 1, 32 - cy - 3); g.fillRect(cx + 1, cy + 3, 1, 32 - cy - 3);
      disc(g, cx, cy, 5, C.O); disc(g, cx, cy, 4, C.white); disc(g, cx, cy, 3, t.main); disc(g, cx, cy, 1, K.trim);
      g.fillStyle = C.woodDark; g.fillRect(cx - 4, cy - 1, 4, 1); g.fillStyle = C.bronzeLight; g.fillRect(cx - 1, cy - 1, 1, 1);
    }
  },
  mine(g, t, f) {
    // Iron forge: the best iron swords in the land, hammered out by the glowing hearth
    const K = kd(f);
    outlined(g, [[2, 16, 15, 16, C.stoneDark], [5, 3, 5, 13, C.stoneDark]], [[2, 16, 15, 1, C.stone], [5, 3, 5, 1, C.stone]]);
    outlined(g, [[5, 23, 9, 7, '#3a1a0e']], [[6, 25, 7, 5, '#e05a1a'], [7, 27, 5, 3, C.fire]]);
    outlined(g, [[19, 23, 9, 3, '#4a4e54'], [21, 26, 5, 6, '#3a3e44'], [27, 24, 2, 1, '#4a4e54']], [[19, 23, 9, 1, '#7a8088']]);
    g.fillStyle = C.fire; g.fillRect(21, 22, 5, 1);
    for (const x of [26, 29]) { g.fillStyle = C.O; g.fillRect(x - 1, 6, 3, 14); g.fillStyle = IRON; g.fillRect(x, 7, 1, 10); g.fillStyle = C.bronze; g.fillRect(x - 1, 17, 3, 1); g.fillStyle = C.woodDark; g.fillRect(x, 18, 1, 2); }
    outlined(g, [[20, 9, 4, 6, t.dark]], [[21, 10, 2, 4, K.trim]]);
  },
};

const SIDE_BUILD = { chu: CHU_BUILD, qi: QI_BUILD, zhao: ZHAO_BUILD, yan: YAN_BUILD, wei: WEI_BUILD, han: HAN_BUILD };

function smoke(ctx, x, y, ms, i, col = '#d8d4d0') {
  const k = ((ms / 1700) + i * 0.5) % 1;
  ctx.globalAlpha = 0.55 * (1 - k);
  rect(ctx, x + Math.round(Math.sin(k * 5 + i) * 2), y - Math.round(k * 12), 3, 3, col);
  ctx.globalAlpha = 1;
}

function animate(ctx, b, x, y) {
  const side = sideId(b.faction);
  if (!SIDE_BUILD[side]?.[b.type]) { qinAnimate(ctx, b, x, y); return; }
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  const t = team(b.faction);
  const K = KD[side];
  const flags = { hq: { chu: [4, 57], qi: [4, 57], zhao: [5, 13], yan: [4], wei: [4, 57], han: [3, 57] }, barracks: { chu: [5], wei: [37] } };
  const fy = { hq: { zhao: [23, 11], han: [15, 15] }, barracks: { chu: [10] } };
  const fx = flags[b.type]?.[side];
  if (fx) fx.forEach((bx, i) => rect(ctx, x + bx + 4, y + (fy[b.type]?.[side]?.[i] ?? (b.type === 'hq' ? 21 : 11)) + (tick % 2), 1, 3, t.light));
  if (b.type === 'mine') {
    if (side === 'chu') for (let i = 0; i < 3; i++) smoke(ctx, x + 8 + i * 2, y + 6, ms, i, '#f4f0e8');
    else if (side === 'qi') { if (tick % 6 < 2) rect(ctx, x + 6 + (tick % 4), y + 19, 1, 1, C.white); if ((tick + 3) % 6 < 2) rect(ctx, x + 24, y + 21, 1, 1, '#fffbe0'); }
    else if (side === 'zhao') { const k = Math.round(Math.sin(ms / 400)); rect(ctx, x + 23 + k, y + 17, 1, 1, K.robeD); rect(ctx, x + 30 + k, y + 17, 1, 1, t.dark); }
    else if (side === 'yan') { if (tick % 10 < 5) rect(ctx, x + 4 + (tick % 20), y + 2 + (tick % 7), 1, 1, C.white); }
    else if (side === 'wei') { const k = Math.floor(ms / 250) % 6; rect(ctx, x + 2 + k * 5, y + 24, 2, 1, '#9ac4e8'); }
    else if (side === 'han') {
      for (let i = 0; i < 2; i++) smoke(ctx, x + 6, y + 1, ms, i, '#6a6460');
      if (tick % 4 < 2) { rect(ctx, x + 22 + (tick % 3), y + 20, 1, 1, '#ffd27a'); rect(ctx, x + 25, y + 19 - (tick % 2), 1, 1, C.fire); }
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(ms / 200); rect(ctx, x + 6, y + 25, 7, 5, '#ffd27a'); ctx.globalAlpha = 1;
    }
  } else if (b.type === 'barracks') {
    if (side === 'yan') for (let i = 0; i < 2; i++) smoke(ctx, x + 36, y - 1, ms, i);
    else if (side === 'zhao') { const k = tick % 12; if (k < 3) rect(ctx, x + 11 + k * 13, y + 20, 1, 1, HORSE); }
    else if (side === 'qi') rect(ctx, x + 44 + (tick % 2), y + 8, 1, 1, t.light);
  } else if (b.type === 'hq') {
    if (side === 'qi') { if (tick % 8 < 4) rect(ctx, x + 29, y + 27, 1, 1, K.trim); else rect(ctx, x + 34, y + 27, 1, 1, K.trim); }
    else if (side === 'yan') { if (tick % 6 < 3) rect(ctx, x + 10 + (tick * 7) % 44, y + 4 + (tick * 3) % 30, 1, 1, C.white); }
    else if (side === 'wei') { const k = Math.floor(ms / 250) % 12; rect(ctx, x + 4 + k * 5, y + 46, 2, 1, '#9ac4e8'); }
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  const side = sideId(p.faction);
  if (side === 'chu' && p.kind === 'lob') {
    // A flying zongzi
    rect(ctx, x - 2, y - 2, 5, 4, C.O);
    rect(ctx, x - 1, y - 1, 3, 2, '#5a9a3a');
    rect(ctx, x, y - 2, 1, 1, '#5a9a3a');
    rect(ctx, x - 1, y, 3, 1, '#e8d8a0');
    return;
  }
  if (side === 'qi' && p.kind === 'bullet' && p.shooter?.type === 'sniper') {
    // A devastating counter-argument
    rect(ctx, x - 2, y - 2, 5, 4, C.O);
    rect(ctx, x - 1, y - 1, 3, 2, C.white);
    rect(ctx, x, y - 1, 1, 1, C.O);
    rect(ctx, x - 2 - dx, y + 2, 1, 1, C.white);
    return;
  }
  if (side === 'yan' && p.kind === 'lob') {
    // A snowball (packed around a stone, to be fair)
    rect(ctx, x - 1, y - 1, 4, 4, C.O);
    rect(ctx, x - 1, y - 1, 3, 3, C.white);
    rect(ctx, x + 1, y + 1, 1, 1, '#c8d4e0');
    return;
  }
  qinProjectile(ctx, p, x, y, dx, dy);
}

// Fallen troops just lie down; no blood, it's that kind of war.
function corpse(e) {
  const side = sideId(e.f);
  if (side === 'qin') return qinCorpse(e);
  const K = KD[side];
  const t = team(e.f);
  if (side === 'zhao' && e.type === 'scout') {
    const [c, g] = canvas(22, 8);
    outlined(g, [[3, 3, 15, 4, HORSE], [17, 2, 4, 3, HORSE], [0, 4, 3, 2, '#3a2616'], [8, 1, 5, 2, K.armor]], [[6, 3, 7, 1, t.main], [19, 3, 1, 1, C.O], [8, 0, 2, 1, K.accent]]);
    return { c, ax: 11, ay: 7 };
  }
  const [c, g] = canvas(14, 6);
  const body = e.type === 'engineer' || (side === 'qi' && e.type === 'sniper') ? K.robe : side === 'yan' && e.type === 'scout' ? '#e8eef4' : K.armor;
  const cap = side === 'yan' ? K.accent : side === 'wei' ? K.armorL : side === 'chu' ? K.armorD : side === 'qi' ? K.armor : side === 'zhao' ? K.accent : K.armorD;
  outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, body], [11, 3, 2, 2, side === 'zhao' ? K.robe : C.boot]], [[0, 1, 3, 2, cap], [5, 3, 2, 1, t.main]]);
  if (side === 'wei') { g.fillStyle = C.O; g.fillRect(6, 0, 5, 2); g.fillStyle = SACK; g.fillRect(7, 0, 3, 2); }
  if (side === 'yan' && e.type === 'scout') { g.fillStyle = C.woodLight; g.fillRect(0, 5, 14, 1); }
  return { c, ax: 7, ay: 5 };
}
function corpseKey(e) { return `ko-${sideId(e.f)}-${e.type}`; }

// Kite streamers flutter in each kingdom's colours.
function rotor(ctx, u, x, y) {
  if (sideId(u.faction) === 'qin' || u.type !== 'helicopter') { qinRotor(ctx, u, x, y); return; }
  const tick = Math.floor(performance.now() / 120);
  const s = u.facing;
  const K = kd(u.faction);
  const tailX = s > 0 ? x - 14 : x + 13;
  for (let i = 0; i < 6; i++) rect(ctx, tailX - i * 2 * s, y - 11 + i + ((tick + i) % 2), 2, 1, i % 2 ? team(u.faction).light : K.trim);
}

// ── The seven kingdoms, as seen on the picker ──────────────────────────────
const SIDES = [
  {
    id: 'qin', name: 'Qin', short: 'Qin',
    blurb: 'Standard axles, standard coins, standard soldiers (8,000 of them, in clay). Even the jokes are regulation length.',
    names: {
      soldier: 'Halberdier', heavy: 'Terracotta Guard', scout: 'Spy', engineer: 'Mohist', sniper: 'Crossbow',
      jeep: 'Chariot', tank: 'Bolt Cart', artillery: 'Stone Thrower', helicopter: 'War Kite', bomber: 'Sky Lantern',
      hq: 'Standard Palace', barracks: 'Garrison', turret: 'Watchtower', wall: 'Long Rampart', mine: 'Coin Foundry',
      workshop: 'Axle Works', airbase: 'Kite Tower', bridge: 'Bridge (Std.)', ramp: 'Steps (Std.)',
    },
    icons: { hq: '👑', barracks: '🛡️', mine: '🪙', workshop: '⚙️' },
    win: 'All under heaven, unified. Please fill in form 7B in triplicate.',
    lose: 'Defeat was not in the rule-book. A new rule has been written.',
  },
  {
    id: 'chu', name: 'Chu', short: 'Chu',
    blurb: 'The big, lacquered south: shamans, poets, bronze bells and a dragon boat on wheels. Ammunition: zongzi. Lunch: also zongzi.',
    names: {
      soldier: 'Dagger-Axe', heavy: 'Lacquer Guard', scout: 'Shaman', engineer: 'Lacquerer', sniper: 'Chu Bowman',
      jeep: 'Chariot', tank: 'Dragon Boat', artillery: 'Zongzi Lobber', helicopter: 'Phoenix Kite', bomber: 'Poem Lantern',
      hq: 'Lacquer Palace', barracks: 'Boathouse', turret: 'Drum Tower', wall: 'Marsh Rampart', mine: 'Zongzi Kitchen',
      workshop: 'Bell Foundry', airbase: 'Kite Marsh', bridge: 'Lotus Bridge', ramp: 'Paddy Steps',
    },
    icons: { hq: '🏮', barracks: '🐉', mine: '🍙', workshop: '🔔', airbase: '🪁' },
    win: 'Victory! A poet is already writing a very long, very sad poem about it.',
    lose: 'Lost, but the dumplings were excellent.',
  },
  {
    id: 'qi', name: 'Qi', short: 'Qi',
    blurb: 'Rich on salt and iron by the sea. Its Jixia scholars would rather debate the war than fight it, and usually win the debate.',
    names: {
      soldier: 'Spearman', heavy: 'Salt Guard', scout: 'Salt Smuggler', engineer: 'Salt Hauler', sniper: 'Debater',
      jeep: 'Chariot', tank: 'Land Junk', artillery: 'Iron Thrower', helicopter: 'Sea Kite', bomber: 'Fish Lantern',
      hq: 'Jixia Academy', barracks: 'Harbour Hall', turret: 'Sea Watch', wall: 'Sea Wall', mine: 'Salt Pans',
      workshop: 'Ironworks', airbase: 'Kite Pier', bridge: 'Jetty', ramp: 'Quay Steps',
    },
    icons: { hq: '📜', barracks: '⚓', mine: '🧂', workshop: '⚒️', airbase: '🪁' },
    win: 'Victory, as argued convincingly over three hundred scrolls.',
    lose: 'Defeated, but we have prepared a rebuttal.',
  },
  {
    id: 'zhao', name: 'Zhao', short: 'Zhao',
    preview: ['soldier', 'scout', 'jeep', 'helicopter'],
    blurb: 'King Wuling\'s big idea: trousers. Ride like the nomads, shoot from the saddle, and never trip over a robe again.',
    names: {
      soldier: 'Trouser Guard', heavy: 'Felt Guard', scout: 'Horse Archer', engineer: 'Stable Hand', sniper: 'Trouser Archer',
      jeep: 'Not-a-Chariot', tank: 'Bolt Cart', artillery: 'Stone Thrower', helicopter: 'Steppe Kite', bomber: 'Saddle Lantern',
      hq: 'Congtai Terrace', barracks: 'Stables', turret: 'Watchtower', wall: 'Rampart', mine: 'Trouser Tailor',
      workshop: 'Saddlery', airbase: 'Kite Paddock', bridge: 'Bridge', ramp: 'Mounting Block',
    },
    icons: { hq: '🏯', barracks: '🐎', mine: '👖', workshop: '🏇', airbase: '🪁' },
    win: 'Victory! Trousers: officially the future.',
    lose: 'Defeated. Should have worn the trousers.',
  },
  {
    id: 'yan', name: 'Yan', short: 'Yan',
    preview: ['soldier', 'heavy', 'jeep', 'helicopter'],
    blurb: 'The far, frozen north: fur hats, horse sleds and a long wall of its own. Built a wall before it was cool. Everything up here is cool.',
    names: {
      soldier: 'Fur Spearman', heavy: 'Bear Hat', scout: 'Ski Scout', engineer: 'Snow Shoveller', sniper: 'Frost Crossbow',
      jeep: 'Horse Sled', tank: 'Bolt Cart', artillery: 'Snowball Engine', helicopter: 'Blizzard Kite', bomber: 'Snow Lantern',
      hq: 'Snow Palace', barracks: 'Fur Lodge', turret: 'Frost Tower', wall: 'Northern Wall', mine: 'Fur Trader',
      workshop: 'Sled Works', airbase: 'Kite Drift', bridge: 'Ice Bridge', ramp: 'Icy Steps',
    },
    icons: { hq: '❄️', barracks: '🛖', wall: '🧱', mine: '🦊', workshop: '🛷', airbase: '🪁' },
    win: 'Victory! Everyone gets an extra fur hat.',
    lose: 'Defeated. It was too cold to fight properly anyway.',
  },
  {
    id: 'wei', name: 'Wei', short: 'Wei',
    blurb: 'Elite Wuzu infantry march in full iron armour with a crossbow and three days\' food on their backs. Also: excellent canals.',
    names: {
      soldier: 'Wuzu Halberd', heavy: 'Wuzu Ironclad', scout: 'Ration Runner', engineer: 'Canal Digger', sniper: 'Heavy Crossbow',
      jeep: 'Chariot', tank: 'Iron Tortoise', artillery: 'Stone Thrower', helicopter: 'Iron Kite', bomber: 'Ration Lantern',
      hq: 'Iron Citadel', barracks: 'Wuzu Armoury', turret: 'Watchtower', wall: 'Rampart', mine: 'Canal Toll',
      workshop: 'Armour Smithy', airbase: 'Kite Tower', bridge: 'Canal Bridge', ramp: 'Lock Steps',
    },
    icons: { hq: '🏰', barracks: '🎒', mine: '🚣', workshop: '⚒️' },
    win: 'Victory, and there are still two days of rations left!',
    lose: 'Defeated. The armour was heavy. The snacks were heavier.',
  },
  {
    id: 'han', name: 'Han', short: 'Han',
    blurb: 'The smallest kingdom, wedged in the middle and a bit nervous about it. Makes up for it with the best crossbows and iron swords around.',
    names: {
      soldier: 'Iron Swordsman', heavy: 'Big Shield', scout: 'Nervous Lookout', engineer: 'Essayist', sniper: 'Best Crossbow',
      jeep: 'Chariot', tank: 'Triple Crossbow', artillery: 'Worried Thrower', helicopter: 'Peek Kite', bomber: 'Panic Lantern',
      hq: 'Tiny Palace', barracks: 'Crossbow Range', turret: 'Extra Tower', wall: 'Extra Rampart', mine: 'Iron Forge',
      workshop: 'Crossbow Works', airbase: 'Kite Tower', bridge: 'Escape Bridge', ramp: 'Escape Steps',
    },
    icons: { hq: '🏠', barracks: '🎯', mine: '🗡️', workshop: '🏹', turret: '🗼' },
    win: 'We won?! Quick, someone write an essay about it.',
    lose: 'Well, we did say we were worried.',
  },
];

export default {
  id: 'warring',
  name: 'Warring States',
  sides: SIDES,
  palette,
  teamBase: LAMELLAR,
  roofBase: [0.3, 0.32, 0.34],
  soldier: buildSoldier,
  vehicle: { jeep: veh('jeep'), tank: veh('tank'), artillery: veh('artillery') },
  aircraft: { helicopter: buildKite, bomber: buildLantern },
  buildings: Object.fromEntries(Object.keys(BUILD).map((k) => [k, (g, t, f) => (SIDE_BUILD[sideId(f)]?.[k] || BUILD[k])(g, t, f)])),
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
  corpseKey,
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
