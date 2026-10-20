import {G,IT,STRUCTURE,UNIT,indexEncode,type Structure} from './core.ts';
export const DRONES_PER_PAD=3;
/** Includes physical squads (even inside production/delivery) and paid queue reservations. */
export function padDroneLoad(pad:Structure,queued=true):number{
  const home=indexEncode(pad.o.index,IT.STRUCTURE),held=new Set([pad.o.linkedID,...(pad.readyUnits??[])]);
  const live=G.unitFind.filter(u=>u.o.flags.used&&u.o.hitpoints>0&&u.o.houseID===pad.o.houseID&&u.o.type===UNIT.COMBAT_DRONE&&
    (held.has(u.o.index)||u.drone?.home===home)).length;
  return live+(queued?(pad.unitQueue??[]).filter(i=>i.type===UNIT.COMBAT_DRONE).length:0);
}
export function houseHasDroneRoom(house:number):boolean{
  const pads=G.structureFind.filter(s=>s.o.flags.allocated&&!s.o.flags.isNotOnMap&&s.o.hitpoints>0&&s.o.houseID===house&&s.o.type===STRUCTURE.DRONE_PAD);
  const reserved=G.unitFind.filter(u=>u.o.flags.used&&u.o.hitpoints>0&&u.o.houseID===house&&u.o.type===UNIT.COMBAT_DRONE).length+
    pads.reduce((n,s)=>n+(s.unitQueue??[]).filter(i=>i.type===UNIT.COMBAT_DRONE).length,0);
  return reserved<pads.length*DRONES_PER_PAD;
}
