/**
 * Функции, которые вызывают скрипты EMC (OpenDUNE src/script/general.c, unit.c, structure.c, team.c),
 * и таблицы их номеров — как в оригинале, MD использует тот же байт-код.
 */
import {
  ACTION, EXPLOSION, G, INDEX_INVALID, IT, LST, MOVEMENT, STATE, STRUCTURE, TEAM_ACTION, UNIT, adjustToGameSpeed, findAll, idiv,
  indexDecode, indexEncode, indexGetObject, indexGetPackedTile, indexGetStructure, indexGetTile, indexGetType, indexGetUnit,
  indexIsValid, orientation8, packTile, packXY, random256, randomRange, s16, s8, structureFind, tile, tileCenter, tileGetDirection,
  tileGetDirectionPacked, tileGetDistance, tileGetDistancePacked, tileGetDistanceRoundedUp, tileMoveByDirection, tileMoveByRandom,
  u16, unitFind, unpackTile, type ScriptEngine, type ScriptFunction, type Structure, type Tile32, type Unit,
} from "./core.ts";
import { humanMask, isHuman, isLocal } from "./core.ts";
import { houseAlliedToHuman, houseAreAllied } from "./house.ts";
import { mapChangeSpiceAmount, mapGetLandscapeType, mapIsValidPosition, mapMakeExplosion, mapSearchSpice, tileGetTileInDirectionOf } from "./map.ts";
import { objectGetByPackedTile, objectGetDistanceToEncoded, objectScriptVariable4Clear, objectScriptVariable4Link, objectScriptVariable4Set } from "./object.ts";
import { peek } from "./script.ts";
import { scriptLoad, scriptReset } from "./script.ts";
import { msg } from "./strings.ts";
import {refineryExit} from './refinery-dock.ts';
import {carryallReadyForService} from './carryall-flight.ts';
import {fireLaser,initializeDrone} from './advanced-units.ts';
import {
  structureCreate, structureFindFreePosition, structureRemove, structureRemoveFog, structureSetState,
  structureGetByPackedTile,
} from "./structure.ts";
import { layoutTileCount, layoutTiles, structureInfo, unitInfo } from "./tables.ts";
import {
  unitAddToTeam, unitCallUnitByType, unitCreate, unitCreateBullet, unitDeviationDecrease, unitEnterStructure, unitFindBestTargetEncoded,
  unitFindClosestRefinery, unitGetHouseID, unitGetTargetStructurePriority, unitGetTargetUnitPriority, unitGetTileEnterScore, unitHide,
  unitHouseUnitCountRemove, unitIsTileOccupied, unitIsValidMovementIntoStructure, unitRemove, unitRemoveFog, unitRemoveFromTeam,
  unitRemovePlayer, unitSandwormFindBestTarget, unitSelect, unitSetAction, unitSetDestination, unitSetOrientation, unitSetPosition,
  unitSetSpeed, unitSetTarget, unitStartMovement, unitUpdateMap,
  unitDestinationTile,
} from "./unit.ts";

const P = peek;
const cur = () => G.scriptCurrentUnit!;
const curS = () => G.scriptCurrentStructure!;
const curT = () => G.scriptCurrentTeam!;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Текст из блока TEXT скрипта (в MD — английский; интерфейс может подменить). */
function scriptText(script: ScriptEngine, index: number): string {
  const text = script.scriptInfo?.text;
  if (!text || text.length < 2) return "";
  const off = (text[index * 2] << 8) | text[index * 2 + 1];
  let s = "";
  for (let i = off; i < text.length && text[i]; i++) s += String.fromCharCode(text[i]);
  return s;
}

// ------------------------------------------------------------------ general.c
const generalDelay: ScriptFunction = (script) => {
  const delay = idiv(P(script, 1), 5);
  script.delay = delay;
  return delay;
};

const generalDelayRandom: ScriptFunction = (script) => {
  let delay = idiv(random256() * P(script, 1), 256);
  delay = idiv(delay, 5);
  script.delay = delay;
  return delay;
};

const generalGetDistanceToTile: ScriptFunction = (script) => {
  const encoded = P(script, 1);
  if (!indexIsValid(encoded)) return 0xffff;
  return tileGetDistance(G.scriptCurrentObject!.position, indexGetTile(encoded));
};

const generalNoOperation: ScriptFunction = () => 0;

const generalDisplayText: ScriptFunction = (script) => {
  const text = scriptText(script, P(script, 1));
  if (text) G.onMessage(text, 0);
  return 0;
};

const generalRandomRange: ScriptFunction = (script) => randomRange(P(script, 1), P(script, 2));

const generalDisplayModalMessage: ScriptFunction = (script) => {
  const text = scriptText(script, P(script, 1));
  if (text) G.onMessage(text, 0);
  return 0;
};

const generalGetDistanceToObject: ScriptFunction = (script) => {
  const index = P(script, 1);
  if (!indexIsValid(index)) return 0xffff;
  return objectGetDistanceToEncoded(G.scriptCurrentObject!, index);
};

const generalUnknown0288: ScriptFunction = (script) => {
  const index = P(script, 1);
  const s = indexGetStructure(index);
  if (s && indexEncode(s.o.index, IT.STRUCTURE) !== index) return 1;
  return indexGetObject(index) === null ? 1 : 0;
};

const generalGetOrientation: ScriptFunction = (script) => {
  const u = indexGetUnit(P(script, 1));
  if (!u) return 128;
  return u.orientation[0].current;
};

const generalUnitCount: ScriptFunction = (script) => {
  let count = 0;
  const find = findAll(G.scriptCurrentObject!.houseID, P(script, 1));
  while (unitFind(find, unitGetHouseID)) count++;
  return count;
};

const generalDecodeIndex: ScriptFunction = (script) => {
  const index = P(script, 1);
  if (!indexIsValid(index)) return 0xffff;
  return indexDecode(index);
};

const generalGetIndexType: ScriptFunction = (script) => {
  const index = P(script, 1);
  if (!indexIsValid(index)) return 0xffff;
  // MD EMC constants differ from the PC enum used by the port: unit=1,
  // structure=2, tile=3. RETURN otherwise mistakes its carryall for a refinery.
  return [0, 3, 1, 2][indexGetType(index)];
};

const generalGetLinkedUnitType: ScriptFunction = () => {
  const linkedID = G.scriptCurrentObject!.linkedID;
  if (linkedID === 0xff) return 0xffff;
  return G.units[linkedID].o.type;
};

const generalVoicePlay: ScriptFunction = (script) => {
  G.onSound(P(script, 1), G.scriptCurrentObject!.position);
  return 0;
};

const generalSearchSpice: ScriptFunction = (script) => {
  const packed = mapSearchSpice(packTile(G.scriptCurrentObject!.position), P(script, 1));
  if (packed === 0) return 0;
  return indexEncode(packed, IT.TILE);
};

const generalIsEnemy: ScriptFunction = (script) => {
  const index = P(script, 1);
  if (!indexIsValid(index)) return 0;
  const houseID = G.scriptCurrentUnit ? unitGetHouseID(G.scriptCurrentUnit) : G.scriptCurrentObject!.houseID;
  switch (indexGetType(index)) {
    case IT.UNIT:
      return unitGetHouseID(indexGetUnit(index)!) !== houseID ? 1 : 0;
    case IT.STRUCTURE:
      return indexGetStructure(index)!.o.houseID !== houseID ? 1 : 0;
    default:
      return 0;
  }
};

const generalIsFriendly: ScriptFunction = (script) => {
  const o = indexGetObject(P(script, 1));
  if (!o || o.flags.isNotOnMap || !o.flags.used) return 0;
  return generalIsEnemy(script) === 0 ? 1 : 0xffff;
};

const generalFindIdle: ScriptFunction = (script) => {
  const index = P(script, 1);
  const houseID = G.scriptCurrentObject!.houseID;
  if (indexGetType(index) === IT.UNIT) return 0;
  if (indexGetType(index) === IT.TILE) return 0;
  if (indexGetType(index) === IT.STRUCTURE) {
    const s = indexGetStructure(index)!;
    if (s.o.houseID !== houseID) return 0;
    if (s.state !== STATE.IDLE) return 0;
    return 1;
  }
  const find = findAll(houseID, index);
  for (;;) {
    const s = structureFind(find);
    if (!s) return 0;
    if (s.state !== STATE.IDLE) continue;
    return indexEncode(s.o.index, IT.STRUCTURE);
  }
};

// ------------------------------------------------------------------ unit.c
const MAP_DIRECTION = [-64, -63, 1, 65, 64, 63, -1, -65];

const unitRandomSoldier: ScriptFunction = (script) => {
  const u = cur();
  if (random256() >= unitInfo[u.o.type].o.spawnChance) return 0;
  const position = tileMoveByRandom(u.o.position, 20, true);
  const nu = unitCreate(INDEX_INVALID, UNIT.SOLDIER, u.o.houseID, position, random256());
  if (!nu) return 0;
  nu.deviated = u.deviated;
  unitSetAction(nu, P(script, 1));
  return 1;
};

const unitFindBestTarget: ScriptFunction = (script) => unitFindBestTargetEncoded(cur(), P(script, 1));

const unitGetTargetPriority: ScriptFunction = (script) => {
  const u = cur();
  const encoded = P(script, 1);
  const target = indexGetUnit(encoded);
  if (target) return unitGetTargetUnitPriority(u, target);
  const s = indexGetStructure(encoded);
  if (!s) return 0;
  return unitGetTargetStructurePriority(u, s);
};

const unitTransportDeliver: ScriptFunction = (script) => {
  const u = cur();
  if (u.o.linkedID === 0xff) return 0;
  if (indexGetType(u.targetMove) === IT.UNIT) return 0;
  if(u.o.type===UNIT.CARRYALL&&!carryallReadyForService(u)){
    unitSetSpeed(u,0);script.delay=2;script.pc--;return 0;
  }
  if (indexGetType(u.targetMove) === IT.STRUCTURE) {
    const s = indexGetStructure(u.targetMove)!;
    const si = structureInfo[s.o.type];
    if (s.o.type === STRUCTURE.STARPORT) {
      let ret = 0;
      if (s.state === STATE.BUSY) {
        s.o.linkedID = u.o.linkedID;
        u.o.linkedID = 0xff;
        u.o.flags.inTransport = false;
        u.amount = 0;
        unitUpdateMap(2, u);
        G.onSound(24, u.o.position);
        structureSetState(s, STATE.READY);
        ret = 1;
      }
      objectScriptVariable4Clear(u.o);
      u.targetMove = 0;
      return ret;
    }
    if ((s.state === STATE.IDLE || (si.o.flags.busyStateIsIncoming && s.state === STATE.BUSY)) && s.o.linkedID === 0xff) {
      G.onSound(24, u.o.position);
      unitEnterStructure(G.units[u.o.linkedID], s);
      objectScriptVariable4Clear(u.o);
      u.targetMove = 0;
      u.o.linkedID = 0xff;
      u.o.flags.inTransport = false;
      u.amount = 0;
      unitUpdateMap(2, u);
      return 1;
    }
    objectScriptVariable4Clear(u.o);
    u.targetMove = 0;
    return 0;
  }
  if (!mapIsValidPosition(packTile(tileCenter(u.o.position)))) return 0;
  const u2 = G.units[u.o.linkedID];
  if (!unitSetPosition(u2, tileCenter(u.o.position))) return 0;
  if (isLocal(u2.o.houseID)) G.onSound(24, u.o.position);
  unitSetOrientation(u2, u.orientation[0].current, true, 0);
  unitSetOrientation(u2, u.orientation[0].current, true, 1);
  unitSetSpeed(u2, 0);
  u.o.linkedID = u2.o.linkedID;
  u2.o.linkedID = 0xff;
  // A delivered harvester has no refinery release script to send it back to spice.
  // Resume its normal harvesting order immediately after the carryall drops it.
  if (u2.o.type === UNIT.HARVESTER) {
    const field = mapSearchSpice(packTile(u2.o.position), 64);
    if (field) {
      u2.targetLast = tileCenter(unpackTile(field));
      unitSetAction(u2, ACTION.HARVEST);
      unitSetDestination(u2, indexEncode(field, IT.TILE));
    }
  }
  if (u.o.type === UNIT.CARRYALL && u2.o.type === UNIT.HARVESTER && !houseHasRefinery(unitGetHouseID(u))) u.carryallLeaving = true;
  if (u.o.linkedID !== 0xff) return 1;
  u.o.flags.inTransport = false;
  objectScriptVariable4Clear(u.o);
  u.targetMove = 0;
  return 1;
};

const unitPickup: ScriptFunction = (script) => {
  const u = cur();
  if (u.o.linkedID !== 0xff) return 0;
  if(u.o.type===UNIT.CARRYALL&&u.targetMove&&!carryallReadyForService(u)){
    unitSetSpeed(u,0);script.delay=2;script.pc--;return 0;
  }
  switch (indexGetType(u.targetMove)) {
    case IT.STRUCTURE: {
      const s = indexGetStructure(u.targetMove)!;
      const stored = (s.readyUnits?.length ?? 0) > 0;
      if (!stored && (s.state !== STATE.READY || s.o.linkedID === 0xff)) {
        objectScriptVariable4Clear(u.o);
        u.targetMove = 0;
        return 0;
      }
      u.o.flags.inTransport = true;
      objectScriptVariable4Clear(u.o);
      u.targetMove = 0;
      const u2 = G.units[stored ? s.readyUnits!.shift()! : s.o.linkedID];
      u.o.linkedID = u2.o.index;
      if (!stored) s.o.linkedID = u2.o.linkedID;
      u2.o.linkedID = 0xff;
      if (!stored && s.o.linkedID === 0xff) structureSetState(s, STATE.IDLE);
      if (u2.targetLast.x !== 0 || u2.targetLast.y !== 0) {
        u.targetMove = indexEncode(packTile(u2.targetLast), IT.TILE);
      } else if (u2.o.type === UNIT.HARVESTER && !isHuman(unitGetHouseID(u2))) {
        u.targetMove = indexEncode(mapSearchSpice(packTile(u.o.position), 20), IT.TILE);
      }
      unitUpdateMap(2, u);
      return 1;
    }
    case IT.UNIT: {
      const u2 = indexGetUnit(u.targetMove)!;
      if (!u2.o.flags.allocated) return 0;
      let s: Structure | null = null;
      let minDistance = 0;
      const find = findAll(unitGetHouseID(u));
      for (;;) {
        const s2 = structureFind(find);
        if (!s2) break;
        const distance = s16(tileGetDistanceRoundedUp(s2.o.position, u.o.position));
        if (u2.o.type === UNIT.HARVESTER) {
          if (s2.o.type !== STRUCTURE.REFINERY || s2.state !== STATE.IDLE || s2.o.script.variables[4] !== 0) continue;
          if (minDistance !== 0 && distance >= minDistance) break;
          minDistance = distance;
          s = s2;
          break;
        }
        if (s2.o.type !== STRUCTURE.REPAIR || s2.state !== STATE.IDLE || s2.o.script.variables[4] !== 0) continue;
        if (minDistance !== 0 && distance >= minDistance) continue;
        minDistance = distance;
        s = s2;
      }
      if (!s) return 0;
      if (u2 === G.unitSelected) unitSelect(null);
      u.o.linkedID = u2.o.index;
      u.o.flags.inTransport = true;
      unitUpdateMap(0, u2);
      unitHide(u2);
      objectScriptVariable4Link(indexEncode(u.o.index, IT.UNIT), indexEncode(s.o.index, IT.STRUCTURE));
      u.targetMove = u.o.script.variables[4];
      unitUpdateMap(2, u);
      if (u2.o.type !== UNIT.HARVESTER) return 0;
      if (mapSearchSpice(packTile(u2.o.position), 2) === 0) {
        u2.targetPreLast = { x: 0, y: 0 };
        u2.targetLast = { x: 0, y: 0 };
      }
      return 0;
    }
    default:
      return 0;
  }
};

const unitStop: ScriptFunction = () => {
  const u = cur();
  unitSetSpeed(u, 0);
  unitUpdateMap(2, u);
  return 0;
};

const unitSetSpeedFn: ScriptFunction = (script) => {
  const u = cur();
  let speed = clamp(s16(P(script, 1)), 0, 255);
  if (!u.o.flags.byScenario) speed = idiv(speed * 192, 256);
  unitSetSpeed(u, speed);
  return u.speed;
};

const unitSetSprite: ScriptFunction = (script) => {
  const u = cur();
  u.spriteOffset = s8(-(P(script, 1) & 0xff));
  unitUpdateMap(2, u);
  return 0;
};

const unitMoveToTarget: ScriptFunction = (script) => {
  const u = cur();
  if (u.targetMove === 0) return 0;
  const t = unitDestinationTile(u,u.targetMove);
  const distance = tileGetDistance(u.o.position, t);
  if (s16(distance) < 128) {
    unitSetSpeed(u, 0);
    u.o.position = {
      x: u16(u.o.position.x + clamp(s16(t.x - u.o.position.x), -16, 16)),
      y: u16(u.o.position.y + clamp(s16(t.y - u.o.position.y), -16, 16)),
    };
    unitUpdateMap(2, u);
    if (s16(distance) < 32) return 1;
    script.delay = 2;
    script.pc--;
    return 0;
  }
  const orientation = tileGetDirection(u.o.position, t);
  unitSetOrientation(u, orientation, false, 0);
  let diff = Math.abs(orientation - u.orientation[0].current);
  if (diff > 128) diff = 256 - diff;
  unitSetSpeed(u, idiv(Math.max(Math.min(idiv(distance, 8), 255), 25) * (255 - diff) + 128, 256));
  const delay = Math.max(idiv(s16(distance), 1024), 1);
  unitUpdateMap(2, u);
  if (delay !== 0) {
    script.delay = delay;
    script.pc--;
  }
  return 0;
};

const unitDie: ScriptFunction = () => {
  const u = cur();
  const ui = unitInfo[u.o.type];
  unitRemove(u);
  if (isHuman(u.o.houseID) && (u.o.type < UNIT.MISSILE_HOUSE || u.o.type === UNIT.LASER_TANK || u.o.type === UNIT.COMBAT_DRONE)) G.scenario.unitsLostAllied++;
  if (ui.movementType !== MOVEMENT.WINGER) {
    const credits = Math.max(idiv(ui.o.buildCredits, 100), 1);
    if (isHuman(u.o.houseID)) {
      G.scenario.killedAllied++;
      // MD $044662: очков не меньше нуля
      G.scenario.score -= Math.min(credits, Math.max(0, G.scenario.score));
    } else {
      G.scenario.killedEnemy++;
      G.scenario.score += credits;
    }
  }
  unitHouseUnitCountRemove(u);
  if (u.o.type !== UNIT.SABOTEUR) return 0;
  mapMakeExplosion(EXPLOSION.SABOTEUR_DEATH, u.o.position, 300, 0);
  return 0;
};

const unitExplosionSingle: ScriptFunction = (script) => {
  const u = cur();
  mapMakeExplosion(P(script, 1), u.o.position, unitInfo[u.o.type].o.hitpoints, indexEncode(u.o.index, IT.UNIT));
  return 0;
};

const unitExplosionMultiple: ScriptFunction = (script) => {
  const u = cur();
  mapMakeExplosion(EXPLOSION.DEATH_HAND, u.o.position, randomRange(25, 50), 0);
  for (let i = 0; i < 7; i++) {
    mapMakeExplosion(EXPLOSION.DEATH_HAND, tileMoveByRandom(u.o.position, P(script, 1), false), randomRange(75, 150), 0);
  }
  return 0;
};

function friendlyStructureOnRay(from: Tile32, to: Tile32, houseID: number): boolean {
  let x = packTile(from) & 63;
  let y = packTile(from) >> 6;
  const endX = packTile(to) & 63;
  const endY = packTile(to) >> 6;
  const dx = Math.abs(endX - x);
  const sx = x < endX ? 1 : -1;
  const dy = -Math.abs(endY - y);
  const sy = y < endY ? 1 : -1;
  let error = dx + dy;
  while (x !== endX || y !== endY) {
    const twice = error * 2;
    if (twice >= dy) { error += dy; x += sx; }
    if (twice <= dx) { error += dx; y += sy; }
    if (x === endX && y === endY) break;
    const packed=packXY(x,y);
    if(mapGetLandscapeType(packed)===LST.WALL&&houseAreAllied(G.map[packed].houseID,houseID))return true;
    const structure = structureGetByPackedTile(packed);
    if (structure && houseAreAllied(structure.o.houseID, houseID)) return true;
  }
  return false;
}

function unitFindClearShotTile(unit: Unit, target: number): number {
  const targetPosition = indexGetTile(target);
  const packedTarget = packTile(targetPosition);
  const targetX = packedTarget & 63;
  const targetY = packedTarget >> 6;
  const range = Math.max(1, unitInfo[unit.o.type].fireDistance);
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let y = Math.max(0, targetY - range); y <= Math.min(63, targetY + range); y++) {
    for (let x = Math.max(0, targetX - range); x <= Math.min(63, targetX + range); x++) {
      const packed = packXY(x, y);
      if (!mapIsValidPosition(packed) || structureGetByPackedTile(packed)) continue;
      if (unitGetTileEnterScore(unit, packed, 0) >= 256) continue;
      const point = tileCenter(unpackTile(packed));
      if (tileGetDistance(point, targetPosition) > range * 256) continue;
      if (friendlyStructureOnRay(point, targetPosition, unitGetHouseID(unit))) continue;
      const distance = tileGetDistance(unit.o.position, point);
      if (distance < bestDistance) {
        best = packed;
        bestDistance = distance;
      }
    }
  }
  return best;
}

const unitFire: ScriptFunction = (script) => {
  const u = cur();
  const target = u.targetAttack;
  if (target === 0 || !indexIsValid(target)) return 0;
  const targetTile=indexGetPackedTile(target);
  if(mapGetLandscapeType(targetTile)===LST.WALL&&houseAreAllied(G.map[targetTile].houseID,unitGetHouseID(u)))return 0;
  if (u.o.type !== UNIT.SANDWORM && target === indexEncode(packTile(u.o.position), IT.TILE)) u.targetAttack = 0;
  if (u.targetAttack !== target) {
    unitSetTarget(u, target);
    return 0;
  }
  const ui = unitInfo[u.o.type];
  const turret = ui.o.flags.hasTurret ? 1 : 0;
  if (u.o.type !== UNIT.SANDWORM && u.orientation[turret].speed !== 0) return 0;
  if (indexGetType(target) === IT.TILE && objectGetByPackedTile(indexGetPackedTile(target)) !== null) unitSetTarget(u, target);
  if (u.fireDelay !== 0) return 0;
  const distance = objectGetDistanceToEncoded(u.o, target);
  if (s16(ui.fireDistance << 8) < s16(distance)) return 0;
  const tu = indexGetUnit(target);
  if(tu&&unitInfo[tu.o.type].movementType===MOVEMENT.WINGER&&!ui.o.flags.targetAir)return 0;
  if (u.o.type !== UNIT.SANDWORM && (indexGetType(target) !== IT.UNIT || unitInfo[tu!.o.type].movementType !== MOVEMENT.WINGER)) {
    const orientation = tileGetDirection(u.o.position, indexGetTile(target));
    let diff = Math.abs(u.orientation[turret].current - orientation);
    if (ui.movementType === MOVEMENT.WINGER) diff = idiv(diff, 8);
    if (diff >= 8) return 0;
  }
  if (ui.bulletType !== UNIT.SANDWORM && ui.bulletType !== UNIT.INVALID && ui.movementType !== MOVEMENT.WINGER &&
      friendlyStructureOnRay(u.o.position, indexGetTile(target), unitGetHouseID(u))) {
    if (u.speed === 0 && u.currentDestination.x === 0 && u.currentDestination.y === 0) {
      const detour = unitFindClearShotTile(u, target);
      if (detour !== 0) unitSetDestination(u, indexEncode(detour, IT.TILE));
    }
    return 0;
  }
  if(u.o.type===UNIT.LASER_TANK)return fireLaser(u,target);
  let damage = ui.damage;
  let typeID = ui.bulletType;
  const fireTwice = ui.flags.firesTwice && u.o.hitpoints > idiv(ui.o.hitpoints, 2);
  if ((u.o.type === UNIT.TROOPERS || u.o.type === UNIT.TROOPER) && s16(distance) > 512) typeID = UNIT.MISSILE_TROOPER;
  switch (typeID) {
    case UNIT.SANDWORM: {
      unitUpdateMap(0, u);
      const u2 = indexGetUnit(target);
      if (u2) {
        u.o.position = { ...u2.o.position };
        u2.o.script.variables[1] = 0xffff;
        unitRemovePlayer(u2);
        unitHouseUnitCountRemove(u2);
        unitRemove(u2);
      }
      mapMakeExplosion(ui.explosionType, u.o.position, 0, 0);
      G.onSound(63, u.o.position);
      unitUpdateMap(1, u);
      u.amount = (u.amount - 1) & 0xff;
      script.delay = 12;
      if (s8(u.amount) < 1) unitSetAction(u, ACTION.DIE);
      break;
    }
    case UNIT.MISSILE_TROOPER:
    case UNIT.MISSILE_ROCKET:
    case UNIT.MISSILE_TURRET:
    case UNIT.MISSILE_DEVIATOR:
    case UNIT.BULLET:
    case UNIT.SONIC_BLAST: {
      if (typeID === UNIT.MISSILE_TROOPER) damage -= idiv(damage, 4);
      const bullet = unitCreateBullet(u.o.position, typeID, unitGetHouseID(u), damage, target);
      if (!bullet) return 0;
      bullet.originEncoded = indexEncode(u.o.index, IT.UNIT);
      G.onUnitShot(u, bullet);
      // $044B38: выстрел пулей у танка и осадного танка ставит кадры отдачи башни
      if (typeID === UNIT.BULLET && (u.o.type === UNIT.TANK || u.o.type === UNIT.SIEGE_TANK)) {
        u.recoil = true;
        u.recoilShown = true;
      }
      G.onSound(ui.bulletSound, u.o.position, u.o.type === UNIT.SONIC_TANK ? 0.45 : 1);
      unitDeviationDecrease(u, 20);
      break;
    }
    default:
      break;
  }
  u.fireDelay = adjustToGameSpeed(ui.fireDelay * 2, 1, 0xffff, true);
  if (fireTwice) {
    u.o.flags.fireTwiceFlip = !u.o.flags.fireTwiceFlip;
    if (u.o.flags.fireTwiceFlip) u.fireDelay = adjustToGameSpeed(5, 1, 10, true);
  } else {
    u.o.flags.fireTwiceFlip = false;
  }
  u.fireDelay += random256() & 1;
  unitUpdateMap(2, u);
  return 1;
};

const unitSetOrientationFn: ScriptFunction = (script) => {
  const u = cur();
  unitSetOrientation(u, s8(P(script, 1)), false, 0);
  return u.orientation[0].current;
};

const unitRotate: ScriptFunction = () => {
  const u = cur();
  const ui = unitInfo[u.o.type];
  if (ui.movementType !== MOVEMENT.WINGER && (u.currentDestination.x !== 0 || u.currentDestination.y !== 0)) return 1;
  const index = ui.o.flags.hasTurret ? 1 : 0;
  if (u.orientation[index].speed !== 0) return 1;
  const current = u.orientation[index].current;
  if (!indexIsValid(u.targetAttack)) return 0;
  const orientation = tileGetDirection(u.o.position, indexGetTile(u.targetAttack));
  if (orientation === current) return 0;
  unitSetOrientation(u, orientation, false, index);
  return 1;
};

const unitGetOrientation: ScriptFunction = (script) => {
  const u = cur();
  const encoded = P(script, 1);
  if (indexIsValid(encoded)) return tileGetDirection(u.o.position, indexGetTile(encoded));
  return u.orientation[0].current;
};

const unitSetDestinationFn: ScriptFunction = (script) => {
  const u = cur();
  const encoded = P(script, 1);
  if (encoded === 0 || !indexIsValid(encoded)) {
    u.targetMove = 0;
    return 0;
  }
  if (u.o.type === UNIT.HARVESTER) {
    const s = indexGetStructure(encoded);
    if (!s) {
      u.targetMove = encoded;
      u.route[0] = 0xff;
      return 0;
    }
    if (s.o.script.variables[4] !== 0) return 0;
  }
  unitSetDestination(u, encoded);
  return 0;
};

const unitSetTargetFn: ScriptFunction = (script) => {
  const u = cur();
  const target = P(script, 1);
  if (target === 0 || !indexIsValid(target)) {
    u.targetAttack = 0;
    return 0;
  }
  const orientation = tileGetDirection(u.o.position, indexGetTile(target));
  u.targetAttack = target;
  if (!unitInfo[u.o.type].o.flags.hasTurret) {
    u.targetMove = target;
    unitSetOrientation(u, orientation, false, 0);
  }
  unitSetOrientation(u, orientation, false, 1);
  return u.targetAttack;
};

const unitSetActionFn: ScriptFunction = (script) => {
  const u = cur();
  const action = P(script, 1);
  if (isHuman(u.o.houseID) && action === ACTION.HARVEST && u.nextActionID !== ACTION.INVALID) return 0;
  unitSetAction(u, action);
  return 0;
};

const unitSetActionDefault: ScriptFunction = () => {
  const u = cur();
  unitSetAction(u, unitInfo[u.o.type].o.actionsPlayer[3]);
  return 0;
};

const unitSetDestinationDirect: ScriptFunction = (script) => {
  const encoded = P(script, 1);
  if (!indexIsValid(encoded)) return 0;
  const u = cur();
  if ((u.currentDestination.x === 0 && u.currentDestination.y === 0) || unitInfo[u.o.type].flags.isNormalUnit) {
    u.currentDestination = unitDestinationTile(u,encoded);
  }
  unitSetOrientation(u, tileGetDirection(u.o.position, u.currentDestination), false, 0);
  return 0;
};

const unitGetInfo: ScriptFunction = (script) => {
  const u = cur();
  const ui = unitInfo[u.o.type];
  const turret = ui.o.flags.hasTurret ? 1 : 0;
  switch (P(script, 1)) {
    case 0x00: return idiv(u.o.hitpoints * 256, ui.o.hitpoints);
    case 0x01: return indexIsValid(u.targetMove) ? u.targetMove : 0;
    case 0x02: return ui.fireDistance << 8;
    case 0x03: return u.o.index;
    case 0x04: return u.orientation[0].current;
    case 0x05: return u.targetAttack;
    case 0x06:
      if (u.originEncoded === 0 || u.o.type === UNIT.HARVESTER) unitFindClosestRefinery(u);
      return u.originEncoded;
    case 0x07: return u.o.type;
    case 0x08: return indexEncode(u.o.index, IT.UNIT);
    case 0x09: return u.movingSpeed;
    case 0x0a: return Math.abs(u.orientation[0].target - u.orientation[0].current);
    case 0x0b: return u.currentDestination.x === 0 && u.currentDestination.y === 0 ? 0 : 1;
    case 0x0c: return u.fireDelay === 0 ? 1 : 0;
    case 0x0d: return ui.flags.explodeOnDeath;
    case 0x0e: return unitGetHouseID(u);
    case 0x0f: return u.o.flags.byScenario ? 1 : 0;
    case 0x10: return u.orientation[turret].current;
    case 0x11: return Math.abs(u.orientation[turret].target - u.orientation[turret].current);
    case 0x12: return (ui.movementType & 0x40) === 0 ? 0 : 1;
    case 0x13: return (u.o.seenByHouses & humanMask()) === 0 ? 0 : 1;
    default: return 0;
  }
};

// ---- поиск пути (Script_Unit_Pathfinder)
interface PathData {
  packed: number;
  score: number;
  routeSize: number;
  buffer: number[];
}

function pathScore(packed: number, orient8: number): number {
  const u = G.scriptCurrentUnit;
  if (!u) return 0;
  let res = unitGetTileEnterScore(u, packed, orient8 << 5);
  if (res === -1) res = 256;
  return res;
}

const DIRECTION_OFFSET = [0, 0, 1, 2, 3, -2, -1, 0];

function pathSmoothen(data: PathData): void {
  const b = data.buffer;
  b[data.routeSize] = 0xff;
  let packed = data.packed;
  if (data.routeSize > 1) {
    let to = 1;
    while (b[to] !== 0xff) {
      let from = to - 1;
      while (b[from] === 0xfe && from !== 0) from--;
      if (b[from] === 0xfe) {
        to++;
        continue;
      }
      let direction = DIRECTION_OFFSET[(b[to] - b[from]) & 0x7];
      if (direction === 3) {
        b[from] = 0xfe;
        b[to] = 0xfe;
        to++;
        continue;
      }
      if (direction === 0) {
        packed = u16(packed + MAP_DIRECTION[b[from]]);
        to++;
        continue;
      }
      let dir: number;
      if ((b[from] & 0x1) !== 0) {
        dir = (b[from] + (direction < 0 ? -1 : 1)) & 0x7;
        if (Math.abs(direction) === 1) {
          if (pathScore(u16(packed + MAP_DIRECTION[dir]), dir) <= 255) {
            b[to] = dir;
            b[from] = dir;
          }
          packed = u16(packed + MAP_DIRECTION[b[from]]);
          to++;
          continue;
        }
      } else {
        dir = (b[from] + direction) & 0x7;
      }
      b[to] = dir;
      b[from] = 0xfe;
      while (b[from] === 0xfe && from !== 0) from--;
      if (b[from] !== 0xfe) packed = u16(packed + MAP_DIRECTION[(b[from] + 4) & 0x7]);
      else packed = data.packed;
      direction = 0;
    }
  }
  packed = data.packed;
  data.score = 0;
  data.routeSize = 0;
  let w = 0;
  for (let r = 0; b[r] !== 0xff; r++) {
    if (b[r] === 0xfe) continue;
    packed = u16(packed + MAP_DIRECTION[b[r]]);
    data.score += pathScore(packed, b[r]);
    data.routeSize++;
    b[w++] = b[r];
  }
  data.routeSize++;
  b[w] = 0xff;
}

function pathConnect(packedDst: number, data: PathData, searchDirection: number, directionStart: number): boolean {
  let packedCur = data.packed;
  const b = data.buffer;
  let size = 0;
  while (size < 100) {
    let direction = directionStart;
    let packedNext: number;
    for (;;) {
      direction = (direction + searchDirection) & 0x7;
      if ((direction & 0x1) !== 0 && u16(packedCur + MAP_DIRECTION[(direction + searchDirection) & 0x7]) === packedDst) {
        direction = (direction + searchDirection) & 0x7;
        packedNext = u16(packedCur + MAP_DIRECTION[direction]);
        break;
      }
      if (direction === directionStart) return false;
      packedNext = u16(packedCur + MAP_DIRECTION[direction]);
      if (pathScore(packedNext, direction) <= 255) break;
    }
    b[size++] = direction;
    if (packedNext === packedDst) {
      b[size] = 0xff;
      data.routeSize = size;
      pathSmoothen(data);
      data.routeSize--;
      return true;
    }
    if (data.packed === packedNext) return false;
    directionStart = (direction - searchDirection * 3) & 0x7;
    packedCur = packedNext;
  }
  return false;
}

function pathfinder(packedSrc: number, packedDst: number, bufferSize: number): PathData {
  const res: PathData = { packed: packedSrc, score: 0, routeSize: 0, buffer: new Array(bufferSize + 2).fill(0xff) };
  res.buffer[0] = 0xff;
  bufferSize--;
  let packedCur = packedSrc;
  while (res.routeSize < bufferSize) {
    if (packedCur === packedDst) break;
    const direction = tileGetDirectionPacked(packedCur, packedDst) >> 5;
    let packedNext = u16(packedCur + MAP_DIRECTION[direction]);
    const score = pathScore(packedNext, direction);
    if (score <= 255) {
      res.buffer[res.routeSize++] = direction;
      res.score += score;
    } else {
      let foundCounterclockwise = false;
      let foundClockwise = false;
      const routes: PathData[] = [
        { packed: 0, score: 0, routeSize: 0, buffer: new Array(102).fill(0xff) },
        { packed: 0, score: 0, routeSize: 0, buffer: new Array(102).fill(0xff) },
      ];
      for (let guard = 0; guard < 4096; guard++) {
        if (packedNext === packedDst) break;
        let dir = tileGetDirectionPacked(packedNext, packedDst) >> 5;
        packedNext = u16(packedNext + MAP_DIRECTION[dir]);
        if (pathScore(packedNext, dir) > 255) continue;
        routes[1] = { packed: packedCur, score: 0, routeSize: 0, buffer: new Array(102).fill(0xff) };
        foundCounterclockwise = pathConnect(packedNext, routes[1], -1, direction);
        routes[0] = { packed: packedCur, score: 0, routeSize: 0, buffer: new Array(102).fill(0xff) };
        foundClockwise = pathConnect(packedNext, routes[0], 1, direction);
        if (foundCounterclockwise || foundClockwise) break;
        do {
          if (packedNext === packedDst) break;
          dir = tileGetDirectionPacked(packedNext, packedDst) >> 5;
          packedNext = u16(packedNext + MAP_DIRECTION[dir]);
        } while (pathScore(packedNext, dir) <= 255);
      }
      if (foundCounterclockwise || foundClockwise) {
        let best: PathData;
        if (!foundClockwise) best = routes[1];
        else if (!foundCounterclockwise) best = routes[0];
        else best = routes[routes[1].score < routes[0].score ? 1 : 0];
        const routeSize = Math.min(bufferSize - res.routeSize, best.routeSize);
        if (routeSize <= 0) break;
        for (let i = 0; i < routeSize; i++) res.buffer[res.routeSize + i] = best.buffer[i];
        res.routeSize += routeSize;
        res.score += best.score;
      } else {
        break;
      }
    }
    packedCur = packedNext;
  }
  if (res.routeSize < bufferSize) res.buffer[res.routeSize++] = 0xff;
  pathSmoothen(res);
  return res;
}

const unitCalculateRoute: ScriptFunction = (script) => {
  const u = cur();
  const encoded = P(script, 1);
  if (u.currentDestination.x !== 0 || u.currentDestination.y !== 0 || !indexIsValid(encoded)) return 1;
  const packedSrc = packTile(u.o.position);
  const packedDst = packTile(unitDestinationTile(u,encoded));
  if (packedDst === packedSrc) {
    u.route[0] = 0xff;
    u.targetMove = 0;
    return 0;
  }
  if (u.route[0] === 0xff) {
    const res = pathfinder(packedSrc, packedDst, 40);
    const n = Math.min(res.routeSize, 14);
    for (let i = 0; i < n; i++) u.route[i] = res.buffer[i];
    if (u.route[0] === 0xff) {
      const refinery=indexGetStructure(encoded);
      if(u.o.type===UNIT.HARVESTER&&refinery?.o.type===STRUCTURE.REFINERY&&refinery.o.houseID===unitGetHouseID(u)){
        objectScriptVariable4Clear(u.o);u.targetMove=0;
        unitSetAction(u,ACTION.RETURN);return 1;
      }
      u.targetMove = 0;
      if (u.o.type === UNIT.SANDWORM) script.delay = 720;
    }
  } else {
    const distance = tileGetDistancePacked(packedDst, packedSrc);
    if (distance < 14) u.route[distance] = 0xff;
  }
  if (u.route[0] === 0xff) return 1;
  if (u.orientation[0].current !== s8(u.route[0] * 32)) {
    unitSetOrientation(u, s8(u.route[0] * 32), false, 0);
    return 1;
  }
  if (!unitStartMovement(u)) {
    u.route[0] = 0xff;
    return 0;
  }
  for (let i = 0; i < 13; i++) u.route[i] = u.route[i + 1];
  u.route[13] = 0xff;
  return 1;
};

const unitMoveToStructure: ScriptFunction = (script) => {
  const u = cur();
  if (u.o.linkedID !== 0xff) {
    const s = indexGetStructure(G.units[u.o.linkedID].originEncoded);
    if (s && s.state === STATE.IDLE && s.o.script.variables[4] === 0) {
      const encoded = indexEncode(s.o.index, IT.STRUCTURE);
      objectScriptVariable4Link(indexEncode(u.o.index, IT.UNIT), encoded);
      u.targetMove = u.o.script.variables[4];
      return encoded;
    }
  }
  const find = findAll(unitGetHouseID(u), P(script, 1));
  for (;;) {
    const s = structureFind(find);
    if (!s) break;
    if (s.state !== STATE.IDLE) continue;
    if (s.o.script.variables[4] !== 0) continue;
    const encoded = indexEncode(s.o.index, IT.STRUCTURE);
    objectScriptVariable4Link(indexEncode(u.o.index, IT.UNIT), encoded);
    u.targetMove = encoded;
    return encoded;
  }
  return 0;
};

const unitGetAmount: ScriptFunction = () => {
  const u = cur();
  if (u.o.linkedID === 0xff) return u.amount;
  const cargo = G.units[u.o.linkedID];
  // Ремейк (просьба владельца): скрипт ROM ($1838) везёт харвестер со спайсом к заводу очистки и кружит, пока
  // завода нет, — бесконечно. Если у дома не осталось ни одного завода, отвечаем «пуст»: скрипт сбрасывает
  // харвестер на месте ($1859), а перевозчик потом улетает (Unit.carryallLeaving).
  if (u.o.type === UNIT.CARRYALL && cargo.o.type === UNIT.HARVESTER && !houseHasRefinery(unitGetHouseID(u))) return 0;
  return cargo.amount;
};

/** Есть ли у дома хоть один завод очистки. */
function houseHasRefinery(houseID: number): boolean {
  return structureFind(findAll(houseID, STRUCTURE.REFINERY)) !== null;
}

const unitIsInTransport: ScriptFunction = () => (cur().o.flags.inTransport ? 1 : 0);

const unitStartAnimation: ScriptFunction = () => {
  // В Mega Drive версии нет оверлейных иконок трупов пехоты (группа 4 в ROM занята частями зданий)
  return 1;
};

const unitCallUnitByTypeFn: ScriptFunction = (script) => {
  const u = cur();
  if (u.o.script.variables[4] !== 0) return u.o.script.variables[4];
  if (!unitInfo[u.o.type].o.flags.canBePickedUp || u.deviated !== 0) return 0;
  const encoded = indexEncode(u.o.index, IT.UNIT);
  const u2 = unitCallUnitByType(P(script, 1), unitGetHouseID(u), encoded, harvesterNeedsLift(u));
  if (!u2) return 0;
  const encoded2 = indexEncode(u2.o.index, IT.UNIT);
  objectScriptVariable4Link(encoded, encoded2);
  u2.targetMove = encoded;
  return encoded2;
};

const unitUnknown2552: ScriptFunction = () => {
  const u = cur();
  if (u.o.script.variables[4] === 0) return 0;
  const u2 = indexGetUnit(u.o.script.variables[4]);
  if (!u2 || u2.o.type !== UNIT.CARRYALL) return 0;
  objectScriptVariable4Clear(u.o);
  u2.targetMove = 0;
  return 0;
};

const unitFindStructure: ScriptFunction = (script) => {
  const u = cur();
  const find = findAll(unitGetHouseID(u), P(script, 1));
  for (;;) {
    const s = structureFind(find);
    if (!s) break;
    if (s.state !== STATE.IDLE) continue;
    if (s.o.linkedID !== 0xff) continue;
    if (s.o.script.variables[4] !== 0) continue;
    return indexEncode(s.o.index, IT.STRUCTURE);
  }
  return 0;
};

const unitDisplayDestroyedText: ScriptFunction = () => {
  const u = cur();
  G.onMessage(msg.destroyed(unitGetHouseID(u), u.o.type, false), 0);
  return 0;
};

const unitRemoveFogFn: ScriptFunction = () => {
  unitRemoveFog(cur());
  return 0;
};

const unitHarvest: ScriptFunction = () => {
  const u = cur();
  if (u.o.type !== UNIT.HARVESTER) return 0;
  if (u.amount >= 100) return 0;
  const packed = packTile(u.o.position);
  const type = mapGetLandscapeType(packed);
  if (type !== LST.SPICE && type !== LST.THICK_SPICE) return 0;
  u.amount += random256() & 1;
  u.o.flags.inTransport = true;
  unitUpdateMap(2, u);
  if (u.amount > 100) u.amount = 100;
  if (G.infiniteSpice) return 1;
  if ((random256() & 0x1f) !== 0) return 1;
  mapChangeSpiceAmount(packed, -1);
  return 0;
};

const unitIsValidDestination: ScriptFunction = (script) => {
  const u = cur();
  const encoded = P(script, 1);
  const index = indexDecode(encoded);
  switch (indexGetType(encoded)) {
    case IT.TILE: {
      if (!mapIsValidPosition(index)) return 1;
      if (u.o.linkedID === 0xff) return 1;
      const u2 = G.units[u.o.linkedID];
      u2.o.position = indexGetTile(encoded);
      if (!unitIsTileOccupied(u2)) return 0;
      u2.o.position = { x: 0xffff, y: 0xffff };
      return 1;
    }
    case IT.STRUCTURE: {
      const s = G.structures[index];
      if (s.o.houseID === unitGetHouseID(u)) return 0;
      if (u.o.linkedID === 0xff) return 1;
      const u2 = G.units[u.o.linkedID];
      return unitIsValidMovementIntoStructure(u2, s) !== 0 ? 1 : 0;
    }
    default:
      return 1;
  }
};

const unitGetRandomTile: ScriptFunction = (script) => {
  const u = cur();
  if (indexGetType(P(script, 1)) !== IT.TILE) return 0;
  const t = tileMoveByRandom(u.o.position, 80, true);
  return indexEncode(packTile(t), IT.TILE);
};

const unitIdleAction: ScriptFunction = () => {
  const u = cur();
  const random = randomRange(0, 10);
  const movementType = unitInfo[u.o.type].movementType;
  if (movementType !== MOVEMENT.FOOT && movementType !== MOVEMENT.TRACKED && movementType !== MOVEMENT.WHEELED) return 0;
  if (movementType === MOVEMENT.FOOT && random > 8) {
    u.spriteOffset = random256() & 0x3f;
    unitUpdateMap(2, u);
  }
  if (random > 2) return 0;
  const i = (random256() & 1) === 0 ? 1 : 0;
  unitSetOrientation(u, random256(), false, i);
  return 0;
};

const unitGoToClosestStructure: ScriptFunction = (script) => {
  const u = cur();
  let s: Structure | null = null;
  let distanceMin = 0;
  const find = findAll(unitGetHouseID(u), P(script, 1));
  for (;;) {
    const s2 = structureFind(find);
    if (!s2) break;
    if (s2.state !== STATE.IDLE) continue;
    if (s2.o.linkedID !== 0xff) continue;
    if (s2.o.script.variables[4] !== 0) continue;
    const distance = tileGetDistanceRoundedUp(s2.o.position, u.o.position);
    if (distance >= distanceMin && distanceMin !== 0) continue;
    distanceMin = distance;
    s = s2;
  }
  if (!s) return 0;
  if(u.o.type===UNIT.HARVESTER&&s.o.type===STRUCTURE.REFINERY&&harvesterNeedsLift(u,s)){
    const encoded=indexEncode(u.o.index,IT.UNIT);
    const plane=unitCallUnitByType(UNIT.CARRYALL,unitGetHouseID(u),encoded,true);
    if(plane){objectScriptVariable4Link(encoded,indexEncode(plane.o.index,IT.UNIT));return 1;}
  }
  unitSetAction(u, ACTION.MOVE);
  unitSetDestination(u, indexEncode(s.o.index, IT.STRUCTURE));
  return 1;
};

function harvesterNeedsLift(u:Unit,refinery?:Structure):boolean{
  if(u.o.type!==UNIT.HARVESTER)return false;
  let s=refinery;
  if(!s){
    let nearest=Infinity;
    for(const candidate of G.structureFind){
      if(candidate.o.type!==STRUCTURE.REFINERY||candidate.o.houseID!==unitGetHouseID(u)||candidate.o.flags.isNotOnMap||candidate.o.linkedID!==255||candidate.o.script.variables[4]!==0)continue;
      const distance=tileGetDistance(u.o.position,candidate.o.position);
      if(distance<nearest){nearest=distance;s=candidate;}
    }
  }
  if(!s)return false;
  const exit=packTile(refineryExit(s.o.position));
  if(unitGetTileEnterScore(u,exit,0)>255)return true;
  // The pad itself can be free while walls or other buildings enclose its approach.
  const queue=new Uint16Array(4096),seen=new Uint8Array(4096);
  let head=0,tail=1;queue[0]=packTile(u.o.position);seen[queue[0]]=1;
  while(head<tail){
    const p=queue[head++];if(p===exit)return false;
    const x=p&63,y=p>>6;
    for(let direction=0;direction<8;direction++){
      const nx=x+[0,1,1,1,0,-1,-1,-1][direction],ny=y+[-1,-1,0,1,1,1,0,-1][direction];
      if(nx<0||nx>63||ny<0||ny>63)continue;
      const next=packXY(nx,ny);
      if(seen[next]||!mapIsValidPosition(next)||structureGetByPackedTile(next)||unitGetTileEnterScore(u,next,direction)>255)continue;
      seen[next]=1;queue[tail++]=next;
    }
  }
  return true;
}

const MCV_OFFSETS = [0, -1, -64, -65];

const unitMCVDeploy: ScriptFunction = () => {
  const u = cur();
  unitUpdateMap(0, u);
  for (let i = 0; i < 4; i++) {
    const s = structureCreate(INDEX_INVALID, STRUCTURE.CONSTRUCTION_YARD, unitGetHouseID(u), u16(packTile(u.o.position) + MCV_OFFSETS[i]));
    if (s) {
      unitRemove(u);
      return 1;
    }
  }
  if (isLocal(unitGetHouseID(u))) G.onMessage(msg.unableToDeploy, 0);
  unitUpdateMap(1, u);
  return 0;
};

const unitSandwormGetBestTarget: ScriptFunction = () => {
  const u2 = unitSandwormFindBestTarget(cur());
  if (!u2) return 0;
  return indexEncode(u2.o.index, IT.UNIT);
};

const unitUnknown2BD5: ScriptFunction = () => {
  const u = cur();
  switch (indexGetType(u.o.script.variables[4])) {
    case IT.UNIT: {
      const u2 = indexGetUnit(u.o.script.variables[4])!;
      if (indexEncode(u.o.index, IT.UNIT) === u2.o.script.variables[4] && u2.o.houseID === u.o.houseID) return 1;
      u2.targetMove = 0;
      break;
    }
    case IT.STRUCTURE: {
      const s = indexGetStructure(u.o.script.variables[4])!;
      if (indexEncode(u.o.index, IT.UNIT) === s.o.script.variables[4] && s.o.houseID === u.o.houseID) return 1;
      break;
    }
  }
  objectScriptVariable4Clear(u.o);
  return 0;
};

const unitBlink: ScriptFunction = () => {
  cur().blinkCounter = 32;
  return 0;
};

// ------------------------------------------------------------------ structure.c
const structureGetState: ScriptFunction = () => curS().state;

const structureSetStateFn: ScriptFunction = (script) => {
  const s = curS();
  let state = s16(P(script, 1));
  if (state === STATE.DETECT) {
    if (s.o.linkedID === 0xff) state = STATE.IDLE;
    else state = s.countDown === 0 ? STATE.READY : STATE.BUSY;
  }
  structureSetState(s, state);
  return 0;
};

const structureRemoveFogAroundTile: ScriptFunction = () => {
  structureRemoveFog(curS());
  return 0;
};

const structureRefineSpice: ScriptFunction = () => {
  const s = curS();
  if (s.o.linkedID === 0xff) {
    structureSetState(s, STATE.IDLE);
    return 0;
  }
  const u = G.units[s.o.linkedID];
  const si = structureInfo[s.o.type];
  let harvesterStep = idiv(idiv(s.o.hitpoints * 256, si.o.hitpoints) * 3, 256);
  if (u.amount < harvesterStep) harvesterStep = u.amount;
  if (u.amount !== 0 && harvesterStep < 1) harvesterStep = 1;
  if (harvesterStep === 0) return 0;
  let creditsStep = 7;
  if (!isHuman(u.o.houseID)) creditsStep += (random256() % 4) - 1;
  creditsStep *= harvesterStep;
  if (houseAlliedToHuman(s.o.houseID)) {
    G.scenario.harvestedAllied = Math.min(G.scenario.harvestedAllied + creditsStep, 65000);
  } else {
    G.scenario.harvestedEnemy = Math.min(G.scenario.harvestedEnemy + creditsStep, 65000);
  }
  G.houses[s.o.houseID].credits += creditsStep;
  u.amount -= harvesterStep;
  if (u.amount === 0) u.o.flags.inTransport = false;
  s.o.script.delay = 6;
  return 1;
};

const structureUnknown0A81: ScriptFunction = () => {
  const s = curS();
  const structureIndex = indexEncode(s.o.index, IT.STRUCTURE);
  const u = indexGetUnit(s.o.script.variables[4]);
  if (u) {
    if (structureIndex === u.o.script.variables[4]) return s.o.script.variables[4];
    objectScriptVariable4Clear(u.o);
  }
  objectScriptVariable4Clear(s.o);
  return 0;
};

const structureFindUnitByType: ScriptFunction = (script) => {
  const s = curS();
  if (s.state !== STATE.READY) return IT.NONE;
  if (s.o.linkedID === 0xff) return IT.NONE;
  const type = P(script, 1);
  const u = G.units[s.o.linkedID];
  const position = structureGroundExit(s,u,false);
  if (isHuman(s.o.houseID) && u.o.type === UNIT.HARVESTER && u.targetLast.x === 0 && u.targetLast.y === 0 && position !== 0) return IT.NONE;
  const carryall = unitCallUnitByType(type, s.o.houseID, indexEncode(s.o.index, IT.STRUCTURE), position === 0);
  if (!carryall) return IT.NONE;
  const carryallIndex = indexEncode(carryall.o.index, IT.UNIT);
  objectScriptVariable4Set(s.o, carryallIndex);
  return carryallIndex;
};

/** The carryall request must test the same actual exit as ground deployment. */
function structureGroundExit(s:Structure,u:Unit,checkForSpice:boolean):number{
  if(s.o.type===STRUCTURE.REFINERY&&u.o.type===UNIT.HARVESTER){
    const exit=packTile(refineryExit(s.o.position));
    return mapIsValidPosition(exit)&&unitGetTileEnterScore(u,exit,0)<=255?exit:0;
  }
  return structureFindFreePosition(s,checkForSpice);
}

export function structureDeployProducedUnit(s: Structure, u: Unit, stored = true): number {
  if (unitInfo[u.o.type].movementType === MOVEMENT.WINGER && unitSetPosition(u, s.o.position)) {
    if(u.o.type===UNIT.COMBAT_DRONE)initializeDrone(u,s);
    if (!stored) s.o.linkedID = u.o.linkedID;
    u.o.linkedID = 0xff;
    if (!stored && s.o.linkedID === 0xff) structureSetState(s, STATE.IDLE);
    if (!stored) objectScriptVariable4Clear(s.o);
    // MD $0233c4: готовый юнит игрока — голос 1 ("Unit ready", GEMS seq 64)
    if (isLocal(s.o.houseID)) G.onFeedback(1);
    return 1;
  }
  const position = structureGroundExit(s,u,u.o.type===UNIT.HARVESTER);
  if (position === 0) {
    if(stored&&s.o.script.variables[4]===0){
      const carryall=unitCallUnitByType(UNIT.CARRYALL,s.o.houseID,indexEncode(s.o.index,IT.STRUCTURE),true);
      if(carryall)objectScriptVariable4Set(s.o,indexEncode(carryall.o.index,IT.UNIT));
    }
    return 0;
  }
  u.o.seenByHouses |= s.o.seenByHouses;
  const t = tileCenter(unpackTile(position));
  if (!unitSetPosition(u, t)) return 0;
  if(s.o.type===STRUCTURE.REFINERY&&u.o.type===UNIT.HARVESTER){
    const last=packTile(u.targetLast),kind=mapGetLandscapeType(last);
    const field=(u.targetLast.x||u.targetLast.y)&&(kind===LST.SPICE||kind===LST.THICK_SPICE)
      ?last:mapSearchSpice(packTile(u.o.position),64);
    if(field){
      u.targetLast=tileCenter(unpackTile(field));
      unitSetAction(u,ACTION.HARVEST);
      unitSetDestination(u,indexEncode(field,IT.TILE));
    }
  }
  if (!stored) s.o.linkedID = u.o.linkedID;
  u.o.linkedID = 0xff;
  unitSetOrientation(u, tileGetDirection(s.o.position, u.o.position) & 0xe0, true, 0);
  unitSetOrientation(u, u.orientation[0].current, true, 1);
  if (isLocal(u.o.houseID) && u.o.type === UNIT.HARVESTER) G.onMessage(msg.searchSpice, 1);
  if (!stored && s.o.linkedID === 0xff) structureSetState(s, STATE.IDLE);
  objectScriptVariable4Clear(s.o);
  if (!isLocal(s.o.houseID)) return 1;
  if (s.o.type === STRUCTURE.REPAIR) return 1;
  // MD $0233c4: готовый юнит игрока — голос 1 ("Unit ready", GEMS seq 64)
  G.onFeedback(1);
  return 1;
}

const structureUnknown0C5A: ScriptFunction = () => {
  const s = curS();
  return s.o.linkedID === 0xff ? 0 : structureDeployProducedUnit(s, G.units[s.o.linkedID], false);
};

const structureFindTargetUnit: ScriptFunction = (script) => {
  const s = curS();
  const targetRange = P(script, 1);
  const distanceCurrent = 32000;
  let u: Unit | null = null;
  const position = s.o.position;
  const find = findAll();
  for (;;) {
    const uf = unitFind(find, unitGetHouseID);
    if (!uf) break;
    if (houseAreAllied(s.o.houseID, unitGetHouseID(uf))) continue;
    if (uf.o.type !== UNIT.ORNITHOPTER && (uf.o.seenByHouses & (1 << s.o.houseID)) === 0) continue;
    const distance = tileGetDistance(uf.o.position, position);
    if (distance >= distanceCurrent) continue;
    if (uf.o.type === UNIT.ORNITHOPTER) {
      if (distance >= targetRange * 3) continue;
    } else if (distance >= targetRange) continue;
    u = uf;
  }
  if (!u) return IT.NONE;
  return indexEncode(u.o.index, IT.UNIT);
};

const structureRotateTurret: ScriptFunction = (script) => {
  const encoded = P(script, 1);
  if (encoded === 0) return 0;
  const s = curS();
  const lookAt = indexGetTile(encoded);
  const t = G.map[packTile(s.o.position)];
  const baseTileID = G.iconGroups[s.o.type === STRUCTURE.ROCKET_TURRET ? 24 : 23][2];
  let rotation = t.groundTileID - baseTileID;
  if (rotation < 0 || rotation > 7) return 1;
  const rotationNeeded = orientation8(tileGetDirection(s.o.position, lookAt));
  if (rotationNeeded === rotation) return 0;
  let rotateDiff = rotationNeeded - rotation;
  if (rotateDiff < 0) rotateDiff += 8;
  if (rotateDiff < 4) rotation++;
  else rotation--;
  rotation &= 0x7;
  t.groundTileID = baseTileID + rotation;
  s.rotationSpriteDiff = rotation;
  return 1;
};

const structureGetDirection: ScriptFunction = (script) => {
  const s = curS();
  const encoded = P(script, 1);
  if (!indexIsValid(encoded)) return s.rotationSpriteDiff << 5;
  return orientation8(tileGetDirection(s.o.position, indexGetTile(encoded))) << 5;
};

const structureUnknown11B9: ScriptFunction = (script) => {
  const encoded = P(script, 1);
  if (!indexIsValid(encoded)) return 0;
  if (indexGetType(encoded) !== IT.UNIT) return 0;
  const u = indexGetUnit(encoded);
  if (!u) return 0;
  objectScriptVariable4Clear(u.o);
  u.targetMove = 0;
  return 0;
};

const structureVoicePlay: ScriptFunction = (script) => {
  const s = curS();
  if (!isLocal(s.o.houseID)) return 0;
  G.onSound(P(script, 1), s.o.position);
  return 0;
};

const structureFire: ScriptFunction = (script) => {
  const s = curS();
  const target = script.variables[2];
  if (target === 0) return 0;
  let type: number;
  let damage: number;
  let fireDelay: number;
  if (s.o.type === STRUCTURE.ROCKET_TURRET && tileGetDistance(indexGetTile(target), s.o.position) >= 0x300) {
    type = UNIT.MISSILE_TURRET;
    damage = 30;
    fireDelay = adjustToGameSpeed(unitInfo[UNIT.LAUNCHER].fireDelay, 1, 0xffff, true);
  } else {
    type = UNIT.BULLET;
    damage = 20;
    fireDelay = adjustToGameSpeed(unitInfo[UNIT.TANK].fireDelay, 1, 0xffff, true);
  }
  const position = tile(s.o.position.x + 0x80, s.o.position.y + 0x80);
  const u = unitCreateBullet(position, type, s.o.houseID, damage, target);
  if (!u) return 0;
  u.originEncoded = indexEncode(s.o.index, IT.STRUCTURE);
  return fireDelay;
};

const structureExplode: ScriptFunction = () => {
  const s = curS();
  const layout = structureInfo[s.o.type].layout;
  const position = packTile(s.o.position);
  for (let i = 0; i < layoutTileCount[layout]; i++) {
    mapMakeExplosion(EXPLOSION.STRUCTURE, unpackTile(position + layoutTiles[layout][i]), 0, 0);
  }
  return 0;
};

const structureDestroyFn: ScriptFunction = () => {
  const s = curS();
  const layout = structureInfo[s.o.type].layout;
  const position = packTile(s.o.position);
  structureRemove(s);
  for (let i = 0; i < layoutTileCount[layout]; i++) {
    let t = unpackTile(position + layoutTiles[layout][i]);
    if (structureInfo[s.o.type].o.spawnChance < random256()) continue;
    const u = unitCreate(INDEX_INVALID, UNIT.SOLDIER, s.o.houseID, t, random256());
    if (!u) continue;
    u.o.hitpoints = idiv(unitInfo[UNIT.SOLDIER].o.hitpoints * (random256() & 3), 256);
    if (!isHuman(s.o.houseID)) {
      unitSetAction(u, ACTION.ATTACK);
      continue;
    }
    unitSetAction(u, ACTION.MOVE);
    t = tileMoveByRandom(u.o.position, 32, true);
    u.targetMove = indexEncode(packTile(t), IT.TILE);
  }
  if (!isLocal(s.o.houseID)) return 0;
  G.onMessage(msg.destroyed(s.o.houseID, s.o.type, true), 0);
  return 0;
};

// ------------------------------------------------------------------ team.c
const teamGetMembers: ScriptFunction = () => curT().members;
const teamGetVariable6: ScriptFunction = () => curT().minMembers;
const teamGetTarget: ScriptFunction = () => curT().target;

const teamAddClosestUnit: ScriptFunction = () => {
  const t = curT();
  if (t.members >= t.maxMembers) return 0;
  let closest: Unit | null = null;
  let closest2: Unit | null = null;
  let minDistance = 0;
  let minDistance2 = 0;
  const find = findAll(t.houseID);
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (!u.o.flags.byScenario) continue;
    if (u.o.type === UNIT.SABOTEUR) continue;
    if (unitInfo[u.o.type].movementType !== t.movementType) continue;
    if (u.team === 0) {
      const distance = tileGetDistance(t.position, u.o.position);
      if (distance >= minDistance && minDistance !== 0) continue;
      minDistance = distance;
      closest = u;
      continue;
    }
    const t2 = G.teams[u.team - 1];
    if (t2.members > t2.minMembers) continue;
    const distance = tileGetDistance(t.position, u.o.position);
    if (distance >= minDistance2 && minDistance2 !== 0) continue;
    minDistance2 = distance;
    closest2 = u;
  }
  if (!closest) closest = closest2;
  if (!closest) return 0;
  unitRemoveFromTeam(closest);
  return unitAddToTeam(closest, t);
};

const teamGetAverageDistance: ScriptFunction = () => {
  const t = curT();
  let averageX = 0;
  let averageY = 0;
  let count = 0;
  let distance = 0;
  let find = findAll(t.houseID);
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (t.index !== u.team - 1) continue;
    count++;
    averageX += (u.o.position.x >> 8) & 0x3f;
    averageY += (u.o.position.y >> 8) & 0x3f;
  }
  if (count === 0) return 0;
  averageX = idiv(averageX, count);
  averageY = idiv(averageY, count);
  t.position = { x: (averageX << 8) | 0x80, y: (averageY << 8) | 0x80 };
  find = findAll(t.houseID);
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (t.index !== u.team - 1) continue;
    distance += tileGetDistanceRoundedUp(u.o.position, t.position);
  }
  distance = idiv(distance, count);
  if (t.target === 0 || t.targetTile === 0) return distance;
  if (tileGetDistancePacked(packXY(averageX, averageY), indexGetPackedTile(t.target)) <= 10) t.targetTile = 2;
  return distance;
};

const teamUnknown0543: ScriptFunction = (script) => {
  const t = curT();
  let count = 0;
  const distance = P(script, 1);
  const find = findAll(t.houseID);
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (t.index !== u.team - 1) continue;
    let tl = indexGetTile(u.targetMove);
    const distanceUnitTeam = tileGetDistanceRoundedUp(u.o.position, t.position);
    let distanceUnitDest: number;
    let distanceTeamDest: number;
    if (u.targetMove !== 0) {
      distanceUnitDest = tileGetDistanceRoundedUp(u.o.position, tl);
      distanceTeamDest = tileGetDistanceRoundedUp(t.position, tl);
    } else {
      distanceUnitDest = 64;
      distanceTeamDest = 64;
    }
    if ((distanceUnitDest < distanceTeamDest && distance + 2 < distanceUnitTeam) || (distanceUnitDest >= distanceTeamDest && distanceUnitTeam > distance)) {
      unitSetAction(u, ACTION.MOVE);
      tl = tileMoveByRandom(t.position, distance << 4, true);
      unitSetDestination(u, indexEncode(packTile(tl), IT.TILE));
      count++;
      continue;
    }
    unitSetAction(u, ACTION.GUARD);
  }
  return count;
};

const teamFindBestTarget: ScriptFunction = () => {
  const t = curT();
  const find = findAll(t.houseID);
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.team - 1 !== t.index) continue;
    const target = unitFindBestTargetEncoded(u, t.action === TEAM_ACTION.KAMIKAZE ? 4 : 0);
    if (target === 0) continue;
    if (t.target === target) return target;
    t.target = target;
    t.targetTile = tileGetTileInDirectionOf(packTile(u.o.position), indexGetPackedTile(target));
    return target;
  }
  return 0;
};

const teamLoad: ScriptFunction = (script) => {
  const t = curT();
  const type = P(script, 1);
  if (t.action === type) return 0;
  t.action = type;
  scriptReset(t.script, G.scriptTeam);
  scriptLoad(t.script, type & 0xff);
  return 0;
};

const teamLoad2: ScriptFunction = () => {
  const t = curT();
  const type = t.actionStart;
  if (t.action === type) return 0;
  t.action = type;
  scriptReset(t.script, G.scriptTeam);
  scriptLoad(t.script, type & 0xff);
  return 0;
};

const teamUnknown0788: ScriptFunction = () => {
  const t = curT();
  if (t.target === 0) return 0;
  const tl = indexGetTile(t.target);
  const find = findAll(t.houseID);
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.team - 1 !== t.index) continue;
    if (t.target === 0) {
      unitSetAction(u, ACTION.GUARD);
      continue;
    }
    const distance = u16(unitInfo[u.o.type].fireDistance << 8);
    if (u.actionID === ACTION.ATTACK && u.targetAttack === t.target) {
      if (u.targetMove !== 0) continue;
      if (tileGetDistance(u.o.position, tl) >= distance) continue;
    }
    if (u.actionID !== ACTION.ATTACK) unitSetAction(u, ACTION.ATTACK);
    let orientation = (tileGetDirection(tl, u.o.position) & 0xc0) + randomRange(0, 127);
    if (orientation < 0) orientation += 256;
    const packed = packTile(tileMoveByDirection(tl, orientation, distance));
    if (objectGetByPackedTile(packed) === null) unitSetDestination(u, indexEncode(packed, IT.TILE));
    else unitSetDestination(u, indexEncode(packTile(tl), IT.TILE));
    unitSetTarget(u, t.target);
  }
  return 0;
};

const teamDisplayText: ScriptFunction = (script) => {
  const t = curT();
  if (isLocal(t.houseID)) return 0;
  const text = scriptText(script, P(script, 1));
  if (text) G.onMessage(text, 0);
  return 0;
};

// ------------------------------------------------------------------ таблицы (script.c)
export const scriptFunctionsStructure: ScriptFunction[] = [
  generalDelay, generalNoOperation, structureUnknown0A81, structureFindUnitByType, structureSetStateFn, generalDisplayText,
  structureUnknown11B9, structureUnknown0C5A, structureFindTargetUnit, structureRotateTurret, structureGetDirection, structureFire,
  generalNoOperation, structureGetState, structureVoicePlay, structureRemoveFogAroundTile, generalNoOperation, generalNoOperation,
  generalNoOperation, generalNoOperation, generalNoOperation, structureRefineSpice, structureExplode, structureDestroyFn,
  generalNoOperation,
];

export const scriptFunctionsUnit: ScriptFunction[] = [
  unitGetInfo, unitSetActionFn, generalDisplayText, generalGetDistanceToTile, unitStartAnimation, unitSetDestinationFn,
  unitGetOrientation, unitSetOrientationFn, unitFire, unitMCVDeploy, unitSetActionDefault, unitBlink, unitCalculateRoute,
  generalIsEnemy, unitExplosionSingle, unitDie, generalDelay, generalIsFriendly, unitExplosionMultiple, unitSetSprite,
  unitTransportDeliver, generalNoOperation, unitMoveToTarget, generalRandomRange, generalFindIdle, unitSetDestinationDirect,
  unitStop, unitSetSpeedFn, unitFindBestTarget, unitGetTargetPriority, unitMoveToStructure, unitIsInTransport, unitGetAmount,
  unitRandomSoldier, unitPickup, unitCallUnitByTypeFn, unitUnknown2552, unitFindStructure, generalVoicePlay,
  unitDisplayDestroyedText, unitRemoveFogFn, generalSearchSpice, unitHarvest, generalNoOperation, generalGetLinkedUnitType,
  generalGetIndexType, generalDecodeIndex, unitIsValidDestination, unitGetRandomTile, unitIdleAction, generalUnitCount,
  unitGoToClosestStructure, generalNoOperation, generalNoOperation, unitSandwormGetBestTarget, unitUnknown2BD5,
  generalGetOrientation, generalNoOperation, unitSetTargetFn, generalUnknown0288, generalDelayRandom, unitRotate,
  generalGetDistanceToObject, generalNoOperation,
];

export const scriptFunctionsTeam: ScriptFunction[] = [
  generalDelay, teamDisplayText, teamGetMembers, teamAddClosestUnit, teamGetAverageDistance, teamUnknown0543, teamFindBestTarget,
  teamUnknown0788, teamLoad, teamLoad2, generalDelayRandom, generalDisplayModalMessage, teamGetVariable6, teamGetTarget,
  generalNoOperation,
];
