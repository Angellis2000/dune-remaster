/**
 * Типы 3D-кораблей заставки. Сами корабли — готовые матки из пака Quaternius (CC0) в gfx/ship-assets.ts
 * (владелец 2026-10-20: «свои сделанные отбрось, скачанные доделай»); рисует gfx/ship-renderer.ts.
 * Оси: +Z — нос, +Y — верх, +X — правый борт; длина корабля 11 единиц.
 */

export type Vec3 = [number, number, number];

/** Деталь из плоских треугольников со своим цветом (для простых моделей без текстуры). */
export interface ShipPart {
  name: string;
  /** треугольники подряд: по 9 чисел (3 вершины × xyz) */
  positions: number[];
  /** цвет детали, 0…1 */
  color: Vec3;
  /** свечение 0…1: сопла, огни, стёкла */
  emissive: number;
  /** блеск 0…1 */
  gloss: number;
}

export interface ShipModel {
  id: string;
  name: string;
  house: number;
  /** детали без текстуры (у маток пусто — вся геометрия в mesh) */
  parts: ShipPart[];
  /** сопла для пламени: центр, радиус, цвет */
  nozzles: { at: Vec3; radius: number; color: Vec3 }[];
  /**
   * Модель с текстурой: треугольники подряд и UV к каждой вершине. Рендер берёт цвет из текстуры, а насыщенную
   * «краску» перекрашивает в paint (цвет дома); металл не трогает.
   */
  mesh?: { positions: ArrayLike<number>; uvs: ArrayLike<number>; texture: TexImageSource; paint?: Vec3 };
}
