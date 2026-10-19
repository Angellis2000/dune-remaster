import type {Structure} from '../game/world.ts';

type Picture=CanvasImageSource&{width:number;height:number};
const TAU=Math.PI*2;

/** Only the rotor inside its fixed housing turns; the building and shadows stay still. */
function rotor(ctx:CanvasRenderingContext2D,image:Picture,s:Structure,x:number,y:number,r:number,angle:number):void{
  const w=s.w*32,h=s.h*32,cx=w*x,cy=h*y;
  ctx.save();ctx.translate(s.x*32+cx,s.y*32+cy);
  ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.clip();ctx.rotate(angle);
  ctx.drawImage(image,(cx-r)/w*image.width,(cy-r)/h*image.height,
    r*2/w*image.width,r*2/h*image.height,-r,-r,r*2,r*2);ctx.restore();
}

/** Authored positions for default art. User replacement skins opt out in MapView. */
export function drawBuildingActivity(ctx:CanvasRenderingContext2D,s:Structure,image:Picture,tick:number,powered=true):void{
  if(!s.built||s.hp<=0)return;
  const t=tick/60,phase=s.id*.71,w=s.w*32,h=s.h*32,x=s.x*32,y=s.y*32;
  const busy=s.ref.state===1&&!s.ref.o.flags.onHold;
  ctx.save();ctx.imageSmoothingEnabled=true;
  if(s.type===12)for(const yy of [.163,.423,.683])rotor(ctx,image,s,.28,yy,Math.min(w,h)*.096,t*1.25+phase);
  if(powered){
    if(s.type===3||s.type===4)rotor(ctx,image,s,.322,.36,Math.min(w,h)*.108,t*1.8+phase);
    if(s.type===9){
      // Turbine reflections stay inside the open lower-right intake, never rotate the gold hood.
      for(const [cx,cy]of [[.275,.235],[.71,.40],[.51,.75]]){
        ctx.save();ctx.translate(x+w*cx,y+h*cy);const r=w*.145;
        ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,.15,1.35);ctx.closePath();ctx.clip();
        ctx.strokeStyle='rgba(191,210,218,.28)';ctx.lineWidth=.35;
        for(let j=0;j<6;j++){const a=t*2.2+phase+j*TAU/6;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.5,Math.sin(a)*r*.5);ctx.lineTo(Math.cos(a+.22)*r,Math.sin(a+.22)*r);ctx.stroke();}
        ctx.restore();
      }
    }
  }
  // Maintenance lights breathe gently rather than blinking the entire sprite.
  if(powered&&[3,4,5,8,11,12,13,18].includes(s.type)){
    const alpha=.32+.28*(.5+.5*Math.sin(t*2+phase));
    ctx.fillStyle=`rgba(142,232,244,${alpha})`;
    const px=x+w*(s.type===12?.48:.79),py=y+h*(s.type===12?.5:.80);
    ctx.fillRect(px,py,w*.018,.45);
  }
  if(busy&&powered&&[3,4,5,7,8,10,13].includes(s.type)){
    const pulse=Math.max(0,Math.sin(t*3.3+phase))**8;
    const cx=x+w*.66,cy=y+h*.72;
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,4);
    glow.addColorStop(0,`rgba(211,238,255,${pulse*.5})`);glow.addColorStop(1,'transparent');
    ctx.fillStyle=glow;ctx.fillRect(cx-4,cy-4,8,8);
  }
  ctx.restore();
}

/** Small lamps, rendered after the ambient pass, do not wash out the building details. */
export function drawBuildingNightLights(ctx:CanvasRenderingContext2D,s:Structure,night:number):void{
  if(!s.built||s.hp<=0||night<.03||[0,1,14,15,16].includes(s.type))return;
  const w=s.w*32,h=s.h*32,x=s.x*32+w*.60,y=s.y*32+h*.79;
  ctx.save();ctx.globalCompositeOperation='screen';
  const glow=ctx.createRadialGradient(x,y,0,x,y,3.5);
  glow.addColorStop(0,`rgba(255,205,124,${night*.26})`);glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow;ctx.fillRect(x-3.5,y-3.5,7,7);
  ctx.fillStyle=`rgba(255,224,163,${night*.8})`;ctx.fillRect(x-.8,y-.18,1.6,.36);ctx.restore();
}
