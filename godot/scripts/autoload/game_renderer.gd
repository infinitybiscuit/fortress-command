## GameRenderer — Fortress Command procedural drawing autoload
## Ports the JS Canvas 2D Renderer class to Godot 4 _draw() calls.
## All drawing uses Godot's CanvasItem.draw_* API.
class_name GameRenderer
extends Node

## ── Player Colors [r,g,b] 0-1 ────────────────────────────────────────────────
## Matches C.PLAYER from the original JS
const PLAYER_COLORS: Array = [
	[0.2, 0.6, 1.0],  # blue (PLAYER_1 / faction 0)
	[1.0, 0.3, 0.3],  # red  (PLAYER_2 / faction 1)
	[0.3, 0.9, 0.3],  # green (PLAYER_3 / faction 2)
	[1.0, 0.8, 0.2],  # yellow (PLAYER_4 / faction 3)
]

## Terrain tile colors [r,g,b]
const COLOR_GROUND:   Color = Color(0.30, 0.25, 0.18)  # TILE_GROUND
const COLOR_PLATFORM: Color = Color(0.35, 0.32, 0.25)  # TILE_PLATFORM
const COLOR_BRIDGE:   Color = Color(0.45, 0.30, 0.15)  # TILE_BRIDGE

const TILE_SIZE: int = 32
const MAP_WIDTH_TILES: int = 200
const MAP_HEIGHT_TILES: int = 20
const TILE_EMPTY: int = 0
const TILE_GROUND: int = 1
const TILE_PLATFORM: int = 2
const TILE_BRIDGE: int = 3
const TILE_RAMP: int = 4

## ── Core helpers ──────────────────────────────────────────────────────────────

func _lerp_color(a: Array, b: Array, t: float) -> Color:
	return Color(
		a[0] + (b[0] - a[0]) * t,
		a[1] + (b[1] - a[1]) * t,
		a[2] + (b[2] - a[2]) * t
	)

func _rgb(c) -> Color:
	if c is Color:
		return c
	return Color(c[0], c[1], c[2])

func _rgba(c, a: float) -> Color:
	return Color(c[0], c[1], c[2], a)

func _player_color(faction: int) -> Color:
	var idx: int = faction % PLAYER_COLORS.size()
	return _rgb(PLAYER_COLORS[idx])

## ── Unit Drawing ──────────────────────────────────────────────────────────────

## Draw a rounded rectangle using draw_rect + manual corners
func _draw_rounded_rect(rect: Rect2, radius: float, color: Color) -> void:
	var r: Rect2 = rect
	if r.size.x < radius * 2:
		radius = r.size.x / 2
	if r.size.y < radius * 2:
		radius = r.size.y / 2
	# Main body (smaller rect without corners)
	var inner: Rect2 = Rect2(r.position + Vector2(radius, radius), r.size - Vector2(radius * 2, radius * 2))
	draw_rect(inner, color)
	# Top bar
	var top_bar: Rect2 = Rect2(r.position + Vector2(radius, 0), Vector2(r.size.x - radius * 2, radius))
	draw_rect(top_bar, color)
	# Bottom bar
	var bot_bar: Rect2 = Rect2(r.position + Vector2(radius, r.size.y - radius), Vector2(r.size.x - radius * 2, radius))
	draw_rect(bot_bar, color)
	# Left bar
	var left_bar: Rect2 = Rect2(r.position + Vector2(0, radius), Vector2(radius, r.size.y - radius * 2))
	draw_rect(left_bar, color)
	# Right bar
	var right_bar: Rect2 = Rect2(r.position + Vector2(r.size.x - radius, radius), Vector2(radius, r.size.y - radius * 2))
	draw_rect(right_bar, color)
	# Four corner circles
	draw_circle(r.position + Vector2(radius, radius), radius, color)
	draw_circle(r.position + Vector2(r.size.x - radius, radius), radius, color)
	draw_circle(r.position + Vector2(radius, r.size.y - radius), radius, color)
	draw_circle(r.position + Vector2(r.size.x - radius, r.size.y - radius), radius, color)

## Draw the unit body: gradient fill + ground shadow + helmet
## unit: Unit node — reads faction, unit_type, is_selected, health, max_health, global_position, facing
func draw_unit(unit: Unit, cam_offset: Vector2) -> void:
	var faction: int = unit.faction as int
	var pc: Color = _player_color(faction)
	var screen_pos: Vector2 = unit.global_position - cam_offset

	# Compute unit dimensions from STATS (same logic as unit.gd)
	var stats: Dictionary = Unit.STATS.get(unit.unit_type, Unit.STATS.get("soldier"))
	var w: float = 12.0  # default soldier width
	var h: float = 20.0  # default soldier height
	# Use collision shape size if available
	if unit.has_node("CollisionShape2D"):
		var cs = unit.get_node("CollisionShape2D") as CollisionShape2D
		if cs.shape is RectangleShape2D:
			w = cs.shape.size.x
			h = cs.shape.size.y

	var rect: Rect2 = Rect2(screen_pos - Vector2(w / 2, h), Vector2(w, h))
	var sel_rect: Rect2 = rect.grow(2.0)

	# ── Ground shadow (ellipse via 4-arc approximation) ──
	var shadow_col: Color = Color(0, 0, 0, 0.28)
	var shadow_rect: Rect2 = Rect2(rect.position.x - 2, rect.end.y - 2, w + 4, 8)
	draw_ellipse(shadow_rect, shadow_col)

	# ── Body gradient fill ──
	var body_top: Color = _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.28)
	var body_mid: Color = pc
	var body_bot: Color = _lerp_color(PLAYER_COLORS[faction % 4], [0.0, 0.0, 0.0], 0.32)

	# Draw body as layered rects to fake gradient (Godot doesn't support per-element gradients in _draw easily)
	# Top highlight band
	draw_rect(Rect2(rect.position, Vector2(w, h * 0.35)), body_top)
	# Middle band
draw_rect(Rect2(rect.position + Vector2(0, h * 0.35), Vector2(w, h * 0.35)), body_mid)
	# Bottom shadow band
	draw_rect(Rect2(rect.position + Vector2(0, h * 0.7), Vector2(w, h * 0.3)), body_bot)

	# ── Top rim highlight ──
	var top_highlight: Color = Color(1, 1, 1, 0.38)
	draw_rect(Rect2(rect.position, Vector2(w, 3)), top_highlight)

	# ── Bottom inner shadow ──
	var bot_shadow: Color = Color(0, 0, 0, 0.28)
	draw_rect(Rect2(rect.position.x, rect.end.y - 6, w, 6), bot_shadow)

	# ── Helmet ──
	var helm_w: float = w * 0.78
	var helm_h: float = h * 0.36
	var helm_x: float = rect.position.x + (w - helm_w) / 2
	var helm_y: float = rect.position.y + 2
	var helm_rect: Rect2 = Rect2(helm_x, helm_y, helm_w, helm_h)
	var helm_top: Color = Color(0.376, 0.376, 0.376)
	var helm_bot: Color = Color(0.141, 0.141, 0.141)
	# Helmet upper
	draw_rect(Rect2(helm_rect.position, Vector2(helm_w, helm_h * 0.6)), helm_top)
	# Helmet lower
	draw_rect(Rect2(helm_rect.position + Vector2(0, helm_h * 0.6), Vector2(helm_w, helm_h * 0.4)), helm_bot)
	# Helmet brim
	draw_rect(Rect2(helm_x - 2, helm_y + helm_h - 4, helm_w + 4, 5), Color(0.2, 0.2, 0.2))

	# ── Selection ring ──
	if unit.is_selected:
		var sel_color: Color = Color(0, 1, 0.4)  # C.SELECT
		draw_rect(sel_rect, sel_color, false, 2.0)

	# ── Facing indicator (small triangle) ──
	var facing_dir: float = 1.0  # default right
	if unit.has_method("get_facing"):
		facing_dir = unit.get_facing()
	var fx: float = rect.position.x + (facing_dir > 0 ? w - 4 : 2)
	var fy1: float = rect.position.y + h * 0.3
	var fy2: float = rect.position.y + h * 0.5
	var fy3: float = rect.position.y + h * 0.7
	var tri_points: Array = [
		Vector2(fx, fy1),
		Vector2(fx + facing_dir * 5, fy2),
		Vector2(fx, fy3)
	]
	draw_polygon(tri_points, [Color(1, 1, 1, 0.7)])

	# ── HP bar (only when damaged) ──
	if unit.health < unit.max_health:
		var bar_w: float = w
		var bar_h: float = 3.0
		var bar_x: float = rect.position.x
		var bar_y: float = rect.position.y - 6
		draw_rect(Rect2(bar_x, bar_y, bar_w, bar_h), Color(0.2, 0.2, 0.2))
		var hp_ratio: float = unit.health / unit.max_health
		var hp_color: Color = hp_ratio > 0.5 ? Color(0, 1, 0.4) : hp_ratio > 0.25 ? Color(1, 0.67, 0) : Color(1, 0.3, 0.3)
		draw_rect(Rect2(bar_x, bar_y, bar_w * hp_ratio, bar_h), hp_color)

## Draw an ellipse approximated by a polygon
func draw_ellipse(rect: Rect2, color: Color) -> void:
	var cx: float = rect.position.x + rect.size.x / 2
	var cy: float = rect.position.y + rect.size.y / 2
	var rx: float = rect.size.x / 2
	var ry: float = rect.size.y / 2
	var points: Array = []
	var segments: int = 16
	for i in range(segments):
		var angle: float = TAU * i / segments
		points.append(Vector2(cx + cos(angle) * rx, cy + sin(angle) * ry))
	draw_colored_polygon(points, color)

## ── Building Drawing ──────────────────────────────────────────────────────────

## Draw a building at its global position (no cam_offset needed — world-space node)
## building: Building node — reads building_type, faction, hp, max_hp, is_selected, is_constructing, construction_progress
func draw_building(building: Building, cam_offset: Vector2) -> void:
	var faction: int = 0
	if building.has("faction"):
		faction = building.faction as int
	else:
		faction = 0
	var pc: Color = _player_color(faction)
	var screen_pos: Vector2 = building.global_position - cam_offset

	var world_w: float = building.world_width
	var world_h: float = building.world_height
	var rect: Rect2 = Rect2(screen_pos, Vector2(world_w, world_h))

	# ── Selection ring ──
	if building.is_selected:
		var sel_color: Color = Color(0, 1, 0.4)
		var sel: Rect2 = rect.grow(2.0)
		draw_rect(Rect2(sel.position.x, sel.position.y, sel.size.x, 2.0), sel_color)
		draw_rect(Rect2(sel.position.x, sel.end.y - 2.0, sel.size.x, 2.0), sel_color)
		draw_rect(Rect2(sel.position.x, sel.position.y, 2.0, sel.size.y), sel_color)
		draw_rect(Rect2(sel.end.x - 2.0, sel.position.y, 2.0, sel.size.y), sel_color)

	# ── Ground shadow (perspective cast right) ──
	var gs_points: Array = [
		rect.position + Vector2(5, rect.size.y),
		rect.position + Vector2(rect.size.x - 5, rect.size.y),
		rect.position + Vector2(rect.size.x + 4, rect.size.y + 12),
		rect.position + Vector2(-3, rect.size.y + 12),
	]
	draw_colored_polygon(gs_points, Color(0, 0, 0, 0.32))

	# ── Body gradient (approximated with bands) ──
	var dimmed: bool = building.is_constructing
	var face_top: Color = _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.26)
	var face_mid: Color = pc
	var face_bot: Color = _lerp_color(PLAYER_COLORS[faction % 4], [0.0, 0.0, 0.0], 0.38)
	var alpha_mod: float = 1.0 if not dimmed else 0.62

	# Body fill — top band
	draw_rect(Rect2(rect.position, Vector2(world_w, world_h * 0.3)), Color(face_top.r, face_top.g, face_top.b, alpha_mod))
	# Middle band
	draw_rect(Rect2(rect.position + Vector2(0, world_h * 0.3), Vector2(world_w, world_h * 0.42)), Color(face_mid.r, face_mid.g, face_mid.b, alpha_mod))
	# Bottom band
	draw_rect(Rect2(rect.position + Vector2(0, world_h * 0.72), Vector2(world_w, world_h * 0.28)), Color(face_bot.r, face_bot.g, face_bot.b, alpha_mod))

	# ── Rim lights (top + left) ──
	var rim_top: Color = _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.46)
	draw_rect(Rect2(rect.position, Vector2(world_w, 4)), Color(rim_top.r, rim_top.g, rim_top.b, alpha_mod))
	var rim_left: Color = _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.42)
	draw_rect(Rect2(rect.position, Vector2(4, world_h)), Color(rim_left.r, rim_left.g, rim_left.b, alpha_mod))

	# ── Type-specific interior details ──
	if not building.is_constructing:
		match building.building_type:
			"hq":
				_draw_building_hq(rect, pc, faction)
			"barracks":
				_draw_building_barracks(rect, pc, faction)
			"turret":
				_draw_building_turret(rect, pc, faction)
			"wall":
				_draw_building_wall(rect, pc, faction)
			"mine":
				_draw_building_mine(rect, pc, faction)
			"workshop":
				_draw_building_workshop(rect, pc, faction)
			"bridge":
				_draw_building_bridge(rect, pc, faction)
			_:
				pass  # RAMP and unknown — skip details

	# ── Under-construction overlay ──
	if building.is_constructing:
		# Hatch fill
		var hatch_color: Color = Color(0.1, 0.167, 0.4, 0.4)
		draw_rect(rect, hatch_color)
		# Diagonal hatch lines
		var hatch_line_color: Color = Color(0.2, 0.5, 1.0, 0.8)
		for i in range(-int(rect.size.y), int(rect.size.x), 6):
			var start: Vector2 = rect.position + Vector2(i, 0)
			var end: Vector2 = rect.position + Vector2(i + rect.size.y, rect.size.y)
			draw_line(start, end, hatch_line_color, 1.0)
		# Progress bar
		var bar_y_pos: float = rect.end.y + 2
		draw_rect(Rect2(rect.position.x, bar_y_pos, world_w, 4.0), Color(0.13, 0.13, 0.13))
		draw_rect(Rect2(rect.position.x, bar_y_pos, world_w * building.construction_progress, 4.0), Color(0.2, 0.5, 1.0))

	# ── HP bar (only when damaged) ──
	if building.hp < building.max_hp:
		var bar_w: float = world_w
		var bar_h: float = 3.0
		var bar_x: float = rect.position.x
		var bar_y: float = rect.position.y - 6
		draw_rect(Rect2(bar_x, bar_y, bar_w, bar_h), Color(0.2, 0.2, 0.2))
		var hp_ratio: float = building.hp / building.max_hp
		var hp_color: Color = hp_ratio > 0.5 ? Color(0, 1, 0.4) : hp_ratio > 0.25 ? Color(1, 0.67, 0) : Color(1, 0.3, 0.3)
		draw_rect(Rect2(bar_x, bar_y, bar_w * hp_ratio, bar_h), hp_color)

## ── Building-type detail drawers ──────────────────────────────────────────────

func _draw_building_hq(rect: Rect2, pc: Color, faction: int) -> void:
	var w: float = rect.size.x
	var h: float = rect.size.y
	# Flag pole
	var pole_x: float = rect.position.x + w * 0.72
	var pole_top: float = rect.position.y + 4
	var pole_bot: float = rect.position.y + h * 0.55
	draw_line(Vector2(pole_x, pole_top), Vector2(pole_x, pole_bot), Color(1, 1, 1, 0.72), 2.0)
	# Pennant
	var pennant_pts: Array = [
		Vector2(pole_x, pole_top),
		Vector2(pole_x + 18, pole_top + 5),
		Vector2(pole_x, pole_top + 10),
	]
	draw_colored_polygon(pennant_pts, pc)
	# Window row — three windows
	var win_y: float = rect.position.y + h * 0.36
	var win_h: float = 10.0
	var win_w: float = 12.0
	var win_gap: float = 6.0
	var total_win_w: float = win_w * 3 + win_gap * 2
	var win_start_x: float = rect.position.x + (w - total_win_w) / 2
	for i in range(3):
		var wx: float = win_start_x + i * (win_w + win_gap)
		draw_rect(Rect2(wx + 1, win_y + 1, win_w, win_h), Color(0, 0, 0, 0.44))
		draw_rect(Rect2(wx, win_y, win_w, win_h), Color(0.4, 0.6, 0.9, 1.0))
		draw_line(Vector2(wx + win_w / 2, win_y + 1), Vector2(wx + win_w / 2, win_y + win_h - 1), Color(1, 1, 1, 0.28), 1.0)
		draw_line(Vector2(wx + 1, win_y + win_h / 2), Vector2(wx + win_w - 1, win_y + win_h / 2), Color(1, 1, 1, 0.28), 1.0)
	# Door
	var door_w: float = 18.0
	var door_h: float = 22.0
	var door_x: float = rect.position.x + (w - door_w) / 2
	var door_y: float = rect.end.y - door_h - 4
	draw_rect(Rect2(door_x, door_y, door_w, door_h), Color(0, 0, 0, 0.52))
	draw_circle(Vector2(door_x + door_w - 5, door_y + door_h / 2), 2.0, Color(1, 0.84, 0))

func _draw_building_barracks(rect: Rect2, pc: Color, faction: int) -> void:
	var w: float = rect.size.x
	var h: float = rect.size.y
	# Pitched roof
	var roof_h: float = 16.0
	var roof_pts: Array = [
		Vector2(rect.position.x - 4, rect.position.y + roof_h),
		Vector2(rect.position.x + w / 2, rect.position.y),
		Vector2(rect.end.x + 4, rect.position.y + roof_h),
	]
	draw_colored_polygon(roof_pts, _lerp_color(PLAYER_COLORS[faction % 4], [0.0, 0.0, 0.0], 0.32))
	# Ridge highlight
	draw_line(Vector2(rect.position.x - 4, rect.position.y + roof_h), Vector2(rect.position.x + w / 2, rect.position.y), _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.28), 1.5)
	draw_line(Vector2(rect.position.x + w / 2, rect.position.y), Vector2(rect.end.x + 4, rect.position.y + roof_h), _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.28), 1.5)
	# Window row (3 windows)
	var win_y: float = rect.position.y + roof_h + 6
	var win_h: float = 10.0
	var win_w: float = 13.0
	var win_gap: float = 7.0
	var total_win_w: float = win_w * 3 + win_gap * 2
	var win_start_x: float = rect.position.x + (w - total_win_w) / 2
	for i in range(3):
		var wx: float = win_start_x + i * (win_w + win_gap)
		draw_rect(Rect2(wx + 1, win_y + 1, win_w, win_h), Color(0, 0, 0, 0.46))
		draw_rect(Rect2(wx, win_y, win_w, win_h), Color(0.53, 0.73, 0.93, 1.0))
	# Door
	var door_w: float = 16.0
	var door_h: float = 18.0
	var door_x: float = rect.position.x + (w - door_w) / 2
	var door_y: float = rect.end.y - door_h - 4
	draw_rect(Rect2(door_x, door_y, door_w, door_h), Color(0, 0, 0, 0.5))
	draw_circle(Vector2(door_x + door_w - 4, door_y + door_h / 2), 1.5, Color(1, 0.84, 0))

func _draw_building_turret(rect: Rect2, pc: Color, faction: int) -> void:
	var w: float = rect.size.x
	var h: float = rect.size.y
	var cx: float = rect.position.x + w / 2
	var cy: float = rect.position.y + h * 0.44
	# Dome (half-ellipse via colored circle)
	var dome_radius: float = w * 0.38
	var dome_color: Color = _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.32)
	draw_circle(Vector2(cx, cy), dome_radius, dome_color)
	# Gun barrel
	var barrel_x: float = cx + 4
	var barrel_y: float = rect.position.y + h * 0.34
	draw_rect(Rect2(barrel_x, barrel_y, w * 0.52, 6), _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.6))
	draw_rect(Rect2(barrel_x, barrel_y + 5, w * 0.52, 2), Color(0, 0, 0, 0.28))
	# Mount collar
	draw_circle(Vector2(cx + 4, rect.position.y + h * 0.37), 5.0, _lerp_color(PLAYER_COLORS[faction % 4], [0.0, 0.0, 0.0], 0.22))

func _draw_building_wall(rect: Rect2, pc: Color, faction: int) -> void:
	var w: float = rect.size.x
	var h: float = rect.size.y
	# Stone block texture rows
	var row_h: float = 10.0
	var stone_w: float = w / 2.0
	var stone_colors: Array = [
		Color(1, 1, 1, 0.14), Color(0.78, 0.78, 0.78, 0.10),
		Color(1, 1, 1, 0.08), Color(0.71, 0.71, 0.71, 0.12),
	]
	for row in range(int(h / row_h)):
		var offset: float = (row % 2) * (stone_w / 2)
		var sy: float = rect.position.y + row * row_h
		for col in range(3):
			var bx: float = rect.position.x + col * stone_w + offset - stone_w / 2
			var sc: Color = stone_colors[(row + col) % stone_colors.size()]
			draw_rect(Rect2(bx + 1, sy + 1, stone_w - 2, row_h - 2), sc, false, 0.8)
	# Crenellations at top
	var merlon_w: float = w / 3.0
	var merlon_h: float = 8.0
	for i in range(3):
		var mx: float = rect.position.x + i * merlon_w + merlon_w * 0.1
		var mw: float = merlon_w * 0.8
		draw_rect(Rect2(mx, rect.position.y - merlon_h, mw, merlon_h), _lerp_color(PLAYER_COLORS[faction % 4], [0.0, 0.0, 0.0], 0.28))
		draw_rect(Rect2(mx, rect.position.y - merlon_h, mw, 2.0), _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.22))

func _draw_building_mine(rect: Rect2, pc: Color, faction: int) -> void:
	var w: float = rect.size.x
	var h: float = rect.size.y
	var cx: float = rect.position.x + w / 2
	# A-frame legs
	draw_line(Vector2(cx - 14, rect.end.y - 6), Vector2(cx, rect.position.y + 8), _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.55), 3.0)
	draw_line(Vector2(cx + 14, rect.end.y - 6), Vector2(cx, rect.position.y + 8), _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.55), 3.0)
	# Cross brace
	draw_line(Vector2(cx - 8, rect.position.y + h * 0.52), Vector2(cx + 8, rect.position.y + h * 0.52), _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.55), 1.5)
	# Winding wheel at top
	draw_arc(Vector2(cx, rect.position.y + 8), 9.0, 0.0, TAU, 12, Color(1, 1, 1, 0.72), 2.0)
	# Spokes
	for a in range(4):
		var angle: float = PI * a / 2.0
		draw_line(Vector2(cx, rect.position.y + 8), Vector2(cx + cos(angle) * 8, rect.position.y + 8 + sin(angle) * 8), Color(1, 1, 1, 0.72), 2.0)
	# Hoist cable
	draw_line(Vector2(cx, rect.position.y + 8), Vector2(cx, rect.end.y - 18), Color(1, 1, 1, 0.5), 1.0)
	# Ore bucket
	draw_rect(Rect2(cx - 6, rect.end.y - 18, 12, 10), Color(0.78, 0.63, 0.0, 0.82))
	draw_rect(Rect2(cx - 6, rect.end.y - 18, 12, 3), Color(1, 1, 1, 0.2))

func _draw_building_workshop(rect: Rect2, pc: Color, faction: int) -> void:
	var w: float = rect.size.x
	var h: float = rect.size.y
	# Sawtooth roof
	var roof_h: float = 18.0
	var tooth_w: float = w / 3.0
	for i in range(3):
		var tx: float = rect.position.x + i * tooth_w
		var tip: Vector2 = Vector2(tx + tooth_w / 2.0, rect.position.y)
		var right: Vector2 = Vector2(tx + tooth_w, rect.position.y + roof_h)
		var left: Vector2 = Vector2(tx, rect.position.y + roof_h)
		var roof_pts: Array = [left, tip, right]
		draw_colored_polygon(roof_pts, _lerp_color(PLAYER_COLORS[faction % 4], [0.0, 0.0, 0.0], 0.36))
	# Chimney
	var chim_x: float = rect.position.x + w * 0.78
	var chim_w: float = 10.0
	var chim_h: float = 20.0
	draw_rect(Rect2(chim_x - chim_w / 2.0, rect.position.y - chim_h + 6, chim_w, chim_h), _lerp_color(PLAYER_COLORS[faction % 4], [0.0, 0.0, 0.0], 0.38))
	draw_rect(Rect2(chim_x - chim_w / 2.0 - 2, rect.position.y - chim_h + 4, chim_w + 4, 4), _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.18))
	# Large bay door
	var bay_w: float = w * 0.44
	var bay_h: float = 22.0
	var bay_x: float = rect.position.x + (w - bay_w) / 2.0
	var bay_y: float = rect.end.y - bay_h - 4
	draw_rect(Rect2(bay_x, bay_y, bay_w, bay_h), Color(0, 0, 0, 0.5))
	draw_line(Vector2(bay_x + 3, bay_y + 3), Vector2(bay_x + bay_w - 3, bay_y + bay_h - 3), Color(1, 1, 1, 0.18), 1.2)
	draw_line(Vector2(bay_x + bay_w - 3, bay_y + 3), Vector2(bay_x + 3, bay_y + bay_h - 3), Color(1, 1, 1, 0.18), 1.2)
	# Side windows
	for i in range(2):
		var sw_x: float = rect.position.x + w * 0.18 + i * w * 0.62
		var sw_y: float = rect.position.y + roof_h + 8
		draw_rect(Rect2(sw_x, sw_y, 8, 14), Color(0, 0, 0, 0.42))
		draw_rect(Rect2(sw_x, sw_y, 8, 14), Color(0.67, 0.73, 0.8))

func _draw_building_bridge(rect: Rect2, pc: Color, faction: int) -> void:
	var w: float = rect.size.x
	var h: float = rect.size.y
	# Support posts at each end
	draw_rect(Rect2(rect.position.x + 2, rect.position.y, 5, h), _lerp_color(PLAYER_COLORS[faction % 4], [0.0, 0.0, 0.0], 0.38))
	draw_rect(Rect2(rect.end.x - 7, rect.position.y, 5, h), _lerp_color(PLAYER_COLORS[faction % 4], [0.0, 0.0, 0.0], 0.38))
	# Post highlights
	draw_rect(Rect2(rect.position.x + 2, rect.position.y, 2, h), _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.18))
	draw_rect(Rect2(rect.end.x - 7, rect.position.y, 2, h), _lerp_color(PLAYER_COLORS[faction % 4], [1.0, 1.0, 1.0], 0.18))
	# Planks
	var plank_w: float = 7.0
	var plank_gap: float = 2.0
	var plank_count: int = int((w - 20) / (plank_w + plank_gap))
	var deck_y: float = rect.position.y + 4
	var deck_h: float = h - 8
	for i in range(plank_count):
		var px: float = rect.position.x + 10 + i * (plank_w + plank_gap)
		if px + plank_w > rect.end.x - 10:
			break
		draw_rect(Rect2(px, deck_y, plank_w, deck_h), pc)
		draw_rect(Rect2(px, deck_y, plank_w, 1), Color(1, 1, 1, 0.18))

## ── Terrain Drawing ───────────────────────────────────────────────────────────

## Draw visible terrain tiles within the viewport
func draw_terrain(tilemap, cam_offset: Vector2, screen_size: Vector2) -> void:
	var left_tile: int = max(0, int(floor(cam_offset.x / TILE_SIZE)))
	var right_tile: int = min(tilemap.MAP_WIDTH if "MAP_WIDTH" in tilemap else MAP_WIDTH_TILES, int(floor((cam_offset.x + screen_size.x) / TILE_SIZE)) + 1)
	var top_tile: int = 0
	var bottom_tile: int = tilemap.MAP_HEIGHT if "MAP_HEIGHT" in tilemap else MAP_HEIGHT_TILES

	var tile_size_f: float = float(TILE_SIZE)

	for tx in range(left_tile, right_tile):
		for ty in range(top_tile, bottom_tile):
			var tile: int = tilemap.get_tile(tx, ty)
			if tile == TILE_EMPTY:
				continue
			var world_x: float = tx * tile_size_f
			var world_y: float = ty * tile_size_f
			var screen_pos: Vector2 = Vector2(world_x, world_y) - cam_offset
			var tile_color: Color
			match tile:
				TILE_GROUND:
					tile_color = COLOR_GROUND
				TILE_PLATFORM:
					tile_color = COLOR_PLATFORM
				TILE_BRIDGE:
					tile_color = COLOR_BRIDGE
				_:
					tile_color = COLOR_GROUND
			draw_rect(Rect2(screen_pos, Vector2(tile_size_f, tile_size_f)), tile_color)
			# Platform top highlight stroke
			if tile == TILE_PLATFORM:
				var highlight_color: Color = Color(1, 1, 1, 0.08)
				draw_line(screen_pos + Vector2(0.5, 0.5), screen_pos + Vector2(tile_size_f - 0.5, 0.5), highlight_color, 1.0)

## ── Projectile Drawing ─────────────────────────────────────────────────────────

func draw_projectile(screen_pos: Vector2, radius: float, angle: float) -> void:
	# Trail
	var trail_len: float = 14.0
	var trail_end: Vector2 = screen_pos - Vector2(cos(angle), sin(angle)) * trail_len
	draw_line(trail_end, screen_pos, Color(1, 0.86, 0.31, 0.4), radius * 1.2, true)
	# Bullet head
	draw_circle(screen_pos, radius, Color(1, 1, 0.5))

## ── Build Preview ─────────────────────────────────────────────────────────────

func draw_build_preview(screen_pos: Vector2, world_w: float, world_h: float, valid: bool) -> void:
	var color: Color = Color(0, 1, 0.4, 0.6) if valid else Color(1, 0.2, 0.2, 0.6)
	var rect: Rect2 = Rect2(screen_pos, Vector2(world_w, world_h))
	draw_rect(rect, color, false, 2.0)