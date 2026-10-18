// Регрессия: банк заставки нельзя использовать для звуков игры (seq $19 ломала драйвер).
// node --experimental-transform-types tools/sim/sound_recovery.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GEMS, SoundMachine } from "../../web/src/sound/gems.ts";
const rom = new Uint8Array(readFileSync(new URL("../../rom/dune_usa.gen", import.meta.url)));
const rate = 44100;
const render = (machine: SoundMachine, seconds: number) => {
  const left = new Float32Array(Math.round(seconds * rate)), right = new Float32Array(left.length);
  for (let i = 0; i < left.length; i += 1024) machine.render(left.subarray(i, i + 1024), right.subarray(i, i + 1024), rate);
  return left;
};
const ac = (buffer: Float32Array) => {
  const mean = buffer.reduce((a, b) => a + b, 0) / buffer.length;
  return Math.sqrt(buffer.reduce((a, b) => a + (b - mean) ** 2, 0) / buffer.length);
};
const machine = new SoundMachine(rom);
machine.command(GEMS.START, 25); // курсор настроек, сразу после холодного запуска, без музыкальной «разминки»
assert(ac(render(machine, 0.8)) > 0.005, "Короткий звук меню не слышен в игровом банке");
// Раньше уже пять START/STOP $19 блокировали драйвер. Теперь проверяем и заполненное кольцо.
for (let i = 0; i < 120; i++) { machine.command(GEMS.START, 25); machine.command(GEMS.STOP, 25); }
render(machine, 2);
machine.command(GEMS.STOP_ALL);
render(machine, 0.5);
machine.command(GEMS.START, 1);
const first = render(machine, 2);
const second = render(machine, 2);
assert(ac(first) > 0.02 && ac(second) > 0.02, "Музыка не восстановилась после серии звуков");
assert.notDeepEqual(first.slice(-2048), second.slice(-2048), "Повторяется один фрагмент");
machine.command(GEMS.STOP_ALL);
render(machine, 2);
assert(ac(render(machine, 0.5)) < 0.003, "STOP_ALL не останавливает звук");
machine.command(GEMS.START, 9);
assert(ac(render(machine, 3)) > 0.02, "Новая музыка не стартует после STOP_ALL");
console.log("ok игровой банк: холодный SFX $19, 240 команд, новая музыка, STOP_ALL, повторный запуск");
const intro = new SoundMachine(rom, "intro");
intro.command(GEMS.START, 0);
render(intro, 4);
assert(ac(render(intro, 3)) > 0.005, "Музыка заставки не играет");
intro.command(GEMS.START, 25); // недопустимый номер в этом банке не должен испортить драйвер
intro.command(GEMS.STOP_ALL);
render(intro, 2);
intro.command(GEMS.START, 0);
render(intro, 4);
assert(ac(render(intro, 3)) > 0.005, "Недопустимая команда сломала банк заставки");
console.log("ok банк заставки: музыка 0, защита от неверного номера, остановка и повторный запуск");
