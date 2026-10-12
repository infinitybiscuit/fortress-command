// Isometric view: the battlefield drawn as a Syndicate-style diorama.
//
// Isometric games are played on their own map, a flat square field (see
// Game.field): x runs across it, z (depth) up it, and y is height as on the
// side-on map. It's seen from above at the classic 2:1 angle: x runs
// down-right across the screen, z runs up-right, and height is straight up.
// Buildings are extruded back from their usual side-on art into blocks with
// square footprints; units keep their sprites.
//
// Projected world coordinates (what the camera pans over), in world units:
//   X = x + z,  Y = y + (x - z) / 2
// and in art pixels each is divided by G, with whole-pixel 2:1 steps.
import { TILE_SIZE, MAP_H, GROUND_LEVEL_TILE, FIELD_SIZE, FIELD_TILES } from './config.js';
import { G, T, C, A, canvas, hash, rect, team } from './pixel.js';
import {
  currentTheme, buildingSprite, tile, drawUnit, drawProjectile, drawEffects, brackets, hpBar, progressBar,
} from './render.js';

export const GROUND_Y = (MAP_H - GROUND_LEVEL_TILE) * TILE_SIZE;
const FA = FIELD_SIZE / G;                    // the field's side in art pixels
const LIP = 6;                                // art px the field stands above the plain

// ── Projection ─────────────────────────────────────────────────────────────
export const projX = (x, z) => x + z;
export const projY = (x, y, z) => y + (x - z) / 2;
// Art-pixel position of a world point, snapped to the 2:1 pixel staircase.
function art(x, y, z) {
  const ax = Math.round(x / G);
  const az = Math.round(z / G);
  return [ax + az, Math.round(y / G) + Math.floor((ax - az) / 2)];
}
// The field's corners in projected units: left (x = z = 0), bottom, right, top.
export const FIELD_BOX = { x0: 0, x1: 2 * FIELD_SIZE, y0: GROUND_Y - FIELD_SIZE / 2, y1: GROUND_Y + FIELD_SIZE / 2 };

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
// The field is drawn once per theme into one big canvas: the floor textured
// from the surface rows of the theme's ground tile, with faint tile seams,
// and its two front edges showing a sliver of soil.
let groundKey = null;
const ground = {};
function groundArt() {
  const th = currentTheme();
  if (groundKey === th) return ground;
  groundKey = th;
  const mm = th.minimap;
  ground.plain = darken(mm.ground, 0.5);
  ground.grid = darken(mm.ground, 0.4);
  const srcs = [0, 1, 2, 3].map((v) => tile('dirtTop', v).getContext('2d').getImageData(0, 0, T, T).data);
  const half = FA / 2;
  const [c, g] = canvas(2 * FA + 1, FA + LIP + 2);
  const img = g.createImageData(c.width, c.height);
  const o = img.data;
  const put = (X, Y, sd, i, f) => {
    const k = (Y * c.width + X) * 4;
    o[k] = Math.min(255, sd[i] * f);
    o[k + 1] = Math.min(255, sd[i + 1] * f);
    o[k + 2] = Math.min(255, sd[i + 2] * f);
    o[k + 3] = 255;
  };
  const tileF = [];
  for (let n = 0; n < FIELD_TILES * FIELD_TILES; n++) tileF.push(0.94 + 0.06 * hash(n * 53 + 11));
  for (let u = 0; u < FA; u++) {
    for (let w = 0; w < FA; w++) {
      const tu = Math.floor(u / T);
      const tw = Math.floor(w / T);
      const sd = srcs[Math.floor(hash(tu * 97 + tw * 13) * 4)];
      const row = 1 + Math.floor(hash(u * 131 + w * 17) * 3);
      const col = (u + w * 3) % T;
      let i = (row * T + col) * 4;
      if (sd[i + 3] < 128) i = (1 * T + col) * 4;
      const seam = u % T === 0 || w % T === 0 ? 0.88 : 1;
      put(u + w, half + Math.floor((u - w) / 2), sd, i, 0.85 * seam * tileF[tu * FIELD_TILES + tw] * (0.88 + 0.12 * hash(u * 7 + w * 389)));
    }
  }
  // The front edges: x = 0..FA along z = 0, and z = 0..FA along x = FA.
  const soil = srcs[0];
  for (let k = 0; k < LIP; k++) {
    const i = ((Math.min(T - 1, 5 + k)) * T) * 4;
    for (let u = 0; u < FA; u++) put(u, half + Math.floor(u / 2) + 1 + k, soil, i + (u % T) * 4, 0.6);
    for (let w = 0; w <= FA; w++) put(FA + w, half + Math.floor((FA - w) / 2) + 1 + k, soil, i + (w % T) * 4, 0.45);
  }
  g.putImageData(img, 0, 0);
  ground.field = c;
  ground.oy = half;
  // The plain around the field: a dim tiled floor (one diamond per tile).
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

// ── The scene ──────────────────────────────────────────────────────────────
// Everything that stands on the field becomes an item with a world-space box
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
function at(ctx, x, y, z, fn) {
  const [X, Y] = art(x, y, z);
  ctx.save();
  ctx.translate(X - A(x), Y - A(y));
  fn();
  ctx.restore();
}

// Draws the battlefield. ctx is the art buffer, already translated so art
// pixel (X, Y) of the projection lands in the right place; v is the view in
// projected world units.
export function drawIsoWorld(ctx, game, v) {
  const gr = groundArt();
  const [fx, fy] = art(0, GROUND_Y, 0);
  ctx.drawImage(gr.field, fx, fy - gr.oy);

  // Only what's near the view (in projected units, with room for tall things).
  const near = (x, z, h = 0) => {
    const X = projX(x, z);
    const Y = projY(x, GROUND_Y, z);
    return X > v.x - 200 && X < v.x + v.w + 200 && Y > v.y - 60 && Y < v.y + v.h + h + 200;
  };
  const items = [];
  for (const b of game.buildings) {
    if (!b.dead && near(b.x + b.w / 2, b.z + b.d / 2, b.w + b.h)) items.push(buildingItem(ctx, b));
  }
  for (const u of game.units) {
    if (u.dead || !near(u.x, u.z, GROUND_Y - u.y + 40)) continue;
    const h = GROUND_Y - u.y;
    const z = u.z;
    // A shadow on the ground under it, so aircraft show where they are.
    const [sx, sy] = art(u.x, GROUND_Y, z);
    const sw = Math.max(4, Math.round(u.w / G / (u.air ? 1.6 : 2)));
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(sx - sw / 2, sy - 1, sw, 2);
    ctx.fillRect(sx - sw / 2 + 1, sy - 2, sw - 2, 4);
    items.push(item(u.x - 6, u.x + 6, z - 6, z + 6, h, h + u.h, () => at(ctx, u.x, u.y, z, () => drawUnit(ctx, u)), {
      pts: [[u.x, z, h + 3], [u.x, z, h + u.h * 0.6]],
      xray: () => at(ctx, u.x, u.y, z, () => drawUnit(ctx, u, true)),
    }));
  }
  for (const e of game.effects || []) {
    const z = e.z || 0;
    if (!near(e.x, z)) continue;
    items.push(item(e.x - 8, e.x + 8, z - 8, z + 8, GROUND_Y - e.y, GROUND_Y - e.y + 6, () => at(ctx, e.x, e.y, z, () => drawEffects(ctx, [e]))));
  }
  for (const p of game.projectiles) {
    const z = p.z || 0;
    // Shots point the way they're moving on screen.
    const [X, Y] = art(p.x, p.y, z);
    if (p.isoAt && (X !== p.isoAt[0] || Y !== p.isoAt[1])) p.isoAngle = Math.atan2(Y - p.isoAt[1], X - p.isoAt[0]);
    p.isoAt = [X, Y];
    const shot = { ...p, angle: p.isoAngle ?? p.angle };
    items.push(item(p.x - 3, p.x + 3, z - 3, z + 3, GROUND_Y - p.y - 2, GROUND_Y - p.y + 2, () => at(ctx, p.x, p.y, z, () => drawProjectile(ctx, shot))));
  }

  // Units behind a building show through it faintly.
  const order = sortScene(items);
  const hidden = [];
  for (let i = 0; i < order.length; i++) {
    const a = order[i];
    if (!a.pts) continue;
    for (let j = i + 1; j < order.length; j++) {
      const b = order[j];
      if (!b.solid || a.sx1 < b.sx0 || b.sx1 < a.sx0 || a.sy1 < b.sy0 || b.sy1 < a.sy0) continue;
      if (a.pts.some((pt) => blocks3(b, pt))) { hidden.push(a); break; }
    }
  }
  for (const it of order) it.draw();
  for (const it of hidden) it.xray();
}

// Does box b stand between point [x, z, h] and the viewer? The line of
// sight from the point runs toward +x, -z and up, one unit each per step.
function blocks3(b, [x, z, h]) {
  const lo = Math.max(1, b.x0 - x, z - b.z1, b.h0 - h);
  const hi = Math.min(b.x1 - x, z - b.z0, b.h1 - h);
  return lo < hi;
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

function buildingItem(ctx, b) {
  const z0 = b.z;
  const z1 = b.z + b.d;
  const x = b.x;
  const h0 = GROUND_Y - b.y - b.h;
  return item(x, x + b.w, z0, z1, h0, h0 + b.h, () => {
    const s = buildingSprite(b);
    const d = Math.round((z1 - z0) / G);
    const blk = block(s.c, d);
    const [X, Y] = art(x, b.y, z0);
    const w = s.c.width;
    const h = s.c.height;
    const th = currentTheme();
    if (b.constructing) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(blk.c, X, Y - blk.oy);
      ctx.globalAlpha = 1;
      const built = Math.round(h * b.progress);
      if (built > 0) {
        // Only the part that's gone up so far: clip to a block that tall.
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
      ctx.globalAlpha = 0.6;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(blk.c, X, Y - blk.oy);
      ctx.restore();
    }
    // Box corners on screen, for the overlays.
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
  }, { solid: true });
}

// ── Overlays ───────────────────────────────────────────────────────────────
// Outside the build zone the field is dimmed, and the zone's edge is dotted
// green. Zones are squares [x0, z0, x1, z1) in tiles.
export function drawIsoZones(ctx, zones) {
  const N = FIELD_TILES;
  const inside = new Uint8Array(N * N);
  for (const [x0, z0, x1, z1] of zones) {
    for (let tz = z0; tz < z1; tz++) for (let tx = x0; tx < x1; tx++) inside[tz * N + tx] = 1;
  }
  const P = (tx, tz) => art(tx * TILE_SIZE, GROUND_Y, tz * TILE_SIZE);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  for (let tz = 0; tz < N; tz++) {
    let tx = 0;
    while (tx < N) {
      if (inside[tz * N + tx]) { tx++; continue; }
      const a = tx;
      while (tx < N && !inside[tz * N + tx]) tx++;
      const q = [P(a, tz), P(tx, tz), P(tx, tz + 1), P(a, tz + 1)];
      ctx.moveTo(...q[0]);
      for (const pt of q.slice(1)) ctx.lineTo(...pt);
      ctx.closePath();
    }
  }
  ctx.fill();
  ctx.fillStyle = '#5ee03a';
  const isIn = (tx, tz) => tx >= 0 && tz >= 0 && tx < N && tz < N && inside[tz * N + tx];
  const dots = (x0, z0, x1, z1) => {
    for (let k = 0; k < 4; k += 2) {
      const [X, Y] = art((x0 + (x1 - x0) * k / 4) * TILE_SIZE, GROUND_Y, (z0 + (z1 - z0) * k / 4) * TILE_SIZE);
      ctx.fillRect(X, Y, 2, 1);
    }
  };
  for (let tz = 0; tz < N; tz++) {
    for (let tx = 0; tx < N; tx++) {
      if (!inside[tz * N + tx]) continue;
      if (!isIn(tx - 1, tz)) dots(tx, tz, tx, tz + 1);
      if (!isIn(tx + 1, tz)) dots(tx + 1, tz, tx + 1, tz + 1);
      if (!isIn(tx, tz - 1)) dots(tx, tz, tx + 1, tz);
      if (!isIn(tx, tz + 1)) dots(tx, tz + 1, tx + 1, tz + 1);
    }
  }
}

// Placement preview: a see-through block where the building would go.
export function drawIsoGhost(ctx, pl) {
  const x0 = pl.tx * TILE_SIZE;
  const x1 = x0 + pl.w * TILE_SIZE;
  const z0 = pl.tz * TILE_SIZE;
  const z1 = z0 + pl.w * TILE_SIZE;
  const yb = GROUND_Y;
  const yt = GROUND_Y - pl.h * TILE_SIZE;
  const P = (x, y, z) => art(x, y, z);
  const face = (pts, a) => {
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (const q of pts.slice(1)) ctx.lineTo(...q);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = pl.valid ? '#5ee03a' : C.red;
  face([P(x0, yb, z0), P(x1, yb, z0), P(x1, yb, z1), P(x0, yb, z1)], 0.35);
  face([P(x0, yt, z0), P(x1, yt, z0), P(x1, yb, z0), P(x0, yb, z0)], 0.3);
  face([P(x1, yt, z0), P(x1, yt, z1), P(x1, yb, z1), P(x1, yb, z0)], 0.2);
  face([P(x0, yt, z0), P(x1, yt, z0), P(x1, yt, z1), P(x0, yt, z1)], 0.4);
  ctx.globalAlpha = 1;
  // Dotted outline round the footprint.
  for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x0, z1, x1, z1], [x0, z0, x0, z1]]) {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 8));
    for (let i = 0; i < n; i++) {
      const [X, Y] = P(ax + ((bx - ax) * i) / n, yb, az + ((bz - az) * i) / n);
      ctx.fillRect(X, Y, 2, 1);
    }
  }
}

// Order feedback, drawn where the order pointed.
export function drawIsoMarker(ctx, m, renderMarker) {
  at(ctx, m.x, m.y, m.z ?? 0, () => renderMarker(ctx, m));
}

// ── Picking ────────────────────────────────────────────────────────────────
// The spot on the ground under projected point (X, Y), kept on the field.
// The line of sight through it is x = X - z, y = Y - X/2 + z.
export function isoRay(X, Y) {
  const k = 2 * (Y - GROUND_Y);
  const clamp = (v) => Math.max(1, Math.min(FIELD_SIZE - 1, v));
  return { x: clamp((X + k) / 2), y: GROUND_Y - 1, z: clamp((X - k) / 2) };
}

// Is projected point (X, Y) on unit u's sprite (with `pad` slack)?
export function isoHitUnit(u, X, Y, pad) {
  const fx = projX(u.x, u.z);
  const fy = projY(u.x, u.y, u.z);
  if (X >= fx - u.w / 2 - pad && X <= fx + u.w / 2 + pad && Y >= fy - u.h - pad && Y <= fy + pad) {
    return Math.hypot(X - fx, Y - (fy - u.h / 2));
  }
  return null;
}

// Does the line of sight through (X, Y) pass through building b's block?
export function isoHitBuilding(b, X, Y, pad) {
  // Along the line, x falls and y rises by one per unit of depth.
  const lo = Math.max(b.z - pad, X - (b.x + b.w) - pad, b.y - pad - (Y - X / 2));
  const hi = Math.min(b.z + b.d + pad, X - b.x + pad, b.y + b.h + pad - (Y - X / 2));
  return lo <= hi;
}

// ── Minimap ────────────────────────────────────────────────────────────────
// The field as a diamond, the same way round as the view. Returns the
// mapping so taps on it can be turned back into field positions.
export function isoMinimapFrame(cw, ch) {
  const s = Math.min((cw - 4) / (2 * FIELD_SIZE), (ch - 4) / FIELD_SIZE);
  return { s, ox: (cw - 2 * FIELD_SIZE * s) / 2, oy: (ch - FIELD_SIZE * s) / 2 };
}

export function drawIsoMinimap(ctx, game, cw, ch, v, zones = null) {
  const th = currentTheme();
  const { s, ox, oy } = isoMinimapFrame(cw, ch);
  const P = (x, z) => [ox + (x + z) * s, oy + (FIELD_SIZE / 2 + (x - z) / 2) * s];
  const quad = (x0, z0, x1, z1) => {
    ctx.beginPath();
    ctx.moveTo(...P(x0, z0));
    ctx.lineTo(...P(x1, z0));
    ctx.lineTo(...P(x1, z1));
    ctx.lineTo(...P(x0, z1));
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = groundArt().plain;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = th.minimap.surface;
  quad(0, 0, FIELD_SIZE, FIELD_SIZE);
  if (zones) {
    ctx.fillStyle = 'rgba(0,255,102,0.28)';
    for (const [x0, z0, x1, z1] of zones) quad(x0 * TILE_SIZE, z0 * TILE_SIZE, x1 * TILE_SIZE, z1 * TILE_SIZE);
  }
  for (const b of game.buildings) {
    ctx.fillStyle = team(b.faction).main;
    const m = Math.max(0, (2.5 / s - b.w) / 2);
    quad(b.x - m, b.z - m, b.x + b.w + m, b.z + b.d + m);
  }
  for (const u of game.units) {
    ctx.fillStyle = team(u.faction).light;
    const [X, Y] = P(u.x, u.z);
    const r = u.vehicle || u.air ? 2 : 1.5;
    ctx.fillRect(Math.round(X - r), Math.round(Y - r), Math.ceil(2 * r), Math.ceil(2 * r));
  }
  // The part of the field on screen.
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  const corners = [[v.x, v.y], [v.x + v.w, v.y], [v.x + v.w, v.y + v.h], [v.x, v.y + v.h]];
  ctx.save();
  ctx.beginPath();
  ctx.rect(1, 1, cw - 2, ch - 2);
  ctx.clip();
  ctx.beginPath();
  corners.forEach(([X, Y], i) => {
    const p = [ox + X * s, oy + (Y - GROUND_Y + FIELD_SIZE / 2) * s];
    if (i) ctx.lineTo(...p); else ctx.moveTo(...p);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
