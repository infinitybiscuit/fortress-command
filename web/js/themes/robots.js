// Rise of the Robots: a rain-soaked future war. Human resistance fighters and
// cyborg enforcers alongside chrome endoskeletons and hunter machines, under
// a smoggy neon city skyline. Same units and rules as Classic, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#05050a',                        // outline
  skin: '#d6a27c', skinDark: '#a06a4c',
  boot: '#121216', gun: '#1d2026', gunLight: '#5d6873',
  yellow: '#ffcf33', yellowDark: '#c79a10', red: '#ff2238', redDark: '#8f0d1c', white: '#eaf6ff',
  sky: ['#04030a', '#070611', '#0b0819', '#100b22', '#170e2b', '#211233', '#2e1538'],
  chrome: '#a9b6bf', chromeLight: '#e3edf2', chromeDark: '#5d6b75',
  cyan: '#38f0ff', cyanDark: '#1690a8', pink: '#ff3fa8', violet: '#8a4dff',
  concrete: '#3a3e47', concreteLight: '#555b66', concreteDark: '#24272e',
  metal: '#454d57', metalLight: '#6f7a86', metalDark: '#272c33',
  rust: '#6e3b26', rustLight: '#9a5532',
  ash: '#48444f', ashLight: '#6a6573', ashDark: '#2a2730',
  dirt: '#25212a', dirtMid: '#1d1a22', dirtDeep: '#151318', pebble: '#3d3845', pebbleDark: '#0c0b0f',
  bone: '#d9d2bf', boneDark: '#9c9583',
  coat: '#34302c', coatDark: '#211e1b', leather: '#2b2220',
  armor: '#71849c', armorLight: '#9fb2c8', armorDark: '#46566b',
  glass: '#38f0ff', shadow: 'rgba(0,0,0,0.4)',
};
const GUNMETAL = [0.19, 0.2, 0.25];

// ── Infantry: humans and machines ──────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right — same frame as Classic.
const ROBOTS = new Set(['heavy', 'sniper']);

function buildSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  if (type === 'heavy') return buildEndo(t, c, g, frame);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'sniper') {
    // Enforcer: armoured cyborg lawman — helmet and visor, only the jaw is human
    parts = [
      ...legs.map((l) => [...l, C.armorDark]), ...boots.map((b) => [...b, C.metalDark]),
      [4, 8, 9, 4, C.armor], [6, 3, 6, 5, C.skin], [5, 1, 8, 5, C.armor],
      [10, 9, 9, 1, C.gun], [15, 8, 3, 1, C.gun],
    ];
    details = [
      [5, 1, 8, 1, C.armorLight], [7, 4, 6, 1, C.O], [9, 4, 3, 1, t.main], [6, 7, 5, 1, C.skinDark],
      [4, 8, 9, 1, C.armorLight], [6, 9, 2, 2, t.main], [4, 11, 9, 1, C.armorDark], [9, 9, 3, 2, C.armorLight],
    ];
  } else {
    // Human resistance: coats and fatigues, a team-coloured armband
    const coat = type === 'scout' ? C.leather : type === 'engineer' ? '#3b3427' : C.coat;
    parts = [
      ...legs.map((l) => [...l, t.uniDark]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, coat], [6, 3, 6, 5, C.skin],
    ];
    details = [
      [5, 11, 7, 1, C.coatDark], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [9, 9, 3, 2, coat], [9, 9, 2, 1, t.main],
    ];
    if (type === 'scout') {
      // Runner: slicked hair, shades, pistol
      parts.push([6, 2, 6, 2, '#17110f'], [11, 9, 4, 1, C.gun]);
      details.push([5, 3, 2, 1, '#17110f'], [8, 5, 4, 1, C.O], [10, 5, 1, 1, C.cyan], [5, 8, 7, 1, t.main]);
    } else if (type === 'engineer') {
      // Tech: beanie, welding goggles, cutting torch
      parts.push([5, 1, 8, 3, t.dark], [11, 9, 4, 1, C.gunLight]);
      details.push([6, 1, 5, 1, t.main], [7, 4, 5, 1, C.O], [8, 4, 1, 1, C.cyan], [10, 4, 1, 1, C.cyan], [5, 10, 7, 1, C.yellowDark]);
    } else {
      // Rebel: bandana and a plasma rifle
      parts.push([5, 2, 8, 2, t.main], [11, 9, 7, 2, C.gun]);
      details.push([4, 3, 2, 2, t.dark], [6, 2, 6, 1, t.light], [12, 10, 4, 1, C.cyanDark], [17, 9, 1, 1, C.cyan]);
    }
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// Endo: a chrome endoskeleton with red eyes and a plasma minigun.
function buildEndo(t, c, g, frame) {
  const legs = frame ? [[6, 12, 1, 3], [9, 12, 1, 3]] : [[5, 12, 1, 3], [10, 12, 1, 3]];
  const feet = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  outlined(g, [
    ...legs.map((l) => [...l, C.chrome]), ...feet.map((f) => [...f, C.chromeDark]),
    [7, 11, 4, 2, C.chromeDark], [5, 8, 7, 3, C.chromeDark], [8, 7, 1, 1, C.chrome],
    [6, 2, 6, 5, C.chrome], [11, 9, 8, 2, C.gun], [4, 8, 3, 2, t.main],
  ], [
    [5, 8, 7, 1, C.chrome], [5, 10, 7, 1, C.chrome], [8, 8, 1, 3, C.chromeLight],
    [7, 2, 3, 1, C.chromeLight], [6, 4, 6, 1, C.O], [8, 4, 1, 1, C.red], [10, 4, 1, 1, C.red],
    [7, 6, 4, 1, C.O], [8, 6, 1, 1, C.chromeLight], [10, 6, 1, 1, C.chromeLight],
    [4, 8, 3, 1, t.light], [13, 9, 1, 2, C.violet], [18, 9, 1, 2, C.cyan], [9, 9, 3, 1, C.chromeLight],
  ]);
  return { c, ax: 8, ay: 16 };
}

// ── Vehicles & aircraft ────────────────────────────────────────────────────
// Glowing hover pad under a machine (frame flickers the glow).
function hoverGlow(g, x, y, w, frame) {
  g.fillStyle = C.metal; g.fillRect(x, y, w, 1);
  g.fillStyle = C.cyan; g.fillRect(x, y + 1, w, 1);
  g.fillStyle = C.cyanDark; g.fillRect(x + 1, y + 2, w - 2, frame ? 1 : 0);
}

// Cruiser: a black police spinner that hovers over the rubble, light bar flashing.
function buildCruiser(f, frame) {
  const t = team(f);
  const [c, g] = canvas(26, 15);
  outlined(g, [
    [3, 6, 19, 4, '#1a1d24'], [22, 7, 3, 3, '#1a1d24'], [1, 4, 3, 5, '#1a1d24'], [8, 3, 10, 4, '#1a1d24'],
    [11, 2, 5, 1, C.metalDark],
  ], [
    [3, 6, 19, 1, C.metal], [22, 7, 2, 1, C.metal], [9, 3, 8, 3, C.cyanDark], [10, 3, 3, 1, C.cyan], [16, 4, 1, 2, C.cyan],
    [4, 8, 20, 1, t.main], [4, 9, 18, 1, '#0f1116'], [24, 8, 1, 1, C.white], [1, 5, 1, 2, C.red],
    [11, 2, 2, 1, frame ? t.light : C.red], [14, 2, 2, 1, frame ? C.red : t.light], [6, 7, 1, 1, C.yellow],
  ]);
  hoverGlow(g, 5, 11, 5, frame);
  hoverGlow(g, 16, 11, 5, frame);
  return { c, ax: 13, ay: 14 };
}

// Hunter: a hulking tracked killing machine — sensor head with a row of red
// eyes, twin plasma cannons, toothed treads.
function buildHunter(f, frame) {
  const t = team(f);
  const [c, g] = canvas(34, 20);
  outlined(g, [
    [1, 13, 26, 6, '#121419'], [3, 9, 23, 5, C.metalDark], [26, 10, 3, 4, C.metalDark],
    [8, 4, 13, 6, C.metal], [10, 1, 1, 3, C.metalDark],
    [20, 5, 12, 2, C.gun], [21, 8, 11, 2, C.gun], [19, 4, 3, 7, C.metalDark],
  ], [
    [3, 9, 23, 1, C.metal], [8, 4, 13, 1, C.metalLight], [9, 6, 11, 2, '#0b0c10'],
    [10, 6, 1, 1, C.red], [12, 6, 1, 1, C.red], [14, 6, 1, 1, C.red], [16, 6, 1, 1, C.red], [18, 6, 1, 1, C.redDark],
    [10, 1, 1, 1, C.red], [4, 11, 21, 1, t.main], [23, 5, 1, 2, t.main], [24, 8, 1, 2, t.main],
    [31, 5, 1, 2, C.cyan], [31, 8, 1, 2, C.cyan], [20, 9, 1, 1, C.cyan],
  ]);
  // Road wheels and moving track teeth
  g.fillStyle = C.metal;
  for (let i = 0; i < 6; i++) g.fillRect(3 + i * 4, 15, 2, 2);
  g.fillStyle = C.metalLight;
  for (let x = 1 + frame * 2; x < 27; x += 4) { g.fillRect(x, 13, 2, 1); g.fillRect(x, 18, 2, 1); }
  return { c, ax: 14, ay: 19 };
}

// Walker: a squat two-legged enforcement mech — visor slit, arm cannons and a
// missile pod on its back. Legs stride between frames.
function buildWalker(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 22);
  const legs = frame
    ? [[10, 13, 3, 3], [7, 16, 3, 4], [17, 13, 3, 3], [19, 16, 3, 4]]
    : [[10, 13, 3, 3], [11, 16, 3, 4], [17, 13, 3, 3], [15, 16, 3, 4]];
  const feet = frame ? [[5, 20, 6, 1], [18, 20, 6, 1]] : [[9, 20, 6, 1], [14, 20, 6, 1]];
  outlined(g, [
    ...legs.map((l) => [...l, C.metalDark]), ...feet.map((p) => [...p, C.metal]),
    [11, 11, 8, 3, C.metalDark],
    [2, 7, 6, 3, C.metalDark], [7, 2, 15, 10, C.metal], [5, 0, 7, 3, C.metalDark],
    [21, 7, 6, 3, C.metalDark], [26, 7, 3, 1, C.gun], [26, 9, 3, 1, C.gun],
  ], [
    [7, 2, 15, 1, C.metalLight], [7, 3, 1, 8, C.metalLight], [16, 5, 6, 2, '#0b0c10'], [17, 5, 4, 1, C.red],
    [8, 9, 13, 1, t.main], [8, 10, 13, 1, C.metalDark], [6, 0, 1, 1, C.red], [8, 0, 1, 1, C.red], [10, 0, 1, 1, C.red],
    [28, 7, 1, 1, C.cyan], [28, 9, 1, 1, C.cyan], [3, 8, 1, 1, C.yellow], [12, 12, 6, 1, C.metal],
  ]);
  return { c, ax: 14, ay: 21 };
}

// Drone: an aerial hunter-killer — wedge body, twin downward turbines, a
// cluster of red eyes (thruster glow and searchlight are drawn live).
function buildDrone(f) {
  const t = team(f);
  const [c, g] = canvas(30, 16);
  outlined(g, [
    [4, 5, 20, 4, C.metalDark], [24, 6, 4, 3, C.metalDark], [10, 2, 8, 3, C.metal], [1, 4, 4, 2, C.metalDark],
    [3, 9, 7, 3, C.metal], [17, 9, 7, 3, C.metal], [20, 12, 7, 1, C.gun],
  ], [
    [4, 5, 20, 1, C.metal], [10, 2, 8, 1, C.metalLight], [23, 6, 4, 2, '#0b0c10'],
    [24, 6, 1, 1, C.red], [26, 6, 1, 1, C.red], [25, 7, 1, 1, C.red], [5, 7, 18, 1, t.main],
    [4, 11, 5, 1, C.cyanDark], [18, 11, 5, 1, C.cyanDark], [26, 12, 1, 1, C.cyan],
  ]);
  return { c, ax: 15, ay: 13 };
}

// Dropship: a heavy VTOL troop carrier with twin engine pods.
function buildDropship(f) {
  const t = team(f);
  const [c, g] = canvas(38, 16);
  outlined(g, [
    [1, 1, 5, 5, C.metalDark], [2, 5, 31, 6, C.metalDark], [33, 7, 3, 3, C.metalDark], [12, 3, 14, 3, C.metal],
    [8, 10, 7, 4, C.metal], [22, 10, 7, 4, C.metal],
  ], [
    [2, 5, 31, 1, C.metal], [12, 3, 14, 1, C.metalLight], [29, 6, 5, 2, C.cyanDark], [30, 6, 2, 1, C.cyan],
    [4, 8, 28, 1, t.main], [15, 9, 6, 1, '#0b0c10'], [2, 1, 2, 1, C.red], [35, 8, 1, 1, C.white],
    [9, 13, 5, 1, C.cyanDark], [23, 13, 5, 1, C.cyanDark],
  ]);
  return { c, ax: 19, ay: 13 };
}

// ── Buildings ──────────────────────────────────────────────────────────────
function hazard(g, x, y, w, h = 2) {
  for (let i = 0; i < w; i++) {
    g.fillStyle = Math.floor((i + (y % 2)) / 2) % 2 ? C.O : C.yellow;
    g.fillRect(x + i, y, 1, h);
  }
}

function razorWire(g, x, y, w) {
  g.fillStyle = C.metalLight;
  for (let i = 0; i < w; i++) g.fillRect(x + i, y + ((i % 4) < 2 ? 0 : 1), 1, 1);
  g.fillStyle = C.metalDark;
  for (let i = 1; i < w; i += 4) g.fillRect(x + i, y - 1, 1, 1);
}

// Lit windows: a row of slits, some on, some dark.
function windows(g, x, y, n, step, seed, colours) {
  for (let i = 0; i < n; i++) {
    const r = hash(seed + i);
    g.fillStyle = r < 0.25 ? '#15131c' : colours[Math.floor(r * colours.length)];
    g.fillRect(x + i * step, y, step - 2, 1);
  }
}

const BUILD = {
  hq(g, t) {
    // Fortified command tower: concrete, neon trim, blast door, comms mast
    outlined(g, [
      [3, 20, 58, 28, C.concrete], [14, 6, 30, 15, C.concreteDark], [48, 0, 1, 20, C.metalDark], [44, 8, 8, 3, C.metal],
      [24, 2, 10, 5, C.metalDark],
    ], [
      [3, 20, 58, 1, t.main], [14, 6, 30, 1, t.light], [3, 21, 58, 1, t.dark], [44, 8, 8, 1, C.metalLight],
      [26, 3, 6, 1, C.cyan], [25, 10, 8, 6, C.metal], [27, 11, 4, 4, t.main], [28, 12, 2, 2, t.light],
    ]);
    windows(g, 16, 9, 2, 5, 3, [C.cyan, C.yellow]);
    windows(g, 34, 9, 2, 5, 7, [C.cyan, C.pink]);
    windows(g, 16, 14, 2, 5, 11, [C.yellow, C.cyan]);
    windows(g, 34, 14, 2, 5, 17, [C.cyan]);
    windows(g, 6, 25, 4, 5, 21, [C.cyan, C.yellow, C.pink]);
    windows(g, 40, 25, 4, 5, 29, [C.cyan, C.yellow]);
    outlined(g, [[24, 30, 16, 18, C.metalDark]], [[25, 31, 14, 1, C.metal], [31, 31, 1, 17, C.O], [25, 44, 14, 1, C.metal]]);
    hazard(g, 24, 28, 16);
    for (const x of [1, 9, 47, 55]) {
      outlined(g, [[x, 43, 8, 5, C.concreteLight]], [[x, 43, 8, 1, '#7a808c'], [x + 1, 45, 6, 1, C.yellow]]);
    }
  },
  barracks(g, t) {
    // Resistance bunker: half-buried concrete, gun slits, neon sign
    outlined(g, [
      [2, 14, 44, 18, C.concrete], [0, 10, 48, 5, C.concreteDark], [20, 20, 8, 12, C.metalDark], [17, 5, 14, 4, C.metalDark],
    ], [
      [0, 10, 48, 1, C.concreteLight], [2, 15, 44, 1, C.concreteDark], [18, 6, 12, 2, t.main], [19, 6, 3, 1, t.light],
      [7, 18, 9, 2, C.O], [32, 18, 9, 2, C.O], [8, 19, 7, 1, '#ff7b2e'], [33, 19, 7, 1, '#ff7b2e'],
      [21, 21, 6, 11, '#15171c'], [26, 26, 1, 1, C.red],
    ]);
    razorWire(g, 0, 8, 17);
    razorWire(g, 31, 8, 17);
    hazard(g, 2, 30, 16);
    hazard(g, 30, 30, 16);
  },
  turret(g, t) {
    // Plasma gun: armoured base, sensor head, coil barrel
    outlined(g, [
      [3, 19, 26, 13, C.metalDark], [7, 9, 14, 10, C.metal], [20, 12, 11, 3, C.gun], [11, 6, 6, 4, C.metalDark],
    ], [
      [3, 19, 26, 1, C.metal], [7, 9, 14, 1, C.metalLight], [9, 12, 3, 1, C.red], [8, 16, 12, 1, t.main],
      [22, 12, 1, 3, t.main], [25, 12, 1, 3, t.main], [30, 13, 1, 1, C.cyan], [12, 7, 2, 1, C.cyan],
    ]);
    hazard(g, 3, 28, 26);
  },
  wall(g, t) {
    // Steel barricade with hazard band and razor wire
    outlined(g, [[1, 6, 14, 26, C.metal], [0, 24, 16, 8, C.concrete]], [
      [1, 6, 14, 1, C.metalLight], [7, 6, 1, 18, C.metalDark], [0, 24, 16, 1, C.concreteLight],
      [3, 9, 1, 1, C.metalLight], [11, 9, 1, 1, C.metalLight], [3, 19, 1, 1, C.metalLight], [11, 19, 1, 1, C.metalLight],
      [5, 27, 6, 2, t.main],
    ]);
    hazard(g, 1, 13, 14, 3);
    razorWire(g, 0, 3, 16);
  },
  mine(g, t) {
    // Reactor: a cylinder with a glowing team-coloured core (pulses live)
    outlined(g, [
      [7, 6, 18, 26, C.metal], [5, 4, 22, 3, C.metalDark], [2, 18, 5, 3, C.metalDark], [25, 14, 5, 3, C.metalDark],
      [12, 12, 8, 14, '#101216'],
    ], [
      [7, 6, 1, 26, C.metalLight], [5, 4, 22, 1, C.metalLight], [13, 13, 6, 12, t.dark], [14, 14, 4, 10, t.main],
      [15, 15, 2, 8, t.light], [9, 9, 2, 1, C.yellow], [21, 9, 2, 1, C.yellow],
    ]);
    hazard(g, 7, 29, 18, 2);
  },
  workshop(g, t) {
    // Machine factory: sawtooth roof, roller door, flaring smokestack
    outlined(g, [
      [2, 10, 44, 22, C.concreteDark], [2, 6, 14, 5, C.metalDark], [16, 6, 14, 5, C.metalDark], [30, 6, 14, 5, C.metalDark],
      [37, 0, 5, 7, C.metal],
    ], [
      [2, 10, 44, 1, C.concrete], [2, 6, 3, 1, C.metal], [16, 6, 3, 1, C.metal], [30, 6, 3, 1, C.metal],
      [14, 15, 20, 17, C.O], [15, 16, 18, 16, C.metal], [3, 12, 10, 1, t.main], [35, 12, 10, 1, t.main],
    ]);
    g.fillStyle = C.metalDark;
    for (let y = 18; y < 32; y += 3) g.fillRect(15, y, 18, 1);
    hazard(g, 15, 15, 18, 1);
    windows(g, 3, 20, 2, 5, 41, [C.cyan, C.yellow]);
    windows(g, 35, 20, 2, 5, 43, [C.cyan]);
  },
  airbase(g, t) {
    // Skyport: landing pad on pylons, control tower with neon band
    outlined(g, [
      [0, 20, 46, 4, C.metal], [4, 24, 3, 8, C.metalDark], [38, 24, 3, 8, C.metalDark], [21, 24, 4, 8, C.metalDark],
      [49, 4, 11, 28, C.concreteDark], [47, 2, 15, 4, C.metalDark],
    ], [
      [0, 20, 46, 1, C.metalLight], [49, 8, 11, 2, C.cyanDark], [50, 8, 9, 1, C.cyan], [49, 14, 11, 1, t.main],
      [47, 2, 15, 1, C.metal], [16, 21, 14, 1, C.yellow], [22, 21, 2, 1, C.O],
    ]);
    hazard(g, 0, 23, 46, 1);
    windows(g, 50, 18, 2, 5, 51, [C.yellow, C.cyan]);
    windows(g, 50, 23, 2, 5, 57, [C.cyan]);
  },
  bridge(g, t) {
    // Steel girder deck with truss
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 7);
    g.fillStyle = C.metal; g.fillRect(0, 1, 16, 3);
    g.fillStyle = C.metalLight; g.fillRect(0, 1, 16, 1);
    g.fillStyle = C.metalDark;
    for (let x = 0; x < 16; x += 4) { g.fillRect(x, 4, 1, 2); g.fillRect(x + 1, 5, 2, 1); }
    g.fillStyle = C.metalLight;
    for (let x = 2; x < 16; x += 4) g.fillRect(x, 2, 1, 1);
    g.fillStyle = t.main; g.fillRect(13, 2, 2, 1);
  },
  ramp(g, t) {
    // Diamond-plate steel ramp
    g.fillStyle = C.metal; g.fillRect(0, 0, 16, 16);
    g.fillStyle = C.metalLight;
    for (let y = 1; y < 15; y += 3) for (let x = 1 + (y % 2); x < 15; x += 3) g.fillRect(x, y, 1, 1);
    g.fillStyle = C.metalDark;
    g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    hazard(g, 1, 1, 14, 1);
    g.fillStyle = t.main; g.fillRect(2, 3, 3, 2);
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
    // Rubble and ash over buried scrap
    g.fillStyle = kind === 'dirtDeep' ? C.dirtDeep : kind === 'dirtMid' ? C.dirtMid : C.dirt;
    g.fillRect(0, 0, T, T);
    speckle(6, C.pebble, C.pebbleDark, kind === 'dirtTop' ? 5 : 0);
    if (hash(seed + 99) < 0.35) { g.fillStyle = C.rust; g.fillRect(Math.floor(hash(seed + 7) * 10) + 2, 9 + Math.floor(hash(seed + 8) * 4), 4, 1); }
    if (kind === 'dirtTop') {
      g.fillStyle = C.ash; g.fillRect(0, 0, T, 4);
      g.fillStyle = C.ashLight; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.ashDark; g.fillRect(0, 4, T, 1);
      for (let x = 0; x < T; x += 3) if (hash(seed + x) < 0.5) g.fillRect(x, 5, 2, 1);
      g.fillStyle = C.concreteLight;
      if (hash(seed + 5) < 0.6) g.fillRect(Math.floor(hash(seed + 6) * 12), 1, 3, 2);
    }
  } else {
    // Floating steel slab: riveted deck plate, girder underside, hazard ends
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.concreteDark; g.fillRect(0, 0, T, T);
    g.fillStyle = C.metal; g.fillRect(0, 0, T, 4);
    g.fillStyle = C.metalLight; g.fillRect(0, 0, T, 1);
    g.fillStyle = C.metalDark; g.fillRect(0, 4, T, 1); g.fillRect(0, T - 4, T, 3);
    g.fillStyle = C.metalLight; g.fillRect(3, 2, 1, 1); g.fillRect(11, 2, 1, 1);
    speckle(3, C.concrete, C.pebbleDark, 6);
    g.fillStyle = C.metalDark;
    for (let x = 1; x < T; x += 5) { g.fillRect(x, 7, 1, 5); }
    if (L) hazard(g, 0, 1, 4, 2);
    if (R) hazard(g, T - 4, 1, 4, 2);
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Debris above the surface: twisted rebar, and here and there a skull.
function surface(ctx, x, y, ground, h) {
  if (h < 0.35) {
    ctx.fillStyle = C.rustLight;
    ctx.fillRect(x + Math.floor(h * 30), y - 3, 1, 3);
    ctx.fillRect(x + Math.floor(h * 30) + 1, y - 4, 1, 1);
  } else if (ground && h > 0.9) {
    ctx.fillStyle = C.bone; ctx.fillRect(x + 6, y - 3, 3, 2); ctx.fillRect(x + 7, y - 1, 1, 1);
    ctx.fillStyle = C.O; ctx.fillRect(x + 6, y - 2, 1, 1); ctx.fillRect(x + 8, y - 2, 1, 1);
  } else if (ground && h > 0.75) {
    ctx.fillStyle = C.concreteLight; ctx.fillRect(x + 9, y - 2, 3, 2);
    ctx.fillStyle = C.concrete; ctx.fillRect(x + 10, y - 1, 2, 1);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const now = () => performance.now() / 1000;
const scenery = {};

// A slice of far skyline: towers with lit windows and the odd neon sign.
function tower(k) {
  const key = `tower${k}`;
  if (scenery[key]) return scenery[key];
  const w = 10 + Math.floor(hash(k + 1) * 14);
  const h = 40 + Math.floor(hash(k + 2) * 80);
  const [c, g] = canvas(w + 4, h + 6);
  g.fillStyle = '#161029'; g.fillRect(2, 6, w, h);
  g.fillStyle = '#21183a'; g.fillRect(2, 6, 1, h);
  g.fillStyle = '#161029';
  if (hash(k + 3) < 0.5) { g.fillRect(2 + Math.floor(w / 2) - 1, 0, 2, 6); g.fillStyle = C.red; g.fillRect(2 + Math.floor(w / 2) - 1, 0, 2, 1); }
  else { g.fillRect(4, 3, w - 4, 3); }
  const lit = ['#ffcf66', '#5fe8ff', '#ff6fc0', '#ffcf66'];
  for (let y = 9; y < h; y += 3) {
    for (let x = 4; x < w; x += 3) {
      const r = hash(k * 131 + x * 7 + y * 13);
      if (r < 0.22) { g.fillStyle = lit[Math.floor(r * 18) % lit.length]; g.globalAlpha = 0.55; g.fillRect(x, y, 1, 1); g.globalAlpha = 1; }
    }
  }
  if (hash(k + 4) < 0.45) {
    const sy = 12 + Math.floor(hash(k + 5) * (h - 24));
    const col = hash(k + 6) < 0.5 ? C.pink : C.cyan;
    g.globalAlpha = 0.25; g.fillStyle = col; g.fillRect(1, sy - 1, 5, 10);
    g.globalAlpha = 0.85; g.fillRect(2, sy, 3, 8);
    g.fillStyle = '#ffffff'; g.globalAlpha = 0.45; g.fillRect(3, sy + 1, 1, 6); g.globalAlpha = 1;
  }
  scenery[key] = c;
  return c;
}

// Mid-distance ruins: broken blocks with jagged tops and fire-lit holes.
function ruin(k) {
  const key = `ruin${k}`;
  if (scenery[key]) return scenery[key];
  const w = 16 + Math.floor(hash(k + 11) * 22);
  const h = 22 + Math.floor(hash(k + 12) * 34);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#0b0913';
  for (let x = 0; x < w; x++) {
    const top = Math.floor(hash(k * 17 + Math.floor(x / 3)) * 10);
    g.fillRect(x, top, 1, h - top);
  }
  for (let y = 12; y < h - 4; y += 6) {
    for (let x = 3; x < w - 3; x += 6) {
      if (hash(k * 7 + x + y * 3) < 0.25) { g.fillStyle = hash(k + x + y) < 0.5 ? '#ff7b2e' : '#3a1d1a'; g.globalAlpha = 0.7; g.fillRect(x, y, 2, 2); g.globalAlpha = 1; }
    }
  }
  scenery[key] = c;
  return c;
}

// Near debris: dead lamp posts, girder stubs and burnt-out wrecks.
function debrisSprite(k) {
  const key = `deb${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(30, 40);
  const kind = Math.floor(hash(k + 21) * 4);
  g.fillStyle = '#08070c';
  if (kind === 0) {
    g.fillRect(14, 4, 2, 36); g.fillRect(14, 4, 8, 2); g.fillRect(21, 6, 2, 2);
    g.fillStyle = '#ffcf66'; g.fillRect(21, 8, 2, 1);
  } else if (kind === 1) {
    g.fillRect(6, 10, 3, 30); g.fillRect(20, 16, 3, 24); g.fillRect(6, 12, 17, 2);
    for (let i = 0; i < 6; i++) g.fillRect(9 + i * 2, 14 + i, 1, 2);
  } else if (kind === 2) {
    g.fillRect(3, 31, 24, 7); g.fillRect(8, 27, 13, 5);
    g.fillStyle = '#1b1720'; g.fillRect(10, 28, 4, 3); g.fillRect(15, 28, 4, 3);
  } else {
    g.fillRect(10, 20, 10, 20); g.fillRect(8, 18, 14, 3);
    g.fillStyle = '#100d16';
    for (let y = 22; y < 40; y += 4) g.fillRect(12, y, 6, 1);
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
  const t = now();

  // A few stars through the smog, and a dim red moon
  const sPer = ((WORLD_W / G) * 0.05) / 4;
  const sOff = Math.round(camAX * 0.05);
  ctx.fillStyle = '#4b4566';
  for (let i = Math.floor(sOff / sPer) - 1; i * sPer - sOff < bw + 10; i++) {
    for (let j = 0; j < 6; j++) {
      const k = ((i % 4) + 4) % 4 * 10 + j;
      ctx.fillRect(Math.round(i * sPer - sOff + hash(k) * sPer), Math.round(4 + hash(k + 50) * groundY * 0.45 - camAY * 0.05), 1, 1);
    }
  }
  // The moon hangs in one place, far beyond any parallax
  const mx = Math.round(bw * 0.72);
  const my = Math.round(Math.min(26, groundY * 0.12) - camAY * 0.02);
  disc(ctx, mx, my, 9, '#3a1626');
  disc(ctx, mx - 2, my - 1, 7, '#5a1f30');

  // Searchlight beams sweeping the clouds
  for (let i = 0; i < 3; i++) {
    const per = ((WORLD_W / G) * 0.12) / 3;
    const base = Math.round(((i * per + 40 - camAX * 0.12) % ((WORLD_W / G) * 0.12) + (WORLD_W / G) * 0.12) % ((WORLD_W / G) * 0.12));
    for (const bx of [base, base - (WORLD_W / G) * 0.12, base + (WORLD_W / G) * 0.12]) {
      if (bx < -120 || bx > bw + 120) continue;
      const ang = Math.sin(t * 0.25 + i * 2.1) * 0.5;
      const len = groundY * 0.9;
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = '#bfe9ff';
      ctx.beginPath();
      ctx.moveTo(bx, groundY - 30);
      ctx.lineTo(bx + Math.sin(ang - 0.05) * len, groundY - 30 - Math.cos(ang - 0.05) * len);
      ctx.lineTo(bx + Math.sin(ang + 0.05) * len, groundY - 30 - Math.cos(ang + 0.05) * len);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Far city skyline
  const fCount = 24;
  const fSpacing = ((WORLD_W / G) * 0.15) / fCount;
  const fOff = Math.round(camAX * 0.15);
  for (let i = Math.floor((fOff - 40) / fSpacing); i * fSpacing - fOff < bw + 40; i++) {
    const k = ((i % fCount) + fCount) % fCount;
    const img = tower(k);
    ctx.drawImage(img, Math.round(i * fSpacing - fOff + hash(k + 9) * 8), groundY - 12 - img.height);
    // Industrial gas flares on some towers
    if (hash(k + 30) < 0.2) {
      const fx = Math.round(i * fSpacing - fOff + hash(k + 9) * 8) + 4;
      const fy = groundY - 12 - img.height;
      const fl = Math.floor(t * 12 + k) % 3;
      rect(ctx, fx, fy, 2, 8, '#161029');
      rect(ctx, fx, fy - 3 - fl, 2, 3 + fl, '#ff7b2e');
      rect(ctx, fx, fy - 1, 2, 1, '#ffcf66');
    }
  }
  // Smog band over the city
  ctx.globalAlpha = 0.35;
  rect(ctx, 0, groundY - 30, bw, 30, '#3a1a45');
  ctx.globalAlpha = 0.25;
  rect(ctx, 0, groundY - 16, bw, 16, '#5a2140');
  ctx.globalAlpha = 1;

  // Ruined blocks
  const rCount = 20;
  const rSpacing = ((WORLD_W / G) * 0.35) / rCount;
  const rOff = Math.round(camAX * 0.35);
  for (let i = Math.floor((rOff - 40) / rSpacing); i * rSpacing - rOff < bw + 40; i++) {
    const k = ((i % rCount) + rCount) % rCount;
    const img = ruin(k);
    ctx.drawImage(img, Math.round(i * rSpacing - rOff + hash(k + 3) * rSpacing * 0.4), groundY - img.height + 4);
  }

  // Near debris line
  const count = 48;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  rect(ctx, 0, groundY - 2, bw, bh, '#0a0810');
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    const img = debrisSprite(k);
    ctx.drawImage(img, Math.round(i * spacing - jOff + hash(k) * spacing * 0.5) - 15, groundY - img.height + 2);
  }
}

// Rain over everything, drifting with the camera a little.
function weather(ctx, bw, bh, camAX, camAY) {
  const t = now();
  const n = Math.min(700, Math.floor((bw * bh) / 450));
  ctx.fillStyle = '#9fb7ff';
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < n; i++) {
    const sx = hash(i * 3 + 1) * (bw + 60);
    const speed = 220 + hash(i * 3 + 2) * 120;
    const y = ((hash(i * 3 + 3) * (bh + 40) + t * speed + camAY * 0.2) % (bh + 40)) - 20;
    const x = Math.round(((sx - y * 0.25 - camAX * 0.3) % (bw + 60) + bw + 60) % (bw + 60)) - 30;
    ctx.fillRect(x, Math.round(y), 1, 3);
    ctx.fillRect(x - 1, Math.round(y) + 3, 1, 1);
  }
  ctx.globalAlpha = 1;
}

// Turbine glow under the engine pods (and a searchlight on drones) instead of
// rotor blades. Offsets are from the sprite's anchor; the art faces right.
function rotor(ctx, u, x, y) {
  const flick = Math.floor(performance.now() / 60) % 2;
  const heli = u.type === 'helicopter';
  for (const dx of heli ? [-11, 3] : [-10, 4]) {
    const px = u.facing > 0 ? x + dx : x - dx - 5;
    const py = heli ? y - 1 : y + 1;
    rect(ctx, px, py, 5, 1 + flick, C.cyan);
    ctx.globalAlpha = 0.35;
    rect(ctx, px + 1, py + 2 + flick, 3, 2, C.cyan);
    ctx.globalAlpha = 1;
  }
  if (u.type === 'helicopter') {
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = '#d8f4ff';
    ctx.beginPath();
    const nx = x + 11 * u.facing;
    ctx.moveTo(nx, y - 5);
    ctx.lineTo(nx + 26 * u.facing, y + 60);
    ctx.lineTo(nx + 4 * u.facing, y + 60);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Holographic frame: a cyan wireframe with a scan line sweeping up.
function construction(ctx, x, y, w, h, progress) {
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = C.cyan;
  for (let sx = x; sx < x + w; sx += 6) ctx.fillRect(sx, y, 1, h);
  for (let sy = y; sy < y + h; sy += 6) ctx.fillRect(x, sy, w, 1);
  ctx.globalAlpha = 1;
  const scan = y + h - Math.round(h * progress);
  rect(ctx, x, scan, w, 1, C.white);
  rect(ctx, x, scan + 1, w, 1, C.cyan);
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  const t = team(b.faction);
  if (b.type === 'hq') {
    if (tick % 6 < 3) rect(ctx, x + 47, y - 1, 3, 1, C.red);
    if (tick % 23 === 0) rect(ctx, x + 3, y + 20, 58, 1, t.dark); // neon flicker
  } else if (b.type === 'mine') {
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(ms / 300);
    rect(ctx, x + 14, y + 14, 4, 10, '#ffffff');
    ctx.globalAlpha = 1;
    for (let i = 0; i < 2; i++) {
      const k = (ms / 1800 + i / 2) % 1;
      ctx.globalAlpha = 0.45 * (1 - k);
      rect(ctx, x + 15 + Math.round(Math.sin(k * 5 + i) * 2), y + 2 - Math.round(k * 12), 2, 2, '#8a8fa0');
      ctx.globalAlpha = 1;
    }
  } else if (b.type === 'turret') {
    const k = (ms / 700) % 1;
    rect(ctx, x + 22 + (Math.floor(k * 3) * 3), y + 12, 1, 3, C.cyan);
  } else if (b.type === 'workshop') {
    const fl = Math.floor(ms / 90) % 3;
    rect(ctx, x + 38, y - 2 - fl, 3, 2 + fl, '#ff7b2e');
    rect(ctx, x + 39, y - 1, 1, 1, '#ffcf66');
    for (let i = 0; i < 2; i++) {
      const k = (ms / 1600 + i / 2) % 1;
      ctx.globalAlpha = 0.5 * (1 - k);
      rect(ctx, x + 38 + Math.round(Math.sin(k * 6) * 2), y - 6 - Math.round(k * 12), 3, 3, '#3d3846');
      ctx.globalAlpha = 1;
    }
  } else if (b.type === 'airbase') {
    const on = tick % 8;
    for (let i = 0; i < 6; i++) rect(ctx, x + 2 + i * 8, y + 19, 2, 1, i === on % 6 ? C.white : C.redDark);
  } else if (b.type === 'barracks') {
    if (tick % 17 === 0) rect(ctx, x + 18, y + 6, 12, 2, t.dark);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  if (p.kind === 'bullet') {
    // Plasma bolt
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.violet);
    rect(ctx, x - dx, y - dy, 2, 1, '#2a8cff');
    rect(ctx, x, y, 2, 1, '#d8fbff');
  } else if (p.kind === 'bomb') {
    rect(ctx, x - 1, y - 2, 3, 4, C.O);
    rect(ctx, x - 1, y - 3, 3, 1, C.metal);
    if (Math.floor(performance.now() / 120) % 2) rect(ctx, x, y - 1, 1, 1, C.red);
  } else if (p.kind === 'lob') {
    // Missile with a smoky trail
    rect(ctx, x - dx * 2, y - dy * 2, 2, 2, 'rgba(140,130,160,0.5)');
    rect(ctx, x - dx, y - dy, 1, 1, '#ff7b2e');
    rect(ctx, x - 1, y - 1, 2, 2, C.metalLight);
  } else {
    // Plasma shell
    rect(ctx, x - dx, y - dy, 2, 2, 'rgba(255,63,168,0.5)');
    rect(ctx, x - 1, y - 1, 3, 3, C.pink);
    rect(ctx, x, y, 1, 1, '#ffffff');
  }
}

// The fallen: humans, or for machines a heap of chrome scrap with a dying eye.
function corpseKey(e) { return ROBOTS.has(e.type) ? 'scrap' : ''; }
function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(16, 6);
  if (ROBOTS.has(e.type)) {
    g.fillStyle = '#0a0a10'; g.fillRect(0, 5, 16, 1);
    outlined(g, [[2, 3, 5, 2, C.chromeDark], [7, 2, 4, 3, C.chrome], [11, 4, 3, 1, C.chromeDark]], [[8, 3, 1, 1, C.redDark], [3, 3, 2, 1, t.main], [7, 2, 4, 1, C.chromeLight]]);
    return { c, ax: 8, ay: 5 };
  }
  outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, C.coat], [11, 3, 2, 2, C.boot]], [[5, 3, 2, 1, t.main], [0, 2, 2, 1, '#17110f']]);
  return { c, ax: 7, ay: 5 };
}

export default {
  id: 'robots',
  name: 'Rise of the Robots',
  palette,
  teamBase: GUNMETAL,
  roofBase: [0.15, 0.15, 0.2],
  soldier: buildSoldier,
  vehicle: { jeep: buildCruiser, tank: buildHunter, artillery: buildWalker },
  aircraft: { helicopter: buildDrone, bomber: buildDropship },
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
  explosion: { rim: palette.red, body: '#ff7b2e', core: '#e8fbff', smoke: '#3b3346', smoke2: '#55496a' },
  corpse,
  corpseKey,
  debris: { '#7a4a24': '#3d3845', '#5c361a': '#6f7a86' },
  minimap: { sky: '#120c22', ground: '#2b2730', platform: '#4a525c', bridge: '#6f7a86', ramp: '#6f7a86', surface: '#6d6875' },
  // Same units and buildings, new names and badges.
  names: {
    soldier: 'Rebel', heavy: 'Endo', scout: 'Runner', engineer: 'Tech', sniper: 'Enforcer',
    jeep: 'Cruiser', tank: 'Hunter', artillery: 'Walker', helicopter: 'Drone', bomber: 'Dropship',
    hq: 'HQ', barracks: 'Bunker', turret: 'Pulse Gun', wall: 'Barrier', mine: 'Reactor', workshop: 'Factory',
    airbase: 'Skyport', bridge: 'Girder', ramp: 'Ramp',
  },
  // Units are shown with their own sprites in menus (see unitIcon in render.js).
  spriteIcons: true,
  icons: {
    turret: '⚡', wall: '🚧', mine: '☢️', workshop: '🏭', airbase: '🛰️', barracks: '🛡️',
  },
};
