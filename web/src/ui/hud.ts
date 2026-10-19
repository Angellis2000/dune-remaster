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
import { structureLimitReached, unitAirSlotFree } from "../engine/structure.ts";
import { houseInfo, structureInfo,unitInfo } from "../engine/tables.ts";
import {customScriptType,customHudFrame,customStructureHudFrame} from '../engine/custom-unit-defs.ts';
import { blitTile, readU16, readU32 } from "../rom/md.ts";
import type { DuneRom } from "../rom/dune.ts";
import type {Portraits} from '../gfx/portraits.ts';
import {drawConsoleSymbol} from '../gfx/console-symbols.ts';

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
  /** знак запрета 3×3 тайла поверх иконки заказа (спрайт $FFC750, описание $065B3A), строка палитры 0 */
  prohibited: 0x065a1a,
  /** надпись «НЕТ ДЕНЕГ»: 11 сырых тайлов в строку, строка палитры 0 (спрайт $FFC862, описание $065CAE в (112, 112)) */
  noMoney: 0x065b4e,
  /** кадр иконки улучшения ($029536) и фрименов ($0297A2, $02993A) */
  upgradeFrame: 0x40,
  fremenTroopersFrame: 0x5e,
  fremenFrame: 0x68,
} as const;

/** Область HUD на экране MD: x 256…320, y 0…128. */
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
  /** знак запрета над иконкой заказа ($009CF4) */
  prohibited: boolean;
}

export interface HudStats {
  buildings: number;
  buildingsLost: number;
  units: number;
  unitsLost: number;
}

const EMPTY: HudState = { portrait: null, hp: null, order: null, bar: null, prohibited: false };

/** Вторая полоса: под иконкой заказа ($06A7E2, y=112) или сразу под прочностью ($06A7E8, y=80). */
const BAR_LOW = 112;
const BAR_HIGH = 80;

/**
 * Что показывает HUD — по $0294C2. Выбранное здание показывается, только если не выбран юнит.
 * Чужое: картинка и прочность.
 */
export function hudState(rom: DuneRom, s: Structure | null, u: Unit | null): HudState {
  const b = rom.bytes;
  const sInfo = (t: number) => readU32(b, HUD_ROM.structureInfo + (t===STRUCTURE.DRONE_PAD?5:t) * 4);
  const uInfo = (t: number) => readU32(b, HUD_ROM.unitInfo + customScriptType(t) * 4);
  const frameOf = (info: number) => readU16(b, info + 0x14);

  if (s && !u) {
    const t = s.o.type;
    const si = sInfo(t);
    const out: HudState = { portrait: t===STRUCTURE.DRONE_PAD?customStructureHudFrame(t):frameOf(si), hp: { value: s.o.hitpoints, max: t===STRUCTURE.DRONE_PAD?structureInfo[t].o.hitpoints:readU16(b, si + 0x10) }, order: null, bar: null, prohibited: false };
    if (s.o.houseID !== G.playerHouseID) return out;
    // $0295DE: запрет — двор при пределе построек (кроме заказа плит и стен), остальные при бите 8,
    // высокие технологии ещё и без места для авиации; у космопорта знака нет
    const limit = structureLimitReached(s);
    if (t === STRUCTURE.CONSTRUCTION_YARD) out.prohibited = limit && s.objectType !== STRUCTURE.SLAB_2x2 && s.objectType !== STRUCTURE.WALL;
    else if (t !== STRUCTURE.STARPORT) out.prohibited = limit || (t === STRUCTURE.HIGH_TECH && s.objectType!==UNIT.COMBAT_DRONE && !unitAirSlotFree());
    if (s.o.flags.upgrading && !(t === STRUCTURE.CONSTRUCTION_YARD && s.o.linkedID !== 0xff)) {
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
        out.order = t===STRUCTURE.CONSTRUCTION_YARD&&ot===STRUCTURE.DRONE_PAD?customStructureHudFrame(ot):t!==STRUCTURE.CONSTRUCTION_YARD&&ot>=27?customHudFrame(ot):frameOf(info);
        // бит 14 слова $6 — идёт стройка (снимается, когда заказ готов, $0121CA):
        // полоса = время стройки − (countDown >> 8)
        if (s.o.linkedID !== 0xff && s.state === STATE.BUSY) {
          const total = t===STRUCTURE.CONSTRUCTION_YARD&&ot===STRUCTURE.DRONE_PAD?structureInfo[ot].o.buildTime:t!==STRUCTURE.CONSTRUCTION_YARD&&ot>=27?unitInfo[ot].o.buildTime:readU16(b, info + 0x18);
          out.bar = { value: total - ((s.countDown >> 8) & 0xff), max: total, color: 7, y: BAR_LOW };
        }
      }
      return out;
    }
    if (t === STRUCTURE.REPAIR && s.o.linkedID !== 0xff) {
      // $029740–$029780: поле юнита $5A — начальное время ремонта, $56 здания — остаток.
      const unit = G.units[s.o.linkedID];
      out.order = unit.o.type>=27?customHudFrame(unit.o.type):frameOf(uInfo(unit.o.type));
      out.bar = { value: unit.repairTime - s.countDown, max: unit.repairTime, color: 7, y: BAR_LOW };
      return out;
    }
    if (t === STRUCTURE.PALACE) {
      // $029356: знак, пока идёт пауза после спецоружия ($4E), полосы в это время нет
      out.prohibited = s.specialWait !== 0;
      out.order = s.o.houseID === HOUSE.ATREIDES ? HUD_ROM.fremenTroopersFrame : frameOf(uInfo(s.objectType & 0xff));
      const total = houseInfo[s.o.houseID].specialCountDown;
      if (s.specialWait === 0 && s.countDown !== 0) out.bar = { value: total - s.countDown, max: total, color: 7, y: BAR_LOW };
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
    const portrait = t>=27?customHudFrame(t):u.o.houseID === HOUSE.FREMEN && t !== UNIT.SANDWORM ? (t === UNIT.TROOPERS ? HUD_ROM.fremenTroopersFrame : HUD_ROM.fremenFrame) : frameOf(ui);
    if (u.o.hitpoints === 0) return EMPTY;
    const out: HudState = { portrait, hp: { value: u.o.hitpoints, max: t>=27?unitInfo[t].o.hitpoints:readU16(b, ui + 0x10) }, order: null, bar: null, prohibited: false };
    if(t===UNIT.COMBAT_DRONE)out.bar={value:u.drone?.battery??100,max:100,color:3,y:BAR_HIGH};
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
 * Надпись «НЕТ ДЕНЕГ» ($0099AC): зовётся счётчиком кредитов, пока показано меньше 50.
 * Пока число меняется — взвод (90 кадров показа, без паузы). Когда досчитало — показ 90 кадров,
 * затем пауза 900 и показ по 60. Спрайт мигает сам: 8 кадров виден, 1 скрыт. Сверено в эмуляторе.
 */
export class NoMoneyWarning {
  /** $FFC864 — сколько ещё показывать */
  private display = -1;
  /** $FFC866 — пауза до следующего показа */
  private cooldown = -1;
  /** бит 0 байта $7 спрайта */
  private armed = false;
  private shownFrames = 0;
  visible = false;

  reset(): void {
    this.display = -1;
    this.cooldown = -1;
    this.armed = false;
    this.visible = false;
  }

  update(settled: boolean): void {
    if (!settled) {
      this.display = 90;
      this.cooldown = 0;
      this.armed = true;
      this.visible = false;
      return;
    }
    if (!this.armed) return;
    if (this.cooldown >= 0) {
      this.cooldown--;
      return;
    }
    if (--this.display < 0) {
      this.cooldown = 900;
      this.display = 60;
      this.visible = false;
    } else {
      if (!this.visible) this.shownFrames = 0;
      this.visible = true;
      this.shownFrames++;
    }
  }

  /** С учётом мигания спрайта ($0010B0, счётчик 8). */
  get drawn(): boolean {
    return this.visible && this.shownFrames % 9 !== 0;
  }
}

/** Счётчик кредитов $011F38: число догоняет кредиты дома, щелчок — каждый четвёртый шаг. */
export class CreditsTicker {
  /** $FFC058 — последнее досчитанное значение */
  private reached = 0;
  /** $FFD6C0 — счётчик */
  private old = 0;
  /** $FFD6BC — накопленный сдвиг */
  private offset = 0;
  /** $FFD6B4: число обновлений счётчика; сохраняется и между миссиями. */
  private soundTicks = 0;
  onSound: (id: number) => void = () => {};
  /** то, что выводится цифрами */
  shown = 0;
  readonly noMoney = new NoMoneyWarning();

  /** Режим 2 (начало миссии): счёт с нуля до кредитов дома. */
  reset(credits: number): void {
    this.reached = credits;
    this.old = 0;
    this.offset = 0;
    this.noMoney.reset();
    this.step(credits);
  }

  /** Режим 0 — раз в кадр. */
  tick(credits: number): void {
    // $011F76: пока досчитанное меньше 50 — надпись «НЕТ ДЕНЕГ»
    if (this.reached >>> 0 < 50) this.noMoney.update(this.reached === credits);
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
    // $012118: считаются шаги, а не все кадры; $34 — приход, $35 — расход.
    if ((this.soundTicks++ & 3) === 0) this.onSound(diff > 0 ? 0x34 : 0x35);
  }
}

/** Screen-space HUD. Map zoom never changes its size or typography. */
export class Hud {
  readonly canvas = document.createElement("canvas");
  /** «НЕТ ДЕНЕГ» — посреди экрана: x 112…200, y 112 при экране 320×224 */
  readonly warning = document.createElement("canvas");
  private g: CanvasRenderingContext2D;
  private palette: Uint32Array;
  private key = "";
  readonly credits = new CreditsTicker();
  private pictures=new Map<number,{image:()=>HTMLCanvasElement,crop:{x:number,y:number,w:number,h:number}}>();

  constructor(private rom: DuneRom, portraits:Portraits) {
    this.canvas.className = "hud";
    this.canvas.width = 504;
    this.canvas.height = 512;
    this.canvas.setAttribute("aria-hidden", "true");
    this.g = this.canvas.getContext("2d")!;
    this.palette = rom.gamePalette();
    this.warning.className = "hud-warning";
    this.warning.width = 704;
    this.warning.height = 64;
    this.warning.setAttribute("aria-hidden", "true");
    const w=this.warning.getContext('2d')!;
    w.scale(4,4);w.fillStyle='#151a20ed';w.fillRect(0,0,176,16);w.strokeStyle='#bd9453';w.strokeRect(.5,.5,175,15);
    w.font='600 9px "Segoe UI", sans-serif';w.fillStyle='#ffe0a0';w.textAlign='center';w.textBaseline='middle';w.fillText('НЕДОСТАТОЧНО КРЕДИТОВ',88,8);
    for(const [kind,table,count] of [['structure',HUD_ROM.structureInfo,19],['unit',HUD_ROM.unitInfo,27]] as const){
      for(let type=0;type<count;type++){
        const info=readU32(rom.bytes,table+type*4),frame=readU16(rom.bytes,info+0x14);
        if(!this.pictures.has(frame)){
          let crop={x:112,y:68,w:160,h:120};
          if(kind==='structure'){
            crop={x:0,y:0,w:128,h:96};
          }
          this.pictures.set(frame,{image:()=>kind==='structure'?portraits.icon(kind,type):portraits.image(kind,type),crop});
        }
      }
    }
    this.pictures.set(HUD_ROM.fremenFrame,{image:()=>portraits.image('unit',4),crop:{x:112,y:68,w:160,h:120}});
    this.pictures.set(customStructureHudFrame(STRUCTURE.DRONE_PAD),{image:()=>portraits.icon('structure',STRUCTURE.DRONE_PAD),crop:{x:0,y:0,w:128,h:96}});
    for(const type of [UNIT.LASER_TANK,UNIT.COMBAT_DRONE])this.pictures.set(customHudFrame(type),{image:()=>portraits.image('unit',type),crop:{x:80,y:32,w:224,h:168}});
    this.pictures.set(HUD_ROM.fremenTroopersFrame,{image:()=>portraits.image('unit',5),crop:{x:112,y:68,w:160,h:120}});
    this.warning.hidden = true;
  }

  /** Перерисовать, если что-то поменялось. `state` — null, когда видны только кредиты. */
  draw(state: HudState | null, stats: HudStats = { buildings: 0, buildingsLost: 0, units: 0, unitsLost: 0 }): void {
    this.warning.hidden = !this.credits.noMoney.drawn;
    const text = String(this.credits.shown).padStart(6, " ");
    const key = `${G.playerHouseID}|${text}|${JSON.stringify(state)}|${JSON.stringify(stats)}`;
    if (key === this.key) return;
    this.key = key;
    const g=this.g;g.clearRect(0,0,504,512);g.save();g.scale(4,4);g.imageSmoothingEnabled=true;
    g.fillStyle='#101820ed';g.fillRect(0,0,126,46);g.strokeStyle='#8b7650';g.lineWidth=.5;g.strokeRect(.5,.5,125,45);
    g.textAlign='left';g.font='700 7px "Segoe UI", sans-serif';g.fillStyle='#c3b89e';g.fillText('СПАЙС',7,11);
    g.textAlign='right';g.font='700 16px "IBM Plex Mono", monospace';g.fillStyle='#ffe4aa';
    g.shadowColor='#000';g.shadowBlur=2;g.fillText(text.trim(),119,23);g.shadowBlur=0;
    g.strokeStyle='#514733';g.lineWidth=.5;g.beginPath();g.moveTo(6,26);g.lineTo(120,26);g.stroke();
    g.textAlign='left';g.font='600 5.5px "IBM Plex Mono", monospace';g.fillStyle='#c3b89e';
    g.fillText('ЗДАНИЯ',7,35);g.fillText('ВОЙСКА',7,44);
    g.textAlign='right';g.fillStyle='#f2d59a';
    g.fillText(`${String(stats.buildings).padStart(2,'0')}  −${String(stats.buildingsLost).padStart(2,'0')}`,119,35);
    g.fillText(`${String(stats.units).padStart(2,'0')}  −${String(stats.unitsLost).padStart(2,'0')}`,119,44);
    if (state) {
      if (state.portrait !== null) this.frame(state.portrait, 48);
      if (state.hp) {
        const p = barFill(state.hp.value, state.hp.max);
        if (p >= 0) this.bar(p, state.hp.value/state.hp.max>.5?'#76ba76':state.hp.value/state.hp.max>.25?'#e6b859':'#df6954', 80);
      }
      if (state.order !== null) this.frame(state.order, 88);
      if (state.prohibited) {
        g.strokeStyle='#ff866e';g.lineWidth=1.5;g.beginPath();g.arc(32,104,8,0,Math.PI*2);g.moveTo(26,98);g.lineTo(38,110);g.stroke();
      }
      if (state.bar) {
        const p = barFill(state.bar.value, state.bar.max);
        if (p >= 0) this.bar(p,state.bar.color===3?'#d9ab58':'#65b2d5',state.bar.y===BAR_LOW?112:80);
      }
    }
    g.restore();
  }

  /** Кадр 4×3 тайла из таблицы $060E8C (тайлы по столбцам, как у спрайта VDP). */
  private frame(frame: number, y: number): void {
    const g=this.g,sprite=this.pictures.get(frame),picture=sprite?.image();
    g.fillStyle='#111a20ec';g.fillRect(15,y-1,34,26);g.strokeStyle='#778184';g.lineWidth=.45;g.strokeRect(15.5,y-.5,33,25);
    if(picture&&sprite){
      g.drawImage(picture,sprite.crop.x,sprite.crop.y,sprite.crop.w,sprite.crop.h,16,y,32,24);
      return;
    }
    if(frame===HUD_ROM.upgradeFrame){
      drawConsoleSymbol(g,'upgrade',32,y+12,18);return;
    }
    // ROM-only special pictures retain a fallback; normal units/buildings use HD art.
    const px=new Uint32Array(32*24);
    const b = this.rom.bytes;
    const e = HUD_ROM.frames + frame * 8;
    const line = b[e + 4] === 0xfe ? 1 : b[e + 4] === 0xff ? 3 : -1;
    if (line < 0) return;
    const tiles = b.subarray(readU32(b, e) & 0xffffff);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) blitTile(tiles, (line << 13) | (c * 3 + r), this.palette, px, 32, c * 8, r * 8);
    const c=document.createElement('canvas');c.width=32;c.height=24;
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(px.buffer),32,24),0,0);
    g.drawImage(c,16,y,32,24);
  }

  private bar(p:number,color:string,y:number):void {
    const g=this.g;g.fillStyle='#0a0e12';g.fillRect(15,y,34,2.2);g.fillStyle=color;g.fillRect(16,y+.4,32*(p+1)/32,1.4);
    g.fillStyle='#ffffff28';g.fillRect(16,y+.4,32*(p+1)/32,.35);
  }
}
