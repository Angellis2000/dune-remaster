/**
 * Меню C — как в оригинале на Mega Drive: картинка выбранного, прочность и список действий.
 * Юнит: приказы (Атаковать, Двигаться, Отступить, Охранять…). Здание: производство и заказ,
 * постановка готового здания, ремонт, улучшение, оружие дворца, покупка в космопорте.
 *
 * Геймпад: C — открыть/закрыть, ↑/↓ — выбор, A — выполнить, B — закрыть. Мышью — щелчок по пункту.
 */
import { ACTION, G, SELECTION, STATE, STRUCTURE, UNIT, type Structure as EStructure, type Unit as EUnit } from "../engine/core.ts";
import { houseInfo, structureInfo, unitInfo } from "../engine/tables.ts";
import { HOUSE_NAMES } from "../game/tables.ts";
import { STRUCTURE_NAMES, UNIT_NAMES } from "../game/names.ts";
import type { World } from "../game/world.ts";
import type { Button } from "../input/pad.ts";
import type { DuneRom, Picture } from "../rom/dune.ts";

export const ACTION_NAMES = [
  "Атаковать", "Двигаться", "Отступить", "Охранять", "Охранять район", "Собирать", "Вернуться", "Стоп", "Засада",
  "Диверсия", "Погибнуть", "Охота", "Развернуть", "Самоуничтожение",
];

const SPECIAL_NAMES: Record<number, string> = { 1: "Запустить ракету", 2: "Позвать фрименов", 3: "Выпустить диверсанта" };

interface Item {
  label: string;
  note?: string;
  picture?: string;
  disabled?: boolean;
  active?: boolean;
  run: () => void;
}

export interface CommandHost {
  /** выделенные свои юниты (приказ идёт всем) */
  selectedUnits(): EUnit[];
  selectedStructure(): EStructure | null;
  /** просто показать (чужой юнит/здание) */
  inspected(): { type: number; house: number; hp: number; isUnit: boolean } | null;
  /** после приказа, которому нужна цель на карте */
  targetMode(text: string): void;
  changed(): void;
  /** показывать ли меню (в режиме мыши) */
  visible(): boolean;
}

export class CommandPanel {
  readonly root = document.createElement("aside");
  /** меню открыто с геймпада: стрелки двигают выбор, а не курсор */
  focused = false;
  private list = document.createElement("ol");
  private head = document.createElement("div");
  private items: Item[] = [];
  private index = 0;
  private pictures = new Map<string, string>();
  private starportPrices: number[] | null = null;
  private starportOf: EStructure | null = null;

  constructor(
    private rom: DuneRom,
    private world: World,
    private host: CommandHost,
  ) {
    this.root.className = "command";
    this.root.setAttribute("aria-label", "Меню приказов");
    this.list.className = "command-list";
    this.root.append(this.head, this.list);
    this.root.hidden = true;
  }

  private picture(kind: "unit" | "structure", type: number): string {
    const key = `${kind}:${type}`;
    let url = this.pictures.get(key);
    if (url === undefined) {
      const list: Picture[] = kind === "unit" ? this.rom.unitPictures() : this.rom.structurePictures();
      const p = list.find((x) => x.id === type);
      url = "";
      if (p) {
        const c = document.createElement("canvas");
        c.width = p.width;
        c.height = p.height;
        c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.pixels), p.width, p.height), 0, 0);
        url = c.toDataURL();
      }
      this.pictures.set(key, url);
    }
    return url;
  }

  open(): void {
    this.focused = true;
    this.index = Math.max(0, this.items.findIndex((i) => !i.disabled));
    this.update();
  }

  close(): void {
    this.focused = false;
    this.update();
  }

  /** Кнопка геймпада, пока меню открыто. true — кнопка обработана. */
  handlePad(b: Button): boolean {
    if (!this.focused) return false;
    const n = this.items.length;
    if (b === "up" || b === "down") {
      if (!n) return true;
      const step = b === "up" ? -1 : 1;
      for (let k = 0; k < n; k++) {
        this.index = (this.index + step + n) % n;
        if (!this.items[this.index].disabled) break;
      }
      this.update();
      return true;
    }
    if (b === "a") {
      const it = this.items[this.index];
      if (it && !it.disabled) it.run();
      return true;
    }
    if (b === "b" || b === "c") {
      this.close();
      return true;
    }
    return b === "left" || b === "right";
  }

  /** Перестроить содержимое по текущему выбору. */
  update(): void {
    if (!this.host.visible() && !this.focused) {
      this.root.hidden = true;
      return;
    }
    const units = this.host.selectedUnits();
    const s = this.host.selectedStructure();
    const other = this.host.inspected();
    this.items = [];
    let title = "";
    let sub = "";
    let pic = "";
    let hp = -1;
    if (units.length) {
      const u = units[0];
      const ui = unitInfo[u.o.type];
      title = UNIT_NAMES[u.o.type] ?? `Юнит ${u.o.type}`;
      if (units.length > 1) title += ` и ещё ${units.length - 1}`;
      pic = this.picture("unit", u.o.type);
      hp = u.o.hitpoints / Math.max(1, ui.o.hitpoints);
      sub = ACTION_NAMES[u.actionID] ?? "";
      if (u.o.type === UNIT.HARVESTER) sub += ` · груз ${u.amount}%`;
      this.unitItems(units);
    } else if (s && s.o.houseID === G.playerHouseID) {
      const si = structureInfo[s.o.type];
      title = STRUCTURE_NAMES[s.o.type] ?? `Здание ${s.o.type}`;
      pic = this.picture("structure", s.o.type);
      hp = s.o.hitpoints / Math.max(1, si.o.hitpoints);
      const h = G.houses[G.playerHouseID];
      sub = `Энергия ${h.powerProduction}/${h.powerUsage} · хранилища ${h.creditsStorage}`;
      this.structureItems(s);
    } else if (other) {
      title = (other.isUnit ? UNIT_NAMES[other.type] : STRUCTURE_NAMES[other.type]) ?? "?";
      pic = this.picture(other.isUnit ? "unit" : "structure", other.type);
      hp = other.hp / 256;
      sub = HOUSE_NAMES[other.house] ?? "";
    }
    if (!title) {
      this.root.hidden = !this.focused;
      if (this.focused) {
        this.head.replaceChildren(text("p", "Сначала выберите юнит или здание (A).", "command-hint"));
        this.list.replaceChildren();
      }
      return;
    }
    this.root.hidden = false;
    this.root.classList.toggle("focused", this.focused);
    const img = document.createElement("img");
    img.alt = "";
    if (pic) img.src = pic;
    img.hidden = !pic;
    const bar = document.createElement("div");
    bar.className = "command-hp";
    const fill = document.createElement("span");
    fill.style.width = `${Math.round(Math.max(0, Math.min(1, hp)) * 100)}%`;
    fill.className = hp < 0.25 ? "low" : hp < 0.5 ? "mid" : "";
    bar.append(fill);
    bar.hidden = hp < 0;
    this.head.replaceChildren(img, text("strong", title), bar, text("span", sub, "command-sub"));

    if (this.index >= this.items.length) this.index = Math.max(0, this.items.length - 1);
    // кнопки не пересоздаём, а обновляем на месте: иначе щелчок, начатый на старой кнопке,
    // теряется или попадает в новую, которая встала на её место
    const lis = this.list.children;
    while (lis.length > this.items.length) lis[lis.length - 1].remove();
    this.items.forEach((it, i) => {
      let b = lis[i]?.firstElementChild as HTMLButtonElement | undefined;
      if (!b) {
        const li = document.createElement("li");
        b = document.createElement("button");
        b.type = "button";
        b.addEventListener("click", () => {
          const cur = this.items[i];
          this.index = i;
          if (cur && !cur.disabled) cur.run();
        });
        li.append(b);
        this.list.append(li);
      }
      b.disabled = !!it.disabled;
      b.className = [it.active ? "active" : "", this.focused && i === this.index ? "cursor" : ""].join(" ").trim();
      const key = `${it.picture ?? ""}|${it.label}|${it.note ?? ""}`;
      if (b.dataset.key === key) return;
      b.dataset.key = key;
      const parts: Node[] = [];
      if (it.picture) {
        const pi = document.createElement("img");
        pi.src = it.picture;
        pi.alt = "";
        parts.push(pi);
      }
      parts.push(text("span", it.label));
      if (it.note) parts.push(text("small", it.note));
      b.replaceChildren(...parts);
    });
  }

  private done(): void {
    this.host.changed();
    this.update();
  }

  private unitItems(units: EUnit[]): void {
    const u = units[0];
    if (u.o.houseID !== G.playerHouseID && u.o.type !== UNIT.HARVESTER) return;
    const actions = unitInfo[u.o.type].o.actionsPlayer;
    const current = u.nextActionID !== ACTION.INVALID ? u.nextActionID : u.actionID;
    for (const action of actions) {
      if (action >= ACTION.MAX) continue;
      this.items.push({
        label: ACTION_NAMES[action],
        active: action === current,
        run: () => {
          const needsTarget = this.world.game.unitCommand(u, action);
          if (needsTarget) {
            this.focused = false;
            this.host.targetMode(action === ACTION.MOVE ? "Укажите, куда двигаться (A)" : "Укажите цель (A)");
          } else {
            for (const other of units.slice(1)) this.world.game.unitCommand(other, action);
          }
          this.done();
        },
      });
    }
  }

  private structureItems(s: EStructure): void {
    const game = this.world.game;
    const si = structureInfo[s.o.type];
    const h = G.houses[G.playerHouseID];

    if (s.o.type === STRUCTURE.STARPORT) {
      if (this.starportOf !== s || !this.starportPrices) {
        this.starportOf = s;
        this.starportPrices = game.starportPrices();
      }
      const prices = this.starportPrices;
      if (h.starportLinkedID !== 0xffff) this.items.push({ label: `Заказ в пути: ${h.starportTimeLeft}`, disabled: true, run: () => {} });
      for (let t = 0; t < UNIT.MAX; t++) {
        const count = G.starportAvailable[t];
        if (count === 0) continue;
        this.items.push({
          label: UNIT_NAMES[t] ?? `Юнит ${t}`,
          note: count > 0 ? `${prices[t]} · есть ${count}` : "нет в наличии",
          picture: this.picture("unit", t),
          disabled: count <= 0 || h.credits < prices[t],
          run: () => {
            game.starportBuy(s, t, prices[t]);
            this.done();
          },
        });
      }
    } else if (si.o.flags.factory) {
      const prod = game.production(s);
      const isYard = s.o.type === STRUCTURE.CONSTRUCTION_YARD;
      const nameOf = (t: number) => (isYard ? STRUCTURE_NAMES[t] : UNIT_NAMES[t]) ?? `${t}`;
      // список заказов стоит на месте (как сетка иконок в окне оригинала): то, что строится,
      // показывает ход стройки; пауза и отмена — ниже, чтобы повторный щелчок не попадал в них
      for (const opt of game.buildOptions(s)) {
        const building = !!prod && prod.type === opt.type;
        this.items.push({
          label: nameOf(opt.type),
          note: opt.available < 0 ? "после улучшения" : building ? (prod.ready ? "готово" : prod.onHold ? `пауза ${Math.floor(prod.progress * 100)}%` : `${Math.floor(prod.progress * 100)}%`) : `${opt.cost}`,
          picture: this.picture(isYard ? "structure" : "unit", opt.type),
          disabled: opt.available < 0,
          active: building,
          run: () => {
            if (building) {
              // уже строится: готовое здание — сразу на постановку, иначе ничего
              if (isYard && prod.ready && game.placeIt(s)) this.focused = false;
            } else {
              game.build(s, opt.type);
              this.focused = false; // как в оригинале: заказ принят — назад на карту
            }
            this.done();
          },
        });
      }
      if (prod && !prod.ready) {
        this.items.push({
          label: prod.onHold ? "Продолжить" : "Пауза",
          run: () => {
            game.holdOrResume(s);
            this.done();
          },
        });
      }
      if (prod) {
        this.items.push({
          label: "Отменить заказ",
          run: () => {
            game.cancelBuild(s);
            this.done();
          },
        });
      }
      const up = game.upgradeInfo(s);
      if (up.possible) {
        this.items.push({
          label: s.o.flags.upgrading ? "Остановить улучшение" : "Улучшить",
          note: s.o.flags.upgrading ? `${100 - s.upgradeTimeLeft}%` : `${up.cost}`,
          active: s.o.flags.upgrading,
          run: () => {
            game.upgrade(s);
            this.done();
          },
        });
      }
    }

    if (s.o.type === STRUCTURE.PALACE) {
      const ready = s.countDown === 0;
      const weapon = SPECIAL_NAMES[houseInfo[G.playerHouseID].specialWeapon] ?? "Особое оружие";
      this.items.push({
        label: weapon,
        note: ready ? "готово" : `ещё ${s.countDown}`,
        disabled: !ready,
        run: () => {
          game.palaceSpecial(s);
          if (G.selectionType === SELECTION.TARGET) {
            this.focused = false;
            this.host.targetMode("Укажите цель для ракеты (A)");
          }
          this.done();
        },
      });
    }

    if (s.o.hitpoints < si.o.hitpoints) {
      this.items.push({
        label: s.o.flags.repairing ? "Остановить ремонт" : "Ремонт",
        active: s.o.flags.repairing,
        run: () => {
          game.toggleRepair(s);
          this.done();
        },
      });
    }
    if (s.state === STATE.BUSY && s.o.type === STRUCTURE.REFINERY) this.items.push({ label: "Перерабатывает пряность", disabled: true, run: () => {} });
  }
}

function text(tag: string, value: string, className = ""): HTMLElement {
  const e = document.createElement(tag);
  e.textContent = value;
  if (className) e.className = className;
  return e;
}
