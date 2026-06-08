## MinimapRenderer — Fortress Command minimap rendering via ImageTexture.
## Draws terrain/buildings/units to an Image, blits it to an ImageTexture each frame.
class_name MinimapRenderer
extends Node

## ── Map constants ─────────────────────────────────────────────────────────────────
const MAP_WIDTH_PIXELS: int = 200 * 32   # 6400
const MAP_HEIGHT_PIXELS: int = 20 * 32    # 640
const MINIMAP_W: int = 180
const MINIMAP_H: int = 40

## Scale factors: minimap pixels per world pixel
const SCALE_X: float = float(MINIMAP_W) / float(MAP_WIDTH_PIXELS)   # ~0.028
const SCALE_Y: float = float(MINIMAP_H) / float(MAP_HEIGHT_PIXELS)  # ~0.0625

## ── Faction colors ─────────────────────────────────────────────────────────────────
const COLOR_FACTION: Array = [
	Color(0.2, 0.6, 1.0),   # blue
	Color(1.0, 0.3, 0.3),   # red
	Color(0.3, 0.9, 0.3),  # green
	Color(1.0, 0.8, 0.2),   # yellow
]
const COLOR_GROUND: Color    = Color(0.30, 0.25, 0.18)
const COLOR_PLATFORM: Color  = Color(0.45, 0.40, 0.35)
const COLOR_BACKGROUND: Color = Color(0.05, 0.05, 0.08)

## ── Texture / Image (the actual render target) ───────────────────────────────
var _minimap_image: Image
var _minimap_tex: ImageTexture

## ── State ───────────────────────────────────────────────────────────────────────
var _terrain_valid: bool = false
var _units_valid: bool = false

## ── Initialization ─────────────────────────────────────────────────────────────
func _ready() -> void:
	_minimap_image = Image.create(MINIMAP_W, MINIMAP_H, false, Image.FORMAT_RGBA8)
	_minimap_image.fill(COLOR_BACKGROUND)
	_minimap_tex = ImageTexture.create_from_image(_minimap_image)
	print("MinimapRenderer ready: ", MINIMAP_W, "x", MINIMAP_H)

## ── Public API ──────────────────────────────────────────────────────────────────
func get_minimap_texture() -> Texture2D:
	return _minimap_tex


func mark_terrain_dirty() -> void:
	_terrain_valid = false


func mark_units_dirty() -> void:
	_units_valid = false


func force_redraw() -> void:
	_terrain_valid = false
	_units_valid = false

## ── Per-frame update (called from HUD timer) ───────────────────────────────
func update_minimap() -> void:
	var scene: Node = _get_game_scene()
	if scene == null:
		return

	if not _terrain_valid:
		_draw_terrain(scene)
		_terrain_valid = true
		_units_valid = false   # units need a fresh base too

	if not _units_valid:
		_draw_units_on_top(scene)
		_units_valid = true

	_minimap_tex.update(_minimap_image)


## ── Terrain pass ─────────────────────────────────────────────────────────────────
func _draw_terrain(scene: Node) -> void:
	_minimap_image.fill(COLOR_BACKGROUND)

	var tilemap: Node = _get_tilemap()
	if tilemap == null:
		return

	# Iterate tiles
	var map_w: int = GameConfig.MAP_WIDTH_TILES
	var map_h: int = GameConfig.MAP_HEIGHT_TILES
	var tile_sz: int = GameConfig.TILE_SIZE

	for tx in range(map_w):
		for ty in range(map_h):
			var tile: int = tilemap.get_tile(tx, ty)
			if tile == GameConfig.TILE_EMPTY:
				continue

			var tile_color: Color
			match tile:
				GameConfig.TILE_GROUND:
					tile_color = COLOR_GROUND
				GameConfig.TILE_PLATFORM:
					tile_color = COLOR_PLATFORM
				_:
					continue   # skip unknown tile types

			# World top-left of this tile → minimap pixel
			var px: int = int(float(tx * tile_sz) * SCALE_X)
			var py: int = int(float(ty * tile_sz) * SCALE_Y)
			var pw: int = max(int(float(tile_sz) * SCALE_X), 1)
			var ph: int = max(int(float(tile_sz) * SCALE_Y), 1)

			_minimap_image.fill_rect(Rect2i(px, py, pw, ph), tile_color)


## ── Units pass (additive on top of terrain) ──────────────────────────────────
func _draw_units_on_top(scene: Node) -> void:
	# Re-draw terrain base so units always draw on top of fresh terrain
	var tilemap: Node = _get_tilemap()
	if tilemap != null:
		var map_w: int = GameConfig.MAP_WIDTH_TILES
		var map_h: int = GameConfig.MAP_HEIGHT_TILES
		var tile_sz: int = GameConfig.TILE_SIZE

		for tx in range(map_w):
			for ty in range(map_h):
				var tile: int = tilemap.get_tile(tx, ty)
				if tile == GameConfig.TILE_EMPTY:
					continue
				var tile_color: Color
				match tile:
					GameConfig.TILE_GROUND:
						tile_color = COLOR_GROUND
					GameConfig.TILE_PLATFORM:
						tile_color = COLOR_PLATFORM
					_:
						continue
				var px: int = int(float(tx * tile_sz) * SCALE_X)
				var py: int = int(float(ty * tile_sz) * SCALE_Y)
				var pw: int = max(int(float(tile_sz) * SCALE_X), 1)
				var ph: int = max(int(float(tile_sz) * SCALE_Y), 1)
				_minimap_image.fill_rect(Rect2i(px, py, pw, ph), tile_color)

	# Draw buildings
	var buildings: Array = scene.all_buildings
	for building in buildings:
		if not is_instance_valid(building):
			continue
		var faction: int = building.faction
		var color: Color = COLOR_FACTION[faction % COLOR_FACTION.size()]
		var world_pos: Vector2 = building.global_position
		var world_w: float = building.world_width
		var world_h: float = building.world_height
		var px: int = int(world_pos.x * SCALE_X)
		var py: int = int(world_pos.y * SCALE_Y)
		var pw: int = max(int(world_w * SCALE_X), 3)
		var ph: int = max(int(world_h * SCALE_Y), 2)
		_minimap_image.fill_rect(Rect2i(px, py, pw, ph), color)

	# Draw units as small dots (2×2 px)
	var units: Array = scene.all_units
	for unit in units:
		if not is_instance_valid(unit):
			continue
		var faction: int = int(unit.faction)
		var color: Color = COLOR_FACTION[faction % COLOR_FACTION.size()]
		var world_pos: Vector2 = unit.global_position
		var px: int = int(world_pos.x * SCALE_X)
		var py: int = int(world_pos.y * SCALE_Y)
		_minimap_image.fill_rect(Rect2i(px - 1, py - 2, 2, 2), color)


## ── Node lookups ───────────────────────────────────────────────────────────────────
func _get_tilemap() -> Node:
	return get_tree().get_first_node_in_group("tilemap")


func _get_game_scene() -> Node:
	return get_tree().get_current_scene()