import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NetSession } from '../src/net/session.ts';
import type { MatchRecording } from '../src/net/replay.ts';

test('матч записывается и просмотр выполняет те же команды в те же кадры, с паузой и скоростью', () => {
  const net = new NetSession();
  const receive = (net as unknown as { receive(msg: object): void }).receive.bind(net);
  const live: string[] = [];
  let frame = 0;
  net.bind((slot, c) => live.push(`${frame}:${slot}:${JSON.stringify(c)}`), () => frame++, () => frame);
  receive({ t: 'start', matchId: 'm1', seed: 7, you: 0, players: [{ slot: 0, name: 'А', house: 1, team: 0 }, { slot: 1, name: 'ИИ', house: 0, team: 1, ai: true }], config: { map: 5, credits: 5000, teamSize: 1 }, turnMs: 100, framesPerTurn: 6 });
  for (let n = 0; n < 200; n++) receive({ t: 'turn', n, c: n % 7 === 0 ? [[0, { k: 'build', s: 1, t: n }]] : [] });
  while (net.advance(100)) { /* до последнего хода */ }
  let saved: MatchRecording | null = null;
  net.onRecording = (rec) => { saved = rec; };
  net.endMatch();
  assert.ok(saved, 'запись сохранена при выходе');
  const rec = saved as MatchRecording;
  assert.equal(rec.turns, 200);
  assert.equal(rec.log.length, Math.ceil(200 / 7), 'в записи только ходы с командами');
  assert.equal(rec.start.players[1].ai, true);
  assert.equal(JSON.parse(JSON.stringify(rec)).id, 'm1');

  const replayed: string[] = [];
  frame = 0;
  let started = false;
  net.onStart = (s) => { started = s.you === null; };
  net.bind((slot, c) => replayed.push(`${frame}:${slot}:${JSON.stringify(c)}`), () => frame++, () => frame);
  net.onRecording = () => assert.fail('просмотр не должен перезаписывать запись');
  net.play(rec);
  assert.ok(started && net.playback, 'просмотр идёт как наблюдатель');
  net.paused = true;
  assert.equal(net.advance(1000), 0, 'на паузе кадры не идут');
  net.paused = false;
  net.speed = 4;
  const fast = net.advance(100);
  assert.ok(fast >= 23 && fast <= 24, `×4 за 100 мс — около 24 кадров, вышло ${fast}`);
  while (net.advance(250)) { /* до конца */ }
  assert.equal(frame, 1200);
  assert.deepEqual(replayed, live);
  net.endMatch();
  assert.equal(net.playback, false);
});
