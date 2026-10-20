/** Аудит 2026-10-20, п. 13: вражеский пуск дворцовой ракеты — звук 27 «РУКА СМЕРТИ», как MD $023220; союзный — тишина. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DuneRom } from '../src/rom/dune.ts';
import { World } from '../src/game/world.ts';
import { G, INDEX_INVALID, STRUCTURE } from '../src/engine/core.ts';
import { structureActivateSpecial, structureCreate } from '../src/engine/structure.ts';

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen', import.meta.url))));

function launch(setup: () => void, palaceHouse: number): number[] {
  setup();
  const sounds: number[] = [], before = G.onSound;
  G.onSound = (id) => { if (id === 27) sounds.push(id); };
  try {
    const palace = structureCreate(INDEX_INVALID, STRUCTURE.PALACE, palaceHouse, INDEX_INVALID)!;
    assert.ok(palace, 'fixture palace');
    structureActivateSpecial(palace);
    assert.equal(G.unitHouseMissile, null, 'the AI launched at once');
  } finally { G.onSound = before; }
  return sounds;
}

test('an enemy Death Hand launch is announced with the ROM sound; an allied one is not', () => {
  assert.deepEqual(launch(() => new World(rom).load('A', 8), 0), [27], 'campaign: Harkonnen launches at Atreides');
  const players = [
    { slot: 0, house: 1, team: 0, name: 'A' }, { slot: 1, house: 0, team: 0, name: 'Компьютер 1', ai: true, difficulty: 1 },
    { slot: 2, house: 2, team: 1, name: 'O' },
  ];
  assert.deepEqual(launch(() => new World(rom).loadNetwork({ map: 7, seed: 3, credits: 5000, local: 1, players }), 0), [], 'network: an ally AI launch is silent for me');
});
