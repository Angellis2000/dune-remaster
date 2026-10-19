import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(root,'web/package.json'));
await mkdir(path.join(root,'scratch'),{recursive:true});
const file=path.join(root,'scratch/blocked-exits-test.mjs');
await require('esbuild').build({stdin:{contents:`export{Game}from'./src/engine/game.ts';export{DuneRom}from'./src/rom/dune.ts';export{G,IT,UNIT,STRUCTURE,STATE,INDEX_INVALID,indexEncode,indexGetUnit,packXY,packTile,tileCenter,unpackTile}from'./src/engine/core.ts';export{structureCreate,structureFindFreePosition}from'./src/engine/structure.ts';export{unitCreate,unitSetPosition}from'./src/engine/unit.ts';export{scriptFunctionsStructure,scriptFunctionsUnit}from'./src/engine/scriptfns.ts';export{layoutSize,structureInfo}from'./src/engine/tables.ts';export{refineryExit}from'./src/engine/refinery-dock.ts';`,resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:file});
const {Game,DuneRom,G,IT,UNIT,STRUCTURE,STATE,INDEX_INVALID,indexEncode,indexGetUnit,packXY,packTile,tileCenter,unpackTile,structureCreate,structureFindFreePosition,unitCreate,unitSetPosition,scriptFunctionsStructure:S,scriptFunctionsUnit:U,layoutSize,structureInfo,refineryExit}=await import(pathToFileURL(file));
const game=new Game(new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen')))));
function setup(type,unitType){
  game.load('A',1);G.validateStrictIfZero++;
  const s=structureCreate(INDEX_INVALID,type,G.playerHouseID,packXY(20,20));assert.ok(s);
  const u=unitCreate(INDEX_INVALID,unitType,G.playerHouseID,{x:65535,y:65535},0);assert.ok(u);
  s.o.linkedID=u.o.index;s.state=STATE.READY;u.targetLast={x:0,y:0};
  G.scriptCurrentStructure=s;G.scriptCurrentObject=s.o;
  s.o.script.stackPointer=10;s.o.script.stack[10]=UNIT.CARRYALL;
  return{s,u};
}
function request(s){G.scriptCurrentStructure=s;G.scriptCurrentObject=s.o;return indexGetUnit(S[3](s.o.script));}
function block(p){assert.ok(structureCreate(INDEX_INVALID,STRUCTURE.WALL,G.playerHouseID,p));}
function pickup(s,u,plane){
  assert.equal(plane.targetMove,indexEncode(s.o.index,IT.STRUCTURE));
  G.scriptCurrentUnit=plane;G.scriptCurrentObject=plane.o;
  assert.equal(U[34](plane.o.script),1);assert.equal(plane.o.linkedID,u.o.index);
  assert.equal(s.o.linkedID,255);assert.equal(s.state,STATE.IDLE);
  assert.equal(u.o.flags.isNotOnMap,true);
}

// Regression: one actual pad exit is blocked, but the other sides remain open.
{
  const{s,u}=setup(STRUCTURE.REFINERY,UNIT.HARVESTER),exit=packTile(refineryExit(s.o.position));
  block(exit);assert.notEqual(structureFindFreePosition(s,false),0,'Other sides must remain free in this regression');
  assert.equal(S[7](s.o.script),0,'Harvester must not teleport through another building wall');
  const plane=request(s);assert.ok(plane,'Blocked pad must summon a carryall even with other free perimeter cells');
  pickup(s,u,plane);
  assert.equal(plane.o.flags.inTransport,true);
}
// Open pad does not summon an unnecessary aircraft for a new player harvester.
{
  const{s,u}=setup(STRUCTURE.REFINERY,UNIT.HARVESTER),exit=packTile(refineryExit(s.o.position));
  assert.equal(request(s),null);
  assert.equal(S[7](s.o.script),1);assert.equal(packTile(u.o.position),exit);assert.equal(u.o.flags.isNotOnMap,false);
}
// Factories and repair retain the original carryall fallback when completely enclosed.
for(const type of [STRUCTURE.LIGHT_VEHICLE,STRUCTURE.HEAVY_VEHICLE,STRUCTURE.REPAIR]){
  const{s,u}=setup(type,UNIT.TANK),size=layoutSize[structureInfo[type].layout];
  for(let y=-1;y<=size.height;y++)for(let x=-1;x<=size.width;x++)
    if(x===-1||y===-1||x===size.width||y===size.height)block(packXY(20+x,20+y));
  assert.equal(structureFindFreePosition(s,false),0);assert.equal(S[7](s.o.script),0);
  const target=tileCenter(unpackTile(packXY(28,28)));
  u.targetLast={...target};const plane=request(s);assert.ok(plane);pickup(s,u,plane);
  assert.equal(plane.targetMove,indexEncode(packTile(target),IT.TILE),'Return repaired unit to its recorded battlefield position');
  assert.ok(unitSetPosition(plane,target));G.scriptCurrentUnit=plane;G.scriptCurrentObject=plane.o;
  assert.equal(U[20](plane.o.script),1,'Drop at a free battlefield tile');
  assert.equal(u.o.flags.isNotOnMap,false);assert.equal(packTile(u.o.position),packTile(target));assert.equal(plane.o.linkedID,255);
}
// Run the real ROM EMC flight, rather than just calling pickup/delivery primitives.
for(const type of [STRUCTURE.REFINERY,STRUCTURE.REPAIR]){
  const{s,u}=setup(type,type===STRUCTURE.REFINERY?UNIT.HARVESTER:UNIT.TANK);
  if(type===STRUCTURE.REFINERY)block(packTile(refineryExit(s.o.position)));
  else{
    const size=layoutSize[structureInfo[type].layout];
    for(let y=-1;y<=size.height;y++)for(let x=-1;x<=size.width;x++)
      if(x===-1||y===-1||x===size.width||y===size.height)block(packXY(20+x,20+y));
    u.targetLast=tileCenter(unpackTile(packXY(28,28)));
  }
  const plane=request(s);assert.ok(plane);let picked=false,delivered=false;
  for(let i=0;i<12000;i++){
    game.tick();if(plane.o.linkedID===u.o.index)picked=true;
    if(picked&&!u.o.flags.isNotOnMap&&plane.o.linkedID!==u.o.index){delivered=true;break;}
  }
  assert.ok(picked,'Original EMC must actually fly in and collect the blocked unit, structure '+type);
  if(!delivered)console.log(JSON.stringify({plane:{p:plane.o.position,target:plane.targetMove,pc:plane.o.script.pc,delay:plane.o.script.delay,flight:plane.carryallFlight},unit:{p:u.o.position,hidden:u.o.flags.isNotOnMap,link:u.o.linkedID}}));assert.ok(delivered,'Original EMC must actually deliver it to a free tile, structure '+type);
}
console.log('PASS: blocked refinery pad/open pad; enclosed factories and repair; original pickup/return/drop primitives; full ROM EMC carryall flights collect and deliver blocked refinery/repair units.');

