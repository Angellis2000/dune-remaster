// Uses the game's own decoder/exporter to preserve palette, transparency and IDs.
// node tools/extract_map_graphics.mjs [output-directory]
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] ?? path.join(root, '..', 'extracted-map-graphics'));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ??
  'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const romBytes = await readFile(path.join(root, 'rom/dune_usa.gen'));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5187/');
  const result = await page.evaluate(async (base64) => {
    const { DuneRom, ROM } = await import('/src/rom/dune.ts');
    const { IconSet } = await import('/src/gfx/icons.ts');
    const { SpriteSet } = await import('/src/gfx/sprites.ts');
    const { buildCursors } = await import('/src/gfx/cursors.ts');
    const { packCanvases } = await import('/src/gfx/pack.ts');
    const rom = new DuneRom(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
    const icons = new IconSet(rom);
    const sprites = new SpriteSet(rom);
    const canvases = packCanvases(rom, icons, sprites, buildCursors(rom));
    const json = {};
    function canvas(w, h) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').imageSmoothingEnabled = false;
      return c;
    }
    function icon(g, id, x, y, size = 32) {
      const s = icons.source(id);
      g.drawImage(s.image, s.sx, s.sy, s.sw, s.sh, x, y, size, size);
    }
    canvases.set('overview/tiles_atlas.png', icons.atlas);
    const tiles = canvas(16 * 66, Math.ceil(icons.count / 16) * 84);
    const tg = tiles.getContext('2d');
    tg.fillStyle = '#282828'; tg.fillRect(0, 0, tiles.width, tiles.height);
    tg.font = '12px monospace';
    for (let id = 0; id < icons.count; id++) {
      const x = (id % 16) * 66, y = Math.floor(id / 16) * 84;
      icon(tg, id, x, y, 64);
      tg.fillStyle = '#ffffff'; tg.fillText(String(id).padStart(3, '0'), x + 3, y + 78);
    }
    canvases.set('overview/tiles_numbered.png', tiles);
    const overview = canvas(6 * 256, Math.ceil(ROM.mapCount / 6) * 280);
    const og = overview.getContext('2d');
    og.fillStyle = '#202020'; og.fillRect(0, 0, overview.width, overview.height);
    og.font = '14px monospace';
    const missions = [];
    for (let index = 1; index <= ROM.mapCount; index++) {
      const map = rom.missionMap(index), b = map.bounds;
      const c = canvas(b.w * 32, b.h * 32), g = c.getContext('2d');
      g.fillStyle = '#000000'; g.fillRect(0, 0, c.width, c.height);
      const ground = [];
      for (let y = 0; y < b.h; y++) {
        const row = [];
        for (let x = 0; x < b.w; x++) {
          const id = map.ground[(y + b.y) * 64 + x + b.x];
          row.push(id); icon(g, id, x * 32, y * 32);
        }
        ground.push(row);
      }
      const stem = `missions/mission_${String(index).padStart(2, '0')}`;
      canvases.set(stem + '.png', c);
      json[stem + '.json'] = { index, cellPixels: 32, bounds: b, ground };
      missions.push({ index, width: c.width, height: c.height, bounds: b });
      const x = ((index - 1) % 6) * 256, y = Math.floor((index - 1) / 6) * 280;
      og.drawImage(c, x, y, 256, 256);
      og.fillStyle = '#ffffff'; og.fillText(`Mission ${index} (${b.w}x${b.h})`, x + 4, y + 275);
    }
    canvases.set('overview/all_missions.png', overview);
    const frames = [];
    const skipped = [];
    for (let id = 0; id <= 400; id++) {
      if (!sprites.hasFrame(id)) continue;
      const p = ROM.frameTable + id * 8 + 4;
      const addr = ((rom.bytes[p + 1] << 16) | (rom.bytes[p + 2] << 8) | rom.bytes[p + 3]);
      const count = addr + 2 <= rom.bytes.length ? ((rom.bytes[addr] << 8) | rom.bytes[addr + 1]) + 1 : 0;
      if (!count || count > 64 || addr + 2 + count * 12 > rom.bytes.length) {
        skipped.push({ id, reason: 'Not a supported sprite description (or beyond the ROM frame table)' });
        continue;
      }
      const frame = rom.frame(id);
      const minX = Math.min(...frame.pieces.map(p => p.x));
      const minY = Math.min(...frame.pieces.map(p => p.y));
      const maxX = Math.max(...frame.pieces.map(p => p.x + p.tw * 8));
      const maxY = Math.max(...frame.pieces.map(p => p.y + p.th * 8));
      if (maxX - minX > 1024 || maxY - minY > 1024) {
        skipped.push({ id, reason: 'Not a bounded sprite description' });
        continue;
      }
      const s = sprites.get({ frame: id, flip: 0 }, -1);
      canvases.set(`sprite_frames/frame_${String(id).padStart(3, '0')}.png`, s.canvas);
      frames.push({ id, ox: s.ox, oy: s.oy, width: s.canvas.width, height: s.canvas.height });
    }
    json['sprite_frames/index.json'] = frames;
    json['sprite_frames/skipped.json'] = skipped;
    for (let d = 0; d < 8; d++) for (let f = 0; f < 3; f++) {
      const s = sprites.harvestDust(d, f);
      canvases.set(`effects/harvest_dust_d${d}_f${f}.png`, s.canvas);
    }
    json['missions/index.json'] = missions;
    const files = [...canvases].map(([name, c]) => ({
      name, width: c.width, height: c.height, data: c.toDataURL('image/png').split(',')[1],
    }));
    return { files, json, iconCount: icons.count, mapCount: ROM.mapCount, frameCount: frames.length };
  }, romBytes.toString('base64'));
  await mkdir(out, { recursive: true });
  for (const file of result.files) {
    const target = path.join(out, file.name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(file.data, 'base64'));
  }
  for (const [name, value] of Object.entries(result.json)) {
    await writeFile(path.join(out, name), JSON.stringify(value, null, 2));
  }
  await cp(path.join(root, 'web/src/gfx/assets'), path.join(out, 'project_png'), { recursive: true });
  const manifest = {
    source: 'rom/dune_usa.gen', iconCount: result.iconCount, mapCount: result.mapCount,
    frameCount: result.frameCount,
    files: result.files.map(({ name, width, height }) => ({ name, width, height })),
  };
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(out, 'README.txt'), `Графика карт Dune, извлечённая из локального ROM штатным декодером проекта.

map/ — 362 клетки 32x32 с исходной прозрачностью, включая ландшафт, стены, бетон, туман и части зданий.
missions/ — 27 карт целиком (1024x1024 или 2048x2048) и JSON с номерами клеток.
Карты показывают исходную поверхность из ROM; юниты, здания сценария и динамические эффекты идут отдельно.
overview/tiles_atlas.png — общий атлас без подписей.
overview/tiles_numbered.png — все клетки с номерами, увеличенные без сглаживания.
overview/all_missions.png — обзор всех карт.
structures/ — оригинальные здания: готовые, стройка и развалины.
units/ — юниты, направления, анимации и повороты башен (цвета Атрейдесов).
sprite_frames/ — кадры спрайтов, поддерживаемые штатным декодером, включая эффекты; index.json содержит смещения центра.
skipped.json перечисляет неподдерживаемые записи и записи за пределами таблицы при сканировании номеров 0..400.
effects/ — кадры пыли харвестера.
pictures/ — картинки меню строительства.
cursors/ — игровые курсоры; palette.png — игровая палитра.
project_png/ — копии PNG из проекта, включая HD-здания и frontend/arrakis-wide.png.
manifest.json — размеры и список извлечённых изображений.

Для замены графики в игре используйте папки map/, structures/, units/ с исходными именами файлов.
Бетон: map/icon_126.png; стены: map/icon_034.png ... icon_045.png.
`);
  console.log(JSON.stringify({ out, pngFromRom: result.files.length, icons: result.iconCount,
    missions: result.mapCount, spriteFrames: result.frameCount }));
} finally {
  await browser.close();
}
