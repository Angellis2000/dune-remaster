/**
 * Точки высадки сетевого матча — одни и те же у лобби (выбор точки, ui/network.ts) и у движка (Game.loadNetwork),
 * поэтому считаются только по клеткам карты ROM, без зерна и состояния игры. Точка — левая верхняя клетка двора 2×2:
 * все четыре клетки на скале и вокруг есть место под базу.
 *
 * Порядок (замечание владельца: «1 на 1 на одном материке — разнести по разным»): скала делится на «материки» —
 * связные участки, где можно строить. Сначала по одной точке на материк (лучшее место под базу на нём), материки по
 * очереди — самый большой, дальше каждый раз самый дальний от уже выбранных; только когда материков не хватает —
 * вторые точки на тех же материках, тоже как можно дальше от занятых. Поэтому первые точки (1 на 1, 2 на 2…)
 * оказываются на разных материках и далеко друг от друга.
 */
import { MAP_INFOS } from "./core.ts";
import { iconLandscape, landscapeInfo } from "./tables.ts";

export const NET_SPAWN_POINTS = 8;
/** сколько клеток скалы в 7×7 вокруг двора нужно под базу */
const BASE_ROOM = 20;
/** материк меньше этого (клеток скалы) базу не вместит — его не считаем отдельным */
const MIN_CONTINENT = 24;

/** ground — номера иконок 64×64 (как G.map[p].groundTileID), scale — 0 для 64×64, 1 для 32×32. */
export function netSpawnPoints(ground: ArrayLike<number>, scale: number, count = NET_SPAWN_POINTS): { x: number; y: number; room: number; continent: number }[] {
  const mi = MAP_INFOS[scale];
  const inside = (x: number, y: number) => x >= mi.minX && y >= mi.minY && x < mi.minX + mi.sizeX && y < mi.minY + mi.sizeY;
  const rock = (x: number, y: number) => {
    if (!inside(x, y)) return false;
    const lst = iconLandscape[ground[(y << 6) | x] & 0x1ff];
    return lst >= 0 && landscapeInfo[lst].isValidForStructure !== 0;
  };
  // материки: связные (по 4 соседям) участки скалы
  const continent = new Int16Array(64 * 64).fill(-1);
  const sizes: number[] = [];
  for (let y = mi.minY; y < mi.minY + mi.sizeY; y++) {
    for (let x = mi.minX; x < mi.minX + mi.sizeX; x++) {
      if (continent[(y << 6) | x] >= 0 || !rock(x, y)) continue;
      const id = sizes.length;
      let size = 0;
      const stack = [(y << 6) | x];
      continent[(y << 6) | x] = id;
      while (stack.length) {
        const p = stack.pop()!;
        size++;
        const px = p & 63, py = p >> 6;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = px + dx, ny = py + dy, q = (ny << 6) | nx;
          if (!rock(nx, ny) || continent[q] >= 0) continue;
          continent[q] = id;
          stack.push(q);
        }
      }
      sizes.push(size);
    }
  }
  // места под двор: 2×2 на скале, вокруг (7×7) сколько-то скалы
  const cands: { x: number; y: number; room: number; c: number }[] = [];
  for (let y = mi.minY + 1; y < mi.minY + mi.sizeY - 2; y++) {
    for (let x = mi.minX + 1; x < mi.minX + mi.sizeX - 2; x++) {
      if (!rock(x, y) || !rock(x + 1, y) || !rock(x, y + 1) || !rock(x + 1, y + 1)) continue;
      let room = 0;
      for (let j = -2; j <= 4; j++) for (let i = -2; i <= 4; i++) if (rock(x + i, y + j)) room++;
      if (room >= 10) cands.push({ x, y, room, c: continent[(y << 6) | x] });
    }
  }
  if (!cands.length) return [];
  const d2 = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  // лучшее место на каждом материке: больше места под базу, при равенстве — ближе к его середине
  const best = new Map<number, (typeof cands)[number]>();
  const centre = new Map<number, { x: number; y: number; n: number }>();
  for (const c of cands) {
    const m = centre.get(c.c) ?? { x: 0, y: 0, n: 0 };
    m.x += c.x; m.y += c.y; m.n++;
    centre.set(c.c, m);
  }
  for (const c of cands) {
    const b = best.get(c.c), m = centre.get(c.c)!, mid = { x: m.x / m.n, y: m.y / m.n };
    if (!b || c.room > b.room || (c.room === b.room && d2(c, mid) < d2(b, mid))) best.set(c.c, c);
  }
  // материк под базу: достаточно большой и с местом под базу (20 клеток скалы в 7×7 вокруг двора)
  const reps = [...best.values()].filter((c) => sizes[c.c] >= MIN_CONTINENT && c.room >= BASE_ROOM);
  const chosen: (typeof cands)[number][] = [];
  const nearest = (c: { x: number; y: number }) => chosen.reduce((m, s) => Math.min(m, d2(c, s)), Infinity);
  // 1) по точке на материк: самый большой, дальше — самый дальний от выбранных
  if (reps.length) {
    let first = reps[0];
    for (const r of reps) if (sizes[r.c] > sizes[first.c] || (sizes[r.c] === sizes[first.c] && r.room > first.room)) first = r;
    chosen.push(first);
    while (chosen.length < count) {
      let pick: (typeof reps)[number] | null = null, far = -1;
      for (const r of reps) {
        if (chosen.some((s) => s.c === r.c)) continue;
        const d = nearest(r);
        if (d > far) { far = d; pick = r; }
      }
      if (!pick) break;
      chosen.push(pick);
    }
  }
  // 2) материков не хватило — ещё точки там, где больше места, как можно дальше от занятых (не ближе 6 клеток)
  while (chosen.length < count) {
    let pick: (typeof cands)[number] | null = null, score = -1;
    for (const c of cands) {
      if (c.room < BASE_ROOM) continue;
      const d = chosen.length ? nearest(c) : Infinity;
      if (d < 36) continue;
      const s = Math.min(d, 400) * 4 + c.room;
      if (s > score) { score = s; pick = c; }
    }
    if (!pick) break;
    chosen.push(pick);
  }
  // 3) маленькая карта: точек всё ещё мало (нужно до 6 игроков) — и тесные места, не ближе 3 клеток к занятым
  while (chosen.length < count) {
    let pick: (typeof cands)[number] | null = null, score = -1;
    for (const c of cands) {
      const d = nearest(c);
      if (d < 9) continue;
      const s = Math.min(d, 400) * 4 + c.room;
      if (s > score) { score = s; pick = c; }
    }
    if (!pick) break;
    chosen.push(pick);
  }
  return chosen.map(({ x, y, room, c }) => ({ x, y, room, continent: c }));
}

/**
 * Для какого формата годится карта (владелец: «убери неподходящие карты», «на одном материке — только один игрок»):
 * наибольший размер команды N (0…3), при котором первые 2 × N точек стоят на разных материках, у каждой есть место
 * под базу и они не в куче — не ближе 20 клеток для 1 на 1, 14 — для 2 на 2, 12 — для 3 на 3.
 */
export function netMapTeamSize(ground: ArrayLike<number>, scale: number): number {
  const pts = netSpawnPoints(ground, scale);
  let fit = 0;
  for (const [size, gap] of [[1, 20], [2, 14], [3, 12]]) {
    const p = pts.slice(0, size * 2);
    if (p.length < size * 2 || p.some((q) => q.room < BASE_ROOM) || new Set(p.map((q) => q.continent)).size < p.length) break;
    let near = Infinity;
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) near = Math.min(near, Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y));
    if (near < gap) break;
    fit = size;
  }
  return fit;
}
