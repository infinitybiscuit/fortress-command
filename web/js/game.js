// Game state, economy, AI and win conditions. Ported from godot/scripts/game/game_scene.gd.
import {
  TILE_SIZE, WORLD_W, MAP_W, MODES, PLAYER_NAMES, BUILD_RADIUS_TILES, STARTING_MONEY, ECONOMY_TICK, AI_TICK, BUILDING_TYPES, UNIT_TYPES,
} from './config.js';
import { TileMap } from './tilemap.js';
import { Unit, Building, Projectile, State, canReach, distTo } from './entities.js';

const MAX_PROJECTILES = 100;

export class Game {
  constructor(modeKey, events = {}) {
    this.modeKey = modeKey;
    this.mode = MODES[modeKey];
    this.events = events; // { onGameOver(winnerIdx), onMessage(text) }
    this.map = new TileMap();
    // Looping map (Free-for-All): x wraps around and distances take the short way.
    this.wrap = !!this.mode.wrap;
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

    const hqY = this.map.groundTop - BUILDING_TYPES.hq.h;
    this.mode.players.forEach(([hqX, isAi], i) => {
      const p = { faction: i, money: STARTING_MONEY, income: 0, isAi, hq: null, alive: true };
      this.players.push(p);
      p.hq = this.spawnBuilding('hq', hqX, hqY, i);
    });
    // Everyone starts with two soldiers posted in front of their HQ.
    const y = this.map.groundTop * TILE_SIZE;
    this.players.forEach((p, i) => {
      const [hx] = p.hq.centre();
      const dir = this.wrap || hx < WORLD_W / 2 ? 1 : -1;
      for (const off of [122, 162]) this.spawnUnit('soldier', this.normX(hx + dir * off), y, i);
    });
    this.players.forEach((p, i) => { p.income = this.incomeFor(i); });
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

  normX(x) { return this.wrap ? ((x % WORLD_W) + WORLD_W) % WORLD_W : x; }

  get humanCount() { return this.players.filter((p) => !p.isAi).length; }

  spawnUnit(type, x, y, faction) {
    const u = new Unit(this, type, x, y, faction);
    this.units.push(u);
    return u;
  }

  buildingById(id) { return this.buildings.find((b) => b.id === id && !b.dead) || null; }

  spawnBuilding(type, tx, ty, faction) {
    const b = new Building(this, type, tx, ty, faction);
    this.buildings.push(b);
    this.map.occupy(b);
    return b;
  }

  // Tile placement for a building centred on the touched tile, resting on that row.
  placementFor(type, wx, wy, playerIdx) {
    const d = BUILDING_TYPES[type];
    const [tx, tapTy] = this.map.worldToTile(wx, wy);
    let ty = tapTy;
    // Fingers are imprecise: snap to the surface in the tapped column (bridges
    // span open air, so they stay exactly where tapped).
    if (type !== 'bridge') {
      while (ty > 0 && this.map.isSolid(tx, ty)) ty--;
      while (ty < this.map.groundTop - 1 && !this.map.isSolid(tx, ty + 1)) ty++;
    }
    return this.placementAt(type, tx - Math.floor((d.w - 1) / 2), ty - d.h + 1, playerIdx);
  }

  // Validity of a footprint: terrain/overlap rules, plus (when a player is
  // given) the build-zone rule. `reason` is 'terrain' or 'zone' when invalid.
  placementAt(type, tx, ty, playerIdx) {
    const d = BUILDING_TYPES[type];
    const terrainOk = this.map.canPlace(tx, ty, d.w, d.h, type);
    const zoneOk = playerIdx == null || this.inBuildZone(playerIdx, tx, d.w);
    const reason = !zoneOk ? 'zone' : !terrainOk ? 'terrain' : null;
    return { tx, ty, w: d.w, h: d.h, valid: !reason, reason };
  }

  // Tile ranges [from, to) where a player may build: around each of their
  // zone-extending buildings, BUILD_RADIUS_TILES either side.
  buildZones(playerIdx) {
    const spans = this.buildings
      .filter((b) => b.faction === playerIdx && !b.dead && !b.def.noZone)
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
  inBuildZone(playerIdx, tx, w) {
    const shifts = this.wrap ? [-MAP_W, 0, MAP_W] : [0];
    return this.buildZones(playerIdx).some(([from, to]) => shifts.some((s) => tx < to + s && tx + w > from + s));
  }

  tryPlaceAt(playerIdx, type, tx, ty) {
    const p = this.players[playerIdx];
    const d = BUILDING_TYPES[type];
    if (p.money < d.cost) return 'Not enough credits!';
    const pl = this.placementAt(type, tx, ty, playerIdx);
    if (pl.reason === 'zone') return 'Too far from your base!';
    if (!pl.valid) return "Can't place here!";
    p.money -= d.cost;
    this.spawnBuilding(type, tx, ty, playerIdx);
    return null;
  }

  // Refund for selling: a full refund while still under construction, otherwise
  // half the cost scaled by remaining health. Queued units are refunded in full.
  sellValue(b) {
    if (b.type === 'hq') return 0;
    const base = b.constructing ? b.def.cost : Math.floor(b.def.cost * 0.5 * (b.hp / b.maxHp));
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
      opts = { kind: shooter.def.shot, splash: shooter.def.splash, vsBuildings: shooter.def.vsBuildings };
    } else {
      from = shooter.centre();
      from[1] = shooter.y + 10;
    }
    opts.shooter = shooter;
    this.projectiles.push(new Projectile(this, from, target, damage, shooter.faction, opts));
    if (this.projectiles.length > MAX_PROJECTILES) this.projectiles.shift();
  }

  dropBomb(bomber) {
    const d = bomber.def;
    this.projectiles.push(new Projectile(this, [bomber.x, bomber.y + 2], null, d.damage, bomber.faction,
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
      if (distTo(u.x, u.y - u.h / 2, victim) > radius || !canReach(u, source)) continue;
      u.attack(source);
      u.home = u.x;
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
    owner.hq = null;
    owner.alive = false;
    // Eliminated players' remaining forces collapse with their HQ.
    for (const u of this.units) if (u.faction === b.faction) u.dead = true;
    for (const o of this.buildings) if (o.faction === b.faction && !o.dead) { o.dead = true; this.map.release(o); }
    this.buildings = this.buildings.filter((o) => !o.dead);
    this.units = this.units.filter((u) => !u.dead);
    this.events.onMessage?.(`${PLAYER_NAMES[b.faction]} HQ destroyed!`);
    this.checkGameOver();
  }

  checkGameOver() {
    const alive = this.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
    const humansAlive = alive.filter((i) => !this.players[i].isAi);
    if (alive.length <= 1) return this.finish(alive.length ? alive[0] : -1);
    // Single-human modes: losing your HQ ends the game immediately.
    if (this.humanCount === 1 && humansAlive.length === 0) return this.finish(alive[0]);
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

    if (!mine && p.money >= 200) {
      const tx = dir > 0 ? hq.tx + hq.wt + 1 : hq.tx - 3;
      if (this.placementAt('mine', tx, groundY, i).valid) { p.money -= 200; this.spawnBuilding('mine', tx, groundY, i); }
    }
    if (!barracks && p.money >= 150) {
      const tx = dir > 0 ? hq.tx + hq.wt + 4 : hq.tx - 8;
      if (this.placementAt('barracks', tx, groundY, i).valid) {
        p.money -= 150;
        barracks = this.spawnBuilding('barracks', tx, groundY, i);
      }
    }
    // Mid-game: add a workshop and save up for vehicles.
    let workshop = this.buildings.find((b) => b.faction === i && b.type === 'workshop');
    if (!workshop && barracks && this.time > 90 && p.money >= 200) {
      const tx = dir > 0 ? hq.tx + hq.wt + 8 : hq.tx - 12;
      if (this.placementAt('workshop', tx, groundY, i).valid) {
        p.money -= 200;
        workshop = this.spawnBuilding('workshop', tx, groundY, i);
      }
    }
    // Late game: an airbase for helicopters and bombers (built before spending on vehicles).
    let airbase = this.buildings.find((b) => b.faction === i && b.type === 'airbase');
    if (!airbase && workshop && !workshop.constructing && this.time > 180 && p.money >= 300) {
      const tx = dir > 0 ? hq.tx + hq.wt + 12 : hq.tx - 17;
      if (this.placementAt('airbase', tx, groundY, i).valid) {
        p.money -= 300;
        airbase = this.spawnBuilding('airbase', tx, groundY, i);
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

  // CPU army orders: defend the base when it's threatened, otherwise march on
  // the nearest enemy HQ and fight whatever gets in the way.
  commandArmy(i) {
    const hq = this.players[i].hq;
    const mine = this.buildings.filter((b) => b.faction === i);
    const threats = this.units.filter((e) => !e.dead && e.faction !== i
      && mine.some((b) => distTo(e.x, e.y - e.h / 2, b) < 650));
    const enemyHqs = this.players.filter((o, j) => j !== i && o.hq).map((o) => o.hq);
    const [hx] = hq.centre();

    for (const u of this.units) {
      if (u.faction !== i || u.dead || u.repairRate > 0) continue;
      const busy = u.state === State.ATTACKING && u.target && !u.target.dead;
      const nearest = (list) => {
        let best = null;
        let bestD = Infinity;
        for (const e of list) {
          if (e.dead || u.isIgnoring(e) || !canReach(u, e)) continue;
          const d = distTo(u.x, u.y - u.h / 2, e);
          if (d < bestD) { bestD = d; best = e; }
        }
        return best;
      };

      // Defence: units near home turn back on raiders.
      if (threats.length && Math.abs(this.dx(hx, u.x)) < 1500) {
        if (busy && threats.includes(u.target)) continue;
        const t = nearest(threats);
        if (t) { u.attack(t); continue; }
      }
      // Already fighting a unit, an HQ, or something blocking the way: carry on.
      if (busy && (u.target.kind === 'unit' || u.target.type === 'hq' || u.resume)) continue;
      // Offence: engage enemies close by, else push on the nearest enemy HQ.
      const local = nearest(this.units.filter((e) => e.faction !== i && distTo(u.x, u.y - u.h / 2, e) < 350));
      const target = local || nearest(enemyHqs);
      if (target && target !== u.target) u.attack(target);
    }
  }
}
