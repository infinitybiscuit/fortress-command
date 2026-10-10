// Fortress Command (web) — game constants.
// Ported from godot/scripts/autoload/game_config.gd and the STATS tables in
// unit.gd / building.gd. Gameplay stats for units come from unit.gd (the
// values the Godot build actually plays with); cost/train time from game_config.gd.

// Shown on the title and pause screens so it's easy to tell which build is running.
export const VERSION = 'v14 · Pixel art';

// Cloudflare Worker (see /relay) that hands out TURN relay credentials, used
// when two phones can't connect directly. Leave empty to connect direct-only.
export const RELAY_URL = 'https://fortress-relay.tj-coles.workers.dev/';

export const TILE_SIZE = 32;
export const MAP_W = 200;
export const MAP_H = 20;
export const WORLD_W = MAP_W * TILE_SIZE; // 6400
export const WORLD_H = MAP_H * TILE_SIZE; // 640
export const GROUND_LEVEL_TILE = 3;
export const PLATFORM_ROWS = [3, 7, 11];

export const TILE_EMPTY = 0;
export const TILE_GROUND = 1;
export const TILE_PLATFORM = 2;
export const TILE_BRIDGE = 3;
export const TILE_RAMP = 4;

export const GRAVITY = 900;
export const TERMINAL_VELOCITY = 600;

export const ECONOMY_TICK = 1.0;
export const AI_TICK = 2.0;
export const MAX_DELTA = 0.25;
export const STARTING_MONEY = 500;
// New structures must sit within this many tiles (sideways) of one of your
// zone-extending buildings — no dropping a Barracks next to the enemy HQ.
export const BUILD_RADIUS_TILES = 8;
export const LOW_CREDITS = 50;

export const PROJECTILE_SPEED = 350;
export const PROJECTILE_RADIUS = 3;

export const UNIT_W = 20;
export const UNIT_H = 28;

export const UNIT_TYPES = {
  soldier:  { hp: 100, speed: 150, range: 100, damage: 15, cooldown: 0.5, repair: 0,  cost: 50,  trainTime: 3.0 },
  heavy:    { hp: 200, speed: 80,  range: 80,  damage: 30, cooldown: 1.0, repair: 0,  cost: 120, trainTime: 6.0 },
  scout:    { hp: 60,  speed: 220, range: 70,  damage: 8,  cooldown: 0.3, repair: 0,  cost: 30,  trainTime: 1.5 },
  engineer: { hp: 80,  speed: 120, range: 60,  damage: 5,  cooldown: 0.5, repair: 15, cost: 60,  trainTime: 4.0 },
  sniper:   { hp: 50,  speed: 100, range: 250, damage: 45, cooldown: 1.5, repair: 0,  cost: 200, trainTime: 8.0 },
  // Workshop vehicles. splash = blast radius (other targets inside take half damage);
  // vsBuildings = damage multiplier against structures; lob = arcing shell fired at a spot.
  jeep:      { hp: 160, speed: 240, range: 110, damage: 10, cooldown: 0.35, repair: 0, cost: 120, trainTime: 6.0,
               vehicle: true, w: 34, h: 20, shot: 'bullet' },
  tank:      { hp: 450, speed: 70,  range: 150, damage: 40, cooldown: 1.8,  repair: 0, cost: 300, trainTime: 12.0,
               vehicle: true, w: 42, h: 26, shot: 'shell', splash: 40, vsBuildings: 1.25 },
  artillery: { hp: 140, speed: 55,  range: 340, damage: 60, cooldown: 3.5,  repair: 0, cost: 260, trainTime: 10.0,
               vehicle: true, w: 40, h: 24, shot: 'lob', splash: 60, vsBuildings: 1.75 },
  // Airbase aircraft: fly over terrain and walls. Only bullets (infantry, jeeps,
  // helicopters) and turrets can hit them; tanks and artillery can't.
  // hover = how far above its target a helicopter holds; altitude = bomber cruise height (world y).
  helicopter: { hp: 220, speed: 170, range: 105, damage: 14, cooldown: 0.35, repair: 0, cost: 260, trainTime: 10.0,
                air: true, w: 42, h: 18, shot: 'bullet', hover: 60 },
  bomber:     { hp: 320, speed: 150, range: 0,   damage: 110, cooldown: 2.2, repair: 0, cost: 400, trainTime: 15.0,
                air: true, w: 58, h: 18, shot: 'bomb', splash: 55, vsBuildings: 1.6, altitude: 250 },
};

export const BUILDING_TYPES = {
  hq:       { hp: 500, w: 4, h: 3, cost: 0,   buildTime: 0,   income: 5 },
  barracks: { hp: 200, w: 3, h: 2, cost: 150, buildTime: 5.0, canTrain: ['soldier', 'heavy', 'scout', 'sniper'] },
  // airRange: turrets double as anti-aircraft guns with a much longer reach upward.
  turret:   { hp: 120, w: 2, h: 2, cost: 100, buildTime: 4.0, autoAttack: true, damage: 12, range: 150, rate: 1.2, airRange: 420, airDamage: 30 },
  // Walls take half damage from bullets (shells and artillery hit them fully).
  // noZone: can be built inside your zone but doesn't extend it (stops cheap chains across the map).
  wall:     { hp: 1000, w: 1, h: 2, cost: 50, buildTime: 3.0, blocksUnits: true, bulletResist: 0.5, noZone: true },
  mine:     { hp: 100, w: 2, h: 2, cost: 200, buildTime: 8.0, income: 15 },
  workshop: { hp: 180, w: 3, h: 2, cost: 200, buildTime: 6.0, canTrain: ['engineer', 'jeep', 'tank', 'artillery'] },
  airbase:  { hp: 300, w: 4, h: 2, cost: 300, buildTime: 10.0, canTrain: ['helicopter', 'bomber'] },
  bridge:   { hp: 150, w: 1, h: 1, cost: 15,  buildTime: 3.0, isBridge: true, noZone: true },
  ramp:     { hp: 120, w: 1, h: 1, cost: 20,  buildTime: 4.0, isRamp: true, noZone: true },
};

export const BUILD_MENU = ['barracks', 'turret', 'wall', 'mine', 'workshop', 'airbase', 'bridge', 'ramp'];
export const BUILD_ICONS = {
  barracks: '⚔️', turret: '🗼', wall: '🧱', mine: '⛏️', workshop: '🔧', airbase: '🛫', bridge: '🌉', ramp: '🔼',
};
export const UNIT_ICONS = {
  soldier: '🪖', heavy: '🛡️', scout: '🏃', engineer: '🔩', sniper: '🎯', helicopter: '🚁', bomber: '✈️',
  jeep: vehicleIcon('<rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7 9l2-4h6l2 4z"/><rect x="14" y="3" width="8" height="2"/><circle cx="7" cy="17" r="2.6" fill="#222" stroke="#bbb"/><circle cx="17" cy="17" r="2.6" fill="#222" stroke="#bbb"/>'),
  tank: vehicleIcon('<rect x="2" y="13" width="20" height="6" rx="3" fill="#333" stroke="#999"/><rect x="4" y="9" width="16" height="5" rx="1"/><rect x="8" y="5" width="8" height="5" rx="1.5"/><rect x="15" y="6.5" width="8" height="2"/>'),
  artillery: vehicleIcon('<rect x="3" y="12" width="15" height="5" rx="1"/><path d="M8 12l12-9 1.5 1.8L11 12z"/><circle cx="6" cy="18.5" r="2.5" fill="#222" stroke="#bbb"/><circle cx="15" cy="18.5" r="2.5" fill="#222" stroke="#bbb"/>'),
};

function vehicleIcon(body) {
  return `<svg class="vic" viewBox="0 0 24 22" fill="#8fb3d9" stroke-width="1">${body}</svg>`;
}

export const PLAYER_COLORS = [
  [0.2, 0.6, 1.0], // blue
  [1.0, 0.3, 0.3], // red
  [0.3, 0.9, 0.3], // green
  [1.0, 0.8, 0.2], // yellow
];
export const PLAYER_NAMES = ['Blue', 'Red', 'Green', 'Yellow'];

// Game modes. Each entry lists one player per HQ: [hq tile x, is AI].
export const MODES = {
  cpu:  { label: '1 vs CPU',         players: [[2, false], [193, true]] },
  local:{ label: '1 vs 1 Local',     players: [[2, false], [193, false]] },
  // Two phones over the internet: the host plays Blue, the guest plays Red.
  online: { label: '🌐 Online 1 vs 1', players: [[2, false], [193, false]], online: true },
  // Free-for-All maps loop: walk off one edge and you come back on the other,
  // so HQs are spaced evenly around the loop and nobody gets a safe edge.
  ffa3: { label: 'Free-for-All (3)', players: [[12, false], [79, true], [146, true]], wrap: true },
  ffa4: { label: 'Free-for-All (4)', players: [[12, false], [62, true], [112, true], [162, true]], wrap: true },
};

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
