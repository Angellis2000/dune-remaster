import infantryUrl from './assets/vehicles-hd/infantry.png?url';
import type {DuneRom} from '../rom/dune.ts';
import type {Unit as EngineUnit} from '../engine/core.ts';
import type {Unit} from '../game/world.ts';
import {loadSpriteCells} from './vehicle-art.ts';
import {angleRadians} from './vehicle-geometry.ts';

interface Pose {x:number;y:number;phase:number;move:number;tick:number;type:number;house:number;angle:number;dead:number;ref:EngineUnit;serial?:number}
interface Shot {tick:number;angle:number;rocket:boolean}
export class InfantryArt {
  private poses=new Map<EngineUnit,Pose>();
  private shots=new WeakMap<EngineUnit,Shot>();
  private corpses:Pose[]=[];
  private lastTick=-1;
  private constructor(private cells:HTMLCanvasElement[][]){}
  static async load(rom:DuneRom):Promise<InfantryArt|null>{
    try{
      const raw=await loadSpriteCells(infantryUrl),palette=rom.gamePalette();
      const cells=Array.from({length:6},(_,house)=>raw.map(source=>{
        const c=document.createElement('canvas');c.width=source.width;c.height=source.height;
        const g=c.getContext('2d')!;g.drawImage(source,0,0);
        if(rom.housePaletteLine(house)!==1){
          const data=g.getImageData(0,0,c.width,c.height),p=data.data,base=rom.housePaletteLine(house)*16;
          for(let k=0;k<p.length;k+=4)if(p[k+3]&&p[k+2]>60&&p[k+2]>p[k]*1.3&&p[k+1]>p[k]*1.15){
            const light=Math.min(1,(Math.max(p[k+1],p[k+2])-25)/225)*2,a=Math.min(1,Math.floor(light)),f=light-a;
            const lo=palette[base+15-a],hi=palette[base+14-a];
            for(let j=0;j<3;j++)p[k+j]=((lo>>>(j*8))&255)*(1-f)+((hi>>>(j*8))&255)*f;
          }g.putImageData(data,0,0);
        }return c;
      }));return new InfantryArt(cells);
    }catch(error){console.warn('HD infantry unavailable, using original sprites:',error);return null;}
  }
  reset():void{this.poses.clear();this.shots=new WeakMap();this.corpses=[];this.lastTick=-1;}
  shot(u:EngineUnit,b:EngineUnit,tick:number):void{if(u.o.type>=2&&u.o.type<=6)this.shots.set(u,{tick,angle:b.orientation[0].current&255,rocket:b.o.type!==23});}
  update(units:Unit[],tick:number):void{
    if(tick===this.lastTick)return;this.lastTick=tick;
    const seen=new Set<EngineUnit>();
    for(const u of units){
      if(u.type<2||u.type>6)continue;seen.add(u.ref);
      // ячейку погибшего занял новый юнит (аудит 2026-10-20, п. 11): труп остаётся на месте, новый не наследует позу
      let p=this.poses.get(u.ref);
      if(p&&p.serial!==u.ref.serial){if(p.dead>=0)this.corpses.push(p);p=undefined;}
      const dead=u.ref.o.hitpoints===0||u.ref.actionID===10;
      const distance=p?Math.hypot(u.x-p.x,u.y-p.y):0;
      this.poses.set(u.ref,{x:u.x,y:u.y,phase:(p?.phase??u.id*.8)+(distance<12?distance*1.4:0),
        move:distance>.025?1:(p?.move??0)*.65,tick,type:u.type,house:u.house,angle:u.orientation,
        dead:dead?(p&&p.dead>=0?p.dead:tick):-1,ref:u.ref,serial:u.ref.serial});
    }
    for(const [ref,p]of this.poses)if(!seen.has(ref)){
      if(p.dead>=0||(p.serial===ref.serial&&(ref.o.hitpoints===0||ref.actionID===10)))this.corpses.push({...p,dead:p.dead>=0?p.dead:tick});
      this.poses.delete(ref);
    }
    this.corpses=this.corpses.filter(p=>tick-p.dead<180).slice(-40);
  }
  private model(type:number):number{return type===6?2:type===3||type===5?1:0;}
  private members(type:number):readonly number[][]{return type===2||type===3?[[-3,2],[3,2],[0,-3]]:[[0,0]];}
  private person(ctx:CanvasRenderingContext2D,model:number,house:number,phase:number,move:number,fire:boolean,age:number):void{
    const cells=this.cells[Math.min(5,house)],stride=Math.sin(phase)*.72*move;
    // Alternating planted feet. The torso centre does not sway sideways.
    for(let side=0;side<2;side++){
      const step=side?stride:-stride;
      ctx.save();ctx.translate(side?.92:-.92,.35+step);
      ctx.rotate((side?1:-1)*Math.sin(phase)*.07*move);
      ctx.drawImage(cells[model*4+1+side],-.78,-1,1.56,2.7);ctx.restore();
    }
    const recoil=fire?Math.sin(Math.PI*Math.min(1,age/.18))*.5:0;
    const torso=cells[fire?12+model:model*4];
    ctx.drawImage(torso,-2.8,-6+recoil,5.6,7.5);
    if(fire&&age<.09){
      ctx.save();ctx.translate(0,-6.5+recoil);ctx.fillStyle='#ffe3a0';ctx.shadowColor='#ffb547';ctx.shadowBlur=1.5;
      ctx.beginPath();ctx.moveTo(-.5,0);ctx.lineTo(0,-2.5);ctx.lineTo(.7,-.3);ctx.closePath();ctx.fill();ctx.restore();
    }
  }
  draw(ctx:CanvasRenderingContext2D,u:Unit,tick:number):boolean{
    if(u.type<2||u.type>6)return false;
    const p=this.poses.get(u.ref),shot=this.shots.get(u.ref),age=shot?(tick-shot.tick)/60:99;
    const firing=age>=0&&age<.2,angle=firing&&shot?shot.angle:u.orientation;
    const model=this.model(u.type),members=this.members(u.type);
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.translate(u.x,u.y);
    for(const [i,offset]of members.entries()){
      ctx.save();ctx.translate(offset[0],offset[1]);ctx.rotate(angleRadians(angle));
      if(p&&p.dead>=0){
        const fall=Math.min(1,(tick-p.dead)/18);ctx.rotate(fall*.9);ctx.scale(1,1-fall*.2);
        ctx.drawImage(this.cells[Math.min(5,u.house)][model*4+3],-4,-4,8,9);
      }else this.person(ctx,model,u.house,(p?.phase??0)+i*1.7,p?.move??0,firing,age);
      ctx.restore();
    }
    ctx.restore();return true;
  }
  drawCorpses(ctx:CanvasRenderingContext2D,tick:number,isVisible:(x:number,y:number)=>boolean):void{
    ctx.save();ctx.imageSmoothingEnabled=true;
    for(const p of this.corpses){
      if(!isVisible(p.x,p.y))continue;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angleRadians(p.angle));ctx.globalAlpha=Math.min(1,(180-tick+p.dead)/70);
      for(const [x,y]of this.members(p.type))ctx.drawImage(this.cells[Math.min(5,p.house)][this.model(p.type)*4+3],x-4,y-4,8,9);
      ctx.restore();
    }ctx.restore();
  }
}
