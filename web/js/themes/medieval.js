// Medieval: castles and siege engines on rolling green hills. Knights and
// men-at-arms, peasants and plague carriers, catapults and trebuchets, with
// griffins and dragons for an air force. Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#1e140c',                        // outline
  skin: '#efbf8c', skinDark: '#c38a5a', sick: '#a9b77e', sickDark: '#7c8a55',
  boot: '#3a2614', gun: '#3a2a1a', gunLight: '#7a6a52',
  yellow: '#f2c230', yellowDark: '#c99a1c', red: '#c8321e', redDark: '#7e1d12', white: '#f6f0dc',
  sky: ['#5f97cf', '#72a6d6', '#88b6dd', '#a2c5e2', '#c4d6e2', '#e6d8c0'],
  cloud: '#fbf6ea', cloudShade: '#dcd2c2',
  mountain: '#8fa3b8', mountainLight: '#b6c4d2', hillFar: '#7a9a58', hillNear: '#5f8a42',
  leaf: '#3e7a2e', leafLight: '#5a9a3a', leafDark: '#24561e', pine: '#2f5e30', pineDark: '#1d3f20',
  trunk: '#6e4824', trunkDark: '#4e321a',
  grass: '#5aa83a', grassLight: '#8fd05a', grassDark: '#3a7a28',
  dirt: '#8a5e36', dirtMid: '#74502e', dirtDeep: '#5c3e24', pebble: '#a88a68', pebbleDark: '#4a321c',
  stone: '#9e978a', stoneLight: '#c4bdae', stoneDark: '#6f695e', moss: '#6f8f3a',
  wood: '#8e6236', woodLight: '#b4844e', woodDark: '#5e3c1e',
  plaster: '#e8dcbc', thatch: '#c9a24a', thatchDark: '#9a7a32', straw: '#e0be5e',
  metal: '#a3a7ab', metalLight: '#d6d9dc', metalDark: '#62676c',
  hose: '#5a4630', robe: '#5b4a36', robeDark: '#3c3024', bandage: '#e6dcc4',
  tawny: '#c8954a', tawnyDark: '#946630', feather: '#f1ead8',
  fire: '#f28a30', glass: '#f2d27a', shadow: 'rgba(0,0,0,0.25)',
};
const TABARD = [0.5, 0.42, 0.3];

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
    // Knight: plate armour, plumed great helm, heraldic shield, sword up
    parts = [
      ...legs.map((l) => [...l, C.metalDark]), ...boots.map((b) => [...b, C.metalDark]),
      [4, 8, 9, 4, C.metal], [6, 2, 6, 6, C.metal], [7, 0, 3, 2, t.main],
      [13, 3, 1, 7, C.metalLight], [12, 9, 3, 1, C.yellowDark], [2, 8, 5, 5, t.main],
    ];
    details = [
      [6, 2, 6, 1, C.metalLight], [8, 4, 4, 1, C.O], [9, 6, 1, 1, C.O], [11, 6, 1, 1, C.O], [8, 0, 1, 1, t.light],
      [4, 8, 9, 1, C.metalLight], [7, 9, 4, 3, t.dark], [8, 9, 2, 3, t.main],
      [4, 8, 1, 5, t.light], [2, 10, 5, 1, t.light], [13, 10, 1, 1, C.woodDark],
    ];
  } else if (type === 'scout') {
    // Plague carrier: hunched, ragged and bandaged, ringing a bell
    const hl = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [9, 12, 2, 3]];
    parts = [
      ...hl.map((l) => [...l, C.robeDark]), ...boots.map((b) => [...b, C.boot]),
      [4, 8, 8, 4, C.robe], [7, 4, 6, 5, C.sick], [6, 3, 6, 3, C.robeDark],
      [12, 9, 2, 1, C.sick], [13, 10, 2, 2, C.yellow],
    ];
    details = [
      [10, 6, 1, 1, C.O], [8, 7, 4, 1, C.sickDark], [7, 5, 2, 1, C.bandage], [4, 9, 8, 1, t.main],
      [5, 11, 2, 1, C.robeDark], [9, 11, 2, 1, C.robeDark], [13, 11, 1, 1, C.yellowDark],
      [15, 3, 1, 1, '#9ad04a'], [16, 1, 1, 1, '#9ad04a'], [14, 0, 1, 1, '#7ab03a'],
    ];
  } else if (type === 'engineer') {
    // Peasant: straw hat, plain tunic with a team sash, mending hammer
    parts = [
      ...legs.map((l) => [...l, C.hose]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, '#9c7a4e'], [6, 3, 6, 5, C.skin], [4, 2, 10, 2, C.straw], [6, 0, 6, 2, C.straw],
      [11, 9, 4, 1, C.wood], [14, 7, 2, 4, C.metalDark],
    ];
    details = [
      [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [4, 3, 10, 1, C.thatchDark], [6, 0, 6, 1, '#f2d888'],
      [5, 10, 7, 1, t.main], [9, 9, 3, 2, '#9c7a4e'],
    ];
  } else if (type === 'sniper') {
    // Longbowman: hood, team tunic, a bow taller than he is
    parts = [
      ...legs.map((l) => [...l, C.hose]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, t.uni], [6, 3, 6, 5, C.skin], [5, 1, 7, 4, t.dark],
      [14, 2, 1, 1, C.wood], [15, 3, 1, 9, C.wood], [14, 12, 1, 1, C.wood],
    ];
    details = [
      [5, 1, 7, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [5, 8, 7, 1, t.main],
      [14, 3, 1, 9, '#e8e0cc'], [9, 9, 6, 1, C.woodLight], [8, 9, 1, 1, C.white], [5, 10, 7, 1, C.woodDark],
    ];
  } else {
    // Man-at-arms: kettle helm, mail, team tabard, spear
    parts = [
      ...legs.map((l) => [...l, C.hose]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, t.main], [6, 3, 6, 5, C.skin], [4, 2, 10, 2, C.metal], [6, 0, 6, 2, C.metal],
      [13, 0, 1, 15, C.wood], [12, 0, 3, 1, C.metalLight],
    ];
    details = [
      [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [6, 0, 6, 1, C.metalLight], [4, 3, 10, 1, C.metalDark],
      [8, 8, 1, 4, t.light], [6, 9, 5, 1, t.light], [11, 9, 2, 2, C.metalDark],
    ];
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── Mounts & siege engines ─────────────────────────────────────────────────
function cartWheel(g, x, y, r, frame) {
  disc(g, x, y, r, C.O);
  disc(g, x, y, r - 1, C.wood);
  disc(g, x, y, r - 2, C.woodDark);
  g.fillStyle = C.woodLight;
  if (frame) { g.fillRect(x - r + 2, y, 2 * r - 3, 1); g.fillRect(x, y - r + 2, 1, 2 * r - 3); }
  else for (let i = -r + 2; i <= r - 2; i++) { g.fillRect(x + i, y + i, 1, 1); g.fillRect(x + i, y - i, 1, 1); }
  g.fillStyle = C.metalDark; g.fillRect(x, y, 1, 1);
}

// Horseman: a lancer on a caparisoned horse; legs gallop between frames.
function buildHorseman(f, frame) {
  const t = team(f);
  const [c, g] = canvas(28, 22);
  const d = 3; // headroom for the rider's helm
  const legs = frame
    ? [[6, 12, 2, 5], [9, 12, 2, 4], [16, 12, 2, 4], [19, 12, 2, 5]]
    : [[5, 12, 2, 4], [10, 12, 2, 5], [15, 12, 2, 5], [20, 12, 2, 4]];
  const sh = (list) => list.map(([x, y, w, h, col]) => [x, y + d, w, h, col]);
  outlined(g, sh([
    ...legs.map((l) => [...l, '#5a3a1e']), [4, 7, 18, 6, '#7a4e2a'], [20, 3, 4, 6, '#7a4e2a'], [22, 2, 4, 3, '#7a4e2a'],
    [2, 7, 3, 5, '#3a2614'], [10, 1, 4, 6, t.main], [10, -2, 4, 3, C.metal], [11, -3, 2, 1, t.light],
  ]), sh([
    [4, 9, 16, 3, t.main], [4, 9, 16, 1, t.light], [6, 11, 2, 1, C.yellow], [14, 11, 2, 1, C.yellow],
    [24, 3, 1, 1, C.O], [21, 3, 1, 4, '#3a2614'], [10, 1, 4, 1, t.light], [11, -1, 3, 1, C.O],
    [5, 7, 15, 1, '#946036'], [11, 3, 2, 2, C.skin],
  ]));
  // Lance couched forward
  g.fillStyle = C.O; g.fillRect(13, 4 + d, 15, 3);
  g.fillStyle = C.wood; g.fillRect(13, 5 + d, 12, 1);
  g.fillStyle = C.metalLight; g.fillRect(25, 5 + d, 3, 1);
  g.fillStyle = t.main; g.fillRect(17, 6 + d, 3, 1);
  return { c, ax: 13, ay: 18 + d };
}

// Catapult: a wheeled frame with a throwing arm and a boulder in the cup.
function buildCatapult(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 20);
  const d = 3;
  const sh = (list) => list.map(([x, y, w, h, col]) => [x, y + d, w, h, col]);
  outlined(g, sh([
    [2, 9, 23, 3, C.wood], [12, 3, 2, 7, C.woodDark], [9, 3, 8, 1, C.woodDark],
    [6, 8, 2, 2, C.wood], [8, 7, 2, 2, C.wood], [10, 6, 2, 2, C.wood], [12, 5, 2, 2, C.wood], [14, 4, 2, 2, C.wood],
    [16, 3, 2, 2, C.wood], [18, 2, 2, 2, C.wood], [20, 0, 4, 3, C.woodDark], [21, -1, 3, 2, C.stone],
    [14, 0, 1, 3, C.woodDark],
  ]), sh([
    [2, 9, 23, 1, C.woodLight], [21, -1, 2, 1, C.stoneLight], [15, 0, 3, 2, t.main], [4, 10, 2, 1, t.main],
  ]));
  cartWheel(g, 6, 13 + d, 3, frame);
  cartWheel(g, 20, 13 + d, 3, frame);
  return { c, ax: 13, ay: 16 + d };
}

// Trebuchet: a tall timber frame, counterweight on the short end, a sling and
// boulder on the long arm, and a pennant.
function buildTrebuchet(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 26);
  outlined(g, [
    [3, 19, 22, 3, C.wood], [8, 8, 2, 12, C.woodDark], [17, 8, 2, 12, C.woodDark], [10, 7, 7, 2, C.wood],
    [5, 14, 7, 5, C.woodDark],
    [6, 11, 3, 2, C.wood], [9, 9, 3, 2, C.wood], [12, 7, 3, 2, C.wood], [15, 5, 3, 2, C.wood], [18, 3, 3, 2, C.wood],
    [21, 1, 3, 2, C.wood], [24, 0, 2, 1, C.wood], [25, 2, 1, 4, '#d8cdb0'], [24, 6, 3, 3, C.stone],
    [13, 1, 1, 6, C.woodDark],
  ], [
    [3, 19, 22, 1, C.woodLight], [5, 14, 7, 1, C.wood], [6, 16, 5, 1, C.metalDark], [24, 6, 2, 1, C.stoneLight],
    [14, 1, 4, 2, t.main], [14, 1, 4, 1, t.light], [10, 7, 7, 1, C.woodLight],
  ]);
  cartWheel(g, 6, 22, 3, frame);
  cartWheel(g, 21, 22, 3, frame);
  return { c, ax: 13, ay: 25 };
}

// Griffin: an eagle-headed beast with a rider (wings flap live, see rotor).
function buildGriffin(f) {
  const t = team(f);
  const [c, g] = canvas(30, 17);
  outlined(g, [
    [7, 7, 14, 5, C.tawny], [20, 4, 5, 5, C.feather], [25, 6, 2, 2, C.yellow], [2, 7, 6, 2, C.tawny], [1, 6, 2, 2, C.tawnyDark],
    [9, 12, 2, 3, C.tawnyDark], [17, 12, 2, 3, C.yellow], [12, 2, 4, 5, t.main], [12, 0, 4, 3, C.metal],
  ], [
    [7, 7, 14, 1, '#dcae64'], [23, 5, 1, 1, C.O], [20, 8, 3, 1, '#d8cbb0'], [12, 2, 4, 1, t.light], [13, 1, 3, 1, C.O],
    [8, 10, 12, 1, C.tawnyDark],
  ]);
  return { c, ax: 15, ay: 14 };
}

// Dragon: a horned, long-necked beast in team-tinted scales (wings flap live).
function buildDragon(f) {
  const t = team(f);
  const [c, g] = canvas(42, 19);
  outlined(g, [
    [10, 7, 18, 6, t.uniDark], [27, 4, 4, 5, t.uniDark], [30, 2, 6, 4, t.uniDark], [36, 3, 3, 2, t.uniDark],
    [2, 9, 9, 2, t.uniDark], [0, 7, 3, 3, t.dark], [12, 12, 2, 3, t.uniDark], [23, 12, 2, 3, t.uniDark],
    [31, 0, 1, 2, C.bandage],
  ], [
    [10, 11, 18, 2, '#d8b46a'], [12, 7, 14, 1, t.uni], [33, 3, 1, 1, C.yellow], [37, 4, 2, 1, C.red],
    [14, 6, 1, 1, t.dark], [18, 6, 1, 1, t.dark], [22, 6, 1, 1, t.dark], [28, 4, 1, 4, '#d8b46a'],
  ]);
  return { c, ax: 20, ay: 15 };
}

// Flapping wings (instead of rotors): a wing rising from the back, raised on
// one frame and spread flat on the next. Drawn over the body each frame.
function rotor(ctx, u, x, y) {
  const up = Math.floor(performance.now() / 140) % 2 === 0;
  const s = u.facing;
  const dragon = u.type === 'bomber';
  const tm = team(u.faction);
  const fill = dragon ? tm.dark : C.feather;
  const rib = dragon ? tm.uniDark : C.tawny;
  const span = dragon ? 15 : 9;
  const root = x + (dragon ? 4 : -4) * s;     // shoulder: behind the neck, or behind the griffin's rider
  const back = y - (dragon ? 8 : 7);          // top of the body
  for (let i = 0; i < span; i++) {
    const lift = up ? Math.round((span - i) * 0.9) + 1 : 2 + (i > span - 4 ? 1 : 0);
    const px = s > 0 ? root - i : root + i;
    rect(ctx, px, back - lift, 1, lift + 1, fill);
    rect(ctx, px, back - lift - 1, 1, 1, C.O);
    if (dragon && i % 4 === 2) rect(ctx, px, back - lift, 1, lift, rib);
    if (!dragon && i % 3 === 0) rect(ctx, px, back - lift + 1, 1, 1, rib);
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
function merlons(g, x, y, w, col, step = 4) {
  for (let i = x; i < x + w; i += step * 2) {
    g.fillStyle = C.O; g.fillRect(i - 1, y - 1, step + 2, 4);
    g.fillStyle = col; g.fillRect(i, y, Math.min(step, x + w - i), 3);
  }
}

function bricks(g, x, y, w, h, seed) {
  g.fillStyle = C.stoneDark;
  for (let yy = y + 3; yy < y + h; yy += 4) {
    g.fillRect(x, yy, w, 1);
    for (let xx = x + ((yy / 4) % 2 ? 2 : 5); xx < x + w; xx += 7) g.fillRect(xx, yy - 3, 1, 3);
  }
  g.fillStyle = C.moss;
  for (let i = 0; i < 3; i++) g.fillRect(x + Math.floor(hash(seed + i) * (w - 3)), y + h - 2 - Math.floor(hash(seed + i + 5) * 6), 2, 1);
}

function banner(g, x, y, t, len = 9) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 5, len + 2);
  g.fillStyle = t.main; g.fillRect(x, y, 3, len);
  g.fillStyle = t.light; g.fillRect(x + 1, y + 2, 1, len - 4);
  g.fillStyle = C.yellow; g.fillRect(x, y, 3, 1);
  g.clearRect(x + 1, y + len - 1, 1, 2);
}

function coneRoof(g, cx, y, w, h, t) {
  for (let i = 0; i < h; i++) {
    const half = Math.round(((i + 1) / h) * (w / 2));
    g.fillStyle = C.O; g.fillRect(cx - half - 1, y + i, half * 2 + 2, 1);
    g.fillStyle = i % 3 === 2 ? t.roofDark : t.roof; g.fillRect(cx - half, y + i, half * 2, 1);
  }
}

const BUILD = {
  hq(g, t) {
    // Castle: a keep between two round towers, gatehouse, banners
    outlined(g, [[3, 16, 14, 32, C.stone], [47, 16, 14, 32, C.stone], [17, 10, 30, 38, C.stoneLight]], [
      [3, 16, 1, 32, C.stoneLight], [47, 16, 1, 32, C.stoneLight], [17, 10, 30, 1, '#ddd6c6'],
    ]);
    bricks(g, 18, 12, 28, 35, 3);
    bricks(g, 4, 18, 12, 29, 7);
    bricks(g, 48, 18, 12, 29, 9);
    merlons(g, 17, 7, 30, C.stoneLight);
    coneRoof(g, 10, 4, 16, 12, t);
    coneRoof(g, 54, 4, 16, 12, t);
    outlined(g, [[26, 32, 12, 16, '#2a1c10']], [[27, 33, 10, 1, C.woodDark], [27, 37, 10, 1, C.metalDark], [27, 41, 10, 1, C.metalDark], [27, 45, 10, 1, C.metalDark],
      [29, 33, 1, 15, C.metalDark], [34, 33, 1, 15, C.metalDark]]);
    g.fillStyle = C.stoneLight; g.fillRect(25, 30, 14, 2);
    for (const [x, y] of [[9, 24], [53, 24], [24, 18], [39, 18]]) { g.fillStyle = C.O; g.fillRect(x, y, 2, 5); g.fillStyle = C.glass; g.fillRect(x, y + 1, 1, 2); }
    banner(g, 20, 14, t, 11);
    banner(g, 41, 14, t, 11);
    g.fillStyle = C.woodDark; g.fillRect(32, 0, 1, 8);
  },
  barracks(g, t) {
    // Timber-framed hall on a stone footing, team-coloured roof
    outlined(g, [[3, 21, 42, 11, C.stone], [5, 11, 38, 11, C.plaster]], [[3, 21, 42, 1, C.stoneLight]]);
    bricks(g, 4, 22, 40, 9, 13);
    g.fillStyle = C.woodDark;
    g.fillRect(5, 11, 38, 1); g.fillRect(5, 20, 38, 1);
    for (const x of [5, 14, 24, 33, 42]) g.fillRect(x, 11, 1, 10);
    for (let i = 0; i < 8; i++) { g.fillRect(6 + i, 12 + i, 1, 1); g.fillRect(41 - i, 12 + i, 1, 1); }
    for (let i = 0; i < 9; i++) {
      const w = 48 - (8 - i) * 4;
      g.fillStyle = C.O; g.fillRect(24 - w / 2 - 1, 2 + i, w + 2, 1);
      g.fillStyle = i % 2 ? t.roofDark : t.roof; g.fillRect(24 - w / 2, 2 + i, w, 1);
    }
    g.fillStyle = C.O; g.fillRect(4, 10, 40, 1);
    outlined(g, [[20, 24, 8, 8, '#3a2614'], [16, 13, 6, 6, t.main]], [[24, 28, 1, 1, C.yellow], [17, 14, 4, 4, t.light], [18, 15, 2, 2, t.main]]);
    for (const x of [8, 35]) { g.fillStyle = C.O; g.fillRect(x, 14, 5, 4); g.fillStyle = C.glass; g.fillRect(x + 1, 15, 3, 2); }
  },
  turret(g, t) {
    // Stone archer tower with a crenellated top and an arrow slit
    outlined(g, [[8, 9, 16, 23, C.stone], [6, 6, 20, 4, C.stoneLight]], [[8, 9, 1, 23, C.stoneLight], [6, 6, 20, 1, '#ddd6c6']]);
    bricks(g, 9, 11, 14, 20, 21);
    merlons(g, 6, 3, 20, C.stoneLight, 3);
    g.fillStyle = C.O; g.fillRect(15, 14, 2, 7); g.fillStyle = '#2a1c10'; g.fillRect(15, 15, 2, 5);
    banner(g, 21, 10, t, 8);
    g.fillStyle = C.O; g.fillRect(12, 0, 6, 4);
    g.fillStyle = C.metal; g.fillRect(13, 0, 4, 2);
    g.fillStyle = C.skin; g.fillRect(13, 2, 4, 1);
  },
  wall(g, t) {
    // Stone curtain wall with crenellations and a painted shield
    outlined(g, [[0, 7, 16, 25, C.stone]], [[0, 7, 16, 1, C.stoneLight]]);
    bricks(g, 0, 8, 16, 24, 31);
    merlons(g, 0, 4, 16, C.stone, 3);
    outlined(g, [[5, 15, 6, 6, t.main]], [[6, 16, 4, 1, t.light], [7, 16, 2, 5, t.light], [5, 20, 1, 1, C.O], [10, 20, 1, 1, C.O]]);
  },
  mine(g, t) {
    // Village well: stone ring, timber posts, team-coloured roof, windlass
    outlined(g, [[5, 21, 22, 11, C.stone], [8, 9, 2, 13, C.wood], [22, 9, 2, 13, C.wood], [7, 13, 18, 1, C.woodDark]], [
      [5, 21, 22, 1, C.stoneLight], [6, 22, 20, 2, '#24323a'],
    ]);
    bricks(g, 5, 23, 22, 9, 41);
    for (let i = 0; i < 6; i++) {
      const w = 26 - (5 - i) * 4;
      g.fillStyle = C.O; g.fillRect(16 - w / 2 - 1, 3 + i, w + 2, 1);
      g.fillStyle = i % 2 ? t.roofDark : t.roof; g.fillRect(16 - w / 2, 3 + i, w, 1);
    }
    g.fillStyle = C.O; g.fillRect(4, 9, 24, 1);
    g.fillStyle = C.woodLight; g.fillRect(9, 12, 14, 1);
    g.fillStyle = C.woodDark; g.fillRect(23, 11, 3, 1); g.fillRect(25, 11, 1, 3);
  },
  workshop(g, t) {
    // Siege works: open timber barn with a crane, logs and a half-built engine
    outlined(g, [[2, 12, 34, 20, C.wood], [38, 2, 2, 30, C.woodDark], [30, 2, 16, 2, C.woodDark]], [[2, 12, 34, 1, C.woodLight]]);
    g.fillStyle = C.woodDark;
    for (let x = 2; x < 36; x += 4) g.fillRect(x, 13, 1, 19);
    for (let i = 0; i < 6; i++) {
      const w = 38 - (5 - i) * 5;
      g.fillStyle = C.O; g.fillRect(19 - w / 2 - 1, 5 + i, w + 2, 1);
      g.fillStyle = i % 2 ? t.roofDark : t.roof; g.fillRect(19 - w / 2, 5 + i, w, 1);
    }
    outlined(g, [[9, 18, 18, 14, '#2a1c10']], [[12, 26, 12, 2, C.wood], [17, 20, 2, 7, C.woodLight], [14, 29, 3, 3, C.woodDark], [20, 29, 3, 3, C.woodDark]]);
    g.fillStyle = '#d8cdb0'; g.fillRect(44, 4, 1, 10);
    outlined(g, [[42, 14, 5, 4, C.stone]], [[42, 14, 5, 1, C.stoneLight]]);
    for (const [x, y] of [[38, 28], [42, 28], [40, 25]]) { disc(g, x + 1, y + 1, 2, C.O); disc(g, x + 1, y + 1, 1, C.woodLight); }
    banner(g, 4, 14, t, 7);
  },
  airbase(g, t) {
    // Aerie: a rocky crag topped with a great nest, beside timber stables
    outlined(g, [[0, 18, 36, 14, C.wood], [44, 8, 16, 24, C.stone], [40, 3, 24, 6, '#7a5a32']], [
      [0, 18, 36, 1, C.woodLight], [44, 8, 1, 24, C.stoneLight],
    ]);
    g.fillStyle = C.woodDark;
    for (let x = 0; x < 36; x += 6) g.fillRect(x, 19, 1, 13);
    for (let i = 0; i < 5; i++) {
      const w = 40 - (4 - i) * 7;
      g.fillStyle = C.O; g.fillRect(18 - w / 2 - 1, 13 + i, w + 2, 1);
      g.fillStyle = i % 2 ? t.roofDark : t.roof; g.fillRect(18 - w / 2, 13 + i, w, 1);
    }
    bricks(g, 45, 10, 14, 21, 51);
    g.fillStyle = '#a8814a';
    for (let i = 0; i < 12; i++) g.fillRect(40 + Math.floor(hash(i + 3) * 22), 3 + Math.floor(hash(i + 9) * 5), 3, 1);
    for (const x of [48, 53, 57]) { disc(g, x, 3, 1, C.feather); }
    outlined(g, [[12, 22, 10, 10, '#2a1c10']], [[16, 22, 1, 10, C.woodDark]]);
    banner(g, 60, 10, t, 9);
  },
  bridge(g, t) {
    // Plank bridge with a rope rail
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 7);
    g.fillStyle = C.wood; g.fillRect(0, 1, 16, 4);
    g.fillStyle = C.woodLight; g.fillRect(0, 1, 16, 1);
    g.fillStyle = C.woodDark;
    for (let x = 3; x < 16; x += 4) g.fillRect(x, 2, 1, 3);
    g.fillStyle = C.woodDark; g.fillRect(1, 5, 2, 2); g.fillRect(13, 5, 2, 2);
    g.fillStyle = t.main; g.fillRect(6, 2, 3, 2);
  },
  ramp(g, t) {
    // Stone steps
    g.fillStyle = C.stone; g.fillRect(0, 0, 16, 16);
    g.fillStyle = C.stoneDark;
    for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = C.stoneLight;
    for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 16, 1);
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
    if (kind !== 'dirtTop' && hash(seed + 77) < 0.3) {
      // A buried stone
      g.fillStyle = C.stoneDark; g.fillRect(4 + Math.floor(hash(seed + 3) * 6), 6, 5, 3);
      g.fillStyle = C.stone; g.fillRect(5 + Math.floor(hash(seed + 3) * 6), 6, 3, 1);
    }
    if (kind === 'dirtTop') grassTop();
  } else {
    // Floating masonry: dressed stone blocks with a mossy grass top
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.stone; g.fillRect(0, 0, T, T);
    g.fillStyle = C.stoneDark;
    g.fillRect(0, 9, T, 1); g.fillRect(0, 13, T, 1);
    g.fillRect(variant % 2 ? 5 : 10, 5, 1, 4); g.fillRect(variant % 2 ? 11 : 3, 10, 1, 3);
    g.fillStyle = C.stoneLight; g.fillRect(0, 6, T, 1);
    grassTop();
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Meadow tufts, wildflowers and the odd toadstool.
function surface(ctx, x, y, ground, h) {
  ctx.fillStyle = C.grass;
  ctx.fillRect(x + Math.floor(h * 12), y - 2, 1, 2);
  ctx.fillRect(x + Math.floor(h * 12) + 2, y - 1, 1, 1);
  if (!ground) return;
  if (h > 0.9) {
    ctx.fillStyle = C.red; ctx.fillRect(x + 7, y - 3, 3, 1);
    ctx.fillStyle = C.white; ctx.fillRect(x + 8, y - 3, 1, 1);
    ctx.fillStyle = C.bandage; ctx.fillRect(x + 8, y - 2, 1, 2);
  } else if (h > 0.72) {
    ctx.fillStyle = hash(Math.floor(h * 1000)) < 0.5 ? '#f2e36a' : '#e88ad0';
    ctx.fillRect(x + 4, y - 3, 1, 1); ctx.fillRect(x + 11, y - 2, 1, 1);
    ctx.fillStyle = C.grassDark; ctx.fillRect(x + 4, y - 2, 1, 2);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};
function cloudSprite(k) {
  const key = `cloud${k}`;
  if (scenery[key]) return scenery[key];
  const w = 20 + Math.floor(hash(k + 5) * 18);
  const [c, g] = canvas(w + 2, 11);
  g.fillStyle = C.cloudShade; g.fillRect(1, 6, w, 4);
  g.fillStyle = C.cloud; g.fillRect(3, 3, w - 4, 5); g.fillRect(Math.floor(w * 0.25), 0, Math.floor(w * 0.4), 5);
  scenery[key] = c;
  return c;
}

// Distant hill-top castle silhouettes.
function farCastle(k) {
  const key = `fc${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(30, 26);
  g.fillStyle = '#7f93a6';
  g.fillRect(4, 10, 22, 16); g.fillRect(2, 6, 6, 20); g.fillRect(22, 4, 6, 22); g.fillRect(12, 2, 6, 24);
  for (const [x, w] of [[2, 6], [22, 6], [12, 6], [4, 22]]) for (let i = x; i < x + w; i += 2) g.fillRect(i, (x === 4 ? 8 : x === 12 ? 0 : x === 2 ? 4 : 2), 1, 2);
  g.fillStyle = '#9fb0c0'; g.fillRect(12, 2, 1, 24); g.fillRect(22, 4, 1, 22);
  scenery[key] = c;
  return c;
}

// Village scenery: thatched cottages, windmills (sails turn live), trees.
function cottage(k) {
  const key = `cot${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(22, 18);
  g.fillStyle = C.O; g.fillRect(2, 7, 18, 11);
  g.fillStyle = C.plaster; g.fillRect(3, 8, 16, 10);
  g.fillStyle = C.woodDark; g.fillRect(3, 8, 16, 1); g.fillRect(3, 8, 1, 10); g.fillRect(18, 8, 1, 10); g.fillRect(10, 8, 1, 10);
  g.fillStyle = '#3a2614'; g.fillRect(12, 12, 4, 6);
  g.fillStyle = C.glass; g.fillRect(5, 11, 3, 2);
  for (let i = 0; i < 8; i++) {
    const w = 22 - (7 - i) * 2.5;
    g.fillStyle = C.O; g.fillRect(Math.round(11 - w / 2 - 1), i, Math.round(w + 2), 1);
    g.fillStyle = i % 2 ? C.thatchDark : C.thatch; g.fillRect(Math.round(11 - w / 2), i, Math.round(w), 1);
  }
  g.fillStyle = C.stoneDark; g.fillRect(15, 0, 2, 3);
  scenery[key] = c;
  return c;
}

function treeSprite(k) {
  const key = `tree${k}`;
  if (scenery[key]) return scenery[key];
  const pine = hash(k + 7) < 0.55;
  const th = 16 + Math.floor(hash(k + 3) * 18);
  const [c, g] = canvas(30, th + 14);
  const cx = 15;
  g.fillStyle = C.trunkDark; g.fillRect(cx - 1, 12, 3, th + 2);
  g.fillStyle = C.trunk; g.fillRect(cx - 1, 12, 2, th + 2);
  if (pine) {
    for (let i = 0; i < th; i++) {
      const half = Math.round(2 + (i % 8) * 0.9 + i * 0.2);
      g.fillStyle = i % 8 === 7 ? C.pineDark : C.pine;
      g.fillRect(cx - half, i, half * 2 + 1, 1);
    }
  } else {
    const r = 9 + Math.floor(hash(k + 9) * 4);
    disc(g, cx, 9, r, C.leafDark);
    disc(g, cx - 1, 8, r - 2, C.leaf);
    g.fillStyle = C.leafLight; g.fillRect(cx - 4, 3, 5, 2);
  }
  scenery[key] = c;
  return c;
}

function windmill(ctx, x, base, t) {
  ctx.fillStyle = C.O; ctx.fillRect(x - 5, base - 26, 10, 26);
  ctx.fillStyle = C.plaster; ctx.fillRect(x - 4, base - 25, 8, 25);
  ctx.fillStyle = C.thatchDark; ctx.fillRect(x - 5, base - 30, 10, 5); ctx.fillRect(x - 3, base - 33, 6, 3);
  ctx.fillStyle = '#3a2614'; ctx.fillRect(x - 1, base - 6, 3, 6);
  const hx = x;
  const hy = base - 24;
  for (let a = 0; a < 4; a++) {
    const ang = t * 0.8 + (a * Math.PI) / 2;
    for (let r = 2; r < 15; r++) {
      const px = Math.round(hx + Math.cos(ang) * r);
      const py = Math.round(hy + Math.sin(ang) * r);
      ctx.fillStyle = C.woodDark; ctx.fillRect(px, py, 1, 1);
      if (r > 4) { ctx.fillStyle = C.bandage; ctx.fillRect(px + Math.round(-Math.sin(ang) * 2), py + Math.round(Math.cos(ang) * 2), 1, 1); }
    }
  }
  ctx.fillStyle = C.metalDark; ctx.fillRect(hx - 1, hy - 1, 2, 2);
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
  const cPer = ((WORLD_W / G) * 0.15) / 8;
  const cOff = Math.round(camAX * 0.15);
  for (let i = Math.floor(cOff / cPer) - 1; i * cPer - cOff < bw + 40; i++) {
    const k = ((i % 8) + 8) % 8;
    ctx.drawImage(cloudSprite(k), Math.round(i * cPer - cOff + hash(k) * 30), Math.round(8 + hash(k + 11) * 40 - camAY * 0.1));
  }

  // Birds drifting across
  ctx.fillStyle = '#3a3a44';
  for (let i = 0; i < 5; i++) {
    const bx = Math.round(((t * (10 + i * 3) + i * 97 - camAX * 0.2) % (bw + 40) + bw + 40) % (bw + 40)) - 20;
    const by = Math.round(30 + hash(i + 70) * groundY * 0.3 - camAY * 0.1);
    const flap = Math.floor(t * 4 + i) % 2;
    ctx.fillRect(bx - 2, by - flap, 2, 1); ctx.fillRect(bx, by, 1, 1); ctx.fillRect(bx + 1, by - flap, 2, 1);
  }

  // Blue mountains, then green hills with far castles
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
  hills(0.12, C.mountain, 70, 30, 4);
  const cCount = 6;
  const cSpacing = ((WORLD_W / G) * 0.25) / cCount;
  const caOff = Math.round(camAX * 0.25);
  hills(0.25, C.hillFar, 40, 14, 5);
  for (let i = Math.floor((caOff - 40) / cSpacing); i * cSpacing - caOff < bw + 40; i++) {
    const k = ((i % cCount) + cCount) % cCount;
    if (hash(k + 41) < 0.5) continue;
    const x = Math.round(i * cSpacing - caOff + hash(k) * cSpacing * 0.5);
    ctx.drawImage(farCastle(k), x, groundY - 14 - 34 - 26 + 18);
  }
  hills(0.4, C.hillNear, 26, 4, 8);

  // Village: cottages and windmills, then the treeline in front
  const vCount = 16;
  const vSpacing = ((WORLD_W / G) * 0.5) / vCount;
  const vOff = Math.round(camAX * 0.5);
  for (let i = Math.floor((vOff - 40) / vSpacing); i * vSpacing - vOff < bw + 40; i++) {
    const k = ((i % vCount) + vCount) % vCount;
    const x = Math.round(i * vSpacing - vOff + hash(k + 5) * vSpacing * 0.4);
    if (hash(k + 61) < 0.25) windmill(ctx, x + 10, groundY - 4, t + k);
    else if (hash(k + 61) < 0.75) ctx.drawImage(cottage(k), x, groundY - 22);
  }
  const count = 64;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    if (hash(k + 90) < 0.35) continue;
    const img = treeSprite(k);
    ctx.drawImage(img, Math.round(i * spacing - jOff + hash(k) * spacing * 0.6) - 15, groundY - img.height + 2);
  }
}

// Timber scaffolding and ropes around a building going up.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = C.woodDark;
  for (let sx = x + 1; sx < x + w; sx += 7) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(x, sy, w, 1);
  ctx.fillStyle = C.woodLight;
  for (let i = 0; i < Math.min(w, h); i += 2) ctx.fillRect(x + i, y + i, 1, 1);
  ctx.fillStyle = '#d8cdb0';
  ctx.fillRect(x + Math.floor(w / 2), y - 4, 1, 4);
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  const t = team(b.faction);
  if (b.type === 'hq') {
    // Royal standard on the keep
    rect(ctx, x + 33, y + (tick % 2), 6, 3, t.main);
    rect(ctx, x + 33, y + (tick % 2), 6, 1, t.light);
  } else if (b.type === 'mine') {
    // Bucket going up and down the well
    const k = (Math.sin(ms / 700) + 1) / 2;
    const by = y + 14 + Math.round(k * 6);
    rect(ctx, x + 16, y + 13, 1, by - (y + 13), '#d8cdb0');
    rect(ctx, x + 14, by, 5, 3, C.O);
    rect(ctx, x + 15, by, 3, 2, C.wood);
  } else if (b.type === 'workshop') {
    // Hoisted stone swaying on the crane
    const sw = Math.round(Math.sin(ms / 600));
    rect(ctx, x + 44 + sw, y + 13, 1, 1, '#d8cdb0');
  } else if (b.type === 'airbase') {
    if (tick % 10 < 5) rect(ctx, x + 47, y + 1, 2, 2, C.feather);
  } else if (b.type === 'turret') {
    // Archer bobbing behind the battlements
    if (tick % 6 < 3) rect(ctx, x + 13, y - 1, 4, 1, C.metal);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  if (p.kind === 'bullet') {
    // Arrow
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.white);
    rect(ctx, x - dx, y - dy, 1, 1, C.woodLight);
    rect(ctx, x, y, 2, 1, C.metalLight);
  } else if (p.kind === 'bomb') {
    // Dragon fireball
    const fl = Math.floor(performance.now() / 80) % 2;
    rect(ctx, x - 1, y - 2 - fl, 3, 4 + fl, C.fire);
    rect(ctx, x, y - 1, 1, 2, C.yellow);
  } else {
    // Boulder (catapult shot or trebuchet stone)
    const big = p.kind === 'lob';
    rect(ctx, x - dx, y - dy, 1, 1, 'rgba(160,150,130,0.6)');
    rect(ctx, x - 1, y - 1, big ? 4 : 3, big ? 4 : 3, C.O);
    rect(ctx, x - 1, y - 1, big ? 3 : 2, big ? 3 : 2, C.stone);
    rect(ctx, x - 1, y - 1, 1, 1, C.stoneLight);
  }
}

// The fallen; plague carriers stay sickly green.
function corpseKey(e) { return e.type === 'scout' ? 'plague' : ''; }
function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(14, 6);
  const skin = e.type === 'scout' ? C.sick : C.skin;
  const body = e.type === 'heavy' ? C.metal : e.type === 'scout' ? C.robe : t.main;
  outlined(g, [[1, 2, 3, 3, skin], [4, 2, 7, 3, body], [11, 3, 2, 2, C.boot]], [[5, 3, 2, 1, t.light]]);
  if (e.type === 'scout') { g.fillStyle = '#9ad04a'; g.fillRect(6, 0, 1, 1); g.fillRect(9, 1, 1, 1); }
  return { c, ax: 7, ay: 5 };
}

export default {
  id: 'medieval',
  name: 'Medieval',
  palette,
  teamBase: TABARD,
  roofBase: [0.55, 0.32, 0.22],
  soldier: buildSoldier,
  vehicle: { jeep: buildHorseman, tank: buildCatapult, artillery: buildTrebuchet },
  aircraft: { helicopter: buildGriffin, bomber: buildDragon },
  buildings: BUILD,
  drawTile,
  surface,
  background,
  skyTop: palette.sky[0],
  rotor,
  construction,
  animate,
  projectile,
  explosion: { rim: '#8a7a62', body: '#c8b48c', core: palette.fire, smoke: '#7a6e5c', smoke2: '#a4987e' },
  corpse,
  corpseKey,
  debris: { '#7a4a24': '#8e6236', '#5c361a': '#9e978a' },
  minimap: { sky: '#7aa6d0', ground: '#8a5e36', platform: '#9e978a', bridge: '#b4844e', ramp: '#9e978a', surface: '#5aa83a' },
  names: {
    soldier: 'Man-at-Arms', heavy: 'Knight', scout: 'Plague Carrier', engineer: 'Peasant', sniper: 'Longbow',
    jeep: 'Horseman', tank: 'Catapult', artillery: 'Trebuchet', helicopter: 'Griffin', bomber: 'Dragon',
    hq: 'Castle', barracks: 'Barracks', turret: 'Tower', wall: 'Wall', mine: 'Well', workshop: 'Siege Works',
    airbase: 'Aerie', bridge: 'Bridge', ramp: 'Steps',
  },
  // Units are shown with their own sprites in menus.
  spriteIcons: true,
  icons: { barracks: '⚔️', turret: '🏹', wall: '🧱', mine: '🪣', workshop: '🔨', airbase: '🐉', bridge: '🌉', ramp: '🪜' },
};
