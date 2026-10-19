// node --experimental-transform-types tools/sim/custom_units.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {ACTION,G,INDEX_INVALID,IT,LST,MOVEMENT,STRUCTURE,UNIT,indexEncode,packXY,tileCenter,unpackTile,type Unit} from '../../web/src/engine/core.ts';
import {structureCreate} from '../../web/src/engine/structure.ts';
import {unitCreate,unitSetAction,unitPrioritizeBlockingWall} from '../../web/src/engine/unit.ts';
import {iconLandscape,structureInfo,unitInfo} from '../../web/src/engine/tables.ts';
import {mapGetLandscapeType} from '../../web/src/engine/map.ts';
import {fireLaser,initializeDrone,laserImpact,tickDrone} from '../../web/src/engine/advanced-units.ts';
import {blockingWall} from '../../web/src/engine/combat-obstacles.ts';
import {installNetControls} from '../../web/src/net/controls.ts';

const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
const pos=(x:number,y:number)=>tileCenter(unpackTile(packXY(x,y)));
function reset(){
  game.loadNetwork({map:5,seed:20261019,credits:50000,local:1,players:[{slot:0,house:1,name:'A',team:0},{slot:1,house:0,name:'H',team:1}]});
  G.mapScale=0;
  const rock=iconLandscape.findIndex(kind=>kind===LST.ENTIRELY_ROCK);assert.ok(rock>=0);
  for(let y=10;y<45;y++)for(let x=8;x<45;x++){
    const p=packXY(x,y),t=G.map[p];if(t.hasStructure||t.hasUnit)continue;
    t.groundTileID=rock;t.overlayTileID=0;t.isUnveiled=true;G.mapTileID[p]=rock;
  }
  G.houses[1].structuresBuilt=0x7fffffff;G.houses[1].powerProduction=1000;G.houses[1].powerUsage=0;
  G.tickHousePowerMaintenance=Number.MAX_SAFE_INTEGER;
}
function spawn(type:number,house:number,x:number,y:number):Unit {
  const u=unitCreate(INDEX_INVALID,type,house,pos(x,y),0)!;assert.ok(u);u.o.seenByHouses=0x3f;unitSetAction(u,ACTION.STOP);return u;
}
function wall(house:number,x:number,y:number){
  const p=packXY(x,y);G.validateStrictIfZero++;structureCreate(INDEX_INVALID,STRUCTURE.WALL,house,p);G.validateStrictIfZero--;
  assert.equal(mapGetLandscapeType(p),LST.WALL);return p;
}
function shoot(u:Unit,target:number){u.targetAttack=target;u.laser=undefined;assert.equal(fireLaser(u,target),0);G.timerGame+=48;assert.equal(fireLaser(u,target),1);}

reset();
const laser=spawn(UNIT.LASER_TANK,1,20,20);
assert.equal(unitInfo[UNIT.LASER_TANK].damage,152);
// дальше всех наземных юнитов оригинала (у орнитоптера 50 — он воздушный и не в счёт)
assert.ok(unitInfo[UNIT.LASER_TANK].fireDistance>Math.max(...unitInfo.slice(0,18).filter(u=>u.movementType!==MOVEMENT.WINGER).map(u=>u.fireDistance)));
G.validateStrictIfZero++;const building=structureCreate(INDEX_INVALID,STRUCTURE.WINDTRAP,0,packXY(24,20))!;G.validateStrictIfZero--;
assert.ok(building);const hp=building.o.hitpoints;
shoot(laser,indexEncode(building.o.index,IT.STRUCTURE));
assert.equal(hp-building.o.hitpoints,152,'buildings receive full laser damage');

reset();
const weapon=spawn(UNIT.LASER_TANK,1,20,20),enemy=spawn(UNIT.TANK,0,25,20),original=indexEncode(enemy.o.index,IT.UNIT),hpBefore=enemy.o.hitpoints;
const first=wall(0,22,20),second=wall(0,23,20);
weapon.targetAttack=original;unitPrioritizeBlockingWall(weapon);
assert.equal(weapon.targetAttack,indexEncode(first,IT.TILE));assert.equal(weapon.blockedAttack?.target,original);
shoot(weapon,weapon.targetAttack);
assert.notEqual(mapGetLandscapeType(first),LST.WALL);assert.equal(enemy.o.hitpoints,hpBefore,'enemy behind wall must not receive the laser hit');
unitPrioritizeBlockingWall(weapon);assert.equal(weapon.targetAttack,indexEncode(second,IT.TILE));
shoot(weapon,weapon.targetAttack);unitPrioritizeBlockingWall(weapon);
assert.equal(weapon.targetAttack,original);assert.equal(weapon.blockedAttack,undefined);
shoot(weapon,original);assert.ok(enemy.o.hitpoints<hpBefore);

reset();
const tank=spawn(UNIT.TANK,1,20,20),victim=spawn(UNIT.TANK,0,25,20),target=indexEncode(victim.o.index,IT.UNIT),enemyWall=wall(0,22,20);
tank.targetAttack=target;unitPrioritizeBlockingWall(tank);assert.equal(tank.targetAttack,indexEncode(enemyWall,IT.TILE));
game.order(tank,ACTION.MOVE,packXY(19,22),1);unitPrioritizeBlockingWall(tank);
assert.equal(tank.blockedAttack,undefined);assert.equal(tank.targetAttack,0,'new movement order must cancel the old blocked attack');
const ownWall=wall(1,21,20);assert.equal(blockingWall(tank,target),ownWall);
assert.equal(laserImpact(tank,target).blocked,true,'allied wall must block a laser without becoming a hostile target');

reset();
G.validateStrictIfZero++;const pad=structureCreate(INDEX_INVALID,STRUCTURE.DRONE_PAD,1,packXY(20,22))!;G.validateStrictIfZero--;assert.ok(pad);
const drone=spawn(UNIT.COMBAT_DRONE,1,21,23);initializeDrone(drone,pad);
spawn(UNIT.INFANTRY,0,22,23);
game.order(drone,ACTION.MOVE,packXY(25,23),1);
for(let i=0;i<600&&drone.actionID===ACTION.MOVE;i++){G.timerGame++;tickDrone(drone);assert.equal(drone.targetAttack,0,'explicit movement must not be replaced by automatic combat');}
assert.equal(drone.actionID,ACTION.GUARD);assert.ok(drone.o.position.x>24*256);
const held={...drone.o.position};for(let i=0;i<100;i++){G.timerGame++;tickDrone(drone);}
assert.ok(Math.abs(drone.o.position.x-held.x)<16,'completed movement must hold its destination, not fly back to the pad');
assert.ok(drone.drone!.members.every(m=>m.grenades===5),'each drone starts with five grenades');
const restore=installNetControls(game,c=>game.execNet(1,c),()=>1);
game.unitCommand(drone,ACTION.STOP);G.timerGame++;tickDrone(drone);restore();
assert.equal(drone.actionID,ACTION.STOP);assert.equal(drone.targetAttack,0);

const yard=G.structureFind.find(s=>s.o.houseID===1&&s.o.type===STRUCTURE.CONSTRUCTION_YARD)!;yard.upgradeLevel=3;
// маска построенного пересчитывается по настоящим зданиям — здесь проверяем только, что сеть не отсекает площадку
G.houses[1].structuresBuilt=0x7fffffff;
assert.ok(game.buildOptions(yard).some(o=>o.type===STRUCTURE.DRONE_PAD),'drone building is available in the network yard');
assert.ok(game.buildOptions(pad).some(o=>o.type===UNIT.COMBAT_DRONE));
assert.ok(structureInfo[STRUCTURE.DRONE_PAD].buildableUnits.includes(UNIT.COMBAT_DRONE));
console.log('custom units: 152 laser damage including buildings, two walls first then original enemy, allied wall protection, drone MOVE/GUARD/STOP and network production');
