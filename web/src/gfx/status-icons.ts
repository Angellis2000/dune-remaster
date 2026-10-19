/**
 * Resolution-independent status art. Animation is cosmetic and pauses with the game.
 * Яркая цветная плашка с тёмным символом и тёмной обводкой: на тёмных HD-зданиях и на песке видна одинаково
 * (прежняя тёмная металлическая плашка терялась на корпусах).
 */
/** energy — характеристика «Энергия» в окне здания: та же молния без тревожного красного */
export type StatusKind='repair'|'power'|'ready'|'energy';
const wrench=new Path2D('M 1 -10 C -3 -11 -7 -7 -5 -3 L -11 3 C -14 6 -10 11 -7 8 L 0 1 C 5 3 10 -1 9 -6 L 5 -2 L 1 -3 L 0 -7 L 3 -10 Z');
const bolt=new Path2D('M 2 -12 L -9 2 L -2 2 L -4 12 L 10 -4 L 3 -4 L 5 -12 Z');
const PLATE:Record<StatusKind,{top:string;bottom:string;glow:string;ink:string}>={
  // красная, а не жёлтая: значок стоит на ветряке, а у него золотой купол
  power:{top:'#ff6b4f',bottom:'#c0141c',glow:'255,80,50',ink:'#ffe14a'},
  energy:{top:'#ffe36a',bottom:'#f08a10',glow:'255,190,40',ink:'#2a1400'},
  repair:{top:'#9ff0ff',bottom:'#1f8fbf',glow:'90,220,255',ink:'#04202b'},
  ready:{top:'#b8f58a',bottom:'#3a9a28',glow:'150,240,110',ink:'#0b2606'},
};
export function drawStatusIcon(ctx:CanvasRenderingContext2D,kind:StatusKind,x:number,y:number,size:number,tick:number,seed=0):void {
  const t=tick/60, phase=t*3.8+seed*.61, pulse=.5+.5*Math.sin(phase), p=PLATE[kind];
  ctx.save();ctx.translate(x,y);ctx.scale(size/32,size/32);
  ctx.lineJoin='round';ctx.lineCap='round';
  // ореол-предупреждение: у нехватки энергии и ремонта пульсирует, у «готово» ровный
  const calm=kind==='ready'||kind==='energy';
  const halo=calm?.35:.25+.45*pulse,reach=calm?22:20+5*pulse;
  const g=ctx.createRadialGradient(0,0,10,0,0,reach);g.addColorStop(0,`rgba(${p.glow},${halo})`);g.addColorStop(1,`rgba(${p.glow},0)`);
  ctx.fillStyle=g;ctx.fillRect(-reach,-reach,reach*2,reach*2);
  // тёмная обводка отделяет плашку от любого фона
  ctx.fillStyle='#0b0d10';ctx.beginPath();ctx.roundRect(-17,-17,34,34,8);ctx.fill();
  const plate=ctx.createLinearGradient(0,-15,0,15);plate.addColorStop(0,p.top);plate.addColorStop(1,p.bottom);
  ctx.fillStyle=plate;ctx.beginPath();ctx.roundRect(-14.5,-14.5,29,29,6);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1.4;ctx.beginPath();ctx.roundRect(-13.2,-13.2,26.4,26.4,5);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.roundRect(-12,-12,24,9,4);ctx.fill();
  if(kind==='repair'){
    ctx.rotate(-.34+Math.sin(t*4+seed)*.13);ctx.scale(1.1,1.1);
    ctx.fillStyle=p.ink;ctx.fill(wrench);
    ctx.fillStyle=p.top;ctx.beginPath();ctx.arc(-9,5.5,1.4,0,Math.PI*2);ctx.fill();
  }else if(kind==='power'||kind==='energy'){
    ctx.scale(1.1,1.1);ctx.fillStyle=p.ink;ctx.fill(bolt);if(kind==='power'){ctx.strokeStyle='#3a0400';ctx.lineWidth=1.3;ctx.stroke(bolt);}
    ctx.globalAlpha=.35+.5*pulse;ctx.strokeStyle='#fff6c8';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(1,-8);ctx.lineTo(-5,0);ctx.stroke();
  }else{
    ctx.strokeStyle=p.ink;ctx.lineWidth=4.5;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-2,6);ctx.lineTo(9,-7);ctx.stroke();
  }
  ctx.restore();
}
