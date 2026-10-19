import type {Unit} from '../game/world.ts';
import type {Unit as EngineUnit} from '../engine/core.ts';
import {along,angleRadians} from './vehicle-geometry.ts';

interface Mark {x:number;y:number;angle:number;tick:number;rock:boolean;wheel:boolean;width:number}
interface Last {x:number;y:number;tick:number;remainder:number}
export class VehicleTracks {
  private marks:Mark[]=[];
  private last=new WeakMap<EngineUnit,Last>();
  private tick=-1;
  private stamps:HTMLCanvasElement[];
  constructor(){
    this.stamps=Array.from({length:4},(_,index)=>{
      const c=document.createElement('canvas');c.width=96;c.height=32;
      const g=c.getContext('2d')!;g.scale(8,8);
      const rock=index>=2,wheel=!!(index%2);
      g.strokeStyle=rock?'#302c27':'#49321e';g.lineWidth=wheel?.35:.42;g.lineCap='round';
      if(wheel){
        for(const x of [-4,4]){g.beginPath();g.moveTo(6+x-.22,0);g.lineTo(6+x-.22,4);g.moveTo(6+x+.22,0);g.lineTo(6+x+.22,4);g.stroke();}
      }else for(const x of [-4,4]){
        if(!rock){g.fillStyle='#70513055';g.fillRect(6+x-1,0,2,4);}
        for(const y of [.65,2]){g.beginPath();g.moveTo(6+x-.8,y+.2);g.lineTo(6+x+.8,y-.2);g.stroke();}
        if(!rock){g.strokeStyle='#e9ca8d';g.lineWidth=.18;g.beginPath();g.moveTo(6+x-.8,2.45);g.lineTo(6+x+.8,2.05);g.stroke();g.strokeStyle='#49321e';g.lineWidth=.42;}
      }
      return c;
    });
  }
  reset():void {this.marks=[];this.last=new WeakMap();this.tick=-1;}
  update(units:Unit[],tick:number,isRock:(x:number,y:number)=>boolean):void {
    if(tick===this.tick)return;this.tick=tick;
    this.marks=this.marks.filter(m=>tick>=m.tick&&tick-m.tick<1800);
    for(const u of units){
      if(u.air||(u.type<7||u.type>17)&&u.type!==27)continue;
      const old=this.last.get(u.ref),current={x:u.x,y:u.y,tick,remainder:old?.remainder??0};
      this.last.set(u.ref,current);
      if(!old||tick-old.tick>10)continue;
      const dx=u.x-old.x,dy=u.y-old.y,distance=Math.hypot(dx,dy);
      if(distance>24){current.remainder=0;continue;}
      if(distance<.001)continue;
      const wheel=u.type>=13&&u.type<=15,spacing=wheel?1.5:1.35;
      const heading=Math.atan2(dx,-dy)*128/Math.PI;
      const rear=along(heading,-(u.type===16?10:u.type===27?11:6));
      for(let d=spacing-old.remainder;d<=distance;d+=spacing){
        const f=d/distance,x=old.x+dx*f+rear.x,y=old.y+dy*f+rear.y;
        this.marks.push({x,y,angle:heading,tick,rock:isRock(x,y),wheel,width:u.type===10?20:u.type===27?19:u.type===16?17:wheel?12:15});
      }
      current.remainder=(old.remainder+distance)%spacing;
    }
    if(this.marks.length>2200)this.marks.splice(0,this.marks.length-2200);
  }
  draw(ctx:CanvasRenderingContext2D,tick:number,isVisible:(x:number,y:number)=>boolean):void {
    ctx.save();ctx.imageSmoothingEnabled=true;
    for(const m of this.marks){
      if(!isVisible(m.x,m.y))continue;
      const age=(tick-m.tick)/1800;
      ctx.save();ctx.translate(m.x,m.y);ctx.rotate(angleRadians(m.angle));
      ctx.globalAlpha=(m.rock?.16:.62)*Math.pow(Math.max(0,1-age),1.4);
      ctx.drawImage(this.stamps[(m.rock?2:0)+(m.wheel?1:0)],-m.width/2,-1,m.width,2.6);
      ctx.restore();
    }
    ctx.restore();
  }
}
