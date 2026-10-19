import {G,STRUCTURE} from '../engine/core.ts';
import type {Unit,Structure} from '../game/world.ts';
import {DRONE_RADIUS} from '../engine/custom-unit-defs.ts';

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
