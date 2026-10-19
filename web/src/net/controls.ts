/**
 * Управление в сетевом матче: методы Game, которыми интерфейс меняет игру, на время матча заменяются отправкой
 * команд на сервер (NetCommand). Сама игра меняется только в execNet — у всех клиентов в один такт.
 * Прицеливание и «призрак» постановки здания остаются интерфейсными (G.selectionType и т. п. симуляция не читает).
 */
import { ACTION, G, HOUSE_WEAPON, SELECTION, STRUCTURE, packTile, type Structure, type Unit } from "../engine/core.ts";
import type { Game, NetCommand } from "../engine/game.ts";
import { structureIsValidBuildLocationFor, structurePlacementDetailFor } from "../engine/structure.ts";
import { actionInfo, houseInfo, unitInfo } from "../engine/tables.ts";
import { unitGetHouseID } from "../engine/unit.ts";

const OVERRIDDEN = [
  "order", "unitCommand", "activateSelf", "targetClick", "cancelTarget", "build", "starportBuy", "cancelQueuedUnit", "cancelQueuedBuilding", "cancelReadyBuilding",
  "placeIt", "canPlaceAt", "placementDetail", "place", "cancelPlace", "toggleRepair", "upgrade", "holdOrResume", "cancelBuild", "stopAll",
  "startRepair", "palaceSpecial",
] as const;

/** Подменить методы игры на время матча; вернуть функцию, которая всё вернёт обратно. */
export function installNetControls(game: Game, send: (c: NetCommand) => void, house: () => number): () => void {
  const g = game as unknown as Record<string, unknown>;
  /** двор, чьё здание сейчас «в руках» у игрока, и дворец, чья ракета ждёт цели */
  let placingYard = -1;
  let missilePalace = -1;
  const own = (s: Structure) => s.o.houseID === house();
  const ownUnit = (u: Unit) => unitGetHouseID(u) === house();
  const local: Partial<Record<(typeof OVERRIDDEN)[number], unknown>> = {
    order(u: Unit, action: number, packed: number) {
      if (ownUnit(u)) send({ k: "order", u: [u.o.index], a: action, p: packed });
    },
    unitCommand(u: Unit, action: number): boolean {
      if (!ownUnit(u)) return false;
      const ai = actionInfo[action];
      if (action === ACTION.PATROL || ai?.selectionType === SELECTION.TARGET) {
        if (action === ACTION.PATROL) {
          const actions = unitInfo[u.o.type].o.actionsPlayer;
          if (!actions.includes(ACTION.MOVE) || !actions.includes(ACTION.ATTACK)) return false;
        }
        G.unitActive = u;
        G.activeAction = action;
        G.selectionType = SELECTION.TARGET;
        return true;
      }
      send({ k: "act", u: [u.o.index], a: action });
      return false;
    },
    activateSelf(u: Unit): boolean {
      if (!ownUnit(u) || !unitInfo[u.o.type].o.actionsPlayer.includes(ACTION.DESTRUCT)) return false;
      send({ k: "act", u: [u.o.index], a: ACTION.DESTRUCT });
      return true;
    },
    targetClick(packed: number) {
      if (missilePalace >= 0) {
        send({ k: "palace", s: missilePalace, p: packed });
        missilePalace = -1;
        G.selectionType = SELECTION.STRUCTURE;
        return;
      }
      const u = G.unitActive;
      const action = G.activeAction;
      G.unitActive = null;
      G.activeAction = 0xffff;
      G.selectionType = SELECTION.UNIT;
      if (u && ownUnit(u)) send({ k: "order", u: [u.o.index], a: action, p: packed });
    },
    cancelTarget() {
      if (G.structureActiveType !== 0xffff) (g.cancelPlace as () => void)();
      missilePalace = -1;
      if (!G.unitActive) {
        if (G.selectionType === SELECTION.TARGET) G.selectionType = SELECTION.STRUCTURE;
        return;
      }
      G.unitActive = null;
      G.activeAction = 0xffff;
      G.selectionType = SELECTION.UNIT;
    },
    build(s: Structure, type: number): boolean {
      if (!own(s)) return false;
      send({ k: "build", s: s.o.index, t: type });
      return true;
    },
    starportBuy(s: Structure, type: number, price: number): boolean {
      if (!own(s) || G.starportAvailable[type] <= 0 || G.houses[house()].credits < price) return false;
      send({ k: "starport", s: s.o.index, t: type });
      return true;
    },
    cancelQueuedUnit(s: Structure, index: number): boolean {
      if (!own(s) || !(s.unitQueue?.length ?? 0)) return false;
      send({ k: "unqueue", s: s.o.index, i: index });
      return true;
    },
    cancelQueuedBuilding(s: Structure, index: number): boolean {
      if (!own(s) || !(s.buildingQueue?.length ?? 0)) return false;
      send({ k: "unqueueB", s: s.o.index, i: index });
      return true;
    },
    cancelReadyBuilding(s:Structure,type:number):boolean{
      if(!own(s)||!game.readyBuildings(s).some(item=>item.type===type))return false;
      send({k:"unreadyB",s:s.o.index,t:type});return true;
    },
    placeIt(cy: Structure, _announce=true, type?:number): boolean {
      if (!own(cy) || cy.o.type !== STRUCTURE.CONSTRUCTION_YARD) return false;
      const ready=game.readyBuildings(cy).find(item=>type===undefined||item.type===type);
      if(!ready&&(cy.o.linkedID===0xff||cy.countDown!==0||(type!==undefined&&cy.objectType!==type)))return false;
      placingYard = cy.o.index;
      G.structureActive = null;
      G.structureActiveType = ready?.type??cy.objectType;
      G.structureActivePosition = packTile(cy.o.position);
      G.selectionType = SELECTION.PLACE;
      return true;
    },
    canPlaceAt(packed: number): number {
      if (G.structureActiveType === 0xffff) return 0;
      return structureIsValidBuildLocationFor(packed, G.structureActiveType, house());
    },
    placementDetail(packed: number) {
      if (G.structureActiveType === 0xffff) return { valid: 0, cells: [] };
      return structurePlacementDetailFor(packed, G.structureActiveType, house());
    },
    place(packed: number): boolean {
      if (placingYard < 0 || G.structureActiveType === 0xffff) return false;
      if (structureIsValidBuildLocationFor(packed, G.structureActiveType, house()) === 0) {
        G.onSound(47);
        return false;
      }
      send({ k: "place", s: placingYard, p: packed, t:G.structureActiveType });
      placingYard = -1;
      G.structureActiveType = 0xffff;
      G.structureActive = null;
      G.selectionType = SELECTION.STRUCTURE;
      return true;
    },
    cancelPlace() {
      placingYard = -1;
      G.structureActiveType = 0xffff;
      G.structureActive = null;
      G.selectionType = SELECTION.STRUCTURE;
    },
    toggleRepair(s: Structure) { if (own(s)) send({ k: "repair", s: s.o.index }); },
    upgrade(s: Structure) { if (own(s)) send({ k: "upgrade", s: s.o.index }); },
    holdOrResume(s: Structure) { if (own(s)) send({ k: "hold", s: s.o.index }); },
    cancelBuild(s: Structure) { if (own(s)) send({ k: "cancel", s: s.o.index }); },
    stopAll(s: Structure) { if (own(s)) send({ k: "stop", s: s.o.index }); },
    startRepair(s: Structure) { if (own(s)) send({ k: "fix", s: s.o.index }); },
    palaceSpecial(s: Structure) {
      if (!own(s) || s.o.type !== STRUCTURE.PALACE || s.countDown !== 0) return;
      if (houseInfo[s.o.houseID].specialWeapon === HOUSE_WEAPON.MISSILE) {
        // ракету наводит сам игрок: цель — следующим щелчком (targetClick)
        missilePalace = s.o.index;
        G.selectionType = SELECTION.TARGET;
        return;
      }
      send({ k: "palace", s: s.o.index, p: 0 });
    },
  };
  for (const [name, fn] of Object.entries(local)) g[name] = fn;
  return () => {
    for (const name of OVERRIDDEN) delete g[name];
  };
}
