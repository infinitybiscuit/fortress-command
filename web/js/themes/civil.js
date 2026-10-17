// Civil War: 1861–65, played for laughs. Pick the Union (blue coats, a
// balloon corps, an ironclad on wheels) or the Confederacy (grey coats,
// homespun everything, a submarine hanging off a balloon). Rolling farmland,
// split-rail fences, gunsmoke, and picnickers on the hill who came to watch.
// Same units and rules for both sides, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team, sideOf, missileRack } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#1a1614',                        // outline
  skin: '#f0c49a', skinDark: '#c8946a', hair: '#5a3a22', beard: '#7a5232',
  boot: '#241c16', gun: '#3a3432', gunLight: '#6a6460', steel: '#b0b4b8',
  yellow: '#f2d06a', yellowDark: '#b8962a', red: '#c8322a', redDark: '#7e1e18', white: '#f6f2e8',
  sky: ['#5a90cc', '#6a9cd4', '#7aa8da', '#8cb4e0', '#9ec0e6', '#b2ceea', '#c6dcee'],
  blue: '#2e4a8a', blueLight: '#4a6aaa', blueDark: '#1e3264', skyBlue: '#7a9ac8',
  grey: '#8a8a84', greyLight: '#aeaca4', greyDark: '#5e5e58', butternut: '#a8864e', butternutDark: '#7a5e32',
  green: '#3a6a3a', greenDark: '#284a28',
  brass: '#d4a440', brassLight: '#f0cc6a', bronze: '#a8743a',
  wood: '#7a5634', woodLight: '#a47a4c', woodDark: '#4e3420', canvas: '#ece4d0', canvasShade: '#c8bea4',
  brick: '#a24a36', brickDark: '#723224', brickLight: '#c06a50', stone: '#a8a49a', stoneLight: '#c8c4ba', stoneDark: '#787468',
  marble: '#f2eee4', marbleShade: '#d0cabc', iron: '#3e4246', ironLight: '#62686e',
  horse: '#7a4e2e', horseDark: '#5a361e', mule: '#8a8078',
  grass: '#5a9a3a', grassLight: '#7ab84e', grassDark: '#3e7a2a',
  dirt: '#7a5a3a', dirtMid: '#664a30', dirtDeep: '#523a24', pebble: '#9a7a5a', pebbleDark: '#3e2a1a',
  greenback: '#5a9a5a', greyback: '#b4b0a4', money: '#e8e4d0',
  fire: '#f28a30', glass: '#ffe08a', smoke: '#d8d4cc', smokeDark: '#aaa69e', shadow: 'rgba(0,0,0,0.3)',
};
const COAT = [0.3, 0.32, 0.36];

// Union or Confederacy kit for faction f.
const rebel = (f) => sideOf(f) === 'rebel';
function kit(f) {
  return rebel(f)
    ? { coat: C.grey, coatLight: C.greyLight, coatDark: C.greyDark, pants: C.butternut, pantsDark: C.butternutDark, hat: C.butternutDark }
    : { coat: C.blue, coatLight: C.blueLight, coatDark: C.blueDark, pants: C.skyBlue, pantsDark: C.blueLight, hat: C.blueDark };
}

// Headgear: the Union's kepi, the Rebels' floppy slouch hat.
function hat(parts, details, f, t) {
  const k = kit(f);
  if (rebel(f)) {
    parts.push([4, 2, 10, 1, k.hat], [6, 0, 6, 2, k.hat]);
    details.push([6, 1, 6, 1, t.main]);
  } else {
    parts.push([6, 0, 6, 3, k.hat], [11, 3, 3, 1, C.O]);
    details.push([6, 0, 6, 1, C.blueLight], [7, 2, 4, 1, t.main], [8, 1, 1, 1, C.brass]);
  }
}

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right; the cavalry is bigger.
function buildCavalry(f, frame) {
  const t = team(f);
  const k = kit(f);
  const [c, g] = canvas(26, 23);
  const legs = frame ? [[7, 16, 2, 6], [11, 16, 2, 5], [16, 16, 2, 6], [19, 16, 2, 5]] : [[6, 16, 2, 5], [10, 16, 2, 6], [17, 16, 2, 5], [20, 16, 2, 6]];
  const parts = [
    ...legs.map((l) => [...l, C.horseDark]),
    [5, 11, 17, 6, C.horse], [20, 7, 3, 6, C.horse], [21, 5, 5, 3, C.horse], [2, 11, 3, 6, C.horseDark],
    [10, 4, 5, 8, k.coat], [10, 0, 5, 4, C.skin], [16, 2, 1, 7, C.steel],
  ];
  const details = [
    [6, 15, 15, 1, C.horseDark], [8, 11, 6, 3, t.main], [8, 11, 6, 1, t.light], [24, 6, 1, 1, C.O], [21, 5, 1, 2, C.horseDark],
    [13, 1, 1, 1, C.O], [10, 9, 5, 1, C.boot], [12, 12, 2, 3, k.pants], [12, 15, 2, 1, C.boot], [14, 5, 2, 1, k.coatLight],
  ];
  if (rebel(f)) {
    // A cavalier's plumed hat
    parts.push([8, 1, 9, 1, k.hat], [10, 0, 5, 2, k.hat]);
    details.push([9, 0, 2, 1, C.O], [7, 0, 2, 1, C.O]);
  } else {
    parts.push([10, 0, 5, 2, k.hat], [14, 2, 2, 1, C.O]);
    details.push([10, 1, 5, 1, t.main]);
  }
  outlined(g, parts, details);
  return { c, ax: 13, ay: 22 };
}

function buildSoldier(type, f, frame) {
  if (type === 'scout') return buildCavalry(f, frame);
  const t = team(f);
  const k = kit(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'heavy') {
    // Zouave: a fez, short jacket, baggy trousers (striped for the Tigers),
    // white gaiters and a moustache you could hang laundry on
    const pants = rebel(f) ? C.white : C.red;
    parts = [
      [4, 11, 4, 3, pants], [9, 11, 4, 3, pants], ...boots.map((b) => [...b, C.white]),
      [5, 7, 7, 4, k.coatDark], [6, 3, 6, 5, C.skin], [6, 1, 5, 3, rebel(f) ? k.hat : C.red],
      [9, 9, 10, 1, C.wood], [13, 8, 6, 1, C.gun],
    ];
    details = [
      [10, 1, 1, 3, t.main], [11, 3, 1, 1, t.main], [10, 5, 1, 1, C.O], [7, 6, 5, 1, C.beard], [6, 7, 1, 1, C.beard], [12, 7, 1, 1, C.beard],
      [5, 8, 7, 1, C.brass], [5, 10, 7, 1, t.main], [19, 7, 1, 2, C.steel],
      ...(rebel(f) ? [[4, 12, 9, 1, C.blueLight], [4, 11, 1, 3, C.blueLight], [8, 11, 1, 3, C.blueLight], [11, 11, 1, 3, C.blueLight]] : []),
    ];
  } else if (type === 'engineer') {
    // Pioneer / sapper: shovel on the shoulder, sleeves rolled up
    parts = [
      ...legs.map((l) => [...l, k.pants]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, k.coat], [6, 3, 6, 5, C.skin], [10, 2, 1, 9, C.woodLight], [9, 0, 3, 3, C.steel],
    ];
    details = [[10, 5, 1, 1, C.O], [7, 7, 4, 1, C.beard], [5, 9, 2, 2, C.skin], [5, 10, 7, 1, t.main], [9, 0, 3, 1, C.white]];
    hat(parts, details, f, t);
  } else if (type === 'sniper') {
    // Sharpshooter in Berdan green, or a Whitworth marksman with his long scope
    const coat = rebel(f) ? k.coat : C.green;
    parts = [
      ...legs.map((l) => [...l, rebel(f) ? k.pants : C.greenDark]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, coat], [6, 3, 6, 5, C.skin], [9, 9, 10, 1, C.wood], [11, 7, rebel(f) ? 8 : 4, 1, C.gun],
    ];
    details = [[10, 5, 1, 1, C.O], [7, 6, 5, 2, C.beard], [5, 10, 7, 1, t.main], [18, 9, 1, 1, C.O]];
    hat(parts, details, f, t);
  } else {
    // Infantry: Bluecoat or Greyback, musket and bayonet, magnificent whiskers
    parts = [
      ...legs.map((l) => [...l, k.pants]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, k.coat], [6, 3, 6, 5, C.skin], [9, 9, 9, 1, C.wood], [17, 7, 1, 2, C.steel],
    ];
    details = [
      [10, 5, 1, 1, C.O], [6, 4, 1, 4, C.beard], [7, 7, 4, 1, C.beard], [5, 9, 7, 1, t.main], [8, 8, 1, 1, C.brass], [8, 10, 1, 1, C.brass],
      [14, 9, 2, 1, C.gun],
    ];
    hat(parts, details, f, t);
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── Vehicles ───────────────────────────────────────────────────────────────
function cartWheel(g, x, y, r, frame) {
  disc(g, x, y, r + 1, C.O);
  disc(g, x, y, r, C.woodDark);
  disc(g, x, y, Math.max(1, r - 1), C.wood);
  g.fillStyle = C.woodDark;
  if (frame) { g.fillRect(x - r + 1, y, r * 2 - 1, 1); g.fillRect(x, y - r + 1, 1, r * 2 - 1); }
  else for (let i = -r + 1; i < r; i++) { g.fillRect(x + i, y + i, 1, 1); g.fillRect(x + i, y - i, 1, 1); }
  g.fillStyle = C.O; g.fillRect(x, y, 1, 1);
}

function beast(g, x, y, frame, mule) {
  // A horse (or a long-eared mule) facing right, its front at x + 13
  const col = mule ? C.mule : C.horse;
  const dark = mule ? '#5e5650' : C.horseDark;
  const legs = frame ? [[x + 1, y + 6, 1, 5], [x + 4, y + 6, 1, 4], [x + 9, y + 6, 1, 5], [x + 11, y + 6, 1, 4]]
    : [[x, y + 6, 1, 4], [x + 3, y + 6, 1, 5], [x + 8, y + 6, 1, 4], [x + 12, y + 6, 1, 5]];
  outlined(g, [
    ...legs.map((l) => [...l, dark]),
    [x, y + 1, 12, 5, col], [x + 10, y - 3, 3, 5, col], [x + 11, y - 4, 4, 3, col], [x - 2, y + 1, 2, 4, dark],
    ...(mule ? [[x + 11, y - 7, 1, 3, col], [x + 13, y - 7, 1, 3, col]] : []),
  ], [[x + 13, y - 3, 1, 1, C.O], [x + 1, y + 5, 10, 1, dark]]);
}

// Union: a Gatling gun on a horse-drawn cart. Rebels: a mountain howitzer on a mule cart.
function buildWagon(f, frame) {
  const t = team(f);
  const k = kit(f);
  const [c, g] = canvas(34, 19);
  beast(g, 18, 7, frame, rebel(f));
  if (rebel(f)) {
    outlined(g, [[1, 9, 15, 3, C.wood], [3, 5, 9, 3, C.bronze], [11, 6, 3, 1, C.bronze], [2, 3, 4, 6, k.coat], [2, 0, 4, 3, C.skin], [16, 10, 3, 1, C.woodDark]], [
      [3, 5, 9, 1, C.brassLight], [1, 11, 15, 1, t.main], [2, 0, 4, 1, k.hat], [1, 1, 6, 1, k.hat], [5, 1, 1, 1, C.O],
    ]);
  } else {
    outlined(g, [[1, 9, 15, 3, C.wood], [4, 4, 9, 4, C.brass], [12, 5, 3, 2, C.gun], [6, 8, 2, 2, C.woodDark], [16, 10, 3, 1, C.woodDark]], [
      [4, 4, 9, 1, C.brassLight], [4, 6, 9, 1, C.gun], [13, 5, 1, 1, C.O], [13, 6, 1, 1, C.O], [1, 11, 15, 1, t.main], [2, 6, 2, 2, C.woodDark],
    ]);
  }
  cartWheel(g, 8, 14, 4, frame);
  return { c, ax: 16, ay: 18 };
}

// Union: the Land Monitor, a cheesebox turret on a raft on wheels.
// Rebels: the Land Merrimack, a sloping iron shed with a smokestack.
function buildIronclad(f, frame) {
  const t = team(f);
  const [c, g] = canvas(38, 22);
  if (rebel(f)) {
    outlined(g, [[2, 12, 34, 4, C.iron], [6, 6, 26, 6, C.iron], [10, 3, 18, 3, C.iron], [18, 0, 3, 4, C.gun], [30, 8, 6, 2, C.gun]], [
      [6, 6, 26, 1, C.ironLight], [10, 3, 18, 1, C.ironLight], [9, 8, 2, 2, C.O], [15, 8, 2, 2, C.O], [22, 8, 2, 2, C.O],
      [2, 13, 34, 1, t.main], [18, 0, 3, 1, C.O],
    ]);
  } else {
    outlined(g, [[2, 11, 34, 5, C.iron], [12, 4, 13, 7, C.ironLight], [24, 6, 3, 2, C.gun], [10, 6, 3, 2, C.gun], [30, 8, 2, 3, C.gun]], [
      [2, 11, 34, 1, C.ironLight], [12, 4, 13, 1, C.steel], [12, 7, 13, 1, C.iron], [2, 13, 34, 1, t.main], [30, 8, 2, 1, C.white],
      [15, 5, 1, 1, C.iron], [19, 5, 1, 1, C.iron], [23, 5, 1, 1, C.iron],
    ]);
  }
  for (const x of [7, 18, 29]) cartWheel(g, x, 17, 4, frame);
  return { c, ax: 18, ay: 21 };
}

// Union: "The Dictator", a huge squat mortar on a railway flatcar.
// Rebels: a bronze Napoleon field gun.
function buildCannon(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 19);
  if (rebel(f)) {
    outlined(g, [[3, 11, 18, 3, C.wood], [14, 5, 4, 4, C.bronze], [17, 3, 4, 4, C.bronze], [20, 2, 6, 3, C.bronze], [0, 12, 4, 2, C.woodDark]], [
      [14, 5, 4, 1, C.brassLight], [17, 3, 4, 1, C.brassLight], [20, 2, 6, 1, C.brassLight], [25, 2, 1, 3, C.O], [3, 12, 18, 1, t.main],
    ]);
    cartWheel(g, 14, 14, 4, frame);
  } else {
    outlined(g, [[1, 11, 28, 3, C.woodDark], [9, 4, 12, 7, C.iron], [11, 2, 8, 3, C.iron], [0, 12, 2, 1, C.gun], [29, 12, 2, 1, C.gun]], [
      [9, 4, 12, 1, C.ironLight], [11, 2, 8, 1, C.O], [12, 3, 6, 1, C.gun], [9, 7, 12, 1, C.ironLight], [1, 12, 28, 1, t.main],
    ]);
    for (const x of [5, 25]) { disc(g, x, 15, 2, C.O); disc(g, x, 15, 1, C.ironLight); }
    g.fillStyle = C.O; g.fillRect(0, 18, 32, 1);
  }
  return { c, ax: 15, ay: 18 };
}

// Union: an observation balloon in stripes, with an officer and his telescope.
// Rebels: a balloon sewn together from donated silk dresses.
function buildBalloon(f) {
  const t = team(f);
  const k = kit(f);
  const [c, g] = canvas(24, 30);
  disc(g, 12, 9, 10, C.O);
  disc(g, 12, 9, 9, rebel(f) ? '#c86a8a' : C.white);
  if (rebel(f)) {
    const patches = ['#e8b84a', '#6a9ac8', '#9a6ac8', '#5aa06a', '#e87a5a', '#f0e0c0'];
    for (let i = 0; i < 9; i++) { g.fillStyle = patches[i % patches.length]; g.fillRect(5 + (i % 3) * 5, 2 + Math.floor(i / 3) * 5, 4, 4); }
  } else {
    g.fillStyle = C.red; for (let x = 5; x < 20; x += 4) g.fillRect(x, 1, 2, 17);
  }
  g.fillStyle = t.main; g.fillRect(4, 13, 16, 2);
  g.fillStyle = C.O; g.fillRect(6, 18, 1, 5); g.fillRect(17, 18, 1, 5); g.fillRect(9, 18, 1, 5); g.fillRect(14, 18, 1, 5);
  outlined(g, [[7, 23, 10, 5, C.woodLight], [10, 19, 4, 4, k.coat], [10, 16, 4, 3, C.skin], [14, 18, 4, 1, C.brass]], [
    [7, 25, 10, 1, C.wood], [10, 16, 4, 1, k.hat], [13, 17, 1, 1, C.O],
  ]);
  return { c, ax: 12, ay: 27 };
}

// Union: the Aereon, a triple-cigar airship. Rebels: the Flying Hunley, a
// hand-cranked submarine dangling under a balloon (it is not a good idea).
function buildAirship(f) {
  const t = team(f);
  const k = kit(f);
  const [c, g] = canvas(46, 24);
  if (rebel(f)) {
    outlined(g, [[10, 0, 26, 8, C.canvasShade]], [[10, 0, 26, 1, C.canvas], [10, 5, 26, 1, t.main]]);
    g.fillStyle = C.O; for (const x of [13, 22, 32]) g.fillRect(x, 8, 1, 6);
    outlined(g, [[6, 14, 32, 6, C.iron], [38, 15, 3, 4, C.iron], [14, 11, 3, 3, C.iron], [26, 11, 3, 3, C.iron], [3, 15, 3, 4, C.gun]], [
      [6, 14, 32, 1, C.ironLight], [15, 12, 1, 1, C.glass], [27, 12, 1, 1, C.glass], [6, 17, 32, 1, t.main], [10, 16, 1, 1, C.ironLight], [34, 16, 1, 1, C.ironLight],
    ]);
  } else {
    outlined(g, [[4, 2, 38, 4, C.canvas], [2, 6, 42, 4, C.canvas], [4, 10, 38, 4, C.canvas], [16, 16, 14, 5, C.wood], [18, 14, 2, 2, k.coat]], [
      [4, 2, 38, 1, C.white], [2, 6, 42, 1, C.canvasShade], [4, 10, 38, 1, C.canvasShade], [6, 8, 34, 1, t.main], [16, 16, 14, 1, C.woodLight],
      [18, 13, 2, 1, C.skin],
    ]);
    g.fillStyle = C.O; for (const x of [17, 28]) g.fillRect(x, 14, 1, 2);
  }
  return { c, ax: 23, ay: 18 };
}

function rotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 90);
  const s = u.facing;
  if (u.type === 'helicopter') {
    // The observer's pennant flutters on its rope
    rect(ctx, x + (s > 0 ? 7 : -9), y - 7 + (tick % 2), 2, 1, team(u.faction).main);
  } else {
    // Rear propeller (hand-cranked, for the submarine)
    const px = s > 0 ? x - 22 : x + 21;
    if (tick % 2) rect(ctx, px, y - 6, 1, 6, C.smoke); else rect(ctx, px, y - 4, 1, 2, C.gunLight);
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
function flag(g, x, y, h, t) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 3, h + 1);
  g.fillStyle = C.woodLight; g.fillRect(x, y, 1, h);
  g.fillStyle = C.O; g.fillRect(x + 1, y - 1, 10, 7);
  g.fillStyle = t.main; g.fillRect(x + 1, y, 9, 5);
  g.fillStyle = t.light; g.fillRect(x + 1, y, 9, 1);
  g.fillStyle = C.white; g.fillRect(x + 2, y + 1, 2, 2);
}

function columns(g, x, y, w, h, n, col, shade) {
  const step = w / n;
  for (let i = 0; i < n; i++) {
    const cx = Math.round(x + step * i + step / 2);
    g.fillStyle = C.O; g.fillRect(cx - 2, y, 4, h);
    g.fillStyle = col; g.fillRect(cx - 1, y, 2, h);
    g.fillStyle = shade; g.fillRect(cx, y, 1, h);
  }
}

function pediment(g, cx, y, w, h, col) {
  for (let i = 0; i < h; i++) {
    const half = Math.round(((i + 1) / h) * (w / 2));
    g.fillStyle = C.O; g.fillRect(cx - half - 1, y + i - 1, half * 2 + 2, 2);
  }
  for (let i = 0; i < h; i++) {
    const half = Math.round(((i + 1) / h) * (w / 2));
    g.fillStyle = col; g.fillRect(cx - half, y + i, half * 2, 1);
  }
}

function sibley(g, cx, base, h, w, t, patched) {
  // A bell-shaped Sibley tent
  for (let i = 0; i < h; i++) {
    const half = Math.round(1 + (i / h) * (w / 2));
    g.fillStyle = C.O; g.fillRect(cx - half - 1, base - h + i, half * 2 + 2, 1);
  }
  for (let i = 0; i < h; i++) {
    const half = Math.round(1 + (i / h) * (w / 2));
    g.fillStyle = i % 5 === 4 ? C.canvasShade : C.canvas; g.fillRect(cx - half, base - h + i, half * 2, 1);
  }
  g.fillStyle = C.O; g.fillRect(cx - 2, base - 7, 4, 7); g.fillStyle = '#3a2a20'; g.fillRect(cx - 1, base - 6, 2, 6);
  g.fillStyle = C.woodDark; g.fillRect(cx, base - h - 3, 1, 3);
  g.fillStyle = t.main; g.fillRect(cx + 1, base - h - 3, 3, 2);
  if (patched) { g.fillStyle = C.butternut; g.fillRect(cx - 4, base - h + 9, 3, 3); g.fillStyle = C.greyLight; g.fillRect(cx + 2, base - h + 13, 3, 2); }
}

const BUILD = {
  hq(g, t, f) {
    if (rebel(f)) {
      // Statehouse: a grey stone temple-front on a hill of steps
      outlined(g, [[4, 22, 56, 22, C.stone], [0, 44, 64, 4, C.stoneDark]], [[4, 22, 56, 1, C.stoneLight], [0, 44, 64, 1, C.stone]]);
      columns(g, 10, 22, 44, 22, 6, C.stoneLight, C.stone);
      pediment(g, 32, 10, 60, 10, C.stone);
      outlined(g, [[2, 19, 60, 3, C.stoneLight]], [[2, 21, 60, 1, C.stoneDark]]);
      disc(g, 32, 15, 2, C.O); disc(g, 32, 15, 1, t.main);
      outlined(g, [[28, 34, 8, 10, C.woodDark]], [[31, 34, 1, 10, C.O]]);
      flag(g, 31, 0, 10, t);
    } else {
      // The Capitol, dome still under construction (as it really was), crane and all
      outlined(g, [[0, 26, 64, 18, C.marble], [0, 44, 64, 4, C.marbleShade]], [[0, 26, 64, 1, C.white], [0, 41, 64, 3, C.marbleShade]]);
      columns(g, 16, 26, 32, 15, 5, C.white, C.marbleShade);
      for (const x of [3, 9, 52, 58]) { g.fillStyle = C.O; g.fillRect(x - 1, 29, 5, 7); g.fillStyle = '#4a5a7a'; g.fillRect(x, 30, 3, 5); }
      pediment(g, 32, 18, 30, 8, C.marble);
      outlined(g, [[20, 13, 24, 5, C.marble]], [[20, 13, 24, 1, C.white]]);
      // Half a dome: iron ribs with nothing between them yet
      g.fillStyle = C.O;
      for (let i = 0; i < 9; i++) { const half = Math.round(Math.sqrt(1 - ((8 - i) / 9) ** 2) * 10); g.fillRect(32 - half, 4 + i, 1, 1); g.fillRect(32 + half, 4 + i, 1, 1); }
      for (const x of [26, 29, 32, 35, 38]) g.fillRect(x, 6 + Math.abs(32 - x) / 3, 1, 7 - Math.abs(32 - x) / 3);
      g.fillRect(22, 12, 21, 1);
      // Construction crane leaning over it
      g.fillStyle = C.woodDark; g.fillRect(40, 0, 2, 13); for (let i = 0; i < 16; i++) g.fillRect(25 + i, 1 + Math.floor(i / 8), 1, 1);
      g.fillStyle = C.O; g.fillRect(26, 2, 1, 6); g.fillStyle = C.stone; g.fillRect(25, 8, 3, 2);
      outlined(g, [[28, 34, 8, 10, C.woodDark]], [[31, 34, 1, 10, C.O]]);
      flag(g, 4, 10, 16, t);
    }
  },
  barracks(g, t, f) {
    // Muster ground: a pair of Sibley tents, a stack of muskets, a drum
    sibley(g, 12, 32, 22, 20, t, rebel(f));
    sibley(g, 34, 32, 26, 24, t, rebel(f));
    g.fillStyle = C.O; g.fillRect(22, 22, 1, 10); g.fillRect(24, 22, 1, 10); g.fillRect(23, 21, 1, 11);
    disc(g, 45, 29, 3, C.O); disc(g, 45, 29, 2, rebel(f) ? C.butternut : C.blue); g.fillStyle = C.white; g.fillRect(43, 28, 5, 1);
  },
  turret(g, t, f) {
    // Earthwork battery: wicker gabions packed with earth and a cannon peeking out
    outlined(g, [[0, 20, 32, 12, C.dirtMid]], [[0, 20, 32, 1, C.grass], [0, 21, 32, 1, C.grassDark]]);
    for (const x of [2, 10, 22]) outlined(g, [[x, 13, 7, 8, C.woodLight]], [[x, 15, 7, 1, C.wood], [x, 18, 7, 1, C.wood], [x, 13, 7, 1, C.dirt]]);
    outlined(g, [[15, 14, 12, 3, rebel(f) ? C.bronze : C.iron]], [[15, 14, 12, 1, rebel(f) ? C.brassLight : C.ironLight], [26, 14, 1, 3, C.O]]);
    disc(g, 17, 18, 3, C.O); disc(g, 17, 18, 2, C.wood);
    flag(g, 4, 2, 11, t);
  },
  wall(g, t, f) {
    if (rebel(f)) {
      // Stone wall (sorry, Jackson)
      for (let r = 0; r < 7; r++) for (let i = 0; i < 3; i++) {
        const w = 5 + ((r + i) % 2);
        const x = (r % 2 ? -2 : 0) + i * 6;
        const y = 4 + r * 4;
        g.fillStyle = C.O; g.fillRect(Math.max(0, x), y, Math.min(16, x + w) - Math.max(0, x), 4);
        g.fillStyle = (r + i) % 3 ? C.stone : C.stoneLight; g.fillRect(Math.max(0, x) + 1, y + 1, Math.max(1, Math.min(16, x + w) - Math.max(0, x) - 2), 2);
      }
    } else {
      // Log breastworks banked with earth
      g.fillStyle = C.O; g.fillRect(0, 4, 16, 28);
      for (let y = 5; y < 22; y += 4) { g.fillStyle = C.wood; g.fillRect(1, y, 14, 3); g.fillStyle = C.woodLight; g.fillRect(1, y, 14, 1); disc(g, 2, y + 1, 1, C.woodLight); }
      g.fillStyle = C.dirtMid; g.fillRect(1, 22, 14, 10); g.fillStyle = C.grass; g.fillRect(1, 22, 14, 1);
    }
    g.fillStyle = t.main; g.fillRect(5, 26, 6, 2);
  },
  mine(g, t, f) {
    // The money press: greenbacks for the Union, ever more greybacks for the Rebels
    const note = rebel(f) ? C.greyback : C.greenback;
    outlined(g, [[3, 10, 26, 22, C.brick], [1, 7, 30, 3, C.woodDark]], [[3, 10, 26, 1, C.brickLight], [1, 7, 30, 1, C.wood]]);
    g.fillStyle = C.brickDark; for (let y = 13; y < 32; y += 3) g.fillRect(3, y, 26, 1);
    g.fillStyle = C.O; g.fillRect(6, 14, 11, 8); g.fillStyle = C.glass; g.fillRect(7, 15, 9, 6);
    g.fillStyle = C.gun; g.fillRect(9, 16, 5, 4); g.fillStyle = C.gunLight; g.fillRect(9, 16, 5, 1);
    outlined(g, [[20, 22, 7, 10, C.woodDark]], [[25, 27, 1, 1, C.brass]]);
    for (let i = 0; i < 4; i++) { g.fillStyle = C.O; g.fillRect(5 + i * 3, 27 - i, 6, 4); g.fillStyle = note; g.fillRect(6 + i * 3, 28 - i, 4, 2); }
    g.fillStyle = t.main; g.fillRect(10, 3, 12, 4); g.fillStyle = C.O; g.fillRect(9, 2, 1, 6); g.fillRect(22, 2, 1, 6);
    g.fillStyle = note; g.fillRect(14, 4, 4, 2);
  },
  workshop(g, t) {
    // Foundry: brick sheds, a tall chimney, and the glow of the furnace
    outlined(g, [[2, 12, 44, 20, C.brick], [36, 0, 6, 12, C.brickDark]], [[2, 12, 44, 1, C.brickLight], [36, 0, 6, 1, C.O]]);
    g.fillStyle = C.brickDark; for (let y = 15; y < 32; y += 3) g.fillRect(2, y, 44, 1);
    g.fillStyle = C.O; g.fillRect(8, 18, 16, 14); g.fillStyle = '#2a1a14'; g.fillRect(9, 19, 14, 13);
    g.fillStyle = C.fire; g.fillRect(11, 26, 10, 6); g.fillStyle = C.yellow; g.fillRect(13, 28, 6, 4);
    outlined(g, [[28, 22, 12, 4, C.iron], [30, 26, 2, 6, C.iron], [36, 26, 2, 6, C.iron]], [[28, 22, 12, 1, C.ironLight]]);
    g.fillStyle = t.main; g.fillRect(4, 14, 40, 2);
  },
  sam(g, t, f) {
    // Hale rocket battery: rockets in an iron trough on a trestle, behind earthworks
    outlined(g, [[8, 19, 3, 9, C.wood], [20, 19, 3, 9, C.wood]], [[8, 19, 1, 9, C.woodLight], [20, 19, 1, 9, C.woodLight]]);
    missileRack(g, { x: 9, y: 20, len: 14, rail: C.iron, body: C.ironLight, tip: rebel(f) ? C.butternut : C.blue, fin: C.brass });
    outlined(g, [[0, 26, 32, 6, C.dirt]], [[0, 26, 32, 1, C.grass], [4, 28, 24, 2, t.main]]);
  },
  airbase(g, t, f) {
    // Balloon yard: a gas-generator wagon, barrels, and a balloon tethered overhead
    disc(g, 40, 9, 9, C.O); disc(g, 40, 9, 8, rebel(f) ? '#c86a8a' : C.white);
    if (!rebel(f)) { g.fillStyle = C.red; for (let x = 34; x < 48; x += 4) g.fillRect(x, 2, 2, 15); }
    else { g.fillStyle = '#e8b84a'; g.fillRect(35, 4, 4, 4); g.fillStyle = '#6a9ac8'; g.fillRect(41, 8, 4, 4); g.fillStyle = '#5aa06a'; g.fillRect(36, 11, 4, 3); }
    g.fillStyle = t.main; g.fillRect(33, 12, 15, 2);
    g.fillStyle = C.O; g.fillRect(40, 18, 1, 14);
    outlined(g, [[4, 20, 22, 8, C.wood], [8, 14, 12, 6, C.iron]], [[4, 20, 22, 1, C.woodLight], [8, 14, 12, 1, C.ironLight], [12, 12, 2, 2, C.gun]]);
    for (const x of [8, 22]) { disc(g, x, 29, 3, C.O); disc(g, x, 29, 2, C.wood); }
    for (const x of [50, 55]) outlined(g, [[x, 25, 4, 7, C.woodLight]], [[x, 27, 4, 1, C.wood], [x, 30, 4, 1, C.wood]]);
    g.fillStyle = C.smoke; g.fillRect(13, 10, 3, 2);
  },
  bridge(g, t) {
    // Pontoon bridge: planks laid over little boats
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 7);
    g.fillStyle = C.woodLight; g.fillRect(0, 1, 16, 2);
    g.fillStyle = C.wood; for (let x = 2; x < 16; x += 3) g.fillRect(x, 1, 1, 2);
    g.fillStyle = C.woodDark; g.fillRect(2, 3, 12, 3);
    g.fillStyle = C.wood; g.fillRect(3, 4, 10, 1);
    g.fillStyle = t.main; g.fillRect(7, 1, 2, 1);
  },
  ramp(g, t) {
    // Plank ramp
    g.fillStyle = C.wood; g.fillRect(0, 0, 16, 16);
    g.fillStyle = C.woodLight; for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = C.woodDark; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
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
    g.fillStyle = kind === 'dirtDeep' ? C.dirtDeep : kind === 'dirtMid' ? C.dirtMid : C.dirt;
    g.fillRect(0, 0, T, T);
    speckle(6, C.pebble, C.pebbleDark, kind === 'dirtTop' ? 5 : 0);
    if (kind === 'dirtTop') {
      g.fillStyle = C.grass; g.fillRect(0, 0, T, 4);
      g.fillStyle = C.grassLight; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.grassDark; g.fillRect(0, 4, T, 1);
      for (let x = 0; x < T; x += 3) if (hash(seed + x) < 0.6) g.fillRect(x, 5, 1, 1);
    }
  } else {
    // A rocky ridge with a grassy top
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.stoneDark; g.fillRect(0, 0, T, T);
    g.fillStyle = C.stone;
    for (let i = 0; i < 5; i++) g.fillRect(Math.floor(hash(seed + i) * 12), 5 + Math.floor(hash(seed + i + 9) * 8), 4, 2);
    g.fillStyle = C.grass; g.fillRect(0, 0, T, 3);
    g.fillStyle = C.grassLight; g.fillRect(0, 0, T, 1);
    g.fillStyle = C.grassDark; g.fillRect(0, 3, T, 1);
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Wildflowers, tufts and the odd stray kepi.
function surface(ctx, x, y, ground, h) {
  ctx.fillStyle = C.grassDark;
  ctx.fillRect(x + Math.floor(h * 12), y - 2, 1, 2);
  if (!ground) return;
  if (h > 0.9) {
    ctx.fillStyle = C.blueDark; ctx.fillRect(x + 6, y - 2, 4, 2); ctx.fillStyle = C.O; ctx.fillRect(x + 9, y - 1, 2, 1);
  } else if (h > 0.6) {
    ctx.fillStyle = C.yellow; ctx.fillRect(x + 3, y - 2, 1, 1); ctx.fillStyle = C.white; ctx.fillRect(x + 9, y - 2, 1, 1);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};

// Farms on the far hills: a red barn, a white church, a farmhouse.
function farmPiece(k) {
  const key = `farm${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(40, 30);
  const kind = Math.floor(hash(k + 1) * 4);
  if (kind === 0) {
    g.fillStyle = '#a84a3a'; g.fillRect(8, 16, 22, 14); for (let i = 0; i < 8; i++) g.fillRect(19 - i * 1.4, 8 + i, i * 2.8 + 1, 1);
    g.fillStyle = '#f0e8d8'; g.fillRect(16, 22, 6, 8);
  } else if (kind === 1) {
    g.fillStyle = '#ece6d8'; g.fillRect(12, 16, 16, 14); g.fillRect(18, 4, 4, 12); for (let i = 0; i < 4; i++) g.fillRect(20 - i / 2, i, i + 1, 1);
  } else if (kind === 2) {
    g.fillStyle = '#d8ccb4'; g.fillRect(6, 18, 18, 12); g.fillStyle = '#6a5a4a'; g.fillRect(4, 14, 22, 4); g.fillStyle = '#7a5a4a'; g.fillRect(20, 10, 2, 4);
  }
  scenery[key] = c;
  return c;
}

// The picnickers who rode out to watch the battle: a blanket, a parasol, a hamper.
function picnic(ctx, x, base) {
  rect(ctx, x, base - 1, 14, 1, '#c8322a'); rect(ctx, x + 2, base - 1, 2, 1, '#f6f2e8'); rect(ctx, x + 8, base - 1, 2, 1, '#f6f2e8');
  rect(ctx, x + 2, base - 5, 2, 4, '#5a3a6a'); rect(ctx, x + 2, base - 7, 2, 2, '#f0c49a');
  rect(ctx, x, base - 10, 7, 1, '#f0a0b0'); rect(ctx, x + 1, base - 11, 5, 1, '#f0a0b0'); rect(ctx, x + 3, base - 9, 1, 3, '#3a2a20');
  rect(ctx, x + 8, base - 5, 2, 4, '#2a2a3a'); rect(ctx, x + 8, base - 7, 2, 2, '#f0c49a'); rect(ctx, x + 7, base - 9, 4, 2, '#1a1614');
  rect(ctx, x + 11, base - 3, 3, 2, '#a47a4c');
}

function tree(k) {
  const key = `tree${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(30, 40);
  g.fillStyle = '#4e3420'; g.fillRect(14, 22, 3, 18);
  disc(g, 15, 14, 10, '#3e6a2a'); disc(g, 11, 12, 6, '#4e7a34'); disc(g, 19, 17, 5, '#365e24');
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

  // Fluffy clouds
  for (let i = 0; i < 6; i++) {
    const cx = Math.round((((hash(i + 3) * 700 + t * (1.5 + i * 0.5) - camAX * 0.04) % (bw + 90)) + bw + 90) % (bw + 90)) - 45;
    const cy = Math.round(groundY - 160 + hash(i + 9) * 70 - camAY * 0.03);
    rect(ctx, cx, cy, 26, 5, '#f4f8fc'); rect(ctx, cx + 5, cy - 4, 14, 4, '#f4f8fc'); rect(ctx, cx + 3, cy + 5, 20, 1, '#dce6f0');
  }

  // Far blue ridge, then rolling green hills with farms
  for (let x = 0; x < bw; x++) {
    const wx = x + camAX * 0.08;
    const h = 46 + Math.round(Math.sin(wx * 0.009) * 10 + Math.sin(wx * 0.023) * 5);
    rect(ctx, x, groundY - h, 1, h, '#8aa4c2');
  }
  const hOff = camAX * 0.2;
  for (let x = 0; x < bw; x++) {
    const wx = x + hOff;
    const h = 24 + Math.round(Math.sin(wx * 0.013) * 7 + Math.sin(wx * 0.031) * 4);
    rect(ctx, x, groundY - h, 1, h, '#7aa45a');
    rect(ctx, x, groundY - h, 1, 1, '#8ab86a');
  }
  const fCount = 12;
  const fSpacing = ((WORLD_W / G) * 0.25) / fCount;
  const fOff = Math.round(camAX * 0.25);
  for (let i = Math.floor((fOff - 50) / fSpacing); i * fSpacing - fOff < bw + 50; i++) {
    const k = ((i % fCount) + fCount) % fCount;
    const x = Math.round(i * fSpacing - fOff + hash(k + 3) * fSpacing * 0.4);
    const img = farmPiece(k);
    ctx.drawImage(img, x, groundY - img.height - 12);
    if (k % 4 === 1) picnic(ctx, x + 30, groundY - 14);
    // Distant cannon smoke, puffing up now and then
    if (k % 3 === 2) {
      const kk = (t / 4 + k * 0.17) % 1;
      ctx.globalAlpha = 0.6 * (1 - kk);
      disc(ctx, x + 10 + Math.round(kk * 6), groundY - 18 - Math.round(kk * 18), 2 + Math.round(kk * 5), C.smoke);
      ctx.globalAlpha = 1;
    }
  }

  // Split-rail fences and trees in front
  const count = 40;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    const x = Math.round(i * spacing - jOff + hash(k) * spacing * 0.5);
    if (hash(k + 70) < 0.45) {
      // Zig-zag "worm" fence
      for (let j = 0; j < 4; j++) { rect(ctx, x + j * 6, groundY - 6 + (j % 2) * 2, 7, 1, '#8a6a4a'); rect(ctx, x + j * 6, groundY - 3 + (j % 2), 7, 1, '#8a6a4a'); rect(ctx, x + j * 6, groundY - 7, 1, 7, '#6a4e34'); }
    } else if (hash(k + 70) < 0.8) {
      const img = tree(k);
      ctx.drawImage(img, x - 15, groundY - img.height + 3);
    }
  }
}

// Wisps of gunsmoke drifting over the field.
function weather(ctx, bw, bh, camAX, camAY) {
  const t = performance.now() / 1000;
  const n = Math.min(10, Math.floor((bw * bh) / 20000));
  for (let i = 0; i < n; i++) {
    const x = Math.round((((hash(i * 5 + 3) * (bw + 80) + t * (4 + hash(i) * 4) - camAX * 0.5) % (bw + 80)) + bw + 80) % (bw + 80)) - 40;
    const y = Math.round(hash(i * 5 + 2) * bh * 0.8 + Math.sin(t * 0.4 + i) * 4);
    ctx.globalAlpha = 0.16;
    rect(ctx, x, y, 22, 3, C.smoke); rect(ctx, x + 4, y - 2, 12, 2, C.smoke);
  }
  ctx.globalAlpha = 1;
}

// Timber scaffolding.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = C.woodLight;
  for (let sx = x + 1; sx < x + w; sx += 7) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(x, sy, w, 1);
}

function puff(ctx, x, y, ms, i) {
  const k = (ms / 1700 + i / 2) % 1;
  ctx.globalAlpha = 0.55 * (1 - k);
  rect(ctx, x + Math.round(Math.sin(k * 6 + i) * 2), y - Math.round(k * 12), 3 + Math.round(k * 3), 3 + Math.round(k * 2), C.smokeDark);
  ctx.globalAlpha = 1;
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  if (b.type === 'workshop') {
    for (let i = 0; i < 2; i++) puff(ctx, x + 38, y, ms, i);
    if (tick % 3 === 0) rect(ctx, x + 14 + (tick % 5), y + 25, 1, 1, C.yellow);
  } else if (b.type === 'mine') {
    // A banknote flutters away from the press
    const k = (ms / 2500) % 1;
    rect(ctx, x + 14 + Math.round(k * 16), y + 22 - Math.round(k * 20) + Math.round(Math.sin(k * 12) * 2), 2, 1, rebel(b.faction) ? C.greyback : C.greenback);
  } else if (b.type === 'airbase') {
    rect(ctx, x + 14, y + 10 - (tick % 3), 2, 1, C.smoke);
  } else if (b.type === 'turret') {
    if (tick % 9 === 0) puff(ctx, x + 27, y + 14, ms, 0);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  if (p.kind === 'bullet') {
    // Minié ball with a puff of smoke behind
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, 'rgba(216,212,204,0.6)');
    rect(ctx, x, y, 2, 1, C.gunLight);
  } else if (p.kind === 'bomb') {
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, C.iron);
    if (Math.floor(performance.now() / 80) % 2) rect(ctx, x, y - 3, 1, 1, C.yellow);
  } else if (p.kind === 'lob') {
    // A big mortar shell trailing its fuse
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.fire);
    rect(ctx, x - 2, y - 2, 4, 4, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, C.iron);
  } else {
    // Cannonball
    rect(ctx, x - dx, y - dy, 1, 1, 'rgba(216,212,204,0.6)');
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, C.iron);
  }
}

// Knocked flat with their hat beside them: no blood in this war.
function corpse(e) {
  const t = team(e.f);
  const k = kit(e.f);
  const [c, g] = canvas(16, 6);
  outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, e.type === 'sniper' && !rebel(e.f) ? C.green : k.coat], [11, 3, 2, 2, k.pants], [13, 4, 2, 1, C.boot]],
    [[1, 4, 3, 1, C.beard], [5, 3, 2, 1, t.main]]);
  g.fillStyle = C.O; g.fillRect(0, 0, 4, 2); g.fillStyle = k.hat; g.fillRect(0, 0, 3, 1);
  return { c, ax: 8, ay: 5 };
}
const corpseKey = (e) => `ko-${e.type}-${sideOf(e.f)}`;

const UNION = {
  soldier: 'Bluecoat', heavy: 'Zouave', scout: 'Cavalry', engineer: 'Pioneer', sniper: 'Sharpshooter',
  jeep: 'Gatling Wagon', tank: 'Land Monitor', artillery: 'The Dictator', helicopter: 'Balloon Corps', bomber: 'Aereon Airship',
  hq: 'Capitol (Unfinished)', barracks: 'Muster Tents', turret: 'Battery', wall: 'Breastworks', mine: 'Greenback Press',
  workshop: 'Foundry', airbase: 'Balloon Yard', sam: 'Hale Rocket Battery', bridge: 'Pontoon Bridge', ramp: 'Plank Ramp',
};

export default {
  id: 'civil',
  name: 'Civil War',
  sides: [
    {
      id: 'union', name: 'The Union', short: 'Union',
      blurb: 'Blue coats, enormous sideburns, red-trousered Zouaves and a balloon corps for spotting the enemy (and the picnics).',
      names: UNION,
      win: 'Somebody fetch Mr Lincoln a taller hat.',
      lose: 'Back to Washington. The dome still isn’t finished.',
    },
    {
      id: 'rebel', name: 'The Confederacy', short: 'Rebels',
      blurb: 'Grey coats, homespun everything, a balloon sewn from silk dresses and a submarine nobody wants to ride in.',
      names: {
        soldier: 'Greyback', heavy: 'Tiger Zouave', scout: 'Plumed Cavalry', engineer: 'Sapper', sniper: 'Whitworth Marksman',
        jeep: 'Mule Howitzer', tank: 'Land Merrimack', artillery: 'Napoleon', helicopter: 'Silk Dress Balloon', bomber: 'Flying Hunley',
        hq: 'Statehouse', barracks: 'Muster Tents', turret: 'Battery', wall: 'Stone Wall', mine: 'Paper Money Press',
        workshop: 'Tredegar Works', airbase: 'Balloon Yard', sam: 'Hale Rocket Battery', bridge: 'Pontoon Bridge', ramp: 'Plank Ramp',
      },
      icons: { wall: '🧱', mine: '💸' },
      win: 'Print more money to celebrate! (Lots more money.)',
      lose: 'The Flying Hunley has sunk again. In the sky, somehow.',
    },
  ],
  palette,
  teamBase: COAT,
  roofBase: [0.5, 0.45, 0.4],
  soldier: buildSoldier,
  vehicle: { jeep: buildWagon, tank: buildIronclad, artillery: buildCannon },
  aircraft: { helicopter: buildBalloon, bomber: buildAirship },
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
  explosion: { rim: '#d8d4cc', body: '#f2a040', core: '#fff0b0', smoke: '#bab6ae', smoke2: '#d8d4cc' },
  corpse,
  corpseKey,
  debris: { '#7a4a24': '#a47a4c', '#5c361a': '#f2eee4' },
  minimap: { sky: '#7aa8da', ground: '#7a5a3a', platform: '#a8a49a', bridge: '#a47a4c', ramp: '#7a5634', surface: '#5a9a3a' },
  names: UNION,
  spriteIcons: true,
  icons: { hq: '🏛️', barracks: '⛺', turret: '💣', wall: '🪵', mine: '💵', workshop: '🏭', airbase: '🎈', bridge: '🛶', ramp: '🪜', sam: '🚀' },
};
