const patches = new WeakMap<object, Map<string, HTMLCanvasElement>>();

/** Neutral body stays fixed. Only small feathered face patches change, avoiding atlas pose jitter. */
export function drawMentatPortrait(ctx: CanvasRenderingContext2D, image: CanvasImageSource & { width: number; height: number },
  house: number, offset: number, mouth: number, blink: boolean): void {
  const sw = image.width / 2, sh = image.height / 2;
  const x = offset, y = 74, w = 145, h = 150;
  const draw = (frame: number) => ctx.drawImage(image, frame % 2 * sw, Math.floor(frame / 2) * sh, sw, sh, x, y, w, h);
  draw(0);
  // Locations in the registered portrait sheets, normalized inside one cell.
  const face = house === 2 ? { x: .39, eyes: .34, mouth: .505 } : house === 0 ? { x: .54, eyes: .285, mouth: .45 } : { x: .51, eyes: .315, mouth: .48 };
  const patch = (frame: number, cy: number, rx: number, ry: number) => {
    let cache = patches.get(image); if (!cache) { cache = new Map(); patches.set(image, cache); }
    const key = `${house}:${frame}:${cy}`;
    let cell = cache.get(key);
    if (!cell) {
      cell = document.createElement('canvas'); cell.width = 192; cell.height = 128;
      const g = cell.getContext('2d')!;
      g.drawImage(image, (frame % 2 + face.x - rx) * sw, (Math.floor(frame / 2) + cy - ry) * sh,
        rx * 2 * sw, ry * 2 * sh, 0, 0, 192, 128);
      g.globalCompositeOperation = 'destination-in'; g.translate(96, 64); g.scale(96, 64);
      const fade = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      fade.addColorStop(0, '#fff'); fade.addColorStop(.55, '#fff'); fade.addColorStop(1, '#fff0');
      g.fillStyle = fade; g.fillRect(-1, -1, 2, 2); cache.set(key, cell);
    }
    ctx.drawImage(cell, x + w * (face.x - rx), y + h * (cy - ry), w * rx * 2, h * ry * 2);
  };
  if (mouth !== 0) patch(mouth > 2 ? 3 : 1, face.mouth, .105, .065);
  if (blink) patch(2, face.eyes, .16, .05);
}
