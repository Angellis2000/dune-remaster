// Поиск сопел у готовых моделей кораблей (gfx/ship-assets.ts) — без DOM, проверяется в Node.
import type { Vec3 } from "./ship-models.ts";

/**
 * Сопла по геометрии: вершины у самой кормы (z не дальше 0,6 от задней точки), сгруппированные по клеткам 1,2 × 1,2
 * в плоскости XY; берутся до 4 самых крупных скоплений (двигательные блоки), радиус — по их размеру.
 */
export function findNozzles(positions: ArrayLike<number>, max = 4): { at: Vec3; radius: number }[] {
  let minZ = Infinity;
  for (let i = 2; i < positions.length; i += 3) minZ = Math.min(minZ, positions[i]);
  const cells = new Map<string, { x: number; y: number; z: number; n: number; x0: number; x1: number; y0: number; y1: number }>();
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (z > minZ + 0.6) continue;
    const key = `${Math.round(x / 1.2)}:${Math.round(y / 1.2)}`;
    const c = cells.get(key) ?? { x: 0, y: 0, z: Infinity, n: 0, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    c.x += x; c.y += y; c.z = Math.min(c.z, z); c.n++;
    c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y);
    cells.set(key, c);
  }
  return [...cells.values()].filter((c) => c.n >= 12).sort((a, b) => b.n - a.n).slice(0, max).map((c) => ({
    at: [c.x / c.n, c.y / c.n, c.z] as Vec3,
    radius: Math.max(0.2, Math.min(1.0, Math.min(c.x1 - c.x0, c.y1 - c.y0) * 0.45)),
  }));
}
