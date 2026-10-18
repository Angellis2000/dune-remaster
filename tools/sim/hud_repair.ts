// Полоса ремонтного завода: $048926 сохраняет начальное время, $02976C вычитает остаток.
// node --experimental-transform-types tools/sim/hud_repair.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { G, STRUCTURE, UNIT } from "../../web/src/engine/core.ts";
import { Game } from "../../web/src/engine/game.ts";
import { unitEnterStructure } from "../../web/src/engine/unit.ts";
import { DuneRom } from "../../web/src/rom/dune.ts";
import { barFill, hudState } from "../../web/src/ui/hud.ts";

const rom = new DuneRom(new Uint8Array(readFileSync(new URL("../../rom/dune_usa.gen", import.meta.url))));
const game = new Game(rom);
// Эталон получен вызовом $04880A в Genesis Plus GX: трицикл 100 HP, время стройки 10.
for (const [hp, expectedTime] of [[50, 320], [99, 5], [100, 1], [1, 632]]) {
  game.load("A", 1);
  const facility = G.structureFind.find((s) => s.o.houseID === G.playerHouseID && s.o.type === STRUCTURE.CONSTRUCTION_YARD)!;
  const unit = G.unitFind.find((u) => u.o.houseID === G.playerHouseID && u.o.type === UNIT.TRIKE)!;
  facility.o.type = STRUCTURE.REPAIR;
  unit.o.hitpoints = hp;
  unitEnterStructure(unit, facility);
  assert.equal(unit.repairTime, expectedTime);
  assert.equal(facility.countDown, expectedTime);
  assert.equal(unit.o.hitpoints, 100);
  assert.equal(facility.o.linkedID, unit.o.index);
  assert.deepEqual(hudState(rom, facility, null).bar, { value: 0, max: expectedTime, color: 7, y: 112 });
  facility.countDown = Math.floor(expectedTime / 2);
  assert.deepEqual(hudState(rom, facility, null).bar, { value: expectedTime - facility.countDown, max: expectedTime, color: 7, y: 112 });
  facility.countDown = 0;
  const full = hudState(rom, facility, null).bar!;
  assert.equal(barFill(full.value, full.max), 31);
  facility.o.linkedID = 0xff;
  assert.equal(hudState(rom, facility, null).bar, null);
  game.load("A", 1);
  assert(G.units.every((u) => u.repairTime === 0));
  console.log(`ok ремонт ${hp}/100: максимум ${expectedTime}, ход, завершение, выход и сброс миссии`);
}
