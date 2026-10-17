/**
 * Взрывы (OpenDUNE src/explosion.c): последовательность кадров, урон клетке, кратеры.
 * spriteID — номер кадра PC-версии; отрисовщик сопоставляет его с графикой MD.
 */
import { G, LST, packTile, random256, randomRange, type Tile32 } from "./core.ts";
import { mapBloomExplodeSpice, mapChangeSpiceAmount, mapGetLandscapeType, mapIsPositionUnveiled, tileIsUnveiled } from "./map.ts";
import { animationStart } from "./animation.ts";
import { structureGetByPackedTile } from "./structure.ts";
import { animationMap, explosionTable, landscapeInfo } from "./tables.ts";

const EXPLOSION_MAX = 32;
const enum CMD {
  STOP = 0,
  SET_SPRITE = 1,
  SET_TIMEOUT = 2,
  SET_RANDOM_TIMEOUT = 3,
  MOVE_Y_POSITION = 4,
  TILE_DAMAGE = 5,
  PLAY_VOICE = 6,
  SCREEN_SHAKE = 7,
  SET_ANIMATION = 8,
  BLOOM_EXPLOSION = 9,
}

export interface Explosion {
  timeOut: number;
  houseID: number;
  current: number;
  spriteID: number;
  commands: number[][] | null;
  position: Tile32;
  type: number;
}

export const explosions: Explosion[] = Array.from({ length: EXPLOSION_MAX }, () => ({ timeOut: 0, houseID: 0, current: 0, spriteID: 0, commands: null, position: { x: 0, y: 0 }, type: 0 }));
let explosionTimer = 0;

export function explosionInit(): void {
  for (const e of explosions) e.commands = null;
  explosionTimer = 0;
}

const CRATER_GROUP = [-1, 2, 1];

function funcTileDamage(e: Explosion): void {
  const packed = packTile(e.position);
  if (!mapIsPositionUnveiled(packed)) return;
  const type = mapGetLandscapeType(packed);
  if (type === LST.STRUCTURE || type === LST.DESTROYED_WALL) return;
  const t = G.map[packed];
  if (type === LST.CONCRETE_SLAB) t.groundTileID = G.mapTileID[packed] & 0x1ff;
  const crater = landscapeInfo[type].craterType;
  if (crater === 0) return;
  let overlayTileID = t.overlayTileID;
  if (!tileIsUnveiled(overlayTileID)) return;
  const iconMap = G.iconGroups[CRATER_GROUP[crater]];
  if (iconMap[0] <= overlayTileID && overlayTileID <= iconMap[10]) {
    overlayTileID -= iconMap[0];
    if (overlayTileID < 4) overlayTileID += 2;
  } else {
    overlayTileID = random256() & 1;
  }
  mapChangeSpiceAmount(packed, -1);
  if (t.groundTileID === G.bloomTileID) {
    mapBloomExplodeSpice(packed, G.playerHouseID);
    return;
  }
  t.overlayTileID = (overlayTileID + iconMap[0]) & 0x7f;
}

function funcStop(e: Explosion): void {
  G.map[packTile(e.position)].hasExplosion = false;
  e.commands = null;
}

function stopAtPosition(packed: number): void {
  const t = G.map[packed];
  if (!t.hasExplosion) return;
  for (const e of explosions) {
    if (e.commands === null || packTile(e.position) !== packed) continue;
    funcStop(e);
  }
}

export function explosionStart(explosionType: number, position: Tile32): void {
  if (explosionType > 19) return;
  const commands = explosionTable[explosionType];
  const packed = packTile(position);
  stopAtPosition(packed);
  for (const e of explosions) {
    if (e.commands !== null) continue;
    e.commands = commands;
    e.current = 0;
    e.spriteID = 0;
    e.position = { ...position };
    e.timeOut = G.timerGUI;
    e.type = explosionType;
    explosionTimer = 0;
    G.map[packed].hasExplosion = true;
    break;
  }
}

/** Тряска экрана: в PC сдвиг видеопамяти, здесь — сигнал интерфейсу. */
export let onScreenShake: () => void = () => {};
export function setScreenShake(fn: () => void): void {
  onScreenShake = fn;
}

export function explosionTick(): void {
  if (explosionTimer > G.timerGUI) return;
  explosionTimer += 10000;
  for (const e of explosions) {
    if (e.commands === null) continue;
    if (e.timeOut <= G.timerGUI) {
      const [command, parameter] = e.commands[e.current] ?? [CMD.STOP, 0];
      e.current++;
      switch (command) {
        case CMD.SET_SPRITE: e.spriteID = parameter; break;
        case CMD.SET_TIMEOUT: e.timeOut = G.timerGUI + parameter; break;
        case CMD.SET_RANDOM_TIMEOUT: e.timeOut = G.timerGUI + randomRange(0, parameter); break;
        case CMD.MOVE_Y_POSITION: e.position.y = (e.position.y + parameter) & 0xffff; break;
        case CMD.TILE_DAMAGE: funcTileDamage(e); break;
        case CMD.PLAY_VOICE: G.onSound(parameter, e.position); break;
        case CMD.SCREEN_SHAKE: onScreenShake(); break;
        case CMD.SET_ANIMATION: {
          const packed = packTile(e.position);
          if (structureGetByPackedTile(packed)) break;
          let id = parameter + (random256() & 1);
          id += landscapeInfo[mapGetLandscapeType(packed)].isSand ? 0 : 2;
          animationStart(animationMap[id], e.position, 0, e.houseID, 3);
          break;
        }
        case CMD.BLOOM_EXPLOSION: {
          const packed = packTile(e.position);
          if (G.map[packed].groundTileID === G.bloomTileID) mapBloomExplodeSpice(packed, G.playerHouseID);
          break;
        }
        default: funcStop(e); break;
      }
    }
    if (e.commands === null || e.timeOut > explosionTimer) continue;
    explosionTimer = e.timeOut;
  }
}
