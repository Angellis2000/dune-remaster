// Full HD: нативный холст, одинаковый масштаб карты/HUD, мышь, zoom, панорамирование и смена DPR.
// OUT=out/fullhd node tools/browser/fullhd.mjs rom/dune_usa.gen
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "/opt/codex/cua_node/lib/node_modules/playwright");
const out = process.env.OUT ?? "/tmp";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const near = (actual, expected, name) => assert(Math.abs(actual - expected) < 0.05, `${name}: ${actual} != ${expected}`);
try {
  for (const dpr of [1, 1.25, 1.5, 2]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: dpr });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173/?debug");
    await page.setInputFiles("#rom-file", process.argv[2]);
    await page.waitForFunction(() => window.dune?.view);
    await page.locator("#mission-select").selectOption("A9");
    const state = await page.evaluate(() => {
      const { view } = window.dune;
      const r = view.canvas.getBoundingClientRect();
      return { width: view.canvas.width, height: view.canvas.height, cssWidth: r.width, cssHeight: r.height,
        zoom: view.zoom, visible: view.viewSize(), hudWidth: document.querySelector("canvas.hud").getBoundingClientRect().width,
        map64Css: 64 * view.pixelScale / (view.canvas.width / r.width) };
    });
    assert.equal(state.width, 1920 * dpr);
    assert.equal(state.height, 1032 * dpr);
    assert.equal(state.cssHeight, 1032);
    assert.equal(state.zoom, 2, "Плотность экрана не должна менять игровой масштаб");
    assert.deepEqual(state.visible, { w: 960, h: 516 });
    near(state.map64Css, state.hudWidth, "Масштаб карты и HUD");
    await page.getByRole("button", { name: "Мышь", exact: true }).click();
    const target = await page.evaluate(() => {
      const { view, world } = window.dune;
      view.onFrame = () => {};
      const yard = world.structures.find((s) => s.type === 8 && s.house === world.player);
      const x = (yard.x + yard.w / 2) * 32;
      const y = (yard.y + yard.h / 2) * 32;
      view.centerOn(x, y);
      const r = view.canvas.getBoundingClientRect();
      return { x: r.left + (x - view.camX) * view.zoom, y: r.top + (y - view.camY) * view.zoom, worldX: x, worldY: y };
    });
    await page.mouse.click(target.x, target.y);
    const selected = await page.evaluate(() => ({ type: window.dune.view.selectedStructure?.type,
      x: window.dune.view.cursorX, y: window.dune.view.cursorY }));
    assert.equal(selected.type, 8, "Мышь не выбрала двор на HiDPI");
    near(selected.x, target.worldX, "Координата мыши X");
    near(selected.y, target.worldY, "Координата мыши Y");
    const anchor = await page.evaluate(() => {
      const { view } = window.dune;
      view.centerOn(1024, 1024);
      const r = view.canvas.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2,
        wx: view.camX + view.viewSize().w / 2, wy: view.camY + view.viewSize().h / 2 };
    });
    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.wheel(0, -100);
    await page.waitForFunction(() => window.dune.view.zoom === 3);
    const afterZoom = await page.evaluate(() => { const v = window.dune.view; return { x: v.camX + v.viewSize().w / 2, y: v.camY + v.viewSize().h / 2 }; });
    near(afterZoom.x, anchor.wx, "Точка приближения X");
    near(afterZoom.y, anchor.wy, "Точка приближения Y");
    const beforePan = await page.evaluate(() => window.dune.view.camX);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(anchor.x + 120, anchor.y);
    await page.mouse.up({ button: "middle" });
    near(await page.evaluate(() => window.dune.view.camX), beforePan - 40, "Панорамирование средней кнопкой");
    if (dpr === 1) {
      await page.evaluate(() => {
        const { world, view } = window.dune;
        const yard = world.structures.find((s) => s.type === 8 && s.house === world.player);
        view.centerOn((yard.x + yard.w / 2) * 32, (yard.y + yard.h / 2) * 32);
        view.invalidate();
      });
      await page.waitForTimeout(100);
      const png = await page.screenshot({ path: `${out}/fullhd-1920x1080.png` });
      assert.equal(png.readUInt32BE(16), 1920);
      assert.equal(png.readUInt32BE(20), 1080);
      // Перенос окна на монитор с другой плотностью без смены его CSS-размера и перезагрузки.
      const old = await page.evaluate(() => ({ zoom: window.dune.view.zoom, size: window.dune.view.viewSize(), hud: document.querySelector("canvas.hud").clientWidth }));
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 2, mobile: false });
      await page.waitForFunction(() => window.dune.view.canvas.width === 3840);
      const changed = await page.evaluate(() => ({ zoom: window.dune.view.zoom, size: window.dune.view.viewSize(), hud: document.querySelector("canvas.hud").clientWidth }));
      assert.deepEqual(changed, old);
    }
    assert.deepEqual(errors, []);
    console.log(`ok 1920×1080, DPR ${dpr}: нативный холст; масштаб карты/HUD; мышь; точка zoom; панорамирование`);
    await page.close();
  }
} finally {
  await browser.close();
}
