import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const OUT = process.env.OUT ?? "/tmp";
const [from, to] = [Number(process.argv[3]), Number(process.argv[4])];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:4173/?debug");
await page.setInputFiles("#rom-file", process.argv[2]);
await page.waitForSelector("canvas.view", { timeout: 20000 });
const url = await page.evaluate(([from, to]) => {
  const { sprites } = window.dune;
  const n = to - from + 1, cols = 10;
  const c = document.createElement("canvas"); c.width = cols * 48 * 3; c.height = Math.ceil(n / cols) * 56 * 3;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.fillStyle = "#c8a060"; g.fillRect(0, 0, c.width, c.height);
  g.scale(3, 3); g.font = "7px monospace";
  for (let i = 0; i < n; i++) {
    const f = from + i, x = (i % cols) * 48, y = Math.floor(i / cols) * 56;
    g.fillStyle = "#000"; g.fillText(String(f), x + 2, y + 8);
    if (!sprites.hasFrame(f)) continue;
    const im = sprites.get({ frame: f, flip: 0 }, 1);
    g.drawImage(im.canvas, x + 24 + im.ox, y + 32 + im.oy);
  }
  return c.toDataURL();
}, [from, to]);
(await import("node:fs")).writeFileSync(`${OUT}/frames.png`, Buffer.from(url.split(",")[1], "base64"));
await browser.close();
