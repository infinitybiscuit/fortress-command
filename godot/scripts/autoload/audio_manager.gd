extends Node

## Audio Manager — manages music and SFX playback.
## Audio files (.ogg or .mp3) go in res://audio/music/ and res://audio/sfx/.
## Audio buses "Music" and "SFX" must be configured in the Godot project.

func _ready() -> void:
	pass

func play_menu_music() -> void:
	pass

func play_game_music() -> void:
	pass

func stop_music() -> void:
	pass

func play_sfx(sfx_name: String) -> void:
	pass