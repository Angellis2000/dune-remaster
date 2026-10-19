// node --experimental-transform-types tools/sim/net_economy.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {G,INDEX_INVALID,STRUCTURE,UNIT} from '../../web/src/engine/core.ts';
import {structureCreate} from '../../web/src/engine/structure.ts';
import {unitCreate} from '../../web/src/engine/unit.ts';
import {scriptFunctionsStructure} from '../../web/src/engine/scriptfns.ts';

const rom=new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url))));
const game=new Game(rom);
game.loadNetwork({map:5,seed:1,credits:50000,local:1,players:[{slot:0,house:1,name:'A',team:0},{slot:1,house:0,name:'H',team:1}]});
G.net!.humans&=~1; // also cover storage for a non-human house in a network match
for(const h of G.houseFind){h.credits=100_000_000;h.creditsStorage=10;}
for(let i=0;i<2000;i++)game.tick();
for(const h of G.houseFind)assert.ok(h.credits>99_999_900,`house ${h.index}: balance was capped by storage`);
const refinery=structureCreate(INDEX_INVALID,STRUCTURE.REFINERY,1,INDEX_INVALID)!;
const harvester=unitCreate(INDEX_INVALID,UNIT.HARVESTER,1,{x:0xffff,y:0xffff},0)!;
refinery.o.linkedID=harvester.o.index;harvester.amount=100;
G.scriptCurrentObject=refinery.o;G.scriptCurrentStructure=refinery;
const refine=scriptFunctionsStructure.find(fn=>fn.name==='structureRefineSpice')!;
assert.ok(refine);
const before=G.houses[1].credits;
for(let i=0;i<100&&harvester.amount>0;i++)refine(refinery.o.script);
assert.equal(harvester.amount,0);
assert.equal(G.houses[1].credits,before+700,'refinery must keep depositing above the old limit');
game.load('A',1);G.houses[G.playerHouseID].credits=100_000_000;
for(let i=0;i<1000;i++)game.tick();
assert.ok(G.houses[G.playerHouseID].credits<100_000_000-100,'campaign storage limit must remain unchanged');
console.log('network economy: human/AI balances above 100M and refinery income persist; campaign cap preserved');
