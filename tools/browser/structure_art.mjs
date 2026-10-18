// Все HD-здания: загрузка, непрозрачные площадки, направления башен, свои замены, туман.
// OUT=out/hd-originals node tools/browser/structure_art.mjs rom/dune_usa.gen
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "/opt/codex/cua_node/lib/node_modules/playwright");
const out = process.env.OUT ?? "/tmp";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1600 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "warning" && message.text().includes("графику здания")) errors.push(message.text()); });
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173/?debug");
  await page.setInputFiles("#rom-file", process.argv[2]);
  await page.waitForFunction(() => window.dune?.world?.game);
  const cards = await page.evaluate(async () => {
    const { STRUCTURE_ART } = await import("/src/gfx/structure-art.ts");
    const { STRUCTURE_NAMES } = await import("/src/game/names.ts");
    const { structureShape } = await import("/src/gfx/pack.ts");
    const { IconSet } = await import("/src/gfx/icons.ts");
    const { world, view, sprites } = window.dune;
    const rom = world.game.rom;
    const icons = new IconSet(rom);
    const skins = sprites.skins;
    const types = STRUCTURE_ART.map((art) => art.type);
    if (JSON.stringify(types) !== JSON.stringify([2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18])) throw Error("Неполный набор зданий");
    const cards = [];
    for (const type of types) {
      const shape = structureShape(rom, type);
      const image = skins.structure(type, shape.w * 96, shape.h * 96);
      if (!image) throw Error(`Не загрузилось здание ${type}`);
      if (type !== 8) {
        const pixels = image.getContext("2d").getImageData(0, 0, image.width, image.height).data;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) throw Error(`Прозрачная площадка здания ${type}`);
      }
      if (type === 15 || type === 16) {
        const frames = Array.from({ length: 8 }, (_, frame) => skins.structure(type, 96, 96, frame).toDataURL());
        if (new Set(frames).size !== 8) throw Error(`У башни ${type} не восемь разных направлений`);
      }
      const original = document.createElement("canvas");
      original.width = shape.w * 32;
      original.height = shape.h * 32;
      shape.icons[2].forEach((id, i) => {
        const s = icons.source(id);
        original.getContext("2d").drawImage(s.image, s.sx, s.sy, s.sw, s.sh, (i % shape.w) * 32, Math.floor(i / shape.w) * 32, 32, 32);
      });
      cards.push({ type, name: STRUCTURE_NAMES[type], w: shape.w, h: shape.h, original: original.toDataURL(), hd: image.toDataURL() });
    }
    // Одна пользовательская картинка башни не должна обрезаться как атлас встроенных направлений.
    const custom = document.createElement("canvas");
    custom.width = custom.height = 2;
    const g = custom.getContext("2d");
    g.fillStyle = "#ff00ff";
    g.fillRect(0, 0, 2, 2);
    const blob = await new Promise((resolve) => custom.toBlob(resolve));
    const before = skins.structure(15, 96, 96).toDataURL();
    await skins.setStructure(15, blob);
    if (skins.structure(15, 96, 96, 7).toDataURL() !== skins.structure(15, 96, 96, 0).toDataURL()) throw Error("Своя картинка обрезалась как атлас");
    await skins.clearAll();
    if (skins.structure(15, 96, 96).toDataURL() !== before) throw Error("Сброс не восстановил HD-графику");
    // Витрина на настоящем холсте карты: временные объекты только в тестовой вкладке.
    view.onFrame = () => {};
    world.units = [];
    world.blasts = [];
    world.map.ground.fill(127);
    world.map.overlay.fill(0);
    const sample = world.structures.find((s) => s.type === 8 && s.house === world.player);
    world.structures = cards.map((card, i) => ({ ...sample, id: i, type: card.type, w: card.w, h: card.h,
      x: 18 + (i % 4) * 5, y: 18 + Math.floor(i / 4) * 5, built: true,
      ref: { ...sample.ref, rotationSpriteDiff: 0, o: { ...sample.ref.o, type: card.type } } }));
    view.structureIcons = [];
    view.selectedStructure = null;
    view.selectedUnits.clear();
    view.setZoom(2);
    view.centerOn(27 * 32, 27 * 32);
    view.cursorX = 0;
    view.cursorY = 0;
    view.invalidate();
    return cards;
  });
  assert.equal(cards.length, 15);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${out}/game-structures.png` });
  const result = await page.evaluate(async () => {
    const { world, view } = window.dune;
    const turret = world.structures.find((s) => s.type === 15);
    const sample = () => {
      const x = Math.round((turret.x * 32 - view.camX) * view.zoom);
      const y = Math.round((turret.y * 32 - view.camY) * view.zoom);
      return [...view.canvas.getContext("2d").getImageData(x, y, 64, 64).data];
    };
    const old = sample();
    turret.ref.rotationSpriteDiff = 2;
    view.invalidate();
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    const turned = JSON.stringify(old) !== JSON.stringify(sample());
    world.map.overlay[(turret.y << 6) | turret.x] = view.veiledIcon;
    view.invalidate();
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    const hidden = sample().every((value, i) => value === (i % 4 === 3 ? 255 : 0));
    return { turned, hidden };
  });
  assert.deepEqual(result, { turned: true, hidden: true });
  assert.deepEqual(errors, []);
  // Сравнение из тех же данных ROM и загруженного набора, без изменения исходных PNG.
  await page.setViewportSize({ width: 1140, height: 1260 });
  await page.setContent(`<html lang="ru"><head><meta charset="UTF-8"><style>
    body{margin:12px;background:#171b23;color:#eef0f4;font:15px sans-serif}h1{font-size:23px;margin:8px 0 16px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{background:#292f3a;padding:10px}.card h2{font-size:16px;margin:0 0 8px}.pair{display:flex;gap:8px}.pair div{flex:1;text-align:center}.pair img{width:164px;height:164px;object-fit:contain;display:block}.original{image-rendering:pixelated}.label{color:#b3bac5;font-size:12px}
    </style></head><body><h1>Оригинал ROM → HD · строительный двор оставлен по выбору владельца</h1><div class="grid">${cards.map((c) => `<div class="card"><h2>${c.name} · ${c.w}×${c.h}</h2><div class="pair"><div><img class="original" src="${c.original}"><span class="label">Оригинал</span></div><div><img src="${c.hd}"><span class="label">HD</span></div></div></div>`).join("")}</div></body></html>`);
  await page.screenshot({ path: `${out}/compare-hd.png`, fullPage: true });
  console.log("ok 15 типов зданий; непрозрачные площадки; 8 направлений обеих башен; поворот на карте; свои замены; сброс; туман; ошибок JS нет");
} finally {
  await browser.close();
}
