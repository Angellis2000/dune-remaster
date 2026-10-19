// stub:worklet
var worklet_default = "worklet.js";

// web/src/sound/psg.ts
var VOLUME = Array.from({ length: 16 }, (_, i) => i === 15 ? 0 : Math.pow(10, -2 * i / 20));

// web/src/sound/ym2612.ts
var SIN_TABLE = new Uint16Array(256);
var POW_TABLE = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  SIN_TABLE[i] = Math.round(-Math.log2(Math.sin((2 * i + 1) * Math.PI / 1024)) * 256);
  POW_TABLE[i] = Math.round(Math.pow(2, -(i + 1) / 256) * 2048);
}
var INC_TABLE = (() => {
  const rows = [269488144, 269553680, 286265616, 286331152];
  const t = new Uint32Array(64);
  t[0] = t[1] = 0;
  t[2] = t[3] = t[4] = t[5] = 269488144;
  t[6] = t[7] = 286265616;
  for (let r = 8; r < 48; r++) t[r] = rows[r & 3];
  const tail = [286331153, 554770705, 555819297, 572596769, 572662306, 1109541410, 1111638594, 1145193538, 1145324612, 2219082820, 2223277188, 2290387076, 2290649224, 2290649224, 2290649224, 2290649224];
  for (let r = 48; r < 64; r++) t[r] = tail[r - 48];
  return t;
})();
var alg = (o2, o3, o4, out1, out2, out3) => o2 | o3 << 1 | o4 << 4 | out1 << 7 | out2 << 8 | out3 << 9;
var ALGORITHMS = [alg(1, 2, 3, 0, 0, 0), alg(0, 5, 3, 0, 0, 0), alg(0, 2, 6, 0, 0, 0), alg(1, 0, 7, 0, 0, 0), alg(1, 0, 3, 0, 1, 0), alg(1, 1, 1, 0, 1, 1), alg(1, 0, 0, 0, 1, 1), alg(0, 0, 0, 1, 1, 1)];

// web/src/sound/z80.ts
var FPV = 4;
var F3 = 8;
var F5 = 32;
var FZ = 64;
var SZ = new Uint8Array(256);
var SZP = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  SZ[i] = i & 128 | (i === 0 ? FZ : 0) | i & (F3 | F5);
  let p = i;
  p ^= p >> 4;
  p ^= p >> 2;
  p ^= p >> 1;
  SZP[i] = SZ[i] | ((p & 1) === 0 ? FPV : 0);
}

// web/src/sound/gems.ts
var GEMS = {
  START: 16,
  STOP: 18,
  /** остановить всё ($0016A6, $02DDC6) */
  STOP_ALL: 22,
  INIT: 11
};
var FM_RATE = 7670453 / 144;
var FRAME_CYCLES = 262 * 228;

// web/src/rom/md.ts
function readU16(b, at) {
  return b[at] << 8 | b[at + 1];
}

// web/src/sound/music-tracks.ts
var tracks = {
  intro: { 0: { name: "opening" } },
  game: {
    0: { name: "mentat-atreides" },
    6: { name: "mentat-harkonnen" },
    8: { name: "mentat-ordos" },
    1: { name: "spice-trip", battleSeconds: 184.972 },
    2: { name: "trenching", battleSeconds: 201.70225 },
    3: { name: "command-post", battleSeconds: 179.765417 },
    4: { name: "lego-tune", battleSeconds: 212.450833 },
    10: { name: "turbulence", battleSeconds: 161.980667 }
  }
};
function recordedMusic(bank, sequence) {
  return tracks[bank][sequence];
}
function isRecordedBattle(name) {
  return Object.values(tracks.game).some((t) => t.name === name && t.battleSeconds !== void 0);
}

// web/src/sound/sound.ts
var SOUND_ROM = {
  immediate: 187740,
  sfx: 436350,
  music: 436416,
  voice: 436572
};
var MUSIC = {
  STOP: 0,
  /** боевые: случайная из 8…12 ($021574) */
  BATTLE_FIRST: 8,
  HOUSE_SELECT: 28,
  /** ментат: по дому — Харконнены $18, Атрейдесы $19, Ордосы $1A ($01F366) */
  MENTAT: [24, 25, 26],
  ACCEPT: 29,
  /** победа по дому игрока и поражение ($026952, $026B56) */
  WIN: [6, 7, 5],
  LOSE: [3, 4, 2]
};
var Sound = class {
  constructor(rom) {
    this.rom = rom;
  }
  rom;
  ctx = null;
  node = null;
  analyser = null;
  queue = [];
  starting = false;
  musicOn = true;
  soundOn = true;
  /** $FFC8BC — текущая секвенция мелодии, $FFC8B4 — голоса, $FFC8B8 — последняя боевая */
  music = null;
  preview = null;
  musicPaused = false;
  currentBank = "game";
  voice = -1;
  lastBattle = -1;
  /** $FFC574 — сколько кадров ещё играть боевой мелодии (<0 — сменить в основном цикле или при выходе из окна). */
  battleLeft = -1;
  /** звук, отложенный до кадра ($F800) */
  deferred = [];
  /** последний звук меню «НАСТРОЙКИ» (d5 в $020E00): перед новым он останавливается */
  lastUi = -1;
  customAudios = /* @__PURE__ */ new Map();
  activeCustomTrack = null;
  pendingCustomTrack = null;
  userInteracted = false;
  voiceDucking = false;
  musicVolume() {
    return this.voiceDucking ? 0.22 : 1;
  }
  getAudio(name) {
    if (typeof Audio === "undefined") return null;
    let a = this.customAudios.get(name);
    if (!a) {
      const base = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL || "/";
      const cleanBase = base.endsWith("/") ? base : base + "/";
      a = new Audio(`${cleanBase}music/${name}.mp3`);
      a.loop = !isRecordedBattle(name);
      a.volume = this.musicVolume();
      this.customAudios.set(name, a);
    }
    return a;
  }
  playCustomAudio(name) {
    if (this.activeCustomTrack !== name || !this.musicOn || this.musicPaused && this.preview === null) return;
    const audio = this.getAudio(name);
    if (!audio) return;
    void audio.play().then(() => {
      if (this.activeCustomTrack !== name || !this.musicOn || this.musicPaused && this.preview === null) {
        audio.pause();
        return;
      }
      this.pendingCustomTrack = null;
    }).catch(() => {
      if (this.activeCustomTrack === name) this.pendingCustomTrack = name;
    });
  }
  playCustomTrack(name) {
    if (!this.musicOn) {
      this.stopCustomTrack();
      this.activeCustomTrack = name;
      return;
    }
    if (this.activeCustomTrack === name) {
      const a2 = this.getAudio(name);
      if (a2 && a2.paused) {
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
  stopCustomTrack() {
    for (const audio of this.customAudios.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.activeCustomTrack = null;
    this.pendingCustomTrack = null;
  }
  /** Убавить музыкальный фон, пока звучит отдельная реплика ментата. */
  setVoiceDucking(active) {
    if (this.voiceDucking === active) return;
    this.voiceDucking = active;
    for (const audio of this.customAudios.values()) audio.volume = this.musicVolume();
    this.node?.port.postMessage({ volume: active ? 0.55 : 2.5 });
  }
  playCustomSfx(name) {
    if (!this.soundOn) return;
    try {
      const base = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL || "/";
      const cleanBase = base.endsWith("/") ? base : base + "/";
      const audio = new Audio(`${cleanBase}music/${name}.wav`);
      audio.volume = 0.9;
      audio.play().catch(() => {
      });
    } catch {
    }
  }
  unlockAudio() {
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
  get isUnlocked() {
    if (typeof window === "undefined") return true;
    if (this.userInteracted) return true;
    if (this.ctx && this.ctx.state === "running") return true;
    if (this.activeCustomTrack) {
      const a = this.customAudios.get(this.activeCustomTrack);
      if (a && !a.paused) return true;
    }
    return false;
  }
  /** Запуск по первому действию игрока (браузер не даёт звук без него). */
  async start() {
    if (this.ctx || this.starting) {
      if (this.ctx?.state === "suspended") await this.ctx.resume();
      return;
    }
    this.starting = true;
    try {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      await ctx.audioWorklet.addModule(worklet_default);
      const node = new AudioWorkletNode(ctx, "gems", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
      node.connect(ctx.destination);
      this.analyser = ctx.createAnalyser();
      node.connect(this.analyser);
      node.port.postMessage({ rom: this.rom.bytes.slice().buffer, bank: this.currentBank });
      node.port.postMessage({ volume: this.voiceDucking ? 0.55 : 2.5 });
      const song = this.audibleMusic();
      for (const c of this.queue) {
        if (performance.now() - c.at <= 250 && !(c.cmd === GEMS.START && c.args[0] === song)) node.port.postMessage(c);
      }
      this.queue = [];
      this.ctx = ctx;
      this.node = node;
      if (song !== null) this.startSong(song);
      if (ctx.state === "suspended") await ctx.resume();
    } catch (e) {
      console.warn("\u0437\u0432\u0443\u043A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D", e);
    } finally {
      this.starting = false;
    }
  }
  /** Для автотестов: пик выхода за последний кадр анализатора. */
  peak() {
    if (!this.analyser) return 0;
    const d = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(d);
    let p = 0;
    for (const v of d) p = Math.max(p, Math.abs(v));
    return p;
  }
  get running() {
    return this.ctx?.state === "running";
  }
  get bank() {
    return this.currentBank;
  }
  /** Текущая позиция пользовательской музыкальной дорожки для синхронизации заставки. */
  customTrackTime(name) {
    return this.customAudios.get(name)?.currentTime ?? 0;
  }
  /** $02DCF0 / $02DCA0: драйвер перезагружается с банками заставки или игры. */
  useBank(bank) {
    if (bank === this.currentBank) return;
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
  audibleMusic() {
    if (!this.musicOn) return null;
    const seq = this.preview ?? (this.musicPaused ? null : this.music);
    return seq !== null && !recordedMusic(this.currentBank, seq) ? seq : null;
  }
  /** Команда GEMS. */
  command(cmd, ...args) {
    const m = { cmd, args };
    if (this.node) this.node.port.postMessage(m);
    else {
      if (this.queue.length >= 64) this.queue.shift();
      this.queue.push({ ...m, at: performance.now() });
    }
  }
  startSong(seq) {
    this.command(GEMS.START, seq & 255);
  }
  stopSong(seq) {
    this.command(GEMS.STOP, seq & 255);
  }
  /** $02DD26 */
  play(seq) {
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
  frame() {
    for (const s of this.deferred) if (s >= 20 && s <= 60) this.startSong(s);
    this.deferred = [];
    if (this.pendingCustomTrack && this.musicOn) {
      const a = this.getAudio(this.pendingCustomTrack);
      if (a && a.paused) {
        this.playCustomAudio(this.pendingCustomTrack);
      }
    }
    if (this.preview === null && this.music !== null && this.activeCustomTrack) {
      const track = recordedMusic(this.currentBank, this.music), a = this.customAudios.get(this.activeCustomTrack);
      if (track?.battleSeconds && track.name === this.activeCustomTrack && a && Number.isFinite(a.duration))
        this.battleLeft = a.ended ? -1 : Math.max(1, Math.ceil((a.duration - a.currentTime) * 60));
    }
  }
  /** $00A7DC */
  sfx(id) {
    if (!this.soundOn || id > 64) return;
    const seq = this.rom.bytes[SOUND_ROM.sfx + id] << 24 >> 24;
    if (seq >= 0) this.play(seq);
  }
  /** $02DDB6 */
  ui(seq) {
    if (this.soundOn) this.startSong(seq);
  }
  /** Звук меню «НАСТРОЙКИ» ($020F3E): прошлый стоп ($02DDCC), затем новый ($02DDB6). */
  menuUi(seq) {
    if (this.lastUi >= 0) this.stopSong(this.lastUi);
    this.ui(seq);
    this.lastUi = seq;
  }
  /** Звуки выключены: флаг $FFDC51 и сразу тишина — стоп всех секвенций, музыка играет дальше. */
  setSound(on) {
    this.soundOn = on;
    if (on) return;
    this.command(GEMS.STOP_ALL);
    this.voice = -1;
    this.deferred = [];
    const song = this.audibleMusic();
    if (song !== null) this.startSong(song);
  }
  /** $00A8E2 */
  feedback(id) {
    if (!this.soundOn || id >= 94) return;
    const seq = this.rom.bytes[SOUND_ROM.voice + id] << 24 >> 24;
    if (seq < 0) return;
    if (seq !== this.voice) {
      if (this.voice >= 0) this.stopSong(this.voice);
      this.voice = seq;
    }
    this.play(seq);
  }
  /** $00A80A */
  playMusic(id) {
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
    const seq = readU16(this.rom.bytes, entry) << 16 >> 16;
    if (seq < 0) return;
    this.playMusicSequence(seq, readU16(this.rom.bytes, entry + 2) << 16 >> 16);
  }
  /** Музыка по прямому номеру GEMS (заставка, обучение), включая допустимую секвенцию 0. */
  playMusicSequence(seq, duration = -1, restart = true) {
    const track = recordedMusic(this.currentBank, seq);
    if (track) {
      if (this.preview !== null) this.stopSong(this.preview);
      this.preview = null;
      if (this.music !== null && this.music !== seq) this.stopSong(this.music);
      this.music = seq;
      this.musicPaused = false;
      this.battleLeft = track.battleSeconds ? Math.ceil(track.battleSeconds * 60) : duration;
      if (restart || this.activeCustomTrack !== track.name || this.getAudio(track.name)?.paused) this.playCustomTrack(track.name);
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
  previewMusic(seq) {
    this.stopCustomTrack();
    if (this.preview !== null) this.stopSong(this.preview);
    if (this.music !== null) this.stopSong(this.music);
    this.preview = seq;
    const track = recordedMusic(this.currentBank, seq);
    if (track) this.playCustomTrack(track.name);
    else if (this.musicOn) this.startSong(seq);
  }
  endPreview() {
    if (this.preview === null) return;
    this.stopCustomTrack();
    this.stopSong(this.preview);
    this.preview = null;
    const track = this.music !== null ? recordedMusic(this.currentBank, this.music) : void 0;
    if (track) this.playCustomTrack(track.name);
    const song = this.audibleMusic();
    if (song !== null) this.startSong(song);
  }
  /** Случайная боевая мелодия ($021574: 8 + случайное 0…4). */
  battleMusic() {
    this.playMusic(MUSIC.BATTLE_FIRST + Math.floor(Math.random() * 5));
  }
  /** Выход из окна в игре: истекла боевая мелодия — новая ($02890A). */
  windowClosed() {
    if (this.battleLeft < 0) this.battleMusic();
  }
  /** Музыка выключена в настройках — остановить. */
  setMusic(on) {
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
  resumeMusic() {
    this.musicPaused = false;
    if (this.activeCustomTrack && this.musicOn) {
      const a = this.customAudios.get(this.activeCustomTrack);
      if (a && a.paused) this.playCustomAudio(this.activeCustomTrack);
    }
    const song = this.audibleMusic();
    if (song !== null) this.startSong(song);
  }
  stopMusic() {
    this.musicPaused = true;
    if (this.activeCustomTrack) {
      const a = this.customAudios.get(this.activeCustomTrack);
      if (a) a.pause();
    }
    if (this.music !== null) this.stopSong(this.music);
  }
};
export {
  MUSIC,
  SOUND_ROM,
  Sound
};
