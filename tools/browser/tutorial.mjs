// Обучение: ролик по шагам (A — дальше). Снимки в $OUT/tut_NN.png.
import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const OUT = process.env.OUT ?? "/tmp";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:4173/?debug&title");
await page.setInputFiles("#rom-file", process.argv[2]);
await page.waitForSelector(".frontend canvas", { timeout: 20000 });
await page.waitForTimeout(300);
await page.keyboard.press("ArrowUp"); await page.waitForTimeout(80);
await page.keyboard.press("Digit1"); await page.waitForTimeout(200);
await page.evaluate(() => window.dune.tutorial.stepFrames(120));
for (let i = 0; i < Number(process.env.STEPS ?? 40); i++) {
  await (await page.$(".tutorial canvas")).screenshot({ path: `${OUT}/tut_${String(i).padStart(2, "0")}.png` });
  await page.evaluate(() => { const t = window.dune.tutorial; t.handlePad("a"); t.stepFrames(60); });
  if (await page.isHidden(".tutorial")) break;
}
console.log("закрыто:", await page.isHidden(".tutorial"));
console.log("errors:", errors);
await browser.close();
