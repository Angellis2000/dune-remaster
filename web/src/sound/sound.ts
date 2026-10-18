/**
 * Звук и музыка как в оригинале MD: команды драйверу GEMS (sound/gems.ts в AudioWorklet) и перенос
 * обёрток 68000:
 * - $002DD26 play: звуки 20…59 откладываются до следующего кадра (не больше одного за кадр, $00182E),
 *   остальные — сразу (таблица $02DD5C);
 * - $00A7DC sfx: звук по номеру Westwood (таблица $06A87E, до $40);
 * - $00A80A music: мелодия по номеру (таблица $06A8C0: секвенция и длительность); 8–12 — боевые,
 *   повтор прошлой заменяется случайной ($00A848);
 * - $00A8E2 feedback: голос/сигнал (таблица $06A95C, до $5E), прошлый останавливается;
 * - $02DDB6 ui: звук интерфейса сразу, если звуки включены.
 * Музыка и звуки выключаются в настройках ($FFDC50, $FFDC51).
 */
import workletUrl from "./worklet.ts?worker&url";
import { GEMS, type SoundBank } from "./gems.ts";
import type { DuneRom } from "../rom/dune.ts";
import { readU16 } from "../rom/md.ts";

export const SOUND_ROM = {
  immediate: 0x02dd5c,
  sfx: 0x06a87e,
  music: 0x06a8c0,
  voice: 0x06a95c,
} as const;

/** Номера мелодий $00A80A. */
export const MUSIC = {
  STOP: 0,
  /** боевые: случайная из 8…12 ($021574) */
  BATTLE_FIRST: 8,
  HOUSE_SELECT: 0x1c,
  /** ментат: по дому — Харконнены $18, Атрейдесы $19, Ордосы $1A ($01F366) */
  MENTAT: [0x18, 0x19, 0x1a],
  ACCEPT: 0x1d,
  /** победа по дому игрока и поражение ($026952, $026B56) */
  WIN: [6, 7, 5],
  LOSE: [3, 4, 2],
} as const;

export class Sound {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private queue: { cmd: number; args: number[]; at: number }[] = [];
  private starting = false;
  musicOn = true;
  soundOn = true;
  /** $FFC8BC — текущая секвенция мелодии, $FFC8B4 — голоса, $FFC8B8 — последняя боевая */
  private music: number | null = null;
  private preview: number | null = null;
  private musicPaused = false;
  private currentBank: SoundBank = "game";
  private voice = -1;
  private lastBattle = -1;
  /** $FFC574 — сколько кадров ещё играть боевой мелодии (<0 — сменить в основном цикле или при выходе из окна). */
  battleLeft = -1;
  /** звук, отложенный до кадра ($F800) */
  private deferred: number[] = [];
  /** последний звук меню «НАСТРОЙКИ» (d5 в $020E00): перед новым он останавливается */
  private lastUi = -1;

  constructor(private rom: DuneRom) {}

  /** Запуск по первому действию игрока (браузер не даёт звук без него). */
  async start(): Promise<void> {
    if (this.ctx || this.starting) {
      if (this.ctx?.state === "suspended") await this.ctx.resume();
      return;
    }
    this.starting = true;
    try {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      await ctx.audioWorklet.addModule(workletUrl);
      const node = new AudioWorkletNode(ctx, "gems", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
      node.connect(ctx.destination);
      this.analyser = ctx.createAnalyser();
      node.connect(this.analyser);
      node.port.postMessage({ rom: this.rom.bytes.slice().buffer, bank: this.currentBank });
      const song = this.audibleMusic();
      for (const c of this.queue) {
        // Короткие эффекты до разрешения AudioContext уже прошли; музыка должна быть текущей.
        if (performance.now() - c.at <= 250 && !(c.cmd === GEMS.START && c.args[0] === song)) node.port.postMessage(c);
      }
      this.queue = [];
      this.ctx = ctx;
      this.node = node;
      if (song !== null) this.startSong(song);
      if (ctx.state === "suspended") await ctx.resume();
    } catch (e) {
      console.warn("звук недоступен", e);
    } finally {
      this.starting = false;
    }
  }

  /** Для автотестов: пик выхода за последний кадр анализатора. */
  peak(): number {
    if (!this.analyser) return 0;
    const d = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(d);
    let p = 0;
    for (const v of d) p = Math.max(p, Math.abs(v));
    return p;
  }

  get running(): boolean {
    return this.ctx?.state === "running";
  }

  get bank(): SoundBank { return this.currentBank; }

  /** $02DCF0 / $02DCA0: драйвер перезагружается с банками заставки или игры. */
  useBank(bank: SoundBank): void {
    if (bank === this.currentBank) return;
    this.currentBank = bank;
    this.music = this.preview = null;
    this.musicPaused = false;
    this.voice = this.lastUi = -1;
    this.battleLeft = -1;
    this.queue = [];
    this.deferred = [];
    this.node?.port.postMessage({ bank });
  }

  private audibleMusic(): number | null {
    if (!this.musicOn) return null;
    return this.preview ?? (this.musicPaused ? null : this.music);
  }

  /** Команда GEMS. */
  command(cmd: number, ...args: number[]): void {
    const m = { cmd, args };
    if (this.node) this.node.port.postMessage(m);
    else {
      if (this.queue.length >= 64) this.queue.shift();
      this.queue.push({ ...m, at: performance.now() });
    }
  }

  startSong(seq: number): void {
    this.command(GEMS.START, seq & 0xff);
  }

  stopSong(seq: number): void {
    this.command(GEMS.STOP, seq & 0xff);
  }

  /** $02DD26 */
  play(seq: number): void {
    const b = this.rom.bytes;
    if (b[SOUND_ROM.immediate + seq]) this.startSong(seq);
    else if (this.deferred.length < 1) this.deferred.push(seq);
  }

  /** Раз в кадр ($00182E): отложенный звук 20…60. */
  frame(): void {
    for (const s of this.deferred) if (s >= 0x14 && s <= 0x3c) this.startSong(s);
    this.deferred = [];
  }

  /** $00A7DC */
  sfx(id: number): void {
    if (!this.soundOn || id > 0x40) return;
    const seq = (this.rom.bytes[SOUND_ROM.sfx + id] << 24) >> 24;
    if (seq >= 0) this.play(seq);
  }

  /** $02DDB6 */
  ui(seq: number): void {
    if (this.soundOn) this.startSong(seq);
  }

  /** Звук меню «НАСТРОЙКИ» ($020F3E): прошлый стоп ($02DDCC), затем новый ($02DDB6). */
  menuUi(seq: number): void {
    if (this.lastUi >= 0) this.stopSong(this.lastUi);
    this.ui(seq);
    this.lastUi = seq;
  }

  /** Звуки выключены: флаг $FFDC51 и сразу тишина — стоп всех секвенций, музыка играет дальше. */
  setSound(on: boolean): void {
    this.soundOn = on;
    if (on) return;
    this.command(GEMS.STOP_ALL);
    this.voice = -1;
    this.deferred = [];
    const song = this.audibleMusic();
    if (song !== null) this.startSong(song);
  }

  /** $00A8E2 */
  feedback(id: number): void {
    if (!this.soundOn || id >= 0x5e) return;
    const seq = (this.rom.bytes[SOUND_ROM.voice + id] << 24) >> 24;
    if (seq < 0) return;
    if (seq !== this.voice) {
      if (this.voice >= 0) this.stopSong(this.voice);
      this.voice = seq;
    }
    this.play(seq);
  }

  /** $00A80A */
  playMusic(id: number): void {
    if (id === MUSIC.STOP) {
      if (this.music !== null) this.stopSong(this.music);
      this.music = null;
      this.battleLeft = -1;
      return;
    }
    if (id >= 8 && id <= 12) {
      while (id === this.lastBattle) id = 8 + Math.floor(Math.random() * 5);
      this.lastBattle = id;
    }
    const entry = SOUND_ROM.music + id * 4;
    const seq = (readU16(this.rom.bytes, entry) << 16) >> 16;
    if (seq < 0) return;
    this.playMusicSequence(seq, (readU16(this.rom.bytes, entry + 2) << 16) >> 16);
  }

  /** Музыка по прямому номеру GEMS (заставка, обучение), включая допустимую секвенцию 0. */
  playMusicSequence(seq: number, duration = -1, restart = true): void {
    if (!restart && seq === this.music && !this.musicPaused && this.preview === null) return;
    if (this.preview !== null) this.stopSong(this.preview);
    this.preview = null;
    if (this.music !== null) this.stopSong(this.music);
    this.music = seq;
    this.musicPaused = false;
    this.battleLeft = duration;
    if (this.musicOn) this.startSong(seq);
  }

  /** Фонотека временно заменяет текущую мелодию, а не играет одновременно с ней. */
  previewMusic(seq: number): void {
    if (this.preview !== null) this.stopSong(this.preview);
    if (this.music !== null) this.stopSong(this.music);
    this.preview = seq;
    if (this.musicOn) this.startSong(seq);
  }

  endPreview(): void {
    if (this.preview === null) return;
    this.stopSong(this.preview);
    this.preview = null;
    const song = this.audibleMusic();
    if (song !== null) this.startSong(song);
  }

  /** Случайная боевая мелодия ($021574: 8 + случайное 0…4). */
  battleMusic(): void {
    this.playMusic(MUSIC.BATTLE_FIRST + Math.floor(Math.random() * 5));
  }

  /** Выход из окна в игре: истекла боевая мелодия — новая ($02890A). */
  windowClosed(): void {
    if (this.battleLeft < 0) this.battleMusic();
  }

  /** Музыка выключена в настройках — остановить. */
  setMusic(on: boolean): void {
    if (on === this.musicOn) return;
    const song = this.audibleMusic();
    this.musicOn = on;
    if (!on && song !== null) this.stopSong(song);
    const resume = this.audibleMusic();
    if (on && resume !== null) this.startSong(resume);
  }

  /** Текущая мелодия заново (после паузы-меню). */
  resumeMusic(): void {
    this.musicPaused = false;
    const song = this.audibleMusic();
    if (song !== null) this.startSong(song);
  }

  stopMusic(): void {
    this.musicPaused = true;
    if (this.music !== null) this.stopSong(this.music);
  }
}
