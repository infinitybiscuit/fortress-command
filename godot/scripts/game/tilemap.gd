## GameTileMap — Fortress Command TileMap System
## Ports the JS TileMap class from index.html to Godot GDScript.
## Uses a 2D array (PoolByteArray grid) with String-keyed Maps matching the JS "tx,ty" pattern.

class_name GameTileMap
extends Node2D

## ── Constants (match JS CONFIG) ────────────────────────────────────────────
const TILE_SIZE: int = 32
const MAP_WIDTH: int = 200
const MAP_HEIGHT: int = 20

## Tile type IDs — must match values used in generate()
const TILE_EMPTY: int = 0
const TILE_GROUND: int = 1
const TILE_PLATFORM: int = 2

## Platform row deltas above ground surface [3, 7, 11] — highest to lowest
## groundTop = MAP_HEIGHT - 3 = 17 → platforms at rows 13, 9, 5
const PLATFORM_ROWS: Array = [3, 7, 11]
const GROUND_LEVEL_TILE: int = 3

## ── Tile data ───────────────────────────────────────────────────────────────
## 2D array of tile type ints (TILE_EMPTY / TILE_GROUND / TILE_PLATFORM)
var tiles: Array = []

## Tracks tiles occupied by buildings: "tx,ty" -> building_id (int)
var _building_tiles: Dictionary = {}

## Tracks tiles that block unit movement (walls/mines only)
var _unit_blocking_tiles: Dictionary = {}

## ── Initialisation ───────────────────────────────────────────────────────────
func _init() -> void:
	print("GameTileMap _init — MAP_WIDTH=", MAP_WIDTH, " MAP_HEIGHT=", MAP_HEIGHT)
	print("  ground_surface_tile_y()=", ground_surface_tile_y())
	_clear_tiles()
	generate()

func _clear_tiles() -> void:
	tiles = []
	for x in range(MAP_WIDTH):
		var col: Array = []
		for y in range(MAP_HEIGHT):
			col.append(TILE_EMPTY)
		tiles.append(col)

## ── Map generation (ports JS TileMap.generate()) ─────────────────────────────
func generate() -> void:
	_clear_tiles()
	_building_tiles.clear()
	_unit_blocking_tiles.clear()

	var ground_top: int = MAP_HEIGHT - GROUND_LEVEL_TILE  # = 17

	# Ground at the BOTTOM of the map
	for x in range(MAP_WIDTH):
		for y in range(ground_top, MAP_HEIGHT):
			tiles[x][y] = TILE_GROUND

	# Platforms float above ground level
	for row_delta in PLATFORM_ROWS:
		var row_y: int = ground_top - row_delta - 1
		if row_y < 1 or row_y >= MAP_HEIGHT - 1:
			continue
		var x: int = 3 + int(randf() * 8)
		while x < MAP_WIDTH - 5:
			var length: int = 4 + int(randf() * 5)  # PLATFORM_MIN_LEN=4, MAX=8
			for px in range(x, min(x + length, MAP_WIDTH)):
				tiles[px][row_y] = TILE_PLATFORM
			var gap: int = 3 + int(randf() * 6)
			x += length + gap

	# Clear starting areas for HQs (just above ground surface)
	_clear_area(2, ground_top, 6, 5)
	_clear_area(MAP_WIDTH - 8, ground_top, 6, 5)

	# ── Guaranteed platforms for HQs ────────────────────────────────────────
	# Top platform row = highest rowDelta sorted desc
	var sorted_rows: Array = PLATFORM_ROWS.duplicate()
	sorted_rows.sort_custom(func(a, b): return b < a)
	var top_row_delta: int = sorted_rows[0]
	var top_platform_y: int = ground_top - top_row_delta - 1

	for px in range(0, 8):
		tiles[px][top_platform_y] = TILE_PLATFORM
	for px in range(MAP_WIDTH - 8, MAP_WIDTH):
		tiles[px][top_platform_y] = TILE_PLATFORM


func _clear_area(x: int, y: int, w: int, h: int) -> void:
	for tx in range(max(0, x), min(x + w, MAP_WIDTH)):
		for ty in range(max(0, y), min(y + h, MAP_HEIGHT)):
			if tiles[tx][ty] == TILE_PLATFORM:
				tiles[tx][ty] = TILE_EMPTY

## ── Tile access ──────────────────────────────────────────────────────────────
func get_tile(tx: int, ty: int) -> int:
	if tx < 0 or tx >= MAP_WIDTH or ty < 0 or ty >= MAP_HEIGHT:
		return TILE_EMPTY
	return tiles[tx][ty]


func is_solid(tx: int, ty: int) -> bool:
	if ty < 0 or ty >= MAP_HEIGHT:
		return true
	if tx < 0 or tx >= MAP_WIDTH:
		return true
	var key: String = str(tx) + "," + str(ty)
	if _unit_blocking_tiles.has(key):
		return true
	var t: int = tiles[tx][ty]
	return t != TILE_EMPTY

## ── Coordinate conversion ───────────────────────────────────────────────────
func world_to_tile(wx: float, wy: float) -> Vector2i:
	return Vector2i(int(wx / TILE_SIZE), int(wy / TILE_SIZE))


func tile_to_world(tx: int, ty: int) -> Vector2:
	return Vector2(tx * TILE_SIZE, ty * TILE_SIZE)

## ── Ground / platform surface queries ───────────────────────────────────────
## Returns the tile y coordinate of the ground surface (first ground tile from bottom)
func ground_surface_tile_y() -> int:
	return MAP_HEIGHT - GROUND_LEVEL_TILE


func _platform_surface_y(row_delta: int) -> int:
	var ground_top: int = MAP_HEIGHT - GROUND_LEVEL_TILE
	return ground_top - row_delta - 1


func top_platform_surface_tile_y() -> int:
	var sorted_rows: Array = PLATFORM_ROWS.duplicate()
	sorted_rows.sort_custom(func(a, b): return b < a)
	return _platform_surface_y(sorted_rows[0])


func highest_platform_surface_tile_y(start_tile_x: int, width: int) -> int:
	var ground_top: int = MAP_HEIGHT - GROUND_LEVEL_TILE
	var sorted_rows: Array = PLATFORM_ROWS.duplicate()
	sorted_rows.sort_custom(func(a, b): return b < a)

	for row_delta in sorted_rows:
		var surface_y: int = _platform_surface_y(row_delta)
		var ok: bool = true
		for tx in range(start_tile_x, start_tile_x + width):
			if get_tile(tx, surface_y) != TILE_PLATFORM:
				ok = false
				break
		if ok:
			return surface_y

	return ground_top  # fall back to ground surface

## ── Building tile occupancy ───────────────────────────────────────────────────
## Mark tiles as occupied by a building (prevents unit passage through buildings)
func mark_building_tiles(tile_x: int, tile_y: int, w: int, h: int, building_id: int) -> void:
	for tx in range(tile_x, tile_x + w):
		for ty in range(tile_y, tile_y + h):
			var key: String = str(tx) + "," + str(ty)
			_building_tiles[key] = building_id
			_unit_blocking_tiles[key] = building_id


func clear_building_tiles(tile_x: int, tile_y: int, w: int, h: int) -> void:
	for tx in range(tile_x, tile_x + w):
		for ty in range(tile_y, tile_y + h):
			var key: String = str(tx) + "," + str(ty)
			_building_tiles.erase(key)
			_unit_blocking_tiles.erase(key)


## ── Building placement validation ─────────────────────────────────────────────
## Returns true if a building of size (w×h) can be placed at (tile_x, tile_y)
func can_place_building(tile_x: int, tile_y: int, w: int, h: int) -> bool:
	var gs_y: int = ground_surface_tile_y()
	# A building sits on ground when its bottom edge is one tile above gs_y
	var sits_on_ground: bool = (tile_y + h - 1 == gs_y - 1)

	for tx in range(tile_x, tile_x + w):
		for ty in range(tile_y, tile_y + h):
			var tile: int = get_tile(tx, ty)
			var key: String = str(tx) + "," + str(ty)
			if _building_tiles.has(key):
				return false
			if tile != TILE_EMPTY and not (sits_on_ground and tile == TILE_GROUND):
				return false

	# Must have solid ground directly below the building's bottom edge
	var bottom_ty: int = tile_y + h - 1
	for tx in range(tile_x, tile_x + w):
		if not is_solid(tx, bottom_ty + 1):
			return false

	return true


## ── Debug helpers ─────────────────────────────────────────────────────────────
func get_building_tile_key(tx: int, ty: int) -> Variant:
	var key: String = str(tx) + "," + str(ty)
	return _building_tiles.get(key, null)


func has_building_at(tx: int, ty: int) -> bool:
	return _building_tiles.has(str(tx) + "," + str(ty))

## ── Rendering ───────────────────────────────────────────────────────────────────
func _process(_delta: float) -> void:
	# Redraw every frame so terrain updates as camera pans
	queue_redraw()

func _draw() -> void:
	var cam: Camera2D = get_viewport().get_camera_2d()
	var cam_offset: Vector2 = Vector2.ZERO
	if cam != null:
		cam_offset = cam.global_position
	var screen_size: Vector2 = get_viewport().get_visible_rect().size
	GameRenderer.draw_terrain(self, self, cam_offset, screen_size)