/**
 * Экран итогов миссии MD ($0271E2), сразу после текста ментата о победе или поражении:
 * - фон — одна из трёх картинок по номеру миссии ($026C68: миссия mod 3), плоскость B;
 * - надписи ($0A5D8E) пишутся в строки 28…55 плоскости A и въезжают снизу прокруткой ($027026);
 * - очки, время (ч:мм), звание по порогам очков ($0A68D2, строки по 17 знаков $0A68E2);
 * - три пары полос — спайс, уничтоженные войска, уничтоженные постройки, «тобой» и «врагами»
 *   ($026F98): полоса растёт на точку в кадр, число — на шаг пары (больший из двух / 168 + 1);
 * - A, B, C или Start — дальше; после победы (не в 9-й миссии) — страница с паролем ($026F0A),
 *   въезжает так же; ещё одно нажатие — палитра гаснет.
 */
import { lcwDecompress } from "../rom/lcw.ts";
import { blitTile, cramToRGBA, readU16, readU32 } from "../rom/md.ts";
import type { DuneRom } from "../rom/dune.ts";
import { decodeTextCodes, SCREEN_H, SCREEN_W } from "../gfx/screens.ts";
import { menuText, prepareMenu } from "../gfx/menu-canvas.ts";
import type { ScreenArt } from "../gfx/screen-art.ts";
import type { Button } from "../input/pad.ts";

export const SCORE_ROM = {
  pictureTiles: 0x0a2e80,
  pictures: 0x026c5c,
  palette: 0x0a5d0e,
  font: 0x050c34,
  layout: 0x0a5d8e,
  passwordLayout: 0x0b9312,
  rankLimits: 0x0a68d2,
  ranks: 0x0a68e2,
  finalRank: 0x0a696a,
  houseNames: 0x0a697d,
  passwords: 0x088124,
} as const;

/** Итоги миссии: счётчики MD $FFC05E, $FFC096…$FFC0A0. */
export interface MissionStats {
  mission: number;
  /** ROM-номер дома игрока (0 Харконнены, 1 Атрейдесы, 2 Ордосы) */
  house: number;
  won: boolean;
  score: number;
  /** время миссии в кадрах */
  time: number;
  spice: [number, number];
  units: [number, number];
  structures: [number, number];
}

/** Адрес в плоскости A ($E000, 64 клетки в строке) → номер клетки. */
const cell = (addr: number) => (addr - 0xe000) >> 1;

type Step = Generator<void, void, void>;

function stepColor(c: number, target: number): number {
  let out = 0;
  for (const [mask, one] of [[0x00e, 0x002], [0x0e0, 0x020], [0xe00, 0x200]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}

export class ScoreScreen {
  readonly root: HTMLElement;
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private img: ImageData;
  private px = new Uint32Array(SCREEN_W * SCREEN_H);
  private raf = 0;
  private last = 0;
  private acc = 0;
  private gen: Step | null = null;
  private done: (() => void) | null = null;
  private vram = new Uint8Array(0x10000);
  private planeA = new Uint16Array(64 * 64);
  private planeB = new Uint16Array(64 * 32);
  private vscroll = 0;
  private cram = new Uint16Array(64);
  private held = false;
  private stats: MissionStats | null = null;
  private page: "picture" | "stats" | "password" = "picture";
  private rankText = "";
  private passwordText = "";
  private shownValues = [[0, 0], [0, 0], [0, 0]];
  private sliding = false;

  constructor(
    private rom: DuneRom,
    private sound: (id: number) => void = () => {},
    private art?: ScreenArt,
  ) {
    this.root = document.createElement("section");
    this.root.className = "settings scorescreen";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Итоги миссии");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.img = this.ctx.createImageData(SCREEN_W, SCREEN_H);
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", () => (this.held = true));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(stats: MissionStats, done: () => void): void {
    this.stats = stats;
    this.page = "picture";
    this.shownValues = [[0, 0], [0, 0], [0, 0]];
    this.sliding = false;
    this.done = done;
    this.gen = this.run(stats);
    this.held = false;
    this.root.hidden = false;
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.acc = 0;
    this.loop();
  }

  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    if (b === "a" || b === "b" || b === "c" || b === "start") this.held = true;
    return true;
  }

  close(): void {
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  /** Для автотестов: прогнать n кадров без своего цикла. */
  stepFrames(n: number): void {
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < n && !this.root.hidden; i++) this.tick();
    if (!this.root.hidden) this.draw();
  }

  private loop(): void {
    const now = performance.now();
    this.acc = Math.min(this.acc + (now - this.last), 250);
    this.last = now;
    while (this.acc >= 1000 / 60 && !this.root.hidden) {
      this.acc -= 1000 / 60;
      this.tick();
    }
    if (this.root.hidden) return;
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  private tick(): void {
    if (this.gen?.next().done) {
      this.close();
      this.done?.();
    }
  }

  /** Ждать A/B/C/Start ($0272CA: нажатая кнопка, маска $E41E = 0 — по удержанию). */
  private *waitKey(): Step {
    this.held = false;
    while (!this.held) yield;
    this.held = false;
  }

  /** Палитра к цели или к чёрному, шаг раз в 3 кадра, пока всё не сойдётся ($0006C8, $000628). */
  private *fade(target: Uint16Array | null): Step {
    for (;;) {
      let same = 0;
      for (let i = 0; i < 64; i++) {
        const t = target ? target[i] : 0;
        if (this.cram[i] === t) same++;
        else this.cram[i] = stepColor(this.cram[i], t);
      }
      for (let k = 0; k < 3; k++) yield;
      if (same === 64) return;
    }
  }

  /** Надписи LCW в строки 28…55 плоскости A ($EE00). */
  private layout(addr: number): void {
    const map = lcwDecompress(this.rom.bytes, addr).data;
    for (let i = 0; i < 0x700; i++) this.planeA[28 * 64 + i] = readU16(map, i * 2);
  }

  /** Число цифрами шрифта ($026D3C): справа налево с последней клетки; pad — с ведущими нулями. */
  private number(value: number, addr: number, digits: number, pad = false): void {
    let at = cell(addr) + digits - 1;
    let v = value >>> 0;
    this.planeA[at] = 0x4530 + (v % 10);
    for (let i = 1; i < digits; i++) {
      v = Math.floor(v / 10) & 0xffff;
      if (!pad && v === 0) break;
      at--;
      this.planeA[at] = 0x4530 + (v % 10);
    }
  }

  /** Строка байтов ROM знаками шрифта ($026DB2: тайл $500 + код, строка 2). */
  private text(src: number, len: number, addr: number): void {
    for (let i = 0; i < len; i++) this.planeA[cell(addr) + i] = 0x4500 + this.rom.bytes[src + i];
  }

  /** Полоса ($026DEE): целые клетки $17, хвост $18 + длина mod 8. */
  private bar(len: number, addr: number, base: number): void {
    let at = cell(addr);
    for (let i = 0; i < len >> 3; i++) this.planeA[at++] = base + 0x17;
    this.planeA[at] = base + 0x18 + (len & 7);
  }

  /** Въезд страницы снизу ($027026): разгон до середины, торможение до 224. */
  private *scrollIn(): Step {
    this.sliding = true;
    let speed = 0x10000;
    let pos = 0;
    while (pos < 0x700000) {
      yield;
      this.vscroll = pos >>> 16;
      speed += 0x2000;
      pos += speed >= 0x100000 ? 0x100000 : speed;
    }
    while (pos < 0xe00000) {
      yield;
      this.vscroll = pos >>> 16;
      speed -= 0x2000;
      pos += speed <= 0x10000 ? 0x10000 : speed;
    }
    yield;
    this.vscroll = 0xe0;
    this.sliding = false;
  }

  /** Строки 28…55 → 0…27, прокрутка 0 ($027120). */
  private settle(): void {
    this.planeA.copyWithin(0, 28 * 64, 56 * 64);
    this.vscroll = 0;
  }

  /** Шаг пары ($0270EE): больший из двух (не больше 65000) / 168 + 1, до 168 — 1. */
  private static scale(a: number, b: number): number {
    const m = Math.max(Math.min(a, 65000), Math.min(b, 65000));
    return m <= 168 ? 1 : Math.floor(m / 168) + 1;
  }

  /** Полоса с числом растёт до значения ($026F98). */
  private *grow(value: number, addr: number, base: number, step: number): Step {
    const row = [0xf494, 0xf714, 0xf994].findIndex(start => addr === start || addr === start + 0x80);
    const side = base === 0x0500 ? 0 : 1;
    let len = 0;
    let shown = 0;
    let n = 0;
    do {
      yield;
      this.bar(len, addr, base);
      len++;
      this.number(shown, addr + 0x2c, 5);
      if (row >= 0) this.shownValues[row][side] = Math.min(value, shown);
      if ((++n & 3) === 0) this.sound(0x34);
      shown += step;
    } while (value > shown);
    this.number(value, addr + 0x2c, 5);
    if (row >= 0) this.shownValues[row][side] = value;
    for (let i = 0; i < 11; i++) yield;
  }

  private *run(s: MissionStats): Step {
    const b = this.rom.bytes;
    this.vram.fill(0);
    this.planeA.fill(0);
    this.planeB.fill(0);
    this.vscroll = 0;
    this.cram.fill(0);
    // $026C68: тайлы фона — 7 потоков по $1000; картинка — по миссии mod 3
    for (let i = 0; i < 7; i++) this.vram.set(lcwDecompress(b, readU32(b, SCORE_ROM.pictureTiles + i * 4)).data.subarray(0, 0x1000), i * 0x1000);
    const pic = lcwDecompress(b, readU32(b, SCORE_ROM.pictures + (s.mission % 3) * 4)).data;
    for (let i = 0; i < 0x700; i++) this.planeB[i] = readU16(pic, i * 2);
    const target = new Uint16Array(64);
    for (let i = 0; i < 64; i++) target[i] = readU16(b, SCORE_ROM.palette + i * 2);
    yield* this.fade(target);
    // $026E3A: шрифт в $A000, надписи, очки, время, звание
    this.vram.set(b.subarray(SCORE_ROM.font, SCORE_ROM.font + 0x1000), 0xa000);
    this.layout(SCORE_ROM.layout);
    this.number(s.score, 0xef92, 5);
    const hours = Math.floor(Math.floor(s.time / 3600) / 60);
    const minutes = Math.floor((s.time - hours * 60 * 3600) / 3600);
    this.number(hours, 0xefbc, 2);
    this.number(minutes, 0xefc2, 2, true);
    let rank: number = SCORE_ROM.ranks;
    if (s.won && s.mission === 9) rank = SCORE_ROM.finalRank;
    else for (let i = 0; i < 8 && (s.score & 0xffff) >= readU16(b, SCORE_ROM.rankLimits + i * 2); i++) rank += 17;
    this.text(rank, 17, 0xf198);
    this.rankText = decodeTextCodes(Array.from(b.subarray(rank, rank + 17))).trim();
    this.page = "stats";
    yield* this.scrollIn();
    // три пары полос
    const pairs: [[number, number], number][] = [
      [s.spice, 0xf494],
      [s.units, 0xf714],
      [s.structures, 0xf994],
    ];
    for (const [[you, them], addr] of pairs) {
      const step = ScoreScreen.scale(you, them);
      yield* this.grow(you, addr, 0x0500, step);
      yield* this.grow(them, addr + 0x80, 0x2500, step);
    }
    this.settle();
    yield* this.waitKey();
    if (s.won && s.mission < 9) {
      // $026F0A: пароль следующей миссии, имя дома, номер одержанной победы
      this.layout(SCORE_ROM.passwordLayout);
      const password = readU32(b, SCORE_ROM.passwords + (s.mission - 1) * 0x18 + s.house * 8);
      this.text(password, 10, 0xf41e);
      this.passwordText = decodeTextCodes(Array.from(b.subarray(password, password + 10))).trim();
      this.page = "password";
      this.text(SCORE_ROM.houseNames + s.house * 9, 9, 0xf220);
      this.number(s.mission, 0xf32c, 1);
      yield* this.scrollIn();
      yield* this.waitKey();
    }
    yield* this.fade(null);
  }

  private draw(): void {
    if (this.art?.get("arrakis") && this.stats) {
      this.drawHD();
      return;
    }
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(this.vram, this.planeB[cy * 64 + cx], pal, px, SCREEN_W, cx * 8, cy * 8);
    // плоскость A с вертикальной прокруткой: строка экрана y — строка плоскости y + vscroll
    const v = this.vscroll;
    const tile = new Uint32Array(64);
    for (let cy = 0; cy < 29; cy++)
      for (let cx = 0; cx < 40; cx++) {
        const sy = cy * 8 - (v & 7);
        const word = this.planeA[(((v >> 3) + cy) & 63) * 64 + cx];
        if (!(word & 0x7ff)) continue;
        tile.fill(0);
        blitTile(this.vram, word, pal, tile, 8, 0, 0);
        for (let r = 0; r < 8; r++) {
          const y = sy + r;
          if (y < 0 || y >= SCREEN_H) continue;
          for (let c = 0; c < 8; c++) if (tile[r * 8 + c]) px[y * SCREEN_W + cx * 8 + c] = tile[r * 8 + c];
        }
      }
    new Uint32Array(this.img.data.buffer).set(px);
    this.ctx.putImageData(this.img, 0, 0);
  }

  private drawHD(): void {
    const s = this.stats!;
    const out = prepareMenu(this.canvas);
    this.art!.background(out, "arrakis");
    out.fillStyle = "#050609ed"; out.fillRect(-160, -100, 640, 424);
    if (this.page === "picture") return;
    out.save();
    let brightness = 0;
    for (const word of this.cram) brightness = Math.max(brightness, word & 14, (word >> 4) & 14, (word >> 8) & 14);
    out.globalAlpha = Math.min(1, brightness / 10);
    out.translate(0, this.sliding ? Math.max(0, 224 - this.vscroll) : 0);
    const bezel=this.art!.get('operationsConsole');
    if(bezel)out.drawImage(bezel,0,5,320,320*bezel.height/bezel.width);
    else {out.fillStyle='#17151b';out.fillRect(0,5,320,213);out.fillStyle='#06090b';out.fillRect(27,33,266,146);}
    const glass=out.createLinearGradient(0,33,0,179);
    glass.addColorStop(0,'#10191b');glass.addColorStop(.5,'#080d10');glass.addColorStop(1,'#101318');
    out.fillStyle=glass;out.fillRect(28,34,264,144);
    // One continuous glass surface, with fine etched graduations rather than UI cards.
    out.strokeStyle='#d7ba7a13';out.lineWidth=.15;
    for(let x=36;x<288;x+=8){out.beginPath();out.moveTo(x,48);out.lineTo(x,165);out.stroke();}
    const house = ["Харконнены", "Атрейдесы", "Ордосы"][s.house];
    menuText(out, this.page === "password" ? "СЛЕДУЮЩАЯ ЛОКАЦИЯ" : "ИТОГИ ОПЕРАЦИИ", 160, 15, { size: 6, align:'center',color: "#171414",weight:'700',shadow:false });
    menuText(out, house.toUpperCase(), 35, 39, { size: 4.1, color: "#c8ba97",weight:'500' });
    menuText(out, `МИССИЯ ${s.mission}`, 285, 39, { size: 4.1, align: "right", color: "#c8ba97",weight:'500' });
    out.fillStyle='#b6975955';out.fillRect(35,47,250,.2);
    if (this.page === "password") {
      menuText(out, `МИССИЯ ${s.mission + 1}`, 160, 63, { size: 8.5, align: "center", color:'#e7d6ae' });
      menuText(out, "КОД ДОСТУПА", 160, 85, { size: 4.1, align: "center", color: "#c4a976",weight:'500' });
      out.fillStyle='#030607';out.fillRect(45,97,230,31);
      out.strokeStyle='#80633a';out.lineWidth=.4;out.strokeRect(45,97,230,31);
      out.strokeStyle='#dec282';out.lineWidth=.55;out.beginPath();
      for(const [x,dx]of [[45,1],[275,-1]])for(const [y,dy]of [[97,1],[128,-1]]){out.moveTo(x,y+dy*4);out.lineTo(x,y);out.lineTo(x+dx*5,y);}out.stroke();
      out.save();out.font='600 12px Consolas, monospace';out.textAlign='center';out.textBaseline='middle';
      out.fillStyle='#ffda8b';out.shadowColor='#d58529';out.shadowBlur=2;out.fillText(this.passwordText,160,113,215);out.restore();
      menuText(out, "Сохраните пароль для продолжения кампании", 160, 143, { size: 4.7, align: "center", color: "#c8bfa9",weight:'500' });
    } else {
      const minutes = Math.floor(s.time / 3600);
      const duration = `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
      menuText(out, 'ОЧКИ',35,54,{size:3.7,color:'#a9a28e',weight:'500'});
      menuText(out, String(s.score),35,60,{size:10,color:'#ffdf9c'});
      menuText(out, `ВРЕМЯ  ${duration}`, 285, 55, { size: 5, align: "right",color:'#d6c9ac' });
      menuText(out, this.rankText, 285, 65, { size: 4.5,align:'right', color: "#d6a854" });
      const rows = [{ label: "Добыто спайса", values: s.spice }, { label: "Уничтожено войск", values: s.units }, { label: "Уничтожено построек", values: s.structures }];
      rows.forEach((row, i) => {
        const y = 81 + i * 28;
        menuText(out, row.label.toUpperCase(), 35, y, { size: 4.4, color: "#c9c2ae",weight:'500' });
        const maximum = Math.max(1, ...row.values);
        for (let side = 0; side < 2; side++) {
          const by = y + 8 + side * 6.5;
          menuText(out, side ? "Враг" : "Вы", 35, by, { size: 3.7, color: "#aaa995",weight:'500' });
          out.fillStyle = "#010405"; out.fillRect(55, by + .5, 202, 3.6);
          out.strokeStyle='#7b74514d';out.lineWidth=.15;out.strokeRect(55,by+.5,202,3.6);
          const width = 202 * this.shownValues[i][side] / maximum;
          if (width > 0) {
            const colors=[['#e84e30','#791f18'],['#3c86ff','#164398'],['#70ac51','#315e32']][s.house];
            const fill = out.createLinearGradient(0, by+.5, 0, by+4.1);
            fill.addColorStop(0, side ? "#e0784e" : colors[0]);fill.addColorStop(.3,side?'#aa4430':colors[0]); fill.addColorStop(1, side ? "#51201c" : colors[1]);
            out.fillStyle = fill; out.fillRect(55, by+.7, width, 3.2);
            out.fillStyle='#ffffff37';out.fillRect(55,by+.7,width,.35);
            out.fillStyle='#02050766';for(let x=60;x<55+width;x+=5)out.fillRect(x,by+.7,.35,3.2);
          }
          menuText(out, String(this.shownValues[i][side]), 285, by, { size: 4.1, align: "right", color: "#e7d8b8" });
        }
      });
    }
    menuText(out, "Нажмите, чтобы продолжить", 160, 169, { size: 3.8, align: "center", color: "#b4a68c",weight:'500' });
    out.restore();
  }
}
