/**
 * Виртуальный геймпад Mega Drive. Клавиатура как в оригинале:
 *   стрелки — крестовина, 1 — A, 2 — B, 3 — C, Enter — Start.
 * В режиме мыши: левая кнопка — A, правая — C (это делает MapView).
 */
export type Button = "up" | "down" | "left" | "right" | "a" | "b" | "c" | "start";

const KEYS: Record<string, Button> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Digit1: "a",
  Numpad1: "a",
  Digit2: "b",
  Numpad2: "b",
  Digit3: "c",
  Numpad3: "c",
  Enter: "start",
  NumpadEnter: "start",
};

export const BUTTON_LABEL: Record<Button, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  a: "A",
  b: "B",
  c: "C",
  start: "Start",
};

export class Pad {
  private held = new Set<Button>();
  private listeners: ((b: Button) => void)[] = [];

  constructor() {
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const b = KEYS[e.code];
      if (!b) return;
      e.preventDefault();
      if (!e.repeat) this.press(b);
      this.held.add(b);
    });
    window.addEventListener("keyup", (e) => {
      const b = KEYS[e.code];
      if (b) this.held.delete(b);
    });
    window.addEventListener("blur", () => this.held.clear());
  }

  isHeld(b: Button): boolean {
    return this.held.has(b);
  }

  /** Нажатие кнопки (из клавиатуры или мыши). */
  press(b: Button): void {
    for (const fn of this.listeners) fn(b);
  }

  onPress(fn: (b: Button) => void): void {
    this.listeners.push(fn);
  }
}
