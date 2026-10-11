// Procedural terrain + tile occupancy. Ported from archive/godot-era/godot/scripts/game/tilemap.gd.
import {
  MAP_W, MAP_H, TILE_SIZE, GROUND_LEVEL_TILE, PLATFORM_ROWS,
  TILE_EMPTY, TILE_GROUND, TILE_PLATFORM, TILE_BRIDGE, TILE_RAMP,
} from './config.js';

const key = (tx, ty) => ty * MAP_W + tx;
const modW = (tx) => ((tx % MAP_W) + MAP_W) % MAP_W;

export class TileMap {
  constructor() {
    this.tiles = new Uint8Array(MAP_W * MAP_H);
    this.buildingTiles = new Map(); // key -> building id (placement overlap check)
    this.wallTiles = new Map();     // key -> owning faction
    this.spanTiles = new Map();     // key -> building id (bridges + ramps)
    this.version = 0;               // bumped whenever terrain changes (minimap cache)
    this.generate();
  }

  get groundTop() { return MAP_H - GROUND_LEVEL_TILE; } // 17

  generate() {
    this.tiles.fill(TILE_EMPTY);
    this.buildingTiles.clear();
    this.wallTiles.clear();
    this.spanTiles.clear();
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

  isRamp(tx, ty) { return this.get(tx, ty) === TILE_RAMP; }

  // Id of the wall building at a tile if it belongs to a faction other than
  // `faction`, else null.
  enemyWallAt(tx, ty, faction) {
    tx = this.col(tx);
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return null;
    const k = key(tx, ty);
    if (!this.wallTiles.has(k) || this.wallTiles.get(k) === faction) return null;
    return this.buildingTiles.get(k) ?? null;
  }

  // Ramps work like diagonal bridges: a ramp may float in the air as long as
  // it carries on diagonally from a ramp, platform, bridge or the ground.
  // Returns the [dx, dy] offsets of those diagonal neighbours.
  rampDiagonals(tx, ty) {
    return [[-1, 1], [1, 1], [-1, -1], [1, -1]].filter(([dx, dy]) => this.get(tx + dx, ty + dy) !== TILE_EMPTY);
  }

  // Where the next ramp in a staircase most likely goes after one at (tx, ty):
  // straight on, away from the tile it hangs off. A ramp resting on the ground
  // heads for the nearer platform it could reach diagonally (right by default).
  rampNext(tx, ty) {
    const empty = (x, y) => this.get(x, y) === TILE_EMPTY;
    if (!this.isSolid(tx, ty + 1)) {
      const [dx, dy] = this.rampDiagonals(tx, ty)[0] || [-1, 1];
      return [tx - dx, ty - dy];
    }
    const reach = (dir) => {
      for (let k = 2; k <= 10 && ty - k >= 0; k++) {
        if (!empty(tx + dir * k, ty - k) || !empty(tx + dir * k, ty - k + 1)) return k;
      }
      return Infinity;
    };
    const dir = reach(-1) < reach(1) ? -1 : 1;
    return [tx + dir, ty - 1];
  }

  worldToTile(wx, wy) { return [Math.floor(wx / TILE_SIZE), Math.floor(wy / TILE_SIZE)]; }

  canPlace(tx, ty, w, h, type) {
    const sitsOnGround = ty + h - 1 === this.groundTop - 1;
    if (tx < 0 || tx + w > MAP_W || ty < 0 || ty + h > MAP_H) return false;
    for (let x = tx; x < tx + w; x++) {
      for (let y = ty; y < ty + h; y++) {
        if (this.buildingTiles.has(key(x, y))) return false;
        if (type === 'bridge' || type === 'ramp') {
          if (this.get(x, y) !== TILE_EMPTY) return false;
          continue;
        }
        const t = this.get(x, y);
        if (t !== TILE_EMPTY && !(sitsOnGround && t === TILE_GROUND)) return false;
      }
    }
    const bottom = ty + h - 1;
    if (type === 'bridge') {
      // Must extend sideways from an existing platform or bridge.
      const l = this.get(tx - 1, ty), r = this.get(tx + w, ty);
      return l === TILE_BRIDGE || l === TILE_PLATFORM || r === TILE_BRIDGE || r === TILE_PLATFORM;
    }
    if (type === 'ramp') return this.isSolid(tx, bottom + 1) || this.rampDiagonals(tx, ty).length > 0;
    for (let x = tx; x < tx + w; x++) if (!this.isSolid(x, bottom + 1)) return false;
    return true;
  }

  occupy(b) {
    for (let x = b.tx; x < b.tx + b.wt; x++)
      for (let y = b.ty; y < b.ty + b.ht; y++) {
        const k = key(x, y);
        this.buildingTiles.set(k, b.id);
        if (b.def.blocksUnits) this.wallTiles.set(k, b.faction);
        if (b.def.isBridge || b.def.isRamp) {
          this.set(x, y, b.def.isBridge ? TILE_BRIDGE : TILE_RAMP);
          this.spanTiles.set(k, b.id);
        }
      }
    this.version++;
  }

  release(b) {
    for (let x = b.tx; x < b.tx + b.wt; x++)
      for (let y = b.ty; y < b.ty + b.ht; y++) {
        const k = key(x, y);
        if (this.buildingTiles.get(k) === b.id) this.buildingTiles.delete(k);
        this.wallTiles.delete(k);
        if (this.spanTiles.get(k) === b.id) {
          this.spanTiles.delete(k);
          this.set(x, y, TILE_EMPTY);
        }
      }
    this.version++;
  }
}
