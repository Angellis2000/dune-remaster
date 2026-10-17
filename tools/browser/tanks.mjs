import { createRequire } from "module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const OUT = process.env.OUT ?? "/tmp";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:4173/?debug");
await page.setInputFiles("#rom-file", process.argv[2]);
await page.waitForSelector("canvas.view", { timeout: 20000 });
await page.waitForTimeout(500);
const url = await page.evaluate(() => {
  const { sprites } = window.dune;
  const c = document.createElement("canvas"); c.width = 8 * 40 * 3; c.height = 4 * 40 * 3;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.fillStyle = "#c8a060"; g.fillRect(0, 0, c.width, c.height);
  g.scale(3, 3);
  const types = [9, 10, 11, 12];
  types.forEach((t, row) => {
    for (let d = 0; d < 8; d++) {
      const refs = sprites.unitFrames(t, d * 32, 0, d * 32, {});
      for (const r of refs) { const im = sprites.get(r, 1); g.drawImage(im.canvas, d * 40 + 20 + im.ox, row * 40 + 20 + im.oy); }
    }
  });
  return c.toDataURL();
});
const fs = await import("node:fs");
fs.writeFileSync(`${OUT}/tanks.png`, Buffer.from(url.split(",")[1], "base64"));
await browser.close();
