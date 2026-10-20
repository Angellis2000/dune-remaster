/**
 * Аудит сети 2026-10-20, ошибки P1: (1) группа больше 64 теряла приказ после 64-го юнита — сессия склеивала пакеты
 * controls обратно в один, движок брал 64; (2) приказ без цели (охрана, стоп) уходил отдельной командой на каждого
 * юнита и упирался в лимит сервера 24 команды за ход; (3) неполная команда `{k:'order',a,p}` без u роняла ход.
 * Путь проверяется целиком: интерфейс → installNetControls → NetSession → настоящий сервер → второй клиент →
 * execNet, у обоих зрителей одинаковые хеши.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import WebSocket from '../../server/node_modules/ws/wrapper.mjs';
import { startServer, cleanCommand } from '../../server/dune-net.mjs';
import { DuneRom } from '../src/rom/dune.ts';
import { World } from '../src/game/world.ts';
import { ACTION, G, INDEX_INVALID, UNIT, packXY, tileCenter, unpackTile, type Unit } from '../src/engine/core.ts';
import { netCommandValid, type NetCommand } from '../src/engine/game.ts';
import { unitCreate, unitGetHouseID } from '../src/engine/unit.ts';
import { installNetControls } from '../src/net/controls.ts';
import { NetSession, NET_GROUP } from '../src/net/session.ts';

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen', import.meta.url))));
const waitFor = async (condition: () => boolean) => {
  const end = Date.now() + 6000;
  while (!condition()) { if (Date.now() > end) throw Error('network condition timed out'); await new Promise(r => setTimeout(r, 5)); }
};

/** Сетевой матч 1×1 и n квадроциклов дома 1 (детерминированно — одинаково у обоих «зрителей»). */
function world(n: number): { world: World; units: Unit[] } {
  const w = new World(rom);
  w.loadNetwork({ map: 5, seed: 20261020, credits: 50000, local: 1, players: [
    { slot: 0, house: 1, team: 0, name: 'A' }, { slot: 1, house: 0, team: 1, name: 'H' },
  ] });
  // вся армия дома (стартовые юниты + новые), как при выделении всех: 204 — сетевой предел юнитов игрока
  const army = () => G.units.filter(u => u.o.flags.used && u.o.flags.allocated && !u.o.flags.isNotOnMap && unitGetHouseID(u) === 1);
  for (let i = 0; army().length < n && i < 4096; i++) {
    const x = 4 + (i % 56), y = 4 + Math.floor(i / 56);
    if (!unitCreate(INDEX_INVALID, UNIT.QUAD, 1, tileCenter(unpackTile(packXY(x, y))), 0)) break;
  }
  const units = army();
  assert.equal(units.length, n, 'fixture creates the whole group');
  return { world: w, units };
}

test('large groups and per-unit orders reach every unit through the real server; both viewers agree', async () => {
  const saved = ['WebSocket', 'window', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: WebSocket });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) } });
  const server = await startServer({ port: 0, log: () => {}, turnMs: 12 });
  const sessions: NetSession[] = [];
  let clock: ReturnType<typeof setInterval> | undefined;
  const create = () => {
    const net = new NetSession(); sessions.push(net);
    const state = { room: null as any, got: [] as [number, NetCommand][] };
    net.onRoom = room => { state.room = room; };
    net.bind((slot, c) => { state.got.push([slot, structuredClone(c)]); }, () => {}, () => 0);
    return { net, state };
  };
  try {
    const url = `ws://127.0.0.1:${server.port}/ws`, a = create(), b = create();
    await a.net.connect(url, 'A'); a.net.create('Batch', 'secret', { map: 5, teamSize: 1, credits: 5000 }, 'A');
    await waitFor(() => !!a.state.room);
    storage.clear(); await b.net.connect(url, 'B'); b.net.join(a.state.room.id, 'secret', 'player', 'H');
    await waitFor(() => a.state.room.members.length === 2); a.net.startMatch(); await waitFor(() => a.net.inMatch && b.net.inMatch);
    clock = setInterval(() => { for (const { net } of [a, b]) net.advance(17); }, 5);

    // Клиент A: интерфейс отдаёт приказы своим юнитам, всё уходит через NetSession на сервер.
    const scenarios = [
      { name: 'move 100', n: 100, issue: (game: World['game'], us: Unit[]) => game.orderGroup(us, ACTION.MOVE, packXY(40, 40)) },
      { name: 'move 204', n: 204, issue: (game: World['game'], us: Unit[]) => game.orderGroup(us, ACTION.MOVE, packXY(41, 41)) },
      // ui/command.ts: кнопка действия без цели — unitCommand на каждого выделенного
      { name: 'guard 50', n: 50, issue: (game: World['game'], us: Unit[]) => { for (const u of us) game.unitCommand(u, ACTION.GUARD); } },
    ];
    for (const sc of scenarios) {
      a.state.got.length = 0; b.state.got.length = 0;
      const { world: w, units } = world(sc.n);
      const restore = installNetControls(w.game, c => a.net.command(c), () => 1);
      try { sc.issue(w.game, units); } finally { restore(); }
      const ids = new Set(units.map(u => u.o.index));
      const received = (got: [number, NetCommand][]) => got.flatMap(([, c]) => 'u' in c ? c.u : []);
      await waitFor(() => received(b.state.got).length >= ids.size && received(a.state.got).length >= ids.size);
      for (const [, c] of b.state.got) if ('u' in c) assert.ok(c.u.length <= NET_GROUP, `${sc.name}: packet of ${c.u.length} ids`);
      assert.deepEqual(new Set(received(b.state.got)), ids, `${sc.name}: every unit's id reached the other client`);
      assert.deepEqual(a.state.got, b.state.got, `${sc.name}: both viewers got the same command stream`);

      // Оба зрителя исполняют свой поток на одинаковом мире: приказ у всех, хеши совпадают.
      const hashes: number[] = [];
      for (const got of [a.state.got, b.state.got]) {
        const { world: v, units: us } = world(sc.n);
        for (const [, c] of got) v.game.execNet(1, c);
        const want = sc.name.startsWith('guard') ? ACTION.GUARD : ACTION.MOVE;
        const missed = us.filter(u => u.actionID !== want || unitGetHouseID(u) !== 1);
        assert.equal(missed.length, 0, `${sc.name}: ${missed.length} units kept no order`);
        hashes.push(v.game.netHash());
      }
      assert.equal(hashes[0], hashes[1], `${sc.name}: viewers' hashes match`);
    }
  } finally {
    clearInterval(clock); for (const net of sessions) net.close(); await server.close();
    for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});

test('malformed commands are rejected by the server and skipped by the engine; the next valid one still runs', () => {
  const bad: unknown[] = [
    { k: 'order', a: 1, p: 1000 }, { k: 'order', u: [], a: 1, p: 1 }, { k: 'order', u: [1.5], a: 1, p: 1 },
    { k: 'order', u: ['1'], a: 1, p: 1 }, { k: 'order', u: [1], a: 1, p: 5000 }, { k: 'act', u: [1] },
    { k: 'build', s: 1 }, { k: 'place', s: 1, p: -1 }, { k: 'left' }, { k: 'nope' }, null, [], 'order',
    { k: 'order', u: Array.from({ length: 65 }, (_, i) => i), a: 1, p: 1 },
  ];
  for (const c of bad) assert.equal(cleanCommand(c), null, `server rejects ${JSON.stringify(c)}`);
  assert.deepEqual(cleanCommand({ k: 'order', u: [3], a: 1, p: 7, extra: 'x' }), { k: 'order', u: [3], a: 1, p: 7 }, 'unknown fields are dropped');
  assert.deepEqual(cleanCommand({ k: 'place', s: 2, p: 9 }), { k: 'place', s: 2, p: 9 });
  assert.deepEqual(cleanCommand({ k: 'rally', s: 2, p: -1 }), { k: 'rally', s: 2, p: -1 }, 'rally −1 clears the point');
  assert.ok(netCommandValid({ k: 'rally', s: 2, p: -1 }));

  const { world: w, units } = world(3), before = w.game.netHash();
  // 65 номеров движок пропускает намеренно (старые записи матчей), он сам берёт первые 64 — сервер такое уже не пустит
  for (const c of bad) if (c && typeof c === 'object' && (c as any).k !== 'left' && !((c as any).u?.length > 64)) {
    assert.equal(netCommandValid(c), false);
    assert.doesNotThrow(() => w.game.execNet(1, c as NetCommand), `engine survives ${JSON.stringify(c)}`);
  }
  assert.equal(w.game.netHash(), before, 'skipped commands change nothing');
  w.game.execNet(1, { k: 'order', u: units.map(u => u.o.index), a: ACTION.MOVE, p: packXY(30, 30) });
  assert.ok(units.every(u => u.actionID === ACTION.MOVE), 'the next valid command executes');
  assert.ok(G.net);
});
