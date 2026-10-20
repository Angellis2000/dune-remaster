/**
 * Готовые 3D-корабли заставки из пака Quaternius «Ultimate Spaceships» (CC0, opengameart.org/content/lowpoly-spaceships-pack),
 * перекрашенные по домам. Файлы — web/src/gfx/assets/ships/<id>.json (треугольники и UV, нос на +Z, длина 11) и <id>.png
 * (текстура пака); их делает tools/sim/ship_import.ts. Рисует тот же gfx/ship-renderer.ts, что и самодельные модели.
 */
import type { ShipModel, Vec3 } from "./ship-models.ts";
import { findNozzles } from "./ship-nozzles.ts";
import atreidesData from "./assets/ships/mothership-atreides.json?url";
import atreidesTexture from "./assets/ships/mothership-atreides.png?url";
import harkonnenData from "./assets/ships/mothership-harkonnen.json?url";
import harkonnenTexture from "./assets/ships/mothership-harkonnen.png?url";
import ordosData from "./assets/ships/mothership-ordos.json?url";
import ordosTexture from "./assets/ships/mothership-ordos.png?url";

const hex = (h: string): Vec3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

export interface ImportedShipSpec {
  id: string;
  /** адреса файлов (json с треугольниками и текстура) */
  data: string;
  texture: string;
  name: string;
  house: number;
  /** цвет «краски» корпуса — цвет дома */
  paint: string;
  /** цвет пламени */
  flame: string;
  /** сопла вручную (иначе — найдутся по задней кромке модели) */
  nozzles?: { at: Vec3; radius: number }[];
}

/**
 * Корабли-матки заставки (владелец: «не истребители, а большие корабли-матки»), три разных силуэта:
 * Атрейдесы — крейсер Insurgent (вытянутый, светлый), Харконнены — авианосец Imperial (длинный тяжёлый корпус с куполом),
 * Ордосы — дисковая матка Pancake. Краска текстуры перекрашивается в цвет дома, пламя — в его цвет.
 */
export const MOTHERSHIPS: ImportedShipSpec[] = [
  { id: "mothership-atreides", data: atreidesData, texture: atreidesTexture, name: "Атрейдесы — крейсер-матка", house: 1, paint: "#2f6fe0", flame: "#7fdcff",
    nozzles: [{ at: [0.8, -0.2, -5.5], radius: 0.45 }, { at: [-0.8, -0.2, -5.5], radius: 0.45 }, { at: [2.15, -0.35, -5.05], radius: 0.35 }, { at: [-2.15, -0.35, -5.05], radius: 0.35 }] },
  { id: "mothership-harkonnen", data: harkonnenData, texture: harkonnenTexture, name: "Харконнены — авианосец", house: 0, paint: "#c01818", flame: "#ff5a1f",
    nozzles: [{ at: [1.85, -0.2, -5.55], radius: 0.5 }, { at: [-1.85, -0.2, -5.55], radius: 0.5 }, { at: [0.75, -0.25, -5.05], radius: 0.3 }, { at: [-0.75, -0.25, -5.05], radius: 0.3 }] },
  { id: "mothership-ordos", data: ordosData, texture: ordosTexture, name: "Ордосы — дисковая матка", house: 2, paint: "#2fa04e", flame: "#c8ff5a",
    nozzles: [{ at: [0, -0.45, -4.35], radius: 0.3 }, { at: [0, 0.5, -3.85], radius: 0.3 }, { at: [0.65, 0.15, -3.6], radius: 0.28 }, { at: [-0.65, 0.15, -3.6], radius: 0.28 }] },
];

/** Все три матки, по домам (Атрейдесы, Харконнены, Ордосы). */
export function loadMotherships(): Promise<ShipModel[]> {
  return Promise.all(MOTHERSHIPS.map(loadImportedShip));
}

/** Загрузить корабль (json + текстура) и раскрасить по дому. */
export async function loadImportedShip(spec: ImportedShipSpec): Promise<ShipModel> {
  const data = await (await fetch(spec.data)).json() as { positions: number[]; uvs: number[] };
  const image = new Image();
  image.src = spec.texture;
  await image.decode();
  const flame = hex(spec.flame);
  const nozzles = (spec.nozzles ?? findNozzles(data.positions)).map((n) => ({ ...n, color: flame }));
  return {
    id: spec.id, name: spec.name, house: spec.house, parts: [], nozzles,
    mesh: { positions: new Float32Array(data.positions), uvs: new Float32Array(data.uvs), texture: image, paint: hex(spec.paint) },
  };
}
