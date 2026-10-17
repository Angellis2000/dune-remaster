/**
 * Тексты сообщений движка по-русски. Позже их можно заменить строками из русского ROM.
 */
import { UNIT_NAMES, STRUCTURE_NAMES } from "../game/names.ts";
import { ACTION, G, LST, STRUCTURE, UNIT, type Unit } from "./core.ts";
import { mapGetLandscapeType } from "./map.ts";
import { indexGetStructure, packTile } from "./core.ts";
import { unitGetHouseID } from "./unit.ts";

export const HOUSE_NAMES_GEN = ["Харконненов", "Атрейдесов", "Ордосов", "Фрименов", "Сардаукаров", "Наёмников"];

const unitName = (t: number) => UNIT_NAMES[t] ?? `юнит ${t}`;
const structureName = (t: number) => STRUCTURE_NAMES[t] ?? `здание ${t}`;

export const msg = {
  unitStatus(u: Unit): string {
    if (u.o.type === UNIT.SANDWORM) return "Песчаный червь.";
    let s = `${unitName(u.o.type)} ${HOUSE_NAMES_GEN[unitGetHouseID(u)] ?? ""}`.trim();
    if (u.o.type === UNIT.HARVESTER) {
      const full = `заполнен на ${u.amount}%`;
      let tail = full;
      if (u.actionID === ACTION.HARVEST && u.amount < 100) {
        const type = mapGetLandscapeType(packTile(u.o.position));
        if (type === LST.SPICE || type === LST.THICK_SPICE) tail = `${full}, собирает пряность`;
      }
      if (u.actionID === ACTION.MOVE && indexGetStructure(u.targetMove)) tail = `${full}, возвращается`;
      else if (u.o.script.variables[4] !== 0) tail = `${full}, ждёт транспортник`;
      if (u.amount === 0) tail = tail.replace(full, "пуст");
      s += `: ${tail}`;
    }
    return s + ".";
  },
  buildComplete(structureType: number, objectType: number): string {
    if (structureType === STRUCTURE.CONSTRUCTION_YARD) return `${structureName(objectType)}: готово, можно ставить.`;
    if (structureType === STRUCTURE.HIGH_TECH) return `${unitName(objectType)}: готово.`;
    return `${unitName(objectType)}: готов и ждёт приказов.`;
  },
  productionStarted(structureType: number, objectType: number): string {
    const name = structureType === STRUCTURE.CONSTRUCTION_YARD ? structureName(objectType) : unitName(objectType);
    return `Начато производство: ${name}.`;
  },
  cannotPlace(type: number): string {
    return `Здесь нельзя поставить: ${structureName(type)}.`;
  },
  destroyed(houseID: number, type: number, isStructure: boolean): string {
    return `${isStructure ? structureName(type) : unitName(type)} ${HOUSE_NAMES_GEN[houseID] ?? ""} уничтожен.`;
  },
  insufficientFunds: "Недостаточно средств. Строительство остановлено.",
  unableToCreateMore: "Больше создать нельзя.",
  upgradingStarts: "Улучшение начато.",
  upgradingStops: "Улучшение остановлено.",
  repairingStarts: "Ремонт начат.",
  repairingStops: "Ремонт остановлен.",
  cannotPlaceFoundation: "Здесь нельзя положить бетон.",
  notEnoughPowerForRadar: "Радару не хватает энергии. Постройте ветряки.",
  insufficientPower: "Не хватает энергии. Нужен ветряк.",
  spiceLost: "Не хватает хранилищ — пряность потеряна.",
  storageLow: "Хранилища почти заполнены. Постройте хранилища пряности.",
  creditsLow: "Мало кредитов. Собирайте пряность.",
  harvesterHeading: "Харвестер направляется к очистительному заводу.",
  sandworms: "Внимание: песчаные черви! Шай-Хулуд пожирает всё на песке.",
  unableToDeploy: "Здесь развернуться нельзя.",
  searchSpice: "Ищите поля пряности для сбора.",
  missionWon: "Миссия выполнена!",
  missionLost: "Миссия провалена.",
};

export { G };
