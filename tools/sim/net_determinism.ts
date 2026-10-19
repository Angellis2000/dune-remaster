// Проверка детерминизма без браузера (node --experimental-transform-types tools/sim/net_determinism.ts …).
//   campaign <дом A|O|H> <миссия> <кадров> [папка engine]  — хеши кампании каждые 600 кадров (сравнить старый и новый движок)
//   net <местный дом> <шум 0|1> <карта> <кадров>            — сетевой матч 3 игроков: одинаковые команды, разные местные
//                                                            игроки и «щелчки» интерфейса; хеши должны совпасть
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const [mode, ...args] = process.argv.slice(2);
const root = new URL("../../", import.meta.url);
const engineDir = mode === "campaign" && args[3] ? pathToFileURL(args[3].replace(/[\\/]+$/, "") + "/") : new URL("web/src/engine/", root);
const { DuneRom } = await import(new URL("web/src/rom/dune.ts", root).href);
const { Game } = await import(new URL("game.ts", engineDir).href);
const core = await import(new URL("core.ts", engineDir).href);
const structureMod = mode === "net" ? await import(new URL("structure.ts", engineDir).href) : null;
const { G } = core;
const rom = new DuneRom(new Uint8Array(readFileSync(new URL("rom/dune_usa.gen", root))));

/** Хеш состояния — свой, чтобы им можно было мерить и старый движок без netHash. */
function hash(): number {
  let h = 0x811c9dc5;
  const mix = (v: number) => (h = Math.imul(h ^ (v | 0), 0x01000193) >>> 0);
  mix(G.timerGame);
  for (const u of G.units) {
    if (!u.o.flags.used) continue;
    mix(u.o.index); mix(u.o.type); mix(u.o.houseID); mix(u.o.position.x); mix(u.o.position.y); mix(u.o.hitpoints); mix(u.actionID); mix(u.o.seenByHouses);
  }
  for (const s of G.structures) {
    if (!s.o.flags.used) continue;
    mix(s.o.index); mix(s.o.type); mix(s.o.houseID); mix(s.o.hitpoints); mix(s.state); mix(s.countDown);
  }
  for (const hh of G.houses) if (hh.flags.used) { mix(hh.index); mix(hh.credits); mix(hh.unitCountEnemy); mix(hh.flags.isAIActive ? 1 : 0); }
  return h;
}

if (mode === "campaign") {
  const [house, mission, frames] = [args[0], Number(args[1]), Number(args[2])];
  G.timerGame = 0;
  const game = new Game(rom);
  game.load(house, mission);
  const out: string[] = [];
  for (let f = 1; f <= frames; f++) {
    // приказы игрока: все его юниты идут в атаку на первое вражеское здание
    if (f === 120) {
      const enemy = G.structures.find((s: any) => s.o.flags.used && s.o.houseID !== G.playerHouseID);
      if (enemy) {
        const p = core.packTile(enemy.o.position);
        for (const u of G.units) if (u.o.flags.used && u.o.houseID === G.playerHouseID && !u.o.flags.isNotOnMap) game.order(u, 1, p);
      }
    }
    game.tick();
    if (f % 600 === 0) out.push(hash().toString(16));
  }
  console.log(out.join(" "));
} else if (mode === "net") {
  const [local, noise, map, frames] = [Number(args[0]), args[1] === "1", Number(args[2]), Number(args[3])];
  const players = [
    { slot: 0, house: 1, team: 0, name: "А" },
    { slot: 1, house: 0, team: 1, name: "Х" },
    { slot: 2, house: 2, team: 1, name: "О" },
  ];
  const game = new Game(rom);
  game.loadNetwork({ map, seed: 0x5eed1234, credits: 5000, players, local });
  // как в браузере: на время матча интерфейс подменяет методы игры отправкой команд — execNet не должен в них попадать
  const { installNetControls } = await import(new URL("web/src/net/controls.ts", root).href);
  installNetControls(game, (c: unknown) => { throw new Error(`execNet отправил команду в сеть: ${JSON.stringify(c)}`); }, () => local);
  const cyOf = (house: number) => G.structures.find((s: any) => s.o.flags.used && s.o.houseID === house && s.o.type === core.STRUCTURE.CONSTRUCTION_YARD);
  const quadsOf = (house: number) => G.units.filter((u: any) => u.o.flags.used && u.o.houseID === house && u.o.type === core.UNIT.QUAD).map((u: any) => u.o.index);
  /** ближайшее к двору годное место для здания type (так же ищет интерфейс) */
  const spot = (house: number, type: number) => {
    const cy = cyOf(house);
    const x0 = core.packTile(cy.o.position) & 63, y0 = core.packTile(cy.o.position) >> 6;
    for (let r = 1; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = x0 + dx, y = y0 + dy;
      if (x < 0 || y < 0 || x > 62 || y > 62) continue;
      const p = core.packXY(x, y);
      if (structureMod.structureIsValidBuildLocationFor(p, type, house) !== 0) return p;
    }
    return 0;
  };
  // сценарий команд — одинаковый у всех клиентов (как ходы с сервера)
  const script = new Map<number, [number, any][]>();
  const at = (f: number, house: number, c: any) => script.set(f, [...(script.get(f) ?? []), [house, c]]);
  for (const p of players) {
    at(10, p.house, () => ({ k: "build", s: cyOf(p.house)?.o.index ?? -1, t: core.STRUCTURE.WINDTRAP }));
    at(600, p.house, () => ({ k: "place", s: cyOf(p.house).o.index, p: spot(p.house, core.STRUCTURE.WINDTRAP) }));
    at(610, p.house, () => ({ k: "build", s: cyOf(p.house)?.o.index ?? -1, t: core.STRUCTURE.REFINERY }));
    at(900, p.house, () => {
      const enemy = players.find((q) => q.team !== p.team)!;
      return { k: "order", u: quadsOf(p.house), a: 0, p: core.packTile(cyOf(enemy.house).o.position) };
    });
    at(1500, p.house, () => ({ k: "place", s: cyOf(p.house).o.index, p: spot(p.house, core.STRUCTURE.REFINERY) }));
  }
  const out: string[] = [];
  let rnd = 12345;
  for (let f = 1; f <= frames; f++) {
    for (const [house, make] of script.get(f) ?? []) game.execNet(house, make());
    if (noise && f % 7 === 0) {
      // интерфейс местного игрока: выбор клетки, списки заказов, космопорт — в сети это не должно менять игру
      rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0;
      game.selectAt((rnd >>> 8) & 4095);
      const cy = cyOf(local);
      if (cy) { game.buildOptions(cy); game.buildable(cy); game.production(cy); game.upgradeEntry(cy); }
      game.starportPrices();
    }
    game.tick();
    if (f % 60 === 0) out.push(`${game.netHash().toString(16)}/${hash().toString(16)}`);
  }
  const live = players.map((p) => `${p.house}:${G.structures.filter((s: any) => s.o.flags.used && s.o.houseID === p.house).length}зд/${G.units.filter((u: any) => u.o.flags.used && u.o.houseID === p.house).length}юн/${G.houses[p.house].credits}кр`).join(" ");
  console.log(out.join(" "));
  console.error("итог:", live, "конец:", game.ended);
}
