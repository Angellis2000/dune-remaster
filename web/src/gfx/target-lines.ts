/**
 * Линии до цели, как в Red Alert / OpenRA (DrawLineToTarget): от каждого юнита отдельно — к тому, во что он
 * будет стрелять (малиновая) или куда едет (приглушённая синяя), с отметками на концах.
 * Цель берётся из движка (targetAttack, targetMove), поэтому линия держится, пока у юнита есть эта цель,
 * и меняется только с новым приказом или когда цель уничтожена. Только чтение — в сети ничего не меняет.
 */
import { ACTION, IT, indexGetStructure, indexGetTile, indexGetType, indexGetUnit, indexIsValid, type Unit as EUnit } from "../engine/core.ts";
import { layoutSize, structureInfo } from "../engine/tables.ts";

const ATTACK = "#dc143c";
const MOVE = "#6598ce";

/** Точка цели в мировых пикселях (клетка = 32) или null. */
function targetPoint(encoded: number): { x: number; y: number } | null {
  if (!encoded || !indexIsValid(encoded)) return null;
  switch (indexGetType(encoded)) {
    case IT.UNIT: {
      const u = indexGetUnit(encoded);
      if (!u || !u.o.flags.used || u.o.flags.isNotOnMap) return null;
      return { x: u.o.position.x / 8, y: u.o.position.y / 8 };
    }
    case IT.STRUCTURE: {
      const s = indexGetStructure(encoded);
      if (!s || !s.o.flags.used) return null;
      const size = layoutSize[structureInfo[s.o.type].layout];
      return { x: s.o.position.x / 8 + size.width * 16, y: s.o.position.y / 8 + size.height * 16 };
    }
    case IT.TILE: {
      const t = indexGetTile(encoded);
      return { x: t.x / 8, y: t.y / 8 };
    }
  }
  return null;
}

/** Цель юнита: атака важнее движения; без цели — null. */
export function unitTargetLine(u: EUnit): { x: number; y: number; attack: boolean } | null {
  if (!u.o.flags.used || u.o.flags.isNotOnMap) return null;
  const attack = targetPoint(u.targetAttack);
  if (attack) return { ...attack, attack: true };
  if (u.actionID === ACTION.MOVE || u.actionID === ACTION.HARVEST || u.actionID === ACTION.RETURN || u.speed !== 0) {
    const move = targetPoint(u.targetMove);
    if (move) return { ...move, attack: false };
  }
  return null;
}

/** Нарисовать линии от юнитов (x, y — их центры на экране в мировых пикселях). */
export function drawTargetLines(
  ctx: CanvasRenderingContext2D,
  units: Iterable<{ x: number; y: number; ref: EUnit }>,
  z: number,
  ox: number,
  oy: number,
  /** видна ли клетка (x, y в клетках) — линия к цели в тумане выдала бы врага */
  visible: (x: number, y: number) => boolean = () => true,
): void {
  const width = Math.max(1, z * 0.75);
  const dot = Math.max(1.5, z * 1.25);
  ctx.save();
  ctx.lineCap = "round";
  for (const u of units) {
    const t = unitTargetLine(u.ref);
    if (!t || !visible(Math.floor(t.x / 32), Math.floor(t.y / 32))) continue;
    const x0 = u.x * z - ox, y0 = u.y * z - oy, x1 = t.x * z - ox, y1 = t.y * z - oy;
    if (Math.abs(x1 - x0) + Math.abs(y1 - y0) < 6 * z) continue;
    const color = t.attack ? ATTACK : MOVE;
    ctx.globalAlpha = t.attack ? 0.85 : 0.42;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.globalAlpha = t.attack ? 1 : 0.6;
    ctx.fillStyle = color;
    for (const [x, y, r] of [[x0, y0, dot * 0.8], [x1, y1, dot * 1.4]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
