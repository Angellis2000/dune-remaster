import { readFileSync } from "node:fs";
import { DuneRom } from "/home/user/dune-remaster/web/src/rom/dune.ts";
import { Game, G } from "/home/user/dune-remaster/web/src/engine/game.ts";
import { STRUCTURE_NAMES, UNIT_NAMES } from "/home/user/dune-remaster/web/src/game/names.ts";
import { packXY } from "/home/user/dune-remaster/web/src/engine/core.ts";
const rom = new DuneRom(new Uint8Array(readFileSync("/home/user/dune-remaster/rom/dune_usa.gen")));
const game = new Game(rom);
G.onMessage = (t) => console.log(`  [${G.timerGame}] ${t}`);
game.load("A", 1);
const cy = G.structureFind.find((s) => s.o.type === 8)!;
const cx = (cy.o.position.x >> 8), cyy = (cy.o.position.y >> 8);
console.log("CY at", cx, cyy, "credits", game.player.credits);
const order = [9, 12, 17];
for (const type of order) {
  const opts = game.buildOptions(cy).map(o => `${STRUCTURE_NAMES[o.type]}(${o.available},${o.cost})`);
  console.log("options:", opts.join(", "));
  if (!game.buildOptions(cy).some(o => o.type === type && o.available > 0)) { console.log("not available", STRUCTURE_NAMES[type]); continue; }
  game.build(cy, type);
  let t = 0;
  while (!(game.production(cy)?.ready) && t < 60 * 600) { game.tick(); t++; }
  console.log(STRUCTURE_NAMES[type], "ready after", t, "ticks; credits", game.player.credits);
  if (!game.placeIt(cy)) { console.log("placeIt failed"); continue; }
  let placed = false;
  for (let r = 1; r < 8 && !placed; r++) for (let dy = -r; dy <= r && !placed; dy++) for (let dx = -r; dx <= r && !placed; dx++) {
    const p = packXY(cx + dx, cyy + dy);
    if (game.canPlaceAt(p) !== 0) { placed = game.place(p); if (placed) console.log("placed at", cx+dx, cyy+dy, "valid", game.canPlaceAt(p)); }
  }
  if (!placed) { console.log("no place"); game.cancelPlace(); }
  for (let i = 0; i < 600; i++) game.tick();
}
for (let i = 0; i < 60 * 120; i++) game.tick();
for (const s of G.structureFind) console.log(`S ${STRUCTURE_NAMES[s.o.type]} h${s.o.houseID} state${s.state} hp${s.o.hitpoints}`);
for (const u of G.unitFind) if (u.o.houseID === G.playerHouseID) console.log(`U ${UNIT_NAMES[u.o.type]} act${u.actionID} amount${u.amount} pos ${(u.o.position.x/256).toFixed(1)},${(u.o.position.y/256).toFixed(1)} notOnMap=${u.o.flags.isNotOnMap}`);
const h = game.player; console.log("credits", h.credits, "power", h.powerProduction, "/", h.powerUsage, "storage", h.creditsStorage);
// найти пряность и отправить харвестер
import { mapGetLandscapeType } from "/home/user/dune-remaster/web/src/engine/map.ts";
const hv = G.unitFind.find((u) => u.o.type === 16 && u.o.houseID === G.playerHouseID)!;
let spice = -1;
for (let p = 0; p < 4096 && spice < 0; p++) if (mapGetLandscapeType(p) === 8 || mapGetLandscapeType(p) === 9) spice = p;
console.log("spice at", spice & 63, spice >> 6);
game.order(hv, 5, spice);
for (let m = 1; m <= 6; m++) {
  for (let i = 0; i < 3600; i++) game.tick();
  console.log(`min ${m}: harvester act${hv.actionID} amount${hv.amount} pos ${(hv.o.position.x/256).toFixed(1)},${(hv.o.position.y/256).toFixed(1)} notOnMap=${hv.o.flags.isNotOnMap} credits ${game.player.credits}`);
}
