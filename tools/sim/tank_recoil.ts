// Отдача танков: танки игрока атакуют врага, считаем, сколько кадров держится кадр отдачи (по коду MD — 3–4).
import { readFileSync } from "node:fs";
import { DuneRom } from "../../web/src/rom/dune.ts";
import { Game } from "../../web/src/engine/game.ts";
import { G, ACTION, packTile } from "../../web/src/engine/core.ts";
const rom = new DuneRom(new Uint8Array(readFileSync(new URL("../../rom/dune_usa.gen", import.meta.url))));
for (const [h, m] of [["H", 5], ["O", 7]] as const) {
  const g = new Game(rom);
  g.load(h, m);
  const used = () => G.units.filter((u) => u.o.flags.used && !u.o.flags.isNotOnMap);
  const mine = used().filter((u) => (u.o.type === 9 || u.o.type === 10) && u.o.houseID === G.playerHouseID);
  const attack = () => {
    const e = used().filter((x) => x.o.houseID !== G.playerHouseID);
    if (e.length) for (const u of mine) if (u.o.flags.used && u.targetAttack === 0) g.order(u, ACTION.ATTACK, packTile(e[0].o.position));
  };
  attack();
  const start = new Map<object, number>();
  const lens: Record<number, number> = {};
  for (let t = 0; t < 4000; t++) {
    g.tick();
    for (const u of mine) {
      if (u.recoilShown && !start.has(u)) start.set(u, G.timerGame);
      if (!u.recoilShown && start.has(u)) {
        const d = G.timerGame - start.get(u)!;
        lens[d] = (lens[d] ?? 0) + 1;
        start.delete(u);
      }
    }
    if (t % 300 === 299) attack();
  }
  console.log(`${h}${m}: танков ${mine.length}; отдача, кадров → раз:`, lens);
}
