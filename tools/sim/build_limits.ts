// Ограничения списка двора по коду MD ($00FECC…$01001A): второй дворец и космопорт не строятся,
// при 70 постройках (без плит и стен) — только плиты и стены. node --experimental-transform-types tools/sim/build_limits.ts
import { readFileSync } from "node:fs";
import { DuneRom } from "../../web/src/rom/dune.ts";
import { Game } from "../../web/src/engine/game.ts";
import { G, STRUCTURE } from "../../web/src/engine/core.ts";
import { structureCreate, structureGetBuildable, structurePoolFull } from "../../web/src/engine/structure.ts";
const rom = new DuneRom(new Uint8Array(readFileSync(new URL("../../rom/dune_usa.gen", import.meta.url))));
const g = new Game(rom);
g.load("A", 9);
G.houses[G.playerHouseID].credits = 99999;
const yard = G.structures.find((s) => s.o.flags.used && s.o.houseID === G.playerHouseID && s.o.type === STRUCTURE.CONSTRUCTION_YARD)!;
// открыть всё, что позволяет миссия: все постройки «есть», двор улучшен
G.houses[G.playerHouseID].structuresBuilt = 0x7ffff;
yard.upgradeLevel = 3;
const has = (t: number) => (structureGetBuildable(yard) & (1 << t)) !== 0;
let bad = 0;
const check = (name: string, ok: boolean) => { if (!ok) bad++; console.log(ok ? "ok  " : "FAIL", name); };
const hadPalace = G.structures.some((s) => s.o.flags.used && s.o.houseID === G.playerHouseID && s.o.type === STRUCTURE.PALACE);
console.log("дворец уже есть:", hadPalace, "в списке:", has(STRUCTURE.PALACE), "космопорт в списке:", has(STRUCTURE.STARPORT));
if (!hadPalace && has(STRUCTURE.PALACE)) {
  structureCreate(0xffff, STRUCTURE.PALACE, G.playerHouseID, 0xffff);
  check("строящийся дворец убирает дворец из списка", !has(STRUCTURE.PALACE));
} else check("при своём дворце его нет в списке", !hadPalace || !has(STRUCTURE.PALACE));
while (!structurePoolFull()) if (!structureCreate(0xffff, STRUCTURE.SILO, G.playerHouseID, 0xffff)) break;
const mask = structureGetBuildable(yard);
check(`при 70 постройках только плиты и стены (маска ${mask.toString(16)})`, structurePoolFull() && (mask & ~((1 << STRUCTURE.SLAB_2x2) | (1 << STRUCTURE.WALL))) === 0);
process.exit(bad ? 1 : 0);
