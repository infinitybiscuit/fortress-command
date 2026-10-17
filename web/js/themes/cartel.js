// Cartel Wars: an 80s action-movie turf war on the border. Neon sunsets,
// haciendas, gunmen in loud shirts, homemade armoured trucks and a very
// legitimate taco stand. Fictional outfits only. Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team, sideOf, missileRack } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#1a1018',                        // outline
  skin: '#d8a070', skinDark: '#a8724a', hair: '#1a1210',
  boot: '#2a1e18', gun: '#2a2a2e', gunLight: '#5a5a62', gunDark: '#18181c',
  yellow: '#f2c84a', yellowDark: '#b88a2a', red: '#d8322a', redDark: '#8a1e1a', white: '#f6f0e6',
  sky: ['#2a1448', '#4a1a5e', '#7a2066', '#b42e6a', '#e2506a', '#f2805a', '#f8b464'],
  denim: '#3a4a6e', denimDark: '#2a3452', khaki: '#4a4c36', khakiLight: '#6a6c4e',
  suit: '#ece4d4', suitShade: '#c4b8a2', gold: '#f2c84a', goldDark: '#b88a2a',
  adobe: '#e4cca4', adobeShade: '#c4a47a', adobeDark: '#9a7a54',
  tile: '#c4522e', tileLight: '#e47a4a', tileDark: '#8a321e',
  block: '#9a968e', blockLight: '#b8b4aa', blockDark: '#6a665e',
  wood: '#7a5234', woodLight: '#a47448', woodDark: '#4e3420',
  tin: '#8a949c', tinLight: '#b0bac2', tinDark: '#5e666e', rust: '#a8542a', rustDark: '#6e3418',
  sand: '#d8b878', sandLight: '#ecd09a', sandDark: '#b08e56',
  dirt: '#8a5434', dirtMid: '#74442a', dirtDeep: '#5a3420', pebble: '#b07a52', pebbleDark: '#4a2a18',
  cactus: '#3a7a4a', cactusLight: '#5aa064', cactusDark: '#265a34', palm: '#2e6a3a', palmLight: '#4a9050',
  navy: '#1e2a4a', navyLight: '#34446e', pastelPink: '#f4a8c8', pastelTeal: '#8ae0d4', donut: '#d8964a', icing: '#ff8ac8',
  neonPink: '#ff4aa8', neonTeal: '#3ae8d8', neonGreen: '#5aff7a',
  fire: '#f28a30', glass: '#ffd27a', glassBlue: '#8ac8e8', smoke: '#cfc4c0', shadow: 'rgba(0,0,0,0.3)',
};
const FATIGUES = [0.3, 0.29, 0.22];

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right — the same frame as Classic.
function cartelSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'heavy') {
    // Enforcer: balaclava, plate carrier, belt-fed machine gun
    parts = [
      ...legs.map((l) => [...l, C.gun]), ...boots.map((b) => [...b, C.boot]),
      [4, 7, 9, 5, C.khaki], [6, 3, 6, 5, '#1e1c20'], [9, 9, 10, 2, C.gun], [12, 11, 3, 2, C.khakiLight],
    ];
    details = [
      [8, 4, 4, 1, C.skin], [10, 4, 1, 1, C.O], [4, 7, 9, 1, C.khakiLight], [5, 9, 2, 2, C.khakiLight], [7, 9, 2, 2, C.khakiLight],
      [4, 8, 2, 2, t.main], [6, 11, 7, 1, C.gold], [9, 9, 10, 1, C.gunLight], [18, 10, 1, 1, C.O],
    ];
  } else if (type === 'scout') {
    // Lookout: team cap, vest top, walkie-talkie and a pistol
    parts = [
      ...legs.map((l) => [...l, C.denim]), ...boots.map((b) => [...b, C.white]),
      [5, 8, 7, 4, C.white], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, t.main], [11, 2, 3, 1, t.dark],
      [3, 6, 2, 3, C.gun], [11, 9, 4, 1, C.gun],
    ];
    details = [
      [6, 1, 6, 1, t.light], [10, 4, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [5, 8, 1, 4, C.skin], [11, 8, 1, 2, C.skin],
      [3, 3, 1, 3, C.gun], [4, 7, 1, 1, C.red],
    ];
  } else if (type === 'engineer') {
    // Mechanic: greasy overalls, cap on backwards, big wrench
    parts = [
      ...legs.map((l) => [...l, t.uniDark]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, t.uni], [6, 3, 6, 5, C.skin], [5, 1, 7, 2, t.main], [4, 2, 2, 1, t.dark],
      [11, 9, 4, 1, C.gunLight], [14, 7, 3, 2, C.gunLight], [14, 10, 3, 1, C.gunLight],
    ];
    details = [
      [10, 4, 1, 1, C.O], [8, 6, 3, 1, C.hair], [7, 7, 4, 1, C.skinDark], [6, 8, 1, 3, t.uniDark], [9, 8, 1, 3, t.uniDark],
      [7, 10, 2, 1, C.gun], [15, 8, 1, 1, C.O],
    ];
  } else if (type === 'sniper') {
    // Sicario: white suit, slicked hair, sunglasses, scoped rifle
    parts = [
      ...legs.map((l) => [...l, C.suit]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.suit], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair], [5, 2, 2, 3, C.hair],
      [9, 9, 10, 1, C.woodDark], [12, 7, 4, 1, C.gun],
    ];
    details = [
      [8, 4, 4, 1, C.O], [10, 4, 1, 1, C.glassBlue], [7, 7, 4, 1, C.skinDark], [8, 8, 1, 2, t.main],
      [5, 8, 1, 4, C.suitShade], [12, 8, 1, 1, C.gun], [18, 9, 1, 1, C.O],
    ];
  } else {
    // Gunman: open Hawaiian shirt in team colours, aviators, gold chain, rifle
    parts = [
      ...legs.map((l) => [...l, C.denim]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, t.main], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair], [5, 2, 2, 2, C.hair],
      [9, 9, 9, 1, C.gun], [9, 10, 2, 2, C.wood], [13, 10, 2, 2, C.gun],
    ];
    details = [
      [8, 4, 4, 1, C.O], [10, 4, 1, 1, C.glassBlue], [8, 6, 3, 1, C.hair], [8, 8, 1, 2, C.skin], [7, 8, 1, 1, C.gold], [9, 8, 1, 1, C.gold],
      [6, 9, 1, 1, t.light], [6, 11, 1, 1, t.light], [10, 11, 1, 1, t.light], [14, 11, 1, 1, C.gun], [17, 9, 1, 1, C.O],
    ];
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── Vehicles ───────────────────────────────────────────────────────────────
function wheel(g, x, y, r, frame) {
  disc(g, x, y, r + 1, C.O);
  disc(g, x, y, r, C.gunDark);
  disc(g, x, y, Math.max(1, r - 2), C.gunLight);
  g.fillStyle = C.gunDark;
  if (frame) g.fillRect(x, y - 1, 1, 3); else g.fillRect(x - 1, y, 3, 1);
}

// Technical: a pickup with a machine gun on a post in the bed.
function cartelTechnical(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 18);
  outlined(g, [
    [1, 10, 28, 4, C.white], [16, 4, 8, 7, C.white], [23, 7, 6, 4, C.white], [2, 7, 14, 4, C.white],
    [5, 0, 4, 4, C.skin], [4, 3, 6, 5, t.main], [10, 2, 1, 6, C.gun], [8, 2, 9, 2, C.gun],
  ], [
    [17, 5, 5, 3, C.glassBlue], [1, 11, 28, 1, t.main], [2, 7, 14, 1, C.suitShade], [28, 8, 1, 2, C.glass],
    [5, 0, 4, 1, C.hair], [6, 1, 3, 1, C.O], [16, 2, 1, 1, C.O], [1, 13, 28, 1, C.suitShade], [12, 9, 2, 1, C.rust],
  ]);
  wheel(g, 7, 14, 3, frame);
  wheel(g, 23, 14, 3, frame);
  return { c, ax: 14, ay: 17 };
}

// Monstruo: a homemade armoured truck of welded plate, slit windows, a ram
// and a gun box on the roof.
function cartelMonstruo(f, frame) {
  const t = team(f);
  const [c, g] = canvas(38, 22);
  outlined(g, [
    [2, 6, 32, 10, C.tinDark], [24, 8, 10, 8, C.tinDark], [33, 12, 3, 5, C.gunLight], [9, 2, 10, 4, C.tinDark],
    [19, 3, 8, 2, C.gun],
  ], [
    [2, 6, 32, 1, C.tin], [9, 2, 10, 1, C.tin], [4, 9, 6, 1, C.O], [13, 9, 6, 1, C.O], [26, 9, 6, 1, C.O],
    [2, 12, 32, 2, t.main], [6, 7, 1, 1, C.tinLight], [16, 7, 1, 1, C.tinLight], [22, 7, 1, 1, C.tinLight],
    [5, 14, 4, 1, C.rust], [20, 10, 3, 2, C.rust], [11, 3, 2, 1, C.O], [34, 13, 1, 3, C.gun],
  ]);
  wheel(g, 8, 17, 4, frame);
  wheel(g, 19, 17, 4, frame);
  wheel(g, 29, 17, 4, frame);
  return { c, ax: 18, ay: 21 };
}

// Rocket truck: a flatbed with a tilted rack of improvised rockets.
function cartelRocketTruck(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 19);
  outlined(g, [
    [1, 10, 30, 4, C.khaki], [22, 4, 7, 7, C.khaki], [28, 7, 3, 4, C.khaki],
    [4, 6, 6, 4, C.gun], [8, 3, 6, 4, C.gun], [12, 1, 5, 3, C.gun], [9, 6, 2, 4, C.gunLight],
  ], [
    [23, 5, 4, 3, C.glassBlue], [1, 11, 30, 1, t.main], [1, 10, 30, 1, C.khakiLight], [30, 8, 1, 2, C.glass],
    [16, 1, 1, 1, C.red], [16, 2, 1, 1, C.red], [13, 3, 1, 1, C.red], [12, 4, 1, 1, C.red], [9, 5, 1, 1, C.red],
    [4, 6, 6, 1, C.gunLight], [8, 3, 6, 1, C.gunLight],
  ]);
  wheel(g, 6, 15, 3, frame);
  wheel(g, 25, 15, 3, frame);
  return { c, ax: 15, ay: 18 };
}

// Narco chopper: a little egg-shaped helicopter (rotors spin live).
function cartelChopper(f) {
  const t = team(f);
  const [c, g] = canvas(32, 16);
  outlined(g, [
    [12, 4, 13, 8, C.white], [10, 6, 3, 5, C.white], [1, 6, 11, 2, C.white], [0, 3, 3, 4, t.main],
    [17, 2, 2, 2, C.gun], [13, 12, 1, 2, C.gun], [21, 12, 1, 2, C.gun], [10, 14, 15, 1, C.gun],
  ], [
    [19, 5, 5, 4, C.glassBlue], [22, 5, 2, 1, C.white], [12, 9, 13, 2, t.main], [1, 7, 10, 1, t.main],
    [12, 4, 7, 1, C.suit], [24, 13, 1, 1, C.gunLight],
  ]);
  return { c, ax: 16, ay: 13 };
}

// Smuggler plane: a high-wing twin-prop cargo plane.
function cartelPlane(f) {
  const t = team(f);
  const [c, g] = canvas(48, 20);
  outlined(g, [
    [4, 7, 37, 6, C.white], [40, 8, 4, 4, C.white], [2, 1, 5, 7, t.main], [1, 9, 8, 2, C.white],
    [14, 4, 22, 2, C.suitShade], [24, 6, 7, 4, C.gunLight], [20, 13, 1, 3, C.gun], [32, 13, 1, 3, C.gun],
  ], [
    [4, 10, 37, 1, t.main], [4, 11, 37, 1, t.dark], [37, 8, 2, 2, C.glassBlue], [40, 8, 2, 1, C.glassBlue],
    [12, 8, 2, 2, C.glassBlue], [17, 8, 2, 2, C.glassBlue], [24, 6, 7, 1, C.tinLight], [2, 1, 2, 7, t.dark],
    [19, 16, 3, 2, C.gunDark], [31, 16, 3, 2, C.gunDark],
  ]);
  return { c, ax: 24, ay: 15 };
}


// ── The Cops ───────────────────────────────────────────────────────────────
// An 80s cop show: pastel blazers, a K-9 unit, a cruiser with a lightbar,
// a police blimp, the Academy, and a donut shop to answer the taco stand.
const cops = (f) => sideOf(f) === 'cops';

function copSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'scout') {
    // K-9: a police dog in a team vest
    const legsD = frame ? [[5, 12, 1, 4], [8, 12, 1, 3], [13, 12, 1, 4], [15, 12, 1, 3]] : [[4, 12, 1, 3], [7, 12, 1, 4], [12, 12, 1, 3], [16, 12, 1, 4]];
    parts = [
      ...legsD.map((l) => [...l, '#5a3a22']),
      [4, 8, 13, 5, '#8a5a32'], [15, 5, 4, 5, '#8a5a32'], [17, 7, 3, 2, '#5a3a22'], [15, 3, 1, 2, '#5a3a22'], [17, 3, 1, 2, '#5a3a22'], [1, 6, 3, 2, '#5a3a22'],
    ];
    details = [[6, 8, 7, 4, t.main], [7, 9, 5, 1, C.white], [17, 6, 1, 1, C.O], [19, 7, 1, 1, C.O], [4, 12, 13, 1, '#5a3a22']];
  } else if (type === 'heavy') {
    // SWAT: helmet, visor, vest, riot shield and shotgun
    parts = [
      ...legs.map((l) => [...l, C.navy]), ...boots.map((b) => [...b, C.boot]),
      [4, 7, 9, 5, C.navy], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, C.navy], [10, 9, 9, 1, C.gun], [2, 6, 3, 9, C.glassBlue],
    ];
    details = [[7, 3, 6, 2, C.gunDark], [5, 1, 8, 1, C.navyLight], [5, 9, 8, 2, t.main], [6, 9, 6, 1, C.white], [2, 6, 1, 9, C.white], [18, 9, 1, 1, C.O]];
  } else if (type === 'engineer') {
    // Forensics: white coveralls, camera round the neck
    parts = [
      ...legs.map((l) => [...l, C.white]), ...boots.map((b) => [...b, C.white]),
      [5, 8, 7, 4, C.white], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair], [9, 9, 4, 3, C.gun],
    ];
    details = [[10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [10, 10, 2, 1, C.glassBlue], [5, 8, 1, 4, t.main], [11, 9, 1, 1, C.white]];
  } else if (type === 'sniper') {
    // Sharpshooter: navy cap and scoped rifle
    parts = [
      ...legs.map((l) => [...l, C.navy]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.navyLight], [6, 3, 6, 5, C.skin], [5, 1, 7, 2, C.navy], [10, 2, 3, 1, C.navy], [9, 9, 10, 1, C.gun], [12, 7, 4, 1, C.gun],
    ];
    details = [[10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [6, 1, 2, 1, C.gold], [5, 10, 7, 1, t.main], [12, 8, 1, 1, C.gun], [18, 9, 1, 1, C.O]];
  } else {
    // Vice cop: pastel blazer, sleeves pushed up, stubble, aviators
    parts = [
      ...legs.map((l) => [...l, C.suit]), ...boots.map((b) => [...b, C.white]),
      [5, 8, 7, 4, C.pastelTeal], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, '#6a4a2a'], [5, 2, 2, 3, '#6a4a2a'],
      [11, 9, 5, 1, C.gun], [11, 10, 1, 2, C.gun],
    ];
    details = [
      [8, 4, 4, 1, C.O], [10, 4, 1, 1, C.glassBlue], [7, 6, 5, 2, C.skinDark], [7, 8, 3, 4, t.main], [5, 10, 2, 1, C.skin], [5, 8, 1, 4, C.pastelPink],
      [10, 11, 1, 1, C.gold],
    ];
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// Police cruiser with a lightbar that flashes as it drives.
function copCruiser(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 18);
  outlined(g, [[1, 9, 30, 4, C.white], [8, 5, 14, 4, C.gunDark], [6, 3, 4, 2, C.red], [10, 3, 4, 2, '#3a6ae8']], [
    [1, 11, 30, 2, C.gunDark], [9, 6, 5, 3, C.glassBlue], [15, 6, 6, 3, C.glassBlue], [12, 9, 6, 2, C.gold], [13, 9, 4, 1, t.main],
    [30, 10, 1, 1, C.glass], [1, 10, 1, 1, C.red], [frame ? 6 : 10, 3, 4, 1, C.white],
  ]);
  wheel(g, 7, 14, 3, frame);
  wheel(g, 24, 14, 3, frame);
  return { c, ax: 15, ay: 17 };
}

// SWAT truck: a big boxy armoured van.
function copSwatTruck(f, frame) {
  const t = team(f);
  const [c, g] = canvas(38, 22);
  outlined(g, [[2, 4, 24, 12, C.navy], [26, 7, 9, 9, C.navy], [8, 1, 8, 3, C.gun], [15, 2, 8, 1, C.gun]], [
    [2, 4, 24, 1, C.navyLight], [27, 8, 5, 3, C.glassBlue], [2, 10, 33, 2, t.main], [5, 6, 3, 2, C.gunDark], [11, 6, 3, 2, C.gunDark], [17, 6, 3, 2, C.gunDark],
    [34, 13, 1, 2, C.glass], [8, 1, 8, 1, C.gunLight],
  ]);
  for (const x of [8, 20, 30]) wheel(g, x, 17, 4, frame);
  return { c, ax: 18, ay: 21 };
}

// Riot van with a tear-gas launcher on the roof.
function copRiotVan(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 19);
  outlined(g, [[1, 7, 28, 7, C.white], [22, 5, 7, 4, C.white], [6, 3, 6, 4, C.gun], [10, 1, 3, 3, C.gun], [12, 0, 3, 2, C.gun]], [
    [1, 10, 28, 2, C.navy], [23, 6, 4, 2, C.glassBlue], [1, 12, 28, 1, t.main], [12, 0, 3, 1, C.O], [28, 9, 1, 1, C.glass],
  ]);
  wheel(g, 7, 15, 3, frame);
  wheel(g, 23, 15, 3, frame);
  return { c, ax: 15, ay: 18 };
}

// Police chopper with a searchlight (rotors spin live).
function copChopper(f) {
  const t = team(f);
  const [c, g] = canvas(32, 16);
  outlined(g, [
    [10, 4, 15, 8, C.navy], [1, 6, 10, 2, C.navy], [0, 3, 3, 4, t.main],
    [17, 2, 2, 2, C.gun], [13, 12, 1, 2, C.gun], [21, 12, 1, 2, C.gun], [10, 14, 15, 1, C.gun], [22, 11, 3, 2, C.tinLight],
  ], [
    [19, 5, 5, 4, C.glassBlue], [10, 9, 15, 1, C.white], [1, 7, 10, 1, C.white], [12, 6, 4, 2, t.main], [23, 12, 2, 1, C.glass],
  ]);
  return { c, ax: 16, ay: 13 };
}

// The police blimp: a slow, smug surveillance gasbag.
function copBlimp(f) {
  const t = team(f);
  const [c, g] = canvas(46, 21);
  outlined(g, [[6, 3, 34, 11, C.white], [4, 5, 3, 7, C.white], [39, 5, 4, 7, C.white], [1, 3, 4, 4, C.navy], [1, 10, 4, 4, C.navy], [16, 14, 14, 4, C.navy]], [
    [6, 3, 34, 1, C.suit], [6, 7, 34, 3, C.navy], [10, 8, 26, 1, t.main], [17, 15, 2, 1, C.glass], [21, 15, 2, 1, C.glass], [25, 15, 2, 1, C.glass], [6, 12, 34, 1, C.suitShade],
  ]);
  return { c, ax: 23, ay: 16 };
}

const buildSoldier = (type, f, frame) => (cops(f) ? copSoldier : cartelSoldier)(type, f, frame);
const buildTechnical = (f, frame) => (cops(f) ? copCruiser : cartelTechnical)(f, frame);
const buildMonstruo = (f, frame) => (cops(f) ? copSwatTruck : cartelMonstruo)(f, frame);
const buildRocketTruck = (f, frame) => (cops(f) ? copRiotVan : cartelRocketTruck)(f, frame);
const buildChopper = (f) => (cops(f) ? copChopper : cartelChopper)(f);
const buildPlane = (f) => (cops(f) ? copBlimp : cartelPlane)(f);

function rotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 50);
  const s = u.facing;
  if (u.type === 'bomber' && cops(u.faction)) {
    const px = s > 0 ? x - 23 : x + 22;
    if (tick % 2) rect(ctx, px, y - 12, 1, 7, C.smoke); else rect(ctx, px, y - 9, 1, 2, C.smoke);
  } else if (u.type === 'helicopter') {
    if (tick % 2) rect(ctx, x - 15, y - 12, 30, 1, C.gunLight);
    else { rect(ctx, x - 7, y - 12, 14, 1, C.gun); rect(ctx, x - 1, y - 13, 2, 1, C.gun); }
    const tx = s > 0 ? x - 15 : x + 14;
    if (tick % 2) rect(ctx, tx, y - 12, 1, 5, C.gunLight); else rect(ctx, tx - 2, y - 10, 5, 1, C.gunLight);
  } else {
    const px = s > 0 ? x + 7 : x - 8;
    if (tick % 2) rect(ctx, px, y - 12, 1, 9, C.smoke);
    else { rect(ctx, px, y - 9, 1, 3, C.smoke); rect(ctx, px, y - 12, 1, 1, C.gunLight); rect(ctx, px, y - 4, 1, 1, C.gunLight); }
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
function adobe(g, x, y, w, h) {
  outlined(g, [[x, y, w, h, C.adobe]], [[x, y, w, 1, C.white], [x, y + h - 2, w, 2, C.adobeShade]]);
  g.fillStyle = C.adobeShade;
  for (let i = 0; i < 3; i++) g.fillRect(x + 3 + Math.floor(hash(x + y + i) * (w - 6)), y + 3 + Math.floor(hash(x * 3 + i) * (h - 6)), 2, 1);
}

// Terracotta roof: barrel-tile ribs and a lighter ridge.
function tileRoof(g, x, y, w, h) {
  g.fillStyle = C.O; g.fillRect(x - 2, y - 1, w + 4, h + 2);
  g.fillStyle = C.tile; g.fillRect(x - 1, y, w + 2, h);
  g.fillStyle = C.tileDark; for (let xx = x; xx < x + w + 1; xx += 3) g.fillRect(xx, y + 1, 1, h - 1);
  g.fillStyle = C.tileLight; g.fillRect(x - 1, y, w + 2, 1);
  g.fillStyle = C.tileDark; g.fillRect(x - 1, y + h - 1, w + 2, 1);
}

function arch(g, x, y, w, h, col = '#2a1a16') {
  g.fillStyle = C.O; g.fillRect(x - 1, y, w + 2, h); g.fillRect(x, y - 1, w, 1);
  g.fillStyle = col; g.fillRect(x, y + 1, w, h - 1); g.fillRect(x + 1, y, w - 2, 1);
}

function palmTree(g, x, base, h) {
  g.fillStyle = C.O; g.fillRect(x - 1, base - h, 4, h);
  g.fillStyle = C.woodLight; g.fillRect(x, base - h, 2, h);
  g.fillStyle = C.wood; for (let y = base - h + 2; y < base; y += 3) g.fillRect(x, y, 2, 1);
  const top = base - h;
  for (const [dx, dy, w] of [[-7, 1, 7], [2, 1, 7], [-5, -1, 5], [2, -1, 5], [-1, -2, 3]]) {
    g.fillStyle = C.O; g.fillRect(x + dx - 1, top + dy - 1, w + 2, 3);
  }
  for (const [dx, dy, w] of [[-7, 1, 7], [2, 1, 7], [-5, -1, 5], [2, -1, 5], [-1, -2, 3]]) {
    g.fillStyle = C.palm; g.fillRect(x + dx, top + dy, w, 1);
  }
  g.fillStyle = C.palmLight; g.fillRect(x - 6, top + 1, 2, 1); g.fillRect(x + 6, top + 1, 2, 1);
  g.fillStyle = C.palm; g.fillRect(x - 8, top + 2, 1, 2); g.fillRect(x + 9, top + 2, 1, 2);
  g.fillStyle = C.woodDark; g.fillRect(x, top + 1, 2, 2);
}

function window_(g, x, y, w, h, lit) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = lit ? C.glass : C.glassBlue; g.fillRect(x, y, w, h);
  g.fillStyle = C.O; for (let xx = x + 1; xx < x + w; xx += 2) g.fillRect(xx, y, 1, h);
}

function sandbags(g, x, y, w, rows) {
  for (let r = 0; r < rows; r++) {
    const yy = y + r * 3;
    for (let xx = x + (r % 2 ? 2 : 0) - 2; xx < x + w; xx += 4) {
      const bx = Math.max(x, xx), bw = Math.min(xx + 4, x + w) - bx;
      if (bw <= 0) continue;
      g.fillStyle = C.O; g.fillRect(bx, yy, bw, 3);
      g.fillStyle = C.sand; g.fillRect(bx, yy, Math.max(1, bw - 1), 2);
      g.fillStyle = C.sandLight; g.fillRect(bx, yy, Math.max(1, bw - 1), 1);
    }
  }
}

const BUILD = {
  hq(g, t) {
    // Hacienda: two adobe storeys under terracotta, arches, a wrought-iron
    // balcony, a bell tower, golden gates and palms either side
    adobe(g, 5, 28, 54, 20);
    for (const x of [9, 19, 41, 51]) arch(g, x, 32, 5, 10);
    outlined(g, [[27, 33, 10, 15, C.gold]], [[27, 33, 10, 1, C.yellow], [31, 33, 2, 15, C.goldDark], [29, 36, 1, 10, C.goldDark], [34, 36, 1, 10, C.goldDark]]);
    tileRoof(g, 3, 25, 58, 3);
    adobe(g, 12, 13, 40, 12);
    for (const x of [16, 24, 36, 44]) window_(g, x, 16, 4, 5, x === 24 || x === 44);
    g.fillStyle = C.O; g.fillRect(12, 22, 40, 1); for (let x = 12; x < 52; x += 2) g.fillRect(x, 20, 1, 3);
    tileRoof(g, 10, 9, 44, 4);
    adobe(g, 27, 1, 10, 8);
    arch(g, 30, 3, 4, 5, '#3a2a20');
    g.fillStyle = C.gold; g.fillRect(31, 5, 2, 2);
    tileRoof(g, 26, 0, 12, 1);
    palmTree(g, 1, 47, 26);
    palmTree(g, 61, 47, 22);
    // Team banners
    for (const x of [21, 41]) { g.fillStyle = C.O; g.fillRect(x - 1, 27, 4, 7); g.fillStyle = t.main; g.fillRect(x, 28, 2, 5); g.fillStyle = C.gold; g.fillRect(x, 28, 2, 1); }
  },
  barracks(g, t) {
    // Safe house: cinderblock box with barred windows, a rooftop water tank,
    // a satellite dish, an AC unit and the crew's tag sprayed on the wall
    outlined(g, [[3, 12, 40, 20, C.block]], [[3, 12, 40, 1, C.blockLight]]);
    g.fillStyle = C.blockDark;
    for (let y = 15; y < 32; y += 3) { g.fillRect(3, y, 40, 1); for (let x = 3 + (y % 2 ? 2 : 5); x < 43; x += 6) g.fillRect(x, y - 2, 1, 2); }
    for (const x of [7, 32]) { window_(g, x, 16, 6, 5, x === 7); }
    outlined(g, [[19, 19, 8, 13, '#5a3a2a']], [[25, 25, 1, 1, C.gold], [19, 19, 8, 1, '#7a5a42']]);
    g.fillStyle = t.main; g.fillRect(9, 24, 6, 1); g.fillRect(8, 25, 2, 3); g.fillRect(12, 25, 1, 3); g.fillRect(14, 25, 2, 2); g.fillRect(10, 27, 4, 1);
    outlined(g, [[6, 4, 9, 7, C.tinDark], [33, 8, 6, 4, C.tin]], [[6, 4, 9, 1, C.tin], [34, 9, 4, 1, C.tinLight]]);
    g.fillStyle = C.O; g.fillRect(8, 11, 1, 1); g.fillRect(13, 11, 1, 1);
    disc(g, 26, 8, 3, C.O); disc(g, 26, 8, 2, C.white); g.fillStyle = C.O; g.fillRect(26, 8, 1, 4);
    outlined(g, [[41, 22, 6, 5, C.tinLight]], [[42, 23, 4, 1, C.O], [42, 25, 4, 1, C.O]]);
  },
  turret(g, t) {
    // Watchtower: timber stilts, a tin-roofed platform, machine gun and spotlight
    g.fillStyle = C.O; g.fillRect(6, 14, 3, 18); g.fillRect(23, 14, 3, 18);
    g.fillStyle = C.wood; g.fillRect(7, 14, 1, 18); g.fillRect(24, 14, 1, 18);
    g.fillStyle = C.woodDark; for (let i = 0; i < 16; i++) { g.fillRect(8 + i, 16 + i, 1, 1); g.fillRect(23 - i, 16 + i, 1, 1); }
    outlined(g, [[4, 9, 24, 6, C.wood], [3, 3, 26, 2, C.tin]], [[4, 9, 24, 1, C.woodLight], [3, 3, 26, 1, C.tinLight], [6, 11, 20, 1, C.woodDark]]);
    g.fillStyle = C.O; g.fillRect(5, 5, 1, 4); g.fillRect(26, 5, 1, 4);
    outlined(g, [[20, 7, 10, 2, C.gun]], [[29, 7, 1, 1, C.O]]);
    disc(g, 9, 7, 2, C.O); disc(g, 9, 7, 1, C.glass);
    g.fillStyle = t.main; g.fillRect(13, 11, 6, 2);
  },
  wall(g, t) {
    // Sandbags stacked on cinderblocks
    outlined(g, [[1, 20, 14, 12, C.block]], [[1, 20, 14, 1, C.blockLight], [1, 25, 14, 1, C.blockDark], [7, 20, 1, 5, C.blockDark], [4, 26, 1, 6, C.blockDark], [11, 26, 1, 6, C.blockDark]]);
    sandbags(g, 0, 2, 16, 6);
    g.fillStyle = t.main; g.fillRect(5, 28, 6, 2);
  },
  mine(g, t) {
    // Front business: a perfectly legitimate taco stand, with a striped awning,
    // a taco sign, and a green neon "$" glowing in the window
    outlined(g, [[3, 14, 26, 18, C.adobe]], [[3, 14, 26, 1, C.white], [3, 30, 26, 2, C.adobeShade]]);
    for (let x = 1; x < 31; x += 4) {
      g.fillStyle = C.O; g.fillRect(x, 9, 4, 6);
      g.fillStyle = (x / 4) % 2 < 1 ? t.main : C.white; g.fillRect(x, 10, 4, 4);
    }
    g.fillStyle = C.O; for (let x = 1; x < 31; x += 2) g.fillRect(x, 14, 1, 1);
    // Taco sign
    g.fillStyle = C.O; g.fillRect(8, 0, 16, 9);
    g.fillStyle = C.tileDark; g.fillRect(9, 1, 14, 7);
    disc(g, 16, 6, 4, C.O); disc(g, 16, 6, 3, C.yellow);
    g.fillStyle = C.tileDark; g.fillRect(12, 6, 9, 3);
    g.fillStyle = '#5aa04a'; g.fillRect(13, 3, 2, 1); g.fillRect(17, 3, 2, 1);
    g.fillStyle = C.red; g.fillRect(15, 3, 2, 1);
    g.fillStyle = C.O; g.fillRect(12, 6, 9, 1);
    // Counter window and the neon dollar
    g.fillStyle = C.O; g.fillRect(5, 17, 13, 8);
    g.fillStyle = '#2a1a16'; g.fillRect(6, 18, 11, 6);
    g.fillStyle = C.woodLight; g.fillRect(4, 25, 15, 2);
    outlined(g, [[21, 18, 6, 14, '#5a3a2a']], [[25, 25, 1, 1, C.gold]]);
  },
  workshop(g, t) {
    // Chop shop: corrugated garage, roller door up, a car on blocks, tyres
    outlined(g, [[2, 8, 44, 24, C.tin]], [[2, 8, 44, 1, C.tinLight]]);
    g.fillStyle = C.tinDark; for (let x = 4; x < 46; x += 3) g.fillRect(x, 9, 1, 23);
    g.fillStyle = C.O; g.fillRect(8, 14, 32, 18);
    g.fillStyle = '#2a2226'; g.fillRect(9, 15, 30, 17);
    g.fillStyle = C.tinLight; g.fillRect(8, 12, 32, 2); g.fillStyle = C.tinDark; g.fillRect(8, 13, 32, 1);
    outlined(g, [[12, 23, 22, 5, t.main], [16, 19, 12, 4, t.main]], [[17, 20, 4, 2, C.glassBlue], [23, 20, 4, 2, C.glassBlue], [12, 23, 22, 1, t.light]]);
    outlined(g, [[14, 28, 2, 3, C.block], [30, 28, 2, 3, C.block]], []);
    for (const [x, y] of [[41, 27], [41, 23]]) { disc(g, x + 2, y + 2, 2, C.O); disc(g, x + 2, y + 2, 1, C.gunLight); }
    g.fillStyle = t.main; g.fillRect(4, 3, 40, 4); g.fillStyle = C.O; g.fillRect(4, 7, 40, 1); g.fillRect(3, 2, 1, 6); g.fillRect(44, 2, 1, 6);
    g.fillStyle = C.white; for (let x = 8; x < 40; x += 4) g.fillRect(x, 4, 2, 2);
  },
  sam(g, t, f) {
    if (cops(f)) {
      // Air defence unit: a launcher on a police trailer, lights flashing
      outlined(g, [[3, 21, 26, 7, C.navy], [10, 17, 12, 5, C.white]], [[3, 21, 26, 1, C.navyLight], [3, 24, 26, 2, t.main], [10, 17, 12, 1, C.white]]);
      for (const x of [7, 25]) { disc(g, x, 29, 2, C.O); disc(g, x, 29, 1, C.gunDark); }
      missileRack(g, { x: 13, y: 18, len: 13, rail: C.gunDark, body: C.white, tip: C.red, fin: C.navyLight, dish: [5, 12], mast: C.gunLight, dishCol: C.white });
      g.fillStyle = C.red; g.fillRect(3, 20, 2, 1); g.fillStyle = '#3a6af0'; g.fillRect(27, 20, 2, 1);
    } else {
      // Bottle rocket stand: fireworks on the back of a rusty pickup
      outlined(g, [[2, 20, 28, 7, C.rust], [22, 14, 8, 7, C.rustDark]], [[2, 20, 28, 1, C.tinLight], [23, 15, 5, 3, C.glass], [2, 24, 20, 2, t.main]]);
      for (const x of [7, 25]) { disc(g, x, 28, 3, C.O); disc(g, x, 28, 2, C.gunDark); }
      missileRack(g, { x: 5, y: 18, len: 13, rail: C.gunDark, body: C.neonPink, tip: C.yellow, fin: C.neonTeal });
    }
  },
  airbase(g, t) {
    // Jungle airstrip: a quonset hangar, fuel drums, a windsock, a palm
    for (let i = 0; i < 20; i++) {
      const half = Math.round(Math.sqrt(Math.max(0, 1 - ((19 - i) / 20) ** 2)) * 18);
      g.fillStyle = C.O; g.fillRect(20 - half - 1, 11 + i, half * 2 + 2, 1);
      g.fillStyle = i % 3 ? C.tin : C.tinLight; g.fillRect(20 - half, 11 + i, half * 2, 1);
    }
    g.fillStyle = C.O; g.fillRect(12, 19, 16, 13);
    g.fillStyle = '#1e1a1e'; g.fillRect(13, 20, 14, 12);
    g.fillStyle = t.main; g.fillRect(17, 14, 6, 3);
    for (const x of [41, 46]) outlined(g, [[x, 25, 4, 7, C.rust]], [[x, 26, 4, 1, C.rustDark], [x, 29, 4, 1, C.rustDark], [x, 25, 4, 1, C.tileLight]]);
    palmTree(g, 53, 32, 22);
    g.fillStyle = C.O; g.fillRect(60, 4, 2, 28);
    g.fillStyle = C.white; g.fillRect(60, 5, 1, 27);
    g.fillStyle = C.O; g.fillRect(61, 3, 3, 5);
    g.fillStyle = C.fire; g.fillRect(62, 4, 2, 3);
  },
  bridge(g, t) {
    // Plank bridge with a rope rail
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 7);
    g.fillStyle = C.woodLight; g.fillRect(0, 2, 16, 4);
    g.fillStyle = C.woodDark; for (let x = 2; x < 16; x += 3) g.fillRect(x, 2, 1, 4);
    g.fillStyle = C.sandLight; g.fillRect(0, 0, 16, 1);
    g.fillStyle = C.wood; g.fillRect(3, 0, 1, 2); g.fillRect(11, 0, 1, 2);
    g.fillStyle = t.main; g.fillRect(6, 3, 2, 1);
  },
  ramp(g, t) {
    // Loading ramp: wooden boards with cleats
    g.fillStyle = C.wood; g.fillRect(0, 0, 16, 16);
    g.fillStyle = C.woodLight; for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = C.woodDark; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = C.O; g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = t.main; g.fillRect(2, 1, 3, 2);
  },
};


// The Cops' buildings; the airstrip, bridge and ramp are shared.
function brickBlock(g, x, y, w, h) {
  outlined(g, [[x, y, w, h, '#9a4a36']], [[x, y, w, 1, '#b8624a']]);
  g.fillStyle = '#723224';
  for (let yy = y + 3; yy < y + h; yy += 3) { g.fillRect(x, yy, w, 1); for (let xx = x + ((yy - y) % 2 ? 2 : 5); xx < x + w; xx += 6) g.fillRect(xx, yy - 2, 1, 2); }
}
const COP_BUILD = {
  hq(g, t) {
    // Police precinct: brick, stone steps, twin blue lamps, flag on the roof
    brickBlock(g, 4, 12, 56, 32);
    outlined(g, [[2, 9, 60, 3, C.blockLight]], [[2, 11, 60, 1, C.blockDark]]);
    for (const x of [8, 18, 40, 50]) window_(g, x, 16, 6, 7, x === 18 || x === 50);
    for (const x of [8, 18, 40, 50]) window_(g, x, 28, 6, 7, x === 8);
    outlined(g, [[26, 30, 12, 14, '#3a2a20']], [[31, 30, 2, 14, C.O], [26, 30, 12, 1, C.gold]]);
    outlined(g, [[22, 44, 20, 2, C.blockLight], [20, 46, 24, 2, C.block]], []);
    for (const x of [22, 40]) { outlined(g, [[x, 32, 2, 8, C.gunDark], [x - 1, 29, 4, 3, '#3a6ae8']], [[x, 30, 2, 1, C.glassBlue]]); }
    outlined(g, [[24, 21, 16, 6, C.navy]], [[25, 22, 14, 1, C.gold], [25, 25, 14, 1, C.gold], [30, 23, 4, 2, t.main]]);
    g.fillStyle = C.O; g.fillRect(31, 0, 2, 9); g.fillStyle = C.white; g.fillRect(31, 0, 1, 9);
    g.fillStyle = C.O; g.fillRect(33, 0, 10, 7); g.fillStyle = t.main; g.fillRect(33, 1, 9, 5); g.fillStyle = C.white; g.fillRect(34, 2, 3, 3);
  },
  barracks(g, t) {
    // Police Academy: brick hall with a big sign and a flagpole
    brickBlock(g, 3, 12, 42, 20);
    outlined(g, [[6, 3, 36, 8, C.navy]], [[7, 4, 34, 1, C.gold], [7, 9, 34, 1, C.gold], [10, 6, 28, 2, C.white]]);
    g.fillStyle = C.O; for (let x = 12; x < 38; x += 4) g.fillRect(x, 6, 1, 2);
    for (const x of [7, 35]) window_(g, x, 16, 6, 6, x === 7);
    outlined(g, [[19, 18, 10, 14, '#3a2a20']], [[23, 18, 1, 14, C.O]]);
    g.fillStyle = t.main; g.fillRect(19, 16, 10, 2);
  },
  turret(g, t) {
    // Checkpoint: a booth with a gun on the roof and a striped barrier arm
    outlined(g, [[6, 13, 14, 19, C.white], [4, 10, 18, 3, C.navy], [9, 5, 8, 5, C.gun], [16, 6, 12, 2, C.gun], [10, 2, 6, 3, '#3a6ae8']], [
      [8, 16, 10, 6, C.glassBlue], [9, 5, 8, 1, C.gunLight], [27, 6, 1, 1, C.O], [7, 26, 12, 2, t.main], [11, 2, 2, 3, C.red],
    ]);
    g.fillStyle = C.O; g.fillRect(20, 22, 12, 3);
    for (let x = 20; x < 32; x++) { g.fillStyle = Math.floor(x / 2) % 2 ? C.red : C.white; g.fillRect(x, 23, 1, 1); }
    g.fillStyle = C.O; g.fillRect(21, 24, 2, 8);
  },
  wall(g, t) {
    // Barricade: a concrete jersey barrier topped with a striped sawhorse
    outlined(g, [[1, 18, 14, 14, C.blockLight], [3, 14, 10, 4, C.blockLight]], [[1, 22, 14, 1, C.block], [2, 28, 12, 2, t.main]]);
    g.fillStyle = C.O; g.fillRect(0, 4, 16, 4);
    for (let x = 0; x < 16; x++) { g.fillStyle = Math.floor(x / 2) % 2 ? '#f2a830' : C.white; g.fillRect(x, 5, 1, 2); }
    g.fillStyle = C.O; g.fillRect(2, 8, 1, 6); g.fillRect(13, 8, 1, 6);
    disc(g, 13, 3, 1, C.O); g.fillStyle = '#f2a830'; g.fillRect(13, 3, 1, 1);
  },
  mine(g, t) {
    // Donut shop: a giant donut on the roof, coffee and a counter
    outlined(g, [[2, 16, 28, 16, C.white]], [[2, 16, 28, 1, C.suit], [2, 30, 28, 2, C.suitShade], [2, 20, 28, 1, C.pastelPink]]);
    disc(g, 16, 8, 8, C.O); disc(g, 16, 8, 7, C.donut); disc(g, 16, 7, 6, C.icing);
    disc(g, 16, 8, 2, C.O); disc(g, 16, 8, 1, '#3a2a20');
    g.fillStyle = C.white; for (const [x, y] of [[11, 4], [20, 5], [13, 11], [21, 10], [17, 3]]) g.fillRect(x, y, 1, 1);
    g.fillStyle = C.yellow; g.fillRect(12, 7, 1, 1); g.fillRect(19, 3, 1, 1);
    g.fillStyle = C.O; g.fillRect(5, 22, 13, 8); g.fillStyle = '#2a1a16'; g.fillRect(6, 23, 11, 6);
    g.fillStyle = C.woodLight; g.fillRect(4, 29, 15, 2);
    outlined(g, [[21, 22, 6, 10, '#5a3a2a']], [[25, 27, 1, 1, C.gold]]);
    g.fillStyle = t.main; g.fillRect(2, 17, 28, 1);
  },
  workshop(g, t) {
    // Impound lot: chain-link fence round a towed car and a tow truck hook
    outlined(g, [[12, 23, 22, 5, C.cactus], [16, 19, 12, 4, C.cactus]], [[17, 20, 4, 2, C.glassBlue], [23, 20, 4, 2, C.glassBlue], [12, 23, 22, 1, C.cactusLight]]);
    for (const x of [16, 30]) { disc(g, x, 29, 2, C.O); disc(g, x, 29, 1, C.gunLight); }
    g.fillStyle = C.O; g.fillRect(2, 6, 1, 26); g.fillRect(45, 6, 1, 26); g.fillRect(2, 6, 44, 1);
    g.fillStyle = 'rgba(176,186,194,0.75)';
    for (let x = 3; x < 45; x += 3) for (let y = 7; y < 32; y += 3) { g.fillRect(x, y, 1, 1); g.fillRect(x + 1, y + 1, 1, 1); }
    g.fillStyle = C.O; g.fillRect(36, 2, 2, 20); g.fillRect(30, 2, 8, 2); g.fillRect(30, 4, 1, 6);
    outlined(g, [[28, 10, 4, 2, C.gun]], []);
    g.fillStyle = t.main; g.fillRect(6, 9, 10, 4); g.fillStyle = C.white; g.fillRect(7, 10, 8, 1);
  },
};

// ── Terrain tiles ──────────────────────────────────────────────────────────
const CONTAINER = [['#a8542a', '#c87444', '#6e3418']];
function drawTile(g, kind, variant) {
  const seed = variant * 97 + kind.length * 13;
  const speckle = (n, a, b, y0 = 0) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = hash(seed + i + 40) < 0.5 ? a : b;
      g.fillRect(Math.floor(hash(seed + i) * (T - 2)), y0 + Math.floor(hash(seed + i + 20) * (T - y0 - 1)), 2, 1);
    }
  };
  if (kind.startsWith('dirt')) {
    // Sun-baked red earth under desert sand
    g.fillStyle = kind === 'dirtDeep' ? C.dirtDeep : kind === 'dirtMid' ? C.dirtMid : C.dirt;
    g.fillRect(0, 0, T, T);
    speckle(6, C.pebble, C.pebbleDark, kind === 'dirtTop' ? 5 : 0);
    if (kind !== 'dirtTop' && hash(seed + 33) < 0.2) {
      g.fillStyle = C.pebble; g.fillRect(0, 8, T, 1);
    }
    if (kind === 'dirtTop') {
      g.fillStyle = C.sand; g.fillRect(0, 0, T, 4);
      g.fillStyle = C.sandLight; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.sandDark; g.fillRect(0, 4, T, 1);
      for (let x = 0; x < T; x += 3) if (hash(seed + x) < 0.5) g.fillRect(x, 5, 1, 1);
    }
  } else {
    // A rusty shipping container
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    const [mid, light, dark] = CONTAINER[0];
    g.fillStyle = mid; g.fillRect(0, 0, T, T);
    g.fillStyle = dark; for (let x = 1; x < T; x += 3) g.fillRect(x, 2, 1, T - 4);
    g.fillStyle = light; g.fillRect(0, 0, T, 2);
    g.fillStyle = dark; g.fillRect(0, T - 3, T, 2);
    g.fillStyle = C.rust;
    if (hash(seed + 5) < 0.6) g.fillRect(Math.floor(hash(seed + 6) * 12), 3 + Math.floor(hash(seed + 7) * 8), 2, 2);
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); g.fillStyle = dark; g.fillRect(1, 0, 1, T - 2); }
    g.fillStyle = C.O;
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); g.fillStyle = dark; g.fillRect(T - 2, 0, 1, T - 2); }
  }
}

// Dry grass, pebbles and the odd little cactus.
function surface(ctx, x, y, ground, h) {
  ctx.fillStyle = C.sandDark;
  ctx.fillRect(x + Math.floor(h * 12), y - 1, 1, 1);
  if (!ground) return;
  if (h > 0.9) {
    ctx.fillStyle = C.cactus; ctx.fillRect(x + 7, y - 5, 2, 5); ctx.fillRect(x + 5, y - 3, 2, 1); ctx.fillRect(x + 5, y - 4, 1, 1); ctx.fillRect(x + 9, y - 4, 2, 1); ctx.fillRect(x + 10, y - 5, 1, 1);
    ctx.fillStyle = C.cactusLight; ctx.fillRect(x + 7, y - 5, 1, 4);
  } else if (h > 0.65) {
    ctx.fillStyle = '#b8a05a'; ctx.fillRect(x + 3, y - 2, 1, 2); ctx.fillRect(x + 5, y - 3, 1, 3); ctx.fillRect(x + 7, y - 2, 1, 2);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};

// Far border town: adobe blocks, a church dome, a water tower.
function townPiece(k) {
  const key = `town${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(40, 44);
  const col = '#6a2456';
  const kind = Math.floor(hash(k + 1) * 3);
  g.fillStyle = col;
  if (kind === 0) {
    // Church with a dome and bell tower
    g.fillRect(6, 28, 28, 16); disc(g, 20, 27, 8, col); g.fillRect(19, 14, 2, 6); g.fillRect(17, 16, 6, 1);
    g.fillRect(28, 18, 6, 26);
    g.fillStyle = '#f2b05a'; g.fillRect(30, 21, 2, 3); g.fillRect(14, 34, 2, 3);
  } else if (kind === 1) {
    // Water tower over flat-roofed houses
    g.fillRect(2, 32, 36, 12); g.fillRect(14, 4, 14, 10); g.fillRect(15, 14, 1, 18); g.fillRect(26, 14, 1, 18);
    g.fillStyle = '#f2b05a'; for (let x = 5; x < 36; x += 7) g.fillRect(x, 36, 2, 2);
  } else {
    g.fillRect(4, 24, 14, 20); g.fillRect(16, 30, 20, 14); g.fillRect(8, 20, 6, 4);
    g.fillStyle = '#f2b05a'; g.fillRect(8, 30, 2, 2); g.fillRect(24, 35, 2, 2);
  }
  scenery[key] = c;
  return c;
}

function saguaro(g, x, base, h) {
  g.fillStyle = '#2a4a34';
  g.fillRect(x, base - h, 4, h); g.fillRect(x + 1, base - h - 1, 2, 1);
  g.fillRect(x - 4, base - h + 8, 4, 3); g.fillRect(x - 4, base - h + 3, 3, 6);
  g.fillRect(x + 4, base - h + 12, 4, 3); g.fillRect(x + 5, base - h + 6, 3, 7);
  g.fillStyle = '#3a6244'; g.fillRect(x + 1, base - h, 1, h);
}

function nearPiece(k) {
  const key = `near${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(30, 44);
  if (hash(k + 11) < 0.5) saguaro(g, 13, 44, 22 + Math.floor(hash(k * 3) * 14));
  else palmTree(g, 14, 44, 30 + Math.floor(hash(k * 5) * 10));
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

  // Big 80s sunset sun, sliced by the horizon haze
  const sx = Math.round(bw * 0.5), sy = Math.round(groundY - 46), r = 34;
  for (let y = -r; y <= r; y++) {
    const half = Math.round(Math.sqrt(r * r - y * y));
    if (y > 0 && (y % 6 === 0 || y % 6 === 1) && y > 4) continue;
    rect(ctx, sx - half, sy + y, half * 2, 1, y < -12 ? '#ffe27a' : y < 8 ? '#ffb85a' : '#ff7a5a');
  }

  // Mesas and buttes
  const mOff = camAX * 0.1;
  for (let x = 0; x < bw; x++) {
    const wx = x + mOff;
    const p = ((wx % 260) + 260) % 260;
    let h = 10 + Math.round(Math.sin(wx * 0.02) * 4);
    if (p > 30 && p < 110) h = 44 - (p < 36 ? (36 - p) * 4 : 0) - (p > 104 ? (p - 104) * 4 : 0);
    else if (p > 170 && p < 200) h = 32 - (p < 174 ? (174 - p) * 5 : 0) - (p > 196 ? (p - 196) * 5 : 0);
    h = Math.max(h, 8);
    rect(ctx, x, groundY - h, 1, h, '#8a2e5a');
    rect(ctx, x, groundY - h, 1, 1, '#b4426a');
  }

  // Border town
  const tCount = 12;
  const tSpacing = ((WORLD_W / G) * 0.25) / tCount;
  const tOff = Math.round(camAX * 0.25);
  for (let i = Math.floor((tOff - 50) / tSpacing); i * tSpacing - tOff < bw + 50; i++) {
    const k = ((i % tCount) + tCount) % tCount;
    const img = townPiece(k);
    ctx.drawImage(img, Math.round(i * tSpacing - tOff + hash(k + 3) * tSpacing * 0.4), groundY - img.height + 1);
  }
  ctx.globalAlpha = 0.25; rect(ctx, 0, groundY - 14, bw, 14, '#f8b464'); ctx.globalAlpha = 1;

  // A helicopter silhouette drifting past
  const hx = Math.round((((t * 9 - camAX * 0.15) % (bw + 60)) + bw + 60) % (bw + 60)) - 30;
  const hy = Math.round(groundY - 120 - camAY * 0.05);
  rect(ctx, hx, hy, 7, 4, '#3a1440'); rect(ctx, hx - 7, hy + 1, 7, 1, '#3a1440');
  rect(ctx, hx - 4 + (Math.floor(t * 20) % 2) * 2, hy - 2, 14, 1, '#3a1440');

  // Palms and saguaros in front
  const count = 36;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    if (hash(k + 70) > 0.75) continue;
    const img = nearPiece(k);
    ctx.drawImage(img, Math.round(i * spacing - jOff + hash(k) * spacing * 0.5) - 15, groundY - img.height + 3);
  }
}

// Drifting desert dust in the heat.
function weather(ctx, bw, bh, camAX, camAY) {
  const t = performance.now() / 1000;
  const n = Math.min(40, Math.floor((bw * bh) / 7000));
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < n; i++) {
    const y = ((hash(i * 5 + 2) * (bh + 20) + Math.sin(t * 0.7 + i) * 6 + camAY * 0.3) % (bh + 20)) - 10;
    const x = Math.round((((hash(i * 5 + 3) * (bw + 40) + t * (14 + hash(i) * 10) - camAX * 0.4) % (bw + 40)) + bw + 40) % (bw + 40)) - 20;
    ctx.fillStyle = i % 2 ? C.sandLight : C.sand;
    ctx.fillRect(x, Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

// Scaffold poles and a tarp.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = C.tinDark;
  for (let sx = x + 1; sx < x + w; sx += 7) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(x, sy, w, 1);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#3a6aa8'; ctx.fillRect(x + 2, y + 2, Math.floor(w * 0.4), Math.floor(h * 0.4)); ctx.globalAlpha = 1;
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  const t = team(b.faction);
  if (cops(b.faction)) {
    if (b.type === 'hq') {
      const on = tick % 4 < 2;
      rect(ctx, x + 21, y + 29, 4, 3, on ? '#7aa8ff' : '#3a6ae8'); rect(ctx, x + 39, y + 29, 4, 3, on ? '#3a6ae8' : '#7aa8ff');
    } else if (b.type === 'mine') {
      if (tick % 6 < 3) { ctx.globalAlpha = 0.35; disc(ctx, x + 16, y + 8, 9, C.icing); ctx.globalAlpha = 1; }
    } else if (b.type === 'turret') {
      rect(ctx, x + 11, y + 2, 2, 3, tick % 2 ? C.red : '#3a6ae8'); rect(ctx, x + 13, y + 2, 2, 3, tick % 2 ? '#3a6ae8' : C.red);
    } else if (b.type === 'airbase') {
      rect(ctx, x + 64, y + 4 + (tick % 2), 1, 2, C.fire);
    }
    return;
  }
  if (b.type === 'mine') {
    // The neon dollar flickers now and then
    if (tick % 23 !== 0) {
      const col = C.neonGreen;
      rect(ctx, x + 10, y + 19, 3, 1, col); rect(ctx, x + 9, y + 20, 1, 1, col); rect(ctx, x + 10, y + 21, 2, 1, col);
      rect(ctx, x + 12, y + 22, 1, 1, col); rect(ctx, x + 9, y + 23, 3, 1, col); rect(ctx, x + 11, y + 18, 1, 7, col);
    }
  } else if (b.type === 'hq') {
    // The bell tower lamp and lit windows glow
    if (tick % 10 < 5) rect(ctx, x + 31, y + 5, 2, 1, C.yellow);
  } else if (b.type === 'workshop') {
    // Welding sparks under the car
    if (tick % 3 === 0) { rect(ctx, x + 22 + (tick % 5), y + 29, 1, 1, C.yellow); rect(ctx, x + 24, y + 28 - (tick % 2), 1, 1, C.white); }
  } else if (b.type === 'turret') {
    // The spotlight sweeps
    ctx.globalAlpha = 0.18;
    const sw = Math.sin(ms / 900) * 6;
    for (let i = 0; i < 12; i++) rect(ctx, x + 9 - i - Math.round(sw * i / 12), y + 8 + i, 2 + Math.floor(i / 3), 1, C.glass);
    ctx.globalAlpha = 1;
  } else if (b.type === 'airbase') {
    rect(ctx, x + 64, y + 4 + (tick % 2), 1, 2, C.fire);
  } else if (b.type === 'barracks') {
    if (tick % 8 < 4) rect(ctx, x + 8, y + 17, 4, 3, t.light);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  if (p.kind === 'bullet') {
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, 'rgba(242,200,74,0.4)');
    rect(ctx, x - dx, y - dy, 1, 1, C.yellow);
    rect(ctx, x, y, 2, 1, C.white);
  } else if (p.kind === 'bomb') {
    rect(ctx, x - 1, y - 2, 3, 4, C.O);
    rect(ctx, x - 1, y - 2, 2, 3, C.khaki);
    rect(ctx, x - 2, y - 3, 5, 1, C.gun);
  } else if (p.kind === 'lob') {
    // Improvised rocket with a smoky tail
    rect(ctx, x - dx * 3, y - dy * 3, 2, 2, 'rgba(207,196,192,0.5)');
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.yellow);
    rect(ctx, x - dx, y - dy, 1, 1, C.fire);
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, C.red);
  } else {
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, 'rgba(207,196,192,0.5)');
    rect(ctx, x - dx, y - dy, 1, 1, C.fire);
    rect(ctx, x - 1, y - 1, 3, 2, C.O);
    rect(ctx, x, y - 1, 2, 1, C.goldDark);
  }
}

function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(14, 6);
  if (cops(e.f) && e.type === 'scout') {
    outlined(g, [[1, 2, 10, 3, '#8a5a32'], [11, 2, 2, 2, '#5a3a22']], [[3, 2, 5, 2, t.main]]);
    return { c, ax: 7, ay: 5 };
  }
  const shirt = cops(e.f) ? (e.type === 'soldier' ? C.pastelTeal : e.type === 'engineer' ? C.white : C.navy)
    : e.type === 'soldier' ? t.main : e.type === 'sniper' ? C.suit : e.type === 'scout' ? C.white : e.type === 'heavy' ? C.khaki : t.uni;
  outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, shirt], [11, 3, 2, 2, C.boot]], [[0, 1, 2, 2, C.hair], [5, 3, 2, 1, t.dark]]);
  return { c, ax: 7, ay: 5 };
}

export default {
  id: 'cartel',
  name: 'Cartel Wars',
  sides: [
    {
      id: 'cartel', name: 'The Cartel', short: 'Cartel',
      blurb: 'Loud shirts, gold chains, homemade armour and a perfectly legitimate taco stand.',
      win: 'Business is booming. Tacos for everyone.',
      lose: 'The taco stand is closed for… inspection.',
    },
    {
      id: 'cops', name: 'The Cops', short: 'Cops', plural: true,
      blurb: 'Pastel blazers, a K-9 unit, a blimp, the Academy and a donut shop. Two days from retirement, every one of them.',
      names: {
        soldier: 'Vice Cop', heavy: 'SWAT', scout: 'K-9', engineer: 'Forensics', sniper: 'Sharpshooter',
        jeep: 'Police Cruiser', tank: 'SWAT Truck', artillery: 'Riot Van', helicopter: 'Police Chopper', bomber: 'Police Blimp',
        hq: 'Precinct', barracks: 'Police Academy', turret: 'Checkpoint', wall: 'Barricade', mine: 'Donut Shop',
        workshop: 'Impound Lot', airbase: 'Air Unit', sam: 'Air Defence Unit', bridge: 'Plank Bridge', ramp: 'Loading Ramp',
      },
      icons: { hq: '🚓', barracks: '🎓', turret: '🚨', wall: '🚧', mine: '🍩', workshop: '🚗', airbase: '🚁', sam: '🚨' },
      win: 'Case closed. Somebody bring the donuts.',
      lose: 'Turn in your badge. And your blazer.',
    },
  ],
  palette,
  teamBase: FATIGUES,
  roofBase: [0.3, 0.2, 0.18],
  soldier: buildSoldier,
  vehicle: { jeep: buildTechnical, tank: buildMonstruo, artillery: buildRocketTruck },
  aircraft: { helicopter: buildChopper, bomber: buildPlane },
  buildings: Object.fromEntries(Object.keys(BUILD).map((k) => [k, (g, t, f) => (cops(f) && COP_BUILD[k] ? COP_BUILD[k] : BUILD[k])(g, t, f)])),
  drawTile,
  surface,
  background,
  weather,
  skyTop: palette.sky[0],
  rotor,
  construction,
  animate,
  projectile,
  explosion: { rim: '#d8322a', body: '#f28a30', core: '#ffe27a', smoke: '#5a4a4e', smoke2: '#8a7a7a' },
  corpse,
  debris: { '#7a4a24': '#e4cca4', '#5c361a': '#c4522e' },
  minimap: { sky: '#7a2066', ground: '#8a5434', platform: '#a8542a', bridge: '#a47448', ramp: '#7a5234', surface: '#d8b878' },
  names: {
    soldier: 'Gunman', heavy: 'Enforcer', scout: 'Lookout', engineer: 'Mechanic', sniper: 'Sicario',
    jeep: 'Technical', tank: 'Monstruo', artillery: 'Rocket Truck', helicopter: 'Narco Chopper', bomber: 'Smuggler Plane',
    hq: 'Hacienda', barracks: 'Safe House', turret: 'Watchtower', wall: 'Sandbags', mine: 'Taco Stand', workshop: 'Chop Shop',
    airbase: 'Airstrip', sam: 'Bottle Rocket Stand', bridge: 'Plank Bridge', ramp: 'Loading Ramp',
  },
  // Units are shown with their own sprites in menus.
  spriteIcons: true,
  icons: { hq: '🏠', barracks: '🏚️', turret: '🔦', wall: '🧱', mine: '🌮', workshop: '🔧', airbase: '🛬', bridge: '🌉', ramp: '🪜', sam: '🎆' },
};
