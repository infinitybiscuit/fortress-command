# Slop Wars: The Next Generation

A side-scrolling platformer / RTS crossover. Build bases, train armies, construct defences, and conquer the opposing forces across a procedurally generated battlefield. It was originally called *Fortress Command*.

**Play it:** <https://infinitybiscuit.github.io/fortress-command/> (works best on a phone in portrait; add it to your home screen).

## About the name

*Slop Wars: The Next Generation* is a deliberate mash-up of *Star Wars* and *Star Trek: The Next Generation*, with a couple of nods built in:

- **"Slop":** the game was made with heavy help from AI, and we know that kind of work can be dismissed as "AI slop". The name owns that, and shows that humans were involved too. It could not have happened on its own.
- **"The Next Generation":** a nod to the AI *generation* used to create it.

## Web version (iPhone)

The `web/` folder has a no-build HTML5 version tuned for iPhone portrait play: online play for up to 4 players, nine themes (Classic, Rise of the Robots, Medieval, Gangsters, Warring States, Steam Shogun, Winter War, Cartel Wars, Trade Wars), and more. See [`web/README.md`](web/README.md).

The original Godot 4 project is in `godot/`.

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
.
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
├── web/                       ← the HTML5 game (see web/README.md)
├── relay/                     ← Cloudflare Worker: matchmaking + TURN relay credentials
├── entities.txt               ← unit definitions
├── foundation.txt             ← building/terrain definitions
├── SPEC.md                    ← design specification
├── README.md                  ← this file
└── LICENSE                    ← MIT
```

## Development

Open `godot/project.godot` in Godot 4. The project uses GDScript with Godot's built-in scene system.

## Credits

Slop Wars: The Next Generation (originally Fortress Command): inspired by Rick Dangerous, Lemmings and Command & Conquer. Made by humans and AI together.