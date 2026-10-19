// node --experimental-transform-types tools/sim/production_storage.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DuneRom } from '../../web/src/rom/dune.ts';
import { Game } from '../../web/src/engine/game.ts';
import { G, INDEX_INVALID, IT, STATE, STRUCTURE, UNIT, indexEncode, packTile, packXY } from '../../web/src/engine/core.ts';
import { structureCreate, structureIsValidBuildLocationFor } from '../../web/src/engine/structure.ts';
import { layoutTilesAround, structureInfo } from '../../web/src/engine/tables.ts';
import { scriptFunctionsUnit, structureDeployProducedUnit } from '../../web/src/engine/scriptfns.ts';
import { installNetControls } from '../../web/src/net/controls.ts';

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen', import.meta.url))));
const game = new Game(rom);
function reset() {
  game.loadNetwork({ map: 5, seed: 20261019, credits: 50000, local: 1, players: [
    {slot:0,house:1,name:'A',team:0},{slot:1,house:0,name:'H',team:1},
  ] });
  G.tickHousePowerMaintenance=Number.MAX_SAFE_INTEGER;
  return G.structureFind.find(s=>s.o.houseID===1&&s.o.type===STRUCTURE.CONSTRUCTION_YARD)!;
}
function until(done:()=>boolean, label:string) {
  for(let i=0;i<40000&&!done();i++)game.tick();
  assert.ok(done(),label);
}
function spot(type:number,yard:ReturnType<typeof reset>):number {
  const x0=yard.o.position.x>>8,y0=yard.o.position.y>>8;
  for(let r=1;r<12;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    const x=x0+dx,y=y0+dy;if(x<1||y<1||x>60||y>60)continue;
    const p=packXY(x,y);if(structureIsValidBuildLocationFor(p,type,1)!==0)return p;
  }
  throw Error('No placement spot');
}

const yard=reset();
const credits=G.houses[1].credits;
for(const type of [STRUCTURE.SLAB_2x2,STRUCTURE.SLAB_2x2,STRUCTURE.SLAB_2x2,STRUCTURE.WINDTRAP,STRUCTURE.WINDTRAP])assert.ok(game.build(yard,type));
const reserved=3*structureInfo[STRUCTURE.SLAB_2x2].o.buildCredits+2*structureInfo[STRUCTURE.WINDTRAP].o.buildCredits;
assert.equal(G.houses[1].credits,credits-reserved);
until(()=>game.readyBuildings(yard).length===5,'five buildings should accumulate without placement');
assert.equal(yard.o.linkedID,0xff);
assert.equal(G.houses[1].credits,credits-reserved,'production charged twice');
assert.equal(game.readyBuildings(yard).filter(item=>item.type===STRUCTURE.SLAB_2x2).length,3,'singleton slabs overwrote each other');
assert.ok(game.placeIt(yard,true,STRUCTURE.WINDTRAP),'choose a later finished type');
const ghost=G.structureActive;
assert.equal(ghost?.o.type,STRUCTURE.WINDTRAP);
assert.ok(game.build(yard,STRUCTURE.SLAB_2x2));
until(()=>game.readyBuildings(yard).length===5,'production should continue during placement');
assert.equal(G.structureActive,ghost,'production replaced the placement ghost');
game.cancelPlace();
assert.equal(game.readyBuildings(yard).length,6,'cancel placement should restore the stored building');
assert.ok(game.placeIt(yard,true,STRUCTURE.SLAB_2x2));
const slabGhost=G.structureActive;
assert.ok(game.build(yard,STRUCTURE.SLAB_2x2));
until(()=>game.readyBuildings(yard).length===6,'second slab should complete while first slab is on cursor');
assert.equal(G.structureActive,slabGhost);
assert.equal(G.structureActive?.o.type,STRUCTURE.SLAB_2x2);
assert.ok(game.place(spot(STRUCTURE.SLAB_2x2,yard)));
const count=game.readyBuildings(yard).length;
game.execNet(1,{k:'place',s:yard.o.index,p:spot(STRUCTURE.WINDTRAP,yard),t:STRUCTURE.WINDTRAP});
assert.equal(game.readyBuildings(yard).length,count-1,'network placement should consume exactly one chosen type');
assert.ok(G.structureFind.some(s=>s.o.flags.used&&!s.o.flags.isNotOnMap&&s.o.type===STRUCTURE.WINDTRAP));
const beforeRefund=G.houses[1].credits;
assert.ok(game.cancelReadyBuilding(yard,STRUCTURE.WINDTRAP));
assert.equal(G.houses[1].credits,beforeRefund+structureInfo[STRUCTURE.WINDTRAP].o.buildCredits);
console.log('buildings: accumulated, selected out of order, placement cancellation, singleton slabs, parallel production, network placement, exact refund OK');
const sent:unknown[]=[];
const restore=installNetControls(game,command=>sent.push(command),()=>1);
game.execNet(1,{k:'cancel',s:yard.o.index});
game.execNet(1,{k:'stop',s:yard.o.index});
assert.equal(game.readyBuildings(yard).length,0);
assert.equal(sent.length,0,'executing refunds must not emit new network commands');
restore();
console.log('network cancellation: cancel/stop clears stored orders without re-sending commands OK');

const cy=reset();
G.houses[1].structuresBuilt=0x7ffff;G.houses[1].unitCountMax=100;
const factory=structureCreate(INDEX_INVALID,STRUCTURE.HEAVY_VEHICLE,1,INDEX_INVALID)!;
factory.o.position={...cy.o.position};factory.o.flags.isNotOnMap=false;factory.o.script.pc=-1;
factory.upgradeLevel=3;factory.state=STATE.IDLE;
// Reserve the transport link to model no carryall being available during the
// accumulation test; normal lift requests are tested separately below.
factory.o.script.variables[4]=0x4000;
const base=packTile(factory.o.position),blocked=new Map<number,boolean>();
for(const offset of layoutTilesAround[structureInfo[factory.o.type].layout]){
  if(!offset)continue;
  const p=base+offset;if(!G.map[p])continue;
  blocked.set(p,G.map[p].hasStructure);G.map[p].hasStructure=true;
}
for(let i=0;i<3;i++)assert.ok(game.build(factory,UNIT.TANK));
until(()=>game.readyUnits(factory).length===3,'blocked factory should continue manufacturing');
assert.equal(factory.o.linkedID,0xff);
const stored=[...game.readyUnits(factory)];assert.ok(stored.every(unit=>unit.o.flags.isNotOnMap));
for(const [p,hadStructure] of blocked)G.map[p].hasStructure=hadStructure;
until(()=>game.readyUnits(factory).length===0,'stored vehicles should deploy when exit opens');
assert.ok(stored.every(unit=>!unit.o.flags.isNotOnMap));
console.log('units: three tanks manufactured with blocked exit; all deploy after opening exit OK');

for(const [p] of blocked)G.map[p].hasStructure=true;
factory.o.script.variables[4]=0x4000;
assert.ok(game.build(factory,UNIT.TANK));assert.ok(game.build(factory,UNIT.TANK));
until(()=>game.readyUnits(factory).length===1&&factory.o.linkedID!==0xff,'next tank should build while completed tank waits');
const completed=game.readyUnits(factory)[0],inProgress=factory.o.linkedID;
factory.o.script.variables[4]=0;
assert.equal(structureDeployProducedUnit(factory,completed),0);
const carryall=G.unitFind.find(u=>u.o.type===UNIT.CARRYALL&&u.targetMove===indexEncode(factory.o.index,IT.STRUCTURE));
assert.ok(carryall,'blocked factory should request a carryall');
G.scriptCurrentObject=carryall.o;G.scriptCurrentUnit=carryall;
carryall.carryallFlight=undefined;
assert.equal(scriptFunctionsUnit[34](carryall.o.script),1,'carryall should pick up a completed tank even while factory is busy');
assert.equal(carryall.o.linkedID,completed.o.index);
assert.equal(factory.o.linkedID,inProgress,'pickup must leave unfinished production alone');
assert.equal(game.readyUnits(factory).length,0);
console.log('carryall: blocked factory requests transport; pickup consumes stored tank and preserves active production OK');
