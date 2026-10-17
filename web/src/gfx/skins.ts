/**
 * Своя графика поверх оригинальной. Ключи:
 *   icon:N        — клетка карты N (32×32 мировых пикселя);
 *   structure:T   — здание типа T целиком, на всю раскладку (2×2, 3×3 и т. д.);
 *   unit:T:кадр   — кадр юнита типа T (кадр — имя файла из набора: d3, d3_f1, d2_t5, d2_t5_r — отдача).
 * Картинка любого размера: под каждый масштаб она заранее уменьшается со сглаживанием.
 * Хранится только в браузере (IndexedDB).
 */
import { loadSkinFiles, storeSkinFile } from "../ui/romstore.ts";

interface Skin {
  image: ImageBitmap;
  scaled: Map<string, HTMLCanvasElement>;
}

export class Skins {
  private skins = new Map<string, Skin>();
  /** клетки карты, у которых есть своя картинка (быстрая проверка при отрисовке) */
  readonly iconOverridden = new Uint8Array(512);
  onChange: () => void = () => {};

  async load(): Promise<void> {
    for (const [k, blob] of await loadSkinFiles()) {
      try {
        this.put(k, await createImageBitmap(blob));
      } catch {
        /* испорченный файл — пропускаем */
      }
    }
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
  scaled(key: string, w: number, h: number): HTMLCanvasElement | null {
    const s = this.skins.get(key);
    if (!s) return null;
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const k = `${w}x${h}`;
    let c = s.scaled.get(k);
    if (!c) {
      c = downscale(s.image, w, h);
      if (s.scaled.size > 16) s.scaled.clear();
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
  structure(type: number, w: number, h: number): HTMLCanvasElement | null {
    return this.scaled(`structure:${type}`, w, h);
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
