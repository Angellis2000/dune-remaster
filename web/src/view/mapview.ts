/**
 * Вид на карту с курсором как в оригинале.
 *
 * Геймпад (по умолчанию): стрелки двигают курсор плавно, с разгоном от 1 до 3 пикселей за кадр
 * (замерено в оригинале); у края экрана курсор упирается и едет карта. B + стрелки — быстрая
 * прокрутка карты (8 пикселей за кадр), курсор при этом стоит на месте экрана, как в оригинале.
 * Мышь (как в Red Alert): щелчок левой — выбрать или отдать приказ, протянуть левой — рамка
 * выделения, правая — снять выделение. Колесо — масштаб, средняя кнопка — сдвиг карты.
 * Мировые координаты — пиксели оригинала (клетка = 32).
 */
import type { CursorKind } from "../gfx/cursors.ts";
import type { IconSet } from "../gfx/icons.ts";
import type { Skins } from "../gfx/skins.ts";
import type { SpriteSet } from "../gfx/sprites.ts";
import type { Pad } from "../input/pad.ts";
import { CELL_PX, MAP_SIZE } from "../rom/dune.ts";
import type { Structure, Unit, World } from "../game/world.ts";

const ZOOMS = [1, 2, 3, 4, 5, 6];
const EDGE_PX = 10; // полоса у края окна для прокрутки мышью (CSS-пиксели)
const MOUSE_SCROLL = 1100; // скорость прокрутки мышью, экранных пикселей в секунду
const FRAME = 1 / 60;
const CURSOR_MIN = 1; // пикселей за кадр в начале движения
const CURSOR_MAX = 3; // пикселей за кадр после разгона
const CURSOR_ACCEL = 0.08; // прибавка скорости за кадр удержания
const CURSOR_MARGIN = 64; // от курсора до края экрана, после которого едет карта
const FAST_SCROLL = 8; // B + стрелки: пикселей за кадр
const DRAG_START = 6; // на сколько экранных пикселей сдвинуть мышь, чтобы началась рамка

export interface CellInfo {
  x: number;
  y: number;
  icon: number;
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export class MapView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: World | null = null;
  camX = 0;
  camY = 0;
  zoom = 2;
  showGrid = false;
  mouseMode = false;
  cursorX = 0;
  cursorY = 0;
  cursorKind: CursorKind = "select";
  selectedUnits = new Set<Unit>();
  selectedStructure: Structure | null = null;
  onChange: () => void = () => {};
  /** A: щелчок левой или кнопка 1 — мировые координаты точки */
  onPrimary: (wx: number, wy: number) => void = () => {};
  /** правая кнопка мыши */
  onSecondary: () => void = () => {};
  /** рамка выделения (мировые координаты) */
  onBox: (r: Rect) => void = () => {};
  /** каждый игровой кадр (1/60 с) */
  onFrame: () => void = () => {};

  private mouse = { x: 0, y: 0, inside: false };
  private pan: { id: number; x: number; y: number; cx: number; cy: number } | null = null;
  private box: { id: number; x: number; y: number; active: boolean } | null = null;
  private holdTime = 0;
  private dirty = true;
  private last = 0;
  private acc = 0;
  private corners: HTMLCanvasElement[];

  constructor(
    canvas: HTMLCanvasElement,
    private icons: IconSet,
    private sprites: SpriteSet,
    private cursors: Record<CursorKind, HTMLCanvasElement>,
    private pad: Pad,
    private skins: Skins,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.corners = splitCorners(cursors.select);
    this.bindMouse();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    requestAnimationFrame((t) => this.tick(t));
  }

  /** клетка тумана (g_veiledTileID) — рисуется чёрной */
  veiledIcon = 0;
  /** постановка здания: размер и годность места (1 — да, <0 — без бетона, 0 — нельзя) */
  placement: { w: number; h: number; valid: number } | null = null;

  private drawIcon(id: number, x: number, y: number, size: number): void {
    if (this.skins.iconOverridden[id]) {
      this.ctx.drawImage(this.skins.scaled(`icon:${id}`, size, size)!, x, y);
      return;
    }
    const s = this.icons.source(id);
    this.ctx.drawImage(s.image, s.sx, s.sy, s.sw, s.sh, x, y, size, size);
  }

  setWorld(world: World, focusX: number, focusY: number): void {
    this.resize();
    this.world = world;
    this.selectedUnits.clear();
    this.selectedStructure = null;
    this.zoom = this.defaultZoom();
    this.cursorX = focusX;
    this.cursorY = focusY;
    this.centerOn(focusX, focusY);
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

  cursorCell(): CellInfo | null {
    if (!this.world) return null;
    const x = Math.floor(this.cursorX / CELL_PX);
    const y = Math.floor(this.cursorY / CELL_PX);
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return null;
    return { x, y, icon: this.world.map.ground[(y << 6) | x] };
  }

  invalidate(): void {
    this.dirty = true;
  }

  private clampCamera(): void {
    if (!this.world) return;
    const b = this.world.map.bounds;
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
    if (!this.world) return;
    const b = this.world.map.bounds;
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
  private toCanvas(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const c = this.canvas;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }

  private toWorld(x: number, y: number): { x: number; y: number } {
    return { x: this.camX + x / this.zoom, y: this.camY + y / this.zoom };
  }

  private bindMouse(): void {
    const c = this.canvas;
    c.addEventListener("pointermove", (e) => {
      const p = this.toCanvas(e);
      this.mouse = { x: p.x, y: p.y, inside: true };
      if (this.pan && this.pan.id === e.pointerId) {
        this.camX = this.pan.cx - (p.x - this.pan.x) / this.zoom;
        this.camY = this.pan.cy - (p.y - this.pan.y) / this.zoom;
        this.clampCamera();
      }
      if (this.box && this.box.id === e.pointerId) {
        if (!this.box.active && Math.hypot(p.x - this.box.x, p.y - this.box.y) > DRAG_START * (window.devicePixelRatio || 1)) this.box.active = true;
        this.dirty = true;
      }
      if (this.mouseMode) this.cursorToMouse();
    });
    c.addEventListener("pointerleave", () => (this.mouse.inside = false));
    c.addEventListener("pointerdown", (e) => {
      c.focus();
      const p = this.toCanvas(e);
      // средняя кнопка или касание двумя пальцами — сдвиг карты; касание одним — как мышь
      if (e.button === 1) {
        e.preventDefault();
        this.pan = { id: e.pointerId, x: p.x, y: p.y, cx: this.camX, cy: this.camY };
        c.setPointerCapture(e.pointerId);
        return;
      }
      if (!this.mouseMode) return;
      this.mouse = { x: p.x, y: p.y, inside: true };
      this.cursorToMouse();
      if (e.button === 0) {
        this.box = { id: e.pointerId, x: p.x, y: p.y, active: false };
        c.setPointerCapture(e.pointerId);
      } else if (e.button === 2) {
        this.onSecondary();
      }
    });
    const up = (e: PointerEvent) => {
      if (this.pan?.id === e.pointerId) this.pan = null;
      if (this.box?.id === e.pointerId) {
        const b = this.box;
        this.box = null;
        this.dirty = true;
        if (e.type === "pointercancel") return;
        const p = this.toCanvas(e);
        if (b.active) {
          const a = this.toWorld(b.x, b.y);
          const z = this.toWorld(p.x, p.y);
          this.onBox({ x0: Math.min(a.x, z.x), y0: Math.min(a.y, z.y), x1: Math.max(a.x, z.x), y1: Math.max(a.y, z.y) });
        } else {
          this.onPrimary(this.cursorX, this.cursorY);
        }
      }
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    c.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const p = this.toCanvas(e);
        this.setZoom(this.zoom + (e.deltaY < 0 ? 1 : -1), p.x, p.y);
        if (this.mouseMode) this.cursorToMouse();
      },
      { passive: false },
    );
  }

  private cursorToMouse(): void {
    const w = this.toWorld(this.mouse.x, this.mouse.y);
    this.cursorX = w.x;
    this.cursorY = w.y;
    this.clampCursor();
    this.dirty = true;
    this.onChange();
  }

  // ------------------------------------------------------------------ цикл
  private tick(t: number): void {
    const dt = this.last ? Math.min((t - this.last) / 1000, 0.1) : 0;
    this.last = t;
    // логика идёт кадрами по 1/60 с, как на приставке
    this.acc += dt;
    while (this.acc >= FRAME) {
      this.acc -= FRAME;
      this.step();
      this.onFrame();
      this.dirty = true;
    }
    if (this.mouseMode && this.mouse.inside && !this.pan && document.hasFocus()) this.edgeScroll(dt);
    if (this.dirty) this.draw();
    requestAnimationFrame((tt) => this.tick(tt));
  }

  /** крестовина занята меню (C): курсор стоит */
  inputLocked = false;

  /** Один кадр управления с крестовины. */
  private step(): void {
    if (this.inputLocked) return;
    const p = this.pad;
    const dx = (p.isHeld("right") ? 1 : 0) - (p.isHeld("left") ? 1 : 0);
    const dy = (p.isHeld("down") ? 1 : 0) - (p.isHeld("up") ? 1 : 0);
    if (!dx && !dy) {
      this.holdTime = 0;
      return;
    }
    if (p.isHeld("b")) {
      // быстрая прокрутка: едет карта, курсор остаётся на том же месте экрана
      const cx = this.camX;
      const cy = this.camY;
      this.camX += dx * FAST_SCROLL;
      this.camY += dy * FAST_SCROLL;
      this.clampCamera();
      this.cursorX += this.camX - cx;
      this.cursorY += this.camY - cy;
      this.clampCursor();
      this.onChange();
      return;
    }
    const speed = Math.min(CURSOR_MAX, CURSOR_MIN + this.holdTime * CURSOR_ACCEL);
    this.holdTime++;
    this.cursorX += dx * speed;
    this.cursorY += dy * speed;
    this.clampCursor();
    this.followCursor();
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
    const world = this.world;
    if (!world) return;
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
    const map = world.map;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!map.inBounds(x, y)) continue;
        const p = (y << 6) | x;
        const ov = map.overlay[p];
        if (ov === this.veiledIcon && this.veiledIcon !== 0) continue; // туман: чёрная клетка
        this.drawIcon(map.ground[p], x * size - ox, y * size - oy, size);
        if (ov !== 0) this.drawIcon(ov, x * size - ox, y * size - oy, size);
      }
    }
    // свои картинки зданий — одной картинкой на всю раскладку
    for (const st of world.structures) {
      if (!st.built) continue;
      if (st.x > x1 || st.y > y1 || st.x + st.w <= x0 || st.y + st.h <= y0) continue;
      const img = this.skins.structure(st.type, st.w * size, st.h * size);
      if (img) ctx.drawImage(img, st.x * size - ox, st.y * size - oy);
    }
    if (this.showGrid) this.drawGrid(x0, y0, x1, y1, size, ox, oy);

    // юниты: снизу вверх по экрану, чтобы ближние перекрывали дальние
    const margin = 32;
    const visible = world.units.filter(
      (u) => u.x > this.camX - margin && u.x < this.camX + v.w + margin && u.y > this.camY - margin && u.y < this.camY + v.h + margin,
    );
    // наземные снизу вверх, затем воздушные — поверх всех
    visible.sort((a, b) => (a.air ? 100000 : 0) + a.y - ((b.air ? 100000 : 0) + b.y));
    for (const u of visible) {
      const skin = this.sprites.unitSkin(u.type, u.orientation, u.anim >> 3, u.turret);
      if (skin) {
        const c = this.skins.scaled(skin.key, skin.box * z, skin.box * z)!;
        ctx.drawImage(c, Math.round((u.x - skin.box / 2) * z) - ox, Math.round((u.y - skin.box / 2) * z) - oy);
        continue;
      }
      for (const f of this.sprites.unitFrames(u.type, u.orientation, u.anim >> 3, u.turret)) {
        const img = this.sprites.get(f, u.house);
        ctx.drawImage(img.canvas, Math.round((u.x + img.ox) * z) - ox, Math.round((u.y + img.oy) * z) - oy, img.canvas.width * z, img.canvas.height * z);
      }
    }

    // взрывы: пока кадры MD не сопоставлены — вспышка по ходу анимации
    for (const b of world.blasts) {
      const r = (6 + (b.age % 4) * 3) * z;
      const g = ctx.createRadialGradient(b.x * z - ox, b.y * z - oy, 0, b.x * z - ox, b.y * z - oy, r);
      g.addColorStop(0, "rgba(255,240,170,0.95)");
      g.addColorStop(0.5, "rgba(255,150,40,0.8)");
      g.addColorStop(1, "rgba(120,40,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x * z - ox, b.y * z - oy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // постановка здания: рамка на клетках под курсором
    if (this.placement) {
      const pl = this.placement;
      const cx = Math.floor(this.cursorX / CELL_PX);
      const cy = Math.floor(this.cursorY / CELL_PX);
      ctx.fillStyle = pl.valid > 0 ? "rgba(80,220,120,0.35)" : pl.valid < 0 ? "rgba(240,200,60,0.35)" : "rgba(230,60,60,0.4)";
      ctx.fillRect(cx * size - ox, cy * size - oy, pl.w * size, pl.h * size);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = Math.max(1, z);
      ctx.strokeRect(cx * size - ox + 0.5, cy * size - oy + 0.5, pl.w * size - 1, pl.h * size - 1);
    }

    // выделение — уголки рамки, как у курсора оригинала
    const s = this.selectedStructure;
    if (s) this.drawCorners(s.x * CELL_PX, s.y * CELL_PX, s.w * CELL_PX, s.h * CELL_PX, ox, oy);
    for (const u of this.selectedUnits) this.drawCorners(u.x - 14, u.y - 14, 28, 28, ox, oy);

    if (this.box?.active) {
      const a = this.box;
      ctx.strokeStyle = "#f4f4f4";
      ctx.lineWidth = Math.max(1, Math.round(z / 2));
      ctx.strokeRect(Math.min(a.x, this.mouse.x) + 0.5, Math.min(a.y, this.mouse.y) + 0.5, Math.abs(this.mouse.x - a.x), Math.abs(this.mouse.y - a.y));
    }

    const cur = this.cursors[this.cursorKind];
    ctx.drawImage(cur, Math.round((this.cursorX - 16) * z) - ox, Math.round((this.cursorY - 16) * z) - oy, 32 * z, 32 * z);
  }

  /** Четыре уголка (из оригинального курсора-рамки) по углам прямоугольника. */
  private drawCorners(x: number, y: number, w: number, h: number, ox: number, oy: number): void {
    const z = this.zoom;
    const [tl, tr, bl, br] = this.corners;
    const put = (c: HTMLCanvasElement, wx: number, wy: number) =>
      this.ctx.drawImage(c, Math.round(wx * z) - ox, Math.round(wy * z) - oy, c.width * z, c.height * z);
    put(tl, x, y);
    put(tr, x + w - tr.width, y);
    put(bl, x, y + h - bl.height);
    put(br, x + w - br.width, y + h - br.height);
  }

  private drawGrid(x0: number, y0: number, x1: number, y1: number, size: number, ox: number, oy: number): void {
    const ctx = this.ctx;
    const map = this.world!.map;
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
        if (!map.inBounds(x, y)) continue;
        const label = String(map.ground[(y << 6) | x]);
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

/** Разрезать курсор-рамку 32x32 на четыре уголка 8x8. */
function splitCorners(src: HTMLCanvasElement): HTMLCanvasElement[] {
  const S = 8;
  return [
    [0, 0],
    [32 - S, 0],
    [0, 32 - S],
    [32 - S, 32 - S],
  ].map(([sx, sy]) => {
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    c.getContext("2d")!.drawImage(src, sx, sy, S, S, 0, 0, S, S);
    return c;
  });
}
