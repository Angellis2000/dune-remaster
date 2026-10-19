// node --experimental-transform-types tools/sim/net_replay.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game,type NetCommand} from '../../web/src/engine/game.ts';
import {G,STRUCTURE} from '../../web/src/engine/core.ts';
import {NetSession,type MatchStart} from '../../web/src/net/session.ts';

const rom=new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url))));
const start:MatchStart={matchId:'replay-test',seed:0x5eed1234,you:0,config:{map:5,credits:50000,teamSize:1},players:[{slot:0,house:1,name:'A',team:0},{slot:1,house:0,name:'H',team:1}],framesPerTurn:6,turnMs:100};
const journal:[number,[number,NetCommand][]][]=[];
const client=()=>{
  const net=new NetSession(),game=new Game(rom);
  net.onStart=()=>game.loadNetwork({map:5,seed:start.seed,credits:50000,local:1,players:start.players});
  net.bind((slot,c)=>game.execNet(start.players[slot].house,c),()=>game.tick(),()=>game.netHash());
  const receive=(msg:object)=>(net as any).receive(msg);
  receive({t:'start',...start});
  return {net,game,receive};
};
const reference=client();
const yards=start.players.map(p=>G.structureFind.find(s=>s.o.houseID===p.house&&s.o.type===STRUCTURE.CONSTRUCTION_YARD)!.o.index);
for(let turn=0;turn<1600;turn++){
  const commands:[number,NetCommand][]=[];
  if([2,10,75,140,210].includes(turn))for(const slot of [0,1])commands.push([slot,{k:'build',s:yards[slot],t:STRUCTURE.WINDTRAP}]);
  if(turn===250)commands.push([0,{k:'cancelB',s:yards[0],t:STRUCTURE.WINDTRAP}]);
  if(commands.length)journal.push([turn,commands]);
  reference.receive({t:'turn',n:turn,c:commands});
  while(reference.net.buffered>0)reference.net.advance(100);
}
const expected=reference.game.netHash();
assert.ok(G.structureFind.some(s=>(s.readyBuildings?.length??0)>1),'fixture must contain accumulated finished production');

// Reload: rebuild the real engine from a chunked complete journal.
const reload=client();reload.receive({t:'start',...start,catchup:true});
reload.receive({t:'catchup',turn:1600,log:journal.slice(0,5),final:false});
assert.equal(reload.net.advance(100),0);
reload.receive({t:'catchup',turn:1600,log:journal.slice(5),final:true});
while(reload.net.buffered>0)reload.net.advance(100);
assert.equal(reload.game.netHash(),expected,'reloaded real game differs from uninterrupted game');

// Socket loss halfway through a command-bearing turn: retain the engine and replay only future turns.
const partial=client();
partial.receive({t:'catchup',turn:76,log:journal.filter(([n])=>n<76),final:true});
while(partial.net.frame<450)(partial.net as any).runFrame(6);
(partial.net as any).runFrame(6);assert.equal(partial.net.frame,451);
partial.receive({t:'start',...start,catchup:true});
assert.equal(partial.net.frame,451);
partial.receive({t:'catchup',turn:1600,log:journal.filter(([n])=>n>=76),final:true});
while(partial.net.buffered>0)partial.net.advance(100);
assert.equal(partial.game.netHash(),expected,'partial-turn reconnect replayed or lost an order');
console.log(`real engine replay: 9600 frames, ${journal.length} command turns, stored production preserved, reload and partial-turn recovery match ${expected.toString(16)}`);
