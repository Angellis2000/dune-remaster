/**
 * Экран ментата MD: всё собирается из ROM так же, как код игры ($025ECE).
 *
 * - Карта Арракиса ($023F60, кусок $024282): 10 областей из фигур-тайлов; цвет области 0/1 — первый слой,
 *   2/3 — второй, нечётный — перекраска в «яркие» цвета 9–15 (таблица $024082), наложение по маске ($024182).
 *   Слой 1 — плоскость B (строка палитры 0), слой 2 — A (строка 1), оба 33×14 тайлов в клетке (6, 9).
 *   Сначала основа ($096158, цвета $095D00, тайлы $096324), затем владение областями на уровне
 *   ($0962DC, цвета $095F6C[дом] + уровень·$14, тайлы $0986E6). Сверено с VRAM эмулятора побайтно.
 * - Портрет — 25 спрайтов шаблона $0257EC (строка 3) из LCW дома, глаза и рот — 6 спрайтов поверх,
 *   их кадры — отдельные LCW ($025940, $02594C), смещения по дому ($025958, $025964).
 * - Текст — шрифт LCW $0FEEE2 (тайл $460 + код символа, строка 2) в плоскость A с клетки (2, 5).
 * - Кнопки ($025BB8): рамка LCW $0A27FC, кнопки ПРИНЯТЬ/СОВЕТ $0A2818 или ДА/НЕТ $0A2A44.
 * - Палитра: строки 0–1 $0A2D7E (на 9-м уровне $0A2DFE) притушены (c >> 1 & $666), 2–3 — $0A2C3E + дом·$80;
 *   цвета 8–11 строки 2 крутятся раз в 8 кадров из $0A2DCE (VBlank $024728).
 * Обе плоскости сдвинуты вверх на 24 пикселя (VSRAM).
 */
import { lcwDecompress } from "../rom/lcw.ts";
import { blitTile, cramToRGBA, readU16, readU32 } from "../rom/md.ts";
import type { DuneRom } from "../rom/dune.ts";

export const MENTAT_ROM = {
  regions: 0x096158,
  regionColors: 0x095d00,
  regionTiles: 0x096324,
  ownRegions: 0x0962dc,
  ownColors: 0x095f6c,
  ownTiles: 0x0986e6,
  shapeTiles: 0x096304,
  shapeCols: 0x024042,
  shapeRows: 0x024062,
  remap: 0x024082,
  mask: 0x024182,
  portrait: 0x025934,
  eyes: 0x025940,
  mouth: 0x02594c,
  eyesOffset: 0x025958,
  mouthOffset: 0x025964,
  sprites: 0x0257ec,
  font: 0x0feee2,
  buttonFrame: 0x0a27fc,
  buttonsAccept: 0x0a2818,
  buttonsYesNo: 0x0a2a44,
  mapPalette: 0x0a2d7e,
  mapPaletteLast: 0x0a2dfe,
  facePalette: 0x0a2c3e,
  colorCycle: 0x0a2dce,
  /** тексты: вступление дома и таблица миссий (16 байт: брифинг, победа, поражение, совет) */
  houseIntro: 0x087d7c,
  missionTexts: 0x087f38,
} as const;

const LAYER = 0x39c0;
const MAP_COLS = 33;
const MAP_ROWS = 14;
/** клетка плоскости, где лежит карта, и сдвиг экрана вверх */
const MAP_CELL = { col: 6, row: 9 };
export const MENTAT_VSCROLL = 24;

/** Спрайт шаблона: экранные координаты, размер в тайлах, слово атрибута. */
export interface MdSprite {
  x: number;
  y: number;
  w: number;
  h: number;
  attr: number;
}

export class MentatGfx {
  private data = new Map<string, Uint8Array>();

  constructor(private rom: DuneRom) {}

  private get b(): Uint8Array {
    return this.rom.bytes;
  }

  private lcw(addr: number): Uint8Array {
    let d = this.data.get(`l${addr}`);
    if (!d) {
      d = lcwDecompress(this.b, addr).data;
      this.data.set(`l${addr}`, d);
    }
    return d;
  }

  /** Палитра экрана (64 слова CRAM); с фазой круга — цвета 8–11 строки 2 из $0A2DCE, без неё — как в ROM. */
  paletteWords(house: number, level: number, cycle: number | null = null): Uint16Array {
    const pal = new Uint16Array(64);
    const map = level === 8 ? MENTAT_ROM.mapPaletteLast : MENTAT_ROM.mapPalette;
    for (let i = 0; i < 32; i++) pal[i] = (readU16(this.b, map + i * 2) >> 1) & 0x666;
    for (let i = 0; i < 32; i++) pal[32 + i] = readU16(this.b, MENTAT_ROM.facePalette + house * 0x80 + i * 2);
    if (cycle !== null) for (let i = 0; i < 4; i++) pal[32 + 8 + i] = this.cycleColor(cycle + i);
    return pal;
  }

  /** Цвет круга $0A2DCE (фаза по модулю 4). */
  cycleColor(phase: number): number {
    return readU16(this.b, MENTAT_ROM.colorCycle + ((phase * 2) & 6));
  }

  /** Палитра экрана (64 цвета RGBA). */
  palette(house: number, level: number, cycle: number): Uint32Array {
    return toRGBA(this.paletteWords(house, level, cycle));
  }

  /** Два слоя карты (как буфер $FF0000) для дома и уровня. */
  mapLayers(house: number, level: number): Uint8Array {
    const key = `map:${house}:${level}`;
    let buf = this.data.get(key);
    if (buf) return buf;
    buf = new Uint8Array(LAYER * 2);
    const R = MENTAT_ROM;
    const s16 = (a: number) => (readU16(this.b, a) << 16) >> 16;
    const blit = (x: number, y: number, shape: number, color: number, tile: number, src: number) => {
      let base = 0;
      if (color > 1) {
        base = LAYER;
        color -= 2;
      }
      const off = base + ((y - 0x30) >> 3) * 0x420 + ((x - 0x18) & 0x1f8) * 4;
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
              buf![a4 + k] = (buf![a4 + k] & this.b[R.mask + s]) | s;
            }
            a4 += 4;
          }
          a4 += 0x400;
          srcOff += 0x20;
        }
        a3 += 0x20;
      }
    };
    const compose = (regions: number, colors: number, src: number) => {
      let tile = 0;
      for (let i = 0; i < 10; i++) {
        let p = readU32(this.b, regions + i * 4);
        let x = s16(p);
        let y = s16(p + 2);
        let shape = s16(p + 4);
        p += 6;
        const color = readU16(this.b, colors + i * 2);
        for (;;) {
          blit(x, y, shape, color, tile, src);
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
    compose(R.ownRegions, readU32(this.b, R.ownColors + house * 4) + level * 0x14, R.ownTiles);
    this.data.set(key, buf);
    return buf;
  }

  /** Карта целиком (320×224, прозрачный фон), слой 1 под слоем 2, в экранных координатах. */
  map(house: number, level: number, pal: Uint32Array): HTMLCanvasElement {
    const px = new Uint32Array(320 * 224);
    this.drawMap(px, house, level, pal);
    return toCanvas(px, 320, 224);
  }

  /** Нарисовать обе плоскости карты в буфер экрана 320×224. */
  drawMap(px: Uint32Array, house: number, level: number, pal: Uint32Array): void {
    const buf = this.mapLayers(house, level);
    const x0 = MAP_CELL.col * 8;
    const y0 = MAP_CELL.row * 8 - MENTAT_VSCROLL;
    for (const [layer, line] of [[0, 0], [1, 1]] as const)
      for (let r = 0; r < MAP_ROWS; r++)
        for (let c = 0; c < MAP_COLS; c++)
          blitTile(buf.subarray(layer * LAYER), (line << 13) | (r * MAP_COLS + c), pal, px, 320, x0 + c * 8, y0 + r * 8);
  }

  /** Спрайты шаблона $0257EC (41 шт.). */
  sprites(): MdSprite[] {
    const out: MdSprite[] = [];
    for (let i = 0; i < 41; i++) {
      const a = MENTAT_ROM.sprites + i * 8;
      const sz = this.b[a + 2];
      out.push({ y: readU16(this.b, a) - 128, w: ((sz >> 2) & 3) + 1, h: (sz & 3) + 1, attr: readU16(this.b, a + 4), x: readU16(this.b, a + 6) - 128 });
    }
    return out;
  }

  /** Сдвиг глаз или рта по дому. */
  faceOffset(kind: "eyes" | "mouth", house: number): { dx: number; dy: number } {
    const a = (kind === "eyes" ? MENTAT_ROM.eyesOffset : MENTAT_ROM.mouthOffset) + house * 4;
    return { dx: (readU16(this.b, a) << 16) >> 16, dy: (readU16(this.b, a + 2) << 16) >> 16 };
  }

  /** VRAM спрайтов экрана: портрет (тайлы $680, $780, $541), шрифт ($460), кадр глаз/рта/кнопок по месту. */
  spriteVram(house: number): Uint8Array {
    const key = `vram:${house}`;
    let v = this.data.get(key);
    if (!v) {
      v = new Uint8Array(0x10000);
      const p = this.lcw(readU32(this.b, MENTAT_ROM.portrait + house * 4));
      v.set(p.subarray(0, 0xfc0), 0xd000);
      v.set(p.subarray(0xfc0, 0x1f80), 0xf000);
      v.set(p.subarray(0x1f80, 0x2880), 0xa820);
      v.set(this.lcw(MENTAT_ROM.font).subarray(0, 0x1000), 0x8c00);
      this.data.set(key, v);
    }
    return v;
  }

  /** Положить кадр глаз (0–4) или рта (0–4) в VRAM ($B120 / $B360), как DMA $025A98. */
  setFace(vram: Uint8Array, house: number, kind: "eyes" | "mouth", frame: number): void {
    if (kind === "eyes") vram.set(this.lcw(readU32(this.b, MENTAT_ROM.eyes + house * 4)).subarray(frame * 0x240, frame * 0x240 + 0x240), 0xb120);
    else vram.set(this.lcw(readU32(this.b, MENTAT_ROM.mouth + house * 4)).subarray(frame * 0x460, frame * 0x460 + 0x460), 0xb360);
  }

  /** Кнопки: рамка в $B120, ПРИНЯТЬ/СОВЕТ или ДА/НЕТ в $B3A0. */
  setButtons(vram: Uint8Array, accept: boolean): void {
    vram.set(this.lcw(MENTAT_ROM.buttonFrame).subarray(0, 0x280), 0xb120);
    vram.set(this.lcw(accept ? MENTAT_ROM.buttonsAccept : MENTAT_ROM.buttonsYesNo).subarray(0, 0x500), 0xb3a0);
  }

  /** Нарисовать спрайт MD из VRAM (тайлы по столбцам) в буфер экрана. */
  drawSprite(px: Uint32Array, vram: Uint8Array, s: MdSprite, pal: Uint32Array, dx = 0, dy = 0): void {
    const hf = (s.attr & 0x800) !== 0;
    for (let c = 0; c < s.w; c++)
      for (let r = 0; r < s.h; r++) {
        const tile = (s.attr & 0x7ff) + c * s.h + r;
        const col = hf ? s.w - 1 - c : c;
        const x = s.x + dx + col * 8;
        const y = s.y + dy + r * 8;
        if (x <= -8 || y <= -8 || x >= 320 || y >= 224) continue;
        blitClipped(vram, (s.attr & 0x7800) | tile, pal, px, x, y);
      }
  }

  /** Страница текста в плоскость A с клетки (2, 5), как $025B02: тайл $460 + код, строка 2; '\r' — новая строка, прочие коды рисуются. */
  drawText(px: Uint32Array, vram: Uint8Array, text: number[], pal: Uint32Array): void {
    let col = 2;
    let row = 5;
    for (const ch of text) {
      if (ch === 0x0d) {
        row++;
        col = 2;
        continue;
      }
      blitClipped(vram, (2 << 13) | (0x460 + ch), pal, px, col * 8, row * 8 - MENTAT_VSCROLL);
      col++;
    }
  }

  /**
   * Разбить текст на страницы ($01FBBA): страница — до '.', '!', '?', '\r' или конца строки, перенос по словам
   * при ширине 36; знак конца остаётся на странице.
   */
  pages(addr: number, width = 36): number[][] {
    const b = this.b;
    const end = (c: number) => c === 0x2e || c === 0x21 || c === 0x3f || c === 0 || c === 0x0d;
    const out: number[] = [];
    let p = addr;
    while (b[p]) {
      let len = 0;
      // сначала проверка, потом копирование — как цикл $01FBCC…$01FC02
      while (!end(b[p]) && len < width) {
        out.push(b[p++]);
        len++;
        if (b[p] === 0x0a || b[p] === 0x0d) len = 0;
      }
      if (len >= width) {
        while (b[p] !== 0x20) {
          p--;
          out.pop();
        }
        p++;
        out.push(0x0d);
      }
      if (end(b[p])) {
        out.push(b[p]);
        if (b[p]) p++;
        out.push(0);
      }
    }
    // страницы — куски до нуля
    const pages: number[][] = [];
    let cur: number[] = [];
    for (const c of out) {
      if (c === 0) {
        pages.push(cur);
        cur = [];
      } else cur.push(c);
    }
    if (cur.length) pages.push(cur);
    return pages;
  }

  /** Адрес текста: вступление дома или текст миссии (0 брифинг, 1 победа, 2 поражение, 3 совет). */
  textOf(house: number, mission: number | null, kind = 0): number {
    if (mission === null) return readU32(this.b, MENTAT_ROM.houseIntro + house * 4);
    const t = readU32(this.b, MENTAT_ROM.missionTexts + house * 4);
    return readU32(this.b, t + (mission - 1) * 16 + kind * 4);
  }
}

function blitClipped(vram: Uint8Array, word: number, pal: Uint32Array, px: Uint32Array, x: number, y: number): void {
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

export function toRGBA(words: Uint16Array): Uint32Array {
  const pal = new Uint32Array(words.length);
  for (let i = 0; i < words.length; i++) pal[i] = cramToRGBA(words[i]);
  return pal;
}

function toCanvas(px: Uint32Array, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(px.buffer as ArrayBuffer), w, h), 0, 0);
  return c;
}
