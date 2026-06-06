## Camera2D — Fortress Command RTS Camera Controller
## Handles smooth lerp pan, edge-scrolling, WASD/arrow pan, and camera limits.
## Attach to the Camera2D node in game_scene.tscn.

class_name FortressCamera
extends Camera2D

## ── Movement ──────────────────────────────────────────────────────────────────
const PAN_SPEED: float = 800.0  # pixels per second
const LERP_FACTOR: float = 0.08  # smooth follow factor (0.08 = spec value)

## ── Edge-scrolling ─────────────────────────────────────────────────────────────
const EDGE_ZONE_PX: float = 40.0  # pixels from viewport edge to trigger auto-pan
const EDGE_SCROLL_SPEED: float = 600.0  # pixels per second at viewport edge

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
	# Start near the player HQ (tile 2, ground_y≈14 → world x=64)
	# Center horizontally on HQ region, vertically on world mid-height
	position = Vector2(400.0, WORLD_HEIGHT / 2.0)
	_target_position = position

	limit_left = 0
	limit_top = 0
	limit_right = int(WORLD_WIDTH)
	limit_bottom = int(WORLD_HEIGHT)

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

	# ── Edge-scrolling: auto-pan when mouse is near viewport edge ──────────────
	var vp_size: Vector2 = get_viewport_rect().size
	var mouse_pos: Vector2 = get_global_mouse_position()
	# Convert mouse to viewport-relative coordinates
	var rel_x: float = mouse_pos.x
	var rel_y: float = mouse_pos.y

	var edge_move: Vector2 = Vector2.ZERO
	if rel_x < EDGE_ZONE_PX:
		edge_move.x -= 1.0
	elif rel_x > vp_size.x - EDGE_ZONE_PX:
		edge_move.x += 1.0
	if rel_y < EDGE_ZONE_PX:
		edge_move.y -= 1.0
	elif rel_y > vp_size.y - EDGE_ZONE_PX:
		edge_move.y += 1.0

	if edge_move.length() > 0.0:
		edge_move = edge_move.normalized() * EDGE_SCROLL_SPEED * delta
		_target_position += edge_move

	# Mouse wheel zoom
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_WHEEL_UP):
		var new_zoom: Vector2 = Vector2(zoom.x - ZOOM_STEP, zoom.y - ZOOM_STEP)
		zoom = new_zoom.clamp(Vector2(MIN_ZOOM, MIN_ZOOM), Vector2(MAX_ZOOM, MAX_ZOOM))
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_WHEEL_DOWN):
		var new_zoom: Vector2 = Vector2(zoom.x + ZOOM_STEP, zoom.y + ZOOM_STEP)
		zoom = new_zoom.clamp(Vector2(MIN_ZOOM, MIN_ZOOM), Vector2(MAX_ZOOM, MAX_ZOOM))

	# ── Smooth lerp toward target ──────────────────────────────────────────────
	if _target_position != position:
		var half_extent: Vector2 = (get_viewport_rect().size / 2.0) / zoom
		var new_pos: Vector2 = _target_position
		new_pos.x = clamp(new_pos.x, half_extent.x, WORLD_WIDTH - half_extent.x)
		new_pos.y = clamp(new_pos.y, half_extent.y, WORLD_HEIGHT - half_extent.y)
		# Smooth lerp — the key fix for smooth camera movement
		position = position.lerp(new_pos, LERP_FACTOR)