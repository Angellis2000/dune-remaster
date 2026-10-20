// Просмотр кораблей-маток заставки (web/ship-preview.html; dev-сервер → /ship-preview.html): крупно, вращение мышью
// по двум осям, колесо — приближение, вкладки — корабли домов, ползунок — тяга (длина пламени).
import { loadMotherships } from "./ship-assets.ts";
import { ShipRenderer } from "./ship-renderer.ts";

const renderer = new ShipRenderer();
const canvas = document.getElementById("view") as HTMLCanvasElement;
const title = document.getElementById("title")!;
const tabs = document.getElementById("tabs")!;
const spin = document.getElementById("spin") as HTMLInputElement;
const thrust = document.getElementById("thrust") as HTMLInputElement;
const models = await loadMotherships();

const DEFAULT = { yaw: 2.35, pitch: -0.32, zoom: 1.15 };
const view = { index: 0, ...DEFAULT };
const reset = () => Object.assign(view, DEFAULT);
const buttons = models.map((m, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = ["Атрейдесы", "Харконнены", "Ордосы"][i] ?? m.name;
  b.addEventListener("click", () => select(i));
  tabs.append(b);
  return b;
});
const select = (i: number) => {
  view.index = i;
  title.textContent = models[i].name;
  buttons.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
};
select(0);
(document.getElementById("reset") as HTMLButtonElement).addEventListener("click", reset);

// мышь: протяжка — поворот (по горизонтали — рыскание, по вертикали — тангаж), колесо — приближение
let drag: { x: number; y: number } | null = null;
canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  view.yaw += (e.clientX - drag.x) * 0.008;
  view.pitch = Math.max(-1.5, Math.min(1.5, view.pitch - (e.clientY - drag.y) * 0.008));
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointerup", () => { drag = null; });
canvas.addEventListener("pointercancel", () => { drag = null; });
canvas.addEventListener("wheel", (e) => { e.preventDefault(); view.zoom = Math.max(0.6, Math.min(4, view.zoom * Math.exp(-e.deltaY * 0.0012))); }, { passive: false });
canvas.addEventListener("dblclick", reset);

let last = performance.now();
const frame = (now: number) => {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (spin.checked && !drag) view.yaw += dt * 0.35;
  const rect = canvas.getBoundingClientRect(), scale = Math.min(2, devicePixelRatio || 1);
  const w = Math.max(1, Math.round(rect.width * scale)), h = Math.max(1, Math.round(rect.height * scale));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(renderer.render(models[view.index], { yaw: view.yaw, pitch: view.pitch, roll: 0, zoom: view.zoom, thrust: Number(thrust.value) / 100, time: now / 1000 }, w, h), 0, 0);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
