/** Перерисованная графика начала игры; извлечённые эталоны ROM в репозиторий не входят. */
import arrakis from "./assets/frontend/arrakis-wide.png?url";
import settings from "./assets/frontend/settings-wide.png?url";
import password from "./assets/frontend/password-wide.png?url";
import houses from "./assets/frontend/house-crests-modern.png?url";
import sega from "./assets/frontend/sega.png?url";
import publishers from "./assets/frontend/publishers.png?url";
import ships from "./assets/frontend/intro-ships-angles-v2.png?url";
import victory from "./assets/frontend/victory-hd.png?url";
import defeat from "./assets/frontend/defeat-hd.png?url";
import mentatAtreides from "./assets/frontend/mentat-atreides-hd.png?url";
import mentatOrdos from "./assets/frontend/mentat-ordos-hd.png?url";
import mentatHarkonnen from "./assets/frontend/mentat-harkonnen-hd.png?url";
import strategicSurface from "./assets/frontend/strategic-relief-hd.png?url";
import operationsConsole from "./assets/frontend/operations-console-hd.png?url";
import productionConsole from "./assets/frontend/production-console-hd.png?url";
import buildingPortraitsA from './assets/frontend/building-portraits-a.png?url';
import buildingPortraitsB from './assets/frontend/building-portraits-b.png?url';
import buildingPortraitsC from './assets/frontend/building-portraits-c.png?url';
import buildingPortraitsD from './assets/frontend/building-portraits-d.png?url';
import buildingIconsA from './assets/frontend/building-icons-a.png?url';
import buildingIconsB from './assets/frontend/building-icons-b.png?url';

export const SCREEN_ART = { arrakis, settings, password, houses, sega, publishers, ships, victory, defeat, mentatAtreides, mentatOrdos, mentatHarkonnen, strategicSurface, operationsConsole, productionConsole, buildingPortraitsA, buildingPortraitsB, buildingPortraitsC, buildingPortraitsD, buildingIconsA, buildingIconsB };
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
