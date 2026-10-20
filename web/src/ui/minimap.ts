/**
 * Мини-карта в стиле тактической карты современного шутера: холст в полном разрешении экрана, местность чистыми
 * цветами по типу клетки (песок, скала, горы, дюны, спайс, бетон, стены, здания) с мягкими переходами, неразведанное —
 * тёмная штриховка, тонкая сетка; здания — по размеру, юниты — чёткие точки с обводкой (свои голубые, чужие красные);
 * видимая область — рамка с уголками, вне её карта чуть притемнена. Щелчок или протяжка — перейти.
 */
/** что нужно мини-карте от карты: иконки, разведанные клетки, границы */
export interface MinimapSource {
  ground: Uint16Array;
  unveiled?: Uint8Array;
  bounds: { x: number; y: number; w: number; h: number };
}
export interface MinimapUnit { x: number; y: number; color?: string; own?: boolean; air?: boolean; ally?:boolean }
export interface MinimapStructure { x: number; y: number; w: number; h: number; own: boolean; ally?:boolean }
import type { IconSet } from "../gfx/icons.ts";
import { LST } from "../engine/core.ts";
import { iconLandscape } from "../engine/tables.ts";
import { CELL_PX } from "../rom/dune.ts";
import type { MapView } from "../view/mapview.ts";

/** ширина мини-карты в точках CSS (как .minimap и панели справа) */
const CSS_WIDTH = 252;
/** цвет местности по типу клетки (LST): плоская тактическая палитра в тонах пустыни */
const LAND: Record<number, [number, number, number]> = {
  [LST.NORMAL_SAND]: [196, 160, 102], [LST.ENTIRELY_DUNE]: [214, 176, 112], [LST.PARTIAL_DUNE]: [205, 168, 106],
  [LST.PARTIAL_ROCK]: [150, 112, 70], [LST.ENTIRELY_ROCK]: [118, 86, 54], [LST.MOSTLY_ROCK]: [130, 96, 60],
  [LST.ENTIRELY_MOUNTAIN]: [70, 52, 36], [LST.PARTIAL_MOUNTAIN]: [92, 68, 46],
  [LST.SPICE]: [226, 112, 40], [LST.THICK_SPICE]: [196, 72, 24], [LST.BLOOM_FIELD]: [236, 140, 60],
  [LST.CONCRETE_SLAB]: [104, 108, 112], [LST.WALL]: [150, 154, 160], [LST.STRUCTURE]: [96, 100, 106], [LST.DESTROYED_WALL]: [90, 84, 78],
};

export class Minimap {
  readonly canvas = document.createElement("canvas");
  private base = document.createElement("canvas");
  private cells = document.createElement("canvas");
  private map: MinimapSource | null = null;
  /** точек холста на клетку карты */
  private k = 4;
  private dpr = 1;
  private hatch: CanvasPattern | null = null;

  constructor(
    private view: MapView,
    private icons: IconSet,
  ) {
    this.canvas.className = "minimap";
    this.canvas.setAttribute("aria-label", "Мини-карта");
    let down = false;
    const go = (e: PointerEvent) => {
      if (!this.map) return;
      const r = this.canvas.getBoundingClientRect();
      const b = this.map.bounds;
      const cx = ((e.clientX - r.left) / r.width) * b.w + b.x;
      const cy = ((e.clientY - r.top) / r.height) * b.h + b.y;
      this.view.centerOn(cx * CELL_PX, cy * CELL_PX);
    };
    this.canvas.addEventListener("pointerdown", (e) => {
      down = true;
      this.canvas.setPointerCapture(e.pointerId);
      go(e);
    });
    this.canvas.addEventListener("pointermove", (e) => down && go(e));
    this.canvas.addEventListener("pointerup", () => (down = false));
  }

  setMap(map: MinimapSource): void {
    this.map = map;
    const b = map.bounds;
    this.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    this.k = Math.max(2, Math.round((CSS_WIDTH * this.dpr) / b.w));
    for (const c of [this.base, this.canvas]) {
      c.width = b.w * this.k;
      c.height = b.h * this.k;
    }
    this.cells.width = b.w;
    this.cells.height = b.h;
    this.hatch = null;
    this.refresh();
  }

  /** штриховка неразведанного: тонкие диагонали на тёмном */
  private hatchPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
    if (this.hatch) return this.hatch;
    const n = Math.max(4, Math.round(5 * this.dpr));
    const c = document.createElement("canvas");
    c.width = c.height = n;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0c0f13";
    g.fillRect(0, 0, n, n);
    g.strokeStyle = "rgba(195,184,158,.12)";
    g.lineWidth = Math.max(1, this.dpr * .7);
    g.beginPath();
    g.moveTo(-1, n + 1); g.lineTo(n + 1, -1);
    g.stroke();
    return this.hatch = ctx.createPattern(c, "repeat")!;
  }

  /**
   * Перерисовать местность, здания и юниты (после разведки и изменений карты). radar — работает ли радар дома: как в
   * Sega (аудит 2026-10-20) подробная карта только с аванпостом и при хватающей энергии ($1A7FE, рисование $51B4);
   * без него окно — ровная подложка, на которой видны лишь свои постройки ($53C2), и рамка обзора.
   */
  refresh(units: MinimapUnit[] = [], structures: MinimapStructure[] = [], radar = true): void {
    const map = this.map;
    if (!map) return;
    const b = map.bounds, k = this.k, d = this.dpr;
    if (!radar) {
      const ctx = this.base.getContext("2d")!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#14181d";
      ctx.fillRect(0, 0, this.base.width, this.base.height);
      for (const s of structures) {
        if (!s.own) continue;
        ctx.fillStyle = "#2f9fd0";
        ctx.fillRect((s.x - b.x) * k + d * .5, (s.y - b.y) * k + d * .5, s.w * k - d, s.h * k - d);
      }
      ctx.fillStyle = "rgba(200,190,160,.28)";
      ctx.font = `${Math.round(11 * d)}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText("РАДАР НЕ РАБОТАЕТ", this.base.width / 2, this.base.height - 6 * d);
      this.draw();
      return;
    }
    // 1) местность по клетке: цвет типа, чуть смешанный со средним цветом иконки — чтобы были оттенки
    const cg = this.cells.getContext("2d")!, img = cg.createImageData(b.w, b.h);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const p = ((y + b.y) << 6) | (x + b.x), i = (y * b.w + x) * 4;
      const land = LAND[iconLandscape[map.ground[p] & 0x1ff]] ?? LAND[LST.NORMAL_SAND];
      const avg = this.icons.averageColor[map.ground[p]] ?? "#000";
      const ar = parseInt(avg.slice(1, 3), 16) || 0, ag = parseInt(avg.slice(3, 5), 16) || 0, ab = parseInt(avg.slice(5, 7), 16) || 0;
      img.data[i] = land[0] * .8 + ar * .2; img.data[i + 1] = land[1] * .8 + ag * .2; img.data[i + 2] = land[2] * .8 + ab * .2; img.data[i + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    const ctx = this.base.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(this.cells, 0, 0, b.w * k, b.h * k);
    // 2) сетка через 8 клеток
    ctx.strokeStyle = "rgba(20,16,10,.22)";
    ctx.lineWidth = Math.max(1, d * .6);
    ctx.beginPath();
    for (let x = 8 - (b.x % 8); x < b.w; x += 8) { ctx.moveTo(x * k + .5, 0); ctx.lineTo(x * k + .5, b.h * k); }
    for (let y = 8 - (b.y % 8); y < b.h; y += 8) { ctx.moveTo(0, y * k + .5); ctx.lineTo(b.w * k, y * k + .5); }
    ctx.stroke();
    // 3) неразведанное — штриховка по клеткам
    if (map.unveiled) {
      ctx.fillStyle = this.hatchPattern(ctx);
      ctx.beginPath();
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
        if (!map.unveiled[((y + b.y) << 6) | (x + b.x)]) ctx.rect(x * k, y * k, k, k);
      }
      ctx.fill();
    }
    // 4) здания по размеру, 5) юниты — точки с обводкой
    for (const s of structures) {
      const x = (s.x - b.x) * k, y = (s.y - b.y) * k, w = s.w * k, h = s.h * k;
      ctx.fillStyle = s.own ? "#2f9fd0" : s.ally ? '#27b49f' : "#d0402e";
      ctx.fillRect(x + d * .5, y + d * .5, w - d, h - d);
      ctx.strokeStyle = s.own ? "#c8f0ff" : s.ally ? '#9dffe7' : "#ffd0c8";
      ctx.lineWidth = Math.max(1, d * .8);
      ctx.strokeRect(x + d, y + d, w - 2 * d, h - 2 * d);
    }
    const r = Math.max(1.6 * d, k * .42);
    for (const u of units) {
      const own = u.own ?? u.color === "#7fd0ff";
      const x = (u.x / CELL_PX - b.x) * k, y = (u.y / CELL_PX - b.y) * k;
      ctx.fillStyle = "#06080b";
      ctx.beginPath();
      if (u.air) { ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x + r * 1.4, y + r * 1.1); ctx.lineTo(x - r * 1.4, y + r * 1.1); ctx.closePath(); }
      else ctx.arc(x, y, r + d * .8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = own ? "#7fe4ff" : u.ally ? '#53e2c4' : "#ff5a48";
      ctx.beginPath();
      if (u.air) { ctx.moveTo(x, y - r * 1.1); ctx.lineTo(x + r * .9, y + r * .7); ctx.lineTo(x - r * .9, y + r * .7); ctx.closePath(); }
      else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    this.draw();
  }

  /** Каждый кадр: готовая подложка, притемнение вне видимой области и рамка с уголками. */
  draw(): void {
    if (!this.map) return;
    const ctx = this.canvas.getContext("2d")!;
    const b = this.map.bounds, k = this.k / CELL_PX, d = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.base, 0, 0);
    const v = this.view.viewSize();
    const x = Math.round((this.view.camX - b.x * CELL_PX) * k), y = Math.round((this.view.camY - b.y * CELL_PX) * k);
    const w = Math.round(v.w * k), h = Math.round(v.h * k);
    ctx.save();
    ctx.fillStyle = "rgba(6,8,12,.32)";
    ctx.beginPath(); ctx.rect(0, 0, this.canvas.width, this.canvas.height); ctx.rect(x, y, w, h); ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255,244,214,.75)"; ctx.lineWidth = Math.max(1, d);
    ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    // уголки
    const arm = Math.min(w, h) * .22;
    ctx.strokeStyle = "#ffd36a"; ctx.lineWidth = Math.max(2, d * 2);
    ctx.beginPath();
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x + w, y + h, -1, -1], [x, y + h, 1, -1]] as const) {
      ctx.moveTo(cx, cy + sy * arm); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * arm, cy);
    }
    ctx.stroke();
    ctx.restore();
  }
}
