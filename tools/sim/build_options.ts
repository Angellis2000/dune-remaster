import { readFileSync } from "node:fs";
import { DuneRom } from "/home/user/dune-remaster/web/src/rom/dune.ts";
import { Game, G } from "/home/user/dune-remaster/web/src/engine/game.ts";
import { STRUCTURE_NAMES } from "/home/user/dune-remaster/web/src/game/names.ts";
import { packXY } from "/home/user/dune-remaster/web/src/engine/core.ts";
const rom = new DuneRom(new Uint8Array(readFileSync("/home/user/dune-remaster/rom/dune_usa.gen")));
const game = new Game(rom);
game.load("A", 1);
const cy = G.structureFind.find((s) => s.o.type === 8)!;
console.log(game.buildOptions(cy).map((o) => `${STRUCTURE_NAMES[o.type]} ${o.cost}`).join(", "));
game.build(cy, 1);
let t = 0; while (!(game.production(cy)?.ready) && t < 5000) { game.tick(); t++; }
console.log("slab ready", t, game.placeIt(cy), "valid", game.canPlaceAt(packXY(24, 37)), game.place(packXY(24, 37)));
for (let i = 0; i < 10; i++) game.tick();
console.log("tiles", [packXY(24,37), packXY(25,38)].map((p) => G.map[p].groundTileID));
for (const h of ["A", "H", "O"] as const) for (const m of [4, 8]) { game.load(h, m); const c = G.structureFind.find((s) => s.o.type === 8 && s.o.houseID === G.playerHouseID); if (c) console.log(h + m, game.buildOptions(c).map((o) => STRUCTURE_NAMES[o.type]).join(", ")); }
for (const h of ["A", "H", "O"] as const) for (const m of [4, 8]) { game.load(h, m); for (let i = 0; i < 100; i++) game.tick(); const c = G.structureFind.find((s) => s.o.type === 8 && s.o.houseID === G.playerHouseID); console.log(h + m, "built", G.houses[G.playerHouseID].structuresBuilt.toString(16), [...G.structureFind].filter((s) => s.o.houseID === G.playerHouseID).map((s) => s.o.type).join(","), c ? game.buildOptions(c).map((o) => STRUCTURE_NAMES[o.type]).join(", ") : "-"); }
