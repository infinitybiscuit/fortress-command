// Procedural terrain + tile occupancy. Ported from archive/godot-era/godot/scripts/game/tilemap.gd.
import {
  MAP_W, MAP_H, TILE_SIZE, GROUND_LEVEL_TILE, PLATFORM_ROWS,
  TILE_EMPTY, TILE_GROUND, TILE_PLATFORM, TILE_BRIDGE, TILE_RAMP,
} from './config.js';

const key = (tx, ty) => ty * MAP_W + tx;
export const RAMP_FOOT = 4; // world px: height of a grounded ramp's flat foot
const modW = (tx) => ((tx % MAP_W) + MAP_W) % MAP_W;

export class TileMap {
  constructor() {
    this.tiles = new Uint8Array(MAP_W * MAP_H);
    this.buildingTiles = new Map(); // key -> building id (placement overlap check)
    this.wallTiles = new Map();     // key -> owning faction
    this.spanTiles = new Map();     // key -> building id (bridges + ramps)
    this.rampDirs = new Map();      // key -> which way that ramp rises (+1 right, -1 left)
    this.version = 0;               // bumped whenever terrain changes (minimap cache)
    this.generate();
  }

  get groundTop() { return MAP_H - GROUND_LEVEL_TILE; } // 17

  generate() {
    this.tiles.fill(TILE_EMPTY);
    this.buildingTiles.clear();
    this.wallTiles.clear();
    this.spanTiles.clear();
    this.rampDirs.clear();
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

  // Ramps are diagonal bridges: each tile is a 45° slope, and a run of them
  // laid corner to corner makes one long incline. A ramp rises toward its
  // "high side" (+1 = right, -1 = left), worked out from what it joins:
  // the next ramp up or down the diagonal, or a platform/bridge it meets at
  // the top. A lone ramp on the ground faces the nearer platform it could reach.
  rampDir(tx, ty) {
    const set = this.rampDirs.get(key(this.col(tx), ty));
    if (set) return set;
    const ramp = (x, y) => this.get(x, y) === TILE_RAMP;
    const deck = (x, y) => { const t = this.get(x, y); return t === TILE_PLATFORM || t === TILE_BRIDGE; };
    const score = (d) => 2 * (ramp(tx - d, ty + 1) + ramp(tx + d, ty - 1)) + deck(tx + d, ty);
    const r = score(1), l = score(-1);
    if (r !== l) return r > l ? 1 : -1;
    return this.rampReach(tx, ty, -1) < this.rampReach(tx, ty, 1) ? -1 : 1;
  }

  // Ramps needed going `dir` from (tx, ty) before the slope meets a platform
  // or bridge at its top (Infinity if none within reach).
  rampReach(tx, ty, dir) {
    for (let k = 1; k <= 10 && ty - k + 1 >= 0; k++) {
      const t = this.get(tx + dir * k, ty - k + 1);
      if (t === TILE_PLATFORM || t === TILE_BRIDGE) return k;
      if (t !== TILE_EMPTY) return Infinity;
    }
    return Infinity;
  }

  // A ramp resting on the ground (or a platform) ends in a short flat foot.
  rampFooted(tx, ty) {
    const below = this.get(tx, ty + 1);
    return below !== TILE_EMPTY && below !== TILE_RAMP;
  }

  // World y of a ramp's walking surface at world x (clamped to its tile).
  rampSurface(tx, ty, wx) {
    const fx = Math.max(0, Math.min(TILE_SIZE, wx - tx * TILE_SIZE));
    const y = ty * TILE_SIZE + (this.rampDir(tx, ty) > 0 ? TILE_SIZE - fx : fx);
    return this.rampFooted(tx, ty) ? Math.min(y, (ty + 1) * TILE_SIZE - RAMP_FOOT) : y;
  }

  // Up to `n` free tiles running diagonally from (tx, ty) toward `d`, rising
  // (`up`) or falling. Stops early at anything in the way, once the slope's
  // top meets a platform or bridge, or once its foot reaches solid ground.
  rampRun(tx, ty, d, up, n) {
    const tiles = [];
    for (let k = 0; k < n; k++) {
      const x = tx + d * k, y = up ? ty - k : ty + k;
      if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) break;
      if (this.get(x, y) !== TILE_EMPTY || this.buildingTiles.has(key(x, y))) break;
      tiles.push([x, y]);
      const ahead = this.get(x + d, y);
      if (up && (ahead === TILE_PLATFORM || ahead === TILE_BRIDGE)) break;
      const below = this.get(x, y + 1);
      if (!up && k > 0 && below !== TILE_EMPTY && below !== TILE_RAMP) break;
    }
    return tiles;
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
    if (type === 'ramp') {
      // Rest on the ground, a platform or a bridge; meet a platform or bridge
      // side-on (the slope's top lines up with its deck); or carry on
      // diagonally from another ramp.
      const below = this.get(tx, ty + 1);
      const side = [this.get(tx - 1, ty), this.get(tx + 1, ty)];
      return (below !== TILE_EMPTY && below !== TILE_RAMP)
        || side.some((t) => t === TILE_PLATFORM || t === TILE_BRIDGE)
        || [[-1, 1], [1, 1], [-1, -1], [1, -1]].some(([dx, dy]) => this.get(tx + dx, ty + dy) === TILE_RAMP);
    }
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
          if (b.def.isRamp && b.dir) this.rampDirs.set(k, b.dir);
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
          this.rampDirs.delete(k);
          this.set(x, y, TILE_EMPTY);
        }
      }
    this.version++;
  }
}
