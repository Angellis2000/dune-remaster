import assert from 'node:assert/strict';import{readFile,mkdir}from'node:fs/promises';import{createRequire}from'node:module';import path from'node:path';import{fileURLToPath,pathToFileURL}from'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(root,'web/package.json')),file=path.join(root,'scratch/unit-queue-test.mjs');await mkdir(path.dirname(file),{recursive:true});
await require('esbuild').build({stdin:{contents:`export{Game}from'./src/engine/game.ts';export{DuneRom}from'./src/rom/dune.ts';export{G,ACTION,UNIT,STRUCTURE,STATE,INDEX_INVALID,packXY,packTile,tileCenter,unpackTile}from'./src/engine/core.ts';export{structureCreate,structureRemove}from'./src/engine/structure.ts';export{unitHide,unitCreate}from'./src/engine/unit.ts';export{unitInfo}from'./src/engine/tables.ts';export{scriptFunctionsUnit}from'./src/engine/scriptfns.ts';export{mapChangeSpiceAmount,mapGetLandscapeType}from'./src/engine/map.ts';`,resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:file});
const{Game,DuneRom,G,UNIT,STRUCTURE,STATE,INDEX_INVALID,packXY,packTile,tileCenter,unpackTile,structureCreate,structureRemove,unitHide,unitCreate,unitInfo,scriptFunctionsUnit,mapChangeSpiceAmount,mapGetLandscapeType}=await import(pathToFileURL(file));
const game=new Game(new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen')))));
const setup=()=>{game.load('A',8);G.revealAll=true;G.scenario.winFlags=G.scenario.loseFlags=0;for(const u of [...G.unitFind])unitHide(u);for(const s of G.structureFind)s.o.script.delay=65000;for(const h of G.houseFind){h.flags.isAIActive=false;h.credits=10000;h.creditsStorage=50000;}G.validateStrictIfZero=1;const s=structureCreate(INDEX_INVALID,STRUCTURE.LIGHT_VEHICLE,G.playerHouseID,packXY(20,20));assert.ok(s);s.state=STATE.IDLE;s.o.hitpoints=s.hitpointsMax;G.validateStrictIfZero=0;G.houses[G.playerHouseID].credits=10000;return s;};
const s=setup(),h=G.houses[G.playerHouseID],options=game.buildOptions(s).filter(o=>o.available>0);assert.ok(options.length>=2);
const types=[options[0].type,options[0].type,options[1].type],prices=types.map(t=>unitInfo[t].o.buildCredits),initial=h.credits;
for(const type of types)assert.ok(game.build(s,type));assert.equal(h.credits,initial-prices.reduce((a,b)=>a+b));assert.deepEqual(game.unitQueue(s).map(o=>o.type),types.slice(1));
for(let i=0;i<25;i++)game.tick();assert.equal(h.credits,initial-prices.reduce((a,b)=>a+b),'Prepaid orders must not be charged by build ticks');
// Factory assertions exclude the independent periodic base power-maintenance charge.
G.tickHousePowerMaintenance=G.timerGame+100000;const births=[],seen=new Set();
for(let tick=0;tick<25000&&births.length<3;tick++){
 if(s.o.linkedID!==0xff&&s.countDown>0)s.countDown=1;
 game.tick();
 for(const u of G.unitFind)if(u.o.houseID===G.playerHouseID&&!u.o.flags.isNotOnMap&&!seen.has(u.o.index)){seen.add(u.o.index);births.push(u.o.type);game.order(u,1,packXY(32+births.length*2,30));}
}
assert.deepEqual(births,types,'Mixed types must leave the actual ROM factory in FIFO order');assert.equal(game.unitQueue(s).length,0);assert.equal(h.credits,initial-prices.reduce((a,b)=>a+b));
// Paused production preserves reservations; cancel waiting and current orders separately.
for(let i=0;i<2;i++)game.tick();assert.ok(game.build(s,types[0]));assert.ok(game.build(s,types[2]));const before=h.credits;game.holdOrResume(s);const countdown=s.countDown;for(let i=0;i<30;i++)game.tick();assert.equal(s.countDown,countdown);assert.equal(h.credits,before);
assert.ok(game.cancelQueuedUnit(s,0));assert.equal(h.credits,before+prices[2]);assert.equal(game.cancelQueuedUnit(s,0),false);game.cancelBuild(s);assert.equal(h.credits,initial-prices.reduce((a,b)=>a+b));
const credits=h.credits;assert.ok(game.build(s,types[0]));assert.ok(game.build(s,types[2]));game.stopAll(s);assert.equal(h.credits,credits);assert.equal(game.unitQueue(s).length,0);assert.equal(s.o.linkedID,0xff);
h.credits=0;assert.equal(game.build(s,types[0]),false);assert.equal(game.unitQueue(s).length,0);h.credits=10000;
assert.ok(game.build(s,types[0]));assert.ok(game.build(s,types[2]));const activeCost=prices[0];structureRemove(s);assert.equal(h.credits,10000-activeCost,'Destruction refunds waiting orders only');
G.validateStrictIfZero=1;const reused=structureCreate(INDEX_INVALID,STRUCTURE.LIGHT_VEHICLE,G.playerHouseID,packXY(20,20));assert.ok(reused);assert.equal(game.unitQueue(reused).length,0);assert.equal(reused.prepaidUnitCost,undefined);
// Use the actual harvest EMC function; an inexhaustible field retains its terrain and fills cargo.
const harvest=scriptFunctionsUnit.find(fn=>fn.name==='unitHarvest');assert.ok(harvest);const packed=packXY(35,35),u=unitCreate(INDEX_INVALID,UNIT.HARVESTER,G.playerHouseID,tileCenter(unpackTile(packed)),0);assert.ok(u);
for(let i=0;i<4096;i++)if(mapGetLandscapeType(i)===0){u.o.position=tileCenter(unpackTile(i));break;}
const field=packTile(u.o.position);mapChangeSpiceAmount(field,1);mapChangeSpiceAmount(field,1);const terrain=mapGetLandscapeType(field);G.scriptCurrentObject=u.o;G.scriptCurrentUnit=u;G.infiniteSpice=true;
for(let i=0;i<1200;i++){if(u.amount>=99)u.amount=0;harvest(u.o.script);}assert.equal(mapGetLandscapeType(field),terrain);assert.ok(u.amount>0);
G.infiniteSpice=false;for(let i=0;i<2000&&mapGetLandscapeType(field)===terrain;i++){u.amount=0;harvest(u.o.script);}assert.notEqual(mapGetLandscapeType(field),terrain,'Campaign fields still deplete');
G.infiniteSpice=true;game.load('A',1);assert.equal(G.infiniteSpice,false);assert.equal(game.unitQueue(reused).length,0);
// Population-limit waits retain payment and do not spam errors or discard accepted orders.
const limited=setup(),owner=G.houses[G.playerHouseID],kind=game.buildOptions(limited).find(o=>o.available>0).type,limit=owner.unitCountMax;owner.unitCountMax=owner.unitCount;owner.credits=10000;const messages=[];G.onMessage=message=>messages.push(message);
for(let i=0;i<20;i++)assert.ok(game.build(limited,kind));const reserved=owner.credits;assert.equal(game.build(limited,kind),false);assert.equal(owner.credits,reserved);assert.equal(game.unitQueue(limited).length,20);for(let i=0;i<30;i++)game.tick();assert.equal(game.unitQueue(limited).length,20);assert.ok(messages.length<=1,'Waiting must not flood game messages');owner.unitCountMax=limit;for(let i=0;i<10;i++)game.tick();assert.ok(limited.o.linkedID!==0xff);assert.equal(game.unitQueue(limited).length,19);game.stopAll(limited);assert.equal(owner.credits,10000);
console.log('PASS: prepaid FIFO production, no double charges, pause, cancellation/refunds, insufficient funds, destruction/pool reset and inexhaustible harvest rule; campaign depletion retained.');
