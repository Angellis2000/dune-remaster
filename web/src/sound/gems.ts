/**
 * Звук MD: драйвер GEMS исполняется как в приставке — код Z80 из ROM ($002952…$0041DB) в 8 КБ ОЗУ Z80,
 * окно $8000–$FFFF в ROM по банковому регистру $6000, YM2612 на $4000–$4003, PSG на $7F11, прерывание
 * раз в кадр. Команды кладутся в очередь Z80 ($1B40, 64 байта, индекс записи — байт $0036) так же,
 * как это делает код 68000 ($0015DE: $FF и номер команды, $0015EA: байт аргумента).
 * Инициализация — как $001624: копия драйвера, сброс Z80, команда $0B с адресами четырёх банков
 * (патчи, огибающие, секвенции, сэмплы — $02DD04).
 */
import { PSG } from "./psg.ts";
import { YM2612 } from "./ym2612.ts";
import { Z80, type Z80Bus } from "./z80.ts";

export const GEMS_ROM = {
  driverStart: 0x002952,
  driverEnd: 0x0041dc,
  fifo: 0x1b40,
  writeIndex: 0x0036,
  /** индекс чтения драйвера: сколько байтов очереди он уже забрал */
  readIndex: 0x0037,
  banks: { patches: 0x0d02ae, envelopes: 0x0d0251, sequences: 0x0cf970, samples: 0x0c8160 },
} as const;

/** Команды GEMS, которые шлёт код игры. */
export const GEMS = {
  START: 0x10,
  STOP: 0x12,
  /** остановить всё ($0016A6, $02DDC6) */
  STOP_ALL: 0x16,
  INIT: 0x0b,
} as const;

const Z80_CLOCK = 3579545;
const FM_RATE = 7670453 / 144;
/** время на разбор инициализации GEMS (0,1 с) */
const BOOT_SAMPLES = 5300;
/** тактов Z80 на кадр NTSC: 262 строки по 228 */
const FRAME_CYCLES = 262 * 228;

export class SoundMachine implements Z80Bus {
  private ram = new Uint8Array(0x2000);
  private z80 = new Z80(this);
  private ym = new YM2612();
  private psg = new PSG();
  private bank = 0;
  /** отсчётов до конца инициализации драйвера и команды, ждущие её */
  private booting = 0;
  private held: number[][] = [];
  /** байты команд, ещё не поместившиеся в очередь Z80 */
  private out: number[] = [];
  /** такты ожидания шины 68000 при чтении окна ROM (в среднем 3 на обращение, как в Genesis Plus GX) */
  private waits = 0;
  private cycleDebt = 0;
  private frameCycles = 0;
  private intPending = 0;
  private prevL = 0;
  private prevR = 0;
  private curL = 0;
  private curR = 0;
  private pos = 0;
  /** общий множитель: у MD выход тихий (сверено по Genesis Plus GX), баланс FM и PSG не меняется */
  volume = 2.5;

  constructor(private rom: Uint8Array) {
    this.reset();
  }

  reset(): void {
    this.ram.fill(0);
    this.ram.set(this.rom.subarray(GEMS_ROM.driverStart, GEMS_ROM.driverEnd), 0);
    this.z80.reset();
    this.bank = 0;
    this.out = [];
    this.held = [];
    const b = GEMS_ROM.banks;
    const addr = (a: number) => [a & 0xff, (a >> 8) & 0xff, (a >> 16) & 0xff];
    // $001624: байт $FF, затем $0B (без префикса) и четыре адреса по 3 байта
    this.push(0xff);
    this.push(GEMS.INIT);
    for (const a of [b.patches, b.envelopes, b.sequences, b.samples]) for (const x of addr(a)) this.push(x);
    this.booting = BOOT_SAMPLES;
  }

  /** Байт в очередь ($0015EA). */
  private push(v: number): void {
    const i = this.ram[GEMS_ROM.writeIndex] & 0x3f;
    this.ram[GEMS_ROM.fifo + i] = v & 0xff;
    this.ram[GEMS_ROM.writeIndex] = (i + 1) & 0x3f;
  }

  /**
   * Команда с аргументами ($0015DE + $0015EA). Пока драйвер разбирает инициализацию, команды копятся:
   * в оригинале до первой команды проходят кадры.
   */
  command(cmd: number, ...args: number[]): void {
    if (this.booting > 0) {
      this.held.push([cmd, ...args]);
      return;
    }
    // очередь Z80 — кольцо из 64 байтов без защиты от переполнения: игра MD шлёт немного команд за кадр,
    // а у нас их бывает больше (звуки боя, догон кадров) — лишнее ждёт, пока драйвер освободит место
    if (this.out.length < 4096) this.out.push(0xff, cmd, ...args);
  }

  /** Переложить ждущие байты в очередь Z80, сколько влезет (одно место оставляем пустым). */
  private feed(): void {
    let free = 63 - ((this.ram[GEMS_ROM.writeIndex] - this.ram[GEMS_ROM.readIndex]) & 0x3f);
    let n = 0;
    while (n < this.out.length && free-- > 0) this.push(this.out[n++]);
    if (n) this.out.splice(0, n);
  }

  // ---------------------------------------------------------------- шина Z80
  read(addr: number): number {
    if (addr < 0x4000) return this.ram[addr & 0x1fff];
    if (addr < 0x6000) return this.ym.read();
    if (addr >= 0x8000) {
      this.waits += 3;
      const a = ((this.bank << 15) | (addr & 0x7fff)) % this.rom.length;
      return this.rom[a];
    }
    return 0xff;
  }

  write(addr: number, value: number): void {
    if (addr < 0x4000) this.ram[addr & 0x1fff] = value;
    else if (addr < 0x6000) this.ym.write(addr & 3, value);
    else if (addr < 0x6100) this.bank = ((this.bank >> 1) | ((value & 1) << 8)) & 0x1ff;
    else if (addr === 0x7f11) this.psg.write(value);
  }

  input(): number {
    return 0xff;
  }

  output(): void {}

  /** Один отсчёт синтезатора: Z80 на свою долю тактов, затем такт YM2612. */
  private nativeSample(): void {
    if (this.booting > 0 && --this.booting === 0) {
      // в оригинале при включении всегда запускается секвенция 0 (музыка заставки, $017418); без этого
      // драйвер не берёт каналы под звуки — повторяем запуск и сразу стоп
      this.command(GEMS.START, 0);
      this.command(GEMS.STOP, 0);
      for (const [cmd, ...args] of this.held) this.command(cmd, ...args);
      this.held = [];
    }
    if (this.out.length) this.feed();
    this.cycleDebt += Z80_CLOCK / FM_RATE;
    while (this.cycleDebt > 0) {
      if (this.intPending > 0) {
        const t = this.z80.interrupt();
        if (t) {
          this.intPending = 0;
          this.cycleDebt -= t;
          this.frameCycles += t;
          continue;
        }
      }
      this.waits = 0;
      const t = this.z80.step() + this.waits;
      this.cycleDebt -= t;
      this.frameCycles += t;
      if (this.intPending > 0) this.intPending -= t;
      if (this.frameCycles >= FRAME_CYCLES) {
        this.frameCycles -= FRAME_CYCLES;
        // линия INT держится около одной строки
        this.intPending = 228;
      }
    }
    this.ym.clock();
    const psg = this.psg.sample(FM_RATE) * 0.35;
    this.prevL = this.curL;
    this.prevR = this.curR;
    this.curL = (this.ym.outL / 768 + psg) * this.volume;
    this.curR = (this.ym.outR / 768 + psg) * this.volume;
  }

  /** Заполнить буферы отсчётами частоты rate. */
  render(left: Float32Array, right: Float32Array, rate: number): void {
    const step = FM_RATE / rate;
    for (let i = 0; i < left.length; i++) {
      this.pos += step;
      while (this.pos >= 1) {
        this.pos -= 1;
        this.nativeSample();
      }
      const t = this.pos;
      left[i] = Math.max(-1, Math.min(1, this.prevL + (this.curL - this.prevL) * t));
      right[i] = Math.max(-1, Math.min(1, this.prevR + (this.curR - this.prevR) * t));
    }
  }
}
