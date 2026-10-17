/**
 * Анимации клеток карты (OpenDUNE src/animation.c): следы гусениц, анимация зданий, кратеры.
 * Команды — пары [код, параметр]; таймер — g_timerGUI (60 Гц).
 */
import { G, packTile, random256, type Tile32 } from "./core.ts";
import { mapIsPositionUnveiled } from "./map.ts";
import { structureFrameStride, structureGetByPackedTile } from "./structure.ts";
import { layoutTileCount, layoutTiles } from "./tables.ts";

const ANIMATION_MAX = 112;
const enum CMD {
  STOP = 0,
  ABORT = 1,
  SET_OVERLAY_TILE = 2,
  PAUSE = 3,
  REWIND = 4,
  PLAY_VOICE = 5,
  SET_GROUND_TILE = 6,
  FORWARD = 7,
  SET_ICONGROUP = 8,
}
const ICONGROUP_BASE_DEFENSE_TURRET = 23;
const ICONGROUP_BASE_ROCKET_TURRET = 24;

interface Animation {
  tickNext: number;
  tileLayout: number;
  houseID: number;
  current: number;
  iconGroup: number;
  commands: [number, number][] | null;
  tile: Tile32;
}

const animations: Animation[] = Array.from({ length: ANIMATION_MAX }, () => ({ tickNext: 0, tileLayout: 0, houseID: 0, current: 0, iconGroup: 0, commands: null, tile: { x: 0, y: 0 } }));
let animationTimer = 0;

export function animationInit(): void {
  for (const a of animations) a.commands = null;
  animationTimer = 0;
}

function funcStop(a: Animation): void {
  const layout = layoutTiles[a.tileLayout];
  const count = layoutTileCount[a.tileLayout];
  const packed = packTile(a.tile);
  G.map[packed].hasAnimation = false;
  a.commands = null;
  for (let i = 0; i < count; i++) {
    const position = packed + layout[i];
    const t = G.map[position];
    if (a.tileLayout !== 0) t.groundTileID = G.mapTileID[position] & 0x1ff;
    if (mapIsPositionUnveiled(position)) t.overlayTileID = 0;
  }
}

function funcAbort(a: Animation): void {
  G.map[packTile(a.tile)].hasAnimation = false;
  a.commands = null;
}

function funcSetOverlayTile(a: Animation, parameter: number): void {
  const packed = packTile(a.tile);
  const t = G.map[packed];
  if (!mapIsPositionUnveiled(packed)) return;
  t.overlayTileID = G.iconGroups[a.iconGroup][parameter] & 0x7f;
  t.houseID = a.houseID;
}

function funcSetGroundTile(a: Animation, parameter: number): void {
  const layout = layoutTiles[a.tileLayout];
  const count = layoutTileCount[a.tileLayout];
  const packed = packTile(a.tile);
  const group = G.iconGroups[a.iconGroup];
  const base = structureFrameStride(a.iconGroup, count) * parameter;
  // MD: у групп иконок зданий только 3 кадра (стройка, развалины, готово); кадры дальше
  // в оригинале не меняют клетки (проверено в эмуляторе) — пропускаем их
  if (base + count > group.length && !(a.iconGroup === ICONGROUP_BASE_DEFENSE_TURRET || a.iconGroup === ICONGROUP_BASE_ROCKET_TURRET)) return;
  let special: number | null = null;
  if (parameter > 1 && (a.iconGroup === ICONGROUP_BASE_DEFENSE_TURRET || a.iconGroup === ICONGROUP_BASE_ROCKET_TURRET)) {
    const s = structureGetByPackedTile(packed);
    if (s) special = s.rotationSpriteDiff + group[2];
  }
  for (let i = 0; i < count; i++) {
    const position = packed + layout[i];
    const tileID = special ?? group[base + i];
    const t = G.map[position];
    if (t.groundTileID === tileID) continue;
    t.groundTileID = tileID;
    t.houseID = a.houseID;
    if (mapIsPositionUnveiled(position)) t.overlayTileID = 0;
  }
}

export function animationStart(commands: [number, number][] | null, tile: Tile32, tileLayout: number, houseID: number, iconGroup: number): void {
  const packed = packTile(tile);
  const t = G.map[packed];
  animationStopByTile(packed);
  for (const a of animations) {
    if (a.commands !== null) continue;
    a.tickNext = G.timerGUI;
    a.tileLayout = tileLayout;
    a.houseID = houseID;
    a.current = 0;
    a.iconGroup = iconGroup;
    a.commands = commands;
    a.tile = { ...tile };
    animationTimer = 0;
    t.houseID = houseID;
    t.hasAnimation = true;
    return;
  }
}

export function animationStopByTile(packed: number): void {
  const t = G.map[packed];
  if (!t.hasAnimation) return;
  for (const a of animations) {
    if (a.commands === null) continue;
    if (packTile(a.tile) !== packed) continue;
    funcStop(a);
    return;
  }
}

export function animationTick(): void {
  if (animationTimer > G.timerGUI) return;
  animationTimer += 10000;
  for (const a of animations) {
    if (a.commands === null) continue;
    if (a.tickNext <= G.timerGUI) {
      const [command, parameter] = a.commands[a.current] ?? [CMD.STOP, 0];
      a.current = (a.current + 1) & 0xff;
      switch (command) {
        case CMD.ABORT: funcAbort(a); break;
        case CMD.SET_OVERLAY_TILE: funcSetOverlayTile(a, parameter); break;
        case CMD.PAUSE: a.tickNext = G.timerGUI + parameter + (random256() % 4); break;
        case CMD.REWIND: a.current = 0; break;
        case CMD.PLAY_VOICE: G.onSound(parameter, a.tile); break;
        case CMD.SET_GROUND_TILE: funcSetGroundTile(a, parameter); break;
        case CMD.FORWARD: a.current = (a.current + parameter - 1) & 0xff; break;
        case CMD.SET_ICONGROUP: a.iconGroup = parameter; break;
        default: funcStop(a); break;
      }
      if (a.commands === null) continue;
    }
    if (a.tickNext < animationTimer) animationTimer = a.tickNext;
  }
}
