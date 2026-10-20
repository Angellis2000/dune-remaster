/**
 * Карта: тип ландшафта, туман войны, пряность, взрывы (OpenDUNE src/map.c).
 * Перерисовку по «грязным» клеткам из оригинала заменяет полная отрисовка каждый кадр,
 * поэтому Map_Update/Map_MarkTileDirty здесь пустые.
 */
import {
  ACTION, EXPLOSION, G, IT, LST, MAP_INFOS, MOVEMENT, STRUCTURE, TEAM_ACTION, UNIT, findAll, idiv,
  indexGetPackedTile, indexGetStructure, indexGetType, indexGetUnit, isOutOfMap, packTile, packXY, packedX, packedY, posX, posY, random256, randomRange,
  structureFind, tile, tileAddDiff, tileGetDirectionPacked, tileGetDistance, tileMoveByDirection, tileGetDistancePacked, tileIsValid, tileMoveByRandom, unitFind, unpackTile,
  type Tile32, type Unit,
} from "./core.ts";
import { humanHouses, isHuman, isLocal, teamVisionMask } from "./core.ts";
import { explosionStart } from "./explosion.ts";
import { houseAlliedToHuman, houseAreAllied, houseGet } from "./house.ts";
import { objectGetByPackedTile } from "./object.ts";
import { structureConnectWall, structureDamage, structureGetByPackedTile, structureHouseUnderAttack } from "./structure.ts";
import { iconLandscape, structureInfo, tableMapDiff, tableTileDiff, unitInfo } from "./tables.ts";
import {
  unitAddToTileFn, unitCreate, unitDamage, unitDeviate, unitGetByPackedTile, unitGetHouseID, unitGetTeam, unitHouseUnitCountAdd,
  unitRemove, unitRemoveFromTeam, unitRemoveFromTileFn, unitSetAction, unitSetTarget,unitHarvesterDefend,
} from "./unit.ts";

export const mapInfo = () => MAP_INFOS[G.mapScale];

export function mapIsValidPosition(position: number): boolean {
  if ((position & 0xc000) !== 0) return false;
  const x = packedX(position);
  const y = packedY(position);
  const mi = mapInfo();
  return mi.minX <= x && x < mi.minX + mi.sizeX && mi.minY <= y && y < mi.minY + mi.sizeY;
}

/** Tile_IsUnveiled: иконка не из группы тумана. */
export function tileIsUnveiled(tileID: number): boolean {
  if (tileID > G.veiledTileID) return true;
  if (tileID < G.veiledTileID - 15) return true;
  return false;
}

export function mapIsPositionUnveiled(position: number): boolean {
  const t = G.map[position & 0xfff];
  if (!t.isUnveiled) return false;
  if (!tileIsUnveiled(t.overlayTileID)) return false;
  return true;
}

/**
 * Раскрыта ли клетка для дома. В кампании туман один — игрока (как mapIsPositionUnveiled); в сети у каждого
 * человека своя маска `unveiledHouses`, а общий слой (`isUnveiled`, иконки тумана) открыт всем, как на этапе 1.
 */
export function mapIsUnveiledFor(position: number, houseID: number): boolean {
  if (!G.net) return mapIsPositionUnveiled(position);
  return (G.map[position & 0xfff].unveiledHouses & teamVisionMask(houseID)) !== 0;
}

/** Раскрыта ли клетка хоть для одного человека (в кампании — для игрока). */
export function mapIsUnveiledByAnyHuman(position: number): boolean {
  if (!G.net) return mapIsPositionUnveiled(position);
  return (G.map[position & 0xfff].unveiledHouses & G.net.humans) !== 0;
}

/** Видна ли клетка на экране местного игрока (у наблюдателя — всё, что видят люди). Только для интерфейса. */
export function mapIsUnveiledLocal(position: number): boolean {
  const t = G.map[position & 0xfff];
  if (!G.net) return t.isUnveiled;
  return (t.unveiledHouses & G.net.view) !== 0;
}

/** Видна ли точка в окне игрока: в оригинале окно 15×10 клеток, у нас — текущий вид. */
export function mapIsPositionInViewport(position: Tile32): boolean {
  const x = (position.x >> 8) - packedX(G.viewportPacked);
  const y = (position.y >> 8) - packedY(G.viewportPacked);
  return x >= -1 && x <= G.viewportTilesW && y >= -1 && y <= G.viewportTilesH;
}

/**
 * Map_GetLandscapeType в MD ($0057EA): тип берётся по номеру иконки из таблицы ROM, а если
 * поверх лежит обломок стены — «разрушенная стена». Иконки вне ландшафта считаем горами.
 */
export function mapGetLandscapeType(packed: number): number {
  const t = G.map[packed & 0xfff];
  let lst = iconLandscape[t.groundTileID & 0x1ff];
  if (iconLandscape[t.overlayTileID & 0x7f] === LST.DESTROYED_WALL) lst = LST.DESTROYED_WALL;
  return lst < 0 ? LST.ENTIRELY_MOUNTAIN : lst;
}

export function mapUpdate(_packed: number, _type: number, _ignoreInvisible: boolean): void {
  /* отрисовка целиком каждый кадр */
}

export function mapMarkTileDirty(_packed: number): void {
  /* отрисовка целиком каждый кадр */
}

function mapUpdateWall(packed: number): boolean {
  if (mapGetLandscapeType(packed) !== LST.WALL) return false;
  const t = G.map[packed];
  t.groundTileID = G.mapTileID[packed] & 0x1ff;
  if (mapIsPositionUnveiled(packed)) t.overlayTileID = G.wallTileID;
  structureConnectWall(packed, true);
  return true;
}

export function alertNearbyBaseDefenders(structure: ReturnType<typeof structureGetByPackedTile>, attackerEncoded: number): void {
  if (!structure || !houseAlliedToHuman(structure.o.houseID)) return;
  let attackerHouse = -1;
  const attacker = indexGetUnit(attackerEncoded);
  if (attacker?.o.flags.allocated) attackerHouse = unitGetHouseID(attacker);
  else if (indexGetType(attackerEncoded) === IT.STRUCTURE) attackerHouse = indexGetStructure(attackerEncoded)?.o.houseID ?? -1;
  if (attackerHouse < 0 || houseAreAllied(attackerHouse, structure.o.houseID)) return;

  for (const defender of G.units) {
    if (!defender.o.flags.allocated || defender.o.flags.isNotOnMap || !houseAreAllied(unitGetHouseID(defender), structure.o.houseID)) continue;
    if (!unitInfo[defender.o.type].o.actionsPlayer.includes(ACTION.ATTACK)) continue;
    if (defender.patrolActive || defender.targetAttack !== 0 || defender.targetMove !== 0 || defender.speed !== 0) continue;
    if (defender.actionID !== ACTION.GUARD && defender.actionID !== ACTION.AREA_GUARD && defender.actionID !== ACTION.HUNT) continue;
    if (tileGetDistance(defender.o.position, structure.o.position) > 6 * 256) continue;
    unitSetAction(defender, ACTION.ATTACK);
    unitSetTarget(defender, attackerEncoded);
  }
}

export function mapMakeExplosion(type: number, position: Tile32, hitpoints: number, unitOriginEncoded: number,groundOnly=false): void {
  const reactionDistance = type === EXPLOSION.DEATH_HAND ? 32 : 16;
  const positionPacked = packTile(position);

  if (hitpoints !== 0) {
    const find = findAll();
    for (;;) {
      const u = unitFind(find, unitGetHouseID);
      if (!u) break;
      const ui = unitInfo[u.o.type];
      if(groundOnly&&ui.movementType===MOVEMENT.WINGER)continue;
      const distance = tileGetDistance(position, u.o.position) >> 4;
      if (distance >= reactionDistance) continue;
      if (!(u.o.type === UNIT.SANDWORM && type === EXPLOSION.SANDWORM_SWALLOW) && u.o.type !== UNIT.FRIGATE) {
        unitDamage(u, hitpoints >> (distance >> 2), 0);
      }
      const infantryAttacker=indexGetUnit(unitOriginEncoded);
      if((hitpoints>>(distance>>2))>0&&infantryAttacker&&unitHarvesterDefend(u,infantryAttacker))continue;
      if (isHuman(u.o.houseID)) continue;
      let attackerHouse = -1;
      const us = indexGetUnit(unitOriginEncoded);
      if (us) {
        if (us === u) continue;
        attackerHouse = unitGetHouseID(us);
      } else if (indexGetType(unitOriginEncoded) === IT.STRUCTURE) {
        const ss = indexGetStructure(unitOriginEncoded);
        if (ss) attackerHouse = ss.o.houseID;
      }
      if (attackerHouse < 0 || houseAreAllied(unitGetHouseID(u), attackerHouse)) continue;
      const t = unitGetTeam(u);
      if (t) {
        if (t.action === TEAM_ACTION.STAGING) {
          unitRemoveFromTeam(u);
          unitSetAction(u, ACTION.HUNT);
          continue;
        }
        const target = indexGetUnit(t.target);
        if (!target) continue;
        if (unitInfo[target.o.type].bulletType === UNIT.INVALID) t.target = unitOriginEncoded;
        continue;
      }
      if (u.o.type === UNIT.HARVESTER && us) {
        const uis = unitInfo[us.o.type];
        if (uis.movementType === MOVEMENT.FOOT && u.targetMove === 0) {
          if (u.actionID !== ACTION.MOVE) unitSetAction(u, ACTION.MOVE);
          u.targetMove = unitOriginEncoded;
          continue;
        }
      }
      if (ui.bulletType === UNIT.INVALID) continue;
      if (u.actionID === ACTION.GUARD && u.o.flags.byScenario) unitSetAction(u, ACTION.HUNT);
      if (u.targetAttack !== 0 && u.actionID !== ACTION.HUNT) continue;
      const attack = indexGetUnit(u.targetAttack);
      if (attack) {
        const packed = packTile(u.o.position);
        if (tileGetDistancePacked(indexGetPackedTile(u.targetAttack), packed) <= ui.fireDistance) continue;
      }
      unitSetTarget(u, unitOriginEncoded);
    }
  }

  if (hitpoints !== 0) {
    const s = structureGetByPackedTile(positionPacked);
    if (s) {
      if (type === EXPLOSION.IMPACT_LARGE) {
        const si = structureInfo[s.o.type];
        if (idiv(si.o.hitpoints, 2) > s.o.hitpoints) type = EXPLOSION.SMOKE_PLUME;
      }
      structureHouseUnderAttack(s.o.houseID);
      alertNearbyBaseDefenders(s, unitOriginEncoded);
      structureDamage(s, hitpoints, 0);
    }
  }

  if (mapGetLandscapeType(positionPacked) === LST.WALL && hitpoints !== 0) {
    const wallHp = structureInfo[STRUCTURE.WALL].o.hitpoints;
    if (wallHp <= hitpoints || random256() <= idiv(hitpoints * 256, wallHp)) mapUpdateWall(positionPacked);
  }

  explosionStart(type, position);
}

export function mapDeviateArea(type: number, position: Tile32, radius: number, houseID: number): void {
  explosionStart(type, position);
  const find = findAll();
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (idiv(tileGetDistance(position, u.o.position), 16) >= radius) continue;
    unitDeviate(u, 0, houseID);
  }
}

export function mapBloomExplodeSpice(packed: number, houseID: number): void {
  if (G.validateStrictIfZero === 0) {
    unitRemove(unitGetByPackedTile(packed));
    G.map[packed].groundTileID = G.mapTileID[packed] & 0x1ff;
    mapMakeExplosion(EXPLOSION.SPICE_BLOOM_TREMOR, unpackTile(packed), 0, 0);
  }
  if (isLocal(houseID)) G.onFeedback(36);
  mapFillCircleWithSpice(packed, 5);
}

export function mapFillCircleWithSpice(packed: number, radius: number): void {
  if (radius === 0) return;
  const x = packedX(packed);
  const y = packedY(packed);
  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      const cur = packXY(x + j, y + i);
      const distance = tileGetDistancePacked(packed, cur);
      if (distance > radius) continue;
      if (distance === radius && (random256() & 1) === 0) continue;
      if (mapGetLandscapeType(cur) === LST.SPICE) continue;
      mapChangeSpiceAmount(cur, 1);
    }
  }
  mapChangeSpiceAmount(packed, 1);
}

const landscapeIcon = (i: number): number => G.iconGroups[9][i] & 0x1ff;

function mapFixupSpiceEdges(packed: number): void {
  packed &= 0xfff;
  const type = mapGetLandscapeType(packed);
  let spriteID = 0;
  if (type === LST.SPICE || type === LST.THICK_SPICE) {
    for (let i = 0; i < 4; i++) {
      const cur = packed + tableMapDiff[i];
      if (isOutOfMap(cur)) {
        spriteID |= 1 << i;
        continue;
      }
      const ct = mapGetLandscapeType(cur);
      if (type === LST.SPICE) {
        if (ct === LST.SPICE || ct === LST.THICK_SPICE) spriteID |= 1 << i;
        continue;
      }
      if (ct === LST.THICK_SPICE) spriteID |= 1 << i;
    }
    spriteID += type === LST.SPICE ? 49 : 65;
    spriteID = landscapeIcon(spriteID);
    G.mapTileID[packed] |= 0x8000;
    G.map[packed].groundTileID = spriteID;
  }
}

export function mapChangeSpiceAmount(packed: number, dir: number): void {
  if (dir === 0) return;
  packed &= 0xffff;
  if (isOutOfMap(packed)) return;
  let type = mapGetLandscapeType(packed);
  if (type === LST.THICK_SPICE && dir > 0) return;
  if (type !== LST.SPICE && type !== LST.THICK_SPICE && dir < 0) return;
  if (type !== LST.NORMAL_SAND && type !== LST.ENTIRELY_DUNE && type !== LST.SPICE && dir > 0) return;
  if (dir > 0) type = type === LST.SPICE ? LST.THICK_SPICE : LST.SPICE;
  else type = type === LST.THICK_SPICE ? LST.SPICE : LST.NORMAL_SAND;
  if (type === LST.NORMAL_SAND) {
    G.mapTileID[packed] &= 0x7fff;
    // В PC под спайсом в mapTileID лежит песок; в картах MD спайс нарисован в самой клетке, и «вернуть исходную»
    // значило вернуть спайс — выработанный и разбитый взрывами спайс не пропадал. Тогда кладём песок ландшафта.
    const base = iconLandscape[G.mapTileID[packed] & 0x1ff];
    if (base === LST.SPICE || base === LST.THICK_SPICE) G.mapTileID[packed] = (G.mapTileID[packed] & ~0x1ff) | landscapeIcon(0);
    G.map[packed].groundTileID = G.mapTileID[packed] & 0x1ff;
  } else {
    let spriteID = type === LST.SPICE ? 49 : 65;
    spriteID = landscapeIcon(spriteID);
    G.mapTileID[packed] |= 0x8000;
    G.map[packed].groundTileID = spriteID;
  }
  mapFixupSpiceEdges(packed);
  mapFixupSpiceEdges(packed + 1);
  mapFixupSpiceEdges(packed - 1);
  mapFixupSpiceEdges(packed - 64);
  mapFixupSpiceEdges(packed + 64);
}

export function mapBloomExplodeSpecial(packed: number, houseID: number): void {
  const h = houseGet(houseID);
  G.map[packed].groundTileID = G.landscapeTileID;
  G.mapTileID[packed] = 0x8000 | G.landscapeTileID;
  let enemyHouseID = houseID;
  const find = findAll();
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.o.houseID === houseID) continue;
    enemyHouseID = u.o.houseID;
    break;
  }
  switch (random256() & 0x3) {
    case 0:
      h.credits += randomRange(150, 400);
      break;
    case 1:
      unitCreate(0xffff, UNIT.TRIKE, houseID, tileMoveByRandom(unpackTile(packed), 16, true), random256());
      break;
    case 2: {
      const u = unitCreate(0xffff, UNIT.TRIKE, enemyHouseID, tileMoveByRandom(unpackTile(packed), 16, true), random256());
      if (u) unitSetAction(u, ACTION.HUNT);
      break;
    }
    case 3: {
      const u = unitCreate(0xffff, UNIT.INFANTRY, enemyHouseID, tileMoveByRandom(unpackTile(packed), 16, true), random256());
      if (u) unitSetAction(u, ACTION.HUNT);
      break;
    }
  }
}

export function mapFindLocationTile(locationID: number, houseID: number): number {
  const mapBase = [1, -2, -2];
  const mi = mapInfo();
  const mapOffset = mapBase[G.mapScale];
  let ret = 0;
  if (locationID === 6) {
    const find = findAll();
    for (;;) {
      const s = structureFind(find);
      if (!s) break;
      if (s.o.type === STRUCTURE.SLAB_1x1 || s.o.type === STRUCTURE.SLAB_2x2 || s.o.type === STRUCTURE.WALL) continue;
      if (s.o.houseID === houseID) continue;
      houseID = s.o.houseID;
      break;
    }
  }
  for (let guard = 0; ret === 0 && guard < 1000; guard++) {
    switch (locationID) {
      case 0:
        ret = packXY(mi.minX + randomRange(0, mi.sizeX - 2), mi.minY + mapOffset);
        break;
      case 1:
        ret = packXY(mi.minX + mi.sizeX - mapOffset, mi.minY + randomRange(0, mi.sizeY - 2));
        break;
      case 2:
        ret = packXY(mi.minX + randomRange(0, mi.sizeX - 2), mi.minY + mi.sizeY - mapOffset);
        break;
      case 3:
        ret = packXY(mi.minX + mapOffset, mi.minY + randomRange(0, mi.sizeY - 2));
        break;
      case 4:
        ret = packXY(mi.minX + randomRange(0, mi.sizeX), mi.minY + randomRange(0, mi.sizeY));
        if (isHuman(houseID) && !mapIsValidPosition(ret)) ret = 0;
        break;
      case 5:
        ret = packXY(packedX(G.viewportPacked) + randomRange(0, 14), packedY(G.viewportPacked) + randomRange(0, 9));
        if (isHuman(houseID) && !mapIsValidPosition(ret)) ret = 0;
        break;
      case 6:
      case 7: {
        const s = structureFind(findAll(houseID));
        if (s) {
          ret = packTile(tileMoveByRandom(s.o.position, 120, true));
        } else {
          const u = unitFind(findAll(houseID), unitGetHouseID);
          if (u) ret = packTile(tileMoveByRandom(u.o.position, 120, true));
          else ret = packXY(mi.minX + randomRange(0, mi.sizeX), mi.minY + randomRange(0, mi.sizeY));
        }
        if (isHuman(houseID) && !mapIsValidPosition(ret)) ret = 0;
        break;
      }
      default:
        return 0;
    }
    ret &= 0xfff;
    if (ret !== 0 && objectGetByPackedTile(ret) !== null) ret = 0;
  }
  return ret;
}

/** Map_UpdateAround: обход клеток вокруг точки; function 2/3 — снять/поставить юнит в клетку. */
export function mapUpdateAround(radius: number, position: Tile32, unit: Unit | null, fn: number): void {
  const tileOffsets = [0x80, 0x88, 0x90, 0x98, 0xa0, 0xa8, 0xb0, 0xb8, 0xc0, 0xc8, 0xd0, 0xd8, 0xe0, 0xe8, 0xf0, 0xf8, 0x100, 0x180];
  if (radius === 0 || (position.x === 0 && position.y === 0)) return;
  radius--;
  const apply = (packed: number) => {
    if (fn === 2) unitRemoveFromTileFn(unit!, packed);
    else if (fn === 3) unitAddToTileFn(unit!, packed);
  };
  if (radius >= 32) {
    const x = posX(position);
    const y = posY(position);
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        if (x + i < 0 || x + i >= 64 || y + j < 0 || y + j >= 64) continue;
        apply(packXY(x + i, y + j));
      }
    }
    return;
  }
  radius = Math.max(radius, 15);
  const pos = tile(position.x - tileOffsets[radius - 15], position.y - tileOffsets[radius - 15]);
  let diff = { x: 0, y: 0 };
  let lastPacked = 0;
  let i = 0;
  do {
    const cur = tileAddDiff(pos, diff);
    if (tileIsValid(cur)) {
      const curPacked = packTile(cur);
      if (curPacked !== lastPacked) {
        apply(curPacked);
        lastPacked = curPacked;
      }
    }
    if (i === 8) break;
    diff = tableTileDiff[radius + 1][i++];
  } while (diff.x !== 0 || diff.y !== 0);
}

export function mapSearchSpice(packed: number, radius: number): number {
  let radius1 = radius + 1;
  let radius2 = radius + 1;
  let packed1 = packed;
  let packed2 = packed;
  let found = false;
  const mi = mapInfo();
  const xmin = Math.max(packedX(packed) - radius, mi.minX);
  const xmax = Math.min(packedX(packed) + radius, mi.minX + mi.sizeX - 1);
  const ymin = Math.max(packedY(packed) - radius, mi.minY);
  const ymax = Math.min(packedY(packed) + radius, mi.minY + mi.sizeY - 1);
  for (let y = ymin; y <= ymax; y++) {
    for (let x = xmin; x <= xmax; x++) {
      const cur = packXY(x, y);
      if (!mapIsValidPosition(cur)) continue;
      if (G.map[cur].hasStructure) continue;
      if (unitGetByPackedTile(cur) !== null) continue;
      const type = mapGetLandscapeType(cur);
      const distance = tileGetDistancePacked(cur, packed);
      if (type === LST.THICK_SPICE && distance < 4) {
        found = true;
        if (distance <= radius2) {
          radius2 = distance;
          packed2 = cur;
        }
      }
      if (type === LST.SPICE) {
        found = true;
        if (distance <= radius1) {
          radius1 = distance;
          packed1 = cur;
        }
      }
    }
  }
  if (!found) return 0;
  return radius2 <= radius ? packed2 : packed1;
}

function mapUnveilTileNeighbour(packed: number): void {
  if (isOutOfMap(packed)) return;
  const t = G.map[packed];
  let tileID = 15;
  if (t.isUnveiled) {
    if (G.validateStrictIfZero === 0 && tileIsUnveiled(t.overlayTileID)) return;
    tileID = 0;
    for (let i = 0; i < 4; i++) {
      const n = packed + tableMapDiff[i];
      if (isOutOfMap(n) || !G.map[n].isUnveiled) tileID |= 1 << i;
    }
  }
  if (tileID !== 0) {
    if (tileID !== 15) {
      const u = unitGetByPackedTile(packed);
      if (u) for (const h of humanHouses()) unitHouseUnitCountAdd(u, h);
    }
    tileID = G.iconGroups[7][tileID];
  }
  t.overlayTileID = tileID;
}

export function mapUnveilTile(packed: number, houseID: number): boolean {
  if (!isHuman(houseID) && (!G.net || G.net.team[houseID] < 0)) return false;
  if (isOutOfMap(packed)) return false;
  const t = G.map[packed];
  if (G.net) {
    // Exploration is shared by the team, independent of the local viewer.
    const bit = teamVisionMask(houseID);
    if ((t.unveiledHouses & bit) === bit) return false;
    t.unveiledHouses |= bit;
  } else {
    if (t.isUnveiled && tileIsUnveiled(t.overlayTileID)) return false;
    t.isUnveiled = true;
  }
  const u = unitGetByPackedTile(packed);
  if (u) unitHouseUnitCountAdd(u, houseID);
  const s = structureGetByPackedTile(packed);
  if (s) {
    s.o.seenByHouses |= G.net ? teamVisionMask(houseID) : 1 << houseID;
    if (houseID === 1) s.o.seenByHouses |= 1 << 3;
  }
  if (G.net) return true;
  mapUnveilTileNeighbour(packed);
  mapUnveilTileNeighbour(packed + 1);
  mapUnveilTileNeighbour(packed - 1);
  mapUnveilTileNeighbour(packed - 64);
  mapUnveilTileNeighbour(packed + 64);
  return true;
}

/**
 * Раскрытие вокруг здания по его площади (просьба владельца 2026-10-20, аудит п. 8): расстояние — от ближайшей
 * клетки здания, а не от левого верхнего угла, поэтому постройка видна целиком и подступы раскрыты одинаково со всех
 * сторон; только клетки внутри границ карты (MAP_INFOS), без светлых клеток за краем. Детерминировано — то же у всех.
 */
export function tileRemoveFogAroundRect(x0: number, y0: number, w: number, h: number, radius: number, houseID = G.playerHouseID): void {
  for (let y = y0 - radius; y < y0 + h + radius; y++) {
    for (let x = x0 - radius; x < x0 + w + radius; x++) {
      if (x < 0 || x >= 64 || y < 0 || y >= 64) continue;
      const packed = packXY(x, y);
      if (!mapIsValidPosition(packed)) continue;
      // ближайшая клетка здания
      const nx = Math.max(x0, Math.min(x0 + w - 1, x)), ny = Math.max(y0, Math.min(y0 + h - 1, y));
      const d = tileGetDistance({ x: (nx << 8) | 0x80, y: (ny << 8) | 0x80 }, { x: (x << 8) | 0x80, y: (y << 8) | 0x80 });
      if (((d + 0x80) >> 8) > radius) continue;
      mapUnveilTile(packed, houseID);
    }
  }
}

/** Tile_RemoveFogInRadius. В оригинале — всегда для игрока; в сети вызывающий передаёт дом, чей туман снимается. */
export function tileRemoveFogInRadius(t: Tile32, radius: number, houseID = G.playerHouseID): void {
  let packed = packTile(t);
  if (!mapIsValidPosition(packed)) return;
  const x = packedX(packed);
  const y = packedY(packed);
  const center = unpackTile(packXY(x, y));
  center.x = (x << 8) | 0x80;
  center.y = (y << 8) | 0x80;
  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      if (x + i < 0 || x + i >= 64 || y + j < 0 || y + j >= 64) continue;
      packed = packXY(x + i, y + j);
      const tt = { x: ((x + i) << 8) | 0x80, y: ((y + j) << 8) | 0x80 };
      if (((tileGetDistance(center, tt) + 0x80) >> 8) > radius) continue;
      mapUnveilTile(packed, houseID);
    }
  }
}

/** Tile_GetTileInDirectionOf */
export function tileGetTileInDirectionOf(from: number, to: number): number {
  if (from === 0 || to === 0) return 0;
  const distance = tileGetDistancePacked(from, to);
  const direction = tileGetDirectionPacked(to, from);
  if (distance <= 10) return 0;
  for (let guard = 0; guard < 1000; guard++) {
    let dir = 31 + (random256() & 0x3f);
    if ((random256() & 1) !== 0) dir = -dir;
    const position = tileMoveByDirection(unpackTile(to), direction + dir, Math.min(distance, 20) << 8);
    const packed = packTile(position);
    if (mapIsValidPosition(packed)) return packed;
  }
  return 0;
}

