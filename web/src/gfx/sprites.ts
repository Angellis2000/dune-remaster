/**
 * Спрайты юнитов по схеме MD-версии (процедуры $0121F8 и $9598):
 * тип юнита -> первый кадр и режим показа -> кадр и отражение по направлению ->
 * куски кадра (как записи таблицы спрайтов VDP) -> тайлы из VRAM миссии.
 * Каждый вариант (кадр, отражение, палитра) рисуется один раз и кэшируется.
 */
import type { DuneRom, SpriteFrame } from "../rom/dune.ts";
import { ROM } from "../rom/dune.ts";
import { readU16, readU32 } from "../rom/md.ts";
import { unitBox, unitStem } from "./pack.ts";
import type { Skins } from "./skins.ts";

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

/** Состояние юнита, от которого зависит кадр. */
export interface UnitDrawState {
  /** вторая анимация (ракеты): flags.animationFlip */
  flip?: boolean;
  /** транспортник несёт груз */
  carrying?: boolean;
  /** большая пуля */
  big?: boolean;
  /** кадр крыльев орнитоптера (spriteOffset) */
  wing?: number;
  /** танк только что выстрелил: кадры отдачи башни (Unit.recoilShown) */
  recoil?: boolean;
}

/** Кадры эффектов, которых нет в MD-версии, — ближайшие похожие. */
const EFFECT_FALLBACK: Record<number, number> = {
  151: 153, 152: 154, 156: 223, 157: 224, 158: 225, 168: 180, 169: 181, 170: 182, 214: 218, 215: 219, 216: 220, 217: 221,
};

export class SpriteSet {
  private cache = new Map<string, SpriteImage>();
  private vram: Uint8Array;
  private palette: Uint32Array;

  /** своя графика юнитов (если загружена) */
  skins: Skins | null = null;
  private boxes = new Map<number, number>();

  constructor(private rom: DuneRom) {
    this.vram = rom.spriteVram();
    this.palette = rom.gamePalette();
  }

  /** Своя картинка для этого вида юнита: ключ и сторона квадрата (мировые пиксели) с центром юнита посередине. */
  unitSkin(type: number, orientation: number, anim: number, turret: number, recoil = false): { key: string; box: number } | null {
    if (!this.skins) return null;
    let key = `unit:${type}:${unitStem(this.rom, type, orientation, anim, turret, recoil)}`;
    // своей картинки отдачи нет — берём обычную своей же графики, а не кадр из ROM
    if (recoil && !this.skins.has(key)) key = `unit:${type}:${unitStem(this.rom, type, orientation, anim, turret)}`;
    if (!this.skins.has(key)) return null;
    let box = this.boxes.get(type);
    if (box === undefined) {
      box = unitBox(this.rom, this, type);
      this.boxes.set(type, box);
    }
    return { key, box };
  }

  /** Кадры юнита по ориентации корпуса и башни 0..255 (0 — север). */
  unitFrames(type: number, orientation: number, anim = 0, turret = orientation, state: UnitDrawState = {}): FrameRef[] {
    const refs = this.unitFramesBase(type, orientation, anim, turret, state);
    // как GUI_Widget_Viewport_Draw: вторая анимация ракет, транспортник с грузом, большая пуля
    const extra = (state.flip ? 5 : 0) + (state.carrying ? 3 : 0) + (state.big ? 1 : 0);
    if (extra) for (const r of refs) if (r.frame >= 0) r.frame += extra;
    return refs;
  }

  private unitFramesBase(type: number, orientation: number, anim: number, turret: number, state: UnitDrawState): FrameRef[] {
    const turretTable = state.recoil ? ROM.recoilFrames[type] : ROM.turretFrames[type];
    if (turretTable !== undefined) {
      // $02EC06: 8 направлений корпуса по 208 байт, внутри 8 направлений башни по 26 байт
      const body = ((orientation + 16) & 0xe0) >> 5;
      const top = ((turret + 16) & 0xe0) >> 5;
      return [{ frame: -1, def: turretTable + body * 208 + top * 26, flip: 0 }];
    }
    const { baseFrame, mode } = this.rom.unitDisplay(type);
    const b = this.rom.bytes;
    const s16 = (o: number) => (readU16(b, o) << 16) >> 16;
    if (type === 24) {
      const d = ((orientation + 8) & 0xff) >> 4;
      return [{ frame: readU16(b, ROM.sonicFrames + d * 2), flip: 0 }];
    }
    if (mode === 5) {
      // орнитоптер: по 3 кадра крыльев на направление
      const d = ((orientation + 16) & 0xff) >> 5;
      const wing = [2, 1, 0, 1][(state.wing ?? 0) & 3];
      return [{ frame: baseFrame + s16(ROM.dir8 + d * 4) * 3 + wing, flip: readU16(b, ROM.dir8 + d * 4 + 2) }];
    }
    if (mode === 1) {
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

  /** Кадр есть в таблице MD (у пустых записей описание = FFFFFFFF). */
  hasFrame(index: number): boolean {
    if (index < 0 || index > 400) return false;
    const def = ((this.rom.bytes[ROM.frameTable + index * 8 + 4] << 24) | (this.rom.bytes[ROM.frameTable + index * 8 + 5] << 16)) >>> 0;
    return def !== 0xffff0000;
  }

  /** Кадр эффекта (взрыв, дым, пыль) по номеру спрайта движка; своя палитра кадра, без цвета дома. */
  effect(spriteID: number): SpriteImage | null {
    let id = spriteID;
    if (!this.hasFrame(id)) id = EFFECT_FALLBACK[id] ?? -1;
    if (id < 0 || !this.hasFrame(id)) return null;
    return this.get({ frame: id, flip: 0 }, -1);
  }

  /** Значок над зданием из таблицы ROM.statusIcons; ox/oy — от левого верхнего угла здания. */
  statusIcon(table: number, index: number): SpriteImage {
    return this.statusDef(readU32(this.rom.bytes, table + index * 4));
  }

  /**
   * Пыль из-под харвестера ($00967C): отдельный спрайт, описание из таблицы $0641EE — 3 кадра × 8 направлений;
   * смещение от харвестера заложено в самом описании.
   */
  harvestDust(dir: number, frame: number): SpriteImage {
    return this.statusDef(readU32(this.rom.bytes, 0x0641ee + frame * 32 + (dir & 7) * 4));
  }

  /** Значок по описанию спрайта напрямую (молния $0658E8). */
  statusDef(def: number): SpriteImage {
    return this.get({ frame: -1, def, flip: 0 }, -1);
  }

  get(ref: FrameRef, house: number): SpriteImage {
    const f = ref.def !== undefined ? this.rom.frameDef(ref.def) : this.rom.frame(ref.frame);
    const flip = ref.flip;
    const pal = f.flag === 0x0b || house < 0 ? -1 : this.rom.housePaletteLine(house);
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
    // у VDP спрайт с меньшим номером лежит сверху: рисуем куски с конца (башня танка — первый кусок)
    for (const { p, x, y } of [...boxes].reverse()) {
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
