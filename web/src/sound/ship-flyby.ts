/**
 * Звуки пролёта кораблей-маток в заставке (владелец 2026-10-20: «звук пролёта поменять на новые три»; «не слышу звуки
 * пролётов» — первая версия сидела в суббасе 23–90 Гц, а колонки и наушники его не играют, музыка его глушила).
 * Синтез WebAudio без файлов, по-киношному: свист пролёта (шум, фильтр скользит сверху вниз, когда корабль проходит
 * мимо камеры), гул двигателей в слышимой полосе 70–500 Гц с гармониками и эффектом Доплера (после прохода тон
 * падает), суббас только подкладкой, лёгкое насыщение для плотности. Громче всего — в момент прохода у камеры (peak),
 * потом корабль уходит к планете и затихает; стерео — по ходу движения (планы съёмки ui/ship-cinematic.ts).
 *   Атрейдесы (1) — ровный мощный гул (тон и квинта), чистый яркий свист; проход слева у камеры, уход вправо;
 *   Харконнены (0) — тяжёлый грязный рокот с пульсацией «поршней», плотный низкий шум; вдоль борта слева направо;
 *   Ордосы (2) — высокий фантастический вой с вибрато, воздушный свист; на камеру и виражом вправо.
 */

/** Белый шум на 2 с — источник свиста и рокота. */
function noise(ctx: BaseAudioContext): AudioBuffer {
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** Мягкое насыщение: tanh — плотнее и громче на слух без щелчков. */
function saturator(ctx: BaseAudioContext, drive: number): WaveShaperNode {
  const s = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * drive) / Math.tanh(drive); }
  s.curve = c; s.oversample = "2x";
  return s;
}

/** Сыграть пролёт дома house длительностью seconds на ctx (выход — out). */
export function playFlyby(ctx: BaseAudioContext, out: AudioNode, house: number, seconds: number, volume = 1): void {
  const t0 = ctx.currentTime + 0.02, t1 = t0 + seconds;
  // момент прохода у камеры (доля сценки) — по планам съёмки
  const peak = house === 1 ? 0.12 : house === 0 ? 0.2 : 0.16, tp = t0 + seconds * peak;
  const master = ctx.createGain(), pan = ctx.createStereoPanner();
  const drive = saturator(ctx, house === 0 ? 2.6 : 1.6);
  const bus = ctx.createGain();
  bus.connect(drive).connect(master).connect(pan).connect(out);
  // огибающая: быстро нарастает к проходу, потом корабль уходит к планете и затихает
  const g = master.gain;
  g.setValueAtTime(0.0001, t0);
  g.exponentialRampToValueAtTime(volume, tp);
  g.setTargetAtTime(volume * 0.35, tp + 0.15, seconds * 0.22);
  g.setTargetAtTime(0.0001, t0 + seconds * 0.8, seconds * 0.07);
  // стерео по ходу движения
  const [p0, p1] = house === 0 ? [-0.7, 0.45] : house === 1 ? [-0.9, 0.3] : [-0.45, 0.55];
  pan.pan.setValueAtTime(p0, t0);
  pan.pan.linearRampToValueAtTime(p1 * 0.6, tp + 0.4);
  pan.pan.linearRampToValueAtTime(p1, t1);

  const sources: AudioScheduledSourceNode[] = [];
  /** Доплер: до прохода выше, после — ниже */
  const doppler = (p: AudioParam, base: number, up: number, down: number) => {
    p.setValueAtTime(base * up, t0);
    p.linearRampToValueAtTime(base * (1 + (up - 1) * 0.35), tp);
    p.exponentialRampToValueAtTime(base * down, tp + Math.min(1.2, seconds * 0.25));
  };
  /** тон двигателя: пара слегка расстроенных генераторов через фильтр, который после прохода темнеет */
  const tone = (type: OscillatorType, freq: number, level: number, bright: number, dop: [number, number]) => {
    const v = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.Q.value = 0.9;
    f.frequency.setValueAtTime(bright * 1.4, t0);
    f.frequency.exponentialRampToValueAtTime(bright, tp);
    f.frequency.exponentialRampToValueAtTime(bright * 0.35, t1);
    v.gain.value = level;
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = type; o.detune.value = detune;
      doppler(o.frequency, freq, dop[0], dop[1]);
      o.connect(f); sources.push(o);
    }
    f.connect(v).connect(bus);
    return { v, f };
  };
  /** свист пролёта: шум через полосовой фильтр, частота скользит сверху вниз мимо камеры */
  const whoosh = (high: number, low: number, q: number, level: number) => {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), v = ctx.createGain();
    s.buffer = noise(ctx); s.loop = true;
    f.type = "bandpass"; f.Q.value = q;
    f.frequency.setValueAtTime(high, t0);
    f.frequency.exponentialRampToValueAtTime(high * 0.7, tp);
    f.frequency.exponentialRampToValueAtTime(low, tp + Math.min(1.5, seconds * 0.3));
    f.frequency.exponentialRampToValueAtTime(low * 0.6, t1);
    // свист — короткий, у самого прохода
    v.gain.setValueAtTime(0.0001, t0);
    v.gain.exponentialRampToValueAtTime(level, tp);
    v.gain.setTargetAtTime(level * 0.12, tp + 0.1, seconds * 0.12);
    s.connect(f).connect(v).connect(bus);
    sources.push(s);
  };
  /** рокот: низкий шум под гулом */
  const rumble = (cut: number, level: number) => {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), v = ctx.createGain();
    s.buffer = noise(ctx); s.loop = true;
    f.type = "lowpass"; f.frequency.value = cut; f.Q.value = 0.5;
    v.gain.value = level;
    s.connect(f).connect(v).connect(bus);
    sources.push(s);
    return v;
  };
  /** модуляция (пульсация двигателей, вибрато) */
  const lfo = (target: AudioParam, rate: number, depth: number) => {
    const l = ctx.createOscillator(), d = ctx.createGain();
    l.frequency.value = rate; d.gain.value = depth;
    l.connect(d).connect(target);
    sources.push(l);
  };
  const sub = (freq: number, level: number) => {
    const o = ctx.createOscillator(), v = ctx.createGain();
    o.type = "sine"; doppler(o.frequency, freq, 1.1, 0.85);
    v.gain.value = level;
    o.connect(v).connect(bus);
    sources.push(o);
  };

  if (house === 1) {
    tone("sawtooth", 110, 0.16, 1600, [1.22, 0.8]);
    tone("sawtooth", 165, 0.08, 1900, [1.22, 0.8]);
    sub(55, 0.3);
    whoosh(3200, 380, 1.1, 0.9);
    rumble(240, 0.35);
  } else if (house === 0) {
    const a = tone("square", 72, 0.14, 900, [1.18, 0.82]);
    tone("sawtooth", 108, 0.1, 1100, [1.18, 0.82]);
    sub(36, 0.35);
    lfo(a.v.gain, 7.5, 0.1);
    const r = rumble(380, 0.6);
    lfo(r.gain, 7.5, 0.25);
    whoosh(2200, 260, 0.9, 0.75);
  } else {
    const a = tone("triangle", 330, 0.2, 3200, [1.28, 0.78]);
    const b = tone("sawtooth", 495, 0.05, 3600, [1.28, 0.78]);
    lfo(a.f.frequency, 5.5, 600);
    lfo(b.v.gain, 11, 0.03);
    sub(82, 0.22);
    whoosh(4500, 600, 1.4, 0.8);
    rumble(300, 0.22);
  }
  for (const s of sources) { s.start(t0); s.stop(t1 + 0.1); }
}
