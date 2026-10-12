// Player commands. Every order a player gives goes through applyCommand(), so
// the same code runs locally and, in online games, on the host for orders the
// guest sends over the network. Commands reference entities by id and are
// validated against the issuing player, so a client can only command its own side.
import { State } from './entities.js';

// A fresh player order cancels Hold and Retreat stances.
export function order(u) { u.hold = false; u.forced = false; return u; }

// Serializable reference to a unit or building.
export const ref = (e) => (e ? { k: e.kind === 'unit' ? 'u' : 'b', id: e.id } : null);

export function applyCommand(game, p, cmd) {
  const own = (cmd.ids || [])
    .map((id) => game.units.find((u) => u.id === id && u.faction === p && !u.dead))
    .filter(Boolean);
  const resolve = (r) => r && (r.k === 'u' ? game.units : game.buildings).find((e) => e.id === r.id && !e.dead);
  const ownBuilding = (id) => game.buildings.find((b) => b.id === id && b.faction === p && !b.dead);
  const hq = game.players[p]?.hq;

  switch (cmd.c) {
    case 'move': {
      const spread = () => (Math.random() - 0.5) * Math.min(60, own.length * 6);
      // On the field the spot is (x, z) on the ground, and the group spreads both ways.
      const z = game.field && Number.isFinite(cmd.z) ? cmd.z : null;
      for (const u of own) order(u).moveTo(cmd.x + spread(), cmd.y ?? null, z == null ? null : z + spread());
      return null;
    }
    case 'attack': {
      const t = resolve(cmd.target);
      if (t && t.faction !== p) for (const u of own) order(u).attack(t);
      return null;
    }
    case 'repair': {
      const t = resolve(cmd.target);
      if (t && t.faction === p) for (const u of own) if (u.repairRate > 0 && u !== t) order(u).attack(t);
      return null;
    }
    case 'hold':
      // Stay put, but still fire at anything that comes into range.
      for (const u of own) {
        order(u).hold = true;
        Object.assign(u, { state: State.IDLE, target: null, resume: null, home: null, vx: 0, vz: 0 });
      }
      return null;
    case 'charge': {
      // Advance toward the nearest enemy HQ.
      const enemies = game.players.filter((o, i) => i !== p && o.hq).map((o) => o.hq);
      if (!enemies.length || !own.length) return null;
      const u0 = own[0];
      const far = (h) => u0.away(h.centre()[0], h.z + h.d / 2);
      enemies.sort((a, b) => far(a) - far(b));
      for (const u of own) order(u).attack(enemies[0]);
      return null;
    }
    case 'retreat':
      // Retreat ignores enemies on the way home.
      if (hq) {
        for (const u of own) {
          const spread = (Math.random() - 0.5) * 80;
          if (game.field) {
            const [x, z] = game.fieldExit(hq, 30, spread);
            order(u).moveTo(x, null, z);
          } else order(u).moveTo(hq.centre()[0] + spread);
          u.forced = true;
        }
      }
      return null;
    case 'place':
      return game.tryPlaceAt(p, cmd.type, cmd.tx, cmd.ty, cmd.tz ?? 0);
    case 'ramp':
      return game.tryPlaceRamp(p, cmd.a, cmd.b);
    case 'train': {
      const b = ownBuilding(cmd.id);
      return b && game.train(p, b, cmd.type) ? null : 'Not enough credits!';
    }
    case 'sell': {
      const b = ownBuilding(cmd.id);
      if (b) game.sell(p, b);
      return null;
    }
    default:
      return null;
  }
}
