/**
 * Кинопролёт кораблей-маток в заставке (владелец 2026-10-20: «вместо старых кораблей — новые, киношно, а не просто
 * быстрый пролёт»; «свет, чтобы тени были видны»; «корабль должен лететь на планету»; «не хватает киношных фильтров»;
 * образец — его ролик: проход у камеры и уход кормой к планете, проводка вдоль борта над горизонтом, ракурс 3/4 спереди).
 * Порядок сцен и паузы — из ROM ($017DC8: сценки 1, 0, 2), сама сценка — 3D-корабль из gfx/ship-assets.ts.
 *
 * Корабль — в настоящем 3D перед камерой: летит по кривой к точке на диске Арракиса, размер на экране — по перспективе,
 * нос — по курсу, в поворотах крен, ракурс учитывает угол, под которым камера видит корабль; свет — то же солнце,
 * что у планеты, так что тени надстроек ползут по корпусу. У каждого плана своя камера на планету (planetView), после
 * последнего заставка плавно отъезжает к виду меню. Поверх — широкий экран, цветокоррекция, засвет солнца, виньетка,
 * зерно (drawCinemaFilters) и блики двигателей.
 *   Атрейдесы (1) — крейсер проходит слева у самой камеры и уходит кормой с огнями к планете;
 *   Харконнены (0) — низкая орбита: камера ведёт авианосец вдоль борта над дугой горизонта, затем он ныряет к поверхности;
 *   Ордосы (2) — диск у края планеты идёт на камеру в ракурсе 3/4, закладывает вираж и уходит вниз, на планету.
 * Пока модели не загрузились — заставка показывает прежние спрайты.
 */
import { loadMotherships } from "../gfx/ship-assets.ts";
import type { ShipModel, Vec3 } from "../gfx/ship-models.ts";
import { ShipRenderer, type ShipPose } from "../gfx/ship-renderer.ts";

/** длительность сценки (кадров по 60 в секунду) по дому: 0 — Харконнены, 1 — Атрейдесы, 2 — Ордосы */
export const CINEMATIC_FRAMES = [270, 330, 270];

let models: ShipModel[] | null = null;
let loading: Promise<void> | null = null;
let renderer: ShipRenderer | null = null;

/** Начать загрузку маток (заставка зовёт при старте). */
export function preloadMotherships(): void {
  if (loading) return;
  loading = loadMotherships().then((m) => { models = m; }).catch((e) => { console.warn("корабли заставки не загрузились", e); });
}
/** Можно ли показывать кинопролёт (модели загружены и есть WebGL). */
export function mothershipsReady(): boolean {
  if (!models) return false;
  renderer ??= new ShipRenderer();
  return renderer.ready;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/** экран 320×224: центр кадра и фокусное расстояние камеры (≈56° по горизонтали) */
const CX = 160, CY = 112, FOCAL = 300;
/** Солнце слева сверху, как у планеты, но скользящее — чтобы тени надстроек читались. Мир: X вправо, Y вверх, Z от камеры. */
const SUN: Vec3 = norm([-0.8, 0.55, -0.28]);

/**
 * План съёмки: кривая Безье в мире камеры (единица — радиус корабля, камера в нуле, смотрит по +Z); последняя точка —
 * на диске планеты этого плана. Время по кривой — либо depth (доля ln Z: корабль «уходит» равномерно, как в кино),
 * либо warp (прямо параметр кривой — для проводки, где глубина почти не меняется). planet — где диск на экране,
 * roll — свой крен сверх виражного, bank — сила крена в поворотах.
 */
type Plan = {
  path: [Vec3, Vec3, Vec3, Vec3]; depth?: (t: number) => number; warp?: (t: number) => number;
  planet: (t: number) => { x: number; y: number; radius: number };
  roll?: (t: number) => number; bank: number; thrust?: (t: number) => number;
};

const PLANS: Record<number, Plan> = {
  // Атрейдесы: слева у самой камеры (борт), затем кормой с огнями — к планете; камера чуть наезжает
  1: {
    path: [[-1.35, 0.12, 1.45], [-0.2, 0.05, 3.6], [6, 0.9, 25], [11.7, 2, 100]],
    depth: (t) => 0.7 * t + 0.3 * t ** 3,
    planet: (t) => ({ x: lerp(236, 228, t), y: 110, radius: lerp(92, 104, smooth(t)) }),
    bank: 0.6,
    thrust: (t) => lerp(0.75, 1, smooth(t * 3)),
  },
  // Харконнены: низкая орбита, под кадром дуга горизонта; проводка вдоль борта, потом нырок к поверхности
  0: {
    path: [[-1.45, 0.2, 3.0], [0.55, 0.16, 3.1], [2.6, -0.2, 7], [28.6, -27.5, 110]],
    warp: (t) => 0.42 * t + 0.58 * t ** 2.6,
    planet: (t) => ({ x: lerp(215, 140, t), y: 772, radius: 612 }),
    bank: 0.35,
  },
  // Ордосы: край планеты справа внизу; диск идёт на камеру в ракурсе 3/4, вираж — и вниз, на планету
  2: {
    path: [[-1.0, 0.02, 3.1], [0.45, 0.1, 2.5], [5, -2.4, 9], [33, -23, 110]],
    warp: (t) => 0.5 * t + 0.5 * t ** 2.2,
    planet: (t) => ({ x: lerp(296, 304, t), y: lerp(262, 254, t), radius: lerp(186, 196, smooth(t)) }),
    bank: 0.45,
  },
};

const bezier = (p: Plan["path"], u: number): Vec3 => {
  const v = 1 - u;
  return add(add(mul(p[0], v * v * v), mul(p[1], 3 * v * v * u)), add(mul(p[2], 3 * v * u * u), mul(p[3], u * u * u)));
};

/** Положение на кривой по времени: подбираем параметр, при котором ln Z = нужной доле (Z по кривой растёт). */
function place(plan: Plan, t: number): Vec3 {
  if (plan.warp) return bezier(plan.path, clamp01(plan.warp(clamp01(t))));
  const depth = plan.depth ?? ((x: number) => x);
  const z0 = Math.log(plan.path[0][2]), z1 = Math.log(plan.path[3][2]);
  const want = lerp(z0, z1, depth(clamp01(t)));
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (Math.log(bezier(plan.path, mid)[2]) < want) lo = mid; else hi = mid;
  }
  return bezier(plan.path, (lo + hi) / 2);
}

/** поворот, переводящий единичный a в единичный b (Родриг), — матрица 3×3 построчно */
function turn(a: Vec3, b: Vec3): number[] {
  const k = cross(a, b), c = dot(a, b), s2 = dot(k, k);
  if (s2 < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const f = (1 - c) / s2, [x, y, z] = k;
  return [
    1 - f * (y * y + z * z), -z + f * x * y, y + f * x * z,
    z + f * x * y, 1 - f * (x * x + z * z), -x + f * y * z,
    -y + f * x * z, x + f * y * z, 1 - f * (x * x + y * y),
  ];
}
const apply = (m: number[], v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
/** мир (Z — от камеры) → оси рендера (z — к камере) */
const toView = (v: Vec3): Vec3 => [v[0], v[1], -v[2]];

/** Кадр сценки: где корабль на экране, какого размера и как повёрнут для ShipRenderer. */
export function shotFrame(house: number, t: number) {
  const plan = PLANS[house] ?? PLANS[1];
  const dt = 0.004;
  const p = place(plan, t), pa = place(plan, t - dt), pb = place(plan, t + dt);
  const forward = norm(sub(pb, pa));
  // вираж: скорость поворота курса вокруг вертикали → крен внутрь поворота
  const fa = norm(sub(p, place(plan, t - 4 * dt))), fb = norm(sub(place(plan, t + 4 * dt), p));
  const yawRate = dot(cross(fa, fb), [0, 1, 0]) / (8 * dt);
  const bankAngle = Math.max(-0.9, Math.min(0.9, -yawRate * plan.bank)) + (plan.roll?.(t) ?? 0);
  let up = norm(sub([0, 1, 0], mul(forward, forward[1])));
  const side = cross(forward, up);
  up = add(mul(up, Math.cos(bankAngle)), mul(side, Math.sin(bankAngle)));
  // базис корабля в осях рендера: X = Y × Z, Y — верх, Z — нос
  const f = toView(forward), u = toView(up), x = cross(u, f);
  // рендер смотрит на корабль ровно по −z; на деле камера видит его под углом — доворачиваем весь корабль и солнце
  const q = turn(norm(toView(p)), [0, 0, -1]);
  const X = apply(q, x), Y = apply(q, u), Z = apply(q, f);
  // R = Ry·Rx·Rz: столбцы X, Y, Z → рыскание, тангаж, крен
  const yaw = Math.atan2(Z[0], Z[2]), pitch = Math.asin(Math.max(-1, Math.min(1, -Z[1]))), roll = Math.atan2(X[1], Y[1]);
  const fz = FOCAL;
  return {
    x: CX + (fz * p[0]) / p[2], y: CY - (fz * p[1]) / p[2], size: (2 * fz) / p[2],
    yaw, pitch, roll, light: apply(q, toView(SUN)) as Vec3,
    // корма к камере: насколько видны сопла (для бликов)
    stern: clamp01(dot(forward, norm(p))),
    sternAt: (() => { const s = sub(p, mul(forward, 0.8)); return [CX + (fz * s[0]) / s[2], CY - (fz * s[1]) / s[2]] as const; })(),
    thrust: plan.thrust?.(t) ?? 1,
  };
}

/** Сила киношной обработки: нарастает с первой сценкой, спадает после последней (во время отъезда к меню). */
export function cinemaCamera(frame: number, from: number, to: number): number {
  if (from < 0 || frame < from) return 0;
  let amount = smooth((frame - from) / 50);
  if (to >= 0 && frame >= to) amount *= 1 - smooth((frame - to) / 120);
  return amount;
}

let grain: CanvasPattern | null = null;
/** Широкий экран 2,35:1, цветокоррекция «тёплые света — холодные тени», виньетка, плёночное зерно. */
export function drawCinemaFilters(ctx: CanvasRenderingContext2D, amount: number, frame: number): void {
  if (amount <= 0.001) return;
  const m = ctx.getTransform(), w = ctx.canvas.width / m.a, h = ctx.canvas.height / m.d;
  const left = (320 - w) / 2, top = (224 - h) / 2;
  ctx.save();
  // цвет: тёплое солнце слева сверху, холодная тень справа снизу
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.42 * amount;
  const g = ctx.createLinearGradient(left, top, left + w, top + h);
  g.addColorStop(0, "#ffb060"); g.addColorStop(0.55, "#a08070"); g.addColorStop(1, "#1d4f6e");
  ctx.fillStyle = g; ctx.fillRect(left, top, w, h);
  // мягкий засвет от солнца
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.16 * amount;
  const sun = ctx.createRadialGradient(left + w * 0.08, top + h * 0.05, 0, left + w * 0.08, top + h * 0.05, w * 0.6);
  sun.addColorStop(0, "#ffd9a0"); sun.addColorStop(1, "rgba(255,180,110,0)");
  ctx.fillStyle = sun; ctx.fillRect(left, top, w, h);
  // блик объектива: звезда солнца в углу и «зайчики» по линии к центру кадра
  const sx = left + w * 0.06, sy = top + h * 0.03, pulse = 0.92 + 0.08 * Math.sin(frame * 0.05);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = amount * pulse;
  const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, 34);
  core.addColorStop(0, "rgba(255,250,235,0.95)"); core.addColorStop(0.12, "rgba(255,226,180,0.5)"); core.addColorStop(1, "rgba(255,190,120,0)");
  ctx.fillStyle = core; ctx.fillRect(sx - 34, sy - 34, 68, 68);
  for (const [a, len] of [[0.35, 70], [1.25, 46], [2.2, 58], [-0.6, 40]] as const) {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a); ctx.scale(len, 0.7);
    const ray = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    ray.addColorStop(0, "rgba(255,236,200,0.5)"); ray.addColorStop(1, "rgba(255,236,200,0)");
    ctx.fillStyle = ray; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  }
  for (const [k, r, c] of [[0.42, 5, "120,180,255"], [0.7, 2.5, "255,200,140"]] as const) {
    const gx = sx + (CX - sx) * k, gy = sy + (CY - sy) * k;
    const ghost = ctx.createRadialGradient(gx, gy, r * 0.6, gx, gy, r);
    ghost.addColorStop(0, `rgba(${c},0.04)`); ghost.addColorStop(0.85, `rgba(${c},0.08)`); ghost.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = ghost; ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
  }
  // виньетка
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = amount;
  const r = Math.hypot(w, h) / 2, v = ctx.createRadialGradient(CX, CY, r * 0.42, CX, CY, r * 1.05);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = v; ctx.fillRect(left, top, w, h);
  // зерно: шум точка в точку экрана, каждый кадр сдвинут
  if (!grain) {
    const c = document.createElement("canvas"); c.width = c.height = 192;
    const x = c.getContext("2d")!, img = x.createImageData(192, 192);
    for (let i = 0; i < img.data.length; i += 4) { const n = 128 + (Math.random() - 0.5) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = n; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0);
    grain = ctx.createPattern(c, "repeat");
  }
  if (grain) {
    const k = 1 / m.a, ox = ((frame * 73) % 192) * k, oy = ((frame * 131) % 192) * k;
    grain.setTransform(new DOMMatrix([k, 0, 0, k, ox, oy]));
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.09 * amount;
    ctx.fillStyle = grain; ctx.fillRect(left, top, w, h);
  }
  // полосы широкого экрана выезжают сверху и снизу
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const open = Math.max(168, Math.min(h, w / 2.35)), bar = Math.max(0, CY - open / 2 - top) * amount;
  ctx.fillStyle = "#000";
  ctx.fillRect(left, top, w, bar);
  ctx.fillRect(left, top + h - Math.max(0, top + h - (CY + open / 2)) * amount, w, h);
  ctx.restore();
}

export class ShipCinematic {
  readonly frames: number;
  private model: ShipModel | null;
  constructor(readonly house: number, readonly firstFrame: number, private readonly initialPlanet?: {x:number;y:number;radius:number}) {
    this.frames = CINEMATIC_FRAMES[house] ?? 330;
    this.model = models?.find((m) => m.house === house) ?? null;
  }

  private time(frame: number): number { return clamp01((frame - this.firstFrame) / this.frames); }

  /** Где планета на экране в этом плане. */
  planetView(frame: number): { x: number; y: number; radius: number } {
    const v = (PLANS[this.house] ?? PLANS[1]).planet(this.time(frame));
    if (!this.initialPlanet) return v;
    const k=smooth((frame-this.firstFrame)/60),a=this.initialPlanet;
    return {x:lerp(a.x,v.x,k),y:lerp(a.y,v.y,k),radius:lerp(a.radius,v.radius,k)};
  }

  draw(ctx: CanvasRenderingContext2D, frame: number): void {
    if (!this.model || !renderer) return;
    const t = this.time(frame), s = shotFrame(this.house, t);
    const pose: ShipPose = {
      yaw: s.yaw, pitch: s.pitch, roll: s.roll, thrust: s.thrust, time: frame / 60,
      light: s.light, ambient: 0.22,
    };
    ctx.save();
    // уходит в дымку у планеты
    const fade = Math.min(1, (1 - t) / 0.1);
    ctx.globalAlpha *= fade;
    if (s.size > 0.6) renderer.draw(ctx, this.model, pose, s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    // блик двигателей: анаморфная полоса и ореол, когда видна корма; издали корабль — светящаяся точка
    const flame = this.model.nozzles[0]?.color ?? [0.5, 0.7, 1];
    const glow = s.stern * s.thrust * fade;
    if (glow > 0.02) {
      const gx = s.sternAt[0], gy = s.sternAt[1];
      const rgb = (a: number) => `rgba(${Math.round(255 * Math.min(1, flame[0] * 0.6 + 0.4))},${Math.round(255 * Math.min(1, flame[1] * 0.6 + 0.4))},${Math.round(255 * Math.min(1, flame[2] * 0.6 + 0.4))},${a})`;
      const r = Math.max(1.6, s.size * 0.12);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = glow * (0.75 + 0.25 * Math.sin(frame * 0.9));
      const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 2.2);
      halo.addColorStop(0, rgb(0.6)); halo.addColorStop(0.25, rgb(0.2)); halo.addColorStop(1, rgb(0));
      ctx.fillStyle = halo; ctx.fillRect(gx - r * 2.2, gy - r * 2.2, r * 4.4, r * 4.4);
      ctx.translate(gx, gy); ctx.scale(9, 1);
      const streak = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.9);
      streak.addColorStop(0, "rgba(170,210,255,0.55)"); streak.addColorStop(1, "rgba(120,170,255,0)");
      ctx.fillStyle = streak; ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    ctx.restore();
  }
}
