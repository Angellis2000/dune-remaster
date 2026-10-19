/** Cosmetic desert lighting. Uses game ticks, so pauses and saved missions keep their time. */
export const DAY_TICKS = 24 * 60 * 60;
const TAU = Math.PI * 2;
const mod = (v:number,n:number) => ((v%n)+n)%n;
const smooth = (v:number) => v*v*(3-2*v);
const keys = [
  [0,.54,.64,.86], [5,.54,.64,.86], [7,1,.88,.74],
  [10,1,1,.98], [16,1,1,.98], [18,1,.83,.69], [20,.54,.64,.86], [24,.54,.64,.86],
] as const;

export function desertLight(tick:number):{hour:number;rgb:number[];night:number;sun:number}{
  const hour=mod(9+Math.max(0,tick)/DAY_TICKS*24,24);
  const i=keys.findIndex((k,j)=>j<keys.length-1&&hour>=k[0]&&hour<keys[j+1][0]);
  const a=keys[Math.max(0,i)],b=keys[Math.max(0,i)+1];
  const f=smooth((hour-a[0])/(b[0]-a[0]));
  const rgb=[1,2,3].map(c=>a[c]+(b[c]-a[c])*f);
  const sun=Math.max(0,Math.sin((hour-6)/24*TAU));
  return{hour,rgb,night:1-smooth(Math.min(1,sun*3)),sun};
}

/** Coordinates never depend on camera/zoom; the unseen cloud deck moves above the world. */
export function cloudPosition(i:number,tick:number):{x:number;y:number;w:number;h:number}{
  const t=Math.max(0,tick)/60;
  // Wrap far enough outside the 2048 px world to hide even the full beam's extent.
  return{x:mod(i*643+780+t*1.7,3500)-700,y:mod(i*419+500+t*.34,3300)-600,
    w:370+(i%3)*90,h:170+(i%4)*24};
}

export class WorldAtmosphere {
  private cloud:HTMLCanvasElement|null=null;

  private cloudMask():HTMLCanvasElement{
    if(this.cloud)return this.cloud;
    const c=document.createElement('canvas');c.width=256;c.height=128;
    const g=c.getContext('2d')!;
    // Soft overlapping lobes, cached once; no visible cloud sprites on the ground.
    for(let i=0;i<9;i++){
      const x=47+i*19,y=64+Math.sin(i*2.3)*15,r=26+(i%3)*7;
      const p=g.createRadialGradient(x,y,0,x,y,r);
      p.addColorStop(0,'rgba(0,0,0,.38)');p.addColorStop(.5,'rgba(0,0,0,.2)');p.addColorStop(1,'transparent');
      g.fillStyle=p;g.fillRect(x-r,y-r,r*2,r*2);
    }
    return this.cloud=c;
  }

  /** Caller clips to revealed world cells. UI and fog remain outside this pass. */
  draw(ctx:CanvasRenderingContext2D,tick:number,ox:number,oy:number,z:number,width:number,height:number):void{
    const light=desertLight(tick),seconds=Math.max(0,tick)/60;
    ctx.save();ctx.globalCompositeOperation='multiply';
    ctx.fillStyle=`rgb(${light.rgb.map(c=>Math.round(c*255)).join(',')})`;ctx.fillRect(0,0,width,height);
    ctx.imageSmoothingEnabled=true;
    const mask=this.cloudMask();ctx.globalAlpha=.15+.09*light.sun;
    for(let i=0;i<11;i++){
      const p=cloudPosition(i,tick),x=p.x*z-ox,y=p.y*z-oy,w=p.w*z,h=p.h*z;
      if(x>width||y>height||x+w<0||y+h<0)continue;
      ctx.drawImage(mask,x,y,w,h);
    }
    // Broad shafts of dust-scattered sunlight slipping between unseen clouds.
    // The gradient fades both edges and the length: never hard stripes or opaque fog.
    ctx.globalCompositeOperation='screen';
    for(let i=0;i<7&&light.sun>0;i++){
      const p=cloudPosition(i,tick),x=(p.x+180)*z-ox,y=(p.y-110)*z-oy;
      const w=(75+15*Math.sin(seconds*.055+i))*z,h=490*z,slant=150*z;
      if(x+w+slant<0||x>width||y+h<0||y>height)continue;
      ctx.save();ctx.transform(1,0,slant/h,1,x,y);
      const grad=ctx.createLinearGradient(-w,0,w,0);
      grad.addColorStop(0,'transparent');grad.addColorStop(.45,'#ffe2a8');grad.addColorStop(.6,'#fff1ce');grad.addColorStop(1,'transparent');
      ctx.fillStyle=grad;
      // Nested tapered strips provide a soft longitudinal fade without a second canvas pass.
      for(let band=0;band<12;band++){
        ctx.globalAlpha=light.sun*(.026+.009*Math.sin(seconds*.075+i))*Math.sin((band+.5)/12*Math.PI);
        ctx.fillRect(-w,band*h/12,w*2,h/12+.5);
      }
      ctx.restore();
    }
    ctx.restore();
  }
}
