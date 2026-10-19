import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NetSession } from '../src/net/session.ts';
import WebSocket from '../../server/node_modules/ws/wrapper.mjs';
import { startServer } from '../../server/dune-net.mjs';

const waitFor = async (condition: () => boolean) => {
  const end=Date.now()+4000;
  while(!condition()) { if(Date.now()>end)throw Error('network condition timed out');await new Promise(r=>setTimeout(r,5)); }
};

test('real sockets restore a partial turn and a reloaded client without replaying commands twice', async () => {
  const saved=['WebSocket','window','sessionStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  const storage=new Map<string,string>();
  Object.defineProperty(globalThis,'WebSocket',{configurable:true,value:WebSocket});
  Object.defineProperty(globalThis,'window',{configurable:true,value:globalThis});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)}});
  const server=await startServer({port:0,log:()=>{},turnMs:12});
  const sessions:NetSession[]=[];
  const create=()=>{
    const net=new NetSession();sessions.push(net);
    const state={starts:0,ticks:0,hash:7,commands:[] as number[],room:null as any};
    net.onStart=()=>{state.starts++;state.ticks=0;state.hash=7;state.commands=[];};
    net.onRoom=room=>{state.room=room;};
    net.bind((slot,c)=>{if(c.k==='build'){state.hash=Math.imul(state.hash^c.t^slot,16777619)>>>0;state.commands.push(c.t);}},()=>{state.hash=(Math.imul(state.hash,1664525)+1013904223)>>>0;state.ticks++;},()=>state.hash);
    return {net,state};
  };
  let clock:ReturnType<typeof setInterval>|undefined;
  try {
    const url=`ws://127.0.0.1:${server.port}/ws`,a=create(),b=create();
    await a.net.connect(url,'A');a.net.create('Reconnect','secret',{map:5,teamSize:1,credits:5000},'A');
    await waitFor(()=>!!a.state.room);
    // Separate tabs have separate session storage.
    storage.clear();await b.net.connect(url,'B');b.net.join(a.state.room.id,'secret','player','H');
    await waitFor(()=>a.state.room.members.length===2);a.net.startMatch();await waitFor(()=>a.net.inMatch&&b.net.inMatch);
    clock=setInterval(()=>{for(const {net} of [a,b])net.advance(17);},5);
    a.net.command({k:'build',s:1,t:10});await waitFor(()=>b.state.commands.includes(10));
    clearInterval(clock);
    // Keep a partially consumed turn to catch duplicate execution on recovery.
    await waitFor(()=>b.net.buffered>=6);
    if(b.net.frame%6===0)(b.net as any).runFrame(6);
    const frame=b.net.frame;
    (b.net as any).ws.terminate();
    await waitFor(()=>!b.net.connected);
    a.net.command({k:'build',s:1,t:11});
    await waitFor(()=>b.net.connected);
    await waitFor(()=>{b.net.advance(100);return !b.net.replaying;});
    assert.ok(b.net.frame>=frame);assert.equal(b.state.starts,1,'same match must keep its live engine');
    // The reconnect received the commands but playback still needs animation ticks.
    for(let i=0;i<100;i++){a.net.advance(100);b.net.advance(100);}
    assert.deepEqual(a.state.commands,b.state.commands);
    assert.equal(b.state.commands.filter(n=>n===10).length,1);
    assert.ok(b.state.commands.includes(11));
    // Simulate destroying the page after transport loss, preserving only tab storage.
    (b.net as any).ws.terminate();await waitFor(()=>!b.net.connected);(b.net as any).cancelRetry();
    const reload=create();await reload.net.restore(url);await waitFor(()=>reload.net.inMatch);
    const room=server.rooms.get(a.state.room.id);clearInterval(room.timer);
    for(let i=0;i<200;i++){a.net.advance(100);reload.net.advance(100);await new Promise(r=>setTimeout(r,1));}
    assert.equal(reload.state.starts,1);
    assert.equal(reload.net.frame,a.net.frame);
    assert.equal(reload.state.hash,a.state.hash,'reloaded engine must reach the identical state');
    assert.deepEqual(reload.state.commands,a.state.commands);
    assert.equal(reload.net.replaying,false);
    reload.net.leave();assert.equal(storage.size,0,'intentional exit must remove the saved capability');
  } finally {
    clearInterval(clock);for(const net of sessions)net.close();await server.close();
    for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
  }
});

test('chunked replay cannot advance until the last chunk has arrived',()=>{
  const net=new NetSession(),receive=(msg:object)=>(net as any).receive(msg);
  let ticks=0;const applied:number[]=[];
  net.bind((_slot,c)=>{if(c.k==='build')applied.push(c.t);},()=>ticks++,()=>0);
  receive({t:'start',catchup:true,matchId:'test',seed:1,you:null,players:[],config:{map:5,teamSize:1,credits:5000},framesPerTurn:6,turnMs:100});
  receive({t:'catchup',turn:12,final:false,log:[[0,[[0,{k:'build',s:1,t:1}]]]]});
  assert.equal(net.advance(1000),0);assert.equal(ticks,0);
  receive({t:'catchup',turn:12,final:true,log:[[8,[[0,{k:'build',s:1,t:2}]]]]});
  for(let i=0;i<20;i++)net.advance(100);
  assert.equal(ticks,72);assert.deepEqual(applied,[1,2]);assert.equal(net.replaying,false);
});
