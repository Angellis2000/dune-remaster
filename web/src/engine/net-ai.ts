/**
 * Противники-компьютеры и уход игрока в сетевом матче (lockstep: всё зависит только от состояния игры, у всех
 * клиентов одинаково).
 *
 * ИИ движка — как в Dune II MD: двор ИИ новых зданий не строит, только восстанавливает разрушенные
 * (ai_structureRebuild), заводы сами заказывают технику (structureAIPickNextToBuild), команды (TEAM.EMC) водят её
 * в атаку. Поэтому ИИ, как в миссиях кампании, получает готовую базу у своей точки высадки и команды атаки,
 * собранные по образцу 9-х миссий ROM (Kamikaze/Normal × Foot/Wheeled/Tracked, 3…7 юнитов).
 */
import { ACTION, G, HOUSE, INDEX_INVALID, MAP_INFOS, MOVEMENT, STRUCTURE, UNIT, packXY, tileCenter, unpackTile, type Structure } from "./core.ts";
import { houseCalculatePowerAndCredit } from "./house.ts";
import { mapGetLandscapeType } from "./map.ts";
import { structureCreate, structureGetStructuresBuilt, structureUpdateMap } from "./structure.ts";
import { landscapeInfo, layoutSize, structureInfo } from "./tables.ts";
import { teamCreate } from "./team.ts";
import { unitCreate, unitSetAction } from "./unit.ts";

/** Сколько техники держит ИИ (в кампании у домов ИИ 25…40; в сети — чуть больше). */
export const NET_AI_UNIT_MAX = 50;

/** Порядок зданий базы ИИ (двор уже стоит в точке высадки). Казарма — по дому, как в базах ИИ кампании. */
function baseTemplate(house: number): number[] {
  const infantry = house === HOUSE.HARKONNEN || house === HOUSE.SARDAUKAR ? STRUCTURE.WOR_TROOPER : STRUCTURE.BARRACKS;
  return [
    STRUCTURE.WINDTRAP, STRUCTURE.REFINERY, STRUCTURE.WINDTRAP, STRUCTURE.LIGHT_VEHICLE, infantry, STRUCTURE.WINDTRAP,
    STRUCTURE.HEAVY_VEHICLE, STRUCTURE.OUTPOST, STRUCTURE.SILO, STRUCTURE.WINDTRAP, STRUCTURE.HIGH_TECH, STRUCTURE.REPAIR,
    STRUCTURE.ROCKET_TURRET, STRUCTURE.ROCKET_TURRET, STRUCTURE.TURRET, STRUCTURE.TURRET,
  ];
}

/** Команды атаки: [действие TEAM (N 0, K 3), передвижение, мин, макс] — как в SCEN?009 ROM. */
const TEAMS: [number, number, number, number][] = [
  [3, MOVEMENT.TRACKED, 3, 7],
  [0, MOVEMENT.WHEELED, 3, 6],
  [3, MOVEMENT.FOOT, 3, 6],
  [0, MOVEMENT.TRACKED, 3, 6],
];

/** Дом ИИ: не человек, ИИ включён сразу (в кампании — когда заметит игрока). */
export function netSetupAIHouse(house: number, credits: number): void {
  const h = G.houses[house];
  h.flags.human = false;
  h.flags.isAIActive = true;
  h.credits = credits;
  h.creditsNoSilo = 0;
  h.creditsQuota = 0;
  h.unitCountMax = NET_AI_UNIT_MAX;
  for (const slot of h.ai_structureRebuild) slot[0] = slot[1] = 0;
}

/** Помещается ли здание type в клетке (x, y): скала под всеми клетками, вокруг — проход в одну клетку. */
function fits(type: number, x: number, y: number): boolean {
  const mi = MAP_INFOS[G.mapScale];
  const size = layoutSize[structureInfo[type].layout];
  for (let j = -1; j <= size.height; j++) {
    for (let i = -1; i <= size.width; i++) {
      const tx = x + i, ty = y + j;
      if (tx < mi.minX || ty < mi.minY || tx >= mi.minX + mi.sizeX || ty >= mi.minY + mi.sizeY) return false;
      const t = G.map[packXY(tx, ty)];
      if (t.hasStructure) return false;
      const inside = i >= 0 && j >= 0 && i < size.width && j < size.height;
      if (inside && (t.hasUnit || landscapeInfo[mapGetLandscapeType(packXY(tx, ty))].isValidForStructure === 0)) return false;
    }
  }
  return true;
}

/**
 * Готовая база ИИ вокруг двора в cy: здания по шаблону, каждое — в ближайшее к двору свободное место на скале
 * (кольца по возрастанию, внутри кольца — сверху вниз, слева направо). Не ближе 7 клеток к чужим дворам.
 * Харвестер — у завода очистки. Здания, которым не нашлось места, пропускаются.
 */
export function netBuildAIBase(house: number, cy: number, others: number[]): void {
  const cx = cy & 63, cyy = cy >> 6;
  const far = (x: number, y: number) => others.every((o) => Math.max(Math.abs((o & 63) - x), Math.abs((o >> 6) - y)) >= 7);
  for (const type of baseTemplate(house)) {
    let placed: Structure | null = null;
    for (let r = 2; r <= 12 && !placed; r++) {
      for (let y = cyy - r; y <= cyy + r && !placed; y++) {
        for (let x = cx - r; x <= cx + r && !placed; x++) {
          if (Math.max(Math.abs(x - cx), Math.abs(y - cyy)) !== r || !far(x, y) || !fits(type, x, y)) continue;
          placed = structureCreate(INDEX_INVALID, type, house, packXY(x, y));
        }
      }
    }
    if (!placed) continue;
    placed.o.hitpoints = structureInfo[type].o.hitpoints;
    placed.o.flags.degrades = false;
    if (type === STRUCTURE.REFINERY) {
      const x = (placed.o.position.x >> 8) + 1, y = (placed.o.position.y >> 8) + 2;
      const u = unitCreate(INDEX_INVALID, UNIT.HARVESTER, house, tileCenter(unpackTile(packXY(x, y))), 0x40);
      if (u) unitSetAction(u, ACTION.HARVEST);
    }
  }
  const h = G.houses[house];
  h.structuresBuilt = structureGetStructuresBuilt(h);
  houseCalculatePowerAndCredit(h);
}

/** Команды атаки для домов ИИ: по очереди первая команда каждого дома, потом вторая… (пул команд — 16). */
export function netCreateAITeams(houses: number[]): void {
  for (const [action, movement, min, max] of TEAMS) for (const house of houses) teamCreate(house, action, movement, min, max);
}

/**
 * Игрок вышел (команда «left» приходит всем в одном ходе). Есть живой союзник-человек — ему уходят все юниты,
 * здания и кредиты (как при захвате здания пехотой: смена дома и пересчёт). Нет — дом становится домом ИИ.
 * Возвращает дом союзника или −1 (ИИ).
 */
export function netHandOver(house: number): number {
  const net = G.net;
  if (!net || !((net.humans >> house) & 1)) return -2;
  net.humans &= ~(1 << house);
  const h = G.houses[house];
  let ally = -1;
  for (let other = 0; other < 8 && ally < 0; other++) {
    if (other === house || !((net.humans >> other) & 1) || net.team[other] !== net.team[house]) continue;
    const alive = G.structureFind.some((s) => s.o.flags.used && s.o.houseID === other) || G.unitFind.some((u) => u.o.flags.used && u.o.houseID === other);
    if (alive) ally = other;
  }
  if (ally < 0) {
    // дом ИИ: заказы игрока снимаются (оплаченное возвращается), дальше — заводы и команды ИИ
    for (const s of G.structureFind) {
      if (!s.o.flags.used || s.o.houseID !== house) continue;
      for (const item of [...(s.unitQueue ?? []), ...(s.buildingQueue ?? []), ...(s.readyBuildings ?? [])]) h.credits += item.cost;
      s.unitQueue = [];
      s.buildingQueue = [];
      s.readyBuildings = [];
      s.o.flags.onHold = false;
    }
    netSetupAIHouse(house, h.credits);
    netCreateAITeams([house]);
    return -1;
  }
  const to = G.houses[ally];
  for (const u of G.units) {
    if (!u.o.flags.used || u.o.houseID !== house) continue;
    u.o.houseID = ally;
    h.unitCount--;
    to.unitCount++;
  }
  for (const s of G.structureFind) {
    if (!s.o.flags.used || s.o.houseID !== house) continue;
    s.o.houseID = ally;
    structureUpdateMap(s);
  }
  to.credits += h.credits;
  to.creditsNoSilo = Math.max(to.creditsNoSilo, h.creditsNoSilo);
  h.credits = 0;
  h.creditsNoSilo = 0;
  h.structuresBuilt = structureGetStructuresBuilt(h);
  to.structuresBuilt = structureGetStructuresBuilt(to);
  houseCalculatePowerAndCredit(h);
  houseCalculatePowerAndCredit(to);
  return ally;
}
