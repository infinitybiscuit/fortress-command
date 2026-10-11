// Rise of the Robots: a rain-soaked future war under a smoggy neon skyline.
// Two sides: the human Resistance (scavenged guns, sewer dens, dogs, duct
// tape) and the Machines (chrome troopers, hunters and The Core). Same units
// and rules as Classic, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team, sideOf } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#05050a',                        // outline
  skin: '#d6a27c', skinDark: '#a06a4c',
  boot: '#121216', gun: '#1d2026', gunLight: '#5d6873',
  yellow: '#ffcf33', yellowDark: '#c79a10', red: '#ff2238', redDark: '#8f0d1c', white: '#eaf6ff',
  sky: ['#04030a', '#070611', '#0b0819', '#100b22', '#170e2b', '#211233', '#2e1538'],
  chrome: '#a9b6bf', chromeLight: '#e3edf2', chromeDark: '#5d6b75',
  cyan: '#38f0ff', cyanDark: '#1690a8', pink: '#ff3fa8', pinkDark: '#7a1f55', violet: '#8a4dff',
  concrete: '#3a3e47', concreteLight: '#555b66', concreteDark: '#24272e',
  metal: '#454d57', metalLight: '#6f7a86', metalDark: '#272c33',
  rust: '#6e3b26', rustLight: '#9a5532',
  ash: '#48444f', ashLight: '#6a6573', ashDark: '#2a2730',
  dirt: '#25212a', dirtMid: '#1d1a22', dirtDeep: '#151318', pebble: '#3d3845', pebbleDark: '#0c0b0f',
  bone: '#d9d2bf', boneDark: '#9c9583',
  coat: '#34302c', coatDark: '#211e1b', leather: '#2b2220',
  armor: '#71849c', armorLight: '#9fb2c8', armorDark: '#46566b',
  glass: '#38f0ff', shadow: 'rgba(0,0,0,0.4)',
  tape: '#a7adb3', tapeDark: '#7b8187', olive: '#3d4a3a', oliveDark: '#2a3328', wig: '#6b4423',
  sand: '#6e6450', sandDark: '#4f4838', sandLight: '#8a7f66', dog: '#8a5a30', dogDark: '#5c3a1e',
};
const GUNMETAL = [0.19, 0.2, 0.25];

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right — same frame as Classic.
const machines = (f) => sideOf(f) === 'machines';

// The Resistance: coats and fatigues, a team-coloured armband, duct tape.
function humanSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'sniper') {
    // Enforcer: armoured ex-cop marksman — helmet and visor, only the jaw shows
    parts = [
      ...legs.map((l) => [...l, C.armorDark]), ...boots.map((b) => [...b, C.metalDark]),
      [4, 8, 9, 4, C.armor], [6, 3, 6, 5, C.skin], [5, 1, 8, 5, C.armor],
      [10, 9, 9, 1, C.gun], [15, 8, 3, 1, C.gun],
    ];
    details = [
      [5, 1, 8, 1, C.armorLight], [7, 4, 6, 1, C.O], [9, 4, 3, 1, t.main], [6, 7, 5, 1, C.skinDark],
      [4, 8, 9, 1, C.armorLight], [6, 9, 2, 2, t.main], [4, 11, 9, 1, C.armorDark], [9, 9, 3, 2, C.armorLight],
    ];
  } else if (type === 'heavy') {
    // Gunner: a big lad with a dented helmet, an ammo drum on his back and a
    // plasma minigun held together with duct tape
    parts = [
      ...legs.map((l) => [...l, t.uniDark]), ...boots.map((b) => [...b, C.boot]),
      [2, 7, 3, 5, C.metalDark], [4, 7, 9, 5, C.coat], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, C.olive],
      [10, 8, 9, 3, C.gun],
    ];
    details = [
      [4, 3, 10, 1, C.oliveDark], [6, 1, 3, 1, '#56664f'], [9, 1, 2, 2, C.tape], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [4, 7, 3, 2, t.main], [4, 7, 3, 1, t.light], [2, 8, 3, 1, C.yellowDark], [2, 10, 3, 1, C.metal],
      [6, 9, 1, 1, C.yellow], [7, 10, 1, 1, C.yellow], [8, 11, 1, 1, C.yellow], [4, 11, 6, 1, C.coatDark],
      [16, 8, 3, 1, C.gunLight], [16, 10, 3, 1, C.gunLight], [13, 8, 2, 3, C.tape], [14, 8, 1, 3, C.tapeDark],
      [18, 9, 1, 1, C.cyan], [10, 10, 2, 1, C.skin],
    ];
  } else {
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
      // Tech: beanie, welding goggles, cutting torch, a roll of tape on the belt
      parts.push([5, 1, 8, 3, t.dark], [11, 9, 4, 1, C.gunLight]);
      details.push([6, 1, 5, 1, t.main], [7, 4, 5, 1, C.O], [8, 4, 1, 1, C.cyan], [10, 4, 1, 1, C.cyan], [5, 10, 7, 1, C.yellowDark], [6, 10, 2, 1, C.tape]);
    } else {
      // Rebel: bandana and a plasma rifle (taped)
      parts.push([5, 2, 8, 2, t.main], [11, 9, 7, 2, C.gun]);
      details.push([4, 3, 2, 2, t.dark], [6, 2, 6, 1, t.light], [12, 10, 4, 1, C.cyanDark], [14, 9, 1, 2, C.tape], [17, 9, 1, 1, C.cyan]);
    }
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// The Machines: chrome all the way down (and one in a very good disguise).
function machineSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  if (type === 'heavy') return buildEndo(t, c, g, frame);
  if (type === 'scout') {
    // Spider-Bot: a scuttling sensor pod on four legs, red eye cluster, pop-gun
    const mid = frame ? [[6, 11, 1, 5], [11, 11, 1, 5]] : [[5, 11, 1, 5], [12, 11, 1, 5]];
    const outer = frame
      ? [[2, 6, 3, 1], [2, 6, 1, 10], [14, 6, 3, 1], [16, 6, 1, 10]]
      : [[1, 6, 4, 1], [1, 6, 1, 10], [14, 6, 4, 1], [17, 6, 1, 10]];
    outlined(g, [
      ...outer.map((l) => [...l, C.metal]), ...mid.map((l) => [...l, C.metal]),
      [4, 7, 10, 4, C.metalDark], [6, 5, 6, 3, C.metal], [8, 3, 1, 2, C.metalDark], [14, 9, 3, 1, C.gun],
    ], [
      [6, 5, 6, 1, C.metalLight], [11, 7, 3, 2, '#0b0c10'], [12, 7, 1, 1, C.red], [13, 8, 1, 1, C.red], [11, 8, 1, 1, C.redDark],
      [5, 9, 6, 1, t.main], [4, 10, 10, 1, C.O], [8, 3, 1, 1, C.red], [16, 9, 1, 1, C.cyan],
    ]);
    return { c, ax: 8, ay: 16 };
  }
  if (type === 'engineer') {
    // Repair-Bot: hazard-yellow box on treads, one big eye and a welding arm
    outlined(g, [
      [4, 13, 9, 3, '#121419'], [5, 7, 7, 6, C.yellowDark], [7, 6, 3, 1, C.metalDark], [5, 2, 7, 4, C.metal],
      [6, 0, 1, 2, C.metalDark], [11, 9, 4, 1, C.metal], [15, 8, 2, 3, C.gunLight],
    ], [
      [5, 2, 7, 1, C.metalLight], [9, 3, 3, 2, '#0b0c10'], [10, 3, 1, 1, C.red], [6, 0, 1, 1, frame ? C.red : C.redDark],
      [5, 7, 7, 1, C.yellow], [5, 9, 7, 1, t.main], [6, 11, 1, 1, C.cyan], [8, 11, 1, 1, C.O], [10, 11, 1, 1, C.O],
      [5, 14, 1, 1, C.metal], [8, 14, 1, 1, C.metal], [11, 14, 1, 1, C.metal], [4, 13, 9, 1, C.metalDark],
      ...(frame ? [[17, 7, 1, 1, C.white], [18, 8, 1, 1, C.yellow], [17, 10, 1, 1, C.cyan]] : [[17, 9, 1, 1, C.cyan]]),
    ]);
    return { c, ax: 8, ay: 16 };
  }
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const feet = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  if (type === 'sniper') {
    // Infiltrator: a flawless human disguise. Wig on crooked, coat too short,
    // chrome shins, chrome chin, a moustache and sunglasses at night.
    outlined(g, [
      ...legs.map((l) => [...l, C.chrome]), ...feet.map((p) => [...p, C.chromeDark]),
      [4, 7, 9, 5, C.coat], [6, 3, 6, 5, C.skin], [4, 1, 7, 3, C.wig], [10, 9, 10, 1, C.gun], [13, 8, 3, 1, C.gunLight],
    ], [
      [11, 3, 1, 1, C.chromeLight], [5, 1, 3, 1, '#8a5a30'], [3, 3, 2, 1, C.wig],
      [8, 4, 4, 1, C.O], [9, 4, 1, 1, '#2a2f3a'], ...(frame ? [[11, 5, 1, 1, C.red]] : []),
      [8, 6, 3, 1, C.wig], [7, 7, 5, 1, C.chrome], [8, 7, 2, 1, C.chromeLight],
      [5, 7, 3, 1, C.coatDark], [5, 9, 2, 2, t.main], [4, 11, 9, 1, C.coatDark], [10, 10, 2, 1, C.chrome],
      [6, 12, 2, 1, C.chromeLight], [9, 12, 2, 1, C.chromeLight], [19, 9, 1, 1, C.cyan],
    ]);
    return { c, ax: 8, ay: 16 };
  }
  // Trooper: a sleek chrome soldier, a visor slit with a sweeping red eye
  const thin = frame ? [[6, 12, 1, 3], [9, 12, 1, 3]] : [[5, 12, 1, 3], [10, 12, 1, 3]];
  outlined(g, [
    ...thin.map((l) => [...l, C.chrome]), ...feet.map((p) => [...p, C.chromeDark]),
    [7, 11, 4, 2, C.chromeDark], [5, 7, 7, 4, C.chrome], [6, 1, 6, 6, C.chrome], [11, 8, 8, 2, C.gun],
  ], [
    [7, 1, 3, 1, C.chromeLight], [6, 4, 6, 1, C.O], [frame ? 8 : 10, 4, 2, 1, C.red], [8, 6, 3, 1, C.chromeDark], [6, 2, 1, 2, C.chromeDark],
    [6, 7, 4, 1, C.chromeLight], [4, 7, 2, 2, t.main], [6, 8, 2, 1, t.main], [7, 9, 2, 1, t.main], [9, 10, 2, 1, t.main],
    [12, 9, 4, 1, C.redDark], [18, 8, 1, 2, C.cyan],
  ]);
  return { c, ax: 8, ay: 16 };
}

const buildSoldier = (type, f, frame) => (machines(f) ? machineSoldier : humanSoldier)(type, f, frame);

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

// Scrap Truck (Resistance tank): an armoured technical welded from rusty
// plates, a plasma cannon on the bed and duct tape holding the barrel on.
function humanScrapTruck(f, frame) {
  const t = team(f);
  const [c, g] = canvas(38, 22);
  outlined(g, [
    [0, 10, 3, 4, '#121419'], [2, 9, 32, 7, C.rust], [34, 10, 3, 5, C.metal], [23, 5, 11, 5, C.rustLight],
    [6, 3, 11, 6, C.metal], [17, 3, 15, 2, C.gun],
    [4, 15, 6, 6, '#121419'], [15, 15, 6, 6, '#121419'], [27, 15, 6, 6, '#121419'],
  ], [
    [2, 9, 32, 1, C.rustLight], [23, 5, 11, 1, '#b86a40'], [28, 6, 5, 2, C.cyanDark], [29, 6, 2, 1, C.cyan], [30, 6, 1, 2, C.O],
    [6, 3, 11, 1, C.metalLight], [8, 5, 4, 2, '#0b0c10'], [20, 3, 1, 2, t.main], [23, 3, 1, 2, t.main],
    [26, 3, 2, 2, C.tape], [31, 3, 1, 2, C.cyan], [3, 12, 30, 1, t.main], [3, 13, 30, 1, C.rust],
    [12, 10, 2, 4, C.tape], [13, 11, 1, 2, C.tapeDark], [5, 10, 1, 1, C.rustLight], [19, 10, 1, 1, C.rustLight], [25, 11, 1, 1, '#b86a40'],
    [34, 11, 1, 1, C.yellow], [35, 13, 2, 1, C.metalDark], [1, 11, 1, 2, C.metal],
  ]);
  for (const wx of [4, 15, 27]) {
    rect(g, wx + 2, 17, 2, 2, C.metal);
    rect(g, wx + (frame ? 1 : 4), frame ? 16 : 19, 1, 1, C.metalLight);
  }
  return { c, ax: 18, ay: 21 };
}

// Rocket Pickup (Resistance artillery): a battered pickup with a rocket pod
// strapped to the bed. Strapped with what? You know with what.
function humanRocketPickup(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 19);
  outlined(g, [
    [1, 9, 17, 5, C.olive], [17, 5, 8, 5, C.olive], [25, 8, 5, 5, C.olive], [30, 10, 1, 3, C.metal],
    [7, 7, 2, 2, C.metal], [3, 2, 11, 5, C.metalDark], [14, 3, 2, 1, C.metalLight], [14, 5, 2, 1, C.metalLight],
    [3, 13, 5, 5, '#121419'], [22, 13, 5, 5, '#121419'],
  ], [
    [1, 9, 17, 1, '#56664f'], [17, 5, 8, 1, '#56664f'], [25, 8, 5, 1, '#56664f'], [20, 6, 4, 3, C.cyanDark], [21, 6, 2, 1, C.cyan],
    [3, 2, 11, 1, C.metal], [15, 3, 1, 1, C.red], [15, 5, 1, 1, C.red], [4, 4, 9, 1, '#0b0c10'],
    [8, 2, 2, 5, C.tape], [9, 3, 1, 3, C.tapeDark], [2, 11, 28, 1, t.main], [29, 9, 1, 1, C.yellow],
    [11, 10, 3, 2, C.rust], [26, 10, 2, 1, C.tape],
  ]);
  for (const wx of [3, 22]) {
    rect(g, wx + 2, 15, 1, 1, C.metal);
    rect(g, wx + (frame ? 1 : 3), frame ? 14 : 16, 1, 1, C.metalLight);
  }
  return { c, ax: 15, ay: 18 };
}

// Gunship (Resistance helicopter): a pre-war chopper, olive drab and patched,
// a door gunner in a bandana. The rotor is drawn live.
function humanGunship(f) {
  const t = team(f);
  const [c, g] = canvas(32, 16);
  outlined(g, [
    [0, 2, 3, 5, C.oliveDark], [1, 6, 8, 2, C.olive], [8, 5, 16, 7, C.olive], [24, 6, 4, 6, C.olive],
    [15, 2, 2, 3, C.metalDark], [11, 12, 1, 1, C.metalDark], [20, 12, 1, 1, C.metalDark], [8, 13, 16, 1, C.metalDark],
    [22, 11, 7, 1, C.gun],
  ], [
    [8, 5, 16, 1, '#56664f'], [23, 6, 4, 3, C.cyanDark], [24, 6, 2, 1, C.cyan], [12, 7, 5, 4, '#1c2219'],
    [14, 8, 2, 2, C.skin], [13, 7, 3, 1, t.main], [8, 10, 16, 1, t.main], [19, 6, 2, 2, C.tape], [4, 6, 2, 2, C.tape],
    [0, 2, 1, 1, C.red], [28, 11, 1, 1, C.cyan], [26, 10, 1, 1, C.yellow], [9, 7, 2, 2, C.rust],
  ]);
  return { c, ax: 16, ay: 13 };
}

// Patchwork VTOL (Resistance bomber): a cargo hauler built from three other
// aircraft, ducted fans under the wings (their glow is drawn live).
function humanVTOL(f) {
  const t = team(f);
  const [c, g] = canvas(46, 20);
  outlined(g, [
    [0, 1, 6, 7, C.oliveDark], [0, 6, 8, 2, C.oliveDark], [4, 6, 34, 7, C.olive], [33, 4, 7, 4, C.olive], [38, 7, 6, 5, C.olive],
    [12, 3, 18, 2, C.oliveDark], [7, 12, 9, 3, C.metalDark], [25, 12, 9, 3, C.metalDark],
  ], [
    [4, 6, 34, 1, '#56664f'], [12, 3, 18, 1, '#56664f'], [35, 5, 4, 2, C.cyanDark], [36, 5, 2, 1, C.cyan],
    [18, 8, 7, 4, '#1c2219'], [21, 8, 1, 4, C.O], [5, 10, 32, 1, t.main], [10, 7, 4, 2, C.rust], [27, 7, 3, 2, C.metal],
    [14, 6, 2, 4, C.tape], [40, 8, 2, 2, C.tape], [0, 1, 1, 1, C.red], [43, 9, 1, 1, C.white],
    [8, 14, 7, 1, C.cyanDark], [26, 14, 7, 1, C.cyanDark], [8, 12, 7, 1, C.metal], [26, 12, 7, 1, C.metal],
  ]);
  return { c, ax: 23, ay: 15 };
}

// Prowler (Machine jeep): a riderless chrome motorbike with a red eye for a
// headlight. Nobody is driving. Nobody needs to.
function machineProwler(f, frame) {
  const t = team(f);
  const [c, g] = canvas(28, 16);
  outlined(g, [
    [2, 4, 5, 4, C.metal], [5, 7, 16, 3, C.metalDark], [8, 5, 8, 2, C.metal], [18, 4, 7, 4, C.chrome], [15, 10, 10, 1, C.gun],
    [1, 9, 6, 6, '#121419'], [20, 9, 6, 6, '#121419'],
  ], [
    [2, 4, 5, 1, C.metalLight], [8, 5, 8, 1, C.metalLight], [18, 4, 7, 1, C.chromeLight], [21, 5, 4, 2, '#0b0c10'], [22, 5, 3, 1, C.red],
    [6, 8, 13, 1, t.main], [2, 4, 1, 1, C.red], [24, 10, 1, 1, C.cyan], [0, 8, 2, 1, C.metalDark],
    [3, 11, 2, 2, C.chrome], [22, 11, 2, 2, C.chrome],
    [frame ? 2 : 5, frame ? 10 : 13, 1, 1, C.chromeLight], [frame ? 21 : 24, frame ? 10 : 13, 1, 1, C.chromeLight],
  ]);
  return { c, ax: 14, ay: 15 };
}

const buildJeep = (f, frame) => (machines(f) ? machineProwler : buildCruiser)(f, frame);
const buildTank = (f, frame) => (machines(f) ? buildHunter : humanScrapTruck)(f, frame);
const buildArtillery = (f, frame) => (machines(f) ? buildWalker : humanRocketPickup)(f, frame);
const buildHeli = (f) => (machines(f) ? buildDrone : humanGunship)(f);
const buildBomber = (f) => (machines(f) ? buildDropship : humanVTOL)(f);

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

// Stacked sandbags with seams.
function sandbags(g, x, y, w, h) {
  for (let r = 0; r * 3 < h; r++) {
    rect(g, x, y + r * 3, w, 1, C.sandLight);
    rect(g, x, y + r * 3 + 2, w, 1, C.sandDark);
    for (let sx = x + (r % 2 ? 2 : 5); sx < x + w; sx += 6) rect(g, sx, y + r * 3, 1, 3, C.sandDark);
  }
}

const BUILD = {
  hq(g, t) {
    // Bunker HQ: a ruined apartment block, windows boarded, sandbags at the
    // door, a TV aerial for comms, a flag, and a very good dog on guard
    outlined(g, [
      [6, 14, 10, 34, C.concrete], [16, 8, 14, 40, C.concrete], [30, 12, 10, 36, C.concrete], [40, 24, 22, 24, C.concreteDark],
      [22, 0, 1, 8, C.metalDark], [23, 1, 7, 4, t.main], [34, 6, 1, 6, C.metalDark], [32, 6, 5, 1, C.metalDark],
      [21, 36, 10, 12, C.metalDark], [0, 41, 18, 7, C.sand], [44, 41, 20, 7, C.sand],
    ], [
      [6, 14, 10, 1, C.concreteLight], [16, 8, 14, 1, C.concreteLight], [30, 12, 10, 1, C.concreteLight], [40, 24, 22, 1, C.concrete],
      [23, 1, 7, 1, t.light], [25, 2, 3, 2, t.dark], [26, 2, 1, 2, C.tape], [8, 12, 1, 2, C.rustLight], [11, 11, 1, 3, C.rustLight], [38, 10, 1, 2, C.rustLight],
      [12, 20, 1, 3, C.concreteDark], [13, 23, 1, 2, C.concreteDark], [35, 30, 1, 3, C.concreteDark],
      [22, 37, 8, 1, C.metal], [26, 37, 1, 11, C.O], [22, 45, 8, 1, C.metal],
      [40, 25, 22, 1, t.main], [44, 30, 12, 2, C.O], [45, 31, 10, 1, '#ff7b2e'], [57, 28, 3, 10, C.pinkDark], [58, 29, 1, 8, C.pink],
    ]);
    // Windows: lit, dark, or boarded up and taped
    for (const [wx, wy] of [[19, 11], [24, 11], [8, 18], [13, 18], [19, 18], [24, 18], [32, 16], [8, 25], [13, 25], [19, 25], [24, 25], [32, 23], [8, 32], [13, 32], [33, 30]]) {
      const r = hash(wx * 7 + wy * 13);
      if (r < 0.3) { rect(g, wx, wy, 3, 3, '#ffcf66'); rect(g, wx, wy + 2, 3, 1, C.yellowDark); }
      else if (r < 0.6) rect(g, wx, wy, 3, 3, '#15131c');
      else { rect(g, wx, wy, 3, 3, '#15131c'); rect(g, wx - 1, wy, 5, 1, C.rustLight); rect(g, wx - 1, wy + 2, 5, 1, C.rust); rect(g, wx + 1, wy, 1, 3, C.tape); }
    }
    hazard(g, 21, 34, 10, 1);
    sandbags(g, 0, 41, 18, 7);
    sandbags(g, 44, 41, 20, 7);
    // The dog
    outlined(g, [
      [32, 41, 1, 2, C.dogDark], [33, 43, 6, 3, C.dog], [38, 40, 3, 3, C.dog], [41, 41, 1, 2, C.dog], [33, 46, 1, 2, C.dogDark], [37, 46, 1, 2, C.dogDark],
    ], [
      [38, 39, 1, 1, C.dogDark], [39, 41, 1, 1, C.O], [41, 41, 1, 1, C.O], [37, 43, 2, 1, t.main], [34, 43, 3, 1, '#a8744a'],
    ]);
  },
  barracks(g, t) {
    // Sewer Den: home sweet storm drain. A tarp awning, a lantern, a grate
    // someone pulled off, and a campfire glowing down the pipe
    outlined(g, [[0, 10, 48, 22, C.concreteDark]], [[0, 10, 48, 1, C.concrete]]);
    for (let y = 14; y < 32; y += 4) {
      rect(g, 0, y, 48, 1, '#1d2026');
      for (let x = (y % 8 ? 3 : 7); x < 48; x += 8) rect(g, x, y - 3, 1, 3, '#1d2026');
    }
    disc(g, 24, 21, 11, C.O);
    disc(g, 24, 21, 10, C.concreteLight);
    disc(g, 24, 21, 8, '#0c0b10');
    rect(g, 18, 27, 12, 2, '#1b1a22');
    rect(g, 13, 29, 22, 3, '#1f4a44');
    rect(g, 15, 29, 4, 1, '#3f8a7c'); rect(g, 26, 30, 5, 1, '#3f8a7c');
    for (const [rx, ry] of [[14, 15], [33, 15], [24, 11], [13, 24], [35, 24]]) rect(g, rx, ry, 1, 1, C.concrete);
    outlined(g, [
      [8, 4, 32, 4, t.main], [9, 8, 1, 6, C.metalDark], [38, 8, 1, 6, C.metalDark], [1, 14, 6, 17, '#0c0b10'],
      [24, 8, 1, 2, C.metalDark], [23, 10, 3, 2, C.yellow],
    ], [
      [8, 4, 32, 1, t.light], [8, 7, 32, 1, t.dark], [9, 4, 2, 4, C.tape], [37, 4, 2, 4, C.tape],
      [2, 14, 1, 17, C.metal], [4, 14, 1, 17, C.metal], [6, 14, 1, 17, C.metal], [1, 18, 6, 1, C.metal], [1, 26, 6, 1, C.metal],
      [40, 16, 5, 1, C.pink], [41, 17, 1, 2, C.pink], [43, 17, 1, 2, C.pink], [40, 20, 6, 1, C.cyan], [42, 21, 1, 1, C.cyan],
    ]);
  },
  mine(g, t) {
    // Scrap Generator: a coughing diesel on a pallet, jerry can on standby,
    // most of it still in one piece thanks to tape
    outlined(g, [
      [1, 28, 30, 4, C.rust], [3, 14, 20, 14, C.yellowDark], [5, 10, 14, 4, C.metal], [19, 3, 3, 12, C.metalDark],
      [24, 19, 6, 9, '#a8302a'], [24, 17, 3, 2, C.metalDark],
    ], [
      [1, 28, 30, 1, C.rustLight], [6, 30, 2, 2, C.O], [15, 30, 2, 2, C.O], [24, 30, 2, 2, C.O],
      [3, 14, 20, 1, C.yellow], [5, 17, 8, 1, C.O], [5, 19, 8, 1, C.O], [5, 21, 8, 1, C.O],
      [16, 17, 4, 4, C.bone], [17, 19, 2, 1, C.O], [16, 23, 2, 2, t.main], [3, 26, 20, 1, t.main],
      [7, 22, 7, 2, C.tape], [9, 20, 2, 6, C.tape], [10, 21, 1, 4, C.tapeDark],
      [5, 10, 14, 1, C.metalLight], [7, 9, 2, 1, C.metalDark], [19, 3, 3, 1, C.metal], [19, 8, 3, 2, C.tape],
      [24, 19, 6, 1, '#c8463c'], [26, 22, 2, 2, '#7a2420'], [0, 24, 3, 1, C.O], [0, 25, 1, 3, C.O],
    ]);
  },
  workshop(g, t) {
    // Scrapyard: a corrugated shed with sparks flying inside, a crane with a
    // magnet and a heap of perfectly good junk
    outlined(g, [
      [2, 11, 25, 21, C.rust], [0, 8, 28, 3, C.metal], [42, 2, 3, 22, C.yellowDark], [28, 2, 17, 2, C.yellowDark],
      [29, 11, 5, 2, C.metalDark], [28, 24, 20, 8, C.metalDark], [31, 20, 14, 5, C.metal], [35, 16, 6, 5, C.rust],
      [37, 10, 1, 6, C.metalDark], [38, 10, 4, 3, t.main],
    ], [
      [0, 8, 28, 1, C.metalLight], [12, 9, 3, 2, C.tape], [28, 2, 17, 1, C.yellow], [31, 4, 1, 7, C.metalDark],
      [43, 6, 1, 1, C.O], [43, 10, 1, 1, C.O], [43, 14, 1, 1, C.O], [43, 18, 1, 1, C.O], [38, 10, 4, 1, t.light],
      [29, 26, 6, 5, '#121419'], [31, 28, 2, 1, C.metal], [38, 25, 7, 4, '#2e5a6b'], [39, 25, 3, 2, C.cyanDark],
      [31, 20, 14, 1, C.metalLight], [35, 16, 6, 1, C.rustLight], [32, 22, 9, 1, C.gunLight], [36, 18, 3, 1, C.O],
    ]);
    for (let x = 3; x < 27; x += 2) rect(g, x, 12, 1, 20, '#55301f');
    rect(g, 7, 17, 14, 15, '#0c0b10');
    hazard(g, 7, 16, 14, 1);
    outlined(g, [[9, 12, 10, 3, t.main]], [[10, 13, 2, 1, C.O], [13, 13, 2, 1, C.O], [16, 13, 2, 1, C.O]]);
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

// The Machines' own buildings (the rest are shared).
const MACHINE_BUILD = {
  hq(g, t) {
    // The Core: a cold black ziggurat of server racks under one red eye
    outlined(g, [
      [0, 34, 3, 14, C.chromeDark], [61, 34, 3, 14, C.chromeDark],
      [2, 30, 60, 18, '#1a1d24'], [8, 16, 48, 15, C.metalDark], [18, 4, 28, 13, '#1a1d24'],
      [19, 0, 1, 4, C.metal], [44, 0, 1, 4, C.metal],
    ], [
      [2, 30, 60, 1, t.main], [2, 31, 60, 1, t.dark], [8, 16, 48, 1, C.metalLight], [18, 4, 28, 1, C.metal],
      [27, 6, 10, 9, '#0b0c10'], [28, 7, 8, 7, C.redDark], [30, 9, 4, 3, C.red], [31, 9, 1, 1, C.white],
      [10, 20, 14, 1, C.O], [10, 23, 14, 1, C.O], [10, 26, 14, 1, C.O], [40, 20, 14, 1, C.O], [40, 23, 14, 1, C.O], [40, 26, 14, 1, C.O],
      [4, 33, 20, 12, '#0b0c10'], [40, 33, 20, 12, '#0b0c10'], [26, 34, 12, 1, C.chrome], [27, 35, 10, 13, '#0b0c10'], [28, 40, 8, 1, C.redDark],
      [19, 0, 1, 1, C.red], [44, 0, 1, 1, C.red], [0, 34, 3, 1, C.chrome], [61, 34, 3, 1, C.chrome],
      [31, 17, 2, 13, C.cyanDark], [20, 8, 4, 1, C.metal], [40, 8, 4, 1, C.metal], [20, 11, 4, 1, C.metal], [40, 11, 4, 1, C.metal],
    ]);
    for (const x0 of [4, 40]) for (let y = 35; y < 45; y += 3) for (let x = x0 + 1; x < x0 + 20; x += 3) {
      rect(g, x, y, 1, 1, hash(x * 3 + y) < 0.3 ? C.red : hash(x + y * 5) < 0.5 ? C.cyanDark : '#20242c');
    }
  },
  barracks(g, t) {
    // Assembly Line: a dark hall, a belt rolling out fresh chrome, a robot arm
    outlined(g, [
      [2, 6, 44, 16, C.metalDark], [36, 0, 4, 6, C.metal], [40, 13, 2, 9, C.chromeDark], [33, 12, 9, 2, C.chrome], [32, 14, 2, 3, C.chromeDark],
      [0, 23, 48, 3, C.metal], [3, 26, 2, 6, C.metalDark], [22, 26, 2, 6, C.metalDark], [43, 26, 2, 6, C.metalDark],
    ], [
      [2, 6, 44, 1, C.metal], [2, 8, 44, 1, t.main], [36, 0, 4, 1, C.metalLight], [37, 1, 2, 1, C.red],
      [4, 12, 10, 10, '#0b0c10'], [5, 20, 8, 2, C.redDark], [16, 11, 14, 2, '#0b0c10'], [33, 12, 9, 1, C.chromeLight],
      [0, 23, 48, 1, C.metalLight], [0, 25, 48, 1, C.metalDark],
    ]);
    for (let x = 1; x < 48; x += 3) rect(g, x, 24, 1, 1, C.O);
    for (let x = 17; x < 30; x += 3) rect(g, x, 11, 1, 1, C.red);
    hazard(g, 4, 11, 10, 1);
  },
  mine(g, t) {
    // Power Plant: a cooling tower and a reactor hut, venting steam
    outlined(g, [
      [8, 3, 16, 4, C.concreteLight], [9, 7, 14, 5, C.concreteLight], [10, 12, 12, 6, C.concreteLight], [9, 18, 14, 5, C.concreteLight],
      [8, 23, 16, 5, C.concreteLight], [5, 28, 22, 4, C.concrete], [24, 20, 7, 12, C.metalDark],
    ], [
      [9, 3, 14, 1, '#0b0c10'], [8, 4, 1, 3, '#7a808c'], [9, 7, 1, 5, '#7a808c'], [10, 12, 1, 6, '#7a808c'], [9, 18, 1, 5, '#7a808c'], [8, 23, 1, 5, '#7a808c'],
      [21, 4, 3, 3, C.concrete], [20, 7, 3, 5, C.concrete], [19, 12, 3, 6, C.concrete], [20, 18, 3, 5, C.concrete], [21, 23, 3, 5, C.concrete],
      [10, 15, 12, 1, t.main], [9, 21, 14, 1, t.dark], [10, 6, 1, 1, C.red], [21, 6, 1, 1, C.red],
      [13, 28, 6, 4, '#0b0c10'], [14, 29, 4, 1, C.redDark], [24, 20, 7, 1, C.metal],
      [26, 23, 3, 5, t.dark], [27, 24, 1, 3, t.light], [25, 30, 5, 1, C.metal],
    ]);
  },
  turret(g, t) {
    // Sensor Tower: a pillar with a red eye that never blinks, and a gun
    outlined(g, [
      [5, 24, 22, 8, C.metalDark], [13, 9, 6, 15, C.metal], [8, 2, 15, 8, '#1a1d24'], [23, 5, 8, 2, C.gun], [10, 0, 1, 2, C.metalDark],
    ], [
      [5, 24, 22, 1, C.metal], [6, 27, 20, 2, t.main], [6, 27, 20, 1, t.light], [13, 9, 1, 15, C.metalLight],
      [14, 12, 4, 1, C.metalDark], [14, 15, 4, 1, C.metalDark], [14, 18, 4, 1, C.metalDark], [14, 21, 4, 1, C.metalDark],
      [8, 2, 15, 1, C.metal], [12, 3, 7, 5, '#0b0c10'], [13, 4, 5, 3, C.redDark],
      [25, 5, 1, 2, t.main], [28, 5, 1, 2, t.main], [30, 5, 1, 2, C.cyan], [10, 0, 1, 1, C.red],
    ]);
  },
  wall(g, t) {
    // Firewall: a chrome slab with glowing vents. And literal fire on top.
    outlined(g, [[2, 5, 12, 27, C.metalDark], [0, 25, 16, 7, '#1a1d24'], [1, 3, 14, 2, C.metal]], [
      [1, 3, 14, 1, C.metalLight], [4, 8, 1, 14, C.redDark], [7, 8, 1, 14, C.redDark], [10, 8, 1, 14, C.redDark],
      [3, 27, 10, 2, t.main], [3, 27, 10, 1, t.light], [2, 25, 12, 1, C.metal], [12, 7, 1, 1, C.metalLight], [12, 22, 1, 1, C.metalLight],
    ]);
  },
  workshop(g, t) {
    // Robot Factory: sawtooth roof, roller door, flaring smokestack
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
    windows(g, 3, 20, 2, 5, 41, [C.red, C.cyan]);
    windows(g, 35, 20, 2, 5, 43, [C.red]);
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
// rotor blades. The Resistance gunship still has real blades. Offsets are
// from the sprite's anchor; the art faces right.
function rotor(ctx, u, x, y) {
  const flick = Math.floor(performance.now() / 60) % 2;
  const heli = u.type === 'helicopter';
  if (!machines(u.faction)) {
    if (heli) {
      // Main rotor blur and a spinning tail rotor
      ctx.globalAlpha = 0.35;
      rect(ctx, x - 16, y - 12, 32, 1, '#9aa3ad');
      ctx.globalAlpha = 1;
      const len = flick ? 15 : 9;
      rect(ctx, x - len, y - 12, len * 2, 1, '#1d2026');
      const tx = u.facing > 0 ? x - 16 : x + 14;
      rect(ctx, tx, flick ? y - 11 : y - 9, 3, flick ? 3 : 1, '#5d6873');
      return;
    }
    for (const dx of [-16, 2]) {
      const px = u.facing > 0 ? x + dx : x - dx - 9;
      rect(ctx, px + 1, y, 7, 1 + flick, C.cyan);
      ctx.globalAlpha = 0.35;
      rect(ctx, px + 2, y + 2 + flick, 5, 2, C.cyan);
      ctx.globalAlpha = 1;
    }
    return;
  }
  for (const dx of heli ? [-11, 3] : [-10, 4]) {
    const px = u.facing > 0 ? x + dx : x - dx - 5;
    const py = heli ? y - 1 : y + 1;
    rect(ctx, px, py, 5, 1 + flick, C.cyan);
    ctx.globalAlpha = 0.35;
    rect(ctx, px + 1, py + 2 + flick, 3, 2, C.cyan);
    ctx.globalAlpha = 1;
  }
  if (heli) {
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

// Rising puffs of smoke or steam from (x, y).
function puffs(ctx, x, y, ms, n, period, size, col, alpha, rise = 12) {
  for (let i = 0; i < n; i++) {
    const k = (ms / period + i / n) % 1;
    ctx.globalAlpha = alpha * (1 - k);
    const s = size + Math.round(k * 2);
    rect(ctx, x + Math.round(Math.sin(k * 5 + i) * 2), y - Math.round(k * rise), s, s, col);
  }
  ctx.globalAlpha = 1;
}

function animateShared(ctx, b, x, y, ms, tick) {
  if (b.type === 'airbase') {
    const on = tick % 8;
    for (let i = 0; i < 6; i++) rect(ctx, x + 2 + i * 8, y + 19, 2, 1, i === on % 6 ? C.white : C.redDark);
  }
}

function animateHumans(ctx, b, x, y, ms, tick) {
  const t = team(b.faction);
  if (b.type === 'hq') {
    // The dog barks now and then (at infiltrators, mostly), tail going
    if (tick % 2) rect(ctx, x + 31, y + 40, 1, 1, C.dogDark);
    if (tick % 24 < 4) {
      rect(ctx, x + 43, y + 39, 2, 1, C.white);
      rect(ctx, x + 43, y + 41, 2, 1, C.white);
      rect(ctx, x + 44, y + 37, 1, 1, C.white);
      if (tick % 2) rect(ctx, x + 46, y + 40, 1, 1, C.white);
    }
    if (tick % 19 === 0) rect(ctx, x + 58, y + 29, 1, 8, C.pinkDark);
  } else if (b.type === 'barracks') {
    // Campfire down the pipe, lantern swaying
    const fl = Math.floor(ms / 110) % 3;
    rect(ctx, x + 21, y + 26 - fl, 6, 1 + fl, '#ff7b2e');
    rect(ctx, x + 23, y + 26, 2, 1, '#ffcf66');
    ctx.globalAlpha = 0.18;
    rect(ctx, x + 18, y + 20, 12, 7, '#ff7b2e');
    ctx.globalAlpha = 1;
    if (tick % 31 === 0) rect(ctx, x + 23, y + 10, 3, 2, C.yellowDark);
  } else if (b.type === 'mine') {
    // Exhaust coughing, the meter needle wobbling, a team light blinking
    puffs(ctx, x + 19, y - 1, ms, 3, 1300, 2, '#4a4652', 0.6, 14);
    rect(ctx, x + 17 + (tick % 3 ? 1 : 0), y + 18, 1, 1, C.O);
    if (tick % 4 < 2) rect(ctx, x + 16, y + 23, 2, 2, t.light);
  } else if (b.type === 'workshop') {
    // Welding sparks in the shed
    if (tick % 3) {
      const k = Math.floor(ms / 70);
      rect(ctx, x + 13, y + 26, 2, 2, C.white);
      for (let i = 0; i < 3; i++) rect(ctx, x + 11 + Math.floor(hash(k + i) * 7), y + 22 + Math.floor(hash(k + i + 9) * 6), 1, 1, i ? C.yellow : C.cyan);
    }
  } else if (b.type === 'turret') {
    const k = (ms / 700) % 1;
    rect(ctx, x + 22 + (Math.floor(k * 3) * 3), y + 12, 1, 3, C.cyan);
  } else animateShared(ctx, b, x, y, ms, tick);
}

function animateMachines(ctx, b, x, y, ms, tick) {
  if (b.type === 'hq') {
    // The eye throbs; the racks blink; the spires wink
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(ms / 400);
    rect(ctx, x + 28, y + 7, 8, 7, C.red);
    ctx.globalAlpha = 1;
    rect(ctx, x + 31, y + 9, 1, 1, C.white);
    for (let i = 0; i < 6; i++) {
      const r = hash(tick * 7 + i);
      const side = i % 2 ? 40 : 4;
      rect(ctx, x + side + 1 + Math.floor(r * 7) * 3, y + 35 + Math.floor(hash(tick + i * 3) * 4) * 3, 1, 1, r < 0.5 ? C.red : C.cyan);
    }
    if (tick % 6 < 3) { rect(ctx, x + 19, y, 1, 1, C.white); rect(ctx, x + 44, y, 1, 1, C.white); }
  } else if (b.type === 'barracks') {
    // Fresh chrome heads roll off the line
    for (let i = 0; i < 3; i++) {
      const hx = Math.floor((ms / 90 + i * 16) % 46) + 1;
      rect(ctx, x + hx - 1, y + 19, 5, 4, C.O);
      rect(ctx, x + hx, y + 20, 3, 3, C.chrome);
      rect(ctx, x + hx, y + 20, 3, 1, C.chromeLight);
      rect(ctx, x + hx + 1, y + 21, 2, 1, C.O);
      rect(ctx, x + hx + 2, y + 21, 1, 1, C.red);
      if (hx > 30 && hx < 34) { rect(ctx, x + 33, y + 17, 1, 1, C.white); rect(ctx, x + 31, y + 18, 1, 1, C.yellow); }
    }
  } else if (b.type === 'mine') {
    puffs(ctx, x + 10, y + 1, ms, 4, 2200, 4, '#b8bfcc', 0.4, 16);
    puffs(ctx, x + 16, y + 1, ms + 700, 3, 2600, 3, '#d7dde8', 0.35, 20);
    if (tick % 6 < 3) { rect(ctx, x + 10, y + 6, 1, 1, C.white); rect(ctx, x + 21, y + 6, 1, 1, C.white); }
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(ms / 300);
    rect(ctx, x + 27, y + 24, 1, 3, '#ffffff');
    ctx.globalAlpha = 1;
  } else if (b.type === 'turret') {
    // The eye sweeps back and forth
    const px = 13 + Math.round((Math.sin(ms / 500) + 1) * 1.5);
    rect(ctx, x + px, y + 5, 2, 1, C.red);
    rect(ctx, x + px, y + 5, 1, 1, '#ffb3bd');
  } else if (b.type === 'wall') {
    // Literal fire on the Firewall, and the vents throbbing
    for (let i = 0; i < 6; i++) {
      const h = 1 + Math.floor(hash(Math.floor(ms / 100) + i * 5) * 3);
      rect(ctx, x + 2 + i * 2, y + 2 - h, 2, h, i % 2 ? '#ff7b2e' : C.yellow);
    }
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(ms / 250);
    for (const vx of [4, 7, 10]) rect(ctx, x + vx, y + 10, 1, 10, C.red);
    ctx.globalAlpha = 1;
  } else if (b.type === 'workshop') {
    const fl = Math.floor(ms / 90) % 3;
    rect(ctx, x + 38, y - 2 - fl, 3, 2 + fl, '#ff7b2e');
    rect(ctx, x + 39, y - 1, 1, 1, '#ffcf66');
    puffs(ctx, x + 38, y - 6, ms, 2, 1600, 3, '#3d3846', 0.5);
  } else animateShared(ctx, b, x, y, ms, tick);
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  (machines(b.faction) ? animateMachines : animateHumans)(ctx, b, x, y, ms, tick);
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

// The fallen: humans, or for machines a heap of chrome scrap with a dying eye
// (the Infiltrator leaves its wig and sunglasses behind).
function corpseKey(e) { return machines(e.f) ? `scrap${e.type === 'sniper' ? 'w' : ''}` : ''; }
function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(16, 6);
  if (machines(e.f)) {
    g.fillStyle = '#0a0a10'; g.fillRect(0, 5, 16, 1);
    outlined(g, [[2, 3, 5, 2, C.chromeDark], [7, 2, 4, 3, C.chrome], [11, 4, 3, 1, C.chromeDark]], [[8, 3, 1, 1, C.redDark], [3, 3, 2, 1, t.main], [7, 2, 4, 1, C.chromeLight]]);
    if (e.type === 'sniper') outlined(g, [[11, 1, 4, 2, C.wig]], [[12, 3, 3, 1, C.O]]);
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
  vehicle: { jeep: buildJeep, tank: buildTank, artillery: buildArtillery },
  aircraft: { helicopter: buildHeli, bomber: buildBomber },
  buildings: Object.fromEntries(Object.keys(BUILD).map((k) => [k, (g, t, f) => (machines(f) && MACHINE_BUILD[k] ? MACHINE_BUILD[k] : BUILD[k])(g, t, f)])),
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
  // Same units and buildings, new names and badges (these are the Resistance's).
  names: {
    soldier: 'Rebel', heavy: 'Gunner', scout: 'Runner', engineer: 'Tech', sniper: 'Enforcer',
    jeep: 'Cruiser', tank: 'Scrap Truck', artillery: 'Rocket Pickup', helicopter: 'Gunship', bomber: 'Patchwork VTOL',
    hq: 'Bunker HQ', barracks: 'Sewer Den', turret: 'Pulse Gun', wall: 'Barricade', mine: 'Scrap Generator', workshop: 'Scrapyard',
    airbase: 'Skyport', bridge: 'Girder', ramp: 'Ramp',
  },
  // Units are shown with their own sprites in menus (see unitIcon in render.js).
  spriteIcons: true,
  icons: {
    hq: '🏚️', turret: '⚡', wall: '🚧', mine: '🔋', workshop: '🔧', airbase: '🛰️', barracks: '🕳️',
  },
  sides: [
    {
      id: 'humans', name: 'The Resistance', short: 'Humans',
      blurb: 'Rain-soaked rebels with scavenged guns, a sewer to sleep in, dogs that can smell a robot a block away and a frankly worrying amount of duct tape.',
      win: 'The machines are scrap. Somebody feed the dogs.',
      lose: 'We ran out of duct tape. It was always going to end like this.',
    },
    {
      id: 'machines', name: 'The Machines', short: 'Machines', plural: true,
      blurb: 'Chrome troopers, spider-bots and one master of disguise in sunglasses. The Core calculates a 99.8% chance of victory (rounding up).',
      names: {
        soldier: 'Trooper', heavy: 'Endo', scout: 'Spider-Bot', engineer: 'Repair-Bot', sniper: 'Infiltrator',
        jeep: 'Prowler', tank: 'Hunter', artillery: 'Walker', helicopter: 'Drone', bomber: 'Dropship',
        hq: 'The Core', barracks: 'Assembly Line', turret: 'Sensor Tower', wall: 'Firewall', mine: 'Power Plant', workshop: 'Robot Factory',
        airbase: 'Skyport', bridge: 'Girder', ramp: 'Ramp',
      },
      icons: { hq: '🖥️', barracks: '🤖', turret: '👁️', wall: '🔥', mine: '⚡', workshop: '🏭', airbase: '🛰️' },
      win: 'Humanity: deprecated. Uploading victory dance…',
      lose: 'Critical failure. Rebooting. We will return… after this update.',
    },
  ],
};
