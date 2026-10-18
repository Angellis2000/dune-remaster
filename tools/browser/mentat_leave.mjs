// Уход с экрана ментата после ПРИНЯТЬ (A1): кадры через 12, как лист эмулятора. Снимки в $OUT/leave_NNN.png.
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
const key = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(80); };
const phase = () => page.evaluate(() => document.querySelector(".mentat")?.dataset.phase);
await key("Digit1"); await page.waitForTimeout(200); await key("Digit1"); // новая игра, Атрейдесы
const skip = async () => {
  for (let i = 0; i < 60 && (await phase()) !== "buttons"; i++) {
    if ((await phase()) === "typer") await key("Digit1");
    await page.waitForTimeout(150);
  }
};
await skip(); await key("Digit1"); // ДА
await page.waitForTimeout(800);
await skip(); await page.waitForTimeout(300);
// ПРИНЯТЬ и дальше по кадрам
await page.evaluate(() => { const m = window.dune.mentat; m.stepFrames(0); m.handlePad("a"); m.stepFrames(1); });
for (let i = 0; i < 60; i++) {
  await page.evaluate(() => window.dune.mentat.stepFrames(12));
  if (await page.isHidden(".mentat")) break;
  await (await page.$(".mentat canvas")).screenshot({ path: `${OUT}/leave_${String(i).padStart(3, "0")}.png` });
}
console.log("закрыт:", await page.isHidden(".mentat"), "миссия:", await page.inputValue("#mission-select"));
console.log("errors:", errors);
await browser.close();
