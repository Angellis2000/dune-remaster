/**
 * Записи сетевых матчей. Игра — lockstep: всё состояние выводится из старта (зерно, карта, состав) и журнала
 * ходов, поэтому запись — это только они, а просмотр — тот же прогон симуляции наблюдателем (NetSession.play).
 * Хранятся в localStorage этого браузера (последние MAX_RECORDINGS), их можно скачать файлом и открыть снова.
 */
import type { NetCommand } from "../engine/game.ts";
import type { MatchStart } from "./session.ts";

export type RecordedTurn = [slot: number, command: NetCommand][];
export interface MatchRecording {
  v: 1;
  /** matchId сервера */
  id: string;
  /** когда сохранена (мс эпохи) */
  date: number;
  start: Omit<MatchStart, "you">;
  /** ходы с командами: [номер хода, команды] */
  log: [number, RecordedTurn][];
  /** сколько ходов прошло (запись длится turns × framesPerTurn кадров) */
  turns: number;
}

const KEY = "dune-network-recordings";
export const MAX_RECORDINGS = 8;

export function loadRecordings(): MatchRecording[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((r) => isRecording(r)) : [];
  } catch {
    return [];
  }
}

/** Сохранить (запись того же матча заменяется более полной). Не влезло — выбрасываем самые старые. */
export function saveRecording(rec: MatchRecording): void {
  let list = loadRecordings().filter((r) => r.id !== rec.id);
  list.unshift(rec);
  list = list.slice(0, MAX_RECORDINGS);
  for (;;) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return;
    } catch {
      if (list.length <= 1) return;
      list.pop();
    }
  }
}

export function deleteRecording(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadRecordings().filter((r) => r.id !== id)));
  } catch { /* хранилище недоступно */ }
}

/** Скачать запись файлом .dune-replay.json. */
export function downloadRecording(rec: MatchRecording): void {
  const blob = new Blob([JSON.stringify(rec)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const d = new Date(rec.date);
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  a.download = `dune-match-${stamp}.dune-replay.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Запись из файла или null, если это не она. */
export function parseRecording(text: string): MatchRecording | null {
  try {
    const rec = JSON.parse(text);
    return isRecording(rec) ? rec : null;
  } catch {
    return null;
  }
}

function isRecording(r: any): r is MatchRecording {
  const s = r?.start;
  return r?.v === 1 && typeof r.id === "string" && Number.isSafeInteger(r.turns) && r.turns >= 0 && Array.isArray(r.log) &&
    Number.isInteger(s?.seed) && Number.isInteger(s?.config?.map) && Number.isInteger(s?.config?.credits) && Array.isArray(s?.players) &&
    s.players.every((p: any) => Number.isInteger(p?.slot) && Number.isInteger(p?.house) && Number.isInteger(p?.team)) &&
    Number.isInteger(s.framesPerTurn) && s.framesPerTurn > 0 &&
    r.log.every((t: any) => Array.isArray(t) && Number.isInteger(t[0]) && Array.isArray(t[1]));
}

/** Длительность записи «м:сс». */
export function recordingLength(rec: MatchRecording): string {
  const seconds = Math.floor((rec.turns * rec.start.framesPerTurn) / 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
