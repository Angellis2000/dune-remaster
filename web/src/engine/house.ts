/**
 * Дома: деньги, энергия, хранилища, подкрепления, космопорт, ракета дворца (OpenDUNE src/house.c).
 */
import { G, HOUSE, HOUSE_INVALID, INDEX_INVALID, IT, STRUCTURE, UNIT, findAll, houseFind, idiv, indexEncode, randomRange, random256, structureFind, unitFind, unpackTile, type House, type Unit } from "./core.ts";
import { mapFindLocationTile } from "./map.ts";
import { msg } from "./strings.ts";
import { houseInfo, structureInfo } from "./tables.ts";
import { unitCreate, unitCreateWrapper, unitGetHouseID, unitIsTypeOnMap, unitLaunchHouseMissile, unitSetDestination, unitSetPosition } from "./unit.ts";
import { structureCalculateHitpointsMax } from "./structure.ts";

const ticks = { house: 0, starport: 0, reinforcement: 0, missileCountdown: 0, starportAvailability: 0 };

export function houseResetTimers(): void {
  for (const k of Object.keys(ticks) as (keyof typeof ticks)[]) ticks[k] = 0;
  G.tickHousePowerMaintenance = 0;
}

export function houseGet(houseID: number): House {
  return G.houses[houseID];
}

export function gameLoopHouse(): void {
  let tickHouse = false;
  let tickPowerMaintenance = false;
  let tickStarport = false;
  let tickReinforcement = false;
  let tickMissileCountdown = false;
  let tickStarportAvailability = false;
  const now = G.timerGame;
  if (ticks.house <= now) {
    tickHouse = true;
    ticks.house = now + 900;
  }
  if (G.tickHousePowerMaintenance <= now) {
    tickPowerMaintenance = true;
    G.tickHousePowerMaintenance = now + 10800;
  }
  if (ticks.starport <= now) {
    tickStarport = true;
    ticks.starport = now + 180;
  }
  if (ticks.reinforcement <= now) {
    tickReinforcement = true;
    ticks.reinforcement = now + 600;
  }
  if (ticks.missileCountdown <= now) {
    tickMissileCountdown = true;
    ticks.missileCountdown = now + 60;
  }
  if (ticks.starportAvailability <= now) {
    tickStarportAvailability = true;
    ticks.starportAvailability = now + 1800;
  }

  if (tickMissileCountdown && G.houseMissileCountdown !== 0) {
    G.houseMissileCountdown--;
    G.onFeedback(G.houseMissileCountdown + 41);
    if (G.houseMissileCountdown === 0) unitLaunchHouseMissile(mapFindLocationTile(4, G.playerHouseID));
  }

  if (tickStarportAvailability) {
    const type = randomRange(0, UNIT.MAX - 1);
    if (G.starportAvailable[type] !== 0 && G.starportAvailable[type] < 10) {
      if (G.starportAvailable[type] === -1) G.starportAvailable[type] = 1;
      else G.starportAvailable[type]++;
    }
  }

  if (tickReinforcement) {
    let nu: Unit | null = null;
    for (const r of G.scenario.reinforcement) {
      if (r.unitID === INDEX_INVALID) continue;
      if (r.timeLeft === 0) continue;
      if (--r.timeLeft !== 0) continue;
      let u = G.units[r.unitID];
      const locationID = r.locationID;
      let deployed = false;
      if (locationID >= 4) {
        if (!nu) {
          nu = unitCreate(INDEX_INVALID, UNIT.CARRYALL, u.o.houseID, unpackTile(mapFindLocationTile(random256() & 3, u.o.houseID)), 100);
          if (nu) {
            nu.o.flags.byScenario = true;
            unitSetDestination(nu, indexEncode(mapFindLocationTile(locationID, u.o.houseID), IT.TILE));
          }
        }
        if (nu) {
          u.o.linkedID = nu.o.linkedID;
          nu.o.linkedID = u.o.index & 0xff;
          nu.o.flags.inTransport = true;
          r.unitID = INDEX_INVALID;
          deployed = true;
        } else {
          r.timeLeft = 1;
        }
      } else {
        deployed = unitSetPosition(u, unpackTile(mapFindLocationTile(locationID, u.o.houseID)));
      }
      if (deployed && r.repeat !== 0) {
        G.validateStrictIfZero++;
        const nu2 = unitCreate(INDEX_INVALID, u.o.type, u.o.houseID, { x: 0xffff, y: 0xffff }, 0);
        G.validateStrictIfZero--;
        if (nu2) {
          u = nu2;
          r.unitID = u.o.index;
          r.timeLeft = r.timeBetween;
        }
      }
    }
  }

  const find = findAll();
  for (;;) {
    const h = houseFind(find);
    if (!h) break;
    if (tickHouse) {
      if (h.index !== G.playerHouseID) {
        if (h.creditsStorage < h.credits) h.credits = h.creditsStorage;
      } else {
        const maxCredits = Math.max(h.creditsStorage, G.playerCreditsNoSilo);
        if (h.credits > maxCredits) {
          h.credits = maxCredits;
          G.onMessage(msg.spiceLost, 1);
        }
      }
      if (h.index === G.playerHouseID) {
        if (h.creditsStorage > G.playerCreditsNoSilo) G.playerCreditsNoSilo = 0;
        if (G.playerCreditsNoSilo === 0 && G.campaignID > 1 && h.credits !== 0) {
          if (h.creditsStorage !== 0 && idiv(h.credits * 256, h.creditsStorage) > 200) G.onMessage(msg.storageLow, 0);
        }
        if (h.credits < 100 && G.playerCreditsNoSilo !== 0) G.onMessage(msg.creditsLow, 0);
      }
    }
    if (tickHouse) houseEnsureHarvesterAvailable(h.index);
    if (tickStarport && h.starportLinkedID !== INDEX_INVALID) {
      let u: Unit | null = null;
      h.starportTimeLeft = Math.max(0, h.starportTimeLeft - 1);
      if (h.starportTimeLeft === 0) {
        let s = G.structures[G.structureIndex];
        if (s.o.type === STRUCTURE.STARPORT && s.o.houseID === h.index) {
          u = unitCreateWrapper(h.index, UNIT.FRIGATE, indexEncode(s.o.index, IT.STRUCTURE));
        } else {
          const find2 = findAll(h.index, STRUCTURE.STARPORT);
          for (;;) {
            const s2 = structureFind(find2);
            if (!s2) break;
            s = s2;
            if (s.o.linkedID !== 0xff) continue;
            u = unitCreateWrapper(h.index, UNIT.FRIGATE, indexEncode(s.o.index, IT.STRUCTURE));
            break;
          }
        }
        if (u) {
          u.o.linkedID = h.starportLinkedID & 0xff;
          h.starportLinkedID = INDEX_INVALID;
          u.o.flags.inTransport = true;
          G.onFeedback(38);
        }
        h.starportTimeLeft = u ? houseInfo[h.index].starportDeliveryTime : 1;
      }
    }
    if (tickHouse) {
      houseCalculatePowerAndCredit(h);
      structureCalculateHitpointsMax(h);
      if (h.timerUnitAttack !== 0) h.timerUnitAttack--;
      if (h.timerSandwormAttack !== 0) h.timerSandwormAttack--;
      if (h.timerStructureAttack !== 0) h.timerStructureAttack--;
      if (h.harvestersIncoming > 0 && unitCreateWrapper(h.index, UNIT.HARVESTER, 0)) h.harvestersIncoming--;
    }
    if (tickPowerMaintenance) {
      const cost = idiv(h.powerUsage, 32) + 1;
      h.credits -= Math.min(h.credits, cost);
    }
  }
}

function houseEnsureHarvesterAvailable(houseID: number): void {
  let find = findAll(houseID);
  for (;;) {
    const s = structureFind(find);
    if (!s) break;
    if (s.o.type === STRUCTURE.HEAVY_VEHICLE) continue;
    if (s.o.linkedID === UNIT.INVALID) continue;
    if (G.units[s.o.linkedID].o.type === UNIT.HARVESTER) return;
  }
  find = findAll(houseID, UNIT.CARRYALL);
  for (;;) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.o.linkedID === UNIT.INVALID) continue;
    if (G.units[u.o.linkedID].o.type === UNIT.HARVESTER) return;
  }
  if (unitIsTypeOnMap(houseID, UNIT.HARVESTER)) return;
  const s = structureFind(findAll(houseID, STRUCTURE.REFINERY));
  if (!s) return;
  if (!unitCreateWrapper(houseID, UNIT.HARVESTER, indexEncode(s.o.index, IT.STRUCTURE))) return;
  if (houseID !== G.playerHouseID) return;
  G.onMessage(msg.harvesterHeading, 0);
}

export function houseAreAllied(houseID1: number, houseID2: number): boolean {
  if (houseID1 === HOUSE_INVALID || houseID2 === HOUSE_INVALID) return false;
  if (houseID1 === houseID2) return true;
  if (houseID1 === HOUSE.FREMEN || houseID2 === HOUSE.FREMEN) return houseID1 === HOUSE.ATREIDES || houseID2 === HOUSE.ATREIDES;
  return houseID1 !== G.playerHouseID && houseID2 !== G.playerHouseID;
}

/** Радар (аванпост + энергии хватает). Заставка «помехи» из PC не нужна — меняется только флаг. */
export function houseUpdateRadarState(h: House | null): boolean {
  if (!h || h.index !== G.playerHouseID) return false;
  let activate = h.flags.radarActivated;
  const hasOutpost = (h.structuresBuilt & (1 << STRUCTURE.OUTPOST)) !== 0;
  if (h.flags.radarActivated) {
    if (!hasOutpost || h.powerProduction < h.powerUsage) activate = false;
  } else if (hasOutpost && h.powerProduction >= h.powerUsage) {
    activate = true;
  }
  if (h.flags.radarActivated === activate) return false;
  G.onFeedback(activate ? 28 : 29);
  h.flags.radarActivated = activate;
  return activate;
}

export function houseUpdateCreditsStorage(houseID: number): void {
  const old = G.validateStrictIfZero;
  G.validateStrictIfZero = 0;
  let creditsStorage = 0;
  const find = findAll(houseID);
  for (;;) {
    const s = structureFind(find);
    if (!s) break;
    creditsStorage += structureInfo[s.o.type].creditsStorage;
  }
  if (creditsStorage > 32000) creditsStorage = 32000;
  G.houses[houseID].creditsStorage = creditsStorage;
  G.validateStrictIfZero = old;
}

export function houseCalculatePowerAndCredit(h: House | null): void {
  if (!h) return;
  h.powerUsage = 0;
  h.powerProduction = 0;
  h.creditsStorage = 0;
  const find = findAll(h.index);
  for (;;) {
    const s = structureFind(find);
    if (!s) break;
    const si = structureInfo[s.o.type];
    h.creditsStorage += si.creditsStorage;
    if (si.powerUsage >= 0) {
      h.powerUsage += si.powerUsage;
      continue;
    }
    if (s.o.hitpoints >= si.o.hitpoints) {
      h.powerProduction += -si.powerUsage;
      continue;
    }
    if (s.o.hitpoints <= idiv(si.o.hitpoints, 2)) {
      h.powerProduction += idiv(-si.powerUsage, 2);
      continue;
    }
    h.powerProduction += idiv(-si.powerUsage * s.o.hitpoints, si.o.hitpoints);
  }
  if (h.index === G.playerHouseID && h.powerUsage > h.powerProduction) G.onMessage(msg.insufficientPower, 1);
  if (h.index === G.playerHouseID && h.structuresBuilt === 0 && G.validateStrictIfZero === 0) G.playerCreditsNoSilo = 0;
}

export const HOUSE_IDS = HOUSE;
