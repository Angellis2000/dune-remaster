/**
 * AudioWorklet: звуковая часть MD (Z80 с драйвером GEMS, YM2612, PSG) в отдельном потоке.
 * Сообщения: { rom: ArrayBuffer, bank } — запуск; { bank } — смена банков с перезапуском драйвера;
 * { cmd, args } — команда GEMS; { volume } — громкость.
 */
import { SoundMachine, type SoundBank } from "./gems.ts";

declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, ctor: unknown): void;

class GemsProcessor extends AudioWorkletProcessor {
  private machine: SoundMachine | null = null;
  private pending: { cmd: number; args: number[] }[] = [];
  private rom: Uint8Array | null = null;
  private bank: SoundBank = "game";

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d.rom) {
        this.rom = new Uint8Array(d.rom);
        this.bank = d.bank === "intro" ? "intro" : "game";
        this.machine = new SoundMachine(this.rom, this.bank);
        for (const c of this.pending) this.machine.command(c.cmd, ...c.args);
        this.pending = [];
      } else if (d.bank === "intro" || d.bank === "game") {
        this.bank = d.bank;
        if (this.rom) this.machine = new SoundMachine(this.rom, this.bank);
        this.pending = [];
      } else if (typeof d.cmd === "number") {
        if (this.machine) this.machine.command(d.cmd, ...(d.args ?? []));
        else this.pending.push({ cmd: d.cmd, args: d.args ?? [] });
      } else if (typeof d.volume === "number" && this.machine) this.machine.volume = d.volume;
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const out = outputs[0];
    if (!this.machine || !out.length) return true;
    this.machine.render(out[0], out[1] ?? new Float32Array(out[0].length), sampleRate);
    return true;
  }
}

registerProcessor("gems", GemsProcessor);
