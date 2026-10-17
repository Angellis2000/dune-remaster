/**
 * Меню «НАСТРОЙКИ» по кнопке Start и экран «ВВЕДИТЕ ПАРОЛЬ» — как в оригинале MD: фон, шрифт,
 * стрелка и рамка буквы берутся из ROM (gfx/screens.ts), раскладка и поведение — по коду меню
 * $020E00: пункты по кругу, переключатели меняются кнопками A/B/C и стрелками влево-вправо,
 * Start — выход. Пока меню открыто, игра стоит.
 */
import { MENU_ROM, SCREEN_H, SCREEN_W, type ScreenGfx } from "../gfx/screens.ts";
import type { Button } from "../input/pad.ts";

export type HouseCode = "A" | "O" | "H";

/** Пароли уровней 2–9 оригинала (уровень 1 начинается без пароля). */
const PASSWORDS: Record<HouseCode, string[]> = {
  A: ["DIPLOMATIC", "SPICEDANCE", "ETERNALSUN", "DEFTHUNTER", "FAIRMENTAT", "ASHLIKENNY", "SONICBLAST", "DUNERUNNER"],
  O: ["DOMINATION", "SPICESABRE", "ARRAKISSUN", "COLDHUNTER", "WILYMENTAT", "SLYMELANIE", "STEALTHWAR", "POWERCRUSH"],
  H: ["DEMOLITION", "SPICESATYR", "BURNINGSUN", "DARKHUNTER", "EVILMENTAT", "ITSJOEBWAN", "DEVASTATOR", "DEATHRULER"],
};

/** Коды оригинала, которые вводятся как пароль. */
export type Cheat = "LOOKAROUND" | "SPLURGEOLA" | "PLAYTESTER" | "VERSIONNUM" | "DUNEFINALE";
const CHEATS: Cheat[] = ["LOOKAROUND", "SPLURGEOLA", "PLAYTESTER", "VERSIONNUM", "DUNEFINALE"];

export type PasswordResult = { kind: "level"; house: HouseCode; mission: number } | { kind: "cheat"; cheat: Cheat } | null;

export function decodePassword(text: string): PasswordResult {
  const word = text.toUpperCase().replace(/[^A-Z]/g, "");
  for (const house of Object.keys(PASSWORDS) as HouseCode[]) {
    const i = PASSWORDS[house].indexOf(word);
    if (i >= 0) return { kind: "level", house, mission: i + 2 };
  }
  const cheat = CHEATS.find((c) => c === word);
  return cheat ? { kind: "cheat", cheat } : null;
}

/** Пароль уровня, или null для первого (он без пароля). */
export function passwordFor(house: HouseCode, mission: number): string | null {
  return PASSWORDS[house][mission - 2] ?? null;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PASSWORD_LENGTH = 10;

/** Строки пунктов (y на экране 320×224), как в оригинале; стрелка — x 12, на 4 выше строки. */
const ROWS = [40, 56, 72, 88, 104, 136, 152, 168];
const ITEM = { MUSIC: 0, SOUND: 1, RADAR: 2, TRACKS: 3, SFX: 4, PASSWORD: 5, RESTART: 6, HOUSE: 7 } as const;
const VALUE_X = 176;

/** Сетка букв экрана пароля: 10 в ряд, в последнем ряду ◄ ► и ↵. */
const GRID_X = 88;
const GRID_Y = 56;
const GRID_STEP = 16;
const LAST_ROW = [..."UVWXYZ", "<", ">", "OK"];
const INPUT_X = 120;
const INPUT_Y = 112;

/** Дома в порядке выбора и их номера в таблице имён ROM (0 — Харконнены, 1 — Атрейдесы, 2 — Ордосы). */
const HOUSES: { code: HouseCode; id: number }[] = [
  { code: "A", id: 1 },
  { code: "O", id: 2 },
  { code: "H", id: 0 },
];

export interface SettingsHost {
  music(): boolean;
  setMusic(on: boolean): void;
  sound(): boolean;
  setSound(on: boolean): void;
  radar(): boolean;
  setRadar(on: boolean): void;
  restart(): void;
  chooseHouse(house: HouseCode): void;
  password(result: Exclude<PasswordResult, null>): void;
  /** меню открылось или закрылось — игра на паузе, пока оно открыто */
  toggled(open: boolean): void;
}

export class SettingsMenu {
  readonly root: HTMLElement;
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private mode: "menu" | "password" = "menu";
  private index = 0;
  private track = 0;
  private sfx = 0;
  private house = 0;
  private tracks: { name: string; id: number }[];
  private sounds: { name: string; id: number }[];
  private strings: ReturnType<ScreenGfx["menuStrings"]>;
  // экран пароля
  private cell = 0;
  private word: string[] = [];
  private pos = 0;
  private frame = 0;
  private raf = 0;

  constructor(
    private gfx: ScreenGfx,
    private host: SettingsHost,
  ) {
    this.root = document.createElement("section");
    this.root.className = "settings";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Настройки");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.root.append(this.canvas);
    this.tracks = gfx.names(MENU_ROM.tracks);
    this.sounds = gfx.names(MENU_ROM.sounds);
    this.strings = gfx.menuStrings();
    window.addEventListener("keydown", (e) => this.onKey(e));
    this.canvas.addEventListener("click", (e) => this.onClick(e));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    this.root.hidden = false;
    this.mode = "menu";
    this.index = 0;
    this.host.toggled(true);
    this.loop();
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
    this.host.toggled(false);
  }

  openPassword(): void {
    this.mode = "password";
    this.cell = 0;
    this.word = [];
    this.pos = 0;
  }

  /** Кнопки геймпада, пока меню открыто. Возвращает true, если нажатие съедено. */
  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    if (this.mode === "menu") this.menuPad(b);
    else this.passwordPad(b);
    return true;
  }

  private menuPad(b: Button): void {
    const n = ROWS.length;
    if (b === "up") this.index = (this.index + n - 1) % n;
    else if (b === "down") this.index = (this.index + 1) % n;
    else if (b === "start") this.close();
    else this.activate(b);
  }

  /** A/B/C и стрелки влево-вправо на пункте (в оригинале переключатели принимают все пять). */
  private activate(b: Button): void {
    const step = b === "left" ? -1 : 1;
    const press = b === "a" || b === "b" || b === "c";
    if (!press && b !== "left" && b !== "right") return;
    switch (this.index) {
      case ITEM.MUSIC: this.host.setMusic(!this.host.music()); break;
      case ITEM.SOUND: this.host.setSound(!this.host.sound()); break;
      case ITEM.RADAR: this.host.setRadar(!this.host.radar()); break;
      case ITEM.TRACKS: if (!press) this.track = (this.track + step + this.tracks.length) % this.tracks.length; break;
      case ITEM.SFX: if (!press) this.sfx = (this.sfx + step + this.sounds.length) % this.sounds.length; break;
      case ITEM.PASSWORD: if (press) this.openPassword(); break;
      case ITEM.RESTART: if (press) (this.close(), this.host.restart()); break;
      case ITEM.HOUSE:
        if (press) (this.close(), this.host.chooseHouse(HOUSES[this.house].code));
        else this.house = (this.house + step + HOUSES.length) % HOUSES.length;
        break;
    }
  }

  private passwordPad(b: Button): void {
    const row = Math.floor(this.cell / 10);
    const col = this.cell % 10;
    const rowLen = (r: number) => (r === 2 ? LAST_ROW.length : 10);
    if (b === "left") this.cell = row * 10 + ((col + rowLen(row) - 1) % rowLen(row));
    else if (b === "right") this.cell = row * 10 + ((col + 1) % rowLen(row));
    else if (b === "up" || b === "down") {
      const r = (row + (b === "up" ? 2 : 1)) % 3;
      this.cell = r * 10 + Math.min(col, rowLen(r) - 1);
    } else if (b === "a" || b === "b" || b === "c") this.pressCell();
    else if (b === "start") {
      if (this.word.filter(Boolean).length === PASSWORD_LENGTH) this.submit();
      else this.mode = "menu";
    }
  }

  private pressCell(): void {
    const row = Math.floor(this.cell / 10);
    const col = this.cell % 10;
    const key = row < 2 ? LETTERS[row * 10 + col] : LAST_ROW[col];
    if (key === "<") this.pos = Math.max(0, this.pos - 1);
    else if (key === ">") this.pos = Math.min(PASSWORD_LENGTH - 1, this.pos + 1);
    else if (key === "OK") this.submit();
    else this.type(key);
  }

  private type(ch: string): void {
    this.word[this.pos] = ch;
    this.pos = Math.min(PASSWORD_LENGTH - 1, this.pos + 1);
  }

  private submit(): void {
    const result = decodePassword(this.word.join(""));
    if (!result) {
      // неверный пароль: поле очищается, как сброс ввода в оригинале
      this.word = [];
      this.pos = 0;
      return;
    }
    this.close();
    this.host.password(result);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.root.hidden || this.mode !== "password") return;
    if (/^Key[A-Z]$/.test(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.type(e.code.slice(3));
    } else if (e.code === "Backspace") {
      e.preventDefault();
      this.pos = Math.max(0, this.pos - (this.word[this.pos] ? 0 : 1));
      this.word[this.pos] = "";
    } else if (e.code === "Escape") {
      e.preventDefault();
      this.mode = "menu";
    }
  }

  /** Мышь: щелчок по пункту или букве — как выбор и A. */
  private onClick(e: MouseEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SCREEN_W;
    const y = ((e.clientY - r.top) / r.height) * SCREEN_H;
    if (this.mode === "menu") {
      const i = ROWS.findIndex((ry) => y >= ry - 4 && y < ry + 12);
      if (i < 0) return;
      this.index = i;
      this.activate(x >= VALUE_X - 8 && (i === ITEM.TRACKS || i === ITEM.SFX || i === ITEM.HOUSE) ? "right" : "a");
    } else {
      const col = Math.floor((x - GRID_X + 4) / GRID_STEP);
      const row = Math.floor((y - GRID_Y + 4) / GRID_STEP);
      if (row < 0 || row > 2 || col < 0 || col > 9) return;
      this.cell = row * 10 + Math.min(col, row === 2 ? LAST_ROW.length - 1 : 9);
      this.pressCell();
    }
  }

  private loop(): void {
    this.frame++;
    this.draw();
    if (!this.root.hidden) this.raf = requestAnimationFrame(() => this.loop());
  }

  private draw(): void {
    const g = this.ctx;
    const str = this.strings;
    const yes = (on: boolean) => (on ? str.yes : str.no);
    if (this.mode === "menu") {
      g.drawImage(this.gfx.background("settings"), 0, 0);
      // значения — бирюзовые (строка палитры 2), команды внизу — белые (строка 3)
      const values = [
        yes(this.host.music()),
        yes(this.host.sound()),
        yes(this.host.radar()),
        this.tracks[this.track]?.name ?? "",
        this.sounds[this.sfx]?.name ?? "",
      ];
      values.forEach((v, i) => g.drawImage(this.gfx.text(v, 2), VALUE_X, ROWS[i]));
      g.drawImage(this.gfx.text(str.restart, 3), 32, ROWS[ITEM.RESTART]);
      g.drawImage(this.gfx.text(str.chooseHouse, 3), 32, ROWS[ITEM.HOUSE]);
      if (this.index === ITEM.HOUSE) g.drawImage(this.gfx.text(str.houses[HOUSES[this.house].id], 2), VALUE_X + 8, ROWS[ITEM.HOUSE] + 12);
      g.drawImage(this.gfx.arrow(this.frame >> 2), 12, ROWS[this.index] - 4);
      return;
    }
    g.drawImage(this.gfx.background("password"), 0, 0);
    const row = Math.floor(this.cell / 10);
    const col = this.cell % 10;
    const wide = row === 2 && LAST_ROW[col] === "OK";
    const fx = GRID_X + col * GRID_STEP - 4;
    const fy = GRID_Y + row * GRID_STEP - 4;
    const frame = this.gfx.letterFrame();
    if (wide) {
      // ↵ шире буквы: рамку растягиваем на две клетки
      g.drawImage(frame, 0, 0, 8, 16, fx, fy, 8, 16);
      g.drawImage(frame, 8, 0, 8, 16, fx + 24, fy, 8, 16);
      g.drawImage(frame, 4, 0, 8, 16, fx + 8, fy, 16, 16);
    } else g.drawImage(frame, fx, fy);
    const text = Array.from({ length: PASSWORD_LENGTH }, (_, i) => this.word[i] || " ").join("");
    g.drawImage(this.gfx.text(text, 3), INPUT_X, INPUT_Y);
    if ((this.frame >> 4) & 1) g.drawImage(this.gfx.text("_", 3), INPUT_X + this.pos * 8, INPUT_Y);
  }
}
