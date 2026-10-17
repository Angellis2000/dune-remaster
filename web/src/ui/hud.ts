/**
 * HUD справа вверху, как на карте MD: кредиты цифрами из ROM, картинка выбранного 4×3 тайла,
 * полоса прочности, иконка заказа и полоса хода работы. Всё это в оригинале — спрайты
 * (описания $06A798…$06A80E, позиции в координатах экрана 320×224).
 *
 * Логика выбора — процедура $0294C2 (зовётся каждый кадр карты), отрисовка:
 * картинка $0098E0 (VRAM $F280), иконка заказа $009946 ($F4C0), прочность $0096CA ($F440),
 * вторая полоса $009866 ($F640), кредиты $00A5DA ($F6C0), счётчик кредитов $011F38.
 */
import { G, HOUSE, STATE, STRUCTURE, UNIT, type Structure, type Unit } from "../engine/core.ts";
import { houseInfo, structureInfo } from "../engine/tables.ts";
import { blitTile, readU16, readU32 } from "../rom/md.ts";
import type { DuneRom } from "../rom/dune.ts";

export const HUD_ROM = {
  /** таблица кадров: 8 байт — указатель на сырые тайлы, байт +4: FE — строка палитры 1, FF — строка 3 */
  frames: 0x060e8c,
  /** описания зданий по типу (указатели), +$14 — кадр картинки, +$10 — прочность, +$18 — время стройки */
  structureInfo: 0x06b954,
  unitInfo: 0x06c5bc,
  /** цифры кредитов: тайл (символ − 0x2F), пробел — тайл 0 */
  digits: 0x050ad4,
  /** цвет полосы прочности по номеру занятого тайла (0–3) */
  hpColors: 0x009742,
  /** кадр иконки улучшения ($029536) и фрименов ($0297A2, $02993A) */
  upgradeFrame: 0x40,
  fremenTroopersFrame: 0x5e,
  fremenFrame: 0x68,
} as const;

/** Область HUD на экране MD: x 256…320, y 0…128. */
const X0 = 256;
export const HUD_W = 64;
export const HUD_H = 128;

/** Полоса: значение, максимум, цвет (для прочности — по таблице), строка y на экране. */
interface Bar {
  value: number;
  max: number;
  color: number;
  y: number;
}

export interface HudState {
  portrait: number | null;
  hp: { value: number; max: number } | null;
  order: number | null;
  bar: Bar | null;
}

const EMPTY: HudState = { portrait: null, hp: null, order: null, bar: null };

/** Вторая полоса: под иконкой заказа ($06A7E2, y=112) или сразу под прочностью ($06A7E8, y=80). */
const BAR_LOW = 112;
const BAR_HIGH = 80;

/**
 * Что показывает HUD — по $0294C2. Выбранное здание показывается, только если не выбран юнит.
 * Чужое: картинка и прочность.
 */
export function hudState(rom: DuneRom, s: Structure | null, u: Unit | null): HudState {
  const b = rom.bytes;
  const sInfo = (t: number) => readU32(b, HUD_ROM.structureInfo + t * 4);
  const uInfo = (t: number) => readU32(b, HUD_ROM.unitInfo + t * 4);
  const frameOf = (info: number) => readU16(b, info + 0x14);

  if (s && !u) {
    const t = s.o.type;
    const si = sInfo(t);
    const out: HudState = { portrait: frameOf(si), hp: { value: s.o.hitpoints, max: readU16(b, si + 0x10) }, order: null, bar: null };
    if (s.o.houseID !== G.playerHouseID) return out;
    if (s.o.flags.upgrading) {
      out.order = HUD_ROM.upgradeFrame;
      out.bar = { value: 100 - s.upgradeTimeLeft, max: 100, color: 7, y: BAR_LOW };
      return out;
    }
    if (t === STRUCTURE.STARPORT) {
      // $02989E: доставка заказа — время доставки дома минус оставшееся
      const h = G.houses[s.o.houseID];
      if (h.starportLinkedID !== 0xffff) {
        const total = houseInfo[s.o.houseID].starportDeliveryTime;
        out.bar = { value: total - h.starportTimeLeft, max: total, color: 7, y: BAR_HIGH };
      }
      return out;
    }
    if (structureInfo[t].o.flags.factory) {
      const ot = s.objectType;
      if (ot !== 0xffff && ot !== 0xff) {
        const info = t === STRUCTURE.CONSTRUCTION_YARD ? sInfo(ot) : uInfo(ot);
        out.order = frameOf(info);
        // бит 14 слова $6 — идёт стройка (снимается, когда заказ готов, $0121CA):
        // полоса = время стройки − (countDown >> 8)
        if (s.o.linkedID !== 0xff && s.state === STATE.BUSY) {
          const total = readU16(b, info + 0x18);
          out.bar = { value: total - ((s.countDown >> 8) & 0xff), max: total, color: 7, y: BAR_LOW };
        }
      }
      return out;
    }
    if (t === STRUCTURE.REPAIR && s.o.linkedID !== 0xff) {
      // $029740: иконка ремонтируемого юнита; полосу считает поле юнита $5A (не опознано) — пока без неё
      out.order = frameOf(uInfo(G.units[s.o.linkedID].o.type));
      return out;
    }
    if (t === STRUCTURE.PALACE) {
      out.order = s.o.houseID === HOUSE.ATREIDES ? HUD_ROM.fremenTroopersFrame : frameOf(uInfo(s.objectType & 0xff));
      const total = houseInfo[s.o.houseID].specialCountDown;
      if (s.countDown !== 0) out.bar = { value: total - s.countDown, max: total, color: 7, y: BAR_LOW };
      return out;
    }
    const h = G.houses[s.o.houseID];
    if (t === STRUCTURE.WINDTRAP) {
      // $02983C: потребление / выработка дома, синяя полоса сразу под прочностью
      out.bar = { value: Math.max(1, h.powerUsage), max: h.powerProduction, color: 7, y: BAR_HIGH };
    } else if (t === STRUCTURE.REFINERY || t === STRUCTURE.SILO) {
      // $029862: кредиты / вместимость хранилищ, оба делятся пополам, пока вместимость > $7FF
      let value = h.credits >>> 0;
      let max = h.creditsStorage >>> 0;
      while (max > 0x7ff) {
        max >>>= 1;
        value >>>= 1;
      }
      out.bar = { value: value || 1, max, color: 3, y: BAR_HIGH };
    }
    return out;
  }

  if (u) {
    const t = u.o.type;
    const ui = uInfo(t);
    // $029922: у фрименов свои картинки (кроме червя)
    const portrait = u.o.houseID === HOUSE.FREMEN && t !== UNIT.SANDWORM ? (t === UNIT.TROOPERS ? HUD_ROM.fremenTroopersFrame : HUD_ROM.fremenFrame) : frameOf(ui);
    if (u.o.hitpoints === 0) return EMPTY;
    const out: HudState = { portrait, hp: { value: u.o.hitpoints, max: readU16(b, ui + 0x10) }, order: null, bar: null };
    // $02998E: у харвестера — груз пряности из 100, полоса под прочностью
    if (t === UNIT.HARVESTER) out.bar = { value: u.amount, max: 100, color: 3, y: BAR_HIGH };
    return out;
  }
  return EMPTY;
}

/**
 * Длина полосы как в $0096CA/$009866: min(значение, максимум)·32/максимум, при делении без остатка −1.
 * Возвращает номер последнего закрашенного столбца 0…31 или −1, если полосу не показывать.
 */
export function barFill(value: number, max: number): number {
  if (value <= 0 || max <= 0) return -1;
  const v = Math.min(value, max);
  const q = Math.floor(((v << 5) & 0xffff) / max);
  return ((v << 5) & 0xffff) % max === 0 ? q - 1 : q;
}

/**
 * Пиксели полосы 32×8 (номера цветов строки 2) — тот же рисунок, что строит $009772:
 * строки 0–1 пустые, 2 и 7 — рамка цвета 12, 3–6 — заливка с рамкой слева и справа.
 */
export function barPixels(p: number, color: number): Uint8Array {
  const px = new Uint8Array(32 * 8);
  const t = p >> 3;
  const k = p & 7;
  for (let x = 0; x < 32; x++) {
    const i = x >> 3;
    const j = x & 7;
    const border = i < t || (i === t && j <= k) ? 12 : 0;
    const fill = i < t || (i === t && j < k) ? color : i === t && j === k ? 12 : 0;
    px[2 * 32 + x] = border;
    px[7 * 32 + x] = border;
    for (let y = 3; y <= 6; y++) px[y * 32 + x] = x === 0 ? 12 : fill;
  }
  return px;
}

/**
 * Счётчик кредитов $011F38 (режим 0): показанное число догоняет кредиты дома
 * шагом до 16 в кадр (сдвиг копится по 1/8), как в оригинале. Звуки щелчков (0x34/0x35) — пока без звука.
 */
export class CreditsTicker {
  /** $FFC058 — последнее досчитанное значение */
  private reached = 0;
  /** $FFD6C0 — счётчик */
  private old = 0;
  /** $FFD6BC — накопленный сдвиг */
  private offset = 0;
  /** то, что выводится цифрами */
  shown = 0;

  /** Режим 2 (начало миссии): счёт с нуля до кредитов дома. */
  reset(credits: number): void {
    this.reached = credits;
    this.old = 0;
    this.offset = 0;
    this.step(credits);
  }

  /** Режим 0 — раз в кадр. */
  tick(credits: number): void {
    if (this.reached === credits || this.old === credits) return;
    this.step(credits);
  }

  private step(credits: number): void {
    const diff = ((credits - this.old) << 16) >> 16;
    if (diff === 0) this.offset = 0;
    else {
      let d = diff >> 2;
      if (d === 0) d = 1;
      this.offset += Math.max(-128, Math.min(128, d));
    }
    if (this.offset < 0 && this.old === 0) this.offset = 0;
    this.old += this.offset >> 3;
    if (this.offset < 0) this.old += 1;
    if (this.offset > 0) this.offset &= 7;
    if (this.offset < 0) this.offset |= ~7;
    if (this.old < 0) this.old = 0;
    this.reached = this.offset < 0 ? Math.max(0, this.old - 1) : this.old;
    this.shown = this.offset > 0 ? this.old + 1 : this.old;
  }
}

/** Холст HUD 64×128 (область x 256…320 экрана MD), масштабируется вместе с картой. */
export class Hud {
  readonly canvas = document.createElement("canvas");
  private g: CanvasRenderingContext2D;
  private palette: Uint32Array;
  private key = "";
  readonly credits = new CreditsTicker();

  constructor(private rom: DuneRom) {
    this.canvas.className = "hud";
    this.canvas.width = HUD_W;
    this.canvas.height = HUD_H;
    this.canvas.setAttribute("aria-hidden", "true");
    this.g = this.canvas.getContext("2d")!;
    this.palette = rom.gamePalette();
  }

  setZoom(zoom: number): void {
    this.canvas.style.width = `${HUD_W * zoom}px`;
    this.canvas.style.height = `${HUD_H * zoom}px`;
  }

  /** Перерисовать, если что-то поменялось. `state` — null, когда видны только кредиты. */
  draw(state: HudState | null): void {
    const text = String(this.credits.shown).padStart(6, " ");
    const key = `${text}|${JSON.stringify(state)}`;
    if (key === this.key) return;
    this.key = key;
    const px = new Uint32Array(HUD_W * HUD_H);
    const b = this.rom.bytes;
    // кредиты: 6 знаков с x=256, y=16, строка палитры 1
    for (let i = 0; i < 6; i++) {
      const ch = text.charCodeAt(text.length - 6 + i);
      const tile = ch === 0x20 ? 0 : ch - 0x2f;
      blitTile(b.subarray(HUD_ROM.digits), (1 << 13) | tile, this.palette, px, HUD_W, 256 - X0 + i * 8, 16);
    }
    if (state) {
      if (state.portrait !== null) this.frame(px, state.portrait, 272, 48);
      if (state.hp) {
        const p = barFill(state.hp.value, state.hp.max);
        if (p >= 0) this.bar(px, barPixels(p, b[HUD_ROM.hpColors + (p >> 3) * 4] & 15), 272, 72);
      }
      if (state.order !== null) this.frame(px, state.order, 272, 88);
      if (state.bar) {
        const p = barFill(state.bar.value, state.bar.max);
        if (p >= 0) this.bar(px, barPixels(p, state.bar.color), 272, state.bar.y);
      }
    }
    this.g.putImageData(new ImageData(new Uint8ClampedArray(px.buffer), HUD_W, HUD_H), 0, 0);
  }

  /** Кадр 4×3 тайла из таблицы $060E8C (тайлы по столбцам, как у спрайта VDP). */
  private frame(px: Uint32Array, frame: number, x: number, y: number): void {
    const b = this.rom.bytes;
    const e = HUD_ROM.frames + frame * 8;
    const line = b[e + 4] === 0xfe ? 1 : b[e + 4] === 0xff ? 3 : -1;
    if (line < 0) return;
    const tiles = b.subarray(readU32(b, e) & 0xffffff);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) blitTile(tiles, (line << 13) | (c * 3 + r), this.palette, px, HUD_W, x - X0 + c * 8, y + r * 8);
  }

  private bar(px: Uint32Array, bar: Uint8Array, x: number, y: number): void {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 32; c++) {
        const ci = bar[r * 32 + c];
        if (ci) px[(y + r) * HUD_W + x - X0 + c] = this.palette[2 * 16 + ci];
      }
  }
}
