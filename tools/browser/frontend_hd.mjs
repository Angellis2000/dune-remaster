// HD-заставка и широкое меню: нативное разрешение, гладкий текст, мышь, клавиатура, пароль и fallback.
// OUT=out/hd-frontend node tools/browser/frontend_hd.mjs rom/dune_usa.gen
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "/opt/codex/cua_node/lib/node_modules/playwright");
const out = process.env.OUT ?? "/tmp";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const base = process.env.GAME_URL ?? "http://127.0.0.1:5173/";
try {
  for (const [width, height, dpr] of [[1920, 1080, 1], [1920, 1080, 2], [2560, 1080, 1], [1024, 768, 1]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(`${base}${base.includes("?") ? "&" : "?"}debug&title`);
    await page.setInputFiles("#rom-file", process.argv[2]);
    await page.waitForFunction(() => window.dune?.frontend?.isOpen);
    const state = await page.evaluate(() => {
      const frontend = window.dune.frontend, c = frontend.canvas, r = c.getBoundingClientRect();
      const fonts = [], images = [];
      const ctx = c.getContext("2d"), fillText = ctx.fillText.bind(ctx), drawImage = ctx.drawImage.bind(ctx);
      ctx.fillText = (...args) => { fonts.push(args[0]); fillText(...args); };
      ctx.drawImage = (...args) => { images.push(args); drawImage(...args); };
      frontend.draw(); ctx.fillText = fillText; ctx.drawImage = drawImage;
      const bg = images.find((args) => args[0] === frontend.gfx.art.get("arrakis"));
      return { w: c.width, h: c.height, cssW: r.width, cssH: r.height, fonts,
        backgrounds: bg ? [bg[3] / bg[4], bg[0].width / bg[0].height] : null,
        loaded: ["arrakis", "houses", "sega", "publishers", "ships", "settings", "password"].every((key) => frontend.gfx.art.get(key)) };
    });
    assert(state.loaded, "Не все HD-экраны загрузились");
    assert.equal(state.w, Math.round(state.cssW * dpr));
    assert.equal(state.h, Math.round(state.cssH * dpr));
    assert.equal(state.cssW, width, "Экран меню остался узким");
    assert(state.fonts.includes("НОВАЯ ИГРА"), "Пункты не рисуются гладким текстом");
    assert(state.fonts.includes("The Battle for Arrakis"));
    assert(state.backgrounds && Math.abs(state.backgrounds[0] - state.backgrounds[1]) < 0.001, "Фон растянут");
    const click = async (selector, x, y) => {
      const point = await page.locator(selector).evaluate((c, p) => {
        const r = c.getBoundingClientRect(), scale = Math.min(r.width / 320, r.height / 224);
        return { x: r.left + (r.width - 320 * scale) / 2 + p.x * scale,
          y: r.top + (r.height - 224 * scale) / 2 + p.y * scale };
      }, { x, y });
      await page.mouse.click(point.x, point.y);
    };
    if (width === 1920 && dpr === 1) await page.screenshot({ path: `${out}/hd-title.png` });
    // Щелчок по первой строке должен открыть дома, несмотря на широкое окно.
    await click(".frontend canvas", 165, 164);
    await page.waitForFunction(() => window.dune.frontend.mode === "house");
    if (width === 1920 && dpr === 1) await page.screenshot({ path: `${out}/hd-houses.png` });
    await page.keyboard.press("Digit2");
    await click(".frontend canvas", 155, 172);
    await page.waitForFunction(() => !document.querySelector(".options").hidden);
    // Значение переключателя меняется по щелчку и клавише.
    const before = await page.evaluate(() => window.dune.sound.musicOn);
    await click(".options canvas", 180, 44);
    assert.equal(await page.evaluate(() => window.dune.sound.musicOn), !before);
    await page.keyboard.press("Digit1");
    assert.equal(await page.evaluate(() => window.dune.sound.musicOn), before);
    if (width === 1920 && dpr === 1) await page.screenshot({ path: `${out}/hd-settings.png` });
    await click(".options canvas", 90, 140);
    await page.keyboard.type("LOOKAROUND");
    await page.keyboard.press("Digit1");
    assert.equal(await page.evaluate(() => window.dune.G.revealAll), true, "Пароль не сработал");
    if (width === 1920 && dpr === 1) await page.screenshot({ path: `${out}/hd-password.png` });
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.dune.frontend.mode === "title");
    await click(".frontend canvas", 165, 164);
    await click(".frontend canvas", 160, 90);
    await page.waitForFunction(() => window.dune.mentat.isOpen);
    assert.equal(await page.evaluate(() => window.dune.mentat.scene.house), "O", "Щелчок по Ордосам выбрал другой дом");
    assert.deepEqual(errors, []);
    console.log(`ok ${width}×${height}, DPR ${dpr}: широкий нативный холст, текст, пропорции фона, мышь, клавиши, пароль, Ордосы`);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${base}${base.includes("?") ? "&" : "?"}debug&intro`);
  await page.setInputFiles("#rom-file", process.argv[2]);
  await page.waitForFunction(() => window.dune?.frontend?.isOpen);
  await page.evaluate(() => { window.dune.frontend.openIntro(); window.dune.frontend.stepIntro(100); });
  await page.screenshot({ path: `${out}/hd-sega.png` });
  await page.evaluate(() => window.dune.frontend.stepIntro(400));
  await page.screenshot({ path: `${out}/hd-logos.png` });
  const scenes = await page.evaluate(() => {
    const fe = window.dune.frontend;
    const played = [], houses = new Set();
    const originalPlay = fe.intro.play;
    fe.intro.play = (seq) => played.push(seq);
    fe.intro.start();
    for (let i = 0; i < 4000; i++) {
      const running = fe.intro.tick();
      if (fe.intro.ship) houses.add(fe.intro.ship.house);
      if (!running) break;
    }
    fe.intro.play = originalPlay;
    return { houses: [...houses], played };
  });
  assert.deepEqual(scenes.houses, [1, 0, 2]);
  assert.deepEqual(scenes.played, [10, 10, 10]);
  await page.evaluate(() => {
    const fe = window.dune.frontend; fe.intro.start();
    for (let i = 0; i < 3000; i++) {
      fe.intro.tick(); const ship = fe.intro.ship;
      if (ship && ship.x > 32 && ship.x < 200 && ship.y > 32 && ship.y < 170) break;
    }
    fe.draw();
  });
  await page.screenshot({ path: `${out}/hd-intro-ship.png` });
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => window.dune.frontend.mode), "title", "Пропуск заставки не открыл меню");
  // Недоступный HD-фон оставляет работающий оригинальный экран и ту же навигацию.
  await page.evaluate(() => { const fe = window.dune.frontend; fe.gfx.art.images.delete("arrakis"); fe.gfx.art.images.delete("houses"); fe.openTitle(); });
  await page.keyboard.press("Digit1");
  assert.equal(await page.evaluate(() => window.dune.frontend.mode), "house");
  console.log("ok заставка: три дома и три звука, перезапуск, пропуск; fallback ROM сохраняет меню");
  await page.close();
} finally { await browser.close(); }
