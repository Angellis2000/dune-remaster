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

/**
 * Фазы суток для игрока — по той же кривой света (keys): рассвет 5–7, день 7–18, закат 18–20, ночь 20–5.
 * Сутки — DAY_TICKS игровых кадров (24 мин при 60 кадрах/с), миссия начинается в 9:00.
 */
const PHASES = [
  { from: 5, name: 'Рассвет', next: 'день' }, { from: 7, name: 'День', next: 'закат' },
  { from: 18, name: 'Закат', next: 'ночь' }, { from: 20, name: 'Ночь', next: 'рассвет' },
] as const;
export function dayPhase(tick:number):{hour:number;name:string;next:string;secondsLeft:number}{
  const hour=desertLight(tick).hour;
  let i=PHASES.length-1;for(let j=0;j<PHASES.length;j++)if(hour>=PHASES[j].from)i=j;
  const end=PHASES[(i+1)%PHASES.length].from;
  const hoursLeft=mod(end-hour,24);
  return{hour,name:PHASES[i].name,next:PHASES[i].next,secondsLeft:hoursLeft/24*DAY_TICKS/60};
}

/**
 * Часы суток — плашка в оформлении панели «СПАЙС» (ui/hud.ts: фон #101820, рамка #8B7650, подписи #C3B89E, цифры
 * #FFE4AA): фаза и маленькая дуга неба с солнцем или луной, время и сколько до смены. x, y, ширина — в точках CSS,
 * dpr — плотность экрана (масштаб карты не влияет).
 */
export const DAY_CLOCK_W = 150, DAY_CLOCK_H = 46;
export function drawDayClock(ctx:CanvasRenderingContext2D,tick:number,x:number,y:number,dpr:number):void{
  const light=desertLight(tick),phase=dayPhase(tick);
  const hh=Math.floor(light.hour),mm=Math.floor((light.hour-hh)*60);
  const left=Math.ceil(phase.secondsLeft),time=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;
  const W=DAY_CLOCK_W,H=DAY_CLOCK_H;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,x*dpr,y*dpr);
  ctx.fillStyle='#101820ed';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#8b7650';ctx.lineWidth=1;ctx.strokeRect(.5,.5,W-1,H-1);
  ctx.textBaseline='alphabetic';
  ctx.textAlign='left';ctx.font='700 11px "Segoe UI", sans-serif';ctx.fillStyle='#c3b89e';
  ctx.fillText(phase.name.toUpperCase(),10,16);
  // дуга неба справа вверху: днём солнце 6→18, ночью луна 18→6
  const cx=W-20,cy=19,r=11;
  ctx.fillStyle=light.night>.5?'#24324c':`rgb(${light.rgb.map(c=>Math.round(c*200)).join(',')})`;
  ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,0);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#514733';ctx.beginPath();ctx.moveTo(cx-r-3,cy+.5);ctx.lineTo(cx+r+3,cy+.5);ctx.stroke();
  const day=light.hour>=6&&light.hour<18,f=day?(light.hour-6)/12:mod(light.hour-18,24)/12;
  const a=Math.PI+f*Math.PI,bx=cx+Math.cos(a)*(r-3),by=cy+Math.sin(a)*(r-3);
  if(day){ctx.fillStyle='#ffd25a';ctx.beginPath();ctx.arc(bx,by,3,0,TAU);ctx.fill();}
  else{ctx.fillStyle='#e8eef8';ctx.beginPath();ctx.arc(bx,by,2.8,0,TAU);ctx.fill();ctx.fillStyle='#24324c';ctx.beginPath();ctx.arc(bx+1.3,by-.8,2.4,0,TAU);ctx.fill();}
  ctx.strokeStyle='#514733';ctx.beginPath();ctx.moveTo(8,24.5);ctx.lineTo(W-8,24.5);ctx.stroke();
  ctx.font='700 16px "IBM Plex Mono", monospace';ctx.fillStyle='#ffe4aa';ctx.shadowColor='#000';ctx.shadowBlur=2;
  ctx.fillText(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`,10,41);ctx.shadowBlur=0;
  ctx.textAlign='right';ctx.font='600 10px "IBM Plex Mono", monospace';ctx.fillStyle='#f2d59a';
  ctx.fillText(`${phase.next.toUpperCase()} ${time}`,W-8,40);
  ctx.restore();
}
