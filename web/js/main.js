// Slop Wars (web) — app shell: camera, touch input, UI panels and main loop.
import {
  WORLD_W, MAP_W, MAP_H, TILE_SIZE, GROUND_LEVEL_TILE, MODES, BUILDING_TYPES, UNIT_TYPES, BUILD_MENU, BUILD_ICONS,
  UNIT_ICONS, RAMP_MAX_ANGLE, RAMP_MAX_LEN, VERSION, PLAYER_COLORS, PLAYER_NAMES, MAX_DELTA, LOW_CREDITS, capitalize, ONLINE_LAYOUTS,
} from './config.js';
import { Game, clock } from './game.js';
import { applyCommand, ref } from './commands.js';
import {
  hostRoom, joinRoom, makeRoomCode, connectionRoute, encodeSnapshot, encodeMap, createMirror, applySnapshot, SNAPSHOT_INTERVAL,
} from './net.js';
import {
  drawBackground, drawTerrain, drawStairs, drawUnit, drawBuilding, drawProjectile, drawGhost, drawMinimap, drawBuildZones,
  drawEffects, updateEffects, drawMarker, drawWeather, G, skyTop, setTheme, THEMES, currentTheme, unitIcon,
  themeSides, sideInfo, sideIcon, setFactionSides, setViewer, drawFlag, flagSpot,
} from './render.js';
import {
  GROUND_Y, FIELD_BOX, projX, projY, drawIsoBackground, drawIsoWorld, drawIsoZones, drawIsoGhost,
  drawIsoMarker, drawIsoMinimap, isoMinimapFrame, isoRay, isoHitUnit, isoHitBuilding, liftAt,
} from './iso.js';

// The game used to be called Fortress Command: move its saved settings (name,
// theme, rejoin session) to the new key names once.
for (const k of ['name', 'theme', 'session']) {
  try {
    const old = localStorage.getItem(`fortress-${k}`);
    if (old != null && localStorage.getItem(`slop-${k}`) == null) localStorage.setItem(`slop-${k}`, old);
    localStorage.removeItem(`fortress-${k}`);
  } catch { /* storage unavailable */ }
}

import * as audio from './audio.js';
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
const BOX_MIN = 6;          // px a mouse drag must cover before it's a box selection

// A mouse or trackpad (not a touch screen): hints say "click", and the panel
// shows keyboard shortcuts.
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const tap = (cap) => (finePointer.matches ? (cap ? 'Click' : 'click') : (cap ? 'Tap' : 'tap'));
const syncPointerClass = () => document.body.classList.toggle('mouse', finePointer.matches);
finePointer.addEventListener?.('change', () => { syncPointerClass(); panelKey = ''; });
syncPointerClass();

let game = null;
let modeKey = 'cpu';
let active = 0;             // player index currently being controlled
let paused = true;
let selectedBuilding = null;
let pendingBuild = null;    // building type in placement mode
let ghost = null;           // current placement preview
let rampStart = null;       // ramps are laid point to point: where the first end went
let markers = [];           // move-order feedback
let statusText = '';
let panelKey = '';
let eliminatedNoted = false; // told this player they're out but the game goes on
let sellArmed = null;       // { id, until } — sell needs a second tap to confirm
const minimapCache = {};
// 2D (side-on) or isometric. Isometric is a preview feature: it's switched
// on in Settings, under Preview features, and fixed for the whole game.
// Online, the host's choice goes to everyone.
const VIEW_KEY = 'slop-view';
const PREVIEW_KEY = 'slop-preview';
let isoPick = false;    // the Isometric view switch
let preview = false;    // Preview features shown and used
try {
  isoPick = localStorage.getItem(VIEW_KEY) === 'iso';
  // Before Settings, isometric was a title-screen choice: keep it for anyone
  // who picked it by switching Preview features on for them.
  const p = localStorage.getItem(PREVIEW_KEY);
  preview = p == null ? isoPick : p === 'on';
} catch { /* storage unavailable */ }
const viewChoice = () => (preview && isoPick ? 'iso' : 'flat');
let iso = false;
let settingsFrom = 'overlay-title'; // the menu Settings goes back to

// ── Camera ─────────────────────────────────────────────────────────────────
// scale = screen points per world unit. It's snapped so each art pixel
// (G world units) covers a whole number of device pixels, keeping the pixel
// art sharp; `zoom` is the unsnapped target that pinch gestures adjust.
// The one exception is the fit zoom, where the playable band (VIEW_TOP to
// VIEW_BOTTOM) exactly fills the battlefield height: games start there and
// zooming out stops there, so there's no vertical scrolling and no wasted
// sky or dirt. Pixels at that zoom may differ in size by one device pixel.
const cam = { x: 0, y: 0, scale: 1, zoom: 1, vx: 0, vy: 0 };
let viewW = 0;
let viewH = 0;
let dpr = 1;

// The camera never looks above the highest point an aircraft climbs to, or
// more than a sliver of dirt below the ground surface.
const VIEW_TOP = 24;
const VIEW_BOTTOM = (MAP_H - GROUND_LEVEL_TILE) * TILE_SIZE + 24;
const VIEW_SPAN = VIEW_BOTTOM - VIEW_TOP;

// Isometric: the furthest the view zooms out shows this much of the field
// (in projected units) across the shorter side of the screen.
const ISO_SPAN = 1100;

function fitScale() { return iso ? Math.min(viewW, viewH) / ISO_SPAN : Math.max(viewH / VIEW_SPAN, viewW / WORLD_W); }
function maxScale() { return Math.max(MAX_SCALE, fitScale()); }
function view() { return { x: cam.x, y: cam.y, w: viewW / cam.scale, h: viewH / cam.scale }; }

function snapScale(z) {
  const fit = fitScale();
  if (z <= fit * 1.0001) return fit;
  const unit = dpr * G; // device pixels per world unit at scale 1, times art pixel size
  let p = Math.max(1, Math.round(z * unit));
  while (p / unit <= fit) p++;
  return p / unit;
}

function clampCam() {
  cam.zoom = Math.min(maxScale(), Math.max(fitScale(), cam.zoom));
  cam.scale = snapScale(cam.zoom);
  const v = view();
  if (iso) { clampIso(v); return; }
  // Looping maps pan forever; otherwise stop at the map edges.
  if (game?.wrap) cam.x = ((cam.x % WORLD_W) + WORLD_W) % WORLD_W;
  else cam.x = Math.min(Math.max(0, cam.x), WORLD_W - v.w);
  cam.y = Math.min(Math.max(VIEW_TOP, cam.y), VIEW_BOTTOM - v.h);
}

// Isometric: the field is a diamond on screen. Keep the middle of the
// screen over it (with a little room above for tall buildings at the back).
function clampIso(v) {
  const b = FIELD_BOX;
  const cx = Math.min(Math.max(b.x0, cam.x + v.w / 2), b.x1);
  const cy = Math.min(Math.max(b.y0 - 60, cam.y + v.h / 2), b.y1);
  cam.x = cx - v.w / 2;
  cam.y = cy - v.h / 2;
}

// wz: depth on the isometric field (ignored on the side-on map).
function centreOn(wx, wy, wz = 0) {
  const v = view();
  if (iso) {
    cam.x = projX(wx, wz) - v.w / 2;
    cam.y = projY(wx, (wy ?? GROUND_Y) - liftAt(game, wx, wz), wz) - v.h / 2;
    clampCam();
    return;
  }
  cam.x = wx - v.w / 2;
  cam.y = wy == null ? VIEW_BOTTOM - v.h : wy - v.h / 2;
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

// The world point under the screen point. In the isometric view that's the
// first thing the line of sight meets (z is how deep into the strip).
function screenToWorld(sx, sy) {
  const X = cam.x + sx / cam.scale;
  const Y = cam.y + sy / cam.scale;
  if (!iso) return [X, Y];
  const hit = isoRay(game, X, Y);
  return [hit.x, hit.y, hit.z];
}
// A tap: the world point under it, plus (isometric) the projected point,
// since units and buildings are picked by what's drawn there.
function pointAt(sx, sy) {
  const [rawX, wy, z] = screenToWorld(sx, sy);
  return { wx: game.normX(rawX), wy, z, X: cam.x + sx / cam.scale, Y: cam.y + sy / cam.scale };
}
// Is a unit on screen (for double-tap's "every unit of this type")?
function onScreen(u) {
  const v = view();
  if (!iso) return Math.abs(game.dx(v.x + v.w / 2, u.x)) <= v.w / 2;
  return screenPos(u).some(([X, Y]) => X >= v.x && X <= v.x + v.w && Y >= v.y && Y <= v.y + v.h);
}
// A unit's centre in projected units (isometric), in a list like a looping
// map's copies would be.
function screenPos(u) {
  return [[projX(u.x, u.z), projY(u.x, u.y - u.h / 2 - liftAt(game, u.x, u.z), u.z)]];
}

function resize() {
  const r = canvas.getBoundingClientRect();
  // Stay at the fit zoom across rotations and window resizes.
  if (viewH && cam.zoom <= fitScale() * 1.0001) cam.zoom = 0;
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
  if (kind !== 'info') audio.sfx('error');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 1600);
}
function setStatus(text) { statusText = text; $('status').textContent = text; }

// ── Online session ─────────────────────────────────────────────────────────
// role: null offline, 'host' (runs the game and the lobby, plays Blue) or
// 'guest'. The host keeps one connection per guest in `peers`; a guest's only
// connection is `host`. `slots` is the lobby: up to five seats, each
// { kind: 'host' | 'human' | 'cpu' | 'open' | 'closed', name, ready }.
//
// Phones drop off networks all the time (a lift, a Wi-Fi/5G hand-over, the
// screen locking), so a guest who vanishes mid-battle keeps their seat: the
// host lists them in `away`, and their phone reconnects with its `token`.
const net = {
  role: null, room: null, code: '', phase: 'lobby', snapTimer: 0, pingMs: null, route: null,
  host: null, peers: [], slots: [], mySlot: 0, names: [], away: [],
  token: null, myName: '', reconnecting: false, lastHostMsg: 0,
};
const LINK_TIMEOUT = 8000; // ms of silence before a connection counts as dead
const AWAY_GRACE = 45000;  // ms a dropped player's army waits before the CPU steps in
const REJOIN_WINDOW = 60000; // ms a guest keeps trying to reconnect
const SLOW_LINK = 64 * 1024; // queued bytes beyond which the host skips an update
const SESSION_KEY = 'slop-session';
const HOST_WAIT = 'Waiting for the host…';
const RECONNECTING = 'Connection lost — reconnecting…';
const NET_STATUS = [HOST_WAIT, RECONNECTING];
const online = () => net.role !== null;

// Every player order goes through here: applied locally, or sent to the host
// when we're a guest. Returns an error message (local only) or null.
function issue(cmd) {
  if (net.role === 'guest') {
    if (!net.host) return 'Reconnecting — try again in a moment';
    net.host.send({ t: 'cmd', cmd });
    return null;
  }
  return applyCommand(game, active, cmd);
}
const ids = (list) => list.map((u) => u.id);

// Names and badges come from the theme (Rise of the Robots renames units).
// Themes with sides can rename things per side (a Union Bluecoat, a Rebel Greyback).
const nameOf = (t) => sideInfo(active)?.names?.[t] || currentTheme().names?.[t] || capitalize(t);
const iconOf = (t) => {
  const th = currentTheme();
  if (th.spriteIcons && UNIT_TYPES[t]) return `<img class="sprite-ic" src="${unitIcon(t, active)}" alt="">`;
  return sideInfo(active)?.icons?.[t] || th.icons?.[t] || UNIT_ICONS[t] || BUILD_ICONS[t];
};
// Short side label for a faction ("Union"), or null when the theme has no sides.
const sideShort = (f) => (themeSides() ? sideInfo(f)?.short : null);

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
  if (list.length) audio.sfx('select');
}

function cancelPlacement() { pendingBuild = null; ghost = null; rampStart = null; hoverReason = ''; }

// ── Hit testing (prefers the closest entity to the finger) ─────────────────
// pt is a pointAt() result.
function pickUnit(pt, pred) {
  let best = null;
  let bestD = Infinity;
  for (const u of game.units) {
    if (u.dead || !pred(u)) continue;
    let d;
    if (iso) d = isoHitUnit(game, u, pt.X, pt.Y, HIT_PAD);
    else if (u.containsPoint(pt.wx, pt.wy, HIT_PAD)) {
      const [cx, cy] = u.centre();
      d = Math.hypot(game.dx(pt.wx, cx), cy - pt.wy);
    }
    if (d != null && d < bestD) { bestD = d; best = u; }
  }
  return best;
}
function pickBuilding(pt, pred) {
  const hit = iso ? (b) => isoHitBuilding(game, b, pt.X, pt.Y, 2) : (b) => b.containsPoint(pt.wx, pt.wy, 4);
  return game.buildings.find((b) => !b.dead && pred(b) && hit(b)) || null;
}
// Where an order marker goes: on the target, or where the tap pointed.
const markAt = (e, color) => {
  const [x, y] = e.centre();
  markers.push({ x, y, z: iso ? (e.z || 0) + (e.d || 0) / 2 : 0, t: 0.6, color });
  audio.sfx('order');
};

// ── Tap handling ───────────────────────────────────────────────────────────
let lastTap = { t: 0, unit: null };

function handleTap(sx, sy) {
  if (!game || paused || game.over) return;
  const pt = pointAt(sx, sy);
  const { wx, wy } = pt;
  const mine = (e) => e.faction === active;
  const enemy = (e) => e.faction !== active;

  if (pendingBuild === 'bridge') { rampTap(wx, wy); return; }
  if (pendingBuild) {
    const pl = game.placementFor(pendingBuild, wx, wy, active, pt.z);
    const sameSpot = ghost && ghost.tx === pl.tx && ghost.ty === pl.ty && ghost.tz === pl.tz;
    ghost = pl;
    if (sameSpot && pl.valid) confirmPlacement();
    else if (pl.reason === 'zone') setStatus('Too far from your base — build inside the green zone');
    else if (!pl.valid) setStatus("Can't build there — try another spot");
    else setStatus(`${tap(true)} again or press Place to build`);
    return;
  }

  const sel = selectedUnits();
  const enemyUnit = pickUnit(pt, enemy);
  const enemyBuilding = enemyUnit ? null : pickBuilding(pt, enemy);
  const target = enemyUnit || enemyBuilding;
  if (target && sel.length) {
    if (!sel.some((u) => u.canAttack(target))) { toast("Can't reach that — it's too high up"); return; }
    issue({ c: 'attack', ids: ids(sel), target: ref(target) });
    markAt(target, '#ff4d4d');
    return;
  }

  const ownUnit = pickUnit(pt, mine);
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
      selectUnits(game.units.filter((u) => mine(u) && u.type === ownUnit.type && onScreen(u)));
    } else {
      selectUnits([ownUnit]);
    }
    lastTap = { t: now, unit: ownUnit };
    return;
  }

  const ownBuilding = pickBuilding(pt, mine);
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
    issue({ c: 'move', ids: ids(sel), x: wx, y: wy, ...(iso ? { z: pt.z } : {}) });
    markers.push({ x: wx, y: wy, z: pt.z, t: 0.6, color: '#00ff66' });
    return;
  }
  clearSelection();
}

// Ramps are planks laid like Poly Bridge: press (or tap) where one end goes
// and drag (or tap) to where the other goes. Ends snap onto ground, platform
// corners and other ramps' ends; fingers get a bigger snap.
const snapRadius = () => (finePointer.matches ? 16 : 28);
const rampTo = (wx, wy) => game.rampSegment(active, rampStart, game.rampSnap(wx, wy, snapRadius()));

function rampTap(wx, wy) {
  if (!rampStart) { startRamp(wx, wy); return; }
  const seg = rampTo(wx, wy);
  // With a mouse the second click builds; fingers preview first, then confirm.
  const same = !finePointer.matches && ghost?.seg && Math.hypot(ghost.b.x - seg.b.x, ghost.b.y - seg.b.y) < 8;
  ghost = seg;
  if (seg.valid && (finePointer.matches || same)) confirmPlacement();
  else showRampStatus();
}

function startRamp(wx, wy) {
  const p = game.rampSnap(wx, wy, snapRadius());
  rampStart = p;
  ghost = { point: true, ...p };
  setStatus(finePointer.matches ? 'Drag to where the other end goes' : 'Now tap or drag to where the other end goes');
  return true;
}

function showRampStatus() {
  if (!ghost?.seg) return;
  const why = {
    zone: 'Too far from your base — build inside the green zone',
    steep: `Too steep (${ghost.angle}°) — keep it under ${RAMP_MAX_ANGLE}°`,
    long: `Too long — ${RAMP_MAX_LEN} tiles at most`,
    short: 'Too short — drag further',
    float: 'Attach one end to the ground, a platform or another bridge',
    blocked: "Something's in the way",
  }[ghost.reason];
  setStatus(why || `${ghost.angle ? `${ghost.angle}°` : 'Level'} · 💰${ghost.cost} — ${finePointer.matches ? 'let go or click to build' : 'press Place'}`);
}

function confirmPlacement() {
  if (!ghost || !pendingBuild) return;
  if (ghost.point) return;
  if (ghost.seg) {
    if (game.players[active].money < ghost.cost) { toast('Not enough credits!'); return; }
    if (ghost.reason === 'zone') { toast('Too far from your base!'); return; }
    if (!ghost.valid) { toast("Can't place here!"); return; }
    const err = issue({ c: 'ramp', a: [ghost.a.x, ghost.a.y], b: [ghost.b.x, ghost.b.y] });
    if (err) { toast(err); return; }
    toast(`${nameOf('bridge')} placed`, 'info');
    // Stay in ramp mode for the next one, unless the money's run out.
    const spent = net.role === 'guest' ? ghost.cost : 0;
    rampStart = null;
    ghost = null;
    if (game.players[active].money - spent < BUILDING_TYPES.bridge.cost) cancelPlacement();
    else setStatus(`${tap(true)} where the next one starts`);
    return;
  }
  if (game.players[active].money < BUILDING_TYPES[pendingBuild].cost) { toast('Not enough credits!'); return; }
  const check = game.placementAt(pendingBuild, ghost.tx, ghost.ty, active, ghost.tz ?? 0);
  if (check.reason === 'zone') { toast('Too far from your base!'); return; }
  if (!check.valid) { toast("Can't place here!"); return; }
  const err = issue({ c: 'place', type: pendingBuild, tx: ghost.tx, ty: ghost.ty, ...(game.field ? { tz: ghost.tz } : {}) });
  if (err) { toast(err); return; }
  toast(`${nameOf(pendingBuild)} placed`, 'info');
  cancelPlacement();
}

// ── Mouse orders: right-click commands, shift-click and box selection ──────
// Right-click is the PC order button: it never selects, it only sends the
// selected units somewhere (attack, repair or move) or cancels a placement.
function handleCommand(sx, sy) {
  if (!game || paused || game.over) return;
  if (pendingBuild) { cancelPlacement(); setStatus(''); return; }
  const sel = selectedUnits();
  if (!sel.length) { clearSelection(); return; }
  const pt = pointAt(sx, sy);
  const { wx, wy } = pt;
  const mine = (e) => e.faction === active;
  const enemy = (e) => e.faction !== active;
  const target = pickUnit(pt, enemy) || pickBuilding(pt, enemy);
  if (target) {
    if (!sel.some((u) => u.canAttack(target))) { toast("Can't reach that — it's too high up"); return; }
    issue({ c: 'attack', ids: ids(sel), target: ref(target) });
    markAt(target, '#ff4d4d');
    return;
  }
  const engineers = sel.filter((u) => u.repairRate > 0);
  const ownUnit = pickUnit(pt, mine);
  const fixUnit = ownUnit?.vehicle && ownUnit.hp < ownUnit.maxHp ? ownUnit : null;
  const ownBuilding = ownUnit ? null : pickBuilding(pt, mine);
  const fixBuilding = ownBuilding && ownBuilding.hp < ownBuilding.maxHp ? ownBuilding : null;
  const fixers = engineers.filter((u) => u !== fixUnit);
  if ((fixUnit || fixBuilding) && fixers.length) {
    issue({ c: 'repair', ids: ids(fixers), target: ref(fixUnit || fixBuilding) });
    toast('Repairing', 'info');
    return;
  }
  issue({ c: 'move', ids: ids(sel), x: wx, y: wy, ...(iso ? { z: pt.z } : {}) });
  markers.push({ x: wx, y: wy, z: pt.z, t: 0.6, color: '#00ff66' });
}

// Shift-click adds one of your units to the selection, or takes it out.
function toggleUnitAt(sx, sy) {
  if (!game || paused || game.over || pendingBuild) return handleTap(sx, sy);
  const u = pickUnit(pointAt(sx, sy), (e) => e.faction === active);
  if (!u) return handleTap(sx, sy);
  if (selectedBuilding) { selectedBuilding.selected = false; selectedBuilding = null; }
  u.selected = !u.selected;
}

// Drag a box to select every unit of yours inside it (shift adds to the selection).
function boxSelect(g) {
  if (!game || paused || game.over) return;
  const [x0, y0] = [cam.x + Math.min(g.sx, g.lx) / cam.scale, cam.y + Math.min(g.sy, g.ly) / cam.scale];
  const [x1, y1] = [cam.x + Math.max(g.sx, g.lx) / cam.scale, cam.y + Math.max(g.sy, g.ly) / cam.scale];
  const inside = game.units.filter((u) => {
    if (u.dead || u.faction !== active) return false;
    if (iso) return screenPos(u).some(([X, Y]) => X >= x0 - 4 && X <= x1 + 4 && Y >= y0 - 4 && Y <= y1 + 4);
    const [cx, cy] = u.centre();
    const dx = game.dx(game.normX(x0), cx);
    return dx >= -4 && dx <= x1 - x0 + 4 && cy >= y0 - 4 && cy <= y1 + 4;
  });
  if (g.shift) {
    if (selectedBuilding) { selectedBuilding.selected = false; selectedBuilding = null; }
    for (const u of inside) u.selected = true;
  } else {
    selectUnits(inside);
  }
}

// Where the mouse is over the battlefield (null when it's elsewhere): the
// building preview follows it, and the cursor shows what a click would do.
let hover = null;

function updateCursor() {
  let cursor = '';
  if (gesture?.type === 'box') cursor = 'crosshair';
  else if (gesture?.type === 'mpan' && gesture.moved) cursor = 'grabbing';
  else if (hover && game && !paused && !game.over) {
    const pt = pointAt(hover.x, hover.y);
    if (pendingBuild) cursor = 'copy';
    else if (selectedUnits().length && (pickUnit(pt, (e) => e.faction !== active) || pickBuilding(pt, (e) => e.faction !== active))) cursor = 'crosshair';
    else if (pickUnit(pt, (e) => e.faction === active) || pickBuilding(pt, (e) => e.faction === active)) cursor = 'pointer';
  }
  if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
}

// With a mouse, the placement preview tracks the pointer and one click builds.
let hoverReason = '';
function updateHoverGhost() {
  if (!pendingBuild || !hover || !game || gesture) return;
  const [rawX, wy, wz] = screenToWorld(hover.x, hover.y);
  if (pendingBuild === 'bridge') {
    if (rampStart) { ghost = rampTo(game.normX(rawX), wy); showRampStatus(); } else ghost = { point: true, ...game.rampSnap(game.normX(rawX), wy, snapRadius()) };
    return;
  }
  const pl = game.placementFor(pendingBuild, game.normX(rawX), wy, active, wz);
  ghost = pl;
  const reason = pl.reason === 'zone' ? 'zone' : pl.valid ? 'ok' : 'bad';
  if (reason !== hoverReason) {
    hoverReason = reason;
    setStatus(reason === 'zone' ? 'Too far from your base — build inside the green zone'
      : reason === 'bad' ? "Can't build there — try another spot" : `Click to build ${nameOf(pendingBuild)}`);
  }
}

// ── Pointer input: pan, pinch-zoom, tap; mouse clicks, drags and boxes ────
const pointers = new Map();
let gesture = null;

canvas.addEventListener('pointerdown', (e) => {
  try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or stale pointer */ }
  cam.vx = cam.vy = 0;
  if (e.pointerType === 'mouse') {
    // Left button selects (or drags a box); right or middle button pans.
    const base = { sx: e.offsetX, sy: e.offsetY, lx: e.offsetX, ly: e.offsetY, lt: performance.now(), shift: e.shiftKey, button: e.button };
    gesture = e.button === 0 ? { type: 'click', ...base } : { type: 'mpan', moved: false, ...base };
    // Ramps: press where the slope starts and drag to where it ends.
    if (e.button === 0 && pendingBuild === 'bridge' && game && !paused && !rampStart) {
      const [rawX, wy] = screenToWorld(e.offsetX, e.offsetY);
      if (startRamp(game.normX(rawX), wy)) gesture.type = 'ramp';
    }
    return;
  }
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (pointers.size === 1) {
    gesture = { type: 'tap', sx: e.offsetX, sy: e.offsetY, lx: e.offsetX, ly: e.offsetY, lt: performance.now() };
    // A finger that goes down on a ramp's start point drags out its end.
    if (pendingBuild === 'bridge' && rampStart && game) {
      const [rawX, wy] = screenToWorld(e.offsetX, e.offsetY);
      const near = Math.abs(game.dx(rampStart.x, game.normX(rawX))) < TILE_SIZE * 1.5
        && Math.abs(rampStart.y - wy) < TILE_SIZE * 1.5;
      if (near) gesture.type = 'ramp';
    }
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = { type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
});

function panBy(g, x, y) {
  const now = performance.now();
  const dx = x - g.lx;
  const dy = y - g.ly;
  cam.x -= dx / cam.scale;
  cam.y -= dy / cam.scale;
  const dt = Math.max(1, now - g.lt) / 1000;
  cam.vx = (-dx / cam.scale) / dt;
  cam.vy = (-dy / cam.scale) / dt;
  Object.assign(g, { lx: x, ly: y, lt: now });
  clampCam();
}

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    hover = { x: e.offsetX, y: e.offsetY };
    const g = gesture;
    if (g) {
      const far = Math.hypot(e.offsetX - g.sx, e.offsetY - g.sy);
      if (g.type === 'click' && far > BOX_MIN) g.type = pendingBuild ? 'drag' : 'box';
      if (g.type === 'ramp') {
        if (far > BOX_MIN) g.moved = true;
        const [rawX, wy] = screenToWorld(e.offsetX, e.offsetY);
        ghost = rampTo(game.normX(rawX), wy);
        showRampStatus();
      } else if (g.type === 'box') Object.assign(g, { lx: e.offsetX, ly: e.offsetY });
      else if (g.type === 'drag') panBy(g, e.offsetX, e.offsetY);
      else if (g.type === 'mpan') {
        if (far > TAP_SLOP) g.moved = true;
        panBy(g, e.offsetX, e.offsetY);
      }
    }
    updateCursor();
    return;
  }
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
  if (gesture.type === 'ramp') {
    const [rawX, wy] = screenToWorld(e.offsetX, e.offsetY);
    ghost = rampTo(game.normX(rawX), wy);
    showRampStatus();
    return;
  }
  if (gesture.type === 'tap' && Math.hypot(e.offsetX - gesture.sx, e.offsetY - gesture.sy) > TAP_SLOP) {
    gesture.type = 'pan';
  }
  if (gesture.type === 'pan') panBy(gesture, e.offsetX, e.offsetY);
});

function endMouse(e) {
  const g = gesture;
  gesture = null;
  if (!g || e.type !== 'pointerup') { cam.vx = cam.vy = 0; updateCursor(); return; }
  if (g.type === 'click') (g.shift ? toggleUnitAt : handleTap)(e.offsetX, e.offsetY);
  else if (g.type === 'ramp' && g.moved && ghost?.seg) confirmPlacement(); // let go to build
  else if (g.type === 'box') boxSelect(g);
  else if (g.type === 'mpan' && !g.moved && g.button === 2) handleCommand(e.offsetX, e.offsetY);
  // A mouse drag stops where it's let go; no fling.
  cam.vx = cam.vy = 0;
  updateCursor();
}

function endPointer(e) {
  if (e.pointerType === 'mouse') { endMouse(e); return; }
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
canvas.addEventListener('pointerleave', (e) => {
  if (e.pointerType !== 'mouse') return;
  hover = null;
  if (pendingBuild && !gesture) { hoverReason = ''; setStatus(`Click to place ${nameOf(pendingBuild)}`); }
});
// Clicking an on-screen button with the mouse doesn't focus it, so Space and
// Enter stay game shortcuts instead of pressing that button again.
$('app').addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
// Right-click is an order, not the browser's menu.
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  // Trackpads scroll sideways to pan; a wheel (or pinch, sent as ctrl+wheel) zooms.
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey) {
    cam.x += e.deltaX / cam.scale;
    if (iso) cam.y += e.deltaY / cam.scale;
    clampCam();
    return;
  }
  const scale = e.deltaMode === 1 ? 30 : 1; // Firefox reports lines, not pixels
  zoomAt(Math.exp(-e.deltaY * scale * (e.ctrlKey ? 0.01 : 0.0015)), e.offsetX, e.offsetY);
}, { passive: false });

// Block iOS Safari's page-level pinch/double-tap zoom.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Minimap: tap or drag to move the camera.
function minimapPan(e) {
  const r = mini.getBoundingClientRect();
  const wx = ((e.clientX - r.left) / r.width) * WORLD_W;
  const v = view();
  cam.vx = cam.vy = 0;
  if (iso) {
    // The minimap is the field seen the same way round: centre on the spot.
    const { s, ox, oy } = isoMinimapFrame(mini.width, mini.height);
    const mx = ((e.clientX - r.left) / r.width) * mini.width;
    const my = ((e.clientY - r.top) / r.height) * mini.height;
    cam.x = (mx - ox) / s - v.w / 2;
    cam.y = (my - oy) / s + FIELD_BOX.y0 - v.h / 2;
  } else cam.x = wx - v.w / 2;
  clampCam();
}
mini.addEventListener('pointerdown', (e) => { try { mini.setPointerCapture(e.pointerId); } catch { /* ignore */ } minimapPan(e); });
mini.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') { if (mini.hasPointerCapture(e.pointerId)) minimapPan(e); } });

// ── Keyboard ───────────────────────────────────────────────────────────────
// WASD or arrow keys pan; the rest are shortcuts for buttons on screen (the
// panel's buttons carry their key in data-key, and show it with a mouse).
const keys = new Set();
const OVERLAYS = ['overlay-title', 'overlay-gametype', 'overlay-sides', 'overlay-online', 'overlay-pause', 'overlay-settings', 'overlay-gameover'];
const openOverlay = () => OVERLAYS.find((o) => !$(o).classList.contains('hidden')) || null;
const PANEL_KEYS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', 'h', 'c', 'r', 'q', 'f', 'x', 'enter']);

window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  const overlay = openOverlay();
  if (k === 'm' && !e.repeat) { toggleMusic(); return; }
  if (overlay) {
    // Esc or P closes the pause menu.
    if (overlay === 'overlay-pause' && (k === 'escape' || k === 'p')) $('btn-resume').click();
    if (overlay === 'overlay-settings' && k === 'escape') $('btn-settings-back').click();
    return;
  }
  if (!game || game.over) return;
  keys.add(k);
  if (k.startsWith('arrow') || k === ' ' || k === 'tab') e.preventDefault();
  if (e.repeat && !k.startsWith('arrow') && !'wasd'.includes(k)) return;
  if (k === 'escape') {
    if (pendingBuild) { cancelPlacement(); setStatus(''); } else if (selectedBuilding || selectedUnits().length) clearSelection();
    else $('btn-pause').click();
  } else if (k === 'p') $('btn-pause').click();
  else if (k === ' ' || k === 'home') focusHq();
  else if (k === '+' || k === '=') zoomButton(1.4);
  else if (k === '-' || k === '_') zoomButton(1 / 1.4);
  else if (k === 'tab') { if (!$('btn-switch').classList.contains('hidden')) $('btn-switch').click(); }
  else if (PANEL_KEYS.has(k)) {
    renderPanel(); // bring the panel up to date first, so the key matches what's about to show
    panel.querySelector(`button[data-key="${k}"]:not(:disabled)`)?.click();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

function zoomButton(factor) { zoomAt(factor, viewW / 2, viewH / 2); }
$('btn-zoom-in').addEventListener('click', () => zoomButton(1.4));
$('btn-zoom-out').addEventListener('click', () => zoomButton(1 / 1.4));

// A reminder of the mouse controls, under the build menu on a PC.
const CONTROLS_TIP = `<div class="controls-tip"><b>Drag</b> a box to select · <b>Right-click</b> to move or attack ·
  <kbd>WASD</kbd> pan · <b>Wheel</b> zoom · <kbd>Space</kbd> your HQ · <kbd>Esc</kbd> deselect, then pause</div>`;

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
  const afford = BUILD_MENU.map((t) => +(money >= BUILDING_TYPES[t].cost) + (Math.ceil(game.lockedFor(t)) || '')).join('')
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
    const tip = pendingBuild === 'bridge' ? `${finePointer.matches ? 'Press where one end goes and drag to the other. Right-click or Esc cancels.' : 'Tap where one end goes, then tap or drag to the other, then press Place.'} Ends snap to the ground, platform edges and other bridges. Drag across to lie it level, or up to ${RAMP_MAX_ANGLE}° steep; 💰${BUILDING_TYPES.bridge.cost} per tile of length. Units only take a slope when you send them somewhere up or down it.`
        : game.field ? "Can't overlap another building." : 'Must sit on solid ground or a platform.';
    const zoneTip = ' Build inside the green zone near your base.';
    panel.innerHTML = `
      <div class="panel-head"><div class="panel-title">${iconOf(pendingBuild)} Place ${nameOf(pendingBuild)}</div>
        <div class="panel-sub">💰 ${d.cost}${pendingBuild === 'bridge' ? ' per tile' : ` · ${d.buildTime}s`}</div></div>
      <div class="hint">${pendingBuild === 'bridge' ? '' : finePointer.matches ? 'Point at the battlefield and click to build. Right-click or Esc cancels. ' : 'Tap the battlefield to position it, then tap the same spot again or press Place. '}${tip}${zoneTip}</div>
      <div class="row" style="margin-top:auto">
        <button class="act-btn" data-act="cancel">Cancel<kbd class="key">Esc</kbd></button>
        <button class="act-btn primary" data-act="place" data-key="enter" ${ghost?.valid ? '' : 'disabled'}>Place<kbd class="key">Enter</kbd></button>
      </div>`;
    return;
  }

  if (mode === 'building') {
    const name = nameOf(b.type);
    const hp = `${Math.ceil(b.hp)}/${b.maxHp} HP`;
    let body = '';
    if (b.constructing) {
      body = `<div class="hint">Under construction…</div><div class="progress"><div style="width:${b.progress * 100}%;background:var(--accent)"></div></div>`;
    } else if (b.canTrain.length) {
      const counts = {};
      for (const t of b.queue) counts[t] = (counts[t] || 0) + 1;
      if (b.trainCurrent) counts[b.trainCurrent] = (counts[b.trainCurrent] || 0) + 1;
      body = `<div class="grid ${b.canTrain.length <= 3 ? 'cols-3' : ''}">${b.canTrain.map((t, i) => {
        const u = UNIT_TYPES[t];
        return `<button class="tile-btn" data-train="${t}" data-key="${i + 1}" ${money >= u.cost ? '' : 'disabled'}>
          <kbd class="key">${i + 1}</kbd>${counts[t] ? `<span class="badge">${counts[t]}</span>` : ''}
          <span class="ic">${iconOf(t)}</span><span class="nm">${nameOf(t)}</span>
          <span class="ct">💰${u.cost} · ${u.trainTime}s</span></button>`;
      }).join('')}</div>
      <div class="progress"><div style="width:${b.trainCurrent ? (1 - b.trainTimer / b.trainTotal) * 100 : 0}%"></div></div>
      <div class="hint">${b.trainCurrent ? `Training ${nameOf(b.trainCurrent)}${b.queue.length ? ` · ${b.queue.length} queued` : ''}` : `${tap(true)} a unit to queue it.`}</div>`;
    } else {
      const info = {
        hq: `Command centre. Earns +${BUILDING_TYPES.hq.income}/s. Lose it and you lose.`,
        mine: `Earns +${BUILDING_TYPES.mine.income}/s once built.`,
        turret: 'Fires at enemy units in range, and at aircraft from much further away.',
        sam: 'Launches guided missiles at enemy aircraft from long range. Ignores ground units.',
        wall: 'Blocks enemy units. Your troops walk through.',
        bridge: 'Walkable span, level or sloped. Units take a slope when sent somewhere up or down it.',
      }[b.type] || '';
      body = `<div class="hint">${info}</div>`;
    }
    panel.innerHTML = `
      <div class="panel-head"><div class="panel-title">${iconOf(b.type) || '🏰'} ${name}</div>
        <div class="panel-sub">${hp}</div>
        <button class="small-btn" data-act="deselect">✕</button></div>
      ${body}
      ${b.type === 'hq' ? '' : `<div class="row" style="margin-top:auto">
        <button class="act-btn ${armed ? 'primary' : 'danger'}" data-act="sell" data-key="x">${armed ? `${tap(true)} again to sell for 💰${refund}` : `💲 Sell · 💰${refund}`}<kbd class="key">X</kbd></button>
      </div>`}`;
    return;
  }

  // No bridges on the isometric field: there's nothing to climb.
  // Locked buildings (the airbase, early on) count down to when they open.
  const buildGrid = `<div class="grid">${BUILD_MENU.filter((t) => !(game.field && BUILDING_TYPES[t].isRamp)).map((t, i) => {
    const d = BUILDING_TYPES[t];
    const wait = game.lockedFor(t);
    return `<button class="tile-btn${wait ? ' locked' : ''}" data-build="${t}" data-key="${i + 1}" ${money >= d.cost && !wait ? '' : 'disabled'}>
      <kbd class="key">${i + 1}</kbd><span class="ic">${iconOf(t)}</span><span class="nm">${nameOf(t)}</span><span class="ct">${wait ? `🔒 ${clock(Math.ceil(wait))}` : `💰${d.cost}`}</span></button>`;
  }).join('')}</div>`;

  if (mode === 'units') {
    const counts = {};
    for (const u of sel) counts[u.type] = (counts[u.type] || 0) + 1;
    const summary = Object.entries(counts).map(([t, n]) => `${iconOf(t)}×${n}`).join('  ');
    panel.innerHTML = `
      <div class="panel-head"><div class="panel-title">${sel.length} selected <span class="panel-sub">${summary}</span></div>
        <button class="small-btn" data-act="deselect">✕</button></div>
      <div class="hint">${finePointer.matches ? 'Right-click' : 'Tap'} ground to move (they fight on the way) · ${finePointer.matches ? 'right-click' : 'tap'} an enemy to attack${counts.engineer ? ` · ${finePointer.matches ? 'right-click' : 'tap'} a damaged building or vehicle to repair` : ''}</div>
      <div class="row">
        <button class="act-btn" data-act="stop" data-key="h">✋ Hold<kbd class="key">H</kbd></button>
        <button class="act-btn" data-act="charge" data-key="c">⚔️ Charge<kbd class="key">C</kbd></button>
        <button class="act-btn" data-act="retreat" data-key="r">🏠 Retreat<kbd class="key">R</kbd></button>
      </div>
      <div class="row">
        <button class="act-btn" data-act="all" data-key="q">🎖️ All units<kbd class="key">Q</kbd></button>
        <button class="act-btn" data-act="find" data-key="f">📍 Find<kbd class="key">F</kbd></button>
      </div>`;
    return;
  }

  panel.innerHTML = `<div class="panel-head"><div class="panel-title">Build</div><div class="panel-sub">${tap(true)} one, then the map</div><button class="small-btn" data-act="all" data-key="q">🎖️ All units<kbd class="key">Q</kbd></button></div>${buildGrid}${finePointer.matches ? CONTROLS_TIP : ''}`;
}

panel.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || !game || paused) return;
  const p = game.players[active];
  if (btn.dataset.build) {
    const t = btn.dataset.build;
    if (game.lockedFor(t)) { toast(`${nameOf(t)} unlocks at ${clock(BUILDING_TYPES[t].unlockAt)}`); return; }
    if (p.money < BUILDING_TYPES[t].cost) return;
    clearSelection();
    pendingBuild = t;
    ghost = null;
    hoverReason = '';
    setStatus(`${tap(true)} to place ${nameOf(t)}`);
  } else if (btn.dataset.train) {
    const t = btn.dataset.train;
    if (selectedBuilding && p.money >= UNIT_TYPES[t].cost) {
      const err = issue({ c: 'train', id: selectedBuilding.id, type: t });
      if (!err) toast(`${nameOf(t)} queued`, 'info');
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
          const name = nameOf(b.type);
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
  const colour = PLAYER_NAMES[active].toUpperCase();
  const side = sideShort(active)?.toUpperCase();
  chip.textContent = online() ? `YOU · ${side || colour}`
    : game.humanCount > 1 ? (side ? `${colour} · ${side}` : colour) : side ? `YOU · ${side}` : 'YOU';
  chip.style.background = `rgba(${col},0.25)`;
  chip.style.color = `rgb(${col})`;
  if (!pendingBuild && statusText && !NET_STATUS.includes(statusText)) setStatus('');
}

// ── Game lifecycle ─────────────────────────────────────────────────────────
function showOverlay(id) {
  for (const o of OVERLAYS) $(o).classList.toggle('hidden', o !== id);
  if (['overlay-title', 'overlay-gametype', 'overlay-sides', 'overlay-online'].includes(id)) audio.playMusic('title');
  audio.duckMusic(id === 'overlay-pause' || (id === 'overlay-settings' && settingsFrom === 'overlay-pause'));
  showSettings();
}

// opts: { mode } replaces MODES[key] (online games), { mirror } makes a
// guest's snapshot-driven copy, { you } is the faction this device controls.
function startGame(key, opts = {}) {
  modeKey = key;
  // Isometric games are played on the square field. Online, the host's
  // choice goes out with the mode, so everyone plays the same map.
  const mode = opts.mode || withGameType({ ...MODES[key], field: viewChoice() === 'iso' });
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
  // Sides come from the side picker (offline) or the host's lobby (online).
  setFactionSides(opts.sides || mode.sides || null);
  setViewer(active);
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
  audio.playMusic('battle');
  paused = false;
  iso = !!mode.field;
  document.body.classList.toggle('iso', iso);
  resize();
  cam.zoom = fitScale();
  clampCam();
  focusHq();
}

function focusHq() {
  const hq = game.players[active].hq;
  if (!hq) return;
  // Look out from the HQ toward the middle of the map.
  if (iso) {
    const [x, z] = game.fieldExit(hq, 120);
    centreOn(x, null, z);
    return;
  }
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
    let text = won ? `${wonIn()}${quip(active, 'win')}`
      : winner >= 0 ? `${net.names[winner] || PLAYER_NAMES[winner]} (${sideShort(winner) || PLAYER_NAMES[winner]}) ${game.ctf ? 'captured a flag' : 'won the battle'}.${quip(active, 'lose')}` : 'Nobody survived.';
    if (net.role === 'host') again.textContent = 'Back to lobby';
    else {
      text += ' Waiting for the host…';
      again.classList.add('hidden');
    }
    sub.textContent = text;
  } else if (game.humanCount > 1) {
    label.textContent = winner >= 0 ? `${PLAYER_NAMES[winner].toUpperCase()} WINS` : 'DRAW';
    label.style.color = winner >= 0 ? `rgb(${PLAYER_COLORS[winner].map((v) => v * 255).join(',')})` : '#fff';
    sub.textContent = sideShort(winner) && winner >= 0 ? `${sideInfo(winner).name} take${sideInfo(winner).plural ? '' : 's'} the field.${quip(winner, 'win')}` : game.ctf ? 'The flag is home.' : 'Every rival HQ has fallen.';
  } else if (winner === 0) {
    label.textContent = 'VICTORY';
    label.style.color = 'var(--good)';
    sub.textContent = `${wonIn()}${quip(0, 'win')}`;
  } else {
    label.textContent = 'DEFEAT';
    label.style.color = 'var(--danger)';
    sub.textContent = `${game.ctf ? `${PLAYER_NAMES[winner] || 'The enemy'} captured a flag.` : 'Your HQ was destroyed.'}${quip(0, 'lose')}`;
  }
  // Hot-seat games always end with a winner among the players at the table.
  const humanWon = online() || game.humanCount < 2 ? winner === active : winner >= 0 && !game.players[winner].isAi;
  audio.playMusic(humanWon ? 'victory' : 'defeat');
  showOverlay('overlay-gameover');
}

const wonIn = () => `${game.ctf ? 'Flag captured' : 'Battle won'} in ${formatTime(game.time)}.`;

// A side's victory or defeat one-liner, with a leading space (or nothing).
function quip(f, kind) {
  const q = themeSides() ? sideInfo(f)?.[kind] : null;
  return q ? ` ${q}` : '';
}

function formatTime(s) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

function buildModeButtons() {
  const wrap = $('mode-buttons');
  wrap.innerHTML = Object.entries(MODES).map(([k, m]) => `<button class="menu-btn" data-mode="${k}">${m.label}</button>`).join('');
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    chooseGameType(b.dataset.mode);
  });
}

// ── Battle or Capture the Flag ─────────────────────────────────────────────
// Asked after picking a mode. Online, the host's choice is the room's (and
// can be changed from the lobby). The last choice is kept for Restart.
const TYPE_KEY = 'slop-gametype';
let gameType = (() => { try { return localStorage.getItem(TYPE_KEY) === 'ctf' ? 'ctf' : 'battle'; } catch { return 'battle'; } })();
let typeFor = null; // the mode key waiting on the choice
const TYPE_NAMES = { battle: 'Battle', ctf: 'Capture the Flag' };

function setGameType(t) {
  gameType = t === 'ctf' ? 'ctf' : 'battle';
  try { localStorage.setItem(TYPE_KEY, gameType); } catch { /* storage unavailable */ }
}

// A mode set up for the chosen game type.
function withGameType(mode) {
  if (gameType !== 'ctf') return mode;
  return { ...mode, ctf: true, label: `${mode.label} 🚩` };
}

function chooseGameType(key) {
  typeFor = key;
  $('gametype-mode').textContent = MODES[key].label;
  for (const b of $('gametype-buttons').querySelectorAll('[data-type]')) b.classList.toggle('secondary', b.dataset.type !== gameType);
  showOverlay('overlay-gametype');
}
$('gametype-buttons').addEventListener('click', (e) => {
  const b = e.target.closest('[data-type]');
  if (!b || !typeFor) return;
  setGameType(b.dataset.type);
  const key = typeFor;
  typeFor = null;
  if (MODES[key].online) openLobby();
  else chooseSides(key);
});
$('btn-type-back').addEventListener('click', () => { typeFor = null; showOverlay('overlay-title'); });

// ── Choosing sides ─────────────────────────────────────────────────────────
// In themes with sides, each human picks one before an offline battle (in
// turn, for local multiplayer); CPUs take whichever sides are left. The last
// pick per theme is remembered and Restart keeps the same sides.
const SIDES_KEY = 'slop-sides';
function rememberedSide(themeId) {
  try { return JSON.parse(localStorage.getItem(SIDES_KEY) || '{}')[themeId]; } catch { return undefined; }
}
function rememberSide(themeId, side) {
  try {
    const all = JSON.parse(localStorage.getItem(SIDES_KEY) || '{}');
    all[themeId] = side;
    localStorage.setItem(SIDES_KEY, JSON.stringify(all));
  } catch { /* storage unavailable */ }
}
const colourOf = (f) => `rgb(${PLAYER_COLORS[f].map((v) => Math.round(v * 255)).join(',')})`;

let lastSides = null; // the sides of the last offline game, reused by Restart
let pickSide = null;  // callback for the side picker that's showing
function chooseSides(key) {
  const sides = themeSides();
  const mode = MODES[key];
  if (!sides) { lastSides = null; startGame(key); return; }
  const humans = mode.players.map((p, f) => (p[1] ? -1 : f)).filter((f) => f >= 0);
  const picks = [];
  let step = 0;
  const ask = () => {
    if (step < humans.length) {
      const f = humans[step];
      showSidePicker(f, humans.length > 1, picks.filter(Boolean), (id) => { picks[f] = id; step++; ask(); });
      return;
    }
    // CPUs take the sides nobody picked first, then share them round.
    const taken = new Set(picks.filter(Boolean));
    const order = [...sides.filter((s) => !taken.has(s.id)), ...sides].map((s) => s.id);
    let k = 0;
    lastSides = mode.players.map((p, f) => picks[f] || order[k++ % order.length]);
    startGame(key, { sides: lastSides });
  };
  ask();
}

// f: the faction choosing (its colour tints the previews); taken: sides other
// players already picked, so a second player is steered to a different one.
function showSidePicker(f, multi, taken, done) {
  const th = currentTheme();
  const sides = themeSides();
  const remembered = !multi || f === 0 ? rememberedSide(th.id) : null;
  const suggest = remembered && sides.some((s) => s.id === remembered) ? remembered
    : (sides.find((s) => !taken.includes(s.id)) || sides[0]).id;
  $('sides-who').innerHTML = multi
    ? `<span style="color:${colourOf(f)}">${PLAYER_NAMES[f]} player</span>: pick your side`
    : `${esc(th.name)}: whose side are you on?`;
  $('side-cards').classList.toggle('many', sides.length > 4);
  $('side-cards').innerHTML = sides.map((s) => `<button class="side-card${s.id === suggest ? ' suggested' : ''}" data-side="${s.id}" style="--team:${colourOf(f)}">
      <span class="side-icons">${(s.preview || ['soldier', 'heavy', 'tank', 'helicopter']).map((t) => `<img src="${sideIcon(s.id, t, f)}" alt="">`).join('')}</span>
      <span class="side-name">${esc(s.name)}</span>
      <span class="side-blurb">${esc(s.blurb || '')}</span>
    </button>`).join('');
  pickSide = (id) => {
    if (!multi || f === 0) rememberSide(th.id, id);
    pickSide = null;
    done(id);
  };
  showOverlay('overlay-sides');
}
$('side-cards').addEventListener('click', (e) => {
  const b = e.target.closest('[data-side]');
  if (b && pickSide) pickSide(b.dataset.side);
});
$('btn-side-random').addEventListener('click', () => {
  const sides = themeSides();
  if (pickSide && sides) pickSide(sides[Math.floor(Math.random() * sides.length)].id);
});
$('btn-sides-back').addEventListener('click', () => { pickSide = null; showOverlay('overlay-title'); });

// ── Online lobby & session ─────────────────────────────────────────────────
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const NAME_KEY = 'slop-name';

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
  // The page reloaded mid-battle (iOS does this to background apps): offer the way back in.
  const saved = savedSession();
  $('btn-rejoin').classList.toggle('hidden', !saved);
  if (saved) $('btn-rejoin').textContent = `Rejoin game ${saved.code}`;
}

// Seats that will play, in seat order. Their position is their faction.
const seated = (slots) => slots.map((sl, i) => ({ ...sl, slot: i })).filter((sl) => ['host', 'human', 'cpu'].includes(sl.kind));

function renderLobby() {
  $('room-code').textContent = net.code;
  const isHost = net.role === 'host';
  if (isHost) ensureSides();
  const sides = themeSides();
  const sideList = !sides ? '' : sides.length > 4 ? ` · ${sides.length} sides` : ` · ${sides.map((x) => esc(x.short)).join(' vs ')}`;
  const view = (isHost ? viewChoice() : net.hostView) === 'iso' ? 'Isometric' : '2D';
  $('lobby-war').innerHTML = `War: <b>${esc(currentTheme().name)}</b>${sideList} · ${view}`;
  $('btn-lobby-theme').classList.toggle('hidden', !isHost);
  const type = isHost ? gameType : net.hostType || 'battle';
  $('lobby-type').innerHTML = `Game: <b>${type === 'ctf' ? '🚩 ' : '⚔️ '}${TYPE_NAMES[type]}</b>`;
  $('btn-lobby-type').classList.toggle('hidden', !isHost);
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
    let side = '';
    const info = sides && sl.side ? sides.find((x) => x.id === sl.side) : null;
    if (info) {
      const mine = i === net.mySlot || (isHost && sl.kind === 'cpu');
      side = mine ? `<button class="small-btn slot-btn side-btn" data-side-slot="${i}" aria-label="Change side">${esc(info.short)} ▸</button>`
        : `<span class="slot-tag side">${esc(info.short)}</span>`;
    }
    const empty = sl.kind === 'open' || sl.kind === 'closed' ? ' empty' : '';
    return `<li class="slot${empty}"><span class="swatch" style="background:${col}"></span><span class="slot-name">${name}</span>${tag}${side}${btn}</li>`;
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
    $('lobby-status').textContent = me?.ready ? 'Waiting for the host to start…' : `${tap(true)} Ready when you're set.`;
  }
}

$('lobby-slots').addEventListener('click', (e) => {
  const sideBtn = e.target.closest('[data-side-slot]');
  if (sideBtn && net.phase === 'lobby') { cycleSide(+sideBtn.dataset.sideSlot); return; }
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

// Tap your side (or, as host, a CPU's side) to move to the next one.
function cycleSide(i) {
  const sides = themeSides();
  const sl = net.slots[i];
  if (!sides || !sl) return;
  const ids = sides.map((x) => x.id);
  const next = ids[(ids.indexOf(sl.side) + 1) % ids.length];
  if (i === net.mySlot) rememberSide(currentTheme().id, next);
  if (net.role === 'host') { sl.side = next; syncLobby(); } else net.host?.send({ t: 'side', side: next });
}

// The host picks the war for the whole room; everyone's side resets to suit.
$('btn-lobby-theme').addEventListener('click', () => {
  if (net.role !== 'host' || net.phase !== 'lobby') return;
  const i = THEMES.indexOf(currentTheme());
  applyTheme(THEMES[(i + 1) % THEMES.length].id);
  for (const sl of net.slots) delete sl.side;
  syncLobby();
  renderLobby();
});

// The host switches the room between Battle and Capture the Flag.
$('btn-lobby-type').addEventListener('click', () => {
  if (net.role !== 'host' || net.phase !== 'lobby') return;
  setGameType(gameType === 'ctf' ? 'battle' : 'ctf');
  syncLobby();
  renderLobby();
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
        slots: [{ kind: 'host', name }, { kind: 'open' }, { kind: 'open' }, { kind: 'open' }, { kind: 'open' }],
      });
      lobbyView('lobby');
      return;
    } catch (e) {
      if (attempt === 2 || !/taken/.test(e.message)) { lobbyView('wait', e.message); return; }
    }
  }
}

function broadcast(msg) { for (const p of net.peers) p.transport.send(msg); }

// The host's theme is the room's war; every seated player has a side in it.
// Seats without a valid side get whichever side has the fewest players.
function ensureSides() {
  const sides = themeSides();
  const seatedKinds = ['host', 'human', 'cpu'];
  for (const sl of net.slots) if (!sides || !seatedKinds.includes(sl.kind)) delete sl.side;
  if (!sides) return;
  const ids = sides.map((x) => x.id);
  const count = (id) => net.slots.filter((o) => o.side === id).length;
  net.slots.forEach((sl, i) => {
    if (!seatedKinds.includes(sl.kind) || ids.includes(sl.side)) return;
    const mine = i === 0 ? rememberedSide(currentTheme().id) : null;
    sl.side = ids.includes(mine) ? mine : ids.reduce((best, id) => (count(id) < count(best) ? id : best), ids[0]);
  });
}

function syncLobby() {
  if (net.phase !== 'lobby') return; // mid-battle seat changes show up back in the lobby
  ensureSides();
  const slots = net.slots.map(({ kind, name, ready, side }) => ({ kind, name, ready, side }));
  for (const p of net.peers) {
    if (p.slot >= 0) p.transport.send({ t: 'lobby', theme: currentTheme().id, view: viewChoice(), type: gameType, slots, you: p.slot });
  }
  if (!$('online-lobby').classList.contains('hidden')) renderLobby();
}

function canStart() {
  const players = seated(net.slots);
  return players.length >= 2 && players.every((sl) => sl.kind !== 'human' || sl.ready);
}

function onGuestConnected(transport) {
  if (net.role !== 'host') { transport.close(); return; }
  const peer = { transport, slot: -1, faction: -1, name: 'Player', pingMs: null, token: null, lastSeen: performance.now(), mapVersion: -1 };
  net.peers.push(peer);
  transport.on('message', (m) => { peer.lastSeen = performance.now(); onPeerMessage(peer, m); });
  transport.on('close', () => dropPeer(peer));
}

// Turn a guest away with a reason, then hang up.
function refuse(peer, msg) {
  peer.transport.send({ t: 'error', msg });
  setTimeout(() => dropPeer(peer, true), 300);
}

// Tell everyone (host included) something happened.
function announce(text) {
  toast(text, 'info');
  broadcast({ t: 'msg', text });
}

const makeToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

function onPeerMessage(peer, m) {
  switch (m.t) {
    case 'hello': {
      if (m.v !== VERSION) {
        refuse(peer, `The host is on ${VERSION} but you're on ${m.v}. Close and reopen the app to update, then try again.`);
        break;
      }
      // Coming back after a dropped connection: hand them their army again.
      if (m.rejoin && net.phase === 'game' && game && !game.over) {
        const seat = net.away.find((a) => a.token === m.rejoin) || net.peers.find((p) => p !== peer && p.token === m.rejoin);
        if (seat) { rejoin(peer, seat); break; }
      }
      if (net.phase !== 'lobby') { refuse(peer, 'That game has already started. Ask the host to go back to the lobby.'); break; }
      const slot = net.slots.findIndex((sl) => sl.kind === 'open');
      if (slot < 0) { refuse(peer, 'That room is full.'); break; }
      peer.slot = slot;
      peer.name = String(m.name || 'Player').slice(0, 12);
      peer.token = makeToken();
      peer.transport.send({ t: 'welcome', token: peer.token });
      net.slots[slot] = { kind: 'human', name: peer.name, ready: false };
      syncLobby();
      toast(`${peer.name} joined`, 'info');
      break;
    }
    case 'side':
      if (net.phase === 'lobby' && peer.slot >= 0 && themeSides()?.some((x) => x.id === m.side)) {
        net.slots[peer.slot].side = m.side;
        syncLobby();
      }
      break;
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
    case 'bye': dropPeer(peer, true); break;
    default: break;
  }
}

// seat: an `away` record, or a peer whose old link hasn't timed out yet.
function rejoin(peer, seat) {
  if (net.peers.includes(seat)) {
    net.peers = net.peers.filter((p) => p !== seat);
    seat.transport.close();
  } else net.away = net.away.filter((a) => a !== seat);
  Object.assign(peer, { token: seat.token, name: seat.name, slot: seat.slot, faction: seat.faction, mapVersion: -1 });
  const p = game.players[peer.faction];
  if (p.alive) p.isAi = false;
  peer.transport.send({ t: 'welcome', token: peer.token });
  peer.transport.send({ t: 'start', mode: game.mode, you: peer.faction, names: net.names, rejoin: true });
  if (seat.since) announce(`${peer.name} reconnected`);
}

function cpuTakeover(faction, text) {
  const p = game.players[faction];
  if (!p?.alive) return;
  p.isAi = true;
  announce(text);
  game.checkGameOver();
}

// A guest's connection ended. left: they chose to go (or were removed).
// Mid-battle, someone who just dropped keeps their seat so they can
// reconnect; anyone who left is replaced by the CPU straight away.
function dropPeer(peer, left = false) {
  if (!net.peers.includes(peer)) return;
  net.peers = net.peers.filter((p) => p !== peer);
  peer.transport.close();
  if (net.phase === 'game' && game && !game.over && peer.faction >= 0) {
    if (left) {
      net.slots[peer.slot] = { kind: 'open' };
      cpuTakeover(peer.faction, `${peer.name} left — the CPU takes over ${PLAYER_NAMES[peer.faction]}`);
    } else {
      net.away.push({ token: peer.token, name: peer.name, slot: peer.slot, faction: peer.faction, since: performance.now() });
      announce(`${peer.name} lost connection — reconnecting…`);
    }
    return;
  }
  if (peer.slot >= 0) {
    net.slots[peer.slot] = { kind: 'open' };
    syncLobby();
  }
}

function startOnlineGame() {
  if (!canStart()) return;
  const players = seated(net.slots);
  const layout = ONLINE_LAYOUTS[players.length];
  const mode = withGameType({
    label: layout.label, wrap: layout.wrap, online: true, field: viewChoice() === 'iso',
    players: players.map((sl, i) => [layout.hqs[i], sl.kind === 'cpu']),
    theme: currentTheme().id,
    sides: themeSides() ? players.map((sl) => sl.side) : undefined,
  });
  net.names = players.map((sl) => (sl.kind === 'cpu' ? 'CPU' : sl.name));
  for (const p of net.peers) Object.assign(p, { faction: players.findIndex((sl) => sl.slot === p.slot), mapVersion: -1 });
  Object.assign(net, { phase: 'game', snapTimer: 0, away: [] });
  startGame('online', { mode, you: 0 });
  for (const p of net.peers) p.transport.send({ t: 'start', mode, you: p.faction, names: net.names });
}

// One update to every guest. A guest whose link is backed up misses this one
// rather than queueing more behind it; anyone missing the terrain gets it.
function sendSnapshots() {
  const snap = encodeSnapshot(game);
  let map = null;
  for (const p of net.peers) {
    if (p.faction < 0 || (p.transport.buffered?.() ?? 0) > SLOW_LINK) continue;
    if (p.mapVersion !== game.map.version) {
      map ??= encodeMap(game);
      p.transport.send({ ...snap, map });
      p.mapVersion = game.map.version;
    } else p.transport.send(snap);
  }
}

function backToLobby() {
  net.phase = 'lobby';
  for (const a of net.away) net.slots[a.slot] = { kind: 'open' };
  net.away = [];
  for (const sl of net.slots) if (sl.kind === 'human') sl.ready = false;
  for (const p of net.peers) p.faction = -1;
  game = null;
  paused = true;
  showOverlay('overlay-online');
  lobbyView('lobby');
  syncLobby();
}

// ── Guest side ──
function savedSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return s && Date.now() - s.at < 15 * 60 * 1000 ? s : null;
  } catch { return null; }
}
function saveSession(clear = false) {
  try {
    if (clear) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify({ code: net.code, token: net.token, at: Date.now() }));
  } catch { /* storage unavailable */ }
}

function attachHost(transport) {
  Object.assign(net, { role: 'guest', host: transport, lastHostMsg: performance.now() });
  transport.on('message', (m) => {
    if (net.host !== transport) return;
    net.lastHostMsg = performance.now();
    onHostMessage(m);
  });
  transport.on('close', () => { if (net.host === transport) onHostLost(); });
}

// rejoinToken: reclaim a seat in a game already under way (after a reload).
async function joinOnline(rejoinToken = null) {
  const code = $('join-code').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) { lobbyView('home'); $('join-code').focus(); return; }
  const name = playerName();
  Object.assign(net, { code, myName: name, token: rejoinToken });
  lobbyView('wait', `Connecting to room ${code}…`);
  try {
    const transport = await joinRoom(code);
    net.phase = 'lobby';
    attachHost(transport);
    transport.send({ t: 'hello', v: VERSION, name, rejoin: rejoinToken || undefined });
    lobbyView('wait', rejoinToken ? 'Connected — rejoining…' : 'Connected — joining the lobby…');
  } catch (e) {
    lobbyView('wait', e.message);
  }
}

function onHostMessage(m) {
  switch (m.t) {
    case 'welcome':
      net.token = m.token;
      saveSession();
      break;
    case 'lobby': {
      if (m.theme) useRoomTheme(m.theme);
      const fromGame = net.phase !== 'lobby' || $('online-lobby').classList.contains('hidden');
      Object.assign(net, { slots: m.slots, mySlot: m.you, hostView: m.view, hostType: m.type, phase: 'lobby', reconnecting: false });
      if (fromGame) {
        game = null;
        paused = true;
        showOverlay('overlay-online');
        lobbyView('lobby');
      } else renderLobby();
      break;
    }
    case 'start': {
      // Back after a dropped connection: carry on from the same view.
      const keep = m.rejoin && game?.mirror && !game.over ? { x: cam.x, y: cam.y, zoom: cam.zoom } : null;
      net.phase = 'game';
      net.reconnecting = false;
      net.names = m.names || [];
      if (m.mode?.theme) useRoomTheme(m.mode.theme);
      startGame('online', { mode: m.mode, mirror: true, you: m.you });
      if (keep) { Object.assign(cam, keep); clampCam(); }
      if (m.rejoin) { setStatus(''); toast('Reconnected', 'info'); }
      break;
    }
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
      hostGone(m.msg);
      break;
    case 'ping': net.host.send({ t: 'pong', at: m.at }); break;
    case 'pong': net.pingMs = Math.round(performance.now() - m.at); break;
    case 'bye': hostGone(net.phase === 'game' && game && !game.over ? 'The host left the game.' : 'The host closed the room.'); break;
    default: break;
  }
}

// The link to the host dropped without a goodbye. Mid-battle, try to get
// back in; otherwise there's nothing to rejoin.
function onHostLost() {
  if (net.role !== 'guest') return;
  if (net.phase === 'game' && game && !game.over && net.token) reconnect();
  else hostGone('The connection to the host was lost.');
}

async function reconnect() {
  if (net.reconnecting) return;
  net.reconnecting = true;
  const old = net.host;
  net.host = null;
  old?.close();
  setStatus(RECONNECTING);
  const until = performance.now() + REJOIN_WINDOW;
  let wait = 2000;
  while (net.role === 'guest' && net.reconnecting && performance.now() < until) {
    try {
      const transport = await joinRoom(net.code);
      if (net.role !== 'guest' || !net.reconnecting) { transport.close(); return; }
      attachHost(transport);
      transport.send({ t: 'hello', v: VERSION, name: net.myName, rejoin: net.token });
      return; // the host's 'start' completes it
    } catch {
      // Back off: every attempt is a request to the matchmaking server.
      await new Promise((r) => setTimeout(r, wait));
      wait = Math.min(wait * 2, 10000);
    }
  }
  if (net.role === 'guest' && net.reconnecting) hostGone("Couldn't reconnect to the host.");
}

// The session is over for this guest: say why.
function hostGone(text) {
  const inGame = net.phase === 'game' && game && !game.over;
  saveSession(true);
  leaveOnline(false);
  if (!inGame) {
    showOverlay('overlay-online');
    lobbyView('wait', text);
    return;
  }
  setStatus('');
  paused = true;
  game.over = true;
  $('result-label').textContent = 'DISCONNECTED';
  $('result-label').style.color = 'var(--dim)';
  $('result-sub').textContent = text;
  $('btn-again').classList.add('hidden');
  showOverlay('overlay-gameover');
}

function resetNet() {
  net.room?.cancel?.();
  Object.assign(net, {
    role: null, host: null, room: null, peers: [], slots: [], away: [], phase: 'lobby',
    pingMs: null, route: null, reconnecting: false, token: null,
  });
}

// sayBye: tell the other side we're going on purpose (so they don't wait for
// us to reconnect).
function leaveOnline(sayBye = true) {
  if (net.role === 'guest') applyTheme(savedTheme());
  const links = net.role === 'host' ? net.peers.map((p) => p.transport) : net.host ? [net.host] : [];
  if (net.role === 'guest' && sayBye) saveSession(true);
  for (const t of links) {
    if (sayBye) t.send({ t: 'bye' });
    setTimeout(() => t.close(), 100);
  }
  // Give the goodbyes a moment to go out before the host's room shuts.
  const room = net.room;
  net.room = null;
  if (room) setTimeout(() => room.cancel?.(), 200);
  resetNet();
}

// Connection watchdog, once a second. A phone that was in the background
// (timers frozen) gets a few seconds' grace instead of being written off.
let lastWatch = performance.now();
setInterval(() => {
  const now = performance.now();
  const resumed = now - lastWatch > 3000;
  lastWatch = now;
  if (net.role === 'host') {
    for (const p of [...net.peers]) {
      if (resumed) p.lastSeen = Math.max(p.lastSeen, now - LINK_TIMEOUT + 4000);
      else if (now - p.lastSeen > LINK_TIMEOUT) dropPeer(p);
    }
    if (net.phase === 'game' && game && !game.over) {
      for (const a of net.away) {
        if (a.cpu || now - a.since < AWAY_GRACE) continue;
        a.cpu = true;
        cpuTakeover(a.faction, `${a.name} hasn't reconnected — the CPU takes over ${PLAYER_NAMES[a.faction]} until they're back`);
      }
    }
  } else if (net.role === 'guest' && net.host && !net.reconnecting) {
    if (resumed) {
      net.lastHostMsg = Math.max(net.lastHostMsg, now - LINK_TIMEOUT + 3000);
      net.host.send({ t: 'ping', at: now });
    } else if (now - net.lastHostMsg > LINK_TIMEOUT) onHostLost();
  }
  keepAwake(online() && !!game && !game.over);
}, 1000);

// Stop the screen auto-locking mid-battle — locking drops the connection.
let wakeLock = null;
let wakePending = false;
async function keepAwake(on) {
  if (!('wakeLock' in navigator) || wakePending) return;
  try {
    wakePending = true;
    if (on && !wakeLock && !document.hidden) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      const l = wakeLock;
      wakeLock = null;
      await l.release();
    }
  } catch { /* not allowed right now */ } finally { wakePending = false; }
}

async function shareInvite() {
  const url = `${location.origin}${location.pathname}?join=${net.code}`;
  const text = `Join my Slop Wars game! Room code: ${net.code}`;
  try {
    if (navigator.share) await navigator.share({ title: 'Slop Wars', text, url });
    else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast('Invite link copied', 'info');
    }
  } catch { /* share sheet dismissed */ }
}

$('btn-host').addEventListener('click', hostOnline);
$('btn-join').addEventListener('click', () => joinOnline());
$('btn-rejoin').addEventListener('click', () => {
  const saved = savedSession();
  if (!saved) return;
  $('join-code').value = saved.code;
  joinOnline(saved.token);
});
$('join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinOnline(); });
$('btn-share').addEventListener('click', shareInvite);
$('btn-online-back').addEventListener('click', () => showOverlay('overlay-title'));
$('btn-online-cancel').addEventListener('click', () => { leaveOnline(); lobbyView('home'); });
$('btn-lobby-leave').addEventListener('click', () => { leaveOnline(); lobbyView('home'); });
$('btn-lobby-main').addEventListener('click', () => {
  if (net.role === 'host') startOnlineGame();
  else if (net.role === 'guest') net.host?.send({ t: 'ready', ready: !net.slots[net.mySlot]?.ready });
});

$('btn-pause').addEventListener('click', () => {
  if (!game || game.over) return;
  if (!online()) paused = true; // online games keep running
  showOverlay('overlay-pause');
});
$('btn-resume').addEventListener('click', () => { paused = false; showOverlay(null); });
$('btn-restart').addEventListener('click', () => startGame(modeKey, { sides: lastSides }));
$('btn-again').addEventListener('click', () => {
  if (net.role === 'host') backToLobby();
  else startGame(modeKey, { sides: lastSides });
});
$('btn-quit').addEventListener('click', () => { leaveOnline(); paused = true; showOverlay('overlay-title'); });
$('btn-menu').addEventListener('click', () => { leaveOnline(); showOverlay('overlay-title'); });
$('btn-switch').addEventListener('click', () => {
  if (!game || paused) return;
  clearSelection();
  cancelPlacement();
  do { active = (active + 1) % game.players.length; } while (!game.players[active].alive || game.players[active].isAi);
  setViewer(active);
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
  if (!online()) return;
  const now = performance.now();
  if (net.role === 'guest') {
    if (!net.host) return;
    net.host.send({ t: 'ping', at: now });
    const h = net.host;
    if (!net.route) connectionRoute(h).then((r) => { if (net.host === h) net.route = r; });
  } else {
    for (const p of net.peers) p.transport.send({ t: 'ping', at: now });
    const pings = net.peers.map((p) => p.pingMs).filter((v) => v != null);
    net.pingMs = pings.length ? Math.max(...pings) : null;
  }
  if (!game) return;
  $('mode-label').textContent = `${game.mode.label}${net.pingMs != null ? ` · ${net.pingMs} ms` : ''}${net.route ? ` · ${net.route}` : ''}`;
}, 2000);

// ── Main loop ──────────────────────────────────────────────────────────────
let last = performance.now();
let panelTimer = 0;

// Is something close enough to the view to be heard? Like onScreen, with a
// margin, for anything with a position (shells, wrecks, buildings).
function heard(e) {
  const v = view();
  const pad = 80 / cam.scale;
  const w = e.w || 0;
  if (!iso) return Math.abs(game.dx(v.x + v.w / 2, e.x + w / 2)) <= v.w / 2 + pad + w / 2;
  const z = (e.z || 0) + (e.d || 0) / 2;
  const X = projX(e.x + w / 2, z);
  const Y = projY(e.x + w / 2, e.y, z);
  return X >= v.x - pad && X <= v.x + v.w + pad && Y >= v.y - pad && Y <= v.y + v.h + pad;
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_DELTA);
  last = now;

  if (game) {
    if (!paused || online()) {
      game.update(dt);
      audio.listen(game, active, heard);
    }
    if (net.role === 'host' && net.phase === 'game' && !game.over) {
      net.snapTimer -= dt;
      if (net.snapTimer <= 0) {
        net.snapTimer = SNAPSHOT_INTERVAL;
        sendSnapshots();
      }
    }
    // Knocked out of a multiplayer game that's still going: keep watching.
    if (online() && !game.over && !eliminatedNoted && game.players[active] && !game.players[active].alive) {
      eliminatedNoted = true;
      toast('Your HQ fell — you can keep watching', 'info');
    }
    if (game.mirror && !game.over) {
      const stale = performance.now() - game.lastSnapshotAt > 2000;
      if (net.reconnecting) setStatus(RECONNECTING);
      else if (stale) setStatus(HOST_WAIT);
      else if (NET_STATUS.includes(statusText)) setStatus('');
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
    updateHoverGhost();

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
  // Device px per art px: a whole number, except at the fit zoom.
  const P = cam.scale === fitScale() ? cam.scale * dpr * G : Math.max(1, Math.round(cam.scale * dpr * G));
  const camAX = Math.floor(cam.x / G);
  const camAY = Math.floor(cam.y / G);
  const topA = iso ? camAY : Math.max(camAY, -SKY_PAD); // first art row in the buffer
  const bw = Math.ceil(canvas.width / P) + 2;
  const bh = Math.ceil(canvas.height / P) + 2 - (topA - camAY);
  if (low.width !== bw || low.height !== bh) { low.width = bw; low.height = bh; }
  lctx.imageSmoothingEnabled = false;
  const offX = Math.round((cam.x / G - camAX) * P);
  const offY = Math.round((cam.y / G - camAY) * P);

  const v = view();
  if (iso) drawIsoScene(dt, bw, bh, camAX, camAY, v);
  else drawFlatScene(dt, bw, bh, camAX, topA, v);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const top = (topA - camAY) * P - offY;
  if (top > 0) { ctx.fillStyle = skyTop(); ctx.fillRect(0, 0, canvas.width, top + 1); }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, bw, bh, -offX, top, bw * P, bh * P);

  if (gesture?.type === 'box') {
    const x = Math.round(Math.min(gesture.sx, gesture.lx) * dpr) + 0.5;
    const y = Math.round(Math.min(gesture.sy, gesture.ly) * dpr) + 0.5;
    const w = Math.round(Math.abs(gesture.lx - gesture.sx) * dpr);
    const h = Math.round(Math.abs(gesture.ly - gesture.sy) * dpr);
    ctx.fillStyle = 'rgba(0, 255, 102, 0.12)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = Math.max(1, Math.round(dpr));
    ctx.strokeRect(x, y, w, h);
  }

  mctx.setTransform(1, 0, 0, 1, 0, 0);
  const zones = pendingBuild ? game.buildZones(active) : null;
  if (iso) drawIsoMinimap(mctx, game, mini.width, mini.height, v, zones);
  else drawMinimap(mctx, game, mini.width, mini.height, v, minimapCache, zones);
}

function drawIsoScene(dt, bw, bh, camAX, camAY, v) {
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  drawIsoBackground(lctx, bw, bh, camAX, camAY);
  game.effects = updateEffects(game.effects, dt);
  lctx.setTransform(1, 0, 0, 1, -camAX, -camAY);
  drawIsoWorld(lctx, game, v);
  if (pendingBuild) drawIsoZones(lctx, game, game.buildZones(active), v);
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  drawWeather(lctx, bw, bh, camAX, camAY);
  markers = markers.filter((m) => (m.t -= dt) > 0);
  lctx.setTransform(1, 0, 0, 1, -camAX, -camAY);
  if (pendingBuild && ghost?.tz != null) drawIsoGhost(lctx, game, ghost);
  for (const m of markers) drawIsoMarker(lctx, game, m, drawMarker);
}

function drawFlatScene(dt, bw, bh, camAX, topA, v) {
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBackground(lctx, bw, bh, camAX, topA);
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
    drawStairs(lctx, game);
    const onScreen = (e) => e.x + (e.w || 30) > vv.x - 40 && e.x - 30 < vv.x + vv.w + 40;
    drawEffects(lctx, game.effects);
    for (const b of game.buildings) if (onScreen(b)) drawBuilding(lctx, b);
    for (const u of game.units) if (onScreen(u)) drawUnit(lctx, u);
    for (const f of game.flags) {
      const [x, y, , carried] = flagSpot(f);
      if (onScreen({ x })) drawFlag(lctx, f, x, y, carried);
    }
    for (const p of game.projectiles) drawProjectile(lctx, p);
  });
  if (pendingBuild) {
    let zones = game.buildZones(active);
    if (game.wrap) zones = [-1, 0, 1].flatMap((k) => zones.map(([a, b]) => [a + k * MAP_W, b + k * MAP_W]));
    lctx.setTransform(1, 0, 0, 1, -camAX, -topA);
    drawBuildZones(lctx, zones.sort((a, b) => a[0] - b[0]), v);
  }

  lctx.setTransform(1, 0, 0, 1, 0, 0);
  drawWeather(lctx, bw, bh, camAX, topA);

  markers = markers.filter((m) => (m.t -= dt) > 0);
  eachCopy(() => {
    if (pendingBuild && ghost) drawGhost(lctx, ghost);
    for (const m of markers) drawMarker(lctx, m);
  });
}

// ── Themes ─────────────────────────────────────────────────────────────────
// A look for the battlefield and menus, chosen on the title screen and kept
// on this device. Online, the host's theme is the room's war for everyone.
const THEME_KEY = 'slop-theme';
const TAGLINES = {
  classic: 'Build. Train. Conquer.',
  robots: 'Rise of the Robots. The machines are coming.',
  medieval: 'Raise your banners. Storm the castle.',
  gangster: 'Chicago, 1932. The custard flies at midnight.',
  warring: 'Seven kingdoms. Only one will rise.',
  steampunk: 'Steam rises over the Land of the Rising Sun.',
  winter: 'Minus forty. Perfect sauna weather.',
  cartel: 'Totally legitimate business. Ask the taco stand.',
  tariff: 'The other countries pay. Believe me.',
  civil: 'Brother against brother. Beard against beard.',
  ghost: 'I see dead people. Lots of them. In formation.',
  alien: 'They mostly come at night. Mostly. Ack ack!',
};
// persist: false when a guest is shown the host's war, so their own choice
// comes back when they leave the room.
function applyTheme(id, persist = true) {
  const t = setTheme(id);
  audio.setMusicTheme(t.id);
  document.body.dataset.theme = t.id;
  $('btn-theme').textContent = `Theme: ${t.name}`;
  $('tagline').textContent = TAGLINES[t.id] || TAGLINES.classic;
  const sides = themeSides(t);
  $('theme-sides').textContent = !sides ? '' : sides.length > 4 ? `⚔️ ${sides.length} sides: you pick one`
    : `⚔️ ${sides.map((x) => x.short).join(' vs ')}: you pick a side`;
  panelKey = '';
  if (persist) try { localStorage.setItem(THEME_KEY, t.id); } catch { /* storage unavailable */ }
}
function savedTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'classic'; } catch { return 'classic'; }
}
function useRoomTheme(id) {
  if (currentTheme().id !== id) applyTheme(id, false);
}
$('btn-theme').addEventListener('click', () => {
  const i = THEMES.indexOf(currentTheme());
  applyTheme(THEMES[(i + 1) % THEMES.length].id);
});
applyTheme(savedTheme());

// ── Settings ───────────────────────────────────────────────────────────────
// Opened from the title screen or the pause menu, and kept on this device:
// music, sound effects, and Preview features (new things still being tried
// out, which reveal their own switches). Browsers only allow sound after a
// tap or a key press, so the first one anywhere switches the sound on.
const SETTINGS = {
  music: () => audio.musicOn(),
  sfx: () => audio.sfxOn(),
  preview: () => preview,
  iso: () => isoPick,
};
function showSettings() {
  for (const b of document.querySelectorAll('[data-setting]')) {
    const on = SETTINGS[b.dataset.setting]();
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on);
    b.querySelector('b').textContent = on ? 'On' : 'Off';
  }
  $('preview-box').classList.toggle('hidden', !preview);
  // Mid-game the view can't change until the next one.
  $('iso-note').textContent = game && !game.over && settingsFrom === 'overlay-pause'
    ? 'Used from the next game you start.' : 'Used when the game starts. In multiplayer, the host\'s choice is used.';
}
function toggleMusic() {
  audio.setMusic(!audio.musicOn());
  showSettings();
}
function saveView() {
  try {
    localStorage.setItem(VIEW_KEY, isoPick ? 'iso' : 'flat');
    localStorage.setItem(PREVIEW_KEY, preview ? 'on' : 'off');
  } catch { /* storage unavailable */ }
}
$('overlay-settings').addEventListener('click', (e) => {
  const b = e.target.closest('[data-setting]');
  if (!b) return;
  const k = b.dataset.setting;
  if (k === 'music') audio.setMusic(!audio.musicOn());
  else if (k === 'sfx') audio.setSfx(!audio.sfxOn());
  else if (k === 'preview') { preview = !preview; saveView(); }
  else if (k === 'iso') { isoPick = !isoPick; saveView(); }
  showSettings();
});
for (const b of document.querySelectorAll('[data-open-settings]')) {
  b.addEventListener('click', () => {
    settingsFrom = openOverlay() || 'overlay-title';
    showOverlay('overlay-settings');
  });
}
$('btn-settings-back').addEventListener('click', () => showOverlay(settingsFrom));
for (const ev of ['pointerup', 'touchend', 'keydown']) window.addEventListener(ev, audio.unlock, { capture: true, passive: true });
document.addEventListener('click', (e) => {
  audio.unlock();
  if (e.target.closest?.('button')) audio.sfx('click');
}, true);
showSettings();
audio.playMusic('title');

// ── Boot ───────────────────────────────────────────────────────────────────
// Read-only handle for automated browser tests.
window.__slop = { get game() { return game; }, cam, net, get iso() { return iso; }, look: centreOn };
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

for (const el of document.querySelectorAll('.version')) el.textContent = `Slop Wars ${VERSION}`;

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
