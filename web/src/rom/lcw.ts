/**
 * Распаковщик Westwood LCW (Format80). В ROM он лежит по адресу $000C32, эталон на Python — tools/lcw.py
 * (его вывод сверен с игрой в эмуляторе). Двухбайтовые числа внутри потока — little-endian, как в PC-версии.
 */

export class LcwError extends Error {}

export interface LcwResult {
  data: Uint8Array;
  /** сколько байт потока прочитано, включая завершающий 0x80 */
  consumed: number;
}

/** Распаковать поток с адреса `start`. Мусор даёт LcwError, а не зависание. */
export function lcwDecompress(src: Uint8Array, start = 0, maxOut = 0x10000): LcwResult {
  const out = new Uint8Array(maxOut);
  let o = 0;
  let i = start;
  for (;;) {
    if (i >= src.length) throw new LcwError("поток вышел за конец ROM");
    const cmd = src[i++];
    if ((cmd & 0x80) === 0) {
      // 0cccpppp pppppppp — копия из уже распакованного, относительно конца
      const count = (cmd >> 4) + 3;
      const rel = ((cmd & 0x0f) << 8) | src[i++];
      let from = o - rel;
      if (from < 0 || rel === 0) throw new LcwError("плохое относительное смещение");
      if (o + count > maxOut) throw new LcwError("слишком длинный выход");
      for (let k = 0; k < count; k++) out[o++] = out[from++];
    } else if ((cmd & 0x40) === 0) {
      // 10cccccc — литералы; 0x80 — конец потока
      if (cmd === 0x80) return { data: out.slice(0, o), consumed: i - start };
      const count = cmd & 0x3f;
      if (o + count > maxOut) throw new LcwError("слишком длинный выход");
      out.set(src.subarray(i, i + count), o);
      o += count;
      i += count;
    } else if (cmd === 0xfe) {
      // 0xFE cccc vv — заливка
      const count = src[i] | (src[i + 1] << 8);
      const value = src[i + 2];
      i += 3;
      if (o + count > maxOut) throw new LcwError("слишком длинный выход");
      out.fill(value, o, o + count);
      o += count;
    } else {
      // 0xFF cccc pppp и 11cccccc pppp — копия по абсолютному смещению от начала выхода
      let count: number;
      let from: number;
      if (cmd === 0xff) {
        count = src[i] | (src[i + 1] << 8);
        from = src[i + 2] | (src[i + 3] << 8);
        i += 4;
      } else {
        count = (cmd & 0x3f) + 3;
        from = src[i] | (src[i + 1] << 8);
        i += 2;
      }
      if (count && from >= o) throw new LcwError("абсолютное смещение за пределами");
      if (o + count > maxOut) throw new LcwError("слишком длинный выход");
      for (let k = 0; k < count; k++) out[o++] = out[from++];
    }
  }
}
