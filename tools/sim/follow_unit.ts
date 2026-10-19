// Приказ «двигаться» на клетку своего юнита — следовать за ним (OpenDUNE Unit_SetDestination: клетка с юнитом → цель-юнит).
// node --experimental-transform-types tools/sim/follow_unit.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {ACTION,G,INDEX_INVALID,IT,LST,UNIT,indexEncode,packTile,packXY,tileCenter,unpackTile} from '../../web/src/engine/core.ts';
import {unitCreate,unitSetAction} from '../../web/src/engine/unit.ts';
import {iconLandscape} from '../../web/src/engine/tables.ts';
const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
game.load('H',4);
const me=G.playerHouseID,X0=20,Y0=40,sand=iconLandscape.findIndex(k=>k===LST.NORMAL_SAND);
for(let y=Y0;y<Y0+16;y++)for(let x=X0;x<X0+30;x++){const p=packXY(x,y),t=G.map[p];if(t.hasStructure||t.hasUnit)continue;t.groundTileID=sand;t.overlayTileID=0;G.mapTileID[p]=sand;}
const leader=unitCreate(INDEX_INVALID,UNIT.QUAD,me,tileCenter(unpackTile(packXY(X0+10,Y0+8))),64)!;
const follower=unitCreate(INDEX_INVALID,UNIT.TANK,me,tileCenter(unpackTile(packXY(X0+2,Y0+8))),64)!;
unitSetAction(leader,ACTION.GUARD);unitSetAction(follower,ACTION.GUARD);
game.orderGroup([follower],game.defaultAction(follower,packTile(leader.o.position)),packTile(leader.o.position));
assert.equal(follower.targetMove,indexEncode(leader.o.index,IT.UNIT),'клетка своего юнита стала целью-юнитом');
game.order(leader,ACTION.MOVE,packXY(X0+24,Y0+12));
for(let i=0;i<4000;i++){game.tick();if(process.env.TRACE&&i%250===0)console.log(i,(Math.hypot(leader.o.position.x-follower.o.position.x,leader.o.position.y-follower.o.position.y)/256).toFixed(1),"tm",follower.targetMove,"act",follower.actionID,"leader speed",leader.speed);}
const d=Math.hypot(leader.o.position.x-follower.o.position.x,leader.o.position.y-follower.o.position.y)/256;
assert.ok(d<3,`ведомый догнал ушедшего ведущего (расстояние ${d.toFixed(1)} клетки)`);
console.log('follow unit: move onto an own unit follows it',d.toFixed(1));
