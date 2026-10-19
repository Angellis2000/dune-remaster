/**
 * Значки над зданиями в HD — по образцу спрайтов ROM ($009ABA «OK», $0659FE молоток, $0658E8 молния, 24×24):
 * круглый диск с чёрной обводкой; «OK» голубыми буквами и молоток — на белом диске с серой тенью снизу справа,
 * молния — жёлто-оранжевая с белой кромкой на красном диске. Мигание — как у спрайтов MD ($0010B0, счётчик на кадр):
 * виден N кадров, скрыт один — «OK» 6/1, молоток 7/1, молния 3/1 (statusIconHidden). Время — игровое.
 * energy — та же молния на белом диске: характеристика «Энергия» в окне здания, не тревога.
 */
export type StatusKind='repair'|'power'|'ready'|'energy';
const TAU=Math.PI*2;
const bolt=new Path2D('M 2.5 -11 L -7.5 1.5 L -1.5 1.5 L -4 11 L 8 -2.5 L 2 -2.5 L 5 -11 Z');

/** Как в MD: значок скрыт один кадр из (N+1). */
const BLINK:Record<StatusKind,number>={ready:6,repair:7,power:3,energy:0};
export function statusIconHidden(kind:StatusKind,tick:number,seed=0):boolean{
  const on=BLINK[kind];
  return on>0&&((tick+seed)%(on+1))===on;
}

function disc(ctx:CanvasRenderingContext2D,face:string,shade:string):void{
  ctx.fillStyle='#000';ctx.beginPath();ctx.arc(0,0,12,0,TAU);ctx.fill();
  const g=ctx.createRadialGradient(-3.5,-3.5,1,0,0,10.8);
  g.addColorStop(0,face);g.addColorStop(.62,face);g.addColorStop(1,shade);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,10.6,0,TAU);ctx.fill();
}

/** x, y — центр; size — диаметр на экране (у спрайта ROM 24 мировых точки). */
export function drawStatusIcon(ctx:CanvasRenderingContext2D,kind:StatusKind,x:number,y:number,size:number,_tick=0,_seed=0):void {
  ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);
  ctx.lineJoin='round';ctx.lineCap='round';
  if(kind==='power'){
    disc(ctx,'#c81010','#6e0000');
    ctx.save();ctx.translate(.5,0);
    ctx.fillStyle='#fff';ctx.save();ctx.translate(-1,-.6);ctx.fill(bolt);ctx.restore();
    ctx.fillStyle='#ffac00';ctx.fill(bolt);
    ctx.strokeStyle='#3a0a00';ctx.lineWidth=.8;ctx.stroke(bolt);ctx.restore();
  }else if(kind==='energy'){
    disc(ctx,'#ffffff','#a8a8a8');
    ctx.fillStyle='#ffac00';ctx.fill(bolt);ctx.strokeStyle='#5a3000';ctx.lineWidth=.9;ctx.stroke(bolt);
  }else if(kind==='repair'){
    disc(ctx,'#ffffff','#a8a8a8');
    ctx.rotate(-Math.PI/4);
    // ручка (коричневая, с бликом) и головка (серая сталь)
    ctx.fillStyle='#000';ctx.fillRect(-1.9,-4,3.8,13.5);
    ctx.fillStyle='#9a6a2a';ctx.fillRect(-1.2,-3.5,2.4,12.6);
    ctx.fillStyle='#d6a35a';ctx.fillRect(-1.2,-3.5,.9,12.6);
    ctx.fillStyle='#000';ctx.beginPath();ctx.roundRect(-6.6,-9.2,13.2,6.2,1.4);ctx.fill();
    const steel=ctx.createLinearGradient(0,-8.6,0,-3.6);steel.addColorStop(0,'#f2f2f6');steel.addColorStop(.5,'#9a9aa6');steel.addColorStop(1,'#5a5a66');
    ctx.fillStyle=steel;ctx.beginPath();ctx.roundRect(-6,-8.6,12,5,1);ctx.fill();
  }else{
    disc(ctx,'#ffffff','#a8a8a8');
    ctx.font='900 11px Arial, Helvetica, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineWidth=2.6;ctx.strokeStyle='#002a5a';ctx.strokeText('OK',0,.6);
    const ink=ctx.createLinearGradient(0,-5,0,6);ink.addColorStop(0,'#7ef0ff');ink.addColorStop(1,'#0090e0');
    ctx.fillStyle=ink;ctx.fillText('OK',0,.6);
  }
  ctx.restore();
}
