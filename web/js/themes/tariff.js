// Trade Wars: a satire of tariff-happy politics and how it backfired. Gold
// towers, golf resorts, penguin tariffs, factories "coming soon", burned
// bridges, prices going up the ramp and a crashing stock chart, under the
// watchful eye of an orange caricature on a billboard and a baby balloon.
// Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#1a1418',                        // outline
  skin: '#f0c098', skinDark: '#c8906a', hair: '#4a3020',
  boot: '#1e1a1e', gun: '#2e2e34', gunLight: '#5e5e66', gunDark: '#1a1a1e',
  yellow: '#f8dc6a', yellowDark: '#d8b040', red: '#d8322a', redDark: '#8a1e1a', white: '#f8f6f0',
  sky: ['#4a8ad0', '#5a98d8', '#6aa6e0', '#7cb4e8', '#90c2ee', '#a6d0f2', '#bcdef6'],
  orange: '#f2963a', orangeDark: '#c86a20', orangeLight: '#f8b46a', pale: '#f8dcb4',
  navy: '#22305a', navyLight: '#3a4a7a', navyDark: '#141c38',
  gold: '#f2c84a', goldLight: '#fff0a0', goldDark: '#b8862a',
  marble: '#ece8e0', marbleShade: '#c8c2b6', marbleVein: '#a8a298',
  steel: '#8a949c', steelLight: '#b4bcc4', steelDark: '#5a626a', rust: '#7a4a32', rustLight: '#9a6244',
  brick: '#9a4a36', brickDark: '#6e3224', brickLight: '#b8624a',
  wood: '#7a5234', woodLight: '#a47448', woodDark: '#4e3420', char: '#2a2220', ember: '#f28a30',
  green: '#4aa04a', greenLight: '#6ac05a', greenDark: '#2e7a34', hedge: '#2e6a34',
  dirt: '#6a4a32', dirtMid: '#5a3e2a', dirtDeep: '#46301e', pebble: '#8a6a4e', pebbleDark: '#3a2618',
  penguin: '#1e1e26', beak: '#f2a030', ice: '#d8eef8', water: '#3a7ac0',
  fire: '#f28a30', glass: '#9ad0f0', glassDark: '#5a8ab0', smoke: '#d8d4d0', shadow: 'rgba(0,0,0,0.3)',
};
const SUIT = [0.2, 0.22, 0.32];

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right — the same frame as Classic.
function buildSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'scout') {
    // A penguin from the islands that got tariffed, in a team scarf
    const feet = frame ? [[6, 15, 3, 1], [10, 15, 2, 1]] : [[5, 15, 2, 1], [9, 15, 3, 1]];
    parts = [
      ...feet.map((b) => [...b, C.beak]),
      [6, 5, 7, 10, C.penguin], [7, 2, 5, 4, C.penguin], [12, 4, 2, 1, C.beak],
      frame ? [4, 7, 2, 4, C.penguin] : [4, 8, 2, 5, C.penguin], frame ? [13, 8, 2, 5, C.penguin] : [13, 7, 2, 4, C.penguin],
    ];
    details = [
      [8, 7, 4, 7, C.white], [9, 3, 2, 1, C.white], [10, 3, 1, 1, C.O], [7, 6, 6, 1, t.main], [6, 7, 1, 3, t.main], [7, 5, 5, 1, C.penguin],
    ];
  } else if (type === 'heavy') {
    // Steel tariff: a steelworker in a hard hat lugging an I-beam cannon
    parts = [
      ...legs.map((l) => [...l, C.navyLight]), ...boots.map((b) => [...b, C.boot]),
      [4, 7, 9, 5, C.steelDark], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, t.main], [4, 3, 10, 1, t.dark],
      [9, 9, 10, 3, C.steel],
    ];
    details = [
      [6, 1, 6, 1, t.light], [10, 5, 1, 1, C.O], [8, 6, 3, 1, C.hair], [7, 7, 4, 1, C.skinDark],
      [9, 9, 10, 1, C.steelLight], [9, 11, 10, 1, C.steelLight], [10, 10, 8, 1, C.steelDark], [18, 10, 1, 1, C.O], [5, 8, 2, 3, C.steel],
    ];
  } else if (type === 'engineer') {
    // Lobbyist: grey suit, slick hair, briefcase, a team tie
    parts = [
      ...legs.map((l) => [...l, '#3a3a44']), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, '#5a5a66'], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair], [12, 10, 5, 4, C.wood], [13, 9, 3, 1, C.woodDark],
    ];
    details = [
      [7, 8, 3, 1, C.white], [8, 8, 1, 3, t.main], [10, 5, 1, 1, C.O], [8, 6, 3, 1, '#a85a40'], [6, 1, 6, 1, '#6a4a30'],
      [14, 11, 1, 1, C.gold], [12, 12, 5, 1, C.woodDark],
    ];
  } else if (type === 'sniper') {
    // Economist: tweed, round glasses, bow tie, saw it all coming from miles away
    parts = [
      ...legs.map((l) => [...l, '#4a4030']), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, '#7a5a3a'], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, '#c8c8c8'], [5, 2, 1, 3, '#c8c8c8'],
      [9, 9, 10, 1, C.woodDark], [12, 7, 4, 1, C.gun],
    ];
    details = [
      [8, 4, 4, 1, C.O], [9, 4, 1, 1, '#d8eef8'], [11, 4, 1, 1, '#d8eef8'], [7, 7, 4, 1, C.skinDark], [8, 8, 2, 1, t.main],
      [6, 10, 2, 1, '#5a4028'], [12, 8, 1, 1, C.gun], [18, 9, 1, 1, C.O],
    ];
  } else {
    // Tariff agent: navy customs uniform, peaked cap, rifle
    parts = [
      ...legs.map((l) => [...l, C.navy]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.navy], [6, 3, 6, 5, C.skin], [5, 1, 8, 2, C.navy], [10, 3, 3, 1, C.navyDark],
      [10, 9, 8, 1, C.gun], [10, 10, 2, 2, C.gun],
    ];
    details = [
      [5, 2, 8, 1, t.main], [7, 1, 2, 1, C.gold], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [5, 9, 2, 1, t.main], [8, 9, 1, 1, C.gold], [5, 10, 7, 1, C.navyDark], [17, 9, 1, 1, C.O],
    ];
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── Vehicles ───────────────────────────────────────────────────────────────
function wheel(g, x, y, r, frame, hub = C.gunLight) {
  disc(g, x, y, r + 1, C.O);
  disc(g, x, y, r, C.gunDark);
  disc(g, x, y, Math.max(1, r - 1), hub);
  g.fillStyle = C.gunDark;
  if (frame) g.fillRect(x, y - 1, 1, 3); else g.fillRect(x - 1, y, 3, 1);
}

// Golf cart: striped canopy, golf bag on the back, a golf-ball gun up front.
function buildGolfCart(f, frame) {
  const t = team(f);
  const [c, g] = canvas(28, 18);
  outlined(g, [
    [3, 1, 20, 2, t.main], [4, 3, 1, 7, C.white], [21, 3, 1, 7, C.white], [2, 9, 22, 4, C.white], [20, 7, 5, 5, C.white],
    [6, 7, 8, 2, C.redDark], [9, 3, 4, 4, C.skin], [0, 4, 3, 8, C.greenDark], [23, 6, 4, 1, C.gun],
  ], [
    [3, 1, 2, 2, C.white], [8, 1, 2, 2, C.white], [13, 1, 2, 2, C.white], [18, 1, 2, 2, C.white],
    [9, 3, 4, 1, C.white], [12, 4, 1, 1, C.O], [2, 11, 22, 1, t.main], [24, 9, 1, 1, C.yellow], [0, 4, 3, 1, C.greenLight],
  ]);
  g.fillStyle = C.steelLight; g.fillRect(0, 1, 1, 3); g.fillRect(2, 2, 1, 2);
  wheel(g, 7, 14, 2, frame);
  wheel(g, 20, 14, 2, frame);
  return { c, ax: 13, ay: 17 };
}

// Golden tank: a gold-plated tank with spinner rims and the odd diamond.
function buildGoldTank(f, frame) {
  const t = team(f);
  const [c, g] = canvas(38, 22);
  outlined(g, [
    [2, 15, 32, 5, '#3a3020'], [3, 9, 30, 6, C.gold], [11, 4, 13, 6, C.gold], [24, 6, 12, 2, C.goldDark],
  ], [
    [3, 9, 30, 1, C.goldLight], [11, 4, 13, 1, C.goldLight], [4, 12, 28, 1, t.main], [15, 6, 4, 2, t.main],
    [8, 10, 1, 1, C.white], [21, 10, 1, 1, C.white], [28, 11, 1, 1, C.white], [17, 5, 1, 1, C.white], [35, 6, 1, 2, C.O],
  ]);
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 5;
    g.fillStyle = C.goldDark; g.fillRect(x, 16, 3, 3);
    g.fillStyle = C.goldLight; g.fillRect(x + (frame ? 0 : 2), 16 + (frame ? 0 : 2), 1, 1); g.fillRect(x + (frame ? 2 : 0), 16 + (frame ? 2 : 0), 1, 1);
  }
  return { c, ax: 18, ay: 21 };
}

// Tariff launcher: a striped cannon that lobs percentage signs, with a crate of spares.
function pct(g, x, y, col) {
  g.fillStyle = col;
  g.fillRect(x, y, 1, 1); g.fillRect(x + 2, y, 1, 1); g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x, y + 2, 1, 1); g.fillRect(x + 2, y + 2, 1, 1);
}
function buildLauncher(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 19);
  outlined(g, [
    [2, 11, 24, 3, C.wood], [1, 5, 8, 6, C.woodLight], [10, 7, 6, 4, C.red], [14, 4, 6, 4, C.red], [18, 1, 5, 4, C.red], [22, 0, 4, 5, C.gold],
  ], [
    [2, 11, 24, 1, t.main], [1, 5, 8, 1, C.wood], [11, 8, 1, 2, C.white], [13, 7, 1, 3, C.white], [16, 5, 1, 2, C.white], [18, 4, 1, 1, C.white],
    [20, 2, 1, 2, C.white], [22, 0, 4, 1, C.goldLight], [10, 9, 6, 1, C.navy],
  ]);
  pct(g, 2, 7, C.O); pct(g, 5, 7, C.red);
  wheel(g, 8, 15, 3, frame, C.gold);
  wheel(g, 20, 15, 3, frame, C.gold);
  return { c, ax: 15, ay: 18 };
}

// Spin copter: gold-and-white helicopter with a spiral on the side (rotors spin live).
function buildSpinCopter(f) {
  const t = team(f);
  const [c, g] = canvas(32, 16);
  outlined(g, [
    [10, 4, 15, 8, C.white], [1, 6, 10, 2, C.white], [0, 3, 3, 4, t.main],
    [17, 2, 2, 2, C.gun], [13, 12, 1, 2, C.gun], [21, 12, 1, 2, C.gun], [10, 14, 15, 1, C.gold],
  ], [
    [19, 5, 5, 4, C.glass], [22, 5, 2, 1, C.white], [10, 10, 15, 1, C.gold], [1, 7, 10, 1, t.main],
    [12, 6, 4, 1, t.main], [12, 6, 1, 3, t.main], [12, 8, 3, 1, t.main], [14, 7, 1, 1, t.main], [10, 4, 9, 1, C.marble],
  ]);
  return { c, ax: 16, ay: 13 };
}

// Hot-air blimp: an orange gasbag wearing a magnificent yellow comb-over.
function buildBlimp(f) {
  const t = team(f);
  const [c, g] = canvas(46, 21);
  outlined(g, [
    [6, 4, 34, 10, C.orange], [4, 6, 3, 6, C.orange], [39, 5, 4, 8, C.orange], [1, 4, 4, 4, t.main], [1, 10, 4, 4, t.main],
    [16, 14, 14, 4, C.gold], [9, 1, 26, 3, C.yellow], [33, 2, 8, 3, C.yellow],
  ], [
    [6, 12, 34, 1, C.orangeDark], [8, 5, 30, 1, C.orangeLight], [9, 1, 26, 1, C.goldLight], [36, 4, 5, 1, C.yellowDark],
    [12, 2, 20, 1, C.yellowDark], [6, 9, 34, 1, t.main], [17, 15, 2, 1, C.glass], [21, 15, 2, 1, C.glass], [25, 15, 2, 1, C.glass],
  ]);
  return { c, ax: 23, ay: 16 };
}

function rotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 50);
  const s = u.facing;
  if (u.type === 'helicopter') {
    if (tick % 2) rect(ctx, x - 15, y - 12, 30, 1, C.gunLight);
    else { rect(ctx, x - 7, y - 12, 14, 1, C.gun); rect(ctx, x - 1, y - 13, 2, 1, C.gold); }
    const tx = s > 0 ? x - 15 : x + 14;
    if (tick % 2) rect(ctx, tx, y - 12, 1, 5, C.gunLight); else rect(ctx, tx - 2, y - 10, 5, 1, C.gunLight);
  } else {
    // Rear propeller, and the comb-over flaps in the wind
    const px = s > 0 ? x - 23 : x + 22;
    if (tick % 2) rect(ctx, px, y - 12, 1, 7, C.smoke); else rect(ctx, px, y - 9, 1, 2, C.smoke);
    const fx = s > 0 ? x + 18 : x - 19;
    rect(ctx, fx, y - 14 + (Math.floor(tick / 3) % 2), 1, 1, C.yellow);
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
// The caricature: an orange face under a swoop of yellow hair, pale goggle
// marks round the eyes, a tiny pursed mouth and a tie that never ends.
function caricature(g, cx, top, tieLen) {
  g.fillStyle = C.navyDark; g.fillRect(cx - 8, top + 15, 16, 4);
  disc(g, cx, top + 9, 7, C.O);
  disc(g, cx, top + 9, 6, C.orange);
  g.fillStyle = C.orangeDark; g.fillRect(cx - 5, top + 13, 10, 1); g.fillRect(cx - 4, top + 14, 8, 1);
  g.fillStyle = C.pale; g.fillRect(cx - 4, top + 8, 3, 2); g.fillRect(cx + 1, top + 8, 3, 2);
  g.fillStyle = C.O; g.fillRect(cx - 3, top + 9, 1, 1); g.fillRect(cx + 2, top + 9, 1, 1);
  g.fillStyle = C.redDark; g.fillRect(cx - 1, top + 12, 2, 1);
  // Hair: a great swoop over the top and off to one side
  g.fillStyle = C.O; g.fillRect(cx - 7, top + 1, 15, 4); g.fillRect(cx + 5, top + 3, 5, 3);
  g.fillStyle = C.yellow; g.fillRect(cx - 6, top + 2, 13, 2); g.fillRect(cx + 5, top + 4, 4, 1); g.fillRect(cx - 7, top + 4, 2, 2);
  g.fillStyle = C.goldLight; g.fillRect(cx - 4, top + 2, 8, 1);
  g.fillStyle = C.yellowDark; g.fillRect(cx - 6, top + 3, 4, 1);
  // Shirt, and the very long red tie
  g.fillStyle = C.white; g.fillRect(cx - 2, top + 15, 4, 2);
  g.fillStyle = C.O; g.fillRect(cx - 2, top + 16, 4, tieLen + 1);
  g.fillStyle = C.red; g.fillRect(cx - 1, top + 16, 2, tieLen);
}

function goldTrim(g, x, y, w) { g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, 3); g.fillStyle = C.gold; g.fillRect(x, y, w, 1); }

function marbleColumns(g, x, y, w, h, n) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = C.marbleShade; g.fillRect(x, y, w, h);
  const step = w / n;
  for (let i = 0; i < n; i++) {
    const cx = Math.round(x + step * i + step / 2);
    g.fillStyle = C.marble; g.fillRect(cx - 1, y, 3, h);
    g.fillStyle = C.gold; g.fillRect(cx - 2, y, 5, 1); g.fillRect(cx - 2, y + h - 1, 5, 1);
  }
}

const BUILD = {
  hq(g, t) {
    // Golden tower: gaudy gold glass, low gold wings, and a giant billboard
    // of the caricature whose tie reaches all the way down to the door
    outlined(g, [[3, 24, 15, 24, C.gold], [46, 24, 15, 24, C.gold], [17, 3, 30, 45, C.goldDark]], [[3, 24, 15, 1, C.goldLight], [46, 24, 15, 1, C.goldLight]]);
    g.fillStyle = C.gold;
    for (let y = 5; y < 46; y += 4) for (let x = 19; x < 45; x += 4) g.fillRect(x, y, 2, 2);
    for (const x0 of [5, 48]) for (let y = 27; y < 46; y += 4) for (let x = x0; x < x0 + 11; x += 4) { g.fillStyle = C.goldDark; g.fillRect(x, y, 2, 2); }
    g.fillStyle = C.O; g.fillRect(19, 6, 26, 21);
    g.fillStyle = C.navy; g.fillRect(20, 7, 24, 19);
    g.fillStyle = C.gold; g.fillRect(19, 6, 26, 1); g.fillRect(19, 26, 26, 1);
    caricature(g, 32, 7, 12);
    outlined(g, [[26, 40, 12, 8, C.gold]], [[26, 40, 12, 1, C.goldLight], [31, 41, 2, 7, C.goldDark]]);
    g.fillStyle = C.red; g.fillRect(28, 47, 8, 1);
    for (const x of [8, 54]) { g.fillStyle = C.O; g.fillRect(x - 1, 13, 3, 12); g.fillStyle = C.goldLight; g.fillRect(x, 13, 1, 11); g.fillStyle = C.O; g.fillRect(x + 1, 12, 8, 6); g.fillStyle = t.main; g.fillRect(x + 1, 13, 7, 4); g.fillStyle = C.white; g.fillRect(x + 1, 15, 7, 1); }
    g.fillStyle = C.O; g.fillRect(31, 0, 2, 4); g.fillStyle = C.goldLight; g.fillRect(31, 0, 1, 3);
  },
  barracks(g, t) {
    // Rally tent: a red-and-white big top with bunting and a podium
    for (let i = 0; i < 16; i++) {
      const half = Math.round(2 + i * 1.4);
      g.fillStyle = C.O; g.fillRect(24 - half - 1, 2 + i, half * 2 + 2, 1);
      for (let x = 24 - half; x < 24 + half; x++) { g.fillStyle = Math.floor((x - 24 + 40) / 4) % 2 ? C.red : C.white; g.fillRect(x, 2 + i, 1, 1); }
    }
    g.fillStyle = C.O; g.fillRect(2, 18, 44, 14);
    for (let x = 3; x < 45; x++) { g.fillStyle = Math.floor(x / 4) % 2 ? C.red : C.white; g.fillRect(x, 18, 1, 14); }
    g.fillStyle = C.O; g.fillRect(19, 21, 10, 11); g.fillStyle = '#2a1a1e'; g.fillRect(20, 22, 8, 10);
    outlined(g, [[21, 26, 6, 6, C.navy]], [[23, 27, 2, 2, C.gold]]);
    g.fillStyle = C.O; g.fillRect(23, 0, 1, 3); g.fillRect(24, 0, 5, 3); g.fillStyle = t.main; g.fillRect(24, 0, 4, 2);
    for (let i = 0; i < 7; i++) { g.fillStyle = [t.main, C.white, C.navy][i % 3]; g.fillRect(4 + i * 6, 19 + (i % 2), 3, 2); }
  },
  turret(g, t) {
    // Tariff booth: a toll booth with a striped barrier and a gun on the roof
    outlined(g, [[6, 13, 14, 19, C.white], [4, 10, 18, 3, C.red], [9, 5, 8, 5, C.gun], [16, 6, 12, 2, C.gun]], [
      [6, 13, 14, 1, C.navy], [8, 16, 10, 6, C.glass], [8, 16, 10, 1, C.glassDark], [4, 10, 18, 1, C.white], [9, 5, 8, 1, C.gunLight], [27, 6, 1, 1, C.O],
      [7, 26, 12, 2, t.main],
    ]);
    g.fillStyle = C.O; g.fillRect(20, 22, 12, 3);
    for (let x = 20; x < 32; x++) { g.fillStyle = Math.floor(x / 2) % 2 ? C.red : C.white; g.fillRect(x, 23, 1, 1); }
    g.fillStyle = C.O; g.fillRect(21, 24, 2, 8);
    pct(g, 11, 18, C.red);
  },
  wall(g, t) {
    // The big beautiful wall: steel bollards with gold tips, and a slightly
    // taller ladder leaning on it
    g.fillStyle = C.O; g.fillRect(0, 2, 16, 30);
    for (let x = 0; x < 16; x += 3) {
      g.fillStyle = C.rust; g.fillRect(x, 3, 2, 29);
      g.fillStyle = C.rustLight; g.fillRect(x, 3, 1, 29);
      g.fillStyle = C.gold; g.fillRect(x, 2, 2, 2);
    }
    g.fillStyle = C.O; g.fillRect(0, 26, 16, 2); g.fillStyle = t.main; g.fillRect(0, 26, 16, 1);
    g.fillStyle = C.woodLight;
    for (let i = 0; i < 32; i++) { g.fillRect(9 + Math.floor(i / 6), i, 1, 1); g.fillRect(13 + Math.floor(i / 6), i, 1, 1); }
    for (let i = 2; i < 32; i += 4) g.fillRect(9 + Math.floor(i / 6), i, 5, 1);
  },
  mine(g, t) {
    // Golf resort: the money really comes from here
    outlined(g, [[2, 14, 20, 18, C.white], [0, 10, 24, 4, C.red]], [[0, 10, 24, 1, '#ea6a5a'], [2, 14, 20, 1, C.gold], [2, 30, 20, 2, C.marbleShade]]);
    for (const x of [5, 15]) { g.fillStyle = C.O; g.fillRect(x - 1, 17, 5, 6); g.fillStyle = C.glass; g.fillRect(x, 18, 3, 4); }
    g.fillStyle = C.O; g.fillRect(9, 22, 6, 10); g.fillRect(10, 21, 4, 1); g.fillStyle = C.gold; g.fillRect(10, 22, 4, 10);
    g.fillStyle = C.O; g.fillRect(17, 28, 15, 4); g.fillStyle = C.greenLight; g.fillRect(18, 28, 14, 3); g.fillStyle = C.green; g.fillRect(18, 30, 14, 1);
    g.fillStyle = C.O; g.fillRect(26, 29, 2, 1);
    g.fillStyle = C.O; g.fillRect(27, 11, 1, 18); g.fillRect(28, 10, 5, 5); g.fillStyle = t.main; g.fillRect(28, 11, 4, 3);
    disc(g, 22, 29, 1, C.white);
    g.fillStyle = C.gold; g.fillRect(10, 11, 4, 2);
  },
  workshop(g, t) {
    // Factory (coming soon): boarded windows, cold chimneys with cobwebs, a
    // banner with a clock on it
    outlined(g, [[2, 12, 44, 20, C.brick], [8, 2, 4, 10, C.brickDark], [36, 4, 4, 8, C.brickDark]], [[2, 12, 44, 1, C.brickLight]]);
    g.fillStyle = C.brickDark;
    for (let y = 15; y < 32; y += 3) { g.fillRect(2, y, 44, 1); for (let x = 2 + (y % 2 ? 2 : 5); x < 46; x += 6) g.fillRect(x, y - 2, 1, 2); }
    for (const x of [6, 18, 30]) {
      g.fillStyle = C.O; g.fillRect(x - 1, 16, 10, 7); g.fillStyle = '#2a1e1a'; g.fillRect(x, 17, 8, 5);
      g.fillStyle = C.woodLight; for (let i = 0; i < 8; i++) { g.fillRect(x + i, 17 + Math.floor(i * 5 / 8), 1, 1); g.fillRect(x + i, 21 - Math.floor(i * 5 / 8), 1, 1); }
    }
    outlined(g, [[40, 22, 5, 10, C.steelDark]], [[42, 26, 1, 2, C.gold]]);
    g.fillStyle = C.O; g.fillRect(13, 3, 22, 9); g.fillStyle = t.main; g.fillRect(14, 4, 20, 7);
    disc(g, 24, 7, 4, C.O); disc(g, 24, 7, 3, C.white); g.fillStyle = C.O; g.fillRect(24, 5, 1, 3); g.fillRect(24, 7, 2, 1);
    g.fillStyle = C.white; g.fillRect(16, 6, 5, 1); g.fillRect(16, 8, 4, 1); g.fillRect(27, 6, 5, 1); g.fillRect(28, 8, 4, 1);
    g.fillStyle = 'rgba(240,240,240,0.7)'; g.fillRect(8, 2, 1, 2); g.fillRect(11, 2, 1, 3); g.fillRect(9, 3, 2, 1);
  },
  airbase(g, t) {
    // Gilded helipad: a marble colonnade under a gold deck, a red carpet, gold urns
    marbleColumns(g, 2, 21, 52, 11, 6);
    outlined(g, [[0, 17, 58, 4, C.gold]], [[0, 17, 58, 1, C.goldLight], [0, 20, 58, 1, C.goldDark]]);
    g.fillStyle = C.red; g.fillRect(20, 31, 18, 1);
    for (const x of [2, 52]) { outlined(g, [[x, 11, 4, 6, C.gold]], [[x, 11, 4, 1, C.goldLight]]); }
    g.fillStyle = C.white; g.fillRect(24, 18, 1, 2); g.fillRect(27, 18, 1, 2); g.fillRect(24, 19, 4, 1);
    g.fillStyle = C.O; g.fillRect(60, 2, 2, 30); g.fillStyle = C.goldLight; g.fillRect(60, 3, 1, 29);
    g.fillStyle = C.O; g.fillRect(61, 1, 3, 5); g.fillStyle = t.main; g.fillRect(62, 2, 2, 3);
  },
  bridge(g, t) {
    // Burned bridge: charred planks still glowing
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 7);
    g.fillStyle = C.char; g.fillRect(0, 1, 16, 5);
    g.fillStyle = '#4a3a30'; for (let x = 1; x < 16; x += 3) g.fillRect(x, 2, 2, 3);
    g.fillStyle = C.ember; g.fillRect(3, 1, 1, 1); g.fillRect(9, 4, 1, 1); g.fillRect(13, 2, 1, 1);
    g.fillStyle = C.yellow; g.fillRect(9, 3, 1, 1);
    g.fillStyle = t.main; g.fillRect(6, 5, 2, 1);
  },
  ramp(g, t) {
    // Price ramp: everything only goes up
    g.fillStyle = C.marble; g.fillRect(0, 0, 16, 16);
    g.fillStyle = C.marbleShade; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = C.red; g.fillRect(7, 4, 2, 9); g.fillRect(5, 6, 6, 1); g.fillRect(6, 5, 4, 1); g.fillRect(4, 7, 8, 1);
    g.fillStyle = C.O; g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = C.gold; g.fillRect(1, 0, 14, 1);
    g.fillStyle = t.main; g.fillRect(2, 13, 3, 2);
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
    if (kind === 'dirtTop') {
      // Immaculate golf-course turf, mown in stripes
      g.fillStyle = variant % 2 ? C.green : C.greenLight; g.fillRect(0, 0, T, 4);
      g.fillStyle = variant % 2 ? C.greenLight : C.green; g.fillRect(8, 0, 8, 4);
      g.fillStyle = '#9ae07a'; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.greenDark; g.fillRect(0, 4, T, 1);
    }
  } else {
    // Gilded marble ledge
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.marble; g.fillRect(0, 0, T, T);
    g.fillStyle = C.marbleVein;
    for (let i = 0; i < 6; i++) g.fillRect(Math.floor(hash(seed + i) * 14) + (i % 2), 4 + Math.floor(hash(seed + i + 7) * 8) + Math.floor(i / 2), 2, 1);
    g.fillStyle = C.marbleShade; g.fillRect(0, T - 4, T, 2);
    g.fillStyle = C.gold; g.fillRect(0, 0, T, 2); g.fillRect(0, T - 2, T, 1);
    g.fillStyle = C.goldLight; g.fillRect(0, 0, T, 1);
    g.fillStyle = C.goldDark; g.fillRect(0, 2, T, 1);
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Golf balls and the odd little flag on the fairway.
function surface(ctx, x, y, ground, h) {
  if (!ground) return;
  if (h > 0.92) {
    ctx.fillStyle = C.O; ctx.fillRect(x + 8, y - 7, 1, 7);
    ctx.fillStyle = C.red; ctx.fillRect(x + 9, y - 7, 3, 2);
  } else if (h > 0.75) {
    ctx.fillStyle = C.white; ctx.fillRect(x + 4, y - 1, 1, 1);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};

// Far skyline: a domed capitol, towers, and a big stock board showing a crash.
function skylinePiece(k) {
  const key = `sky${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(44, 60);
  const col = '#6a8ab4';
  const kind = Math.floor(hash(k + 1) * 3);
  g.fillStyle = col;
  if (kind === 0) {
    g.fillRect(4, 44, 36, 16); g.fillRect(10, 38, 24, 6); disc(g, 22, 34, 8, col); g.fillRect(21, 22, 2, 6); g.fillRect(20, 26, 4, 2);
    g.fillStyle = '#7e9cc2'; for (let x = 7; x < 38; x += 3) g.fillRect(x, 46, 1, 12);
  } else if (kind === 1) {
    g.fillRect(6, 8, 14, 52); g.fillRect(24, 20, 14, 40);
    g.fillStyle = '#7e9cc2'; for (let y = 11; y < 58; y += 4) { g.fillRect(8, y, 10, 1); if (y > 22) g.fillRect(26, y, 10, 1); }
  } else {
    // Stock board: the line goes one way
    g.fillRect(20, 30, 3, 30);
    g.fillStyle = '#2a3048'; g.fillRect(2, 6, 40, 26);
    g.fillStyle = '#3a4260'; for (let x = 6; x < 42; x += 6) g.fillRect(x, 7, 1, 24);
    g.fillStyle = '#ff4a3a';
    const pts = [[4, 10], [10, 12], [14, 11], [19, 16], [24, 15], [29, 22], [34, 24], [39, 29]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]; const [x1, y1] = pts[i + 1];
      for (let s = 0; s <= 8; s++) g.fillRect(Math.round(x0 + (x1 - x0) * s / 8), Math.round(y0 + (y1 - y0) * s / 8), 1, 1);
    }
    g.fillRect(36, 26, 5, 1); g.fillRect(37, 27, 3, 1); g.fillRect(38, 28, 1, 1);
  }
  scenery[key] = c;
  return c;
}

// The famous baby balloon: orange, nappy, swoop of hair, phone in hand.
function babyBalloon() {
  if (scenery.baby) return scenery.baby;
  const [c, g] = canvas(30, 40);
  disc(g, 15, 10, 8, C.O); disc(g, 15, 10, 7, C.orange);
  disc(g, 15, 23, 9, C.O); disc(g, 15, 23, 8, C.orange);
  g.fillStyle = C.white; g.fillRect(8, 26, 14, 6); g.fillStyle = C.O; g.fillRect(8, 25, 14, 1); g.fillRect(7, 26, 1, 5); g.fillRect(22, 26, 1, 5);
  g.fillStyle = C.O; g.fillRect(4, 18, 4, 3); g.fillRect(22, 17, 5, 3);
  g.fillStyle = C.orange; g.fillRect(4, 19, 3, 1); g.fillRect(23, 18, 3, 1);
  g.fillStyle = C.gunDark; g.fillRect(25, 15, 3, 4);
  g.fillStyle = C.O; g.fillRect(8, 2, 15, 4); g.fillRect(19, 3, 6, 3);
  g.fillStyle = C.yellow; g.fillRect(9, 3, 13, 2); g.fillRect(20, 4, 4, 1);
  g.fillStyle = C.pale; g.fillRect(11, 9, 3, 2); g.fillRect(16, 9, 3, 2);
  g.fillStyle = C.O; g.fillRect(12, 10, 1, 1); g.fillRect(17, 10, 1, 1);
  g.fillStyle = C.redDark; g.fillRect(14, 13, 2, 2);
  g.fillStyle = C.O; g.fillRect(14, 31, 1, 9);
  scenery.baby = c;
  return c;
}

function topiary(k) {
  const key = `top${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(30, 36);
  if (hash(k + 5) < 0.55) {
    g.fillStyle = C.woodDark; g.fillRect(14, 22, 2, 14);
    disc(g, 15, 15, 9, C.hedge); disc(g, 13, 13, 4, '#3a8040');
  } else {
    // Water hazard with a little ice floe of tariffed penguins
    g.fillStyle = C.water; g.fillRect(0, 32, 30, 4);
    g.fillStyle = C.ice; g.fillRect(6, 30, 16, 3);
    for (const x of [8, 13, 18]) { g.fillStyle = C.penguin; g.fillRect(x, 25, 3, 5); g.fillStyle = C.white; g.fillRect(x + 1, 27, 1, 3); g.fillStyle = C.beak; g.fillRect(x + 3, 26, 1, 1); }
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

  // Clouds
  for (let i = 0; i < 5; i++) {
    const cx = Math.round((((hash(i + 3) * 600 + t * (2 + i) - camAX * 0.05) % (bw + 80)) + bw + 80) % (bw + 80)) - 40;
    const cy = Math.round(groundY - 150 + hash(i + 9) * 60 - camAY * 0.03);
    rect(ctx, cx, cy, 24, 5, '#eef6fc'); rect(ctx, cx + 5, cy - 3, 12, 3, '#eef6fc');
  }

  // The baby balloon, bobbing over the city
  const bx = Math.round(bw * 0.7 - (camAX * 0.08) % 40);
  const by = Math.round(groundY - 120 + Math.sin(t * 0.8) * 3 - camAY * 0.05);
  ctx.drawImage(babyBalloon(), bx, by);

  // Skyline
  const sCount = 12;
  const sSpacing = ((WORLD_W / G) * 0.25) / sCount;
  const sOff = Math.round(camAX * 0.25);
  for (let i = Math.floor((sOff - 50) / sSpacing); i * sSpacing - sOff < bw + 50; i++) {
    const k = ((i % sCount) + sCount) % sCount;
    const img = skylinePiece(k);
    ctx.drawImage(img, Math.round(i * sSpacing - sOff + hash(k + 3) * sSpacing * 0.3), groundY - img.height + 2);
  }
  ctx.globalAlpha = 0.2; rect(ctx, 0, groundY - 14, bw, 14, '#ffffff'); ctx.globalAlpha = 1;

  // Topiary, and water hazards full of penguins
  const count = 36;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    if (hash(k + 70) > 0.7) continue;
    const img = topiary(k);
    ctx.drawImage(img, Math.round(i * spacing - jOff + hash(k) * spacing * 0.5) - 15, groundY - img.height + 3);
  }
}

// Price tags fluttering down.
function weather(ctx, bw, bh, camAX, camAY) {
  const t = performance.now() / 1000;
  const n = Math.min(26, Math.floor((bw * bh) / 9000));
  for (let i = 0; i < n; i++) {
    const y = ((hash(i * 5 + 2) * (bh + 20) + t * (8 + hash(i) * 6) + camAY * 0.3) % (bh + 20)) - 10;
    const x = Math.round((((hash(i * 5 + 3) * (bw + 40) + Math.sin(t + i) * 5 - camAX * 0.4) % (bw + 40)) + bw + 40) % (bw + 40)) - 20;
    const flip = Math.floor(t * 2 + i) % 2;
    ctx.fillStyle = C.white; ctx.fillRect(x, Math.round(y), flip ? 3 : 2, 2);
    ctx.fillStyle = C.red; ctx.fillRect(x, Math.round(y), 1, 1);
  }
}

// Scaffolding with a "coming soon" tarp.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = C.steelDark;
  for (let sx = x + 1; sx < x + w; sx += 7) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(x, sy, w, 1);
  ctx.globalAlpha = 0.6; ctx.fillStyle = C.gold; ctx.fillRect(x + 2, y + 2, Math.floor(w * 0.5), 4); ctx.globalAlpha = 1;
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  const t = team(b.faction);
  if (b.type === 'hq') {
    // The billboard's eyes shift about
    const dx = Math.floor(ms / 1400) % 3 - 1;
    rect(ctx, x + 28, y + 15, 3, 2, C.pale); rect(ctx, x + 33, y + 15, 3, 2, C.pale);
    rect(ctx, x + 29 + dx, y + 16, 1, 1, C.O); rect(ctx, x + 34 + dx, y + 16, 1, 1, C.O);
  } else if (b.type === 'mine') {
    if (tick % 6 < 3) rect(ctx, x + 28, y + 11, 4, 3, t.light);
  } else if (b.type === 'workshop') {
    // A tumbleweed of dust drifts past the closed factory now and then
    const k = (ms / 4000) % 1;
    if (k < 0.5) { ctx.globalAlpha = 0.5; rect(ctx, x + Math.round(k * 90), y + 29, 2, 2, '#c8b08a'); ctx.globalAlpha = 1; }
  } else if (b.type === 'barracks') {
    if (tick % 4 < 2) rect(ctx, x + 23, y + 23, 2, 1, C.yellow);
  } else if (b.type === 'airbase') {
    rect(ctx, x + 64, y + 2 + (tick % 2), 1, 2, t.main);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  if (p.kind === 'bullet') {
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, 'rgba(242,200,74,0.4)');
    rect(ctx, x - dx, y - dy, 1, 1, C.gold);
    rect(ctx, x, y, 2, 1, C.white);
  } else if (p.kind === 'bomb') {
    rect(ctx, x - 1, y - 2, 3, 4, C.O);
    rect(ctx, x - 1, y - 2, 2, 3, C.gold);
    rect(ctx, x - 2, y - 3, 5, 1, C.goldDark);
  } else if (p.kind === 'lob') {
    // A big red percentage sign tumbling through the air
    const s = Math.floor(performance.now() / 120) % 2;
    rect(ctx, x - 2, y - 2, 5, 5, C.white);
    rect(ctx, x - 2, y - 2, 1, 1, C.red); rect(ctx, x + 2, y + 2, 1, 1, C.red);
    if (s) { rect(ctx, x + 1, y - 1, 1, 1, C.red); rect(ctx, x, y, 1, 1, C.red); rect(ctx, x - 1, y + 1, 1, 1, C.red); }
    else { rect(ctx, x - 1, y - 1, 1, 1, C.red); rect(ctx, x, y, 1, 1, C.red); rect(ctx, x + 1, y + 1, 1, 1, C.red); }
  } else {
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, 'rgba(216,212,208,0.5)');
    rect(ctx, x - dx, y - dy, 1, 1, C.fire);
    rect(ctx, x - 1, y - 1, 3, 2, C.O);
    rect(ctx, x, y - 1, 2, 1, C.gold);
  }
}

// Blasts burst into red, white, blue and gold confetti.
const CONFETTI = ['#d8322a', '#f8f6f0', '#3a5ac8', '#f2c84a'];
function explode(ctx, x, y, r, k, seed) {
  if (k < 0.25) disc(ctx, x, y, Math.max(1, Math.round(r * (0.3 + k))), C.goldLight);
  if (k > 0.55) {
    ctx.globalAlpha = 1 - (k - 0.55) / 0.45;
    disc(ctx, x, y - Math.round(k * 4), Math.max(1, Math.round(r * 0.45)), C.smoke);
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2 + hash(seed + i) * 0.4;
    const sp = r * (0.6 + hash(seed + i + 20) * 0.6);
    const px = x + Math.cos(ang) * sp * k;
    const py = y + Math.sin(ang) * sp * k + k * k * r * 0.6;
    rect(ctx, Math.round(px), Math.round(py), (i + Math.floor(k * 10)) % 2 ? 2 : 1, 1, CONFETTI[i % 4]);
  }
}

// Fallen units are simply knocked flat: no blood, it's that kind of war.
function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(14, 6);
  if (e.type === 'scout') {
    outlined(g, [[1, 2, 10, 3, C.penguin], [11, 3, 2, 1, C.beak]], [[2, 3, 7, 1, C.white], [4, 2, 3, 1, t.main]]);
  } else {
    const body = e.type === 'heavy' ? C.steelDark : e.type === 'engineer' ? '#5a5a66' : e.type === 'sniper' ? '#7a5a3a' : C.navy;
    outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, body], [11, 3, 2, 2, C.boot]], [[1, 1, 3, 1, e.type === 'heavy' ? t.main : C.hair], [5, 3, 2, 1, t.main]]);
  }
  return { c, ax: 7, ay: 5 };
}
function corpseKey(e) { return `ko-${e.type}`; }

export default {
  id: 'tariff',
  name: 'Trade Wars',
  palette,
  teamBase: SUIT,
  roofBase: [0.3, 0.26, 0.2],
  soldier: buildSoldier,
  vehicle: { jeep: buildGolfCart, tank: buildGoldTank, artillery: buildLauncher },
  aircraft: { helicopter: buildSpinCopter, bomber: buildBlimp },
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
  explosion: { rim: '#d8322a', body: '#f2c84a', core: '#fff0a0', smoke: '#d8d4d0', smoke2: '#f8f6f0' },
  corpse,
  corpseKey,
  debris: { '#7a4a24': '#f2c84a', '#5c361a': '#ece8e0' },
  minimap: { sky: '#6aa6e0', ground: '#6a4a32', platform: '#ece8e0', bridge: '#2a2220', ramp: '#d8322a', surface: '#4aa04a' },
  names: {
    soldier: 'Tariff Agent', heavy: 'Steel Tariff', scout: 'Penguin', engineer: 'Lobbyist', sniper: 'Economist',
    jeep: 'Golf Cart', tank: 'Golden Tank', artillery: 'Tariff Launcher', helicopter: 'Spin Copter', bomber: 'Hot Air Blimp',
    hq: 'Golden Tower', barracks: 'Rally Tent', turret: 'Tariff Booth', wall: 'Beautiful Wall', mine: 'Golf Resort', workshop: 'Factory (Soon)',
    airbase: 'Gilded Helipad', bridge: 'Burned Bridge', ramp: 'Price Ramp',
  },
  // Units are shown with their own sprites in menus.
  spriteIcons: true,
  icons: { hq: '🏆', barracks: '🎪', turret: '🚧', wall: '🧱', mine: '⛳', workshop: '🏭', airbase: '🚁', bridge: '🔥', ramp: '📈' },
};
