/**
 * Заставка при включении, как в оригинале MD:
 * - $001864: экран «SEGA», цвета 2–12 переливаются по таблице $0018D6 (3 круга по 21 шагу через 3 кадра);
 * - $017418: звёзды плоскости B едут влево ($017C36: разгон на $800 за кадр до 3 точек), пока идёт показ —
 *   по кругу от 0 до −320; логотипы Virgin/Westwood на плоскости A проявляются (строки 1–3 палитры,
 *   шаг раз в 3 кадра), 300 кадров держатся и гаснут; затем звёзды тормозят до −704 — к планете;
 * - главное меню: плоскость A с −512 («DUNE»), строки 1–3 проявляются.
 * - $017636: строки 1–3 палитры — $0A6E98, 61 кадр, тайлы кораблей $017F2E в VRAM $6200; три сценки ($017DC8:
 *   1, 0, 2) — корабль по точкам $01963A (1 x y — точка и 3 кадра, 2 — следующий кадр спрайта $01957A);
 *   перед каждой — секвенция 10; затем строки 1–3 чёрные и 180 кадров пауза.
 * Любая кнопка — сразу главное меню ($017D1A, $00471A).
 */
import type { ScreenGfx } from "../gfx/screens.ts";
import { SCREEN_H, SCREEN_W } from "../gfx/screens.ts";
import { blitTile, cramToRGBA, readU16, readU32 } from "../rom/md.ts";
import { drawObjSprite, objectDef, type ObjSprite } from "./endgame.ts";
import { loadTileList } from "./tutorial.ts";
import { menuText } from "../gfx/menu-canvas.ts";
import {PlanetBackdrop} from './planet-backdrop.ts';
import { ShipFlight, type ShipPose } from './ship-flight.ts';
import { ShipCinematic, cinemaCamera, drawCinemaFilters, mothershipsReady, preloadMotherships } from './ship-cinematic.ts';
import { spaceCamera, type PlanetView } from '../gfx/space-scene.ts';

type Step = Generator<void, void, void>;

/** время показа кораблей между гашением логотипов и торможением (в оригинале — их пролёт, замерено) */
const SHIPS_FRAMES = 240;
/**
 * С 3D-кинопролётом сцены длиннее спрайтовых, поэтому звёзды после логотипов не ждут — сразу подлёт к планете
 * (владелец 2026-10-20: «планета быстрее, сразу после движения звёзд; надписи должны успеть к голосу в музыке»).
 * Меню выходит по часам самой музыки: голос «The Battle for Arrakis» в Opening.mp3 — с 31,7 с (gfx/screens.ts),
 * к этому моменту палитра меню уже проявилась.
 */
const MENU_MUSIC_SECONDS = 30;

function stepColor(c: number, target: number): number {
  let out = 0;
  for (const [mask, one] of [[0x00e, 0x002], [0x0e0, 0x020], [0xe00, 0x200]]) {
    const a = c & mask;
    const b = target & mask;
    out |= a === b ? a : a < b ? a + one : a - one;
  }
  return out;
}

export class Intro {
  private px = new Uint32Array(SCREEN_W * SCREEN_H);
  private gen: Step | null = null;
  private cram = new Uint16Array(64);
  private mode: "sega" | "title" | "black" = "black";
  private sega: ReturnType<ScreenGfx["segaData"]>;
  private title: ReturnType<ScreenGfx["titleData"]>;
  private titleMenu: ReturnType<ScreenGfx["titleData"]>;
  private hsA = 0;
  private hsB = 0;
  private showA = false;
  private menu = false;
  // $017C36: позиция и скорость прокрутки B (16.16), признаки «по кругу» и «торможение»
  private scrolling = false;
  private pos = -1;
  private speed = 0x8000;
  private loopOn = true;
  private loopAgain = true;
  private braking = false;
  private readonly target = -704 * 0x10000;
  /** корабль сценки: координаты экрана и спрайты кадра */
  private ship: { x: number; y: number; sprites: ObjSprite[]; house: number } | null = null;
  private shipFlight: ShipFlight | null = null;
  /** кинопролёт 3D-матки (ui/ship-cinematic.ts) вместо спрайтов ROM, когда модели загружены */
  private cinematic: ShipCinematic | null = null;
  /** кадры начала и конца кинопролёта (−1 — не было) и где планета была в последнем плане — от неё отъезд к меню */
  private cinemaFrom = -1;
  private cinemaTo = -1;
  /** кадр, когда пошла музыка заставки (секвенция 0) */
  private playFrame = -1;
  private lastView: PlanetView | null = null;
  private vram: Uint8Array;
  private original = document.createElement("canvas");
  private animationFrame = 0;
  private menuStartFrame = 0;
  private stars: { x: number; y: number; phase: number }[] = [];
  private starStamps: { x: number; y: number; canvas: HTMLCanvasElement; size: number; phase: number }[] | null = null;
  private shipBounds = new Map<string, { x: number; y: number; w: number; h: number }>();
  private segaVideo: HTMLVideoElement | null = null;
  private segaLogo:HTMLCanvasElement|null=null;
  private segaLogoPixels:Uint8ClampedArray|null=null;
  private planet=new PlanetBackdrop();

  private getSegaVideo(): HTMLVideoElement | null {
    if (typeof document === "undefined") return null;
    if (!this.segaVideo) {
      const base = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
      const cleanBase = base.endsWith("/") ? base : base + "/";
      const video = document.createElement("video");
      video.src = `${cleanBase}video/sega.mp4`;
      video.playsInline = true;
      video.preload = "auto";
      video.muted = false;
      this.segaVideo = video;
    }
    return this.segaVideo;
  }

  stopVideo(): void {
    if (this.segaVideo) {
      this.segaVideo.pause();
      this.segaVideo.currentTime = 0;
    }
  }

  /** HD lettering with the original ROM's 21-step blue palette wave. */
  private animatedSega(logo:ImageBitmap,time:number):HTMLCanvasElement {
    if(!this.segaLogo){
      const c=document.createElement('canvas');c.width=600;c.height=220;
      const g=c.getContext('2d')!;
      g.drawImage(logo,logo.width*.30,logo.height*.40,logo.width*.40,logo.height*.22,0,0,600,220);
      this.segaLogo=c;this.segaLogoPixels=g.getImageData(0,0,600,220).data;
    }
    const c=this.segaLogo,g=c.getContext('2d')!,pixels=new Uint8ClampedArray(this.segaLogoPixels!);
    const step=Math.floor(time*60/3)%21;
    const colors=Array.from({length:21},(_,i)=>cramToRGBA(readU16(this.gfx.romBytes,this.sega.cycle+((i+step)%21)*2)));
    for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+2]<=pixels[i]*1.3||pixels[i]>=180)continue;
      const row=Math.floor(i/4/c.width),color=colors[Math.min(20,Math.floor(row/c.height*11))];
      pixels[i]=(color&255)*.78;pixels[i+1]=((color>>>8)&255)*.78;pixels[i+2]=((color>>>16)&255)*.78;
    }
    // Keep the white contour subdued instead of blooming like a neon sign.
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]>=180){pixels[i]*=.67;pixels[i+1]*=.67;pixels[i+2]*=.67;}
    g.putImageData(new ImageData(pixels,c.width,c.height),0,0);return c;
  }
  pauseBackdrop():void {this.planet.pause();}

  constructor(
    private gfx: ScreenGfx,
    private play: (seq: number) => void = () => {},
    private stop: (seq: number) => void = () => {},
    private openingTime: () => number = () => this.animationFrame / 60,
    /** звук пролёта матки дома house длительностью seconds (sound/ship-flyby.ts) */
    private flyby: (house: number, seconds: number) => void = () => {},
  ) {
    this.sega = gfx.segaData();
    this.title = gfx.titleData(false);
    this.titleMenu = gfx.titleData(true);
    this.vram = this.title.vram.slice();
    this.original.width = SCREEN_W;
    this.original.height = SCREEN_H;
    const pal = Uint32Array.from(this.title.palette, (c) => cramToRGBA(c));
    const tile = new Uint32Array(64);
    // Координаты пролёта оставляем из ROM, а сами звёзды оформляем HD-образцами ниже.
    for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 88; cx++) {
      tile.fill(0);
      blitTile(this.vram, readU16(this.title.maps, 0xe000 + (cy * 128 + cx) * 2), pal, tile, 8, 0, 0);
      let count = 0, sumX = 0, sumY = 0;
      for (let i = 0; i < 64; i++) if (tile[i]) { count++; sumX += i % 8; sumY += Math.floor(i / 8); }
      if (count) this.stars.push({ x: cx * 8 + sumX / count, y: cy * 8 + sumY / count, phase: this.stars.length * 2.17 });
    }
  }

  start(): void {
    this.stopVideo();
    this.planet.reset();
    const ships = this.gfx.art.get('ships');
    if (ships) ShipFlight.preload(ships);
    preloadMotherships();
    this.cram.fill(0);
    this.mode = "black";
    this.hsA = this.hsB = 0;
    this.showA = this.menu = this.scrolling = this.braking = false;
    this.menuStartFrame = 0;
    this.pos = -1;
    this.speed = 0x8000;
    this.loopOn = this.loopAgain = true;
    this.ship = null;
    this.shipFlight = null;
    this.cinematic = null;
    this.cinemaFrom = this.cinemaTo = this.playFrame = -1;
    this.lastView = null;
    this.vram = this.title.vram.slice();
    this.gen = this.run();
  }

  /** Кадр; false — заставка кончилась. */
  tick(): boolean {
    this.animationFrame++;
    if (this.scrolling) this.scrollB();
    return !this.gen?.next().done;
  }

  /** Время сборки DUNE, чтобы главный экран продолжил её с текущего кадра заставки. */
  titleElapsedSeconds(): number {
    return this.menu ? Math.max(0, (this.animationFrame - this.menuStartFrame) / 60) : 0;
  }

  private *wait(n: number): Step {
    for (let i = 0; i < n; i++) yield;
  }

  /** Строки from…to палитры к цели, шаг раз в 3 кадра, пока не сойдутся. */
  private *fade(target: Uint16Array, from = 16, to = 64): Step {
    for (;;) {
      let same = 0;
      for (let i = from; i < to; i++) {
        if (this.cram[i] === target[i]) same++;
        else this.cram[i] = stepColor(this.cram[i], target[i]);
      }
      yield* this.wait(3);
      if (same === to - from) return;
    }
  }

  /** $017DC8: сценка n — корабль по точкам. */
  private *cutscene(n: number): Step {
    // 3D-матка с планом съёмки и своим звуком; порядок сцен и паузы — как в ROM
    if (mothershipsReady()) {
      this.cinematic = new ShipCinematic(n, this.animationFrame, this.animationFrame === this.cinemaFrom ? spaceCamera(1) : undefined);
      this.flyby(n, this.cinematic.frames / 60);
      yield* this.wait(this.cinematic.frames);
      this.cinematic = null;
      return;
    }
    const b = this.gfx.romBytes;
    const frames = readU32(b, 0x01957a + n * 4);
    // Read ahead for smooth HD interpolation; the generator below keeps ROM timing intact.
    const poses: ShipPose[] = [];
    let spriteFrame = 0, sprites = objectDef(b, readU32(b, frames));
    for (let p = readU32(b, 0x01963a + n * 4); ; ) {
      const cmd = readU16(b, p); p += 2;
      if (cmd === 1) {
        const bounds = this.visibleShipBounds(sprites);
        poses.push({ ...bounds, x: ((readU16(b, p) << 16) >> 16) + bounds.x,
          y: ((readU16(b, p + 2) << 16) >> 16) + bounds.y });
        p += 4;
      } else if (cmd === 2) sprites = objectDef(b, readU32(b, frames + ++spriteFrame * 4));
      else break;
    }
    this.shipFlight = new ShipFlight(poses, n, this.animationFrame);
    let frame = 0;
    this.ship = { x: 0, y: 0, sprites: objectDef(b, readU32(b, frames)), house: n };
    for (let p = readU32(b, 0x01963a + n * 4); ; ) {
      const cmd = readU16(b, p);
      p += 2;
      if (cmd === 1) {
        this.ship.x = (readU16(b, p) << 16) >> 16;
        this.ship.y = (readU16(b, p + 2) << 16) >> 16;
        p += 4;
        yield* this.wait(3);
      } else if (cmd === 2) {
        frame++;
        this.ship = { x: 40, y: 40, sprites: objectDef(b, readU32(b, frames + frame * 4)), house: n };
      } else break;
    }
    this.ship = null;
    this.shipFlight = null;
  }

  /** $017C36: шаг прокрутки звёзд. */
  private scrollB(): void {
    if (this.loopOn && this.pos >> 16 < -320) {
      if (this.loopAgain) this.pos = -1;
      else {
        this.loopOn = false;
        this.braking = true;
        this.speed = 0x58800;
        // Count the untouched ROM scroll steps; fit the approach video into exactly that cue.
        let position=this.pos,speed=this.speed,frames=0;
        do{speed-=0x800;position-=Math.max(0x8000,Math.min(0x30000,speed));frames++;}while(position>this.target);
        this.planet.begin(this.animationFrame,frames);
      }
    }
    this.hsB = this.pos >> 16;
    if (!this.braking) {
      this.speed += 0x800;
      this.pos -= this.speed >= 0x30000 ? 0x30000 : this.speed;
    } else {
      this.speed -= 0x800;
      this.pos -= this.speed >= 0x30000 ? 0x30000 : this.speed <= 0x8000 ? 0x8000 : this.speed;
      if (this.pos <= this.target) {
        this.speed = 0x8000;
        this.pos = this.target;
        this.scrolling = false;
        this.hsB = this.pos >> 16;
      }
    }
  }

  private *run(): Step {
    const b = this.gfx.romBytes;
    // «SEGA»
    this.mode = "sega";
    const v = this.getSegaVideo();
    if (v) {
      v.currentTime = 0;
      v.muted = false;
      const p = v.play();
      if (p) {
        p.catch(() => {
          v.muted = true;
          v.play().catch(() => {});
        });
      }
      let frames = 0;
      while (!v.ended && v.currentTime < 3.65 && frames < 240) {
        frames++;
        yield;
      }
      v.pause();
    } else {
      yield* this.wait(180);
    }
    // $017418: тайлы и звёзды ($0C7D68, кадр 12), строки 0 и 2 палитры
    this.mode = "black";
    this.cram.fill(0);
    yield* this.wait(53);
    this.mode = "title";
    this.cram.set(this.title.palette.subarray(0, 16), 0);
    this.cram.set(this.title.palette.subarray(32, 48), 32);
    yield* this.wait(3);
    this.scrolling = true;
    this.play(0);
    this.playFrame = this.animationFrame;
    yield* this.wait(200);
    // логотипы: плоскость A с 0, строки 1–3 проявляются, 300 кадров, гаснут
    this.showA = true;
    this.hsA = 0;
    yield* this.wait(16);
    yield* this.fade(this.title.palette);
    yield* this.wait(300);
    yield* this.fade(new Uint16Array(64));
    this.showA = false;
    yield* this.wait(mothershipsReady() ? 0 : SHIPS_FRAMES);
    // $017D48: звёзды больше не по кругу — тормозят к планете
    this.loopAgain = false;
    while (this.scrolling) yield;
    // $017636: сценки с кораблями
    // $0044C4(1, 0, $30, $0A6E98): строки 1–3 сразу из $0A6E98
    for (let i = 0; i < 48; i++) this.cram[16 + i] = readU16(b, 0x0a6e98 + i * 2);
    yield* this.wait(mothershipsReady() ? 20 : 61);
    loadTileList(b, this.vram, 0x017f2e, 0x6200);
    if (mothershipsReady()) this.cinemaFrom = this.animationFrame;
    for (const n of [1, 0, 2]) {
      // у кинопролёта свой звук (sound/ship-flyby.ts), у спрайтов — секвенция 10 из ROM
      const rom = !mothershipsReady();
      if (rom) this.play(10);
      yield* this.cutscene(n);
      if (rom) this.stop(10);
    }
    if (this.cinemaFrom >= 0) this.cinemaTo = this.animationFrame;
    this.cram.fill(0, 16, 64);
    if (this.cinemaFrom < 0) yield* this.wait(180);
    else for (let n = 0; n < 30 || (n < 240 && this.musicTime() < MENU_MUSIC_SECONDS); n++) yield;
    // $01777A: кадр 13 заново — тайлы меню поверх тайлов кораблей
    this.vram = this.title.vram.slice();
    // главное меню
    this.showA = true;
    this.menu = true;
    this.hsA = -512;
    this.menuStartFrame = this.animationFrame;
    yield* this.fade(this.titleMenu.palette);
  }

  /** Плоскость 128×28 клеток с горизонтальной прокруткой hs: точка плоскости x видна на экране в x + hs (mod 1024). */
  private plane(maps: Uint8Array, base: number, hs: number, pal: Uint32Array): void {
    const tile = new Uint32Array(64);
    for (let cx = 0; cx < 128; cx++) {
      let sx = (((cx * 8 + hs) % 1024) + 1024) % 1024;
      if (sx > 1016) sx -= 1024;
      if (sx >= SCREEN_W) continue;
      for (let cy = 0; cy < 28; cy++) {
        const word = readU16(maps, base + (cy * 128 + cx) * 2);
        if (!(word & 0x7ff)) continue;
        tile.fill(0);
        blitTile(this.vram, word, pal, tile, 8, 0, 0);
        for (let r = 0; r < 8; r++)
          for (let c = 0; c < 8; c++) {
            const x = sx + c;
            const v = tile[r * 8 + c];
            if (v && x >= 0 && x < SCREEN_W) this.px[(cy * 8 + r) * SCREEN_W + x] = v;
          }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.drawHD(ctx)) return;
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    if (this.mode === "sega") {
      const v = this.getSegaVideo();
      if (v && v.readyState >= 2) {
        ctx.save();
        ctx.drawImage(v, 0, 0, SCREEN_W, SCREEN_H);
        ctx.restore();
        return;
      }
      for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(this.sega.vram, readU16(this.sega.map, (cy * 64 + cx) * 2), pal, px, SCREEN_W, cx * 8, cy * 8);
    } else if (this.mode === "title") {
      this.plane(this.title.maps, 0xe000, this.hsB, pal);
      if (this.showA) this.plane((this.menu ? this.titleMenu : this.title).maps, 0xc000, this.hsA, pal);
      const s = this.ship;
      if (s) for (let i = s.sprites.length - 1; i >= 0; i--) drawObjSprite(px, SCREEN_W, SCREEN_H, this.vram, 0, s.sprites[i], s.x + s.sprites[i].x, s.y + s.sprites[i].y, pal);
    }
    this.original.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(px.buffer.slice(0)), SCREEN_W, SCREEN_H), 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.original, 0, 0);
    ctx.restore();
  }

  /** Сколько секунд играет музыка заставки: часы трека, а без него — кадры с её запуска. */
  private musicTime(): number {
    const frames = (this.animationFrame - this.playFrame) / 60, music = this.openingTime();
    return music > 0 && Math.abs(music - frames) < 10 ? music : frames;
  }

  /** Планета на время кинопролёта: свой план у каждой сценки, после последней — плавный отъезд к виду меню. */
  private planetView(): PlanetView | undefined {
    if (this.cinematic) return (this.lastView = this.cinematic.planetView(this.animationFrame));
    if (this.cinemaTo < 0 || !this.lastView) return undefined;
    const k = Math.min(1, (this.animationFrame - this.cinemaTo) / 120), e = k * k * k * (k * (k * 6 - 15) + 10);
    if (e >= 1) return undefined;
    const end = spaceCamera(1), a = this.lastView;
    return { x: a.x + (end.x - a.x) * e, y: a.y + (end.y - a.y) * e, radius: a.radius + (end.radius - a.radius) * e };
  }

  /** Share the exact starfield with the title screen after the intro stops scrolling. */
  drawBackdrop(ctx: CanvasRenderingContext2D, frame: number, scroll = -704, view?: PlanetView): boolean {
    const art = this.gfx.art;
    if (!art.get("arrakis")) return false;
    if(this.planet.draw(ctx,frame,scroll===-704,view))return true;
    ctx.save();
    art.background(ctx, "arrakis", 704 + scroll);
    const image = art.get("arrakis");
    if (image) {
      const matrix = ctx.getTransform();
      const logicalW = ctx.canvas.width / matrix.a;
      const logicalH = ctx.canvas.height / matrix.d;
      const viewLeft = (320 - logicalW) / 2;
      const viewRight = (320 + logicalW) / 2;
      const bgW = Math.max(logicalW, logicalH * image.width / image.height);
      const bgH = bgW * image.height / image.width;
      const bgX = (320 - bgW) / 2 + 704 + scroll;
      const bgY = (224 - bgH) / 2;
      const cx = bgX + 1052 / image.width * bgW;
      const cy = bgY + 440 / image.height * bgH;
      const rx = 267 / image.width * bgW;
      const ry = 267 / image.height * bgH;

      // Берём формы звёзд прямо из этого фона, сохраняя ROM-траектории пролёта.
      if (!this.starStamps) {
        const samples = [
          [56, 109, 30], [118, 72, 24], [354, 92, 25], [648, 67, 24], [705, 188, 32],
          [888, 95, 25], [978, 36, 25], [1102, 98, 24], [1220, 98, 25], [1404, 68, 28],
          [1560, 135, 24], [1626, 81, 25], [323, 279, 34], [472, 461, 25], [161, 249, 23],
          [65, 365, 24], [44, 615, 24], [414, 608, 24], [646, 725, 28], [830, 846, 30],
          [1375, 639, 26], [1608, 719, 30], [1540, 869, 24],
        ];
        this.starStamps = samples.map(([x, y, size], i) => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          const stampCtx = canvas.getContext("2d", { willReadFrequently: true })!;
          stampCtx.drawImage(image, x - size / 2, y - size / 2, size, size, 0, 0, size, size);
          const pixels = stampCtx.getImageData(0, 0, size, size);
          for (let p = 0; p < pixels.data.length; p += 4) {
            const brightness = Math.max(pixels.data[p], pixels.data[p + 1], pixels.data[p + 2]);
            pixels.data[p + 3] = brightness < 10 ? 0 : Math.min(255, brightness * 1.15);
            if (brightness) {
              pixels.data[p] = Math.min(255, pixels.data[p] * 255 / brightness);
              pixels.data[p + 1] = Math.min(255, pixels.data[p + 1] * 255 / brightness);
              pixels.data[p + 2] = Math.min(255, pixels.data[p + 2] * 255 / brightness);
            }
          }
          stampCtx.putImageData(pixels, 0, 0);
          return { x, y, canvas, size, phase: i * 2.17 };
        });
      }
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i];
        const stamp = this.starStamps[i % this.starStamps.length];
        const x = ((star.x + scroll) % 704 + 704) % 704;
        const pulse = (1 + Math.sin(frame * 0.055 + star.phase)) / 2;
        const size = stamp.size / image.height * bgH;
        for (const sx of [x - 704, x, x + 704]) {
          if (sx < viewLeft - size || sx > viewRight + size) continue;
          ctx.globalAlpha = 0.48 + pulse * 0.42;
          ctx.drawImage(stamp.canvas, sx - size / 2, star.y - size / 2, size, size);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // Небольшой медленный оборот фактуры внутри диска без смещения его края.
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(frame * 0.006) * 0.004);
      ctx.drawImage(image, 0, 0, image.width, image.height, bgX - cx, bgY - cy, bgW, bgH);
      ctx.restore();
    }
    ctx.restore();
    return true;
  }

  /** Состояния и координаты анимации прежние; HD-слои рисуются сразу в нативный широкий холст. */
  private drawHD(ctx: CanvasRenderingContext2D): boolean {
    const art = this.gfx.art;
    if (this.mode === "black") return true;
    if (this.mode === "sega") {
      const v = this.getSegaVideo();
      const logo=art.get('sega'),t=v?.currentTime??0;
      ctx.save();
      const width=ctx.canvas.width/(ctx.getTransform().a||1),x=(320-width)/2;
      ctx.fillStyle='#010204';ctx.fillRect(x,0,width,SCREEN_H);
      const light=ctx.createRadialGradient(160,112,8,160,112,112);
      light.addColorStop(0,'#071422');light.addColorStop(1,'#010204');
      ctx.fillStyle=light;ctx.fillRect(x,0,width,SCREEN_H);
      if(logo){
        const opacity=Math.min(1,t/.35,Math.max(0,(3.65-t)/.4));
        ctx.globalAlpha=opacity;ctx.globalCompositeOperation='screen';
        ctx.shadowColor='#164fb0';ctx.shadowBlur=1.3;
        const scale=1+.014*Math.sin(Math.min(1,t/3.65)*Math.PI);
        ctx.translate(160,112);ctx.scale(scale,scale);
        ctx.drawImage(this.animatedSega(logo,t),-83,-30,166,60);
      }
      ctx.restore();
      return true;
    }
    if (!art.get("arrakis") || (this.showA && !this.menu && !art.get("publishers")) || (this.ship && !art.get("ships"))) return false;
    ctx.save();
    this.drawBackdrop(ctx, this.animationFrame, this.hsB, this.planetView());
    if (this.showA) {
      let brightness = 0, full = 0;
      const target = this.menu ? this.titleMenu.palette : this.title.palette;
      for (let i = 16; i < 64; i++) {
        const level = (c: number) => (c & 14) + ((c >> 4) & 14) + ((c >> 8) & 14);
        brightness += level(this.cram[i]);
        full += level(target[i]);
      }
      ctx.globalAlpha = Math.min(1, brightness / Math.max(1, full));
      if (this.menu) this.gfx.drawTitleLettering(
        ctx, (this.animationFrame - this.menuStartFrame) / 60, this.openingTime(),
      );
      else {
        const publishers = art.get("publishers");
        if (publishers) {
          const crop = (sx: number, sy: number, w: number, h: number, x: number, y: number, dw: number, dh: number) =>
            ctx.drawImage(publishers, sx / 320 * publishers.width, sy / 224 * publishers.height,
              w / 320 * publishers.width, h / 224 * publishers.height, x, y, dw, dh);
          crop(106, 19, 132, 103, 119, 13, 90, 68);
          crop(30, 142, 260, 69, 60, 123, 200, 42);
          menuText(ctx, "INTERACTIVE", 160, 82, { size: 6.2, align: "center" });
          menuText(ctx, "ENTERTAINMENT", 160, 89, { size: 6, align: "center" });
          menuText(ctx, "AND", 160, 106, { size: 7, align: "center" });
          menuText(ctx, "©1994 VIRGIN INTERACTIVE", 160, 176, { size: 6.5, align: "center" });
          menuText(ctx, "ENTERTAINMENT", 160, 184, { size: 6.5, align: "center" });
          menuText(ctx, "TALCO design studio · 2026", 160, 200, { size: 6.5, align: "center" });
        }
      }
      ctx.globalAlpha = 1;
    }
    const ship = this.ship;
    const ships = art.get("ships");
    if (ship && ships) {
      this.shipFlight?.draw(ctx, ships, this.animationFrame);
    }
    this.cinematic?.draw(ctx, this.animationFrame);
    drawCinemaFilters(ctx, cinemaCamera(this.animationFrame, this.cinemaFrom, this.cinemaTo), this.animationFrame);
    ctx.restore();
    return true;
  }

  /** Удаляющиеся кадры имеют разный прозрачный отступ: он не должен растягивать силуэт HD-корабля. */
  private visibleShipBounds(sprites: ObjSprite[]): { x: number; y: number; w: number; h: number } {
    const key = JSON.stringify(sprites);
    const cached = this.shipBounds.get(key);
    if (cached) return cached;
    const x = Math.min(...sprites.map((s) => s.x));
    const y = Math.min(...sprites.map((s) => s.y));
    const w = Math.max(...sprites.map((s) => s.x + s.w * 8)) - x;
    const h = Math.max(...sprites.map((s) => s.y + s.h * 8)) - y;
    const px = new Uint32Array(w * h);
    const pal = new Uint32Array(64).fill(0xffffffff);
    for (let i = sprites.length - 1; i >= 0; i--) {
      const s = sprites[i];
      drawObjSprite(px, w, h, this.vram, 0, s, s.x - x, s.y - y, pal);
    }
    let left = w, top = h, right = 0, bottom = 0;
    for (let i = 0; i < px.length; i++) if (px[i]) {
      left = Math.min(left, i % w);
      top = Math.min(top, Math.floor(i / w));
      right = Math.max(right, i % w + 1);
      bottom = Math.max(bottom, Math.floor(i / w) + 1);
    }
    const bounds = right > left ? { x: x + left, y: y + top, w: right - left, h: bottom - top } : { x, y, w, h };
    this.shipBounds.set(key, bounds);
    return bounds;
  }
}
