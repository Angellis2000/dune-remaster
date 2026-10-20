/**
 * Аудит 2026-10-20, п. 8: раскрытие тумана вокруг здания — по его площади. Своё здание видно целиком, подступы
 * раскрыты одинаково со всех сторон, ничего за границами карты, у всех клиентов одинаково.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DuneRom } from '../src/rom/dune.ts';
import { World } from '../src/game/world.ts';
import { G, STRUCTURE, packXY, unpackTile } from '../src/engine/core.ts';
import { mapIsValidPosition } from '../src/engine/map.ts';
import { structureRemoveFog } from '../src/engine/structure.ts';
import { layoutSize, structureInfo } from '../src/engine/tables.ts';

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen', import.meta.url))));
function match(local = 1) {
  const w = new World(rom);
  w.loadNetwork({ map: 5, seed: 20261020, credits: 50000, local, players: [
    { slot: 0, house: 1, team: 0, name: 'A' }, { slot: 1, house: 0, team: 1, name: 'H' },
  ] });
  for (const t of G.map) t.unveiledHouses = 0;
  return w;
}
const seen = (x: number, y: number) => (G.map[packXY(x, y)].unveiledHouses & (1 << 1)) !== 0;
/** Фиктивное здание: движку для раскрытия нужны тип, дом и позиция. */
const fake = (type: number, x: number, y: number) => ({ o: { type, houseID: 1, position: unpackTile(packXY(x, y)) } }) as any;

test('every building is fully revealed with even approaches on all sides', () => {
  match();
  for (const type of [STRUCTURE.WINDTRAP, STRUCTURE.CONSTRUCTION_YARD, STRUCTURE.REFINERY, STRUCTURE.PALACE, STRUCTURE.STARPORT,
    STRUCTURE.OUTPOST, STRUCTURE.TURRET, STRUCTURE.ROCKET_TURRET, STRUCTURE.SLAB_1x1]) {
    for (const t of G.map) t.unveiledHouses = 0;
    const size = layoutSize[structureInfo[type].layout], x0 = 30, y0 = 30;
    structureRemoveFog(fake(type, x0, y0));
    for (let y = y0; y < y0 + size.height; y++) for (let x = x0; x < x0 + size.width; x++) assert.ok(seen(x, y), `type ${type}: own cell ${x},${y}`);
    // по средней строке и столбцу: слева столько же, сколько справа; сверху — сколько снизу
    const reach = (dx: number, dy: number, sx: number, sy: number) => { let n = 0; while (seen(sx + dx * (n + 1), sy + dy * (n + 1))) n++; return n; };
    const left = reach(-1, 0, x0, y0), right = reach(1, 0, x0 + size.width - 1, y0);
    const up = reach(0, -1, x0, y0), down = reach(0, 1, x0, y0 + size.height - 1);
    assert.equal(left, right, `type ${type}: left ${left} / right ${right}`);
    assert.equal(up, down, `type ${type}: up ${up} / down ${down}`);
    assert.ok(left >= 1, `type ${type}: approaches are visible`);
    // не больше табличного радиуса от края площади
    assert.ok(left <= structureInfo[type].o.fogUncoverRadius, `type ${type}: not over-revealed (${left})`);
  }
});

test('reveal stays inside the real map bounds and is identical for every viewer', () => {
  const hashes: number[] = [];
  for (const local of [1, 0]) {
    const w = match(local);
    structureRemoveFog(fake(STRUCTURE.OUTPOST, 1, 1));
    for (let p = 0; p < 4096; p++) if (G.map[p].unveiledHouses) assert.ok(mapIsValidPosition(p), `outside the map: ${p}`);
    hashes.push(w.game.netHash());
  }
  assert.equal(hashes[0], hashes[1]);
});
