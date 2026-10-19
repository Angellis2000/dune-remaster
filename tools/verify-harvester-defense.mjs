import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(root,'web/package.json'));
const file=path.join(root,'scratch/harvester-defense-test.mjs');
await require('esbuild').build({stdin:{contents:`export{Game}from'./src/engine/game.ts';export{DuneRom}from'./src/rom/dune.ts';export{G,ACTION,IT,UNIT,LST,EXPLOSION,INDEX_INVALID,indexEncode,packTile,tileCenter,unpackTile}from'./src/engine/core.ts';export{mapGetLandscapeType,mapIsValidPosition,mapMakeExplosion}from'./src/engine/map.ts';export{unitCreate,unitSetAction,unitSetDestination,unitRemove,unitHarvesterDefend}from'./src/engine/unit.ts';`,resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:file});
const {Game,DuneRom,G,ACTION,IT,UNIT,LST,EXPLOSION,INDEX_INVALID,indexEncode,packTile,tileCenter,unpackTile,mapGetLandscapeType,mapIsValidPosition,mapMakeExplosion,unitCreate,unitSetAction,unitSetDestination,unitRemove,unitHarvesterDefend}=await import(pathToFileURL(file));
const game=new Game(new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen')))));
function setup(foeType=UNIT.SOLDIER,allied=false){
  game.load('A',1);G.validateStrictIfZero++;
  let packed=0;
  for(let p=130;p<3960;p++){
    if(!mapIsValidPosition(p)||!mapIsValidPosition(p+1)||G.map[p].hasUnit||G.map[p].hasStructure||G.map[p+1].hasUnit||G.map[p+1].hasStructure)continue;
    if(![LST.SPICE,LST.THICK_SPICE].includes(mapGetLandscapeType(p)))continue;
    if([LST.WALL,LST.STRUCTURE,LST.ENTIRELY_MOUNTAIN,LST.PARTIAL_MOUNTAIN].includes(mapGetLandscapeType(p+1)))continue;
    packed=p;break;
  }
  assert.ok(packed);
  const harvester=unitCreate(INDEX_INVALID,UNIT.HARVESTER,G.playerHouseID,tileCenter(unpackTile(packed)),64);
  const foe=unitCreate(INDEX_INVALID,foeType,allied?G.playerHouseID:0,tileCenter(unpackTile(packed+1)),192);
  assert.ok(harvester);assert.ok(foe);foe.o.script.delay=10000;
  unitSetAction(harvester,ACTION.HARVEST);harvester.targetLast={...harvester.o.position};
  return{harvester,foe,packed};
}
{
  const{harvester:u,foe,packed}=setup();
  const amount=u.amount;
  mapMakeExplosion(EXPLOSION.IMPACT_SMALL,{...u.o.position},1,indexEncode(foe.o.index,IT.UNIT));
  assert.ok(u.harvesterDefense,'Player harvester must react through actual damage path');
  assert.equal(u.targetMove,indexEncode(foe.o.index,IT.UNIT));
  let crushed=false,resumed=false,mined=false;
  for(let i=0;i<2400;i++){
    game.tick();
    if(foe.actionID===ACTION.DIE||!foe.o.flags.used){crushed=true;}
    if(crushed&&!u.harvesterDefense&&u.actionID===ACTION.HARVEST)resumed=true;
    if(resumed&&u.amount>amount){mined=true;break;}
  }
  assert.ok(crushed,'Existing tracked collision must actually crush attacking infantry');
  assert.ok(resumed,'Must return to HARVEST automatically');assert.ok(mined,'Must resume actual spice accumulation');
  assert.ok(Math.abs((packTile(u.o.position)&63)-(packed&63))<5);
}
for(const [foeType,allied]of [[UNIT.TANK,false],[UNIT.SOLDIER,true]]){
  const{harvester:u,foe}=setup(foeType,allied);
  assert.equal(unitHarvesterDefend(u,foe),false,'Do not chase armor or allies');assert.equal(u.harvesterDefense,undefined);
}
{
  const{harvester:u,foe,packed}=setup();
  unitHarvesterDefend(u,foe);assert.ok(u.harvesterDefense);
  game.unitCommand(u,ACTION.STOP);assert.equal(u.harvesterDefense,undefined,'Explicit player stop cancels the response');
  for(let i=0;i<30;i++)game.tick();assert.equal(u.actionID,ACTION.STOP);
  unitSetAction(u,ACTION.MOVE);unitSetDestination(u,indexEncode(packed+64,IT.TILE));
  assert.equal(unitHarvesterDefend(u,foe),false,'Manual move must take priority over automatic defense');
}
{
  const{harvester:u,foe}=setup();unitHarvesterDefend(u,foe);unitRemove(foe);
  for(let i=0;i<40;i++)game.tick();assert.equal(u.harvesterDefense,undefined);assert.equal(u.actionID,ACTION.HARVEST);
}
{
  const{harvester:u,foe}=setup();unitHarvesterDefend(u,foe);u.harvesterDefense.expires=G.timerGame;
  for(let i=0;i<40;i++)game.tick();assert.equal(u.harvesterDefense,undefined);assert.equal(u.actionID,ACTION.HARVEST);
}
console.log('PASS: actual infantry damage triggers player harvester crush, tracked collision kills attacker and spice accumulation resumes; armor/allies ignored, manual orders win, vanished targets and timeout resume harvesting.');
