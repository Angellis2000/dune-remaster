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
// миссия Харконненов 3: есть бой и авиация
await page.selectOption("#mission-select", process.argv[3] ?? "H4");
await page.waitForTimeout(500);
await page.evaluate(() => window.dune.world.game.cheat("LOOKAROUND"));
const info = await page.evaluate(() => {
  const w = window.dune.world;
  const mine = w.units.filter((u) => u.house === w.player);
  const enemy = w.units.filter((u) => u.house !== w.player);
  return { mine: mine.map((u) => [u.type, Math.round(u.x), Math.round(u.y)]), enemy: enemy.slice(0, 8).map((u) => [u.type, Math.round(u.x), Math.round(u.y)]), es: w.structures.filter((s) => s.house !== w.player).map((s) => [s.type, s.x, s.y]) };
});
console.log(JSON.stringify(info));
// все свои юниты атакуют ближайшее вражеское здание
await page.evaluate(() => {
  const { world: w, G } = window.dune;
  const target = w.structures.find((s) => s.house !== w.player);
  const own = w.units.filter((u) => u.house === w.player);
  const packed = (target.y << 6) | target.x;
  for (const u of own) w.game.order(u.ref, 0 /* ATTACK */, packed);
  window.dune.view.centerOn?.(target.x * 32, target.y * 32);
});
for (let i = 0; i < 40; i++) {
  await page.evaluate(() => { for (let k = 0; k < 200; k++) window.dune.world.step(); const u = window.dune.world.units.find((u) => u.house === window.dune.world.player); if (u) window.dune.view.centerOn(u.x, u.y); });
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({ blasts: window.dune.world.blasts.length, smoke: window.dune.world.units.filter((u) => u.smoke >= 0).length, dust: window.dune.world.units.filter((u) => u.dust >= 0).length }));
  console.log(i, JSON.stringify(st));
  if (st.blasts || st.smoke) { await page.screenshot({ path: `${OUT}/fx_${i}.png` }); }
}
console.log("errors:", errors);
await browser.close();
