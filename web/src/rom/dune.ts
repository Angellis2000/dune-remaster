/**
 * ROM «Dune: The Battle for Arrakis» (Mega Drive): проверка файла, адреса и чтение графики, карт и сценариев.
 * Адреса найдены в коде игры и сверены в эмуляторе (см. README.md и docs/HANDOFF.md).
 */
import { lcwDecompress } from "./lcw.ts";
import { cramToRGBA, readU16, readU32 } from "./md.ts";
import { parseScenario, readFiles, type Scenario } from "./scenario.ts";

export const ROM = {
  /** иконки клеток: 362 записи по 16 слов плоскости (4×4 тайла) */
  iconTable: 0x04adf0,
  iconCount: 362,
  /** тайлы ландшафта и зданий: 8 LCW-потоков → адрес в VRAM */
  terrainVram: [
    [0x0bc538, 0x0000],
    [0x0bcd42, 0x1000],
    [0x0bd774, 0x2000],
    [0x0be20c, 0x3000],
    [0x0bed2c, 0x4000],
    [0x0bf8f6, 0x5000],
    [0x0c0500, 0x6000],
    [0x0c0f90, 0x7000],
  ] as [number, number][],
  /** игровая палитра, 4 строки CRAM */
  gamePalette: 0x0a6c98,
  /** готовые карты миссий: 27 указателей, бит 31 — карта 32×32 */
  mapTable: 0x01b27a,
  mapCount: 27,
  /** картинки меню строительства 96×56 */
  structurePictureTable: 0x0882a4,
  structurePictureCount: 19,
  unitPictureTable: 0x08f1d0,
  unitPictureCount: 19,
  /** группы иконок по типам (как iconMap в PC); сразу за ними идёт iconTable */
  iconGroups: 0x04aa30,
  /** список загрузки спрайтов в VRAM: [слово адрес VRAM][слово длина в словах][длинное слово источник, бит 31 — без сжатия] */
  spriteLoadTable: 0x00a48c,
  /** кадры спрайтов: [длинное слово источник тайлов, бит 31 — сырые тайлы в ROM][флаг<<24 | описание кусков] */
  frameTable: 0x060e8c,
  /** указатели на описания юнитов (+70 — первый кадр, +76 — способ выбора кадра) */
  unitInfoTable: 0x06c5bc,
  unitTypeCount: 27,
  /** строка палитры по дому: слово плоскости, биты 13–14 */
  housePalette: 0x009588,
  /** направление → [смещение кадра, отражение] для 8 и 16 направлений и для пехоты */
  dir8: 0x06c668,
  dir16: 0x06c688,
  dirInfantry: 0x06c648,
  /** фазы шага пехоты, 4 байта */
  infantryAnim: 0x06c6c8,
  /** кадры звуковой волны по 16 направлениям (код $0124AC) */
  sonicFrames: 0x06c6cc,
  /** башни танка и осадного танка: тип юнита → таблица кадров */
  turretFrames: { 9: 0x02ec7a, 10: 0x02f2fa } as Record<number, number>,
  /** то же сразу после выстрела (отдача башни): ставятся в $044B74 через $2EC6E/$2EC74 */
  recoilFrames: { 9: 0x02f97a, 10: 0x02fffa } as Record<number, number>,
  /**
   * Значки над зданиями игрока ($00DC9C): таблицы описаний кадров по индексу, индекс 3 — двор (центр 2×2),
   * 6 — дворец (центр 3×3). Смещение куска — от левого верхнего угла здания. Тайлы уже в VRAM спрайтов.
   */
  statusIcons: {
    /** «OK»: заказ двора готов, ракета дворца готова ($009A66) */
    ok: 0x009aba,
    /** молоток: здание ремонтируется ($009B2A) */
    repair: 0x0659fe,
  },
  /** курсоры карты: атака, движение, рамка, подтверждение — по 0x100 байт сырых тайлов */
  cursorTiles: 0x064946,
  cursorPaletteLine: 3,
};

/** Сторона карты в клетках. */
export const MAP_SIZE = 64;
/** Клетка карты MD — 32×32 пикселя (4×4 тайла), у PC — 16×16. */
export const CELL_PX = 32;

export class RomError extends Error {}

export interface SpritePiece {
  x: number;
  y: number;
  /** размер куска в тайлах */
  tw: number;
  th: number;
  /** слово атрибутов спрайта VDP: палитра, отражения, первый тайл */
  attr: number;
}

export interface SpriteFrame {
  index: number;
  pieces: SpritePiece[];
  /** старший байт записи кадра (0x0B — без цвета дома) */
  flag: number;
  /** адрес сырых тайлов в ROM или null, если тайлы берутся из VRAM */
  rawSource: number | null;
}

export interface Picture {
  id: number;
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export interface MissionMap {
  index: number;
  /** номера иконок 64×64 */
  ground: Uint16Array;
  bounds: { x: number; y: number; w: number; h: number };
}

export class DuneRom {
  readonly bytes: Uint8Array;
  readonly title: string;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.title = DuneRom.readTitle(bytes);
    DuneRom.validate(bytes);
  }

  /** Имя игры из заголовка ($150, 48 байт). */
  static readTitle(bytes: Uint8Array): string {
    let s = "";
    for (let i = 0x150; i < 0x180; i++) s += String.fromCharCode(bytes[i]);
    return s.trim();
  }

  static validate(bytes: Uint8Array): void {
    if (bytes.length < 0x100000) throw new RomError("Файл слишком маленький для ROM Mega Drive (нужен 1 МБ).");
    if (String.fromCharCode(...bytes.subarray(0x100, 0x104)) !== "SEGA")
      throw new RomError(
        "Это не ROM Mega Drive: нет подписи SEGA по адресу 0x100. Возможно, файл в формате .smd — нужен .bin/.gen/.md.",
      );
    if (!DuneRom.readTitle(bytes).startsWith("DUNE"))
      throw new RomError(`Это другая игра: «${DuneRom.readTitle(bytes)}». Нужна Dune: The Battle for Arrakis.`);
    try {
      for (const [src] of ROM.terrainVram) lcwDecompress(bytes, src);
    } catch {
      throw new RomError("Версия ROM не совпадает с ожидаемой: тайлы ландшафта не найдены по известным адресам.");
    }
  }

  private readonly cache = new Map<string, unknown>();

  private memo<T>(key: string, make: () => T): T {
    if (!this.cache.has(key)) this.cache.set(key, make());
    return this.cache.get(key) as T;
  }

  /** VRAM с тайлами ландшафта и зданий, как после загрузки миссии. */
  terrainVram(): Uint8Array {
    return this.memo("terrainVram", () => {
      const vram = new Uint8Array(0x10000);
      for (const [src, dst] of ROM.terrainVram) vram.set(lcwDecompress(this.bytes, src).data, dst);
      return vram;
    });
  }

  /** VRAM с тайлами спрайтов поверх тайлов ландшафта (список загрузки $00A48C). */
  spriteVram(): Uint8Array {
    return this.memo("spriteVram", () => {
      const vram = this.terrainVram().slice();
      for (let p = ROM.spriteLoadTable; ; p += 8) {
        const dst = readU16(this.bytes, p);
        const words = readU16(this.bytes, p + 2);
        const src = readU32(this.bytes, p + 4);
        if (!dst && !words) break;
        const addr = src & 0xffffff;
        const data =
          src & 0x80000000
            ? this.bytes.subarray(addr, addr + words * 2)
            : lcwDecompress(this.bytes, addr).data.subarray(0, words * 2);
        vram.set(data, dst);
      }
      return vram;
    });
  }

  frame(index: number): SpriteFrame {
    const p = ROM.frameTable + index * 8;
    const tiles = readU32(this.bytes, p);
    const def = readU32(this.bytes, p + 4);
    return this.frameDef(def & 0xffffff, index, def >>> 24, tiles & 0x80000000 ? tiles & 0xffffff : null);
  }

  /** Описание кадра: [слово кол-во кусков − 1], затем куски по 12 байт (y, размер, атрибуты, x). */
  frameDef(addr: number, index = -1, flag = 0, rawSource: number | null = null): SpriteFrame {
    const count = readU16(this.bytes, addr) + 1;
    const pieces: SpritePiece[] = [];
    const s16 = (at: number) => (readU16(this.bytes, at) << 16) >> 16;
    for (let i = 0; i < count; i++) {
      const p = addr + 2 + i * 12;
      const size = readU16(this.bytes, p + 6);
      pieces.push({
        y: s16(p + 4),
        x: s16(p + 10),
        tw: ((size >> 10) & 3) + 1,
        th: ((size >> 8) & 3) + 1,
        attr: readU16(this.bytes, p + 8),
      });
    }
    return { index, pieces, flag, rawSource };
  }

  unitDisplay(type: number): { baseFrame: number; mode: number } {
    const info = readU32(this.bytes, ROM.unitInfoTable + type * 4);
    return {
      baseFrame: readU16(this.bytes, info + 70),
      mode: (readU16(this.bytes, info + 76) << 16) >> 16,
    };
  }

  housePaletteLine(house: number): number {
    return (readU16(this.bytes, ROM.housePalette + (house & 7) * 2) >> 13) & 3;
  }

  /** Номера иконок группы: в начале таблицы — 27 смещений групп (в словах), дальше сами номера. */
  iconGroup(group: number): Uint16Array {
    const base = ROM.iconGroups;
    const from = readU16(this.bytes, base + group * 2);
    const to = group + 1 < 27 ? readU16(this.bytes, base + (group + 1) * 2) : (ROM.iconTable - base) / 2;
    const out = new Uint16Array(to - from);
    for (let i = 0; i < out.length; i++) out[i] = readU16(this.bytes, base + (from + i) * 2);
    return out;
  }

  files(): Map<string, number> {
    return this.memo("files", () => readFiles(this.bytes));
  }

  /** Сценарий миссии: дом A/O/H, номер миссии 1..9. */
  scenario(house: string, mission: number): Scenario {
    const name = `SCEN${house}00${mission}.INI`;
    const at = this.files().get(name);
    if (at === undefined) throw new RomError(`В ROM нет файла ${name}`);
    return parseScenario(this.bytes, name, at);
  }

  gamePalette(): Uint32Array {
    return this.memo("gamePalette", () => this.readPalette(ROM.gamePalette, 4));
  }

  readPalette(addr: number, lines: number): Uint32Array {
    const pal = new Uint32Array(lines * 16);
    for (let i = 0; i < lines * 16; i++) pal[i] = cramToRGBA(readU16(this.bytes, addr + i * 2));
    return pal;
  }

  icon(id: number): Uint16Array {
    const words = new Uint16Array(16);
    const p = ROM.iconTable + id * 32;
    for (let i = 0; i < 16; i++) words[i] = readU16(this.bytes, p + i * 2);
    return words;
  }

  /** Карта миссии 1..27. Загрузчик игры ($01B1DE) заменяет иконку B0 на 7F и C0 на BF. */
  missionMap(index: number): MissionMap {
    if (index < 1 || index > ROM.mapCount) throw new RangeError(`нет карты ${index}`);
    const ptr = readU32(this.bytes, ROM.mapTable + (index - 1) * 4);
    const small = ptr >>> 31 === 1;
    const addr = ptr & 0x7fffffff;
    const size = small ? 32 : 64;
    const offset = small ? 16 : 0;
    const ground = new Uint16Array(MAP_SIZE * MAP_SIZE);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let id = this.bytes[addr + y * size + x];
        if (id === 0xb0) id = 0x7f;
        else if (id === 0xc0) id = 0xbf;
        ground[(y + offset) * MAP_SIZE + x + offset] = id;
      }
    return { index, ground, bounds: { x: offset, y: offset, w: size, h: size } };
  }

  unitPictures(): Picture[] {
    return this.memo("unitPictures", () => this.pictureTable(ROM.unitPictureTable, ROM.unitPictureCount));
  }

  structurePictures(): Picture[] {
    return this.memo("structurePictures", () =>
      this.pictureTable(ROM.structurePictureTable, ROM.structurePictureCount),
    );
  }

  private pictureTable(table: number, count: number): Picture[] {
    const list: Picture[] = [];
    for (let i = 0; i < count; i++) {
      const pic = this.picture(readU32(this.bytes, table + i * 4), i);
      if (pic) list.push(pic);
    }
    return list;
  }

  /**
   * Картинка «палитра + карта тайлов + LCW-тайлы»: 16 слов CRAM, карта w×h слов (с отражениями),
   * слово длины, поток LCW. Если по адресу не палитра или поток не распаковывается — null.
   */
  picture(addr: number, id: number, w = 12, h = 7): Picture | null {
    const b = this.bytes;
    for (let i = 0; i < 16; i++) if (readU16(b, addr + i * 2) & 0xf111) return null;
    const pal = this.readPalette(addr, 1);
    let tiles: Uint8Array;
    try {
      tiles = lcwDecompress(b, addr + 32 + w * h * 2 + 2).data;
    } catch {
      return null;
    }
    const width = w * 8;
    const height = h * 8;
    const px = new Uint32Array(width * height);
    for (let t = 0; t < w * h; t++) {
      const word = readU16(b, addr + 32 + t * 2);
      const tile = word & 0x7ff;
      if (tile * 32 + 32 > tiles.length) return null;
      const hflip = word & 0x800;
      const vflip = word & 0x1000;
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 8; col++) {
          const sx = hflip ? 7 - col : col;
          const sy = vflip ? 7 - row : row;
          const byte = tiles[tile * 32 + sy * 4 + (sx >> 1)];
          const c = sx & 1 ? byte & 15 : byte >> 4;
          px[((t / w) | 0) * 8 * width + row * width + (t % w) * 8 + col] = pal[c];
        }
    }
    return { id, width, height, pixels: new Uint8ClampedArray(px.buffer) };
  }
}
