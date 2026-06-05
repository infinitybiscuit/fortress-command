class_name GameConfig
extends Node

# ===== Map & Tiles =====
const TILE_SIZE: int = 32
const MAP_WIDTH_TILES: int = 200
const MAP_HEIGHT_TILES: int = 20
const GROUND_LEVEL_TILE: int = 3
const PLATFORM_ROWS: Array = [3, 7, 11]
const PLATFORM_MIN_LEN: int = 4
const PLATFORM_MAX_LEN: int = 12

# ===== Tile Types =====
const TILE_EMPTY: int = 0
const TILE_GROUND: int = 1
const TILE_PLATFORM: int = 2
const TILE_BRIDGE: int = 3
const TILE_RAMP: int = 4

# ===== Physics =====
const GRAVITY: int = 900
const TERMINAL_VELOCITY: int = 600
const JUMP_VELOCITY: int = -360

# ===== Camera =====
const CAMERA_SCROLL_SPEED: int = 400
const CAMERA_EDGE_MARGIN: int = 80
const CAMERA_LERP: float = 0.08

# ===== Economy =====
const STARTING_CREDITS: int = 300
const CREDIT_TICK_INTERVAL: float = 1.0
const BASE_INCOME: int = 5

# ===== UI Dimensions =====
const HUD_HEIGHT: int = 80
const MINIMAP_W: int = 180
const MINIMAP_H: int = 40
const BUILD_MENU_W: int = 260

# ===== Projectile =====
const PROJECTILE_SPEED: int = 350
const PROJECTILE_RADIUS: int = 3
const MINE_DAMAGE: int = 80
const DEFAULT_PROJECTILE_RANGE: int = MAP_HEIGHT_TILES * TILE_SIZE * 5 / 2
const SNIPER_RANGE: int = MAP_WIDTH_TILES * TILE_SIZE / 2

# ===== AI =====
const AI_THINK_INTERVAL: float = 2.0
const AI_AGGRESSION_RAMP: float = 0.01

# ===== Unit Types =====
const UNIT_TYPES: Dictionary = {
	soldier: {
		hp: 30, speed: 80, damage: 8, attack_range: 40, attack_rate: 0.8,
		cost: 50, train_time: 3.0, width: 12, height: 20,
		can_build: false, can_repair: false, repair_rate: 0,
	},
	heavy: {
		hp: 80, speed: 45, damage: 20, attack_range: 35, attack_rate: 1.5,
		cost: 120, train_time: 6.0, width: 16, height: 22,
		can_build: false, can_repair: false, repair_rate: 0,
	},
	scout: {
		hp: 15, speed: 140, damage: 5, attack_range: 30, attack_rate: 0.4,
		cost: 30, train_time: 1.5, width: 10, height: 18,
		can_build: false, can_repair: false, repair_rate: 0,
	},
	engineer: {
		hp: 20, speed: 70, damage: 3, attack_range: 25, attack_rate: 1.0,
		cost: 60, train_time: 4.0, width: 12, height: 20,
		can_build: true, can_repair: true, repair_rate: 5,
	},
	sniper: {
		hp: 60, speed: 55, damage: 30, attack_range: 1500, attack_rate: 10.0,
		cost: 200, train_time: 8.0, width: 14, height: 22,
		can_build: false, can_repair: false, repair_rate: 0,
		projectile_range: SNIPER_RANGE,
	},
}

# ===== Building Types =====
const BUILDING_TYPES: Dictionary = {
	hq: {
		hp: 500, width_tiles: 4, height_tiles: 3, cost: 0, build_time: 0,
		provides_income: true, income_amount: 5,
		blocks_units: false,
	},
	barracks: {
		hp: 200, width_tiles: 3, height_tiles: 2, cost: 150, build_time: 5.0,
		can_train: ["soldier", "heavy", "scout", "sniper"],
	},
	turret: {
		hp: 120, width_tiles: 2, height_tiles: 2, cost: 100, build_time: 4.0,
		auto_attack: true, attack_damage: 12, attack_range: 150, attack_rate: 1.2,
	},
	wall: {
		hp: 300, width_tiles: 1, height_tiles: 2, cost: 40, build_time: 2.0,
		blocks_units: true,
	},
	mine: {
		hp: 100, width_tiles: 2, height_tiles: 2, cost: 200, build_time: 8.0,
		blocks_units: false,
		provides_income: true, income_amount: 15,
	},
	workshop: {
		hp: 180, width_tiles: 3, height_tiles: 2, cost: 200, build_time: 6.0,
		can_train: ["engineer"],
	},
	bridge: {
		hp: 150, width_tiles: 1, height_tiles: 1,
		cost_per_tile: 15, cost: 15, build_time: 3.0, is_bridge: true,
	},
	ramp: {
		hp: 120, width_tiles: 1, height_tiles: 1,
		cost_per_tile: 20, cost: 20, build_time: 4.0, is_ramp: true,
	},
}

# ===== Player Colors [r,g,b] 0-1 =====
const PLAYER_COLORS: Array = [
	[0.2, 0.6, 1.0],  # blue
	[1.0, 0.3, 0.3],  # red
	[0.3, 0.9, 0.3],  # green
	[1.0, 0.8, 0.2],  # yellow
]