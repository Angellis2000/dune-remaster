/**
 * Ядро движка Westwood, перенесённое из OpenDUNE (GPL-2.0): типы, глобальное состояние,
 * случайные числа, математика клеток (tile.c), кодирование индексов (tools.c), пулы объектов
 * (pool/*.c). Целочисленная арифметика повторяет C: uint8/uint16 переполняются, int8 знаковый.
 */

import { layoutTileDiff, structureInfo, unitInfo } from "./tables.ts";

// ------------------------------------------------------------------ целые как в C
export const u8 = (v: number): number => v & 0xff;
export const u16 = (v: number): number => v & 0xffff;
export const s8 = (v: number): number => ((v & 0xff) << 24) >> 24;
export const s16 = (v: number): number => ((v & 0xffff) << 16) >> 16;
/** деление нацело как в C (к нулю) */
export const idiv = (a: number, b: number): number => Math.trunc(a / b);

export interface Tile32 {
  x: number;
  y: number;
}

export const enum IT {
  NONE = 0,
  TILE = 1,
  UNIT = 2,
  STRUCTURE = 3,
}

export const UNIT_INDEX_MAX = 102;
export const STRUCTURE_INDEX_MAX_SOFT = 79;
export const STRUCTURE_INDEX_MAX_HARD = 82;
export const STRUCTURE_INDEX_WALL = 79;
export const STRUCTURE_INDEX_SLAB_2x2 = 80;
export const STRUCTURE_INDEX_SLAB_1x1 = 81;
export const TEAM_INDEX_MAX = 16;
export const HOUSE_MAX = 6;
export const INDEX_INVALID = 0xffff;
export const HOUSE_INVALID = 0xff;

export const UNIT = {
  CARRYALL: 0, ORNITHOPTER: 1, INFANTRY: 2, TROOPERS: 3, SOLDIER: 4, TROOPER: 5, SABOTEUR: 6, LAUNCHER: 7, DEVIATOR: 8,
  TANK: 9, SIEGE_TANK: 10, DEVASTATOR: 11, SONIC_TANK: 12, TRIKE: 13, RAIDER_TRIKE: 14, QUAD: 15, HARVESTER: 16, MCV: 17,
  MISSILE_HOUSE: 18, MISSILE_ROCKET: 19, MISSILE_TURRET: 20, MISSILE_DEVIATOR: 21, MISSILE_TROOPER: 22, BULLET: 23,
  SONIC_BLAST: 24, SANDWORM: 25, FRIGATE: 26, LASER_TANK:27, COMBAT_DRONE:28, MAX: 29, INVALID: 0xff,
} as const;

export const STRUCTURE = {
  SLAB_1x1: 0, SLAB_2x2: 1, PALACE: 2, LIGHT_VEHICLE: 3, HEAVY_VEHICLE: 4, HIGH_TECH: 5, HOUSE_OF_IX: 6, WOR_TROOPER: 7,
  CONSTRUCTION_YARD: 8, WINDTRAP: 9, BARRACKS: 10, STARPORT: 11, REFINERY: 12, REPAIR: 13, WALL: 14, TURRET: 15,
  ROCKET_TURRET: 16, SILO: 17, OUTPOST: 18, DRONE_PAD:19, MAX: 20, INVALID: 0xff,
} as const;

export const HOUSE = { HARKONNEN: 0, ATREIDES: 1, ORDOS: 2, FREMEN: 3, SARDAUKAR: 4, MERCENARY: 5 } as const;

export const ACTION = {
  ATTACK: 0, MOVE: 1, RETREAT: 2, GUARD: 3, AREA_GUARD: 4, HARVEST: 5, RETURN: 6, STOP: 7, AMBUSH: 8, SABOTAGE: 9,
  DIE: 10, HUNT: 11, DEPLOY: 12, DESTRUCT: 13, PATROL: 14, MAX: 14, INVALID: 0xff,
} as const;

export const MOVEMENT = { FOOT: 0, TRACKED: 1, HARVESTER: 2, WHEELED: 3, WINGER: 4, SLITHER: 5 } as const;

export const LST = {
  NORMAL_SAND: 0, PARTIAL_ROCK: 1, ENTIRELY_DUNE: 2, PARTIAL_DUNE: 3, ENTIRELY_ROCK: 4, MOSTLY_ROCK: 5,
  ENTIRELY_MOUNTAIN: 6, PARTIAL_MOUNTAIN: 7, SPICE: 8, THICK_SPICE: 9, CONCRETE_SLAB: 10, WALL: 11, STRUCTURE: 12,
  DESTROYED_WALL: 13, BLOOM_FIELD: 14,
} as const;

export const STATE = { DETECT: -2, JUSTBUILT: -1, IDLE: 0, BUSY: 1, READY: 2 } as const;

export const EXPLOSION = {
  IMPACT_SMALL: 0, IMPACT_MEDIUM: 1, IMPACT_LARGE: 2, IMPACT_EXPLODE: 3, SABOTEUR_DEATH: 4, SABOTEUR_INFILTRATE: 5,
  TANK_EXPLODE: 6, DEVIATOR_GAS: 7, SAND_BURST: 8, TANK_FLAMES: 9, WHEELED_VEHICLE: 10, DEATH_HAND: 11, UNUSED_12: 12,
  SANDWORM_SWALLOW: 13, STRUCTURE: 14, SMOKE_PLUME: 15, ORNITHOPTER_CRASH: 16, CARRYALL_CRASH: 17, MINI_ROCKET: 18,
  SPICE_BLOOM_TREMOR: 19, INVALID: 0xffff,
} as const;

export const TEAM_ACTION = { NORMAL: 0, STAGING: 1, FLEE: 2, KAMIKAZE: 3, GUARD: 4, MAX: 5, INVALID: 0xff } as const;

/** режим интерфейса (g_selectionType) */
export const SELECTION = { MENTAT: 0, TARGET: 1, PLACE: 2, UNIT: 3, STRUCTURE: 4, DEBUG: 5 } as const;

export const HOUSE_WEAPON = { MISSILE: 1, FREMEN: 2, SABOTEUR: 3 } as const;

// ------------------------------------------------------------------ объекты
export interface ObjectFlags {
  used: boolean;
  allocated: boolean;
  isNotOnMap: boolean;
  isSmoking: boolean;
  fireTwiceFlip: boolean;
  animationFlip: boolean;
  bulletIsBig: boolean;
  isWobbling: boolean;
  inTransport: boolean;
  byScenario: boolean;
  degrades: boolean;
  isHighlighted: boolean;
  isDirty: boolean;
  repairing: boolean;
  onHold: boolean;
  isUnit: boolean;
  upgrading: boolean;
}

export function newFlags(): ObjectFlags {
  return {
    used: false, allocated: false, isNotOnMap: false, isSmoking: false, fireTwiceFlip: false, animationFlip: false,
    bulletIsBig: false, isWobbling: false, inTransport: false, byScenario: false, degrades: false, isHighlighted: false,
    isDirty: false, repairing: false, onHold: false, isUnit: false, upgrading: false,
  };
}

export interface ScriptInfo {
  start: Uint16Array; // байт-код
  offsets: Uint16Array; // точки входа по типу объекта
  functions: ScriptFunction[];
  /** блок TEXT: таблица смещений (слова) и строки */
  text: Uint8Array;
}

export type ScriptFunction = (script: ScriptEngine) => number;

export interface ScriptEngine {
  delay: number;
  /** позиция в байт-коде (индекс слова) или −1, если скрипт не загружен */
  pc: number;
  scriptInfo: ScriptInfo | null;
  returnValue: number;
  framePointer: number;
  stackPointer: number;
  variables: number[]; // 5 × uint16
  stack: number[]; // 15 × uint16
  isSubroutine: number;
}

export function newScript(): ScriptEngine {
  return { delay: 0, pc: -1, scriptInfo: null, returnValue: 0, framePointer: 2, stackPointer: 15, variables: [0, 0, 0, 0, 0], stack: new Array(15).fill(0), isSubroutine: 0 };
}

export interface GObject {
  index: number;
  type: number;
  linkedID: number;
  flags: ObjectFlags;
  houseID: number;
  seenByHouses: number;
  position: Tile32;
  hitpoints: number;
  script: ScriptEngine;
}

export interface Dir24 {
  speed: number; // int8
  target: number; // int8
  current: number; // int8
}

export interface Unit {
  o: GObject;
  carryallFlight?: {height:number; serviceKey:string; serviceSince:number; lastTick:number; settling?:boolean};
  currentDestination: Tile32;
  originEncoded: number;
  /** MD $5A при ремонте: начальное время ремонта, максимум полосы HUD ($048926). */
  repairTime: number;
  actionID: number;
  nextActionID: number;
  fireDelay: number;
  distanceToDestination: number;
  targetAttack: number;
  targetMove: number;
  amount: number;
  deviated: number;
  deviatedHouse: number;
  targetLast: Tile32;
  targetPreLast: Tile32;
  orientation: [Dir24, Dir24];
  speedPerTick: number;
  speedRemainder: number;
  speed: number;
  movingSpeed: number;
  wobbleIndex: number;
  spriteOffset: number; // int8
  blinkCounter: number;
  /** бит 6 байта $7 юнита MD: танк только что выстрелил, кадр башни не обновлять ($044B7C, проверка в $012210) */
  recoil: boolean;
  /** спрайту поставлены кадры отдачи ($2F97A/$2FFFA); обычные вернутся при перерисовке после сброса recoil */
  recoilShown: boolean;
  team: number;
  timer: number;
  route: number[]; // 14 × uint8
  /** Дополнительное пользовательское состояние патруля, отсутствующее в ROM. */
  patrolActive: boolean;
  patrolStart: Tile32;
  patrolEnd: Tile32;
  patrolToEnd: boolean;
  patrolEngaging: boolean;
  /** Temporary reaction to attacking infantry; separate from the player's work order. */
  harvesterDefense?: { target:number; spice:Tile32; start:Tile32; expires:number };
  laser?: {target:number;chargeStart:number;chargeUntil:number;cooldownUntil:number;firedAt:number;from:Tile32;to:Tile32};
  drone?: {home:number;homePosition:Tile32;phase:'guard'|'attack'|'return'|'dock'|'orphan';battery:number;nextFire:number;lastTick:number;launchAfter:number;vx:number;vy:number;restockAt:number;
    members:{x:number;y:number;vx:number;vy:number;grenades:number}[]};
}

export interface Structure {
  o: GObject;
  creatorHouseID: number;
  rotationSpriteDiff: number;
  objectType: number;
  upgradeLevel: number;
  upgradeTimeLeft: number;
  countDown: number;
  buildCostRemainder: number;
  state: number; // int16
  hitpointsMax: number;
  /** MD $5A: сколько кредитов уже ушло на текущий заказ или улучшение — возвращается при отмене ($0103AA) */
  spent: number;
  /** Расходы на улучшение учитываются независимо от параллельной стройки двора. */
  upgradeSpent: number;
  /** MD $4E дворца: пауза после спецоружия в тиках дворца (ракета 300, фримены 180, диверсант 240) */
  specialWait: number;
  unitQueue?: {type:number;cost:number}[];
  buildingQueue?: {type:number;cost:number}[];
  readyBuildings?: {type:number;cost:number}[];
  readyUnits?: number[];
  prepaidUnitCost?: number;
  prepaidBuildingCost?: number;
}

export interface House {
  index: number;
  harvestersIncoming: number;
  flags: { used: boolean; human: boolean; doneFullScaleAttack: boolean; isAIActive: boolean; radarActivated: boolean };
  unitCount: number;
  unitCountMax: number;
  unitCountEnemy: number;
  unitCountAllied: number;
  structuresBuilt: number;
  credits: number;
  creditsStorage: number;
  powerProduction: number;
  powerUsage: number;
  windtrapCount: number;
  creditsQuota: number;
  palacePosition: Tile32;
  timerUnitAttack: number;
  timerSandwormAttack: number;
  /** кредиты без хранилища человека в сетевой игре (в кампании — G.playerCreditsNoSilo) */
  creditsNoSilo: number;
  timerStructureAttack: number;
  starportTimeLeft: number;
  starportLinkedID: number;
  ai_structureRebuild: [number, number][];
}

export interface Team {
  index: number;
  flags: { used: boolean };
  members: number;
  minMembers: number;
  maxMembers: number;
  movementType: number;
  action: number;
  actionStart: number;
  houseID: number;
  position: Tile32;
  targetTile: number;
  target: number;
  script: ScriptEngine;
}

export interface Tile {
  groundTileID: number;
  overlayTileID: number;
  houseID: number;
  isUnveiled: boolean;
  hasUnit: boolean;
  hasStructure: boolean;
  hasAnimation: boolean;
  hasExplosion: boolean;
  index: number;
}

function newObject(): GObject {
  return { index: 0, type: 0, linkedID: 0xff, flags: newFlags(), houseID: 0, seenByHouses: 0, position: { x: 0, y: 0 }, hitpoints: 0, script: newScript() };
}

export function newUnit(): Unit {
  return {
    o: newObject(), currentDestination: { x: 0, y: 0 }, originEncoded: 0, repairTime: 0, actionID: 0, nextActionID: 0, fireDelay: 0,
    distanceToDestination: 0, targetAttack: 0, targetMove: 0, amount: 0, deviated: 0, deviatedHouse: 0,
    targetLast: { x: 0, y: 0 }, targetPreLast: { x: 0, y: 0 },
    orientation: [{ speed: 0, target: 0, current: 0 }, { speed: 0, target: 0, current: 0 }],
    speedPerTick: 0, speedRemainder: 0, speed: 0, movingSpeed: 0, wobbleIndex: 0, spriteOffset: 0, blinkCounter: 0,
    recoil: false, recoilShown: false, team: 0, timer: 0, route: new Array(14).fill(0),
    patrolActive: false, patrolStart: { x: 0, y: 0 }, patrolEnd: { x: 0, y: 0 }, patrolToEnd: true, patrolEngaging: false,
  };
}

export function newStructure(): Structure {
  return { o: newObject(), creatorHouseID: 0, rotationSpriteDiff: 0, objectType: 0, upgradeLevel: 0, upgradeTimeLeft: 0, countDown: 0, buildCostRemainder: 0, state: 0, hitpointsMax: 0, specialWait: 0, spent: 0, upgradeSpent: 0 };
}

export function newHouse(): House {
  return {
    index: 0, harvestersIncoming: 0, flags: { used: false, human: false, doneFullScaleAttack: false, isAIActive: false, radarActivated: false },
    unitCount: 0, unitCountMax: 0, unitCountEnemy: 0, unitCountAllied: 0, structuresBuilt: 0, credits: 0, creditsStorage: 0,
    powerProduction: 0, powerUsage: 0, windtrapCount: 0, creditsQuota: 0, palacePosition: { x: 0, y: 0 }, timerUnitAttack: 0,
    timerSandwormAttack: 0, timerStructureAttack: 0, creditsNoSilo: 0, starportTimeLeft: 0, starportLinkedID: INDEX_INVALID,
    ai_structureRebuild: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  };
}

export function newTeam(): Team {
  return { index: 0, flags: { used: false }, members: 0, minMembers: 0, maxMembers: 0, movementType: 0, action: 0, actionStart: 0, houseID: 0, position: { x: 0, y: 0 }, targetTile: 0, target: 0, script: newScript() };
}

export function newTile(): Tile {
  return { groundTileID: 0, overlayTileID: 0, houseID: 0, isUnveiled: false, hasUnit: false, hasStructure: false, hasAnimation: false, hasExplosion: false, index: 0 };
}

// ------------------------------------------------------------------ глобальное состояние
export interface MapInfo {
  minX: number;
  minY: number;
  sizeX: number;
  sizeY: number;
}

export const MAP_INFOS: MapInfo[] = [
  { minX: 1, minY: 1, sizeX: 62, sizeY: 62 },
  { minX: 16, minY: 16, sizeX: 32, sizeY: 32 },
  { minX: 21, minY: 21, sizeX: 21, sizeY: 21 },
];

export interface DroneGrenade {from:Tile32;to:Tile32;released:number;impact:number;damage:number;origin:number;house:number}
export const G = {
  droneGrenades:[] as DroneGrenade[],
  map: Array.from({ length: 4096 }, newTile) as Tile[],
  mapTileID: new Uint16Array(4096),
  units: Array.from({ length: UNIT_INDEX_MAX }, newUnit) as Unit[],
  unitFind: [] as Unit[],
  structures: Array.from({ length: STRUCTURE_INDEX_MAX_HARD }, newStructure) as Structure[],
  structureFind: [] as Structure[],
  houses: Array.from({ length: HOUSE_MAX }, newHouse) as House[],
  houseFind: [] as House[],
  teams: Array.from({ length: TEAM_INDEX_MAX }, newTeam) as Team[],
  teamFind: [] as Team[],
  timerGame: 0,
  playerHouseID: 1,
  /** сетевая игра (lockstep) или null — кампания; см. isHuman */
  net: null as NetGame | null,
  mapScale: 0,
  campaignID: 1,
  scenarioID: 1,
  validateStrictIfZero: 0,
  gameSpeed: 2,
  /** 0 — easy, 1 — normal, 2 — hard; set from the front-end before loading a campaign mission. */
  difficulty: 1,
  /** особые иконки (sprites.c) */
  veiledTileID: 0,
  bloomTileID: 0,
  builtSlabTileID: 0,
  landscapeTileID: 0,
  wallTileID: 0,
  /** группы иконок: g_iconMap[g_iconMap[group] + i] */
  iconGroups: [] as Uint16Array[],
  unitSelected: null as Unit | null,
  structureActiveType: 0xffff,
  houseMissileCountdown: 0,
  unitHouseMissile: null as Unit | null,
  /** верхний левый угол видимой области, клетка (для проверок «в окне») */
  viewportPacked: 0,
  viewportTilesW: 15,
  viewportTilesH: 10,
  scriptCurrentObject: null as GObject | null,
  scriptCurrentUnit: null as Unit | null,
  scriptCurrentStructure: null as Structure | null,
  scriptCurrentTeam: null as Team | null,
  starportAvailable: new Array(27).fill(0) as number[],
  /** скрипты EMC из ROM */
  scriptUnit: null as ScriptInfo | null,
  scriptStructure: null as ScriptInfo | null,
  scriptTeam: null as ScriptInfo | null,
  /** MD: тип ландшафта по номеру иконки ($00581C), −1 — не ландшафт */
  iconLandscape: new Int8Array(512).fill(-1),
  timerGUI: 0,
  tickScenarioStart: 0,
  selectionType: SELECTION.STRUCTURE as number,
  playerCredits: 0xffff,
  playerCreditsNoSilo: 0,
  tickHousePowerMaintenance: 0,
  structureIndex: 0,
  unitActive: null as Unit | null,
  activeAction: 0xffff,
  structureActive: null as Structure | null,
  structureActivePosition: 0,
  factoryWindowConstructionYard: false,
  musicInBattle: 0,
  /** код PLAYTESTER: юниты игрока гибнут только в пасти червя */
  playtester: false,
  infiniteSpice: false,
  /** код LOOKAROUND: туман не рисуется (в оригинале переключатель $FFC198 бит 0) */
  revealAll: false,
  scenario: newScenario(),
  /** звуки и сообщения уходят в интерфейс через эти обработчики */
  onSound: (_id: number, _pos?: Tile32, _volume = 1) => {},
  /** Render notifications only; handlers must not change simulation state or consume RNG. */
  onUnitShot: (_unit: Unit, _bullet: Unit) => {},
  onVisualExplosion: (_type: number, _position: Tile32) => {},
  onConstructionStart: () => {},
  onConstructionComplete: (_yard?: Structure) => {},
  onFeedback: (_id: number) => {},
  onMessage: (_text: string, _priority = 0) => {},
  onSelect: () => {},
};

export interface Reinforcement {
  unitID: number;
  locationID: number;
  timeLeft: number;
  timeBetween: number;
  repeat: number;
}

export interface ScenarioState {
  winFlags: number;
  loseFlags: number;
  timeOut: number;
  mapScale: number;
  score: number;
  killedAllied: number;
  unitsLostAllied: number;
  killedEnemy: number;
  destroyedAllied: number;
  destroyedEnemy: number;
  harvestedAllied: number;
  harvestedEnemy: number;
  reinforcement: Reinforcement[];
}

export function newScenario(): ScenarioState {
  return {
    winFlags: 0, loseFlags: 0, timeOut: 0, mapScale: 0, score: 0, killedAllied: 0, unitsLostAllied: 0, killedEnemy: 0, destroyedAllied: 0,
    destroyedEnemy: 0, harvestedAllied: 0, harvestedEnemy: 0,
    reinforcement: Array.from({ length: 16 }, () => ({ unitID: INDEX_INVALID, locationID: 0, timeLeft: 0, timeBetween: 0, repeat: 0 })),
  };
}

export const playerHouse = (): House => G.houses[G.playerHouseID];

/**
 * Сетевая игра (lockstep): каждый игрок считает симуляцию у себя, поэтому она не должна зависеть от того,
 * кто смотрит. Дома людей — маска humans, союзы — номера команд team[дом]. G.playerHouseID в сети — только
 * местный зритель: звуки, сообщения, экран.
 */
export interface NetGame {
  humans: number;
  team: number[];
}
/** Дом под управлением человека: в кампании — игрок, в сети — любой человек. */
export const isHuman = (h: number): boolean => (G.net ? ((G.net.humans >> h) & 1) === 1 : h === G.playerHouseID);
/** Дом местного игрока — только для звуков, сообщений и экрана, не для симуляции. */
export const isLocal = (h: number): boolean => h === G.playerHouseID;
/** Маска домов людей (в кампании — один игрок). */
export const humanMask = (): number => (G.net ? G.net.humans : 1 << G.playerHouseID);
/** Дома людей по возрастанию номера. */
export function humanHouses(): number[] {
  if (!G.net) return [G.playerHouseID];
  const out: number[] = [];
  for (let h = 0; h < HOUSE_MAX; h++) if ((G.net.humans >> h) & 1) out.push(h);
  return out;
}
/** Кредиты, которые не сгорают без хранилищ (стартовые): в сети — у каждого человека свои. */
export const creditsNoSilo = (h: House): number => (G.net ? h.creditsNoSilo : G.playerCreditsNoSilo);
export function setCreditsNoSilo(h: House, value: number): void {
  if (G.net) h.creditsNoSilo = value;
  else G.playerCreditsNoSilo = value;
}

// ------------------------------------------------------------------ случайные числа (tools.c)
const seed = [0, 0, 0, 0];
let lcg = 0;

export function randomSeed(v: number): void {
  seed[0] = v & 0xff;
  seed[1] = (v >>> 8) & 0xff;
  seed[2] = (v >>> 16) & 0xff;
  seed[3] = (v >>> 24) & 0xff;
}

export function random256(): number {
  let val16 = (seed[1] << 8) | seed[2];
  let val8 = ((val16 ^ 0x8000) >> 15) & 1;
  val16 = u16((val16 << 1) | ((seed[0] >> 1) & 1));
  val8 = u8((seed[0] >> 2) - seed[0] - val8);
  seed[0] = u8((val8 << 7) | (seed[0] >> 1));
  seed[1] = val16 >> 8;
  seed[2] = val16 & 0xff;
  return seed[0] ^ seed[1];
}

/** Состояние обоих генераторов одним числом — для контрольной суммы сетевой игры. */
export function randomState(): number {
  return (((seed[0] << 24) | (seed[1] << 16) | (seed[2] << 8) | seed[3]) ^ lcg) >>> 0;
}

export function randomLCGSeed(v: number): void {
  lcg = v >>> 0;
}

function randomLCG(): number {
  // Borland C: a = 0x015A4E35, b = 1, биты 30..16
  lcg = (Math.imul(0x015a4e35, lcg) + 1) >>> 0;
  return (lcg >>> 16) & 0x7fff;
}

export function randomRange(min: number, max: number): number {
  if (min > max) [min, max] = [max, min];
  let ret: number;
  do {
    ret = u16(idiv(randomLCG() * (max - min + 1), 0x8000) + min);
  } while (ret > max);
  return ret;
}

export function adjustToGameSpeed(normal: number, minimum: number, maximum: number, inverseSpeed: boolean): number {
  let gameSpeed = G.gameSpeed;
  if (gameSpeed === 2) return normal;
  if (gameSpeed > 4) return normal;
  if (maximum > normal * 2) maximum = normal * 2;
  if (minimum < idiv(normal, 2)) minimum = idiv(normal, 2);
  if (inverseSpeed) gameSpeed = 4 - gameSpeed;
  switch (gameSpeed) {
    case 0: return minimum;
    case 1: return normal - idiv(normal - minimum, 2);
    case 3: return normal + idiv(maximum - normal, 2);
    case 4: return maximum;
  }
  return normal;
}

// ------------------------------------------------------------------ клетки (tile.c)
export const packXY = (x: number, y: number): number => u16((y << 6) | x);
export const packedX = (p: number): number => p & 0x3f;
export const packedY = (p: number): number => (p >> 6) & 0x3f;
export const posX = (t: Tile32): number => (t.x >> 8) & 0x3f;
export const posY = (t: Tile32): number => (t.y >> 8) & 0x3f;
export const packTile = (t: Tile32): number => (posY(t) << 6) | posX(t);
export const isOutOfMap = (p: number): boolean => (p & 0xf000) !== 0;
export const tileIsValid = (t: Tile32): boolean => ((t.x | t.y) & 0xc000) === 0;
export const tile = (x: number, y: number): Tile32 => ({ x: u16(x), y: u16(y) });

export function unpackTile(packed: number): Tile32 {
  return { x: (((packed >> 0) & 0x3f) << 8) | 0x80, y: (((packed >> 6) & 0x3f) << 8) | 0x80 };
}

export function tileGetDistance(from: Tile32, to: Tile32): number {
  const dx = u16(Math.abs(from.x - to.x));
  const dy = u16(Math.abs(from.y - to.y));
  if (dx > dy) return u16(dx + (dy >> 1));
  return u16(dy + (dx >> 1));
}

export const tileAddDiff = (a: Tile32, d: Tile32): Tile32 => tile(a.x + d.x, a.y + d.y);
export const tileCenter = (t: Tile32): Tile32 => ({ x: (t.x & 0xff00) | 0x80, y: (t.y & 0xff00) | 0x80 });
export const tileGetDistancePacked = (a: number, b: number): number => tileGetDistance(unpackTile(a), unpackTile(b)) >> 8;
export const tileGetDistanceRoundedUp = (a: Tile32, b: Tile32): number => (tileGetDistance(a, b) + 0x80) >> 8;

export function tileGetDirectionPacked(from: number, to: number): number {
  const ret = [0x20, 0x40, 0x20, 0x00, 0xe0, 0xc0, 0xe0, 0x00, 0x60, 0x40, 0x60, 0x80, 0xa0, 0xc0, 0xa0, 0x80];
  const x1 = packedX(from);
  const y1 = packedY(from);
  const x2 = packedX(to);
  const y2 = packedY(to);
  let index = 0;
  let dy = y1 - y2;
  if (dy < 0) {
    index |= 0x8;
    dy = -dy;
  }
  let dx = x2 - x1;
  if (dx < 0) {
    index |= 0x4;
    dx = -dx;
  }
  if (dx >= dy) {
    if (idiv(dx + 1, 2) > dy) index |= 0x1;
  } else {
    index |= 0x2;
    if (idiv(dy + 1, 2) > dx) index |= 0x1;
  }
  return ret[index];
}

// prettier-ignore
const STEP_X = [0,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51,54,57,59,62,65,67,70,73,75,78,80,82,85,87,89,91,94,96,98,100,101,103,105,107,108,110,111,113,114,116,117,118,119,120,121,122,123,123,124,125,125,126,126,126,126,126,127,126,126,126,126,126,125,125,124,123,123,122,121,120,119,118,117,116,114,113,112,110,108,107,105,103,102,100,98,96,94,91,89,87,85,82,80,78,75,73,70,67,65,62,59,57,54,51,48,45,42,39,36,33,30,27,24,21,18,15,12,9,6,3,0,-3,-6,-9,-12,-15,-18,-21,-24,-27,-30,-33,-36,-39,-42,-45,-48,-51,-54,-57,-59,-62,-65,-67,-70,-73,-75,-78,-80,-82,-85,-87,-89,-91,-94,-96,-98,-100,-102,-103,-105,-107,-108,-110,-111,-113,-114,-116,-117,-118,-119,-120,-121,-122,-123,-123,-124,-125,-125,-126,-126,-126,-126,-126,-126,-126,-126,-126,-126,-126,-125,-125,-124,-123,-123,-122,-121,-120,-119,-118,-117,-116,-114,-113,-112,-110,-108,-107,-105,-103,-102,-100,-98,-96,-94,-91,-89,-87,-85,-82,-80,-78,-75,-73,-70,-67,-65,-62,-59,-57,-54,-51,-48,-45,-42,-39,-36,-33,-30,-27,-24,-21,-18,-15,-12,-9,-6,-3];
// prettier-ignore
const STEP_Y = [127,126,126,126,126,126,125,125,124,123,123,122,121,120,119,118,117,116,114,113,112,110,108,107,105,103,102,100,98,96,94,91,89,87,85,82,80,78,75,73,70,67,65,62,59,57,54,51,48,45,42,39,36,33,30,27,24,21,18,15,12,9,6,3,0,-3,-6,-9,-12,-15,-18,-21,-24,-27,-30,-33,-36,-39,-42,-45,-48,-51,-54,-57,-59,-62,-65,-67,-70,-73,-75,-78,-80,-82,-85,-87,-89,-91,-94,-96,-98,-100,-102,-103,-105,-107,-108,-110,-111,-113,-114,-116,-117,-118,-119,-120,-121,-122,-123,-123,-124,-125,-125,-126,-126,-126,-126,-126,-126,-126,-126,-126,-126,-126,-125,-125,-124,-123,-123,-122,-121,-120,-119,-118,-117,-116,-114,-113,-112,-110,-108,-107,-105,-103,-102,-100,-98,-96,-94,-91,-89,-87,-85,-82,-80,-78,-75,-73,-70,-67,-65,-62,-59,-57,-54,-51,-48,-45,-42,-39,-36,-33,-30,-27,-24,-21,-18,-15,-12,-9,-6,-3,0,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51,54,57,59,62,65,67,70,73,75,78,80,82,85,87,89,91,94,96,98,100,101,103,105,107,108,110,111,113,114,116,117,118,119,120,121,122,123,123,124,125,125,126,126,126,126,126];

export function tileMoveByDirection(t: Tile32, orientation: number, distance: number): Tile32 {
  distance = Math.min(u16(distance), 0xff);
  if (distance === 0) return { ...t };
  const dx = STEP_X[orientation & 0xff];
  const dy = STEP_Y[orientation & 0xff];
  const rx = dx < 0 ? -64 : 64;
  const ry = dy < 0 ? -64 : 64;
  return tile(t.x + idiv(dx * distance + rx, 128), t.y - idiv(dy * distance + ry, 128));
}

export function tileMoveByRandom(t: Tile32, distance: number, center: boolean): Tile32 {
  if (distance === 0) return { ...t };
  let x = t.x;
  let y = t.y;
  let nd = random256();
  while (nd > distance) nd = nd >> 1;
  distance = nd;
  const orientation = random256();
  x = u16(x + idiv(STEP_X[orientation] * distance, 128) * 16);
  y = u16(y - idiv(STEP_Y[orientation] * distance, 128) * 16);
  if (x > 16384 || y > 16384) return { ...t };
  const ret = { x, y };
  return center ? tileCenter(ret) : ret;
}

export function tileGetDirection(from: Tile32, to: Tile32): number {
  const orientationOffsets = [0x40, 0x80, 0x0, 0xc0];
  // prettier-ignore
  const directions = [0x3fff,0x28bc,0x145a,0xd8e,0xa27,0x81b,0x6bd,0x5c3,0x506,0x474,0x3fe,0x39d,0x34b,0x306,0x2cb,0x297,0x26a,0x241,0x21d,0x1fc,0x1de,0x1c3,0x1ab,0x194,0x17f,0x16b,0x159,0x148,0x137,0x128,0x11a,0x10c];
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  let quadrant = 0;
  if (Math.abs(dx) + Math.abs(dy) > 8000) {
    dx = idiv(dx, 2);
    dy = idiv(dy, 2);
  }
  if (dy <= 0) {
    quadrant |= 0x2;
    dy = -dy;
  }
  if (dx < 0) {
    quadrant |= 0x1;
    dx = -dx;
  }
  const base = orientationOffsets[quadrant];
  let invert = false;
  let gradient = 0x7fff;
  if (dx >= dy) {
    if (dy !== 0) gradient = idiv(dx << 8, dy);
  } else {
    invert = true;
    if (dx !== 0) gradient = idiv(dy << 8, dx);
  }
  let i = 0;
  for (; i < directions.length; i++) if (directions[i] <= gradient) break;
  if (!invert) i = 64 - i;
  if (quadrant === 0 || quadrant === 3) return s8((base + 64 - i) & 0xff);
  return s8((base + i) & 0xff);
}

export const orientation8 = (o: number): number => (((o & 0xff) + 16) >> 5) & 0x7;
export const orientation16 = (o: number): number => (((o & 0xff) + 8) >> 4) & 0xf;

export function tileMoveByOrientation(position: Tile32, orientation: number): Tile32 {
  const xo = [0, 256, 256, 256, 0, -256, -256, -256];
  const yo = [-256, -256, 0, 256, 256, 256, 0, -256];
  const o = orientation8(orientation);
  const x = u16(position.x + xo[o]);
  const y = u16(position.y + yo[o]);
  if (x > 16384 || y > 16384) return { ...position };
  return { x, y };
}

// ------------------------------------------------------------------ пулы (pool/*.c)
export interface Find {
  houseID: number;
  type: number;
  index: number;
}

export const findAll = (houseID = HOUSE_INVALID, type = 0xffff): Find => ({ houseID, type, index: 0xffff });

/** Unit_Find. Unit_GetHouseID подставляется извне (учёт девиации). */
export function unitFind(f: Find, getHouse: (u: Unit) => number): Unit | null {
  if (f.index >= G.unitFind.length && f.index !== 0xffff) return null;
  f.index = u16(f.index + 1);
  for (; f.index < G.unitFind.length; f.index++) {
    const u = G.unitFind[f.index];
    if (u.o.flags.isNotOnMap && G.validateStrictIfZero === 0) continue;
    if (f.houseID !== HOUSE_INVALID && f.houseID !== getHouse(u)) continue;
    if (f.type !== 0xffff && f.type !== u.o.type) continue;
    return u;
  }
  return null;
}

export function structureFind(f: Find): Structure | null {
  const n = G.structureFind.length;
  if (f.index >= n + 3 && f.index !== 0xffff) return null;
  f.index = u16(f.index + 1);
  for (; f.index < n + 3; f.index++) {
    let s: Structure;
    if (f.index < n) {
      s = G.structureFind[f.index];
    } else {
      const special = [STRUCTURE_INDEX_WALL, STRUCTURE_INDEX_SLAB_2x2, STRUCTURE_INDEX_SLAB_1x1][f.index - n];
      s = G.structures[special];
      if (s.o.index !== special) continue;
    }
    if (s.o.flags.isNotOnMap && G.validateStrictIfZero === 0) continue;
    if (f.houseID !== HOUSE_INVALID && f.houseID !== s.o.houseID) continue;
    if (f.type !== 0xffff && f.type !== s.o.type) continue;
    return s;
  }
  return null;
}

export function houseFind(f: Find): House | null {
  if (f.index >= G.houseFind.length && f.index !== 0xffff) return null;
  f.index = u16(f.index + 1);
  for (; f.index < G.houseFind.length; f.index++) return G.houseFind[f.index];
  return null;
}

export function teamFind(f: Find): Team | null {
  if (f.index >= G.teamFind.length && f.index !== 0xffff) return null;
  f.index = u16(f.index + 1);
  for (; f.index < G.teamFind.length; f.index++) {
    const t = G.teamFind[f.index];
    if (f.houseID === HOUSE_INVALID || f.houseID === t.houseID) return t;
  }
  return null;
}

/** Сбросить объект на месте: ссылки на него (выделенный юнит и т. п.) остаются теми же, как указатели в C. */
function resetUnit(u: Unit): void {
  const n = newUnit();
  Object.assign(u.o, n.o);
  const { o: _o, ...rest } = n;
  Object.assign(u, rest);
}

function resetStructure(s: Structure): void {
  s.unitQueue=[];s.buildingQueue=[];s.readyBuildings=[];s.readyUnits=[];s.prepaidUnitCost=undefined;s.prepaidBuildingCost=undefined;
  const n = newStructure();
  Object.assign(s.o, n.o);
  const { o: _o, ...rest } = n;
  Object.assign(s, rest);
}

export function poolsReset(): void {
  G.units.forEach(resetUnit);
  G.unitFind.length = 0;
  G.structures.forEach(resetStructure);
  G.structureFind.length = 0;
  G.houses.forEach((h) => Object.assign(h, newHouse()));
  G.houseFind.length = 0;
  G.teams.forEach((t) => Object.assign(t, newTeam()));
  G.teamFind.length = 0;
  G.map.forEach((t) => Object.assign(t, newTile()));
  G.mapTileID.fill(0);
}

export function houseAllocate(index: number): House | null {
  if (index >= HOUSE_MAX) return null;
  const h = G.houses[index];
  if (h.flags.used) return null;
  Object.assign(h, newHouse());
  h.index = index;
  h.flags.used = true;
  G.houseFind.push(h);
  return h;
}

export function teamAllocate(index: number): Team | null {
  if (index === INDEX_INVALID) {
    for (index = 0; index < TEAM_INDEX_MAX; index++) if (!G.teams[index].flags.used) break;
    if (index === TEAM_INDEX_MAX) return null;
  } else if (G.teams[index].flags.used) return null;
  const t = G.teams[index];
  Object.assign(t, newTeam());
  t.index = index;
  t.flags.used = true;
  G.teamFind.push(t);
  return t;
}

export function structureAllocate(index: number, type: number): Structure | null {
  if (type === STRUCTURE.SLAB_1x1) index = STRUCTURE_INDEX_SLAB_1x1;
  else if (type === STRUCTURE.SLAB_2x2) index = STRUCTURE_INDEX_SLAB_2x2;
  else if (type === STRUCTURE.WALL) index = STRUCTURE_INDEX_WALL;
  else {
    if (index === INDEX_INVALID) {
      for (index = 0; index < STRUCTURE_INDEX_MAX_SOFT; index++) if (!G.structures[index].o.flags.used) break;
      if (index === STRUCTURE_INDEX_MAX_SOFT) return null;
    } else if (G.structures[index].o.flags.used) return null;
  }
  const s = G.structures[index];
  resetStructure(s);
  s.o.index = index;
  s.o.type = type;
  s.o.linkedID = 0xff;
  s.o.flags.used = true;
  s.o.flags.allocated = true;
  s.o.script.delay = 0;
  if (index < STRUCTURE_INDEX_MAX_SOFT) G.structureFind.push(s);
  return s;
}

export function structureFree(s: Structure): void {
  s.readyBuildings = [];
  for (const index of s.readyUnits?.splice(0) ?? []) unitFree(G.units[index]);
  // Pending orders have not been manufactured; return their reserved funds once.
  if(s.unitQueue?.length){G.houses[s.o.houseID].credits+=s.unitQueue.reduce((sum,item)=>sum+item.cost,0);s.unitQueue=[];}
  if(s.buildingQueue?.length){G.houses[s.o.houseID].credits+=s.buildingQueue.reduce((sum,item)=>sum+item.cost,0);s.buildingQueue=[];}
  s.prepaidUnitCost=undefined;s.prepaidBuildingCost=undefined;
  s.o.flags = newFlags();
  s.o.script.pc = -1;
  if (s.o.type === STRUCTURE.SLAB_1x1 || s.o.type === STRUCTURE.SLAB_2x2 || s.o.type === STRUCTURE.WALL) return;
  const i = G.structureFind.indexOf(s);
  if (i >= 0) G.structureFind.splice(i, 1);
}

/** Unit_Allocate (pool/unit.c) */
export function unitAllocate(index: number, type: number, houseID: number): Unit | null {
  if (type === 0xff || houseID === 0xff) return null;
  const h = G.houses[houseID];
  if (h.unitCount >= h.unitCountMax) {
    const mt = unitInfo[type].movementType;
    if ((mt !== MOVEMENT.WINGER && mt !== MOVEMENT.SLITHER || type===UNIT.COMBAT_DRONE) && G.validateStrictIfZero === 0) return null;
  }
  let u: Unit;
  if (index === 0 || index === INDEX_INVALID) {
    const { indexStart, indexEnd } = unitInfo[type];
    for (index = indexStart; index <= indexEnd; index++) if (!G.units[index].o.flags.used) break;
    if (index > indexEnd) return null;
    u = G.units[index];
  } else {
    u = G.units[index];
    if (u.o.flags.used) return null;
  }
  h.unitCount++;
  resetUnit(u);
  u.o.index = index;
  u.o.type = type;
  u.o.houseID = houseID;
  u.o.linkedID = 0xff;
  u.o.flags.used = true;
  u.o.flags.allocated = true;
  u.o.flags.isUnit = true;
  u.o.script.delay = 0;
  u.route[0] = 0xff;
  if (type === UNIT.SANDWORM) u.amount = 3;
  G.unitFind.push(u);
  return u;
}

/** Unit_Free (pool/unit.c) */
export function unitFree(u: Unit): void {
  u.o.flags = newFlags();
  u.o.script.pc = -1;
  const i = G.unitFind.indexOf(u);
  if (i < 0) return;
  G.unitFind.splice(i, 1);
  G.houses[u.o.houseID].unitCount--;
}

// ------------------------------------------------------------------ индексы объектов (tools.c)
export function indexGetType(encoded: number): IT {
  switch (encoded & 0xc000) {
    case 0x4000: return IT.UNIT;
    case 0x8000: return IT.STRUCTURE;
    case 0xc000: return IT.TILE;
    default: return IT.NONE;
  }
}

export function indexDecode(encoded: number): number {
  if (indexGetType(encoded) === IT.TILE) return packXY((encoded >> 1) & 0x3f, (encoded >> 8) & 0x3f);
  return encoded & 0x3fff;
}

export function indexEncode(index: number, type: IT): number {
  switch (type) {
    case IT.TILE: {
      let ret = ((packedX(index) << 1) + 1) << 0;
      ret |= ((packedY(index) << 1) + 1) << 7;
      return u16(ret | 0xc000);
    }
    case IT.UNIT:
      if (index >= UNIT_INDEX_MAX || !G.units[index].o.flags.allocated) return 0;
      return index | 0x4000;
    case IT.STRUCTURE:
      return index | 0x8000;
    default:
      return 0;
  }
}

export function indexIsValid(encoded: number): boolean {
  if (encoded === 0) return false;
  const index = indexDecode(encoded);
  switch (indexGetType(encoded)) {
    case IT.UNIT:
      if (index >= UNIT_INDEX_MAX) return false;
      return G.units[index].o.flags.used && G.units[index].o.flags.allocated;
    case IT.STRUCTURE:
      if (index >= STRUCTURE_INDEX_MAX_HARD) return false;
      return G.structures[index].o.flags.used;
    case IT.TILE:
      return true;
    default:
      return false;
  }
}

export function indexGetUnit(encoded: number): Unit | null {
  if (indexGetType(encoded) !== IT.UNIT) return null;
  const i = indexDecode(encoded);
  return i < UNIT_INDEX_MAX ? G.units[i] : null;
}

export function indexGetStructure(encoded: number): Structure | null {
  if (indexGetType(encoded) !== IT.STRUCTURE) return null;
  const i = indexDecode(encoded);
  return i < STRUCTURE_INDEX_MAX_HARD ? G.structures[i] : null;
}

export function indexGetObject(encoded: number): GObject | null {
  switch (indexGetType(encoded)) {
    case IT.UNIT: {
      const i = indexDecode(encoded);
      return i < UNIT_INDEX_MAX ? G.units[i].o : null;
    }
    case IT.STRUCTURE: {
      const i = indexDecode(encoded);
      return i < STRUCTURE_INDEX_MAX_HARD ? G.structures[i].o : null;
    }
    default:
      return null;
  }
}

export function indexGetPackedTile(encoded: number): number {
  const index = indexDecode(encoded);
  switch (indexGetType(encoded)) {
    case IT.TILE:
      return index;
    case IT.UNIT:
      return index < UNIT_INDEX_MAX ? packTile(G.units[index].o.position) : 0;
    case IT.STRUCTURE:
      return index < STRUCTURE_INDEX_MAX_HARD ? packTile(G.structures[index].o.position) : 0;
    default:
      return 0;
  }
}

export function indexGetTile(encoded: number): Tile32 {
  const index = indexDecode(encoded);
  switch (indexGetType(encoded)) {
    case IT.TILE:
      return unpackTile(index);
    case IT.UNIT:
      return index < UNIT_INDEX_MAX ? { ...G.units[index].o.position } : { x: 0, y: 0 };
    case IT.STRUCTURE: {
      if (index >= STRUCTURE_INDEX_MAX_HARD) return { x: 0, y: 0 };
      const s = G.structures[index];
      return tileAddDiff(s.o.position, layoutTileDiff[structureInfo[s.o.type].layout]);
    }
    default:
      return { x: 0, y: 0 };
  }
}
