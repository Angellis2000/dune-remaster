/**
 * Таблицы движка: структура как у OpenDUNE (tables.gen.ts — автоперевод src/table/*.c),
 * числа юнитов MD-версии подставляются из ROM (описания типов по адресу $06C5BC, 0x5C байт).
 */
import * as T from "./tables.gen.ts";

export interface ObjectInfo {
  stringID_abbrev: number;
  name: string;
  stringID_full: number;
  wsa: string;
  flags: {
    hasShadow: number; factory: number; notOnConcrete: number; busyStateIsIncoming: number; blurTile: number; hasTurret: number;
    conquerable: number; canBePickedUp: number; noMessageOnDeath: number; tabSelectable: number; scriptNoSlowdown: number;
    targetAir: number; priority: number;
  };
  spawnChance: number;
  hitpoints: number;
  fogUncoverRadius: number;
  spriteID: number;
  buildCredits: number;
  buildTime: number;
  availableCampaign: number;
  structuresRequired: number;
  sortPriority: number;
  upgradeLevelRequired: number;
  actionsPlayer: number[];
  available: number;
  hintStringID: number;
  priorityBuild: number;
  priorityTarget: number;
  availableHouse: number;
}

export interface UnitInfo {
  o: ObjectInfo;
  indexStart: number;
  indexEnd: number;
  flags: {
    isBullet: number; explodeOnDeath: number; sonicProtection: number; canWobble: number; isTracked: number; isGroundUnit: number;
    mustStayInMap: number; firesTwice: number; impactOnSand: number; isNotDeviatable: number; hasAnimationSet: number;
    notAccurate: number; isNormalUnit: number;
  };
  dimension: number;
  movementType: number;
  animationSpeed: number;
  movingSpeedFactor: number;
  turningSpeed: number;
  groundSpriteID: number;
  turretSpriteID: number;
  actionAI: number;
  displayMode: number;
  destroyedSpriteID: number;
  fireDelay: number;
  fireDistance: number;
  damage: number;
  explosionType: number;
  bulletType: number;
  bulletSound: number;
}

export interface StructureInfo {
  o: ObjectInfo;
  /** MD: анимации клеток здания по состоянию (простой, работа, готово) — команды [код, параметр] */
  animations: ([number, number][] | null)[];
  enterFilter: number;
  creditsStorage: number;
  powerUsage: number;
  layout: number;
  iconGroup: number;
  animationIndex: number[];
  buildableUnits: number[];
  upgradeCampaign: number[];
}

export interface LandscapeInfo {
  movementSpeed: number[];
  letUnitWobble: number;
  isValidForStructure: number;
  isSand: number;
  isValidForStructure2: number;
  canBecomeSpice: number;
  craterType: number;
  radarColour: number;
  spriteID: number;
}

export interface ActionInfo {
  stringID: number;
  name: string;
  switchType: number;
  selectionType: number;
  soundID: number;
}

export interface HouseInfo {
  name: string;
  toughness: number;
  degradingChance: number;
  degradingAmount: number;
  minimapColor: number;
  specialCountDown: number;
  starportDeliveryTime: number;
  prefixChar: string;
  specialWeapon: number;
  musicWin: number;
  musicLose: number;
  musicBriefing: number;
  voiceFilename: string;
}

/** Объект из сгенерированной таблицы: поле флагов при автопереводе получает имя "_4". */
function objectInfo(raw: any): ObjectInfo {
  const o = { ...raw };
  o.flags = raw.flags ?? raw._4;
  delete o._4;
  return o as ObjectInfo;
}

function unitInfoFrom(raw: any[]): UnitInfo {
  const [o, indexStart, indexEnd, flags, dimension, movementType, animationSpeed, movingSpeedFactor, turningSpeed, groundSpriteID, turretSpriteID, actionAI, displayMode, destroyedSpriteID, fireDelay, fireDistance, damage, explosionType, bulletType, bulletSound] = raw;
  return {
    o: objectInfo(o), indexStart, indexEnd, flags, dimension, movementType, animationSpeed, movingSpeedFactor, turningSpeed,
    groundSpriteID, turretSpriteID: turretSpriteID & 0xffff, actionAI, displayMode, destroyedSpriteID, fireDelay, fireDistance, damage,
    explosionType: explosionType & 0xffff, bulletType: bulletType & 0xff, bulletSound,
  };
}

function structureInfoFrom(raw: any[]): StructureInfo {
  const [o, enterFilter, creditsStorage, powerUsage, layout, iconGroup, animationIndex, buildableUnits, upgradeCampaign] = raw;
  return { o: objectInfo(o), animations: [null, null, null], enterFilter, creditsStorage, powerUsage, layout, iconGroup, animationIndex, buildableUnits, upgradeCampaign };
}

/** Таблицы с назначенными индексами ([STRUCTURE_LAYOUT_2x2] = …) генератор выдал объектом — порядок значений верный. */
const arr = (v: any): any[] => (Array.isArray(v) ? v : Object.values(v));

export const unitInfo: UnitInfo[] = (T.g_table_unitInfo as any[][]).map(unitInfoFrom);
export const structureInfo: StructureInfo[] = (T.g_table_structureInfo as any[][]).map(structureInfoFrom);
export const landscapeInfo: LandscapeInfo[] = T.g_table_landscapeInfo;
export const actionInfo: ActionInfo[] = T.g_table_actionInfo;
export const houseInfo: HouseInfo[] = T.g_table_houseInfo;
export const tableMapDiff: number[] = T.g_table_mapDiff;
export const tableTileDiff: { x: number; y: number }[][] = (T.g_table_tilediff as number[][][]).map((row) => row.map(([x, y]) => ({ x, y })));
export const layoutTiles: number[][] = arr(T.g_table_structure_layoutTiles);
export const layoutTileCount: number[] = arr(T.g_table_structure_layoutTileCount);
export const layoutTileDiff: { x: number; y: number }[] = (arr(T.g_table_structure_layoutTileDiff) as number[][]).map(([x, y]) => ({ x, y }));
export const layoutSize: { width: number; height: number }[] = (arr(T.g_table_structure_layoutSize) as number[][]).map(([width, height]) => ({ width, height }));
export const layoutTilesAround: number[][] = arr(T.g_table_structure_layoutTilesAround);
export const layoutEdgeTiles: number[][] = arr(T.g_table_structure_layoutEdgeTiles);
export const actionsAI: number[] = T.g_table_actionsAI;
export const explosionTable: number[][][] = T.g_table_explosion;
export const animationUnitMove: [number, number][][] = T.g_table_animation_unitMove;
export const animationUnitScript1: [number, number][][] = T.g_table_animation_unitScript1;
export const animationUnitScript2: [number, number][][] = T.g_table_animation_unitScript2;
export const animationMap: [number, number][][] = T.g_table_animation_map;
export const animationStructure: [number, number][][] = T.g_table_animation_structure;

// ------------------------------------------------------------------ числа MD-версии из ROM
export const MD = {
  unitInfo: 0x06c5bc,
  structureInfo: 0x06afae, // 19 записей по 0x66 байт
  landscapeInfo: 0x06ccb6, // 15 записей по 0x1c байт
  iconLandscape: 0x00581c, // тип ландшафта по номеру иконки (358 байт, FF — нет)
  animationRubble: 0x06ae30, // g_table_animation_structure[0]
  animationBuild: 0x06ae36, // g_table_animation_structure[1]
  houseInfo: 0x06c75c, // 6 записей по 30 байт, раскладка как у PC (без имени)
} as const;

/** Флаги ObjectInfo в MD: тот же порядок, что у PC, но с лишним битом 3. */
const MD_OBJECT_FLAGS: [keyof ObjectInfo["flags"], number][] = [
  ["hasShadow", 0x0001], ["factory", 0x0002], ["notOnConcrete", 0x0004], ["busyStateIsIncoming", 0x0010], ["blurTile", 0x0020],
  ["hasTurret", 0x0040], ["conquerable", 0x0080], ["canBePickedUp", 0x0100], ["noMessageOnDeath", 0x0200], ["tabSelectable", 0x0400],
  ["scriptNoSlowdown", 0x0800], ["targetAir", 0x1000], ["priority", 0x2000],
];

/** Флаги UnitInfo в MD (биты 0, 8 и 9 в OpenDUNE не описаны). */
const MD_UNIT_FLAGS: [keyof UnitInfo["flags"], number][] = [
  ["isBullet", 0x0002], ["explodeOnDeath", 0x0004], ["sonicProtection", 0x0008], ["canWobble", 0x0010], ["isTracked", 0x0020],
  ["isGroundUnit", 0x0040], ["mustStayInMap", 0x0080], ["firesTwice", 0x0400], ["impactOnSand", 0x0800], ["isNotDeviatable", 0x1000],
  ["hasAnimationSet", 0x2000], ["notAccurate", 0x4000], ["isNormalUnit", 0x8000],
];

/** Тип ландшафта по номеру иконки (MD). */
export const iconLandscape = new Int8Array(512).fill(-1);

export let animationStructureRubble: [number, number][] = T.g_table_animation_structure[0];
export let animationStructureBuild: [number, number][] = T.g_table_animation_structure[1];

/** Анимация в формате ROM: слова «код<<12 | параметр» (параметр — знаковые 12 бит), до STOP/ABORT/REWIND. */
function readAnimation(rom: Uint8Array, at: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 64; i++) {
    const w = (rom[at + i * 2] << 8) | rom[at + i * 2 + 1];
    const cmd = w >> 12;
    const param = ((w & 0xfff) << 20) >> 20;
    out.push([cmd, param]);
    if (cmd === 0 || cmd === 1 || cmd === 4) break;
  }
  return out;
}

/**
 * Подставить числа MD-версии из ROM: описания юнитов (0x5C байт, раскладка как у PC),
 * зданий (0x66 байт), ландшафта и таблицу «иконка → тип ландшафта».
 */
export function applyRomTables(rom: Uint8Array): void {
  const r16 = (o: number) => (rom[o] << 8) | rom[o + 1];
  const s16 = (o: number) => (r16(o) << 16) >> 16;
  const r32 = (o: number) => ((rom[o] << 24) | (rom[o + 1] << 16) | (rom[o + 2] << 8) | rom[o + 3]) >>> 0;
  const objectFromRom = (oi: ObjectInfo, p: number) => {
    const f = r16(p + 0x0c);
    for (const [name, bit] of MD_OBJECT_FLAGS) oi.flags[name] = f & bit ? 1 : 0;
    oi.spawnChance = r16(p + 0x0e);
    oi.hitpoints = r16(p + 0x10);
    oi.fogUncoverRadius = r16(p + 0x12);
    oi.buildCredits = r16(p + 0x16);
    oi.buildTime = r16(p + 0x18);
    oi.availableCampaign = r16(p + 0x1a);
    oi.structuresRequired = r32(p + 0x1c);
    oi.sortPriority = rom[p + 0x20];
    oi.upgradeLevelRequired = rom[p + 0x21];
    oi.actionsPlayer = [r16(p + 0x22), r16(p + 0x24), r16(p + 0x26), r16(p + 0x28)];
    oi.priorityBuild = r16(p + 0x2e);
    oi.priorityTarget = r16(p + 0x30);
    oi.availableHouse = rom[p + 0x32];
  };

  for (let t = 0; t < unitInfo.length; t++) {
    const p = r32(MD.unitInfo + t * 4);
    const ui = unitInfo[t];
    objectFromRom(ui.o, p);
    ui.indexStart = r16(p + 0x34);
    ui.indexEnd = r16(p + 0x36);
    const f = r16(p + 0x38);
    for (const [name, bit] of MD_UNIT_FLAGS) ui.flags[name] = f & bit ? 1 : 0;
    ui.dimension = r16(p + 0x3a);
    ui.movementType = r16(p + 0x3e);
    ui.animationSpeed = r16(p + 0x40);
    ui.movingSpeedFactor = r16(p + 0x42);
    ui.turningSpeed = r16(p + 0x44) & 0xff;
    ui.groundSpriteID = r16(p + 0x46);
    ui.turretSpriteID = r16(p + 0x48);
    ui.actionAI = r16(p + 0x4a);
    ui.displayMode = r16(p + 0x4c);
    ui.fireDelay = r16(p + 0x50);
    ui.fireDistance = r16(p + 0x52);
    ui.damage = r16(p + 0x54);
    ui.explosionType = r16(p + 0x56);
    ui.bulletType = r16(p + 0x58) & 0xff;
    ui.bulletSound = r16(p + 0x5a);
  }

  for (let t = 0; t < structureInfo.length; t++) {
    const p = MD.structureInfo + t * 0x66;
    const si = structureInfo[t];
    objectFromRom(si.o, p);
    si.enterFilter = r32(p + 0x34);
    si.creditsStorage = r16(p + 0x38);
    si.powerUsage = s16(p + 0x3a);
    si.layout = r16(p + 0x3c);
    si.iconGroup = r16(p + 0x3e);
    si.animations = [0, 1, 2].map((i) => {
      const a = r32(p + 0x40 + i * 4);
      return a === 0 ? null : readAnimation(rom, a);
    });
    si.buildableUnits = Array.from({ length: 10 }, (_, i) => r16(p + 0x4c + i * 2) & 0xff);
    si.upgradeCampaign = [r16(p + 0x60), r16(p + 0x62), r16(p + 0x64)];
  }

  for (let t = 0; t < landscapeInfo.length; t++) {
    const p = MD.landscapeInfo + t * 0x1c;
    const li = landscapeInfo[t];
    li.movementSpeed = Array.from(rom.subarray(p, p + 6));
    li.letUnitWobble = r16(p + 6) ? 1 : 0;
    li.isValidForStructure = r16(p + 8) ? 1 : 0;
    li.isSand = r16(p + 10) ? 1 : 0;
    li.isValidForStructure2 = r16(p + 12) ? 1 : 0;
    li.canBecomeSpice = r16(p + 14) ? 1 : 0;
    li.craterType = r16(p + 16);
    li.radarColour = r16(p + 18);
  }

  // дома: стойкость, износ, цвет радара, время спецоружия и доставки, спецоружие, мелодии
  for (let h = 0; h < houseInfo.length; h++) {
    const p = MD.houseInfo + h * 30;
    const hi = houseInfo[h];
    hi.toughness = r16(p + 2);
    hi.degradingChance = r16(p + 4);
    // MD прибавляет 1 к износу при ударе ($00BEB2), в таблице хранится на 1 меньше, чем у PC
    hi.degradingAmount = r16(p + 6) + 1;
    hi.minimapColor = r16(p + 8);
    hi.specialCountDown = r16(p + 10);
    hi.starportDeliveryTime = r16(p + 12);
    hi.specialWeapon = r16(p + 16);
  }

  iconLandscape.fill(-1);
  for (let i = 0; i < 358; i++) iconLandscape[i] = (rom[MD.iconLandscape + i] << 24) >> 24;

  animationStructureRubble = readAnimation(rom, MD.animationRubble);
  animationStructureBuild = readAnimation(rom, MD.animationBuild);
}
