import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(root,'web/package.json'));
const file=path.join(root,'scratch/refinery-return-probe.mjs');await mkdir(path.dirname(file),{recursive:true});
await require('esbuild').build({stdin:{contents:`export{Game}from'./src/engine/game.ts';export{DuneRom}from'./src/rom/dune.ts';export{G,ACTION,IT,UNIT,STRUCTURE,STATE,INDEX_INVALID,indexEncode,packXY,packTile,tileCenter,unpackTile}from'./src/engine/core.ts';export{structureCreate,structureRemove}from'./src/engine/structure.ts';export{unitCreate,unitHide,unitSetAction,unitSetDestination}from'./src/engine/unit.ts';export{refineryExit,refineryDock}from'./src/engine/refinery-dock.ts';`,resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:file});
const {Game,DuneRom,G,ACTION,IT,UNIT,STRUCTURE,STATE,INDEX_INVALID,indexEncode,packXY,packTile,tileCenter,unpackTile,structureCreate,unitCreate,unitHide,unitSetAction,unitSetDestination,refineryExit}=await import(pathToFileURL(file));
const game=new Game(new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen')))));
const output=[];
for(const [blocked,withPlane] of [[false,true],[true,true],[false,false],[true,false]]){
  game.load('A',1);G.revealAll=true;G.scenario.winFlags=G.scenario.loseFlags=0;
  for(const u of [...G.unitFind])unitHide(u);
  for(const s of G.structureFind)if(s.o.houseID!==G.playerHouseID)s.o.script.delay=65000;
  for(const h of G.houseFind){h.flags.isAIActive=false;h.credits=10000;}
  G.validateStrictIfZero++;
  const s=structureCreate(INDEX_INVALID,STRUCTURE.REFINERY,G.playerHouseID,packXY(20,20));s.state=STATE.IDLE;
  if(blocked)structureCreate(INDEX_INVALID,STRUCTURE.WALL,G.playerHouseID,packTile(refineryExit(s.o.position)));
  const u=unitCreate(INDEX_INVALID,UNIT.HARVESTER,G.playerHouseID,tileCenter(unpackTile(packXY(24,25))),0);
  const plane=withPlane?unitCreate(INDEX_INVALID,UNIT.CARRYALL,G.playerHouseID,tileCenter(unpackTile(packXY(16,25))),0):null;if(plane)plane.o.flags.byScenario=true;
  G.validateStrictIfZero--;
  u.amount=100;game.order(u,ACTION.RETURN,packTile(s.o.position));
  const samples=[];let unloaded=false,carried=false;
  for(let i=0;i<18000;i++){
    game.tick();
    if(G.unitFind.some(p=>p.o.type===UNIT.CARRYALL&&p.o.linkedID===u.o.index))carried=true;
    if(i<300&&i%5===0||i%600===0)samples.push({i,amount:u.amount,position:packTile(u.o.position),action:u.actionID,target:u.targetMove,link:u.o.script.variables[4],pc:u.o.script.pc,delay:u.o.script.delay,refinery:{state:s.state,link:s.o.linkedID,v4:s.o.script.variables[4]},plane:plane?{pc:plane.o.script.pc,delay:plane.o.script.delay,orientation:{...plane.orientation[0]},destination:plane.currentDestination,pos:packTile(plane.o.position),target:plane.targetMove,link:plane.o.linkedID,used:plane.o.flags.used}:null});
    if(u.amount===0){unloaded=true;break;}
  }
  output.push({blocked,withPlane,unloaded,carried,samples});
}
await writeFile(path.join(root,'scratch/refinery-return-probe.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify(output.map(o=>({...o,samples:[o.samples[0],o.samples.at(-1)]})),null,2));





