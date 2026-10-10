// Canvas 2D renderer. Ported from godot/scripts/autoload/game_renderer.gd.
import {
  TILE_SIZE, MAP_W, MAP_H, WORLD_W, WORLD_H, UNIT_W, UNIT_H, PLAYER_COLORS, BUILDING_TYPES,
  TILE_EMPTY, TILE_GROUND, TILE_PLATFORM, TILE_BRIDGE, TILE_RAMP,
} from './config.js';

const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WHITE = [1, 1, 1];
const BLACK = [0, 0, 0];
const tint = (f, t) => lerp(PLAYER_COLORS[f % 4], WHITE, t);
const shade = (f, t) => lerp(PLAYER_COLORS[f % 4], BLACK, t);


function hpColor(r) { return r > 0.5 ? '#5ee03a' : r > 0.25 ? '#f2c230' : '#e8402a'; }

function line(ctx, x1, y1, x2, y2, color, w) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function poly(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

function hpBar(ctx, x, y, w, ratio) {
  rect(ctx, x - 1, y - 1, w + 2, 5, '#1b1a12');
  rect(ctx, x, y, w * ratio, 3, hpColor(ratio));
}

// ── Palette (90s home-computer war game: bright, saturated, chunky) ────────
export const PAL = {
  sky: ['#4f9fe8', '#68b2ef', '#83c3f3', '#9fd3f6', '#bde3f8'],
  cloud: '#f4f8ff', cloudShade: '#cfdcef',
  hillFar: '#5a9a4a', hillNear: '#3f7d34',
  jungle: '#2c6528', jungleDark: '#1f4a1d', trunk: '#5b3a1f',
  grass: '#4cb83a', grassLight: '#86df4f', grassDark: '#2d7a24',
  dirt: '#9a6232', dirtDark: '#7a4a24', dirtDeep: '#5c361a', pebble: '#b98a55',
  rock: '#8f7f62', rockDark: '#66583f', rockLight: '#ad9c7a',
  outline: '#1b1a12', skin: '#f2c08a', skinDark: '#c98f5a', olive: [0.36, 0.43, 0.2],
  sand: '#d6b77a', sandDark: '#a88a52',
};

// Cheap deterministic hash for per-tile / per-index decoration.
function hash(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// ── Background (drawn in screen space, behind the world) ──────────────────
// Parallax layers repeat with periods that divide WORLD_W × factor, so the
// scenery lines up seamlessly when a looping map wraps.
export function drawBackground(ctx, w, h, cam, scale) {
  // Banded sky — flat colour steps instead of a smooth gradient.
  const bands = PAL.sky.length;
  const groundScreen = (WORLD_H - 3 * TILE_SIZE - cam.y) * scale;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = PAL.sky[i];
    const y0 = Math.floor((groundScreen * i) / bands);
    ctx.fillRect(0, y0, w, Math.ceil(groundScreen / bands) + 1);
  }
  ctx.fillStyle = PAL.sky[bands - 1];
  ctx.fillRect(0, groundScreen, w, h);

  // Clouds (very slow)
  const cp = 0.15;
  const cPeriod = (WORLD_W * cp) / 8;
  const cOff = cam.x * cp * scale;
  for (let i = Math.floor(cOff / (cPeriod * scale)) - 1; i * cPeriod * scale - cOff < w + 80; i++) {
    const k = ((i % 8) + 8) % 8;
    const cx = i * cPeriod * scale - cOff + hash(k) * 60;
    const cy = (20 + hash(k + 11) * 70) * scale - cam.y * 0.1 * scale;
    const cw = (50 + hash(k + 5) * 50) * scale;
    ctx.fillStyle = PAL.cloudShade;
    ctx.fillRect(cx, cy + 6 * scale, cw, 8 * scale);
    ctx.fillStyle = PAL.cloud;
    ctx.fillRect(cx + 6 * scale, cy, cw - 12 * scale, 10 * scale);
    ctx.fillRect(cx + cw * 0.3, cy - 6 * scale, cw * 0.35, 8 * scale);
  }

  // Rolling hills (two layers)
  const hillLayer = (p, color, amp, base, periods) => {
    const period = (WORLD_W * p) / periods;
    ctx.fillStyle = color;
    const step = 3;
    for (let sx = 0; sx < w + step; sx += step) {
      const wx = sx / scale + cam.x * p;
      const t = (wx / period) * Math.PI * 2;
      const hh = amp * (0.55 + 0.3 * Math.sin(t) + 0.15 * Math.sin(t * 3 + 1.3));
      const top = groundScreen - (base + hh) * scale;
      ctx.fillRect(sx, top, step, h - top);
    }
  };
  hillLayer(0.25, PAL.hillFar, 90, 30, 5);
  hillLayer(0.4, PAL.hillNear, 60, 10, 8);

  // Jungle treeline (palms and broadleaf trees)
  const jp = 0.6;
  const count = 64;
  const spacing = (WORLD_W * jp) / count;
  const jOff = cam.x * jp;
  const first = Math.floor((jOff - 60) / spacing);
  for (let i = first; (i * spacing - jOff) * scale < w + 60; i++) {
    const k = ((i % count) + count) % count;
    const bx = (i * spacing - jOff + hash(k) * spacing * 0.6) * scale;
    const th = (40 + hash(k + 3) * 50) * scale;
    const baseY = groundScreen + 2;
    ctx.fillStyle = PAL.trunk;
    ctx.fillRect(bx - 2 * scale, baseY - th, 4 * scale, th);
    if (hash(k + 7) < 0.5) {
      // Palm: fronds as chunky slabs
      ctx.fillStyle = PAL.jungle;
      for (const [dx, dy, fw] of [[-18, 0, 18], [2, 0, 18], [-12, -6, 24], [-10, 4, 8], [4, 4, 8]]) {
        ctx.fillRect(bx + dx * scale, baseY - th + dy * scale, fw * scale, 5 * scale);
      }
      ctx.fillStyle = PAL.jungleDark;
      ctx.fillRect(bx - 18 * scale, baseY - th + 4 * scale, 6 * scale, 4 * scale);
      ctx.fillRect(bx + 14 * scale, baseY - th + 4 * scale, 6 * scale, 4 * scale);
    } else {
      // Broadleaf: stacked blobs
      const r = (16 + hash(k + 9) * 10) * scale;
      ctx.fillStyle = PAL.jungleDark;
      ctx.fillRect(bx - r, baseY - th - r * 0.2, r * 2, r * 1.2);
      ctx.fillStyle = PAL.jungle;
      ctx.fillRect(bx - r * 0.8, baseY - th - r * 0.6, r * 1.6, r * 1.1);
      ctx.fillRect(bx - r * 0.4, baseY - th - r, r * 0.9, r * 0.6);
    }
  }
}

// ── Terrain tiles ──────────────────────────────────────────────────────────
export function drawTerrain(ctx, map, view) {
  const l = Math.floor(view.x / TILE_SIZE);
  const r = Math.ceil((view.x + view.w) / TILE_SIZE) + 1;
  const t = Math.max(0, Math.floor(view.y / TILE_SIZE));
  const b = Math.min(MAP_H, Math.ceil((view.y + view.h) / TILE_SIZE) + 1);
  const T = TILE_SIZE;
  for (let tx = Math.max(map.wrap ? l : 0, l); tx < (map.wrap ? r : Math.min(MAP_W, r)); tx++) {
    for (let ty = t; ty < b; ty++) {
      const tile = map.get(tx, ty);
      if (tile === TILE_EMPTY || tile === TILE_RAMP || tile === TILE_BRIDGE) continue;
      const x = tx * T;
      const y = ty * T;
      const seed = (((tx % MAP_W) + MAP_W) % MAP_W) * 131 + ty * 7;
      const surface = map.get(tx, ty - 1) === TILE_EMPTY;
      if (tile === TILE_GROUND) {
        const depth = ty - map.groundTop;
        rect(ctx, x, y, T + 0.6, T + 0.6, depth >= 2 ? PAL.dirtDeep : depth === 1 ? PAL.dirtDark : PAL.dirt);
        for (let i = 0; i < 5; i++) {
          rect(ctx, x + hash(seed + i) * (T - 4), y + 6 + hash(seed + i + 20) * (T - 10), 3, 2,
            hash(seed + i + 40) < 0.5 ? PAL.pebble : PAL.dirtDeep);
        }
      } else {
        // Floating rock ledge
        rect(ctx, x, y, T + 0.6, T, PAL.rock);
        rect(ctx, x, y + T - 6, T + 0.6, 6, PAL.rockDark);
        rect(ctx, x + hash(seed) * 20, y + 12, 8, 3, PAL.rockLight);
        rect(ctx, x + hash(seed + 1) * 22, y + 19, 6, 2, PAL.rockDark);
        if (map.get(tx - 1, ty) !== TILE_PLATFORM) rect(ctx, x, y, 3, T, PAL.rockDark);
        if (map.get(tx + 1, ty) !== TILE_PLATFORM) rect(ctx, x + T - 3, y, 3, T, PAL.rockDark);
      }
      if (surface) {
        // Grass top with tufts
        rect(ctx, x, y, T + 0.6, 7, PAL.grass);
        rect(ctx, x, y, T + 0.6, 2, PAL.grassLight);
        rect(ctx, x, y + 7, T + 0.6, 2, PAL.grassDark);
        for (let i = 0; i < 3; i++) {
          const gx = x + hash(seed + 60 + i) * (T - 3);
          rect(ctx, gx, y - 3, 2, 3, PAL.grass);
          rect(ctx, gx + 2, y - 2, 1, 2, PAL.grassLight);
        }
        if (tile === TILE_GROUND && hash(seed + 90) < 0.12) {
          // The odd red flower in the grass
          rect(ctx, x + 10, y - 5, 3, 3, '#e8402a');
          rect(ctx, x + 11, y - 2, 1, 2, PAL.grassDark);
        }
      }
    }
  }
}

// ── Units ──────────────────────────────────────────────────────────────────
export function drawUnit(ctx, u) {
  if (u.air) { drawAircraft(ctx, u); return; }
  if (u.vehicle) { drawVehicle(ctx, u); return; }
  drawSoldier(ctx, u);
  if (u.flash > 0) rect(ctx, u.x - 8, u.y - UNIT_H, 16, UNIT_H, 'rgba(255,255,255,0.6)');
  if (u.selected) selectBrackets(ctx, u.x - UNIT_W / 2 - 3, u.y - UNIT_H - 3, UNIT_W + 6, UNIT_H + 6);
  if (u.hp < u.maxHp || u.selected) hpBar(ctx, u.x - UNIT_W / 2, u.y - UNIT_H - 9, UNIT_W, u.hp / u.maxHp);
}

// Little big-headed soldier with dark outlines, drawn facing right and mirrored.
function drawSoldier(ctx, u) {
  const f = u.faction;
  const team = PLAYER_COLORS[f];
  const uniform = css(lerp(PAL.olive, team, 0.35));
  const uniformDark = css(lerp(lerp(PAL.olive, team, 0.35), BLACK, 0.35));
  const helmet = css(lerp(team, BLACK, 0.1));
  const helmetLight = css(lerp(team, WHITE, 0.35));
  const heavy = u.type === 'heavy';

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(u.x - 8, u.y - 1, 16, 3);

  ctx.save();
  ctx.translate(u.x, u.y);
  ctx.scale(u.facing, 1);
  // Walking cycle: legs alternate as the soldier moves.
  const step = (Math.floor(u.x / 5) & 1) ? 1 : -1;
  const O = PAL.outline;
  const box = (x, y, w, h, fill) => { rect(ctx, x - 1, y - 1, w + 2, h + 2, O); rect(ctx, x, y, w, h, fill); };

  // Legs + boots
  box(-5 + step, -9, 4, 8, uniformDark);
  box(1 - step, -9, 4, 8, uniformDark);
  rect(ctx, -6 + step, -2, 6, 2, O);
  rect(ctx, 0 - step, -2, 6, 2, O);
  // Body
  const bw = heavy ? 14 : 11;
  box(-bw / 2, -18, bw, 10, uniform);
  rect(ctx, -bw / 2, -10, bw, 2, uniformDark); // belt
  if (heavy) rect(ctx, -5, -17, 10, 6, '#3b3b2a'); // flak vest
  if (u.type === 'engineer') rect(ctx, -bw / 2, -14, bw, 2, '#f2c230'); // hi-vis stripe
  // Weapon
  if (u.type === 'sniper') { rect(ctx, -2, -15, 18, 2, O); rect(ctx, 6, -17, 4, 2, O); }
  else if (u.type === 'engineer') { rect(ctx, 3, -14, 7, 2, '#9a9a9a'); rect(ctx, 9, -16, 2, 5, '#9a9a9a'); }
  else if (heavy) { rect(ctx, 0, -15, 13, 4, O); rect(ctx, 11, -14, 3, 2, '#555'); }
  else rect(ctx, 0, -15, 12, 2, O);
  // Arm
  box(1, -16, 4, 3, uniform);
  // Big round head
  ctx.fillStyle = O;
  ctx.beginPath(); ctx.arc(0, -23, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.skin;
  ctx.beginPath(); ctx.arc(0, -23, 5.5, 0, Math.PI * 2); ctx.fill();
  rect(ctx, 2, -24, 2, 2, O); // eye
  rect(ctx, -3, -20, 4, 1, PAL.skinDark);
  // Headgear by role
  if (u.type === 'scout') {
    rect(ctx, -6, -28, 11, 3, helmet); // bandana
    rect(ctx, -9, -27, 4, 2, helmet);
  } else if (u.type === 'engineer') {
    rect(ctx, -6, -30, 12, 5, '#f2c230'); // hard hat
    rect(ctx, -7, -26, 14, 2, '#c99a1c');
  } else if (u.type === 'sniper') {
    rect(ctx, -6, -30, 12, 5, '#4f6b2a'); // boonie hat
    rect(ctx, -8, -26, 16, 2, '#3c5420');
  } else {
    rect(ctx, -7, -31, 14, 2, O);
    rect(ctx, -6, -30, 12, 5, helmet);
    rect(ctx, -6, -30, 12, 2, helmetLight);
    rect(ctx, -8, -26, 16, 2, O);
  }
  ctx.restore();
}

// Chunky corner brackets for selected things (an old-school cursor look).
function selectBrackets(ctx, x, y, w, h) {
  const l = Math.min(7, w / 3);
  ctx.fillStyle = '#ffffff';
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    ctx.fillRect(sx > 0 ? cx : cx - l, sy > 0 ? cy : cy - 2, l, 2);
    ctx.fillRect(sx > 0 ? cx : cx - 2, sy > 0 ? cy : cy - l, 2, l);
  }
}

// ── Buildings ──────────────────────────────────────────────────────────────
export function drawBuilding(ctx, b) {
  const f = b.faction;
  const { x, y, w, h } = b;
  const pc = PLAYER_COLORS[f];

  if (b.type === 'bridge' || b.type === 'ramp') {
    if (b.type === 'bridge') drawBridge(ctx, b);
    else drawRamp(ctx, b);
  } else {
    rect(ctx, x + 4, y + h, w, 4, 'rgba(0,0,0,0.3)');
    const a = b.constructing ? 0.7 : 1;
    // Military khaki tinted with the team colour, flat-shaded, dark outline.
    const wall = lerp(KHAKI, pc, 0.68);
    rect(ctx, x - 2, y - 2, w + 4, h + 2, PAL.outline);
    rect(ctx, x, y, w, h, css(wall, a));
    rect(ctx, x, y, w, 4, css(lerp(wall, WHITE, 0.3), a));
    rect(ctx, x, y + h * 0.62, w, h * 0.38, css(lerp(wall, BLACK, 0.22), a));
    rect(ctx, x, y, 3, h, css(lerp(wall, WHITE, 0.18), a));
    if (!b.constructing) DETAIL[b.type]?.(ctx, b, pc, f);
    if (b.type !== 'wall' && b.type !== 'mine') sandbags(ctx, x - 4, y + h, w + 8);
  }

  if (b.constructing) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    // Hazard stripes while under construction
    ctx.fillStyle = 'rgba(242,194,48,0.55)';
    for (let i = -h; i < w; i += 16) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + 8, y + h); ctx.lineTo(x + i + 8 + h, y); ctx.lineTo(x + i + h, y);
      ctx.fill();
    }
    ctx.restore();
    rect(ctx, x - 1, y + h + 5, w + 2, 6, PAL.outline);
    rect(ctx, x, y + h + 6, w * b.progress, 4, '#f2c230');
  }

  if (b.trainCurrent) {
    rect(ctx, x - 1, y + h + 5, w + 2, 6, PAL.outline);
    rect(ctx, x, y + h + 6, w * (1 - b.trainTimer / b.trainTotal), 4, '#5ee03a');
  }

  if (b.flash > 0) rect(ctx, x, y, w, h, 'rgba(255,255,255,0.45)');

  if (b.selected) selectBrackets(ctx, x - 5, y - 5, w + 10, h + 10);
  if (b.hp < b.maxHp) hpBar(ctx, x, y - 10, w, b.hp / b.maxHp);
}

const KHAKI = [0.62, 0.56, 0.38];

function sandbags(ctx, x, y, w) {
  for (let i = 0; i * 9 < w; i++) {
    const bx = x + i * 9;
    rect(ctx, bx - 1, y - 7, 10, 8, PAL.outline);
    rect(ctx, bx, y - 6, 8, 6, PAL.sand);
    rect(ctx, bx, y - 2, 8, 2, PAL.sandDark);
  }
}

const DETAIL = {
  hq(ctx, b, pc) {
    const { x, y, w, h } = b;
    const px = x + w * 0.72;
    line(ctx, px, y + 4, px, y + h * 0.55, 'rgba(255,255,255,0.72)', 2);
    poly(ctx, [[px, y + 4], [px + 18, y + 9], [px, y + 14]], css(pc));
    const ww = 12, wh = 10, gap = 6;
    const sx = x + (w - (ww * 3 + gap * 2)) / 2;
    const wy = y + h * 0.36;
    for (let i = 0; i < 3; i++) {
      const wx = sx + i * (ww + gap);
      rect(ctx, wx + 1, wy + 1, ww, wh, 'rgba(0,0,0,0.44)');
      rect(ctx, wx, wy, ww, wh, '#6699e6');
      line(ctx, wx + ww / 2, wy + 1, wx + ww / 2, wy + wh - 1, 'rgba(255,255,255,0.28)', 1);
      line(ctx, wx + 1, wy + wh / 2, wx + ww - 1, wy + wh / 2, 'rgba(255,255,255,0.28)', 1);
    }
    const dw = 18, dh = 22;
    const dx = x + (w - dw) / 2;
    const dy = y + h - dh - 4;
    rect(ctx, dx, dy, dw, dh, 'rgba(0,0,0,0.52)');
    circle(ctx, dx + dw - 5, dy + dh / 2, 2, '#ffd700');
  },
  barracks(ctx, b, pc, f) {
    const { x, y, w, h } = b;
    const rh = 16;
    poly(ctx, [[x - 4, y + rh], [x + w / 2, y], [x + w + 4, y + rh]], css(shade(f, 0.32)));
    line(ctx, x - 4, y + rh, x + w / 2, y, css(tint(f, 0.28)), 1.5);
    line(ctx, x + w / 2, y, x + w + 4, y + rh, css(tint(f, 0.28)), 1.5);
    const ww = 13, wh = 10, gap = 7;
    const sx = x + (w - (ww * 3 + gap * 2)) / 2;
    const wy = y + rh + 6;
    for (let i = 0; i < 3; i++) {
      const wx = sx + i * (ww + gap);
      rect(ctx, wx + 1, wy + 1, ww, wh, 'rgba(0,0,0,0.46)');
      rect(ctx, wx, wy, ww, wh, '#87baed');
    }
    const dw = 16, dh = 18;
    const dx = x + (w - dw) / 2;
    const dy = y + h - dh - 4;
    rect(ctx, dx, dy, dw, dh, 'rgba(0,0,0,0.5)');
    circle(ctx, dx + dw - 4, dy + dh / 2, 1.5, '#ffd700');
  },
  turret(ctx, b, pc, f) {
    const { x, y, w, h } = b;
    const cx = x + w / 2;
    circle(ctx, cx, y + h * 0.44, w * 0.38, css(tint(f, 0.32)));
    const dir = f === 0 || b.x < 3200 ? 1 : -1;
    const bw = w * 0.52;
    const bx = dir > 0 ? cx + 4 : cx - 4 - bw;
    rect(ctx, bx, y + h * 0.34, bw, 6, css(tint(f, 0.6)));
    rect(ctx, bx, y + h * 0.34 + 5, bw, 2, 'rgba(0,0,0,0.28)');
    circle(ctx, cx + 4 * dir, y + h * 0.37, 5, css(shade(f, 0.22)));
  },
  wall(ctx, b, pc, f) {
    const { x, y, w, h } = b;
    const rowH = 10;
    const sw = w / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.lineWidth = 0.8;
    for (let row = 0; row < Math.floor(h / rowH); row++) {
      const off = (row % 2) * (sw / 2);
      for (let col = 0; col < 3; col++) {
        ctx.strokeStyle = (row + col) % 2 ? 'rgba(200,200,200,0.12)' : 'rgba(255,255,255,0.16)';
        ctx.strokeRect(x + col * sw + off - sw / 2 + 1, y + row * rowH + 1, sw - 2, rowH - 2);
      }
    }
    ctx.restore();
    const mw = w / 3;
    for (let i = 0; i < 3; i++) {
      const mx = x + i * mw + mw * 0.1;
      rect(ctx, mx, y - 8, mw * 0.8, 8, css(shade(f, 0.28)));
      rect(ctx, mx, y - 8, mw * 0.8, 2, css(tint(f, 0.22)));
    }
  },
  mine(ctx, b, pc, f) {
    const { x, y, w, h } = b;
    const cx = x + w / 2;
    const c = css(tint(f, 0.55));
    line(ctx, cx - 14, y + h - 6, cx, y + 8, c, 3);
    line(ctx, cx + 14, y + h - 6, cx, y + 8, c, 3);
    line(ctx, cx - 8, y + h * 0.52, cx + 8, y + h * 0.52, c, 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, y + 8, 9, 0, Math.PI * 2);
    ctx.stroke();
    // Spinning wheel
    const spin = performance.now() / 400;
    for (let a = 0; a < 4; a++) {
      const ang = spin + (Math.PI * a) / 2;
      line(ctx, cx, y + 8, cx + Math.cos(ang) * 8, y + 8 + Math.sin(ang) * 8, 'rgba(255,255,255,0.72)', 2);
    }
    line(ctx, cx, y + 8, cx, y + h - 18, 'rgba(255,255,255,0.5)', 1);
    rect(ctx, cx - 6, y + h - 18, 12, 10, 'rgba(199,161,0,0.82)');
    rect(ctx, cx - 6, y + h - 18, 12, 3, 'rgba(255,255,255,0.2)');
  },
  airbase(ctx, b, pc, f) {
    const { x, y, w, h } = b;
    // Hangar with a curved roof and open bay
    const hw = w * 0.58;
    ctx.fillStyle = css(shade(f, 0.3));
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.55);
    ctx.quadraticCurveTo(x + hw / 2, y - h * 0.25, x + hw, y + h * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css(tint(f, 0.35));
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
      const rx = x + (hw * i) / 4;
      line(ctx, rx, y + h * 0.15, rx, y + h * 0.55, css(tint(f, 0.2), 0.6), 1);
    }
    rect(ctx, x + hw * 0.18, y + h * 0.5, hw * 0.64, h * 0.42, 'rgba(0,0,0,0.5)');
    // Control tower with a blinking beacon
    const tx = x + w * 0.76;
    rect(ctx, tx - 5, y - 18, 10, h * 0.6 + 18, css(shade(f, 0.38)));
    rect(ctx, tx - 11, y - 28, 22, 12, '#9cc8ff');
    rect(ctx, tx - 12, y - 30, 24, 3, css(tint(f, 0.3)));
    if (Math.floor(performance.now() / 500) % 2) circle(ctx, tx, y - 33, 2.5, '#ff4d4d');
    // Runway markings along the apron
    rect(ctx, x, y + h - 7, w, 5, '#2a2a2a');
    for (let i = 0; i < 6; i++) rect(ctx, x + 6 + i * (w / 6), y + h - 5, w / 12, 1.5, '#ffe28a');
  },
  workshop(ctx, b, pc, f) {
    const { x, y, w, h } = b;
    const rh = 18;
    const tw = w / 3;
    for (let i = 0; i < 3; i++) {
      const tx = x + i * tw;
      poly(ctx, [[tx, y + rh], [tx + tw / 2, y], [tx + tw, y + rh]], css(shade(f, 0.36)));
    }
    const chx = x + w * 0.78;
    rect(ctx, chx - 5, y - 14, 10, 20, css(shade(f, 0.38)));
    rect(ctx, chx - 7, y - 16, 14, 4, css(tint(f, 0.18)));
    const bw = w * 0.44, bh = 22;
    const bx = x + (w - bw) / 2;
    const by = y + h - bh - 4;
    rect(ctx, bx, by, bw, bh, 'rgba(0,0,0,0.5)');
    line(ctx, bx + 3, by + 3, bx + bw - 3, by + bh - 3, 'rgba(255,255,255,0.18)', 1.2);
    line(ctx, bx + bw - 3, by + 3, bx + 3, by + bh - 3, 'rgba(255,255,255,0.18)', 1.2);
    for (let i = 0; i < 2; i++) rect(ctx, x + w * 0.18 + i * w * 0.62 - 4, y + rh + 8, 8, 14, '#abbacc');
  },
};

function drawBridge(ctx, b) {
  const { x, y, w } = b;
  ctx.globalAlpha = b.constructing ? 0.55 : 1;
  // Wooden plank deck with rope rails and a team-coloured pennant post
  rect(ctx, x, y - 1, w, 12, PAL.outline);
  rect(ctx, x, y, w, 10, '#9a6a3a');
  for (let px = x; px < x + w; px += 8) { rect(ctx, px, y, 1, 10, '#6e4824'); rect(ctx, px + 1, y, 6, 2, '#b98552'); }
  rect(ctx, x, y - 9, w, 2, '#c8a46a');
  rect(ctx, x + w / 2 - 1, y - 12, 3, 12, '#6e4824');
  rect(ctx, x + w / 2 + 2, y - 12, 6, 4, css(PLAYER_COLORS[b.faction]));
  ctx.globalAlpha = 1;
}

function drawRamp(ctx, b) {
  const { x, y, w, h } = b;
  ctx.globalAlpha = b.constructing ? 0.55 : 1;
  // Stacked wooden crates read as climbable steps
  rect(ctx, x, y, w, h, PAL.outline);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, '#a8763e');
  rect(ctx, x + 1, y + 1, w - 2, 3, '#c99556');
  line(ctx, x + 3, y + 4, x + w - 3, y + h - 3, '#6e4824', 2);
  line(ctx, x + w - 3, y + 4, x + 3, y + h - 3, '#6e4824', 2);
  rect(ctx, x + 1, y + 1, 4, 4, css(PLAYER_COLORS[b.faction]));
  ctx.globalAlpha = 1;
}

// ── Effects ─────────────────────────────────────────────────────────────────
export function updateEffects(effects, dt) {
  for (const e of effects) e.t += dt;
  return effects.filter((e) => e.t < e.life);
}

export function drawEffects(ctx, effects) {
  for (const e of effects) {
    const fade = Math.min(1, (e.life - e.t) / 1.2);
    ctx.globalAlpha = Math.max(0, fade);
    if (e.kind === 'fall') {
      // Fallen soldier lying on the ground, with a small splat.
      rect(ctx, e.x - 7, e.y - 2, 14, 3, '#8a1a12');
      rect(ctx, e.x - 4, e.y - 1, 9, 2, '#b3241a');
      const dir = e.facing;
      const helmet = css(lerp(PLAYER_COLORS[e.f], BLACK, 0.1));
      rect(ctx, e.x - 9 * dir - (dir < 0 ? 5 : 0), e.y - 6, 5, 4, PAL.skin);
      rect(ctx, e.x - 10 * dir - (dir < 0 ? 4 : 0), e.y - 7, 4, 3, helmet);
      rect(ctx, e.x - 4, e.y - 5, 12, 4, css(lerp(PAL.olive, PLAYER_COLORS[e.f], 0.35)));
    } else if (e.kind === 'wreck') {
      // Burnt-out wreck with rising smoke puffs.
      rect(ctx, e.x - 14, e.y - 8, 28, 8, '#2a2620');
      rect(ctx, e.x - 10, e.y - 12, 14, 5, '#3a352c');
      if (e.t < 0.4) circle(ctx, e.x, e.y - 10, 18 * (1 - e.t / 0.4) + 6, 'rgba(255,170,40,0.85)');
      for (let i = 0; i < 4; i++) {
        const k = (e.t * 0.8 + i * 0.25) % 1;
        rect(ctx, e.x - 4 + Math.sin(i * 2 + e.t) * 6, e.y - 14 - k * 50, 8 + k * 8, 8 + k * 8, `rgba(60,58,52,${0.6 * (1 - k)})`);
      }
    } else if (e.kind === 'debris') {
      for (const p of e.parts) {
        const px = e.x + p.vx * e.t;
        const py = e.y + p.vy * e.t + 450 * e.t * e.t;
        rect(ctx, px - 2, py - 2, 4, 4, p.c);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ── Projectiles + placement ghost ──────────────────────────────────────────
export function drawProjectile(ctx, p) {
  if (p.exploded > 0) {
    // Blast: expanding ring + hot core, sized to the splash radius.
    const k = 1 - p.exploded / 0.3;
    const r = p.splash * (0.4 + 0.6 * k);
    ctx.globalAlpha = 1 - k;
    circle(ctx, p.x, p.y, r, 'rgba(255,140,40,0.35)');
    circle(ctx, p.x, p.y, r * 0.45, 'rgba(255,230,140,0.9)');
    ctx.strokeStyle = 'rgba(255,200,90,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  const trail = p.kind === 'bullet' ? 14 : 20;
  const tx = p.x - Math.cos(p.angle) * trail;
  const ty = p.y - Math.sin(p.angle) * trail;
  ctx.lineCap = 'round';
  line(ctx, tx, ty, p.x, p.y, p.kind === 'bullet' ? 'rgba(255,219,79,0.4)' : 'rgba(200,200,200,0.35)', p.radius * 1.2);
  ctx.lineCap = 'butt';
  circle(ctx, p.x, p.y, p.radius, p.kind === 'bullet' ? '#ffff80' : '#2b2b2b');
  if (p.kind !== 'bullet') circle(ctx, p.x - 1, p.y - 1, p.radius * 0.4, '#ffb347');
}

// ── Vehicles (bottom-centre origin, mirrored to face their direction) ─────
function drawVehicle(ctx, u) {
  const f = u.faction;
  const { w, h } = u;
  const x = u.x - w / 2;
  const y = u.y - h;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(u.x, u.y + 2, w / 2 + 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(u.x, 0);
  ctx.scale(u.facing, 1);
  ctx.translate(-u.x, 0);
  VEHICLE[u.type](ctx, u, x, y, w, h, f);
  ctx.restore();

  if (u.flash > 0) rect(ctx, x, y, w, h, 'rgba(255,255,255,0.6)');
  if (u.selected) selectBrackets(ctx, x - 4, y - 4, w + 8, h + 8);
  if (u.hp < u.maxHp || u.selected) hpBar(ctx, x, y - 8, w, u.hp / u.maxHp);
}

// ── Aircraft ──────────────────────────────────────────────────────────────
function drawAircraft(ctx, u) {
  const f = u.faction;
  const { w, h } = u;
  const x = u.x - w / 2;
  const y = u.y - h;

  // Ground shadow so altitude reads at a glance.
  const map = u.game.map;
  const tx = Math.floor(u.x / TILE_SIZE);
  let gy = Math.floor(u.y / TILE_SIZE);
  while (gy < MAP_H && !map.isSolid(tx, gy)) gy++;
  const groundY = gy * TILE_SIZE;
  const fade = Math.max(0.08, 0.3 - (groundY - u.y) / 1500);
  ctx.fillStyle = `rgba(0,0,0,${fade})`;
  ctx.beginPath();
  ctx.ellipse(u.x, groundY, w * 0.4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(u.x, 0);
  ctx.scale(u.facing, 1);
  ctx.translate(-u.x, 0);
  AIRCRAFT[u.type](ctx, u, x, y, w, h, f);
  ctx.restore();

  if (u.flash > 0) rect(ctx, x, y, w, h, 'rgba(255,255,255,0.6)');
  if (u.selected) selectBrackets(ctx, x - 4, y - 4, w + 8, h + 8);
  if (u.hp < u.maxHp || u.selected) hpBar(ctx, x, y - 8, w, u.hp / u.maxHp);
}

const AIRCRAFT = {
  // Drawn facing right; drawAircraft mirrors for left-facing units.
  helicopter(ctx, u, x, y, w, h, f) {
    const t = performance.now() / 1000;
    // Tail boom + tail rotor
    rect(ctx, x, y + h * 0.3, w * 0.45, 4, css(shade(f, 0.25)));
    poly(ctx, [[x, y + h * 0.05], [x + 6, y + h * 0.3], [x, y + h * 0.5]], css(shade(f, 0.35)));
    const tr = Math.sin(t * 40) * 5;
    line(ctx, x + 2, y + h * 0.27 - tr, x + 2, y + h * 0.27 + tr, 'rgba(220,220,220,0.8)', 1.5);
    // Cabin
    ctx.fillStyle = css(PLAYER_COLORS[f]);
    ctx.beginPath();
    ctx.ellipse(x + w * 0.66, y + h * 0.5, w * 0.3, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,210,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.82, y + h * 0.42, w * 0.11, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Skids and gun pod
    line(ctx, x + w * 0.45, y + h + 1, x + w * 0.9, y + h + 1, '#333', 2);
    line(ctx, x + w * 0.55, y + h * 0.85, x + w * 0.55, y + h + 1, '#333', 1.5);
    line(ctx, x + w * 0.8, y + h * 0.85, x + w * 0.8, y + h + 1, '#333', 1.5);
    rect(ctx, x + w * 0.8, y + h * 0.72, w * 0.25, 3, '#2a2a2a');
    // Main rotor (blur)
    const span = w * 0.62 * Math.abs(Math.cos(t * 30));
    rect(ctx, x + w * 0.64 - 1, y - 3, 2, 4, '#444');
    line(ctx, x + w * 0.64 - span, y - 3, x + w * 0.64 + span, y - 3, 'rgba(230,230,230,0.85)', 2);
    line(ctx, x + w * 0.64 - w * 0.62, y - 3, x + w * 0.64 + w * 0.62, y - 3, 'rgba(230,230,230,0.18)', 2);
  },
  bomber(ctx, u, x, y, w, h, f) {
    const t = performance.now() / 1000;
    // Tail fin
    poly(ctx, [[x + 2, y + h * 0.5], [x + 8, y - 4], [x + 16, y - 4], [x + 18, y + h * 0.5]], css(shade(f, 0.3)));
    // Fuselage
    ctx.fillStyle = css(PLAYER_COLORS[f]);
    ctx.beginPath();
    ctx.roundRect(x, y + h * 0.3, w, h * 0.5, h * 0.25);
    ctx.fill();
    rect(ctx, x + 6, y + h * 0.3, w - 12, 2.5, css(tint(f, 0.4)));
    // Cockpit glass + nose
    rect(ctx, x + w * 0.78, y + h * 0.32, w * 0.12, h * 0.2, 'rgba(160,210,255,0.85)');
    // Wing (side view) with engine + spinning prop
    poly(ctx, [[x + w * 0.35, y + h * 0.55], [x + w * 0.62, y + h * 0.55], [x + w * 0.5, y + h * 1.05], [x + w * 0.32, y + h * 1.05]], css(shade(f, 0.25)));
    rect(ctx, x + w * 0.52, y + h * 0.6, 10, 6, '#3a3a3a');
    const pr = Math.abs(Math.sin(t * 45)) * 7;
    line(ctx, x + w * 0.52 + 11, y + h * 0.63 - pr, x + w * 0.52 + 11, y + h * 0.63 + pr, 'rgba(220,220,220,0.8)', 1.5);
    // Open bomb bay while reloading
    if (u.cooldownTimer > u.cooldown - 0.4) rect(ctx, x + w * 0.4, y + h * 0.78, w * 0.14, 2, '#111');
  },
};

function wheel(ctx, cx, cy, r, spin) {
  circle(ctx, cx, cy, r, '#1d1d1d');
  circle(ctx, cx, cy, r * 0.45, '#8a8a8a');
  line(ctx, cx, cy, cx + Math.cos(spin) * r * 0.8, cy + Math.sin(spin) * r * 0.8, '#555', 1.5);
}

const VEHICLE = {
  // Drawn facing right; drawVehicle mirrors for left-facing units.
  jeep(ctx, u, x, y, w, h, f) {
    const spin = u.x / 7;
    rect(ctx, x + 2, y + h * 0.4, w - 4, h * 0.38, css(PLAYER_COLORS[f]));
    rect(ctx, x + 2, y + h * 0.4, w - 4, 3, css(tint(f, 0.4)));
    poly(ctx, [[x + w * 0.3, y + h * 0.4], [x + w * 0.42, y + h * 0.1], [x + w * 0.62, y + h * 0.1], [x + w * 0.7, y + h * 0.4]], css(shade(f, 0.25)));
    rect(ctx, x + w * 0.45, y + h * 0.16, w * 0.14, h * 0.2, 'rgba(160,210,255,0.8)');
    // Mounted gun
    rect(ctx, x + w * 0.62, y + h * 0.02, 3, h * 0.2, '#333');
    rect(ctx, x + w * 0.62, y, w * 0.38, 3, '#2a2a2a');
    rect(ctx, x + w - 4, y + h * 0.5, 4, 3, '#ffe28a'); // headlight
    wheel(ctx, x + w * 0.22, y + h - 5, 5, spin);
    wheel(ctx, x + w * 0.78, y + h - 5, 5, spin);
  },
  tank(ctx, u, x, y, w, h, f) {
    // Treads
    const ty = y + h * 0.6;
    ctx.fillStyle = '#262626';
    ctx.beginPath();
    ctx.roundRect(x, ty, w, h * 0.4, h * 0.2);
    ctx.fill();
    const off = (u.x / 3) % 6;
    for (let i = -1; i < w / 6; i++) rect(ctx, x + 3 + i * 6 + off, ty + 2, 2, h * 0.4 - 4, '#444');
    for (let i = 0; i < 5; i++) circle(ctx, x + 5 + i * ((w - 10) / 4), ty + h * 0.2, 2.6, '#6d6d6d');
    // Hull
    poly(ctx, [[x + 2, ty], [x + 6, y + h * 0.36], [x + w - 4, y + h * 0.36], [x + w, ty]], css(PLAYER_COLORS[f]));
    rect(ctx, x + 6, y + h * 0.36, w - 10, 3, css(tint(f, 0.35)));
    // Turret + barrel
    ctx.fillStyle = css(shade(f, 0.2));
    ctx.beginPath();
    ctx.roundRect(x + w * 0.28, y + h * 0.08, w * 0.4, h * 0.3, 4);
    ctx.fill();
    rect(ctx, x + w * 0.28, y + h * 0.08, w * 0.4, 2, css(tint(f, 0.4)));
    const recoil = u.cooldownTimer > u.cooldown - 0.15 ? 3 : 0;
    rect(ctx, x + w * 0.66 - recoil, y + h * 0.16, w * 0.44, 4, '#2f2f2f');
    rect(ctx, x + w * 1.06 - recoil, y + h * 0.13, 4, 6, '#2f2f2f');
  },
  artillery(ctx, u, x, y, w, h, f) {
    const spin = u.x / 7;
    // Long barrel raised at ~35°
    ctx.save();
    ctx.translate(x + w * 0.45, y + h * 0.42);
    ctx.rotate(-0.6);
    rect(ctx, 0, -2.5, w * 0.75, 5, '#333');
    rect(ctx, w * 0.68, -3.5, 6, 7, '#2a2a2a');
    ctx.restore();
    rect(ctx, x + 2, y + h * 0.42, w - 6, h * 0.36, css(PLAYER_COLORS[f]));
    rect(ctx, x + 2, y + h * 0.42, w - 6, 3, css(tint(f, 0.4)));
    rect(ctx, x + w * 0.32, y + h * 0.28, w * 0.26, h * 0.18, css(shade(f, 0.3)));
    // Stabiliser leg at the back
    line(ctx, x + 4, y + h * 0.7, x - 4, y + h, '#3a3a3a', 3);
    wheel(ctx, x + w * 0.28, y + h - 5, 5, spin);
    wheel(ctx, x + w * 0.72, y + h - 5, 5, spin);
  },
};

// Placement mode: dim everything outside the player's build zone and mark its edges.
export function drawBuildZones(ctx, zones, view) {
  const top = view.y;
  const h = view.h;
  let x = view.x;
  const right = view.x + view.w;
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  for (const [from, to] of zones) {
    const zx0 = from * TILE_SIZE;
    const zx1 = to * TILE_SIZE;
    if (zx0 > x) ctx.fillRect(x, top, Math.min(zx0, right) - x, h);
    x = Math.max(x, zx1);
  }
  if (x < right) ctx.fillRect(x, top, right - x, h);

  ctx.strokeStyle = 'rgba(0,255,102,0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  for (const [from, to] of zones) {
    ctx.fillStyle = 'rgba(0,255,102,0.05)';
    ctx.fillRect(from * TILE_SIZE, top, (to - from) * TILE_SIZE, h);
    ctx.beginPath();
    for (const ex of [from * TILE_SIZE, to * TILE_SIZE]) { ctx.moveTo(ex, top); ctx.lineTo(ex, top + h); }
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export function drawGhost(ctx, pl) {
  const x = pl.tx * TILE_SIZE;
  const y = pl.ty * TILE_SIZE;
  const w = pl.w * TILE_SIZE;
  const h = pl.h * TILE_SIZE;
  rect(ctx, x, y, w, h, pl.valid ? 'rgba(0,255,102,0.22)' : 'rgba(255,51,51,0.22)');
  ctx.strokeStyle = pl.valid ? 'rgba(0,255,102,0.9)' : 'rgba(255,51,51,0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
}

// ── Minimap ────────────────────────────────────────────────────────────────
export function drawMinimap(ctx, game, cw, ch, view, terrainCache, zones = null) {
  const sx = cw / WORLD_W;
  const sy = ch / WORLD_H;
  if (terrainCache.version !== game.map.version || terrainCache.w !== cw || terrainCache.h !== ch) {
    const c = terrainCache.canvas || (terrainCache.canvas = document.createElement('canvas'));
    c.width = cw;
    c.height = ch;
    const t = c.getContext('2d');
    t.fillStyle = '#3d7fc4';
    t.fillRect(0, 0, cw, ch);
    const colors = { [TILE_GROUND]: '#7a4a24', [TILE_PLATFORM]: '#8f7f62', [TILE_BRIDGE]: '#b98552', [TILE_RAMP]: '#a8763e' };
    for (let tx = 0; tx < MAP_W; tx++) {
      for (let ty = 0; ty < MAP_H; ty++) {
        const tile = game.map.get(tx, ty);
        if (tile === TILE_EMPTY) continue;
        t.fillStyle = colors[tile];
        t.fillRect(Math.floor(tx * TILE_SIZE * sx), Math.floor(ty * TILE_SIZE * sy), Math.ceil(TILE_SIZE * sx), Math.ceil(TILE_SIZE * sy));
      }
    }
    t.fillStyle = '#4cb83a';
    for (let tx = 0; tx < MAP_W; tx++) {
      for (let ty = 1; ty < MAP_H; ty++) {
        if (game.map.get(tx, ty) !== TILE_EMPTY && game.map.get(tx, ty - 1) === TILE_EMPTY) {
          t.fillRect(Math.floor(tx * TILE_SIZE * sx), Math.floor(ty * TILE_SIZE * sy), Math.ceil(TILE_SIZE * sx), Math.max(1, Math.ceil(TILE_SIZE * sy * 0.35)));
        }
      }
    }
    Object.assign(terrainCache, { version: game.map.version, w: cw, h: ch });
  }
  ctx.drawImage(terrainCache.canvas, 0, 0);
  if (zones) {
    // Placement mode: highlight where the player is allowed to build.
    ctx.fillStyle = 'rgba(0,255,102,0.28)';
    for (const shift of game.wrap ? [-WORLD_W, 0, WORLD_W] : [0]) {
      for (const [from, to] of zones) ctx.fillRect((from * TILE_SIZE + shift) * sx, 0, (to - from) * TILE_SIZE * sx, ch);
    }
  }
  for (const b of game.buildings) {
    if (b.type === 'bridge' || b.type === 'ramp') continue;
    ctx.fillStyle = css(PLAYER_COLORS[b.faction]);
    ctx.fillRect(b.x * sx, b.y * sy, Math.max(3, b.w * sx), Math.max(3, b.h * sy));
  }
  for (const u of game.units) {
    ctx.fillStyle = css(tint(u.faction, 0.3));
    ctx.fillRect(u.x * sx - (u.vehicle ? 2.5 : 1.5), (u.y - u.h) * sy, u.vehicle ? 5 : 3, Math.max(3, u.h * sy));
  }
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(view.x * sx + 0.75, view.y * sy + 0.75, view.w * sx - 1.5, view.h * sy - 1.5);
  // Looping map: a view straddling the seam also shows at the start.
  if (game.wrap && view.x + view.w > WORLD_W) ctx.strokeRect((view.x - WORLD_W) * sx + 0.75, view.y * sy + 0.75, view.w * sx - 1.5, view.h * sy - 1.5);
}

export { BUILDING_TYPES };
