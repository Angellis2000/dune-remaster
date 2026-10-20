/**
 * Финал кампании MD ($012734, он же код DUNEFINALE): картинка планеты ($0C7D68, кадр 8: тайлы $0C1216,
 * плоскость B — LCW $0C724C, палитра $0A6D18), мелодия $21, через 150 кадров звук $18 и планета
 * перекрашивается (цвета 1–9: сначала $06C700, затем цвета дома $06C714 + дом·20, шаг раз в 7 кадров),
 * цвета текста ($01FE18), 50 кадров — и титры ($0117B8): строки по центру шрифтом меню (тайл $480 + код,
 * $FF n — строка палитры) в плоскости A с 28-й строки, каждая строка — 8 сдвигов на точку раз в 3 кадра.
 * После первого полного прохода титры идут по кругу, любая кнопка — выход.
 */
import { lcwDecompress } from "../rom/lcw.ts";
import { blitTile, cramToRGBA, readU16 } from "../rom/md.ts";
import type { DuneRom } from "../rom/dune.ts";
import { decodeTextCodes, SCREEN_H, SCREEN_W } from "../gfx/screens.ts";
import { menuText, prepareMenu } from "../gfx/menu-canvas.ts";
import type { ScreenArt } from "../gfx/screen-art.ts";
import type { Button } from "../input/pad.ts";
import type { Sound } from "../sound/sound.ts";
import { loadTileList } from "./tutorial.ts";
import { SpaceScene } from '../gfx/space-scene.ts';

export const FINALE_ROM = {
  font: 0x0feee2,
  tiles: 0x0c1216,
  map: 0x0c724c,
  palette: 0x0a6d18,
  white: 0x06c700,
  houseColors: 0x06c714,
  creditsStart: 0x011930,
  credits: 0x01193e,
  music: 0x21,
} as const;

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

export class FinaleScreen {
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
  private planeA = new Uint16Array(64 * 32);
  private planeB = new Uint16Array(64 * 32);
  private vscroll = 0;
  private scrollFraction = 0;
  private cram = new Uint16Array(64);
  private key = false;
  private scene=new SpaceScene();
  private sceneFrame=0;
  private whiteFrame=-1;
  private colorFrame=-1;
  private house=0;

  constructor(
    private rom: DuneRom,
    private sound: Sound | null = null,
    private art?: ScreenArt,
  ) {
    this.root = document.createElement("section");
    this.root.className = "settings finale";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Финал");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.img = this.ctx.createImageData(SCREEN_W, SCREEN_H);
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", () => (this.key = true));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** house — номер дома ROM (0 Харконнены, 1 Атрейдесы, 2 Ордосы). */
  open(house: number, done: () => void): void {
    this.sceneFrame=0;this.whiteFrame=-1;this.colorFrame=-1;this.house=house;
    this.done = done;
    this.gen = this.run(house);
    this.key = false;
    this.root.hidden = false;
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.acc = 0;
    this.loop();
  }

  handlePad(_b: Button): boolean {
    if (this.root.hidden) return false;
    this.key = true;
    return true;
  }

  close(): void {
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  /** Для автотестов. */
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
    this.sceneFrame++;
    if (this.gen?.next().done) {
      this.close();
      this.done?.();
    }
  }

  private *wait(n: number): Step {
    for (let i = 0; i < n; i++) yield;
  }

  /** Цвета from…from+count−1 к цели, шаг раз в speed кадров ($0006C8). */
  private *fade(target: (i: number) => number, from: number, count: number, speed: number): Step {
    for (;;) {
      let same = 0;
      for (let i = from; i < from + count; i++) {
        const t = target(i);
        if (this.cram[i] === t) same++;
        else this.cram[i] = stepColor(this.cram[i], t);
      }
      yield* this.wait(speed);
      if (same === count) return;
    }
  }

  /** $01188C: строка по центру в строке row плоскости A; возвращает адрес после конца строки. */
  private line(p: number, row: number, color: { line: number }): void {
    const b = this.rom.bytes;
    let len = 0;
    for (let q = p; b[q] && b[q] !== 0x0a; q++) {
      if (b[q] === 0xff) q++;
      else len++;
    }
    let col = (40 - len) >> 1;
    for (let q = p; b[q] && b[q] !== 0x0a; q++) {
      if (b[q] === 0xff) {
        color.line = b[++q];
        continue;
      }
      this.planeA[row * 64 + col++] = 0x480 | (b[q] & 0x7f) | ((color.line & 7) << 13);
    }
  }

  private *run(house: number): Step {
    const b = this.rom.bytes;
    this.vram.fill(0);
    this.planeA.fill(0);
    this.planeB.fill(0);
    this.cram.fill(0);
    this.vscroll = 0;
    this.vram.set(lcwDecompress(b, FINALE_ROM.font).data.subarray(0, 0x1000), 0x9000);
    loadTileList(b, this.vram, FINALE_ROM.tiles, 0);
    const map = lcwDecompress(b, FINALE_ROM.map).data;
    for (let i = 0; i < 64 * 28; i++) this.planeB[i] = readU16(map, i * 2);
    const pal = (i: number) => readU16(b, FINALE_ROM.palette + i * 2);
    yield* this.fade(pal, 0, 64, 3);
    this.sound?.playMusic(FINALE_ROM.music);
    yield* this.wait(150);
    this.sound?.play(0x18);
    this.whiteFrame=this.sceneFrame;
    yield* this.fade((i) => readU16(b, FINALE_ROM.white + i * 2), 1, 9, 7);
    this.colorFrame=this.sceneFrame;
    yield* this.fade((i) => readU16(b, FINALE_ROM.houseColors + house * 20 + i * 2), 1, 9, 7);
    // $01FE18: цвета текста — строка 2 жёлтая, строка 3 белая
    for (const [line, i, c] of [[2, 13, 0x0ee], [2, 14, 0x066], [2, 15, 0], [3, 13, 0xeee], [3, 14, 0x666], [3, 15, 0]]) this.cram[line * 16 + i] = c;
    yield* this.wait(50);
    // $0117B8: титры
    let p: number = FINALE_ROM.creditsStart;
    let row = 0x1c;
    let looped = false;
    const color = { line: 3 };
    this.key = false;
    for (;;) {
      this.planeA.fill(0, row * 64, row * 64 + 40);
      this.line(p, row, color);
      // к следующей строке; конец текста — снова с начала титров
      let q = p;
      while (b[q] && b[q] !== 0x0a) q++;
      if (!b[q]) {
        looped = true;
        p = FINALE_ROM.credits;
        continue;
      }
      p = q + 1;
      row = (row + 1) & 0x1f;
      for (let i = 0; i < 8; i++) {
        for (let k = 0; k < 3; k++) {
          this.scrollFraction = k / 3;
          yield;
          if (looped && this.key) {
            yield* this.fade(() => 0, 0, 64, 3);
            return;
          }
        }
        this.vscroll = (this.vscroll + 1) & 0xff;
        this.scrollFraction = 0;
      }
    }
  }

  private draw(): void {
    if (this.art?.get("arrakis")) {
      const out = prepareMenu(this.canvas);
      let light = 0;
      for (let i = 1; i < 10; i++) light = Math.max(light, this.cram[i] & 14, (this.cram[i] >> 4) & 14, (this.cram[i] >> 8) & 14);
      out.save(); out.globalAlpha = Math.min(1, light / 10);
      const palette=[[1,.09,.035],[.06,.3,1],[.07,.9,.26]][this.house]??[1,.7,.25];
      const color=this.colorFrame<0?0:Math.min(1,(this.sceneFrame-this.colorFrame)/70);
      const tint=palette.map(c=>1+(c-1)*color);
      const amount=this.whiteFrame<0?0:Math.min(1,(this.sceneFrame-this.whiteFrame)/70);
      if(!this.scene.draw(out,this.sceneFrame/60,1,tint,amount))this.art.background(out, "arrakis");
      const vignette=out.createRadialGradient(160,112,18,160,112,190);
      vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#000b');
      out.fillStyle=vignette;out.fillRect(-160,-100,640,424);
      for (let row = 0; row < 32; row++) {
        const words = this.planeA.subarray(row * 64, row * 64 + 40);
        const codes = Array.from(words, word => (word & 0x7ff) >= 0x480 && (word & 0x7ff) < 0x500 ? (word & 0x7ff) - 0x480 : 32);
        const text = decodeTextCodes(codes).trim();
        if (!text) continue;
        const y = (row * 8 - this.vscroll - this.scrollFraction + 256) % 256;
        if (y >= SCREEN_H) continue;
        const role=words.some(word => (word >> 13 & 3) === 2);
        out.save();out.globalAlpha*=Math.max(0,Math.min(1,(y+5)/18,(224-y)/18));
        out.shadowColor='#000';out.shadowBlur=3;out.shadowOffsetY=.5;
        menuText(out, text, 160, y, { size: role?5.3:6.2, maxWidth: 270, align: "center", color: role ? "#d9af69" : "#f5f0e6",weight:role?'500':'600',shadow:false });
        out.restore();
      }
      out.restore();
      return;
    }
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(this.vram, this.planeB[cy * 64 + cx], pal, px, SCREEN_W, cx * 8, cy * 8);
    const v = this.vscroll;
    const tile = new Uint32Array(64);
    for (let cy = 0; cy < 29; cy++)
      for (let cx = 0; cx < 40; cx++) {
        const word = this.planeA[(((v >> 3) + cy) & 31) * 64 + cx];
        if (!(word & 0x7ff)) continue;
        tile.fill(0);
        blitTile(this.vram, word, pal, tile, 8, 0, 0);
        for (let r = 0; r < 8; r++) {
          const y = cy * 8 - (v & 7) + r;
          if (y < 0 || y >= SCREEN_H) continue;
          for (let c = 0; c < 8; c++) if (tile[r * 8 + c]) px[y * SCREEN_W + cx * 8 + c] = tile[r * 8 + c];
        }
      }
    new Uint32Array(this.img.data.buffer).set(px);
    this.ctx.putImageData(this.img, 0, 0);
  }
}
