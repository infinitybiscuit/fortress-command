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

const TILE_COLORS = {
  [TILE_GROUND]: '#4d3f2e',
  [TILE_PLATFORM]: '#595140',
  [TILE_BRIDGE]: '#734d26',
  [TILE_RAMP]: '#4d3f2e',
};

function hpColor(r) { return r > 0.5 ? '#00ff66' : r > 0.25 ? '#ffaa00' : '#ff4d4d'; }

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
  rect(ctx, x, y, w, 3, '#333');
  rect(ctx, x, y, w * ratio, 3, hpColor(ratio));
}

// ── Terrain ────────────────────────────────────────────────────────────────
export function drawSky(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#141a38');
  g.addColorStop(1, '#2d3850');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawTerrain(ctx, map, view) {
  const l = Math.max(0, Math.floor(view.x / TILE_SIZE));
  const r = Math.min(MAP_W, Math.ceil((view.x + view.w) / TILE_SIZE) + 1);
  const t = Math.max(0, Math.floor(view.y / TILE_SIZE));
  const b = Math.min(MAP_H, Math.ceil((view.y + view.h) / TILE_SIZE) + 1);
  for (let tx = l; tx < r; tx++) {
    for (let ty = t; ty < b; ty++) {
      const tile = map.get(tx, ty);
      if (tile === TILE_EMPTY || tile === TILE_RAMP || tile === TILE_BRIDGE) continue;
      const x = tx * TILE_SIZE;
      const y = ty * TILE_SIZE;
      rect(ctx, x, y, TILE_SIZE, TILE_SIZE, TILE_COLORS[tile]);
      if (tile === TILE_PLATFORM) {
        rect(ctx, x, y, TILE_SIZE, 2, 'rgba(255,255,255,0.10)');
        rect(ctx, x, y + TILE_SIZE - 3, TILE_SIZE, 3, 'rgba(0,0,0,0.25)');
      } else if (tile === TILE_GROUND && map.get(tx, ty - 1) !== TILE_GROUND) {
        rect(ctx, x, y, TILE_SIZE, 3, '#5d7a3a'); // grassy top edge
      }
    }
  }
}

// ── Units ──────────────────────────────────────────────────────────────────
export function drawUnit(ctx, u) {
  if (u.air) { drawAircraft(ctx, u); return; }
  if (u.vehicle) { drawVehicle(ctx, u); return; }
  const f = u.faction;
  const w = UNIT_W;
  const h = UNIT_H;
  const x = u.x - w / 2;
  const y = u.y - h;

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(u.x, u.y + 2, w / 2 + 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  rect(ctx, x, y, w, h * 0.35, css(tint(f, 0.28)));
  rect(ctx, x, y + h * 0.35, w, h * 0.35, css(PLAYER_COLORS[f]));
  rect(ctx, x, y + h * 0.7, w, h * 0.3, css(shade(f, 0.32)));
  rect(ctx, x, y, w, 3, 'rgba(255,255,255,0.38)');
  rect(ctx, x, y + h - 6, w, 6, 'rgba(0,0,0,0.28)');

  // Helmet — type-specific accent so unit roles read at a glance.
  const hw = w * 0.78;
  const hh = h * 0.36;
  const hx = x + (w - hw) / 2;
  const hy = y + 2;
  rect(ctx, hx, hy, hw, hh * 0.6, '#606060');
  rect(ctx, hx, hy + hh * 0.6, hw, hh * 0.4, '#242424');
  rect(ctx, hx - 2, hy + hh - 4, hw + 4, 5, '#333');
  if (u.type === 'heavy') rect(ctx, hx - 3, hy + hh - 5, hw + 6, 7, '#1c1c1c');
  if (u.type === 'scout') rect(ctx, hx + hw / 2 - 1, hy - 4, 2, 5, '#ffd24d');
  if (u.type === 'engineer') rect(ctx, hx, hy, hw, 3, '#ffcc00');
  if (u.type === 'sniper') {
    const bx = u.facing > 0 ? x + w - 2 : x - 12;
    rect(ctx, bx, y + h * 0.45, 14, 2, '#222');
  }

  // Facing triangle
  const fx = x + (u.facing > 0 ? w - 4 : 4);
  poly(ctx, [[fx, y + h * 0.4], [fx + u.facing * 5, y + h * 0.55], [fx, y + h * 0.7]], 'rgba(255,255,255,0.7)');

  if (u.flash > 0) rect(ctx, x, y, w, h, 'rgba(255,255,255,0.7)');

  if (u.selected) {
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  }
  if (u.hp < u.maxHp || u.selected) hpBar(ctx, x, y - 8, w, u.hp / u.maxHp);
}

// ── Buildings ──────────────────────────────────────────────────────────────
export function drawBuilding(ctx, b) {
  const f = b.faction;
  const { x, y, w, h } = b;
  const pc = PLAYER_COLORS[f];

  if (b.type === 'bridge' || b.type === 'ramp') {
    if (b.type === 'bridge') drawBridge(ctx, b, pc);
    else drawRamp(ctx, b);
  } else {
    poly(ctx, [[x + 5, y + h], [x + w - 5, y + h], [x + w + 4, y + h + 12], [x - 3, y + h + 12]], 'rgba(0,0,0,0.32)');
    const a = b.constructing ? 0.62 : 1;
    rect(ctx, x, y, w, h * 0.3, css(tint(f, 0.26), a));
    rect(ctx, x, y + h * 0.3, w, h * 0.42, css(pc, a));
    rect(ctx, x, y + h * 0.72, w, h * 0.28, css(shade(f, 0.38), a));
    rect(ctx, x, y, w, 4, css(tint(f, 0.46), a));
    rect(ctx, x, y, 4, h, css(tint(f, 0.42), a));
    if (!b.constructing) DETAIL[b.type]?.(ctx, b, pc, f);
  }

  if (b.constructing) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    rect(ctx, x, y, w, h, 'rgba(26,43,102,0.4)');
    ctx.strokeStyle = 'rgba(51,128,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -h; i < w; i += 6) { ctx.moveTo(x + i, y); ctx.lineTo(x + i + h, y + h); }
    ctx.stroke();
    ctx.restore();
    rect(ctx, x, y + h + 2, w, 4, '#222');
    rect(ctx, x, y + h + 2, w * b.progress, 4, '#3380ff');
  }

  if (b.trainCurrent) {
    rect(ctx, x, y + h + 2, w, 4, '#222');
    rect(ctx, x, y + h + 2, w * (1 - b.trainTimer / b.trainTotal), 4, '#ffcc33');
  }

  if (b.flash > 0) rect(ctx, x, y, w, h, 'rgba(255,255,255,0.45)');

  if (b.selected) {
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  }
  if (b.hp < b.maxHp) hpBar(ctx, x, y - 8, w, b.hp / b.maxHp);
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

function drawBridge(ctx, b, pc) {
  const { x, y, w, h } = b;
  const f = b.faction;
  const a = b.constructing ? 0.5 : 1;
  rect(ctx, x + 2, y, 5, h, css(shade(f, 0.38), a));
  rect(ctx, x + w - 7, y, 5, h, css(shade(f, 0.38), a));
  const dx = x, dy = y, dw = w, dh = 10;
  rect(ctx, dx, dy, dw, dh, css([0.45, 0.3, 0.15], a));
  for (let px = dx; px + 4 <= dx + dw; px += 6) rect(ctx, px, dy, 4, dh, css(lerp([0.45, 0.3, 0.15], BLACK, 0.22), a));
  rect(ctx, dx, dy, dw, 2, css(pc, 0.8 * a));
}

function drawRamp(ctx, b) {
  const { x, y, w, h } = b;
  const f = b.faction;
  const a = b.constructing ? 0.5 : 1;
  rect(ctx, x, y, w, h, css([0.3, 0.25, 0.18], a));
  // Stair-step look so it reads as a climbable block
  for (let i = 0; i < 4; i++) rect(ctx, x + i * 8, y + h - (i + 1) * 8, 8, 2, css(tint(f, 0.2), 0.6 * a));
  rect(ctx, x, y, w, 2, css(PLAYER_COLORS[f], a));
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
  if (u.selected) {
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  }
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
  if (u.selected) {
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  }
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
  let x = Math.max(0, view.x);
  const right = Math.min(WORLD_W, view.x + view.w);
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
    t.fillStyle = '#0d0d14';
    t.fillRect(0, 0, cw, ch);
    const colors = { [TILE_GROUND]: '#4d4030', [TILE_PLATFORM]: '#736659', [TILE_BRIDGE]: '#8c734d', [TILE_RAMP]: '#665a47' };
    for (let tx = 0; tx < MAP_W; tx++) {
      for (let ty = 0; ty < MAP_H; ty++) {
        const tile = game.map.get(tx, ty);
        if (tile === TILE_EMPTY) continue;
        t.fillStyle = colors[tile];
        t.fillRect(Math.floor(tx * TILE_SIZE * sx), Math.floor(ty * TILE_SIZE * sy), Math.ceil(TILE_SIZE * sx), Math.ceil(TILE_SIZE * sy));
      }
    }
    Object.assign(terrainCache, { version: game.map.version, w: cw, h: ch });
  }
  ctx.drawImage(terrainCache.canvas, 0, 0);
  if (zones) {
    // Placement mode: highlight where the player is allowed to build.
    ctx.fillStyle = 'rgba(0,255,102,0.28)';
    for (const [from, to] of zones) ctx.fillRect(from * TILE_SIZE * sx, 0, (to - from) * TILE_SIZE * sx, ch);
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
}

export { BUILDING_TYPES };
