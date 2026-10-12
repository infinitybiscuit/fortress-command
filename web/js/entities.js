// Units, buildings and projectiles. Ported from archive/godot-era/godot/scripts/entities/*.gd.
import { TileMap } from './tilemap.js';
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
    this.moveY = null;
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

  // `y` is where on screen the order pointed: with it, units plan a route
  // there over the ground, platforms and bridges (see TileMap.route).
  moveTo(x, y = null) {
    if (this.dead) return;
    this.resume = null;
    this.home = null;
    this.moveX = x;
    this.moveY = y;
    this.route = null;
    this.routeT = 0;
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

  // Attack `target`, then pick `resume` ({ moveX, moveY } or { target }) back up afterwards.
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
    else if (r?.moveX != null) this.moveTo(r.moveX, r.moveY);
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
        const toX = this.followRoute(dt);
        const dx = this.game.dx(this.x, this.moveX);
        if (toX == null && Math.abs(dx) < 6) { this.vx = 0; this.state = State.IDLE; this.forced = false; this.route = null; break; }
        this.vx = Math.sign(this.game.dx(this.x, toX ?? this.moveX)) * this.speed;
        // Attack-move: fight anything that comes into weapon range, then carry on.
        if (scan && !this.forced && this.repairRate === 0) {
          const e = this.findEnemyUnit(this.range);
          if (e) this.engage(e, { moveX: this.moveX, moveY: this.moveY });
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
      const resume = wasMoving ? { moveX: this.moveX, moveY: this.moveY }
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
      this.engage(source, { moveX: this.moveX, moveY: this.moveY });
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

    // Standing on a ramp? Then the slope under the unit's middle decides its
    // height, so wide vehicles don't hop as their wheels cross onto the
    // ground or deck.
    const slope = this.onGround && this.ramp && map.ramps.has(this.ramp.id)
      && this.x >= this.ramp.x1 && this.x <= this.ramp.x2 ? this.ramp : null;

    let newX = this.x + this.vx * dt;
    if (this.vx !== 0) {
      const dir = this.vx > 0 ? 1 : -1;
      const tx = Math.floor((newX + dir * halfW) / ts);
      const tyTop = Math.floor((this.y - h + 2) / ts);
      const tyBot = Math.floor((this.y - 2) / ts);
      let blocked = false;
      for (let ty = tyTop; ty <= tyBot; ty++) {
        if (!map.isSolidForFaction(tx, ty, this.faction)) continue;
        // Coming up a ramp, a wide unit's front reaches the deck at the top
        // before its middle does: let it overlap the ledge the ramp meets.
        if (slope && map.enemyWallAt(tx, ty, this.faction) == null) {
          const [hx, hy] = slope.y1 < slope.y2 ? [slope.x1, slope.y1] : [slope.x2, slope.y2];
          const side = dir > 0 ? tx * ts : (tx + 1) * ts;
          if (Math.abs(hy - ty * ts) <= 4 && Math.abs(hx - side) <= 6) continue;
        }
        blocked = true;
        const wallId = map.enemyWallAt(tx, ty, this.faction);
        if (wallId != null) this.blockedBy = this.game.buildingById(wallId);
        break;
      }
      if (blocked) {
        newX = dir > 0 ? tx * ts - halfW : (tx + 1) * ts + halfW;
        this.vx = 0;
        // Clipping a ledge on the way down isn't the end of the walk.
        if (this.state === State.MOVING && this.onGround) this.state = State.IDLE;
      }
    }
    this.x = this.game.normX(newX);

    let newY = this.y + this.vy * dt;
    const cx = Math.floor(this.x / ts);
    // ...including stepping down onto a slope from the deck at its top.
    const slopeMode = !!slope || (this.onGround && map.rampsAt(this.x).some((seg) => {
      const sy = TileMap.rampY(seg, this.x);
      return sy >= this.y - 0.5 && sy <= this.y + halfW + 4;
    }));
    const txL = slopeMode ? cx : Math.floor((this.x - halfW + 2) / ts);
    const txR = slopeMode ? cx : Math.floor((this.x + halfW - 2) / ts);
    const wasGrounded = this.onGround;
    this.onGround = false;
    if (this.vy >= 0) {
      const oldFeet = Math.floor(this.y / ts);
      const newFeet = Math.floor(newY / ts);
      outer: for (let ty = oldFeet; ty <= newFeet; ty++) {
        if (ty * ts < this.y - 14) continue; // a ledge we're already deep inside
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
    if (this.vy >= 0) newY = this.rideRamp(map, newY, wasGrounded);
    this.y = newY;
  }

  // Steer along the planned route (re-planned every half second, so it copes
  // with bridges built or knocked down on the way): the x of the next column
  // to head for, or null once on the last stretch.
  followRoute(dt) {
    if (this.moveY == null || this.air) return null;
    const key = this.ramp ? `r${this.ramp.id}` : this.onGround ? `t${Math.round(this.y / TILE_SIZE)}` : null;
    // Not while falling (or stepping off a ledge), though: a plan from mid-air
    // can't know what the unit will land on. Re-plan the moment it does. A
    // frame or two off the ground, e.g. at the foot of a slope, isn't falling.
    const wasFalling = this.airT > 0.1;
    this.airT = key == null ? (this.airT || 0) + dt : 0;
    const falling = this.airT > 0.1;
    const dropping = key == null && this.route?.[this.routeP + 1]?.drop;
    this.routeT -= dt;
    if (!this.route || (key != null && wasFalling) || (this.routeT <= 0 && !falling && !dropping)) {
      this.routeT = 0.5;
      this.route = this.game.map.route(this.x, this.y, key, this.moveX, this.moveY, this.h) || [];
      this.routeP = 0;
    }
    const r = this.route;
    const C = TILE_SIZE / 2;
    const ci = Math.floor(this.game.normX(this.x) / C);
    // Into the next column, on the surface it says (or falling, as it can't be
    // on one yet): that step's done. A drop is done on landing, wherever that is.
    const done = (s) => (key === s.key ? s.i === ci || s.drop : falling && !s.drop && s.i === ci);
    while (this.routeP + 1 < r.length && done(r[this.routeP + 1])) this.routeP++;
    if (this.routeP + 1 >= r.length) return null;
    const s = r[this.routeP + 1];
    if (!s.drop) return s.x;
    // Stepping off a ledge: the feet stay on it until the unit's back end is
    // past the edge, so head that far out (not for the middle of the column
    // beyond, or it turns back and forth at the edge), then fall straight.
    const dir = Math.sign(this.game.dx(r[this.routeP].x, s.x));
    const clear = this.game.normX(s.x + dir * (this.w / 2 + 2 - C / 2));
    return key == null && dir * this.game.dx(clear, this.x) >= 0 ? this.x : clear;
  }

  // Is the unit headed somewhere above it (-1), below it (1), or neither (0)?
  // Where it has a choice of ways on, that decides whether it takes a slope.
  upOrDown() {
    let y = null;
    if (this.state === State.MOVING) y = this.moveY;
    else if (this.target && (this.state === State.ATTACKING || this.state === State.REPAIRING)) {
      const t = this.target;
      y = t.kind === 'building' ? t.y + t.h : t.air ? t.centre()[1] : t.y;
    }
    if (y == null) return 0;
    return y < this.y - TILE_SIZE ? -1 : y > this.y + TILE_SIZE ? 1 : 0;
  }

  // Stand on a bridge deck under the unit's middle: step up it (at most one
  // sub-step's climb), follow it down while walking, or land on it. Where
  // ways part (a slope leaving the ground or a level deck, or a level deck
  // carrying on past the top of one), keep level unless the unit is headed
  // up or down; with no level way on, take whatever slope there is.
  rideRamp(map, newY, wasGrounded) {
    const STEP = 16;
    const floor = this.onGround; // landed on solid tiles at newY
    const snapDown = wasGrounded && !floor ? Math.max(STEP, this.w / 2 + 4) : 0;
    const dir = Math.sign(this.vx);
    const options = [];
    for (const seg of map.rampsAt(this.x)) {
      const s = TileMap.rampY(seg, this.x);
      if (s < this.y - STEP || s > newY + snapDown) continue;
      if (floor && s > newY + 0.5) continue; // a deck below the ground we're on
      const grade = (dir * (seg.y2 - seg.y1)) / Math.max(seg.x2 - seg.x1, 1); // + is downhill
      const way = grade < -0.05 || (seg !== this.ramp && s < this.y - 0.5) ? -1 : grade > 0.05 ? 1 : 0;
      options.push({ seg, s, way });
    }
    let pick = null;
    if (!wasGrounded) {
      // Falling: land on the highest deck in reach.
      for (const o of options) if (!pick || o.s < pick.s) pick = o;
    } else if (options.length && this.route?.length) {
      // Following a route: take the surface it says to be on next.
      const r = this.route;
      const want = [r[this.routeP + 1]?.key, r[this.routeP]?.key];
      // The ground just under a deck's foot counts too, to step off onto it.
      const fy = floor ? newY : map.floorBelow(this.x, this.y - 0.5, 4);
      const ways = fy != null ? [{ seg: null, s: fy, key: `t${Math.round(fy / TILE_SIZE)}` }, ...options] : options;
      const cur = this.ramp ? `r${this.ramp.id}` : null;
      for (const k of want) {
        // Switch decks only where they meet, not by hopping between them.
        pick = ways.find((o) => (o.key ?? `r${o.seg.id}`) === k && (k === cur || Math.abs(o.s - this.y) <= 6));
        if (pick) break;
      }
    }
    if (!pick && wasGrounded && options.length) {
      // Ways on from where the unit stands (a deck that starts well below is
      // only for when there's nothing else underfoot).
      const near = (o) => o.s <= this.y + 8;
      let ways = floor ? [{ seg: null, s: newY, way: 0 }, ...options.filter(near)] : options;
      if (!floor && ways.some(near)) ways = ways.filter(near);
      const want = this.upOrDown();
      const order = want < 0 ? [-1, 0, 1] : want > 0 ? [1, 0, -1] : [0, 1, -1];
      const rank = (o) => order.indexOf(o.way) * 2 + (o.seg === this.ramp ? 0 : 1);
      for (const o of ways) {
        // On the level, a climb is only for units headed up there.
        if (o.way < 0 && o.seg !== this.ramp && want >= 0 && ways.some((w) => w.way >= 0)) continue;
        if (!pick || rank(o) < rank(pick)) pick = o;
      }
    }
    this.ramp = pick?.seg ?? null; // the deck being walked on, if any
    if (!this.ramp) return newY;
    this.vy = 0;
    this.onGround = true;
    return pick.s;
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

  // A ramp is a plank from (x1, y1) to (x2, y2), x1 < x2. Its box wraps the
  // plank; taps only hit near the plank itself.
  setSeg(seg) {
    seg = this.seg = { ...seg, id: this.id };
    this.x = seg.x1;
    this.y = Math.min(seg.y1, seg.y2) - 4;
    this.w = seg.x2 - seg.x1;
    this.h = Math.abs(seg.y2 - seg.y1) + 10;
    this.tx = Math.floor(this.x / TILE_SIZE);
    this.ty = Math.floor(this.y / TILE_SIZE);
    // Longer ramps take longer to build and take more punishment.
    const pieces = Math.max(1, Math.round(Math.hypot(this.w, seg.y2 - seg.y1) / TILE_SIZE));
    this.maxHp = this.hp = this.def.hp * pieces;
    this.cost = this.def.cost * pieces;
    this.buildTime = 1.5 + pieces;
    return this;
  }

  bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  centre() { return [this.x + this.w / 2, this.y + this.h / 2]; }
  containsPoint(px, py, pad = 0) {
    if (this.game.wrap) { const cx = this.x + this.w / 2; px = cx + this.game.dx(cx, px); }
    if (this.seg) {
      const { x1, y1, x2, y2 } = this.seg;
      const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2)));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1))) <= 10 + pad;
    }
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
