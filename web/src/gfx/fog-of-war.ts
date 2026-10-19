/**
 * Туман войны «каплями»: каждая скрытая клетка даёт круглое пятно (радиус R), пятна складываются, и непрозрачность —
 * плавная ступенька по их сумме. Прямая граница идёт волной из полукругов по клеткам, углы скруглены, одиночная
 * открытая клетка внутри тумана — круглое окно. Внутри тумана сплошная пелена, объекты скрыты (их и так не рисуют).
 * Текстура 512×512 на карту 2048×2048 мировых точек; пересобирается только при смене открытых клеток.
 */
const N = 512, TEXEL = 2048 / N, R = 40, LOW = .5, HIGH = 1.2;

export class FogOfWar {
  private canvas = document.createElement('canvas');
  private signature = '';
  draw(ctx: CanvasRenderingContext2D, overlay: ArrayLike<number>, veiled: number, ox: number, oy: number, zoom: number): void {
    if (!veiled) return;
    let signature = ''; for (let p = 0; p < 4096; p++) signature += overlay[p] === veiled ? '1' : '0';
    if (signature !== this.signature) { this.signature = signature; this.rebuild(signature); }
    ctx.save(); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, -ox, -oy, 2048 * zoom, 2048 * zoom); ctx.restore();
  }

  private rebuild(hidden: string): void {
    this.canvas.width = this.canvas.height = N;
    const field = new Float32Array(N * N);
    const reach = Math.ceil(R / TEXEL);
    // ядро пятна: (1 − (d/R)²)², одно на все клетки
    const kernel = new Float32Array((2 * reach + 1) ** 2);
    for (let j = -reach; j <= reach; j++) for (let i = -reach; i <= reach; i++) {
      const q = Math.hypot(i * TEXEL, j * TEXEL) / R;
      kernel[(j + reach) * (2 * reach + 1) + i + reach] = q >= 1 ? 0 : (1 - q * q) ** 2;
    }
    const perTile = 32 / TEXEL;
    for (let p = 0; p < 4096; p++) {
      if (hidden[p] !== '1') continue;
      // центр клетки в текселях
      const cx = (p & 63) * perTile + perTile / 2 - .5, cy = (p >> 6) * perTile + perTile / 2 - .5;
      const x0 = Math.round(cx), y0 = Math.round(cy);
      for (let j = -reach; j <= reach; j++) {
        const y = y0 + j; if (y < 0 || y >= N) continue;
        for (let i = -reach; i <= reach; i++) {
          const x = x0 + i; if (x < 0 || x >= N) continue;
          field[y * N + x] += kernel[(j + reach) * (2 * reach + 1) + i + reach];
        }
      }
    }
    const g = this.canvas.getContext('2d')!, image = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const p = y * N + x, t = Math.min(1, Math.max(0, (field[p] - LOW) / (HIGH - LOW)));
      const mist = Math.sin(x * .043 + Math.sin(y * .027) * 2) * Math.sin(y * .035 + x * .014);
      image.data[p * 4] = 18 + mist * 2; image.data[p * 4 + 1] = 26 + mist * 3; image.data[p * 4 + 2] = 32 + mist * 4;
      image.data[p * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
    }
    g.putImageData(image, 0, 0);
  }
}
