export type ShipPose = { x: number; y: number; w: number; h: number };

/** Presentation only: the original ROM still controls cues and flight duration. */
export class ShipFlight {
  private static framesByImage = new WeakMap<ImageBitmap, HTMLCanvasElement[][]>();
  private frames: HTMLCanvasElement[][] | null = null;
  private image: ImageBitmap | null = null;
  private composite = document.createElement('canvas');

  constructor(private poses: ShipPose[], private house: number, private firstFrame: number) {}

  static preload(image: ImageBitmap): void {
    new ShipFlight([], 0, 0).prepare(image);
  }

  private prepare(image: ImageBitmap): HTMLCanvasElement[][] {
    if (this.image === image && this.frames) return this.frames;
    const cached = ShipFlight.framesByImage.get(image);
    if (cached) { this.image = image; return this.frames = cached; }
    const atlas = document.createElement('canvas');
    atlas.width = image.width; atlas.height = image.height;
    const ctx = atlas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, atlas.width, atlas.height).data;
    this.image = image;
    this.frames = Array.from({ length: 3 }, (_, row) => Array.from({ length: 5 }, (_, col) => {
      const x0 = Math.round(col * atlas.width / 5), x1 = Math.round((col + 1) * atlas.width / 5);
      const y0 = Math.round(row * atlas.height / 3), y1 = Math.round((row + 1) * atlas.height / 3);
      let left = x1, right = x0, top = y1, bottom = y0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (pixels[(y * atlas.width + x) * 4 + 3] > 32) {
          left = Math.min(left, x); right = Math.max(right, x + 1);
          top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
        }
      }
      // Trim alpha padding independently, keeping every view centered on the hull.
      left = Math.max(x0, left - 2); right = Math.min(x1, right + 2);
      top = Math.max(y0, top - 2); bottom = Math.min(y1, bottom + 2);
      const frame = document.createElement('canvas');
      frame.width = Math.max(1, right - left); frame.height = Math.max(1, bottom - top);
      frame.getContext('2d')!.drawImage(image, left, top, frame.width, frame.height, 0, 0, frame.width, frame.height);
      return frame;
    }));
    ShipFlight.framesByImage.set(image, this.frames);
    return this.frames;
  }

  pose(frame: number): ShipPose & { progress: number; angle: number; opacity: number } {
    const last = this.poses.length - 1;
    const t = Math.max(0, Math.min(last, (frame - this.firstFrame) / 3));
    const index = Math.floor(t), f = t - index;
    const center = (j: number, axis: 'x' | 'y') => {
      const p = this.poses[Math.max(0, Math.min(last, j))];
      return p[axis] + (axis === 'x' ? p.w : p.h) / 2;
    };
    // Uniform cubic B-spline removes the old three-frame holds and tile-size steps.
    const b = [(1-f)**3/6, (3*f**3-6*f*f+4)/6, (-3*f**3+3*f*f+3*f+1)/6, f**3/6];
    let x = 0, y = 0;
    for (let j = 0; j < 4; j++) { x += center(index+j-1, 'x') * b[j]; y += center(index+j-1, 'y') * b[j]; }
    const progress = Math.max(0, Math.min(1, (frame-this.firstFrame)/(this.poses.length*3-1)));
    const smooth = progress * progress * (3-2*progress);
    const w = this.poses[0].w * (Math.max(6, this.poses[last].w * .55) / this.poses[0].w) ** smooth;
    const angle = this.house === 2 ? 4 - 2*smooth : 2*smooth;
    const opacity = Math.min(1, (1-progress)*10);
    return { x, y, w, h: w*.56, progress, angle, opacity };
  }

  draw(ctx: CanvasRenderingContext2D, image: ImageBitmap, frame: number): void {
    const views = this.prepare(image)[this.house];
    const p = this.pose(frame), a = Math.floor(p.angle), mix = p.angle-a;
    // Blend in a separate surface: source-over on the scene would darken the first pose.
    const canvas = this.composite;
    if (canvas.width !== 512) { canvas.width = 512; canvas.height = 288; }
    const c = canvas.getContext('2d')!;
    c.clearRect(0,0,canvas.width,canvas.height);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1-mix;
    c.drawImage(views[a],0,0,512,288);
    if (mix > 0) {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = mix;
      c.drawImage(views[Math.min(4,a+1)],0,0,512,288);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalAlpha *= p.opacity;
    ctx.translate(p.x,p.y);
    ctx.rotate(Math.sin(p.progress*Math.PI) * (this.house === 2 ? -.035 : .035));
    ctx.drawImage(canvas,-p.w/2,-p.h/2,p.w,p.h);
    ctx.restore();
  }
}
