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
  const { tile: tile2, pal, hflip, vflip } = decodeTileWord(word);
  const base = tile2 * 32;
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

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\arrakis-wide.png
var arrakis_wide_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\arrakis-wide.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\settings-wide.png
var settings_wide_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\settings-wide.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\password-wide.png
var password_wide_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\password-wide.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\house-crests.png
var house_crests_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\house-crests.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\sega.png
var sega_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\sega.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\publishers.png
var publishers_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\publishers.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\intro-ships.png
var intro_ships_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\intro-ships.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\victory-hd.png
var victory_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\victory-hd.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\defeat-hd.png
var defeat_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\defeat-hd.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\mentat-atreides-hd.png
var mentat_atreides_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\mentat-atreides-hd.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\mentat-ordos-hd.png
var mentat_ordos_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\mentat-ordos-hd.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\mentat-harkonnen-hd.png
var mentat_harkonnen_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\mentat-harkonnen-hd.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\strategic-relief-hd.png
var strategic_relief_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\strategic-relief-hd.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\operations-console-hd.png
var operations_console_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\operations-console-hd.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\production-console-hd.png
var production_console_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\production-console-hd.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\building-portraits-a.png
var building_portraits_a_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\building-portraits-a.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\building-portraits-b.png
var building_portraits_b_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\building-portraits-b.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\building-portraits-c.png
var building_portraits_c_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\building-portraits-c.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\building-portraits-d.png
var building_portraits_d_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\building-portraits-d.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\building-icons-a.png
var building_icons_a_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\building-icons-a.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\frontend\building-icons-b.png
var building_icons_b_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\frontend\\building-icons-b.png";

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
function menuLayout(canvas) {
  const scale = Math.min(canvas.width / SCREEN_W, canvas.height / SCREEN_H);
  return { scale, x: (canvas.width - SCREEN_W * scale) / 2, y: (canvas.height - SCREEN_H * scale) / 2 };
}
function prepareMenu(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const l = menuLayout(canvas);
  ctx.setTransform(l.scale, 0, 0, l.scale, l.x, l.y);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}
function menuPoint(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const l = menuLayout(canvas);
  return {
    x: ((e.clientX - rect.left) * canvas.width / rect.width - l.x) / l.scale,
    y: ((e.clientY - rect.top) * canvas.height / rect.height - l.y) / l.scale
  };
}
function menuText(ctx, text, x, y, options = {}) {
  ctx.save();
  const size = options.size ?? 8;
  ctx.font = `${options.weight ?? "600"} ${size}px ${options.serif ? 'Georgia, "Times New Roman", serif' : "Arial, sans-serif"}`;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = options.baseline ?? "top";
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
function menuArrow(ctx, x, y, frame) {
  ctx.save();
  ctx.fillStyle = `rgba(255,244,200,${0.65 + 0.35 * Math.sin(frame / 12) ** 2})`;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 1);
  ctx.lineTo(x + 6, y + 4);
  ctx.lineTo(x + 1, y + 7);
  ctx.closePath();
  ctx.fill();
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
function decodeTextCodes(codes) {
  let s = "";
  for (const c of codes) {
    if (c === 13) {
      s += "\n";
      continue;
    }
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
      const put = (tile2, x, y, hflip) => blitTile(tiles, 3 << 13 | (hflip ? 2048 : 0) | tile2, pal, px, 80, x, y);
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

// web/src/ui/endgame.ts
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
  const s162 = (a) => readU16(b, a) << 16 >> 16;
  const n = readU16(b, addr) + 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = addr + 2 + i * 12;
    const size = b[e + 6];
    out.push({ y: s162(e + 4), w: (size >> 2 & 3) + 1, h: (size & 3) + 1, attr: readU16(b, e + 8), x: s162(e + 10) });
  }
  return out;
}
function drawObjSprite(px, w, h, tiles, tileBase, s, x, y, pal, paletteBits = 0) {
  const hf = (s.attr & 2048) !== 0;
  const vf = (s.attr & 4096) !== 0;
  const tmp = new Uint32Array(64);
  for (let c = 0; c < s.w; c++)
    for (let r = 0; r < s.h; r++) {
      const tile2 = (s.attr & 2047) - tileBase + c * s.h + r;
      const col = hf ? s.w - 1 - c : c;
      const row = vf ? s.h - 1 - r : r;
      tmp.fill(0);
      blitTile(tiles, (s.attr | paletteBits) & 30720 | tile2, pal, tmp, 8, 0, 0);
      for (let py = 0; py < 8; py++)
        for (let pxx = 0; pxx < 8; pxx++) {
          const v = tmp[py * 8 + pxx];
          const sx = x + col * 8 + pxx;
          const sy = y + row * 8 + py;
          if (v && sx >= 0 && sy >= 0 && sx < w && sy < h) px[sy * w + sx] = v;
        }
    }
}
function stepColor(c, target) {
  let out = 0;
  for (const [mask, one] of [[14, 2], [224, 32], [3584, 512]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}
var EndPicture = class {
  constructor(rom, art) {
    this.rom = rom;
    this.art = art;
    this.root = document.createElement("section");
    this.root.className = "settings endpicture";
    this.root.setAttribute("role", "dialog");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.lowCanvas.width = SCREEN_W;
    this.lowCanvas.height = SCREEN_H;
    this.lowCtx = this.lowCanvas.getContext("2d");
    this.img = this.lowCtx.createImageData(SCREEN_W, SCREEN_H);
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", () => this.pressed = true);
  }
  rom;
  art;
  root;
  canvas = document.createElement("canvas");
  lowCanvas = document.createElement("canvas");
  lowCtx;
  img;
  px = new Uint32Array(SCREEN_W * SCREEN_H);
  raf = 0;
  last = 0;
  acc = 0;
  done = null;
  result = "won";
  vram = new Uint8Array(0);
  maps = [];
  frame = 0;
  anim = 0;
  animWait = 0;
  textY = 240;
  textWait = 0;
  cram = new Uint16Array(64);
  target = new Uint16Array(64);
  pressed = false;
  get isOpen() {
    return !this.root.hidden;
  }
  open(result, done) {
    const b = this.rom.bytes;
    const R = END_ROM[result];
    this.result = result;
    this.done = done;
    this.root.setAttribute("aria-label", result === "won" ? "\u041F\u043E\u0431\u0435\u0434\u0430" : "\u041F\u043E\u0440\u0430\u0436\u0435\u043D\u0438\u0435");
    this.vram = new Uint8Array(65536);
    R.tiles.forEach((a, i) => this.vram.set(lcwDecompress(b, a).data.subarray(0, 4096), i * 4096));
    this.maps = R.frames.map((a) => lcwDecompress(b, a).data);
    for (let i = 0; i < 64; i++) this.target[i] = readU16(b, R.palette + i * 2);
    for (let i = 0; i < 16; i++) this.target[48 + i] = readU16(b, END_ROM.textPalette + i * 2);
    this.cram.fill(0);
    this.frame = 0;
    this.anim = 0;
    this.animWait = 0;
    this.textY = 240;
    this.textWait = 0;
    this.pressed = false;
    this.root.hidden = false;
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.acc = 0;
    this.loop();
  }
  handlePad(b) {
    if (this.root.hidden) return false;
    if (b === "a" || b === "b" || b === "c" || b === "start") this.pressed = true;
    return true;
  }
  close() {
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }
  /** Для автотестов: прогнать n кадров без своего цикла. */
  stepFrames(n) {
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < n && !this.root.hidden; i++) this.tick();
    if (!this.root.hidden) this.draw();
  }
  loop() {
    const now = performance.now();
    this.acc = Math.min(this.acc + (now - this.last), 250);
    this.last = now;
    while (this.acc >= 1e3 / 60 && !this.root.hidden) {
      this.acc -= 1e3 / 60;
      this.tick();
    }
    if (this.root.hidden) return;
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  }
  tick() {
    this.frame++;
    for (let i = 0; i < 64; i++) if (this.cram[i] !== this.target[i]) this.cram[i] = stepColor(this.cram[i], this.target[i]);
    if (--this.textWait < 0 && this.textY > 176) {
      this.textY--;
      this.textWait = 2;
    }
    if (++this.animWait >= 11) {
      this.animWait = 0;
      this.anim = this.anim + 1 & 3;
    }
    if (this.pressed) {
      this.pressed = false;
      this.close();
      this.done?.();
    }
  }
  draw() {
    const key = this.result === "won" ? "victory" : "defeat";
    if (this.art?.get(key)) {
      const out2 = prepareMenu(this.canvas);
      out2.save();
      out2.globalAlpha = Math.min(1, this.frame / 7);
      this.art.background(out2, key);
      for (let i = 0; i < 32; i++) {
        const t = this.frame / 60;
        const x = (i * 43.7 + t * (2 + i % 5)) % 460 - 70;
        const y2 = 224 - (i * 19.1 + t * (this.result === "lost" ? 9 : 2)) % 180;
        const ember = this.result === "lost" && i % 3 === 0;
        out2.fillStyle = ember ? `rgba(255,177,70,${0.28 + 0.2 * Math.sin(t * 3 + i) ** 2})` : "rgba(247,219,163,.19)";
        out2.beginPath();
        out2.arc(x, y2, ember ? 0.32 : 0.2, 0, Math.PI * 2);
        out2.fill();
      }
      const shade = out2.createLinearGradient(0, 130, 0, 224);
      shade.addColorStop(0, "#0000");
      shade.addColorStop(1, "#080a0fea");
      out2.fillStyle = shade;
      out2.fillRect(-160, 130, 640, 94);
      const y = this.textY;
      menuText(out2, this.result === "won" ? "\u041F\u041E\u0411\u0415\u0414\u0410" : "\u041F\u041E\u0420\u0410\u0416\u0415\u041D\u0418\u0415", 160, y, {
        size: 20,
        align: "center",
        color: this.result === "won" ? "#ffe1a0" : "#f0b29a",
        weight: "700"
      });
      out2.strokeStyle = "#d9b16e99";
      out2.lineWidth = 0.5;
      out2.beginPath();
      out2.moveTo(110, y + 24);
      out2.lineTo(210, y + 24);
      out2.stroke();
      if (y <= 180) menuText(out2, "\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C", 160, 211, { size: 5.2, align: "center", color: "#d5c9b6" });
      out2.restore();
      return;
    }
    const b = this.rom.bytes;
    const R = END_ROM[this.result];
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    const map = this.maps[this.anim];
    for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(this.vram, readU16(map, (cy * 64 + cx) * 2), pal, px, SCREEN_W, cx * 8, cy * 8);
    const tiles = b.subarray(R.text);
    for (const s of objectDef(b, R.textDef)) drawObjSprite(px, SCREEN_W, SCREEN_H, tiles, 1408, s, 128 + s.x, this.textY + s.y, pal);
    new Uint32Array(this.img.data.buffer).set(px);
    this.lowCtx.putImageData(this.img, 0, 0);
    const out = prepareMenu(this.canvas);
    out.drawImage(this.lowCanvas, 0, 0, SCREEN_W, SCREEN_H);
  }
};
var Flyby = class {
  constructor(rom, vehicles) {
    this.rom = rom;
    this.vehicles = vehicles;
    this.canvas.className = "flyby";
    this.canvas.setAttribute("aria-hidden", "true");
    this.g = this.canvas.getContext("2d");
    this.vram = rom.spriteVram();
    this.palette = rom.gamePalette();
    this.canvas.hidden = true;
  }
  rom;
  vehicles;
  canvas = document.createElement("canvas");
  g;
  sprites = [];
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  line = 0;
  house = 0;
  frame = 0;
  vram;
  palette;
  active = false;
  /** house — номер дома ROM (0 Харконнены, 1 Атрейдесы, 2 Ордосы). */
  start(house) {
    const b = this.rom.bytes;
    const s162 = (a) => readU16(b, a) << 16 >> 16;
    const path = Math.floor(Math.random() * 4);
    this.sprites = objectDef(b, END_ROM.flyDefs[path]);
    this.vx = s162(END_ROM.flyVelocity + path * 4);
    this.vy = s162(END_ROM.flyVelocity + path * 4 + 2);
    this.x = s162(END_ROM.flyStart + path * 4);
    this.y = s162(END_ROM.flyStart + path * 4 + 2);
    this.line = readU16(b, END_ROM.flyLine + house * 2) >> 13;
    this.house = house;
    this.frame = 0;
    this.active = true;
    this.canvas.hidden = false;
  }
  stop() {
    this.active = false;
    this.canvas.hidden = true;
  }
  /** Кадр: сдвиг ($00B544) и отрисовка в холст размером с вид (w×h точек MD). */
  tick(w, h, zoom) {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.frame++;
    const W = Math.ceil(w);
    const H = Math.ceil(h);
    if (this.vehicles) {
      const scale = zoom * Math.max(1, window.devicePixelRatio || 1), pw = Math.ceil(W * scale), ph = Math.ceil(H * scale);
      if (this.canvas.width !== pw || this.canvas.height !== ph) {
        this.canvas.width = pw;
        this.canvas.height = ph;
      }
      this.canvas.style.width = `${W * zoom}px`;
      this.canvas.style.height = `${H * zoom}px`;
      this.g.setTransform(1, 0, 0, 1, 0, 0);
      this.g.clearRect(0, 0, pw, ph);
      this.g.scale(scale, scale);
      const angle = Math.atan2(this.vx, -this.vy) * 128 / Math.PI;
      for (const [i, s] of this.sprites.entries()) this.vehicles.ornithopter(
        this.g,
        (W - SCREEN_W) / 2 + this.x + s.x + s.w * 4,
        (H - SCREEN_H) / 2 + this.y + s.y + s.h * 4,
        angle,
        this.house,
        this.frame,
        i
      );
      return;
    }
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.canvas.style.width = `${W * zoom}px`;
    this.canvas.style.height = `${H * zoom}px`;
    const ox = Math.floor((W - SCREEN_W) / 2);
    const oy = Math.floor((H - SCREEN_H) / 2);
    const px = new Uint32Array(W * H);
    for (const s of this.sprites) drawObjSprite(px, W, H, this.vram, 0, s, ox + this.x + s.x, oy + this.y + s.y, this.palette, this.line << 13);
    this.g.putImageData(new ImageData(new Uint8ClampedArray(px.buffer), W, H), 0, 0);
  }
};

// web/src/ui/score.ts
var SCORE_ROM = {
  pictureTiles: 667264,
  pictures: 158812,
  palette: 679182,
  font: 330804,
  layout: 679310,
  passwordLayout: 758546,
  rankLimits: 682194,
  ranks: 682210,
  finalRank: 682346,
  houseNames: 682365,
  passwords: 557348
};
var cell = (addr) => addr - 57344 >> 1;
function stepColor2(c, target) {
  let out = 0;
  for (const [mask, one] of [[14, 2], [224, 32], [3584, 512]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}
var ScoreScreen = class _ScoreScreen {
  constructor(rom, sound = () => {
  }, art) {
    this.rom = rom;
    this.sound = sound;
    this.art = art;
    this.root = document.createElement("section");
    this.root.className = "settings scorescreen";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "\u0418\u0442\u043E\u0433\u0438 \u043C\u0438\u0441\u0441\u0438\u0438");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d");
    this.img = this.ctx.createImageData(SCREEN_W, SCREEN_H);
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", () => this.held = true);
  }
  rom;
  sound;
  art;
  root;
  canvas = document.createElement("canvas");
  ctx;
  img;
  px = new Uint32Array(SCREEN_W * SCREEN_H);
  raf = 0;
  last = 0;
  acc = 0;
  gen = null;
  done = null;
  vram = new Uint8Array(65536);
  planeA = new Uint16Array(64 * 64);
  planeB = new Uint16Array(64 * 32);
  vscroll = 0;
  cram = new Uint16Array(64);
  held = false;
  stats = null;
  page = "picture";
  rankText = "";
  passwordText = "";
  shownValues = [[0, 0], [0, 0], [0, 0]];
  sliding = false;
  get isOpen() {
    return !this.root.hidden;
  }
  open(stats, done) {
    this.stats = stats;
    this.page = "picture";
    this.shownValues = [[0, 0], [0, 0], [0, 0]];
    this.sliding = false;
    this.done = done;
    this.gen = this.run(stats);
    this.held = false;
    this.root.hidden = false;
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.acc = 0;
    this.loop();
  }
  handlePad(b) {
    if (this.root.hidden) return false;
    if (b === "a" || b === "b" || b === "c" || b === "start") this.held = true;
    return true;
  }
  close() {
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }
  /** Для автотестов: прогнать n кадров без своего цикла. */
  stepFrames(n) {
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < n && !this.root.hidden; i++) this.tick();
    if (!this.root.hidden) this.draw();
  }
  loop() {
    const now = performance.now();
    this.acc = Math.min(this.acc + (now - this.last), 250);
    this.last = now;
    while (this.acc >= 1e3 / 60 && !this.root.hidden) {
      this.acc -= 1e3 / 60;
      this.tick();
    }
    if (this.root.hidden) return;
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  }
  tick() {
    if (this.gen?.next().done) {
      this.close();
      this.done?.();
    }
  }
  /** Ждать A/B/C/Start ($0272CA: нажатая кнопка, маска $E41E = 0 — по удержанию). */
  *waitKey() {
    this.held = false;
    while (!this.held) yield;
    this.held = false;
  }
  /** Палитра к цели или к чёрному, шаг раз в 3 кадра, пока всё не сойдётся ($0006C8, $000628). */
  *fade(target) {
    for (; ; ) {
      let same = 0;
      for (let i = 0; i < 64; i++) {
        const t = target ? target[i] : 0;
        if (this.cram[i] === t) same++;
        else this.cram[i] = stepColor2(this.cram[i], t);
      }
      for (let k = 0; k < 3; k++) yield;
      if (same === 64) return;
    }
  }
  /** Надписи LCW в строки 28…55 плоскости A ($EE00). */
  layout(addr) {
    const map = lcwDecompress(this.rom.bytes, addr).data;
    for (let i = 0; i < 1792; i++) this.planeA[28 * 64 + i] = readU16(map, i * 2);
  }
  /** Число цифрами шрифта ($026D3C): справа налево с последней клетки; pad — с ведущими нулями. */
  number(value, addr, digits, pad = false) {
    let at = cell(addr) + digits - 1;
    let v = value >>> 0;
    this.planeA[at] = 17712 + v % 10;
    for (let i = 1; i < digits; i++) {
      v = Math.floor(v / 10) & 65535;
      if (!pad && v === 0) break;
      at--;
      this.planeA[at] = 17712 + v % 10;
    }
  }
  /** Строка байтов ROM знаками шрифта ($026DB2: тайл $500 + код, строка 2). */
  text(src, len, addr) {
    for (let i = 0; i < len; i++) this.planeA[cell(addr) + i] = 17664 + this.rom.bytes[src + i];
  }
  /** Полоса ($026DEE): целые клетки $17, хвост $18 + длина mod 8. */
  bar(len, addr, base) {
    let at = cell(addr);
    for (let i = 0; i < len >> 3; i++) this.planeA[at++] = base + 23;
    this.planeA[at] = base + 24 + (len & 7);
  }
  /** Въезд страницы снизу ($027026): разгон до середины, торможение до 224. */
  *scrollIn() {
    this.sliding = true;
    let speed = 65536;
    let pos = 0;
    while (pos < 7340032) {
      yield;
      this.vscroll = pos >>> 16;
      speed += 8192;
      pos += speed >= 1048576 ? 1048576 : speed;
    }
    while (pos < 14680064) {
      yield;
      this.vscroll = pos >>> 16;
      speed -= 8192;
      pos += speed <= 65536 ? 65536 : speed;
    }
    yield;
    this.vscroll = 224;
    this.sliding = false;
  }
  /** Строки 28…55 → 0…27, прокрутка 0 ($027120). */
  settle() {
    this.planeA.copyWithin(0, 28 * 64, 56 * 64);
    this.vscroll = 0;
  }
  /** Шаг пары ($0270EE): больший из двух (не больше 65000) / 168 + 1, до 168 — 1. */
  static scale(a, b) {
    const m = Math.max(Math.min(a, 65e3), Math.min(b, 65e3));
    return m <= 168 ? 1 : Math.floor(m / 168) + 1;
  }
  /** Полоса с числом растёт до значения ($026F98). */
  *grow(value, addr, base, step) {
    const row = [62612, 63252, 63892].findIndex((start) => addr === start || addr === start + 128);
    const side = base === 1280 ? 0 : 1;
    let len = 0;
    let shown = 0;
    let n = 0;
    do {
      yield;
      this.bar(len, addr, base);
      len++;
      this.number(shown, addr + 44, 5);
      if (row >= 0) this.shownValues[row][side] = Math.min(value, shown);
      if ((++n & 3) === 0) this.sound(52);
      shown += step;
    } while (value > shown);
    this.number(value, addr + 44, 5);
    if (row >= 0) this.shownValues[row][side] = value;
    for (let i = 0; i < 11; i++) yield;
  }
  *run(s) {
    const b = this.rom.bytes;
    this.vram.fill(0);
    this.planeA.fill(0);
    this.planeB.fill(0);
    this.vscroll = 0;
    this.cram.fill(0);
    for (let i = 0; i < 7; i++) this.vram.set(lcwDecompress(b, readU32(b, SCORE_ROM.pictureTiles + i * 4)).data.subarray(0, 4096), i * 4096);
    const pic = lcwDecompress(b, readU32(b, SCORE_ROM.pictures + s.mission % 3 * 4)).data;
    for (let i = 0; i < 1792; i++) this.planeB[i] = readU16(pic, i * 2);
    const target = new Uint16Array(64);
    for (let i = 0; i < 64; i++) target[i] = readU16(b, SCORE_ROM.palette + i * 2);
    yield* this.fade(target);
    this.vram.set(b.subarray(SCORE_ROM.font, SCORE_ROM.font + 4096), 40960);
    this.layout(SCORE_ROM.layout);
    this.number(s.score, 61330, 5);
    const hours = Math.floor(Math.floor(s.time / 3600) / 60);
    const minutes = Math.floor((s.time - hours * 60 * 3600) / 3600);
    this.number(hours, 61372, 2);
    this.number(minutes, 61378, 2, true);
    let rank = SCORE_ROM.ranks;
    if (s.won && s.mission === 9) rank = SCORE_ROM.finalRank;
    else for (let i = 0; i < 8 && (s.score & 65535) >= readU16(b, SCORE_ROM.rankLimits + i * 2); i++) rank += 17;
    this.text(rank, 17, 61848);
    this.rankText = decodeTextCodes(Array.from(b.subarray(rank, rank + 17))).trim();
    this.page = "stats";
    yield* this.scrollIn();
    const pairs = [
      [s.spice, 62612],
      [s.units, 63252],
      [s.structures, 63892]
    ];
    for (const [[you, them], addr] of pairs) {
      const step = _ScoreScreen.scale(you, them);
      yield* this.grow(you, addr, 1280, step);
      yield* this.grow(them, addr + 128, 9472, step);
    }
    this.settle();
    yield* this.waitKey();
    if (s.won && s.mission < 9) {
      this.layout(SCORE_ROM.passwordLayout);
      const password = readU32(b, SCORE_ROM.passwords + (s.mission - 1) * 24 + s.house * 8);
      this.text(password, 10, 62494);
      this.passwordText = decodeTextCodes(Array.from(b.subarray(password, password + 10))).trim();
      this.page = "password";
      this.text(SCORE_ROM.houseNames + s.house * 9, 9, 61984);
      this.number(s.mission, 62252, 1);
      yield* this.scrollIn();
      yield* this.waitKey();
    }
    yield* this.fade(null);
  }
  draw() {
    if (this.art?.get("arrakis") && this.stats) {
      this.drawHD();
      return;
    }
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(this.vram, this.planeB[cy * 64 + cx], pal, px, SCREEN_W, cx * 8, cy * 8);
    const v = this.vscroll;
    const tile2 = new Uint32Array(64);
    for (let cy = 0; cy < 29; cy++)
      for (let cx = 0; cx < 40; cx++) {
        const sy = cy * 8 - (v & 7);
        const word = this.planeA[((v >> 3) + cy & 63) * 64 + cx];
        if (!(word & 2047)) continue;
        tile2.fill(0);
        blitTile(this.vram, word, pal, tile2, 8, 0, 0);
        for (let r = 0; r < 8; r++) {
          const y = sy + r;
          if (y < 0 || y >= SCREEN_H) continue;
          for (let c = 0; c < 8; c++) if (tile2[r * 8 + c]) px[y * SCREEN_W + cx * 8 + c] = tile2[r * 8 + c];
        }
      }
    new Uint32Array(this.img.data.buffer).set(px);
    this.ctx.putImageData(this.img, 0, 0);
  }
  drawHD() {
    const s = this.stats;
    const out = prepareMenu(this.canvas);
    this.art.background(out, "arrakis");
    out.fillStyle = "#050609ed";
    out.fillRect(-160, -100, 640, 424);
    if (this.page === "picture") return;
    out.save();
    let brightness = 0;
    for (const word of this.cram) brightness = Math.max(brightness, word & 14, word >> 4 & 14, word >> 8 & 14);
    out.globalAlpha = Math.min(1, brightness / 10);
    out.translate(0, this.sliding ? Math.max(0, 224 - this.vscroll) : 0);
    const bezel = this.art.get("operationsConsole");
    if (bezel) out.drawImage(bezel, 0, 5, 320, 320 * bezel.height / bezel.width);
    else {
      out.fillStyle = "#17151b";
      out.fillRect(0, 5, 320, 213);
      out.fillStyle = "#06090b";
      out.fillRect(27, 33, 266, 146);
    }
    const glass = out.createLinearGradient(0, 33, 0, 179);
    glass.addColorStop(0, "#10191b");
    glass.addColorStop(0.5, "#080d10");
    glass.addColorStop(1, "#101318");
    out.fillStyle = glass;
    out.fillRect(28, 34, 264, 144);
    out.strokeStyle = "#d7ba7a13";
    out.lineWidth = 0.15;
    for (let x = 36; x < 288; x += 8) {
      out.beginPath();
      out.moveTo(x, 48);
      out.lineTo(x, 165);
      out.stroke();
    }
    const house = ["\u0425\u0430\u0440\u043A\u043E\u043D\u043D\u0435\u043D\u044B", "\u0410\u0442\u0440\u0435\u0439\u0434\u0435\u0441\u044B", "\u041E\u0440\u0434\u043E\u0441\u044B"][s.house];
    menuText(out, this.page === "password" ? "\u0421\u041B\u0415\u0414\u0423\u042E\u0429\u0410\u042F \u041B\u041E\u041A\u0410\u0426\u0418\u042F" : "\u0418\u0422\u041E\u0413\u0418 \u041E\u041F\u0415\u0420\u0410\u0426\u0418\u0418", 160, 15, { size: 6, align: "center", color: "#171414", weight: "700", shadow: false });
    menuText(out, house.toUpperCase(), 35, 39, { size: 4.1, color: "#c8ba97", weight: "500" });
    menuText(out, `\u041C\u0418\u0421\u0421\u0418\u042F ${s.mission}`, 285, 39, { size: 4.1, align: "right", color: "#c8ba97", weight: "500" });
    out.fillStyle = "#b6975955";
    out.fillRect(35, 47, 250, 0.2);
    if (this.page === "password") {
      menuText(out, `\u041C\u0418\u0421\u0421\u0418\u042F ${s.mission + 1}`, 160, 63, { size: 8.5, align: "center", color: "#e7d6ae" });
      menuText(out, "\u041A\u041E\u0414 \u0414\u041E\u0421\u0422\u0423\u041F\u0410", 160, 85, { size: 4.1, align: "center", color: "#c4a976", weight: "500" });
      out.fillStyle = "#030607";
      out.fillRect(45, 97, 230, 31);
      out.strokeStyle = "#80633a";
      out.lineWidth = 0.4;
      out.strokeRect(45, 97, 230, 31);
      out.strokeStyle = "#dec282";
      out.lineWidth = 0.55;
      out.beginPath();
      for (const [x, dx] of [[45, 1], [275, -1]]) for (const [y, dy] of [[97, 1], [128, -1]]) {
        out.moveTo(x, y + dy * 4);
        out.lineTo(x, y);
        out.lineTo(x + dx * 5, y);
      }
      out.stroke();
      out.save();
      out.font = "600 12px Consolas, monospace";
      out.textAlign = "center";
      out.textBaseline = "middle";
      out.fillStyle = "#ffda8b";
      out.shadowColor = "#d58529";
      out.shadowBlur = 2;
      out.fillText(this.passwordText, 160, 113, 215);
      out.restore();
      menuText(out, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C \u0434\u043B\u044F \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0435\u043D\u0438\u044F \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438", 160, 143, { size: 4.7, align: "center", color: "#c8bfa9", weight: "500" });
    } else {
      const minutes = Math.floor(s.time / 3600);
      const duration = `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
      menuText(out, "\u041E\u0427\u041A\u0418", 35, 54, { size: 3.7, color: "#a9a28e", weight: "500" });
      menuText(out, String(s.score), 35, 60, { size: 10, color: "#ffdf9c" });
      menuText(out, `\u0412\u0420\u0415\u041C\u042F  ${duration}`, 285, 55, { size: 5, align: "right", color: "#d6c9ac" });
      menuText(out, this.rankText, 285, 65, { size: 4.5, align: "right", color: "#d6a854" });
      const rows = [{ label: "\u0414\u043E\u0431\u044B\u0442\u043E \u0441\u043F\u0430\u0439\u0441\u0430", values: s.spice }, { label: "\u0423\u043D\u0438\u0447\u0442\u043E\u0436\u0435\u043D\u043E \u0432\u043E\u0439\u0441\u043A", values: s.units }, { label: "\u0423\u043D\u0438\u0447\u0442\u043E\u0436\u0435\u043D\u043E \u043F\u043E\u0441\u0442\u0440\u043E\u0435\u043A", values: s.structures }];
      rows.forEach((row, i) => {
        const y = 81 + i * 28;
        menuText(out, row.label.toUpperCase(), 35, y, { size: 4.4, color: "#c9c2ae", weight: "500" });
        const maximum = Math.max(1, ...row.values);
        for (let side = 0; side < 2; side++) {
          const by = y + 8 + side * 6.5;
          menuText(out, side ? "\u0412\u0440\u0430\u0433" : "\u0412\u044B", 35, by, { size: 3.7, color: "#aaa995", weight: "500" });
          out.fillStyle = "#010405";
          out.fillRect(55, by + 0.5, 202, 3.6);
          out.strokeStyle = "#7b74514d";
          out.lineWidth = 0.15;
          out.strokeRect(55, by + 0.5, 202, 3.6);
          const width = 202 * this.shownValues[i][side] / maximum;
          if (width > 0) {
            const colors = [["#e84e30", "#791f18"], ["#3c86ff", "#164398"], ["#70ac51", "#315e32"]][s.house];
            const fill = out.createLinearGradient(0, by + 0.5, 0, by + 4.1);
            fill.addColorStop(0, side ? "#e0784e" : colors[0]);
            fill.addColorStop(0.3, side ? "#aa4430" : colors[0]);
            fill.addColorStop(1, side ? "#51201c" : colors[1]);
            out.fillStyle = fill;
            out.fillRect(55, by + 0.7, width, 3.2);
            out.fillStyle = "#ffffff37";
            out.fillRect(55, by + 0.7, width, 0.35);
            out.fillStyle = "#02050766";
            for (let x = 60; x < 55 + width; x += 5) out.fillRect(x, by + 0.7, 0.35, 3.2);
          }
          menuText(out, String(this.shownValues[i][side]), 285, by, { size: 4.1, align: "right", color: "#e7d8b8" });
        }
      });
    }
    menuText(out, "\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C", 160, 169, { size: 3.8, align: "center", color: "#b4a68c", weight: "500" });
    out.restore();
  }
};

// web/src/gfx/mentat.ts
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
    const s162 = (a) => readU16(this.b, a) << 16 >> 16;
    const blit = (x, y, shape, color, tile2, src) => {
      let base = 0;
      if (color > 1) {
        base = LAYER;
        color -= 2;
      }
      const off = base + (y - 48 >> 3) * 1056 + (x - 24 & 504) * 4;
      const cols = s162(R.shapeCols + shape * 2);
      const rows = s162(R.shapeRows + shape * 2);
      let srcOff = tile2 * 32;
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
      let tile2 = 0;
      for (let i = 0; i < 10; i++) {
        let p = readU32(this.b, regions + i * 4);
        let x = s162(p);
        let y = s162(p + 2);
        let shape = s162(p + 4);
        p += 6;
        const color = readU16(this.b, colors + i * 2);
        for (; ; ) {
          if (mask & 1 << 9 - i) blit(x, y, shape, color, tile2, src);
          tile2 += readU16(this.b, R.shapeTiles + shape * 2);
          if (readU32(this.b, p) === 0) break;
          x += s162(p);
          y += s162(p + 2);
          shape = s162(p + 4);
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
    return toCanvas2(px, 320, 224);
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
        const tile2 = (s.attr & 2047) + c * s.h + r;
        const col = hf ? s.w - 1 - c : c;
        const x = s.x + dx + col * 8;
        const y = s.y + dy + r * 8;
        if (x <= -8 || y <= -8 || x >= 320 || y >= 224) continue;
        blitClipped(vram, s.attr & 30720 | tile2, pal, px, x, y);
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
    const s162 = (a) => readU16(this.b, a) << 16 >> 16;
    let p = readU32(this.b, (own ? MENTAT_ROM.ownRegions : MENTAT_ROM.regions) + region * 4);
    let x = s162(p);
    let y = s162(p + 2);
    let shape = s162(p + 4);
    p += 6;
    let tile2 = 0;
    const out = [];
    for (; ; ) {
      out.push({ x, y, shape, tile: tile2 });
      tile2 += readU16(this.b, MENTAT_ROM.shapeTiles + shape * 2);
      if (readU32(this.b, p) === 0) break;
      x += s162(p);
      y += s162(p + 2);
      shape = s162(p + 4);
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
    const s162 = (o) => readU16(this.b, a + o) << 16 >> 16;
    return { dx: s162(0), dy: s162(2), step: readU32(this.b, a + 4), w: s162(8), h: s162(10) };
  }
  /** Адрес текста: вступление дома или текст миссии (0 брифинг, 1 победа, 2 поражение, 3 совет). */
  textOf(house, mission, kind = 0) {
    if (mission === null) return readU32(this.b, MENTAT_ROM.houseIntro + house * 4);
    const t = readU32(this.b, MENTAT_ROM.missionTexts + house * 4);
    return readU32(this.b, t + (mission - 1) * 16 + kind * 4);
  }
};
function zoomTiles(bmp, out, step, w, h) {
  const int = step >>> 16;
  const frac = step & 65535;
  let row = 0;
  let rowFrac = 0;
  for (let ty = 0; ty < h; ty++)
    for (let line = 0; line < 8; line++) {
      const base = row * ZOOM_STRIDE;
      let x = 0;
      let xf = 0;
      const px = (ty * 8 + line) * MAP_COLS * 8;
      for (let tx = 0; tx < w; tx++)
        for (let k = 0; k < 8; k++) {
          const at = base + x;
          out[px + tx * 8 + k] = at < ZOOM_BMP ? bmp[at] : 0;
          if (k === 4) x = x + int & 65535;
          else {
            xf += frac;
            x = x + int + (xf >>> 16) & 65535;
            xf &= 65535;
          }
        }
      rowFrac += frac;
      row += int + (rowFrac >>> 16);
      rowFrac &= 65535;
    }
}
function drawZoom(px, img, pal, hs, vs) {
  const x0 = MAP_CELL.col * 8 + hs;
  const y0 = MAP_CELL.row * 8 - vs;
  const W = MAP_COLS * 8;
  for (let y = 0; y < MAP_ROWS * 8; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= 224) continue;
    for (let x = 0; x < W; x++) {
      const v = img[y * W + x];
      const sx = x0 + x;
      if (v && sx >= 0 && sx < 320) px[sy * 320 + sx] = pal[v];
    }
  }
}
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
function toCanvas2(px, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(px.buffer), w, h), 0, 0);
  return c;
}

// web/src/gfx/mentat-portrait.ts
var patches = /* @__PURE__ */ new WeakMap();
function drawMentatPortrait(ctx, image, house, offset, mouth, blink) {
  const sw = image.width / 2, sh = image.height / 2;
  const x = offset, y = 74, w = 145, h = 150;
  const draw = (frame) => ctx.drawImage(image, frame % 2 * sw, Math.floor(frame / 2) * sh, sw, sh, x, y, w, h);
  draw(0);
  const face = house === 2 ? { x: 0.39, eyes: 0.34, mouth: 0.505 } : house === 0 ? { x: 0.54, eyes: 0.285, mouth: 0.45 } : { x: 0.51, eyes: 0.315, mouth: 0.48 };
  const patch = (frame, cy, rx, ry) => {
    let cache = patches.get(image);
    if (!cache) {
      cache = /* @__PURE__ */ new Map();
      patches.set(image, cache);
    }
    const key = `${house}:${frame}:${cy}`;
    let cell2 = cache.get(key);
    if (!cell2) {
      cell2 = document.createElement("canvas");
      cell2.width = 192;
      cell2.height = 128;
      const g = cell2.getContext("2d");
      g.drawImage(
        image,
        (frame % 2 + face.x - rx) * sw,
        (Math.floor(frame / 2) + cy - ry) * sh,
        rx * 2 * sw,
        ry * 2 * sh,
        0,
        0,
        192,
        128
      );
      g.globalCompositeOperation = "destination-in";
      g.translate(96, 64);
      g.scale(96, 64);
      const fade = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      fade.addColorStop(0, "#fff");
      fade.addColorStop(0.55, "#fff");
      fade.addColorStop(1, "#fff0");
      g.fillStyle = fade;
      g.fillRect(-1, -1, 2, 2);
      cache.set(key, cell2);
    }
    ctx.drawImage(cell2, x + w * (face.x - rx), y + h * (cy - ry), w * rx * 2, h * ry * 2);
  };
  if (mouth !== 0) patch(mouth > 2 ? 3 : 1, face.mouth, 0.105, 0.065);
  if (blink) patch(2, face.eyes, 0.16, 0.05);
}

// web/src/gfx/mentat-motion.ts
var MentatMotion = class {
  constructor(house = "harkonnen") {
    this.house = house;
  }
  house;
  video = null;
  poster = null;
  prepared = false;
  failed = false;
  blocked = false;
  wanted = false;
  pending = false;
  played = false;
  prepare() {
    if (this.prepared) return;
    this.prepared = true;
    const video = document.createElement("video");
    if (typeof video.play !== "function") return;
    const base = import.meta.env?.BASE_URL ?? "/";
    const prefix = base.endsWith("/") ? base : base + "/";
    video.src = prefix + `video/mentat-${this.house}-alpha.webm`;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.disablePictureInPicture = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.addEventListener("error", () => {
      this.failed = true;
    });
    this.video = video;
    void fetch(prefix + `video/mentat-${this.house}-idle.png`).then((response) => {
      if (!response.ok) throw Error("Mentat poster HTTP " + response.status);
      return response.blob();
    }).then((blob) => createImageBitmap(blob)).then((image) => {
      this.poster = image;
    }).catch((error) => {
      console.warn("Video portrait unavailable; retaining the illustrated mentat.", error);
    });
  }
  stop() {
    this.wanted = false;
    this.played = false;
    this.blocked = false;
    this.video?.pause();
    if (this.video && this.video.readyState >= 1) this.video.currentTime = 0;
  }
  draw(ctx, offset, speaking) {
    this.prepare();
    const video = this.video;
    if (speaking !== this.wanted) {
      this.wanted = speaking;
      if (speaking) this.blocked = false;
      if (!speaking) video?.pause();
    }
    if (speaking && video && !this.failed && !this.blocked && video.paused && !this.pending) {
      this.pending = true;
      void video.play().then(() => {
        this.pending = false;
        this.played = true;
        if (!this.wanted) video.pause();
      }).catch(() => {
        this.pending = false;
        this.blocked = this.wanted;
      });
    }
    const ready = !!video && video.readyState >= 2 && !video.seeking && !this.failed;
    const w = 180, h = w * 384 / 512, y = 224 - h, x = offset - 10;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (ready && this.played) ctx.drawImage(video, x, y, w, h);
    else if (this.poster) ctx.drawImage(this.poster, x, y, w, h);
    ctx.restore();
    return !!this.poster || ready && this.played;
  }
};

// web/src/gfx/campaign-zoom.ts
var CampaignZoom = class {
  frames;
  poses;
  constructor(hs, vs, steps, frames) {
    this.frames = [0, ...frames];
    this.poses = [{ hs, vs, scale: 1 }];
    frames.forEach((_, i) => {
      hs -= steps[i + 1].dx;
      vs -= steps[i + 1].dy;
      this.poses.push({ hs, vs, scale: 65536 / Math.max(1, steps[i].step) });
    });
  }
  sample(frame) {
    const times = this.frames, poses = this.poses;
    if (frame <= 0) return { ...poses[0] };
    if (frame >= times[times.length - 1]) return { ...poses[poses.length - 1] };
    let i = 0;
    while (frame > times[i + 1]) i++;
    const span = times[i + 1] - times[i], t = (frame - times[i]) / span;
    const value = (key) => {
      const slope = (j) => (poses[j + 1][key] - poses[j][key]) / (times[j + 1] - times[j]);
      const tangent = (j) => {
        if (j === 0) return slope(0);
        if (j === poses.length - 1) return slope(j - 1);
        const a = slope(j - 1), b = slope(j);
        if (a * b <= 0) return 0;
        const prev = times[j] - times[j - 1], next = times[j + 1] - times[j];
        const w1 = 2 * next + prev, w2 = next + 2 * prev;
        return (w1 + w2) / (w1 / a + w2 / b);
      };
      return (2 * t ** 3 - 3 * t * t + 1) * poses[i][key] + (t ** 3 - 2 * t * t + t) * span * tangent(i) + (-2 * t ** 3 + 3 * t * t) * poses[i + 1][key] + (t ** 3 - t * t) * span * tangent(i + 1);
    };
    return { hs: value("hs"), vs: value("vs"), scale: value("scale") };
  }
};

// web/src/gfx/strategic-map-art.ts
var TERRITORY_COLORS = ["#c49a56", "#df4432", "#2465ed", "#2aa34b"];
var StrategicMapArt = class {
  constructor(gfx, art) {
    this.gfx = gfx;
    this.art = art;
  }
  gfx;
  art;
  scene = "";
  regions = /* @__PURE__ */ new Map();
  surfaces = /* @__PURE__ */ new Map();
  get ready() {
    return !!this.art?.get("strategicSurface");
  }
  /** Preserve the authored directional light instead of flattening it with a soft-light tint. */
  relief(owner) {
    const cached = this.surfaces.get(owner);
    if (cached) return cached;
    const source = this.art.get("strategicSurface"), c = document.createElement("canvas");
    c.width = source.width;
    c.height = source.height;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(source, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height), p = im.data;
    const hex = TERRITORY_COLORS[owner] ?? TERRITORY_COLORS[0];
    const base = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (let i = 0; i < p.length; i += 4) {
      const light = (p[i] * 0.2126 + p[i + 1] * 0.7152 + p[i + 2] * 0.0722) / 255;
      const q = Math.max(0, Math.min(1, (light - 0.12) / 0.7));
      const shade = 0.2 + 1.1 * Math.pow(q, 0.65);
      const glint = Math.max(0, (q - 0.68) / 0.32) * 0.15;
      p[i] = Math.min(255, base[0] * shade + 255 * glint);
      p[i + 1] = Math.min(255, base[1] * shade + 242 * glint);
      p[i + 2] = Math.min(255, base[2] * shade + 215 * glint);
    }
    g.putImageData(im, 0, 0);
    this.surfaces.set(owner, c);
    return c;
  }
  region(house, level, region) {
    const scene = `${house}:${level}`;
    if (scene !== this.scene) {
      this.regions.clear();
      this.scene = scene;
    }
    const cached = this.regions.get(region);
    if (cached) return cached;
    const palette = this.gfx.palette(house, level, 0);
    const pixels = new Uint32Array(320 * 224);
    this.gfx.drawRegion(pixels, region, this.gfx.pieceLine(this.gfx.regionColor(house, level, region)), 0, palette);
    const bounds = (data) => {
      let x0 = 320, y0 = 224, x1 = 0, y1 = 0;
      for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) if (data[y * 320 + x] !== 0) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    };
    const box = bounds(pixels);
    const mapPixels = new Uint32Array(pixels.length);
    this.gfx.drawMap(mapPixels, house, level, palette, 1 << 9 - region);
    const mapBox = bounds(mapPixels);
    const w = box.w, h = box.h;
    const outside = new Uint8Array(w * h), queue = [];
    const visit = (x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const p = y * w + x;
      if (outside[p] || pixels[(y + box.y) * 320 + x + box.x] !== 0) return;
      outside[p] = 1;
      queue.push(p);
    };
    for (let x = 0; x < w; x++) {
      visit(x, 0);
      visit(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      visit(0, y);
      visit(w - 1, y);
    }
    for (let i = 0; i < queue.length; i++) {
      const x = queue[i] % w, y = Math.floor(queue[i] / w);
      visit(x - 1, y);
      visit(x + 1, y);
      visit(x, y - 1);
      visit(x, y + 1);
    }
    const mask = document.createElement("canvas");
    mask.width = w;
    mask.height = h;
    const mg = mask.getContext("2d"), im = mg.createImageData(w, h);
    for (let p = 0; p < outside.length; p++) if (!outside[p]) {
      im.data[p * 4] = im.data[p * 4 + 1] = im.data[p * 4 + 2] = im.data[p * 4 + 3] = 255;
    }
    mg.putImageData(im, 0, 0);
    const image = document.createElement("canvas");
    image.width = w * 5;
    image.height = h * 5;
    const g = image.getContext("2d");
    g.scale(5, 5);
    g.imageSmoothingEnabled = true;
    const owner = this.gfx.regionColor(house, level, region);
    g.drawImage(this.relief(owner), -box.x, -box.y, 320, 224);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = "#070d16";
    g.lineWidth = 0.8;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!outside[y * w + x]) {
      if (!y || outside[(y - 1) * w + x]) {
        g.moveTo(x, y);
        g.lineTo(x + 1, y);
      }
      if (y === h - 1 || outside[(y + 1) * w + x]) {
        g.moveTo(x, y + 1);
        g.lineTo(x + 1, y + 1);
      }
      if (!x || outside[y * w + x - 1]) {
        g.moveTo(x, y);
        g.lineTo(x, y + 1);
      }
      if (x === w - 1 || outside[y * w + x + 1]) {
        g.moveTo(x + 1, y);
        g.lineTo(x + 1, y + 1);
      }
    }
    g.stroke();
    g.strokeStyle = "#dde9f3aa";
    g.lineWidth = 0.18;
    g.stroke();
    const depth = document.createElement("canvas");
    depth.width = (w + 2) * 5;
    depth.height = (h + 4) * 5;
    const dg = depth.getContext("2d");
    dg.scale(5, 5);
    const side = document.createElement("canvas");
    side.width = w;
    side.height = h;
    const sg = side.getContext("2d");
    const hex = TERRITORY_COLORS[owner] ?? TERRITORY_COLORS[0];
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (let y = 3.5; y >= 0.5; y -= 0.5) {
      sg.clearRect(0, 0, w, h);
      sg.globalCompositeOperation = "source-over";
      sg.drawImage(mask, 0, 0);
      sg.globalCompositeOperation = "source-in";
      const shade = 0.18 + (3.5 - y) * 0.035;
      sg.fillStyle = `rgb(${rgb.map((c) => Math.round(c * shade)).join(",")})`;
      sg.fillRect(0, 0, w, h);
      dg.drawImage(side, y * 0.24, y);
    }
    const result = { image, depth, ...box, mapDx: mapBox.x - box.x, mapDy: mapBox.y - box.y };
    this.regions.set(region, result);
    return result;
  }
  backdrop(ctx, full) {
    const glow = ctx.createRadialGradient(176, 110, 12, 176, 110, 190);
    glow.addColorStop(0, "#15222c");
    glow.addColorStop(1, "#030609");
    ctx.fillStyle = glow;
    ctx.fillRect(-160, -100, 640, 424);
    ctx.save();
    ctx.strokeStyle = "#6f9fae12";
    ctx.lineWidth = 0.2;
    for (let x = 32; x < 320; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 24);
      ctx.lineTo(x, 194);
      ctx.stroke();
    }
    for (let y = 24; y < 194; y += 16) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(312, y);
      ctx.stroke();
    }
    if (full) {
      menuText(ctx, "\u0410\u0420\u0420\u0410\u041A\u0418\u0421  /  \u041A\u0410\u0420\u0422\u0410 \u041A\u0410\u041C\u041F\u0410\u041D\u0418\u0418", 160, 10, { size: 5, align: "center", color: "#b9bdad", weight: "500" });
      const names = ["\u041D\u0415\u0419\u0422\u0420\u0410\u041B\u042C\u041D\u041E", "\u0425\u0410\u0420\u041A\u041E\u041D\u041D\u0415\u041D\u042B", "\u0410\u0422\u0420\u0415\u0419\u0414\u0415\u0421\u042B", "\u041E\u0420\u0414\u041E\u0421\u042B"];
      names.forEach((name, i) => {
        const x = 27 + i * 72;
        ctx.fillStyle = TERRITORY_COLORS[i];
        ctx.fillRect(x, 205, 2, 2);
        menuText(ctx, name, x + 5, 204.5, { size: 3.5, color: "#bdc9d0", weight: "500" });
      });
    }
    ctx.restore();
  }
  draw(ctx, house, level, region, dx = 0, dy = 0, sprite = false) {
    const r = this.region(house, level, region);
    const x = r.x + dx + (sprite ? 0 : r.mapDx), y = r.y + dy + (sprite ? 0 : r.mapDy);
    ctx.drawImage(r.depth, x, y, r.w + 2, r.h + 4);
    ctx.drawImage(r.image, x, y, r.w, r.h);
  }
  zoom(ctx, house, level, region, hs, vs, scale) {
    const r = this.region(house, level, region), own = this.gfx.regionPieces(true, region)[0];
    const x = 48 + hs + (r.x - own.x) * scale, y = 72 - vs + (r.y - own.y) * scale;
    ctx.drawImage(r.depth, x, y, (r.w + 2) * scale, (r.h + 4) * scale);
    ctx.drawImage(r.image, x, y, r.w * scale, r.h * scale);
  }
};

// web/src/sound/psg.ts
var VOLUME = Array.from({ length: 16 }, (_, i) => i === 15 ? 0 : Math.pow(10, -2 * i / 20));

// web/src/sound/ym2612.ts
var SIN_TABLE = new Uint16Array(256);
var POW_TABLE = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  SIN_TABLE[i] = Math.round(-Math.log2(Math.sin((2 * i + 1) * Math.PI / 1024)) * 256);
  POW_TABLE[i] = Math.round(Math.pow(2, -(i + 1) / 256) * 2048);
}
var INC_TABLE = (() => {
  const rows = [269488144, 269553680, 286265616, 286331152];
  const t = new Uint32Array(64);
  t[0] = t[1] = 0;
  t[2] = t[3] = t[4] = t[5] = 269488144;
  t[6] = t[7] = 286265616;
  for (let r = 8; r < 48; r++) t[r] = rows[r & 3];
  const tail = [286331153, 554770705, 555819297, 572596769, 572662306, 1109541410, 1111638594, 1145193538, 1145324612, 2219082820, 2223277188, 2290387076, 2290649224, 2290649224, 2290649224, 2290649224];
  for (let r = 48; r < 64; r++) t[r] = tail[r - 48];
  return t;
})();
var alg = (o2, o3, o4, out1, out2, out3) => o2 | o3 << 1 | o4 << 4 | out1 << 7 | out2 << 8 | out3 << 9;
var ALGORITHMS = [alg(1, 2, 3, 0, 0, 0), alg(0, 5, 3, 0, 0, 0), alg(0, 2, 6, 0, 0, 0), alg(1, 0, 7, 0, 0, 0), alg(1, 0, 3, 0, 1, 0), alg(1, 1, 1, 0, 1, 1), alg(1, 0, 0, 0, 1, 1), alg(0, 0, 0, 1, 1, 1)];

// web/src/sound/z80.ts
var FPV = 4;
var F3 = 8;
var F5 = 32;
var FZ = 64;
var SZ = new Uint8Array(256);
var SZP = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  SZ[i] = i & 128 | (i === 0 ? FZ : 0) | i & (F3 | F5);
  let p = i;
  p ^= p >> 4;
  p ^= p >> 2;
  p ^= p >> 1;
  SZP[i] = SZ[i] | ((p & 1) === 0 ? FPV : 0);
}

// web/src/sound/gems.ts
var FM_RATE = 7670453 / 144;
var FRAME_CYCLES = 262 * 228;

// web/src/sound/sound.ts
var MUSIC = {
  STOP: 0,
  /** боевые: случайная из 8…12 ($021574) */
  BATTLE_FIRST: 8,
  HOUSE_SELECT: 28,
  /** ментат: по дому — Харконнены $18, Атрейдесы $19, Ордосы $1A ($01F366) */
  MENTAT: [24, 25, 26],
  ACCEPT: 29,
  /** победа по дому игрока и поражение ($026952, $026B56) */
  WIN: [6, 7, 5],
  LOSE: [3, 4, 2]
};

// web/src/ui/mentat.ts
var HOUSE_INDEX = { H: 0, A: 1, O: 2 };
var FADE_FRAMES = 3;
var CYCLE_FRAMES = 8;
var EYES = [9, 10];
var MOUTH = [11, 12, 13, 14];
var BUTTON_TOP = 168;
var BUTTON_BOTTOM = 192;
var RECOMPOSE = [0, 9, 13, 15, 15, 17, 18, 21, 24, 27];
var ZOOM_FRAMES = [8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 64, 71, 79, 88, 98];
function rnd(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
function stepColor3(c, target) {
  let out = 0;
  for (const [mask, one] of [[14, 2], [224, 32], [3584, 512]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}
var MentatScreen = class {
  constructor(rom, sound = null, art) {
    this.sound = sound;
    this.art = art;
    this.gfx = new MentatGfx(rom);
    this.strategic = new StrategicMapArt(this.gfx, art);
    this.root = document.createElement("section");
    this.root.className = "settings mentat";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "\u041C\u0435\u043D\u0442\u0430\u0442");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d");
    this.img = this.ctx.createImageData(SCREEN_W, SCREEN_H);
    this.lowCanvas.width = SCREEN_W;
    this.lowCanvas.height = SCREEN_H;
    this.lowCtx = this.lowCanvas.getContext("2d");
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", (e) => this.onClick(e));
  }
  sound;
  art;
  root;
  canvas = document.createElement("canvas");
  ctx;
  gfx;
  strategic;
  hdZoom = null;
  hdZoomStarted = 0;
  px = new Uint32Array(SCREEN_W * SCREEN_H);
  img;
  lowCanvas = document.createElement("canvas");
  lowCtx;
  raf = 0;
  last = 0;
  acc = 0;
  scene;
  done = null;
  house = 0;
  vram = new Uint8Array(0);
  voiceAudio = null;
  syncChoiceVoice = false;
  voicePlan = [];
  voicePlanIndex = 0;
  playVoice(src) {
    this.stopVoice(false);
    try {
      const a = new Audio(src);
      a.volume = 1;
      this.sound?.setVoiceDucking(true);
      a.play().catch(() => {
        if (this.voiceAudio === a) {
          this.stopVoice();
          this.syncChoiceVoice = false;
        }
      });
      this.voiceAudio = a;
    } catch {
    }
  }
  stopVoice(restoreMusic = true) {
    if (this.voiceAudio) {
      try {
        this.voiceAudio.pause();
        this.voiceAudio.currentTime = 0;
      } catch {
      }
      this.voiceAudio = null;
    }
    if (restoreMusic) this.sound?.setVoiceDucking(false);
  }
  sprites = [];
  phase = "idle";
  /** счётчик кадров ($E01A) */
  timer = 0;
  cycle = 0;
  cycleWait = 0;
  /** цвета в CRAM, тень палитры ($E2B4, по ней идёт затемнение) и цель проявления */
  cram = new Uint16Array(64);
  shadow = new Uint16Array(64);
  target = new Uint16Array(64);
  fadeWait = 0;
  pressed = false;
  choice = 0;
  // текст ($01F9DA)
  pages = [];
  page = [];
  state = 1;
  talk = 2;
  remaining = 0;
  shown = 0;
  wait = 0;
  talkUntil = 0;
  talkTime = 0;
  lastPage = false;
  // лицо ($01F626): глаза — текущий, следующий, таймер; рот — кадр, таймер
  eyes = 0;
  eyesNext = 0;
  eyesAt = 0;
  mouth = 0;
  mouthAt = 0;
  faceHidden = false;
  // уход после ПРИНЯТЬ
  leaveGen = null;
  planeDx = 0;
  portraitDx = 0;
  portraitGone = false;
  motion = new MentatMotion();
  atreidesMotion = new MentatMotion("atreides");
  ordosMotion = new MentatMotion("ordos");
  mapMask = 1023;
  slots = [null, null, null, null];
  physics = false;
  cycling = true;
  zoomImg = null;
  zoomHs = 0;
  zoomVs = 0;
  // кнопки ($025BB8)
  buttonY = BUTTON_TOP;
  buttonMove = 0;
  buttonStep = 0;
  get isOpen() {
    return !this.root.hidden;
  }
  /** Адрес текста: вступление дома (mission = null) или миссии (0 брифинг, 1 победа, 2 поражение, 3 совет). */
  text(house, mission, kind = 0) {
    return this.gfx.textOf(HOUSE_INDEX[house], mission, kind);
  }
  /** Показать сцену; done(0 — ДА/ПРИНЯТЬ или любая кнопка, 1 — НЕТ/СОВЕТ). */
  open(scene, done) {
    this.motion.stop();
    this.atreidesMotion.stop();
    this.ordosMotion.stop();
    this.stopVoice();
    this.scene = scene;
    this.done = done;
    this.house = HOUSE_INDEX[scene.house];
    if (this.house === 0) this.motion.prepare();
    else if (this.house === 1) this.atreidesMotion.prepare();
    else if (this.house === 2) this.ordosMotion.prepare();
    this.sprites = this.gfx.sprites();
    if (!scene.again || !this.vram.length) {
      this.vram = this.gfx.spriteVram(this.house).slice();
      this.gfx.setFace(this.vram, this.house, "eyes", 0);
      this.gfx.setFace(this.vram, this.house, "mouth", 0);
      this.cram.fill(0);
      this.shadow.fill(0);
      this.cycle = 0;
      this.cycleWait = 0;
      this.page = [];
    }
    this.target = this.gfx.paletteWords(this.house, scene.level);
    this.faceHidden = false;
    this.fadeWait = 0;
    this.phase = "fadein";
    this.leaveGen = null;
    this.planeDx = 0;
    this.portraitDx = 0;
    this.portraitGone = false;
    this.mapMask = 1023;
    this.slots = [null, null, null, null];
    this.physics = false;
    this.cycling = true;
    this.zoomImg = null;
    this.hdZoom = null;
    this.pages = this.gfx.pages(scene.text);
    this.voicePlan = this.voicePlanFor(scene);
    this.voicePlanIndex = 0;
    this.syncChoiceVoice = this.voicePlan.length > 0;
    this.remaining = this.pages.length;
    this.shown = 0;
    this.state = 1;
    this.talk = 2;
    this.lastPage = false;
    this.talkUntil = 0;
    this.talkTime = 0;
    this.eyes = 0;
    this.eyesNext = 0;
    this.eyesAt = 0;
    this.mouth = 0;
    this.mouthAt = 0;
    this.root.hidden = false;
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.acc = 0;
    this.loop();
  }
  /** Для автотестов: остановить свой цикл и прогнать n кадров. */
  stepFrames(n) {
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < n && !this.root.hidden; i++) this.tick();
    if (!this.root.hidden) this.draw();
  }
  close() {
    this.motion.stop();
    this.atreidesMotion.stop();
    this.ordosMotion.stop();
    this.stopVoice();
    this.root.hidden = true;
    this.phase = "idle";
    cancelAnimationFrame(this.raf);
  }
  /** Кнопка геймпада, пока экран открыт. */
  handlePad(b) {
    if (this.root.hidden) return false;
    if (b === "a" || b === "b" || b === "c") this.pressed = true;
    else if (this.phase === "buttons" && !this.buttonMove) {
      if (b === "up" && this.buttonY !== BUTTON_TOP) this.startMove(-2);
      else if (b === "down" && this.buttonY !== BUTTON_BOTTOM) this.startMove(2);
    }
    return true;
  }
  startMove(step) {
    this.buttonStep = step;
    this.buttonMove = 12;
  }
  onClick(e) {
    const { x, y } = menuPoint(this.canvas, e);
    if (this.phase === "buttons" && x >= 192 && y >= BUTTON_TOP && y < BUTTON_BOTTOM + 16) {
      this.buttonY = y < BUTTON_BOTTOM ? BUTTON_TOP : BUTTON_BOTTOM;
      this.buttonMove = 0;
    }
    this.pressed = true;
  }
  loop() {
    const now = performance.now();
    this.acc = Math.min(this.acc + (now - this.last), 250);
    this.last = now;
    while (this.acc >= 1e3 / 60 && !this.root.hidden) {
      this.acc -= 1e3 / 60;
      this.tick();
    }
    if (this.root.hidden) return;
    if (this.root.dataset.phase !== this.phase) this.root.dataset.phase = this.phase;
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  }
  /** Один кадр (60 в секунду). */
  tick() {
    this.timer++;
    if (this.cycling && --this.cycleWait < 0) {
      this.cycleWait = CYCLE_FRAMES - 1;
      for (let i = 0; i < 4; i++) this.cram[40 + i] = this.gfx.cycleColor(this.cycle + i);
      this.cycle++;
    }
    const pressed = this.pressed;
    this.pressed = false;
    switch (this.phase) {
      case "fadein":
      case "fadeout":
        this.fade();
        break;
      case "typer":
        if (this.syncChoiceVoice && this.voiceAudio) this.typerWithVoice(pressed);
        else this.typer(pressed);
        if (this.phase === "typer") this.face();
        break;
      case "buttons":
        this.buttons(pressed);
        break;
      case "key":
        if (pressed) this.finish(0);
        break;
      case "leave":
        if (this.physics) this.fall();
        if (this.leaveGen?.next().done) {
          this.close();
          this.done?.(0);
        }
        break;
    }
  }
  /** $0246E4: падение областей, ускорение $4000 (16.16); ушедшая за y $E0 освобождает место. */
  fall() {
    this.slots.forEach((s, i) => {
      if (!s || !s.falling) return;
      s.vel += 16384;
      s.y += s.vel;
      if (s.top + Math.floor(s.y / 65536) >= 224) this.slots[i] = null;
    });
  }
  /** Свободное место для области ($0244CC): область 7 — только третье, остальные — первое свободное. */
  freeSlot(region) {
    if (region === 7) return this.slots[2] ? -1 : 2;
    return this.slots.findIndex((s) => !s);
  }
  lift(slot, region) {
    const s = {
      region,
      line: this.gfx.pieceLine(this.gfx.regionColor(this.house, this.scene.level, region)),
      top: this.gfx.regionPieces(true, region)[0].y,
      y: 0,
      vel: 0,
      visible: false,
      falling: false
    };
    this.slots[slot] = s;
    return s;
  }
  /** Уход с экрана после ПРИНЯТЬ: $01F4B6 (пауза), $025DB2 (портрет уезжает), $02610C (карта рассыпается, приближение). */
  *leave() {
    const wait = function* (n) {
      for (let i = 0; i < n; i++) yield;
    };
    this.sound?.sfx(38);
    yield* wait(60);
    this.sound?.playMusic(MUSIC.ACCEPT);
    yield* wait(100);
    this.page = [];
    const line3 = this.cram.slice(48, 64);
    for (let d7 = 23; d7 >= 0; d7--) {
      yield;
      this.cram.set(line3, 48);
      this.planeDx--;
      this.portraitDx -= 4;
      if (d7 < 9) for (let i = 0; i < 16; i++) line3[i] = stepColor3(line3[i], 0);
    }
    this.physics = true;
    this.portraitGone = true;
    const full = this.gfx.fullPalette();
    for (; ; ) {
      let same = 0;
      for (let i = 0; i < 64; i++) {
        if (this.shadow[i] === full[i]) same++;
        else this.shadow[i] = stepColor3(this.shadow[i], full[i]);
      }
      this.cram.set(this.shadow);
      yield;
      if (same === 64) break;
    }
    yield* wait(101);
    const level = this.scene.level;
    const target = this.gfx.targetRegion(this.house, level);
    for (let r = 9; r >= 0; r--) {
      let slot2 = -1;
      for (; ; ) {
        if (r === 7) yield* wait(21);
        if (r === target) break;
        slot2 = this.freeSlot(r);
        if (slot2 >= 0) break;
        yield;
      }
      if (r === target) continue;
      const s = this.lift(slot2, r);
      yield;
      s.visible = true;
      const mask = this.mapMask & ~(1 << 9 - r);
      let left = 0;
      for (let i = 0; i < 10; i++) if (mask & 1 << i) left++;
      yield* wait(RECOMPOSE[left] - 2);
      this.mapMask = mask;
      yield;
      s.falling = true;
    }
    yield* wait(51);
    let slot = -1;
    while (slot < 0) {
      yield;
      slot = this.freeSlot(target);
    }
    const t = this.lift(slot, target);
    yield;
    t.visible = true;
    yield* wait(3);
    this.mapMask = 0;
    const own = this.gfx.regionPieces(true, target)[0];
    this.zoomHs = own.x - 48;
    this.zoomVs = 72 - own.y;
    const colors = this.gfx.targetColors(this.gfx.regionColor(this.house, level, target));
    if (colors) this.cram.set(colors, 1);
    const bmp = this.gfx.zoomBitmap(target);
    const W = 33 * 8 * 14 * 8;
    const bufA = new Uint8Array(W);
    const bufB = new Uint8Array(W);
    zoomTiles(bmp, bufA, 65536, 14, 10);
    yield* wait(19);
    this.sound?.command(23, 7, 2, 1);
    this.zoomImg = bufA;
    this.slots = [null, null, null, null];
    this.physics = false;
    this.cycling = false;
    this.shadow.set(this.cram);
    let fadeIn = 40;
    let frame = 0;
    const steps = Array.from({ length: 17 }, (_, k) => this.gfx.zoomStep(target, k));
    this.hdZoom = new CampaignZoom(this.zoomHs, this.zoomVs, steps, ZOOM_FRAMES);
    this.hdZoomStarted = this.timer;
    for (let k = 0; k < ZOOM_FRAMES.length; k++) {
      while (frame < ZOOM_FRAMES[k]) {
        if (frame === ZOOM_FRAMES[k] - 1) {
          this.zoomHs -= steps[k + 1].dx;
          this.zoomVs -= steps[k + 1].dy;
        }
        if (--fadeIn === 0) {
          fadeIn = 5;
          for (let i = 0; i < 64; i++) this.shadow[i] = stepColor3(this.shadow[i], 0);
          this.cram.set(this.shadow);
        }
        frame++;
        yield;
      }
      this.zoomImg = this.zoomRender(bmp, steps[k], k % 2 ? bufA : bufB);
    }
    this.sound?.stopSong(7);
  }
  /** Картинка шага (буферы не очищаются между шагами, как в оригинале). */
  zoomRender(bmp, step, buf) {
    zoomTiles(bmp, buf, step.step, step.w, step.h);
    return buf;
  }
  fade() {
    if (this.fadeWait > 0) {
      this.fadeWait--;
      return;
    }
    const out = this.phase === "fadeout";
    let same = 0;
    for (let i = 0; i < 64; i++) {
      const t = out ? 0 : this.target[i];
      if (this.shadow[i] === t) same++;
      else this.shadow[i] = stepColor3(this.shadow[i], t);
    }
    this.cram.set(this.shadow);
    this.fadeWait = FADE_FRAMES - 1;
    if (same < 64) return;
    if (out) {
      this.close();
      this.done?.(this.choice);
    } else {
      this.phase = "typer";
      this.wait = this.timer + 30;
      if (this.voicePlan.length) this.playVoice(this.voicePlan[0].src);
    }
  }
  /** Порт $01F9DA. */
  typer(pressed) {
    switch (this.state) {
      case 1:
        if (pressed) {
          if (this.lastPage) {
            this.state = 5;
            break;
          }
          this.shown = this.pages.length;
        } else if (this.timer > this.wait) {
          this.wait = this.timer + 15;
          this.shown++;
        }
        if (this.shown >= this.pages.length) {
          this.state = 2;
          this.shown = this.pages.length;
        }
        break;
      case 2:
      case 3: {
        let next = this.state === 2 || pressed;
        this.state = 3;
        if (this.talk === 2 && this.timer > this.talkUntil) next = true;
        if (next && this.lastPage) {
          this.state = 4;
          this.talk = 0;
        } else if (next) {
          if (this.remaining-- === 0) break;
          this.page = this.pages[this.pages.length - this.remaining - 1] ?? [];
          this.talk = 1;
          this.talkTime = this.page.length * 4;
          this.talkUntil = this.timer + this.talkTime;
          if (this.remaining === 0) this.lastPage = true;
        } else if (this.talk === 1 && this.timer > this.talkUntil) {
          this.talk = 2;
          if (!this.lastPage) this.talkUntil += this.talkTime + (this.talkTime >> 1);
        }
        break;
      }
      case 4:
        if (this.lastPage) this.state = 5;
        break;
      case 5:
        this.endText();
        break;
    }
  }
  voicePlanFor(scene) {
    const introFiles = {
      A: "./voice/atreides-choice.mp3",
      O: "./voice/ordos-choice.mp3",
      H: "./voice/harkonnen-choice.mp3"
    };
    if (scene.buttons === "yesno" && scene.level === 0)
      return [{ src: introFiles[scene.house], firstPage: 0, endPage: this.pages.length }];
    if (scene.buttons === "accept" && scene.level === 0 && scene.again) {
      const house = { A: "atreides", O: "ordos", H: "harkonnen" }[scene.house];
      return [{ src: `./voice/${house}-m01-advice.mp3`, firstPage: 0, endPage: this.pages.length }];
    }
    if (scene.buttons !== "accept" || scene.level !== 0 || scene.again) return [];
    const briefingFiles = {
      A: { part2: "atreides-briefing-2.mp3", part3: "atreides-briefing-3.mp3", split: 2 },
      O: { part2: "ordos-briefing-2.mp3", part3: "ordos-briefing-3.mp3", split: 1 },
      H: { part2: "harkonnen-briefing-2.mp3", part3: "harkonnen-briefing-3.mp3", split: 1 }
    };
    const { part2, part3, split } = briefingFiles[scene.house];
    const boundary = Math.min(split, this.pages.length);
    return [
      { src: `./voice/${part2}`, firstPage: 0, endPage: boundary },
      { src: `./voice/${part3}`, firstPage: boundary, endPage: this.pages.length }
    ];
  }
  /** Реплики ментата идут по страницам текста в темпе соответствующей записи. */
  typerWithVoice(pressed) {
    const audio = this.voiceAudio;
    if (!audio) return;
    if (pressed) {
      this.stopVoice();
      this.endText();
      return;
    }
    const segment = this.voicePlan[this.voicePlanIndex];
    if (audio.ended) {
      if (this.voicePlanIndex + 1 < this.voicePlan.length) {
        this.voicePlanIndex++;
        const next = this.voicePlan[this.voicePlanIndex];
        this.page = this.pages[next.firstPage] ?? [];
        this.playVoice(next.src);
      } else {
        this.stopVoice();
        this.endText();
      }
      return;
    }
    if (!segment || audio.paused) {
      if (segment) this.page = this.pages[segment.firstPage] ?? [];
      return;
    }
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const spokenDuration = Math.max(0.1, duration - 0.5);
    const weights = this.pages.slice(segment.firstPage, segment.endPage).map((page) => Math.max(20, page.filter((code) => code !== 13).length));
    if (!weights.length) return;
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const progress = Math.min(0.999, audio.currentTime / spokenDuration) * total;
    let index = 0;
    let boundary = weights[0] ?? 0;
    while (index < weights.length - 1 && progress >= boundary) boundary += weights[++index];
    this.page = this.pages[segment.firstPage + index] ?? [];
    this.state = 3;
    this.talk = 1;
  }
  endText() {
    this.stopVoice();
    this.syncChoiceVoice = false;
    if (this.scene.buttons === "key") {
      this.phase = "key";
      return;
    }
    this.gfx.setButtons(this.vram, this.scene.buttons === "accept");
    this.faceHidden = true;
    this.buttonY = BUTTON_TOP;
    this.buttonMove = 0;
    this.phase = "buttons";
  }
  buttons(pressed) {
    if (this.buttonMove) {
      this.buttonY += this.buttonStep;
      if (--this.buttonMove === 0) this.sound?.ui(25);
      return;
    }
    if (!pressed) return;
    this.sound?.ui(40);
    this.vram.fill(0, 45344, 45344 + 1920);
    this.faceHidden = false;
    this.finish(this.buttonY === BUTTON_TOP ? 0 : 1);
  }
  finish(choice) {
    this.stopVoice();
    this.choice = choice;
    if (this.scene.buttons === "accept" && choice === 1) {
      this.close();
      this.done?.(choice);
      return;
    }
    if (this.scene.leave && choice === 0) {
      this.phase = "leave";
      this.leaveGen = this.leave();
      return;
    }
    this.shadow.set(this.cram);
    this.phase = "fadeout";
    this.fadeWait = 0;
  }
  /** Порт $01F626: глаза и рот. */
  face() {
    const t = this.timer;
    const isSpeaking = !!(this.voiceAudio && !this.voiceAudio.paused && !this.voiceAudio.ended);
    if (this.talk === 1 || isSpeaking) {
      if (t > this.mouthAt) {
        this.mouth = rnd(0, 4);
        this.gfx.setFace(this.vram, this.house, "mouth", this.mouth);
        this.mouthAt = t + (this.mouth === 0 ? rnd(7, 30) : this.mouth <= 3 ? rnd(6, 10) : rnd(5, 6));
      }
    } else if (this.mouth !== 0) {
      this.mouth = 0;
      this.mouthAt = 0;
      this.gfx.setFace(this.vram, this.house, "mouth", 0);
    }
    if (t <= this.eyesAt) return;
    if (this.eyesNext !== 0) {
      this.eyes = this.eyesNext;
      this.eyesNext = 0;
      this.eyesAt = t + (this.eyes === 4 ? rnd(12, 30) : rnd(20, 180));
    } else {
      let d;
      if (this.talk === 0) {
        const r = rnd(0, 7);
        d = r > 5 ? 1 : r === 5 ? 4 : r;
      } else if (this.talk === 1) {
        if (this.eyes !== 0) d = 0;
        else {
          const r = rnd(0, 17);
          d = r > 9 ? 0 : r >= 5 ? 4 : r;
        }
      } else {
        const r = rnd(0, 15);
        d = r > 10 ? 2 : r >= 5 ? 4 : r;
      }
      if (d === 2 && this.eyes === 1 || d === 1 && this.eyes === 2) {
        this.eyesNext = d;
        this.eyes = 0;
        this.eyesAt = t + rnd(1, 5);
      } else if (d !== this.eyes && (d === 4 || this.eyes === 4)) {
        this.eyesNext = d;
        this.eyes = 3;
        this.eyesAt = t;
      } else {
        this.eyes = d;
        this.eyesAt = t + (d === 4 ? rnd(6, 60) : rnd(15, 180));
      }
    }
    this.gfx.setFace(this.vram, this.house, "eyes", this.eyes);
  }
  draw() {
    const portraitKey = this.house === 1 ? "mentatAtreides" : this.house === 2 ? "mentatOrdos" : "mentatHarkonnen";
    const portrait = this.art?.get(portraitKey);
    const hdMap = this.strategic.ready;
    const px = this.px;
    px.fill(hdMap ? 0 : 4278190080);
    const pal = toRGBA(this.cram);
    if (!hdMap) {
      for (const s of this.slots) if (s?.visible) this.gfx.drawRegion(px, s.region, s.line, Math.floor(s.y / 65536), pal);
      if (this.zoomImg) drawZoom(px, this.zoomImg, pal, this.zoomHs, this.zoomVs);
      if (this.mapMask) this.gfx.drawMap(px, this.house, this.scene.level, pal, this.mapMask, this.planeDx);
    }
    const eyes = this.gfx.faceOffset("eyes", this.house);
    const mouth = this.gfx.faceOffset("mouth", this.house);
    for (let i = 39; i >= 0; i--) {
      const s = this.sprites[i];
      if (i <= 8) {
        continue;
      } else if (this.portraitGone) continue;
      else if (portrait) continue;
      else if (EYES.includes(i)) {
        if (!this.faceHidden) this.gfx.drawSprite(px, this.vram, s, pal, eyes.dx + this.portraitDx, eyes.dy);
      } else if (MOUTH.includes(i)) {
        if (!this.faceHidden) this.gfx.drawSprite(px, this.vram, s, pal, mouth.dx + this.portraitDx, mouth.dy);
      } else this.gfx.drawSprite(px, this.vram, s, pal, this.portraitDx);
    }
    new Uint32Array(this.img.data.buffer).set(px);
    this.lowCtx.putImageData(this.img, 0, 0);
    const out = prepareMenu(this.canvas);
    if (hdMap) {
      let light = 0, targetLight = 0;
      for (let i = 0; i < 32; i++) {
        light += (this.cram[i] & 14) + (this.cram[i] >> 4 & 14) + (this.cram[i] >> 8 & 14);
        targetLight += (this.target[i] & 14) + (this.target[i] >> 4 & 14) + (this.target[i] >> 8 & 14);
      }
      const zoomFrame = this.timer - this.hdZoomStarted + this.acc * 60 / 1e3;
      out.save();
      out.globalAlpha = this.zoomImg && this.hdZoom ? Math.max(0, Math.min(1, (98 - zoomFrame) / 58)) : Math.min(1, light / Math.max(1, targetLight));
      this.strategic.backdrop(out, this.portraitGone);
      for (const s of this.slots) if (s?.visible) this.strategic.draw(out, this.house, this.scene.level, s.region, 0, s.y / 65536, true);
      if (this.zoomImg) {
        const camera = this.hdZoom?.sample(this.timer - this.hdZoomStarted + this.acc * 60 / 1e3) ?? { hs: this.zoomHs, vs: this.zoomVs, scale: 1 };
        this.strategic.zoom(out, this.house, this.scene.level, this.gfx.targetRegion(this.house, this.scene.level), camera.hs, camera.vs, camera.scale);
      }
      for (let r = 0; r < 10; r++) if (this.mapMask & 1 << 9 - r) this.strategic.draw(out, this.house, this.scene.level, r, this.planeDx);
      out.restore();
    }
    out.drawImage(this.lowCanvas, 0, 0, SCREEN_W, SCREEN_H);
    if (portrait && !this.portraitGone) {
      let level = 0, targetLevel = 0;
      for (let i = 48; i < 64; i++) {
        level += (this.cram[i] & 14) + (this.cram[i] >> 4 & 14) + (this.cram[i] >> 8 & 14);
        targetLevel += (this.target[i] & 14) + (this.target[i] >> 4 & 14) + (this.target[i] >> 8 & 14);
      }
      out.save();
      out.globalAlpha = Math.min(1, level / Math.max(1, targetLevel));
      const speaking = this.phase === "typer" && (this.talk === 1 || !!(this.voiceAudio && !this.voiceAudio.paused && !this.voiceAudio.ended));
      const animation = this.house === 0 ? this.motion : this.house === 1 ? this.atreidesMotion : this.ordosMotion;
      const moving = animation?.draw(out, this.portraitDx, speaking) ?? false;
      if (!moving) drawMentatPortrait(out, portrait, this.house, this.portraitDx, this.mouth, this.eyes === 4 && !this.faceHidden);
      out.restore();
    }
    if (this.phase === "buttons") {
      const labels = this.scene.buttons === "yesno" ? ["\u0414\u0410", "\u041D\u0415\u0422"] : ["\u041F\u0420\u0418\u041D\u042F\u0422\u042C", "\u0421\u041E\u0412\u0415\u0422"];
      labels.forEach((label, i) => {
        const y = i ? BUTTON_BOTTOM : BUTTON_TOP;
        const selected = Math.abs(this.buttonY - y) < 12;
        const fill = out.createLinearGradient(0, y, 0, y + 16);
        fill.addColorStop(0, selected ? "#394852" : "#17222c");
        fill.addColorStop(1, "#101920");
        out.fillStyle = fill;
        out.beginPath();
        out.roundRect(192, y, 104, 16, 2);
        out.fill();
        out.strokeStyle = selected ? "#e8c27d" : "#647784";
        out.lineWidth = 0.5;
        out.stroke();
        menuText(out, label, 244, y + 4, { size: 7, align: "center", color: selected ? "#ffe2a8" : "#b7c5cc" });
      });
    }
    if (this.page.length) {
      const decoded = decodeTextCodes(this.page).replace(/[ABCEHKMOPTXY]/g, (letter) => ({ A: "\u0410", B: "\u0412", C: "\u0421", E: "\u0415", H: "\u041D", K: "\u041A", M: "\u041C", O: "\u041E", P: "\u0420", T: "\u0422", X: "\u0425", Y: "\u0423" })[letter] ?? letter).replace(/АТРИДЕС/g, "\u0410\u0422\u0420\u0415\u0419\u0414\u0415\u0421");
      const lines = decoded.split("\n");
      const height = lines.length * 8 + 4;
      out.fillStyle = "rgba(18,14,7,.78)";
      out.fillRect(12, 12, 296, height);
      out.fillStyle = "#e6b94e";
      out.fillRect(12, 12, 2, height);
      lines.forEach((line, i) => menuText(out, line, 16, 16 + i * 8, { size: 7.4, color: "#ffe3a0", weight: "700", shadow: true, maxWidth: 288 }));
    }
  }
};

// web/src/ui/tutorial.ts
function loadTileList(b, vram, desc, dst) {
  for (let p = desc; ; p += 6) {
    const n = readU16(b, p);
    if (!n) break;
    const src = readU32(b, p + 2) & 16777215;
    const count = n & 32767;
    const data = n & 32768 ? lcwDecompress(b, src).data : b.subarray(src, src + count * 32);
    vram.set(data.subarray(0, Math.min(count * 32, 65536 - dst)), dst);
    dst += count * 32;
  }
}

// web/src/ui/finale.ts
var FINALE_ROM = {
  font: 1044194,
  tiles: 791062,
  map: 815692,
  palette: 683288,
  white: 444160,
  houseColors: 444180,
  creditsStart: 71984,
  credits: 71998,
  music: 33
};
function stepColor4(c, target) {
  let out = 0;
  for (const [mask, one] of [[14, 2], [224, 32], [3584, 512]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}
var FinaleScreen = class {
  constructor(rom, sound = null, art) {
    this.rom = rom;
    this.sound = sound;
    this.art = art;
    this.root = document.createElement("section");
    this.root.className = "settings finale";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "\u0424\u0438\u043D\u0430\u043B");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d");
    this.img = this.ctx.createImageData(SCREEN_W, SCREEN_H);
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", () => this.key = true);
  }
  rom;
  sound;
  art;
  root;
  canvas = document.createElement("canvas");
  ctx;
  img;
  px = new Uint32Array(SCREEN_W * SCREEN_H);
  raf = 0;
  last = 0;
  acc = 0;
  gen = null;
  done = null;
  vram = new Uint8Array(65536);
  planeA = new Uint16Array(64 * 32);
  planeB = new Uint16Array(64 * 32);
  vscroll = 0;
  scrollFraction = 0;
  cram = new Uint16Array(64);
  key = false;
  get isOpen() {
    return !this.root.hidden;
  }
  /** house — номер дома ROM (0 Харконнены, 1 Атрейдесы, 2 Ордосы). */
  open(house, done) {
    this.done = done;
    this.gen = this.run(house);
    this.key = false;
    this.root.hidden = false;
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.acc = 0;
    this.loop();
  }
  handlePad(_b) {
    if (this.root.hidden) return false;
    this.key = true;
    return true;
  }
  close() {
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }
  /** Для автотестов. */
  stepFrames(n) {
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < n && !this.root.hidden; i++) this.tick();
    if (!this.root.hidden) this.draw();
  }
  loop() {
    const now = performance.now();
    this.acc = Math.min(this.acc + (now - this.last), 250);
    this.last = now;
    while (this.acc >= 1e3 / 60 && !this.root.hidden) {
      this.acc -= 1e3 / 60;
      this.tick();
    }
    if (this.root.hidden) return;
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  }
  tick() {
    if (this.gen?.next().done) {
      this.close();
      this.done?.();
    }
  }
  *wait(n) {
    for (let i = 0; i < n; i++) yield;
  }
  /** Цвета from…from+count−1 к цели, шаг раз в speed кадров ($0006C8). */
  *fade(target, from, count, speed) {
    for (; ; ) {
      let same = 0;
      for (let i = from; i < from + count; i++) {
        const t = target(i);
        if (this.cram[i] === t) same++;
        else this.cram[i] = stepColor4(this.cram[i], t);
      }
      yield* this.wait(speed);
      if (same === count) return;
    }
  }
  /** $01188C: строка по центру в строке row плоскости A; возвращает адрес после конца строки. */
  line(p, row, color) {
    const b = this.rom.bytes;
    let len = 0;
    for (let q = p; b[q] && b[q] !== 10; q++) {
      if (b[q] === 255) q++;
      else len++;
    }
    let col = 40 - len >> 1;
    for (let q = p; b[q] && b[q] !== 10; q++) {
      if (b[q] === 255) {
        color.line = b[++q];
        continue;
      }
      this.planeA[row * 64 + col++] = 1152 | b[q] & 127 | (color.line & 7) << 13;
    }
  }
  *run(house) {
    const b = this.rom.bytes;
    this.vram.fill(0);
    this.planeA.fill(0);
    this.planeB.fill(0);
    this.cram.fill(0);
    this.vscroll = 0;
    this.vram.set(lcwDecompress(b, FINALE_ROM.font).data.subarray(0, 4096), 36864);
    loadTileList(b, this.vram, FINALE_ROM.tiles, 0);
    const map = lcwDecompress(b, FINALE_ROM.map).data;
    for (let i = 0; i < 64 * 28; i++) this.planeB[i] = readU16(map, i * 2);
    const pal = (i) => readU16(b, FINALE_ROM.palette + i * 2);
    yield* this.fade(pal, 0, 64, 3);
    this.sound?.playMusic(FINALE_ROM.music);
    yield* this.wait(150);
    this.sound?.play(24);
    yield* this.fade((i) => readU16(b, FINALE_ROM.white + i * 2), 1, 9, 7);
    yield* this.fade((i) => readU16(b, FINALE_ROM.houseColors + house * 20 + i * 2), 1, 9, 7);
    for (const [line, i, c] of [[2, 13, 238], [2, 14, 102], [2, 15, 0], [3, 13, 3822], [3, 14, 1638], [3, 15, 0]]) this.cram[line * 16 + i] = c;
    yield* this.wait(50);
    let p = FINALE_ROM.creditsStart;
    let row = 28;
    let looped = false;
    const color = { line: 3 };
    this.key = false;
    for (; ; ) {
      this.planeA.fill(0, row * 64, row * 64 + 40);
      this.line(p, row, color);
      let q = p;
      while (b[q] && b[q] !== 10) q++;
      if (!b[q]) {
        looped = true;
        p = FINALE_ROM.credits;
        continue;
      }
      p = q + 1;
      row = row + 1 & 31;
      for (let i = 0; i < 8; i++) {
        for (let k = 0; k < 3; k++) {
          this.scrollFraction = k / 3;
          yield;
          if (looped && this.key) {
            yield* this.fade(() => 0, 0, 64, 3);
            return;
          }
        }
        this.vscroll = this.vscroll + 1 & 255;
        this.scrollFraction = 0;
      }
    }
  }
  draw() {
    if (this.art?.get("arrakis")) {
      const out = prepareMenu(this.canvas);
      let light = 0;
      for (let i = 1; i < 10; i++) light = Math.max(light, this.cram[i] & 14, this.cram[i] >> 4 & 14, this.cram[i] >> 8 & 14);
      out.save();
      out.globalAlpha = Math.min(1, light / 10);
      this.art.background(out, "arrakis");
      out.fillStyle = "#03060c88";
      out.fillRect(-160, -100, 640, 424);
      const vignette = out.createRadialGradient(160, 112, 18, 160, 112, 190);
      vignette.addColorStop(0, "#0000");
      vignette.addColorStop(1, "#000b");
      out.fillStyle = vignette;
      out.fillRect(-160, -100, 640, 424);
      for (let row = 0; row < 32; row++) {
        const words = this.planeA.subarray(row * 64, row * 64 + 40);
        const codes = Array.from(words, (word) => (word & 2047) >= 1152 && (word & 2047) < 1280 ? (word & 2047) - 1152 : 32);
        const text = decodeTextCodes(codes).trim();
        if (!text) continue;
        const y = (row * 8 - this.vscroll - this.scrollFraction + 256) % 256;
        if (y >= SCREEN_H) continue;
        const role = words.some((word) => (word >> 13 & 3) === 2);
        out.save();
        out.globalAlpha *= Math.max(0, Math.min(1, (y + 5) / 18, (224 - y) / 18));
        out.shadowColor = "#000";
        out.shadowBlur = 3;
        out.shadowOffsetY = 0.5;
        menuText(out, text, 160, y, { size: role ? 5.3 : 6.2, maxWidth: 270, align: "center", color: role ? "#d9af69" : "#f5f0e6", weight: role ? "500" : "600", shadow: false });
        out.restore();
      }
      out.restore();
      return;
    }
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(this.vram, this.planeB[cy * 64 + cx], pal, px, SCREEN_W, cx * 8, cy * 8);
    const v = this.vscroll;
    const tile2 = new Uint32Array(64);
    for (let cy = 0; cy < 29; cy++)
      for (let cx = 0; cx < 40; cx++) {
        const word = this.planeA[((v >> 3) + cy & 31) * 64 + cx];
        if (!(word & 2047)) continue;
        tile2.fill(0);
        blitTile(this.vram, word, pal, tile2, 8, 0, 0);
        for (let r = 0; r < 8; r++) {
          const y = cy * 8 - (v & 7) + r;
          if (y < 0 || y >= SCREEN_H) continue;
          for (let c = 0; c < 8; c++) if (tile2[r * 8 + c]) px[y * SCREEN_W + cx * 8 + c] = tile2[r * 8 + c];
        }
      }
    new Uint32Array(this.img.data.buffer).set(px);
    this.ctx.putImageData(this.img, 0, 0);
  }
};

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\vehicles-hd\sandworm-hd.png
var sandworm_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\vehicles-hd\\sandworm-hd.png";

// web/src/gfx/worm-art.ts
var WormArt = class _WormArt {
  constructor(image) {
    this.image = image;
  }
  image;
  static async load() {
    try {
      const response = await fetch(sandworm_hd_default);
      if (!response.ok) throw Error(String(response.status));
      return new _WormArt(await createImageBitmap(await response.blob()));
    } catch (error) {
      console.warn("HD sandworm unavailable, using original sprites:", error);
      return null;
    }
  }
  frame(ctx, frame, x, y, size, alpha = 1) {
    const w = this.image.width / 2, h = this.image.height / 2;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha *= alpha;
    ctx.drawImage(this.image, frame % 2 * w, Math.floor(frame / 2) * h, w, h, x - size / 2, y - size * 0.4, size, size * 0.8);
    ctx.restore();
  }
  draw(ctx, unit, tick) {
    if (unit.type !== 25) return false;
    this.frame(ctx, 0, unit.x, unit.y, 31 + Math.sin(tick / 13) * 0.7, 0.76);
    return true;
  }
  swallow(ctx, x, y, age) {
    const sequence = [1, 2, 3, 3, 2, 1];
    const phase = Math.min(sequence.length - 1, Math.max(0, age / 3));
    const current = Math.floor(phase), blend = phase - current;
    this.frame(ctx, sequence[current], x, y, 58);
    if (blend > 0 && current < sequence.length - 1) this.frame(ctx, sequence[current + 1], x, y, 58, blend);
  }
};

// web/src/gfx/wall-art.ts
function drawWall(ctx, x, y, size, connections, texture) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  const footprint = () => {
    ctx.beginPath();
    ctx.rect(9, 9, 14, 14);
    if (connections & 1) ctx.rect(10, 0, 12, 16);
    if (connections & 2) ctx.rect(16, 10, 16, 12);
    if (connections & 4) ctx.rect(10, 16, 12, 16);
    if (connections & 8) ctx.rect(0, 10, 16, 12);
  };
  ctx.save();
  ctx.translate(1, 3);
  footprint();
  ctx.fillStyle = "#0a0b0c70";
  ctx.fill();
  ctx.restore();
  footprint();
  ctx.fillStyle = "#504c43";
  ctx.fill();
  ctx.save();
  ctx.translate(0, -2);
  footprint();
  const concrete = ctx.createLinearGradient(0, 4, 24, 27);
  concrete.addColorStop(0, "#d4c6a4");
  concrete.addColorStop(0.45, "#a89c82");
  concrete.addColorStop(1, "#817966");
  ctx.fillStyle = concrete;
  ctx.fill();
  ctx.clip();
  if (texture) {
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.drawImage(texture, 0, 0, 32, 32);
    ctx.restore();
  }
  ctx.strokeStyle = "#e7dcc0aa";
  ctx.lineWidth = 0.6;
  footprint();
  ctx.stroke();
  ctx.fillStyle = "#50595b";
  ctx.fillRect(11, 11, 10, 10);
  ctx.fillStyle = "#98a1a0";
  ctx.fillRect(11.5, 11.5, 9, 1);
  ctx.strokeStyle = "#302f2988";
  ctx.lineWidth = 0.45;
  for (const a of [4, 27]) {
    ctx.beginPath();
    ctx.moveTo(a, 7);
    ctx.lineTo(a, 25);
    ctx.moveTo(7, a);
    ctx.lineTo(25, a);
    ctx.stroke();
  }
  ctx.fillStyle = "#252a2b";
  for (const [bx, by] of [[12, 14], [20, 14], [12, 19], [20, 19]]) {
    ctx.beginPath();
    ctx.arc(bx, by, 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#eadcba35";
  for (let i = 0; i < 26; i++) ctx.fillRect(i * 13 % 29 + 1, i * 19 % 29 + 1, 0.35, 0.3);
  ctx.restore();
  ctx.restore();
}

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\vehicles-hd\bodies.png
var bodies_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\vehicles-hd\\bodies.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\vehicles-hd\mounts.png
var mounts_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\vehicles-hd\\mounts.png";

// web/src/gfx/vehicle-geometry.ts
var angleRadians = (angle) => angle * Math.PI / 128;
function along(angle, distance) {
  const a = angleRadians(angle);
  return { x: Math.sin(a) * distance, y: -Math.cos(a) * distance };
}
function muzzlePoint(x, y, angle, distance = 16) {
  const d = along(angle, distance);
  return { x: x + d.x, y: y - 4 + d.y };
}
var VEHICLES = [
  { type: 0, cell: 0, w: 28, h: 32 },
  { type: 1, cell: 1, w: 9, h: 21 },
  { type: 7, cell: 2, w: 15, h: 18, mount: 2, mw: 11, muzzle: 10 },
  { type: 8, cell: 3, w: 15, h: 18, mount: 3, mw: 11, muzzle: 10 },
  { type: 9, cell: 4, w: 16, h: 19, mount: 0, mw: 10, muzzle: 16 },
  { type: 10, cell: 5, w: 22, h: 21, mount: 1, mw: 13, muzzle: 16 },
  { type: 11, cell: 6, w: 19, h: 22, mount: 4, mw: 13, muzzle: 16 },
  { type: 12, cell: 7, w: 15, h: 18, mount: 5, mw: 10, muzzle: 12 },
  { type: 13, cell: 8, w: 13, h: 15, mount: 6, mw: 6, muzzle: 11 },
  { type: 14, cell: 9, w: 13, h: 15, mount: 7, mw: 6, muzzle: 11 },
  { type: 15, cell: 10, w: 14, h: 14, mount: 8, mw: 8, muzzle: 12 },
  { type: 16, cell: 11, w: 18, h: 31 },
  { type: 17, cell: 12, w: 15, h: 24 },
  { type: 26, cell: 13, w: 21, h: 29 }
];

// web/src/gfx/vehicle-art.ts
async function loadSpriteCells(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`Vehicle art HTTP ${response.status}`);
  const image = await createImageBitmap(await response.blob());
  const cells = [];
  for (let i = 0; i < 16; i++) {
    const cell2 = document.createElement("canvas");
    cell2.width = cell2.height = 256;
    const ctx = cell2.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, i % 4 * 256, (i >> 2) * 256, 256, 256, 0, 0, 256, 256);
    const pixels = ctx.getImageData(0, 0, 256, 256).data;
    let x0 = 256, y0 = 256, x1 = 0, y1 = 0;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (pixels[(y * 256 + x) * 4 + 3] > 20) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const c = document.createElement("canvas");
    c.width = x1 - x0 + 1;
    c.height = y1 - y0 + 1;
    c.getContext("2d").drawImage(cell2, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    cells.push(c);
  }
  image.close();
  return cells;
}
var VehicleArt = class _VehicleArt {
  constructor(rawMounts) {
    this.rawMounts = rawMounts;
  }
  rawMounts;
  bodies = [];
  mounts = [];
  shots = /* @__PURE__ */ new WeakMap();
  bullets = /* @__PURE__ */ new WeakMap();
  defs = new Map(VEHICLES.map((d) => [d.type, d]));
  static async load(rom) {
    try {
      const [bodies, mounts] = await Promise.all([loadSpriteCells(bodies_default), loadSpriteCells(mounts_default)]);
      const result = new _VehicleArt(mounts), palette = rom.gamePalette();
      for (let house = 0; house < 6; house++) {
        const base = rom.housePaletteLine(house) * 16;
        const colors = [15, 14, 13].map((i) => {
          const p = palette[base + i];
          return [p & 255, p >>> 8 & 255, p >>> 16 & 255];
        });
        const recolor = (source) => {
          const c = document.createElement("canvas");
          c.width = source.width;
          c.height = source.height;
          const g = c.getContext("2d");
          g.drawImage(source, 0, 0);
          if (rom.housePaletteLine(house) !== 1) {
            const im = g.getImageData(0, 0, c.width, c.height), p = im.data;
            for (let k = 0; k < p.length; k += 4) if (p[k + 3] && p[k + 2] > 60 && p[k + 2] > p[k] * 1.3 && p[k + 1] > p[k] * 1.15) {
              const light = Math.min(1, (Math.max(p[k + 1], p[k + 2]) - 25) / 225) * 2;
              const a = Math.min(1, Math.floor(light)), f = light - a;
              for (let j = 0; j < 3; j++) p[k + j] = colors[a][j] * (1 - f) + colors[a + 1][j] * f;
            }
            g.putImageData(im, 0, 0);
          }
          return c;
        };
        result.bodies.push(bodies.map(recolor));
        result.mounts.push(mounts.slice(0, 9).map(recolor));
      }
      return result;
    } catch (error) {
      console.warn("HD vehicles unavailable, using original sprites:", error);
      return null;
    }
  }
  reset() {
    this.shots = /* @__PURE__ */ new WeakMap();
    this.bullets = /* @__PURE__ */ new WeakMap();
  }
  shot(unit, bullet, tick) {
    const s = { tick, angle: bullet.orientation[0].current & 255, x: unit.o.position.x / 8, y: unit.o.position.y / 8, type: bullet.o.type };
    this.shots.set(unit, s);
    this.bullets.set(bullet, s);
  }
  /** Draw in original world pixels; the caller supplies the camera transform. */
  draw(ctx, u, tick) {
    if (u.type === 1) {
      this.ornithopter(ctx, u.x, u.y, u.orientation, u.house, tick, u.id, u.shadow, u.highlighted);
      return true;
    }
    const d = this.defs.get(u.type);
    if (!d) return this.projectile(ctx, u);
    const house = Math.min(5, u.house), body = this.bodies[house][d.cell];
    const shot = this.shots.get(u.ref), age = shot ? (tick - shot.tick) / 60 : 99;
    const firing = age >= 0 && age < 0.16;
    const aim = firing && shot ? shot.angle : u.turret;
    const recoil = firing ? Math.sin(Math.PI * Math.min(1, age / 0.16)) * 1.6 : 0;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(u.x, u.y);
    if (u.shadow) {
      ctx.save();
      ctx.translate(4, 10);
      ctx.globalAlpha = 0.26;
      ctx.filter = "brightness(0) blur(0.8px)";
      ctx.translate(0, -2);
      ctx.rotate(angleRadians(u.orientation));
      ctx.drawImage(body, -d.w / 2, -d.h / 2, d.w, d.h);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(0, -2);
    ctx.rotate(angleRadians(u.orientation));
    ctx.drawImage(body, -d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();
    if (d.mount !== void 0) {
      ctx.save();
      ctx.translate(0, -4);
      ctx.rotate(angleRadians(aim));
      const muzzle = d.muzzle, w = d.mw;
      ctx.drawImage(this.mounts[house][d.mount], -w / 2, -muzzle + recoil, w, muzzle + 5);
      ctx.restore();
      if (firing && shot && shot.type === 23) {
        const p = muzzlePoint(0, 0, shot.angle, d.muzzle);
        const phase = Math.min(3, Math.floor(age / 0.04)), twin = d.mount === 1 || d.mount === 4 || d.mount === 8;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angleRadians(shot.angle));
        ctx.globalAlpha = phase === 3 ? 0.35 : 1;
        const flash = this.rawMounts[12 + phase], width = twin ? 3.2 : 3.8;
        if (twin) {
          for (const x of [-w * 0.22, w * 0.22]) ctx.drawImage(flash, x - width / 2, -6 + recoil, width, 7);
        } else ctx.drawImage(flash, -width / 2, -7 + recoil, width, 8);
        ctx.restore();
      }
    }
    if (u.highlighted) {
      ctx.globalAlpha = 0.22;
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(0, -2);
      ctx.rotate(angleRadians(u.orientation));
      ctx.drawImage(body, -d.w / 2, -d.h / 2, d.w, d.h);
    }
    ctx.restore();
    return true;
  }
  /** Shared HD aircraft for the map and the original seven-craft victory formation. */
  ornithopter(ctx, x, y, orientation, house, tick, phase = 0, shadow = true, highlighted = false) {
    const cells = this.bodies[Math.max(0, Math.min(5, house))], body = cells[1], wing = cells[14];
    const flap = Math.sin(tick * Math.PI / 10 + phase * 1.7), reach = 9.5 + flap * 2.5;
    const model = () => {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.translate(-1, -4);
        ctx.rotate(flap * 0.1);
        ctx.drawImage(wing, -reach, -2, reach, 6);
        ctx.restore();
      }
      ctx.drawImage(body, -4.5, -12.5, 9, 21);
    };
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(x, y);
    if (shadow) {
      ctx.save();
      ctx.translate(4, 10);
      ctx.rotate(angleRadians(orientation));
      ctx.globalAlpha = 0.23;
      ctx.filter = "brightness(0) blur(0.8px)";
      model();
      ctx.restore();
    }
    ctx.rotate(angleRadians(orientation));
    model();
    if (highlighted) {
      ctx.globalAlpha = 0.22;
      ctx.globalCompositeOperation = "lighter";
      model();
    }
    ctx.restore();
  }
  projectile(ctx, u) {
    if (![18, 19, 20, 21, 22, 23, 24].includes(u.type)) return false;
    const shot = this.bullets.get(u.ref);
    if (u.type !== 23 && u.type !== 24 && shot && Math.hypot(u.x - shot.x, u.y - shot.y) < 11) return true;
    const index = u.type === 23 ? 10 : u.type === 24 ? 11 : 9;
    const [w, h] = u.type === 18 ? [6, 20] : u.type === 23 ? [u.state.big ? 2 : 1.2, 5] : u.type === 24 ? [16, 8] : [3, 10];
    const p = u.type === 23 ? along(u.orientation, -2) : { x: 0, y: 0 };
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(u.x + p.x, u.y + p.y);
    ctx.rotate(angleRadians(u.orientation));
    ctx.drawImage(this.rawMounts[index], -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }
};

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\map-hd\effects.png
var effects_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\map-hd\\effects.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\map-hd\effects-meta.json
var effects_meta_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\map-hd\\effects-meta.json";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\map-hd\destruction-decals.png
var destruction_decals_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\map-hd\\destruction-decals.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\map-hd\destruction-ids.json
var destruction_ids_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\map-hd\\destruction-ids.json";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\map-hd\concrete.png
var concrete_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\map-hd\\concrete.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\map-hd\bloom-transparent.png
var bloom_transparent_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\map-hd\\bloom-transparent.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\map-hd\bloom-alt-transparent.png
var bloom_alt_transparent_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\map-hd\\bloom-alt-transparent.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\map-hd\crater-hd.png
var crater_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\map-hd\\crater-hd.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\map-hd\construction-site-hd.png
var construction_site_hd_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\map-hd\\construction-site-hd.png";

// web/src/gfx/map-effects.ts
var MapEffects = class _MapEffects {
  constructionSite = null;
  frames = /* @__PURE__ */ new Map();
  decals = /* @__PURE__ */ new Map();
  static async load() {
    try {
      const bitmap = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw Error(`Map art HTTP ${response.status}`);
        return createImageBitmap(await response.blob());
      };
      const json = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw Error(`Map metadata HTTP ${response.status}`);
        return response.json();
      };
      const [effects, decals, concrete, bloom, bloomAlt, crater, construction, meta, ids] = await Promise.all([
        bitmap(effects_default),
        bitmap(destruction_decals_default),
        bitmap(concrete_default),
        bitmap(bloom_transparent_default),
        bitmap(bloom_alt_transparent_default),
        bitmap(crater_hd_default),
        bitmap(construction_site_hd_default),
        json(effects_meta_default),
        json(destruction_ids_default)
      ]);
      const result = new _MapEffects();
      result.constructionSite = construction;
      const sheet = document.createElement("canvas");
      sheet.width = sheet.height = 1024;
      const g = sheet.getContext("2d", { willReadFrequently: true });
      g.drawImage(effects, 0, 0, 1024, 1024);
      const pixels = g.getImageData(0, 0, 1024, 1024).data;
      for (const e of meta) {
        const x = e.index % 8 * 128, y = Math.floor(e.index / 8) * 128;
        let x0 = 128, y0 = 128, x1 = -1, y1 = -1;
        for (let row = 0; row < 128; row++) for (let col = 0; col < 128; col++) {
          if (pixels[((y + row) * 1024 + x + col) * 4 + 3] <= 8) continue;
          x0 = Math.min(x0, col);
          y0 = Math.min(y0, row);
          x1 = Math.max(x1, col);
          y1 = Math.max(y1, row);
        }
        if (x1 < x0) continue;
        x0 = Math.max(0, x0 - 2);
        y0 = Math.max(0, y0 - 2);
        x1 = Math.min(127, x1 + 2);
        y1 = Math.min(127, y1 + 2);
        const canvas = document.createElement("canvas");
        canvas.width = x1 - x0 + 1;
        canvas.height = y1 - y0 + 1;
        canvas.getContext("2d").drawImage(
          sheet,
          x + x0,
          y + y0,
          canvas.width,
          canvas.height,
          0,
          0,
          canvas.width,
          canvas.height
        );
        const frame = {
          canvas,
          ox: e.original.ox,
          oy: e.original.oy,
          worldWidth: e.original.width,
          worldHeight: e.original.height
        };
        result.frames.set(e.key, frame);
        for (const alias of e.aliases ?? []) result.frames.set(`frame:${alias}`, frame);
      }
      effects.close();
      for (let i = 0; i < ids.length; i++) {
        result.decals.set(ids[i], {
          image: decals,
          sx: i % 8 * decals.width / 8,
          sy: Math.floor(i / 8) * decals.height / 8,
          sw: decals.width / 8,
          sh: decals.height / 8
        });
      }
      for (const id of ids.filter((id2) => id2 <= 33)) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const g2 = canvas.getContext("2d"), stage = id === 33 ? 9 : Math.floor((id - 1) / 2);
        const scale = 0.54 + Math.min(9, stage) * 0.038;
        g2.translate(128, 128);
        g2.rotate((id * 7 % 9 - 4) * 0.025);
        g2.drawImage(crater, -128 * scale, -128 * scale, 256 * scale, 256 * scale);
        result.decals.set(id, { image: canvas, sx: 0, sy: 0, sw: 256, sh: 256 });
      }
      crater.close();
      result.decals.set(125, result.decals.get(33));
      for (const [id, image] of [[126, concrete], [208, bloom], [209, bloomAlt]]) {
        result.decals.set(id, { image, sx: 0, sy: 0, sw: image.width, sh: image.height });
      }
      return result;
    } catch (error) {
      console.warn("HD map effects unavailable, using original graphics:", error);
      return null;
    }
  }
  frame(key) {
    return this.frames.get(key) ?? null;
  }
  icon(id) {
    return this.decals.get(id) ?? null;
  }
};

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
var CELL_PX = 32;
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
    const s162 = (at) => readU16(this.bytes, at) << 16 >> 16;
    for (let i = 0; i < count; i++) {
      const p = addr + 2 + i * 12;
      const size = readU16(this.bytes, p + 6);
      pieces.push({
        y: s162(p + 4),
        x: s162(p + 10),
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
      const tile2 = word & 2047;
      if (tile2 * 32 + 32 > tiles.length) return null;
      const hflip = word & 2048;
      const vflip = word & 4096;
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 8; col++) {
          const sx = hflip ? 7 - col : col;
          const sy = vflip ? 7 - row : row;
          const byte = tiles[tile2 * 32 + sy * 4 + (sx >> 1)];
          const c = sx & 1 ? byte & 15 : byte >> 4;
          px[(t / w | 0) * 8 * width + row * width + t % w * 8 + col] = pal[c];
        }
    }
    return { id, width, height, pixels: new Uint8ClampedArray(px.buffer) };
  }
};

// web/src/engine/tables.gen.ts
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

// web/src/engine/tables.ts
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

// web/src/engine/core.ts
var u16 = (v) => v & 65535;
var UNIT_INDEX_MAX = 102;
var STRUCTURE_INDEX_MAX_HARD = 82;
var TEAM_INDEX_MAX = 16;
var HOUSE_MAX = 6;
var INDEX_INVALID = 65535;
var UNIT = {
  CARRYALL: 0,
  ORNITHOPTER: 1,
  INFANTRY: 2,
  TROOPERS: 3,
  SOLDIER: 4,
  TROOPER: 5,
  SABOTEUR: 6,
  LAUNCHER: 7,
  DEVIATOR: 8,
  TANK: 9,
  SIEGE_TANK: 10,
  DEVASTATOR: 11,
  SONIC_TANK: 12,
  TRIKE: 13,
  RAIDER_TRIKE: 14,
  QUAD: 15,
  HARVESTER: 16,
  MCV: 17,
  MISSILE_HOUSE: 18,
  MISSILE_ROCKET: 19,
  MISSILE_TURRET: 20,
  MISSILE_DEVIATOR: 21,
  MISSILE_TROOPER: 22,
  BULLET: 23,
  SONIC_BLAST: 24,
  SANDWORM: 25,
  FRIGATE: 26,
  MAX: 27,
  INVALID: 255
};
var STRUCTURE = {
  SLAB_1x1: 0,
  SLAB_2x2: 1,
  PALACE: 2,
  LIGHT_VEHICLE: 3,
  HEAVY_VEHICLE: 4,
  HIGH_TECH: 5,
  HOUSE_OF_IX: 6,
  WOR_TROOPER: 7,
  CONSTRUCTION_YARD: 8,
  WINDTRAP: 9,
  BARRACKS: 10,
  STARPORT: 11,
  REFINERY: 12,
  REPAIR: 13,
  WALL: 14,
  TURRET: 15,
  ROCKET_TURRET: 16,
  SILO: 17,
  OUTPOST: 18,
  MAX: 19,
  INVALID: 255
};
var STATE = { DETECT: -2, JUSTBUILT: -1, IDLE: 0, BUSY: 1, READY: 2 };
var SELECTION = { MENTAT: 0, TARGET: 1, PLACE: 2, UNIT: 3, STRUCTURE: 4, DEBUG: 5 };
function newFlags() {
  return {
    used: false,
    allocated: false,
    isNotOnMap: false,
    isSmoking: false,
    fireTwiceFlip: false,
    animationFlip: false,
    bulletIsBig: false,
    isWobbling: false,
    inTransport: false,
    byScenario: false,
    degrades: false,
    isHighlighted: false,
    isDirty: false,
    repairing: false,
    onHold: false,
    isUnit: false,
    upgrading: false
  };
}
function newScript() {
  return { delay: 0, pc: -1, scriptInfo: null, returnValue: 0, framePointer: 2, stackPointer: 15, variables: [0, 0, 0, 0, 0], stack: new Array(15).fill(0), isSubroutine: 0 };
}
function newObject() {
  return { index: 0, type: 0, linkedID: 255, flags: newFlags(), houseID: 0, seenByHouses: 0, position: { x: 0, y: 0 }, hitpoints: 0, script: newScript() };
}
function newUnit() {
  return {
    o: newObject(),
    currentDestination: { x: 0, y: 0 },
    originEncoded: 0,
    repairTime: 0,
    actionID: 0,
    nextActionID: 0,
    fireDelay: 0,
    distanceToDestination: 0,
    targetAttack: 0,
    targetMove: 0,
    amount: 0,
    deviated: 0,
    deviatedHouse: 0,
    targetLast: { x: 0, y: 0 },
    targetPreLast: { x: 0, y: 0 },
    orientation: [{ speed: 0, target: 0, current: 0 }, { speed: 0, target: 0, current: 0 }],
    speedPerTick: 0,
    speedRemainder: 0,
    speed: 0,
    movingSpeed: 0,
    wobbleIndex: 0,
    spriteOffset: 0,
    blinkCounter: 0,
    recoil: false,
    recoilShown: false,
    team: 0,
    timer: 0,
    route: new Array(14).fill(0),
    patrolActive: false,
    patrolStart: { x: 0, y: 0 },
    patrolEnd: { x: 0, y: 0 },
    patrolToEnd: true,
    patrolEngaging: false
  };
}
function newStructure() {
  return { o: newObject(), creatorHouseID: 0, rotationSpriteDiff: 0, objectType: 0, upgradeLevel: 0, upgradeTimeLeft: 0, countDown: 0, buildCostRemainder: 0, state: 0, hitpointsMax: 0, specialWait: 0, spent: 0 };
}
function newHouse() {
  return {
    index: 0,
    harvestersIncoming: 0,
    flags: { used: false, human: false, doneFullScaleAttack: false, isAIActive: false, radarActivated: false },
    unitCount: 0,
    unitCountMax: 0,
    unitCountEnemy: 0,
    unitCountAllied: 0,
    structuresBuilt: 0,
    credits: 0,
    creditsStorage: 0,
    powerProduction: 0,
    powerUsage: 0,
    windtrapCount: 0,
    creditsQuota: 0,
    palacePosition: { x: 0, y: 0 },
    timerUnitAttack: 0,
    timerSandwormAttack: 0,
    timerStructureAttack: 0,
    starportTimeLeft: 0,
    starportLinkedID: INDEX_INVALID,
    ai_structureRebuild: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]
  };
}
function newTeam() {
  return { index: 0, flags: { used: false }, members: 0, minMembers: 0, maxMembers: 0, movementType: 0, action: 0, actionStart: 0, houseID: 0, position: { x: 0, y: 0 }, targetTile: 0, target: 0, script: newScript() };
}
function newTile() {
  return { groundTileID: 0, overlayTileID: 0, houseID: 0, isUnveiled: false, hasUnit: false, hasStructure: false, hasAnimation: false, hasExplosion: false, index: 0 };
}
var G = {
  map: Array.from({ length: 4096 }, newTile),
  mapTileID: new Uint16Array(4096),
  units: Array.from({ length: UNIT_INDEX_MAX }, newUnit),
  unitFind: [],
  structures: Array.from({ length: STRUCTURE_INDEX_MAX_HARD }, newStructure),
  structureFind: [],
  houses: Array.from({ length: HOUSE_MAX }, newHouse),
  houseFind: [],
  teams: Array.from({ length: TEAM_INDEX_MAX }, newTeam),
  teamFind: [],
  timerGame: 0,
  playerHouseID: 1,
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
  iconGroups: [],
  unitSelected: null,
  structureActiveType: 65535,
  houseMissileCountdown: 0,
  unitHouseMissile: null,
  /** верхний левый угол видимой области, клетка (для проверок «в окне») */
  viewportPacked: 0,
  viewportTilesW: 15,
  viewportTilesH: 10,
  scriptCurrentObject: null,
  scriptCurrentUnit: null,
  scriptCurrentStructure: null,
  scriptCurrentTeam: null,
  starportAvailable: new Array(27).fill(0),
  /** скрипты EMC из ROM */
  scriptUnit: null,
  scriptStructure: null,
  scriptTeam: null,
  /** MD: тип ландшафта по номеру иконки ($00581C), −1 — не ландшафт */
  iconLandscape: new Int8Array(512).fill(-1),
  timerGUI: 0,
  tickScenarioStart: 0,
  selectionType: SELECTION.STRUCTURE,
  playerCredits: 65535,
  playerCreditsNoSilo: 0,
  tickHousePowerMaintenance: 0,
  structureIndex: 0,
  unitActive: null,
  activeAction: 65535,
  structureActive: null,
  structureActivePosition: 0,
  factoryWindowConstructionYard: false,
  musicInBattle: 0,
  /** код PLAYTESTER: юниты игрока гибнут только в пасти червя */
  playtester: false,
  /** код LOOKAROUND: туман не рисуется (в оригинале переключатель $FFC198 бит 0) */
  revealAll: false,
  scenario: newScenario(),
  /** звуки и сообщения уходят в интерфейс через эти обработчики */
  onSound: (_id, _pos) => {
  },
  /** Render notifications only; handlers must not change simulation state or consume RNG. */
  onUnitShot: (_unit, _bullet) => {
  },
  onVisualExplosion: (_type, _position) => {
  },
  onConstructionStart: () => {
  },
  onConstructionComplete: () => {
  },
  onFeedback: (_id) => {
  },
  onMessage: (_text, _priority = 0) => {
  },
  onSelect: () => {
  }
};
function newScenario() {
  return {
    winFlags: 0,
    loseFlags: 0,
    timeOut: 0,
    mapScale: 0,
    score: 0,
    killedAllied: 0,
    killedEnemy: 0,
    destroyedAllied: 0,
    destroyedEnemy: 0,
    harvestedAllied: 0,
    harvestedEnemy: 0,
    reinforcement: Array.from({ length: 16 }, () => ({ unitID: INDEX_INVALID, locationID: 0, timeLeft: 0, timeBetween: 0, repeat: 0 }))
  };
}
var packXY = (x, y) => u16(y << 6 | x);
var packedX = (p) => p & 63;
var packedY = (p) => p >> 6 & 63;
function indexGetType(encoded) {
  switch (encoded & 49152) {
    case 16384:
      return 2 /* UNIT */;
    case 32768:
      return 3 /* STRUCTURE */;
    case 49152:
      return 1 /* TILE */;
    default:
      return 0 /* NONE */;
  }
}
function indexDecode(encoded) {
  if (indexGetType(encoded) === 1 /* TILE */) return packXY(encoded >> 1 & 63, encoded >> 8 & 63);
  return encoded & 16383;
}
function indexEncode(index, type) {
  switch (type) {
    case 1 /* TILE */: {
      let ret = (packedX(index) << 1) + 1 << 0;
      ret |= (packedY(index) << 1) + 1 << 7;
      return u16(ret | 49152);
    }
    case 2 /* UNIT */:
      if (index >= UNIT_INDEX_MAX || !G.units[index].o.flags.allocated) return 0;
      return index | 16384;
    case 3 /* STRUCTURE */:
      return index | 32768;
    default:
      return 0;
  }
}
function indexGetUnit(encoded) {
  if (indexGetType(encoded) !== 2 /* UNIT */) return null;
  const i = indexDecode(encoded);
  return i < UNIT_INDEX_MAX ? G.units[i] : null;
}

// web/src/engine/explosion.ts
var EXPLOSION_MAX = 32;
var explosions = Array.from({ length: EXPLOSION_MAX }, () => ({ timeOut: 0, houseID: 0, current: 0, spriteID: 0, commands: null, position: { x: 0, y: 0 }, type: 0 }));

// web/src/game/names.ts
var UNIT_NAMES = [
  "\u0422\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442\u043D\u0438\u043A",
  // 0 UNIT_CARRYALL
  "\u041E\u0440\u043D\u0438\u0442\u043E\u043F\u0442\u0435\u0440",
  // 1 UNIT_ORNITHOPTER
  "\u041F\u0435\u0445\u043E\u0442\u0430",
  // 2 UNIT_INFANTRY
  "\u0422\u044F\u0436\u0451\u043B\u0430\u044F \u043F\u0435\u0445\u043E\u0442\u0430",
  // 3 UNIT_TROOPERS
  "\u0421\u043E\u043B\u0434\u0430\u0442",
  // 4 UNIT_SOLDIER
  "\u0428\u0442\u0443\u0440\u043C\u043E\u0432\u0438\u043A",
  // 5 UNIT_TROOPER
  "\u0414\u0438\u0432\u0435\u0440\u0441\u0430\u043D\u0442",
  // 6 UNIT_SABOTEUR
  "\u0420\u0430\u043A\u0435\u0442\u043D\u0430\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430",
  // 7 UNIT_LAUNCHER
  "\u0414\u0435\u0432\u0438\u0430\u0442\u043E\u0440",
  // 8 UNIT_DEVIATOR
  "\u0422\u0430\u043D\u043A",
  // 9 UNIT_TANK
  "\u041E\u0441\u0430\u0434\u043D\u044B\u0439 \u0442\u0430\u043D\u043A",
  // 10 UNIT_SIEGE_TANK
  "\u041E\u043F\u0443\u0441\u0442\u043E\u0448\u0438\u0442\u0435\u043B\u044C",
  // 11 UNIT_DEVASTATOR
  "\u0417\u0432\u0443\u043A\u043E\u0432\u043E\u0439 \u0442\u0430\u043D\u043A",
  // 12 UNIT_SONIC_TANK
  "\u0422\u0440\u0430\u0439\u043A",
  // 13 UNIT_TRIKE
  "\u0420\u0435\u0439\u0434\u0435\u0440",
  // 14 UNIT_RAIDER_TRIKE
  "\u041A\u0432\u0430\u0434\u0440\u043E\u0446\u0438\u043A\u043B",
  // 15 UNIT_QUAD
  "\u0425\u0430\u0440\u0432\u0435\u0441\u0442\u0435\u0440",
  // 16 UNIT_HARVESTER
  "MCV"
  // 17 UNIT_MCV
];
var STRUCTURE_NAMES = [
  "\u0411\u0435\u0442\u043E\u043D\u043D\u0430\u044F \u043F\u043B\u0438\u0442\u0430",
  // 0 STRUCTURE_SLAB_1x1
  "\u0411\u0435\u0442\u043E\u043D 2\xD72",
  // 1 STRUCTURE_SLAB_2x2
  "\u0414\u0432\u043E\u0440\u0435\u0446",
  // 2 STRUCTURE_PALACE
  "\u041B\u0451\u0433\u043A\u0438\u0439 \u0437\u0430\u0432\u043E\u0434",
  // 3 STRUCTURE_LIGHT_VEHICLE
  "\u0422\u044F\u0436\u0451\u043B\u044B\u0439 \u0437\u0430\u0432\u043E\u0434",
  // 4 STRUCTURE_HEAVY_VEHICLE
  "\u0417\u0430\u0432\u043E\u0434 \u0445\u0430\u0439-\u0442\u0435\u043A",
  // 5 STRUCTURE_HIGH_TECH
  "\u0414\u043E\u043C IX",
  // 6 STRUCTURE_HOUSE_OF_IX
  "\u041A\u0430\u0437\u0430\u0440\u043C\u044B WOR",
  // 7 STRUCTURE_WOR_TROOPER
  "\u0421\u0442\u0440\u043E\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0434\u0432\u043E\u0440",
  // 8 STRUCTURE_CONSTRUCTION_YARD
  "\u0412\u0435\u0442\u0440\u044F\u043A",
  // 9 STRUCTURE_WINDTRAP
  "\u041A\u0430\u0437\u0430\u0440\u043C\u044B",
  // 10 STRUCTURE_BARRACKS
  "\u041A\u043E\u0441\u043C\u043E\u043F\u043E\u0440\u0442",
  // 11 STRUCTURE_STARPORT
  "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u0432\u043E\u0434",
  // 12 STRUCTURE_REFINERY
  "\u0420\u0435\u043C\u043E\u043D\u0442\u043D\u044B\u0439 \u0446\u0435\u0445",
  // 13 STRUCTURE_REPAIR
  "\u0421\u0442\u0435\u043D\u0430",
  // 14 STRUCTURE_WALL
  "\u0422\u0443\u0440\u0435\u043B\u044C",
  // 15 STRUCTURE_TURRET
  "\u0420\u0430\u043A\u0435\u0442\u043D\u0430\u044F \u0442\u0443\u0440\u0435\u043B\u044C",
  // 16 STRUCTURE_ROCKET_TURRET
  "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043F\u0440\u044F\u043D\u043E\u0441\u0442\u0438",
  // 17 STRUCTURE_SILO
  "\u0420\u0430\u0434\u0430\u0440"
  // 18 STRUCTURE_OUTPOST
];

// web/src/engine/animation.ts
var ANIMATION_MAX = 112;
var animations = Array.from({ length: ANIMATION_MAX }, () => ({ tickNext: 0, tileLayout: 0, houseID: 0, current: 0, iconGroup: 0, commands: null, tile: { x: 0, y: 0 } }));

// web/src/engine/structure.ts
function unitPoolHasFree(first, last) {
  for (let i = first; i <= last; i++) if (!G.units[i].o.flags.used) return true;
  return false;
}
var unitAirSlotFree = () => unitPoolHasFree(0, 10);

// web/src/gfx/status-icons.ts
var wrench = new Path2D("M 1 -10 C -3 -11 -7 -7 -5 -3 L -11 3 C -14 6 -10 11 -7 8 L 0 1 C 5 3 10 -1 9 -6 L 5 -2 L 1 -3 L 0 -7 L 3 -10 Z");
var bolt = new Path2D("M 2 -12 L -9 2 L -2 2 L -4 12 L 10 -4 L 3 -4 L 5 -12 Z");
function drawStatusIcon(ctx, kind, x, y, size, tick, seed = 0) {
  const t = tick / 60, phase = t * 3.8 + seed * 0.61, pulse = 0.5 + 0.5 * Math.sin(phase);
  const accent = kind === "power" ? "#ffbd49" : kind === "repair" ? "#8cdad4" : "#9ddd7b";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "#0009";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1.4;
  const metal = ctx.createLinearGradient(0, -16, 0, 16);
  metal.addColorStop(0, "#43505a");
  metal.addColorStop(0.4, "#1c2930");
  metal.addColorStop(1, "#11191e");
  ctx.fillStyle = metal;
  ctx.strokeStyle = "#89969b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-15, -15, 30, 30, 6);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.22 + 0.3 * pulse;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-12.8, -12.8, 25.6, 25.6, 4.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (kind === "repair") {
    ctx.rotate(-0.34 + Math.sin(t * 4 + seed) * 0.13);
    const steel = ctx.createLinearGradient(-8, -8, 8, 8);
    steel.addColorStop(0, "#f3ffff");
    steel.addColorStop(0.5, "#9ebcc5");
    steel.addColorStop(1, "#4b8494");
    ctx.fillStyle = steel;
    ctx.strokeStyle = "#0c161c";
    ctx.lineWidth = 1.1;
    ctx.fill(wrench);
    ctx.stroke(wrench);
    ctx.fillStyle = "#20323a";
    ctx.beginPath();
    ctx.arc(-9, 5.5, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.25 + 0.65 * pulse;
    ctx.fillStyle = "#c6fff1";
    ctx.beginPath();
    ctx.arc(8, 8, 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "power") {
    ctx.globalAlpha = 0.8 + 0.2 * pulse;
    ctx.fillStyle = "#ffd670";
    ctx.strokeStyle = "#7b3e12";
    ctx.lineWidth = 1;
    ctx.fill(bolt);
    ctx.stroke(bolt);
    ctx.globalAlpha = 0.2 + 0.5 * pulse;
    ctx.strokeStyle = "#fff4ba";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(1, -9);
    ctx.lineTo(-6, 0);
    ctx.stroke();
  } else {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-2, 6);
    ctx.lineTo(9, -7);
    ctx.stroke();
  }
  ctx.restore();
}

// web/src/gfx/console-symbols.ts
function drawConsoleSymbol(ctx, kind, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.lineJoin = "round";
  const gold = ctx.createLinearGradient(-8, -10, 8, 10);
  gold.addColorStop(0, "#fff0b1");
  gold.addColorStop(0.4, "#b6934d");
  gold.addColorStop(0.6, "#f1cc79");
  gold.addColorStop(1, "#765027");
  const steel = ctx.createLinearGradient(-8, -10, 8, 10);
  steel.addColorStop(0, "#e0e7e9");
  steel.addColorStop(0.45, "#8f9da5");
  steel.addColorStop(0.55, "#d1d8d8");
  steel.addColorStop(1, "#4e5f6b");
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = "#251e14";
  ctx.shadowColor = "#000b";
  ctx.shadowBlur = 1.4;
  ctx.shadowOffsetY = 0.7;
  if (kind === "credits") {
    ctx.translate(0, 1.5);
    for (const [xx, yy] of [[-5, 3], [5, -1]]) for (let i = 0; i < 3; i++) {
      const y2 = yy - i * 2.5;
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.ellipse(xx, y2, 5.5, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff0b199";
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.ellipse(5, -6, 3.6, 1.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "damage") {
    for (const xx of [-4.5, 4.5]) {
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(xx - 3, 8);
      ctx.lineTo(xx - 3, -3);
      ctx.quadraticCurveTo(xx - 2, -7, xx, -10);
      ctx.quadraticCurveTo(xx + 2, -7, xx + 3, -3);
      ctx.lineTo(xx + 3, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#7b4829";
      ctx.fillRect(xx - 2.8, -3, 5.6, 2);
      ctx.fillStyle = "#eddba6";
      ctx.fillRect(xx - 2.8, 5.5, 5.6, 1);
    }
  } else if (kind === "armour") {
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(9, -7);
    ctx.lineTo(8, 2);
    ctx.quadraticCurveTo(7, 7, 0, 11);
    ctx.quadraticCurveTo(-7, 7, -8, 2);
    ctx.lineTo(-9, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#26343b";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(6, -5);
    ctx.lineTo(5, 2);
    ctx.lineTo(0, 7);
    ctx.lineTo(-5, 2);
    ctx.lineTo(-6, -5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = gold;
    ctx.fillRect(-0.8, -5, 1.6, 9);
    ctx.fillRect(-3.2, -1.5, 6.4, 1.6);
  } else {
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.lineTo(1, -1);
    ctx.bezierCurveTo(-2, -8, 4, -12, 9, -9);
    ctx.lineTo(5, -5);
    ctx.lineTo(8, -2);
    ctx.lineTo(12, -6);
    ctx.bezierCurveTo(13, 0, 8, 4, 3, 2);
    ctx.lineTo(-6, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#32424a";
    ctx.beginPath();
    ctx.arc(-6, 8, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// web/src/ui/factory.ts
var TABS = [
  { id: "exit", on: -1, off: -1 },
  { id: "repair", on: -2, off: -4 },
  { id: "stop", on: -3, off: -5 }
];
var TAB_Y = 48;
var GRID_X = 32;
var GRID_Y = 72;
var CELL_W = 32;
var CELL_H = 24;
var COLUMNS = 3;
var ROWS_VISIBLE = 6;
var HD_ROW_H = 24;
var PICTURE = { x: 160, y: 40 };
var SIZE_ICON = { x: 240, y: 80 };
var NAME = { x: 160, y: 104, chars: 12 };
var NUMBERS_RIGHT = 256;
var NUMBER_ROWS = [128, 160, 192];
var STAT_ICON_X = 160;
var STAT_ICON_Y = [120, 152, 184];
var HD_STAT_SLOTS = [
  { iconX: 168, iconY: 128.23, valueY: 131.33 },
  { iconX: 168, iconY: 159.08, valueY: 162.39 },
  { iconX: 168, iconY: 190.37, valueY: 194.1 }
];
var CREDITS = { right: 296, y: 16 };
var FACTORY_LIGHTS = [
  { col: 15, row: 1, table: 32716, words: 8, frames: 4, min: 7, max: 27 },
  { col: 22, row: 3, table: 32840, words: 1, frames: 2, min: 4, max: 11 },
  { col: 34, row: 7, table: 32904, words: 1, frames: 2, min: 7, max: 17 }
];
var STARPORT_LIGHTS = [
  { col: 33, row: 16, table: 35286, words: 4, frames: 4, min: 7, max: 27 },
  { col: 13, row: 1, table: 35382, words: 3, frames: 16, min: 4, max: 11 }
];
var rnd2 = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
var BLIP_PATH = 35596;
var BLIP_LAST = 179;
var UPGRADE_ICON = { structures: 19, units: 27 };
var UPGRADE_NAME = 161470;
var FactoryWindow = class {
  constructor(rom, gfx, host, portraits = null) {
    this.rom = rom;
    this.gfx = gfx;
    this.host = host;
    this.portraits = portraits;
    this.root = document.createElement("section");
    this.root.className = `settings factory${portraits ? " hd-menu" : ""}`;
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "\u041E\u043A\u043D\u043E \u0437\u0434\u0430\u043D\u0438\u044F");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d");
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", (e) => this.onClick(e));
    this.canvas.addEventListener("wheel", (e) => {
      if (this.root.hidden || !this.portraits || !this.orders.length || e.deltaY === 0) return;
      e.preventDefault();
      this.cursor = Math.max(0, Math.min(this.orders.length - 1, Math.max(0, this.cursor) + Math.sign(e.deltaY) * COLUMNS));
      this.draw();
    }, { passive: false });
    window.addEventListener("keydown", (e) => {
      if (!this.root.hidden && e.code === "Escape") this.close();
    });
  }
  rom;
  gfx;
  host;
  portraits;
  root;
  canvas = document.createElement("canvas");
  ctx;
  s = null;
  orders = [];
  /** −3…−1 — кнопки (ВЫХОД, РЕМОНТ, СТОП), 0… — заказы */
  cursor = -3;
  pictures = /* @__PURE__ */ new Map();
  frame = 0;
  raf = 0;
  /** огоньки: таймер и текущий кадр */
  lights = [];
  /** точка космопорта ($008A96): номер точки пути, направление, отражение */
  blip = { index: 0, back: false, flip: 0 };
  get isOpen() {
    return !this.root.hidden;
  }
  get units() {
    return !!this.s && this.s.o.type !== STRUCTURE.CONSTRUCTION_YARD;
  }
  get rowsVisible() {
    return this.portraits ? 5 : ROWS_VISIBLE;
  }
  get starport() {
    return this.s?.o.type === STRUCTURE.STARPORT;
  }
  open(s) {
    this.s = s;
    this.cursor = -3;
    this.lights = [];
    this.blip = { index: 0, back: false, flip: 0 };
    this.refresh();
    this.root.hidden = false;
    this.host.toggled(true);
    this.loop();
  }
  close() {
    if (this.root.hidden) return;
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
    this.host.toggled(false);
  }
  refresh() {
    const s = this.s;
    if (s && this.starport) {
      const prices = this.host.game().starportPrices();
      this.orders = this.host.game().starportListed.map((type) => ({ type, available: G.starportAvailable[type], cost: prices[type] }));
      return;
    }
    const orders = s && structureInfo[s.o.type].o.flags.factory ? this.host.game().buildOptions(s) : [];
    this.orders = orders.reverse();
    const up = s ? this.host.game().upgradeEntry(s) : null;
    if (up) this.orders.push({ type: -1, available: 1, cost: up.cost, upgrade: up.unlocks });
  }
  handlePad(b) {
    if (this.root.hidden) return false;
    const n = this.orders.length;
    const col = this.cursor < 0 ? this.cursor + 3 : this.cursor % COLUMNS;
    const was = this.cursor;
    if (b === "left" || b === "right") {
      const d = b === "left" ? -1 : 1;
      if (this.cursor < 0) this.cursor = Math.min(-1, Math.max(-3, this.cursor + d));
      else {
        const next = this.cursor + d;
        if (Math.floor(next / COLUMNS) === Math.floor(this.cursor / COLUMNS) && next >= 0 && next < n) this.cursor = next;
      }
    } else if (b === "down") {
      if (this.cursor < 0) {
        if (n) this.cursor = Math.min(col, n - 1);
      } else if (this.cursor + COLUMNS < n) this.cursor += COLUMNS;
    } else if (b === "up") {
      if (this.cursor >= COLUMNS) this.cursor -= COLUMNS;
      else if (this.cursor >= 0) this.cursor = col - 3;
    } else if (b === "a" || b === "c") this.activate();
    if (this.cursor !== was) this.host.ui?.(25);
    return true;
  }
  /** Кнопки ВЫХОД, РЕМОНТ, СТОП: светлая — можно нажать ($028F8C, $029042). */
  buttons(s) {
    const damaged = s.o.hitpoints < structureInfo[s.o.type].o.hitpoints;
    const busy = s.o.linkedID !== 255 && (s.state === STATE.BUSY || !this.units && s.state === STATE.READY);
    return [true, damaged, s.o.flags.repairing || s.o.flags.upgrading || busy];
  }
  /**
   * A в окне ($028876): нельзя (тёмная кнопка, авиации некуда, космопорт не продаёт) — звук ошибки $2F,
   * иначе действие и звук $26.
   */
  activate() {
    const s = this.s;
    if (!s) return;
    const fail = () => this.host.sfx?.(47);
    const ok = () => this.host.sfx?.(38);
    const game = this.host.game();
    if (this.cursor < 0 && !this.buttons(s)[this.cursor + 3]) return fail();
    if (this.cursor === -3) return ok(), this.close();
    if (this.cursor === -2) {
      ok();
      game.startRepair(s);
      return;
    }
    if (this.cursor === -1) {
      ok();
      game.stopAll(s);
      return;
    }
    const order = this.orders[this.cursor];
    if (!order || order.available < 0) return fail();
    if (this.starport) {
      if (order.cost > this.host.credits() || G.starportAvailable[order.type] <= 0) return fail();
      if ((order.type === UNIT.CARRYALL || order.type === UNIT.ORNITHOPTER) && !unitAirSlotFree()) return fail();
      if (game.starportBuy(s, order.type, order.cost)) ok(), this.close();
      return;
    }
    if (s.o.flags.repairing) s.o.flags.repairing = false;
    if (order.upgrade !== void 0) {
      if (s.o.flags.upgrading) return;
      game.upgrade(s);
      this.close();
      return;
    }
    if (s.o.type === STRUCTURE.HIGH_TECH && (order.type === UNIT.CARRYALL || order.type === UNIT.ORNITHOPTER) && !unitAirSlotFree()) return fail();
    const prod = game.production(s);
    if (s.o.type !== STRUCTURE.CONSTRUCTION_YARD || prod && prod.type === order.type) ok();
    if (prod && prod.type === order.type) {
      if (prod.ready && !this.units && game.placeIt(s)) {
        this.close();
        this.host.placing();
        return;
      }
      if (prod.onHold) game.holdOrResume(s);
    } else game.build(s, order.type);
    this.close();
  }
  onClick(e) {
    const r = this.canvas.getBoundingClientRect();
    const point = this.portraits ? menuPoint(this.canvas, e) : { x: (e.clientX - r.left) / r.width * SCREEN_W, y: (e.clientY - r.top) / r.height * SCREEN_H };
    const { x, y } = point;
    const col = Math.floor((x - GRID_X) / CELL_W);
    if (col < 0 || col >= COLUMNS) return;
    if (y >= TAB_Y && y < TAB_Y + CELL_H) this.cursor = col - 3;
    else {
      const rowH = this.portraits ? HD_ROW_H : CELL_H;
      const row = Math.floor((y - GRID_Y) / rowH);
      const firstRow = Math.max(0, Math.floor(Math.max(0, this.cursor) / COLUMNS) - this.rowsVisible + 1);
      const i = (row + firstRow) * COLUMNS + col;
      if (row < 0 || row >= this.rowsVisible || i >= this.orders.length) return;
      this.cursor = i;
    }
    this.activate();
  }
  loop() {
    this.frame++;
    if (this.frame % 30 === 0) this.refresh();
    this.draw();
    if (!this.root.hidden) this.raf = requestAnimationFrame(() => this.loop());
  }
  draw() {
    if (this.portraits) {
      this.drawHD();
      return;
    }
    this.drawOriginal();
  }
  drawHD() {
    const s = this.s;
    if (!s) return;
    const g = prepareMenu(this.canvas), game = this.host.game(), units = this.units, prod = game.production(s);
    const gfx = this.gfx;
    const hardware = gfx.art.get("productionConsole");
    if (hardware) {
      g.drawImage(hardware, 0, 0, SCREEN_W, SCREEN_H);
      for (const [x, y, color] of [[181, 24, "#70ff80"], [277, 58, "#ff5b35"]]) {
        g.save();
        g.globalAlpha = 0.1 + 0.12 * Math.sin(this.frame / 22) ** 2;
        g.fillStyle = color;
        g.shadowColor = color;
        g.shadowBlur = 2;
        g.beginPath();
        g.arc(x, y, 2, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    } else g.drawImage(this.starport ? gfx.starportBackground() : gfx.factoryBackground(), 0, 0, SCREEN_W, SCREEN_H);
    const lights = this.starport ? STARPORT_LIGHTS : FACTORY_LIGHTS;
    if (!hardware) lights.forEach((l, i) => {
      const st = this.lights[i] ??= { timer: 0, frame: -1 };
      if (--st.timer < 0) {
        st.timer = rnd2(l.min, l.max);
        st.frame = rnd2(0, l.frames - 1);
      }
      g.drawImage(gfx.windowLight(this.starport ? "starport" : "factory", l.table, l.words, st.frame), l.col * 8, l.row * 8);
    });
    if (this.starport) {
      const b = this.blip;
      b.index += b.back ? -1 : 1;
      if (b.index < 0 || b.index > BLIP_LAST) {
        b.flip = rnd2(0, 3);
        b.back = Math.random() < 0.5;
        b.index = b.back ? BLIP_LAST : 0;
      }
      const at = BLIP_PATH + b.index * 4, y = readU16(this.rom.bytes, at) << 16 >> 16, x = readU16(this.rom.bytes, at + 2) << 16 >> 16;
      if (hardware) {
        g.save();
        g.fillStyle = "#9eff8a";
        g.shadowColor = "#78ff63";
        g.shadowBlur = 1.5;
        g.beginPath();
        g.arc(96 + (x - 96) * 0.1, 32 + (y - 32) * 0.06, 0.65, 0, Math.PI * 2);
        g.fill();
        g.restore();
      } else gfx.starportBlip(g, x - 4, y - 4, b.flip);
    }
    const enabled = this.buttons(s), labels = ["\u0412\u042B\u0425\u041E\u0414", "\u0420\u0415\u041C\u041E\u041D\u0422", "\u0421\u0422\u041E\u041F"];
    for (let i = 0; i < 3; i++) {
      const x = GRID_X + i * CELL_W;
      const metal = g.createLinearGradient(x, TAB_Y, x, TAB_Y + CELL_H);
      metal.addColorStop(0, enabled[i] ? "#8c8990" : "#48464f");
      metal.addColorStop(0.15, enabled[i] ? "#5b5962" : "#303039");
      metal.addColorStop(1, "#24242b");
      g.fillStyle = metal;
      g.fillRect(x, TAB_Y, CELL_W, CELL_H);
      g.fillStyle = enabled[i] ? "#c1bbad" : "#66626b";
      g.fillRect(x + 1, TAB_Y + 1, CELL_W - 2, 0.45);
      g.strokeStyle = this.cursor === i - 3 ? "#f0c350" : "#9ca8ad";
      g.lineWidth = this.cursor === i - 3 ? 1.2 : 0.45;
      g.strokeRect(x + 0.5, TAB_Y + 0.5, CELL_W - 1, CELL_H - 1);
      menuText(g, labels[i], x + CELL_W / 2, TAB_Y + CELL_H / 2, { size: i === 1 ? 4.35 : 4.8, align: "center", baseline: "middle", color: enabled[i] ? "#f1dfb3" : "#999398", weight: "600" });
    }
    const firstRow = Math.max(0, Math.floor(Math.max(0, this.cursor) / COLUMNS) - this.rowsVisible + 1);
    this.orders.forEach((o, i) => {
      const row = Math.floor(i / COLUMNS) - firstRow;
      if (row < 0 || row >= this.rowsVisible) return;
      const x = GRID_X + i % COLUMNS * CELL_W, y = GRID_Y + row * HD_ROW_H;
      const tile2 = g.createLinearGradient(x, y, x, y + HD_ROW_H);
      tile2.addColorStop(0, "#29282b");
      tile2.addColorStop(1, "#0b1117");
      g.fillStyle = tile2;
      g.fillRect(x + 1, y + 1, CELL_W - 2, HD_ROW_H - 2);
      if (o.upgrade !== void 0) drawStatusIcon(g, "repair", x + 16, y + 12, 15, this.frame);
      else g.drawImage(this.portraits.icon(units ? "unit" : "structure", o.type), x + (CELL_W - (HD_ROW_H - 3) * 4 / 3) / 2, y + 1, (HD_ROW_H - 3) * 4 / 3, HD_ROW_H - 3);
      g.strokeStyle = this.cursor === i ? "#ffe082" : "#899398";
      g.lineWidth = this.cursor === i ? 1 : 0.35;
      g.strokeRect(x + 1.5, y + 1.5, CELL_W - 3, HD_ROW_H - 3);
      if (o.available < 0) {
        g.fillStyle = "#081015a8";
        g.fillRect(x + 1, y + 1, CELL_W - 2, HD_ROW_H - 2);
      }
      if (prod && prod.type === o.type) {
        g.fillStyle = prod.ready ? "#b9e5a0" : prod.onHold ? "#efad52" : "#f2d067";
        g.fillRect(x + 2, y + HD_ROW_H - 2, (CELL_W - 4) * prod.progress, 1);
      }
    });
    const cx = this.cursor < 0 ? GRID_X + (this.cursor + 3) * CELL_W : GRID_X + this.cursor % COLUMNS * CELL_W;
    const cy = this.cursor < 0 ? TAB_Y : GRID_Y + (Math.floor(this.cursor / COLUMNS) - firstRow) * HD_ROW_H;
    g.strokeStyle = "#ffdc68";
    g.lineWidth = 0.9;
    g.strokeRect(cx + 0.5, cy + 0.5, CELL_W - 1, (this.cursor < 0 ? CELL_H : HD_ROW_H) - 1);
    const order = this.cursor >= 0 ? this.orders[this.cursor] : null;
    const type = order ? order.upgrade ?? order.type : s.o.type, kind = order && units ? "unit" : "structure";
    const preview = this.portraits.image(kind, type);
    g.save();
    g.beginPath();
    g.rect(160, 40, 98, 57);
    g.clip();
    g.drawImage(preview, 160, 40, 98, 57);
    g.restore();
    const name = order?.upgrade !== void 0 ? "\u0423\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435" : (kind === "unit" ? UNIT_NAMES[type] : STRUCTURE_NAMES[type]) ?? "";
    menuText(g, name, 208, 107.94, { size: 7, align: "center", baseline: "middle", maxWidth: 94, color: "#fff2c9", weight: "700" });
    const oi = kind === "unit" ? unitInfo[type]?.o : structureInfo[type]?.o;
    const middle = kind === "unit" ? unitInfo[type]?.damage : Math.abs(structureInfo[type]?.powerUsage ?? 0);
    const values = [order?.cost ?? 0, order?.upgrade !== void 0 ? 0 : middle ?? 0, order?.upgrade !== void 0 ? 0 : oi?.hitpoints ?? 0];
    const texts = ["\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C", kind === "unit" ? "\u0423\u0440\u043E\u043D" : "\u042D\u043D\u0435\u0440\u0433\u0438\u044F", "\u041F\u0440\u043E\u0447\u043D\u043E\u0441\u0442\u044C"];
    values.forEach((value, i) => {
      const slot = HD_STAT_SLOTS[i];
      if (i === 1 && kind === "structure") drawStatusIcon(g, "power", slot.iconX, slot.iconY, 10, this.frame);
      else drawConsoleSymbol(g, i === 0 ? "credits" : i === 1 ? "damage" : "armour", slot.iconX, slot.iconY, 11);
      menuText(g, texts[i], 194, slot.valueY, { size: 3.6, baseline: "middle", maxWidth: 31, color: "#d4c9b2", weight: "600" });
      menuText(g, String(value), NUMBERS_RIGHT, slot.valueY, { size: 7.2, baseline: "middle", align: "right", maxWidth: 26, color: "#fff0c3", weight: "700" });
    });
    menuText(g, String(this.host.credits()), CREDITS.right, 20.5, { size: 8.5, baseline: "middle", align: "right", color: "#fff1cb", weight: "700" });
  }
  drawOriginal() {
    const s = this.s;
    if (!s) return;
    const g = this.ctx;
    const gfx = this.gfx;
    const game = this.host.game();
    const units = this.units;
    g.fillStyle = "#000";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.drawImage(this.starport ? gfx.starportBackground() : gfx.factoryBackground(), 0, 0);
    const lights = this.starport ? STARPORT_LIGHTS : FACTORY_LIGHTS;
    lights.forEach((l, i) => {
      const st = this.lights[i] ??= { timer: 0, frame: -1 };
      if (--st.timer < 0) {
        st.timer = rnd2(l.min, l.max);
        st.frame = rnd2(0, l.frames - 1);
      }
      g.drawImage(gfx.windowLight(this.starport ? "starport" : "factory", l.table, l.words, st.frame), l.col * 8, l.row * 8);
    });
    if (this.starport) {
      const b = this.blip;
      b.index += b.back ? -1 : 1;
      if (b.index < 0 || b.index > BLIP_LAST) {
        b.flip = rnd2(0, 3);
        b.back = Math.random() < 0.5;
        b.index = b.back ? BLIP_LAST : 0;
      }
      const at = BLIP_PATH + b.index * 4;
      const y = readU16(this.rom.bytes, at) << 16 >> 16;
      const x = readU16(this.rom.bytes, at + 2) << 16 >> 16;
      gfx.starportBlip(g, x - 4, y - 4, b.flip);
    }
    const prod = game.production(s);
    const enabled = this.buttons(s);
    TABS.forEach((t, i) => {
      const icon = gfx.factoryIcon(units, enabled[i] ? t.on : t.off);
      if (icon) g.drawImage(icon, GRID_X + i * CELL_W, TAB_Y);
    });
    const firstRow = Math.max(0, Math.floor(Math.max(0, this.cursor) / COLUMNS) - this.rowsVisible + 1);
    this.orders.forEach((o, i) => {
      const row = Math.floor(i / COLUMNS) - firstRow;
      if (row < 0 || row >= this.rowsVisible) return;
      const icon = gfx.factoryIcon(units, o.upgrade !== void 0 ? units ? UPGRADE_ICON.units : UPGRADE_ICON.structures : o.type);
      const x = GRID_X + i % COLUMNS * CELL_W;
      const y = GRID_Y + row * CELL_H;
      if (icon) g.drawImage(icon, x, y);
      if (o.available < 0) {
        g.fillStyle = "rgba(0,0,0,0.55)";
        g.fillRect(x, y, CELL_W, CELL_H);
      }
      if (prod && prod.type === o.type) {
        g.fillStyle = prod.ready ? "#40e040" : prod.onHold ? "#e0a000" : "#e0e040";
        g.fillRect(x + 1, y + CELL_H - 3, Math.round((CELL_W - 2) * prod.progress), 2);
      }
    });
    {
      const cx = this.cursor < 0 ? GRID_X + (this.cursor + 3) * CELL_W : GRID_X + this.cursor % COLUMNS * CELL_W;
      const cy = this.cursor < 0 ? TAB_Y : GRID_Y + (Math.floor(this.cursor / COLUMNS) - firstRow) * CELL_H;
      g.drawImage(gfx.factoryCursor((this.frame & 31) >> 3, this.starport), cx, cy);
    }
    const order = this.cursor >= 0 ? this.orders[this.cursor] : null;
    if (order?.upgrade !== void 0) {
      const pic2 = this.picture(units, order.upgrade);
      if (pic2) g.drawImage(pic2, PICTURE.x, PICTURE.y);
      g.drawImage(gfx.plainText(decodeText(this.rom.bytes, UPGRADE_NAME, 12).padEnd(12)), NAME.x, NAME.y);
      [order.cost, 0, 0].forEach((v, i) => {
        const t = gfx.plainText(String(v));
        g.drawImage(t, NUMBERS_RIGHT - t.width, NUMBER_ROWS[i]);
      });
    }
    const pic = order ? order.upgrade !== void 0 ? null : this.picture(units, order.type) : this.picture(false, s.o.type);
    if (pic) g.drawImage(pic, PICTURE.x, PICTURE.y);
    if (order && order.upgrade === void 0) {
      if (!units) {
        const layout = structureInfo[order.type].layout;
        const size = layoutSize[layout];
        const icon = size.width === 1 ? 0 : size.width === 2 ? 1 : size.height === 2 ? 2 : 3;
        g.drawImage(gfx.sizeIcon(icon), SIZE_ICON.x, SIZE_ICON.y);
      }
      const name = gfx.objectName(units, order.type).trim();
      const pad = Math.floor((NAME.chars - name.length) / 2);
      g.drawImage(gfx.plainText(" ".repeat(Math.max(0, pad)) + name), NAME.x, NAME.y);
      const oi = units ? unitInfo[order.type].o : structureInfo[order.type].o;
      const middle = units ? unitInfo[order.type].damage : Math.abs(structureInfo[order.type].powerUsage);
      [order.cost, middle, oi.hitpoints].forEach((v, i) => {
        const t = gfx.plainText(String(v));
        g.drawImage(t, NUMBERS_RIGHT - t.width, NUMBER_ROWS[i]);
      });
    }
    const ammo = units && (this.starport || !!structureInfo[s.o.type].o.flags.factory);
    STAT_ICON_Y.forEach((y, i) => g.drawImage(i === 1 && ammo ? gfx.ammoIcon() : gfx.statIcon(i), STAT_ICON_X, y));
    const credits = gfx.plainText(String(this.host.credits()));
    g.drawImage(credits, CREDITS.right - credits.width, CREDITS.y);
  }
  picture(units, type) {
    const key = `${units}:${type}`;
    if (!this.pictures.has(key)) {
      const list = units ? this.rom.unitPictures() : this.rom.structurePictures();
      const p = list.find((x) => x.id === type);
      let c = null;
      if (p) {
        c = document.createElement("canvas");
        c.width = p.width;
        c.height = p.height;
        c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(p.pixels), p.width, p.height), 0, 0);
      }
      this.pictures.set(key, c);
    }
    return this.pictures.get(key) ?? null;
  }
};

// web/src/gfx/portraits.ts
var Portraits = class {
  constructor(skins, vehicles, infantry, effects, icons, house, worm, buildings) {
    this.skins = skins;
    this.vehicles = vehicles;
    this.infantry = infantry;
    this.effects = effects;
    this.icons = icons;
    this.house = house;
    this.worm = worm;
    this.buildings = buildings;
  }
  skins;
  vehicles;
  infantry;
  effects;
  icons;
  house;
  worm;
  buildings;
  cache = /* @__PURE__ */ new Map();
  iconCache = /* @__PURE__ */ new Map();
  image(kind, type) {
    if (kind === "structure") {
      const image = this.buildings?.image(type);
      if (image) return image;
    }
    const key = `${kind}:${type}:${this.house()}`;
    let c = this.cache.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = 384;
    c.height = 256;
    const g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, "#25323b");
    bg.addColorStop(1, "#10171c");
    g.fillStyle = bg;
    g.fillRect(0, 0, 384, 256);
    g.imageSmoothingEnabled = true;
    if (kind === "structure") {
      const size = layoutSize[structureInfo[type]?.layout ?? 0], aspect = size.width / size.height;
      const h = 212 / Math.max(1, aspect), w = h * aspect;
      const image = this.skins.structure(type, Math.round(w), Math.round(h));
      if (image) {
        g.drawImage(image, (384 - w) / 2, (256 - h) / 2, w, h);
      } else if (type === 0 || type === 1) {
        const floor = this.effects?.icon(126) ?? this.icons.source(126);
        g.save();
        g.translate(192, 128);
        g.transform(1, 0.22, -0.5, 0.6, 0, 0);
        g.drawImage(floor.image, floor.sx, floor.sy, floor.sw, floor.sh, -112, -112, 224, 224);
        g.restore();
      } else if (type === 14) {
        for (let i = 0; i < 4; i++) drawWall(g, 48 + i * 72, 83, 72, (i ? 8 : 0) | (i < 3 ? 2 : 0), this.effects?.icon(126)?.image);
      }
    } else {
      const u = {
        id: 0,
        type,
        house: this.house(),
        orientation: 24,
        turret: 24,
        x: 0,
        y: 0,
        state: { wing: 0 },
        ref: { o: { position: { x: 0, y: 0 }, hitpoints: 100 }, actionID: 3 },
        highlighted: false,
        shadow: [0, 1, 26].includes(type)
      };
      g.save();
      g.translate(192, 140);
      g.scale(type >= 2 && type <= 6 ? 18 : 6, type >= 2 && type <= 6 ? 18 : 6);
      this.worm?.draw(g, u, 0) || this.vehicles?.draw(g, u, 0) || this.infantry?.draw(g, u, 0);
      g.restore();
    }
    this.cache.set(key, c);
    return c;
  }
  /** Transparent, tightly framed HD thumbnail for the original console order slots. */
  icon(kind, type) {
    if (kind === "structure") {
      const image = this.buildings?.image(type, true);
      if (image) return image;
    }
    const key = `${kind}:${type}:${this.house()}`;
    let c = this.iconCache.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = 128;
    c.height = 96;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = true;
    if (kind === "structure") {
      const size = layoutSize[structureInfo[type]?.layout ?? 0], aspect = size.width / size.height;
      const h = 78 / Math.max(1, aspect), w = h * aspect, image = this.skins.structure(type, Math.round(w), Math.round(h));
      if (image) g.drawImage(image, (128 - w) / 2, (96 - h) / 2, w, h);
      else if (type === 0 || type === 1) {
        const floor = this.effects?.icon(126) ?? this.icons.source(126);
        g.save();
        g.translate(64, 48);
        g.transform(1, 0.22, -0.5, 0.6, 0, 0);
        g.drawImage(floor.image, floor.sx, floor.sy, floor.sw, floor.sh, -38, -38, 76, 76);
        g.restore();
      } else if (type === 14) {
        for (let i = 0; i < 4; i++) drawWall(g, 8 + i * 28, 32, 28, (i ? 8 : 0) | (i < 3 ? 2 : 0), this.effects?.icon(126)?.image);
      }
    } else {
      const u = { id: 0, type, house: this.house(), orientation: 24, turret: 24, x: 0, y: 0, state: { wing: 0 }, ref: { o: { position: { x: 0, y: 0 }, hitpoints: 100 }, actionID: 3 }, highlighted: false, shadow: [0, 1, 26].includes(type) };
      g.save();
      g.translate(64, 54);
      g.scale(type >= 2 && type <= 6 ? 7 : 3, type >= 2 && type <= 6 ? 7 : 3);
      this.worm?.draw(g, u, 0) || this.vehicles?.draw(g, u, 0) || this.infantry?.draw(g, u, 0);
      g.restore();
    }
    this.iconCache.set(key, c);
    return c;
  }
};

// web/src/ui/romstore.ts
var DB = "dune-remaster";
var STORE = "rom";
var SKINS = "skins";
function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(SKINS)) db.createObjectStore(SKINS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function loadSkinFiles() {
  const out = /* @__PURE__ */ new Map();
  try {
    const db = await open();
    await new Promise((resolve) => {
      const req = db.transaction(SKINS).objectStore(SKINS).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return resolve();
        out.set(String(c.key), c.value);
        c.continue();
      };
      req.onerror = () => resolve();
    });
  } catch {
  }
  return out;
}
async function storeSkinFile(key, file) {
  try {
    const db = await open();
    const store = db.transaction(SKINS, "readwrite").objectStore(SKINS);
    if (file) store.put(file, key);
    else store.delete(key);
  } catch {
  }
}

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\palace.png
var palace_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\palace.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\vehicle-factory.png
var vehicle_factory_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\vehicle-factory.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\hightech-factory.png
var hightech_factory_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\hightech-factory.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\barracks.png
var barracks_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\barracks.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\construction-yard.png
var construction_yard_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\construction-yard.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\windtrap.png
var windtrap_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\windtrap.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\starport.png
var starport_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\starport.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\refinery.png
var refinery_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\refinery.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\repair-facility.png
var repair_facility_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\repair-facility.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\turret-directions.png
var turret_directions_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\turret-directions.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\rocket-turret-directions.png
var rocket_turret_directions_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\rocket-turret-directions.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\spice-silo.png
var spice_silo_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\spice-silo.png";

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\radar-outpost.png
var radar_outpost_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\radar-outpost.png";

// web/src/gfx/structure-art.ts
var STRUCTURE_ART = [
  { type: 2, url: palace_default },
  { type: 3, url: vehicle_factory_default },
  { type: 4, url: vehicle_factory_default },
  { type: 5, url: hightech_factory_default },
  { type: 7, url: barracks_default },
  { type: 8, url: construction_yard_default },
  { type: 9, url: windtrap_default },
  { type: 10, url: barracks_default },
  { type: 11, url: starport_default },
  { type: 12, url: refinery_default },
  { type: 13, url: repair_facility_default },
  { type: 15, url: turret_directions_default, directions: true },
  { type: 16, url: rocket_turret_directions_default, directions: true },
  { type: 17, url: spice_silo_default },
  { type: 18, url: radar_outpost_default }
];

// web/src/gfx/skins.ts
var Skins = class {
  skins = /* @__PURE__ */ new Map();
  defaults = /* @__PURE__ */ new Map();
  /** клетки карты, у которых есть своя картинка (быстрая проверка при отрисовке) */
  iconOverridden = new Uint8Array(512);
  onChange = () => {
  };
  async load(_rom, _icons) {
    const pending = /* @__PURE__ */ new Map();
    await Promise.all(STRUCTURE_ART.map(async (art) => {
      try {
        let task = pending.get(art.url);
        if (!task) {
          task = this.loadDefault(art);
          pending.set(art.url, task);
        }
        this.defaults.set(`structure:${art.type}`, await task);
      } catch (error) {
        console.warn(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0433\u0440\u0430\u0444\u0438\u043A\u0443 \u0437\u0434\u0430\u043D\u0438\u044F ${art.type}`, error);
      }
    }));
    for (const [k, blob] of await loadSkinFiles()) {
      try {
        this.put(k, await createImageBitmap(blob));
      } catch {
      }
    }
  }
  async loadDefault(art) {
    const response = await fetch(art.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const image = await createImageBitmap(await response.blob());
    return { image, scaled: /* @__PURE__ */ new Map(), directions: art.directions };
  }
  put(key, image) {
    if (image) this.skins.set(key, { image, scaled: /* @__PURE__ */ new Map() });
    else this.skins.delete(key);
    const m = /^icon:(\d+)$/.exec(key);
    if (m) this.iconOverridden[Number(m[1])] = image ? 1 : 0;
  }
  has(key) {
    return this.skins.has(key);
  }
  image(key) {
    return this.skins.get(key)?.image ?? null;
  }
  keys() {
    return [...this.skins.keys()];
  }
  async set(key, file, save = true) {
    this.put(key, await createImageBitmap(file));
    if (save) await storeSkinFile(key, file);
    this.onChange();
  }
  async clear(key) {
    this.put(key, null);
    await storeSkinFile(key, null);
    this.onChange();
  }
  async clearAll() {
    for (const k of this.keys()) {
      this.put(k, null);
      await storeSkinFile(k, null);
    }
    this.onChange();
  }
  /** Картинка, уменьшенная ровно до w×h экранных пикселей. */
  scaled(key, w, h, direction = 0) {
    const s = this.skins.get(key) ?? this.defaults.get(key);
    if (!s) return null;
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const frame = s.directions ? direction & 7 : 0;
    const k = `${w}x${h}:${frame}`;
    let c = s.scaled.get(k);
    if (!c) {
      if (s.directions) {
        const crop = document.createElement("canvas");
        crop.width = Math.round(s.image.width / 4);
        crop.height = Math.round(s.image.height / 2);
        crop.getContext("2d").drawImage(
          s.image,
          frame % 4 * s.image.width / 4,
          Math.floor(frame / 4) * s.image.height / 2,
          s.image.width / 4,
          s.image.height / 2,
          0,
          0,
          crop.width,
          crop.height
        );
        c = downscale(crop, w, h);
      } else c = downscale(s.image, w, h);
      if (s.scaled.size > (s.directions ? 64 : 16)) s.scaled.clear();
      s.scaled.set(k, c);
    }
    return c;
  }
  // совместимость с просмотром ресурсов
  hasStructure(type) {
    return this.has(`structure:${type}`);
  }
  structureImage(type) {
    return this.image(`structure:${type}`);
  }
  setStructure(type, file) {
    return this.set(`structure:${type}`, file);
  }
  clearStructure(type) {
    return this.clear(`structure:${type}`);
  }
  structure(type, w, h, direction = 0) {
    return this.scaled(`structure:${type}`, w, h, direction);
  }
};
function downscale(src, w, h) {
  if (w >= src.width && h >= src.height) {
    const out2 = document.createElement("canvas");
    out2.width = w;
    out2.height = h;
    const g2 = out2.getContext("2d");
    g2.imageSmoothingEnabled = false;
    g2.drawImage(src, 0, 0, w, h);
    return out2;
  }
  let cur = src;
  let cw = src.width;
  let ch = src.height;
  while (cw / 2 >= w && ch / 2 >= h) {
    const half = document.createElement("canvas");
    half.width = Math.ceil(cw / 2);
    half.height = Math.ceil(ch / 2);
    const g2 = half.getContext("2d");
    g2.imageSmoothingQuality = "high";
    g2.drawImage(cur, 0, 0, cw, ch, 0, 0, half.width, half.height);
    cur = half;
    cw = half.width;
    ch = half.height;
  }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const g = out.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(cur, 0, 0, cw, ch, 0, 0, w, h);
  return out;
}

// asset-url:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\vehicles-hd\infantry.png
var infantry_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\vehicles-hd\\infantry.png";

// web/src/gfx/infantry-art.ts
var InfantryArt = class _InfantryArt {
  constructor(cells) {
    this.cells = cells;
  }
  cells;
  poses = /* @__PURE__ */ new Map();
  shots = /* @__PURE__ */ new WeakMap();
  corpses = [];
  lastTick = -1;
  static async load(rom) {
    try {
      const raw = await loadSpriteCells(infantry_default), palette = rom.gamePalette();
      const cells = Array.from({ length: 6 }, (_, house) => raw.map((source) => {
        const c = document.createElement("canvas");
        c.width = source.width;
        c.height = source.height;
        const g = c.getContext("2d");
        g.drawImage(source, 0, 0);
        if (rom.housePaletteLine(house) !== 1) {
          const data = g.getImageData(0, 0, c.width, c.height), p = data.data, base = rom.housePaletteLine(house) * 16;
          for (let k = 0; k < p.length; k += 4) if (p[k + 3] && p[k + 2] > 60 && p[k + 2] > p[k] * 1.3 && p[k + 1] > p[k] * 1.15) {
            const light = Math.min(1, (Math.max(p[k + 1], p[k + 2]) - 25) / 225) * 2, a = Math.min(1, Math.floor(light)), f = light - a;
            const lo = palette[base + 15 - a], hi = palette[base + 14 - a];
            for (let j = 0; j < 3; j++) p[k + j] = (lo >>> j * 8 & 255) * (1 - f) + (hi >>> j * 8 & 255) * f;
          }
          g.putImageData(data, 0, 0);
        }
        return c;
      }));
      return new _InfantryArt(cells);
    } catch (error) {
      console.warn("HD infantry unavailable, using original sprites:", error);
      return null;
    }
  }
  reset() {
    this.poses.clear();
    this.shots = /* @__PURE__ */ new WeakMap();
    this.corpses = [];
    this.lastTick = -1;
  }
  shot(u, b, tick) {
    if (u.o.type >= 2 && u.o.type <= 6) this.shots.set(u, { tick, angle: b.orientation[0].current & 255, rocket: b.o.type !== 23 });
  }
  update(units, tick) {
    if (tick === this.lastTick) return;
    this.lastTick = tick;
    const seen = /* @__PURE__ */ new Set();
    for (const u of units) {
      if (u.type < 2 || u.type > 6) continue;
      seen.add(u.ref);
      const p = this.poses.get(u.ref), dead = u.ref.o.hitpoints === 0 || u.ref.actionID === 10;
      const distance = p ? Math.hypot(u.x - p.x, u.y - p.y) : 0;
      this.poses.set(u.ref, {
        x: u.x,
        y: u.y,
        phase: (p?.phase ?? u.id * 0.8) + (distance < 12 ? distance * 1.4 : 0),
        move: distance > 0.025 ? 1 : (p?.move ?? 0) * 0.65,
        tick,
        type: u.type,
        house: u.house,
        angle: u.orientation,
        dead: dead ? p && p.dead >= 0 ? p.dead : tick : -1,
        ref: u.ref
      });
    }
    for (const [ref, p] of this.poses) if (!seen.has(ref)) {
      if (ref.o.hitpoints === 0 || ref.actionID === 10) this.corpses.push({ ...p, dead: p.dead >= 0 ? p.dead : tick });
      this.poses.delete(ref);
    }
    this.corpses = this.corpses.filter((p) => tick - p.dead < 180).slice(-40);
  }
  model(type) {
    return type === 6 ? 2 : type === 3 || type === 5 ? 1 : 0;
  }
  members(type) {
    return type === 2 || type === 3 ? [[-3, 2], [3, 2], [0, -3]] : [[0, 0]];
  }
  person(ctx, model, house, phase, move, fire, age) {
    const cells = this.cells[Math.min(5, house)], stride = Math.sin(phase) * 1.35 * move;
    for (let side = 0; side < 2; side++) {
      const step = side ? stride : -stride;
      ctx.save();
      ctx.translate(side ? 1.15 : -1.15, 1.1 + step);
      ctx.rotate((side ? 1 : -1) * Math.sin(phase) * 0.07 * move);
      ctx.drawImage(cells[model * 4 + 1 + side], -0.85, -1, 1.7, 3.8);
      ctx.restore();
    }
    const recoil = fire ? Math.sin(Math.PI * Math.min(1, age / 0.18)) * 0.5 : 0;
    const torso = cells[fire ? 12 + model : model * 4];
    ctx.drawImage(torso, -2.8, -6 + recoil, 5.6, 7.5);
    if (fire && age < 0.09) {
      ctx.save();
      ctx.translate(0, -6.5 + recoil);
      ctx.fillStyle = "#ffe3a0";
      ctx.shadowColor = "#ffb547";
      ctx.shadowBlur = 1.5;
      ctx.beginPath();
      ctx.moveTo(-0.5, 0);
      ctx.lineTo(0, -2.5);
      ctx.lineTo(0.7, -0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  draw(ctx, u, tick) {
    if (u.type < 2 || u.type > 6) return false;
    const p = this.poses.get(u.ref), shot = this.shots.get(u.ref), age = shot ? (tick - shot.tick) / 60 : 99;
    const firing = age >= 0 && age < 0.2, angle = firing && shot ? shot.angle : u.orientation;
    const model = this.model(u.type), members = this.members(u.type);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(u.x, u.y);
    for (const [i, offset] of members.entries()) {
      ctx.save();
      ctx.translate(offset[0], offset[1]);
      ctx.rotate(angleRadians(angle));
      if (p && p.dead >= 0) {
        const fall = Math.min(1, (tick - p.dead) / 18);
        ctx.rotate(fall * 0.9);
        ctx.scale(1, 1 - fall * 0.2);
        ctx.drawImage(this.cells[Math.min(5, u.house)][model * 4 + 3], -4, -4, 8, 9);
      } else this.person(ctx, model, u.house, (p?.phase ?? 0) + i * 1.7, p?.move ?? 0, firing, age);
      ctx.restore();
    }
    ctx.restore();
    return true;
  }
  drawCorpses(ctx, tick, isVisible) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (const p of this.corpses) {
      if (!isVisible(p.x, p.y)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angleRadians(p.angle));
      ctx.globalAlpha = Math.min(1, (180 - tick + p.dead) / 70);
      for (const [x, y] of this.members(p.type)) ctx.drawImage(this.cells[Math.min(5, p.house)][this.model(p.type) * 4 + 3], x - 4, y - 4, 8, 9);
      ctx.restore();
    }
    ctx.restore();
  }
};

// web/src/gfx/cursors.ts
function drawSelection(ctx, x, y, w, h, z, tick = 0) {
  const n = Math.min(6 * z, w * 0.22, h * 0.22), line = Math.max(1, z * 0.7);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const path = () => {
    ctx.beginPath();
    for (const [xx, yy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      ctx.moveTo(xx, yy + sy * n);
      ctx.lineTo(xx, yy);
      ctx.lineTo(xx + sx * n, yy);
    }
  };
  path();
  ctx.strokeStyle = "#14242ecc";
  ctx.lineWidth = line + Math.max(1, z * 0.45);
  ctx.stroke();
  path();
  ctx.strokeStyle = `rgba(208,238,240,${0.82 + 0.12 * Math.sin(tick / 28)})`;
  ctx.lineWidth = line;
  ctx.stroke();
  ctx.restore();
}
function drawCursor(ctx, kind, x, y, size, tick = 0) {
  if (kind === "select") {
    drawSelection(ctx, x - size / 2, y - size / 2, size, size, size / 32, tick);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const accent = kind === "attack" ? "#ffb47d" : kind === "confirm" ? "#a5ebbd" : "#b9e6e8";
  ctx.strokeStyle = "#15232cd9";
  ctx.lineWidth = 2.2;
  const path = () => {
    ctx.beginPath();
    if (kind === "move") {
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
        const p = (u, v) => [u * c - v * s, u * s + v * c];
        const a0 = p(-3, -11), a1 = p(0, -7.5), a2 = p(3, -11);
        ctx.moveTo(a0[0], a0[1]);
        ctx.lineTo(a1[0], a1[1]);
        ctx.lineTo(a2[0], a2[1]);
      }
    } else if (kind === "attack") {
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      }
    } else {
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.moveTo(-6, 0);
      ctx.lineTo(-1, 5);
      ctx.lineTo(7, -5);
    }
  };
  path();
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 0.85;
  path();
  ctx.stroke();
  if (kind !== "confirm") {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// web/src/gfx/construction-activity.ts
function drawConstructionActivity(ctx, s, tick) {
  const t = (tick + s.id * 13) % 72;
  if (t > 16) return;
  const x = (s.x + s.w * 0.74) * 32, y = (s.y + s.h * 0.77) * 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.sin(Math.PI * (t + 1) / 18) ** 2;
  ctx.shadowColor = "#b9ddff";
  ctx.shadowBlur = 2;
  ctx.fillStyle = "#f1f6ff";
  ctx.beginPath();
  ctx.arc(0, 0, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 0.22;
  ctx.strokeStyle = "#ffca71";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4 + s.id, r = 1 + (t + i * 3) % 11 * 0.18;
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a) * (r + 0.7), Math.sin(a) * (r + 0.7) + 0.2);
  }
  ctx.stroke();
  ctx.restore();
}

// web/src/gfx/terrain-masks.ts
function visualHash(x, y) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return (n ^ n >>> 16) >>> 0;
}

// web/src/gfx/vehicle-tracks.ts
var VehicleTracks = class {
  marks = [];
  last = /* @__PURE__ */ new WeakMap();
  tick = -1;
  stamps;
  constructor() {
    this.stamps = Array.from({ length: 4 }, (_, index) => {
      const c = document.createElement("canvas");
      c.width = 96;
      c.height = 32;
      const g = c.getContext("2d");
      g.scale(8, 8);
      const rock = index >= 2, wheel = !!(index % 2);
      g.strokeStyle = rock ? "#302c27" : "#49321e";
      g.lineWidth = wheel ? 0.35 : 0.42;
      g.lineCap = "round";
      if (wheel) {
        for (const x of [-4, 4]) {
          g.beginPath();
          g.moveTo(6 + x - 0.22, 0);
          g.lineTo(6 + x - 0.22, 4);
          g.moveTo(6 + x + 0.22, 0);
          g.lineTo(6 + x + 0.22, 4);
          g.stroke();
        }
      } else for (const x of [-4, 4]) {
        if (!rock) {
          g.fillStyle = "#70513055";
          g.fillRect(6 + x - 1, 0, 2, 4);
        }
        for (const y of [0.65, 2]) {
          g.beginPath();
          g.moveTo(6 + x - 0.8, y + 0.2);
          g.lineTo(6 + x + 0.8, y - 0.2);
          g.stroke();
        }
        if (!rock) {
          g.strokeStyle = "#e9ca8d";
          g.lineWidth = 0.18;
          g.beginPath();
          g.moveTo(6 + x - 0.8, 2.45);
          g.lineTo(6 + x + 0.8, 2.05);
          g.stroke();
          g.strokeStyle = "#49321e";
          g.lineWidth = 0.42;
        }
      }
      return c;
    });
  }
  reset() {
    this.marks = [];
    this.last = /* @__PURE__ */ new WeakMap();
    this.tick = -1;
  }
  update(units, tick, isRock) {
    if (tick === this.tick) return;
    this.tick = tick;
    this.marks = this.marks.filter((m) => tick >= m.tick && tick - m.tick < 1800);
    for (const u of units) {
      if (u.air || u.type < 7 || u.type > 17) continue;
      const old = this.last.get(u.ref), current = { x: u.x, y: u.y, tick, remainder: old?.remainder ?? 0 };
      this.last.set(u.ref, current);
      if (!old || tick - old.tick > 10) continue;
      const dx = u.x - old.x, dy = u.y - old.y, distance = Math.hypot(dx, dy);
      if (distance > 24) {
        current.remainder = 0;
        continue;
      }
      if (distance < 1e-3) continue;
      const wheel = u.type >= 13 && u.type <= 15, spacing = wheel ? 1.5 : 1.35;
      const heading = Math.atan2(dx, -dy) * 128 / Math.PI;
      const rear = along(heading, -(u.type === 16 ? 10 : 6));
      for (let d = spacing - old.remainder; d <= distance; d += spacing) {
        const f = d / distance, x = old.x + dx * f + rear.x, y = old.y + dy * f + rear.y;
        this.marks.push({ x, y, angle: heading, tick, rock: isRock(x, y), wheel, width: u.type === 10 ? 20 : u.type === 16 ? 17 : wheel ? 12 : 15 });
      }
      current.remainder = (old.remainder + distance) % spacing;
    }
    if (this.marks.length > 2200) this.marks.splice(0, this.marks.length - 2200);
  }
  draw(ctx, tick, isVisible) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (const m of this.marks) {
      if (!isVisible(m.x, m.y)) continue;
      const age = (tick - m.tick) / 1800;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(angleRadians(m.angle));
      ctx.globalAlpha = (m.rock ? 0.16 : 0.62) * Math.pow(Math.max(0, 1 - age), 1.4);
      ctx.drawImage(this.stamps[(m.rock ? 2 : 0) + (m.wheel ? 1 : 0)], -m.width / 2, -1, m.width, 2.6);
      ctx.restore();
    }
    ctx.restore();
  }
};

// web/src/gfx/refinery-activity.ts
function refineryActivity(s) {
  const linked = s.o.linkedID === 255 ? null : G.units[s.o.linkedID];
  const docked = linked?.o.flags.used && linked.o.type === 16 && linked.o.flags.isNotOnMap ? linked : null;
  const reserved = indexGetUnit(s.o.script.variables[4]);
  const destination = indexEncode(s.o.index, 3 /* STRUCTURE */);
  const incoming = G.unitFind.some((u) => u.o.flags.used && u.o.houseID === s.o.houseID && u.targetMove === destination && (u.o.type === 16 || u.o.type === 0 && u.o.linkedID !== 255 && G.units[u.o.linkedID]?.o.type === 16));
  return { active: !!docked || incoming || !!(reserved?.o.flags.used && (reserved.o.type === 16 || reserved.o.type === 0)), docked };
}
function drawRefineryActivity(ctx, s, vehicles, tick) {
  if (s.type !== 12) return;
  const { active, docked: u } = refineryActivity(s.ref);
  if (!active) return;
  const x = s.x * 32, y = s.y * 32;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if (active) {
    ctx.shadowColor = "#e4f4ff";
    ctx.shadowBlur = 1.2;
    let light = 0;
    for (const yy of [28, 36, 44, 52, 60]) for (const xx of [66.5, 92]) {
      const pulse = 0.12 + 0.88 * Math.pow(0.5 + 0.5 * Math.sin(tick * Math.PI / 8 + light++ * 1.15), 2);
      ctx.fillStyle = `rgba(242,249,255,${pulse})`;
      ctx.beginPath();
      ctx.arc(x + xx, y + yy, 0.42 + pulse * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
  if (!u) {
    ctx.restore();
    return;
  }
  const harvester = {
    id: -1,
    ref: u,
    type: 16,
    house: s.house,
    x: x + 80,
    y: y + 48,
    orientation: 0,
    turret: 0,
    anim: 0,
    state: {},
    air: false,
    shadow: false,
    highlighted: false,
    hp: 256,
    smoke: -1,
    dust: -1
  };
  vehicles?.draw(ctx, harvester, tick);
  ctx.restore();
}

// web/src/view/mapview.ts
var ZOOMS = [1, 2, 3, 4, 5, 6];
var EDGE_PX = 10;
var MOUSE_SCROLL = 1100;
var FRAME = 1 / 60;
var CURSOR_MIN = 1;
var CURSOR_MAX = 3;
var CURSOR_ACCEL = 1 / 16;
var CURSOR_MARGIN = 64;
var FAST_SCROLL = [7, 14];
var FAST_SCROLL_DELAY = 60;
var DRAG_START = 6;
var MapView = class {
  constructor(canvas, icons, sprites, _cursors, pad, skins, terrain = null, vehicles = null, particles = null, infantry = null) {
    this.icons = icons;
    this.sprites = sprites;
    this.pad = pad;
    this.skins = skins;
    this.terrain = terrain;
    this.vehicles = vehicles;
    this.particles = particles;
    this.infantry = infantry;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.bindMouse();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    requestAnimationFrame((t) => this.tick(t));
  }
  icons;
  sprites;
  pad;
  skins;
  terrain;
  vehicles;
  particles;
  infantry;
  canvas;
  ctx;
  world = null;
  camX = 0;
  camY = 0;
  /** Экранных CSS-пикселей на мировой пиксель, одинаково на обычном и HiDPI-экране. */
  zoom = 2;
  pixelRatio = 1;
  /** Физических пикселей холста на мировой пиксель: HD-графика рисуется в нативном разрешении. */
  get pixelScale() {
    return this.zoom * this.pixelRatio;
  }
  showGrid = false;
  mouseMode = false;
  cursorX = 0;
  cursorY = 0;
  cursorKind = "select";
  selectedUnits = /* @__PURE__ */ new Set();
  selectedStructure = null;
  onChange = () => {
  };
  /** A: щелчок левой или кнопка 1 — мировые координаты точки */
  onPrimary = () => {
  };
  /** правая кнопка мыши */
  onSecondary = () => {
  };
  /** рамка выделения (мировые координаты) */
  onBox = () => {
  };
  /** каждый игровой кадр (1/60 с) */
  onFrame = () => {
  };
  mouse = { x: 0, y: 0, inside: false };
  pan = null;
  box = null;
  holdTime = 0;
  dirty = true;
  last = 0;
  acc = 0;
  tracks = new VehicleTracks();
  /** клетка тумана (g_veiledTileID) — рисуется чёрной */
  veiledIcon = 0;
  /** постановка здания: размер и годность места (1 — да, <0 — без бетона, 0 — нельзя), cells — годность каждой клетки */
  placement = null;
  /** значки над зданиями («OK», молоток, молния): описание спрайта ROM */
  structureIcons = [];
  stripes = /* @__PURE__ */ new Map();
  drawIcon(id, x, y, size, allowHD = true) {
    if (this.skins.iconOverridden[id]) {
      this.ctx.drawImage(this.skins.scaled(`icon:${id}`, size, size), x, y);
      return;
    }
    const s = (allowHD ? this.sprites.mapEffects?.icon(id) : null) ?? this.icons.source(id);
    const smooth = this.ctx.imageSmoothingEnabled;
    if (s.sw > 32) this.ctx.imageSmoothingEnabled = true;
    this.ctx.drawImage(s.image, s.sx, s.sy, s.sw, s.sh, x, y, size, size);
    this.ctx.imageSmoothingEnabled = smooth;
  }
  setWorld(world, focusX, focusY) {
    this.resize();
    this.world = world;
    this.vehicles?.reset();
    this.particles?.reset();
    this.tracks.reset();
    this.infantry?.reset();
    this.terrain?.setMap(world.map);
    this.selectedUnits.clear();
    this.selectedStructure = null;
    this.zoom = this.defaultZoom();
    this.cursorX = focusX;
    this.cursorY = focusY;
    this.centerOn(focusX, focusY);
    this.invalidate();
  }
  /** Масштаб, при котором по вертикали видно около 14 клеток. */
  defaultZoom() {
    const z = Math.round(this.canvas.height / this.pixelRatio / (14 * CELL_PX));
    return Math.min(Math.max(z, ZOOMS[0]), ZOOMS[ZOOMS.length - 1]);
  }
  viewSize() {
    return { w: this.canvas.width / this.pixelScale, h: this.canvas.height / this.pixelScale };
  }
  centerOn(wx, wy) {
    const v = this.viewSize();
    this.camX = wx - v.w / 2;
    this.camY = wy - v.h / 2;
    this.clampCamera();
  }
  setZoom(z, anchorX = this.canvas.width / 2, anchorY = this.canvas.height / 2) {
    z = Math.min(Math.max(z, ZOOMS[0]), ZOOMS[ZOOMS.length - 1]);
    if (z === this.zoom) return;
    const wx = this.camX + anchorX / this.pixelScale;
    const wy = this.camY + anchorY / this.pixelScale;
    this.zoom = z;
    this.camX = wx - anchorX / this.pixelScale;
    this.camY = wy - anchorY / this.pixelScale;
    this.clampCamera();
  }
  setMouseMode(on) {
    this.mouseMode = on;
    this.dirty = true;
    this.onChange();
  }
  cursorCell() {
    if (!this.world) return null;
    const x = Math.floor(this.cursorX / CELL_PX);
    const y = Math.floor(this.cursorY / CELL_PX);
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return null;
    return { x, y, icon: this.world.map.ground[y << 6 | x] };
  }
  invalidate() {
    this.dirty = true;
  }
  clampCamera() {
    if (!this.world) return;
    const b = this.world.map.bounds;
    const v = this.viewSize();
    const minX = b.x * CELL_PX;
    const minY = b.y * CELL_PX;
    const maxX = (b.x + b.w) * CELL_PX - v.w;
    const maxY = (b.y + b.h) * CELL_PX - v.h;
    this.camX = maxX < minX ? (minX + maxX) / 2 : Math.min(Math.max(this.camX, minX), maxX);
    this.camY = maxY < minY ? (minY + maxY) / 2 : Math.min(Math.max(this.camY, minY), maxY);
    this.dirty = true;
    this.onChange();
  }
  clampCursor() {
    if (!this.world) return;
    const b = this.world.map.bounds;
    this.cursorX = Math.min(Math.max(this.cursorX, b.x * CELL_PX), (b.x + b.w) * CELL_PX - 1);
    this.cursorY = Math.min(Math.max(this.cursorY, b.y * CELL_PX), (b.y + b.h) * CELL_PX - 1);
  }
  /** Камера догоняет курсор, если он подошёл к краю ближе CURSOR_MARGIN. */
  followCursor() {
    const v = this.viewSize();
    const m = Math.min(CURSOR_MARGIN, v.w / 3, v.h / 3);
    if (this.cursorX < this.camX + m) this.camX = this.cursorX - m;
    if (this.cursorX > this.camX + v.w - m) this.camX = this.cursorX - v.w + m;
    if (this.cursorY < this.camY + m) this.camY = this.cursorY - m;
    if (this.cursorY > this.camY + v.h - m) this.camY = this.cursorY - v.h + m;
    this.clampCamera();
  }
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (w === this.canvas.width && h === this.canvas.height && dpr === this.pixelRatio) return;
    const v = this.viewSize();
    const cx = this.camX + v.w / 2;
    const cy = this.camY + v.h / 2;
    this.pixelRatio = dpr;
    this.canvas.width = w;
    this.canvas.height = h;
    this.centerOn(cx, cy);
  }
  // ------------------------------------------------------------------ мышь
  toCanvas(e) {
    const c = this.canvas;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  toWorld(x, y) {
    return { x: this.camX + x / this.pixelScale, y: this.camY + y / this.pixelScale };
  }
  bindMouse() {
    const c = this.canvas;
    c.addEventListener("pointermove", (e) => {
      const p = this.toCanvas(e);
      this.mouse = { x: p.x, y: p.y, inside: true };
      if (this.pan && this.pan.id === e.pointerId) {
        this.camX = this.pan.cx - (p.x - this.pan.x) / this.pixelScale;
        this.camY = this.pan.cy - (p.y - this.pan.y) / this.pixelScale;
        this.clampCamera();
      }
      if (this.box && this.box.id === e.pointerId) {
        if (!this.box.active && Math.hypot(p.x - this.box.x, p.y - this.box.y) > DRAG_START * (window.devicePixelRatio || 1)) this.box.active = true;
        this.dirty = true;
      }
      if (this.mouseMode) this.cursorToMouse();
    });
    c.addEventListener("pointerleave", () => this.mouse.inside = false);
    c.addEventListener("pointerdown", (e) => {
      c.focus();
      const p = this.toCanvas(e);
      if (e.button === 1) {
        e.preventDefault();
        this.pan = { id: e.pointerId, x: p.x, y: p.y, cx: this.camX, cy: this.camY };
        c.setPointerCapture(e.pointerId);
        return;
      }
      if (!this.mouseMode) return;
      this.mouse = { x: p.x, y: p.y, inside: true };
      this.cursorToMouse();
      if (e.button === 0) {
        this.box = { id: e.pointerId, x: p.x, y: p.y, active: false };
        c.setPointerCapture(e.pointerId);
      } else if (e.button === 2) {
        this.onSecondary();
      }
    });
    const up = (e) => {
      if (this.pan?.id === e.pointerId) this.pan = null;
      if (this.box?.id === e.pointerId) {
        const b = this.box;
        this.box = null;
        this.dirty = true;
        if (e.type === "pointercancel") return;
        const p = this.toCanvas(e);
        if (b.active) {
          const a = this.toWorld(b.x, b.y);
          const z = this.toWorld(p.x, p.y);
          this.onBox({ x0: Math.min(a.x, z.x), y0: Math.min(a.y, z.y), x1: Math.max(a.x, z.x), y1: Math.max(a.y, z.y) });
        } else {
          this.onPrimary(this.cursorX, this.cursorY);
        }
      }
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    c.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const p = this.toCanvas(e);
        this.setZoom(this.zoom + (e.deltaY < 0 ? 1 : -1), p.x, p.y);
        if (this.mouseMode) this.cursorToMouse();
      },
      { passive: false }
    );
  }
  cursorToMouse() {
    const w = this.toWorld(this.mouse.x, this.mouse.y);
    this.cursorX = w.x;
    this.cursorY = w.y;
    this.clampCursor();
    this.dirty = true;
    this.onChange();
  }
  // ------------------------------------------------------------------ цикл
  tick(t) {
    if ((window.devicePixelRatio || 1) !== this.pixelRatio) this.resize();
    const dt = this.last ? Math.min((t - this.last) / 1e3, 0.1) : 0;
    this.last = t;
    this.acc += dt;
    while (this.acc >= FRAME) {
      this.acc -= FRAME;
      this.step();
      this.onFrame();
      this.dirty = true;
    }
    if (this.mouseMode && this.mouse.inside && !this.pan && document.hasFocus()) this.edgeScroll(dt);
    if (this.dirty) this.draw();
    requestAnimationFrame((tt) => this.tick(tt));
  }
  /** крестовина занята меню: курсор стоит */
  inputLocked = false;
  fastTime = 0;
  /** выбранный геймпадом юнит (метка «стрелки» над ним, как в оригинале) */
  markedUnit = null;
  /** Один кадр управления с крестовины. */
  step() {
    if (this.inputLocked) return;
    const p = this.pad;
    const dx = (p.isHeld("right") ? 1 : 0) - (p.isHeld("left") ? 1 : 0);
    const dy = (p.isHeld("down") ? 1 : 0) - (p.isHeld("up") ? 1 : 0);
    if (!dx && !dy) {
      this.holdTime = 0;
      this.fastTime = 0;
      return;
    }
    if (p.isHeld("c") || this.mouseMode) {
      const cx = this.camX;
      const cy = this.camY;
      const speed2 = FAST_SCROLL[this.fastTime < FAST_SCROLL_DELAY ? 0 : 1];
      this.fastTime++;
      this.camX += dx * speed2;
      this.camY += dy * speed2;
      this.clampCamera();
      this.cursorX += this.camX - cx;
      this.cursorY += this.camY - cy;
      this.clampCursor();
      this.onChange();
      return;
    }
    this.fastTime = 0;
    const speed = Math.min(CURSOR_MAX, CURSOR_MIN + this.holdTime * CURSOR_ACCEL);
    this.holdTime++;
    this.cursorX += dx * speed;
    this.cursorY += dy * speed;
    this.clampCursor();
    this.followCursor();
    this.onChange();
  }
  edgeScroll(dt) {
    const edge = EDGE_PX * (window.devicePixelRatio || 1);
    const dx = (this.mouse.x > this.canvas.width - edge ? 1 : 0) - (this.mouse.x < edge ? 1 : 0);
    const dy = (this.mouse.y > this.canvas.height - edge ? 1 : 0) - (this.mouse.y < edge ? 1 : 0);
    if (!dx && !dy) return;
    const s = MOUSE_SCROLL * dt / this.zoom;
    this.camX += dx * s;
    this.camY += dy * s;
    this.clampCamera();
    this.cursorToMouse();
  }
  // ------------------------------------------------------------------ отрисовка
  draw() {
    this.dirty = false;
    const ctx = this.ctx;
    const z = this.pixelScale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const world = this.world;
    if (!world) return;
    ctx.imageSmoothingEnabled = false;
    const ox = Math.round(this.camX * z);
    const oy = Math.round(this.camY * z);
    const v = this.viewSize();
    const x0 = Math.max(0, Math.floor(this.camX / CELL_PX));
    const y0 = Math.max(0, Math.floor(this.camY / CELL_PX));
    const x1 = Math.min(MAP_SIZE - 1, Math.floor((this.camX + v.w) / CELL_PX));
    const y1 = Math.min(MAP_SIZE - 1, Math.floor((this.camY + v.h) / CELL_PX));
    const size = CELL_PX * z;
    const map = world.map;
    const buildingFloor = new Uint8Array(4096);
    const buildingImages = /* @__PURE__ */ new Map();
    for (const st of world.structures) {
      if (st.x > x1 || st.y > y1 || st.x + st.w <= x0 || st.y + st.h <= y0) continue;
      const image = st.built ? this.skins.structure(st.type, st.w * size, st.h * size, st.ref.rotationSpriteDiff) : [0, 1, 14].includes(st.type) ? null : this.sprites.mapEffects?.constructionSite;
      if (!image) continue;
      buildingImages.set(st, image);
      for (let row = 0; row < st.h; row++) for (let col = 0; col < st.w; col++) {
        if (map.inBounds(st.x + col, st.y + row)) buildingFloor[st.y + row << 6 | st.x + col] = 1;
      }
    }
    this.terrain?.draw(ctx, ox / z, oy / z, z);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!map.inBounds(x, y)) continue;
        const p = y << 6 | x;
        const ov = map.overlay[p];
        if (ov === this.veiledIcon && this.veiledIcon !== 0) {
          ctx.fillStyle = "#000";
          ctx.fillRect(x * size - ox, y * size - oy, size, size);
          continue;
        }
        const id = map.ground[p];
        if (this.terrain?.kinds[id] === 11 && !this.skins.iconOverridden[id]) {
          let connections = 0;
          for (const [dx, dy, bit] of [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]]) {
            const nx = x + dx, ny = y + dy;
            if (map.inBounds(nx, ny) && this.terrain.kinds[map.ground[ny << 6 | nx]] === 11) connections |= bit;
          }
          drawWall(ctx, x * size - ox, y * size - oy, size, connections, this.sprites.mapEffects?.icon(126)?.image);
        } else if (buildingFloor[p]) this.drawIcon(126, x * size - ox, y * size - oy, size);
        else if (!this.terrain || !this.terrain.covers(id) || this.skins.iconOverridden[id] || this.terrain.kinds[id] === 13 || this.terrain.kinds[id] === 14) {
          this.drawIcon(id, x * size - ox, y * size - oy, size, this.terrain !== null);
        }
        if (ov !== 0) this.drawIcon(ov, x * size - ox, y * size - oy, size);
      }
    }
    const isVisible = (x, y) => {
      const cx = Math.floor(x / CELL_PX), cy = Math.floor(y / CELL_PX);
      return map.inBounds(cx, cy) && (!this.veiledIcon || map.overlay[cy << 6 | cx] !== this.veiledIcon);
    };
    this.tracks.update(world.units, G.timerGame, (x, y) => this.terrain?.isRockAt(x, y) ?? false);
    ctx.save();
    ctx.setTransform(z, 0, 0, z, -ox, -oy);
    this.tracks.draw(ctx, G.timerGame, isVisible);
    ctx.restore();
    this.infantry?.update(world.units, G.timerGame);
    ctx.save();
    ctx.setTransform(z, 0, 0, z, -ox, -oy);
    this.infantry?.drawCorpses(ctx, G.timerGame, isVisible);
    ctx.restore();
    for (const st of world.structures) {
      if (st.x > x1 || st.y > y1 || st.x + st.w <= x0 || st.y + st.h <= y0) continue;
      const img = buildingImages.get(st);
      if (!img) continue;
      for (let row = 0; row < st.h; row++) for (let col = 0; col < st.w; col++) {
        const x = st.x + col;
        const y = st.y + row;
        if (x < x0 || x > x1 || y < y0 || y > y1 || !map.inBounds(x, y)) continue;
        const ov = map.overlay[y << 6 | x];
        if (ov === this.veiledIcon && this.veiledIcon !== 0) continue;
        const sw = img.width / st.w, sh = img.height / st.h;
        ctx.drawImage(img, col * sw, row * sh, sw, sh, x * size - ox, y * size - oy, size, size);
        if (ov !== 0) this.drawIcon(ov, x * size - ox, y * size - oy, size);
      }
      if (st.type === 12 || !st.built) {
        ctx.save();
        ctx.beginPath();
        for (let row = 0; row < st.h; row++) for (let col = 0; col < st.w; col++) {
          const x = st.x + col, y = st.y + row;
          if (isVisible(x * 32 + 16, y * 32 + 16)) ctx.rect(x * size - ox, y * size - oy, size, size);
        }
        ctx.clip();
        ctx.setTransform(z, 0, 0, z, -ox, -oy);
        if (!st.built) drawConstructionActivity(ctx, st, G.timerGame);
        else drawRefineryActivity(ctx, st, this.vehicles, G.timerGame);
        ctx.restore();
      }
    }
    if (this.showGrid) this.drawGrid(x0, y0, x1, y1, size, ox, oy);
    const margin = 32;
    const visible = world.units.filter(
      (u) => u.x > this.camX - margin && u.x < this.camX + v.w + margin && u.y > this.camY - margin && u.y < this.camY + v.h + margin
    );
    visible.sort((a, b) => (a.air ? 1e5 : 0) + a.y - ((b.air ? 1e5 : 0) + b.y));
    const drawEffect = (spriteID, x, y, seed = 0) => {
      const img = this.sprites.effect(spriteID);
      if (!img) return;
      const hd = img.worldWidth !== void 0;
      ctx.save();
      ctx.imageSmoothingEnabled = hd;
      ctx.translate(Math.round(x * z) - ox, Math.round(y * z) - oy);
      if (hd && seed) {
        const variation = visualHash(seed, 73);
        const scale = 0.96 + (variation & 255) / 255 * 0.08;
        ctx.rotate((variation >>> 8 & 255) / 255 * 0.12 - 0.06);
        ctx.scale(scale, scale);
      }
      ctx.drawImage(
        img.canvas,
        img.ox * z,
        img.oy * z,
        (img.worldWidth ?? img.canvas.width) * z,
        (img.worldHeight ?? img.canvas.height) * z
      );
      ctx.restore();
    };
    const drawBlasts = () => {
      for (const b of world.blasts) {
        if (b.type === 13 && this.sprites.wormArt) {
          ctx.save();
          ctx.setTransform(z, 0, 0, z, -ox, -oy);
          this.sprites.wormArt.swallow(ctx, b.x, b.y, b.age);
          ctx.restore();
        } else drawEffect(b.spriteID, b.x, b.y, b.x * 8 ^ b.type * 997);
      }
      drawParticles("air");
    };
    const drawParticles = (layer) => {
      if (!this.particles) return;
      ctx.save();
      ctx.setTransform(z, 0, 0, z, -ox, -oy);
      this.particles.draw(ctx, G.timerGame, layer, isVisible);
      ctx.restore();
    };
    drawParticles("ground");
    let blastsDrawn = false;
    for (const u of visible) {
      if (u.air && !blastsDrawn) {
        drawBlasts();
        blastsDrawn = true;
      }
      if (u.type === 25 && world.blasts.some((b) => b.type === 13 && Math.hypot(b.x - u.x, b.y - u.y) < 16)) {
        continue;
      }
      const skin = this.sprites.unitSkin(u.type, u.orientation, u.anim >> 3, u.turret, u.state.recoil);
      if (skin) {
        const c = this.skins.scaled(skin.key, skin.box * z, skin.box * z);
        if (u.shadow) {
          ctx.globalAlpha = 0.35;
          ctx.filter = "brightness(0)";
          ctx.drawImage(c, Math.round((u.x - skin.box / 2 + 4) * z) - ox, Math.round((u.y - skin.box / 2 + 10) * z) - oy);
          ctx.filter = "none";
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(c, Math.round((u.x - skin.box / 2) * z) - ox, Math.round((u.y - skin.box / 2) * z) - oy);
      } else if ((this.vehicles || this.infantry || this.sprites.wormArt) && (() => {
        ctx.save();
        ctx.setTransform(z, 0, 0, z, -ox, -oy);
        const drawn = this.sprites.wormArt?.draw(ctx, u, G.timerGame) || this.vehicles?.draw(ctx, u, G.timerGame) || this.infantry?.draw(ctx, u, G.timerGame);
        ctx.restore();
        return drawn;
      })()) {
      } else {
        for (const f of this.sprites.unitFrames(u.type, u.orientation, u.anim >> 3, u.turret, u.state)) {
          const img = this.sprites.get(f, u.house);
          const dx = Math.round((u.x + img.ox) * z) - ox;
          const dy = Math.round((u.y + img.oy) * z) - oy;
          if (u.shadow) {
            ctx.globalAlpha = 0.35;
            ctx.filter = "brightness(0)";
            ctx.drawImage(img.canvas, dx + 4 * z, dy + 10 * z, img.canvas.width * z, img.canvas.height * z);
            ctx.filter = "none";
            ctx.globalAlpha = 1;
          }
          ctx.drawImage(img.canvas, dx, dy, img.canvas.width * z, img.canvas.height * z);
          if (u.highlighted) {
            ctx.globalAlpha = 0.5;
            ctx.globalCompositeOperation = "lighter";
            ctx.drawImage(img.canvas, dx, dy, img.canvas.width * z, img.canvas.height * z);
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
          }
        }
      }
      if (u.dust >= 0) {
        const img = this.sprites.harvestDust((u.orientation + 16 & 255) >> 5, u.dust);
        ctx.save();
        ctx.imageSmoothingEnabled = img.worldWidth !== void 0;
        ctx.drawImage(
          img.canvas,
          Math.round((u.x + img.ox) * z) - ox,
          Math.round((u.y + img.oy) * z) - oy,
          (img.worldWidth ?? img.canvas.width) * z,
          (img.worldHeight ?? img.canvas.height) * z
        );
        ctx.restore();
      }
      if (u.smoke >= 0) drawEffect(180 + u.smoke, u.x, u.y - 14);
    }
    if (!blastsDrawn) drawBlasts();
    if (this.placement) {
      const pl = this.placement;
      const cx = Math.floor(this.cursorX / CELL_PX);
      const cy = Math.floor(this.cursorY / CELL_PX);
      ctx.save();
      for (let y = 0; y < pl.h; y++) {
        for (let x = 0; x < pl.w; x++) {
          const idx = y * pl.w + x;
          const ok = pl.cells ? !!pl.cells[idx] : pl.valid !== 0;
          ctx.fillStyle = this.stripePattern(ok ? "#2fa83a" : "#d02a1e", z);
          ctx.fillRect((cx + x) * size - ox, (cy + y) * size - oy, size, size);
        }
      }
      ctx.restore();
    }
    for (const { s: s2, def, kind } of this.structureIcons) {
      const img = this.sprites.statusDef(def);
      if (kind) {
        const x = (s2.x * CELL_PX + img.ox + img.canvas.width / 2) * z - ox;
        const y = (s2.y * CELL_PX + img.oy + img.canvas.height / 2) * z - oy;
        if (!map.inBounds(s2.x, s2.y) || this.veiledIcon && map.overlay[s2.y << 6 | s2.x] === this.veiledIcon) continue;
        drawStatusIcon(ctx, kind, x, y, 14 * z, G.timerGame, s2.ref.o.index);
        continue;
      }
      ctx.drawImage(img.canvas, Math.round((s2.x * CELL_PX + img.ox) * z) - ox, Math.round((s2.y * CELL_PX + img.oy) * z) - oy, img.canvas.width * z, img.canvas.height * z);
    }
    const s = this.selectedStructure;
    if (s) this.drawCorners(s.x * CELL_PX, s.y * CELL_PX, s.w * CELL_PX, s.h * CELL_PX, ox, oy);
    for (const u of this.selectedUnits) {
      if (u === this.markedUnit) continue;
      this.drawCorners(u.x - 14, u.y - 14, 28, 28, ox, oy);
    }
    if (this.markedUnit) {
      const u = this.markedUnit;
      drawCursor(ctx, "move", u.x * z - ox, u.y * z - oy, 32 * z, G.timerGame);
    }
    if (this.box?.active) {
      const a = this.box;
      ctx.strokeStyle = "#f4f4f4";
      ctx.lineWidth = Math.max(1, Math.round(z / 2));
      ctx.strokeRect(Math.min(a.x, this.mouse.x) + 0.5, Math.min(a.y, this.mouse.y) + 0.5, Math.abs(this.mouse.x - a.x), Math.abs(this.mouse.y - a.y));
    }
    if (this.placement) return;
    drawCursor(ctx, this.cursorKind, this.cursorX * z - ox, this.cursorY * z - oy, 32 * z, G.timerGame);
  }
  stripePattern(color, z) {
    const key = `${color}:${z}`;
    let p = this.stripes.get(key);
    if (!p) {
      const n = 4 * z;
      const c = document.createElement("canvas");
      c.width = c.height = n;
      const g = c.getContext("2d");
      g.fillStyle = color;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % n < n / 2) g.fillRect(i, j, 1, 1);
      p = this.ctx.createPattern(c, "repeat");
      this.stripes.set(key, p);
    }
    return p;
  }
  drawCorners(x, y, w, h, ox, oy) {
    const z = this.pixelScale;
    drawSelection(this.ctx, x * z - ox, y * z - oy, w * z, h * z, z, G.timerGame);
  }
  drawGrid(x0, y0, x1, y1, size, ox, oy) {
    const ctx = this.ctx;
    const map = this.world.map;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) {
      ctx.moveTo(x * size - ox + 0.5, y0 * size - oy);
      ctx.lineTo(x * size - ox + 0.5, (y1 + 1) * size - oy);
    }
    for (let y = y0; y <= y1 + 1; y++) {
      ctx.moveTo(x0 * size - ox, y * size - oy + 0.5);
      ctx.lineTo((x1 + 1) * size - ox, y * size - oy + 0.5);
    }
    ctx.stroke();
    if (size < 48) return;
    ctx.font = `${Math.round(size / 4)}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = "top";
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!map.inBounds(x, y)) continue;
        const label = String(map.ground[y << 6 | x]);
        const px = x * size - ox + 3;
        const py = y * size - oy + 3;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(px - 2, py - 1, ctx.measureText(label).width + 4, size / 4 + 2);
        ctx.fillStyle = "#f3d27a";
        ctx.fillText(label, px, py);
      }
    }
  }
};

// web/src/gfx/building-portraits.ts
var BUILDING_PORTRAIT_SHEETS = [
  { key: "buildingPortraitsA", types: [0, 2, 8, 9], cols: 2, rows: 2 },
  { key: "buildingPortraitsB", types: [3, 5, 7, 10], cols: 2, rows: 2 },
  { key: "buildingPortraitsC", types: [11, 12, 13, 18], cols: 2, rows: 2 },
  { key: "buildingPortraitsD", types: [14, 15, 16, 17], cols: 2, rows: 2 }
];
var BUILDING_ICON_SHEETS = [
  { key: "buildingIconsA", types: [0, 2, 3, 5, 7, 8, 9, 11, 12], cols: 3, rows: 3 },
  { key: "buildingIconsB", types: [13, 14, 15, 16, 17, 18], cols: 3, rows: 2 }
];
var SHARED = { 1: 0, 4: 3, 6: 3 };
var SHARED_SMALL = { 1: 0, 4: 3, 6: 8, 10: 7 };
var BuildingPortraits = class {
  constructor(rom, gfx) {
    this.rom = rom;
    this.gfx = gfx;
  }
  rom;
  gfx;
  cache = /* @__PURE__ */ new Map();
  image(type, small = false) {
    const key = `${type}:${small}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const shared = small ? SHARED_SMALL : SHARED;
    const sourceType = shared[type] ?? type;
    const sheet = (small ? BUILDING_ICON_SHEETS : BUILDING_PORTRAIT_SHEETS).find((s) => s.types.includes(sourceType));
    const atlas = sheet && this.gfx.art.get(sheet.key);
    const c = document.createElement("canvas");
    c.width = small ? 128 : 384;
    c.height = small ? 96 : 224;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = true;
    if (atlas && sheet) {
      const index = sheet.types.indexOf(sourceType), sw = atlas.width / sheet.cols, sh = atlas.height / sheet.rows;
      const sx = index % sheet.cols * sw, sy = Math.floor(index / sheet.cols) * sh;
      g.drawImage(atlas, sx, sy, sw, sh, 0, 0, c.width, c.height);
    } else if (small) {
      const original = this.gfx.factoryIcon(false, type);
      if (!original) return null;
      g.drawImage(original, 0, 0, c.width, c.height);
    } else {
      const p = this.rom.structurePictures().find((p2) => p2.id === type);
      if (!p) return null;
      const original = document.createElement("canvas");
      original.width = p.width;
      original.height = p.height;
      original.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(p.pixels), p.width, p.height), 0, 0);
      g.drawImage(original, 0, 0, c.width, c.height);
    }
    this.cache.set(key, c);
    return c;
  }
};

// web/src/ui/hud.ts
var HUD_ROM = {
  /** таблица кадров: 8 байт — указатель на сырые тайлы, байт +4: FE — строка палитры 1, FF — строка 3 */
  frames: 396940,
  /** описания зданий по типу (указатели), +$14 — кадр картинки, +$10 — прочность, +$18 — время стройки */
  structureInfo: 440660,
  unitInfo: 443836,
  /** цифры кредитов: тайл (символ − 0x2F), пробел — тайл 0 */
  digits: 330452,
  /** цвет полосы прочности по номеру занятого тайла (0–3) */
  hpColors: 38722,
  /** знак запрета 3×3 тайла поверх иконки заказа (спрайт $FFC750, описание $065B3A), строка палитры 0 */
  prohibited: 416282,
  /** надпись «НЕТ ДЕНЕГ»: 11 сырых тайлов в строку, строка палитры 0 (спрайт $FFC862, описание $065CAE в (112, 112)) */
  noMoney: 416590,
  /** кадр иконки улучшения ($029536) и фрименов ($0297A2, $02993A) */
  upgradeFrame: 64,
  fremenTroopersFrame: 94,
  fremenFrame: 104
};
var BAR_LOW = 112;
function barFill(value, max) {
  if (value <= 0 || max <= 0) return -1;
  const v = Math.min(value, max);
  const q = Math.floor((v << 5 & 65535) / max);
  return (v << 5 & 65535) % max === 0 ? q - 1 : q;
}
var NoMoneyWarning = class {
  /** $FFC864 — сколько ещё показывать */
  display = -1;
  /** $FFC866 — пауза до следующего показа */
  cooldown = -1;
  /** бит 0 байта $7 спрайта */
  armed = false;
  shownFrames = 0;
  visible = false;
  reset() {
    this.display = -1;
    this.cooldown = -1;
    this.armed = false;
    this.visible = false;
  }
  update(settled) {
    if (!settled) {
      this.display = 90;
      this.cooldown = 0;
      this.armed = true;
      this.visible = false;
      return;
    }
    if (!this.armed) return;
    if (this.cooldown >= 0) {
      this.cooldown--;
      return;
    }
    if (--this.display < 0) {
      this.cooldown = 900;
      this.display = 60;
      this.visible = false;
    } else {
      if (!this.visible) this.shownFrames = 0;
      this.visible = true;
      this.shownFrames++;
    }
  }
  /** С учётом мигания спрайта ($0010B0, счётчик 8). */
  get drawn() {
    return this.visible && this.shownFrames % 9 !== 0;
  }
};
var CreditsTicker = class {
  /** $FFC058 — последнее досчитанное значение */
  reached = 0;
  /** $FFD6C0 — счётчик */
  old = 0;
  /** $FFD6BC — накопленный сдвиг */
  offset = 0;
  /** $FFD6B4: число обновлений счётчика; сохраняется и между миссиями. */
  soundTicks = 0;
  onSound = () => {
  };
  /** то, что выводится цифрами */
  shown = 0;
  noMoney = new NoMoneyWarning();
  /** Режим 2 (начало миссии): счёт с нуля до кредитов дома. */
  reset(credits) {
    this.reached = credits;
    this.old = 0;
    this.offset = 0;
    this.noMoney.reset();
    this.step(credits);
  }
  /** Режим 0 — раз в кадр. */
  tick(credits) {
    if (this.reached >>> 0 < 50) this.noMoney.update(this.reached === credits);
    if (this.reached === credits || this.old === credits) return;
    this.step(credits);
  }
  step(credits) {
    const diff = credits - this.old << 16 >> 16;
    if (diff === 0) this.offset = 0;
    else {
      let d = diff >> 2;
      if (d === 0) d = 1;
      this.offset += Math.max(-128, Math.min(128, d));
    }
    if (this.offset < 0 && this.old === 0) this.offset = 0;
    this.old += this.offset >> 3;
    if (this.offset < 0) this.old += 1;
    if (this.offset > 0) this.offset &= 7;
    if (this.offset < 0) this.offset |= ~7;
    if (this.old < 0) this.old = 0;
    this.reached = this.offset < 0 ? Math.max(0, this.old - 1) : this.old;
    this.shown = this.offset > 0 ? this.old + 1 : this.old;
    if ((this.soundTicks++ & 3) === 0) this.onSound(diff > 0 ? 52 : 53);
  }
};
var Hud = class {
  constructor(rom, portraits) {
    this.rom = rom;
    this.canvas.className = "hud";
    this.canvas.width = 256;
    this.canvas.height = 512;
    this.canvas.setAttribute("aria-hidden", "true");
    this.g = this.canvas.getContext("2d");
    this.palette = rom.gamePalette();
    this.warning.className = "hud-warning";
    this.warning.width = 704;
    this.warning.height = 64;
    this.warning.setAttribute("aria-hidden", "true");
    const w = this.warning.getContext("2d");
    w.scale(4, 4);
    w.fillStyle = "#151a20ed";
    w.fillRect(0, 0, 176, 16);
    w.strokeStyle = "#bd9453";
    w.strokeRect(0.5, 0.5, 175, 15);
    w.font = '600 9px "Segoe UI", sans-serif';
    w.fillStyle = "#ffe0a0";
    w.textAlign = "center";
    w.textBaseline = "middle";
    w.fillText("\u041D\u0415\u0414\u041E\u0421\u0422\u0410\u0422\u041E\u0427\u041D\u041E \u041A\u0420\u0415\u0414\u0418\u0422\u041E\u0412", 88, 8);
    for (const [kind, table, count] of [["structure", HUD_ROM.structureInfo, 19], ["unit", HUD_ROM.unitInfo, 27]]) {
      for (let type = 0; type < count; type++) {
        const info = readU32(rom.bytes, table + type * 4), frame = readU16(rom.bytes, info + 20);
        if (!this.pictures.has(frame)) {
          let crop = { x: 112, y: 68, w: 160, h: 120 };
          if (kind === "structure") {
            crop = { x: 0, y: 0, w: 128, h: 96 };
          }
          this.pictures.set(frame, { image: () => kind === "structure" ? portraits.icon(kind, type) : portraits.image(kind, type), crop });
        }
      }
    }
    this.pictures.set(HUD_ROM.fremenFrame, { image: () => portraits.image("unit", 4), crop: { x: 112, y: 68, w: 160, h: 120 } });
    this.pictures.set(HUD_ROM.fremenTroopersFrame, { image: () => portraits.image("unit", 5), crop: { x: 112, y: 68, w: 160, h: 120 } });
    this.warning.hidden = true;
  }
  rom;
  canvas = document.createElement("canvas");
  /** «НЕТ ДЕНЕГ» — посреди экрана: x 112…200, y 112 при экране 320×224 */
  warning = document.createElement("canvas");
  g;
  palette;
  key = "";
  credits = new CreditsTicker();
  pictures = /* @__PURE__ */ new Map();
  /** Перерисовать, если что-то поменялось. `state` — null, когда видны только кредиты. */
  draw(state) {
    this.warning.hidden = !this.credits.noMoney.drawn;
    const text = String(this.credits.shown).padStart(6, " ");
    const key = `${G.playerHouseID}|${text}|${JSON.stringify(state)}`;
    if (key === this.key) return;
    this.key = key;
    const g = this.g;
    g.clearRect(0, 0, 256, 512);
    g.save();
    g.scale(4, 4);
    g.imageSmoothingEnabled = true;
    g.textAlign = "right";
    g.font = '600 8px "Segoe UI", sans-serif';
    g.fillStyle = "#fff0cd";
    g.shadowColor = "#000";
    g.shadowBlur = 2;
    g.fillText(text.trim(), 60, 14);
    g.shadowBlur = 0;
    if (state) {
      if (state.portrait !== null) this.frame(state.portrait, 48);
      if (state.hp) {
        const p = barFill(state.hp.value, state.hp.max);
        if (p >= 0) this.bar(p, state.hp.value / state.hp.max > 0.5 ? "#76ba76" : state.hp.value / state.hp.max > 0.25 ? "#e6b859" : "#df6954", 80);
      }
      if (state.order !== null) this.frame(state.order, 88);
      if (state.prohibited) {
        g.strokeStyle = "#ff866e";
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(32, 104, 8, 0, Math.PI * 2);
        g.moveTo(26, 98);
        g.lineTo(38, 110);
        g.stroke();
      }
      if (state.bar) {
        const p = barFill(state.bar.value, state.bar.max);
        if (p >= 0) this.bar(p, state.bar.color === 3 ? "#d9ab58" : "#65b2d5", state.bar.y === BAR_LOW ? 112 : 80);
      }
    }
    g.restore();
  }
  /** Кадр 4×3 тайла из таблицы $060E8C (тайлы по столбцам, как у спрайта VDP). */
  frame(frame, y) {
    const g = this.g, sprite = this.pictures.get(frame), picture = sprite?.image();
    g.fillStyle = "#111a20ec";
    g.fillRect(15, y - 1, 34, 26);
    g.strokeStyle = "#778184";
    g.lineWidth = 0.45;
    g.strokeRect(15.5, y - 0.5, 33, 25);
    if (picture && sprite) {
      g.drawImage(picture, sprite.crop.x, sprite.crop.y, sprite.crop.w, sprite.crop.h, 16, y, 32, 24);
      return;
    }
    if (frame === HUD_ROM.upgradeFrame) {
      drawConsoleSymbol(g, "upgrade", 32, y + 12, 18);
      return;
    }
    const px = new Uint32Array(32 * 24);
    const b = this.rom.bytes;
    const e = HUD_ROM.frames + frame * 8;
    const line = b[e + 4] === 254 ? 1 : b[e + 4] === 255 ? 3 : -1;
    if (line < 0) return;
    const tiles = b.subarray(readU32(b, e) & 16777215);
    for (let c2 = 0; c2 < 4; c2++) for (let r = 0; r < 3; r++) blitTile(tiles, line << 13 | c2 * 3 + r, this.palette, px, 32, c2 * 8, r * 8);
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 24;
    c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(px.buffer), 32, 24), 0, 0);
    g.drawImage(c, 16, y, 32, 24);
  }
  bar(p, color, y) {
    const g = this.g;
    g.fillStyle = "#0a0e12";
    g.fillRect(15, y, 34, 2.2);
    g.fillStyle = color;
    g.fillRect(16, y + 0.4, 32 * (p + 1) / 32, 1.4);
    g.fillStyle = "#ffffff28";
    g.fillRect(16, y + 0.4, 32 * (p + 1) / 32, 0.35);
  }
};

// web/src/ui/intro.ts
var SHIPS_FRAMES = 240;
function stepColor5(c, target) {
  let out = 0;
  for (const [mask, one] of [[14, 2], [224, 32], [3584, 512]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}
var Intro = class {
  constructor(gfx, play = () => {
  }, stop = () => {
  }, openingTime = () => this.animationFrame / 60, difficultyText = () => "\u0421\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u044C: \u0421\u043B\u043E\u0436\u043D\u043E") {
    this.gfx = gfx;
    this.play = play;
    this.stop = stop;
    this.openingTime = openingTime;
    this.difficultyText = difficultyText;
    this.sega = gfx.segaData();
    this.title = gfx.titleData(false);
    this.titleMenu = gfx.titleData(true);
    this.vram = this.title.vram.slice();
    this.original.width = SCREEN_W;
    this.original.height = SCREEN_H;
    const pal = Uint32Array.from(this.title.palette, (c) => cramToRGBA(c));
    const tile2 = new Uint32Array(64);
    for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 88; cx++) {
      tile2.fill(0);
      blitTile(this.vram, readU16(this.title.maps, 57344 + (cy * 128 + cx) * 2), pal, tile2, 8, 0, 0);
      let count = 0, sumX = 0, sumY = 0;
      for (let i = 0; i < 64; i++) if (tile2[i]) {
        count++;
        sumX += i % 8;
        sumY += Math.floor(i / 8);
      }
      if (count) this.stars.push({ x: cx * 8 + sumX / count, y: cy * 8 + sumY / count, phase: this.stars.length * 2.17 });
    }
  }
  gfx;
  play;
  stop;
  openingTime;
  difficultyText;
  px = new Uint32Array(SCREEN_W * SCREEN_H);
  gen = null;
  cram = new Uint16Array(64);
  mode = "black";
  sega;
  title;
  titleMenu;
  hsA = 0;
  hsB = 0;
  showA = false;
  menu = false;
  // $017C36: позиция и скорость прокрутки B (16.16), признаки «по кругу» и «торможение»
  scrolling = false;
  pos = -1;
  speed = 32768;
  loopOn = true;
  loopAgain = true;
  braking = false;
  target = -704 * 65536;
  /** корабль сценки: координаты экрана и спрайты кадра */
  ship = null;
  vram;
  original = document.createElement("canvas");
  animationFrame = 0;
  menuStartFrame = 0;
  stars = [];
  starStamps = null;
  shipBounds = /* @__PURE__ */ new Map();
  segaVideo = null;
  getSegaVideo() {
    if (typeof document === "undefined") return null;
    if (!this.segaVideo) {
      const base = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL || "/";
      const cleanBase = base.endsWith("/") ? base : base + "/";
      const video = document.createElement("video");
      video.src = `${cleanBase}video/sega.mp4`;
      video.playsInline = true;
      video.preload = "auto";
      video.muted = false;
      this.segaVideo = video;
    }
    return this.segaVideo;
  }
  stopVideo() {
    if (this.segaVideo) {
      this.segaVideo.pause();
      this.segaVideo.currentTime = 0;
    }
  }
  start() {
    this.stopVideo();
    this.cram.fill(0);
    this.mode = "black";
    this.hsA = this.hsB = 0;
    this.showA = this.menu = this.scrolling = this.braking = false;
    this.menuStartFrame = 0;
    this.pos = -1;
    this.speed = 32768;
    this.loopOn = this.loopAgain = true;
    this.ship = null;
    this.vram = this.title.vram.slice();
    this.gen = this.run();
  }
  /** Кадр; false — заставка кончилась. */
  tick() {
    this.animationFrame++;
    if (this.scrolling) this.scrollB();
    return !this.gen?.next().done;
  }
  /** Время сборки DUNE, чтобы главный экран продолжил её с текущего кадра заставки. */
  titleElapsedSeconds() {
    return this.menu ? Math.max(0, (this.animationFrame - this.menuStartFrame) / 60) : 0;
  }
  *wait(n) {
    for (let i = 0; i < n; i++) yield;
  }
  /** Строки from…to палитры к цели, шаг раз в 3 кадра, пока не сойдутся. */
  *fade(target, from = 16, to = 64) {
    for (; ; ) {
      let same = 0;
      for (let i = from; i < to; i++) {
        if (this.cram[i] === target[i]) same++;
        else this.cram[i] = stepColor5(this.cram[i], target[i]);
      }
      yield* this.wait(3);
      if (same === to - from) return;
    }
  }
  /** $017DC8: сценка n — корабль по точкам. */
  *cutscene(n) {
    const b = this.gfx.romBytes;
    const frames = readU32(b, 103802 + n * 4);
    let frame = 0;
    this.ship = { x: 0, y: 0, sprites: objectDef(b, readU32(b, frames)), house: n };
    for (let p = readU32(b, 103994 + n * 4); ; ) {
      const cmd = readU16(b, p);
      p += 2;
      if (cmd === 1) {
        this.ship.x = readU16(b, p) << 16 >> 16;
        this.ship.y = readU16(b, p + 2) << 16 >> 16;
        p += 4;
        yield* this.wait(3);
      } else if (cmd === 2) {
        frame++;
        this.ship = { x: 40, y: 40, sprites: objectDef(b, readU32(b, frames + frame * 4)), house: n };
      } else break;
    }
    this.ship = null;
  }
  /** $017C36: шаг прокрутки звёзд. */
  scrollB() {
    if (this.loopOn && this.pos >> 16 < -320) {
      if (this.loopAgain) this.pos = -1;
      else {
        this.loopOn = false;
        this.braking = true;
        this.speed = 362496;
      }
    }
    this.hsB = this.pos >> 16;
    if (!this.braking) {
      this.speed += 2048;
      this.pos -= this.speed >= 196608 ? 196608 : this.speed;
    } else {
      this.speed -= 2048;
      this.pos -= this.speed >= 196608 ? 196608 : this.speed <= 32768 ? 32768 : this.speed;
      if (this.pos <= this.target) {
        this.speed = 32768;
        this.pos = this.target;
        this.scrolling = false;
        this.hsB = this.pos >> 16;
      }
    }
  }
  *run() {
    const b = this.gfx.romBytes;
    this.mode = "sega";
    const v = this.getSegaVideo();
    if (v) {
      v.currentTime = 0;
      v.muted = false;
      const p = v.play();
      if (p) {
        p.catch(() => {
          v.muted = true;
          v.play().catch(() => {
          });
        });
      }
      let frames = 0;
      while (!v.ended && v.currentTime < 3.65 && frames < 240) {
        frames++;
        yield;
      }
      v.pause();
    } else {
      yield* this.wait(180);
    }
    this.mode = "black";
    this.cram.fill(0);
    yield* this.wait(53);
    this.mode = "title";
    this.cram.set(this.title.palette.subarray(0, 16), 0);
    this.cram.set(this.title.palette.subarray(32, 48), 32);
    yield* this.wait(3);
    this.scrolling = true;
    this.play(0);
    yield* this.wait(200);
    this.showA = true;
    this.hsA = 0;
    yield* this.wait(16);
    yield* this.fade(this.title.palette);
    yield* this.wait(300);
    yield* this.fade(new Uint16Array(64));
    this.showA = false;
    yield* this.wait(SHIPS_FRAMES);
    this.loopAgain = false;
    while (this.scrolling) yield;
    for (let i = 0; i < 48; i++) this.cram[16 + i] = readU16(b, 683672 + i * 2);
    yield* this.wait(61);
    loadTileList(b, this.vram, 98094, 25088);
    for (const n of [1, 0, 2]) {
      this.play(10);
      yield* this.cutscene(n);
      this.stop(10);
    }
    this.cram.fill(0, 16, 64);
    yield* this.wait(180);
    this.vram = this.title.vram.slice();
    this.showA = true;
    this.menu = true;
    this.hsA = -512;
    this.menuStartFrame = this.animationFrame;
    yield* this.fade(this.titleMenu.palette);
  }
  /** Плоскость 128×28 клеток с горизонтальной прокруткой hs: точка плоскости x видна на экране в x + hs (mod 1024). */
  plane(maps, base, hs, pal) {
    const tile2 = new Uint32Array(64);
    for (let cx = 0; cx < 128; cx++) {
      let sx = ((cx * 8 + hs) % 1024 + 1024) % 1024;
      if (sx > 1016) sx -= 1024;
      if (sx >= SCREEN_W) continue;
      for (let cy = 0; cy < 28; cy++) {
        const word = readU16(maps, base + (cy * 128 + cx) * 2);
        if (!(word & 2047)) continue;
        tile2.fill(0);
        blitTile(this.vram, word, pal, tile2, 8, 0, 0);
        for (let r = 0; r < 8; r++)
          for (let c = 0; c < 8; c++) {
            const x = sx + c;
            const v = tile2[r * 8 + c];
            if (v && x >= 0 && x < SCREEN_W) this.px[(cy * 8 + r) * SCREEN_W + x] = v;
          }
      }
    }
  }
  draw(ctx) {
    if (this.drawHD(ctx)) return;
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    if (this.mode === "sega") {
      const v = this.getSegaVideo();
      if (v && v.readyState >= 2) {
        ctx.save();
        ctx.drawImage(v, 0, 0, SCREEN_W, SCREEN_H);
        ctx.restore();
        return;
      }
      for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(this.sega.vram, readU16(this.sega.map, (cy * 64 + cx) * 2), pal, px, SCREEN_W, cx * 8, cy * 8);
    } else if (this.mode === "title") {
      this.plane(this.title.maps, 57344, this.hsB, pal);
      if (this.showA) this.plane((this.menu ? this.titleMenu : this.title).maps, 49152, this.hsA, pal);
      const s = this.ship;
      if (s) for (let i = s.sprites.length - 1; i >= 0; i--) drawObjSprite(px, SCREEN_W, SCREEN_H, this.vram, 0, s.sprites[i], s.x + s.sprites[i].x, s.y + s.sprites[i].y, pal);
    }
    this.original.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(px.buffer.slice(0)), SCREEN_W, SCREEN_H), 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.original, 0, 0);
    ctx.restore();
  }
  /** Share the exact starfield with the title screen after the intro stops scrolling. */
  drawBackdrop(ctx, frame, scroll = -704) {
    const art = this.gfx.art;
    if (!art.get("arrakis")) return false;
    ctx.save();
    art.background(ctx, "arrakis", 704 + scroll);
    const image = art.get("arrakis");
    if (image) {
      const matrix = ctx.getTransform();
      const logicalW = ctx.canvas.width / matrix.a;
      const logicalH = ctx.canvas.height / matrix.d;
      const viewLeft = (320 - logicalW) / 2;
      const viewRight = (320 + logicalW) / 2;
      const bgW = Math.max(logicalW, logicalH * image.width / image.height);
      const bgH = bgW * image.height / image.width;
      const bgX = (320 - bgW) / 2 + 704 + scroll;
      const bgY = (224 - bgH) / 2;
      const cx = bgX + 1052 / image.width * bgW;
      const cy = bgY + 440 / image.height * bgH;
      const rx = 267 / image.width * bgW;
      const ry = 267 / image.height * bgH;
      if (!this.starStamps) {
        const samples = [
          [56, 109, 30],
          [118, 72, 24],
          [354, 92, 25],
          [648, 67, 24],
          [705, 188, 32],
          [888, 95, 25],
          [978, 36, 25],
          [1102, 98, 24],
          [1220, 98, 25],
          [1404, 68, 28],
          [1560, 135, 24],
          [1626, 81, 25],
          [323, 279, 34],
          [472, 461, 25],
          [161, 249, 23],
          [65, 365, 24],
          [44, 615, 24],
          [414, 608, 24],
          [646, 725, 28],
          [830, 846, 30],
          [1375, 639, 26],
          [1608, 719, 30],
          [1540, 869, 24]
        ];
        this.starStamps = samples.map(([x, y, size], i) => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          const stampCtx = canvas.getContext("2d", { willReadFrequently: true });
          stampCtx.drawImage(image, x - size / 2, y - size / 2, size, size, 0, 0, size, size);
          const pixels = stampCtx.getImageData(0, 0, size, size);
          for (let p = 0; p < pixels.data.length; p += 4) {
            const brightness = Math.max(pixels.data[p], pixels.data[p + 1], pixels.data[p + 2]);
            pixels.data[p + 3] = brightness < 10 ? 0 : Math.min(255, brightness * 1.15);
            if (brightness) {
              pixels.data[p] = Math.min(255, pixels.data[p] * 255 / brightness);
              pixels.data[p + 1] = Math.min(255, pixels.data[p + 1] * 255 / brightness);
              pixels.data[p + 2] = Math.min(255, pixels.data[p + 2] * 255 / brightness);
            }
          }
          stampCtx.putImageData(pixels, 0, 0);
          return { x, y, canvas, size, phase: i * 2.17 };
        });
      }
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i];
        const stamp = this.starStamps[i % this.starStamps.length];
        const x = ((star.x + scroll) % 704 + 704) % 704;
        const pulse = (1 + Math.sin(frame * 0.055 + star.phase)) / 2;
        const size = stamp.size / image.height * bgH;
        for (const sx of [x - 704, x, x + 704]) {
          if (sx < viewLeft - size || sx > viewRight + size) continue;
          ctx.globalAlpha = 0.48 + pulse * 0.42;
          ctx.drawImage(stamp.canvas, sx - size / 2, star.y - size / 2, size, size);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(frame * 6e-3) * 4e-3);
      ctx.drawImage(image, 0, 0, image.width, image.height, bgX - cx, bgY - cy, bgW, bgH);
      ctx.restore();
    }
    ctx.restore();
    return true;
  }
  /** Состояния и координаты анимации прежние; HD-слои рисуются сразу в нативный широкий холст. */
  drawHD(ctx) {
    const art = this.gfx.art;
    if (this.mode === "black") return true;
    if (this.mode === "sega") {
      const v = this.getSegaVideo();
      if (v && v.readyState >= 2) {
        ctx.save();
        const transform = ctx.getTransform();
        const width = ctx.canvas.width / (transform.a || 1);
        const x = (320 - width) / 2;
        ctx.drawImage(v, x, 0, width, SCREEN_H);
        ctx.restore();
        return true;
      }
      return true;
    }
    if (!art.get("arrakis") || this.showA && !this.menu && !art.get("publishers") || this.ship && !art.get("ships")) return false;
    ctx.save();
    this.drawBackdrop(ctx, this.animationFrame, this.hsB);
    if (this.showA) {
      let brightness = 0, full = 0;
      const target = this.menu ? this.titleMenu.palette : this.title.palette;
      for (let i = 16; i < 64; i++) {
        const level = (c) => (c & 14) + (c >> 4 & 14) + (c >> 8 & 14);
        brightness += level(this.cram[i]);
        full += level(target[i]);
      }
      ctx.globalAlpha = Math.min(1, brightness / Math.max(1, full));
      if (this.menu) this.gfx.drawTitleLettering(
        ctx,
        (this.animationFrame - this.menuStartFrame) / 60,
        this.openingTime(),
        this.difficultyText()
      );
      else {
        const publishers = art.get("publishers");
        if (publishers) {
          const crop = (sx, sy, w, h, x, y, dw, dh) => ctx.drawImage(
            publishers,
            sx / 320 * publishers.width,
            sy / 224 * publishers.height,
            w / 320 * publishers.width,
            h / 224 * publishers.height,
            x,
            y,
            dw,
            dh
          );
          crop(106, 19, 132, 103, 119, 13, 90, 68);
          crop(30, 142, 260, 69, 60, 123, 200, 42);
          menuText(ctx, "INTERACTIVE", 160, 82, { size: 6.2, align: "center" });
          menuText(ctx, "ENTERTAINMENT", 160, 89, { size: 6, align: "center" });
          menuText(ctx, "AND", 160, 106, { size: 7, align: "center" });
          menuText(ctx, "\xA91994 VIRGIN INTERACTIVE", 160, 176, { size: 6.5, align: "center" });
          menuText(ctx, "ENTERTAINMENT", 160, 184, { size: 6.5, align: "center" });
          menuText(ctx, "TALCO design studio \xB7 2026", 160, 200, { size: 6.5, align: "center" });
        }
      }
      ctx.globalAlpha = 1;
    }
    const ship = this.ship;
    const ships = art.get("ships");
    if (ship && ships) {
      const { x, y, w, h } = this.visibleShipBounds(ship.sprites);
      ctx.drawImage(
        ships,
        ship.house * ships.width / 3,
        ships.height * 0.225,
        ships.width / 3,
        ships.height * 0.55,
        ship.x + x,
        ship.y + y,
        w,
        h
      );
    }
    ctx.restore();
    return true;
  }
  /** Удаляющиеся кадры имеют разный прозрачный отступ: он не должен растягивать силуэт HD-корабля. */
  visibleShipBounds(sprites) {
    const key = JSON.stringify(sprites);
    const cached = this.shipBounds.get(key);
    if (cached) return cached;
    const x = Math.min(...sprites.map((s) => s.x));
    const y = Math.min(...sprites.map((s) => s.y));
    const w = Math.max(...sprites.map((s) => s.x + s.w * 8)) - x;
    const h = Math.max(...sprites.map((s) => s.y + s.h * 8)) - y;
    const px = new Uint32Array(w * h);
    const pal = new Uint32Array(64).fill(4294967295);
    for (let i = sprites.length - 1; i >= 0; i--) {
      const s = sprites[i];
      drawObjSprite(px, w, h, this.vram, 0, s, s.x - x, s.y - y, pal);
    }
    let left = w, top = h, right = 0, bottom = 0;
    for (let i = 0; i < px.length; i++) if (px[i]) {
      left = Math.min(left, i % w);
      top = Math.min(top, Math.floor(i / w));
      right = Math.max(right, i % w + 1);
      bottom = Math.max(bottom, Math.floor(i / w) + 1);
    }
    const bounds = right > left ? { x: x + left, y: y + top, w: right - left, h: bottom - top } : { x, y, w, h };
    this.shipBounds.set(key, bounds);
    return bounds;
  }
};

// web/src/ui/frontend.ts
var MENU_ITEMS = 3;
var ARROW = { x: 120, y: 160, step: 8 };
var DIFFICULTY_LABELS = ["\u041B\u0435\u0433\u043A\u043E", "\u041D\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u043E", "\u0421\u043B\u043E\u0436\u043D\u043E"];
var HOUSES = ["A", "O", "H"];
var HOUSE_FRAME = { x: 32, step: 88, y: 136 };
var HOUSE_SLIDE = 4;
var FrontEnd = class {
  constructor(gfx, host) {
    this.gfx = gfx;
    this.host = host;
    this.difficulty = Math.max(0, Math.min(2, Math.round(host.difficulty?.() ?? 2)));
    this.root = document.createElement("section");
    this.root.className = "settings frontend hd-menu";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "\u0413\u043B\u0430\u0432\u043D\u043E\u0435 \u043C\u0435\u043D\u044E");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", (e) => this.onClick(e));
    this.intro = new Intro(
      gfx,
      (seq) => this.host.introSound?.(seq),
      (seq) => this.host.introStop?.(seq),
      () => this.host.openingTime?.() ?? this.frame / 60,
      () => this.difficultyText()
    );
  }
  gfx;
  host;
  root;
  canvas = document.createElement("canvas");
  mode = "title";
  intro;
  item = 0;
  difficulty = 2;
  house = 0;
  /** сколько точек рамке ещё ехать до выбранного дома ($FFBF02), знак — направление */
  slide = 0;
  frame = 0;
  titleStartFrame = 0;
  raf = 0;
  /** Заставка при включении; кончится или любая кнопка — главное меню. */
  openIntro() {
    this.mode = "intro";
    this.intro.start();
    this.show();
    this.host.screen?.("intro");
  }
  /** Для автотестов: прогнать n кадров заставки. */
  stepIntro(n) {
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < n && this.mode === "intro"; i++) if (!this.intro.tick()) this.openTitle();
    this.draw();
  }
  get isOpen() {
    return !this.root.hidden;
  }
  openTitle() {
    if (this.mode === "intro") {
      const titleElapsed = this.intro.titleElapsedSeconds();
      this.titleStartFrame = this.frame - Math.round(titleElapsed * 60);
    }
    this.intro.stopVideo();
    this.mode = "title";
    this.item = 0;
    this.show();
    this.host.screen?.("title");
  }
  openHouse() {
    this.mode = "house";
    this.house = 0;
    this.slide = 0;
    this.show();
    this.host.screen?.("house");
  }
  show() {
    this.root.hidden = false;
    this.root.setAttribute("aria-label", this.mode === "title" ? "\u0413\u043B\u0430\u0432\u043D\u043E\u0435 \u043C\u0435\u043D\u044E" : "\u0412\u044B\u0431\u043E\u0440 \u0434\u043E\u043C\u0430");
    cancelAnimationFrame(this.raf);
    this.loop();
  }
  close() {
    this.intro.stopVideo();
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }
  /** Кнопка геймпада, пока экран открыт. true — обработана. */
  handlePad(b) {
    if (this.root.hidden) return false;
    if (this.mode === "intro") {
      this.openTitle();
      return true;
    }
    if (this.mode === "title") {
      if (b === "up") this.item = (this.item + MENU_ITEMS - 1) % MENU_ITEMS, this.host.ui?.(11);
      else if (b === "down") this.item = (this.item + 1) % MENU_ITEMS, this.host.ui?.(11);
      else if ((b === "left" || b === "right") && this.item === 2) {
        this.changeDifficulty(b === "right" ? 1 : -1);
        this.host.ui?.(11);
      } else if (b === "a" || b === "c" || b === "start") this.host.select?.(12), this.chooseItem();
    } else {
      if (this.slide) return true;
      if (b === "left" && this.house > 0) this.house--, this.slide = -HOUSE_FRAME.step;
      else if (b === "right" && this.house < HOUSES.length - 1) this.house++, this.slide = HOUSE_FRAME.step;
      else if (b === "a" || b === "c" || b === "start") {
        this.close();
        this.host.newGame(HOUSES[this.house]);
      } else if (b === "b") this.openTitle();
    }
    return true;
  }
  chooseItem() {
    if (this.item === 0) this.openHouse();
    else if (this.item === 1) this.host.options();
    else this.changeDifficulty(1);
  }
  changeDifficulty(direction) {
    this.difficulty = (this.difficulty + direction + DIFFICULTY_LABELS.length) % DIFFICULTY_LABELS.length;
    this.host.difficultyChanged?.(this.difficulty);
  }
  difficultyText() {
    return `\u0421\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u044C: ${DIFFICULTY_LABELS[this.difficulty]}`;
  }
  onClick(e) {
    const { x, y } = menuPoint(this.canvas, e);
    if (this.mode === "intro") this.openTitle();
    else if (this.mode === "title") {
      const i = Math.floor((y - ARROW.y) / ARROW.step);
      if (i >= 0 && i < MENU_ITEMS && x >= ARROW.x) {
        this.item = i;
        this.host.select?.(12);
        this.chooseItem();
      }
    } else {
      const i = Math.floor((x - HOUSE_FRAME.x + 4) / HOUSE_FRAME.step);
      if (i >= 0 && i < HOUSES.length && y >= 56 && y < HOUSE_FRAME.y + 16) {
        this.house = i;
        this.close();
        this.host.newGame(HOUSES[i]);
      }
    }
  }
  loop() {
    this.frame++;
    this.host.frame?.();
    if (this.mode === "intro" && !this.intro.tick()) this.openTitle();
    if (this.mode === "house" && this.slide) {
      this.slide -= Math.sign(this.slide) * HOUSE_SLIDE;
      if (!this.slide) this.host.ui?.(25);
    }
    this.draw();
    if (!this.root.hidden) this.raf = requestAnimationFrame(() => this.loop());
  }
  draw() {
    const g = prepareMenu(this.canvas);
    if (this.mode === "intro") {
      this.intro.draw(g);
    } else if (this.mode === "title") {
      if (this.intro.drawBackdrop(g, this.frame)) this.gfx.drawTitleLettering(
        g,
        (this.frame - this.titleStartFrame) / 60,
        this.host.openingTime?.() ?? this.frame / 60,
        this.difficultyText()
      );
      else g.drawImage(this.gfx.titleScreen(), 0, 0);
      menuArrow(g, ARROW.x, ARROW.y + this.item * ARROW.step, this.frame);
    } else {
      const image = this.gfx.art.get("houses");
      if (image) {
        g.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
        const strings = this.gfx.menuStrings();
        const russian = /[А-Я]/.test(strings.houses.join(""));
        menuText(
          g,
          russian ? "\u0412\u042B\u0411\u0415\u0420\u0418 \u0421\u0415\u0411\u0415 \u0414\u041E\u041C" : "CHOOSE YOUR HOUSE",
          160,
          36,
          { size: 10, color: "#f7d479", align: "center", serif: true }
        );
        [1, 2, 0].forEach((id, i) => menuText(
          g,
          strings.houses[id],
          72 + i * 88,
          139,
          { size: 7.4, color: "#2b1a07", align: "center", maxWidth: 72, shadow: false }
        ));
        g.strokeStyle = ["#fff1ad", "#e8b63c", "#a86d16", "#e8b63c"][(this.frame & 31) >> 3];
        g.lineWidth = 0.8;
        g.strokeRect(HOUSE_FRAME.x + this.house * HOUSE_FRAME.step - this.slide, HOUSE_FRAME.y, 80, 16);
      } else {
        g.drawImage(this.gfx.houseScreen(), 0, 0);
        g.drawImage(this.gfx.houseFrame(((this.frame & 31) >> 3) + 1), HOUSE_FRAME.x + this.house * HOUSE_FRAME.step - this.slide, HOUSE_FRAME.y);
      }
    }
  }
};
export {
  BuildingPortraits,
  DuneRom,
  END_ROM,
  EndPicture,
  FactoryWindow,
  FinaleScreen,
  Flyby,
  FrontEnd,
  HD_STAT_SLOTS,
  HUD_ROM,
  Hud,
  InfantryArt,
  Intro,
  MapEffects,
  MapView,
  MentatMotion,
  MentatScreen,
  Portraits,
  STRUCTURE_ART,
  ScoreScreen,
  ScreenGfx,
  Skins,
  VehicleArt,
  WormArt,
  drawWall,
  explosionTable,
  objectDef,
  prepareMenu
};
