/**
 * Туман войны с мягкими кривыми краями, как в RTS (StarCraft, C&C Remastered): что открыто — решает механика MD
 * (клетки, раскрытие восьмиугольником Tile_GetDistance), а рисуется не по клеткам. Маска скрытых клеток
 * размывается по Гауссу (σ ≈ 0,6 клетки) — углы и ступеньки сглаживаются в дуги; непрозрачность — мягкая ступенька
 * по размытому полю, сдвинутая внутрь тумана, чтобы открытые клетки оставались чистыми; к полю на краю добавлен
 * фрактальный шум — край неровный, как у облака, а не прямой. Сплошная пелена внутри скрывает всё (объекты в
 * тумане и так не рисуются). Текстура 256×256 на карту 2048×2048 мировых точек, рисуется со сглаживанием;
 * пересобирается только при смене открытых клеток (размытие раздельное — около 2 млн операций).
 */
const N = 256, TEXEL = 2048 / N, PER_TILE = 32 / TEXEL;
/** σ размытия в текселях (0,6 клетки) и радиус ядра */
const SIGMA = 0.6 * PER_TILE, REACH = Math.ceil(SIGMA * 3);
/** ступенька непрозрачности по полю и сила шума края */
const LOW = 0.42, HIGH = 0.78, NOISE = 0.16;

const kernel = (() => {
  const k = new Float32Array(2 * REACH + 1);
  let sum = 0;
  for (let i = -REACH; i <= REACH; i++) sum += k[i + REACH] = Math.exp(-(i * i) / (2 * SIGMA * SIGMA));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  return k;
})();

/** Фрактальный шум значений (2 октавы), детерминированный — край у всех одинаковый. */
const noise = (() => {
  const hash = (x: number, y: number) => {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) & 0xffff) / 0xffff;
  };
  const octave = (x: number, y: number, cell: number) => {
    const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const out = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) out[y * N + x] = (octave(x, y, 6) * 0.65 + octave(x, y, 2.5) * 0.35) * 2 - 1;
  return out;
})();

export class FogOfWar {
  private canvas = document.createElement('canvas');
  private signature = '';
  private mask = new Float32Array(N * N);
  private tmp = new Float32Array(N * N);
  draw(ctx: CanvasRenderingContext2D, overlay: ArrayLike<number>, veiled: number, ox: number, oy: number, zoom: number): void {
    if (!veiled) return;
    let signature = ''; for (let p = 0; p < 4096; p++) signature += overlay[p] === veiled ? '1' : '0';
    if (signature !== this.signature) { this.signature = signature; this.rebuild(signature); }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.canvas, -ox, -oy, 2048 * zoom, 2048 * zoom); ctx.restore();
  }

  private rebuild(hidden: string): void {
    this.canvas.width = this.canvas.height = N;
    const { mask, tmp } = this;
    for (let y = 0; y < N; y++) {
      const ty = Math.floor(y / PER_TILE) * 64;
      for (let x = 0; x < N; x++) mask[y * N + x] = hidden.charCodeAt(ty + Math.floor(x / PER_TILE)) === 49 ? 1 : 0;
    }
    // раздельное размытие по Гауссу; за краем карты — значение крайнего текселя
    const clamp = (v: number) => (v < 0 ? 0 : v >= N ? N - 1 : v);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let i = -REACH; i <= REACH; i++) s += mask[y * N + clamp(x + i)] * kernel[i + REACH];
      tmp[y * N + x] = s;
    }
    const g = this.canvas.getContext('2d')!, image = g.createImageData(N, N), data = image.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let i = -REACH; i <= REACH; i++) s += tmp[clamp(y + i) * N + x] * kernel[i + REACH];
      const p = y * N + x;
      // шум только на краю: внутри сплошной пелены и в открытом поле его нет
      const edge = s * (1 - s) * 4;
      const t = Math.min(1, Math.max(0, (s + noise[p] * NOISE * edge - LOW) / (HIGH - LOW)));
      const mist = noise[(p * 7) % (N * N)];
      data[p * 4] = 18 + mist * 3; data[p * 4 + 1] = 26 + mist * 4; data[p * 4 + 2] = 32 + mist * 5;
      data[p * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
    }
    g.putImageData(image, 0, 0);
  }
}
