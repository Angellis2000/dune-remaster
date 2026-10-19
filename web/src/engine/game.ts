/**
 * Игра целиком: загрузка миссии из сценария ROM, такт 60 Гц (как g_timerGame), конец миссии
 * и команды игрока. Логика — OpenDUNE (opendune.c, scenario.c, gui/viewport.c, gui/widget_click.c).
 */
import type { DuneRom } from "../rom/dune.ts";
import type { Scenario } from "../rom/scenario.ts";
import { animationInit, animationTick } from "./animation.ts";
import {
  ACTION, G, HOUSE, HOUSE_INVALID, INDEX_INVALID, IT, MAP_INFOS, MOVEMENT, SELECTION, STATE, STRUCTURE, UNIT, findAll, houseAllocate, houseFind, isHuman, isLocal, randomState,
  idiv, indexEncode, indexGetUnit, newScenario, packTile, packXY, poolsReset, randomLCGSeed, randomRange, randomSeed, s8, structureFind, unitAllocate,
  tileCenter, unitFind, unitFree, unpackTile, type House, type Structure, type Unit,
} from "./core.ts";
import { explosionInit, explosionTick } from "./explosion.ts";
import { gameLoopHouse, houseCalculatePowerAndCredit, houseResetTimers, houseUpdateCreditsStorage } from "./house.ts";
import { mapBloomExplodeSpice, mapGetLandscapeType, mapIsUnveiledLocal, mapIsValidPosition, mapUnveilTile } from "./map.ts";
import { objectGetByPackedTile, objectScriptVariable4Clear } from "./object.ts";
import { loadEmc, scriptLoad } from "./script.ts";
import { scriptFunctionsStructure, scriptFunctionsTeam, scriptFunctionsUnit, structureDeployProducedUnit, unitsAssignAttackSpots } from "./scriptfns.ts";
import { msg } from "./strings.ts";
import {initializeDrone,clampDronePoint,droneTargetAllowed,droneCanLaunch} from './advanced-units.ts';
import {
  gameLoopStructure, setUnitCreateWrapper, structureCancelBuild, structureActivateSpecial, structureBuildObject, structureCreate, structureFree,
  structureGetBuildable, structureGetByPackedTile, structureGetStructuresBuilt, structureIsUpgradable, structureIsValidBuildLocation, structurePlacementDetail, structurePlayerPlace,
  structureRemoveFog, structureResetTimers, structureSetRepairingState, structureSetState, structureSetUpgradingState,
  structureStarportBuy,structureCanQueueUnits,structureEnqueueUnit,structureCancelQueuedUnit,structureEnqueueBuilding,structureCancelQueuedBuilding,structureStartNextBuilding,setStructureReleaseUnit,
} from "./structure.ts";
import { actionInfo, applyRomTables, landscapeInfo, structureInfo, unitInfo } from "./tables.ts";
import { gameLoopTeam, teamCreate, teamResetTimers } from "./team.ts";
import {configureNetworkPools} from './core.ts';
import {NETWORK_UNIT_LIMIT} from './network-rules.ts';
import { netBuildAIBase, netCreateAITeams, netHandOver, netSetupAIHouse } from "./net-ai.ts";
import {
  gameLoopUnit, unitCreate, unitCreateWrapper, unitDeviationDecrease, unitFindTargetAround, unitGetByPackedTile, unitGetHouseID, unitGetTileEnterScore,
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

/** Игрок сетевого матча: дом движка (0..5) — он же фракция, команда, имя. */
export interface NetPlayer {
  slot: number;
  house: number;
  team: number;
  name: string;
  /** противник-компьютер (engine/net-ai.ts): готовая база, заводы и команды ИИ */
  ai?: boolean;
}
/** Всё, что нужно, чтобы у всех клиентов матч начался одинаково. */
export interface NetSetup {
  /** номер карты ROM 1..27 */
  map: number;
  seed: number;
  credits: number;
  players: NetPlayer[];
  /** дом местного игрока или −1 — наблюдатель */
  local: number;
}
/**
 * Команды игрока в сети: всё, что меняет игру, идёт только через них и выполняется у всех в один такт.
 * u — номера юнитов в пуле, s — номер здания, p — клетка (packed), a — действие, t — тип.
 */
export type NetCommand =
  | { k: "order"; u: number[]; a: number; p: number }
  | { k: "act"; u: number[]; a: number }
  | { k: "build"; s: number; t: number }
  | { k: "cancel"; s: number }
  | { k: "hold"; s: number }
  | { k: "stop"; s: number }
  | { k: "repair"; s: number }
  | { k: "fix"; s: number }
  | { k: "upgrade"; s: number }
  | { k: "unqueue"; s: number; i: number }
  | { k: "unqueueB"; s: number; i: number }
  | { k: "unreadyB"; s: number; t: number }
  | { k: "starport"; s: number; t: number }
  | { k: "place"; s: number; p: number; t?: number }
  | { k: "palace"; s: number; p: number }
  | { k: "left" };

/** Космопорт сетевого матча: что и сколько можно купить (общий запас CHOAM). */
const NET_STARPORT_STOCK: [number, number][] = [
  [UNIT.CARRYALL, 2], [UNIT.ORNITHOPTER, 2], [UNIT.TRIKE, 5], [UNIT.QUAD, 5], [UNIT.TANK, 4], [UNIT.LAUNCHER, 3],
  [UNIT.SIEGE_TANK, 3], [UNIT.HARVESTER, 3], [UNIT.MCV, 2], [UNIT.LASER_TANK, 2], [UNIT.COMBAT_DRONE, 2],
];

let tablesReady = false;

/** $010DA2: какой юнит покажет пункт улучшения завода (по уровню и дому). */
function upgradeUnlocksUnit(s: Structure): number {
  const level = s.upgradeLevel;
  const built = G.houses[s.creatorHouseID]?.structuresBuilt ?? 0;
  switch (s.o.type) {
    case STRUCTURE.LIGHT_VEHICLE:
      return level === 1 ? UNIT.HARVESTER : UNIT.QUAD;
    case STRUCTURE.HEAVY_VEHICLE:
      if (!(built & (1 << STRUCTURE.OUTPOST))) return UNIT.HARVESTER;
      if (level === 1) return s.creatorHouseID === HOUSE.ORDOS ? UNIT.SIEGE_TANK : UNIT.LAUNCHER;
      return level === 2 ? UNIT.SIEGE_TANK : UNIT.MCV;
    case STRUCTURE.HIGH_TECH:
      return s.o.houseID === HOUSE.HARKONNEN ? UNIT.CARRYALL : UNIT.ORNITHOPTER;
    case STRUCTURE.WOR_TROOPER:
      return UNIT.TROOPERS;
    case STRUCTURE.BARRACKS:
      return s.o.houseID === HOUSE.ORDOS && level === 1 ? UNIT.TROOPER : UNIT.INFANTRY;
    default:
      return UNIT.CARRYALL;
  }
}

export class Game {
  /** номер миссии 1..9 и дом сценария */
  mission = 1;
  /** 0 — easy, 1 — normal, 2 — hard. */
  difficulty = 1;
  houseCode: "A" | "O" | "H" = "A";
  ended: MissionEnd | null = null;
  /** кадров, которые игра ещё идёт после конца миссии (пролёт орнитоптеров, $026984) */
  afterEnd = 0;
  onEnd: (result: MissionEnd) => void = () => {};
  /** выбранное здание (клетка g_selectionPosition) */
  selectedStructure: Structure | null = null;
  private levelEndTimer = 0;
  /** космопорт MD: юниты сценария (CHOAM) по возрастанию номера — в окне и при нулевом запасе */
  starportListed: number[] = [];
  /** цены космопорта MD и кадр, до которого они действуют ($FFBF88, 18000 кадров) */
  private starportPriceList: number[] = [];
  private starportPriceUntil = -1;
  /** зерно сетевого матча (цены космопорта считаются из него, не трогая общий генератор) */
  private netSeed = 0;
  /** живые дома сетевого матча, как их видел последний подсчёт */
  netAlive = 0;
  /** все дома матча: люди и компьютеры (кто может победить) */
  private netPlayersMask = 0;
  /** кому ушла база последнего вышедшего: дом союзника, −1 — компьютеру (только для сообщения) */
  netLastHandOver = -2;
  /** выполняется ли сейчас команда сети: интерфейсные вызовы снаружи не должны менять таблицы */
  private netExecuting = false;

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
    setStructureReleaseUnit((s, u) => structureDeployProducedUnit(s, u) !== 0);
  }

  get player(): House {
    return G.houses[G.playerHouseID];
  }

  /** Game_LoadScenario + Scenario_Load + Game_Prepare */
  load(house: "A" | "O" | "H", mission: number): Scenario {
    G.net = null;
    configureNetworkPools(false);
    G.infiniteSpice=false;
    G.droneGrenades.length=0;
    G.difficulty = Math.max(0, Math.min(2, Math.round(this.difficulty)));
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
      t.unveiledHouses = 0;
      t.overlayTileID = G.veiledTileID;
    }

    // дома
    let player: House | null = null;
    for (const hs of sc.houses) {
      const h = houseAllocate(hs.id);
      if (!h) continue;
      h.credits = hs.credits;
      if (hs.brain !== "human" && h.credits !== 0xffff) {
        h.credits = Math.floor(h.credits * [0.8, 1, 1.5][G.difficulty]);
      }
      h.creditsQuota = hs.quota;
      h.unitCountMax = hs.maxUnits;
      if (hs.brain === "human") {
        h.flags.human = true;
        G.playerHouseID = hs.id;
        G.playerCreditsNoSilo = h.credits;
        player = h;
      } else {
        h.flags.human = false;
        // MD $016646 leaves CPU houses dormant. Contact/being attacked sets bit 3
        // ($023342/$02337C/$046E9C); the PC campaign-based activation launches O9's missile at tick 1.
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
    this.starportListed = [...sc.choam.keys()].filter((t) => t < UNIT.MAX).sort((a, b) => a - b);
    this.starportPriceUntil = -1;
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
      // в сети общий слой открыт, а туман по домам снимают юниты и здания ниже
      if (!G.net && t.isUnveiled) mapUnveilTile(i, G.playerHouseID);
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
    if (this.ended && !G.net) {
      if (this.afterEnd <= 0) return;
      this.afterEnd--;
    }
    gameLoopTeam();
    gameLoopUnit();
    gameLoopStructure();
    gameLoopHouse();
    explosionTick();
    animationTick();
    unitSort();
    G.playerCredits = this.player?.credits ?? 0;
    if (G.net) this.netLevelEnd();
    else if (!this.ended) this.levelEnd();
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
    return mapIsUnveiledLocal(packed);
  }

  /** Юниты на карте, которые должен видеть игрок (GUI_Widget_Viewport_Draw). */
  visibleUnits(): Unit[] {
    return G.unitFind.filter((u) => !u.o.flags.isNotOnMap && mapIsUnveiledLocal(packTile(u.o.position)));
  }

  // ------------------------------------------------------------------ команды игрока
  /** Map_SetSelection: выбрать юнит или здание на клетке. */
  selectAt(packed: number): Unit | Structure | null {
    if (G.selectionType === SELECTION.TARGET || G.selectionType === SELECTION.PLACE) return null;
    if (G.net ? !mapIsUnveiledLocal(packed) : G.map[packed].overlayTileID === G.veiledTileID) return null;
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
  order(u: Unit, action: number, packed: number, house = G.playerHouseID): void {
    if (unitGetHouseID(u) !== house) return;
    u.blockedAttack=undefined;
    u.attackSpot=undefined;
    if(u.o.type===UNIT.COMBAT_DRONE){
      if(!u.drone)initializeDrone(u);
      if(action===ACTION.MOVE||action===ACTION.PATROL)packed=packTile(clampDronePoint(u,tileCenter(unpackTile(packed))));
      // приказ выпускает звено и с площадки, если заряда, гранат и прочности хватит на вылет
      if(u.drone&&action!==ACTION.RETURN&&(u.drone.phase!=='dock'||droneCanLaunch(u))){u.drone.phase='guard';u.drone.launchAfter=0;u.drone.landed=false;u.drone.idleSince=undefined;}
    }
    if (action === ACTION.PATROL) {
      const actions = unitInfo[u.o.type].o.actionsPlayer;
      if (!actions.includes(ACTION.MOVE) || !actions.includes(ACTION.ATTACK) || !mapIsValidPosition(packed)) return;
      u.patrolActive = true;
      u.patrolEngaging = false;
      u.patrolToEnd = true;
      u.patrolStart = { ...u.o.position };
      u.patrolEnd = tileCenter(unpackTile(packed));
      u.targetAttack = 0;
      u.targetMove = 0;
      u.route[0] = 0xff;
      unitSetAction(u, ACTION.MOVE);
      unitSetDestination(u, indexEncode(packed, IT.TILE));
      return;
    }
    u.patrolActive = false;
    u.patrolEngaging = false;
    u.harvesterDefense=undefined;
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
    // MD $0281b6: приказ пехоте — $10 (GEMS seq 80), технике — $12 (GEMS seq 68)
    if(u.o.type===UNIT.COMBAT_DRONE&&action===ACTION.ATTACK&&!droneTargetAllowed(u,u.targetAttack)){
      u.targetAttack=0;u.targetMove=0;u.actionID=ACTION.GUARD;
      if (isLocal(house)) G.onMessage('Цель вне зоны управления дронами — 9 клеток.',1);
    }
    if (!isLocal(house)) return;
    if (unitInfo[u.o.type].movementType === MOVEMENT.FOOT) G.onSound(0x10);
    else G.onSound(0x12);
  }

  /** Какой приказ отдать по умолчанию, если игрок указал клетку (A в оригинале, левая кнопка мыши). */
  defaultAction(u: Unit, packed: number): number {
    const actions = unitInfo[u.o.type].o.actionsPlayer;
    const has = (a: number) => actions.includes(a);
    const target = objectGetByPackedTile(unitFindTargetAround(packed));
    if (target && mapIsUnveiledLocal(packed)) {
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
  activateSelf(u:Unit):boolean{
    if(unitGetHouseID(u)!==G.playerHouseID||u.o.type!==UNIT.DEVASTATOR)return false;
    if(!unitInfo[u.o.type].o.actionsPlayer.includes(ACTION.DESTRUCT))return false;
    this.unitCommand(u,ACTION.DESTRUCT);return true;
  }

  unitCommand(u: Unit, action: number): boolean {
    if (action === ACTION.PATROL) {
      const actions = unitInfo[u.o.type].o.actionsPlayer;
      if (!actions.includes(ACTION.MOVE) || !actions.includes(ACTION.ATTACK)) return false;
      G.unitActive = u;
      G.activeAction = action;
      G.selectionType = SELECTION.TARGET;
      return true;
    }
    u.patrolActive = false;
    u.patrolEngaging = false;
    u.harvesterDefense=undefined;
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
    unitSetAction(u,action);
    // MD $0281b6: приказ пехоте — $10, технике — $12
    if (unitInfo[u.o.type].movementType === MOVEMENT.FOOT) G.onSound(0x10);
    else G.onSound(0x12);
    return false;
  }

  /** Указана цель для выбранного действия. */
  /**
   * Клетки для группы у точки приказа: смещение каждого от центра группы сохраняется, но сжимается до радиуса
   * ~√N клеток (не больше 3); дальше — ближайшая к желаемой свободная проходимая клетка, без повторов.
   * Только целые числа и порядок по номеру юнита — у всех клиентов в сети одинаково.
   */
  private static spreadPoints(units: Unit[], packed: number): Map<Unit, number> {
    const out = new Map<Unit, number>();
    if (units.length < 2) return out;
    const tiles = units.map((u) => packTile(u.o.position));
    const cx = Math.round(tiles.reduce((s, q) => s + (q & 63), 0) / tiles.length);
    const cy = Math.round(tiles.reduce((s, q) => s + (q >> 6), 0) / tiles.length);
    const cap = Math.min(3, Math.ceil(Math.sqrt(units.length)));
    const tx = packed & 63, ty = packed >> 6;
    const taken = new Set<number>();
    for (const u of [...units].sort((a, b) => a.o.index - b.o.index)) {
      const at = packTile(u.o.position);
      let dx = (at & 63) - cx, dy = (at >> 6) - cy;
      const len = Math.max(Math.abs(dx), Math.abs(dy));
      if (len > cap) { dx = Math.round((dx * cap) / len); dy = Math.round((dy * cap) / len); }
      const wx = Math.max(0, Math.min(63, tx + dx)), wy = Math.max(0, Math.min(63, ty + dy));
      let best = -1, bestScore = Infinity;
      for (let r = 0; r <= 4 && best < 0; r++) {
        for (let y = wy - r; y <= wy + r; y++) for (let x = wx - r; x <= wx + r; x++) {
          if (x < 0 || y < 0 || x > 63 || y > 63 || Math.max(Math.abs(x - wx), Math.abs(y - wy)) !== r) continue;
          const q = packXY(x, y);
          if (taken.has(q) || !mapIsValidPosition(q) || structureGetByPackedTile(q)) continue;
          const other = objectGetByPackedTile(q);
          if (other && other !== u.o) continue;
          if (unitGetTileEnterScore(u, q, 0) >= 256) continue;
          const score = (x - wx) ** 2 + (y - wy) ** 2;
          if (score < bestScore) { best = q; bestScore = score; }
        }
      }
      if (best < 0) continue;
      taken.add(best);
      out.set(u, best);
    }
    return out;
  }

  /** Цель выбрана: приказ активному юниту и (others) остальным выделенным — одной группой. */
  targetClick(packed: number, others: Unit[] = []): void {
    if (G.unitHouseMissile) {
      unitLaunchHouseMissile(packed);
      return;
    }
    const u = G.unitActive;
    const action = G.activeAction;
    G.unitActive = null;
    G.activeAction = 0xffff;
    G.selectionType = SELECTION.UNIT;
    if (u) this.orderGroup([u, ...others.filter((o) => o !== u)], action, packed);
  }

  /**
   * Приказ нескольким юнитам сразу (выделение рамкой — добавка ремейка, в MD юнит один). Каждому — как order; при
   * атаке одной цели толпой каждый получает свою клетку на дальности огня (unitsAssignAttackSpots), чтобы не
   * съезжаться к цели вплотную. Методы — именно класса: в сети интерфейс подменяет их отправкой команд.
   */
  orderGroup(units: Unit[], action: number, packed: number, house = G.playerHouseID): void {
    // движение и патруль в пустую клетку: каждому своя клетка рядом (в одну клетку толпа не влезет и толкается)
    const spread = (action === ACTION.MOVE || action === ACTION.PATROL) && units.length > 1 && objectGetByPackedTile(packed) === null
      ? Game.spreadPoints(units.filter((u) => unitGetHouseID(u) === house && unitInfo[u.o.type].movementType !== MOVEMENT.WINGER), packed)
      : null;
    for (const u of units) Game.prototype.order.call(this, u, action, spread?.get(u) ?? packed, house);
    if (action !== ACTION.ATTACK || units.length < 2) return;
    const attackers = units.filter((u) => unitGetHouseID(u) === house && u.actionID === ACTION.ATTACK && u.targetAttack !== 0);
    const target = attackers[0]?.targetAttack ?? 0;
    unitsAssignAttackSpots(attackers.filter((u) => u.targetAttack === target), target);
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
    if (G.net) return this.netQuiet(() => this.buildOptionsRaw(s).filter((o) => this.netAllowed(s, o.type)));
    return this.buildOptionsRaw(s);
  }

  private buildOptionsRaw(s: Structure): { type: number; available: number; cost: number; time: number }[] {
    const si = structureInfo[s.o.type];
    if (!si.o.flags.factory) return [];
    // Listing orders must never rewrite the live order or change repair/hold state.
    structureGetBuildable(s);
    const out: { type: number; available: number; cost: number; time: number }[] = [];
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
      for (let i = 0; i < STRUCTURE.MAX; i++) {
        const o = structureInfo[i].o;
        if (o.available) out.push({ type: i, available: o.available, cost: o.buildCredits, time: o.buildTime });
      }
      out.sort((a, b) => structureInfo[b.type].o.sortPriority - structureInfo[a.type].o.sortPriority);
    } else {
      for (let i = 0; i < UNIT.MAX; i++) {
        const o = unitInfo[i].o;
        if (o.available) out.push({ type: i, available: o.available, cost: o.buildCredits, time: o.buildTime });
      }
      out.sort((a, b) => unitInfo[b.type].o.sortPriority - unitInfo[a.type].o.sortPriority);
    }
    return out;
  }

  /**
   * Цены космопорта MD ($008F14, формула $027334): цена постройки × (60 + random(0..50) + random(0..50)) / 100.
   * Пересчитываются, когда истёк таймер $FFBF88 (18000 кадров), иначе окно показывает прежние.
   */
  starportPrices(): number[] {
    if (G.net) return unitInfo.map((_, type) => this.netStarportPrice(type));
    if (this.starportPriceUntil < 0 || G.timerGame >= this.starportPriceUntil) {
      this.starportPriceList = unitInfo.map((ui) => {
        const f = randomRange(0, 50) + randomRange(0, 50) + 60;
        return Math.floor((ui.o.buildCredits * f) / 100);
      });
      this.starportPriceUntil = G.timerGame + 18000;
    }
    return this.starportPriceList;
  }

  /** Купить юнит в космопорте: деньги списываются сразу, доставка — фрегатом. */
  starportBuy(s: Structure, type: number, price: number): boolean {
    const h = G.houses[s.o.houseID];
    if (G.starportAvailable[type] <= 0 || h.credits < price) return false;
    h.credits -= price;
    structureStarportBuy(s, [type]);
    return true;
  }

  /** Начать производство (или купить в космопорте). */
  build(s: Structure, type: number): boolean {
    if(structureCanQueueUnits(s))return structureEnqueueUnit(s,type);
    if (s.o.type === STRUCTURE.STARPORT) return false;
    if (s.o.flags.onHold && s.objectType === type && s.o.linkedID !== 0xff) {
      s.o.flags.onHold = false;
      return true;
    }
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) return structureEnqueueBuilding(s,type);
    return structureBuildObject(s, type);
  }

  canQueueUnits(s:Structure):boolean{return structureCanQueueUnits(s);}
  unitQueue(s:Structure):readonly {type:number;cost:number}[]{return s.unitQueue??[];}
  buildingQueue(s:Structure):readonly {type:number;cost:number}[]{return s.buildingQueue??[];}
  readyBuildings(s:Structure):readonly {type:number;cost:number}[]{return s.readyBuildings??[];}
  readyUnits(s:Structure):readonly Unit[]{return (s.readyUnits??[]).map(index=>G.units[index]);}
  cancelReadyBuilding(s:Structure,type:number):boolean{
    const index=s.readyBuildings?.findIndex(item=>item.type===type)??-1;
    if(index<0)return false;
    const [item]=s.readyBuildings!.splice(index,1);G.houses[s.o.houseID].credits+=item.cost;return true;
  }
  cancelQueuedUnit(s:Structure,index:number):boolean{return structureCancelQueuedUnit(s,index);}
  cancelQueuedBuilding(s:Structure,index:number):boolean{return structureCancelQueuedBuilding(s,index);}

  /** Состояние производства для меню. */
  production(s: Structure): { type: number; progress: number; ready: boolean; onHold: boolean } | null {
    if (s.o.linkedID === 0xff || s.objectType === 0xffff) {
      const ready=s.readyBuildings?.[0];
      return ready?{type:ready.type,progress:1,ready:true,onHold:false}:null;
    }
    const oi = s.o.type === STRUCTURE.CONSTRUCTION_YARD ? structureInfo[s.objectType]?.o : unitInfo[s.objectType]?.o;
    if (!oi) return null;
    const total = oi.buildTime << 8;
    return { type: s.objectType, progress: total ? 1 - s.countDown / total : 1, ready: s.countDown === 0 && s.state === STATE.READY, onHold: s.o.flags.onHold };
  }

  /** STR_PLACE_IT: готовое здание со Строительного двора — в режим постановки. */
  placeIt(cy: Structure, _announce=true, type?:number): boolean {
    if (cy.o.type !== STRUCTURE.CONSTRUCTION_YARD) return false;
    const index=cy.readyBuildings?.findIndex(item=>type===undefined||item.type===type)??-1;
    if(index>=0){
      const item=cy.readyBuildings![index];
      cy.readyBuildings!.splice(index,1);
      const built=structureCreate(INDEX_INVALID,item.type,cy.o.houseID,INDEX_INVALID);
      if(!built){cy.readyBuildings!.splice(index,0,item);return false;}
      built.spent=item.cost;
      // Slabs and walls share singleton pool entries in the original ROM. A
      // separate ghost lets their next order build while this one is on cursor.
      const singleton=item.type===STRUCTURE.SLAB_1x1||item.type===STRUCTURE.SLAB_2x2||item.type===STRUCTURE.WALL;
      G.structureActive=singleton?structuredClone(built):built;
      if(singleton)structureFree(built);
      G.structureActiveType=item.type;
      G.structureActivePosition=packTile(cy.o.position);
      G.selectionType=SELECTION.PLACE;
      return true;
    }
    if(cy.o.linkedID===0xff||cy.countDown!==0||(type!==undefined&&type!==cy.objectType))return false;
    G.structureActive = G.structures[cy.o.linkedID];
    G.structureActiveType = cy.objectType;
    G.structureActivePosition = packTile(cy.o.position);
    cy.o.linkedID = 0xff;
    G.selectionType = SELECTION.PLACE;
    // Placement is announced on successful installation, not on picking up the ghost.
    return true;
  }

  canPlaceAt(packed: number): number {
    if (G.structureActiveType === 0xffff) return 0;
    return structureIsValidBuildLocation(packed, G.structureActiveType);
  }

  placementDetail(packed: number): { valid: number; cells: boolean[] } {
    if (G.structureActiveType === 0xffff) return { valid: 0, cells: [] };
    return structurePlacementDetail(packed, G.structureActiveType);
  }

  place(packed: number): boolean {
    return structurePlayerPlace(packed);
  }

  /** GUI_Widget_Cancel_Click для постановки здания. */
  cancelPlace(): void {
    if (G.structureActiveType === 0xffff) return;
    const s = structureGetByPackedTile(G.structureActivePosition);
    const s2 = G.structureActive;
    if(s&&s2)(s.readyBuildings??=[]).unshift({type:s2.o.type,cost:s2.spent});
    if(s2)structureFree(s2);
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
    if(s.o.linkedID===0xff&&s.readyBuildings?.length){Game.prototype.cancelReadyBuilding.call(this,s,s.readyBuildings[0].type);return;}
    structureCancelBuild(s);
    structureSetState(s, STATE.IDLE);
    if(s.o.type===STRUCTURE.CONSTRUCTION_YARD)structureStartNextBuilding(s);
  }

  /**
   * СТОП окна здания MD ($02915E → $0103AA): отменить всё — заказ (потраченное возвращается), улучшение
   * (тоже с возвратом, следующее начнётся с нуля) и ремонт.
   */
  stopAll(s: Structure): void {
    const h = G.houses[s.o.houseID];
    while(s.unitQueue?.length)structureCancelQueuedUnit(s,s.unitQueue.length-1);
    while(s.buildingQueue?.length)structureCancelQueuedBuilding(s,s.buildingQueue.length-1);
    while(s.readyBuildings?.length)Game.prototype.cancelReadyBuilding.call(this,s,s.readyBuildings[0].type);
    if (s.o.linkedID !== 0xff) {
      // $0103AA: заказ убирается, дому возвращается ровно потраченное ($5A)
      const before = h.credits;
      const prepaid=s.prepaidBuildingCost??s.prepaidUnitCost;
      structureCancelBuild(s);
      h.credits = before + (prepaid??s.spent);
      structureSetState(s, STATE.IDLE);
    }
    if (s.o.flags.upgrading) {
      h.credits += s.upgradeSpent;
      s.o.flags.upgrading = false;
      s.upgradeSpent = 0;
      s.upgradeTimeLeft = 100;
    }
    s.spent = 0;
    s.o.flags.repairing = false;
    s.o.flags.onHold = false;
  }

  /** РЕМОНТ окна здания MD ($02912C): только включает ремонт, и только у повреждённого здания. */
  startRepair(s: Structure): void {
    if (s.o.hitpoints < structureInfo[s.o.type].o.hitpoints && !s.o.flags.repairing) structureSetRepairingState(s, 1);
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

  /**
   * Пункт «*УЛУЧШИТЬ*» в окне здания MD ($00FAF4…$00FC26): у заводов (не космопорта), если здание можно
   * улучшить и у дома построен радар; цена — половина стоимости здания. `unlocks` — что улучшение откроет
   * (его картинку показывает окно): у двора ракетная башня, у заводов юнитов — по таблице $010DA2.
   */
  upgradeEntry(s: Structure): { unlocks: number; cost: number } | null {
    const si = structureInfo[s.o.type];
    if (!si.o.flags.factory || s.o.type === STRUCTURE.STARPORT) return null;
    if (!structureIsUpgradable(s)) return null;
    const h = G.houses[s.o.houseID];
    if (!(h.structuresBuilt & (1 << STRUCTURE.OUTPOST))) return null;
    const cost = Math.trunc(si.o.buildCredits / 2);
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) return { unlocks: STRUCTURE.ROCKET_TURRET, cost };
    const unlocks = upgradeUnlocksUnit(s);
    // $00FC1E: только если этот юнит ещё не в списке
    if (this.buildOptions(s).some((o) => o.type === unlocks)) return null;
    return { unlocks, cost };
  }

  buildable(s: Structure): number {
    if (G.net) return this.netQuiet(() => structureGetBuildable(s));
    return structureGetBuildable(s);
  }

  /** Коды оригинала, вводимые как пароль (код проверки $021908). */
  cheat(code: "LOOKAROUND" | "SPLURGEOLA" | "PLAYTESTER"): void {
    if (G.net) return; // в сети коды изменили бы игру только у одного игрока
    if (code === "LOOKAROUND") {
      G.revealAll = !G.revealAll; // bchg — повторный ввод выключает
    } else if (code === "SPLURGEOLA") {
      if (!this.player) return;
      this.player.credits = 25000; // оригинал ставит ровно 25000 ($61A8), а не прибавляет
      // без хранилищ лишнее сгорело бы на следующем такте — как со стартовыми кредитами
      G.playerCreditsNoSilo = Math.max(G.playerCreditsNoSilo, this.player.credits);
    } else G.playtester = !G.playtester;
  }

  // ------------------------------------------------------------------ сетевой матч (lockstep)
  /**
   * Матч на готовой карте ROM: у каждого игрока двор, два квадроцикла и кредиты. Тумана нет, вся техника открыта
   * (как в 9-й миссии). Всё зависит только от setup, поэтому у всех клиентов состояние совпадает такт в такт.
   */
  loadNetwork(setup: NetSetup): { cursor: { x: number; y: number }; spawns: Map<number, number> } {
    const humans = setup.players.reduce((m, p) => (p.ai ? m : m | (1 << p.house)), 0);
    this.netPlayersMask = setup.players.reduce((m, p) => m | (1 << p.house), 0);
    const team = new Array<number>(8).fill(-1);
    for (const p of setup.players) team[p.house] = p.team;
    // туман: наблюдатель (local < 0) видит всё, что раскрыли люди
    G.net = { humans, team, view: setup.local >= 0 ? 1 << setup.local : humans };
    configureNetworkPools(true);
    G.playerHouseID = setup.local >= 0 ? setup.local : (setup.players.find((p) => !p.ai) ?? setup.players[0]).house;
    G.infiniteSpice = true;
    G.droneGrenades.length = 0;
    G.difficulty = 1;
    G.gameSpeed = 2;
    G.playtester = false;
    G.revealAll = false;
    this.netSeed = setup.seed >>> 0;
    this.mission = 9;
    this.ended = null;
    this.afterEnd = 0;
    this.selectedStructure = null;
    this.levelEndTimer = 0;
    this.netAlive = this.netPlayersMask;

    poolsReset();
    animationInit();
    explosionInit();
    unitResetTimers();
    structureResetTimers();
    houseResetTimers();
    teamResetTimers();
    G.timerGame = 0;
    G.timerGUI = 0;
    G.starportAvailable.fill(0);
    for (const [type, count] of NET_STARPORT_STOCK) G.starportAvailable[type] = count;
    this.starportListed = NET_STARPORT_STOCK.map(([type]) => type).sort((a, b) => a - b);
    this.starportPriceUntil = -1;
    G.playerCreditsNoSilo = 0;
    G.houseMissileCountdown = 0;
    G.unitHouseMissile = null;
    G.unitActive = null;
    G.structureActive = null;
    G.activeAction = 0xffff;
    G.structureActiveType = 0xffff;
    G.unitSelected = null;
    G.selectionType = SELECTION.STRUCTURE;
    randomSeed(this.netSeed);
    randomLCGSeed((this.netSeed ^ 0x9e3779b9) >>> 0);

    G.validateStrictIfZero++;
    G.scenarioID = 9;
    G.campaignID = 8;
    G.scenario = newScenario();
    const m = this.rom.missionMap(setup.map);
    G.mapScale = m.bounds.w === 64 ? 0 : 1;
    G.scenario.mapScale = G.mapScale;
    for (let i = 0; i < 4096; i++) {
      const t = G.map[i];
      G.mapTileID[i] = m.ground[i];
      t.groundTileID = m.ground[i];
      // общий слой открыт (от него зависят стены, кратеры, черви), туман по домам — в unveiledHouses
      t.isUnveiled = true;
      t.unveiledHouses = 0;
      t.overlayTileID = 0;
    }

    const unitMax = NETWORK_UNIT_LIMIT;
    for (const p of setup.players) {
      const h = houseAllocate(p.house);
      if (!h) continue;
      if (p.ai) {
        netSetupAIHouse(p.house, setup.credits);
        continue;
      }
      h.flags.human = true;
      h.credits = setup.credits;
      h.creditsNoSilo = setup.credits;
      h.creditsQuota = 0;
      h.unitCountMax = unitMax;
    }
    const spawns = this.netSpawns(setup);
    for (const p of setup.players) {
      const packed = spawns.get(p.house);
      if (packed === undefined) continue;
      const s = structureCreate(INDEX_INVALID, STRUCTURE.CONSTRUCTION_YARD, p.house, packed);
      if (s) {
        s.o.hitpoints = structureInfo[s.o.type].o.hitpoints;
        s.o.flags.degrades = false;
        s.state = STATE.IDLE;
      }
      const x = packed & 63;
      const y = packed >> 6;
      for (const [dx, dy] of [[2, 0], [2, 1], [-1, 0], [-1, 1], [0, 2], [1, 2]].slice(0, 2)) {
        const cell = packXY(x + dx, y + dy);
        const u = unitCreate(INDEX_INVALID, UNIT.QUAD, p.house, tileCenter(unpackTile(cell)), 0x40);
        if (u) unitSetAction(u, ACTION.GUARD);
      }
    }
    // противники-компьютеры: готовая база у своей точки и команды атаки (engine/net-ai.ts)
    const ai = setup.players.filter((p) => p.ai && spawns.has(p.house));
    for (const p of ai) netBuildAIBase(p.house, spawns.get(p.house)!, [...spawns].filter(([h]) => h !== p.house).map(([, c]) => c));
    netCreateAITeams(ai.map((p) => p.house));
    G.tickScenarioStart = 0;
    this.prepare();
    G.validateStrictIfZero--;
    const own = spawns.get(G.playerHouseID) ?? 0;
    return { cursor: { x: (own & 63) + 1, y: (own >> 6) + 1 }, spawns };
  }

  /**
   * Стартовые точки: клетки, где помещается двор 2×2 на скале и вокруг есть место под базу. Первая — ближняя к
   * углу по зерну, дальше каждый раз самая дальняя от уже выбранных. Команды получают точки по очереди.
   */
  private netSpawns(setup: NetSetup): Map<number, number> {
    const mi = MAP_INFOS[G.mapScale];
    const rock = (x: number, y: number) =>
      x >= mi.minX && y >= mi.minY && x < mi.minX + mi.sizeX && y < mi.minY + mi.sizeY &&
      landscapeInfo[mapGetLandscapeType(packXY(x, y))].isValidForStructure !== 0;
    const pick = (need: number) => {
      const out: { x: number; y: number }[] = [];
      for (let y = mi.minY + 2; y < mi.minY + mi.sizeY - 4; y++) {
        for (let x = mi.minX + 2; x < mi.minX + mi.sizeX - 4; x++) {
          if (!rock(x, y) || !rock(x + 1, y) || !rock(x, y + 1) || !rock(x + 1, y + 1)) continue;
          let room = 0;
          for (let j = -2; j <= 4; j++) for (let i = -2; i <= 4; i++) if (rock(x + i, y + j)) room++;
          if (room >= need) out.push({ x, y });
        }
      }
      return out;
    };
    let cands = pick(28);
    if (cands.length < setup.players.length) cands = pick(10);
    if (cands.length < setup.players.length) cands = pick(4);
    const corner = [[mi.minX, mi.minY], [mi.minX + mi.sizeX, mi.minY + mi.sizeY], [mi.minX + mi.sizeX, mi.minY], [mi.minX, mi.minY + mi.sizeY]][this.netSeed % 4];
    const d2 = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    const chosen: { x: number; y: number }[] = [];
    if (cands.length) {
      let first = cands[0];
      for (const c of cands) if (d2(c, { x: corner[0], y: corner[1] }) < d2(first, { x: corner[0], y: corner[1] })) first = c;
      chosen.push(first);
    }
    while (chosen.length < setup.players.length && chosen.length < cands.length) {
      let best = cands[0];
      let bestDistance = -1;
      for (const c of cands) {
        let nearest = Infinity;
        for (const s of chosen) nearest = Math.min(nearest, d2(c, s));
        if (nearest > bestDistance) {
          bestDistance = nearest;
          best = c;
        }
      }
      chosen.push(best);
    }
    // команды по кругу: первая точка — команде 0, вторая (самая дальняя) — команде 1 и т. д.
    const teams = [...new Set(setup.players.map((p) => p.team))].sort((a, b) => a - b);
    const queue = new Map(teams.map((t) => [t, setup.players.filter((p) => p.team === t).sort((a, b) => a.slot - b.slot)]));
    const out = new Map<number, number>();
    let ti = 0;
    for (const c of chosen) {
      for (let k = 0; k < teams.length; k++) {
        const q = queue.get(teams[(ti + k) % teams.length])!;
        if (!q.length) continue;
        out.set(q.shift()!.house, packXY(c.x, c.y));
        ti = (ti + k + 1) % teams.length;
        break;
      }
    }
    return out;
  }

  /** Конец сетевого матча: побеждает последняя команда, у которой остались здания или боевые юниты. */
  private netLevelEnd(): void {
    if (this.levelEndTimer >= G.timerGame) return;
    this.levelEndTimer = G.timerGame + 300;
    let alive = 0;
    for (const s of G.structureFind) {
      if (!s.o.flags.used) continue;
      const t = s.o.type;
      if (t === STRUCTURE.SLAB_1x1 || t === STRUCTURE.SLAB_2x2 || t === STRUCTURE.WALL) continue;
      alive |= 1 << s.o.houseID;
    }
    for (const u of G.unitFind) {
      if (!u.o.flags.used || u.o.flags.isNotOnMap || !unitInfo[u.o.type].flags.isNormalUnit) continue;
      alive |= 1 << u.o.houseID;
    }
    this.netAlive = alive & this.netPlayersMask;
    if (this.ended) return;
    const team = G.net!.team;
    const teamsAlive = new Set<number>();
    for (let h = 0; h < 8; h++) if ((this.netAlive >> h) & 1) teamsAlive.add(team[h]);
    const own = team[G.playerHouseID];
    let result: MissionEnd | null = null;
    if (!teamsAlive.has(own)) result = "lost";
    else if (teamsAlive.size === 1) result = "won";
    if (!result) return;
    this.ended = result;
    G.onFeedback(result === "won" ? 40 : 41);
    G.onMessage(result === "won" ? msg.missionWon : msg.missionLost, 0);
    this.onEnd(result);
  }

  /** Можно ли заказывать тип в сетевом матче. */
  private netAllowed(s: Structure, type: number): boolean {
    return Number.isInteger(type)&&type>=0&&type<(s.o.type===STRUCTURE.CONSTRUCTION_YARD?STRUCTURE.MAX:UNIT.MAX);
  }

  /** Вызов из интерфейса без следа в игре: таблицы доступности общие для всех домов и пишутся при подсчёте. */
  private netQuiet<T>(fn: () => T): T {
    if (this.netExecuting) return fn();
    const saved = [...structureInfo.map((x) => x.o.available), ...unitInfo.map((x) => x.o.available)];
    try {
      return fn();
    } finally {
      structureInfo.forEach((x, i) => (x.o.available = saved[i]));
      unitInfo.forEach((x, i) => (x.o.available = saved[structureInfo.length + i]));
    }
  }

  /** Цена космопорта ($027334: × (60 + 0..50 + 0..50) / 100) из зерна матча и окна 18000 кадров — без общего генератора. */
  private netStarportPrice(type: number): number {
    let x = (this.netSeed ^ Math.imul(Math.floor(G.timerGame / 18000) + 1, 0x9e3779b1) ^ Math.imul(type + 1, 0x85ebca6b)) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    const f = 60 + (x % 51) + ((x >>> 8) % 51);
    return Math.floor((unitInfo[type].o.buildCredits * f) / 100);
  }

  /** Выполнить команду игрока-дома. Интерфейсные глобальные переменные (постановка, цель) после команды возвращаются. */
  execNet(house: number, c: NetCommand): void {
    if (!G.net || !isHuman(house)) return;
    const saved = [G.selectionType, G.unitActive, G.activeAction, G.structureActive, G.structureActiveType, G.structureActivePosition] as const;
    this.netExecuting = true;
    try {
      this.execNetCommand(house, c);
    } finally {
      this.netExecuting = false;
      [G.selectionType, G.unitActive, G.activeAction, G.structureActive, G.structureActiveType, G.structureActivePosition] = saved;
    }
  }

  private execNetCommand(house: number, c: NetCommand): void {
    // методы — именно класса: на время матча интерфейс подменяет их отправкой команд (net/controls.ts)
    const units = (list: number[]) =>
      list.slice(0, 64).map((i) => G.units[i]).filter((u): u is Unit => !!u && u.o.flags.used && u.o.flags.allocated && !u.o.flags.isNotOnMap && unitGetHouseID(u) === house);
    const structure = (i: number): Structure | null => {
      const s = G.structures[i];
      return s && s.o.flags.used && s.o.houseID === house ? s : null;
    };
    const cell = (p: number) => Number.isInteger(p) && p >= 0 && p < 4096;
    switch (c.k) {
      case "order":
        if (!cell(c.p)) return;
        Game.prototype.orderGroup.call(this, units(c.u).filter((u) => unitInfo[u.o.type].o.actionsPlayer.includes(c.a) || c.a === ACTION.PATROL), c.a, c.p, house);
        return;
      case "act":
        for (const u of units(c.u)) this.netUnitAction(u, c.a, house);
        return;
      case "build": {
        const s = structure(c.s);
        if (!s || !this.netAllowed(s, c.t)) return;
        // окно здания ($029060): выбор пункта снимает ремонт
        if (s.o.flags.repairing) s.o.flags.repairing = false;
        if (!this.buildOptionsRaw(s).some((o) => o.type === c.t && o.available > 0)) return;
        Game.prototype.build.call(this, s, c.t);
        return;
      }
      case "cancel": { const s = structure(c.s); if (s) Game.prototype.cancelBuild.call(this, s); return; }
      case "hold": { const s = structure(c.s); if (s) Game.prototype.holdOrResume.call(this, s); return; }
      case "stop": { const s = structure(c.s); if (s) Game.prototype.stopAll.call(this, s); return; }
      case "repair": { const s = structure(c.s); if (s) Game.prototype.toggleRepair.call(this, s); return; }
      case "fix": { const s = structure(c.s); if (s) Game.prototype.startRepair.call(this, s); return; }
      case "upgrade": {
        const s = structure(c.s);
        if (!s) return;
        if (s.o.flags.repairing) s.o.flags.repairing = false;
        if (this.upgradeEntry(s) && !s.o.flags.upgrading) Game.prototype.upgrade.call(this, s);
        return;
      }
      case "unqueue": { const s = structure(c.s); if (s) Game.prototype.cancelQueuedUnit.call(this, s, c.i); return; }
      case "unqueueB": { const s = structure(c.s); if (s) Game.prototype.cancelQueuedBuilding.call(this, s, c.i); return; }
      case "unreadyB": { const s = structure(c.s); if(s)Game.prototype.cancelReadyBuilding.call(this,s,c.t);return; }
      case "starport": {
        const s = structure(c.s);
        if (!s || s.o.type !== STRUCTURE.STARPORT || !unitInfo[c.t]) return;
        Game.prototype.starportBuy.call(this, s, c.t, this.netStarportPrice(c.t));
        return;
      }
      case "place": {
        const cy = structure(c.s);
        if (!cy || !cell(c.p) || !Game.prototype.placeIt.call(this,cy,true,c.t))return;
        if (!structurePlayerPlace(c.p, house)) Game.prototype.cancelPlace.call(this);
        return;
      }
      case "palace": {
        const s = structure(c.s);
        if (!s || s.o.type !== STRUCTURE.PALACE || s.countDown !== 0) return;
        structureActivateSpecial(s);
        if (G.unitHouseMissile && G.unitHouseMissile.o.houseID === house && cell(c.p)) unitLaunchHouseMissile(c.p);
        return;
      }
      case "left":
        // база вышедшего — союзнику-человеку, а если его нет — компьютеру (engine/net-ai.ts)
        this.netLastHandOver = netHandOver(house);
        return;
    }
  }

  /** Кнопка действия юнита без цели (стоп, охрана, отступ, уничтожить себя…), как unitCommand. */
  private netUnitAction(u: Unit, action: number, house: number): void {
    const ai = actionInfo[action];
    if (!ai || ai.selectionType === SELECTION.TARGET || action === ACTION.PATROL) return;
    if (!unitInfo[u.o.type].o.actionsPlayer.includes(action)) return;
    u.blockedAttack=undefined;
    u.attackSpot=undefined;
    u.patrolActive = false;
    u.patrolEngaging = false;
    u.harvesterDefense = undefined;
    if (u.deviated !== 0) {
      unitDeviationDecrease(u, 5);
      if (u.deviated === 0) return;
    }
    objectScriptVariable4Clear(u.o);
    u.targetAttack = 0;
    u.targetMove = 0;
    u.route[0] = 0xff;
    unitSetAction(u, action);
    if (!isLocal(house)) return;
    if (unitInfo[u.o.type].movementType === MOVEMENT.FOOT) G.onSound(0x10);
    else G.onSound(0x12);
  }

  /** Контрольная сумма симуляции: у всех клиентов в один такт она должна совпадать. */
  netHash(): number {
    let h = 0x811c9dc5;
    const mix = (v: number) => {
      h = Math.imul(h ^ (v | 0), 0x01000193) >>> 0;
    };
    mix(G.timerGame);
    mix(randomState());
    for (const u of G.units) {
      if (!u.o.flags.used) continue;
      mix(u.o.index); mix(u.o.type); mix(u.o.houseID); mix(u.o.position.x); mix(u.o.position.y); mix(u.o.hitpoints); mix(u.actionID); mix(u.targetAttack);
      if(u.blockedAttack){mix(u.blockedAttack.target);mix(u.blockedAttack.wall);}
      if(u.attackSpot){mix(u.attackSpot.target);mix(u.attackSpot.packed);}
      if(u.laser){const l=u.laser;mix(l.target);mix(l.chargeStart);mix(l.chargeUntil);mix(l.cooldownUntil);mix(l.firedAt);}
      if(u.drone){
        const d=u.drone;mix(d.home);mix(d.homePosition.x);mix(d.homePosition.y);mix(d.guardPosition?.x??0);mix(d.guardPosition?.y??0);mix(d.lastAction??0);
        mix(['guard','attack','return','dock','orphan'].indexOf(d.phase));mix(Math.round(d.battery*1000));mix(d.nextFire);mix(d.lastTick);mix(d.launchAfter);mix(d.restockAt);
        mix(Math.round(d.vx*256));mix(Math.round(d.vy*256));mix(u.targetMove);mix(Math.round(u.o.hitpoints*1000));
        for(const m of d.members){mix(m.x);mix(m.y);mix(Math.round(m.vx*256));mix(Math.round(m.vy*256));mix(m.grenades);}
      }
    }
    for (const s of G.structures) {
      if (!s.o.flags.used) continue;
      mix(s.o.index); mix(s.o.type); mix(s.o.houseID); mix(s.o.hitpoints); mix(s.state); mix(s.countDown);
      for(const queue of [s.buildingQueue??[],s.unitQueue??[],s.readyBuildings??[]]){mix(queue.length);for(const item of queue){mix(item.type);mix(item.cost);}}
      mix(s.readyUnits?.length??0);for(const index of s.readyUnits??[])mix(index);
    }
    for (const hh of G.houses) if (hh.flags.used) { mix(hh.index); mix(hh.credits); }
    for (const t of G.map) mix(t.unveiledHouses);
    for(const p of G.droneGrenades){mix(p.from.x);mix(p.from.y);mix(p.to.x);mix(p.to.y);mix(p.released);mix(p.impact);mix(p.damage);mix(p.origin);mix(p.house);}
    return h;
  }
}

export { G };
