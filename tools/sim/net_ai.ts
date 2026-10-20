// Противники-компьютеры, строитель ИИ и уход игрока (engine/net-ai.ts).
// node --experimental-transform-types tools/sim/net_ai.ts [карта=5]
//  1) человек против тяжёлого и лёгкого компьютера: оба начинают с двора и двух квадроциклов и строятся сами,
//     тяжёлый развивается быстрее; хеши у игрока и наблюдателя совпадают;
//  2) двое людей в одной команде против ИИ: вышедший отдаёт базу союзнику;
//  3) человек против человека: база вышедшего становится базой ИИ и сама строится дальше;
//  4) правило постановки: на клетку с чужим юнитом здание не ставится (ни у кого);
//  5) обычная миссия: дом ИИ достраивает базу, прогон детерминирован.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DuneRom } from "../../web/src/rom/dune.ts";
import { Game, type NetPlayer } from "../../web/src/engine/game.ts";
import { ACTION, G, INDEX_INVALID, STRUCTURE, UNIT, packXY, tileCenter, unpackTile } from "../../web/src/engine/core.ts";
import { structureCreate, structurePlace } from "../../web/src/engine/structure.ts";
import { unitCreate } from "../../web/src/engine/unit.ts";

const map = Number(process.argv[2] ?? 5);
const rom = new DuneRom(new Uint8Array(readFileSync(new URL("../../rom/dune_usa.gen", import.meta.url))));
const count = (house: number, test: (type: number) => boolean, what: "u" | "s") =>
  (what === "u" ? G.units : G.structures).filter((o) => o.o.flags.used && o.o.houseID === house && !o.o.flags.isNotOnMap && test(o.o.type)).length;
const army = (house: number) => count(house, (t) => t !== UNIT.HARVESTER && t !== UNIT.CARRYALL && t < UNIT.MISSILE_HOUSE, "u");
const buildings = (house: number) => count(house, (t) => t !== STRUCTURE.SLAB_1x1 && t !== STRUCTURE.SLAB_2x2 && t !== STRUCTURE.WALL, "s");

function run(players: NetPlayer[], local: number, n: number, at?: { frame: number; house: number }, probe?: (f: number) => void) {
  G.timerGame = 0;
  const game = new Game(rom);
  game.loadNetwork({ map, seed: 0x5eed1234, credits: 5000, players, local });
  const out: string[] = [];
  for (let f = 1; f <= n; f++) {
    if (at && f === at.frame) game.execNet(at.house, { k: "left" });
    game.tick();
    if (f % 600 === 0) out.push(game.netHash().toString(16));
    probe?.(f);
  }
  return { hashes: out.join(" "), game };
}

// 1) человек (Атрейдесы) против тяжёлого Харконнена и лёгкого Ордоса
const vsAI: NetPlayer[] = [
  { slot: 0, house: 1, team: 0, name: "А" },
  { slot: 1, house: 0, team: 1, name: "ИИ тяжёлый", ai: true, difficulty: 2 },
  { slot: 2, house: 2, team: 1, name: "ИИ лёгкий", ai: true, difficulty: 0 },
];
const growth: string[] = [];
const atStart = { hard: 0, easy: 0 };
let huntingInPeace = 0;
const a = run(vsAI, 1, 18000, undefined, (f) => {
  if (f === 1) { atStart.hard = buildings(0); atStart.easy = buildings(2); }
  // «мирное время» тяжёлого — 4 минуты (14400 кадров): ни одна машина компьютера не на охоте
  if (f < 14400 && f % 300 === 0) huntingInPeace += G.units.filter((u) => u.o.flags.used && (u.o.houseID === 0 || u.o.houseID === 2) && u.actionID === ACTION.HUNT).length;
  if (f % 3600 === 0) growth.push(`${f / 3600} мин: тяжёлый ${buildings(0)} зд/${army(0)} тех/${G.units.filter((u)=>u.o.flags.used&&u.o.houseID===0&&u.o.type===UNIT.HARVESTER).length} харв/${G.houses[0].credits} кр, лёгкий ${buildings(2)} зд/${army(2)} тех/${G.units.filter((u)=>u.o.flags.used&&u.o.houseID===2&&u.o.type===UNIT.HARVESTER).length} харв/${G.houses[2].credits} кр`);
});
const final = { hard: buildings(0), easy: buildings(2) };
console.log("1)", growth.join("; "), `; конец: ${a.game.ended}`);
const b = run(vsAI, -1, 18000);
assert.equal(a.hashes, b.hashes, "хеши у игрока и наблюдателя разошлись");
assert.equal(atStart.hard, 1, "компьютер начинает только с двора");
assert.equal(huntingInPeace, 0, "в мирное время машины компьютера не должны охотиться");
assert.ok(final.hard >= 8, `тяжёлый мало построил: ${final.hard}`);
assert.ok(final.easy >= 4, `лёгкий не строится: ${final.easy}`);
assert.ok(final.hard > final.easy, "тяжёлый должен развиваться быстрее лёгкого");

// 2) двое людей против ИИ, Харконнены выходят на 900-м кадре — база уходит Атрейдесам
const coop: NetPlayer[] = [
  { slot: 0, house: 1, team: 0, name: "А" },
  { slot: 1, house: 0, team: 0, name: "Х" },
  { slot: 3, house: 2, team: 1, name: "ИИ О", ai: true },
];
const c = run(coop, 1, 1200, { frame: 900, house: 0 });
assert.equal(c.game.netLastHandOver, 1, "база должна уйти союзнику");
assert.equal(buildings(0) + army(0), 0, "у вышедшего ничего не осталось");
assert.ok(buildings(1) >= 2, "двор вышедшего теперь у союзника");
console.log(`2) база вышедшего у союзника: зданий ${buildings(1)}, техники ${army(1)}`);

// 3) человек против человека, Харконнены выходят — их база становится ИИ и строится дальше
const duel: NetPlayer[] = [
  { slot: 0, house: 1, team: 0, name: "А" },
  { slot: 1, house: 0, team: 1, name: "Х" },
];
const d = run(duel, 1, 9000, { frame: 300, house: 0 });
assert.equal(d.game.netLastHandOver, -1, "без союзника база уходит компьютеру");
assert.ok(G.houses[0].flags.isAIActive && !G.houses[0].flags.human);
assert.ok(buildings(0) >= 4, `база, отданная компьютеру, не строится: ${buildings(0)}`);
console.log(`3) база вышедшего у ИИ: зданий ${buildings(0)}, техники ${army(0)}`);

// 4) правило постановки: чужой юнит на клетке — здание не встаёт (и у ИИ, который раньше давил юниты)
{
  const e = run(vsAI, 1, 1);
  const cy = G.structures.find((s) => s.o.flags.used && s.o.houseID === 0 && s.o.type === STRUCTURE.CONSTRUCTION_YARD)!;
  const x = (cy.o.position.x >> 8) + 3, y = cy.o.position.y >> 8;
  const enemy = unitCreate(INDEX_INVALID, UNIT.QUAD, 1, tileCenter(unpackTile(packXY(x, y))), 0)!;
  const s = structureCreate(INDEX_INVALID, STRUCTURE.WINDTRAP, 0, 0xffff);
  assert.equal(structurePlace(s, packXY(x, y)), false, "ветряк ИИ встал на чужой квадроцикл");
  assert.ok(enemy.o.flags.used, "чужой юнит раздавлен");
  void e;
  console.log("4) на клетку с чужим юнитом здание не ставится");
}

// 5) обычная миссия: дом ИИ достраивает базу (с момента, как ИИ активен), прогон повторяется побитно
function campaign(): { hash: string; before: number; after: number; house: number } {
  G.timerGame = 0;
  const game = new Game(rom);
  game.load("A", 4);
  const house = G.houses.find((h) => h.flags.used && h.index !== G.playerHouseID && G.structures.some((s) => s.o.flags.used && s.o.houseID === h.index && s.o.type === STRUCTURE.CONSTRUCTION_YARD))!.index;
  G.houses[house].flags.isAIActive = true;
  const before = buildings(house);
  for (let f = 0; f < 12000; f++) game.tick();
  return { hash: game.netHash().toString(16), before, after: buildings(house), house };
}
const m1 = campaign(), m2 = campaign();
assert.equal(m1.hash, m2.hash, "обычная миссия недетерминирована");
assert.ok(m1.after > m1.before, `ИИ в миссии не достроился: ${m1.before} → ${m1.after}`);
console.log(`5) миссия A4: дом ${m1.house} — зданий ${m1.before} → ${m1.after}`);
console.log("net ai: AI builds from scratch by difficulty, leaver's base goes to an ally or to the AI, no building on foreign units, campaign AI builds");
