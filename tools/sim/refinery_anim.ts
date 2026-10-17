import { readFileSync } from "node:fs";
import { DuneRom } from "/home/user/dune-remaster/web/src/rom/dune.ts";
import { Game, G } from "/home/user/dune-remaster/web/src/engine/game.ts";
import { packXY } from "/home/user/dune-remaster/web/src/engine/core.ts";
const rom = new DuneRom(new Uint8Array(readFileSync("/home/user/dune-remaster/rom/dune_usa.gen")));
const game = new Game(rom);
game.load("A", 1);
const cy = G.structureFind.find((s) => s.o.type === 8)!;
function buildPlace(type: number, x: number, y: number) {
  game.build(cy, type);
  let t = 0; while (!(game.production(cy)?.ready) && t < 5000) { game.tick(); t++; }
  game.placeIt(cy);
  console.log("place", type, game.place(packXY(x, y)));
}
buildPlace(9, 24, 37);
for (let i = 0; i < 300; i++) game.tick();
buildPlace(12, 26, 37);
const ref = G.structureFind.find((s) => s.o.type === 12)!;
const rx = ref.o.position.x >> 8, ry = ref.o.position.y >> 8;
let prev = "";
for (let t = 0; t < 60 * 60; t++) {
  game.tick();
  const tiles = [];
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) tiles.push(G.map[packXY(rx + dx, ry + dy)].groundTileID);
  const carry = G.unitFind.filter((u) => u.o.type === 0).map((u) => `C${(u.o.position.x >> 8)},${u.o.position.y >> 8}${u.o.flags.isNotOnMap ? "x" : ""}`).join(" ");
  const k = tiles.join(",") + " st" + ref.state + " notOnMap" + (ref.o.flags.isNotOnMap ? 1 : 0) + " " + carry;
  if (k !== prev) { console.log(t, k); prev = k; }
}
