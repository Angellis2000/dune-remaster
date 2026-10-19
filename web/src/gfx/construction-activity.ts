import type {Structure} from '../game/world.ts';

/** Welding follows the original construction state; it never changes completion timing. */
export function drawConstructionActivity(ctx:CanvasRenderingContext2D,s:Structure,tick:number):void{
  for(let site=0;site<3;site++){
  const t=(tick+s.id*13+site*43)%137;
  if(t>32)continue;
  const x=(s.x+s.w*(.28+site*.23))*32,y=(s.y+s.h*(.57+.14*Math.sin(site*2.6)))*32;
  ctx.save();ctx.translate(x,y);ctx.globalAlpha=Math.sin(Math.PI*t/32)**2;
  const glow=ctx.createRadialGradient(0,0,0,0,0,3.2);
  glow.addColorStop(0,'rgba(163,211,255,.32)');glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow;ctx.fillRect(-3.2,-3.2,6.4,6.4);
  ctx.shadowColor='#b9ddff';ctx.shadowBlur=2;ctx.fillStyle='#f1f6ff';
  ctx.beginPath();ctx.arc(0,0,.7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.lineWidth=.22;ctx.strokeStyle='#ffca71';ctx.beginPath();
  for(let i=0;i<5;i++){
    const a=i*2.4+s.id,r=.5+t*.055+i*.13,fall=t*t*.0013;
    ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r+fall);ctx.lineTo(Math.cos(a)*(r+.5),Math.sin(a)*(r+.5)+fall+.15);
  }
  ctx.stroke();ctx.restore();}
}
