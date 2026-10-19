/**
 * Клиент сетевой игры (lockstep). Сервер (server/dune-net.mjs) раз в turnMs присылает ход n — команды всех игроков
 * за это время. Ход n выполняется в кадр n × framesPerTurn, до такта движка; дальше каждый клиент считает игру сам.
 * Игра идёт с частотой 60 Гц по часам, но никогда не обгоняет полученные ходы: если ход не пришёл — ждёт.
 */
import type { NetCommand } from "../engine/game.ts";

export interface RoomConfig {
  map: number;
  teamSize: number;
  credits: number;
}
export interface RoomInfo {
  id: string;
  name: string;
  map: number;
  teamSize: number;
  players: number;
  capacity: number;
  state: "waiting" | "playing" | "finished";
  passwordRequired: boolean;
}
export interface RoomMember {
  slot: number;
  name: string;
  /** буква дома: A H O F S M */
  house: string;
  team: number;
  connected: boolean;
}
export interface RoomState extends RoomInfo {
  host: number;
  config: RoomConfig;
  observers: number;
  members: RoomMember[];
}
export interface MatchStart {
  seed: number;
  config: RoomConfig;
  /** house — номер дома движка */
  players: { slot: number; name: string; house: number; team: number }[];
  turnMs: number;
  framesPerTurn: number;
  /** своё место или null — наблюдатель */
  you: number | null;
}
type Turn = [slot: number, command: NetCommand][];

/** Буква дома в лобби → номер дома движка. */
export const HOUSE_LETTERS: Record<string, number> = { H: 0, A: 1, O: 2, F: 3, S: 4, M: 5 };
export const HOUSE_NAMES: Record<string, string> = { A: "Атрейдесы", H: "Харконнены", O: "Ордосы", F: "Фримены", S: "Сардаукары", M: "Наёмники" };

/** Адрес сервера: ?net=… в адресе страницы, иначе общий сервер на VPS. */
export function defaultEndpoint(): string {
  const fromQuery = new URLSearchParams(location.search).get("net");
  if (fromQuery) return fromQuery;
  return "wss://dune.109-235-116-121.sslip.io/ws";
}

export class NetSession {
  private ws: WebSocket | null = null;
  private keepAlive = 0;
  onRooms: (rooms: RoomInfo[]) => void = () => {};
  onRoom: (room: RoomState, you: number | null) => void = () => {};
  onStart: (start: MatchStart) => void = () => {};
  onError: (text: string) => void = () => {};
  onStatus: (text: string) => void = () => {};
  onDesync: (turn: number) => void = () => {};
  onClosed: () => void = () => {};

  // ---- матч
  private start: MatchStart | null = null;
  private turns = new Map<number, Turn>();
  /** последний полученный ход подряд (−1 — ещё ни одного) */
  private lastTurn = -1;
  /** выполнено кадров движка */
  frame = 0;
  private acc = 0;
  private exec: (slot: number, c: NetCommand) => void = () => {};
  private tick: () => void = () => {};
  private hash: () => number = () => 0;
  private pendingOrders = new Map<string, NetCommand & { k: "order" }>();

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  get inMatch(): boolean {
    return this.start !== null;
  }
  get match(): MatchStart | null {
    return this.start;
  }
  /** насколько ходы впереди игры, в кадрах (больше нуля — есть запас) */
  get buffered(): number {
    return (this.lastTurn + 1) * (this.start?.framesPerTurn ?? 6) - this.frame;
  }

  connect(url: string, name: string): Promise<void> {
    this.close();
    this.onStatus("Подключение к серверу…");
    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (error) {
        this.onStatus("Неверный адрес сервера");
        reject(error);
        return;
      }
      this.ws = ws;
      const timer = setTimeout(() => {
        ws.close();
        this.onStatus("Сервер не отвечает");
        reject(new Error("timeout"));
      }, 8000);
      ws.onopen = () => {
        clearTimeout(timer);
        // пинг держит соединение живым на прокси и NAT во время долгого матча
        clearInterval(this.keepAlive);
        this.keepAlive = window.setInterval(() => this.send({ t: "ping", at: Date.now() }), 15000);
        this.send({ t: "hello", name });
        this.onStatus("Сервер подключён");
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(timer);
        this.onStatus("Не удалось подключиться к серверу");
        reject(new Error("connect"));
      };
      ws.onclose = () => {
        if (this.ws !== ws) return;
        clearInterval(this.keepAlive);
        this.ws = null;
        this.onStatus("Соединение с сервером потеряно");
        this.onClosed();
      };
      ws.onmessage = (event) => {
        let msg: any;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }
        this.receive(msg);
      };
    });
  }

  close(): void {
    clearInterval(this.keepAlive);
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this.endMatch();
  }

  private send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
  listRooms(): void {
    this.send({ t: "rooms" });
  }
  create(name: string, password: string, config: RoomConfig, house: string): void {
    this.send({ t: "create", name, password, config, house });
  }
  join(id: string, password: string, role: "player" | "observer", house: string): void {
    this.send({ t: "join", id, password, role, house });
  }
  leave(): void {
    this.send({ t: "leave" });
    this.endMatch();
  }
  setOwn(change: { house?: string; team?: number }): void {
    this.send({ t: "set", ...change });
  }
  setConfig(config: RoomConfig): void {
    this.send({ t: "config", config });
  }
  startMatch(): void {
    this.send({ t: "start" });
  }
  reportOver(result: "won" | "lost"): void {
    this.send({ t: "over", result });
  }

  /** Команда своего игрока. Приказы одной цели за один вызов кода склеиваются в одну команду. */
  command(c: NetCommand): void {
    if (!this.start || this.start.you === null) return;
    if (c.k === "order") {
      const key = `${c.a}:${c.p}`;
      const pending = this.pendingOrders.get(key);
      if (pending) {
        for (const i of c.u) if (!pending.u.includes(i)) pending.u.push(i);
      }
      else {
        if (!this.pendingOrders.size) queueMicrotask(() => this.flushOrders());
        this.pendingOrders.set(key, { ...c, u: [...c.u] });
      }
      return;
    }
    this.send({ t: "cmd", c });
  }
  private flushOrders(): void {
    for (const c of this.pendingOrders.values()) this.send({ t: "cmd", c });
    this.pendingOrders.clear();
  }

  private receive(msg: any): void {
    switch (msg.t) {
      case "rooms":
        return this.onRooms(msg.rooms);
      case "room":
        return this.onRoom(msg.room, msg.you);
      case "error":
        return this.onError(String(msg.text ?? "Ошибка сервера"));
      case "start":
        this.start = msg as MatchStart;
        this.turns.clear();
        this.lastTurn = -1;
        this.frame = 0;
        this.acc = 0;
        return this.onStart(this.start);
      case "catchup":
        for (const [n, c] of msg.log as [number, Turn][]) this.turns.set(n, c);
        this.lastTurn = Math.max(this.lastTurn, (msg.turn as number) - 1);
        return;
      case "turn":
        if (!this.start) return;
        this.turns.set(msg.n, msg.c);
        if (msg.n > this.lastTurn) this.lastTurn = msg.n;
        // requestAnimationFrame pauses in hidden tabs; incoming turns keep the
        // simulation moving without relying on a throttled background timer.
        if (typeof document !== "undefined" && document.hidden) this.advance(this.start.turnMs);
        return;
      case "desync":
        return this.onDesync(msg.turn);
      case "closed":
        this.endMatch();
        this.onStatus("Матч завершён");
        return;
    }
  }

  /** Подключить движок к пришедшему матчу. */
  bind(exec: (slot: number, c: NetCommand) => void, tick: () => void, hash: () => number): void {
    this.exec = exec;
    this.tick = tick;
    this.hash = hash;
  }

  endMatch(): void {
    this.start = null;
    this.turns.clear();
    this.lastTurn = -1;
    this.frame = 0;
    this.pendingOrders.clear();
  }

  /** Продвинуть игру на прошедшее время (мс). Возвращает число выполненных тактов. */
  advance(dtMs: number): number {
    const start = this.start;
    if (!start) return 0;
    const fpt = start.framesPerTurn;
    const available = this.buffered;
    this.acc = Math.min(this.acc + (dtMs * 60) / 1000, 4);
    let budget = Math.floor(this.acc);
    // отстали (вкладка была скрыта, медленный компьютер) — догоняем, оставляя ход запаса
    if (available > 4 * fpt) budget = Math.max(budget, available - 2 * fpt);
    budget = Math.min(budget, available, 600);
    this.acc = Math.max(0, this.acc - budget);
    for (let i = 0; i < budget; i++) this.runFrame(fpt);
    return budget;
  }

  private runFrame(fpt: number): void {
    if (this.frame % fpt === 0) {
      const n = this.frame / fpt;
      // сверка: состояние перед ходом n у всех одинаковое
      if (n > 0 && n % 50 === 0 && this.start?.you !== null) this.send({ t: "hash", turn: n, h: this.hash() });
      for (const [slot, c] of this.turns.get(n) ?? []) this.exec(slot, c);
      this.turns.delete(n);
    }
    this.tick();
    this.frame++;
  }
}
