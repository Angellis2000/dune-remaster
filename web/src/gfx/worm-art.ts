import url from './assets/vehicles-hd/sandworm-hd.png?url';
import type { Unit } from '../game/world.ts';

/** Sand disturbance and emergence use the existing unit/explosion events only. */
export class WormArt {
  private constructor(private image: ImageBitmap) {}
  static async load(): Promise<WormArt | null> {
    try {
      const response = await fetch(url); if (!response.ok) throw Error(String(response.status));
      return new WormArt(await createImageBitmap(await response.blob()));
    } catch (error) { console.warn('HD sandworm unavailable, using original sprites:', error); return null; }
  }
  private frame(ctx: CanvasRenderingContext2D, frame: number, x: number, y: number, size: number, alpha = 1): void {
    const w = this.image.width / 2, h = this.image.height / 2;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha *= alpha;
    ctx.drawImage(this.image, frame % 2 * w, Math.floor(frame / 2) * h, w, h, x - size / 2, y - size * .4, size, size * .8);
    ctx.restore();
  }
  draw(ctx: CanvasRenderingContext2D, unit: Unit, tick: number): boolean {
    if (unit.type !== 25) return false;
    this.frame(ctx, 0, unit.x, unit.y, 31 + Math.sin(tick / 13) * .7, .76);
    return true;
  }
  swallow(ctx: CanvasRenderingContext2D, x: number, y: number, age: number): void {
    const sequence = [1, 2, 3, 3, 2, 1];
    const phase = Math.min(sequence.length - 1, Math.max(0, age / 3));
    const current = Math.floor(phase), blend = phase - current;
    this.frame(ctx, sequence[current], x, y, 58);
    if (blend > 0 && current < sequence.length - 1) this.frame(ctx, sequence[current + 1], x, y, 58, blend);
  }
}
