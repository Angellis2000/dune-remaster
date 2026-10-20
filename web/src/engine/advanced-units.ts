import {ACTION,EXPLOSION,G,IT,LST,MOVEMENT,STRUCTURE,indexEncode,indexGetStructure,indexGetTile,indexGetUnit,indexIsValid,packTile,tileCenter,tileGetDistance,tileIsValid,unpackTile,type Tile32,type Unit,type Structure} from './core.ts';
import {unitInfo,layoutSize,structureInfo} from './tables.ts';
import {houseAreAllied} from './house.ts';
import {mapGetLandscapeType,mapIsValidPosition,mapMakeExplosion,tileRemoveFogInRadius,alertNearbyBaseDefenders} from './map.ts';
import {structureGetByPackedTile,structureDamage} from './structure.ts';
import {unitDamage,unitGetHouseID,unitUpdateMap,unitSetAction,unitSetTarget,unitSetOrientation} from './unit.ts';
import {COMBAT_DRONE,LASER_TANK,DRONE_RADIUS,DRONE_RETURN_BATTERY} from './custom-unit-defs.ts';
import {DRONES_PER_PAD,padDroneLoad} from './drone-capacity.ts';
import {COMBAT_SFX} from '../sound/combat-sfx.ts';
import {tileGetDirection,tileMoveByDirection} from './core.ts';
import {fixed256,fixedLength,fixedSqrt,integerPower} from './lockstep-math.ts';

const length=(x:number,y:number)=>G.net?fixedLength(x,y):Math.hypot(x,y);
const distance=(a:Tile32,b:Tile32)=>length(a.x-b.x,a.y-b.y);
const velocity=(value:number)=>G.net?fixed256(value):value;
function sineCosine(orientation:number):{sin:number;cos:number}{
  if(!G.net){const a=orientation*Math.PI/128;return{sin:Math.sin(a),cos:Math.cos(a)};}
  const p=tileMoveByDirection({x:32768,y:32768},Math.round(orientation),128);
  return{sin:(p.x-32768)/127,cos:(32768-p.y)/127};
}
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
  const base=(deployedFromPad?home:null)??G.structureFind.filter(s=>s.o.flags.allocated&&!s.o.flags.isNotOnMap&&s.o.hitpoints>0&&s.o.type===STRUCTURE.DRONE_PAD&&s.o.houseID===u.o.houseID&&padDroneLoad(s)<DRONES_PER_PAD)
    .sort((a,b)=>distance(center(a),u.o.position)-distance(center(b),u.o.position))[0];
  const position=base?center(base):{...u.o.position};
  // A starport (or another factory) is only a launch point, never the drone's charging home.
  // Preserve that exit position so the squad visibly flies toward its nearest drone pad.
  if(deployedFromPad)u.o.position={x:position.x,y:position.y+64};
  u.drone={home:base?indexEncode(base.o.index,IT.STRUCTURE):0,homePosition:position,guardPosition:{...u.o.position},lastAction:ACTION.GUARD,phase:base?'guard':'orphan',battery:100,nextFire:0,lastTick:G.timerGame,launchAfter:0,vx:0,vy:0,restockAt:0,
    members:[[-56,-56],[48,-56],[0,24]].map(([x,y])=>({x:u.o.position.x+x,y:u.o.position.y+y,vx:0,vy:0,grenades:5}))};
  u.targetAttack=0;u.targetMove=0;u.actionID=ACTION.GUARD;
  if(deployedFromPad)u.drone.guardPosition=waitingSpot(position,1,u);
}
export function clampDronePoint(u:Unit,p:Tile32):Tile32{
  const home=u.drone?.homePosition;if(!home)return{...p};
  const dx=p.x-home.x,dy=p.y-home.y,d=length(dx,dy),r=DRONE_RADIUS-64;
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
  return !G.net&&G.revealAll||(o.seenByHouses&(1<<u.o.houseID))!==0;
}
export function droneTargetAllowed(u:Unit,target:number):boolean{
  return !!u.drone&&visibleEnemy(u,target)&&distance(indexGetTile(target),u.drone.homePosition)<=DRONE_RADIUS;
}
function findDroneTarget(u:Unit):number{
  let best=0,bestScore=Infinity;
  for(const enemy of G.unitFind){
    const id=indexEncode(enemy.o.index,IT.UNIT);
    if(!droneTargetAllowed(u,id))continue;
    const range=u.patrolActive?5*256:unitInfo[COMBAT_DRONE].fireDistance*256;
    if(distance(u.o.position,enemy.o.position)>range)continue;
    // Local protection favors nearby infantry/harvesters rather than remote base structures.
    const score=distance(u.o.position,enemy.o.position)*(unitInfo[enemy.o.type].movementType===MOVEMENT.FOOT?.75:1);
    if(score<bestScore){best=id;bestScore=score;}
  }
  return best;
}
function moveDrone(u:Unit,goal:Tile32,dt:number):boolean{
  const target=clampDronePoint(u,goal),dx=target.x-u.o.position.x,dy=target.y-u.o.position.y,d=length(dx,dy);
  const state=u.drone!,speed=Math.min(18,G.net?fixedSqrt(d*1.1):Math.sqrt(d*1.1));
  const desiredX=d>1?dx/d*speed:0,desiredY=d>1?dy/d*speed:0;
  const ax=desiredX-state.vx,ay=desiredY-state.vy,change=length(ax,ay),a=Math.min(1,.55*dt/Math.max(.001,change));
  state.vx=velocity(state.vx+ax*a);state.vy=velocity(state.vy+ay*a);
  if(d<8&&length(state.vx,state.vy)<1){state.vx=state.vy=0;u.speed=0;return true;}
  const heading=G.net?(tileGetDirection({x:0,y:0},{x:Math.round(state.vx*256),y:Math.round(state.vy*256)})&255):(Math.atan2(state.vx,-state.vy)*128/Math.PI+256)%256;
  const delta=((heading-u.orientation[0].current+384)%256)-128;
  u.orientation[0].current=(u.orientation[0].current+Math.max(-7*dt,Math.min(7*dt,delta))+256)%256;
  u.orientation[1].current=u.orientation[0].current;u.speed=255;
  unitUpdateMap(0,u);
  u.o.position=clampDronePoint(u,{x:u.o.position.x+state.vx*dt,y:u.o.position.y+state.vy*dt});
  unitUpdateMap(1,u);tileRemoveFogInRadius(u.o.position,unitInfo[COMBAT_DRONE].o.fogUncoverRadius,G.net?unitGetHouseID(u):G.playerHouseID);
  return false;
}

function updateDroneMembers(u:Unit,dt:number):void{
  const d=u.drone!,parked=d.phase==='dock'||!!d.landed||d.phase==='guard'&&length(u.o.position.x-d.homePosition.x,u.o.position.y-d.homePosition.y-64)<24;
  const offsets=parked?[[-56,-56],[48,-56],[0,24]]:[[-40,-28],[40,-28],[0,40]],a=sineCosine(parked?0:u.orientation[0].current);
  for(let i=0;i<d.members.length;i++){
    const m=d.members[i],offset=offsets[i],goal=clampDronePoint(u,{x:u.o.position.x+offset[0]*a.cos-offset[1]*a.sin,y:u.o.position.y+offset[0]*a.sin+offset[1]*a.cos});
    // Damped spring follows the formation; different damping prevents rigid synchronized turns.
    m.vx+=(goal.x-m.x)*.035*dt;m.vy+=(goal.y-m.y)*.035*dt;
    const damping=G.net?integerPower(.74+i*.025,dt):Math.pow(.74+i*.025,dt);m.vx=velocity(m.vx*damping);m.vy=velocity(m.vy*damping);
    const next=clampDronePoint(u,{x:m.x+m.vx*dt,y:m.y+m.vy*dt});m.x=next.x;m.y=next.y;
  }
}
export function tickDroneGrenades():void{
  const due=G.droneGrenades.filter(p=>p.impact<=G.timerGame);
  G.droneGrenades=G.droneGrenades.filter(p=>p.impact>G.timerGame);
  for(const p of due)mapMakeExplosion(EXPLOSION.IMPACT_SMALL,p.to,p.damage,p.origin,true);
}

/** Можно ли выпустить звено с площадки по приказу: заряда на вылет, гранаты есть, прочность не меньше 30%. */
export function droneCanLaunch(u:Unit):boolean{
  const d=u.drone;if(!d)return false;
  const survivors=Math.max(1,Math.ceil(u.o.hitpoints/(unitInfo[COMBAT_DRONE].o.hitpoints/3)));
  return d.battery>=DRONE_RETURN_BATTERY*2&&u.o.hitpoints>=unitInfo[COMBAT_DRONE].o.hitpoints*.3&&d.members.slice(0,survivors).some(m=>m.grenades>0);
}
/**
 * Место звена в очереди на площадку: 0 — садится (или уже стоит) на площадке. Порядок — звено на площадке,
 * затем по кадру начала возврата, затем по номеру; одинаков у всех клиентов сетевой игры.
 */
function dockRank(u:Unit):number{
  const home=u.drone!.home;
  const line=G.unitFind.filter(o=>o.o.type===COMBAT_DRONE&&o.o.flags.used&&o.o.hitpoints>0&&o.drone&&o.drone.home===home&&(o.drone.phase==='return'||o.drone.phase==='dock'))
    .sort((a,b)=>(a.drone!.phase==='dock'?0:1)-(b.drone!.phase==='dock'?0:1)||(a.drone!.queuedAt??0)-(b.drone!.queuedAt??0)||a.o.index-b.o.index);
  return Math.max(0,line.indexOf(u));
}
/** Места ожидания вокруг площадки (целые смещения — одинаково у всех клиентов). */
const WAITING=[[640,64],[-640,64],[0,-576],[0,704],[512,-448],[-512,-448],[512,576],[-512,576]];
function waitingSpot(pad:Tile32,rank:number,wing?:Unit):Tile32{
  // первое по порядку место без здания (садятся на землю, не на крыши); порядок одинаков у всех клиентов
  for(let k=0;k<WAITING.length*2;k++){
    const i=rank-1+k,[dx,dy]=WAITING[i%WAITING.length],ring=1+Math.floor(i/WAITING.length)*0.5;
    const p={x:pad.x+Math.round(dx*ring),y:pad.y+Math.round(dy*ring)},tile=packTile(p);
    const occupied=wing&&G.unitFind.some(o=>o!==wing&&o.o.flags.used&&!o.o.flags.isNotOnMap&&o.o.hitpoints>0&&
      (distance(o.o.position,p)<220||(o.drone?.home===wing.drone?.home&&o.drone?.guardPosition&&distance(o.drone.guardPosition,p)<220)));
    if(tileIsValid(p)&&mapIsValidPosition(tile)&&!occupied&&!structureGetByPackedTile(tile)&&mapGetLandscapeType(tile)!==LST.WALL)return p;
  }
  const [dx,dy]=WAITING[(rank-1)%WAITING.length];
  return{x:pad.x+dx,y:pad.y+dy};
}
/** Без дела 2 с на месте — звено садится на землю (любую) и не тратит заряд; взлетает при цели или приказе. */
function settleDrone(u:Unit,arrived:boolean):void{
  const d=u.drone!;
  if(!arrived){d.idleSince=undefined;d.landed=false;return;}
  d.idleSince??=G.timerGame;
  if(G.timerGame-d.idleSince>=120)d.landed=true;
}

/** One controllable wing represents three drones, with surviving members tied to hitpoints. */
export function tickDrone(u:Unit):boolean{
  if(u.o.type!==COMBAT_DRONE||u.actionID===ACTION.DIE||u.o.hitpoints<=0)return false;
  if(u.o.flags.isNotOnMap)return true; // Factory production remains hidden until normal deployment.
  if(!u.drone)initializeDrone(u);
  const d=u.drone!,dt=Math.min(6,Math.max(0,G.timerGame-d.lastTick));d.lastTick=G.timerGame;
  if(!dt)return true;
  if(d.lastAction!==u.actionID){
    if(u.actionID===ACTION.GUARD||u.actionID===ACTION.STOP)d.guardPosition={...u.o.position};
    d.lastAction=u.actionID;
  }
  try{
  const home=droneHome(u),powered=!!home&&G.houses[u.o.houseID].powerProduction>=G.houses[u.o.houseID].powerUsage;
  const homePos=clampDronePoint(u,{x:d.homePosition.x,y:d.homePosition.y+64});
  if(!home)d.phase='orphan';
  else if(d.phase!=='dock'&&!d.landed)d.battery=Math.max(0,d.battery-.025*dt);
  if(home&&d.battery<=0){unitDamage(u,u.o.hitpoints,0);return true;}
  const survivors=Math.max(1,Math.ceil(u.o.hitpoints/(unitInfo[COMBAT_DRONE].o.hitpoints/3)));
  if(home&&(d.battery<DRONE_RETURN_BATTERY||u.o.hitpoints<unitInfo[COMBAT_DRONE].o.hitpoints*.3||!powered||u.actionID===ACTION.RETURN||d.members.slice(0,survivors).every(m=>m.grenades===0))){
    if(d.phase!=='return'&&d.phase!=='dock'){d.queuedAt=G.timerGame;d.landed=false;}
    d.phase='return';
  }
  if(d.phase==='return'||d.phase==='dock'){
    u.targetAttack=0;u.targetMove=0;
    const rank=home?dockRank(u):0;
    if(rank>0&&d.phase!=='dock'){
      // площадка занята: ждать своей очереди на земле рядом, не тратя заряд
      const waiting=waitingSpot(d.homePosition,rank,u);d.guardPosition=waiting;
      d.landed=moveDrone(u,waiting,dt);
      return true;
    }
    d.landed=false;
    if(moveDrone(u,homePos,dt)){
      d.phase='dock';u.speed=0;
      if(powered){d.battery=Math.min(100,d.battery+.25*dt);u.o.hitpoints=Math.min(unitInfo[COMBAT_DRONE].o.hitpoints,u.o.hitpoints+.08*dt);}
      if(powered&&G.timerGame>=d.restockAt){for(const m of d.members)m.grenades=Math.min(5,m.grenades+1);d.restockAt=G.timerGame+30;}
      if(d.battery>=99&&u.o.hitpoints>=unitInfo[COMBAT_DRONE].o.hitpoints&&powered&&d.members.every(m=>m.grenades===5)){d.phase='guard';u.actionID=ACTION.GUARD;d.guardPosition=clampDronePoint(u,waitingSpot(d.homePosition,1+u.o.index%WAITING.length,u));d.launchAfter=G.timerGame+60;}
    }
    return true;
  }
  if(G.timerGame<d.launchAfter)return true;
  if(u.actionID===ACTION.STOP){u.targetAttack=0;u.targetMove=0;settleDrone(u,moveDrone(u,{...u.o.position},dt));return true;}
  if(u.actionID===ACTION.MOVE&&!u.patrolActive&&u.targetMove){
    u.targetAttack=0;d.landed=false;d.idleSince=undefined;
    if(moveDrone(u,indexGetTile(u.targetMove),dt)){d.guardPosition={...u.o.position};u.targetMove=0;u.currentDestination={x:0,y:0};u.actionID=ACTION.GUARD;}
    return true;
  }
  if(!droneTargetAllowed(u,u.targetAttack)){
    if(u.targetMove===u.targetAttack)u.targetMove=0;
    u.targetAttack=findDroneTarget(u);
    if(!u.targetAttack&&u.actionID===ACTION.ATTACK){d.guardPosition={...u.o.position};u.actionID=ACTION.GUARD;}
  }
  if(u.targetAttack){
    const position=indexGetTile(u.targetAttack);
    d.phase=home?'attack':'orphan';d.landed=false;d.idleSince=undefined;
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
    let goal=u.targetMove?indexGetTile(u.targetMove):(d.guardPosition??homePos);
    if(u.patrolActive){
      goal=u.patrolToEnd?u.patrolEnd:u.patrolStart;
      if(distance(u.o.position,clampDronePoint(u,goal))<48)u.patrolToEnd=!u.patrolToEnd;
    }
    const arrived=moveDrone(u,goal,dt);
    settleDrone(u,arrived&&!u.patrolActive);
  }
  return true;
  }finally{updateDroneMembers(u,dt);}
}

/** Finds the first structure or solid ridge on a direct shot, including intervening obstacles. */
export function laserImpact(u:Unit,target:number):{position:Tile32;blocked:boolean;wall?:number}{
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
    if(kind===LST.WALL)return{position:tileCenter(unpackTile(tile)),blocked:houseAreAllied(u.o.houseID,G.map[tile].houseID),wall:tile};
    if(kind===LST.ENTIRELY_MOUNTAIN||kind===LST.PARTIAL_MOUNTAIN)return{position:tileCenter(unpackTile(tile)),blocked:true};
  }
  return{position:to,blocked:false};
}
export function tickLaser(u:Unit):void{
  if(u.o.type!==LASER_TANK)return;
  if(u.targetAttack&&indexIsValid(u.targetAttack)){
    const target=indexGetTile(u.targetAttack),a=G.net?tileGetDirection(u.o.position,target):Math.atan2(target.x-u.o.position.x,u.o.position.y-target.y)*128/Math.PI;
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
  const angle=sineCosine(u.orientation[1].current);
  l.from={x:u.o.position.x+angle.sin*136,y:u.o.position.y-32-angle.cos*136};
  const victim=indexGetUnit(target),air=!!victim&&unitInfo[victim.o.type].movementType===MOVEMENT.WINGER;
  l.to={x:hit.position.x,y:hit.position.y-(air?48:0)};l.firedAt=now;l.chargeUntil=0;l.cooldownUntil=now+180;
  const structure=air?null:structureGetByPackedTile(packTile(hit.position));
  if(structure){structureDamage(structure,unitInfo[LASER_TANK].damage,0);alertNearbyBaseDefenders(structure,indexEncode(u.o.index,IT.UNIT));}
  else if(victim&&hit.wall===undefined){
    unitDamage(victim,laserDamageAgainst(victim.o.type),0);
    if(victim.o.hitpoints>0&&unitInfo[victim.o.type].o.actionsPlayer.includes(ACTION.ATTACK)&&victim.targetAttack===0){unitSetAction(victim,ACTION.ATTACK);unitSetTarget(victim,indexEncode(u.o.index,IT.UNIT));}
  }
  if(air)G.onVisualExplosion(EXPLOSION.IMPACT_SMALL,l.to);
  else mapMakeExplosion(EXPLOSION.IMPACT_MEDIUM,hit.position,hit.wall===undefined?0:unitInfo[LASER_TANK].damage,indexEncode(u.o.index,IT.UNIT));
  G.onSound(COMBAT_SFX.LASER_FIRE,u.o.position);
  u.fireDelay=60;return 1;
}
export function laserDamageAgainst(type:number):number{
  const m=unitInfo[type].movementType;
  return Math.round(unitInfo[LASER_TANK].damage*(m===MOVEMENT.WINGER?1.4:m===MOVEMENT.WHEELED?1.25:m===MOVEMENT.TRACKED||m===MOVEMENT.HARVESTER?.45:1));
}
