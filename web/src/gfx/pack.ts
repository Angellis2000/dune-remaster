/**
 * Набор графики для переделки: всё, что движок рисует из ROM, раскладывается по папкам PNG
 * с понятными именами. Изменённые файлы загружаются обратно и подменяют оригинал (см. Skins).
 *
 *   map/icon_NNN.png              клетки карты 32×32
 *   structures/TT_name.png        здание целиком (готовое), 32 px на клетку
 *   structures/TT_name_build.png  то же во время постройки (для справки)
 *   structures/TT_name_rubble.png развалины (для справки)
 *   units/TT_name/dD[_fF|_tT].png юнит по направлениям (0 — север, по часовой), центр юнита в центре картинки
 *   pictures/units|structures/TT_name.png  картинки меню строительства 96×56
 *   cursors/*.png, palette.png
 */
import { ROM, type DuneRom } from "../rom/dune.ts";
import { readU16 } from "../rom/md.ts";
import type { CursorKind } from "./cursors.ts";
import type { IconSet } from "./icons.ts";
import type { Skins } from "./skins.ts";
import type { SpriteSet } from "./sprites.ts";
import { makeZip, readZip, type ZipEntry } from "./zip.ts";

export const UNIT_FILE_NAMES = [
  "carryall", "ornithopter", "infantry", "troopers", "soldier", "trooper", "saboteur", "launcher", "deviator", "tank",
  "siege_tank", "devastator", "sonic_tank", "trike", "raider_trike", "quad", "harvester", "mcv", "missile_house",
  "missile_rocket", "missile_turret", "missile_deviator", "missile_trooper", "bullet", "sonic_blast", "sandworm", "frigate",
];

export const STRUCTURE_FILE_NAMES = [
  "slab_1x1", "slab_2x2", "palace", "light_factory", "heavy_factory", "hightech_factory", "house_of_ix", "wor_barracks",
  "construction_yard", "windtrap", "barracks", "starport", "refinery", "repair_facility", "wall", "turret", "rocket_turret",
  "spice_silo", "radar_outpost",
];

const pad = (n: number, w: number) => String(n).padStart(w, "0");

/** Раскладки зданий (ширина, высота) и смещения клеток — как STRUCTURE_LAYOUT_* в движке. */
const LAYOUTS: [number, number][] = [[1, 1], [2, 1], [1, 2], [2, 2], [2, 3], [3, 2], [3, 3]];

/** Здания MD: раскладка и группа иконок из таблицы $06AFAE (0x66 байт на тип). */
export function structureShape(rom: DuneRom, type: number): { w: number; h: number; icons: number[][] } {
  const p = 0x06afae + type * 0x66;
  const layout = readU16(rom.bytes, p + 0x3c);
  const group = rom.iconGroup(readU16(rom.bytes, p + 0x3e));
  const [w, h] = LAYOUTS[layout] ?? [1, 1];
  const tiles = w * h;
  const stride = group.length % 3 === 0 && group.length / 3 >= tiles ? group.length / 3 : tiles;
  const frames = [0, 1, 2].map((f) => Array.from({ length: tiles }, (_, i) => group[f * stride + i] ?? group[0]));
  return { w, h, icons: frames };
}

export interface UnitView {
  stem: string;
  orientation: number;
  anim: number;
  turret: number;
}

/** Все различимые виды юнита: имя файла и параметры для SpriteSet.unitFrames. */
export function unitViews(rom: DuneRom, type: number): UnitView[] {
  const out: UnitView[] = [];
  if (ROM.turretFrames[type] !== undefined) {
    for (let b = 0; b < 8; b++) for (let t = 0; t < 8; t++) out.push({ stem: `d${b}_t${t}`, orientation: b * 32, anim: 0, turret: t * 32 });
    return out;
  }
  const { mode } = rom.unitDisplay(type);
  if (mode === 1 || mode === 5) for (let d = 0; d < 8; d++) out.push({ stem: `d${d}`, orientation: d * 32, anim: 0, turret: d * 32 });
  else if (mode === 2) for (let d = 0; d < 16; d++) out.push({ stem: `d${pad(d, 2)}`, orientation: d * 16, anim: 0, turret: d * 16 });
  else if (mode === 3 || mode === 4) {
    for (let d = 0; d < 8; d++) for (const [f, anim] of [[0, 0], [1, 1], [2, 3]]) out.push({ stem: `d${d}_f${f}`, orientation: d * 32, anim, turret: d * 32 });
  } else out.push({ stem: "d0", orientation: 0, anim: 0, turret: 0 });
  return out;
}

/** Имя кадра юнита для текущего положения — по нему ищется своя картинка. */
export function unitStem(rom: DuneRom, type: number, orientation: number, anim: number, turret: number): string {
  orientation &= 0xff;
  turret &= 0xff;
  if (ROM.turretFrames[type] !== undefined) return `d${((orientation + 16) & 0xe0) >> 5}_t${((turret + 16) & 0xe0) >> 5}`;
  const { mode } = rom.unitDisplay(type);
  if (mode === 1 || mode === 5) return `d${((orientation + 16) & 0xff) >> 5}`;
  if (mode === 2) return `d${pad(((orientation + 8) & 0xff) >> 4, 2)}`;
  if (mode === 3 || mode === 4) return `d${((orientation + 16) & 0xff) >> 5}_f${rom.bytes[ROM.infantryAnim + (anim & 3)]}`;
  return "d0";
}

/** Квадрат вокруг центра юнита, в который помещаются все его кадры (кратно 8). */
export function unitBox(rom: DuneRom, sprites: SpriteSet, type: number, house = 1): number {
  let half = 8;
  for (const v of unitViews(rom, type)) {
    for (const f of sprites.unitFrames(type, v.orientation, v.anim, v.turret)) {
      const img = sprites.get(f, house);
      half = Math.max(half, -img.ox, -img.oy, img.ox + img.canvas.width, img.oy + img.canvas.height);
    }
  }
  return Math.ceil(half / 8) * 8 * 2;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}

async function png(c: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

/** Все картинки набора: путь -> холст (оригинал из ROM). */
export function packCanvases(rom: DuneRom, icons: IconSet, sprites: SpriteSet, cursors: Record<CursorKind, HTMLCanvasElement>): Map<string, HTMLCanvasElement> {
  const out = new Map<string, HTMLCanvasElement>();
  const drawIcon = (g: CanvasRenderingContext2D, id: number, x: number, y: number) => {
    const s = icons.source(id);
    g.drawImage(s.image, s.sx, s.sy, s.sw, s.sh, x, y, 32, 32);
  };
  for (let id = 0; id < icons.count; id++) {
    const [c, g] = canvas(32, 32);
    drawIcon(g, id, 0, 0);
    out.set(`map/icon_${pad(id, 3)}.png`, c);
  }
  for (let t = 0; t < STRUCTURE_FILE_NAMES.length; t++) {
    // бетон и стены — это просто клетки карты (126 и 34–45), отдельной картинки здания у них нет
    if (t === 0 || t === 1 || t === 14) continue;
    const shape = structureShape(rom, t);
    const base = `structures/${pad(t, 2)}_${STRUCTURE_FILE_NAMES[t]}`;
    ["_build", "_rubble", ""].forEach((suffix, frame) => {
      const [c, g] = canvas(shape.w * 32, shape.h * 32);
      shape.icons[frame].forEach((id, i) => drawIcon(g, id, (i % shape.w) * 32, Math.floor(i / shape.w) * 32));
      out.set(`${base}${suffix}.png`, c);
    });
  }
  for (let t = 0; t < UNIT_FILE_NAMES.length; t++) {
    const box = unitBox(rom, sprites, t);
    for (const v of unitViews(rom, t)) {
      const [c, g] = canvas(box, box);
      for (const f of sprites.unitFrames(t, v.orientation, v.anim, v.turret)) {
        const img = sprites.get(f, 1);
        g.drawImage(img.canvas, box / 2 + img.ox, box / 2 + img.oy);
      }
      out.set(`units/${pad(t, 2)}_${UNIT_FILE_NAMES[t]}/${v.stem}.png`, c);
    }
  }
  const pics: [string, ReturnType<DuneRom["unitPictures"]>, string[]][] = [
    ["units", rom.unitPictures(), UNIT_FILE_NAMES],
    ["structures", rom.structurePictures(), STRUCTURE_FILE_NAMES],
  ];
  for (const [dir, list, names] of pics) {
    for (const p of list) {
      const [c, g] = canvas(p.width, p.height);
      g.putImageData(new ImageData(new Uint8ClampedArray(p.pixels), p.width, p.height), 0, 0);
      out.set(`pictures/${dir}/${pad(p.id, 2)}_${names[p.id] ?? p.id}.png`, c);
    }
  }
  for (const [kind, c] of Object.entries(cursors)) out.set(`cursors/${kind}.png`, c);
  const pal = rom.gamePalette();
  const [pc, pg] = canvas(16 * 16, 4 * 16);
  for (let i = 0; i < 64; i++) {
    const v = pal[i];
    pg.fillStyle = `rgb(${v & 255},${(v >> 8) & 255},${(v >> 16) & 255})`;
    pg.fillRect((i % 16) * 16, Math.floor(i / 16) * 16, 16, 16);
  }
  out.set("palette.png", pc);
  return out;
}

const README = `Графика Dune (Mega Drive), выгружена из вашего ROM движком «Dune Remaster».

Как пользоваться
  1. Перерисуйте нужные файлы. Имена файлов и папок не меняйте — по ним движок
     понимает, что вы заменили.
  2. В игре: «Ресурсы» (R) → «Загрузить свою графику» → выберите эту папку или ZIP.
     Можно загружать только изменённые файлы: нетронутые движок пропустит сам.
  3. Сбросить всё: «Ресурсы» → «Сбросить свою графику».

Размеры
  Рисовать можно в любом разрешении, но сохраняйте пропорции: движок вписывает
  картинку в то же место, что занимал оригинал.
  map/icon_NNN.png         клетка карты, квадрат (оригинал 32×32). Номер — тот, что
                           хранится в карте миссии (сетка G в игре показывает номера).
  structures/TT_name.png   здание целиком, 32 px на клетку: 2×2 → 64×64, 3×3 → 96×96,
                           3×2 → 96×64. Файлы _build и _rubble — стройка и развалины,
                           пока только для справки. Бетон и стены — это клетки карты:
                           бетон — icon_126, стены — icon_034…icon_045.
  units/TT_name/*.png      юнит: квадрат, центр юнита — центр картинки. dN — направление
                           (0 — север, дальше по часовой; 8 или 16 направлений), _fN — кадр
                           шага пехоты, _tN — направление башни танка. Фон прозрачный.
                           Юниты выгружены в цветах Атрейдесов.
  pictures/...             картинки меню строительства 96×56 (замена — в следующих версиях).
  cursors/, palette.png    курсоры и палитра игры (для справки).

Что движок уже подменяет: клетки карты, здания, юниты.
`;

/** ZIP со всей графикой и описанием. */
export async function buildPackZip(rom: DuneRom, icons: IconSet, sprites: SpriteSet, cursors: Record<CursorKind, HTMLCanvasElement>): Promise<Blob> {
  const entries: ZipEntry[] = [];
  const enc = new TextEncoder();
  const root = "dune_graphics/";
  entries.push({ name: `${root}README.txt`, data: enc.encode(README.replace(/\n/g, "\r\n")) });
  for (const [path, c] of packCanvases(rom, icons, sprites, cursors)) entries.push({ name: root + path, data: await png(c) });
  return makeZip(entries);
}

/** Куда ведёт файл набора: ключ своей картинки или null, если такой подмены нет. */
export function skinKeyFor(path: string): string | null {
  const p = path.replace(/\\/g, "/").toLowerCase();
  if (/(?:^|\/)pictures\//.test(p)) return null; // картинки меню пока не подменяются
  let m = /(?:^|\/)map\/icon_(\d+)\.png$/.exec(p);
  if (m) return `icon:${Number(m[1])}`;
  m = /(?:^|\/)structures\/(\d+)_[a-z0-9_]+?(_build|_rubble)?\.png$/.exec(p);
  if (m) return m[2] ? null : `structure:${Number(m[1])}`;
  m = /(?:^|\/)units\/(\d+)_[a-z0-9_]+\/(d\d+(?:_[ft]\d+)?)\.png$/.exec(p);
  if (m) return `unit:${Number(m[1])}:${m[2]}`;
  return null;
}

/** Совпадает ли картинка с оригиналом пиксель в пиксель (такую незачем подменять). */
async function sameAsOriginal(file: Blob, original: HTMLCanvasElement | undefined): Promise<boolean> {
  if (!original) return false;
  const bmp = await createImageBitmap(file);
  if (bmp.width !== original.width || bmp.height !== original.height) return false;
  const [c, g] = canvas(bmp.width, bmp.height);
  g.drawImage(bmp, 0, 0);
  const a = g.getImageData(0, 0, c.width, c.height).data;
  const b = original.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] === 0 && b[i + 3] === 0) continue;
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) return false;
  }
  return true;
}

export interface ImportResult {
  applied: number;
  unchanged: number;
  ignored: number;
}

/** Загрузить свою графику: файлы из папки или ZIP-архивы. */
export async function importPack(
  files: File[],
  skins: Skins,
  originals: () => Map<string, HTMLCanvasElement>,
): Promise<ImportResult> {
  const list: { path: string; blob: Blob }[] = [];
  for (const f of files) {
    const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    if (/\.zip$/i.test(f.name)) {
      for (const e of await readZip(await f.arrayBuffer())) list.push({ path: e.name, blob: new Blob([e.data as BlobPart], { type: "image/png" }) });
    } else list.push({ path, blob: f });
  }
  let orig: Map<string, HTMLCanvasElement> | null = null;
  const res: ImportResult = { applied: 0, unchanged: 0, ignored: 0 };
  for (const { path, blob } of list) {
    const key = skinKeyFor(path);
    if (!key) {
      res.ignored++;
      continue;
    }
    orig ??= originals();
    const rel = path.replace(/\\/g, "/").replace(/^.*?(?=(map|structures|units)\/)/i, "");
    if (await sameAsOriginal(blob, orig.get(rel))) {
      res.unchanged++;
      if (skins.has(key)) await skins.clear(key);
      continue;
    }
    await skins.set(key, blob);
    res.applied++;
  }
  return res;
}
