/**
 * Своя графика поверх оригинальной. Ключи:
 *   icon:N        — клетка карты N (32×32 мировых пикселя);
 *   structure:T   — здание типа T целиком, на всю раскладку (2×2, 3×3 и т. д.);
 *   unit:T:кадр   — кадр юнита типа T (кадр — имя файла из набора: d3, d3_f1, d2_t5, d2_t5_r — отдача).
 * Картинка любого размера: под каждый масштаб она заранее уменьшается со сглаживанием.
 * Пользовательские замены хранятся в браузере (IndexedDB) и перекрывают встроенную графику.
 */
import type { DuneRom } from "../rom/dune.ts";
import { loadSkinFiles, storeSkinFile } from "../ui/romstore.ts";
import type { IconSet } from "./icons.ts";
import { STRUCTURE_ART, type StructureArt } from "./structure-art.ts";
import {drawRadarDish} from './radar-motion.ts';

interface Skin {
  image: ImageBitmap;
  scaled: Map<string, HTMLCanvasElement>;
  directions?: boolean;
  align?: {x:number;y:number};
  layer?:ImageBitmap;
  motion?:Map<string,HTMLCanvasElement>;
}

export class Skins {
  private skins = new Map<string, Skin>();
  private defaults = new Map<string, Skin>();
  /** клетки карты, у которых есть своя картинка (быстрая проверка при отрисовке) */
  readonly iconOverridden = new Uint8Array(512);
  onChange: () => void = () => {};

  async load(_rom: DuneRom, _icons: IconSet): Promise<void> {
    // Общие картинки заводов/казарм декодируются один раз; независимые здания грузятся параллельно.
    const pending = new Map<string, Promise<Skin>>();
    await Promise.all(STRUCTURE_ART.map(async (art) => {
      try {
        let task = pending.get(art.url);
        if (!task) {
          task = this.loadDefault(art);
          pending.set(art.url, task);
        }
        this.defaults.set(`structure:${art.type}`, await task);
      } catch (error) {
        console.warn(`Не удалось загрузить графику здания ${art.type}`, error);
      }
    }));
    for (const [k, blob] of await loadSkinFiles()) {
      try {
        this.put(k, await createImageBitmap(blob));
      } catch {
        /* испорченный файл — пропускаем */
      }
    }
  }

  private async loadDefault(art: StructureArt): Promise<Skin> {
    const response = await fetch(art.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    // Keep the authored alpha: original ROM tiles otherwise reintroduce the flat green backdrop.
    const image = await createImageBitmap(await response.blob());
    let layer:ImageBitmap|undefined;
    if(art.layerUrl){
      const r=await fetch(art.layerUrl);if(!r.ok)throw new Error(`Layer HTTP ${r.status}`);
      layer=await createImageBitmap(await r.blob());
    }
    return { image, scaled: new Map(), directions: art.directions, align:art.align,layer };
  }

  private put(key: string, image: ImageBitmap | null): void {
    if (image) this.skins.set(key, { image, scaled: new Map() });
    else this.skins.delete(key);
    const m = /^icon:(\d+)$/.exec(key);
    if (m) this.iconOverridden[Number(m[1])] = image ? 1 : 0;
  }

  has(key: string): boolean {
    return this.skins.has(key);
  }

  image(key: string): ImageBitmap | null {
    return this.skins.get(key)?.image ?? null;
  }

  keys(): string[] {
    return [...this.skins.keys()];
  }

  async set(key: string, file: Blob, save = true): Promise<void> {
    this.put(key, await createImageBitmap(file));
    if (save) await storeSkinFile(key, file);
    this.onChange();
  }

  async clear(key: string): Promise<void> {
    this.put(key, null);
    await storeSkinFile(key, null);
    this.onChange();
  }

  async clearAll(): Promise<void> {
    for (const k of this.keys()) {
      this.put(k, null);
      await storeSkinFile(k, null);
    }
    this.onChange();
  }

  /** Картинка, уменьшенная ровно до w×h экранных пикселей. */
  scaled(key: string, w: number, h: number, direction = 0,withLayer=true): HTMLCanvasElement | null {
    const s = this.skins.get(key) ?? this.defaults.get(key);
    if (!s) return null;
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const frame = s.directions ? direction & 7 : 0;
    const k = `${w}x${h}:${frame}:${withLayer}`;
    let c = s.scaled.get(k);
    if (!c) {
      if (s.directions) {
        const crop = document.createElement("canvas");
        crop.width = Math.round(s.image.width / 4);
        crop.height = Math.round(s.image.height / 2);
        crop.getContext("2d")!.drawImage(s.image, (frame % 4) * s.image.width / 4, Math.floor(frame / 4) * s.image.height / 2,
          s.image.width / 4, s.image.height / 2, 0, 0, crop.width, crop.height);
        c = downscale(crop, w, h);
      } else c = downscale(s.image, w, h);
      if(s.align){
        const aligned=document.createElement('canvas');aligned.width=w;aligned.height=h;
        aligned.getContext('2d')!.drawImage(c,s.align.x*w,s.align.y*h);
        c=aligned;
      }
      if(s.layer&&withLayer)drawRadarDish(c.getContext('2d')!,s.layer,w,h);
      if (s.scaled.size > (s.directions ? 64 : 16)) s.scaled.clear();
      s.scaled.set(k, c);
    }
    return c;
  }

  // совместимость с просмотром ресурсов
  hasStructure(type: number): boolean {
    return this.has(`structure:${type}`);
  }
  structureImage(type: number): ImageBitmap | null {
    return this.image(`structure:${type}`);
  }
  setStructure(type: number, file: Blob): Promise<void> {
    return this.set(`structure:${type}`, file);
  }
  clearStructure(type: number): Promise<void> {
    return this.clear(`structure:${type}`);
  }
  structure(type: number, w: number, h: number, direction = 0,tick?:number): HTMLCanvasElement | null {
    const key=`structure:${type}`,skin=this.skins.get(key)??this.defaults.get(key);
    if(tick===undefined||!skin?.layer)return this.scaled(key,w,h,direction);
    const base=this.scaled(key,w,h,direction,false)!;
    const size=`${base.width}x${base.height}`;
    skin.motion??=new Map();let c=skin.motion.get(size);
    if(!c){c=document.createElement('canvas');c.width=base.width;c.height=base.height;
      if(skin.motion.size>4)skin.motion.clear();skin.motion.set(size,c);}
    const ctx=c.getContext('2d')!;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(base,0,0);
    drawRadarDish(ctx,skin.layer,c.width,c.height,tick);return c;
  }
}

/**
 * Подгонка под размер на экране. Уменьшение — вдвое за шаг со сглаживанием (чище, чем одним
 * drawImage); увеличение — без сглаживания, чтобы пиксельная графика не мылилась.
 */
export function downscale(src: CanvasImageSource & { width: number; height: number }, w: number, h: number): HTMLCanvasElement {
  if (w >= src.width && h >= src.height) {
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const g = out.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, w, h);
    return out;
  }
  let cur: CanvasImageSource = src;
  let cw = src.width;
  let ch = src.height;
  while (cw / 2 >= w && ch / 2 >= h) {
    const half = document.createElement("canvas");
    half.width = Math.ceil(cw / 2);
    half.height = Math.ceil(ch / 2);
    const g = half.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(cur, 0, 0, cw, ch, 0, 0, half.width, half.height);
    cur = half;
    cw = half.width;
    ch = half.height;
  }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const g = out.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  g.drawImage(cur, 0, 0, cw, ch, 0, 0, w, h);
  return out;
}
