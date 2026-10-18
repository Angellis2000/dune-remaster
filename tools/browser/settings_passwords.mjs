import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const OUT = process.env.OUT ?? "/tmp";
const rom = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto("http://localhost:4173/?debug");
await page.setInputFiles("#rom-file", rom);
await page.waitForSelector("canvas.view", { timeout: 20000 });
await page.waitForTimeout(800);
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(60); } };
const hold = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
await page.screenshot({ path: `${OUT}/p0.png` });
// Start -> настройки
await key("Enter");
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/p1_settings.png` });
console.log("settings visible:", await page.isVisible(".settings.options"));
await key("ArrowDown", 5); // ВВЕСТИ ПАРОЛЬ
await key("Digit1");
// с клавиатуры: после 10-й буквы курсор сам на ↵, A — ввод; коды экран не закрывают
await page.keyboard.type("LOOKAROUND", { delay: 30 });
await key("Digit1");
await page.waitForTimeout(300);
console.log("after cheat settings visible:", await page.isVisible(".settings.options"), "reveal:", await page.evaluate(() => window.dune.G.revealAll));
await page.screenshot({ path: `${OUT}/p2_lookaround.png` });
await key("Enter"); // Start — назад в «НАСТРОЙКИ», курсор снова на первом пункте
await key("ArrowDown", 5);
await key("Digit1");
await page.keyboard.type("SPLURGEOLA", { delay: 30 });
await key("Digit1");
await page.waitForTimeout(1500);
await page.locator(".settings.options canvas").screenshot({ path: `${OUT}/p3_splurge.png` });
console.log("credits:", await page.evaluate(() => window.dune.G.houses?.[window.dune.G.playerHouseID]?.credits));
// level password
await key("Enter");
await key("ArrowDown", 5);
await key("Digit1");
await page.keyboard.type("SPICEDANCE", { delay: 30 });
await key("Digit1");
await page.waitForTimeout(500);
console.log("mission:", await page.inputValue("#mission-select"));
await page.screenshot({ path: `${OUT}/p3_A3.png` });
console.log("errors:", errors);
await browser.close();
