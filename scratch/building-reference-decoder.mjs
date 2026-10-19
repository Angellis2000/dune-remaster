// web/src/rom/lcw.ts
var LcwError = class extends Error {
};
function lcwDecompress(src, start = 0, maxOut = 65536) {
  const out = new Uint8Array(maxOut);
  let o = 0;
  let i = start;
  for (; ; ) {
    if (i >= src.length) throw new LcwError("\u043F\u043E\u0442\u043E\u043A \u0432\u044B\u0448\u0435\u043B \u0437\u0430 \u043A\u043E\u043D\u0435\u0446 ROM");
    const cmd = src[i++];
    if ((cmd & 128) === 0) {
      const count = (cmd >> 4) + 3;
      const rel = (cmd & 15) << 8 | src[i++];
      let from = o - rel;
      if (from < 0 || rel === 0) throw new LcwError("\u043F\u043B\u043E\u0445\u043E\u0435 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u0435");
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      for (let k = 0; k < count; k++) out[o++] = out[from++];
    } else if ((cmd & 64) === 0) {
      if (cmd === 128) return { data: out.slice(0, o), consumed: i - start };
      const count = cmd & 63;
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      out.set(src.subarray(i, i + count), o);
      o += count;
      i += count;
    } else if (cmd === 254) {
      const count = src[i] | src[i + 1] << 8;
      const value = src[i + 2];
      i += 3;
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      out.fill(value, o, o + count);
      o += count;
    } else {
      let count;
      let from;
      if (cmd === 255) {
        count = src[i] | src[i + 1] << 8;
        from = src[i + 2] | src[i + 3] << 8;
        i += 4;
      } else {
        count = (cmd & 63) + 3;
        from = src[i] | src[i + 1] << 8;
        i += 2;
      }
      if (count && from >= o) throw new LcwError("\u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u043E\u0435 \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u043C\u0438");
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      for (let k = 0; k < count; k++) out[o++] = out[from++];
    }
  }
}

// web/src/rom/md.ts
var CRAM_LEVELS = [0, 52, 87, 116, 144, 172, 206, 255];
function cramToRGBA(word, alpha = 255) {
  const r = CRAM_LEVELS[word >> 1 & 7];
  const g = CRAM_LEVELS[word >> 5 & 7];
  const b = CRAM_LEVELS[word >> 9 & 7];
  return (alpha << 24 | b << 16 | g << 8 | r) >>> 0;
}
function readU16(b, at) {
  return b[at] << 8 | b[at + 1];
}
function readU32(b, at) {
  return (b[at] << 24 | b[at + 1] << 16 | b[at + 2] << 8 | b[at + 3]) >>> 0;
}
function decodeTileWord(word) {
  return {
    tile: word & 2047,
    pal: word >> 13 & 3,
    hflip: (word & 2048) !== 0,
    vflip: (word & 4096) !== 0,
    prio: (word & 32768) !== 0
  };
}
function blitTile(vram, word, palette, out, stride, x, y) {
  const { tile, pal, hflip, vflip } = decodeTileWord(word);
  const base = tile * 32;
  for (let row = 0; row < 8; row++) {
    const srcRow = vflip ? 7 - row : row;
    const line = base + srcRow * 4;
    for (let col = 0; col < 8; col++) {
      const srcCol = hflip ? 7 - col : col;
      const byte = vram[line + (srcCol >> 1)];
      const c = srcCol & 1 ? byte & 15 : byte >> 4;
      if (c) out[(y + row) * stride + x + col] = palette[pal * 16 + c];
    }
  }
}

// web/src/rom/scenario.ts
var FILE_TABLE = 339028;
var FILE_COUNT = 33;
var HOUSE_SECTION = { 2: 0, 3: 1, 4: 2, 5: 4 };
function readFiles(rom) {
  const files = /* @__PURE__ */ new Map();
  for (let i = 0; i < FILE_COUNT; i++) {
    const namePtr = readU32(rom, FILE_TABLE + i * 8);
    const dataPtr = readU32(rom, FILE_TABLE + i * 8 + 4);
    let name = "";
    for (let p = namePtr; rom[p]; p++) name += String.fromCharCode(rom[p]);
    files.set(name, dataPtr);
  }
  return files;
}
function parseScenario(rom, name, start) {
  const sc = {
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
    choam: /* @__PURE__ */ new Map(),
    teams: [],
    units: [],
    structures: [],
    reinforcements: []
  };
  let p = start;
  const word = () => {
    const v = readU16(rom, p);
    p += 2;
    return v;
  };
  let shift = 0;
  const xy = (packed) => ({ x: (packed & 63) + shift, y: (packed >> 6) + shift });
  const houses = /* @__PURE__ */ new Map();
  const house = (section) => {
    const id = HOUSE_SECTION[section];
    if (!houses.has(id)) houses.set(id, { id, credits: 0, quota: 0, brain: "cpu", maxUnits: 39 });
    return houses.get(id);
  };
  for (let guard = 0; guard < 1e4; guard++) {
    const head = word();
    if (head === 65535) break;
    const section = head >> 8;
    const key = head & 255;
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
        if (key === 83) sc.mapIndex = word();
        else {
          const n = word();
          const list = [];
          for (let k = 0; k < n; k++) list.push(xy(word()));
          if (key === 66) sc.bloom.push(...list);
          else sc.field.push(...list);
        }
        break;
      }
      case 2:
      case 3:
      case 4:
      case 5: {
        const h = house(section);
        const v = word();
        if (key === 81) h.quota = v;
        else if (key === 67) h.credits = v;
        else if (key === 66) h.brain = v === 72 ? "human" : "cpu";
        else if (key === 77) h.maxUnits = v;
        break;
      }
      case 6:
        sc.choam.set(key, word());
        break;
      case 7: {
        const [h, aiMode, movement, min, max] = [word(), word(), word(), word(), word()];
        sc.teams.push({
          house: h,
          aiMode: String.fromCharCode(aiMode),
          movement: String.fromCharCode(movement),
          min,
          max
        });
        break;
      }
      case 8: {
        const [h, type, hp, pos, orientation, action] = [word(), word(), word(), word(), word(), word()];
        sc.units.push({ house: h, type, hp, ...xy(pos), orientation, action });
        break;
      }
      case 9:
        if (key === 73) {
          word();
          const [h, type, hp, pos] = [word(), word(), word(), word()];
          sc.structures.push({ house: h, type, hp, ...xy(pos) });
        } else {
          const [pos, h, type] = [word(), word(), word()];
          sc.structures.push({ house: h, type, hp: 256, ...xy(pos) });
        }
        break;
      case 10:
        sc.reinforcements.push({ values: [word(), word(), word(), word()] });
        break;
      default:
        throw new Error(`${name}: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0441\u0435\u043A\u0446\u0438\u044F ${section} \u043F\u043E \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u044E ${(p - start).toString(16)}`);
    }
  }
  sc.houses = [...houses.values()];
  return sc;
}

// web/src/rom/dune.ts
var ROM = {
  /** иконки клеток: 362 записи по 16 слов плоскости (4×4 тайла) */
  iconTable: 306672,
  iconCount: 362,
  /** тайлы ландшафта и зданий: 8 LCW-потоков → адрес в VRAM */
  terrainVram: [
    [771384, 0],
    [773442, 4096],
    [776052, 8192],
    [778764, 12288],
    [781612, 16384],
    [784630, 20480],
    [787712, 24576],
    [790416, 28672]
  ],
  /** игровая палитра, 4 строки CRAM */
  gamePalette: 683160,
  /** готовые карты миссий: 27 указателей, бит 31 — карта 32×32 */
  mapTable: 111226,
  mapCount: 27,
  /** картинки меню строительства 96×56 */
  structurePictureTable: 557732,
  structurePictureCount: 19,
  unitPictureTable: 586192,
  unitPictureCount: 19,
  /** группы иконок по типам (как iconMap в PC); сразу за ними идёт iconTable */
  iconGroups: 305712,
  /** список загрузки спрайтов в VRAM: [слово адрес VRAM][слово длина в словах][длинное слово источник, бит 31 — без сжатия] */
  spriteLoadTable: 42124,
  /** кадры спрайтов: [длинное слово источник тайлов, бит 31 — сырые тайлы в ROM][флаг<<24 | описание кусков] */
  frameTable: 396940,
  /** указатели на описания юнитов (+70 — первый кадр, +76 — способ выбора кадра) */
  unitInfoTable: 443836,
  unitTypeCount: 27,
  /** строка палитры по дому: слово плоскости, биты 13–14 */
  housePalette: 38280,
  /** направление → [смещение кадра, отражение] для 8 и 16 направлений и для пехоты */
  dir8: 444008,
  dir16: 444040,
  dirInfantry: 443976,
  /** фазы шага пехоты, 4 байта */
  infantryAnim: 444104,
  /** кадры звуковой волны по 16 направлениям (код $0124AC) */
  sonicFrames: 444108,
  /** башни танка и осадного танка: тип юнита → таблица кадров */
  turretFrames: { 9: 191610, 10: 193274 },
  /** то же сразу после выстрела (отдача башни): ставятся в $044B74 через $2EC6E/$2EC74 */
  recoilFrames: { 9: 194938, 10: 196602 },
  /**
   * Значки над зданиями игрока ($00DC9C): таблицы описаний кадров по индексу, индекс 3 — двор (центр 2×2),
   * 6 — дворец (центр 3×3). Смещение куска — от левого верхнего угла здания. Тайлы уже в VRAM спрайтов.
   */
  statusIcons: {
    /** «OK»: заказ двора готов, ракета дворца готова ($009A66) */
    ok: 39610,
    /** молоток: здание ремонтируется ($009B2A) */
    repair: 416254,
    /** молния над ветряком при нехватке энергии ($009ADA) — одно описание, не таблица */
    lightning: 415976
  },
  /** курсоры карты: атака, движение, рамка, подтверждение — по 0x100 байт сырых тайлов */
  cursorTiles: 411974,
  cursorPaletteLine: 3
};
var MAP_SIZE = 64;
var RomError = class extends Error {
};
var DuneRom = class _DuneRom {
  bytes;
  title;
  constructor(bytes) {
    this.bytes = bytes;
    this.title = _DuneRom.readTitle(bytes);
    _DuneRom.validate(bytes);
  }
  /** Имя игры из заголовка ($150, 48 байт). */
  static readTitle(bytes) {
    let s = "";
    for (let i = 336; i < 384; i++) s += String.fromCharCode(bytes[i]);
    return s.trim();
  }
  static validate(bytes) {
    if (bytes.length < 1048576) throw new RomError("\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u0439 \u0434\u043B\u044F ROM Mega Drive (\u043D\u0443\u0436\u0435\u043D 1 \u041C\u0411).");
    if (String.fromCharCode(...bytes.subarray(256, 260)) !== "SEGA")
      throw new RomError(
        "\u042D\u0442\u043E \u043D\u0435 ROM Mega Drive: \u043D\u0435\u0442 \u043F\u043E\u0434\u043F\u0438\u0441\u0438 SEGA \u043F\u043E \u0430\u0434\u0440\u0435\u0441\u0443 0x100. \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0444\u0430\u0439\u043B \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 .smd \u2014 \u043D\u0443\u0436\u0435\u043D .bin/.gen/.md."
      );
    if (!_DuneRom.readTitle(bytes).startsWith("DUNE"))
      throw new RomError(`\u042D\u0442\u043E \u0434\u0440\u0443\u0433\u0430\u044F \u0438\u0433\u0440\u0430: \xAB${_DuneRom.readTitle(bytes)}\xBB. \u041D\u0443\u0436\u043D\u0430 Dune: The Battle for Arrakis.`);
    try {
      for (const [src] of ROM.terrainVram) lcwDecompress(bytes, src);
    } catch {
      throw new RomError("\u0412\u0435\u0440\u0441\u0438\u044F ROM \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u043E\u0439: \u0442\u0430\u0439\u043B\u044B \u043B\u0430\u043D\u0434\u0448\u0430\u0444\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u043F\u043E \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u043C \u0430\u0434\u0440\u0435\u0441\u0430\u043C.");
    }
  }
  cache = /* @__PURE__ */ new Map();
  memo(key, make) {
    if (!this.cache.has(key)) this.cache.set(key, make());
    return this.cache.get(key);
  }
  /** VRAM с тайлами ландшафта и зданий, как после загрузки миссии. */
  terrainVram() {
    return this.memo("terrainVram", () => {
      const vram = new Uint8Array(65536);
      for (const [src, dst] of ROM.terrainVram) vram.set(lcwDecompress(this.bytes, src).data, dst);
      return vram;
    });
  }
  /** VRAM с тайлами спрайтов поверх тайлов ландшафта (список загрузки $00A48C). */
  spriteVram() {
    return this.memo("spriteVram", () => {
      const vram = this.terrainVram().slice();
      for (let p = ROM.spriteLoadTable; ; p += 8) {
        const dst = readU16(this.bytes, p);
        const words = readU16(this.bytes, p + 2);
        const src = readU32(this.bytes, p + 4);
        if (!dst && !words) break;
        const addr = src & 16777215;
        const data = src & 2147483648 ? this.bytes.subarray(addr, addr + words * 2) : lcwDecompress(this.bytes, addr).data.subarray(0, words * 2);
        vram.set(data, dst);
      }
      return vram;
    });
  }
  frame(index) {
    const p = ROM.frameTable + index * 8;
    const tiles = readU32(this.bytes, p);
    const def = readU32(this.bytes, p + 4);
    return this.frameDef(def & 16777215, index, def >>> 24, tiles & 2147483648 ? tiles & 16777215 : null);
  }
  /** Описание кадра: [слово кол-во кусков − 1], затем куски по 12 байт (y, размер, атрибуты, x). */
  frameDef(addr, index = -1, flag = 0, rawSource = null) {
    const count = readU16(this.bytes, addr) + 1;
    const pieces = [];
    const s16 = (at) => readU16(this.bytes, at) << 16 >> 16;
    for (let i = 0; i < count; i++) {
      const p = addr + 2 + i * 12;
      const size = readU16(this.bytes, p + 6);
      pieces.push({
        y: s16(p + 4),
        x: s16(p + 10),
        tw: (size >> 10 & 3) + 1,
        th: (size >> 8 & 3) + 1,
        attr: readU16(this.bytes, p + 8)
      });
    }
    return { index, pieces, flag, rawSource };
  }
  unitDisplay(type) {
    const info = readU32(this.bytes, ROM.unitInfoTable + type * 4);
    return {
      baseFrame: readU16(this.bytes, info + 70),
      mode: readU16(this.bytes, info + 76) << 16 >> 16
    };
  }
  housePaletteLine(house) {
    return readU16(this.bytes, ROM.housePalette + (house & 7) * 2) >> 13 & 3;
  }
  /** Номера иконок группы: в начале таблицы — 27 смещений групп (в словах), дальше сами номера. */
  iconGroup(group) {
    const base = ROM.iconGroups;
    const from = readU16(this.bytes, base + group * 2);
    const to = group + 1 < 27 ? readU16(this.bytes, base + (group + 1) * 2) : (ROM.iconTable - base) / 2;
    const out = new Uint16Array(to - from);
    for (let i = 0; i < out.length; i++) out[i] = readU16(this.bytes, base + (from + i) * 2);
    return out;
  }
  files() {
    return this.memo("files", () => readFiles(this.bytes));
  }
  /** Сценарий миссии: дом A/O/H, номер миссии 1..9. */
  scenario(house, mission) {
    const name = `SCEN${house}00${mission}.INI`;
    const at = this.files().get(name);
    if (at === void 0) throw new RomError(`\u0412 ROM \u043D\u0435\u0442 \u0444\u0430\u0439\u043B\u0430 ${name}`);
    return parseScenario(this.bytes, name, at);
  }
  gamePalette() {
    return this.memo("gamePalette", () => this.readPalette(ROM.gamePalette, 4));
  }
  readPalette(addr, lines) {
    const pal = new Uint32Array(lines * 16);
    for (let i = 0; i < lines * 16; i++) pal[i] = cramToRGBA(readU16(this.bytes, addr + i * 2));
    return pal;
  }
  icon(id) {
    const words = new Uint16Array(16);
    const p = ROM.iconTable + id * 32;
    for (let i = 0; i < 16; i++) words[i] = readU16(this.bytes, p + i * 2);
    return words;
  }
  /** Карта миссии 1..27. Загрузчик игры ($01B1DE) заменяет иконку B0 на 7F и C0 на BF. */
  missionMap(index) {
    if (index < 1 || index > ROM.mapCount) throw new RangeError(`\u043D\u0435\u0442 \u043A\u0430\u0440\u0442\u044B ${index}`);
    const ptr = readU32(this.bytes, ROM.mapTable + (index - 1) * 4);
    const small = ptr >>> 31 === 1;
    const addr = ptr & 2147483647;
    const size = small ? 32 : 64;
    const offset = small ? 16 : 0;
    const ground = new Uint16Array(MAP_SIZE * MAP_SIZE);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let id = this.bytes[addr + y * size + x];
        if (id === 176) id = 127;
        else if (id === 192) id = 191;
        ground[(y + offset) * MAP_SIZE + x + offset] = id;
      }
    return { index, ground, bounds: { x: offset, y: offset, w: size, h: size } };
  }
  unitPictures() {
    return this.memo("unitPictures", () => this.pictureTable(ROM.unitPictureTable, ROM.unitPictureCount));
  }
  structurePictures() {
    return this.memo(
      "structurePictures",
      () => this.pictureTable(ROM.structurePictureTable, ROM.structurePictureCount)
    );
  }
  pictureTable(table, count) {
    const list = [];
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
  picture(addr, id, w = 12, h = 7) {
    const b = this.bytes;
    for (let i = 0; i < 16; i++) if (readU16(b, addr + i * 2) & 61713) return null;
    const pal = this.readPalette(addr, 1);
    let tiles;
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
      const tile = word & 2047;
      if (tile * 32 + 32 > tiles.length) return null;
      const hflip = word & 2048;
      const vflip = word & 4096;
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 8; col++) {
          const sx = hflip ? 7 - col : col;
          const sy = vflip ? 7 - row : row;
          const byte = tiles[tile * 32 + sy * 4 + (sx >> 1)];
          const c = sx & 1 ? byte & 15 : byte >> 4;
          px[(t / w | 0) * 8 * width + row * width + t % w * 8 + col] = pal[c];
        }
    }
    return { id, width, height, pixels: new Uint8ClampedArray(px.buffer) };
  }
};

// url:./assets/frontend/arrakis-wide.png?url
var arrakis_wide_default = "unused";

// url:./assets/frontend/settings-wide.png?url
var settings_wide_default = "unused";

// url:./assets/frontend/password-wide.png?url
var password_wide_default = "unused";

// url:./assets/frontend/house-crests.png?url
var house_crests_default = "unused";

// url:./assets/frontend/sega.png?url
var sega_default = "unused";

// url:./assets/frontend/publishers.png?url
var publishers_default = "unused";

// url:./assets/frontend/intro-ships.png?url
var intro_ships_default = "unused";

// url:./assets/frontend/victory-hd.png?url
var victory_hd_default = "unused";

// url:./assets/frontend/defeat-hd.png?url
var defeat_hd_default = "unused";

// url:./assets/frontend/mentat-atreides-hd.png?url
var mentat_atreides_hd_default = "unused";

// url:./assets/frontend/mentat-ordos-hd.png?url
var mentat_ordos_hd_default = "unused";

// url:./assets/frontend/mentat-harkonnen-hd.png?url
var mentat_harkonnen_hd_default = "unused";

// url:./assets/frontend/strategic-relief-hd.png?url
var strategic_relief_hd_default = "unused";

// url:./assets/frontend/operations-console-hd.png?url
var operations_console_hd_default = "unused";

// url:./assets/frontend/production-console-hd.png?url
var production_console_hd_default = "unused";

// url:./assets/frontend/building-portraits-a.png?url
var building_portraits_a_default = "unused";

// url:./assets/frontend/building-portraits-b.png?url
var building_portraits_b_default = "unused";

// url:./assets/frontend/building-portraits-c.png?url
var building_portraits_c_default = "unused";

// url:./assets/frontend/building-portraits-d.png?url
var building_portraits_d_default = "unused";

// url:./assets/frontend/building-icons-a.png?url
var building_icons_a_default = "unused";

// url:./assets/frontend/building-icons-b.png?url
var building_icons_b_default = "unused";

// web/src/gfx/screen-art.ts
var SCREEN_ART = { arrakis: arrakis_wide_default, settings: settings_wide_default, password: password_wide_default, houses: house_crests_default, sega: sega_default, publishers: publishers_default, ships: intro_ships_default, victory: victory_hd_default, defeat: defeat_hd_default, mentatAtreides: mentat_atreides_hd_default, mentatOrdos: mentat_ordos_hd_default, mentatHarkonnen: mentat_harkonnen_hd_default, strategicSurface: strategic_relief_hd_default, operationsConsole: operations_console_hd_default, productionConsole: production_console_hd_default, buildingPortraitsA: building_portraits_a_default, buildingPortraitsB: building_portraits_b_default, buildingPortraitsC: building_portraits_c_default, buildingPortraitsD: building_portraits_d_default, buildingIconsA: building_icons_a_default, buildingIconsB: building_icons_b_default };
var ScreenArt = class {
  images = /* @__PURE__ */ new Map();
  async load() {
    await Promise.all(Object.entries(SCREEN_ART).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw Error(String(response.status));
        this.images.set(key, await createImageBitmap(await response.blob()));
      } catch (error) {
        console.warn(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C HD-\u044D\u043A\u0440\u0430\u043D ${key}; \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C ROM`, error);
      }
    }));
  }
  get(key) {
    return this.images.get(key);
  }
  /** Фон закрывает широкое окно без изменения соотношения сторон исходной картинки. */
  background(ctx, key, offsetX = 0) {
    const image = this.get(key);
    if (!image) return false;
    const matrix = ctx.getTransform();
    const logicalW = ctx.canvas.width / matrix.a;
    const logicalH = ctx.canvas.height / matrix.d;
    const w = Math.max(logicalW, logicalH * image.width / image.height);
    const h = w * image.height / image.width;
    ctx.drawImage(image, (320 - w) / 2 + offsetX, (224 - h) / 2, w, h);
    return true;
  }
};

// web/src/gfx/menu-canvas.ts
function menuText(ctx, text, x, y, options = {}) {
  ctx.save();
  const size = options.size ?? 8;
  ctx.font = `${options.weight ?? "600"} ${size}px ${options.serif ? 'Georgia, "Times New Roman", serif' : "Arial, sans-serif"}`;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "top";
  if (options.shadow !== false) {
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 1.4;
    ctx.shadowOffsetX = 0.45;
    ctx.shadowOffsetY = 0.65;
  }
  ctx.fillStyle = options.color ?? "#fff9e9";
  const cyrillic = { A: "\u0410", B: "\u0412", C: "\u0421", E: "\u0415", H: "\u041D", K: "\u041A", M: "\u041C", O: "\u041E", P: "\u0420", T: "\u0422", X: "\u0425" };
  const display = text.replace(/[A-ZА-ЯЁ]+/g, (word) => /[А-ЯЁ]/.test(word) ? word.replace(/[ABCEHKMOPTX]/g, (letter) => cyrillic[letter]) : word);
  ctx.fillText(display, x, y, options.maxWidth ?? 320);
  ctx.restore();
}

// web/src/gfx/screens.ts
var SCREEN_W = 320;
var SCREEN_H = 224;
var MENU_ROM = {
  /** палитра экранов «НАСТРОЙКИ» и «ВВЕДИТЕ ПАРОЛЬ»: 4 строки */
  palette: 557588,
  settings: { map: 812946, tiles: [746734, 748746, 751080, 753300, 755196, 757282] },
  password: { map: 814688, tiles: [759168, 760514, 763026] },
  /**
   * Окно здания (A по выбранному своему зданию): рамка — карта Window из LCW, тайлы из 4 потоков,
   * палитры строк 1–3; иконки и кнопки 4×3 тайла (сырые, 384 байта); значки 2×2.
   */
  factory: {
    map: 800192,
    tiles: [683826, 685852, 688012, 689988],
    palettes: [79894, 233910, 79958],
    /** иконки зданий по типу (перед ними 5 кнопок: СТОП, РЕМОНТ тёмные, СТОП, РЕМОНТ светлые, ВЫХОД) */
    structureIcons: 452672,
    /** иконки юнитов по типу (кнопки — перед таблицей, так же) */
    unitIcons: 461988,
    /** рамка-курсор 4×3, строка 2 */
    cursor: 303044,
    /** значки цены, энергии и прочности 2×2, строка 1 */
    statIcons: [303900, 304028, 304284],
    /** у заводов юнитов и космопорта вместо энергии — патрон (урон юнита) */
    ammoIcon: 304156,
    /** значки размера здания 2×2: 1×1, 2×2, 3×2, 3×3 */
    sizeIcons: 34360
  },
  /**
   * Окно космопорта (трасса открытия): своя рамка — 4 LCW-потока тайлов и карта Window, строка палитры 2
   * зелёная ($0A6C58), строки 1 и 3 — как у окна здания. Раскладка кнопок, сетки и чисел та же.
   */
  starport: {
    map: 816648,
    tiles: [764806, 766474, 768476, 770254],
    palettes: [79894, 683096, 79958]
  },
  /**
   * Главное меню (трасса от включения): обе плоскости 128 клеток в ширину. Слева на A — логотипы, справа —
   * «DUNE» с пунктами; на B — звёзды и планета. Меню показано при прокрутке A = −512, B = −704.
   * Тайлы — 7 LCW-потоков по $1000 и общий поток $0FEEE2 (стрелка) в $9000. Пары [LCW, адрес VRAM].
   */
  title: {
    tiles: [[731498, 0], [733830, 4096], [735416, 8192], [737976, 12288], [740680, 16384], [743148, 20480], [745690, 24576], [1044194, 36864]],
    planeA: [[811658, 49152], [812374, 53248]],
    planeB: [[810522, 57344], [811162, 61440]],
    palettes: [683288, 683576, 683608, 683640],
    /** цвета, которые код меню ставит поверх палитры ROM (сняты с CRAM): строка 2 — 14, 15; строка 3 — 13, 14 */
    paletteFix: [[2 * 16 + 14, 1604], [2 * 16 + 15, 1638], [3 * 16 + 13, 3822], [3 * 16 + 14, 1638]],
    scrollA: 512,
    scrollB: 704,
    /**
     * пункты меню код пишет в плоскость A ($01FF66: тайл $480 + код символа, строка палитры 3) по смещениям
     * в словах $A50, $AD0, $B50; строки берутся по ссылкам pea (d16,pc) у вызовов, как в ROM
     */
    items: [[96278, 2640], [96302, 2768], [96326, 2896]],
    /** стрелка: тайл $4BE, строка 2, x 120, y 160 + 8·пункт; цвет 13 строки 2 переливается по 6 кадров */
    arrowTile: 1214,
    arrowPulse: [3822, 3276, 2730, 2184, 1638, 2184, 2730, 3276]
  },
  /**
   * Выбор дома: плоскость Window (64 клетки), рамка под именем — три спрайта из тайлов `$06424E`
   * (4×2, 2×2 из тайлов 4–7, 4×2 с отражением) в x = 32 + 88·n, y = 136; её ненулевые байты — цвет
   * 1…4 строки 3, смена раз в 8 кадров ($004870).
   */
  house: {
    tiles: [[691112, 0], [693832, 4096]],
    window: 801524,
    palette: 267006,
    frame: 410190
  },
  /** шрифт: 128 тайлов, номер тайла = код символа; 9 — буква, 12 — фон */
  font: 325320,
  /** стрелка-курсор меню, 2×2 тайла по столбцам; переливается цветами 8–13 строки 1 */
  arrow: 415230,
  /** рамка буквы на экране пароля: 1×2 тайла (правая половина — отражение) */
  letterFrame: 410190,
  /** таблица мелодий фонотеки: [указатель на имя, номер] ... 0 */
  tracks: 556868,
  /** таблица звуков для «СПЕЦЭФФЕКТЫ» */
  sounds: 557020
};
var CYRILLIC = "`\u0429\u042C\u042B\u0411\u042A\u0413\u0414\u042D\u0416\u0417\u042E\u0418\u041C\u0419\u041E\u0420\u041B\u042F\u041F\u0422\u0423\u0424\u0426\u0425\u0427\u0428";
var SAME_AS_LATIN = { \u0410: "A", \u0412: "B", \u0415: "E", \u041A: "K", \u041C: "M", \u041D: "H", \u041E: "O", \u0420: "P", \u0421: "C", \u0422: "T", \u0425: "X", \u0401: "E" };
function encodeText(text) {
  const out = [];
  for (const ch0 of text.toUpperCase()) {
    const ch = SAME_AS_LATIN[ch0] ?? ch0;
    const code = ch.charCodeAt(0);
    if (code >= 32 && code < 96) out.push(code);
    else {
      const i = CYRILLIC.indexOf(ch, 1);
      out.push(i > 0 ? 96 + i : 32);
    }
  }
  return out;
}
function decodeText(bytes, at, max = 32) {
  let s = "";
  for (let i = 0; i < max; i++) {
    const c = bytes[at + i];
    if (c === 0) break;
    s += c >= 96 && c < 96 + CYRILLIC.length ? CYRILLIC[c - 96] : String.fromCharCode(c);
  }
  return s.trimEnd();
}
var ScreenGfx = class {
  constructor(rom) {
    this.rom = rom;
    this.palette = rom.readPalette(MENU_ROM.palette, 4);
  }
  rom;
  palette;
  art = new ScreenArt();
  cache = /* @__PURE__ */ new Map();
  get romBytes() {
    return this.rom.bytes;
  }
  /** Фон экрана целиком (320×224) из тайлов и карты Window. */
  background(which) {
    return this.memo(`bg:${which}`, () => this.tilemapScreen(MENU_ROM[which].tiles, MENU_ROM[which].map, this.palette));
  }
  /** Тайлы экрана: LCW-потоки подряд с VRAM 0. */
  tileVram(tiles) {
    const key = tiles.join(",");
    let vram = this.vrams.get(key);
    if (!vram) {
      vram = new Uint8Array(65536);
      let dst = 0;
      for (const src of tiles) {
        const data = lcwDecompress(this.rom.bytes, src).data;
        vram.set(data.subarray(0, Math.min(data.length, vram.length - dst)), dst);
        dst += data.length;
      }
      this.vrams.set(key, vram);
    }
    return vram;
  }
  vrams = /* @__PURE__ */ new Map();
  /**
   * Огоньки рамки окна: n слов карты Window из таблицы ROM (`table` + кадр·n·2), как их шлёт DMA
   * ($007F90 у окна здания, $00899A у космопорта). Возвращает полоску тайлов n×1.
   */
  windowLight(which, table, n, frame) {
    return this.memo(`light:${which}:${table}:${frame}`, () => {
      const cfg = which === "factory" ? MENU_ROM.factory : MENU_ROM.starport;
      const vram = this.tileVram(cfg.tiles);
      const pal = which === "factory" ? this.factoryPalette() : this.starportPalette();
      const px = new Uint32Array(n * 64).fill(pal[0]);
      for (let i = 0; i < n; i++) blitTile(vram, readU16(this.rom.bytes, table + (frame * n + i) * 2), pal, px, n * 8, i * 8, 0);
      return toCanvas(px, n * 8, 8);
    });
  }
  /**
   * Точка на экранчике космопорта: тайл $1D5 тайлов окна, строка 2, с отражением; рисуется только там,
   * где клетка плоскости Window без приоритета (так у VDP рамка закрывает спрайт).
   */
  starportBlip(ctx, x, y, flip) {
    const cfg = MENU_ROM.starport;
    const vram = this.tileVram(cfg.tiles);
    const map = this.memoMap(cfg.map);
    const pal = this.starportPalette();
    const px = new Uint32Array(64);
    blitTile(vram, 2 << 13 | flip << 11 | 469, pal, px, 8, 0, 0);
    const img = ctx.getImageData(x, y, 8, 8);
    const out = new Uint32Array(img.data.buffer);
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const sx = x + c;
        const sy = y + r;
        if (!px[r * 8 + c] || sx < 0 || sy < 0 || sx >= SCREEN_W || sy >= SCREEN_H) continue;
        if (readU16(map, ((sy >> 3) * 64 + (sx >> 3)) * 2) & 32768) continue;
        out[r * 8 + c] = px[r * 8 + c];
      }
    ctx.putImageData(img, x, y);
  }
  maps = /* @__PURE__ */ new Map();
  memoMap(addr) {
    let m = this.maps.get(addr);
    if (!m) {
      m = lcwDecompress(this.rom.bytes, addr).data;
      this.maps.set(addr, m);
    }
    return m;
  }
  /** VRAM из пар [LCW, адрес]; длина каждой порции — сколько игра шлёт DMA (до следующего адреса или $1000). */
  vramFrom(parts, limit = 4096) {
    const key = "v:" + parts.map((p) => p.join(":")).join(",");
    let vram = this.vrams.get(key);
    if (!vram) {
      vram = new Uint8Array(65536);
      for (const [src, dst] of parts) {
        const data = lcwDecompress(this.rom.bytes, src).data;
        vram.set(data.subarray(0, Math.min(data.length, limit, 65536 - dst)), dst);
      }
      this.vrams.set(key, vram);
    }
    return vram;
  }
  /** Палитра из 4 строк ROM (адреса строк) с правками [номер цвета, слово CRAM]. */
  paletteOf(lines, fix = []) {
    return this.memoPal("p:" + lines.join(",") + "|" + fix.join(";"), () => {
      const pal = new Uint32Array(64);
      lines.forEach((a, i) => pal.set(this.rom.readPalette(a, 1), i * 16));
      for (const [i, w] of fix) pal[i] = cramToRGBA(w);
      return pal;
    });
  }
  /** Главное меню целиком (320×224): плоскость B, поверх A, с прокруткой как у оригинала. */
  /**
   * Данные главного меню для заставки: VRAM тайлов, карты плоскостей (A с $C000, B с $E000, 128 клеток в строке;
   * menu — с пунктами меню) и палитра словами CRAM с правками.
   */
  titleData(menu = true) {
    const t = MENU_ROM.title;
    const vram = this.vramFrom(t.tiles);
    const maps = this.vramFrom([...t.planeA, ...t.planeB]).slice();
    const b = this.rom.bytes;
    if (menu)
      for (const [call, offset] of t.items) {
        if (readU16(b, call) !== 18554) continue;
        const str = call + 2 + (readU16(b, call + 2) << 16 >> 16);
        for (let i = 0; b[str + i] && i < 40; i++) {
          const word = 3 << 13 | 1152 | b[str + i] & 127;
          const at = 49152 + (offset + i) * 2;
          maps[at] = word >> 8;
          maps[at + 1] = word & 255;
        }
      }
    const palette = new Uint16Array(64);
    t.palettes.forEach((a, line) => {
      for (let i = 0; i < 16; i++) palette[line * 16 + i] = readU16(b, a + i * 2);
    });
    for (const [i, w] of t.paletteFix) palette[i] = w;
    return { vram, maps, palette };
  }
  /**
   * Экран «SEGA» при включении ($001864): 49 тайлов LCW $001914 с VRAM 0, плоскость (64 клетки) — LCW $001D2A,
   * строка 0 палитры — $001DA4; цвета 2–12 переливаются по таблице $0018D6.
   */
  segaData() {
    const b = this.rom.bytes;
    const vram = new Uint8Array(65536);
    vram.set(lcwDecompress(b, 6420).data.subarray(0, 49 * 32), 0);
    const map = lcwDecompress(b, 7466).data;
    const palette = new Uint16Array(64);
    for (let i = 0; i < 16; i++) palette[i] = readU16(b, 7588 + i * 2);
    return { vram, map, palette, cycle: 6358 };
  }
  titleScreen() {
    return this.memo("title", () => {
      const t = MENU_ROM.title;
      const { vram, maps } = this.titleData();
      const pal = this.paletteOf(t.palettes, t.paletteFix);
      const px = new Uint32Array(SCREEN_W * SCREEN_H).fill(pal[0]);
      const plane = (base, scroll) => {
        for (let cy = 0; cy < 28; cy++)
          for (let sx = 0; sx < 40; sx++) {
            const cx = sx + scroll / 8 & 127;
            blitTile(vram, readU16(maps, base + (cy * 128 + cx) * 2), pal, px, SCREEN_W, sx * 8, cy * 8);
          }
      };
      plane(57344, t.scrollB);
      plane(49152, t.scrollA);
      return toCanvas(px, SCREEN_W, SCREEN_H);
    });
  }
  /** Имена пунктов по ссылкам оригинального меню; перевод сохраняется из загруженного ROM. */
  titleStrings() {
    const b = this.rom.bytes;
    return MENU_ROM.title.items.map(([call]) => decodeText(b, call + 2 + (readU16(b, call + 2) << 16 >> 16)));
  }
  /** Логотип и пункты меню — гладкие буквы с расположением оригинала, поверх HD-фона. */
  drawTitleLettering(ctx, elapsed = 0, musicTime = elapsed, difficultyText) {
    ctx.save();
    ctx.font = '300 58px "Segoe UI Light", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const gradient = ctx.createLinearGradient(0, 52, 0, 110);
    gradient.addColorStop(0, "#fff9e7");
    gradient.addColorStop(0.28, "#ead39d");
    gradient.addColorStop(0.58, "#c49b58");
    gradient.addColorStop(0.8, "#f7e7bd");
    gradient.addColorStop(1, "#d5b474");
    const letters = [..."DUNE"];
    const gap = 12;
    const widths = letters.map((letter) => ctx.measureText(letter).width);
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + gap * (letters.length - 1);
    let targetX = 160 - totalWidth / 2;
    const entryOffsets = [[-46, -16], [-18, 20], [20, -18], [46, 14]];
    const rotations = [-0.09, 0.06, -0.055, 0.085];
    const glowPulse = (1 + Math.sin(elapsed * 2.2)) / 2;
    letters.forEach((letter, i) => {
      const width = widths[i];
      const centerX = targetX + width / 2;
      const p = Math.max(0, Math.min(1, (elapsed - i * 0.12) / 0.72));
      if (p > 0) {
        const ease = 1 - Math.pow(1 - p, 4);
        const [offsetX, offsetY] = entryOffsets[i];
        ctx.save();
        ctx.globalAlpha = ease;
        ctx.shadowColor = `rgba(255, 213, 142, ${0.45 + glowPulse * 0.2})`;
        ctx.shadowBlur = 12 + glowPulse * 6;
        ctx.translate(centerX + offsetX * (1 - ease), 82 + offsetY * (1 - ease));
        ctx.rotate(rotations[i] * (1 - ease));
        ctx.scale(0.94 + 0.06 * ease, 0.94 + 0.06 * ease);
        ctx.fillStyle = gradient;
        ctx.fillText(letter, 0, 0);
        ctx.restore();
      }
      targetX += width + gap;
    });
    const underlineAlpha = Math.max(0, Math.min(1, (elapsed - 1.05) / 0.32));
    if (underlineAlpha > 0) {
      ctx.save();
      const underline = ctx.createLinearGradient(72, 0, 248, 0);
      underline.addColorStop(0, "rgba(226, 186, 112, 0)");
      underline.addColorStop(0.5, `rgba(255, 231, 177, ${0.78 + glowPulse * 0.22})`);
      underline.addColorStop(1, "rgba(226, 186, 112, 0)");
      ctx.globalAlpha = underlineAlpha;
      ctx.strokeStyle = underline;
      ctx.lineWidth = 0.75;
      ctx.shadowColor = "rgba(255, 208, 130, 0.8)";
      ctx.shadowBlur = 5 + glowPulse * 4;
      ctx.beginPath();
      ctx.moveTo(72, 109);
      ctx.lineTo(248, 109);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    menuText(ctx, "TM", 255, 54, { size: 5, color: "#ead39d" });
    const titleWords = ["The", "Battle", "for", "Arrakis"];
    ctx.save();
    ctx.font = '600 18px Georgia, "Times New Roman", serif';
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    const fullTitle = titleWords.join(" ");
    const fullWidth = ctx.measureText(fullTitle).width;
    let cursor = 160 - fullWidth / 2;
    const beatPulse = (1 + Math.cos(musicTime * Math.PI * 4)) / 2;
    const titleClock = musicTime > 0 ? musicTime : elapsed;
    const wordCues = musicTime > 0 ? [31.7, 32.46, 32.78, 33.2] : [0, 0.48, 0.96, 1.44];
    ctx.fillStyle = "#ffe7b2";
    ctx.shadowColor = `rgba(255,164,66,${0.35 + beatPulse * 0.55})`;
    ctx.shadowBlur = 1.5 + beatPulse * 3.5;
    titleWords.forEach((word, i) => {
      const start = wordCues[i];
      const progress = Math.max(0, Math.min(1, (titleClock - start) / 0.24));
      if (progress > 0) {
        const voiceHit = Math.max(0, 1 - Math.abs(titleClock - start) / 0.2);
        const width = ctx.measureText(word).width;
        ctx.globalAlpha = progress;
        ctx.shadowBlur = 1.5 + beatPulse * 2 + voiceHit * 7;
        ctx.save();
        ctx.translate(cursor + width / 2, 126 - (1 - progress) * 3);
        ctx.scale(0.92 + progress * 0.08, 0.92 + progress * 0.08);
        ctx.fillText(word, -width / 2, 0);
        ctx.restore();
      }
      cursor += ctx.measureText(word + " ").width;
    });
    ctx.restore();
    const items = this.titleStrings();
    if (difficultyText) items[2] = difficultyText;
    items.forEach((text, i) => menuText(ctx, text, 128, 160 + i * 8, { size: 8, maxWidth: 164 }));
    menuText(
      ctx,
      "TALCO design studio \xB7 2026",
      160,
      204,
      { size: 4.6, align: "center", maxWidth: 280 }
    );
  }
  /** Стрелка главного меню в фазе перелива (0…7). */
  titleArrow(phase) {
    const t = MENU_ROM.title;
    const p = phase & 7;
    return this.memo(`tarrow:${p}`, () => {
      const pal = this.paletteOf(t.palettes, [...t.paletteFix, [2 * 16 + 13, t.arrowPulse[p]]]);
      const px = new Uint32Array(64);
      blitTile(this.vramFrom(t.tiles), 2 << 13 | t.arrowTile, pal, px, 8, 0, 0);
      return toCanvas(px, 8, 8);
    });
  }
  houseScreen() {
    return this.memo("house", () => {
      const h = MENU_ROM.house;
      const vram = this.vramFrom(h.tiles);
      const map = lcwDecompress(this.rom.bytes, h.window).data;
      const pal = this.rom.readPalette(h.palette, 4);
      const px = new Uint32Array(SCREEN_W * SCREEN_H).fill(pal[0]);
      for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(vram, readU16(map, (cy * 64 + cx) * 2), pal, px, SCREEN_W, cx * 8, cy * 8);
      return toCanvas(px, SCREEN_W, SCREEN_H);
    });
  }
  /** Рамка под именем дома (80×16) с цветом перелива 1…4 строки 3. */
  houseFrame(color) {
    const c = color & 15;
    return this.memo(`hframe:${c}`, () => {
      const pal = this.rom.readPalette(MENU_ROM.house.palette, 4);
      const tiles = this.rom.bytes.subarray(MENU_ROM.house.frame, MENU_ROM.house.frame + 8 * 32).map((b) => b ? c << 4 | c : 0);
      const px = new Uint32Array(80 * 16);
      const put = (tile, x, y, hflip) => blitTile(tiles, 3 << 13 | (hflip ? 2048 : 0) | tile, pal, px, 80, x, y);
      for (let col = 0; col < 4; col++) for (let row = 0; row < 2; row++) {
        put(col * 2 + row, col * 8, row * 8, false);
        put(col * 2 + row, 48 + (3 - col) * 8, row * 8, true);
      }
      for (let col = 0; col < 2; col++) for (let row = 0; row < 2; row++) put(4 + col * 2 + row, 32 + col * 8, row * 8, false);
      return toCanvas(px, 80, 16);
    });
  }
  /** Экран 40×28 тайлов: тайлы из LCW-потоков подряд с VRAM 0, карта — LCW, 64 слова в строке. */
  tilemapScreen(tiles, mapAddr, palette) {
    const vram = this.tileVram(tiles);
    const map = lcwDecompress(this.rom.bytes, mapAddr).data;
    const px = new Uint32Array(SCREEN_W * SCREEN_H).fill(palette[0]);
    for (let cy = 0; cy < 28; cy++)
      for (let cx = 0; cx < 40; cx++) blitTile(vram, readU16(map, (cy * 64 + cx) * 2), palette, px, SCREEN_W, cx * 8, cy * 8);
    return toCanvas(px, SCREEN_W, SCREEN_H);
  }
  /**
   * Надпись шрифтом ROM: буква — цвет 8 строки палитры, тень (вправо, вниз и по диагонали) —
   * цвет 15, как в тайлах, которые игра рисует для спрайтовых надписей.
   */
  text(text, line) {
    return this.memo(`t:${line}:${text}`, () => {
      const codes = encodeText(text);
      const w = codes.length * 8 + 1;
      const h = 9;
      const fg = new Uint8Array(w * h);
      const font = MENU_ROM.font;
      codes.forEach((code, i) => {
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 8; x++) {
            const b = this.rom.bytes[font + code * 32 + y * 4 + (x >> 1)];
            if ((x & 1 ? b & 15 : b >> 4) === 9) fg[y * w + i * 8 + x] = 1;
          }
      });
      const px = new Uint32Array(w * h);
      const ink = this.palette[line * 16 + 8];
      const shadow = this.palette[line * 16 + 15];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (fg[y * w + x]) px[y * w + x] = ink;
          else if (x > 0 && fg[y * w + x - 1] || y > 0 && fg[(y - 1) * w + x] || x > 0 && y > 0 && fg[(y - 1) * w + x - 1]) px[y * w + x] = shadow;
        }
      return toCanvas(px, w, h);
    });
  }
  /** Стрелка-курсор: фаза 0..5 сдвигает цвета 8–13 строки 1 (перелив, как в оригинале). */
  arrow(phase) {
    const p = (phase % 6 + 6) % 6;
    return this.memo(`arrow:${p}`, () => {
      const pal = this.palette.slice();
      for (let i = 0; i < 6; i++) pal[16 + 8 + i] = this.palette[16 + 8 + (i + p) % 6];
      return this.sprite(MENU_ROM.arrow, 2, 2, 1, pal, false);
    });
  }
  /** Рамка выбранной буквы (16×16): левая половина из ROM, правая — её отражение. */
  letterFrame() {
    return this.memo("frame", () => {
      const pal = this.palette.slice();
      pal[3 * 16 + 1] = cramToRGBA(1638);
      const left = this.sprite(MENU_ROM.letterFrame, 1, 2, 3, pal, false);
      const right = this.sprite(MENU_ROM.letterFrame, 1, 2, 3, pal, true);
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const g = c.getContext("2d");
      g.drawImage(left, 0, 0);
      g.drawImage(right, 8, 0);
      return c;
    });
  }
  /**
   * Надписи меню — из ROM, по тем же ссылкам, что в коде меню ($020E00) и экрана дома ($026F6A):
   * так меню на языке загруженного ROM (русский перевод или английский оригинал).
   */
  menuStrings() {
    const b = this.rom.bytes;
    const pcRel = (at, opcode, fallback) => readU16(b, at) === opcode ? decodeText(b, at + 2 + (readU16(b, at + 2) << 16 >> 16)) : fallback;
    const housesAt = readU16(b, 159594) === 16889 ? readU16(b, 159596) << 16 | readU16(b, 159598) : -1;
    const fallbackHouses = ["\u0425\u0410\u0420\u041A\u041E\u041D\u041D\u0415\u041D\u042B", "\u0410\u0422\u0420\u0415\u0419\u0414\u0415\u0421\u042B", "\u041E\u0420\u0414\u041E\u0421\u042B"];
    const houses = [0, 1, 2].map((i) => housesAt > 0 ? decodeText(b, housesAt + i * 9, 9) : fallbackHouses[i]);
    if (/[А-ЯЁ]/i.test(houses[1])) houses[1] = "\u0410\u0422\u0420\u0415\u0419\u0414\u0415\u0421\u042B";
    return {
      yes: pcRel(134746, 17402, "\u0414\u0410"),
      no: pcRel(134752, 17402, "\u041D\u0415\u0422"),
      restart: pcRel(134850, 18554, "\u041D\u0410\u0427\u0410\u0422\u042C \u0421\u041D\u0410\u0427\u0410\u041B\u0410"),
      chooseHouse: pcRel(134870, 18554, "\u0412\u042B\u0411\u0420\u0410\u0422\u042C \u0414\u0420\u0423\u0413\u041E\u0419 \u0414\u041E\u041C"),
      // VERSIONNUM: строка версии, которую код $021A1E пишет в поле ввода пароля
      version: pcRel(137758, 18554, "VERSION"),
      // 9 байт на дом, по номеру дома: 0 — Харконнены, 1 — Атрейдесы, 2 — Ордосы
      houses
    };
  }
  /** Палитра окна здания: строка 0 — чёрная (там картинка со своей палитрой), 1–3 из ROM. */
  factoryPalette() {
    return this.memoPal("factory", () => {
      const pal = new Uint32Array(64).fill(cramToRGBA(0));
      MENU_ROM.factory.palettes.forEach((addr, i) => pal.set(this.rom.readPalette(addr, 1), (i + 1) * 16));
      return pal;
    });
  }
  /** Палитра окна космопорта: строка 2 зелёная. */
  starportPalette() {
    return this.memoPal("starport", () => {
      const pal = new Uint32Array(64).fill(cramToRGBA(0));
      MENU_ROM.starport.palettes.forEach((addr, i) => pal.set(this.rom.readPalette(addr, 1), (i + 1) * 16));
      return pal;
    });
  }
  starportBackground() {
    return this.memo("bg:starport", () => this.tilemapScreen(MENU_ROM.starport.tiles, MENU_ROM.starport.map, this.starportPalette()));
  }
  /** Значок патрона 2×2 (урон юнита) — у заводов юнитов и космопорта вместо энергии. */
  ammoIcon() {
    return this.memo("ammo", () => this.sprite(MENU_ROM.factory.ammoIcon, 2, 2, 1, this.factoryPalette(), false));
  }
  /** Рамка окна здания целиком (320×224). */
  factoryBackground() {
    return this.memo("bg:factory", () => this.tilemapScreen(MENU_ROM.factory.tiles, MENU_ROM.factory.map, this.factoryPalette()));
  }
  /**
   * Иконка 4×3 из таблицы окна: index ≥ 0 — тип здания или юнита, −5…−1 — кнопки
   * (−5 СТОП и −4 РЕМОНТ тёмные, −3 СТОП и −2 РЕМОНТ светлые, −1 ВЫХОД). Палитра — как в коде $00827A:
   * здания строка 1, юниты строка 3 (кроме типа 12).
   */
  factoryIcon(units, index) {
    return this.memoNull(`fi:${units}:${index}`, () => {
      const table = units ? MENU_ROM.factory.unitIcons : MENU_ROM.factory.structureIcons;
      const ptr = readU16(this.rom.bytes, table + index * 4) << 16 | readU16(this.rom.bytes, table + index * 4 + 2);
      if (!ptr || ptr >= this.rom.bytes.length) return null;
      const line = units && index !== 12 ? 3 : 1;
      return this.sprite(ptr, 4, 3, line, this.factoryPalette(), false);
    });
  }
  /**
   * Рамка-курсор с переливом ($008596): каждый кадр счётчик +1, фаза (счётчик & 31) >> 3 выбирает цвет из
   * 11, 12, 15, 12 (`$0085E0`); каждый ненулевой байт тайлов рамки заменяется на этот цвет в обоих пикселях.
   */
  factoryCursor(phase = 0, starport = false) {
    const p = phase & 3;
    return this.memo(`fcur:${starport}:${p}`, () => {
      const c = this.rom.bytes[34272 + p] & 15;
      const src = this.rom.bytes.subarray(MENU_ROM.factory.cursor, MENU_ROM.factory.cursor + 12 * 32);
      const tiles = src.map((b) => b ? c << 4 | c : 0);
      return this.spriteFrom(tiles, 4, 3, 2, starport ? this.starportPalette() : this.factoryPalette());
    });
  }
  /** Значок 2×2: цена (0), энергия (1), прочность (2). */
  statIcon(i) {
    return this.memo(`stat:${i}`, () => this.sprite(MENU_ROM.factory.statIcons[i], 2, 2, 1, this.factoryPalette(), false));
  }
  /** Значок размера здания: 0 — 1×1, 1 — 2×2, 2 — 3×2, 3 — 3×3. */
  sizeIcon(i) {
    return this.memo(`size:${i}`, () => this.sprite(MENU_ROM.factory.sizeIcons + i * 128, 2, 2, 1, this.factoryPalette(), false));
  }
  /** Строка шрифтом целыми тайлами (буква на чёрном), как надписи в окне здания; строка палитры 1. */
  plainText(text) {
    return this.memo(`pt:${text}`, () => {
      const codes = encodeText(text);
      const px = new Uint32Array(Math.max(1, codes.length) * 64);
      const w = Math.max(1, codes.length) * 8;
      codes.forEach((code, i) => blitTile(this.rom.bytes.subarray(MENU_ROM.font), 1 << 13 | code, this.factoryPalette(), px, w, i * 8, 0));
      return toCanvas(px, w, 8);
    });
  }
  /** Имя здания или юнита из таблиц описаний ROM (указатель на +2), как в окне оригинала. */
  objectName(units, type) {
    const b = this.rom.bytes;
    const rec = units ? readU16(b, 443836 + type * 4) << 16 | readU16(b, 443836 + type * 4 + 2) : 438190 + type * 102;
    const ptr = readU16(b, rec + 2) << 16 | readU16(b, rec + 4);
    let s = "";
    for (let i = 0; i < 12 && b[ptr + i]; i++) s += decodeText(b, ptr + i, 1) || " ";
    return s;
  }
  /** Имена из таблицы [указатель, номер] (фонотека, спецэффекты). */
  names(table) {
    const out = [];
    for (let o = table; ; o += 8) {
      const ptr = readU16(this.rom.bytes, o) << 16 | readU16(this.rom.bytes, o + 2);
      if (!ptr) break;
      out.push({ name: decodeText(this.rom.bytes, ptr), id: readU16(this.rom.bytes, o + 4) << 16 | readU16(this.rom.bytes, o + 6) });
    }
    return out;
  }
  /** Спрайт из готовых тайлов (по столбцам). */
  spriteFrom(tiles, tw, th, line, pal) {
    const w = tw * 8;
    const px = new Uint32Array(w * th * 8);
    for (let c = 0; c < tw; c++) for (let r = 0; r < th; r++) blitTile(tiles, line << 13 | c * th + r, pal, px, w, c * 8, r * 8);
    return toCanvas(px, w, th * 8);
  }
  /** Спрайт из сырых тайлов ROM (тайлы идут по столбцам, как у VDP). */
  sprite(src, tw, th, line, pal, hflip) {
    const vram = this.rom.bytes.subarray(src, src + tw * th * 32);
    const w = tw * 8;
    const px = new Uint32Array(w * th * 8);
    for (let c = 0; c < tw; c++)
      for (let r = 0; r < th; r++) {
        const col = hflip ? tw - 1 - c : c;
        blitTile(vram, line << 13 | (hflip ? 2048 : 0) | c * th + r, pal, px, w, col * 8, r * 8);
      }
    return toCanvas(px, w, th * 8);
  }
  pals = /* @__PURE__ */ new Map();
  memoPal(key, make) {
    let p = this.pals.get(key);
    if (!p) {
      p = make();
      this.pals.set(key, p);
    }
    return p;
  }
  nulls = /* @__PURE__ */ new Set();
  memoNull(key, make) {
    if (this.nulls.has(key)) return null;
    const c = this.cache.get(key) ?? make();
    if (c) this.cache.set(key, c);
    else this.nulls.add(key);
    return c;
  }
  memo(key, make) {
    let c = this.cache.get(key);
    if (!c) {
      c = make();
      this.cache.set(key, c);
    }
    return c;
  }
};
function toCanvas(px, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(px.buffer), w, h), 0, 0);
  return c;
}
export {
  DuneRom,
  ScreenGfx
};
