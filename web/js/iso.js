// Isometric view: the battlefield drawn as a Syndicate-style diorama.
//
// Isometric games are played on their own map, a square field (see
// Game.field) with a fresh landscape each game (see terrain.js): x runs
// across it, z (depth) up it, and y is height as on the side-on map. It's seen from above at the classic 2:1 angle: x runs
// down-right across the screen, z runs up-right, and height is straight up.
// Buildings are carved from their usual side-on art into solid shapes with
// square footprints, and units become small voxel models that turn to face
// the way they're going.
//
// Projected world coordinates (what the camera pans over), in world units:
//   X = x + z,  Y = y + (x - z) / 2
// and in art pixels each is divided by G, with whole-pixel 2:1 steps.
import { TILE_SIZE, MAP_H, GROUND_LEVEL_TILE, FIELD_SIZE, FIELD_TILES } from './config.js';
import { G, T, C, A, canvas, hash, rect, team } from './pixel.js';
import {
  currentTheme, buildingSprite, unitSprite, tile, drawProjectile, drawEffects, brackets, hpBar, progressBar,
  drawFlag, drawFlagMarker, flagSpot,
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

// ── Solid buildings ────────────────────────────────────────────────────────
// A building's side-on art becomes a real 3D shape: the art is its outline
// seen from the front, and (mirrored) seen from the right as well, and the
// building is everything inside both outlines. A tower at one end of the
// art becomes a tower in a corner, a gable becomes a hipped roof, a flagpole
// a pole. Every visible face is then painted: walls with the art itself
// (darker on the right, which faces away from the light) and roofs in the
// colour just under the art's top edge, lit, with a little grain.
//
// The result is drawn into a canvas with a 1 px dark outline. Its front
// face's top-left corner sits at (0, oy), like the side-on art's top-left,
// and `front` / `col` say how deep the front surface is, so animations
// drawn on the art can be put on the right spot of the 3D shape.
function voxelHull(src) {
  const W = src.width;
  const Hs = src.height;
  const D = W;
  const d = src.getContext('2d').getImageData(0, 0, W, Hs).data;
  const solid2 = (x, row) => x >= 0 && x < W && row >= 0 && row < Hs && d[(row * W + x) * 4 + 3] >= 128;
  // Height h counts up from the ground; row counts down from the art's top.
  const row = (h) => Hs - 1 - h;
  const OY = Math.ceil(D / 2) + 2;
  const cw = W + D + 2;
  const ch = OY + Hs + Math.ceil(W / 2) + 3;
  const depth = new Float32Array(cw * ch).fill(-Infinity);
  const rgba = new Uint8ClampedArray(cw * ch * 4);
  const px = (x, y) => (x >= 0 && y >= 0 && x < W && y < Hs ? (y * W + x) * 4 : -1);
  // The first light colour inside the outline below (x, r), for roofs, so
  // dark trims and shadows in the art don't paint black stripes on top.
  const lum = (i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  const below = (x, r) => {
    for (let k = 1; k <= 4; k++) {
      const i = px(x, r + k);
      if (i < 0 || d[i + 3] < 128) break;
      if (lum(i) >= 56) return i;
    }
    return -1;
  };
  // The commonest roof colour for a roof at row r: a sign or stripe that
  // happens to sit on the art's top edge shouldn't paint a band across it.
  const tones = new Map();
  const roofTone = (r) => {
    if (tones.has(r)) return tones.get(r);
    const n = new Map();
    let best = -1, most = 0;
    for (let x = 0; x < W; x++) {
      if (!solid2(x, r) || solid2(x, r - 1)) continue;
      const i = below(x, r);
      if (i < 0) continue;
      const key = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4;
      const c = (n.get(key) || 0) + 1;
      n.set(key, c);
      if (c > most) { most = c; best = i; }
    }
    tones.set(r, best);
    return best;
  };
  const far = (i, j) => j >= 0 && Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]) > 90;
  // The art's own outline belongs to its silhouette; on a solid shape it
  // would draw black stripes down every slope, so each outline pixel takes
  // the colour of its nearest neighbour inside.
  const lineOf = new Int32Array(W * Hs).fill(-1);
  for (let y = 0; y < Hs; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] < 128 || lum(i) >= 56) continue;
      if ([1, 2].every((k) => solid2(x - k, y) && solid2(x + k, y) && solid2(x, y - k) && solid2(x, y + k))) continue;
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1], [0, 2], [-2, 0], [2, 0], [0, 3], [-3, 0], [3, 0]]) {
        const j = px(x + dx, y + dy);
        if (j >= 0 && d[j + 3] >= 128 && lum(j) >= 56) { lineOf[y * W + x] = j; break; }
      }
    }
  }
  const put = (X, Y, z0, i, f) => {
    if (i >= 0 && lineOf[i >> 2] >= 0) i = lineOf[i >> 2];
    X += 1;
    if (X < 0 || Y < 0 || X >= cw || Y >= ch || i < 0 || z0 < depth[Y * cw + X]) return;
    depth[Y * cw + X] = z0;
    const k = (Y * cw + X) * 4;
    rgba[k] = d[i] * f;
    rgba[k + 1] = d[i + 1] * f;
    rgba[k + 2] = d[i + 2] * f;
    rgba[k + 3] = 255;
  };
  // The side isn't the front again: it's walled with a doorless strip of the
  // front (the stretch of wall darkest-free near the ground, so usually a
  // window bay), repeated along it, with the art's own corners at each end.
  const side = sideColumns(d, W, Hs, lum);
  const sidePx = (c, r) => {
    const i = px(side[c], r);
    return i >= 0 && d[i + 3] >= 128 ? i : px(c, r);
  };
  const front = new Int16Array(W * Hs).fill(-1); // front surface depth per art pixel
  const m = new Uint8Array(W * Hs);
  for (let k = 0; k < W * Hs; k++) m[k] = d[k * 4 + 3] >= 128 ? 1 : 0;
  for (let r = 0; r < Hs; r++) {
    const h = row(r);
    const o = r * W;
    for (let x = 0; x < W; x++) {
      if (!m[o + x]) continue;
      const upX = r > 0 && m[o - W + x];
      for (let z = 0; z < D; z++) {
        const a = W - 1 - z;
        if (!m[o + a]) continue;
        // Faces show toward -z (front), +x (right) and up (roof).
        const showFront = z === 0 || !m[o + a + 1];
        const showRight = x === W - 1 || !m[o + x + 1];
        const showRoof = !upX || !m[o - W + a];
        if (front[o + x] < 0) front[o + x] = z;
        if (!showFront && !showRight && !showRoof) continue;
        const X = x + z;
        const Y = OY + Math.floor((x - z) / 2) + r;
        const near = x - z + h;
        if (showFront) put(X, Y, near, px(x, r), 0.92);
        if (showRight) put(X + 1, OY + Math.floor((x + 1 - z) / 2) + r, near + 0.4, sidePx(a, r), 0.68);
        if (showRoof) {
          // Whichever outline stops here gives the roof its colour.
          const p = upX ? a : x;
          let i = below(p, r);
          if (i < 0) i = below(p === x ? a : x, r);
          if (i < 0 || far(i, roofTone(r))) i = roofTone(r);
          if (i < 0) i = px(p, r);
          put(X, Y - 1, near + 0.6, i, 1.06 * (0.94 + 0.08 * hash(x * 31 + z * 7 + h)));
        }
      }
    }
  }
  // Column depth for things drawn above the shape (smoke, beacons).
  const col = new Int16Array(W).fill(-1);
  for (let x = 0; x < W; x++) for (let r = 0; r < Hs && col[x] < 0; r++) if (front[r * W + x] >= 0) col[x] = front[r * W + x];
  const filled = (X, Y) => X >= 0 && Y >= 0 && X < cw && Y < ch && rgba[(Y * cw + X) * 4 + 3] > 0;
  // Slopes step in whole pixels, which leaves pinholes between the steps:
  // fill each from a neighbour so they don't become outline.
  const NB = [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (let Y = 1; Y < ch; Y++) {
    for (let X = 0; X < cw; X++) {
      if (filled(X, Y)) continue;
      const near = (dx, dy) => filled(X + dx, Y + dy) || filled(X + 2 * dx, Y + 2 * dy);
      if (!(near(0, -1) && near(0, 1) && near(-1, 0) && near(1, 0))) continue;
      const [dx, dy] = NB.find(([dx, dy]) => filled(X + dx, Y + dy)) || [0, 0];
      if (!dx && !dy) continue;
      const k = (Y * cw + X) * 4;
      const a = ((Y + dy) * cw + X + dx) * 4;
      rgba[k] = rgba[a]; rgba[k + 1] = rgba[a + 1]; rgba[k + 2] = rgba[a + 2]; rgba[k + 3] = 255;
    }
  }
  // A dark outline round the whole shape.
  const out = new Uint8ClampedArray(rgba);
  for (let Y = 0; Y < ch; Y++) {
    for (let X = 0; X < cw; X++) {
      if (filled(X, Y)) continue;
      if (filled(X - 1, Y) || filled(X + 1, Y) || filled(X, Y - 1) || filled(X, Y + 1)) {
        const k = (Y * cw + X) * 4;
        out[k] = 24; out[k + 1] = 20; out[k + 2] = 18; out[k + 3] = 255;
      }
    }
  }
  const [c, g] = canvas(cw, ch);
  g.putImageData(new ImageData(out, cw, ch), 0, 0);
  return { c, oy: OY, ox: 1, front, col, W, Hs, D };
}

// Which column of the art paints each column of a building's side: the
// end columns keep their own (the corners), and the rest repeat the strip
// of wall with the least dark near the ground, where doors are.
function sideColumns(d, W, Hs, lum) {
  const map = Array.from({ length: W }, (_, c) => c);
  const edge = Math.min(2, Math.floor(W / 8));
  const L = Math.max(4, Math.floor(W / 3));
  if (W - 2 * edge < L + 2) return map;
  const low = Math.floor(Hs * 0.55);
  const dark = (c) => {
    let n = 0;
    for (let r = low; r < Hs; r++) {
      const i = (r * W + c) * 4;
      if (d[i + 3] >= 128 && lum(i) < 70) n++;
    }
    return n;
  };
  let best = edge;
  let least = Infinity;
  for (let a = edge; a + L <= W - edge; a++) {
    let n = 0;
    for (let c = a; c < a + L; c++) n += dark(c);
    if (n < least) { least = n; best = a; }
  }
  for (let c = edge; c < W - edge; c++) map[c] = best + ((c - edge) % L);
  return map;
}

// Cached per source art (render.js rebuilds that when the theme or sides
// change, so stale shapes simply stop being looked up).
const hulls = new WeakMap();
function hull(src) {
  let h = hulls.get(src);
  if (!h) hulls.set(src, (h = voxelHull(src)));
  return h;
}

// Animations and scaffolding are drawn by the theme onto a scratch canvas the
// size of the art, then each pixel is put on the front of the 3D shape (or,
// above it, over the middle of that column).
let scratch = null;
const MARGIN = 24;
function overlay(ctx, hl, X, Y, fn) {
  const { W, Hs } = hl;
  if (!scratch) {
    const c = document.createElement('canvas');
    scratch = [c, c.getContext('2d', { willReadFrequently: true })];
  }
  const [c, g] = scratch;
  if (c.width !== W || c.height !== Hs + MARGIN) { c.width = W; c.height = Hs + MARGIN; g.imageSmoothingEnabled = false; }
  g.clearRect(0, 0, c.width, c.height);
  fn(g, MARGIN);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  let last = '';
  for (let y = 0; y < c.height; y++) {
    const r = y - MARGIN;
    for (let x = 0; x < W; x++) {
      const k = (y * W + x) * 4;
      if (data[k + 3] === 0) continue;
      let z = r >= 0 ? hl.front[r * W + x] : -1;
      if (z < 0) z = hl.col[x] >= 0 ? hl.col[x] : hl.D >> 1;
      const style = `rgba(${data[k]},${data[k + 1]},${data[k + 2]},${data[k + 3] / 255})`;
      if (style !== last) { ctx.fillStyle = style; last = style; }
      ctx.fillRect(X + hl.ox + x + z, Y + Math.floor((x - z) / 2) + r, 1, 1);
    }
  }
}

// ── Units in 3D ───────────────────────────────────────────────────────────
// A unit's side-on sprite becomes a little voxel model: the sprite is its
// profile, and each part is given a thickness from how big it is (a body is
// thick, a gun barrel or a leg thin; vehicles are much wider than they are
// tall). The model is then turned to any of TURNS headings and drawn with
// the same lit faces and outline as the buildings, so a soldier shows his
// shoulders as he turns and a tank its hull.
const TURNS = 16;

function unitModel(src, ax, kind) {
  const W = src.width;
  const Hs = src.height;
  const d = src.getContext('2d').getImageData(0, 0, W, Hs).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < Hs && d[(y * W + x) * 4 + 3] >= 128;
  const lum = (i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  const col = new Int32Array(W * Hs).fill(-1);
  for (let k = 0; k < W * Hs; k++) if (d[k * 4 + 3] >= 128) col[k] = k * 4;
  // Thickness of each pixel from the runs of solid pixels through it.
  const hrun = new Uint8Array(W * Hs);
  const vrun = new Uint8Array(W * Hs);
  const hs = new Uint8Array(W * Hs);
  const vs = new Uint8Array(W * Hs);
  for (let y = 0; y < Hs; y++) {
    for (let x = 0; x < W;) {
      if (!solid(x, y)) { x++; continue; }
      let e = x;
      while (solid(e, y)) e++;
      for (let k = x; k < e; k++) { hrun[y * W + k] = e - x; hs[y * W + k] = x; }
      x = e;
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < Hs;) {
      if (!solid(x, y)) { y++; continue; }
      let e = y;
      while (solid(x, e)) e++;
      for (let k = y; k < e; k++) { vrun[k * W + x] = e - y; vs[k * W + x] = y; }
      y = e;
    }
  }
  let top = Hs;
  for (let i = 0; i < W * Hs && top === Hs; i++) if (col[i] >= 0) top = Math.floor(i / W);
  const half = new Float32Array(W * Hs);
  for (let y = 0; y < Hs; y++) {
    const f = (y - top) / Math.max(1, Hs - top);
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      if (col[k] < 0) continue;
      let t;
      if (kind === 'soldier') {
        // As thick as the part is big, with heads narrower than shoulders.
        t = Math.min(f < 0.32 ? 3 : 6, hrun[k], vrun[k]);
      } else if (kind === 'vehicle') {
        // Boxy and wider than tall; thin parts (barrels, poles) stay thin.
        // Upper works (turrets, cabs) are narrower than the hull, and dark
        // parts (barrels, tracks' teeth) no wider than they are tall.
        const dark = lum(col[k]) < 45;
        t = Math.min(Math.round(W * 0.45) * (f < 0.4 ? 0.55 : 1), hrun[k] * 0.6, vrun[k] <= 2 || dark ? vrun[k] : vrun[k] * 2.4);
      } else {
        // Aircraft are round: turned about their length where they're long
        // (fuselages, airships), about the upright where tall (balloons).
        const long = vrun[k] <= hrun[k];
        const r = (long ? vrun[k] : hrun[k]) / 2;
        const o = long ? y + 0.5 - vs[k] - r : x + 0.5 - hs[k] - r;
        t = 2 * Math.sqrt(Math.max(0, r * r - o * o)) + 0.5;
      }
      half[k] = Math.max(1, t) / 2;
    }
  }
  // Aeroplanes (long and slim, not helicopters) get wings: a thin slab out
  // both sides through the middle of the longest row of the body.
  if (kind === 'plane') {
    let row = -1;
    let len = 0;
    for (let y = 0; y < Hs; y++) for (let x = 0; x < W; x++) if (hrun[y * W + x] > len) { len = hrun[y * W + x]; row = y; }
    let deep = 0;
    for (let k = 0; k < W * Hs; k++) deep = Math.max(deep, Math.min(vrun[k], hrun[k]));
    if (row >= 0 && deep < W * 0.3) {
      let x0 = 0;
      while (col[row * W + x0] < 0) x0++;
      for (let x = x0 + Math.floor(len * 0.36); x < x0 + Math.floor(len * 0.6); x++) {
        const k = row * W + x;
        half[k] = Math.max(half[k], W * 0.42);
      }
    }
  }
  // The art's dark outline would make a thick part's top and ends black, so
  // there each outline pixel takes the nearest lighter colour inside (the
  // model gets its own outline when it's drawn). Thin parts keep theirs.
  const edge = (x, y) => !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)
    || !solid(x - 2, y) || !solid(x + 2, y) || !solid(x, y - 2) || !solid(x, y + 2);
  const paint = Int32Array.from(col);
  for (let y = 0; y < Hs; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      if (col[k] < 0 || half[k] < 1.5 || lum(col[k]) >= 45 || !edge(x, y)) continue;
      let best = -1;
      let bd = 99;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const dd = Math.abs(dx) + Math.abs(dy);
          if (dd >= bd || !solid(x + dx, y + dy)) continue;
          const j = col[(y + dy) * W + x + dx];
          if (lum(j) >= 45) { best = j; bd = dd; }
        }
      }
      if (best >= 0) paint[k] = best;
    }
  }
  col.set(paint);
  // Thin dark parts (gun barrels, poles) would vanish into the outline, so
  // they're drawn a little lighter.
  const boost = new Uint8Array(W * Hs);
  for (let k = 0; k < W * Hs; k++) if (col[k] >= 0 && half[k] <= 1.5 && lum(col[k]) < 45) boost[col[k] >> 2] = 1;
  return { W, Hs, d, col, half, boost, ax, views: [] };
}

function unitView(m, k) {
  if (m.views[k]) return m.views[k];
  const { W, Hs, d, col, half, boost, ax } = m;
  const R = Math.ceil(Math.max(ax, W - ax)) + 2;
  const N = 2 * R;
  const a = (k / TURNS) * Math.PI * 2;
  const fx = Math.cos(a);
  const fz = Math.sin(a);
  // Turned into an upright grid: voxel (i, j, row) holds a colour or -1.
  const grid = new Int32Array(N * N * Hs).fill(-1);
  const at = (i, j, r) => (i < 0 || j < 0 || i >= N || j >= N || r < 0 || r >= Hs ? -1 : grid[(r * N + j) * N + i]);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const px = i - R + 0.5;
      const pz = j - R + 0.5;
      const along = px * fx + pz * fz;
      const across = -px * fz + pz * fx;
      const x = Math.floor(ax + along);
      if (x < 0 || x >= W) continue;
      for (let r = 0; r < Hs; r++) {
        const s = r * W + x;
        if (col[s] >= 0 && Math.abs(across) < Math.max(0.75, half[s])) grid[(r * N + j) * N + i] = col[s];
      }
    }
  }
  const OY = R + 2;
  const cw = 2 * N + 3;
  const ch = OY + R + Hs + 3;
  const depth = new Float32Array(cw * ch).fill(-Infinity);
  const rgba = new Uint8ClampedArray(cw * ch * 4);
  const put = (X, Y, z0, i, f) => {
    X += 1;
    if (X < 0 || Y < 0 || X >= cw || Y >= ch || z0 < depth[Y * cw + X]) return;
    depth[Y * cw + X] = z0;
    const q = (Y * cw + X) * 4;
    const b = boost[i >> 2] ? 60 : 0;
    rgba[q] = (d[i] + b) * f;
    rgba[q + 1] = (d[i + 1] + b) * f;
    rgba[q + 2] = (d[i + 2] + b) * f;
    rgba[q + 3] = 255;
  };
  for (let r = 0; r < Hs; r++) {
    const h = Hs - 1 - r;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const c = at(i, j, r);
        if (c < 0) continue;
        const X = i + j;
        const Y = OY + Math.floor((i - j) / 2) + r;
        const near = i - j + h;
        if (at(i, j - 1, r) < 0) put(X, Y, near, c, 0.94);
        if (at(i + 1, j, r) < 0) put(X + 1, OY + Math.floor((i + 1 - j) / 2) + r, near + 0.4, c, 0.72);
        if (at(i, j, r - 1) < 0) put(X, Y - 1, near + 0.6, c, 1.08);
      }
    }
  }
  const filled = (X, Y) => X >= 0 && Y >= 0 && X < cw && Y < ch && rgba[(Y * cw + X) * 4 + 3] > 0;
  const out = new Uint8ClampedArray(rgba);
  let x0 = cw, x1 = 0, y0 = ch;
  for (let Y = 0; Y < ch; Y++) {
    for (let X = 0; X < cw; X++) {
      if (filled(X, Y)) continue;
      if (filled(X - 1, Y) || filled(X + 1, Y) || filled(X, Y - 1) || filled(X, Y + 1)) {
        const q = (Y * cw + X) * 4;
        out[q] = 24; out[q + 1] = 20; out[q + 2] = 18; out[q + 3] = 255;
        x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y);
      }
    }
  }
  const [c, g] = canvas(cw, ch);
  g.putImageData(new ImageData(out, cw, ch), 0, 0);
  // (ox, oy): where the unit's foot point falls on the canvas.
  return (m.views[k] = { c, ox: 2 * R + 1, oy: OY + m.ay, x0, x1, y0 });
}

const models = new WeakMap();
function modelOf(u, s) {
  let m = models.get(s.c);
  if (!m) {
    m = unitModel(s.c, s.ax, u.air ? (u.type === 'helicopter' ? 'air' : 'plane') : u.vehicle ? 'vehicle' : 'soldier');
    m.ay = s.ay;
    models.set(s.c, m);
  }
  return m;
}

// Which way each unit is turned, in radians on the field (0 is +x). It
// swings toward where the unit is heading, or toward what it's shooting at,
// at a few turns a second. Kept here, not on the unit: it's only looks.
const turns = new WeakMap();
const TURN_RATE = 9;
function headingOf(u, now) {
  let st = turns.get(u);
  if (!st) {
    st = { x: u.x, z: u.z, a: u.facing > 0 ? Math.PI / 4 : -3 * Math.PI / 4, t: now };
    turns.set(u, st);
  }
  const dt = Math.min(0.1, Math.max(0, (now - st.t) / 1000));
  st.t = now;
  const dx = u.x - st.x;
  const dz = u.z - st.z;
  let want = null;
  if (dx * dx + dz * dz > 0.01) want = Math.atan2(dz, dx);
  else if (u.state === 2 && u.target && !u.target.dead && u.aimAt) {
    const [tx, tz] = u.aimAt(u.target);
    if (Math.abs(tx - u.x) + Math.abs(tz - u.z) > 1) want = Math.atan2(tz - u.z, tx - u.x);
  } else if (Math.sign(Math.cos(st.a) + Math.sin(st.a)) !== u.facing) {
    // Turned round on screen with no other clue (an online guest's view).
    want = u.facing > 0 ? Math.PI / 4 : -3 * Math.PI / 4;
  }
  st.x = u.x;
  st.z = u.z;
  if (want != null) {
    let diff = want - st.a;
    diff -= Math.round(diff / (2 * Math.PI)) * 2 * Math.PI;
    const step = TURN_RATE * dt;
    st.a += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
  }
  return st.a;
}

// Draws unit u as its turned model with its foot at art pixel (x, y).
function drawUnit3d(ctx, u, x, y, hidden) {
  const a = headingOf(u, performance.now());
  const frame = Math.floor((u.x + (u.z || 0)) / 6) & 1;
  const s = unitSprite(u, frame, 1);
  const m = modelOf(u, s);
  const k = ((Math.round((a / (2 * Math.PI)) * TURNS) % TURNS) + TURNS) % TURNS;
  const v = unitView(m, k);
  const left = x - v.ox;
  const topY = y - v.oy;
  if (hidden) ctx.globalAlpha = 0.45;
  ctx.drawImage(v.c, left, topY);
  ctx.globalAlpha = 1;
  if (u.air && !hidden) spinners(ctx, u, m, k, x, y);
  if (u.flash > 0) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(v.c, left, topY);
    ctx.restore();
  }
  const w = Math.min(v.x1 - v.x0 + 1, 16);
  const top = topY + v.y0;
  const cx = left + Math.floor((v.x0 + v.x1) / 2);
  if (u.selected) brackets(ctx, left + v.x0 - 1, top - 1, v.x1 - v.x0 + 3, y - top + 3);
  if (u.hp < u.maxHp || u.selected) hpBar(ctx, cx - Math.floor(w / 2), top - 4, w, u.hp / u.maxHp);
}

// Rotors and propellers: the theme draws them on the side-on sprite, and
// each of their pixels is carried round with the model's heading.
let spinScratch = null;
function spinners(ctx, u, m, k, x, y) {
  const th = currentTheme();
  if (!th.rotor) return;
  const M = 24;
  if (!spinScratch) {
    const c = document.createElement('canvas');
    spinScratch = [c, c.getContext('2d', { willReadFrequently: true })];
  }
  const [c, g] = spinScratch;
  const cw = m.W + 2 * M;
  const ch = m.Hs + 2 * M;
  if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
  g.clearRect(0, 0, cw, ch);
  th.rotor(g, Object.create(u, { facing: { value: 1 } }), m.ax + M, m.ay + M);
  const data = g.getImageData(0, 0, cw, ch).data;
  const a = (k / TURNS) * Math.PI * 2;
  const kx = Math.cos(a) + Math.sin(a);
  const ky = (Math.cos(a) - Math.sin(a)) / 2;
  const wide = Math.max(1, Math.ceil(Math.abs(kx)));
  let last = '';
  for (let py = 0; py < ch; py++) {
    for (let px = 0; px < cw; px++) {
      const q = (py * cw + px) * 4;
      if (data[q + 3] === 0) continue;
      const along = px - M - m.ax + 0.5;
      const style = `rgba(${data[q]},${data[q + 1]},${data[q + 2]},${data[q + 3] / 255})`;
      if (style !== last) { ctx.fillStyle = style; last = style; }
      ctx.fillRect(x + Math.round(along * kx), y + Math.round(along * ky) + py - M - m.ay, wide, 1);
    }
  }
}

// ── Ground ─────────────────────────────────────────────────────────────────
// The landscape is painted once per game (and theme) into one big canvas:
// grass textured from the surface rows of the theme's ground tile and lit by
// its slopes, the river with sandy banks, roads, bridge decks, and the soil
// sides along the two front edges. Heights lift the paint straight up.
let groundKey = null;
const ground = {};
const mixRGB = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

// Per art pixel of the field, how far it is inside a stroke along `lines`
// (tile coordinates) of radius r tiles: 0 outside, up to 255 on the line.
function strokeMask(lines, r) {
  const m = new Uint8Array(FA * FA);
  const R = r * T;
  for (const line of lines) {
    let last = null;
    for (let i = 0; i < line.length; i += 1) {
      const cu = line[i][0] * T;
      const cw = line[i][1] * T;
      // Stamp a disc every quarter radius or so along the line.
      if (last && i < line.length - 1 && Math.hypot(cu - last[0], cw - last[1]) < R / 4) continue;
      last = [cu, cw];
      for (let w = Math.max(0, Math.floor(cw - R)); w <= Math.min(FA - 1, Math.ceil(cw + R)); w++) {
        for (let u = Math.max(0, Math.floor(cu - R)); u <= Math.min(FA - 1, Math.ceil(cu + R)); u++) {
          const d = Math.hypot(u - cu, w - cw);
          if (d > R) continue;
          const k = w * FA + u;
          const v = Math.round(255 * (1 - d / R)) + 1;
          if (v > m[k]) m[k] = Math.min(255, v);
        }
      }
    }
  }
  return m;
}

function groundArt(terrain) {
  const th = currentTheme();
  const key = `${th.id}|${terrain.seed}`;
  if (groundKey === key) return ground;
  groundKey = key;
  const mm = th.minimap;
  const srcs = [0, 1, 2, 3].map((v) => tile('dirtTop', v).getContext('2d').getImageData(0, 0, T, T).data);
  const soilAt = (k) => { const i = (Math.min(T - 1, 6 + k) * T + 3) * 4; return [srcs[0][i], srcs[0][i + 1], srcs[0][i + 2]]; };
  const soils = [0, 1, 2, 3, 4, 5, 6].map(soilAt);
  const soil = soils[0];
  const sand = mixRGB(soil, [214, 196, 150], 0.45);
  const road = mixRGB(soil, [138, 132, 120], 0.55);
  const deck = rgbOf(mm.bridge);
  const water = mixRGB([44, 104, 160], rgbOf(mm.sky), 0.25);

  // Heights of every art pixel (world units, up is positive).
  const hp = new Float32Array(FA * FA);
  for (let w = 0; w < FA; w++) for (let u = 0; u < FA; u++) hp[w * FA + u] = terrain.height(u * G, w * G);
  const M = Math.ceil(terrain.maxH / G) + 4; // room above for the hills
  const half = FA / 2;
  const [c, g] = canvas(2 * FA + 1, FA + M + LIP + 8);
  const img = g.createImageData(c.width, c.height);
  const o = img.data;
  const H = c.height;
  const put = (X, Y, rgb, f) => {
    if (Y < 0 || Y >= H) return;
    const k = (Y * c.width + X) * 4;
    o[k] = Math.min(255, rgb[0] * f);
    o[k + 1] = Math.min(255, rgb[1] * f);
    o[k + 2] = Math.min(255, rgb[2] * f);
    o[k + 3] = 255;
  };
  const river = terrain.river ? strokeMask([terrain.river.path], terrain.river.width + 0.15) : new Uint8Array(FA * FA);
  const banks = terrain.river ? strokeMask([terrain.river.path], terrain.river.width + 0.9) : river;
  const roads = strokeMask(terrain.roads, 1.0);
  const tileF = [];
  for (let n = 0; n < FIELD_TILES * FIELD_TILES; n++) tileF.push(0.94 + 0.06 * hash(n * 53 + 11));
  const rgb = [0, 0, 0];
  // The grass texture at (u, w), into rgb.
  const grassAt = (u, w) => {
    const tu = Math.floor(u / T);
    const tw = Math.floor(w / T);
    const sd = srcs[Math.floor(hash(tu * 97 + tw * 13) * 4)];
    const row = 1 + Math.floor(hash(u * 131 + w * 17) * 3);
    const col = (u + w * 3) % T;
    let i = (row * T + col) * 4;
    if (sd[i + 3] < 128) i = (1 * T + col) * 4;
    rgb[0] = sd[i]; rgb[1] = sd[i + 1]; rgb[2] = sd[i + 2];
  };
  const set = (c3) => { rgb[0] = c3[0]; rgb[1] = c3[1]; rgb[2] = c3[2]; };
  // Back to front (the viewer is toward +x, -z), so nearer ground paints over
  // the far side of a hill.
  for (let s = -(FA - 1); s < FA; s++) {
    for (let u = Math.max(0, s); u <= Math.min(FA - 1, FA - 1 + s); u++) {
      const w = u - s;
      const k = w * FA + u;
      const h = hp[k];
      const tu = Math.floor(u / T);
      const tw = Math.floor(w / T);
      // Light from the upper left of the screen: slopes facing -x and +z.
      const dx = hp[w * FA + Math.min(FA - 1, u + 1)] - hp[w * FA + Math.max(0, u - 1)];
      const dz = hp[Math.min(FA - 1, w + 1) * FA + u] - hp[Math.max(0, w - 1) * FA + u];
      let f = Math.max(0.72, Math.min(1.18, 1 - dx * 0.3 + dz * 0.3));
      const grain = 0.9 + 0.1 * hash(u * 7 + w * 389);
      const onRoad = roads[k] > 40;
      if (river[k] && onRoad) {
        // Bridge deck: planks across the road, a dark rail along each side.
        set(deck);
        f *= roads[k] < 70 ? 0.6 : (u + w) % 4 === 0 ? 0.78 : 0.95 + 0.05 * hash(u * 3 + w);
      } else if (river[k]) {
        set(water);
        const ripple = hash(Math.floor(u / 3) * 71 + w * 13) > 0.97;
        f = (ripple ? 1.25 : 1) * (0.92 + 0.08 * (river[k] / 255));
      } else if (onRoad) {
        set(road);
        f *= (roads[k] < 70 ? 0.85 : 1) * grain;
      } else if (banks[k]) {
        grassAt(u, w);
        const t = Math.min(1, banks[k] / 120);
        for (let n = 0; n < 3; n++) rgb[n] += (sand[n] - rgb[n]) * t;
        f *= grain;
      } else {
        grassAt(u, w);
        f *= 0.85 * tileF[tw * FIELD_TILES + tu] * grain;
        if (u % T === 0 || w % T === 0) f *= 0.93;
      }
      const X = u + w;
      const base = M + half + Math.floor((u - w) / 2);
      const Y = base - Math.round(h / G);
      // Fill a little way down so steep bits leave no gaps (nearer ground
      // paints over the rest); along the front edges, down to the plain.
      const edge = w === 0 || u === FA - 1;
      const bottom = edge ? base + LIP : Y + 2;
      put(X, Y, rgb, f);
      for (let y = Y + 1; y <= bottom; y++) {
        const side = edge ? (w === 0 ? 0.6 : 0.45) : f;
        put(X, y, edge ? soils[Math.min(6, y - Y)] : rgb, side);
      }
    }
  }
  g.putImageData(img, 0, 0);
  ground.field = c;
  ground.oy = M + half;
  return ground;
}

function darken(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * (1 - k));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Screen space in the art buffer: the plain everything stands on.
export function drawIsoBackground(ctx, bw, bh, camAX, camAY) {
  const pat = ctx.createPattern(plainTile(), 'repeat');
  ctx.save();
  ctx.translate(-camAX, -camAY + LIP);
  ctx.fillStyle = pat;
  ctx.fillRect(camAX, camAY - LIP, bw, bh);
  ctx.restore();
}
function plainTile() {
  const th = currentTheme();
  if (ground.tile && ground.tileTheme === th) return ground.tile;
  const [pc, pg] = canvas(2 * T, T);
  pg.fillStyle = darken(th.minimap.ground, 0.5);
  pg.fillRect(0, 0, 2 * T, T);
  pg.fillStyle = darken(th.minimap.ground, 0.4);
  for (let i = 0; i < T; i++) {
    pg.fillRect(2 * i, i, 2, 1);
    pg.fillRect(2 * i, T - 1 - i, 2, 1);
  }
  ground.tile = pc;
  ground.tileTheme = th;
  return pc;
}

// ── Trees and rocks ────────────────────────────────────────────────────────
// Little pixel trees in the theme's grass colour: pines and round trees, in
// three sizes. Each sprite's anchor (ax, ay) is the foot of the trunk.
function treeSprites() {
  const th = currentTheme();
  if (ground.trees && ground.treesTheme === th) return ground.trees;
  const leaf = mixRGB(rgbOf(th.minimap.surface), [20, 40, 20], 0.35);
  const css = (c, f = 1) => `rgb(${c.map((v) => Math.round(Math.min(255, v * f))).join(',')})`;
  const dark = css(leaf, 0.6);
  const mid = css(leaf);
  const lit = css(leaf, 1.3);
  const trunk = '#5a3c24';
  const out = [[], []];
  for (let s = 0; s < 3; s++) {
    // Pine: stacked triangles.
    {
      const w = 9 + s * 2;
      const h = 15 + s * 4;
      const [c, g] = canvas(w + 2, h + 2);
      g.fillStyle = trunk;
      g.fillRect(Math.floor(w / 2), h - 3, 2, 4);
      const layers = 3;
      for (let L = 0; L < layers; L++) {
        const top = Math.floor((L * (h - 4)) / (layers + 0.6));
        const bot = top + Math.floor((h - 3) / 2) + 1;
        for (let y = top; y < bot && y < h - 2; y++) {
          const half = Math.floor(((y - top + 1) / (bot - top)) * (w / 2 - L * 0.3));
          const cx = Math.floor(w / 2) + 1;
          g.fillStyle = dark;
          g.fillRect(cx - half - 1, y, 2 * half + 2, 1);
          g.fillStyle = mid;
          g.fillRect(cx - half, y, 2 * half, 1);
          g.fillStyle = lit;
          g.fillRect(cx - half, y, Math.max(1, half - 1), 1);
        }
      }
      out[0].push({ c, ax: Math.floor(w / 2) + 1, ay: h + 1 });
    }
    // Round tree: a trunk and a lumpy crown.
    {
      const r = 4 + s;
      const h = 2 * r + 5;
      const [c, g] = canvas(2 * r + 3, h + 1);
      g.fillStyle = trunk;
      g.fillRect(r, 2 * r - 1, 2, 6);
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const d = Math.hypot(x, y * 1.1);
          if (d > r + 0.3) continue;
          g.fillStyle = d > r - 0.8 ? dark : x + y < -r * 0.5 ? lit : hash(x * 7 + y * 13 + s) > 0.85 ? dark : mid;
          g.fillRect(r + 1 + x, r + 1 + y, 1, 1);
        }
      }
      out[1].push({ c, ax: r + 1, ay: h });
    }
  }
  // Rocks: grey boulders.
  out.rocks = [0, 1].map((s) => {
    const w = 5 + s * 3;
    const h = 3 + s * 2;
    const [c, g] = canvas(w, h);
    g.fillStyle = '#5f5d58';
    g.fillRect(0, 1, w, h - 1);
    g.fillRect(1, 0, w - 2, h);
    g.fillStyle = '#8a8780';
    g.fillRect(1, 1, w - 3, 1);
    return { c, ax: Math.floor(w / 2), ay: h };
  });
  ground.trees = out;
  ground.treesTheme = th;
  return out;
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

// Height of the ground at a field position (0 when there's no landscape).
export const liftAt = (game, x, z) => (game.terrain ? game.terrain.height(x, z) : 0);

// Draws the battlefield. ctx is the art buffer, already translated so art
// pixel (X, Y) of the projection lands in the right place; v is the view in
// projected world units.
export function drawIsoWorld(ctx, game, v) {
  const terrain = game.terrain;
  const gr = groundArt(terrain);
  const [fx, fy] = art(0, GROUND_Y, 0);
  ctx.drawImage(gr.field, fx, fy - gr.oy);
  const lift = (x, z) => terrain.height(x, z);

  // Only what's near the view (in projected units, with room for tall things).
  const near = (x, z, h = 0) => {
    const X = projX(x, z);
    const Y = projY(x, GROUND_Y, z);
    return X > v.x - 200 && X < v.x + v.w + 200 && Y > v.y - 60 && Y < v.y + v.h + h + 260;
  };
  const items = [];
  const covered = new Set();
  for (const b of game.buildings) {
    if (b.dead) continue;
    for (let z = b.tz; z < b.tz + b.wt; z++) for (let x = b.tx; x < b.tx + b.wt; x++) covered.add(z * FIELD_TILES + x);
    if (near(b.x + b.w / 2, b.z + b.d / 2, b.w + b.h)) items.push(buildingItem(ctx, b, terrain));
  }
  // Trees and rocks (not where something has been built).
  const sprites = treeSprites();
  const scenery = (list, pick, tall) => {
    for (const t of list) {
      if (covered.has(t.tz * FIELD_TILES + t.tx) || !near(t.x, t.z, 60)) continue;
      const h = lift(t.x, t.z);
      const s = pick(t);
      const [X, Y] = art(t.x, GROUND_Y - h, t.z);
      items.push(item(t.x - 5, t.x + 5, t.z - 5, t.z + 5, h, h + s.c.height * G, () => {
        if (tall) {
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(X - 4, Y - 1, 9, 2);
        }
        ctx.drawImage(s.c, X - s.ax, Y - s.ay);
      }, { solid: tall }));
    }
  };
  scenery(terrain.trees, (t) => sprites[t.kind][t.size], true);
  scenery(terrain.rocks, (t) => sprites.rocks[t.size], false);

  for (const u of game.units) {
    if (u.dead || !near(u.x, u.z, GROUND_Y - u.y + 40)) continue;
    const g0 = lift(u.x, u.z);
    const y = u.y - g0;
    const h = GROUND_Y - y;
    const z = u.z;
    // A shadow on the ground under it, so aircraft show where they are.
    const [sx, sy] = art(u.x, GROUND_Y - g0, z);
    const sw = Math.max(4, Math.round(u.w / G / (u.air ? 1.6 : 2)));
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(sx - sw / 2, sy - 1, sw, 2);
    ctx.fillRect(sx - sw / 2 + 1, sy - 2, sw - 2, 4);
    const [ux, uy] = art(u.x, y, z);
    items.push(item(u.x - 6, u.x + 6, z - 6, z + 6, h, h + u.h, () => drawUnit3d(ctx, u, ux, uy, false), {
      pts: [[u.x, z, h + 3], [u.x, z, h + u.h * 0.6]],
      xray: () => drawUnit3d(ctx, u, ux, uy, true),
    }));
  }
  for (const f of game.flags || []) {
    if (f.out) continue;
    const [x, fy, z, carried] = flagSpot(f);
    if (!near(x, z, 60)) continue;
    const y = fy - lift(x, z);
    const h = GROUND_Y - y;
    items.push(item(x - 4, x + 4, z - 4, z + 4, h, h + 36, () => at(ctx, x, y, z, () => drawFlag(ctx, f, x, y, carried))));
  }
  for (const e of game.effects || []) {
    const z = e.z || 0;
    if (!near(e.x, z)) continue;
    const y = e.y - lift(e.x, z);
    items.push(item(e.x - 8, e.x + 8, z - 8, z + 8, GROUND_Y - y, GROUND_Y - y + 6, () => at(ctx, e.x, y, z, () => drawEffects(ctx, [e]))));
  }
  for (const p of game.projectiles) {
    const z = p.z || 0;
    const y = p.y - lift(p.x, z);
    // Shots point the way they're moving on screen.
    const [X, Y] = art(p.x, y, z);
    if (p.isoAt && (X !== p.isoAt[0] || Y !== p.isoAt[1])) p.isoAngle = Math.atan2(Y - p.isoAt[1], X - p.isoAt[0]);
    p.isoAt = [X, Y];
    const shot = { ...p, y, angle: p.isoAngle ?? p.angle };
    items.push(item(p.x - 3, p.x + 3, z - 3, z + 3, GROUND_Y - y - 2, GROUND_Y - y + 2, () => at(ctx, p.x, y, z, () => drawProjectile(ctx, shot))));
  }

  // Units behind a building or tree show through it faintly.
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

function blocks3(b, [x, z, h]) {
  const lo = Math.max(1, b.x0 - x, z - b.z1, b.h0 - h);
  const hi = Math.min(b.x1 - x, z - b.z0, b.h1 - h);
  return lo < hi;
}

// Buildings stand on the highest ground under them, on a soil foundation
// down to the slope wherever it falls away.
function buildingItem(ctx, b, terrain) {
  const z0 = b.z;
  const z1 = b.z + b.d;
  const x = b.x;
  const [lo, hi] = terrain.span(b.tx, b.tz, b.wt);
  return item(x, x + b.w, z0, z1, lo, hi + b.h, () => {
    const s = buildingSprite(b);
    const d = Math.round((z1 - z0) / G);
    const blk = hull(s.c);
    const [X, Y] = art(x, b.y - hi, z0);
    if (hi - lo >= G) foundation(ctx, terrain, b, hi);
    const w = s.c.width;
    const h = s.c.height;
    const th = currentTheme();
    if (b.constructing) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(blk.c, X - blk.ox, Y - blk.oy);
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
        ctx.drawImage(blk.c, X - blk.ox, Y - blk.oy);
        ctx.restore();
      }
      overlay(ctx, blk, X - blk.ox, Y, (g, m) => th.construction(g, 0, m, w, h, b.progress));
      progressBar(ctx, X + Math.floor(w / 4), Y + h + Math.floor(w / 2) + 3, Math.ceil(w / 2), b.progress, C.yellow);
    } else {
      ctx.drawImage(blk.c, X - blk.ox, Y - blk.oy);
      overlay(ctx, blk, X - blk.ox, Y, (g, m) => th.animate(g, b, 0, m, w));
    }
    if (b.flash > 0) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(blk.c, X - blk.ox, Y - blk.oy);
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

function foundation(ctx, terrain, b, hi) {
  const T2 = TILE_SIZE;
  const top = GROUND_Y - hi;
  const face = (pts, shade) => {
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (const p of pts.slice(1)) ctx.lineTo(...p);
    ctx.closePath();
    ctx.fill();
  };
  const ground = (x, z) => art(x, GROUND_Y - terrain.height(Math.min(x, FIELD_SIZE - 1), Math.min(z, FIELD_SIZE - 1)), z);
  const soil = darken(currentTheme().minimap.ground, 0.15);
  const soilDark = darken(currentTheme().minimap.ground, 0.4);
  // Front face (along x at the near depth), then the right-hand face.
  const front = [art(b.x, top, b.z), art(b.x + b.w, top, b.z)];
  for (let i = b.wt; i >= 0; i--) front.push(ground(b.x + i * T2, b.z));
  face(front, soil);
  const side = [art(b.x + b.w, top, b.z), art(b.x + b.w, top, b.z + b.d)];
  for (let i = b.wt; i >= 0; i--) side.push(ground(b.x + b.w, b.z + i * T2));
  face(side, soilDark);
}

// ── Overlays ───────────────────────────────────────────────────────────────
// Outside the build zone the field is dimmed, and the zone's edge is dotted
// green. Zones are squares [x0, z0, x1, z1) in tiles.
export function drawIsoZones(ctx, game, zones, v) {
  const N = FIELD_TILES;
  const terrain = game.terrain;
  const inside = new Uint8Array(N * N);
  for (const [x0, z0, x1, z1] of zones) {
    for (let tz = z0; tz < z1; tz++) for (let tx = x0; tx < x1; tx++) inside[tz * N + tx] = 1;
  }
  const P = (tx, tz) => {
    const x = tx * TILE_SIZE;
    const z = tz * TILE_SIZE;
    return art(x, GROUND_Y - terrain.height(Math.min(x, FIELD_SIZE - 1), Math.min(z, FIELD_SIZE - 1)), z);
  };
  const seen = (tx, tz) => {
    const X = projX(tx * TILE_SIZE, tz * TILE_SIZE);
    const Y = projY(tx * TILE_SIZE, GROUND_Y, tz * TILE_SIZE);
    return X > v.x - 64 && X < v.x + v.w + 64 && Y > v.y - 64 && Y < v.y + v.h + 120;
  };
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  for (let tz = 0; tz < N; tz++) {
    for (let tx = 0; tx < N; tx++) {
      if (inside[tz * N + tx] || !seen(tx, tz)) continue;
      const q = [P(tx, tz), P(tx + 1, tz), P(tx + 1, tz + 1), P(tx, tz + 1)];
      ctx.moveTo(...q[0]);
      for (const pt of q.slice(1)) ctx.lineTo(...pt);
      ctx.closePath();
    }
  }
  ctx.fill();
  ctx.fillStyle = '#5ee03a';
  const isIn = (tx, tz) => tx >= 0 && tz >= 0 && tx < N && tz < N && inside[tz * N + tx];
  const dots = (x0, z0, x1, z1) => {
    const [ax, ay] = P(x0, z0);
    const [bx, by] = P(x1, z1);
    ctx.fillRect(ax, ay, 2, 1);
    ctx.fillRect(Math.round((ax + bx) / 2), Math.round((ay + by) / 2), 2, 1);
  };
  for (let tz = 0; tz < N; tz++) {
    for (let tx = 0; tx < N; tx++) {
      if (!inside[tz * N + tx] || !seen(tx, tz)) continue;
      if (!isIn(tx - 1, tz)) dots(tx, tz, tx, tz + 1);
      if (!isIn(tx + 1, tz)) dots(tx + 1, tz, tx + 1, tz + 1);
      if (!isIn(tx, tz - 1)) dots(tx, tz, tx + 1, tz);
      if (!isIn(tx, tz + 1)) dots(tx, tz + 1, tx + 1, tz + 1);
    }
  }
}

// Placement preview: a see-through block where the building would go,
// standing on the highest ground under it.
export function drawIsoGhost(ctx, game, pl) {
  const x0 = pl.tx * TILE_SIZE;
  const x1 = x0 + pl.w * TILE_SIZE;
  const z0 = pl.tz * TILE_SIZE;
  const z1 = z0 + pl.w * TILE_SIZE;
  const [, hi] = game.terrain.span(pl.tx, pl.tz, pl.w);
  const yb = GROUND_Y - hi;
  const yt = yb - pl.h * TILE_SIZE;
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
export function drawIsoMarker(ctx, game, m, renderMarker) {
  const z = m.z ?? 0;
  at(ctx, m.x, m.y - liftAt(game, m.x, z), z, () => renderMarker(ctx, m));
}

// ── Picking ────────────────────────────────────────────────────────────────
// The spot on the ground under projected point (X, Y), kept on the field.
// Along the line of sight, with d = x - z: x = (X + d) / 2, z = (X - d) / 2
// and y = Y - d / 2. Walk it from the viewer's end until it meets the hills.
export function isoRay(game, X, Y) {
  const terrain = game.terrain;
  const inField = (v) => v >= 0 && v <= FIELD_SIZE;
  const top = 2 * (Y - GROUND_Y + terrain.maxH) + 4;
  const flat = 2 * (Y - GROUND_Y);
  for (let d = top; d >= flat - 2; d -= 2) {
    const x = (X + d) / 2;
    const z = (X - d) / 2;
    if (!inField(x) || !inField(z)) continue;
    if (Y - d / 2 >= GROUND_Y - terrain.height(x, z)) return { x, y: GROUND_Y - 1, z };
  }
  const clamp = (v) => Math.max(1, Math.min(FIELD_SIZE - 1, v));
  return { x: clamp((X + flat) / 2), y: GROUND_Y - 1, z: clamp((X - flat) / 2) };
}

// Is projected point (X, Y) on unit u's sprite (with `pad` slack)?
export function isoHitUnit(game, u, X, Y, pad) {
  const fx = projX(u.x, u.z);
  const fy = projY(u.x, u.y - liftAt(game, u.x, u.z), u.z);
  if (X >= fx - u.w / 2 - pad && X <= fx + u.w / 2 + pad && Y >= fy - u.h - pad && Y <= fy + pad) {
    return Math.hypot(X - fx, Y - (fy - u.h / 2));
  }
  return null;
}

// Does the line of sight through (X, Y) pass through building b's block?
export function isoHitBuilding(game, b, X, Y, pad) {
  const [lo, hi] = game.terrain.span(b.tx, b.tz, b.wt);
  const y0 = b.y - hi;
  const y1 = b.y + b.h - lo;
  // Along the line, x falls and y rises by one per unit of depth.
  const a = Math.max(b.z - pad, X - (b.x + b.w) - pad, y0 - pad - (Y - X / 2));
  const c = Math.min(b.z + b.d + pad, X - b.x + pad, y1 + pad - (Y - X / 2));
  return a <= c;
}

// ── Minimap ────────────────────────────────────────────────────────────────
// The field as a diamond, the same way round as the view. Returns the
// mapping so taps on it can be turned back into field positions.
export function isoMinimapFrame(cw, ch) {
  const s = Math.min((cw - 4) / (2 * FIELD_SIZE), (ch - 4) / FIELD_SIZE);
  return { s, ox: (cw - 2 * FIELD_SIZE * s) / 2, oy: (ch - FIELD_SIZE * s) / 2 };
}

const miniCache = {};
export function drawIsoMinimap(ctx, game, cw, ch, v, zones = null) {
  const th = currentTheme();
  const terrain = game.terrain;
  const { s, ox, oy } = isoMinimapFrame(cw, ch);
  const P = (x, z) => [ox + (x + z) * s, oy + (FIELD_SIZE / 2 + (x - z) / 2) * s];
  const quad = (g, x0, z0, x1, z1) => {
    g.beginPath();
    g.moveTo(...P(x0, z0));
    g.lineTo(...P(x1, z0));
    g.lineTo(...P(x1, z1));
    g.lineTo(...P(x0, z1));
    g.closePath();
    g.fill();
  };
  // The landscape, drawn once: grass shaded by height, forests, water, roads.
  const key = `${th.id}|${terrain.seed}|${cw}|${ch}`;
  if (miniCache.key !== key) {
    const [c, g] = canvas(cw, ch);
    g.fillStyle = darken(th.minimap.ground, 0.5);
    g.fillRect(0, 0, cw, ch);
    const grass = rgbOf(th.minimap.surface);
    const water = mixRGB([44, 104, 160], rgbOf(th.minimap.sky), 0.25);
    const road = mixRGB(rgbOf(th.minimap.ground), [150, 144, 132], 0.5);
    const css = (c3, f = 1) => `rgb(${c3.map((v2) => Math.round(Math.min(255, v2 * f))).join(',')})`;
    const T2 = TILE_SIZE;
    for (let tz = 0; tz < FIELD_TILES; tz++) {
      for (let tx = 0; tx < FIELD_TILES; tx++) {
        const k = terrain.kindAt(tx, tz);
        const h = terrain.height((tx + 0.5) * T2, (tz + 0.5) * T2);
        g.fillStyle = k === 1 ? css(water) : k === 2 || k === 3 ? css(road)
          : css(grass, (0.75 + (h / (terrain.maxH || 1)) * 0.35) * (terrain.forest[tz * FIELD_TILES + tx] ? 0.68 : 1));
        quad(g, tx * T2 - 0.5 / s, tz * T2 - 0.5 / s, (tx + 1) * T2 + 0.5 / s, (tz + 1) * T2 + 0.5 / s);
      }
    }
    Object.assign(miniCache, { key, c });
  }
  ctx.drawImage(miniCache.c, 0, 0);
  if (zones) {
    ctx.fillStyle = 'rgba(0,255,102,0.28)';
    for (const [x0, z0, x1, z1] of zones) quad(ctx, x0 * TILE_SIZE, z0 * TILE_SIZE, x1 * TILE_SIZE, z1 * TILE_SIZE);
  }
  for (const b of game.buildings) {
    ctx.fillStyle = team(b.faction).main;
    const m = Math.max(0, (2.5 / s - b.w) / 2);
    quad(ctx, b.x - m, b.z - m, b.x + b.w + m, b.z + b.d + m);
  }
  for (const u of game.units) {
    ctx.fillStyle = team(u.faction).light;
    const [X, Y] = P(u.x, u.z);
    const r = u.vehicle || u.air ? 2 : 1.5;
    ctx.fillRect(Math.round(X - r), Math.round(Y - r), Math.ceil(2 * r), Math.ceil(2 * r));
  }
  for (const f of game.flags || []) {
    if (f.out) continue;
    const [x, , z] = flagSpot(f);
    drawFlagMarker(ctx, f, ...P(x, z));
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
