## Projectile — Fortress Command projectile entity
## A lightweight Node2D that flies from a shooter toward a target and applies
## damage on impact. Rendered via GameRenderer.draw_projectile in local space
## so the active Camera2D handles the world→screen transform.

extends Node2D

var target: Node = null
var target_pos: Vector2 = Vector2.ZERO
var speed: float = 350.0
var damage: float = 0.0
var faction: int = 0
var radius: float = 3.0
var _angle: float = 0.0
var _max_lifetime: float = 4.0

func setup(from_pos: Vector2, target_node: Node, dmg: float, fac: int) -> void:
	global_position = from_pos
	target = target_node
	damage = dmg
	faction = fac
	if target != null and is_instance_valid(target):
		target_pos = _aim_point(target)

func _aim_point(t: Node) -> Vector2:
	# Aim at roughly the centre of the target's body (its origin is the feet)
	return t.global_position - Vector2(0, 10)

func _physics_process(delta: float) -> void:
	queue_redraw()

	_max_lifetime -= delta
	if _max_lifetime <= 0.0:
		queue_free()
		return

	# Track a live target, otherwise fly to its last known position
	if target != null and is_instance_valid(target) and target.get("current_state") != 4:
		target_pos = _aim_point(target)

	var to_target: Vector2 = target_pos - global_position
	var dist: float = to_target.length()
	_angle = to_target.angle()

	var step: float = speed * delta
	if dist <= step or dist < 4.0:
		_impact()
		return
	global_position += (to_target / dist) * step

func _impact() -> void:
	if target != null and is_instance_valid(target) and target.has_method("take_damage"):
		if target.get("faction") != faction:
			target.take_damage(damage)
	queue_free()

func _draw() -> void:
	GameRenderer.draw_projectile(self, Vector2.ZERO, radius, _angle)
