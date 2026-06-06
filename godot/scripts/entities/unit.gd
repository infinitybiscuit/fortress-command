## Unit — Fortress Command Unit Entity
## Migrated from HTML5/JS to Godot GDScript
## Handles movement, combat, repair, and state management via CharacterBody2D

class_name Unit
extends CharacterBody2D

## ── Enums ────────────────────────────────────────────────────────────────────
enum State { IDLE, MOVING, ATTACKING, REPAIRING, DEAD }
enum Faction { PLAYER_1, PLAYER_2, PLAYER_3, PLAYER_4 }

## ── Physics Constants ─────────────────────────────────────────────────────────
const GRAVITY: float = 900.0
const TERMINAL_VELOCITY: float = 600.0
const JUMP_VELOCITY: float = -360.0

## ── Unit Stats Dictionary ─────────────────────────────────────────────────────
## Hardcoded stats for each unit type: soldier, heavy, scout, engineer, sniper
const STATS: Dictionary = {
	"soldier": {
		"health": 100.0,
		"max_health": 100.0,
		"speed": 150.0,
		"attack_range": 100.0,
		"attack_damage": 15.0,
		"attack_cooldown": 0.5,
		"repair_rate": 0.0,
		"jump_velocity": -360.0
	},
	"heavy": {
		"health": 200.0,
		"max_health": 200.0,
		"speed": 80.0,
		"attack_range": 80.0,
		"attack_damage": 30.0,
		"attack_cooldown": 1.0,
		"repair_rate": 0.0,
		"jump_velocity": -300.0
	},
	"scout": {
		"health": 60.0,
		"max_health": 60.0,
		"speed": 220.0,
		"attack_range": 70.0,
		"attack_damage": 8.0,
		"attack_cooldown": 0.3,
		"repair_rate": 0.0,
		"jump_velocity": -400.0
	},
	"engineer": {
		"health": 80.0,
		"max_health": 80.0,
		"speed": 120.0,
		"attack_range": 60.0,
		"attack_damage": 5.0,
		"attack_cooldown": 0.5,
		"repair_rate": 15.0,
		"jump_velocity": -360.0
	},
	"sniper": {
		"health": 50.0,
		"max_health": 50.0,
		"speed": 100.0,
		"attack_range": 250.0,
		"attack_damage": 45.0,
		"attack_cooldown": 1.5,
		"repair_rate": 0.0,
		"jump_velocity": -360.0
	}
}

## ── Export Variables ───────────────────────────────────────────────────────────
@export var unit_type: String = "soldier"
@export var faction: Faction = Faction.PLAYER_1

## ── Runtime State ─────────────────────────────────────────────────────────────
var current_state: State = State.IDLE
var is_selected: bool = false

## Current stats (populated from STATS based on unit_type)
var health: float = 100.0
var max_health: float = 100.0
var speed: float = 150.0
var attack_range: float = 100.0
var attack_damage: float = 15.0
var attack_cooldown: float = 0.5
var repair_rate: float = 0.0
var jump_velocity: float = JUMP_VELOCITY

## Target references
var move_target: Vector2 = Vector2.ZERO
var attack_target_ref: Node = null
var repair_target_ref: Node = null

## Attack cooldown timer
var attack_cooldown_timer: float = 0.0

## ── Signals ───────────────────────────────────────────────────────────────────
signal health_changed(new_health: float, max_health: float)
signal unit_died(unit: Node)
signal attack_fired(target: Node, damage: float)
signal repair_performed(target: Node, amount: float)
signal state_changed(new_state: State)

## ── Node References ────────────────────────────────────────────────────────────
@onready var sprite: Sprite2D = $Sprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D

## Reference to the tilemap for manual tile collision (set on spawn; falls back to group)
var tilemap_ref: Node = null
var on_ground: bool = false
var _body_w: float = 16.0
var _body_h: float = 24.0

## ── Initialization ──────────────────────────────────────────────────────────────
func _ready() -> void:
	_load_stats()
	add_to_group("units")
	current_state = State.IDLE
	# Cache body dimensions from the collision shape for tile collision
	if collision_shape and collision_shape.shape is RectangleShape2D:
		_body_w = collision_shape.shape.size.x
		_body_h = collision_shape.shape.size.y
	if tilemap_ref == null:
		tilemap_ref = get_tree().get_first_node_in_group("tilemap")

## ── Rendering ─────────────────────────────────────────────────────────────────
func _draw() -> void:
	var cam: Camera2D = get_viewport().get_camera_2d()
	var cam_offset: Vector2 = Vector2.ZERO
	if cam != null:
		cam_offset = cam.global_position
	GameRenderer.draw_unit(self, self, cam_offset)

## Load stats from the hardcoded STATS dictionary based on unit_type
func _load_stats() -> void:
	if STATS.has(unit_type):
		var stats: Dictionary = STATS[unit_type]
		health = stats.get("health", 100.0)
		max_health = stats.get("max_health", 100.0)
		speed = stats.get("speed", 150.0)
		attack_range = stats.get("attack_range", 100.0)
		attack_damage = stats.get("attack_damage", 15.0)
		attack_cooldown = stats.get("attack_cooldown", 0.5)
		repair_rate = stats.get("repair_rate", 0.0)
		self.jump_velocity = stats.get("jump_velocity", JUMP_VELOCITY)

## ── Physics Process ───────────────────────────────────────────────────────────
func _physics_process(delta: float) -> void:
	# Clamp delta to prevent large jumps on lag spikes
	delta = min(delta, 0.25)

	# Trigger redraw every frame — _draw() only fires when queue_redraw() is called
	queue_redraw()

	# Handle state-based behavior (sets velocity.x)
	match current_state:
		State.IDLE:
			_velocity_idle()
		State.MOVING:
			_velocity_move_to_target()
		State.ATTACKING:
			_velocity_attack()
		State.REPAIRING:
			_velocity_repair(delta)
		State.DEAD:
			velocity = Vector2.ZERO

	# Manual tile-based physics (the tilemap has no Godot collision bodies)
	_apply_physics(delta)

## Manual AABB tile collision against the tilemap, ported from the JS version.
## Treats global_position as the unit's bottom-centre (feet).
func _apply_physics(delta: float) -> void:
	if tilemap_ref == null:
		tilemap_ref = get_tree().get_first_node_in_group("tilemap")
	if tilemap_ref == null:
		return

	var ts: int = 32
	var half_w: float = _body_w / 2.0
	var h: float = _body_h

	# Gravity
	velocity.y += GRAVITY * delta
	if velocity.y > TERMINAL_VELOCITY:
		velocity.y = TERMINAL_VELOCITY

	# ── Horizontal movement with collision ──
	var new_x: float = position.x + velocity.x * delta
	if velocity.x != 0.0:
		var dir: int = 1 if velocity.x > 0.0 else -1
		var probe_x: float = new_x + dir * half_w
		var tx: int = int(floor(probe_x / ts))
		var ty_top: int = int(floor((position.y - h + 2.0) / ts))
		var ty_bot: int = int(floor((position.y - 2.0) / ts))
		var blocked: bool = false
		for ty in range(ty_top, ty_bot + 1):
			if tilemap_ref.is_solid(tx, ty):
				blocked = true
				break
		if blocked:
			if dir > 0:
				new_x = tx * ts - half_w
			else:
				new_x = (tx + 1) * ts + half_w
			velocity.x = 0.0
	position.x = new_x

	# ── Vertical movement with sweep collision ──
	var new_y: float = position.y + velocity.y * delta
	var tx_l: int = int(floor((position.x - half_w + 2.0) / ts))
	var tx_r: int = int(floor((position.x + half_w - 2.0) / ts))
	on_ground = false

	if velocity.y >= 0.0:
		# Moving down — sweep every row from old feet to new feet
		var old_feet: int = int(floor(position.y / ts))
		var new_feet: int = int(floor(new_y / ts))
		var landed: bool = false
		for ty in range(old_feet, new_feet + 1):
			for tx2 in range(tx_l, tx_r + 1):
				if tilemap_ref.is_solid(tx2, ty):
					new_y = ty * ts
					velocity.y = 0.0
					on_ground = true
					landed = true
					break
			if landed:
				break
	else:
		# Moving up — check the head row
		var head_ty: int = int(floor((new_y - h) / ts))
		for tx2 in range(tx_l, tx_r + 1):
			if tilemap_ref.is_solid(tx2, head_ty):
				new_y = (head_ty + 1) * ts + h
				velocity.y = 0.0
				break
	position.y = new_y

## ── State Velocity Handlers ────────────────────────────────────────────────────
var _auto_attack_timer: float = 0.0
const _AUTO_ATTACK_INTERVAL: float = 0.5

func _velocity_idle() -> void:
	velocity.x = 0.0
	# Scan for nearby enemies every half-second
	_auto_attack_timer -= get_physics_process_delta_time()
	if _auto_attack_timer <= 0.0:
		_auto_attack_timer = _AUTO_ATTACK_INTERVAL
		_scan_for_enemy()

func _velocity_move_to_target() -> void:
	# Horizontal-only steering — gravity owns the vertical axis
	var dx: float = move_target.x - global_position.x
	if abs(dx) < 6.0:
		velocity.x = 0.0
		_set_state(State.IDLE)
	else:
		velocity.x = sign(dx) * speed

func _velocity_attack() -> void:
	velocity.x = 0.0
	if attack_target_ref != null and is_instance_valid(attack_target_ref):
		var distance: float = global_position.distance_to(attack_target_ref.global_position)
		if distance > attack_range:
			attack_target_ref = null
			_set_state(State.IDLE)
		else:
			fire_at_target()
	else:
		attack_target_ref = null
		_set_state(State.IDLE)

func _velocity_repair(delta: float) -> void:
	velocity.x = 0.0
	# Check if repair target is still valid
	if repair_target_ref != null and is_instance_valid(repair_target_ref):
		if repair_rate > 0.0:
			_repair_step(repair_target_ref, delta)
	else:
		repair_target_ref = null
		_set_state(State.IDLE)

## ── State Transitions ──────────────────────────────────────────────────────────
func _set_state(new_state: State) -> void:
	if current_state != new_state:
		current_state = new_state
		state_changed.emit(new_state)

## ── Combat Methods ─────────────────────────────────────────────────────────────
func attack_target(target: Node) -> void:
	if current_state == State.DEAD:
		return
	attack_target_ref = target
	_set_state(State.ATTACKING)

## Fire attack at target (callable from attack state)
func fire_at_target() -> void:
	if attack_target_ref == null or not is_instance_valid(attack_target_ref):
		return

	# Update cooldown
	if attack_cooldown_timer > 0.0:
		return
	attack_cooldown_timer = attack_cooldown

	# Check range
	var distance: float = global_position.distance_to(attack_target_ref.global_position)
	print("FIRE: ", unit_type, " -> ", attack_target_ref.get("unit_type"), " range=", distance, " attack_range=", attack_range, " cooldown=", attack_cooldown_timer)
	if distance <= attack_range:
		# Damage is applied by the spawned projectile on impact
		attack_fired.emit(attack_target_ref, attack_damage)

func take_damage(amount: float) -> void:
	if current_state == State.DEAD:
		return

	health -= amount
	health_changed.emit(health, max_health)
	print("TAKE_DAMAGE: ", unit_type, " faction=", faction, " health=", health, " dmg=", amount)

	if health <= 0.0:
		health = 0.0
		print("DIE: ", unit_type, " faction=", faction)
		die()

func die() -> void:
	_set_state(State.DEAD)
	velocity = Vector2.ZERO
	unit_died.emit(self)

## ── Repair Methods ─────────────────────────────────────────────────────────────
func repair_target(target: Node) -> void:
	if current_state == State.DEAD:
		return
	if repair_rate <= 0.0:
		return
	repair_target_ref = target
	_set_state(State.REPAIRING)

func _repair_step(target: Node, delta: float) -> void:
	if target == null or not is_instance_valid(target):
		_set_state(State.IDLE)
		return
	
	# Check if target needs repair
	if target.has_method("repair"):
		var repair_amount: float = repair_rate * delta
		target.repair(repair_amount)
		repair_performed.emit(target, repair_amount)

func repair(amount: float) -> void:
	health = min(health + amount, max_health)
	health_changed.emit(health, max_health)

## ── Movement Methods ───────────────────────────────────────────────────────────
func move_to(target_position: Vector2) -> void:
	if current_state == State.DEAD:
		return
	move_target = target_position
	_set_state(State.MOVING)

## ── Selection Methods ──────────────────────────────────────────────────────────
func select() -> void:
	is_selected = true
	# Visual feedback could be added here (e.g., highlight sprite)
	if sprite:
		sprite.modulate = Color(1.2, 1.2, 1.0)  # Slight brightening

func deselect() -> void:
	is_selected = false
	# Remove visual feedback
	if sprite:
		sprite.modulate = Color(1.0, 1.0, 1.0)  # Normal color

func _scan_for_enemy() -> void:
	var closest: Node = null
	var closest_dist: float = attack_range
	for enemy in get_tree().get_nodes_in_group("units"):
		if not is_instance_valid(enemy) or enemy == self:
			continue
		if enemy.get("faction") == faction:
			continue
		if enemy.get("current_state") == State.DEAD:
			continue
		var d: float = global_position.distance_to(enemy.global_position)
		if d < closest_dist:
			closest_dist = d
			closest = enemy
	if closest != null:
		attack_target(closest)

## ── Utility ───────────────────────────────────────────────────────────────────
func get_facing() -> int:
	return 1 if velocity.x >= 0.0 else -1

## Drawn bounding box in world space (global_position is the unit's feet)
func get_bounds() -> Rect2:
	return Rect2(global_position - Vector2(_body_w / 2.0, _body_h), Vector2(_body_w, _body_h))

## True if a world point falls within the unit's body (with a little click padding)
func contains_point(world_point: Vector2) -> bool:
	return get_bounds().grow(6.0).has_point(world_point)

## ── Cooldown Timer Update ──────────────────────────────────────────────────────
func _process(delta: float) -> void:
	if attack_cooldown_timer > 0.0:
		attack_cooldown_timer -= delta
		if attack_cooldown_timer < 0.0:
			attack_cooldown_timer = 0.0