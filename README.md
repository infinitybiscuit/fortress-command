# Fortress Command

A side-scrolling platformer / RTS crossover game that runs in any modern browser — desktop and mobile.

Build bases, train armies, construct defences, and conquer the opposing forces across a procedurally generated battlefield.

## How to Play

Open `index.html` in any browser. No server required.

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

## Architecture

Single HTML file (~1900 lines) with vanilla JavaScript + HTML5 Canvas. No build step, no npm, no external runtime dependencies.

```
index.html
 ├── HTML skeleton + CSS (UI overlays, HUD, menus)
 ├── CONFIG          — all game constants
 ├── TileMap         — procedural terrain
 ├── Camera          — scrolling camera with lerp
 ├── Unit            — unit entity with platformer physics
 ├── Building        — building entity with construction/training
 ├── Projectile      — flying projectiles
 ├── Player          — base player class
 ├── HumanPlayer     — touch/mouse input handling
 ├── CpuPlayer       — AI decision-making
 ├── CombatSystem    — attack resolution, projectiles
 ├── EconomySystem   — per-tick credit generation
 ├── InputHandler    — unified pointer + keyboard input
 ├── Renderer        — all canvas draw calls
 ├── MinimapRenderer — minimap draw pass
 └── FortressCommand — main game loop + scene management
```

## Deploy

```bash
git push origin main
# Then enable GitHub Pages:
# Repository Settings → Pages → Source: main branch, / (root)
# Game lives at: https://infinitybiscuit.github.io/fortress-command/
```

## Development

All game logic lives in `index.html`. Edit in any text editor — refresh the browser to see changes.

## Credits

Original Fortress Command for Pythonista 3 — Rick Dangerous / Lemmings / Command & Conquer inspired.