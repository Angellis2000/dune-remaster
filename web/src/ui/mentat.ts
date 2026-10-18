/**
 * Экран ментата MD: вступление дома, брифинг, совет, победа и поражение. Графика — gfx/mentat.ts,
 * поведение — порт кода ROM:
 * - $025ECE: экран собирается в темноте, палитра проявляется ($0006C8: шаг цвета раз в 3 кадра);
 * - $01F9DA: пауза 30 + 15 кадров на страницу (A/B/C пропускает), затем страницы текста: говорит
 *   длина·4 кадра, молчит ещё длина·6, затем следующая; A/B/C — сразу следующая; после последней — выход;
 * - $01F626: глаза и рот — случайные кадры с таймерами, рот двигается, пока ментат говорит;
 * - $025BB8: кнопки ДА/НЕТ или ПРИНЯТЬ/СОВЕТ поверх глаз и рта, рамка ездит ↑/↓ (12 кадров по 2 точки),
 *   A/B/C — выбор; после выбора тайлы глаз и рта очищены (как в оригинале);
 * - $0264CA: палитра гаснет (шаг раз в 3 кадра).
 * Цвета 8–11 строки 2 крутятся раз в 8 кадров ($024728).
 */
import { MentatGfx, toRGBA, type MdSprite } from "../gfx/mentat.ts";
import { SCREEN_H, SCREEN_W } from "../gfx/screens.ts";
import type { DuneRom } from "../rom/dune.ts";
import type { Button } from "../input/pad.ts";
import type { HouseCode } from "./settings.ts";

/** Номер дома в таблицах ROM: 0 Харконнены, 1 Атрейдесы, 2 Ордосы. */
export const HOUSE_INDEX: Record<HouseCode, number> = { H: 0, A: 1, O: 2 };

/** Кнопки после текста: ДА/НЕТ, ПРИНЯТЬ/СОВЕТ или ждать A/B/C (победа, поражение). */
export type MentatButtons = "yesno" | "accept" | "key";

export interface MentatScene {
  house: HouseCode;
  /** уровень карты владений 0–8 */
  level: number;
  /** адрес текста в ROM */
  text: number;
  buttons: MentatButtons;
  /** продолжить на том же экране без затемнения (совет, $0260EC) */
  again?: boolean;
}

/** Звуки оригинала ($02DDB6): $19 — рамка кнопок, $28 — выбор. */
export type MentatSound = 0x19 | 0x28;

const FADE_FRAMES = 3;
const CYCLE_FRAMES = 8;
const EYES = [9, 10];
const MOUTH = [11, 12, 13, 14];
/** рамка кнопок: верх и низ ($128/$140 в SAT) */
const BUTTON_TOP = 168;
const BUTTON_BOTTOM = 192;

type Phase = "fadein" | "typer" | "buttons" | "key" | "fadeout" | "idle";

/** Случайное в [lo, hi], как $000C0C. */
function rnd(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Шаг затемнения/проявления цвета на 1 по каждому каналу ($000628, $0006C8). */
function stepColor(c: number, target: number): number {
  let out = 0;
  for (const [mask, one] of [[0x00e, 0x002], [0x0e0, 0x020], [0xe00, 0x200]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}

export class MentatScreen {
  readonly root: HTMLElement;
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private gfx: MentatGfx;
  private px = new Uint32Array(SCREEN_W * SCREEN_H);
  private img: ImageData;
  private raf = 0;
  private last = 0;
  private acc = 0;

  private scene!: MentatScene;
  private done: ((choice: number) => void) | null = null;
  private house = 0;
  private vram = new Uint8Array(0);
  private sprites: MdSprite[] = [];
  private phase: Phase = "idle";
  /** счётчик кадров ($E01A) */
  private timer = 0;
  private cycle = 0;
  private cycleWait = 0;
  /** цвета в CRAM, тень палитры ($E2B4, по ней идёт затемнение) и цель проявления */
  private cram = new Uint16Array(64);
  private shadow = new Uint16Array(64);
  private target: Uint16Array = new Uint16Array(64);
  private fadeWait = 0;
  private pressed = false;
  private choice = 0;

  // текст ($01F9DA)
  private pages: number[][] = [];
  private page: number[] = [];
  private state = 1;
  private talk = 2;
  private remaining = 0;
  private shown = 0;
  private wait = 0;
  private talkUntil = 0;
  private talkTime = 0;
  private lastPage = false;

  // лицо ($01F626): глаза — текущий, следующий, таймер; рот — кадр, таймер
  private eyes = 0;
  private eyesNext = 0;
  private eyesAt = 0;
  private mouth = 0;
  private mouthAt = 0;
  private faceHidden = false;

  // кнопки ($025BB8)
  private buttonY = BUTTON_TOP;
  private buttonMove = 0;
  private buttonStep = 0;

  constructor(
    rom: DuneRom,
    private sound: (id: MentatSound) => void = () => {},
  ) {
    this.gfx = new MentatGfx(rom);
    this.root = document.createElement("section");
    this.root.className = "settings mentat";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Ментат");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.img = this.ctx.createImageData(SCREEN_W, SCREEN_H);
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", (e) => this.onClick(e));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Адрес текста: вступление дома (mission = null) или миссии (0 брифинг, 1 победа, 2 поражение, 3 совет). */
  text(house: HouseCode, mission: number | null, kind = 0): number {
    return this.gfx.textOf(HOUSE_INDEX[house], mission, kind);
  }

  /** Показать сцену; done(0 — ДА/ПРИНЯТЬ или любая кнопка, 1 — НЕТ/СОВЕТ). */
  open(scene: MentatScene, done: (choice: number) => void): void {
    this.scene = scene;
    this.done = done;
    this.house = HOUSE_INDEX[scene.house];
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
    // $01F9DA: начальное состояние
    this.pages = this.gfx.pages(scene.text);
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

  close(): void {
    this.root.hidden = true;
    this.phase = "idle";
    cancelAnimationFrame(this.raf);
  }

  /** Кнопка геймпада, пока экран открыт. */
  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    if (b === "a" || b === "b" || b === "c") this.pressed = true;
    else if (this.phase === "buttons" && !this.buttonMove) {
      // $025CD0: ↑ — к верхней кнопке, ↓ — к нижней
      if (b === "up" && this.buttonY !== BUTTON_TOP) this.startMove(-2);
      else if (b === "down" && this.buttonY !== BUTTON_BOTTOM) this.startMove(2);
    }
    return true;
  }

  private startMove(step: number): void {
    this.buttonStep = step;
    this.buttonMove = 12;
  }

  private onClick(e: MouseEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const y = ((e.clientY - r.top) / r.height) * SCREEN_H;
    const x = ((e.clientX - r.left) / r.width) * SCREEN_W;
    if (this.phase === "buttons" && x >= 192 && y >= BUTTON_TOP && y < BUTTON_BOTTOM + 16) {
      this.buttonY = y < BUTTON_BOTTOM ? BUTTON_TOP : BUTTON_BOTTOM;
      this.buttonMove = 0;
    }
    this.pressed = true;
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
    // для автотестов: этап экрана
    if (this.root.dataset.phase !== this.phase) this.root.dataset.phase = this.phase;
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  /** Один кадр (60 в секунду). */
  private tick(): void {
    this.timer++;
    // VBlank $024728: цвета 8–11 строки 2
    if (--this.cycleWait < 0) {
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
        this.typer(pressed);
        if (this.phase === "typer") this.face();
        break;
      case "buttons":
        this.buttons(pressed);
        break;
      case "key":
        if (pressed) this.finish(0);
        break;
    }
  }

  private fade(): void {
    if (this.fadeWait > 0) {
      this.fadeWait--;
      return;
    }
    const out = this.phase === "fadeout";
    let same = 0;
    for (let i = 0; i < 64; i++) {
      const t = out ? 0 : this.target[i];
      if (this.shadow[i] === t) same++;
      else this.shadow[i] = stepColor(this.shadow[i], t);
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
    }
  }

  /** Порт $01F9DA. */
  private typer(pressed: boolean): void {
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

  private endText(): void {
    if (this.scene.buttons === "key") {
      this.phase = "key";
      return;
    }
    // $025BB8: глаза и рот прячутся, их тайлы заняты кнопками; рамка — на верхней кнопке
    this.gfx.setButtons(this.vram, this.scene.buttons === "accept");
    this.faceHidden = true;
    this.buttonY = BUTTON_TOP;
    this.buttonMove = 0;
    this.phase = "buttons";
  }

  private buttons(pressed: boolean): void {
    if (this.buttonMove) {
      this.buttonY += this.buttonStep;
      if (--this.buttonMove === 0) this.sound(0x19);
      return;
    }
    if (!pressed) return;
    this.sound(0x28);
    // после выбора тайлы $B120…$B89F очищаются, глаза и рот возвращаются пустыми
    this.vram.fill(0, 0xb120, 0xb120 + 0x780);
    this.faceHidden = false;
    this.finish(this.buttonY === BUTTON_TOP ? 0 : 1);
  }

  private finish(choice: number): void {
    this.choice = choice;
    // совет — на том же экране, без затемнения
    if (this.scene.buttons === "accept" && choice === 1) {
      this.close();
      this.done?.(choice);
      return;
    }
    // $000628: тень палитры читается из CRAM
    this.shadow.set(this.cram);
    this.phase = "fadeout";
    this.fadeWait = 0;
  }

  /** Порт $01F626: глаза и рот. */
  private face(): void {
    const t = this.timer;
    if (this.talk === 1) {
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
      let d: number;
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
      if ((d === 2 && this.eyes === 1) || (d === 1 && this.eyes === 2)) {
        // взгляд из стороны в сторону — через прямой
        this.eyesNext = d;
        this.eyes = 0;
        this.eyesAt = t + rnd(1, 5);
      } else if (d !== this.eyes && (d === 4 || this.eyes === 4)) {
        // закрыть или открыть — через полузакрытые
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

  private draw(): void {
    const px = this.px;
    px.fill(0xff000000);
    const pal = toRGBA(this.cram);
    this.gfx.drawMap(px, this.house, this.scene.level, pal);
    if (this.page.length) this.gfx.drawText(px, this.vram, this.page, pal);
    const eyes = this.gfx.faceOffset("eyes", this.house);
    const mouth = this.gfx.faceOffset("mouth", this.house);
    // спрайт с меньшим номером — сверху: рисуем с конца
    for (let i = 39; i >= 0; i--) {
      const s = this.sprites[i];
      if (i <= 8) {
        if (this.phase !== "buttons") continue;
        const y = i <= 2 ? this.buttonY : s.y + 128;
        this.gfx.drawSprite(px, this.vram, { ...s, x: s.x + 320, y }, pal);
      } else if (EYES.includes(i)) {
        if (!this.faceHidden) this.gfx.drawSprite(px, this.vram, s, pal, eyes.dx, eyes.dy);
      } else if (MOUTH.includes(i)) {
        if (!this.faceHidden) this.gfx.drawSprite(px, this.vram, s, pal, mouth.dx, mouth.dy);
      } else this.gfx.drawSprite(px, this.vram, s, pal);
    }
    new Uint32Array(this.img.data.buffer).set(px);
    this.ctx.putImageData(this.img, 0, 0);
  }
}
