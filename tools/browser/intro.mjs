// Заставка при включении: «SEGA», звёзды, логотипы, подлёт к планете, меню. Снимки в $OUT/intro_NNNN.png.
import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const OUT = process.env.OUT ?? "/tmp";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:4173/?debug&intro");
await page.setInputFiles("#rom-file", process.argv[2]);
await page.waitForFunction(() => window.dune?.frontend, { timeout: 20000 });
let at = 0;
for (const f of [100, 300, 500, 700, 900, 1100, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2100, 2300]) {
  await page.evaluate((n) => window.dune.frontend.stepIntro(n), f - at);
  at = f;
  await (await page.$(".frontend canvas")).screenshot({ path: `${OUT}/intro_${String(f).padStart(4, "0")}.png` });
}
await page.evaluate(() => window.dune.frontend.stepIntro(3000));
console.log("режим:", await page.evaluate(() => window.dune.frontend.mode));
console.log("errors:", errors);
await browser.close();
