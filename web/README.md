# Fortress Command — Web (iPhone portrait)

A browser port of the Godot game in `../godot`. It's plain HTML5 Canvas and ES modules with
no build step, laid out for an **iPhone 16 Pro Max in portrait** (440×956 pt, 3× display).
It also runs in any modern desktop or mobile browser.

## Play

Serve this folder from any static host and open it in Safari:

```bash
cd web
python3 -m http.server 8000
# then open http://<your-computer's-LAN-IP>:8000 on the iPhone
```

For a full-screen, app-like experience tap **Share → Add to Home Screen**. The page ships a
web manifest and service worker, so the game launches without browser chrome and keeps working
offline after the first load. When served over HTTPS (e.g. GitHub Pages, see
`.github/workflows/pages.yml`), the service worker caches the assets.

## Controls (touch)

| Action | Gesture |
|---|---|
| Pan the battlefield | Drag (with momentum) |
| Zoom | Pinch, or the ＋ / － buttons |
| Jump the camera | Tap or drag the minimap |
| Select a unit | Tap it |
| Select all units of a type on screen | Double-tap a unit |
| Select your whole army | **All units** |
| Move | With units selected, tap the ground |
| Attack | With units selected, tap an enemy unit or building |
| Repair | Select engineers, tap a damaged friendly building |
| Hold / Charge / Retreat | Buttons in the unit panel |
| Train | Tap your Barracks/Workshop, then tap a unit type |
| Build | Tap a structure, tap the map to preview (green = valid), tap again or press **Place** |

Placement snaps to the surface under your finger. Bridges and ramps stay in placement mode
after each block, so you can lay several in a row.

Desktop works too: click instead of tap, mouse wheel zooms, WASD or the arrow keys pan,
and Esc cancels.

## Layout

```
┌──────────── safe area (Dynamic Island) ────────────┐
│ 💰 credits  +income/s     YOU · mode         ⏸     │  HUD
├────────────────────────────────────────────────────┤
│                                                    │
│            scrolling battlefield (canvas)          │
│                                          ＋ －     │
├────────────────────────────────────────────────────┤
│ ▬▬ minimap (tap / drag to jump) ▬▬                 │
├────────────────────────────────────────────────────┤
│ Context panel: build grid │ unit orders │ training │
└──────────── safe area (home indicator) ────────────┘
```

## Code map

| File | Ported from |
|---|---|
| `js/config.js` | `autoload/game_config.gd` + the stats tables in `unit.gd` / `building.gd` |
| `js/tilemap.js` | `game/tilemap.gd` |
| `js/entities.js` | `entities/unit.gd`, `building.gd`, `projectile.gd` (same AABB physics and ramp step-up) |
| `js/game.js` | `game/game_scene.gd` (economy, AI, spawning, win check) |
| `js/render.js` | `autoload/game_renderer.gd`, `minimap_renderer.gd` |
| `js/main.js` | new: camera, touch input, HUD and panels, overlays, main loop |

### Differences from the Godot build
- **1 vs 1 Local** is real hot-seat play: the ⇄ button hands control to the other player.
- **Free-for-All (3/4)** gives you one human player against 2 or 3 CPUs.
- Game over: you lose when your HQ falls, and you win when every rival HQ is gone. When a
  player's HQ is destroyed, the rest of their units and buildings go with it.
- Buildings can't overlap. The Godot version never recorded building footprints, so
  overlapping was possible there.
- Units measure range to the nearest edge of a building, not to its top-left corner, so you
  can attack a building from either side. Engineers repair friendly buildings.
- The CPU builds toward the middle of the map and adds Heavies to its army after 2 minutes.
