// Экран «НАСТРОЙКИ» и «ВВЕДИТЕ ПАРОЛЬ» из ROM: снимки и ввод пароля с геймпада.
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
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(60); } };
const shot = async (n) => { const el = await page.$(".settings canvas"); await el.screenshot({ path: `${OUT}/${n}.png` }); };
await key("Enter"); await page.waitForTimeout(200); await shot("s1_menu");
await key("ArrowDown", 3); await key("ArrowRight", 2); await key("ArrowDown"); await key("ArrowRight"); await shot("s2_values");
await key("ArrowUp", 4); await key("Digit1"); await shot("s3_music_off");
await key("ArrowUp"); await shot("s4_wrap");
await key("ArrowUp", 2); await key("Digit1"); await page.waitForTimeout(100); await shot("s5_password");
// код с клавиатуры: экран остаётся открытым, туман выключается
await page.keyboard.type("LOOKAROUND", { delay: 30 });
await key("Digit1"); // курсор сам встал на ↵
await page.waitForTimeout(100);
console.log("after LOOKAROUND: open", await page.isVisible(".settings"), "reveal", await page.evaluate(() => window.dune.G.revealAll));
await shot("s6_code");
await key("Enter"); // Start — назад в «НАСТРОЙКИ»
await key("ArrowUp", 3); await key("Digit1"); // снова «ВВЕСТИ ПАРОЛЬ»
// S P I C E D A N C E с геймпада
const grid = "ABCDEFGHIJKLMNOPQRST";
let cur = 0;
for (const ch of "SPICEDANCE") {
  const t = grid.indexOf(ch);
  const [r0, c0, r1, c1] = [Math.floor(cur / 10), cur % 10, Math.floor(t / 10), t % 10];
  await key(r1 > r0 ? "ArrowDown" : "ArrowUp", Math.abs(r1 - r0));
  await key(c1 > c0 ? "ArrowRight" : "ArrowLeft", Math.abs(c1 - c0));
  await key("Digit1");
  cur = t;
}
await shot("s7_typed");
await key("Digit1"); // A на ↵
await page.waitForTimeout(300);
console.log("settings open:", await page.isVisible(".settings"), "mission:", await page.inputValue("#mission-select"));
console.log("errors:", errors);
await browser.close();
