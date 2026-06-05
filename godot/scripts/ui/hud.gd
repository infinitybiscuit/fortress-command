class_name HUD
extends Control

# ═══════════════════════════════════════════════════════════════════
# HUD - Heads-Up Display for Fortress Command
# Migrated from HTML5/CSS implementation
# ═══════════════════════════════════════════════════════════════════

signal build_menu_toggled(open: bool)
signal build_item_selected(building_type: String)
signal train_item_selected(unit_type: String)

# ─── Node References ────────────────────────────────────────────────
@onready var _credits_label: Label = $HUDTopBar/HBox/HUDLeft/CreditsLabel
@onready var _income_label: Label = $HUDTopBar/HBox/HUDLeft/IncomeLabel
@onready var _selection_label: Label = $HUDTopBar/HBox/HUDCenter/SelectionLabel
@onready var _mode_label: Label = $HUDTopBar/HBox/HUDRight/ModeLabel
@onready var _credits_flash_timer: Timer = $CreditsFlashTimer

@onready var _build_menu_panel: PanelContainer = $BuildMenuPanel
@onready var _build_list: VBoxContainer = $BuildMenuPanel/VBox/BuildScroll/BuildList
@onready var _train_section: VBoxContainer = $BuildMenuPanel/VBox/TrainSection
@onready var _train_list: VBoxContainer = $BuildMenuPanel/VBox/TrainSection/TrainScroll/TrainList
@onready var _build_tab: Button = $BuildTab
@onready var _minimap_panel: PanelContainer = $MinimapPanel

# ─── State ───────────────────────────────────────────────────────────
var _build_menu_open: bool = false
var _credits: int = 300
var _income: int = 5
var _credits_flash_active: bool = false

# ─── Colors (mirroring HTML5/CSS constants) ─────────────────────────
const _COLOR_ACCENT: Color = Color(0.204, 0.502, 1.0, 1.0)       # #3380FF blue
const _COLOR_INCOME: Color = Color(0.0, 1.0, 0.4, 1.0)          # #00FF66 green
const _COLOR_TEXT: Color = Color(1.0, 1.0, 1.0, 1.0)             # white
const _COLOR_DIM: Color = Color(0.4, 0.4, 0.4, 1.0)             # #666 dim
const _COLOR_DANGER: Color = Color(1.0, 0.3, 0.3, 1.0)          # red for low credits
const _COLOR_PANEL_BG: Color = Color(0.102, 0.102, 0.143, 0.97)  # rgba(26,26,38,0.97)

# ─── UI Dimensions (from GameConfig) ─────────────────────────────────
const _HUD_HEIGHT: int = 80
const _MINIMAP_W: int = 180
const _MINIMAP_H: int = 40
const _BUILD_MENU_W: int = 260
const _CREDIT_FLASH_THRESHOLD: int = 50

# ═══════════════════════════════════════════════════════════════════
# Built-in
# ═══════════════════════════════════════════════════════════════════

func _ready() -> void:
	_setup_build_tab()
	_setup_close_button()
	_update_credits()
	_update_income()
	_set_build_menu_open(false)

	# Start flash timer but keep it stopped initially
	_credits_flash_timer.timeout.connect(_on_credits_flash_timer_timeout)


# ═══════════════════════════════════════════════════════════════════
# Build Tab Setup
# ═══════════════════════════════════════════════════════════════════

func _setup_build_tab() -> void:
	_build_tab.toggled.connect(_on_build_tab_toggled)


# ═══════════════════════════════════════════════════════════════════
# Close Button Setup
# ═══════════════════════════════════════════════════════════════════

func _setup_close_button() -> void:
	var close_btn: Button = $BuildMenuPanel/VBox/MenuHeader/CloseButton
	if close_btn:
		close_btn.pressed.connect(_on_close_button_pressed)


# ═══════════════════════════════════════════════════════════════════
# Build Menu Toggle
# ═══════════════════════════════════════════════════════════════════

func toggle_build_menu() -> void:
	_set_build_menu_open(!_build_menu_open)


func _set_build_menu_open(open: bool) -> void:
	_build_menu_open = open
	
	var tween: Tween = create_tween()
	var target_x: float = -_BUILD_MENU_W if not open else 0.0
	var panel_pos: Vector2 = _build_menu_panel.position
	var current_x: float = panel_pos.x if _build_menu_open != open else 0.0
	
# Animate menu slide
	# tween.tween_property(_build_menu_panel, "position:x", target_x, 0.15).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	
	# Animate HUD padding shift (mimics CSS .menu-open padding)
	# Offset is handled by anchoring to right side instead
	
	_build_tab.button_pressed = open
	build_menu_toggled.emit(open)


# ═══════════════════════════════════════════════════════════════════
# Credits Update with Red Flash
# ═══════════════════════════════════════════════════════════════════

func update_credits(new_credits: int) -> void:
	_credits = new_credits
	_update_credits()


func _update_credits() -> void:
	_credits_label.text = "💰 %d" % _credits
	
	# Flash red when credits < threshold
	if _credits < _CREDIT_FLASH_THRESHOLD and not _credits_flash_active:
		_start_credits_flash()


func _start_credits_flash() -> void:
	_credits_flash_active = true
	__do_flash_step()


func __do_flash_step() -> void:
	if not _credits_flash_active:
		_credits_label.modulate = Color(1.0, 1.0, 1.0, 1.0)
		return
	
	# Alternate between normal and danger color
	var is_danger: bool = _credits_label.modulate == _COLOR_DANGER
	_credits_label.modulate = _COLOR_DANGER if not is_danger else Color(1.0, 1.0, 1.0, 1.0)
	_credits_flash_timer.start()


func _on_credits_flash_timer_timeout() -> void:
	_credits_flash_active = false


# ═══════════════════════════════════════════════════════════════════
# Income Update
# ═══════════════════════════════════════════════════════════════════

func update_income(new_income: int) -> void:
	_income = new_income
	_update_income()


func _update_income() -> void:
	_income_label.text = "+%d/s" % _income


# ═══════════════════════════════════════════════════════════════════
# Selection Info
# ═══════════════════════════════════════════════════════════════════

func update_selection_info(text: String) -> void:
	_selection_label.text = text if text != "" else "TAP A UNIT OR BUILDING"


# ═══════════════════════════════════════════════════════════════════
# Mode Label
# ═══════════════════════════════════════════════════════════════════

func update_mode_label(text: String) -> void:
	_mode_label.text = text if text != "" else "—"


# ═══════════════════════════════════════════════════════════════════
# Build List Population
# ═══════════════════════════════════════════════════════════════════

func populate_build_list(building_entries: Array) -> void:
	for child in _build_list.get_children():
		child.queue_free()

	for entry in building_entries:
		var item: Button = _create_build_item(
			entry.get("name", ""),
			entry.get("cost", 0),
			entry.get("icon", "■"),
			entry.get("type", ""),
			entry.get("disabled", false)
		)
		_build_list.add_child(item)


func _create_build_item(display_name: String, cost: int, icon: String, btype: String, disabled: bool = false) -> Button:
	var btn := Button.new()
	btn.text = "%s  %s   %d💰" % [icon, display_name, cost]
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
	btn.disabled = disabled
	if not disabled:
		btn.pressed.connect(func(): build_item_selected.emit(btype))
	return btn


# ═══════════════════════════════════════════════════════════════════
# Train List Population
# ═══════════════════════════════════════════════════════════════════

func show_train_section(show: bool) -> void:
	_train_section.visible = show


func populate_train_list(unit_entries: Array) -> void:
	for child in _train_list.get_children():
		child.queue_free()

	for entry in unit_entries:
		var item: Button = _create_train_item(
			entry.get("name", ""),
			entry.get("cost", 0),
			entry.get("time", 0.0),
			entry.get("type", ""),
			entry.get("queued", false),
			entry.get("disabled", false)
		)
		_train_list.add_child(item)


func _create_train_item(display_name: String, cost: int, train_time: float, utype: String, queued: bool = false, disabled: bool = false) -> Button:
	var btn := Button.new()
	btn.text = "%s   %d💰   %.1fs" % [display_name, cost, train_time]
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
	btn.disabled = disabled
	if queued:
		btn.modulate = Color(0.0, 1.0, 0.4, 0.8)
	if not disabled:
		btn.pressed.connect(func(): train_item_selected.emit(utype))
	return btn


# ═══════════════════════════════════════════════════════════════════
# Signal Callbacks
# ═══════════════════════════════════════════════════════════════════

func _on_build_tab_toggled(button_pressed: bool) -> void:
	_set_build_menu_open(button_pressed)


func _on_close_button_pressed() -> void:
	_set_build_menu_open(false)


# ═══════════════════════════════════════════════════════════════════
# Minimap Reference
# ═══════════════════════════════════════════════════════════════════

func get_minimap_panel() -> PanelContainer:
	return _minimap_panel


func set_minimap_texture(texture: Texture2D) -> void:
	var tex_rect: TextureRect = $MinimapPanel/MinimapTextureRect
	if tex_rect:
		tex_rect.texture = texture