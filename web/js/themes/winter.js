// Winter War: Finland, 1939–40. Ski troops in white snowsuits melt in and out
// of the spruce forest at minus forty, under the northern lights. Motti
// tactics, Molotov cocktails, captured tanks, and a sauna behind every line.
// Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#121620',                        // outline
  skin: '#f0c8a8', skinDark: '#c8967a', hair: '#d8b878',
  boot: '#2a2420', gun: '#2e3034', gunLight: '#5a5e66', gunDark: '#1e2024',
  yellow: '#f2d66a', yellowDark: '#b8962a', red: '#c83a2a', redDark: '#7a1e16', white: '#f4f8fc',
  sky: ['#0c1428', '#111c36', '#182644', '#203252', '#2c4062', '#3a5072', '#4c6284'],
  suit: '#e6ecf2', suitShade: '#b4c2d2', fur: '#6a5240', furLight: '#8e7258',
  wood: '#7a5a3a', woodLight: '#a07a50', woodDark: '#4e3824', birch: '#e8e4dc', birchDark: '#2a2622',
  snow: '#eef4fa', snowShade: '#c4d4e6', snowDeep: '#9ab0ca', ice: '#a8d0e8', iceLight: '#d0eaf6',
  granite: '#7e8088', graniteLight: '#a4a6ae', graniteDark: '#55575e',
  spruce: '#22402e', spruceLight: '#356048', olive: '#5a6448', oliveDark: '#3c4430', oliveLight: '#7a8462',
  reindeer: '#7a5a42', reindeerLight: '#a08060', bottle: '#4e8a5a',
  dirt: '#4a4440', dirtMid: '#3c3634', dirtDeep: '#2c2826', pebble: '#7a7672', pebbleDark: '#22201e',
  fire: '#f28a30', glass: '#ffd27a', smoke: '#c8ccd4', aurora: '#5af0a8', auroraLight: '#a8ffd8',
  shadow: 'rgba(0,0,0,0.3)',
};
const GREATCOAT = [0.36, 0.38, 0.32];

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
    // Tank hunter: greatcoat, fur hat, satchel charge, a lit Molotov cocktail held high
    parts = [
      ...legs.map((l) => [...l, t.uniDark]), ...boots.map((b) => [...b, C.boot]),
      [2, 7, 3, 5, C.woodDark], [4, 7, 9, 5, t.uni], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, C.fur],
      [12, 3, 2, 5, t.uni], [13, 1, 2, 3, C.bottle],
    ];
    details = [
      [5, 1, 8, 1, C.furLight], [5, 4, 1, 2, C.fur], [8, 2, 2, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [4, 10, 9, 1, C.boot], [12, 6, 2, 1, t.main], [13, 0, 2, 1, C.fire], [14, 0, 1, 1, C.yellow], [2, 8, 3, 1, C.wood],
      [13, 2, 1, 1, '#8ac898'],
    ];
  } else if (type === 'scout') {
    // Ski patrol: fur hat, greatcoat, ski poles, long wooden skis
    parts = [
      ...legs.map((l) => [...l, t.uniDark]), ...boots.map((b) => [...b, C.boot]),
      [0, 16, 19, 1, C.woodLight], [5, 8, 7, 4, t.uni], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, C.fur],
      [13, 6, 1, 10, C.woodDark], [3, 7, 1, 9, C.woodDark],
    ];
    details = [
      [5, 1, 8, 1, C.furLight], [5, 4, 1, 2, C.fur], [8, 2, 2, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [5, 10, 7, 1, C.boot], [11, 8, 2, 1, t.main], [18, 15, 1, 1, C.woodLight],
    ];
  } else if (type === 'engineer') {
    // Sapper: a log for jamming tank tracks on the back, an axe on the shoulder
    parts = [
      ...legs.map((l) => [...l, t.uniDark]), ...boots.map((b) => [...b, C.boot]),
      [1, 7, 5, 4, C.birch], [5, 8, 7, 4, t.uni], [6, 3, 6, 5, C.skin], [6, 1, 6, 3, C.fur],
      [11, 4, 1, 8, C.woodLight], [12, 3, 3, 3, C.gunLight],
    ];
    details = [
      [6, 1, 6, 1, C.furLight], [8, 2, 2, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [2, 8, 1, 1, C.birchDark], [4, 9, 1, 1, C.birchDark], [1, 7, 1, 4, C.woodLight], [5, 10, 7, 1, C.boot],
      [6, 9, 2, 1, t.main], [14, 3, 1, 3, C.white],
    ];
  } else if (type === 'sniper') {
    // The White Death: snowsuit, hood, scarf over the face, iron-sighted rifle
    parts = [
      ...legs.map((l) => [...l, C.suit]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.suit], [6, 2, 6, 6, C.suit], [9, 9, 10, 1, C.wood], [12, 8, 7, 1, C.gun],
    ];
    details = [
      [6, 2, 6, 1, C.white], [8, 4, 4, 1, C.skin], [10, 4, 1, 1, C.O], [7, 5, 5, 2, C.suitShade],
      [5, 10, 7, 1, t.main], [5, 8, 1, 4, C.suitShade], [18, 7, 1, 1, C.gun], [12, 13, 2, 2, C.suitShade],
    ];
  } else {
    // Ski trooper: hooded white snowsuit, Suomi submachine gun with a drum
    parts = [
      ...legs.map((l) => [...l, C.suit]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.suit], [6, 2, 6, 6, C.suit], [10, 9, 7, 1, C.gun], [11, 10, 3, 3, C.gun],
    ];
    details = [
      [6, 2, 6, 1, C.white], [8, 4, 4, 3, C.skin], [10, 5, 1, 1, C.O], [8, 7, 4, 1, C.suitShade],
      [5, 10, 7, 1, t.main], [7, 3, 5, 1, t.main], [5, 8, 1, 4, C.suitShade], [12, 11, 1, 1, C.gunLight], [16, 9, 1, 1, C.O],
    ];
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── Vehicles ───────────────────────────────────────────────────────────────
// Reindeer sled: a reindeer hauling a pulka with a machine gunner aboard.
function buildSled(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 17);
  const legs = frame
    ? [[18, 10, 1, 5], [20, 10, 1, 4], [24, 10, 1, 4], [26, 10, 1, 5]]
    : [[17, 10, 1, 4], [20, 10, 1, 5], [23, 10, 1, 5], [26, 10, 1, 4]];
  outlined(g, [
    ...legs.map((l) => [...l, C.reindeerLight]),
    [17, 5, 10, 6, C.reindeer], [25, 2, 3, 5, C.reindeer], [26, 1, 4, 3, C.reindeer],
    [1, 10, 15, 3, C.wood], [0, 14, 17, 1, C.woodDark], [16, 12, 1, 2, C.woodDark],
    [5, 5, 5, 6, C.suit], [6, 1, 4, 4, C.suit], [9, 6, 8, 1, C.gun], [3, 1, 1, 9, C.woodDark],
  ], [
    [18, 9, 8, 1, C.reindeerLight], [27, 2, 1, 1, C.O], [29, 2, 1, 1, '#2a1a14'], [19, 5, 5, 2, t.main], [19, 7, 5, 1, t.dark],
    [1, 10, 15, 1, C.woodLight], [7, 2, 2, 2, C.skin], [5, 9, 5, 1, t.main], [16, 7, 2, 1, C.woodDark],
    [0, 1, 3, 3, t.main], [0, 1, 3, 1, t.light], [12, 7, 2, 1, C.gunLight],
  ]);
  // Antlers
  g.fillStyle = C.reindeerLight;
  g.fillRect(25, 0, 1, 1); g.fillRect(27, 0, 1, 1); g.fillRect(24, 0, 1, 2);
  return { c, ax: 14, ay: 16 };
}

// Trophy tank: a captured T-26, whitewashed, in its new team's colours, with a
// stovepipe fitted for the cold.
function buildTank(f, frame) {
  const t = team(f);
  const [c, g] = canvas(38, 22);
  outlined(g, [
    [2, 15, 32, 5, C.gunDark], [3, 9, 30, 6, C.olive], [11, 4, 13, 6, C.olive], [24, 6, 12, 2, C.gun],
    [5, 3, 2, 6, C.gunLight],
  ], [
    [3, 9, 30, 1, C.oliveLight], [11, 4, 13, 1, C.oliveLight], [4, 12, 28, 1, t.main], [15, 6, 4, 2, t.main],
    [16, 6, 2, 1, C.white], [6, 10, 3, 1, C.snow], [20, 10, 4, 1, C.snow], [27, 11, 3, 1, C.snow], [13, 5, 2, 1, C.snow],
    [5, 3, 2, 1, C.gun], [35, 6, 1, 2, C.O],
  ]);
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 5;
    g.fillStyle = C.gunLight; g.fillRect(x, 16, 3, 3);
    g.fillStyle = C.gunDark; g.fillRect(x + (frame ? 1 : 2), 17, 1, 1);
  }
  g.fillStyle = C.snow; g.fillRect(2, 19, 32, 1);
  return { c, ax: 18, ay: 21 };
}

// Motti mortar: a mortar on a ski sledge, with a "motti" of firewood stacked behind.
function buildMortar(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 19);
  outlined(g, [
    [0, 16, 28, 1, C.woodDark], [27, 14, 1, 2, C.woodDark], [2, 12, 24, 3, C.wood],
    [2, 5, 9, 7, C.woodDark], [12, 10, 9, 2, C.gun], [14, 7, 3, 4, C.gunLight], [16, 4, 3, 4, C.gunLight], [18, 1, 3, 4, C.gunLight],
    [21, 6, 1, 5, C.gun], [24, 2, 1, 10, C.woodDark],
  ], [
    [2, 12, 24, 1, C.woodLight], [2, 5, 9, 1, C.snow], [18, 1, 3, 1, C.O], [15, 8, 1, 2, C.white], [17, 5, 1, 2, C.white],
    [25, 2, 4, 3, t.main], [25, 2, 4, 1, t.light], [12, 13, 9, 1, t.main],
  ]);
  // A "motti" of firewood: stacked log ends
  for (const [x, y] of [[3, 6], [6, 6], [3, 9], [6, 9], [9, 7]]) {
    if (x + 2 > 11) continue;
    g.fillStyle = C.woodLight; g.fillRect(x, y, 2, 2);
    g.fillStyle = C.hair; g.fillRect(x, y, 1, 1);
  }
  if (frame) { g.fillStyle = C.snowShade; g.fillRect(0, 15, 1, 1); g.fillRect(2, 14, 1, 1); }
  return { c, ax: 14, ay: 18 };
}

// Fokker D.XXI on skis: the propeller spins live.
function buildFokker(f) {
  const t = team(f);
  const [c, g] = canvas(34, 16);
  outlined(g, [
    [6, 6, 22, 4, C.olive], [26, 5, 4, 6, C.gun], [2, 2, 5, 6, C.olive], [1, 7, 7, 2, C.olive],
    [12, 9, 11, 2, C.oliveDark], [16, 4, 5, 2, C.ice], [13, 11, 1, 3, C.gun], [22, 11, 1, 3, C.gun],
    [10, 14, 7, 1, C.woodLight], [19, 14, 6, 1, C.woodLight],
  ], [
    [6, 6, 22, 1, C.oliveLight], [11, 6, 4, 4, C.white], [12, 7, 2, 2, t.main], [2, 2, 2, 6, t.main],
    [16, 4, 5, 1, C.iceLight], [26, 5, 4, 1, C.gunLight], [6, 9, 20, 1, C.snowShade],
  ]);
  return { c, ax: 17, ay: 13 };
}

// Bristol Blenheim on skis, glazed nose, dorsal turret.
function buildBlenheim(f) {
  const t = team(f);
  const [c, g] = canvas(48, 20);
  outlined(g, [
    [4, 6, 36, 6, C.olive], [39, 6, 6, 5, C.ice], [2, 1, 5, 6, C.olive], [1, 8, 8, 2, C.olive],
    [22, 3, 5, 3, C.ice], [16, 11, 18, 2, C.oliveDark], [24, 8, 9, 5, C.gun],
    [20, 13, 1, 4, C.gun], [30, 13, 1, 4, C.gun], [17, 17, 16, 1, C.woodLight],
  ], [
    [4, 6, 36, 1, C.oliveLight], [12, 7, 4, 4, C.white], [13, 8, 2, 2, t.main], [2, 1, 2, 6, t.main],
    [41, 6, 1, 5, C.O], [43, 7, 1, 3, C.iceLight], [23, 3, 3, 1, C.iceLight], [24, 8, 9, 1, C.gunLight],
    [4, 11, 35, 1, C.snowShade], [36, 7, 2, 1, t.main],
  ]);
  return { c, ax: 24, ay: 15 };
}

// Spinning propellers.
function rotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 50);
  const s = u.facing;
  const blade = (px, py) => {
    if (tick % 2) rect(ctx, px, py - 4, 1, 9, C.smoke);
    else { rect(ctx, px, py - 1, 1, 3, C.smoke); rect(ctx, px, py - 4, 1, 1, C.gunLight); rect(ctx, px, py + 4, 1, 1, C.gunLight); }
  };
  if (u.type === 'helicopter') blade(s > 0 ? x + 13 : x - 14, y - 5);
  else blade(s > 0 ? x + 9 : x - 10, y - 4);
}

// ── Buildings ──────────────────────────────────────────────────────────────
// Horizontal log wall with knotted round ends.
function logs(g, x, y, w, h) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  for (let yy = y; yy < y + h; yy += 3) {
    g.fillStyle = C.wood; g.fillRect(x, yy, w, Math.min(3, y + h - yy));
    g.fillStyle = C.woodLight; g.fillRect(x, yy, w, 1);
    g.fillStyle = C.woodDark; if (yy + 2 < y + h) g.fillRect(x, yy + 2, w, 1);
    g.fillStyle = C.woodLight; g.fillRect(x - 1, yy, 2, 2); g.fillRect(x + w - 1, yy, 2, 2);
  }
}

// Gable roof buried under a thick, rounded blanket of snow, with icicles.
function snowRoof(g, cx, y, w, h) {
  const halfAt = (i) => Math.round(((i + 1) / h) * (w / 2));
  g.fillStyle = C.O;
  for (let i = 0; i < h; i++) g.fillRect(cx - halfAt(i) - 1, y + i - 1, halfAt(i) * 2 + 2, 2);
  for (let i = 0; i < h; i++) {
    const half = halfAt(i);
    g.fillStyle = i < 2 ? C.white : C.snow; g.fillRect(cx - half, y + i, half * 2, 1);
    g.fillStyle = C.snowShade; g.fillRect(cx - half, y + i, 1, 1); g.fillRect(cx + half - 1, y + i, 1, 1);
  }
  const half = Math.round(w / 2);
  g.fillStyle = C.O; g.fillRect(cx - half - 1, y + h, half * 2 + 2, 3);
  g.fillStyle = C.woodDark; g.fillRect(cx - half, y + h, half * 2, 2);
  g.fillStyle = C.iceLight;
  for (let x = cx - half + 2; x < cx + half - 1; x += 5) g.fillRect(x, y + h + 2, 1, 1 + (x % 3));
}

function stovepipe(g, x, y, h) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 4, h + 1);
  g.fillStyle = C.gun; g.fillRect(x, y, 2, h);
  g.fillStyle = C.gunLight; g.fillRect(x, y, 1, h);
  g.fillStyle = C.O; g.fillRect(x - 2, y - 2, 6, 2);
}

function windowGlow(g, x, y, w, h) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = C.glass; g.fillRect(x, y, w, h);
  g.fillStyle = C.fire; g.fillRect(x, y + h - 1, w, 1);
  g.fillStyle = C.woodDark; g.fillRect(x + Math.floor(w / 2), y, 1, h);
  g.fillStyle = C.snow; g.fillRect(x - 1, y - 2, w + 2, 1);
}

function flag(g, x, y, h, t) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 3, h + 1);
  g.fillStyle = C.birch; g.fillRect(x, y, 1, h);
  g.fillStyle = C.O; g.fillRect(x + 1, y - 1, 9, 7);
  g.fillStyle = t.main; g.fillRect(x + 1, y, 8, 5);
  g.fillStyle = C.white; g.fillRect(x + 1, y + 2, 8, 1); g.fillRect(x + 3, y, 1, 5);
}

function snowbank(g, x, y, w, h) {
  g.fillStyle = C.O; g.fillRect(x + 1, y - 1, w - 2, 1); g.fillRect(x, y, w, h);
  g.fillStyle = C.snow; g.fillRect(x + 1, y, w - 2, h);
  g.fillStyle = C.white; g.fillRect(x + 2, y, w - 4, 1);
  g.fillStyle = C.snowShade; g.fillRect(x + 1, y + h - 2, w - 2, 2);
}

function rock(g, cx, cy, r, t) {
  disc(g, cx, cy, r + 1, C.O);
  disc(g, cx, cy, r, C.granite);
  disc(g, cx - 1, cy - 1, Math.max(1, r - 2), C.graniteLight);
  disc(g, cx, cy, Math.max(1, r - 3), C.granite);
  g.fillStyle = C.graniteDark; g.fillRect(cx - r + 1, cy + r - 2, r * 2 - 2, 2);
  g.fillStyle = C.snow; g.fillRect(cx - r + 2, cy - r, r * 2 - 4, 2);
  g.fillStyle = C.white; g.fillRect(cx - r + 3, cy - r, r * 2 - 6, 1);
  if (t) { g.fillStyle = t.main; g.fillRect(cx - 2, cy + 1, 4, 2); }
}

const BUILD = {
  hq(g, t) {
    // Korsu: a big log command post, roof deep in snow, radio mast, warm windows
    logs(g, 6, 24, 52, 18);
    snowRoof(g, 32, 6, 60, 16);
    windowGlow(g, 11, 29, 7, 5);
    windowGlow(g, 46, 29, 7, 5);
    outlined(g, [[27, 30, 10, 12, C.woodDark]], [[27, 30, 10, 1, C.wood], [32, 30, 1, 12, C.O], [35, 36, 1, 1, C.yellow]]);
    stovepipe(g, 44, 4, 10);
    g.fillStyle = C.O; g.fillRect(60, 0, 1, 26);
    g.fillStyle = C.gunLight; g.fillRect(58, 0, 5, 1); g.fillRect(59, 3, 3, 1);
    g.fillStyle = C.O; for (let i = 0; i < 12; i++) g.fillRect(48 + i, 12 + Math.round(i * 0.4), 1, 1);
    flag(g, 2, 8, 34, t);
    snowbank(g, 0, 42, 64, 6);
    disc(g, 32, 17, 3, C.O); disc(g, 32, 17, 2, t.main); g.fillStyle = C.white; g.fillRect(32, 15, 1, 5); g.fillRect(30, 17, 5, 1);
  },
  barracks(g, t) {
    // Sauna: a little log hut puffing löyly from the chimney and the door,
    // a birch whisk on the wall, a water bucket
    logs(g, 6, 16, 34, 14);
    snowRoof(g, 23, 4, 42, 11);
    stovepipe(g, 32, 2, 8);
    outlined(g, [[18, 18, 8, 12, C.woodDark]], [[18, 18, 8, 1, C.wood], [24, 24, 1, 1, C.yellow]]);
    g.fillStyle = C.glass; g.fillRect(19, 19, 1, 11);
    windowGlow(g, 31, 21, 4, 3);
    // Vihta: a bundle of birch twigs
    g.fillStyle = C.O; g.fillRect(9, 19, 5, 7);
    g.fillStyle = '#5a8a4a'; g.fillRect(10, 21, 3, 4);
    g.fillStyle = '#86b46a'; g.fillRect(10, 22, 1, 2); g.fillRect(12, 21, 1, 1);
    g.fillStyle = C.woodLight; g.fillRect(11, 19, 1, 2);
    // Bucket and ladle
    outlined(g, [[42, 25, 5, 5, C.woodLight]], [[42, 27, 5, 1, C.woodDark], [45, 22, 1, 3, C.woodDark]]);
    snowbank(g, 0, 29, 48, 3);
    g.fillStyle = t.main; g.fillRect(19, 15, 6, 2); g.fillStyle = C.white; g.fillRect(21, 15, 2, 2);
  },
  turret(g, t) {
    // Maxim nest: a log-and-earth bunker under snow with a water-cooled gun
    snowbank(g, 0, 20, 32, 12);
    logs(g, 4, 11, 22, 10);
    g.fillStyle = C.O; g.fillRect(6, 15, 18, 3);
    g.fillStyle = '#0a0c10'; g.fillRect(7, 16, 16, 1);
    outlined(g, [[16, 14, 10, 4, C.oliveDark], [26, 15, 5, 2, C.gun]], [[16, 14, 10, 1, C.olive], [18, 15, 1, 1, C.oliveLight], [21, 15, 1, 1, C.oliveLight], [30, 15, 1, 1, C.O]]);
    g.fillStyle = C.O; g.fillRect(3, 7, 25, 4);
    g.fillStyle = C.snow; g.fillRect(4, 7, 23, 3);
    g.fillStyle = C.white; g.fillRect(6, 7, 18, 1);
    g.fillStyle = t.main; g.fillRect(8, 22, 4, 2);
  },
  wall(g, t) {
    // Granite anti-tank rocks, stacked and snow-capped
    rock(g, 8, 25, 7);
    rock(g, 8, 14, 6, t);
    rock(g, 8, 5, 4);
    g.fillStyle = C.snowShade; g.fillRect(0, 30, 16, 2);
  },
  mine(g, t) {
    // Soup cannon: the field kitchen, a wheeled cauldron with a gun-barrel chimney
    outlined(g, [[3, 13, 22, 11, C.olive], [5, 10, 18, 3, C.oliveDark], [21, 2, 3, 9, C.gun], [25, 18, 5, 2, C.woodDark]], [
      [3, 13, 22, 1, C.oliveLight], [3, 22, 22, 1, C.oliveDark], [5, 10, 18, 1, C.oliveLight], [21, 2, 3, 1, C.O],
      [5, 17, 6, 2, t.main], [14, 15, 3, 3, C.fire], [15, 16, 1, 1, C.yellow],
    ]);
    for (const x of [8, 20]) { disc(g, x, 26, 4, C.O); disc(g, x, 26, 3, C.woodDark); disc(g, x, 26, 1, C.woodLight); }
    // Ladle hooked on the side and the coffee pot keeping warm
    g.fillStyle = C.O; g.fillRect(1, 11, 1, 6); g.fillRect(0, 16, 3, 2);
    outlined(g, [[26, 9, 4, 5, C.gunLight]], [[29, 10, 1, 1, C.O], [26, 9, 4, 1, C.white]]);
    snowbank(g, 0, 29, 32, 3);
  },
  workshop(g, t) {
    // Trophy yard: open log shed, a captured turret on blocks, a hoist, and a
    // proud tally of tanks taken painted on the wall
    outlined(g, [[3, 12, 3, 18, C.woodDark], [42, 12, 3, 18, C.woodDark]], []);
    snowRoof(g, 24, 2, 48, 9);
    logs(g, 6, 13, 36, 6);
    g.fillStyle = C.white;
    for (let i = 0; i < 9; i++) g.fillRect(8 + i * 2 + (i >= 5 ? 1 : 0), 14, 1, 4);
    g.fillRect(8, 16, 10, 1);
    outlined(g, [[16, 22, 14, 6, C.olive], [29, 24, 9, 2, C.gun], [14, 28, 18, 3, C.woodLight]], [
      [16, 22, 14, 1, C.oliveLight], [21, 24, 4, 2, t.main], [22, 24, 2, 1, C.white],
    ]);
    g.fillStyle = C.O; g.fillRect(23, 11, 1, 11);
    g.fillStyle = C.gunLight; g.fillRect(22, 20, 3, 2);
    snowbank(g, 0, 30, 48, 2);
    flag(g, 44, 4, 8, t);
  },
  airbase(g, t) {
    // Ice airfield: a camouflaged hangar tent on a frozen lake, fuel drums, windsock
    g.fillStyle = C.O; g.fillRect(0, 25, 64, 7);
    g.fillStyle = C.ice; g.fillRect(0, 26, 64, 6);
    g.fillStyle = C.iceLight; g.fillRect(0, 26, 64, 1); g.fillRect(10, 28, 7, 1); g.fillRect(36, 30, 9, 1);
    g.fillStyle = '#7aa8c8'; g.fillRect(24, 29, 1, 2); g.fillRect(25, 28, 3, 1); g.fillRect(50, 27, 1, 3);
    for (let i = 0; i < 16; i++) {
      const half = Math.round(4 + i * 1.1);
      g.fillStyle = C.O; g.fillRect(20 - half - 1, 9 + i, half * 2 + 2, 1);
      g.fillStyle = i % 4 === 0 ? C.snowShade : C.snow; g.fillRect(20 - half, 9 + i, half * 2, 1);
    }
    g.fillStyle = '#0a0c10'; g.fillRect(14, 16, 12, 9);
    for (const [x, y] of [[8, 14], [27, 12], [31, 20], [12, 21]]) {
      g.fillStyle = C.spruce; g.fillRect(x, y, 3, 2); g.fillStyle = C.spruceLight; g.fillRect(x + 1, y, 1, 1);
    }
    for (const x of [40, 45]) outlined(g, [[x, 19, 4, 6, C.oliveDark]], [[x, 20, 4, 1, C.olive], [x, 23, 4, 1, C.olive], [x, 19, 4, 1, C.snow]]);
    g.fillStyle = C.O; g.fillRect(56, 2, 2, 24);
    g.fillStyle = C.birch; g.fillRect(56, 3, 1, 23);
    g.fillStyle = C.O; g.fillRect(57, 2, 7, 5);
    g.fillStyle = t.main; g.fillRect(58, 3, 2, 3); g.fillStyle = C.white; g.fillRect(60, 3, 2, 3); g.fillStyle = t.main; g.fillRect(62, 3, 2, 3);
  },
  bridge(g, t) {
    // Log bridge under fresh snow
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 7);
    g.fillStyle = C.wood; g.fillRect(0, 2, 16, 4);
    g.fillStyle = C.woodDark; for (let x = 3; x < 16; x += 4) g.fillRect(x, 2, 1, 4);
    g.fillStyle = C.snow; g.fillRect(0, 0, 16, 2);
    g.fillStyle = C.white; g.fillRect(1, 0, 14, 1);
    g.fillStyle = t.main; g.fillRect(6, 4, 2, 1);
  },
  ramp(g, t) {
    // Ski jump: packed snow with ski tracks between log rails
    g.fillStyle = C.snow; g.fillRect(0, 0, 16, 16);
    g.fillStyle = C.snowShade; for (let y = 3; y < 16; y += 4) g.fillRect(2, y, 12, 1);
    g.fillStyle = C.white; g.fillRect(5, 0, 1, 16); g.fillRect(10, 0, 1, 16);
    g.fillStyle = C.woodDark; g.fillRect(0, 0, 2, 16); g.fillRect(14, 0, 2, 16);
    g.fillStyle = C.woodLight; g.fillRect(0, 0, 1, 16); g.fillRect(14, 0, 1, 16);
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
    // Frozen earth with frost and buried granite
    g.fillStyle = kind === 'dirtDeep' ? C.dirtDeep : kind === 'dirtMid' ? C.dirtMid : C.dirt;
    g.fillRect(0, 0, T, T);
    speckle(6, C.pebble, C.pebbleDark, kind === 'dirtTop' ? 6 : 0);
    if (kind !== 'dirtTop' && hash(seed + 33) < 0.12) {
      const bx = 2 + Math.floor(hash(seed + 34) * 8);
      g.fillStyle = C.graniteDark; g.fillRect(bx + 1, 6, 4, 1); g.fillRect(bx, 7, 6, 2); g.fillRect(bx + 1, 9, 4, 1);
      g.fillStyle = C.granite; g.fillRect(bx + 1, 7, 3, 1);
    }
    if (kind === 'dirtTop') {
      g.fillStyle = C.snow; g.fillRect(0, 0, T, 5);
      g.fillStyle = C.white; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.snowShade; g.fillRect(0, 4, T, 1);
      for (let x = 0; x < T; x += 3) if (hash(seed + x) < 0.6) g.fillRect(x, 5, 2, 1);
      g.fillStyle = C.iceLight;
      if (hash(seed + 9) < 0.5) g.fillRect(Math.floor(hash(seed + 10) * 14), 2, 1, 1);
    }
  } else {
    // Snow-capped granite ledge
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.granite; g.fillRect(0, 0, T, T);
    g.fillStyle = C.graniteDark;
    for (let i = 0; i < 4; i++) g.fillRect(Math.floor(hash(seed + i) * 12), 7 + Math.floor(hash(seed + i + 9) * 7), 3 + (i % 2), 1);
    g.fillStyle = C.graniteLight;
    for (let i = 0; i < 4; i++) g.fillRect(Math.floor(hash(seed + i + 3) * 13), 6 + Math.floor(hash(seed + i + 5) * 8), 2, 1);
    g.fillStyle = C.snow; g.fillRect(0, 0, T, 4);
    g.fillStyle = C.white; g.fillRect(0, 0, T, 1);
    g.fillStyle = C.snowShade; g.fillRect(0, 4, T, 1);
    g.fillStyle = C.iceLight; for (let x = 1; x < T; x += 6) g.fillRect(x + (variant % 3), 5, 1, 1 + (x % 2));
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Snow drifts, dead grass poking through and the odd little spruce sapling.
function surface(ctx, x, y, ground, h) {
  ctx.fillStyle = C.snowShade;
  ctx.fillRect(x + Math.floor(h * 12), y - 1, 3, 1);
  if (!ground) return;
  if (h > 0.9) {
    ctx.fillStyle = C.spruce; ctx.fillRect(x + 7, y - 4, 1, 1); ctx.fillRect(x + 6, y - 3, 3, 1); ctx.fillRect(x + 5, y - 2, 5, 1);
    ctx.fillStyle = C.snow; ctx.fillRect(x + 7, y - 4, 1, 1); ctx.fillRect(x + 6, y - 2, 1, 1);
    ctx.fillStyle = C.woodDark; ctx.fillRect(x + 7, y - 1, 1, 1);
  } else if (h > 0.7) {
    ctx.fillStyle = '#a8946a'; ctx.fillRect(x + 3, y - 2, 1, 2); ctx.fillRect(x + 5, y - 3, 1, 3);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};

function spruce(g, cx, base, h, col, snowy) {
  for (let i = 0; i < h; i++) {
    const half = Math.max(0, Math.round((i / h) * h * 0.32 + ((i % 4) === 3 ? -1 : 0)));
    g.fillStyle = col; g.fillRect(cx - half, base - h + i, half * 2 + 1, 1);
    if (snowy && i % 5 === 1 && i > 2) {
      g.fillStyle = C.snow; g.fillRect(cx - half, base - h + i, Math.max(1, half - 1), 1); g.fillRect(cx + 2, base - h + i, Math.max(1, half - 2), 1);
      g.fillStyle = C.snowShade; g.fillRect(cx - half + 1, base - h + i + 1, Math.max(1, half - 3), 1);
    }
  }
  g.fillStyle = '#1a1410'; g.fillRect(cx, base, 1, 3);
}

// Far ridge of dark spruce forest.
function farForest(k) {
  const key = `far${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(40, 46);
  for (let i = 0; i < 5; i++) {
    const h = 18 + Math.floor(hash(k * 5 + i) * 24);
    spruce(g, 4 + i * 8 + Math.floor(hash(k + i) * 4), 43, h, '#1a2a3e', false);
  }
  scenery[key] = c;
  return c;
}

// Near trees: snow-laden spruces and birches, now and then a little sauna.
function nearTree(k) {
  const key = `near${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(34, 52);
  if (hash(k + 11) < 0.3) {
    // Birch: white trunk with black marks, bare branches
    g.fillStyle = C.birch; g.fillRect(16, 10, 2, 42);
    g.fillStyle = C.birchDark;
    for (let y = 12; y < 50; y += 5) g.fillRect(16 + (y % 2), y, 1, 1);
    g.fillStyle = '#3a3430';
    g.fillRect(12, 18, 4, 1); g.fillRect(18, 14, 5, 1); g.fillRect(10, 16, 2, 2); g.fillRect(22, 11, 2, 3); g.fillRect(14, 8, 1, 3);
  } else {
    spruce(g, 17, 49, 40 + Math.floor(hash(k * 3) * 10), C.spruce, true);
  }
  scenery[key] = c;
  return c;
}

function cabin(ctx, x, base, t) {
  rect(ctx, x, base - 10, 18, 10, '#3a2a22');
  rect(ctx, x - 2, base - 15, 22, 5, C.snowShade);
  rect(ctx, x, base - 17, 18, 2, C.snow);
  rect(ctx, x + 4, base - 7, 3, 3, C.glass);
  rect(ctx, x + 13, base - 21, 2, 5, '#1a1410');
  const k = (t / 2.5) % 1;
  ctx.globalAlpha = 0.5 * (1 - k);
  rect(ctx, x + 13 + Math.round(Math.sin(k * 6) * 2), base - 24 - Math.round(k * 14), 3 + Math.round(k * 3), 2 + Math.round(k * 2), C.smoke);
  ctx.globalAlpha = 1;
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

  // Stars, a few twinkling
  for (let i = 0; i < 70; i++) {
    const sx = Math.floor(hash(i * 3 + 1) * bw);
    const sy = Math.floor(hash(i * 3 + 2) * Math.max(10, groundY - 60));
    if (i % 7 === 0 && Math.floor(t * 2 + i) % 3 === 0) continue;
    rect(ctx, sx, sy, 1, 1, i % 5 ? '#c8d4ec' : '#ffffff');
  }

  // Northern lights: slow green curtains waving across the sky
  const top = Math.max(6, groundY - 150);
  for (let x = 0; x < bw; x++) {
    const wx = x + camAX * 0.04;
    const y = top + Math.sin(wx * 0.025 + t * 0.4) * 10 + Math.sin(wx * 0.07 - t * 0.3) * 4;
    const len = 18 + Math.sin(wx * 0.05 + t * 0.7) * 10;
    const ray = 0.5 + 0.5 * Math.sin(wx * 0.5 + Math.sin(wx * 0.04 + t * 0.2) * 4 + t * 0.6);
    const a = (0.06 + 0.22 * ray) * (0.4 + 0.6 * Math.max(0, Math.sin(wx * 0.013 + t * 0.25)));
    const yy = Math.round(y);
    const seg = Math.max(2, Math.round(len / 3));
    for (let j = 0; j < 3; j++) {
      ctx.globalAlpha = a * (1 - j * 0.3);
      rect(ctx, x, yy + j * seg, 1, seg, j < 2 ? C.aurora : '#4ab0c8');
    }
    ctx.globalAlpha = Math.min(1, a * 1.6);
    rect(ctx, x, yy, 1, 1, C.auroraLight);
  }
  ctx.globalAlpha = 1;

  // Pale moon
  const mx = Math.round(bw * 0.78), my = Math.round(groundY - 120);
  const band = C.sky[Math.max(0, Math.min(bands - 1, Math.floor(((my - 2) * bands) / groundY)))];
  disc(ctx, mx, my, 9, '#dfe6f0');
  disc(ctx, mx + 3, my - 2, 8, band);

  // Rolling snowy hills under a dark forest
  const hOff = camAX * 0.12;
  for (let x = 0; x < bw; x++) {
    const wx = x + hOff;
    const h = 22 + Math.round(Math.sin(wx * 0.011) * 8 + Math.sin(wx * 0.031) * 4);
    rect(ctx, x, groundY - h, 1, h, '#9cb0c8');
    rect(ctx, x, groundY - h, 1, 1, '#c4d2e2');
  }
  const fCount = 12;
  const fSpacing = ((WORLD_W / G) * 0.25) / fCount;
  const fOff = Math.round(camAX * 0.25);
  for (let i = Math.floor((fOff - 50) / fSpacing); i * fSpacing - fOff < bw + 50; i++) {
    const k = ((i % fCount) + fCount) % fCount;
    const img = farForest(k);
    ctx.drawImage(img, Math.round(i * fSpacing - fOff), groundY - img.height + 2);
  }
  ctx.globalAlpha = 0.12; rect(ctx, 0, groundY - 16, bw, 16, '#c4d2e2'); ctx.globalAlpha = 1;

  // Near forest, with the odd sauna cabin smoking away
  const count = 40;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    const x = Math.round(i * spacing - jOff + hash(k) * spacing * 0.5);
    if (hash(k + 70) < 0.1) cabin(ctx, x - 9, groundY + 2, t + k);
    else if (hash(k + 70) < 0.85) { const img = nearTree(k); ctx.drawImage(img, x - 17, groundY - img.height + 4); }
  }
}

// Steady snowfall.
function weather(ctx, bw, bh, camAX, camAY) {
  const t = performance.now() / 1000;
  const n = Math.min(140, Math.floor((bw * bh) / 2500));
  for (let i = 0; i < n; i++) {
    const speed = 10 + hash(i * 5 + 1) * 16;
    const y = ((hash(i * 5 + 2) * (bh + 20) + t * speed + camAY * 0.3) % (bh + 20)) - 10;
    const sway = Math.sin(t * 0.9 + i) * 4;
    const x = Math.round((((hash(i * 5 + 3) * (bw + 40) + sway - t * 5 - camAX * 0.4) % (bw + 40)) + bw + 40) % (bw + 40)) - 20;
    ctx.fillStyle = i % 4 ? C.white : C.snowShade;
    ctx.fillRect(x, Math.round(y), i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
  }
}

// Log scaffolding dusted with snow.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = C.wood;
  for (let sx = x + 1; sx < x + w; sx += 7) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(x, sy, w, 1);
  ctx.fillStyle = C.snow;
  for (let sy = y + 3; sy < y + h; sy += 7) for (let sx = x + 2; sx < x + w; sx += 9) ctx.fillRect(sx, sy - 1, 3, 1);
}

function puff(ctx, x, y, ms, i, col = C.smoke) {
  const k = (ms / 1500 + i / 2) % 1;
  ctx.globalAlpha = 0.6 * (1 - k);
  rect(ctx, x + Math.round(Math.sin(k * 6 + i) * 2), y - Math.round(k * 12), 3 + Math.round(k * 2), 3 + Math.round(k * 2), col);
  ctx.globalAlpha = 1;
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  const t = team(b.faction);
  if (b.type === 'hq') {
    for (let i = 0; i < 2; i++) puff(ctx, x + 44, y + 2, ms, i);
  } else if (b.type === 'barracks') {
    // Löyly: steam pouring from the chimney and round the sauna door
    for (let i = 0; i < 2; i++) { puff(ctx, x + 32, y, ms, i, C.white); puff(ctx, x + 26, y + 20, ms + 700, i, C.white); }
  } else if (b.type === 'mine') {
    for (let i = 0; i < 2; i++) { puff(ctx, x + 21, y, ms, i); puff(ctx, x + 27, y + 7, ms + 500, i, C.white); }
    if (tick % 3 === 0) rect(ctx, x + 15, y + 16, 1, 1, C.white);
  } else if (b.type === 'airbase') {
    // The windsock flutters
    rect(ctx, x + 64, y + 3 + (tick % 2), 1, 2, t.main);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  if (p.kind === 'bullet') {
    // Tracer
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, 'rgba(242,214,106,0.4)');
    rect(ctx, x - dx, y - dy, 1, 1, C.yellow);
    rect(ctx, x, y, 2, 1, C.white);
  } else if (p.kind === 'bomb') {
    rect(ctx, x - 1, y - 2, 3, 4, C.O);
    rect(ctx, x - 1, y - 2, 2, 3, C.oliveDark);
    rect(ctx, x - 2, y - 3, 5, 1, C.gun);
  } else if (p.kind === 'lob') {
    // Mortar bomb
    rect(ctx, x - dx, y - dy, 1, 1, 'rgba(200,204,212,0.6)');
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, C.olive);
  } else {
    // Tank shell
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, 'rgba(200,204,212,0.5)');
    rect(ctx, x - dx, y - dy, 1, 1, C.fire);
    rect(ctx, x - 1, y - 1, 3, 2, C.O);
    rect(ctx, x, y - 1, 2, 1, C.yellowDark);
  }
}

// Every blast kicks up a fountain of snow around a flash of fire.
function explode(ctx, x, y, r, k, seed) {
  if (k < 0.3) {
    disc(ctx, x, y, Math.max(1, Math.round(r * (0.35 + k))), C.fire);
    disc(ctx, x, y, Math.max(1, Math.round(r * 0.3 * (1 - k * 2))), C.yellow);
  }
  if (k > 0.5) {
    ctx.globalAlpha = 1 - (k - 0.5) / 0.5;
    disc(ctx, x, y - Math.round(k * 4), Math.max(1, Math.round(r * 0.5)), C.smoke);
    ctx.globalAlpha = 1;
  }
  const chunks = 14;
  for (let i = 0; i < chunks; i++) {
    const ang = -Math.PI * (0.1 + 0.8 * hash(seed + i));
    const sp = r * (0.5 + hash(seed + i + 20) * 0.8);
    const px = x + Math.cos(ang) * sp * k;
    const py = y + Math.sin(ang) * sp * k + k * k * r * 0.9;
    const s = i % 3 === 0 ? 2 : 1;
    rect(ctx, Math.round(px), Math.round(py), s, s, i % 4 ? C.white : C.snowShade);
  }
}

function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(14, 6);
  const white = e.type === 'soldier' || e.type === 'sniper';
  outlined(g, [[1, 2, 3, 3, white ? C.suit : C.fur], [4, 2, 7, 3, white ? C.suit : t.uni], [11, 3, 2, 2, C.boot]], [[1, 3, 2, 1, C.skin], [5, 3, 2, 1, t.main]]);
  return { c, ax: 7, ay: 5 };
}

export default {
  id: 'winter',
  name: 'Winter War',
  palette,
  teamBase: GREATCOAT,
  roofBase: [0.3, 0.32, 0.36],
  soldier: buildSoldier,
  vehicle: { jeep: buildSled, tank: buildTank, artillery: buildMortar },
  aircraft: { helicopter: buildFokker, bomber: buildBlenheim },
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
  explosion: { rim: '#c8ccd4', body: '#f28a30', core: '#ffffff', smoke: '#c8ccd4', smoke2: '#eef4fa' },
  corpse,
  debris: { '#7a4a24': '#eef4fa', '#5c361a': '#7a5a3a' },
  minimap: { sky: '#182644', ground: '#4a4440', platform: '#7e8088', bridge: '#7a5a3a', ramp: '#c4d4e6', surface: '#eef4fa' },
  names: {
    soldier: 'Ski Trooper', heavy: 'Tank Hunter', scout: 'Ski Patrol', engineer: 'Sapper', sniper: 'White Death',
    jeep: 'Reindeer Sled', tank: 'Trophy Tank', artillery: 'Motti Mortar', helicopter: 'Ski Fokker', bomber: 'Blenheim',
    hq: 'Korsu', barracks: 'Sauna', turret: 'Maxim Nest', wall: 'Granite Line', mine: 'Soup Cannon', workshop: 'Trophy Yard',
    airbase: 'Ice Airfield', bridge: 'Log Bridge', ramp: 'Ski Jump',
  },
  // Units are shown with their own sprites in menus.
  spriteIcons: true,
  icons: { hq: '🪵', barracks: '🧖', turret: '💥', wall: '🪨', mine: '🍲', workshop: '🔧', airbase: '🛩️', bridge: '🌉', ramp: '⛷️' },
};
