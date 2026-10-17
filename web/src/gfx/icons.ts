/**
 * Иконки клеток карты (32x32): собираются из тайлов VRAM по таблице ROM.
 *
 * Каждая иконка — это «источник» (картинка + прямоугольник). По умолчанию все они лежат
 * в одном атласе, нарисованном из оригинальных тайлов. Чтобы заменить графику, достаточно
 * подменить источник иконки картинкой любого разрешения (setOverride): рисуется она
 * всё равно в клетку 32x32 мировых пикселей, так что HD-графика встаёт без переделки движка.
 */
import { CELL_PX, DuneRom, ROM } from "../rom/dune.ts";
import { blitTile } from "../rom/md.ts";

export interface IconSource {
  image: CanvasImageSource;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const ATLAS_COLS = 32;

export class IconSet {
  readonly count: number = ROM.iconCount;
  readonly atlas: HTMLCanvasElement;
  /** средний цвет каждой иконки — для мини-карты */
  readonly averageColor: string[] = [];
  private sources: IconSource[] = [];

  constructor(rom: DuneRom) {
    const vram = rom.terrainVram();
    const palette = rom.gamePalette();
    const rows = Math.ceil(this.count / ATLAS_COLS);
    const W = ATLAS_COLS * CELL_PX;
    const H = rows * CELL_PX;
    const px = new Uint32Array(W * H);
    for (let id = 0; id < this.count; id++) {
      const words = rom.icon(id);
      const ox = (id % ATLAS_COLS) * CELL_PX;
      const oy = Math.floor(id / ATLAS_COLS) * CELL_PX;
      for (let k = 0; k < 16; k++) blitTile(vram, words[k], palette, px, W, ox + (k % 4) * 8, oy + (k >> 2) * 8);
      this.averageColor.push(average(px, W, ox, oy));
    }
    this.atlas = document.createElement("canvas");
    this.atlas.width = W;
    this.atlas.height = H;
    this.atlas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(px.buffer), W, H), 0, 0);
    for (let id = 0; id < this.count; id++) {
      this.sources.push({
        image: this.atlas,
        sx: (id % ATLAS_COLS) * CELL_PX,
        sy: Math.floor(id / ATLAS_COLS) * CELL_PX,
        sw: CELL_PX,
        sh: CELL_PX,
      });
    }
  }

  source(id: number): IconSource {
    return this.sources[id] ?? this.sources[0];
  }

  /** Подменить иконку своей картинкой (любого размера). */
  setOverride(id: number, image: CanvasImageSource & { width: number; height: number }): void {
    this.sources[id] = { image, sx: 0, sy: 0, sw: image.width, sh: image.height };
  }
}

function average(px: Uint32Array, stride: number, ox: number, oy: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < CELL_PX; y++) {
    for (let x = 0; x < CELL_PX; x++) {
      const v = px[(oy + y) * stride + ox + x];
      if (!(v >>> 24)) continue;
      r += v & 255;
      g += (v >> 8) & 255;
      b += (v >> 16) & 255;
      n++;
    }
  }
  if (!n) return "#000";
  return `rgb(${(r / n) | 0},${(g / n) | 0},${(b / n) | 0})`;
}
