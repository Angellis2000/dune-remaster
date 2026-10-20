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
        const w = { match, resolve: (msg) => { clearTimeout(timer); resolve(msg); } };
        waiters.push(w);
        const timer = setTimeout(() => { const i=waiters.indexOf(w); if(i>=0)waiters.splice(i,1); reject(new Error("нет ответа")); }, timeout);
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

    b.send({ t: 'leave' });
    const left = await a.next((m) => m.t === "turn" && m.c.some(([, c]) => c.k === "left"));
    assert.equal(left.c.find(([, c]) => c.k === "left")[0], 1, "выход игрока приходит всем как команда");
    for (const c of [a, o]) c.ws.close();
  } finally {
    await server.close();
  }
});

test('обрыв сохраняет место; токен возвращает игрока и наблюдателя с пропущенными ходами', async () => {
  const server = await startServer({ port: 0, log: () => {}, turnMs: 15, reconnectMs: 1000 });
  try {
    const a=connect(server.port), b=connect(server.port);
    await Promise.all([a.opened,b.opened]);
    a.send({t:'create',name:'Возврат',password:'secret',config:{map:5,teamSize:1,credits:5000},house:'A'});
    const created=await a.next(m=>m.t==='room');
    const owner=await a.next(m=>m.t==='session');
    b.send({t:'join',id:created.room.id,password:'secret',house:'H'});
    const ticket=await b.next(m=>m.t==='session');
    await b.next(m=>m.t==='room');
    a.send({t:'start'});
    const start=await b.next(m=>m.t==='start');
    b.ws.terminate();
    await a.next(m=>m.t==='room'&&m.room.members.some(p=>p.slot===1&&!p.connected));
    a.send({t:'cmd',c:{k:'build',s:1,t:9}});
    const missing=await a.next(m=>m.t==='turn'&&m.c.length);
    assert.ok(!missing.c.some(([,c])=>c.k==='left'),'temporary outage must not remove the player');
    const restored=connect(server.port);await restored.opened;
    restored.send({t:'resume',id:ticket.id,token:'invalid'});
    assert.equal((await restored.next(m=>m.t==='error')).code,'resume');
    restored.send({...ticket,t:'resume',matchId:start.matchId,from:missing.n});
    const resumed=await restored.next(m=>m.t==='start');
    assert.equal(resumed.you,1);assert.equal(resumed.matchId,start.matchId);
    const replay=await restored.next(m=>m.t==='catchup'&&m.final);
    assert.deepEqual(replay.log.find(([n])=>n===missing.n)[1],missing.c);
    assert.ok(replay.log.every(([n])=>n>=missing.n));
    restored.send({t:'cmd',c:{k:'build',s:2,t:3}});
    assert.equal((await a.next(m=>m.t==='turn'&&m.c.some(([,c])=>c.s===2))).c[0][0],1);
    const observer=connect(server.port);await observer.opened;
    observer.send({t:'join',id:ticket.id,password:'secret',role:'observer'});
    const observerTicket=await observer.next(m=>m.t==='session');
    await observer.next(m=>m.t==='catchup');observer.ws.terminate();
    const observerBack=connect(server.port);await observerBack.opened;
    observerBack.send({...observerTicket,t:'resume'});
    assert.equal((await observerBack.next(m=>m.t==='start')).you,null);
    assert.ok((await observerBack.next(m=>m.t==='catchup')).log.length);
    // A valid ticket can also replace a stale TCP connection which has not yet timed out.
    const replacement=connect(server.port);await replacement.opened;
    const replaced=new Promise(resolve=>a.ws.once('close',code=>resolve(code)));
    replacement.send({...owner,t:'resume'});
    assert.equal(await replaced,4001);
    assert.equal((await replacement.next(m=>m.t==='start')).you,0);
    assert.equal(JSON.stringify((await replacement.next(m=>m.t==='room')).room).includes(ticket.token),false);
  } finally { await server.close(); }
});

test('комната переживает общий обрыв, но истёкший возврат и добровольный выход отзывают токен', async () => {
  const server=await startServer({port:0,log:()=>{},turnMs:15,reconnectMs:120});
  try {
    const a=connect(server.port);await a.opened;
    a.send({t:'create',config:{map:5,teamSize:1,credits:5000},house:'A'});
    const ticket=await a.next(m=>m.t==='session');await a.next(m=>m.t==='room');
    a.ws.terminate();await new Promise(resolve=>a.ws.once('close',resolve));
    const b=connect(server.port);await b.opened;
    b.send({...ticket,t:'resume'});
    assert.equal((await b.next(m=>m.t==='room')).you,0,'host returns to the same waiting room');
    b.ws.terminate();await new Promise(resolve=>b.ws.once('close',resolve));
    await new Promise(resolve=>setTimeout(resolve,180));
    const c=connect(server.port);await c.opened;c.send({...ticket,t:'resume'});
    assert.equal((await c.next(m=>m.t==='error')).code,'resume');
    assert.equal(server.rooms.size,0);
    c.send({t:'create',config:{map:5,teamSize:1,credits:5000},house:'A'});
    const explicit=await c.next(m=>m.t==='session');await c.next(m=>m.t==='room');c.send({t:'leave'});c.send({...explicit,t:'resume'});
    assert.equal((await c.next(m=>m.t==='error')).code,'resume');
  } finally { await server.close(); }
});

test('хозяин ставит компьютеры: место и дом заняты, матч с одним человеком, компьютеры в составе старта', async () => {
  const server = await startServer({ port: 0, log: () => {}, turnMs: 20 });
  try {
    const a = connect(server.port), b = connect(server.port);
    await Promise.all([a.opened, b.opened]);
    a.send({ t: 'create', config: { map: 5, teamSize: 2, credits: 5000 }, house: 'A' });
    const created = await a.next((m) => m.t === 'room');
    a.send({ t: 'start' });
    assert.equal((await a.next((m) => m.t === 'error')).code, 'players', 'одному без противника начинать нельзя');
    a.send({ t: 'bot', op: 'add', team: 1, house: 'A' });
    const withBot = await a.next((m) => m.t === 'room' && m.room.members.some((x) => x.ai));
    const bot = withBot.room.members.find((x) => x.ai);
    assert.equal(bot.team, 1);
    assert.notEqual(bot.house, 'A', 'дом компьютера не повторяет дом игрока');
    assert.equal(withBot.room.players, 2);
    assert.equal(bot.difficulty, 1, 'компьютер по умолчанию обычный');
    a.send({ t: 'bot', op: 'set', slot: bot.slot, house: 'O', difficulty: 2 });
    assert.equal((await a.next((m) => m.t === 'room' && m.room.members.some((x) => x.ai && x.house === 'O'))).room.members.length, 2);
    a.send({ t: 'bot', op: 'add', team: 0 });
    await a.next((m) => m.t === 'room' && m.room.members.filter((x) => x.ai).length === 2);
    // чужой (не хозяин) компьютеры не трогает
    b.send({ t: 'join', id: created.room.id, house: 'H' });
    const joined = await b.next((m) => m.t === 'room');
    assert.equal(joined.room.members.length, 4, 'команды 2×2 заполнены');
    b.send({ t: 'bot', op: 'remove', slot: bot.slot });
    a.send({ t: 'bot', op: 'remove', slot: joined.room.members.find((x) => x.ai && x.team === 0).slot });
    const after = await a.next((m) => m.t === 'room' && m.room.members.filter((x) => x.ai).length === 1);
    assert.ok(after.room.members.some((x) => x.slot === bot.slot), 'компьютер, которого пытался убрать гость, на месте');
    a.send({ t: 'start' });
    const start = await a.next((m) => m.t === 'start');
    const ai = start.players.filter((p) => p.ai);
    assert.equal(ai.length, 1);
    assert.equal(ai[0].house, 2);
    assert.equal(ai[0].difficulty, 2, 'сложность доходит до старта');
    assert.ok(start.players.filter((p) => !p.ai).length === 2);
    for (const c of [a, b]) c.ws.close();
  } finally { await server.close(); }
});
