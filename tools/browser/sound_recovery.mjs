// Реальный AudioWorklet: банки, тишина/возврат музыки, фонотека, очередь звуков и смена боевой мелодии.
// node tools/browser/sound_recovery.mjs rom/dune_usa.gen
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "/opt/codex/cua_node/lib/node_modules/playwright");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const base = process.env.GAME_URL ?? "http://127.0.0.1:5173/";
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "warning" && /звук недоступен/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${base}${base.includes("?") ? "&" : "?"}debug&intro`);
  await page.setInputFiles("#rom-file", process.argv[2]);
  await page.waitForFunction(() => window.dune?.sound);
  // Настоящее нажатие разрешает AudioContext; оно же пропускает заставку.
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => window.dune.sound.running);
  await page.evaluate(() => {
    window.audioFailures = [];
    window.dune.sound.node.addEventListener("processorerror", () => window.audioFailures.push("AudioWorklet processorerror"));
  });
  const energy = async (ms = 400) => page.evaluate(async (duration) => {
    const analyser = window.dune.sound.analyser;
    const data = new Float32Array(analyser.fftSize);
    let maximum = 0;
    for (let at = 0; at < duration; at += 20) {
      analyser.getFloatTimeDomainData(data);
      const mean = data.reduce((a, b) => a + b, 0) / data.length;
      maximum = Math.max(maximum, Math.sqrt(data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return maximum;
  }, ms);
  assert.equal(await page.evaluate(() => window.dune.sound.bank), "intro");
  await page.waitForTimeout(4500); // В самой секвенции заставки есть пауза перед первыми нотами.
  assert(await energy(800) > 0.003, "Музыка заставки не слышна");
  await page.evaluate(() => window.dune.sound.setMusic(false));
  await page.waitForTimeout(1000);
  assert(await energy() < 0.003, "Музыка 0 не отключилась");
  await page.evaluate(() => window.dune.sound.setMusic(true));
  await page.waitForTimeout(4500);
  assert(await energy(800) > 0.003, "Музыка 0 не вернулась");
  console.log("ok заставка: банк intro, реальный звук, выключение и возврат музыки 0");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Digit1");
  await page.waitForFunction(() => !document.querySelector(".options").hidden);
  assert.equal(await page.evaluate(() => window.dune.sound.bank), "game");
  await page.evaluate(() => window.dune.sound.ui(25));
  assert(await energy(500) > 0.003, "Звук меню $19 отсутствует");
  await page.evaluate(() => {
    const sound = window.dune.sound;
    for (let i = 0; i < 40; i++) { sound.startSong(25); sound.stopSong(25); }
    sound.previewMusic(9);
  });
  await page.waitForTimeout(1000);
  assert(await energy(800) > 0.01, "После серии SFX фонотека не играет");
  await page.evaluate(() => window.dune.sound.setMusic(false));
  await page.waitForTimeout(1500);
  assert(await energy() < 0.003, "Фонотека продолжает играть после выключения музыки");
  await page.evaluate(() => window.dune.sound.setMusic(true));
  await page.waitForTimeout(600);
  assert(await energy(600) > 0.01, "Музыка фонотеки не включается обратно");
  console.log("ok настройки: банк game, курсор $19, серия SFX, фонотека, выключение и возврат");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => window.dune.sound.bank), "intro");
  await page.keyboard.press("Digit1");
  await page.waitForFunction(() => window.dune.frontend.mode === "house");
  assert.equal(await page.evaluate(() => window.dune.sound.bank), "game");
  await page.waitForTimeout(700);
  assert(await energy(600) > 0.01, "На выборе дома нет музыки");
  // Миссия через штатный список, затем ускоряем только таймер окончания трека.
  await page.locator("#mission-select").selectOption("A1");
  const before = await page.evaluate(() => {
    const d = window.dune;
    d.frontend.close(); d.sound.battleLeft = 1;
    return d.sound.music;
  });
  await page.waitForFunction((old) => window.dune.sound.music !== old && window.dune.sound.battleLeft > 7000, before);
  await page.waitForTimeout(600);
  assert(await energy(600) > 0.01, "Следующая боевая мелодия не звучит");
  // Выключение эффектов не должно выключать музыку; обе настройки вместе дают тишину.
  await page.evaluate(() => window.dune.sound.setSound(false));
  await page.waitForTimeout(500);
  assert(await energy(600) > 0.01, "Выключение эффектов потеряло музыку");
  await page.evaluate(() => window.dune.sound.setMusic(false));
  await page.waitForTimeout(1500);
  assert(await energy() < 0.003, "Обе настройки выключены, но звук остался");
  await page.evaluate(() => window.dune.sound.setMusic(true));
  await page.waitForTimeout(600);
  assert(await energy(600) > 0.01, "Музыка миссии не восстановилась");
  assert.deepEqual(await page.evaluate(() => window.audioFailures), []);
  assert.deepEqual(errors, []);
  console.log("ok выбор дома и миссия: музыка есть, смена трека по таймеру, независимые настройки, AudioWorklet без ошибок");
} finally { await browser.close(); }
