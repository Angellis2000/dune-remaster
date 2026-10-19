/** Transparent HD decals and animation frames, with original world-space bounds. */
import effectsUrl from './assets/map-hd/effects.png?url';
import metaUrl from './assets/map-hd/effects-meta.json?url';
import decalsUrl from './assets/map-hd/destruction-decals.png?url';
import idsUrl from './assets/map-hd/destruction-ids.json?url';
import concreteUrl from './assets/map-hd/concrete.png?url';
import bloomUrl from './assets/map-hd/bloom-transparent.png?url';
import bloomAltUrl from './assets/map-hd/bloom-alt-transparent.png?url';
import craterUrl from './assets/map-hd/crater-hd.png?url';
import constructionUrl from './assets/map-hd/construction-site-hd.png?url';
import type { IconSource } from './icons.ts';
import type { SpriteImage } from './sprites.ts';

interface EffectMeta {
  key: string;
  aliases?: number[];
  index: number;
  original: { ox: number; oy: number; width: number; height: number };
}

export class MapEffects {
  constructionSite: ImageBitmap | null = null;
  private frames = new Map<string, SpriteImage>();
  private decals = new Map<number, IconSource>();

  static async load(): Promise<MapEffects | null> {
    try {
      const bitmap = async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) throw Error(`Map art HTTP ${response.status}`);
        return createImageBitmap(await response.blob());
      };
      const json = async <T>(url: string): Promise<T> => {
        const response = await fetch(url);
        if (!response.ok) throw Error(`Map metadata HTTP ${response.status}`);
        return response.json();
      };
      const [effects, decals, concrete, bloom, bloomAlt, crater, construction, meta, ids] = await Promise.all([
        bitmap(effectsUrl), bitmap(decalsUrl), bitmap(concreteUrl), bitmap(bloomUrl), bitmap(bloomAltUrl),
        bitmap(craterUrl),bitmap(constructionUrl),
        json<EffectMeta[]>(metaUrl), json<number[]>(idsUrl),
      ]);
      const result = new MapEffects();
      result.constructionSite=construction;
      const sheet = document.createElement('canvas'); sheet.width = sheet.height = 1024;
      const g = sheet.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(effects, 0, 0, 1024, 1024);
      const pixels = g.getImageData(0, 0, 1024, 1024).data;
      for (const e of meta) {
        const x = (e.index % 8) * 128, y = Math.floor(e.index / 8) * 128;
        let x0 = 128, y0 = 128, x1 = -1, y1 = -1;
        // Ignore imperceptible RGB fringes in alpha <= 8, retain visible smoke.
        for (let row = 0; row < 128; row++) for (let col = 0; col < 128; col++) {
          if (pixels[((y + row) * 1024 + x + col) * 4 + 3] <= 8) continue;
          x0 = Math.min(x0, col); y0 = Math.min(y0, row);
          x1 = Math.max(x1, col); y1 = Math.max(y1, row);
        }
        if (x1 < x0) continue;
        x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2);
        x1 = Math.min(127, x1 + 2); y1 = Math.min(127, y1 + 2);
        const canvas = document.createElement('canvas');
        canvas.width = x1 - x0 + 1; canvas.height = y1 - y0 + 1;
        canvas.getContext('2d')!.drawImage(sheet, x + x0, y + y0, canvas.width, canvas.height,
          0, 0, canvas.width, canvas.height);
        const frame = { canvas, ox: e.original.ox, oy: e.original.oy,
          worldWidth: e.original.width, worldHeight: e.original.height };
        result.frames.set(e.key, frame);
        for (const alias of e.aliases ?? []) result.frames.set(`frame:${alias}`, frame);
      }
      effects.close();
      for (let i = 0; i < ids.length; i++) {
        result.decals.set(ids[i], { image: decals, sx: (i % 8) * decals.width / 8,
          sy: Math.floor(i / 8) * decals.height / 8, sw: decals.width / 8, sh: decals.height / 8 });
      }
      // The former atlas cut several crater rims at cell borders. Each damage stage
      // now uses a whole isolated crater, with generous padding inside its world cell.
      for(const id of ids.filter(id=>id<=33)){
        const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
        const g=canvas.getContext('2d')!,stage=id===33?9:Math.floor((id-1)/2);
        const scale=.54+Math.min(9,stage)*.038;
        g.translate(128,128);g.rotate(((id*7)%9-4)*.025);
        g.drawImage(crater,-128*scale,-128*scale,256*scale,256*scale);
        result.decals.set(id,{image:canvas,sx:0,sy:0,sw:256,sh:256});
      }
      crater.close();
      result.decals.set(125, result.decals.get(33)!);
      // Spice blooms and concrete remain separate objects above the continuous ground.
      for (const [id, image] of [[126, concrete], [208, bloom], [209, bloomAlt]] as const) {
        result.decals.set(id, { image, sx: 0, sy: 0, sw: image.width, sh: image.height });
      }
      return result;
    } catch (error) {
      console.warn('HD map effects unavailable, using original graphics:', error);
      return null;
    }
  }

  frame(key: string): SpriteImage | null { return this.frames.get(key) ?? null; }
  icon(id: number): IconSource | null { return this.decals.get(id) ?? null; }
}
