// Steam Shogun: Japanese steampunk. Samurai tradition meets brass, boilers and
// airships under Mount Fuji, with cherry blossom drifting through the steam.
// Same units and rules, new paint.
import { WORLD_W, WORLD_H, TILE_SIZE } from '../config.js';
import { G, T, C, canvas, outlined, rect, disc, hash, team, sideOf } from '../pixel.js';

// ── Palette ────────────────────────────────────────────────────────────────
const palette = {
  O: '#1a1214',                        // outline
  skin: '#efc090', skinDark: '#c08a5a', hair: '#1a1416',
  boot: '#2a1e18', gun: '#3a2a22', gunLight: '#7a6450',
  yellow: '#f2c24a', yellowDark: '#b8862a', red: '#c8322a', redDark: '#7e1a16', white: '#f6f0e4',
  sky: ['#2a2450', '#3e2c5e', '#5e3666', '#8a4a66', '#c06a62', '#e8946a', '#f2b884'],
  brass: '#c8964a', brassLight: '#ecc272', brassDark: '#8a6028', copper: '#b86a3a', copperDark: '#7a3e22',
  lacquer: '#2a1a1c', lacquerRed: '#8e2a26', lacquerLight: '#4a3236',
  plaster: '#ece4d4', plasterDark: '#c8bca4', tile: '#3a3e4a', tileLight: '#5a6070', tileDark: '#24262e',
  stone: '#8a867e', stoneLight: '#aca89e', stoneDark: '#5e5a54',
  wood: '#7a4e30', woodLight: '#a8703e', woodDark: '#4e321e',
  steam: '#e8e4ea', sakura: '#f4a8c0', sakuraLight: '#fcd0dc', sakuraDark: '#d27896',
  fuji: '#6a6e98', snow: '#f2f0f6', vermilion: '#d23a26',
  grass: '#6a9a4a', grassLight: '#94c06a', grassDark: '#46703a',
  dirt: '#5a4434', dirtMid: '#4a3628', dirtDeep: '#3a2a20', pebble: '#8a7a6a', pebbleDark: '#2a1e16',
  fire: '#f28a30', glass: '#f6d27a', shadow: 'rgba(0,0,0,0.3)',
  // Sky pirates: sailcloth, patches, leather, iron, monkey fur and parrot feathers
  sail: '#ece0c2', sailDark: '#c4b48e', patchA: '#8a6a9e', patchB: '#6a9a5a', patchC: '#d0844a', patchD: '#5a7ab0',
  leather: '#6a4a30', leatherDark: '#46301e', iron: '#4a4852', ironLight: '#74727e',
  fur: '#8a5a34', furLight: '#d0a678', parrot: '#4ab04a', parrotDark: '#2a7a3a', lens: '#9ad0e0',
  gold: '#f6cc3a', goldDark: '#c08a1a', denim: '#4a5a7a', pink: '#e89aa0',
};
const ARMOUR = [0.22, 0.16, 0.17];

// ── Infantry ───────────────────────────────────────────────────────────────
// 20×17 canvas, feet at (8,16), facing right — the same frame as Classic.
function sashimono(parts, details, t) {
  // A team banner on a pole strapped to the back
  parts.push([3, 0, 1, 10, C.woodDark], [0, 0, 3, 5, t.main]);
  details.push([1, 1, 1, 3, t.light], [0, 0, 3, 1, C.white]);
}

function shogunSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'heavy') {
    // Steam samurai: lacquered armour, crested kabuto, boiler backpack, katana
    parts = [
      ...legs.map((l) => [...l, C.lacquer]), ...boots.map((b) => [...b, C.boot]),
      [1, 6, 4, 6, C.copper], [2, 2, 2, 4, C.brassDark],
      [4, 8, 9, 4, C.lacquerRed], [6, 3, 6, 5, C.skin], [5, 1, 8, 3, C.lacquer], [4, 3, 2, 2, C.lacquer], [12, 3, 2, 2, C.lacquer],
      [13, 4, 1, 7, C.white], [12, 9, 3, 1, C.brass],
    ];
    details = [
      [6, 0, 6, 1, C.brassLight], [5, 0, 1, 1, C.brass], [12, 0, 1, 1, C.brass], [10, 5, 1, 1, C.O],
      [6, 6, 6, 2, C.lacquerLight], [7, 7, 4, 1, C.brassDark], [4, 9, 9, 1, t.main], [4, 11, 9, 1, C.lacquer],
      [1, 8, 4, 1, C.brass], [2, 10, 2, 1, C.brassLight], [13, 10, 1, 1, C.lacquer],
    ];
  } else if (type === 'scout') {
    // Ninja: black garb, eye slit, brass goggles, team scarf, a short blade
    parts = [
      ...legs.map((l) => [...l, '#1e1a1e']), ...boots.map((b) => [...b, '#1e1a1e']),
      [5, 8, 7, 4, '#1e1a1e'], [6, 3, 6, 5, '#262026'], [11, 9, 4, 1, C.white],
    ];
    details = [
      [7, 4, 5, 2, C.skin], [8, 4, 1, 1, C.brass], [10, 4, 1, 1, C.brass], [8, 5, 1, 1, C.O], [10, 5, 1, 1, C.O],
      [7, 4, 5, 1, C.brassDark], [4, 7, 8, 1, t.main], [3, 8, 2, 2, t.main], [11, 9, 1, 1, C.brassDark],
    ];
  } else if (type === 'engineer') {
    // Tinkerer: leather apron, goggles up, a giant wrench
    parts = [
      ...legs.map((l) => [...l, C.lacquerLight]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, '#5a6a7a'], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair],
      [11, 9, 4, 1, C.brassDark], [14, 7, 3, 2, C.brass], [14, 10, 3, 1, C.brass],
    ];
    details = [
      [6, 2, 6, 1, C.brass], [7, 2, 1, 1, '#9ad0e0'], [10, 2, 1, 1, '#9ad0e0'], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark],
      [6, 9, 5, 3, C.wood], [6, 9, 5, 1, t.main], [15, 8, 1, 1, C.O],
    ];
  } else if (type === 'sniper') {
    // Teppo gunner: hakama, headband, long matchlock with a brass scope
    parts = [
      ...legs.map((l) => [...l, '#3a3a5a']), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, t.uni], [6, 3, 6, 5, C.skin], [6, 1, 6, 2, C.hair], [5, 0, 3, 2, C.hair],
      [10, 9, 9, 1, C.wood], [13, 8, 4, 1, C.brass],
    ];
    details = [
      [6, 3, 6, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [5, 8, 7, 1, t.main], [5, 11, 7, 1, '#3a3a5a'],
      [16, 8, 1, 1, '#9ad0e0'], [18, 9, 1, 1, C.brassDark],
    ];
  } else {
    // Ashigaru: jingasa hat, armour over a tunic, sashimono, brass steam rifle
    parts = [
      ...legs.map((l) => [...l, C.lacquerLight]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.lacquer], [6, 4, 6, 4, C.skin], [3, 3, 12, 1, C.lacquer], [5, 2, 8, 1, C.lacquer], [7, 1, 4, 1, C.lacquer],
      [11, 9, 7, 1, C.brass], [12, 10, 2, 2, C.copper],
    ];
    details = [
      [8, 1, 2, 1, t.main], [10, 5, 1, 1, C.O], [7, 7, 4, 1, C.skinDark], [5, 9, 7, 1, C.lacquerLight], [7, 8, 1, 4, t.main],
      [17, 8, 1, 1, C.steam], [12, 10, 1, 1, C.brassLight],
    ];
    sashimono(parts, details, t);
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// ── Steam vehicles & flyers ────────────────────────────────────────────────
function gearWheel(g, x, y, r, frame) {
  disc(g, x, y, r, C.O);
  disc(g, x, y, r - 1, C.brassDark);
  disc(g, x, y, r - 2, C.brass);
  g.fillStyle = C.O;
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + (frame ? 0.4 : 0);
    g.fillRect(x + Math.round(Math.cos(ang) * r), y + Math.round(Math.sin(ang) * r), 1, 1);
  }
  disc(g, x, y, Math.max(1, r - 4), C.copperDark);
  g.fillStyle = C.brassLight; g.fillRect(x, y, 1, 1);
}

// Rickshaw: a steam-driven rickshaw — boiler and chimney up front, a hooded seat.
function shogunRickshaw(f, frame) {
  const t = team(f);
  const [c, g] = canvas(26, 17);
  outlined(g, [
    [3, 5, 10, 6, C.lacquerRed], [2, 1, 9, 4, t.main], [14, 6, 7, 5, C.copper], [18, 1, 2, 5, C.brassDark],
    [5, 3, 4, 3, C.lacquer], [5, 1, 4, 2, C.lacquer], [20, 8, 4, 1, C.brassDark],
  ], [
    [2, 1, 9, 1, t.light], [3, 4, 9, 1, t.dark], [6, 4, 2, 1, C.skin], [14, 6, 7, 1, C.brassLight], [15, 8, 2, 2, C.brassLight],
    [18, 1, 2, 1, C.brassLight], [3, 9, 10, 1, C.brassDark], [23, 8, 1, 1, C.glass],
  ]);
  gearWheel(g, 8, 12, 4, frame);
  gearWheel(g, 20, 13, 3, frame);
  return { c, ax: 12, ay: 16 };
}

// Kabuto tank: a rhinoceros-beetle crawler — lacquered shell, horn cannon,
// clanking legs that step between frames, a chimney.
function shogunBeetle(f, frame) {
  const t = team(f);
  const [c, g] = canvas(36, 20);
  const legs = frame
    ? [[6, 14, 2, 5], [12, 14, 2, 4], [18, 14, 2, 5], [24, 14, 2, 4]]
    : [[5, 14, 2, 4], [11, 14, 2, 5], [19, 14, 2, 4], [25, 14, 2, 5]];
  outlined(g, [
    ...legs.map((l) => [...l, C.brassDark]),
    [3, 7, 26, 8, C.lacquer], [6, 4, 18, 4, C.lacquer], [28, 9, 5, 4, C.lacquerRed], [31, 4, 2, 6, C.brass], [32, 2, 3, 3, C.brass],
    [9, 1, 2, 4, C.copperDark],
  ], [
    [6, 4, 18, 1, C.lacquerLight], [3, 7, 26, 1, C.lacquerLight], [15, 4, 1, 11, C.brassDark],
    [4, 11, 24, 1, t.main], [6, 13, 20, 1, C.brass], [30, 10, 1, 1, C.glass], [33, 2, 2, 1, C.brassLight],
    [10, 8, 3, 2, C.brass], [19, 8, 3, 2, C.brass], [9, 1, 2, 1, C.copper],
  ]);
  return { c, ax: 16, ay: 19 };
}

// Hanabi mortar: a wheeled firework mortar with a rack of rockets.
function shogunMortar(f, frame) {
  const t = team(f);
  const [c, g] = canvas(28, 19);
  outlined(g, [
    [2, 10, 20, 3, C.wood], [9, 3, 6, 8, C.copper], [11, 0, 6, 5, C.copper], [2, 5, 5, 5, C.lacquerRed],
  ], [
    [2, 10, 20, 1, C.woodLight], [9, 5, 6, 1, C.brass], [9, 8, 6, 1, C.brass], [11, 0, 6, 1, C.O], [12, 1, 4, 1, C.brassDark],
    [3, 6, 1, 3, t.main], [5, 6, 1, 3, C.yellow], [3, 5, 1, 1, C.red], [5, 5, 1, 1, C.red], [10, 11, 6, 1, t.main],
  ]);
  gearWheel(g, 7, 15, 3, frame);
  gearWheel(g, 18, 15, 3, frame);
  return { c, ax: 12, ay: 18 };
}

// Tengu flyer: a crow-masked pilot on a brass airframe (wings flap and the
// propeller spins live).
function shogunTengu(f) {
  const t = team(f);
  const [c, g] = canvas(30, 16);
  outlined(g, [
    [6, 7, 16, 3, C.brassDark], [21, 6, 4, 4, C.lacquer], [25, 7, 3, 2, C.lacquerRed], [12, 3, 5, 5, t.main], [12, 1, 5, 3, C.lacquer],
    [16, 2, 3, 1, C.lacquerRed], [2, 6, 5, 3, C.brassDark], [10, 10, 1, 3, C.brassDark], [18, 10, 1, 3, C.brassDark],
  ], [
    [6, 7, 16, 1, C.brassLight], [13, 2, 1, 1, C.yellow], [12, 5, 5, 1, t.light], [8, 9, 12, 1, C.copper],
    [22, 7, 2, 2, C.brass], [3, 7, 3, 1, C.brass],
  ]);
  return { c, ax: 15, ay: 13 };
}

// Koi airship: a zeppelin painted as a koi carp, with a gondola below.
function shogunKoi(f) {
  const t = team(f);
  const [c, g] = canvas(46, 21);
  outlined(g, [
    [8, 3, 30, 10, C.white], [37, 5, 4, 6, C.white], [3, 4, 6, 3, C.white], [1, 2, 4, 4, t.main], [1, 9, 4, 4, t.main],
    [16, 13, 14, 4, C.lacquer], [20, 0, 6, 3, t.main],
  ], [
    [12, 4, 7, 4, t.main], [24, 6, 6, 3, t.main], [30, 3, 5, 3, C.red], [14, 9, 6, 2, C.red], [38, 6, 1, 1, C.O], [39, 9, 2, 1, C.sakuraDark],
    [8, 12, 30, 1, C.plasterDark], [17, 14, 2, 1, C.glass], [21, 14, 2, 1, C.glass], [25, 14, 2, 1, C.glass],
    [16, 13, 14, 1, C.brass], [21, 1, 4, 1, t.light],
  ]);
  return { c, ax: 23, ay: 16 };
}

// ── Sky Pirates ────────────────────────────────────────────────────────────
// A rowdy crew of goggled air-pirates: patched coats, eye patches, tricorns
// with little propellers, a clockwork parrot and a monkey with a spanner.
const pirate = (f) => sideOf(f) === 'pirates';

function tricorn(parts, details, t, x = 4) {
  // Tricorn hat with a tiny brass propeller on top and a team band
  parts.push([x, 3, 10, 1, C.lacquer], [x + 2, 1, 6, 2, C.lacquer], [x + 4, 0, 1, 1, C.brassDark]);
  details.push([x + 2, 2, 6, 1, t.main], [x + 1, 0, 2, 1, C.brassLight], [x + 5, 0, 2, 1, C.brassLight], [x, 3, 1, 1, C.lacquerLight], [x + 9, 3, 1, 1, C.lacquerLight]);
}

function pirateSoldier(type, f, frame) {
  const t = team(f);
  const [c, g] = canvas(20, 17);
  const legs = frame ? [[6, 12, 2, 3], [9, 12, 2, 3]] : [[5, 12, 2, 3], [10, 12, 2, 3]];
  const boots = frame ? [[5, 15, 3, 1], [9, 15, 3, 1]] : [[4, 15, 3, 1], [10, 15, 3, 1]];
  let parts;
  let details;
  if (type === 'heavy') {
    // Boiler-Belly Brute: a riveted boiler for a tummy, tiny goggled head,
    // a smokestack poking out the back and a giant spanner
    parts = [
      ...legs.map((l) => [...l, C.leatherDark]), ...boots.map((b) => [...b, C.boot]),
      [1, 1, 2, 6, C.iron], [3, 6, 11, 7, C.copper], [7, 1, 5, 5, C.skin], [6, 0, 7, 2, t.main],
      [13, 7, 3, 3, C.skin], [16, 2, 2, 11, C.iron], [15, 1, 4, 2, C.iron],
    ];
    details = [
      [1, 1, 2, 1, C.ironLight], [3, 6, 11, 1, C.brassLight], [3, 11, 11, 1, t.main], [3, 12, 11, 1, C.copperDark],
      [5, 8, 1, 1, C.brassLight], [12, 8, 1, 1, C.brassLight], [5, 10, 1, 1, C.brassLight], [12, 10, 1, 1, C.brassLight],
      [7, 7, 4, 4, C.white], [8, 8, 1, 2, C.red], [9, 9, 1, 1, C.O],
      [8, 2, 4, 1, C.brass], [10, 2, 1, 1, C.lens], [8, 4, 4, 1, C.hair], [6, 0, 7, 1, t.light],
      [16, 1, 2, 1, C.ironLight], [16, 3, 1, 1, C.O],
    ];
  } else if (type === 'scout') {
    // Robo-Parrot: a clockwork parrot on brass stilts, wind-up key in its back,
    // a goggle eye and a team-colour wing
    const pl = frame ? [[8, 11, 1, 4], [11, 11, 1, 4]] : [[7, 11, 1, 4], [12, 11, 1, 4]];
    const pf = frame ? [[7, 15, 3, 1], [10, 15, 3, 1]] : [[6, 15, 3, 1], [11, 15, 3, 1]];
    parts = [
      ...pl.map((l) => [...l, C.brass]), ...pf.map((p) => [...p, C.brassDark]),
      [1, 9, 5, 2, t.main], [6, 5, 7, 6, C.parrot], [10, 2, 5, 4, C.parrot], [15, 3, 2, 2, C.gold], [11, 0, 2, 2, C.red], [3, 4, 1, 3, C.brassDark],
    ];
    details = [
      [2, 4, 3, 1, C.brassLight], [2, 6, 3, 1, C.brassLight], [16, 5, 1, 1, C.goldDark],
      [12, 3, 2, 2, C.brass], [13, 3, 1, 1, C.O], [6, 6, 5, 3, t.main], [6, 8, 5, 1, t.dark], [7, 6, 4, 1, t.light],
      [11, 9, 2, 2, C.parrotDark], [8, 10, 3, 1, C.brassDark], [9, 10, 1, 1, C.brassLight], [10, 2, 3, 1, '#7ad06a'], [1, 9, 5, 1, t.light],
    ];
  } else if (type === 'engineer') {
    // Grease Monkey: a monkey in team overalls, goggles up, tail curled, spanner out
    parts = [
      ...legs.map((l) => [...l, C.fur]), ...boots.map((b) => [...b, C.fur]),
      [1, 5, 1, 7, C.fur], [2, 11, 3, 1, C.fur], [5, 8, 7, 4, C.denim], [6, 3, 6, 5, C.fur], [5, 4, 1, 2, C.furLight],
      [11, 9, 4, 1, C.iron], [14, 7, 3, 2, C.iron], [14, 10, 3, 1, C.iron],
    ];
    details = [
      [9, 4, 3, 4, C.furLight], [10, 4, 1, 1, C.O], [10, 6, 2, 1, C.fur], [9, 7, 2, 1, C.O],
      [6, 2, 6, 1, C.brass], [7, 2, 1, 1, C.lens], [10, 2, 1, 1, C.lens], [6, 3, 6, 1, C.fur],
      [5, 8, 7, 1, t.main], [7, 8, 1, 4, t.main], [10, 8, 1, 4, t.main], [7, 10, 1, 1, C.brassLight], [15, 8, 1, 1, C.O], [14, 7, 3, 1, C.ironLight],
    ];
  } else if (type === 'sniper') {
    // Spyglass Sharpshooter: long team coat, a feathered hat, a brass monocle
    // and a long rifle with a spyglass for a scope
    parts = [
      ...legs.map((l) => [...l, C.leatherDark]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 5, t.uni], [6, 4, 6, 4, C.skin], [4, 3, 10, 1, C.leather], [6, 1, 6, 2, C.leather], [2, 0, 5, 1, C.red],
      [10, 9, 9, 1, C.wood], [12, 7, 6, 2, C.brass],
    ];
    details = [
      [6, 2, 6, 1, t.main], [2, 0, 2, 1, C.white], [10, 5, 2, 2, C.brassLight], [10, 5, 1, 1, C.O], [8, 7, 4, 1, C.hair],
      [5, 8, 7, 1, t.main], [5, 10, 1, 3, t.uniDark], [8, 9, 1, 1, C.brassLight], [8, 11, 1, 1, C.brassLight],
      [17, 7, 1, 2, C.lens], [12, 7, 6, 1, C.brassLight], [14, 8, 1, 1, C.brassDark], [18, 9, 1, 1, C.iron],
    ];
  } else {
    // Deckhand: striped team shirt, eye patch, propeller tricorn, a blunderbuss
    parts = [
      ...legs.map((l) => [...l, C.leather]), ...boots.map((b) => [...b, C.boot]),
      [5, 8, 7, 4, C.white], [6, 4, 6, 4, C.skin], [10, 9, 6, 1, C.wood], [15, 8, 3, 3, C.brass],
    ];
    details = [
      [5, 9, 7, 1, t.main], [5, 11, 7, 1, t.main], [10, 5, 2, 1, C.O], [6, 4, 4, 1, C.O], [8, 7, 3, 1, C.skinDark],
      [17, 8, 1, 3, C.brassDark], [15, 8, 2, 1, C.brassLight], [11, 10, 1, 1, C.woodDark],
    ];
    tricorn(parts, details, t);
  }
  outlined(g, parts, details);
  return { c, ax: 8, ay: 16 };
}

// Cog-and-crossed-spanners emblem (5×5) for flags, sails and signs.
function emblem(g, x, y, col = C.white) {
  g.fillStyle = col;
  for (let i = 0; i < 5; i++) { g.fillRect(x + i, y + i, 1, 1); g.fillRect(x + 4 - i, y + i, 1, 1); }
  g.fillRect(x, y, 2, 1); g.fillRect(x + 3, y, 2, 1); g.fillRect(x, y + 4, 2, 1); g.fillRect(x + 3, y + 4, 2, 1);
  g.fillStyle = C.brassDark; g.fillRect(x + 1, y + 1, 3, 3);
  g.fillStyle = C.brassLight; g.fillRect(x + 2, y + 1, 1, 1); g.fillRect(x + 1, y + 2, 1, 1); g.fillRect(x + 3, y + 2, 1, 1); g.fillRect(x + 2, y + 3, 1, 1);
  g.fillStyle = C.O; g.fillRect(x + 2, y + 2, 1, 1);
}

// Steam Hog: a pig-nosed steam motorbike with a goggled rider and a team scarf.
function pirateHog(f, frame) {
  const t = team(f);
  const [c, g] = canvas(30, 18);
  outlined(g, [
    [2, 8, 6, 2, C.iron], [7, 9, 17, 3, C.iron], [9, 5, 11, 4, C.copper], [21, 5, 5, 5, C.pink], [21, 4, 1, 1, C.pink], [26, 6, 2, 3, C.pink],
    [12, 3, 5, 3, C.leather], [12, 0, 4, 3, C.skin], [16, 3, 5, 1, C.leather], [14, 6, 4, 3, C.leatherDark], [7, 2, 5, 1, t.main], [20, 2, 1, 4, C.brass],
  ], [
    [9, 5, 11, 1, C.brassLight], [9, 7, 11, 1, t.main], [11, 6, 1, 1, C.brassLight], [17, 6, 1, 1, C.brassLight],
    [12, 0, 4, 1, C.leather], [14, 1, 2, 1, C.brass], [15, 1, 1, 1, C.lens], [7, 2, 2, 1, t.light],
    [23, 6, 1, 1, C.O], [26, 7, 1, 1, C.O], [27, 7, 1, 1, '#c87078'], [24, 9, 1, 1, C.white], [21, 5, 5, 1, '#f4c0c4'],
    [2, 8, 1, 2, C.ironLight], [20, 2, 1, 1, C.brassLight],
  ]);
  gearWheel(g, 7, 13, 4, frame);
  gearWheel(g, 23, 13, 4, frame);
  return { c, ax: 15, ay: 17 };
}

// Land Galleon: a pirate ship on wheels — patched sail with the cog-and-spanners
// emblem, a team pennant, cannon ports and a bowsprit.
function pirateGalleon(f, frame) {
  const t = team(f);
  const [c, g] = canvas(38, 22);
  outlined(g, [
    [14, 1, 1, 11, C.woodDark], [26, 3, 1, 9, C.woodDark], [15, 0, 5, 2, t.main], [27, 2, 4, 2, t.main],
    [9, 3, 11, 7, C.sail], [22, 5, 9, 5, C.sail],
    [1, 7, 7, 5, C.wood], [3, 11, 30, 5, C.wood], [31, 9, 4, 3, C.wood], [7, 16, 23, 2, C.woodDark], [34, 8, 4, 1, C.woodDark],
  ], [
    [9, 3, 11, 1, C.white], [9, 9, 11, 1, C.sailDark], [19, 4, 1, 5, C.sailDark], [22, 5, 9, 1, C.white], [22, 9, 9, 1, C.sailDark], [30, 6, 1, 3, C.sailDark],
    [10, 7, 3, 2, C.patchA], [27, 7, 3, 2, C.patchB], [15, 0, 5, 1, t.light], [27, 2, 4, 1, t.light],
    [1, 7, 7, 1, C.woodLight], [3, 11, 30, 1, C.woodLight], [31, 9, 4, 1, C.woodLight], [3, 13, 30, 1, t.main], [7, 16, 23, 1, C.wood],
    [3, 9, 1, 1, C.glass], [6, 9, 1, 1, C.glass],
  ]);
  emblem(g, 12, 4);
  emblem(g, 23, 5);
  g.fillStyle = C.O;
  for (const x of [8, 15, 22]) g.fillRect(x, 14, 3, 2);
  g.fillStyle = C.iron;
  for (const x of [9, 16, 23]) g.fillRect(x, 15, 1, 1);
  g.fillStyle = C.O; g.fillRect(33, 12, 5, 3); g.fillStyle = C.iron; g.fillRect(34, 13, 4, 1);
  for (const x of [8, 15, 22, 29]) gearWheel(g, x, 18, 3, frame);
  return { c, ax: 18, ay: 21 };
}

// Broadside Wagon: a cart hauling a stubby great-cannon, a grog barrel and a team flag.
function pirateWagon(f, frame) {
  const t = team(f);
  const [c, g] = canvas(32, 19);
  outlined(g, [
    [2, 0, 1, 9, C.woodDark], [3, 0, 5, 4, t.main],
    [3, 9, 23, 3, C.wood], [4, 4, 5, 5, C.wood], [12, 6, 7, 4, C.iron], [17, 4, 5, 4, C.iron], [21, 2, 4, 4, C.iron], [24, 1, 2, 5, C.brass],
  ], [
    [3, 0, 5, 1, t.light], [3, 9, 23, 1, C.woodLight], [4, 5, 5, 1, t.main], [4, 7, 5, 1, t.main], [6, 4, 1, 5, C.woodLight],
    [12, 6, 7, 1, C.ironLight], [17, 4, 5, 1, C.ironLight], [21, 2, 3, 1, C.ironLight], [24, 1, 1, 5, C.brassLight], [25, 2, 1, 3, C.O],
    [14, 8, 2, 1, C.brass], [10, 10, 14, 1, t.main],
  ]);
  for (const [x, y] of [[27, 10], [29, 10], [28, 8]]) { disc(g, x, y, 1, C.O); g.fillStyle = C.ironLight; g.fillRect(x, y, 1, 1); }
  gearWheel(g, 8, 15, 3, frame);
  gearWheel(g, 21, 15, 3, frame);
  return { c, ax: 15, ay: 18 };
}

// Gyro-Gull: a seagull-painted gyrocopter with a goggled pilot (rotor and
// pusher prop spin live).
function pirateGyro(f) {
  const t = team(f);
  const [c, g] = canvas(32, 16);
  outlined(g, [
    [1, 4, 3, 5, t.main], [3, 8, 6, 1, C.brassDark], [15, 1, 1, 6, C.iron], [8, 7, 16, 4, C.white], [24, 8, 4, 2, C.gold],
    [17, 3, 4, 4, C.skin], [17, 2, 4, 2, C.leather], [13, 5, 5, 1, t.main], [12, 11, 1, 2, C.iron], [20, 11, 1, 2, C.iron], [9, 13, 14, 1, C.iron],
  ], [
    [1, 4, 3, 1, t.light], [14, 1, 3, 1, C.brass], [8, 7, 16, 1, C.steam], [8, 9, 16, 1, t.main], [10, 10, 12, 1, '#b8b4c0'],
    [22, 8, 1, 1, C.O], [26, 9, 2, 1, C.goldDark], [19, 4, 2, 1, C.brass], [20, 4, 1, 1, C.lens], [18, 6, 2, 1, C.skinDark], [9, 13, 14, 1, C.ironLight],
  ]);
  return { c, ax: 16, ay: 13 };
}

// Patchwork Zeppelin: a much-mended gasbag with a little ship hanging under it.
function pirateZeppelin(f) {
  const t = team(f);
  const [c, g] = canvas(48, 21);
  outlined(g, [
    [2, 1, 5, 4, t.main], [2, 10, 5, 4, t.main], [6, 3, 34, 9, C.sail], [9, 2, 28, 1, C.sail], [9, 12, 28, 1, C.sail], [40, 4, 3, 7, C.sail], [43, 6, 1, 3, C.sail],
    [15, 14, 18, 3, C.wood], [17, 17, 14, 1, C.woodDark],
  ], [
    [2, 1, 5, 1, t.light], [9, 2, 28, 1, C.white], [9, 12, 28, 1, C.sailDark], [6, 11, 34, 1, C.sailDark],
    [10, 4, 6, 4, C.patchA], [25, 8, 6, 3, C.patchB], [25, 4, 4, 2, C.patchC], [14, 9, 4, 2, C.patchD],
    [20, 3, 1, 9, t.main], [21, 3, 1, 9, t.dark],
    [15, 14, 18, 1, C.woodLight], [15, 16, 18, 1, t.main], [18, 15, 1, 1, C.glass], [22, 15, 1, 1, C.glass], [26, 15, 1, 1, C.glass],
    [16, 13, 1, 1, C.O], [31, 13, 1, 1, C.O], [41, 6, 1, 1, C.O],
  ]);
  // Stitches around the patches
  g.fillStyle = C.O;
  for (const [x, y, w] of [[10, 3, 6], [10, 8, 6], [25, 7, 6], [25, 3, 4], [14, 8, 4]]) for (let i = 0; i < w; i += 2) g.fillRect(x + i, y, 1, 1);
  emblem(g, 33, 5);
  return { c, ax: 24, ay: 16 };
}

const buildSoldier = (type, f, frame) => (pirate(f) ? pirateSoldier : shogunSoldier)(type, f, frame);
const buildRickshaw = (f, frame) => (pirate(f) ? pirateHog : shogunRickshaw)(f, frame);
const buildBeetle = (f, frame) => (pirate(f) ? pirateGalleon : shogunBeetle)(f, frame);
const buildMortar = (f, frame) => (pirate(f) ? pirateWagon : shogunMortar)(f, frame);
const buildTengu = (f) => (pirate(f) ? pirateGyro : shogunTengu)(f);
const buildKoi = (f) => (pirate(f) ? pirateZeppelin : shogunKoi)(f);

// Flapping brass wings and a spinning prop for the tengu; a wagging tail and
// propellers for the koi.
function rotor(ctx, u, x, y) {
  const tick = Math.floor(performance.now() / 70);
  const s = u.facing;
  if (pirate(u.faction)) {
    if (u.type === 'helicopter') {
      // Gyro rotor above the mast and a pusher prop behind the tail
      const mx = s > 0 ? x - 1 : x;
      if (tick % 2) rect(ctx, mx - 14, y - 13, 29, 1, C.ironLight);
      else { rect(ctx, mx - 6, y - 13, 13, 1, C.iron); rect(ctx, mx, y - 14, 1, 1, C.brass); }
      const px = s > 0 ? x - 16 : x + 15;
      if (tick % 2) rect(ctx, px, y - 9, 1, 5, C.ironLight); else rect(ctx, px, y - 7, 1, 2, C.iron);
    } else {
      // Tail propeller and a fluttering pennant
      const px = s > 0 ? x - 25 : x + 24;
      if (tick % 2) rect(ctx, px, y - 12, 1, 7, C.ironLight); else rect(ctx, px, y - 9, 1, 2, C.iron);
    }
    return;
  }
  if (u.type === 'helicopter') {
    const up = Math.floor(performance.now() / 140) % 2 === 0;
    for (let i = 0; i < 10; i++) {
      const lift = up ? Math.round((10 - i) * 0.8) + 1 : 1;
      const px = x - (2 + i) * s;
      rect(ctx, px, y - 7 - lift, 1, lift + 1, i % 3 ? C.lacquer : C.brass);
    }
    const px = s > 0 ? x - 15 : x + 14;
    rect(ctx, px, y - 7 - (tick % 2 ? 2 : 0), 1, tick % 2 ? 5 : 2, C.steam);
  } else {
    const wag = tick % 4 < 2 ? 0 : 1;
    const tx = s > 0 ? x - 23 : x + 22;
    rect(ctx, tx, y - 13 + wag, 1, 2, C.steam);
    for (const dx of [-8, 8]) rect(ctx, x + dx, y + 1 - (tick % 2), 1, tick % 2 ? 3 : 1, C.steam);
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
// Curved tiled roof with upturned eaves and gold fish finials.
function roof(g, cx, y, w, h) {
  for (let i = 0; i < h; i++) {
    const half = Math.round(((i + 1) / h) * (w / 2) * 0.7 + (w / 2) * 0.3);
    g.fillStyle = C.O; g.fillRect(cx - half - 1, y + i, half * 2 + 2, 1);
    g.fillStyle = i % 2 ? C.tileDark : C.tile; g.fillRect(cx - half, y + i, half * 2, 1);
  }
  const half = Math.round(w / 2);
  g.fillStyle = C.O; g.fillRect(cx - half - 2, y + h - 3, 2, 3); g.fillRect(cx + half, y + h - 3, 2, 3);
  g.fillStyle = C.tile; g.fillRect(cx - half - 1, y + h - 2, 1, 2); g.fillRect(cx + half, y + h - 2, 1, 2);
  g.fillStyle = C.tileLight; g.fillRect(cx - Math.round(w * 0.15), y, Math.round(w * 0.3), 1);
  g.fillStyle = C.yellow; g.fillRect(cx - Math.round(w * 0.15) - 1, y - 2, 2, 2); g.fillRect(cx + Math.round(w * 0.15) - 1, y - 2, 2, 2);
}

function ishigaki(g, x, y, w, h) {
  // Sloped stone base: rows of fitted stones
  for (let r = 0; r < h; r++) {
    const inset = Math.round((h - r) * 0.25);
    g.fillStyle = C.O; g.fillRect(x + inset - 1, y + r, w - inset * 2 + 2, 1);
    g.fillStyle = C.stone; g.fillRect(x + inset, y + r, w - inset * 2, 1);
  }
  g.fillStyle = C.stoneDark;
  for (let yy = y + 3; yy < y + h; yy += 4) {
    g.fillRect(x, yy, w, 1);
    for (let xx = x + ((yy / 4) % 2 ? 3 : 6); xx < x + w; xx += 7) g.fillRect(xx, yy - 3, 1, 3);
  }
  g.fillStyle = C.stoneLight;
  for (let yy = y + 1; yy < y + h; yy += 4) g.fillRect(x + 2, yy, w - 4, 1);
}

function gear(g, cx, cy, r) {
  disc(g, cx, cy, r + 1, C.O);
  disc(g, cx, cy, r, C.brassDark);
  g.fillStyle = C.brass;
  for (let a = 0; a < 8; a++) { const ang = (a / 8) * Math.PI * 2; g.fillRect(cx + Math.round(Math.cos(ang) * r) - 1, cy + Math.round(Math.sin(ang) * r) - 1, 2, 2); }
  disc(g, cx, cy, Math.max(1, r - 2), C.brass);
  disc(g, cx, cy, 1, C.copperDark);
}

function chimney(g, x, y, h) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 5, h + 1);
  g.fillStyle = C.copper; g.fillRect(x, y, 3, h);
  g.fillStyle = C.brass; g.fillRect(x - 1, y, 5, 1);
  g.fillStyle = C.copperDark; g.fillRect(x + 2, y + 1, 1, h - 1);
}

function noren(g, x, y, w, t) {
  g.fillStyle = C.O; g.fillRect(x - 1, y - 1, w + 2, 6);
  g.fillStyle = t.main; g.fillRect(x, y, w, 5);
  g.fillStyle = t.dark; for (let i = x + 3; i < x + w; i += 4) g.fillRect(i, y + 1, 1, 4);
  g.fillStyle = C.white; g.fillRect(x + Math.floor(w / 2) - 1, y + 1, 2, 2);
}

const BUILD = {
  hq(g, t) {
    // Steam castle: ishigaki base, white plaster tiers, tiled roofs, brass
    // smokestacks and a great gear
    ishigaki(g, 2, 34, 60, 14);
    outlined(g, [[10, 24, 44, 11, C.plaster]], [[10, 24, 44, 1, C.white], [10, 33, 44, 1, C.plasterDark]]);
    roof(g, 32, 18, 54, 7);
    outlined(g, [[18, 11, 28, 8, C.plaster]], [[18, 11, 28, 1, C.white]]);
    roof(g, 32, 5, 36, 7);
    for (const x of [14, 22, 40, 48]) { g.fillStyle = C.O; g.fillRect(x, 27, 3, 4); g.fillStyle = C.glass; g.fillRect(x + 1, 28, 1, 2); }
    for (const x of [22, 40]) { g.fillStyle = C.O; g.fillRect(x, 13, 3, 4); g.fillStyle = C.glass; g.fillRect(x + 1, 14, 1, 2); }
    gear(g, 32, 29, 4);
    outlined(g, [[28, 38, 8, 10, C.lacquer]], [[31, 38, 1, 10, C.O], [28, 38, 8, 1, C.brass]]);
    chimney(g, 6, 22, 12);
    chimney(g, 55, 20, 14);
    // Team mon on the keep and banners
    disc(g, 32, 14, 2, C.O); disc(g, 32, 14, 1, t.main);
    for (const x of [3, 59]) { g.fillStyle = C.O; g.fillRect(x - 1, 33, 4, 10); g.fillStyle = t.main; g.fillRect(x, 34, 2, 8); g.fillStyle = C.white; g.fillRect(x, 34, 2, 1); }
  },
  barracks(g, t) {
    // Dojo: wooden hall with shoji panels, curved roof, team noren at the door
    outlined(g, [[3, 14, 42, 18, C.wood]], [[3, 14, 42, 1, C.woodLight]]);
    for (const x of [6, 13, 30, 37]) {
      g.fillStyle = C.O; g.fillRect(x - 1, 17, 7, 10);
      g.fillStyle = C.plaster; g.fillRect(x, 18, 5, 8);
      g.fillStyle = C.plasterDark; g.fillRect(x + 2, 18, 1, 8); g.fillRect(x, 21, 5, 1); g.fillRect(x, 24, 5, 1);
    }
    roof(g, 24, 6, 46, 8);
    outlined(g, [[20, 20, 8, 12, C.lacquer]], []);
    noren(g, 19, 18, 10, t);
    chimney(g, 40, 5, 9);
  },
  turret(g, t) {
    // Yagura: a timber watchtower on stone with a steam gatling
    ishigaki(g, 5, 22, 22, 10);
    outlined(g, [[8, 10, 16, 12, C.plaster]], [[8, 10, 16, 1, C.white], [8, 17, 16, 1, C.woodDark]]);
    roof(g, 16, 4, 22, 6);
    outlined(g, [[22, 12, 8, 4, C.brassDark]], [[22, 12, 8, 1, C.brass], [29, 13, 1, 1, C.O], [29, 15, 1, 1, C.O], [23, 14, 3, 1, C.copper]]);
    g.fillStyle = C.O; g.fillRect(12, 13, 3, 3); g.fillStyle = t.main; g.fillRect(13, 14, 1, 1);
  },
  wall(g, t) {
    // Ishigaki stone base with a white plaster wall and tiled cap
    ishigaki(g, 0, 18, 16, 14);
    outlined(g, [[1, 7, 14, 11, C.plaster]], [[1, 7, 14, 1, C.white], [1, 16, 14, 1, C.plasterDark]]);
    g.fillStyle = C.O; g.fillRect(0, 3, 16, 4);
    g.fillStyle = C.tile; g.fillRect(0, 4, 16, 2);
    g.fillStyle = C.tileLight; g.fillRect(0, 4, 16, 1);
    g.fillStyle = C.O; g.fillRect(6, 10, 4, 4);
    g.fillStyle = t.main; g.fillRect(7, 11, 2, 2);
  },
  mine(g, t) {
    // Boiler: a riveted copper boiler with gauges, pipes, a chimney and coal
    outlined(g, [[4, 12, 22, 16, C.copper], [8, 28, 14, 4, C.stoneDark]], [[4, 12, 22, 1, C.brassLight], [4, 26, 22, 1, C.copperDark]]);
    g.fillStyle = C.brassLight;
    for (let x = 6; x < 26; x += 4) { g.fillRect(x, 14, 1, 1); g.fillRect(x, 24, 1, 1); }
    disc(g, 11, 19, 3, C.O); disc(g, 11, 19, 2, C.white); g.fillStyle = C.red; g.fillRect(11, 18, 1, 2);
    disc(g, 20, 19, 3, C.O); disc(g, 20, 19, 2, C.white); g.fillStyle = C.O; g.fillRect(20, 19, 2, 1);
    chimney(g, 21, 2, 11);
    g.fillStyle = C.O; g.fillRect(25, 16, 6, 3); g.fillStyle = C.brass; g.fillRect(26, 17, 5, 1);
    for (const [x, y] of [[26, 28], [29, 28], [27, 26]]) { disc(g, x + 1, y + 1, 1, '#1e1a1e'); }
    g.fillStyle = t.main; g.fillRect(6, 21, 3, 2);
  },
  workshop(g, t) {
    // Karakuri works: open timber shed, a great gear, a crane, a half-built automaton
    outlined(g, [[3, 12, 2, 20, C.woodDark], [43, 12, 2, 20, C.woodDark], [3, 12, 42, 2, C.wood]], []);
    roof(g, 24, 4, 46, 8);
    gear(g, 13, 23, 6);
    gear(g, 22, 27, 3);
    outlined(g, [[30, 18, 6, 6, C.brass], [31, 24, 4, 8, C.brassDark], [29, 15, 8, 3, C.lacquer]], [[31, 20, 1, 1, C.red], [34, 20, 1, 1, C.red], [30, 18, 6, 1, C.brassLight]]);
    g.fillStyle = C.O; g.fillRect(39, 14, 1, 10);
    noren(g, 4, 14, 8, t);
  },
  airbase(g, t) {
    // Sky dock: a brass mooring mast with lanterns and a koinobori windsock
    outlined(g, [[0, 20, 36, 12, C.wood]], [[0, 20, 36, 1, C.woodLight]]);
    roof(g, 18, 14, 40, 6);
    outlined(g, [[13, 24, 10, 8, C.lacquer]], [[17, 24, 1, 8, C.O]]);
    g.fillStyle = C.O; g.fillRect(47, 0, 5, 32);
    g.fillStyle = C.brassDark; g.fillRect(48, 1, 3, 31);
    g.fillStyle = C.brass; for (let y = 3; y < 32; y += 5) g.fillRect(48, y, 3, 1);
    g.fillStyle = C.O; g.fillRect(43, 0, 13, 3);
    g.fillStyle = C.brassLight; g.fillRect(44, 1, 11, 1);
    for (const [x, y] of [[41, 10], [55, 16]]) { g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 5, 6); g.fillStyle = C.red; g.fillRect(x, y, 3, 4); g.fillStyle = C.glass; g.fillRect(x + 1, y + 1, 1, 2); }
    g.fillStyle = t.main; g.fillRect(52, 4, 9, 3);
    g.fillStyle = C.white; g.fillRect(58, 5, 1, 1);
    g.fillStyle = t.dark; g.fillRect(54, 4, 1, 3); g.fillRect(56, 4, 1, 3);
  },
  bridge(g, t) {
    // Red taiko bridge deck with a railing
    g.fillStyle = C.O; g.fillRect(0, 0, 16, 7);
    g.fillStyle = C.wood; g.fillRect(0, 2, 16, 3);
    g.fillStyle = C.woodLight; g.fillRect(0, 2, 16, 1);
    g.fillStyle = C.vermilion; g.fillRect(0, 0, 16, 1); g.fillRect(2, 0, 1, 2); g.fillRect(8, 0, 1, 2); g.fillRect(14, 0, 1, 2); g.fillRect(0, 5, 16, 1);
    g.fillStyle = C.brass; g.fillRect(2, 0, 1, 1); g.fillRect(8, 0, 1, 1); g.fillRect(14, 0, 1, 1);
    g.fillStyle = t.main; g.fillRect(10, 3, 2, 1);
  },
  ramp(g, t) {
    // Stone steps
    g.fillStyle = C.stone; g.fillRect(0, 0, 16, 16);
    g.fillStyle = C.stoneDark; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = C.stoneLight; for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = C.O; g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = t.main; g.fillRect(2, 1, 3, 2);
  },
};

// ── Sky Pirate buildings ───────────────────────────────────────────────────
function planks(g, x, y, w, h, col = C.wood) {
  outlined(g, [[x, y, w, h, col]], [[x, y, w, 1, C.woodLight]]);
  g.fillStyle = C.woodDark;
  for (let yy = y + 3; yy < y + h; yy += 3) g.fillRect(x, yy, w, 1);
  for (let yy = y + 1, r = 0; yy < y + h; yy += 3, r++) for (let xx = x + (r % 2 ? 5 : 11); xx < x + w; xx += 13) g.fillRect(xx, yy, 1, 2);
}

function porthole(g, cx, cy) {
  disc(g, cx, cy, 3, C.O); disc(g, cx, cy, 2, C.brass); disc(g, cx, cy, 1, C.glass);
}

function flag(g, x, y, w, h, t, pole = 6) {
  g.fillStyle = C.O; g.fillRect(x - 2, y - 1, 3, h + pole + 1); g.fillRect(x, y - 1, w + 1, h + 2);
  g.fillStyle = C.woodDark; g.fillRect(x - 1, y, 1, h + pole);
  g.fillStyle = t.main; g.fillRect(x, y, w, h);
  g.fillStyle = t.light; g.fillRect(x, y, w, 1);
}

function patch(g, x, y, w, h, col) {
  g.fillStyle = col; g.fillRect(x, y, w, h);
  g.fillStyle = C.O;
  for (let i = 0; i < w; i += 2) { g.fillRect(x + i, y - 1, 1, 1); g.fillRect(x + i, y + h, 1, 1); }
  for (let i = 1; i < h; i += 2) { g.fillRect(x - 1, y + i, 1, 1); g.fillRect(x + w, y + i, 1, 1); }
}

function barrel(g, x, y, w, h, band) {
  outlined(g, [[x, y, w, h, C.wood]], [[x + 1, y, w - 2, 1, C.woodLight], [x + 2, y + 1, 1, h - 2, C.woodLight]]);
  g.fillStyle = C.woodDark; for (let xx = x + 4; xx < x + w - 1; xx += 3) g.fillRect(xx, y + 1, 1, h - 2);
  g.fillStyle = C.iron; g.fillRect(x, y + 1, w, 1); g.fillRect(x, y + h - 2, w, 1);
  if (band) { g.fillStyle = band; g.fillRect(x, y + Math.floor(h / 2), w, 1); }
}

const PIRATE_BUILD = {
  hq(g, t) {
    // Pirate Cove: a crashed patchwork zeppelin flopped on a beached ship hull,
    // a stove pipe, portholes and the team's cog-and-spanners flag up the mast
    planks(g, 4, 31, 56, 17);
    g.fillStyle = t.main; g.fillRect(4, 34, 56, 1);
    for (const x of [14, 22, 43, 51]) porthole(g, x, 40);
    // Raised bow with a bowsprit, and an anchor over the side
    outlined(g, [[56, 28, 6, 6, C.wood], [58, 26, 6, 1, C.woodDark]], [[56, 28, 6, 1, C.woodLight], [56, 31, 6, 1, t.main]]);
    g.fillStyle = C.O; g.fillRect(5, 34, 5, 11); g.fillRect(3, 41, 9, 4);
    g.fillStyle = C.iron; g.fillRect(6, 35, 3, 1); g.fillRect(7, 35, 1, 9); g.fillRect(4, 42, 1, 1); g.fillRect(10, 42, 1, 1); g.fillRect(5, 43, 5, 1);
    g.fillStyle = C.ironLight; g.fillRect(7, 36, 1, 3);
    outlined(g, [[27, 37, 10, 11, C.lacquer]], [[27, 37, 10, 1, C.brass], [31, 38, 1, 10, C.O], [29, 42, 1, 1, C.brassLight], [34, 42, 1, 1, C.brassLight]]);
    g.fillStyle = C.O; for (let x = 4; x < 61; x += 6) g.fillRect(x, 28, 1, 3); g.fillRect(3, 28, 58, 1);
    // The flopped gasbag
    outlined(g, [[3, 10, 6, 6, t.main], [8, 13, 46, 15, C.sail], [11, 11, 40, 2, C.sail], [54, 16, 4, 10, C.sail], [5, 16, 3, 11, C.sail]], [
      [3, 10, 6, 1, t.light], [11, 11, 40, 1, C.white], [8, 26, 46, 2, C.sailDark], [5, 25, 3, 2, C.sailDark], [55, 24, 3, 2, C.sailDark],
    ]);
    patch(g, 12, 15, 7, 5, C.patchA); patch(g, 38, 20, 8, 4, C.patchB); patch(g, 46, 13, 5, 4, C.patchC); patch(g, 21, 22, 6, 3, C.patchD);
    g.fillStyle = t.main; g.fillRect(30, 11, 3, 17);
    g.fillStyle = t.dark; g.fillRect(32, 11, 1, 17);
    // A dent where it hit the deck
    g.fillStyle = C.sailDark; g.fillRect(44, 26, 5, 1); g.fillRect(16, 26, 3, 1);
    // Stove pipe and mast
    outlined(g, [[13, 2, 3, 11, C.iron]], [[12, 2, 5, 1, C.ironLight], [15, 3, 1, 9, '#2e2c34']]);
    outlined(g, [[48, 0, 2, 11, C.woodDark]], []);
    flag(g, 50, 1, 12, 8, t, 0);
    emblem(g, 54, 2);
  },
  barracks(g, t) {
    // Grog Hall: a timber tavern with a shingled roof, a foaming-mug sign,
    // round windows, bunting and a barrel by the door. (It's ginger beer.)
    planks(g, 4, 14, 40, 18);
    for (let i = 0; i < 10; i++) {
      const half = Math.round(10 + (i / 9) * 14);
      g.fillStyle = C.O; g.fillRect(24 - half - 1, 4 + i, half * 2 + 2, 1);
      g.fillStyle = i % 2 ? C.redDark : C.lacquerRed; g.fillRect(24 - half, 4 + i, half * 2, 1);
    }
    g.fillStyle = C.O; g.fillRect(13, 3, 22, 1);
    g.fillStyle = C.redDark; for (let x = 16; x < 34; x += 4) g.fillRect(x, 5, 1, 1);
    chimney(g, 36, 1, 8);
    // Bunting
    for (let x = 1; x < 47; x += 4) {
      g.fillStyle = (x >> 2) % 2 ? C.white : t.main;
      g.fillRect(x, 14, 3, 1); g.fillRect(x + 1, 15, 1, 1);
    }
    // Door, windows and sign
    outlined(g, [[20, 22, 8, 10, C.lacquer], [21, 21, 6, 1, C.lacquer]], [[23, 22, 1, 10, C.O], [26, 27, 1, 1, C.brassLight]]);
    for (const x of [11, 37]) { disc(g, x, 23, 3, C.O); disc(g, x, 23, 2, C.glass); g.fillStyle = C.O; g.fillRect(x, 21, 1, 5); g.fillRect(x - 2, 23, 5, 1); }
    outlined(g, [[17, 16, 14, 4, C.woodLight]], [[17, 16, 14, 1, C.sail]]);
    outlined(g, [[22, 16, 3, 3, C.gold], [25, 17, 1, 1, C.gold]], [[22, 16, 3, 1, C.white], [21, 16, 1, 1, C.white], [23, 17, 1, 2, C.goldDark]]);
    barrel(g, 40, 25, 6, 7, t.main);
    barrel(g, 2, 26, 5, 6, null);
  },
  turret(g, t) {
    // Crow's Nest: a mast with a barrel lookout and a swivel cannon, on crates
    outlined(g, [[6, 26, 20, 6, C.wood]], [[6, 26, 20, 1, C.woodLight], [15, 26, 1, 6, C.woodDark], [6, 29, 20, 1, C.woodDark]]);
    outlined(g, [[14, 9, 3, 17, C.woodDark]], [[14, 9, 1, 17, C.wood]]);
    g.fillStyle = C.sailDark; for (let y = 12; y < 26; y += 3) g.fillRect(17, y, 3, 1);
    g.fillStyle = C.O; g.fillRect(19, 11, 1, 15);
    outlined(g, [[11, 3, 4, 3, C.skin], [9, 2, 8, 1, C.lacquer], [11, 0, 4, 2, C.lacquer]], [[11, 1, 4, 1, t.main], [13, 4, 1, 1, C.brass]]);
    outlined(g, [[8, 6, 16, 7, C.wood]], [[8, 6, 16, 1, C.woodLight], [8, 7, 16, 1, C.iron], [8, 11, 16, 1, C.iron], [8, 9, 16, 1, t.main]]);
    g.fillStyle = C.woodDark; for (let x = 11; x < 23; x += 3) g.fillRect(x, 8, 1, 3);
    outlined(g, [[23, 4, 7, 3, C.iron], [29, 3, 2, 5, C.brass]], [[23, 4, 7, 1, C.ironLight], [30, 4, 1, 3, C.O]]);
  },
  wall(g, t) {
    // Barrel stack: three upright barrels lashed together, a team pennant on top
    barrel(g, 1, 23, 14, 9, null);
    barrel(g, 1, 14, 14, 9, t.main);
    barrel(g, 2, 6, 12, 8, null);
    g.fillStyle = C.sailDark; g.fillRect(0, 18, 1, 9); g.fillRect(15, 18, 1, 9);
    g.fillStyle = C.O; g.fillRect(6, 0, 1, 6); g.fillRect(7, 0, 6, 4);
    g.fillStyle = t.main; g.fillRect(7, 1, 5, 2);
    g.fillStyle = t.light; g.fillRect(7, 1, 5, 1);
  },
  mine(g, t) {
    // Plunder Pile: an open treasure chest and a heap of gold coins, cogs
    // and gems, with the team flag planted on top
    for (let i = 0; i < 14; i++) {
      const half = Math.round(3 + i * 0.75);
      g.fillStyle = C.O; g.fillRect(21 - half - 1, 17 + i, half * 2 + 2, 1);
      g.fillStyle = i % 3 === 1 ? C.goldDark : C.gold; g.fillRect(21 - half, 17 + i, half * 2, 1);
    }
        g.fillStyle = '#fff2a8';
    for (let i = 0; i < 9; i++) g.fillRect(12 + Math.floor(hash(i + 4) * 18), 19 + Math.floor(hash(i + 9) * 11), 2, 1);
    for (const [x, y, col] of [[20, 22, C.red], [26, 27, '#4a8ae8'], [15, 28, C.parrot]]) { g.fillStyle = C.O; g.fillRect(x - 1, y - 1, 4, 4); g.fillStyle = col; g.fillRect(x, y, 2, 2); g.fillStyle = C.white; g.fillRect(x, y, 1, 1); }
    gear(g, 27, 21, 2);
    flag(g, 20, 3, 8, 5, t, 9);
    // The chest
    outlined(g, [[2, 15, 12, 5, C.wood], [2, 21, 12, 10, C.wood]], [
      [2, 15, 12, 1, C.woodLight], [2, 18, 12, 1, C.iron], [2, 21, 12, 1, C.gold], [2, 22, 12, 2, C.goldDark],
      [2, 26, 12, 1, C.iron], [7, 25, 2, 3, C.brass], [7, 26, 2, 1, C.O], [4, 21, 1, 10, C.woodDark], [11, 21, 1, 10, C.woodDark], [2, 28, 12, 1, t.main],
    ]);
    g.fillStyle = C.gold; g.fillRect(4, 20, 3, 1); g.fillRect(9, 19, 2, 2);
  },
  workshop(g, t) {
    // Salvage Yard: a patched awning over a heap of scrap, a half-built
    // robo-parrot and an anvil
    outlined(g, [[3, 10, 2, 22, C.woodDark], [43, 10, 2, 22, C.woodDark]], []);
    outlined(g, [[1, 5, 46, 5, C.sail]], [[1, 5, 46, 1, C.white]]);
    for (let x = 1; x < 47; x += 4) { g.fillStyle = t.main; g.fillRect(x, 10, 2, 2); g.fillStyle = C.O; g.fillRect(x + 2, 10, 2, 1); }
    patch(g, 9, 6, 6, 3, C.patchA); patch(g, 31, 6, 5, 3, C.patchC);
    // Scrap heap
    for (let i = 0; i < 9; i++) {
      const half = Math.round(4 + i * 1.3);
      g.fillStyle = C.O; g.fillRect(16 - half - 1, 23 + i, half * 2 + 2, 1);
      g.fillStyle = i % 2 ? C.iron : C.ironLight; g.fillRect(16 - half, 23 + i, half * 2, 1);
    }
    gear(g, 12, 25, 3);
    outlined(g, [[16, 20, 2, 6, C.copper], [19, 24, 5, 2, C.brassDark]], [[16, 20, 2, 1, C.brassLight]]);
    // Half-built robo-parrot
    outlined(g, [[30, 18, 6, 6, C.parrot], [34, 15, 4, 4, C.parrot], [38, 16, 2, 2, C.gold], [31, 24, 1, 4, C.brass], [34, 24, 1, 4, C.brass]], [
      [30, 19, 3, 3, C.brassDark], [31, 20, 1, 1, C.brassLight], [35, 16, 2, 2, C.brass], [36, 16, 1, 1, C.O], [33, 22, 3, 1, t.main],
    ]);
    outlined(g, [[28, 28, 12, 2, C.iron], [31, 30, 6, 2, C.iron]], [[28, 28, 12, 1, C.ironLight]]);
  },
  airbase(g, t) {
    // Sky Harbour: a timber dock, crates and rope, a lattice mooring mast
    // with a lantern, and a little patched blimp tied up at the top
    planks(g, 0, 21, 38, 11);
    outlined(g, [[4, 15, 8, 6, C.woodLight], [13, 17, 6, 4, C.woodLight]], [[4, 17, 8, 1, C.woodDark], [7, 15, 1, 6, C.woodDark], [13, 18, 6, 1, C.woodDark]]);
    g.fillStyle = t.main; g.fillRect(5, 16, 2, 1); g.fillRect(14, 19, 2, 1);
    disc(g, 27, 19, 2, C.O); disc(g, 27, 19, 1, C.sailDark);
    g.fillStyle = C.O; g.fillRect(48, 2, 1, 30); g.fillRect(54, 2, 1, 30); g.fillRect(46, 1, 11, 2);
    g.fillStyle = C.ironLight;
    for (let y = 4; y < 32; y += 6) { for (let i = 0; i < 5; i++) { g.fillRect(49 + i, y + i, 1, 1); g.fillRect(53 - i, y + i, 1, 1); } g.fillRect(49, y, 5, 1); }
    g.fillStyle = C.brass; g.fillRect(47, 1, 9, 1);
    g.fillStyle = C.O; g.fillRect(56, 6, 5, 6); g.fillStyle = C.red; g.fillRect(57, 7, 3, 4); g.fillStyle = C.glass; g.fillRect(58, 8, 1, 2);
    // Tether and moored blimp
    g.fillStyle = C.O; for (let i = 0; i < 8; i++) g.fillRect(40 + i, 6 - Math.floor(i / 3), 1, 1);
    outlined(g, [[22, 2, 18, 7, C.sail], [20, 3, 2, 5, C.sail], [16, 1, 4, 3, t.main], [16, 7, 4, 3, t.main], [26, 9, 8, 3, C.wood]], [
      [22, 2, 18, 1, C.white], [22, 8, 18, 1, C.sailDark], [26, 9, 8, 1, C.woodLight], [26, 11, 8, 1, t.main], [28, 10, 1, 1, C.glass], [31, 10, 1, 1, C.glass],
    ]);
    patch(g, 25, 4, 4, 3, C.patchB);
    g.fillStyle = t.main; g.fillRect(33, 2, 2, 7);
    flag(g, 57, 0, 6, 4, t, 0);
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
    if (kind !== 'dirtTop' && hash(seed + 33) < 0.3) {
      // A buried pipe
      g.fillStyle = C.copperDark; g.fillRect(0, 9, T, 3);
      g.fillStyle = C.copper; g.fillRect(0, 9, T, 1);
      g.fillStyle = C.brass; g.fillRect(6, 8, 2, 5);
    }
    if (kind === 'dirtTop') {
      g.fillStyle = C.grass; g.fillRect(0, 0, T, 4);
      g.fillStyle = C.grassLight; g.fillRect(0, 0, T, 1);
      g.fillStyle = C.grassDark; g.fillRect(0, 4, T, 1);
      for (let x = 0; x < T; x += 3) if (hash(seed + x) < 0.6) g.fillRect(x, 5, 1, 1);
      g.fillStyle = C.sakura;
      if (hash(seed + 9) < 0.5) g.fillRect(Math.floor(hash(seed + 10) * 14), 1, 1, 1);
    }
  } else {
    // Brass-plated girder with a riveted deck and a copper pipe beneath
    const L = kind === 'rockL' || kind === 'rockLR';
    const R = kind === 'rockR' || kind === 'rockLR';
    g.fillStyle = C.lacquer; g.fillRect(0, 0, T, T);
    g.fillStyle = C.brass; g.fillRect(0, 0, T, 4);
    g.fillStyle = C.brassLight; g.fillRect(0, 0, T, 1);
    g.fillStyle = C.brassDark; g.fillRect(0, 4, T, 1);
    g.fillStyle = C.brassLight; for (let x = 2; x < T; x += 5) g.fillRect(x, 2, 1, 1);
    g.fillStyle = C.lacquerLight;
    for (let i = 0; i < 5; i++) { g.fillRect(2 + i * 2, 6 + i, 1, 1); g.fillRect(13 - i * 2, 6 + i, 1, 1); }
    g.fillStyle = C.copperDark; g.fillRect(0, T - 5, T, 3);
    g.fillStyle = C.copper; g.fillRect(0, T - 5, T, 1);
    g.fillStyle = C.O;
    g.fillRect(L ? 2 : 0, T - 1, T - (L ? 2 : 0) - (R ? 2 : 0), 1);
    if (L) { g.fillRect(0, 0, 1, T - 2); g.clearRect(0, T - 2, 2, 2); g.fillRect(1, T - 2, 1, 1); }
    if (R) { g.fillRect(T - 1, 0, 1, T - 2); g.clearRect(T - 2, T - 2, 2, 2); g.fillRect(T - 2, T - 2, 1, 1); }
  }
}

// Grass tufts, fallen petals and the odd brass cog.
function surface(ctx, x, y, ground, h) {
  ctx.fillStyle = C.grass;
  ctx.fillRect(x + Math.floor(h * 12), y - 2, 1, 2);
  if (!ground) return;
  if (h > 0.9) {
    ctx.fillStyle = C.brassDark; ctx.fillRect(x + 6, y - 3, 3, 3);
    ctx.fillStyle = C.brass; ctx.fillRect(x + 7, y - 3, 1, 1); ctx.fillRect(x + 6, y - 2, 1, 1); ctx.fillRect(x + 8, y - 2, 1, 1);
  } else if (h > 0.66) {
    ctx.fillStyle = C.sakura; ctx.fillRect(x + 3, y - 1, 1, 1); ctx.fillRect(x + 9, y - 1, 2, 1);
    ctx.fillStyle = C.sakuraLight; ctx.fillRect(x + 12, y - 1, 1, 1);
  }
}

// ── Background (screen space in the art buffer) ────────────────────────────
// Parallax repeat periods divide WORLD_W × factor so looping maps line up.
const scenery = {};

function fuji(ctx, cx, base, w, h) {
  for (let y = 0; y < h; y++) {
    const half = Math.round(4 + (y / h) * (w / 2));
    ctx.fillStyle = y < h * 0.28 ? (y % 3 === 2 && y > h * 0.18 ? C.fuji : C.snow) : C.fuji;
    ctx.fillRect(cx - half, base - h + y, half * 2, 1);
  }
}

// Far town: pagodas, a castle keep and factory chimneys (smoke drawn live).
function townPiece(k) {
  const key = `town${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(40, 60);
  const col = '#4a3456';
  const kind = Math.floor(hash(k + 1) * 3);
  g.fillStyle = col;
  if (kind === 0) {
    // Five-storey pagoda
    for (let i = 0; i < 5; i++) {
      const y = 12 + i * 9;
      const w = 12 + i * 3;
      g.fillRect(20 - w / 2 - 2, y, w + 4, 2);
      g.fillRect(20 - w / 2 + 2, y + 2, w - 4, 7);
    }
    g.fillRect(19, 2, 2, 10);
  } else if (kind === 1) {
    // Factory with chimneys
    g.fillRect(4, 36, 32, 24);
    for (const x of [8, 18, 28]) g.fillRect(x, 14 + (x % 3) * 4, 4, 30);
    g.fillStyle = '#f2b05a'; for (let x = 7; x < 34; x += 5) g.fillRect(x, 44, 2, 3);
  } else {
    // Distant castle keep
    g.fillRect(8, 40, 24, 20); g.fillRect(4, 34, 32, 6); g.fillRect(11, 24, 18, 10); g.fillRect(8, 20, 24, 4); g.fillRect(14, 12, 12, 8); g.fillRect(11, 9, 18, 3);
    g.fillStyle = '#f2b05a'; g.fillRect(15, 28, 2, 2); g.fillRect(23, 28, 2, 2);
  }
  scenery[key] = c;
  return c;
}

function sakuraTree(k) {
  const key = `sak${k}`;
  if (scenery[key]) return scenery[key];
  const [c, g] = canvas(34, 40);
  g.fillStyle = '#3a2420'; g.fillRect(16, 16, 3, 24); g.fillRect(12, 18, 5, 2); g.fillRect(18, 14, 6, 2); g.fillRect(10, 16, 2, 3);
  for (let i = 0; i < 9; i++) {
    const cx = 6 + Math.floor(hash(k * 7 + i) * 22);
    const cy = 4 + Math.floor(hash(k * 7 + i + 30) * 12);
    disc(g, cx, cy, 4 + Math.floor(hash(k + i) * 2), i % 3 ? C.sakura : C.sakuraDark);
  }
  for (let i = 0; i < 8; i++) { g.fillStyle = C.sakuraLight; g.fillRect(4 + Math.floor(hash(k + i + 50) * 26), 2 + Math.floor(hash(k + i + 60) * 14), 2, 1); }
  scenery[key] = c;
  return c;
}

function torii(ctx, x, base) {
  const red = '#a82a22';
  rect(ctx, x, base - 26, 2, 26, red); rect(ctx, x + 14, base - 26, 2, 26, red);
  rect(ctx, x - 3, base - 28, 22, 2, '#1e1416'); rect(ctx, x - 2, base - 26, 20, 1, red); rect(ctx, x - 1, base - 22, 18, 2, red);
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

  // A great red setting sun beside Mount Fuji (both far beyond parallax)
  const sx = Math.round(bw * 0.22), sy = Math.round(groundY - 78);
  disc(ctx, sx, sy, 17, '#d8482e');
  fuji(ctx, Math.round(bw * 0.55), groundY - 8, 200, 92);

  // Airships drifting across the far sky
  for (let i = 0; i < 2; i++) {
    const ax = Math.round(((t * (5 + i * 3) + i * 211 - camAX * 0.08) % (bw + 80) + bw + 80) % (bw + 80)) - 40;
    const ay = Math.round(24 + i * 22 - camAY * 0.05);
    rect(ctx, ax, ay, 22, 6, '#4a3a5e'); rect(ctx, ax + 2, ay - 1, 18, 1, '#4a3a5e'); rect(ctx, ax - 3, ay + 1, 3, 4, '#4a3a5e');
    rect(ctx, ax + 8, ay + 6, 6, 2, '#3a2c4a'); rect(ctx, ax + 9, ay + 7, 1, 1, '#f2b05a');
  }

  // Far town with steam rising from its chimneys
  const tCount = 12;
  const tSpacing = ((WORLD_W / G) * 0.25) / tCount;
  const tOff = Math.round(camAX * 0.25);
  for (let i = Math.floor((tOff - 50) / tSpacing); i * tSpacing - tOff < bw + 50; i++) {
    const k = ((i % tCount) + tCount) % tCount;
    const img = townPiece(k);
    const x = Math.round(i * tSpacing - tOff + hash(k + 3) * tSpacing * 0.4);
    ctx.drawImage(img, x, groundY - img.height - 2);
    if (Math.floor(hash(k + 1) * 3) === 1) {
      for (let j = 0; j < 3; j++) {
        const kk = (t / 3 + j / 3 + k * 0.1) % 1;
        ctx.globalAlpha = 0.45 * (1 - kk);
        rect(ctx, x + 9 + j * 10 + Math.round(Math.sin(kk * 6 + j) * 3), groundY - 62 - Math.round(kk * 30) + (j % 3) * 4, 4 + Math.round(kk * 4), 3 + Math.round(kk * 3), C.steam);
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.globalAlpha = 0.3; rect(ctx, 0, groundY - 20, bw, 20, '#f2b884'); ctx.globalAlpha = 1;

  // Cherry trees and torii gates in front
  const count = 40;
  const spacing = ((WORLD_W / G) * 0.6) / count;
  const jOff = Math.round(camAX * 0.6);
  for (let i = Math.floor((jOff - 30) / spacing); i * spacing - jOff < bw + 30; i++) {
    const k = ((i % count) + count) % count;
    const x = Math.round(i * spacing - jOff + hash(k) * spacing * 0.5);
    if (hash(k + 70) < 0.18) torii(ctx, x, groundY + 2);
    else if (hash(k + 70) < 0.8) { const img = sakuraTree(k); ctx.drawImage(img, x - 17, groundY - img.height + 2); }
  }
}

// Cherry blossom petals drifting across everything.
function weather(ctx, bw, bh, camAX, camAY) {
  const t = performance.now() / 1000;
  const n = Math.min(90, Math.floor((bw * bh) / 4000));
  for (let i = 0; i < n; i++) {
    const speed = 12 + hash(i * 5 + 1) * 14;
    const y = ((hash(i * 5 + 2) * (bh + 20) + t * speed + camAY * 0.3) % (bh + 20)) - 10;
    const sway = Math.sin(t * 1.5 + i) * 6;
    const x = Math.round((((hash(i * 5 + 3) * (bw + 40) + sway - t * 8 - camAX * 0.4) % (bw + 40)) + bw + 40) % (bw + 40)) - 20;
    ctx.fillStyle = i % 3 ? C.sakura : C.sakuraLight;
    ctx.fillRect(x, Math.round(y), (i + Math.floor(t * 2)) % 2 ? 2 : 1, 1);
  }
}

// Bamboo scaffolding wreathed in steam.
function construction(ctx, x, y, w, h) {
  ctx.fillStyle = '#6a8a3a';
  for (let sx = x + 1; sx < x + w; sx += 7) ctx.fillRect(sx, y, 1, h);
  for (let sy = y + 3; sy < y + h; sy += 7) ctx.fillRect(x, sy, w, 1);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = C.steam; ctx.fillRect(x + Math.floor(w * 0.6), y + 2, 6, 5);
  ctx.globalAlpha = 1;
}

function puff(ctx, x, y, ms, i) {
  const k = (ms / 1500 + i / 2) % 1;
  ctx.globalAlpha = 0.6 * (1 - k);
  rect(ctx, x + Math.round(Math.sin(k * 6 + i) * 2), y - Math.round(k * 12), 3 + Math.round(k * 2), 3 + Math.round(k * 2), C.steam);
  ctx.globalAlpha = 1;
}

function animate(ctx, b, x, y) {
  const ms = performance.now();
  const tick = Math.floor(ms / 160);
  const t = team(b.faction);
  if (pirate(b.faction)) {
    if (b.type === 'hq') {
      for (let i = 0; i < 2; i++) puff(ctx, x + 13, y + 1, ms, i);
      rect(ctx, x + 61 + (tick % 2), y + 3 + (tick % 2), 1, 2, t.light);
    } else if (b.type === 'barracks') {
      for (let i = 0; i < 2; i++) puff(ctx, x + 36, y, ms + 300, i);
    } else if (b.type === 'mine') {
      // Treasure glints
      const k = tick % 9;
      if (k < 3) {
        const gx = x + 12 + Math.floor(hash(Math.floor(tick / 9)) * 16), gy = y + 19 + Math.floor(hash(Math.floor(tick / 9) + 5) * 9);
        rect(ctx, gx, gy - 1, 1, 3, C.white); rect(ctx, gx - 1, gy, 3, 1, C.white);
      }
    } else if (b.type === 'turret') {
      if (tick % 7 === 0) puff(ctx, x + 31, y + 4, ms, 0);
    } else if (b.type === 'airbase') {
      if (tick % 5 < 3) rect(ctx, x + 58, y + 8, 1, 2, C.yellow);
      rect(ctx, x + 63, y + 1 + (tick % 2), 1, 2, t.light);
    }
    return;
  }
  if (b.type === 'hq') {
    for (let i = 0; i < 2; i++) { puff(ctx, x + 6, y + 20, ms, i); puff(ctx, x + 55, y + 18, ms + 400, i); }
  } else if (b.type === 'mine') {
    for (let i = 0; i < 2; i++) puff(ctx, x + 21, y, ms, i);
    if (tick % 4 < 2) rect(ctx, x + 30, y + 16, 1, 1, C.steam);
  } else if (b.type === 'barracks') {
    for (let i = 0; i < 2; i++) puff(ctx, x + 40, y + 3, ms, i);
  } else if (b.type === 'airbase') {
    // The koinobori ripples
    rect(ctx, x + 60 + (tick % 2), y + 5, 1, 1, t.light);
  } else if (b.type === 'turret') {
    if (tick % 7 === 0) puff(ctx, x + 30, y + 12, ms, 0);
  }
}

function projectile(ctx, p, x, y, dx, dy) {
  if (p.kind === 'bullet') {
    // Brass slug with a wisp of steam
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, 'rgba(232,228,234,0.6)');
    rect(ctx, x - dx, y - dy, 1, 1, C.brassDark);
    rect(ctx, x, y, 2, 1, C.brassLight);
  } else if (p.kind === 'bomb') {
    // Round bomb with a fizzing fuse
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, C.lacquerLight);
    if (Math.floor(performance.now() / 80) % 2) rect(ctx, x, y - 3, 1, 1, C.yellow);
  } else if (p.kind === 'lob') {
    // Firework shell trailing sparks
    rect(ctx, x - dx * 2, y - dy * 2, 1, 1, C.yellow);
    rect(ctx, x - dx, y - dy, 1, 1, C.fire);
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, C.red);
  } else {
    // Cannonball
    rect(ctx, x - dx, y - dy, 1, 1, 'rgba(232,228,234,0.6)');
    rect(ctx, x - 1, y - 1, 3, 3, C.O);
    rect(ctx, x - 1, y - 1, 2, 2, '#4a4650');
  }
}

// Every blast blooms like hanabi: rings of coloured sparks and a puff of smoke.
const SPARKS = ['#f6d27a', '#f4a8c0', '#9ad0f0', '#f6f0e4', '#f28a30'];
function explode(ctx, x, y, r, k, seed) {
  if (k > 0.7) {
    ctx.globalAlpha = 1 - (k - 0.7) / 0.3;
    disc(ctx, x, y, Math.max(1, Math.round(r * 0.6)), C.steam);
    ctx.globalAlpha = 1;
    return;
  }
  disc(ctx, x, y, Math.max(1, Math.round(r * 0.3 * (1 - k))), '#ffffff');
  const rays = 12;
  for (let i = 0; i < rays; i++) {
    const ang = (i / rays) * Math.PI * 2 + hash(seed) * 0.5;
    const col = SPARKS[(i + Math.floor(hash(seed + 3) * 5)) % SPARKS.length];
    for (let j = 0; j < 3; j++) {
      const d = r * (0.4 + k * 0.9) - j * 2;
      if (d <= 0) continue;
      rect(ctx, Math.round(x + Math.cos(ang) * d), Math.round(y + Math.sin(ang) * d + k * 3), j === 0 ? 2 : 1, j === 0 ? 2 : 1, col);
    }
  }
}

function corpse(e) {
  const t = team(e.f);
  const [c, g] = canvas(14, 6);
  if (pirate(e.f)) {
    if (e.type === 'scout') {
      // A sprung robo-parrot: feathers, a loose spring and a cog
      outlined(g, [[3, 2, 7, 3, C.parrot], [10, 3, 2, 2, C.gold], [1, 3, 2, 2, t.main]], [[5, 2, 3, 1, t.main], [7, 4, 1, 1, C.brassDark]]);
      g.fillStyle = C.brass; g.fillRect(4, 0, 1, 1); g.fillRect(5, 1, 1, 1); g.fillRect(6, 0, 1, 1);
    } else if (e.type === 'engineer') {
      outlined(g, [[1, 2, 3, 3, C.fur], [4, 2, 7, 3, C.denim], [11, 3, 2, 2, C.fur]], [[2, 3, 2, 1, C.furLight], [5, 2, 1, 3, t.main]]);
    } else {
      outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, e.type === 'heavy' ? C.copper : C.white], [11, 3, 2, 2, C.boot]], [[0, 1, 3, 1, C.lacquer], [5, 3, 5, 1, t.main], [2, 3, 1, 1, C.O]]);
    }
    return { c, ax: 7, ay: 5 };
  }
  outlined(g, [[1, 2, 3, 3, C.skin], [4, 2, 7, 3, e.type === 'heavy' ? C.lacquerRed : C.lacquer], [11, 3, 2, 2, C.boot]], [[0, 1, 2, 2, C.hair], [5, 3, 2, 1, t.main]]);
  return { c, ax: 7, ay: 5 };
}

export default {
  id: 'steampunk',
  name: 'Steam Shogun',
  sides: [
    {
      id: 'shogunate', name: 'The Shogunate', short: 'Shogunate',
      blurb: 'Lacquered armour, brass boilers, ninjas in goggles and a castle that runs on steam. Very polite. Very punctual.',
      win: 'The cherry blossoms fall on a well-earned victory.',
      lose: 'The castle boiler has gone cold. Time for some tea.',
    },
    {
      id: 'pirates', name: 'The Sky Pirates', short: 'Pirates', plural: true,
      blurb: 'Goggled air-pirates in patchwork zeppelins, with a clockwork parrot and a monkey who fixes everything. Arr, the sky be theirs!',
      names: {
        soldier: 'Deckhand', heavy: 'Boiler-Belly', scout: 'Robo-Parrot', engineer: 'Grease Monkey', sniper: 'Spyglass',
        jeep: 'Steam Hog', tank: 'Land Galleon', artillery: 'Broadside Wagon', helicopter: 'Gyro-Gull', bomber: 'Patchwork Zeppelin',
        hq: 'Pirate Cove', barracks: 'Grog Hall', turret: "Crow's Nest", wall: 'Barrel Stack', mine: 'Plunder Pile',
        workshop: 'Salvage Yard', airbase: 'Sky Harbour', bridge: 'Taiko Bridge', ramp: 'Steps',
      },
      icons: { hq: '⚓', barracks: '🥤', turret: '🔭', wall: '🛢️', mine: '💰', workshop: '🔧', airbase: '🎈' },
      win: 'Arr, the sky be ours! Ginger beer for the whole crew!',
      lose: 'Abandon zeppelin! Mind the parrot!',
    },
  ],
  palette,
  teamBase: ARMOUR,
  roofBase: [0.25, 0.25, 0.3],
  soldier: buildSoldier,
  vehicle: { jeep: buildRickshaw, tank: buildBeetle, artillery: buildMortar },
  aircraft: { helicopter: buildTengu, bomber: buildKoi },
  buildings: Object.fromEntries(Object.keys(BUILD).map((k) => [k, (g, t, f) => (pirate(f) && PIRATE_BUILD[k] ? PIRATE_BUILD[k] : BUILD[k])(g, t, f)])),
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
  explosion: { rim: '#c8964a', body: '#f6d27a', core: '#ffffff', smoke: '#e8e4ea', smoke2: '#f6f0e4' },
  corpse,
  debris: { '#7a4a24': '#c8964a', '#5c361a': '#b86a3a' },
  minimap: { sky: '#5e3666', ground: '#5a4434', platform: '#c8964a', bridge: '#d23a26', ramp: '#8a867e', surface: '#6a9a4a' },
  names: {
    soldier: 'Ashigaru', heavy: 'Steam Samurai', scout: 'Ninja', engineer: 'Tinkerer', sniper: 'Teppo',
    jeep: 'Rickshaw', tank: 'Kabuto Tank', artillery: 'Hanabi Mortar', helicopter: 'Tengu Flyer', bomber: 'Koi Airship',
    hq: 'Castle', barracks: 'Dojo', turret: 'Yagura', wall: 'Ishigaki', mine: 'Boiler', workshop: 'Karakuri Works',
    airbase: 'Sky Dock', bridge: 'Taiko Bridge', ramp: 'Steps',
  },
  // Units are shown with their own sprites in menus.
  spriteIcons: true,
  icons: { hq: '🏯', barracks: '🥋', turret: '💥', wall: '🧱', mine: '♨️', workshop: '⚙️', airbase: '🎏', bridge: '🌉', ramp: '🪜' },
};
