/**
 * Точки высадки сетевого матча — одни и те же у лобби (выбор точки, ui/network.ts) и у движка (Game.loadNetwork),
 * поэтому считаются только по клеткам карты ROM, без зерна и состояния игры. Точка — левая верхняя клетка двора 2×2:
 * все четыре клетки на скале и вокруг есть место под базу. Первая — ближняя к левому верхнему углу, дальше каждый раз
 * самая дальняя от уже выбранных (команды оказываются как можно дальше друг от друга).
 */
import { MAP_INFOS } from "./core.ts";
import { iconLandscape, landscapeInfo } from "./tables.ts";

export const NET_SPAWN_POINTS = 8;

/** ground — номера иконок 64×64 (как G.map[p].groundTileID), scale — 0 для 64×64, 1 для 32×32. */
export function netSpawnPoints(ground: ArrayLike<number>, scale: number, count = NET_SPAWN_POINTS): { x: number; y: number }[] {
  const mi = MAP_INFOS[scale];
  const rock = (x: number, y: number) => {
    if (x < mi.minX || y < mi.minY || x >= mi.minX + mi.sizeX || y >= mi.minY + mi.sizeY) return false;
    const lst = iconLandscape[ground[(y << 6) | x] & 0x1ff];
    return lst >= 0 && landscapeInfo[lst].isValidForStructure !== 0;
  };
  const pick = (need: number) => {
    const out: { x: number; y: number }[] = [];
    for (let y = mi.minY + 2; y < mi.minY + mi.sizeY - 4; y++) {
      for (let x = mi.minX + 2; x < mi.minX + mi.sizeX - 4; x++) {
        if (!rock(x, y) || !rock(x + 1, y) || !rock(x, y + 1) || !rock(x + 1, y + 1)) continue;
        let room = 0;
        for (let j = -2; j <= 4; j++) for (let i = -2; i <= 4; i++) if (rock(x + i, y + j)) room++;
        if (room >= need) out.push({ x, y });
      }
    }
    return out;
  };
  let cands = pick(28);
  if (cands.length < count) cands = pick(10);
  if (cands.length < count) cands = pick(4);
  const d2 = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const chosen: { x: number; y: number }[] = [];
  if (cands.length) {
    const corner = { x: mi.minX, y: mi.minY };
    let first = cands[0];
    for (const c of cands) if (d2(c, corner) < d2(first, corner)) first = c;
    chosen.push(first);
  }
  while (chosen.length < count && chosen.length < cands.length) {
    let best = cands[0], bestDistance = -1;
    for (const c of cands) {
      let nearest = Infinity;
      for (const s of chosen) nearest = Math.min(nearest, d2(c, s));
      if (nearest > bestDistance) { bestDistance = nearest; best = c; }
    }
    if (bestDistance <= 0) break;
    chosen.push(best);
  }
  return chosen;
}
