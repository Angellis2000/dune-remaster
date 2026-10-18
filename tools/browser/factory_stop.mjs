// СТОП в окне здания по коду MD: отменяет заказ с возвратом денег; РЕМОНТ только включает ремонт.
import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:4173/?debug");
await page.setInputFiles("#rom-file", process.argv[2]);
await page.waitForSelector("canvas.view", { timeout: 20000 });
await page.waitForTimeout(500);
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(80); } };
const st = () => page.evaluate(() => { const { world, G } = window.dune; const s = world.structures.find((s) => s.type === 8).ref; return { spent: s.spent, credits: G.houses[G.playerHouseID].credits, prod: world.game.production(s), repairing: s.o.flags.repairing, hp: s.o.hitpoints }; });
const before = await st();
await key("Digit1"); await key("Digit1"); await key("ArrowDown"); await key("ArrowRight"); await key("Digit1");
await page.evaluate(() => { for (let k = 0; k < 200; k++) window.dune.world.step(); });
const mid = await st();
await key("Digit1"); await page.waitForTimeout(150); // окно снова (двор выбран)
await key("ArrowRight", 2); await key("Digit1"); // СТОП
const after = await st();
console.log("до:", before.credits, "в стройке:", mid.credits, JSON.stringify(mid.prod), "после СТОП:", after.credits, JSON.stringify(after.prod));
// MD $0103AA возвращает ровно потраченное на заказ ($5A); за энергию за это время списывается отдельно
console.log(after.prod === null && after.credits === mid.credits + mid.spent ? "ok   СТОП вернул потраченное" : "FAIL СТОП", mid.spent);
await page.evaluate(() => { const s = window.dune.world.structures.find((s) => s.type === 8).ref; s.o.hitpoints -= 100; });
await key("ArrowLeft"); await key("Digit1"); // РЕМОНТ
const rep = await st();
await page.waitForTimeout(600); // за это время окно пересчитывает список — ремонт не должен слететь
await key("Digit1");
const rep2 = await st();
console.log(rep.repairing && rep2.repairing ? "ok   РЕМОНТ включает и не выключает" : "FAIL РЕМОНТ", JSON.stringify({ r1: rep.repairing, r2: rep2.repairing }));
console.log("errors:", errors);
await browser.close();
