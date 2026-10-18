/** Нативный холст меню; координаты интерфейса остаются 320×224 внутри широкого экрана. */
import { SCREEN_H, SCREEN_W } from "./screens.ts";

export function menuLayout(canvas: HTMLCanvasElement): { scale: number; x: number; y: number } {
  const scale = Math.min(canvas.width / SCREEN_W, canvas.height / SCREEN_H);
  return { scale, x: (canvas.width - SCREEN_W * scale) / 2, y: (canvas.height - SCREEN_H * scale) / 2 };
}

export function prepareMenu(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const l = menuLayout(canvas);
  ctx.setTransform(l.scale, 0, 0, l.scale, l.x, l.y);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

export function menuPoint(canvas: HTMLCanvasElement, e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const l = menuLayout(canvas);
  return { x: ((e.clientX - rect.left) * canvas.width / rect.width - l.x) / l.scale,
    y: ((e.clientY - rect.top) * canvas.height / rect.height - l.y) / l.scale };
}

/** Текст растеризуется сразу в физическое разрешение, без промежуточной картинки 320×224. */
export function menuText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  options: { size?: number; color?: string; maxWidth?: number; align?: CanvasTextAlign; serif?: boolean; weight?: string; shadow?: boolean } = {}): void {
  ctx.save();
  const size = options.size ?? 8;
  ctx.font = `${options.weight ?? "600"} ${size}px ${options.serif ? 'Georgia, "Times New Roman", serif' : 'Arial, sans-serif'}`;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "top";
  if (options.shadow !== false) {
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 1.4;
    ctx.shadowOffsetX = 0.45;
    ctx.shadowOffsetY = 0.65;
  }
  ctx.fillStyle = options.color ?? "#fff9e9";
  // Перевод MD смешивает похожие латинские и кириллические глифы; в обычном шрифте нужны кириллические.
  const cyrillic: Record<string, string> = { A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х" };
  const display = text.replace(/[A-ZА-ЯЁ]+/g, (word) => /[А-ЯЁ]/.test(word)
    ? word.replace(/[ABCEHKMOPTX]/g, (letter) => cyrillic[letter]) : word);
  ctx.fillText(display, x, y, options.maxWidth ?? 320);
  ctx.restore();
}

export function menuArrow(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
  ctx.save();
  ctx.fillStyle = `rgba(255,244,200,${0.65 + 0.35 * Math.sin(frame / 12) ** 2})`;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 1);
  ctx.lineTo(x + 6, y + 4);
  ctx.lineTo(x + 1, y + 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
