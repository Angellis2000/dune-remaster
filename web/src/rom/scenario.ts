/**
 * Сценарии миссий. В PC-версии это текстовые SCENxxx.INI, в MD — те же секции, но в двоичном виде.
 * Файлы адресуются по старым именам через таблицу $052C54: 33 записи [указатель на имя][указатель на данные].
 *
 * Запись сценария — слово `секция<<8 | ключ` и значения словами; ключи — буквы ключей PC (Q, C, B, M…).
 * Конец — 0xFFFF. Координаты — packed-позиция 64×64 (y<<6 | x), у карт 32×32 со сдвигом на 16.
 */
import { readU16, readU32 } from "./md.ts";

const FILE_TABLE = 0x052c54;
const FILE_COUNT = 33;

/** Секции домов 2..5 → houseID движка: Харконнены, Атрейдесы, Ордосы, Сардаукары. */
const HOUSE_SECTION: Record<number, number> = { 2: 0, 3: 1, 4: 2, 5: 4 };

export interface XY {
  x: number;
  y: number;
}

export interface ScenarioHouse {
  id: number;
  credits: number;
  quota: number;
  brain: "human" | "cpu";
  maxUnits: number;
}

export interface ScenarioTeam {
  house: number;
  aiMode: string;
  movement: string;
  min: number;
  max: number;
}

export interface ScenarioUnit extends XY {
  house: number;
  type: number;
  hp: number;
  orientation: number;
  action: number;
}

export interface ScenarioStructure extends XY {
  house: number;
  type: number;
  hp: number;
}

export interface ScenarioReinforcement {
  /** дом, тип юнита, место появления, время — как в OpenDUNE */
  values: [number, number, number, number];
}

export interface Scenario {
  name: string;
  losePicture: string;
  winPicture: string;
  briefPicture: string;
  timeOut: number;
  mapScale: number;
  /** номер готовой карты в таблице $01B27A (в PC здесь было зерно генератора) */
  mapIndex: number;
  cursor: XY;
  tactical: XY;
  loseFlags: number;
  winFlags: number;
  bloom: XY[];
  field: XY[];
  houses: ScenarioHouse[];
  /** тип юнита → сколько штук у CHOAM */
  choam: Map<number, number>;
  teams: ScenarioTeam[];
  units: ScenarioUnit[];
  structures: ScenarioStructure[];
  reinforcements: ScenarioReinforcement[];
}

/** Имя файла → адрес его данных в ROM. */
export function readFiles(rom: Uint8Array): Map<string, number> {
  const files = new Map<string, number>();
  for (let i = 0; i < FILE_COUNT; i++) {
    const namePtr = readU32(rom, FILE_TABLE + i * 8);
    const dataPtr = readU32(rom, FILE_TABLE + i * 8 + 4);
    let name = "";
    for (let p = namePtr; rom[p]; p++) name += String.fromCharCode(rom[p]);
    files.set(name, dataPtr);
  }
  return files;
}

export function parseScenario(rom: Uint8Array, name: string, start: number): Scenario {
  const sc: Scenario = {
    name,
    losePicture: "",
    winPicture: "",
    briefPicture: "",
    timeOut: 0,
    mapScale: 0,
    mapIndex: 1,
    cursor: { x: 0, y: 0 },
    tactical: { x: 0, y: 0 },
    loseFlags: 0,
    winFlags: 0,
    bloom: [],
    field: [],
    houses: [],
    choam: new Map(),
    teams: [],
    units: [],
    structures: [],
    reinforcements: [],
  };
  let p = start;
  const word = () => {
    const v = readU16(rom, p);
    p += 2;
    return v;
  };
  let shift = 0;
  const xy = (packed: number): XY => ({ x: (packed & 63) + shift, y: (packed >> 6) + shift });
  const houses = new Map<number, ScenarioHouse>();
  const house = (section: number) => {
    const id = HOUSE_SECTION[section];
    if (!houses.has(id)) houses.set(id, { id, credits: 0, quota: 0, brain: "cpu", maxUnits: 39 });
    return houses.get(id)!;
  };

  for (let guard = 0; guard < 10000; guard++) {
    const head = word();
    if (head === 0xffff) break;
    const section = head >> 8;
    const key = head & 0xff;

    // BASIC 0..2: имена картинок поражения, победы и брифинга — строка с длиной, выровненная на слово
    if (section === 0 && key <= 2) {
      const len = word();
      let s = "";
      for (let k = 0; k < len && rom[p + k]; k++) s += String.fromCharCode(rom[p + k]);
      p += len + (len & 1);
      if (key === 0) sc.losePicture = s;
      else if (key === 1) sc.winPicture = s;
      else sc.briefPicture = s;
      continue;
    }

    switch (section) {
      case 0: {
        // BASIC
        const v = word();
        if (key === 3) sc.timeOut = v;
        else if (key === 4) {
          sc.mapScale = v;
          shift = v === 1 ? 16 : 0;
        } else if (key === 5) sc.cursor = xy(v);
        else if (key === 6) sc.tactical = xy(v);
        else if (key === 7) sc.loseFlags = v;
        else if (key === 8) sc.winFlags = v;
        break;
      }
      case 1: {
        // MAP: S — номер карты, B — Bloom, F — Field
        if (key === 0x53) sc.mapIndex = word();
        else {
          const n = word();
          const list: XY[] = [];
          for (let k = 0; k < n; k++) list.push(xy(word()));
          if (key === 0x42) sc.bloom.push(...list);
          else sc.field.push(...list);
        }
        break;
      }
      case 2:
      case 3:
      case 4:
      case 5: {
        // дома: Q — Quota, C — Credits, B — Brain (H — человек), M — MaxUnit
        const h = house(section);
        const v = word();
        if (key === 0x51) h.quota = v;
        else if (key === 0x43) h.credits = v;
        else if (key === 0x42) h.brain = v === 0x48 ? "human" : "cpu";
        else if (key === 0x4d) h.maxUnits = v;
        break;
      }
      case 6:
        // CHOAM: ключ — тип юнита
        sc.choam.set(key, word());
        break;
      case 7: {
        // TEAMS
        const [h, aiMode, movement, min, max] = [word(), word(), word(), word(), word()];
        sc.teams.push({
          house: h,
          aiMode: String.fromCharCode(aiMode),
          movement: String.fromCharCode(movement),
          min,
          max,
        });
        break;
      }
      case 8: {
        // UNITS
        const [h, type, hp, pos, orientation, action] = [word(), word(), word(), word(), word(), word()];
        sc.units.push({ house: h, type, hp, ...xy(pos), orientation, action });
        break;
      }
      case 9:
        // STRUCTURES: I — запись с номером, у остальных (GEN) прочность полная
        if (key === 0x49) {
          word();
          const [h, type, hp, pos] = [word(), word(), word(), word()];
          sc.structures.push({ house: h, type, hp, ...xy(pos) });
        } else {
          const [pos, h, type] = [word(), word(), word()];
          sc.structures.push({ house: h, type, hp: 256, ...xy(pos) });
        }
        break;
      case 10:
        // REINFORCEMENTS
        sc.reinforcements.push({ values: [word(), word(), word(), word()] });
        break;
      default:
        throw new Error(`${name}: неизвестная секция ${section} по смещению ${(p - start).toString(16)}`);
    }
  }
  sc.houses = [...houses.values()];
  return sc;
}
