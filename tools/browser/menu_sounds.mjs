// Звуки меню по коду ROM: главное меню ($0B стрелка, $0C выбор), выбор дома ($19, когда рамка доехала),
// «НАСТРОЙКИ» (прошлый звук стоп, затем новый), выключение звуков (стоп всего $16).
import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const hook = () =>
  page.evaluate(() => {
    const s = window.dune.sound;
    window.cmds = [];
    if (!s.__hooked) {
      const c = s.command.bind(s);
      s.command = (cmd, ...a) => (window.cmds.push([cmd, ...a].map((x) => x.toString(16)).join(" ")), c(cmd, ...a));
      s.__hooked = true;
    }
  });
const take = () => page.evaluate(() => window.cmds.splice(0).join(", "));
const key = async (k, n = 1, ms = 80) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(ms); } };
let ok = true;
const check = (name, got, want) => { const pass = want.every((w) => got.includes(w)); ok &&= pass; console.log(pass ? "ok  " : "FAIL", name, "→", got); };

await page.goto("http://localhost:4173/?debug&title");
await page.setInputFiles("#rom-file", process.argv[2]);
await page.waitForSelector(".frontend canvas", { timeout: 20000 });
await page.waitForTimeout(300);
await hook();
await key("ArrowDown"); await key("ArrowUp");
check("главное меню: стрелка", await take(), ["10 b"]);
await key("Digit1"); await page.waitForTimeout(200);
check("главное меню: выбор", await take(), ["10 c"]);
await key("ArrowRight", 1, 600);
check("выбор дома: рамка доехала", await take(), ["10 19"]);
await key("Digit1", 1, 500);
await page.goto("http://localhost:4173/?debug");
await page.setInputFiles("#rom-file", process.argv[2]);
await page.waitForSelector("canvas.view", { timeout: 20000 });
await page.waitForTimeout(500);
await hook();
await key("Enter"); await page.waitForTimeout(200); take();
await key("ArrowDown"); await key("ArrowDown");
check("НАСТРОЙКИ: стоп прошлого и новый", await take(), ["12 19", "10 19"]);
await key("ArrowUp"); await key("Digit1"); // ЗВУКИ → выкл
check("звуки выключены: стоп всего", await take(), ["16"]);
await key("Digit1"); await key("Enter");
console.log("errors:", errors);
console.log(ok ? "ВСЁ OK" : "ЕСТЬ ОШИБКИ");
await browser.close();
