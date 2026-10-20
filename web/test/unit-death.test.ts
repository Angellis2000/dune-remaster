/**
 * Аудит 2026-10-20, п. 10–11: раздавленный пехотинец звучит «В ЛЕПЁШКУ!» (звук 35, $045810), убитый — «ВСКРИК» (30);
 * скрипты юнитов звуков не играют (слот 38 в MD — пустышка). Смерть честная: сообщение — в момент гибели, тело не
 * двигается и после приказа. Ячейку погибшего, занятую новым юнитом, экран не путает с прежним.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DuneRom } from '../src/rom/dune.ts';
import { World } from '../src/game/world.ts';
import { ACTION, G, INDEX_INVALID, IT, LST, UNIT, indexEncode, packXY, tileCenter, unpackTile, type Unit } from '../src/engine/core.ts';
import { mapGetLandscapeType, mapIsValidPosition } from '../src/engine/map.ts';
import { unitCreate, unitDamage, unitGetByPackedTile, unitSetAction } from '../src/engine/unit.ts';

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen', import.meta.url))));
const OPEN = [LST.NORMAL_SAND, LST.ENTIRELY_DUNE, LST.PARTIAL_DUNE, LST.ENTIRELY_ROCK, LST.MOSTLY_ROCK, LST.PARTIAL_ROCK];

/** Миссия A8 и свободная полоса клеток; tank + soldier в 3 клетках. */
function setup() {
  const w = new World(rom); w.load('A', 8);
  for (let p = 0; p < 4096; p++) {
    const x = p & 63, y = p >> 6;
    if (x < 8 || y < 8 || x > 50 || y > 50) continue;
    let ok = true;
    for (let k = -1; k <= 4; k++) for (const dy of [-1, 0, 1]) {
      const q = packXY(x + k, y + dy);
      if (!mapIsValidPosition(q) || !OPEN.includes(mapGetLandscapeType(q)) || unitGetByPackedTile(q) || G.map[q].hasStructure) ok = false;
    }
    if (!ok) continue;
    const tank = unitCreate(INDEX_INVALID, UNIT.TANK, 1, tileCenter(unpackTile(packXY(x, y))), 64);
    const soldier = unitCreate(INDEX_INVALID, UNIT.SOLDIER, 0, tileCenter(unpackTile(packXY(x + 3, y))), 0);
    if (tank && soldier) return { w, tank, soldier, x, y };
  }
  throw Error('no open strip');
}
const run = (w: World, s: Unit, max = 1200) => { for (let i = 0; i < max && s.o.flags.used; i++) w.game.tick(); };

test('crushed infantry squishes (35), shot infantry screams (30); scripts play no unit voices', () => {
  const a = setup(), sounds: number[] = [];
  G.onSound = (id) => { if (id >= 30 && id <= 35) sounds.push(id); };
  a.tank.targetMove = indexEncode(packXY(a.x + 3, a.y), IT.TILE); unitSetAction(a.tank, ACTION.MOVE);
  unitSetAction(a.soldier, ACTION.GUARD);
  run(a.w, a.soldier);
  assert.equal(a.soldier.o.flags.used, false, 'the tank crushed the soldier');
  assert.deepEqual(sounds, [35]);

  const b = setup(), shot: number[] = [];
  G.onSound = (id) => { if (id >= 30 && id <= 35) shot.push(id); };
  unitDamage(b.soldier, 500, 0);
  run(b.w, b.soldier);
  assert.deepEqual(shot, [30]);
});

test('death is real when announced: the body stays put and ignores orders', () => {
  const a = setup(), lost: number[] = [];
  G.onFeedback = () => lost.push(G.timerGame);
  const s = a.soldier, at = { ...s.o.position };
  unitDamage(s, s.o.hitpoints - 1, 0);
  assert.equal(lost.length, 0, 'no death message while alive at 1 HP');
  assert.ok(s.o.hitpoints > 0 && s.actionID !== ACTION.DIE);
  unitDamage(s, 1, 0);
  assert.equal(lost.length, 1, 'the message comes at the real death');
  a.w.game.orderGroup([s], ACTION.MOVE, packXY(a.x + 3, a.y + 5), 0);
  for (let i = 0; i < 60 && s.o.flags.used; i++) { a.w.game.tick(); assert.deepEqual(s.o.position, at, 'the dead body does not move'); }
  assert.equal(s.o.flags.used, false);
});

test('a new unit in a dead unit\'s pool slot gets its own view, not the corpse\'s', () => {
  const a = setup(), s = a.soldier, reveal = G.revealAll;
  G.revealAll = true;
  try {
  a.w.sync();
  const old = a.w.units.find((v) => v.ref === s)!, slot = s.o.index;
  assert.ok(old);
  unitDamage(s, 500, 0);
  run(a.w, s);
  // без синхронизации экрана: ячейка освобождена и сразу занята (быстрая скорость, догон в сети)
  G.houses[0].unitCountMax = 255;
  const fresh = unitCreate(slot, UNIT.SOLDIER, 0, tileCenter(unpackTile(packXY(a.x + 3, a.y + 1))), 0)!;
  assert.equal(fresh, s, 'fixture reuses the same pool object');
  a.w.sync();
  const now = a.w.units.find((v) => v.ref === fresh)!;
  assert.notEqual(now.id, old.id, 'a new view id');
  assert.equal(now.x, fresh.o.position.x / 8, 'no glide from the corpse position');
  } finally { G.revealAll = reveal; }
});
