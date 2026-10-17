/**
 * Окно здания в режиме геймпада — как в оригинале MD: A по выбранному своему зданию открывает
 * полноэкранное окно (рамка, кнопки, иконки, картинка, имя, цена, энергия и прочность — всё из ROM,
 * gfx/screens.ts). Курсор стоит на «ВЫХОД»; вниз — сетка заказов по 3 в ряд. A по заказу запускает
 * стройку и возвращает на карту, по готовому зданию — постановка. Пока окно открыто, игра стоит.
 * В режиме мыши вместо него остаётся правое меню (ui/command.ts).
 */
import { STRUCTURE, type Structure } from "../engine/core.ts";
import type { Game } from "../engine/game.ts";
import { layoutSize, structureInfo, unitInfo } from "../engine/tables.ts";
import { SCREEN_H, SCREEN_W, type ScreenGfx } from "../gfx/screens.ts";
import type { Button } from "../input/pad.ts";
import type { DuneRom, Picture } from "../rom/dune.ts";

/** Кнопки окна слева направо и их иконки (номера в таблице иконок окна). */
const TABS = [
  { id: "exit", on: -1, off: -1 },
  { id: "repair", on: -2, off: -4 },
  { id: "stop", on: -3, off: -5 },
] as const;
const TAB_Y = 48;
const GRID_X = 32;
const GRID_Y = 72;
const CELL_W = 32;
const CELL_H = 24;
const COLUMNS = 3;
const ROWS_VISIBLE = 6;
/** правая часть окна: картинка, значок размера, имя и три числа (клетки плоскости Window) */
const PICTURE = { x: 160, y: 40 };
const SIZE_ICON = { x: 240, y: 80 };
const NAME = { x: 160, y: 104, chars: 12 };
const NUMBERS_RIGHT = 256;
const NUMBER_ROWS = [128, 160, 192];
const STAT_ICON_X = 160;
const STAT_ICON_Y = [120, 152, 184];
const CREDITS = { right: 296, y: 16 };

export interface FactoryHost {
  game(): Game;
  credits(): number;
  /** окно открылось или закрылось — игра на паузе, пока оно открыто */
  toggled(open: boolean): void;
  /** заказ готов и взят на постановку */
  placing(): void;
}

interface Order {
  type: number;
  available: number;
  cost: number;
}

export class FactoryWindow {
  readonly root: HTMLElement;
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private s: Structure | null = null;
  private orders: Order[] = [];
  /** −3…−1 — кнопки (ВЫХОД, РЕМОНТ, СТОП), 0… — заказы */
  private cursor = -3;
  private pictures = new Map<string, HTMLCanvasElement | null>();
  private frame = 0;
  private raf = 0;

  constructor(
    private rom: DuneRom,
    private gfx: ScreenGfx,
    private host: FactoryHost,
  ) {
    this.root = document.createElement("section");
    this.root.className = "settings factory";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Окно здания");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", (e) => this.onClick(e));
    window.addEventListener("keydown", (e) => {
      if (!this.root.hidden && e.code === "Escape") this.close();
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  private get units(): boolean {
    return !!this.s && this.s.o.type !== STRUCTURE.CONSTRUCTION_YARD;
  }

  open(s: Structure): void {
    this.s = s;
    this.cursor = -3;
    this.refresh();
    this.root.hidden = false;
    this.host.toggled(true);
    this.loop();
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
    this.host.toggled(false);
  }

  private refresh(): void {
    const s = this.s;
    const orders = s && structureInfo[s.o.type].o.flags.factory && s.o.type !== STRUCTURE.STARPORT ? this.host.game().buildOptions(s) : [];
    // в окне оригинала порядок обратный правому меню: по возрастанию приоритета (плиты, затем ветряк)
    this.orders = orders.reverse();
  }

  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    const n = this.orders.length;
    const col = this.cursor < 0 ? this.cursor + 3 : this.cursor % COLUMNS;
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
    return true;
  }

  private activate(): void {
    const s = this.s;
    if (!s) return;
    const game = this.host.game();
    if (this.cursor === -3) return this.close();
    if (this.cursor === -2) {
      if (s.o.hitpoints < structureInfo[s.o.type].o.hitpoints) game.toggleRepair(s);
      return;
    }
    if (this.cursor === -1) {
      if (game.production(s)) game.holdOrResume(s);
      return;
    }
    const order = this.orders[this.cursor];
    if (!order || order.available < 0) return;
    const prod = game.production(s);
    if (prod && prod.type === order.type) {
      // готовое здание — сразу постановка; заказ в работе — просто назад на карту
      if (prod.ready && !this.units && game.placeIt(s)) {
        this.close();
        this.host.placing();
        return;
      }
      if (prod.onHold) game.holdOrResume(s);
    } else game.build(s, order.type);
    this.close();
  }

  private onClick(e: MouseEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SCREEN_W;
    const y = ((e.clientY - r.top) / r.height) * SCREEN_H;
    const col = Math.floor((x - GRID_X) / CELL_W);
    if (col < 0 || col >= COLUMNS) return;
    if (y >= TAB_Y && y < TAB_Y + CELL_H) this.cursor = col - 3;
    else {
      const i = Math.floor((y - GRID_Y) / CELL_H) * COLUMNS + col;
      if (y < GRID_Y || i >= this.orders.length) return;
      this.cursor = i;
    }
    this.activate();
  }

  private loop(): void {
    this.frame++;
    if (this.frame % 30 === 0) this.refresh();
    this.draw();
    if (!this.root.hidden) this.raf = requestAnimationFrame(() => this.loop());
  }

  private draw(): void {
    const s = this.s;
    if (!s) return;
    const g = this.ctx;
    const gfx = this.gfx;
    const game = this.host.game();
    const units = this.units;
    g.fillStyle = "#000";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.drawImage(gfx.factoryBackground(), 0, 0);

    // кнопки: светлая — можно нажать, тёмная — нечего
    const prod = game.production(s);
    const damaged = s.o.hitpoints < structureInfo[s.o.type].o.hitpoints;
    const enabled = [true, damaged, !!prod];
    TABS.forEach((t, i) => {
      const icon = gfx.factoryIcon(units, enabled[i] ? t.on : t.off);
      if (icon) g.drawImage(icon, GRID_X + i * CELL_W, TAB_Y);
    });

    // сетка заказов
    const firstRow = Math.max(0, Math.floor(Math.max(0, this.cursor) / COLUMNS) - ROWS_VISIBLE + 1);
    this.orders.forEach((o, i) => {
      const row = Math.floor(i / COLUMNS) - firstRow;
      if (row < 0 || row >= ROWS_VISIBLE) return;
      const icon = gfx.factoryIcon(units, o.type);
      const x = GRID_X + (i % COLUMNS) * CELL_W;
      const y = GRID_Y + row * CELL_H;
      if (icon) g.drawImage(icon, x, y);
      if (o.available < 0) {
        g.fillStyle = "rgba(0,0,0,0.55)";
        g.fillRect(x, y, CELL_W, CELL_H);
      }
      if (prod && prod.type === o.type) {
        // ход стройки — полоса по низу иконки
        g.fillStyle = prod.ready ? "#40e040" : prod.onHold ? "#e0a000" : "#e0e040";
        g.fillRect(x + 1, y + CELL_H - 3, Math.round((CELL_W - 2) * prod.progress), 2);
      }
    });

    // курсор: мигающая рамка, как в оригинале
    if ((this.frame >> 3) % 4 !== 3) {
      const cx = this.cursor < 0 ? GRID_X + (this.cursor + 3) * CELL_W : GRID_X + (this.cursor % COLUMNS) * CELL_W;
      const cy = this.cursor < 0 ? TAB_Y : GRID_Y + (Math.floor(this.cursor / COLUMNS) - firstRow) * CELL_H;
      g.drawImage(gfx.factoryCursor(), cx, cy);
    }

    // правая часть: под курсором заказ — его картинка и числа, на кнопках — само здание без чисел
    const order = this.cursor >= 0 ? this.orders[this.cursor] : null;
    const pic = order ? this.picture(units, order.type) : this.picture(false, s.o.type);
    if (pic) g.drawImage(pic, PICTURE.x, PICTURE.y);
    if (order) {
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
      const power = units ? 0 : Math.abs(structureInfo[order.type].powerUsage);
      [order.cost, power, oi.hitpoints].forEach((v, i) => {
        const t = gfx.plainText(String(v));
        g.drawImage(t, NUMBERS_RIGHT - t.width, NUMBER_ROWS[i]);
      });
    }
    STAT_ICON_Y.forEach((y, i) => g.drawImage(gfx.statIcon(i), STAT_ICON_X, y));

    // кредиты вверху справа
    const credits = gfx.plainText(String(this.host.credits()));
    g.drawImage(credits, CREDITS.right - credits.width, CREDITS.y);
  }

  private picture(units: boolean, type: number): HTMLCanvasElement | null {
    const key = `${units}:${type}`;
    if (!this.pictures.has(key)) {
      const list: Picture[] = units ? this.rom.unitPictures() : this.rom.structurePictures();
      const p = list.find((x) => x.id === type);
      let c: HTMLCanvasElement | null = null;
      if (p) {
        c = document.createElement("canvas");
        c.width = p.width;
        c.height = p.height;
        c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.pixels), p.width, p.height), 0, 0);
      }
      this.pictures.set(key, c);
    }
    return this.pictures.get(key) ?? null;
  }
}
