// Экран итогов: числа как в проверке эмулятора (очки 1234, спайс 1500/900, войска 25/3, постройки 7/40),
// победа в A1 → страница с паролем. Снимки в $OUT/score_N.png.
import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const OUT = process.env.OUT ?? "/tmp";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:4173/?debug");
await page.setInputFiles("#rom-file", process.argv[2]);
await page.waitForFunction(() => window.dune?.world, { timeout: 20000 });
await page.evaluate(() => {
  const s = window.dune.scoreScreen;
  s.open({ mission: 1, house: 1, won: true, score: 1234, time: 0, spice: [1500, 900], units: [25, 3], structures: [7, 40] }, () => (window.scoreDone = true));
  s.stepFrames(0);
});
const shot = async (n) => (await page.$(".scorescreen canvas")).screenshot({ path: `${OUT}/score_${n}.png` });
const step = (n) => page.evaluate((n) => window.dune.scoreScreen.stepFrames(n), n);
await step(60); await shot(1);
await step(400); await shot(2);
await step(400); await shot(3);
await page.evaluate(() => window.dune.scoreScreen.handlePad("a"));
await step(20); await shot(4);
await step(100); await shot(5);
await page.evaluate(() => window.dune.scoreScreen.handlePad("a"));
await step(60);
console.log("закрыт:", await page.isHidden(".scorescreen"), "done:", await page.evaluate(() => window.scoreDone));
console.log("errors:", errors);
await browser.close();
