// Gangsters: 1930s Chicago at dusk, with a Bugsy Malone-style twist — the
// tommy guns splurge custard, the artillery lobs cream pies, and nobody gets
// hurt, they just get splatted. Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team, sideOf, missileRack } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#151015',                        // outline
  skin: '#efbf8c', skinDark: '#c38a5a',
  boot: '#141414', gun: '#2a2420', gunLight: '#6a5a48', wood: '#7a4e2a', woodLight: '#a8703c', woodDark: '#4e321a',
  yellow: '#ffd84a', yellowDark: '#d2a520', red: '#c8283a', redDark: '#7a1420', white: '#f6f2e6',
  sky: ['#1c1a3c', '#2c2450', '#46305e', '#6a3a62', '#9a4a5e', '#d0705a', '#eea060'],
  suit: '#2c2c36', suitLight: '#45455a', suitDark: '#1a1a22', stripe: '#5a5a70',
  hat: '#3a3440', coat: '#6a5a4a', coatDark: '#4a3e32', vest: '#5a4636', overall: '#4a5a6e', overallDark: '#34404e',
  cap: '#6a5638', breeches: '#7a6a4c', shirt: '#ece6d6',
  custard: '#ffd84a', cream: '#fff6d2', jam: '#e05a7a', tin: '#b8b4a8',
  brick: '#8a3e2e', brickLight: '#a85440', brickDark: '#5e281e', mortar: '#3e2620',
  concrete: '#9a968c', concreteLight: '#bcb8ae', concreteDark: '#6a665e',
  girder: '#2e3e34', girderLight: '#4a5e50', girderDark: '#1c2620', rivet: '#6a7e70',
  metal: '#8e9296', metalLight: '#c4c8cc', metalDark: '#55595e', chrome: '#d8dcdf',
  glass: '#ffd890', glassDark: '#c89a50', neon: '#ff5a8a',
  dirt: '#4a3a30', dirtMid: '#3c2e26', dirtDeep: '#2e231c', pebble: '#6a5a4a', pebbleDark: '#221a14',
  // The Feds: marble, trench coats, ledgers and slate-grey government steel
  marble: '#e8e4da', marbleShade: '#c4beb0', marbleDark: '#8e887c', bronze: '#9a6a2a',
  trench: '#b09c74', trenchDark: '#82714e', fedHat: '#5a5040', bowler: '#24242a',
  navy: '#2a3450', navyLight: '#3e4a6a', slate: '#4a5268', slateLight: '#6a7490', slateDark: '#343a4c',
  eyeshade: '#3a9a5a', ledger: '#2a5a3a', paper: '#f4f0e0', ink: '#3a3a4a', siren: '#ff3a3a',
  pigeon: '#8a8c9a', pigeonLight: '#b0b2be', pigeonDark: '#62646e', pigeonNeck: '#4a8a7a', pink: '#e08080',
  shadow: 'rgba(0,0,0,0.3)',
};
const feds = (f) => sideOf(f) === 'feds';
const PINSTRIPE = [0.2, 0.2, 0.25];

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right — the same frame as Classic.
function fedora(parts, details, t, col = C.hat) {
  parts.push([4, 3, 10, 1, col], [6, 0, 6, 3, col]);
  details.push([6, 2, 6, 1, t.main], [7, 0, 4, 1, C.suitLight]);
}

function mobSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const shoes = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  const spats = shoes.map(([x, y]) => [x, y, 1, 1, C.white]);
  let parts;
  let details;
  if (type === 'heavy') {
    // Muscle: shirtsleeves and waistcoat, flat cap, custard blunderbuss
    parts = [
      ...legs.map((l) => [...l, C.suitDark]), ...shoes.map((b) => [...b, C.boot]),
      [4, 8, 9, 4, C.shirt], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, C.cap], [11, 3, 3, 1, C.cap],
      [11, 9, 6, 2, C.gun], [16, 7, 3, 5, C.metal],
    ];
    details = [
      [6, 8, 5, 4, C.vest], [8, 8, 1, 4, C.O], [10, 5, 1, 1, C.O], [7, 6, 5, 2, C.skinDark],
      [5, 1, 8, 1, '#8a7450'], [5, 3, 8, 1, t.main], [17, 8, 2, 3, C.cream], [18, 9, 1, 1, C.custard],
      [12, 10, 3, 1, C.custard], [4, 9, 2, 2, C.skinDark],
    ];
  } else if (type === 'scout') {
    // Newsie: paperboy cap, braces, satchel of papers, a pie to throw
    parts = [
      ...legs.map((l) => [...l, C.breeches]), ...shoes.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.shirt], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, t.main], [11, 3, 3, 1, t.dark],
      [2, 9, 3, 3, C.white], [12, 7, 4, 2, C.tin],
    ];
    details = [
      [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [6, 8, 1, 4, C.wood], [10, 8, 1, 4, C.wood],
      [6, 1, 6, 1, t.light], [2, 10, 3, 1, '#9a9a9a'], [12, 7, 4, 1, C.cream], [13, 6, 2, 1, C.cream], [14, 6, 1, 1, C.jam],
    ];
  } else if (type === 'engineer') {
    // Mechanic: overalls, cap turned back, a big wrench
    parts = [
      ...legs.map((l) => [...l, C.overall]), ...shoes.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.overall], [6, 3, 6, 5, C.skin], [6, 1, 7, 3, C.hat], [4, 3, 3, 1, C.hat],
      [11, 9, 5, 1, C.metal], [15, 8, 2, 3, C.metal],
    ];
    details = [
      [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [6, 8, 1, 2, C.overallDark], [10, 8, 1, 2, C.overallDark],
      [7, 10, 3, 1, t.main], [7, 11, 2, 1, t.light], [16, 9, 1, 1, C.metalDark], [8, 5, 1, 1, '#4a3a30'],
    ];
  } else if (type === 'sniper') {
    // Hitman: trench coat, low fedora, long custard rifle with a scope
    parts = [
      ...legs.map((l) => [...l, C.suitDark]), ...shoes.map((b) => [...b, C.boot]),
      [4, 8, 8, 6, C.coat], [6, 3, 6, 5, C.skin], [10, 9, 9, 1, C.gun], [13, 8, 3, 1, C.metalDark],
    ];
    details = [
      [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [7, 8, 1, 6, C.coatDark], [4, 11, 8, 1, C.coatDark],
      [9, 8, 2, 1, C.coatDark], [18, 9, 1, 1, C.custard], [6, 4, 6, 1, C.skinDark],
    ];
    fedora(parts, details, t, C.suitDark);
  } else {
    // Hood: pinstripe suit, team tie, fedora, tommy gun full of custard
    parts = [
      ...legs.map((l) => [...l, C.suit]), ...shoes.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.suit], [6, 3, 6, 5, C.skin], [11, 9, 7, 1, C.gun], [12, 10, 3, 2, C.yellowDark], [17, 8, 1, 2, C.gun],
    ];
    details = [
      [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [7, 8, 3, 1, C.shirt], [8, 8, 1, 3, t.main],
      [6, 9, 1, 3, C.stripe], [10, 9, 1, 3, C.stripe], [13, 10, 1, 1, C.custard], [11, 9, 1, 1, C.woodLight],
    ];
    fedora(parts, details, t);
  }
  outlined(g, parts, [...details, ...spats]);
  return { c, ax: 8, ay: 16 };
}

// ── Vehicles & aircraft ────────────────────────────────────────────────────
// Whitewall tyre with a chrome hub; the hub mark turns between frames.
function whitewall(g, x, y, r, frame) {
  disc(g, x, y, r, C.O);
  disc(g, x, y, r - 1, '#1c1c1c');
  disc(g, x, y, r - 2, C.white);
  disc(g, x, y, Math.max(1, r - 3), C.chrome);
  g.fillStyle = C.metalDark; g.fillRect(x + (frame ? 0 : -1), y + (frame ? -1 : 0), 1, 1);
}

// Getaway car: a long-nosed black sedan, running board, spare wheel, and a
// hood leaning out of the window.
function mobCar(f, frame) {
  const t = team(f);
  const [c, g] = canvas(28, 15);
  outlined(g, [
    [2, 6, 23, 4, '#1d1d24'], [6, 2, 10, 5, '#1d1d24'], [16, 5, 9, 2, '#1d1d24'], [1, 6, 3, 3, C.metalDark],
    [3, 10, 21, 1, C.metalDark], [24, 6, 2, 2, C.chrome], [11, 0, 4, 3, C.hat],
  ], [
    [7, 3, 4, 3, C.glassDark], [12, 3, 3, 3, C.glassDark], [12, 3, 3, 1, C.skin], [11, 2, 4, 1, t.main],
    [2, 8, 23, 1, t.main], [16, 5, 9, 1, '#3a3a46'], [25, 7, 1, 1, C.glass], [6, 2, 10, 1, '#3a3a46'],
    [15, 4, 4, 1, C.gun], [18, 4, 1, 1, C.custard],
  ]);
  whitewall(g, 7, 11, 3, frame);
  whitewall(g, 20, 11, 3, frame);
  return { c, ax: 13, ay: 14 };
}

// Pie wagon: a bakery delivery truck with a custard cannon on the roof.
function mobPieWagon(f, frame) {
  const t = team(f);
  const [c, g] = canvas(34, 19);
  outlined(g, [
    [2, 5, 20, 10, '#efe2b8'], [22, 8, 8, 7, t.dark], [24, 7, 5, 2, t.dark], [30, 11, 2, 3, C.chrome],
    [7, 1, 13, 3, C.metalDark], [19, 2, 9, 2, C.gun], [3, 14, 28, 1, C.metalDark],
  ], [
    [2, 5, 20, 1, C.white], [2, 8, 20, 2, t.main], [9, 11, 6, 3, C.tin], [10, 11, 4, 1, C.cream], [11, 10, 2, 1, C.jam],
    [24, 9, 4, 3, C.glassDark], [24, 9, 4, 1, C.glass], [8, 1, 11, 1, C.metal], [27, 2, 1, 2, C.custard],
    [22, 8, 8, 1, t.main], [31, 12, 1, 1, C.glass],
  ]);
  whitewall(g, 8, 15, 3, frame);
  whitewall(g, 25, 15, 3, frame);
  return { c, ax: 15, ay: 18 };
}

// Pie lobber: a flatbed truck with a spring-loaded pie catapult.
function mobPieLobber(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 19);
  outlined(g, [
    [2, 10, 20, 3, C.wood], [21, 6, 7, 7, t.dark], [27, 9, 2, 3, C.chrome],
    [8, 6, 3, 4, C.metalDark], [5, 8, 3, 2, C.metal], [3, 6, 3, 2, C.metal], [1, 3, 4, 3, C.tin], [12, 4, 6, 6, '#d8ccb0'],
  ], [
    [2, 10, 20, 1, C.woodLight], [22, 7, 4, 3, C.glassDark], [22, 7, 4, 1, C.glass], [21, 11, 7, 1, t.main],
    [1, 2, 4, 1, C.cream], [2, 1, 2, 1, C.cream], [3, 2, 1, 1, C.jam], [12, 4, 6, 1, C.white],
    [13, 6, 4, 1, C.cream], [13, 8, 4, 1, C.cream], [8, 7, 3, 1, t.main],
  ]);
  whitewall(g, 7, 15, 3, frame);
  whitewall(g, 22, 15, 3, frame);
  return { c, ax: 13, ay: 18 };
}

// Autogyro: a little open-cockpit flyer (rotor and propeller spin live).
function mobAutogyro(f) {
  const t = team(f);
  const [c, g] = canvas(30, 15);
  outlined(g, [
    [6, 5, 17, 4, t.main], [23, 5, 3, 4, C.metalDark], [1, 3, 5, 3, t.dark], [2, 6, 6, 2, t.main],
    [12, 3, 4, 2, C.cap], [14, 0, 1, 5, C.metalDark], [10, 9, 1, 3, C.metalDark], [17, 9, 1, 3, C.metalDark],
  ], [
    [6, 5, 17, 1, t.light], [13, 3, 2, 1, C.skin], [12, 3, 4, 1, '#8a7450'], [15, 4, 1, 1, C.glass],
    [8, 7, 13, 1, C.white], [9, 11, 3, 1, C.O], [16, 11, 3, 1, C.O],
  ]);
  return { c, ax: 14, ay: 12 };
}

// Blimp: a silver airship in team stripes with a gondola (props spin live).
function mobBlimp(f) {
  const t = team(f);
  const [c, g] = canvas(42, 19);
  outlined(g, [
    [6, 2, 30, 9, '#c8c0b0'], [3, 4, 4, 5, '#c8c0b0'], [35, 4, 4, 5, '#c8c0b0'], [1, 1, 4, 4, t.dark], [1, 8, 4, 4, t.dark],
    [15, 11, 12, 4, C.suit], [20, 15, 3, 1, C.metalDark],
  ], [
    [6, 2, 30, 1, C.white], [8, 3, 26, 1, '#ddd6c6'], [6, 6, 30, 2, t.main], [15, 6, 12, 2, C.white],
    [17, 6, 1, 2, t.dark], [20, 6, 1, 2, t.dark], [23, 6, 1, 2, t.dark], [6, 10, 30, 1, '#9a9282'],
    [16, 12, 2, 1, C.glass], [19, 12, 2, 1, C.glass], [22, 12, 2, 1, C.glass], [25, 12, 1, 1, C.glass],
  ]);
  return { c, ax: 21, ay: 15 };
}

// ── The Feds: Prohibition-era G-men (still firing custard) ─────────────────
function fedSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const shoes = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'scout') {
    // Stool Pigeon: a tip-off pigeon in a tiny fedora, note in its beak
    const pl = frame ? [[7, 13, 1, 2], [10, 13, 1, 2]] : [[6, 13, 1, 2], [9, 13, 1, 2]];
    parts = [
      ...pl.map((l) => [...l, C.pink]), ...pl.map(([x]) => [x - 1, 15, 3, 1, C.pink]),
      [1, 9, 4, 2, C.pigeonDark], [4, 7, 9, 6, C.pigeon], [10, 3, 5, 6, C.pigeon],
      [15, 5, 2, 1, '#d8b48a'], [15, 6, 3, 2, C.paper], [9, 2, 7, 1, C.fedHat], [11, 0, 4, 2, C.fedHat],
    ];
    details = [
      [13, 4, 1, 1, C.O], [10, 6, 3, 2, C.pigeonNeck], [11, 7, 2, 1, '#8a6aa8'], [10, 8, 3, 1, t.main],
      [5, 8, 5, 1, C.pigeonLight], [5, 10, 6, 1, C.pigeonDark], [6, 11, 4, 1, C.pigeonDark], [1, 9, 4, 1, C.pigeon],
      [11, 1, 4, 1, t.main], [16, 7, 1, 1, C.ink], [pl[0][0], 13, 1, 1, t.main],
    ];
    outlined(g, parts, details);
    return { c, ax: 8, ay: 16 };
  }
  if (type === 'heavy') {
    // Dry Agent: bowler hat, braces, a confiscated barrel turned custard cannon, axe on his back
    parts = [
      ...legs.map((l) => [...l, '#3a3a44']), ...shoes.map((b) => [...b, C.boot]),
      [2, 4, 1, 8, C.woodLight], [1, 3, 3, 2, C.metal],
      [4, 8, 9, 4, C.shirt], [6, 3, 6, 5, C.skin], [7, 0, 4, 1, C.bowler], [6, 1, 6, 2, C.bowler], [5, 3, 8, 1, C.bowler],
      [11, 8, 6, 4, C.wood], [17, 9, 2, 2, C.metal],
    ];
    details = [
      [10, 5, 1, 1, C.O], [7, 6, 5, 2, C.skinDark], [9, 6, 3, 1, '#4a3a30'], [6, 2, 6, 1, t.main],
      [6, 8, 1, 4, t.main], [10, 8, 1, 4, t.main], [4, 9, 2, 2, C.skinDark],
      [11, 9, 6, 1, C.woodLight], [12, 8, 1, 4, C.metalDark], [15, 8, 1, 4, C.metalDark],
      [18, 9, 1, 1, C.custard], [18, 11, 1, 1, C.custard], [1, 3, 3, 1, C.metalLight],
    ];
  } else if (type === 'engineer') {
    // The Accountant: green eyeshade, specs, bow tie, ledger and a very sharp pencil
    parts = [
      ...legs.map((l) => [...l, '#4a4a52']), ...shoes.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.shirt], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, '#4a3a30'], [5, 2, 7, 1, C.eyeshade], [11, 3, 3, 1, C.eyeshade],
      [2, 8, 3, 5, C.ledger], [11, 9, 6, 1, C.yellow],
    ];
    details = [
      [9, 5, 3, 1, '#2a2a2a'], [10, 5, 1, 1, '#bfe0f0'], [7, 7, 4, 1, C.skinDark],
      [6, 8, 5, 4, '#6a6a78'], [8, 8, 1, 4, C.shirt], [7, 8, 3, 1, t.main], [6, 11, 5, 1, '#55555f'],
      [2, 10, 3, 1, t.main], [2, 8, 1, 5, C.paper], [11, 9, 1, 1, C.jam], [16, 9, 1, 1, C.woodLight],
      [5, 2, 7, 1, C.eyeshade], [6, 2, 5, 1, '#5ac07a'],
    ];
  } else if (type === 'sniper') {
    // Marksman: navy suit, star badge, campaign hat, scoped custard rifle
    parts = [
      ...legs.map((l) => [...l, C.navy]), ...shoes.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.navy], [6, 3, 6, 5, C.skin], [7, 9, 4, 2, C.wood], [11, 9, 8, 1, C.gun], [12, 8, 4, 1, C.metalDark],
      [3, 3, 12, 1, C.trench], [6, 0, 6, 3, C.trench],
    ];
    details = [
      [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [6, 8, 3, 1, C.navyLight], [6, 10, 1, 1, C.yellow],
      [5, 11, 7, 1, t.main], [6, 2, 6, 1, t.main], [8, 0, 2, 1, C.trenchDark], [15, 8, 1, 1, '#bfe0f0'],
      [18, 9, 1, 1, C.custard], [7, 9, 4, 1, C.woodLight],
    ];
  } else {
    // G-Man: tan trench coat, team belt, gold badge, custard tommy gun
    parts = [
      ...legs.map((l) => [...l, C.suitDark]), ...shoes.map((b) => [...b, C.boot]),
      [4, 8, 8, 5, C.trench], [6, 3, 6, 5, C.skin], [11, 9, 7, 1, C.gun], [12, 10, 3, 2, C.metalDark], [17, 8, 1, 2, C.gun],
    ];
    details = [
      [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [6, 8, 1, 2, C.trenchDark], [9, 8, 2, 2, C.trenchDark],
      [7, 8, 2, 1, C.shirt], [4, 11, 8, 1, t.main], [7, 9, 1, 1, C.yellow], [8, 12, 1, 1, C.trenchDark],
      [13, 10, 1, 1, C.custard], [11, 9, 1, 1, C.woodLight], [17, 8, 1, 1, C.custard],
    ];
    fedora(parts, details, t, C.fedHat);
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// Plain steel government wheels (the Feds don't do whitewalls).
function steelWheel(g, x, y, r, frame) {
  disc(g, x, y, r, C.O);
  disc(g, x, y, r - 1, '#1c1c1c');
  disc(g, x, y, Math.max(1, r - 2), C.metalDark);
  g.fillStyle = C.metal; g.fillRect(x, y, 1, 1);
  g.fillStyle = C.metalLight; g.fillRect(x + (frame ? 1 : -1), y + (frame ? -1 : 1), 1, 1);
}

// Squad car: a black Ford with white doors, a red siren and an agent at the wheel.
function fedSquadCar(f, frame) {
  const t = team(f);
  const [c, g] = canvas(28, 15);
  outlined(g, [
    [2, 6, 23, 4, '#16161c'], [6, 2, 10, 5, '#16161c'], [16, 5, 9, 2, '#16161c'], [1, 6, 3, 3, C.metalDark],
    [3, 10, 21, 1, C.metalDark], [24, 6, 2, 2, C.chrome], [10, 0, 2, 2, C.siren],
  ], [
    [7, 3, 4, 3, C.glassDark], [12, 3, 3, 3, C.glassDark], [12, 4, 3, 2, C.skin], [12, 3, 3, 1, C.fedHat],
    [7, 6, 9, 3, C.white], [2, 8, 23, 1, t.main], [11, 7, 2, 1, C.yellow], [16, 5, 9, 1, '#34343e'],
    [25, 7, 1, 1, C.glass], [6, 2, 10, 1, '#34343e'], [10, 0, 1, 1, '#ffb0b0'],
  ]);
  steelWheel(g, 7, 11, 3, frame);
  steelWheel(g, 20, 11, 3, frame);
  return { c, ax: 13, ay: 14 };
}

// Paddy wagon: an armoured navy van with barred windows and a custard cannon on the roof.
function fedPaddyWagon(f, frame) {
  const t = team(f);
  const [c, g] = canvas(34, 19);
  outlined(g, [
    [2, 4, 20, 10, C.navy], [22, 8, 8, 6, C.navy], [23, 6, 6, 3, C.navy], [30, 10, 2, 3, C.chrome], [3, 14, 28, 1, C.metalDark],
    [7, 1, 6, 3, C.metalDark], [12, 1, 13, 2, C.gun], [26, 5, 2, 1, C.siren],
  ], [
    [2, 4, 20, 1, C.navyLight], [2, 11, 20, 1, t.main], [2, 12, 20, 1, t.dark],
    [4, 6, 5, 4, '#14141a'], [5, 6, 1, 4, C.metal], [7, 6, 1, 4, C.metal], [12, 6, 5, 4, '#14141a'], [13, 6, 1, 4, C.metal], [15, 6, 1, 4, C.metal],
    [18, 6, 3, 3, C.yellow], [19, 7, 1, 1, C.yellowDark], [3, 8, 1, 2, C.chrome],
    [24, 9, 4, 3, C.glassDark], [24, 9, 4, 1, C.glass], [22, 12, 8, 1, t.main], [31, 11, 1, 1, C.glass],
    [8, 1, 4, 1, C.metal], [24, 1, 1, 2, C.custard], [12, 1, 13, 1, '#4a4038'],
  ]);
  steelWheel(g, 8, 15, 3, frame);
  steelWheel(g, 25, 15, 3, frame);
  return { c, ax: 15, ay: 18 };
}

// Pie trebuchet: a flatbed with a wooden throwing arm, counterweighted by an evidence safe.
function fedTrebuchet(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 20);
  outlined(g, [
    [2, 11, 20, 3, C.wood], [21, 7, 7, 7, C.navy], [28, 10, 2, 3, C.chrome], [3, 14, 26, 1, C.metalDark],
    [7, 6, 2, 5, C.woodDark], [12, 6, 2, 5, C.woodDark],
    [2, 2, 3, 1, C.woodLight], [4, 3, 2, 1, C.woodLight], [6, 4, 2, 1, C.woodLight], [8, 5, 4, 1, C.woodLight], [12, 6, 2, 1, C.woodLight],
    [13, 7, 5, 4, C.metalDark], [1, 0, 4, 2, C.tin],
  ], [
    [2, 11, 20, 1, C.woodLight], [22, 8, 4, 3, C.glassDark], [22, 8, 4, 1, C.glass], [21, 12, 7, 1, t.main],
    [9, 5, 2, 1, C.metal], [13, 7, 5, 1, C.metal], [15, 8, 2, 2, '#3a3e42'], [16, 8, 1, 1, C.yellow], [13, 10, 5, 1, t.main],
    [1, 0, 4, 1, C.cream], [2, 0, 1, 1, C.jam], [7, 12, 7, 1, t.dark],
  ]);
  steelWheel(g, 7, 16, 3, frame);
  steelWheel(g, 23, 16, 3, frame);
  return { c, ax: 14, ay: 19 };
}

// Seaplane: a navy float biplane (the nose propeller spins live).
function fedSeaplane(f) {
  const t = team(f);
  const [c, g] = canvas(32, 16);
  outlined(g, [
    [2, 1, 4, 5, C.navy], [1, 6, 7, 2, C.navy], [6, 5, 21, 4, C.navy], [27, 4, 3, 5, C.metalDark],
    [7, 3, 3, 2, C.skin], [11, 2, 13, 2, t.main],
    [12, 9, 1, 3, C.metalDark], [21, 9, 1, 3, C.metalDark], [9, 12, 17, 2, C.marble],
  ], [
    [6, 5, 21, 1, C.navyLight], [6, 7, 21, 1, t.main], [15, 6, 2, 2, C.yellow], [3, 2, 2, 2, t.main],
    [7, 3, 3, 1, '#6a4a2a'], [9, 4, 1, 1, '#bfe0f0'], [11, 2, 13, 1, t.light], [28, 5, 1, 3, C.metal],
    [9, 13, 17, 1, C.marbleShade], [24, 12, 2, 1, C.white], [26, 8, 1, 1, C.custard],
  ]);
  return { c, ax: 16, ay: 13 };
}

// Bureau blimp: a slate-grey government airship with a gold star and a searchlight.
function fedBlimp(f) {
  const t = team(f);
  const [c, g] = canvas(42, 19);
  outlined(g, [
    [6, 2, 30, 9, C.slate], [3, 4, 4, 5, C.slate], [35, 4, 4, 5, C.slate], [1, 1, 4, 4, t.dark], [1, 8, 4, 4, t.dark],
    [15, 11, 12, 4, C.navy], [20, 15, 3, 1, C.metalDark],
  ], [
    [6, 2, 30, 1, C.slateLight], [8, 3, 26, 1, '#5a6280'], [6, 6, 30, 2, t.main], [6, 10, 30, 1, C.slateDark],
    [18, 3, 1, 6, C.slateDark], [24, 3, 1, 6, C.slateDark], [19, 3, 5, 3, C.yellow], [20, 6, 3, 2, C.yellow], [21, 8, 1, 1, C.yellow],
    [21, 4, 1, 3, t.dark], [19, 3, 5, 1, '#fff0a0'],
    [16, 12, 2, 1, C.glass], [19, 12, 2, 1, C.glass], [22, 12, 2, 1, C.glass], [25, 12, 1, 1, C.glass], [15, 14, 12, 1, t.main],
    [21, 15, 1, 1, C.glass],
  ]);
  return { c, ax: 21, ay: 15 };
}

const buildSoldier = (type, f, frame) => (feds(f) ? fedSoldier : mobSoldier)(type, f, frame);
const buildCar = (f, frame) => (feds(f) ? fedSquadCar : mobCar)(f, frame);
const buildPieWagon = (f, frame) => (feds(f) ? fedPaddyWagon : mobPieWagon)(f, frame);
const buildPieLobber = (f, frame) => (feds(f) ? fedTrebuchet : mobPieLobber)(f, frame);
const buildAutogyro = (f) => (feds(f) ? fedSeaplane : mobAutogyro)(f);
const buildBlimp = (f) => (feds(f) ? fedBlimp : mobBlimp)(f);

// Spinning rotor and propellers, drawn live.
function rotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 50);
  const s = u.facing;
  if (u.type === 'helicopter' && feds(u.faction)) {
    // Seaplane nose propeller
    const px = s > 0 ? x + 14 : x - 15;
    rect(ctx, px, y - 10 + (tick % 2 ? 0 : 2), 1, tick % 2 ? 7 : 3, '#d8d2c4');
  } else if (u.type === 'helicopter') {
    const half = tick % 2 ? 13 : 6;
    rect(ctx, x - half, y - 12, half * 2, 1, '#e8e2d4');
    const px = s > 0 ? x + 12 : x - 13;
    rect(ctx, px, y - 7 - (tick % 2 ? 2 : 0), 1, tick % 2 ? 5 : 2, '#d8d2c4');
  } else {
    for (const dx of [-8, 8]) rect(ctx, x + dx, y + 1 + (tick % 2 ? -1 : 0), 1, tick % 2 ? 3 : 1, '#d8d2c4');
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
function brickWall(g, x, y, w, h) {
  g.fillStyle = C.brick; g.fillRect(x, y, w, h);
  g.fillStyle = C.mortar;
  for (let yy = y + 2; yy < y + h; yy += 3) {
    g.fillRect(x, yy, w, 1);
    for (let xx = x + ((yy / 3) % 2 ? 1 : 4); xx < x + w; xx += 6) g.fillRect(xx, yy - 2, 1, 2);
  }
}

function lit(g, x, y, w, h) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = C.glass; g.fillRect(x, y, w, h);
  g.fillStyle = C.glassDark; g.fillRect(x, y + h - 1, w, 1);
}

function awning(g, x, y, w, t) {
  for (let i = 0; i < w; i++) {
    g.fillStyle = Math.floor(i / 3) % 2 ? C.white : t.main;
    g.fillRect(x + i, y, 1, 3);
  }
  g.fillStyle = C.O; g.fillRect(x, y + 3, w, 1);
  for (let i = 0; i < w; i += 3) g.fillRect(x + i, y + 4, 1, 1);
}

const BUILD = {
  hq(g, t) {
    // The speakeasy: brick club, deco cornice, blade sign and a marquee
    outlined(g, [[4, 10, 56, 38, C.brick], [2, 6, 60, 5, C.concrete], [44, 0, 8, 26, t.dark]], [
      [2, 6, 60, 1, C.concreteLight], [2, 10, 60, 1, C.concreteDark],
    ]);
    brickWall(g, 5, 12, 54, 35);
    for (const x of [8, 18, 38, 50]) lit(g, x, 15, 6, 6);
    g.fillStyle = C.suit; g.fillRect(9, 17, 2, 4); g.fillRect(51, 17, 2, 4);
    // Blade sign: CLUB in team neon
    g.fillStyle = C.O; g.fillRect(44, 0, 8, 26);
    g.fillStyle = t.dark; g.fillRect(45, 1, 6, 24);
    g.fillStyle = t.light;
    for (let i = 0; i < 4; i++) g.fillRect(46, 3 + i * 6, 4, 4);
    g.fillStyle = t.main;
    for (let i = 0; i < 4; i++) g.fillRect(47, 4 + i * 6, 2, 2);
    // Marquee and door
    outlined(g, [[16, 26, 30, 4, C.concreteDark]], [[16, 26, 30, 1, C.concreteLight]]);
    outlined(g, [[25, 32, 12, 16, '#3a2216']], [[30, 32, 1, 16, C.O], [27, 36, 2, 1, C.glass], [33, 38, 1, 1, C.yellow]]);
    g.fillStyle = C.O; g.fillRect(26, 30, 10, 2);
    g.fillStyle = t.main; g.fillRect(27, 30, 8, 1);
    for (const x of [4, 54]) { outlined(g, [[x, 42, 6, 6, C.concrete]], [[x, 42, 6, 1, C.concreteLight]]); }
  },
  barracks(g, t) {
    // Pool hall: brick front, big window with a green table, striped awning
    outlined(g, [[2, 6, 44, 26, C.brick], [0, 3, 48, 4, C.concreteDark]], [[0, 3, 48, 1, C.concrete]]);
    brickWall(g, 3, 8, 42, 23);
    outlined(g, [[16, 4, 16, 6, t.dark]], [[17, 5, 14, 4, t.main], [18, 6, 2, 2, C.white], [22, 6, 2, 2, C.white], [26, 6, 2, 2, C.white]]);
    lit(g, 5, 14, 18, 10);
    g.fillStyle = '#2e6a3a'; g.fillRect(7, 20, 14, 3);
    g.fillStyle = C.wood; g.fillRect(7, 23, 2, 1); g.fillRect(19, 23, 2, 1);
    g.fillStyle = C.white; g.fillRect(10, 19, 1, 1); g.fillStyle = C.red; g.fillRect(14, 19, 1, 1);
    awning(g, 4, 11, 20, t);
    outlined(g, [[30, 18, 9, 14, '#3a2216']], [[31, 19, 7, 5, C.glassDark], [37, 25, 1, 1, C.yellow]]);
  },
  turret(g, t) {
    // Lookout: a rooftop water tower with a custard gun in the tank
    outlined(g, [
      [8, 18, 2, 14, C.metalDark], [22, 18, 2, 14, C.metalDark], [6, 7, 20, 12, C.wood], [24, 11, 8, 2, C.gun],
    ], [[6, 7, 20, 1, C.woodLight], [6, 10, 20, 1, C.metalDark], [6, 15, 20, 1, C.metalDark], [31, 11, 1, 2, C.custard],
      [10, 12, 12, 2, t.main]]);
    g.fillStyle = C.woodDark;
    for (let x = 8; x < 26; x += 3) g.fillRect(x, 8, 1, 10);
    for (let i = 0; i < 6; i++) {
      const w = 22 - (5 - i) * 4;
      g.fillStyle = C.O; g.fillRect(16 - w / 2 - 1, 1 + i, w + 2, 1);
      g.fillStyle = i % 2 ? C.woodDark : C.wood; g.fillRect(16 - w / 2, 1 + i, w, 1);
    }
    g.fillStyle = C.metalDark;
    for (let y = 20; y < 32; y += 4) { g.fillRect(9, y, 14, 1); }
    g.fillStyle = C.metal; g.fillRect(4, 18, 1, 14);
    for (let y = 19; y < 32; y += 2) g.fillRect(4, y, 3, 1);
  },
  wall(g, t) {
    // Stacked crates and a barrel
    const crate = (x, y, w, h) => {
      outlined(g, [[x, y, w, h, C.wood]], [[x, y, w, 1, C.woodLight], [x, y + Math.floor(h / 2), w, 1, C.woodDark]]);
      g.fillStyle = C.woodDark;
      for (let i = 0; i < Math.min(w, h); i++) g.fillRect(x + i, y + i, 1, 1);
    };
    crate(1, 20, 14, 12);
    crate(2, 9, 12, 11);
    outlined(g, [[4, 1, 8, 8, '#6a4a2c']], [[4, 3, 8, 1, C.metalDark], [4, 6, 8, 1, C.metalDark], [5, 1, 6, 1, '#8a6a44']]);
    g.fillStyle = t.main; g.fillRect(5, 24, 6, 2);
    g.fillStyle = C.white; g.fillRect(6, 13, 4, 2);
  },
  mine(g, t) {
    // The bakery: pies in the window, striped awning, chimney (steam live)
    outlined(g, [[3, 9, 26, 23, C.concreteLight], [22, 2, 4, 8, C.brick]], [[3, 9, 26, 1, C.white]]);
    outlined(g, [[6, 4, 16, 5, t.dark]], [[7, 5, 14, 3, C.white], [8, 6, 2, 1, t.main], [11, 6, 2, 1, t.main], [14, 6, 2, 1, t.main], [17, 6, 2, 1, t.main]]);
    lit(g, 5, 18, 14, 8);
    for (const x of [6, 10, 14]) { g.fillStyle = C.tin; g.fillRect(x, 23, 4, 2); g.fillStyle = C.cream; g.fillRect(x, 22, 4, 1); g.fillStyle = C.jam; g.fillRect(x + 1, 22, 1, 1); }
    awning(g, 4, 13, 24, t);
    outlined(g, [[21, 19, 6, 13, '#3a2216']], [[22, 20, 4, 4, C.glassDark], [25, 26, 1, 1, C.yellow]]);
  },
  workshop(g, t) {
    // Garage: brick, roll-up door, a team sign and an old petrol pump
    outlined(g, [[2, 8, 40, 24, C.brick], [0, 5, 44, 4, C.concreteDark]], [[0, 5, 44, 1, C.concrete]]);
    brickWall(g, 3, 10, 38, 21);
    outlined(g, [[10, 14, 24, 18, C.metal]], [[10, 14, 24, 1, C.metalLight]]);
    g.fillStyle = C.metalDark;
    for (let y = 17; y < 32; y += 3) g.fillRect(10, y, 24, 1);
    outlined(g, [[12, 6, 20, 5, t.dark]], [[13, 7, 18, 3, t.main], [14, 8, 16, 1, C.white]]);
    outlined(g, [[43, 18, 4, 14, C.red], [42, 15, 6, 4, C.white]], [[44, 20, 2, 3, C.glass], [43, 16, 4, 1, C.red]]);
    outlined(g, [[3, 26, 4, 6, C.redDark], [3, 22, 4, 4, '#3a5a8a']], [[3, 28, 4, 1, C.yellow]]);
  },
  sam(g, t, f) {
    if (feds(f)) {
      // Flak rocket post: a concrete emplacement with a radar dish
      outlined(g, [[3, 22, 26, 10, C.concrete], [9, 18, 14, 5, C.slate]], [[3, 22, 26, 1, C.concreteLight], [9, 18, 14, 1, C.slateLight], [3, 27, 26, 2, t.main]]);
      missileRack(g, { x: 13, y: 19, len: 13, rail: C.navy, body: C.white, tip: C.red, fin: C.navyLight, dish: [5, 13], mast: C.slate, dishCol: C.concreteLight });
    } else {
      // Firework stand: rockets on a rack over stacked crates
      outlined(g, [[2, 22, 13, 10, C.wood], [15, 24, 15, 8, C.woodDark], [8, 19, 16, 4, C.woodLight]], [[2, 22, 13, 1, C.woodLight], [15, 24, 15, 1, C.wood], [4, 25, 9, 1, C.woodDark], [17, 27, 11, 2, t.main]]);
      g.fillStyle = C.red; g.fillRect(4, 28, 3, 2); g.fillStyle = C.yellow; g.fillRect(8, 28, 3, 2);
      missileRack(g, { x: 13, y: 20, len: 12, rail: C.woodDark, body: C.red, tip: C.yellow, fin: C.white });
    }
  },
  airbase(g, t) {
    // Air dock: a lattice mooring mast for blimps beside a small hangar
    outlined(g, [[0, 16, 34, 16, C.concreteDark]], [[0, 16, 34, 1, C.concrete]]);
    for (let i = 0; i < 5; i++) {
      const w = 38 - (4 - i) * 6;
      g.fillStyle = C.O; g.fillRect(17 - w / 2 - 1, 11 + i, w + 2, 1);
      g.fillStyle = i % 2 ? t.roofDark : t.roof; g.fillRect(17 - w / 2, 11 + i, w, 1);
    }
    outlined(g, [[9, 22, 16, 10, '#2a2420']], [[16, 22, 1, 10, C.O]]);
    g.fillStyle = C.O; g.fillRect(45, 2, 9, 30);
    g.fillStyle = C.girder;
    g.fillRect(46, 3, 1, 29); g.fillRect(52, 3, 1, 29);
    for (let y = 4; y < 32; y += 4) { g.fillRect(46, y, 7, 1); for (let i = 0; i < 4; i++) g.fillRect(46 + i + (y % 8 ? 0 : 2), y + i, 1, 1); }
    g.fillStyle = C.O; g.fillRect(43, 0, 13, 3);
    g.fillStyle = C.metal; g.fillRect(44, 1, 11, 1);
    g.fillStyle = t.main; g.fillRect(56, 4, 6, 2);
    g.fillStyle = C.white; g.fillRect(58, 4, 2, 2);
  },
  bridge(g, t) {
    // Fire-escape grating with a railing
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 6);
    g.fillStyle = C.girder; g.fillRect(0, 1, 16, 3);
    g.fillStyle = C.girderLight;
    for (let x = 0; x < 16; x += 2) g.fillRect(x, 2, 1, 1);
    g.fillStyle = C.girderDark; g.fillRect(0, 4, 16, 1);
    g.fillStyle = C.rivet; g.fillRect(1, 1, 14, 1);
    g.fillStyle = t.main; g.fillRect(12, 2, 2, 1);
  },
  ramp(g, t) {
    // Iron stairs
    g.fillStyle = C.girderDark; g.fillRect(0, 0, 16, 16);
    g.fillStyle = C.girder;
    for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 16, 2);
    g.fillStyle = C.rivet;
    for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = C.O; g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = t.main; g.fillRect(2, 1, 3, 1);
  },
};

// Striped plank for the Feds' roadblock.
function stripedPlank(g, x, y, w, t) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, 5);
  for (let i = 0; i < w; i++) {
    g.fillStyle = Math.floor((i + 8) / 3) % 2 ? C.white : t.main;
    g.fillRect(x + i, y, 1, 3);
  }
}

const FEDS_BUILD = {
  hq(g, t) {
    // The Bureau: a marble temple of paperwork, columns, gold seal and a flag
    outlined(g, [[0, 44, 64, 4, C.marbleShade], [2, 41, 60, 3, C.marble], [4, 16, 56, 25, C.marbleDark], [2, 12, 60, 4, C.marble]], [
      [0, 44, 64, 1, C.marble], [2, 41, 60, 1, C.white], [2, 12, 60, 1, C.white], [3, 14, 58, 1, t.main], [2, 15, 60, 1, C.marbleShade],
      [4, 16, 56, 2, '#6e695f'],
    ]);
    for (let i = 0; i < 10; i++) {
      const w = 60 - (9 - i) * 6;
      g.fillStyle = C.O; g.fillRect(32 - w / 2 - 1, 2 + i, w + 2, 1);
      g.fillStyle = i === 9 ? C.marbleShade : C.marble; g.fillRect(32 - w / 2, 2 + i, w, 1);
    }
    g.fillStyle = C.O; g.fillRect(31, 1, 2, 1);
    disc(g, 32, 8, 3, C.O); disc(g, 32, 8, 2, C.yellow);
    g.fillStyle = t.main; g.fillRect(31, 7, 3, 3);
    g.fillStyle = C.yellowDark; g.fillRect(32, 8, 1, 1);
    // Colonnade
    for (const x of [6, 13, 20, 41, 48, 55]) {
      outlined(g, [[x, 18, 3, 23, C.marble], [x - 1, 17, 5, 1, C.marble]], [[x + 2, 18, 1, 23, C.marbleShade], [x, 18, 1, 23, C.white]]);
    }
    // Bronze doors under a plaque
    outlined(g, [[25, 20, 14, 3, C.bronze]], [[25, 20, 14, 1, '#c89a4a'], [27, 21, 10, 1, '#5a3e18']]);
    outlined(g, [[27, 26, 10, 15, C.bronze]], [[31, 26, 2, 15, C.O], [27, 26, 10, 1, '#c89a4a'], [30, 33, 1, 1, C.yellow], [33, 33, 1, 1, C.yellow],
      [28, 28, 2, 4, '#7a5220'], [34, 28, 2, 4, '#7a5220']]);
    // Flagpole on the roof corner
    g.fillStyle = C.O; g.fillRect(56, 0, 3, 12);
    g.fillStyle = C.metalLight; g.fillRect(57, 0, 1, 12);
    outlined(g, [[59, 1, 4, 3, t.main]], [[59, 2, 4, 1, C.white]]);
  },
  barracks(g, t) {
    // Training Academy: a stone school with a pennant and a pie-splatted target range
    outlined(g, [[2, 8, 30, 24, C.marbleShade], [0, 5, 34, 3, C.marbleDark]], [[0, 5, 34, 1, C.marble], [2, 8, 30, 1, C.marbleDark]]);
    g.fillStyle = C.marbleDark;
    for (let y = 12; y < 32; y += 4) g.fillRect(2, y, 30, 1);
    lit(g, 5, 13, 6, 6); lit(g, 23, 13, 6, 6);
    g.fillStyle = C.O; g.fillRect(7, 13, 1, 6); g.fillRect(25, 13, 1, 6);
    outlined(g, [[13, 20, 8, 12, '#3a2216']], [[14, 21, 6, 4, C.glassDark], [19, 26, 1, 1, C.yellow], [16, 20, 1, 12, C.O]]);
    outlined(g, [[11, 9, 12, 3, t.dark]], [[12, 10, 10, 1, t.main], [13, 10, 1, 1, C.white], [16, 10, 1, 1, C.white], [19, 10, 1, 1, C.white]]);
    g.fillStyle = C.O; g.fillRect(4, 0, 3, 6);
    g.fillStyle = C.metalLight; g.fillRect(5, 0, 1, 6);
    outlined(g, [[7, 0, 5, 3, t.main]], [[7, 1, 3, 1, C.white]]);
    // Target range
    outlined(g, [[38, 18, 1, 14, C.wood], [44, 18, 1, 14, C.wood]]);
    disc(g, 41, 13, 7, C.O); disc(g, 41, 13, 6, C.white); disc(g, 41, 13, 4, C.red); disc(g, 41, 13, 2, C.white);
    g.fillStyle = C.red; g.fillRect(41, 13, 1, 1);
    g.fillStyle = C.custard; g.fillRect(42, 11, 3, 2); g.fillRect(43, 13, 1, 2); g.fillRect(37, 15, 2, 2);
    g.fillStyle = C.cream; g.fillRect(42, 11, 1, 1);
  },
  mine(g, t) {
    // Tax Office: a narrow stone office, a "$" sign, stacks of forms and a mailbox
    outlined(g, [[3, 9, 26, 23, C.marble], [1, 6, 30, 3, C.marbleShade]], [[1, 6, 30, 1, C.white], [1, 8, 30, 1, t.main], [3, 9, 26, 1, C.marbleShade]]);
    outlined(g, [[8, 0, 16, 6, C.ledger]], [[9, 1, 14, 4, '#3a7a50'], [11, 0, 1, 6, C.yellow],
      [10, 1, 3, 1, C.yellow], [10, 2, 1, 1, C.yellow], [10, 3, 3, 1, C.yellow], [12, 4, 1, 1, C.yellow], [10, 5, 3, 1, C.yellow],
      [15, 1, 7, 1, C.paper], [15, 3, 6, 1, C.paper], [15, 5, 4, 1, t.main]]);
    g.fillStyle = C.O; g.fillRect(9, 5, 1, 1); g.fillRect(22, 5, 1, 1);
    lit(g, 5, 13, 12, 8);
    for (const [x, h] of [[6, 3], [9, 5], [12, 2], [14, 4]]) { g.fillStyle = C.paper; g.fillRect(x, 20 - h, 2, h); g.fillStyle = C.marbleShade; g.fillRect(x, 20 - h + 1, 2, 1); }
    g.fillStyle = C.wood; g.fillRect(5, 20, 12, 1);
    outlined(g, [[20, 17, 7, 15, '#3a2216']], [[21, 18, 5, 4, C.glassDark], [21, 19, 5, 1, C.paper], [25, 25, 1, 1, C.yellow]]);
    outlined(g, [[5, 25, 6, 7, '#3a5a8a'], [4, 24, 8, 2, '#3a5a8a']], [[6, 27, 4, 1, C.O], [4, 24, 8, 1, '#5a7aaa'], [6, 29, 4, 1, t.main]]);
  },
  wall(g, t) {
    // Roadblock: confiscated barrels and striped sawhorses, a lantern on top
    const barrel = (x) => outlined(g, [[x, 22, 7, 10, '#6a4a2c']], [[x, 24, 7, 1, C.metalDark], [x, 29, 7, 1, C.metalDark], [x + 1, 22, 5, 1, '#8a6a44'], [x + 3, 26, 1, 2, C.custard]]);
    barrel(1); barrel(8);
    outlined(g, [[2, 17, 1, 5, C.woodDark], [13, 17, 1, 5, C.woodDark], [3, 11, 1, 5, C.woodDark], [12, 11, 1, 5, C.woodDark]]);
    stripedPlank(g, 0, 16, 16, t);
    stripedPlank(g, 1, 9, 14, t);
    outlined(g, [[6, 4, 4, 4, C.siren], [7, 2, 2, 2, C.metalDark]], [[6, 4, 1, 4, '#ffa0a0'], [6, 7, 4, 1, C.redDark]]);
  },
  workshop(g, t) {
    // Evidence Locker: a concrete strongroom, a caged door full of seized barrels, a filing cabinet
    outlined(g, [[2, 8, 38, 24, C.concrete], [0, 5, 42, 4, C.concreteDark]], [[0, 5, 42, 1, C.concreteLight], [2, 8, 38, 1, C.concreteDark]]);
    g.fillStyle = C.concreteDark;
    for (let y = 13; y < 32; y += 5) for (let x = 2 + ((y / 5) % 2 ? 0 : 4); x < 40; x += 8) g.fillRect(x, y, 1, 4);
    outlined(g, [[10, 14, 22, 18, '#1a1a20']]);
    for (const x of [11, 17, 23]) { g.fillStyle = '#6a4a2c'; g.fillRect(x, 24, 5, 8); g.fillStyle = C.metalDark; g.fillRect(x, 26, 5, 1); g.fillRect(x, 29, 5, 1); }
    g.fillStyle = C.tin; g.fillRect(12, 21, 6, 2); g.fillStyle = C.cream; g.fillRect(12, 20, 6, 1); g.fillStyle = C.jam; g.fillRect(14, 20, 1, 1);
    g.fillStyle = C.paper; g.fillRect(24, 20, 6, 3); g.fillStyle = C.ink; g.fillRect(25, 21, 4, 1);
    g.fillStyle = C.metal;
    for (let x = 10; x < 32; x += 3) g.fillRect(x, 14, 1, 18);
    g.fillRect(10, 14, 22, 1); g.fillRect(10, 22, 22, 1);
    g.fillStyle = C.yellow; g.fillRect(29, 23, 2, 2);
    outlined(g, [[12, 7, 18, 5, t.dark]], [[13, 8, 16, 3, t.main], [14, 9, 14, 1, C.white]]);
    outlined(g, [[41, 14, 6, 18, '#6a7268']], [[41, 14, 6, 1, '#8a948a'], [41, 20, 6, 1, C.O], [41, 26, 6, 1, C.O],
      [43, 16, 2, 1, C.chrome], [43, 22, 2, 1, C.chrome], [43, 28, 2, 1, C.chrome], [42, 17, 4, 1, C.paper]]);
    outlined(g, [[3, 25, 6, 7, C.wood]], [[3, 25, 6, 1, C.woodLight], [4, 23, 3, 2, C.paper], [5, 24, 1, 1, t.main]]);
  },
  turret(g, t) {
    // Searchlight tower: a lattice tower with a big lamp and a custard gun
    outlined(g, [[9, 12, 2, 20, C.metalDark], [21, 12, 2, 20, C.metalDark]]);
    g.fillStyle = C.metalDark;
    for (let y = 14; y < 32; y += 6) for (let i = 0; i < 10; i++) { g.fillRect(11 + i, y + Math.floor(i / 2), 1, 1); g.fillRect(20 - i, y + Math.floor(i / 2), 1, 1); }
    outlined(g, [[4, 10, 24, 3, C.metal], [6, 2, 9, 7, C.slate], [15, 2, 2, 6, C.chrome], [17, 8, 14, 2, C.gun]], [
      [4, 10, 24, 1, t.main], [4, 12, 24, 1, C.metalDark], [6, 2, 9, 1, C.slateLight], [6, 5, 9, 1, t.main],
      [15, 3, 2, 4, C.glass], [16, 3, 1, 2, C.white], [30, 8, 1, 2, C.custard], [17, 8, 14, 1, '#4a4038'], [8, 4, 1, 1, C.slateDark], [11, 4, 1, 1, C.slateDark],
    ]);
    g.fillStyle = C.O; g.fillRect(9, 9, 2, 1);
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
    if (kind === 'dirtTop') {
      // Pavement slabs over a brick footing
      g.fillStyle = C.dirt; g.fillRect(0, 0, T, T);
      g.fillStyle = C.concrete; g.fillRect(0, 0, T, 5);
      g.fillStyle = C.concreteLight; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.concreteDark; g.fillRect(0, 5, T, 1); g.fillRect(variant % 2 ? 7 : 12, 1, 1, 4);
      g.fillStyle = C.brickDark; g.fillRect(0, 6, T, 3);
      g.fillStyle = C.mortar; g.fillRect(0, 7, T, 1); g.fillRect(variant % 2 ? 3 : 9, 6, 1, 1); g.fillRect(variant % 2 ? 11 : 5, 8, 1, 1);
      speckle(3, C.pebble, C.pebbleDark, 10);
    } else {
      g.fillStyle = kind === 'dirtDeep' ? C.dirtDeep : kind === 'dirtMid' ? C.dirtMid : C.dirt;
      g.fillRect(0, 0, T, T);
      speckle(6, C.pebble, C.pebbleDark, 0);
      if (hash(seed + 31) < 0.25) { g.fillStyle = C.metalDark; g.fillRect(2, 10, 12, 2); g.fillStyle = C.metal; g.fillRect(2, 10, 12, 1); }
    }
  } else {
    // Elevated railway girders: railroad ties on top, riveted green steel below
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.girder; g.fillRect(0, 3, T, T - 3);
    g.fillStyle = C.girderLight; g.fillRect(0, 3, T, 1);
    g.fillStyle = C.girderDark; g.fillRect(0, T - 4, T, 3);
    g.fillStyle = C.rivet;
    for (let x = 1; x < T; x += 3) { g.fillRect(x, 5, 1, 1); g.fillRect(x, T - 5, 1, 1); }
    g.fillStyle = C.girderDark;
    for (let i = 0; i < 5; i++) { g.fillRect(2 + i * 2, 6 + i, 1, 1); g.fillRect(13 - i * 2, 6 + i, 1, 1); }
    g.fillStyle = C.woodDark; g.fillRect(0, 1, T, 2);
    g.fillStyle = C.wood;
    for (let x = 1; x < T; x += 4) g.fillRect(x, 1, 2, 2);
    g.fillStyle = C.metalLight; g.fillRect(0, 0, T, 1);
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Street life on the pavement: hydrants, dropped newspapers, splats of custard.
function surface(ctx, x, y, ground, h) {
  if (!ground) return;
  if (h > 0.9) {
    ctx.fillStyle = C.O; ctx.fillRect(x + 6, y - 6, 5, 6);
    ctx.fillStyle = C.red; ctx.fillRect(x + 7, y - 5, 3, 5); ctx.fillRect(x + 6, y - 3, 5, 1);
    ctx.fillStyle = '#e8606a'; ctx.fillRect(x + 7, y - 5, 1, 4);
  } else if (h > 0.78) {
    ctx.fillStyle = C.white; ctx.fillRect(x + 3, y - 1, 4, 1);
    ctx.fillStyle = '#a8a49a'; ctx.fillRect(x + 4, y - 2, 3, 1);
  } else if (h > 0.68) {
    ctx.fillStyle = C.custard; ctx.fillRect(x + 9, y - 1, 3, 1); ctx.fillRect(x + 10, y - 2, 1, 1);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};

// Art-deco skyscraper silhouettes with warm windows.
function deco(k) {
  const key = `deco${k}`;
  if (scenery[key]) return scenery[key];
  const w = 14 + Math.floor(hash(k + 1) * 14);
  const h = 50 + Math.floor(hash(k + 2) * 70);
  const [c, g] = canvas(w, h + 16);
  const col = '#3a2a4e';
  g.fillStyle = col;
  g.fillRect(0, 16, w, h);
  // Stepped crown, maybe a spire
  g.fillRect(2, 11, w - 4, 5); g.fillRect(4, 7, w - 8, 4);
  if (hash(k + 3) < 0.5) g.fillRect(Math.floor(w / 2) - 1, 0, 2, 7);
  for (let y = 20; y < h + 12; y += 4) {
    for (let x = 2; x < w - 2; x += 3) {
      if (hash(k * 131 + x * 7 + y * 13) < 0.3) { g.fillStyle = '#f2c070'; g.globalAlpha = 0.6; g.fillRect(x, y, 1, 2); g.globalAlpha = 1; }
    }
  }
  scenery[key] = c;
  return c;
}

// Brick tenements with water towers, fire escapes and billboards.
function tenement(k) {
  const key = `ten${k}`;
  if (scenery[key]) return scenery[key];
  const w = 26 + Math.floor(hash(k + 11) * 18);
  const h = 34 + Math.floor(hash(k + 12) * 26);
  const [c, g] = canvas(w, h + 18);
  const top = 18;
  g.fillStyle = '#4a2a2e'; g.fillRect(0, top, w, h);
  g.fillStyle = '#3a2024'; g.fillRect(0, top, w, 2);
  for (let y = top + 5; y < top + h - 3; y += 7) {
    for (let x = 3; x < w - 3; x += 6) {
      const r = hash(k * 31 + x + y * 5);
      g.fillStyle = r < 0.45 ? '#f2c070' : '#2a1a1e';
      g.fillRect(x, y, 3, 4);
    }
  }
  if (hash(k + 13) < 0.55) {
    // Water tower on the roof
    const x = 4 + Math.floor(hash(k + 14) * (w - 14));
    g.fillStyle = '#2a1c18'; g.fillRect(x, top - 12, 10, 9); g.fillRect(x + 1, top - 3, 1, 3); g.fillRect(x + 8, top - 3, 1, 3);
    g.fillRect(x + 2, top - 15, 6, 3);
  } else {
    // Billboard advertising pies or soda
    const x = 2 + Math.floor(hash(k + 15) * (w - 22));
    g.fillStyle = '#2a1c18'; g.fillRect(x + 2, top - 4, 1, 4); g.fillRect(x + 16, top - 4, 1, 4);
    g.fillStyle = '#e8dcc0'; g.fillRect(x, top - 14, 20, 10);
    g.fillStyle = hash(k + 16) < 0.5 ? '#c8283a' : '#2a6a9a'; g.fillRect(x + 1, top - 13, 18, 3);
    g.fillStyle = '#ffd84a'; disc(g, x + 6, top - 7, 2, '#ffd84a');
    g.fillStyle = '#6a5a4a'; g.fillRect(x + 10, top - 8, 8, 1); g.fillRect(x + 10, top - 6, 6, 1);
  }
  // Fire escape zig-zag
  g.fillStyle = '#20141a';
  for (let y = top + 6; y < top + h - 4; y += 7) { g.fillRect(w - 9, y + 4, 7, 1); for (let i = 0; i < 6; i++) g.fillRect(w - 9 + i, y + 4 - i * 0.6, 1, 1); }
  scenery[key] = c;
  return c;
}

// The elevated railway: a girder viaduct, with a train rattling across now and then.
function elevated(ctx, bw, baseY, camAX, t) {
  const p = 0.5;
  const off = Math.round(camAX * p);
  const deckY = baseY - 30;
  rect(ctx, 0, deckY, bw, 4, '#22302a');
  rect(ctx, 0, deckY, bw, 1, '#3a4a40');
  const per = 36;
  for (let x = -((off % per) + per) % per; x < bw; x += per) {
    rect(ctx, x, deckY + 4, 3, 30, '#1c2620');
    for (let i = 0; i < 6; i++) rect(ctx, x + 3 + i * 2, deckY + 5 + i * 2, 1, 1, '#1c2620');
  }
  // Train: loops the whole elevated layer every so often
  const span = (WORLD_W / G) * p;
  const tx = ((t * 60) % (span * 2)) - off % span;
  for (const shift of [0, span, -span]) {
    const x0 = Math.round(tx + shift);
    if (x0 > bw + 10 || x0 < -150) continue;
    for (let car = 0; car < 4; car++) {
      const cx = x0 + car * 34;
      rect(ctx, cx, deckY - 12, 32, 12, '#2a3a32');
      rect(ctx, cx, deckY - 12, 32, 1, '#4a5e50');
      for (let w = 3; w < 30; w += 5) rect(ctx, cx + w, deckY - 9, 3, 4, '#f2c070');
    }
  }
}

function lampPost(ctx, x, groundY) {
  rect(ctx, x, groundY - 34, 2, 34, '#16121a');
  rect(ctx, x - 2, groundY - 36, 6, 3, '#16121a');
  ctx.globalAlpha = 0.18;
  disc(ctx, x + 1, groundY - 33, 7, '#ffd890');
  ctx.globalAlpha = 1;
  rect(ctx, x - 1, groundY - 34, 4, 2, '#ffe0a0');
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

  // A few early stars and a premiere spotlight sweeping the sky
  ctx.fillStyle = '#8a86b0';
  for (let i = 0; i < 24; i++) {
    const sx = Math.round(((hash(i) * bw * 3 - camAX * 0.05) % bw + bw) % bw);
    ctx.fillRect(sx, Math.round(hash(i + 40) * groundY * 0.3), 1, 1);
  }
  for (let i = 0; i < 2; i++) {
    const per = (WORLD_W / G) * 0.15;
    const bx = Math.round((((i * per) / 2 + 60 - camAX * 0.15) % per + per) % per);
    const ang = Math.sin(t * 0.3 + i * 2.4) * 0.45;
    const len = groundY * 0.95;
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#fff2c8';
    ctx.beginPath();
    ctx.moveTo(bx, groundY - 20);
    ctx.lineTo(bx + Math.sin(ang - 0.05) * len, groundY - 20 - Math.cos(ang - 0.05) * len);
    ctx.lineTo(bx + Math.sin(ang + 0.05) * len, groundY - 20 - Math.cos(ang + 0.05) * len);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Far deco skyline
  const fCount = 20;
  const fSpacing = ((WORLD_W / G) * 0.15) / fCount;
  const fOff = Math.round(camAX * 0.15);
  for (let i = Math.floor((fOff - 40) / fSpacing); i * fSpacing - fOff < bw + 40; i++) {
    const k = ((i % fCount) + fCount) % fCount;
    const img = deco(k);
    ctx.drawImage(img, Math.round(i * fSpacing - fOff + hash(k + 9) * 10), groundY - 20 - img.height);
  }
  ctx.globalAlpha = 0.25;
  rect(ctx, 0, groundY - 40, bw, 40, '#d0705a');
  ctx.globalAlpha = 1;

  // Tenements, then the elevated railway in front of them
  const tCount = 16;
  const tSpacing = ((WORLD_W / G) * 0.35) / tCount;
  const tOff = Math.round(camAX * 0.35);
  for (let i = Math.floor((tOff - 50) / tSpacing); i * tSpacing - tOff < bw + 50; i++) {
    const k = ((i % tCount) + tCount) % tCount;
    const img = tenement(k);
    ctx.drawImage(img, Math.round(i * tSpacing - tOff + hash(k + 3) * 8), groundY - img.height + 2);
  }
  elevated(ctx, bw, groundY + 2, camAX, t);

  // Street lamps in the foreground
  const lCount = 40;
  const lSpacing = ((WORLD_W / G) * 0.6) / lCount;
  const lOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((lOff - 20) / lSpacing); i * lSpacing - lOff < bw + 20; i++) {
    const k = ((i % lCount) + lCount) % lCount;
    if (hash(k + 50) < 0.4) continue;
    lampPost(ctx, Math.round(i * lSpacing - lOff + hash(k) * lSpacing * 0.5), groundY + 2);
  }
}

// Steel scaffolding with a canvas sheet and a "SOON" board.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = C.metalDark;
  for (let sx = x + 1; sx < x + w; sx += 7) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(x, sy, w, 1);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#d8ccb0'; ctx.fillRect(x + 2, y + 4, Math.floor(w / 3), h - 6);
  ctx.globalAlpha = 1;
  rect(ctx, x + w - 12, y + h - 9, 10, 5, C.O);
  rect(ctx, x + w - 11, y + h - 8, 8, 3, C.yellow);
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 140);
  const t = team(b.faction);
  if (feds(b.faction)) {
    if (b.type === 'hq') {
      // The flag flutters
      const k = tick % 4;
      rect(ctx, x + 63, y + 1 + (k < 2 ? 0 : 1), 1, 2, t.main);
      if (k === 1 || k === 2) rect(ctx, x + 63, y + 3, 1, 1, t.dark);
    } else if (b.type === 'mine') {
      // Tax forms flutter out of the office
      for (let i = 0; i < 3; i++) {
        const k = (ms / 2200 + i / 3) % 1;
        ctx.globalAlpha = 0.9 * (1 - k);
        const px = x + 26 + Math.round(Math.sin(k * 7 + i * 2) * 3);
        const py = y + 4 - Math.round(k * 14);
        rect(ctx, px, py, 3, 2, C.paper); rect(ctx, px, py + 1, 2, 1, C.marbleShade);
        ctx.globalAlpha = 1;
      }
    } else if (b.type === 'turret') {
      // The searchlight sweeps the sky
      ctx.globalAlpha = 0.18;
      const sw = Math.sin(ms / 1100) * 5;
      for (let i = 0; i < 14; i++) rect(ctx, x + 18 + i, y + 4 - i - Math.round(sw * i / 14), 1, 2 + Math.floor(i / 3), '#fff2c8');
      ctx.globalAlpha = 1;
      if (tick % 8 === 0) rect(ctx, x + 31, y + 8, 1, 2, C.cream);
    } else if (b.type === 'airbase') {
      if (tick % 6 < 3) rect(ctx, x + 49, y, 1, 1, C.red);
    }
    return;
  }
  if (b.type === 'hq') {
    // Chasing marquee bulbs
    for (let i = 0; i < 15; i++) rect(ctx, x + 16 + i * 2, y + 29, 1, 1, (i + tick) % 3 === 0 ? C.white : C.yellowDark);
    if (tick % 29 === 0) rect(ctx, x + 45, y + 1, 6, 24, t.dark); // neon flicker
  } else if (b.type === 'mine') {
    // Steam from the ovens
    for (let i = 0; i < 2; i++) {
      const k = (ms / 1600 + i / 2) % 1;
      ctx.globalAlpha = 0.55 * (1 - k);
      rect(ctx, x + 23 + Math.round(Math.sin(k * 6 + i) * 2), y - Math.round(k * 12), 3, 3, '#f0ece0');
      ctx.globalAlpha = 1;
    }
  } else if (b.type === 'airbase') {
    if (tick % 6 < 3) rect(ctx, x + 49, y, 1, 1, C.red);
  } else if (b.type === 'turret') {
    if (tick % 8 === 0) rect(ctx, x + 32, y + 11, 1, 2, C.cream);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  if (p.kind === 'bullet') {
    // A blob of custard
    rect(ctx, x - dx, y - dy, 1, 1, C.cream);
    rect(ctx, x, y, 2, 2, C.custard);
    rect(ctx, x, y, 1, 1, C.cream);
  } else if (p.kind === 'bomb') {
    // A pie dropped from the blimp
    rect(ctx, x - 2, y - 1, 5, 2, C.tin);
    rect(ctx, x - 2, y - 2, 5, 1, C.cream);
    rect(ctx, x, y - 2, 1, 1, C.jam);
  } else {
    // Cream pie (catapult) or a whole cake (pie lobber)
    const big = p.kind === 'lob';
    rect(ctx, x - 2, y, big ? 6 : 5, 2, C.tin);
    rect(ctx, x - 2, y - 1, big ? 6 : 5, 1, C.cream);
    if (big) rect(ctx, x - 1, y - 3, 4, 2, C.cream);
    rect(ctx, x, y - (big ? 3 : 1), 1, 1, C.jam);
  }
}

// SPLAT: a custard burst with flying blobs and a dash of jam.
function explode(ctx, x, y, r, k, seed) {
  disc(ctx, x, y, Math.max(1, Math.round(r * 0.55)), C.yellowDark);
  disc(ctx, x, y, Math.max(1, Math.round(r * 0.45)), C.custard);
  disc(ctx, x - 1, y - 1, Math.max(1, Math.round(r * 0.25)), C.cream);
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2 + hash(seed + i) * 0.6;
    const dist = r * (0.55 + 0.5 * hash(seed + i + 20)) * (0.6 + 0.6 * k);
    const bx = Math.round(x + Math.cos(ang) * dist);
    const by = Math.round(y + Math.sin(ang) * dist * 0.8 + k * 3);
    const size = Math.max(1, Math.round((2 + hash(seed + i + 40) * 2) * (1 - k * 0.5)));
    rect(ctx, bx - 1, by - 1, size + 2, size + 2, C.yellowDark);
    rect(ctx, bx, by, size, size, i % 4 === 0 ? C.jam : i % 2 ? C.cream : C.custard);
  }
}

// Nobody gets hurt: a splatted gangster sits in a puddle of custard.
function corpseKey() { return 'splat'; }
function fedCorpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(16, 8);
  g.fillStyle = C.custard; g.fillRect(0, 6, 16, 2); g.fillRect(2, 5, 12, 1);
  if (e.type === 'scout') {
    // A splatted stool pigeon, feet in the air, hat rolled away
    outlined(g, [[4, 3, 8, 3, C.pigeon], [11, 2, 3, 3, C.pigeon], [6, 1, 1, 2, C.pink], [9, 1, 1, 2, C.pink], [1, 4, 3, 1, C.fedHat]], [
      [11, 4, 3, 1, C.pigeonNeck], [12, 3, 1, 1, C.O], [5, 4, 5, 1, C.cream], [2, 4, 1, 1, t.main], [8, 3, 2, 1, C.custard],
    ]);
    return { c, ax: 8, ay: 7 };
  }
  const coat = { soldier: C.trench, heavy: C.shirt, engineer: '#6a6a78', sniper: C.navy }[e.type] ?? C.trench;
  const hat = { heavy: C.bowler, engineer: C.eyeshade, sniper: C.trench }[e.type] ?? C.fedHat;
  outlined(g, [[5, 3, 6, 3, coat], [6, 0, 4, 3, C.skin]], [
    [5, 0, 6, 1, hat], [5, 5, 6, 1, t.main], [6, 1, 4, 1, C.cream], [9, 2, 1, 1, C.custard],
  ]);
  g.fillStyle = C.cream; g.fillRect(4, 3, 2, 1); g.fillRect(10, 4, 2, 1);
  return { c, ax: 8, ay: 7 };
}

function corpse(e) {
  if (feds(e.f)) return fedCorpse(e);
  const t = team(e.f);
  const [c, g] = canvas(16, 8);
  g.fillStyle = C.custard; g.fillRect(0, 6, 16, 2); g.fillRect(2, 5, 12, 1);
  outlined(g, [[5, 3, 6, 3, e.type === 'engineer' ? C.overall : e.type === 'heavy' ? C.shirt : C.suit], [6, 0, 4, 3, C.skin]], [
    [5, 0, 6, 1, e.type === 'scout' ? t.main : C.hat], [7, 3, 1, 3, t.main], [6, 1, 4, 1, C.cream], [9, 2, 1, 1, C.custard],
  ]);
  g.fillStyle = C.cream; g.fillRect(4, 3, 2, 1); g.fillRect(10, 4, 2, 1);
  return { c, ax: 8, ay: 7 };
}

export default {
  id: 'gangster',
  name: 'Gangsters',
  sides: [
    {
      id: 'mob', name: 'The Mob', short: 'Mob',
      blurb: 'Pinstripes, spats and tommy guns full of custard. The bakery is just a bakery. Honest.',
      win: 'Pie for everyone. On the house.',
      lose: 'Somebody squealed. Probably that pigeon.',
    },
    {
      id: 'feds', name: 'The Feds', short: 'Feds', plural: true,
      blurb: 'Trench coats, custard tommy guns and the deadliest weapon of all: an accountant with a sharp pencil.',
      names: {
        soldier: 'G-Man', heavy: 'Dry Agent', scout: 'Stool Pigeon', engineer: 'Accountant', sniper: 'Marksman',
        jeep: 'Squad Car', tank: 'Paddy Wagon', artillery: 'Pie Trebuchet', helicopter: 'Seaplane', bomber: 'Bureau Blimp',
        hq: 'The Bureau', barracks: 'Academy', turret: 'Searchlight', wall: 'Roadblock', mine: 'Tax Office',
        workshop: 'Evidence Locker', airbase: 'Air Dock', sam: 'Flak Rocket Post', bridge: 'Fire Escape', ramp: 'Stairs',
      },
      icons: { hq: '🏛️', barracks: '🎯', turret: '🔦', wall: '🚧', mine: '🧾', workshop: '🗄️', sam: '🚀' },
      win: 'We got him on the tax forms.',
      lose: 'The paperwork got lost. All of it. In triplicate.',
    },
  ],
  palette,
  teamBase: PINSTRIPE,
  roofBase: [0.3, 0.3, 0.32],
  soldier: buildSoldier,
  vehicle: { jeep: buildCar, tank: buildPieWagon, artillery: buildPieLobber },
  aircraft: { helicopter: buildAutogyro, bomber: buildBlimp },
  missile: { body: '#d0322a', tip: '#f2d040', flame: '#f2d040' },
  buildings: Object.fromEntries(Object.keys(BUILD).map((k) => [k, (g, t, f) => (feds(f) && FEDS_BUILD[k] ? FEDS_BUILD[k] : BUILD[k])(g, t, f)])),
  drawTile,
  surface,
  background,
  skyTop: palette.sky[0],
  rotor,
  construction,
  animate,
  projectile,
  explode,
  explosion: { rim: '#fff6d2', body: '#ffd84a', core: '#ffffff', smoke: '#f0d890', smoke2: '#fff6d2' },
  corpse,
  corpseKey,
  debris: { '#7a4a24': '#ffd84a', '#5c361a': '#fff6d2' },
  minimap: { sky: '#46305e', ground: '#4a3a30', platform: '#2e3e34', bridge: '#4a5e50', ramp: '#4a5e50', surface: '#9a968c' },
  names: {
    soldier: 'Hood', heavy: 'Muscle', scout: 'Newsie', engineer: 'Mechanic', sniper: 'Hitman',
    jeep: 'Getaway Car', tank: 'Pie Wagon', artillery: 'Pie Lobber', helicopter: 'Autogyro', bomber: 'Blimp',
    hq: 'Speakeasy', barracks: 'Pool Hall', turret: 'Lookout', wall: 'Crates', mine: 'Bakery', workshop: 'Garage',
    airbase: 'Air Dock', sam: 'Firework Stand', bridge: 'Fire Escape', ramp: 'Stairs',
  },
  // Units are shown with their own sprites in menus.
  spriteIcons: true,
  icons: { hq: '🎺', barracks: '🎱', turret: '🔭', wall: '📦', mine: '🥧', workshop: '🔧', airbase: '🎈', bridge: '🏗️', ramp: '🪜', sam: '🎆' },
};
