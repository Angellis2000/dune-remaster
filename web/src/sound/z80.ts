/**
 * Процессор Z80 для звукового драйвера MD (GEMS): все команды, включая префиксы CB, ED, DD, FD, DDCB/FDCB,
 * со временем в тактах (от него зависит скорость вывода сэмплов на ЦАП). Недокументированные флаги 3 и 5
 * ведутся как у настоящего Z80, где это просто.
 */
export interface Z80Bus {
  read(addr: number): number;
  write(addr: number, value: number): void;
  input(port: number): number;
  output(port: number, value: number): void;
}

const FC = 0x01;
const FN = 0x02;
const FPV = 0x04;
const F3 = 0x08;
const FH = 0x10;
const F5 = 0x20;
const FZ = 0x40;
const FS = 0x80;

const SZ = new Uint8Array(256);
const SZP = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  SZ[i] = (i & 0x80) | (i === 0 ? FZ : 0) | (i & (F3 | F5));
  let p = i;
  p ^= p >> 4;
  p ^= p >> 2;
  p ^= p >> 1;
  SZP[i] = SZ[i] | ((p & 1) === 0 ? FPV : 0);
}

/** такты основных команд (без префикса) */
const CYC = [
  4, 10, 7, 6, 4, 4, 7, 4, 4, 11, 7, 6, 4, 4, 7, 4, 8, 10, 7, 6, 4, 4, 7, 4, 12, 11, 7, 6, 4, 4, 7, 4, 7, 10, 16, 6, 4, 4, 7, 4, 7, 11, 16, 6, 4, 4, 7, 4,
  7, 10, 13, 6, 11, 11, 10, 4, 7, 11, 13, 6, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4,
  4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4, 7, 7, 7, 7, 7, 7, 4, 7, 4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4,
  4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 4, 7, 4,
  5, 10, 10, 10, 10, 11, 7, 11, 5, 10, 10, 0, 10, 17, 7, 11, 5, 10, 10, 11, 10, 11, 7, 11, 5, 4, 10, 11, 10, 0, 7, 11, 5, 10, 10, 19, 10, 11, 7, 11, 5, 4, 10, 4, 10, 0, 7, 11,
  5, 10, 10, 4, 10, 11, 7, 11, 5, 6, 10, 4, 10, 0, 7, 11,
];

export class Z80 {
  a = 0xff;
  f = 0xff;
  b = 0;
  c = 0;
  d = 0;
  e = 0;
  h = 0;
  l = 0;
  a2 = 0;
  f2 = 0;
  b2 = 0;
  c2 = 0;
  d2 = 0;
  e2 = 0;
  h2 = 0;
  l2 = 0;
  ix = 0xffff;
  iy = 0xffff;
  sp = 0xffff;
  pc = 0;
  i = 0;
  r = 0;
  iff1 = false;
  iff2 = false;
  im = 0;
  halted = false;
  /** EI действует после следующей команды */
  private eiDelay = false;

  constructor(private bus: Z80Bus) {}

  reset(): void {
    this.pc = 0;
    this.i = 0;
    this.r = 0;
    this.iff1 = this.iff2 = false;
    this.im = 0;
    this.halted = false;
    this.sp = 0xffff;
    this.a = this.f = 0xff;
  }

  // ---------------------------------------------------------------- память
  private rd(a: number): number {
    return this.bus.read(a & 0xffff);
  }
  private wr(a: number, v: number): void {
    this.bus.write(a & 0xffff, v & 0xff);
  }
  private fetch(): number {
    const v = this.rd(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    return v;
  }
  private fetch16(): number {
    const lo = this.fetch();
    return lo | (this.fetch() << 8);
  }
  private rd16(a: number): number {
    return this.rd(a) | (this.rd(a + 1) << 8);
  }
  private wr16(a: number, v: number): void {
    this.wr(a, v);
    this.wr(a + 1, v >> 8);
  }
  private push(v: number): void {
    this.sp = (this.sp - 1) & 0xffff;
    this.wr(this.sp, v >> 8);
    this.sp = (this.sp - 1) & 0xffff;
    this.wr(this.sp, v);
  }
  private pop(): number {
    const lo = this.rd(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    const hi = this.rd(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    return lo | (hi << 8);
  }
  private disp(): number {
    const d = this.fetch();
    return d < 128 ? d : d - 256;
  }

  // ---------------------------------------------------------------- пары
  get bc(): number {
    return (this.b << 8) | this.c;
  }
  set bc(v: number) {
    this.b = (v >> 8) & 0xff;
    this.c = v & 0xff;
  }
  get de(): number {
    return (this.d << 8) | this.e;
  }
  set de(v: number) {
    this.d = (v >> 8) & 0xff;
    this.e = v & 0xff;
  }
  get hl(): number {
    return (this.h << 8) | this.l;
  }
  set hl(v: number) {
    this.h = (v >> 8) & 0xff;
    this.l = v & 0xff;
  }
  get af(): number {
    return (this.a << 8) | this.f;
  }
  set af(v: number) {
    this.a = (v >> 8) & 0xff;
    this.f = v & 0xff;
  }

  // ---------------------------------------------------------------- АЛУ
  private add8(v: number, carry: number): void {
    const a = this.a;
    const r = a + v + carry;
    this.f = SZ[r & 0xff] | (r > 0xff ? FC : 0) | ((a ^ v ^ r) & FH) | (((a ^ ~v) & (a ^ r) & 0x80) !== 0 ? FPV : 0);
    this.a = r & 0xff;
  }
  private sub8(v: number, carry: number, store = true): void {
    const a = this.a;
    const r = a - v - carry;
    const res = r & 0xff;
    this.f = (SZ[res] & ~(F3 | F5)) | FN | (r < 0 ? FC : 0) | ((a ^ v ^ r) & FH) | (((a ^ v) & (a ^ r) & 0x80) !== 0 ? FPV : 0);
    if (store) {
      this.f |= res & (F3 | F5);
      this.a = res;
    } else this.f |= v & (F3 | F5);
  }
  private and8(v: number): void {
    this.a &= v;
    this.f = SZP[this.a] | FH;
  }
  private xor8(v: number): void {
    this.a = (this.a ^ v) & 0xff;
    this.f = SZP[this.a];
  }
  private or8(v: number): void {
    this.a = (this.a | v) & 0xff;
    this.f = SZP[this.a];
  }
  private alu(op: number, v: number): void {
    switch (op) {
      case 0:
        this.add8(v, 0);
        break;
      case 1:
        this.add8(v, this.f & FC);
        break;
      case 2:
        this.sub8(v, 0);
        break;
      case 3:
        this.sub8(v, this.f & FC);
        break;
      case 4:
        this.and8(v);
        break;
      case 5:
        this.xor8(v);
        break;
      case 6:
        this.or8(v);
        break;
      default:
        this.sub8(v, 0, false);
    }
  }
  private inc8(v: number): number {
    const r = (v + 1) & 0xff;
    this.f = (this.f & FC) | SZ[r] | (r === 0x80 ? FPV : 0) | ((r & 0x0f) === 0 ? FH : 0);
    return r;
  }
  private dec8(v: number): number {
    const r = (v - 1) & 0xff;
    this.f = (this.f & FC) | SZ[r] | FN | (r === 0x7f ? FPV : 0) | ((r & 0x0f) === 0x0f ? FH : 0);
    return r;
  }
  private add16(a: number, b: number): number {
    const r = a + b;
    this.f = (this.f & (FS | FZ | FPV)) | (r > 0xffff ? FC : 0) | (((a ^ b ^ r) >> 8) & FH) | ((r >> 8) & (F3 | F5));
    return r & 0xffff;
  }
  private adc16(v: number): void {
    const hl = this.hl;
    const r = hl + v + (this.f & FC);
    const res = r & 0xffff;
    this.f = ((res >> 8) & (FS | F3 | F5)) | (res === 0 ? FZ : 0) | (r > 0xffff ? FC : 0) | (((hl ^ v ^ r) >> 8) & FH) | (((hl ^ ~v) & (hl ^ r) & 0x8000) !== 0 ? FPV : 0);
    this.hl = res;
  }
  private sbc16(v: number): void {
    const hl = this.hl;
    const r = hl - v - (this.f & FC);
    const res = r & 0xffff;
    this.f = ((res >> 8) & (FS | F3 | F5)) | FN | (res === 0 ? FZ : 0) | (r < 0 ? FC : 0) | (((hl ^ v ^ r) >> 8) & FH) | (((hl ^ v) & (hl ^ r) & 0x8000) !== 0 ? FPV : 0);
    this.hl = res;
  }
  /** сдвиги CB: 0 RLC 1 RRC 2 RL 3 RR 4 SLA 5 SRA 6 SLL 7 SRL */
  private rot(op: number, v: number): number {
    let r: number;
    let c: number;
    switch (op) {
      case 0:
        c = v >> 7;
        r = ((v << 1) | c) & 0xff;
        break;
      case 1:
        c = v & 1;
        r = (v >> 1) | (c << 7);
        break;
      case 2:
        c = v >> 7;
        r = ((v << 1) | (this.f & FC)) & 0xff;
        break;
      case 3:
        c = v & 1;
        r = (v >> 1) | ((this.f & FC) << 7);
        break;
      case 4:
        c = v >> 7;
        r = (v << 1) & 0xff;
        break;
      case 5:
        c = v & 1;
        r = (v >> 1) | (v & 0x80);
        break;
      case 6:
        c = v >> 7;
        r = ((v << 1) | 1) & 0xff;
        break;
      default:
        c = v & 1;
        r = v >> 1;
    }
    this.f = SZP[r] | c;
    return r;
  }

  // ---------------------------------------------------------------- регистры по номеру
  /** r: 0 B 1 C 2 D 3 E 4 H 5 L 6 (HL) 7 A; idx — H/L из IX/IY (без (HL)) */
  private getR(r: number, idx: number): number {
    switch (r) {
      case 0:
        return this.b;
      case 1:
        return this.c;
      case 2:
        return this.d;
      case 3:
        return this.e;
      case 4:
        return idx === 1 ? this.ix >> 8 : idx === 2 ? this.iy >> 8 : this.h;
      case 5:
        return idx === 1 ? this.ix & 0xff : idx === 2 ? this.iy & 0xff : this.l;
      case 6:
        return this.rd(this.hl);
      default:
        return this.a;
    }
  }
  private setR(r: number, v: number, idx: number): void {
    v &= 0xff;
    switch (r) {
      case 0:
        this.b = v;
        break;
      case 1:
        this.c = v;
        break;
      case 2:
        this.d = v;
        break;
      case 3:
        this.e = v;
        break;
      case 4:
        if (idx === 1) this.ix = (this.ix & 0xff) | (v << 8);
        else if (idx === 2) this.iy = (this.iy & 0xff) | (v << 8);
        else this.h = v;
        break;
      case 5:
        if (idx === 1) this.ix = (this.ix & 0xff00) | v;
        else if (idx === 2) this.iy = (this.iy & 0xff00) | v;
        else this.l = v;
        break;
      case 6:
        this.wr(this.hl, v);
        break;
      default:
        this.a = v;
    }
  }
  private getRP(p: number, idx: number): number {
    switch (p) {
      case 0:
        return this.bc;
      case 1:
        return this.de;
      case 2:
        return idx === 1 ? this.ix : idx === 2 ? this.iy : this.hl;
      default:
        return this.sp;
    }
  }
  private setRP(p: number, v: number, idx: number): void {
    v &= 0xffff;
    switch (p) {
      case 0:
        this.bc = v;
        break;
      case 1:
        this.de = v;
        break;
      case 2:
        if (idx === 1) this.ix = v;
        else if (idx === 2) this.iy = v;
        else this.hl = v;
        break;
      default:
        this.sp = v;
    }
  }
  private cond(c: number): boolean {
    switch (c) {
      case 0:
        return (this.f & FZ) === 0;
      case 1:
        return (this.f & FZ) !== 0;
      case 2:
        return (this.f & FC) === 0;
      case 3:
        return (this.f & FC) !== 0;
      case 4:
        return (this.f & FPV) === 0;
      case 5:
        return (this.f & FPV) !== 0;
      case 6:
        return (this.f & FS) === 0;
      default:
        return (this.f & FS) !== 0;
    }
  }

  /** Маскируемое прерывание (на MD — режим 1, RST 38h). Возвращает такты или 0, если запрещено. */
  interrupt(): number {
    if (!this.iff1 || this.eiDelay) return 0;
    if (this.halted) {
      this.halted = false;
      this.pc = (this.pc + 1) & 0xffff;
    }
    this.iff1 = this.iff2 = false;
    this.r = (this.r & 0x80) | ((this.r + 1) & 0x7f);
    this.push(this.pc);
    if (this.im === 2) {
      this.pc = this.rd16((this.i << 8) | 0xff);
      return 19;
    }
    this.pc = 0x38;
    return 13;
  }

  /** Одна команда; возвращает такты. */
  step(): number {
    this.eiDelay = false;
    if (this.halted) return 4;
    this.r = (this.r & 0x80) | ((this.r + 1) & 0x7f);
    const op = this.fetch();
    return this.exec(op, 0);
  }

  /** idx: 0 — HL, 1 — IX, 2 — IY */
  private exec(op: number, idx: number): number {
    const extra = idx ? 4 : 0;
    // адрес (HL)/(IX+d)/(IY+d) для команд с операндом в памяти
    const memAddr = (): number => (idx === 1 ? (this.ix + this.disp()) & 0xffff : idx === 2 ? (this.iy + this.disp()) & 0xffff : this.hl);
    const x = op >> 6;
    const y = (op >> 3) & 7;
    const z = op & 7;
    if (x === 1) {
      if (op === 0x76) {
        this.halted = true;
        this.pc = (this.pc - 1) & 0xffff;
        return 4;
      }
      if (y === 6) {
        // LD (HL), r — регистр без замены на IXh/IXl
        const a = memAddr();
        this.wr(a, this.getR(z, 0));
        return idx ? 19 : 7;
      }
      if (z === 6) {
        const a = memAddr();
        this.setR(y, this.rd(a), 0);
        return idx ? 19 : 7;
      }
      this.setR(y, this.getR(z, idx), idx);
      return 4 + extra;
    }
    if (x === 2) {
      if (z === 6) {
        const a = memAddr();
        this.alu(y, this.rd(a));
        return idx ? 19 : 7;
      }
      this.alu(y, this.getR(z, idx));
      return 4 + extra;
    }
    switch (op) {
      case 0x00:
        return 4;
      case 0x01:
      case 0x11:
      case 0x21:
      case 0x31:
        this.setRP(y >> 1, this.fetch16(), idx);
        return 10 + extra;
      case 0x02:
        this.wr(this.bc, this.a);
        return 7;
      case 0x12:
        this.wr(this.de, this.a);
        return 7;
      case 0x0a:
        this.a = this.rd(this.bc);
        return 7;
      case 0x1a:
        this.a = this.rd(this.de);
        return 7;
      case 0x22:
        this.wr16(this.fetch16(), this.getRP(2, idx));
        return 16 + extra;
      case 0x2a:
        this.setRP(2, this.rd16(this.fetch16()), idx);
        return 16 + extra;
      case 0x32:
        this.wr(this.fetch16(), this.a);
        return 13;
      case 0x3a:
        this.a = this.rd(this.fetch16());
        return 13;
      case 0x03:
      case 0x13:
      case 0x23:
      case 0x33:
        this.setRP(y >> 1, this.getRP(y >> 1, idx) + 1, idx);
        return 6 + extra;
      case 0x0b:
      case 0x1b:
      case 0x2b:
      case 0x3b:
        this.setRP(y >> 1, this.getRP(y >> 1, idx) - 1, idx);
        return 6 + extra;
      case 0x09:
      case 0x19:
      case 0x29:
      case 0x39:
        this.setRP(2, this.add16(this.getRP(2, idx), this.getRP(y >> 1, idx)), idx);
        return 11 + extra;
      case 0x04:
      case 0x0c:
      case 0x14:
      case 0x1c:
      case 0x24:
      case 0x2c:
      case 0x3c:
        this.setR(y, this.inc8(this.getR(y, idx)), idx);
        return 4 + extra;
      case 0x05:
      case 0x0d:
      case 0x15:
      case 0x1d:
      case 0x25:
      case 0x2d:
      case 0x3d:
        this.setR(y, this.dec8(this.getR(y, idx)), idx);
        return 4 + extra;
      case 0x34: {
        const a = memAddr();
        this.wr(a, this.inc8(this.rd(a)));
        return idx ? 23 : 11;
      }
      case 0x35: {
        const a = memAddr();
        this.wr(a, this.dec8(this.rd(a)));
        return idx ? 23 : 11;
      }
      case 0x06:
      case 0x0e:
      case 0x16:
      case 0x1e:
      case 0x26:
      case 0x2e:
      case 0x3e:
        this.setR(y, this.fetch(), idx);
        return 7 + extra;
      case 0x36: {
        const a = memAddr();
        this.wr(a, this.fetch());
        return idx ? 19 : 10;
      }
      case 0x07: {
        const c = this.a >> 7;
        this.a = ((this.a << 1) | c) & 0xff;
        this.f = (this.f & (FS | FZ | FPV)) | c | (this.a & (F3 | F5));
        return 4;
      }
      case 0x0f: {
        const c = this.a & 1;
        this.a = (this.a >> 1) | (c << 7);
        this.f = (this.f & (FS | FZ | FPV)) | c | (this.a & (F3 | F5));
        return 4;
      }
      case 0x17: {
        const c = this.a >> 7;
        this.a = ((this.a << 1) | (this.f & FC)) & 0xff;
        this.f = (this.f & (FS | FZ | FPV)) | c | (this.a & (F3 | F5));
        return 4;
      }
      case 0x1f: {
        const c = this.a & 1;
        this.a = (this.a >> 1) | ((this.f & FC) << 7);
        this.f = (this.f & (FS | FZ | FPV)) | c | (this.a & (F3 | F5));
        return 4;
      }
      case 0x08: {
        let t = this.a;
        this.a = this.a2;
        this.a2 = t;
        t = this.f;
        this.f = this.f2;
        this.f2 = t;
        return 4;
      }
      case 0x10: {
        const d = this.disp();
        this.b = (this.b - 1) & 0xff;
        if (this.b) {
          this.pc = (this.pc + d) & 0xffff;
          return 13;
        }
        return 8;
      }
      case 0x18: {
        const d = this.disp();
        this.pc = (this.pc + d) & 0xffff;
        return 12;
      }
      case 0x20:
      case 0x28:
      case 0x30:
      case 0x38: {
        const d = this.disp();
        if (this.cond(y - 4)) {
          this.pc = (this.pc + d) & 0xffff;
          return 12;
        }
        return 7;
      }
      case 0x27: {
        // DAA
        let a = this.a;
        let corr = 0;
        let carry = this.f & FC;
        if (this.f & FH || (a & 0x0f) > 9) corr |= 0x06;
        if (carry || a > 0x99) {
          corr |= 0x60;
          carry = FC;
        }
        if (this.f & FN) {
          const h = this.f & FH && (a & 0x0f) < 6 ? FH : 0;
          a = (a - corr) & 0xff;
          this.f = SZP[a] | FN | carry | h;
        } else {
          const h = (a & 0x0f) > 9 ? FH : 0;
          a = (a + corr) & 0xff;
          this.f = SZP[a] | carry | h;
        }
        this.a = a;
        return 4;
      }
      case 0x2f:
        this.a ^= 0xff;
        this.f = (this.f & (FS | FZ | FPV | FC)) | FH | FN | (this.a & (F3 | F5));
        return 4;
      case 0x37:
        this.f = (this.f & (FS | FZ | FPV)) | FC | (this.a & (F3 | F5));
        return 4;
      case 0x3f:
        this.f = ((this.f & (FS | FZ | FPV | FC)) | ((this.f & FC) << 4) | (this.a & (F3 | F5))) ^ FC;
        return 4;
      // ------------------------------------------------ x = 3
      case 0xc0:
      case 0xc8:
      case 0xd0:
      case 0xd8:
      case 0xe0:
      case 0xe8:
      case 0xf0:
      case 0xf8:
        if (this.cond(y)) {
          this.pc = this.pop();
          return 11;
        }
        return 5;
      case 0xc1:
      case 0xd1:
      case 0xe1:
        this.setRP(y >> 1, this.pop(), idx);
        return 10 + extra;
      case 0xf1:
        this.af = this.pop();
        return 10;
      case 0xc9:
        this.pc = this.pop();
        return 10;
      case 0xd9: {
        let t = this.b;
        this.b = this.b2;
        this.b2 = t;
        t = this.c;
        this.c = this.c2;
        this.c2 = t;
        t = this.d;
        this.d = this.d2;
        this.d2 = t;
        t = this.e;
        this.e = this.e2;
        this.e2 = t;
        t = this.h;
        this.h = this.h2;
        this.h2 = t;
        t = this.l;
        this.l = this.l2;
        this.l2 = t;
        return 4;
      }
      case 0xe9:
        this.pc = this.getRP(2, idx);
        return 4 + extra;
      case 0xf9:
        this.sp = this.getRP(2, idx);
        return 6 + extra;
      case 0xc2:
      case 0xca:
      case 0xd2:
      case 0xda:
      case 0xe2:
      case 0xea:
      case 0xf2:
      case 0xfa: {
        const a = this.fetch16();
        if (this.cond(y)) this.pc = a;
        return 10;
      }
      case 0xc3:
        this.pc = this.fetch16();
        return 10;
      case 0xcb:
        return this.execCB(idx);
      case 0xd3:
        this.bus.output((this.a << 8) | this.fetch(), this.a);
        return 11;
      case 0xdb:
        this.a = this.bus.input((this.a << 8) | this.fetch());
        return 11;
      case 0xe3: {
        const v = this.rd16(this.sp);
        this.wr16(this.sp, this.getRP(2, idx));
        this.setRP(2, v, idx);
        return 19 + extra;
      }
      case 0xeb: {
        const t = this.de;
        this.de = this.hl;
        this.hl = t;
        return 4;
      }
      case 0xf3:
        this.iff1 = this.iff2 = false;
        return 4;
      case 0xfb:
        this.iff1 = this.iff2 = true;
        this.eiDelay = true;
        return 4;
      case 0xc4:
      case 0xcc:
      case 0xd4:
      case 0xdc:
      case 0xe4:
      case 0xec:
      case 0xf4:
      case 0xfc: {
        const a = this.fetch16();
        if (this.cond(y)) {
          this.push(this.pc);
          this.pc = a;
          return 17;
        }
        return 10;
      }
      case 0xc5:
      case 0xd5:
      case 0xe5:
        this.push(this.getRP(y >> 1, idx));
        return 11 + extra;
      case 0xf5:
        this.push(this.af);
        return 11;
      case 0xcd: {
        const a = this.fetch16();
        this.push(this.pc);
        this.pc = a;
        return 17;
      }
      case 0xdd:
        this.r = (this.r & 0x80) | ((this.r + 1) & 0x7f);
        return this.exec(this.fetch(), 1);
      case 0xfd:
        this.r = (this.r & 0x80) | ((this.r + 1) & 0x7f);
        return this.exec(this.fetch(), 2);
      case 0xed:
        this.r = (this.r & 0x80) | ((this.r + 1) & 0x7f);
        return this.execED();
      case 0xc6:
      case 0xce:
      case 0xd6:
      case 0xde:
      case 0xe6:
      case 0xee:
      case 0xf6:
      case 0xfe:
        this.alu(y, this.fetch());
        return 7;
      default:
        // RST
        this.push(this.pc);
        this.pc = y * 8;
        return 11;
    }
  }

  private execCB(idx: number): number {
    let addr = this.hl;
    if (idx) {
      // DDCB d op
      addr = ((idx === 1 ? this.ix : this.iy) + this.disp()) & 0xffff;
    }
    const op = this.fetch();
    if (!idx) this.r = (this.r & 0x80) | ((this.r + 1) & 0x7f);
    const x = op >> 6;
    const y = (op >> 3) & 7;
    const z = op & 7;
    const mem = idx !== 0 || z === 6;
    const v = mem ? this.rd(addr) : this.getR(z, 0);
    let r: number;
    switch (x) {
      case 0:
        r = this.rot(y, v);
        break;
      case 1: {
        const bit = v & (1 << y);
        this.f = (this.f & FC) | FH | (bit ? 0 : FZ | FPV) | (y === 7 && bit ? FS : 0) | ((mem ? addr >> 8 : v) & (F3 | F5));
        return idx ? 20 : z === 6 ? 12 : 8;
      }
      case 2:
        r = v & ~(1 << y);
        break;
      default:
        r = v | (1 << y);
    }
    if (mem) {
      this.wr(addr, r);
      if (idx && z !== 6) this.setR(z, r, 0);
      return idx ? 23 : 15;
    }
    this.setR(z, r, 0);
    return 8;
  }

  private execED(): number {
    const op = this.fetch();
    const x = op >> 6;
    const y = (op >> 3) & 7;
    const z = op & 7;
    if (x === 1) {
      switch (z) {
        case 0: {
          const v = this.bus.input(this.bc);
          if (y !== 6) this.setR(y, v, 0);
          this.f = (this.f & FC) | SZP[v];
          return 12;
        }
        case 1:
          this.bus.output(this.bc, y === 6 ? 0 : this.getR(y, 0));
          return 12;
        case 2:
          if (y & 1) this.adc16(this.getRP(y >> 1, 0));
          else this.sbc16(this.getRP(y >> 1, 0));
          return 15;
        case 3: {
          const a = this.fetch16();
          if (y & 1) this.setRP(y >> 1, this.rd16(a), 0);
          else this.wr16(a, this.getRP(y >> 1, 0));
          return 20;
        }
        case 4: {
          const v = this.a;
          this.a = 0;
          this.sub8(v, 0);
          return 8;
        }
        case 5:
          this.pc = this.pop();
          this.iff1 = this.iff2;
          return 14;
        case 6:
          this.im = [0, 0, 1, 2, 0, 0, 1, 2][y];
          return 8;
        default:
          switch (y) {
            case 0:
              this.i = this.a;
              return 9;
            case 1:
              this.r = this.a;
              return 9;
            case 2:
              this.a = this.i;
              this.f = (this.f & FC) | SZ[this.a] | (this.iff2 ? FPV : 0);
              return 9;
            case 3:
              this.a = this.r;
              this.f = (this.f & FC) | SZ[this.a] | (this.iff2 ? FPV : 0);
              return 9;
            case 4: {
              // RRD
              const m = this.rd(this.hl);
              this.wr(this.hl, ((this.a << 4) | (m >> 4)) & 0xff);
              this.a = (this.a & 0xf0) | (m & 0x0f);
              this.f = (this.f & FC) | SZP[this.a];
              return 18;
            }
            case 5: {
              // RLD
              const m = this.rd(this.hl);
              this.wr(this.hl, ((m << 4) | (this.a & 0x0f)) & 0xff);
              this.a = (this.a & 0xf0) | (m >> 4);
              this.f = (this.f & FC) | SZP[this.a];
              return 18;
            }
            default:
              return 8;
          }
      }
    }
    if (x === 2 && y >= 4 && z <= 3) return this.block(y, z);
    return 8;
  }

  /** Блочные команды LDI/CPI/INI/OUTI и их повторы. */
  private block(y: number, z: number): number {
    const dec = y & 1;
    const rep = y >= 6;
    const step = dec ? -1 : 1;
    switch (z) {
      case 0: {
        // LDI/LDD/LDIR/LDDR
        const v = this.rd(this.hl);
        this.wr(this.de, v);
        this.hl = (this.hl + step) & 0xffff;
        this.de = (this.de + step) & 0xffff;
        this.bc = (this.bc - 1) & 0xffff;
        const n = (v + this.a) & 0xff;
        this.f = (this.f & (FS | FZ | FC)) | (this.bc ? FPV : 0) | (n & F3) | ((n << 4) & F5);
        if (rep && this.bc) {
          this.pc = (this.pc - 2) & 0xffff;
          return 21;
        }
        return 16;
      }
      case 1: {
        // CPI/CPD/CPIR/CPDR
        const v = this.rd(this.hl);
        const r = (this.a - v) & 0xff;
        this.hl = (this.hl + step) & 0xffff;
        this.bc = (this.bc - 1) & 0xffff;
        const h = (this.a ^ v ^ r) & FH;
        this.f = (this.f & FC) | (SZ[r] & ~(F3 | F5)) | FN | h | (this.bc ? FPV : 0);
        if (rep && this.bc && r !== 0) {
          this.pc = (this.pc - 2) & 0xffff;
          return 21;
        }
        return 16;
      }
      case 2: {
        const v = this.bus.input(this.bc);
        this.wr(this.hl, v);
        this.hl = (this.hl + step) & 0xffff;
        this.b = (this.b - 1) & 0xff;
        this.f = SZ[this.b] | FN;
        if (rep && this.b) {
          this.pc = (this.pc - 2) & 0xffff;
          return 21;
        }
        return 16;
      }
      default: {
        const v = this.rd(this.hl);
        this.b = (this.b - 1) & 0xff;
        this.bus.output(this.bc, v);
        this.hl = (this.hl + step) & 0xffff;
        this.f = SZ[this.b] | FN;
        if (rep && this.b) {
          this.pc = (this.pc - 2) & 0xffff;
          return 21;
        }
        return 16;
      }
    }
  }
}

/** Такты основных команд — для проверок. */
export const Z80_BASE_CYCLES = CYC;
