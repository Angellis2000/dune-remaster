/**
 * Экраны до игры, как в оригинале MD: главное меню («DUNE», НОВАЯ ИГРА / ОПЦИИ / ОБУЧЕНИЕ) и выбор дома.
 * Графика — gfx/screens.ts (данные ROM), навигация — по эмулятору:
 * - меню: ↑/↓ по кругу, стрелка в x 120, y 160 + 8·пункт, A или Start — выбрать;
 * - выбор дома: ←/→ без перехода через край (Атрейдесы, Ордосы, Харконнены), A — выбрать.
 */
import type { ScreenGfx } from "../gfx/screens.ts";
import { SCREEN_H, SCREEN_W } from "../gfx/screens.ts";
import type { Button } from "../input/pad.ts";
import type { HouseCode } from "./settings.ts";
import { Intro } from "./intro.ts";

const MENU_ITEMS = 3;
const ARROW = { x: 120, y: 160, step: 8 };
/** дома слева направо */
const HOUSES: HouseCode[] = ["A", "O", "H"];
const HOUSE_FRAME = { x: 32, step: 88, y: 136 };

export interface FrontEndHost {
  newGame(house: HouseCode): void;
  /** экран сменился: для музыки (заставка — секвенция 0, выбор дома — мелодия $1C) */
  screen?(mode: "intro" | "title" | "house"): void;
  /** звук заставки ($02DD26) */
  introSound?(seq: number): void;
  options(): void;
  tutorial(): void;
}

export class FrontEnd {
  readonly root: HTMLElement;
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private mode: "intro" | "title" | "house" = "title";
  private intro: Intro;
  private item = 0;
  private house = 0;
  private frame = 0;
  private raf = 0;

  constructor(
    private gfx: ScreenGfx,
    private host: FrontEndHost,
  ) {
    this.root = document.createElement("section");
    this.root.className = "settings frontend";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Главное меню");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", (e) => this.onClick(e));
    this.intro = new Intro(gfx, (seq) => this.host.introSound?.(seq));
  }

  /** Заставка при включении; кончится или любая кнопка — главное меню. */
  openIntro(): void {
    this.mode = "intro";
    this.intro.start();
    this.show();
    this.host.screen?.("intro");
  }

  /** Для автотестов: прогнать n кадров заставки. */
  stepIntro(n: number): void {
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < n && this.mode === "intro"; i++) if (!this.intro.tick()) this.openTitle();
    this.draw();
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  openTitle(): void {
    this.mode = "title";
    this.item = 0;
    this.show();
    this.host.screen?.("title");
  }

  openHouse(): void {
    this.mode = "house";
    this.house = 0;
    this.show();
    this.host.screen?.("house");
  }

  private show(): void {
    this.root.hidden = false;
    this.root.setAttribute("aria-label", this.mode === "title" ? "Главное меню" : "Выбор дома");
    cancelAnimationFrame(this.raf);
    this.loop();
  }

  close(): void {
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  /** Кнопка геймпада, пока экран открыт. true — обработана. */
  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    if (this.mode === "intro") {
      this.openTitle();
      return true;
    }
    if (this.mode === "title") {
      if (b === "up") this.item = (this.item + MENU_ITEMS - 1) % MENU_ITEMS;
      else if (b === "down") this.item = (this.item + 1) % MENU_ITEMS;
      else if (b === "a" || b === "c" || b === "start") this.chooseItem();
    } else {
      if (b === "left") this.house = Math.max(0, this.house - 1);
      else if (b === "right") this.house = Math.min(HOUSES.length - 1, this.house + 1);
      else if (b === "a" || b === "c" || b === "start") {
        this.close();
        this.host.newGame(HOUSES[this.house]);
      } else if (b === "b") this.openTitle();
    }
    return true;
  }

  private chooseItem(): void {
    if (this.item === 0) this.openHouse();
    else if (this.item === 1) this.host.options();
    else this.host.tutorial();
  }

  private onClick(e: MouseEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SCREEN_W;
    const y = ((e.clientY - r.top) / r.height) * SCREEN_H;
    if (this.mode === "intro") this.openTitle();
    else if (this.mode === "title") {
      const i = Math.floor((y - ARROW.y) / ARROW.step);
      if (i >= 0 && i < MENU_ITEMS && x >= ARROW.x) {
        this.item = i;
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

  private loop(): void {
    this.frame++;
    if (this.mode === "intro" && !this.intro.tick()) this.openTitle();
    this.draw();
    if (!this.root.hidden) this.raf = requestAnimationFrame(() => this.loop());
  }

  private draw(): void {
    const g = this.ctx;
    if (this.mode === "intro") this.intro.draw(g);
    else if (this.mode === "title") {
      g.drawImage(this.gfx.titleScreen(), 0, 0);
      // стрелка: цвет меняется раз в 6 кадров
      g.drawImage(this.gfx.titleArrow(Math.floor(this.frame / 6)), ARROW.x, ARROW.y + this.item * ARROW.step);
    } else {
      g.drawImage(this.gfx.houseScreen(), 0, 0);
      // рамка: цвет 1…4 раз в 8 кадров ($004870)
      g.drawImage(this.gfx.houseFrame(((this.frame & 31) >> 3) + 1), HOUSE_FRAME.x + this.house * HOUSE_FRAME.step, HOUSE_FRAME.y);
    }
  }
}
