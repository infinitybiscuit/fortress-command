// Ghost Wars: a haunted night out at the movies. Pick the Busters (beige
// jumpsuits, unlicensed nuclear backpacks, a kid who sees dead people) or the
// Ghosts (bedsheets, a marshmallow giant, a cursed TV, a girl who climbs out
// of wells). Graveyard soil, crypt-stone ledges, a full moon over the city
// and fog rolling between the tombstones. Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team, sideOf } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#120e1a',                        // outline
  skin: '#f0c49a', skinDark: '#c8946a', hair: '#4a3222', pale: '#c8d4d4', paleDark: '#98a8aa',
  boot: '#1e1a22', gun: '#33343c', gunLight: '#5e606a', steel: '#b0b4bc',
  yellow: '#f2e06a', red: '#d0322a', redDark: '#8a1e1a', white: '#f2f4f8',
  sky: ['#0c0a20', '#120e2a', '#181232', '#1e163a', '#261c44', '#2e224c', '#382a56'],
  jump: '#bcac7e', jumpLight: '#d8ca9e', jumpDark: '#8a7c56',
  pack: '#4e525c', packLight: '#868a96', packDark: '#30323a',
  proton: '#ff9a3a', protonCore: '#fff0a0', protonBlue: '#8ad0ff',
  slime: '#6ae04a', slimeLight: '#b8ff7e', slimeDark: '#2e9a2a',
  ghost: '#e8eef8', ghostShade: '#aab8d0', ghostBlue: '#a8c4ee', ghostBlueDark: '#7090c4', glow: '#c8f0ff',
  marsh: '#f8f4ea', marshShade: '#d8d0c0',
  purple: '#6a4a9a', purpleDark: '#3e2a62', purpleLight: '#9a7ac8',
  pumpkin: '#e8822a', pumpkinDark: '#a85418', nightHorse: '#221c2a', nightHorseDark: '#14101a',
  wood: '#5e4636', woodLight: '#806048', woodDark: '#3a2a22',
  brick: '#8a3e36', brickDark: '#62281f', brickLight: '#a8564a',
  stone: '#7a7a88', stoneLight: '#9e9eac', stoneDark: '#50505e', moss: '#4a6a3a',
  mansion: '#4a3e5a', mansionDark: '#30283c', mansionLight: '#625478', roof: '#241c2e',
  grass: '#3a5440', grassLight: '#527058', grassDark: '#26382c',
  dirt: '#3e3240', dirtMid: '#33293a', dirtDeep: '#271f2e', pebble: '#5e4e62', pebbleDark: '#1c1622',
  glass: '#ffe08a', glassBlue: '#7ab4d8', tv: '#9ab0b8', money: '#e8e4d0',
  fire: '#f28a30', smoke: '#9aa4b0', smokeDark: '#6a7280', shadow: 'rgba(0,0,0,0.35)',
};
const COAT = [0.55, 0.5, 0.4];

const ghosts = (f) => sideOf(f) === 'ghosts';

// A bedsheet ghost: a domed top and a hem whose tails swish with the frame.
function sheet(x, y, w, h, col, frame) {
  const parts = [[x + 2, y, w - 4, 1, col], [x + 1, y + 1, w - 2, 1, col], [x, y + 2, w, h - 3, col]];
  for (let i = frame ? 1 : 0; i < w; i += 3) parts.push([x + i, y + h - 1, 2, 1, col]);
  return parts;
}

// A proton pack on the back (facing right, so on the left).
function protonPack(parts, details, x, y, w, h) {
  parts.push([x, y, w, h, C.pack]);
  details.push([x, y, w, 1, C.packLight], [x + 1, y + 2, w - 2, 1, C.packDark], [x + 1, y + h - 3, 1, 1, C.red], [x + 2, y + h - 3, 1, 1, C.yellow], [x + w - 1, y + h - 2, 1, 1, C.protonBlue]);
}

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right. Ghosts float a pixel or two up.
function buildBuster(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'scout') {
    // The kid who sees dead people: a jumper, a torch and very wide eyes
    const kl = frame ? [[6, 13, 2, 2], [9, 13, 2, 2]] : [[5, 13, 2, 2], [10, 13, 2, 2]];
    parts = [
      ...kl.map((l) => [...l, '#3a3e5a']), ...boots.map((b) => [...b, C.boot]),
      [6, 9, 6, 4, '#5a6a9a'], [6, 4, 6, 5, C.skin], [6, 3, 6, 2, '#6a4a2a'], [12, 10, 3, 1, C.gunLight],
    ];
    details = [[9, 6, 2, 1, C.white], [10, 6, 1, 1, C.O], [8, 8, 2, 1, C.skinDark], [6, 9, 6, 1, t.main], [15, 10, 1, 1, C.yellow], [11, 10, 1, 1, C.skin]];
  } else if (type === 'sniper') {
    // Psychic medium: a towering bouffant, thick glasses and a crystal ball
    parts = [
      [6, 14, 2, 1, C.boot], [9, 14, 2, 1, C.boot], [5, 8, 7, 6, C.purple], [7, 4, 5, 4, C.skin], [5, 0, 8, 5, '#f0e0b0'], [5, 4, 2, 4, '#f0e0b0'],
      [13, 8, 3, 3, C.glow],
    ];
    details = [
      [9, 5, 3, 1, C.O], [10, 5, 1, 1, C.glassBlue], [7, 8, 4, 1, C.white], [5, 11, 7, 1, t.main], [11, 9, 2, 1, C.skin], [13, 8, 1, 1, C.white],
      [5, 0, 8, 1, '#fff4d0'], [6, 13, 6, 1, C.purpleDark],
    ];
  } else {
    parts = [...legs.map((l) => [...l, C.jumpDark]), ...boots.map((b) => [...b, C.boot])];
    details = [];
    if (type === 'heavy') {
      // Proton heavy: the big pack, a hard hat with goggles and a two-handed thrower
      protonPack(parts, details, 0, 4, 5, 10);
      parts.push([5, 7, 8, 5, C.jump], [6, 3, 6, 5, C.skin], [6, 1, 6, 3, C.packLight], [9, 9, 10, 2, C.gun]);
      details.push([9, 4, 3, 1, C.protonBlue], [6, 1, 6, 1, C.steel], [7, 7, 4, 1, C.skinDark], [5, 10, 8, 1, t.main], [18, 9, 1, 2, C.proton], [9, 9, 10, 1, C.gunLight]);
    } else if (type === 'engineer') {
      // Parapsychologist: wild hair, glasses and a meter with its arms up
      parts.push([5, 8, 7, 4, C.jump], [6, 3, 6, 5, C.skin], [5, 1, 7, 3, C.hair], [11, 8, 4, 2, C.pack], [12, 6, 1, 2, C.packLight], [14, 6, 1, 2, C.packLight]);
      details.push([9, 5, 3, 1, C.O], [10, 5, 1, 1, C.glassBlue], [12, 5, 1, 1, C.yellow], [14, 5, 1, 1, C.yellow], [12, 8, 2, 1, C.slime], [5, 10, 7, 1, t.main], [8, 8, 2, 1, C.white]);
    } else {
      // Buster: a beige jumpsuit, a proton pack and the wand
      protonPack(parts, details, 1, 6, 4, 7);
      parts.push([5, 8, 7, 4, C.jump], [6, 3, 6, 5, C.skin], [6, 2, 6, 2, C.hair], [10, 9, 8, 1, C.gun]);
      details.push([10, 5, 1, 1, C.O], [9, 7, 2, 1, C.skinDark], [5, 10, 7, 1, t.main], [8, 8, 2, 1, C.white], [16, 9, 2, 1, C.gunLight], [17, 9, 1, 1, C.protonBlue]);
    }
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

function buildHorseman(f, frame) {
  // The Headless Horseman on a black horse, holding up his jack-o'-lantern
  const t = team(f);
  const [c, g] = canvas(26, 23);
  const legs = frame ? [[7, 16, 2, 6], [11, 16, 2, 5], [16, 16, 2, 6], [19, 16, 2, 5]] : [[6, 16, 2, 5], [10, 16, 2, 6], [17, 16, 2, 5], [20, 16, 2, 6]];
  outlined(g, [
    ...legs.map((l) => [...l, C.nightHorseDark]),
    [5, 11, 17, 6, C.nightHorse], [20, 7, 3, 6, C.nightHorse], [21, 5, 5, 3, C.nightHorse], [2, 11, 3, 6, C.nightHorseDark],
    [frame ? 3 : 4, 5, 7, 6, C.purpleDark], [10, 4, 5, 8, C.purpleDark], [16, 1, 4, 4, C.pumpkin], [15, 5, 2, 2, C.purpleDark],
  ], [
    [6, 15, 15, 1, C.nightHorseDark], [8, 11, 6, 3, t.main], [8, 11, 6, 1, t.light], [24, 6, 1, 1, C.red], [21, 5, 1, 2, C.nightHorseDark],
    [10, 4, 5, 1, C.white], [12, 3, 1, 1, C.O], [12, 12, 2, 3, C.purple], [12, 15, 2, 1, C.boot],
    [17, 2, 1, 1, C.yellow], [19, 2, 1, 1, C.yellow], [17, 4, 3, 1, C.yellow], [16, 1, 4, 1, C.pumpkinDark], [18, 0, 1, 1, C.slimeDark],
  ]);
  return { c, ax: 13, ay: 22 };
}

function buildGhost(type, f, frame) {
  if (type === 'scout') return buildHorseman(f, frame);
  const t = team(f);
  const [c, g] = canvas(20, 17);
  if (type === 'heavy') {
    // The Glutton: a green blob of slime with a big mouth and tiny arms
    const y = frame ? 1 : 0;
    outlined(g, [
      [4, 4 + y, 12, 8, C.slime], [5, 2 + y, 10, 2, C.slime], [6, 12 + y, 8, 2, C.slime], [2, 11 + y, 4, 2, C.slime],
      [15, 6 + y, 3, 2, C.slime], [2, 6 + y, 2, 2, C.slime],
    ], [
      [10, 7 + y, 5, 3, '#2a0e1a'], [10, 7 + y, 5, 1, C.white], [12, 9 + y, 3, 1, C.red],
      [9, 3 + y, 2, 2, C.white], [10, 4 + y, 1, 1, C.O], [12, 3 + y, 2, 2, C.white], [13, 4 + y, 1, 1, C.O],
      [5, 4 + y, 3, 1, C.slimeLight], [4, 11 + y, 10, 1, t.main], [6, 13 + y, 8, 1, C.slimeDark],
    ]);
  } else if (type === 'engineer') {
    // Poltergeist: a pale blue ghost with a chair floating along beside it
    const y = frame ? 1 : 0;
    outlined(g, [
      ...sheet(4, 5 + y, 9, 9, C.ghostBlue, frame), [13, 7 + y, 2, 1, C.ghostBlue],
      [13, 3 - y, 5, 1, C.woodLight], [17, 0 - y, 1, 3, C.wood], [13, 4 - y, 1, 2, C.wood], [17, 4 - y, 1, 2, C.wood],
    ], [
      [9, 8 + y, 1, 2, C.O], [11, 8 + y, 1, 2, C.O], [4, 11 + y, 9, 1, t.main], [5, 7 + y, 1, 4, C.ghostBlueDark], [16, 1 - y, 1, 1, C.O],
    ]);
  } else if (type === 'sniper') {
    // The girl from the well: a white nightgown, and hair over her face
    wellGirl(g, t, frame);
  } else {
    // Sheet ghost: eyeholes, an "oooh" and a sash in the team colour
    const y = frame ? 1 : 0;
    outlined(g, [...sheet(4, 2 + y, 10, 12, C.ghost, frame), [14, 8 + y, 2, 1, C.ghost], [2, 9 + y, 2, 1, C.ghost]], [
      [9, 5 + y, 1, 2, C.O], [12, 5 + y, 1, 2, C.O], [10, 9 + y, 2, 2, C.O], [4, 4 + y, 1, 8, C.ghostShade], [4, 11 + y, 10, 1, t.main],
    ]);
  }
  return { c, ax: 8, ay: 16 };
}

function wellGirl(g, t, frame) {
  const feet = frame ? [[6, 15, 2, 1], [9, 15, 2, 1]] : [[5, 15, 2, 1], [10, 15, 2, 1]];
  outlined(g, [
    ...feet.map((p) => [...p, C.pale]), [5, 8, 7, 7, '#d8d8d0'], [6, 1, 6, 10, '#0e0c12'], [11, 9, 5, 1, C.pale],
  ], [
    [10, 5, 1, 1, C.white], [6, 1, 6, 1, t.main], [16, 8, 1, 1, C.pale], [16, 10, 1, 1, C.pale], [5, 13, 7, 1, '#b8b8b0'], [5, 12, 1, 1, '#0e0c12'],
  ]);
}

const buildSoldier = (type, f, frame) => (ghosts(f) ? buildGhost(type, f, frame) : buildBuster(type, f, frame));

// ── Vehicles ───────────────────────────────────────────────────────────────
function wheel(g, x, y, r, frame) {
  disc(g, x, y, r + 1, C.O);
  disc(g, x, y, r, '#1a1820');
  disc(g, x, y, Math.max(1, r - 2), C.steel);
  g.fillStyle = C.O;
  if (frame) g.fillRect(x - 1, y, 3, 1); else g.fillRect(x, y - 1, 1, 3);
}

// Busters: the Spook Wagon, a tail-finned 1959 ambulance with junk on the roof.
// Ghosts: a black hearse with purple curtains and a see-through driver.
function buildWagon(f, frame) {
  const t = team(f);
  const [c, g] = canvas(36, 19);
  if (ghosts(f)) {
    outlined(g, [[1, 7, 33, 6, C.nightHorse], [6, 2, 20, 6, C.nightHorse], [26, 5, 8, 3, C.nightHorse], [0, 11, 2, 2, C.slimeDark]], [
      [7, 3, 10, 4, C.purple], [8, 3, 1, 4, C.purpleLight], [15, 3, 1, 4, C.purpleLight], [19, 3, 6, 4, C.glow], [21, 4, 2, 1, C.O],
      [1, 10, 33, 1, t.main], [33, 8, 1, 1, C.slimeLight], [6, 2, 20, 1, C.gunLight], [10, 8, 4, 1, C.steel],
    ]);
  } else {
    outlined(g, [[1, 7, 33, 6, C.white], [8, 2, 17, 6, C.white], [25, 5, 8, 3, C.white], [0, 4, 4, 4, C.white], [9, 0, 14, 1, C.pack], [14, 0, 3, 1, C.red]], [
      [19, 3, 5, 3, C.glassBlue], [10, 3, 7, 3, C.glassBlue], [1, 9, 33, 1, C.red], [1, 11, 33, 1, t.main], [32, 11, 3, 1, C.steel],
      [33, 8, 1, 1, C.yellow], [0, 4, 2, 1, C.red], [18, 0, 3, 1, C.gun], [11, 0, 2, 1, C.yellow], [8, 2, 17, 1, C.ghostShade],
    ]);
  }
  wheel(g, 8, 15, 3, frame);
  wheel(g, 27, 15, 3, frame);
  return { c, ax: 18, ay: 18 };
}

// Busters: a containment truck hauling a tank of trapped ghosts.
// Ghosts: the Marshmallow Giant, in a sailor's collar in the team colour.
function buildTank(f, frame) {
  const t = team(f);
  if (ghosts(f)) {
    const [c, g] = canvas(30, 30);
    const [l, r] = frame ? [0, 1] : [1, 0];
    outlined(g, [
      [9, 21 - l, 5, 8 + l, C.marsh], [16, 21 - r, 5, 8 + r, C.marsh], [7, 11, 16, 12, C.marsh], [5, 13, 2, 8, C.marsh], [23, 12, 3, 8, C.marsh],
      [3, 15, 3, 5, C.marsh], [9, 3, 12, 9, C.marsh], [9, 1, 12, 2, C.white],
    ], [
      [9, 3, 12, 1, t.main], [10, 11, 10, 3, t.main], [14, 13, 2, 1, C.red], [12, 6, 1, 2, C.O], [17, 6, 1, 2, C.O], [13, 9, 5, 1, C.O],
      [12, 8, 1, 1, C.O], [18, 8, 1, 1, C.O], [7, 14, 2, 8, C.marshShade], [9, 4, 1, 7, C.marshShade], [7, 18, 16, 1, C.marshShade],
      [9, 28, 5, 1, C.marshShade], [16, 28, 5, 1, C.marshShade],
    ]);
    return { c, ax: 15, ay: 29 };
  }
  const [c, g] = canvas(40, 22);
  outlined(g, [
    [2, 13, 36, 3, C.pack], [28, 5, 9, 8, C.white], [3, 4, 24, 9, C.packLight], [14, 1, 13, 2, C.gun], [37, 9, 2, 3, C.steel],
  ], [
    [31, 6, 5, 3, C.glassBlue], [8, 4, 1, 9, C.pack], [20, 4, 1, 9, C.pack], [11, 6, 7, 4, C.slime], [12, 7, 2, 1, C.white], [15, 8, 2, 1, C.slimeLight],
    [3, 4, 24, 1, C.steel], [4, 3, 2, 1, C.red], [2, 14, 36, 1, t.main], [28, 10, 9, 1, C.red], [26, 1, 1, 2, C.protonBlue],
  ]);
  for (const x of [8, 20, 32]) wheel(g, x, 18, 3, frame);
  return { c, ax: 20, ay: 21 };
}

// Busters: the Slime Mortar, a pressure tank and a fat barrel on a trailer.
// Ghosts: the Cursed TV, a wood-cabinet set on a squeaky trolley, playing static.
function buildArtillery(f, frame) {
  const t = team(f);
  if (ghosts(f)) {
    const [c, g] = canvas(32, 22);
    outlined(g, [[4, 15, 22, 2, C.steel], [5, 3, 20, 12, C.wood], [11, 0, 1, 3, C.gunLight], [18, 0, 1, 3, C.gunLight]], [
      [5, 3, 20, 1, C.woodLight], [7, 5, 13, 8, C.tv], [21, 5, 3, 8, C.woodDark], [21, 12, 3, 1, t.main], [4, 15, 22, 1, C.white],
    ]);
    staticScreen(g, 7, 5, 13, 8, 0);
    for (const x of [7, 23]) { disc(g, x, 19, 2, C.O); disc(g, x, 19, 1, C.gunLight); }
    g.fillStyle = C.O; g.fillRect(frame ? 6 : 7, 19, 1, 1);
    return { c, ax: 16, ay: 21 };
  }
  const [c, g] = canvas(34, 20);
  outlined(g, [[2, 10, 24, 3, C.pack], [3, 4, 10, 6, C.slime], [14, 6, 6, 4, C.gun], [18, 3, 5, 4, C.gun], [21, 1, 5, 3, C.gun], [26, 11, 6, 1, C.gun]], [
    [3, 4, 10, 1, C.slimeLight], [5, 6, 2, 2, C.slimeDark], [25, 1, 1, 3, C.slimeLight], [2, 11, 24, 1, t.main], [15, 6, 3, 1, C.gunLight], [9, 6, 2, 2, C.white],
  ]);
  wheel(g, 8, 16, 3, frame);
  wheel(g, 20, 16, 3, frame);
  return { c, ax: 16, ay: 19 };
}

// TV static: grey snow, with the well from the cursed tape showing through.
function staticScreen(g, x, y, w, h, seed) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = hash(seed + i * 31 + j * 7);
    g.fillStyle = v < 0.3 ? '#5a6870' : v < 0.7 ? C.tv : '#d8e4e8';
    g.fillRect(x + i, y + j, 1, 1);
  }
  const cx = x + Math.floor(w / 2);
  g.fillStyle = '#e8f0f0'; g.fillRect(cx - 3, y + h - 3, 7, 1);
  g.fillStyle = '#2a3036'; g.fillRect(cx - 2, y + h - 3, 5, 3); g.fillRect(cx - 3, y + h - 2, 7, 2);
}

// Busters: a little white helicopter with a proton gun under its nose.
// Ghosts: a floating clown doll in a suit of the team colour, grinning.
function buildHeli(f) {
  const t = team(f);
  if (ghosts(f)) {
    const [c, g] = canvas(22, 22);
    outlined(g, [
      [8, 17, 2, 3, C.white], [12, 17, 2, 3, C.white], [7, 20, 3, 1, C.red], [12, 20, 3, 1, C.red],
      [6, 10, 10, 7, t.main], [2, 11, 4, 2, t.main], [16, 11, 4, 2, t.main], [1, 11, 1, 2, C.white], [20, 11, 1, 2, C.white],
      [3, 3, 3, 4, C.red], [16, 3, 3, 4, C.red], [6, 3, 10, 7, C.white], [9, 0, 4, 3, C.yellow], [5, 9, 12, 2, C.white],
    ], [
      [8, 5, 2, 1, C.O], [12, 5, 2, 1, C.O], [10, 7, 2, 1, C.red], [7, 8, 8, 1, C.redDark], [8, 8, 6, 1, C.white],
      [8, 12, 1, 1, C.white], [12, 14, 1, 1, C.white], [13, 11, 1, 1, C.yellow], [9, 15, 1, 1, C.yellow], [10, 0, 1, 1, C.red],
    ]);
    return { c, ax: 11, ay: 21 };
  }
  const [c, g] = canvas(30, 14);
  outlined(g, [
    [1, 4, 10, 2, C.white], [1, 1, 2, 4, C.white], [10, 3, 13, 7, C.white], [11, 12, 11, 1, C.pack], [16, 1, 1, 2, C.pack], [21, 10, 5, 1, C.gun],
  ], [
    [18, 4, 4, 3, C.glassBlue], [10, 7, 13, 1, C.red], [3, 4, 6, 1, t.main], [13, 10, 1, 2, C.pack], [19, 10, 1, 2, C.pack], [26, 10, 1, 1, C.proton],
    [10, 3, 13, 1, C.ghostShade],
  ]);
  return { c, ax: 15, ay: 13 };
}

// Busters: a blimp with a trap-dropping gondola.
// Ghosts: a spectral galleon with tattered sails and glowing portholes.
function buildBomber(f) {
  const t = team(f);
  if (ghosts(f)) {
    const [c, g] = canvas(48, 28);
    outlined(g, [[12, 5, 12, 10, '#b8e8d8'], [26, 7, 10, 9, '#b8e8d8'], [19, 1, 5, 3, t.main], [18, 1, 1, 18, C.woodDark], [30, 4, 1, 15, C.woodDark]], [
      [15, 8, 2, 2, C.O], [20, 11, 3, 1, C.O], [29, 9, 2, 1, C.O], [33, 12, 2, 2, C.O], [12, 14, 12, 1, '#88b8a8'], [26, 15, 10, 1, '#88b8a8'],
      [19, 1, 5, 1, t.light],
    ]);
    outlined(g, [[6, 18, 36, 6, '#3e7a6a'], [40, 15, 5, 5, '#3e7a6a'], [4, 13, 8, 6, '#3e7a6a'], [10, 24, 30, 1, '#3e7a6a']], [
      [6, 18, 36, 1, '#6aaa98'], [4, 13, 8, 1, '#6aaa98'], [12, 20, 2, 2, C.slimeLight], [20, 20, 2, 2, C.slimeLight], [28, 20, 2, 2, C.slimeLight],
      [6, 22, 36, 1, t.main], [43, 15, 1, 1, C.O],
    ]);
    return { c, ax: 24, ay: 26 };
  }
  const [c, g] = canvas(46, 22);
  outlined(g, [[4, 2, 36, 10, C.white], [2, 4, 40, 6, C.white], [41, 5, 2, 4, C.white], [0, 1, 5, 4, C.white], [0, 9, 5, 4, C.white], [17, 14, 13, 4, C.pack]], [
    [4, 2, 36, 1, C.ghost], [2, 9, 40, 1, C.ghostShade], [4, 11, 36, 1, C.ghostShade], [6, 6, 34, 1, C.red], [0, 2, 3, 1, t.main], [0, 11, 3, 1, t.main],
    [19, 15, 2, 2, C.glassBlue], [23, 15, 2, 2, C.glassBlue], [27, 15, 2, 1, C.yellow], [17, 17, 13, 1, t.main],
  ]);
  disc(g, 24, 6, 3, C.O); disc(g, 24, 6, 2, t.main); g.fillStyle = C.white; g.fillRect(23, 5, 2, 2);
  g.fillStyle = C.O; for (const x of [19, 27]) g.fillRect(x, 12, 1, 2);
  return { c, ax: 23, ay: 20 };
}

function rotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 60);
  const s = u.facing;
  if (u.type === 'helicopter') {
    if (ghosts(u.faction)) {
      // The doll floats on a wisp of ectoplasm
      const k = Math.floor(tick / 2) % 3;
      ctx.globalAlpha = 0.5;
      rect(ctx, x - 2 + k, y + 1, 3, 1, C.glow); rect(ctx, x - 1 - k, y + 3, 2, 1, C.glow);
      ctx.globalAlpha = 1;
    } else {
      const half = tick % 2 ? 12 : 5;
      rect(ctx, x + s - half, y - 13, half * 2, 1, '#e8e8e8');
      rect(ctx, x - 14 * s - (s > 0 ? 0 : 1), y - 12 + (tick % 2 ? -1 : 1), 1, 2, '#d8d8d8');
    }
  } else if (ghosts(u.faction)) {
    // Mist trailing off the galleon's keel
    const k = (performance.now() / 900) % 1;
    ctx.globalAlpha = 0.4 * (1 - k);
    rect(ctx, x - s * (18 + Math.round(k * 10)), y - 2 + Math.round(k * 3), 4, 1, C.glow);
    ctx.globalAlpha = 1;
  } else {
    const px = s > 0 ? x - 24 : x + 23;
    if (tick % 2) rect(ctx, px, y - 16, 1, 7, '#d8d8d8'); else rect(ctx, px, y - 13, 1, 2, C.gunLight);
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
function pennant(g, x, y, h, t) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 3, h + 1); g.fillRect(x + 1, y - 1, 8, 6);
  g.fillStyle = C.steel; g.fillRect(x, y, 1, h);
  g.fillStyle = t.main; g.fillRect(x + 1, y, 7, 4);
  g.fillStyle = t.light; g.fillRect(x + 1, y, 7, 1);
}

function windowLit(g, x, y, w, h, col = C.glass) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = col; g.fillRect(x, y, w, h);
  g.fillStyle = C.O; g.fillRect(x + Math.floor(w / 2), y, 1, h); g.fillRect(x, y + Math.floor(h / 2), w, 1);
}

function bricks(g, x, y, w, h, line) {
  g.fillStyle = line;
  for (let r = 0; y + r * 3 < y + h; r++) {
    g.fillRect(x, y + r * 3, w, 1);
    for (let i = (r % 2) * 3; i < w; i += 6) g.fillRect(x + i, y + r * 3, 1, 3);
  }
}

function gable(g, cx, y, w, h, col, light) {
  for (let i = 0; i < h; i++) {
    const half = Math.round(((i + 1) / h) * (w / 2));
    g.fillStyle = C.O; g.fillRect(cx - half - 1, y + i - 1, half * 2 + 2, 2);
  }
  for (let i = 0; i < h; i++) {
    const half = Math.round(((i + 1) / h) * (w / 2));
    g.fillStyle = i === 0 ? light : col; g.fillRect(cx - half, y + i, half * 2, 1);
  }
}

function tombstone(g, x, y, w, h, t) {
  outlined(g, [[x + 1, y, w - 2, 1, C.stone], [x, y + 1, w, h - 1, C.stone]], [[x + 1, y, w - 2, 1, C.stoneLight], [x + w - 1, y + 1, 1, h - 1, C.stoneDark]]);
  g.fillStyle = C.stoneDark; g.fillRect(x + Math.floor(w / 2), y + 2, 1, 3); g.fillRect(x + Math.floor(w / 2) - 1, y + 3, 3, 1);
  if (t) { g.fillStyle = t.main; g.fillRect(x + 1, y + h - 2, w - 2, 1); }
}

const BUILD = {
  hq(g, t, f) {
    if (ghosts(f)) {
      // The haunted mansion: a crooked Victorian pile with a witch's-hat tower
      outlined(g, [[6, 20, 52, 26, C.mansion], [0, 44, 64, 4, C.stoneDark], [8, 6, 12, 16, C.mansion]], [
        [6, 20, 52, 1, C.mansionLight], [0, 44, 64, 1, C.stone], [8, 6, 12, 1, C.mansionLight],
      ]);
      g.fillStyle = C.mansionDark; for (let y = 24; y < 44; y += 3) g.fillRect(6, y, 52, 1);
      gable(g, 40, 9, 40, 12, C.roof, C.mansionLight);
      gable(g, 14, 0, 14, 7, C.roof, C.mansionLight);
      windowLit(g, 11, 10, 5, 6);
      windowLit(g, 26, 25, 5, 7); windowLit(g, 46, 25, 5, 7, C.slimeLight); windowLit(g, 11, 26, 5, 7, '#2a2232');
      windowLit(g, 36, 13, 7, 5);
      g.fillStyle = C.O; g.fillRect(47, 27, 3, 4); g.fillStyle = C.ghost; g.fillRect(48, 28, 1, 3);
      outlined(g, [[22, 36, 20, 2, C.wood], [29, 34, 6, 10, C.woodDark]], [[22, 36, 20, 1, C.woodLight], [33, 39, 1, 1, C.yellow]]);
      g.fillStyle = C.O; for (const x of [23, 40]) g.fillRect(x, 38, 1, 6);
      g.fillStyle = t.main; g.fillRect(6, 42, 52, 2);
      // A loose shutter hanging askew
      g.fillStyle = C.O; g.fillRect(52, 26, 3, 8); g.fillStyle = C.mansionDark; g.fillRect(53, 27, 1, 6);
      pennant(g, 14, 0, 4, t);
    } else {
      // The old firehouse: three storeys of brick and a big red engine door
      outlined(g, [[2, 10, 60, 36, C.brick], [0, 44, 64, 4, C.stoneDark], [0, 7, 64, 3, C.stoneLight]], [[0, 44, 64, 1, C.stone], [0, 9, 64, 1, C.stone]]);
      bricks(g, 2, 11, 60, 33, C.brickDark);
      outlined(g, [[10, 12, 44, 6, C.white]], [[10, 17, 44, 1, C.ghostShade]]);
      g.fillStyle = t.main; for (let i = 0; i < 9; i++) g.fillRect(13 + i * 4 + (i > 4 ? 2 : 0), 14, 3, 2);
      for (const x of [6, 18, 40, 52]) windowLit(g, x, 21, 6, 7);
      outlined(g, [[20, 31, 24, 15, C.red]], [[20, 31, 24, 1, '#e86a5a'], [20, 36, 24, 1, C.redDark], [20, 41, 24, 1, C.redDark], [31, 31, 1, 15, C.redDark]]);
      g.fillStyle = C.O; g.fillRect(22, 33, 20, 1);
      outlined(g, [[50, 34, 6, 10, C.woodDark]], [[54, 39, 1, 1, C.yellow]]);
      pennant(g, 4, 0, 7, t);
    }
  },
  barracks(g, t, f) {
    if (ghosts(f)) {
      // Graveyard: tombstones, a little crypt, and a hand coming up for air
      outlined(g, [[28, 10, 18, 22, C.stone]], [[28, 10, 18, 1, C.stoneLight], [44, 11, 2, 21, C.stoneDark]]);
      gable(g, 37, 4, 20, 6, C.stoneDark, C.stoneLight);
      g.fillStyle = C.O; g.fillRect(33, 18, 8, 14); g.fillStyle = '#1a2a1e'; g.fillRect(34, 19, 6, 13);
      g.fillStyle = C.slime; g.fillRect(35, 24, 4, 1); g.fillRect(34, 26, 1, 1);
      g.fillStyle = t.main; g.fillRect(28, 13, 18, 2);
      tombstone(g, 2, 18, 7, 12, t);
      tombstone(g, 13, 14, 8, 16, t);
      g.fillStyle = C.O; g.fillRect(23, 25, 3, 5); g.fillStyle = C.pale; g.fillRect(24, 26, 1, 4); g.fillRect(23, 24, 1, 2); g.fillRect(25, 24, 1, 2);
      g.fillStyle = C.dirtMid; g.fillRect(0, 30, 48, 2); g.fillStyle = C.grass; g.fillRect(0, 30, 48, 1);
    } else {
      // Recruiting office: a storefront with a striped awning and a phone that never stops
      outlined(g, [[2, 6, 44, 26, C.brick]], [[2, 6, 44, 1, C.brickLight]]);
      bricks(g, 2, 13, 44, 19, C.brickDark);
      outlined(g, [[4, 7, 40, 5, C.white]], [[4, 11, 40, 1, C.ghostShade]]);
      g.fillStyle = t.main; for (let i = 0; i < 8; i++) g.fillRect(7 + i * 5, 8, 3, 2);
      for (let i = 0; i < 11; i++) { g.fillStyle = i % 2 ? C.white : C.red; g.fillRect(2 + i * 4, 13, 4, 2); }
      windowLit(g, 6, 18, 18, 10);
      g.fillStyle = C.O; g.fillRect(12, 22, 3, 6); g.fillStyle = C.jump; g.fillRect(13, 23, 1, 5);
      outlined(g, [[30, 18, 8, 14, C.woodDark]], [[36, 25, 1, 1, C.yellow]]);
    }
  },
  turret(g, t, f) {
    if (ghosts(f)) {
      // A grabbing tree: twisted branches like fingers and two glowing eyes
      g.fillStyle = C.O;
      for (const [x, y, w, h] of [[11, 10, 10, 22], [3, 6, 10, 2], [2, 2, 2, 6], [19, 4, 11, 2], [27, 0, 2, 6], [14, 0, 2, 11], [8, 28, 16, 4]]) g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle = '#3a2e3a';
      for (const [x, y, w, h] of [[11, 10, 10, 22], [3, 6, 10, 2], [2, 2, 2, 6], [19, 4, 11, 2], [27, 0, 2, 6], [14, 0, 2, 11], [8, 28, 16, 4]]) g.fillRect(x, y, w, h);
      g.fillStyle = '#524252'; g.fillRect(11, 10, 2, 22);
      g.fillStyle = C.O; g.fillRect(13, 15, 3, 3); g.fillRect(17, 15, 3, 3); g.fillRect(14, 21, 4, 3);
      g.fillStyle = C.slimeLight; g.fillRect(14, 16, 1, 1); g.fillRect(18, 16, 1, 1);
      g.fillStyle = t.main; g.fillRect(23, 6, 3, 3);
    } else {
      // Proton tower: an emitter on a mast, coils humming
      outlined(g, [[6, 24, 20, 8, C.stone], [14, 9, 4, 15, C.pack], [8, 4, 14, 6, C.packLight], [22, 6, 8, 2, C.gun], [10, 13, 3, 8, C.packDark], [19, 13, 3, 8, C.packDark]], [
        [6, 24, 20, 1, C.stoneLight], [6, 27, 20, 2, t.main], [8, 4, 14, 1, C.steel], [10, 6, 2, 2, C.red], [29, 6, 1, 2, C.protonBlue],
        [10, 15, 3, 1, C.proton], [10, 18, 3, 1, C.proton], [19, 15, 3, 1, C.proton], [19, 18, 3, 1, C.proton],
      ]);
    }
  },
  wall(g, t, f) {
    if (ghosts(f)) {
      // A tall gothic headstone, mossy, with a wreath in the team colour
      outlined(g, [[3, 4, 10, 28, C.stone], [5, 2, 6, 2, C.stone], [7, 0, 2, 2, C.stone]], [
        [3, 4, 10, 1, C.stoneLight], [12, 5, 1, 27, C.stoneDark], [5, 2, 6, 1, C.stoneLight], [3, 28, 10, 4, C.moss], [3, 30, 4, 1, C.grass],
      ]);
      g.fillStyle = C.stoneDark; g.fillRect(7, 8, 2, 9); g.fillRect(5, 10, 6, 2);
      disc(g, 8, 22, 3, t.main); g.fillStyle = C.stone; g.fillRect(7, 21, 2, 2);
    } else {
      // Containment fence: two posts with a laser grid between them
      outlined(g, [[1, 4, 3, 28, C.packLight], [12, 4, 3, 28, C.packLight], [0, 2, 5, 2, C.pack], [11, 2, 5, 2, C.pack]], [
        [3, 5, 1, 27, C.pack], [14, 5, 1, 27, C.pack], [1, 20, 3, 2, t.main], [12, 20, 3, 2, t.main], [2, 2, 1, 1, C.red], [13, 2, 1, 1, C.red],
      ]);
      g.fillStyle = C.proton; for (let y = 7; y < 31; y += 5) g.fillRect(4, y, 8, 1);
      g.fillStyle = C.protonCore; for (let y = 7; y < 31; y += 10) g.fillRect(6, y, 4, 1);
    }
  },
  mine(g, t, f) {
    if (ghosts(f)) {
      // The cursed well, with something pale gripping the rim
      outlined(g, [[6, 18, 20, 14, C.stone], [6, 6, 2, 12, C.wood], [24, 6, 2, 12, C.wood], [3, 3, 26, 3, C.woodDark], [14, 9, 4, 3, t.main]], [
        [6, 18, 20, 1, C.stoneLight], [3, 3, 26, 1, C.woodLight], [14, 9, 4, 1, t.light], [7, 6, 1, 12, C.woodLight],
      ]);
      g.fillStyle = C.O; g.fillRect(15, 6, 1, 3);
      bricks(g, 6, 20, 20, 12, C.stoneDark);
      g.fillStyle = C.glow; g.fillRect(8, 18, 16, 1);
      g.fillStyle = C.O; g.fillRect(17, 15, 5, 4); g.fillStyle = C.pale; g.fillRect(18, 16, 1, 3); g.fillRect(19, 16, 1, 3); g.fillRect(20, 17, 1, 2);
    } else {
      // Containment unit: a vault of trapped ghosts, billed by the ghost
      outlined(g, [[2, 6, 28, 26, C.packLight], [6, 12, 13, 14, C.pack], [22, 2, 3, 4, C.pack]], [
        [2, 6, 28, 1, C.steel], [6, 12, 13, 1, C.packDark], [21, 10, 6, 6, C.O], [2, 28, 28, 2, t.main],
      ]);
      disc(g, 12, 19, 4, C.O); disc(g, 12, 19, 3, C.steel); g.fillStyle = C.O; g.fillRect(9, 19, 7, 1); g.fillRect(12, 16, 1, 7);
      g.fillStyle = C.red; g.fillRect(22, 11, 1, 1); g.fillStyle = C.slime; g.fillRect(24, 11, 1, 1); g.fillStyle = C.yellow; g.fillRect(22, 13, 4, 1);
      g.fillStyle = C.money; g.fillRect(22, 20, 6, 3); g.fillStyle = C.slimeDark; g.fillRect(24, 21, 2, 1);
    }
  },
  workshop(g, t, f) {
    if (ghosts(f)) {
      // Video store: rows of tapes and a TV in the window, a neon sign above
      outlined(g, [[2, 6, 44, 26, C.purpleDark]], [[2, 6, 44, 1, C.purple]]);
      outlined(g, [[4, 7, 40, 6, '#1a1622']]);
      g.fillStyle = t.light; for (let i = 0; i < 7; i++) g.fillRect(7 + i * 5, 9, 3, 2);
      windowLit(g, 5, 16, 24, 12, '#2a2436');
      const tapes = ['#c8322a', '#2a6aaa', '#e8c84a', '#5aa06a', '#9a6ac8'];
      for (let i = 0; i < 10; i++) { g.fillStyle = tapes[i % tapes.length]; g.fillRect(6 + (i % 5) * 2 + (i > 4 ? 13 : 0), 23, 1, 4); }
      outlined(g, [[10, 17, 8, 5, C.wood]]);
      staticScreen(g, 11, 18, 6, 3, 9);
      outlined(g, [[33, 16, 8, 16, C.woodDark]], [[39, 24, 1, 1, C.yellow]]);
    } else {
      // Gadget garage: a roll-up door and a Tesla coil on the roof
      outlined(g, [[2, 10, 44, 22, C.packLight], [36, 2, 4, 8, C.pack], [34, 0, 8, 2, C.steel]], [[2, 10, 44, 1, C.steel], [2, 12, 44, 2, t.main]]);
      outlined(g, [[6, 16, 22, 16, C.pack]]);
      g.fillStyle = C.packDark; for (let y = 18; y < 32; y += 2) g.fillRect(6, y, 22, 1);
      g.fillStyle = C.proton; g.fillRect(37, 4, 2, 1); g.fillRect(37, 7, 2, 1);
      windowLit(g, 33, 18, 8, 6);
    }
  },
  airbase(g, t, f) {
    if (ghosts(f)) {
      // A ruined chapel with a bell tower (and the bats that live in it)
      outlined(g, [[0, 16, 36, 16, C.stoneDark], [38, 4, 16, 28, C.stone]], [[0, 16, 36, 1, C.stone], [38, 4, 16, 1, C.stoneLight], [52, 5, 2, 27, C.stoneDark]]);
      gable(g, 46, 0, 20, 5, C.roof, C.mansionLight);
      g.fillStyle = C.O; g.fillRect(42, 8, 8, 10); g.fillStyle = '#1a1622'; g.fillRect(43, 9, 6, 9);
      disc(g, 46, 13, 2, C.O); disc(g, 46, 13, 1, '#c8a040'); g.fillStyle = C.O; g.fillRect(46, 9, 1, 2);
      g.fillStyle = C.O; for (const x of [6, 20]) { g.fillRect(x, 20, 7, 12); } g.fillStyle = '#1a1622'; for (const x of [7, 21]) g.fillRect(x, 21, 5, 11);
      g.clearRect(0, 16, 4, 3); g.clearRect(28, 16, 6, 2);
      g.fillStyle = t.main; g.fillRect(38, 22, 16, 2);
    } else {
      // Rooftop pad: an H on a flat roof, with a windsock
      outlined(g, [[4, 16, 56, 16, C.brick], [0, 12, 64, 4, C.stone]], [[0, 12, 64, 1, C.stoneLight], [0, 15, 64, 1, C.stoneDark]]);
      bricks(g, 4, 17, 56, 15, C.brickDark);
      for (const x of [10, 24, 40]) windowLit(g, x, 21, 5, 6);
      g.fillStyle = C.yellow; g.fillRect(28, 13, 1, 2); g.fillRect(33, 13, 1, 2); g.fillRect(29, 13, 4, 1);
      g.fillStyle = t.main; g.fillRect(4, 29, 56, 2);
      g.fillStyle = C.O; g.fillRect(58, 0, 1, 12);
      g.fillStyle = C.proton; g.fillRect(59, 1, 4, 2); g.fillStyle = C.white; g.fillRect(61, 1, 1, 2);
    }
  },
  bridge(g, t, f) {
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 7);
    if (ghosts(f)) {
      // Rotten planks oozing slime
      g.fillStyle = C.woodLight; g.fillRect(0, 1, 16, 2);
      g.fillStyle = C.wood; for (let x = 2; x < 16; x += 4) g.fillRect(x, 1, 1, 2);
      g.fillStyle = C.woodDark; g.fillRect(0, 3, 16, 3);
      g.fillStyle = C.slime; g.fillRect(3, 3, 3, 1); g.fillRect(4, 4, 1, 2); g.fillRect(11, 3, 2, 1); g.fillRect(12, 4, 1, 3);
    } else {
      // A steel gantry
      g.fillStyle = C.packLight; g.fillRect(0, 1, 16, 2);
      g.fillStyle = C.pack; g.fillRect(0, 3, 16, 3);
      g.fillStyle = C.packLight; for (let x = 0; x < 16; x += 4) { g.fillRect(x, 4, 1, 1); g.fillRect(x + 2, 5, 1, 1); }
      g.fillStyle = C.steel; g.fillRect(2, 1, 1, 1); g.fillRect(10, 1, 1, 1);
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
    // Graveyard soil under a mat of dead grass, with the odd bone
    g.fillStyle = kind === 'dirtDeep' ? C.dirtDeep : kind === 'dirtMid' ? C.dirtMid : C.dirt;
    g.fillRect(0, 0, T, T);
    speckle(6, C.pebble, C.pebbleDark, kind === 'dirtTop' ? 5 : 0);
    if (kind === 'dirtTop') {
      g.fillStyle = C.grass; g.fillRect(0, 0, T, 4);
      g.fillStyle = C.grassLight; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.grassDark; g.fillRect(0, 4, T, 1);
      for (let x = 0; x < T; x += 3) if (hash(seed + x) < 0.6) g.fillRect(x, 5, 1, 1);
    } else if (kind === 'dirtDeep' && variant === 1) {
      g.fillStyle = '#d8d4c4'; g.fillRect(4, 8, 6, 1); g.fillRect(3, 7, 1, 3); g.fillRect(10, 7, 1, 3);
    }
  } else {
    // Crypt masonry with moss along the top
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.stone; g.fillRect(0, 0, T, T);
    g.fillStyle = C.stoneDark;
    for (let r = 0; r < 4; r++) {
      g.fillRect(0, 3 + r * 4, T, 1);
      for (let x = (r + variant) % 2 ? 2 : 6; x < T; x += 8) g.fillRect(x, 4 + r * 4, 1, 3);
    }
    g.fillStyle = C.stoneLight; g.fillRect(Math.floor(hash(seed) * 10) + 1, 5 + Math.floor(hash(seed + 3) * 3) * 4, 3, 1);
    g.fillStyle = C.moss; g.fillRect(0, 0, T, 3);
    g.fillStyle = C.grassLight; g.fillRect(0, 0, T, 1);
    for (let x = 0; x < T; x += 2) if (hash(seed + x + 50) < 0.4) g.fillRect(x, 3, 1, 1 + Math.floor(hash(seed + x) * 2));
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Dead tufts, tiny headstones, glowing toadstools and a guttering candle.
function surface(ctx, x, y, ground, h) {
  ctx.fillStyle = C.grassDark;
  ctx.fillRect(x + Math.floor(h * 12), y - 2, 1, 2);
  if (!ground) return;
  if (h > 0.92) {
    rect(ctx, x + 6, y - 5, 4, 5, C.O); rect(ctx, x + 7, y - 4, 2, 4, C.stoneLight);
  } else if (h > 0.84) {
    rect(ctx, x + 9, y - 3, 1, 3, '#e8e4d8');
    rect(ctx, x + 9, y - 4 - (Math.floor(performance.now() / 200 + h * 10) % 2), 1, 1, C.yellow);
  } else if (h > 0.6) {
    rect(ctx, x + 3, y - 2, 2, 1, C.slimeLight); rect(ctx, x + 4, y - 1, 1, 1, C.pale);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};

// The city skyline: towers with a few lit windows, and one with a temple on top.
function cityBlock(k) {
  const key = `city${k}`;
  if (scenery[key]) return scenery[key];
  const w = 14 + Math.floor(hash(k + 5) * 16);
  const h = 30 + Math.floor(hash(k + 8) * 50) + (k === 4 ? 30 : 0);
  const [c, g] = canvas(w, h + 12);
  g.fillStyle = '#1e1834'; g.fillRect(0, 12, w, h);
  if (k === 4) {
    // The haunted apartment tower, crowned with a stepped temple
    g.fillRect(2, 6, w - 4, 6); g.fillRect(4, 2, w - 8, 4); g.fillRect(Math.floor(w / 2) - 1, 0, 2, 2);
  }
  for (let y = 16; y < h + 8; y += 4) for (let x = 2; x < w - 2; x += 3) {
    if (hash(k * 131 + x * 7 + y) < 0.22) { g.fillStyle = '#e8c86a'; g.fillRect(x, y, 1, 2); }
  }
  scenery[key] = c;
  return c;
}

// Haunted houses and dead trees on the nearer hills.
function hillPiece(k) {
  const key = `hill${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(40, 34);
  const kind = Math.floor(hash(k + 1) * 3);
  g.fillStyle = '#16141e';
  if (kind === 0) {
    g.fillRect(6, 16, 26, 18); for (let i = 0; i < 9; i++) g.fillRect(19 - i * 1.5, 7 + i, i * 3 + 1, 1);
    g.fillRect(28, 6, 5, 12); for (let i = 0; i < 6; i++) g.fillRect(30 - i / 2, i, i + 1, 1);
    g.fillStyle = '#e8c86a'; g.fillRect(12, 20, 3, 3); g.fillStyle = '#b8ff7e'; g.fillRect(22, 24, 3, 3);
  } else if (kind === 1) {
    g.fillRect(19, 12, 2, 22); g.fillRect(13, 14, 7, 1); g.fillRect(12, 10, 1, 4); g.fillRect(20, 9, 8, 1); g.fillRect(27, 5, 1, 4); g.fillRect(17, 17, 1, 4); g.fillRect(14, 18, 3, 1);
  }
  scenery[key] = c;
  return c;
}

// A little ghost drifting across the sky.
function skyGhost(ctx, x, y, a) {
  ctx.globalAlpha = a;
  rect(ctx, x + 1, y, 4, 1, '#e8eef8'); rect(ctx, x, y + 1, 6, 4, '#e8eef8'); rect(ctx, x, y + 5, 1, 1, '#e8eef8'); rect(ctx, x + 2, y + 5, 2, 1, '#e8eef8'); rect(ctx, x + 5, y + 5, 1, 1, '#e8eef8');
  rect(ctx, x + 1, y + 2, 1, 1, '#120e1a'); rect(ctx, x + 4, y + 2, 1, 1, '#120e1a');
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

  // Stars, twinkling
  for (let i = 0; i < 60; i++) {
    const sx = Math.round((((hash(i + 200) * 1600 - camAX * 0.02) % bw) + bw) % bw);
    const sy = Math.round(groundY - 60 - hash(i + 300) * 260 - camAY * 0.02);
    rect(ctx, sx, sy, 1, 1, Math.sin(t * 2 + i) > 0.6 ? '#ffffff' : '#8a86b0');
  }

  // A full moon with a halo, and now and then a ghost crossing it
  const mx = Math.round(bw * 0.72 - camAX * 0.01);
  const my = Math.round(groundY - 180 - camAY * 0.02);
  ctx.globalAlpha = 0.12; disc(ctx, mx, my, 30, '#c8c4f0'); ctx.globalAlpha = 0.18; disc(ctx, mx, my, 24, '#d8d4f8'); ctx.globalAlpha = 1;
  disc(ctx, mx, my, 18, '#f4f0d8');
  disc(ctx, mx - 6, my - 4, 4, '#dcd8bc'); disc(ctx, mx + 5, my + 6, 3, '#dcd8bc'); disc(ctx, mx + 7, my - 7, 2, '#dcd8bc');
  for (let i = 0; i < 2; i++) {
    const k = ((t / 40 + i * 0.5) % 1);
    skyGhost(ctx, Math.round(-20 + k * (bw + 40)), Math.round(my - 20 + i * 40 + Math.sin(t + i * 2) * 6), 0.55);
  }

  // The city on the horizon, then haunted hills
  const cCount = 16;
  const cSpacing = ((WORLD_W / G) * 0.08) / cCount * 4;
  const cOff = Math.round(camAX * 0.08);
  for (let i = Math.floor((cOff - 40) / cSpacing); i * cSpacing - cOff < bw + 40; i++) {
    const k = ((i % cCount) + cCount) % cCount;
    const img = cityBlock(k);
    ctx.drawImage(img, Math.round(i * cSpacing - cOff), groundY - 20 - img.height);
    if (k === 4 && Math.sin(t * 0.7) > 0.4) {
      // A beam of light straight up from the temple on the tower
      ctx.globalAlpha = 0.25;
      rect(ctx, Math.round(i * cSpacing - cOff + img.width / 2) - 1, 0, 2, groundY - 20 - img.height, '#d8f0ff');
      ctx.globalAlpha = 1;
    }
  }
  for (let x = 0; x < bw; x++) {
    const wx = x + camAX * 0.2;
    const h = 22 + Math.round(Math.sin(wx * 0.013) * 7 + Math.sin(wx * 0.031) * 4);
    rect(ctx, x, groundY - h, 1, h, '#1c2226');
    rect(ctx, x, groundY - h, 1, 1, '#2a3236');
  }
  const hCount = 12;
  const hSpacing = ((WORLD_W / G) * 0.25) / hCount;
  const hOff = Math.round(camAX * 0.25);
  for (let i = Math.floor((hOff - 50) / hSpacing); i * hSpacing - hOff < bw + 50; i++) {
    const k = ((i % hCount) + hCount) % hCount;
    const x = Math.round(i * hSpacing - hOff + hash(k + 3) * hSpacing * 0.4);
    const img = hillPiece(k);
    ctx.drawImage(img, x, groundY - img.height - 12);
  }

  // Iron railings, leaning headstones and the odd well in front
  const count = 40;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    const x = Math.round(i * spacing - jOff + hash(k) * spacing * 0.5);
    const v = hash(k + 70);
    if (v < 0.4) {
      rect(ctx, x, groundY - 7, 24, 1, '#2a2834');
      for (let j = 0; j < 24; j += 3) { rect(ctx, x + j, groundY - 9, 1, 9, '#2a2834'); rect(ctx, x + j, groundY - 10, 1, 1, '#4a4858'); }
    } else if (v < 0.7) {
      for (let j = 0; j < 3; j++) {
        const hx = x + j * 8;
        const hh = 6 + Math.floor(hash(k * 3 + j) * 5);
        rect(ctx, hx, groundY - hh, 5, hh, '#3a3a48'); rect(ctx, hx + 1, groundY - hh - 1, 3, 1, '#3a3a48');
      }
    } else if (v < 0.78) {
      rect(ctx, x, groundY - 7, 12, 7, '#3a3a48'); rect(ctx, x + 1, groundY - 15, 1, 8, '#2a2226'); rect(ctx, x + 10, groundY - 15, 1, 8, '#2a2226'); rect(ctx, x - 1, groundY - 16, 14, 1, '#2a2226');
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + k); rect(ctx, x + 1, groundY - 8, 10, 1, '#c8f0ff'); ctx.globalAlpha = 1;
    }
  }
}

// Fog drifting low over the field, and will-o'-the-wisps bobbing about.
function weather(ctx, bw, bh, camAX) {
  const t = performance.now() / 1000;
  const n = Math.min(12, Math.floor((bw * bh) / 18000));
  for (let i = 0; i < n; i++) {
    const x = Math.round((((hash(i * 5 + 3) * (bw + 120) + t * (3 + hash(i) * 4) - camAX * 0.5) % (bw + 120)) + bw + 120) % (bw + 120)) - 60;
    const y = Math.round(bh * 0.35 + hash(i * 5 + 2) * bh * 0.6 + Math.sin(t * 0.3 + i) * 4);
    ctx.globalAlpha = 0.1;
    rect(ctx, x, y, 44, 4, '#c8d0e8'); rect(ctx, x + 8, y - 2, 24, 2, '#c8d0e8');
  }
  for (let i = 0; i < Math.min(6, n); i++) {
    const x = Math.round((((hash(i * 9 + 1) * bw + Math.sin(t * 0.5 + i) * 30 - camAX * 0.7) % bw) + bw) % bw);
    const y = Math.round(bh * 0.3 + hash(i * 9 + 4) * bh * 0.5 + Math.sin(t * 1.3 + i * 2) * 8);
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3 + i);
    rect(ctx, x, y, 2, 2, '#b8ff7e');
  }
  ctx.globalAlpha = 1;
}

// Rickety scaffolding with cobwebs in the corners.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = C.woodLight;
  for (let sx = x + 1; sx < x + w; sx += 7) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(x, sy, w, 1);
  ctx.fillStyle = 'rgba(232,238,248,0.5)';
  for (let i = 0; i < 5; i++) { ctx.fillRect(x + i, y + i, 1, 1); ctx.fillRect(x + w - 1 - i, y + i, 1, 1); }
  ctx.fillRect(x, y + 4, 5, 1); ctx.fillRect(x + 4, y, 1, 5); ctx.fillRect(x + w - 5, y + 4, 5, 1); ctx.fillRect(x + w - 5, y, 1, 5);
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  if (ghosts(b.faction)) {
    if (b.type === 'hq') {
      // A face appears at the attic window, now and then
      if (tick % 23 < 4) { rect(ctx, x + 12, y + 11, 3, 2, C.ghost); rect(ctx, x + 12, y + 11, 1, 1, C.O); rect(ctx, x + 14, y + 11, 1, 1, C.O); }
    } else if (b.type === 'turret') {
      if (tick % 17 === 0) { rect(ctx, x + 14, y + 16, 1, 1, '#3a2e3a'); rect(ctx, x + 18, y + 16, 1, 1, '#3a2e3a'); }
    } else if (b.type === 'mine') {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(ms / 400);
      rect(ctx, x + 8, y + 15, 16, 3, C.glow);
      ctx.globalAlpha = 1;
    } else if (b.type === 'workshop') {
      for (let i = 0; i < 6; i++) rect(ctx, x + 11 + i, y + 18 + ((tick + i) % 3), 1, 1, (tick + i) % 2 ? '#d8e4e8' : '#5a6870');
    } else if (b.type === 'airbase') {
      // Bats flitting round the belfry
      for (let i = 0; i < 2; i++) {
        const a = ms / 600 + i * 3;
        const bx = x + 46 + Math.round(Math.cos(a) * 14);
        const by = y + 4 + Math.round(Math.sin(a * 1.3) * 5);
        rect(ctx, bx, by, 1, 1, C.O); rect(ctx, bx - 1, by - (tick % 2), 1, 1, C.O); rect(ctx, bx + 1, by - (tick % 2), 1, 1, C.O);
      }
    } else if (b.type === 'barracks') {
      if (tick % 11 < 3) rect(ctx, x + 24, y + 23, 1, 1, C.pale);
    }
  } else if (b.type === 'turret') {
    // The emitter crackles
    if (tick % 3 === 0) { rect(ctx, x + 30, y + 5 + (tick % 4), 1, 1, C.protonCore); rect(ctx, x + 31, y + 6, 1, 1, C.protonBlue); }
  } else if (b.type === 'mine') {
    if (tick % 4 < 2) rect(ctx, x + 22, y + 11, 1, 1, C.slime); else rect(ctx, x + 24, y + 11, 1, 1, C.red);
  } else if (b.type === 'workshop') {
    if (tick % 5 === 0) { rect(ctx, x + 35, y + 1, 1, 1, C.protonBlue); rect(ctx, x + 42, y + 2, 1, 1, C.protonBlue); }
  } else if (b.type === 'airbase') {
    if (tick % 4 === 0) rect(ctx, x + 58, y - 1, 1, 1, C.red);
  } else if (b.type === 'barracks') {
    // The phone ringing off the hook
    if (tick % 6 < 3) { rect(ctx, x + 18, y + 20, 3, 2, C.red); rect(ctx, x + 17 + (tick % 2) * 5, y + 19, 1, 1, C.white); }
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  const spook = ghosts(p.faction);
  if (p.kind === 'bullet') {
    if (spook) {
      // A glob of ectoplasm
      rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.slimeDark);
      rect(ctx, x, y, 2, 2, C.slime);
    } else {
      // A crackling proton stream
      rect(ctx, x - dx * 3, y - dy * 3 + (Math.floor(performance.now() / 60) % 2), 1, 1, C.protonBlue);
      rect(ctx, x - dx, y - dy, 2, 1, C.proton);
      rect(ctx, x, y, 2, 1, C.protonCore);
    }
  } else if (p.kind === 'bomb') {
    rect(ctx, x - 2, y - 2, 5, 4, C.O);
    if (spook) {
      // A jack-o'-lantern
      rect(ctx, x - 1, y - 1, 3, 3, C.pumpkin); rect(ctx, x - 1, y, 1, 1, C.yellow); rect(ctx, x + 1, y, 1, 1, C.yellow);
    } else {
      // A ghost trap, falling
      rect(ctx, x - 1, y - 1, 3, 2, C.packLight); rect(ctx, x - 1, y + 1, 3, 1, C.yellow);
    }
  } else if (p.kind === 'lob') {
    if (spook) {
      // A cursed videotape, tumbling
      const f = Math.floor(performance.now() / 120) % 2;
      rect(ctx, x - 2, y - 1 - f, 5 - f * 2, 3 + f * 2, C.O); rect(ctx, x - 1, y - f, 3 - f * 2, 1 + f * 2, '#d8d4c8');
    } else {
      // A big blob of slime with a drip behind
      rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.slimeDark);
      rect(ctx, x - 2, y - 2, 4, 4, C.O); rect(ctx, x - 1, y - 1, 2, 2, C.slime); rect(ctx, x - 1, y - 1, 1, 1, C.slimeLight);
    }
  } else if (spook) {
    // A marshmallow, flung
    rect(ctx, x - 2, y - 2, 4, 4, C.O); rect(ctx, x - 1, y - 1, 2, 2, C.marsh);
  } else {
    rect(ctx, x - dx, y - dy, 1, 1, C.protonBlue);
    rect(ctx, x - 1, y - 1, 3, 3, C.O); rect(ctx, x - 1, y - 1, 2, 2, C.slimeLight);
  }
}

// Busters get slimed and lie flat; ghosts leave an empty sheet (or a puddle).
function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(16, 6);
  if (ghosts(e.f)) {
    if (e.type === 'heavy') {
      outlined(g, [[1, 3, 14, 2, C.slime], [4, 2, 7, 1, C.slime]], [[2, 3, 3, 1, C.slimeLight], [5, 4, 6, 1, t.main]]);
    } else {
      outlined(g, [[1, 3, 14, 2, C.ghost], [3, 1, 6, 2, C.ghost]], [[4, 2, 1, 1, C.O], [7, 2, 1, 1, C.O], [1, 4, 14, 1, C.ghostShade], [9, 3, 4, 1, t.main]]);
    }
  } else {
    outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, C.jump], [11, 3, 2, 2, C.jumpDark], [13, 4, 2, 1, C.boot]], [[1, 2, 3, 1, C.hair], [5, 3, 2, 1, t.main]]);
    g.fillStyle = C.slime; g.fillRect(2, 1, 4, 1); g.fillRect(6, 2, 3, 1); g.fillRect(3, 2, 1, 2); g.fillRect(8, 3, 1, 2);
  }
  return { c, ax: 8, ay: 5 };
}
const corpseKey = (e) => `ko-${e.type}-${sideOf(e.f)}`;

const BUSTERS = {
  soldier: 'Buster', heavy: 'Proton Heavy', scout: 'Kid Who Sees', engineer: 'Parapsychologist', sniper: 'Psychic Medium',
  jeep: 'Spook Wagon', tank: 'Containment Truck', artillery: 'Slime Mortar', helicopter: 'Spook Copter', bomber: 'Trap Blimp',
  hq: 'Old Firehouse', barracks: 'Recruiting Office', turret: 'Proton Tower', wall: 'Laser Fence', mine: 'Containment Unit',
  workshop: 'Gadget Garage', airbase: 'Rooftop Pad', bridge: 'Steel Gantry',
};

export default {
  id: 'ghost',
  name: 'Ghost Wars',
  sides: [
    {
      id: 'busters', name: 'The Busters', short: 'Busters',
      blurb: 'Beige jumpsuits, unlicensed nuclear backpacks, a psychic in pearls and a kid who sees dead people. Never cross the streams.',
      names: BUSTERS,
      win: 'We came, we saw, we billed them by the ghost.',
      lose: 'Who you gonna call? Not us, apparently.',
    },
    {
      id: 'ghosts', name: 'The Ghosts', short: 'Ghosts',
      blurb: 'Bedsheets with eyeholes, a slime glutton, a marshmallow giant, a cursed TV and a girl who climbs out of wells. They’re here.',
      names: {
        soldier: 'Sheet Ghost', heavy: 'Glutton', scout: 'Headless Horseman', engineer: 'Poltergeist', sniper: 'Girl in the Well',
        jeep: 'Phantom Hearse', tank: 'Marshmallow Giant', artillery: 'Cursed TV', helicopter: 'Clown Doll', bomber: 'Ghost Ship',
        hq: 'Haunted Mansion', barracks: 'Graveyard', turret: 'Grabbing Tree', wall: 'Headstone', mine: 'Cursed Well',
        workshop: 'Video Store', airbase: 'Bell Tower', bridge: 'Rotten Planks',
      },
      icons: { hq: '🏚️', barracks: '🪦', turret: '🌳', wall: '⚰️', mine: '🪣', workshop: '📼', airbase: '🔔', bridge: '🪵' },
      preview: ['soldier', 'heavy', 'tank', 'artillery'],
      win: 'They’re heeere. And they’re staying.',
      lose: 'Seven days? You lasted about seven minutes.',
    },
  ],
  palette,
  teamBase: COAT,
  roofBase: [0.4, 0.35, 0.5],
  soldier: buildSoldier,
  vehicle: { jeep: buildWagon, tank: buildTank, artillery: buildArtillery },
  aircraft: { helicopter: buildHeli, bomber: buildBomber },
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
  explosion: { rim: '#2e9a2a', body: '#6ae04a', core: '#e8ffb0', smoke: '#5a6a72', smoke2: '#8a9aa8' },
  corpse,
  corpseKey,
  debris: { '#7a4a24': '#7a7a88', '#5c361a': '#6ae04a' },
  minimap: { sky: '#1e163a', ground: '#3e3240', platform: '#7a7a88', bridge: '#5e4636', ramp: '#5e4636', surface: '#3a5440' },
  names: BUSTERS,
  spriteIcons: true,
  icons: { hq: '🚒', barracks: '📞', turret: '⚡', wall: '🚧', mine: '🔋', workshop: '🔧', airbase: '🚁', bridge: '🏗️' },
};
