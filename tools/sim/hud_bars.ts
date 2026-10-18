// HUD справа вверху: рисунок полос и счётчик кредитов против данных из эмулятора.
// Полосы — тайлы VRAM ($F440 прочность, $F640 ход стройки), снятые в Genesis Plus GX на миссии 1 Атрейдесов.
// node --experimental-transform-types tools/sim/hud_bars.ts
import { barFill, barPixels, CreditsTicker } from "../../web/src/ui/hud.ts";

/** Строки 2–7 тайлов полосы в hex, как в дампе VRAM. */
function tiles(value: number, max: number, color: number): string[] {
  const px = barPixels(barFill(value, max), color);
  return [0, 1, 2, 3].map((t) => {
    const rows: string[] = [];
    for (let r = 2; r < 8; r++) {
      let s = "";
      for (let x = 0; x < 8; x++) s += px[r * 32 + t * 8 + x].toString(16);
      rows.push(s);
    }
    return rows.join(" ");
  });
}

const empty = "00000000 00000000 00000000 00000000 00000000 00000000";
const cases: [string, number, number, number, string[]][] = [
  // двор 800/800, цвет по таблице $009742 для последнего тайла — 6
  ["прочность двора", 800, 800, 6, [
    "cccccccc c6666666 c6666666 c6666666 c6666666 cccccccc",
    "cccccccc 66666666 66666666 66666666 66666666 cccccccc",
    "cccccccc 66666666 66666666 66666666 66666666 cccccccc",
    "cccccccc 6666666c 6666666c 6666666c 6666666c cccccccc",
  ]],
  // ветряк: время стройки 12, countDown>>8 = 10, 8, 6
  ["ветряк 2/12", 2, 12, 7, ["cccccc00 c7777c00 c7777c00 c7777c00 c7777c00 cccccc00", empty, empty, empty]],
  ["ветряк 4/12", 4, 12, 7, ["cccccccc c7777777 c7777777 c7777777 c7777777 cccccccc", "ccc00000 77c00000 77c00000 77c00000 77c00000 ccc00000", empty, empty]],
  ["ветряк 6/12", 6, 12, 7, ["cccccccc c7777777 c7777777 c7777777 c7777777 cccccccc", "cccccccc 7777777c 7777777c 7777777c 7777777c cccccccc", empty, empty]],
];
let bad = 0;
for (const [name, v, m, c, want] of cases) {
  const got = tiles(v, m, c);
  const ok = got.every((g, i) => g === want[i]);
  if (!ok) bad++;
  console.log(ok ? "ok  " : "FAIL", name, ok ? "" : JSON.stringify(got));
}

// Счётчик $011F38: двор заказал ветряк (990 → 965 → … по 25 кредитов). Состояния (показано, сдвиг)
// после каждого вызова в эмуляторе, начиная с (990, 0).
const ticker = new CreditsTicker();
Object.assign(ticker as unknown as Record<string, number>, { old: 990, offset: 0, reached: 990 });
const trace: [number, number, number][] = [
  // кредиты, old ($FFD6C0), offset ($FFD6BC)
  [965, 990, -7], [965, 989, -6], [965, 988, -4], [965, 987, -2], [965, 987, -8],
  [965, 986, -6], [965, 985, -4], [965, 984, -1], [965, 984, -6], [965, 983, -3],
];
const t = ticker as unknown as { old: number; offset: number };
const got: [number, number][] = trace.map(([c]) => (ticker.tick(c), [t.old, t.offset]));
const okT = got.every(([o, f], i) => o === trace[i][1] && f === trace[i][2]);
if (!okT) bad++;
console.log(okT ? "ok  " : "FAIL", "счётчик кредитов", okT ? "" : JSON.stringify(got));

// Вызовы $00A7DC в Genesis Plus GX: каждый четвёртый шаг, $35 при расходе, $34 при приходе.
for (const [start, target, sound] of [[990, 965, 0x35], [965, 990, 0x34]]) {
  const t = new CreditsTicker();
  Object.assign(t, { old: start, reached: start });
  const events: number[][] = [];
  let frame = 0;
  t.onSound = (id) => events.push([frame, id]);
  for (; frame < 9; frame++) t.tick(target);
  const ok = JSON.stringify(events) === JSON.stringify([[0, sound], [4, sound], [8, sound]]);
  if (!ok) bad++;
  console.log(ok ? "ok  " : "FAIL", `щелчки ${start} → ${target}`, ok ? "" : JSON.stringify(events));
  for (; frame < 1000; frame++) t.tick(target);
  const settled = events.length;
  for (; frame < 1100; frame++) t.tick(target);
  if (events.length !== settled) {
    bad++;
    console.log("FAIL щелчки после остановки счётчика");
  }
}
process.exit(bad ? 1 : 0);
