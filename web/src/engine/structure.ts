/**
 * Здания: постройка, размещение, производство, ремонт, улучшение, разрушение (OpenDUNE src/structure.c).
 * Окно завода (GUI_DisplayFactoryWindow) вынесено в интерфейс: он вызывает structureBuildObject
 * с выбранным типом, а покупку в космопорте — structureStarportBuy.
 */
import { animationStart, animationStopByTile } from "./animation.ts";
import {
  ACTION, EXPLOSION, G, HOUSE, HOUSE_WEAPON, INDEX_INVALID, IT, LST, SELECTION, STATE, STRUCTURE, UNIT, adjustToGameSpeed, findAll,
  idiv, indexEncode, packTile, random256, randomRange, structureAllocate, structureFind, structureFree as poolStructureFree,
  teamFind, tileAddDiff, tileCenter, tileGetDistancePacked, tileMoveByRandom, u16, unitAllocate, unitFind, unitFree, unpackTile,
  type House, type Structure, type Unit,
} from "./core.ts";
import { isHuman, isLocal } from "./core.ts";
import { houseAlliedToHuman, houseAreAllied, houseCalculatePowerAndCredit, houseUpdateCreditsStorage, houseUpdateRadarState } from "./house.ts";
import {
  mapFindLocationTile, mapGetLandscapeType, mapIsPositionUnveiled, mapIsValidPosition, mapMakeExplosion, mapSearchSpice,
  tileIsUnveiled, tileRemoveFogInRadius,
} from "./map.ts";
import { objectGetByPackedTile, objectScriptVariable4Clear } from "./object.ts";
import { scriptIsLoaded, scriptLoad, scriptReset, scriptRun } from "./script.ts";
import { msg } from "./strings.ts";
import {
  animationStructureBuild, animationStructureRubble, houseInfo, landscapeInfo, layoutTileCount, layoutTileDiff, layoutTiles,
  layoutTilesAround, structureInfo, tableMapDiff, unitInfo,
} from "./tables.ts";
import { unitCreate, unitGetByPackedTile, unitGetHouseID, unitLaunchHouseMissile, unitRemove, unitSetAction } from "./unit.ts";
import {networkUnitCount} from './core.ts';
import {NETWORK_ARMY_POOL_END,NETWORK_STRUCTURE_LIMIT,NETWORK_UNIT_LIMIT} from './network-rules.ts';
import { netAIMayBuildUnits, netAIStructurePlaced } from "./net-ai.ts";
import {DRONES_PER_PAD,padDroneLoad,houseHasDroneRoom} from './drone-capacity.ts';

const ticks = { degrade: 0, structure: 0, script: 0, palace: 0 };
let releaseProducedUnit: (s: Structure, u: Unit) => boolean = () => false;
export function setStructureReleaseUnit(fn: typeof releaseProducedUnit): void { releaseProducedUnit = fn; }

export function structureResetTimers(): void {
  for (const k of Object.keys(ticks) as (keyof typeof ticks)[]) ticks[k] = 0;
}

const isSlabOrWall = (t: number) => t === STRUCTURE.SLAB_1x1 || t === STRUCTURE.SLAB_2x2 || t === STRUCTURE.WALL;

export const structureFree = poolStructureFree;

/**
 * Шаг между кадрами (стройка, развалины, готово) в группе иконок здания. У PC он равен числу
 * клеток раскладки; в MD у «завода хай-тек» (2×2) группа на 6 клеток — берём треть группы.
 */
export function structureFrameStride(iconGroup: number, tiles: number): number {
  const len = G.iconGroups[iconGroup]?.length ?? 0;
  if (len % 3 === 0 && len / 3 >= tiles) return len / 3;
  return tiles;
}

export function gameLoopStructure(): void {
  let tickDegrade = false;
  let tickStructure = false;
  let tickScript = false;
  let tickPalace = false;
  const now = G.timerGame;
  if (ticks.degrade <= now && G.campaignID > 1) {
    tickDegrade = true;
    ticks.degrade = now + adjustToGameSpeed(10800, 5400, 21600, true);
  }
  if (ticks.structure <= now) {
    tickStructure = true;
    ticks.structure = now + adjustToGameSpeed(30, 15, 60, true);
  }
  if (ticks.script <= now) {
    tickScript = true;
    ticks.script = now + 5;
  }
  if (ticks.palace <= now) {
    tickPalace = true;
    ticks.palace = now + 60;
  }

  const find = findAll();
  for (;;) {
    const s = structureFind(find);
    if (!s) break;
    if (isSlabOrWall(s.o.type)) continue;
    const si = structureInfo[s.o.type];
    const h = G.houses[s.o.houseID];
    const hi = houseInfo[h.index];
    G.scriptCurrentObject = s.o;
    G.scriptCurrentStructure = s;
    G.scriptCurrentUnit = null;
    G.scriptCurrentTeam = null;

    const operational = s.o.flags.allocated && s.o.hitpoints > 0;
    if (operational && tickPalace && s.o.type === STRUCTURE.PALACE) {
      // MD $00BDEA: сначала пауза после спецоружия, отсчёт стоит и при бите 8 (предел юнитов)
      if (s.specialWait !== 0) s.specialWait--;
      else if (s.countDown !== 0 && !(isHuman(s.o.houseID) && structureLimitReached(s))) s.countDown--;
      if (s.countDown === 0 && !h.flags.human && h.flags.isAIActive) structureActivateSpecial(s);
    }
    if (tickDegrade && s.o.flags.degrades && s.o.hitpoints > idiv(si.o.hitpoints, 2)) structureDamage(s, hi.degradingAmount, 0);

    if (operational && tickStructure) {
      const upgradeWasActive = s.o.flags.upgrading;
      const parallelYardUpgrade = upgradeWasActive && s.o.type === STRUCTURE.CONSTRUCTION_YARD;
      if (upgradeWasActive) {
        const upgradeCost = idiv(si.o.buildCredits, 40);
        if (upgradeCost <= h.credits) {
          h.credits -= upgradeCost;
          s.upgradeSpent += upgradeCost;
          if (s.upgradeTimeLeft > 5) {
            s.upgradeTimeLeft -= 5;
          } else {
            s.upgradeLevel++;
            s.o.flags.upgrading = false;
            s.upgradeSpent = 0;
            if (s.o.houseID === HOUSE.ORDOS && s.o.type === STRUCTURE.HEAVY_VEHICLE && s.upgradeLevel === 2) s.upgradeLevel = 3;
            s.upgradeTimeLeft = structureIsUpgradable(s) ? 100 : 0;
          }
        } else {
          s.o.flags.upgrading = false;
        }
      }
      if ((!upgradeWasActive || parallelYardUpgrade) && s.o.flags.repairing) {
        const repairCost = idiv(idiv(2 * 256, si.o.hitpoints) * si.o.buildCredits + 128, 256);
        if (repairCost <= h.credits) {
          h.credits -= repairCost;
          s.o.hitpoints += isHuman(s.o.houseID) || G.campaignID >= 3 ? 5 : 3;
          if (s.o.hitpoints > si.o.hitpoints) {
            s.o.hitpoints = si.o.hitpoints;
            s.o.flags.repairing = false;
            s.o.flags.onHold = false;
          }
        } else {
          s.o.flags.repairing = false;
        }
      } else if (!upgradeWasActive || parallelYardUpgrade) {
        if (!s.o.flags.onHold && s.countDown !== 0 && s.o.linkedID !== 0xff && s.state === STATE.BUSY && si.o.flags.factory) {
          let oi;
          if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) oi = structureInfo[s.objectType].o;
          else if (s.o.type === STRUCTURE.REPAIR) oi = unitInfo[G.units[s.o.linkedID].o.type].o;
          else oi = unitInfo[s.objectType].o;
          let buildSpeed = 256;
          if (s.o.hitpoints < si.o.hitpoints) buildSpeed = idiv(s.o.hitpoints * 256, si.o.hitpoints);
          if (!isHuman(s.o.houseID)) {
            if (buildSpeed > G.campaignID * 20 + 95) buildSpeed = G.campaignID * 20 + 95;
            buildSpeed = idiv(buildSpeed * [82, 100, 125][G.difficulty], 100);
          }
          let buildCost = s.prepaidUnitCost!==undefined||s.prepaidBuildingCost!==undefined?0:u16(idiv(oi.buildCredits * 256, oi.buildTime));
          if (buildSpeed < 256) buildCost = u16(idiv(buildSpeed * buildCost, 256));
          if (s.o.type === STRUCTURE.REPAIR && buildCost > 4) buildCost = idiv(buildCost, 4);
          buildCost = u16(buildCost + s.buildCostRemainder);
          if (idiv(buildCost, 256) <= h.credits) {
            s.buildCostRemainder = buildCost & 0xff;
            h.credits -= idiv(buildCost, 256);
            s.spent += idiv(buildCost, 256);
            if (buildSpeed < s.countDown) {
              s.countDown -= buildSpeed;
            } else {
              s.countDown = 0;
              s.buildCostRemainder = 0;
              structureSetState(s, STATE.READY);
              if (isHuman(s.o.houseID)) {
                if (isLocal(s.o.houseID) && s.o.type !== STRUCTURE.BARRACKS && s.o.type !== STRUCTURE.WOR_TROOPER) {
                  G.onMessage(msg.buildComplete(s.o.type, s.objectType), 0);
                  if(s.o.type===STRUCTURE.CONSTRUCTION_YARD)G.onConstructionComplete(s);
                  else G.onFeedback(0);
                }
              } else if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
                const ns = G.structures[s.o.linkedID];
                s.o.linkedID = 0xff;
                structureSetState(s, STATE.IDLE);
                let i = 0;
                for (; i < 5; i++) {
                  if (ns.o.type !== h.ai_structureRebuild[i][0]) continue;
                  if (!structurePlace(ns, h.ai_structureRebuild[i][1])) continue;
                  h.ai_structureRebuild[i][0] = 0;
                  h.ai_structureRebuild[i][1] = 0;
                  if (G.net) netAIStructurePlaced(ns);
                  break;
                }
                if (i === 5) {
                  h.credits += structureInfo[ns.o.type].o.buildCredits;
                  structureFree(ns);
                }
              }
            }
          } else if (isHuman(s.o.houseID)) {
            s.o.flags.onHold = true;
            if (isLocal(s.o.houseID)) G.onMessage(msg.insufficientFunds, 0);
          }
        }
        if (s.o.type === STRUCTURE.REPAIR) {
          if (!s.o.flags.onHold && s.countDown !== 0 && s.o.linkedID !== 0xff) {
            const ui = unitInfo[G.units[s.o.linkedID].o.type];
            let repairSpeed = 256;
            if (s.o.hitpoints < si.o.hitpoints) repairSpeed = idiv(s.o.hitpoints * 256, si.o.hitpoints);
            const repairCost = idiv(2 * ui.o.buildCredits, 256);
            if (repairCost < h.credits) {
              h.credits -= repairCost;
              if (repairSpeed < s.countDown) {
                s.countDown -= repairSpeed;
              } else {
                s.countDown = 0;
                structureSetState(s, STATE.READY);
                if (isLocal(s.o.houseID)) G.onFeedback(G.playerHouseID + 55);
              }
            }
          } else if (h.credits !== 0) {
            s.o.flags.onHold = false;
          }
        }
        if (h.flags.isAIActive && s.o.flags.allocated && !isHuman(s.o.houseID) && h.credits !== 0) {
          if (s.o.hitpoints < idiv(si.o.hitpoints, 2)) structureSetRepairingState(s, 1);
          // сеть: пока у компьютера нет задела базы, деньги идут на здания (engine/net-ai.ts)
          if (si.o.flags.factory && s.countDown === 0 && s.o.linkedID === 0xff && (!G.net || netAIMayBuildUnits(s))) {
            const type = structureAIPickNextToBuild(s);
            if (type !== 0xffff) structureBuildObject(s, type);
          }
        }
      }
    }

    // Finished orders wait separately from the production slot. Deployment or
    // manual placement must never prevent the next prepaid order from starting.
    if (operational && isHuman(s.o.houseID) && s.state === STATE.READY && s.countDown === 0 && s.o.linkedID !== 0xff) {
      if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
        const built = G.structures[s.o.linkedID];
        (s.readyBuildings ??= []).push({ type: built.o.type, cost: s.prepaidBuildingCost ?? s.spent });
        structureFree(built);
        s.prepaidBuildingCost = undefined;
        s.o.linkedID = 0xff;
        structureSetState(s, STATE.IDLE);
      } else if (structureCanQueueUnits(s)) {
        (s.readyUnits ??= []).push(s.o.linkedID);
        s.prepaidUnitCost = undefined;
        s.o.linkedID = 0xff;
        structureSetState(s, STATE.IDLE);
      }
    }
    if (operational && s.readyUnits?.length && releaseProducedUnit(s, G.units[s.readyUnits[0]])) s.readyUnits.shift();
    structureStartNextUnit(s);
    if(s.o.type===STRUCTURE.CONSTRUCTION_YARD)structureStartNextBuilding(s);
    if (tickScript) {
      if (s.o.script.delay !== 0) {
        s.o.script.delay--;
      } else if (scriptIsLoaded(s.o.script)) {
        let i = 0;
        for (; i < 3; i++) if (!scriptRun(s.o.script)) break;
        if (i !== 3) return;
      } else {
        scriptReset(s.o.script, s.o.script.scriptInfo);
        scriptLoad(s.o.script, s.o.type);
      }
    }
  }
}

export function structureCreate(index: number, typeID: number, houseID: number, position: number): Structure | null {
  if (houseID >= 6) return null;
  if (typeID >= STRUCTURE.MAX) return null;
  if(G.net&&!isSlabOrWall(typeID)&&networkStructureCount(houseID)>=NETWORK_STRUCTURE_LIMIT)return null;
  const si = structureInfo[typeID];
  const s = structureAllocate(index, typeID);
  if (!s) return null;
  s.o.houseID = houseID;
  s.upgradeSpent = 0;
  s.creatorHouseID = houseID;
  s.o.flags.isNotOnMap = true;
  s.o.position = { x: 0, y: 0 };
  s.o.linkedID = 0xff;
  s.unitQueue=[];s.buildingQueue=[];s.readyBuildings=[];s.readyUnits=[];s.prepaidUnitCost=undefined;s.prepaidBuildingCost=undefined;s.rallyPoint=undefined;
  s.state = STATE.JUSTBUILT;
  if (typeID === STRUCTURE.TURRET || typeID === STRUCTURE.ROCKET_TURRET) s.rotationSpriteDiff = G.iconGroups[si.iconGroup][1];
  s.o.hitpoints = si.o.hitpoints;
  s.hitpointsMax = si.o.hitpoints;
  if (houseID === HOUSE.HARKONNEN && typeID === STRUCTURE.LIGHT_VEHICLE) s.upgradeLevel = 1;
  if (si.o.flags.factory) s.upgradeTimeLeft = structureIsUpgradable(s) ? 100 : 0;
  s.objectType = 0xffff;
  structureBuildObject(s, 0xfffe);
  s.countDown = 0;
  // в сети компьютер покупает улучшения, как человек (engine/net-ai.ts), а не получает даром
  if (!isHuman(houseID) && !G.net) {
    while (structureIsUpgradable(s)) s.upgradeLevel++;
    s.upgradeTimeLeft = 0;
  }
  if (position !== 0xffff && !structurePlace(s, position)) {
    structureFree(s);
    return null;
  }
  return s;
}

export function structurePlace(s: Structure | null, position: number): boolean {
  if (!s) return false;
  if (position === 0xffff) return false;
  const si = structureInfo[s.o.type];
  switch (s.o.type) {
    case STRUCTURE.WALL: {
      if (structureIsValidBuildLocation(position, STRUCTURE.WALL) === 0) return false;
      const t = G.map[position];
      t.groundTileID = G.wallTileID + 1;
      t.houseID = s.o.houseID;
      G.mapTileID[position] |= 0x8000;
      if (isHuman(s.o.houseID)) tileRemoveFogInRadius(unpackTile(position), 1, s.o.houseID);
      if (mapIsPositionUnveiled(position)) t.overlayTileID = 0;
      structureConnectWall(position, true);
      structureFree(s);
      return true;
    }
    case STRUCTURE.SLAB_1x1:
    case STRUCTURE.SLAB_2x2: {
      let result = 0;
      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i < layoutTileCount[si.layout]; i++) {
          const curPos = position + layoutTiles[si.layout][i];
          const t = G.map[curPos];
          if (t.groundTileID === G.builtSlabTileID && t.houseID === s.o.houseID) continue;
          if (structureIsValidBuildLocation(curPos, STRUCTURE.SLAB_1x1) === 0) continue;
          t.groundTileID = G.builtSlabTileID;
          t.houseID = s.o.houseID;
          G.mapTileID[curPos] |= 0x8000;
          if (isHuman(s.o.houseID)) tileRemoveFogInRadius(unpackTile(curPos), 1, s.o.houseID);
          if (mapIsPositionUnveiled(curPos)) t.overlayTileID = 0;
          result = 1;
          changed = true;
        }
      }
      if (result === 0) return false;
      structureFree(s);
      return true;
    }
  }

  // Правило владельца (2026-10-20), для всех домов и режимов: на клетку, где стоит чужое здание или чужой юнит,
  // здание не ставится. В MD двор ИИ ставил восстановленное здание поверх юнитов игрока и давил их; теперь
  // постановка не проходит, двор возвращает деньги и пробует позже (запись в ai_structureRebuild остаётся).
  // Свои юниты на месте ИИ, как в MD, убираются ниже. Загрузка сценария (validateStrictIfZero) не проверяется.
  if (G.validateStrictIfZero === 0) {
    for (let i = 0; i < layoutTileCount[si.layout]; i++) {
      const curPos = u16(position + layoutTiles[si.layout][i]);
      const other = structureGetByPackedTile(curPos);
      if (other && other !== s && other.o.flags.used) return false;
      const unit = unitGetByPackedTile(curPos);
      if (unit && unit.o.flags.used && unitGetHouseID(unit) !== s.o.houseID) return false;
    }
  }
  const validBuildLocation = structureIsValidBuildLocation(position, s.o.type);
  if (validBuildLocation === 0 && isHuman(s.o.houseID) && G.validateStrictIfZero === 0) return false;
  if (isHuman(s.o.houseID)) tileRemoveFogInRadius(unpackTile(position), 2, s.o.houseID);
  s.o.seenByHouses |= 1 << s.o.houseID;
  if (isHuman(s.o.houseID)) s.o.seenByHouses |= 0xff;
  s.o.flags.isNotOnMap = false;
  s.o.position = unpackTile(position);
  s.o.position.x &= 0xff00;
  s.o.position.y &= 0xff00;
  s.rotationSpriteDiff = 0;
  s.o.hitpoints = si.o.hitpoints;
  s.hitpointsMax = si.o.hitpoints;
  if (validBuildLocation < 0) {
    const tilesWithoutSlab = -validBuildLocation;
    const structureTileCount = layoutTileCount[si.layout];
    s.o.hitpoints -= idiv(idiv(si.o.hitpoints, 2) * tilesWithoutSlab, structureTileCount);
    s.o.flags.degrades = true;
  } else {
    s.o.flags.degrades = true;
  }
  scriptReset(s.o.script, G.scriptStructure);
  s.o.script.variables[0] = 0;
  s.o.script.variables[4] = 0;
  s.o.script.delay = 0;
  scriptReset(s.o.script, s.o.script.scriptInfo);
  scriptLoad(s.o.script, s.o.type);
  for (let i = 0; i < layoutTileCount[si.layout]; i++) {
    const curPos = position + layoutTiles[si.layout][i];
    unitRemove(unitGetByPackedTile(curPos));
  }
  if (s.o.type === STRUCTURE.WINDTRAP) G.houses[s.o.houseID].windtrapCount += 1;
  if (G.validateStrictIfZero === 0) houseCalculatePowerAndCredit(G.houses[s.o.houseID]);
  structureUpdateMap(s);
  const h = G.houses[s.o.houseID];
  h.structuresBuilt = structureGetStructuresBuilt(h);
  return true;
}

export function structureCalculateHitpointsMax(h: House | null): void {
  if (!h) return;
  if (isHuman(h.index)) houseUpdateRadarState(h);
  const power = h.powerUsage === 0 ? 256 : Math.min(idiv(h.powerProduction * 256, h.powerUsage), 256);
  const find = findAll(h.index);
  for (;;) {
    const s = structureFind(find);
    if (!s) return;
    if (isSlabOrWall(s.o.type)) continue;
    const si = structureInfo[s.o.type];
    s.hitpointsMax = idiv(si.o.hitpoints * power, 256);
    s.hitpointsMax = Math.max(s.hitpointsMax, idiv(si.o.hitpoints, 2));
    if (s.hitpointsMax >= s.o.hitpoints) continue;
    structureDamage(s, 1, 0);
  }
}

export function structureSetState(s: Structure | null, state: number): void {
  if (!s) return;
  s.state = state;
  structureUpdateMap(s);
}

export function structureGetByPackedTile(packed: number): Structure | null {
  if ((packed & 0xf000) !== 0) return null;
  const t = G.map[packed];
  if (!t.hasStructure) return null;
  return G.structures[t.index - 1] ?? null;
}

export function structureGetStructuresBuilt(h: House | null): number {
  if (!h) return 0;
  let result = 0;
  h.windtrapCount = 0;
  const find = findAll(h.index);
  for (;;) {
    const s = structureFind(find);
    if (!s) break;
    if (s.o.flags.isNotOnMap) continue;
    if (isSlabOrWall(s.o.type)) continue;
    result |= 1 << s.o.type;
    if (s.o.type === STRUCTURE.WINDTRAP) h.windtrapCount++;
  }
  return result >>> 0;
}

export function structureIsValidBuildLocation(position: number, type: number): number {
  const si = structureInfo[type];
  const layoutTile = layoutTiles[si.layout];

  if (type === STRUCTURE.SLAB_2x2) {
    // В оригинале Dune II плиты 2×2 можно ставить, даже если подходят не все 4 клетки
    // (например, край скалы у песка — укладываются только доступные 1, 2 или 3 клетки).
    const paved = new Set<number>();
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < layoutTileCount[si.layout]; i++) {
        const curPos = u16(position + layoutTile[i]);
        if (paved.has(curPos)) continue;
        if (!mapIsValidPosition(curPos)) continue;
        const lst = mapGetLandscapeType(curPos);
        if (!landscapeInfo[lst].isValidForStructure && G.validateStrictIfZero === 0) continue;
        if (objectGetByPackedTile(curPos) !== null) continue;
        const t = G.map[curPos];
        if (t.groundTileID === G.builtSlabTileID && t.houseID === placer()) continue;

        let connected = false;
        if (G.validateStrictIfZero !== 0) {
          connected = true;
        } else {
          for (let j = 0; j < 16; j++) {
            const offset = layoutTilesAround[0][j];
            if (offset === 0) break;
            const adjPos = u16(curPos + offset);
            if (paved.has(adjPos)) {
              connected = true;
              break;
            }
            const s = structureGetByPackedTile(adjPos);
            if (s && s.o.houseID === placer()) {
              connected = true;
              break;
            }
            const alst = mapGetLandscapeType(adjPos);
            if ((alst === LST.CONCRETE_SLAB || alst === LST.WALL) && G.map[adjPos & 0xfff].houseID === placer()) {
              connected = true;
              break;
            }
          }
        }
        if (connected) {
          paved.add(curPos);
          changed = true;
        }
      }
    }
    return paved.size > 0 ? 1 : 0;
  }

  let isValid = true;
  let neededSlabs = 0;
  for (let i = 0; i < layoutTileCount[si.layout]; i++) {
    const curPos = u16(position + layoutTile[i]);
    const lst = mapGetLandscapeType(curPos);
    if (!mapIsValidPosition(curPos)) {
      isValid = false;
      break;
    }
    if (si.o.flags.notOnConcrete) {
      if (!landscapeInfo[lst].isValidForStructure2 && G.validateStrictIfZero === 0) {
        isValid = false;
        break;
      }
    } else {
      if (!landscapeInfo[lst].isValidForStructure && G.validateStrictIfZero === 0) {
        isValid = false;
        break;
      }
      if (lst !== LST.CONCRETE_SLAB) neededSlabs++;
    }
    if (objectGetByPackedTile(curPos) !== null) {
      isValid = false;
      break;
    }
  }
  if (G.validateStrictIfZero === 0 && isValid && type !== STRUCTURE.CONSTRUCTION_YARD) {
    isValid = false;
    for (let i = 0; i < 16; i++) {
      const offset = layoutTilesAround[si.layout][i];
      if (offset === 0) break;
      const curPos = u16(position + offset);
      const s = structureGetByPackedTile(curPos);
      if (s) {
        if (s.o.houseID !== placer()) continue;
        isValid = true;
        break;
      }
      const lst = mapGetLandscapeType(curPos);
      if (lst !== LST.CONCRETE_SLAB && lst !== LST.WALL) continue;
      if (G.map[curPos & 0xfff].houseID !== placer()) continue;
      isValid = true;
      break;
    }
  }
  if (!isValid) return 0;
  if (neededSlabs === 0) return 1;
  return -neededSlabs;
}

/** Подробная проверка каждой клетки здания/плиты для отрисовки штриховки (зелёная/красная). */
export function structurePlacementDetail(position: number, type: number): { valid: number; cells: boolean[] } {
  const si = structureInfo[type];
  const layoutTile = layoutTiles[si.layout];
  const count = layoutTileCount[si.layout];
  const valid = structureIsValidBuildLocation(position, type);

  if (type === STRUCTURE.SLAB_2x2) {
    const paved = new Set<number>();
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < count; i++) {
        const curPos = u16(position + layoutTile[i]);
        if (paved.has(curPos)) continue;
        if (!mapIsValidPosition(curPos)) continue;
        const lst = mapGetLandscapeType(curPos);
        if (!landscapeInfo[lst].isValidForStructure && G.validateStrictIfZero === 0) continue;
        if (objectGetByPackedTile(curPos) !== null) continue;
        const t = G.map[curPos];
        if (t.groundTileID === G.builtSlabTileID && t.houseID === placer()) continue;

        let connected = false;
        if (G.validateStrictIfZero !== 0) {
          connected = true;
        } else {
          for (let j = 0; j < 16; j++) {
            const offset = layoutTilesAround[0][j];
            if (offset === 0) break;
            const adjPos = u16(curPos + offset);
            if (paved.has(adjPos)) {
              connected = true;
              break;
            }
            const s = structureGetByPackedTile(adjPos);
            if (s && s.o.houseID === placer()) {
              connected = true;
              break;
            }
            const alst = mapGetLandscapeType(adjPos);
            if ((alst === LST.CONCRETE_SLAB || alst === LST.WALL) && G.map[adjPos & 0xfff].houseID === placer()) {
              connected = true;
              break;
            }
          }
        }
        if (connected) {
          paved.add(curPos);
          changed = true;
        }
      }
    }
    const cells: boolean[] = [];
    for (let i = 0; i < count; i++) {
      const curPos = u16(position + layoutTile[i]);
      cells.push(paved.has(curPos));
    }
    return { valid, cells };
  }

  let touchesBase = (type === STRUCTURE.CONSTRUCTION_YARD || G.validateStrictIfZero !== 0);
  if (!touchesBase) {
    for (let i = 0; i < 16; i++) {
      const offset = layoutTilesAround[si.layout][i];
      if (offset === 0) break;
      const curPos = u16(position + offset);
      const s = structureGetByPackedTile(curPos);
      if (s && s.o.houseID === placer()) {
        touchesBase = true;
        break;
      }
      const lst = mapGetLandscapeType(curPos);
      if ((lst === LST.CONCRETE_SLAB || lst === LST.WALL) && G.map[curPos & 0xfff]?.houseID === placer()) {
        touchesBase = true;
        break;
      }
    }
  }

  const cells: boolean[] = [];
  for (let i = 0; i < count; i++) {
    const curPos = u16(position + layoutTile[i]);
    if (!touchesBase || !mapIsValidPosition(curPos)) {
      cells.push(false);
      continue;
    }
    const lst = mapGetLandscapeType(curPos);
    let ok = si.o.flags.notOnConcrete ? landscapeInfo[lst].isValidForStructure2 : landscapeInfo[lst].isValidForStructure;
    if (objectGetByPackedTile(curPos) !== null) ok = 0;
    cells.push(ok !== 0);
  }
  return { valid, cells };
}

export function structureActivateSpecial(s: Structure | null): void {
  if (!s) return;
  if (s.o.type !== STRUCTURE.PALACE) return;
  const h = G.houses[s.o.houseID];
  if (!h.flags.used) return;
  switch (houseInfo[s.o.houseID].specialWeapon) {
    case HOUSE_WEAPON.MISSILE: {
      G.validateStrictIfZero++;
      const u = unitCreate(INDEX_INVALID, UNIT.MISSILE_HOUSE, s.o.houseID, { x: 0xffff, y: 0xffff }, random256());
      G.validateStrictIfZero--;
      G.unitHouseMissile = u;
      if (!u) break;
      s.countDown = houseInfo[s.o.houseID].specialCountDown;
      s.specialWait = 300; // $022D98
      if (!h.flags.human) {
        const find = findAll();
        for (;;) {
          const sf = structureFind(find);
          if (!sf) break;
          if (isSlabOrWall(sf.o.type)) continue;
          if (houseAreAllied(s.o.houseID, sf.o.houseID)) continue;
          unitLaunchHouseMissile(packTile(sf.o.position));
          return;
        }
        unitFree(u);
        G.unitHouseMissile = null;
        return;
      }
      G.houseMissileCountdown = 7;
      G.selectionType = SELECTION.TARGET;
      break;
    }
    case HOUSE_WEAPON.FREMEN: {
      const location = mapFindLocationTile(4, 0xff);
      for (let i = 0; i < 5; i++) {
        random256();
        let position = unpackTile(location);
        position = tileMoveByRandom(position, 32, true);
        const orientation = randomRange(0, 3);
        const unitType = orientation === 1 ? UNIT.TROOPER : UNIT.TROOPERS;
        G.validateStrictIfZero++;
        // Reinforcements belong to the summoning player. A separate Fremen
        // house cannot be commanded and may belong to an opponent online.
        const u = unitCreate(INDEX_INVALID, unitType, s.o.houseID, position, orientation);
        G.validateStrictIfZero--;
        if (!u) continue;
        unitSetAction(u, isHuman(s.o.houseID) ? ACTION.GUARD : ACTION.HUNT);
      }
      s.countDown = houseInfo[s.o.houseID].specialCountDown;
      s.specialWait = 180; // $02301C
      break;
    }
    case HOUSE_WEAPON.SABOTEUR: {
      const position = structureFindFreePosition(s, false);
      if (position === 0) {
        s.countDown = 1;
        return;
      }
      G.validateStrictIfZero++;
      const u = unitCreate(INDEX_INVALID, UNIT.SABOTEUR, s.o.houseID, unpackTile(position), random256());
      G.validateStrictIfZero--;
      if (!u) return;
      unitSetAction(u, isHuman(s.o.houseID) ? ACTION.GUARD : ACTION.SABOTAGE);
      s.countDown = houseInfo[s.o.houseID].specialCountDown;
      s.specialWait = 240; // $0230B4
      break;
    }
  }
}

export function structureRemoveFog(s: Structure | null): void {
  if (!s || (!isHuman(s.o.houseID) && !G.net)) return;
  tileRemoveFogInRadius(s.o.position, structureInfo[s.o.type].o.fogUncoverRadius, s.o.houseID);
}

function structureDestroy(s: Structure | null): void {
  if (!s) return;
  s.o.script.variables[0] = 1;
  s.o.flags.allocated = false;
  s.o.flags.repairing = false;
  s.o.script.delay = 0;
  scriptReset(s.o.script, G.scriptStructure);
  scriptLoad(s.o.script, s.o.type);
  G.onSound(44, s.o.position);
  let linkedID = s.o.linkedID;
  if (linkedID !== 0xff) {
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
      // Unplaced production has no world script to finish its destruction.
      structureFree(G.structures[linkedID]);
      s.o.linkedID = 0xff;
    } else {
      while (linkedID !== 0xff) {
        const u = G.units[linkedID];
        linkedID = u.o.linkedID;
        unitRemove(u);
      }
    }
  }
  for (const index of s.readyUnits ?? []) unitRemove(G.units[index]);
  s.o.linkedID = 0xff;
  s.readyUnits = [];
  s.readyBuildings = [];
  s.unitQueue = [];
  s.buildingQueue = [];
  s.prepaidBuildingCost = s.prepaidUnitCost = undefined;
  const h = G.houses[s.o.houseID];
  const si = structureInfo[s.o.type];
  h.credits -= h.creditsStorage === 0 ? h.credits : Math.min(h.credits, idiv(idiv(h.credits * 256, h.creditsStorage) * si.creditsStorage, 256));
  if (!isHuman(s.o.houseID)) h.credits += si.o.buildCredits + (G.campaignID > 7 ? idiv(si.o.buildCredits, 2) : 0);
  if (s.o.type !== STRUCTURE.WINDTRAP) return;
  h.windtrapCount--;
}

export function structureDamage(s: Structure | null, damage: number, range: number): boolean {
  if (!s) return false;
  if (G.playtester && s.o.houseID === G.playerHouseID) return false;
  if (damage === 0) return false;
  if (s.o.script.variables[0] === 1) return false;
  const si = structureInfo[s.o.type];
  s.o.hitpoints = s.o.hitpoints >= damage ? s.o.hitpoints - damage : 0;
  if (s.o.hitpoints === 0) {
    const score = Math.max(idiv(si.o.buildCredits, 100), 1);
    if (houseAlliedToHuman(s.o.houseID)) {
      G.scenario.destroyedAllied++;
      // MD $00F980: очков не меньше нуля
      G.scenario.score -= Math.min(score, Math.max(0, G.scenario.score));
    } else {
      G.scenario.destroyedEnemy++;
      G.scenario.score += score;
    }
    structureDestroy(s);
    if (isLocal(s.o.houseID)) {
      const index = [22, 23, 24][s.o.houseID] ?? 0xffff;
      G.onFeedback(index);
    } else if (!G.net) {
      G.onFeedback(21);
    }
    structureUntargetMe(s);
    return true;
  }
  if (range === 0) return false;
  mapMakeExplosion(EXPLOSION.IMPACT_LARGE, tileAddDiff(s.o.position, layoutTileDiff[si.layout]), 0, 0);
  return false;
}

export function structureIsUpgradable(s: Structure | null): boolean {
  if (!s) return false;
  const si = structureInfo[s.o.type];
  if (s.o.houseID === HOUSE.HARKONNEN && s.o.type === STRUCTURE.HIGH_TECH) return false;
  if (s.o.houseID === HOUSE.ORDOS && s.o.type === STRUCTURE.HEAVY_VEHICLE && s.upgradeLevel === 1 && si.upgradeCampaign[2] > G.campaignID) return false;
  const uc = si.upgradeCampaign[s.upgradeLevel] ?? 0;
  if (uc !== 0 && uc <= G.campaignID + 1) {
    if (s.o.type !== STRUCTURE.CONSTRUCTION_YARD) return true;
    if (s.upgradeLevel !== 1) return true;
    const h = G.houses[s.o.houseID];
    const req = structureInfo[STRUCTURE.ROCKET_TURRET].o.structuresRequired;
    return (h.structuresBuilt & req) >>> 0 === req;
  }
  if (s.o.houseID === HOUSE.HARKONNEN && s.o.type === STRUCTURE.WOR_TROOPER && s.upgradeLevel === 0 && G.campaignID > 3) return true;
  return false;
}

// prettier-ignore
const WALL = [
  0, 3, 1, 2, 3, 3, 4, 5, 1, 6, 1, 7, 8, 9, 10, 11, 1, 12, 1, 19, 1, 16, 1, 31, 1, 28, 1, 52, 1, 45, 1, 59, 3, 3, 13, 20, 3, 3, 22, 32,
  3, 3, 13, 53, 3, 3, 38, 60, 5, 6, 7, 21, 5, 6, 7, 33, 5, 6, 7, 54, 5, 6, 7, 61, 9, 9, 9, 9, 17, 17, 23, 34, 9, 9, 9, 9, 25, 46, 39, 62,
  11, 12, 11, 12, 13, 18, 13, 35, 11, 12, 11, 12, 13, 47, 13, 63, 15, 15, 16, 16, 17, 17, 24, 36, 15, 15, 16, 16, 17, 17, 40, 64, 19, 20,
  21, 22, 23, 24, 25, 37, 19, 20, 21, 22, 23, 24, 25, 65, 27, 27, 27, 27, 27, 27, 27, 27, 14, 29, 14, 55, 26, 48, 41, 66, 29, 30, 29, 30,
  29, 30, 29, 30, 31, 30, 31, 56, 31, 49, 31, 67, 33, 33, 34, 34, 33, 33, 34, 34, 35, 35, 15, 57, 35, 35, 42, 68, 37, 38, 39, 40, 37, 38,
  39, 40, 41, 42, 43, 58, 41, 42, 43, 69, 45, 45, 45, 45, 46, 46, 46, 46, 47, 47, 47, 47, 27, 50, 43, 70, 49, 50, 49, 50, 51, 52, 51, 52,
  53, 54, 53, 54, 55, 51, 55, 71, 57, 57, 58, 58, 59, 59, 60, 60, 61, 61, 62, 62, 63, 63, 44, 72, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
  75, 76, 77, 78, 79, 73,
];

/** Structure_ConnectWall. В MD всего 12 видов стены (иконки 34–45): соседство с разрушенной стеной не различается. */
export function structureConnectWall(position: number, recurse: boolean): boolean {
  let bits = 0;
  const isDestroyedWall = mapGetLandscapeType(position) === LST.DESTROYED_WALL;
  for (let i = 0; i < 4; i++) {
    const curPos = u16(position + tableMapDiff[i]);
    if (recurse && mapGetLandscapeType(curPos) === LST.WALL) structureConnectWall(curPos, false);
    if (isDestroyedWall) continue;
    const lst = mapGetLandscapeType(curPos);
    if (lst === LST.DESTROYED_WALL) bits |= 1 << (i + 4);
    if (lst === LST.DESTROYED_WALL || lst === LST.WALL) bits |= 1 << i;
  }
  if (isDestroyedWall) return false;
  const tileID = G.wallTileID + WALL[bits & 0x0f] + 1;
  const t = G.map[position];
  if (t.groundTileID === tileID) return false;
  t.groundTileID = tileID;
  G.mapTileID[position] |= 0x8000;
  return true;
}

export function structureGetLinkedUnit(s: Structure): Unit | null {
  if (s.o.linkedID === 0xff) return null;
  return G.units[s.o.linkedID];
}

export function structureUntargetMe(s: Structure): void {
  const encoded = indexEncode(s.o.index, IT.STRUCTURE);
  objectScriptVariable4Clear(s.o);
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
    const t = teamFind(find);
    if (!t) break;
    if (t.target === encoded) t.target = 0;
  }
}

export function structureFindFreePosition(s: Structure | null, checkForSpice: boolean): number {
  if (!s) return 0;
  const si = structureInfo[s.o.type];
  const packed = packTile(tileCenter(s.o.position));
  const spicePacked = checkForSpice ? mapSearchSpice(packed, 10) : 0;
  let bestPacked = 0;
  let bestDistance = 0;
  let i = random256() & 0xf;
  for (let j = 0; j < 16; j++, i = (i + 1) & 0xf) {
    const offset = layoutTilesAround[si.layout][i];
    if (offset === 0) continue;
    const curPacked = u16(packed + offset);
    if (!mapIsValidPosition(curPacked)) continue;
    const type = mapGetLandscapeType(curPacked);
    if (type === LST.WALL || type === LST.ENTIRELY_MOUNTAIN || type === LST.PARTIAL_MOUNTAIN) continue;
    const t = G.map[curPacked];
    if (t.hasUnit || t.hasStructure) continue;
    if (!checkForSpice) return curPacked;
    const d = tileGetDistancePacked(curPacked, spicePacked);
    if (bestDistance === 0 || d < bestDistance) {
      bestPacked = curPacked;
      bestDistance = d;
    }
  }
  return bestPacked;
}

export function structureRemove(s: Structure | null): void {
  if (!s) return;
  const si = structureInfo[s.o.type];
  const packed = packTile(s.o.position);
  for (let i = 0; i < layoutTileCount[si.layout]; i++) {
    const curPacked = packed + layoutTiles[si.layout][i];
    animationStopByTile(curPacked);
    G.map[curPacked].hasStructure = false;
  }
  animationStart(animationStructureRubble, s.o.position, si.layout, s.o.houseID, si.iconGroup);
  const h = G.houses[s.o.houseID];
  for (let i = 0; i < 5; i++) {
    if (h.ai_structureRebuild[i][0] !== 0) continue;
    h.ai_structureRebuild[i][0] = s.o.type;
    h.ai_structureRebuild[i][1] = packed;
    break;
  }
  structureFree(s);
  structureUntargetMe(s);
  h.structuresBuilt = structureGetStructuresBuilt(h);
  houseUpdateCreditsStorage(s.o.houseID);
  switch (s.o.type) {
    case STRUCTURE.WINDTRAP:
      houseCalculatePowerAndCredit(h);
      break;
    case STRUCTURE.OUTPOST:
      houseUpdateRadarState(h);
      break;
  }
}

export function structureCheckAvailableConcrete(structureType: number, houseID: number): boolean {
  const si = structureInfo[structureType];
  const tileCount = layoutTileCount[si.layout];
  if (structureType === STRUCTURE.SLAB_1x1 || structureType === STRUCTURE.SLAB_2x2) return true;
  for (let i = 0; i < 4096; i++) {
    let stop = true;
    for (let j = 0; j < tileCount; j++) {
      const packed = (i + layoutTiles[si.layout][j]) & 0xffff;
      if ((packed & 0xf000) === 0 && mapGetLandscapeType(packed) === LST.CONCRETE_SLAB && G.map[packed].houseID === houseID) continue;
      stop = false;
      break;
    }
    if (stop) return true;
  }
  return false;
}

export function structureCancelBuild(s: Structure | null): void {
  if (!s || s.o.linkedID === 0xff) return;
  let oi;
  if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
    const s2 = G.structures[s.o.linkedID];
    oi = structureInfo[s2.o.type].o;
    structureFree(s2);
  } else {
    const u = G.units[s.o.linkedID];
    oi = unitInfo[u.o.type].o;
    unitFree(u);
  }
  G.houses[s.o.houseID].credits += s.prepaidBuildingCost??s.prepaidUnitCost??idiv(idiv((oi.buildTime - (s.countDown >> 8)) * 256, oi.buildTime) * oi.buildCredits, 256);
  s.prepaidUnitCost=undefined;s.prepaidBuildingCost=undefined;
  s.o.flags.onHold = false;
  s.countDown = 0;
  s.o.linkedID = 0xff;
}

/** Заполняет o.available у юнитов в космопорте (как GUI_DisplayFactoryWindow перед показом). */
export function structureStarportPrepare(s: Structure): void {
  let linkedID = 0xff;
  const availableUnits = new Array(UNIT.MAX).fill(0);
  let loop: boolean;
  do {
    loop = false;
    for (let i = 0; i < UNIT.MAX; i++) {
      const unitsAtStarport = G.starportAvailable[i];
      if (unitsAtStarport === 0) unitInfo[i].o.available = 0;
      else if (unitsAtStarport < 0) unitInfo[i].o.available = -1;
      else if (unitsAtStarport > availableUnits[i]) {
        G.validateStrictIfZero++;
        const u = unitAllocate(INDEX_INVALID, i, s.o.houseID);
        G.validateStrictIfZero--;
        if (u) {
          loop = true;
          u.o.linkedID = linkedID;
          linkedID = u.o.index;
          availableUnits[i]++;
          unitInfo[i].o.available = availableUnits[i];
        } else if (availableUnits[i] === 0) unitInfo[i].o.available = -1;
      }
    }
  } while (loop);
  while (linkedID !== 0xff) {
    const u = G.units[linkedID];
    linkedID = u.o.linkedID;
    unitFree(u);
  }
}

/** Покупка в космопорте (ветка FACTORY_BUY): items — типы юнитов по одному на каждый купленный. */
export function structureStarportBuy(s: Structure, items: number[]): void {
  const h = G.houses[s.o.houseID];
  for (const objectType of items) {
    G.validateStrictIfZero++;
    const u = unitCreate(INDEX_INVALID, objectType, s.o.houseID, { x: 0xffff, y: 0xffff }, 0);
    G.validateStrictIfZero--;
    if (!u) {
      h.credits += unitInfo[UNIT.CARRYALL].o.buildCredits;
      if (isLocal(s.o.houseID)) G.onMessage(msg.unableToCreateMore, 2);
      continue;
    }
    G.structureIndex = s.o.index;
    if (h.starportTimeLeft === 0) h.starportTimeLeft = houseInfo[h.index].starportDeliveryTime;
    u.o.linkedID = h.starportLinkedID === INDEX_INVALID ? 0xff : h.starportLinkedID;
    h.starportLinkedID = u.o.index;
    G.starportAvailable[objectType]--;
    if (G.starportAvailable[objectType] <= 0) G.starportAvailable[objectType] = -1;
  }
}

/**
 * Structure_BuildObject. objectType: тип юнита/здания, 0xFFFD — улучшение, 0xFFFE — выбрать первый
 * доступный, 0xFFFF — окно завода (его показывает интерфейс, здесь — только подготовка списка).
 */
export function structureBuildObject(s: Structure | null, objectType: number, quiet=false): boolean {
  if (!s) return false;
  if(s.o.type===STRUCTURE.DRONE_PAD&&objectType===UNIT.COMBAT_DRONE&&padDroneLoad(s,false)>=DRONES_PER_PAD)return false;
  if(s.o.type===STRUCTURE.DRONE_PAD&&objectType===UNIT.COMBAT_DRONE&&!isHuman(s.o.houseID)&&!houseHasDroneRoom(s.o.houseID))return false;
  const si = structureInfo[s.o.type];
  if (!si.o.flags.factory) return false;
  if(objectType===UNIT.LASER_TANK||objectType===UNIT.COMBAT_DRONE||s.o.type===STRUCTURE.CONSTRUCTION_YARD&&objectType===STRUCTURE.DRONE_PAD){
    if((structureGetBuildable(s)&(1<<objectType))===0)return false;
  }
  structureSetRepairingState(s, 0);
  if (objectType === 0xfffd) {
    structureSetUpgradingState(s, 1);
    return false;
  }
  if (objectType === 0xffff || objectType === 0xfffe) {
    const buildable = structureGetBuildable(s);
    if (buildable === 0) {
      s.objectType = 0;
      return false;
    }
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
      G.factoryWindowConstructionYard = true;
      for (let i = 0; i < STRUCTURE.MAX; i++) {
        if ((buildable & (1 << i)) === 0) continue;
        structureInfo[i].o.available = 1;
        if (objectType !== 0xfffe) continue;
        s.objectType = i;
        return false;
      }
    } else {
      G.factoryWindowConstructionYard = false;
      if (s.o.type === STRUCTURE.STARPORT) {
        structureStarportPrepare(s);
      } else {
        for (let i = 0; i < UNIT.MAX; i++) {
          if ((buildable & (1 << i)) === 0) continue;
          unitInfo[i].o.available = 1;
          if (objectType !== 0xfffe) continue;
          s.objectType = i;
          return false;
        }
      }
    }
    if (objectType === 0xffff) return false;
    s.objectType = objectType;
  }
  if (s.o.type === STRUCTURE.STARPORT) return true;
  if (s.objectType !== objectType) structureCancelBuild(s);
  if (s.o.linkedID !== 0xff || objectType === 0xffff) return false;
  let o;
  let oi;
  if (s.o.type !== STRUCTURE.CONSTRUCTION_YARD) {
    oi = unitInfo[objectType].o;
    o = unitCreate(INDEX_INVALID, objectType, s.o.houseID, { x: 0xffff, y: 0xffff }, 0)?.o;
  } else {
    oi = structureInfo[objectType].o;
    o = structureCreate(INDEX_INVALID, objectType, s.o.houseID, 0xffff)?.o;
  }
  s.o.flags.onHold = false;
  if (o) {
    s.o.linkedID = o.index;
    s.objectType = objectType;
    s.spent = 0;
    s.countDown = oi.buildTime << 8;
    structureSetState(s, STATE.BUSY);
    if (!isLocal(s.o.houseID)) return true;
    G.onMessage(msg.productionStarted(s.o.type, objectType), 2);
    if(s.o.type===STRUCTURE.CONSTRUCTION_YARD)G.onConstructionStart();
    return true;
  }
  if (!isLocal(s.o.houseID)) return false;
  if(!quiet)G.onMessage(msg.unableToCreateMore, 2);
  return false;
}

export function structureCanQueueUnits(s:Structure):boolean{
  return isHuman(s.o.houseID)&&!!structureInfo[s.o.type].o.flags.factory&&s.o.type!==STRUCTURE.CONSTRUCTION_YARD&&s.o.type!==STRUCTURE.STARPORT&&s.o.type!==STRUCTURE.REPAIR;
}
/** Reserve the full price on acceptance; the ROM build tick must not charge it again. */
export function structureEnqueueUnit(s:Structure,type:number):boolean{
  if(!s.o.flags.allocated||!structureCanQueueUnits(s)||type<0||type>=UNIT.MAX||!(structureGetBuildable(s)&(1<<type)))return false;
  if(s.o.type===STRUCTURE.DRONE_PAD&&type===UNIT.COMBAT_DRONE&&padDroneLoad(s)>=DRONES_PER_PAD)return false;
  if(type===UNIT.COMBAT_DRONE&&!houseHasDroneRoom(s.o.houseID))return false;
  const queue=s.unitQueue??=[],cost=unitInfo[type].o.buildCredits,h=G.houses[s.o.houseID];
  if(G.net&&networkUnitCount(s.o.houseID)+G.structureFind.filter(st=>st.o.houseID===s.o.houseID).reduce((n,st)=>n+(st.unitQueue?.length??0),0)>=NETWORK_UNIT_LIMIT)return false;
  if(queue.length+(s.readyUnits?.length??0)+(s.o.linkedID!==0xff?1:0)>=20||h.credits<cost)return false;
  h.credits-=cost;queue.push({type,cost});s.unitQueue=queue;structureStartNextUnit(s);return true;
}
function structureStartNextUnit(s:Structure):void{
  if(s.o.linkedID!==0xff||!s.o.flags.allocated)return;
  s.prepaidUnitCost=undefined;
  if(!s.unitQueue?.length||s.o.flags.onHold||s.o.flags.repairing||s.o.flags.upgrading)return;
  const item=s.unitQueue[0];
  if(structureBuildObject(s,item.type,true)){s.unitQueue.shift();s.prepaidUnitCost=item.cost;}
}
export function structureCancelQueuedUnit(s:Structure,index:number):boolean{
  if(!Number.isInteger(index)||index<0||!s.unitQueue||index>=s.unitQueue.length)return false;
  const [item]=s.unitQueue.splice(index,1);G.houses[s.o.houseID].credits+=item.cost;return true;
}

/** Full price is reserved immediately; completed buildings wait outside production. */
export function structureEnqueueBuilding(s:Structure,type:number):boolean{
  if(!s.o.flags.allocated||s.o.type!==STRUCTURE.CONSTRUCTION_YARD||type<0||type>=STRUCTURE.MAX)return false;
  const queue=s.buildingQueue??[],active=s.o.linkedID!==0xff;
  const available=structureGetBuildable(s),current=active&&s.objectType===type;
  if(!current&&(available&(1<<type))===0)return false;
  if(G.net&&!isSlabOrWall(type)&&networkStructureCount(s.o.houseID)+G.structureFind.filter(st=>st.o.houseID===s.o.houseID).reduce((n,st)=>n+(st.buildingQueue?.filter(item=>!isSlabOrWall(item.type)).length??0),0)>=NETWORK_STRUCTURE_LIMIT)return false;
  // Дворец и космопорт можно зарезервировать только один раз на весь дом,
  // включая стройку и очереди у других строительных дворов.
  if(type===STRUCTURE.PALACE||type===STRUCTURE.STARPORT){
    const reserved=G.structures.some(st=>st.o.flags.used&&st.o.houseID===s.o.houseID&&st.o.type===type)||
      G.structures.some(yard=>yard.o.flags.used&&yard.o.houseID===s.o.houseID&&yard.o.type===STRUCTURE.CONSTRUCTION_YARD&&(yard.buildingQueue?.some(item=>item.type===type)||yard.readyBuildings?.some(item=>item.type===type)));
    if(reserved||queue.some(item=>item.type===type))return false;
  }
  if(queue.length+(s.readyBuildings?.length??0)+(active?1:0)>=20)return false;
  const cost=structureInfo[type].o.buildCredits,h=G.houses[s.o.houseID];
  if(h.credits<cost)return false;
  h.credits-=cost;queue.push({type,cost});s.buildingQueue=queue;
  structureStartNextBuilding(s);
  return true;
}

export function structureStartNextBuilding(s:Structure):void{
  if(!s.o.flags.allocated||s.o.type!==STRUCTURE.CONSTRUCTION_YARD||s.o.linkedID!==0xff)return;
  if(s.o.flags.onHold||s.o.flags.repairing)return;
  const queue=s.buildingQueue??[],item=queue[0];
  if(!item){s.prepaidBuildingCost=undefined;return;}
  s.prepaidBuildingCost=undefined;
  if(!structureBuildObject(s,item.type,true))return;
  queue.shift();s.prepaidBuildingCost=item.cost;
}

export function structureCancelQueuedBuilding(s:Structure,index:number):boolean{
  if(!Number.isInteger(index)||index<0||!s.buildingQueue||index>=s.buildingQueue.length)return false;
  const [item]=s.buildingQueue.splice(index,1);G.houses[s.o.houseID].credits+=item.cost;return true;
}

export function structureSetUpgradingState(s: Structure | null, state: number): boolean {
  let ret = false;
  if (!s) return false;
  const parallelYard = s.o.type === STRUCTURE.CONSTRUCTION_YARD;
  if (state === -1) state = s.o.flags.upgrading ? 0 : 1;
  if (state === 0 && s.o.flags.upgrading) {
    if (isLocal(s.o.houseID)) G.onMessage(msg.upgradingStops, 2);
    s.o.flags.upgrading = false;
    s.upgradeSpent = 0;
    if (!parallelYard) s.o.flags.onHold = false;
    ret = true;
  }
  if (state === 0 || s.o.flags.upgrading || s.upgradeTimeLeft === 0) return ret;
  if (isLocal(s.o.houseID)) G.onMessage(msg.upgradingStarts, 2);
  s.upgradeSpent = 0;
  if (!parallelYard) {
    s.o.flags.onHold = true;
    s.o.flags.repairing = false;
  }
  s.o.flags.upgrading = true;
  return true;
}

export function structureSetRepairingState(s: Structure | null, state: number): boolean {
  let ret = false;
  if (!s) return false;
  if (!s.o.flags.allocated) state = 0;
  if (state === -1) state = s.o.flags.repairing ? 0 : 1;
  if (state === 0 && s.o.flags.repairing) {
    if (isLocal(s.o.houseID)) G.onMessage(msg.repairingStops, 2);
    s.o.flags.repairing = false;
    s.o.flags.onHold = false;
    ret = true;
  }
  if (state === 0 || s.o.flags.repairing || s.o.hitpoints === structureInfo[s.o.type].o.hitpoints) return ret;
  if (isLocal(s.o.houseID)) G.onMessage(msg.repairingStarts, 2);
  s.o.flags.onHold = true;
  s.o.flags.repairing = true;
  return true;
}

export function structureUpdateMap(s: Structure | null): void {
  if (!s) return;
  if (!s.o.flags.used) return;
  if (s.o.flags.isNotOnMap) return;
  const si = structureInfo[s.o.type];
  const layout = layoutTiles[si.layout];
  const layoutSize = layoutTileCount[si.layout];
  const group = G.iconGroups[si.iconGroup];
  const base = structureFrameStride(si.iconGroup, layoutSize) * 2;
  for (let i = 0; i < layoutSize; i++) {
    const position = packTile(s.o.position) + layout[i];
    const t = G.map[position];
    t.houseID = s.o.houseID;
    t.hasStructure = true;
    t.index = s.o.index + 1;
    t.groundTileID = (group[base + i] + s.rotationSpriteDiff) & 0x1ff;
    if (tileIsUnveiled(t.overlayTileID)) t.overlayTileID = 0;
  }
  s.o.flags.isDirty = true;
  if (s.state >= STATE.IDLE) {
    const animationIndex = s.state > STATE.READY ? STATE.READY : s.state;
    animationStart(si.animations[animationIndex], s.o.position, si.layout, s.o.houseID, si.iconGroup);
  } else {
    animationStart(animationStructureBuild, s.o.position, si.layout, s.o.houseID, si.iconGroup);
  }
}

export function structureGetBuildable(s: Structure | null): number {
  if (!s) return 0;
  const si = structureInfo[s.o.type];
  const structuresBuilt = G.houses[s.o.houseID].structuresBuilt;
  let ret = 0;
  switch (s.o.type) {
    case STRUCTURE.LIGHT_VEHICLE:
    case STRUCTURE.HEAVY_VEHICLE:
    case STRUCTURE.HIGH_TECH:
    case STRUCTURE.WOR_TROOPER:
    case STRUCTURE.BARRACKS:
    case STRUCTURE.DRONE_PAD:
      for (let i = 0; i < UNIT.MAX; i++) unitInfo[i].o.available = 0;
      for (let i = 0; i < si.buildableUnits.length; i++) {
        let unitType = si.buildableUnits[i];
        if (unitType === UNIT.INVALID) continue;
        if (unitType === UNIT.TRIKE && s.creatorHouseID === HOUSE.ORDOS) unitType = UNIT.RAIDER_TRIKE;
        const ui = unitInfo[unitType];
        if(unitType>=27&&G.campaignID+1<ui.o.availableCampaign)continue;
        let upgradeLevelRequired = ui.o.upgradeLevelRequired;
        if (unitType === UNIT.SIEGE_TANK && s.creatorHouseID === HOUSE.ORDOS) upgradeLevelRequired--;
        if ((structuresBuilt & ui.o.structuresRequired) >>> 0 !== ui.o.structuresRequired >>> 0) continue;
        if ((ui.o.availableHouse & (1 << s.creatorHouseID)) === 0) continue;
        if (s.upgradeLevel >= upgradeLevelRequired) {
          ui.o.available = 1;
          ret |= 1 << unitType;
          continue;
        }
        if (s.upgradeTimeLeft !== 0 && s.upgradeLevel + 1 >= upgradeLevelRequired) ui.o.available = -1;
      }
      return ret >>> 0;
    case STRUCTURE.CONSTRUCTION_YARD:
      for (let i = 0; i < STRUCTURE.MAX; i++) {
        const lsi = structureInfo[i];
        lsi.o.available = 0;
        let availableCampaign = lsi.o.availableCampaign;
        let structuresRequired = lsi.o.structuresRequired >>> 0;
        if (i === STRUCTURE.WOR_TROOPER && s.o.houseID === HOUSE.HARKONNEN && G.campaignID >= 1) {
          structuresRequired = (structuresRequired & ~(1 << STRUCTURE.BARRACKS)) >>> 0;
          availableCampaign = 2;
        }
        if ((structuresBuilt & structuresRequired) >>> 0 === structuresRequired || !isHuman(s.o.houseID)) {
          if (s.o.houseID !== HOUSE.HARKONNEN && i === STRUCTURE.LIGHT_VEHICLE) availableCampaign = 2;
          // MD ($00FF2E): Дом IX со двора не строится; машинный двор доступен для прямой постройки.
          if (i === STRUCTURE.HOUSE_OF_IX) continue;
          if (i === STRUCTURE.WOR_TROOPER && (G.net ? s.o.houseID : G.playerHouseID) === HOUSE.ORDOS) continue;
          if (G.campaignID >= availableCampaign - 1 && (lsi.o.availableHouse & (1 << s.o.houseID)) !== 0) {
            if (s.upgradeLevel >= lsi.o.upgradeLevelRequired || !isHuman(s.o.houseID)) {
              lsi.o.available = 1;
              ret |= 1 << i;
            } else if (s.upgradeTimeLeft !== 0 && s.upgradeLevel + 1 >= lsi.o.upgradeLevelRequired) {
              lsi.o.available = -1;
            }
          }
        }
      }
      // MD ($00FFCC): плиты 2×2 строятся всегда
      structureInfo[STRUCTURE.SLAB_2x2].o.available = 1;
      ret |= 1 << STRUCTURE.SLAB_2x2;
      if (isHuman(s.o.houseID) && structurePoolFull()) {
        // бит 8 слова $6: построек уже 70 — только плиты и стены ($00FFDC: d3 &= $4002)
        ret &= (1 << STRUCTURE.SLAB_2x2) | (1 << STRUCTURE.WALL);
      } else {
        // $00FFF0: второй дворец и второй космопорт не строятся (счётчики по типам $FF7C9C + дом·$20)
        if (structureCount(s.o.houseID, STRUCTURE.PALACE)) ret &= ~(1 << STRUCTURE.PALACE);
        if (structureCount(s.o.houseID, STRUCTURE.STARPORT)) ret &= ~(1 << STRUCTURE.STARPORT);
      }
      for (let i = 0; i < STRUCTURE.MAX; i++) if (!(ret & (1 << i)) && structureInfo[i].o.available === 1) structureInfo[i].o.available = 0;
      return ret >>> 0;
    case STRUCTURE.STARPORT:
      return 0xffffffff;
    default:
      return 0;
  }
}

/** Зданий дома этого типа, включая строящиеся (MD считает их при создании, $00E5CE). */
export function structureCount(houseID: number, type: number): number {
  let n = 0;
  for (const st of G.structures) if (st.o.flags.used && st.o.houseID === houseID && st.o.type === type) n++;
  return n;
}

export function networkStructureCount(houseID:number):number{
  let count=0;
  for(const s of G.structureFind){
    if(!s.o.flags.used||s.o.houseID!==houseID)continue;
    if(!isSlabOrWall(s.o.type))count++;
    count+=s.readyBuildings?.filter(item=>!isSlabOrWall(item.type)).length??0;
  }
  return count;
}

/**
 * MD: пул построек $FFBEA2 — 70 мест на всех, плиты и стены мест не занимают (таблица $0204D4).
 * Место берётся при создании здания ($00E5F4) и возвращается при удалении ($00BA9C).
 */
export const STRUCTURE_POOL_MD = 70;
export function structurePoolFull(): boolean {
  let n = 0;
  for (const st of G.structures) {
    if (!st.o.flags.used) continue;
    const t = st.o.type;
    if (t !== STRUCTURE.SLAB_1x1 && t !== STRUCTURE.SLAB_2x2 && t !== STRUCTURE.WALL) n++;
  }
  return n >= (G.net?NETWORK_STRUCTURE_LIMIT*8:STRUCTURE_POOL_MD);
}

/** MD: свободен ли номер юнита в диапазоне пула (воздух 0–10, наземные 25–101, $04337E…$043412). */
function unitPoolHasFree(first: number, last: number): boolean {
  for (let i = first; i <= last; i++) if ((!G.net||i!==0xff)&&!G.units[i].o.flags.used) return true;
  return false;
}
export const unitAirSlotFree = () => unitPoolHasFree(0, G.net?NETWORK_ARMY_POOL_END-1:10);
export const unitGroundPoolFull = () => !unitPoolHasFree(G.net?0:25, G.net?NETWORK_ARMY_POOL_END-1:101);

/**
 * Бит 8 слова $6 здания игрока — «упёрлись в предел» ($00DC60…$00DDF2): двор — 70 построек,
 * заводы юнитов — пул наземных юнитов или предел дома, высокие технологии — нет места для авиации,
 * дворец Атрейдесов — пул наземных (фримены). У улучшающегося завода бит не ставится.
 */
export function structureLimitReached(s: Structure): boolean {
  const h = G.houses[s.o.houseID];
  if(s.o.type===STRUCTURE.DRONE_PAD&&padDroneLoad(s)>=DRONES_PER_PAD)return true;
  if(G.net){
    if(s.o.type===STRUCTURE.CONSTRUCTION_YARD)return networkStructureCount(s.o.houseID)>=NETWORK_STRUCTURE_LIMIT||structurePoolFull();
    if(s.o.type===STRUCTURE.PALACE||structureCanQueueUnits(s)||s.o.type===STRUCTURE.STARPORT)return networkUnitCount(s.o.houseID)>=NETWORK_UNIT_LIMIT||unitGroundPoolFull();
  }
  switch (s.o.type) {
    case STRUCTURE.CONSTRUCTION_YARD:
      return structurePoolFull();
    case STRUCTURE.PALACE:
      return s.o.houseID === HOUSE.ATREIDES && unitGroundPoolFull();
    case STRUCTURE.LIGHT_VEHICLE:
    case STRUCTURE.HEAVY_VEHICLE:
    case STRUCTURE.WOR_TROOPER:
    case STRUCTURE.BARRACKS:
    case STRUCTURE.STARPORT:
      return !s.o.flags.upgrading && (unitGroundPoolFull() || h.unitCount >= h.unitCountMax);
    case STRUCTURE.HIGH_TECH:
      return !s.o.flags.upgrading && (s.objectType===UNIT.COMBAT_DRONE?
        unitGroundPoolFull()||h.unitCount>=h.unitCountMax:!unitAirSlotFree());
    case STRUCTURE.DRONE_PAD:
      return !s.o.flags.upgrading&&(unitGroundPoolFull()||h.unitCount>=h.unitCountMax);
    default:
      return false;
  }
}

export function structureHouseUnderAttack(houseID: number): void {
  const h = G.houses[houseID];
  if (!isHuman(houseID)) h.flags.isAIActive = true;
  if (!isHuman(houseID) && h.flags.doneFullScaleAttack) return;
  h.flags.doneFullScaleAttack = true;
  if (h.flags.human) {
    if (h.timerStructureAttack !== 0) return;
    // MD $01A88C/$01A8B6: атака базы — сирена $3E (GEMS seq 75), не голос фрегата ($30/48)
    if (isLocal(houseID)) G.onSound(0x3e);
    h.timerStructureAttack = 8;
  }
}

export function structureAIPickNextToBuild(s: Structure | null): number {
  if (!s) return 0xffff;
  const h = G.houses[s.o.houseID];
  let buildable = structureGetBuildable(s);
  if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
    for (let i = 0; i < 5; i++) {
      const type = h.ai_structureRebuild[i][0];
      if (type === 0) continue;
      if ((buildable & (1 << type)) === 0) continue;
      return type;
    }
    return 0xffff;
  }
  if (s.o.type === STRUCTURE.HIGH_TECH) {
    const find = findAll(s.o.houseID, UNIT.CARRYALL);
    for (;;) {
      const u = unitFind(find, unitGetHouseID);
      if (!u) break;
      buildable &= ~(1 << UNIT.CARRYALL);
    }
  }
  if (s.o.type === STRUCTURE.HEAVY_VEHICLE) {
    buildable &= ~(1 << UNIT.HARVESTER);
    buildable &= ~(1 << UNIT.MCV);
  }
  // в оригинале buildable — uint16: юниты с номером 16 и выше (харвестер, MCV) так не строятся
  buildable &= 0xffff;
  let type = 0xffff;
  for (let i = 0; i < UNIT.MAX; i++) {
    if ((buildable & (1 << i)) === 0) continue;
    if (random256() % 4 === 0) type = i;
    if (type !== 0xffff) {
      if (unitInfo[i].o.priorityBuild <= unitInfo[type].o.priorityBuild) continue;
    }
    type = i;
  }
  return type;
}

/** Выбор места для постройки игрока (Structure_Place из режима PLACE в viewport.c). */
export function structurePlayerPlace(position: number, houseID = G.playerHouseID): boolean {
  const before = placingHouse;
  placingHouse = houseID;
  try {
    return structurePlayerPlaceAs(position, houseID);
  } finally {
    placingHouse = before;
  }
}

function structurePlayerPlaceAs(position: number, houseID: number): boolean {
  const s = G.structureActive;
  if (!s) return false;
  const type = s.o.type;
  const local = isLocal(houseID);
  if (structureIsValidBuildLocation(position, type) === 0) {
    if (local) G.onSound(47);
    if (local) G.onMessage(type === STRUCTURE.SLAB_1x1 || type === STRUCTURE.SLAB_2x2 ? msg.cannotPlaceFoundation : msg.cannotPlace(type), 2);
    return false;
  }
  if (!structurePlace(s, position)) {
    if (local) G.onSound(47);
    if (local) G.onMessage(type === STRUCTURE.SLAB_1x1 || type === STRUCTURE.SLAB_2x2 ? msg.cannotPlaceFoundation : msg.cannotPlace(type), 2);
    return false;
  }
  // The user-selected «Установка» effect from the sound browser (GEMS 70).
  if (local) G.onSound(0x14);
  const h = G.houses[houseID];
  if (type === STRUCTURE.PALACE) h.palacePosition = { ...s.o.position };
  if (type === STRUCTURE.REFINERY && G.validateStrictIfZero === 0) {
    G.validateStrictIfZero++;
    const u = unitCreateWrapperLazy(houseID, UNIT.HARVESTER, indexEncode(s.o.index, IT.STRUCTURE));
    G.validateStrictIfZero--;
    if (!u) h.harvestersIncoming++;
    else u.originEncoded = indexEncode(s.o.index, IT.STRUCTURE);
  }
  G.selectionType = SELECTION.STRUCTURE;
  const cy = structureGetByPackedTile(G.structureActivePosition);
  G.structureActiveType = 0xffff;
  G.structureActive = null;
  if(cy){
    if(cy.buildingQueue?.length)structureStartNextBuilding(cy);
    else if(cy.o.linkedID===0xff&&(structureGetBuildable(cy)&(1<<cy.objectType))===0)structureBuildObject(cy,0xfffe);
  }
  houseUpdateRadarState(h);
  if (local && h.powerProduction < h.powerUsage && (h.structuresBuilt & (1 << STRUCTURE.OUTPOST)) !== 0) G.onMessage(msg.notEnoughPowerForRadar, 3);
  return true;
}

let unitCreateWrapperLazy: (houseID: number, typeID: number, destination: number) => Unit | null = () => null;
export function setUnitCreateWrapper(fn: typeof unitCreateWrapperLazy): void {
  unitCreateWrapperLazy = fn;
}

export { mapIsValidPosition };

/** Дом, который сейчас ставит здание игрока (structurePlayerPlace); иначе — игрок, как в оригинале. */
let placingHouse = -1;
function placer(): number {
  return placingHouse >= 0 ? placingHouse : G.playerHouseID;
}
/** Проверка места для дома houseID (интерфейс сетевой игры: подсветка постановки своего здания). */
export function structureIsValidBuildLocationFor(position: number, type: number, houseID: number): number {
  const before = placingHouse;
  placingHouse = houseID;
  try {
    return structureIsValidBuildLocation(position, type);
  } finally {
    placingHouse = before;
  }
}
export function structurePlacementDetailFor(position: number, type: number, houseID: number): { valid: number; cells: boolean[] } {
  const before = placingHouse;
  placingHouse = houseID;
  try {
    return structurePlacementDetail(position, type);
  } finally {
    placingHouse = before;
  }
}
