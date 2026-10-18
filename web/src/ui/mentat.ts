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
import { drawZoom, MentatGfx, toRGBA, zoomTiles, type MdSprite } from "../gfx/mentat.ts";
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
  /** после ПРИНЯТЬ — уход с экрана: портрет уезжает, области откалываются, целевая приближается ($025DB2, $02610C) */
  leave?: boolean;
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

type Phase = "fadein" | "typer" | "buttons" | "key" | "fadeout" | "leave" | "idle";

/** Падающая область ($FFA500, $24 байта): смещение по y и скорость в 16.16. */
interface FallingRegion {
  region: number;
  line: number;
  /** y первого куска владения — по нему область уходит за низ экрана */
  top: number;
  y: number;
  vel: number;
  visible: boolean;
  falling: boolean;
}

/**
 * Кадров от снятия области до следующей попытки ($024952 перерисовывает карту без неё): замерено в эмуляторе,
 * по числу оставшихся на карте областей.
 */
const RECOMPOSE = [0, 9, 13, 15, 15, 17, 18, 21, 24, 27];
/** Кадры смены картинок приближения после её появления на плоскости (замерено в эмуляторе). */
const ZOOM_FRAMES = [8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 64, 71, 79, 88, 98];

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

  // уход после ПРИНЯТЬ
  private leaveGen: Generator<void, void, void> | null = null;
  private planeDx = 0;
  private portraitDx = 0;
  private portraitGone = false;
  private mapMask = 0x3ff;
  private slots: (FallingRegion | null)[] = [null, null, null, null];
  private physics = false;
  private cycling = true;
  private zoomImg: Uint8Array | null = null;
  private zoomHs = 0;
  private zoomVs = 0;

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
    this.leaveGen = null;
    this.planeDx = 0;
    this.portraitDx = 0;
    this.portraitGone = false;
    this.mapMask = 0x3ff;
    this.slots = [null, null, null, null];
    this.physics = false;
    this.cycling = true;
    this.zoomImg = null;
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

  /** Для автотестов: остановить свой цикл и прогнать n кадров. */
  stepFrames(n: number): void {
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < n && !this.root.hidden; i++) this.tick();
    if (!this.root.hidden) this.draw();
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
        this.typer(pressed);
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
  private fall(): void {
    this.slots.forEach((s, i) => {
      if (!s || !s.falling) return;
      s.vel += 0x4000;
      s.y += s.vel;
      if (s.top + Math.floor(s.y / 0x10000) >= 0xe0) this.slots[i] = null;
    });
  }

  /** Свободное место для области ($0244CC): область 7 — только третье, остальные — первое свободное. */
  private freeSlot(region: number): number {
    if (region === 7) return this.slots[2] ? -1 : 2;
    return this.slots.findIndex((s) => !s);
  }

  private lift(slot: number, region: number): FallingRegion {
    const s: FallingRegion = {
      region,
      line: this.gfx.pieceLine(this.gfx.regionColor(this.house, this.scene.level, region)),
      top: this.gfx.regionPieces(true, region)[0].y,
      y: 0,
      vel: 0,
      visible: false,
      falling: false,
    };
    this.slots[slot] = s;
    return s;
  }

  /** Уход с экрана после ПРИНЯТЬ: $01F4B6 (пауза), $025DB2 (портрет уезжает), $02610C (карта рассыпается, приближение). */
  private *leave(): Generator<void, void, void> {
    const wait = function* (n: number): Generator<void, void, void> {
      for (let i = 0; i < n; i++) yield;
    };
    // звук $26, 60 кадров, музыка $1D, 100 кадров
    yield* wait(160);
    // $025DB2: текст стёрт, 24 кадра портрет едет влево по 4 точки, карта — по 1; строка 3 гаснет в последние 9
    this.page = [];
    const line3 = this.cram.slice(48, 64);
    for (let d7 = 23; d7 >= 0; d7--) {
      yield;
      this.cram.set(line3, 48);
      this.planeDx--;
      this.portraitDx -= 4;
      if (d7 < 9) for (let i = 0; i < 16; i++) line3[i] = stepColor(line3[i], 0);
    }
    // $02610C: спрайты строятся заново из мест областей ($0245F2) — портрета больше нет;
    // палитра $0A2D7E проявляется из тени ($0006C8)
    this.physics = true;
    this.portraitGone = true;
    const full = this.gfx.fullPalette();
    for (;;) {
      let same = 0;
      for (let i = 0; i < 64; i++) {
        if (this.shadow[i] === full[i]) same++;
        else this.shadow[i] = stepColor(this.shadow[i], full[i]);
      }
      this.cram.set(this.shadow);
      // шаг раз в $E010 кадров — здесь 1 (вызывающий код возвращает своё значение)
      yield;
      if (same === 64) break;
    }
    // $0249F4: 101 кадр, затем области 9…0 (кроме целевой) по одной становятся спрайтами и падают
    yield* wait(101);
    const level = this.scene.level;
    const target = this.gfx.targetRegion(this.house, level);
    for (let r = 9; r >= 0; r--) {
      let slot = -1;
      for (;;) {
        if (r === 7) yield* wait(21);
        if (r === target) break;
        slot = this.freeSlot(r);
        if (slot >= 0) break;
        yield;
      }
      if (r === target) continue;
      const s = this.lift(slot, r);
      yield;
      s.visible = true;
      const mask = this.mapMask & ~(1 << (9 - r));
      let left = 0;
      for (let i = 0; i < 10; i++) if (mask & (1 << i)) left++;
      yield* wait(RECOMPOSE[left] - 2);
      this.mapMask = mask;
      yield;
      s.falling = true;
    }
    // целевая область — тоже спрайтом, но не падает; карта стирается
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
    // прокрутка плоскости A — под первый кусок владения; цвета 1–6 строки 0 — цвета области
    const own = this.gfx.regionPieces(true, target)[0];
    this.zoomHs = own.x - 0x30;
    this.zoomVs = 0x48 - own.y;
    const colors = this.gfx.targetColors(this.gfx.regionColor(this.house, level, target));
    if (colors) this.cram.set(colors, 1);
    const bmp = this.gfx.zoomBitmap(target);
    const W = 33 * 8 * 14 * 8;
    const bufA = new Uint8Array(W);
    const bufB = new Uint8Array(W);
    zoomTiles(bmp, bufA, 0x10000, 14, 10);
    yield* wait(19);
    // картинка на плоскости, спрайты убраны; VBlank $024816: палитра гаснет раз в 5 кадров после первых 40
    this.zoomImg = bufA;
    this.slots = [null, null, null, null];
    this.physics = false;
    this.cycling = false;
    this.shadow.set(this.cram);
    let fadeIn = 40;
    let frame = 0;
    const steps = Array.from({ length: 17 }, (_, k) => this.gfx.zoomStep(target, k));
    // кадр k показывает шаг k (чётные — буфер B), прокрутка уже сдвинута на шаг k + 1
    for (let k = 0; k < ZOOM_FRAMES.length; k++) {
      while (frame < ZOOM_FRAMES[k]) {
        if (frame === ZOOM_FRAMES[k] - 1) {
          this.zoomHs -= steps[k + 1].dx;
          this.zoomVs -= steps[k + 1].dy;
        }
        if (--fadeIn === 0) {
          fadeIn = 5;
          for (let i = 0; i < 64; i++) this.shadow[i] = stepColor(this.shadow[i], 0);
          this.cram.set(this.shadow);
        }
        frame++;
        yield;
      }
      this.zoomImg = this.zoomRender(bmp, steps[k], k % 2 ? bufA : bufB);
    }
  }

  /** Картинка шага (буферы не очищаются между шагами, как в оригинале). */
  private zoomRender(bmp: Uint8Array, step: { step: number; w: number; h: number }, buf: Uint8Array): Uint8Array {
    zoomTiles(bmp, buf, step.step, step.w, step.h);
    return buf;
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
    if (this.scene.leave && choice === 0) {
      this.phase = "leave";
      this.leaveGen = this.leave();
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
    // падающие области — спрайты без приоритета: под картой (её тайлы с приоритетом), третье место поверх первого
    for (const s of this.slots) if (s?.visible) this.gfx.drawRegion(px, s.region, s.line, Math.floor(s.y / 0x10000), pal);
    if (this.zoomImg) drawZoom(px, this.zoomImg, pal, this.zoomHs, this.zoomVs);
    if (this.mapMask) this.gfx.drawMap(px, this.house, this.scene.level, pal, this.mapMask, this.planeDx);
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
      } else if (this.portraitGone) continue;
      else if (EYES.includes(i)) {
        if (!this.faceHidden) this.gfx.drawSprite(px, this.vram, s, pal, eyes.dx + this.portraitDx, eyes.dy);
      } else if (MOUTH.includes(i)) {
        if (!this.faceHidden) this.gfx.drawSprite(px, this.vram, s, pal, mouth.dx + this.portraitDx, mouth.dy);
      } else this.gfx.drawSprite(px, this.vram, s, pal, this.portraitDx);
    }
    new Uint32Array(this.img.data.buffer).set(px);
    this.ctx.putImageData(this.img, 0, 0);
  }
}
