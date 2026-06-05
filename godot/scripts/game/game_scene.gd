## GameScene — Fortress Command Main Game Scene Manager
## Migrated from HTML5/JS to Godot GDScript
## Manages game loop, unit/building spawning, selection, and economy

class_name GameScene
extends Node2D

## ── Constants ───────────────────────────────────────────────────────────────────
const ECONOMY_TICK_INTERVAL: float = 1.0
const AI_TICK_INTERVAL: float = 2.0
const MAX_DELTA: float = 0.25

## ── Node References ────────────────────────────────────────────────────────────────
@onready var tilemap: GameTileMap = $GameTileMap
@onready var units_node: Node2D = $Units
@onready var buildings_node: Node2D = $Buildings

## ── Game State ────────────────────────────────────────────────────────────────────
enum GameMode { NONE, ONE_V_ONE_CPU, TWO_V_TWO, ONE_V_ONE, SKIRMISH }

var current_game_mode: GameMode = GameMode.NONE
var game_is_started: bool = false
var game_paused: bool = false

## Players
## Each player dict: { "faction": int, "income": int, "money": int, "is_ai": bool, "hq": Node }
var players: Array = []

## All units and buildings in the scene
var all_units: Array = []
var all_buildings: Array = []

## Selection state
var selected_units: Array = []

## Tick timers
var economy_tick_timer: float = 0.0
var ai_tick_timer: float = 0.0

## ── Signals ──────────────────────────────────────────────────────────────────────
signal game_started(mode: GameMode)
signal game_over(winner: int)
signal unit_spawned(unit: Node)
signal building_spawned(building: Node)
signal unit_selected(unit: Node)
signal unit_deselected(unit: Node)
signal all_deselected()
signal income_updated(player_idx: int, new_rate: int)

## ── Initialization ───────────────────────────────────────────────────────────────
func _ready() -> void:
	# Initialize empty player array
	players = []
	# Auto-start for testing — spawns HQs and begins game loop
	set_game_mode("1v1_cpu")

## ── Main Game Loop ────────────────────────────────────────────────────────────────
func _process(delta: float) -> void:
	# Clamp delta to prevent large jumps on lag spikes
	delta = min(delta, MAX_DELTA)
	
	if not game_is_started or game_paused:
		return
	
	# Economy tick every 1 second
	economy_tick_timer += delta
	if economy_tick_timer >= ECONOMY_TICK_INTERVAL:
		economy_tick_timer -= ECONOMY_TICK_INTERVAL
		_process_economy()
	
	# AI tick every 2 seconds
	ai_tick_timer += delta
	if ai_tick_timer >= AI_TICK_INTERVAL:
		ai_tick_timer -= AI_TICK_INTERVAL
		_process_ai()
	
	# Process all units (handles attack cooldowns, state updates, etc.)
	_process_units(delta)
	
	# Process all buildings (handles construction, auto-attack, training)
	_process_buildings(delta)

## ── Per-Frame Unit/Building Processing ──────────────────────────────────────────
func _process_units(_delta: float) -> void:
	pass  # Godot calls _physics_process on each CharacterBody2D automatically

func _process_buildings(_delta: float) -> void:
	pass  # Godot calls _process on each Node automatically

## ── Economy ────────────────────────────────────────────────────────────────────────
func _process_economy() -> void:
	# Calculate income from all buildings for each player
	for i in range(players.size()):
		var player: Dictionary = players[i]
		var income: int = _calculate_player_income(i)
		player["income"] = income
		player["money"] += income
		income_updated.emit(i, income)

func _calculate_player_income(player_idx: int) -> int:
	var total_income: int = 0
	var player_faction: int = players[player_idx]["faction"]
	
	for building in all_buildings:
		if not is_instance_valid(building):
			continue
		if building.faction == player_faction and building.alive:
			total_income += building.generate_income()
	
	return total_income

## Get total income rate for a player (used by UI)
func get_income_rate(player_idx: int) -> int:
	if player_idx < 0 or player_idx >= players.size():
		return 0
	return players[player_idx].get("income", 0)

## Get player's current money
func get_player_money(player_idx: int) -> int:
	if player_idx < 0 or player_idx >= players.size():
		return 0
	return players[player_idx].get("money", 0)

## Add money to a player
func add_player_money(player_idx: int, amount: int) -> void:
	if player_idx < 0 or player_idx >= players.size():
		return
	players[player_idx]["money"] += amount

## ── AI Processing ───────────────────────────────────────────────────────────────
func _process_ai() -> void:
	# Process AI decisions for each AI player
	for i in range(players.size()):
		var player: Dictionary = players[i]
		if player.get("is_ai", false):
			_process_ai_player(i)

func _process_ai_player(player_idx: int) -> void:
	# Placeholder for AI logic - can be extended
	# This will be implemented with AI-specific scripts later
	pass

## ── Game Mode Setup ──────────────────────────────────────────────────────────────
func set_game_mode(mode_name: String) -> void:
	var mode: GameMode
	match mode_name.to_lower():
		"1v1_cpu", "1v1":
			mode = GameMode.ONE_V_ONE_CPU
		"2v2":
			mode = GameMode.TWO_V_TWO
		"one_v_one":
			mode = GameMode.ONE_V_ONE
		"skirmish":
			mode = GameMode.SKIRMISH
		_:
			mode = GameMode.NONE
	
	current_game_mode = mode
	_setup_players()
	game_is_started = true
	game_started.emit(mode)

func _setup_players() -> void:
	# Clear existing players and entities
	players.clear()
	_clear_all_entities()
	
	var ground_y: int = tilemap.ground_surface_tile_y()
	
	match current_game_mode:
		GameMode.ONE_V_ONE_CPU:
			# Player 1 (human) on left, Player 2 (AI) on right
			players.append({
				"faction": 0,
				"income": 0,
				"money": 500,
				"is_ai": false,
				"hq": null
			})
			players.append({
				"faction": 1,
				"income": 0,
				"money": 500,
				"is_ai": true,
				"hq": null
			})
			# Place HQs at ground level
			_spawn_hq_for_player(0, 2, ground_y - 3)
			_spawn_hq_for_player(1, 193, ground_y - 3)
		
		GameMode.ONE_V_ONE:
			# Two human players
			players.append({
				"faction": 0,
				"income": 0,
				"money": 500,
				"is_ai": false,
				"hq": null
			})
			players.append({
				"faction": 1,
				"income": 0,
				"money": 500,
				"is_ai": false,
				"hq": null
			})
			_spawn_hq_for_player(0, 2, ground_y - 3)
			_spawn_hq_for_player(1, 193, ground_y - 3)
		
		GameMode.TWO_V_TWO:
			# 4 players total
			players.append({"faction": 0, "income": 0, "money": 500, "is_ai": false, "hq": null})
			players.append({"faction": 1, "income": 0, "money": 500, "is_ai": true, "hq": null})
			players.append({"faction": 2, "income": 0, "money": 500, "is_ai": true, "hq": null})
			players.append({"faction": 3, "income": 0, "money": 500, "is_ai": false, "hq": null})
			_spawn_hq_for_player(0, 2, ground_y - 3)
			_spawn_hq_for_player(1, 60, ground_y - 3)
			_spawn_hq_for_player(2, 140, ground_y - 3)
			_spawn_hq_for_player(3, 193, ground_y - 3)
		
		GameMode.SKIRMISH:
			# Single player vs multiple AI
			players.append({"faction": 0, "income": 0, "money": 500, "is_ai": false, "hq": null})
			players.append({"faction": 1, "income": 0, "money": 500, "is_ai": true, "hq": null})
			players.append({"faction": 2, "income": 0, "money": 500, "is_ai": true, "hq": null})
			players.append({"faction": 3, "income": 0, "money": 500, "is_ai": true, "hq": null})
			_spawn_hq_for_player(0, 2, ground_y - 3)
			_spawn_hq_for_player(1, 50, ground_y - 3)
			_spawn_hq_for_player(2, 100, ground_y - 3)
			_spawn_hq_for_player(3, 193, ground_y - 3)
	
	# Initialize income rates after setup
	for i in range(players.size()):
		players[i]["income"] = _calculate_player_income(i)

func _spawn_hq_for_player(player_idx: int, tile_x: int, tile_y: int) -> void:
	print("SPAWN_HQ: player=", player_idx, " tile=(", tile_x, ",", tile_y, ") ground_y=", tilemap.ground_surface_tile_y())
	var hq: Node = spawn_building("hq", Vector2i(tile_x, tile_y), players[player_idx]["faction"])
	if hq != null:
		players[player_idx]["hq"] = hq
		print("  -> HQ spawned at world pos=", hq.global_position)

func _clear_all_entities() -> void:
	# Remove all existing units
	for unit in all_units:
		if is_instance_valid(unit):
			unit.queue_free()
	all_units.clear()
	selected_units.clear()
	
	# Remove all existing buildings
	for building in all_buildings:
		if is_instance_valid(building):
			building.queue_free()
	all_buildings.clear()

## ── Unit Spawning ────────────────────────────────────────────────────────────────
func spawn_unit(unit_type: String, position: Vector2, faction: int) -> Node:
	var unit_scene: PackedScene = preload("res://scenes/entities/unit.tscn")
	var unit: Node = unit_scene.instantiate()
	
	# Set unit properties
	unit.unit_type = unit_type
	unit.faction = faction
	unit.global_position = position
	
	# Add to scene and tracking arrays
	units_node.add_child(unit)
	all_units.append(unit)
	unit.add_to_group("units")

	# Connect unit death signal
	if unit.has_signal("unit_died"):
		unit.unit_died.connect(_on_unit_died.bind(unit))
	
	unit_spawned.emit(unit)
	return unit

func _on_unit_died(unit: Node) -> void:
	# Remove from tracking arrays
	all_units.erase(unit)
	selected_units.erase(unit)

## ── Building Spawning ────────────────────────────────────────────────────────────
func spawn_building(building_type: String, tile_pos: Vector2i, faction: int) -> Node:
	var building_scene: PackedScene = preload("res://scenes/entities/building.tscn")
	var building: Node = building_scene.instantiate()
	
	# Set building properties
	building.building_type = building_type
	building.tile_x = tile_pos.x
	building.tile_y = tile_pos.y
	building.faction = faction
	
	# Calculate world position from tile position
	var world_pos: Vector2 = tilemap.tile_to_world(tile_pos.x, tile_pos.y)
	building.global_position = world_pos
	
	# Add to scene and tracking arrays
	buildings_node.add_child(building)
	all_buildings.append(building)
	building.add_to_group("buildings")

	# Connect building destruction signal
	if building.has_signal("building_destroyed"):
		building.building_destroyed.connect(_on_building_destroyed.bind(building))

	# Wire unit_trained signal so trained units actually spawn
	if building.has_signal("unit_trained"):
		building.unit_trained.connect(_on_unit_trained.bind(building))
	
	building_spawned.emit(building)
	return building

func _on_building_destroyed(building: Node) -> void:
	all_buildings.erase(building)
	tilemap.clear_building_tiles(building.tile_x, building.tile_y, building.width_tiles, building.height_tiles)

	# Check if destroyed building is a player's HQ — trigger game over
	for i in range(players.size()):
		if players[i].get("hq") == building:
			players[i]["hq"] = null
			_check_game_over()
			break


func _on_unit_trained(unit_type: String, source_building: Node) -> void:
	# Spawn the trained unit near the building's exit
	var spawn_pos: Vector2 = source_building.global_position + Vector2(source_building.world_width + 8, 0)
	spawn_unit(unit_type, spawn_pos, source_building.faction)


func _check_game_over() -> void:
	# A player loses when their HQ is destroyed
	for i in range(players.size()):
		if players[i].get("hq") == null:
			# Find any surviving enemy player as the winner
			for j in range(players.size()):
				if j != i and players[j].get("hq") != null:
					game_over.emit(j)
					game_is_started = false
					return

## ── Input Handling ──────────────────────────────────────────────────────────
func _unhandled_input(event: InputEvent) -> void:
	if not game_is_started or game_paused:
		return

	if event is InputEventMouseButton and event.pressed:
		var world_pos: Vector2 = get_global_mouse_position()

		if event.button_index == MOUSE_BUTTON_LEFT:
			# Try to select a unit (player faction 0) near click position
			var nearby: Array = get_units_at_position(world_pos, 24.0)
			var player_unit: Node = null
			for u in nearby:
				if is_instance_valid(u) and u.faction == 0:
					player_unit = u
					break
			if player_unit != null:
				select_unit(player_unit)
			else:
				deselect_all()

		elif event.button_index == MOUSE_BUTTON_RIGHT:
			# Right-click: move or attack at target position
			if selected_units.size() == 0:
				return

			# Check if there's an enemy unit at target
			var nearby: Array = get_units_at_position(world_pos, 24.0)
			var enemy: Node = null
			for u in nearby:
				if is_instance_valid(u) and u.faction != 0:
					enemy = u
					break

			for unit in selected_units:
				if not is_instance_valid(unit):
					continue
				if enemy != null:
					unit.attack_target(enemy)
				else:
					unit.move_to(world_pos)


## ── Selection ───────────────────────────────────────────────────────────────────
func select_unit(unit: Node) -> void:
	if not is_instance_valid(unit):
		return
	
	# Deselect all first
	deselect_all()
	
	# Select the new unit
	unit.select()
	selected_units.append(unit)
	unit_selected.emit(unit)

func deselect_all() -> void:
	for unit in selected_units:
		if is_instance_valid(unit):
			unit.deselect()
	selected_units.clear()
	all_deselected.emit()

## ── Utility Methods ─────────────────────────────────────────────────────────────
func get_units_at_position(position: Vector2, radius: float = 32.0) -> Array:
	var result: Array = []
	for unit in all_units:
		if is_instance_valid(unit) and unit.global_position.distance_to(position) <= radius:
			result.append(unit)
	return result

func get_buildings_for_faction(faction: int) -> Array:
	var result: Array = []
	for building in all_buildings:
		if is_instance_valid(building) and building.faction == faction:
			result.append(building)
	return result

func get_units_for_faction(faction: int) -> Array:
	var result: Array = []
	for unit in all_units:
		if is_instance_valid(unit) and unit.faction == faction:
			result.append(unit)
	return result

func get_hq_for_player(player_idx: int) -> Node:
	if player_idx < 0 or player_idx >= players.size():
		return null
	return players[player_idx].get("hq", null)

func is_valid_player(player_idx: int) -> bool:
	return player_idx >= 0 and player_idx < players.size()