// Сервер сетевой игры Dune Remaster: комнаты и пересылка команд по ходам (lockstep).
// Игру считает каждый клиент сам; сервер только собирает команды игроков за ход (TURN_MS) и рассылает их всем
// одним пакетом, держит журнал ходов для наблюдателей и сверяет контрольные суммы. ROM серверу не нужен.
import { createServer } from "node:http";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";

export const PROTOCOL = 2;
export const TURN_MS = 100;
/** кадров движка (60 Гц) в одном ходе */
export const FRAMES_PER_TURN = 6;
export const RECONNECT_MS = 120000;
/** отсчёт перед первым ходом матча: клиенты показывают 3, 2, 1, ходы начинаются после */
export const COUNTDOWN_MS = 3000;
/** дома движка: буква → номер (0 Харконнены, 1 Атрейдесы, 2 Ордосы, 3 Фримены, 4 Сардаукары, 5 Наёмники) */
export const HOUSES = { H: 0, A: 1, O: 2, F: 3, S: 4, M: 5 };
const MAX_ROOMS = 64;
/** точек высадки на карте (web/src/engine/net-spawns.ts → NET_SPAWN_POINTS) */
const SPAWN_POINTS = 8;
const MAX_COMMANDS_PER_TURN = 24;
const MAX_MESSAGE = 16 * 1024;
const MAX_MESSAGES_PER_SECOND = 80;

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
const hashPassword = (password, salt) => scryptSync(password, salt, 32);

export function startServer({ port = 8787, host = "0.0.0.0", log = console.log, turnMs = TURN_MS, reconnectMs = RECONNECT_MS, countdownMs = COUNTDOWN_MS } = {}) {
  const rooms = new Map();
  const clients = new Set();
  let closing = false;

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
    players: room.players.size + room.bots.length,
    capacity: room.config.teamSize * 2,
    state: room.state,
    passwordRequired: !!room.passHash,
  });
  const roomState = (room) => ({
    ...roomInfo(room),
    host: room.hostSlot,
    config: room.config,
    observers: room.observers.size,
    members: [
      ...[...room.players.values()].map((p) => ({ slot: p.slot, name: p.name, house: p.house, team: p.team, connected: p.connected, spawn: p.spawn ?? null })),
      ...room.bots.map((b) => ({ slot: b.slot, name: b.name, house: b.house, team: b.team, connected: true, ai: true, difficulty: b.difficulty })),
    ],
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
    const used = new Set([...room.players.values(), ...room.bots].map((p) => p.house));
    if (wanted in HOUSES && !used.has(wanted)) return wanted;
    return Object.keys(HOUSES).find((h) => !used.has(h)) ?? null;
  };
  const freeSlot = (room, team) => {
    const size = room.config.teamSize;
    const used = new Set([...room.players.values(), ...room.bots].map((p) => p.slot));
    const teams = team === 0 || team === 1 ? [team] : [0, 1].sort((a, b) => teamCount(room, a) - teamCount(room, b) || a - b);
    for (const t of teams) for (let i = 0; i < size; i++) if (!used.has(t * size + i)) return t * size + i;
    return null;
  };
  const teamCount = (room, team) => [...room.players.values(), ...room.bots].filter((p) => p.team === team).length;
  /** Места компьютеров (их ведёт ИИ движка у каждого клиента): ставит и убирает хозяин до начала матча. */
  function onBot(room, msg) {
    if (msg.op === "add") {
      if (msg.team !== 0 && msg.team !== 1) return;
      const slot = freeSlot(room, msg.team), house = freeHouse(room, msg.house);
      if (slot === null || house === null) return;
      const n = Math.max(0, ...room.bots.map((b) => Number(b.name.split(" ").pop()) || 0)) + 1;
      room.bots.push({ slot, house, team: msg.team, name: `Компьютер ${n}`, difficulty: [0, 1, 2].includes(msg.difficulty) ? msg.difficulty : 1 });
    } else if (msg.op === "remove") {
      room.bots = room.bots.filter((b) => b.slot !== msg.slot);
    } else if (msg.op === "set") {
      const bot = room.bots.find((b) => b.slot === msg.slot);
      if (bot && msg.house in HOUSES && msg.house !== bot.house && freeHouse(room, msg.house) === msg.house) bot.house = msg.house;
      if (bot && [0, 1, 2].includes(msg.difficulty)) bot.difficulty = msg.difficulty;
    }
  }
  const validConfig = (c) => {
    const map = Number(c?.map), teamSize = Number(c?.teamSize), credits = Number(c?.credits);
    if (!Number.isInteger(map) || map < 1 || map > 27) return null;
    if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 3) return null;
    if (![1000, 2000, 5000, 10000, 20000, 25000, 50000].includes(credits)) return null;
    return { map, teamSize, credits };
  };

  function maybeCloseRoom(room) {
    if (![...room.players.values()].some((p) => p.connected || [...room.sessions.values()].some((s) => s.player === p))) closeRoom(room);
  }

  function removePlayer(room, p) {
    if (room.state === "waiting") {
      for (const [id, player] of room.players) if (player === p) room.players.delete(id);
      if (room.hostSlot === p.slot) room.hostSlot = [...room.players.values()].sort((a,b) => a.slot-b.slot)[0]?.slot ?? -1;
    } else if (room.state === "playing") room.pending.push([p.slot, { k: "left" }]);
  }

  function leaveRoom(client, reason = "leave") {
    const room = client.room;
    if (!room) return;
    client.room = null;
    const session = room.sessions.get(client.resumeToken);
    const token = client.resumeToken;
    client.resumeToken = null;
    room.observers.delete(client);
    const p = room.players.get(client.id);
    if (p) {
      p.connected = false;
      p.client = null;
    }
    if (session && reason === "обрыв" && !closing) {
      session.client = null;
      session.timer = setTimeout(() => {
        room.sessions.delete(token);
        if (p) removePlayer(room, p);
        maybeCloseRoom(room);
        if (rooms.has(room.id)) broadcastRoom(room);
      }, reconnectMs);
    } else {
      if (session) clearTimeout(session.timer);
      room.sessions.delete(token);
      if (p) removePlayer(room, p);
    }
    if (p) log(`комната ${room.id}: ${p.name} отключился (${reason})`);
    maybeCloseRoom(room);
    if (rooms.has(room.id)) broadcastRoom(room);
  }

  function closeRoom(room) {
    if (!rooms.delete(room.id)) return;
    clearInterval(room.timer);
    clearTimeout(room.timer);
    for (const session of room.sessions.values()) clearTimeout(session.timer);
    room.sessions.clear();
    for (const o of room.observers) {
      o.room = null;
      send(o, { t: "closed" });
    }
    log(`комната ${room.id} закрыта`);
  }

  function saveSession(client, room, player = null) {
    const token = randomBytes(32).toString("hex");
    room.sessions.set(token, { player, client, timer: null });
    client.resumeToken = token;
    send(client, { t: "session", id: room.id, token });
  }

  function replay(client, room, you, from = 0) {
    send(client, { ...room.start, you, catchup: true });
    const entries = room.log.filter(([n]) => n >= from);
    if (client.protocol < 2) return send(client, { t: 'catchup', turn: room.turn, log: entries, final: true });
    for (let i = 0; i < Math.max(1, entries.length); i += 128)
      send(client, { t: "catchup", turn: room.turn, log: entries.slice(i, i + 128), final: i + 128 >= entries.length });
  }

  function joinAsPlayer(client, room, wantedHouse, wantedTeam) {
    const slot = freeSlot(room, wantedTeam);
    const house = freeHouse(room, wantedHouse);
    if (slot === null || house === null) return send(client, { t: "error", code: "full", text: "В комнате нет мест" });
    const player = { slot, name: client.name, house, team: Math.floor(slot / room.config.teamSize), connected: true, client, spawn: null };
    room.players.set(client.id, player);
    client.room = room;
    saveSession(client, room, player);
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
      matchId: randomUUID(),
      seed: room.seed,
      config: room.config,
      players: [...room.players.values(), ...room.bots.map((b) => ({ ...b, ai: true }))].sort((a, b) => a.slot - b.slot)
        .map((p) => ({ slot: p.slot, name: p.name, house: HOUSES[p.house], team: p.team, ...(p.ai ? { ai: true, difficulty: p.difficulty } : {}), ...(Number.isInteger(p.spawn) ? { spawn: p.spawn } : {}) })),
      turnMs,
      framesPerTurn: FRAMES_PER_TURN,
      countdownMs,
    };
    for (const p of room.players.values()) send(p.client, { ...room.start, you: p.slot });
    const tick = () => {
      const cmds = room.pending;
      room.pending = [];
      const n = room.turn++;
      if (cmds.length) room.log.push([n, cmds]);
      toAll(room, { t: "turn", n, c: cmds });
    };
    // ходы — после отсчёта (у всех клиентов игра стоит одинаково, догонять нечего)
    room.timer = setTimeout(() => { if (rooms.has(room.id)) room.timer = setInterval(tick, turnMs); }, countdownMs);
    log(`комната ${room.id}: матч начат, игроков ${room.players.size}, компьютеров ${room.bots.length}, зерно ${room.seed}`);
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
        client.protocol = Number(msg.protocol) || 1;
        return send(client, { t: "welcome", id: client.id, protocol: PROTOCOL });
      case "resume": {
        const r = rooms.get(String(msg.id)), session = r?.sessions.get(String(msg.token));
        if (!r || !session || (!session.player && r.state !== "playing"))
          return send(client, { t: "error", code: "resume", text: "Время возврата истекло или матч завершён" });
        if (session.client === client) return broadcastRoom(r);
        if (room) leaveRoom(client);
        clearTimeout(session.timer);
        const old = session.client;
        if (old) { old.room = null; old.resumeToken = null; r.observers.delete(old); old.ws.close(4001, "reconnected"); }
        session.client = client;
        session.timer = null;
        client.room = r;
        client.resumeToken = String(msg.token);
        const p = session.player;
        if (p) {
          for (const [id, player] of r.players) if (player === p) r.players.delete(id);
          p.client = client; p.connected = true; client.name = p.name;
          r.players.set(client.id, p);
        } else r.observers.add(client);
        send(client, { t: "session", id: r.id, token: client.resumeToken });
        if (r.state !== "waiting") {
          const from = msg.matchId === r.start.matchId && Number.isSafeInteger(msg.from) && msg.from >= 0 && msg.from <= r.turn ? msg.from : 0;
          replay(client, r, p?.slot ?? null, from);
        }
        broadcastRoom(r);
        return;
      }
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
          sessions: new Map(),
          hostSlot: -1,
          bots: [],
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
          saveSession(client, r);
          replay(client, r, null);
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
        // точка высадки (номер в netSpawnPoints клиента, 0..7); −1 / null — снять выбор; занятую другим — нельзя
        if (msg.spawn === -1 || msg.spawn === null) p.spawn = null;
        else if (Number.isInteger(msg.spawn) && msg.spawn >= 0 && msg.spawn < SPAWN_POINTS && ![...room.players.values()].some((x) => x !== p && x.spawn === msg.spawn)) p.spawn = msg.spawn;
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
      case "bot": {
        const p = room?.players.get(client.id);
        if (!room || !p || room.state !== "waiting" || p.slot !== room.hostSlot) return;
        onBot(room, msg);
        return broadcastRoom(room);
      }
      case "config": {
        const p = room?.players.get(client.id);
        if (!room || !p || room.state !== "waiting" || p.slot !== room.hostSlot) return;
        const config = validConfig(msg.config);
        if (!config) return;
        if (config.teamSize < room.config.teamSize && [...room.players.values(), ...room.bots].some((x) => x.slot % room.config.teamSize >= config.teamSize))
          return send(client, { t: "error", code: "config", text: "Сначала освободите лишние места" });
        // номера мест зависят от размера команды
        for (const x of [...room.players.values(), ...room.bots]) x.slot = x.team * config.teamSize + (x.slot % room.config.teamSize);
        room.hostSlot = [...room.players.values()].find((x) => x.client === client)?.slot ?? room.hostSlot;
        if (config.map !== room.config.map || config.teamSize !== room.config.teamSize) for (const x of room.players.values()) x.spawn = null;
        room.config = config;
        return broadcastRoom(room);
      }
      case "start": {
        const p = room?.players.get(client.id);
        if (!room || !p || room.state !== "waiting" || p.slot !== room.hostSlot) return;
        const teams = new Set([...room.players.values(), ...room.bots].map((x) => x.team));
        if (room.players.size + room.bots.length < 2 || teams.size < 2) return send(client, { t: "error", code: "players", text: "Нужны игроки или компьютеры в обеих командах" });
        if ([...room.players.values()].some((x) => !x.connected)) return send(client, { t: "error", code: "players", text: "Дождитесь подключения всех игроков" });
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
        if (room?.players.get(client.id)?.connected && room.state === "playing" && msg.result === "won") {
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
    const client = { id: randomUUID(), ws, name: "Командир", protocol: 1, room: null, resumeToken: null, alive: true, budget: MAX_MESSAGES_PER_SECOND, last: Date.now() };
    clients.add(client);
    ws.on("pong", () => { client.alive = true; });
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
  const heartbeat = setInterval(() => {
    for (const c of clients) {
      if (!c.alive) { c.ws.terminate(); continue; }
      c.alive = false;
      if (c.ws.readyState === 1) c.ws.ping();
    }
  }, 15000);

  return new Promise((resolve) => {
    http.listen(port, host, () => {
      const address = http.address();
      log(`dune-net: порт ${address.port}`);
      resolve({
        port: address.port,
        rooms,
        close: () =>
          new Promise((done) => {
            closing = true;
            clearInterval(heartbeat);
            for (const r of [...rooms.values()]) closeRoom(r);
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
