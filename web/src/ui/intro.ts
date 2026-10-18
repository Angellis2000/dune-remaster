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

type Step = Generator<void, void, void>;

/** время показа кораблей между гашением логотипов и торможением (в оригинале — их пролёт, замерено) */
const SHIPS_FRAMES = 240;

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
  private ship: { x: number; y: number; sprites: ObjSprite[] } | null = null;
  private vram: Uint8Array;

  constructor(
    private gfx: ScreenGfx,
    private play: (seq: number) => void = () => {},
  ) {
    this.sega = gfx.segaData();
    this.title = gfx.titleData(false);
    this.titleMenu = gfx.titleData(true);
    this.vram = this.title.vram.slice();
  }

  start(): void {
    this.gen = this.run();
  }

  /** Кадр; false — заставка кончилась. */
  tick(): boolean {
    if (this.scrolling) this.scrollB();
    return !this.gen?.next().done;
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
    const b = this.gfx.romBytes;
    const frames = readU32(b, 0x01957a + n * 4);
    let frame = 0;
    this.ship = { x: 0, y: 0, sprites: objectDef(b, readU32(b, frames)) };
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
        this.ship = { x: 40, y: 40, sprites: objectDef(b, readU32(b, frames + frame * 4)) };
      } else break;
    }
    this.ship = null;
  }

  /** $017C36: шаг прокрутки звёзд. */
  private scrollB(): void {
    if (this.loopOn && this.pos >> 16 < -320) {
      if (this.loopAgain) this.pos = -1;
      else {
        this.loopOn = false;
        this.braking = true;
        this.speed = 0x58800;
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
    this.cram.set(this.sega.palette);
    for (let cycle = 0; cycle < 3; cycle++)
      for (let d = 40; ; d -= 2) {
        yield* this.wait(3);
        if (d < 0) break;
        for (let i = 0; i < 11; i++) this.cram[2 + i] = readU16(b, this.sega.cycle + d + i * 2);
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
    yield* this.wait(200);
    // логотипы: плоскость A с 0, строки 1–3 проявляются, 300 кадров, гаснут
    this.showA = true;
    this.hsA = 0;
    yield* this.wait(16);
    yield* this.fade(this.title.palette);
    yield* this.wait(300);
    yield* this.fade(new Uint16Array(64));
    this.showA = false;
    yield* this.wait(SHIPS_FRAMES);
    // $017D48: звёзды больше не по кругу — тормозят к планете
    this.loopAgain = false;
    while (this.scrolling) yield;
    // $017636: сценки с кораблями
    // $0044C4(1, 0, $30, $0A6E98): строки 1–3 сразу из $0A6E98
    for (let i = 0; i < 48; i++) this.cram[16 + i] = readU16(b, 0x0a6e98 + i * 2);
    yield* this.wait(61);
    loadTileList(b, this.vram, 0x017f2e, 0x6200);
    for (const n of [1, 0, 2]) {
      this.play(10);
      yield* this.cutscene(n);
    }
    this.cram.fill(0, 16, 64);
    yield* this.wait(180);
    // $01777A: кадр 13 заново — тайлы меню поверх тайлов кораблей
    this.vram = this.title.vram.slice();
    // главное меню
    this.showA = true;
    this.menu = true;
    this.hsA = -512;
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
    const pal = new Uint32Array(64);
    for (let i = 0; i < 64; i++) pal[i] = cramToRGBA(this.cram[i]);
    const px = this.px;
    px.fill(pal[0]);
    if (this.mode === "sega") {
      for (let cy = 0; cy < 28; cy++) for (let cx = 0; cx < 40; cx++) blitTile(this.sega.vram, readU16(this.sega.map, (cy * 64 + cx) * 2), pal, px, SCREEN_W, cx * 8, cy * 8);
    } else if (this.mode === "title") {
      this.plane(this.title.maps, 0xe000, this.hsB, pal);
      if (this.showA) this.plane((this.menu ? this.titleMenu : this.title).maps, 0xc000, this.hsA, pal);
      const s = this.ship;
      if (s) for (let i = s.sprites.length - 1; i >= 0; i--) drawObjSprite(px, SCREEN_W, SCREEN_H, this.vram, 0, s.sprites[i], s.x + s.sprites[i].x, s.y + s.sprites[i].y, pal);
    }
    ctx.putImageData(new ImageData(new Uint8ClampedArray(px.buffer.slice(0)), SCREEN_W, SCREEN_H), 0, 0);
  }
}
