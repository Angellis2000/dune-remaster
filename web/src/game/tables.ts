/**
 * Таблицы движка Westwood (по OpenDUNE: src/table/structureinfo.c, src/structure.c, src/map.c).
 * MD-версия использует ту же нумерацию типов и групп иконок — проверено по ROM.
 */

/** Сдвиги клеток раскладки здания (упакованная позиция y*64+x). */
export const LAYOUT_TILES: number[][] = [
  [0], // 1x1
  [0, 1], // 2x1
  [0, 64], // 1x2
  [0, 1, 64, 65], // 2x2
  [0, 1, 64, 65, 128, 129], // 2x3
  [0, 1, 2, 64, 65, 66], // 3x2
  [0, 1, 2, 64, 65, 66, 128, 129, 130], // 3x3
];

export const LAYOUT_SIZE: { w: number; h: number }[] = [
  { w: 1, h: 1 },
  { w: 2, h: 1 },
  { w: 1, h: 2 },
  { w: 2, h: 2 },
  { w: 2, h: 3 },
  { w: 3, h: 2 },
  { w: 3, h: 3 },
];

export const enum Layout {
  L1x1 = 0,
  L2x1 = 1,
  L1x2 = 2,
  L2x2 = 3,
  L2x3 = 4,
  L3x2 = 5,
  L3x3 = 6,
}

export const enum IconGroup {
  Walls = 6,
  Fog = 7,
  ConcreteSlab = 8,
  Landscape = 9,
}

export const enum StructureType {
  Slab1x1 = 0,
  Slab2x2 = 1,
  Palace = 2,
  LightVehicle = 3,
  HeavyVehicle = 4,
  HighTech = 5,
  HouseOfIX = 6,
  WorTrooper = 7,
  ConstructionYard = 8,
  Windtrap = 9,
  Barracks = 10,
  Starport = 11,
  Refinery = 12,
  Repair = 13,
  Wall = 14,
  Turret = 15,
  RocketTurret = 16,
  Silo = 17,
  Outpost = 18,
}

export interface StructureInfo {
  layout: Layout;
  iconGroup: number;
  hitpoints: number;
}

/** По порядку STRUCTURE_* — раскладка, группа иконок, прочность (OpenDUNE structureinfo.c). */
export const STRUCTURE_INFO: StructureInfo[] = [
  { layout: Layout.L1x1, iconGroup: 8, hitpoints: 20 },
  { layout: Layout.L2x2, iconGroup: 8, hitpoints: 20 },
  { layout: Layout.L3x3, iconGroup: 11, hitpoints: 1000 },
  { layout: Layout.L2x2, iconGroup: 12, hitpoints: 350 },
  { layout: Layout.L3x2, iconGroup: 13, hitpoints: 200 },
  { layout: Layout.L3x2, iconGroup: 14, hitpoints: 400 },
  { layout: Layout.L2x2, iconGroup: 15, hitpoints: 400 },
  { layout: Layout.L2x2, iconGroup: 16, hitpoints: 400 },
  { layout: Layout.L2x2, iconGroup: 17, hitpoints: 400 },
  { layout: Layout.L2x2, iconGroup: 19, hitpoints: 200 },
  { layout: Layout.L2x2, iconGroup: 18, hitpoints: 300 },
  { layout: Layout.L3x3, iconGroup: 20, hitpoints: 500 },
  { layout: Layout.L3x2, iconGroup: 21, hitpoints: 450 },
  { layout: Layout.L3x2, iconGroup: 22, hitpoints: 200 },
  { layout: Layout.L1x1, iconGroup: 6, hitpoints: 50 },
  { layout: Layout.L1x1, iconGroup: 23, hitpoints: 200 },
  { layout: Layout.L1x1, iconGroup: 24, hitpoints: 200 },
  { layout: Layout.L2x2, iconGroup: 25, hitpoints: 150 },
  { layout: Layout.L2x2, iconGroup: 26, hitpoints: 500 },
];

/** Соседи клетки: север, восток, юг, запад (g_table_mapDiff). */
export const MAP_DIFF = [-64, 1, 64, -1];

/** Номер иконки стены по маске соседей (Structure_ConnectWall). */
export const WALL_CONNECT = [
  0, 3, 1, 2, 3, 3, 4, 5, 1, 6, 1, 7, 8, 9, 10, 11, 1, 12, 1, 19, 1, 16, 1, 31, 1, 28, 1, 52, 1, 45, 1, 59, 3, 3, 13, 20, 3, 3, 22, 32,
  3, 3, 13, 53, 3, 3, 38, 60, 5, 6, 7, 21, 5, 6, 7, 33, 5, 6, 7, 54, 5, 6, 7, 61, 9, 9, 9, 9, 17, 17, 23, 34, 9, 9, 9, 9, 25, 46, 39, 62,
  11, 12, 11, 12, 13, 18, 13, 35, 11, 12, 11, 12, 13, 47, 13, 63, 15, 15, 16, 16, 17, 17, 24, 36, 15, 15, 16, 16, 17, 17, 40, 64, 19, 20,
  21, 22, 23, 24, 25, 37, 19, 20, 21, 22, 23, 24, 25, 65, 27, 27, 27, 27, 27, 27, 27, 27, 14, 29, 14, 55, 26, 48, 41, 66, 29, 30, 29, 30,
  29, 30, 29, 30, 31, 30, 31, 56, 31, 49, 31, 67, 33, 33, 34, 34, 33, 33, 34, 34, 35, 35, 15, 57, 35, 35, 42, 68, 37, 38, 39, 40, 37, 38,
  39, 40, 41, 42, 43, 58, 41, 42, 43, 69, 45, 45, 45, 45, 46, 46, 46, 46, 47, 47, 47, 47, 27, 50, 43, 70, 49, 50, 49, 50, 51, 52, 51, 52,
  53, 54, 53, 54, 55, 51, 55, 71, 57, 57, 58, 58, 59, 59, 60, 60, 61, 61, 62, 62, 63, 63, 44, 72, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
  75, 76, 77, 78, 79, 73,
];

export const HOUSE_NAMES = ["Харконнены", "Атрейдесы", "Ордосы", "Фримены", "Сардаукары", "Наёмники"];
