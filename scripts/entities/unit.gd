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
@onready var camera: Camera2D = $Camera2D

## ── Initialization ──────────────────────────────────────────────────────────────
func _ready() -> void:
	_load_stats()
	current_state = State.IDLE
	_setup_camera()

## Set up the UnitCamera with world bounds clamping
func _setup_camera() -> void:
	var cam: UnitCamera = UnitCamera.new()
	cam.follow_target = self
	cam.make_current()
	camera = cam

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
		jump_velocity = stats.get("jump_velocity", JUMP_VELOCITY)

## ── Physics Process ───────────────────────────────────────────────────────────
func _physics_process(delta: float) -> void:
	# Clamp delta to prevent large jumps on lag spikes
	delta = min(delta, 0.25)
	
	# Apply gravity
	if not is_on_floor():
		velocity.y += GRAVITY * delta
		velocity.y = min(velocity.y, TERMINAL_VELOCITY)
	
	# Handle state-based behavior
	match current_state:
		State.IDLE:
			_velocity_idle()
		State.MOVING:
			_velocity_move_to_target()
		State.ATTACKING:
			_velocity_attack()
		State.REPAIRING:
			_velocity_repair()
		State.DEAD:
			velocity = Vector2.ZERO
	
	# Apply movement
	move_and_slide()

## ── State Velocity Handlers ────────────────────────────────────────────────────
func _velocity_idle() -> void:
	velocity.x = 0.0

func _velocity_move_to_target() -> void:
	var direction: Vector2 = (move_target - global_position).normalized()
	velocity.x = direction.x * speed
	# Stop when close to target
	if global_position.distance_to(move_target) < 5.0:
		_set_state(State.IDLE)
		velocity.x = 0.0

func _velocity_attack() -> void:
	velocity.x = 0.0
	# Check if target is still valid and in range
	if attack_target_ref != null and is_instance_valid(attack_target_ref):
		var distance: float = global_position.distance_to(attack_target_ref.global_position)
		if distance > attack_range:
			# Target out of range, stop attacking
			attack_target_ref = null
			_set_state(State.IDLE)
	else:
		attack_target_ref = null
		_set_state(State.IDLE)

func _velocity_repair() -> void:
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
	if distance <= attack_range:
		attack_fired.emit(attack_target_ref, attack_damage)
		attack_target_ref.take_damage(attack_damage)

func take_damage(amount: float) -> void:
	if current_state == State.DEAD:
		return
	
	health -= amount
	health_changed.emit(health, max_health)
	
	if health <= 0.0:
		health = 0.0
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

## ── Cooldown Timer Update ──────────────────────────────────────────────────────
func _process(delta: float) -> void:
	if attack_cooldown_timer > 0.0:
		attack_cooldown_timer -= delta
		if attack_cooldown_timer < 0.0:
			attack_cooldown_timer = 0.0