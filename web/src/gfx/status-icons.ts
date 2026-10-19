/** Resolution-independent status art. Animation is cosmetic and pauses with the game. */
export type StatusKind='repair'|'power'|'ready';
const wrench=new Path2D('M 1 -10 C -3 -11 -7 -7 -5 -3 L -11 3 C -14 6 -10 11 -7 8 L 0 1 C 5 3 10 -1 9 -6 L 5 -2 L 1 -3 L 0 -7 L 3 -10 Z');
const bolt=new Path2D('M 2 -12 L -9 2 L -2 2 L -4 12 L 10 -4 L 3 -4 L 5 -12 Z');
export function drawStatusIcon(ctx:CanvasRenderingContext2D,kind:StatusKind,x:number,y:number,size:number,tick:number,seed=0):void {
  const t=tick/60, phase=t*3.8+seed*.61, pulse=.5+.5*Math.sin(phase);
  const accent=kind==='power'?'#ffbd49':kind==='repair'?'#8cdad4':'#9ddd7b';
  ctx.save();ctx.translate(x,y);ctx.scale(size/32,size/32);
  ctx.lineJoin='round';ctx.lineCap='round';
  ctx.shadowColor='#0009';ctx.shadowBlur=4;ctx.shadowOffsetY=1.4;
  const metal=ctx.createLinearGradient(0,-16,0,16);metal.addColorStop(0,'#43505a');metal.addColorStop(.4,'#1c2930');metal.addColorStop(1,'#11191e');
  ctx.fillStyle=metal;ctx.strokeStyle='#89969b';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(-15,-15,30,30,6);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle=accent;ctx.globalAlpha=.22+.3*pulse;ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(-12.8,-12.8,25.6,25.6,4.5);ctx.stroke();ctx.globalAlpha=1;
  if(kind==='repair'){
    ctx.rotate(-.34+Math.sin(t*4+seed)*.13);
    const steel=ctx.createLinearGradient(-8,-8,8,8);steel.addColorStop(0,'#f3ffff');steel.addColorStop(.5,'#9ebcc5');steel.addColorStop(1,'#4b8494');
    ctx.fillStyle=steel;ctx.strokeStyle='#0c161c';ctx.lineWidth=1.1;ctx.fill(wrench);ctx.stroke(wrench);
    ctx.fillStyle='#20323a';ctx.beginPath();ctx.arc(-9,5.5,1.25,0,Math.PI*2);ctx.fill();
    // A small travelling highlight communicates work without flashing the badge off.
    ctx.globalAlpha=.25+.65*pulse;ctx.fillStyle='#c6fff1';ctx.beginPath();ctx.arc(8,8,1.2,0,Math.PI*2);ctx.fill();
  }else if(kind==='power'){
    ctx.globalAlpha=.8+.2*pulse;ctx.fillStyle='#ffd670';ctx.strokeStyle='#7b3e12';ctx.lineWidth=1;ctx.fill(bolt);ctx.stroke(bolt);
    ctx.globalAlpha=.2+.5*pulse;ctx.strokeStyle='#fff4ba';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(1,-9);ctx.lineTo(-6,0);ctx.stroke();
  }else{
    ctx.strokeStyle=accent;ctx.lineWidth=3.5;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-2,6);ctx.lineTo(9,-7);ctx.stroke();
  }
  ctx.restore();
}
