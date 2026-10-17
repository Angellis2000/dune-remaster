// Режим мыши: выбор двора, двойной щелчок по заказу не ставит стройку на паузу.
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
await page.keyboard.press("KeyM");
// щелчок по двору: экранные координаты центра двора
const p = await page.evaluate(() => {
  const { view, world } = window.dune;
  const s = world.structures.find((s) => s.type === 8);
  const r = view.canvas.getBoundingClientRect();
  const z = view.zoom;
  return { x: r.left + ((s.x + 1) * 32 * z - view.camX * z) / (view.canvas.width / r.width), y: r.top + ((s.y + 1) * 32 * z - view.camY * z) / (view.canvas.height / r.height) };
});
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(300);
const btn = page.locator(".command-list button", { hasText: "Ветряк" });
await btn.dblclick();
await page.waitForTimeout(1500);
const prod = await page.evaluate(() => { const { world } = window.dune; const s = world.structures.find((s) => s.type === 8); return world.game.production(s.ref); });
console.log("production:", JSON.stringify(prod));
console.log("panel:", (await page.$eval(".command", (e) => e.innerText.replace(/\n+/g, " | "))).slice(0, 160));
await page.screenshot({ path: `${OUT}/mouse_build.png` });
console.log("errors:", errors);
await browser.close();
