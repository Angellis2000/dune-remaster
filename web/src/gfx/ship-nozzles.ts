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

export type LightKind = "steady" | "beacon" | "strobe";
export interface ShipLight { at: Vec3; color: Vec3; kind: LightKind; phase: number }

/**
 * Огни корабля по крайним точкам модели (цвета — по просьбе владельца): бортовые — красные, ровные; маячки сверху и
 * снизу — синие, пульсируют; носовой — белый стробоскоп; в кормовых углах — белые стробоскопы (двойная вспышка).
 * Каждый огонь чуть вынесен наружу, чтобы не тонуть в обшивке.
 */
export function findLights(positions: ArrayLike<number>): ShipLight[] {
  const n = positions.length / 3;
  const v = (i: number): Vec3 => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
  /** лучшая вершина по score (больше — лучше) */
  const best = (score: (p: Vec3) => number): Vec3 => {
    let b = v(0), bs = -Infinity;
    for (let i = 0; i < n; i++) { const p = v(i), s = score(p); if (s > bs) { bs = s; b = p; } }
    return b;
  };
  let maxY = -Infinity, minY = Infinity, minZ = Infinity;
  for (let i = 0; i < n; i++) { const p = v(i); maxY = Math.max(maxY, p[1]); minY = Math.min(minY, p[1]); minZ = Math.min(minZ, p[2]); }
  const out = (p: Vec3, d: Vec3): Vec3 => [p[0] + d[0] * 0.07, p[1] + d[1] * 0.07, p[2] + d[2] * 0.07];
  const right = best((p) => p[0] - Math.abs(p[1]) * 0.05), left = best((p) => -p[0] - Math.abs(p[1]) * 0.05);
  const top = best((p) => (p[1] > maxY - 0.08 ? 10 - Math.abs(p[0]) - Math.abs(p[2]) * 0.1 : -100 + p[1]));
  const bottom = best((p) => (p[1] < minY + 0.08 ? 10 - Math.abs(p[0]) - Math.abs(p[2]) * 0.1 : -100 - p[1]));
  const nose = best((p) => p[2] - Math.abs(p[0]) * 0.3 - Math.abs(p[1]) * 0.3);
  const rearR = best((p) => (p[2] < minZ + 0.7 ? p[0] : -100));
  const rearL = best((p) => (p[2] < minZ + 0.7 ? -p[0] : -100));
  const white: Vec3 = [1, 0.97, 0.9], red: Vec3 = [1, 0.12, 0.08], blue: Vec3 = [0.2, 0.45, 1];
  return [
    { at: out(left, [-1, 0, 0]), color: red, kind: "steady", phase: 0 },
    { at: out(right, [1, 0, 0]), color: red, kind: "steady", phase: 0.4 },
    { at: out(top, [0, 1, 0]), color: blue, kind: "beacon", phase: 0 },
    { at: out(bottom, [0, -1, 0]), color: blue, kind: "beacon", phase: 3.1 },
    { at: out(nose, [0, 0, 1]), color: white, kind: "strobe", phase: 0 },
    { at: out(rearL, [-0.5, 0, -1]), color: white, kind: "strobe", phase: 0.5 },
    { at: out(rearR, [0.5, 0, -1]), color: white, kind: "strobe", phase: 0.5 },
  ];
}
