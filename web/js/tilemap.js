// Procedural terrain + tile occupancy. Ported from archive/godot-era/godot/scripts/game/tilemap.gd.
import {
  MAP_W, MAP_H, TILE_SIZE, GROUND_LEVEL_TILE, PLATFORM_ROWS,
  TILE_EMPTY, TILE_GROUND, TILE_PLATFORM,
} from './config.js';

const key = (tx, ty) => ty * MAP_W + tx;
const modW = (tx) => ((tx % MAP_W) + MAP_W) % MAP_W;

export class TileMap {
  constructor() {
    this.tiles = new Uint8Array(MAP_W * MAP_H);
    this.buildingTiles = new Map(); // key -> building id (placement overlap check)
    this.wallTiles = new Map();     // key -> owning faction
    this.ramps = new Map();         // building id -> { x1, y1, x2, y2 } walkable slope (x1 < x2)
    this.version = 0;               // bumped whenever terrain changes (minimap cache)
    this.generate();
  }

  get groundTop() { return MAP_H - GROUND_LEVEL_TILE; } // 17

  generate() {
    this.tiles.fill(TILE_EMPTY);
    this.buildingTiles.clear();
    this.wallTiles.clear();
    this.ramps.clear();
    const gt = this.groundTop;

    for (let x = 0; x < MAP_W; x++)
      for (let y = gt; y < MAP_H; y++) this.set(x, y, TILE_GROUND);

    for (const delta of PLATFORM_ROWS) {
      const rowY = gt - delta - 1;
      if (rowY < 1 || rowY >= MAP_H - 1) continue;
      let x = 3 + Math.floor(Math.random() * 8);
      while (x < MAP_W - 5) {
        const len = 4 + Math.floor(Math.random() * 5);
        for (let px = x; px < Math.min(x + len, MAP_W); px++) this.set(px, rowY, TILE_PLATFORM);
        x += len + 3 + Math.floor(Math.random() * 6);
      }
    }

    // Guaranteed top platforms above each map end.
    const topY = gt - Math.max(...PLATFORM_ROWS) - 1;
    for (let px = 0; px < 8; px++) this.set(px, topY, TILE_PLATFORM);
    for (let px = MAP_W - 8; px < MAP_W; px++) this.set(px, topY, TILE_PLATFORM);
    this.version++;
  }

  set(tx, ty, t) { this.tiles[key(tx, ty)] = t; }

  // In looping maps, columns past either edge wrap around; otherwise the
  // map edges act as solid walls.
  col(tx) { return this.wrap ? modW(tx) : tx; }

  get(tx, ty) {
    tx = this.col(tx);
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return TILE_EMPTY;
    return this.tiles[key(tx, ty)];
  }

  isSolid(tx, ty) {
    tx = this.col(tx);
    if (ty < 0 || ty >= MAP_H || tx < 0 || tx >= MAP_W) return true;
    return this.tiles[key(tx, ty)] !== TILE_EMPTY;
  }

  // Terrain is always solid; walls only block other factions.
  isSolidForFaction(tx, ty, faction) {
    tx = this.col(tx);
    if (ty < 0 || ty >= MAP_H || tx < 0 || tx >= MAP_W) return true;
    const k = key(tx, ty);
    if (this.wallTiles.has(k)) return this.wallTiles.get(k) !== faction;
    return this.tiles[k] !== TILE_EMPTY;
  }


  // Id of the wall building at a tile if it belongs to a faction other than
  // `faction`, else null.
  enemyWallAt(tx, ty, faction) {
    tx = this.col(tx);
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return null;
    const k = key(tx, ty);
    if (!this.wallTiles.has(k) || this.wallTiles.get(k) === faction) return null;
    return this.buildingTiles.get(k) ?? null;
  }

  // Ramps are free-standing planks between two points, not tiles: units walk
  // along them (see Unit.rideRamp). Surface y of `seg` at world x, or null.
  static rampY(seg, x) {
    if (x < seg.x1 || x > seg.x2) return null;
    return seg.y1 + ((seg.y2 - seg.y1) * (x - seg.x1)) / (seg.x2 - seg.x1);
  }

  // Ramps whose span covers world x.
  rampsAt(x) {
    const out = [];
    for (const seg of this.ramps.values()) if (x >= seg.x1 && x <= seg.x2) out.push(seg);
    return out;
  }

  // Top of solid ground/platform/bridge directly under world point (x, y),
  // within `reach` px below it (world y), or null.
  floorBelow(x, y, reach) {
    const tx = Math.floor(x / TILE_SIZE);
    for (let ty = Math.max(0, Math.floor(y / TILE_SIZE)); ty * TILE_SIZE <= y + reach && ty < MAP_H; ty++) {
      if (this.isSolid(tx, ty) && ty * TILE_SIZE >= y - 0.5) return ty * TILE_SIZE;
    }
    return null;
  }

  // ── Routes ─────────────────────────────────────────────────────────────
  // Units find their way over a grid of half-tile columns. Each column lists
  // what can be stood on there: tile tops and bridge decks. Cached until the
  // map changes.
  columns() {
    if (this.cols?.version === this.version) return this.cols.list;
    const C = TILE_SIZE / 2;
    const list = [];
    for (let i = 0; i < MAP_W * 2; i++) {
      const x = i * C + C / 2;
      const out = [];
      for (let ty = 1; ty < MAP_H; ty++) {
        if (this.isSolid(i >> 1, ty) && !this.isSolid(i >> 1, ty - 1)) out.push({ y: ty * TILE_SIZE, key: `t${ty}` });
      }
      for (const [id, seg] of this.ramps) {
        if (x >= seg.x1 && x <= seg.x2) out.push({ y: TileMap.rampY(seg, x), key: `r${id}`, seg });
      }
      list.push(out);
    }
    this.cols = { version: this.version, list };
    return list;
  }

  // Shortest walk for a unit `h` tall standing at (x, y) on surface `key`
  // (null: whatever's nearest) to the spot pointed at (toX, toY): the
  // columns it crosses, each with the surface to be on there. Units can walk
  // along a surface, cross between ones that meet, and drop off edges, but
  // not climb walls. Null if the column pointed at can't be reached.
  route(x, y, key, toX, toY, h) {
    const C = TILE_SIZE / 2;
    const cols = this.columns();
    // Height of a surface where two columns meet (a deck ending short of
    // there counts as ending at its end); two surfaces join up there when
    // they're within a few px of each other.
    const at = (s, xb) => (s.seg ? TileMap.rampY(s.seg, Math.max(s.seg.x1, Math.min(s.seg.x2, xb))) : s.y);
    const n = cols.length;
    const colOf = (wx) => {
      const i = Math.floor(wx / C);
      return this.wrap ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
    };
    let i0 = colOf(x);
    const gi = colOf(toX);
    const near = (list, wy) => list.reduce((b, s, k) => (b < 0 || Math.abs(s.y - wy) < Math.abs(list[b].y - wy) ? k : b), -1);
    let k0 = key ? cols[i0].findIndex((s) => s.key === key) : -1;
    // Feet still on a ledge ending just behind (a wide unit overhangs the
    // next column well before it drops): start from the ledge.
    for (const d of key ? [-1, 1, -2, 2] : []) {
      if (k0 >= 0) break;
      const j = colOf(x + d * C);
      const k = cols[j].findIndex((s) => s.key === key);
      if (k >= 0) [i0, k0] = [j, k];
    }
    if (k0 < 0) k0 = near(cols[i0], y);
    if (k0 < 0) return null;
    // The surface pointed at: the first one at or below the point.
    const goal = cols[gi].filter((s) => s.y >= toY - 8).sort((a, b) => a.y - b.y)[0]
      ?? cols[gi].reduce((b, s) => (!b || s.y > b.y ? s : b), null);
    if (!goal) return null;

    // Cheapest walk (Dial's algorithm: costs are small whole numbers). A
    // drop costs extra, so units walk round to a slope rather than jumping.
    const id = (i, k) => i * 64 + k;
    const prev = new Map([[id(i0, k0), -1]]);
    const drops = new Set(); // nodes reached by stepping off an edge
    const cost = new Map([[id(i0, k0), 0]]);
    const buckets = [[id(i0, k0)]];
    let best = null;
    search: for (let c = 0; c < buckets.length; c++) {
      for (const node of buckets[c] || []) {
        if (cost.get(node) !== c) continue; // found cheaper since
        const i = Math.floor(node / 64);
        const cur = cols[i][node % 64];
        if (i === gi && (best == null || Math.abs(cur.y - goal.y) < Math.abs(cols[gi][best % 64].y - goal.y))) {
          best = node;
          if (cur.key === goal.key) break search;
        }
        for (const d of [-1, 1]) {
          let j = i + d;
          if (this.wrap) j = (j + n) % n;
          else if (j < 0 || j >= n) continue;
          // A wall or a ledge in the way (a step it can get up isn't).
          let blocked = false;
          for (let ty = Math.floor((cur.y - h + 2) / TILE_SIZE); ty <= Math.floor((cur.y - 2) / TILE_SIZE); ty++) {
            if (ty * TILE_SIZE < cur.y - 16 && this.isSolid(j >> 1, ty)) blocked = true;
          }
          if (blocked) continue;
          const there = cols[j];
          const xb = (d > 0 ? i + 1 : i) * C;
          let next = there.map((s, k) => k).filter((k) => there[k].key === cur.key || Math.abs(at(there[k], xb) - at(cur, xb)) <= 6);
          let step = 1;
          const drop = !next.length;
          // Walked off the end: drop to whatever's below.
          if (drop) {
            const below = there.map((s, k) => k).filter((k) => there[k].y > cur.y);
            if (!below.length) continue;
            const k = below.reduce((b, k2) => (there[k2].y < there[b].y ? k2 : b));
            next = [k];
            step += Math.ceil((there[k].y - cur.y) / 8);
          }
          for (const k of next) {
            const nid = id(j, k);
            if (cost.has(nid) && cost.get(nid) <= c + step) continue;
            cost.set(nid, c + step);
            prev.set(nid, node);
            if (drop) drops.add(nid);
            else drops.delete(nid);
            (buckets[c + step] ||= []).push(nid);
          }
        }
      }
    }
    if (best == null) return null;
    const path = [];
    for (let node = best; node !== -1; node = prev.get(node)) {
      const s = cols[Math.floor(node / 64)][node % 64];
      path.push({ i: Math.floor(node / 64), x: Math.floor(node / 64) * C + C / 2, key: s.key, drop: drops.has(node) });
    }
    return path.reverse();
  }

  worldToTile(wx, wy) { return [Math.floor(wx / TILE_SIZE), Math.floor(wy / TILE_SIZE)]; }

  canPlace(tx, ty, w, h, type) {
    const sitsOnGround = ty + h - 1 === this.groundTop - 1;
    if (tx < 0 || tx + w > MAP_W || ty < 0 || ty + h > MAP_H) return false;
    for (let x = tx; x < tx + w; x++) {
      for (let y = ty; y < ty + h; y++) {
        if (this.buildingTiles.has(key(x, y))) return false;
        const t = this.get(x, y);
        if (t !== TILE_EMPTY && !(sitsOnGround && t === TILE_GROUND)) return false;
      }
    }
    const bottom = ty + h - 1;
    for (let x = tx; x < tx + w; x++) if (!this.isSolid(x, bottom + 1)) return false;
    return true;
  }

  occupy(b) {
    if (b.seg) { this.ramps.set(b.id, b.seg); this.version++; return; }
    for (let x = b.tx; x < b.tx + b.wt; x++)
      for (let y = b.ty; y < b.ty + b.ht; y++) {
        const k = key(x, y);
        this.buildingTiles.set(k, b.id);
        if (b.def.blocksUnits) this.wallTiles.set(k, b.faction);
      }
    this.version++;
  }

  release(b) {
    if (b.seg) { this.ramps.delete(b.id); this.version++; return; }
    for (let x = b.tx; x < b.tx + b.wt; x++)
      for (let y = b.ty; y < b.ty + b.ht; y++) {
        const k = key(x, y);
        if (this.buildingTiles.get(k) === b.id) this.buildingTiles.delete(k);
        this.wallTiles.delete(k);
      }
    this.version++;
  }
}
