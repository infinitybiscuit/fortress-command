// Pixel-art toolkit shared by the renderer and the themes.
//
// One "art pixel" is G world units. Sprites are drawn with whole-pixel
// rectangles into small canvases and cached, so the world stays sharp when
// the low-resolution buffer is scaled up (see main.js).
import { TILE_SIZE, PLAYER_COLORS } from './config.js';

export const G = 2;              // world units per art pixel
export const T = TILE_SIZE / G;  // tile size in art pixels (16)
export const A = (v) => Math.round(v / G);

// The active theme's palette. Themes fill it in (see setPalette); shared code
// relies on O (outline), white, red, yellow and shadow.
export const C = {};

export const hex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`;
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Per-team colours. The theme's `teamBase` is the uniform/armour colour that
// gets a hint of the team colour, so armies read as troops first, teams second.
let teamBase = [0.36, 0.43, 0.2];
let roofBase = [0.6, 0.55, 0.4];
const teamCache = [];
export function team(f) {
  if (teamCache[f]) return teamCache[f];
  const c = PLAYER_COLORS[f % PLAYER_COLORS.length];
  const uni = mix(teamBase, c, 0.35);
  const roof = mix(c, roofBase, 0.25);
  teamCache[f] = {
    main: hex(c), light: hex(mix(c, [1, 1, 1], 0.4)), dark: hex(mix(c, [0, 0, 0], 0.35)),
    uni: hex(uni), uniDark: hex(mix(uni, [0, 0, 0], 0.35)), uniLight: hex(mix(uni, [1, 1, 1], 0.2)),
    roof: hex(roof), roofDark: hex(mix(roof, [0, 0, 0], 0.35)),
  };
  return teamCache[f];
}

export function setPalette(palette, base, roof) {
  for (const k of Object.keys(C)) delete C[k];
  Object.assign(C, palette);
  teamBase = base;
  roofBase = roof || [0.6, 0.55, 0.4];
  teamCache.length = 0;
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

// Draw parts as one silhouette with a 1px dark outline: an outline pass for
// every part first, then the fills, so only the outer edge is outlined.
// A part is [x, y, w, h, colour]; `details` are drawn on top without outline.
export function outlined(g, parts, details = []) {
  g.fillStyle = C.O;
  for (const [x, y, w, h] of parts) g.fillRect(x - 1, y - 1, w + 2, h + 2);
  for (const [x, y, w, h, col] of parts) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  for (const [x, y, w, h, col] of details) { g.fillStyle = col; g.fillRect(x, y, w, h); }
}

export function flip(src) {
  const [c, g] = canvas(src.width, src.height);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

export function rect(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

// Filled pixel disc (no anti-aliasing).
export function disc(ctx, cx, cy, r, col) {
  ctx.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

export function hash(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
