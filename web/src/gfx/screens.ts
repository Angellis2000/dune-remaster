/**
 * Экраны меню MD, собранные из данных ROM так же, как их строит игра: тайлы фона (LCW-потоки),
 * карта плоскости Window (LCW, 64 слова в строке, 40×28 на экране) и палитра. Текст рисуется
 * шрифтом ROM с тенью, как у спрайтовых надписей оригинала.
 */
import { lcwDecompress } from "../rom/lcw.ts";
import { blitTile, cramToRGBA, readU16 } from "../rom/md.ts";
import type { DuneRom } from "../rom/dune.ts";
import { ScreenArt } from "./screen-art.ts";
import { menuText } from "./menu-canvas.ts";

export const SCREEN_W = 320;
export const SCREEN_H = 224;

/** Адреса в ROM (найдены трассировкой DMA и по коду меню $020E00). */
export const MENU_ROM = {
  /** палитра экранов «НАСТРОЙКИ» и «ВВЕДИТЕ ПАРОЛЬ»: 4 строки */
  palette: 0x088214,
  settings: { map: 0x0c6792, tiles: [0x0b64ee, 0x0b6cca, 0x0b75e8, 0x0b7e94, 0x0b85fc, 0x0b8e22] },
  password: { map: 0x0c6e60, tiles: [0x0b9580, 0x0b9ac2, 0x0ba492] },
  /**
   * Окно здания (A по выбранному своему зданию): рамка — карта Window из LCW, тайлы из 4 потоков,
   * палитры строк 1–3; иконки и кнопки 4×3 тайла (сырые, 384 байта); значки 2×2.
   */
  factory: {
    map: 0x0c35c0,
    tiles: [0x0a6f32, 0x0a771c, 0x0a7f8c, 0x0a8744],
    palettes: [0x013816, 0x0391b6, 0x013856],
    /** иконки зданий по типу (перед ними 5 кнопок: СТОП, РЕМОНТ тёмные, СТОП, РЕМОНТ светлые, ВЫХОД) */
    structureIcons: 0x06e840,
    /** иконки юнитов по типу (кнопки — перед таблицей, так же) */
    unitIcons: 0x070ca4,
    /** рамка-курсор 4×3, строка 2 */
    cursor: 0x049fc4,
    /** значки цены, энергии и прочности 2×2, строка 1 */
    statIcons: [0x04a31c, 0x04a39c, 0x04a49c],
    /** у заводов юнитов и космопорта вместо энергии — патрон (урон юнита) */
    ammoIcon: 0x04a41c,
    /** значки размера здания 2×2: 1×1, 2×2, 3×2, 3×3 */
    sizeIcons: 0x008638,
  },
  /**
   * Окно космопорта (трасса открытия): своя рамка — 4 LCW-потока тайлов и карта Window, строка палитры 2
   * зелёная ($0A6C58), строки 1 и 3 — как у окна здания. Раскладка кнопок, сетки и чисел та же.
   */
  starport: {
    map: 0x0c7608,
    tiles: [0x0bab86, 0x0bb20a, 0x0bb9dc, 0x0bc0ce],
    palettes: [0x013816, 0x0a6c58, 0x013856],
  },
  /**
   * Главное меню (трасса от включения): обе плоскости 128 клеток в ширину. Слева на A — логотипы, справа —
   * «DUNE» с пунктами; на B — звёзды и планета. Меню показано при прокрутке A = −512, B = −704.
   * Тайлы — 7 LCW-потоков по $1000 и общий поток $0FEEE2 (стрелка) в $9000. Пары [LCW, адрес VRAM].
   */
  title: {
    tiles: [[0x0b296a, 0x0000], [0x0b3286, 0x1000], [0x0b38b8, 0x2000], [0x0b42b8, 0x3000], [0x0b4d48, 0x4000], [0x0b56ec, 0x5000], [0x0b60da, 0x6000], [0x0feee2, 0x9000]],
    planeA: [[0x0c628a, 0xc000], [0x0c6556, 0xd000]],
    planeB: [[0x0c5e1a, 0xe000], [0x0c609a, 0xf000]],
    palettes: [0x0a6d18, 0x0a6e38, 0x0a6e58, 0x0a6e78],
    /** цвета, которые код меню ставит поверх палитры ROM (сняты с CRAM): строка 2 — 14, 15; строка 3 — 13, 14 */
    paletteFix: [[2 * 16 + 14, 0x644], [2 * 16 + 15, 0x666], [3 * 16 + 13, 0xeee], [3 * 16 + 14, 0x666]],
    scrollA: 512,
    scrollB: 704,
    /**
     * пункты меню код пишет в плоскость A ($01FF66: тайл $480 + код символа, строка палитры 3) по смещениям
     * в словах $A50, $AD0, $B50; строки берутся по ссылкам pea (d16,pc) у вызовов, как в ROM
     */
    items: [[0x017816, 0xa50], [0x01782e, 0xad0], [0x017846, 0xb50]],
    /** стрелка: тайл $4BE, строка 2, x 120, y 160 + 8·пункт; цвет 13 строки 2 переливается по 6 кадров */
    arrowTile: 0x4be,
    arrowPulse: [0xeee, 0xccc, 0xaaa, 0x888, 0x666, 0x888, 0xaaa, 0xccc],
  },
  /**
   * Выбор дома: плоскость Window (64 клетки), рамка под именем — три спрайта из тайлов `$06424E`
   * (4×2, 2×2 из тайлов 4–7, 4×2 с отражением) в x = 32 + 88·n, y = 136; её ненулевые байты — цвет
   * 1…4 строки 3, смена раз в 8 кадров ($004870).
   */
  house: {
    tiles: [[0x0a8ba8, 0x0000], [0x0a9648, 0x1000]],
    window: 0x0c3af4,
    palette: 0x0412fe,
    frame: 0x06424e,
  },
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

/** Decode text already split into the same byte codes used by ROM pages. */
export function decodeTextCodes(codes: readonly number[]): string {
  let s="";
  for(const c of codes){
    if(c===0x0d){s+='\n';continue;}
    s+=c>=0x60&&c<0x60+CYRILLIC.length?CYRILLIC[c-0x60]:String.fromCharCode(c);
  }
  return s.trimEnd();
}

export class ScreenGfx {
  readonly palette: Uint32Array;
  readonly art = new ScreenArt();
  private cache = new Map<string, HTMLCanvasElement>();

  get romBytes(): Uint8Array {
    return this.rom.bytes;
  }

  constructor(private rom: DuneRom) {
    this.palette = rom.readPalette(MENU_ROM.palette, 4);
  }

  /** Фон экрана целиком (320×224) из тайлов и карты Window. */
  background(which: "settings" | "password"): HTMLCanvasElement {
    return this.memo(`bg:${which}`, () => this.tilemapScreen(MENU_ROM[which].tiles, MENU_ROM[which].map, this.palette));
  }

  /** Тайлы экрана: LCW-потоки подряд с VRAM 0. */
  private tileVram(tiles: readonly number[]): Uint8Array {
    const key = tiles.join(",");
    let vram = this.vrams.get(key);
    if (!vram) {
      vram = new Uint8Array(0x10000);
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
  private vrams = new Map<string, Uint8Array>();

  /**
   * Огоньки рамки окна: n слов карты Window из таблицы ROM (`table` + кадр·n·2), как их шлёт DMA
   * ($007F90 у окна здания, $00899A у космопорта). Возвращает полоску тайлов n×1.
   */
  windowLight(which: "factory" | "starport", table: number, n: number, frame: number): HTMLCanvasElement {
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
  starportBlip(ctx: CanvasRenderingContext2D, x: number, y: number, flip: number): void {
    const cfg = MENU_ROM.starport;
    const vram = this.tileVram(cfg.tiles);
    const map = this.memoMap(cfg.map);
    const pal = this.starportPalette();
    const px = new Uint32Array(64);
    blitTile(vram, (2 << 13) | (flip << 11) | 0x1d5, pal, px, 8, 0, 0);
    const img = ctx.getImageData(x, y, 8, 8);
    const out = new Uint32Array(img.data.buffer);
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const sx = x + c;
        const sy = y + r;
        if (!px[r * 8 + c] || sx < 0 || sy < 0 || sx >= SCREEN_W || sy >= SCREEN_H) continue;
        if (readU16(map, ((sy >> 3) * 64 + (sx >> 3)) * 2) & 0x8000) continue;
        out[r * 8 + c] = px[r * 8 + c];
      }
    ctx.putImageData(img, x, y);
  }
  private maps = new Map<number, Uint8Array>();
  private memoMap(addr: number): Uint8Array {
    let m = this.maps.get(addr);
    if (!m) {
      m = lcwDecompress(this.rom.bytes, addr).data;
      this.maps.set(addr, m);
    }
    return m;
  }

  /** VRAM из пар [LCW, адрес]; длина каждой порции — сколько игра шлёт DMA (до следующего адреса или $1000). */
  private vramFrom(parts: readonly (readonly [number, number])[], limit = 0x1000): Uint8Array {
    const key = "v:" + parts.map((p) => p.join(":")).join(",");
    let vram = this.vrams.get(key);
    if (!vram) {
      vram = new Uint8Array(0x10000);
      for (const [src, dst] of parts) {
        const data = lcwDecompress(this.rom.bytes, src).data;
        vram.set(data.subarray(0, Math.min(data.length, limit, 0x10000 - dst)), dst);
      }
      this.vrams.set(key, vram);
    }
    return vram;
  }

  /** Палитра из 4 строк ROM (адреса строк) с правками [номер цвета, слово CRAM]. */
  paletteOf(lines: readonly number[], fix: readonly (readonly [number, number])[] = []): Uint32Array {
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
  titleData(menu = true): { vram: Uint8Array; maps: Uint8Array; palette: Uint16Array } {
    const t = MENU_ROM.title;
    const vram = this.vramFrom(t.tiles);
    const maps = this.vramFrom([...t.planeA, ...t.planeB]).slice();
    const b = this.rom.bytes;
    if (menu)
      for (const [call, offset] of t.items) {
        if (readU16(b, call) !== 0x487a) continue; // pea (d16,pc)
        const str = call + 2 + ((readU16(b, call + 2) << 16) >> 16);
        for (let i = 0; b[str + i] && i < 40; i++) {
          const word = (3 << 13) | 0x480 | (b[str + i] & 0x7f);
          const at = 0xc000 + (offset + i) * 2;
          maps[at] = word >> 8;
          maps[at + 1] = word & 0xff;
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
  segaData(): { vram: Uint8Array; map: Uint8Array; palette: Uint16Array; cycle: number } {
    const b = this.rom.bytes;
    const vram = new Uint8Array(0x10000);
    vram.set(lcwDecompress(b, 0x001914).data.subarray(0, 0x31 * 32), 0);
    const map = lcwDecompress(b, 0x001d2a).data;
    const palette = new Uint16Array(64);
    for (let i = 0; i < 16; i++) palette[i] = readU16(b, 0x001da4 + i * 2);
    return { vram, map, palette, cycle: 0x0018d6 };
  }

  titleScreen(): HTMLCanvasElement {
    return this.memo("title", () => {
      const t = MENU_ROM.title;
      const { vram, maps } = this.titleData();
      const pal = this.paletteOf(t.palettes, t.paletteFix);
      const px = new Uint32Array(SCREEN_W * SCREEN_H).fill(pal[0]);
      const plane = (base: number, scroll: number) => {
        for (let cy = 0; cy < 28; cy++)
          for (let sx = 0; sx < 40; sx++) {
            const cx = (sx + scroll / 8) & 127;
            blitTile(vram, readU16(maps, base + (cy * 128 + cx) * 2), pal, px, SCREEN_W, sx * 8, cy * 8);
          }
      };
      plane(0xe000, t.scrollB);
      plane(0xc000, t.scrollA);
      return toCanvas(px, SCREEN_W, SCREEN_H);
    });
  }

  /** Имена пунктов по ссылкам оригинального меню; перевод сохраняется из загруженного ROM. */
  titleStrings(): string[] {
    const b = this.rom.bytes;
    return MENU_ROM.title.items.map(([call]) => decodeText(b, call + 2 + ((readU16(b, call + 2) << 16) >> 16)));
  }

  /** Логотип и пункты меню — гладкие буквы с расположением оригинала, поверх HD-фона. */
  drawTitleLettering(ctx: CanvasRenderingContext2D, elapsed = 0, musicTime = elapsed): void {
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
    const titleClock = musicTime > 0 ? musicTime : elapsed;
    // Opening.mp3 vocal, word onsets measured from the track: “The Battle for Arrakis”.
    const wordCues = musicTime > 0 ? [31.7, 32.46, 32.78, 33.2] : [0, 0.48, 0.96, 1.44];
    ctx.fillStyle = "#ff3430";
    ctx.shadowColor = '#ff1b16';
    ctx.shadowBlur = 2;
    titleWords.forEach((word, i) => {
      const start = wordCues[i];
      const age=titleClock-start;
      const progress = Math.max(0, Math.min(1, (elapsed-.3) / .35));
      if (progress > 0) {
        const voiceHit = age<0?0:Math.exp(-age/.48)*Math.min(1,age/.045);
        const width = ctx.measureText(word).width;
        ctx.globalAlpha = progress*(age>=0?1:.75);
        ctx.shadowBlur = 2 + voiceHit * 16;
        ctx.fillStyle=voiceHit>.5?'#ffb3a4':'#ff3430';
        ctx.save();
        ctx.translate(cursor + width / 2, 126 - (1 - progress) * 3);
        const pop=.96+progress*.04+voiceHit*.045;
        ctx.scale(pop,pop);
        ctx.fillText(word, -width / 2, 0);
        ctx.restore();
      }
      cursor += ctx.measureText(word + " ").width;
    });
    ctx.restore();
    const original=this.titleStrings();
    const items=[original[0],'СЕТЕВАЯ ИГРА',original[1]];
    items.forEach((text, i) => menuText(ctx, text, 128, 160 + i * 8, { size: 8, maxWidth: 164 }));
    menuText(ctx, "TALCO design studio · 2026",
      160, 204, { size: 4.6, align: "center", maxWidth: 280 });
  }

  /** Стрелка главного меню в фазе перелива (0…7). */
  titleArrow(phase: number): HTMLCanvasElement {
    const t = MENU_ROM.title;
    const p = phase & 7;
    return this.memo(`tarrow:${p}`, () => {
      const pal = this.paletteOf(t.palettes, [...t.paletteFix, [2 * 16 + 13, t.arrowPulse[p]]]);
      const px = new Uint32Array(64);
      blitTile(this.vramFrom(t.tiles), (2 << 13) | t.arrowTile, pal, px, 8, 0, 0);
      return toCanvas(px, 8, 8);
    });
  }

  houseScreen(): HTMLCanvasElement {
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
  houseFrame(color: number): HTMLCanvasElement {
    const c = color & 15;
    return this.memo(`hframe:${c}`, () => {
      const pal = this.rom.readPalette(MENU_ROM.house.palette, 4);
      const tiles = this.rom.bytes.subarray(MENU_ROM.house.frame, MENU_ROM.house.frame + 8 * 32).map((b) => (b ? (c << 4) | c : 0));
      const px = new Uint32Array(80 * 16);
      const put = (tile: number, x: number, y: number, hflip: boolean) => blitTile(tiles, (3 << 13) | (hflip ? 0x800 : 0) | tile, pal, px, 80, x, y);
      for (let col = 0; col < 4; col++) for (let row = 0; row < 2; row++) {
        put(col * 2 + row, col * 8, row * 8, false); // 4×2
        put(col * 2 + row, 48 + (3 - col) * 8, row * 8, true); // 4×2 с отражением
      }
      for (let col = 0; col < 2; col++) for (let row = 0; row < 2; row++) put(4 + col * 2 + row, 32 + col * 8, row * 8, false); // 2×2 из тайлов 4–7
      return toCanvas(px, 80, 16);
    });
  }

  /** Экран 40×28 тайлов: тайлы из LCW-потоков подряд с VRAM 0, карта — LCW, 64 слова в строке. */
  private tilemapScreen(tiles: readonly number[], mapAddr: number, palette: Uint32Array): HTMLCanvasElement {
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

  /**
   * Надписи меню — из ROM, по тем же ссылкам, что в коде меню ($020E00) и экрана дома ($026F6A):
   * так меню на языке загруженного ROM (русский перевод или английский оригинал).
   */
  menuStrings(): { yes: string; no: string; restart: string; chooseHouse: string; houses: string[]; version: string } {
    const b = this.rom.bytes;
    // lea/pea (d16,pc): адрес = адрес слова смещения + смещение
    const pcRel = (at: number, opcode: number, fallback: string) =>
      readU16(b, at) === opcode ? decodeText(b, at + 2 + ((readU16(b, at + 2) << 16) >> 16)) : fallback;
    const housesAt = readU16(b, 0x026f6a) === 0x41f9 ? (readU16(b, 0x026f6c) << 16) | readU16(b, 0x026f6e) : -1;
    const fallbackHouses = ["ХАРКОННЕНЫ", "АТРЕЙДЕСЫ", "ОРДОСЫ"];
    const houses = [0, 1, 2].map((i) => (housesAt > 0 ? decodeText(b, housesAt + i * 9, 9) : fallbackHouses[i]));
    // В русской таблице ROM название дома написано с ошибкой («АТРИДЕСЫ»).
    // Это общее место для экрана выбора дома и настроек, поэтому исправление
    // применяется ко всем интерфейсным надписям, сохраняя английский ROM.
    if (/[А-ЯЁ]/i.test(houses[1])) houses[1] = "АТРЕЙДЕСЫ";
    return {
      yes: pcRel(0x020e5a, 0x43fa, "ДА"),
      no: pcRel(0x020e60, 0x43fa, "НЕТ"),
      restart: pcRel(0x020ec2, 0x487a, "НАЧАТЬ СНАЧАЛА"),
      chooseHouse: pcRel(0x020ed6, 0x487a, "ВЫБРАТЬ ДРУГОЙ ДОМ"),
      // VERSIONNUM: строка версии, которую код $021A1E пишет в поле ввода пароля
      version: pcRel(0x021a1e, 0x487a, "VERSION"),
      // 9 байт на дом, по номеру дома: 0 — Харконнены, 1 — Атрейдесы, 2 — Ордосы
      houses,
    };
  }

  /** Палитра окна здания: строка 0 — чёрная (там картинка со своей палитрой), 1–3 из ROM. */
  factoryPalette(): Uint32Array {
    return this.memoPal("factory", () => {
      const pal = new Uint32Array(64).fill(cramToRGBA(0));
      MENU_ROM.factory.palettes.forEach((addr, i) => pal.set(this.rom.readPalette(addr, 1), (i + 1) * 16));
      return pal;
    });
  }

  /** Палитра окна космопорта: строка 2 зелёная. */
  starportPalette(): Uint32Array {
    return this.memoPal("starport", () => {
      const pal = new Uint32Array(64).fill(cramToRGBA(0));
      MENU_ROM.starport.palettes.forEach((addr, i) => pal.set(this.rom.readPalette(addr, 1), (i + 1) * 16));
      return pal;
    });
  }

  starportBackground(): HTMLCanvasElement {
    return this.memo("bg:starport", () => this.tilemapScreen(MENU_ROM.starport.tiles, MENU_ROM.starport.map, this.starportPalette()));
  }

  /** Значок патрона 2×2 (урон юнита) — у заводов юнитов и космопорта вместо энергии. */
  ammoIcon(): HTMLCanvasElement {
    return this.memo("ammo", () => this.sprite(MENU_ROM.factory.ammoIcon, 2, 2, 1, this.factoryPalette(), false));
  }

  /** Рамка окна здания целиком (320×224). */
  factoryBackground(): HTMLCanvasElement {
    return this.memo("bg:factory", () => this.tilemapScreen(MENU_ROM.factory.tiles, MENU_ROM.factory.map, this.factoryPalette()));
  }

  /**
   * Иконка 4×3 из таблицы окна: index ≥ 0 — тип здания или юнита, −5…−1 — кнопки
   * (−5 СТОП и −4 РЕМОНТ тёмные, −3 СТОП и −2 РЕМОНТ светлые, −1 ВЫХОД). Палитра — как в коде $00827A:
   * здания строка 1, юниты строка 3 (кроме типа 12).
   */
  factoryIcon(units: boolean, index: number): HTMLCanvasElement | null {
    return this.memoNull(`fi:${units}:${index}`, () => {
      const table = units ? MENU_ROM.factory.unitIcons : MENU_ROM.factory.structureIcons;
      const ptr = (readU16(this.rom.bytes, table + index * 4) << 16) | readU16(this.rom.bytes, table + index * 4 + 2);
      if (!ptr || ptr >= this.rom.bytes.length) return null;
      const line = units && index !== 12 ? 3 : 1;
      return this.sprite(ptr, 4, 3, line, this.factoryPalette(), false);
    });
  }

  /**
   * Рамка-курсор с переливом ($008596): каждый кадр счётчик +1, фаза (счётчик & 31) >> 3 выбирает цвет из
   * 11, 12, 15, 12 (`$0085E0`); каждый ненулевой байт тайлов рамки заменяется на этот цвет в обоих пикселях.
   */
  factoryCursor(phase = 0, starport = false): HTMLCanvasElement {
    const p = phase & 3;
    return this.memo(`fcur:${starport}:${p}`, () => {
      const c = this.rom.bytes[0x0085e0 + p] & 15;
      const src = this.rom.bytes.subarray(MENU_ROM.factory.cursor, MENU_ROM.factory.cursor + 12 * 32);
      const tiles = src.map((b) => (b ? (c << 4) | c : 0));
      return this.spriteFrom(tiles, 4, 3, 2, starport ? this.starportPalette() : this.factoryPalette());
    });
  }

  /** Значок 2×2: цена (0), энергия (1), прочность (2). */
  statIcon(i: number): HTMLCanvasElement {
    return this.memo(`stat:${i}`, () => this.sprite(MENU_ROM.factory.statIcons[i], 2, 2, 1, this.factoryPalette(), false));
  }

  /** Значок размера здания: 0 — 1×1, 1 — 2×2, 2 — 3×2, 3 — 3×3. */
  sizeIcon(i: number): HTMLCanvasElement {
    return this.memo(`size:${i}`, () => this.sprite(MENU_ROM.factory.sizeIcons + i * 128, 2, 2, 1, this.factoryPalette(), false));
  }

  /** Строка шрифтом целыми тайлами (буква на чёрном), как надписи в окне здания; строка палитры 1. */
  plainText(text: string): HTMLCanvasElement {
    return this.memo(`pt:${text}`, () => {
      const codes = encodeText(text);
      const px = new Uint32Array(Math.max(1, codes.length) * 64);
      const w = Math.max(1, codes.length) * 8;
      codes.forEach((code, i) => blitTile(this.rom.bytes.subarray(MENU_ROM.font), (1 << 13) | code, this.factoryPalette(), px, w, i * 8, 0));
      return toCanvas(px, w, 8);
    });
  }

  /** Имя здания или юнита из таблиц описаний ROM (указатель на +2), как в окне оригинала. */
  objectName(units: boolean, type: number): string {
    const b = this.rom.bytes;
    const rec = units ? (readU16(b, 0x06c5bc + type * 4) << 16) | readU16(b, 0x06c5bc + type * 4 + 2) : 0x06afae + type * 0x66;
    const ptr = (readU16(b, rec + 2) << 16) | readU16(b, rec + 4);
    let s = "";
    for (let i = 0; i < 12 && b[ptr + i]; i++) s += decodeText(b, ptr + i, 1) || " ";
    return s;
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

  /** Спрайт из готовых тайлов (по столбцам). */
  private spriteFrom(tiles: Uint8Array, tw: number, th: number, line: number, pal: Uint32Array): HTMLCanvasElement {
    const w = tw * 8;
    const px = new Uint32Array(w * th * 8);
    for (let c = 0; c < tw; c++) for (let r = 0; r < th; r++) blitTile(tiles, (line << 13) | (c * th + r), pal, px, w, c * 8, r * 8);
    return toCanvas(px, w, th * 8);
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

  private pals = new Map<string, Uint32Array>();
  private memoPal(key: string, make: () => Uint32Array): Uint32Array {
    let p = this.pals.get(key);
    if (!p) {
      p = make();
      this.pals.set(key, p);
    }
    return p;
  }

  private nulls = new Set<string>();
  private memoNull(key: string, make: () => HTMLCanvasElement | null): HTMLCanvasElement | null {
    if (this.nulls.has(key)) return null;
    const c = this.cache.get(key) ?? make();
    if (c) this.cache.set(key, c);
    else this.nulls.add(key);
    return c;
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
