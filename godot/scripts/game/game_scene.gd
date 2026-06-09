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
@onready var hud: HUD = $CanvasLayer/HUD
@onready var camera: FortressCamera = $Camera2D

## ── Overlay UI (title menu + game over) ──────────────────────────────────────────
var _title_menu_layer: CanvasLayer
var _game_over_layer: CanvasLayer
var _game_over_result_label: Label
var _game_paused: bool = false  # blocked while overlay is showing

## ── Game State ────────────────────────────────────────────────────────────────────
enum GameMode { NONE, ONE_V_ONE_CPU, TWO_V_TWO, ONE_V_ONE, SKIRMISH }

var current_game_mode: GameMode = GameMode.NONE
var game_is_started: bool = false

## Players
## Each player dict: { "faction": int, "income": int, "money": int, "is_ai": bool, "hq": Node }
var players: Array = []

## All units and buildings in the scene
var all_units: Array = []
var all_buildings: Array = []

## Selection state
var selected_units: Array = []
var _selected_building: Node = null

## Drag-selection state
var _drag_start: Vector2 = Vector2.ZERO
var _is_dragging: bool = false
var _drag_rect: Rect2 = Rect2()  # Default Rect2: pos=(0,0), size=(0,0)

## Build placement state
var _pending_build_type: String = ""

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
	players = []
	game_over.connect(_on_game_over)
	_setup_hud()
	_show_title_menu()

## ── Title Menu ────────────────────────────────────────────────────────────────────
func _show_title_menu() -> void:
	# Block game loop until a mode is selected
	game_is_started = false
	_game_paused = true

	_title_menu_layer = CanvasLayer.new()
	_title_menu_layer.layer = 100
	add_child(_title_menu_layer)

	# Dark background
	var bg := ColorRect.new()
	bg.color = Color(0.0, 0.0, 0.0, 0.85)
	_title_menu_layer.add_child(bg)

	# Centered column
	var col := VBoxContainer.new()
	col.alignment = VBoxContainer.ALIGNMENT_CENTER
	col.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	col.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	col.position = Vector2(0, 200)
	col.custom_minimum_size = Vector2(400, 0)
	_title_menu_layer.add_child(col)

	# Title
	var title := Label.new()
	title.text = "FORTRESS COMMAND"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 48)
	title.add_theme_color_override("font_color", Color(1.0, 1.0, 1.0, 1.0))
	title.custom_minimum_size = Vector2(400, 80)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_child(title)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 40)
	col.add_child(spacer)

	# Mode buttons — labels match what set_game_mode() expects
	var modes: Array = [
		["1 vs CPU",       "1v1_cpu"],
		["1 vs 1 Local",   "1v1"],
		["Free-for-All (3)", "2v2"],
		["Free-for-All (4)", "skirmish"],
	]
	for m in modes:
		var btn := _make_overlay_button(m[0])
		btn.pressed.connect(func(): _on_mode_selected(m[1]))
		col.add_child(btn)

func _make_overlay_button(label_text: String) -> Button:
	var btn := Button.new()
	btn.text = label_text
	btn.custom_minimum_size = Vector2(280, 56)
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.204, 0.502, 1.0, 0.9)
	style.set_border_radius_all(4)
	style.set_corner_radius_all(4)
	style.set_content_margin_all(16)
	btn.add_theme_stylebox_override("normal", style)
	var hover := StyleBoxFlat.new()
	hover.bg_color = Color(0.204, 0.502, 1.0, 1.0)
	hover.set_border_radius_all(4)
	hover.set_corner_radius_all(4)
	hover.set_content_margin_all(16)
	btn.add_theme_stylebox_override("hover", hover)
	var pressed := StyleBoxFlat.new()
	pressed.bg_color = Color(0.1, 0.3, 0.8, 1.0)
	pressed.set_border_radius_all(4)
	pressed.set_corner_radius_all(4)
	pressed.set_content_margin_all(16)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_font_size_override("font_size", 20)
	return btn

func _on_mode_selected(mode_name: String) -> void:
	_title_menu_layer.queue_free()
	_title_menu_layer = null
	_game_paused = false
	# Clear any previous game state before starting fresh
	players.clear()
	_clear_all_entities()
	set_game_mode(mode_name)

## ── Game Over Overlay ─────────────────────────────────────────────────────────────
func _on_game_over(winner: int) -> void:
	game_is_started = false
	_game_paused = true

	_game_over_layer = CanvasLayer.new()
	_game_over_layer.layer = 100
	add_child(_game_over_layer)

	# Dark background
	var bg := ColorRect.new()
	bg.color = Color(0.0, 0.0, 0.0, 0.75)
	_game_over_layer.add_child(bg)

	# Centered column
	var col := VBoxContainer.new()
	col.alignment = VBoxContainer.ALIGNMENT_CENTER
	col.position = Vector2(0, 180)
	col.custom_minimum_size = Vector2(400, 0)
	_game_over_layer.add_child(col)

	# Result label
	_game_over_result_label = Label.new()
	_game_over_result_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_game_over_result_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_game_over_result_label.add_theme_font_size_override("font_size", 64)
	col.add_child(_game_over_result_label)

	# Player 0 is the human — win if winner != 0
	if winner != 0:
		_game_over_result_label.text = "DEFEAT"
		_game_over_result_label.add_theme_color_override("font_color", Color(1.0, 0.3, 0.3, 1.0))
	else:
		_game_over_result_label.text = "VICTORY"
		_game_over_result_label.add_theme_color_override("font_color", Color(0.0, 1.0, 0.4, 1.0))

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 30)
	col.add_child(spacer)

	# Buttons row
	var row := HBoxContainer.new()
	row.alignment = HBoxContainer.ALIGNMENT_CENTER
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_child(row)

	var restart_btn := _make_overlay_button("RESTART")
	restart_btn.pressed.connect(_on_restart_pressed)
	row.add_child(restart_btn)

	var menu_btn := _make_overlay_button("MENU")
	menu_btn.pressed.connect(_on_main_menu_pressed)
	row.add_child(menu_btn)

func _on_restart_pressed() -> void:
	_game_over_layer.queue_free()
	_game_over_layer = null
	# Recall the current mode name and replay
	var mode_name: String
	match current_game_mode:
		GameMode.ONE_V_ONE_CPU: mode_name = "1v1_cpu"
		GameMode.TWO_V_TWO:     mode_name = "2v2"
		GameMode.ONE_V_ONE:     mode_name = "1v1"
		GameMode.SKIRMISH:      mode_name = "skirmish"
		_:                       mode_name = "1v1_cpu"
	players.clear()
	_clear_all_entities()
	_game_paused = false
	set_game_mode(mode_name)

func _on_main_menu_pressed() -> void:
	_game_over_layer.queue_free()
	_game_over_layer = null
	_show_title_menu()

## ── Main Game Loop ────────────────────────────────────────────────────────────────
func _process(delta: float) -> void:
	# Clamp delta to prevent large jumps on lag spikes
	delta = min(delta, MAX_DELTA)
	
	if not game_is_started or _game_paused:
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
	for i in range(players.size()):
		var player: Dictionary = players[i]
		var income: int = _calculate_player_income(i)
		player["income"] = income
		player["money"] += income
		income_updated.emit(i, income)
		if i == 0:
			hud.update_credits(player["money"])
			hud.update_income(income)

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
	var player: Dictionary = players[player_idx]
	var player_faction: int = player["faction"]
	var money: int = player.get("money", 0)

	var ai_buildings: Array = get_buildings_for_faction(player_faction)
	var ground_y: int = tilemap.ground_surface_tile_y()
	var hq_node: Node = player.get("hq")

	# Categorise existing AI buildings
	var has_barracks: bool = false
	var has_mine: bool = false
	var barracks_node: Node = null
	for b in ai_buildings:
		if not is_instance_valid(b) or not b.alive:
			continue
		match b.building_type:
			"barracks":
				has_barracks = true
				if barracks_node == null:
					barracks_node = b
			"mine":
				has_mine = true

	# Build a mine to boost income (place 4 tiles left of HQ)
	if not has_mine and money >= 200 and hq_node != null and is_instance_valid(hq_node):
		var mine_tx: int = hq_node.tile_x - 4
		var mine_ty: int = ground_y - 2
		if tilemap.can_place_building(mine_tx, mine_ty, 2, 2):
			player["money"] -= 200
			spawn_building("mine", Vector2i(mine_tx, mine_ty), player_faction)

	# Build a barracks (place 8 tiles left of HQ)
	if not has_barracks and money >= 150 and hq_node != null and is_instance_valid(hq_node):
		var barracks_tx: int = hq_node.tile_x - 8
		var barracks_ty: int = ground_y - 2
		if tilemap.can_place_building(barracks_tx, barracks_ty, 3, 2):
			player["money"] -= 150
			barracks_node = spawn_building("barracks", Vector2i(barracks_tx, barracks_ty), player_faction)
			has_barracks = true

	# Train soldiers from barracks when ready and affordable
	if has_barracks and barracks_node != null and is_instance_valid(barracks_node):
		if not barracks_node.is_constructing and money >= 50:
			if barracks_node.queue_train("soldier"):
				player["money"] -= 50

	# Collect enemy targets (units + buildings)
	var enemy_targets: Array = []
	for unit in all_units:
		if is_instance_valid(unit) and unit.faction != player_faction:
			if unit.current_state != unit.State.DEAD:
				enemy_targets.append(unit)
	for b in all_buildings:
		if is_instance_valid(b) and b.faction != player_faction and b.alive:
			enemy_targets.append(b)

	# Order all living AI units to engage nearest enemy or advance toward enemy side
	var ai_units: Array = get_units_for_faction(player_faction)
	for ai_unit in ai_units:
		if not is_instance_valid(ai_unit) or ai_unit.current_state == ai_unit.State.DEAD:
			continue
		if ai_unit.current_state == ai_unit.State.ATTACKING:
			continue

		var best_target: Node = null
		var best_dist: float = INF
		for enemy in enemy_targets:
			if not is_instance_valid(enemy):
				continue
			var d: float = ai_unit.global_position.distance_to(enemy.global_position)
			if d < best_dist:
				best_dist = d
				best_target = enemy

		if best_target != null:
			ai_unit.attack_target(best_target)
		else:
			# No enemies found — advance toward the player's side of the map
			ai_unit.move_to(Vector2(400.0, ai_unit.global_position.y))

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
			_spawn_hq_for_player(0, 2, ground_y - 3)
			_spawn_hq_for_player(1, 193, ground_y - 3)
			# Starting soldiers — spawn just above ground so physics settles them
			var spawn_y: float = (ground_y - 1) * GameConfig.TILE_SIZE
			spawn_unit("soldier", Vector2(250, spawn_y), 0)
			spawn_unit("soldier", Vector2(290, spawn_y), 0)
			spawn_unit("soldier", Vector2(6140, spawn_y), 1)
			spawn_unit("soldier", Vector2(6100, spawn_y), 1)
		
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
	unit.tilemap_ref = tilemap

	# Add to scene and tracking arrays
	units_node.add_child(unit)
	all_units.append(unit)
	unit.add_to_group("units")

	# Connect unit death signal
	if unit.has_signal("unit_died"):
		unit.unit_died.connect(_on_unit_died)

	# Spawn a projectile when this unit fires
	if unit.has_signal("attack_fired"):
		unit.attack_fired.connect(_on_attacker_fired.bind(unit))

	unit_spawned.emit(unit)
	return unit

func _on_unit_died(unit: Node) -> void:
	# Remove from tracking arrays
	all_units.erase(unit)
	selected_units.erase(unit)
	# Actually remove the unit from the scene tree
	if is_instance_valid(unit):
		unit.queue_free()

## ── Projectiles ──────────────────────────────────────────────────────────────────
const _PROJECTILE_SCRIPT: GDScript = preload("res://scripts/entities/projectile.gd")

## Called when any unit or building fires; spawns a visual projectile that
## carries the damage and applies it to the target on impact.
func _on_attacker_fired(target: Node, damage: float, shooter: Node) -> void:
	if not is_instance_valid(shooter) or not is_instance_valid(target):
		return
	print("SPAWN_PROJECTILE: from=", shooter.get("unit_type"), " -> target=", target.get("unit_type") if target.get("unit_type") != null else target.get("building_type"), " dmg=", damage)
	var from_pos: Vector2 = shooter.global_position
	# Units originate at their feet; lift the muzzle toward the body centre
	if shooter is CharacterBody2D:
		from_pos -= Vector2(0, 14)
	else:
		# Buildings originate at top-left; fire from their centre
		from_pos += Vector2(shooter.world_width * 0.5, shooter.world_height * 0.5)

	var proj: Node2D = _PROJECTILE_SCRIPT.new()
	add_child(proj)
	proj.setup(from_pos, target, damage, shooter.faction)

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

	# Mark wall tiles as faction-owned so enemies are blocked but friendlies pass through
	var bdata: Dictionary = GameConfig.BUILDING_TYPES.get(building_type, {})
	if bdata.get("blocks_units", false):
		var bw: int = bdata.get("width_tiles", 1)
		var bh: int = bdata.get("height_tiles", 1)
		tilemap.mark_wall_tiles(tile_pos.x, tile_pos.y, bw, bh, faction)

	# Connect building destruction signal
	if building.has_signal("building_destroyed"):
		building.building_destroyed.connect(_on_building_destroyed.bind(building))

	# Wire unit_trained signal so trained units actually spawn
	if building.has_signal("unit_trained"):
		building.unit_trained.connect(_on_unit_trained.bind(building))

	# Spawn a projectile when this building (e.g. turret) fires
	if building.has_signal("attack_fired"):
		building.attack_fired.connect(_on_attacker_fired.bind(building))
	
	building_spawned.emit(building)
	return building

func _on_building_destroyed(building: Node) -> void:
	print("DEBUG _on_building_destroyed: building=", building)
	all_buildings.erase(building)
	tilemap.clear_building_tiles(building.tile_x, building.tile_y, building.width_tiles, building.height_tiles)
	tilemap.clear_wall_tiles(building.tile_x, building.tile_y, building.width_tiles, building.height_tiles)
	# Note: building.queue_free() is now handled by building._delayed_free()
	# to give in-flight projectiles a chance to complete without crashing

	# Check if destroyed building is a player's HQ — trigger game over
	for i in range(players.size()):
		if players[i].get("hq") == building:
			players[i]["hq"] = null
			_check_game_over()
			break


func _on_unit_trained(unit_type: String, source_building: Node) -> void:
	# Spawn at the building's bottom edge (feet on the ground next to it)
	var spawn_x: float = source_building.global_position.x + source_building.world_width + 8.0
	var spawn_y: float = source_building.global_position.y + source_building.world_height
	spawn_unit(unit_type, Vector2(spawn_x, spawn_y), source_building.faction)


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

## ── HUD Setup ───────────────────────────────────────────────────────────────
func _setup_hud() -> void:
	# Populate build list (player can't build HQs)
	var icons: Dictionary = {
		"barracks": "⚔", "turret": "🗼", "wall": "🧱",
		"mine": "⛏", "workshop": "🔧"
	}
	var build_entries: Array = []
	for btype in ["barracks", "turret", "wall", "mine", "workshop"]:
		var data: Dictionary = GameConfig.BUILDING_TYPES.get(btype, {})
		build_entries.append({
			"name": btype.capitalize(),
			"cost": data.get("cost", 0),
			"icon": icons.get(btype, "■"),
			"type": btype,
			"disabled": false
		})
	hud.populate_build_list(build_entries)

	# Connect HUD signals
	hud.build_item_selected.connect(_on_hud_build_item_selected)
	hud.train_item_selected.connect(_on_hud_train_item_selected)

	# Seed initial values
	if players.size() > 0:
		hud.update_credits(players[0].get("money", 0))
		hud.update_income(players[0].get("income", 0))
	hud.update_mode_label("1v1 CPU")


func _on_hud_build_item_selected(btype: String) -> void:
	_pending_build_type = btype
	hud.update_selection_info("Click to place: " + btype.capitalize())


func _on_hud_train_item_selected(utype: String) -> void:
	if _selected_building == null or not is_instance_valid(_selected_building):
		return
	if _selected_building.faction != 0:
		return
	var cost: int = GameConfig.UNIT_TYPES.get(utype, {}).get("cost", 0)
	if players[0].get("money", 0) < cost:
		return
	if _selected_building.queue_train(utype):
		players[0]["money"] -= cost
		hud.update_credits(players[0]["money"])
		# Refresh train list to reflect new affordability
		_select_building(_selected_building)


func _select_building(building: Node) -> void:
	# Deselect previous building
	if _selected_building != null and is_instance_valid(_selected_building):
		_selected_building.is_selected = false
	_selected_building = building
	building.is_selected = true
	deselect_all()

	hud.update_selection_info(building.building_type.capitalize())

	if building.can_train.size() > 0:
		var train_entries: Array = []
		for utype in building.can_train:
			var data: Dictionary = GameConfig.UNIT_TYPES.get(utype, {})
			train_entries.append({
				"name": utype.capitalize(),
				"cost": data.get("cost", 0),
				"time": data.get("train_time", 3.0),
				"type": utype,
				"disabled": players[0].get("money", 0) < data.get("cost", 0)
			})
		hud.populate_train_list(train_entries)
		hud.show_train_section(true)
		# Auto-open the menu so the train options are actually visible
		hud.open_build_menu()
	else:
		hud.show_train_section(false)


func _try_place_building(btype: String, world_pos: Vector2) -> void:
	var data: Dictionary = GameConfig.BUILDING_TYPES.get(btype, {})
	var cost: int = data.get("cost", 0)
	if players.size() == 0 or players[0].get("money", 0) < cost:
		hud.update_selection_info("Not enough credits!")
		return
	var tile_pos: Vector2i = tilemap.world_to_tile(world_pos.x, world_pos.y)
	var w: int = data.get("width_tiles", 1)
	var h: int = data.get("height_tiles", 1)
	# Place so the bottom of the building sits on the clicked tile row
	var place_tile_y: int = tile_pos.y - h + 1
	if not tilemap.can_place_building(tile_pos.x, place_tile_y, w, h):
		hud.update_selection_info("Can't place here!")
		return
	players[0]["money"] -= cost
	spawn_building(btype, Vector2i(tile_pos.x, place_tile_y), 0)
	hud.update_credits(players[0]["money"])
	hud.update_selection_info("Placed " + btype.capitalize())


## ── Input Handling ──────────────────────────────────────────────────────────
var _last_click_time: float = 0.0
var _last_click_pos: Vector2 = Vector2.ZERO
var _last_right_click_time: float = 0.0
var _last_right_click_pos: Vector2 = Vector2.ZERO
const _DOUBLE_CLICK_SEC: float = 0.35
const _DOUBLE_CLICK_PX: float = 20.0
const _DRAG_MIN_DISTANCE: float = 10.0

## Tracks mouse motion to build a drag-selection rectangle while the left button is held.
## _is_dragging is set to false on mouse-press and becomes true once real drag is detected.
func _input(event: InputEvent) -> void:
	if not (event is InputEventMouseMotion):
		return
	# Reject motion events where the left button is not held
	if not (event.button_mask & MOUSE_BUTTON_LEFT):
		return
	var world_pos: Vector2 = get_global_mouse_position()
	var dist: float = world_pos.distance_to(_drag_start)
	if dist >= _DRAG_MIN_DISTANCE:
		_is_dragging = true
		var top_left: Vector2 = Vector2(
			minf(_drag_start.x, world_pos.x),
			minf(_drag_start.y, world_pos.y)
		)
		var size: Vector2 = Vector2(
			absf(world_pos.x - _drag_start.x),
			absf(world_pos.y - _drag_start.y)
		)
		_drag_rect = Rect2(top_left, size)
		queue_redraw()

## ── Drag-selection rectangle rendering ───────────────────────────────────
func _draw() -> void:
	if not _is_dragging:
		return
	if _drag_rect.size == Vector2.ZERO:
		return
	# Draw a semi-transparent blue fill
	draw_rect(_drag_rect, Color(0.3, 0.5, 1.0, 0.25), true)
	# Draw a solid blue border
	draw_rect(_drag_rect, Color(0.3, 0.5, 1.0, 0.8), false, 1)

func _unhandled_input(event: InputEvent) -> void:
	if not game_is_started or _game_paused:
		return
	if get_viewport().gui_get_hovered_control() != null:
		return

	if event is InputEventMouseButton:
		var world_pos: Vector2 = get_global_mouse_position()

		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				# Begin drag selection
				_drag_start = world_pos
				_is_dragging = false
			else:
				# Mouse button released — check for drag-to-select
				if _is_dragging:
					var own_unit: Node = _unit_at_point(world_pos, 0)
					if own_unit == null:
						# Dragged on empty ground — select all player units in rect
						_clear_selection()
						for unit in all_units:
							if is_instance_valid(unit) and unit.faction == 0:
								if _drag_rect.intersects(unit.get_bounds()):
									select_unit(unit)
				_is_dragging = false
				queue_redraw()
				return

		elif event.button_index == MOUSE_BUTTON_RIGHT:
			if event.pressed and selected_units.size() > 0:
				_clear_selection()
				return
			else:
				_clear_selection()
				return

		# Remaining logic only fires for left-button press (not release, not right-click)
		if event.pressed:
			# Build placement mode takes priority
			if _pending_build_type != "":
				_try_place_building(_pending_build_type, world_pos)
				_pending_build_type = ""
				return

			# Detect double-click
			var now: float = Time.get_ticks_msec() / 1000.0
			var is_double: bool = (now - _last_click_time < _DOUBLE_CLICK_SEC and
				world_pos.distance_to(_last_click_pos) < _DOUBLE_CLICK_PX)
			_last_click_time = now
			_last_click_pos = world_pos

			# Double-click on an enemy → attack order for selected units
			if is_double and selected_units.size() > 0:
				var enemy: Node = _unit_at_point(world_pos, -1)
				if enemy != null:
					for unit in selected_units:
						if is_instance_valid(unit):
							unit.attack_target(enemy)
					return
				var enemy_building: Node = _building_at_point(world_pos, -1)
				if enemy_building != null:
					for unit in selected_units:
						if is_instance_valid(unit):
							unit.attack_target(enemy_building)
					return

			# If units are already selected, left-click issues orders first
			if selected_units.size() > 0:
				var enemy: Node = _unit_at_point(world_pos, -1)
				if enemy != null:
					for unit in selected_units:
						if is_instance_valid(unit):
							unit.attack_target(enemy)
					return
				var enemy_building: Node = _building_at_point(world_pos, -1)
				if enemy_building != null:
					for unit in selected_units:
						if is_instance_valid(unit):
							unit.attack_target(enemy_building)
					return

				# Not clicking on own unit — move order (keep selection)
				var own_unit: Node = _unit_at_point(world_pos, 0)
				if own_unit == null:
					for unit in selected_units:
						if is_instance_valid(unit):
							unit.move_to(world_pos)
					return
				# else fall through to re-select the clicked own unit

			# Click on a player building
			for building in all_buildings:
				if not is_instance_valid(building) or building.faction != 0:
					continue
				var brect := Rect2(building.global_position, Vector2(building.world_width, building.world_height))
				if brect.has_point(world_pos):
					_clear_selection()
					_select_building(building)
					return

			# Click on a player unit → select it
			var player_unit: Node = _unit_at_point(world_pos, 0)
			if player_unit != null:
				_clear_building_selection()
				select_unit(player_unit)
				hud.update_selection_info(player_unit.unit_type.capitalize())
			# else: clicked nothing — leave current selection untouched


func _clear_building_selection() -> void:
	if _selected_building != null and is_instance_valid(_selected_building):
		_selected_building.is_selected = false
		_selected_building = null
		hud.show_train_section(false)


func _clear_selection() -> void:
	_clear_building_selection()
	deselect_all()
	hud.update_selection_info("")


## ── Selection ───────────────────────────────────────────────────────────────────
func select_unit(unit: Node) -> void:
	if not is_instance_valid(unit):
		return
	if unit.is_selected:
		return
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

## Returns the first unit whose body contains the point.
## faction_filter: 0+ to require that faction, -1 to require any NON-zero (enemy) faction.
func _unit_at_point(world_point: Vector2, faction_filter: int) -> Node:
	for unit in all_units:
		if not is_instance_valid(unit):
			continue
		if faction_filter == -1:
			if unit.faction == 0:
				continue
		elif unit.faction != faction_filter:
			continue
		if unit.contains_point(world_point):
			return unit
	return null

## Returns the first building whose rect contains the point.
## faction_filter: 0+ to require that faction, -1 to require any NON-zero (enemy) faction.
func _building_at_point(world_point: Vector2, faction_filter: int) -> Node:
	for building in all_buildings:
		if not is_instance_valid(building):
			continue
		if faction_filter == -1:
			if building.faction == 0:
				continue
		elif building.faction != faction_filter:
			continue
		var brect := Rect2(building.global_position, Vector2(building.world_width, building.world_height))
		if brect.has_point(world_point):
			return building
	return null

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


## ── Camera Control ───────────────────────────────────────────────────────────────
## Pan the game camera to a world-space position.
## Called by HUD when player clicks on the minimap.
func pan_camera_to(world_pos: Vector2) -> void:
	if camera != null:
		camera.pan_to(world_pos)
