/**
 * Команды ИИ (OpenDUNE src/team.c): группы юнитов со своим скриптом TEAM.EMC.
 */
import { G, INDEX_INVALID, findAll, random256, teamAllocate, teamFind, type Team } from "./core.ts";
import { scriptIsLoaded, scriptLoad, scriptReset, scriptRun } from "./script.ts";
import { netAIPeace } from "./net-ai.ts";

const ticks = { team: 0 };

export function teamResetTimers(): void {
  ticks.team = 0;
}

export function teamGetByIndex(index: number): Team {
  return G.teams[index];
}

export function gameLoopTeam(): void {
  if (ticks.team > G.timerGame) return;
  const thinkDelay = (random256() & 7) + 5;
  ticks.team = G.timerGame + Math.max(3, Math.round(thinkDelay * [1.35, 1, 0.8][G.difficulty]));
  G.scriptCurrentObject = null;
  G.scriptCurrentUnit = null;
  G.scriptCurrentStructure = null;
  const find = findAll();
  for (;;) {
    const t = teamFind(find);
    if (!t) break;
    const h = G.houses[t.houseID];
    G.scriptCurrentTeam = t;
    if (!h.flags.isAIActive) continue;
    // сеть: в «мирное время» компьютер копит силы, команды атаки не собираются (engine/net-ai.ts)
    if (netAIPeace(t.houseID)) continue;
    if (t.script.delay !== 0) {
      t.script.delay--;
      continue;
    }
    if (!scriptIsLoaded(t.script)) continue;
    if (!scriptRun(t.script)) break;
  }
}

export function teamCreate(houseID: number, teamActionType: number, movementType: number, minMembers: number, maxMembers: number): Team | null {
  const t = teamAllocate(INDEX_INVALID);
  if (!t) return null;
  t.flags.used = true;
  t.houseID = houseID;
  t.action = teamActionType;
  t.actionStart = teamActionType;
  t.movementType = movementType;
  t.minMembers = minMembers;
  t.maxMembers = maxMembers;
  scriptReset(t.script, G.scriptTeam);
  scriptLoad(t.script, teamActionType);
  t.script.delay = 0;
  return t;
}
