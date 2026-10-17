/**
 * Мир для отрисовки и управления: тонкая обёртка над движком (engine/), который ведёт игру по
 * схеме оригинала. Каждый кадр сюда переносится то, что видит игрок: клетки, юниты, здания.
 * Объекты вида стабильны (один и тот же объект на всё время жизни юнита), чтобы выделение не терялось.
 */
import { CELL_PX, type DuneRom } from "../rom/dune.ts";
import type { Scenario } from "../rom/scenario.ts";
import { G, MAP_INFOS, MOVEMENT, STRUCTURE, packTile, packXY, type Structure as EStructure, type Unit as EUnit } from "../engine/core.ts";
import { explosions } from "../engine/explosion.ts";
import { Game } from "../engine/game.ts";
import { layoutSize, structureInfo, tableTileDiff, unitInfo } from "../engine/tables.ts";
import { MAP_SIZE } from "../rom/dune.ts";

export interface Structure {
  id: number;
  ref: EStructure;
  type: number;
  house: number;
  hp: number; // 0..256 от полной
  x: number; // левая верхняя клетка
  y: number;
  w: number;
  h: number;
  /** готово (не в постройке) — можно рисовать своей картинкой */
  built: boolean;
}

export interface Unit {
  id: number;
  ref: EUnit;
  type: number;
  house: number;
  hp: number;
  /** центр в мировых пикселях (клетка = 32) */
  x: number;
  y: number;
  orientation: number; // 0..255, 0 — север, по часовой
  turret: number;
  anim: number;
  air: boolean;
  highlighted: boolean;
}

export interface Blast {
  x: number;
  y: number;
  type: number;
  spriteID: number;
  age: number;
}

export interface HouseState {
  id: number;
  credits: number;
  quota: number;
  human: boolean;
}

class MapLayer {
  readonly ground = new Uint16Array(MAP_SIZE * MAP_SIZE);
  readonly overlay = new Uint16Array(MAP_SIZE * MAP_SIZE);
  readonly unveiled = new Uint8Array(MAP_SIZE * MAP_SIZE);
  bounds = { x: 0, y: 0, w: 64, h: 64 };
  index = 1;

  inBounds(x: number, y: number): boolean {
    const b = this.bounds;
    return x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;
  }
}

export class World {
  readonly game: Game;
  readonly map = new MapLayer();
  scenario!: Scenario;
  structures: Structure[] = [];
  units: Unit[] = [];
  blasts: Blast[] = [];
  readonly houses = new Map<number, HouseState>();
  private unitViews = new Map<EUnit, Unit>();
  private structureViews = new Map<EStructure, Structure>();
  private nextId = 1;

  constructor(rom: DuneRom) {
    this.game = new Game(rom);
  }

  get player(): number {
    return G.playerHouseID;
  }

  load(house: "A" | "O" | "H", mission: number): void {
    this.scenario = this.game.load(house, mission);
    const mi = MAP_INFOS[G.mapScale];
    this.map.bounds = { x: mi.minX, y: mi.minY, w: mi.sizeX, h: mi.sizeY };
    this.map.index = this.scenario.mapIndex;
    this.unitViews.clear();
    this.structureViews.clear();
    this.sync();
  }

  step(): void {
    this.game.tick();
  }

  /** Перенести состояние движка в объекты вида. */
  sync(): void {
    for (let i = 0; i < 4096; i++) {
      const t = G.map[i];
      this.map.ground[i] = t.groundTileID;
      this.map.overlay[i] = t.overlayTileID;
      this.map.unveiled[i] = t.isUnveiled ? 1 : 0;
    }
    const alive = new Set<EUnit>();
    const units: Unit[] = [];
    for (const u of G.unitFind) {
      if (u.o.flags.isNotOnMap) continue;
      if (!G.map[packTile(u.o.position)].isUnveiled) continue;
      alive.add(u);
      let v = this.unitViews.get(u);
      if (!v || v.type !== u.o.type) {
        v = { id: this.nextId++, ref: u, type: 0, house: 0, hp: 0, x: 0, y: 0, orientation: 0, turret: 0, anim: 0, air: false, highlighted: false };
        this.unitViews.set(u, v);
      }
      const ui = unitInfo[u.o.type];
      const wob = tableTileDiff[0][u.wobbleIndex] ?? { x: 0, y: 0 };
      v.type = u.o.type;
      v.house = u.deviated !== 0 ? u.deviatedHouse : u.o.houseID;
      v.hp = Math.round((u.o.hitpoints * 256) / Math.max(1, ui.o.hitpoints));
      v.x = u.o.position.x / 8 + wob.x * 2;
      v.y = u.o.position.y / 8 + wob.y * 2;
      v.orientation = u.orientation[0].current & 0xff;
      v.turret = u.orientation[ui.o.flags.hasTurret ? 1 : 0].current & 0xff;
      v.anim = u.spriteOffset >= 0 ? (u.spriteOffset & 3) << 3 : 0;
      v.air = ui.movementType === MOVEMENT.WINGER;
      v.highlighted = u.o.flags.isHighlighted;
      units.push(v);
    }
    for (const u of [...this.unitViews.keys()]) if (!alive.has(u) && (!u.o.flags.used || u.o.flags.isNotOnMap)) this.unitViews.delete(u);
    this.units = units;

    const structures: Structure[] = [];
    const seen = new Set<EStructure>();
    for (const s of G.structureFind) {
      if (s.o.flags.isNotOnMap) continue;
      if (s.o.type === STRUCTURE.SLAB_1x1 || s.o.type === STRUCTURE.SLAB_2x2 || s.o.type === STRUCTURE.WALL) continue;
      seen.add(s);
      let v = this.structureViews.get(s);
      if (!v) {
        v = { id: this.nextId++, ref: s, type: 0, house: 0, hp: 0, x: 0, y: 0, w: 1, h: 1, built: false };
        this.structureViews.set(s, v);
      }
      const si = structureInfo[s.o.type];
      const size = layoutSize[si.layout];
      v.type = s.o.type;
      v.house = s.o.houseID;
      v.hp = Math.round((s.o.hitpoints * 256) / Math.max(1, si.o.hitpoints));
      v.x = (s.o.position.x >> 8) & 63;
      v.y = (s.o.position.y >> 8) & 63;
      v.w = size.width;
      v.h = size.height;
      v.built = s.state >= 0 && s.o.script.variables[0] !== 1;
      structures.push(v);
    }
    for (const s of [...this.structureViews.keys()]) if (!seen.has(s)) this.structureViews.delete(s);
    this.structures = structures;

    this.blasts = [];
    for (const e of explosions) {
      if (!e.commands || e.spriteID === 0) continue;
      const p = packTile(e.position);
      if (!G.map[p].isUnveiled) continue;
      this.blasts.push({ x: e.position.x / 8, y: e.position.y / 8, type: e.type, spriteID: e.spriteID, age: e.current });
    }

    this.houses.clear();
    for (const h of G.houseFind) this.houses.set(h.index, { id: h.index, credits: h.credits, quota: h.creditsQuota, human: h.flags.human });
  }

  /** Юнит под точкой (мировые пиксели): ближайший к центру в пределах клетки. */
  unitAt(wx: number, wy: number): Unit | null {
    let best: Unit | null = null;
    let bestD = 16 * 16;
    for (const u of this.units) {
      const d = (u.x - wx) ** 2 + (u.y - wy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  structureAtCell(x: number, y: number): Structure | null {
    for (const s of this.structures) if (x >= s.x && y >= s.y && x < s.x + s.w && y < s.y + s.h) return s;
    return null;
  }

  viewOf(u: EUnit | null): Unit | null {
    return u ? this.unitViews.get(u) ?? null : null;
  }

  viewOfStructure(s: EStructure | null): Structure | null {
    return s ? this.structureViews.get(s) ?? null : null;
  }

  static packAt(wx: number, wy: number): number {
    return packXY(Math.floor(wx / CELL_PX) & 63, Math.floor(wy / CELL_PX) & 63);
  }
}
