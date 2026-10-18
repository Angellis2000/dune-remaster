/**
 * Меню «НАСТРОЙКИ» по кнопке Start и экран «ВВЕДИТЕ ПАРОЛЬ» — как в оригинале MD: фон, шрифт,
 * стрелка и рамка буквы берутся из ROM (gfx/screens.ts), раскладка и поведение — по коду меню
 * $020E00: пункты по кругу, переключатели меняются кнопками A/B/C и стрелками влево-вправо,
 * Start — выход. Пока меню открыто, игра стоит.
 */
import { MENU_ROM, SCREEN_H, SCREEN_W, type ScreenGfx } from "../gfx/screens.ts";
import type { Button } from "../input/pad.ts";
import { menuArrow, menuPoint, menuText, prepareMenu } from "../gfx/menu-canvas.ts";

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
/** клетка ↵ (ряд 2, столбец 8) */
const ENTER_CELL = 28;

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
  /** звук интерфейса ($02DDB6): $19 — стрелка, $28 — выбор */
  ui?(seq: number): void;
  /** «МУЗЫКА»/«СПЕЦЭФФЕКТЫ» по A — секвенция GEMS ($0212A6, $0213C2) */
  playTrack?(seq: number): void;
  playSfx?(seq: number): void;
}

export class SettingsMenu {
  readonly root: HTMLElement;
  private canvas = document.createElement("canvas");
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
  private blink = 0;
  private raf = 0;

  constructor(
    private gfx: ScreenGfx,
    private host: SettingsHost,
  ) {
    this.root = document.createElement("section");
    this.root.className = "settings options hd-menu";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Настройки");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
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
    if (b === "up") (this.index = (this.index + n - 1) % n), this.host.ui?.(0x19);
    else if (b === "down") (this.index = (this.index + 1) % n), this.host.ui?.(0x19);
    else if (b === "start") this.close();
    else this.activate(b);
  }

  /** A/B/C и стрелки влево-вправо на пункте (в оригинале переключатели принимают все пять). */
  private activate(b: Button): void {
    const step = b === "left" ? -1 : 1;
    const press = b === "a" || b === "b" || b === "c";
    if (!press && b !== "left" && b !== "right") return;
    if (press && this.index !== ITEM.SFX) this.host.ui?.(0x28);
    switch (this.index) {
      case ITEM.MUSIC: this.host.setMusic(!this.host.music()); break;
      case ITEM.SOUND: this.host.setSound(!this.host.sound()); break;
      case ITEM.RADAR: this.host.setRadar(!this.host.radar()); break;
      case ITEM.TRACKS:
        if (!press) this.track = (this.track + step + this.tracks.length) % this.tracks.length;
        else if (this.tracks[this.track]) this.host.playTrack?.(this.tracks[this.track].id);
        break;
      case ITEM.SFX:
        if (!press) this.sfx = (this.sfx + step + this.sounds.length) % this.sounds.length;
        else if (this.sounds[this.sfx]) this.host.playSfx?.(this.sounds[this.sfx].id);
        break;
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
    this.blink = 0;
    if (b === "left") this.cell = row * 10 + ((col + rowLen(row) - 1) % rowLen(row));
    else if (b === "right") this.cell = row * 10 + ((col + 1) % rowLen(row));
    else if (b === "up" || b === "down") {
      const r = (row + (b === "up" ? 2 : 1)) % 3;
      this.cell = r * 10 + Math.min(col, rowLen(r) - 1);
    } else if (b === "a" || b === "b" || b === "c") this.pressCell();
    else if (b === "start") {
      // в оригинале Start только выходит; полный пароль уровня (набранный с клавиатуры) заодно запускаем
      if (this.pos === PASSWORD_LENGTH && decodePassword(this.word.join(""))?.kind === "level") this.submit();
      else this.toMenu();
    }
  }

  /** Start на экране пароля — назад в «НАСТРОЙКИ», стрелка на первом пункте (как в оригинале). */
  private toMenu(): void {
    this.mode = "menu";
    this.index = 0;
  }

  private pressCell(): void {
    const row = Math.floor(this.cell / 10);
    const col = this.cell % 10;
    const key = row < 2 ? LETTERS[row * 10 + col] : LAST_ROW[col];
    if (key === "<") this.pos = Math.max(0, this.pos - 1);
    else if (key === ">") this.pos = Math.min(PASSWORD_LENGTH, this.pos + 1, this.word.length);
    else if (key === "OK") this.submit();
    else this.type(key);
  }

  /** Буква в позицию ввода; после десятой курсор сам встаёт на ↵, дальше буквы не идут. */
  private type(ch: string): void {
    if (this.pos >= PASSWORD_LENGTH) return;
    this.word[this.pos++] = ch;
    if (this.pos === PASSWORD_LENGTH) this.cell = ENTER_CELL;
  }

  /**
   * ↵ — проверка по таблице паролей ($021908). Пароль уровня запускает уровень; коды срабатывают,
   * а экран остаётся; неверный пароль ничего не делает.
   */
  private submit(): void {
    const result = decodePassword(this.word.join(""));
    if (!result) return;
    if (result.kind === "level" || result.cheat === "DUNEFINALE") {
      this.close();
      this.host.password(result);
    } else if (result.cheat === "VERSIONNUM") {
      this.word = [...this.strings.version.padEnd(PASSWORD_LENGTH).slice(0, PASSWORD_LENGTH)];
    } else this.host.password(result);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.root.hidden || this.mode !== "password") return;
    if (/^Key[A-Z]$/.test(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.type(e.code.slice(3));
    } else if (e.code === "Backspace") {
      e.preventDefault();
      this.pos = Math.max(0, this.pos - 1);
      this.word.length = this.pos;
    } else if (e.code === "Escape") {
      e.preventDefault();
      this.toMenu();
    }
  }

  /** Мышь: щелчок по пункту или букве — как выбор и A. */
  private onClick(e: MouseEvent): void {
    const { x, y } = menuPoint(this.canvas, e);
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
    this.blink++;
    this.draw();
    if (!this.root.hidden) this.raf = requestAnimationFrame(() => this.loop());
  }

  private draw(): void {
    const g = prepareMenu(this.canvas);
    const str = this.strings;
    const yes = (on: boolean) => (on ? str.yes : str.no);
    const hd = this.gfx.art.background(g, this.mode === "menu" ? "settings" : "password");
    const russian = /[А-Я]/.test(str.restart);
    const text = (value: string, line: number, x: number, y: number, maxWidth = 320 - x) => {
      if (hd) menuText(g, value, x, y, { size: 8, color: line === 2 ? "#8df7ff" : "#fff9e9", maxWidth });
      else g.drawImage(this.gfx.text(value, line), x, y);
    };
    if (this.mode === "menu") {
      if (!hd) g.drawImage(this.gfx.background("settings"), 0, 0);
      else {
        menuText(g, russian ? "НАСТРОЙКИ" : "OPTIONS", 160, 16, { size: 10, align: "center" });
        const labels = russian ? ["МУЗЫКА", "ЗВУКИ", "РАДАР", "ФОНОТЕКА", "СПЕЦЭФФЕКТЫ"]
          : ["MUSIC", "SOUND", "RADAR", "MUSIC PLAYER", "SOUND PLAYER"];
        labels.forEach((label, i) => text(label, 3, 32, ROWS[i], 140));
        text(russian ? "ВВЕСТИ ПАРОЛЬ" : "ENTER PASSWORD", 3, 32, ROWS[ITEM.PASSWORD]);
        menuText(g, russian ? 'НАЖМИТЕ «START» ДЛЯ ВЫХОДА' : 'PRESS START TO EXIT', 160, 200,
          { size: 8, align: "center", maxWidth: 288 });
      }
      // значения — бирюзовые (строка палитры 2), команды внизу — белые (строка 3)
      const values = [
        yes(this.host.music()),
        yes(this.host.sound()),
        yes(this.host.radar()),
        this.tracks[this.track]?.name ?? "",
        this.sounds[this.sfx]?.name ?? "",
      ];
      values.forEach((v, i) => text(v, 2, VALUE_X, ROWS[i]));
      text(str.restart, 3, 32, ROWS[ITEM.RESTART]);
      text(str.chooseHouse, 3, 32, ROWS[ITEM.HOUSE]);
      if (this.index === ITEM.HOUSE) text(str.houses[HOUSES[this.house].id], 2, VALUE_X + 8, ROWS[ITEM.HOUSE] + 12);
      menuArrow(g, 12, ROWS[this.index], this.frame);
      return;
    }
    if (!hd) g.drawImage(this.gfx.background("password"), 0, 0);
    else {
      menuText(g, russian ? "ВВЕДИТЕ ПАРОЛЬ" : "ENTER PASSWORD", 160, 24,
        { size: 10, color: "#8df7ff", align: "center" });
      [...LETTERS].forEach((letter, i) => text(letter, 3, GRID_X + i % 10 * GRID_STEP, GRID_Y + Math.floor(i / 10) * GRID_STEP));
      LAST_ROW.slice(6).forEach((label, i) => text(label === "OK" ? "↵" : label === "<" ? "◀\uFE0E" : "▶\uFE0E", 3,
        GRID_X + (i + 6) * GRID_STEP, GRID_Y + 2 * GRID_STEP));
      g.fillStyle = "#121a20";
      g.fillRect(112, 104, 104, 24);
      g.strokeStyle = "#84d8ff";
      g.lineWidth = 0.7;
      g.strokeRect(112, 104, 104, 24);
      g.strokeRect(114, 106, 100, 20);
      menuText(g, russian ? 'НАЖМИТЕ «START» ДЛЯ ВЫХОДА' : 'PRESS START TO EXIT', 160, 200,
        { size: 8, align: "center", maxWidth: 288 });
    }
    const row = Math.floor(this.cell / 10);
    const col = this.cell % 10;
    const wide = row === 2 && LAST_ROW[col] === "OK";
    const fx = GRID_X + col * GRID_STEP - 4;
    const fy = GRID_Y + row * GRID_STEP - 4;
    // рамка мигает (в оригинале пропадает на несколько кадров); после нажатия сразу видна
    if ((this.blink & 31) >= 24) {
      /* рамка погашена */
    } else if (hd) {
      g.strokeStyle = "#f2f5fc";
      g.lineWidth = 0.65;
      g.strokeRect(fx, fy, wide ? 32 : 16, 16);
    } else if (wide) {
      const frame = this.gfx.letterFrame();
      // ↵ шире буквы: рамку растягиваем на две клетки
      g.drawImage(frame, 0, 0, 8, 16, fx, fy, 8, 16);
      g.drawImage(frame, 8, 0, 8, 16, fx + 24, fy, 8, 16);
      g.drawImage(frame, 4, 0, 8, 16, fx + 8, fy, 16, 16);
    } else g.drawImage(this.gfx.letterFrame(), fx, fy);
    for (let i = 0; i < PASSWORD_LENGTH; i++) text(this.word[i] || " ", 3, INPUT_X + i * 8, INPUT_Y, 8);
    text("_", 3, INPUT_X + this.pos * 8, INPUT_Y);
  }
}
