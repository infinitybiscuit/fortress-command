# Fortress Command — Godot Spec

## 1. Concept & Vision

**Fortress Command** is a side-scrolling platformer/RTS crossover built in Godot 4. Players build bases on procedurally generated terrain, train armies, and crush the opposition. The feel is nostalgic Command & Conquer meets Lemmings: chunky pixel-adjacent art drawn procedurally, satisfying micro-management, and frantic platformer traversal.

**Target:** Godot 4 project using GDScript and Godot's built-in scene system. Export to desktop and mobile platforms. Touch-first mobile design with desktop keyboard/mouse support.

---

## 2. Design Language

### Aesthetic Direction
Retro pixel-art-adjacent but drawn procedurally with Godot's `ColorRect`, `Sprite2D`, and Shape2D primitives — bold flat colors, clean geometric shapes, no external sprite dependencies required.

### Color Palette
```
Sky gradient top:  #141A38
Sky gradient bot:  #2D3850
Ground:            #4D3D2E
Platform:          #595248
Bridge:            #734D26
UI Background:     rgba(26, 26, 38, 0.85)
UI Accent:         #3380FF
UI Text:           #FFFFFF
Selection ring:    #00FF66
Unit friendly:     #3366FF
Unit enemy:        #FF4D4D
Damage flash:      #FFFFFF
```

### Typography
- Primary: Godot's built-in font (system default)
- HUD: bold, 14–20px, high contrast
- No external font dependencies

### Spatial System
- Tile size: 32px (same as original)
- Map: 200 tiles wide × 20 tiles tall (scrolling world)
- HUD: 80px tall at top
- Build menu: 260px wide, slides in from left edge
- Minimap: 180×40px, bottom-right corner

### Motion Philosophy
- Camera: smooth lerp (factor 0.08), edge-scrolling when cursor near viewport edge
- UI: instant transitions, no animation
- Damage flash: 150ms white overlay on hit
- Building placement: green/red tile preview for valid/invalid placement

### Visual Assets
- All drawn procedurally with Godot 2D primitives — no external images or sprites required
- Units: colored rounded rectangles with facing triangle (via `Polygon2D` or `ColorRect`)
- Buildings: outlined rectangles with type-specific interior marks
- Terrain: solid color rectangles per tile type
- Projectiles: yellow filled circles (`CircleShape2D` + `ColorRect`)

---

## 3. Layout & Structure

### Screen Flow
```
[Menu Screen]  → tap "START" →  [Game Screen]  →  game over  →  [Game Over Overlay]
                                   ↑↓ restart                    ↓ tap button
                              [Menu Screen]
```

### Game Screen Layers
```
┌─────────────────────────────────────────┐
│ HUD (80px) — credits, income, selection info │
├────────┬────────────────────────┬───────┤
│ Build  │                        │Minimap│
│ Menu   │   Scrolling Game World  │(180×40│
│(260px) │      (main viewport)    │       │
│        │                        │       │
└────────┴────────────────────────┴───────┘
```

### Responsive Strategy
- Viewport fills entire window at device pixel ratio
- Build menu: fixed 260px on desktop; full-width bottom sheet on mobile (< 600px wide)
- All touch targets minimum 44px for mobile accessibility
- HUD font scales with viewport width (clamp between 12–20px)

---

## 4. Features & Interactions

### Core Game Loop
1. Each player earns credits per resource tick (from HQ + mines)
2. Human player issues move/attack/place orders via UI
3. CPU AI runs on interval (2s default): builds economy → trains units → attacks
4. Combat system resolves melee attacks, projectile firing, and damage
5. Win when all enemy HQs are destroyed; last player standing wins

### Interactions by Platform

| Action | PC | Mobile |
|---|---|---|
| Select unit | Left-click | Single tap |
| Add to selection | Ctrl+Click | Double-tap another own unit |
| Deselect all | Esc / click empty | Tap empty ground |
| Issue move order | Click empty ground | Tap empty ground |
| Issue attack order | Click enemy unit | Tap enemy unit |
| Pan camera | Drag / arrow keys / edge scroll | Swipe/drag |
| Open build menu | Q key or click `>` tab | Swipe right from left edge, or tap `>` |
| Place building | Click valid tile | Tap valid tile |
| Cancel placement | Right-click or Esc | Tap X button or tap invalid area |
| Train unit | Select building → click unit type | Select building → tap unit type |
| Jump camera to minimap point | Click minimap | Tap minimap |

### Building Placement
1. Open build menu (`>` tab or Q key)
2. Tap/click affordable building type → enters placement mode
3. Ghost preview follows cursor/finger (green = valid, red = invalid terrain or overlap)
4. Tap/click to confirm placement (credits deducted immediately)
5. Building appears with construction progress bar (build_time seconds)
6. On completion: starts income generation or enables unit training

### Unit Training Flow
1. Tap own Barracks or Workshop → building selected
2. Build menu bottom section shows trainable unit types with cost/time
3. Tap unit type → added to training queue, cost deducted instantly
4. Unit spawns at building origin when training finishes (3–8s depending on unit)
5. Units walk forward from building exit

### Edge Cases
- Can't afford building/unit: button disabled (modulate alpha 0.4, no response)
- Building placement on solid ground only: red preview if invalid
- Overlapping buildings: prohibited, red preview
- Game over: all input blocked until Restart/Menu tapped
- Window resize: viewport scales, game continues
- Tab hidden: `process` loop pauses naturally (Godot throttles)

---

## 5. Component Inventory

### HUD Bar
- Left: credits + income rate
- Center: selected unit/building info
- Right: current game mode label
- States: normal; low-credit warning (red text when credits < 50)

### Build Menu
- `>` tab always visible on left edge (28×80px, semi-transparent)
- Menu body: 260px wide, full viewport height, dark background
- Building list: icon + name + cost + build time
- Disabled state: greyed out, no tap response
- Train section (bottom, shown when building selected): unit type buttons
- Close: tap X or swipe left or tap outside

### Minimap
- 180×40px bottom-right, dark background with colored dots
- White rectangle = current camera viewport
- Click/tap jumps camera to that world position

### Menu Screen
- "FORTRESS COMMAND" title centered, large bold text
- Mode buttons stacked vertically: "1 vs CPU", "1 vs 1 Local", "Free-for-All (3)", "Free-for-All (4)"
- Tap/click to start game

### Game Over Overlay
- Semi-transparent dark overlay covering canvas
- "VICTORY" (green) or "DEFEAT" (red) centered text
- "RESTART" and "MENU" buttons below

### Unit Visual States
- Idle: static colored rounded rect
- Moving: same + small dust particles (optional v2)
- Attacking: unit flashes slightly on each attack frame
- Selected: green ring (2px, full unit height)
- Damaged: white overlay flash for 150ms
- HP bar: only shown when damaged or selected (small bar above unit)
- Dead: removed from scene

### Building Visual States
- Under construction: outlined rectangle + progress bar fill
- Operational: filled rectangle + type-specific interior detail (HQ flag, turret barrel, etc.)
- Destroyed: removed from scene
- Selected: green ring around building footprint

---

## 6. Technical Approach

### Stack
- Godot 4.x with GDScript
- Godot's built-in 2D scene system (no external engines)
- `Node2D`-based scenes for all game entities
- `CharacterBody2D` for units (platformer physics)
- `Area2D` / `StaticBody2D` for buildings and terrain
- `Camera2D` for viewport scrolling

### Architecture

```
godot/
├── project.godot          ← project manifest + settings
├── scenes/
│   ├── root.tscn         ← main entry scene (boot)
│   ├── game/
│   │   ├── game.tscn      ← main game scene
│   │   └── ...            ← game-specific scenes
│   ├── entities/
│   │   ├── unit.tscn      ← base unit scene
│   │   ├── building.tscn   ← base building scene
│   │   ├── projectile.tscn ← projectile scene
│   │   └── ...            ← entity variants
│   └── ui/
│       ├── hud.tscn       ← heads-up display
│       ├── build_menu.tscn ← structure placement UI
│       └── ...
└── scripts/
    ├── root.gd            ← project entry point
    ├── autoload/
    │   ├── config.gd      ← all game constants (singleton)
    │   ├── combat.gd      ← attack resolution
    │   ├── economy.gd     ← per-tick credit generation
    │   └── ai.gd          ← CPU player decision-making
    ├── entities/
    │   ├── unit.gd        ← unit entity logic
    │   ├── building.gd     ← building logic
    │   └── projectile.gd   ← projectile logic
    ├── game/
    │   ├── tile_map.gd    ← procedural terrain
    │   ├── camera.gd      ← scrolling camera
    │   └── scene_game.gd  ← main game scene logic
    └── ui/
        ├── hud.gd         ← HUD logic
        └── build_menu.gd  ← build menu logic
```

### Physics (unchanged from original)
- Gravity: 900 px/s²
- Terminal velocity: 600 px/s
- Jump velocity: -360 px/s (negative = upward)
- Separate-axis AABB tile collision (horizontal resolved, then vertical)

### Game Loop
Godot's built-in `_process()` / `_physics_process()` delta loop. No custom loop required.

### Deploy
Export via Godot's built-in export presets:
```bash
# Desktop (Linux/Windows/macOS)
godot --headless --export-release "Linux/X11" build/

# Mobile (Android/iOS)
godot --headless --export-release "Android" build/app.apk
```

---

## 7. Original to Godot Reference

| Original | Godot 4 Equivalent |
|---|---|
| `scene` module | Godot's scene system (`Node2D`, `CharacterBody2D`, etc.) |
| `scene.Scene` base class | `_process()` / `_physics_process()` loop |
| `scene.run(scene)` | Press F5 in editor or `--headless --export` |
| `scene.Touch` | `InputEventScreenTouch` / `InputEventMouseButton` |
| `scene.Shape` drawing | `ColorRect`, `Polygon2D`, `CircleShape2D` |
| TileMap via Python `random` seed | `ConfigFile` or inline `randi()` / `randf()` |
| `int()` truncation for negative coords | `int()` (GDScript truncates toward zero; use `floor()` for flooring) |
| Config dicts from `config.py` | `config.gd` autoload singleton |
| Hardcoded `seed=42` | Removed — different map every play |
| No audio | Audio deferred to v2 |

---

## 8. Project Structure

```
fortress-command/
├── godot/
│   ├── project.godot          ← Godot 4 project file
│   ├── scenes/
│   │   ├── root.tscn          ← root scene
│   │   ├── game/              ← game scenes
│   │   ├── entities/          ← unit & building scenes
│   │   └── ui/                ← HUD, menus, build menu
│   └── scripts/
│       ├── root.gd            ← project entry point
│       ├── autoload/           ← singleton systems
│       ├── entities/          ← unit & building scripts
│       ├── game/              ← game logic scripts
│       └── ui/                ← UI scripts
├── entities.txt               ← unit definitions
├── foundation.txt             ← building/terrain definitions
├── SPEC.md                    ← this file
├── README.md                 ← how to play, setup, project layout
└── LICENSE                   ← MIT
```