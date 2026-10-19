import { test } from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import { startServer } from "../dune-net.mjs";

/** Клиент теста: копит сообщения и ждёт нужное. */
function connect(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const inbox = [];
  const waiters = [];
  ws.on("message", (data) => {
    const msg = JSON.parse(String(data));
    const i = waiters.findIndex((w) => w.match(msg));
    if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
    else inbox.push(msg);
  });
  return {
    ws,
    send: (msg) => ws.send(JSON.stringify(msg)),
    next(match, timeout = 3000) {
      const i = inbox.findIndex(match);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const w = { match, resolve };
        waiters.push(w);
        setTimeout(() => reject(new Error("нет ответа")), timeout);
      });
    },
    opened: new Promise((r) => ws.on("open", r)),
  };
}

test("комната, пароль, старт, ходы с командами, сверка и наблюдатель", async () => {
  const server = await startServer({ port: 0, log: () => {}, turnMs: 30 });
  try {
    const a = connect(server.port);
    const b = connect(server.port);
    await Promise.all([a.opened, b.opened]);
    a.send({ t: "hello", name: "Алиса" });
    b.send({ t: "hello", name: "Боб" });
    await a.next((m) => m.t === "welcome");
    await b.next((m) => m.t === "welcome");

    a.send({ t: "create", name: "Тест", password: "дюна", config: { map: 5, teamSize: 1, credits: 5000 }, house: "A" });
    const created = await a.next((m) => m.t === "room");
    assert.equal(created.you, 0);
    assert.equal(created.room.members[0].house, "A");

    b.send({ t: "rooms" });
    const list = await b.next((m) => m.t === "rooms");
    assert.equal(list.rooms.length, 1);
    assert.equal(list.rooms[0].passwordRequired, true);

    b.send({ t: "join", id: created.room.id, password: "неверно", house: "A" });
    assert.equal((await b.next((m) => m.t === "error")).code, "password");
    b.send({ t: "join", id: created.room.id, password: "дюна", house: "A" });
    const joined = await b.next((m) => m.t === "room");
    assert.equal(joined.you, 1, "второй игрок — в команду противника");
    assert.notEqual(joined.room.members.find((m) => m.slot === 1).house, "A", "дом не повторяется");

    b.send({ t: "start" });
    a.send({ t: "start" });
    const sa = await a.next((m) => m.t === "start");
    const sb = await b.next((m) => m.t === "start");
    assert.equal(sa.seed, sb.seed);
    assert.deepEqual(sa.players, sb.players);
    assert.equal(sa.you, 0);
    assert.equal(sb.you, 1);

    a.send({ t: "cmd", c: { k: "build", s: 3, t: 9 } });
    b.send({ t: "cmd", c: { k: "left" } });
    const turnA = await a.next((m) => m.t === "turn" && m.c.length > 0);
    const turnB = await b.next((m) => m.t === "turn" && m.n === turnA.n);
    assert.deepEqual(turnA.c, [[0, { k: "build", s: 3, t: 9 }]], "команда «left» от клиента не принимается");
    assert.deepEqual(turnB.c, turnA.c, "оба получают один и тот же ход");

    const o = connect(server.port);
    await o.opened;
    o.send({ t: "join", id: created.room.id, password: "дюна", role: "observer" });
    const so = await o.next((m) => m.t === "start");
    assert.equal(so.you, null);
    const cu = await o.next((m) => m.t === "catchup");
    assert.ok(cu.log.some(([n]) => n === turnA.n), "наблюдатель получает журнал ходов");

    a.send({ t: "hash", turn: 10, h: 123 });
    b.send({ t: "hash", turn: 10, h: 124 });
    const desync = await a.next((m) => m.t === "desync");
    assert.equal(desync.turn, 10);

    b.ws.close();
    const left = await a.next((m) => m.t === "turn" && m.c.some(([, c]) => c.k === "left"));
    assert.equal(left.c.find(([, c]) => c.k === "left")[0], 1, "выход игрока приходит всем как команда");
    for (const c of [a, o]) c.ws.close();
  } finally {
    await server.close();
  }
});
