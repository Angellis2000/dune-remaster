// Точки высадки и годность карт по форматам (engine/net-spawns.ts): один игрок на материк, место под базу, не в куче.
// node --experimental-transform-types tools/sim/net_spawns.ts [номер карты — показать схему]
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DuneRom } from "../../web/src/rom/dune.ts";
import { Game } from "../../web/src/engine/game.ts";
import { netMapTeamSize, netSpawnPoints } from "../../web/src/engine/net-spawns.ts";
import { iconLandscape, landscapeInfo } from "../../web/src/engine/tables.ts";
import { MAP_INFOS } from "../../web/src/engine/core.ts";

const rom = new DuneRom(new Uint8Array(readFileSync(new URL("../../rom/dune_usa.gen", import.meta.url))));
new Game(rom); // таблицы ROM (iconLandscape) — как в игре
const show = Number(process.argv[2] ?? 0);
const byFormat = [[], [], [], []] as number[][];
for (let n = 1; n <= 27; n++) {
  const m = rom.missionMap(n), b = m.bounds, scale = b.w === 64 ? 0 : 1;
  const pts = netSpawnPoints(m.ground, scale), fit = netMapTeamSize(m.ground, scale);
  for (let s = 1; s <= fit; s++) byFormat[s].push(n);
  // проверка: у годного формата первые 2N точек — на разных материках (своя заливка по 4 соседям без перехода через край)
  const rock = (q: number) => { const l = iconLandscape[m.ground[q] & 0x1ff]; return l >= 0 && landscapeInfo[l].isValidForStructure !== 0; };
  const label = new Map<number, number>();
  let id = 0;
  const of = (s: number) => {
    if (label.has(s)) return label.get(s)!;
    const my = id++, st = [s];
    label.set(s, my);
    while (st.length) {
      const p = st.pop()!, x = p & 63, y = p >> 6;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, q = (ny << 6) | nx;
        const mi = MAP_INFOS[scale];
        if (nx < mi.minX || ny < mi.minY || nx >= mi.minX + mi.sizeX || ny >= mi.minY + mi.sizeY || label.has(q) || !rock(q)) continue;
        label.set(q, my); st.push(q);
      }
    }
    return my;
  };
  const conts = pts.slice(0, fit * 2).map((p) => of((p.y << 6) | p.x));
  assert.equal(new Set(conts).size, conts.length, `карта ${n}: два игрока на одном материке`);
  console.log(`карта ${String(n).padStart(2)} ${b.w}×${b.h}: годится до ${fit ? `${fit} на ${fit}` : "— не для сети"}`);
  if (n === show) {
    for (let y = b.y; y < b.y + b.h; y++) {
      let row = "";
      for (let x = b.x; x < b.x + b.w; x++) {
        const i = pts.findIndex((p) => (x === p.x || x === p.x + 1) && (y === p.y || y === p.y + 1));
        row += i >= 0 ? String(i + 1) : rock((y << 6) | x) ? "#" : ".";
      }
      console.log(row);
    }
  }
}
console.log(`1 на 1: ${byFormat[1].join(", ")}\n2 на 2: ${byFormat[2].join(", ")}\n3 на 3: ${byFormat[3].join(", ")}`);
assert.ok(byFormat[1].length >= 10 && byFormat[2].length >= 5 && byFormat[3].length >= 3, "слишком мало карт для форматов");
console.log("net spawns: один игрок на материк, место под базу, точки не в куче");
