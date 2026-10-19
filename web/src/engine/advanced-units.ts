import {ACTION,EXPLOSION,G,IT,LST,MOVEMENT,STRUCTURE,indexEncode,indexGetStructure,indexGetTile,indexGetUnit,indexIsValid,packTile,tileCenter,tileGetDistance,unpackTile,type Tile32,type Unit,type Structure} from './core.ts';
import {unitInfo,layoutSize,structureInfo} from './tables.ts';
import {houseAreAllied} from './house.ts';
import {mapGetLandscapeType,mapMakeExplosion,tileRemoveFogInRadius,alertNearbyBaseDefenders} from './map.ts';
import {structureGetByPackedTile,structureDamage} from './structure.ts';
import {unitDamage,unitUpdateMap,unitSetAction,unitSetTarget,unitSetOrientation} from './unit.ts';
import {COMBAT_DRONE,LASER_TANK,DRONE_RADIUS,DRONE_RETURN_BATTERY} from './custom-unit-defs.ts';
import {COMBAT_SFX} from '../sound/combat-sfx.ts';

const distance=(a:Tile32,b:Tile32)=>Math.hypot(a.x-b.x,a.y-b.y);
const center=(s:Structure):Tile32=>{
  const size=layoutSize[structureInfo[s.o.type].layout];
  return{x:s.o.position.x+size.width*128,y:s.o.position.y+size.height*128};
};
export function droneHome(u:Unit):Structure|null{
  const d=u.drone;if(!d)return null;
  const s=indexGetStructure(d.home);
  return s?.o.flags.used&&s.o.hitpoints>0&&s.o.type===STRUCTURE.DRONE_PAD&&s.o.houseID===u.o.houseID&&distance(center(s),d.homePosition)<1?s:null;
}
export function initializeDrone(u:Unit,home?:Structure):void{
  if(u.o.type!==COMBAT_DRONE)return;
  const deployedFromPad=home?.o.type===STRUCTURE.DRONE_PAD;
  const base=(deployedFromPad?home:null)??G.structureFind.filter(s=>s.o.flags.used&&s.o.hitpoints>0&&s.o.type===STRUCTURE.DRONE_PAD&&s.o.houseID===u.o.houseID)
    .sort((a,b)=>distance(center(a),u.o.position)-distance(center(b),u.o.position))[0];
  const position=base?center(base):{...u.o.position};
  // A starport (or another factory) is only a launch point, never the drone's charging home.
  // Preserve that exit position so the squad visibly flies toward its nearest drone pad.
  if(deployedFromPad)u.o.position={x:position.x,y:position.y+64};
  u.drone={home:base?indexEncode(base.o.index,IT.STRUCTURE):0,homePosition:position,phase:base?'guard':'orphan',battery:100,nextFire:0,lastTick:G.timerGame,launchAfter:0,vx:0,vy:0,restockAt:0,
    members:[[-56,-56],[48,-56],[0,24]].map(([x,y])=>({x:u.o.position.x+x,y:u.o.position.y+y,vx:0,vy:0,grenades:5}))};
  u.targetAttack=0;u.targetMove=0;u.actionID=ACTION.GUARD;
}
export function clampDronePoint(u:Unit,p:Tile32):Tile32{
  const home=u.drone?.homePosition;if(!home)return{...p};
  const dx=p.x-home.x,dy=p.y-home.y,d=Math.hypot(dx,dy),r=DRONE_RADIUS-64;
  const k=d>r?r/d:1;
  const b=G.mapScale===0?{minX:1,minY:1,sizeX:62,sizeY:62}:G.mapScale===1?{minX:16,minY:16,sizeX:32,sizeY:32}:{minX:21,minY:21,sizeX:21,sizeY:21};
  return{x:Math.round(Math.max(b.minX*256+32,Math.min((b.minX+b.sizeX)*256-32,home.x+dx*k))),
    y:Math.round(Math.max(b.minY*256+32,Math.min((b.minY+b.sizeY)*256-32,home.y+dy*k)))};
}
function visibleEnemy(u:Unit,target:number):boolean{
  if(!indexIsValid(target))return false;
  const unit=indexGetUnit(target),s=indexGetStructure(target),o=unit?.o??s?.o;
  if(!o||!o.flags.used||o.flags.isNotOnMap||o.hitpoints<=0||houseAreAllied(u.o.houseID,o.houseID))return false;
  if(unit&&unitInfo[unit.o.type].movementType===MOVEMENT.WINGER)return false;
  if(s&&s.o.type===STRUCTURE.WALL)return false;
  return G.revealAll||(o.seenByHouses&(1<<u.o.houseID))!==0;
}
export function droneTargetAllowed(u:Unit,target:number):boolean{
  return !!u.drone&&visibleEnemy(u,target)&&distance(indexGetTile(target),u.drone.homePosition)<=DRONE_RADIUS;
}
function findDroneTarget(u:Unit):number{
  let best=0,bestScore=Infinity;
  for(const enemy of G.unitFind){
    const id=indexEncode(enemy.o.index,IT.UNIT);
    if(!droneTargetAllowed(u,id))continue;
    // Local protection favors nearby infantry/harvesters rather than remote base structures.
    const score=distance(u.o.position,enemy.o.position)*(unitInfo[enemy.o.type].movementType===MOVEMENT.FOOT?.75:1);
    if(score<bestScore){best=id;bestScore=score;}
  }
  return best;
}
function moveDrone(u:Unit,goal:Tile32,dt:number):boolean{
  const target=clampDronePoint(u,goal),dx=target.x-u.o.position.x,dy=target.y-u.o.position.y,d=Math.hypot(dx,dy);
  const state=u.drone!,speed=Math.min(18,Math.sqrt(d*1.1));
  const desiredX=d>1?dx/d*speed:0,desiredY=d>1?dy/d*speed:0;
  const ax=desiredX-state.vx,ay=desiredY-state.vy,change=Math.hypot(ax,ay),a=Math.min(1,.55*dt/Math.max(.001,change));
  state.vx+=ax*a;state.vy+=ay*a;
  if(d<8&&Math.hypot(state.vx,state.vy)<1){state.vx=state.vy=0;u.speed=0;return true;}
  const heading=(Math.atan2(state.vx,-state.vy)*128/Math.PI+256)%256;
  const delta=((heading-u.orientation[0].current+384)%256)-128;
  u.orientation[0].current=(u.orientation[0].current+Math.max(-7*dt,Math.min(7*dt,delta))+256)%256;
  u.orientation[1].current=u.orientation[0].current;u.speed=255;
  unitUpdateMap(0,u);
  u.o.position=clampDronePoint(u,{x:u.o.position.x+state.vx*dt,y:u.o.position.y+state.vy*dt});
  unitUpdateMap(1,u);tileRemoveFogInRadius(u.o.position,unitInfo[COMBAT_DRONE].o.fogUncoverRadius);
  return false;
}

function updateDroneMembers(u:Unit,dt:number):void{
  const d=u.drone!,parked=d.phase==='dock'||d.phase==='guard'&&Math.hypot(u.o.position.x-d.homePosition.x,u.o.position.y-d.homePosition.y-64)<24;
  const offsets=parked?[[-56,-56],[48,-56],[0,24]]:[[-40,-28],[40,-28],[0,40]],a=parked?0:u.orientation[0].current*Math.PI/128;
  for(let i=0;i<d.members.length;i++){
    const m=d.members[i],offset=offsets[i],goal=clampDronePoint(u,{x:u.o.position.x+offset[0]*Math.cos(a)-offset[1]*Math.sin(a),y:u.o.position.y+offset[0]*Math.sin(a)+offset[1]*Math.cos(a)});
    // Damped spring follows the formation; different damping prevents rigid synchronized turns.
    m.vx+=(goal.x-m.x)*.035*dt;m.vy+=(goal.y-m.y)*.035*dt;
    const damping=Math.pow(.74+i*.025,dt);m.vx*=damping;m.vy*=damping;
    const next=clampDronePoint(u,{x:m.x+m.vx*dt,y:m.y+m.vy*dt});m.x=next.x;m.y=next.y;
  }
}
export function tickDroneGrenades():void{
  const due=G.droneGrenades.filter(p=>p.impact<=G.timerGame);
  G.droneGrenades=G.droneGrenades.filter(p=>p.impact>G.timerGame);
  for(const p of due)mapMakeExplosion(EXPLOSION.IMPACT_SMALL,p.to,p.damage,p.origin,true);
}

/** One controllable wing represents three drones, with surviving members tied to hitpoints. */
export function tickDrone(u:Unit):boolean{
  if(u.o.type!==COMBAT_DRONE||u.actionID===ACTION.DIE||u.o.hitpoints<=0)return false;
  if(u.o.flags.isNotOnMap)return true; // Factory production remains hidden until normal deployment.
  if(!u.drone)initializeDrone(u);
  const d=u.drone!,dt=Math.min(6,Math.max(0,G.timerGame-d.lastTick));d.lastTick=G.timerGame;
  if(!dt)return true;
  try{
  const home=droneHome(u),powered=!!home&&G.houses[u.o.houseID].powerProduction>=G.houses[u.o.houseID].powerUsage;
  const homePos=clampDronePoint(u,{x:d.homePosition.x,y:d.homePosition.y+64});
  if(!home)d.phase='orphan';
  else if(d.phase!=='dock')d.battery=Math.max(0,d.battery-.025*dt);
  if(home&&d.battery<=0){unitDamage(u,u.o.hitpoints,0);return true;}
  const survivors=Math.max(1,Math.ceil(u.o.hitpoints/(unitInfo[COMBAT_DRONE].o.hitpoints/3)));
  if(home&&(d.battery<DRONE_RETURN_BATTERY||u.o.hitpoints<unitInfo[COMBAT_DRONE].o.hitpoints*.3||!powered||u.actionID===ACTION.RETURN||d.members.slice(0,survivors).every(m=>m.grenades===0)))d.phase='return';
  if(d.phase==='return'||d.phase==='dock'){
    u.targetAttack=0;u.targetMove=0;
    if(moveDrone(u,homePos,dt)){
      d.phase='dock';u.speed=0;
      if(powered){d.battery=Math.min(100,d.battery+.25*dt);u.o.hitpoints=Math.min(unitInfo[COMBAT_DRONE].o.hitpoints,u.o.hitpoints+.08*dt);}
      if(powered&&G.timerGame>=d.restockAt){for(const m of d.members)m.grenades=Math.min(5,m.grenades+1);d.restockAt=G.timerGame+30;}
      if(d.battery>=99&&u.o.hitpoints>=unitInfo[COMBAT_DRONE].o.hitpoints&&powered&&d.members.every(m=>m.grenades===5)){d.phase='guard';u.actionID=ACTION.GUARD;d.launchAfter=G.timerGame+60;}
    }
    return true;
  }
  if(G.timerGame<d.launchAfter)return true;
  if(u.actionID===ACTION.STOP){u.targetAttack=0;u.targetMove=0;moveDrone(u,{...u.o.position},dt);return true;}
  if(!droneTargetAllowed(u,u.targetAttack)){
    if(u.targetMove===u.targetAttack)u.targetMove=0;
    u.targetAttack=findDroneTarget(u);
  }
  if(u.targetAttack){
    const position=indexGetTile(u.targetAttack);
    d.phase=home?'attack':'orphan';
    if(distance(u.o.position,position)>unitInfo[COMBAT_DRONE].fireDistance*256*.8)moveDrone(u,position,dt);
    else{
      moveDrone(u,{...u.o.position},dt);
      if(G.timerGame>=d.nextFire){
        const candidates=d.members.slice(0,survivors),offset=Math.floor(G.timerGame/18)%survivors;
        const member=candidates.slice(offset).concat(candidates.slice(0,offset)).find(m=>m.grenades>0);
        if(member){
          member.grenades--;
          G.droneGrenades.push({from:{x:member.x,y:member.y},to:{...position},released:G.timerGame,impact:G.timerGame+42,damage:unitInfo[COMBAT_DRONE].damage,origin:indexEncode(u.o.index,IT.UNIT),house:u.o.houseID});
          d.battery=Math.max(0,d.battery-1.5);
        }
        d.nextFire=G.timerGame+18;
      }
    }
  }else{
    d.phase=home?'guard':'orphan';
    let goal=u.targetMove?indexGetTile(u.targetMove):homePos;
    if(u.patrolActive){
      goal=u.patrolToEnd?u.patrolEnd:u.patrolStart;
      if(distance(u.o.position,clampDronePoint(u,goal))<48)u.patrolToEnd=!u.patrolToEnd;
    }
    moveDrone(u,goal,dt);
  }
  return true;
  }finally{updateDroneMembers(u,dt);}
}

/** Finds the first structure or solid ridge on a direct shot, including intervening obstacles. */
export function laserImpact(u:Unit,target:number):{position:Tile32;blocked:boolean}{
  const from=u.o.position,to=indexGetTile(target),steps=Math.max(1,Math.ceil(distance(from,to)/48));
  const air=indexGetUnit(target);
  if(air&&unitInfo[air.o.type].movementType===MOVEMENT.WINGER)return{position:to,blocked:false};
  let last=-1;
  for(let i=1;i<=steps;i++){
    const p={x:Math.round(from.x+(to.x-from.x)*i/steps),y:Math.round(from.y+(to.y-from.y)*i/steps)},tile=packTile(p);
    if(tile===last)continue;last=tile;
    const s=structureGetByPackedTile(tile);
    if(s)return{position:tileCenter(unpackTile(tile)),blocked:houseAreAllied(u.o.houseID,s.o.houseID)};
    const kind=mapGetLandscapeType(tile);
    if(kind===LST.ENTIRELY_MOUNTAIN||kind===LST.PARTIAL_MOUNTAIN||kind===LST.WALL)return{position:tileCenter(unpackTile(tile)),blocked:true};
  }
  return{position:to,blocked:false};
}
export function tickLaser(u:Unit):void{
  if(u.o.type!==LASER_TANK)return;
  if(u.targetAttack&&indexIsValid(u.targetAttack)){
    const target=indexGetTile(u.targetAttack),a=Math.atan2(target.x-u.o.position.x,u.o.position.y-target.y)*128/Math.PI;
    unitSetOrientation(u,a,false,1);
  }
  if(!u.laser?.chargeUntil)return;
  const l=u.laser;
  if(u.actionID===ACTION.DIE||u.o.hitpoints<=0||u.targetAttack!==l.target||!indexIsValid(l.target)||u.speed!==0||
    tileGetDistance(u.o.position,indexGetTile(l.target))>unitInfo[LASER_TANK].fireDistance*256||laserImpact(u,l.target).blocked)l.chargeUntil=0;
}
export function fireLaser(u:Unit,target:number):number{
  const now=G.timerGame,hit=laserImpact(u,target);
  if(hit.blocked){if(u.laser)u.laser.chargeUntil=0;return 0;}
  const l=u.laser??={target,chargeStart:now,chargeUntil:0,cooldownUntil:0,firedAt:-10000,from:{...u.o.position},to:{...hit.position}};
  if(now<l.cooldownUntil)return 0;
  if(l.target!==target||l.chargeUntil===0){l.target=target;l.chargeStart=now;l.chargeUntil=now+48;return 0;}
  if(now<l.chargeUntil)return 0;
  const angle=u.orientation[1].current*Math.PI/128;
  l.from={x:u.o.position.x+Math.sin(angle)*136,y:u.o.position.y-32-Math.cos(angle)*136};
  const victim=indexGetUnit(target),air=!!victim&&unitInfo[victim.o.type].movementType===MOVEMENT.WINGER;
  l.to={x:hit.position.x,y:hit.position.y-(air?48:0)};l.firedAt=now;l.chargeUntil=0;l.cooldownUntil=now+180;
  const structure=air?null:structureGetByPackedTile(packTile(hit.position));
  if(structure){structureDamage(structure,Math.round(unitInfo[LASER_TANK].damage*.4),0);alertNearbyBaseDefenders(structure,indexEncode(u.o.index,IT.UNIT));}
  else if(victim){
    unitDamage(victim,laserDamageAgainst(victim.o.type),0);
    if(victim.o.hitpoints>0&&unitInfo[victim.o.type].o.actionsPlayer.includes(ACTION.ATTACK)&&victim.targetAttack===0){unitSetAction(victim,ACTION.ATTACK);unitSetTarget(victim,indexEncode(u.o.index,IT.UNIT));}
  }
  if(air)G.onVisualExplosion(EXPLOSION.IMPACT_SMALL,l.to);
  else mapMakeExplosion(EXPLOSION.IMPACT_MEDIUM,hit.position,0,indexEncode(u.o.index,IT.UNIT));
  G.onSound(COMBAT_SFX.LASER_FIRE,u.o.position);
  u.fireDelay=60;return 1;
}
export function laserDamageAgainst(type:number):number{
  const m=unitInfo[type].movementType;
  return Math.round(unitInfo[LASER_TANK].damage*(m===MOVEMENT.WINGER?1.4:m===MOVEMENT.WHEELED?1.25:m===MOVEMENT.TRACKED||m===MOVEMENT.HARVESTER?.45:1));
}
