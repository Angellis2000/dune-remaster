/**
 * Синтезатор YM2612 (OPN2) Mega Drive: 6 каналов по 4 оператора, 8 алгоритмов, обратная связь,
 * генератор огибающей с масштабированием по ноте, расстройка и множитель, LFO (AM/PM), особый режим
 * 3-го канала, ЦАП 6-го канала, таймеры A и B со флагами состояния (по ним GEMS отсчитывает темп).
 * Внутренняя частота — такт / 144 (53 267 Гц при 7 670 453 Гц); выход каждого канала — 14 бит,
 * на выходе микросхемы — 9 бит.
 * Таблицы и порядок вычислений — по описаниям железа (лог-синус и экспонента, приращения огибающей,
 * таблица расстройки).
 */

const SIN_TABLE = new Uint16Array(256);
const POW_TABLE = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  SIN_TABLE[i] = Math.round(-Math.log2(Math.sin(((2 * i + 1) * Math.PI) / 1024)) * 256);
  POW_TABLE[i] = Math.round(Math.pow(2, -(i + 1) / 256) * 2048);
}

/** |sin| в лог-форме (4.8) по 10-битной фазе, бит 15 — знак. */
function sinAttenuation(phase: number): number {
  let idx = phase & 0xff;
  if (phase & 0x100) idx ^= 0xff;
  return SIN_TABLE[idx] | (phase & 0x200 ? 0x8000 : 0);
}

/** Затухание 4.8 → громкость 13 бит. */
function attToVolume(att: number): number {
  if (att >= 0x1a00) return 0;
  return (POW_TABLE[att & 0xff] << 2) >> (att >> 8);
}

const DETUNE = [
  [0, 0, 1, 2], [0, 0, 1, 2], [0, 0, 1, 2], [0, 0, 1, 2], [0, 1, 2, 2], [0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3],
  [0, 1, 2, 4], [0, 1, 3, 4], [0, 1, 3, 4], [0, 1, 3, 5], [0, 2, 4, 5], [0, 2, 4, 6], [0, 2, 4, 6], [0, 2, 5, 7],
  [0, 2, 5, 8], [0, 3, 6, 8], [0, 3, 6, 9], [0, 3, 7, 10], [0, 4, 8, 11], [0, 4, 8, 12], [0, 4, 9, 13], [0, 5, 10, 14],
  [0, 5, 11, 16], [0, 6, 12, 17], [0, 6, 13, 19], [0, 7, 14, 20], [0, 8, 16, 22], [0, 8, 16, 22], [0, 8, 16, 22], [0, 8, 16, 22],
];

/** приращения огибающей: 64 скорости × 8 шагов (по 4 бита) */
const INC_TABLE = (() => {
  const rows = [0x10101010, 0x10111010, 0x11101110, 0x11111110];
  const t = new Uint32Array(64);
  t[0] = t[1] = 0;
  t[2] = t[3] = t[4] = t[5] = 0x10101010;
  t[6] = t[7] = 0x11101110;
  for (let r = 8; r < 48; r++) t[r] = rows[r & 3];
  const tail = [0x11111111, 0x21112111, 0x21212121, 0x22212221, 0x22222222, 0x42224222, 0x42424242, 0x44424442, 0x44444444, 0x84448444, 0x84848484, 0x88848884, 0x88888888, 0x88888888, 0x88888888, 0x88888888];
  for (let r = 48; r < 64; r++) t[r] = tail[r - 48];
  return t;
})();

/** операторы, входы и выходы алгоритмов: op2in | op3in<<1 | op4in<<4 | op1out<<7 | op2out<<8 | op3out<<9 */
const alg = (o2: number, o3: number, o4: number, out1: number, out2: number, out3: number) => o2 | (o3 << 1) | (o4 << 4) | (out1 << 7) | (out2 << 8) | (out3 << 9);
const ALGORITHMS = [alg(1, 2, 3, 0, 0, 0), alg(0, 5, 3, 0, 0, 0), alg(0, 2, 6, 0, 0, 0), alg(1, 0, 7, 0, 0, 0), alg(1, 0, 3, 0, 1, 0), alg(1, 1, 1, 0, 1, 1), alg(1, 0, 0, 0, 1, 1), alg(0, 0, 0, 1, 1, 1)];

const LFO_MAX = [109, 78, 72, 68, 63, 45, 9, 6];
const AM_SHIFT = [8, 3, 1, 0];

const EG_ATTACK = 0;
const EG_DECAY = 1;
const EG_SUSTAIN = 2;
const EG_RELEASE = 3;

class Operator {
  dt = 0;
  mul = 1;
  tl = 0;
  ks = 0;
  ar = 0;
  am = false;
  d1r = 0;
  d2r = 0;
  sl = 0;
  rr = 0;
  phase = 0;
  att = 0x3ff;
  state = EG_RELEASE;
  keyOn = false;
  /** частота оператора (для 3-го канала в особом режиме) */
  blockFreq = 0;
  /** кэш на ноту */
  step = 0;
  rates = [0, 0, 0, 0];
  sustain = 0;

  update(blockFreq: number, pmOffset: number): void {
    const keycode = opnKeycode(blockFreq);
    // F-num в 12-битном виде (×2), как у OPN
    const fnum = (((blockFreq & 0x7ff) << 1) + pmOffset) & 0xfff;
    const block = (blockFreq >> 11) & 7;
    let step = (fnum << block) >> 2;
    const d = DETUNE[keycode][this.dt & 3];
    step += this.dt & 4 ? -d : d;
    step &= 0x1ffff;
    this.step = (step * (this.mul ? this.mul * 2 : 1)) >> 1;
    const ksr = keycode >> (this.ks ^ 3);
    const eff = (raw: number) => (raw === 0 ? 0 : Math.min(63, raw + ksr));
    this.rates[EG_ATTACK] = eff(this.ar * 2);
    this.rates[EG_DECAY] = eff(this.d1r * 2);
    this.rates[EG_SUSTAIN] = eff(this.d2r * 2);
    this.rates[EG_RELEASE] = eff(this.rr * 4 + 2);
    this.sustain = (this.sl === 15 ? 31 : this.sl) << 5;
  }

  keyOnOff(on: boolean): void {
    if (on === this.keyOn) return;
    this.keyOn = on;
    if (on) {
      this.phase = 0;
      this.state = EG_ATTACK;
      if (this.rates[EG_ATTACK] >= 62) this.att = 0;
    } else this.state = EG_RELEASE;
  }

  clockEnvelope(counter: number): void {
    if (this.state === EG_ATTACK && this.att === 0) this.state = EG_DECAY;
    if (this.state === EG_DECAY && this.att >= this.sustain) this.state = EG_SUSTAIN;
    const rate = this.rates[this.state];
    const shift = rate >> 2;
    const c = counter << shift;
    if ((c & 0x7ff) !== 0) return;
    const bits = (c >>> (shift <= 11 ? 11 : shift)) & 7;
    const inc = (INC_TABLE[rate] >>> (4 * bits)) & 0xf;
    if (this.state === EG_ATTACK) {
      if (rate < 62) this.att += (~this.att * inc) >> 4;
    } else {
      this.att += inc;
      if (this.att >= 0x400) this.att = 0x3ff;
    }
  }

  volume(phase: number, amOffset: number): number {
    let env = this.att + (this.am ? amOffset : 0) + (this.tl << 3);
    if (env > 0x3ff) env = 0x3ff;
    const s = sinAttenuation(phase & 0x3ff);
    const v = attToVolume((s & 0x7fff) + (env << 2));
    return s & 0x8000 ? -v : v;
  }
}

function opnKeycode(blockFreq: number): number {
  const fnum = blockFreq & 0x7ff;
  const f11 = (fnum >> 10) & 1;
  const f10 = (fnum >> 9) & 1;
  const f9 = (fnum >> 8) & 1;
  const f8 = (fnum >> 7) & 1;
  const n3 = (f11 & (f10 | f9 | f8)) | (~f11 & f10 & f9 & f8 & 1);
  return (((blockFreq >> 11) & 7) << 2) | (f11 << 1) | (n3 & 1);
}

class Channel {
  /** операторы в порядке 1, 2, 3, 4 */
  ops = [new Operator(), new Operator(), new Operator(), new Operator()];
  blockFreq = 0;
  latch = 0;
  fb = 0;
  alg = 0;
  left = true;
  right = true;
  ams = 0;
  pms = 0;
  fbIn = [0, 0];
  out = 0;
}

export class YM2612 {
  private ch = Array.from({ length: 6 }, () => new Channel());
  private addr = [0, 0];
  private ch3mode = 0;
  private ch3freq = [0, 0, 0];
  private ch3latch = 0;
  private lfoOn = false;
  private lfoRate = 0;
  private lfoCounter = 0;
  private lfoAm = 0;
  private egCounter = 0;
  private egDiv = 0;
  private dac = 0x80;
  private dacOn = false;
  // таймеры
  private timerA = 0;
  private timerB = 0;
  private counterA = 0;
  private counterB = 0;
  private subB = 0;
  private timerCtl = 0;
  status = 0;
  /** выход последнего такта, левый и правый (9-битные суммы) */
  outL = 0;
  outR = 0;

  write(port: number, value: number): void {
    value &= 0xff;
    if ((port & 1) === 0) {
      this.addr[port >> 1] = value;
      return;
    }
    const part = port >> 1;
    const reg = this.addr[part];
    if (part === 0 && reg < 0x30) {
      this.writeGlobal(reg, value);
      return;
    }
    if (reg < 0x30) return;
    const chi = reg & 3;
    if (chi === 3) return;
    const c = this.ch[chi + part * 3];
    if (reg < 0xa0) {
      // оператор: смещения 0, 4, 8, 12 → операторы 1, 3, 2, 4
      const slot = [0, 2, 1, 3][(reg >> 2) & 3];
      const op = c.ops[slot];
      switch (reg & 0xf0) {
        case 0x30:
          op.dt = (value >> 4) & 7;
          op.mul = value & 15;
          break;
        case 0x40:
          op.tl = value & 0x7f;
          break;
        case 0x50:
          op.ks = value >> 6;
          op.ar = value & 31;
          break;
        case 0x60:
          op.am = (value & 0x80) !== 0;
          op.d1r = value & 31;
          break;
        case 0x70:
          op.d2r = value & 31;
          break;
        case 0x80:
          op.sl = value >> 4;
          op.rr = value & 15;
          break;
        default:
          break; // SSG-EG не поддержан
      }
      return;
    }
    switch (reg & 0xfc) {
      case 0xa0:
        c.blockFreq = (c.latch << 8) | value;
        break;
      case 0xa4:
        c.latch = value & 0x3f;
        break;
      case 0xa8:
        if (part === 0) this.ch3freq[[1, 2, 0][chi]] = (this.ch3latch << 8) | value;
        break;
      case 0xac:
        if (part === 0) this.ch3latch = value & 0x3f;
        break;
      case 0xb0:
        c.fb = (value >> 3) & 7;
        c.alg = value & 7;
        break;
      case 0xb4:
        c.left = (value & 0x80) !== 0;
        c.right = (value & 0x40) !== 0;
        c.ams = (value >> 4) & 3;
        c.pms = value & 7;
        break;
    }
  }

  private writeGlobal(reg: number, value: number): void {
    switch (reg) {
      case 0x22:
        this.lfoOn = (value & 8) !== 0;
        this.lfoRate = value & 7;
        break;
      case 0x24:
        this.timerA = (this.timerA & 3) | (value << 2);
        break;
      case 0x25:
        this.timerA = (this.timerA & 0x3fc) | (value & 3);
        break;
      case 0x26:
        this.timerB = value;
        break;
      case 0x27: {
        // загрузка таймеров при включении
        if (value & 1 && !(this.timerCtl & 1)) this.counterA = this.timerA;
        if (value & 2 && !(this.timerCtl & 2)) {
          this.counterB = this.timerB;
          this.subB = 0;
        }
        if (value & 0x10) this.status &= ~1;
        if (value & 0x20) this.status &= ~2;
        this.timerCtl = value;
        this.ch3mode = value >> 6;
        break;
      }
      case 0x28: {
        const n = value & 7;
        if ((n & 3) === 3) return;
        const c = this.ch[(n & 3) + (n & 4 ? 3 : 0)];
        for (let i = 0; i < 4; i++) c.ops[i].keyOnOff((value & (0x10 << i)) !== 0);
        break;
      }
      case 0x2a:
        this.dac = value;
        break;
      case 0x2b:
        this.dacOn = (value & 0x80) !== 0;
        break;
    }
  }

  read(): number {
    return this.status;
  }

  /** Таймеры: A — раз в такт, B — раз в 16 тактов. */
  private clockTimers(): void {
    if (this.timerCtl & 1) {
      if (++this.counterA >= 1024) {
        this.counterA = this.timerA;
        if (this.timerCtl & 4) this.status |= 1;
      }
    }
    if (this.timerCtl & 2) {
      if (++this.subB >= 16) {
        this.subB = 0;
        if (++this.counterB >= 256) {
          this.counterB = this.timerB;
          if (this.timerCtl & 8) this.status |= 2;
        }
      }
    }
  }

  private clockLfo(): number {
    if (!this.lfoOn) {
      this.lfoCounter = 0;
      this.lfoAm = 0;
      return 0;
    }
    const sub = this.lfoCounter & 0xff;
    this.lfoCounter++;
    if (sub >= LFO_MAX[this.lfoRate]) this.lfoCounter += sub ^ 0xff;
    this.lfoCounter &= 0xffff;
    this.lfoAm = (this.lfoCounter >> 8) & 0x3f;
    if (((this.lfoCounter >> 14) & 1) === 0) this.lfoAm ^= 0x3f;
    return (this.lfoCounter >> 10) & 0x1f;
  }

  /** Сдвиг F-num от PM: приближение таблицы OPN (по старшим битам F-num и глубине). */
  private pmOffset(blockFreq: number, pms: number, lfoPm: number): number {
    if (!pms || !this.lfoOn) return 0;
    const depth = [0, 3.4, 6.7, 10, 14, 20, 40, 80][pms];
    const fnum = blockFreq & 0x7ff;
    // треугольная волна по 5-битному значению
    const q = lfoPm & 0x1f;
    const tri = q < 8 ? q : q < 16 ? 16 - q : q < 24 ? -(q - 16) : -(32 - q);
    // глубина в центах: Δf/f ≈ центы / 1731, волна ±8
    return Math.trunc((fnum * depth * tri) / (8 * 1731));
  }

  /** Один такт синтезатора (1/53 267 с). */
  clock(): void {
    this.clockTimers();
    const lfoPm = this.clockLfo();
    if (++this.egDiv >= 3) {
      this.egDiv = 0;
      this.egCounter = (this.egCounter + 1) & 0x3fff;
      for (const c of this.ch) for (const op of c.ops) op.clockEnvelope(this.egCounter);
    }
    let l = 0;
    let r = 0;
    for (let i = 0; i < 6; i++) {
      const c = this.ch[i];
      // частоты: у 3-го канала в особом режиме — свои у операторов 1–3
      for (let k = 0; k < 4; k++) {
        const bf = i === 2 && this.ch3mode && k < 3 ? this.ch3freq[k] : c.blockFreq;
        c.ops[k].update(bf, this.pmOffset(bf, c.pms, lfoPm));
      }
      const am = (this.lfoAm << 1) >> AM_SHIFT[c.ams];
      let out: number;
      if (i === 5 && this.dacOn) out = (this.dac - 0x80) << 6;
      else out = this.channelOutput(c, am);
      for (const op of c.ops) op.phase = (op.phase + op.step) >>> 0;
      // 14 бит → 9 бит
      const v = out >> 5;
      if (c.left) l += v;
      if (c.right) r += v;
    }
    this.outL = l;
    this.outR = r;
  }

  private channelOutput(c: Channel, am: number): number {
    const ops = c.ops;
    const algo = ALGORITHMS[c.alg];
    const ph = (op: Operator) => op.phase >>> 10;
    let mod = 0;
    if (c.fb) mod = (c.fbIn[0] + c.fbIn[1]) >> (10 - c.fb);
    const v1 = ops[0].volume(ph(ops[0]) + mod, am);
    c.fbIn[0] = c.fbIn[1];
    c.fbIn[1] = v1;
    const o = [0, v1, 0, 0, 0, 0, 0, 0];
    o[2] = ops[1].volume(ph(ops[1]) + (o[algo & 1] >> 1), am);
    o[5] = o[1] + o[2];
    o[3] = ops[2].volume(ph(ops[2]) + (o[(algo >> 1) & 7] >> 1), am);
    o[6] = o[1] + o[3];
    o[7] = o[2] + o[3];
    let res = ops[3].volume(ph(ops[3]) + (o[(algo >> 4) & 7] >> 1), am);
    const clip = (v: number) => Math.max(-8192, Math.min(8191, v));
    if (algo & 0x80) res = clip(res + o[1]);
    if (algo & 0x100) res = clip(res + o[2]);
    if (algo & 0x200) res = clip(res + o[3]);
    return res;
  }
}
