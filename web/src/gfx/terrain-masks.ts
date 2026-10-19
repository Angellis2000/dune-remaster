/** Original ROM pixel masks, independent of the HD artwork and camera. */
export interface TerrainMask { land: Uint8Array; spice: Uint8Array }

export function terrainMask(kind: number, pixels: Uint8ClampedArray): TerrainMask {
  const land = new Uint8Array(32 * 32 * 4);
  const spice = new Uint8Array(32 * 32 * 4);
  for (let p = 0; p < 32 * 32; p++) {
    const k = p * 4, r = pixels[k], g = pixels[k + 1];
    const rock = kind === 4 || kind === 6 || kind === 7 || kind === 13 ||
      ((kind === 1 || kind === 5) && ((r === 116 && g === 87) || (r === 87 && g === 52)));
    land[k] = rock ? 255 : 0;
    land[k + 1] = kind === 2 || kind === 3 ? Math.max(35, Math.min(210, 128 + (r - 172) * 1.1)) : 128;
    land[k + 2] = kind === 6 || kind === 7 ? Math.max(20, Math.min(220, 128 + (r - 116) * 1.1)) : 128;
    // The original black/red pockets are deep crater interiors, not just dark rock.
    land[k + 3] = kind === 6 || kind === 7 ? (r === 0 ? 255 : r === 52 && g === 0 ? 170 : r === 87 && g === 52 ? 45 : 0) : 0;
    const mineral = (kind === 8 || kind === 9) && ((r === 172 && g === 52) || (r === 206 && g === 116));
    spice[k] = mineral ? 255 : 0;
    spice[k + 1] = mineral && kind === 9 ? 255 : 0;
    spice[k + 3] = 255;
  }
  return { land, spice };
}

/** Stable visual variety, never consumes the simulation's random generator. */
export function visualHash(x: number, y: number): number {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}
