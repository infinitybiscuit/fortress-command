# Fortress Command — Web Port Spec

## 1. Concept & Vision

**Fortress Command** is a side-scrolling platformer/RTS crossover that runs in any modern browser — desktop and mobile. Players build bases on procedurally generated terrain, train armies, and crush the opposition. The feel is nostalgic Command & Conquer meets Lemmings: chunky pixel-adjacent art drawn procedurally, satisfying micro-management, and frantic platformer traversal.

**Target:** Single HTML file (no build step) using vanilla JS + HTML5 Canvas. Deployable to GitHub Pages or any static host. Touch-first mobile design with desktop keyboard/mouse support.

---

## 2. Design Language

### Aesthetic Direction
Retro pixel-art-adjacent but drawn procedurally with Canvas primitives — bold flat colors, clean geometric shapes, no external sprites.

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
- Primary: `'Courier New', monospace` for terminal feel
- HUD: bold, 14–20px, high contrast
- No external font dependencies (inline everything)

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
- All drawn procedurally with Canvas 2D API — no external images or sprites
- Units: colored rounded rectangles with facing triangle
- Buildings: outlined rectangles with type-specific interior marks
- Terrain: solid color rectangles per tile type
- Projectiles: yellow filled circles

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
│(260px) │      (main canvas)      │       │
│        │                        │       │
└────────┴────────────────────────┴───────┘
```

### Responsive Strategy
- Canvas fills entire viewport at device pixel ratio
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
- Can't afford building/unit: button disabled (opacity 0.4, no response)
- Building placement on solid ground only: red preview if invalid
- Overlapping buildings: prohibited, red preview
- Game over: all input blocked until Restart/Menu tapped
- Window resize: canvas scales, game continues
- Tab hidden: `requestAnimationFrame` pauses naturally (browser throttles)

---

## 5. Component Inventory

### HUD Bar
- Left: `💰 340  (+5/s)` — credits + income rate
- Center: selected unit/building info — `SOLDIER  HP: 23/30`
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
- Dead: removed from render

### Building Visual States
- Under construction: outlined rectangle + progress bar fill
- Operational: filled rectangle + type-specific interior detail (HQ flag, turret barrel, etc.)
- Destroyed: removed from render
- Selected: green ring around building footprint

---

## 6. Technical Approach

### Stack
- Single self-contained `index.html` — HTML + CSS + JavaScript in one file
- Vanilla JavaScript ES6+ (no TypeScript, no build step)
- HTML5 Canvas 2D API for all game rendering
- HTML/CSS overlay for HUD, menus (cleaner than pure canvas text)
- No runtime dependencies — works offline after first load
- Google Fonts CDN for typography (optional, falls back to system monospace)

### Architecture

```javascript
// All code lives in a single <script> block

// === CONFIG (ported from Python config.py) ===
const CONFIG = { TILE_SIZE: 32, MAP_WIDTH_TILES: 200, ... }

// === MATH / UTILITY ===
class Vec2 { add, sub, scale, length, normalize, ... }

// === WORLD ===
class TileMap { generate(), isSolid(), canPlaceBuilding(), ... }
class Camera { x, targetX, focusOn(), update(), worldToScreen(), screenToWorld() }

// === ENTITIES ===
class Unit { update(), takeDamage(), performAttack(), ... }
class Building { update(), queueTrain(), ... }
class Projectile { update(), ... }

// === INPUT ===
class InputHandler { handlePointerDown/Move/Up(), handleKeyDown/Up() }

// === SYSTEMS ===
class CombatSystem { resolveAttacks(), ... }
class EconomySystem { tick(), ... }

// === PLAYERS ===
class CpuPlayer { update(), ... }
class HumanPlayer { issueOrder(), ... }

// === SCENES ===
class SceneManager { currentScene, transition(), ... }

// === RENDERING ===
class Renderer { drawUnit(), drawBuilding(), drawTerrain(), ... }

// === MINIMAP ===
class MinimapRenderer { render(), ... }

// === BOOT ===
function main() { ... }
```

### Input
- Pointer Events API (`pointerdown`, `pointermove`, `pointerup`) for unified mouse + touch
- `touch-action: none` on canvas to prevent browser gestures
- `Keyboard` events for desktop shortcuts (Q=menu, Esc=deselect, 1-4 not mapped in v1)
- Touch: left-edge swipe (30px threshold) opens build menu
- `event.preventDefault()` blocks scroll/zoom on mobile

### Physics (unchanged from original)
- Gravity: 900 px/s²
- Terminal velocity: 600 px/s
- Jump velocity: -360 px/s (negative = upward)
- Separate-axis AABB tile collision (horizontal resolved, then vertical)
- `int()` replaced with `Math.floor()` for tile coordinate conversion (fixes Python bug)

### Game Loop
```javascript
let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.25);
  lastTime = timestamp;
  if (scene !== 'game_over') {
    update(dt);
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### Responsive Canvas
```javascript
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resizeCanvas);
```

### Deploy
```
https://github.com/infinitybiscuit/fortress-command
→ Settings → Pages → Source: main branch, / (root)
→ Game live at: https://infinitybiscuit.github.io/fortress-command/
```

---

## 7. Porting Reference (Python → JavaScript)

| Python Original | Web Port |
|---|---|
| `scene` module (Pythonista) | HTML5 Canvas 2D API |
| `scene.Scene` base class | Custom `GameScene` class with `update()` loop |
| `scene.run(scene)` | `requestAnimationFrame` |
| `scene.Touch` | Pointer Events API |
| `scene.Shape` drawing | Canvas 2D `fillRect`, `strokeRect`, arcs |
| TileMap via Python `random` seed | `Math.random()` (no seed for true variation) |
| `int()` truncation for negative coords | `Math.floor()` (fixes original bug) |
| `__init__.py` module pattern | ES6 classes in single file |
| File-based module imports | Class definitions in script order |
| Hardcoded `seed=42` | Removed — different map every play |
| No audio | Audio deferred to v2 |
| Config dicts from `config.py` | `CONFIG` object literal |

---

## 8. Project Structure

```
fortress-command/
├── index.html    ← single-file game (HTML+CSS+JS, ~1500–2000 lines)
├── SPEC.md       ← this file
├── README.md     ← how to play, controls, deploy notes
└── LICENSE       ← MIT
```