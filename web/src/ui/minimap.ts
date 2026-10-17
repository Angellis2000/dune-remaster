/** Мини-карта: клетки средним цветом иконки, рамка видимой области, щелчок — перейти. */
import type { GameMap } from "../game/map.ts";
import type { IconSet } from "../gfx/icons.ts";
import { CELL_PX } from "../rom/dune.ts";
import type { MapView } from "../view/mapview.ts";

export class Minimap {
  readonly canvas = document.createElement("canvas");
  private base = document.createElement("canvas");
  private map: GameMap | null = null;
  private scale = 2;

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

  setMap(map: GameMap): void {
    this.map = map;
    const b = map.bounds;
    this.scale = Math.max(2, Math.floor(160 / b.w));
    for (const c of [this.base, this.canvas]) {
      c.width = b.w * this.scale;
      c.height = b.h * this.scale;
    }
    const ctx = this.base.getContext("2d")!;
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        ctx.fillStyle = this.icons.averageColor[map.ground[((y + b.y) << 6) | (x + b.x)]] ?? "#000";
        ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
      }
    }
    this.draw();
  }

  draw(): void {
    if (!this.map) return;
    const ctx = this.canvas.getContext("2d")!;
    ctx.drawImage(this.base, 0, 0);
    const b = this.map.bounds;
    const v = this.view.viewSize();
    const k = this.scale / CELL_PX;
    ctx.strokeStyle = "#f3d27a";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.round((this.view.camX - b.x * CELL_PX) * k) + 0.5,
      Math.round((this.view.camY - b.y * CELL_PX) * k) + 0.5,
      Math.round(v.w * k) - 1,
      Math.round(v.h * k) - 1,
    );
  }
}
