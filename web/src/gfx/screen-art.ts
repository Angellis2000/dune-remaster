/** Перерисованная графика начала игры; извлечённые эталоны ROM в репозиторий не входят. */
import arrakis from "./assets/frontend/arrakis-wide.png?url";
import settings from "./assets/frontend/settings-wide.png?url";
import password from "./assets/frontend/password-wide.png?url";
import houses from "./assets/frontend/house-crests.png?url";
import sega from "./assets/frontend/sega.png?url";
import publishers from "./assets/frontend/publishers.png?url";
import ships from "./assets/frontend/intro-ships.png?url";

export const SCREEN_ART = { arrakis, settings, password, houses, sega, publishers, ships };
export type ScreenArtKey = keyof typeof SCREEN_ART;

export class ScreenArt {
  private images = new Map<ScreenArtKey, ImageBitmap>();

  async load(): Promise<void> {
    await Promise.all(Object.entries(SCREEN_ART).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw Error(String(response.status));
        this.images.set(key as ScreenArtKey, await createImageBitmap(await response.blob()));
      } catch (error) {
        console.warn(`Не удалось загрузить HD-экран ${key}; используем ROM`, error);
      }
    }));
  }

  get(key: ScreenArtKey): ImageBitmap | undefined { return this.images.get(key); }

  /** Фон закрывает широкое окно без изменения соотношения сторон исходной картинки. */
  background(ctx: CanvasRenderingContext2D, key: ScreenArtKey, offsetX = 0): boolean {
    const image = this.get(key);
    if (!image) return false;
    const matrix = ctx.getTransform();
    const logicalW = ctx.canvas.width / matrix.a;
    const logicalH = ctx.canvas.height / matrix.d;
    const w = Math.max(logicalW, logicalH * image.width / image.height);
    const h = w * image.height / image.width;
    ctx.drawImage(image, (320 - w) / 2 + offsetX, (224 - h) / 2, w, h);
    return true;
  }
}
