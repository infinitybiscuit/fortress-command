// Fortress Command (web) — game constants.
// Ported from godot/scripts/autoload/game_config.gd and the STATS tables in
// unit.gd / building.gd. Gameplay stats for units come from unit.gd (the
// values the Godot build actually plays with); cost/train time from game_config.gd.

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
};

export const BUILDING_TYPES = {
  hq:       { hp: 500, w: 4, h: 3, cost: 0,   buildTime: 0,   income: 5 },
  barracks: { hp: 200, w: 3, h: 2, cost: 150, buildTime: 5.0, canTrain: ['soldier', 'heavy', 'scout', 'sniper'] },
  turret:   { hp: 120, w: 2, h: 2, cost: 100, buildTime: 4.0, autoAttack: true, damage: 12, range: 150, rate: 1.2 },
  wall:     { hp: 300, w: 1, h: 2, cost: 40,  buildTime: 2.0, blocksUnits: true },
  mine:     { hp: 100, w: 2, h: 2, cost: 200, buildTime: 8.0, income: 15 },
  workshop: { hp: 180, w: 3, h: 2, cost: 200, buildTime: 6.0, canTrain: ['engineer'] },
  bridge:   { hp: 150, w: 1, h: 1, cost: 15,  buildTime: 3.0, isBridge: true },
  ramp:     { hp: 120, w: 1, h: 1, cost: 20,  buildTime: 4.0, isRamp: true },
};

export const BUILD_MENU = ['barracks', 'turret', 'wall', 'mine', 'workshop', 'bridge', 'ramp'];
export const BUILD_ICONS = {
  barracks: '⚔️', turret: '🗼', wall: '🧱', mine: '⛏️', workshop: '🔧', bridge: '🌉', ramp: '🔼',
};
export const UNIT_ICONS = {
  soldier: '🪖', heavy: '🛡️', scout: '🏃', engineer: '🔩', sniper: '🎯',
};

export const PLAYER_COLORS = [
  [0.2, 0.6, 1.0], // blue
  [1.0, 0.3, 0.3], // red
  [0.3, 0.9, 0.3], // green
  [1.0, 0.8, 0.2], // yellow
];
export const PLAYER_NAMES = ['Blue', 'Red', 'Green', 'Yellow'];

// Game modes. Each entry lists one player per HQ: [hq tile x, is AI].
export const MODES = {
  cpu:  { label: '1 vs CPU',         players: [[2, false], [193, true]], startSoldiers: true },
  local:{ label: '1 vs 1 Local',     players: [[2, false], [193, false]], startSoldiers: true },
  ffa3: { label: 'Free-for-All (3)', players: [[2, false], [97, true], [193, true]] },
  ffa4: { label: 'Free-for-All (4)', players: [[2, false], [60, true], [130, true], [193, true]] },
};

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
