/**
 * Готовое здание строительного двора — само на курсор, пока игрок работает со двором (просьба владельца: готовое и
 * следующие из очереди ставятся без лишнего щелчка, ПКМ отменяет). Но стройка не должна забирать управление в бою
 * (аудит сети 2026-10-20, P2: после выделения двух квадроциклов достроился космопорт — выделение пропало, включилось
 * размещение). Решение отдельно от main.ts, чтобы проверять тестом (web/test/auto-placement.test.ts).
 */
import { SELECTION } from "../engine/core.ts";

export interface AutoPlacementState<Y> {
  /** двор, у которого здание достроилось в этот кадр */
  completed: Y | null;
  /** двор, с которого только что ставили: следующие готовые из его очереди идут на курсор сами */
  queued: Y | null;
  /** есть ли у двора готовое здание */
  ready: (yard: Y) => boolean;
  /** курсор над двором или его значком «ОК» */
  hovered: (yard: Y) => boolean;
  selectedStructure: Y | null;
  selectedUnits: number;
  selectionType: number;
}

/** yard — какой двор поставить на курсор (или null); keepQueue — сохранить ли цепочку очереди двора. */
export function autoPlacement<Y>(s: AutoPlacementState<Y>): { yard: Y | null; keepQueue: boolean } {
  // уже ставим здание — ничего не трогаем
  if (s.selectionType === SELECTION.PLACE) return { yard: null, keepQueue: true };
  // игрок командует армией (выделены юниты или наводит приказ): стройка не забирает курсор, цепочка обрывается —
  // готовое ждёт на дворе со значком «ОК», выбрать его можно щелчком по двору
  if (s.selectedUnits > 0 || s.selectionType === SELECTION.TARGET) return { yard: null, keepQueue: false };
  const yard = s.completed ?? (s.queued && s.ready(s.queued) ? s.queued : null);
  if (!yard) return { yard: null, keepQueue: true };
  // выделено другое здание — игрок занят им
  if (s.selectedStructure !== null && s.selectedStructure !== yard) return { yard: null, keepQueue: false };
  const chain = s.queued === yard && s.ready(yard);
  return { yard: chain || s.hovered(yard) || s.selectedStructure === yard ? yard : null, keepQueue: true };
}
