import {G,IT,indexEncode,indexGetUnit,type Unit as EngineUnit,type Structure as EngineStructure} from '../engine/core.ts';
import type {Structure,Unit} from '../game/world.ts';
import type {VehicleArt} from './vehicle-art.ts';

/** The ten authored wells form two columns. A soft travelling pulse has no frame switches. */
export function refineryPadLights(tick:number):{x:number;y:number;strength:number}[]{
  const head=((tick/10)%10+10)%10;
  return Array.from({length:10},(_,i)=>{
    const distance=((i-head+15)%10)-5;
    return{x:[76.25,83.75][i%2],y:[26.75,34.5,42.5,50.75,58.9][Math.floor(i/2)],strength:Math.exp(-distance*distance/1.2)};
  });
}

/** The original pad beacon runs during reservation/delivery as well as unloading. */
export function refineryActivity(s:EngineStructure):{active:boolean,docked:EngineUnit|null}{
  const linked=s.o.linkedID===255?null:G.units[s.o.linkedID];
  const docked=linked?.o.flags.used&&linked.o.type===16&&linked.o.flags.isNotOnMap?linked:null;
  const reserved=indexGetUnit(s.o.script.variables[4]);
  const destination=indexEncode(s.o.index,IT.STRUCTURE);
  const incoming=G.unitFind.some(u=>u.o.flags.used&&u.o.houseID===s.o.houseID&&u.targetMove===destination&&
    (u.o.type===16||(u.o.type===0&&u.o.linkedID!==255&&G.units[u.o.linkedID]?.o.type===16)));
  return {active:!!docked||incoming||!!(reserved?.o.flags.used&&(reserved.o.type===16||reserved.o.type===0)),docked};
}

/** Show the hidden logical harvester on the authored unloading pad, not inside the machinery. */
export function drawRefineryActivity(ctx:CanvasRenderingContext2D,s:Structure,vehicles:VehicleArt|null,tick:number):void{
  if(s.type!==12)return;
  const {active,docked:u}=refineryActivity(s.ref);
  if(!active)return;
  const x=s.x*32,y=s.y*32;
  ctx.save();ctx.imageSmoothingEnabled=true;
  if(active){
    // Illuminate inside the remaining circles; the removed corner vents never glow.
    for(const light of refineryPadLights(tick)){
      const xx=x+light.x,yy=y+light.y,pulse=light.strength;
      const glow=ctx.createRadialGradient(xx,yy,0,xx,yy,3.05);
      glow.addColorStop(0,`rgba(239,250,255,${.10+.7*pulse})`);
      glow.addColorStop(.62,`rgba(205,235,248,${.06+.4*pulse})`);glow.addColorStop(1,'transparent');
      ctx.fillStyle=glow;ctx.fillRect(xx-3.05,yy-3.05,6.1,6.1);
      ctx.strokeStyle=`rgba(226,246,255,${.08+.65*pulse})`;ctx.lineWidth=.22;
      ctx.beginPath();ctx.arc(xx,yy,2.65,0,Math.PI*2);ctx.stroke();
    }
  }
  if(!u){ctx.restore();return;}
  const harvester={id:-1,ref:u,type:16,house:s.house,x:x+80,y:y+48,orientation:0,turret:0,anim:0,
    state:{},air:false,shadow:false,highlighted:false,hp:256,smoke:-1,dust:-1} satisfies Unit;
  vehicles?.draw(ctx,harvester,tick);ctx.restore();
}
