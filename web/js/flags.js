// Capture the Flag. Each side's flag stands beside its HQ (which can't be
// destroyed in this mode). Any ground unit can pick up an enemy flag by
// walking into it, and wins the game by bringing it back to its own HQ. A
// carrier that's killed drops the flag where it fell; if one of the flag's
// own side picks it up, that unit carries it straight back home. Capturing a
// flag knocks that player out; the last one left wins.
import { TILE_SIZE, PLAYER_NAMES } from './config.js';
import { State, distTo } from './entities.js';

const TOUCH = 22;      // how close (across the ground) a unit must get to grab a flag
const TOUCH_UP = 30;   // and how far above or below it may be (side-on)
const HOME = 30;       // a carrier this close to its own HQ (or flag spot) is home

// Where a faction's flag stands. Side-on, that's up in the keep behind the HQ
// (the side away from the stair), so raiders have to get past the HQ and its
// defences. On the field, just beside the HQ.
export function flagHome(game, hq) {
  if (game.field) {
    const [x, z] = game.fieldExit(hq, 18, hq.w / 2 + 26);
    return { x, y: game.map.groundTop * TILE_SIZE, z };
  }
  const dir = game.facing(hq.tx);
  const x = dir > 0 ? hq.x - TILE_SIZE / 2 : hq.x + hq.w + TILE_SIZE / 2;
  return { x: game.normX(x), y: hq.y + hq.h, z: 0 };
}

export function makeFlags(game) {
  return game.players.map((p, f) => {
    const home = flagHome(game, p.hq);
    // out: its side has been knocked out, so the flag is gone.
    return { faction: f, home, x: home.x, y: home.y, z: home.z, carrier: null, atHome: true, out: false };
  });
}

// Is unit u touching the spot (x, y, z)?
function touching(game, u, x, y, z) {
  if (game.field) return Math.hypot(game.dx(u.x, x), z - u.z) < TOUCH;
  return Math.abs(game.dx(u.x, x)) < TOUCH && Math.abs(u.y - y) < TOUCH_UP;
}

// Has a carrier made it back to its own side's HQ?
function isHome(game, u) {
  const hq = game.players[u.faction]?.hq;
  const own = game.flags[u.faction];
  if (hq && distTo(u.x, u.y - u.h / 2, hq, u.z) < HOME) return true;
  return !!own && touching(game, u, own.home.x, own.home.y, own.home.z);
}

// Send a carrier back to its HQ (to the flag's spot), not stopping to fight.
export function sendHome(game, u) {
  const h = game.flags[u.faction].home;
  const near = u.state === State.MOVING && Math.abs(game.dx(u.moveX, h.x)) < 4 && Math.abs((u.moveZ ?? 0) - h.z) < 4;
  if (!near) u.moveTo(h.x, h.y, game.field ? h.z : null);
  u.forced = true;
  u.hold = false;
}

export const flagCarriedBy = (game, u) => game.flags?.find((fl) => fl.carrier === u) || null;

export function updateFlags(game) {
  const say = (t) => game.events.onMessage?.(t);
  for (const fl of game.flags) {
    if (fl.out) continue;
    const c = fl.carrier;
    if (c?.dead) {
      // Dropped where the carrier fell.
      fl.carrier = null;
      fl.x = c.x;
      fl.y = c.y;
      fl.z = c.z;
      say(`${PLAYER_NAMES[fl.faction]} flag dropped!`);
    } else if (c) {
      fl.x = c.x;
      fl.y = c.y - c.h;
      fl.z = c.z;
      if (c.faction === fl.faction) {
        // Bringing our own flag back: it always heads home, then the flag
        // goes back where it started.
        if (isHome(game, c)) {
          Object.assign(fl, { carrier: null, atHome: true, x: fl.home.x, y: fl.home.y, z: fl.home.z });
          c.forced = false;
          say(`${PLAYER_NAMES[fl.faction]} flag returned!`);
        } else sendHome(game, c);
      } else if (isHome(game, c)) {
        // Captured: that side is out. Its army collapses, dropping any other
        // flags it was carrying, and the carrier is free again.
        Object.assign(fl, { carrier: null, out: true });
        c.forced = false;
        game.eliminate(fl.faction, `${PLAYER_NAMES[c.faction]} captured the ${PLAYER_NAMES[fl.faction]} flag!`);
        if (game.over) return;
      }
      continue;
    }
    // Lying about (at home or dropped): the first ground unit to reach it
    // takes it. A flag's own side only bothers once it's been dropped.
    for (const u of game.units) {
      if (u.dead || u.air || flagCarriedBy(game, u)) continue;
      if (u.faction === fl.faction && fl.atHome) continue;
      if (!touching(game, u, fl.x, fl.y, fl.z)) continue;
      fl.carrier = u;
      fl.atHome = false;
      sendHome(game, u);
      say(u.faction === fl.faction ? `${PLAYER_NAMES[fl.faction]} is bringing its flag home`
        : `${PLAYER_NAMES[u.faction]} took the ${PLAYER_NAMES[fl.faction]} flag!`);
      break;
    }
  }
}
