import {G,type Unit as EngineUnit} from '../engine/core.ts';
import type {Structure,Unit} from '../game/world.ts';
import type {VehicleArt} from './vehicle-art.ts';

// Rendering proxies only: never allocate cosmetic vehicles in the simulation.
const parkedRef={} as EngineUnit;
export function drawFactoryActivity(ctx:CanvasRenderingContext2D,s:Structure,vehicles:VehicleArt|null,tick:number,powered:boolean):void{
  if(!vehicles||!s.built||(s.type!==3&&s.type!==4))return;
  const produced=s.ref.o.linkedID!==255?G.units[s.ref.o.linkedID]:null;
  const busy=s.ref.state===1&&!s.ref.o.flags.onHold&&powered;
  const types=s.type===3?[13,15]:[9,10];
  if(produced?.o.flags.used)types[0]=produced.o.type;
  const w=s.w*32,h=s.h*32;
  const slots=[[.655,.730],[.835,.610]];
  ctx.save();
  ctx.beginPath();ctx.rect(s.x*32+w*.525,s.y*32+h*.48,w*.405,h*.415);ctx.clip();
  for(let i=0;i<2;i++){
    const x=s.x*32+w*slots[i][0],y=s.y*32+h*slots[i][1];
    ctx.save();ctx.translate(x,y);ctx.scale(.64,.64);
    const orientation=i===0?0:128,turret=orientation+(busy&&i===0?Math.sin(tick/130)*12:0);
    const unit={id:-1000-s.id*2-i,ref:i===0&&produced?produced:parkedRef,type:types[i],house:s.house,
      x:0,y:2,orientation,turret,anim:0,state:{},air:false,shadow:false,highlighted:false,hp:256,smoke:-1,dust:-1} satisfies Unit;
    vehicles.draw(ctx,unit,tick);ctx.restore();
    if(busy&&i===0){
      const a=tick/45,cx=x+Math.cos(a)*4,cy=y+Math.sin(a)*5;
      const pulse=Math.max(0,Math.sin(tick/11))**4;
      const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,2.6);
      glow.addColorStop(0,`rgba(220,243,255,${pulse*.85})`);glow.addColorStop(1,'transparent');
      ctx.fillStyle=glow;ctx.fillRect(cx-2.6,cy-2.6,5.2,5.2);
      ctx.strokeStyle=`rgba(255,203,126,${pulse})`;ctx.lineWidth=.18;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+1.2,cy+1.6);ctx.moveTo(cx,cy);ctx.lineTo(cx-1,cy+1.1);ctx.stroke();
    }
  }
  ctx.restore();
}
