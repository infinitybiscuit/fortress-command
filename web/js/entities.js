// Units, buildings and projectiles. Ported from archive/godot-era/godot/scripts/entities/*.gd.
import {
  WORLD_W, WORLD_H, MAP_H, TILE_SIZE, TILE_GROUND, TILE_BRIDGE, GRAVITY, TERMINAL_VELOCITY, UNIT_W, UNIT_H, UNIT_TYPES, BUILDING_TYPES,
  PROJECTILE_SPEED, PROJECTILE_RADIUS,
} from './config.js';

let nextId = 1;

export const State = { IDLE: 0, MOVING: 1, ATTACKING: 2, REPAIRING: 3, DEAD: 4 };
const AUTO_SCAN_INTERVAL = 0.5;
const AGGRO_BONUS = 120;          // idle units notice enemies this far beyond weapon range
const MIN_AGGRO = 220;
const LEASH = 450;                // how far an idle unit chases before returning to post
const STUCK_SECONDS = 2;          // no progress toward an out-of-range target → give up
const IGNORE_SECONDS = 6;         // how long an abandoned target is ignored
const ENGINEER_REPAIR_RADIUS = 260;

// Distance from a point to an entity's body (closest point), so attacking a
// wide building works from either side.
export function distTo(x, y, e) {
  const r = e.bounds();
  // Looping maps: measure to the nearest copy of the target.
  if (e.game?.wrap) { const cx = r.x + r.w / 2; x = cx + e.game.dx(cx, x); }
  const cx = Math.max(r.x, Math.min(x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(y, r.y + r.h));
  return Math.hypot(cx - x, cy - y);
}

// Can `u` get a shot at `t`? Units can drop down to lower ground, but can't
// climb to a target that's above their weapon range (e.g. a high platform).
export function canReach(u, t) {
  if (t.air && !canHitAir(u)) return false;
  if (u.air) return !(u.def.shot === 'bomb' && t.air);
  const r = t.bounds();
  const [, cy] = u.centre();
  const gapAbove = cy - (r.y + r.h);
  return gapAbove <= u.range * 0.95;
}

// Only bullet-firing units (infantry, jeeps, helicopters) can shoot at aircraft.
export function canHitAir(u) {
  return u.kind === 'unit' && u.repairRate === 0 && (u.def.shot ?? 'bullet') === 'bullet';
}

// Visual-only effects (rendered by render.js drawEffects).
export function deathEffect(u) {
  return { kind: u.vehicle || u.air ? 'wreck' : 'fall', type: u.type, x: u.x, y: u.y, facing: u.facing, f: u.faction, t: 0, life: u.vehicle || u.air ? 5 : 6 };
}
export function debrisEffect(x, y, size) {
  const parts = [];
  for (let i = 0; i < 8; i++) {
    parts.push({ vx: (Math.random() - 0.5) * size * 5, vy: -80 - Math.random() * size * 3, c: Math.random() < 0.5 ? '#7a4a24' : '#5c361a' });
  }
  return { kind: 'debris', x, y, parts, t: 0, life: 0.9 };
}

export class Unit {
  constructor(game, type, x, y, faction) {
    const s = UNIT_TYPES[type];
    this.id = nextId++;
    this.game = game;
    this.kind = 'unit';
    this.type = type;
    this.def = s;
    this.vehicle = !!s.vehicle;
    this.air = !!s.air;
    this.heading = faction === 0 ? 1 : -1; // bombers: direction of the current run
    this.w = s.w || UNIT_W;
    this.h = s.h || UNIT_H;
    this.faction = faction;
    this.x = x; // feet (bottom-centre)
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = faction === 0 ? 1 : -1;
    this.hp = s.hp;
    this.maxHp = s.hp;
    this.speed = s.speed;
    this.range = s.range;
    this.damage = s.damage;
    this.cooldown = s.cooldown;
    this.repairRate = s.repair;
    this.cooldownTimer = 0;
    this.scanTimer = Math.random() * AUTO_SCAN_INTERVAL;
    this.state = State.IDLE;
    this.moveX = x;
    this.target = null;
    this.onGround = false;
    this.selected = false;
    this.flash = 0;
    this.dead = false;
  }

  bounds() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
  centre() { return [this.x, this.y - this.h / 2]; }

  containsPoint(px, py, pad = 6) {
    const b = this.bounds();
    if (this.game.wrap) px = this.x + this.game.dx(this.x, px);
    return px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad;
  }

  moveTo(x) {
    if (this.dead) return;
    this.resume = null;
    this.home = null;
    this.moveX = x;
    this.target = null;
    this.state = State.MOVING;
  }

  attack(target) {
    if (this.dead || !target || target.dead) return;
    this.resume = null;
    this.home = null;
    this.stuckT = 0;
    this.stuckX = this.x;
    // Engineers repair friendly buildings and vehicles.
    if (this.repairRate > 0 && target.faction === this.faction && (target.kind === 'building' || target.vehicle)) {
      this.target = target;
      this.state = State.REPAIRING;
      return;
    }
    this.target = target;
    this.state = State.ATTACKING;
  }

  // Attack `target`, then pick `resume` ({ moveX } or { target }) back up afterwards.
  engage(target, resume = null) {
    this.attack(target);
    this.resume = resume;
  }

  isIgnoring(t) { return t === this.ignoreTarget && this.game.time < this.ignoreUntil; }

  // Current target is dead or abandoned: resume the interrupted order, or
  // walk back to the post we left to chase something.
  finishTarget() {
    const r = this.resume;
    const home = this.home;
    this.target = null;
    this.state = State.IDLE;
    this.vx = 0;
    this.resume = null;
    if (r?.target && !r.target.dead && !this.isIgnoring(r.target)) this.attack(r.target);
    else if (r?.moveX != null) this.moveTo(r.moveX);
    else if (home != null && Math.abs(this.game.dx(this.x, home)) > 24 && !this.hold) this.moveTo(home);
  }

  giveUp(t) {
    this.ignoreTarget = t;
    this.ignoreUntil = this.game.time + IGNORE_SECONDS;
    this.finishTarget();
  }

  update(dt) {
    if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    if (this.flash > 0) this.flash -= dt;
    this.scanTimer -= dt;
    const scan = this.scanTimer <= 0;
    if (scan) this.scanTimer = AUTO_SCAN_INTERVAL;

    switch (this.state) {
      case State.IDLE:
        this.vx = 0;
        if (scan) this.autoEngage();
        break;
      case State.MOVING: {
        const dx = this.game.dx(this.x, this.moveX);
        if (Math.abs(dx) < 6) { this.vx = 0; this.state = State.IDLE; this.forced = false; break; }
        this.vx = Math.sign(dx) * this.speed;
        // Attack-move: fight anything that comes into weapon range, then carry on.
        if (scan && !this.forced && this.repairRate === 0) {
          const e = this.findEnemyUnit(this.range);
          if (e) this.engage(e, { moveX: this.moveX });
        }
        break;
      }
      case State.ATTACKING: {
        const t = this.target;
        if (!t || t.dead) { this.finishTarget(); break; }
        if (this.def.shot === 'bomb') { this.bombingRun(t); break; }
        const [cx, cy] = this.centre();
        if (scan) {
          if (!canReach(this, t)) { this.giveUp(t); break; }
          // Marching on a building: turn on enemy units that come into range.
          if (t.kind === 'building') {
            const e = this.findEnemyUnit(this.range);
            if (e) { this.engage(e, { target: t }); break; }
          }
        }
        if (distTo(cx, cy, t) > this.range) {
          // Out of range: hold position, leash back to post, or chase.
          if (this.hold) { this.vx = 0; if (scan) this.finishTarget(); break; }
          if (this.home != null && Math.abs(this.game.dx(this.home, this.x)) > LEASH) { this.giveUp(t); break; }
          const [tx] = t.centre();
          this.vx = Math.sign(this.game.dx(this.x, tx)) * this.speed;
          if (Math.abs(this.game.dx(this.stuckX, this.x)) > 6) { this.stuckX = this.x; this.stuckT = 0; }
          else if ((this.stuckT += dt) > STUCK_SECONDS) { this.giveUp(t); break; }
        } else {
          this.vx = 0;
          this.stuckT = 0;
          this.stuckX = this.x;
          this.facing = Math.sign(this.game.dx(this.x, t.centre()[0])) || this.facing;
          if (this.cooldownTimer <= 0) {
            this.cooldownTimer = this.cooldown;
            this.game.fireProjectile(this, t, this.damage);
          }
        }
        break;
      }
      case State.REPAIRING: {
        const t = this.target;
        if (!t || t.dead || t.hp >= t.maxHp) { this.finishTarget(); break; }
        const [cx, cy] = this.centre();
        if (distTo(cx, cy, t) > this.range) {
          this.vx = Math.sign(this.game.dx(this.x, t.centre()[0])) * this.speed;
        } else {
          this.vx = 0;
          t.repair(this.repairRate * dt);
        }
        break;
      }
      default:
        this.vx = 0;
    }
    if (this.vx !== 0) this.facing = Math.sign(this.vx);
    const wasMoving = this.state === State.MOVING;
    this.blockedBy = null;
    if (this.air) this.fly(dt);
    else this.applyPhysics(dt);

    // Walked into an enemy wall: knock it down, then resume the order.
    const wall = this.blockedBy;
    if (wall && !wall.dead && this.target !== wall && this.repairRate === 0) {
      const resume = wasMoving ? { moveX: this.moveX }
        : this.state === State.ATTACKING ? { target: this.target } : null;
      this.engage(wall, resume);
    }
  }

  // Idle behaviour: engineers patch up nearby friendlies; everyone else
  // engages enemies within their aggro radius and returns to post afterwards.
  autoEngage() {
    const [cx, cy] = this.centre();
    if (this.repairRate > 0) {
      let best = null;
      let bestD = ENGINEER_REPAIR_RADIUS;
      for (const e of [...this.game.buildings, ...this.game.units]) {
        if (e.dead || e.faction !== this.faction || e.hp >= e.maxHp || e.constructing) continue;
        if (e.kind === 'unit' && !e.vehicle) continue;
        const d = distTo(cx, cy, e);
        if (d < bestD && canReach(this, e)) { bestD = d; best = e; }
      }
      if (best) { const home = this.x; this.attack(best); this.home = home; }
      return;
    }
    const radius = this.hold ? this.range : this.aggroRadius;
    const target = this.findEnemyUnit(radius) || this.findEnemyBuilding(this.range);
    if (target) {
      const home = this.home ?? this.x;
      this.attack(target);
      this.home = home;
    }
  }

  get aggroRadius() { return Math.max(this.range + AGGRO_BONUS, MIN_AGGRO); }

  findEnemyUnit(radius) {
    const [cx, cy] = this.centre();
    let best = null;
    let bestD = radius;
    for (const u of this.game.units) {
      if (u === this || u.dead || u.faction === this.faction || this.isIgnoring(u)) continue;
      const d = distTo(cx, cy, u);
      if (d <= bestD && canReach(this, u)) { bestD = d; best = u; }
    }
    return best;
  }

  findEnemyBuilding(radius) {
    const [cx, cy] = this.centre();
    let best = null;
    let bestD = radius;
    for (const b of this.game.buildings) {
      if (b.dead || b.faction === this.faction || this.isIgnoring(b)) continue;
      const d = distTo(cx, cy, b);
      if (d <= bestD && canReach(this, b)) { bestD = d; best = b; }
    }
    return best;
  }

  // Shot by someone: fight back (unless holding an explicit order) and call for help.
  onAttacked(source) {
    if (!source || source.dead || source.faction === this.faction) return;
    this.game.callForHelp(this, source);
    if (this.repairRate > 0 || !canReach(this, source)) return;
    if (this.state === State.IDLE) {
      const home = this.home ?? this.x;
      this.attack(source);
      this.home = home;
    } else if (this.state === State.MOVING && !this.forced) {
      this.engage(source, { moveX: this.moveX });
    } else if (this.state === State.ATTACKING && this.target?.kind === 'building' && source.kind === 'unit') {
      this.engage(source, { target: this.target });
    }
  }

  // Bombers fly back-and-forth runs over the target, releasing a bomb each
  // time they pass overhead with the bay reloaded.
  bombingRun(t) {
    const [tx] = t.centre();
    const dx = this.game.dx(this.x, tx);
    if (Math.abs(dx) < 16 && this.cooldownTimer <= 0) {
      this.cooldownTimer = this.cooldown;
      this.game.dropBomb(this);
    }
    // Overshoot by a bit, then turn round for the next pass.
    if (dx * this.heading < -140) this.heading = -this.heading;
    else if (Math.abs(dx) > 140) this.heading = Math.sign(dx);
    this.vx = this.heading * this.speed;
  }

  // Altitude this aircraft wants to hold right now (world y of its underside).
  cruiseY() {
    if (this.def.altitude) return this.def.altitude;
    const t = this.state === State.ATTACKING ? this.target : null;
    if (t) {
      const r = t.bounds();
      return t.air ? r.y + r.h : r.y - this.def.hover + this.h;
    }
    return this.cruise ?? this.y;
  }

  // Aircraft ignore gravity and terrain: slide horizontally, climb/descend
  // toward cruise height. Freshly built aircraft take off from the pad.
  fly(dt) {
    this.x = this.game.wrap ? this.game.normX(this.x + this.vx * dt)
      : Math.min(WORLD_W - this.w / 2, Math.max(this.w / 2, this.x + this.vx * dt));
    if (this.cruise == null) this.cruise = this.def.altitude ?? Math.max(this.h + 40, this.y - 160);
    const want = Math.max(this.h + 24, Math.min(this.cruiseY(), WORLD_H - 64));
    const climb = 140 * dt;
    this.y += Math.max(-climb, Math.min(climb, want - this.y));
    if (this.state === State.ATTACKING) this.cruise = this.y; // keep fighting altitude afterwards
    this.vy = 0;
    this.onGround = false;
  }

  // Sub-step so fast units (or a long frame) can't tunnel through a 32px tile.
  applyPhysics(dt) {
    const travel = Math.max(Math.abs(this.vx), Math.abs(this.vy) + GRAVITY * dt) * dt;
    const n = Math.min(8, Math.max(1, Math.ceil(travel / 12)));
    for (let i = 0; i < n; i++) this.stepPhysics(dt / n);
  }

  // Separate-axis AABB tile collision; (x, y) is the unit's feet.
  stepPhysics(dt) {
    const map = this.game.map;
    const ts = TILE_SIZE;
    const halfW = this.w / 2;
    const h = this.h;

    this.vy = Math.min(this.vy + GRAVITY * dt, TERMINAL_VELOCITY);

    let newX = this.x + this.vx * dt;
    if (this.vx !== 0) {
      const dir = this.vx > 0 ? 1 : -1;
      const tx = Math.floor((newX + dir * halfW) / ts);
      const tyTop = Math.floor((this.y - h + 2) / ts);
      const tyBot = Math.floor((this.y - 2) / ts);
      let blocked = false;
      for (let ty = tyTop; ty <= tyBot; ty++) {
        if (!map.isSolidForFaction(tx, ty, this.faction)) continue;
        // Lemmings-style staircase: step up onto a ramp tile when grounded.
        if (this.onGround && map.isRamp(tx, ty) && !map.isSolidForFaction(tx, ty - 1, this.faction)) {
          this.y -= ts;
          this.vy = 0;
          break;
        }
        blocked = true;
        const wallId = map.enemyWallAt(tx, ty, this.faction);
        if (wallId != null) this.blockedBy = this.game.buildingById(wallId);
        break;
      }
      if (blocked) {
        newX = dir > 0 ? tx * ts - halfW : (tx + 1) * ts + halfW;
        this.vx = 0;
        if (this.state === State.MOVING) this.state = State.IDLE;
      }
    }
    this.x = this.game.normX(newX);

    let newY = this.y + this.vy * dt;
    const txL = Math.floor((this.x - halfW + 2) / ts);
    const txR = Math.floor((this.x + halfW - 2) / ts);
    this.onGround = false;
    if (this.vy >= 0) {
      const oldFeet = Math.floor(this.y / ts);
      const newFeet = Math.floor(newY / ts);
      outer: for (let ty = oldFeet; ty <= newFeet; ty++) {
        for (let tx = txL; tx <= txR; tx++) {
          if (map.isSolid(tx, ty)) {
            newY = ty * ts;
            this.vy = 0;
            this.onGround = true;
            break outer;
          }
        }
      }
    } else {
      const headTy = Math.floor((newY - h) / ts);
      for (let tx = txL; tx <= txR; tx++) {
        if (map.isSolid(tx, headTy)) { newY = (headTy + 1) * ts + h; this.vy = 0; break; }
      }
    }
    this.y = newY;
  }

  takeDamage(amount, source) {
    if (this.dead) return;
    this.hp -= amount;
    this.flash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.state = State.DEAD;
      this.game.effects?.push(deathEffect(this));
      return;
    }
    this.onAttacked(source);
  }

  repair(amount) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}

export class Building {
  constructor(game, type, tx, ty, faction) {
    const d = BUILDING_TYPES[type];
    this.id = nextId++;
    this.game = game;
    this.kind = 'building';
    this.type = type;
    this.def = d;
    this.faction = faction;
    this.tx = tx;
    this.ty = ty;
    this.wt = d.w;
    this.ht = d.h;
    this.x = tx * TILE_SIZE;
    this.y = ty * TILE_SIZE;
    this.w = d.w * TILE_SIZE;
    this.h = d.h * TILE_SIZE;
    this.hp = d.hp;
    this.maxHp = d.hp;
    this.buildTime = d.buildTime;
    this.constructing = d.buildTime > 0;
    this.progress = this.constructing ? 0 : 1;
    this.attackTimer = 0;
    this.queue = [];
    this.trainCurrent = null;
    this.trainTimer = 0;
    this.trainTotal = 0;
    this.selected = false;
    this.flash = 0;
    this.dead = false;
  }

  bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  centre() { return [this.x + this.w / 2, this.y + this.h / 2]; }
  containsPoint(px, py, pad = 0) {
    if (this.game.wrap) { const cx = this.x + this.w / 2; px = cx + this.game.dx(cx, px); }
    return px >= this.x - pad && px <= this.x + this.w + pad && py >= this.y - pad && py <= this.y + this.h + pad;
  }

  get canTrain() { return this.def.canTrain || []; }
  get income() { return !this.dead && !this.constructing ? (this.def.income || 0) : 0; }

  update(dt) {
    if (this.flash > 0) this.flash -= dt;
    if (this.constructing) {
      this.progress += dt / this.buildTime;
      if (this.progress >= 1) { this.progress = 1; this.constructing = false; }
      return;
    }
    if (this.def.autoAttack) {
      if (this.attackTimer > 0) this.attackTimer -= dt;
      else this.scanAndAttack();
    }
    if (this.canTrain.length) this.processTraining(dt);
  }

  scanAndAttack() {
    const [cx, cy] = this.centre();
    let best = null;
    let bestScore = Infinity;
    for (const u of this.game.units) {
      if (u.dead || u.faction === this.faction) continue;
      const [ux, uy] = u.centre();
      const d = Math.hypot(this.game.dx(cx, ux), uy - cy);
      const range = u.air ? this.def.airRange ?? this.def.range : this.def.range;
      if (d > range) continue;
      // Ground targets in range first; aircraft are engaged at long range.
      const score = u.air ? d * 0.5 : d;
      if (score < bestScore) { bestScore = score; best = u; }
    }
    if (best) {
      this.attackTimer = this.def.rate;
      this.game.fireProjectile(this, best, best.air ? this.def.airDamage ?? this.def.damage : this.def.damage);
    }
  }

  queueTrain(type) {
    if (!this.canTrain.includes(type) || this.constructing) return false;
    this.queue.push(type);
    if (!this.trainCurrent) this.startNext();
    return true;
  }

  startNext() {
    if (!this.queue.length) return;
    this.trainCurrent = this.queue.shift();
    this.trainTotal = UNIT_TYPES[this.trainCurrent].trainTime;
    this.trainTimer = this.trainTotal;
  }

  processTraining(dt) {
    if (!this.trainCurrent) { this.startNext(); return; }
    this.trainTimer -= dt;
    if (this.trainTimer <= 0) {
      const done = this.trainCurrent;
      this.trainCurrent = null;
      this.game.onUnitTrained(this, done);
      this.startNext();
    }
  }

  takeDamage(amount, source) {
    if (this.dead) return;
    this.hp -= amount;
    this.flash = 0.15;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; return; }
    if (source && !source.dead) this.game.callForHelp(this, source);
  }

  repair(amount) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}

// kind: 'bullet' (homing, single target), 'shell' (homing, splash on impact),
// 'lob' (arcs to the spot the target was at when fired, splash on landing).
export class Projectile {
  constructor(game, from, target, damage, faction, opts = {}) {
    this.id = nextId++;
    this.game = game;
    [this.x, this.y] = from;
    this.target = target;
    [this.tx, this.ty] = target ? target.centre() : from;
    this.damage = damage;
    this.faction = faction;
    this.kind = opts.kind || 'bullet';
    this.splash = opts.splash || 0;
    this.vsBuildings = opts.vsBuildings || 1;
    this.shooter = opts.shooter || null;
    this.radius = this.kind === 'bullet' ? PROJECTILE_RADIUS : this.kind === 'bomb' ? 5.5 : 4.5;
    // Bombs: released with the bomber's forward speed, then fall.
    this.vx = opts.vx || 0;
    this.vy = 40;
    this.angle = 0;
    this.life = this.kind === 'lob' ? 8 : 4;
    this.done = false;
    this.exploded = 0; // >0 while the blast flash is shown
    if (this.kind === 'lob') {
      // Aim at the ground under the target and fly a fixed parabola.
      this.sx = this.x;
      this.sy = this.y;
      this.tx = this.sx + game.dx(this.sx, this.tx); // unwrapped endpoint (short way round)
      this.ty = target.kind === 'unit' ? target.y : target.y + target.h;
      const dist = Math.hypot(this.tx - this.sx, this.ty - this.sy);
      this.flight = Math.max(0.6, dist / 260);
      this.arc = Math.min(220, 60 + dist * 0.45);
      this.t = 0;
    }
  }

  update(dt) {
    if (this.exploded > 0) {
      this.exploded -= dt;
      if (this.exploded <= 0) this.done = true;
      return;
    }
    this.life -= dt;
    if (this.life <= 0) { this.done = true; return; }

    if (this.kind === 'bomb') {
      this.vy = Math.min(this.vy + GRAVITY * dt, 700);
      this.x = this.game.normX(this.x + this.vx * dt);
      this.y += this.vy * dt;
      this.vx *= 1 - dt * 0.8;
      this.angle = Math.atan2(this.vy, this.vx);
      const g = this.game;
      const hitThing = [...g.units, ...g.buildings].find((e) => !e.dead && !e.air
        && e.faction !== this.faction && distTo(this.x, this.y, e) <= 2);
      // Bombs drop through floating platforms; ground and bridges stop them.
      const [tx, ty] = g.map.worldToTile(this.x, this.y);
      const tile = g.map.get(tx, ty);
      if (hitThing || tile === TILE_GROUND || tile === TILE_BRIDGE || ty >= MAP_H) this.impact(hitThing || null);
      return;
    }

    if (this.kind === 'lob') {
      this.t = Math.min(1, this.t + dt / this.flight);
      const px = this.lx ?? this.sx;
      const py = this.y;
      this.lx = this.sx + (this.tx - this.sx) * this.t;
      this.x = this.game.normX(this.lx);
      this.y = this.sy + (this.ty - this.sy) * this.t - Math.sin(Math.PI * this.t) * this.arc;
      this.angle = Math.atan2(this.y - py, this.lx - px);
      if (this.t >= 1) this.impact(null);
      return;
    }

    if (!this.target.dead) [this.tx, this.ty] = this.target.centre();
    const dx = this.game.dx(this.x, this.tx);
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);
    const step = PROJECTILE_SPEED * (this.kind === 'shell' ? 0.9 : 1) * dt;
    if (dist <= step || dist < 4) {
      this.x = this.tx;
      this.y = this.ty;
      this.impact(this.target.dead ? null : this.target);
      return;
    }
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    // Enemy walls stop direct fire (lobbed artillery arcs over them).
    const wall = this.wallOnPath(this.x, this.y, nx, ny);
    if (wall && wall !== this.target) {
      this.x = this.game.normX(nx);
      this.y = ny;
      this.impact(wall);
      return;
    }
    this.x = this.game.normX(nx);
    this.y = ny;
  }

  wallOnPath(x0, y0, x1, y1) {
    const map = this.game.map;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8));
    for (let i = 1; i <= n; i++) {
      const px = x0 + ((x1 - x0) * i) / n;
      const py = y0 + ((y1 - y0) * i) / n;
      const id = map.enemyWallAt(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE), this.faction);
      if (id != null) return this.game.buildingById(id);
    }
    return null;
  }

  hit(e, amount) {
    if (e.dead || e.faction === this.faction) return;
    let mult = 1;
    if (e.kind === 'building') {
      mult = this.vsBuildings;
      // Walls shrug off small-arms fire; shells and artillery hit them fully.
      if (this.kind === 'bullet') mult *= e.def.bulletResist ?? 1;
    }
    e.takeDamage(amount * mult, this.shooter);
  }

  impact(direct) {
    if (direct) this.hit(direct, this.damage);
    if (this.splash > 0) {
      // Lobbed shells deal full damage to whatever they land on; everything
      // else inside the blast takes half.
      const g = this.game;
      for (const e of [...g.units, ...g.buildings]) {
        if (e === direct || e.dead || e.faction === this.faction) continue;
        if (e.air) continue; // ground blasts don't reach aircraft
        const d = distTo(this.x, this.y, e);
        if (d > this.splash) continue;
        this.hit(e, (this.kind === 'lob' || this.kind === 'bomb') && d < 8 ? this.damage : this.damage * 0.5);
      }
      this.exploded = 0.3;
      this.game.effects?.push(debrisEffect(this.x, this.y, this.splash));
      return;
    }
    this.done = true;
  }
}
