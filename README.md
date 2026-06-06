# Fortress Command

A side-scrolling platformer / RTS crossover built in Godot 4.

Build bases, train armies, construct defences, and conquer the opposing forces across a procedurally generated battlefield.

## How to Play

Open the project in Godot 4 (editior or exported binary). Select a scene under `godot/scenes/game/` and press F5 to run.

### Controls

**Desktop (PC)**
- **Click** a unit or building to select it
- **Click** empty ground to issue a move order
- **Click** an enemy unit or building to issue an attack order
- **Drag** to pan the camera
- **Q** — toggle the build menu
- **Esc** — cancel build placement

**Mobile (Touch)**
- **Tap** a unit or building to select it
- **Tap** empty ground to move selected units
- **Tap** an enemy to attack
- **Swipe** the game world to pan the camera
- **Swipe in** from the left edge (or tap `▸`) to open the build menu
- **Tap** a valid tile (green preview) to place a building

### Game Modes

| Mode | Description |
|------|-------------|
| **1 vs CPU** | You (blue) vs one AI opponent (red) |
| **1 vs 1 Local** | Two human players on the same device |
| **Free-for-All (3)** | You vs two AI opponents |
| **Free-for-All (4)** | You vs three AI opponents |

### Win Condition

Destroy the enemy HQ. Last player standing wins.

### Building & Units

Open the build menu (`▸` tab) to place structures:
- **Barracks** — trains soldiers, heavies, and scouts
- **Turret** — auto-attacks nearby enemies
- **Wall** — blocks movement
- **Mine** — generates +15 credits/tick
- **Workshop** — trains engineers

Units are trained by selecting a barracks or workshop, then tapping a unit type in the build menu.

## Project Structure

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
│       ├── autoload/          ← singleton systems
│       ├── entities/          ← unit & building scripts
│       ├── game/              ← game logic scripts
│       └── ui/                ← UI scripts
├── entities.txt               ← unit definitions
├── foundation.txt             ← building/terrain definitions
├── SPEC.md                    ← design specification
├── README.md                  ← this file
└── LICENSE                    ← MIT
```

## Development

Open `godot/project.godot` in Godot 4. The project uses GDScript with Godot's built-in scene system.

## Credits

Original Fortress Command — Rick Dangerous / Lemmings / Command & Conquer inspired.