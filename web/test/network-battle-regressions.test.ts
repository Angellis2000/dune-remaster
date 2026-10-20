import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../src/rom/dune.ts';
import {World} from '../src/game/world.ts';
import {G,INDEX_INVALID,IT,STATE,STRUCTURE,UNIT,indexEncode,packXY,unpackTile,randomState} from '../src/engine/core.ts';
import {structureBuildObject,structureCreate,structureDamage,structureHouseUnderAttack} from '../src/engine/structure.ts';
import {unitCreate,unitDamage,unitHide,unitMove,unitRemove} from '../src/engine/unit.ts';
import {unitInfo} from '../src/engine/tables.ts';
import {scriptFunctionsUnit} from '../src/engine/scriptfns.ts';
import {explosionStart} from '../src/engine/explosion.ts';
import {aiBuilderTick} from '../src/engine/net-ai.ts';
import {craterLayout} from '../src/gfx/crater-layout.ts';
import {playerRelation} from '../src/ui/relations.ts';
import {padDroneLoad,houseHasDroneRoom} from '../src/engine/drone-capacity.ts';
import {initializeDrone,tickDrone} from '../src/engine/advanced-units.ts';

const rom=new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url))));
function match(ai=false,local=1){
  const world=new World(rom);
  world.loadNetwork({map:5,seed:20261020,credits:50000,local,players:[
    {slot:0,house:1,team:0,name:'A'}, {slot:1,house:0,team:1,name:'H',ai},
    {slot:2,house:2,team:0,name:'O'},
  ]});return world;
}
const yard=(house=1)=>G.structureFind.find(s=>s.o.houseID===house&&s.o.type===STRUCTURE.CONSTRUCTION_YARD)!;
function eraseHouse(house:number){
  for(const u of [...G.unitFind])if(u.o.houseID===house)unitRemove(u);
  for(const s of [...G.structureFind])if(s.o.houseID===house)structureDamage(s,99999,0);
}

test('destroyed yard cannot build; its unfinished off-map object and stored orders are removed',()=>{
  const world=match(true),cy=yard(0);
  assert.ok(structureBuildObject(cy,STRUCTURE.WINDTRAP));
  const pending=G.structures[cy.o.linkedID];assert.ok(pending.o.flags.isNotOnMap);
  cy.countDown=1;cy.state=STATE.BUSY;
  cy.readyBuildings=[{type:STRUCTURE.SLAB_2x2,cost:15}];cy.buildingQueue=[{type:STRUCTURE.WINDTRAP,cost:300}];
  structureDamage(cy,99999,0);
  assert.equal(pending.o.flags.used,false);assert.equal(cy.readyBuildings.length,0);assert.equal(cy.buildingQueue.length,0);
  for(let i=0;i<1800;i++)world.game.tick();
  assert.equal(G.structureFind.filter(s=>s.o.houseID===0&&s.o.flags.allocated&&!s.o.flags.isNotOnMap).length,0);
  G.timerGame=6000;aiBuilderTick();assert.equal(cy.o.linkedID,255);
  const credits=G.houses[0].credits;
  world.game.execNet(0,{k:'build',s:cy.o.index,t:STRUCTURE.WINDTRAP});
  assert.equal(G.houses[0].credits,credits,'late network command cannot operate a destroyed factory');
});

test('destroyed factory releases ready-but-blocked units instead of leaking unit slots',()=>{
  match();G.validateStrictIfZero++;
  const factory=structureCreate(INDEX_INVALID,STRUCTURE.HEAVY_VEHICLE,1,packXY(30,30))!;
  G.validateStrictIfZero--;
  const waiting=unitCreate(INDEX_INVALID,UNIT.TANK,1,{x:65535,y:65535},0)!;
  factory.readyUnits=[waiting.o.index];
  structureDamage(factory,99999,0);
  assert.equal(waiting.o.flags.used,false);assert.deepEqual(factory.readyUnits,[]);
});

test('victory ignores dead structures, unplaced production and empty support vehicles, but keeps an MCV alive',()=>{
  for(const mcv of [false,true]){
    const world=match();eraseHouse(0);
    const phantom=structureCreate(INDEX_INVALID,STRUCTURE.WINDTRAP,0,INDEX_INVALID)!;
    assert.ok(phantom.o.flags.isNotOnMap);
    const type=mcv?UNIT.MCV:UNIT.HARVESTER;
    const unit=unitCreate(INDEX_INVALID,type,0,unpackTile(packXY(30,30)),0)!;assert.ok(unit);
    for(let i=0;i<600;i++)world.game.tick();
    assert.equal(world.game.ended,mcv?null:'won');
  }
});

test('network base sirens and loss messages/voices are local, not allied or enemy',()=>{
  match();const sounds:number[]=[],feedback:number[]=[],messages:string[]=[];
  const saved=[G.onSound,G.onFeedback,G.onMessage] as const;
  G.onSound=id=>sounds.push(id);G.onFeedback=id=>feedback.push(id);G.onMessage=t=>messages.push(t);
  try{
    for(const house of [2,0,1])structureHouseUnderAttack(house);
    assert.deepEqual(sounds,[0x3e]);
    sounds.length=0;
    for(const house of [2,0]){
      const u=G.unitFind.find(u=>u.o.houseID===house&&u.o.type===UNIT.QUAD)!;
      unitDamage(u,99999,0);
      G.scriptCurrentUnit=u;G.scriptCurrentObject=u.o;
      const fn=scriptFunctionsUnit.find(fn=>fn.name==='unitDisplayDestroyedText')!;assert.ok(fn);fn(u.o.script);
      structureDamage(yard(house),99999,0);
    }
    assert.equal(feedback.length,0);assert.equal(messages.length,0);
    const own=G.unitFind.find(u=>u.o.houseID===1&&u.o.type===UNIT.QUAD)!;
    unitDamage(own,99999,0);assert.ok(feedback.length>0,'own losses are still audible');
  }finally{[G.onSound,G.onFeedback,G.onMessage]=saved;}
});

test('an MCV carried by a living carryall prevents premature elimination',()=>{
  const world=match();eraseHouse(0);
  const p=unpackTile(packXY(30,30));
  const mcv=unitCreate(INDEX_INVALID,UNIT.MCV,0,p,0)!;unitHide(mcv);
  const carrier=unitCreate(INDEX_INVALID,UNIT.CARRYALL,0,p,0)!;
  carrier.o.linkedID=mcv.o.index;carrier.o.flags.inTransport=true;
  // Test the elimination poll before transport scripts choose a landing site.
  G.timerGame=1000;
  (world.game as any).netLevelEnd();
  assert.equal(world.game.ended,null);assert.ok(world.game.netAlive&1);
});

test('only palace missile triggers a nuclear visual, with doubled network blast damage',()=>{
  const world=match(),impacts:{x:number;y:number}[]=[];
  const saved=G.onHouseMissileImpact;G.onHouseMissileImpact=p=>impacts.push({...p});
  try{
    explosionStart(11,unpackTile(packXY(28,28)));
    assert.equal(impacts.length,0,'vehicle explosion 11 is not a palace strike');
    const point=unpackTile(packXY(30,30));
    const tank=unitCreate(INDEX_INVALID,UNIT.SIEGE_TANK,0,point,0)!;assert.ok(tank);
    const max=unitInfo[tank.o.type].o.hitpoints;
    const missile=unitCreate(INDEX_INVALID,UNIT.MISSILE_HOUSE,1,{x:point.x-32,y:point.y},64)!;assert.ok(missile);
    missile.currentDestination={...point};missile.distanceToDestination=32;missile.fireDelay=0;
    missile.targetAttack=indexEncode(packXY(30,30),IT.TILE);
    unitMove(missile,32);
    assert.equal(impacts.length,1);assert.equal(tank.o.hitpoints,0,`blast must destroy a central ${max} HP siege tank`);
    assert.equal(missile.o.flags.used,false);
    assert.ok(world.game.netHash());
  }finally{G.onHouseMissileImpact=saved;}
});

test('crater variation is stable, has small marks and never consumes simulation RNG; alliances differ from house paint',()=>{
  match();const before=randomState(),layouts=Array.from({length:128},(_,p)=>craterLayout(p,4));
  assert.deepEqual(craterLayout(32,4),craterLayout(32,4));
  assert.ok(layouts.some(l=>l.length===3));assert.ok(layouts.flat().some(c=>c.size<.25));
  assert.ok(new Set(layouts.map(l=>l[0].x.toFixed(3))).size>100);
  assert.deepEqual(randomState(),before);
  assert.equal(playerRelation(1),'own');assert.equal(playerRelation(2),'ally');assert.equal(playerRelation(0),'enemy');
});

test('each drone pad accepts three squads including paid production; a second pad adds three slots',()=>{
  for(const network of [false,true]){
    const world=match();if(!network)world.game.load('A',8);
    G.houses[1].credits=50000;G.houses[1].structuresBuilt=0x7fffffff;
    G.validateStrictIfZero++;
    const a=structureCreate(INDEX_INVALID,STRUCTURE.DRONE_PAD,1,packXY(20,22))!;
    const b=structureCreate(INDEX_INVALID,STRUCTURE.DRONE_PAD,1,packXY(28,22))!;
    G.validateStrictIfZero--;
    assert.ok(a&&b);
    for(const pad of [a,b]){
      for(let i=0;i<3;i++)assert.equal(world.game.build(pad,UNIT.COMBAT_DRONE),true);
      assert.equal(padDroneLoad(pad),3);
      const credits=G.houses[1].credits;
      assert.equal(world.game.build(pad,UNIT.COMBAT_DRONE),false);assert.equal(G.houses[1].credits,credits);
    }
    assert.equal(houseHasDroneRoom(1),false,'starport may not bypass all pad reservations');
    assert.ok(world.game.cancelQueuedUnit(a,0));assert.equal(padDroneLoad(a),2);
    assert.ok(world.game.build(a,UNIT.COMBAT_DRONE));assert.equal(padDroneLoad(a),3);
  }
});

test('new drone squads reserve separate resting positions even when the first parking position is blocked',()=>{
  match();G.validateStrictIfZero++;
  const pad=structureCreate(INDEX_INVALID,STRUCTURE.DRONE_PAD,1,packXY(20,22))!;
  structureCreate(INDEX_INVALID,STRUCTURE.WINDTRAP,1,packXY(23,23));
  G.validateStrictIfZero--;
  const wings=[];
  for(let i=0;i<3;i++){
    const u=unitCreate(INDEX_INVALID,UNIT.COMBAT_DRONE,1,unpackTile(packXY(20,22)),0)!;
    initializeDrone(u,pad);wings.push(u);
  }
  const goals=wings.map(u=>u.drone!.guardPosition!);
  for(let i=0;i<3;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(goals[i].x-goals[j].x,goals[i].y-goals[j].y)>=220);
  G.houses[1].powerProduction=1000;G.houses[1].powerUsage=0;
  for(let i=0;i<900;i++){G.timerGame++;for(const u of wings)tickDrone(u);}
  assert.ok(wings.every(u=>u.drone!.landed));
  for(let i=0;i<3;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(wings[i].o.position.x-wings[j].o.position.x,wings[i].o.position.y-wings[j].o.position.y)>200);
});

test('drone production, cap and landing remain identical for different local players',()=>{
  function run(local:number){
    const world=match(false,local);
    G.houses[1].structuresBuilt=0x7fffffff;G.validateStrictIfZero++;
    const pad=structureCreate(INDEX_INVALID,STRUCTURE.DRONE_PAD,1,packXY(20,22))!;G.validateStrictIfZero--;
    for(let i=0;i<4;i++)world.game.execNet(1,{k:'build',s:pad.o.index,t:UNIT.COMBAT_DRONE});
    assert.equal(padDroneLoad(pad),3);
    const hashes=[];
    for(let f=0;f<3600;f++){
      world.game.tick();
      if(f%300===0){world.game.buildOptions(pad);hashes.push(world.game.netHash());}
    }
    return hashes;
  }
  assert.deepEqual(run(1),run(0));
});

test('drone parking candidates at the right map edge cannot wrap into the next row',()=>{
  match();G.validateStrictIfZero++;
  const pad=structureCreate(INDEX_INVALID,STRUCTURE.DRONE_PAD,1,packXY(60,30))!;
  G.validateStrictIfZero--;assert.ok(pad);
  for(let i=0;i<3;i++){
    const u=unitCreate(INDEX_INVALID,UNIT.COMBAT_DRONE,1,pad.o.position,0)!;initializeDrone(u,pad);
    const p=u.drone!.guardPosition!;
    assert.ok(p.x>=0&&p.x<16384&&p.y>=0&&p.y<16384,JSON.stringify(p));
  }
});
