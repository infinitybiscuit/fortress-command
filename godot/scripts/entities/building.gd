## Building — Fortress Command Building Entity
## Migrated from HTML5/JS to Godot GDScript
## Handles building stats, construction, auto-attack turrets, and training queue

class_name Building
extends StaticBody2D

## ── Enums ────────────────────────────────────────────────────────────────────
enum BuildingType { HQ, BARRACKS, TURRET, WALL, MINE, WORKSHOP, BRIDGE, RAMP }

## ── Building Stats Dictionary ─────────────────────────────────────────────────
## Hardcoded stats for each building type matching game_config.gd
const STATS: Dictionary = {
	"hq": {
		"hp": 500, "width_tiles": 4, "height_tiles": 3, "cost": 0, "build_time": 0.0,
		"provides_income": true, "income_amount": 5, "blocks_units": false,
		"auto_attack": false, "attack_damage": 0, "attack_range": 0, "attack_rate": 0.0,
		"can_train": [], "is_bridge": false, "is_ramp": false,
	},
	"barracks": {
		"hp": 200, "width_tiles": 3, "height_tiles": 2, "cost": 150, "build_time": 5.0,
		"provides_income": false, "income_amount": 0, "blocks_units": false,
		"auto_attack": false, "attack_damage": 0, "attack_range": 0, "attack_rate": 0.0,
		"can_train": ["soldier", "heavy", "scout", "sniper"], "is_bridge": false, "is_ramp": false,
	},
	"turret": {
		"hp": 120, "width_tiles": 2, "height_tiles": 2, "cost": 100, "build_time": 4.0,
		"provides_income": false, "income_amount": 0, "blocks_units": false,
		"auto_attack": true, "attack_damage": 12, "attack_range": 150, "attack_rate": 1.2,
		"can_train": [], "is_bridge": false, "is_ramp": false,
	},
	"wall": {
		"hp": 300, "width_tiles": 1, "height_tiles": 2, "cost": 40, "build_time": 2.0,
		"provides_income": false, "income_amount": 0, "blocks_units": true,
		"auto_attack": false, "attack_damage": 0, "attack_range": 0, "attack_rate": 0.0,
		"can_train": [], "is_bridge": false, "is_ramp": false,
	},
	"mine": {
		"hp": 100, "width_tiles": 2, "height_tiles": 2, "cost": 200, "build_time": 8.0,
		"provides_income": true, "income_amount": 15, "blocks_units": false,
		"auto_attack": false, "attack_damage": 0, "attack_range": 0, "attack_rate": 0.0,
		"can_train": [], "is_bridge": false, "is_ramp": false,
	},
	"workshop": {
		"hp": 180, "width_tiles": 3, "height_tiles": 2, "cost": 200, "build_time": 6.0,
		"provides_income": false, "income_amount": 0, "blocks_units": false,
		"auto_attack": false, "attack_damage": 0, "attack_range": 0, "attack_rate": 0.0,
		"can_train": ["engineer"], "is_bridge": false, "is_ramp": false,
	},
	"bridge": {
		"hp": 150, "width_tiles": 1, "height_tiles": 1, "cost_per_tile": 15, "cost": 15, "build_time": 3.0,
		"provides_income": false, "income_amount": 0, "blocks_units": false,
		"auto_attack": false, "attack_damage": 0, "attack_range": 0, "attack_rate": 0.0,
		"can_train": [], "is_bridge": true, "is_ramp": false,
	},
	"ramp": {
		"hp": 120, "width_tiles": 1, "height_tiles": 1, "cost_per_tile": 20, "cost": 20, "build_time": 4.0,
		"provides_income": false, "income_amount": 0, "blocks_units": false,
		"auto_attack": false, "attack_damage": 0, "attack_range": 0, "attack_rate": 0.0,
		"can_train": [], "is_bridge": false, "is_ramp": true,
	},
}

## ── Export Variables ───────────────────────────────────────────────────────────
@export var building_type: String = "hq"

## ── Runtime State ─────────────────────────────────────────────────────────────
var tile_x: int = 0
var tile_y: int = 0
var width_tiles: int = 4
var height_tiles: int = 3
var world_width: int = 128
var world_height: int = 96

## Health
var hp: float = 500.0
var max_hp: float = 500.0
var alive: bool = true

## Selection & Faction
var is_selected: bool = false
var faction: int = 0  # 0=blue, 1=red, 2=green, 3=yellow

## Construction
var is_constructing: bool = true
var construction_progress: float = 0.0
var build_time: float = 0.0

## Building-type specific flags
var is_bridge: bool = false
var is_ramp: bool = false
var bridge_tiles_placed: bool = false
var ramp_tiles_placed: bool = false

## Income
var provides_income: bool = false
var income_amount: int = 0

## Combat
var auto_attack: bool = false
var attack_damage: float = 0.0
var attack_range: float = 150.0
var attack_rate: float = 1.2
var attack_timer: float = 0.0
var has_exploded: bool = false  # For mines

## Training (barracks/workshop)
var can_train: Array = []
var train_queue: Array = []
var train_timer: float = 0.0
var train_current: String = ""

## ── Signals ───────────────────────────────────────────────────────────────────
signal health_changed(new_health: float, max_health: float)
signal building_destroyed(building: Node)
signal construction_completed(building: Node)
signal unit_trained(unit_type: String)
signal income_generated(amount: int)

## ── Node References ────────────────────────────────────────────────────────────
@onready var sprite: Sprite2D = $Sprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D

## ── Initialization ─────────────────────────────────────────────────────────────
func _ready() -> void:
	_load_stats()
	# If build_time is 0, building is instantly complete
	if build_time <= 0.0:
		is_constructing = false
		construction_progress = 1.0

## Load stats from hardcoded STATS dictionary based on building_type
func _load_stats() -> void:
	if STATS.has(building_type):
		var stats: Dictionary = STATS[building_type]
		max_hp = stats.get("hp", 100.0)
		hp = max_hp
		width_tiles = stats.get("width_tiles", 2)
		height_tiles = stats.get("height_tiles", 2)
		build_time = stats.get("build_time", 0.0)
		provides_income = stats.get("provides_income", false)
		income_amount = stats.get("income_amount", 0)
		auto_attack = stats.get("auto_attack", false)
		attack_damage = stats.get("attack_damage", 0.0)
		attack_range = stats.get("attack_range", 0.0)
		attack_rate = stats.get("attack_rate", 1.0)
		can_train = stats.get("can_train", [])
		is_bridge = stats.get("is_bridge", false)
		is_ramp = stats.get("is_ramp", false)
		
		# Calculate world size from tile count
		var tile_size: int = 32  # GameConfig.TILE_SIZE
		world_width = width_tiles * tile_size
		world_height = height_tiles * tile_size
		
		# Start constructing if build_time > 0
		is_constructing = build_time > 0.0
		construction_progress = 0.0

## ── Rendering ─────────────────────────────────────────────────────────────────────
func _draw() -> void:
	var cam: Camera2D = get_viewport().get_camera_2d()
	var cam_offset: Vector2 = Vector2.ZERO
	if cam != null:
		cam_offset = cam.global_position
	GameRenderer.draw_building(self, self, cam_offset)

## ── Process ───────────────────────────────────────────────────────────────────
func _process(delta: float) -> void:
	if not alive:
		return
	
	# Trigger redraw every frame — _draw() only fires when queue_redraw() is called
	queue_redraw()
	
	# Handle construction progress
	if is_constructing:
		construction_progress += delta / build_time
		if construction_progress >= 1.0:
			construction_progress = 1.0
			is_constructing = false
			construction_completed.emit(self)
	
	# Auto-attack turret logic
	if auto_attack and not is_constructing:
		if attack_timer > 0:
			attack_timer -= delta
		else:
			_scan_and_attack()

## ── Auto-Attack Turret Logic ───────────────────────────────────────────────────
func _scan_and_attack() -> void:
	# Scan for enemy units within attack_range
	var targets: Array = get_tree().get_nodes_in_group("units")
	var nearest_target: Node = null
	var nearest_distance: float = attack_range
	
	for target in targets:
		if target == self:
			continue
		# Check if target is an enemy (would need faction comparison)
		var distance: float = global_position.distance_to(target.global_position)
		if distance < nearest_distance:
			nearest_distance = distance
			nearest_target = target
	
	if nearest_target != null and is_instance_valid(nearest_target):
		_attack_target(nearest_target)

func _attack_target(target: Node) -> void:
	if target == null or not is_instance_valid(target):
		return
	
	# Fire attack
	attack_timer = attack_rate
	if target.has_method("take_damage"):
		target.take_damage(attack_damage)
		# Emit signal for projectile/effects system
		emit_signal("attack_fired", target, attack_damage)

signal attack_fired(target: Node, damage: float)

## ── Training Queue ─────────────────────────────────────────────────────────────
func queue_train(unit_type: String) -> bool:
	# Check if this building can train this unit type
	if not can_train.has(unit_type):
		return false
	
	train_queue.append(unit_type)
	if train_current == "":
		_start_next_train()
	return true

func _start_next_train() -> void:
	if train_queue.size() == 0:
		return
	var unit_type: String = train_queue.pop_front()
	train_current = unit_type
	# Get train time from GameConfig
	var config_node: Node = get_tree().get_root().get_node_or_null("GameManager")
	if config_node and config_node.has_method("get_unit_train_time"):
		train_timer = config_node.get_unit_train_time(unit_type)
	else:
		# Fallback default train times
		var train_times: Dictionary = {
			"soldier": 3.0, "heavy": 6.0, "scout": 1.5,
			"engineer": 4.0, "sniper": 8.0
		}
		train_timer = train_times.get(unit_type, 3.0)

func _process_training(delta: float) -> void:
	if train_current == "" and train_queue.size() > 0:
		_start_next_train()
		return
	
	if train_current != "":
		train_timer -= delta
		if train_timer <= 0:
			var finished_unit: String = train_current
			train_current = ""
			train_timer = 0.0
			unit_trained.emit(finished_unit)
			# Start next training if queue has more
			_start_next_train()

## ── Combat Methods ─────────────────────────────────────────────────────────────
func take_damage(amount: float) -> void:
	if not alive:
		return
	
	hp -= amount
	health_changed.emit(hp, max_hp)
	
	if hp <= 0:
		hp = 0
		die()

func die() -> void:
	alive = false
	building_destroyed.emit(self)
	# Remove collision to unblock path
	if collision_shape:
		collision_shape.disabled = true

func repair(amount: float) -> void:
	if not alive:
		return
	if hp < max_hp:
		hp = min(hp + amount, max_hp)
		health_changed.emit(hp, max_hp)

## ── Income ────────────────────────────────────────────────────────────────────
func generate_income() -> int:
	if alive and provides_income and not is_constructing:
		return income_amount
	return 0

## ── Utility Methods ──────────────────────────────────────────────────────────
func get_world_size() -> Vector2:
	return Vector2(world_width, world_height)

func can_attack_now() -> bool:
	return auto_attack and not is_constructing and attack_timer <= 0

func perform_attack() -> void:
	attack_timer = attack_rate