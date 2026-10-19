/**
 * Конец миссии, как в оригинале MD ($022AB2):
 * - $026984: игра идёт ещё 180 кадров, выбор снят, над картой пролетает клин из 7 орнитоптеров ($00B576):
 *   одно из 4 направлений наугад, 3 точки за кадр; строка палитры — дома победителя ($00B5EC);
 * - $0128AE / $012996: картинка «Победа!» или поражения ($0C7D68, кадры 11 и 9): плоскость Window из LCW,
 *   четыре кадра анимации по 11 кадров; надпись — спрайты ($009D0A), выезжает снизу на точку раз в 3 кадра
 *   до y 176 ($00A632); A, B, C или Start — дальше.
 * Адреса потоков сняты трассой DMA/LCW в эмуляторе.
 */
import { lcwDecompress } from "../rom/lcw.ts";
import { blitTile, cramToRGBA, readU16 } from "../rom/md.ts";
import type { DuneRom } from "../rom/dune.ts";
import { SCREEN_H, SCREEN_W } from "../gfx/screens.ts";
import { menuText, prepareMenu } from "../gfx/menu-canvas.ts";
import type { ScreenArt } from "../gfx/screen-art.ts";
import type { Button } from "../input/pad.ts";
import victoryVideoUrl from '../gfx/assets/frontend/victory-video.mp4?url';
import defeatVideoUrl from '../gfx/assets/frontend/defeat-video.mp4?url';
import type { VehicleArt } from "../gfx/vehicle-art.ts";

export const END_ROM = {
  won: {
    tiles: [0x0afea6, 0x0b0a76, 0x0b169a, 0x0b2126],
    frames: [0x0c505c, 0x0c53c4, 0x0c572c, 0x0c5a94],
    palette: 0x0a6b18,
    text: 0x00a07c,
    textDef: 0x009db6,
  },
  lost: {
    tiles: [0x0a9bd6, 0x0aa4f4, 0x0ab1bc, 0x0abe54, 0x0ac9b8, 0x0ad436, 0x0ae068, 0x0aed3e, 0x0af818],
    frames: [0x0c3ddc, 0x0c427a, 0x0c471a, 0x0c4ba6],
    palette: 0x0a6a98,
    text: 0x009ddc,
    textDef: 0x009d9c,
  },
  /** строка 3 палитры для надписи */
  textPalette: 0x00a3dc,
  /** клин орнитоптеров: описания спрайтов по направлению, скорость и начало ($00B5BC, $00B5CC, $00B5DC) */
  flyDefs: [0x00b5fc, 0x00b652, 0x00b6a8, 0x00b6fe],
  flyVelocity: 0x00b5cc,
  flyStart: 0x00b5dc,
  /** строка палитры клина по дому (0 Харконнены, 1 Атрейдесы, 2 Ордосы) */
  flyLine: 0x00b5ec,
} as const;

/** Длительность пролёта ($026A38: 180 кадров). */
export const FLYBY_FRAMES = 180;

export interface ObjSprite {
  x: number;
  y: number;
  w: number;
  h: number;
  attr: number;
}

/** Описание объекта из спрайтов ($001000): слово «число − 1», затем по 12 байт: 2 слова, y, размер, атрибут, x. */
export function objectDef(b: Uint8Array, addr: number): ObjSprite[] {
  const s16 = (a: number) => (readU16(b, a) << 16) >> 16;
  const n = readU16(b, addr) + 1;
  const out: ObjSprite[] = [];
  for (let i = 0; i < n; i++) {
    const e = addr + 2 + i * 12;
    const size = b[e + 6];
    out.push({ y: s16(e + 4), w: ((size >> 2) & 3) + 1, h: (size & 3) + 1, attr: readU16(b, e + 8), x: s16(e + 10) });
  }
  return out;
}

/** Спрайт MD (тайлы по столбцам) из источника тайлов; tileBase — номер тайла начала источника. */
export function drawObjSprite(px: Uint32Array, w: number, h: number, tiles: Uint8Array, tileBase: number, s: ObjSprite, x: number, y: number, pal: Uint32Array, paletteBits = 0): void {
  const hf = (s.attr & 0x800) !== 0;
  const vf = (s.attr & 0x1000) !== 0;
  const tmp = new Uint32Array(64);
  for (let c = 0; c < s.w; c++)
    for (let r = 0; r < s.h; r++) {
      const tile = (s.attr & 0x7ff) - tileBase + c * s.h + r;
      const col = hf ? s.w - 1 - c : c;
      const row = vf ? s.h - 1 - r : r;
      tmp.fill(0);
      blitTile(tiles, ((s.attr | paletteBits) & 0x7800) | tile, pal, tmp, 8, 0, 0);
      for (let py = 0; py < 8; py++)
        for (let pxx = 0; pxx < 8; pxx++) {
          const v = tmp[py * 8 + pxx];
          const sx = x + col * 8 + pxx;
          const sy = y + row * 8 + py;
          if (v && sx >= 0 && sy >= 0 && sx < w && sy < h) px[sy * w + sx] = v;
        }
    }
}

/** Шаг цвета к цели на 1 по каждому каналу ($0006C8). */
function stepColor(c: number, target: number): number {
  let out = 0;
  for (const [mask, one] of [[0x00e, 0x002], [0x0e0, 0x020], [0xe00, 0x200]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}

/** Картинка победы или поражения. */
export class EndPicture {
  readonly root: HTMLElement;
  private canvas = document.createElement("canvas");
  private lowCanvas = document.createElement("canvas");
  private lowCtx: CanvasRenderingContext2D;
  private img: ImageData;
  private px = new Uint32Array(SCREEN_W * SCREEN_H);
  private raf = 0;
  private last = 0;
  private acc = 0;
  private done: (() => void) | null = null;
  private result: "won" | "lost" = "won";
  private vram = new Uint8Array(0);
  private maps: Uint8Array[] = [];
  private frame = 0;
  private anim = 0;
  private animWait = 0;
  private textY = 0xf0;
  private textWait = 0;
  private cram = new Uint16Array(64);
  private target = new Uint16Array(64);
  private pressed = false;
  private video = document.createElement('video');

  constructor(private rom: DuneRom, private art?: ScreenArt) {
    this.root = document.createElement("section");
    this.root.className = "settings endpicture";
    this.root.setAttribute("role", "dialog");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.lowCanvas.width = SCREEN_W;
    this.lowCanvas.height = SCREEN_H;
    this.lowCtx = this.lowCanvas.getContext("2d")!;
    this.img = this.lowCtx.createImageData(SCREEN_W, SCREEN_H);
    this.video.className = 'endpicture-video';
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'metadata';
    this.video.setAttribute('aria-hidden', 'true');
    this.root.append(this.video, this.canvas);
    this.canvas.addEventListener("click", () => (this.pressed = true));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(result: "won" | "lost", done: () => void): void {
    this.close();
    const b = this.rom.bytes;
    const R = END_ROM[result];
    this.result = result;
    this.done = done;
    this.root.setAttribute("aria-label", result === "won" ? "Победа" : "Поражение");
    // тайлы: потоки LCW подряд по $1000 байт с VRAM 0
    this.vram = new Uint8Array(0x10000);
    R.tiles.forEach((a, i) => this.vram.set(lcwDecompress(b, a).data.subarray(0, 0x1000), i * 0x1000));
    this.maps = R.frames.map((a) => lcwDecompress(b, a).data);
    for (let i = 0; i < 64; i++) this.target[i] = readU16(b, R.palette + i * 2);
    // $009D0A: строка 3 — палитра надписи
    for (let i = 0; i < 16; i++) this.target[48 + i] = readU16(b, END_ROM.textPalette + i * 2);
    this.cram.fill(0);
    this.frame = 0;
    this.anim = 0;
    this.animWait = 0;
    this.textY = 0xf0;
    this.textWait = 0;
    this.pressed = false;
    this.root.hidden = false;
    this.video.src = result === 'won' ? victoryVideoUrl : defeatVideoUrl;
    void this.video.play().catch(() => { /* The existing artwork remains available if playback is blocked. */ });
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.acc = 0;
    this.loop();
  }

  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    if (b === "a" || b === "b" || b === "c" || b === "start") this.pressed = true;
    return true;
  }

  close(): void {
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.done = null;
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
    this.frame++;
    // проявление палитры, шаг в кадр
    for (let i = 0; i < 64; i++) if (this.cram[i] !== this.target[i]) this.cram[i] = stepColor(this.cram[i], this.target[i]);
    // $00A632: надпись поднимается на точку раз в 3 кадра до y $B0
    if (--this.textWait < 0 && this.textY > 0xb0) {
      this.textY--;
      this.textWait = 2;
    }
    // смена кадра анимации раз в 11 кадров
    if (++this.animWait >= 11) {
      this.animWait = 0;
      this.anim = (this.anim + 1) & 3;
    }
    if (this.pressed) {
      this.pressed = false;
      const done = this.done;
      this.close();
      done?.();
    }
  }

  private draw(): void {
    const key = this.result === "won" ? "victory" : "defeat";
    const videoReady = !this.video.error && this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    if (videoReady || this.art?.get(key)) {
      const out = prepareMenu(this.canvas);
      out.save();
      out.globalAlpha = Math.min(1, this.frame / 7);
      if (videoReady) {
        // Cover the native-resolution canvas without stretching the 16:9 clip.
        out.save();out.setTransform(1, 0, 0, 1, 0, 0);
        const scale = Math.max(this.canvas.width / this.video.videoWidth, this.canvas.height / this.video.videoHeight);
        const w = this.video.videoWidth * scale, h = this.video.videoHeight * scale;
        out.drawImage(this.video, (this.canvas.width-w)/2, (this.canvas.height-h)/2, w, h);
        out.restore();
      } else this.art?.background(out, key);
      // Пыль и угольки движутся независимо от картинки; она остаётся чёткой.
      for (let i = 0; !videoReady && i < 32; i++) {
        const t = this.frame / 60;
        const x = ((i * 43.7 + t * (2 + i % 5)) % 460) - 70;
        const y = 224 - ((i * 19.1 + t * (this.result === "lost" ? 9 : 2)) % 180);
        const ember = this.result === "lost" && i % 3 === 0;
        out.fillStyle = ember ? `rgba(255,177,70,${.28 + .2 * Math.sin(t * 3 + i) ** 2})` : "rgba(247,219,163,.19)";
        out.beginPath(); out.arc(x, y, ember ? .32 : .2, 0, Math.PI * 2); out.fill();
      }
      const shade = out.createLinearGradient(0, 130, 0, 224);
      shade.addColorStop(0, "#0000"); shade.addColorStop(1, "#080a0fea");
      out.fillStyle = shade; out.fillRect(-160, 130, 640, 94);
      const y = this.textY;
      menuText(out, this.result === "won" ? "ПОБЕДА" : "ПОРАЖЕНИЕ", 160, y, {
        size: 20, align: "center", color: this.result === "won" ? "#ffe1a0" : "#f0b29a", weight: "700",
      });
      out.strokeStyle = "#d9b16e99"; out.lineWidth = .5;
      out.beginPath(); out.moveTo(110, y + 24); out.lineTo(210, y + 24); out.stroke();
      if (y <= 180) menuText(out, "Нажмите, чтобы продолжить", 160, 211, { size: 5.2, align: "center", color: "#d5c9b6" });
      out.restore();
      return;
    }
    const b = this.rom.bytes;
    const R = END_ROM[this.result];
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    const map = this.maps[this.anim];
    for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(this.vram, readU16(map, (cy * 64 + cx) * 2), pal, px, SCREEN_W, cx * 8, cy * 8);
    const tiles = b.subarray(R.text);
    for (const s of objectDef(b, R.textDef)) drawObjSprite(px, SCREEN_W, SCREEN_H, tiles, 0x580, s, 0x80 + s.x, this.textY + s.y, pal);
    new Uint32Array(this.img.data.buffer).set(px);
    this.lowCtx.putImageData(this.img, 0, 0);
    const out = prepareMenu(this.canvas);
    out.drawImage(this.lowCanvas, 0, 0, SCREEN_W, SCREEN_H);
  }
}

/**
 * Пролёт клина орнитоптеров поверх карты ($00B576): координаты — экран MD 320×224, его середина совпадает
 * с серединой вида. Тайлы $7D0/$7F0 — из VRAM спрайтов миссии.
 */
export class Flyby {
  readonly canvas = document.createElement("canvas");
  private g: CanvasRenderingContext2D;
  private sprites: ObjSprite[] = [];
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private line = 0;
  private house = 0;
  private frame = 0;
  private vram: Uint8Array;
  private palette: Uint32Array;
  active = false;

  constructor(private rom: DuneRom, private vehicles?: VehicleArt | null) {
    this.canvas.className = "flyby";
    this.canvas.setAttribute("aria-hidden", "true");
    this.g = this.canvas.getContext("2d")!;
    this.vram = rom.spriteVram();
    this.palette = rom.gamePalette();
    this.canvas.hidden = true;
  }

  /** house — номер дома ROM (0 Харконнены, 1 Атрейдесы, 2 Ордосы). */
  start(house: number): void {
    const b = this.rom.bytes;
    const s16 = (a: number) => (readU16(b, a) << 16) >> 16;
    const path = Math.floor(Math.random() * 4);
    this.sprites = objectDef(b, END_ROM.flyDefs[path]);
    this.vx = s16(END_ROM.flyVelocity + path * 4);
    this.vy = s16(END_ROM.flyVelocity + path * 4 + 2);
    this.x = s16(END_ROM.flyStart + path * 4);
    this.y = s16(END_ROM.flyStart + path * 4 + 2);
    this.line = readU16(b, END_ROM.flyLine + house * 2) >> 13;
    this.house = house;
    this.frame = 0;
    this.active = true;
    this.canvas.hidden = false;
  }

  stop(): void {
    this.active = false;
    this.canvas.hidden = true;
  }

  /** Кадр: сдвиг ($00B544) и отрисовка в холст размером с вид (w×h точек MD). */
  tick(w: number, h: number, zoom: number): void {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.frame++;
    const W = Math.ceil(w);
    const H = Math.ceil(h);
    if(this.vehicles){
      const scale=zoom*Math.max(1,window.devicePixelRatio||1),pw=Math.ceil(W*scale),ph=Math.ceil(H*scale);
      if(this.canvas.width!==pw||this.canvas.height!==ph){this.canvas.width=pw;this.canvas.height=ph;}
      this.canvas.style.width=`${W*zoom}px`;this.canvas.style.height=`${H*zoom}px`;
      this.g.setTransform(1,0,0,1,0,0);this.g.clearRect(0,0,pw,ph);this.g.scale(scale,scale);
      const angle=Math.atan2(this.vx,-this.vy)*128/Math.PI;
      for(const [i,s] of this.sprites.entries())this.vehicles.ornithopter(this.g,
        (W-SCREEN_W)/2+this.x+s.x+s.w*4,(H-SCREEN_H)/2+this.y+s.y+s.h*4,
        angle,this.house,this.frame,i);
      return;
    }
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.canvas.style.width = `${W * zoom}px`;
    this.canvas.style.height = `${H * zoom}px`;
    const ox = Math.floor((W - SCREEN_W) / 2);
    const oy = Math.floor((H - SCREEN_H) / 2);
    const px = new Uint32Array(W * H);
    for (const s of this.sprites) drawObjSprite(px, W, H, this.vram, 0, s, ox + this.x + s.x, oy + this.y + s.y, this.palette, this.line << 13);
    this.g.putImageData(new ImageData(new Uint8ClampedArray(px.buffer), W, H), 0, 0);
  }
}
