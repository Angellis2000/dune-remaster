/** Check the real WebSocket route, including proxy timeouts. No ROM required.
 * node tools/check-connection.mjs [wss://host/ws] [seconds=390]
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import WebSocket from 'ws';

const endpoint = process.argv[2] ?? 'wss://dune.109-235-116-121.sslip.io/ws';
const seconds = Number(process.argv[3] ?? 390);
assert.ok(Number.isFinite(seconds) && seconds >= 1, 'seconds must be positive');
const clients = [];
const pending = new Map();
let compared = 0;
let commandTurns = 0;
let closing = false;
let started = 0;
let fatal;
const failed = new Promise((_, reject) => { fatal = reject; });
let pingTimer, commandTimer, progressTimer, durationTimer;

function connect(name) {
  const ws = new WebSocket(endpoint, { handshakeTimeout: 10000 });
  const inbox = [];
  const waiters = [];
  const client = { ws, last: -1, pongs: 0, send: (msg) => ws.send(JSON.stringify(msg)),
    next(type) {
      const index = inbox.findIndex((m) => m.t === type);
      if (index >= 0) return Promise.resolve(inbox.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const waiter = { type, resolve: (msg) => { clearTimeout(timer); resolve(msg); } };
        const timer = setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1);
          reject(new Error(`${name}: timeout waiting for ${type}`));
        }, 10000);
        waiters.push(waiter);
      });
    },
  };
  clients.push(client);
  ws.on('error', fatal);
  ws.on('close', (code) => {
    if (!closing) fatal(new Error(`${name}: disconnected after ${((Date.now() - started) / 1000).toFixed(1)}s, code ${code}`));
  });
  ws.on('open', () => client.send({ t: 'hello', name }));
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(String(data));
      if (msg.t === 'error' || msg.t === 'desync' || msg.t === 'closed') throw new Error(`${name}: ${JSON.stringify(msg)}`);
      if (msg.t === 'pong') { client.pongs++; return; }
      if (msg.t === 'turn') {
        assert.equal(msg.n, client.last + 1, `${name}: missing or repeated turn`);
        client.last = msg.n;
        const signature = JSON.stringify(msg.c);
        if (pending.has(msg.n)) {
          assert.equal(signature, pending.get(msg.n), `different commands at turn ${msg.n}`);
          pending.delete(msg.n);
          compared++;
          if (msg.c.length) commandTurns++;
        } else pending.set(msg.n, signature);
        return;
      }
      const index = waiters.findIndex((w) => w.type === msg.t);
      if (index >= 0) waiters.splice(index, 1)[0].resolve(msg);
      else if (msg.t !== 'room') inbox.push(msg);
    } catch (error) { fatal(error); }
  });
  return client;
}

async function check() {
  const a = connect('Connection check A'), b = connect('Connection check B');
  await Promise.all([a.next('welcome'), b.next('welcome')]);
  const roomA = a.next('room');
  const password = randomBytes(16).toString('hex');
  a.send({ t: 'create', name: 'Connection check', password, house: 'A', config: { map: 5, teamSize: 1, credits: 5000 } });
  const created = await roomA;
  const roomB = b.next('room');
  b.send({ t: 'join', id: created.room.id, password, house: 'H' });
  await roomB;
  const starts = Promise.all([a.next('start'), b.next('start')]);
  a.send({ t: 'start' });
  const [sa, sb] = await starts;
  assert.equal(sa.seed, sb.seed);
  assert.deepEqual(sa.players, sb.players);
  started = Date.now();
  console.log(JSON.stringify({ event: 'started', endpoint, seconds, room: created.room.id }));
  pingTimer = setInterval(() => clients.forEach((c) => c.send({ t: 'ping', at: Date.now() })), 15000);
  commandTimer = setInterval(() => clients.forEach((c, slot) => c.send({ t: 'cmd', c: { k: 'build', s: slot, t: 1 } })), 5000);
  progressTimer = setInterval(() => console.log(JSON.stringify({ event: 'progress', elapsedSeconds: Math.round((Date.now() - started) / 1000), compared, turns: clients.map((c) => c.last) })), 60000);
  await new Promise((resolve) => { durationTimer = setTimeout(resolve, seconds * 1000); });
  assert.ok(compared >= seconds * 1000 / sa.turnMs * 0.9, 'insufficient turns');
  assert.ok(seconds < 16 || clients.every((c) => c.pongs > 0), 'keepalive received no response');
  assert.ok(seconds < 6 || commandTurns > 0, 'no test commands relayed');
  assert.ok(pending.size <= 2, 'one client stopped receiving turns');
  console.log(JSON.stringify({ event: 'passed', elapsedSeconds: (Date.now() - started) / 1000, compared, commandTurns, pongs: clients.map((c) => c.pongs), turns: clients.map((c) => c.last) }));
}

try {
  await Promise.race([check(), failed]);
} catch (error) {
  console.error(JSON.stringify({ event: 'failed', error: String(error) }));
  process.exitCode = 1;
} finally {
  closing = true;
  clearInterval(pingTimer); clearInterval(commandTimer); clearInterval(progressTimer); clearTimeout(durationTimer);
  clients.forEach((c) => c.ws.close());
  setTimeout(() => clients.forEach((c) => c.ws.terminate()), 1000).unref();
}
