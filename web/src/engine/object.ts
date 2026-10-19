/**
 * Общее для юнитов и зданий (OpenDUNE src/object.c): связь «кто к кому едет» через переменную скрипта 4.
 */
import { G, indexGetObject, indexGetStructure, indexGetTile, indexIsValid, orientation8, packTile, tileGetDirection, tileGetDistance, unpackTile, type GObject, type Tile32 } from "./core.ts";
import { STATE } from "./core.ts";
import { layoutEdgeTiles, structureInfo } from "./tables.ts";
import { structureGetLinkedUnit, structureSetState } from "./structure.ts";

export function objectScriptVariable4Link(encodedFrom: number, encodedTo: number): void {
  if (!indexIsValid(encodedFrom)) return;
  if (!indexIsValid(encodedTo)) return;
  const from = indexGetObject(encodedFrom);
  const to = indexGetObject(encodedTo);
  if (!from || !to) return;
  if (from.script.variables[4] !== to.script.variables[4]) {
    objectScriptVariable4Clear(from);
    objectScriptVariable4Clear(to);
  }
  if (from.script.variables[4] !== 0) return;
  objectScriptVariable4Set(from, encodedTo);
  objectScriptVariable4Set(to, encodedFrom);
}

export function objectScriptVariable4Set(o: GObject | null, encoded: number): void {
  if (!o) return;
  o.script.variables[4] = encoded;
  if (o.flags.isUnit) return;
  const si = structureInfo[o.type];
  if (!si.o.flags.busyStateIsIncoming) return;
  const s = G.structures[o.index];
  if (structureGetLinkedUnit(s)) return;
  structureSetState(s, encoded === 0 ? STATE.IDLE : STATE.BUSY);
}

export function objectScriptVariable4Clear(o: GObject): void {
  const encoded = o.script.variables[4];
  if (encoded === 0) return;
  const other = indexGetObject(encoded);
  objectScriptVariable4Set(o, 0);
  objectScriptVariable4Set(other, 0);
}

export function objectGetByPackedTile(packed: number): GObject | null {
  if ((packed & 0xf000) !== 0) return null;
  const t = G.map[packed];
  if (t.hasUnit) return G.units[t.index - 1]?.o ?? null;
  if (t.hasStructure) return G.structures[t.index - 1]?.o ?? null;
  return null;
}

export function objectGetDistanceToEncoded(o: GObject, encoded: number): number {
  return pointGetDistanceToEncoded(o.position, encoded);
}

/** То же, что objectGetDistanceToEncoded, но от любой точки: у здания — до ближней к точке клетки края. */
export function pointGetDistanceToEncoded(from: Tile32, encoded: number): number {
  const s = indexGetStructure(encoded);
  let position;
  if (s) {
    let packed = packTile(s.o.position);
    packed += layoutEdgeTiles[structureInfo[s.o.type].layout][(orientation8(tileGetDirection(from, s.o.position)) + 4) & 7];
    position = unpackTile(packed & 0xffff);
  } else {
    position = indexGetTile(encoded);
  }
  return tileGetDistance(from, position);
}
