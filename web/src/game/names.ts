/**
 * Типы юнитов и зданий. Порядок как в движке Westwood (OpenDUNE src/unit.h, src/structure.h):
 * таблицы картинок меню в ROM MD-версии идут ровно в этом порядке.
 */
export const UNIT_NAMES = [
  "Транспортник", // 0 UNIT_CARRYALL
  "Орнитоптер", // 1 UNIT_ORNITHOPTER
  "Пехота", // 2 UNIT_INFANTRY
  "Тяжёлая пехота", // 3 UNIT_TROOPERS
  "Солдат", // 4 UNIT_SOLDIER
  "Штурмовик", // 5 UNIT_TROOPER
  "Диверсант", // 6 UNIT_SABOTEUR
  "Ракетная установка", // 7 UNIT_LAUNCHER
  "Девиатор", // 8 UNIT_DEVIATOR
  "Танк", // 9 UNIT_TANK
  "Осадный танк", // 10 UNIT_SIEGE_TANK
  "Опустошитель", // 11 UNIT_DEVASTATOR
  "Звуковой танк", // 12 UNIT_SONIC_TANK
  "Трайк", // 13 UNIT_TRIKE
  "Рейдер", // 14 UNIT_RAIDER_TRIKE
  "Квадроцикл", // 15 UNIT_QUAD
  "Харвестер", // 16 UNIT_HARVESTER
  "MCV", // 17 UNIT_MCV
];

export const STRUCTURE_NAMES = [
  "Бетонная плита", // 0 STRUCTURE_SLAB_1x1
  "Бетон 2×2", // 1 STRUCTURE_SLAB_2x2
  "Дворец", // 2 STRUCTURE_PALACE
  "Лёгкий завод", // 3 STRUCTURE_LIGHT_VEHICLE
  "Тяжёлый завод", // 4 STRUCTURE_HEAVY_VEHICLE
  "Завод хай-тек", // 5 STRUCTURE_HIGH_TECH
  "Дом IX", // 6 STRUCTURE_HOUSE_OF_IX
  "Казармы WOR", // 7 STRUCTURE_WOR_TROOPER
  "Строительный двор", // 8 STRUCTURE_CONSTRUCTION_YARD
  "Ветряк", // 9 STRUCTURE_WINDTRAP
  "Казармы", // 10 STRUCTURE_BARRACKS
  "Космопорт", // 11 STRUCTURE_STARPORT
  "Очистительный завод", // 12 STRUCTURE_REFINERY
  "Ремонтный цех", // 13 STRUCTURE_REPAIR
  "Стена", // 14 STRUCTURE_WALL
  "Турель", // 15 STRUCTURE_TURRET
  "Ракетная турель", // 16 STRUCTURE_ROCKET_TURRET
  "Хранилище пряности", // 17 STRUCTURE_SILO
  "Радар", // 18 STRUCTURE_OUTPOST
];
