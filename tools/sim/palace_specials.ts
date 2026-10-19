// node --experimental-transform-types tools/sim/palace_specials.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DuneRom } from '../../web/src/rom/dune.ts';
import { Game } from '../../web/src/engine/game.ts';
import { ACTION, G, HOUSE_WEAPON, INDEX_INVALID, STRUCTURE, UNIT, packTile, packXY, unpackTile } from '../../web/src/engine/core.ts';
import { houseInfo } from '../../web/src/engine/tables.ts';
import { structureCreate, structureFindFreePosition } from '../../web/src/engine/structure.ts';

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen', import.meta.url))));

function scenario(house: number, local: number) {
  const game = new Game(rom);
  game.loadNetwork({ map: 5, seed: 20261019, credits: 50000, local, players: [
    { slot: 0, house, name: 'Owner', team: 0 },
    { slot: 1, house: (house + 1) % 6, name: 'Opponent', team: 1 },
  ] });
  const yard = G.structureFind.find((s) => s.o.houseID === house && s.o.type === STRUCTURE.CONSTRUCTION_YARD)!;
  const palace = structureCreate(INDEX_INVALID, STRUCTURE.PALACE, house, INDEX_INVALID)!;
  assert.ok(palace);
  palace.o.position = { ...yard.o.position };
  palace.o.flags.isNotOnMap = false;
  G.houses[house].palacePosition = { ...palace.o.position };
  // Guarantee a free walkable cell at the exit; this test isolates the power
  // from procedural terrain and leaves the existing yard footprint occupied.
  let exit = structureFindFreePosition(palace, false);
  assert.ok(exit, `house ${house}: no palace exit in fixture`);
  return { game, palace, exit };
}

for (let house = 0; house < 6; house++) {
  const hashes: number[] = [];
  for (const local of [house, (house + 1) % 6]) {
    const { game, palace, exit } = scenario(house, local);
    const before = new Set(G.unitFind);
    const target = packXY(32, 32);
    game.execNet(house, { k: 'palace', s: palace.o.index, p: target });
    assert.ok(palace.countDown > 0, `house ${house}: power did not start cooldown`);
    const created = G.unitFind.filter((u) => !before.has(u));
    assert.ok(created.length > 0, `house ${house}: power created nothing`);
    assert.ok(created.every((u) => u.o.houseID === house), `house ${house}: wrong reinforcement owner`);
    if (houseInfo[house].specialWeapon === HOUSE_WEAPON.FREMEN) {
      assert.ok(created.every((u) => u.o.type === UNIT.TROOPER || u.o.type === UNIT.TROOPERS));
      assert.ok(created.every((u) => u.actionID === ACTION.GUARD));
      const unit = created[0];
      game.execNet(house, { k: 'order', u: [unit.o.index], a: ACTION.MOVE, p: exit });
      assert.ok(unit.targetMove !== 0, `house ${house}: Fremen move order ignored`);
      game.execNet(house, { k: 'act', u: [unit.o.index], a: ACTION.GUARD });
      assert.equal(unit.targetMove, 0, `house ${house}: Fremen guard order ignored`);
    } else if (houseInfo[house].specialWeapon === HOUSE_WEAPON.SABOTEUR) {
      assert.equal(created[0].o.type, UNIT.SABOTEUR);
      assert.equal(created[0].actionID, ACTION.GUARD);
      game.execNet(house, { k: 'order', u: [created[0].o.index], a: ACTION.MOVE, p: target });
      assert.ok(created[0].targetMove !== 0, `house ${house}: saboteur move order ignored`);
    } else {
      assert.ok(created.some((u) => u.o.type === UNIT.MISSILE_HOUSE));
      assert.equal(G.unitHouseMissile, null, 'missile must launch immediately after network target command');
      assert.equal(G.houseMissileCountdown, 0);
    }
    const count = G.unitFind.length;
    game.execNet(house, { k: 'palace', s: palace.o.index, p: packTile(unpackTile(target)) });
    assert.equal(G.unitFind.length, count, `house ${house}: power repeated during cooldown`);
    for (let i = 0; i < 120; i++) game.tick();
    hashes.push(game.netHash());
  }
  assert.equal(hashes[0], hashes[1], `house ${house}: local player affects palace simulation`);
  console.log(`house ${house}: power ${houseInfo[house].specialWeapon}, ownership, orders, cooldown, deterministic ticks OK`);
}
