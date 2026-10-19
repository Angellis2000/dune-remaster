import{readFileSync,writeFileSync}from'node:fs';
import{DuneRom}from'../../web/src/rom/dune.ts';
import{Game}from'../../web/src/engine/game.ts';
import{G,INDEX_INVALID,IT,indexEncode,packTile}from'../../web/src/engine/core.ts';
import{structureCreate,structureIsValidBuildLocation}from'../../web/src/engine/structure.ts';
import{unitCreateWrapper}from'../../web/src/engine/unit.ts';
const rom=new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url))));
const game=new Game(rom);game.load('A',1);
const yard=G.structureFind.find(s=>s.o.type===8&&s.o.houseID===G.playerHouseID)!;
const options:number[]=[];for(let p=0;p<4096;p++)if(structureIsValidBuildLocation(p,12)!==0)options.push(p);
options.sort((a,b)=>Math.abs((a&63)-(yard.o.position.x>>8))+Math.abs((a>>6)-(yard.o.position.y>>8))-Math.abs((b&63)-(yard.o.position.x>>8))-Math.abs((b>>6)-(yard.o.position.y>>8)));
const pos=options[0];if(pos===undefined)throw Error('No refinery location');
const refinery=structureCreate(INDEX_INVALID,12,G.playerHouseID,pos)!;
const harvester=unitCreateWrapper(G.playerHouseID,16,indexEncode(refinery.o.index,IT.STRUCTURE))!;
harvester.originEncoded=indexEncode(refinery.o.index,IT.STRUCTURE);
const timeline:unknown[]=[];let old='';
for(let i=0;i<12000;i++){
 game.tick();const state=[harvester.actionID,harvester.o.flags.isNotOnMap,harvester.amount,refinery.o.linkedID,harvester.targetMove];
 const text=JSON.stringify(state);if(text!==old){timeline.push({tick:G.timerGame,state,position:harvester.o.position,carryalls:G.unitFind.filter(u=>u.o.type===0).map(u=>({position:{...u.o.position},target:u.targetMove,link:u.o.linkedID}))});old=text;}
 if(!harvester.o.flags.used)break;
}
writeFileSync(new URL('../../../hd-vehicles/refinery-probe.json',import.meta.url),JSON.stringify({position:pos,timeline},null,2));
console.log(JSON.stringify({refinery:[pos&63,pos>>6],events:timeline.length,first:timeline.slice(0,4),last:timeline.slice(-3),final:{used:harvester.o.flags.used,position:packTile(harvester.o.position),action:harvester.actionID,amount:harvester.amount}}));
