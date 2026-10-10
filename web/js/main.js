// Fortress Command (web) — app shell: camera, touch input, UI panels and main loop.
import {
  WORLD_W, WORLD_H, MAP_W, TILE_SIZE, MODES, BUILDING_TYPES, UNIT_TYPES, BUILD_MENU, BUILD_ICONS,
  UNIT_ICONS, VERSION, PLAYER_COLORS, PLAYER_NAMES, MAX_DELTA, LOW_CREDITS, capitalize, ONLINE_LAYOUTS,
} from './config.js';
import { Game } from './game.js';
import { canReach } from './entities.js';
import { applyCommand, ref } from './commands.js';
import {
  hostRoom, joinRoom, makeRoomCode, connectionRoute, encodeSnapshot, createMirror, applySnapshot, SNAPSHOT_INTERVAL,
} from './net.js';
import {
  drawBackground, drawTerrain, drawUnit, drawBuilding, drawProjectile, drawGhost, drawMinimap, drawBuildZones,
  drawEffects, updateEffects, drawMarker, G, SKY_TOP,
} from './render.js';

const $ = (id) => document.getElementById(id);
const canvas = $('world');
const ctx = canvas.getContext('2d');
const mini = $('minimap');
const mctx = mini.getContext('2d');
const panel = $('panel');

const TAP_SLOP = 10;        // px of finger travel before a touch becomes a pan
const DOUBLE_TAP_MS = 320;
const HIT_PAD = 12;         // extra world px around units for fat-finger taps
const MAX_SCALE = 2.5;

let game = null;
let modeKey = 'cpu';
let active = 0;             // player index currently being controlled
let paused = true;
let selectedBuilding = null;
let pendingBuild = null;    // building type in placement mode
let ghost = null;           // current placement preview
let markers = [];           // move-order feedback
let statusText = '';
let panelKey = '';
let eliminatedNoted = false; // told this player they're out but the game goes on
let sellArmed = null;       // { id, until } — sell needs a second tap to confirm
const minimapCache = {};

// ── Camera ─────────────────────────────────────────────────────────────────
// scale = screen points per world unit. It's snapped so each art pixel
// (G world units) covers a whole number of device pixels, keeping the pixel
// art sharp; `zoom` is the unsnapped target that pinch gestures adjust.
// Zoomed out past the world's height (down to one device pixel per art
// pixel) the battlefield sits at the bottom of the screen with sky above.
const cam = { x: 0, y: 0, scale: 1, zoom: 1, vx: 0, vy: 0 };
let viewW = 0;
let viewH = 0;
let dpr = 1;

function minScale() { return Math.max(viewW / WORLD_W, 1 / (dpr * G)); }
function defaultScale() { return Math.min(MAX_SCALE, Math.max(viewH / WORLD_H, viewW / WORLD_W, viewH / (WORLD_H - 5 * TILE_SIZE))); }
function view() { return { x: cam.x, y: cam.y, w: viewW / cam.scale, h: viewH / cam.scale }; }

function snapScale(z) {
  const unit = dpr * G; // device pixels per world unit at scale 1, times art pixel size
  let p = Math.max(1, Math.round(z * unit));
  while (p / unit < minScale() - 1e-6) p++;
  return p / unit;
}

function clampCam() {
  cam.zoom = Math.min(MAX_SCALE, Math.max(minScale(), cam.zoom));
  cam.scale = snapScale(cam.zoom);
  const v = view();
  // Looping maps pan forever; otherwise stop at the map edges.
  if (game?.wrap) cam.x = ((cam.x % WORLD_W) + WORLD_W) % WORLD_W;
  else cam.x = Math.min(Math.max(0, cam.x), WORLD_W - v.w);
  // Taller than the world: pin the ground to the bottom of the screen.
  cam.y = v.h >= WORLD_H ? WORLD_H - v.h : Math.min(Math.max(0, cam.y), WORLD_H - v.h);
}

function centreOn(wx, wy) {
  const v = view();
  cam.x = wx - v.w / 2;
  cam.y = wy == null ? WORLD_H - v.h : wy - v.h / 2;
  clampCam();
}

function zoomAt(factor, sx, sy) {
  const wx = cam.x + sx / cam.scale;
  const wy = cam.y + sy / cam.scale;
  cam.zoom *= factor;
  clampCam();
  cam.x = wx - sx / cam.scale;
  cam.y = wy - sy / cam.scale;
  clampCam();
}

function screenToWorld(sx, sy) { return [cam.x + sx / cam.scale, cam.y + sy / cam.scale]; }

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  viewW = r.width;
  viewH = r.height;
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  const m = mini.getBoundingClientRect();
  mini.width = Math.round(m.width * dpr);
  mini.height = Math.round(m.height * dpr);
  clampCam();
}

// ── Messages ───────────────────────────────────────────────────────────────
let toastTimer = 0;
function toast(text, kind = 'error') {
  const el = $('toast');
  el.textContent = text;
  el.className = `toast show ${kind === 'info' ? 'info' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 1600);
}
function setStatus(text) { statusText = text; $('status').textContent = text; }

// ── Online session ─────────────────────────────────────────────────────────
// role: null offline, 'host' (runs the game and the lobby, plays Blue) or
// 'guest'. The host keeps one connection per guest in `peers`; a guest's only
// connection is `host`. `slots` is the lobby: up to four seats, each
// { kind: 'host' | 'human' | 'cpu' | 'open' | 'closed', name, ready }.
const net = {
  role: null, room: null, code: '', phase: 'lobby', snapTimer: 0, mapVersion: -1, pingMs: null, route: null,
  host: null, peers: [], slots: [], mySlot: 0, names: [],
};
const online = () => net.role !== null;

// Every player order goes through here: applied locally, or sent to the host
// when we're a guest. Returns an error message (local only) or null.
function issue(cmd) {
  if (net.role === 'guest') { net.host.send({ t: 'cmd', cmd }); return null; }
  return applyCommand(game, active, cmd);
}
const ids = (list) => list.map((u) => u.id);

// ── Selection helpers ──────────────────────────────────────────────────────
const selectedUnits = () => (game ? game.units.filter((u) => u.selected && u.faction === active) : []);

function clearSelection() {
  if (game) for (const u of game.units) u.selected = false;
  if (selectedBuilding) selectedBuilding.selected = false;
  selectedBuilding = null;
}

function selectBuilding(b) {
  clearSelection();
  selectedBuilding = b;
  b.selected = true;
}

function selectUnits(list) {
  clearSelection();
  for (const u of list) u.selected = true;
}

function cancelPlacement() { pendingBuild = null; ghost = null; }

// ── Hit testing (prefers the closest entity to the finger) ─────────────────
function pickUnit(wx, wy, pred) {
  let best = null;
  let bestD = Infinity;
  for (const u of game.units) {
    if (u.dead || !pred(u) || !u.containsPoint(wx, wy, HIT_PAD)) continue;
    const [cx, cy] = u.centre();
    const d = Math.hypot(game.dx(wx, cx), cy - wy);
    if (d < bestD) { bestD = d; best = u; }
  }
  return best;
}
function pickBuilding(wx, wy, pred) {
  return game.buildings.find((b) => !b.dead && pred(b) && b.containsPoint(wx, wy, 4)) || null;
}

// ── Tap handling ───────────────────────────────────────────────────────────
let lastTap = { t: 0, unit: null };

function handleTap(sx, sy) {
  if (!game || paused || game.over) return;
  const [rawX, wy] = screenToWorld(sx, sy);
  const wx = game.normX(rawX);
  const mine = (e) => e.faction === active;
  const enemy = (e) => e.faction !== active;

  if (pendingBuild) {
    const pl = game.placementFor(pendingBuild, wx, wy, active);
    const sameSpot = ghost && ghost.tx === pl.tx && ghost.ty === pl.ty;
    ghost = pl;
    if (sameSpot && pl.valid) confirmPlacement();
    else if (pl.reason === 'zone') setStatus('Too far from your base — build inside the green zone');
    else if (!pl.valid) setStatus("Can't build there — try another spot");
    else setStatus('Tap again or press Place to build');
    return;
  }

  const sel = selectedUnits();
  const enemyUnit = pickUnit(wx, wy, enemy);
  const enemyBuilding = enemyUnit ? null : pickBuilding(wx, wy, enemy);
  const target = enemyUnit || enemyBuilding;
  if (target && sel.length) {
    if (!sel.some((u) => canReach(u, target))) { toast("Can't reach that — it's too high up"); return; }
    issue({ c: 'attack', ids: ids(sel), target: ref(target) });
    markers.push({ x: target.centre()[0], y: target.centre()[1], t: 0.6, color: '#ff4d4d' });
    return;
  }

  const ownUnit = pickUnit(wx, wy, mine);
  const repairers = sel.filter((u) => u.repairRate > 0 && u !== ownUnit);
  if (ownUnit?.vehicle && ownUnit.hp < ownUnit.maxHp && repairers.length) {
    issue({ c: 'repair', ids: ids(repairers), target: ref(ownUnit) });
    toast('Repairing', 'info');
    return;
  }
  if (ownUnit) {
    const now = performance.now();
    if (lastTap.unit === ownUnit && now - lastTap.t < DOUBLE_TAP_MS) {
      // Double-tap: every unit of the same type that's on screen.
      const v = view();
      selectUnits(game.units.filter((u) => mine(u) && u.type === ownUnit.type
        && Math.abs(game.dx(v.x + v.w / 2, u.x)) <= v.w / 2));
    } else {
      selectUnits([ownUnit]);
    }
    lastTap = { t: now, unit: ownUnit };
    return;
  }

  const ownBuilding = pickBuilding(wx, wy, mine);
  if (ownBuilding) {
    const engineers = sel.filter((u) => u.repairRate > 0);
    if (engineers.length && ownBuilding.hp < ownBuilding.maxHp) {
      issue({ c: 'repair', ids: ids(engineers), target: ref(ownBuilding) });
      toast('Repairing', 'info');
      return;
    }
    selectBuilding(ownBuilding);
    return;
  }

  if (sel.length) {
    issue({ c: 'move', ids: ids(sel), x: wx });
    markers.push({ x: wx, y: wy, t: 0.6, color: '#00ff66' });
    return;
  }
  clearSelection();
}

function confirmPlacement() {
  if (!ghost || !pendingBuild) return;
  if (game.players[active].money < BUILDING_TYPES[pendingBuild].cost) { toast('Not enough credits!'); return; }
  const check = game.placementAt(pendingBuild, ghost.tx, ghost.ty, active);
  if (check.reason === 'zone') { toast('Too far from your base!'); return; }
  if (!check.valid) { toast("Can't place here!"); return; }
  const err = issue({ c: 'place', type: pendingBuild, tx: ghost.tx, ty: ghost.ty });
  if (err) { toast(err); return; }
  toast(`${capitalize(pendingBuild)} placed`, 'info');
  // Bridges and ramps are usually laid in runs — stay in placement mode,
  // previewing the next tile along.
  if (pendingBuild === 'bridge' || pendingBuild === 'ramp') {
    ghost = game.placementAt(pendingBuild, ghost.tx + 1, ghost.ty, active);
    // Online guests see their spend a moment later, so count it now.
    const spent = net.role === 'guest' ? BUILDING_TYPES[pendingBuild].cost : 0;
    if (game.players[active].money - spent < BUILDING_TYPES[pendingBuild].cost) cancelPlacement();
  } else {
    cancelPlacement();
  }
}

// ── Pointer input: pan, pinch-zoom, tap ────────────────────────────────────
const pointers = new Map();
let gesture = null;

canvas.addEventListener('pointerdown', (e) => {
  try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or stale pointer */ }
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  cam.vx = cam.vy = 0;
  if (pointers.size === 1) {
    gesture = { type: 'tap', sx: e.offsetX, sy: e.offsetY, lx: e.offsetX, ly: e.offsetY, lt: performance.now() };
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = { type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (!gesture) return;
  if (gesture.type === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    cam.x -= (mx - gesture.mx) / cam.scale;
    cam.y -= (my - gesture.my) / cam.scale;
    if (gesture.d > 0) zoomAt(d / gesture.d, mx, my);
    clampCam();
    Object.assign(gesture, { d, mx, my });
    return;
  }
  if (gesture.type === 'tap' && Math.hypot(e.offsetX - gesture.sx, e.offsetY - gesture.sy) > TAP_SLOP) {
    gesture.type = 'pan';
  }
  if (gesture.type === 'pan') {
    const now = performance.now();
    const dx = e.offsetX - gesture.lx;
    const dy = e.offsetY - gesture.ly;
    cam.x -= dx / cam.scale;
    cam.y -= dy / cam.scale;
    const dt = Math.max(1, now - gesture.lt) / 1000;
    cam.vx = (-dx / cam.scale) / dt;
    cam.vy = (-dy / cam.scale) / dt;
    Object.assign(gesture, { lx: e.offsetX, ly: e.offsetY, lt: now });
    clampCam();
  }
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (gesture?.type === 'tap' && e.type === 'pointerup') handleTap(e.offsetX, e.offsetY);
  if (gesture?.type === 'pan' && performance.now() - gesture.lt > 80) cam.vx = cam.vy = 0;
  if (pointers.size === 0) gesture = null;
  else if (pointers.size === 1) {
    // Pinch ended with one finger down — continue as a pan (never a tap).
    const [p] = [...pointers.values()];
    gesture = { type: 'pan', sx: p.x, sy: p.y, lx: p.x, ly: p.y, lt: performance.now() };
    cam.vx = cam.vy = 0;
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomAt(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY);
}, { passive: false });

// Block iOS Safari's page-level pinch/double-tap zoom.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Minimap: tap or drag to move the camera.
function minimapPan(e) {
  const r = mini.getBoundingClientRect();
  const wx = ((e.clientX - r.left) / r.width) * WORLD_W;
  const v = view();
  cam.x = wx - v.w / 2;
  cam.vx = cam.vy = 0;
  clampCam();
}
mini.addEventListener('pointerdown', (e) => { try { mini.setPointerCapture(e.pointerId); } catch { /* ignore */ } minimapPan(e); });
mini.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') { if (mini.hasPointerCapture(e.pointerId)) minimapPan(e); } });

// Keyboard (desktop convenience)
const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key === 'Escape') { cancelPlacement(); clearSelection(); }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

// The buttons zoom about the middle of the battlefield, not the empty sky.
function zoomButton(factor) {
  const top = Math.max(0, -cam.y * cam.scale);
  zoomAt(factor, viewW / 2, (top + viewH) / 2);
}
$('btn-zoom-in').addEventListener('click', () => zoomButton(1.4));
$('btn-zoom-out').addEventListener('click', () => zoomButton(1 / 1.4));

// ── Bottom panel ───────────────────────────────────────────────────────────
function renderPanel() {
  if (!game) return;
  const p = game.players[active];
  const money = p.money;
  const sel = selectedUnits();
  if (selectedBuilding && (selectedBuilding.dead || selectedBuilding.faction !== active)) selectedBuilding = null;
  const b = selectedBuilding;

  let mode = 'build';
  if (pendingBuild) mode = 'place';
  else if (b) mode = 'building';
  else if (sel.length) mode = 'units';

  // Rebuild DOM only when something visible changes.
  const afford = BUILD_MENU.map((t) => +(money >= BUILDING_TYPES[t].cost)).join('')
    + Object.keys(UNIT_TYPES).map((t) => +(money >= UNIT_TYPES[t].cost)).join('');
  const bState = b ? `${b.id}|${b.constructing}|${b.queue.join(',')}|${b.trainCurrent}|${Math.round(b.hp)}|${Math.floor(b.progress * 20)}|${b.trainCurrent ? Math.floor((1 - b.trainTimer / b.trainTotal) * 20) : ''}` : '';
  const uState = sel.length ? `${sel.length}|${sel.map((u) => u.type[0]).sort().join('')}` : '';
  const armed = !!(b && sellArmed && sellArmed.id === b.id && performance.now() < sellArmed.until);
  const refund = b ? game.sellValue(b) : 0;
  const key = `${mode}|${afford}|${pendingBuild}|${ghost?.valid}|${bState}|${uState}|${armed}|${refund}`;
  if (key === panelKey) return;
  panelKey = key;

  if (mode === 'place') {
    const d = BUILDING_TYPES[pendingBuild];
    const tip = pendingBuild === 'bridge' ? 'Extend sideways from a platform or another bridge.'
      : pendingBuild === 'ramp' ? 'Needs support underneath. Stack ramps into stairs.'
        : 'Must sit on solid ground or a platform.';
    const zoneTip = ' Build inside the green zone near your base.';
    panel.innerHTML = `
      <div class="panel-head"><div class="panel-title">${BUILD_ICONS[pendingBuild]} Place ${capitalize(pendingBuild)}</div>
        <div class="panel-sub">💰 ${d.cost} · ${d.buildTime}s</div></div>
      <div class="hint">Tap the battlefield to position it, then tap the same spot again or press Place. ${tip}${zoneTip}</div>
      <div class="row" style="margin-top:auto">
        <button class="act-btn" data-act="cancel">Cancel</button>
        <button class="act-btn primary" data-act="place" ${ghost?.valid ? '' : 'disabled'}>Place</button>
      </div>`;
    return;
  }

  if (mode === 'building') {
    const name = capitalize(b.type);
    const hp = `${Math.ceil(b.hp)}/${b.maxHp} HP`;
    let body = '';
    if (b.constructing) {
      body = `<div class="hint">Under construction…</div><div class="progress"><div style="width:${b.progress * 100}%;background:var(--accent)"></div></div>`;
    } else if (b.canTrain.length) {
      const counts = {};
      for (const t of b.queue) counts[t] = (counts[t] || 0) + 1;
      if (b.trainCurrent) counts[b.trainCurrent] = (counts[b.trainCurrent] || 0) + 1;
      body = `<div class="grid ${b.canTrain.length <= 3 ? 'cols-3' : ''}">${b.canTrain.map((t) => {
        const u = UNIT_TYPES[t];
        return `<button class="tile-btn" data-train="${t}" ${money >= u.cost ? '' : 'disabled'}>
          ${counts[t] ? `<span class="badge">${counts[t]}</span>` : ''}
          <span class="ic">${UNIT_ICONS[t]}</span><span class="nm">${capitalize(t)}</span>
          <span class="ct">💰${u.cost} · ${u.trainTime}s</span></button>`;
      }).join('')}</div>
      <div class="progress"><div style="width:${b.trainCurrent ? (1 - b.trainTimer / b.trainTotal) * 100 : 0}%"></div></div>
      <div class="hint">${b.trainCurrent ? `Training ${capitalize(b.trainCurrent)}${b.queue.length ? ` · ${b.queue.length} queued` : ''}` : 'Tap a unit to queue it.'}</div>`;
    } else {
      const info = {
        hq: `Command centre. Earns +${BUILDING_TYPES.hq.income}/s. Lose it and you lose.`,
        mine: `Earns +${BUILDING_TYPES.mine.income}/s once built.`,
        turret: 'Fires at enemy units in range, and at aircraft from much further away.',
        wall: 'Blocks enemy units. Your troops walk through.',
        bridge: 'Walkable span. Extend it to cross gaps.',
        ramp: 'Units step up ramps automatically.',
      }[b.type] || '';
      body = `<div class="hint">${info}</div>`;
    }
    panel.innerHTML = `
      <div class="panel-head"><div class="panel-title">${BUILD_ICONS[b.type] || '🏰'} ${name}</div>
        <div class="panel-sub">${hp}</div>
        <button class="small-btn" data-act="deselect">✕</button></div>
      ${body}
      ${b.type === 'hq' ? '' : `<div class="row" style="margin-top:auto">
        <button class="act-btn ${armed ? 'primary' : 'danger'}" data-act="sell">${armed ? `Tap again to sell for 💰${refund}` : `💲 Sell · 💰${refund}`}</button>
      </div>`}`;
    return;
  }

  const buildGrid = `<div class="grid">${BUILD_MENU.map((t) => {
    const d = BUILDING_TYPES[t];
    return `<button class="tile-btn" data-build="${t}" ${money >= d.cost ? '' : 'disabled'}>
      <span class="ic">${BUILD_ICONS[t]}</span><span class="nm">${capitalize(t)}</span><span class="ct">💰${d.cost}</span></button>`;
  }).join('')}</div>`;

  if (mode === 'units') {
    const counts = {};
    for (const u of sel) counts[u.type] = (counts[u.type] || 0) + 1;
    const summary = Object.entries(counts).map(([t, n]) => `${UNIT_ICONS[t]}×${n}`).join('  ');
    panel.innerHTML = `
      <div class="panel-head"><div class="panel-title">${sel.length} selected <span class="panel-sub">${summary}</span></div>
        <button class="small-btn" data-act="deselect">✕</button></div>
      <div class="hint">Tap ground to move (they fight on the way) · tap an enemy to attack${counts.engineer ? ' · tap a damaged building or vehicle to repair' : ''}</div>
      <div class="row">
        <button class="act-btn" data-act="stop">✋ Hold</button>
        <button class="act-btn" data-act="charge">⚔️ Charge</button>
        <button class="act-btn" data-act="retreat">🏠 Retreat</button>
      </div>
      <div class="row">
        <button class="act-btn" data-act="all">🎖️ All units</button>
        <button class="act-btn" data-act="find">📍 Find</button>
      </div>`;
    return;
  }

  panel.innerHTML = `<div class="panel-head"><div class="panel-title">Build</div><div class="panel-sub">Tap one, then the map</div><button class="small-btn" data-act="all">🎖️ All units</button></div>${buildGrid}`;
}

panel.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || !game || paused) return;
  const p = game.players[active];
  if (btn.dataset.build) {
    const t = btn.dataset.build;
    if (p.money < BUILDING_TYPES[t].cost) return;
    clearSelection();
    pendingBuild = t;
    ghost = null;
    setStatus(`Tap to place ${capitalize(t)}`);
  } else if (btn.dataset.train) {
    const t = btn.dataset.train;
    if (selectedBuilding && p.money >= UNIT_TYPES[t].cost) {
      const err = issue({ c: 'train', id: selectedBuilding.id, type: t });
      if (!err) toast(`${capitalize(t)} queued`, 'info');
    }
  } else {
    const sel = selectedUnits();
    const hq = p.hq;
    switch (btn.dataset.act) {
      case 'cancel': cancelPlacement(); break;
      case 'place': confirmPlacement(); break;
      case 'deselect': clearSelection(); break;
      case 'sell': {
        const b = selectedBuilding;
        if (!b) break;
        if (sellArmed?.id === b.id && performance.now() < sellArmed.until) {
          sellArmed = null;
          const name = capitalize(b.type);
          const refund = game.sellValue(b);
          issue({ c: 'sell', id: b.id });
          clearSelection();
          toast(`${name} sold · +💰${refund}`, 'info');
        } else {
          sellArmed = { id: b.id, until: performance.now() + 3000 };
        }
        break;
      }
      case 'all': {
        const army = game.units.filter((u) => u.faction === active);
        if (!army.length) { toast('No units yet — build a Barracks'); break; }
        selectUnits(army);
        break;
      }
      case 'stop':
        issue({ c: 'hold', ids: ids(sel) });
        toast('Holding position', 'info');
        break;
      case 'charge':
        if (!sel.length) break;
        issue({ c: 'charge', ids: ids(sel) });
        toast('Charge!', 'info');
        break;
      case 'retreat':
        if (hq) issue({ c: 'retreat', ids: ids(sel) });
        break;
      case 'find': {
        if (!sel.length) break;
        // Average relative to the first unit so groups straddling a looping seam centre correctly.
        const ax = sel[0].x + sel.reduce((s, u) => s + game.dx(sel[0].x, u.x), 0) / sel.length;
        const ay = sel.reduce((s, u) => s + u.y, 0) / sel.length;
        centreOn(ax, ay - 20);
        break;
      }
      default: break;
    }
  }
  panelKey = '';
  renderPanel();
});

// ── HUD ────────────────────────────────────────────────────────────────────
function renderHud() {
  const p = game.players[active];
  const c = $('credits');
  c.textContent = `💰 ${Math.floor(p.money)}`;
  c.classList.toggle('low', p.money < LOW_CREDITS);
  $('income').textContent = `+${p.income}/s`;
  const chip = $('player-chip');
  const col = PLAYER_COLORS[active].map((v) => Math.round(v * 255)).join(',');
  chip.textContent = online() ? `YOU · ${PLAYER_NAMES[active].toUpperCase()}`
    : game.humanCount > 1 ? PLAYER_NAMES[active].toUpperCase() : 'YOU';
  chip.style.background = `rgba(${col},0.25)`;
  chip.style.color = `rgb(${col})`;
  if (!pendingBuild && statusText && statusText !== 'Waiting for the host…') setStatus('');
}

// ── Game lifecycle ─────────────────────────────────────────────────────────
function showOverlay(id) {
  for (const o of ['overlay-title', 'overlay-online', 'overlay-pause', 'overlay-gameover']) $(o).classList.toggle('hidden', o !== id);
}

// opts: { mode } replaces MODES[key] (online games), { mirror } makes a
// guest's snapshot-driven copy, { you } is the faction this device controls.
function startGame(key, opts = {}) {
  modeKey = key;
  const mode = opts.mode || MODES[key];
  if (opts.mirror) {
    game = createMirror(mode);
  } else {
    game = new Game(mode, {
      onGameOver: (winner) => {
        if (net.role === 'host') broadcast({ t: 'over', winner });
        setTimeout(() => gameOver(winner), 600);
      },
      onMessage: (m) => {
        toast(m, 'info');
        if (net.role === 'host') broadcast({ t: 'msg', text: m });
      },
    });
  }
  active = opts.you ?? 0;
  eliminatedNoted = false;
  selectedBuilding = null;
  cancelPlacement();
  markers = [];
  panelKey = '';
  $('mode-label').textContent = mode.label;
  $('btn-switch').classList.toggle('hidden', game.humanCount < 2 || online());
  $('btn-restart').classList.toggle('hidden', online());
  $('btn-quit').textContent = online() ? 'Leave game' : 'Main Menu';
  showOverlay(null);
  paused = false;
  resize();
  cam.zoom = defaultScale();
  clampCam();
  focusHq();
}

function focusHq() {
  const hq = game.players[active].hq;
  if (!hq) return;
  // Look out from the HQ toward the middle of the map.
  const towardRight = game.wrap || hq.x < WORLD_W / 2;
  centreOn(hq.x + hq.w / 2 + (towardRight ? 1 : -1) * view().w * 0.25, null);
}

function gameOver(winner) {
  paused = true;
  game.over = true;
  const label = $('result-label');
  const sub = $('result-sub');
  const again = $('btn-again');
  again.classList.remove('hidden');
  again.textContent = 'Restart';
  if (online()) {
    const won = winner === active;
    label.textContent = won ? 'VICTORY' : 'DEFEAT';
    label.style.color = won ? 'var(--good)' : 'var(--danger)';
    let text = won ? `Battle won in ${formatTime(game.time)}.`
      : winner >= 0 ? `${net.names[winner] || PLAYER_NAMES[winner]} (${PLAYER_NAMES[winner]}) won the battle.` : 'Nobody survived.';
    if (net.role === 'host') again.textContent = 'Back to lobby';
    else {
      text += ' Waiting for the host…';
      again.classList.add('hidden');
    }
    sub.textContent = text;
  } else if (game.humanCount > 1) {
    label.textContent = winner >= 0 ? `${PLAYER_NAMES[winner].toUpperCase()} WINS` : 'DRAW';
    label.style.color = winner >= 0 ? `rgb(${PLAYER_COLORS[winner].map((v) => v * 255).join(',')})` : '#fff';
    sub.textContent = 'Every rival HQ has fallen.';
  } else if (winner === 0) {
    label.textContent = 'VICTORY';
    label.style.color = 'var(--good)';
    sub.textContent = `Battle won in ${formatTime(game.time)}.`;
  } else {
    label.textContent = 'DEFEAT';
    label.style.color = 'var(--danger)';
    sub.textContent = 'Your HQ was destroyed.';
  }
  showOverlay('overlay-gameover');
}

function formatTime(s) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

function buildModeButtons() {
  const wrap = $('mode-buttons');
  wrap.innerHTML = Object.entries(MODES).map(([k, m]) => `<button class="menu-btn" data-mode="${k}">${m.label}</button>`).join('');
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    if (MODES[b.dataset.mode].online) openLobby();
    else startGame(b.dataset.mode);
  });
}

// ── Online lobby & session ─────────────────────────────────────────────────
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const NAME_KEY = 'fortress-name';

function playerName() {
  const n = $('player-name').value.trim().replace(/\s+/g, ' ').slice(0, 12);
  try { localStorage.setItem(NAME_KEY, n); } catch { /* storage unavailable */ }
  return n || (net.role === 'host' ? 'Host' : 'Player');
}

function lobbyView(which, status = '') {
  for (const v of ['home', 'wait', 'lobby']) $(`online-${v}`).classList.toggle('hidden', v !== which);
  $('online-status').textContent = status;
  if (which === 'lobby') renderLobby();
}

function openLobby(prefill = '') {
  leaveOnline();
  showOverlay('overlay-online');
  lobbyView('home');
  $('join-code').value = prefill;
  try { $('player-name').value = localStorage.getItem(NAME_KEY) || ''; } catch { /* storage unavailable */ }
}

// Seats that will play, in seat order. Their position is their faction.
const seated = (slots) => slots.map((sl, i) => ({ ...sl, slot: i })).filter((sl) => ['host', 'human', 'cpu'].includes(sl.kind));

function renderLobby() {
  $('room-code').textContent = net.code;
  const isHost = net.role === 'host';
  const order = seated(net.slots).map((sl) => sl.slot);
  $('lobby-slots').innerHTML = net.slots.map((sl, i) => {
    const f = order.indexOf(i);
    const col = f >= 0 ? `rgb(${PLAYER_COLORS[f].map((v) => Math.round(v * 255)).join(',')})` : '#333';
    const you = i === net.mySlot ? ' (you)' : '';
    let name;
    let tag = '';
    let btn = '';
    switch (sl.kind) {
      case 'host': name = esc(sl.name) + you; tag = '<span class="slot-tag ready">HOST</span>'; break;
      case 'human':
        name = esc(sl.name) + you;
        tag = sl.ready ? '<span class="slot-tag ready">READY</span>' : '<span class="slot-tag waiting">NOT READY</span>';
        if (isHost) btn = `<button class="small-btn slot-btn kick" data-kick="${i}" aria-label="Remove ${esc(sl.name)}">✕</button>`;
        break;
      case 'cpu': name = 'CPU'; break;
      case 'open': name = 'Open — waiting…'; break;
      default: name = 'Closed'; break;
    }
    if (isHost && ['cpu', 'open', 'closed'].includes(sl.kind)) {
      btn = `<button class="small-btn slot-btn" data-cycle="${i}">${sl.kind === 'cpu' ? 'CPU' : sl.kind === 'open' ? 'OPEN' : 'CLOSED'} ▸</button>`;
    }
    const empty = sl.kind === 'open' || sl.kind === 'closed' ? ' empty' : '';
    return `<li class="slot${empty}"><span class="swatch" style="background:${col}"></span><span class="slot-name">${name}</span>${tag}${btn}</li>`;
  }).join('');

  const players = seated(net.slots);
  const notReady = players.filter((sl) => sl.kind === 'human' && !sl.ready).length;
  const main = $('btn-lobby-main');
  main.classList.toggle('secondary', !isHost && !!net.slots[net.mySlot]?.ready);
  if (isHost) {
    main.textContent = 'Start game';
    main.disabled = !canStart();
    $('lobby-status').textContent = players.length < 2 ? 'Share the code with friends, or set a seat to CPU.'
      : notReady ? `Waiting for ${notReady} player${notReady > 1 ? 's' : ''} to be ready…`
        : `${players.length} players — ready to start!`;
  } else {
    const me = net.slots[net.mySlot];
    main.disabled = false;
    main.textContent = me?.ready ? 'Not ready' : 'Ready';
    $('lobby-status').textContent = me?.ready ? 'Waiting for the host to start…' : "Tap Ready when you're set.";
  }
}

$('lobby-slots').addEventListener('click', (e) => {
  if (net.role !== 'host' || net.phase !== 'lobby') return;
  const cyc = e.target.closest('[data-cycle]');
  const kick = e.target.closest('[data-kick]');
  if (cyc) {
    const sl = net.slots[+cyc.dataset.cycle];
    const next = { open: 'cpu', cpu: 'closed', closed: 'open' };
    net.slots[+cyc.dataset.cycle] = { kind: next[sl.kind] || 'open' };
    syncLobby();
  } else if (kick) {
    const peer = net.peers.find((pp) => pp.slot === +kick.dataset.kick);
    if (peer) refuse(peer, 'The host removed you from the room.');
  }
});

// ── Host side ──
async function hostOnline() {
  const name = playerName();
  lobbyView('wait', 'Opening a room…');
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = makeRoomCode();
    try {
      net.code = code;
      net.room = await hostRoom(code, onGuestConnected);
      Object.assign(net, {
        role: 'host', phase: 'lobby', mySlot: 0, peers: [],
        slots: [{ kind: 'host', name }, { kind: 'open' }, { kind: 'open' }, { kind: 'open' }],
      });
      lobbyView('lobby');
      return;
    } catch (e) {
      if (attempt === 2 || !/taken/.test(e.message)) { lobbyView('wait', e.message); return; }
    }
  }
}

function broadcast(msg) { for (const p of net.peers) p.transport.send(msg); }

function syncLobby() {
  if (net.phase !== 'lobby') return; // mid-battle seat changes show up back in the lobby
  for (const p of net.peers) {
    if (p.slot >= 0) p.transport.send({ t: 'lobby', slots: net.slots.map(({ kind, name, ready }) => ({ kind, name, ready })), you: p.slot });
  }
  if (!$('online-lobby').classList.contains('hidden')) renderLobby();
}

function canStart() {
  const players = seated(net.slots);
  return players.length >= 2 && players.every((sl) => sl.kind !== 'human' || sl.ready);
}

function onGuestConnected(transport) {
  if (net.role !== 'host') { transport.close(); return; }
  const peer = { transport, slot: -1, faction: -1, name: 'Player', pingMs: null };
  net.peers.push(peer);
  transport.on('message', (m) => onPeerMessage(peer, m));
  transport.on('close', () => dropPeer(peer));
}

// Turn a guest away with a reason, then hang up.
function refuse(peer, msg) {
  peer.transport.send({ t: 'error', msg });
  setTimeout(() => dropPeer(peer), 300);
}

function onPeerMessage(peer, m) {
  switch (m.t) {
    case 'hello': {
      if (m.v !== VERSION) {
        refuse(peer, `The host is on ${VERSION} but you're on ${m.v}. Close and reopen the app to update, then try again.`);
        break;
      }
      if (net.phase !== 'lobby') { refuse(peer, 'That game has already started. Ask the host to go back to the lobby.'); break; }
      const slot = net.slots.findIndex((sl) => sl.kind === 'open');
      if (slot < 0) { refuse(peer, 'That room is full.'); break; }
      peer.slot = slot;
      peer.name = String(m.name || 'Player').slice(0, 12);
      net.slots[slot] = { kind: 'human', name: peer.name, ready: false };
      syncLobby();
      toast(`${peer.name} joined`, 'info');
      break;
    }
    case 'ready':
      if (net.phase === 'lobby' && peer.slot >= 0) {
        net.slots[peer.slot].ready = !!m.ready;
        syncLobby();
      }
      break;
    case 'cmd':
      if (net.phase === 'game' && game && !game.over && peer.faction >= 0 && game.players[peer.faction]?.alive) {
        const err = applyCommand(game, peer.faction, m.cmd);
        if (err) peer.transport.send({ t: 'msg', text: err, error: true });
      }
      break;
    case 'ping': peer.transport.send({ t: 'pong', at: m.at }); break;
    case 'pong': peer.pingMs = Math.round(performance.now() - m.at); break;
    case 'bye': dropPeer(peer); break;
    default: break;
  }
}

// A guest left (or was removed): free their seat, and mid-battle hand their
// army to the CPU so the game carries on.
function dropPeer(peer) {
  if (!net.peers.includes(peer)) return;
  net.peers = net.peers.filter((p) => p !== peer);
  peer.transport.close();
  if (peer.slot >= 0) net.slots[peer.slot] = { kind: 'open' };
  if (net.phase === 'game' && game && !game.over && peer.faction >= 0) {
    const p = game.players[peer.faction];
    if (p.alive) {
      p.isAi = true;
      const text = `${peer.name} left — the CPU takes over ${PLAYER_NAMES[peer.faction]}`;
      toast(text, 'info');
      broadcast({ t: 'msg', text });
      game.checkGameOver();
    }
  }
  if (peer.slot >= 0) syncLobby();
}

function startOnlineGame() {
  if (!canStart()) return;
  const players = seated(net.slots);
  const layout = ONLINE_LAYOUTS[players.length];
  const mode = {
    label: layout.label, wrap: layout.wrap, online: true,
    players: players.map((sl, i) => [layout.hqs[i], sl.kind === 'cpu']),
  };
  net.names = players.map((sl) => (sl.kind === 'cpu' ? 'CPU' : sl.name));
  for (const p of net.peers) p.faction = players.findIndex((sl) => sl.slot === p.slot);
  Object.assign(net, { phase: 'game', mapVersion: -1, snapTimer: 0 });
  startGame('online', { mode, you: 0 });
  for (const p of net.peers) p.transport.send({ t: 'start', mode, you: p.faction, names: net.names });
}

function backToLobby() {
  net.phase = 'lobby';
  for (const sl of net.slots) if (sl.kind === 'human') sl.ready = false;
  for (const p of net.peers) p.faction = -1;
  game = null;
  paused = true;
  showOverlay('overlay-online');
  lobbyView('lobby');
  syncLobby();
}

// ── Guest side ──
async function joinOnline() {
  const code = $('join-code').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) { lobbyView('home'); $('join-code').focus(); return; }
  const name = playerName();
  net.code = code;
  lobbyView('wait', `Connecting to room ${code}…`);
  try {
    const transport = await joinRoom(code);
    Object.assign(net, { role: 'guest', host: transport, phase: 'lobby' });
    transport.on('message', onHostMessage);
    transport.on('close', () => onHostLost());
    transport.send({ t: 'hello', v: VERSION, name });
    lobbyView('wait', 'Connected — joining the lobby…');
  } catch (e) {
    lobbyView('wait', e.message);
  }
}

function onHostMessage(m) {
  switch (m.t) {
    case 'lobby': {
      const fromGame = net.phase !== 'lobby' || $('online-lobby').classList.contains('hidden');
      Object.assign(net, { slots: m.slots, mySlot: m.you, phase: 'lobby' });
      if (fromGame) {
        game = null;
        paused = true;
        showOverlay('overlay-online');
        lobbyView('lobby');
      } else renderLobby();
      break;
    }
    case 'start':
      net.phase = 'game';
      net.names = m.names || [];
      startGame('online', { mode: m.mode, mirror: true, you: m.you });
      break;
    case 'snap':
      if (game?.mirror) applySnapshot(game, m);
      break;
    case 'msg':
      toast(m.text, m.error ? 'error' : 'info');
      break;
    case 'over':
      if (game) setTimeout(() => gameOver(m.winner), 400);
      break;
    case 'error':
      leaveOnline();
      showOverlay('overlay-online');
      lobbyView('wait', m.msg);
      break;
    case 'ping': net.host.send({ t: 'pong', at: m.at }); break;
    case 'pong': net.pingMs = Math.round(performance.now() - m.at); break;
    case 'bye': onHostLost('left'); break;
    default: break;
  }
}

function onHostLost(reason) {
  if (net.role !== 'guest') return;
  const inGame = net.phase === 'game' && game && !game.over;
  resetNet();
  if (!inGame) {
    showOverlay('overlay-online');
    lobbyView('wait', reason === 'left' ? 'The host closed the room.' : 'The connection to the host was lost.');
    return;
  }
  paused = true;
  game.over = true;
  $('result-label').textContent = 'DISCONNECTED';
  $('result-label').style.color = 'var(--dim)';
  $('result-sub').textContent = reason === 'left' ? 'The host left the game.' : 'The connection to the host was lost.';
  $('btn-again').classList.add('hidden');
  showOverlay('overlay-gameover');
}

function resetNet() {
  net.room?.cancel?.();
  Object.assign(net, { role: null, host: null, room: null, peers: [], slots: [], phase: 'lobby', pingMs: null, route: null });
}

function leaveOnline() {
  const links = net.role === 'host' ? net.peers.map((p) => p.transport) : net.host ? [net.host] : [];
  for (const t of links) {
    t.send({ t: 'bye' });
    setTimeout(() => t.close(), 100);
  }
  // Give the goodbyes a moment to go out before the host's room shuts.
  const room = net.room;
  net.room = null;
  if (room) setTimeout(() => room.cancel?.(), 200);
  resetNet();
}

async function shareInvite() {
  const url = `${location.origin}${location.pathname}?join=${net.code}`;
  const text = `Join my Fortress Command game! Room code: ${net.code}`;
  try {
    if (navigator.share) await navigator.share({ title: 'Fortress Command', text, url });
    else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast('Invite link copied', 'info');
    }
  } catch { /* share sheet dismissed */ }
}

$('btn-host').addEventListener('click', hostOnline);
$('btn-join').addEventListener('click', joinOnline);
$('join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinOnline(); });
$('btn-share').addEventListener('click', shareInvite);
$('btn-online-back').addEventListener('click', () => showOverlay('overlay-title'));
$('btn-online-cancel').addEventListener('click', () => { leaveOnline(); lobbyView('home'); });
$('btn-lobby-leave').addEventListener('click', () => { leaveOnline(); lobbyView('home'); });
$('btn-lobby-main').addEventListener('click', () => {
  if (net.role === 'host') startOnlineGame();
  else if (net.role === 'guest') net.host.send({ t: 'ready', ready: !net.slots[net.mySlot]?.ready });
});

$('btn-pause').addEventListener('click', () => {
  if (!game || game.over) return;
  if (!online()) paused = true; // online games keep running
  showOverlay('overlay-pause');
});
$('btn-resume').addEventListener('click', () => { paused = false; showOverlay(null); });
$('btn-restart').addEventListener('click', () => startGame(modeKey));
$('btn-again').addEventListener('click', () => {
  if (net.role === 'host') backToLobby();
  else startGame(modeKey);
});
$('btn-quit').addEventListener('click', () => { leaveOnline(); paused = true; showOverlay('overlay-title'); });
$('btn-menu').addEventListener('click', () => { leaveOnline(); showOverlay('overlay-title'); });
$('btn-switch').addEventListener('click', () => {
  if (!game || paused) return;
  clearSelection();
  cancelPlacement();
  do { active = (active + 1) % game.players.length; } while (!game.players[active].alive || game.players[active].isAi);
  panelKey = '';
  focusHq();
  toast(`${PLAYER_NAMES[active]}'s turn`, 'info');
});

// Auto-pause when the app is backgrounded (online games can't pause).
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game && !game.over && !paused && !online()) { paused = true; showOverlay('overlay-pause'); }
});

// Online heartbeat: measure latency, shown next to the mode label (the host
// shows its slowest guest).
setInterval(() => {
  if (!online() || !game) return;
  const now = performance.now();
  if (net.role === 'guest') {
    net.host.send({ t: 'ping', at: now });
    if (!net.route) connectionRoute(net.host).then((r) => { if (net.host) net.route = r; });
  } else {
    for (const p of net.peers) p.transport.send({ t: 'ping', at: now });
    const pings = net.peers.map((p) => p.pingMs).filter((v) => v != null);
    net.pingMs = pings.length ? Math.max(...pings) : null;
  }
  $('mode-label').textContent = `${game.mode.label}${net.pingMs != null ? ` · ${net.pingMs} ms` : ''}${net.route ? ` · ${net.route}` : ''}`;
}, 2000);

// ── Main loop ──────────────────────────────────────────────────────────────
let last = performance.now();
let panelTimer = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_DELTA);
  last = now;

  if (game) {
    if (!paused || online()) game.update(dt);
    if (net.role === 'host' && net.phase === 'game' && !game.over) {
      net.snapTimer -= dt;
      if (net.snapTimer <= 0) {
        net.snapTimer = SNAPSHOT_INTERVAL;
        broadcast(encodeSnapshot(game, net.mapVersion));
        net.mapVersion = game.map.version;
      }
    }
    // Knocked out of a multiplayer game that's still going: keep watching.
    if (online() && !game.over && !eliminatedNoted && game.players[active] && !game.players[active].alive) {
      eliminatedNoted = true;
      toast('Your HQ fell — you can keep watching', 'info');
    }
    if (game.mirror && !game.over) {
      const stale = performance.now() - game.lastSnapshotAt > 2000;
      if (stale) setStatus('Waiting for the host…');
      else if (statusText === 'Waiting for the host…') setStatus('');
    }

    // Keyboard pan + pan inertia
    const kx = (keys.has('arrowright') || keys.has('d')) - (keys.has('arrowleft') || keys.has('a'));
    const ky = (keys.has('arrowdown') || keys.has('s')) - (keys.has('arrowup') || keys.has('w'));
    cam.x += (kx * 800 * dt) / cam.scale;
    cam.y += (ky * 800 * dt) / cam.scale;
    if (!gesture && (cam.vx || cam.vy)) {
      cam.x += cam.vx * dt;
      cam.y += cam.vy * dt;
      const decay = Math.exp(-dt * 5);
      cam.vx *= decay;
      cam.vy *= decay;
      if (Math.hypot(cam.vx, cam.vy) < 5) cam.vx = cam.vy = 0;
    }
    clampCam();

    draw(dt);
    renderHud();
    panelTimer -= dt;
    if (panelTimer <= 0) { panelTimer = 0.1; renderPanel(); }
  }
  requestAnimationFrame(frame);
}

// The battlefield is drawn into a low-resolution "art" buffer (one pixel per G
// world units) and blown up by a whole number of device pixels with no
// smoothing, so every pixel stays crisp. A sub-pixel offset on the final blit
// keeps scrolling smooth.
const low = document.createElement('canvas');
const lctx = low.getContext('2d');

// Art pixels of sky kept above the top of the world when zoomed out;
// anything higher is filled with plain sky.
const SKY_PAD = 100;

function draw(dt) {
  const P = Math.max(1, Math.round(cam.scale * dpr * G)); // device px per art px
  const camAX = Math.floor(cam.x / G);
  const camAY = Math.floor(cam.y / G);
  const topA = Math.max(camAY, -SKY_PAD); // first art row in the buffer
  const bw = Math.ceil(canvas.width / P) + 2;
  const bh = Math.ceil(canvas.height / P) + 2 - (topA - camAY);
  if (low.width !== bw || low.height !== bh) { low.width = bw; low.height = bh; }
  lctx.imageSmoothingEnabled = false;
  const offX = Math.round((cam.x / G - camAX) * P);
  const offY = Math.round((cam.y / G - camAY) * P);

  lctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBackground(lctx, bw, bh, camAX, topA);
  const v = view();
  // On looping maps the view can straddle the seam: draw the world again one
  // map-width over so both sides show.
  const offsets = game.wrap ? [0, WORLD_W, -WORLD_W].filter((o) => o + WORLD_W > v.x && o < v.x + v.w) : [0];
  const eachCopy = (fn) => {
    for (const o of offsets) {
      lctx.setTransform(1, 0, 0, 1, o / G - camAX, -topA);
      fn({ ...v, x: v.x - o });
    }
  };
  game.effects = updateEffects(game.effects, dt);
  eachCopy((vv) => {
    drawTerrain(lctx, game.map, vv);
    const onScreen = (e) => e.x + (e.w || 30) > vv.x - 40 && e.x - 30 < vv.x + vv.w + 40;
    drawEffects(lctx, game.effects);
    for (const b of game.buildings) if (onScreen(b)) drawBuilding(lctx, b);
    for (const u of game.units) if (onScreen(u)) drawUnit(lctx, u);
    for (const p of game.projectiles) drawProjectile(lctx, p);
  });
  if (pendingBuild) {
    let zones = game.buildZones(active);
    if (game.wrap) zones = [-1, 0, 1].flatMap((k) => zones.map(([a, b]) => [a + k * MAP_W, b + k * MAP_W]));
    lctx.setTransform(1, 0, 0, 1, -camAX, -topA);
    drawBuildZones(lctx, zones.sort((a, b) => a[0] - b[0]), v);
  }

  markers = markers.filter((m) => (m.t -= dt) > 0);
  eachCopy(() => {
    if (pendingBuild && ghost) drawGhost(lctx, ghost);
    for (const m of markers) drawMarker(lctx, m);
  });

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const top = (topA - camAY) * P - offY;
  if (top > 0) { ctx.fillStyle = SKY_TOP; ctx.fillRect(0, 0, canvas.width, top + 1); }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, bw, bh, -offX, top, bw * P, bh * P);

  mctx.setTransform(1, 0, 0, 1, 0, 0);
  drawMinimap(mctx, game, mini.width, mini.height, v, minimapCache, pendingBuild ? game.buildZones(active) : null);
}

// ── Boot ───────────────────────────────────────────────────────────────────
// Read-only handle for automated browser tests.
window.__fortress = { get game() { return game; }, cam };
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
buildModeButtons();
resize();
{
  // Invite links open straight into the join screen.
  const params = new URLSearchParams(location.search);
  const join = params.get('join');
  if (join) {
    params.delete('join');
    const qs = params.toString();
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
    openLobby(join.toUpperCase());
    joinOnline();
  }
}
requestAnimationFrame(frame);

for (const el of document.querySelectorAll('.version')) el.textContent = `Fortress Command ${VERSION}`;

// Keep the installed app current: check for a new build whenever it's opened,
// and switch to it as soon as you're back on the title screen.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  let updateReady = false;
  const applyUpdate = () => {
    if (updateReady && !$('overlay-title').classList.contains('hidden')) location.reload();
  };
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // first install, nothing to refresh
    updateReady = true;
    if (game && !game.over && $('overlay-title').classList.contains('hidden')) toast('Update ready — it loads at the main menu', 'info');
    applyUpdate();
  });
  new MutationObserver(applyUpdate).observe($('overlay-title'), { attributes: true, attributeFilter: ['class'] });
}
