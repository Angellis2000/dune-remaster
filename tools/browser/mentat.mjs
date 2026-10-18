// Ментат: НОВАЯ ИГРА → Атрейдесы → вступление (ДА/НЕТ) → брифинг A1 (ПРИНЯТЬ/СОВЕТ) → совет → ПРИНЯТЬ → миссия.
// Снимки в $OUT (кнопка 1 = A, стрелки — крестовина).
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
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(80); } };
const shot = async (n) => (await page.$(".mentat canvas")).screenshot({ path: `${OUT}/${n}.png` });
await key("Digit1"); // НОВАЯ ИГРА
await page.waitForTimeout(200);
await key("Digit1"); // Атрейдесы
await page.waitForTimeout(600);
await shot("mt1_fade");
await page.waitForTimeout(2400);
await shot("mt2_text");
const phase = () => page.evaluate(() => document.querySelector(".mentat")?.dataset.phase);
/** A, пока экран не дойдёт до кнопок */
const skip = async () => {
  for (let i = 0; i < 40 && (await phase()) !== "buttons"; i++) {
    if ((await phase()) === "typer") await key("Digit1");
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(300);
};
await skip();
await shot("mt3_buttons");
await key("Digit1"); // ДА
await page.waitForTimeout(2500);
await shot("mt4_briefing");
await skip();
await shot("mt5_accept");
await key("ArrowDown");
await page.waitForTimeout(400);
await shot("mt6_advice_sel");
await key("Digit1");
await page.waitForTimeout(1500);
await shot("mt7_advice");
await skip();
await shot("mt8_buttons_again");
await key("Digit1"); // ПРИНЯТЬ (рамка снова наверху): дальше уход с экрана, ~11 с
await page.waitForFunction(() => document.querySelector(".mentat").hidden, { timeout: 20000 });
console.log("ментат закрыт:", await page.isHidden(".mentat"), "миссия:", await page.inputValue("#mission-select"));
console.log("errors:", errors);
await browser.close();
