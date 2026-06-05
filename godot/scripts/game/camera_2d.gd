## Camera2D — Fortress Command RTS Camera Controller
## Handles WASD/arrow pan, mouse-wheel zoom, and camera limits.
## Attach to the Camera2D node in game_scene.tscn.

class_name FortressCamera
extends Camera2D

## ── Movement ──────────────────────────────────────────────────────────────────
const PAN_SPEED: float = 800.0  # pixels per second

## ── Zoom ───────────────────────────────────────────────────────────────────────
const MIN_ZOOM: float = 0.25
const MAX_ZOOM: float = 2.0
const ZOOM_STEP: float = 0.1

## ── World bounds ────────────────────────────────────────────────────────────────
const WORLD_WIDTH: float = 6400.0
const WORLD_HEIGHT: float = 640.0

## ── State ──────────────────────────────────────────────────────────────────────
var _target_position: Vector2 = Vector2.ZERO

func _ready() -> void:
	var vp: Vector2 = get_viewport_rect().size
	print("FortressCamera _ready — viewport: ", vp, " zoom: ", zoom)
	# Blue HQ is at x=64 — center camera on blue HQ
	# camera at x=128 means visible world x=[-512, 768], blue HQ [64,192] is on screen
	position = Vector2(128.0, 320.0)
	_target_position = position

	limit_left = 0
	limit_top = 0
	limit_right = int(WORLD_WIDTH)
	limit_bottom = int(WORLD_HEIGHT)

	make_current()

func _process(delta: float) -> void:
	if OS.is_debug_build():
		print("FortressCamera pos: ", position, " viewport: ", get_viewport_rect().size)

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

	# Mouse wheel zoom
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_WHEEL_UP):
		var new_zoom: Vector2 = Vector2(zoom.x - ZOOM_STEP, zoom.y - ZOOM_STEP)
		zoom = new_zoom.clamp(Vector2(MIN_ZOOM, MIN_ZOOM), Vector2(MAX_ZOOM, MAX_ZOOM))
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_WHEEL_DOWN):
		var new_zoom: Vector2 = Vector2(zoom.x + ZOOM_STEP, zoom.y + ZOOM_STEP)
		zoom = new_zoom.clamp(Vector2(MIN_ZOOM, MIN_ZOOM), Vector2(MAX_ZOOM, MAX_ZOOM))

	# Apply clamped to world bounds
	if _target_position != position:
		var half_extent: Vector2 = (get_viewport_rect().size / 2.0) / zoom
		var new_pos: Vector2 = _target_position
		new_pos.x = clamp(new_pos.x, half_extent.x, WORLD_WIDTH - half_extent.x)
		new_pos.y = clamp(new_pos.y, half_extent.y, WORLD_HEIGHT - half_extent.y)
		position = new_pos