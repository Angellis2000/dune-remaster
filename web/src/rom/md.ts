/**
 * Мелочи Mega Drive: чтение big-endian, цвета CRAM, вывод тайла 8×8 (4 бита на пиксель).
 */

/** Уровни яркости канала VDP (3 бита на канал), замерены по Genesis Plus GX. */
const CRAM_LEVELS = [0, 52, 87, 116, 144, 172, 206, 255];

/** Слово CRAM (----bbb-ggg-rrr-) → RGBA в порядке байтов ImageData (little-endian Uint32). */
export function cramToRGBA(word: number, alpha = 255): number {
  const r = CRAM_LEVELS[(word >> 1) & 7];
  const g = CRAM_LEVELS[(word >> 5) & 7];
  const b = CRAM_LEVELS[(word >> 9) & 7];
  return ((alpha << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export function readU16(b: Uint8Array, at: number): number {
  return (b[at] << 8) | b[at + 1];
}

export function readU32(b: Uint8Array, at: number): number {
  return ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
}

export interface TileWord {
  tile: number;
  pal: number;
  hflip: boolean;
  vflip: boolean;
  prio: boolean;
}

/** Слово плоскости или спрайта VDP: p ll v h tttttttttt t. */
export function decodeTileWord(word: number): TileWord {
  return {
    tile: word & 0x7ff,
    pal: (word >> 13) & 3,
    hflip: (word & 0x800) !== 0,
    vflip: (word & 0x1000) !== 0,
    prio: (word & 0x8000) !== 0,
  };
}

/**
 * Нарисовать тайл из `vram` по слову плоскости в `out` (ширина строки `stride`) с точки (x, y).
 * `palette` — 64 цвета RGBA (4 строки CRAM). Цвет 0 прозрачный.
 */
export function blitTile(
  vram: Uint8Array,
  word: number,
  palette: Uint32Array,
  out: Uint32Array,
  stride: number,
  x: number,
  y: number,
): void {
  const { tile, pal, hflip, vflip } = decodeTileWord(word);
  const base = tile * 32;
  for (let row = 0; row < 8; row++) {
    const srcRow = vflip ? 7 - row : row;
    const line = base + srcRow * 4;
    for (let col = 0; col < 8; col++) {
      const srcCol = hflip ? 7 - col : col;
      const byte = vram[line + (srcCol >> 1)];
      const c = srcCol & 1 ? byte & 15 : byte >> 4;
      if (c) out[(y + row) * stride + x + col] = palette[pal * 16 + c];
    }
  }
}
