import bodiesUrl from './assets/vehicles-hd/bodies.png?url';
import mountsUrl from './assets/vehicles-hd/mounts.png?url';
import sonicUrl from './assets/vehicles-hd/sonic-redesign-v1.png?url';
import type {DuneRom} from '../rom/dune.ts';
import type {Unit as EngineUnit} from '../engine/core.ts';
import type {Unit} from '../game/world.ts';
import {angleRadians, along, muzzlePoint, VEHICLES} from './vehicle-geometry.ts';
import {loadCustomVehicles,drawCustomVehicle} from './custom-vehicle-art.ts';

/** Slice once; no per-frame pixel processing or large directional sprite caches. */
export async function loadSpriteCells(url: string): Promise<HTMLCanvasElement[]> {
  const response = await fetch(url);
  if (!response.ok) throw Error(`Vehicle art HTTP ${response.status}`);
  const image = await createImageBitmap(await response.blob());
  const cells: HTMLCanvasElement[] = [];
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('canvas'); cell.width = cell.height = 256;
    const ctx = cell.getContext('2d', {willReadFrequently:true})!;
    ctx.drawImage(image, i%4*256, (i>>2)*256, 256,256,0,0,256,256);
    const pixels = ctx.getImageData(0,0,256,256).data;
    let x0=256,y0=256,x1=0,y1=0;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pixels[(y*256+x)*4+3]>20){
      x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
    }
    const c=document.createElement('canvas');c.width=x1-x0+1;c.height=y1-y0+1;
    c.getContext('2d')!.drawImage(cell,x0,y0,c.width,c.height,0,0,c.width,c.height);
    cells.push(c);
  }
  image.close(); return cells;
}

interface Shot { tick:number; angle:number; x:number; y:number; type:number }
export class VehicleArt {
  private bodies: HTMLCanvasElement[][]=[];
  private mounts: HTMLCanvasElement[][]=[];
  private custom:HTMLCanvasElement[][]=[];
  private shots = new WeakMap<EngineUnit, Shot>();
  private bullets = new WeakMap<EngineUnit, Shot>();
  private defs = new Map(VEHICLES.map(d=>[d.type,d]));
  private constructor(private rawMounts:HTMLCanvasElement[]) {}

  static async load(rom:DuneRom):Promise<VehicleArt|null> {
    try {
      const [bodies,mounts]=await Promise.all([loadSpriteCells(bodiesUrl),loadSpriteCells(mountsUrl)]);
      const sonic=await createImageBitmap(await (await fetch(sonicUrl)).blob());
      for(let i=0;i<2;i++){
        const part=document.createElement('canvas');part.width=part.height=256;
        part.getContext('2d')!.drawImage(sonic,i*sonic.width/2,0,sonic.width/2,sonic.height,0,0,256,256);
        if(i===0)bodies[7]=part;else mounts[5]=part;
      }
      sonic.close();
      const result=new VehicleArt(mounts), palette=rom.gamePalette();
      const custom=await loadCustomVehicles().catch(error=>{console.warn('New vehicle art unavailable:',error);return [];});
      for(let house=0;house<6;house++) {
        const base=rom.housePaletteLine(house)*16;
        const colors=[15,14,13].map(i=>{const p=palette[base+i];return [p&255,p>>>8&255,p>>>16&255];});
        const recolor=(source:HTMLCanvasElement) => {
          const c=document.createElement('canvas');c.width=source.width;c.height=source.height;
          const g=c.getContext('2d')!;g.drawImage(source,0,0);
          if(rom.housePaletteLine(house)!==1){
            const im=g.getImageData(0,0,c.width,c.height), p=im.data;
            for(let k=0;k<p.length;k+=4)if(p[k+3]&&p[k+2]>60&&p[k+2]>p[k]*1.3&&p[k+1]>p[k]*1.15){
              const light=Math.min(1,(Math.max(p[k+1],p[k+2])-25)/225)*2;
              const a=Math.min(1,Math.floor(light)), f=light-a;
              for(let j=0;j<3;j++)p[k+j]=colors[a][j]*(1-f)+colors[a+1][j]*f;
            }
            g.putImageData(im,0,0);
          }
          return c;
        };
        result.bodies.push(bodies.map(recolor));
        result.mounts.push(mounts.slice(0,9).map(recolor));
        result.custom.push(custom.map(recolor));
      }
      return result;
    } catch(error) {console.warn('HD vehicles unavailable, using original sprites:',error);return null;}
  }

  reset():void {this.shots=new WeakMap();this.bullets=new WeakMap();}
  shot(unit:EngineUnit,bullet:EngineUnit,tick:number):void {
    const s={tick,angle:bullet.orientation[0].current&255,x:unit.o.position.x/8,y:unit.o.position.y/8,type:bullet.o.type};
    this.shots.set(unit,s);this.bullets.set(bullet,s);
  }

  /** Draw in original world pixels; the caller supplies the camera transform. */
  draw(ctx:CanvasRenderingContext2D,u:Unit,tick:number):boolean {
    if(drawCustomVehicle(ctx,u,tick,this.custom[Math.max(0,Math.min(5,u.house))]))return true;
    if(u.type===1){
      this.ornithopter(ctx,u.x,u.y,u.orientation,u.house,tick,u.id,u.shadow,u.highlighted);
      return true;
    }
    const d=this.defs.get(u.type);
    if(!d)return this.projectile(ctx,u);
    const hullAngle=angleRadians(u.orientation)+(u.type===16?Math.PI:0);
    const house=Math.min(5,u.house), body=this.bodies[house][d.cell];
    const shot=this.shots.get(u.ref), age=shot ? (tick-shot.tick)/60 : 99;
    const firing=age>=0&&age<.16;
    const aim=firing&&shot ? shot.angle : u.turret;
    const recoil=firing ? Math.sin(Math.PI*Math.min(1,age/.16))*1.6 : 0;
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.translate(u.x,u.y);
    if(u.shadow){
      ctx.save();ctx.translate(4,10);ctx.globalAlpha=.26;ctx.filter='brightness(0) blur(0.8px)';
      ctx.translate(0,-2);ctx.rotate(hullAngle);ctx.drawImage(body,-d.w/2,-d.h/2,d.w,d.h);ctx.restore();
    }
    const height=u.type===0?(u.ref.carryallFlight?.height??12):0;
    ctx.save();ctx.translate(0,-2-height);ctx.rotate(hullAngle);ctx.drawImage(body,-d.w/2,-d.h/2,d.w,d.h);ctx.restore();
    if(d.mount!==undefined){
      ctx.save();ctx.translate(0,-4);ctx.rotate(angleRadians(aim));
      const muzzle=d.muzzle!, w=d.mw!;
      if(u.type===12)ctx.drawImage(this.mounts[house][d.mount],-w/2,-12+recoil,w,20);
      else ctx.drawImage(this.mounts[house][d.mount],-w/2,-muzzle+recoil,w,muzzle+5);
      ctx.restore();
      if(firing&&shot&&shot.type===23){
        // The flash starts at the barrel tip; its centre line matches the bullet heading.
        const p=muzzlePoint(0,0,shot.angle,d.muzzle!);
        const phase=Math.min(3,Math.floor(age/.04)), twin=d.mount===1||d.mount===4||d.mount===8;
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angleRadians(shot.angle));
        ctx.globalAlpha=phase===3?.35:1;
        const flash=this.rawMounts[12+phase], width=twin?3.2:3.8;
        if(twin){for(const x of [-w*.22,w*.22])ctx.drawImage(flash,x-width/2,-6+recoil,width,7);}
        else ctx.drawImage(flash,-width/2,-7+recoil,width,8);
        ctx.restore();
      }
    }
    if(u.highlighted){ctx.globalAlpha=.22;ctx.globalCompositeOperation='lighter';ctx.translate(0,-2);ctx.rotate(hullAngle);ctx.drawImage(body,-d.w/2,-d.h/2,d.w,d.h);}
    ctx.restore();return true;
  }

  /** Shared HD aircraft for the map and the original seven-craft victory formation. */
  ornithopter(ctx:CanvasRenderingContext2D,x:number,y:number,orientation:number,house:number,tick:number,
    phase=0,shadow=true,highlighted=false):void {
    const cells=this.bodies[Math.max(0,Math.min(5,house))],body=cells[1],wing=cells[14];
    const flap=Math.sin(tick*Math.PI/10+phase*1.7),reach=9.5+flap*2.5;
    const model=()=>{
      for(const side of [-1,1]){
        ctx.save();ctx.scale(side,1);ctx.translate(-1,-4);
        ctx.rotate(flap*.1);ctx.drawImage(wing,-reach,-2,reach,6);ctx.restore();
      }
      ctx.drawImage(body,-4.5,-12.5,9,21);
    };
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.translate(x,y);
    if(shadow){ctx.save();ctx.translate(4,10);ctx.rotate(angleRadians(orientation));
      ctx.globalAlpha=.23;ctx.filter='brightness(0) blur(0.8px)';model();ctx.restore();}
    ctx.rotate(angleRadians(orientation));model();
    if(highlighted){ctx.globalAlpha=.22;ctx.globalCompositeOperation='lighter';model();}
    ctx.restore();
  }

  private projectile(ctx:CanvasRenderingContext2D,u:Unit):boolean {
    if(![18,19,20,21,22,23,24].includes(u.type))return false;
    const shot=this.bullets.get(u.ref);
    if(u.type!==23&&u.type!==24&&shot&&Math.hypot(u.x-shot.x,u.y-shot.y)<11)return true;
    const index=u.type===23?10:u.type===24?11:9;
    const [w,h]=u.type===18?[6,20]:u.type===23?[u.state.big?2:1.2,5]:u.type===24?[16,8]:[3,10];
    const p=u.type===23?along(u.orientation,-2):{x:0,y:0};
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.translate(u.x+p.x,u.y+p.y);ctx.rotate(angleRadians(u.orientation));
    ctx.drawImage(this.rawMounts[index],-w/2,-h/2,w,h);ctx.restore();return true;
  }
}
