import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(root,'web/package.json'));
await mkdir(path.join(root,'scratch'),{recursive:true});const file=path.join(root,'scratch/new-units-test.mjs');
await require('esbuild').build({stdin:{contents:`export{Game}from'./src/engine/game.ts';export{DuneRom}from'./src/rom/dune.ts';export{G,ACTION,UNIT,STRUCTURE,IT,STATE,INDEX_INVALID,indexEncode,packXY,packTile,tileCenter,unpackTile,tileGetDirection}from'./src/engine/core.ts';export{unitCreate,unitHide,unitSetAction,unitSetTarget,unitSetDestination}from'./src/engine/unit.ts';export{structureCreate,structureGetBuildable,structureRemove}from'./src/engine/structure.ts';export{unitInfo,structureInfo}from'./src/engine/tables.ts';export{initializeDrone,tickDrone,droneTargetAllowed,fireLaser,laserDamageAgainst}from'./src/engine/advanced-units.ts';export{DRONE_RADIUS}from'./src/engine/custom-unit-defs.ts';export{hudState}from'./src/ui/hud.ts';`,resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:file,loader:{'.png':'dataurl'},plugins:[{name:'urls',setup(b){b.onResolve({filter:/\?url$/},a=>({path:a.path,namespace:'ignore'}));b.onLoad({filter:/.*/,namespace:'ignore'},()=>({contents:'export default ""'}));}}]});
const {Game,DuneRom,G,ACTION,UNIT,STRUCTURE,IT,STATE,INDEX_INVALID,indexEncode,packXY,packTile,tileCenter,unpackTile,tileGetDirection,unitCreate,unitHide,unitSetAction,unitSetTarget,structureCreate,structureGetBuildable,structureRemove,unitInfo,structureInfo,initializeDrone,droneTargetAllowed,fireLaser,laserDamageAgainst,DRONE_RADIUS,hudState}=await import(pathToFileURL(file));
const rom=new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen')))),game=new Game(rom);
function setup(house='A',mission=8){
  game.load(house,mission);G.validateStrictIfZero=1;G.revealAll=true;G.scenario.winFlags=G.scenario.loseFlags=0;
  for(const u of [...G.unitFind])unitHide(u);
  for(const s of G.structureFind)if(s.o.houseID!==G.playerHouseID)s.o.script.delay=65000;
  for(const h of G.houseFind){h.flags.isAIActive=false;h.powerProduction=5000;h.powerUsage=0;}
  G.houses[G.playerHouseID].credits=50000;
}
function step(){const h=G.houses[G.playerHouseID];h.powerProduction=10000;h.powerUsage=0;game.tick();}
function building(type,x,y){const s=structureCreate(INDEX_INVALID,type,G.playerHouseID,packXY(x,y));assert.ok(s);s.upgradeLevel=3;return s;}
function prerequisites(){const h=G.houses[G.playerHouseID];h.structuresBuilt|=(1<<STRUCTURE.HIGH_TECH)|(1<<STRUCTURE.OUTPOST);}
for(const house of ['A','H','O'])for(const mission of [7,8,9]){
  setup(house,mission);prerequisites();
  const yard=building(STRUCTURE.CONSTRUCTION_YARD,8,8),heavy=building(STRUCTURE.HEAVY_VEHICLE,13,8),pad=building(STRUCTURE.DRONE_PAD,18,8);
  prerequisites();
  const available=mission>=8;
  assert.equal(!!(structureGetBuildable(yard)&(1<<STRUCTURE.DRONE_PAD)),available,house+' pad unlock '+mission);
  assert.equal(!!(structureGetBuildable(heavy)&(1<<UNIT.LASER_TANK)),available,house+' laser unlock '+mission);
  assert.equal(!!(structureGetBuildable(pad)&(1<<UNIT.COMBAT_DRONE)),available,house+' drone unlock '+mission);
}
// The new building follows the yard's original completion and placement cycle.
setup();
const yard=building(STRUCTURE.CONSTRUCTION_YARD,8,8);prerequisites();
game.build(yard,STRUCTURE.DRONE_PAD);
assert.notEqual(yard.o.linkedID,255);
const orderedPad=G.structures[yard.o.linkedID];
assert.equal(orderedPad.o.type,STRUCTURE.DRONE_PAD);
yard.countDown=1;
for(let i=0;i<1200&&!game.production(yard)?.ready;i++)step();
assert.equal(game.production(yard)?.ready,true);
assert.equal(game.placeIt(yard,false),true);
let padLocation=null;
for(let y=8;y<52&&padLocation===null;y++)for(let x=8;x<52;x++)if(game.canPlaceAt(packXY(x,y))!==0){padLocation=packXY(x,y);break;}
assert.notEqual(padLocation,null);assert.equal(game.place(padLocation),true);
assert.equal(orderedPad.o.flags.isNotOnMap,false);
setup();prerequisites();
const heavy=building(STRUCTURE.HEAVY_VEHICLE,10,10),pad=building(STRUCTURE.DRONE_PAD,16,10);
prerequisites();
// Complete actual factory orders through the unchanged ROM EMC production/deployment path.
function produce(factory,type){
  assert.ok(game.buildOptions(factory).some(o=>o.type===type&&o.available===1));game.build(factory,type);
  assert.notEqual(factory.o.linkedID,255);const u=G.units[factory.o.linkedID];assert.equal(u.o.type,type);
  assert.ok(hudState(rom,factory,null).order>=256,'New order has an HD-only frame, no ROM over-read');
  factory.countDown=1;
  for(let i=0;i<1200&&u.o.flags.isNotOnMap;i++)step();
  assert.equal(u.o.flags.isNotOnMap,false,'Produced unit must leave its factory');assert.equal(factory.o.linkedID,255);
  return u;
}
const laser=produce(heavy,UNIT.LASER_TANK),wing=produce(pad,UNIT.COMBAT_DRONE);
assert.equal(wing.drone.home,indexEncode(pad.o.index,IT.STRUCTURE));assert.equal(wing.drone.members.length,3);
assert.deepEqual(wing.drone.members.map(m=>m.grenades),[5,5,5]);
assert.equal(hudState(rom,null,wing).hp.max,120);assert.equal(hudState(rom,pad,null).hp.max,300);
assert.ok(hudState(rom,null,laser).portrait>=256);
// Every centre and every individual drone remains inside the command radius.
game.order(wing,ACTION.MOVE,packXY(60,60));
let previous={...wing.o.position},previousSpeed=0;
for(let i=0;i<1000;i++){
  step();const d=wing.drone,p=wing.o.position,h=d.homePosition;
  assert.ok(Math.hypot(p.x-h.x,p.y-h.y)<=DRONE_RADIUS);
  for(const m of d.members)assert.ok(Math.hypot(m.x-h.x,m.y-h.y)<=DRONE_RADIUS);
  const speed=Math.hypot(p.x-previous.x,p.y-previous.y);
  if(i<15)assert.ok(speed-previousSpeed<2.2,'Flight acceleration must be gradual');
  previous={...p};previousSpeed=speed;
}
// An enemy outside the zone must not be pursued, even when explicitly selected.
const outside=unitCreate(INDEX_INVALID,UNIT.SOLDIER,(G.playerHouseID+1)%3,tileCenter(unpackTile(packXY(40,35))),0);assert.ok(outside);outside.o.seenByHouses=255;
assert.equal(droneTargetAllowed(wing,indexEncode(outside.o.index,IT.UNIT)),false);
game.order(wing,ACTION.ATTACK,packTile(outside.o.position));assert.equal(wing.targetAttack,0);
// Fly back and consume all 15 grenades against a ground target; no damage before impact.
wing.o.position={x:wing.drone.homePosition.x+256,y:wing.drone.homePosition.y+64};
for(const m of wing.drone.members){m.x=wing.o.position.x;m.y=wing.o.position.y;m.vx=m.vy=0;m.grenades=5;}
wing.drone.phase='guard';wing.drone.vx=wing.drone.vy=0;wing.drone.battery=100;wing.drone.launchAfter=0;wing.actionID=ACTION.GUARD;wing.targetMove=0;
const enemy=unitCreate(INDEX_INVALID,UNIT.TANK,(G.playerHouseID+1)%3,{x:wing.o.position.x+80,y:wing.o.position.y+64},0);assert.ok(enemy);enemy.o.hitpoints=10000;enemy.o.seenByHouses=255;enemy.o.script.delay=65000;
const hp=enemy.o.hitpoints;let dropped=false,returning=false,rearmed=false,maxQueue=0,empty=false;
for(let i=0;i<2000;i++){
  step();maxQueue=Math.max(maxQueue,G.droneGrenades.length);
  if(!dropped&&G.droneGrenades.length){dropped=true;assert.equal(enemy.o.hitpoints,hp,'Dropping a grenade must not cause immediate damage');}
  if(wing.drone.phase==='return')returning=true;
  if(wing.drone.members.every(m=>m.grenades===0))empty=true;
  if(returning&&wing.drone.phase==='guard'&&wing.drone.members.every(m=>m.grenades===5)){rearmed=true;break;}
}
if(!dropped)console.log(JSON.stringify({ended:game.ended,tick:G.timerGame,wing:{used:wing.o.flags.used,hp:wing.o.hitpoints,action:wing.actionID,position:wing.o.position,target:wing.targetAttack,state:wing.drone},enemy:{hp:enemy.o.hitpoints,position:enemy.o.position,house:enemy.o.houseID},allowed:droneTargetAllowed(wing,indexEncode(enemy.o.index,IT.UNIT))}));
assert.ok(dropped&&maxQueue>0);assert.ok(empty,'All three members expend their own five grenades');assert.ok(enemy.o.hitpoints<hp);assert.ok(returning&&rearmed,'Wing must land and refill after expending its grenades');
// Lost pad cannot recharge a wing; remaining charge runs out.
pad.o.hitpoints=0;wing.drone.battery=.2;
for(let i=0;i<8;i++)step();assert.ok(wing.o.hitpoints===0||wing.actionID===ACTION.DIE||!wing.o.flags.used);
// Laser charging, cooldown and role multipliers use the actual impact path.
laser.o.position=tileCenter(unpackTile(packXY(30,30)));laser.speed=0;laser.fireDelay=0;laser.currentDestination={x:0,y:0};laser.laser=undefined;
const air=unitCreate(INDEX_INVALID,UNIT.CARRYALL,(G.playerHouseID+1)%3,tileCenter(unpackTile(packXY(30,27))),0);assert.ok(air);air.o.hitpoints=1000;air.o.seenByHouses=255;
const target=indexEncode(air.o.index,IT.UNIT);laser.targetAttack=target;laser.orientation[1].current=tileGetDirection(laser.o.position,air.o.position);
const before=air.o.hitpoints;assert.equal(fireLaser(laser,target),0);assert.equal(air.o.hitpoints,before);
G.timerGame+=47;assert.equal(fireLaser(laser,target),0);G.timerGame++;
assert.equal(fireLaser(laser,target),1);assert.ok(air.o.hitpoints<before);const after=air.o.hitpoints;
assert.equal(fireLaser(laser,target),0);assert.equal(air.o.hitpoints,after,'Cooling laser cannot fire again');
assert.ok(laserDamageAgainst(UNIT.CARRYALL)>laserDamageAgainst(UNIT.TANK));assert.ok(laserDamageAgainst(UNIT.TRIKE)>laserDamageAgainst(UNIT.TANK));
assert.ok(unitInfo[UNIT.LASER_TANK].o.flags.targetAir);
laser.laser=undefined;laser.fireDelay=0;air.speed=0;air.o.script.delay=65000;
unitSetAction(laser,ACTION.ATTACK);unitSetTarget(laser,target);const scriptHP=air.o.hitpoints;
for(let i=0;i<600&&air.o.hitpoints===scriptHP;i++)step();
assert.ok(air.o.hitpoints<scriptHP,'Original tank EMC must actually drive the new charged laser weapon');
console.log('PASS: all houses unlock pad/laser/drone on missions 8–9 only; original production deploys both types; HUD frames/HP safe; 3 inertial drones stay in range, drop delayed grenades, rearm and lose power with pad; laser charges, damages aircraft, cools and favors light targets.');
