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
import {recordedMusic,isRecordedBattle} from './music-tracks.ts';
import {combatSfxSamples,isCombatSfx} from './combat-sfx.ts';
import { playFlyby } from './ship-flyby.ts';

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
  /** $022B12: победа в 8-й миссии — перед ментатом и итогами особая мелодия (последовательность 17) */
  LAST_LEVEL: 0x26,
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
  private quietSfx: { seq: number; volume: number; at: number }[] = [];
  /** последний звук меню «НАСТРОЙКИ» (d5 в $020E00): перед новым он останавливается */
  private lastUi = -1;
  private customAudios = new Map<string, HTMLAudioElement>();
  private activeCustomTrack: string | null = null;
  private pendingCustomTrack: string | null = null;
  private userInteracted = false;
  private voiceDucking = false;
  private combatBuffers=new Map<number,AudioBuffer>();
  private combatSources=new Set<AudioBufferSourceNode>();
  private combatBus:GainNode|null=null;

  private musicVolume(): number {
    return this.voiceDucking ? 0.22 : 1.0;
  }

  private getAudio(name: string): HTMLAudioElement | null {
    if (typeof Audio === "undefined") return null;
    let a = this.customAudios.get(name);
    if (!a) {
      const base = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
      const cleanBase = base.endsWith("/") ? base : base + "/";
      a = new Audio(`${cleanBase}music/${name}.mp3`);
      a.loop = !isRecordedBattle(name);
      a.volume = this.musicVolume();
      this.customAudios.set(name, a);
    }
    return a;
  }

  private playCustomAudio(name:string):void{
    if(this.activeCustomTrack!==name||!this.musicOn||(this.musicPaused&&this.preview===null))return;
    const audio=this.getAudio(name);if(!audio)return;
    void audio.play().then(()=>{
      if(this.activeCustomTrack!==name||!this.musicOn||(this.musicPaused&&this.preview===null)){
        audio.pause();return;
      }
      this.pendingCustomTrack=null;
    }).catch(()=>{if(this.activeCustomTrack===name)this.pendingCustomTrack=name;});
  }

  playCustomTrack(name: string): void {
    if (!this.musicOn) {
      this.stopCustomTrack();
      this.activeCustomTrack = name;
      return;
    }
    if (this.activeCustomTrack === name) {
      const a = this.getAudio(name);
      if (a && a.paused) {
        this.playCustomAudio(name);
      }
      return;
    }
    this.stopCustomTrack();
    this.activeCustomTrack = name;
    this.pendingCustomTrack = name;
    if (this.music !== null) this.stopSong(this.music);
    const a = this.getAudio(name);
    if (a) {
      a.currentTime = 0;
      this.playCustomAudio(name);
    }
  }

  stopCustomTrack(): void {
    // Останавливаем весь пул: при быстрой смене дома предыдущая дорожка
    // не должна доигрывать поверх новой даже при запоздавшем play() браузера.
    for (const audio of this.customAudios.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.activeCustomTrack = null;
    this.pendingCustomTrack = null;
  }

  /** Убавить музыкальный фон, пока звучит отдельная реплика ментата. */
  setVoiceDucking(active: boolean): void {
    if (this.voiceDucking === active) return;
    this.voiceDucking = active;
    for (const audio of this.customAudios.values()) audio.volume = this.musicVolume();
    this.node?.port.postMessage({ volume: active ? 0.55 : 2.5 });
  }

  /** Звук пролёта корабля-матки в заставке (sound/ship-flyby.ts): дом и длительность сценки, с. */
  flyby(house: number, seconds: number): void {
    if (!this.soundOn || !this.ctx) return;
    try { playFlyby(this.ctx, this.ctx.destination, house, seconds, 0.9); } catch (e) { console.warn("звук пролёта", e); }
  }

  playCustomSfx(name: string): void {
    if (!this.soundOn) return;
    try {
      const base = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
      const cleanBase = base.endsWith("/") ? base : base + "/";
      const audio = new Audio(`${cleanBase}music/${name}.wav`);
      audio.volume = 0.9;
      audio.play().catch(() => {});
    } catch {}
  }

  unlockAudio(): void {
    this.userInteracted = true;
    if (this.ctx?.state === "suspended") void this.ctx.resume();
    if (!this.ctx && !this.starting) void this.start();
    const track = this.pendingCustomTrack ?? this.activeCustomTrack;
    if (track && this.musicOn) {
      const a = this.getAudio(track);
      if (a && a.paused) {
        this.playCustomAudio(track);
      }
    }
  }

  get isUnlocked(): boolean {
    if (typeof window === "undefined") return true;
    if (this.userInteracted) return true;
    if (this.ctx && this.ctx.state === "running") return true;
    if (this.activeCustomTrack) {
      const a = this.customAudios.get(this.activeCustomTrack);
      if (a && !a.paused) return true;
    }
    return false;
  }

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
      node.port.postMessage({ volume: this.voiceDucking ? 0.55 : 2.5 });
      const song = this.audibleMusic();
      for (const c of this.queue) {
        // Короткие эффекты до разрешения AudioContext уже прошли; музыка должна быть текущей.
        if (performance.now() - c.at <= 250 && !(c.cmd === GEMS.START && c.args[0] === song)) node.port.postMessage(c);
      }
      this.queue = [];
      for (const s of this.quietSfx) if (performance.now() - s.at <= 250) node.port.postMessage({ quietSequence: s.seq, quietVolume: s.volume });
      this.quietSfx = [];
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

  /** Текущая позиция пользовательской музыкальной дорожки для синхронизации заставки. */
  customTrackTime(name: string): number { return this.customAudios.get(name)?.currentTime ?? 0; }

  /** $02DCF0 / $02DCA0: драйвер перезагружается с банками заставки или игры. */
  useBank(bank: SoundBank): void {
    if (bank === this.currentBank) return;
    this.stopCombatSfx();
    this.stopCustomTrack();
    if (this.preview !== null) this.stopSong(this.preview);
    if (this.music !== null) this.stopSong(this.music);
    if (this.voice >= 0) this.stopSong(this.voice);
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
    const seq=this.preview??(this.musicPaused?null:this.music);
    return seq!==null&&!recordedMusic(this.currentBank,seq)?seq:null;
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
    if (seq === 0 && this.currentBank === "intro") {
      this.playMusicSequence(0);
      return;
    }
    if (seq === 10 && this.currentBank === "intro") {
      this.playCustomSfx("ship-flyby");
    }
    const b = this.rom.bytes;
    if (b[SOUND_ROM.immediate + seq]) this.startSong(seq);
    else if (this.deferred.length < 1) this.deferred.push(seq);
  }

  /** Раз в кадр ($00182E): отложенный звук 20…60. */
  frame(): void {
    for (const s of this.deferred) if (s >= 0x14 && s <= 0x3c) this.startSong(s);
    this.deferred = [];
    if (this.pendingCustomTrack && this.musicOn) {
      const a = this.getAudio(this.pendingCustomTrack);
      if (a && a.paused) {
        this.playCustomAudio(this.pendingCustomTrack);
      }
    }
    // Follow actual MP3 playback, so longer arrangements finish and pause/menu time
    // cannot consume the old ROM timer or restart an interrupted custom song.
    if(this.preview===null&&this.music!==null&&this.activeCustomTrack){
      const track=recordedMusic(this.currentBank,this.music),a=this.customAudios.get(this.activeCustomTrack);
      if(track?.battleSeconds&&track.name===this.activeCustomTrack&&a&&Number.isFinite(a.duration))
        this.battleLeft=a.ended?-1:Math.max(1,Math.ceil((a.duration-a.currentTime)*60));
    }
  }

  /** $00A7DC */
  sfx(id: number, volume = 1): void {
    if (!this.soundOn) return;
    if(isCombatSfx(id)){this.playCombatSfx(id);return;}
    if(id<0||id>0x40)return;
    const seq = (this.rom.bytes[SOUND_ROM.sfx + id] << 24) >> 24;
    if (seq >= 0) {
      if (volume < 0.999) {
        const message={seq,volume:Math.max(0,Math.min(volume,1)),at:performance.now()};
        if(this.node)this.node.port.postMessage({quietSequence:message.seq,quietVolume:message.volume});
        else {if(this.quietSfx.length>=16)this.quietSfx.shift();this.quietSfx.push(message);}
      } else this.play(seq);
    }
  }

  private playCombatSfx(id:number):void{
    const ctx=this.ctx;if(!ctx||ctx.state!=='running')return;
    if(!this.combatBus){
      this.combatBus=ctx.createGain();this.combatBus.gain.value=.55;
      const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.002;limiter.release.value=.12;
      this.combatBus.connect(limiter);limiter.connect(ctx.destination);if(this.analyser)limiter.connect(this.analyser);
    }
    let buffer=this.combatBuffers.get(id);
    if(!buffer){const pcm=combatSfxSamples(id,ctx.sampleRate);buffer=ctx.createBuffer(1,pcm.length,ctx.sampleRate);buffer.getChannelData(0).set(pcm);this.combatBuffers.set(id,buffer);}
    if(this.combatSources.size>=12){const oldest=this.combatSources.values().next().value!;oldest.stop();this.combatSources.delete(oldest);}
    const source=ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=.98+Math.random()*.04;source.connect(this.combatBus);this.combatSources.add(source);
    source.onended=()=>{this.combatSources.delete(source);source.disconnect();};source.start();
  }
  private stopCombatSfx():void{for(const source of this.combatSources){source.stop();source.disconnect();}this.combatSources.clear();}

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
    this.stopCombatSfx();
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
      this.stopCustomTrack();
      if (this.preview !== null) this.stopSong(this.preview);
      if (this.music !== null) this.stopSong(this.music);
      this.music = this.preview = null;
      this.musicPaused = false;
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
    const track=recordedMusic(this.currentBank,seq);
    if (track) {
      if (this.preview !== null) this.stopSong(this.preview);
      this.preview = null;
      if (this.music !== null && this.music !== seq) this.stopSong(this.music);
      this.music = seq;
      this.musicPaused = false;
      this.battleLeft=track.battleSeconds?Math.ceil(track.battleSeconds*60):duration;
      if(restart||this.activeCustomTrack!==track.name||this.getAudio(track.name)?.paused)this.playCustomTrack(track.name);
      return;
    }
    this.stopCustomTrack();
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
    this.stopCustomTrack();
    if (this.preview !== null) this.stopSong(this.preview);
    if (this.music !== null) this.stopSong(this.music);
    this.preview = seq;
    const track=recordedMusic(this.currentBank,seq);
    if(track)this.playCustomTrack(track.name);
    else if(this.musicOn)this.startSong(seq);
  }

  endPreview(): void {
    if (this.preview === null) return;
    this.stopCustomTrack();
    this.stopSong(this.preview);
    this.preview = null;
    const track=this.music!==null?recordedMusic(this.currentBank,this.music):undefined;
    // Restore the selected recording even while options keep it paused; resumeMusic
    // will start it when the game resumes instead of leaving a silent custom sequence.
    if(track)this.playCustomTrack(track.name);
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
    if (!on) {
      if (this.activeCustomTrack) {
        const a = this.customAudios.get(this.activeCustomTrack);
        if (a) a.pause();
      }
      if (song !== null) this.stopSong(song);
    } else {
      if (this.activeCustomTrack) {
        const a = this.customAudios.get(this.activeCustomTrack);
        if (a && a.paused) this.playCustomAudio(this.activeCustomTrack);
      }
      const resume = this.audibleMusic();
      if (resume !== null) this.startSong(resume);
    }
  }

  /** Текущая мелодия заново (после паузы-меню). */
  resumeMusic(): void {
    this.musicPaused = false;
    if (this.activeCustomTrack && this.musicOn) {
      const a = this.customAudios.get(this.activeCustomTrack);
      if (a && a.paused) this.playCustomAudio(this.activeCustomTrack);
    }
    const song = this.audibleMusic();
    if (song !== null) this.startSong(song);
  }

  stopMusic(): void {
    this.musicPaused = true;
    if (this.activeCustomTrack) {
      const a = this.customAudios.get(this.activeCustomTrack);
      if (a) a.pause();
    }
    if (this.music !== null) this.stopSong(this.music);
  }
}
