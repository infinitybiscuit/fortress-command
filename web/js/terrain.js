// The isometric field's landscape: rolling hills, a river, roads with
// bridges, forests and rocks, made fresh for every game from a seed (so
// online players, who all get the host's seed, see the same map).
//
// The battle itself is still played on flat ground: heights only lift what's
// drawn (see iso.js). Ground underfoot does matter, though: wading a river
// is slow, roads are quick, forests slow you a little, and nothing can be
// built in the water.
import { TILE_SIZE, FIELD_TILES } from './config.js';

export const GRASS = 0;
export const WATER = 1;
export const ROAD = 2;
export const BRIDGE = 3;

const N = FIELD_TILES;
const SPEED = { [GRASS]: 1, [WATER]: 0.5, [ROAD]: 1.2, [BRIDGE]: 1.2 };
const FOREST_SPEED = 0.85;
const HILL = 110;            // biggest rise of the land, in world units
const RIVER_DEPTH = 10;      // how far the water sits below its banks

// Small, fast, seeded random numbers (mulberry32).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise over the field, one random value every `cell` tiles.
function noise(rand, cell) {
  const n = Math.ceil(N / cell) + 2;
  const v = Array.from({ length: n * n }, rand);
  const s = (t) => t * t * (3 - 2 * t);
  return (x, z) => {
    const gx = x / cell;
    const gz = z / cell;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = s(gx - ix);
    const fz = s(gz - iz);
    const at = (i, j) => v[(iz + j) * n + ix + i];
    return (at(0, 0) * (1 - fx) + at(1, 0) * fx) * (1 - fz) + (at(0, 1) * (1 - fx) + at(1, 1) * fx) * fz;
  };
}

export class Terrain {
  // spots: each HQ's top-left tile [tx, tz]; hqW: the HQ's width in tiles.
  constructor(seed, spots, hqW) {
    this.seed = seed;
    const rand = rng(seed);
    const bases = spots.map(([x, z]) => [x + hqW / 2, z + hqW / 2]);
    const nearBase = (x, z, r) => bases.some(([bx, bz]) => Math.hypot(x - bx, z - bz) < r);

    // ── Hills: heights at tile corners, flattened round each base ──
    const big = noise(rand, 22);
    const mid = noise(rand, 9);
    const small = noise(rand, 4);
    const H = new Float32Array((N + 1) * (N + 1));
    for (let z = 0; z <= N; z++) {
      for (let x = 0; x <= N; x++) H[z * (N + 1) + x] = big(x, z) * 0.65 + mid(x, z) * 0.27 + small(x, z) * 0.08;
    }
    let lo = Infinity;
    let hi = -Infinity;
    for (const h of H) { lo = Math.min(lo, h); hi = Math.max(hi, h); }
    for (let i = 0; i < H.length; i++) H[i] = ((H[i] - lo) / (hi - lo || 1)) * HILL;
    for (const [bx, bz] of bases) {
      const flat = H[Math.round(bz) * (N + 1) + Math.round(bx)];
      for (let z = 0; z <= N; z++) {
        for (let x = 0; x <= N; x++) {
          const d = Math.hypot(x - bx, z - bz);
          if (d > 17) continue;
          const k = d < 10 ? 1 : 1 - (d - 10) / 7;
          const i = z * (N + 1) + x;
          H[i] += (flat - H[i]) * k * k * (3 - 2 * k);
        }
      }
    }
    const land = H.slice(); // heights before the river is cut in

    // ── A river from one edge to the opposite one, well clear of the bases ──
    this.kind = new Uint8Array(N * N);
    const water = (tx, tz) => tx >= 0 && tz >= 0 && tx < N && tz < N && this.kind[tz * N + tx] === WATER;
    for (let attempt = 0; attempt < 60; attempt++) {
      const along = rand() < 0.5; // runs along x (else along z)
      const a = 10 + rand() * (N - 20);
      const b = 10 + rand() * (N - 20);
      const amp = 4 + rand() * 7;
      const f1 = 1 + rand() * 2;
      const p1 = rand() * 6.28;
      const p2 = rand() * 6.28;
      const width = 1.4 + rand() * 0.8;
      const path = [];
      for (let t = -0.05; t <= 1.05; t += 0.002) {
        const side = a + (b - a) * t + Math.sin(t * Math.PI * f1 + p1) * amp + Math.sin(t * 9.4 + p2) * amp * 0.3;
        path.push(along ? [t * N, side] : [side, t * N]);
      }
      if (path.some(([x, z]) => nearBase(x, z, 15))) continue;
      for (const [x, z] of path) {
        for (let dz = -3; dz <= 3; dz++) {
          for (let dx = -3; dx <= 3; dx++) {
            const tx = Math.floor(x + dx);
            const tz = Math.floor(z + dz);
            if (tx < 0 || tz < 0 || tx >= N || tz >= N) continue;
            if (Math.hypot(tx + 0.5 - x, tz + 0.5 - z) <= width) this.kind[tz * N + tx] = WATER;
          }
        }
      }
      this.river = { path, width };
      break;
    }
    // Cut the bed: every corner of a water tile drops below the banks.
    for (let tz = 0; tz < N; tz++) {
      for (let tx = 0; tx < N; tx++) {
        if (!water(tx, tz)) continue;
        for (const [cx, cz] of [[tx, tz], [tx + 1, tz], [tx, tz + 1], [tx + 1, tz + 1]]) {
          const i = cz * (N + 1) + cx;
          H[i] = Math.min(H[i], land[i] - RIVER_DEPTH);
        }
      }
    }

    // ── Roads: from each base to the middle (and one more out to an edge),
    // bridged where they cross the river ──
    // The crossroads sits on dry land, well back from the river.
    const dryAround = (x, z, r) => {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (water(Math.floor(x + dx), Math.floor(z + dz))) return false;
      return true;
    };
    let mid2 = [N / 2, N / 2];
    for (let i = 0; i < 40; i++) {
      const p = [N / 2 + (rand() - 0.5) * (16 + i), N / 2 + (rand() - 0.5) * (16 + i)];
      if (dryAround(p[0], p[1], 5)) { mid2 = p; break; }
    }
    const roads = bases.map(([bx, bz]) => [[bx, bz], mid2]);
    const edge = [[mid2[0], 0], [mid2[0], N], [0, mid2[1]], [N, mid2[1]]][Math.floor(rand() * 4)];
    if (!nearBase(edge[0], edge[1], 20)) roads.push([mid2, edge]);
    this.roads = [];
    for (const [[x0, z0], [x1, z1]] of roads) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const nx = -(z1 - z0) / len;
      const nz = (x1 - x0) / len;
      // A gently winding line; of a few tries, keep the one with the
      // shortest bridge, so roads cross the river rather than run along it.
      let best = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const amp = 2 + rand() * 4;
        const ph = rand() * 6.28;
        const line = [];
        const tiles = new Set();
        for (let t = 0; t <= 1; t += 0.5 / len) {
          const w = Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 2 + ph) * amp;
          const x = x0 + (x1 - x0) * t + nx * w;
          const z = z0 + (z1 - z0) * t + nz * w;
          line.push([x, z]);
          for (const [dx, dz] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
            const tx = Math.floor(x + dx * 0.9 + 0.45);
            const tz = Math.floor(z + dz * 0.9 + 0.45);
            if (tx >= 0 && tz >= 0 && tx < N && tz < N) tiles.add(tz * N + tx);
          }
        }
        let wet = 0;
        for (const i of tiles) if (this.kind[i] === WATER || this.kind[i] === BRIDGE) wet++;
        if (!best || wet < best.wet) best = { line, tiles, wet };
      }
      this.roads.push(best.line);
      for (const i of best.tiles) this.kind[i] = this.kind[i] === WATER || this.kind[i] === BRIDGE ? BRIDGE : ROAD;
    }
    // Bridge decks run level across at the height of the banks.
    for (let tz = 0; tz < N; tz++) {
      for (let tx = 0; tx < N; tx++) {
        if (this.kind[tz * N + tx] !== BRIDGE) continue;
        for (const [cx, cz] of [[tx, tz], [tx + 1, tz], [tx, tz + 1], [tx + 1, tz + 1]]) {
          const i = cz * (N + 1) + cx;
          H[i] = land[i];
        }
      }
    }
    // Nothing lower than the plain round the field.
    const floor = Math.min(...H);
    for (let i = 0; i < H.length; i++) H[i] -= floor;
    this.H = H;

    // ── Forests and rocks ──
    const woods = noise(rand, 11);
    this.forest = new Uint8Array(N * N);
    this.trees = [];
    this.rocks = [];
    for (let tz = 0; tz < N; tz++) {
      for (let tx = 0; tx < N; tx++) {
        const i = tz * N + tx;
        if (this.kind[i] !== GRASS || nearBase(tx + 0.5, tz + 0.5, 12)) continue;
        // Not right on a river bank either.
        if (water(tx - 1, tz) || water(tx + 1, tz) || water(tx, tz - 1) || water(tx, tz + 1)) continue;
        const w = woods(tx, tz);
        if (w > 0.66 || rand() < 0.008) {
          this.forest[i] = 1;
          const n = w > 0.74 ? 2 : 1;
          for (let k = 0; k < n; k++) {
            this.trees.push({
              tx, tz,
              x: (tx + 0.2 + rand() * 0.6) * TILE_SIZE,
              z: (tz + 0.2 + rand() * 0.6) * TILE_SIZE,
              kind: rand() < 0.55 ? 0 : 1, // pine or round
              size: Math.floor(rand() * 3),
            });
          }
        } else if (rand() < 0.008) {
          this.rocks.push({ tx, tz, x: (tx + 0.5) * TILE_SIZE, z: (tz + 0.5) * TILE_SIZE, size: Math.floor(rand() * 2) });
        }
      }
    }
    this.maxH = Math.max(...H);
  }

  kindAt(tx, tz) {
    if (tx < 0 || tz < 0 || tx >= N || tz >= N) return GRASS;
    return this.kind[tz * N + tx];
  }

  // Ground height (world units, up is positive) at a field position.
  height(x, z) {
    const gx = Math.max(0, Math.min(N - 1e-6, x / TILE_SIZE));
    const gz = Math.max(0, Math.min(N - 1e-6, z / TILE_SIZE));
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const H = this.H;
    const W = N + 1;
    const i = iz * W + ix;
    return (H[i] * (1 - fx) + H[i + 1] * fx) * (1 - fz) + (H[i + W] * (1 - fx) + H[i + W + 1] * fx) * fz;
  }

  // Lowest and highest ground under a footprint (in tiles).
  span(tx, tz, w) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let z = tz; z <= tz + w; z++) {
      for (let x = tx; x <= tx + w; x++) {
        const h = this.H[Math.min(N, Math.max(0, z)) * (N + 1) + Math.min(N, Math.max(0, x))];
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
    }
    return [lo, hi];
  }

  // How fast ground units move here, as a fraction of their usual speed.
  speedAt(x, z) {
    const tx = Math.floor(x / TILE_SIZE);
    const tz = Math.floor(z / TILE_SIZE);
    const k = this.kindAt(tx, tz);
    if (k === GRASS && this.forest[tz * N + tx]) return FOREST_SPEED;
    return SPEED[k];
  }

  // Can a footprint go here? Not in (or over) the water.
  buildable(tx, tz, w) {
    for (let z = tz; z < tz + w; z++) {
      for (let x = tx; x < tx + w; x++) {
        const k = this.kindAt(x, z);
        if (k === WATER || k === BRIDGE) return false;
      }
    }
    return true;
  }
}
