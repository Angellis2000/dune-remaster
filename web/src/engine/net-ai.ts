/**
 * Противники-компьютеры и уход игрока в сетевом матче (lockstep: всё зависит только от состояния игры, у всех
 * клиентов одинаково).
 *
 * Компьютер начинает как человек — двор, два квадроцикла, те же кредиты — и сам отстраивает базу (просьба
 * владельца: с готовой базой у ИИ было бы преимущество). В MD двор ИИ новых зданий не строит, только
 * восстанавливает разрушенные: здание из списка ai_structureRebuild (тип + клетка) двор заказывает сам
 * (structureAIPickNextToBuild), платит по ходу стройки и ставит в эту клетку. «Строитель» netAITick лишь кладёт
 * в этот список следующее здание очереди и место для него — по тем же правилам постановки, что у человека (скала,
 * свободно, рядом со своими зданиями). Остальное — ИИ движка: заводы заказывают технику, команды TEAM.EMC водят её
 * в атаку. Улучшения заводов ИИ в сети покупает, как человек (structureSetUpgradingState): бесплатных уровней нет.
 *
 * Строитель работает и в обычных миссиях (просьба владельца 2026-10-20, отступление от MD): дома ИИ с двором
 * достраивают базу по той же очереди, пока ИИ активен (как в оригинале — с момента, когда заметил игрока);
 * что можно строить, ограничивает дерево технологий миссии, сложность — из настроек игры (G.difficulty).
 */
import { G, HOUSE, IT, LST, MAP_INFOS, MOVEMENT, STRUCTURE, UNIT, indexEncode, isHuman, packXY, type Structure } from "./core.ts";
import { houseAreAllied, houseCalculatePowerAndCredit } from "./house.ts";
import { mapGetLandscapeType } from "./map.ts";
import {
  structureBuildObject, structureGetBuildable, structureGetStructuresBuilt, structureIsUpgradable, structureIsValidBuildLocationFor,
  structureSetUpgradingState, structureUpdateMap,
} from "./structure.ts";
import { landscapeInfo, layoutSize, structureInfo } from "./tables.ts";
import { teamCreate } from "./team.ts";
import { unitCreateWrapper } from "./unit.ts";

/**
 * Очередь построек ИИ — как разумно строит человек: энергия, спайс, казарма, лёгкий завод, радар, второй завод
 * очистки, тяжёлый завод, оборона, высокие технологии, ремонт, дворец. Повтор типа — ещё одно такое здание.
 * Недоступное по дереву технологий пропускается до поры; энергии не хватит — сначала ветряк.
 */
function buildOrder(house: number): number[] {
  const S = STRUCTURE;
  const infantry = house === HOUSE.HARKONNEN || house === HOUSE.SARDAUKAR ? S.WOR_TROOPER : S.BARRACKS;
  const order = [
    S.WINDTRAP, S.REFINERY, infantry, S.WINDTRAP, S.LIGHT_VEHICLE, S.OUTPOST, S.REFINERY, S.WINDTRAP, S.HEAVY_VEHICLE, S.SILO,
    S.TURRET, S.WINDTRAP, S.ROCKET_TURRET, S.HIGH_TECH, S.REPAIR, S.WINDTRAP, S.ROCKET_TURRET, S.TURRET, S.WINDTRAP, S.PALACE,
    S.HEAVY_VEHICLE, S.ROCKET_TURRET, S.WINDTRAP, S.ROCKET_TURRET, S.REFINERY,
  ];
  const level = levelOf(house);
  if (level === 0) return order.slice(0, LEVEL.buildOrderEasy).filter((type, i) => type !== S.REFINERY || i < 2);
  if (level === 2) order.push(S.WINDTRAP, S.ROCKET_TURRET, S.ROCKET_TURRET, S.REFINERY, S.WINDTRAP, S.ROCKET_TURRET, S.SILO, S.ROCKET_TURRET);
  return order;
}

/**
 * Сложность компьютера (лобби, NetPlayer.difficulty): 0 — лёгкий, 1 — обычный, 2 — тяжёлый. Нечестных бонусов
 * (денег, скорости стройки) нет: меняется только поведение — как часто строитель думает, сколько денег держит на
 * здания, когда покупает улучшения, сколько зданий и техники заводит и сколько команд водит в атаку.
 */
const LEVEL = {
  /** раз во сколько кадров строитель думает */
  period: [240, 45, 12],
  /** запас кредитов, с которого заводы строят технику, даже если задел базы не готов */
  reserve: [2500, 1500, 800],
  /** сколько первых зданий очереди — задел, без которого технику не строит */
  core: [7, 5, 4],
  /** с каких кредитов покупает улучшения заводов (лёгкий — не покупает) */
  upgrade: [Infinity, 1200, 700],
  /** предел техники */
  units: [25, 50, 70],
  /** сколько команд атаки водит */
  teams: [2, 4, 4],
  /** «мирное время» в сети, кадров (60 в секунду): 10, 6 и 4 минуты без атак — как в StarCraft, успеть развиться */
  peace: [10 * 3600, 6 * 3600, 4 * 3600],
  /** харвестеров на завод очистки (тяжёлый быстрее богатеет) */
  harvesters: [1, 1, 2],
  /** лёгкий строит только начало очереди (без дворца, второго тяжёлого завода и т. п.) */
  buildOrderEasy: 15,
};
/** сложность каждого дома ИИ (задаётся при старте матча и при передаче базы вышедшего) */
const levels: number[] = [1, 1, 1, 1, 1, 1];
/** Сложность дома ИИ: в сети — из лобби, в обычной миссии — из настроек игры. */
const levelOf = (house: number): number => (G.net ? levels[house] : Math.max(0, Math.min(2, G.difficulty)));

/** Команды атаки: [действие TEAM (N 0, K 3), передвижение, мин, макс] — как в SCEN?009 ROM. */
const TEAMS: [number, number, number, number][] = [
  [3, MOVEMENT.TRACKED, 3, 7],
  [0, MOVEMENT.WHEELED, 3, 6],
  [3, MOVEMENT.FOOT, 3, 6],
  [0, MOVEMENT.TRACKED, 3, 6],
];

/** Дом ИИ: не человек, ИИ включён сразу (в кампании — когда заметит игрока). */
export function netSetupAIHouse(house: number, credits: number, difficulty = 1): void {
  const h = G.houses[house];
  levels[house] = Math.max(0, Math.min(2, Math.round(difficulty) || 0));
  h.flags.human = false;
  h.flags.isAIActive = true;
  h.credits = credits;
  h.creditsNoSilo = 0;
  h.creditsQuota = 0;
  h.unitCountMax = LEVEL.units[levels[house]];
  for (const slot of h.ai_structureRebuild) slot[0] = slot[1] = 0;
}

const own = (house: number, type?: number): Structure[] =>
  G.structureFind.filter((s) => s.o.flags.used && s.o.flags.allocated && s.o.hitpoints > 0 && !s.o.flags.isNotOnMap && s.o.houseID === house && (type === undefined || s.o.type === type));
const isTurret = (type: number) => type === STRUCTURE.TURRET || type === STRUCTURE.ROCKET_TURRET;

/** Сколько зданий типа есть или уже заказано (в списке двора). */
function countWithPlans(house: number, type: number): number {
  return own(house, type).length + G.houses[house].ai_structureRebuild.filter(([t]) => t === type).length;
}

/** Следующее здание очереди, доступное двору сейчас, или −1. */
function pickNext(house: number, buildable: number): number {
  const h = G.houses[house];
  const can = (type: number) => (buildable & (1 << type)) !== 0;
  const seen = new Map<number, number>();
  for (const type of buildOrder(house)) {
    const need = (seen.get(type) ?? 0) + 1;
    seen.set(type, need);
    if (countWithPlans(house, type) >= need || !can(type)) continue;
    const use = structureInfo[type].powerUsage;
    if (type !== STRUCTURE.WINDTRAP && use > 0 && h.powerUsage + use > h.powerProduction && can(STRUCTURE.WINDTRAP)) return STRUCTURE.WINDTRAP;
    return type;
  }
  return h.powerUsage > h.powerProduction && can(STRUCTURE.WINDTRAP) ? STRUCTURE.WINDTRAP : -1;
}

/**
 * Место для здания — в любом месте карты, где его можно поставить по правилам игрока
 * (structureIsValidBuildLocationFor: скала, свободно, рядом со своим зданием или своей плитой). Лучшее — ближе к
 * двору и где вокруг меньше зданий (остаются проезды); турели — к ближайшему противнику, в 3…8 клетках от двора.
 * Нет места — −1 (тогда строитель тянет базу плитами, см. pickSlab).
 */
function pickSpot(house: number, type: number, cy: Structure): number {
  const cx = (cy.o.position.x >> 8) + 1, cyy = (cy.o.position.y >> 8) + 1;
  const size = layoutSize[structureInfo[type].layout];
  let enemy: { x: number; y: number } | null = null, enemyD = Infinity;
  if (isTurret(type)) {
    for (const s of G.structureFind) {
      if (!s.o.flags.used || s.o.type !== STRUCTURE.CONSTRUCTION_YARD || houseAreAllied(s.o.houseID, house)) continue;
      const x = s.o.position.x >> 8, y = s.o.position.y >> 8, d = (x - cx) ** 2 + (y - cyy) ** 2;
      if (d < enemyD) { enemyD = d; enemy = { x, y }; }
    }
  }
  const mi = MAP_INFOS[G.mapScale];
  let best = -1, bestScore = Infinity;
  for (let y = mi.minY; y + size.height <= mi.minY + mi.sizeY; y++) {
    for (let x = mi.minX; x + size.width <= mi.minX + mi.sizeX; x++) {
      const p = packXY(x, y);
      if (structureIsValidBuildLocationFor(p, type, house) === 0) continue;
      const r = Math.max(Math.abs(x - cx), Math.abs(y - cyy));
      let crowd = 0;
      for (let j = -1; j <= size.height; j++) for (let i = -1; i <= size.width; i++) if (G.map[packXY(x + i, y + j) & 0xfff].hasStructure) crowd++;
      const score = isTurret(type)
        ? (r < 3 || r > 8 ? 1000 + r : 0) + (enemy ? Math.abs(x - enemy.x) + Math.abs(y - enemy.y) : r) + crowd
        : r * 16 + crowd * 4;
      if (score < bestScore) { bestScore = score; best = p; }
    }
  }
  return best;
}

/**
 * Места под здание нет: плита туда, где рядом больше свободной скалы (5×5 без зданий), — так база растёт по
 * скале, как у человека, кладущего бетон. Плита 2×2, если двор её умеет, иначе 1×1. Возвращает [тип, клетка] или null.
 */
function pickSlab(house: number, buildable: number, cy: Structure): [number, number] | null {
  const type = buildable & (1 << STRUCTURE.SLAB_2x2) ? STRUCTURE.SLAB_2x2 : buildable & (1 << STRUCTURE.SLAB_1x1) ? STRUCTURE.SLAB_1x1 : -1;
  if (type < 0) return null;
  const cx = (cy.o.position.x >> 8) + 1, cyy = (cy.o.position.y >> 8) + 1;
  const mi = MAP_INFOS[G.mapScale];
  const inside = (x: number, y: number) => x >= mi.minX && y >= mi.minY && x < mi.minX + mi.sizeX && y < mi.minY + mi.sizeY;
  let best: [number, number] | null = null, bestScore = -Infinity;
  for (let y = mi.minY; y < mi.minY + mi.sizeY - 1; y++) {
    for (let x = mi.minX; x < mi.minX + mi.sizeX - 1; x++) {
      const p = packXY(x, y);
      if (structureIsValidBuildLocationFor(p, type, house) === 0) continue;
      let room = 0;
      for (let j = -2; j <= 3; j++) {
        for (let i = -2; i <= 3; i++) {
          if (!inside(x + i, y + j)) continue;
          const q = packXY(x + i, y + j), t = G.map[q];
          if (!t.hasStructure && landscapeInfo[mapGetLandscapeType(q)].isValidForStructure && mapGetLandscapeType(q) !== LST.CONCRETE_SLAB) room++;
        }
      }
      const score = room * 4 - Math.max(Math.abs(x - cx), Math.abs(y - cyy));
      if (score > bestScore) { bestScore = score; best = [type, p]; }
    }
  }
  return best && bestScore > 8 ? best : null;
}

/**
 * «Строитель» ИИ (Game.tick, в сети и в обычной миссии): раз в 30 кадров на дом, дома вразнобой. Чистит список двора (здание стало
 * недоступно или место занято), кладёт в него следующее здание, заказывает харвестер, если их меньше заводов
 * очистки (заводы ИИ харвестеры сами не заказывают), и покупает улучшения заводов, когда двор свободен.
 */
export function aiBuilderTick(): void {
  const net = G.net;
  for (let house = 0; house < 6; house++) {
    const h = G.houses[house];
    if (!h.flags.used || isHuman(house) || (net && (net.team[house] ?? -1) < 0) || !h.flags.isAIActive) continue;
    const level = levelOf(house);
    if ((G.timerGame + house * 5) % LEVEL.period[level] !== 0) continue;
    const cy = own(house, STRUCTURE.CONSTRUCTION_YARD)[0];
    if (!cy) continue;
    const building = cy.o.linkedID !== 0xff;
    const buildable = structureGetBuildable(cy);
    for (const slot of h.ai_structureRebuild) {
      if (slot[0] === 0 || (building && G.structures[cy.o.linkedID]?.o.type === slot[0])) continue;
      if ((buildable & (1 << slot[0])) === 0 || structureIsValidBuildLocationFor(slot[1], slot[0], house) === 0) slot[0] = slot[1] = 0;
    }
    const pending = h.ai_structureRebuild.some(([t]) => t !== 0);
    // харвестеры — первыми: пока их меньше нормы и есть тяжёлый завод, новое здание не заказывается (деньги — харвестеру)
    const idle = (s: Structure) => s.o.linkedID === 0xff && s.countDown === 0 && !s.o.flags.upgrading && !s.o.flags.repairing;
    const refineries = own(house, STRUCTURE.REFINERY).length;
    const harvesters = G.unitFind.filter((u) => u.o.flags.used && u.o.houseID === house && u.o.type === UNIT.HARVESTER).length + h.harvestersIncoming;
    const heavies = own(house, STRUCTURE.HEAVY_VEHICLE);
    const needHarvester = refineries * LEVEL.harvesters[level] > harvesters && heavies.length > 0;
    if (needHarvester && h.credits > 0) {
      const heavy = heavies.find(idle);
      if (heavy && !heavies.some((s) => s.o.linkedID !== 0xff && G.units[s.o.linkedID]?.o.type === UNIT.HARVESTER)) structureBuildObject(heavy, UNIT.HARVESTER);
    }
    if (!pending && !building && !needHarvester) {
      const type = pickNext(house, buildable);
      const spot = type >= 0 ? pickSpot(house, type, cy) : -1;
      const plan = spot >= 0 ? [type, spot] : type >= 0 ? pickSlab(house, buildable, cy) : null;
      const slot = h.ai_structureRebuild.find(([t]) => t === 0);
      if (plan && slot) { slot[0] = plan[0]; slot[1] = plan[1]; }
    }
    if (!pending && !building && refineries > 0 && h.credits >= LEVEL.upgrade[level]) {
      const factory = own(house).find((s) => structureInfo[s.o.type].o.flags.factory && s.o.type !== STRUCTURE.STARPORT && idle(s) && s.upgradeTimeLeft > 0 && structureIsUpgradable(s));
      if (factory) structureSetUpgradingState(factory, 1);
    }
  }
}

/** Сеть: идёт ли у компьютера «мирное время» (новые машины охраняют базу, команды атаки не собираются). */
export function netAIPeace(house: number): boolean {
  return !!G.net && !isHuman(house) && G.timerGame < LEVEL.peace[levelOf(house)];
}

/** Можно ли заводу ИИ заказать технику (structure.ts, ветка ИИ): пока нет задела — деньги на здания. */
export function netAIMayBuildUnits(s: Structure): boolean {
  if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) return true;
  const house = s.o.houseID, h = G.houses[house], level = levelOf(house);
  // охрана: первые несколько машин — всегда
  const army = G.unitFind.filter((u) => u.o.flags.used && u.o.houseID === house && u.o.type > UNIT.CARRYALL && u.o.type < UNIT.HARVESTER).length;
  if (army < 3) return true;
  if (h.credits >= LEVEL.reserve[level]) return true;
  // ниже запаса деньги идут сначала на харвестеры и здания: заказано здание или харвестеров мало — техники нет
  const harvesters = G.unitFind.filter((u) => u.o.flags.used && u.o.houseID === house && u.o.type === UNIT.HARVESTER).length + h.harvestersIncoming;
  if (own(house, STRUCTURE.REFINERY).length * LEVEL.harvesters[level] > harvesters) return false;
  const cy = own(house, STRUCTURE.CONSTRUCTION_YARD)[0];
  if (cy && (cy.o.linkedID !== 0xff || h.ai_structureRebuild.some(([t]) => t !== 0))) return false;
  const seen = new Map<number, number>();
  for (const type of buildOrder(house).slice(0, LEVEL.core[level])) {
    const need = (seen.get(type) ?? 0) + 1;
    seen.set(type, need);
    if (own(house, type).length < need) return false;
  }
  return true;
}

/** Двор ИИ поставил здание (structure.ts): к заводу очистки — харвестер с перевозчиком, как у человека. */
export function netAIStructurePlaced(s: Structure): void {
  if (s.o.type !== STRUCTURE.REFINERY) return;
  G.validateStrictIfZero++;
  const u = unitCreateWrapper(s.o.houseID, UNIT.HARVESTER, indexEncode(s.o.index, IT.STRUCTURE));
  G.validateStrictIfZero--;
  if (!u) G.houses[s.o.houseID].harvestersIncoming++;
  else u.originEncoded = indexEncode(s.o.index, IT.STRUCTURE);
}

/** Команды атаки для домов ИИ: по очереди первая команда каждого дома, потом вторая… (пул команд — 16). */
export function netCreateAITeams(houses: number[]): void {
  TEAMS.forEach(([action, movement, min, max], i) => {
    for (const house of houses) {
      const level = levels[house];
      if (i < LEVEL.teams[level]) teamCreate(house, action, movement, min, max + (level === 2 ? 2 : 0));
    }
  });
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
    // дом ИИ: заказы игрока снимаются (оплаченное возвращается), дальше — строитель, заводы и команды ИИ
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
