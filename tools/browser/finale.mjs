// Финал: картинка, перекраска в цвет дома (Атрейдесы), титры. Снимки в $OUT/fin_N.png.
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
await page.waitForFunction(() => window.dune?.finale, { timeout: 20000 });
await page.evaluate(() => { window.dune.finale.open(1, () => (window.finDone = true)); window.dune.finale.stepFrames(0); });
let at = 0;
for (const f of [60, 200, 330, 450, 700, 1200, 2000]) {
  await page.evaluate((n) => window.dune.finale.stepFrames(n), f - at);
  at = f;
  await (await page.$(".finale canvas")).screenshot({ path: `${OUT}/fin_${f}.png` });
}
console.log("errors:", errors);
await browser.close();
