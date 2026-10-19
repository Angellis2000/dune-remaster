// Сервер сетевой игры Dune Remaster: комнаты и пересылка команд по ходам (lockstep).
// Игру считает каждый клиент сам; сервер только собирает команды игроков за ход (TURN_MS) и рассылает их всем
// одним пакетом, держит журнал ходов для наблюдателей и сверяет контрольные суммы. ROM серверу не нужен.
import { createServer } from "node:http";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";

export const PROTOCOL = 1;
export const TURN_MS = 100;
/** кадров движка (60 Гц) в одном ходе */
export const FRAMES_PER_TURN = 6;
/** дома движка: буква → номер (0 Харконнены, 1 Атрейдесы, 2 Ордосы, 3 Фримены, 4 Сардаукары, 5 Наёмники) */
export const HOUSES = { H: 0, A: 1, O: 2, F: 3, S: 4, M: 5 };
const MAX_ROOMS = 64;
const MAX_COMMANDS_PER_TURN = 24;
const MAX_MESSAGE = 16 * 1024;
const MAX_MESSAGES_PER_SECOND = 80;

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
const hashPassword = (password, salt) => scryptSync(password, salt, 32);

export function startServer({ port = 8787, host = "0.0.0.0", log = console.log, turnMs = TURN_MS } = {}) {
  const rooms = new Map();
  const clients = new Set();

  const http = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/dune/health") {
      res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
      res.end(JSON.stringify({ status: "ok", protocol: PROTOCOL, rooms: rooms.size, clients: clients.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const wss = new WebSocketServer({ server: http, maxPayload: MAX_MESSAGE });

  const send = (client, msg) => {
    if (client.ws.readyState === 1) client.ws.send(JSON.stringify(msg));
  };
  const roomInfo = (room) => ({
    id: room.id,
    name: room.name,
    map: room.config.map,
    teamSize: room.config.teamSize,
    players: room.players.size,
    capacity: room.config.teamSize * 2,
    state: room.state,
    passwordRequired: !!room.passHash,
  });
  const roomState = (room) => ({
    ...roomInfo(room),
    host: room.hostSlot,
    config: room.config,
    observers: room.observers.size,
    members: [...room.players.values()].map((p) => ({ slot: p.slot, name: p.name, house: p.house, team: p.team, connected: p.connected })),
  });
  const broadcastRoom = (room) => {
    for (const p of room.players.values()) if (p.connected) send(p.client, { t: "room", room: roomState(room), you: p.slot });
    for (const o of room.observers) send(o, { t: "room", room: roomState(room), you: null });
  };
  const toAll = (room, msg) => {
    for (const p of room.players.values()) if (p.connected) send(p.client, msg);
    for (const o of room.observers) send(o, msg);
  };
  const freeHouse = (room, wanted) => {
    const used = new Set([...room.players.values()].map((p) => p.house));
    if (wanted in HOUSES && !used.has(wanted)) return wanted;
    return Object.keys(HOUSES).find((h) => !used.has(h)) ?? null;
  };
  const freeSlot = (room, team) => {
    const size = room.config.teamSize;
    const used = new Set([...room.players.values()].map((p) => p.slot));
    const teams = team === 0 || team === 1 ? [team] : [0, 1].sort((a, b) => teamCount(room, a) - teamCount(room, b) || a - b);
    for (const t of teams) for (let i = 0; i < size; i++) if (!used.has(t * size + i)) return t * size + i;
    return null;
  };
  const teamCount = (room, team) => [...room.players.values()].filter((p) => p.team === team).length;
  const validConfig = (c) => {
    const map = Number(c?.map), teamSize = Number(c?.teamSize), credits = Number(c?.credits);
    if (!Number.isInteger(map) || map < 1 || map > 27) return null;
    if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 3) return null;
    if (![1000, 2000, 5000, 10000, 20000, 25000, 50000].includes(credits)) return null;
    return { map, teamSize, credits };
  };

  function leaveRoom(client, reason = "leave") {
    const room = client.room;
    if (!room) return;
    client.room = null;
    if (room.observers.delete(client)) {
      broadcastRoom(room);
      return;
    }
    const p = room.players.get(client.id);
    if (!p) return;
    if (room.state === "waiting") {
      room.players.delete(client.id);
      if (room.hostSlot === p.slot) {
        const next = [...room.players.values()].sort((a, b) => a.slot - b.slot)[0];
        room.hostSlot = next ? next.slot : -1;
      }
    } else {
      p.connected = false;
      p.client = null;
      if (room.state === "playing") room.pending.push([p.slot, { k: "left" }]);
    }
    log(`комната ${room.id}: ${p.name} вышел (${reason})`);
    if (![...room.players.values()].some((x) => x.connected)) closeRoom(room);
    else broadcastRoom(room);
  }

  function closeRoom(room) {
    clearInterval(room.timer);
    rooms.delete(room.id);
    for (const o of room.observers) {
      o.room = null;
      send(o, { t: "closed" });
    }
    log(`комната ${room.id} закрыта`);
  }

  function joinAsPlayer(client, room, wantedHouse, wantedTeam) {
    const slot = freeSlot(room, wantedTeam);
    const house = freeHouse(room, wantedHouse);
    if (slot === null || house === null) return send(client, { t: "error", code: "full", text: "В комнате нет мест" });
    room.players.set(client.id, { slot, name: client.name, house, team: Math.floor(slot / room.config.teamSize), connected: true, client });
    client.room = room;
    if (room.hostSlot < 0) room.hostSlot = slot;
    broadcastRoom(room);
  }

  function startMatch(room) {
    room.state = "playing";
    room.seed = randomBytes(4).readUInt32LE(0);
    room.turn = 0;
    room.pending = [];
    room.log = [];
    room.hashes = new Map();
    room.desynced = false;
    room.start = {
      t: "start",
      seed: room.seed,
      config: room.config,
      players: [...room.players.values()].sort((a, b) => a.slot - b.slot).map((p) => ({ slot: p.slot, name: p.name, house: HOUSES[p.house], team: p.team })),
      turnMs,
      framesPerTurn: FRAMES_PER_TURN,
    };
    for (const p of room.players.values()) send(p.client, { ...room.start, you: p.slot });
    room.timer = setInterval(() => {
      const cmds = room.pending;
      room.pending = [];
      const n = room.turn++;
      if (cmds.length) room.log.push([n, cmds]);
      toAll(room, { t: "turn", n, c: cmds });
    }, turnMs);
    log(`комната ${room.id}: матч начат, игроков ${room.players.size}, зерно ${room.seed}`);
    broadcastRoom(room);
  }

  function onHash(client, msg) {
    const room = client.room;
    const p = room?.players.get(client.id);
    if (!room || !p || room.state !== "playing" || !Number.isInteger(msg.turn)) return;
    let byTurn = room.hashes.get(msg.turn);
    if (!byTurn) room.hashes.set(msg.turn, (byTurn = new Map()));
    byTurn.set(p.slot, msg.h >>> 0);
    const values = new Set(byTurn.values());
    if (values.size > 1 && !room.desynced) {
      room.desynced = true;
      log(`комната ${room.id}: РАСХОЖДЕНИЕ на ходу ${msg.turn}: ${JSON.stringify([...byTurn])}`);
      toAll(room, { t: "desync", turn: msg.turn, hashes: [...byTurn] });
    }
    for (const turn of room.hashes.keys()) if (turn < msg.turn - 600) room.hashes.delete(turn);
  }

  function handle(client, msg) {
    const room = client.room;
    switch (msg.t) {
      case "hello":
        client.name = clean(msg.name, 24) || "Командир";
        return send(client, { t: "welcome", id: client.id, protocol: PROTOCOL });
      case "rooms":
        return send(client, { t: "rooms", rooms: [...rooms.values()].map(roomInfo) });
      case "create": {
        if (room) leaveRoom(client);
        if (rooms.size >= MAX_ROOMS) return send(client, { t: "error", code: "limit", text: "Сервер переполнен" });
        const config = validConfig(msg.config);
        if (!config) return send(client, { t: "error", code: "config", text: "Неверные параметры комнаты" });
        const password = String(msg.password ?? "").slice(0, 64);
        const salt = randomBytes(16);
        const r = {
          id: randomUUID().slice(0, 8),
          name: clean(msg.name, 48) || "Битва за Арракис",
          config,
          salt,
          passHash: password ? hashPassword(password, salt) : null,
          state: "waiting",
          players: new Map(),
          observers: new Set(),
          hostSlot: -1,
          pending: [],
          log: [],
        };
        rooms.set(r.id, r);
        log(`комната ${r.id} создана: «${r.name}», карта ${config.map}, ${config.teamSize}×${config.teamSize}`);
        return joinAsPlayer(client, r, msg.house, 0);
      }
      case "join": {
        const r = rooms.get(String(msg.id));
        if (!r) return send(client, { t: "error", code: "missing", text: "Комната не найдена" });
        if (r.passHash) {
          const given = hashPassword(String(msg.password ?? "").slice(0, 64), r.salt);
          if (!timingSafeEqual(given, r.passHash)) return send(client, { t: "error", code: "password", text: "Неверный пароль" });
        }
        if (room) leaveRoom(client);
        if (msg.role === "observer") {
          if (r.state !== "playing") return send(client, { t: "error", code: "state", text: "Наблюдать можно только идущий матч" });
          r.observers.add(client);
          client.room = r;
          send(client, { ...r.start, you: null });
          send(client, { t: "catchup", turn: r.turn, log: r.log });
          return broadcastRoom(r);
        }
        if (r.state !== "waiting") return send(client, { t: "error", code: "state", text: "Матч уже идёт" });
        return joinAsPlayer(client, r, msg.house, msg.team);
      }
      case "leave":
        return leaveRoom(client);
      case "set": {
        const p = room?.players.get(client.id);
        if (!room || !p || room.state !== "waiting") return;
        if (msg.house in HOUSES && msg.house !== p.house && freeHouse(room, msg.house) === msg.house) p.house = msg.house;
        if ((msg.team === 0 || msg.team === 1) && msg.team !== p.team) {
          const slot = freeSlot(room, msg.team);
          if (slot !== null) {
            if (room.hostSlot === p.slot) room.hostSlot = slot;
            p.slot = slot;
            p.team = msg.team;
          }
        }
        return broadcastRoom(room);
      }
      case "config": {
        const p = room?.players.get(client.id);
        if (!room || !p || room.state !== "waiting" || p.slot !== room.hostSlot) return;
        const config = validConfig(msg.config);
        if (!config) return;
        if (config.teamSize < room.config.teamSize && [...room.players.values()].some((x) => x.slot % room.config.teamSize >= config.teamSize))
          return send(client, { t: "error", code: "config", text: "Сначала освободите лишние места" });
        // номера мест зависят от размера команды
        for (const x of room.players.values()) x.slot = x.team * config.teamSize + (x.slot % room.config.teamSize);
        room.hostSlot = [...room.players.values()].find((x) => x.client === client)?.slot ?? room.hostSlot;
        room.config = config;
        return broadcastRoom(room);
      }
      case "start": {
        const p = room?.players.get(client.id);
        if (!room || !p || room.state !== "waiting" || p.slot !== room.hostSlot) return;
        const teams = new Set([...room.players.values()].map((x) => x.team));
        if (room.players.size < 2 || teams.size < 2) return send(client, { t: "error", code: "players", text: "Нужны игроки в обеих командах" });
        return startMatch(room);
      }
      case "cmd": {
        const p = room?.players.get(client.id);
        if (!room || !p || room.state !== "playing" || !p.connected) return;
        if (typeof msg.c !== "object" || msg.c === null || typeof msg.c.k !== "string" || msg.c.k === "left") return;
        if (JSON.stringify(msg.c).length > 2048) return;
        if (room.pending.filter(([slot]) => slot === p.slot).length >= MAX_COMMANDS_PER_TURN) return;
        room.pending.push([p.slot, msg.c]);
        return;
      }
      case "hash":
        return onHash(client, msg);
      case "over": {
        if (room && room.state === "playing" && msg.result === "won") {
          room.state = "finished";
          broadcastRoom(room);
        }
        return;
      }
      case "ping":
        return send(client, { t: "pong", at: msg.at });
    }
  }

  wss.on("connection", (ws) => {
    const client = { id: randomUUID(), ws, name: "Командир", room: null, budget: MAX_MESSAGES_PER_SECOND, last: Date.now() };
    clients.add(client);
    ws.on("message", (data) => {
      const now = Date.now();
      client.budget = Math.min(MAX_MESSAGES_PER_SECOND, client.budget + ((now - client.last) / 1000) * MAX_MESSAGES_PER_SECOND);
      client.last = now;
      if (--client.budget < 0) return;
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg && typeof msg === "object") handle(client, msg);
    });
    ws.on("close", () => {
      leaveRoom(client, "обрыв");
      clients.delete(client);
    });
  });

  return new Promise((resolve) => {
    http.listen(port, host, () => {
      const address = http.address();
      log(`dune-net: порт ${address.port}`);
      resolve({
        port: address.port,
        rooms,
        close: () =>
          new Promise((done) => {
            for (const r of rooms.values()) clearInterval(r.timer);
            for (const c of clients) c.ws.terminate();
            wss.close();
            http.close(() => done());
          }),
      });
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("dune-net.mjs")) {
  startServer({ port: Number(process.env.PORT ?? 8787) });
}
