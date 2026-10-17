/**
 * Свои картинки поверх оригинальной графики. Здание рисуется одной картинкой на всю
 * свою раскладку (например, Строительный двор — 2×2 клетки), вместо иконок из ROM.
 * Картинка любого размера: для каждого масштаба она заранее уменьшается с хорошим
 * сглаживанием, чтобы на экране не было «лесенки» и мерцания.
 */
import { loadSkinFiles, storeSkinFile } from "../ui/romstore.ts";

const key = (type: number) => `structure:${type}`;

interface Skin {
  image: ImageBitmap;
  scaled: Map<string, HTMLCanvasElement>;
}

export class Skins {
  private structures = new Map<number, Skin>();
  onChange: () => void = () => {};

  async load(): Promise<void> {
    for (const [k, blob] of await loadSkinFiles()) {
      const m = /^structure:(\d+)$/.exec(k);
      if (!m) continue;
      try {
        this.structures.set(Number(m[1]), { image: await createImageBitmap(blob), scaled: new Map() });
      } catch {
        /* испорченный файл — пропускаем */
      }
    }
  }

  hasStructure(type: number): boolean {
    return this.structures.has(type);
  }

  structureImage(type: number): ImageBitmap | null {
    return this.structures.get(type)?.image ?? null;
  }

  async setStructure(type: number, file: Blob): Promise<void> {
    const image = await createImageBitmap(file);
    this.structures.set(type, { image, scaled: new Map() });
    await storeSkinFile(key(type), file);
    this.onChange();
  }

  async clearStructure(type: number): Promise<void> {
    this.structures.delete(type);
    await storeSkinFile(key(type), null);
    this.onChange();
  }

  /** Картинка здания, уменьшенная ровно до w×h экранных пикселей. */
  structure(type: number, w: number, h: number): HTMLCanvasElement | null {
    const s = this.structures.get(type);
    if (!s) return null;
    const k = `${w}x${h}`;
    let c = s.scaled.get(k);
    if (!c) {
      c = downscale(s.image, w, h);
      s.scaled.set(k, c);
    }
    return c;
  }
}

/** Уменьшение вдвое за шаг — заметно чище, чем одним drawImage. */
function downscale(src: CanvasImageSource & { width: number; height: number }, w: number, h: number): HTMLCanvasElement {
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
