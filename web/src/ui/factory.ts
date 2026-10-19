/**
 * Окно здания в режиме геймпада — как в оригинале MD: A по выбранному своему зданию открывает
 * полноэкранное окно (рамка, кнопки, иконки, картинка, имя, цена, энергия и прочность — всё из ROM,
 * gfx/screens.ts). Курсор стоит на «ВЫХОД»; вниз — сетка заказов по 3 в ряд. A по заказу запускает
 * стройку и возвращает на карту, по готовому зданию — постановка. Пока окно открыто, игра стоит.
 * В режиме мыши вместо него остаётся правое меню (ui/command.ts).
 */
import { G, STATE, STRUCTURE, UNIT, type Structure } from "../engine/core.ts";
import { unitAirSlotFree } from "../engine/structure.ts";
import type { Game } from "../engine/game.ts";
import { layoutSize, structureInfo, unitInfo } from "../engine/tables.ts";
import { decodeText, SCREEN_H, SCREEN_W, type ScreenGfx } from "../gfx/screens.ts";
import type { Button } from "../input/pad.ts";
import type { DuneRom, Picture } from "../rom/dune.ts";
import { readU16 } from "../rom/md.ts";
import type {Portraits} from '../gfx/portraits.ts';
import {menuText,prepareMenu,menuPoint} from '../gfx/menu-canvas.ts';
import {drawStatusIcon} from '../gfx/status-icons.ts';
import {drawConsoleSymbol} from '../gfx/console-symbols.ts';
import {STRUCTURE_NAMES,UNIT_NAMES} from '../game/names.ts';

/** Кнопки окна слева направо и их иконки (номера в таблице иконок окна). */
const TABS = [
  { id: "exit", on: -1, off: -1 },
  { id: "repair", on: -2, off: -4 },
  { id: "stop", on: -3, off: -5 },
] as const;
const TAB_Y = 48;
const GRID_X = 32;
const GRID_Y = 72;
const CELL_W = 32;
const CELL_H = 24;
const COLUMNS = 3;
const ROWS_VISIBLE = 6;
const HD_ROW_H = 24;
/** правая часть окна: картинка, значок размера, имя и три числа (клетки плоскости Window) */
const PICTURE = { x: 160, y: 40 };
const SIZE_ICON = { x: 240, y: 80 };
const NAME = { x: 160, y: 104, chars: 12 };
const NUMBERS_RIGHT = 256;
const NUMBER_ROWS = [128, 160, 192];
const STAT_ICON_X = 160;
const STAT_ICON_Y = [120, 152, 184];
// Actual centres of the three apertures in production-console-hd.png (320×224 coordinates).
export const HD_STAT_SLOTS = [
  {iconX:168,iconY:128.23,valueY:131.33},
  {iconX:168,iconY:159.08,valueY:162.39},
  {iconX:168,iconY:190.37,valueY:194.10},
] as const;
const CREDITS = { right: 296, y: 16 };

export interface FactoryHost {
  game(): Game;
  credits(): number;
  /** окно открылось или закрылось — игра на паузе, пока оно открыто */
  toggled(open: boolean): void;
  /** заказ готов и взят на постановку */
  placing(): void;
  /** звук интерфейса ($02DDB6) */
  ui?(seq: number): void;
  /** звук $00A7DC */
  sfx?(id: number): void;
}

interface Order {
  type: number;
  available: number;
  cost: number;
  /** пункт «*УЛУЧШИТЬ*»: что улучшение откроет (тип здания у двора, юнита у заводов) */
  upgrade?: number;
}

/**
 * Огоньки рамки: место (клетка карты Window), таблица ROM, слов на кадр, число кадров и случайная пауза
 * между сменами (random(min..max) кадров), как в $007F90 (окно здания) и $00899A (космопорт).
 */
interface Light {
  col: number;
  row: number;
  table: number;
  words: number;
  frames: number;
  min: number;
  max: number;
}
const FACTORY_LIGHTS: Light[] = [
  { col: 15, row: 1, table: 0x007fcc, words: 8, frames: 4, min: 7, max: 27 },
  { col: 22, row: 3, table: 0x008048, words: 1, frames: 2, min: 4, max: 11 },
  { col: 34, row: 7, table: 0x008088, words: 1, frames: 2, min: 7, max: 17 },
];
const STARPORT_LIGHTS: Light[] = [
  { col: 33, row: 16, table: 0x0089d6, words: 4, frames: 4, min: 7, max: 27 },
  { col: 13, row: 1, table: 0x008a36, words: 3, frames: 16, min: 4, max: 11 },
];
const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Путь точки на экранчике космопорта ($008B0C): $B4 пар (y, x), центр спрайта; описание $04A70C — смещение −4. */
const BLIP_PATH = 0x008b0c;
const BLIP_LAST = 0xb3;

/** Иконка пункта улучшения (гаечный ключ): номер 19 в таблице зданий, 27 — юнитов (обе $06E890). */
const UPGRADE_ICON = { structures: 19, units: 27 };
/** Имя пункта улучшения — строка ROM, которую копирует код окна ($0276FA). */
const UPGRADE_NAME = 0x0276be;

export class FactoryWindow {
  readonly root: HTMLElement;
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private s: Structure | null = null;
  private orders: Order[] = [];
  /** −3…−1 — кнопки (ВЫХОД, РЕМОНТ, СТОП), 0… — заказы */
  private cursor = -3;
  private pictures = new Map<string, HTMLCanvasElement | null>();
  private frame = 0;
  private raf = 0;
  /** огоньки: таймер и текущий кадр */
  private lights: { timer: number; frame: number }[] = [];
  /** точка космопорта ($008A96): номер точки пути, направление, отражение */
  private blip = { index: 0, back: false, flip: 0 };

  constructor(
    private rom: DuneRom,
    private gfx: ScreenGfx,
    private host: FactoryHost,
    private portraits:Portraits|null=null,
  ) {
    this.root = document.createElement("section");
    this.root.className = `settings factory${portraits?' hd-menu':''}`;
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Окно здания");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", (e) => this.onClick(e));
    this.canvas.addEventListener('wheel',(e)=>{
      if(this.root.hidden||!this.portraits||!this.orders.length||e.deltaY===0)return;
      e.preventDefault();
      this.cursor=Math.max(0,Math.min(this.orders.length-1,Math.max(0,this.cursor)+Math.sign(e.deltaY)*COLUMNS));
      this.draw();
    },{passive:false});
    window.addEventListener("keydown", (e) => {
      if (!this.root.hidden && e.code === "Escape") this.close();
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  private get units(): boolean {
    return !!this.s && this.s.o.type !== STRUCTURE.CONSTRUCTION_YARD;
  }

  private get rowsVisible():number{return this.portraits?5:ROWS_VISIBLE;}

  private get starport(): boolean {
    return this.s?.o.type === STRUCTURE.STARPORT;
  }

  open(s: Structure): void {
    this.s = s;
    this.cursor = -3;
    this.lights = [];
    this.blip = { index: 0, back: false, flip: 0 };
    this.refresh();
    const production=this.host.game().production(s);
    if(production)this.cursor=this.orders.findIndex(order=>order.type===production.type);
    this.root.hidden = false;
    this.host.toggled(true);
    this.loop();
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
    this.host.toggled(false);
  }

  private refresh(): void {
    const s = this.s;
    if (s && this.starport) {
      // $008F2E: юниты CHOAM по возрастанию номера (и с нулевым запасом), цены — $027334
      const prices = this.host.game().starportPrices();
      this.orders = this.host.game().starportListed.map((type) => ({ type, available: G.starportAvailable[type], cost: prices[type] }));
      return;
    }
    const orders: Order[] = s && structureInfo[s.o.type].o.flags.factory ? this.host.game().buildOptions(s) : [];
    if(s&&s.o.type===STRUCTURE.CONSTRUCTION_YARD)for(const item of this.host.game().readyBuildings(s)){
      const order=orders.find(order=>order.type===item.type);
      if(order)order.available=1;else orders.push({type:item.type,available:1,cost:item.cost});
    }
    // в окне оригинала порядок обратный правому меню: по возрастанию приоритета (плиты, затем ветряк)
    this.orders = orders.reverse();
    // улучшение сортируется с приоритетом $7F ($028E44) — последним
    const up = s ? this.host.game().upgradeEntry(s) : null;
    if (up) this.orders.push({ type: -1, available: 1, cost: up.cost, upgrade: up.unlocks });
  }

  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    const n = this.orders.length;
    const col = this.cursor < 0 ? this.cursor + 3 : this.cursor % COLUMNS;
    const was = this.cursor;
    if (b === "left" || b === "right") {
      const d = b === "left" ? -1 : 1;
      if (this.cursor < 0) this.cursor = Math.min(-1, Math.max(-3, this.cursor + d));
      else {
        const next = this.cursor + d;
        if (Math.floor(next / COLUMNS) === Math.floor(this.cursor / COLUMNS) && next >= 0 && next < n) this.cursor = next;
      }
    } else if (b === "down") {
      if (this.cursor < 0) {
        if (n) this.cursor = Math.min(col, n - 1);
      } else if (this.cursor + COLUMNS < n) this.cursor += COLUMNS;
    } else if (b === "up") {
      if (this.cursor >= COLUMNS) this.cursor -= COLUMNS;
      else if (this.cursor >= 0) this.cursor = col - 3;
    } else if(b==='c'&&this.s&&this.host.game().canQueueUnits(this.s)&&this.cursor>=0)this.removeQueued();
    else if (b === "a" || b === "c") this.activate();
    // $0288E8: курсор сдвинулся — звук $19
    if (this.cursor !== was) this.host.ui?.(0x19);
    return true;
  }

  /** Кнопки ВЫХОД, РЕМОНТ, СТОП: светлая — можно нажать ($028F8C, $029042). */
  private buttons(s: Structure): boolean[] {
    const damaged = s.o.hitpoints < structureInfo[s.o.type].o.hitpoints;
    const busy = s.o.linkedID !== 0xff && (s.state === STATE.BUSY || (!this.units && s.state === STATE.READY));
    return [true, damaged, s.o.flags.repairing || s.o.flags.upgrading || busy || this.host.game().unitQueue(s).length>0];
  }

  /**
   * A в окне ($028876): нельзя (тёмная кнопка, авиации некуда, космопорт не продаёт) — звук ошибки $2F,
   * иначе действие и звук $26.
   */
  private activate(): void {
    const s = this.s;
    if (!s) return;
    const fail = () => this.host.sfx?.(0x2f);
    const ok = () => this.host.sfx?.(0x26);
    const game = this.host.game();
    if (this.cursor < 0 && !this.buttons(s)[this.cursor + 3]) return fail();
    if (this.cursor === -3) return ok(), this.close();
    if (this.cursor === -2) {
      ok();
      game.startRepair(s);
      return;
    }
    if (this.cursor === -1) {
      ok();
      game.stopAll(s);
      return;
    }
    const order = this.orders[this.cursor];
    if (!order || order.available < 0) return fail();
    if (this.starport) {
      // $028BB4: цена не больше кредитов, запас есть, для авиации — свободное место ($FFC728); покупка — и на карту
      if (order.cost > this.host.credits() || G.starportAvailable[order.type] <= 0) return fail();
      if ((order.type === UNIT.CARRYALL || order.type === UNIT.ORNITHOPTER) && !unitAirSlotFree()) return fail();
      if (game.starportBuy(s, order.type, order.cost)) (ok(), this.close());
      return;
    }
    // $029060: выбор пункта снимает ремонт
    // в сети это делает команда (у всех игроков в один такт)
    if (s.o.flags.repairing && !G.net) s.o.flags.repairing = false;
    if (order.upgrade !== undefined) {
      // $0290D4: уже улучшается — ничего; иначе улучшение и назад на карту
      if (s.o.flags.upgrading) return;
      game.upgrade(s);
      this.close();
      return;
    }
    if(game.canQueueUnits(s)){
      if(game.build(s,order.type))ok();else fail();
      this.draw();return;
    }
    // $0288BC: хайтек не заказывает авиацию, если для неё нет места ($FFC728), — звук ошибки 0x2F
    if (s.o.type === STRUCTURE.HIGH_TECH && (order.type === UNIT.CARRYALL || order.type === UNIT.ORNITHOPTER) && !unitAirSlotFree()) return fail();
    const prod = game.production(s);
    if(!this.units&&game.readyBuildings(s).some(item=>item.type===order.type)&&game.placeIt(s,true,order.type)){
      this.close();this.host.placing();return;
    }
    if(s.o.type!==STRUCTURE.CONSTRUCTION_YARD||(prod&&prod.type===order.type))ok();
    if (prod && prod.type === order.type) {
      // готовое здание — сразу постановка; заказ в работе — просто назад на карту
      if (prod.ready && !this.units && game.placeIt(s)) {
        this.close();
        this.host.placing();
        return;
      }
      if (prod.onHold) game.holdOrResume(s);
    } else game.build(s, order.type);
    this.close();
  }

  private onClick(e: MouseEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const point=this.portraits?menuPoint(this.canvas,e):{x:((e.clientX-r.left)/r.width)*SCREEN_W,y:((e.clientY-r.top)/r.height)*SCREEN_H};
    const {x,y}=point;
    if(this.portraits&&this.s&&y>=195&&y<209&&x>=GRID_X&&x<GRID_X+96){
      if(this.host.game().cancelQueuedUnit(this.s,Math.floor((x-GRID_X)/12)))this.host.sfx?.(0x26);
      this.draw();return;
    }
    const col = Math.floor((x - GRID_X) / CELL_W);
    if (col < 0 || col >= COLUMNS) return;
    if (y >= TAB_Y && y < TAB_Y + CELL_H) this.cursor = col - 3;
    else {
      const rowH=this.portraits?HD_ROW_H:CELL_H;
      const row=Math.floor((y-GRID_Y)/rowH);
      const firstRow=Math.max(0,Math.floor(Math.max(0,this.cursor)/COLUMNS)-this.rowsVisible+1);
      const i = (row+firstRow)*COLUMNS+col;
      if (row<0||row>=this.rowsVisible || i >= this.orders.length) return;
      this.cursor = i;
    }
    this.activate();
  }

  private removeQueued():void{
    const s=this.s,order=this.orders[this.cursor];if(!s||!order||order.type<0)return;
    const game=this.host.game(),queue=s.o.type===STRUCTURE.CONSTRUCTION_YARD?game.buildingQueue(s):game.unitQueue(s);let index=-1;
    for(let i=queue.length-1;i>=0;i--)if(queue[i].type===order.type){index=i;break;}
    if(index>=0){if(s.o.type===STRUCTURE.CONSTRUCTION_YARD)game.cancelQueuedBuilding(s,index);else game.cancelQueuedUnit(s,index);}
    else if(game.readyBuildings(s).some(item=>item.type===order.type))game.cancelReadyBuilding(s,order.type);
    else if(game.production(s)?.type===order.type)game.cancelBuild(s);
    else return;
    this.host.sfx?.(0x26);this.draw();
  }

  private loop(): void {
    this.frame++;
    if (this.frame % 30 === 0) this.refresh();
    this.draw();
    if (!this.root.hidden) this.raf = requestAnimationFrame(() => this.loop());
  }

  private draw(): void {
    if(this.portraits){this.drawHD();return;}
    this.drawOriginal();
  }

  private drawHD():void{
    const s=this.s;if(!s)return;
    const g=prepareMenu(this.canvas),game=this.host.game(),units=this.units,prod=game.production(s);
    const gfx=this.gfx;
    // Authored HD hardware keeps the recognizable original console and control positions.
    const hardware=gfx.art.get('productionConsole');
    if(hardware){
      g.drawImage(hardware,0,0,SCREEN_W,SCREEN_H);
      for(const [x,y,color]of [[181,24,'#70ff80'],[277,58,'#ff5b35']]as const){
        g.save();g.globalAlpha=.1+.12*Math.sin(this.frame/22)**2;g.fillStyle=color;g.shadowColor=color;g.shadowBlur=2;
        g.beginPath();g.arc(x,y,2,0,Math.PI*2);g.fill();g.restore();
      }
    }else g.drawImage(this.starport?gfx.starportBackground():gfx.factoryBackground(),0,0,SCREEN_W,SCREEN_H);
    const lights=this.starport?STARPORT_LIGHTS:FACTORY_LIGHTS;
    if(!hardware)lights.forEach((l,i)=>{
      const st=(this.lights[i]??={timer:0,frame:-1});
      if(--st.timer<0){st.timer=rnd(l.min,l.max);st.frame=rnd(0,l.frames-1);}
      g.drawImage(gfx.windowLight(this.starport?'starport':'factory',l.table,l.words,st.frame),l.col*8,l.row*8);
    });
    if(this.starport){
      const b=this.blip;b.index+=b.back?-1:1;
      if(b.index<0||b.index>BLIP_LAST){b.flip=rnd(0,3);b.back=Math.random()<.5;b.index=b.back?BLIP_LAST:0;}
      const at=BLIP_PATH+b.index*4,y=(readU16(this.rom.bytes,at)<<16)>>16,x=(readU16(this.rom.bytes,at+2)<<16)>>16;
      if(hardware){g.save();g.fillStyle='#9eff8a';g.shadowColor='#78ff63';g.shadowBlur=1.5;
        g.beginPath();g.arc(96+(x-96)*.1,32+(y-32)*.06,.65,0,Math.PI*2);g.fill();g.restore();}
      else gfx.starportBlip(g,x-4,y-4,b.flip);
    }
    const enabled=this.buttons(s),labels=['ВЫХОД','РЕМОНТ','СТОП'];
    for(let i=0;i<3;i++){
      const x=GRID_X+i*CELL_W;
      const metal=g.createLinearGradient(x,TAB_Y,x,TAB_Y+CELL_H);
      metal.addColorStop(0,enabled[i]?'#8c8990':'#48464f');metal.addColorStop(.15,enabled[i]?'#5b5962':'#303039');metal.addColorStop(1,'#24242b');
      g.fillStyle=metal;g.fillRect(x,TAB_Y,CELL_W,CELL_H);
      g.fillStyle=enabled[i]?'#c1bbad':'#66626b';g.fillRect(x+1,TAB_Y+1,CELL_W-2,.45);
      g.strokeStyle=this.cursor===i-3?'#f0c350':'#9ca8ad';g.lineWidth=this.cursor===i-3?1.2:.45;g.strokeRect(x+.5,TAB_Y+.5,CELL_W-1,CELL_H-1);
      menuText(g,labels[i],x+CELL_W/2,TAB_Y+CELL_H/2,{size:i===1?4.35:4.8,align:'center',baseline:'middle',color:enabled[i]?'#f1dfb3':'#999398',weight:'600'});
    }
    const firstRow=Math.max(0,Math.floor(Math.max(0,this.cursor)/COLUMNS)-this.rowsVisible+1);
    this.orders.forEach((o,i)=>{
      const row=Math.floor(i/COLUMNS)-firstRow;if(row<0||row>=this.rowsVisible)return;
      const x=GRID_X+i%COLUMNS*CELL_W,y=GRID_Y+row*HD_ROW_H;
      const tile=g.createLinearGradient(x,y,x,y+HD_ROW_H);tile.addColorStop(0,'#29282b');tile.addColorStop(1,'#0b1117');g.fillStyle=tile;g.fillRect(x+1,y+1,CELL_W-2,HD_ROW_H-2);
      if(o.upgrade!==undefined)drawStatusIcon(g,'repair',x+16,y+12,15,this.frame);
      else g.drawImage(this.portraits!.icon(units?'unit':'structure',o.type),x+(CELL_W-(HD_ROW_H-3)*4/3)/2,y+1,(HD_ROW_H-3)*4/3,HD_ROW_H-3);
      g.strokeStyle=this.cursor===i?'#ffe082':'#899398';g.lineWidth=this.cursor===i?1:.35;g.strokeRect(x+1.5,y+1.5,CELL_W-3,HD_ROW_H-3);
      if(o.available<0){g.fillStyle='#081015a8';g.fillRect(x+1,y+1,CELL_W-2,HD_ROW_H-2);}
      if(prod&&prod.type===o.type){g.fillStyle=prod.ready?'#b9e5a0':prod.onHold?'#efad52':'#f2d067';g.fillRect(x+2,y+HD_ROW_H-2,(CELL_W-4)*prod.progress,1);}
      if(game.canQueueUnits(s)||s.o.type===STRUCTURE.CONSTRUCTION_YARD){
        const yard=s.o.type===STRUCTURE.CONSTRUCTION_YARD;
        const queued=(yard?game.buildingQueue(s):game.unitQueue(s)).filter(item=>item.type===o.type).length;
        const ready=yard?game.readyBuildings(s).filter(item=>item.type===o.type).length:game.readyUnits(s).filter(unit=>unit.o.type===o.type).length;
        const count=queued+ready+(prod?.type===o.type&&!prod.ready?1:0);
        if(count){g.fillStyle='#111820ed';g.fillRect(x+20,y+2,10,7);menuText(g,String(count),x+25,y+5.5,{size:4.4,align:'center',baseline:'middle',color:ready?'#b9e5a0':'#ffe082'});}
      }
    });
    const cx=this.cursor<0?GRID_X+(this.cursor+3)*CELL_W:GRID_X+this.cursor%COLUMNS*CELL_W;
    const cy=this.cursor<0?TAB_Y:GRID_Y+(Math.floor(this.cursor/COLUMNS)-firstRow)*HD_ROW_H;
    g.strokeStyle='#ffdc68';g.lineWidth=.9;g.strokeRect(cx+.5,cy+.5,CELL_W-1,(this.cursor<0?CELL_H:HD_ROW_H)-1);
    const order=this.cursor>=0?this.orders[this.cursor]:null;
    const type=order?(order.upgrade??order.type):s.o.type,kind=order&&units?'unit':'structure';
    const preview=this.portraits!.image(kind,type);
    g.save();g.beginPath();g.rect(160,40,98,57);g.clip();g.drawImage(preview,160,40,98,57);g.restore();
    const name=order?.upgrade!==undefined?'Улучшение':(kind==='unit'?UNIT_NAMES[type]:STRUCTURE_NAMES[type])??'';
    menuText(g,name,208,107.94,{size:7,align:'center',baseline:'middle',maxWidth:94,color:'#fff2c9',weight:'700'});
    const oi=kind==='unit'?unitInfo[type]?.o:structureInfo[type]?.o;
    const middle=kind==='unit'?unitInfo[type]?.damage:Math.abs(structureInfo[type]?.powerUsage??0);
    const values=[order?.cost??0,order?.upgrade!==undefined?0:middle??0,order?.upgrade!==undefined?0:oi?.hitpoints??0];
    const texts=['Стоимость',kind==='unit'?'Урон':'Энергия','Прочность'];
    values.forEach((value,i)=>{
      const slot=HD_STAT_SLOTS[i];
      if(i===1&&kind==='structure')drawStatusIcon(g,'power',slot.iconX,slot.iconY,10,this.frame);
      else drawConsoleSymbol(g,i===0?'credits':i===1?'damage':'armour',slot.iconX,slot.iconY,11);
      menuText(g,texts[i],194,slot.valueY,{size:3.6,baseline:'middle',maxWidth:31,color:'#d4c9b2',weight:'600'});
      menuText(g,String(value),NUMBERS_RIGHT,slot.valueY,{size:7.2,baseline:'middle',align:'right',maxWidth:26,color:'#fff0c3',weight:'700'});
    });
    menuText(g,String(this.host.credits()),CREDITS.right,20.5,{size:8.5,baseline:'middle',align:'right',color:'#fff1cb',weight:'700'});
    if(game.canQueueUnits(s)){
      const queue=game.unitQueue(s);
      queue.slice(0,8).forEach((item,i)=>{const x=GRID_X+i*12;g.fillStyle='#080d12';g.fillRect(x,195,12,13);g.drawImage(this.portraits!.icon('unit',item.type),x,196,12,9);g.strokeStyle='#a8884b';g.lineWidth=.4;g.strokeRect(x,195,12,13);});
      menuText(g,`A +1 · C −1 · B назад${queue.length?' · очередь '+queue.length:''}`,32,215,{size:4.2,color:'#e5d4ae',maxWidth:266});
    }
  }

  private drawOriginal(): void {
    const s = this.s;
    if (!s) return;
    const g = this.ctx;
    const gfx = this.gfx;
    const game = this.host.game();
    const units = this.units;
    g.fillStyle = "#000";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.drawImage(this.starport ? gfx.starportBackground() : gfx.factoryBackground(), 0, 0);
    // огоньки: таймер уходит в минус — новая пауза и случайный кадр
    const lights = this.starport ? STARPORT_LIGHTS : FACTORY_LIGHTS;
    lights.forEach((l, i) => {
      const st = (this.lights[i] ??= { timer: 0, frame: -1 });
      if (--st.timer < 0) {
        st.timer = rnd(l.min, l.max);
        st.frame = rnd(0, l.frames - 1);
      }
      g.drawImage(gfx.windowLight(this.starport ? "starport" : "factory", l.table, l.words, st.frame), l.col * 8, l.row * 8);
    });
    if (this.starport) {
      // $008A96: шаг по пути; на конце — случайные отражение и направление, с начала или с конца
      const b = this.blip;
      b.index += b.back ? -1 : 1;
      if (b.index < 0 || b.index > BLIP_LAST) {
        b.flip = rnd(0, 3);
        b.back = Math.random() < 0.5;
        b.index = b.back ? BLIP_LAST : 0;
      }
      const at = BLIP_PATH + b.index * 4;
      const y = (readU16(this.rom.bytes, at) << 16) >> 16;
      const x = (readU16(this.rom.bytes, at + 2) << 16) >> 16;
      gfx.starportBlip(g, x - 4, y - 4, b.flip);
    }

    // кнопки ($028F8C, $029042): РЕМОНТ светлая у повреждённого, СТОП — если идёт ремонт, стройка,
    // улучшение или (у двора) готовый заказ ждёт постановки
    const prod = game.production(s);
    const enabled = this.buttons(s);
    TABS.forEach((t, i) => {
      const icon = gfx.factoryIcon(units, enabled[i] ? t.on : t.off);
      if (icon) g.drawImage(icon, GRID_X + i * CELL_W, TAB_Y);
    });

    // сетка заказов
    const firstRow = Math.max(0, Math.floor(Math.max(0, this.cursor) / COLUMNS) - this.rowsVisible + 1);
    this.orders.forEach((o, i) => {
      const row = Math.floor(i / COLUMNS) - firstRow;
      if (row < 0 || row >= this.rowsVisible) return;
      const icon = gfx.factoryIcon(units, o.upgrade !== undefined ? (units ? UPGRADE_ICON.units : UPGRADE_ICON.structures) : o.type);
      const x = GRID_X + (i % COLUMNS) * CELL_W;
      const y = GRID_Y + row * CELL_H;
      if (icon) g.drawImage(icon, x, y);
      if (o.available < 0) {
        g.fillStyle = "rgba(0,0,0,0.55)";
        g.fillRect(x, y, CELL_W, CELL_H);
      }
      if (prod && prod.type === o.type) {
        // ход стройки — полоса по низу иконки
        g.fillStyle = prod.ready ? "#40e040" : prod.onHold ? "#e0a000" : "#e0e040";
        g.fillRect(x + 1, y + CELL_H - 3, Math.round((CELL_W - 2) * prod.progress), 2);
      }
    });

    // курсор: рамка с переливом цвета раз в 8 кадров ($008596)
    {
      const cx = this.cursor < 0 ? GRID_X + (this.cursor + 3) * CELL_W : GRID_X + (this.cursor % COLUMNS) * CELL_W;
      const cy = this.cursor < 0 ? TAB_Y : GRID_Y + (Math.floor(this.cursor / COLUMNS) - firstRow) * CELL_H;
      g.drawImage(gfx.factoryCursor((this.frame & 31) >> 3, this.starport), cx, cy);
    }

    // правая часть: под курсором заказ — его картинка и числа, на кнопках — само здание без чисел
    const order = this.cursor >= 0 ? this.orders[this.cursor] : null;
    if (order?.upgrade !== undefined) {
      // картинка того, что откроет улучшение; числа: цена, 0, 0
      const pic = this.picture(units, order.upgrade);
      if (pic) g.drawImage(pic, PICTURE.x, PICTURE.y);
      g.drawImage(gfx.plainText(decodeText(this.rom.bytes, UPGRADE_NAME, 12).padEnd(12)), NAME.x, NAME.y);
      [order.cost, 0, 0].forEach((v, i) => {
        const t = gfx.plainText(String(v));
        g.drawImage(t, NUMBERS_RIGHT - t.width, NUMBER_ROWS[i]);
      });
    }
    const pic = order ? (order.upgrade !== undefined ? null : this.picture(units, order.type)) : this.picture(false, s.o.type);
    if (pic) g.drawImage(pic, PICTURE.x, PICTURE.y);
    if (order && order.upgrade === undefined) {
      if (!units) {
        const layout = structureInfo[order.type].layout;
        const size = layoutSize[layout];
        const icon = size.width === 1 ? 0 : size.width === 2 ? 1 : size.height === 2 ? 2 : 3;
        g.drawImage(gfx.sizeIcon(icon), SIZE_ICON.x, SIZE_ICON.y);
      }
      const name = gfx.objectName(units, order.type).trim();
      const pad = Math.floor((NAME.chars - name.length) / 2);
      g.drawImage(gfx.plainText(" ".repeat(Math.max(0, pad)) + name), NAME.x, NAME.y);
      const oi = units ? unitInfo[order.type].o : structureInfo[order.type].o;
      // у юнитов средняя строка — урон (+$54 описания), у зданий — энергия
      const middle = units ? unitInfo[order.type].damage : Math.abs(structureInfo[order.type].powerUsage);
      [order.cost, middle, oi.hitpoints].forEach((v, i) => {
        const t = gfx.plainText(String(v));
        g.drawImage(t, NUMBERS_RIGHT - t.width, NUMBER_ROWS[i]);
      });
    }
    // патрон — у заводов юнитов и космопорта; у ремонта, дворца и прочих — молния, как у двора
    const ammo = units && (this.starport || !!structureInfo[s.o.type].o.flags.factory);
    STAT_ICON_Y.forEach((y, i) => g.drawImage(i === 1 && ammo ? gfx.ammoIcon() : gfx.statIcon(i), STAT_ICON_X, y));

    // кредиты вверху справа
    const credits = gfx.plainText(String(this.host.credits()));
    g.drawImage(credits, CREDITS.right - credits.width, CREDITS.y);
  }

  private picture(units: boolean, type: number): HTMLCanvasElement | null {
    const key = `${units}:${type}`;
    if (!this.pictures.has(key)) {
      const list: Picture[] = units ? this.rom.unitPictures() : this.rom.structurePictures();
      const p = list.find((x) => x.id === type);
      let c: HTMLCanvasElement | null = null;
      if (p) {
        c = document.createElement("canvas");
        c.width = p.width;
        c.height = p.height;
        c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.pixels), p.width, p.height), 0, 0);
      }
      this.pictures.set(key, c);
    }
    return this.pictures.get(key) ?? null;
  }
}
