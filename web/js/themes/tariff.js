// Trade Wars: a satire of tariff-happy politics and how it backfired. Gold
// towers, golf resorts, penguin tariffs, factories "coming soon", burned
// bridges, prices going up the ramp and a crashing stock chart, under the
// watchful eye of an orange caricature on a billboard and a baby balloon.
// Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team, sideOf } from '../pixel.js';

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
  // China: port crews, containers, rare earths, solar panels and soybeans nobody bought
  coverall: '#3a5a9a', coverallDark: '#28406e', hivis: '#f28a2a', box: '#2a6ab0', boxDark: '#1a4a80', boxOrange: '#d8742a',
  boxOrangeDark: '#a04e1a', boxRed: '#b8322a', boxRedDark: '#7e1e1a', concrete: '#b4b2aa', concreteDark: '#86847c', concreteLight: '#d0cec6',
  panel: '#24346e', panelLight: '#5a7ad0', sack: '#d8c48a', sackDark: '#a8925a', railWhite: '#f4f6fa', railBlue: '#2a5ab8', card: '#c8945a', cardDark: '#9a6a3a',
  // Canada: red serge, moose, maple syrup and copper roofs
  serge: '#c8202a', sergeDark: '#86141c', hat: '#9a7442', hatDark: '#644826', moose: '#6a4426', mooseDark: '#462c18', antler: '#e0cc96',
  syrup: '#b8661a', syrupDark: '#7a400e', syrupLight: '#eaa448', plaidDark: '#4a1216', denim: '#3a5a8a', copper: '#5aa88a', copperDark: '#3a7a64',
  stone: '#cfc3a0', stoneDark: '#a09272', goose: '#6a5a4a', gooseDark: '#1e1e22', log: '#8a5a32', logLight: '#c09060', mud: '#5a4028',
  // The EU: grey suits, blue binders, cheese, champagne and filing cabinets
  euBlue: '#1e3a9a', euBlueLight: '#4a6ad0', euBlueDark: '#142868', star: '#f8d830', paper: '#f6f2e2', paperShade: '#d4ccb2',
  cheese: '#f2d060', cheeseDark: '#c8982e', bottle: '#2a5a32', bottleLight: '#4a8a4a', cork: '#d8b878', cabinet: '#9ea6ac', cabinetDark: '#6a7278',
  cabinetLight: '#c8ced4', grey: '#50545e', greyDark: '#363a42', mint: '#8ad8c4', mintDark: '#58a898',
};
const SUIT = [0.2, 0.22, 0.32];

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right — the same frame as Classic.
function usaSoldier(type, f, frame) {
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

function usaRotor(ctx, u, x, y) {
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

function usaAnimate(ctx, b, x, y) {
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
function usaCorpse(e) {
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
// ══ The other three sides of the trade war ═════════════════════════════════
const sideId = (f) => sideOf(f) || 'usa';

// Small shared motifs
function leaf(g, x, y, col) {
  // A 5×5 maple leaf
  g.fillStyle = col;
  g.fillRect(x + 2, y, 1, 5); g.fillRect(x, y + 1, 1, 2); g.fillRect(x + 4, y + 1, 1, 2);
  g.fillRect(x, y + 2, 5, 1); g.fillRect(x + 1, y + 3, 3, 1);
}
function stars(g, cx, cy, r, col) {
  // A ring of twelve gold stars (one pixel each)
  g.fillStyle = col;
  for (let i = 0; i < 12; i++) g.fillRect(Math.round(cx + Math.cos(i * Math.PI / 6) * r), Math.round(cy + Math.sin(i * Math.PI / 6) * r), 1, 1);
}
function corrugate(g, x, y, w, h, col, step = 2) { g.fillStyle = col; for (let i = x + 1; i < x + w; i += step) g.fillRect(i, y, 1, h); }
function bolt(g, x, y, col) {
  g.fillStyle = col; g.fillRect(x + 1, y, 2, 1); g.fillRect(x, y + 1, 2, 1); g.fillRect(x, y + 2, 3, 1); g.fillRect(x + 1, y + 3, 2, 1); g.fillRect(x + 1, y + 4, 1, 1);
}

// ── China: infantry ────────────────────────────────────────────────────────
function chinaSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'scout') {
    // A panda on reconnaissance, in a team scarf
    const lg = frame ? [[5, 12, 3, 4], [10, 12, 3, 4]] : [[3, 12, 3, 4], [11, 12, 3, 4]];
    parts = [
      ...lg.map((l) => [...l, C.penguin]),
      [3, 6, 11, 7, C.white], [10, 1, 7, 6, C.white], [9, 0, 2, 2, C.penguin], [16, 0, 2, 2, C.penguin], [2, 7, 1, 2, C.white],
      frame ? [11, 8, 3, 4, C.penguin] : [12, 8, 3, 4, C.penguin],
    ];
    details = [
      [3, 9, 4, 3, C.penguin], [13, 3, 2, 2, C.penguin], [14, 3, 1, 1, C.white], [16, 5, 1, 1, C.O], [14, 6, 2, 1, C.marbleShade],
      [9, 7, 5, 1, t.main], [9, 8, 1, 2, t.main],
    ];
  } else if (type === 'heavy') {
    // Rare-earth magnet gunner: hauls a giant horseshoe magnet
    parts = [
      ...legs.map((l) => [...l, C.coverallDark]), ...boots.map((b) => [...b, C.boot]),
      [4, 7, 9, 5, C.coverall], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, t.main], [4, 3, 10, 1, t.dark],
      [9, 7, 9, 2, C.boxRed], [9, 11, 9, 2, C.boxRed], [8, 7, 2, 6, C.boxRed],
    ];
    details = [
      [6, 1, 6, 1, t.light], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [16, 7, 2, 2, C.steelLight], [16, 11, 2, 2, C.steelLight], [9, 7, 7, 1, '#e85a4a'], [9, 11, 7, 1, '#e85a4a'],
      [19, 8, 1, 1, C.steelLight], [19, 11, 1, 1, C.steelLight], [5, 9, 2, 1, C.hivis],
    ];
  } else if (type === 'engineer') {
    // Solar fitter: a solar panel strapped to the back, spanner in hand
    parts = [
      ...legs.map((l) => [...l, '#5a5a62']), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, '#6a6a74'], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, t.main], [10, 2, 4, 1, t.dark],
      [0, 2, 5, 10, C.panel], [12, 9, 5, 1, C.steel],
    ];
    details = [
      [1, 3, 1, 8, C.panelLight], [3, 3, 1, 8, C.panelLight], [0, 5, 5, 1, C.panelLight], [0, 8, 5, 1, C.panelLight],
      [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [5, 9, 7, 1, C.hivis], [16, 8, 1, 1, C.steel], [16, 10, 1, 1, C.steel],
    ];
  } else if (type === 'sniper') {
    // Bullet trainer: a rail conductor with a bullet-train rifle
    parts = [
      ...legs.map((l) => [...l, C.navyDark]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.navy], [6, 3, 6, 5, C.skin], [5, 1, 8, 2, C.navy], [10, 3, 3, 1, C.navyDark],
      [8, 8, 10, 2, C.railWhite], [18, 9, 1, 1, C.railWhite],
    ];
    details = [
      [5, 2, 8, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [8, 9, 10, 1, C.railBlue], [15, 8, 2, 1, C.glassDark], [5, 9, 2, 1, t.main], [8, 1, 2, 1, C.gold],
    ];
  } else {
    // Dock hand: coveralls, hi-vis vest, white hard hat, team armband
    parts = [
      ...legs.map((l) => [...l, C.coverall]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.coverall], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.white], [5, 3, 8, 1, C.white],
      [10, 9, 8, 1, C.gun], [10, 10, 2, 2, C.gun],
    ];
    details = [
      [6, 1, 6, 1, C.marble], [7, 2, 4, 1, C.marbleShade], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [6, 8, 1, 4, C.hivis], [9, 8, 1, 4, C.hivis], [5, 10, 7, 1, C.hivis], [5, 9, 2, 1, t.main], [17, 9, 1, 1, C.O],
    ];
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── Canada: infantry ───────────────────────────────────────────────────────
function canadaSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'scout') {
    // A moose: long legs, big antlers, team scarf
    const lg = frame ? [[5, 11, 1, 5], [8, 11, 1, 5], [11, 11, 1, 5], [13, 11, 1, 5]] : [[4, 11, 1, 5], [7, 11, 1, 5], [12, 11, 1, 5], [14, 11, 1, 5]];
    parts = [
      ...lg.map((l) => [...l, C.mooseDark]),
      [3, 5, 12, 6, C.moose], [12, 3, 4, 5, C.moose], [15, 4, 4, 4, C.moose], [10, 0, 3, 2, C.antler], [14, 0, 3, 2, C.antler], [2, 6, 1, 2, C.moose],
    ];
    details = [
      [3, 5, 9, 1, C.mooseDark], [3, 9, 12, 2, C.mooseDark], [10, 0, 1, 1, C.mooseDark], [12, 0, 1, 1, C.mooseDark], [15, 0, 1, 1, C.mooseDark],
      [14, 4, 1, 1, C.O], [18, 6, 1, 1, C.O], [12, 7, 3, 2, t.main], [15, 8, 1, 2, C.mooseDark],
    ];
  } else if (type === 'heavy') {
    // Goalie: big pads, caged mask, team jersey, puck cannon
    const pads = frame ? [[5, 11, 3, 5], [9, 11, 3, 5]] : [[4, 11, 3, 5], [10, 11, 3, 5]];
    parts = [
      ...pads.map((l) => [...l, C.white]),
      [4, 6, 9, 6, t.main], [6, 2, 6, 5, C.white], [10, 8, 9, 3, C.gun],
    ];
    details = [
      ...pads.map(([x, y, w]) => [x, y + 2, w, 1, t.main]), ...pads.map(([x, y, w]) => [x, y + 4, w, 1, C.O]),
      [4, 9, 6, 1, C.white], [9, 3, 3, 1, C.O], [9, 5, 3, 1, C.O], [10, 3, 1, 3, C.O], [6, 2, 3, 1, t.light],
      [10, 8, 9, 1, C.gunLight], [18, 9, 1, 1, C.O], [17, 11, 2, 1, C.O],
    ];
  } else if (type === 'engineer') {
    // Lumberjack: plaid, toque, beard, axe
    parts = [
      ...legs.map((l) => [...l, C.denim]), ...boots.map((b) => [...b, C.hatDark]),
      [5, 8, 7, 4, C.serge], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, t.main], [8, 0, 2, 1, C.white],
      [12, 4, 1, 9, C.woodLight], [13, 4, 3, 3, C.steelLight],
    ];
    details = [
      [5, 9, 7, 1, C.plaidDark], [7, 8, 1, 4, C.plaidDark], [10, 8, 1, 4, C.plaidDark], [6, 2, 6, 1, t.dark],
      [10, 4, 1, 1, C.O], [7, 6, 5, 2, C.hair], [9, 6, 2, 1, C.skinDark], [15, 4, 1, 3, C.white],
    ];
  } else if (type === 'sniper') {
    // Slapshooter: team jersey, helmet, a long stick and a puck lined up
    parts = [
      ...legs.map((l) => [...l, C.navy]), ...boots.map((b) => [...b, C.gunDark]),
      [5, 7, 7, 5, t.main], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, C.white],
      [9, 9, 8, 1, C.woodLight], [16, 10, 3, 2, C.gunDark],
    ];
    details = [
      [5, 9, 3, 1, C.white], [5, 1, 8, 1, C.marble], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [11, 3, 1, 3, C.O],
      [5, 13, 7, 1, C.white], [12, 9, 2, 1, C.white],
    ];
    for (const [x, y, w, h] of [[2, 15, 7, 1], [10, 15, 7, 1]]) { g.fillStyle = C.steelLight; g.fillRect(x, y + 1, w, h); }
  } else {
    // Mountie: red serge, campaign hat, rifle
    parts = [
      ...legs.map((l) => [...l, C.navyDark]), ...boots.map((b) => [...b, C.hatDark]),
      [5, 8, 7, 4, C.serge], [6, 3, 6, 5, C.skin], [4, 2, 10, 1, C.hat], [6, 0, 6, 2, C.hat],
      [10, 9, 8, 1, C.gun], [10, 10, 2, 2, C.gun],
    ];
    details = [
      [6, 1, 6, 1, t.main], [8, 0, 2, 1, C.hatDark], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [5, 11, 7, 1, C.hatDark], [6, 8, 1, 3, C.hatDark], [8, 9, 1, 1, C.gold], [5, 9, 2, 1, t.main], [17, 9, 1, 1, C.O],
      ...legs.map(([x, y]) => [x, y, 1, 3, C.yellow]),
    ];
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── The EU: infantry ───────────────────────────────────────────────────────
function euSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'scout') {
    // A rolling wheel of cheese with a little team flag stuck in the top
    disc(g, 9, 10, 6, C.O);
    disc(g, 9, 10, 5, C.cheese);
    g.fillStyle = C.cheeseDark; g.fillRect(4, 13, 11, 1); g.fillRect(6, 15, 7, 0);
    const holes = frame ? [[6, 8], [10, 11], [8, 13], [12, 7]] : [[7, 7], [11, 9], [6, 11], [10, 13]];
    for (const [x, y] of holes) { g.fillStyle = C.cheeseDark; g.fillRect(x, y, 2, 1); }
    g.fillStyle = C.paper; g.fillRect(11, 9, 2, 2); g.fillStyle = C.O; g.fillRect(12, 9, 1, 1);
    g.fillStyle = C.O; g.fillRect(9, 0, 1, 5); g.fillRect(10, 0, 5, 4);
    g.fillStyle = t.main; g.fillRect(10, 1, 4, 2);
    g.fillStyle = C.star; g.fillRect(12, 1, 1, 1);
    return { c, ax: 8, ay: 16 };
  } else if (type === 'heavy') {
    // Rubber stamper: a giant APPROVED stamp, held like a battering ram
    parts = [
      ...legs.map((l) => [...l, C.greyDark]), ...boots.map((b) => [...b, C.boot]),
      [4, 7, 9, 5, C.grey], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair],
      [14, 2, 4, 3, C.red], [15, 5, 2, 2, C.woodLight], [12, 7, 8, 4, C.woodDark], [11, 9, 2, 2, C.skin],
    ];
    details = [
      [14, 2, 4, 1, '#f06a5a'], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [6, 8, 1, 4, t.main],
      [12, 10, 8, 1, C.red], [12, 7, 8, 1, C.wood], [14, 8, 4, 1, C.paper],
    ];
  } else if (type === 'engineer') {
    // Regulator: grey suit, glasses, a clipboard and a ruler for bananas
    parts = [
      ...legs.map((l) => [...l, C.greyDark]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.grey], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair], [11, 7, 5, 6, C.paper],
    ];
    details = [
      [9, 4, 3, 1, C.O], [10, 4, 1, 1, '#d8eef8'], [7, 7, 4, 1, C.skinDark], [7, 8, 3, 1, C.white], [8, 8, 1, 3, t.main],
      [12, 6, 3, 2, C.steel], [12, 9, 3, 1, C.paperShade], [12, 11, 2, 1, C.paperShade], [13, 10, 1, 1, C.green], [12, 9, 1, 1, C.green],
      [5, 9, 2, 1, C.euBlue],
    ];
  } else if (type === 'sniper') {
    // Sommelier: waistcoat, bow tie, and a champagne-bottle rifle with the cork aimed
    parts = [
      ...legs.map((l) => [...l, C.gunDark]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.gunDark], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair],
      [8, 8, 7, 3, C.bottle], [15, 9, 3, 1, C.star], [18, 9, 1, 1, C.cork],
    ];
    details = [
      [5, 8, 1, 4, C.white], [10, 5, 1, 1, C.O], [7, 7, 1, 1, t.main], [9, 7, 1, 1, t.main], [8, 7, 1, 1, t.dark],
      [8, 8, 7, 1, C.bottleLight], [10, 9, 3, 2, C.paper], [11, 9, 1, 1, C.red], [14, 8, 1, 3, C.star],
    ];
  } else {
    // Eurocrat: blue blazer, team tie, a gold star pin, rifle
    parts = [
      ...legs.map((l) => [...l, C.greyDark]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.euBlue], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair], [5, 2, 1, 2, C.hair],
      [10, 9, 8, 1, C.gun], [10, 10, 2, 2, C.gun],
    ];
    details = [
      [7, 8, 3, 1, C.white], [8, 8, 1, 3, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [6, 1, 6, 1, '#6a4a30'],
      [6, 9, 1, 1, C.star], [5, 11, 7, 1, C.euBlueDark], [17, 9, 1, 1, C.O],
    ];
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── China: vehicles and aircraft ───────────────────────────────────────────
// EV runabout: a cheap little electric hatchback with a roof gun and a trailing plug.
function chinaEV(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 18);
  outlined(g, [
    [3, 8, 24, 5, C.railWhite], [7, 3, 13, 5, C.railWhite], [20, 6, 4, 2, C.railWhite], [11, 1, 2, 2, C.gun], [12, 0, 7, 1, C.gun],
  ], [
    [8, 4, 5, 3, C.glass], [14, 4, 5, 3, C.glass], [20, 6, 3, 1, C.glass], [3, 10, 24, 1, t.main], [26, 9, 1, 1, C.yellow], [3, 9, 1, 1, C.red],
    [3, 12, 24, 1, C.marbleShade],
  ]);
  bolt(g, 14, 8, C.railBlue);
  g.fillStyle = C.O; g.fillRect(0, 10, 3, 1); g.fillRect(0, 11, 1, 3); g.fillStyle = C.gold; g.fillRect(0, 13, 2, 1);
  wheel(g, 8, 14, 2, frame);
  wheel(g, 22, 14, 2, frame);
  return { c, ax: 14, ay: 17 };
}

// Container crawler: shipping containers stacked on tracks, with a crane-arm gun.
function chinaContainerTank(f, frame) {
  const t = team(f);
  const [c, g] = canvas(38, 22);
  outlined(g, [
    [2, 15, 32, 5, '#2e2e34'], [3, 9, 14, 6, C.box], [17, 9, 16, 6, C.boxOrange], [8, 3, 15, 6, C.boxRed], [23, 5, 13, 2, C.steel],
  ]);
  corrugate(g, 3, 10, 14, 4, C.boxDark); corrugate(g, 17, 10, 16, 4, C.boxOrangeDark); corrugate(g, 8, 4, 15, 4, C.boxRedDark);
  g.fillStyle = t.main; g.fillRect(12, 4, 6, 3); g.fillRect(3, 9, 14, 1); g.fillRect(17, 9, 16, 1);
  g.fillStyle = C.white; g.fillRect(14, 5, 2, 1);
  g.fillStyle = C.steelLight; g.fillRect(23, 5, 13, 1); g.fillStyle = C.O; g.fillRect(35, 5, 1, 2);
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 5;
    g.fillStyle = C.gunLight; g.fillRect(x, 16, 3, 3);
    g.fillStyle = C.gunDark; g.fillRect(x + (frame ? 0 : 2), 17, 1, 1);
  }
  return { c, ax: 18, ay: 21 };
}

// Return-to-sender catapult: flings sacks of soybeans nobody would buy.
function chinaCatapult(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 19);
  outlined(g, [
    [2, 11, 24, 3, C.wood], [10, 5, 3, 6, C.woodDark], [1, 5, 7, 6, C.sack], [22, 0, 6, 4, C.woodDark], [23, 0, 4, 2, C.sack],
  ], [
    [2, 11, 24, 1, t.main], [1, 5, 7, 1, C.sackDark], [4, 5, 1, 6, C.sackDark], [10, 5, 3, 1, C.wood], [24, 1, 1, 1, C.sackDark],
  ]);
  // The throwing arm
  for (let i = 0; i <= 13; i++) { const x = 9 + i; const y = 10 - Math.round(i * 0.62); g.fillStyle = C.O; g.fillRect(x, y - 1, 2, 3); }
  for (let i = 0; i <= 13; i++) { const x = 9 + i; const y = 10 - Math.round(i * 0.62); g.fillStyle = C.woodLight; g.fillRect(x, y, 2, 1); }
  // "US" stencil on the sacks: two red ticks
  g.fillStyle = C.red; g.fillRect(2, 7, 1, 2); g.fillRect(5, 7, 2, 1); g.fillRect(6, 8, 1, 1);
  wheel(g, 8, 15, 3, frame, C.boxRed);
  wheel(g, 20, 15, 3, frame, C.boxRed);
  return { c, ax: 15, ay: 18 };
}

// Delivery drone: a quadcopter dangling a parcel (props spin live).
function chinaDrone(f) {
  const t = team(f);
  const [c, g] = canvas(32, 16);
  outlined(g, [
    [10, 4, 12, 4, C.railWhite], [3, 3, 26, 1, C.gunDark], [2, 1, 4, 2, C.gun], [26, 1, 4, 2, C.gun], [12, 8, 1, 2, C.gun], [19, 8, 1, 2, C.gun],
    [11, 10, 10, 4, C.card],
  ], [
    [10, 6, 12, 1, t.main], [19, 5, 2, 1, C.glassDark], [15, 10, 2, 4, t.main], [11, 10, 10, 1, C.cardDark], [12, 12, 2, 1, C.cardDark],
  ]);
  return { c, ax: 16, ay: 13 };
}

// Dragon kite: a long red-and-gold dragon on the wind, dropping cargo.
function chinaDragon(f) {
  const t = team(f);
  const [c, g] = canvas(46, 21);
  const segs = [];
  for (let i = 0; i < 8; i++) segs.push([4 + i * 4, 7 + Math.round(Math.sin(i * 0.9) * 2), 5, 5]);
  outlined(g, [
    ...segs.map((s) => [...s, C.red]),
    [35, 4, 8, 6, C.red], [42, 6, 3, 3, C.red], [33, 2, 4, 4, C.gold], [0, 9, 5, 3, t.main],
  ]);
  for (const [x, y] of segs) { g.fillStyle = C.gold; g.fillRect(x + 1, y + 3, 3, 1); g.fillStyle = C.goldLight; g.fillRect(x + 1, y, 2, 1); }
  g.fillStyle = C.white; g.fillRect(39, 5, 2, 2); g.fillStyle = C.O; g.fillRect(40, 5, 1, 1);
  g.fillStyle = C.gold; g.fillRect(36, 3, 1, 1); g.fillRect(43, 8, 2, 1); g.fillRect(35, 9, 8, 1);
  g.fillStyle = C.white; g.fillRect(44, 6, 1, 1);
  g.fillStyle = t.light; g.fillRect(0, 10, 4, 1);
  // A string down to the cargo net
  g.fillStyle = C.O; g.fillRect(22, 13, 1, 3); g.fillRect(18, 16, 9, 3);
  g.fillStyle = C.card; g.fillRect(19, 16, 7, 2); g.fillStyle = C.cardDark; g.fillRect(22, 16, 1, 2);
  return { c, ax: 23, ay: 16 };
}

// ── Canada: vehicles and aircraft ──────────────────────────────────────────
// Zamboni: an ice resurfacer with a team stripe, leaving a shiny trail.
function canadaZamboni(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 18);
  outlined(g, [
    [2, 5, 20, 8, C.white], [13, 1, 6, 4, C.skin], [12, 0, 8, 1, t.main], [22, 7, 5, 6, C.steel], [19, 3, 7, 1, C.gun],
  ], [
    [2, 8, 20, 2, t.main], [2, 5, 20, 1, C.marble], [4, 6, 6, 2, C.glass], [16, 2, 1, 1, C.O], [22, 7, 5, 1, C.steelLight], [23, 11, 4, 1, C.steelDark],
    [12, 4, 8, 1, C.serge],
  ]);
  leaf(g, 14, 6, C.serge);
  g.fillStyle = C.ice; g.fillRect(0, 16, 6, 1); g.fillStyle = C.white; g.fillRect(1, 16, 2, 1);
  wheel(g, 7, 14, 2, frame);
  wheel(g, 18, 14, 2, frame);
  return { c, ax: 14, ay: 17 };
}

// Syrup tanker: a maple-syrup tank on tracks, the gun a dripping spout.
function canadaSyrupTank(f, frame) {
  const t = team(f);
  const [c, g] = canvas(38, 22);
  outlined(g, [
    [2, 15, 32, 5, '#3a2a1e'], [4, 5, 26, 10, C.syrup], [2, 7, 2, 6, C.syrup], [30, 7, 2, 6, C.syrup], [29, 6, 7, 2, C.steel], [14, 2, 4, 3, C.steel],
  ], [
    [4, 5, 26, 1, C.syrupLight], [5, 6, 20, 1, C.syrupLight], [4, 13, 26, 2, C.syrupDark], [4, 10, 26, 1, t.main], [29, 6, 7, 1, C.steelLight],
    [14, 2, 4, 1, C.steelLight],
  ]);
  g.fillStyle = C.O; g.fillRect(10, 6, 7, 5); g.fillStyle = C.white; g.fillRect(11, 6, 5, 4);
  leaf(g, 11, 6, C.serge);
  g.fillStyle = C.syrup; g.fillRect(35, 8, 1, 2);
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 5;
    g.fillStyle = C.hatDark; g.fillRect(x, 16, 3, 3);
    g.fillStyle = C.syrupLight; g.fillRect(x + (frame ? 0 : 2), 16 + (frame ? 0 : 2), 1, 1);
  }
  return { c, ax: 18, ay: 21 };
}

// Puck launcher: a pitching machine fed from a tall stack of pucks.
function canadaPuckLauncher(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 19);
  outlined(g, [
    [2, 10, 22, 4, C.serge], [3, 1, 5, 9, C.gunDark], [9, 6, 9, 4, C.steel], [16, 4, 6, 3, C.steel], [21, 2, 6, 3, C.steel],
  ], [
    [2, 12, 22, 1, t.main], [2, 10, 22, 1, '#e84a50'], [9, 6, 9, 1, C.steelLight], [16, 4, 6, 1, C.steelLight], [21, 2, 6, 1, C.steelLight], [26, 2, 1, 3, C.O],
  ]);
  for (let y = 2; y < 10; y += 2) { g.fillStyle = C.gunLight; g.fillRect(3, y, 5, 1); }
  disc(g, 13, 8, 2, C.gunDark); g.fillStyle = C.steelLight; g.fillRect(13, 8, 1, 1);
  leaf(g, 17, 9, C.white);
  wheel(g, 8, 15, 3, frame, C.white);
  wheel(g, 20, 15, 3, frame, C.white);
  return { c, ax: 15, ay: 18 };
}

// Honk patrol: a Canada goose on active duty (its wings flap live).
function canadaGoose(f) {
  const t = team(f);
  const [c, g] = canvas(32, 16);
  outlined(g, [
    [6, 6, 15, 6, C.goose], [3, 7, 4, 3, C.gooseDark], [20, 2, 3, 7, C.gooseDark], [21, 1, 6, 3, C.gooseDark], [27, 2, 3, 1, C.gooseDark],
    [12, 12, 1, 2, C.hivis], [15, 12, 1, 2, C.hivis],
  ], [
    [6, 10, 15, 2, C.paper], [8, 7, 10, 1, '#8a7a68'], [22, 3, 2, 1, C.white], [24, 2, 1, 1, C.white], [20, 7, 3, 1, t.main], [21, 8, 1, 1, t.main],
  ]);
  return { c, ax: 16, ay: 13 };
}

// Bush Beaver: a yellow float plane with a team tail and a red nose.
function canadaBushPlane(f) {
  const t = team(f);
  const [c, g] = canvas(46, 21);
  outlined(g, [
    [8, 7, 30, 6, C.yellow], [38, 7, 4, 6, C.serge], [2, 2, 7, 7, t.main], [2, 8, 8, 3, C.yellow], [16, 4, 18, 2, C.yellowDark],
    [12, 16, 26, 2, C.steelLight],
  ], [
    [30, 8, 6, 3, C.glass], [8, 11, 30, 1, C.yellowDark], [8, 9, 22, 1, C.serge], [2, 2, 7, 1, t.light], [12, 17, 26, 1, C.steel], [38, 7, 4, 1, '#e84a50'],
  ]);
  g.fillStyle = C.O; g.fillRect(17, 13, 1, 3); g.fillRect(31, 13, 1, 3);
  leaf(g, 3, 4, C.white);
  return { c, ax: 23, ay: 16 };
}

// ── The EU: vehicles and aircraft ──────────────────────────────────────────
// Vespa patrol: a mint scooter with a blue sidecar and a gun on the leg shield.
function euVespa(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 18);
  outlined(g, [
    [1, 8, 10, 5, C.euBlue], [12, 8, 12, 4, C.mint], [22, 3, 3, 9, C.mint], [15, 2, 5, 6, C.grey], [15, 0, 5, 2, t.main], [24, 3, 4, 1, C.gun],
  ], [
    [1, 8, 10, 1, C.euBlueLight], [2, 10, 8, 1, t.main], [12, 11, 12, 1, C.mintDark], [16, 2, 4, 2, C.skin], [19, 2, 1, 1, C.O], [15, 1, 5, 1, t.light],
    [21, 3, 1, 1, C.steel], [24, 6, 1, 1, C.yellow],
  ]);
  stars(g, 6, 10, 2, C.star);
  wheel(g, 6, 14, 2, frame);
  wheel(g, 14, 14, 2, frame);
  wheel(g, 23, 14, 2, frame);
  return { c, ax: 14, ay: 17 };
}

// Regulation tank: filing cabinets on tracks, its gun a rolled-up directive.
function euCabinetTank(f, frame) {
  const t = team(f);
  const [c, g] = canvas(38, 22);
  outlined(g, [
    [2, 15, 32, 5, C.greyDark], [3, 8, 9, 7, C.cabinet], [12, 8, 10, 7, C.cabinet], [22, 8, 10, 7, C.cabinet], [9, 3, 15, 5, C.cabinetLight],
    [24, 4, 12, 2, C.paper],
  ]);
  for (const x of [3, 12, 22]) {
    g.fillStyle = C.cabinetDark; g.fillRect(x, 11, x === 3 ? 9 : 10, 1);
    g.fillStyle = C.steelDark; g.fillRect(x + 3, 9, 3, 1); g.fillRect(x + 3, 13, 3, 1);
    g.fillStyle = t.main; g.fillRect(x + 1, 9, 1, 1); g.fillRect(x + 1, 13, 1, 1);
  }
  g.fillStyle = C.cabinetDark; g.fillRect(16, 3, 1, 5); g.fillStyle = C.steelDark; g.fillRect(12, 5, 2, 1); g.fillRect(19, 5, 2, 1);
  g.fillStyle = C.paper; g.fillRect(14, 7, 3, 1); g.fillRect(25, 7, 2, 1);
  g.fillStyle = C.red; g.fillRect(28, 4, 1, 2); g.fillRect(32, 4, 1, 2);
  g.fillStyle = C.paperShade; g.fillRect(24, 5, 12, 1);
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 5;
    g.fillStyle = C.cabinetDark; g.fillRect(x, 16, 3, 3);
    g.fillStyle = C.cabinetLight; g.fillRect(x + (frame ? 0 : 2), 16 + (frame ? 0 : 2), 1, 1);
  }
  return { c, ax: 18, ay: 21 };
}

// Champagne cannon: a vast bottle of retaliation on a gun carriage.
function euChampagne(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 19);
  outlined(g, [
    [2, 11, 24, 3, C.woodDark], [5, 6, 10, 5, C.bottle], [12, 4, 6, 5, C.bottle], [17, 2, 5, 3, C.star], [22, 0, 3, 3, C.cork],
  ], [
    [2, 11, 24, 1, t.main], [5, 6, 10, 1, C.bottleLight], [12, 4, 6, 1, C.bottleLight], [7, 7, 5, 3, C.paper], [8, 8, 3, 1, C.red],
    [17, 2, 5, 1, C.goldLight], [22, 0, 3, 1, '#ecd8a0'],
  ]);
  wheel(g, 8, 15, 3, frame, C.star);
  wheel(g, 20, 15, 3, frame, C.star);
  return { c, ax: 15, ay: 18 };
}

// Red tape copter: a blue helicopter wrapped in red tape, stars on the side.
function euCopter(f) {
  const t = team(f);
  const [c, g] = canvas(32, 16);
  outlined(g, [
    [10, 4, 15, 8, C.euBlue], [1, 6, 10, 2, C.euBlue], [0, 3, 3, 4, t.main],
    [17, 2, 2, 2, C.gun], [13, 12, 1, 2, C.gun], [21, 12, 1, 2, C.gun], [10, 14, 15, 1, C.cabinet],
  ], [
    [19, 5, 5, 4, C.glass], [22, 5, 2, 1, C.white], [10, 4, 9, 1, C.euBlueLight], [1, 7, 10, 1, t.main],
    [12, 4, 1, 8, C.red], [17, 4, 1, 8, C.red], [5, 6, 1, 2, C.red],
  ]);
  stars(g, 15, 8, 2, C.star);
  return { c, ax: 16, ay: 13 };
}

// Directive glider: a giant paper aeroplane folded from an official form.
function euPaperPlane(f) {
  const t = team(f);
  const [c, g] = canvas(46, 21);
  const col = (x) => {
    // Top of the wing slopes from the tall tail down to the nose; the keel tapers too.
    const top = Math.round(3 + (x - 3) * 0.2);
    const bot = Math.round(15 - (x - 3) * 0.1);
    return [top, bot];
  };
  g.fillStyle = C.O;
  for (let x = 2; x <= 44; x++) { const [a, b] = col(Math.min(43, Math.max(3, x))); g.fillRect(x, a - 1, 1, b - a + 3); }
  for (let x = 3; x <= 43; x++) {
    const [a, b] = col(x);
    g.fillStyle = C.paper; g.fillRect(x, a, 1, b - a + 1);
    g.fillStyle = C.paperShade; g.fillRect(x, Math.round((a + b) / 2) + 1, 1, b - Math.round((a + b) / 2));
    g.fillStyle = C.O; g.fillRect(x, Math.round((a + b) / 2), 1, 1);
  }
  g.fillStyle = t.main; for (let x = 4; x < 16; x++) g.fillRect(x, col(x)[0] + 1, 1, 2);
  // Ruled lines and a red APPROVED stamp
  g.fillStyle = C.cabinet; for (let x = 18; x < 34; x += 1) if (x % 4) g.fillRect(x, col(x)[0] + 2, 1, 1);
  g.fillStyle = C.red; g.fillRect(20, 12, 7, 3); g.fillStyle = C.paper; g.fillRect(21, 13, 5, 1);
  stars(g, 10, 11, 2, C.star);
  return { c, ax: 23, ay: 16 };
}

const SOLDIER = { usa: usaSoldier, china: chinaSoldier, canada: canadaSoldier, eu: euSoldier };
const JEEP = { usa: buildGolfCart, china: chinaEV, canada: canadaZamboni, eu: euVespa };
const TANK = { usa: buildGoldTank, china: chinaContainerTank, canada: canadaSyrupTank, eu: euCabinetTank };
const ARTY = { usa: buildLauncher, china: chinaCatapult, canada: canadaPuckLauncher, eu: euChampagne };
const HELI = { usa: buildSpinCopter, china: chinaDrone, canada: canadaGoose, eu: euCopter };
const BOMBER = { usa: buildBlimp, china: chinaDragon, canada: canadaBushPlane, eu: euPaperPlane };
const pick = (table, f) => table[sideId(f)] || table.usa;
const buildSoldier = (type, f, frame) => pick(SOLDIER, f)(type, f, frame);

function rotor(ctx, u, x, y) {
  const side = sideId(u.faction);
  const tick = Math.floor(performance.now() / 50);
  const s = u.facing;
  if (side === 'china' && u.type === 'helicopter') {
    // Four little props, two visible from the side
    for (const px of [x - 12, x + 12]) {
      if (tick % 2) rect(ctx, px - 3, y - 13, 6, 1, C.gunLight); else rect(ctx, px - 1, y - 13, 2, 1, C.gun);
    }
  } else if (side === 'china') {
    // The dragon's tail streamer flutters
    const tx = s > 0 ? x - 26 : x + 23;
    rect(ctx, tx, y - 6 + (tick % 4 < 2 ? 0 : 1), 3, 1, team(u.faction).light);
  } else if (side === 'canada' && u.type === 'helicopter') {
    // Flapping wings
    const wx = s > 0 ? x - 6 : x - 5;
    if (Math.floor(tick / 2) % 2) { rect(ctx, wx, y - 13, 11, 1, C.O); rect(ctx, wx + 1, y - 12, 10, 3, C.goose); rect(ctx, wx + 1, y - 12, 10, 1, '#8a7a68'); }
    else { rect(ctx, wx, y - 6, 11, 4, C.O); rect(ctx, wx + 1, y - 6, 9, 3, C.goose); }
  } else if (side === 'canada') {
    // Nose propeller
    const px = s > 0 ? x + 20 : x - 21;
    if (tick % 2) rect(ctx, px, y - 13, 1, 9, C.smoke); else rect(ctx, px, y - 10, 1, 3, C.smoke);
  } else if (side === 'eu' && u.type === 'bomber') {
    // A loose page flutters off the tail
    const k = (performance.now() / 900) % 1;
    const px = s > 0 ? x - 24 - Math.round(k * 10) : x + 23 + Math.round(k * 10);
    ctx.globalAlpha = 1 - k; rect(ctx, px, y - 12 + Math.round(k * 6) + (tick % 2), 3, 2, C.paper); ctx.globalAlpha = 1;
  } else {
    usaRotor(ctx, u, x, y);
  }
}

// ── China: buildings ───────────────────────────────────────────────────────
function container(g, x, y, w, h, col, dark, t) {
  outlined(g, [[x, y, w, h, col]]);
  corrugate(g, x, y + 1, w, h - 2, dark);
  if (t) { g.fillStyle = t; g.fillRect(x + 1, y + 1, 3, 2); }
}
function stack(g, x, y, w, h) {
  // A red-and-white banded smokestack
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, h + 1);
  for (let i = 0; i < h; i++) { g.fillStyle = Math.floor(i / 3) % 2 ? C.white : C.boxRed; g.fillRect(x, y + i, w, 1); }
}
const CHINA_BUILD = {
  hq(g, t) {
    // Mega Factory: a vast sawtooth-roofed hall, two smokestacks, a solar roof,
    // a giant team banner and a stack of containers waiting at the door
    stack(g, 6, 2, 5, 22); stack(g, 53, 6, 5, 18);
    outlined(g, [[2, 22, 60, 26, C.concrete]], [[2, 22, 60, 1, C.concreteLight], [2, 46, 60, 2, C.concreteDark]]);
    for (let i = 0; i < 6; i++) {
      const x0 = 4 + i * 10;
      for (let k = 0; k < 7; k++) { g.fillStyle = C.O; g.fillRect(x0 + k, 21 - k, 1, k + 1); g.fillStyle = C.panel; g.fillRect(x0 + k, 22 - k, 1, k); }
      g.fillStyle = C.O; g.fillRect(x0 + 7, 14, 1, 8);
      g.fillStyle = C.panelLight; for (let k = 1; k < 7; k += 2) g.fillRect(x0 + k, 21 - k + 1, 1, 1);
    }
    for (let x = 5; x < 60; x += 5) for (const y of [26, 31]) { g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 4, 4); g.fillStyle = C.glass; g.fillRect(x, y, 2, 2); }
    g.fillStyle = C.O; g.fillRect(16, 23, 32, 10); g.fillStyle = t.main; g.fillRect(17, 24, 30, 8);
    g.fillStyle = C.white; g.fillRect(19, 25, 2, 2); g.fillRect(24, 29, 2, 2); for (let i = 0; i < 6; i++) g.fillRect(25 - i, 25 + i, 1, 1);
    g.fillRect(29, 26, 15, 1); g.fillRect(29, 29, 12, 1);
    outlined(g, [[26, 36, 12, 12, C.steelDark]], [[26, 36, 12, 1, C.steelLight], [26, 40, 12, 1, C.steel], [26, 44, 12, 1, C.steel]]);
    g.fillStyle = C.yellow; for (let x = 26; x < 38; x += 2) g.fillRect(x, 47, 1, 1);
    container(g, 3, 40, 18, 8, C.box, C.boxDark, t.main); container(g, 5, 34, 14, 6, C.boxOrange, C.boxOrangeDark);
    container(g, 43, 40, 18, 8, C.boxRed, C.boxRedDark, t.main);
  },
  barracks(g, t) {
    // Night Shift Dorm: rows of tiny windows, red lanterns and a 24/7 clock
    outlined(g, [[3, 8, 42, 24, C.concreteLight], [1, 5, 46, 3, C.boxRed]], [[1, 5, 46, 1, '#e85a4a'], [3, 30, 42, 2, C.concreteDark]]);
    for (let y = 10; y < 28; y += 5) for (let x = 5; x < 44; x += 4) {
      if (x > 19 && x < 29 && y > 19) continue;
      g.fillStyle = C.O; g.fillRect(x, y, 3, 3); g.fillStyle = (x * 7 + y) % 3 ? C.glassDark : C.yellow; g.fillRect(x + 1, y + 1, 1, 1);
    }
    outlined(g, [[20, 21, 8, 11, C.steelDark]], [[23, 21, 1, 11, C.O]]);
    g.fillStyle = C.O; g.fillRect(17, 0, 14, 6); g.fillStyle = t.main; g.fillRect(18, 1, 12, 4);
    disc(g, 24, 3, 2, C.white); g.fillStyle = C.O; g.fillRect(24, 2, 1, 2); g.fillRect(24, 3, 2, 1);
    for (const x of [13, 33]) { g.fillStyle = C.O; g.fillRect(x + 1, 8, 1, 2); g.fillRect(x - 1, 10, 5, 6); g.fillStyle = C.red; g.fillRect(x, 11, 3, 4); g.fillStyle = C.gold; g.fillRect(x, 10, 3, 1); g.fillRect(x + 1, 16, 1, 1); }
  },
  turret(g, t) {
    // Solar Sentry: a tilted solar array shading a little gun post
    outlined(g, [[11, 20, 10, 12, C.concrete], [14, 13, 3, 7, C.steelDark], [9, 15, 10, 5, C.gun], [18, 16, 12, 2, C.gun]], [
      [11, 20, 10, 1, C.concreteLight], [11, 26, 10, 2, t.main], [9, 15, 10, 1, C.gunLight], [29, 16, 1, 2, C.O],
    ]);
    for (let i = 0; i < 26; i++) { const y = 12 - Math.round(i * 0.35); g.fillStyle = C.O; g.fillRect(2 + i, y - 1, 1, 5); }
    for (let i = 0; i < 26; i++) { const y = 12 - Math.round(i * 0.35); g.fillStyle = i % 5 === 0 ? C.panelLight : C.panel; g.fillRect(2 + i, y, 1, 3); g.fillStyle = C.panelLight; g.fillRect(2 + i, y + 1, 1, 1); }
    g.fillStyle = C.O; g.fillRect(14, 8, 2, 5);
  },
  wall(g, t) {
    // Container Wall: three shipping containers stacked on end
    container(g, 0, 22, 16, 10, C.box, C.boxDark);
    container(g, 0, 12, 16, 10, C.boxOrange, C.boxOrangeDark);
    container(g, 0, 2, 16, 10, C.boxRed, C.boxRedDark);
    g.fillStyle = t.main; g.fillRect(0, 21, 16, 1); g.fillRect(5, 15, 6, 3);
    g.fillStyle = C.white; g.fillRect(6, 16, 4, 1);
  },
  mine(g, t) {
    // Rare Earth Mine: a terraced spoil heap, a conveyor of glowing ore and a big magnet sign
    outlined(g, [[0, 25, 32, 7, C.dirt], [1, 20, 22, 5, C.dirtMid], [4, 15, 16, 5, C.dirt], [7, 11, 10, 4, C.dirtMid]], [
      [0, 25, 32, 1, C.pebble], [1, 20, 22, 1, C.pebble], [4, 15, 16, 1, C.pebble], [7, 11, 10, 1, C.pebble],
      [3, 22, 2, 1, '#b06ad0'], [12, 17, 2, 1, '#b06ad0'], [16, 22, 1, 1, '#b06ad0'], [9, 13, 1, 1, '#b06ad0'], [22, 28, 2, 1, '#b06ad0'],
    ]);
    for (let i = 0; i < 9; i++) { g.fillStyle = C.O; g.fillRect(19 + i, 24 - i, 2, 3); }
    for (let i = 0; i < 9; i++) { g.fillStyle = C.steel; g.fillRect(19 + i, 25 - i, 1, 1); }
    outlined(g, [[25, 10, 7, 5, C.steelDark]], [[25, 10, 7, 1, C.steelLight], [27, 12, 3, 1, '#b06ad0']]);
    g.fillStyle = C.O; g.fillRect(28, 15, 2, 10);
    // Horseshoe magnet sign on top of the heap
    g.fillStyle = C.O; g.fillRect(11, 6, 2, 5); g.fillRect(6, 0, 12, 7);
    g.fillStyle = C.boxRed; g.fillRect(7, 1, 10, 2); g.fillRect(7, 4, 10, 2); g.fillRect(7, 1, 2, 5);
    g.fillStyle = C.steelLight; g.fillRect(15, 1, 2, 2); g.fillRect(15, 4, 2, 2);
    g.fillStyle = t.main; g.fillRect(2, 29, 8, 2);
  },
  workshop(g, t) {
    // EV Gigaplant: a gleaming white plant, blue glass band, a lightning sign
    outlined(g, [[2, 10, 44, 22, C.railWhite], [2, 6, 44, 4, C.railBlue]], [[2, 6, 44, 1, C.panelLight], [2, 30, 44, 2, C.marbleShade]]);
    g.fillStyle = C.O; g.fillRect(3, 13, 42, 6); g.fillStyle = C.glass; g.fillRect(4, 14, 40, 4); g.fillStyle = C.glassDark; for (let x = 6; x < 44; x += 5) g.fillRect(x, 14, 1, 4);
    g.fillStyle = C.O; g.fillRect(16, 0, 16, 7); g.fillStyle = t.main; g.fillRect(17, 1, 14, 5);
    bolt(g, 22, 1, C.yellow); g.fillStyle = C.white; g.fillRect(27, 2, 3, 1); g.fillRect(27, 4, 2, 1);
    outlined(g, [[30, 21, 14, 11, C.steelDark]], [[30, 21, 14, 1, C.steelLight], [30, 25, 14, 1, C.steel]]);
    // Two tiny EVs waiting to ship
    for (const x of [5, 17]) { outlined(g, [[x, 27, 9, 3, C.railWhite], [x + 2, 25, 5, 2, C.railWhite]], [[x + 3, 25, 3, 1, C.glass], [x, 28, 9, 1, t.main]]); g.fillStyle = C.O; g.fillRect(x + 1, 30, 2, 2); g.fillRect(x + 6, 30, 2, 2); }
  },
  airbase(g, t) {
    // Container Port: a deck of stacked containers under a gantry crane
    const cols = [[C.box, C.boxDark], [C.boxOrange, C.boxOrangeDark], [C.boxRed, C.boxRedDark], ['#3a8a5a', '#286a40']];
    for (let i = 0; i < 4; i++) { container(g, 2 + i * 13, 25, 13, 7, ...cols[i]); container(g, 2 + i * 13, 19, 13, 6, ...cols[(i + 2) % 4]); }
    outlined(g, [[0, 17, 56, 2, C.steelDark]], [[0, 17, 56, 1, C.steelLight]]);
    g.fillStyle = C.white; g.fillRect(24, 18, 1, 1); g.fillRect(28, 18, 1, 1);
    // Gantry crane
    outlined(g, [[57, 4, 2, 28, C.hivis], [61, 4, 2, 28, C.hivis], [44, 2, 20, 2, C.hivis]], [[57, 12, 6, 1, C.O], [57, 22, 6, 1, C.O]]);
    g.fillStyle = C.O; g.fillRect(48, 4, 1, 7); g.fillRect(46, 11, 5, 2);
    g.fillStyle = C.O; g.fillRect(62, 0, 1, 2); g.fillRect(63, 0, 1, 1); g.fillStyle = t.main; g.fillRect(52, 2, 4, 2);
  },
};

// ── Canada: buildings ──────────────────────────────────────────────────────
function cflag(g, x, y, t) {
  // A Canadian-style flag in team colours: bars either side, leaf in the middle
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 13, 8);
  g.fillStyle = t.main; g.fillRect(x, y, 3, 6); g.fillRect(x + 8, y, 3, 6);
  g.fillStyle = C.white; g.fillRect(x + 3, y, 5, 6);
  leaf(g, x + 3, y, t.main);
}
function gothic(g, x, y, h) {
  g.fillStyle = C.O; g.fillRect(x - 1, y, 5, h + 1); g.fillRect(x, y - 1, 3, 1);
  g.fillStyle = C.glassDark; g.fillRect(x, y, 3, h); g.fillStyle = C.glass; g.fillRect(x + 1, y, 1, h);
}
function log(g, x, y, w) {
  g.fillStyle = C.O; g.fillRect(x, y, w, 4);
  g.fillStyle = C.log; g.fillRect(x, y + 1, w, 2); g.fillStyle = C.logLight; g.fillRect(x, y + 1, w, 1);
}
function barrel(g, x, y, t) {
  outlined(g, [[x, y, 7, 7, C.syrup]], [[x, y + 1, 7, 1, C.syrupDark], [x, y + 5, 7, 1, C.syrupDark], [x + 1, y, 1, 7, C.syrupLight], [x + 4, y + 2, 2, 3, C.white]]);
  g.fillStyle = t; g.fillRect(x + 4, y + 3, 2, 1);
}
const CANADA_BUILD = {
  hq(g, t) {
    // Maple Parliament: sandstone wings and a tall clock tower with a green
    // copper roof, flying the team flag
    outlined(g, [[2, 24, 24, 24, C.stone], [38, 24, 24, 24, C.stone], [25, 10, 14, 38, C.stone]], [
      [2, 24, 24, 1, C.white], [38, 24, 24, 1, C.white], [2, 46, 60, 2, C.stoneDark], [25, 10, 14, 1, C.white],
    ]);
    for (const [x0, w] of [[2, 24], [38, 24]]) {
      for (let k = 0; k < 5; k++) { g.fillStyle = C.O; g.fillRect(x0 + k - 1, 22 - k, w - 2 * k + 2, 3); }
      for (let k = 0; k < 5; k++) { g.fillStyle = k === 0 ? C.copperDark : C.copper; g.fillRect(x0 + k, 23 - k, w - 2 * k, 1); }
      for (let x = x0 + 3; x < x0 + w - 2; x += 5) { gothic(g, x, 29, 6); gothic(g, x, 38, 5); }
    }
    for (let k = 0; k < 8; k++) { g.fillStyle = C.O; g.fillRect(31 - Math.floor(k * 0.8) - 1, 2 + k, 2 + Math.floor(k * 0.8) * 2 + 2, 1); g.fillStyle = C.copper; g.fillRect(31 - Math.floor(k * 0.8), 2 + k, 2 + Math.floor(k * 0.8) * 2, 1); }
    g.fillStyle = C.copperDark; g.fillRect(29, 6, 1, 4); g.fillRect(34, 6, 1, 4);
    disc(g, 32, 15, 4, C.O); disc(g, 32, 15, 3, C.white); g.fillStyle = C.O; g.fillRect(32, 13, 1, 3); g.fillRect(32, 15, 2, 1);
    gothic(g, 28, 22, 8); gothic(g, 34, 22, 8);
    g.fillStyle = C.O; g.fillRect(28, 37, 9, 11); g.fillRect(29, 36, 7, 1); g.fillStyle = C.woodDark; g.fillRect(29, 37, 7, 11); g.fillStyle = C.wood; g.fillRect(32, 37, 1, 11);
    g.fillStyle = C.O; g.fillRect(31, 0, 1, 3);
    g.fillStyle = C.O; g.fillRect(31, -1, 1, 1);
    g.fillStyle = C.O; g.fillRect(44, 2, 1, 17); cflag(g, 46, 3, t);
  },
  barracks(g, t) {
    // Log Cabin: stacked logs, a stone chimney, hockey sticks by the door
    for (let k = 0; k < 10; k++) { g.fillStyle = C.O; g.fillRect(4 + k * 2 - 1, 11 - k, 40 - k * 4 + 2, 1); g.fillStyle = k % 2 ? C.hatDark : C.hat; g.fillRect(4 + k * 2, 11 - k + 0, 40 - k * 4, 1); }
    outlined(g, [[36, 0, 6, 12, C.stoneDark]], [[37, 2, 2, 2, C.stone], [39, 6, 2, 2, C.stone]]);
    g.fillStyle = C.O; g.fillRect(2, 11, 44, 2); g.fillStyle = C.hatDark; g.fillRect(2, 11, 44, 1);
    for (let y = 13; y < 32; y += 3) log(g, 4, y, 40);
    g.fillStyle = C.O; for (let y = 13; y < 32; y += 3) { g.fillRect(2, y, 3, 3); g.fillRect(43, y, 3, 3); }
    g.fillStyle = C.logLight; for (let y = 14; y < 32; y += 3) { g.fillRect(3, y, 1, 1); g.fillRect(44, y, 1, 1); }
    outlined(g, [[20, 20, 8, 12, C.woodDark]], [[26, 26, 1, 1, C.gold]]);
    for (const x of [8, 32]) { g.fillStyle = C.O; g.fillRect(x - 1, 16, 8, 7); g.fillStyle = C.yellow; g.fillRect(x, 17, 6, 5); g.fillStyle = t.main; g.fillRect(x, 17, 6, 1); g.fillStyle = C.O; g.fillRect(x + 3, 17, 1, 5); }
    g.fillStyle = C.O; g.fillRect(14, 22, 1, 10); g.fillRect(16, 23, 1, 9); g.fillStyle = C.O; g.fillRect(14, 31, 3, 1); g.fillRect(16, 31, 3, 1);
    g.fillStyle = t.main; g.fillRect(19, 30, 10, 2);
  },
  turret(g, t) {
    // Goal Net: a hockey net on a block of ice with a puck cannon on the crossbar
    outlined(g, [[3, 26, 26, 6, C.ice]], [[3, 26, 26, 1, C.white], [3, 30, 26, 2, '#a8cce0']]);
    g.fillStyle = C.O; g.fillRect(5, 13, 18, 14);
    g.fillStyle = C.white; g.fillRect(6, 14, 16, 12);
    g.fillStyle = C.marbleShade; for (let x = 7; x < 22; x += 2) g.fillRect(x, 14, 1, 12); for (let y = 15; y < 26; y += 2) g.fillRect(6, y, 16, 1);
    g.fillStyle = C.serge; g.fillRect(5, 13, 18, 2); g.fillRect(5, 13, 2, 14); g.fillRect(21, 13, 2, 14);
    outlined(g, [[9, 7, 10, 6, C.gun], [18, 8, 12, 2, C.gun]], [[9, 7, 10, 1, C.gunLight], [9, 10, 10, 1, t.main], [29, 8, 1, 2, C.O]]);
    disc(g, 26, 28, 1, C.gunDark);
  },
  wall(g, t) {
    // Beaver Dam: criss-crossed sticks and mud, with the engineer on top
    g.fillStyle = C.O; g.fillRect(0, 6, 16, 26);
    g.fillStyle = C.mud; g.fillRect(1, 7, 14, 25);
    for (let i = 0; i < 9; i++) {
      const y = 8 + i * 3;
      g.fillStyle = i % 2 ? C.log : C.logLight;
      for (let x = 0; x < 16; x++) g.fillRect(x, y + Math.round(((i % 2 ? x : 15 - x) - 8) * 0.12), 1, 1);
    }
    g.fillStyle = C.woodDark; g.fillRect(3, 10, 1, 20); g.fillRect(11, 8, 1, 22);
    g.fillStyle = t.main; g.fillRect(0, 26, 16, 1);
    // The beaver
    g.fillStyle = C.O; g.fillRect(3, 1, 9, 6); g.fillRect(0, 4, 4, 3);
    g.fillStyle = C.moose; g.fillRect(4, 2, 7, 4); g.fillStyle = C.mooseDark; g.fillRect(1, 5, 3, 1);
    g.fillStyle = C.O; g.fillRect(9, 3, 1, 1); g.fillStyle = C.white; g.fillRect(11, 5, 1, 1);
  },
  mine(g, t) {
    // Strategic Maple Syrup Reserve: a pyramid of syrup barrels beside a tapped maple
    g.fillStyle = C.O; g.fillRect(25, 8, 3, 24); g.fillStyle = C.woodDark; g.fillRect(26, 8, 1, 24);
    disc(g, 26, 7, 7, C.O); disc(g, 26, 7, 6, C.serge); disc(g, 24, 5, 2, '#e84a50'); disc(g, 29, 9, 2, C.sergeDark);
    g.fillStyle = C.steel; g.fillRect(23, 18, 2, 1); g.fillStyle = C.O; g.fillRect(21, 19, 5, 4); g.fillStyle = C.steelLight; g.fillRect(22, 19, 3, 3);
    barrel(g, 1, 24, t.main); barrel(g, 9, 24, t.main); barrel(g, 17, 24, t.main); barrel(g, 5, 16, t.main); barrel(g, 13, 16, t.main); barrel(g, 9, 8, t.main);
  },
  workshop(g, t) {
    // Liquor store with the bourbon taken off the shelves, crate out front
    outlined(g, [[2, 8, 44, 24, C.brickLight], [0, 6, 48, 3, t.main]], [[2, 30, 44, 2, C.brickDark], [0, 6, 48, 1, t.light]]);
    g.fillStyle = C.O; g.fillRect(4, 12, 24, 14); g.fillStyle = '#e8eef0'; g.fillRect(5, 13, 22, 12);
    g.fillStyle = C.woodDark; for (const y of [16, 20, 24]) g.fillRect(5, y, 22, 1);
    g.fillStyle = C.bottle; for (const x of [6, 8, 10, 22, 24]) g.fillRect(x, 13 + 0, 1, 3);
    g.fillStyle = C.serge; for (const x of [6, 9, 12, 15]) g.fillRect(x, 21, 1, 3);
    // Empty shelf, and a "no bourbon" circle
    disc(g, 17, 18, 4, C.red); disc(g, 17, 18, 3, '#e8eef0'); g.fillStyle = C.syrup; g.fillRect(16, 16, 2, 5); g.fillRect(17, 15, 1, 1);
    g.fillStyle = C.red; for (let i = 0; i < 6; i++) g.fillRect(14 + i, 15 + i, 1, 1);
    outlined(g, [[32, 14, 10, 18, C.woodDark]], [[39, 22, 1, 2, C.gold], [33, 15, 8, 6, C.glassDark]]);
    leaf(g, 6, 1, C.serge); g.fillStyle = C.O; g.fillRect(4, 0, 9, 1);
    outlined(g, [[13, 26, 10, 6, C.woodLight]], [[13, 28, 10, 1, C.wood], [15, 26, 1, 1, C.syrup], [18, 26, 1, 1, C.syrup], [20, 26, 1, 1, C.syrup]]);
  },
};

// ── The EU: buildings ──────────────────────────────────────────────────────
function euFlag(g, x, y) {
  g.fillStyle = C.O; g.fillRect(x, y, 1, 12); g.fillRect(x + 1, y, 6, 5);
  g.fillStyle = C.euBlue; g.fillRect(x + 1, y + 1, 5, 3);
  g.fillStyle = C.star; g.fillRect(x + 3, y + 2, 1, 1);
}
function binders(g, x, y, w, h, t) {
  const cols = [C.euBlue, C.paper, C.euBlueLight, C.cabinet, t];
  for (let i = 0; i < w; i += 3) {
    g.fillStyle = C.O; g.fillRect(x + i, y, 3, h);
    g.fillStyle = cols[(i / 3) % cols.length]; g.fillRect(x + i, y + 1, 2, h - 1);
    g.fillStyle = C.white; g.fillRect(x + i, y + 3, 2, 1);
  }
}
const EU_BUILD = {
  hq(g, t) {
    // The Berlaymont: a vast glass X of louvres, ringed by flags with gold stars
    outlined(g, [[4, 14, 16, 30, C.glassDark], [44, 14, 16, 30, C.glassDark], [16, 4, 32, 40, C.glass]], [[4, 14, 16, 1, C.white], [44, 14, 16, 1, C.white]]);
    g.fillStyle = C.steelLight; for (let y = 7; y < 44; y += 3) g.fillRect(16, y, 32, 1);
    g.fillStyle = C.steel; for (let y = 16; y < 44; y += 3) { g.fillRect(4, y, 16, 1); g.fillRect(44, y, 16, 1); }
    g.fillStyle = C.O; g.fillRect(20, 2, 24, 3); g.fillStyle = C.cabinetLight; g.fillRect(20, 2, 24, 2);
    // The team's own ring of stars over the entrance
    outlined(g, [[24, 9, 16, 12, t.main]], [[25, 10, 14, 10, C.euBlue]]);
    stars(g, 32, 15, 4, C.star);
    outlined(g, [[26, 36, 12, 12, C.euBlueDark]], [[26, 36, 12, 1, C.euBlueLight], [31, 37, 2, 11, C.glassDark]]);
    g.fillStyle = C.O; g.fillRect(2, 44, 60, 4); g.fillStyle = C.cabinetLight; g.fillRect(2, 44, 60, 3);
    for (const x of [2, 10, 47, 55]) euFlag(g, x, 33);
    binders(g, 40, 41, 6, 3, t.main);
  },
  barracks(g, t) {
    // Committee Room: a low office with a long meeting table and a queue of chairs
    outlined(g, [[2, 10, 44, 22, C.cabinetLight], [0, 7, 48, 3, C.euBlue]], [[0, 7, 48, 1, C.euBlueLight], [2, 30, 44, 2, C.cabinet]]);
    g.fillStyle = C.O; g.fillRect(4, 13, 28, 12); g.fillStyle = '#e8eef0'; g.fillRect(5, 14, 26, 10);
    g.fillStyle = C.woodDark; g.fillRect(7, 20, 22, 2);
    for (let x = 8; x < 28; x += 4) { g.fillStyle = C.skin; g.fillRect(x, 17, 2, 2); g.fillStyle = C.grey; g.fillRect(x, 19, 2, 1); g.fillStyle = C.paper; g.fillRect(x, 20, 2, 1); }
    outlined(g, [[35, 18, 8, 14, C.euBlueDark]], [[41, 25, 1, 1, C.star], [36, 19, 6, 2, t.main]]);
    g.fillStyle = C.O; g.fillRect(14, 0, 20, 7); g.fillStyle = t.main; g.fillRect(15, 1, 18, 5); g.fillStyle = C.euBlue; g.fillRect(20, 1, 8, 5);
    stars(g, 24, 3, 2, C.star);
    binders(g, 4, 27, 12, 5, t.main);
  },
  turret(g, t) {
    // Approval Desk: a pile of forms, a giant rubber stamp and a fountain-pen gun
    binders(g, 5, 22, 21, 10, t.main);
    outlined(g, [[7, 16, 16, 6, C.paper], [10, 8, 10, 8, C.euBlue], [19, 10, 10, 2, C.gunDark]], [
      [7, 18, 16, 1, C.paperShade], [10, 8, 10, 1, C.euBlueLight], [10, 13, 10, 1, t.main], [28, 10, 1, 2, C.star], [24, 10, 1, 2, C.star],
    ]);
    outlined(g, [[3, 9, 4, 3, C.red], [4, 12, 2, 2, C.woodDark], [2, 14, 6, 2, C.woodDark]], [[2, 15, 6, 1, C.red]]);
    stars(g, 15, 11, 2, C.star);
  },
  wall(g, t) {
    // Red Tape: a wall of binders bound up in red tape
    for (let y = 2; y < 32; y += 10) binders(g, 0, y, 16, 10, t.main);
    g.fillStyle = C.O; g.fillRect(0, 31, 16, 1);
    g.fillStyle = C.red;
    for (let i = 0; i < 30; i++) { g.fillRect(Math.floor(i * 16 / 30), 2 + i, 1, 1); g.fillRect(15 - Math.floor(i * 16 / 30), 2 + i, 1, 1); }
    g.fillStyle = C.red; g.fillRect(6, 15, 4, 3); g.fillStyle = '#f06a5a'; g.fillRect(7, 15, 2, 1);
    g.fillStyle = t.main; g.fillRect(0, 26, 16, 1);
  },
  mine(g, t) {
    // Fines Office: a little office printing outsized fines for big tech
    outlined(g, [[2, 12, 20, 20, C.paper], [0, 9, 24, 3, C.euBlue]], [[0, 9, 24, 1, C.euBlueLight], [2, 30, 20, 2, C.paperShade]]);
    // A big euro sign
    g.fillStyle = C.O; g.fillRect(5, 14, 9, 9); g.fillStyle = C.star; g.fillRect(6, 15, 7, 7);
    g.fillStyle = C.euBlue; g.fillRect(9, 15, 3, 1); g.fillRect(8, 16, 1, 1); g.fillRect(6, 17, 5, 1); g.fillRect(7, 18, 1, 1); g.fillRect(6, 19, 5, 1); g.fillRect(8, 20, 1, 1); g.fillRect(9, 21, 3, 1);
    outlined(g, [[14, 22, 6, 10, C.euBlueDark]], [[18, 26, 1, 1, C.star]]);
    // Stacks of gold coins out front and the outsized cheque
    for (const [x, h] of [[24, 6], [28, 9]]) { g.fillStyle = C.O; g.fillRect(x - 1, 31 - h, 5, h + 1); for (let i = 0; i < h; i++) { g.fillStyle = i % 2 ? C.goldDark : C.gold; g.fillRect(x, 31 - i, 3, 1); } }
    outlined(g, [[3, 24, 10, 5, C.white]], [[4, 25, 5, 1, C.cabinet], [4, 27, 8, 1, C.euBlue], [10, 25, 2, 1, C.red]]);
    g.fillStyle = C.O; g.fillRect(4, 3, 1, 6); g.fillRect(5, 3, 6, 4); g.fillStyle = t.main; g.fillRect(5, 4, 5, 2);
  },
};

const SIDE_BUILD = { china: CHINA_BUILD, canada: CANADA_BUILD, eu: EU_BUILD };

function puff(ctx, x, y, ms, i) {
  const k = ((ms / 1800) + i * 0.5) % 1;
  ctx.globalAlpha = 0.6 * (1 - k);
  rect(ctx, x + Math.round(k * 4), y - Math.round(k * 10), 3, 2, C.smoke);
  ctx.globalAlpha = 1;
}

function animate(ctx, b, x, y) {
  const side = sideId(b.faction);
  const own = SIDE_BUILD[side]?.[b.type];
  if (!own) { usaAnimate(ctx, b, x, y); return; }
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  const t = team(b.faction);
  if (side === 'china') {
    if (b.type === 'hq') { for (let i = 0; i < 2; i++) { puff(ctx, x + 7, y + 1, ms, i); puff(ctx, x + 54, y + 5, ms + 600, i); } }
    else if (b.type === 'mine') { const k = Math.floor(ms / 220) % 9; rect(ctx, x + 19 + k, y + 23 - k, 1, 1, '#d08af0'); }
    else if (b.type === 'workshop') { if (tick % 8 < 4) rect(ctx, x + 23, y + 3, 1, 1, C.white); }
    else if (b.type === 'barracks') { if (tick % 6 < 3) rect(ctx, x + 14, y + 12, 1, 2, C.yellow); }
    else if (b.type === 'airbase') { const k = Math.floor(ms / 300) % 8; rect(ctx, x + 47, y + 11 + (k < 4 ? k : 8 - k), 3, 1, C.O); }
  } else if (side === 'canada') {
    if (b.type === 'hq') { const k = Math.floor(ms / 400) % 2; rect(ctx, x + 56, y + 3 + k, 2, 5, t.main); }
    else if (b.type === 'barracks') { for (let i = 0; i < 2; i++) puff(ctx, x + 37, y - 1, ms, i); }
    else if (b.type === 'mine') { const k = (ms / 1400) % 1; rect(ctx, x + 23, y + 19 + Math.round(k * 2), 1, 1, C.syrupLight); }
  } else if (side === 'eu') {
    if (b.type === 'hq') { for (const fx of [2, 10, 47, 55]) if ((tick + fx) % 4 < 2) rect(ctx, x + fx + 6, y + 34, 1, 3, C.euBlue); }
    else if (b.type === 'mine') { const k = (ms / 1100) % 1; rect(ctx, x + 29, y + 10 + Math.round(k * 12), 3, 1, C.goldLight); }
    else if (b.type === 'barracks') { if (tick % 10 < 5) rect(ctx, x + 18, y + 16, 1, 1, C.white); }
  }
}

// Fallen units are knocked flat, every side alike: no blood, it's that kind of war.
const BODY = {
  china: { soldier: palette.coverall, heavy: palette.coverall, engineer: '#6a6a74', sniper: palette.navy },
  canada: { soldier: palette.serge, engineer: palette.serge, sniper: null, heavy: null },
  eu: { soldier: palette.euBlue, heavy: palette.grey, engineer: palette.grey, sniper: palette.gunDark },
};
function corpse(e) {
  const side = sideId(e.f);
  if (side === 'usa') return usaCorpse(e);
  const t = team(e.f);
  const [c, g] = canvas(14, 6);
  if (e.type === 'scout' && side === 'china') {
    outlined(g, [[1, 2, 10, 3, C.white], [11, 2, 2, 2, C.white]], [[3, 2, 3, 3, C.penguin], [9, 4, 2, 1, C.penguin], [5, 2, 3, 1, t.main]]);
  } else if (e.type === 'scout' && side === 'canada') {
    outlined(g, [[1, 2, 10, 3, C.moose], [11, 2, 2, 3, C.moose], [10, 0, 3, 1, C.antler]], [[3, 2, 3, 1, t.main], [1, 4, 10, 1, C.mooseDark]]);
  } else if (e.type === 'scout') {
    // The cheese wheel, toppled on its side
    outlined(g, [[1, 2, 12, 3, C.cheese]], [[1, 4, 12, 1, C.cheeseDark], [4, 3, 2, 1, C.cheeseDark], [9, 2, 2, 1, C.cheeseDark], [6, 2, 2, 1, t.main]]);
  } else {
    const body = BODY[side][e.type] || C.white;
    const cap = e.type === 'heavy' || (side === 'china' && e.type === 'engineer') ? t.main : side === 'china' && e.type === 'soldier' ? C.white
      : side === 'canada' && e.type === 'soldier' ? C.hat : side === 'canada' ? C.white : C.hair;
    const top = side === 'canada' && (e.type === 'heavy' || e.type === 'sniper') ? t.main : body;
    outlined(g, [[1, 2, 3, 3, side === 'canada' && e.type === 'heavy' ? C.white : C.skin], [4, 2, 7, 3, top], [11, 3, 2, 2, C.boot]], [[1, 1, 3, 1, cap], [5, 3, 2, 1, t.main]]);
  }
  return { c, ax: 7, ay: 5 };
}
function corpseKey(e) { return `ko-${sideId(e.f)}-${e.type}`; }

export default {
  id: 'tariff',
  name: 'Trade Wars',
  sides: [
    {
      id: 'usa', name: 'The USA', short: 'USA',
      blurb: 'Gold towers, golf carts and tariffs on everything, penguins included. Somebody else will definitely pay for it.',
      win: 'Tremendous victory. The biggest. Prices still going up the ramp.',
      lose: 'Turns out the importers were paying all along.',
    },
    {
      id: 'china', name: 'China', short: 'China',
      blurb: 'Container ships, rare-earth magnets, solar panels by the mile and a warehouse of soybeans nobody ordered. Retaliatory tariffs ready to ship.',
      names: {
        soldier: 'Dock Hand', heavy: 'Magnet Gunner', scout: 'Panda', engineer: 'Solar Fitter', sniper: 'Bullet Trainer',
        jeep: 'EV Runabout', tank: 'Container Crawler', artillery: 'Soy Return Catapult', helicopter: 'Delivery Drone', bomber: 'Dragon Kite',
        hq: 'Mega Factory', barracks: 'Night Shift Dorm', turret: 'Solar Sentry', wall: 'Container Wall', mine: 'Rare Earth Mine',
        workshop: 'EV Gigaplant', airbase: 'Container Port',
      },
      icons: { hq: '🏭', barracks: '🏢', turret: '☀️', wall: '📦', mine: '🧲', workshop: '🔋', airbase: '🚢' },
      win: 'Shipped on time, under budget, tariff included.',
      lose: 'Return to sender. Soybeans not included.',
    },
    {
      id: 'canada', name: 'Canada', short: 'Canada',
      blurb: 'Elbows up! Mounties, goalies, a moose on patrol and the Strategic Maple Syrup Reserve. Bourbon off the shelves. Sorry, eh.',
      names: {
        soldier: 'Mountie', heavy: 'Goalie', scout: 'Moose', engineer: 'Lumberjack', sniper: 'Slapshooter',
        jeep: 'Zamboni', tank: 'Syrup Tanker', artillery: 'Puck Launcher', helicopter: 'Honk Patrol', bomber: 'Bush Beaver',
        hq: 'Maple Parliament', barracks: 'Log Cabin', turret: 'Goal Net', wall: 'Beaver Dam', mine: 'Syrup Reserve', workshop: 'Bourbon-Free Shop',
        airbase: 'Borrowed Helipad',
      },
      icons: { hq: '🏛️', barracks: '🛖', turret: '🥅', wall: '🦫', mine: '🍁', workshop: '🥃' },
      win: 'Sorry about your army, eh. Not that sorry.',
      lose: 'Sorry, eh. Elbows down… for now.',
    },
    {
      id: 'eu', name: 'The EU', short: 'EU',
      blurb: 'Twenty-seven committees, one rubber stamp and tariffs on bourbon and motorbikes. The counter-offensive is approved, pending translation.',
      names: {
        soldier: 'Eurocrat', heavy: 'Rubber Stamper', scout: 'Brie Runner', engineer: 'Regulator', sniper: 'Sommelier',
        jeep: 'Vespa Patrol', tank: 'Regulation Tank', artillery: 'Champagne Cannon', helicopter: 'Red Tape Copter', bomber: 'Directive Glider',
        hq: 'Berlaymont', barracks: 'Committee Room', turret: 'Approval Desk', wall: 'Red Tape', mine: 'Fines Office',
        workshop: 'Factory (Pending)', airbase: 'Shared Helipad',
      },
      icons: { hq: '⭐', barracks: '🪑', turret: '🖋️', wall: '📚', mine: '💶' },
      win: 'Victory approved, in all twenty-four official languages.',
      lose: 'Defeat noted. A committee will look into it in 2031.',
    },
  ],
  palette,
  teamBase: SUIT,
  roofBase: [0.3, 0.26, 0.2],
  soldier: buildSoldier,
  vehicle: {
    jeep: (f, frame) => pick(JEEP, f)(f, frame),
    tank: (f, frame) => pick(TANK, f)(f, frame),
    artillery: (f, frame) => pick(ARTY, f)(f, frame),
  },
  aircraft: { helicopter: (f) => pick(HELI, f)(f), bomber: (f) => pick(BOMBER, f)(f) },
  buildings: Object.fromEntries(Object.keys(BUILD).map((k) => [k, (g, t, f) => (SIDE_BUILD[sideId(f)]?.[k] || BUILD[k])(g, t, f)])),
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
