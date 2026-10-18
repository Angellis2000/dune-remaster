// Встроенный двор, приоритет своей графики и туман войны.
// node tools/browser/construction_yard.mjs rom/dune_usa.gen (нужен Vite на :5173)
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "/opt/codex/cua_node/lib/node_modules/playwright");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173/?debug");
  await page.setInputFiles("#rom-file", process.argv[2]);
  await page.waitForFunction(() => window.dune?.world?.game);
  await page.evaluate(async () => {
    const { world, view, sprites } = window.dune;
    const yard = world.structures.find((s) => s.type === 8 && s.house === world.player);
    if (!yard || yard.w !== 2 || yard.h !== 2 || !yard.built) throw Error("Нет готового двора 2×2");
    const skins = sprites.skins;
    const image = skins.structure(8, 128, 128);
    if (!image) throw Error("Встроенная графика двора не загрузилась");
    const original = image.toDataURL();
    const custom = document.createElement("canvas");
    custom.width = custom.height = 2;
    const g = custom.getContext("2d");
    g.fillStyle = "#ff00ff";
    g.fillRect(0, 0, 2, 2);
    const blob = await new Promise((resolve) => custom.toBlob(resolve));
    await skins.setStructure(8, blob);
    if (skins.structure(8, 128, 128).toDataURL() === original) throw Error("Своя графика не перекрыла встроенную");
    await skins.clearStructure(8);
    if (skins.structure(8, 128, 128).toDataURL() !== original) throw Error("Сброс не вернул встроенный двор");
    view.setZoom(6);
    view.centerOn((yard.x + 1) * 32, (yard.y + 1) * 32);
    view.cursorX = (yard.x - 2) * 32;
    view.cursorY = yard.y * 32;
    // Остановить мир, чтобы сравнивать одни и те же клетки без юнитов и курсора над зданием.
    view.onFrame = () => {};
    world.units = [];
    view.structureIcons = [];
    view.invalidate();
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${process.env.OUT ?? "/tmp"}/modern-yard.png` });
  const black = await page.evaluate(async () => {
    const { world, view } = window.dune;
    const yard = world.structures.find((s) => s.type === 8 && s.house === world.player);
    // Скрыть только одну из четырёх клеток: проверяется отсечение, а не всё здание целиком.
    world.map.overlay[(yard.y << 6) | yard.x] = view.veiledIcon;
    view.invalidate();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const x = Math.round((yard.x * 32 - view.camX + 16) * view.zoom);
    const y = Math.round((yard.y * 32 - view.camY + 16) * view.zoom);
    return [...view.canvas.getContext("2d").getImageData(x, y, 1, 1).data];
  });
  assert.deepEqual(black, [0, 0, 0, 255], "Двор виден сквозь туман войны");
  assert.deepEqual(errors, []);
  console.log("ok встроенный двор 2×2; своя графика; сброс; клетка под туманом; ошибок JS нет");
} finally {
  await browser.close();
}
