/**
 * Экран итогов миссии MD ($0271E2), сразу после текста ментата о победе или поражении:
 * - фон — одна из трёх картинок по номеру миссии ($026C68: миссия mod 3), плоскость B;
 * - надписи ($0A5D8E) пишутся в строки 28…55 плоскости A и въезжают снизу прокруткой ($027026);
 * - очки, время (ч:мм), звание по порогам очков ($0A68D2, строки по 17 знаков $0A68E2);
 * - три пары полос — спайс, уничтоженные войска, уничтоженные постройки, «тобой» и «врагами»
 *   ($026F98): полоса растёт на точку в кадр, число — на шаг пары (больший из двух / 168 + 1);
 * - A, B, C или Start — дальше; после победы (не в 9-й миссии) — страница с паролем ($026F0A),
 *   въезжает так же; ещё одно нажатие — палитра гаснет.
 */
import { lcwDecompress } from "../rom/lcw.ts";
import { blitTile, cramToRGBA, readU16, readU32 } from "../rom/md.ts";
import type { DuneRom } from "../rom/dune.ts";
import { SCREEN_H, SCREEN_W } from "../gfx/screens.ts";
import type { Button } from "../input/pad.ts";

export const SCORE_ROM = {
  pictureTiles: 0x0a2e80,
  pictures: 0x026c5c,
  palette: 0x0a5d0e,
  font: 0x050c34,
  layout: 0x0a5d8e,
  passwordLayout: 0x0b9312,
  rankLimits: 0x0a68d2,
  ranks: 0x0a68e2,
  finalRank: 0x0a696a,
  houseNames: 0x0a697d,
  passwords: 0x088124,
} as const;

/** Итоги миссии: счётчики MD $FFC05E, $FFC096…$FFC0A0. */
export interface MissionStats {
  mission: number;
  /** ROM-номер дома игрока (0 Харконнены, 1 Атрейдесы, 2 Ордосы) */
  house: number;
  won: boolean;
  score: number;
  /** время миссии в кадрах */
  time: number;
  spice: [number, number];
  units: [number, number];
  structures: [number, number];
}

/** Адрес в плоскости A ($E000, 64 клетки в строке) → номер клетки. */
const cell = (addr: number) => (addr - 0xe000) >> 1;

type Step = Generator<void, void, void>;

function stepColor(c: number, target: number): number {
  let out = 0;
  for (const [mask, one] of [[0x00e, 0x002], [0x0e0, 0x020], [0xe00, 0x200]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}

export class ScoreScreen {
  readonly root: HTMLElement;
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private img: ImageData;
  private px = new Uint32Array(SCREEN_W * SCREEN_H);
  private raf = 0;
  private last = 0;
  private acc = 0;
  private gen: Step | null = null;
  private done: (() => void) | null = null;
  private vram = new Uint8Array(0x10000);
  private planeA = new Uint16Array(64 * 64);
  private planeB = new Uint16Array(64 * 32);
  private vscroll = 0;
  private cram = new Uint16Array(64);
  private held = false;

  constructor(
    private rom: DuneRom,
    private sound: (id: number) => void = () => {},
  ) {
    this.root = document.createElement("section");
    this.root.className = "settings scorescreen";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Итоги миссии");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.img = this.ctx.createImageData(SCREEN_W, SCREEN_H);
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", () => (this.held = true));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(stats: MissionStats, done: () => void): void {
    this.done = done;
    this.gen = this.run(stats);
    this.held = false;
    this.root.hidden = false;
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.acc = 0;
    this.loop();
  }

  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    if (b === "a" || b === "b" || b === "c" || b === "start") this.held = true;
    return true;
  }

  close(): void {
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  /** Для автотестов: прогнать n кадров без своего цикла. */
  stepFrames(n: number): void {
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < n && !this.root.hidden; i++) this.tick();
    if (!this.root.hidden) this.draw();
  }

  private loop(): void {
    const now = performance.now();
    this.acc = Math.min(this.acc + (now - this.last), 250);
    this.last = now;
    while (this.acc >= 1000 / 60 && !this.root.hidden) {
      this.acc -= 1000 / 60;
      this.tick();
    }
    if (this.root.hidden) return;
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  private tick(): void {
    if (this.gen?.next().done) {
      this.close();
      this.done?.();
    }
  }

  /** Ждать A/B/C/Start ($0272CA: нажатая кнопка, маска $E41E = 0 — по удержанию). */
  private *waitKey(): Step {
    this.held = false;
    while (!this.held) yield;
    this.held = false;
  }

  /** Палитра к цели или к чёрному, шаг раз в 3 кадра, пока всё не сойдётся ($0006C8, $000628). */
  private *fade(target: Uint16Array | null): Step {
    for (;;) {
      let same = 0;
      for (let i = 0; i < 64; i++) {
        const t = target ? target[i] : 0;
        if (this.cram[i] === t) same++;
        else this.cram[i] = stepColor(this.cram[i], t);
      }
      for (let k = 0; k < 3; k++) yield;
      if (same === 64) return;
    }
  }

  /** Надписи LCW в строки 28…55 плоскости A ($EE00). */
  private layout(addr: number): void {
    const map = lcwDecompress(this.rom.bytes, addr).data;
    for (let i = 0; i < 0x700; i++) this.planeA[28 * 64 + i] = readU16(map, i * 2);
  }

  /** Число цифрами шрифта ($026D3C): справа налево с последней клетки; pad — с ведущими нулями. */
  private number(value: number, addr: number, digits: number, pad = false): void {
    let at = cell(addr) + digits - 1;
    let v = value >>> 0;
    this.planeA[at] = 0x4530 + (v % 10);
    for (let i = 1; i < digits; i++) {
      v = Math.floor(v / 10) & 0xffff;
      if (!pad && v === 0) break;
      at--;
      this.planeA[at] = 0x4530 + (v % 10);
    }
  }

  /** Строка байтов ROM знаками шрифта ($026DB2: тайл $500 + код, строка 2). */
  private text(src: number, len: number, addr: number): void {
    for (let i = 0; i < len; i++) this.planeA[cell(addr) + i] = 0x4500 + this.rom.bytes[src + i];
  }

  /** Полоса ($026DEE): целые клетки $17, хвост $18 + длина mod 8. */
  private bar(len: number, addr: number, base: number): void {
    let at = cell(addr);
    for (let i = 0; i < len >> 3; i++) this.planeA[at++] = base + 0x17;
    this.planeA[at] = base + 0x18 + (len & 7);
  }

  /** Въезд страницы снизу ($027026): разгон до середины, торможение до 224. */
  private *scrollIn(): Step {
    let speed = 0x10000;
    let pos = 0;
    while (pos < 0x700000) {
      yield;
      this.vscroll = pos >>> 16;
      speed += 0x2000;
      pos += speed >= 0x100000 ? 0x100000 : speed;
    }
    while (pos < 0xe00000) {
      yield;
      this.vscroll = pos >>> 16;
      speed -= 0x2000;
      pos += speed <= 0x10000 ? 0x10000 : speed;
    }
    yield;
    this.vscroll = 0xe0;
  }

  /** Строки 28…55 → 0…27, прокрутка 0 ($027120). */
  private settle(): void {
    this.planeA.copyWithin(0, 28 * 64, 56 * 64);
    this.vscroll = 0;
  }

  /** Шаг пары ($0270EE): больший из двух (не больше 65000) / 168 + 1, до 168 — 1. */
  private static scale(a: number, b: number): number {
    const m = Math.max(Math.min(a, 65000), Math.min(b, 65000));
    return m <= 168 ? 1 : Math.floor(m / 168) + 1;
  }

  /** Полоса с числом растёт до значения ($026F98). */
  private *grow(value: number, addr: number, base: number, step: number): Step {
    let len = 0;
    let shown = 0;
    let n = 0;
    do {
      yield;
      this.bar(len, addr, base);
      len++;
      this.number(shown, addr + 0x2c, 5);
      if ((++n & 3) === 0) this.sound(0x34);
      shown += step;
    } while (value > shown);
    this.number(value, addr + 0x2c, 5);
    for (let i = 0; i < 11; i++) yield;
  }

  private *run(s: MissionStats): Step {
    const b = this.rom.bytes;
    this.vram.fill(0);
    this.planeA.fill(0);
    this.planeB.fill(0);
    this.vscroll = 0;
    this.cram.fill(0);
    // $026C68: тайлы фона — 7 потоков по $1000; картинка — по миссии mod 3
    for (let i = 0; i < 7; i++) this.vram.set(lcwDecompress(b, readU32(b, SCORE_ROM.pictureTiles + i * 4)).data.subarray(0, 0x1000), i * 0x1000);
    const pic = lcwDecompress(b, readU32(b, SCORE_ROM.pictures + (s.mission % 3) * 4)).data;
    for (let i = 0; i < 0x700; i++) this.planeB[i] = readU16(pic, i * 2);
    const target = new Uint16Array(64);
    for (let i = 0; i < 64; i++) target[i] = readU16(b, SCORE_ROM.palette + i * 2);
    yield* this.fade(target);
    // $026E3A: шрифт в $A000, надписи, очки, время, звание
    this.vram.set(b.subarray(SCORE_ROM.font, SCORE_ROM.font + 0x1000), 0xa000);
    this.layout(SCORE_ROM.layout);
    this.number(s.score, 0xef92, 5);
    const hours = Math.floor(Math.floor(s.time / 3600) / 60);
    const minutes = Math.floor((s.time - hours * 60 * 3600) / 3600);
    this.number(hours, 0xefbc, 2);
    this.number(minutes, 0xefc2, 2, true);
    let rank: number = SCORE_ROM.ranks;
    if (s.won && s.mission === 9) rank = SCORE_ROM.finalRank;
    else for (let i = 0; i < 8 && (s.score & 0xffff) >= readU16(b, SCORE_ROM.rankLimits + i * 2); i++) rank += 17;
    this.text(rank, 17, 0xf198);
    yield* this.scrollIn();
    // три пары полос
    const pairs: [[number, number], number][] = [
      [s.spice, 0xf494],
      [s.units, 0xf714],
      [s.structures, 0xf994],
    ];
    for (const [[you, them], addr] of pairs) {
      const step = ScoreScreen.scale(you, them);
      yield* this.grow(you, addr, 0x0500, step);
      yield* this.grow(them, addr + 0x80, 0x2500, step);
    }
    this.settle();
    yield* this.waitKey();
    if (s.won && s.mission < 9) {
      // $026F0A: пароль следующей миссии, имя дома, номер одержанной победы
      this.layout(SCORE_ROM.passwordLayout);
      this.text(readU32(b, SCORE_ROM.passwords + (s.mission - 1) * 0x18 + s.house * 8), 10, 0xf41e);
      this.text(SCORE_ROM.houseNames + s.house * 9, 9, 0xf220);
      this.number(s.mission, 0xf32c, 1);
      yield* this.scrollIn();
      yield* this.waitKey();
    }
    yield* this.fade(null);
  }

  private draw(): void {
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(this.vram, this.planeB[cy * 64 + cx], pal, px, SCREEN_W, cx * 8, cy * 8);
    // плоскость A с вертикальной прокруткой: строка экрана y — строка плоскости y + vscroll
    const v = this.vscroll;
    const tile = new Uint32Array(64);
    for (let cy = 0; cy < 29; cy++)
      for (let cx = 0; cx < 40; cx++) {
        const sy = cy * 8 - (v & 7);
        const word = this.planeA[(((v >> 3) + cy) & 63) * 64 + cx];
        if (!(word & 0x7ff)) continue;
        tile.fill(0);
        blitTile(this.vram, word, pal, tile, 8, 0, 0);
        for (let r = 0; r < 8; r++) {
          const y = sy + r;
          if (y < 0 || y >= SCREEN_H) continue;
          for (let c = 0; c < 8; c++) if (tile[r * 8 + c]) px[y * SCREEN_W + cx * 8 + c] = tile[r * 8 + c];
        }
      }
    new Uint32Array(this.img.data.buffer).set(px);
    this.ctx.putImageData(this.img, 0, 0);
  }
}
