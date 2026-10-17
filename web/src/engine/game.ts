/**
 * Игра целиком: загрузка миссии из сценария ROM, такт 60 Гц (как g_timerGame), конец миссии
 * и команды игрока. Логика — OpenDUNE (opendune.c, scenario.c, gui/viewport.c, gui/widget_click.c).
 */
import type { DuneRom } from "../rom/dune.ts";
import type { Scenario } from "../rom/scenario.ts";
import { animationInit, animationTick } from "./animation.ts";
import {
  ACTION, G, HOUSE_INVALID, INDEX_INVALID, IT, MOVEMENT, SELECTION, STATE, STRUCTURE, UNIT, findAll, houseAllocate, houseFind,
  idiv, indexEncode, indexGetUnit, newScenario, packTile, packXY, poolsReset, randomLCGSeed, randomSeed, s8, structureFind, unitAllocate,
  unitFind, unitFree, unpackTile, type House, type Structure, type Unit,
} from "./core.ts";
import { explosionInit, explosionTick } from "./explosion.ts";
import { gameLoopHouse, houseCalculatePowerAndCredit, houseResetTimers, houseUpdateCreditsStorage } from "./house.ts";
import { mapBloomExplodeSpice, mapGetLandscapeType, mapIsValidPosition, mapUnveilTile } from "./map.ts";
import { objectGetByPackedTile, objectScriptVariable4Clear } from "./object.ts";
import { loadEmc, scriptLoad } from "./script.ts";
import { scriptFunctionsStructure, scriptFunctionsTeam, scriptFunctionsUnit } from "./scriptfns.ts";
import { msg } from "./strings.ts";
import {
  gameLoopStructure, setUnitCreateWrapper, structureCancelBuild, structureActivateSpecial, structureBuildObject, structureCreate, structureFree,
  structureGetBuildable, structureGetByPackedTile, structureGetStructuresBuilt, structureIsValidBuildLocation, structurePlayerPlace,
  structureRemoveFog, structureResetTimers, structureSetRepairingState, structureSetState, structureSetUpgradingState,
  structureStarportBuy,
} from "./structure.ts";
import { actionInfo, applyRomTables, structureInfo, unitInfo } from "./tables.ts";
import { gameLoopTeam, teamCreate, teamResetTimers } from "./team.ts";
import {
  gameLoopUnit, unitCreate, unitCreateWrapper, unitDeviationDecrease, unitFindTargetAround, unitGetByPackedTile, unitGetHouseID,
  unitHouseUnitCountAdd, unitLaunchHouseMissile, unitRemoveFog, unitResetTimers, unitSelect, unitSetAction, unitSetDestination,
  unitSetOrientation, unitSetSpeed, unitSetTarget, unitSort, unitUpdateMap,
} from "./unit.ts";

/** Скрипты EMC в ROM (FORM EMC2): юниты, здания, команды ИИ. */
const SCRIPT_UNIT = 0x04e188;
const SCRIPT_BUILD = 0x04db30;
const SCRIPT_TEAM = 0x04e02a;

const TEAM_ACTION_CHAR: Record<string, number> = { N: 0, S: 1, F: 2, K: 3, G: 4 };
const MOVEMENT_CHAR: Record<string, number> = { F: MOVEMENT.FOOT, T: MOVEMENT.TRACKED, H: MOVEMENT.HARVESTER, W: MOVEMENT.WHEELED, w: MOVEMENT.WINGER, S: MOVEMENT.SLITHER };

export type MissionEnd = "won" | "lost";

let tablesReady = false;

export class Game {
  /** номер миссии 1..9 и дом сценария */
  mission = 1;
  houseCode: "A" | "O" | "H" = "A";
  ended: MissionEnd | null = null;
  onEnd: (result: MissionEnd) => void = () => {};
  /** выбранное здание (клетка g_selectionPosition) */
  selectedStructure: Structure | null = null;
  private levelEndTimer = 0;

  constructor(private rom: DuneRom) {
    if (!tablesReady) {
      applyRomTables(rom.bytes);
      tablesReady = true;
    }
    G.iconGroups = Array.from({ length: 27 }, (_, i) => rom.iconGroup(i));
    G.veiledTileID = G.iconGroups[7][15];
    G.bloomTileID = G.iconGroups[10][0];
    G.builtSlabTileID = G.iconGroups[8][2];
    G.landscapeTileID = G.iconGroups[9][0];
    G.wallTileID = G.iconGroups[6][0];
    G.scriptUnit = loadEmc(rom.bytes, SCRIPT_UNIT, scriptFunctionsUnit);
    G.scriptStructure = loadEmc(rom.bytes, SCRIPT_BUILD, scriptFunctionsStructure);
    G.scriptTeam = loadEmc(rom.bytes, SCRIPT_TEAM, scriptFunctionsTeam);
    setUnitCreateWrapper(unitCreateWrapper);
  }

  get player(): House {
    return G.houses[G.playerHouseID];
  }

  /** Game_LoadScenario + Scenario_Load + Game_Prepare */
  load(house: "A" | "O" | "H", mission: number): Scenario {
    const sc = this.rom.scenario(house, mission);
    this.houseCode = house;
    this.mission = mission;
    this.ended = null;
    this.selectedStructure = null;
    this.levelEndTimer = 0;

    poolsReset();
    animationInit();
    explosionInit();
    unitResetTimers();
    structureResetTimers();
    houseResetTimers();
    teamResetTimers();
    G.starportAvailable.fill(0);
    G.playerCreditsNoSilo = 0;
    G.houseMissileCountdown = 0;
    G.unitHouseMissile = null;
    G.unitActive = null;
    G.structureActive = null;
    G.activeAction = 0xffff;
    G.structureActiveType = 0xffff;
    G.unitSelected = null;
    G.selectionType = SELECTION.STRUCTURE;
    randomSeed(G.timerGame * 2654435761);
    randomLCGSeed(G.timerGame);

    G.validateStrictIfZero++;
    G.scenarioID = mission;
    G.campaignID = mission - 1;
    G.scenario = newScenario();
    G.scenario.winFlags = sc.winFlags;
    G.scenario.loseFlags = sc.loseFlags;
    G.scenario.timeOut = sc.timeOut;
    G.scenario.mapScale = sc.mapScale;
    G.mapScale = sc.mapScale;

    // карта MD хранится готовой (у PC она строилась по зерну)
    const m = this.rom.missionMap(sc.mapIndex);
    for (let i = 0; i < 4096; i++) {
      const t = G.map[i];
      G.mapTileID[i] = m.ground[i];
      t.groundTileID = m.ground[i];
      t.isUnveiled = false;
      t.overlayTileID = G.veiledTileID;
    }

    // дома
    let player: House | null = null;
    for (const hs of sc.houses) {
      const h = houseAllocate(hs.id);
      if (!h) continue;
      h.credits = hs.credits;
      h.creditsQuota = hs.quota;
      h.unitCountMax = hs.maxUnits;
      if (hs.brain === "human") {
        h.flags.human = true;
        G.playerHouseID = hs.id;
        G.playerCreditsNoSilo = h.credits;
        player = h;
      }
    }
    if (player && player.unitCountMax === 0) {
      let max = 80;
      const find = findAll();
      for (;;) {
        const h2 = houseFind(find);
        if (!h2) break;
        if (h2.flags.human) continue;
        max -= h2.unitCountMax;
      }
      player.unitCountMax = max;
    }

    // юниты (Scenario_Load_Unit)
    for (const su of sc.units) {
      if (!G.houses[su.house]?.flags.used) houseAllocate(su.house);
      const u = unitAllocate(INDEX_INVALID, su.type, su.house);
      if (!u) continue;
      u.o.flags.byScenario = true;
      u.o.hitpoints = idiv(su.hp * unitInfo[su.type].o.hitpoints, 256);
      u.o.position = unpackTile(packXY(su.x, su.y));
      u.orientation[0].current = s8(su.orientation);
      u.actionID = su.action;
      u.nextActionID = ACTION.INVALID;
      if (!mapIsValidPosition(packTile(u.o.position)) && G.campaignID > 2) {
        unitFree(u);
        continue;
      }
      if (!u.o.flags.isNotOnMap) unitSetAction(u, u.actionID);
      u.o.seenByHouses = 0;
      unitHouseUnitCountAdd(u, u.o.houseID);
      unitSetOrientation(u, u.orientation[0].current, true, 0);
      unitSetOrientation(u, u.orientation[0].current, true, 1);
      unitSetSpeed(u, 0);
    }

    // здания (Scenario_Load_Structure): стены и бетон — записи GEN, остальные — с номером
    for (const ss of sc.structures) {
      if (!G.houses[ss.house]?.flags.used) houseAllocate(ss.house);
      const position = packXY(ss.x, ss.y);
      const gen = ss.type === STRUCTURE.WALL || ss.type === STRUCTURE.SLAB_1x1 || ss.type === STRUCTURE.SLAB_2x2;
      if (gen) {
        structureCreate(INDEX_INVALID, ss.type, ss.house, position);
        continue;
      }
      if (structureGetByPackedTile(position)) continue;
      const s = structureCreate(INDEX_INVALID, ss.type, ss.house, position);
      if (!s) continue;
      s.o.hitpoints = structureInfo[s.o.type].o.hitpoints;
      s.o.flags.degrades = false;
      s.state = STATE.IDLE;
    }

    // подкрепления: слово времени = (минуты << 8) | '+' у повторяющихся (повтор в оригинале выключен)
    sc.reinforcements.forEach((r, index) => {
      const [houseID, unitType, locationID, time] = r.values;
      if (index >= 16) return;
      G.validateStrictIfZero++;
      const u = unitCreate(INDEX_INVALID, unitType, houseID, { x: 0xffff, y: 0xffff }, 0);
      G.validateStrictIfZero--;
      if (!u) return;
      const timeBetween = (time >> 8) * 6 + 1;
      G.scenario.reinforcement[index] = { unitID: u.o.index, locationID, timeLeft: timeBetween, timeBetween, repeat: 0 };
    });

    for (const t of sc.teams) {
      teamCreate(t.house, TEAM_ACTION_CHAR[t.aiMode] ?? 0, MOVEMENT_CHAR[t.movement] ?? MOVEMENT.FOOT, t.min, t.max);
    }
    for (const [type, count] of sc.choam) if (type < UNIT.MAX) G.starportAvailable[type] = count;
    for (const b of sc.bloom) {
      const p = packXY(b.x, b.y);
      G.map[p].groundTileID = G.bloomTileID;
      G.mapTileID[p] |= 0x8000;
    }
    for (const f of sc.field) mapBloomExplodeSpice(packXY(f.x, f.y), HOUSE_INVALID);

    G.tickScenarioStart = G.timerGame;
    this.prepare();
    G.validateStrictIfZero--;
    return sc;
  }

  /** Game_Prepare */
  private prepare(): void {
    G.validateStrictIfZero++;
    for (let i = 0; i < 4096; i++) {
      const t = G.map[i];
      const u = unitGetByPackedTile(i);
      const s = structureGetByPackedTile(i);
      if (!u || !u.o.flags.used) t.hasUnit = false;
      if (!s || !s.o.flags.used) t.hasStructure = false;
      if (t.isUnveiled) mapUnveilTile(i, G.playerHouseID);
    }
    let find = findAll();
    for (;;) {
      const u = unitFind(find, unitGetHouseID);
      if (!u) break;
      if (u.o.flags.isNotOnMap) continue;
      unitRemoveFog(u);
      unitUpdateMap(1, u);
    }
    find = findAll();
    for (;;) {
      const s = structureFind(find);
      if (!s) break;
      if (s.o.type === STRUCTURE.SLAB_1x1 || s.o.type === STRUCTURE.SLAB_2x2 || s.o.type === STRUCTURE.WALL) continue;
      if (s.o.flags.isNotOnMap) continue;
      structureRemoveFog(s);
      if (s.o.type === STRUCTURE.STARPORT && s.o.linkedID !== 0xff) {
        const u = G.units[s.o.linkedID];
        if (!u.o.flags.used || !u.o.flags.isNotOnMap) {
          s.o.linkedID = 0xff;
          s.countDown = 0;
        } else {
          structureSetState(s, STATE.READY);
        }
      }
      scriptLoad(s.o.script, s.o.type);
      const h = G.houses[s.o.houseID];
      if (s.o.type === STRUCTURE.PALACE) h.palacePosition = { ...s.o.position };
      if (h.palacePosition.x !== 0 || h.palacePosition.y !== 0) continue;
      h.palacePosition = { ...s.o.position };
    }
    find = findAll();
    for (;;) {
      const h = houseFind(find);
      if (!h) break;
      h.structuresBuilt = structureGetStructuresBuilt(h);
      houseUpdateCreditsStorage(h.index);
      houseCalculatePowerAndCredit(h);
    }
    G.tickHousePowerMaintenance = Math.max(G.timerGame + 70, G.tickHousePowerMaintenance);
    G.playerCredits = 0xffff;
    G.validateStrictIfZero--;
  }

  /** Один такт 1/60 с: таймеры, команды, юниты, здания, дома, взрывы, анимации, конец миссии. */
  tick(): void {
    G.timerGUI++;
    G.timerGame++;
    if (this.ended) return;
    gameLoopTeam();
    gameLoopUnit();
    gameLoopStructure();
    gameLoopHouse();
    explosionTick();
    animationTick();
    unitSort();
    G.playerCredits = this.player?.credits ?? 0;
    this.levelEnd();
  }

  // ------------------------------------------------------------------ конец миссии (opendune.c)
  private countStructures(): { friendly: number; enemy: number } {
    let friendly = 0;
    let enemy = 0;
    const find = findAll();
    for (;;) {
      const s = structureFind(find);
      if (!s) break;
      const t = s.o.type;
      if (t === STRUCTURE.SLAB_1x1 || t === STRUCTURE.SLAB_2x2 || t === STRUCTURE.WALL || t === STRUCTURE.TURRET || t === STRUCTURE.ROCKET_TURRET) continue;
      if (s.o.houseID === G.playerHouseID) friendly++;
      else enemy++;
    }
    return { friendly, enemy };
  }

  private isLevelFinished(): boolean {
    if (G.timerGame - G.tickScenarioStart < 7200) return false;
    const sc = G.scenario;
    let finish = false;
    if ((sc.winFlags & 0x3) !== 0) {
      const c = this.countStructures();
      if ((sc.winFlags & 0x1) !== 0 && c.enemy === 0) finish = true;
      if ((sc.winFlags & 0x2) !== 0 && c.friendly === 0) finish = true;
    }
    if ((sc.winFlags & 0x4) !== 0 && G.playerCredits !== 0xffff && G.playerCredits >= this.player.creditsQuota) finish = true;
    if ((sc.winFlags & 0x8) !== 0 && G.timerGame >= this.timeoutTick()) finish = true;
    return finish;
  }

  private isLevelWon(): boolean {
    const sc = G.scenario;
    let win = false;
    if ((sc.loseFlags & 0x3) !== 0) {
      const c = this.countStructures();
      win = true;
      if ((sc.loseFlags & 0x1) !== 0) win = win && c.enemy === 0;
      if ((sc.loseFlags & 0x2) !== 0) win = win && c.friendly !== 0;
    }
    if (!win && (sc.loseFlags & 0x4) !== 0 && G.playerCredits !== 0xffff) win = G.playerCredits >= this.player.creditsQuota;
    if (!win && (sc.loseFlags & 0x8) !== 0) win = G.timerGame < this.timeoutTick();
    return win;
  }

  private timeoutTick(): number {
    return G.tickScenarioStart + G.scenario.timeOut * 60 * 60;
  }

  private levelEnd(): void {
    if (this.levelEndTimer >= G.timerGame) return;
    if (this.isLevelFinished()) {
      this.ended = this.isLevelWon() ? "won" : "lost";
      G.onFeedback(this.ended === "won" ? 40 : 41);
      G.onMessage(this.ended === "won" ? msg.missionWon : msg.missionLost, 0);
      this.onEnd(this.ended);
    }
    this.levelEndTimer = G.timerGame + 300;
  }

  // ------------------------------------------------------------------ что видно игроку
  isVisible(packed: number): boolean {
    return G.map[packed & 0xfff].isUnveiled;
  }

  /** Юниты на карте, которые должен видеть игрок (GUI_Widget_Viewport_Draw). */
  visibleUnits(): Unit[] {
    return G.unitFind.filter((u) => !u.o.flags.isNotOnMap && G.map[packTile(u.o.position)].isUnveiled);
  }

  // ------------------------------------------------------------------ команды игрока
  /** Map_SetSelection: выбрать юнит или здание на клетке. */
  selectAt(packed: number): Unit | Structure | null {
    if (G.selectionType === SELECTION.TARGET || G.selectionType === SELECTION.PLACE) return null;
    if (G.map[packed].overlayTileID === G.veiledTileID) return null;
    const s = structureGetByPackedTile(packed);
    if (s) {
      unitSelect(null);
      this.selectedStructure = s;
      return s;
    }
    this.selectedStructure = null;
    const u = unitGetByPackedTile(packed);
    if (u && u.o.type !== UNIT.CARRYALL) {
      unitSelect(u);
      return G.unitSelected;
    }
    unitSelect(null);
    return null;
  }

  /** Приказ юниту с целью на клетке (щелчок в режиме цели, gui/viewport.c). */
  order(u: Unit, action: number, packed: number): void {
    if (unitGetHouseID(u) !== G.playerHouseID) return;
    objectScriptVariable4Clear(u.o);
    u.targetAttack = 0;
    u.targetMove = 0;
    u.route[0] = 0xff;
    const encoded = action !== ACTION.MOVE && action !== ACTION.HARVEST ? indexEncode(unitFindTargetAround(packed), IT.TILE) : indexEncode(packed, IT.TILE);
    unitSetAction(u, action);
    if (action === ACTION.MOVE) unitSetDestination(u, encoded);
    else if (action === ACTION.HARVEST) u.targetMove = encoded;
    else {
      unitSetTarget(u, encoded);
      const target = indexGetUnit(u.targetAttack);
      if (target) target.blinkCounter = 8;
    }
    if (unitInfo[u.o.type].movementType === MOVEMENT.FOOT) G.onSound(actionInfo[action].soundID);
    else G.onSound((G.timerGame & 1) === 0 ? 20 : 17);
  }

  /** Какой приказ отдать по умолчанию, если игрок указал клетку (A в оригинале, левая кнопка мыши). */
  defaultAction(u: Unit, packed: number): number {
    const actions = unitInfo[u.o.type].o.actionsPlayer;
    const has = (a: number) => actions.includes(a);
    const target = objectGetByPackedTile(unitFindTargetAround(packed));
    if (target && G.map[packed].isUnveiled) {
      const enemyHouse = target.flags.isUnit ? unitGetHouseID(G.units[target.index]) : target.houseID;
      if (enemyHouse !== G.playerHouseID && has(ACTION.ATTACK)) return ACTION.ATTACK;
    }
    if (u.o.type === UNIT.HARVESTER && has(ACTION.HARVEST)) {
      const lst = mapGetLandscapeType(packed);
      if (lst === 8 || lst === 9) return ACTION.HARVEST;
    }
    if (has(ACTION.MOVE)) return ACTION.MOVE;
    return actions[0];
  }

  /** Кнопка действия юнита (GUI_Widget_TextButton_Click): true — нужно указать цель на карте. */
  unitCommand(u: Unit, action: number): boolean {
    if (u.deviated !== 0) {
      unitDeviationDecrease(u, 5);
      if (u.deviated === 0) return false;
    }
    const ai = actionInfo[action];
    if (ai.selectionType === SELECTION.TARGET) {
      G.unitActive = u;
      G.activeAction = action;
      G.selectionType = SELECTION.TARGET;
      return true;
    }
    objectScriptVariable4Clear(u.o);
    u.targetAttack = 0;
    u.targetMove = 0;
    u.route[0] = 0xff;
    unitSetAction(u, action);
    if (unitInfo[u.o.type].movementType === MOVEMENT.FOOT) G.onSound(ai.soundID);
    return false;
  }

  /** Указана цель для выбранного действия. */
  targetClick(packed: number): void {
    if (G.unitHouseMissile) {
      unitLaunchHouseMissile(packed);
      return;
    }
    const u = G.unitActive;
    const action = G.activeAction;
    G.unitActive = null;
    G.activeAction = 0xffff;
    G.selectionType = SELECTION.UNIT;
    if (u) this.order(u, action, packed);
  }

  cancelTarget(): void {
    if (G.structureActiveType !== 0xffff) this.cancelPlace();
    if (!G.unitActive) return;
    G.unitActive = null;
    G.activeAction = 0xffff;
    G.selectionType = SELECTION.UNIT;
  }

  // ---- здания
  /** Что можно заказать на заводе: тип и доступность (1 — да, −1 — после улучшения). */
  buildOptions(s: Structure): { type: number; available: number; cost: number; time: number }[] {
    const si = structureInfo[s.o.type];
    if (!si.o.flags.factory) return [];
    structureBuildObject(s, 0xffff);
    const out: { type: number; available: number; cost: number; time: number }[] = [];
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
      for (let i = 0; i < STRUCTURE.MAX; i++) {
        const o = structureInfo[i].o;
        if (o.available) out.push({ type: i, available: o.available, cost: o.buildCredits, time: o.buildTime });
      }
      out.sort((a, b) => structureInfo[a.type].o.sortPriority - structureInfo[b.type].o.sortPriority);
    } else {
      for (let i = 0; i < UNIT.MAX; i++) {
        const o = unitInfo[i].o;
        if (o.available) out.push({ type: i, available: o.available, cost: o.buildCredits, time: o.buildTime });
      }
      out.sort((a, b) => unitInfo[a.type].o.sortPriority - unitInfo[b.type].o.sortPriority);
    }
    return out;
  }

  /** Начать производство (или купить в космопорте). */
  build(s: Structure, type: number): void {
    if (s.o.type === STRUCTURE.STARPORT) {
      structureStarportBuy(s, [type]);
      return;
    }
    if (s.o.flags.onHold && s.objectType === type && s.o.linkedID !== 0xff) {
      s.o.flags.onHold = false;
      return;
    }
    structureBuildObject(s, type);
  }

  /** Состояние производства для меню. */
  production(s: Structure): { type: number; progress: number; ready: boolean; onHold: boolean } | null {
    if (s.o.linkedID === 0xff || s.objectType === 0xffff) return null;
    const oi = s.o.type === STRUCTURE.CONSTRUCTION_YARD ? structureInfo[s.objectType]?.o : unitInfo[s.objectType]?.o;
    if (!oi) return null;
    const total = oi.buildTime << 8;
    return { type: s.objectType, progress: total ? 1 - s.countDown / total : 1, ready: s.countDown === 0 && s.state === STATE.READY, onHold: s.o.flags.onHold };
  }

  /** STR_PLACE_IT: готовое здание со Строительного двора — в режим постановки. */
  placeIt(cy: Structure): boolean {
    if (cy.o.type !== STRUCTURE.CONSTRUCTION_YARD || cy.o.linkedID === 0xff || cy.countDown !== 0) return false;
    G.structureActive = G.structures[cy.o.linkedID];
    G.structureActiveType = cy.objectType;
    G.structureActivePosition = packTile(cy.o.position);
    cy.o.linkedID = 0xff;
    G.selectionType = SELECTION.PLACE;
    return true;
  }

  canPlaceAt(packed: number): number {
    if (G.structureActiveType === 0xffff) return 0;
    return structureIsValidBuildLocation(packed, G.structureActiveType);
  }

  place(packed: number): boolean {
    return structurePlayerPlace(packed);
  }

  /** GUI_Widget_Cancel_Click для постановки здания. */
  cancelPlace(): void {
    if (G.structureActiveType === 0xffff) return;
    const s = structureGetByPackedTile(G.structureActivePosition);
    const s2 = G.structureActive;
    if (s && s2) s.o.linkedID = s2.o.index & 0xff;
    else if (s2) structureFree(s2);
    G.structureActive = null;
    G.structureActiveType = 0xffff;
    G.selectionType = SELECTION.STRUCTURE;
  }

  toggleRepair(s: Structure): void {
    structureSetRepairingState(s, -1);
  }

  upgrade(s: Structure): void {
    structureSetUpgradingState(s, -1);
  }

  holdOrResume(s: Structure): void {
    if (s.o.flags.onHold) s.o.flags.onHold = false;
    else s.o.flags.onHold = true;
  }

  /** Отменить производство: деньги за непостроенную часть возвращаются (Structure_CancelBuild). */
  cancelBuild(s: Structure): void {
    structureCancelBuild(s);
    structureSetState(s, STATE.IDLE);
  }

  palaceSpecial(s: Structure): void {
    if (s.o.type !== STRUCTURE.PALACE || s.countDown !== 0) return;
    structureActivateSpecial(s);
  }

  /** Можно ли улучшить здание (и сколько стоит). */
  upgradeInfo(s: Structure): { possible: boolean; cost: number } {
    const si = structureInfo[s.o.type];
    return { possible: s.upgradeTimeLeft !== 0 && !!si.o.flags.factory, cost: idiv(si.o.buildCredits, 2) };
  }

  buildable(s: Structure): number {
    return structureGetBuildable(s);
  }
}

export { G };
