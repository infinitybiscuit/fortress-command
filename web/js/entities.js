// Units, buildings and projectiles. Ported from godot/scripts/entities/*.gd.
import {
  TILE_SIZE, GRAVITY, TERMINAL_VELOCITY, UNIT_W, UNIT_H, UNIT_TYPES, BUILDING_TYPES,
  PROJECTILE_SPEED, PROJECTILE_RADIUS,
} from './config.js';

let nextId = 1;

export const State = { IDLE: 0, MOVING: 1, ATTACKING: 2, REPAIRING: 3, DEAD: 4 };
const AUTO_SCAN_INTERVAL = 0.5;

// Distance from a point to an entity's body (closest point), so attacking a
// wide building works from either side.
export function distTo(x, y, e) {
  const r = e.bounds();
  const cx = Math.max(r.x, Math.min(x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(y, r.y + r.h));
  return Math.hypot(cx - x, cy - y);
}

export class Unit {
  constructor(game, type, x, y, faction) {
    const s = UNIT_TYPES[type];
    this.id = nextId++;
    this.game = game;
    this.kind = 'unit';
    this.type = type;
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

  bounds() { return { x: this.x - UNIT_W / 2, y: this.y - UNIT_H, w: UNIT_W, h: UNIT_H }; }
  centre() { return [this.x, this.y - UNIT_H / 2]; }

  containsPoint(px, py, pad = 6) {
    const b = this.bounds();
    return px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad;
  }

  moveTo(x) {
    if (this.dead) return;
    this.moveX = x;
    this.target = null;
    this.state = State.MOVING;
  }

  attack(target) {
    if (this.dead || !target || target.dead) return;
    if (this.repairRate > 0 && target.faction === this.faction && target.kind === 'building') {
      this.target = target;
      this.state = State.REPAIRING;
      return;
    }
    this.target = target;
    this.state = State.ATTACKING;
  }

  update(dt) {
    if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    if (this.flash > 0) this.flash -= dt;

    switch (this.state) {
      case State.IDLE:
        this.vx = 0;
        this.scanTimer -= dt;
        if (this.scanTimer <= 0) {
          this.scanTimer = AUTO_SCAN_INTERVAL;
          this.scanForEnemy();
        }
        break;
      case State.MOVING: {
        const dx = this.moveX - this.x;
        if (Math.abs(dx) < 6) { this.vx = 0; this.state = State.IDLE; }
        else this.vx = Math.sign(dx) * this.speed;
        break;
      }
      case State.ATTACKING: {
        const t = this.target;
        if (!t || t.dead) { this.target = null; this.state = State.IDLE; this.vx = 0; break; }
        const [cx, cy] = this.centre();
        if (distTo(cx, cy, t) > this.range) {
          const [tx] = t.centre();
          this.vx = Math.sign(tx - this.x) * this.speed;
        } else {
          this.vx = 0;
          this.facing = Math.sign(t.centre()[0] - this.x) || this.facing;
          if (this.cooldownTimer <= 0) {
            this.cooldownTimer = this.cooldown;
            this.game.fireProjectile(this, t, this.damage);
          }
        }
        break;
      }
      case State.REPAIRING: {
        const t = this.target;
        if (!t || t.dead || t.hp >= t.maxHp) { this.target = null; this.state = State.IDLE; this.vx = 0; break; }
        const [cx, cy] = this.centre();
        if (distTo(cx, cy, t) > this.range) {
          this.vx = Math.sign(t.centre()[0] - this.x) * this.speed;
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
    this.applyPhysics(dt);
  }

  scanForEnemy() {
    let best = null;
    let bestD = this.range;
    const [cx, cy] = this.centre();
    for (const u of this.game.units) {
      if (u === this || u.dead || u.faction === this.faction) continue;
      const d = Math.hypot(u.x - this.x, u.y - this.y);
      if (d < bestD) { bestD = d; best = u; }
    }
    if (!best) {
      for (const b of this.game.buildings) {
        if (b.dead || b.faction === this.faction) continue;
        const d = distTo(cx, cy, b);
        if (d < bestD) { bestD = d; best = b; }
      }
    }
    if (best) this.attack(best);
  }

  // Separate-axis AABB tile collision; (x, y) is the unit's feet.
  applyPhysics(dt) {
    const map = this.game.map;
    const ts = TILE_SIZE;
    const halfW = UNIT_W / 2;
    const h = UNIT_H;

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
        break;
      }
      if (blocked) {
        newX = dir > 0 ? tx * ts - halfW : (tx + 1) * ts + halfW;
        this.vx = 0;
        if (this.state === State.MOVING) this.state = State.IDLE;
      }
    }
    this.x = newX;

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

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    this.flash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.state = State.DEAD;
    }
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
    let bestD = this.def.range;
    for (const u of this.game.units) {
      if (u.dead || u.faction === this.faction) continue;
      const [ux, uy] = u.centre();
      const d = Math.hypot(ux - cx, uy - cy);
      if (d < bestD) { bestD = d; best = u; }
    }
    if (best) {
      this.attackTimer = this.def.rate;
      this.game.fireProjectile(this, best, this.def.damage);
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

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    this.flash = 0.15;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  repair(amount) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}

export class Projectile {
  constructor(from, target, damage, faction) {
    [this.x, this.y] = from;
    this.target = target;
    [this.tx, this.ty] = target.centre();
    this.damage = damage;
    this.faction = faction;
    this.radius = PROJECTILE_RADIUS;
    this.angle = 0;
    this.life = 4;
    this.done = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.done = true; return; }
    if (!this.target.dead) [this.tx, this.ty] = this.target.centre();
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);
    const step = PROJECTILE_SPEED * dt;
    if (dist <= step || dist < 4) {
      if (!this.target.dead && this.target.faction !== this.faction) this.target.takeDamage(this.damage);
      this.done = true;
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }
}
