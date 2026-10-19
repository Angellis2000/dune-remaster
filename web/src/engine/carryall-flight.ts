import {G,UNIT,STRUCTURE,indexGetTile,indexGetStructure,tileGetDistance,type Unit} from './core.ts';
import {refineryDock} from './refinery-dock.ts';

export function carryallDestination(encoded:number){
  const s=indexGetStructure(encoded);
  return s?.o.type===STRUCTURE.REFINERY?refineryDock(s.o.position):indexGetTile(encoded);
}

/** Cosmetic altitude and service dwell use the same paused mission clock as EMC. */
export function tickCarryallFlight(u:Unit):void{
  if(u.o.type!==UNIT.CARRYALL)return;
  const f=u.carryallFlight??= {height:12,serviceKey:'',serviceSince:-1,lastTick:G.timerGame};
  const dt=Math.min(6,Math.max(0,G.timerGame-f.lastTick));f.lastTick=G.timerGame;
  const key=`${u.targetMove}:${u.o.linkedID}`;
  if(f.serviceKey!==key){f.serviceKey=key;f.serviceSince=-1;f.settling=false;}
  const distance=u.targetMove?tileGetDistance(u.o.position,carryallDestination(u.targetMove)):4096;
  const desired=f.settling?0:12*Math.min(1,Math.max(0,(distance-64)/512));
  f.height+=Math.max(-.14*dt,Math.min(.12*dt,(desired-f.height)*.065*dt));
}

export function carryallMovementScale(u:Unit):number{
  if(u.o.type!==UNIT.CARRYALL)return 1;
  const distance=u.targetMove?tileGetDistance(u.o.position,carryallDestination(u.targetMove)):4096;
  return .6*(.4+.6*Math.min(1,distance/768));
}

/** Manual script primitives remain immediate; a live flight settles before loading. */
export function carryallReadyForService(u:Unit):boolean{
  const f=u.carryallFlight;if(!f)return true;
  f.settling=true;
  if(f.height>.35){f.serviceSince=-1;return false;}
  if(f.serviceSince<0)f.serviceSince=G.timerGame;
  return G.timerGame-f.serviceSince>=30;
}
