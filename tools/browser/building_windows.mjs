// Окна зданий с геймпада: тип двора подменяется на завод, космопорт, ремонт, дворец, ветряк — снимки в $OUT.
import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const OUT = process.env.OUT ?? "/tmp";
const browser = await chromium.launch();
const errors = [];
for (const t of [3, 4, 5, 10, 11, 13, 2, 9]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:4173/?debug");
  await page.setInputFiles("#rom-file", process.argv[2]);
  await page.waitForSelector("canvas.view", { timeout: 20000 });
  await page.waitForTimeout(400);
  await page.evaluate((t) => { const { world, G } = window.dune; const s = world.structures.find((s) => s.type === 8); s.ref.o.type = t; G.houses[G.playerHouseID].structuresBuilt = 0x7ffff; world.sync(); }, t);
  await page.keyboard.press("Digit1"); await page.waitForTimeout(100); await page.keyboard.press("Digit1"); await page.waitForTimeout(300);
  const el = await page.$(".factory canvas");
  if (el && await page.isVisible(".factory")) await el.screenshot({ path: `${OUT}/win${t}.png` }); else console.log("no window", t);
  await page.close();
}
console.log(errors);
await browser.close();
