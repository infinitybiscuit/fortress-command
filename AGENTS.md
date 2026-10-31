# AGENTS.md

Side-scrolling platformer/RTS (plus an isometric mode). Build bases, train armies, destroy the enemy HQ. Read `README.md`, `web/README.md` and `relay/README.md` for context.

## Where the real work happens

- `web/` — the actively developed HTML5 port. No build step: plain ES modules + Canvas. New features go here.
- `archive/godot-era/` — the original Godot 4 project (`godot/`), plus `SPEC.md`, `entities.txt`, `foundation.txt`. All historical and **stale** (e.g. `entities.txt` lists `archer/knight/cavalry`, which don't exist). Don't touch these. The source of truth for gameplay numbers is `web/js/config.js`.
- `relay/` — Cloudflare Worker: PeerJS-compatible matchmaking + TURN relay credentials.

## No build, test, or lint

There is no `package.json`, no tests, no CI checks. Verification is manual: run `python3 -m http.server 8000` inside `web/` and play in a browser (primary target is iPhone 16 Pro Max, portrait 440×956). Check for JS errors in the console.

## Architecture (web)

- `index.html` loads only `js/main.js` (module entry point); it imports everything else. Don't add `<script>` tags for game code.
- `js/config.js` — all game constants and unit/building stats (source of truth, ported from the Godot era).
- `js/game.js` — `Game` simulation: economy, AI, spawning, win check. `js/entities.js` — `Unit`, `Building`, `Projectile`.
- `js/render.js` — rendering and the `THEMES` registry (12 themes); `js/pixel.js` — pixel-art toolkit + active palette; `js/themes/*.js` — per-theme artwork.
- `js/iso.js` — the isometric view/map (a second, separate game mode). `js/tilemap.js`/`js/terrain.js` — the 2D map and terrain. `js/flags.js` — per-side flag icons.
- `js/net.js` — P2P networking via bundled PeerJS (`web/vendor/peerjs-1.5.4.min.js`).
- `js/audio.js` + `js/songs.js` — sound effects and a music theme per theme.

## Adding a theme (must touch 4 places)

Themes are **cosmetic only** — same units, costs, and stats across all themes. Never add mechanics to a theme.

1. Create `web/js/themes/<name>.js`.
2. Register it in the `THEMES` array in `js/render.js` (order = menu order).
3. Add the file to the `ASSETS` array in `web/sw.js` AND bump the `CACHE` name (`'slop-wars-vNN'`) so old caches are purged.
4. Bump `VERSION` in `js/config.js` (shown on title/pause screens).

Every theme must also draw the **`sam`** building (guided anti-air) — `render.js` calls `theme.buildings.sam` for every building type, and a missing/malformed painter crashes the game. Copy the per-side `look` pattern from an existing theme.

## Online play

- Host's device runs the authoritative simulation; guests send orders and receive state ~12×/s. **Both ends must run the same `VERSION`**, so bump it for any change affecting gameplay or networking.
- Test locally with several tabs on one device: append `?net=local` to the URL. `?relayUrl=...&relay=only` forces relay use.
- `RELAY_URL` / `MATCHMAKER_URL` in `js/config.js` point at the Cloudflare Worker.

## Deployment (CI, no local build/deploy)

- `web/` auto-deploys to GitHub Pages on push to `main` touching `web/**` (`.github/workflows/pages.yml`). Static host; the service worker is network-first.
- `relay/` auto-deploys the Worker via wrangler on `main` pushes touching `relay/**` (`.github/workflows/relay.yml`). Cloudflare/GitHub secrets live only in their respective secret stores — never add them to files.
- The Worker must keep its name `fortress-relay`: a renamed Worker is a new Worker without the TURN secrets.
- Keep the branch in sync with `origin/main` before committing: the repo moves fast (a version bump per PR, now at v70).
