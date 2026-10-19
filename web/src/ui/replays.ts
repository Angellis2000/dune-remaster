/**
 * Записи сетевых матчей: список сохранённых в этом браузере (net/replay.ts), просмотр, скачивание, удаление и
 * открытие файла записи. Во время просмотра — полоска управления: пауза, скорость, время, выход.
 */
import { HOUSE_LETTERS, HOUSE_NAMES } from "../net/session.ts";
import { deleteRecording, downloadRecording, loadRecordings, parseRecording, recordingLength, type MatchRecording } from "../net/replay.ts";

const houseName = (house: number) => HOUSE_NAMES[Object.keys(HOUSE_LETTERS).find((k) => HOUSE_LETTERS[k] === house) ?? ""] ?? "Дом";
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const button = (text: string, onClick: () => void, cls = "") => {
  const b = el("button", cls, text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
};

export class ReplayList {
  readonly root = el("div", "network-replays");
  private readonly list = el("div", "network-replay-list");
  private readonly message = el("p", "network-replay-message");
  constructor(private readonly play: (rec: MatchRecording) => void) {
    this.root.hidden = true;
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Записи матчей");
    const file = el("input");
    file.type = "file";
    file.accept = ".json,application/json";
    file.hidden = true;
    file.addEventListener("change", async () => {
      const f = file.files?.[0];
      file.value = "";
      if (!f) return;
      const rec = parseRecording(await f.text());
      if (!rec) { this.message.textContent = "Это не запись матча Dune Remaster."; return; }
      this.close();
      this.play(rec);
    });
    const actions = el("div", "network-actions");
    actions.append(button("Открыть файл…", () => file.click()), button("Закрыть", () => this.close()));
    this.root.append(el("h2", "", "ЗАПИСИ МАТЧЕЙ"), el("p", "", "Последние сетевые матчи сохраняются в этом браузере. Запись — это старт и приказы игроков: просмотр заново проигрывает матч."), this.list, this.message, actions, file);
    this.root.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); this.close(); } });
  }
  open(): void {
    this.render();
    this.root.hidden = false;
    this.root.querySelector<HTMLButtonElement>("button")?.focus();
  }
  close(): void {
    this.root.hidden = true;
    this.message.textContent = "";
  }
  private render(): void {
    this.list.replaceChildren();
    const recs = loadRecordings();
    if (!recs.length) { this.list.append(el("p", "network-empty-rooms", "Записей пока нет. Сыграйте сетевой матч — он сохранится сам.")); return; }
    for (const rec of recs) {
      const row = el("div", "network-replay");
      const who = rec.start.players.map((p) => `${p.ai ? "🖥 " : ""}${p.name} (${houseName(p.house)}, ком. ${p.team + 1})`).join(" · ");
      const info = el("div", "network-replay-info");
      info.append(el("strong", "", `${new Date(rec.date).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })} · карта ${rec.start.config.map} · ${recordingLength(rec)}`), el("span", "", who));
      row.append(info, button("Смотреть", () => { this.close(); this.play(rec); }, "network-create"), button("Скачать", () => downloadRecording(rec)),
        button("Удалить", () => { deleteRecording(rec.id); this.render(); }));
      this.list.append(row);
    }
  }
}

/** Полоска просмотра записи. */
export class ReplayBar {
  readonly root = el("div", "replay-bar");
  private readonly pause: HTMLButtonElement;
  private readonly time = el("span", "replay-time");
  private readonly speeds: HTMLButtonElement[] = [];
  constructor(private readonly control: { paused: () => boolean; setPaused: (v: boolean) => void; speed: () => number; setSpeed: (v: number) => void; exit: () => void }) {
    this.root.hidden = true;
    this.pause = button("❚❚", () => { control.setPaused(!control.paused()); this.update(0, 0); });
    this.pause.title = "Пауза";
    this.root.append(el("strong", "", "ЗАПИСЬ"), this.pause);
    for (const s of [1, 2, 4, 8]) {
      const b = button(`×${s}`, () => { control.setSpeed(s); this.update(0, 0); });
      b.dataset.speed = String(s);
      this.speeds.push(b);
      this.root.append(b);
    }
    this.root.append(this.time, button("Выйти", () => control.exit()));
  }
  update(frame: number, total: number): void {
    this.pause.textContent = this.control.paused() ? "▶" : "❚❚";
    for (const b of this.speeds) b.setAttribute("aria-pressed", String(Number(b.dataset.speed) === this.control.speed()));
    if (total > 0) {
      const t = (f: number) => { const s = Math.floor(Math.min(f, total) / 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
      this.time.textContent = frame >= total ? `${t(total)} · конец записи` : `${t(frame)} / ${t(total)}`;
    }
  }
}
