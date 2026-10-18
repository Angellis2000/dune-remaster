// Звук: AudioWorklet с GEMS запускается, заставка играет секвенцию 0, в миссии — боевая мелодия.
import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "warning" && errors.push(m.text()));
await page.goto("http://localhost:4173/?debug&intro");
await page.setInputFiles("#rom-file", process.argv[2]);
await page.waitForFunction(() => window.dune?.sound, { timeout: 20000 });
await page.evaluate(() => window.dune.sound.start());
await page.waitForTimeout(3000);
const peaks = [];
for (let i = 0; i < 10; i++) { peaks.push(await page.evaluate(() => window.dune.sound.peak())); await page.waitForTimeout(200); }
console.log("работает:", await page.evaluate(() => window.dune.sound.running), "пики (заставка):", peaks.map((p) => p.toFixed(3)).join(" "));
await page.keyboard.press("Digit1");
await page.evaluate(() => window.dune.sound.sfx(0x26));
await page.waitForTimeout(500);
console.log("звук $26:", (await page.evaluate(() => window.dune.sound.peak())).toFixed(3));
console.log("errors:", errors);
await browser.close();
