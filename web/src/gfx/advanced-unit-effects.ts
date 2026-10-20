import {G,STRUCTURE,UNIT} from '../engine/core.ts';
import {unitInfo} from '../engine/tables.ts';
import type {Unit,Structure} from '../game/world.ts';
import {COMBAT_DRONE,DRONE_RADIUS,DRONE_RETURN_BATTERY} from '../engine/custom-unit-defs.ts';

export function drawAdvancedWeapons(ctx:CanvasRenderingContext2D,units:Unit[],tick:number,isVisible:(x:number,y:number)=>boolean):void{
  ctx.save();ctx.lineCap='round';
  for(const u of units){
    const l=u.ref.laser;if(!l||tick-l.firedAt<0||tick-l.firedAt>11)continue;
    const a={x:l.from.x/8,y:l.from.y/8},b={x:l.to.x/8,y:l.to.y/8};
    if(!isVisible(a.x,a.y)&&!isVisible(b.x,b.y))continue;
    const f=1-(tick-l.firedAt)/12;
    ctx.globalCompositeOperation='screen';ctx.shadowColor='#55bfff';ctx.shadowBlur=4;
    ctx.strokeStyle=`rgba(76,192,255,${f*.55})`;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle=`rgba(232,255,255,${f})`;ctx.lineWidth=.5;ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;
  for(const p of G.droneGrenades){
    const f=Math.max(0,Math.min(1,(tick-p.released)/(p.impact-p.released)));
    const x=(p.from.x+(p.to.x-p.from.x)*f)/8,y=(p.from.y+(p.to.y-p.from.y)*f)/8;
    if(!isVisible(x,y))continue;
    const height=(1-f)*5+Math.sin(f*Math.PI)*7;
    ctx.fillStyle=`rgba(0,0,0,${.12+.12*f})`;ctx.beginPath();ctx.ellipse(x+1,y+1,.7,.35,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(x,y-height);ctx.rotate(f*9);ctx.fillStyle='#42482b';ctx.strokeStyle='#e4ce85';ctx.lineWidth=.15;
    ctx.beginPath();ctx.ellipse(0,0,.52,.8,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#b8a15f';ctx.fillRect(-.23,-1,.46,.3);ctx.restore();
  }
  ctx.restore();
}
export function drawDroneRadius(ctx:CanvasRenderingContext2D,selected:Structure|null,units:Set<Unit>,z:number,ox:number,oy:number):void{
  const bases:{x:number;y:number}[]=[];
  if(selected?.type===STRUCTURE.DRONE_PAD)bases.push({x:(selected.x+selected.w/2)*32,y:(selected.y+selected.h/2)*32});
  for(const unit of units)if(unit.ref.drone){const p=unit.ref.drone.homePosition;if(!bases.some(b=>Math.abs(b.x-p.x/8)<1&&Math.abs(b.y-p.y/8)<1))bases.push({x:p.x/8,y:p.y/8});}
  ctx.save();ctx.strokeStyle='#78dbf3a8';ctx.lineWidth=Math.max(1,z*.25);ctx.setLineDash([5*z,3*z]);
  for(const p of bases){ctx.beginPath();ctx.arc(p.x*z-ox,p.y*z-oy,DRONE_RADIUS/8*z,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}

/**
 * Заряд и гранаты своих звеньев дронов (только чтение): полоска под звеном, засечка — порог возврата на площадку
 * (DRONE_RETURN_BATTERY), ниже неё звено улетает заряжаться; точки — гранаты живых дронов (по 5 на дрон).
 * Голубая рамка — звено летит на площадку или стоит на ней.
 */
export function drawDroneStatus(ctx:CanvasRenderingContext2D,units:Iterable<Unit>,house:number,z:number,ox:number,oy:number):void{
  ctx.save();
  for(const u of units){
    const d=u.ref.drone;if(!d||u.house!==house||!u.ref.o.flags.used||u.ref.o.flags.isNotOnMap)continue;
    const survivors=Math.max(1,Math.ceil(u.ref.o.hitpoints/(unitInfo[COMBAT_DRONE].o.hitpoints/3)));
    const live=d.members.slice(0,survivors),grenades=live.reduce((n,m)=>n+m.grenades,0);
    const w=Math.round(26*z),h=Math.max(3,Math.round(3*z)),x=Math.round(u.x*z-ox-w/2),y=Math.round((u.y+13)*z-oy);
    const b=Math.max(0,Math.min(100,d.battery)),low=b<DRONE_RETURN_BATTERY*2;
    const going=d.phase==='return'||d.phase==='dock';
    ctx.fillStyle='#000000b0';ctx.fillRect(x-1,y-1,w+2,h+2);
    ctx.fillStyle=b<DRONE_RETURN_BATTERY?'#e2412d':low?'#e8a92a':'#58d64a';
    if(going&&d.phase==='dock'&&G.timerGame%40<20)ctx.fillStyle='#7fdcff';
    ctx.fillRect(x,y,Math.round(w*b/100),h);
    ctx.fillStyle='#ffffffc0';ctx.fillRect(x+Math.round(w*DRONE_RETURN_BATTERY/100),y-1,Math.max(1,Math.round(z*.5)),h+2);
    if(going){ctx.strokeStyle='#7fdcff';ctx.lineWidth=Math.max(1,z*.4);ctx.strokeRect(x-1.5,y-1.5,w+3,h+3);}
    // гранаты: точки по дронам, пустые — тусклые
    const r=Math.max(1.2,z*.75),gap=r*2.25;let px=x+r;
    for(const m of live){for(let i=0;i<5;i++){ctx.fillStyle=i<m.grenades?'#f0d070':'#5a5030a0';ctx.beginPath();ctx.arc(px,y+h+r*2,r,0,Math.PI*2);ctx.fill();px+=gap;}px+=gap*.45;}
    if(!grenades){ctx.fillStyle='#e2412d';ctx.font=`bold ${Math.max(7,Math.round(4.5*z))}px sans-serif`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('0',px,y+h+r*2);}
  }
  ctx.restore();
}

/** Same compact dark-backed indicators as the drone display, for selected units. */
export function drawSelectedUnitStatus(ctx:CanvasRenderingContext2D,units:Iterable<Unit>,z:number,ox:number,oy:number):void{
  ctx.save();
  for(const u of units){
    if(!u.ref.o.flags.used||u.ref.o.flags.isNotOnMap)continue;
    const max=unitInfo[u.type]?.o.hitpoints??1,p=Math.max(0,Math.min(1,u.ref.o.hitpoints/Math.max(1,max)));
    const w=Math.max(28,Math.round(26*z)),h=Math.max(3,Math.round(3*z)),x=Math.round(u.x*z-ox-w/2);
    // A selected drone keeps its battery/grenade display below; health sits above.
    const y=Math.round((u.y+(u.ref.drone?-18:16))*z-oy);
    const bar=(row:number,value:number,color:string)=>{
      ctx.fillStyle='#000000b0';ctx.fillRect(x-1,row-1,w+2,h+2);
      ctx.fillStyle='#24303bd9';ctx.fillRect(x,row,w,h);
      ctx.fillStyle=color;ctx.fillRect(x,row,Math.round(w*value),h);
      ctx.fillStyle='#ffffff35';ctx.fillRect(x,row,Math.round(w*value),Math.max(1,z*.5));
    };
    bar(y,p,p>.5?'#58d64a':p>.25?'#e8a92a':'#e2412d');
    if(u.type===UNIT.HARVESTER)bar(y+h+3,Math.max(0,Math.min(1,u.ref.amount/100)),'#e4a047');
  }
  ctx.restore();
}
