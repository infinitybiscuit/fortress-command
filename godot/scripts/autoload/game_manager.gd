extends Node

var credits: int = 300
var income_rate: int = 5
var current_scene: String = "menu"

func _ready():
	print("GameManager initialized - Credits: ", credits, ", Income Rate: ", income_rate, ", Scene: ", current_scene)