/**
 * PSG SN76489 Mega Drive: 3 тоновых канала и шум, громкость по 2 дБ, такт 3 579 545 Гц / 16.
 * Шум — 16-битный регистр, белый шум с отводами 0 и 3 (вариант Sega).
 */
const VOLUME = Array.from({ length: 16 }, (_, i) => (i === 15 ? 0 : Math.pow(10, (-2 * i) / 20)));

export class PSG {
  private tone = [0, 0, 0, 0];
  private vol = [15, 15, 15, 15];
  private counter = [0, 0, 0, 0];
  private out = [1, 1, 1, 1];
  private latch = 0;
  private lfsr = 0x8000;
  private noiseMode = 0;
  /** доля такта PSG на один отсчёт */
  private acc = 0;

  write(value: number): void {
    if (value & 0x80) {
      this.latch = (value >> 4) & 7;
      const ch = this.latch >> 1;
      if (this.latch & 1) this.vol[ch] = value & 15;
      else if (ch === 3) {
        this.noiseMode = value & 7;
        this.lfsr = 0x8000;
      } else this.tone[ch] = (this.tone[ch] & 0x3f0) | (value & 15);
    } else {
      const ch = this.latch >> 1;
      if (this.latch & 1) this.vol[ch] = value & 15;
      else if (ch === 3) {
        this.noiseMode = value & 7;
        this.lfsr = 0x8000;
      } else this.tone[ch] = (this.tone[ch] & 15) | ((value & 0x3f) << 4);
    }
  }

  /** Отсчёт при частоте rate; результат около −1…1. */
  sample(rate: number): number {
    const ticks = 3579545 / 16 / rate;
    this.acc += ticks;
    let n = Math.floor(this.acc);
    this.acc -= n;
    while (n-- > 0) {
      for (let c = 0; c < 3; c++) {
        if (--this.counter[c] <= 0) {
          this.counter[c] = this.tone[c] || 1;
          this.out[c] = -this.out[c];
        }
      }
      if (--this.counter[3] <= 0) {
        const r = this.noiseMode & 3;
        this.counter[3] = r === 3 ? this.tone[2] || 1 : 0x10 << r;
        const fb = this.noiseMode & 4 ? ((this.lfsr ^ (this.lfsr >> 3)) & 1) : this.lfsr & 1;
        this.lfsr = (this.lfsr >> 1) | (fb << 15);
        this.out[3] = this.lfsr & 1 ? 1 : -1;
      }
    }
    let s = 0;
    for (let c = 0; c < 4; c++) s += this.out[c] * VOLUME[this.vol[c]];
    return s / 4;
  }
}
