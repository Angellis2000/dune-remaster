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

// web/src/gfx/screens.ts
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
export {
  DuneRom,
  MentatGfx,
  decodeTextCodes
};
