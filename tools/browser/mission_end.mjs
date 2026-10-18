// Конец миссии: пролёт орнитоптеров, картинка победы (или поражения: аргумент lost), текст ментата.
// Снимки в $OUT: end1_flyby, end2_picture, end3_mentat.
import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const OUT = process.env.OUT ?? "/tmp";
const result = process.argv[3] ?? "won";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:4173/?debug");
await page.setInputFiles("#rom-file", process.argv[2]);
await page.waitForFunction(() => window.dune?.world, { timeout: 20000 });
await page.waitForTimeout(500);
await page.evaluate((r) => { const g = window.dune.world.game; g.ended = r; g.onEnd(r); }, result);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/end1_flyby.png` });
await page.waitForFunction(() => !document.querySelector(".endpicture").hidden, { timeout: 10000 });
await page.waitForTimeout(3500);
await (await page.$(".endpicture canvas")).screenshot({ path: `${OUT}/end2_picture.png` });
await page.keyboard.press("Digit1");
await page.waitForTimeout(2500);
await (await page.$(".mentat canvas")).screenshot({ path: `${OUT}/end3_mentat.png` });
console.log("ментат:", await page.evaluate(() => document.querySelector(".mentat").dataset.phase));
console.log("errors:", errors);
await browser.close();
