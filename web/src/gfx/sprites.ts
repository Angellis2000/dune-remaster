/**
 * Спрайты юнитов по схеме MD-версии (процедуры $0121F8 и $9598):
 * тип юнита -> первый кадр и режим показа -> кадр и отражение по направлению ->
 * куски кадра (как записи таблицы спрайтов VDP) -> тайлы из VRAM миссии.
 * Каждый вариант (кадр, отражение, палитра) рисуется один раз и кэшируется.
 */
import type { DuneRom, SpriteFrame } from "../rom/dune.ts";
import { ROM } from "../rom/dune.ts";
import { readU16 } from "../rom/md.ts";

export interface SpriteImage {
  canvas: HTMLCanvasElement;
  /** смещение левого верхнего угла картинки от центра объекта */
  ox: number;
  oy: number;
}

export interface FrameRef {
  /** номер кадра в таблице кадров, или −1, если задан def */
  frame: number;
  /** прямой адрес описания кадра (танки с башней) */
  def?: number;
  /** бит 0 — по горизонтали, бит 1 — по вертикали */
  flip: number;
}

export class SpriteSet {
  private cache = new Map<string, SpriteImage>();
  private vram: Uint8Array;
  private palette: Uint32Array;

  constructor(private rom: DuneRom) {
    this.vram = rom.spriteVram();
    this.palette = rom.gamePalette();
  }

  /** Кадры юнита по ориентации корпуса и башни 0..255 (0 — север). */
  unitFrames(type: number, orientation: number, anim = 0, turret = orientation): FrameRef[] {
    const turretTable = ROM.turretFrames[type];
    if (turretTable !== undefined) {
      // $02EBFC: 8 направлений корпуса по 208 байт, внутри 8 направлений башни по 26 байт
      const body = ((orientation + 16) & 0xe0) >> 5;
      const top = ((turret + 16) & 0xe0) >> 5;
      return [{ frame: -1, def: turretTable + body * 208 + top * 26, flip: 0 }];
    }
    const { baseFrame, mode } = this.rom.unitDisplay(type);
    const b = this.rom.bytes;
    const s16 = (o: number) => (readU16(b, o) << 16) >> 16;
    if (mode === 1 || mode === 5) {
      const d = ((orientation + 16) & 0xff) >> 5;
      return [{ frame: baseFrame + s16(ROM.dir8 + d * 4), flip: readU16(b, ROM.dir8 + d * 4 + 2) }];
    }
    if (mode === 2) {
      const d = ((orientation + 8) & 0xff) >> 4;
      return [{ frame: baseFrame + s16(ROM.dir16 + d * 4), flip: readU16(b, ROM.dir16 + d * 4 + 2) }];
    }
    if (mode === 3 || mode === 4) {
      const d = ((orientation + 16) & 0xff) >> 5;
      const off = s16(ROM.dirInfantry + d * 4) * 3 + b[ROM.infantryAnim + (anim & 3)];
      return [{ frame: baseFrame + off, flip: readU16(b, ROM.dirInfantry + d * 4 + 2) }];
    }
    return [{ frame: baseFrame, flip: 0 }];
  }

  get(ref: FrameRef, house: number): SpriteImage {
    const f = ref.def !== undefined ? this.rom.frameDef(ref.def) : this.rom.frame(ref.frame);
    const flip = ref.flip;
    const pal = f.flag === 0x0b ? -1 : this.rom.housePaletteLine(house);
    const key = `${ref.def ?? ref.frame}:${flip}:${pal}`;
    let img = this.cache.get(key);
    if (!img) {
      img = this.render(f, flip, pal);
      this.cache.set(key, img);
    }
    return img;
  }

  private render(f: SpriteFrame, flip: number, houseLine: number): SpriteImage {
    // границы всех кусков с учётом отражения
    const boxes = f.pieces.map((p) => {
      const w = p.tw * 8;
      const h = p.th * 8;
      return { p, w, h, x: flip & 1 ? -(p.x + w) : p.x, y: flip & 2 ? -(p.y + h) : p.y };
    });
    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const W = Math.max(1, Math.max(...boxes.map((b) => b.x + b.w)) - minX);
    const H = Math.max(1, Math.max(...boxes.map((b) => b.y + b.h)) - minY);
    const px = new Uint32Array(W * H);
    const firstTile = f.pieces[0].attr & 0x7ff;
    for (const { p, x, y } of boxes) {
      const line = houseLine >= 0 ? houseLine : (p.attr >> 13) & 3;
      const hf = ((p.attr >> 11) & 1) ^ (flip & 1);
      const vf = ((p.attr >> 12) & 1) ^ ((flip >> 1) & 1);
      for (let col = 0; col < p.tw; col++) {
        for (let row = 0; row < p.th; row++) {
          // тайлы спрайта идут по столбцам, как у VDP
          const t = (p.attr & 0x7ff) + col * p.th + row;
          const src = f.rawSource !== null ? this.rom.bytes : this.vram;
          const base = f.rawSource !== null ? f.rawSource + (t - firstTile) * 32 : t * 32;
          for (let ty = 0; ty < 8; ty++) {
            for (let tx = 0; tx < 8; tx++) {
              const byte = src[base + ty * 4 + (tx >> 1)];
              const c = tx & 1 ? byte & 15 : byte >> 4;
              if (!c) continue;
              let X = col * 8 + tx;
              let Y = row * 8 + ty;
              if (hf) X = p.tw * 8 - 1 - X;
              if (vf) Y = p.th * 8 - 1 - Y;
              px[(y - minY + Y) * W + (x - minX + X)] = this.palette[line * 16 + c];
            }
          }
        }
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(px.buffer), W, H), 0, 0);
    return { canvas, ox: minX, oy: minY };
  }
}
