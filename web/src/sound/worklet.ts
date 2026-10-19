/**
 * AudioWorklet: звуковая часть MD (Z80 с драйвером GEMS, YM2612, PSG) в отдельном потоке.
 * Сообщения: { rom: ArrayBuffer, bank } — запуск; { bank } — смена банков с перезапуском драйвера;
 * { cmd, args } — команда GEMS; { volume } — громкость.
 */
import { GEMS, SoundMachine, type SoundBank } from "./gems.ts";

declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, ctor: unknown): void;

class GemsProcessor extends AudioWorkletProcessor {
  private machine: SoundMachine | null = null;
  private quietMachine: SoundMachine | null = null;
  private quietFrames = 0;
  private quietVolume = 1;
  private quietLeft = new Float32Array(0);
  private quietRight = new Float32Array(0);
  private pending: { cmd: number; args: number[] }[] = [];
  private rom: Uint8Array | null = null;
  private bank: SoundBank = "game";
  private volume = 2.5;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d.rom) {
        this.rom = new Uint8Array(d.rom);
        this.bank = d.bank === "intro" ? "intro" : "game";
        this.machine = new SoundMachine(this.rom, this.bank);
        this.machine.volume = this.volume;
        this.quietMachine = null;
        for (const c of this.pending) this.machine.command(c.cmd, ...c.args);
        this.pending = [];
      } else if (d.bank === "intro" || d.bank === "game") {
        this.bank = d.bank;
        if (this.rom) {
          this.machine = new SoundMachine(this.rom, this.bank);
          this.machine.volume = this.volume;
        }
        this.quietMachine = null;
        this.quietFrames = 0;
        this.pending = [];
      } else if (typeof d.quietSequence === "number") {
        if (!this.rom) return;
        this.quietMachine ??= new SoundMachine(this.rom, this.bank);
        this.quietVolume = Math.max(0, Math.min(Number(d.quietVolume) || 0, 1));
        this.quietMachine.volume = this.volume * this.quietVolume;
        this.quietMachine.command(GEMS.START, d.quietSequence);
        this.quietFrames = Math.max(this.quietFrames, Math.round(sampleRate * 1.5));
      } else if (typeof d.cmd === "number") {
        if (this.machine) this.machine.command(d.cmd, ...(d.args ?? []));
        else this.pending.push({ cmd: d.cmd, args: d.args ?? [] });
        if(d.cmd===GEMS.STOP_ALL&&this.quietMachine)this.quietMachine.command(d.cmd,...(d.args??[]));
      } else if (typeof d.volume === "number") {
        this.volume = d.volume;
        if (this.machine) this.machine.volume = d.volume;
        if (this.quietMachine) this.quietMachine.volume = d.volume * this.quietVolume;
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const out = outputs[0];
    if (!this.machine || !out.length) return true;
    this.machine.render(out[0], out[1] ?? new Float32Array(out[0].length), sampleRate);
    if (this.quietMachine && this.quietFrames > 0) {
      if(this.quietLeft.length!==out[0].length){this.quietLeft=new Float32Array(out[0].length);this.quietRight=new Float32Array(out[0].length);}
      this.quietMachine.render(this.quietLeft,this.quietRight,sampleRate);
      const right=out[1];
      for(let i=0;i<out[0].length;i++){out[0][i]+=this.quietLeft[i];if(right)right[i]+=this.quietRight[i];}
      this.quietFrames-=out[0].length;
      if(this.quietFrames<=0){this.quietMachine=null;this.quietLeft=new Float32Array(0);this.quietRight=new Float32Array(0);}
    }
    return true;
  }
}

registerProcessor("gems", GemsProcessor);
