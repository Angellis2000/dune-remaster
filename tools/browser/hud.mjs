// HUD справа вверху с геймпада: двор (картинка, прочность, иконка заказа), стройка ветряка (синяя полоса),
// готовый заказ (полосы нет), юнит, режим мыши (только кредиты). Снимки HUD — в $OUT.
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
await page.waitForSelector("canvas.view", { timeout: 20000 });
await page.waitForTimeout(500);
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(80); } };
const shot = async (n) => { await page.waitForTimeout(200); await (await page.$("canvas.hud")).screenshot({ path: `${OUT}/${n}.png` }); };
await key("Digit1");
await shot("hud1_yard");
console.log("panel hidden with pad:", await page.isHidden(".command"));
await key("Digit1"); await key("ArrowDown"); await key("ArrowRight"); await key("Digit1");
await page.waitForTimeout(1500);
await shot("hud2_building");
await page.evaluate(() => { for (let k = 0; k < 800; k++) window.dune.world.step(); });
await shot("hud3_ready");
await page.evaluate(() => {
  const { world, view } = window.dune;
  view.selectedStructure = null;
  view.selectedUnits.clear();
  view.selectedUnits.add(world.units.find((u) => u.house === world.player));
});
await shot("hud4_unit");
await key("KeyM");
await shot("hud5_mouse");
console.log("panel visible with mouse:", await page.isVisible(".command"));
console.log("errors:", errors);
await browser.close();
