/** Аудит 2026-10-20, п. 12: «Враг поблизости» в сети — только у своей базы, у союзной — тишина, без спама. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DuneRom } from '../src/rom/dune.ts';
import { World } from '../src/game/world.ts';
import { G, INDEX_INVALID, STRUCTURE, UNIT, tileCenter, unpackTile, packXY } from '../src/engine/core.ts';
import { unitCreate, unitHouseUnitCountAdd } from '../src/engine/unit.ts';

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen', import.meta.url))));

test('enemy warning only near the local player\'s own base; shared vision of an ally base stays quiet', () => {
  const players = [
    { slot: 0, house: 1, team: 0, name: 'A' }, { slot: 1, house: 2, team: 0, name: 'O' },
    { slot: 2, house: 0, team: 1, name: 'H' }, { slot: 3, house: 3, team: 1, name: 'F' },
  ];
  const w = new World(rom);
  w.loadNetwork({ map: 7, seed: 5, credits: 5000, local: 1, players });
  const said: number[] = [], before = G.onFeedback;
  G.onFeedback = (id) => said.push(id);
  try {
    const yardOf = (h: number) => G.structures.find(s => s.o.flags.used && s.o.houseID === h && s.o.type === STRUCTURE.CONSTRUCTION_YARD)!;
    const enemyAt = (h: number, dy = 1) => { const y = yardOf(h); const u = unitCreate(INDEX_INVALID, UNIT.QUAD, 0, tileCenter(unpackTile(packXY((y.o.position.x >> 8) + 3, (y.o.position.y >> 8) + dy))), 0)!; u.o.seenByHouses = 0; return u; }; // как при выходе из тумана
    const h1 = G.houses[1];
    h1.timerUnitAttack = 0;
    unitHouseUnitCountAdd(enemyAt(2), 1);
    assert.deepEqual(said, [], 'enemy at the ally base: silence for me');
    h1.timerUnitAttack = 0;
    unitHouseUnitCountAdd(enemyAt(1), 1);
    assert.equal(said.length, 1, 'enemy at my base: one warning');
    unitHouseUnitCountAdd(enemyAt(1, 2), 1);
    assert.equal(said.length, 1, 'no spam while the warning timer runs');
  } finally { G.onFeedback = before; }
});
