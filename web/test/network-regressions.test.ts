import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DuneRom } from '../src/rom/dune.ts';
import { World } from '../src/game/world.ts';
import { ACTION, G, INDEX_INVALID, IT, STRUCTURE, UNIT, indexEncode, packTile, type Structure } from '../src/engine/core.ts';
import { type NetCommand } from '../src/engine/game.ts';
import { structureCreate, structureIsUpgradable, structureIsValidBuildLocationFor } from '../src/engine/structure.ts';
import { structureInfo } from '../src/engine/tables.ts';
import { installNetControls } from '../src/net/controls.ts';
import { unitCreate } from '../src/engine/unit.ts';
import { structureDeployProducedUnit } from '../src/engine/scriptfns.ts';
import { mapUnveilTile } from '../src/engine/map.ts';

test('insufficient spice gives feedback without spending or sending unaffordable orders in either mode',()=>{
  for(const network of [false,true]){
    const world=match(),game=world.game;
    if(!network)game.load('A',8);
    const cy=yard(),s=structureCreate(INDEX_INVALID,STRUCTURE.HEAVY_VEHICLE,1,spot(STRUCTURE.HEAVY_VEHICLE))!;
    const starport=structureCreate(INDEX_INVALID,STRUCTURE.STARPORT,1,INDEX_INVALID)!;
    const damaged=structureCreate(INDEX_INVALID,STRUCTURE.WINDTRAP,1,INDEX_INVALID)!;
    const h=G.houses[1],sent:NetCommand[]=[],messages:string[]=[];
    const original=G.onMessage;G.onMessage=text=>messages.push(text);
    const restore=network?installNetControls(game,c=>sent.push(c),()=>1):()=>{};
    try{
      h.credits=0;damaged.o.hitpoints--;assert.ok(game.repairCost(damaged)>0);
      assert.equal(game.build(cy,STRUCTURE.WINDTRAP),false);
      assert.equal(messages.length,1,`build feedback, network=${network}`);
      G.starportAvailable[UNIT.TANK]=3;
      assert.equal(game.starportBuy(starport,UNIT.TANK,400),false);
      assert.equal(messages.length,2,'starport feedback');
      game.upgrade(s);assert.equal(messages.length,3,`upgrade feedback, cost=${structureInfo[s.o.type].o.buildCredits}, active=${s.o.flags.upgrading}`);
      game.toggleRepair(damaged);assert.equal(messages.length,4,'repair feedback');
      game.startRepair(damaged);
      assert.equal(messages.length,5);assert.ok(messages.every(text=>text==='Недостаточно спайса'));
      assert.equal(h.credits,0);assert.equal(sent.length,0);
      assert.equal(s.o.flags.upgrading,false);assert.equal(damaged.o.flags.repairing,false);
      assert.equal(cy.buildingQueue?.length??0,0);
    }finally{restore();G.onMessage=original;}
  }
});

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen', import.meta.url))));
function match() {
  const world = new World(rom);
  world.loadNetwork({ map: 5, seed: 20261020, credits: 50000, local: 1, players: [
    { slot: 0, house: 1, team: 0, name: 'A' }, { slot: 1, house: 0, team: 1, name: 'H' },
  ] });
  return world;
}
const yard = (house=1) => G.structureFind.find(s=>s.o.houseID===house && s.o.type===STRUCTURE.CONSTRUCTION_YARD)!;
function spot(type:number):number {
  for(let p=0;p<4096;p++) if(structureIsValidBuildLocationFor(p,type,1)!==0) return p;
  throw Error('No build location');
}

test('translucent network fog contains landscape, never hidden ROM building/wall/object tiles', () => {
  const world = match(), p = packTile(yard(0).o.position), hash = world.game.netHash();
  assert.notEqual(G.map[p].groundTileID, G.mapTileID[p]&0x1ff, 'fixture needs an original building tile');
  world.sync();
  assert.equal(world.map.unveiled[p],0);
  for(let i=0;i<4096;i++) if(!world.map.unveiled[i]) assert.equal(world.map.ground[i],G.mapTileID[i]&0x1ff,`hidden tile ${i}`);
  assert.equal(world.game.netHash(),hash,'view must not change simulation');
  G.net!.view |= 1;
  world.sync();
  assert.equal(world.map.ground[p],G.map[p].groundTileID,'revealed objects retain their real tile');
});

test('network placement reserves exactly one ready item until echo; no extra ghost or order', () => {
  const world=match(), game=world.game, cy=yard();
  const type=STRUCTURE.SLAB_2x2;
  cy.readyBuildings=[{type,cost:structureInfo[type].o.buildCredits}];
  const commands:NetCommand[]=[];
  const restore=installNetControls(game,c=>commands.push(c),()=>1);
  try {
    assert.ok(game.placeIt(cy));
    assert.ok(game.place(spot(type)));
    assert.equal(cy.readyBuildings.length,1,'raw inventory is unchanged before lockstep executes');
    assert.equal(game.readyBuildings(cy).length,0,'pending item is unavailable to local UI');
    assert.equal(game.production(cy),null);
    assert.equal(game.placeIt(cy),false,'auto-placement must not pick the pending item again');
    game.execNet(1,commands[0]);
    assert.equal(cy.readyBuildings.length,0);
    assert.equal(game.placeIt(cy),false);
    assert.equal(commands.length,1,'echo never sends another command');
    cy.readyBuildings=[{type,cost:15},{type,cost:15}];
    assert.ok(game.placeIt(cy)); assert.ok(game.place(spot(type)));
    assert.equal(game.readyBuildings(cy).length,1,'another real order remains usable');
    assert.ok(game.placeIt(cy)); assert.ok(game.place(spot(type)));
    assert.equal(game.readyBuildings(cy).length,0);
    // Both were aimed at the same free tile. The second command fails and must
    // release its reservation, returning the real item to the ready inventory.
    game.execNet(1,commands[1]); game.execNet(1,commands[2]);
    assert.equal(game.readyBuildings(cy).length,1,'failed placement is available again');
  } finally { restore(); }
});

test('network upgrades start, progress, stop and restart using the same rule as mouse menu', () => {
  for(const type of [STRUCTURE.CONSTRUCTION_YARD,STRUCTURE.LIGHT_VEHICLE,STRUCTURE.HEAVY_VEHICLE,STRUCTURE.HIGH_TECH,STRUCTURE.BARRACKS]) {
    const world=match(), game=world.game;
    const s:Structure=type===STRUCTURE.CONSTRUCTION_YARD?yard():structureCreate(INDEX_INVALID,type,1,spot(type))!;
    assert.ok(s);
    assert.ok(structureIsUpgradable(s),`type ${type} upgradable`);
    // No radar: this is still an enabled action in the right-hand mouse menu.
    assert.ok(game.upgradeInfo(s).possible);
    game.execNet(1,{k:'upgrade',s:s.o.index});
    assert.ok(s.o.flags.upgrading,`type ${type} starts`);
    for(let i=0;i<100;i++)game.tick();
    assert.ok(s.upgradeTimeLeft<100,`type ${type} progresses`);
    game.execNet(1,{k:'upgrade',s:s.o.index});
    assert.equal(s.o.flags.upgrading,false,`type ${type} stops`);
    game.execNet(1,{k:'upgrade',s:s.o.index});
    assert.ok(s.o.flags.upgrading,`type ${type} restarts`);
    for(let i=0;i<3000&&s.o.flags.upgrading;i++)game.tick();
    assert.ok(s.upgradeLevel>0,`type ${type} finishes`);
  }
  const world=match(), game=world.game;
  G.houses[1].structuresBuilt=0x7ffff;
  const s=structureCreate(INDEX_INVALID,STRUCTURE.HEAVY_VEHICLE,1,INDEX_INVALID)!;
  assert.ok(game.buildOptions(s).some(o=>o.available<0),'fixture has a locked unit');
  assert.ok(game.upgradeEntry(s),'locked units do not hide the upgrade in the classic factory menu');
});

test('allies, including AI, share exploration and targets; enemies do not, hashes ignore local viewer',()=>{
  const players=[{slot:0,house:1,team:0,name:'A'},{slot:1,house:2,team:0,name:'O',ai:1},{slot:2,house:0,team:1,name:'H'}];
  function run(local:number){
    const world=new World(rom);
    world.loadNetwork({map:5,seed:77,credits:50000,local,players});
    const enemy=packTile(yard(0).o.position);
    assert.ok(mapUnveilTile(enemy,2),'allied AI can reveal a new enemy location');
    world.sync();
    if(local===1||local===2){
      assert.equal(world.map.unveiled[enemy],1);
      assert.ok(world.game.selectAt(enemy),'enemy discovered by ally can be selected');
    }
    const far=G.map.findIndex(t=>t.unveiledHouses===0);
    mapUnveilTile(far,1);
    assert.equal(G.map[far].unveiledHouses&6,6,'both allies see the new exploration');
    assert.equal(G.map[far].unveiledHouses&1,0,'enemy does not share it');
    for(let i=0;i<120;i++)world.step();
    world.sync();
    return {hash:world.game.netHash(),vision:Array.from(world.map.unveiled)};
  }
  const a=run(1),b=run(2),e=run(0),o=run(-1);
  assert.deepEqual(a.vision,b.vision);
  assert.equal(a.hash,b.hash);assert.equal(a.hash,e.hash);assert.equal(a.hash,o.hash);
});

test('rally points work for campaign and network production, with delayed network application',()=>{
  for(const network of [false,true]){
    const world=match(),game=world.game;
    if(!network)game.load('A',8);
    const s=structureCreate(INDEX_INVALID,STRUCTURE.HEAVY_VEHICLE,1,spot(STRUCTURE.HEAVY_VEHICLE))!;
    assert.ok(s);const p=spot(STRUCTURE.SLAB_1x1);
    const sent:NetCommand[]=[];
    const restore=network?installNetControls(game,c=>sent.push(c),()=>1):()=>{};
    try{
      assert.ok(game.beginRally(s));game.targetClick(p);
      if(network){assert.equal(s.rallyPoint,undefined);game.execNet(1,sent.shift()!);}
      assert.equal(s.rallyPoint,p);
      const u=unitCreate(INDEX_INVALID,UNIT.TANK,1,{x:0xffff,y:0xffff},0)!;
      assert.equal(structureDeployProducedUnit(s,u),1);
      assert.equal(u.actionID,ACTION.MOVE);
      assert.equal(u.targetMove,indexEncode(p,IT.TILE));
      assert.ok(game.setRallyPoint(s,-1));
      if(network)game.execNet(1,sent.shift()!);
      assert.equal(s.rallyPoint,undefined);
    }finally{restore();}
  }
});
