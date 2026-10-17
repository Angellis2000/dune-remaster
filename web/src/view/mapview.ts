/**
 * Вид на карту с курсором как в оригинале.
 *
 * Режим «Геймпад» (по умолчанию): стрелки двигают курсор плавно, с разгоном от 1 до 3
 * пикселей за кадр (замерено в оригинале); у края экрана курсор упирается и прокручивается
 * карта. Режим «Мышь»: курсор идёт за мышью, левая кнопка — A, правая — C, у края окна —
 * прокрутка. В обоих режимах: колесо — масштаб, перетаскивание средней кнопкой — сдвиг карты.
 * Мировые координаты — пиксели оригинала (клетка = 32).
 */
import type { GameMap } from "../game/map.ts";
import type { CursorKind } from "../gfx/cursors.ts";
import type { IconSet } from "../gfx/icons.ts";
import type { Pad } from "../input/pad.ts";
import { CELL_PX, MAP_SIZE } from "../rom/dune.ts";

const ZOOMS = [1, 2, 3, 4, 5, 6];
const EDGE_PX = 10; // полоса у края окна для прокрутки мышью (CSS-пиксели)
const MOUSE_SCROLL = 1100; // скорость прокрутки мышью, экранных пикселей в секунду
const FRAME = 1 / 60;
const CURSOR_MIN = 1; // пикселей за кадр в начале движения
const CURSOR_MAX = 3; // пикселей за кадр после разгона
const CURSOR_ACCEL = 0.08; // прибавка скорости за кадр удержания
const CURSOR_MARGIN = 64; // от курсора до края экрана, после которого едет карта

export interface CellInfo {
  x: number;
  y: number;
  icon: number;
}

export class MapView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: GameMap | null = null;
  camX = 0;
  camY = 0;
  zoom = 2;
  showGrid = false;
  mouseMode = false;
  /** центр курсора в мировых пикселях */
  cursorX = 0;
  cursorY = 0;
  cursorKind: CursorKind = "select";
  /** клетка, отмеченная кнопкой A (пока нет юнитов — просто отметка) */
  marked: CellInfo | null = null;
  onChange: () => void = () => {};

  private mouse = { x: 0, y: 0, inside: false };
  private drag: { id: number; x: number; y: number; cx: number; cy: number } | null = null;
  private holdTime = 0;
  private dirty = true;
  private last = 0;
  private acc = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private icons: IconSet,
    private cursors: Record<CursorKind, HTMLCanvasElement>,
    private pad: Pad,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.bindMouse();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    requestAnimationFrame((t) => this.tick(t));
  }

  setMap(map: GameMap): void {
    this.resize();
    this.map = map;
    const b = map.bounds;
    this.zoom = this.defaultZoom();
    this.cursorX = (b.x + b.w / 2) * CELL_PX;
    this.cursorY = (b.y + b.h / 2) * CELL_PX;
    this.marked = null;
    this.centerOn(this.cursorX, this.cursorY);
  }

  /** Масштаб, при котором по вертикали видно около 14 клеток. */
  private defaultZoom(): number {
    const z = Math.round(this.canvas.height / (14 * CELL_PX));
    return Math.min(Math.max(z, ZOOMS[0]), ZOOMS[ZOOMS.length - 1]);
  }

  viewSize(): { w: number; h: number } {
    return { w: this.canvas.width / this.zoom, h: this.canvas.height / this.zoom };
  }

  centerOn(wx: number, wy: number): void {
    const v = this.viewSize();
    this.camX = wx - v.w / 2;
    this.camY = wy - v.h / 2;
    this.clampCamera();
  }

  setZoom(z: number, anchorX = this.canvas.width / 2, anchorY = this.canvas.height / 2): void {
    z = Math.min(Math.max(z, ZOOMS[0]), ZOOMS[ZOOMS.length - 1]);
    if (z === this.zoom) return;
    const wx = this.camX + anchorX / this.zoom;
    const wy = this.camY + anchorY / this.zoom;
    this.zoom = z;
    this.camX = wx - anchorX / z;
    this.camY = wy - anchorY / z;
    this.clampCamera();
  }

  setMouseMode(on: boolean): void {
    this.mouseMode = on;
    this.dirty = true;
    this.onChange();
  }

  /** Клетка под курсором. */
  cursorCell(): CellInfo | null {
    if (!this.map) return null;
    const x = Math.floor(this.cursorX / CELL_PX);
    const y = Math.floor(this.cursorY / CELL_PX);
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return null;
    return { x, y, icon: this.map.ground[(y << 6) | x] };
  }

  mark(cell: CellInfo | null): void {
    this.marked = cell;
    this.dirty = true;
    this.onChange();
  }

  invalidate(): void {
    this.dirty = true;
  }

  private clampCamera(): void {
    if (!this.map) return;
    const b = this.map.bounds;
    const v = this.viewSize();
    const minX = b.x * CELL_PX;
    const minY = b.y * CELL_PX;
    const maxX = (b.x + b.w) * CELL_PX - v.w;
    const maxY = (b.y + b.h) * CELL_PX - v.h;
    // поле меньше окна — по центру
    this.camX = maxX < minX ? (minX + maxX) / 2 : Math.min(Math.max(this.camX, minX), maxX);
    this.camY = maxY < minY ? (minY + maxY) / 2 : Math.min(Math.max(this.camY, minY), maxY);
    this.dirty = true;
    this.onChange();
  }

  private clampCursor(): void {
    if (!this.map) return;
    const b = this.map.bounds;
    this.cursorX = Math.min(Math.max(this.cursorX, b.x * CELL_PX), (b.x + b.w) * CELL_PX - 1);
    this.cursorY = Math.min(Math.max(this.cursorY, b.y * CELL_PX), (b.y + b.h) * CELL_PX - 1);
  }

  /** Камера догоняет курсор, если он подошёл к краю ближе CURSOR_MARGIN. */
  private followCursor(): void {
    const v = this.viewSize();
    const m = Math.min(CURSOR_MARGIN, v.w / 3, v.h / 3);
    if (this.cursorX < this.camX + m) this.camX = this.cursorX - m;
    if (this.cursorX > this.camX + v.w - m) this.camX = this.cursorX - v.w + m;
    if (this.cursorY < this.camY + m) this.camY = this.cursorY - m;
    if (this.cursorY > this.camY + v.h - m) this.camY = this.cursorY - v.h + m;
    this.clampCamera();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (w === this.canvas.width && h === this.canvas.height) return;
    const v = this.viewSize();
    const cx = this.camX + v.w / 2;
    const cy = this.camY + v.h / 2;
    this.canvas.width = w;
    this.canvas.height = h;
    this.centerOn(cx, cy);
  }

  // ------------------------------------------------------------------ мышь
  private bindMouse(): void {
    const c = this.canvas;
    const toCanvas = (e: PointerEvent | WheelEvent) => {
      const r = c.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
    };
    c.addEventListener("pointermove", (e) => {
      const p = toCanvas(e);
      this.mouse = { x: p.x, y: p.y, inside: true };
      if (this.drag && this.drag.id === e.pointerId) {
        this.camX = this.drag.cx - (p.x - this.drag.x) / this.zoom;
        this.camY = this.drag.cy - (p.y - this.drag.y) / this.zoom;
        this.clampCamera();
      }
      if (this.mouseMode) this.cursorToMouse();
    });
    c.addEventListener("pointerleave", () => (this.mouse.inside = false));
    c.addEventListener("pointerdown", (e) => {
      c.focus();
      const p = toCanvas(e);
      // средняя кнопка (или касание пальцем) — сдвиг карты
      if (e.button === 1 || e.pointerType === "touch") {
        e.preventDefault();
        this.drag = { id: e.pointerId, x: p.x, y: p.y, cx: this.camX, cy: this.camY };
        c.setPointerCapture(e.pointerId);
        return;
      }
      if (!this.mouseMode) return;
      this.mouse = { x: p.x, y: p.y, inside: true };
      this.cursorToMouse();
      if (e.button === 0) this.pad.press("a");
      if (e.button === 2) this.pad.press("c");
    });
    const endDrag = (e: PointerEvent) => {
      if (this.drag?.id === e.pointerId) this.drag = null;
    };
    c.addEventListener("pointerup", endDrag);
    c.addEventListener("pointercancel", endDrag);
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    c.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const p = toCanvas(e);
        this.setZoom(this.zoom + (e.deltaY < 0 ? 1 : -1), p.x, p.y);
        if (this.mouseMode) this.cursorToMouse();
      },
      { passive: false },
    );
  }

  private cursorToMouse(): void {
    this.cursorX = this.camX + this.mouse.x / this.zoom;
    this.cursorY = this.camY + this.mouse.y / this.zoom;
    this.clampCursor();
    this.dirty = true;
    this.onChange();
  }

  // ------------------------------------------------------------------ цикл
  private tick(t: number): void {
    const dt = this.last ? Math.min((t - this.last) / 1000, 0.1) : 0;
    this.last = t;
    // логика курсора идёт кадрами по 1/60 с, как на приставке
    this.acc += dt;
    while (this.acc >= FRAME) {
      this.acc -= FRAME;
      this.step();
    }
    if (this.mouseMode && this.mouse.inside && !this.drag && document.hasFocus()) this.edgeScroll(dt);
    if (this.dirty) this.draw();
    requestAnimationFrame((tt) => this.tick(tt));
  }

  /** Один кадр управления с крестовины. */
  private step(): void {
    const p = this.pad;
    const dx = (p.isHeld("right") ? 1 : 0) - (p.isHeld("left") ? 1 : 0);
    const dy = (p.isHeld("down") ? 1 : 0) - (p.isHeld("up") ? 1 : 0);
    if (!dx && !dy) {
      this.holdTime = 0;
      return;
    }
    const speed = Math.min(CURSOR_MAX, CURSOR_MIN + this.holdTime * CURSOR_ACCEL);
    this.holdTime++;
    this.cursorX += dx * speed;
    this.cursorY += dy * speed;
    this.clampCursor();
    this.followCursor();
    this.dirty = true;
    this.onChange();
  }

  private edgeScroll(dt: number): void {
    const edge = EDGE_PX * (window.devicePixelRatio || 1);
    const dx = (this.mouse.x > this.canvas.width - edge ? 1 : 0) - (this.mouse.x < edge ? 1 : 0);
    const dy = (this.mouse.y > this.canvas.height - edge ? 1 : 0) - (this.mouse.y < edge ? 1 : 0);
    if (!dx && !dy) return;
    const s = (MOUSE_SCROLL * (window.devicePixelRatio || 1) * dt) / this.zoom;
    this.camX += dx * s;
    this.camY += dy * s;
    this.clampCamera();
    this.cursorToMouse();
  }

  // ------------------------------------------------------------------ отрисовка
  draw(): void {
    this.dirty = false;
    const ctx = this.ctx;
    const z = this.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.map) return;
    ctx.imageSmoothingEnabled = false;
    // камера на целых экранных пикселях — без швов между клетками
    const ox = Math.round(this.camX * z);
    const oy = Math.round(this.camY * z);
    const v = this.viewSize();
    const x0 = Math.max(0, Math.floor(this.camX / CELL_PX));
    const y0 = Math.max(0, Math.floor(this.camY / CELL_PX));
    const x1 = Math.min(MAP_SIZE - 1, Math.floor((this.camX + v.w) / CELL_PX));
    const y1 = Math.min(MAP_SIZE - 1, Math.floor((this.camY + v.h) / CELL_PX));
    const size = CELL_PX * z;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!this.map.inBounds(x, y)) continue;
        const s = this.icons.source(this.map.ground[(y << 6) | x]);
        ctx.drawImage(s.image, s.sx, s.sy, s.sw, s.sh, x * size - ox, y * size - oy, size, size);
      }
    }
    if (this.showGrid) this.drawGrid(x0, y0, x1, y1, size, ox, oy);
    if (this.marked) {
      ctx.strokeStyle = "#f0c96a";
      ctx.lineWidth = Math.max(1, z);
      ctx.strokeRect(this.marked.x * size - ox + z / 2, this.marked.y * size - oy + z / 2, size - z, size - z);
    }
    const cur = this.cursors[this.cursorKind];
    ctx.drawImage(cur, Math.round((this.cursorX - 16) * z) - ox, Math.round((this.cursorY - 16) * z) - oy, 32 * z, 32 * z);
  }

  private drawGrid(x0: number, y0: number, x1: number, y1: number, size: number, ox: number, oy: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) {
      ctx.moveTo(x * size - ox + 0.5, y0 * size - oy);
      ctx.lineTo(x * size - ox + 0.5, (y1 + 1) * size - oy);
    }
    for (let y = y0; y <= y1 + 1; y++) {
      ctx.moveTo(x0 * size - ox, y * size - oy + 0.5);
      ctx.lineTo((x1 + 1) * size - ox, y * size - oy + 0.5);
    }
    ctx.stroke();
    if (size < 48) return;
    ctx.font = `${Math.round(size / 4)}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = "top";
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!this.map!.inBounds(x, y)) continue;
        const label = String(this.map!.ground[(y << 6) | x]);
        const px = x * size - ox + 3;
        const py = y * size - oy + 3;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(px - 2, py - 1, ctx.measureText(label).width + 4, size / 4 + 2);
        ctx.fillStyle = "#f3d27a";
        ctx.fillText(label, px, py);
      }
    }
  }
}
