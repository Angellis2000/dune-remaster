import hullUrl from './assets/vehicles-hd/laser-hull.png?url';
import turretUrl from './assets/vehicles-hd/laser-turret.png?url';
import droneUrl from './assets/vehicles-hd/drone.png?url';
import type {Unit} from '../game/world.ts';

export async function loadCustomVehicles():Promise<HTMLCanvasElement[]>{
  return Promise.all([hullUrl,turretUrl,droneUrl].map(async url=>{
    const r=await fetch(url);if(!r.ok)throw Error(`New vehicle HTTP ${r.status}`);
    const image=await createImageBitmap(await r.blob()),c=document.createElement('canvas');c.width=image.width;c.height=image.height;
    const g=c.getContext('2d')!;g.drawImage(image,0,0);const data=g.getImageData(0,0,c.width,c.height).data;
    let x0=c.width,y0=c.height,x1=0,y1=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    const out=document.createElement('canvas'),w=x1-x0+1,h=y1-y0+1,scale=256/Math.max(w,h);out.width=Math.round(w*scale);out.height=Math.round(h*scale);
    out.getContext('2d')!.drawImage(image,x0,y0,w,h,0,0,out.width,out.height);image.close();return out;
  }));
}
const TAU=Math.PI*2;
export function drawCustomVehicle(ctx:CanvasRenderingContext2D,u:Unit,tick:number,art:HTMLCanvasElement[]):boolean{
  if(u.type!==27&&u.type!==28)return false;
  if(!art?.length)return false;
  ctx.save();ctx.imageSmoothingEnabled=true;
  if(u.type===27){
    ctx.translate(u.x,u.y-2);
    ctx.save();ctx.rotate(u.orientation*Math.PI/128);ctx.drawImage(art[0],-10,-14,20,28);ctx.restore();
    ctx.translate(0,-2);ctx.rotate(u.turret*Math.PI/128);ctx.drawImage(art[1],-6,-17.4,12,24.2);
    const laser=u.ref.laser;
    if(laser&&laser.chargeUntil>tick){
      const f=Math.min(1,(tick-laser.chargeStart)/48),glow=ctx.createRadialGradient(0,-17,0,0,-17,2.5);
      glow.addColorStop(0,`rgba(229,255,255,${f})`);glow.addColorStop(.4,`rgba(85,218,255,${f*.7})`);glow.addColorStop(1,'transparent');
      ctx.fillStyle=glow;ctx.fillRect(-2.5,-19.5,5,5);
    }
  }else{
    const state=u.ref.drone,count=Math.max(1,Math.ceil((u.hp??256)/256*3));
    const fallback=[[-5,-3.5],[5,-3.5],[0,5]];
    for(let i=0;i<count;i++){
      const member=state?.members[i],dx=member?(member.x-u.ref.o.position.x)/8:fallback[i][0],dy=member?(member.y-u.ref.o.position.y)/8:fallback[i][1];
      const docked=state?.phase==='dock'||state?.phase==='guard'&&Math.hypot(u.ref.o.position.x-state.homePosition.x,u.ref.o.position.y-state.homePosition.y-64)<24,altitude=docked?.5:4;
      const x=u.x+dx,y=u.y+dy;
      ctx.save();ctx.translate(x,y);ctx.rotate(u.orientation*Math.PI/128);
      ctx.fillStyle=docked?'#00000025':'#00000032';ctx.beginPath();ctx.ellipse(1,1,3.7,2.4,0,0,TAU);ctx.fill();
      ctx.translate(0,-altitude);
      const bank=member?Math.max(-.1,Math.min(.1,member.vx*.012)):0;ctx.transform(1,bank,-bank*.5,1,0,0);
      ctx.drawImage(art[2],-3.9,-3.55,7.8,7.1);
      // Only fan interiors turn; the four housings and body retain a stable silhouette.
      for(const [rx,ry]of [[-2.5,-2.25],[2.5,-2.25],[-2.5,2.25],[2.5,2.25]]){
        ctx.save();ctx.translate(rx,ry);ctx.beginPath();ctx.arc(0,0,.75,0,TAU);ctx.clip();ctx.rotate(tick*(docked?.05:.9)+i);
        ctx.strokeStyle='rgba(163,180,191,.55)';ctx.lineWidth=.12;ctx.beginPath();ctx.moveTo(-.75,0);ctx.lineTo(.75,0);ctx.moveTo(0,-.75);ctx.lineTo(0,.75);ctx.stroke();ctx.restore();
      }
      ctx.restore();
    }
  }
  if(u.highlighted){ctx.globalAlpha=.12;ctx.fillStyle='#c8faff';ctx.beginPath();ctx.arc(0,0,u.type===27?9:2,0,TAU);ctx.fill();}
  ctx.restore();return true;
}
