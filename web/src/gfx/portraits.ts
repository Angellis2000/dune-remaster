import type {Skins} from './skins.ts';
import type {VehicleArt} from './vehicle-art.ts';
import type {InfantryArt} from './infantry-art.ts';
import type {MapEffects} from './map-effects.ts';
import type {IconSet} from './icons.ts';
import type {Unit} from '../game/world.ts';
import {layoutSize,structureInfo} from '../engine/tables.ts';
import {drawWall} from './wall-art.ts';
import type {WormArt} from './worm-art.ts';
import type {BuildingPortraits} from './building-portraits.ts';
import {unitPortraitSource} from './unit-portraits.ts';

/** Original building portrait compositions and HD unit art, shared by all selection menus. */
export class Portraits {
  private cache=new Map<string,HTMLCanvasElement>();
  private iconCache=new Map<string,HTMLCanvasElement>();
  constructor(private skins:Skins,private vehicles:VehicleArt|null,private infantry:InfantryArt|null,
    private effects:MapEffects|null,private icons:IconSet,private house:()=>number,private worm?:WormArt|null,
    private buildings?:BuildingPortraits){}
  image(kind:'unit'|'structure',type:number):HTMLCanvasElement{
    if(kind==='structure'&&type<19){const image=this.buildings?.image(type);if(image)return image;}
    const portrait=kind==='unit'?unitPortraitSource(type):null;
    if(portrait){
      const key=`portrait-v3:${type}:${this.house()}`,cached=this.cache.get(key);if(cached)return cached;
      const c=document.createElement('canvas');c.width=384;c.height=256;const g=c.getContext('2d')!;
      const {image,x,y,w,h}=portrait;
      g.drawImage(image,x*image.width,y*image.height,w*image.width,h*image.height,0,0,384,256);
      if(this.house()!==1&&type!==25){
        const colors=[[192,57,43],[40,119,195],[54,145,66],[147,92,167],[180,147,81],[82,150,163]],color=colors[this.house()]??colors[1];
        const data=g.getImageData(0,0,384,256),p=data.data;
        for(let i=0;i<p.length;i+=4)if(p[i+2]>p[i]*1.18&&p[i+2]>p[i+1]*1.22&&p[i+2]-p[i]>20){
          const light=(p[i]+p[i+1]+p[i+2])/330;
          p[i]=Math.min(255,color[0]*light);p[i+1]=Math.min(255,color[1]*light);p[i+2]=Math.min(255,color[2]*light);
        }
        g.putImageData(data,0,0);
      }
      this.cache.set(key,c);return c;
    }
    const key=`${kind}:${type}:${this.house()}`;let c=this.cache.get(key);if(c)return c;
    c=document.createElement('canvas');c.width=384;c.height=256;const g=c.getContext('2d')!;
    const bg=g.createLinearGradient(0,0,0,256);bg.addColorStop(0,'#25323b');bg.addColorStop(1,'#10171c');
    g.fillStyle=bg;g.fillRect(0,0,384,256);g.imageSmoothingEnabled=true;
    if(kind==='structure'){
      const size=layoutSize[structureInfo[type]?.layout??0],aspect=size.width/size.height;
      const h=212/Math.max(1,aspect),w=h*aspect;
      const image=this.skins.structure(type,Math.round(w),Math.round(h));
      if(image){g.drawImage(image,(384-w)/2,(256-h)/2,w,h);}
      else if(type===0||type===1){
        const floor=this.effects?.icon(126)??this.icons.source(126);
        g.save();g.translate(192,128);g.transform(1,.22,-.5,.6,0,0);
        g.drawImage(floor.image,floor.sx,floor.sy,floor.sw,floor.sh,-112,-112,224,224);g.restore();
      }else if(type===14){
        for(let i=0;i<4;i++)drawWall(g,48+i*72,83,72,(i?8:0)|(i<3?2:0),this.effects?.icon(126)?.image);
      }
    }else{
      const u={id:0,type,house:this.house(),orientation:24,turret:24,x:0,y:0,state:{wing:0},
        ref:{o:{position:{x:0,y:0},hitpoints:100},actionID:3},highlighted:false,shadow:[0,1,26].includes(type)} as unknown as Unit;
      g.save();g.translate(192,140);g.scale(type>=2&&type<=6?18:6, type>=2&&type<=6?18:6);
      this.worm?.draw(g,u,0)||this.vehicles?.draw(g,u,0)||this.infantry?.draw(g,u,0);g.restore();
    }
    this.cache.set(key,c);return c;
  }
  /** Transparent, tightly framed HD thumbnail for the original console order slots. */
  icon(kind:'unit'|'structure',type:number):HTMLCanvasElement{
    if(kind==='structure'&&type<19){const image=this.buildings?.image(type,true);if(image)return image;}
    if(kind==='unit'&&unitPortraitSource(type)){
      const key=`portrait-icon-v3:${type}:${this.house()}`,cached=this.iconCache.get(key);if(cached)return cached;
      const c=document.createElement('canvas');c.width=128;c.height=96;
      c.getContext('2d')!.drawImage(this.image(kind,type),0,0,128,96);this.iconCache.set(key,c);return c;
    }
    const key=`${kind}:${type}:${this.house()}`;let c=this.iconCache.get(key);if(c)return c;
    c=document.createElement('canvas');c.width=128;c.height=96;const g=c.getContext('2d')!;g.imageSmoothingEnabled=true;
    if(kind==='structure'){
      const size=layoutSize[structureInfo[type]?.layout??0],aspect=size.width/size.height;
      const h=78/Math.max(1,aspect),w=h*aspect,image=this.skins.structure(type,Math.round(w),Math.round(h));
      if(image)g.drawImage(image,(128-w)/2,(96-h)/2,w,h);
      else if(type===0||type===1){const floor=this.effects?.icon(126)??this.icons.source(126);g.save();g.translate(64,48);g.transform(1,.22,-.5,.6,0,0);g.drawImage(floor.image,floor.sx,floor.sy,floor.sw,floor.sh,-38,-38,76,76);g.restore();}
      else if(type===14){for(let i=0;i<4;i++)drawWall(g,8+i*28,32,28,(i?8:0)|(i<3?2:0),this.effects?.icon(126)?.image);}
    }else{
      const u={id:0,type,house:this.house(),orientation:24,turret:24,x:0,y:0,state:{wing:0},ref:{o:{position:{x:0,y:0},hitpoints:100},actionID:3},highlighted:false,shadow:[0,1,26].includes(type)} as unknown as Unit;
      g.save();g.translate(64,54);g.scale(type>=2&&type<=6?7:3, type>=2&&type<=6?7:3);this.worm?.draw(g,u,0)||this.vehicles?.draw(g,u,0)||this.infantry?.draw(g,u,0);g.restore();
    }
    this.iconCache.set(key,c);return c;
  }
}
