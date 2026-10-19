// Приказ «Атака» по своему зданию повреждает его, как в MD: само здание-цель не считается своим препятствием
// на линии огня (friendlyStructureOnRay). node --experimental-transform-types tools/sim/own_building_attack.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {ACTION,G,INDEX_INVALID,LST,STRUCTURE,UNIT,packXY,tileCenter,unpackTile} from '../../web/src/engine/core.ts';
import {unitCreate,unitSetAction} from '../../web/src/engine/unit.ts';
import {structureCreate} from '../../web/src/engine/structure.ts';
import {iconLandscape} from '../../web/src/engine/tables.ts';
const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
game.load('H',4);
const me=G.playerHouseID,X0=20,Y0=40,rock=iconLandscape.findIndex(k=>k===LST.ENTIRELY_ROCK);
for(let y=Y0;y<Y0+16;y++)for(let x=X0;x<X0+30;x++){const p=packXY(x,y),t=G.map[p];if(t.hasStructure||t.hasUnit)continue;t.groundTileID=rock;t.overlayTileID=0;G.mapTileID[p]=rock;}
G.validateStrictIfZero++;const s=structureCreate(INDEX_INVALID,STRUCTURE.WINDTRAP,me,packXY(X0+10,Y0+8))!;G.validateStrictIfZero--;
const tank=unitCreate(INDEX_INVALID,UNIT.TANK,me,tileCenter(unpackTile(packXY(X0+5,Y0+8))),64)!;unitSetAction(tank,ACTION.GUARD);
const hp0=s.o.hitpoints;
game.order(tank,ACTION.ATTACK,packXY(X0+10,Y0+8));
for(let i=0;i<1500;i++)game.tick();
assert.ok(s.o.hitpoints<hp0,`своё здание повреждено (${hp0} → ${s.o.hitpoints})`);
console.log('own building attack: an explicit attack order damages an own building',hp0,'→',s.o.hitpoints);
