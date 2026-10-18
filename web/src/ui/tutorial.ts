/**
 * Режим «ОБУЧЕНИЕ» MD ($03067C): ролик из шести скриптов ($041916: 0, 1, 3, 5, 6, 7), которые исполняет
 * интерпретатор $0418DC. Картинка — две плоскости 64×28 (A $C000, B $E000), их кадры лежат потоками
 * с дельта-сжатием ($0417E8: $80 n — пропуск n клеток, 0…$7F n w — повтор слова, $81…$FF — n слов подряд);
 * тайлы и потоки — из таблицы наборов $0416E2. Поверх — «геймпад» ($01314E: кадры $01321A, тайлы $013876)
 * и рамка с текстом ($04295E: шрифт $042D02, таблица знаков $042AD0, спрайты $042B50).
 * Команды: ждать (A/B/C — дальше, Start — выход), кадр плоскости, повтор, звук, палитра, текст, сдвиг геймпада.
 * Палитра проявляется и гаснет шагом раз в 5 кадров ($0043C6(5)).
 */
import { lcwDecompress } from "../rom/lcw.ts";
import { blitTile, cramToRGBA, readU16, readU32 } from "../rom/md.ts";
import type { DuneRom } from "../rom/dune.ts";
import { SCREEN_H, SCREEN_W } from "../gfx/screens.ts";
import type { Button } from "../input/pad.ts";
import { drawObjSprite, objectDef, type ObjSprite } from "./endgame.ts";
import type { Sound } from "../sound/sound.ts";

export const TUTORIAL_ROM = {
  scripts: [0x041b48, 0x041b82, 0x041bd0, 0x041fd6, 0x0423cc, 0x042936],
  sets: 0x0416e2,
  padFrames: 0x01321a,
  padTiles: 0x013876,
  padVram: 0x5960,
  textDef: 0x042b50,
  font: 0x042d02,
  charMap: 0x042ad0,
} as const;

type Step = Generator<void, boolean | void, void>;

const FADE_FRAMES = 5;

function stepColor(c: number, target: number): number {
  let out = 0;
  for (const [mask, one] of [[0x00e, 0x002], [0x0e0, 0x020], [0xe00, 0x200]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}

interface Obj {
  x: number;
  y: number;
  sprites: ObjSprite[];
}

export class TutorialScreen {
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
  /** плоскости A и B (64 × 28 слов) и потоки их кадров с текущей позицией */
  private plane = [new Uint16Array(64 * 28), new Uint16Array(64 * 28)];
  private shown = [new Uint16Array(64 * 28), new Uint16Array(64 * 28)];
  private stream: (Uint8Array | null)[] = [null, null];
  private pos = [0, 0];
  private cram = new Uint16Array(64);
  private pad: Obj | null = null;
  private padFrame = -1;
  private text: Obj | null = null;
  private pressed = false;
  private start = false;

  constructor(
    private rom: DuneRom,
    private sound: Sound | null = null,
  ) {
    this.root = document.createElement("section");
    this.root.className = "settings tutorial";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Обучение");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.img = this.ctx.createImageData(SCREEN_W, SCREEN_H);
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", () => (this.pressed = true));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(done: () => void): void {
    this.done = done;
    this.vram.fill(0);
    this.plane.forEach((p) => p.fill(0));
    this.shown.forEach((p) => p.fill(0));
    this.cram.fill(0);
    this.pad = null;
    this.text = null;
    this.gen = this.run();
    this.pressed = this.start = false;
    this.root.hidden = false;
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.acc = 0;
    this.loop();
  }

  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    if (b === "a" || b === "b" || b === "c") this.pressed = true;
    else if (b === "start") this.start = true;
    return true;
  }

  close(): void {
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  /** Для автотестов: прогнать n кадров. */
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

  // ---------------------------------------------------------------- ROM
  /** Описание загрузки тайлов ($000CD8): слово «число тайлов» (бит 15 — LCW), длинное слово «откуда». */
  private loadTiles(desc: number, dst: number): void {
    const b = this.rom.bytes;
    for (let p = desc; ; p += 6) {
      const n = readU16(b, p);
      if (!n) break;
      const src = readU32(b, p + 2) & 0xffffff;
      const count = n & 0x7fff;
      const data = n & 0x8000 ? lcwDecompress(b, src).data : b.subarray(src, src + count * 32);
      this.vram.set(data.subarray(0, Math.min(count * 32, 0x10000 - dst)), dst);
      dst += count * 32;
    }
  }

  /** $04166A: набор — тайлы с VRAM 0 и потоки кадров плоскостей A и B. */
  private loadSet(n: number): void {
    const b = this.rom.bytes;
    const e = TUTORIAL_ROM.sets + n * 12;
    const tiles = readU32(b, e);
    if (tiles) this.loadTiles(tiles, 0);
    for (let k = 0; k < 2; k++) {
      const s = readU32(b, e + 4 + k * 4);
      this.stream[k] = s ? lcwDecompress(b, s).data : null;
      this.pos[k] = 0;
    }
  }

  /** $041772 / $0417E8: следующий кадр плоскости (show — сразу на экран); −1 — поток кончился. */
  private nextFrame(k: number, show: boolean): number {
    const s = this.stream[k];
    if (!s) return 0;
    let p = this.pos[k];
    const size = (s[p] << 8) | s[p + 1];
    if (size === 0xffff) return -1;
    p += 2;
    const buf = this.plane[k];
    let at = 0;
    let col = 0;
    const put = (w: number) => {
      buf[at++] = w;
      if (++col === 40) {
        at += 24;
        col = 0;
      }
    };
    let left = size;
    while (left > 0) {
      const c = s[p++];
      if (c === 0x80) {
        const n = s[p++];
        left -= 1;
        at += n;
        col += n;
        if (col >= 40) {
          at += 24 * Math.floor(col / 40);
          col %= 40;
        }
      } else if (c < 0x80) {
        const w = (s[p] << 8) | s[p + 1];
        p += 2;
        left -= 2;
        for (let i = 0; i < c; i++) put(w);
      } else {
        const n = c & 0x7f;
        left -= 2 * n;
        for (let i = 0; i < n; i++) {
          put((s[p] << 8) | s[p + 1]);
          p += 2;
        }
      }
      left -= 1;
    }
    this.pos[k] += size + 2;
    if (show) this.shown[k].set(buf);
    return 0;
  }

  /** $01314E: геймпад кадра f в (x, y). */
  private setPad(x: number, y: number, f: number): void {
    const b = this.rom.bytes;
    if (f !== this.padFrame || !this.pad) {
      this.padFrame = f;
      this.pad = { x, y, sprites: objectDef(b, readU32(b, TUTORIAL_ROM.padFrames + f * 8 + 4)) };
    }
    this.pad.x = x;
    this.pad.y = y;
  }

  /** $04295E: рамка и две строки текста (знаки — через таблицу $042AD0, \n — вторая строка). */
  private setText(bytes: number[]): void {
    const b = this.rom.bytes;
    const font = TUTORIAL_ROM.font;
    this.vram.fill(0, 0xcec0, 0xcec0 + 0x1000);
    // рамка: углы и края в $CE00
    this.vram.set(b.subarray(font + 0x120, font + 0x140), 0xce00);
    this.vram.set(b.subarray(font + 0x160, font + 0x180), 0xce20);
    for (let i = 0; i < 4; i++) this.vram.set(b.subarray(font + 0x140, font + 0x160), 0xce40 + i * 0x20);
    let at = 0xcec0;
    for (const ch of bytes) {
      if (ch === 0x0a) {
        at = 0xd2c0;
        continue;
      }
      const g = b[TUTORIAL_ROM.charMap + ch];
      this.vram.set(b.subarray(font + g * 32, font + g * 32 + 32), at);
      at += 0x20;
    }
    this.text = { x: 0x1c, y: 0x20, sprites: objectDef(b, TUTORIAL_ROM.textDef) };
  }

  // ---------------------------------------------------------------- исполнение
  private *fade(target: Uint16Array | null): Step {
    for (;;) {
      let same = 0;
      for (let i = 0; i < 64; i++) {
        const t = target ? target[i] : 0;
        if (this.cram[i] === t) same++;
        else this.cram[i] = stepColor(this.cram[i], t);
      }
      for (let i = 0; i < FADE_FRAMES; i++) yield;
      if (same === 64) return;
    }
  }

  private palette(addr: number): Uint16Array {
    const p = new Uint16Array(64);
    for (let i = 0; i < 64; i++) p[i] = readU16(this.rom.bytes, addr + i * 2);
    return p;
  }

  /** $0418AC: n кадров; A/B/C — дальше, Start — выход (true). */
  private *wait(n: number): Step {
    this.pressed = false;
    for (let i = 0; i < n; i++) {
      if (this.start) return true;
      if (this.pressed) {
        this.pressed = false;
        return false;
      }
      yield;
    }
    return false;
  }

  /** Скрипт $0418DC; true — прерван Start. */
  private *script(addr: number): Step {
    const b = this.rom.bytes;
    let p = addr;
    const w = () => {
      const v = (readU16(b, p) << 16) >> 16;
      p += 2;
      return v;
    };
    const l = () => {
      const v = readU32(b, p);
      p += 4;
      return v;
    };
    let mark = p;
    let count = 0;
    let markCount = p;
    let result = 0;
    for (let guard = 0; guard < 100000; guard++) {
      const op = w();
      switch (op) {
        case 0:
          return false;
        case 2:
          if (yield* this.wait(w())) return true;
          break;
        case 4:
          this.loadSet(w());
          break;
        case 6:
          result = this.nextFrame(w(), true);
          break;
        case 8:
          mark = p;
          break;
        case 10:
          if (result !== w()) p = mark;
          break;
        case 12:
          p = l();
          break;
        case 14:
          yield* this.fade(null);
          break;
        case 16:
          yield* this.fade(this.palette(l()));
          break;
        case 18:
          count = w();
          markCount = p;
          break;
        case 20:
          if (--count !== 0) p = markCount;
          break;
        case 22: {
          const k = w();
          const n = w();
          for (let i = 0; i < n; i++) result = this.nextFrame(k, false);
          break;
        }
        case 24:
          this.sound?.ui(w());
          break;
        case 26:
          this.pos[0] = this.pos[1] = 0;
          break;
        case 28:
          this.pos[0] = 0;
          break;
        case 30:
          this.pos[1] = 0;
          break;
        case 32:
          this.loadTiles(TUTORIAL_ROM.padTiles, TUTORIAL_ROM.padVram);
          this.pad = null;
          this.padFrame = -1;
          break;
        case 34: {
          const y = w();
          const x = w();
          this.setPad(x, y, w());
          break;
        }
        case 36:
          this.pad = null;
          this.padFrame = -1;
          break;
        case 38: {
          const y = w();
          const x = w();
          if (this.pad) {
            this.pad.x = x;
            this.pad.y = y;
          }
          break;
        }
        case 40:
        case 42:
          for (let i = 0; i < 32; i++) {
            if (this.pad) this.pad.y += op === 40 ? -3 : 3;
            yield;
          }
          break;
        case 44:
          this.cram.set(this.palette(l()));
          break;
        case 46:
          yield;
          break;
        case 48: {
          const bytes: number[] = [];
          while (b[p]) bytes.push(b[p++]);
          p = (p + 2) & ~1;
          this.setText(bytes);
          break;
        }
        case 50:
          this.text = null;
          break;
        case 52:
          this.plane[1].fill(0);
          this.shown[1].fill(0);
          break;
        default:
          return false;
      }
    }
    return false;
  }

  private *run(): Step {
    // $03071C: геймпад и его тайлы; секвенция 5 — музыка обучения
    this.loadTiles(TUTORIAL_ROM.padTiles, TUTORIAL_ROM.padVram);
    if (this.sound?.musicOn) this.sound.play(5);
    for (const s of TUTORIAL_ROM.scripts) if (yield* this.script(s)) break;
    yield* this.fade(null);
  }

  private draw(): void {
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    for (const k of [1, 0]) {
      const p = this.shown[k];
      for (let cy = 0; cy < 28; cy++)
        for (let cx = 0; cx < 40; cx++) {
          const word = p[cy * 64 + cx];
          if (word & 0x7ff) blitTile(this.vram, word, pal, px, SCREEN_W, cx * 8, cy * 8);
        }
    }
    for (const o of [this.text, this.pad])
      if (o) for (let i = o.sprites.length - 1; i >= 0; i--) drawObjSprite(px, SCREEN_W, SCREEN_H, this.vram, 0, o.sprites[i], o.x + o.sprites[i].x, o.y + o.sprites[i].y, pal);
    new Uint32Array(this.img.data.buffer).set(px);
    this.ctx.putImageData(this.img, 0, 0);
  }
}
