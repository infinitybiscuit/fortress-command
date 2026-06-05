extends Node

# Audio Manager for Godot
# Manages music and SFX playback across the game
#
# NOTE: Audio files (.ogg or .mp3) need to be added separately.
# Place audio files in res://audio/music/ and res://audio/sfx/ directories.
# Expected files: menu_music.ogg, game_music.ogg, and SFX files.
#
# Audio buses "Music" and "SFX" must be configured in the Godot project.

# Stream players for music
onready var menu_music := AudioStreamPlayer.new()
onready var game_music := AudioStreamPlayer.new()

# Stream player for sound effects
onready var sfx_player := AudioStreamPlayer.new()

func _ready() -> void:
	_setup_player(menu_music, "Music")
	_setup_player(game_music, "Music")
	_setup_player(sfx_player, "SFX")


func _setup_player(player: AudioStreamPlayer, bus: String) -> void:
	player.bus = bus
	add_child(player)


# ─── Music Control ────────────────────────────────────────────────────────────

func play_menu_music() -> void:
	# TODO: Load and play res://audio/music/menu_music.ogg
	game_music.stop()
	menu_music.play()


func play_game_music() -> void:
	# TODO: Load and play res://audio/music/game_music.ogg
	menu_music.stop()
	game_music.play()


func stop_music() -> void:
	menu_music.stop()
	game_music.stop()


# ─── SFX Control ─────────────────────────────────────────────────────────────

func play_sfx(sfx_name: String) -> void:
	# TODO: Load and play res://audio/sfx/%s.ogg % sfx_name
	# Placeholder implementation — no actual audio files required yet.
	pass