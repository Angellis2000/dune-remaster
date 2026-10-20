/** Владелец 2026-10-20: без «Свои»; «Союзник · имя · дом», «Враг · имя · дом», компьютер — по имени; вышедший помечен. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DuneRom } from '../src/rom/dune.ts';
import { World } from '../src/game/world.ts';
import { G } from '../src/engine/core.ts';
import { STRUCTURE_NAMES } from '../src/game/names.ts';
import { markPlayerLeft, relationText, setMatchPlayers } from '../src/ui/relations.ts';

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen', import.meta.url))));

test('labels name the player and house, never own objects; observers see no relation word', () => {
  const players = [
    { slot: 0, house: 1, team: 0, name: 'Я' }, { slot: 1, house: 2, team: 0, name: 'Алексей' },
    { slot: 2, house: 0, team: 1, name: 'Очень-очень длинное имя игрока' }, { slot: 3, house: 3, team: 1, name: 'Компьютер 1', ai: true, difficulty: 1 },
  ];
  new World(rom).loadNetwork({ map: 7, seed: 1, credits: 5000, local: 1, players });
  setMatchPlayers(players);
  try {
    assert.equal(relationText(1, 1), '', 'own objects carry no «Свои»');
    assert.equal(relationText(2, 1), 'Союзник · Алексей · Ордосы');
    assert.equal(relationText(3, 1), 'Враг · Компьютер 1 · Фримены');
    assert.match(relationText(0, 1), /^Враг · Очень-очень длин…· Харконнены$|^Враг · Очень-очень длинн… · Харконнены$/);
    assert.equal(relationText(2, -1), 'Алексей · Ордосы', 'observer');
    markPlayerLeft(2, null);
    assert.equal(relationText(2, 1), 'Союзник · Алексей (вышел, база у компьютера) · Ордосы');
    setMatchPlayers(null);
    assert.equal(relationText(2, 1), 'Союзник · Ордосы', 'cleared for the next match');
    assert.equal(STRUCTURE_NAMES[4], 'Тяжёлый завод');
    assert.ok(G.net);
  } finally { setMatchPlayers(null); }
});
