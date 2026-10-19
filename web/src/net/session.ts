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
  matchId?: string;
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
  private endpoint = '';
  private playerName = '';
  private ticket: { id: string; token: string } | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retrySince = 0;
  private retryAttempt = 0;
  private awaitingCatchup = false;
  private catchupTarget = 0;
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
  /** Historical ticks must not play their old sounds or accept new orders. */
  get replaying(): boolean { return this.awaitingCatchup || this.frame < this.catchupTarget; }

  private readTicket(url: string): { id: string; token: string } | null {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`dune-network-resume:${url}`) ?? 'null');
      return typeof saved?.id === 'string' && /^[a-f0-9]{64}$/.test(saved.token) ? saved : null;
    } catch { return null; }
  }
  private saveTicket(ticket: { id: string; token: string } | null): void {
    this.ticket = ticket;
    try {
      const key = `dune-network-resume:${this.endpoint}`;
      if (ticket) sessionStorage.setItem(key, JSON.stringify(ticket));
      else sessionStorage.removeItem(key);
    } catch { /* Private browsing may disable session storage. */ }
  }
  private cancelRetry(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.retrySince = this.retryAttempt = 0;
  }
  private retry(): void {
    if (!this.ticket || this.retryTimer !== null) return;
    this.retrySince ||= Date.now();
    if (Date.now() - this.retrySince >= 120000) {
      this.saveTicket(null);
      this.onStatus('Не удалось восстановить связь. Выйдите в лобби.');
      this.onClosed();
      return;
    }
    this.onStatus('Связь потеряна. Восстанавливаем подключение…');
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.openSocket().catch(() => {});
    }, Math.min(1000 * 2 ** this.retryAttempt++, 5000));
  }
  /** насколько ходы впереди игры, в кадрах (больше нуля — есть запас) */
  get buffered(): number {
    return (this.lastTurn + 1) * (this.start?.framesPerTurn ?? 6) - this.frame;
  }

  connect(url: string, name: string): Promise<void> {
    const saved = this.readTicket(url);
    this.close();
    this.endpoint = url;
    this.playerName = name;
    this.ticket = saved;
    this.onStatus("Подключение к серверу…");
    return this.openSocket();
  }
  /** A reload in the same tab can restore its room without storing the password. */
  restore(url: string): Promise<void> {
    return this.readTicket(url) ? this.connect(url, 'Командир') : Promise.resolve();
  }

  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(this.endpoint);
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
        if (this.ws !== ws) return;
        clearTimeout(timer);
        // пинг держит соединение живым на прокси и NAT во время долгого матча
        clearInterval(this.keepAlive);
        this.keepAlive = window.setInterval(() => this.send({ t: "ping", at: Date.now() }), 15000);
        this.send({ t: "hello", name: this.playerName, protocol: 2 });
        if (this.ticket) {
          this.awaitingCatchup = true;
          this.send({ t: 'resume', ...this.ticket, matchId: this.start?.matchId, from: Math.ceil(this.frame / (this.start?.framesPerTurn ?? 6)) });
          this.onStatus('Восстановление матча…');
        } else this.onStatus("Сервер подключён");
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(timer);
        this.onStatus("Не удалось подключиться к серверу");
        reject(new Error("connect"));
      };
      ws.onclose = (event) => {
        clearTimeout(timer);
        if (this.ws !== ws) return;
        clearInterval(this.keepAlive);
        this.ws = null;
        if (event.code === 4001) {
          this.saveTicket(null);
          this.onStatus('Матч открыт в другом подключении. Выйдите в лобби.');
          this.onClosed();
        } else if (this.ticket) { this.awaitingCatchup = true; this.retry(); }
        else { this.onStatus("Соединение с сервером потеряно"); this.onClosed(); }
        reject(new Error('closed'));
      };
      ws.onmessage = (event) => {
        if (this.ws !== ws) return;
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
    if (this.ticket) this.send({ t: 'leave' });
    this.cancelRetry();
    this.saveTicket(null);
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
    this.cancelRetry();
    this.saveTicket(null);
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
    if (this.replaying) return;
    this.send({ t: "over", result });
  }

  /** Команда своего игрока. Приказы одной цели за один вызов кода склеиваются в одну команду. */
  command(c: NetCommand): void {
    if (!this.start || this.start.you === null || !this.connected || this.replaying) return;
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
    if (!this.replaying) for (const c of this.pendingOrders.values()) this.send({ t: "cmd", c });
    this.pendingOrders.clear();
  }

  private receive(msg: any): void {
    switch (msg.t) {
      case "rooms":
        return this.onRooms(msg.rooms);
      case "room":
        if (!this.start) { this.awaitingCatchup = false; this.cancelRetry(); }
        return this.onRoom(msg.room, msg.you);
      case 'session':
        this.saveTicket({ id: String(msg.id), token: String(msg.token) });
        this.cancelRetry();
        return;
      case "error":
        if (msg.code === 'resume') {
          this.cancelRetry(); this.saveTicket(null);
          this.onStatus(String(msg.text));
          this.onClosed();
        }
        return this.onError(String(msg.text ?? "Ошибка сервера"));
      case "start":
        if (msg.catchup && this.start?.matchId && this.start.matchId === msg.matchId) {
          this.awaitingCatchup = true;
          this.start = msg as MatchStart;
          return;
        }
        this.start = msg as MatchStart;
        this.awaitingCatchup = !!msg.catchup;
        this.catchupTarget = 0;
        this.turns.clear();
        this.lastTurn = -1;
        this.frame = 0;
        this.acc = 0;
        return this.onStart(this.start);
      case "catchup":
        for (const [n, c] of msg.log as [number, Turn][]) this.turns.set(n, c);
        if (msg.final === false) return;
        this.lastTurn = Math.max(this.lastTurn, (msg.turn as number) - 1);
        this.catchupTarget = msg.turn * (this.start?.framesPerTurn ?? 6);
        this.awaitingCatchup = false;
        this.onStatus('Синхронизация матча…');
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
        this.cancelRetry(); this.saveTicket(null);
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
    this.awaitingCatchup = false;
    this.catchupTarget = 0;
    this.pendingOrders.clear();
  }

  /** Продвинуть игру на прошедшее время (мс). Возвращает число выполненных тактов. */
  advance(dtMs: number): number {
    const start = this.start;
    if (!start || this.awaitingCatchup) return 0;
    const fpt = start.framesPerTurn;
    const available = this.buffered;
    this.acc = Math.min(this.acc + (dtMs * 60) / 1000, 4);
    let budget = Math.floor(this.acc);
    // отстали (вкладка была скрыта, медленный компьютер) — догоняем, оставляя ход запаса
    if (available > 4 * fpt) budget = Math.max(budget, available - 2 * fpt);
    budget = Math.min(budget, available, 600);
    this.acc = Math.max(0, this.acc - budget);
    for (let i = 0; i < budget; i++) this.runFrame(fpt);
    if (this.catchupTarget > 0 && this.frame >= this.catchupTarget) {
      this.catchupTarget = 0;
      this.onStatus('Синхронизация завершена');
    }
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
