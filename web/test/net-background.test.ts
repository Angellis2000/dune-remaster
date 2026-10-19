import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NetSession } from '../src/net/session.ts';

test('hidden network client consumes server turns and preserves command order', () => {
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const visibility = { hidden: true };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: visibility });
  try {
    const net = new NetSession();
    // Deliver the same protocol messages as WebSocket.onmessage, without a browser.
    const receive = (net as unknown as { receive(msg: object): void }).receive.bind(net);
    let ticks = 0;
    const applied: number[] = [];
    net.bind((_slot, command) => {
      assert.equal(command.k, 'build');
      if (command.k === 'build') applied.push(command.t);
    }, () => ticks++, () => ticks);
    receive({ t: 'start', seed: 1, you: null, players: [], config: { map: 5, credits: 5000, teamSize: 1 }, turnMs: 100, framesPerTurn: 6 });
    for (let n = 0; n < 600; n++) {
      receive({ t: 'turn', n, c: [[0, { k: 'build', s: 1, t: n }]] });
    }
    assert.ok(ticks >= 3576, `hidden tab fell behind: ${ticks} of 3600 ticks`);
    assert.ok(ticks <= 3600, 'client advanced past available server turns');
    visibility.hidden = false;
    for (let i = 0; i < 30; i++) net.advance(100);
    assert.equal(ticks, 3600);
    assert.deepEqual(applied, Array.from({ length: 600 }, (_, i) => i));

    const before = ticks;
    receive({ t: 'turn', n: 600, c: [] });
    assert.equal(ticks, before, 'visible tab should still advance from animation frames');
    net.endMatch();
    visibility.hidden = true;
    receive({ t: 'turn', n: 601, c: [] });
    assert.equal(ticks, before, 'ended match should not advance');
  } finally {
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
