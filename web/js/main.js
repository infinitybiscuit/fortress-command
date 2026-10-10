// Fortress Command (web) — app shell: camera, touch input, UI panels and main loop.
import {
  WORLD_W, WORLD_H, TILE_SIZE, MODES, BUILDING_TYPES, UNIT_TYPES, BUILD_MENU, BUILD_ICONS,
  UNIT_ICONS, VERSION, PLAYER_COLORS, PLAYER_NAMES, MAX_DELTA, LOW_CREDITS, capitalize,
} from './config.js';
import { Game } from './game.js';
import { State, canReach } from './entities.js';
import {
  drawSky, drawTerrain, drawUnit, drawBuilding, drawProjectile, drawGhost, drawMinimap,
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
let sellArmed = null;       // { id, until } — sell needs a second tap to confirm
const minimapCache = {};

// ── Camera ─────────────────────────────────────────────────────────────────
const cam = { x: 0, y: 0, scale: 1, vx: 0, vy: 0 };
let viewW = 0;
let viewH = 0;
let dpr = 1;

function minScale() { return Math.max(viewH / WORLD_H, viewW / WORLD_W); }
function defaultScale() { return Math.min(MAX_SCALE, Math.max(minScale(), viewH / (WORLD_H - 5 * TILE_SIZE))); }
function view() { return { x: cam.x, y: cam.y, w: viewW / cam.scale, h: viewH / cam.scale }; }

function clampCam() {
  cam.scale = Math.min(MAX_SCALE, Math.max(minScale(), cam.scale));
  const v = view();
  cam.x = Math.min(Math.max(0, cam.x), WORLD_W - v.w);
  cam.y = Math.min(Math.max(0, cam.y), WORLD_H - v.h);
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
  cam.scale *= factor;
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

// A fresh player order cancels Hold and Retreat stances.
function order(u) { u.hold = false; u.forced = false; return u; }

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
    const d = Math.hypot(cx - wx, cy - wy);
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
  const [wx, wy] = screenToWorld(sx, sy);
  const mine = (e) => e.faction === active;
  const enemy = (e) => e.faction !== active;

  if (pendingBuild) {
    const pl = game.placementFor(pendingBuild, wx, wy);
    const sameSpot = ghost && ghost.tx === pl.tx && ghost.ty === pl.ty;
    ghost = pl;
    if (sameSpot && pl.valid) confirmPlacement();
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
    for (const u of sel) order(u).attack(target);
    markers.push({ x: target.centre()[0], y: target.centre()[1], t: 0.6, color: '#ff4d4d' });
    return;
  }

  const ownUnit = pickUnit(wx, wy, mine);
  const repairers = sel.filter((u) => u.repairRate > 0 && u !== ownUnit);
  if (ownUnit?.vehicle && ownUnit.hp < ownUnit.maxHp && repairers.length) {
    for (const u of repairers) order(u).attack(ownUnit);
    toast('Repairing', 'info');
    return;
  }
  if (ownUnit) {
    const now = performance.now();
    if (lastTap.unit === ownUnit && now - lastTap.t < DOUBLE_TAP_MS) {
      // Double-tap: every unit of the same type that's on screen.
      const v = view();
      selectUnits(game.units.filter((u) => mine(u) && u.type === ownUnit.type
        && u.x >= v.x && u.x <= v.x + v.w));
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
      for (const u of engineers) order(u).attack(ownBuilding);
      toast('Repairing', 'info');
      return;
    }
    selectBuilding(ownBuilding);
    return;
  }

  if (sel.length) {
    for (const u of sel) order(u).moveTo(wx + (Math.random() - 0.5) * Math.min(60, sel.length * 6));
    markers.push({ x: wx, y: wy, t: 0.6, color: '#00ff66' });
    return;
  }
  clearSelection();
}

function confirmPlacement() {
  if (!ghost || !pendingBuild) return;
  const err = game.tryPlaceAt(active, pendingBuild, ghost.tx, ghost.ty);
  if (err) { toast(err); return; }
  toast(`${capitalize(pendingBuild)} placed`, 'info');
  // Bridges and ramps are usually laid in runs — stay in placement mode,
  // previewing the next tile along.
  if (pendingBuild === 'bridge' || pendingBuild === 'ramp') {
    ghost = game.placementAt(pendingBuild, ghost.tx + 1, ghost.ty);
    if (game.players[active].money < BUILDING_TYPES[pendingBuild].cost) cancelPlacement();
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

$('btn-zoom-in').addEventListener('click', () => zoomAt(1.25, viewW / 2, viewH / 2));
$('btn-zoom-out').addEventListener('click', () => zoomAt(0.8, viewW / 2, viewH / 2));

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
    panel.innerHTML = `
      <div class="panel-head"><div class="panel-title">${BUILD_ICONS[pendingBuild]} Place ${capitalize(pendingBuild)}</div>
        <div class="panel-sub">💰 ${d.cost} · ${d.buildTime}s</div></div>
      <div class="hint">Tap the battlefield to position it, then tap the same spot again or press Place. ${tip}</div>
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
    if (selectedBuilding && game.train(active, selectedBuilding, btn.dataset.train)) {
      toast(`${capitalize(btn.dataset.train)} queued`, 'info');
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
          const refund = game.sell(active, b);
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
        // Hold: stay put, but still fire at anything that comes into range.
        for (const u of sel) {
          order(u).hold = true;
          Object.assign(u, { state: State.IDLE, target: null, resume: null, home: null, vx: 0 });
        }
        toast('Holding position', 'info');
        break;
      case 'charge': {
        // Advance toward the nearest enemy HQ.
        const enemies = game.players.filter((o, i) => i !== active && o.hq).map((o) => o.hq);
        if (!enemies.length || !sel.length) break;
        const ax = sel.reduce((s, u) => s + u.x, 0) / sel.length;
        enemies.sort((a, b) => Math.abs(a.centre()[0] - ax) - Math.abs(b.centre()[0] - ax));
        for (const u of sel) order(u).attack(enemies[0]);
        toast('Charge!', 'info');
        break;
      }
      case 'retreat':
        // Retreat ignores enemies on the way home.
        if (hq) for (const u of sel) { order(u).moveTo(hq.centre()[0] + (Math.random() - 0.5) * 80); u.forced = true; }
        break;
      case 'find': {
        if (!sel.length) break;
        const ax = sel.reduce((s, u) => s + u.x, 0) / sel.length;
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
  chip.textContent = game.humanCount > 1 ? PLAYER_NAMES[active].toUpperCase() : 'YOU';
  chip.style.background = `rgba(${col},0.25)`;
  chip.style.color = `rgb(${col})`;
  if (!pendingBuild && statusText) setStatus('');
}

// ── Game lifecycle ─────────────────────────────────────────────────────────
function showOverlay(id) {
  for (const o of ['overlay-title', 'overlay-pause', 'overlay-gameover']) $(o).classList.toggle('hidden', o !== id);
}

function startGame(key) {
  modeKey = key;
  game = new Game(key, {
    onGameOver: (winner) => setTimeout(() => gameOver(winner), 600),
    onMessage: (m) => toast(m, 'info'),
  });
  active = 0;
  selectedBuilding = null;
  cancelPlacement();
  markers = [];
  panelKey = '';
  $('mode-label').textContent = MODES[key].label;
  $('btn-switch').classList.toggle('hidden', game.humanCount < 2);
  showOverlay(null);
  paused = false;
  resize();
  cam.scale = defaultScale();
  focusHq();
}

function focusHq() {
  const hq = game.players[active].hq;
  if (hq) centreOn(hq.x + hq.w / 2 + view().w * 0.25, null);
}

function gameOver(winner) {
  paused = true;
  const label = $('result-label');
  const sub = $('result-sub');
  if (game.humanCount > 1) {
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
    if (b) startGame(b.dataset.mode);
  });
}

$('btn-pause').addEventListener('click', () => { if (game && !game.over) { paused = true; showOverlay('overlay-pause'); } });
$('btn-resume').addEventListener('click', () => { paused = false; showOverlay(null); });
$('btn-restart').addEventListener('click', () => startGame(modeKey));
$('btn-again').addEventListener('click', () => startGame(modeKey));
$('btn-quit').addEventListener('click', () => { paused = true; showOverlay('overlay-title'); });
$('btn-menu').addEventListener('click', () => showOverlay('overlay-title'));
$('btn-switch').addEventListener('click', () => {
  if (!game || paused) return;
  clearSelection();
  cancelPlacement();
  do { active = (active + 1) % game.players.length; } while (!game.players[active].alive || game.players[active].isAi);
  panelKey = '';
  focusHq();
  toast(`${PLAYER_NAMES[active]}'s turn`, 'info');
});

// Auto-pause when the app is backgrounded.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game && !game.over && !paused) { paused = true; showOverlay('overlay-pause'); }
});

// ── Main loop ──────────────────────────────────────────────────────────────
let last = performance.now();
let panelTimer = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_DELTA);
  last = now;

  if (game) {
    if (!paused) game.update(dt);

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

function draw(dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSky(ctx, viewW, viewH);
  const s = cam.scale * dpr;
  ctx.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
  const v = view();
  drawTerrain(ctx, game.map, v);
  const onScreen = (e) => e.x + (e.w || 30) > v.x - 40 && e.x - 30 < v.x + v.w + 40;
  for (const b of game.buildings) if (onScreen(b)) drawBuilding(ctx, b);
  for (const u of game.units) if (onScreen(u)) drawUnit(ctx, u);
  for (const p of game.projectiles) drawProjectile(ctx, p);
  if (pendingBuild && ghost) drawGhost(ctx, ghost);

  markers = markers.filter((m) => (m.t -= dt) > 0);
  for (const m of markers) {
    ctx.strokeStyle = m.color;
    ctx.globalAlpha = Math.min(1, m.t * 2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 14 * (1.2 - m.t), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  mctx.setTransform(1, 0, 0, 1, 0, 0);
  drawMinimap(mctx, game, mini.width, mini.height, v, minimapCache);
}

// ── Boot ───────────────────────────────────────────────────────────────────
// Read-only handle for automated browser tests.
window.__fortress = { get game() { return game; } };
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
buildModeButtons();
resize();
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
