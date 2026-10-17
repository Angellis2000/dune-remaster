/**
 * Экраны меню MD, собранные из данных ROM так же, как их строит игра: тайлы фона (LCW-потоки),
 * карта плоскости Window (LCW, 64 слова в строке, 40×28 на экране) и палитра. Текст рисуется
 * шрифтом ROM с тенью, как у спрайтовых надписей оригинала.
 */
import { lcwDecompress } from "../rom/lcw.ts";
import { blitTile, cramToRGBA, readU16 } from "../rom/md.ts";
import type { DuneRom } from "../rom/dune.ts";

export const SCREEN_W = 320;
export const SCREEN_H = 224;

/** Адреса в ROM (найдены трассировкой DMA и по коду меню $020E00). */
export const MENU_ROM = {
  /** палитра экранов «НАСТРОЙКИ» и «ВВЕДИТЕ ПАРОЛЬ»: 4 строки */
  palette: 0x088214,
  settings: { map: 0x0c6792, tiles: [0x0b64ee, 0x0b6cca, 0x0b75e8, 0x0b7e94, 0x0b85fc, 0x0b8e22] },
  password: { map: 0x0c6e60, tiles: [0x0b9580, 0x0b9ac2, 0x0ba492] },
  /** шрифт: 128 тайлов, номер тайла = код символа; 9 — буква, 12 — фон */
  font: 0x04f6c8,
  /** стрелка-курсор меню, 2×2 тайла по столбцам; переливается цветами 8–13 строки 1 */
  arrow: 0x0655fe,
  /** рамка буквы на экране пароля: 1×2 тайла (правая половина — отражение) */
  letterFrame: 0x06424e,
  /** таблица мелодий фонотеки: [указатель на имя, номер] ... 0 */
  tracks: 0x087f44,
  /** таблица звуков для «СПЕЦЭФФЕКТЫ» */
  sounds: 0x087fdc,
} as const;

/** Кириллица шрифта на кодах 0x60–0x7E; буквы, похожие на латинские, пишутся латиницей. */
const CYRILLIC = "`ЩЬЫБЪГДЭЖЗЮИМЙОРЛЯПТУФЦХЧШ";
const SAME_AS_LATIN: Record<string, string> = { А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X", Ё: "E" };

/** Строка → коды шрифта MD. */
export function encodeText(text: string): number[] {
  const out: number[] = [];
  for (const ch0 of text.toUpperCase()) {
    const ch = SAME_AS_LATIN[ch0] ?? ch0;
    const code = ch.charCodeAt(0);
    if (code >= 0x20 && code < 0x60) out.push(code);
    else {
      const i = CYRILLIC.indexOf(ch, 1);
      out.push(i > 0 ? 0x60 + i : 0x20);
    }
  }
  return out;
}

/** Коды шрифта MD → строка (для имён из таблиц ROM). */
export function decodeText(bytes: Uint8Array, at: number, max = 32): string {
  let s = "";
  for (let i = 0; i < max; i++) {
    const c = bytes[at + i];
    if (c === 0) break;
    s += c >= 0x60 && c < 0x60 + CYRILLIC.length ? CYRILLIC[c - 0x60] : String.fromCharCode(c);
  }
  return s.trimEnd();
}

export class ScreenGfx {
  readonly palette: Uint32Array;
  private cache = new Map<string, HTMLCanvasElement>();

  constructor(private rom: DuneRom) {
    this.palette = rom.readPalette(MENU_ROM.palette, 4);
  }

  /** Фон экрана целиком (320×224) из тайлов и карты Window. */
  background(which: "settings" | "password"): HTMLCanvasElement {
    return this.memo(`bg:${which}`, () => {
      const def = MENU_ROM[which];
      const vram = new Uint8Array(0x10000);
      let dst = 0;
      for (const src of def.tiles) {
        const data = lcwDecompress(this.rom.bytes, src).data;
        vram.set(data.subarray(0, Math.min(data.length, vram.length - dst)), dst);
        dst += data.length;
      }
      const map = lcwDecompress(this.rom.bytes, def.map).data;
      const px = new Uint32Array(SCREEN_W * SCREEN_H).fill(this.palette[0]);
      for (let cy = 0; cy < 28; cy++)
        for (let cx = 0; cx < 40; cx++) blitTile(vram, readU16(map, (cy * 64 + cx) * 2), this.palette, px, SCREEN_W, cx * 8, cy * 8);
      return toCanvas(px, SCREEN_W, SCREEN_H);
    });
  }

  /**
   * Надпись шрифтом ROM: буква — цвет 8 строки палитры, тень (вправо, вниз и по диагонали) —
   * цвет 15, как в тайлах, которые игра рисует для спрайтовых надписей.
   */
  text(text: string, line: number): HTMLCanvasElement {
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
          else if ((x > 0 && fg[y * w + x - 1]) || (y > 0 && fg[(y - 1) * w + x]) || (x > 0 && y > 0 && fg[(y - 1) * w + x - 1])) px[y * w + x] = shadow;
        }
      return toCanvas(px, w, h);
    });
  }

  /** Стрелка-курсор: фаза 0..5 сдвигает цвета 8–13 строки 1 (перелив, как в оригинале). */
  arrow(phase: number): HTMLCanvasElement {
    const p = ((phase % 6) + 6) % 6;
    return this.memo(`arrow:${p}`, () => {
      const pal = this.palette.slice();
      for (let i = 0; i < 6; i++) pal[16 + 8 + i] = this.palette[16 + 8 + ((i + p) % 6)];
      return this.sprite(MENU_ROM.arrow, 2, 2, 1, pal, false);
    });
  }

  /** Рамка выбранной буквы (16×16): левая половина из ROM, правая — её отражение. */
  letterFrame(): HTMLCanvasElement {
    return this.memo("frame", () => {
      // цвет рамки игра ставит в строку 3 отдельно (серый 666, в CRAM на этом экране)
      const pal = this.palette.slice();
      pal[3 * 16 + 1] = cramToRGBA(0x666);
      const left = this.sprite(MENU_ROM.letterFrame, 1, 2, 3, pal, false);
      const right = this.sprite(MENU_ROM.letterFrame, 1, 2, 3, pal, true);
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const g = c.getContext("2d")!;
      g.drawImage(left, 0, 0);
      g.drawImage(right, 8, 0);
      return c;
    });
  }

  /** Имена из таблицы [указатель, номер] (фонотека, спецэффекты). */
  names(table: number): { name: string; id: number }[] {
    const out: { name: string; id: number }[] = [];
    for (let o = table; ; o += 8) {
      const ptr = (readU16(this.rom.bytes, o) << 16) | readU16(this.rom.bytes, o + 2);
      if (!ptr) break;
      out.push({ name: decodeText(this.rom.bytes, ptr), id: (readU16(this.rom.bytes, o + 4) << 16) | readU16(this.rom.bytes, o + 6) });
    }
    return out;
  }

  /** Спрайт из сырых тайлов ROM (тайлы идут по столбцам, как у VDP). */
  private sprite(src: number, tw: number, th: number, line: number, pal: Uint32Array, hflip: boolean): HTMLCanvasElement {
    const vram = this.rom.bytes.subarray(src, src + tw * th * 32);
    const w = tw * 8;
    const px = new Uint32Array(w * th * 8);
    for (let c = 0; c < tw; c++)
      for (let r = 0; r < th; r++) {
        const col = hflip ? tw - 1 - c : c;
        blitTile(vram, (line << 13) | (hflip ? 0x800 : 0) | (c * th + r), pal, px, w, col * 8, r * 8);
      }
    return toCanvas(px, w, th * 8);
  }

  private memo(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
    let c = this.cache.get(key);
    if (!c) {
      c = make();
      this.cache.set(key, c);
    }
    return c;
  }
}

function toCanvas(px: Uint32Array, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(px.buffer as ArrayBuffer), w, h), 0, 0);
  return c;
}
