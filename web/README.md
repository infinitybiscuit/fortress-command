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

## Online 1 vs 1 (two phones)

Play a friend on their own device, anywhere with internet:

1. Both players open the game and tap **🌐 Online 1 vs 1**.
2. One player taps **Host a game** and gets a 5-letter room code. **Share invite** opens the iOS share sheet with a link that drops your friend straight into the game.
3. The other player types the code and taps **Join**, or opens the invite link.

The host plays **Blue** (left) and the guest plays **Red** (right). Both use the normal controls. Online games can't be paused. ⏸ opens the menu, but the battle keeps going. The latency to your opponent shows under your name. After a game, the host can start a **Rematch**.

**How it works.** The phones connect directly to each other (WebRTC, via the bundled [PeerJS](https://peerjs.com) library). PeerJS's free public server only introduces them. The host's phone runs the game. The guest sends its orders and receives the battlefield state about 12 times a second, smoothed between updates. Both players must be on the same app version; the menu shows it.

**Limits.**
- If either player leaves or closes the app, the game ends for both.
- If the host switches away from the app, the game freezes until they come back.
- Some mobile carriers and strict networks block direct connections. If joining keeps failing, put one or both phones on Wi-Fi.
- Two tabs on one device can play each other without the internet by adding `?net=local` to the URL, which is handy for testing.

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
| Repair | Select engineers, tap a damaged friendly building or vehicle |
| Hold / Charge / Retreat | Buttons in the unit panel |
| Train | Tap your Barracks/Workshop, then tap a unit type |
| Sell | Tap your structure, then **Sell** twice: a full refund while it's still being built, otherwise 50% of its cost scaled by remaining health, plus any queued units. The HQ can't be sold |
| Build | Tap a structure, tap the map to preview (green = valid), tap again or press **Place** |

Placement snaps to the surface under your finger. Bridges and ramps stay in placement mode
after each block, so you can lay several in a row.

Desktop works too: click instead of tap, mouse wheel zooms, WASD or the arrow keys pan,
and Esc cancels.

## Walls

Walls (💰50, 1000 HP) block enemy units, and your own troops walk straight through them. Bullets do half damage to walls; tank shells and artillery do full damage. Enemies that run into a wall stop and attack it, then carry on with their orders once it falls. Walls also stop direct fire: bullets and tank shells aimed past a wall hit the wall instead. Lobbed artillery shells arc over walls.

## Unit behaviour

- **Aggressive:** idle units notice enemies 120px beyond their weapon range (220px minimum) and attack them. Units on a move order fight anything that comes into range, then carry on to their destination. Units heading for a building turn on enemy units that come into range.
- **Defensive:** units that get shot hit back. When a unit or building is hit, nearby idle friendlies rally to it. After a chase, idle units return to the spot they left, and they give up a chase after 450px. Idle engineers repair damaged buildings and vehicles nearby.
- **Hold** keeps units in place, and they still fire at anything in range. **Retreat** heads home without stopping to fight.
- Units give up on targets they can't reach (for example, something on a platform above their range) or that they've been stuck trying to reach for 2 seconds.
- **CPU:** units defend their base when it's raided. Otherwise they march on the nearest enemy HQ and fight whatever gets in the way.

## Vehicles (Workshop)

| Vehicle | Cost | Build | Role |
|---|---|---|---|
| 🚙 Jeep | 120 | 6s | Fast raider (240 speed), rapid machine gun |
| Tank | 300 | 12s | 450 HP armour; cannon shells do splash damage (40px), ×1.25 vs buildings |
| Artillery | 260 | 10s | 340 range; lobbed shells land where the target *was*, with big splash (60px), ×1.75 vs buildings. Fragile, so keep it behind your lines |

Vehicles climb ramps just like infantry, and engineers can repair them. From about 90 seconds in, the CPU builds its own Workshop and mixes jeeps, tanks and artillery into its attacks.

## Aircraft (Airbase)

The Airbase costs 300, takes 10s to build and has 300 HP.

| Aircraft | Cost | Build | Role |
|---|---|---|---|
| 🚁 Helicopter | 260 | 10s | Gunship, 220 HP. Flies over walls and terrain and hovers over its target. It can attack ground units and other aircraft. |
| ✈️ Bomber | 400 | 15s | 320 HP. Cruises above the battlefield and makes bombing runs, dropping a splash bomb (110 damage, ×1.6 vs buildings) each time it passes over its target. It can only hit ground targets. |

**Anti-air:** only bullets can hit aircraft, so use infantry, jeeps, helicopters and turrets. Tanks and artillery can't hit aircraft, and ground blasts don't reach them. Bombers fly too high for ground units, so you need turrets (420px anti-air range, 30 damage per shot against aircraft) or helicopters to bring them down. Aircraft take off from the airbase when they're built.

After about 3 minutes the CPU builds an airbase and adds helicopters and bombers to its army.

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
