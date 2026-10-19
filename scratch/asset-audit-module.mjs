// src/rom/lcw.ts
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

// src/rom/md.ts
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

// src/gfx/screens.ts
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

// src/ui/endgame.ts
var END_ROM = {
  won: {
    tiles: [720550, 723574, 726682, 729382],
    frames: [807004, 807876, 808748, 809620],
    palette: 682776,
    text: 41084,
    textDef: 40374
  },
  lost: {
    tiles: [695254, 697588, 700860, 704084, 707e3, 709686, 712808, 716094, 718872],
    frames: [802268, 803450, 804634, 805798],
    palette: 682648,
    text: 40412,
    textDef: 40348
  },
  /** строка 3 палитры для надписи */
  textPalette: 41948,
  /** клин орнитоптеров: описания спрайтов по направлению, скорость и начало ($00B5BC, $00B5CC, $00B5DC) */
  flyDefs: [46588, 46674, 46760, 46846],
  flyVelocity: 46540,
  flyStart: 46556,
  /** строка палитры клина по дому (0 Харконнены, 1 Атрейдесы, 2 Ордосы) */
  flyLine: 46572
};
function objectDef(b, addr) {
  const s16 = (a) => readU16(b, a) << 16 >> 16;
  const n = readU16(b, addr) + 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = addr + 2 + i * 12;
    const size = b[e + 6];
    out.push({ y: s16(e + 4), w: (size >> 2 & 3) + 1, h: (size & 3) + 1, attr: readU16(b, e + 8), x: s16(e + 10) });
  }
  return out;
}

// src/engine/tables.gen.ts
var g_table_tilediff = [[[0, 0], [0, -1], [1, 0], [0, -1], [1, 0], [0, 0], [1, 0], [0, 0]], [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 16], [16, 0], [16, 16], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 32], [32, 0], [32, 32], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 48], [48, 0], [48, 48], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 64], [64, 0], [64, 64], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 80], [80, 0], [80, 80], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 96], [96, 0], [96, 96], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 112], [112, 0], [112, 112], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 128], [128, 0], [128, 128], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 144], [144, 0], [144, 144], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 160], [160, 0], [160, 160], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 176], [176, 0], [176, 176], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 192], [192, 0], [192, 192], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 208], [208, 0], [208, 208], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 224], [224, 0], [224, 224], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 240], [240, 0], [240, 240], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 256], [256, 0], [256, 256], [128, 0], [128, 256], [0, 128], [256, 128], [128, 128]], [[0, 272], [272, 0], [272, 272], [128, 0], [128, 272], [0, 128], [272, 128], [128, 128]], [[0, 288], [288, 0], [288, 288], [144, 0], [144, 288], [0, 144], [288, 144], [144, 144]], [[0, 304], [304, 0], [304, 304], [144, 0], [144, 304], [0, 144], [304, 144], [144, 144]], [[0, 320], [320, 0], [320, 320], [160, 0], [160, 320], [0, 160], [320, 160], [160, 160]], [[0, 336], [336, 0], [336, 336], [160, 0], [160, 336], [0, 160], [336, 160], [160, 160]], [[0, 352], [352, 0], [352, 352], [176, 0], [176, 352], [0, 176], [352, 176], [176, 176]], [[0, 368], [368, 0], [368, 368], [176, 0], [176, 368], [0, 176], [368, 176], [176, 176]], [[0, 384], [384, 0], [384, 384], [192, 0], [192, 384], [0, 192], [384, 192], [192, 192]], [[0, 400], [400, 0], [400, 400], [192, 0], [192, 400], [0, 192], [400, 192], [192, 192]], [[0, 416], [416, 0], [416, 416], [208, 0], [208, 416], [0, 208], [416, 208], [208, 208]], [[0, 432], [432, 0], [432, 432], [208, 0], [208, 432], [0, 208], [432, 208], [208, 208]], [[0, 448], [448, 0], [448, 448], [224, 0], [224, 448], [0, 224], [448, 224], [224, 224]], [[0, 464], [464, 0], [464, 464], [224, 0], [224, 464], [0, 224], [464, 224], [224, 224]], [[0, 480], [480, 0], [480, 480], [240, 0], [240, 480], [0, 240], [480, 240], [240, 240]], [[0, 496], [496, 0], [496, 496], [240, 0], [240, 496], [0, 240], [496, 240], [240, 240]], [[0, 768], [768, 0], [768, 768], [512, 0], [512, 512], [0, 512], [512, 256], [256, 256]]];
var g_table_explosion = [[[1, 153], [2, 3], [9, 0], [1, 153], [2, 3], [0, 0]], [[1, 154], [9, 0], [2, 3], [1, 153], [2, 3], [1, 154], [2, 3], [0, 0]], [[1, 183], [6, 50], [9, 0], [5, 0], [2, 15], [1, 184], [2, 15], [0, 0]], [[1, 183], [6, 49], [9, 0], [5, 0], [2, 3], [1, 184], [2, 3], [0, 0]], [[1, 203], [6, 51], [9, 0], [5, 0], [2, 7], [1, 204], [2, 3], [1, 205], [2, 3], [1, 206], [2, 3], [1, 207], [2, 3], [0, 0]], [[3, 60], [1, 203], [6, 41], [9, 0], [5, 0], [2, 7], [1, 204], [2, 3], [1, 205], [2, 3], [1, 206], [2, 3], [1, 207], [2, 3], [0, 0]], [[1, 198], [6, 51], [9, 0], [5, 0], [2, 7], [1, 199], [2, 3], [1, 200], [2, 3], [1, 201], [2, 3], [1, 202], [2, 3], [0, 0]], [[1, 208], [6, 39], [2, 15], [1, 209], [2, 15], [1, 210], [2, 15], [1, 211], [2, 15], [1, 212], [2, 15], [0, 0]], [[1, 156], [6, 40], [9, 0], [2, 7], [1, 157], [2, 3], [1, 158], [2, 3], [1, 157], [2, 3], [5, 0], [0, 0]], [[1, 183], [6, 41], [9, 0], [5, 0], [2, 3], [1, 203], [2, 3], [4, -80], [1, 168], [2, 15], [1, 169], [2, 15], [1, 170], [2, 15], [1, 168], [2, 15], [1, 169], [2, 15], [1, 170], [2, 15], [1, 168], [2, 15], [1, 169], [2, 15], [1, 170], [2, 15], [1, 168], [2, 15], [1, 169], [2, 15], [1, 170], [2, 15], [1, 168], [2, 15], [1, 169], [2, 15], [1, 170], [2, 15], [0, 0]], [[1, 151], [6, 49], [9, 0], [5, 0], [2, 7], [1, 152], [2, 7], [0, 0]], [[3, 60], [1, 188], [6, 51], [9, 0], [5, 0], [2, 7], [1, 189], [2, 3], [1, 190], [2, 3], [1, 191], [2, 3], [1, 192], [2, 3], [0, 0]], [[1, 213], [2, 15], [1, 214], [2, 15], [1, 215], [2, 15], [1, 216], [2, 15], [1, 217], [2, 30], [0, 0]], [[1, 218], [2, 15], [1, 219], [2, 15], [1, 220], [2, 15], [1, 221], [2, 15], [1, 222], [2, 30], [0, 0]], [[3, 60], [1, 188], [6, 51], [2, 7], [1, 189], [9, 0], [7, 0], [2, 3], [1, 190], [2, 3], [1, 191], [2, 3], [1, 192], [2, 3], [0, 0]], [[1, 183], [6, 49], [4, -80], [2, 3], [1, 184], [2, 3], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [0, 0]], [[1, 203], [6, 49], [9, 0], [8, 0], [2, 3], [1, 204], [1, 207], [2, 3], [0, 0]], [[1, 203], [6, 49], [9, 0], [8, 4], [2, 3], [1, 204], [1, 207], [2, 3], [0, 0]], [[1, 183], [6, 54], [9, 0], [2, 3], [1, 184], [2, 3], [0, 0]], [[1, 156], [6, 40], [7, 0], [2, 7], [7, 0], [1, 157], [2, 3], [7, 0], [1, 158], [2, 3], [7, 0], [1, 157], [2, 3], [7, 0], [5, 0], [0, 0]]];
var g_table_animation_structure = [[[6, 1], [3, 300], [1, 0]], [[6, 0], [1, 0]], [[6, 2], [3, 300], [1, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [6, 4], [3, 30], [6, 5], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [4, 0]], [[6, 8], [3, 30], [6, 9], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 7], [3, 30], [6, 6], [3, 30], [6, 5], [3, 30], [6, 4], [3, 30], [7, -4]], [[6, 4], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 4], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 5], [3, 30], [6, 3], [3, 30], [6, 4], [3, 30], [6, 2], [3, 30], [6, 5], [3, 30], [6, 4], [3, 30], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [4, 0]], [[6, 8], [3, 30], [6, 9], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 8], [3, 60], [6, 9], [3, 60], [6, 6], [3, 60], [6, 5], [3, 60], [6, 2], [3, 60], [6, 3], [3, 60], [7, -4]], [[6, 2], [3, 60], [6, 3], [3, 60], [4, 0]], [[6, 2], [3, 60], [6, 5], [3, 60], [6, 6], [3, 60], [6, 9], [3, 60], [6, 8], [3, 60], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]]];
var g_table_unitInfo = [[{ "stringID_abbrev": 194, "name": "Carryall", "stringID_full": 195, "wsa": "carryall.wsa", "_4": { "hasShadow": 1, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 100, "fogUncoverRadius": 0, "spriteID": 89, "buildCredits": 800, "buildTime": 64, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 16, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 20, "priorityTarget": 16, "availableHouse": 63 }, 0, 10, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 1, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 32, 4, 0, 200, 3, 283, -1, 7, 1, 0, 0, 0, 0, 65535, 255, 42], [{ "stringID_abbrev": 196, "name": "'Thopter", "stringID_full": 197, "wsa": "orni.wsa", "_4": { "hasShadow": 1, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 25, "fogUncoverRadius": 5, "spriteID": 97, "buildCredits": 600, "buildTime": 96, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 28, "upgradeLevelRequired": 1, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 75, "priorityTarget": 30, "availableHouse": 62 }, 0, 10, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 1, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 4, 7, 150, 2, 289, -1, 7, 5, 0, 50, 50, 50, 0, 22, 42], [{ "stringID_abbrev": 198, "name": "Infantry", "stringID_full": 199, "wsa": "infantry.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 50, "fogUncoverRadius": 1, "spriteID": 93, "buildCredits": 100, "buildTime": 32, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 4, "upgradeLevelRequired": 1, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 20, "priorityTarget": 20, "availableHouse": 62 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 15, 5, 3, 329, -1, 11, 4, 0, 45, 2, 3, 0, 23, 58], [{ "stringID_abbrev": 200, "name": "Troopers", "stringID_full": 201, "wsa": "hyinfy.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 1, "priority": 1 }, "spawnChance": 0, "hitpoints": 110, "fogUncoverRadius": 1, "spriteID": 103, "buildCredits": 200, "buildTime": 56, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 8, "upgradeLevelRequired": 1, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 50, "priorityTarget": 50, "availableHouse": 61 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 15, 10, 3, 341, -1, 11, 4, 0, 50, 5, 5, 0, 23, 59], [{ "stringID_abbrev": 202, "name": "Soldier", "stringID_full": 203, "wsa": "infantry.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 20, "fogUncoverRadius": 1, "spriteID": 102, "buildCredits": 60, "buildTime": 32, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 2, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 10, "priorityTarget": 10, "availableHouse": 62 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 1, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 12, 8, 3, 311, -1, 11, 3, 0, 45, 2, 3, 0, 23, 58], [{ "stringID_abbrev": 204, "name": "Trooper", "stringID_full": 205, "wsa": "hyinfy.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 1, "priority": 1 }, "spawnChance": 0, "hitpoints": 45, "fogUncoverRadius": 1, "spriteID": 88, "buildCredits": 100, "buildTime": 56, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 6, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 20, "priorityTarget": 30, "availableHouse": 61 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 1, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 12, 15, 3, 320, -1, 11, 3, 0, 50, 5, 5, 0, 23, 59], [{ "stringID_abbrev": 44, "name": "Saboteur", "stringID_full": 44, "wsa": "saboture.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 10, "fogUncoverRadius": 1, "spriteID": 96, "buildCredits": 120, "buildTime": 48, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [9, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 700, "availableHouse": 4 }, 20, 21, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 8, 0, 7, 40, 3, 301, -1, 9, 3, 0, 45, 2, 2, 0, 23, 58], [{ "stringID_abbrev": 208, "name": "Launcher", "stringID_full": 209, "wsa": "rtank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 1, "priority": 1 }, "spawnChance": 64, "hitpoints": 100, "fogUncoverRadius": 5, "spriteID": 85, "buildCredits": 450, "buildTime": 72, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 26, "upgradeLevelRequired": 2, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 100, "priorityTarget": 150, "availableHouse": 59 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 30, 1, 111, 146, 11, 1, 162, 120, 9, 75, 3, 19, -1], [{ "stringID_abbrev": 210, "name": "Deviator", "stringID_full": 211, "wsa": "ordrtank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 120, "fogUncoverRadius": 5, "spriteID": 98, "buildCredits": 750, "buildTime": 80, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 30, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 50, "priorityTarget": 175, "availableHouse": 4 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 30, 1, 111, 146, 11, 1, 162, 180, 7, 0, 3, 21, -1], [{ "stringID_abbrev": 212, "name": "Tank", "stringID_full": 213, "wsa": "ltank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 1, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 3, "spriteID": 90, "buildCredits": 300, "buildTime": 64, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 22, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 80, "priorityTarget": 100, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 25, 1, 111, 116, 11, 1, 162, 80, 4, 25, 1, 23, 57], [{ "stringID_abbrev": 214, "name": "Siege Tank", "stringID_full": 215, "wsa": "htank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 1, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 300, "fogUncoverRadius": 4, "spriteID": 84, "buildCredits": 600, "buildTime": 96, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 24, "upgradeLevelRequired": 3, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 130, "priorityTarget": 150, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 1, 0, 20, 1, 121, 126, 11, 1, 162, 90, 5, 30, 1, 23, 57], [{ "stringID_abbrev": 216, "name": "Devastator", "stringID_full": 217, "wsa": "harktank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 400, "fogUncoverRadius": 4, "spriteID": 87, "buildCredits": 800, "buildTime": 104, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 32, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 13, 3], "available": 0, "hintStringID": 0, "priorityBuild": 175, "priorityTarget": 180, "availableHouse": 57 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 1, 0, 10, 1, 131, 136, 11, 1, 165, 100, 5, 40, 1, 23, 57], [{ "stringID_abbrev": 218, "name": "Sonic Tank", "stringID_full": 219, "wsa": "stank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 110, "fogUncoverRadius": 4, "spriteID": 91, "buildCredits": 600, "buildTime": 104, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 34, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 80, "priorityTarget": 110, "availableHouse": 58 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 1, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 30, 1, 111, 141, 11, 1, 162, 80, 8, 60, 65535, 24, 43], [{ "stringID_abbrev": 220, "name": "Trike", "stringID_full": 221, "wsa": "trike.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 100, "fogUncoverRadius": 2, "spriteID": 92, "buildCredits": 150, "buildTime": 40, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 10, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 50, "priorityTarget": 50, "availableHouse": 58 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 1, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 3, 0, 45, 2, 243, -1, 11, 1, 0, 50, 3, 5, 0, 23, 59], [{ "stringID_abbrev": 222, "name": "Raider Trike", "stringID_full": 223, "wsa": "otrike.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 80, "fogUncoverRadius": 2, "spriteID": 99, "buildCredits": 150, "buildTime": 40, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 12, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 55, "priorityTarget": 60, "availableHouse": 60 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 1, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 3, 0, 60, 2, 243, -1, 11, 1, 0, 50, 3, 5, 0, 23, 59], [{ "stringID_abbrev": 224, "name": "Quad", "stringID_full": 225, "wsa": "quad.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 130, "fogUncoverRadius": 2, "spriteID": 86, "buildCredits": 200, "buildTime": 48, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 14, "upgradeLevelRequired": 1, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 60, "priorityTarget": 60, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 1, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 3, 0, 40, 2, 238, -1, 11, 1, 0, 50, 3, 7, 0, 23, 59], [{ "stringID_abbrev": 226, "name": "Harvester", "stringID_full": 227, "wsa": "harvest.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 128, "hitpoints": 150, "fogUncoverRadius": 2, "spriteID": 100, "buildCredits": 300, "buildTime": 64, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 18, "upgradeLevelRequired": 0, "actionsPlayer": [5, 1, 6, 7], "available": 0, "hintStringID": 0, "priorityBuild": 10, "priorityTarget": 150, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 2, 0, 20, 1, 248, -1, 5, 1, 165, 0, 0, 0, 65535, 255, 0], [{ "stringID_abbrev": 228, "name": "MCV", "stringID_full": 229, "wsa": "mcv.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 150, "fogUncoverRadius": 2, "spriteID": 101, "buildCredits": 900, "buildTime": 80, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 20, "upgradeLevelRequired": 1, "actionsPlayer": [12, 1, 2, 7], "available": 0, "hintStringID": 0, "priorityBuild": 10, "priorityTarget": 150, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 1, 0, 20, 1, 253, -1, 11, 1, 0, 0, 0, 0, 65535, 255, 0], [{ "stringID_abbrev": 0, "name": "Death Hand", "stringID_full": 0, "wsa": "gold-bb.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 1 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 32, 4, 0, 250, 2, 278, -1, 255, 2, 0, 0, 15, 100, 11, 255, 42], [{ "stringID_abbrev": 0, "name": "Rocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 1, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 1, "isNormalUnit": 0 }, 16, 4, 7, 200, 2, 258, -1, 255, 2, 0, 0, 8, 75, 3, 255, 42], [{ "stringID_abbrev": 0, "name": "ARocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 1, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 0, "isNormalUnit": 0 }, 16, 4, 7, 160, 8, 258, -1, 255, 2, 0, 0, 60, 75, 3, 255, 42], [{ "stringID_abbrev": 0, "name": "GRocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 1, "isNormalUnit": 0 }, 16, 4, 7, 200, 2, 258, -1, 255, 2, 0, 0, 7, 75, 7, 255, 42], [{ "stringID_abbrev": 0, "name": "MiniRocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 0, "isNormalUnit": 0 }, 8, 4, 7, 180, 5, 268, -1, 255, 2, 0, 0, 3, 0, 18, 255, 64], [{ "stringID_abbrev": 0, "name": "Bullet", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 1, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 8, 4, 0, 250, 0, 174, -1, 255, 0, 0, 0, 0, 0, 0, 255, -1], [{ "stringID_abbrev": 0, "name": "Sonic Blast", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 1, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 1, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 32, 4, 7, 200, 0, 160, -1, 255, 0, 0, 0, 10, 25, 65535, 255, -1], [{ "stringID_abbrev": 230, "name": "Sandworm", "stringID_full": 231, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 1, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 1, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 1e3, "fogUncoverRadius": 0, "spriteID": 105, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 8 }, 16, 17, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 24, 5, 0, 35, 3, 161, -1, 255, 1, 0, 20, 0, 300, 13, 25, 63], [{ "stringID_abbrev": 0, "name": "Frigate", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 1, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 100, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 11, 11, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 32, 4, 0, 130, 2, 298, -1, 255, 1, 0, 0, 0, 0, 65535, 255, -1]];
var g_table_structureInfo = [[{ "stringID_abbrev": 232, "name": "Concrete", "stringID_full": 233, "wsa": "slab.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 1, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 20, "fogUncoverRadius": 1, "spriteID": 65, "buildCredits": 5, "buildTime": 16, "availableCampaign": 1, "structuresRequired": 0, "sortPriority": 2, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 341, "priorityBuild": 0, "priorityTarget": 5, "availableHouse": 63 }, 0, 0, 0, 0, 8, [2, 2, 2], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 234, "name": "Concrete4", "stringID_full": 235, "wsa": "4slab.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 1, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 20, "fogUncoverRadius": 1, "spriteID": 83, "buildCredits": 20, "buildTime": 16, "availableCampaign": 4, "structuresRequired": 0, "sortPriority": 4, "upgradeLevelRequired": 1, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 341, "priorityBuild": 0, "priorityTarget": 10, "availableHouse": 63 }, 0, 0, 0, 3, 8, [2, 2, 2], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 236, "name": "Palace", "stringID_full": 237, "wsa": "palace.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 1e3, "fogUncoverRadius": 5, "spriteID": 66, "buildCredits": 999, "buildTime": 130, "availableCampaign": 8, "structuresRequired": 2048, "sortPriority": 5, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 342, "priorityBuild": 0, "priorityTarget": 400, "availableHouse": 63 }, 0, 0, 80, 6, 11, [4, 4, 4], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 238, "name": "Light Fctry", "stringID_full": 239, "wsa": "liteftry.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 350, "fogUncoverRadius": 3, "spriteID": 67, "buildCredits": 400, "buildTime": 96, "availableCampaign": 3, "structuresRequired": 4608, "sortPriority": 14, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 343, "priorityBuild": 0, "priorityTarget": 200, "availableHouse": 63 }, 0, 0, 20, 3, 12, [14, 15, 16], [13, 15, 255, 255, 255, 255, 255, 255], [3, 0, 0]], [{ "stringID_abbrev": 240, "name": "Heavy Fctry", "stringID_full": 241, "wsa": "hvyftry.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 3, "spriteID": 68, "buildCredits": 600, "buildTime": 144, "availableCampaign": 4, "structuresRequired": 262664, "sortPriority": 28, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 344, "priorityBuild": 0, "priorityTarget": 600, "availableHouse": 63 }, 0, 0, 35, 5, 13, [11, 12, 13], [10, 7, 16, 9, 11, 8, 17, 12], [4, 5, 6]], [{ "stringID_abbrev": 242, "name": "Hi-Tech", "stringID_full": 243, "wsa": "hitcftry.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 69, "buildCredits": 500, "buildTime": 120, "availableCampaign": 5, "structuresRequired": 262664, "sortPriority": 30, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 345, "priorityBuild": 0, "priorityTarget": 200, "availableHouse": 63 }, 0, 0, 35, 5, 14, [8, 9, 10], [0, 1, 255, 255, 255, 255, 255, 255], [7, 0, 0]], [{ "stringID_abbrev": 244, "name": "IX", "stringID_full": 245, "wsa": "ix.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 192, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 70, "buildCredits": 500, "buildTime": 120, "availableCampaign": 7, "structuresRequired": 6656, "sortPriority": 34, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 346, "priorityBuild": 0, "priorityTarget": 100, "availableHouse": 63 }, 0, 0, 40, 3, 15, [20, 20, 20], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 246, "name": "WOR", "stringID_full": 247, "wsa": "wor.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 71, "buildCredits": 400, "buildTime": 104, "availableCampaign": 5, "structuresRequired": 263680, "sortPriority": 20, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 347, "priorityBuild": 0, "priorityTarget": 175, "availableHouse": 61 }, 0, 0, 20, 3, 16, [21, 21, 21], [5, 3, 255, 255, 255, 255, 255, 255], [6, 0, 0]], [{ "stringID_abbrev": 248, "name": "Const Yard", "stringID_full": 249, "wsa": "construc.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 1, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 72, "buildCredits": 400, "buildTime": 80, "availableCampaign": 99, "structuresRequired": -1, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 348, "priorityBuild": 0, "priorityTarget": 300, "availableHouse": 63 }, 0, 0, 0, 3, 17, [22, 22, 22], [255, 255, 255, 255, 255, 255, 255, 255], [4, 6, 0]], [{ "stringID_abbrev": 250, "name": "Windtrap", "stringID_full": 251, "wsa": "windtrap.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 2, "spriteID": 73, "buildCredits": 300, "buildTime": 48, "availableCampaign": 1, "structuresRequired": 0, "sortPriority": 6, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 349, "priorityBuild": 0, "priorityTarget": 300, "availableHouse": 63 }, 0, 0, -100, 3, 19, [26, 26, 26], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 252, "name": "Barracks", "stringID_full": 253, "wsa": "barrac.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 300, "fogUncoverRadius": 2, "spriteID": 74, "buildCredits": 300, "buildTime": 72, "availableCampaign": 2, "structuresRequired": 262656, "sortPriority": 18, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 350, "priorityBuild": 0, "priorityTarget": 100, "availableHouse": 62 }, 0, 0, 10, 3, 18, [28, 28, 28], [4, 2, 255, 255, 255, 255, 255, 255], [2, 0, 0]], [{ "stringID_abbrev": 254, "name": "Starport", "stringID_full": 255, "wsa": "starport.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 1, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 500, "fogUncoverRadius": 6, "spriteID": 75, "buildCredits": 500, "buildTime": 120, "availableCampaign": 6, "structuresRequired": 4608, "sortPriority": 32, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 351, "priorityBuild": 0, "priorityTarget": 250, "availableHouse": 63 }, 0, 0, 50, 6, 20, [5, 6, 7], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 256, "name": "Refinery", "stringID_full": 257, "wsa": "refinery.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 1, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 450, "fogUncoverRadius": 4, "spriteID": 76, "buildCredits": 400, "buildTime": 80, "availableCampaign": 1, "structuresRequired": 512, "sortPriority": 8, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 352, "priorityBuild": 0, "priorityTarget": 300, "availableHouse": 63 }, 65536, 1005, 30, 5, 21, [17, 18, 19], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 258, "name": "Repair", "stringID_full": 259, "wsa": "repair.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 200, "fogUncoverRadius": 3, "spriteID": 77, "buildCredits": 700, "buildTime": 80, "availableCampaign": 5, "structuresRequired": 262664, "sortPriority": 24, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 353, "priorityBuild": 0, "priorityTarget": 600, "availableHouse": 63 }, 130944, 0, 20, 5, 22, [23, 24, 25], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 260, "name": "Wall", "stringID_full": 261, "wsa": "wall.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 50, "fogUncoverRadius": 1, "spriteID": 78, "buildCredits": 50, "buildTime": 40, "availableCampaign": 4, "structuresRequired": 262656, "sortPriority": 16, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 354, "priorityBuild": 0, "priorityTarget": 30, "availableHouse": 63 }, 0, 0, 0, 0, 6, [255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 262, "name": "Turret", "stringID_full": 263, "wsa": "turret.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 2, "spriteID": 79, "buildCredits": 125, "buildTime": 64, "availableCampaign": 5, "structuresRequired": 262656, "sortPriority": 22, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 355, "priorityBuild": 75, "priorityTarget": 150, "availableHouse": 63 }, 0, 0, 10, 0, 23, [255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 264, "name": "R-Turret", "stringID_full": 265, "wsa": "rturret.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 5, "spriteID": 80, "buildCredits": 250, "buildTime": 96, "availableCampaign": 0, "structuresRequired": 262656, "sortPriority": 26, "upgradeLevelRequired": 2, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 356, "priorityBuild": 100, "priorityTarget": 75, "availableHouse": 63 }, 0, 0, 25, 0, 24, [255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 266, "name": "Spice Silo", "stringID_full": 267, "wsa": "storage.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 150, "fogUncoverRadius": 2, "spriteID": 81, "buildCredits": 150, "buildTime": 48, "availableCampaign": 2, "structuresRequired": 4608, "sortPriority": 12, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 357, "priorityBuild": 0, "priorityTarget": 150, "availableHouse": 63 }, 0, 1e3, 5, 3, 25, [27, 27, 27], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 268, "name": "Outpost", "stringID_full": 269, "wsa": "headqrts.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 500, "fogUncoverRadius": 10, "spriteID": 82, "buildCredits": 400, "buildTime": 80, "availableCampaign": 2, "structuresRequired": 512, "sortPriority": 10, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 358, "priorityBuild": 0, "priorityTarget": 275, "availableHouse": 63 }, 0, 0, 30, 3, 26, [3, 3, 3], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]]];
var g_table_structure_layoutTiles = { "_0": [0, 0, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x1": [0, 1, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x1": [0, 64, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x2": [0, 1, 64, 65, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x2": [0, 1, 64, 65, 128, 129, 0, 0, 0], "STRUCTURE_LAYOUT_2x3": [0, 1, 2, 64, 65, 66, 0, 0, 0], "STRUCTURE_LAYOUT_3x2": [0, 1, 2, 64, 65, 66, 128, 129, 130] };
var g_table_structure_layoutEdgeTiles = { "_0": [0, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x1": [0, 1, 1, 1, 1, 0, 0, 0], "STRUCTURE_LAYOUT_2x1": [0, 0, 0, 64, 64, 64, 0, 0], "STRUCTURE_LAYOUT_1x2": [0, 1, 1, 65, 65, 64, 64, 0], "STRUCTURE_LAYOUT_2x2": [0, 1, 65, 129, 129, 128, 64, 0], "STRUCTURE_LAYOUT_2x3": [1, 2, 2, 66, 65, 64, 0, 0], "STRUCTURE_LAYOUT_3x2": [1, 2, 66, 130, 129, 128, 64, 0] };
var g_table_structure_layoutTileCount = { "_0": 1, "STRUCTURE_LAYOUT_1x1": 2, "STRUCTURE_LAYOUT_2x1": 2, "STRUCTURE_LAYOUT_1x2": 4, "STRUCTURE_LAYOUT_2x2": 6, "STRUCTURE_LAYOUT_2x3": 6, "STRUCTURE_LAYOUT_3x2": 9 };
var g_table_structure_layoutTileDiff = { "_0": [128, 128], "STRUCTURE_LAYOUT_1x1": [256, 128], "STRUCTURE_LAYOUT_2x1": [128, 256], "STRUCTURE_LAYOUT_1x2": [256, 256], "STRUCTURE_LAYOUT_2x2": [256, 384], "STRUCTURE_LAYOUT_2x3": [640, 256], "STRUCTURE_LAYOUT_3x2": [384, 384] };
var g_table_structure_layoutSize = { "_0": [1, 1], "STRUCTURE_LAYOUT_1x1": [2, 1], "STRUCTURE_LAYOUT_2x1": [1, 2], "STRUCTURE_LAYOUT_1x2": [2, 2], "STRUCTURE_LAYOUT_2x2": [2, 3], "STRUCTURE_LAYOUT_2x3": [3, 2], "STRUCTURE_LAYOUT_3x2": [3, 3] };
var g_table_structure_layoutTilesAround = { "_0": [-64, -63, 1, 65, 64, 63, -1, -65, 0, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x1": [-64, -63, -62, 2, 66, 65, 64, 63, -1, -65, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x1": [-64, -63, 1, 65, 129, 128, 127, 63, -1, -65, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x2": [-64, -63, -62, 2, 66, 130, 129, 128, 127, 63, -1, -65, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x2": [-64, -63, -62, 2, 66, 130, 194, 193, 192, 191, 127, 63, -1, -65, 0, 0], "STRUCTURE_LAYOUT_2x3": [-64, -63, -62, -61, 3, 67, 131, 130, 129, 128, 127, 63, -1, -65, 0, 0], "STRUCTURE_LAYOUT_3x2": [-64, -63, -62, -61, 3, 67, 131, 195, 194, 193, 192, 191, 127, 63, -1, -65] };

// src/engine/tables.ts
function objectInfo(raw) {
  const o = { ...raw };
  o.flags = raw.flags ?? raw._4;
  delete o._4;
  return o;
}
function unitInfoFrom(raw) {
  const [o, indexStart, indexEnd, flags, dimension, movementType, animationSpeed, movingSpeedFactor, turningSpeed, groundSpriteID, turretSpriteID, actionAI, displayMode, destroyedSpriteID, fireDelay, fireDistance, damage, explosionType, bulletType, bulletSound] = raw;
  return {
    o: objectInfo(o),
    indexStart,
    indexEnd,
    flags,
    dimension,
    movementType,
    animationSpeed,
    movingSpeedFactor,
    turningSpeed,
    groundSpriteID,
    turretSpriteID: turretSpriteID & 65535,
    actionAI,
    displayMode,
    destroyedSpriteID,
    fireDelay,
    fireDistance,
    damage,
    explosionType: explosionType & 65535,
    bulletType: bulletType & 255,
    bulletSound
  };
}
function structureInfoFrom(raw) {
  const [o, enterFilter, creditsStorage, powerUsage, layout, iconGroup, animationIndex, buildableUnits, upgradeCampaign] = raw;
  return { o: objectInfo(o), animations: [null, null, null], enterFilter, creditsStorage, powerUsage, layout, iconGroup, animationIndex, buildableUnits, upgradeCampaign };
}
var arr = (v) => Array.isArray(v) ? v : Object.values(v);
var unitInfo = g_table_unitInfo.map(unitInfoFrom);
var structureInfo = g_table_structureInfo.map(structureInfoFrom);
var tableTileDiff = g_table_tilediff.map((row) => row.map(([x, y]) => ({ x, y })));
var layoutTiles = arr(g_table_structure_layoutTiles);
var layoutTileCount = arr(g_table_structure_layoutTileCount);
var layoutTileDiff = arr(g_table_structure_layoutTileDiff).map(([x, y]) => ({ x, y }));
var layoutSize = arr(g_table_structure_layoutSize).map(([width, height]) => ({ width, height }));
var layoutTilesAround = arr(g_table_structure_layoutTilesAround);
var layoutEdgeTiles = arr(g_table_structure_layoutEdgeTiles);
var explosionTable = g_table_explosion;
var iconLandscape = new Int8Array(512).fill(-1);
var animationStructureRubble = g_table_animation_structure[0];
var animationStructureBuild = g_table_animation_structure[1];

// src/gfx/mentat.ts
var MENTAT_ROM = {
  regions: 614744,
  regionColors: 613632,
  regionTiles: 615204,
  ownRegions: 615132,
  ownColors: 614252,
  ownTiles: 624358,
  shapeTiles: 615172,
  shapeCols: 147522,
  shapeRows: 147554,
  remap: 147586,
  mask: 147842,
  portrait: 153908,
  eyes: 153920,
  mouth: 153932,
  eyesOffset: 153944,
  mouthOffset: 153956,
  sprites: 153580,
  font: 1044194,
  buttonFrame: 665596,
  buttonsAccept: 665624,
  buttonsYesNo: 666180,
  mapPalette: 667006,
  mapPaletteLast: 667134,
  facePalette: 666686,
  colorCycle: 667086,
  /** анимация после ПРИНЯТЬ: целевая область ($096050), тайлы областей, цвета спрайтов, масштаб */
  target: 614480,
  baseTileOffsets: 643356,
  ownTileOffsets: 643396,
  pieceLine: 613616,
  targetColors: 613624,
  zoomSteps: 150414,
  /** тексты: вступление дома и таблица миссий (16 байт: брифинг, победа, поражение, совет) */
  houseIntro: 556412,
  missionTexts: 556856
};
var LAYER = 14784;
var ZOOM_BMP = 6400;
var ZOOM_STRIDE = 112;
var MAP_COLS = 33;
var MAP_ROWS = 14;
var MAP_CELL = { col: 6, row: 9 };
var MENTAT_VSCROLL = 24;
var MentatGfx = class {
  constructor(rom) {
    this.rom = rom;
  }
  rom;
  data = /* @__PURE__ */ new Map();
  get b() {
    return this.rom.bytes;
  }
  lcw(addr) {
    let d = this.data.get(`l${addr}`);
    if (!d) {
      d = lcwDecompress(this.b, addr).data;
      this.data.set(`l${addr}`, d);
    }
    return d;
  }
  /** Палитра экрана (64 слова CRAM); с фазой круга — цвета 8–11 строки 2 из $0A2DCE, без неё — как в ROM. */
  paletteWords(house, level, cycle = null) {
    const pal = new Uint16Array(64);
    const map = level === 8 ? MENTAT_ROM.mapPaletteLast : MENTAT_ROM.mapPalette;
    for (let i = 0; i < 32; i++) pal[i] = readU16(this.b, map + i * 2) >> 1 & 1638;
    for (let i = 0; i < 32; i++) pal[32 + i] = readU16(this.b, MENTAT_ROM.facePalette + house * 128 + i * 2);
    if (cycle !== null) for (let i = 0; i < 4; i++) pal[32 + 8 + i] = this.cycleColor(cycle + i);
    return pal;
  }
  /** Цвет круга $0A2DCE (фаза по модулю 4). */
  cycleColor(phase) {
    return readU16(this.b, MENTAT_ROM.colorCycle + (phase * 2 & 6));
  }
  /** Палитра экрана (64 цвета RGBA). */
  palette(house, level, cycle) {
    return toRGBA(this.paletteWords(house, level, cycle));
  }
  /** Два слоя карты (как буфер $FF0000) для дома и уровня. */
  mapLayers(house, level, mask = 1023) {
    const key = `map:${house}:${level}:${mask}`;
    let buf = this.data.get(key);
    if (buf) return buf;
    buf = new Uint8Array(LAYER * 2);
    const R = MENTAT_ROM;
    const s16 = (a) => readU16(this.b, a) << 16 >> 16;
    const blit = (x, y, shape, color, tile, src) => {
      let base = 0;
      if (color > 1) {
        base = LAYER;
        color -= 2;
      }
      const off = base + (y - 48 >> 3) * 1056 + (x - 24 & 504) * 4;
      const cols = s16(R.shapeCols + shape * 2);
      const rows = s16(R.shapeRows + shape * 2);
      let srcOff = tile * 32;
      let a3 = off;
      for (let c = 0; c <= cols; c++) {
        let a4 = a3;
        for (let r = 0; r <= rows; r++) {
          for (let line = 0; line < 8; line++) {
            for (let k = 0; k < 4; k++) {
              let s = this.b[src + srcOff + line * 4 + k];
              if (color) s = this.b[R.remap + s];
              buf[a4 + k] = buf[a4 + k] & this.b[R.mask + s] | s;
            }
            a4 += 4;
          }
          a4 += 1024;
          srcOff += 32;
        }
        a3 += 32;
      }
    };
    const compose = (regions, colors, src) => {
      let tile = 0;
      for (let i = 0; i < 10; i++) {
        let p = readU32(this.b, regions + i * 4);
        let x = s16(p);
        let y = s16(p + 2);
        let shape = s16(p + 4);
        p += 6;
        const color = readU16(this.b, colors + i * 2);
        for (; ; ) {
          if (mask & 1 << 9 - i) blit(x, y, shape, color, tile, src);
          tile += readU16(this.b, R.shapeTiles + shape * 2);
          if (readU32(this.b, p) === 0) break;
          x += s16(p);
          y += s16(p + 2);
          shape = s16(p + 4);
          p += 6;
        }
      }
    };
    compose(R.regions, R.regionColors, R.regionTiles);
    compose(R.ownRegions, readU32(this.b, R.ownColors + house * 4) + level * 20, R.ownTiles);
    this.data.set(key, buf);
    return buf;
  }
  /** Карта целиком (320×224, прозрачный фон), слой 1 под слоем 2, в экранных координатах. */
  map(house, level, pal) {
    const px = new Uint32Array(320 * 224);
    this.drawMap(px, house, level, pal);
    return toCanvas(px, 320, 224);
  }
  /** Нарисовать обе плоскости карты в буфер экрана 320×224. */
  drawMap(px, house, level, pal, mask = 1023, dx = 0) {
    const buf = this.mapLayers(house, level, mask);
    const x0 = MAP_CELL.col * 8 + dx;
    const y0 = MAP_CELL.row * 8 - MENTAT_VSCROLL;
    for (const [layer, line] of [[0, 0], [1, 1]])
      for (let r = 0; r < MAP_ROWS; r++)
        for (let c = 0; c < MAP_COLS; c++)
          blitClipped(buf.subarray(layer * LAYER), line << 13 | r * MAP_COLS + c, pal, px, x0 + c * 8, y0 + r * 8);
  }
  /** Спрайты шаблона $0257EC (41 шт.). */
  sprites() {
    const out = [];
    for (let i = 0; i < 41; i++) {
      const a = MENTAT_ROM.sprites + i * 8;
      const sz = this.b[a + 2];
      out.push({ y: readU16(this.b, a) - 128, w: (sz >> 2 & 3) + 1, h: (sz & 3) + 1, attr: readU16(this.b, a + 4), x: readU16(this.b, a + 6) - 128 });
    }
    return out;
  }
  /** Сдвиг глаз или рта по дому. */
  faceOffset(kind, house) {
    const a = (kind === "eyes" ? MENTAT_ROM.eyesOffset : MENTAT_ROM.mouthOffset) + house * 4;
    return { dx: readU16(this.b, a) << 16 >> 16, dy: readU16(this.b, a + 2) << 16 >> 16 };
  }
  /** VRAM спрайтов экрана: портрет (тайлы $680, $780, $541), шрифт ($460), кадр глаз/рта/кнопок по месту. */
  spriteVram(house) {
    const key = `vram:${house}`;
    let v = this.data.get(key);
    if (!v) {
      v = new Uint8Array(65536);
      const p = this.lcw(readU32(this.b, MENTAT_ROM.portrait + house * 4));
      v.set(p.subarray(0, 4032), 53248);
      v.set(p.subarray(4032, 8064), 61440);
      v.set(p.subarray(8064, 10368), 43040);
      v.set(this.lcw(MENTAT_ROM.font).subarray(0, 4096), 35840);
      this.data.set(key, v);
    }
    return v;
  }
  /** Положить кадр глаз (0–4) или рта (0–4) в VRAM ($B120 / $B360), как DMA $025A98. */
  setFace(vram, house, kind, frame) {
    if (kind === "eyes") vram.set(this.lcw(readU32(this.b, MENTAT_ROM.eyes + house * 4)).subarray(frame * 576, frame * 576 + 576), 45344);
    else vram.set(this.lcw(readU32(this.b, MENTAT_ROM.mouth + house * 4)).subarray(frame * 1120, frame * 1120 + 1120), 45920);
  }
  /** Кнопки: рамка в $B120, ПРИНЯТЬ/СОВЕТ или ДА/НЕТ в $B3A0. */
  setButtons(vram, accept) {
    vram.set(this.lcw(MENTAT_ROM.buttonFrame).subarray(0, 640), 45344);
    vram.set(this.lcw(accept ? MENTAT_ROM.buttonsAccept : MENTAT_ROM.buttonsYesNo).subarray(0, 1280), 45984);
  }
  /** Нарисовать спрайт MD из VRAM (тайлы по столбцам) в буфер экрана. */
  drawSprite(px, vram, s, pal, dx = 0, dy = 0) {
    const hf = (s.attr & 2048) !== 0;
    for (let c = 0; c < s.w; c++)
      for (let r = 0; r < s.h; r++) {
        const tile = (s.attr & 2047) + c * s.h + r;
        const col = hf ? s.w - 1 - c : c;
        const x = s.x + dx + col * 8;
        const y = s.y + dy + r * 8;
        if (x <= -8 || y <= -8 || x >= 320 || y >= 224) continue;
        blitClipped(vram, s.attr & 30720 | tile, pal, px, x, y);
      }
  }
  /** Страница текста в плоскость A с клетки (2, 5), как $025B02: тайл $460 + код, строка 2; '\r' — новая строка, прочие коды рисуются. */
  drawText(px, vram, text, pal) {
    let col = 2;
    let row = 5;
    for (const ch of text) {
      if (ch === 13) {
        row++;
        col = 2;
        continue;
      }
      blitClipped(vram, 2 << 13 | 1120 + ch, pal, px, col * 8, row * 8 - MENTAT_VSCROLL);
      col++;
    }
  }
  /**
   * Разбить текст на страницы ($01FBBA): страница — до '.', '!', '?', '\r' или конца строки, перенос по словам
   * при ширине 36; знак конца остаётся на странице.
   */
  pages(addr, width = 36) {
    const b = this.b;
    const end = (c) => c === 46 || c === 33 || c === 63 || c === 0 || c === 13;
    const out = [];
    let p = addr;
    while (b[p]) {
      let len = 0;
      while (!end(b[p]) && len < width) {
        out.push(b[p++]);
        len++;
        if (b[p] === 10 || b[p] === 13) len = 0;
      }
      if (len >= width) {
        while (b[p] !== 32) {
          p--;
          out.pop();
        }
        p++;
        out.push(13);
      }
      if (end(b[p])) {
        out.push(b[p]);
        if (b[p]) p++;
        out.push(0);
      }
    }
    const pages = [];
    let cur = [];
    for (const c of out) {
      if (c === 0) {
        pages.push(cur);
        cur = [];
      } else cur.push(c);
    }
    if (cur.length) pages.push(cur);
    return pages;
  }
  /** Целевая область уровня ($096050[дом] + уровень·8, слово +6). */
  targetRegion(house, level) {
    return readU16(this.b, readU32(this.b, MENTAT_ROM.target + house * 4) + level * 8 + 6);
  }
  /** Цвет области на уровне (0–3, таблица $095F6C). */
  regionColor(house, level, region) {
    return readU16(this.b, readU32(this.b, MENTAT_ROM.ownColors + house * 4) + level * 20 + region * 2);
  }
  /** Куски области: основа ($096158) или владение ($0962DC); x, y — экран после сдвига карты, tile — от начала области. */
  regionPieces(own, region) {
    const s16 = (a) => readU16(this.b, a) << 16 >> 16;
    let p = readU32(this.b, (own ? MENTAT_ROM.ownRegions : MENTAT_ROM.regions) + region * 4);
    let x = s16(p);
    let y = s16(p + 2);
    let shape = s16(p + 4);
    p += 6;
    let tile = 0;
    const out = [];
    for (; ; ) {
      out.push({ x, y, shape, tile });
      tile += readU16(this.b, MENTAT_ROM.shapeTiles + shape * 2);
      if (readU32(this.b, p) === 0) break;
      x += s16(p);
      y += s16(p + 2);
      shape = s16(p + 4);
      p += 6;
    }
    return out;
  }
  /** Тайлы области в ROM (как DMA $0244CC). */
  regionTiles(own, region) {
    const src = own ? MENTAT_ROM.ownTiles + readU32(this.b, MENTAT_ROM.ownTileOffsets + region * 4) : MENTAT_ROM.regionTiles + readU32(this.b, MENTAT_ROM.baseTileOffsets + region * 4);
    return this.b.subarray(src);
  }
  /** Строка палитры спрайта-области по её цвету ($095CF0: 0, 2, 1, 3). */
  pieceLine(color) {
    return readU16(this.b, MENTAT_ROM.pieceLine + color * 2) >> 13;
  }
  /** Нарисовать область спрайтами (основа поверх владения, как $0245F2) со сдвигом по y. */
  drawRegion(px, region, line, dy, pal) {
    for (const own of [true, false]) {
      const tiles = this.regionTiles(own, region);
      for (const p of this.regionPieces(own, region)) {
        const sz = p.shape;
        this.drawSprite(px, tiles, { x: p.x, y: p.y + dy, w: (sz >> 2 & 3) + 1, h: (sz & 3) + 1, attr: line << 13 | p.tile }, pal);
      }
    }
  }
  /** Палитра $0A2D7E целиком (64 слова). */
  fullPalette() {
    const pal = new Uint16Array(64);
    for (let i = 0; i < 64; i++) pal[i] = readU16(this.b, MENTAT_ROM.mapPalette + i * 2);
    return pal;
  }
  /** Цвета 1–6 строки 0 для целевой области по её цвету ($095CF8), или null для цвета 0. */
  targetColors(color) {
    if (!color) return null;
    const a = MENTAT_ROM.mapPalette + readU16(this.b, MENTAT_ROM.targetColors + color * 2);
    const out = new Uint16Array(6);
    for (let i = 0; i < 6; i++) out[i] = readU16(this.b, a + i * 2);
    return out;
  }
  /**
   * Картинка целевой области ($024A76 + $02435E): байт на точку, строка $70 байт; сначала владение
   * от (0, 0), поверх — основа в том же месте карты; ненулевые точки затирают.
   */
  zoomBitmap(region) {
    const bmp = new Uint8Array(ZOOM_BMP);
    const own = this.regionPieces(true, region);
    const base = this.regionPieces(false, region);
    const put = (isOwn, pieces, ox, oy) => {
      const tiles = this.regionTiles(isOwn, region);
      for (const p of pieces) {
        const cols = readU16(this.b, MENTAT_ROM.shapeCols + p.shape * 2) << 16 >> 16;
        const rows = readU16(this.b, MENTAT_ROM.shapeRows + p.shape * 2) << 16 >> 16;
        let src = p.tile * 32;
        const x0 = p.x - own[0].x + ox & 504;
        const y0 = p.y - own[0].y + oy;
        for (let c = 0; c <= cols; c++)
          for (let r = 0; r <= rows; r++) {
            for (let line = 0; line < 8; line++)
              for (let k = 0; k < 8; k++) {
                const v = tiles[src + line * 4 + (k >> 1)] >> (k & 1 ? 0 : 4) & 15;
                const at = (y0 + r * 8 + line) * ZOOM_STRIDE + x0 + c * 8 + k;
                if (v && at >= 0 && at < ZOOM_BMP) bmp[at] = v;
              }
            src += 32;
          }
      }
    };
    put(true, own, 0, 0);
    put(false, base, 0, 0);
    return bmp;
  }
  /** Шаг масштаба ($024B8E + область·$FC, по 12 байт): сдвиг x/y, шаг 16.16, тайлов в ширину и высоту. */
  zoomStep(region, k) {
    const a = MENTAT_ROM.zoomSteps + region * 252 + k * 12;
    const s16 = (o) => readU16(this.b, a + o) << 16 >> 16;
    return { dx: s16(0), dy: s16(2), step: readU32(this.b, a + 4), w: s16(8), h: s16(10) };
  }
  /** Адрес текста: вступление дома или текст миссии (0 брифинг, 1 победа, 2 поражение, 3 совет). */
  textOf(house, mission, kind = 0) {
    if (mission === null) return readU32(this.b, MENTAT_ROM.houseIntro + house * 4);
    const t = readU32(this.b, MENTAT_ROM.missionTexts + house * 4);
    return readU32(this.b, t + (mission - 1) * 16 + kind * 4);
  }
};
function blitClipped(vram, word, pal, px, x, y) {
  if (x >= 0 && y >= 0 && x <= 312 && y <= 216) {
    blitTile(vram, word, pal, px, 320, x, y);
    return;
  }
  const tmp = new Uint32Array(64);
  blitTile(vram, word, pal, tmp, 8, 0, 0);
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const sx = x + c;
      const sy = y + r;
      if (sx < 0 || sy < 0 || sx >= 320 || sy >= 224 || !tmp[r * 8 + c]) continue;
      px[sy * 320 + sx] = tmp[r * 8 + c];
    }
}
function toRGBA(words) {
  const pal = new Uint32Array(words.length);
  for (let i = 0; i < words.length; i++) pal[i] = cramToRGBA(words[i]);
  return pal;
}
function toCanvas(px, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(px.buffer), w, h), 0, 0);
  return c;
}
export {
  END_ROM,
  MentatGfx,
  explosionTable,
  objectDef
};
