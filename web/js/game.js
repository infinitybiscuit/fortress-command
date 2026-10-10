// Game state, economy, AI and win conditions. Ported from godot/scripts/game/game_scene.gd.
import {
  TILE_SIZE, MODES, PLAYER_NAMES, STARTING_MONEY, ECONOMY_TICK, AI_TICK, BUILDING_TYPES, UNIT_TYPES,
} from './config.js';
import { TileMap } from './tilemap.js';
import { Unit, Building, Projectile, State } from './entities.js';

const MAX_PROJECTILES = 100;

export class Game {
  constructor(modeKey, events = {}) {
    this.modeKey = modeKey;
    this.mode = MODES[modeKey];
    this.events = events; // { onGameOver(winnerIdx), onMessage(text) }
    this.map = new TileMap();
    this.units = [];
    this.buildings = [];
    this.projectiles = [];
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
    if (this.mode.startSoldiers) {
      const y = this.map.groundTop * TILE_SIZE;
      this.spawnUnit('soldier', 250, y, 0);
      this.spawnUnit('soldier', 290, y, 0);
      const last = this.players.length - 1;
      this.spawnUnit('soldier', 6140, y, last);
      this.spawnUnit('soldier', 6100, y, last);
    }
    this.players.forEach((p, i) => { p.income = this.incomeFor(i); });
  }

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
  placementFor(type, wx, wy) {
    const d = BUILDING_TYPES[type];
    const [tx, tapTy] = this.map.worldToTile(wx, wy);
    let ty = tapTy;
    // Fingers are imprecise: snap to the surface in the tapped column (bridges
    // span open air, so they stay exactly where tapped).
    if (type !== 'bridge') {
      while (ty > 0 && this.map.isSolid(tx, ty)) ty--;
      while (ty < this.map.groundTop - 1 && !this.map.isSolid(tx, ty + 1)) ty++;
    }
    return this.placementAt(type, tx - Math.floor((d.w - 1) / 2), ty - d.h + 1);
  }

  placementAt(type, tx, ty) {
    const d = BUILDING_TYPES[type];
    return { tx, ty, w: d.w, h: d.h, valid: this.map.canPlace(tx, ty, d.w, d.h, type) };
  }

  tryPlaceAt(playerIdx, type, tx, ty) {
    const p = this.players[playerIdx];
    const d = BUILDING_TYPES[type];
    if (p.money < d.cost) return 'Not enough credits!';
    if (!this.placementAt(type, tx, ty).valid) return "Can't place here!";
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
    const towardRight = b.x + b.w / 2 < 3200;
    const x = towardRight ? b.x + b.w + 8 : b.x - 8;
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
    this.projectiles.push(new Projectile(this, from, target, damage, shooter.faction, opts));
    if (this.projectiles.length > MAX_PROJECTILES) this.projectiles.shift();
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
    const dir = hq.x < 3200 ? 1 : -1;
    const groundY = this.map.groundTop - 2;

    if (!mine && p.money >= 200) {
      const tx = dir > 0 ? hq.tx + hq.wt + 1 : hq.tx - 3;
      if (this.map.canPlace(tx, groundY, 2, 2, 'mine')) { p.money -= 200; this.spawnBuilding('mine', tx, groundY, i); }
    }
    if (!barracks && p.money >= 150) {
      const tx = dir > 0 ? hq.tx + hq.wt + 4 : hq.tx - 8;
      if (this.map.canPlace(tx, groundY, 3, 2, 'barracks')) {
        p.money -= 150;
        barracks = this.spawnBuilding('barracks', tx, groundY, i);
      }
    }
    // Mid-game: add a workshop and save up for vehicles.
    let workshop = this.buildings.find((b) => b.faction === i && b.type === 'workshop');
    if (!workshop && barracks && this.time > 90 && p.money >= 200) {
      const tx = dir > 0 ? hq.tx + hq.wt + 8 : hq.tx - 12;
      if (this.map.canPlace(tx, groundY, 3, 2, 'workshop')) {
        p.money -= 200;
        workshop = this.spawnBuilding('workshop', tx, groundY, i);
      }
    }
    const workshopIdle = workshop && !workshop.constructing && !workshop.trainCurrent && !workshop.queue.length;
    if (workshopIdle) {
      // Choose the next vehicle up front, then save for it.
      p.nextVehicle ||= Math.random() < 0.45 ? 'tank' : Math.random() < 0.5 ? 'artillery' : 'jeep';
      const cost = UNIT_TYPES[p.nextVehicle].cost;
      if (p.money >= cost && workshop.queueTrain(p.nextVehicle)) {
        p.money -= cost;
        p.nextVehicle = null;
      }
    }
    const saving = workshopIdle && Math.random() < 0.6;

    if (!saving && barracks && !barracks.constructing && barracks.queue.length < 2) {
      // Mix in heavier units as the match goes on.
      const pick = this.time > 120 && Math.random() < 0.35 ? 'heavy' : 'soldier';
      const cost = UNIT_TYPES[pick].cost;
      if (p.money >= cost && barracks.queueTrain(pick)) p.money -= cost;
    }

    const enemies = [];
    for (const u of this.units) if (u.faction !== i && !u.dead) enemies.push(u);
    for (const b of this.buildings) if (b.faction !== i && !b.dead) enemies.push(b);

    for (const u of this.units) {
      if (u.faction !== i || u.dead || u.state === State.ATTACKING) continue;
      let best = null;
      let bestD = Infinity;
      for (const e of enemies) {
        const [ex, ey] = e.centre();
        const d = Math.hypot(ex - u.x, ey - (u.y - u.h / 2));
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) u.attack(best);
    }
  }
}
