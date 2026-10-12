// Isometric view: the same battlefield drawn as a Syndicate-style diorama.
//
// The simulation stays 2D (x along the map, y up and down), so games, saves
// and online play are identical in both views. Here the map becomes a long
// strip DEPTH world units deep, seen from above at the classic 2:1 angle:
// x runs down-right across the screen, depth (z) runs up-right, and height
// is straight up. Platforms, buildings and bridges are extruded back through
// the strip from their usual side-on art; units keep their sprites and walk
// in lanes along the front of the strip, in front of the buildings.
//
// Projected world coordinates (what the camera pans over), in world units:
//   X = x + z,  Y = y + (x - z) / 2
// and in art pixels each is divided by G, with whole-pixel 2:1 steps.
import { TILE_SIZE, MAP_W, MAP_H, WORLD_W, GROUND_LEVEL_TILE, TILE_GROUND, TILE_PLATFORM } from './config.js';
import { TileMap } from './tilemap.js';
import { G, T, C, A, canvas, hash, rect } from './pixel.js';
import {
  currentTheme, buildingSprite, rampSprite, tile, drawUnit, drawProjectile, drawEffects, brackets, hpBar,
  progressBar,
} from './render.js';

// The strip is no deeper than the lowest platform is high, so seen from
// above a platform never hides anything standing on the level below it.
export const DEPTH = 3 * TILE_SIZE;           // how deep the battlefield strip is
const BACK = 1.5 * TILE_SIZE;                 // buildings fill the back half…
const LANE0 = 0.3 * TILE_SIZE;                // …and units walk the front lanes
const LANE1 = 1.3 * TILE_SIZE;
export const LANE_MID = (LANE0 + LANE1) / 2;
export const GROUND_Y = (MAP_H - GROUND_LEVEL_TILE) * TILE_SIZE;
const DP = DEPTH / G;                         // strip depth in art pixels
const LIP = 6;                                // art px the strip stands above the plain

// ── Projection ─────────────────────────────────────────────────────────────
export const projX = (x, z) => x + z;
export const projY = (x, y, z) => y + (x - z) / 2;
// Art-pixel position of a world point, snapped to the 2:1 pixel staircase.
function art(x, y, z) {
  const ax = Math.round(x / G);
  const az = Math.round(z / G);
  return [ax + az, Math.round(y / G) + Math.floor((ax - az) / 2)];
}

// Which lane a unit walks in: fixed per unit, so armies spread out across the
// street. Aircraft fly down the middle.
export function laneOf(e) {
  if (e.isoZ == null) e.isoZ = e.air ? LANE_MID : LANE0 + hash((e.id || 0) * 7 + 3) * (LANE1 - LANE0);
  return e.isoZ;
}
// Depth range of a building: walls block the whole street; the rest stand at the back.
export const buildingZ = (b) => (b.type === 'wall' ? [0, DEPTH] : [BACK, DEPTH]);
// The depth a tap or marker aimed at this entity should use.
export function depthOf(e) {
  if (e.kind === 'unit') return laneOf(e);
  if (e.seg) return LANE_MID;
  const [z0, z1] = buildingZ(e);
  return e.type === 'wall' ? LANE_MID : z0;
}

// ── Extrusion ──────────────────────────────────────────────────────────────
// Side-on art becomes a solid block by repeating it back through the depth.
// Pixels along the top edge become the roof (lit), the rest the right-hand
// walls (shaded); both take the colour from just inside the outline.
function shade(src, seed = 0) {
  const w = src.width;
  const h = src.height;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const [c, g] = canvas(w, h);
  const img = g.createImageData(w, h);
  const o = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] >= 128;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 128) continue;
      const top = !solid(x, y - 1);
      let j = i;
      let f;
      if (top) { if (solid(x, y + 1)) j = i + w * 4; f = 1.04; } else { if (solid(x - 1, y)) j = i - 4; f = 0.62; }
      // A little grain, different in each slice, so roofs and walls aren't flat.
      f *= 0.93 + 0.1 * hash(seed * 7919 + y * 131 + x);
      o[i] = Math.min(255, d[j] * f);
      o[i + 1] = Math.min(255, d[j + 1] * f);
      o[i + 2] = Math.min(255, d[j + 2] * f);
      o[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// The art sheared onto a plane running along x: column i drops floor((q + i) / 2).
function shear(src, q) {
  const w = src.width;
  const h = src.height;
  const [c, g] = canvas(w, h + Math.ceil(w / 2) + 1);
  for (let i = 0; i < w; i++) g.drawImage(src, i, 0, 1, h, i, Math.floor((q + i) / 2), 1, h);
  return c;
}

// Draw art on the face of a block that faces the viewer, column by column
// so the pixels stay square. (X, Y) is the face's top-left in art pixels.
function shearBlit(ctx, src, X, Y, p = 0) {
  for (let i = 0; i < src.width; i++) ctx.drawImage(src, i, 0, 1, src.height, X + i, Y + Math.floor((p + i) / 2), 1, src.height);
}

// A block `depth` art px deep with `src` on its front face. p is the parity
// of (x - z) at the front face's left edge, so the steps line up with the
// world's. Returns { c, oy }: the front face's top-left sits at (0, oy).
function extrude(src, depth, p = 0) {
  const w = src.width;
  const h = src.height;
  const sides = [0, 1, 2, 3].map((n) => { const S = shade(src, n); return [shear(S, 0), shear(S, 1)]; });
  const up = Math.ceil(depth / 2) + 1;
  const [c, g] = canvas(w + depth, h + up + Math.ceil(w / 2) + 2);
  for (let k = depth; k >= 1; k--) {
    const side = sides[Math.floor(hash(k * 31 + w) * 4)];
    if (k % 2 === 0) g.drawImage(side[p], k, up - k / 2);
    else if (p === 1) g.drawImage(side[0], k, up - (k - 1) / 2);
    else g.drawImage(side[1], k, up - 1 - (k - 1) / 2);
  }
  g.drawImage(shear(src, p), 0, up);
  return { c, oy: up };
}

// Caches, keyed by the source art (render.js rebuilds that when the theme or
// sides change, so stale blocks simply stop being looked up).
const blocks = new WeakMap();
function block(src, depth, p = 0) {
  let m = blocks.get(src);
  if (!m) blocks.set(src, (m = new Map()));
  const k = depth * 2 + p;
  if (!m.has(k)) m.set(k, extrude(src, depth, p));
  return m.get(k);
}

// ── Ground ─────────────────────────────────────────────────────────────────
let groundKey = null;
const ground = {};
function groundArt() {
  const th = currentTheme();
  if (groundKey === th) return ground;
  groundKey = th;
  const mm = th.minimap;
  ground.plain = darken(mm.ground, 0.5);
  ground.grid = darken(mm.ground, 0.4);
  ground.bars = [];
  ground.lips = [];
  for (let v = 0; v < 4; v++) {
    // The top of the strip, one tile wide and the strip deep, textured from
    // the surface rows of the theme's ground tile.
    const src = tile('dirtTop', v);
    const sd = src.getContext('2d').getImageData(0, 0, T, T).data;
    const up = DP / 2;
    const [c, g] = canvas(T + DP, T / 2 + up + 1);
    const img = g.createImageData(c.width, c.height);
    for (let u = 0; u < T; u++) {
      for (let w = 0; w < DP; w++) {
        const row = 1 + Math.floor(hash(u * 131 + w * 17 + v * 7) * 3);
        const col = (u + Math.floor(w / T) * 5) % T;
        let i = (row * T + col) * 4;
        if (sd[i + 3] < 128) i = (1 * T + col) * 4;
        const edge = (w === 0 || w === DP - 1 ? 0.8 : 1) * (0.86 + 0.14 * hash(u * 7 + w * 389 + v * 3));
        const o = ((up + Math.floor((u - w) / 2)) * c.width + u + w) * 4;
        img.data[o] = sd[i] * edge;
        img.data[o + 1] = sd[i + 1] * edge;
        img.data[o + 2] = sd[i + 2] * edge;
        img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    ground.bars.push({ c, oy: up });
    // The strip's front edge: a sliver of the ground tile's soil.
    const [l, lg] = canvas(T, LIP);
    lg.drawImage(src, 0, 5, T, LIP, 0, 0, T, LIP);
    lg.globalCompositeOperation = 'source-atop';
    lg.fillStyle = 'rgba(0,0,0,0.25)';
    lg.fillRect(0, 0, T, LIP);
    ground.lips.push(shear(l, 0));
  }
  // The plain around the strip: a dim tiled floor (one diamond per tile).
  const [pc, pg] = canvas(2 * T, T);
  pg.fillStyle = ground.plain;
  pg.fillRect(0, 0, 2 * T, T);
  pg.fillStyle = ground.grid;
  for (let i = 0; i < T; i++) {
    pg.fillRect(2 * i, i, 2, 1);
    pg.fillRect(2 * i, T - 1 - i, 2, 1);
  }
  ground.tile = pc;
  return ground;
}

function darken(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * (1 - k));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Screen space in the art buffer: the plain everything stands on.
export function drawIsoBackground(ctx, bw, bh, camAX, camAY) {
  const gr = groundArt();
  const pat = ctx.createPattern(gr.tile, 'repeat');
  ctx.save();
  ctx.translate(-camAX, -camAY + LIP);
  ctx.fillStyle = pat;
  ctx.fillRect(camAX, camAY - LIP, bw, bh);
  ctx.restore();
}

// The range of world x worth drawing for a view (in projected world units).
function visibleX(v) {
  return [Math.max(v.x - DEPTH - 96, 2 * (v.y - GROUND_Y) - 96), Math.min(v.x + v.w + 96, 2 * (v.y + v.h) + DEPTH + 96)];
}

// ── The scene ──────────────────────────────────────────────────────────────
// Everything that stands on the strip becomes an item with a world-space box
// (x, depth z, height h above the ground) and the screen rectangle it covers.
// Items whose rectangles overlap are put in order by which box is nearer the
// viewer, who looks from +x, -z and above.
function item(x0, x1, z0, z1, h0, h1, draw, extra) {
  const [sx0] = art(x0, 0, z0);
  const [sx1] = art(x1, 0, z1);
  const top = Math.round((GROUND_Y - h1) / G) + Math.floor((x0 / G - z1 / G) / 2) - 24;
  const bot = Math.round((GROUND_Y - h0) / G) + Math.ceil((x1 / G - z0 / G) / 2) + 8;
  return { x0, x1, z0, z1, h0, h1, sx0: sx0 - 24, sx1: sx1 + 24, sy0: top, sy1: bot, draw, ...extra };
}

function before(a, b) {
  if (a.x1 <= b.x0) return true;
  if (b.x1 <= a.x0) return false;
  if (a.z0 >= b.z1) return true;
  if (b.z0 >= a.z1) return false;
  if (a.h1 <= b.h0) return true;
  if (b.h1 <= a.h0) return false;
  const k = (e) => e.x0 + e.x1 - e.z0 - e.z1 + e.h0 + e.h1;
  return k(a) < k(b);
}

function sortScene(items) {
  const n = items.length;
  const after = items.map(() => []);
  for (let i = 0; i < n; i++) {
    const a = items[i];
    for (let j = i + 1; j < n; j++) {
      const b = items[j];
      if (a.sx1 < b.sx0 || b.sx1 < a.sx0 || a.sy1 < b.sy0 || b.sy1 < a.sy0) continue;
      if (before(a, b)) after[j].push(i); else after[i].push(j);
    }
  }
  // Depth-first: everything behind an item is drawn before it.
  const out = [];
  const state = new Uint8Array(n);
  const visit = (i) => {
    if (state[i]) return;
    state[i] = 1;
    for (const j of after[i]) visit(j);
    out.push(items[i]);
  };
  // Start from the back so ties keep a sensible order.
  const order = [...items.keys()].sort((i, j) => items[i].x0 - items[i].z1 - (items[j].x0 - items[j].z1));
  for (const i of order) visit(i);
  return out;
}

// Draw at (x, y) on a plane z deep, using the 2D drawing code: a plain
// translation of the side-on art, since height is straight up in both views.
function at(ctx, x, y, z, fn, o = 0) {
  const [X, Y] = art(x + o, y, z);
  ctx.save();
  ctx.translate(X - A(x), Y - A(y));
  fn();
  ctx.restore();
}

// Draws the battlefield. ctx is the art buffer, already translated so art
// pixel (X, Y) of the projection lands in the right place; v is the view in
// projected world units; `wrap` repeats the world on looping maps.
export function drawIsoWorld(ctx, game, v) {
  const map = game.map;
  const gr = groundArt();
  const [xa, xb] = visibleX(v);
  const shifts = game.wrap ? [-WORLD_W, 0, WORLD_W] : [0];
  const t0 = Math.floor(xa / TILE_SIZE);
  const t1 = Math.ceil(xb / TILE_SIZE);
  const from = game.wrap ? t0 : Math.max(0, t0);
  const to = game.wrap ? t1 : Math.min(MAP_W, t1);

  // The strip's floor and its front edge.
  for (let tx = from; tx < to; tx++) {
    const col = ((tx % MAP_W) + MAP_W) % MAP_W;
    const vnt = Math.floor(hash(col * 31 + 5) * 4);
    const [X, Y] = art(tx * TILE_SIZE, GROUND_Y, 0);
    const bar = gr.bars[vnt];
    ctx.drawImage(bar.c, X, Y - bar.oy);
    ctx.drawImage(gr.lips[vnt], X, Y + 1);
  }
  if (!game.wrap) {
    // The far end of the map: the strip's side face.
    ctx.fillStyle = darken(currentTheme().minimap.ground, 0.25);
    const [X, Y] = art(WORLD_W, GROUND_Y, 0);
    for (let k = 0; k < DP; k++) ctx.fillRect(X + k, Y - Math.ceil(k / 2), 1, LIP);
  }

  const items = [];
  // Platforms: one item per run of platform tiles in a row.
  for (let ty = 0; ty < map.groundTop; ty++) {
    let tx = from;
    while (tx < to) {
      if (map.get(tx, ty) !== TILE_PLATFORM && map.get(tx, ty) !== TILE_GROUND) { tx++; continue; }
      const start = tx;
      while (tx < to && (map.get(tx, ty) === TILE_PLATFORM || map.get(tx, ty) === TILE_GROUND)) tx++;
      const end = tx;
      const row = ty;
      items.push(item(start * TILE_SIZE, end * TILE_SIZE, 0, DEPTH, GROUND_Y - (row + 1) * TILE_SIZE, GROUND_Y - row * TILE_SIZE, () => {
        ctx.globalAlpha = fade;
        for (let x = start; x < end; x++) {
          const L = map.get(x - 1, row) !== TILE_PLATFORM;
          const R = map.get(x + 1, row) !== TILE_PLATFORM;
          const col = ((x % MAP_W) + MAP_W) % MAP_W;
          const vnt = Math.floor(hash(col * 31 + row) * 4);
          const b = block(tile(L && R ? 'rockLR' : L ? 'rockL' : R ? 'rockR' : 'rock', vnt), DP);
          const [X, Y] = art(x * TILE_SIZE, row * TILE_SIZE, 0);
          ctx.drawImage(b.c, X, Y - b.oy);
        }
        ctx.globalAlpha = 1;
      }, { solid: true }));
    }
  }

  const each = (list, fn) => {
    for (const e of list) {
      for (const o of shifts) {
        const ex0 = e.x + o - (e.w || 0);
        const ex1 = e.x + o + (e.w || 0) * 2;
        if (ex1 >= xa && ex0 <= xb) fn(e, o);
      }
    }
  };

  each(game.buildings, (b, o) => {
    if (b.dead) return;
    if (b.seg) rampItems(items, ctx, b, o);
    else items.push(buildingItem(ctx, b, o));
  });
  each(game.units, (u, o) => {
    if (u.dead) return;
    const z = laneOf(u);
    const x = u.x + o;
    const h = GROUND_Y - u.y;
    items.push(item(x - 6, x + 6, z - 6, z + 6, h, h + u.h, () => at(ctx, u.x, u.y, z, () => drawUnit(ctx, u), o), {
      pts: [[x, z, h + 3], [x, z, h + u.h * 0.6]],
      xray: () => at(ctx, u.x, u.y, z, () => drawUnit(ctx, u, true), o),
    }));
  });
  each(game.effects || [], (e, o) => {
    const z = e.kind === 'debris' ? (BACK + DEPTH) / 2 : e.id ? LANE0 + hash(e.id * 7 + 3) * (LANE1 - LANE0) : LANE_MID;
    const x = e.x + o;
    items.push(item(x - 8, x + 8, z - 8, z + 8, GROUND_Y - e.y, GROUND_Y - e.y + 6, () => at(ctx, e.x, e.y, z, () => drawEffects(ctx, [e]), o)));
  });
  each(game.projectiles, (p, o) => {
    const z = shotDepth(p);
    const x = p.x + o;
    items.push(item(x - 3, x + 3, z - 3, z + 3, GROUND_Y - p.y - 2, GROUND_Y - p.y + 2, () => at(ctx, p.x, p.y, z, () => drawProjectile(ctx, p), o)));
  });

  // Units behind a platform or wall show through it faintly; a platform or
  // bridge in front of a building turns see-through.
  const order = sortScene(items);
  const hidden = [];
  for (let i = 0; i < order.length; i++) {
    const a = order[i];
    if (!a.pts) continue;
    for (let j = i + 1; j < order.length; j++) {
      const b = order[j];
      if (!b.solid || a.sx1 < b.sx0 || b.sx1 < a.sx0 || a.sy1 < b.sy0 || b.sy1 < a.sy0) continue;
      if (!a.pts.some((pt) => blocks3(b, pt))) continue;
      if (a.xray) { hidden.push(a); break; }
      b.fade = true;
    }
  }
  for (const it of order) {
    fade = it.fade ? 0.5 : 1;
    it.draw();
  }
  fade = 1;
  for (const it of hidden) it.xray();
}

let fade = 1;
// Does box b stand between point [x, z, h] and the viewer? The line of
// sight from the point runs toward +x, -z and up, one unit each per step.
function blocks3(b, [x, z, h]) {
  const lo = Math.max(1, b.x0 - x, z - b.z1, b.h0 - h);
  const hi = Math.min(b.x1 - x, z - b.z0, b.h1 - h);
  return lo < hi;
}

// Shots fly from the shooter's lane to the target's.
function shotDepth(p) {
  if (p.isoZ0 == null) {
    p.isoX0 = p.x;
    let from = p.shooter;
    if (!from) {
      // Online guests don't know who fired: take the nearest unit of that side.
      let best = 60;
      for (const u of p.game?.units || []) {
        const d = Math.hypot(u.x - p.x, u.y - 14 - p.y);
        if (d < best && (p.faction == null || u.faction === p.faction)) { best = d; from = u; }
      }
    }
    p.isoZ0 = from ? depthOf(from) : LANE_MID;
    p.isoZ1 = p.target ? depthOf(p.target) : p.isoZ0;
  }
  const span = Math.abs((p.tx ?? p.x) - p.isoX0);
  const k = span > 1 ? Math.min(1, Math.abs(p.x - p.isoX0) / span) : 1;
  return p.isoZ0 + (p.isoZ1 - p.isoZ0) * k;
}

// Facade overlays (flags, smoke, scaffolding) are drawn by the theme onto a
// scratch canvas the size of the building, then laid onto the front face.
let scratch = null;
const MARGIN = 24;
function facade(ctx, w, h, X, Y, p, fn) {
  const [c, g] = scratch || (scratch = canvas(1, 1));
  if (c.width !== w || c.height !== h + MARGIN) { c.width = w; c.height = h + MARGIN; g.imageSmoothingEnabled = false; }
  g.clearRect(0, 0, c.width, c.height);
  fn(g, MARGIN);
  shearBlit(ctx, c, X, Y - MARGIN, p);
}

function buildingItem(ctx, b, o) {
  const [z0, z1] = buildingZ(b);
  const x = b.x + o;
  const h0 = GROUND_Y - b.y - b.h;
  const pts = [[x + b.w / 2, z0, h0 + b.h / 2], [x + 6, z0, h0 + b.h - 6], [x + b.w - 6, z0, h0 + b.h - 6], [x + b.w / 2, z0, h0 + b.h - 4]];
  return item(x, x + b.w, z0, z1, h0, h0 + b.h, () => {
    const s = buildingSprite(b);
    const blk = block(s.c, (z1 - z0) / G);
    const [X, Y] = art(x, b.y, z0);
    const w = s.c.width;
    const h = s.c.height;
    const th = currentTheme();
    ctx.globalAlpha = fade;
    if (b.constructing) {
      ctx.globalAlpha = 0.35 * fade;
      ctx.drawImage(blk.c, X, Y - blk.oy);
      ctx.globalAlpha = fade;
      const built = Math.round(h * b.progress);
      if (built > 0) {
        // Only the part that's gone up so far: clip to a block that tall.
        const d = (z1 - z0) / G;
        const bottom = Y + h;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(X, bottom - built);
        ctx.lineTo(X + d, bottom - built - d / 2);
        ctx.lineTo(X + d + w, bottom - built - d / 2 + w / 2);
        ctx.lineTo(X + d + w, bottom - d / 2 + w / 2 + 1);
        ctx.lineTo(X + w, bottom + w / 2 + 1);
        ctx.lineTo(X, bottom + 1);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(blk.c, X, Y - blk.oy);
        ctx.restore();
      }
      facade(ctx, w, h, X, Y, 0, (g, m) => th.construction(g, 0, m, w, h, b.progress));
      progressBar(ctx, X + Math.floor(w / 4), Y + h + Math.floor(w / 2) + 3, Math.ceil(w / 2), b.progress, C.yellow);
    } else {
      ctx.drawImage(blk.c, X, Y - blk.oy);
      facade(ctx, w, h, X, Y, 0, (g, m) => th.animate(g, b, 0, m, w));
    }
    if (b.flash > 0) {
      ctx.save();
      ctx.globalAlpha = 0.6 * fade;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(blk.c, X, Y - blk.oy);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // Box corners on screen, for the overlays.
    const d = (z1 - z0) / G;
    const left = X;
    const right = X + w + d;
    const roof = Y - Math.ceil(d / 2);
    const cx = X + Math.floor((w + d) / 2);
    if (b.trainCurrent) progressBar(ctx, X + Math.floor(w / 4), Y + h + Math.floor(w / 2) + 3, Math.ceil(w / 2), 1 - b.trainTimer / b.trainTotal, '#5ee03a');
    const r = b.hp / b.maxHp;
    if (r < 0.5) {
      const tt = performance.now() / 1000;
      for (let i = 0; i < 3; i++) {
        const k = (tt * 0.6 + i / 3) % 1;
        const sz = 2 + Math.round(k * 3);
        ctx.globalAlpha = 0.7 * (1 - k);
        rect(ctx, cx - 8 + 6 * i + Math.round(Math.sin(tt * 2 + i) * 2), roof + 4 - Math.round(k * 16), sz, sz, '#4a4740');
        ctx.globalAlpha = 1;
      }
      if (r < 0.25) {
        const fl = Math.floor(tt * 10) % 2;
        rect(ctx, cx, roof + 3 - fl, 3, 2 + fl, '#f28a30');
        rect(ctx, cx + 1, roof + 2 - fl, 1, 1, C.yellow);
      }
    }
    if (b.selected) brackets(ctx, left - 2, roof - 2, right - left + 4, Y + h + Math.ceil(w / 2) - roof + 4);
    if (b.hp < b.maxHp) hpBar(ctx, cx - Math.floor(w / 2), roof - 5, w, r);
  }, { solid: true, pts });
}

// Bridges: the plank extruded across the strip, cut into short pieces so
// units walking on (or under) each piece are drawn the right way round.
const PIECE = 8; // art px
function rampItems(items, ctx, b, o) {
  const spr = rampSprite(b);
  if (b.isoSpr?.src !== spr) {
    const pieces = [];
    for (let i = 0; i < spr.c.width; i += PIECE) {
      const w = Math.min(PIECE, spr.c.width - i);
      const [c, g] = canvas(w, spr.c.height);
      g.drawImage(spr.c, i, 0, w, spr.c.height, 0, 0, w, spr.c.height);
      // Height range of the plank over this piece.
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = 0; k < w; k++) {
        const wx = Math.max(b.seg.x1, Math.min(b.seg.x2, (spr.ox + i + k + 0.5) * G));
        const y = TileMap.rampY(b.seg, wx);
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
      }
      pieces.push({ i, c, lo, hi: hi + 8 });
    }
    b.isoSpr = { src: spr, pieces };
  }
  const p = ((spr.ox % 2) + 2) % 2;
  for (const pc of b.isoSpr.pieces) {
    const x = (spr.ox + pc.i) * G + o;
    items.push(item(x, x + pc.c.width * G, 0, DEPTH, GROUND_Y - pc.hi, GROUND_Y - pc.lo, () => {
      const blk = block(pc.c, DP, p);
      const X = spr.ox + pc.i + A(o);
      const Y = spr.oy + Math.floor((spr.ox + pc.i) / 2) + A(o) / 2;
      ctx.globalAlpha = (b.constructing ? 0.4 + 0.6 * b.progress : 1) * fade;
      ctx.drawImage(blk.c, X, Y - blk.oy);
      ctx.globalAlpha = 1;
      if (b.flash > 0) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(blk.c, X, Y - blk.oy);
        ctx.restore();
      }
      if (pc.i === 0) {
        // Health and selection, once per bridge, over its middle.
        const mx = (b.seg.x1 + b.seg.x2) / 2 + o;
        const my = Math.min(b.seg.y1, b.seg.y2);
        const [cx, cy] = art(mx, my, LANE_MID);
        if (b.selected) brackets(ctx, cx - 10, cy - 8, 20, 12);
        if (b.hp < b.maxHp || b.constructing) hpBar(ctx, cx - 8, cy - 12, 16, b.constructing ? b.progress : b.hp / b.maxHp);
      }
    }, { solid: true }));
  }
}

// ── Overlays ───────────────────────────────────────────────────────────────
// Outside the build zone the strip is dimmed; zone edges are dashed lines
// across the floor and up into the air. Zones are in tiles.
export function drawIsoZones(ctx, zones, v) {
  const [xa, xb] = visibleX(v);
  const quad = (x0, x1) => {
    const p = [art(x0, GROUND_Y, 0), art(x1, GROUND_Y, 0), art(x1, GROUND_Y, DEPTH), art(x0, GROUND_Y, DEPTH)];
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (const [X, Y] of p.slice(1)) ctx.lineTo(X, Y);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  let x = xa;
  for (const [from, to] of zones) {
    const z0 = from * TILE_SIZE;
    const z1 = to * TILE_SIZE;
    if (z0 > x) quad(x, Math.min(z0, xb));
    x = Math.max(x, z1);
  }
  if (x < xb) quad(x, xb);
  ctx.fillStyle = '#5ee03a';
  for (const [from, to] of zones) {
    for (const ex of [from * TILE_SIZE, to * TILE_SIZE]) {
      if (ex < xa || ex > xb) continue;
      for (let z = 0; z < DEPTH; z += 8) {
        const [X, Y] = art(ex, GROUND_Y, z);
        ctx.fillRect(X, Y, 2, 1);
      }
      for (const z of [0, DEPTH]) {
        const [X, Y] = art(ex, GROUND_Y, z);
        for (let k = 0; k < 200; k += 6) ctx.fillRect(X, Y - k, 1, 3);
      }
    }
  }
}

// Placement preview: a see-through block where the building would go, or
// the bridge's plank drawn along both edges of the strip.
export function drawIsoGhost(ctx, pl, renderGhost) {
  if (pl.seg || pl.point) {
    for (const z of pl.seg ? [DEPTH, 0] : [LANE_MID]) {
      ctx.save();
      // A shear maps the side-on drawing onto the plane z deep.
      const [X, Y] = art(0, 0, z);
      ctx.transform(1, 0.5, 0, 1, X, Y);
      ctx.globalAlpha = z ? 0.5 : 1;
      renderGhost(ctx, pl);
      ctx.restore();
    }
    return;
  }
  const type = pl.type || (pl.w === 1 ? 'wall' : '');
  const [z0, z1] = buildingZ({ type });
  const x0 = pl.tx * TILE_SIZE;
  const x1 = x0 + pl.w * TILE_SIZE;
  const yb = (pl.ty + pl.h) * TILE_SIZE;
  const yt = pl.ty * TILE_SIZE;
  const col = pl.valid ? '#5ee03a' : C.red;
  const P = (x, y, z) => art(x, y, z);
  const face = (pts, a) => {
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (const q of pts.slice(1)) ctx.lineTo(...q);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = col;
  face([P(x0, yt, z0), P(x1, yt, z0), P(x1, yb, z0), P(x0, yb, z0)], 0.3);
  face([P(x1, yt, z0), P(x1, yt, z1), P(x1, yb, z1), P(x1, yb, z0)], 0.2);
  face([P(x0, yt, z0), P(x1, yt, z0), P(x1, yt, z1), P(x0, yt, z1)], 0.4);
  ctx.globalAlpha = 1;
  // Dotted outline along the front face.
  for (const [a, b] of [[[x0, yt], [x1, yt]], [[x0, yb], [x1, yb]]]) {
    for (let x = a[0]; x < b[0]; x += 8) { const [X, Y] = P(x, a[1], z0); ctx.fillRect(X, Y, 2, 1); }
  }
  for (const x of [x0, x1]) {
    for (let y = yt; y < yb; y += 8) { const [X, Y] = P(x, y, z0); ctx.fillRect(X, Y, 1, 2); }
  }
}

// Order feedback, drawn on the plane the order pointed at.
export function drawIsoMarker(ctx, m, renderMarker) {
  at(ctx, m.x, m.y, m.z ?? LANE_MID, () => renderMarker(ctx, m));
}

// ── Picking ────────────────────────────────────────────────────────────────
// A tap at projected (X, Y) looks down a line of sight that runs from the
// front of the strip to the back: x = X - z, y = Y - X/2 + z. The first
// solid thing along it is what the tap points at.
export function isoRay(game, X, Y) {
  const map = game.map;
  for (let z = 0; z <= DEPTH; z += 2) {
    const x = X - z;
    const y = Y - X / 2 + z;
    const wx = game.normX(x);
    const tx = Math.floor(wx / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    if (ty >= 0 && ty < MAP_H && map.isSolid(tx, ty)) return { x, y: Math.max(ty * TILE_SIZE - 1, y - 4), z };
    for (const seg of map.rampsAt(wx)) {
      const ry = TileMap.rampY(seg, wx);
      if (ry != null && y >= ry - 2 && y <= ry + 10) return { x, y: ry - 1, z };
    }
  }
  // Nothing on the strip: aim at the ground plane, wherever that is.
  const z = Math.max(0, Math.min(DEPTH, GROUND_Y - Y + X / 2));
  return { x: X - z, y: Y - X / 2 + z, z };
}

// Is projected point (X, Y) on unit u's sprite (with `pad` slack)?
export function isoHitUnit(game, u, X, Y, pad) {
  const z = laneOf(u);
  for (const o of game.wrap ? [-WORLD_W, 0, WORLD_W] : [0]) {
    const fx = projX(u.x + o, z);
    const fy = projY(u.x + o, u.y, z);
    if (X >= fx - u.w / 2 - pad && X <= fx + u.w / 2 + pad && Y >= fy - u.h - pad && Y <= fy + pad) {
      return Math.hypot(X - fx, Y - (fy - u.h / 2));
    }
  }
  return null;
}

// Does the line of sight through (X, Y) pass through building b's block?
export function isoHitBuilding(game, b, X, Y, pad) {
  for (const o of game.wrap ? [-WORLD_W, 0, WORLD_W] : [0]) {
    if (b.seg) {
      for (let z = 0; z <= DEPTH; z += 4) {
        const x = X - z - o;
        const ry = TileMap.rampY(b.seg, x);
        if (ry != null && Math.abs(Y - X / 2 + z - (ry + 4)) <= 8 + pad) return true;
      }
      continue;
    }
    const [z0, z1] = buildingZ(b);
    // x and y both change by one per unit of depth along the line.
    const lo = Math.max(z0, X - o - (b.x + b.w) - pad, b.y - pad - (Y - X / 2));
    const hi = Math.min(z1, X - o - b.x + pad, b.y + b.h + pad - (Y - X / 2));
    if (lo <= hi) return true;
  }
  return false;
}
