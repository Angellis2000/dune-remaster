// Сеть: личное поражение (свой дом разбит, союзник жив — onNetOut, матч идёт) и поражение команды (все разбиты).
// node --experimental-transform-types tools/sim/net_defeat.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DuneRom } from "../../web/src/rom/dune.ts";
import { Game } from "../../web/src/engine/game.ts";
import { G } from "../../web/src/engine/core.ts";
import { structureFree } from "../../web/src/engine/structure.ts";
import { unitFree } from "../../web/src/engine/core.ts";
const rom = new DuneRom(new Uint8Array(readFileSync(new URL("../../rom/dune_usa.gen", import.meta.url))));
G.timerGame = 0;
const game = new Game(rom);
let out = 0, end: string | null = null;
game.onNetOut = () => out++;
game.onEnd = (r) => { end = r; };
game.loadNetwork({ map: 5, seed: 7, credits: 5000, local: 1, players: [
  { slot: 0, house: 1, team: 0, name: "Я" }, { slot: 1, house: 2, team: 0, name: "Союзник", ai: true },
  { slot: 3, house: 0, team: 1, name: "Враг", ai: true }] });
const wipe = (h: number) => { for (const s of G.structures) if (s.o.flags.used && s.o.houseID === h) structureFree(s); for (const u of G.units) if (u.o.flags.used && u.o.houseID === h) unitFree(u); };
for (let f = 0; f < 600; f++) game.tick();
wipe(1);
for (let f = 0; f < 700; f++) game.tick();
assert.equal(out, 1, "личное поражение должно прийти один раз");
assert.equal(end, null, "команда ещё жива — матч не кончен");
wipe(2);
for (let f = 0; f < 700; f++) game.tick();
assert.equal(end, "lost", "все союзники разбиты — поражение команды");
console.log("defeat: личное поражение при живом союзнике, затем поражение команды");
