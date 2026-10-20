// Предпросмотр 3D-кораблей заставки (web/ship-preview.html, в dev-сервере: /ship-preview.html).
import { shipModelToObj, shipModels } from "./ship-models.ts";
import { ShipRenderer } from "./ship-renderer.ts";

const renderer = new ShipRenderer();
const host = document.getElementById("ships")!;
const spin = document.getElementById("spin") as HTMLInputElement;
const pitch = document.getElementById("pitch") as HTMLInputElement;
const roll = document.getElementById("roll") as HTMLInputElement;
const thrust = document.getElementById("thrust") as HTMLInputElement;

const download = (name: string, text: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const views = shipModels().map((model, i) => {
  const figure = document.createElement("figure");
  const canvas = document.createElement("canvas");
  const caption = document.createElement("figcaption");
  const title = document.createElement("strong");
  title.textContent = model.name;
  const obj = document.createElement("button");
  obj.textContent = "Скачать OBJ";
  obj.addEventListener("click", () => {
    const { obj: o, mtl } = shipModelToObj(model);
    download(`${model.id}.obj`, o);
    download(`${model.id}.mtl`, mtl);
  });
  caption.append(title, obj);
  figure.append(canvas, caption);
  host.append(figure);
  const view = { model, canvas, yaw: 0.9 + i * 0.7, drag: null as number | null };
  canvas.addEventListener("pointerdown", (e) => { view.drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => { if (view.drag === null) return; view.yaw += (e.clientX - view.drag) * 0.01; view.drag = e.clientX; });
  canvas.addEventListener("pointerup", () => { view.drag = null; });
  return view;
});

let last = performance.now();
const frame = (now: number) => {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  for (const v of views) {
    if (spin.checked && v.drag === null) v.yaw += dt * 0.5;
    const rect = v.canvas.getBoundingClientRect(), scale = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width * scale)), h = Math.max(1, Math.round(rect.height * scale));
    if (v.canvas.width !== w || v.canvas.height !== h) { v.canvas.width = w; v.canvas.height = h; }
    const ctx = v.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(renderer.render(v.model, { yaw: v.yaw, pitch: (Number(pitch.value) * Math.PI) / 180, roll: (Number(roll.value) * Math.PI) / 180, thrust: Number(thrust.value) / 100, time: now / 1000 }, w, h), 0, 0);
  }
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
