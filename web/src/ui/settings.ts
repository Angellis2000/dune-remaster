/**
 * Меню «НАСТРОЙКИ» по кнопке Start, как в оригинале MD: игра стоит на паузе, пункты выбираются
 * крестовиной и A, B или Start — назад. Отсюда же вводятся пароли уровней и коды.
 */
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
const GRID_COLUMNS = 9;

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

interface Item {
  label: string;
  /** значение справа, как «ДА» у пунктов-переключателей оригинала */
  value?: () => string;
  run: () => void;
  /** отступ перед пунктом (в оригинале команды отделены пустой строкой) */
  gap?: boolean;
}

export class SettingsMenu {
  readonly root: HTMLElement;
  private list = document.createElement("ul");
  private entry = document.createElement("div");
  private main: Item[];
  private houses: Item[];
  private items: Item[];
  private index = 0;
  private mode: "menu" | "password" = "menu";
  private word = "";
  private letter = 0;
  private note = document.createElement("p");

  constructor(private host: SettingsHost) {
    this.root = document.createElement("section");
    this.root.className = "settings";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Настройки");
    this.root.hidden = true;
    const title = document.createElement("h2");
    title.textContent = "НАСТРОЙКИ";
    this.list.className = "settings-list";
    this.entry.className = "password";
    this.note.className = "settings-note";
    const footer = document.createElement("p");
    footer.className = "settings-footer";
    footer.textContent = "НАЖМИ <START> ДЛЯ ВЫХОДА";
    this.root.append(title, this.list, this.entry, this.note, footer);
    const yes = (on: boolean) => (on ? "ДА" : "НЕТ");
    // пункты и порядок — как на экране «НАСТРОЙКИ» MD (фонотека и спецэффекты появятся вместе со звуком)
    this.main = [
      { label: "МУЗЫКА", value: () => yes(this.host.music()), run: () => this.host.setMusic(!this.host.music()) },
      { label: "ЗВУКИ", value: () => yes(this.host.sound()), run: () => this.host.setSound(!this.host.sound()) },
      { label: "РАДАР", value: () => yes(this.host.radar()), run: () => this.host.setRadar(!this.host.radar()) },
      { label: "ВВЕСТИ ПАРОЛЬ", run: () => this.openPassword(), gap: true },
      { label: "НАЧАТЬ СНАЧАЛА", run: () => (this.close(), this.host.restart()) },
      { label: "ВЫБРАТЬ ДРУГОЙ ДОМ", run: () => this.showList(this.houses) },
    ];
    const house = (code: HouseCode, name: string): Item => ({ label: name, run: () => (this.close(), this.host.chooseHouse(code)) });
    this.houses = [house("A", "АТРЕЙДЕСЫ"), house("O", "ОРДОСЫ"), house("H", "ХАРКОННЕНЫ"), { label: "НАЗАД", run: () => this.showList(this.main), gap: true }];
    this.items = this.main;
    window.addEventListener("keydown", (e) => this.onKey(e));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    this.root.hidden = false;
    this.host.toggled(true);
    this.showList(this.main);
  }

  private showList(items: Item[]): void {
    this.mode = "menu";
    this.items = items;
    this.index = 0;
    this.note.textContent = "";
    this.render();
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.host.toggled(false);
  }

  openPassword(): void {
    this.root.hidden = false;
    this.mode = "password";
    this.word = "";
    this.letter = 0;
    this.note.textContent = "Крестовина — буква, A — ввести, B — стереть, Start — готово. Можно печатать с клавиатуры.";
    this.render();
  }

  /** Кнопки геймпада, пока меню открыто. Возвращает true, если нажатие съедено. */
  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    if (this.mode === "menu") {
      const n = this.items.length;
      if (b === "up") this.index = (this.index + n - 1) % n;
      else if (b === "down") this.index = (this.index + 1) % n;
      else if (b === "a" || b === "c" || ((b === "left" || b === "right") && this.items[this.index].value)) this.items[this.index].run();
      else if (b === "start" || (b === "b" && this.items === this.main)) this.close();
      else if (b === "b") this.showList(this.main);
    } else {
      const n = LETTERS.length;
      if (b === "left") this.letter = (this.letter + n - 1) % n;
      else if (b === "right") this.letter = (this.letter + 1) % n;
      else if (b === "up") this.letter = (this.letter + n - GRID_COLUMNS) % n;
      else if (b === "down") this.letter = (this.letter + GRID_COLUMNS) % n;
      else if (b === "a" || b === "c") this.type(LETTERS[this.letter]);
      else if (b === "b") this.erase();
      else if (b === "start") this.submit();
    }
    if (!this.root.hidden) this.render();
    return true;
  }

  private onKey(e: KeyboardEvent): void {
    if (this.root.hidden || this.mode !== "password") return;
    if (/^Key[A-Z]$/.test(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.type(e.code.slice(3));
      this.render();
    } else if (e.code === "Backspace") {
      e.preventDefault();
      this.erase();
      this.render();
    } else if (e.code === "Escape") {
      e.preventDefault();
      this.showList(this.main);
    }
  }

  private type(ch: string): void {
    if (this.word.length < PASSWORD_LENGTH) this.word += ch;
    if (this.word.length === PASSWORD_LENGTH) this.submit();
  }

  private erase(): void {
    if (this.word.length) this.word = this.word.slice(0, -1);
    else this.showList(this.main);
  }

  private submit(): void {
    const result = decodePassword(this.word);
    if (!result) {
      this.note.textContent = "Неверный пароль";
      this.word = "";
      return;
    }
    this.close();
    this.host.password(result);
  }

  private render(): void {
    this.list.hidden = this.mode !== "menu";
    this.entry.hidden = this.mode !== "password";
    if (this.mode === "menu") {
      this.list.replaceChildren(
        ...this.items.map((it, i) => {
          const li = document.createElement("li");
          const btn = document.createElement("button");
          btn.type = "button";
          const label = document.createElement("span");
          label.textContent = it.label;
          btn.append(label);
          if (it.value) {
            const value = document.createElement("b");
            value.textContent = it.value();
            btn.append(value);
          }
          if (i === this.index) btn.className = "cursor";
          if (it.gap) li.className = "gap";
          btn.addEventListener("click", () => {
            this.index = i;
            it.run();
            if (!this.root.hidden) this.render();
          });
          li.append(btn);
          return li;
        }),
      );
      return;
    }
    const slots = document.createElement("div");
    slots.className = "password-slots";
    for (let i = 0; i < PASSWORD_LENGTH; i++) {
      const s = document.createElement("span");
      s.textContent = this.word[i] ?? "";
      if (i === this.word.length) s.className = "next";
      slots.append(s);
    }
    const grid = document.createElement("div");
    grid.className = "password-grid";
    [...LETTERS].forEach((ch, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = ch;
      if (i === this.letter) btn.className = "cursor";
      btn.addEventListener("click", () => {
        this.letter = i;
        this.type(ch);
        if (!this.root.hidden) this.render();
      });
      grid.append(btn);
    });
    this.entry.replaceChildren(slots, grid);
  }
}
