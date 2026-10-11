// Pixel-art renderer. The look comes from the active theme (see themes/):
// it supplies the palette, sprites, terrain tiles and backdrop; this file
// places them on whole art pixels and draws the shared overlays (health bars,
// selection, build zones, minimap).
import {
  TILE_SIZE, MAP_W, MAP_H, WORLD_W, WORLD_H, UNIT_H, BUILDING_TYPES,
  TILE_EMPTY, TILE_GROUND, TILE_PLATFORM, TILE_BRIDGE, TILE_RAMP, UNIT_TYPES,
} from './config.js';
import { G, T, A, C, canvas, flip, rect, disc, hash, team, setPalette } from './pixel.js';
import classic from './themes/classic.js';
import robots from './themes/robots.js';
import medieval from './themes/medieval.js';
import gangster from './themes/gangster.js';
import warring from './themes/warring.js';

export { G };

// ── Themes ─────────────────────────────────────────────────────────────────
export const THEMES = [classic, robots, medieval, gangster, warring];
let theme = null;
const sprites = new Map();
const tiles = {};

export function setTheme(id) {
  theme = THEMES.find((t) => t.id === id) || classic;
  setPalette(theme.palette, theme.teamBase, theme.roofBase);
  sprites.clear();
  for (const k of Object.keys(tiles)) delete tiles[k];
  return theme;
}
export const currentTheme = () => theme;
setTheme('classic');

// Cached sprite + its mirror. `build` returns { c, ax, ay } (anchor in art px).
function sprite(key, facing, build) {
  let s = sprites.get(key);
  if (!s) {
    const r = build();
    s = { right: r, left: { c: flip(r.c), ax: r.c.width - r.ax, ay: r.ay } };
    sprites.set(key, s);
  }
  return facing < 0 ? s.left : s.right;
}

function buildingSprite(b) {
  return sprite(`b:${b.type}:${b.faction}`, 1, () => {
    const [c, g] = canvas(b.wt * T, b.ht * T);
    theme.buildings[b.type](g, team(b.faction));
    return { c, ax: 0, ay: 0 };
  });
}

// A unit's sprite as an image URL, for menus in themes that use sprite icons.
const iconCache = new Map();
export function unitIcon(type, faction) {
  const key = `${theme.id}:${type}:${faction}`;
  if (!iconCache.has(key)) {
    const d = UNIT_TYPES[type];
    const s = d.air ? theme.aircraft[type](faction) : d.vehicle ? theme.vehicle[type](faction, 0) : theme.soldier(type, faction, 0);
    iconCache.set(key, s.c.toDataURL());
  }
  return iconCache.get(key);
}

// ── Terrain ────────────────────────────────────────────────────────────────
function tile(kind, variant) {
  const key = `${kind}${variant}`;
  if (tiles[key]) return tiles[key];
  const [c, g] = canvas(T, T);
  theme.drawTile(g, kind, variant);
  tiles[key] = c;
  return c;
}

export function drawTerrain(ctx, map, view) {
  const l = Math.floor(view.x / TILE_SIZE) - 1;
  const r = Math.ceil((view.x + view.w) / TILE_SIZE) + 1;
  const t0 = Math.max(0, Math.floor(view.y / TILE_SIZE));
  const t1 = Math.min(MAP_H, Math.ceil((view.y + view.h) / TILE_SIZE) + 1);
  const from = map.wrap ? l : Math.max(0, l);
  const to = map.wrap ? r : Math.min(MAP_W, r);
  for (let tx = from; tx < to; tx++) {
    const col = ((tx % MAP_W) + MAP_W) % MAP_W;
    for (let ty = t0; ty < t1; ty++) {
      const k = map.get(tx, ty);
      if (k === TILE_EMPTY || k === TILE_RAMP || k === TILE_BRIDGE) continue;
      const x = tx * T;
      const y = ty * T;
      const v = Math.floor(hash(col * 31 + ty) * 4);
      const surface = map.get(tx, ty - 1) === TILE_EMPTY;
      let img;
      if (k === TILE_GROUND) {
        const depth = ty - map.groundTop;
        img = surface ? tile('dirtTop', v) : tile(depth >= 2 ? 'dirtDeep' : depth === 1 ? 'dirtMid' : 'dirt', v);
      } else {
        const L = map.get(tx - 1, ty) !== TILE_PLATFORM;
        const R = map.get(tx + 1, ty) !== TILE_PLATFORM;
        img = tile(L && R ? 'rockLR' : L ? 'rockL' : R ? 'rockR' : 'rock', v);
      }
      ctx.drawImage(img, x, y);
      if (surface) theme.surface(ctx, x, y, k === TILE_GROUND, hash(col * 7 + ty * 3), col);
    }
  }
}

// ── Background & weather (screen space in the art buffer) ──────────────────
export const skyTop = () => theme.skyTop;
export function drawBackground(ctx, bw, bh, camAX, camAY) { theme.background(ctx, bw, bh, camAX, camAY); }
// Drawn over the finished world (rain, haze…), if the theme has any.
export function drawWeather(ctx, bw, bh, camAX, camAY) { theme.weather?.(ctx, bw, bh, camAX, camAY); }

// ── Units ──────────────────────────────────────────────────────────────────
export function drawUnit(ctx, u) {
  const x = A(u.x);
  const y = A(u.y);
  const frame = Math.floor(u.x / 6) & 1;
  let s;
  if (u.air) {
    s = sprite(`a:${u.type}:${u.faction}`, u.facing, () => theme.aircraft[u.type](u.faction));
    drawAirShadow(ctx, u);
  } else if (u.vehicle) {
    s = sprite(`v:${u.type}:${u.faction}:${frame}`, u.facing, () => theme.vehicle[u.type](u.faction, frame));
    rect(ctx, x - Math.floor(s.c.width / 2) + 1, y, s.c.width - 2, 1, C.shadow);
  } else {
    s = sprite(`s:${u.type}:${u.faction}:${frame}`, u.facing, () => theme.soldier(u.type, u.faction, frame));
    rect(ctx, x - 5, y, 10, 1, C.shadow);
  }
  ctx.drawImage(s.c, x - s.ax, y - s.ay);
  if (u.air) theme.rotor(ctx, u, x, y);
  if (u.flash > 0) flashSprite(ctx, s.c, x - s.ax, y - s.ay);
  const w = Math.min(s.c.width, 16);
  const top = y - s.ay;
  if (u.selected) brackets(ctx, x - s.ax - 1, top - 1, s.c.width + 2, s.c.height + 2);
  if (u.hp < u.maxHp || u.selected) hpBar(ctx, x - Math.floor(w / 2), top - 4, w, u.hp / u.maxHp);
}


// Hit flash: redraw the sprite brightened.
function flashSprite(ctx, img, x, y) {
  ctx.globalAlpha = 0.6;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(img, x, y);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

function drawAirShadow(ctx, u) {
  const map = u.game.map;
  const tx = Math.floor(u.x / TILE_SIZE);
  let gy = Math.floor(u.y / TILE_SIZE);
  while (gy < MAP_H && !map.isSolid(tx, gy)) gy++;
  const sy = A(gy * TILE_SIZE);
  ctx.globalAlpha = Math.max(0.12, 0.3 - (sy - A(u.y)) / 400);
  rect(ctx, A(u.x) - 8, sy, 16, 1, '#000');
  ctx.globalAlpha = 1;
}

function brackets(ctx, x, y, w, h) {
  ctx.fillStyle = C.white;
  const l = 3;
  ctx.fillRect(x, y, l, 1); ctx.fillRect(x, y, 1, l);
  ctx.fillRect(x + w - l, y, l, 1); ctx.fillRect(x + w - 1, y, 1, l);
  ctx.fillRect(x, y + h - 1, l, 1); ctx.fillRect(x, y + h - l, 1, l);
  ctx.fillRect(x + w - l, y + h - 1, l, 1); ctx.fillRect(x + w - 1, y + h - l, 1, l);
}

function hpBar(ctx, x, y, w, ratio) {
  rect(ctx, x - 1, y - 1, w + 2, 3, C.O);
  rect(ctx, x, y, Math.max(1, Math.round(w * ratio)), 1, ratio > 0.5 ? '#5ee03a' : ratio > 0.25 ? C.yellow : C.red);
}

// ── Buildings ──────────────────────────────────────────────────────────────
export function drawBuilding(ctx, b) {
  const s = buildingSprite(b);
  const x = A(b.x);
  const y = A(b.y);
  const w = s.c.width;
  const h = s.c.height;
  if (b.constructing) {
    // Rises from the ground behind the theme's scaffolding
    ctx.globalAlpha = 0.35;
    ctx.drawImage(s.c, x, y);
    ctx.globalAlpha = 1;
    const built = Math.round(h * b.progress);
    if (built > 0) ctx.drawImage(s.c, 0, h - built, w, built, x, y + h - built, w, built);
    theme.construction(ctx, x, y, w, h, b.progress);
    progressBar(ctx, x, y + h + 2, w, b.progress, C.yellow);
  } else {
    ctx.drawImage(s.c, x, y);
    theme.animate(ctx, b, x, y, w);
  }
  if (b.trainCurrent) progressBar(ctx, x, y + h + 2, w, 1 - b.trainTimer / b.trainTotal, '#5ee03a');
  if (b.flash > 0) flashSprite(ctx, s.c, x, y);
  // Damage: smoke, then fire
  const r = b.hp / b.maxHp;
  if (r < 0.5 && b.type !== 'bridge' && b.type !== 'ramp') {
    const tt = performance.now() / 1000;
    for (let i = 0; i < 3; i++) {
      const k = (tt * 0.6 + i / 3) % 1;
      const sz = 2 + Math.round(k * 3);
      ctx.globalAlpha = 0.7 * (1 - k);
      rect(ctx, x + Math.floor(w * (0.3 + 0.2 * i)) + Math.round(Math.sin(tt * 2 + i) * 2), y + 2 - Math.round(k * 16), sz, sz, '#4a4740');
      ctx.globalAlpha = 1;
    }
    if (r < 0.25) {
      const fl = Math.floor(tt * 10) % 2;
      rect(ctx, x + Math.floor(w * 0.4), y + 1 - fl, 3, 2 + fl, '#f28a30');
      rect(ctx, x + Math.floor(w * 0.4) + 1, y - fl, 1, 1, C.yellow);
    }
  }
  if (b.selected) brackets(ctx, x - 2, y - 2, w + 4, h + 4);
  if (b.hp < b.maxHp) hpBar(ctx, x, y - 4, w, r);
}

function progressBar(ctx, x, y, w, ratio, col) {
  rect(ctx, x - 1, y - 1, w + 2, 4, C.O);
  rect(ctx, x, y, Math.round(w * Math.max(0, Math.min(1, ratio))), 2, col);
}

// ── Projectiles ────────────────────────────────────────────────────────────
export function drawProjectile(ctx, p) {
  const x = A(p.x);
  const y = A(p.y);
  if (p.exploded > 0) {
    // Pixel explosion: hot core, orange body, red rim, then smoke
    const k = 1 - p.exploded / 0.3;
    const r = Math.max(2, Math.round((p.splash / G) * (0.35 + 0.5 * k)));
    if (theme.explode) { theme.explode(ctx, x, y - 1, r, k, p.id || 0); return; }
    const ex = theme.explosion;
    disc(ctx, x, y - 1, r, k < 0.6 ? ex.rim : ex.smoke);
    disc(ctx, x, y - 1, Math.max(1, r - 2), k < 0.6 ? ex.body : ex.smoke2);
    if (k < 0.5) disc(ctx, x, y - 1, Math.max(1, r - 4), ex.core);
    return;
  }
  const dx = Math.round(Math.cos(p.angle) * 3);
  const dy = Math.round(Math.sin(p.angle) * 3);
  theme.projectile(ctx, p, x, y, dx, dy);
}

// ── Effects (visual only) ──────────────────────────────────────────────────
export function updateEffects(effects, dt) {
  for (const e of effects) e.t += dt;
  return effects.filter((e) => e.t < e.life);
}

export function drawEffects(ctx, effects) {
  for (const e of effects) {
    const x = A(e.x);
    const y = A(e.y);
    const fade = Math.max(0, Math.min(1, (e.life - e.t) / 1.2));
    ctx.globalAlpha = fade;
    if (e.kind === 'fall') {
      const s = sprite(`dead:${e.f}:${theme.corpseKey?.(e) ?? ''}`, e.facing, () => theme.corpse(e));
      if (!theme.corpseKey?.(e)) {
        rect(ctx, x - 5, y - 1, 9, 1, C.redDark);
        rect(ctx, x - 3, y - 1, 5, 1, C.red);
      }
      ctx.drawImage(s.c, x - s.ax, y - s.ay);
    } else if (e.kind === 'wreck') {
      ctx.fillStyle = C.O; ctx.fillRect(x - 9, y - 5, 18, 5); ctx.fillRect(x - 6, y - 7, 10, 3);
      ctx.fillStyle = '#2c2924'; ctx.fillRect(x - 8, y - 4, 16, 4);
      ctx.fillStyle = '#3a3630'; ctx.fillRect(x - 5, y - 6, 8, 2);
      if (e.t < 0.35) disc(ctx, x, y - 4, Math.round(10 * (1 - e.t / 0.35)) + 2, '#f28a30');
      for (let i = 0; i < 4; i++) {
        const k = (e.t * 0.7 + i * 0.25) % 1;
        const sz = 2 + Math.round(k * 4);
        ctx.globalAlpha = Math.min(fade, 0.65 * (1 - k));
        rect(ctx, x - 2 + Math.round(Math.sin(i * 2 + e.t) * 3), y - 7 - Math.round(k * 24), sz, sz, '#4a4740');
      }
      ctx.globalAlpha = fade;
      if (Math.floor(e.t * 10) % 2 && e.t < 3) rect(ctx, x - 1, y - 7, 2, 2, '#f28a30');
    } else if (e.kind === 'debris') {
      for (const p of e.parts) {
        rect(ctx, x + Math.round((p.vx * e.t) / G), y + Math.round((p.vy * e.t + 450 * e.t * e.t) / G), 2, 2, theme.debris?.[p.c] || p.c);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ── Placement overlays & markers ───────────────────────────────────────────
// Dim everything outside the build zone and mark its edges (zones in tiles).
export function drawBuildZones(ctx, zones, view) {
  const top = A(view.y) - 1;
  const h = A(view.h) + 3;
  let x = A(view.x) - 1;
  const right = A(view.x + view.w) + 2;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (const [from, to] of zones) {
    const z0 = from * T;
    const z1 = to * T;
    if (z0 > x) ctx.fillRect(x, top, Math.min(z0, right) - x, h);
    x = Math.max(x, z1);
  }
  if (x < right) ctx.fillRect(x, top, right - x, h);
  ctx.fillStyle = '#5ee03a';
  for (const [from, to] of zones) {
    for (const ex of [from * T, to * T - 1]) {
      for (let yy = top; yy < top + h; yy += 6) ctx.fillRect(ex, yy, 1, 3);
    }
  }
}

export function drawGhost(ctx, pl) {
  const x = pl.tx * T;
  const y = pl.ty * T;
  const w = pl.w * T;
  const h = pl.h * T;
  const col = pl.valid ? '#5ee03a' : C.red;
  ctx.globalAlpha = 0.25;
  rect(ctx, x, y, w, h, col);
  ctx.globalAlpha = 1;
  ctx.fillStyle = col;
  for (let i = 0; i < w; i += 4) { ctx.fillRect(x + i, y, 2, 1); ctx.fillRect(x + i, y + h - 1, 2, 1); }
  for (let i = 0; i < h; i += 4) { ctx.fillRect(x, y + i, 1, 2); ctx.fillRect(x + w - 1, y + i, 1, 2); }
}

// Order feedback: a pixel square ring that expands as it fades.
export function drawMarker(ctx, m) {
  const r = Math.round(3 + (1.2 - m.t) * 8);
  const x = A(m.x);
  const y = A(m.y);
  ctx.globalAlpha = Math.min(1, m.t * 2);
  ctx.fillStyle = m.color;
  ctx.fillRect(x - r, y - r, r * 2, 1);
  ctx.fillRect(x - r, y + r, r * 2 + 1, 1);
  ctx.fillRect(x - r, y - r, 1, r * 2);
  ctx.fillRect(x + r, y - r, 1, r * 2);
  ctx.globalAlpha = 1;
}

// ── Minimap ────────────────────────────────────────────────────────────────
export function drawMinimap(ctx, game, cw, ch, view, terrainCache, zones = null) {
  const sx = cw / WORLD_W;
  const sy = ch / WORLD_H;
  if (terrainCache.version !== game.map.version || terrainCache.w !== cw || terrainCache.h !== ch || terrainCache.theme !== theme) {
    const c = terrainCache.canvas || (terrainCache.canvas = document.createElement('canvas'));
    c.width = cw;
    c.height = ch;
    const t = c.getContext('2d');
    const mm = theme.minimap;
    t.fillStyle = mm.sky;
    t.fillRect(0, 0, cw, ch);
    const colors = { [TILE_GROUND]: mm.ground, [TILE_PLATFORM]: mm.platform, [TILE_BRIDGE]: mm.bridge, [TILE_RAMP]: mm.ramp };
    for (let tx = 0; tx < MAP_W; tx++) {
      for (let ty = 0; ty < MAP_H; ty++) {
        const k = game.map.get(tx, ty);
        if (k === TILE_EMPTY) continue;
        t.fillStyle = colors[k];
        t.fillRect(Math.floor(tx * TILE_SIZE * sx), Math.floor(ty * TILE_SIZE * sy), Math.ceil(TILE_SIZE * sx), Math.ceil(TILE_SIZE * sy));
      }
    }
    t.fillStyle = mm.surface;
    for (let tx = 0; tx < MAP_W; tx++) {
      for (let ty = 1; ty < MAP_H; ty++) {
        if (game.map.get(tx, ty) !== TILE_EMPTY && game.map.get(tx, ty - 1) === TILE_EMPTY) {
          t.fillRect(Math.floor(tx * TILE_SIZE * sx), Math.floor(ty * TILE_SIZE * sy), Math.ceil(TILE_SIZE * sx), Math.max(1, Math.ceil(TILE_SIZE * sy * 0.35)));
        }
      }
    }
    Object.assign(terrainCache, { version: game.map.version, w: cw, h: ch, theme });
  }
  ctx.drawImage(terrainCache.canvas, 0, 0);
  if (zones) {
    ctx.fillStyle = 'rgba(0,255,102,0.28)';
    for (const shift of game.wrap ? [-WORLD_W, 0, WORLD_W] : [0]) {
      for (const [from, to] of zones) ctx.fillRect((from * TILE_SIZE + shift) * sx, 0, (to - from) * TILE_SIZE * sx, ch);
    }
  }
  for (const b of game.buildings) {
    if (b.type === 'bridge' || b.type === 'ramp') continue;
    ctx.fillStyle = team(b.faction).main;
    ctx.fillRect(Math.floor(b.x * sx), Math.floor(b.y * sy), Math.max(3, Math.ceil(b.w * sx)), Math.max(3, Math.ceil(b.h * sy)));
  }
  for (const u of game.units) {
    ctx.fillStyle = team(u.faction).light;
    ctx.fillRect(Math.floor(u.x * sx) - 1, Math.floor((u.y - UNIT_H) * sy), u.vehicle ? 5 : 3, Math.max(3, Math.ceil(UNIT_H * sy)));
  }
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  const vy = Math.max(0, view.y);
  const vh = Math.min(WORLD_H, view.y + view.h) - vy;
  const box = (vx) => ctx.strokeRect(Math.round(vx * sx) + 1, Math.round(vy * sy) + 1, Math.round(view.w * sx) - 2, Math.round(vh * sy) - 2);
  box(view.x);
  if (game.wrap && view.x + view.w > WORLD_W) box(view.x - WORLD_W);
}

export { BUILDING_TYPES };
