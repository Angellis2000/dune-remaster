// Импорт кораблей из пака Quaternius «Ultimate Spaceships» (CC0, opengameart.org/content/lowpoly-spaceships-pack):
// OBJ + текстура → web/src/gfx/assets/ships/<id>.json (треугольники: позиции и UV) и <id>.png.
// node --experimental-transform-types tools/sim/ship_import.ts <папка пака> <выход> [Имя:id[:поворот]...]
//   поворот — градусы вокруг вертикали, чтобы нос смотрел на +Z (как у моделей gfx/ship-models.ts).
// Без списка — все корабли пака под своими именами (для выбора).
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const [packDir, outDir, ...wanted] = process.argv.slice(2);
if (!packDir || !outDir) throw new Error("укажите папку пака и папку вывода");
mkdirSync(outDir, { recursive: true });
const list = wanted.length ? wanted.map((w) => w.split(":")) : readdirSync(packDir).filter((n) => existsSync(path.join(packDir, n, "OBJ"))).map((n) => [n, n.toLowerCase(), "0"]);

for (const [name, id, turn = "0"] of list) {
  const objPath = path.join(packDir, name, "OBJ", `${name}.obj`);
  const lines = readFileSync(objPath, "utf8").split(/\r?\n/);
  const v: number[][] = [], vt: number[][] = [];
  const positions: number[] = [], uvs: number[] = [];
  for (const l of lines) {
    const p = l.trim().split(/\s+/);
    if (p[0] === "v") v.push(p.slice(1, 4).map(Number));
    else if (p[0] === "vt") vt.push(p.slice(1, 3).map(Number));
    else if (p[0] === "f") {
      const idx = p.slice(1).map((s) => s.split("/").map((x) => (x ? Number(x) : 0)));
      for (let i = 1; i + 1 < idx.length; i++) {
        for (const k of [0, i, i + 1]) {
          const [vi, ti] = idx[k];
          positions.push(...v[vi > 0 ? vi - 1 : v.length + vi]);
          const uv = ti ? vt[ti > 0 ? ti - 1 : vt.length + ti] : [0, 0];
          uvs.push(uv[0], 1 - uv[1]);
        }
      }
    }
  }
  // центр габаритов — в начало координат, длина (самый большой размер) — 11 единиц, поворот носом на +Z
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], positions[i + k]); mx[k] = Math.max(mx[k], positions[i + k]); }
  const c = mn.map((m, k) => (m + mx[k]) / 2), size = Math.max(...mx.map((m, k) => m - mn[k])), s = 11 / size;
  const a = (Number(turn) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  for (let i = 0; i < positions.length; i += 3) {
    const x = (positions[i] - c[0]) * s, y = (positions[i + 1] - c[1]) * s, z = (positions[i + 2] - c[2]) * s;
    positions[i] = +(x * ca + z * sa).toFixed(4);
    positions[i + 1] = +y.toFixed(4);
    positions[i + 2] = +(-x * sa + z * ca).toFixed(4);
  }
  const tex = readdirSync(path.join(packDir, name, "Textures")).filter((f) => f.endsWith(".png"));
  const texture = tex.find((f) => /_Blue|_Red|_Green|_Orange|_Purple/.test(f)) ?? tex[0];
  copyFileSync(path.join(packDir, name, "Textures", texture), path.join(outDir, `${id}.png`));
  writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify({ name, source: "Quaternius, Ultimate Spaceships (CC0)", texture: `${id}.png`, positions, uvs: uvs.map((u) => +u.toFixed(4)) }));
  console.log(`${name} → ${id}: ${positions.length / 9} треугольников, текстура ${texture}`);
}
