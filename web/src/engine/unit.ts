/**
 * Юниты: создание, движение, повреждения, цели, видимость (OpenDUNE src/unit.c).
 * Перенесено построчно, ветки «g_dune2_enhanced» не взяты — как в оригинальной игре.
 */
import {
  ACTION, EXPLOSION, G, HOUSE, HOUSE_INVALID, INDEX_INVALID, IT, LST, MOVEMENT, SELECTION, STRUCTURE, UNIT, adjustToGameSpeed, findAll,
  houseFind, idiv, indexDecode, indexEncode, indexGetPackedTile, indexGetStructure, indexGetTile, indexGetType, indexGetUnit,
  indexIsValid, isOutOfMap, orientation16, orientation8, packTile, random256, s16, s8, structureFind, teamFind, tile, tileCenter,
  tileGetDirection, tileGetDistance, tileGetDistanceRoundedUp, tileIsValid, tileMoveByDirection, tileMoveByOrientation,
  tileMoveByRandom, u16, u8, unitAllocate, unitFind, unitFree, unpackTile, type Structure, type Team, type Tile32, type Unit,
} from "./core.ts";
import { MAP_INFOS, humanHouses, humanMask, isHuman, isLocal } from "./core.ts";
import { houseAlliedToHuman, houseAreAllied } from "./house.ts";
import {refineryDock} from './refinery-dock.ts';
import {tickCarryallFlight,carryallMovementScale,carryallDestination} from './carryall-flight.ts';
import {tickDrone,tickLaser,tickDroneGrenades} from './advanced-units.ts';
import {COMBAT_SFX} from '../sound/combat-sfx.ts';
import {blockingWall} from './combat-obstacles.ts';
import { netAIPeace } from "./net-ai.ts";
import {
  mapBloomExplodeSpice, mapDeviateArea, mapFillCircleWithSpice, mapFindLocationTile, mapGetLandscapeType, mapIsPositionInViewport,
  mapIsPositionUnveiled, mapIsUnveiledByAnyHuman, mapIsUnveiledFor, mapIsValidPosition, mapMakeExplosion, mapSearchSpice, mapUnveilTile, mapUpdateAround, tileRemoveFogInRadius,
} from "./map.ts";
import { objectGetByPackedTile, objectScriptVariable4Clear, objectScriptVariable4Link, objectScriptVariable4Set } from "./object.ts";
import { scriptIsLoaded, scriptLoad, scriptLoadAsSubroutine, scriptReset, scriptRun, SCRIPT_UNIT_OPCODES_PER_TICK } from "./script.ts";
import { msg } from "./strings.ts";
import {
  structureDamage, structureFree, structureGetByPackedTile, structureGetStructuresBuilt, structureHouseUnderAttack,
  structureSetState, structureUpdateMap,
} from "./structure.ts";
import { actionInfo, houseInfo, landscapeInfo, layoutTileDiff, structureInfo, unitInfo } from "./tables.ts";
import { teamGetByIndex } from "./team.ts";
import { houseCalculatePowerAndCredit } from "./house.ts";

/** g_functions из map.c: [0] — воздушные, [1] — наземные, [2] — взрывы; индекс — тип обновления */
const FUNCTIONS = [
  [0, 1, 0],
  [2, 3, 0],
  [0, 1, 0],
];

const ticks = { movement: 0, rotation: 0, blinking: 0, unknown4: 0, script: 0, unknown5: 0, deviation: 0 };

export function unitResetTimers(): void {
  for (const k of Object.keys(ticks) as (keyof typeof ticks)[]) ticks[k] = 0;
}

export function unitGetHouseID(u: Unit): number {
  if (u.deviated !== 0) return HOUSE.ORDOS;
  return u.o.houseID;
}

function unitRotate(unit: Unit, level: number): void {
  const o = unit.orientation[level];
  if (o.speed === 0) return;
  const target = o.target;
  const current = o.current;
  let diff = target - current;
  if (diff > 128) diff -= 256;
  if (diff < -128) diff += 256;
  diff = Math.abs(diff);
  let newCurrent = s8(current + o.speed);
  if (Math.abs(o.speed) >= diff) {
    o.speed = 0;
    newCurrent = target;
  }
  o.current = newCurrent;
  if (orientation16(newCurrent) === orientation16(current) && orientation8(newCurrent) === orientation8(current)) return;
  unitSpriteUpdate(unit);
  unitUpdateMap(2, unit);
}

/** Обновление спрайта юнита MD ($012210): пока стоит recoil, кадр башни танка не меняется — держится отдача. */
export function unitSpriteUpdate(unit: Unit): void {
  if (!unit.recoil) unit.recoilShown = false;
}

function unitMovementTick(unit: Unit): void {
  if (unit.speed === 0) return;
  let speed = unit.speedRemainder;
  if (unitInfo[unit.o.type].movementType !== MOVEMENT.WINGER) speed += adjustToGameSpeed(unit.speedPerTick, 1, 255, false);
  else speed += unit.speedPerTick;
  if ((speed & 0xff00) !== 0) {
    unitMove(unit, Math.min(unit.speed * 16, tileGetDistance(unit.o.position, unit.currentDestination) + 16)*carryallMovementScale(unit));
  }
  unit.speedRemainder = speed & 0xff;
}

function unitPatrolTick(unit: Unit): void {
  const ui = unitInfo[unit.o.type];
  if (!ui.o.actionsPlayer.includes(ACTION.ATTACK) || !ui.o.actionsPlayer.includes(ACTION.MOVE)) {
    unit.patrolActive = false;
    return;
  }

  if (unit.patrolEngaging) {
    const target = indexGetUnit(unit.targetAttack);
    if (target?.o.flags.allocated && !target.o.flags.isNotOnMap && !houseAreAllied(unitGetHouseID(unit), unitGetHouseID(target))) {
      if (unit.actionID !== ACTION.ATTACK && unit.currentDestination.x === 0 && unit.currentDestination.y === 0) unitSetAction(unit, ACTION.ATTACK);
      return;
    }

    unit.patrolEngaging = false;
    unit.targetAttack = 0;
    unit.targetMove = 0;
    unit.route[0] = 0xff;
    unit.currentDestination = { x: 0, y: 0 };
    unitSetSpeed(unit, 0);
    unitSetAction(unit, ACTION.MOVE);
    const resume = unit.patrolToEnd ? unit.patrolEnd : unit.patrolStart;
    unitSetDestination(unit, indexEncode(packTile(resume), IT.TILE));
  }

  if (!unit.patrolEngaging) {
    let nearest: Unit | null = null;
    let nearestDistance = 5 * 256;
    for (const enemy of G.units) {
      if (!enemy.o.flags.allocated || enemy.o.flags.isNotOnMap || enemy === unit) continue;
      if (houseAreAllied(unitGetHouseID(unit), unitGetHouseID(enemy))) continue;
      if ((enemy.o.seenByHouses & (1 << (G.net ? unitGetHouseID(unit) : G.playerHouseID))) === 0) continue;
      const distance = tileGetDistance(unit.o.position, enemy.o.position);
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }
    if (nearest) {
      unit.targetAttack = 0;
      unit.targetMove = 0;
      unit.route[0] = 0xff;
      unit.currentDestination = { x: 0, y: 0 };
      unitSetSpeed(unit, 0);
      unitSetAction(unit, ACTION.ATTACK);
      unitSetTarget(unit, indexEncode(nearest.o.index, IT.UNIT));
      unit.patrolEngaging = true;
      return;
    }
  }

  if (unit.targetMove === 0 && unit.speed === 0 && unit.currentDestination.x === 0 && unit.currentDestination.y === 0) {
    unit.patrolToEnd = !unit.patrolToEnd;
    const destination = unit.patrolToEnd ? unit.patrolEnd : unit.patrolStart;
    if (unit.actionID !== ACTION.MOVE) unitSetAction(unit, ACTION.MOVE);
    unitSetDestination(unit, indexEncode(packTile(destination), IT.TILE));
  }
}

export function gameLoopUnit(): void {
  tickDroneGrenades();
  let tickMovement = false;
  let tickRotation = false;
  let tickBlinking = false;
  let tickUnknown4 = false;
  let tickScript = false;
  let tickUnknown5 = false;
  let tickDeviation = false;
  const now = G.timerGame;
  if (ticks.movement <= now) {
    tickMovement = true;
    ticks.movement = now + 3;
  }
  if (ticks.rotation <= now) {
    tickRotation = true;
    // MD ($0437C8): каждые 2 кадра, у PC — adjustToGameSpeed(4, 2, 8)
    ticks.rotation = now + 2;
  }
  if (ticks.blinking <= now) {
    tickBlinking = true;
    ticks.blinking = now + 3;
  }
  if (ticks.unknown4 <= now) {
    tickUnknown4 = true;
    ticks.unknown4 = now + 20;
  }
  if (ticks.script <= now) {
    tickScript = true;
    ticks.script = now + 5;
  }
  if (ticks.unknown5 <= now) {
    tickUnknown5 = true;
    ticks.unknown5 = now + 5;
  }
  if (ticks.deviation <= now) {
    tickDeviation = true;
    ticks.deviation = now + 60;
  }

  const find = findAll();
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    const ui = unitInfo[u.o.type];
    G.scriptCurrentObject = u.o;
    G.scriptCurrentStructure = null;
    G.scriptCurrentUnit = u;
    G.scriptCurrentTeam = null;
    if (u.o.flags.isNotOnMap) continue;
    // Стена на линии огня — препятствие: выстрел упирается в неё и разрушает её, цель юнита при этом не меняется
    // (решение владельца). Перенацеливание на стену (unitPrioritizeBlockingWall) больше не вызывается.
    tickCarryallFlight(u);
    if(tickDrone(u))continue;
    tickLaser(u);
    if(u.harvesterDefense&&tickScript)unitHarvesterDefenseTick(u);

    if (tickUnknown4 && u.targetAttack !== 0 && ui.o.flags.hasTurret) {
      unitSetOrientation(u, tileGetDirection(u.o.position, indexGetTile(u.targetAttack)), false, 1);
      // $0439BA: перерисовка (отдача ещё держится), затем сброс бита отдачи
      unitSpriteUpdate(u);
      u.recoil = false;
    }
    if (tickMovement) {
      unitMovementTick(u);
      if (u.fireDelay !== 0) {
        if (ui.movementType === MOVEMENT.WINGER && !ui.flags.isNormalUnit) {
          let t = u.currentDestination;
          const tu = indexGetUnit(u.targetAttack);
          if (tu && unitInfo[tu.o.type].movementType === MOVEMENT.WINGER) t = indexGetTile(u.targetAttack);
          unitSetOrientation(u, tileGetDirection(u.o.position, t), false, 0);
        }
        u.fireDelay--;
      }
    }
    if (tickRotation) {
      unitRotate(u, 0);
      if (ui.o.flags.hasTurret) unitRotate(u, 1);
      // $043A9C: так же, как выше
      unitSpriteUpdate(u);
      u.recoil = false;
    }
    if (tickBlinking && u.blinkCounter !== 0) {
      u.blinkCounter--;
      u.o.flags.isHighlighted = u.blinkCounter % 2 !== 0;
      unitUpdateMap(2, u);
    }
    if (tickDeviation) unitDeviationDecrease(u, 1);
    if (ui.movementType !== MOVEMENT.WINGER && objectGetByPackedTile(packTile(u.o.position)) === null) unitUpdateMap(1, u);

    if (tickUnknown5) {
      if (u.timer === 0) {
        if ((ui.movementType === MOVEMENT.FOOT && u.speed !== 0) || u.o.flags.isSmoking) {
          if (u.spriteOffset >= 0) {
            u.spriteOffset &= 0x3f;
            u.spriteOffset++;
            unitUpdateMap(2, u);
            u.timer = idiv(ui.animationSpeed, 5);
            if (u.o.flags.isSmoking) {
              u.timer = 3;
              if (u.spriteOffset > 32) {
                u.o.flags.isSmoking = false;
                u.spriteOffset = 0;
              }
            }
          }
        }
        if (u.o.type === UNIT.ORNITHOPTER && u.o.flags.allocated && u.spriteOffset >= 0) {
          u.spriteOffset &= 0x3f;
          u.spriteOffset++;
          unitUpdateMap(2, u);
          u.timer = 1;
        }
        if (u.o.type === UNIT.HARVESTER) {
          if (u.actionID === ACTION.HARVEST || u.o.flags.isSmoking) {
            u.spriteOffset &= 0x3f;
            u.spriteOffset++;
            unitUpdateMap(2, u);
            u.timer = 4;
          } else if (u.spriteOffset !== 0) {
            unitUpdateMap(2, u);
            u.spriteOffset = 0;
          }
        }
      } else {
        u.timer--;
      }
    }

    // ремейк: перевозчик, сбросивший харвестер без заводов очистки, больше не слушает скрипт и улетает с карты
    if (u.carryallLeaving) {
      unitCarryallLeaveTick(u);
      continue;
    }

    if (tickScript) {
      if (u.patrolActive) unitPatrolTick(u);
      if (u.o.script.delay === 0) {
        if (scriptIsLoaded(u.o.script)) {
          let opcodesLeft = SCRIPT_UNIT_OPCODES_PER_TICK + 2;
          // в сети скорость скриптов не зависит от экрана игрока — иначе симуляции разойдутся
          if (!G.net && !ui.o.flags.scriptNoSlowdown && !mapIsPositionInViewport(u.o.position)) opcodesLeft = 3;
          u.o.script.variables[3] = scriptPlayerHouse(u);
          for (; opcodesLeft > 0 && u.o.script.delay === 0; opcodesLeft--) {
            if (!scriptRun(u.o.script)) break;
          }
        }
      } else {
        u.o.script.delay--;
      }
    }

    if (u.nextActionID === ACTION.INVALID) continue;
    if (u.currentDestination.x !== 0 || u.currentDestination.y !== 0) continue;
    unitSetAction(u, u.nextActionID);
    u.nextActionID = ACTION.INVALID;
  }
}

/**
 * Приказ новой машины компьютера: из ROM (actionAI, у боевых — HUNT). В сети в «мирное время» (engine/net-ai.ts)
 * охота и диверсия заменяются охраной базы (AREA_GUARD), чтобы компьютер не нападал с первых минут.
 */
function unitAIAction(type: number, houseID: number): number {
  const a = unitInfo[type].actionAI;
  return (a === ACTION.HUNT || a === ACTION.SABOTAGE) && netAIPeace(houseID) ? ACTION.AREA_GUARD : a;
}

export function unitCreate(index: number, typeID: number, houseID: number, position: Tile32, orientation: number): Unit | null {
  if (houseID >= 6) return null;
  if (typeID >= UNIT.MAX) return null;
  const ui = unitInfo[typeID];
  const u = unitAllocate(index, typeID, houseID);
  if (!u) return null;
  u.o.houseID = houseID;
  u.carryallFlight=undefined;
  u.carryallLeaving=undefined;
  unitSetOrientation(u, orientation, true, 0);
  unitSetOrientation(u, orientation, true, 1);
  unitSetSpeed(u, 0);
  u.o.position = { ...position };
  u.o.hitpoints = ui.o.hitpoints;
  u.currentDestination = { x: 0, y: 0 };
  u.originEncoded = 0;
  u.route[0] = 0xff;
  if (position.x !== 0xffff || position.y !== 0xffff) {
    u.originEncoded = unitFindClosestRefinery(u);
    u.targetLast = { ...position };
    u.targetPreLast = { ...position };
  }
  u.o.linkedID = 0xff;
  u.o.script.delay = 0;
  u.actionID = ACTION.GUARD;
  u.nextActionID = ACTION.INVALID;
  u.fireDelay = 0;
  u.distanceToDestination = 0x7fff;
  u.targetMove = 0;
  u.amount = 0;
  u.harvesterDefense=undefined;
  u.laser=undefined;u.drone=undefined;
  u.wobbleIndex = 0;
  u.spriteOffset = 0;
  u.blinkCounter = 0;
  u.timer = 0;
  scriptReset(u.o.script, G.scriptUnit);
  u.o.flags.allocated = true;
  if (ui.movementType === MOVEMENT.TRACKED) {
    if (random256() < houseInfo[houseID].degradingChance) u.o.flags.degrades = true;
  }
  if (ui.movementType === MOVEMENT.WINGER) {
    unitSetSpeed(u, 255);
  } else if ((position.x !== 0xffff || position.y !== 0xffff) && unitIsTileOccupied(u)) {
    unitFree(u);
    return null;
  }
  if (position.x === 0xffff && position.y === 0xffff) {
    u.o.flags.isNotOnMap = true;
    return u;
  }
  unitUpdateMap(1, u);
  unitSetAction(u, isHuman(houseID) ? ui.o.actionsPlayer[3] : unitAIAction(u.o.type, houseID));
  return u;
}

export function unitIsTypeOnMap(houseID: number, typeID: number): boolean {
  for (const u of G.unitFind) {
    if (houseID !== HOUSE_INVALID && unitGetHouseID(u) !== houseID) continue;
    if (typeID !== UNIT.INVALID && u.o.type !== typeID) continue;
    if (G.validateStrictIfZero === 0 && u.o.flags.isNotOnMap) continue;
    return true;
  }
  return false;
}

/** React only to actual nearby enemy foot fire, never override return/retreat/manual movement. */
export function unitHarvesterDefend(u:Unit,attacker:Unit):boolean{
  if(u.o.type!==UNIT.HARVESTER||!u.o.flags.allocated||u.o.hitpoints===0||u.o.flags.isNotOnMap||
    !attacker.o.flags.allocated||attacker.o.hitpoints===0||attacker.o.flags.isNotOnMap||
    unitInfo[attacker.o.type].movementType!==MOVEMENT.FOOT||houseAreAllied(unitGetHouseID(u),unitGetHouseID(attacker))||
    tileGetDistance(u.o.position,attacker.o.position)>4*256)return false;
  if(u.harvesterDefense)return true;
  if(u.actionID!==ACTION.HARVEST&&u.actionID!==ACTION.GUARD&&u.actionID!==ACTION.STOP)return false;
  let spice={...u.targetLast};
  if(indexGetType(u.targetMove)===IT.TILE)spice=indexGetTile(u.targetMove);
  const kind=mapGetLandscapeType(packTile(spice));
  if(kind!==LST.SPICE&&kind!==LST.THICK_SPICE)spice={...u.o.position};
  const target=indexEncode(attacker.o.index,IT.UNIT);
  const defense={target,spice:{...spice},start:{...u.o.position},expires:G.timerGame+960};
  objectScriptVariable4Clear(u.o);u.targetAttack=0;u.targetMove=0;
  unitSetAction(u,ACTION.MOVE);unitSetDestination(u,target);u.harvesterDefense=defense;
  return true;
}

function unitHarvesterDefenseTick(u:Unit):void{
  const defense=u.harvesterDefense!;
  if(u.actionID===ACTION.DIE||u.actionID===ACTION.RETURN||u.actionID===ACTION.RETREAT){u.harvesterDefense=undefined;return;}
  const attacker=indexGetUnit(defense.target);
  if(attacker?.o.flags.allocated&&attacker.o.hitpoints>0&&attacker.actionID!==ACTION.DIE&&!attacker.o.flags.isNotOnMap&&
    !houseAreAllied(unitGetHouseID(u),unitGetHouseID(attacker))&&unitInfo[attacker.o.type].movementType===MOVEMENT.FOOT&&
    G.timerGame<defense.expires&&tileGetDistance(attacker.o.position,defense.start)<=4*256){
    if(u.actionID!==ACTION.MOVE)unitSetAction(u,ACTION.MOVE);
    if(u.targetMove!==defense.target)unitSetDestination(u,defense.target);
    return;
  }
  u.harvesterDefense=undefined;u.targetAttack=0;u.targetMove=0;u.route[0]=255;
  const oldField=packTile(defense.spice),kind=mapGetLandscapeType(oldField);
  const field=kind===LST.SPICE||kind===LST.THICK_SPICE?oldField:mapSearchSpice(packTile(u.o.position),64);
  unitSetAction(u,ACTION.HARVEST);
  if(field){u.targetLast=tileCenter(unpackTile(field));unitSetDestination(u,indexEncode(field,IT.TILE));}
}

export function unitSetAction(u: Unit | null, action: number): void {
  if (!u) return;
  action &= 0xff; // ActionType в оригинале — байт: 0xFFFF из таблиц становится ACTION_INVALID
  if (u.actionID === ACTION.DESTRUCT || u.actionID === ACTION.DIE || action === ACTION.INVALID) return;
  const ai = actionInfo[action];
  if (!ai) return;
  if (ai.switchType === 0 && (u.currentDestination.x !== 0 || u.currentDestination.y !== 0)) {
    u.nextActionID = action;
    return;
  }
  switch (ai.switchType) {
    case 0:
    case 1:
      u.actionID = action;
      u.nextActionID = ACTION.INVALID;
      u.currentDestination = { x: 0, y: 0 };
      u.o.script.delay = 0;
      scriptReset(u.o.script, G.scriptUnit);
      u.o.script.variables[0] = action;
      scriptLoad(u.o.script, u.o.type);
      return;
    case 2:
      u.o.script.variables[0] = action;
      scriptLoadAsSubroutine(u.o.script, u.o.type);
      return;
    default:
      return;
  }
}

export function unitAddToTeam(u: Unit | null, t: Team | null): number {
  if (!t || !u) return 0;
  u.team = t.index + 1;
  t.members++;
  return u16(t.maxMembers - t.members);
}

export function unitRemoveFromTeam(u: Unit | null): number {
  if (!u || u.team === 0) return 0;
  const t = teamGetByIndex(u.team - 1);
  t.members--;
  u.team = 0;
  return u16(t.maxMembers - t.members);
}

export function unitGetTeam(u: Unit | null): Team | null {
  if (!u || u.team === 0) return null;
  return teamGetByIndex(u.team - 1);
}

/** Unit_Sort: порядок отрисовки (снизу вверх) и счёт видимых юнитов игрока. */
export function unitSort(): void {
  const humans = humanHouses();
  for (const hid of humans) {
    G.houses[hid].unitCountEnemy = 0;
    G.houses[hid].unitCountAllied = 0;
  }
  const arr = G.unitFind;
  for (let i = 0; i < arr.length - 1; i++) {
    const u1 = arr[i];
    const u2 = arr[i + 1];
    let y1 = u1.o.position.y;
    let y2 = u2.o.position.y;
    if (unitInfo[u1.o.type].movementType === MOVEMENT.FOOT) y1 = u16(y1 - 0x100);
    if (unitInfo[u2.o.type].movementType === MOVEMENT.FOOT) y2 = u16(y2 - 0x100);
    if (s16(y1) > s16(y2)) {
      arr[i] = u2;
      arr[i + 1] = u1;
    }
  }
  for (const u of arr) {
    if (u.o.flags.isNotOnMap) continue;
    for (const hid of humans) {
      if ((u.o.seenByHouses & (1 << hid)) === 0) continue;
      if (houseAreAllied(u.o.houseID, hid)) G.houses[hid].unitCountAllied++;
      else G.houses[hid].unitCountEnemy++;
    }
  }
}

export function unitGetByPackedTile(packed: number): Unit | null {
  if (isOutOfMap(packed)) return null;
  const t = G.map[packed];
  if (!t.hasUnit) return null;
  return G.units[t.index - 1] ?? null;
}

export function unitIsValidMovementIntoStructure(unit: Unit | null, s: Structure | null): number {
  if (!unit || !s) return 0;
  const si = structureInfo[s.o.type];
  const ui = unitInfo[unit.o.type];
  const unitEnc = indexEncode(unit.o.index, IT.UNIT);
  const structEnc = indexEncode(s.o.index, IT.STRUCTURE);
  if (unitGetHouseID(unit) !== s.o.houseID) {
    if (unit.o.type === UNIT.SABOTEUR && unit.targetMove === structEnc) return 2;
    if (ui.movementType === MOVEMENT.FOOT && si.o.flags.conquerable) return unit.targetMove === structEnc ? 2 : 1;
    return 0;
  }
  if ((si.enterFilter & (1 << unit.o.type)) === 0) return 0;
  if (s.o.script.variables[4] === unitEnc) return 2;
  return s.o.linkedID === 0xff ? 1 : 0;
}

export function unitSetDestination(u: Unit | null, destination: number): void {
  if (!u) return;
  if (!indexIsValid(destination)) return;
  if (u.targetMove === destination) return;
  if (indexGetType(destination) === IT.TILE) {
    const packed = indexDecode(destination);
    const u2 = unitGetByPackedTile(packed);
    if (u2) {
      if (u !== u2) destination = indexEncode(u2.o.index, IT.UNIT);
    } else {
      const s = structureGetByPackedTile(packed);
      if (s) destination = indexEncode(s.o.index, IT.STRUCTURE);
    }
  }
  const s = indexGetStructure(destination);
  if (s && s.o.houseID === unitGetHouseID(u)) {
    if (unitIsValidMovementIntoStructure(u, s) === 1 || unitInfo[u.o.type].movementType === MOVEMENT.WINGER) {
      objectScriptVariable4Link(indexEncode(u.o.index, IT.UNIT), destination);
    }
  }
  u.targetMove = destination;
  u.route[0] = 0xff;
}

export function unitDestinationTile(u:Unit,encoded:number):Tile32 {
  if(u.o.type===UNIT.CARRYALL)return carryallDestination(encoded);
  const s=indexGetStructure(encoded);
  return u.o.type===UNIT.HARVESTER&&s?.o.type===STRUCTURE.REFINERY&&s.o.houseID===unitGetHouseID(u)
    ?refineryDock(s.o.position):indexGetTile(encoded);
}

export function unitGetTargetUnitPriority(unit: Unit | null, target: Unit | null): number {
  if (!unit || !target) return 0;
  if (unit === target) return 0;
  if (!target.o.flags.allocated) return 0;
  if ((target.o.seenByHouses & (1 << unitGetHouseID(unit))) === 0 && !aiKnowsAll(unit)) return 0;
  if (houseAreAllied(unitGetHouseID(unit), unitGetHouseID(target))) return 0;
  const ui = unitInfo[unit.o.type];
  const ti = unitInfo[target.o.type];
  if (!ti.o.flags.priority) return 0;
  if (ti.movementType === MOVEMENT.WINGER) {
    if (!ui.o.flags.targetAir) return 0;
    if (isHuman(target.o.houseID) && !mapIsUnveiledFor(packTile(target.o.position), target.o.houseID)) return 0;
  }
  if (!mapIsValidPosition(packTile(target.o.position))) return 0;
  const distance = tileGetDistanceRoundedUp(unit.o.position, target.o.position);
  if (!mapIsValidPosition(packTile(unit.o.position))) {
    if (ti.fireDistance >= distance) return 0;
  }
  let priority = u16(ti.o.priorityTarget + ti.o.priorityBuild);
  if (distance !== 0) priority = idiv(priority, distance) + 1;
  if (priority > 0x7d00) return 0x7d00;
  return priority;
}

export function unitFindClosestRefinery(unit: Unit): number {
  const res = unit.originEncoded === 0 ? 0 : 1;
  if (unit.o.type !== UNIT.HARVESTER) {
    unit.originEncoded = indexEncode(packTile(unit.o.position), IT.TILE);
    return res;
  }
  let s: Structure | null = null;
  let mind = 0;
  let find = findAll(unitGetHouseID(unit), STRUCTURE.REFINERY);
  for (;;) {
    const s2 = structureFind(find);
    if (!s2) break;
    if (s2.state !== 1) continue;
    const d = tileGetDistance(unit.o.position, s2.o.position);
    if (mind !== 0 && d >= mind) continue;
    mind = d;
    s = s2;
  }
  if (!s) {
    find = findAll(unitGetHouseID(unit), STRUCTURE.REFINERY);
    for (;;) {
      const s2 = structureFind(find);
      if (!s2) break;
      const d = tileGetDistance(unit.o.position, s2.o.position);
      if (mind !== 0 && d >= mind) continue;
      mind = d;
      s = s2;
    }
  }
  if (s) unit.originEncoded = indexEncode(s.o.index, IT.STRUCTURE);
  return res;
}

export function unitSetPosition(u: Unit | null, position: Tile32): boolean {
  if (!u) return false;
  const ui = unitInfo[u.o.type];
  u.o.flags.isNotOnMap = false;
  u.o.position = tileCenter(position);
  if (u.originEncoded === 0) unitFindClosestRefinery(u);
  u.o.script.variables[4] = 0;
  if (unitIsTileOccupied(u)) {
    u.o.flags.isNotOnMap = true;
    return false;
  }
  u.currentDestination = { x: 0, y: 0 };
  u.targetMove = 0;
  u.targetAttack = 0;
  if (G.net) {
    // туман по домам: юнит замечают те люди, у кого раскрыта клетка
    const packed = packTile(u.o.position);
    u.o.seenByHouses &= ~(1 << u.o.houseID);
    for (const hid of humanHouses()) if (mapIsUnveiledFor(packed, hid)) unitHouseUnitCountAdd(u, hid);
  } else if (G.map[packTile(u.o.position)].isUnveiled) {
    u.o.seenByHouses &= ~(1 << u.o.houseID);
    for (const hid of humanHouses()) unitHouseUnitCountAdd(u, hid);
  }
  if (!isHuman(u.o.houseID) || u.o.type === UNIT.HARVESTER || u.o.type === UNIT.SABOTEUR) unitSetAction(u, isHuman(u.o.houseID) ? ui.actionAI : unitAIAction(u.o.type, u.o.houseID));
  else unitSetAction(u, ui.o.actionsPlayer[3]);
  u.spriteOffset = 0;
  unitUpdateMap(1, u);
  return true;
}

export function unitRemove(u: Unit | null): void {
  if (!u) return;
  u.o.flags.allocated = true;
  unitUntargetMe(u);
  if (u === G.unitSelected) unitSelect(null);
  u.o.flags.bulletIsBig = true;
  unitUpdateMap(0, u);
  unitHouseUnitCountRemove(u);
  scriptReset(u.o.script, G.scriptUnit);
  unitFree(u);
}

export function unitFindBestTargetUnit(u: Unit | null, mode: number): Unit | null {
  if (!u) return null;
  let position = u.o.position;
  if (u.originEncoded === 0) u.originEncoded = indexEncode(packTile(position), IT.TILE);
  else position = indexGetTile(u.originEncoded);
  let distance = u16(unitInfo[u.o.type].fireDistance << 8);
  if (mode === 2) distance = u16(distance << 1);
  let best: Unit | null = null;
  let bestPriority = 0;
  const find = findAll();
  for (;;) {
    const target = unitFind(find, unitGetHouseID);
    if (!target) break;
    if (mode !== 0 && mode !== 4) {
      if (mode === 1 && tileGetDistance(u.o.position, target.o.position) > distance) continue;
      if (mode === 2 && tileGetDistance(position, target.o.position) > distance) continue;
    }
    const priority = unitGetTargetUnitPriority(u, target);
    if (s16(priority) > s16(bestPriority)) {
      best = target;
      bestPriority = priority;
    }
  }
  if (bestPriority === 0) return null;
  return best;
}

function unitSandwormGetTargetPriority(unit: Unit | null, target: Unit | null): number {
  if (!unit || !target) return 0;
  if (!mapIsUnveiledByAnyHuman(packTile(target.o.position))) return 0;
  if (!landscapeInfo[mapGetLandscapeType(packTile(target.o.position))].isSand) return 0;
  let res: number;
  switch (unitInfo[target.o.type].movementType) {
    case MOVEMENT.FOOT: res = 0x64; break;
    case MOVEMENT.TRACKED: res = 0x3e8; break;
    case MOVEMENT.HARVESTER: res = 0x3e8; break;
    case MOVEMENT.WHEELED: res = 0x1388; break;
    default: res = 0; break;
  }
  if (target.speed !== 0 || target.fireDelay !== 0) res = u16(res * 4);
  const distance = tileGetDistanceRoundedUp(unit.o.position, target.o.position);
  if (distance !== 0 && res !== 0) res = idiv(res, distance);
  if (distance < 2) res = u16(res * 2);
  return res;
}

export function unitSandwormFindBestTarget(unit: Unit | null): Unit | null {
  if (!unit) return null;
  let best: Unit | null = null;
  let bestPriority = 0;
  const find = findAll();
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    const priority = unitSandwormGetTargetPriority(unit, u);
    if (priority >= bestPriority) {
      best = u;
      bestPriority = priority;
    }
  }
  if (bestPriority === 0) return null;
  return best;
}

export function unitStartMovement(unit: Unit | null): boolean {
  if (!unit) return false;
  const ui = unitInfo[unit.o.type];
  const orientation = s8((unit.orientation[0].current + 16) & 0xe0);
  unitSetOrientation(unit, orientation, true, 0);
  unitSetOrientation(unit, orientation, false, 1);
  const position = tileMoveByOrientation(unit.o.position, orientation);
  const packed = packTile(position);
  unit.distanceToDestination = 0x7fff;
  const score = unitGetTileEnterScore(unit, packed, idiv(orientation, 32));
  if (score > 255 || score === -1) return false;
  let type = mapGetLandscapeType(packed);
  if (type === LST.STRUCTURE) type = LST.CONCRETE_SLAB;
  let speed = landscapeInfo[type].movementSpeed[ui.movementType];
  if (unit.o.type === UNIT.SABOTEUR && type === LST.WALL) speed = 255;
  unit.o.flags.isSmoking = false;
  if (landscapeInfo[type].letUnitWobble) unit.o.flags.isWobbling = true;
  if (idiv(ui.o.hitpoints, 2) > unit.o.hitpoints && ui.movementType !== MOVEMENT.WINGER) speed -= idiv(speed, 4);
  unitSetSpeed(unit, speed);
  if (ui.movementType !== MOVEMENT.SLITHER) {
    const positionOld = unit.o.position;
    unit.o.position = position;
    unitUpdateMap(1, unit);
    unit.o.position = positionOld;
  }
  unit.currentDestination = position;
  unitDeviationDecrease(unit, 10);
  return true;
}

/** Не вызывается: стены разрушаются естественно, как препятствие (см. gameLoopUnit). Оставлено для истории. */
export function unitPrioritizeBlockingWall(unit:Unit):void {
  if(!unitInfo[unit.o.type].o.actionsPlayer.includes(ACTION.ATTACK)||unit.o.type===UNIT.SANDWORM)return;
  let saved=unit.blockedAttack;
  if(saved&&unit.targetAttack!==indexEncode(saved.wall,IT.TILE)){unit.blockedAttack=undefined;saved=undefined;}
  const target=saved?.target??unit.targetAttack;
  if(!target||!indexIsValid(target)){
    if(saved){unit.blockedAttack=undefined;unit.targetAttack=0;}
    return;
  }
  const wall=blockingWall(unit,target);
  if(wall===null){
    if(saved){unit.blockedAttack=undefined;unitSetTarget(unit,target);}
    return;
  }
  if(houseAreAllied(unitGetHouseID(unit),G.map[wall].houseID)){
    if(saved){unit.blockedAttack=undefined;unitSetTarget(unit,target);}
    return;
  }
  if(target===indexEncode(wall,IT.TILE))return;
  unit.blockedAttack={target,wall};
  unitSetTarget(unit,indexEncode(wall,IT.TILE));
}

export function unitSetTarget(unit: Unit | null, encoded: number): void {
  if (!unit || !indexIsValid(encoded)) return;
  if (unit.targetAttack === encoded) return;
  if (indexGetType(encoded) === IT.TILE) {
    const packed = indexDecode(encoded);
    const u = unitGetByPackedTile(packed);
    if (u) encoded = indexEncode(u.o.index, IT.UNIT);
    else {
      const s = structureGetByPackedTile(packed);
      if (s) encoded = indexEncode(s.o.index, IT.STRUCTURE);
    }
  }
  if (indexEncode(unit.o.index, IT.UNIT) === encoded) encoded = indexEncode(packTile(unit.o.position), IT.TILE);
  unit.targetAttack = encoded;
  if (!unitInfo[unit.o.type].o.flags.hasTurret) {
    unit.targetMove = encoded;
    unit.route[0] = 0xff;
  }
}

export function unitDeviationDecrease(unit: Unit | null, amount: number): boolean {
  if (!unit || unit.deviated === 0) return false;
  const ui = unitInfo[unit.o.type];
  if (!ui.flags.isNormalUnit) return false;
  if (amount === 0) amount = houseInfo[unit.o.houseID].toughness;
  if (unit.deviated > amount) {
    unit.deviated -= amount;
    return false;
  }
  unit.deviated = 0;
  unit.o.flags.bulletIsBig = true;
  unitUpdateMap(2, unit);
  unit.o.flags.bulletIsBig = false;
  if (isHuman(unit.o.houseID)) unitSetAction(unit, ui.o.actionsPlayer[3]);
  else unitSetAction(unit, ui.actionAI);
  unitUntargetMe(unit);
  unit.targetAttack = 0;
  unit.targetMove = 0;
  return true;
}

export function unitRemoveFog(unit: Unit | null): void {
  if (!unit) return;
  if (unit.o.flags.isNotOnMap) return;
  const p = unit.o.position;
  if ((p.x === 0xffff && p.y === 0xffff) || (p.x === 0 && p.y === 0)) return;
  if (!G.net && !houseAlliedToHuman(unitGetHouseID(unit))) return;
  const r = unitInfo[unit.o.type].o.fogUncoverRadius;
  if (r === 0) return;
  tileRemoveFogInRadius(unit.o.position, r, G.net ? unitGetHouseID(unit) : G.playerHouseID);
}

export function unitDeviate(unit: Unit | null, probability: number, houseID: number): boolean {
  if (!unit) return false;
  const ui = unitInfo[unit.o.type];
  if (!ui.flags.isNormalUnit) return false;
  if (unit.deviated !== 0) return false;
  if (ui.flags.isNotDeviatable) return false;
  if (probability === 0) probability = houseInfo[unit.o.houseID].toughness;
  if (!isHuman(unit.o.houseID)) probability -= idiv(probability, 8);
  if (random256() >= probability) return false;
  unit.deviated = 120;
  unit.deviatedHouse = houseID;
  unitUpdateMap(2, unit);
  if (isHuman(unit.deviatedHouse)) unitSetAction(unit, ui.o.actionsPlayer[3]);
  else unitSetAction(unit, ui.actionAI);
  unitUntargetMe(unit);
  unit.targetAttack = 0;
  unit.targetMove = 0;
  return true;
}

const HOUSE_MISSILE_X = [0, 0, 200, 256, 200, 0, -200, -256, -200, 0, 400, 512, 400, 0, -400, -512, -400];
const HOUSE_MISSILE_Y = [0, -256, -200, 0, 200, 256, 200, 0, -200, -512, -400, 0, 400, 512, 400, 0, -400];

export function unitMove(unit: Unit | null, distance: number): boolean {
  if (!unit || !unit.o.flags.used) return false;
  const ui = unitInfo[unit.o.type];
  let newPosition = tileMoveByDirection(unit.o.position, unit.orientation[0].current, distance);
  if (newPosition.x === unit.o.position.x && newPosition.y === unit.o.position.y) return false;
  if (!tileIsValid(newPosition)) {
    if (!ui.flags.mustStayInMap) {
      unitRemove(unit);
      return true;
    }
    if (unit.o.flags.byScenario && unit.o.linkedID === 0xff && unit.o.script.variables[4] === 0) {
      unitRemove(unit);
      return true;
    }
    newPosition = { ...unit.o.position };
    unitSetOrientation(unit, unit.orientation[0].current + (random256() & 0xf), false, 0);
  }
  unit.wobbleIndex = 0;
  if (ui.flags.canWobble && unit.o.flags.isWobbling) unit.wobbleIndex = random256() & 7;

  const d = tileGetDistance(newPosition, unit.currentDestination);
  const packed = packTile(newPosition);
  if (ui.flags.isTracked && d < 48) {
    const u = unitGetByPackedTile(packed);
    if (u && unitInfo[u.o.type].movementType === MOVEMENT.FOOT && u.o.flags.allocated) {
      if (u === G.unitSelected) unitSelect(null);
      unitUntargetMe(u);
      u.o.script.variables[1] = 1;
      unitSetAction(u, ACTION.DIE);
    }
  }

  unitUpdateMap(0, unit);
  if (ui.movementType === MOVEMENT.WINGER) unit.o.flags.animationFlip = !unit.o.flags.animationFlip;

  const currentDestination = unit.currentDestination;
  distance = tileGetDistance(newPosition, currentDestination);
  let ret: boolean;
  let isSpiceBloom = false;

  if (unit.o.type === UNIT.SONIC_BLAST) {
    const damage = idiv(unit.o.hitpoints, 4) + 1;
    ret = false;
    const u = unitGetByPackedTile(packed);
    if (u) {
      if (!unitInfo[u.o.type].flags.sonicProtection) unitDamage(u, damage, 0);
    } else {
      const s = structureGetByPackedTile(packed);
      if (s) structureDamage(s, damage, 0);
      else if (mapGetLandscapeType(packed) === LST.WALL) {
        mapMakeExplosion(EXPLOSION.IMPACT_SMALL,newPosition,damage,unit.originEncoded);
        unitRemove(unit);
        return true;
      }
    }
    if (unit.o.hitpoints < idiv(ui.damage, 2)) unit.o.flags.bulletIsBig = true;
    unit.o.hitpoints = u16(unit.o.hitpoints - 1);
    if (unit.o.hitpoints === 0 || unit.fireDelay === 0) unitRemove(unit);
  } else {
    if (unit.o.type === UNIT.BULLET) {
      let type = mapGetLandscapeType(packTile(newPosition));
      if (type === LST.WALL || type === LST.STRUCTURE) {
        if (indexGetType(unit.originEncoded) === IT.STRUCTURE) {
          if (G.map[packTile(newPosition)].houseID === unit.o.houseID) type = LST.NORMAL_SAND;
        }
      }
      if (type === LST.WALL || type === LST.STRUCTURE || type === LST.ENTIRELY_MOUNTAIN) {
        unit.o.position = newPosition;
        mapMakeExplosion((ui.explosionType + idiv(unit.o.hitpoints, 10)) & 3, unit.o.position, unit.o.hitpoints, unit.originEncoded);
        unitRemove(unit);
        return true;
      }
    }
    ret = unit.distanceToDestination < distance || distance < 16;
    if (ret) {
      if (ui.flags.isBullet) {
        if (unit.fireDelay === 0 || unit.o.type === UNIT.MISSILE_TURRET) {
          if (unit.o.type === UNIT.MISSILE_HOUSE) {
            G.onHouseMissileImpact(newPosition);
            for (let i = 0; i < 17; i++) {
              const p = tile(newPosition.x + HOUSE_MISSILE_X[i], newPosition.y + HOUSE_MISSILE_Y[i]);
              // MD $0464FE: 17 impacts of 200. Stronger multiplayer strike requested by the owner.
              if (tileIsValid(p)) mapMakeExplosion(ui.explosionType, p, G.net ? 400 : 200, 0);
            }
          } else if (ui.explosionType !== 0xffff) {
            const pp = packTile(unit.o.position);
            if (ui.flags.impactOnSand && G.map[pp].index === 0 && mapGetLandscapeType(pp) === LST.NORMAL_SAND) {
              mapMakeExplosion(EXPLOSION.SAND_BURST, newPosition, unit.o.hitpoints, unit.originEncoded);
            } else if (unit.o.type === UNIT.MISSILE_DEVIATOR) {
              mapDeviateArea(ui.explosionType, newPosition, 32, unit.o.houseID);
            } else {
              mapMakeExplosion((ui.explosionType + idiv(unit.o.hitpoints, 20)) & 3, newPosition, unit.o.hitpoints, unit.originEncoded);
            }
          }
          unitRemove(unit);
          return true;
        }
      } else if (ui.flags.isGroundUnit) {
        if (currentDestination.x !== 0 || currentDestination.y !== 0) newPosition = { ...currentDestination };
        unit.targetPreLast = unit.targetLast;
        unit.targetLast = { ...unit.o.position };
        unit.currentDestination = { x: 0, y: 0 };
        if (unit.o.flags.degrades && (random256() & 3) === 0) unitDamage(unit, 1, 0);
        if (unit.o.type === UNIT.SABOTEUR) {
          let detonate = mapGetLandscapeType(packTile(newPosition)) === LST.WALL;
          if (!detonate) detonate = unit.targetMove !== 0 && tileGetDistance(unit.o.position, indexGetTile(unit.targetMove)) < 32;
          if (detonate) {
            mapMakeExplosion(EXPLOSION.SABOTEUR_DEATH, newPosition, 500, 0);
            unitRemove(unit);
            return true;
          }
        }
        unitSetSpeed(unit, 0);
        if (unit.targetMove === indexEncode(packed, IT.TILE)) unit.targetMove = 0;
        const s = structureGetByPackedTile(packed);
        if (s) {
          unit.targetPreLast = { x: 0, y: 0 };
          unit.targetLast = { x: 0, y: 0 };
          unitEnterStructure(unit, s);
          return true;
        }
        if (unit.o.type !== UNIT.SANDWORM) {
          const g = G.map[packed].groundTileID;
          if (g === G.bloomTileID || g === G.bloomTileID + 1) isSpiceBloom = true;
        }
      }
    }
  }
  unit.distanceToDestination = distance;
  unit.o.position = newPosition;
  unitSpriteUpdate(unit);
  unitUpdateMap(1, unit);
  if (isSpiceBloom) mapBloomExplodeSpice(packed, unitGetHouseID(unit));
  return ret;
}

export function unitDamage(unit: Unit | null, damage: number, range: number): boolean {
  if (!unit || !unit.o.flags.allocated) return false;
  let ui = unitInfo[unit.o.type];
  if (!ui.flags.isNormalUnit && unit.o.type !== UNIT.SANDWORM) return false;
  if (G.playtester && unit.o.houseID === G.playerHouseID) return false;
  const beforeHP=unit.o.hitpoints,alive = beforeHP !== 0;
  unit.o.hitpoints = unit.o.hitpoints >= damage ? unit.o.hitpoints - damage : 0;
  if(unit.o.type===UNIT.COMBAT_DRONE&&alive&&!unit.o.flags.isNotOnMap&&
    Math.ceil(beforeHP/(ui.o.hitpoints/3))>Math.ceil(unit.o.hitpoints/(ui.o.hitpoints/3)))G.onSound(COMBAT_SFX.DRONE_EXPLOSION,unit.o.position);
  unitDeviationDecrease(unit, 0);
  const houseID = unitGetHouseID(unit);
  if (!isHuman(houseID)) G.houses[houseID].flags.isAIActive = true;
  if (unit.o.hitpoints === 0) {
    unitRemovePlayer(unit);
    if (unit.o.type === UNIT.HARVESTER) mapFillCircleWithSpice(packTile(unit.o.position), idiv(unit.amount, 32));
    if ((!G.net || isLocal(houseID)) && unit.o.type === UNIT.SABOTEUR) {
      G.onFeedback(20);
    } else if ((!G.net || isLocal(houseID)) && !ui.o.flags.noMessageOnDeath && alive) {
      G.onFeedback(isLocal(houseID) || G.campaignID > 3 ? houseID + 14 : 13);
    }
    unitSetAction(unit, ACTION.DIE);
    return true;
  }
  if (range !== 0) mapMakeExplosion(damage < 25 ? EXPLOSION.IMPACT_SMALL : EXPLOSION.IMPACT_MEDIUM, unit.o.position, 0, 0);
  if (!isHuman(houseID) && unit.actionID === ACTION.AMBUSH && unit.o.type !== UNIT.HARVESTER) unitSetAction(unit, ACTION.ATTACK);
  if (unit.o.hitpoints >= idiv(ui.o.hitpoints, 2)) return false;
  if (unit.o.type === UNIT.SANDWORM) unitSetAction(unit, ACTION.DIE);
  if (unit.o.type === UNIT.TROOPERS || unit.o.type === UNIT.INFANTRY) {
    unit.o.type += 2;
    ui = unitInfo[unit.o.type];
    unit.o.hitpoints = ui.o.hitpoints;
    unitUpdateMap(2, unit);
    if (random256() < houseInfo[unit.o.houseID].toughness) unitSetAction(unit, ACTION.RETREAT);
  }
  if (ui.movementType !== MOVEMENT.TRACKED && ui.movementType !== MOVEMENT.HARVESTER && ui.movementType !== MOVEMENT.WHEELED) return false;
  unit.o.flags.isSmoking = true;
  unit.spriteOffset = 0;
  unit.timer = 0;
  return false;
}

export function unitUntargetMe(unit: Unit): void {
  const encoded = indexEncode(unit.o.index, IT.UNIT);
  objectScriptVariable4Clear(unit.o);
  let find = findAll();
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.targetMove === encoded) u.targetMove = 0;
    if (u.targetAttack === encoded) u.targetAttack = 0;
    if (u.o.script.variables[4] === encoded) objectScriptVariable4Clear(u.o);
  }
  find = findAll();
  for (;;) {
    const s = structureFind(find);
    if (!s) break;
    if (s.o.type !== STRUCTURE.TURRET && s.o.type !== STRUCTURE.ROCKET_TURRET) continue;
    if (s.o.script.variables[2] === encoded) s.o.script.variables[2] = 0;
  }
  unitRemoveFromTeam(unit);
  find = findAll();
  for (;;) {
    const t = teamFind(find);
    if (!t) break;
    if (t.target === encoded) t.target = 0;
  }
}

export function unitSetOrientation(unit: Unit | null, orientation: number, rotateInstantly: boolean, level: number): void {
  if (!unit) return;
  orientation = s8(orientation);
  const o = unit.orientation[level];
  o.speed = 0;
  o.target = orientation;
  if (rotateInstantly) {
    o.current = orientation;
    return;
  }
  if (o.current === orientation) return;
  o.speed = s8(unitInfo[unit.o.type].turningSpeed * 4);
  const diff = orientation - o.current;
  if ((diff > -128 && diff < 0) || diff > 128) o.speed = s8(-o.speed);
}

export function unitSelect(unit: Unit | null): void {
  if (unit === G.unitSelected) return;
  if (unit && !unit.o.flags.allocated) unit = null;
  if (unit && (unit.o.seenByHouses & (1 << G.playerHouseID)) === 0) unit = null;
  if (G.unitSelected && !G.net) unitUpdateMap(2, G.unitSelected);
  if (!unit) {
    G.unitSelected = null;
    G.selectionType = SELECTION.STRUCTURE;
    G.onSelect();
    return;
  }
  if (unitGetHouseID(unit) === G.playerHouseID) {
    // MD $0282fe/$02830a: выбор пехоты — $11 (GEMS seq 67, «Yes sir»), выбор техники — $0F (GEMS seq 79)
    G.onSound(unitInfo[unit.o.type].movementType === MOVEMENT.FOOT ? 0x11 : 0x0f);
  }
  if (G.unitSelected) {
    if (G.unitSelected !== unit) unitDisplayStatusText(unit);
    G.unitSelected = unit;
  } else {
    unitDisplayStatusText(unit);
    G.unitSelected = unit;
    G.selectionType = SELECTION.UNIT;
  }
  if (!G.net) unitUpdateMap(2, G.unitSelected);
  G.onSelect();
}

export function unitCreateWrapper(houseID: number, typeID: number, destination: number): Unit | null {
  let t = unpackTile(mapFindLocationTile(random256() & 3, houseID));
  const h = G.houses[houseID];
  const orientation = tileGetDirection(t, { x: 0x2000, y: 0x2000 });
  if (unitInfo[typeID].movementType === MOVEMENT.WINGER) {
    G.validateStrictIfZero++;
    const unit = unitCreate(INDEX_INVALID, typeID, houseID, t, orientation);
    G.validateStrictIfZero--;
    if (!unit) return null;
    unit.o.flags.byScenario = true;
    if (destination !== 0) unitSetDestination(unit, destination);
    return unit;
  }
  G.validateStrictIfZero++;
  const carryall = unitCreate(INDEX_INVALID, UNIT.CARRYALL, houseID, t, orientation);
  G.validateStrictIfZero--;
  if (!carryall) {
    if (typeID === UNIT.HARVESTER && h.harvestersIncoming === 0) h.harvestersIncoming++;
    return null;
  }
  if (houseAlliedToHuman(houseID) || unitIsTypeOnMap(houseID, UNIT.CARRYALL)) carryall.o.flags.byScenario = true;
  t = { x: 0xffff, y: 0xffff };
  G.validateStrictIfZero++;
  const unit = unitCreate(INDEX_INVALID, typeID, houseID, t, 0);
  G.validateStrictIfZero--;
  if (!unit) {
    unitRemove(carryall);
    if (typeID === UNIT.HARVESTER && h.harvestersIncoming === 0) h.harvestersIncoming++;
    return null;
  }
  carryall.o.flags.inTransport = true;
  carryall.o.linkedID = unit.o.index;
  if (typeID === UNIT.HARVESTER) unit.amount = 1;
  if (destination !== 0) unitSetDestination(carryall, destination);
  return unit;
}

const AROUND = [0, -1, 1, -64, 64, -65, -63, 65, 63];

export function unitFindTargetAround(packed: number): number {
  if (!G.net && G.selectionType === SELECTION.PLACE) return packed;
  if (structureGetByPackedTile(packed)) return packed;
  if (mapGetLandscapeType(packed) === LST.BLOOM_FIELD) return packed;
  for (const d of AROUND) {
    const u = unitGetByPackedTile(u16(packed + d));
    if (!u) continue;
    return packTile(u.o.position);
  }
  return packed;
}

export function unitIsTileOccupied(unit: Unit | null): boolean {
  if (!unit) return true;
  const ui = unitInfo[unit.o.type];
  const packed = packTile(unit.o.position);
  const speed = landscapeInfo[mapGetLandscapeType(packed)].movementSpeed[ui.movementType];
  if (speed === 0) return true;
  if (unit.o.type === UNIT.SANDWORM || ui.movementType === MOVEMENT.WINGER) return false;
  const unit2 = unitGetByPackedTile(packed);
  if (unit2 && unit2 !== unit) {
    if (houseAreAllied(unitGetHouseID(unit2), unitGetHouseID(unit))) return true;
    if (ui.movementType !== MOVEMENT.TRACKED) return true;
    if (unitInfo[unit2.o.type].movementType !== MOVEMENT.FOOT) return true;
  }
  return structureGetByPackedTile(packed) !== null;
}

export function unitSetSpeed(unit: Unit, speed: number): void {
  unit.speed = 0;
  unit.speedRemainder = 0;
  unit.speedPerTick = 0;
  if (unit.o.type === UNIT.HARVESTER) speed = idiv((255 - unit.amount) * speed, 256);
  if (speed === 0 || speed >= 256) {
    unit.movingSpeed = 0;
    return;
  }
  unit.movingSpeed = speed & 0xff;
  speed = idiv(unitInfo[unit.o.type].movingSpeedFactor * speed, 256);
  if (unitInfo[unit.o.type].movementType !== MOVEMENT.WINGER) speed = adjustToGameSpeed(speed, 1, 255, false);
  let speedPerTick = u16(speed << 4);
  speed = speed >> 4;
  if (speed !== 0) speedPerTick = 255;
  else speed = 1;
  unit.speed = speed & 0xff;
  unit.speedPerTick = speedPerTick & 0xff;
}

export function unitCreateBullet(position: Tile32, type: number, houseID: number, damage: number, target: number): Unit | null {
  if (!indexIsValid(target)) return null;
  const ui = unitInfo[type];
  const t = indexGetTile(target);
  switch (type) {
    case UNIT.MISSILE_HOUSE:
    case UNIT.MISSILE_ROCKET:
    case UNIT.MISSILE_TURRET:
    case UNIT.MISSILE_DEVIATOR:
    case UNIT.MISSILE_TROOPER: {
      const orientation = tileGetDirection(position, t);
      const bullet = unitCreate(INDEX_INVALID, type, houseID, position, orientation);
      if (!bullet) return null;
      G.onSound(ui.bulletSound, position);
      bullet.targetAttack = target;
      bullet.o.hitpoints = damage;
      bullet.currentDestination = { ...t };
      if (ui.flags.notAccurate) {
        bullet.currentDestination = tileMoveByRandom(
          t,
          (random256() & 0xf) !== 0 ? idiv(tileGetDistance(position, t), 256) + 8 : random256() + 8,
          false,
        );
      }
      bullet.fireDelay = ui.fireDistance & 0xff;
      const u = indexGetUnit(target);
      if (u && unitInfo[u.o.type].movementType === MOVEMENT.WINGER) bullet.fireDelay = u8(bullet.fireDelay << 1);
      if (type === UNIT.MISSILE_HOUSE) return bullet;
      bulletRemoveFog(bullet);
      return bullet;
    }
    case UNIT.BULLET:
    case UNIT.SONIC_BLAST: {
      const orientation = tileGetDirection(position, t);
      const p = tileMoveByDirection(tileMoveByDirection(position, 0, 32), orientation, 128);
      const bullet = unitCreate(INDEX_INVALID, type, houseID, p, orientation);
      if (!bullet) return null;
      if (type === UNIT.SONIC_BLAST) bullet.fireDelay = ui.fireDistance & 0xff;
      bullet.currentDestination = { ...t };
      bullet.o.hitpoints = damage;
      if (damage > 15) bullet.o.flags.bulletIsBig = true;
      bulletRemoveFog(bullet);
      return bullet;
    }
    default:
      return null;
  }
}

export function unitDisplayStatusText(unit: Unit | null): void {
  if (!unit) return;
  G.onMessage(msg.unitStatus(unit), 2);
}

export function unitHide(unit: Unit | null): void {
  if (!unit) return;
  unit.o.flags.bulletIsBig = true;
  unitUpdateMap(0, unit);
  unit.o.flags.bulletIsBig = false;
  scriptReset(unit.o.script, G.scriptUnit);
  unitUntargetMe(unit);
  unit.o.flags.isNotOnMap = true;
  unitHouseUnitCountRemove(unit);
}

export function unitCallUnitByType(type: number, houseID: number, target: number, createCarryall: boolean): Unit | null {
  let unit: Unit | null = null;
  const find = findAll(houseID, type);
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.o.linkedID !== 0xff) continue;
    if (u.targetMove !== 0) continue;
    unit = u;
  }
  if (createCarryall && !unit && type === UNIT.CARRYALL) {
    G.validateStrictIfZero++;
    unit = unitCreate(INDEX_INVALID, type, houseID, { x: 0, y: 0 }, 96);
    G.validateStrictIfZero--;
    if (unit) unit.o.flags.byScenario = true;
  }
  if (unit) {
    // An idle MD carryall may still be inside its long departure/loiter delay.
    // Start the new job immediately, before the waiting harvester times out.
    if (type === UNIT.CARRYALL) unitSetAction(unit, ACTION.MOVE);
    unit.targetMove = target;
    objectScriptVariable4Set(unit.o, target);
  }
  return unit;
}

export function unitEnterStructure(unit: Unit | null, s: Structure | null): void {
  if (!unit || !s) return;
  if (unit === G.unitSelected) unitSelect(null);
  const ui = unitInfo[unit.o.type];
  const si = structureInfo[s.o.type];
  if (!unit.o.flags.allocated || s.o.hitpoints === 0) {
    unitRemove(unit);
    return;
  }
  unit.o.seenByHouses |= s.o.seenByHouses;
  unitHide(unit);
  if (houseAreAllied(s.o.houseID, unitGetHouseID(unit))) {
    structureSetState(s, si.o.flags.busyStateIsIncoming ? 2 : 1);
    if (s.o.type === STRUCTURE.REPAIR) {
      const countDown = u16(idiv(idiv((ui.o.hitpoints - unit.o.hitpoints) * 256, ui.o.hitpoints) * (ui.o.buildTime << 6), 256));
      s.countDown = countDown > 1 ? countDown : 1;
      // $048926: сохранить начальное время до восстановления hitpoints — максимум полосы HUD.
      unit.repairTime = s.countDown;
      unit.o.hitpoints = ui.o.hitpoints;
      unit.o.flags.isSmoking = false;
      unit.spriteOffset = 0;
    }
    unit.o.linkedID = s.o.linkedID;
    s.o.linkedID = unit.o.index;
    return;
  }
  if (unit.o.type === UNIT.SABOTEUR) {
    structureDamage(s, 500, 1);
    unitRemove(unit);
    return;
  }
  if (s.o.hitpoints < idiv(si.o.hitpoints, 4)) {
    let h = G.houses[s.o.houseID];
    s.o.houseID = unitGetHouseID(unit);
    h.structuresBuilt = structureGetStructuresBuilt(h);
    h = G.houses[s.o.houseID];
    h.structuresBuilt = structureGetStructuresBuilt(h);
    if (s.o.linkedID !== 0xff) {
      const u = G.units[s.o.linkedID];
      if (u) u.o.houseID = unitGetHouseID(unit);
    }
    houseCalculatePowerAndCredit(G.houses[s.o.houseID]);
    structureUpdateMap(s);
  } else {
    structureDamage(s, Math.min(unit.o.hitpoints * 2, idiv(s.o.hitpoints, 2)), 1);
  }
  objectScriptVariable4Clear(s.o);
  unitRemove(unit);
}

function unitFindBestTargetStructure(unit: Unit | null, mode: number): Structure | null {
  if (!unit) return null;
  const position = indexGetTile(unit.originEncoded);
  const distance = u16(unitInfo[unit.o.type].fireDistance << 8);
  let best: Structure | null = null;
  let bestPriority = 0;
  const find = findAll();
  for (;;) {
    const s = structureFind(find);
    if (!s) break;
    if (s.o.type === STRUCTURE.SLAB_1x1 || s.o.type === STRUCTURE.SLAB_2x2 || s.o.type === STRUCTURE.WALL) continue;
    const diff = layoutTileDiff[structureInfo[s.o.type].layout];
    const cur = tile(s.o.position.x + diff.x, s.o.position.y + diff.y);
    if (mode !== 0 && mode !== 4) {
      if (mode === 1) {
        if (tileGetDistance(unit.o.position, cur) > distance) continue;
      } else {
        if (mode !== 2) continue;
        if (tileGetDistance(position, cur) > distance * 2) continue;
      }
    }
    const priority = unitGetTargetStructurePriority(unit, s);
    if (priority >= bestPriority) {
      best = s;
      bestPriority = priority;
    }
  }
  if (bestPriority === 0) return null;
  return best;
}

export function unitGetTileEnterScore(unit: Unit | null, packed: number, orient8: number): number {
  if (!unit) return 0;
  packed = u16(packed);
  const ui = unitInfo[unit.o.type];
  if (!mapIsValidPosition(packed) && ui.movementType !== MOVEMENT.WINGER) return 256;
  const u = unitGetByPackedTile(packed);
  if (u && u !== unit && unit.o.type !== UNIT.SANDWORM) {
    if (unit.o.type === UNIT.SABOTEUR && unit.targetMove === indexEncode(u.o.index, IT.UNIT)) return 0;
    if (houseAreAllied(unitGetHouseID(u), unitGetHouseID(unit))) return 256;
    if (unitInfo[u.o.type].movementType !== MOVEMENT.FOOT || (ui.movementType !== MOVEMENT.TRACKED && ui.movementType !== MOVEMENT.HARVESTER)) return 256;
  }
  const s = structureGetByPackedTile(packed);
  if (s) {
    const res = unitIsValidMovementIntoStructure(unit, s);
    if (res === 0) return 256;
    if(unit.o.type===UNIT.HARVESTER&&s.o.type===STRUCTURE.REFINERY&&
      (packed!==packTile(refineryDock(s.o.position))||orient8!==0))return 256;
    return -res;
  }
  const type = mapGetLandscapeType(packed);
  let res = landscapeInfo[type].movementSpeed[ui.movementType];
  if (unit.o.type === UNIT.SABOTEUR && type === LST.WALL) {
    if (!houseAreAllied(G.map[packed].houseID, unitGetHouseID(unit))) res = 255;
  }
  if (res === 0) return 256;
  if ((orient8 & 1) !== 0) res -= idiv(res, 4) + idiv(res, 8);
  res ^= 0xff;
  return s16(res);
}

export function unitFindBestTargetEncoded(unit: Unit | null, mode: number): number {
  if (!unit) return 0;
  let s: Structure | null = null;
  if (mode === 4) {
    s = unitFindBestTargetStructure(unit, mode);
    if (s) return indexEncode(s.o.index, IT.STRUCTURE);
    const target = unitFindBestTargetUnit(unit, mode);
    if (!target) return 0;
    return indexEncode(target.o.index, IT.UNIT);
  }
  const target = unitFindBestTargetUnit(unit, mode);
  if (unit.o.type !== UNIT.DEVIATOR) s = unitFindBestTargetStructure(unit, mode);
  if (target && s) {
    const priority = unitGetTargetUnitPriority(unit, target);
    if (unitGetTargetStructurePriority(unit, s) >= priority) return indexEncode(s.o.index, IT.STRUCTURE);
    return indexEncode(target.o.index, IT.UNIT);
  }
  if (target) return indexEncode(target.o.index, IT.UNIT);
  if (s) return indexEncode(s.o.index, IT.STRUCTURE);
  return 0;
}

export function unitRemovePlayer(unit: Unit | null): void {
  if (!unit) return;
  if (!isHuman(unitGetHouseID(unit))) return;
  if (!unit.o.flags.allocated) return;
  unit.o.flags.allocated = false;
  unitRemoveFromTeam(unit);
  if (unit !== G.unitSelected) return;
  if (G.selectionType === SELECTION.TARGET) {
    G.unitActive = null;
    G.activeAction = 0xffff;
    G.selectionType = SELECTION.STRUCTURE;
  }
  unitSelect(null);
}

export function unitUpdateMap(type: number, unit: Unit | null): void {
  if (!unit || unit.o.flags.isNotOnMap || !unit.o.flags.used) return;
  const ui = unitInfo[unit.o.type];
  if (ui.movementType === MOVEMENT.WINGER) {
    if (type !== 0) unit.o.flags.isDirty = true;
    mapUpdateAround(ui.dimension, unit.o.position, unit, FUNCTIONS[0][type]);
    return;
  }
  const position = unit.o.position;
  const packed = packTile(position);
  const t = G.map[packed];
  if (G.net) {
    // туман по домам: каждый человек видит юнит по своей маске
    for (const hid of humanHouses()) {
      if (isHuman(unit.o.houseID) || mapIsUnveiledFor(packed, hid)) unitHouseUnitCountAdd(unit, hid);
      else unitHouseUnitCountRemoveFor(unit, hid);
    }
  } else if (t.isUnveiled || isHuman(unit.o.houseID)) for (const hid of humanHouses()) unitHouseUnitCountAdd(unit, hid);
  else unitHouseUnitCountRemove(unit);
  if (type === 1) {
    if (G.net) {
      const hid = unitGetHouseID(unit);
      if (isHuman(hid) && !mapIsUnveiledFor(packed, hid) && unit.o.type !== UNIT.SANDWORM) tileRemoveFogInRadius(position, 1, hid);
    } else if (houseAlliedToHuman(unitGetHouseID(unit)) && !mapIsPositionUnveiled(packed) && unit.o.type !== UNIT.SANDWORM) {
      tileRemoveFogInRadius(position, 1);
    }
    if (objectGetByPackedTile(packed) === null) {
      t.index = unit.o.index + 1;
      t.hasUnit = true;
    }
  }
  if (type !== 0) unit.o.flags.isDirty = true;
  let radius = ui.dimension + 3;
  if (unit.o.flags.bulletIsBig || unit.o.flags.isSmoking || (unit.o.type === UNIT.HARVESTER && unit.actionID === ACTION.HARVEST)) radius = 33;
  mapUpdateAround(radius, position, unit, FUNCTIONS[1][type]);
  if (unit.o.type !== UNIT.HARVESTER) return;
  mapUpdateAround(radius, unit.targetPreLast, unit, FUNCTIONS[1][type]);
  mapUpdateAround(radius, unit.targetLast, unit, FUNCTIONS[1][type]);
}

export function unitRemoveFromTileFn(unit: Unit, packed: number): void {
  const t = G.map[packed];
  if (t.hasUnit && unitGetByPackedTile(packed) === unit && (packed !== packTile(unit.currentDestination) || unit.o.flags.bulletIsBig)) {
    t.index = 0;
    t.hasUnit = false;
  }
}

export function unitAddToTileFn(unit: Unit, packed: number): void {
  mapUnveilTile(packed, unitGetHouseID(unit));
}

export function unitGetTargetStructurePriority(unit: Unit | null, target: Structure | null): number {
  if (!unit || !target) return 0;
  if (houseAreAllied(unitGetHouseID(unit), target.o.houseID)) return 0;
  if ((target.o.seenByHouses & (1 << unitGetHouseID(unit))) === 0 && !aiKnowsAll(unit)) return 0;
  const si = structureInfo[target.o.type];
  let priority = u16(si.o.priorityBuild + si.o.priorityTarget);
  const distance = tileGetDistanceRoundedUp(unit.o.position, target.o.position);
  if (distance !== 0) priority = idiv(priority, distance);
  return Math.min(priority, 32000);
}

export function unitLaunchHouseMissile(packed: number): void {
  const m = G.unitHouseMissile;
  if (!m) return;
  const h = G.houses[m.o.houseID];
  let t = unpackTile(packed);
  t = tileMoveByRandom(t, 160, false);
  packed = packTile(t);
  const isAI = !isLocal(m.o.houseID);
  unitFree(m);
  G.onFeedback(0xfffe);
  unitCreateBullet(h.palacePosition, m.o.type, m.o.houseID, 0x1f4, indexEncode(packed, IT.TILE));
  G.houseMissileCountdown = 0;
  G.unitHouseMissile = null;
  if (isAI) {
    if (!G.net || !houseAreAllied(G.playerHouseID,m.o.houseID)) G.onFeedback(39);
    return;
  }
  G.selectionType = SELECTION.STRUCTURE;
}

export function unitHouseUnitCountRemove(unit: Unit | null): void {
  if (!unit) return;
  if (unit.o.seenByHouses === 0) return;
  const find = findAll();
  for (;;) {
    const h = houseFind(find);
    if (!h) break;
    if ((unit.o.seenByHouses & (1 << h.index)) === 0) continue;
    if (!houseAreAllied(h.index, unitGetHouseID(unit))) h.unitCountEnemy--;
    else h.unitCountAllied--;
    unit.o.seenByHouses &= ~(1 << h.index);
  }
}

/** Сеть: дом houseID перестаёт видеть юнит (как unitHouseUnitCountRemove, но для одного дома). */
function unitHouseUnitCountRemoveFor(unit: Unit, houseID: number): void {
  if ((unit.o.seenByHouses & (1 << houseID)) === 0) return;
  const h = G.houses[houseID];
  if (!houseAreAllied(houseID, unitGetHouseID(unit))) h.unitCountEnemy--;
  else h.unitCountAllied--;
  unit.o.seenByHouses &= ~(1 << houseID);
}

/**
 * Выстрел, которого игрок не видел, снимает туман вокруг стрелка (радиус 2). В сети — для каждого человека,
 * который пулю не видел.
 */
function bulletRemoveFog(bullet: Unit): void {
  if (!G.net) {
    if ((bullet.o.seenByHouses & (1 << G.playerHouseID)) !== 0) return;
    tileRemoveFogInRadius(bullet.o.position, 2);
    return;
  }
  for (const hid of humanHouses()) {
    if ((bullet.o.seenByHouses & (1 << hid)) === 0) tileRemoveFogInRadius(bullet.o.position, 2, hid);
  }
}

export function unitHouseUnitCountAdd(unit: Unit | null, houseID: number): void {
  if (!unit) return;
  const ui = unitInfo[unit.o.type];
  const h = G.houses[houseID];
  const hp = h;
  let houseIDBit = 1 << houseID;
  if (houseID === HOUSE.ATREIDES && unit.o.type !== UNIT.SANDWORM) houseIDBit |= 1 << HOUSE.FREMEN;
  if ((unit.o.seenByHouses & houseIDBit) !== 0 && h.flags.isAIActive) {
    unit.o.seenByHouses |= houseIDBit;
    return;
  }
  if (!ui.flags.isNormalUnit && unit.o.type !== UNIT.SANDWORM) return;
  if ((unit.o.seenByHouses & houseIDBit) === 0) {
    if (houseAreAllied(houseID, unitGetHouseID(unit))) h.unitCountAllied++;
    else h.unitCountEnemy++;
  }
  if (ui.movementType !== MOVEMENT.WINGER) {
    if (!houseAreAllied(houseID, unitGetHouseID(unit))) {
      h.flags.isAIActive = true;
      G.houses[unitGetHouseID(unit)].flags.isAIActive = true;
    }
  }
  // в сети экран ментата у игрока свой и на симуляцию не влияет
  if (isHuman(houseID) && (G.net !== null || G.selectionType !== SELECTION.MENTAT)) {
    const local = isLocal(houseID);
    if (unit.o.type === UNIT.SANDWORM) {
      if (hp.timerSandwormAttack === 0) {
        if (local) {
          if (G.musicInBattle === 0) G.musicInBattle = 1;
          G.onFeedback(37);
          G.onMessage(msg.sandworms, 1);
        }
        hp.timerSandwormAttack = 8;
      }
    } else if (!houseAreAllied(houseID, unitGetHouseID(unit))) {
      if (hp.timerUnitAttack === 0) {
        if (local && G.musicInBattle === 0) G.musicInBattle = 1;
        if (!local) {
          // голос предупреждения — только своему игроку
        } else if (unit.o.type === UNIT.SABOTEUR) {
          G.onFeedback(12);
        } else if (G.scenarioID < 3) {
          const s = structureFind(findAll(houseID, STRUCTURE.CONSTRUCTION_YARD));
          let feedbackID: number;
          if (s) feedbackID = idiv((orientation8(tileGetDirection(s.o.position, unit.o.position)) + 1) & 7, 2) + 2;
          else feedbackID = 1;
          G.onFeedback(feedbackID);
        } else {
          G.onFeedback(unit.o.houseID + 6);
        }
        hp.timerUnitAttack = 8;
      }
      // как в оригинале: индекс команды без «− 1»
      const t = unit.team < 16 ? G.teams[unit.team] : null;
      if (t) t.script.variables[4] = 1;
    }
  }
  if (!houseAreAllied(houseID, unit.o.houseID) && unit.actionID === ACTION.AMBUSH) unitSetAction(unit, ACTION.HUNT);
  if (isHuman(unit.o.houseID) || (!G.net && unit.o.houseID === HOUSE.FREMEN && G.playerHouseID === HOUSE.ATREIDES)) unit.o.seenByHouses = 0xff;
  else unit.o.seenByHouses |= houseIDBit;
}

export function unitFindAll(): Unit[] {
  return [...G.unitFind];
}

export { structureFree, indexGetPackedTile, structureHouseUnderAttack };

/**
 * Переменная 3 скрипта юнита — дом игрока (g_playerHouseID). В сети у юнита человека — его дом, у юнита ИИ —
 * ближайший противник матча (человек или компьютер, по ближайшему его зданию), а не всегда первый человек:
 * иначе все компьютеры шли на одного игрока, не замечая его союзника-компьютера. Одинаково у всех клиентов.
 */
function scriptPlayerHouse(u: Unit): number {
  if (!G.net) return G.playerHouseID;
  const own = unitGetHouseID(u);
  if (isHuman(own)) return own;
  let best = -1, bestDistance = Infinity;
  for (const s of G.structureFind) {
    const h = s.o.houseID;
    if (!s.o.flags.used || s.o.flags.isNotOnMap || (G.net.team[h] ?? -1) < 0 || houseAreAllied(h, own)) continue;
    const d = tileGetDistance(u.o.position, s.o.position);
    if (d < bestDistance) { bestDistance = d; best = h; }
  }
  if (best >= 0) return best;
  const mask = humanMask();
  for (let h = 0; h < 8; h++) if ((mask >> h) & 1 && !houseAreAllied(h, own)) return h;
  return own;
}

/**
 * Сеть: компьютер при выборе цели знает всех противников матча. В MD объекты игрока сразу видны всем домам ИИ
 * (seenByHouses = 0xFF), а объекты другого компьютера — никогда (туман для ИИ не ведётся), поэтому вражеские
 * компьютеры замечали только людей и шли мимо союзника-компьютера. Видимость для людей не меняется.
 */
function aiKnowsAll(unit: Unit): boolean {
  return !!G.net && !isHuman(unitGetHouseID(unit));
}

/** Перевозчик улетает к ближайшему краю карты и исчезает там (см. Unit.carryallLeaving). */
function unitCarryallLeaveTick(u: Unit): void {
  const mi = MAP_INFOS[G.mapScale];
  const x = u.o.position.x >> 8, y = u.o.position.y >> 8;
  const left = x - mi.minX, right = mi.minX + mi.sizeX - 1 - x, top = y - mi.minY, bottom = mi.minY + mi.sizeY - 1 - y;
  const nearest = Math.min(left, right, top, bottom);
  if (nearest <= 0) {
    unitRemove(u);
    return;
  }
  const edge =
    nearest === left ? { x: mi.minX, y } : nearest === right ? { x: mi.minX + mi.sizeX - 1, y } : nearest === top ? { x, y: mi.minY } : { x, y: mi.minY + mi.sizeY - 1 };
  const target = { x: (edge.x << 8) | 0x80, y: (edge.y << 8) | 0x80 };
  u.targetMove = 0;
  u.targetAttack = 0;
  u.currentDestination = target;
  unitSetOrientation(u, tileGetDirection(u.o.position, target), false, 0);
  if (u.speed === 0) unitSetSpeed(u, 255);
}
