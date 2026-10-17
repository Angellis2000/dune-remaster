/**
 * Мир миссии: карта, здания, юниты, дома. Загружается из сценария ROM.
 * Здания ставятся в карту иконками, как Structure_UpdateMap в движке Westwood:
 * иконки готового здания = группа[2*N .. 3*N), где N — число клеток раскладки
 * (первые два кадра группы — стройка).
 */
import { CELL_PX, type DuneRom } from "../rom/dune.ts";
import type { Scenario } from "../rom/scenario.ts";
import { GameMap } from "./map.ts";
import { IconGroup, LAYOUT_SIZE, LAYOUT_TILES, MAP_DIFF, STRUCTURE_INFO, StructureType, WALL_CONNECT } from "./tables.ts";

export interface Structure {
  id: number;
  type: number;
  house: number;
  hp: number; // 0..256 от полной
  x: number; // левая верхняя клетка
  y: number;
  w: number;
  h: number;
}

export interface Unit {
  id: number;
  type: number;
  house: number;
  hp: number;
  /** центр в мировых пикселях (клетка = 32) */
  x: number;
  y: number;
  orientation: number; // 0..255, 0 — север, по часовой
  /** ориентация башни (танки) */
  turret: number;
  action: number;
  /** цель движения (временная логика, пока не перенесена механика OpenDUNE) */
  target: { x: number; y: number } | null;
  anim: number;
}

export interface HouseState {
  id: number;
  credits: number;
  quota: number;
  human: boolean;
}

export class World {
  readonly map: GameMap;
  readonly structures: Structure[] = [];
  readonly units: Unit[] = [];
  readonly houses = new Map<number, HouseState>();
  readonly player: number;
  /** индекс здания на клетке, -1 — нет */
  readonly structureAt = new Int16Array(64 * 64).fill(-1);
  private wallBase: number;
  private slabIcon: number;

  constructor(
    private rom: DuneRom,
    readonly scenario: Scenario,
  ) {
    this.map = new GameMap(rom.missionMap(scenario.mapIndex));
    this.wallBase = rom.iconGroup(IconGroup.Walls)[0];
    this.slabIcon = rom.iconGroup(IconGroup.ConcreteSlab)[2];
    for (const h of scenario.houses) this.houses.set(h.id, { id: h.id, credits: h.credits, quota: h.quota, human: h.brain === "human" });
    this.player = scenario.houses.find((h) => h.brain === "human")?.id ?? 1;
    for (const s of scenario.structures) this.addStructure(s.type, s.house, s.x, s.y, s.hp);
    for (const s of this.structures) if (s.type === StructureType.Wall) this.connectWall(s.x, s.y, true);
    for (const u of scenario.units) {
      this.units.push({
        id: this.units.length,
        type: u.type,
        house: u.house,
        hp: u.hp,
        x: u.x * CELL_PX + CELL_PX / 2,
        y: u.y * CELL_PX + CELL_PX / 2,
        orientation: u.orientation & 0xff,
        turret: u.orientation & 0xff,
        action: u.action,
        target: null,
        anim: 0,
      });
    }
  }

  addStructure(type: number, house: number, x: number, y: number, hp = 256): void {
    const info = STRUCTURE_INFO[type];
    if (!info) return;
    const layout = LAYOUT_TILES[info.layout];
    const size = LAYOUT_SIZE[info.layout];
    const base = (y << 6) | x;
    // бетон — это не здание, а покрытие клеток
    if (type === StructureType.Slab1x1 || type === StructureType.Slab2x2) {
      for (const d of layout) this.map.ground[base + d] = this.slabIcon;
      return;
    }
    const id = this.structures.length;
    this.structures.push({ id, type, house, hp, x, y, w: size.w, h: size.h });
    if (type === StructureType.Wall) {
      this.structureAt[base] = id;
      this.map.ground[base] = this.wallBase + 1;
      return;
    }
    const group = this.rom.iconGroup(info.iconGroup);
    const n = layout.length;
    layout.forEach((d, i) => {
      this.map.ground[base + d] = group[2 * n + i];
      this.structureAt[base + d] = id;
    });
  }

  private isWall(pos: number): boolean {
    const id = this.structureAt[pos];
    return id >= 0 && this.structures[id].type === StructureType.Wall;
  }

  /** Structure_ConnectWall: иконка стены по соседним стенам. */
  connectWall(x: number, y: number, recurse: boolean): void {
    const pos = (y << 6) | x;
    let bits = 0;
    MAP_DIFF.forEach((d, i) => {
      const p = pos + d;
      if (p < 0 || p >= 4096) return;
      if (recurse && this.isWall(p)) this.connectWall(p & 63, p >> 6, false);
      if (this.isWall(p)) bits |= 1 << i;
    });
    this.map.ground[pos] = this.wallBase + WALL_CONNECT[bits] + 1;
  }

  structureAtCell(x: number, y: number): Structure | null {
    if (x < 0 || y < 0 || x > 63 || y > 63) return null;
    const id = this.structureAt[(y << 6) | x];
    return id >= 0 ? this.structures[id] : null;
  }

  /** Юнит под точкой (мировые пиксели), ближайший к ней. */
  unitAt(wx: number, wy: number): Unit | null {
    let best: Unit | null = null;
    let bestD = 12 * 12;
    for (const u of this.units) {
      const d = (u.x - wx) ** 2 + (u.y - wy) ** 2;
      if (d < bestD) {
        best = u;
        bestD = d;
      }
    }
    return best;
  }

  /** Временное движение по прямой с поворотом корпуса — до переноса механики движения из OpenDUNE. */
  step(): void {
    for (const u of this.units) {
      if (!u.target) continue;
      const dx = u.target.x - u.x;
      const dy = u.target.y - u.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) {
        u.target = null;
        continue;
      }
      const want = (Math.round((Math.atan2(dx, -dy) / (2 * Math.PI)) * 256) + 256) & 0xff;
      const diff = ((want - u.orientation + 384) & 0xff) - 128;
      if (Math.abs(diff) > 8) {
        u.orientation = (u.orientation + Math.sign(diff) * 8) & 0xff;
        u.turret = u.orientation;
        continue;
      }
      u.orientation = want;
      u.turret = want;
      const speed = 0.75;
      u.x += (dx / dist) * Math.min(speed, dist);
      u.y += (dy / dist) * Math.min(speed, dist);
      u.anim++;
    }
  }
}
