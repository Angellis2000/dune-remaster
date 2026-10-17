import { readFileSync } from "node:fs";
import { DuneRom } from "/home/user/dune-remaster/web/src/rom/dune.ts";
import { Game, G } from "/home/user/dune-remaster/web/src/engine/game.ts";
const rom = new DuneRom(new Uint8Array(readFileSync("/home/user/dune-remaster/rom/dune_usa.gen")));
const game = new Game(rom);
game.load("A", 1);
const cy = G.structureFind.find((s) => s.o.type === 8)!;
game.build(cy, 9);
let t = 0, last = game.player.credits;
while (!(game.production(cy)?.ready) && t < 10000) { game.tick(); t++; if (game.player.credits !== last) { if (t < 2000) process.stdout.write(`${t}:${game.player.credits} `); last = game.player.credits; } }
console.log("\nready after", t, "credits", game.player.credits);
