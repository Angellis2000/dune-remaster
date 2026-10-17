/**
 * Курсоры карты из ROM. Каждый — левая половина 16x32 (2 столбца по 4 тайла, тайлы идут
 * по столбцам, как в спрайтах MD); правая половина — её зеркало, как делает игра.
 */
import { ROM, type DuneRom } from "../rom/dune.ts";

export type CursorKind = "select" | "move" | "attack" | "confirm";

const OFFSETS: Record<CursorKind, number> = {
  attack: ROM.cursorTiles + 0x000,
  move: ROM.cursorTiles + 0x100,
  select: ROM.cursorTiles + 0x200,
  confirm: ROM.cursorTiles + 0x300,
};

export function buildCursors(rom: DuneRom): Record<CursorKind, HTMLCanvasElement> {
  const pal = rom.gamePalette();
  const out = {} as Record<CursorKind, HTMLCanvasElement>;
  for (const kind of Object.keys(OFFSETS) as CursorKind[]) {
    const base = OFFSETS[kind];
    const px = new Uint32Array(32 * 32);
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < 4; row++) {
        const t = base + (col * 4 + row) * 32;
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const byte = rom.bytes[t + y * 4 + (x >> 1)];
            const c = x & 1 ? byte & 15 : byte >> 4;
            if (!c) continue;
            const v = pal[ROM.cursorPaletteLine * 16 + c];
            const X = col * 8 + x;
            const Y = row * 8 + y;
            px[Y * 32 + X] = v;
            px[Y * 32 + 31 - X] = v;
          }
        }
      }
    }
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(px.buffer), 32, 32), 0, 0);
    out[kind] = c;
  }
  return out;
}
