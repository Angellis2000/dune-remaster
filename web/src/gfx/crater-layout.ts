/** Stable visual randomness. Never consumes the lockstep simulation RNG. */
export function craterLayout(cell: number, stage: number): { x: number; y: number; size: number; angle: number; alpha: number }[] {
  let seed = Math.imul(cell + 1, 0x45d9f3b) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const count = 1 + Math.floor(random() * 3);
  return Array.from({ length: count }, (_, i) => {
    const size = (i === 0 ? .32 : .12) + random() * (i === 0 ? .34 : .2) + Math.min(9, stage) * .007;
    // Keep the entire rim inside its cell; no cut borders or tile seams.
    const margin = size * .5;
    return { x: margin + random() * (1 - size), y: margin + random() * (1 - size), size,
      angle: random() * Math.PI * 2, alpha: .62 + random() * .32 };
  });
}
