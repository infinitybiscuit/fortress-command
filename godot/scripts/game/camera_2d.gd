## Camera2D — Fortress Command RTS Camera Controller
## Handles WASD/arrow pan, middle-mouse drag, and camera limits.
## Attach to the Camera2D node in game_scene.tscn.

class_name FortressCamera
extends Camera2D

## ── Movement ──────────────────────────────────────────────────────────────────
const PAN_SPEED: float = 800.0  # pixels per second

## ── Mouse drag ─────────────────────────────────────────────────────────────────
var _dragging: bool = false
var _drag_start: Vector2 = Vector2.ZERO
var _camera_start: Vector2 = Vector2.ZERO

## ── Zoom ───────────────────────────────────────────────────────────────────────
const MIN_ZOOM: float = 0.25
const MAX_ZOOM: float = 2.0
const ZOOM_STEP: float = 0.1

## ── World bounds (set from tilemap in _ready) ──────────────────────────────────
var _world_min: Vector2 = Vector2.ZERO
var _world_max: Vector2 = Vector2.ZERO

## ── State ──────────────────────────────────────────────────────────────────────
var _target_position: Vector2 = Vector2.ZERO

func _ready() -> void:
	# Center camera on map initially
	var vp: Vector2 = get_viewport_rect().size
	var half_vp: Vector2 = vp / 2.0
	position = Vector2(6400.0 / 2.0, 640.0 / 2.0)
	_target_position = position

	# Set camera limits to map bounds
	limit_left = 0
	limit_top = 0
	limit_right = 6400
	limit_bottom = 640

	# Start enabled
	make_current()

func _process(delta: float) -> void:
	var move: Vector2 = Vector2.ZERO

	# WASD / Arrow keys
	if Input.is_action_pressed("ui_up") or Input.is_key_pressed(KEY_W):
		move.y -= 1.0
	if Input.is_action_pressed("ui_down") or Input.is_key_pressed(KEY_S):
		move.y += 1.0
	if Input.is_action_pressed("ui_left") or Input.is_key_pressed(KEY_A):
		move.x -= 1.0
	if Input.is_action_pressed("ui_right") or Input.is_key_pressed(KEY_D):
		move.x += 1.0

	if move.length() > 0.0:
		move = move.normalized() * PAN_SPEED * delta
		_target_position += move

	# Middle mouse drag
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_WHEEL_UP):
		zoom = Vector2(zoom.x - ZOOM_STEP, zoom.y - ZOOM_STEP)
		zoom = zoom.clamp(Vector2(MIN_ZOOM, MIN_ZOOM), Vector2(MAX_ZOOM, MAX_ZOOM))
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_WHEEL_DOWN):
		zoom = Vector2(zoom.x + ZOOM_STEP, zoom.y + ZOOM_STEP)
		zoom = zoom.clamp(Vector2(MIN_ZOOM, MIN_ZOOM), Vector2(MAX_ZOOM, MAX_ZOOM))

	# Apply with soft limits clamped to world bounds
	if _target_position != position:
		var new_pos: Vector2 = _target_position
		var half_extent: Vector2 = (get_viewport_rect().size / 2.0) / zoom
		new_pos.x = clamp(new_pos.x, half_extent.x, 6400.0 - half_extent.x)
		new_pos.y = clamp(new_pos.y, half_extent.y, 640.0 - half_extent.y)
		position = new_pos