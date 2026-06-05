## UnitCamera — Camera2D with world bounds clamping for Fortress Command
## Follows the Unit and clamps to world boundaries (200x20 tiles at 32px each)

class_name UnitCamera
extends Camera2D

## ── World Bounds (200x20 tiles @ 32px = 6400x640) ───────────────────────────────
const WORLD_LEFT: int = 0
const WORLD_TOP: int = 0
const WORLD_RIGHT: int = 200 * 32  # 6400
const WORLD_BOTTOM: int = 20 * 32  # 640

## ── Camera Follow ──────────────────────────────────────────────────────────────
## Offset so Unit appears in lower-center of screen
const CAMERA_OFFSET: Vector2 = Vector2(0, -50)
## Smooth follow lerp factor
const CAMERA_LERP: float = 0.08

## Target to follow (set by Unit when camera is created)
var follow_target: Node2D = null


func _ready() -> void:
	# Configure world bounds
	limit_left = WORLD_LEFT
	limit_top = WORLD_TOP
	limit_right = WORLD_RIGHT
	limit_bottom = WORLD_BOTTOM
	
	# Enable smooth limit clamping (Godot 4.3 renamed these)
	limit_position_smoothing_enabled = true
	limit_position_smoothing_steepness = 50.0
	
	# Set camera offset (Unit in lower-center)
	offset = CAMERA_OFFSET
	
	# Start at the follow target's position if set
	if follow_target:
		global_position = follow_target.global_position


func _physics_process(_delta: float) -> void:
	if follow_target and is_instance_valid(follow_target):
		# Smooth follow using lerp
		var target_pos: Vector2 = follow_target.global_position + CAMERA_OFFSET
		global_position = global_position.lerp(target_pos, CAMERA_LERP)