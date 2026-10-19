/**
 * Взрыв ракеты дворца Харконненов («Рука смерти», взрыв 11): поверх обычных взрывов ROM — вспышка, огненный шар,
 * ударная волна, гриб дыма и выжженное пятно. Скрипт ракеты даёт серию взрывов 11 вокруг точки падения; большой
 * эффект один на серию (близкие по месту и времени взрывы к нему добавляются). Только рисование, время — игровое
 * (G.timerGame, пауза останавливает), в игру ничего не пишет. Мировые пиксели: клетка = 32.
 */
const TAU = Math.PI * 2;
const LIFE = 6 * 60, SCORCH = 30 * 60;

interface Nuke { x: number; y: number; born: number }

function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]): void {
  if (r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
const ease = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export class NukeEffects {
  private list: Nuke[] = [];

  reset(): void { this.list = []; }

  /** Взрыв 11 в (x, y): новый эффект или часть уже идущей серии. */
  add(x: number, y: number, tick: number): void {
    this.list = this.list.filter((n) => tick - n.born < SCORCH);
    if (this.list.some((n) => tick - n.born < 90 && Math.hypot(n.x - x, n.y - y) < 96)) return;
    this.list.push({ x, y, born: tick });
  }

  /** Под юнитами: выжженное пятно и ударная волна по земле. */
  drawGround(ctx: CanvasRenderingContext2D, tick: number, visible: (x: number, y: number) => boolean): void {
    for (const n of this.list) {
      const t = (tick - n.born) / 60;
      if (t < 0 || !visible(n.x, n.y)) continue;
      ctx.save();
      // пятно гари проступает за секунду и медленно бледнеет
      const scorch = clamp01(t) * (1 - clamp01((tick - n.born) / SCORCH));
      ctx.globalAlpha = .75 * scorch;
      radial(ctx, n.x, n.y, 44, [[0, 'rgba(18,12,8,.95)'], [.45, 'rgba(40,26,14,.7)'], [.8, 'rgba(70,48,24,.25)'], [1, 'rgba(70,48,24,0)']]);
      // кольца ударной волны: светлая пыль бежит по земле
      for (const [delay, reach, width] of [[0, 150, 10], [.25, 110, 6]] as const) {
        const k = (t - delay) / 1.4;
        if (k <= 0 || k >= 1) continue;
        const r = reach * ease(k);
        ctx.globalAlpha = .55 * (1 - k);
        ctx.lineWidth = width * (1 - k * .6);
        ctx.strokeStyle = 'rgba(236,214,170,1)';
        ctx.beginPath(); ctx.ellipse(n.x, n.y, r, r * .72, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
  }

  /** Над юнитами: огненный шар, свечение и гриб. */
  drawAir(ctx: CanvasRenderingContext2D, tick: number, visible: (x: number, y: number) => boolean): void {
    for (const n of this.list) {
      const t = (tick - n.born) / 60;
      if (t < 0 || t > LIFE / 60 || !visible(n.x, n.y)) continue;
      ctx.save();
      // свечение и огненный шар: раздувается за полсекунды, потом темнеет и оседает
      ctx.globalCompositeOperation = 'lighter';
      const glow = clamp01(1 - t / 2.2);
      radial(ctx, n.x, n.y, 120 * ease(clamp01(t / .35)), [[0, `rgba(255,240,200,${.55 * glow})`], [.35, `rgba(255,150,50,${.3 * glow})`], [1, 'rgba(255,90,20,0)']]);
      const fire = clamp01(1 - (t - .4) / 2.4);
      const fr = 34 * ease(clamp01(t / .5)) + 6 * Math.sin(t * 9) * fire;
      radial(ctx, n.x, n.y - 4 * t, fr, [[0, `rgba(255,255,230,${fire})`], [.3, `rgba(255,200,90,${.9 * fire})`], [.7, `rgba(240,90,20,${.6 * fire})`], [1, 'rgba(160,30,0,0)']]);
      ctx.globalCompositeOperation = 'source-over';
      // гриб: ножка и шапка дыма поднимаются и расплываются
      const smoke = clamp01((t - .5) / .8) * clamp01((LIFE / 60 - t) / 2.2);
      if (smoke > 0) {
        const rise = 70 * ease(clamp01((t - .5) / 3));
        for (let i = 0; i < 6; i++) {
          const k = i / 5;
          const y = n.y - rise * k, w = 9 + 5 * k;
          ctx.globalAlpha = .5 * smoke * (1 - k * .3);
          radial(ctx, n.x + Math.sin(t * 1.3 + i) * 2, y, w, [[0, 'rgba(70,60,52,.9)'], [1, 'rgba(70,60,52,0)']]);
        }
        const cap = 22 + 26 * ease(clamp01((t - .6) / 3.5));
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU + t * .25;
          ctx.globalAlpha = .55 * smoke;
          radial(ctx, n.x + Math.cos(a) * cap * .55, n.y - rise - 6 + Math.sin(a) * cap * .22, cap * .55, [[0, 'rgba(96,82,70,.9)'], [.6, 'rgba(70,58,50,.5)'], [1, 'rgba(60,50,44,0)']]);
        }
        // огненная подсветка снизу шапки, пока шар горит
        if (fire > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = .6 * fire;
          radial(ctx, n.x, n.y - rise, cap * .7, [[0, 'rgba(255,140,40,.8)'], [1, 'rgba(255,90,20,0)']]);
        }
      }
      ctx.restore();
    }
  }

  /** Вспышка на весь экран в первые доли секунды (только если точка видна). */
  drawFlash(ctx: CanvasRenderingContext2D, tick: number, width: number, height: number, visible: (x: number, y: number) => boolean): void {
    let a = 0;
    for (const n of this.list) {
      const t = (tick - n.born) / 60;
      if (t >= 0 && t < .5 && visible(n.x, n.y)) a = Math.max(a, .55 * (1 - t / .5) ** 2);
    }
    if (a <= 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,244,220,${a})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
