// Game state, economy, AI and win conditions. Ported from archive/godot-era/godot/scripts/game/game_scene.gd.
import {
  TILE_SIZE, TILE_EMPTY, WORLD_W, FIELD_TILES, FIELD_SIZE, FIELD_SPOTS, WORLD_H, RAMP_MAX_ANGLE, RAMP_MAX_LEN, RAMP_LEVEL_SNAP, MAP_W, MODES, PLAYER_NAMES, BUILD_RADIUS_TILES, STARTING_MONEY, ECONOMY_TICK, AI_TICK, BUILDING_TYPES, UNIT_TYPES,
} from './config.js';
import { TileMap } from './tilemap.js';
import { Terrain } from './terrain.js';
import { Unit, Building, Projectile, State, canReach, distTo } from './entities.js';
import { makeFlags, updateFlags, sendHome, flagCarriedBy } from './flags.js';

const MAX_PROJECTILES = 100;

// 240 → "4:00"
export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class Game {
  // mode: a MODES key, or a mode object (online games build their own).
  constructor(mode, events = {}) {
    this.mode = typeof mode === 'string' ? MODES[mode] : mode;
    this.events = events; // { onGameOver(winnerIdx), onMessage(text) }
    // Isometric games are played on a flat square field: units move in x and
    // z, buildings have square footprints, and there are no platforms, bridges
    // or looping edges.
    this.field = !!this.mode.field;
    this.map = new TileMap(this.field);
    // Looping map (online games with 3+ players): x wraps around and distances take the short way.
    this.wrap = !this.field && !!this.mode.wrap;
    this.map.wrap = this.wrap;
    this.units = [];
    this.buildings = [];
    this.projectiles = [];
    this.effects = []; // purely visual (falling soldiers, wrecks, debris)
    this.players = [];
    this.economyTimer = 0;
    this.aiTimer = 0;
    this.over = false;
    this.time = 0;
    // Capture the Flag: HQs can't be destroyed; bring an enemy flag home to win.
    this.ctf = !!this.mode.ctf;
    this.flags = [];

    const hqY = this.map.groundTop - BUILDING_TYPES.hq.h;
    const spots = FIELD_SPOTS[this.mode.players.length];
    if (this.field) {
      // A fresh landscape every game. The seed rides along in the mode, so
      // online guests (who get the host's mode) build the same one.
      if (this.mode.seed == null) this.mode.seed = Math.floor(Math.random() * 2 ** 31);
      this.terrain = new Terrain(this.mode.seed, spots, BUILDING_TYPES.hq.w);
    }
    this.mode.players.forEach(([hqX, isAi], i) => {
      const p = { faction: i, money: STARTING_MONEY, income: 0, isAi, hq: null, alive: true };
      this.players.push(p);
      if (this.field) {
        p.hq = this.spawnBuilding('hq', spots[i][0], hqY, i, null, spots[i][1]);
        return;
      }
      // Side-on, every HQ sits up in a keep on the top row, so it can't be
      // rushed: attackers have to fight their way up its stair.
      const top = this.map.addKeep(hqX, this.facing(hqX), i);
      p.hq = this.spawnBuilding('hq', hqX, top - BUILDING_TYPES.hq.h, i);
    });
    // Everyone starts with two soldiers posted in front of their HQ.
    const y = this.map.groundTop * TILE_SIZE;
    this.players.forEach((p, i) => {
      const [hx] = p.hq.centre();
      if (this.field) {
        for (const side of [-24, 24]) {
          const [x, z] = this.fieldExit(p.hq, 60, side);
          this.spawnUnit('soldier', x, y, i).z = z;
        }
        return;
      }
      // Side-on, they stand guard in the keep beside the HQ, at the top of the stair.
      const dir = this.facing(p.hq.tx);
      const top = p.hq.y + p.hq.h;
      for (const off of [104, 136]) this.spawnUnit('soldier', this.normX(hx + dir * off), top, i).post();
    });
    this.players.forEach((p, i) => { p.income = this.incomeFor(i); });
    if (this.ctf) this.flags = makeFlags(this);
  }

  // Signed horizontal offset from a to b (shortest way round on looping maps).
  dx(a, b) {
    let d = b - a;
    if (this.wrap) {
      d = ((d % WORLD_W) + WORLD_W) % WORLD_W;
      if (d > WORLD_W / 2) d -= WORLD_W;
    }
    return d;
  }

  // Which way an HQ at tile x looks: toward the middle (always right on looping maps).
  facing(tx) { return this.wrap || tx * TILE_SIZE < WORLD_W / 2 ? 1 : -1; }

  // Seconds until a building type can be built (0 once it's unlocked).
  lockedFor(type) { return Math.max(0, (BUILDING_TYPES[type]?.unlockAt ?? 0) - this.time); }

  normX(x) { return this.wrap ? ((x % WORLD_W) + WORLD_W) % WORLD_W : x; }

  // On the field: the spot `gap` beyond building b's footprint on the side
  // facing the middle of the field, moved `side` across. Returns [x, z].
  fieldExit(b, gap, side = 0) {
    const cx = b.x + b.w / 2;
    const cz = b.z + b.d / 2;
    const mid = FIELD_SIZE / 2;
    const len = Math.hypot(mid - cx, mid - cz) || 1;
    const ux = (mid - cx) / len;
    const uz = (mid - cz) / len;
    const r = b.w / 2 / Math.max(Math.abs(ux), Math.abs(uz)) + gap;
    return [cx + ux * r - uz * side, cz + uz * r + ux * side];
  }

  get humanCount() { return this.players.filter((p) => !p.isAi).length; }

  spawnUnit(type, x, y, faction) {
    const u = new Unit(this, type, x, y, faction);
    this.units.push(u);
    return u;
  }

  buildingById(id) { return this.buildings.find((b) => b.id === id && !b.dead) || null; }

  // tz: the footprint's depth row on the field (null on the side-on map).
  spawnBuilding(type, tx, ty, faction, seg = null, tz = null) {
    const b = new Building(this, type, tx, ty, faction, this.field ? tz ?? 0 : null);
    if (seg) b.setSeg(seg); // ramps: a plank between two points
    this.buildings.push(b);
    if (!this.field) this.map.occupy(b);
    return b;
  }

  // Tile placement for a building centred on the touched tile, resting on that
  // row. On the field the touched spot is (wx, wz) on the ground instead.
  placementFor(type, wx, wy, playerIdx, wz = 0) {
    const d = BUILDING_TYPES[type];
    if (this.field) {
      const half = (d.w - 1) / 2;
      return this.placementAt(type, Math.round(wx / TILE_SIZE - 0.5 - half), this.map.groundTop - d.h, playerIdx,
        Math.round(wz / TILE_SIZE - 0.5 - half));
    }
    const [tx, tapTy] = this.map.worldToTile(wx, wy);
    let ty = tapTy;
    // Fingers are imprecise: snap to the surface in the tapped column.
    while (ty > 0 && this.map.isSolid(tx, ty)) ty--;
    while (ty < this.map.groundTop - 1 && !this.map.isSolid(tx, ty + 1)) ty++;
    return this.placementAt(type, tx - Math.floor((d.w - 1) / 2), ty - d.h + 1, playerIdx);
  }

  // Validity of a footprint: terrain/overlap rules, plus (when a player is
  // given) the build-zone rule. `reason` is 'terrain' or 'zone' when invalid.
  placementAt(type, tx, ty, playerIdx, tz = 0) {
    const d = BUILDING_TYPES[type];
    if (this.field) {
      // Inside the field and clear of every other footprint.
      const terrainOk = !d.isRamp && tx >= 0 && tz >= 0 && tx + d.w <= FIELD_TILES && tz + d.w <= FIELD_TILES
        && this.terrain.buildable(tx, tz, d.w)
        && !this.buildings.some((b) => !b.dead && tx < b.tx + b.wt && tx + d.w > b.tx && tz < b.tz + b.wt && tz + d.w > b.tz);
      const zoneOk = playerIdx == null || this.inBuildZone(playerIdx, tx, d.w, tz);
      const reason = !zoneOk ? 'zone' : !terrainOk ? 'terrain' : null;
      return { tx, ty, tz, w: d.w, h: d.h, valid: !reason, reason };
    }
    const terrainOk = this.map.canPlace(tx, ty, d.w, d.h, type);
    const zoneOk = playerIdx == null || this.inBuildZone(playerIdx, tx, d.w);
    const reason = !zoneOk ? 'zone' : !terrainOk ? 'terrain' : null;
    return { tx, ty, w: d.w, h: d.h, valid: !reason, reason };
  }

  // Tile ranges [from, to) where a player may build: around each of their
  // zone-extending buildings, BUILD_RADIUS_TILES either side. On the field,
  // squares [x0, z0, x1, z1) around each one instead.
  buildZones(playerIdx) {
    const own = this.buildings.filter((b) => b.faction === playerIdx && !b.dead && !b.def.noZone);
    if (this.field) {
      const R = BUILD_RADIUS_TILES;
      return own.map((b) => [Math.max(0, b.tx - R), Math.max(0, b.tz - R),
        Math.min(FIELD_TILES, b.tx + b.wt + R), Math.min(FIELD_TILES, b.tz + b.wt + R)]);
    }
    const spans = own
      .map((b) => [b.tx - BUILD_RADIUS_TILES, b.tx + b.wt + BUILD_RADIUS_TILES])
      .sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const s of spans) {
      const last = merged[merged.length - 1];
      if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
      else merged.push([...s]);
    }
    return merged;
  }

  // A footprint is in the zone if it overlaps any zone span (or, on looping
  // maps, a span's copy one map-width either side).
  inBuildZone(playerIdx, tx, w, tz = 0) {
    if (this.field) {
      return this.buildZones(playerIdx).some(([x0, z0, x1, z1]) => tx < x1 && tx + w > x0 && tz < z1 && tz + w > z0);
    }
    const shifts = this.wrap ? [-MAP_W, 0, MAP_W] : [0];
    return this.buildZones(playerIdx).some(([from, to]) => shifts.some((s) => tx < to + s && tx + w > from + s));
  }

  tryPlaceAt(playerIdx, type, tx, ty, tz = 0) {
    const p = this.players[playerIdx];
    const d = BUILDING_TYPES[type];
    if (!d || d.isRamp) return "Can't place here!"; // ramps go through tryPlaceRamp
    if (this.field && !(Number.isInteger(tz) && Number.isInteger(tx))) return "Can't place here!";
    if (this.lockedFor(type) > 0) return `Unlocks at ${clock(d.unlockAt)}!`;
    if (p.money < d.cost) return 'Not enough credits!';
    const pl = this.placementAt(type, tx, ty, playerIdx, tz);
    if (pl.reason === 'zone') return 'Too far from your base!';
    if (!pl.valid) return "Can't place here!";
    p.money -= d.cost;
    if (this.field) ty = this.map.groundTop - d.h;
    this.spawnBuilding(type, tx, ty, playerIdx, null, tz);
    return null;
  }

  // ── Bridges ────────────────────────────────────────────────────────────
  // Laid like Poly Bridge planks: drag from one point to another. Ends snap
  // to what's near them (another bridge's end or deck, a platform's corner,
  // or any ground/platform surface), so joints sit flush. `anchor` says the
  // end rests on something.
  rampSnap(wx, wy, radius) {
    const T = TILE_SIZE;
    let best = null;
    let bestD = radius;
    const consider = (x, y, weight = 1) => {
      const d = Math.hypot(x - wx, y - wy) * weight;
      if (d <= bestD) { bestD = d; best = { x, y, anchor: true }; }
    };
    for (const seg of this.map.ramps.values()) {
      consider(seg.x1, seg.y1, 0.6);
      consider(seg.x2, seg.y2, 0.6);
      // Anywhere along its deck, to branch off it.
      const x = Math.max(seg.x1, Math.min(seg.x2, wx));
      consider(x, TileMap.rampY(seg, x));
    }
    const m = this.map;
    const solid = (tx, ty) => m.get(tx, ty) !== TILE_EMPTY;
    const surface = (tx, ty) => solid(tx, ty) && !solid(tx, ty - 1);
    for (let tx = Math.floor((wx - radius) / T); tx <= Math.floor((wx + radius) / T); tx++) {
      for (let ty = Math.floor((wy - radius) / T); ty <= Math.floor((wy + radius) / T) + 1; ty++) {
        if (!surface(tx, ty)) continue;
        // Deck corners at a platform's open ends pull hardest: that's where a
        // ramp joins it cleanly.
        if (!solid(tx - 1, ty)) consider(tx * T, ty * T, 0.6);
        if (!solid(tx + 1, ty)) consider((tx + 1) * T, ty * T, 0.6);
        // Anywhere along a surface.
        const x = Math.max(tx * T, Math.min((tx + 1) * T, wx));
        consider(x, ty * T);
      }
    }
    return best || { x: wx, y: wy, anchor: false };
  }

  // A bridge from point a to point b: { x1, y1, x2, y2 } left to right, its
  // cost, and whether it can be built (`reason` says why not). Nearly flat
  // drags lie level, pivoting on the attached end.
  rampSegment(playerIdx, a, b) {
    const T = TILE_SIZE;
    const tilt = Math.atan2(Math.abs(b.y - a.y), Math.max(Math.abs(b.x - a.x), 0.001)) * 180 / Math.PI;
    if (tilt <= RAMP_LEVEL_SNAP && a.y !== b.y) {
      if (!b.anchor) b = { ...b, y: a.y };
      else if (!a.anchor) a = { ...a, y: b.y };
    }
    const [l, r] = a.x <= b.x ? [a, b] : [b, a];
    const dx = r.x - l.x;
    const dy = r.y - l.y;
    const len = Math.hypot(dx, dy);
    const pieces = Math.max(1, Math.round(len / T));
    const out = {
      seg: true, x1: l.x, y1: l.y, x2: r.x, y2: r.y, a, b,
      angle: Math.round((Math.atan2(Math.abs(dy), Math.max(dx, 0.001)) * 180) / Math.PI),
      cost: pieces * BUILDING_TYPES.bridge.cost, valid: false, reason: null,
    };
    const fail = (reason) => Object.assign(out, { reason });
    if (dx < T * 0.75) return fail('short');
    if (out.angle > RAMP_MAX_ANGLE) return fail('steep');
    if (len > RAMP_MAX_LEN * T) return fail('long');
    if (l.x < 0 || r.x > WORLD_W || Math.min(l.y, r.y) < 0 || Math.max(l.y, r.y) > WORLD_H) return fail('blocked');
    if (!a.anchor && !b.anchor) return fail('float');
    // Nothing solid in the way between the ends.
    for (let d = 6; d < len - 6; d += 4) {
      const x = l.x + (dx * d) / len;
      const y = l.y + (dy * d) / len;
      if (this.map.isSolid(Math.floor(x / T), Math.floor((y - 3) / T))) return fail('blocked');
    }
    for (const seg of this.map.ramps.values()) {
      // Don't stack a ramp on top of another one.
      if (seg.x1 < r.x - 2 && seg.x2 > l.x + 2 && Math.abs(seg.y1 - l.y) < 2 && Math.abs(seg.y2 - r.y) < 2) return fail('blocked');
    }
    if (playerIdx != null && !this.inBuildZone(playerIdx, Math.floor(l.x / T), Math.max(1, Math.ceil(dx / T)))) return fail('zone');
    out.valid = true;
    return out;
  }

  tryPlaceRamp(playerIdx, a, b) {
    if (this.field) return "Can't place here!"; // no bridges on the flat field
    const num = (v) => typeof v === 'number' && Number.isFinite(v);
    if (!Array.isArray(a) || !Array.isArray(b) || !a.every(num) || !b.every(num)) return "Can't place here!";
    // Re-check the ends against this map (they were snapped on the sender's).
    const ra = this.rampSnap(a[0], a[1], 1.5);
    const rb = this.rampSnap(b[0], b[1], 1.5);
    const seg = this.rampSegment(playerIdx, { ...ra, x: a[0], y: a[1] }, { ...rb, x: b[0], y: b[1] });
    if (seg.reason === 'zone') return 'Too far from your base!';
    if (!seg.valid) return "Can't place here!";
    const p = this.players[playerIdx];
    if (p.money < seg.cost) return 'Not enough credits!';
    p.money -= seg.cost;
    this.spawnBuilding('bridge', Math.floor(seg.x1 / TILE_SIZE), Math.floor(seg.y1 / TILE_SIZE), playerIdx,
      { x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 });
    return null;
  }

  // Refund for selling: a full refund while still under construction, otherwise
  // half the cost scaled by remaining health. Queued units are refunded in full.
  sellValue(b) {
    if (b.type === 'hq') return 0;
    const cost = b.cost ?? b.def.cost;
    const base = b.constructing ? cost : Math.floor(cost * 0.5 * (b.hp / b.maxHp));
    const queued = [...b.queue, ...(b.trainCurrent ? [b.trainCurrent] : [])]
      .reduce((sum, t) => sum + UNIT_TYPES[t].cost, 0);
    return base + queued;
  }

  sell(playerIdx, b) {
    if (b.dead || b.faction !== playerIdx || b.type === 'hq') return 0;
    const refund = this.sellValue(b);
    this.players[playerIdx].money += refund;
    b.dead = true;
    this.buildings = this.buildings.filter((o) => o !== b);
    this.map.release(b);
    return refund;
  }

  train(playerIdx, building, type) {
    const p = this.players[playerIdx];
    const cost = UNIT_TYPES[type].cost;
    if (building.faction !== playerIdx || p.money < cost) return false;
    if (!building.queueTrain(type)) return false;
    p.money -= cost;
    return true;
  }

  onUnitTrained(b, type) {
    if (this.field) {
      // Out of the side facing the middle, spread a little so they don't stack.
      const [x, z] = this.fieldExit(b, 14, (Math.random() - 0.5) * b.w * 0.6);
      const u = this.spawnUnit(type, x, b.y + b.h, b.faction);
      u.z = z;
      u.facing = x + z > b.x + b.z + b.w ? 1 : -1;
      return;
    }
    // Spawn beside the building on whichever side faces the map centre.
    const towardRight = this.wrap || b.x + b.w / 2 < WORLD_W / 2;
    const x = this.normX(towardRight ? b.x + b.w + 8 : b.x - 8);
    const u = this.spawnUnit(type, x, b.y + b.h, b.faction);
    u.facing = towardRight ? 1 : -1;
  }

  fireProjectile(shooter, target, damage) {
    let from;
    let opts = {};
    if (shooter.kind === 'unit') {
      // Muzzle sits near the top of vehicles' guns and at chest height on infantry.
      from = shooter.vehicle
        ? [shooter.x + shooter.facing * shooter.w * 0.45, shooter.y - shooter.h * 0.75]
        : [shooter.x, shooter.y - 14];
      if (this.field) {
        // The barrel points at the target across the ground, not along x.
        const [ax, az] = shooter.aimAt(target);
        const len = Math.hypot(ax - shooter.x, az - shooter.z) || 1;
        const reach = shooter.vehicle ? shooter.w * 0.45 : 0;
        from = [shooter.x + ((ax - shooter.x) / len) * reach, from[1], shooter.z + ((az - shooter.z) / len) * reach];
      }
      opts = { kind: shooter.def.shot, splash: shooter.def.splash, vsBuildings: shooter.def.vsBuildings };
    } else {
      from = shooter.centre();
      from[1] = shooter.y + 10;
      from[2] = shooter.z + shooter.d / 2;
      // Missile sites launch from the top of the rail.
      if (shooter.def.airOnly) { from[1] = shooter.y + 4; opts = { kind: 'missile' }; }
    }
    opts.shooter = shooter;
    this.projectiles.push(new Projectile(this, from, target, damage, shooter.faction, opts));
    if (this.projectiles.length > MAX_PROJECTILES) this.projectiles.shift();
  }

  dropBomb(bomber) {
    const d = bomber.def;
    this.projectiles.push(new Projectile(this, [bomber.x, bomber.y + 2, bomber.z], null, d.damage, bomber.faction,
      { kind: 'bomb', splash: d.splash, vsBuildings: d.vsBuildings, shooter: bomber }));
  }

  // Something of ours was hit: idle troops nearby rally to deal with the attacker.
  callForHelp(victim, source) {
    if (!source || source.dead || source.faction === victim.faction) return;
    if (victim.lastAlert && this.time - victim.lastAlert < 1) return;
    victim.lastAlert = this.time;
    const radius = victim.kind === 'building' ? 450 : 320;
    for (const u of this.units) {
      if (u.dead || u === victim || u.faction !== victim.faction || u.repairRate > 0) continue;
      if (u.state !== State.IDLE || u.hold) continue;
      if (distTo(u.x, u.y - u.h / 2, victim, u.z) > radius || !canReach(u, source)) continue;
      u.attack(source);
      u.post();
    }
  }

  incomeFor(i) {
    let total = 0;
    for (const b of this.buildings) if (b.faction === i) total += b.income;
    return total;
  }

  update(dt) {
    if (this.over) return;
    this.time += dt;

    this.economyTimer += dt;
    if (this.economyTimer >= ECONOMY_TICK) {
      this.economyTimer -= ECONOMY_TICK;
      this.players.forEach((p, i) => {
        p.income = this.incomeFor(i);
        p.money += p.income;
      });
    }

    this.aiTimer += dt;
    if (this.aiTimer >= AI_TICK) {
      this.aiTimer -= AI_TICK;
      this.players.forEach((p, i) => { if (p.isAi && p.alive) this.runAi(i); });
    }

    for (const u of this.units) u.update(dt);
    for (const b of this.buildings) b.update(dt);
    for (const pr of this.projectiles) pr.update(dt);
    if (this.ctf) updateFlags(this);

    this.projectiles = this.projectiles.filter((p) => !p.done);
    this.units = this.units.filter((u) => !u.dead);
    const destroyed = this.buildings.filter((b) => b.dead);
    if (destroyed.length) {
      this.buildings = this.buildings.filter((b) => !b.dead);
      for (const b of destroyed) this.onBuildingDestroyed(b);
    }
  }

  onBuildingDestroyed(b) {
    this.map.release(b);
    const owner = this.players[b.faction];
    if (owner.hq !== b) return;
    this.eliminate(b.faction, `${PLAYER_NAMES[b.faction]} HQ destroyed!`);
  }

  // A player is out (HQ destroyed, or flag captured): their remaining forces
  // collapse, and the game ends once one player is left.
  eliminate(f, text) {
    const owner = this.players[f];
    owner.hq = null;
    owner.alive = false;
    for (const u of this.units) if (u.faction === f) u.dead = true;
    for (const o of this.buildings) if (o.faction === f && !o.dead) { o.dead = true; this.map.release(o); }
    this.buildings = this.buildings.filter((o) => !o.dead);
    this.units = this.units.filter((u) => !u.dead);
    this.events.onMessage?.(text);
    this.checkGameOver();
  }

  checkGameOver() {
    const alive = this.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
    const humansAlive = alive.filter((i) => !this.players[i].isAi);
    if (alive.length <= 1) return this.finish(alive.length ? alive[0] : -1);
    // Once the last human HQ falls there's nobody left to play for.
    if (this.humanCount > 0 && humansAlive.length === 0) return this.finish(alive[0]);
  }

  finish(winner) {
    this.over = true;
    this.events.onGameOver?.(winner);
  }

  // ── CPU player (ported from _process_ai_player) ─────────────────────────
  runAi(i) {
    const p = this.players[i];
    const hq = p.hq;
    if (!hq) return;
    const mine = this.buildings.find((b) => b.faction === i && b.type === 'mine');
    let barracks = this.buildings.find((b) => b.faction === i && b.type === 'barracks');
    // Build toward the map centre so structures don't fall off the edge.
    const dir = this.wrap || hq.x < WORLD_W / 2 ? 1 : -1;
    const groundY = this.map.groundTop - 2;
    // Buy and place a building at tile tx (on the field, wherever fits best).
    const place = (type, tx) => {
      const spot = this.field ? this.aiSpot(i, type) : { tx, tz: null };
      if (!spot || !this.placementAt(type, spot.tx, groundY, i, spot.tz ?? 0).valid) return null;
      p.money -= BUILDING_TYPES[type].cost;
      return this.spawnBuilding(type, spot.tx, groundY, i, null, spot.tz);
    };

    if (!mine && p.money >= 200) place('mine', dir > 0 ? hq.tx + hq.wt + 1 : hq.tx - 3);
    if (!barracks && p.money >= 150) barracks = place('barracks', dir > 0 ? hq.tx + hq.wt + 4 : hq.tx - 8);
    // Fortify the keep: a turret beside the HQ and a wall across the top of
    // the stair (put back if they're knocked down).
    if (!this.field && barracks) {
      for (const [type, rel] of [['turret', 4], ['wall', 7]]) {
        const d = BUILDING_TYPES[type];
        const tx = dir > 0 ? hq.tx + rel : hq.tx + hq.wt - rel - d.w;
        const ty = hq.ty + hq.ht - d.h;
        if (p.money < d.cost + 50) break;
        if (this.buildings.some((b) => b.faction === i && b.type === type && b.tx === tx && b.ty === ty)) continue;
        if (!this.placementAt(type, tx, ty, i).valid) continue;
        p.money -= d.cost;
        this.spawnBuilding(type, tx, ty, i);
      }
    }
    // Mid-game: add a workshop and save up for vehicles.
    let workshop = this.buildings.find((b) => b.faction === i && b.type === 'workshop');
    if (!workshop && barracks && this.time > 90 && p.money >= 200) {
      workshop = place('workshop', dir > 0 ? hq.tx + hq.wt + 8 : hq.tx - 12);
    }
    // Late game: an airbase for helicopters and bombers (built before spending on vehicles).
    let airbase = this.buildings.find((b) => b.faction === i && b.type === 'airbase');
    if (!airbase && workshop && !workshop.constructing && !this.lockedFor('airbase') && p.money >= 300) {
      airbase = place('airbase', dir > 0 ? hq.tx + hq.wt + 12 : hq.tx - 17);
    }
    // Enemy aircraft about: put up a missile site by the HQ (up in the keep
    // on the side-on map), and a second once they keep coming.
    const sams = this.buildings.filter((b) => b.faction === i && b.type === 'sam').length;
    const planes = this.units.filter((u) => u.air && u.faction !== i).length;
    if (planes > sams * 3 && sams < 2 && p.money >= BUILDING_TYPES.sam.cost) {
      if (this.field) place('sam');
      else {
        const top = hq.ty + hq.ht - BUILDING_TYPES.sam.h;
        const tx = [dir > 0 ? hq.tx + hq.wt : hq.tx - 2, dir > 0 ? hq.tx - 2 : hq.tx + hq.wt, dir > 0 ? hq.tx + hq.wt + 2 : hq.tx - 4]
          .find((x) => this.placementAt('sam', x, top, i).valid);
        if (tx != null) { p.money -= BUILDING_TYPES.sam.cost; this.spawnBuilding('sam', tx, top, i); }
      }
    }
    const workshopIdle = workshop && !workshop.constructing && !workshop.trainCurrent && !workshop.queue.length;
    const airbaseIdle = airbase && !airbase.constructing && !airbase.trainCurrent && !airbase.queue.length;
    // Save for one big purchase at a time, alternating between factories.
    if (!p.saveFor) {
      const options = [workshopIdle && 'workshop', airbaseIdle && 'airbase'].filter(Boolean);
      if (options.length) {
        const which = options[Math.floor(Math.random() * options.length)];
        p.saveFor = which === 'workshop'
          ? { factory: workshop, unit: Math.random() < 0.45 ? 'tank' : Math.random() < 0.5 ? 'artillery' : 'jeep' }
          : { factory: airbase, unit: Math.random() < 0.6 ? 'helicopter' : 'bomber' };
      }
    }
    if (p.saveFor) {
      const { factory, unit } = p.saveFor;
      const cost = UNIT_TYPES[unit].cost;
      if (factory.dead) p.saveFor = null;
      else if (p.money >= cost && factory.queueTrain(unit)) {
        p.money -= cost;
        p.saveFor = null;
      }
    }
    const saving = !!p.saveFor && Math.random() < 0.6;

    if (!saving && barracks && !barracks.constructing && barracks.queue.length < 2) {
      // Mix in heavier units as the match goes on.
      const pick = this.time > 120 && Math.random() < 0.35 ? 'heavy' : 'soldier';
      const cost = UNIT_TYPES[pick].cost;
      if (p.money >= cost && barracks.queueTrain(pick)) p.money -= cost;
    }

    this.commandArmy(i);
  }

  // On the field: the free spot in the CPU's zone nearest a point in front of
  // its HQ (toward the middle), a tile clear of its other buildings.
  aiSpot(i, type) {
    const T = TILE_SIZE;
    const w = BUILDING_TYPES[type].w;
    const [fx, fz] = this.fieldExit(this.players[i].hq, 3 * T);
    let best = null;
    let bestD = Infinity;
    for (const [x0, z0, x1, z1] of this.buildZones(i)) {
      for (let tx = x0; tx + w <= x1; tx++) {
        for (let tz = z0; tz + w <= z1; tz++) {
          const d = Math.hypot((tx + w / 2) * T - fx, (tz + w / 2) * T - fz);
          if (d >= bestD || !this.placementAt(type, tx, 0, i, tz).valid) continue;
          if (this.buildings.some((b) => tx <= b.tx + b.wt && tx + w >= b.tx && tz <= b.tz + b.wt && tz + w >= b.tz)) continue;
          bestD = d;
          best = { tx, tz };
        }
      }
    }
    return best;
  }

  // CPU army orders: defend the base when it's threatened, otherwise march on
  // the nearest enemy HQ and fight whatever gets in the way.
  commandArmy(i) {
    if (this.ctf) { this.commandFlags(i); return; }
    const hq = this.players[i].hq;
    const mine = this.buildings.filter((b) => b.faction === i);
    const threats = this.units.filter((e) => !e.dead && e.faction !== i
      && mine.some((b) => distTo(e.x, e.y - e.h / 2, b, e.z) < 650));
    const enemyHqs = this.players.filter((o, j) => j !== i && o.hq).map((o) => o.hq);
    const [hx] = hq.centre();
    const hz = hq.z + hq.d / 2;

    for (const u of this.units) {
      if (u.faction !== i || u.dead || u.repairRate > 0) continue;
      const busy = u.state === State.ATTACKING && u.target && !u.target.dead;
      // climb: also targets up a stair (a route search each, so only for HQs).
      const nearest = (list, climb = false) => {
        let best = null;
        let bestD = Infinity;
        for (const e of list) {
          if (e.dead || u.isIgnoring(e)) continue;
          const d = distTo(u.x, u.y - u.h / 2, e, u.z);
          if (d < bestD && (climb ? u.canAttack(e) : canReach(u, e))) { bestD = d; best = e; }
        }
        return best;
      };

      // Defence: units near home turn back on raiders.
      if (threats.length && u.away(hx, hz) < 1500) {
        if (busy && threats.includes(u.target)) continue;
        const t = nearest(threats, true);
        if (t) { u.attack(t); continue; }
      }
      // Already fighting a unit, an HQ, or something blocking the way: carry on.
      if (busy && (u.target.kind === 'unit' || u.target.type === 'hq' || u.resume)) continue;
      // Offence: engage enemies close by, else push on the nearest enemy HQ.
      const local = nearest(this.units.filter((e) => e.faction !== i && distTo(u.x, u.y - u.h / 2, e, u.z) < 350));
      const target = local || nearest(enemyHqs, true);
      if (target && target !== u.target) u.attack(target);
    }
  }

  // Capture the Flag orders: run down whoever has our flag, fetch it back if
  // it's lying about, keep a couple of guards by it, and send the rest (once
  // there are a few of them) to grab an enemy flag. Carriers run it home.
  commandFlags(i) {
    const own = this.flags[i];
    if (own.out) return;
    const home = own.home;
    const army = this.units.filter((u) => u.faction === i && !u.dead && u.repairRate === 0 && !u.air);
    const thief = own.carrier && own.carrier.faction !== i ? own.carrier : null;
    const carrying = (u) => !!flagCarriedBy(this, u);
    const goTo = (u, x, y, z) => {
      if (u.state === State.MOVING && Math.abs(this.dx(u.moveX, x)) < 24 && Math.abs((u.moveZ ?? 0) - z) < 24) return;
      u.moveTo(x, y, this.field ? z : null);
    };
    const far = (u, x, z) => u.away(x, z);

    let guards = army.filter((u) => u.guard);
    for (const u of army) {
      if (guards.length >= 2) break;
      if (!u.guard && !carrying(u)) { u.guard = true; guards.push(u); }
    }
    // Our flag is lying out on the field: the nearest free unit fetches it.
    let fetcher = null;
    if (!own.carrier && !own.atHome) {
      fetcher = army.filter((u) => !carrying(u)).sort((a, b) => far(a, own.x, own.z) - far(b, own.x, own.z))[0] || null;
    }
    const raiders = army.filter((u) => !u.guard && !carrying(u) && u !== fetcher);
    const threats = this.units.filter((e) => !e.dead && e.faction !== i && Math.hypot(this.dx(e.x, home.x), this.field ? e.z - home.z : e.y - home.y) < 500);
    const enemyFlags = this.flags.filter((f) => !f.out && f.faction !== i && !(f.carrier && f.carrier.faction === i));
    const nearestTo = (u, list) => {
      let best = null;
      let bestD = Infinity;
      for (const e of list) {
        if (e.dead || u.isIgnoring(e)) continue;
        const d = distTo(u.x, u.y - u.h / 2, e, u.z);
        if (d < bestD && u.canAttack(e)) { bestD = d; best = e; }
      }
      return best;
    };
    const dir = this.facing(this.players[i].hq.tx);

    for (const u of army) {
      if (carrying(u)) { sendHome(this, u); continue; }
      if (u === fetcher) { goTo(u, own.x, own.y, own.z); continue; }
      // Stop the thief before it gets home.
      if (thief && far(u, thief.x, thief.z) < 1600 && u.canAttack(thief)) { if (u.target !== thief) u.attack(thief); continue; }
      const fighting = u.state === State.ATTACKING && u.target && !u.target.dead && u.target.kind === 'unit';
      if (u.guard) {
        if (fighting) continue;
        const t = nearestTo(u, threats);
        if (t) { u.attack(t); continue; }
        const k = guards.indexOf(u);
        const [gx, gz] = this.field ? this.fieldExit(this.players[i].hq, 40, (k - 0.5) * 50) : [this.normX(home.x + dir * (90 + k * 28)), home.z];
        if (far(u, gx, gz) > 40) goTo(u, gx, home.y, gz);
        continue;
      }
      if (fighting) continue;
      const local = nearestTo(u, this.units.filter((e) => e.faction !== i && distTo(u.x, u.y - u.h / 2, e, u.z) < 320));
      if (local) { u.attack(local); continue; }
      // Wait for a few to gather before going after a flag.
      if (raiders.length < 3 || !enemyFlags.length) continue;
      const fl = enemyFlags.slice().sort((a, b) => far(u, a.x, a.z) - far(u, b.x, b.z))[0];
      goTo(u, fl.x, fl.carrier ? fl.carrier.y : fl.y, fl.z);
    }
  }
}
