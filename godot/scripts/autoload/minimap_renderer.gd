## MinimapRenderer — Fortress Command Minimap Rendering System
## Renders game world terrain and unit positions to a texture for the HUD minimap.
## Uses a SubViewport approach for Godot 4 render-to-texture functionality.
class_name MinimapRenderer
extends Node

## ── Constants ───────────────────────────────────────────────────────────────────
const MAP_WIDTH_PIXELS: int = 200 * 32  # 6400
const MAP_HEIGHT_PIXELS: int = 20 * 32   # 640
const MINIMAP_WIDTH: int = 180
const MINIMAP_HEIGHT: int = 40

## Minimap scale factors (minimap pixels per world pixel)
const SCALE_X: float = float(MINIMAP_WIDTH) / float(MAP_WIDTH_PIXELS)
const SCALE_Y: float = float(MINIMAP_HEIGHT) / float(MAP_HEIGHT_PIXELS)

## ── Player Colors (faction -> Color) ─────────────────────────────────────────
const PLAYER_COLORS: Array = [
	Color(0.2, 0.6, 1.0),   # blue (faction 0)
	Color(1.0, 0.3, 0.3),   # red (faction 1)
	Color(0.3, 0.9, 0.3),  # green (faction 2)
	Color(1.0, 0.8, 0.2),   # yellow (faction 3)
]

## Terrain colors for minimap
const COLOR_GROUND: Color = Color(0.30, 0.25, 0.18)
const COLOR_PLATFORM: Color = Color(0.45, 0.40, 0.35)
const COLOR_BACKGROUND: Color = Color(0.05, 0.05, 0.08)

## ── Node References ───────────────────────────────────────────────────────────────
var _sub_viewport: SubViewport
var _render_canvas: Control  # A control node that does the rendering

## ── State ───────────────────────────────────────────────────────────────────
var _terrain_dirty: bool = true
var _units_dirty: bool = true

## Cached references
var _tilemap: Node = null
var _game_scene: Node = null

## ── Initialization ───────────────────────────────────────────────────────────────
func _ready() -> void:
	_setup_sub_viewport()
	print("MinimapRenderer initialized: ", MINIMAP_WIDTH, "x", MINIMAP_HEIGHT)


func _setup_sub_viewport() -> void:
	# Create SubViewport for offscreen rendering
	_sub_viewport = SubViewport.new()
	_sub_viewport.name = "MinimapSubViewport"
	_sub_viewport.size = Vector2i(MINIMAP_WIDTH, MINIMAP_HEIGHT)
	_sub_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_sub_viewport.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE
	_sub_viewport.world_2d = World2D.new()
	_sub_viewport.transparent_bg = false

	add_child(_sub_viewport)

	# Create a canvas control that will draw the minimap
	_render_canvas = Control.new()
	_render_canvas.name = "MinimapCanvas"
	_render_canvas.set_anchors_preset(Control.PRESET_FULL_RECT)
	_render_canvas.size = Vector2(MINIMAP_WIDTH, MINIMAP_HEIGHT)
	_render_canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_sub_viewport.add_child(_render_canvas)

	# Connect to draw signal
	_render_canvas.draw.connect(_on_canvas_draw)


func _on_canvas_draw() -> void:
	_render_minimap()


## ── Public API ─────────────────────────────────────────────────────────────────
## Get the minimap texture for display
func get_minimap_texture() -> Texture2D:
	return _sub_viewport.get_texture()


## Mark terrain as needing re-render (call when camera moves significantly)
func mark_terrain_dirty() -> void:
	_terrain_dirty = true


## Mark units as needing re-render (call when units move)
func mark_units_dirty() -> void:
	_units_dirty = true


## Force a full redraw
func force_redraw() -> void:
	_terrain_dirty = true
	_units_dirty = true
	_render_canvas.queue_redraw()


## ── Minimap Rendering ─────────────────────────────────────────────────────────────
func _render_minimap() -> void:
	# Draw background
	_render_canvas.draw_rect(Rect2(Vector2.ZERO, Vector2(MINIMAP_WIDTH, MINIMAP_HEIGHT)), COLOR_BACKGROUND)

	# Draw terrain
	_draw_terrain()

	# Draw buildings
	_draw_buildings()

	# Draw units
	_draw_units()

	_terrain_dirty = false
	_units_dirty = false


func _draw_terrain() -> void:
	var tilemap_node = _get_tilemap()
	if tilemap_node == null:
		return

	var tiles: Array = tilemap_node.tiles
	if tiles.is_empty():
		return

	# Iterate through all tiles and draw them on minimap
	var map_w: int = GameConfig.MAP_WIDTH_TILES
	var map_h: int = GameConfig.MAP_HEIGHT_TILES

	for tx in range(map_w):
		for ty in range(map_h):
			var tile: int = tilemap_node.get_tile(tx, ty)
			if tile == GameConfig.TILE_EMPTY:
				continue

			# Calculate minimap position
			var world_x: float = tx * 32.0
			var world_y: float = ty * 32.0
			var mini_x: float = world_x * SCALE_X
			var mini_y: float = world_y * SCALE_Y
			var mini_w: float = 32.0 * SCALE_X
			var mini_h: float = 32.0 * SCALE_Y

			var tile_color: Color
			match tile:
				GameConfig.TILE_GROUND:
					tile_color = COLOR_GROUND
				GameConfig.TILE_PLATFORM:
					tile_color = COLOR_PLATFORM
				_:
					tile_color = COLOR_GROUND

			_render_canvas.draw_rect(Rect2(mini_x, mini_y, mini_w, mini_h), tile_color)


func _draw_buildings() -> void:
	var scene = _get_game_scene()
	if scene == null:
		return

	var buildings: Array = scene.all_buildings
	if buildings.is_empty():
		return

	for building in buildings:
		if not is_instance_valid(building):
			continue

		var faction: int = building.faction
		var color: Color = _get_faction_color(faction)

		# Get building world position and size
		var world_pos: Vector2 = building.global_position
		var world_w: float = building.world_width
		var world_h: float = building.world_height

		# Convert to minimap coordinates
		# Note: buildings use top-left positioning, units use center/feet
		var mini_x: float = world_pos.x * SCALE_X
		var mini_y: float = world_pos.y * SCALE_Y
		var mini_w: float = max(world_w * SCALE_X, 3.0)  # Min 3px wide
		var mini_h: float = max(world_h * SCALE_Y, 2.0)  # Min 2px tall

		# Draw building as rectangle
		_render_canvas.draw_rect(Rect2(mini_x, mini_y, mini_w, mini_h), color)


func _draw_units() -> void:
	var scene = _get_game_scene()
	if scene == null:
		return

	var units: Array = scene.all_units
	if units.is_empty():
		return

	for unit in units:
		if not is_instance_valid(unit):
			continue

		# faction on Unit is a Faction enum, convert to int
		var faction: int = int(unit.faction)
		var color: Color = _get_faction_color(faction)

		# Get unit world position (feet position for CharacterBody2D)
		var world_pos: Vector2 = unit.global_position

		# Convert to minimap coordinates
		var mini_x: float = world_pos.x * SCALE_X
		var mini_y: float = world_pos.y * SCALE_Y

		# Draw unit as a small dot (2x2 pixels)
		_render_canvas.draw_rect(Rect2(mini_x - 1, mini_y - 2, 2, 2), color)


## ── Utility ─────────────────────────────────────────────────────────────────
func _get_faction_color(faction: int) -> Color:
	var idx: int = faction % PLAYER_COLORS.size()
	return PLAYER_COLORS[idx]


func _get_tilemap() -> Node:
	if _tilemap != null and is_instance_valid(_tilemap):
		return _tilemap
	_tilemap = get_tree().get_first_node_in_group("tilemap")
	return _tilemap


func _get_game_scene() -> Node:
	if _game_scene != null and is_instance_valid(_game_scene):
		return _game_scene
	_game_scene = get_tree().get_current_scene()
	return _game_scene


## ── Process ───────────────────────────────────────────────────────────────────
func _process(_delta: float) -> void:
	# Re-render when needed (units move)
	if _units_dirty:
		_render_canvas.queue_redraw()