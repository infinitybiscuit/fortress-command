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

## Look and feel

The art style is a homage to early-90s home-computer war games: chunky, crisp pixel art in a bright palette.
- **Sharp pixels:** the battlefield is drawn as real pixel art. One art pixel is 2 world units, and zoom snaps so each art pixel covers a whole number of screen pixels. Nothing is smoothed or blurred, and scrolling stays smooth.
- **Sprites:** every sprite is pixel art built in code with a shared palette and dark outlines, and pre-rendered once per team:
  - Big-headed soldiers with role-specific gear.
  - Vehicles and aircraft.
  - Buildings: a sandbagged HQ bunker, a corrugated barracks hut, a sandbag gun nest, a sandbag-and-barbed-wire wall, a mine pithead, a workshop garage, and an airbase hangar with a control tower.
  - Grass, dirt and rock tiles, jungle trees and clouds.
- **Life and damage:** buildings rise behind scaffolding while under construction, smoke and burn when damaged, and have small animations (flag, pithead wheel, chimney smoke, tower beacon).
- **UI:** the olive/khaki interface uses the bundled [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) pixel font (SIL Open Font License, see `vendor/fonts/`).

## Free-for-All: looping map

In **Free-for-All (3)** and **(4)**, the battlefield is a loop. Walk, drive or fly off one edge and you come back on the other, and the camera pans endlessly. HQs are spaced evenly around the loop, so every player has a neighbour on each side and nobody gets a safe corner. Units, shots, artillery, aircraft, the minimap and build zones all work across the seam. Orders take the short way round. In 1 vs 1 modes the map still has edges.

Every player in every mode starts with two soldiers in front of their HQ.

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
- Some mobile carriers and strict networks block direct connections. With the optional Cloudflare relay set up (see [`../relay`](../relay/README.md)), those games are routed through Cloudflare instead. Without it, put one or both phones on Wi-Fi. The label under your name shows whether a match is `direct` or going through the `relay`.
- Two tabs on one device can play each other without the internet by adding `?net=local` to the URL, which is handy for testing.

## Controls (touch)

| Action | Gesture |
|---|---|
| Pan the battlefield | Drag (with momentum) |
| Zoom | Pinch, or the ＋ / － buttons. Zoom out well past the map height (about 40% of the map in view on a phone) for an overview, with sky above |
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

**Build zone.** New structures must go within 8 tiles (sideways) of one of your HQ, Barracks, Turret, Mine, Workshop or Airbase. While you're placing a structure, the zone is outlined in green (and shaded on the minimap), and everything outside it is dimmed. Walls, bridges and ramps can be built inside the zone but don't extend it, so you can't chain cheap pieces across the map. Turrets do extend it, so you can push your front line forward. The CPU plays by the same rule, and in online games the host checks every placement.

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
