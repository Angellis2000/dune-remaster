/**
 * Карта 64x64 клеток. Поля повторяют структуру Tile из движка Westwood
 * (OpenDUNE src/map.h), которую MD-версия хранит в RAM по адресу $FF7D9C.
 */
import { MAP_SIZE, type MissionMap } from "../rom/dune.ts";

export class GameMap {
  /** номер иконки, которой нарисована клетка (groundTileID, 9 бит) */
  readonly ground = new Uint16Array(MAP_SIZE * MAP_SIZE);
  /** номер иконки поверх (overlayTileID: туман, следы, обломки) */
  readonly overlay = new Uint16Array(MAP_SIZE * MAP_SIZE);
  readonly bounds: { x: number; y: number; w: number; h: number };
  readonly index: number;

  constructor(src: MissionMap) {
    this.ground.set(src.ground);
    this.bounds = { ...src.bounds };
    this.index = src.index;
  }

  static pack(x: number, y: number): number {
    return (y << 6) | x;
  }

  inBounds(x: number, y: number): boolean {
    const b = this.bounds;
    return x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;
  }
}
