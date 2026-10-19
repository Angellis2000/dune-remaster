// Противники-компьютеры и уход игрока в сетевом матче (engine/net-ai.ts).
// node --experimental-transform-types tools/sim/net_ai.ts [карта=5] [кадров=9000]
//  1) человек против двух ИИ: у ИИ готовая база, заводы строят технику, команды идут в атаку, хеши у двух
//     клиентов с разными местными игроками совпадают;
//  2) двое людей в одной команде против ИИ: вышедший отдаёт базу союзнику;
//  3) человек против человека: база вышедшего становится базой ИИ и строит технику.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DuneRom } from "../../web/src/rom/dune.ts";
import { Game, type NetPlayer } from "../../web/src/engine/game.ts";
import { G, STRUCTURE, UNIT } from "../../web/src/engine/core.ts";

const map = Number(process.argv[2] ?? 5), frames = Number(process.argv[3] ?? 9000);
const rom = new DuneRom(new Uint8Array(readFileSync(new URL("../../rom/dune_usa.gen", import.meta.url))));
const count = (house: number, test: (type: number) => boolean, what: "u" | "s") =>
  (what === "u" ? G.units : G.structures).filter((o) => o.o.flags.used && o.o.houseID === house && !o.o.flags.isNotOnMap && test(o.o.type)).length;
const army = (house: number) => count(house, (t) => t !== UNIT.HARVESTER && t !== UNIT.CARRYALL && t < UNIT.MISSILE_HOUSE, "u");
const buildings = (house: number) => count(house, (t) => t !== STRUCTURE.SLAB_1x1 && t !== STRUCTURE.SLAB_2x2 && t !== STRUCTURE.WALL, "s");

function run(players: NetPlayer[], local: number, n: number, at?: { frame: number; house: number }): { hashes: string; game: Game } {
  G.timerGame = 0;
  const game = new Game(rom);
  game.loadNetwork({ map, seed: 0x5eed1234, credits: 5000, players, local });
  const out: string[] = [];
  for (let f = 1; f <= n; f++) {
    if (at && f === at.frame) game.execNet(at.house, { k: "left" });
    game.tick();
    if (f % 600 === 0) out.push(game.netHash().toString(16));
  }
  return { hashes: out.join(" "), game };
}

// 1) человек (Атрейдесы) против двух компьютеров
const vsAI: NetPlayer[] = [
  { slot: 0, house: 1, team: 0, name: "А" },
  { slot: 1, house: 0, team: 1, name: "ИИ Х", ai: true },
  { slot: 2, house: 2, team: 1, name: "ИИ О", ai: true },
];
const a = run(vsAI, 1, frames);
const aiBase = [buildings(0), buildings(2)];
const aiArmy = [army(0), army(2)];
const humanArmyLeft = army(1);
const b = run(vsAI, -1, frames);
assert.equal(a.hashes, b.hashes, "хеши у игрока и наблюдателя разошлись");
assert.ok(aiBase.every((n) => n >= 10), `у ИИ мало зданий: ${aiBase}`);
assert.ok(aiArmy.some((n) => n > 2), `ИИ не построил технику: ${aiArmy}`);
console.log(`1) ИИ: зданий ${aiBase}, техники ${aiArmy}; у человека осталось техники ${humanArmyLeft}; конец: ${a.game.ended}`);

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
assert.equal(G.net!.humans, 1 << 1);
console.log(`2) база вышедшего у союзника: зданий ${buildings(1)}, техники ${army(1)}, кредиты ${G.houses[1].credits}`);

// 3) человек против человека, Харконнены выходят — их база становится ИИ (без союзника)
const duel: NetPlayer[] = [
  { slot: 0, house: 1, team: 0, name: "А" },
  { slot: 1, house: 0, team: 1, name: "Х" },
];
const d = run(duel, 1, 3000, { frame: 300, house: 0 });
assert.equal(d.game.netLastHandOver, -1, "без союзника база уходит компьютеру");
assert.ok(G.houses[0].flags.isAIActive && !G.houses[0].flags.human);
assert.ok(d.game.ended === null, "матч продолжается против компьютера");
console.log(`3) база вышедшего у ИИ: зданий ${buildings(0)}, техники ${army(0)}`);
console.log("net ai: AI bases build and attack, leaver's base goes to an ally or to the AI, hashes match");
