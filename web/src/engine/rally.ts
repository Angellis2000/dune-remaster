import { ACTION, IT, LST, STRUCTURE, UNIT, indexEncode, type Structure, type Unit } from './core.ts';
import { mapGetLandscapeType } from './map.ts';
import { unitSetAction, unitSetDestination } from './unit.ts';

export function structureHasRally(s: Structure): boolean {
  const factories: readonly number[] = [STRUCTURE.LIGHT_VEHICLE, STRUCTURE.HEAVY_VEHICLE,
    STRUCTURE.HIGH_TECH, STRUCTURE.WOR_TROOPER, STRUCTURE.BARRACKS, STRUCTURE.DRONE_PAD, STRUCTURE.STARPORT];
  return s.o.flags.used && s.o.flags.allocated && factories.includes(s.o.type);
}

export function applyRally(u: Unit, point: number | undefined): void {
  u.rallyDestination = undefined;
  if (point === undefined || point < 0 || point >= 4096) return;
  const kind = mapGetLandscapeType(point);
  const harvest = u.o.type === UNIT.HARVESTER && (kind === LST.SPICE || kind === LST.THICK_SPICE);
  unitSetAction(u, harvest ? ACTION.HARVEST : ACTION.MOVE);
  u.targetAttack = 0;
  u.patrolActive = false;
  unitSetDestination(u, indexEncode(point, IT.TILE));
}
