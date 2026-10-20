import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DuneRom } from '../src/rom/dune.ts';
import { World } from '../src/game/world.ts';
import { ACTION, G, STRUCTURE, UNIT, packTile } from '../src/engine/core.ts';

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen', import.meta.url))));
const players = [
  { slot: 0, house: 1, team: 0, name: 'А' },
  { slot: 1, house: 0, team: 1, name: 'Х' },
  { slot: 2, house: 2, team: 1, name: 'О' },
];
const cyTile = (house: number) => {
  const s = G.structures.find((s) => s.o.flags.used && s.o.houseID === house && s.o.type === STRUCTURE.CONSTRUCTION_YARD)!;
  return packTile(s.o.position);
};
const seen = (packed: number, house: number) => ((G.map[packed].unveiledHouses >> house) & 1) === 1;

/** Матч трёх игроков: квадроциклы дома 1 едут к двору дома 0. Возвращает хеши и маски по ходу игры. */
function play(local: number, frames: number, check?: (world: World, frame: number) => void) {
  G.timerGame = 0;
  const world = new World(rom);
  world.loadNetwork({ map: 5, seed: 0x5eed1234, credits: 5000, players, local });
  const hashes: number[] = [];
  for (let f = 1; f <= frames; f++) {
    if (f === 30) {
      const target = cyTile(0);
      for (const u of G.units) if (u.o.flags.used && u.o.houseID === 1 && u.o.type === UNIT.QUAD) world.game.order(u, ACTION.MOVE, target, 1);
    }
    world.step();
    if (f % 100 === 0) {
      world.sync();
      check?.(world, f);
      hashes.push(world.game.netHash());
    }
  }
  return { hashes, masks: G.map.map((t) => t.unveiledHouses) };
}

test('network fog: each house unveils only its own surroundings, the simulation ignores who watches', () => {
  G.timerGame = 0;
  const world = new World(rom);
  world.loadNetwork({ map: 5, seed: 0x5eed1234, credits: 5000, players, local: 1 });
  for (const p of players) {
    assert.ok(seen(cyTile(p.house), p.house), `дом ${p.house} видит свой двор`);
    for (const q of players) if (q.house !== p.house) assert.equal(seen(cyTile(q.house), p.house),p.team===q.team, `видимость двора дома ${q.house} для ${p.house} соответствует союзу`);
  }
  // общий слой движка открыт, как на этапе 1: стены, кратеры и черви от тумана не зависят
  assert.ok(G.map.every((t) => t.isUnveiled && t.overlayTileID !== G.veiledTileID));

  // экран местного игрока 1: туман по его маске, чужих юнитов в тумане нет
  for (let i = 0; i < 4096; i++) assert.equal(world.map.unveiled[i], seen(i, 1) ? 1 : 0);
  assert.equal(world.map.overlay[cyTile(0)], G.veiledTileID);
  assert.ok(!world.units.some((u) => u.house !== 1));
  assert.ok(world.game.selectAt(cyTile(0)) === null, 'двор в тумане не выбирается');

  // наблюдатель видит всё, что раскрыли люди
  const hash = world.game.netHash();
  G.net!.view = G.net!.humans;
  world.sync();
  assert.equal(world.map.unveiled[cyTile(0)], 1);
  assert.equal(world.game.netHash(), hash, 'смена зрителя не меняет симуляцию');
});

test('network fog: a scout unveils its path for its own house only; hashes and masks match for every local player', () => {
  const visibleOnly = (house: number) => (world: World) => {
    for (let i = 0; i < 4096; i++) assert.equal(world.map.unveiled[i], seen(i, house) ? 1 : 0);
    for (const u of world.units) assert.ok(seen(packTile(u.ref.o.position), house), 'на экране только юниты в раскрытых клетках');
  };
  const a = play(1, 1500, visibleOnly(1));
  const scouts = G.units.filter((u) => u.o.flags.used && u.o.houseID === 1 && u.o.type === UNIT.QUAD).map((u) => packTile(u.o.position));
  assert.ok(scouts.length > 0);
  for (const p of scouts) {
    assert.ok(a.masks[p] & (1 << 1), 'разведчик раскрыл свою клетку');
    assert.equal(a.masks[p] & ((1 << 0) | (1 << 2)), 0, 'противники не видят то, что разведал дом 1');
  }
  assert.ok(a.masks.some((m) => (m & 2) && !(m & 4)) && a.masks.some((m) => (m & 4) && !(m & 2)), 'у домов разные маски');
  const b = play(0, 1500, visibleOnly(0));
  const c = play(-1, 1500);
  assert.deepEqual(b.hashes, a.hashes);
  assert.deepEqual(c.hashes, a.hashes);
  assert.deepEqual(b.masks, a.masks);
});
