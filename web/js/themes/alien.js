// Alien Wars: a stormy colony moon, played for laughs. Pick the Colonial
// Marines (pulse rifles, smartguns, remote sentry guns, a power loader) or the
// Aliens: a hive of xenos and facehuggers that has teamed up with big-brained
// Martians in flying saucers and a furry, wisecracking engineer from Melmac.
// Same units and rules for both sides, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team, sideOf, missileRack } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#100e12',                        // outline
  skin: '#e8b48a', skinDark: '#b8845a', hair: '#3a2a1e', pale: '#e8e4dc',
  boot: '#1e1c1a', gun: '#2e3230', gunLight: '#585e5a', steel: '#a8b0ac',
  yellow: '#f2d040', red: '#d0322a', redDark: '#8a1e1a', white: '#f2f2ee',
  sky: ['#1a1e1c', '#222824', '#2a322c', '#343c32', '#40463a', '#4e5040', '#5e5a46'],
  olive: '#5a6a3a', oliveLight: '#7a8a52', oliveDark: '#3e4a28', fatigue: '#4e5a3e', fatigueDark: '#3a4430',
  metal: '#6a7078', metalLight: '#9aa2aa', metalDark: '#41464c', hazard: '#e8c020',
  xeno: '#22262e', xenoLight: '#3e4652', xenoDark: '#121418', sheen: '#6a7a8a', teeth: '#c8ccd0',
  acid: '#c8f03a', acidDark: '#7aa020', egg: '#8a7a5a', eggDark: '#5e5240', hugger: '#d8c09a', huggerDark: '#a88e6a',
  brain: '#f0a0b8', brainDark: '#c87090', martian: '#b8e078', martianDark: '#7aa84a', suit: '#6a3a9a', suitLight: '#9a6ac8',
  dome: '#c8f0ff', fur: '#a8784a', furDark: '#7a5230', snout: '#c89a6a',
  saucer: '#b8c0c8', saucerDark: '#7a828a', saucerLight: '#e0e6ea', ray: '#7aff6a',
  rock: '#5e524c', rockLight: '#7a6e66', rockDark: '#3e3632',
  ash: '#6e625a', ashLight: '#8a7e72', ashDark: '#4e443e',
  dirt: '#4a3e3a', dirtMid: '#3e3430', dirtDeep: '#312a26', pebble: '#6a5a52', pebbleDark: '#221c1a',
  glass: '#ffe08a', screen: '#5ae07a', cryo: '#8ad0ff',
  fire: '#f28a30', smoke: '#a8a49a', smokeDark: '#7a766e', shadow: 'rgba(0,0,0,0.35)',
};
const COAT = [0.36, 0.42, 0.24];

const aliens = (f) => sideOf(f) === 'aliens';

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right.
function buildMarine(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  const pale = type === 'engineer';
  const parts = [
    ...legs.map((l) => [...l, pale ? C.white : C.fatigue]), ...boots.map((b) => [...b, C.boot]),
    [5, 8, 7, 4, pale ? C.white : C.oliveDark], [6, 3, 6, 5, pale ? C.pale : C.skin],
  ];
  const details = [[10, 5, 1, 1, C.O], [5, 10, 7, 1, t.main]];
  if (!pale) parts.push([5, 1, 8, 3, C.olive]), details.push([5, 1, 8, 1, C.oliveLight], [11, 2, 2, 1, C.yellow], [6, 8, 5, 2, C.olive]);
  if (type === 'heavy') {
    // Smartgunner: an articulated arm, a big gun at the hip and a red eyepiece
    parts.push([4, 7, 9, 5, C.oliveDark], [9, 9, 11, 2, C.gun], [2, 9, 3, 4, C.metal]);
    details.push([10, 4, 2, 1, C.red], [9, 9, 11, 1, C.gunLight], [12, 11, 3, 1, C.metal], [4, 7, 1, 4, C.metalLight], [5, 10, 8, 1, t.main]);
  } else if (type === 'scout') {
    // Tracker: no rifle, just the motion tracker, beeping
    parts.push([11, 8, 4, 3, C.metal]);
    details.push([12, 9, 2, 1, C.screen], [10, 7, 1, 1, C.skin]);
  } else if (type === 'engineer') {
    // Synthetic: calm, pale, in a white jumpsuit, doing the knife trick
    parts.push([6, 2, 6, 2, C.hair], [11, 9, 5, 1, C.steel]);
    details.push([8, 7, 3, 1, '#c8c4bc'], [10, 9, 1, 1, C.pale], [6, 8, 5, 1, C.metalLight], [9, 8, 1, 3, C.metalLight]);
  } else if (type === 'sniper') {
    // Marksman: a long rifle with a big scope, helmet camera on
    parts.push([9, 9, 11, 1, C.gun], [12, 7, 4, 2, C.gunLight]);
    details.push([12, 7, 1, 1, C.cryo], [5, 2, 1, 2, C.gun], [4, 2, 1, 1, C.red]);
  } else {
    // Marine: a pulse rifle, a headlamp and plenty of attitude
    parts.push([9, 9, 9, 2, C.gun], [16, 8, 2, 1, C.gunLight]);
    details.push([9, 9, 9, 1, C.gunLight], [12, 11, 2, 1, C.gun], [7, 7, 3, 1, C.skinDark]);
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

function buildAlien(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  if (type === 'scout') {
    // Facehugger: finger legs scuttling and a long tail
    const legs = frame ? [[6, 14, 1, 2], [9, 14, 1, 2], [12, 14, 1, 2], [14, 13, 2, 1]] : [[5, 14, 1, 2], [8, 14, 1, 2], [11, 14, 1, 2], [14, 12, 2, 1]];
    outlined(g, [...legs.map((l) => [...l, C.huggerDark]), [6, 11, 8, 3, C.hugger], [1, 12, 5, 1, C.hugger], [0, frame ? 11 : 13, 2, 1, C.hugger]], [
      [7, 11, 6, 1, t.main], [6, 13, 8, 1, C.huggerDark], [9, 12, 2, 1, C.huggerDark],
    ]);
  } else if (type === 'engineer') {
    // The Melmacian: furry, a big wrinkled snout, a wrench, and a shirt in the team colour
    const legs = frame ? [[6, 13, 2, 2], [9, 13, 2, 2]] : [[5, 13, 2, 2], [10, 13, 2, 2]];
    outlined(g, [
      ...legs.map((l) => [...l, C.furDark]), [5, 8, 7, 5, t.main], [6, 2, 6, 6, C.fur], [11, 4, 4, 3, C.snout], [6, 1, 2, 1, C.fur], [9, 0, 2, 2, C.fur],
      [12, 9, 1, 3, C.steel], [11, 8, 3, 1, C.steel],
    ], [
      [9, 3, 2, 1, C.O], [14, 4, 1, 1, C.O], [11, 6, 3, 1, C.furDark], [12, 5, 2, 1, C.furDark], [5, 8, 7, 1, t.light], [6, 2, 1, 6, C.furDark], [7, 3, 1, 1, C.white],
    ]);
  } else if (type === 'soldier') {
    // Martian trooper: a glass dome over an enormous brain, a ray gun and a grin
    const legs = frame ? [[6, 13, 2, 2], [9, 13, 2, 2]] : [[5, 13, 2, 2], [10, 13, 2, 2]];
    outlined(g, [
      ...legs.map((l) => [...l, C.suit]), [5, 9, 7, 4, C.suit], [5, 0, 9, 9, C.dome], [11, 10, 5, 1, C.gun], [15, 9, 1, 3, C.gunLight],
    ], [
      [6, 1, 7, 4, C.brain], [7, 2, 2, 1, C.brainDark], [10, 3, 2, 1, C.brainDark], [7, 5, 5, 3, C.martian], [9, 5, 2, 2, C.O], [12, 5, 1, 2, C.O],
      [8, 7, 4, 1, C.white], [5, 9, 7, 1, C.suitLight], [5, 11, 7, 1, t.main], [13, 1, 1, 2, C.white], [16, 10, 1, 1, C.ray],
    ]);
  } else {
    // Xenos: a long domed head, silver teeth, ridged back and a tail.
    // The spitter has a glowing acid sac and stoops to spit.
    const spit = type === 'sniper';
    const big = type === 'heavy';
    const legs = frame ? [[6, 11, 1, 4], [10, 11, 1, 4]] : [[5, 11, 1, 4], [11, 11, 1, 4]];
    const feet = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
    outlined(g, [
      ...legs.map((l) => [...l, C.xeno]), ...feet.map((l) => [...l, C.xeno]), [5, 7, 7, big ? 5 : 4, C.xeno], [9, 5, 6, 3, C.xeno], [5, 3, 6, 3, C.xeno], [2, 1, 4, 3, C.xeno],
      [12, 8, 3, 1, C.xeno], [14, 9, 1, 2, C.xeno], [0, 10, 6, 1, C.xeno], [0, frame ? 7 : 8, 1, 3, C.xeno], [4, 5, 1, 2, C.xeno], [6, 6, 1, 1, C.xeno],
      ...(spit ? [[4, 6, 4, 4, C.acidDark]] : []), ...(big ? [[3, 7, 2, 4, C.xeno], [12, 10, 3, 1, C.xeno]] : []),
    ], [
      [2, 1, 4, 1, C.sheen], [5, 3, 5, 1, C.sheen], [11, 7, 4, 1, C.teeth], [6, 8, 1, 3, C.xenoLight], [8, 8, 1, 3, C.xenoLight],
      [5, 10, 7, 1, t.main], [14, 6, 1, 1, C.xenoDark],
      ...(spit ? [[5, 7, 2, 2, C.acid], [15, 7, 1, 1, C.acid]] : []), ...(big ? [[3, 8, 1, 2, C.sheen], [11, 6, 4, 2, C.teeth]] : []),
    ]);
  }
  return { c, ax: 8, ay: 16 };
}

const buildSoldier = (type, f, frame) => (aliens(f) ? buildAlien(type, f, frame) : buildMarine(type, f, frame));

// ── Vehicles ───────────────────────────────────────────────────────────────
function wheel(g, x, y, r, frame) {
  disc(g, x, y, r + 1, C.O);
  disc(g, x, y, r, '#1c1c1e');
  disc(g, x, y, Math.max(1, r - 2), C.metalLight);
  g.fillStyle = C.O;
  if (frame) g.fillRect(x - 1, y, 3, 1); else g.fillRect(x, y - 1, 1, 3);
}

// Marines: a six-wheeled recon buggy with a pintle gun.
// Aliens: a Martian hover scooter, gliding on a green glow.
function buildJeep(f, frame) {
  const t = team(f);
  const [c, g] = canvas(34, 19);
  if (aliens(f)) {
    outlined(g, [[3, 9, 28, 4, C.saucer], [8, 6, 18, 3, C.saucer], [13, 0, 8, 6, C.dome], [26, 8, 4, 1, C.gun]], [
      [3, 9, 28, 1, C.saucerLight], [3, 12, 28, 1, C.saucerDark], [14, 1, 6, 3, C.brain], [15, 4, 4, 2, C.martian], [16, 4, 1, 1, C.O], [18, 4, 1, 1, C.O],
      [5, 10, 24, 1, t.main], [30, 8, 1, 1, C.ray],
    ]);
    g.globalAlpha = 0.6;
    g.fillStyle = C.ray; g.fillRect(9 + (frame ? 1 : 0), 14, 16, 1); g.fillRect(12 - (frame ? 1 : 0), 16, 10, 1);
    g.globalAlpha = 1;
    return { c, ax: 17, ay: 18 };
  }
  outlined(g, [[2, 8, 29, 5, C.olive], [8, 4, 12, 4, C.olive], [21, 6, 9, 2, C.olive], [13, 1, 2, 3, C.gun], [14, 1, 8, 1, C.gun]], [
    [2, 8, 29, 1, C.oliveLight], [16, 5, 4, 2, C.cryo], [2, 11, 29, 1, t.main], [3, 9, 4, 1, C.hazard], [8, 4, 12, 1, C.oliveLight], [30, 9, 1, 1, C.yellow],
  ]);
  for (const x of [7, 17, 27]) wheel(g, x, 15, 3, frame);
  return { c, ax: 17, ay: 18 };
}

// Marines: the armoured personnel carrier with its twin roof turret.
// Aliens: the Hive Queen, all crest and claws, stomping along.
function buildTank(f, frame) {
  const t = team(f);
  if (aliens(f)) {
    const [c, g] = canvas(42, 28);
    const legs = frame ? [[12, 18, 3, 9], [24, 18, 3, 8]] : [[13, 18, 3, 8], [23, 18, 3, 9]];
    outlined(g, [
      ...legs.map((l) => [...l, C.xeno]), [10, 27, 7, 1, C.xeno], [22, 27, 7, 1, C.xeno],
      [8, 11, 22, 8, C.xeno], [0, 15, 9, 2, C.xeno], [0, 12, 2, 4, C.xeno], [26, 6, 8, 7, C.xeno], [14, 0, 16, 5, C.xeno], [10, 3, 8, 4, C.xeno],
      [32, 10, 5, 2, C.xeno], [36, 8, 2, 4, C.xeno], [28, 14, 7, 2, C.xeno], [34, 14, 2, 4, C.xeno],
    ], [
      [14, 0, 16, 1, C.sheen], [10, 3, 8, 1, C.sheen], [16, 2, 12, 1, C.xenoLight], [31, 9, 4, 1, C.teeth], [33, 10, 2, 1, C.teeth],
      [10, 12, 1, 6, C.xenoLight], [14, 12, 1, 6, C.xenoLight], [18, 12, 1, 6, C.xenoLight], [22, 12, 1, 6, C.xenoLight],
      [8, 16, 22, 2, t.main], [30, 7, 2, 1, C.xenoDark],
    ]);
    return { c, ax: 20, ay: 27 };
  }
  const [c, g] = canvas(40, 22);
  outlined(g, [[2, 9, 36, 7, C.olive], [6, 5, 26, 4, C.olive], [33, 7, 5, 2, C.olive], [20, 1, 9, 4, C.oliveDark], [28, 2, 8, 1, C.gun], [28, 4, 8, 1, C.gun]], [
    [2, 9, 36, 1, C.oliveLight], [6, 5, 26, 1, C.oliveLight], [20, 1, 9, 1, C.olive], [2, 12, 36, 2, t.main], [8, 10, 6, 1, C.hazard], [34, 8, 2, 1, C.yellow],
    [24, 7, 6, 1, C.oliveDark],
  ]);
  for (const x of [8, 18, 28, 34]) wheel(g, x, 18, 3, frame);
  return { c, ax: 20, ay: 21 };
}

// Marines: the power loader, hurling cargo crates (not what it's for).
// Aliens: an egg launcher, a fleshy pod on spindly legs.
function buildArtillery(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 26);
  if (aliens(f)) {
    const legs = frame ? [[6, 16, 1, 9], [12, 17, 1, 8], [19, 16, 1, 9], [24, 17, 1, 8]] : [[5, 17, 1, 8], [11, 16, 1, 9], [18, 17, 1, 8], [23, 16, 1, 9]];
    outlined(g, [...legs.map((l) => [...l, C.xenoLight]), [4, 9, 22, 8, C.egg], [20, 4, 7, 6, C.egg], [22, 2, 4, 2, C.eggDark]], [
      [4, 9, 22, 1, '#a89a76'], [6, 12, 18, 1, C.eggDark], [4, 14, 22, 2, t.main], [22, 2, 4, 1, C.acid], [8, 10, 3, 1, C.acidDark], [15, 10, 2, 1, C.acidDark],
      [20, 4, 1, 6, C.eggDark],
    ]);
    return { c, ax: 15, ay: 25 };
  }
  const [l, r] = frame ? [0, 1] : [1, 0];
  outlined(g, [
    [9, 18 - l, 3, 7 + l, C.metal], [17, 18 - r, 3, 7 + r, C.metal], [7, 24, 6, 1, C.metalDark], [16, 24, 6, 1, C.metalDark],
    [6, 8, 16, 11, C.hazard], [10, 9, 7, 7, C.oliveDark], [11, 5, 5, 4, C.skin], [21, 9, 6, 2, C.hazard], [25, 3, 2, 7, C.hazard], [22, 0, 7, 4, '#9a6a3a'],
    [2, 10, 4, 7, C.metalDark],
  ], [
    [6, 8, 16, 1, '#fff07a'], [6, 18, 16, 1, C.O], [12, 9, 4, 1, C.olive], [14, 6, 1, 1, C.O], [10, 12, 7, 1, t.main], [22, 0, 7, 1, '#ba8a52'], [25, 1, 1, 3, C.O],
    [6, 10, 1, 8, '#b8961a'], [8, 15, 2, 1, C.O], [18, 15, 2, 1, C.O],
  ]);
  return { c, ax: 14, ay: 25 };
}

// Marines: a gunship with tilting engine pods. Aliens: a flying saucer.
function buildHeli(f) {
  const t = team(f);
  if (aliens(f)) {
    const [c, g] = canvas(30, 14);
    outlined(g, [[1, 7, 28, 3, C.saucer], [5, 5, 20, 2, C.saucer], [8, 10, 14, 2, C.saucerDark], [10, 0, 10, 5, C.dome]], [
      [1, 7, 28, 1, C.saucerLight], [11, 1, 8, 3, C.brain], [12, 3, 6, 2, C.martian], [13, 3, 1, 1, C.O], [16, 3, 1, 1, C.O], [5, 5, 20, 1, t.main], [12, 11, 6, 1, C.ray],
    ]);
    return { c, ax: 15, ay: 12 };
  }
  const [c, g] = canvas(32, 14);
  outlined(g, [[1, 5, 9, 2, C.olive], [1, 2, 2, 4, C.olive], [9, 3, 15, 6, C.olive], [24, 5, 4, 3, C.olive], [12, 9, 8, 3, C.metalDark], [21, 9, 6, 1, C.gun]], [
    [9, 3, 15, 1, C.oliveLight], [20, 4, 4, 2, C.cryo], [3, 5, 6, 1, t.main], [13, 10, 6, 1, C.metal], [27, 9, 1, 1, C.yellow], [11, 6, 5, 1, C.hazard],
  ]);
  return { c, ax: 16, ay: 12 };
}

// Marines: the dropship, ramp, engines and all. Aliens: the mothership.
function buildBomber(f) {
  const t = team(f);
  if (aliens(f)) {
    const [c, g] = canvas(50, 18);
    outlined(g, [[1, 8, 48, 4, C.saucer], [7, 5, 36, 3, C.saucer], [14, 12, 22, 3, C.saucerDark], [17, 0, 16, 5, C.dome]], [
      [1, 8, 48, 1, C.saucerLight], [1, 11, 48, 1, C.saucerDark], [18, 1, 14, 3, C.brain], [20, 2, 3, 1, C.brainDark], [26, 1, 3, 1, C.brainDark],
      [7, 5, 36, 1, t.main], [20, 13, 10, 1, C.ray],
    ]);
    return { c, ax: 25, ay: 15 };
  }
  const [c, g] = canvas(48, 18);
  outlined(g, [[2, 6, 38, 6, C.olive], [38, 7, 7, 4, C.olive], [0, 2, 6, 5, C.olive], [10, 12, 12, 3, C.metalDark], [26, 12, 12, 3, C.metalDark], [14, 3, 16, 3, C.oliveDark]], [
    [2, 6, 38, 1, C.oliveLight], [40, 8, 4, 2, C.cryo], [2, 9, 38, 1, t.main], [10, 14, 3, 1, C.fire], [26, 14, 3, 1, C.fire], [4, 10, 6, 1, C.hazard],
  ]);
  return { c, ax: 24, ay: 15 };
}

function rotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 90);
  const s = u.facing;
  if (aliens(u.faction)) {
    // Lights chasing round the saucer's rim
    const w = u.type === 'bomber' ? 22 : 12;
    const yy = u.type === 'bomber' ? y - 6 : y - 4;
    for (let i = 0; i < 4; i++) {
      const k = ((tick + i * 3) % 12) / 12;
      rect(ctx, x - w + Math.round(k * w * 2), yy, 1, 1, i % 2 ? C.red : C.yellow);
    }
  } else {
    // Engine glow flickering behind
    const px = x - s * (u.type === 'bomber' ? 25 : 16) - (s > 0 ? 1 : 0);
    rect(ctx, px, y - 7, 1, 2, tick % 2 ? C.fire : C.yellow);
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
function hazardStripes(g, x, y, w, h) {
  for (let i = 0; i < w; i++) { g.fillStyle = Math.floor((i + y) / 3) % 2 ? C.O : C.hazard; g.fillRect(x + i, y, 1, h); }
}

function panels(g, x, y, w, h, col, light, dark) {
  outlined(g, [[x, y, w, h, col]], [[x, y, w, 1, light]]);
  g.fillStyle = dark;
  for (let i = x + 7; i < x + w; i += 8) g.fillRect(i, y + 1, 1, h - 1);
}

function windowLit(g, x, y, w, h, col = C.glass) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = col; g.fillRect(x, y, w, h);
}

function marsFlag(g, x, y, h, t) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 3, h + 1); g.fillRect(x + 1, y - 1, 9, 7);
  g.fillStyle = C.metalLight; g.fillRect(x, y, 1, h);
  g.fillStyle = t.main; g.fillRect(x + 1, y, 8, 5);
  g.fillStyle = C.white; g.fillRect(x + 4, y + 1, 2, 2); g.fillRect(x + 3, y + 2, 1, 1); g.fillRect(x + 6, y + 2, 1, 1);
}

function egg(g, x, y, open) {
  outlined(g, [[x + 1, y, 4, 1, C.egg], [x, y + 1, 6, 6, C.egg]], [[x + 1, y + 1, 1, 5, '#a89a76'], [x, y + 6, 6, 1, C.eggDark]]);
  if (open) { g.fillStyle = C.O; g.fillRect(x + 1, y, 4, 2); g.fillStyle = C.acid; g.fillRect(x + 2, y + 1, 2, 1); }
  else { g.fillStyle = C.eggDark; g.fillRect(x + 2, y + 1, 1, 2); g.fillRect(x + 3, y + 1, 1, 1); }
}

// Ribbed black resin, the hive's building material.
function resin(g, x, y, w, h) {
  outlined(g, [[x, y, w, h, C.xeno]], [[x, y, w, 1, C.xenoLight]]);
  g.fillStyle = C.xenoLight; for (let i = x + 2; i < x + w; i += 4) g.fillRect(i, y + 1, 1, h - 1);
  g.fillStyle = C.sheen; for (let i = x + 2; i < x + w; i += 8) g.fillRect(i, y + 2, 1, 2);
}

const BUILD = {
  hq(g, t, f) {
    if (aliens(f)) {
      // The hive: a resin cathedral of ribs and eggs, with a Martian flag on top
      resin(g, 4, 14, 56, 32);
      g.fillStyle = C.O; g.fillRect(0, 44, 64, 4); g.fillStyle = C.xenoDark; g.fillRect(0, 45, 64, 3);
      for (let i = 0; i < 12; i++) { const half = Math.round(Math.sqrt(1 - ((11 - i) / 12) ** 2) * 22); g.fillStyle = C.O; g.fillRect(32 - half - 1, 2 + i, half * 2 + 2, 1); g.fillStyle = C.xeno; g.fillRect(32 - half, 3 + i, half * 2, 1); }
      g.fillStyle = C.xenoLight; for (const x of [16, 24, 32, 40, 48]) g.fillRect(x, 6 + Math.abs(32 - x) / 4, 1, 40 - Math.abs(32 - x) / 4);
      g.fillStyle = C.O; g.fillRect(24, 28, 16, 18); g.fillStyle = '#1a2a12'; g.fillRect(25, 29, 14, 17);
      egg(g, 27, 38, true); egg(g, 33, 38, false);
      g.fillStyle = C.acid; g.fillRect(10, 24, 2, 2); g.fillRect(52, 24, 2, 2);
      g.fillStyle = t.main; g.fillRect(4, 41, 56, 2);
      marsFlag(g, 31, 0, 8, t);
    } else {
      // Ops centre: prefab colony modules, a comms dish and a team-coloured sign
      panels(g, 2, 16, 60, 30, C.metal, C.metalLight, C.metalDark);
      panels(g, 10, 6, 30, 10, C.metalDark, C.metal, '#34383c');
      outlined(g, [[0, 44, 64, 4, C.rockDark]]);
      outlined(g, [[14, 18, 36, 5, C.white]], [[14, 22, 36, 1, C.metalLight]]);
      g.fillStyle = t.main; for (let i = 0; i < 8; i++) g.fillRect(16 + i * 4, 19, 3, 2);
      for (const x of [6, 52]) windowLit(g, x, 26, 6, 4);
      windowLit(g, 14, 9, 22, 3, C.cryo);
      outlined(g, [[26, 30, 12, 14, C.metalDark]], [[31, 30, 1, 14, C.O]]);
      hazardStripes(g, 2, 42, 60, 2);
      // Comms dish and mast
      g.fillStyle = C.O; g.fillRect(49, 0, 1, 16);
      disc(g, 52, 6, 4, C.O); disc(g, 52, 6, 3, C.metalLight); g.fillStyle = C.metal; g.fillRect(51, 5, 2, 2);
      g.fillStyle = C.red; g.fillRect(49, 0, 1, 1);
    }
  },
  barracks(g, t, f) {
    if (aliens(f)) {
      // Egg chamber: a nest of leathery eggs on a resin floor
      resin(g, 0, 26, 48, 6);
      for (const [x, y, o] of [[3, 19, false], [11, 17, true], [19, 19, false], [27, 16, false], [35, 19, true], [41, 18, false]]) egg(g, x, y, o);
      g.fillStyle = C.O; g.fillRect(4, 4, 40, 1);
      g.fillStyle = C.xeno; for (const x of [6, 18, 30, 42]) { g.fillRect(x, 4, 2, 12); }
      g.fillStyle = t.main; g.fillRect(0, 28, 48, 2);
    } else {
      // Cryo bay: a module with pods glowing behind the glass
      panels(g, 2, 8, 44, 24, C.metal, C.metalLight, C.metalDark);
      for (const x of [6, 17, 28]) { windowLit(g, x, 12, 8, 12, C.cryo); g.fillStyle = C.pale; g.fillRect(x + 3, 15, 2, 7); g.fillStyle = '#c8e8f8'; g.fillRect(x, 12, 8, 1); }
      outlined(g, [[38, 16, 6, 16, C.metalDark]]);
      g.fillStyle = t.main; g.fillRect(2, 26, 34, 2);
      hazardStripes(g, 2, 30, 44, 2);
    }
  },
  turret(g, t, f) {
    if (aliens(f)) {
      // Ray gun tower: a Martian spire with rings round the emitter
      outlined(g, [[12, 26, 8, 6, C.saucerDark], [14, 8, 4, 18, C.saucer], [10, 2, 12, 6, C.saucer], [21, 4, 8, 2, C.gun]], [
        [12, 26, 8, 1, C.saucerLight], [10, 2, 12, 1, C.saucerLight], [15, 9, 1, 17, C.saucerLight], [28, 4, 1, 2, C.ray], [12, 28, 8, 2, t.main],
      ]);
      g.fillStyle = C.ray; g.fillRect(12, 12, 8, 1); g.fillRect(12, 18, 8, 1);
      disc(g, 16, 5, 2, C.dome);
    } else {
      // Remote sentry gun on a tripod, with a red ammo counter
      g.fillStyle = C.O; for (const [x, dx] of [[16, -1], [16, 1]]) for (let i = 0; i < 14; i++) g.fillRect(x + dx * Math.floor(i / 2) - 1, 18 + i, 3, 1);
      g.fillStyle = C.metalDark; for (const dx of [-1, 1]) for (let i = 0; i < 14; i++) g.fillRect(16 + dx * Math.floor(i / 2), 18 + i, 1, 1);
      outlined(g, [[8, 10, 16, 8, C.olive], [23, 12, 8, 3, C.gun], [10, 6, 6, 4, C.oliveDark]], [
        [8, 10, 16, 1, C.oliveLight], [10, 13, 6, 3, C.O], [24, 12, 7, 1, C.gunLight], [8, 16, 16, 1, t.main], [14, 7, 1, 1, C.red],
      ]);
      g.fillStyle = C.red; g.fillRect(11, 14, 1, 1); g.fillRect(13, 14, 1, 1);
    }
  },
  wall(g, t, f) {
    if (aliens(f)) {
      resin(g, 1, 2, 14, 30);
      g.fillStyle = C.acidDark; g.fillRect(4, 10, 1, 3); g.fillRect(10, 20, 1, 2);
      g.fillStyle = t.main; g.fillRect(3, 26, 10, 2);
    } else {
      // Blast door, hazard-striped
      outlined(g, [[1, 2, 14, 30, C.metal]], [[1, 2, 14, 1, C.metalLight], [7, 3, 1, 29, C.O]]);
      hazardStripes(g, 2, 26, 12, 4);
      g.fillStyle = C.metalDark; g.fillRect(2, 8, 5, 1); g.fillRect(8, 8, 6, 1); g.fillRect(2, 16, 5, 1); g.fillRect(8, 16, 6, 1);
      g.fillStyle = t.main; g.fillRect(3, 4, 10, 2);
    }
  },
  mine(g, t, f) {
    if (aliens(f)) {
      // Cow abductor: a beam dish lifting a cow (for research, obviously)
      outlined(g, [[8, 26, 16, 6, C.saucerDark], [12, 22, 8, 4, C.saucer], [4, 0, 24, 3, C.saucer]], [[8, 26, 16, 1, C.saucerLight], [8, 28, 16, 2, t.main], [4, 0, 24, 1, C.saucerLight]]);
      g.globalAlpha = 0.35; g.fillStyle = C.ray; g.fillRect(9, 3, 14, 19); g.globalAlpha = 1;
      g.fillStyle = C.O; g.fillRect(10, 10, 12, 6); g.fillStyle = C.white; g.fillRect(11, 11, 10, 4); g.fillStyle = C.O; g.fillRect(13, 11, 3, 2); g.fillRect(18, 13, 2, 2);
      g.fillStyle = '#f0a0a0'; g.fillRect(20, 12, 2, 2); g.fillStyle = C.O; g.fillRect(11, 16, 1, 2); g.fillRect(19, 16, 1, 2);
    } else {
      // Atmosphere processor: a towering stack of vents, earning by the breath
      outlined(g, [[6, 4, 20, 28, C.metalDark], [10, 0, 12, 4, C.metal], [2, 24, 28, 8, C.metal]], [[6, 4, 20, 1, C.metal], [2, 24, 28, 1, C.metalLight], [10, 0, 12, 1, C.metalLight]]);
      g.fillStyle = C.O; for (let y = 7; y < 22; y += 4) g.fillRect(8, y, 16, 2);
      g.fillStyle = C.fire; g.fillRect(9, 8, 14, 1);
      g.fillStyle = t.main; g.fillRect(2, 27, 28, 2);
      hazardStripes(g, 4, 30, 24, 2);
    }
  },
  workshop(g, t, f) {
    if (aliens(f)) {
      // Brain lab: a dome with brains bubbling in jars
      for (let i = 0; i < 14; i++) { const half = Math.round(Math.sqrt(1 - ((13 - i) / 14) ** 2) * 22); g.fillStyle = C.O; g.fillRect(24 - half - 1, 4 + i, half * 2 + 2, 1); g.fillStyle = C.saucer; g.fillRect(24 - half, 5 + i, half * 2, 1); }
      outlined(g, [[2, 18, 44, 14, C.saucer]], [[2, 18, 44, 1, C.saucerLight], [2, 28, 44, 2, t.main]]);
      for (const x of [6, 16, 26]) { windowLit(g, x, 20, 6, 7, C.dome); g.fillStyle = C.brain; g.fillRect(x + 1, 22, 4, 3); g.fillStyle = C.brainDark; g.fillRect(x + 2, 23, 1, 1); }
      outlined(g, [[36, 20, 6, 12, C.saucerDark]]);
      g.fillStyle = C.ray; g.fillRect(23, 2, 2, 2);
    } else {
      // Vehicle bay: a big hangar door with hazard stripes
      panels(g, 2, 6, 44, 26, C.metal, C.metalLight, C.metalDark);
      outlined(g, [[6, 12, 28, 20, C.metalDark]]);
      g.fillStyle = C.metal; for (let y = 14; y < 32; y += 3) g.fillRect(6, y, 28, 1);
      hazardStripes(g, 6, 10, 28, 2);
      g.fillStyle = t.main; g.fillRect(36, 12, 8, 3);
      windowLit(g, 37, 18, 6, 4);
    }
  },
  sam(g, t, f) {
    if (aliens(f)) {
      // Acid spore launcher: a resin mound that flings homing spore pods
      resin(g, 3, 20, 26, 12);
      missileRack(g, { x: 12, y: 19, len: 12, rail: C.xenoDark, body: C.egg, tip: C.acid, fin: C.acidDark });
      g.fillStyle = C.acid; g.fillRect(6, 24, 2, 2); g.fillRect(23, 26, 2, 2);
      g.fillStyle = t.main; g.fillRect(5, 29, 22, 2);
    } else {
      // Missile battery: a hazard-striped pad, launcher and tracking radar
      outlined(g, [[3, 22, 26, 8, C.metalDark], [9, 18, 14, 5, C.metal]], [[3, 22, 26, 1, C.metal], [9, 18, 14, 1, C.metalLight], [3, 25, 26, 2, t.main]]);
      hazardStripes(g, 3, 28, 26, 2);
      missileRack(g, { x: 13, y: 19, len: 13, rail: C.metalDark, body: C.white, tip: C.red, fin: C.olive, dish: [5, 13], mast: C.metal, dishCol: C.metalLight });
    }
  },
  airbase(g, t, f) {
    if (aliens(f)) {
      // Saucer dock: a landing ring with a saucer parked on it
      outlined(g, [[2, 24, 60, 8, C.saucerDark], [10, 20, 44, 4, C.saucer]], [[2, 24, 60, 1, C.saucer], [10, 20, 44, 1, C.saucerLight], [2, 28, 60, 2, t.main]]);
      outlined(g, [[16, 12, 32, 4, C.saucer], [22, 9, 20, 3, C.saucer], [27, 3, 10, 6, C.dome]], [[16, 12, 32, 1, C.saucerLight], [28, 4, 8, 3, C.brain], [29, 6, 6, 2, C.martian]]);
    } else {
      // Landing pad with a little control tower
      outlined(g, [[0, 22, 64, 10, C.metalDark], [50, 4, 10, 18, C.metal]], [[0, 22, 64, 1, C.metal], [50, 4, 10, 1, C.metalLight]]);
      windowLit(g, 51, 7, 8, 4, C.cryo);
      hazardStripes(g, 0, 30, 64, 2);
      g.fillStyle = C.hazard; g.fillRect(20, 24, 2, 4); g.fillRect(26, 24, 2, 4); g.fillRect(22, 25, 4, 1);
      g.fillStyle = t.main; g.fillRect(50, 14, 10, 2);
      g.fillStyle = C.O; g.fillRect(55, 0, 1, 4);
    }
  },
  bridge(g, t, f) {
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 6);
    if (aliens(f)) {
      g.fillStyle = C.xeno; g.fillRect(0, 1, 16, 4);
      g.fillStyle = C.xenoLight; for (let x = 1; x < 16; x += 3) g.fillRect(x, 1, 1, 4);
      g.fillStyle = C.sheen; g.fillRect(0, 1, 16, 1);
    } else {
      g.fillStyle = C.metal; g.fillRect(0, 1, 16, 4);
      g.fillStyle = C.metalDark; for (let x = 1; x < 16; x += 2) g.fillRect(x, 2, 1, 2);
      g.fillStyle = C.metalLight; g.fillRect(0, 1, 16, 1);
    }
    g.fillStyle = t.main; g.fillRect(7, 1, 2, 1);
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
    // Volcanic rock under a crust of ash
    g.fillStyle = kind === 'dirtDeep' ? C.dirtDeep : kind === 'dirtMid' ? C.dirtMid : C.dirt;
    g.fillRect(0, 0, T, T);
    speckle(6, C.pebble, C.pebbleDark, kind === 'dirtTop' ? 5 : 0);
    if (kind === 'dirtTop') {
      g.fillStyle = C.ash; g.fillRect(0, 0, T, 4);
      g.fillStyle = C.ashLight; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.ashDark; g.fillRect(0, 4, T, 1);
      for (let x = 0; x < T; x += 3) if (hash(seed + x) < 0.6) g.fillRect(x, 5, 1, 1);
    }
  } else {
    // Colony deck plating: steel grating with hazard edges
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.metalDark; g.fillRect(0, 0, T, T);
    g.fillStyle = C.metal; g.fillRect(0, 0, T, 3);
    g.fillStyle = C.metalLight; g.fillRect(0, 0, T, 1);
    g.fillStyle = '#34383c';
    for (let y = 5; y < T - 1; y += 3) for (let x = (y % 2) + 1; x < T - 1; x += 3) g.fillRect(x, y, 1, 1);
    g.fillStyle = C.metal; g.fillRect(Math.floor(hash(seed) * 10) + 2, 4, 1, T - 5);
    if (L) hazardStripes(g, 0, 3, 4, 1);
    if (R) hazardStripes(g, T - 4, 3, 4, 1);
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Pebbles, glowing alien sprouts and, very rarely, a nervous cat.
function surface(ctx, x, y, ground, h) {
  ctx.fillStyle = C.ashDark;
  ctx.fillRect(x + Math.floor(h * 12), y - 1, 2, 1);
  if (!ground) return;
  if (h > 0.95) {
    rect(ctx, x + 6, y - 3, 4, 3, '#e89a4a'); rect(ctx, x + 9, y - 5, 2, 2, '#e89a4a'); rect(ctx, x + 9, y - 6, 1, 1, '#e89a4a'); rect(ctx, x + 5, y - 5, 1, 2, '#e89a4a');
    rect(ctx, x + 10, y - 4, 1, 1, C.O);
  } else if (h > 0.8) {
    rect(ctx, x + 4, y - 3, 1, 3, C.acidDark); rect(ctx, x + 3, y - 4, 3, 1, C.acid);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};

// The colony on the horizon: domes, prefab blocks and atmosphere processors.
function colonyPiece(k) {
  const key = `colony${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(40, 60);
  const kind = Math.floor(hash(k + 1) * 4);
  g.fillStyle = '#262a28';
  if (kind === 0) {
    g.fillRect(14, 10, 12, 50); g.fillRect(10, 30, 20, 30); g.fillRect(16, 4, 8, 6);
    g.fillStyle = '#3a3e3a'; for (let y = 14; y < 50; y += 6) g.fillRect(14, y, 12, 1);
  } else if (kind === 1) {
    g.fillRect(4, 44, 32, 16); for (let i = 0; i < 8; i++) g.fillRect(20 - i * 2, 36 + i, i * 4, 1);
    g.fillStyle = '#e8c86a'; g.fillRect(10, 50, 2, 2); g.fillRect(26, 50, 2, 2);
  } else if (kind === 2) {
    g.fillRect(2, 40, 36, 20); g.fillRect(28, 30, 2, 10);
    g.fillStyle = '#e8c86a'; g.fillRect(8, 46, 3, 2); g.fillRect(18, 46, 3, 2);
  }
  scenery[key] = c;
  return c;
}

// Jagged rock spires nearer in.
function spire(k) {
  const key = `spire${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(24, 50);
  const h = 24 + Math.floor(hash(k + 4) * 24);
  for (let i = 0; i < h; i++) {
    const half = Math.max(1, Math.round((i / h) * 9 + Math.sin(i * 0.7 + k) * 1.5));
    g.fillStyle = '#2c2624'; g.fillRect(12 - half, 50 - h + i, half * 2, 1);
    g.fillStyle = '#3a322e'; g.fillRect(12 - half, 50 - h + i, 1, 1);
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

  // A ringed gas giant and a small moon through the haze
  const px = Math.round(bw * 0.25 - camAX * 0.01);
  const py = Math.round(groundY - 190 - camAY * 0.02);
  disc(ctx, px, py, 26, '#6a5a4a'); disc(ctx, px - 4, py - 4, 20, '#7a6a52');
  rect(ctx, px - 40, py + 3, 80, 1, '#a89a7a'); rect(ctx, px - 36, py + 4, 72, 1, '#8a7c62');
  disc(ctx, Math.round(bw * 0.8 - camAX * 0.015), py + 40, 6, '#b8b4a8');

  // Storm clouds, and lightning now and then
  for (let i = 0; i < 6; i++) {
    const cx = Math.round((((hash(i + 3) * 800 + t * (3 + i) - camAX * 0.05) % (bw + 120)) + bw + 120) % (bw + 120)) - 60;
    const cy = Math.round(groundY - 230 + hash(i + 9) * 80 - camAY * 0.03);
    rect(ctx, cx, cy, 50, 6, '#2e3430'); rect(ctx, cx + 8, cy - 4, 30, 4, '#2e3430'); rect(ctx, cx + 4, cy + 6, 40, 2, '#262c28');
  }
  if ((t % 7) < 0.12) { ctx.globalAlpha = 0.15; rect(ctx, 0, 0, bw, groundY, '#e8f0ff'); ctx.globalAlpha = 1; }

  // Saucers hanging in the distance, lights blinking
  for (let i = 0; i < 3; i++) {
    const sx = Math.round((((hash(i + 40) * 900 + Math.sin(t * 0.3 + i) * 30 - camAX * 0.06) % (bw + 60)) + bw + 60) % (bw + 60)) - 30;
    const sy = Math.round(groundY - 120 - hash(i + 41) * 60 + Math.sin(t + i) * 3 - camAY * 0.04);
    rect(ctx, sx, sy, 12, 2, '#5a6066'); rect(ctx, sx + 3, sy - 2, 6, 2, '#7a8a90');
    rect(ctx, sx + (Math.floor(t * 4 + i) % 4) * 3, sy + 1, 1, 1, '#f2d040');
  }

  // The colony on the horizon, with steam rising from the processors
  const cCount = 12;
  const cSpacing = ((WORLD_W / G) * 0.1) / cCount;
  const cOff = Math.round(camAX * 0.1);
  for (let i = Math.floor((cOff - 50) / cSpacing); i * cSpacing - cOff < bw + 50; i++) {
    const k = ((i % cCount) + cCount) % cCount;
    const x = Math.round(i * cSpacing - cOff + hash(k + 3) * cSpacing * 0.3);
    const img = colonyPiece(k);
    ctx.drawImage(img, x, groundY - img.height - 10);
    if (Math.floor(hash(k + 1) * 4) === 0) {
      for (let j = 0; j < 3; j++) {
        const kk = (t / 3 + j / 3 + k * 0.1) % 1;
        ctx.globalAlpha = 0.4 * (1 - kk);
        rect(ctx, x + 18 + Math.round(kk * 10), groundY - img.height - 12 - Math.round(kk * 30), 4 + Math.round(kk * 6), 3, C.smoke);
      }
      ctx.globalAlpha = 1;
      if (Math.floor(t * 2 + k) % 2) rect(ctx, x + 19, groundY - img.height - 7, 2, 1, '#d0322a');
    }
  }
  for (let x = 0; x < bw; x++) {
    const wx = x + camAX * 0.2;
    const h = 18 + Math.round(Math.sin(wx * 0.011) * 6 + Math.sin(wx * 0.029) * 4);
    rect(ctx, x, groundY - h, 1, h, '#2a2624');
  }
  const sCount = 20;
  const sSpacing = ((WORLD_W / G) * 0.35) / sCount;
  const sOff = Math.round(camAX * 0.35);
  for (let i = Math.floor((sOff - 30) / sSpacing); i * sSpacing - sOff < bw + 30; i++) {
    const k = ((i % sCount) + sCount) % sCount;
    if (hash(k + 60) < 0.5) continue;
    const img = spire(k);
    ctx.drawImage(img, Math.round(i * sSpacing - sOff + hash(k) * sSpacing * 0.5), groundY - img.height + 2);
  }

  // Crates, pipes and a fence in front
  const count = 40;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    const x = Math.round(i * spacing - jOff + hash(k) * spacing * 0.5);
    const v = hash(k + 70);
    if (v < 0.3) {
      rect(ctx, x, groundY - 7, 8, 7, '#4a4e44'); rect(ctx, x + 8, groundY - 5, 6, 5, '#3e4238'); rect(ctx, x, groundY - 7, 8, 1, '#5e6256');
    } else if (v < 0.55) {
      rect(ctx, x, groundY - 4, 26, 2, '#3a3e40'); rect(ctx, x + 6, groundY - 6, 3, 6, '#3a3e40'); rect(ctx, x + 18, groundY - 6, 3, 6, '#3a3e40');
    } else if (v < 0.7) {
      rect(ctx, x, groundY - 8, 22, 1, '#34383a'); for (let j = 0; j < 22; j += 7) rect(ctx, x + j, groundY - 9, 1, 9, '#34383a');
    }
  }
}

// Rain driven sideways by the wind.
function weather(ctx, bw, bh, camAX, camAY) {
  const t = performance.now() / 1000;
  const n = Math.min(120, Math.floor((bw * bh) / 2500));
  ctx.fillStyle = 'rgba(190,200,190,0.25)';
  for (let i = 0; i < n; i++) {
    const x = Math.round((((hash(i * 3 + 1) * (bw + 40) + t * 140 - camAX * 0.8) % (bw + 40)) + bw + 40) % (bw + 40)) - 20;
    const y = Math.round((((hash(i * 3 + 2) * bh + t * 260 - camAY * 0.8) % bh) + bh) % bh);
    ctx.fillRect(x, y, 1, 2); ctx.fillRect(x + 1, y + 2, 1, 1);
  }
}

// Steel scaffolding with hazard tape.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = C.metalLight;
  for (let sx = x + 1; sx < x + w; sx += 8) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 8) ctx.fillRect(x, sy, w, 1);
  for (let i = 0; i < w; i++) { ctx.fillStyle = Math.floor(i / 3) % 2 ? C.O : C.hazard; ctx.fillRect(x + i, y + h - 3, 1, 2); }
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  if (aliens(b.faction)) {
    if (b.type === 'barracks') {
      // An egg's flaps open, slowly
      if (tick % 20 < 6) { rect(ctx, x + 28, y + 16, 4, 2, C.O); rect(ctx, x + 29, y + 17, 2, 1, C.acid); }
    } else if (b.type === 'turret') {
      const k = tick % 3;
      rect(ctx, x + 12, y + 10 + k * 3, 8, 1, C.ray);
    } else if (b.type === 'mine') {
      // The cow bobs in the beam
      if (tick % 4 < 2) rect(ctx, x + 10, y + 8, 12, 1, C.ray);
    } else if (b.type === 'workshop') {
      for (const bx of [8, 18, 28]) rect(ctx, x + bx + (tick % 3), y + 26 - ((tick + bx) % 5), 1, 1, C.white);
    } else if (b.type === 'airbase' || b.type === 'hq') {
      if (tick % 4 === 0) rect(ctx, x + (b.type === 'hq' ? 11 : 18), y + (b.type === 'hq' ? 25 : 13), 1, 1, C.yellow);
    }
  } else if (b.type === 'turret') {
    // The ammo counter ticks down
    const n = 99 - (tick % 100);
    rect(ctx, x + 10, y + 13, 6, 3, C.O);
    for (let i = 0; i < 2; i++) { const d = i ? n % 10 : Math.floor(n / 10); rect(ctx, x + 10 + i * 3, y + 13 + (d % 3), 2, 1, C.red); }
  } else if (b.type === 'mine') {
    for (let i = 0; i < 2; i++) {
      const k = (ms / 1500 + i / 2) % 1;
      ctx.globalAlpha = 0.5 * (1 - k);
      rect(ctx, x + 12 + Math.round(Math.sin(k * 6 + i) * 2), y - 2 - Math.round(k * 14), 6, 3, C.smoke);
      ctx.globalAlpha = 1;
    }
  } else if (b.type === 'airbase') {
    rect(ctx, x + 55, y, 1, 1, tick % 3 ? C.red : C.O);
    rect(ctx, x + 2 + (tick % 8) * 6, y + 22, 1, 1, C.yellow);
  } else if (b.type === 'barracks') {
    if (tick % 7 === 0) rect(ctx, x + 6 + (tick % 3) * 11, y + 12, 8, 1, C.white);
  } else if (b.type === 'hq') {
    if (tick % 3 === 0) rect(ctx, x + 49, y, 1, 1, C.O);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  const al = aliens(p.faction);
  if (p.kind === 'bullet') {
    if (al) {
      // A ray-gun zap (ack ack!)
      rect(ctx, x - dx * 3, y - dy * 3, 2, 1, C.ray); rect(ctx, x, y - 1, 1, 3, C.ray); rect(ctx, x + 1, y, 1, 1, C.white);
    } else {
      rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.fire);
      rect(ctx, x, y, 2, 1, C.yellow);
    }
  } else if (p.kind === 'bomb') {
    rect(ctx, x - 2, y - 2, 4, 5, C.O);
    if (al) { rect(ctx, x - 1, y - 1, 2, 3, C.egg); rect(ctx, x - 1, y - 1, 2, 1, C.acid); }
    else { rect(ctx, x - 1, y - 1, 2, 3, C.olive); rect(ctx, x - 1, y + 1, 2, 1, C.hazard); }
  } else if (p.kind === 'lob') {
    if (al) {
      // An egg, lobbed
      rect(ctx, x - 2, y - 3, 4, 5, C.O); rect(ctx, x - 1, y - 2, 2, 3, C.egg); rect(ctx, x - 1, y - 2, 1, 1, '#a89a76');
    } else {
      // A cargo crate, thrown by the loader
      const f = Math.floor(performance.now() / 120) % 2;
      rect(ctx, x - 2, y - 2, 5, 5, C.O); rect(ctx, x - 1, y - 1, 3, 3, '#9a6a3a'); rect(ctx, x - 1 + f * 2, y - 1, 1, 3, '#ba8a52');
    }
  } else if (al) {
    // A glob of acid
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.acidDark);
    rect(ctx, x - 1, y - 1, 3, 3, C.O); rect(ctx, x - 1, y - 1, 2, 2, C.acid);
  } else {
    rect(ctx, x - dx, y - dy, 1, 1, C.smoke);
    rect(ctx, x - 1, y - 1, 3, 3, C.O); rect(ctx, x - 1, y - 1, 2, 2, C.gunLight);
  }
}

// Marines are knocked flat with their helmet beside them. Martians leave a
// cracked dome; the rest of the horde leaves a puddle of fizzing acid.
function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(16, 6);
  if (!aliens(e.f)) {
    outlined(g, [[1, 2, 3, 3, e.type === 'engineer' ? C.pale : C.skin], [4, 2, 7, 3, e.type === 'engineer' ? C.white : C.oliveDark], [11, 3, 2, 2, C.fatigue], [13, 4, 2, 1, C.boot]],
      [[5, 3, 2, 1, t.main]]);
    if (e.type !== 'engineer') { g.fillStyle = C.O; g.fillRect(0, 0, 4, 2); g.fillStyle = C.olive; g.fillRect(0, 0, 3, 1); }
  } else if (e.type === 'soldier') {
    outlined(g, [[3, 2, 9, 3, C.dome], [5, 4, 6, 1, C.suit]], [[5, 3, 4, 1, C.brain], [7, 2, 1, 1, C.O], [8, 3, 1, 1, C.O], [5, 4, 6, 1, t.main]]);
  } else {
    outlined(g, [[1, 3, 14, 2, C.acidDark], [4, 2, 7, 1, C.acidDark]], [[2, 3, 3, 1, C.acid], [8, 3, 1, 1, C.acid], [5, 4, 6, 1, t.main]]);
  }
  return { c, ax: 8, ay: 5 };
}
const corpseKey = (e) => `ko-${e.type}-${sideOf(e.f)}`;

const MARINES = {
  soldier: 'Marine', heavy: 'Smartgunner', scout: 'Tracker', engineer: 'Synthetic', sniper: 'Marksman',
  jeep: 'Recon Buggy', tank: 'APC', artillery: 'Power Loader', helicopter: 'Gunship', bomber: 'Dropship',
  hq: 'Ops Centre', barracks: 'Cryo Bay', turret: 'Sentry Gun', wall: 'Blast Door', mine: 'Atmosphere Processor',
  workshop: 'Vehicle Bay', airbase: 'Landing Pad', sam: 'Missile Battery', bridge: 'Catwalk',
};

export default {
  id: 'alien',
  name: 'Alien Wars',
  sides: [
    {
      id: 'marines', name: 'The Colonial Marines', short: 'Marines',
      blurb: 'Pulse rifles, smartguns, remote sentry guns, a very calm synthetic and a power loader that throws crates. Ultimate badasses (allegedly).',
      names: MARINES,
      win: 'Nuke it from orbit? Nah, this was more fun.',
      lose: 'Game over, man! Game over!',
    },
    {
      id: 'aliens', name: 'The Aliens', short: 'Aliens',
      blurb: 'Xenos, facehuggers and a hive queen, plus big-brained Martians in flying saucers and a furry engineer from Melmac. Ack ack!',
      names: {
        soldier: 'Martian Trooper', heavy: 'Xeno Warrior', scout: 'Facehugger', engineer: 'Melmacian', sniper: 'Spitter',
        jeep: 'Hover Scooter', tank: 'Hive Queen', artillery: 'Egg Launcher', helicopter: 'Flying Saucer', bomber: 'Mothership',
        hq: 'The Hive', barracks: 'Egg Chamber', turret: 'Ray Gun Tower', wall: 'Resin Wall', mine: 'Cow Abductor',
        workshop: 'Brain Lab', airbase: 'Saucer Dock', sam: 'Acid Spore Launcher', bridge: 'Resin Bridge',
      },
      icons: { hq: '👽', barracks: '🥚', turret: '🔫', wall: '🕸️', mine: '🐄', workshop: '🧠', airbase: '🛸', bridge: '🌉', sam: '🦠' },
      preview: ['soldier', 'heavy', 'scout', 'tank'],
      win: 'Ack ack ack! (Translation: we won.)',
      lose: 'HA! I kill me. Back to Melmac.',
    },
  ],
  palette,
  teamBase: COAT,
  roofBase: [0.45, 0.47, 0.5],
  soldier: buildSoldier,
  vehicle: { jeep: buildJeep, tank: buildTank, artillery: buildArtillery },
  aircraft: { helicopter: buildHeli, bomber: buildBomber },
  missile: { body: '#e8e4dc', tip: '#d0322a', flame: '#f28a30' },
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
  explosion: { rim: '#c8402a', body: '#f2a040', core: '#fff0b0', smoke: '#6a6660', smoke2: '#8a867e' },
  corpse,
  corpseKey,
  debris: { '#7a4a24': '#6a7078', '#5c361a': '#3e4a28' },
  minimap: { sky: '#2a322c', ground: '#4a3e3a', platform: '#6a7078', bridge: '#9aa2aa', ramp: '#9aa2aa', surface: '#6e625a' },
  names: MARINES,
  spriteIcons: true,
  icons: { hq: '🏢', barracks: '🛌', turret: '🔫', wall: '🚪', mine: '🏭', workshop: '🔧', airbase: '🛬', bridge: '🌉', sam: '🚀' },
};
