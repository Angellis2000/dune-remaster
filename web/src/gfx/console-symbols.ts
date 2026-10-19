/** Small physical console symbols, drawn at the display's native resolution. */
export function drawConsoleSymbol(ctx:CanvasRenderingContext2D,kind:'credits'|'damage'|'armour'|'upgrade',x:number,y:number,size:number):void{
  ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);ctx.lineJoin='round';
  const gold=ctx.createLinearGradient(-8,-10,8,10);
  gold.addColorStop(0,'#fff0b1');gold.addColorStop(.4,'#b6934d');gold.addColorStop(.6,'#f1cc79');gold.addColorStop(1,'#765027');
  const steel=ctx.createLinearGradient(-8,-10,8,10);
  steel.addColorStop(0,'#e0e7e9');steel.addColorStop(.45,'#8f9da5');steel.addColorStop(.55,'#d1d8d8');steel.addColorStop(1,'#4e5f6b');
  ctx.lineWidth=.9;ctx.strokeStyle='#251e14';ctx.shadowColor='#000b';ctx.shadowBlur=1.4;ctx.shadowOffsetY=.7;
  if(kind==='credits'){
    ctx.translate(0,1.5);
    for(const [xx,yy]of [[-5,3],[5,-1]])for(let i=0;i<3;i++){
      const y=yy-i*2.5;ctx.fillStyle=gold;ctx.beginPath();ctx.ellipse(xx,y,5.5,2.6,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    ctx.shadowBlur=0;ctx.strokeStyle='#fff0b199';ctx.lineWidth=.4;
    ctx.beginPath();ctx.ellipse(5,-6,3.6,1.2,0,0,Math.PI*2);ctx.stroke();
  }else if(kind==='damage'){
    for(const xx of [-4.5,4.5]){
      ctx.fillStyle=gold;ctx.beginPath();ctx.moveTo(xx-3,8);ctx.lineTo(xx-3,-3);ctx.quadraticCurveTo(xx-2,-7,xx,-10);
      ctx.quadraticCurveTo(xx+2,-7,xx+3,-3);ctx.lineTo(xx+3,8);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#7b4829';ctx.fillRect(xx-2.8,-3,5.6,2);ctx.fillStyle='#eddba6';ctx.fillRect(xx-2.8,5.5,5.6,1);
    }
  }else if(kind==='armour'){
    ctx.fillStyle=steel;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(9,-7);ctx.lineTo(8,2);
    ctx.quadraticCurveTo(7,7,0,11);ctx.quadraticCurveTo(-7,7,-8,2);ctx.lineTo(-9,-7);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;ctx.fillStyle='#26343b';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(6,-5);ctx.lineTo(5,2);ctx.lineTo(0,7);ctx.lineTo(-5,2);ctx.lineTo(-6,-5);ctx.closePath();ctx.fill();
    ctx.fillStyle=gold;ctx.fillRect(-.8,-5,1.6,9);ctx.fillRect(-3.2,-1.5,6.4,1.6);
  }else{
    ctx.fillStyle=steel;ctx.beginPath();ctx.moveTo(-8,8);ctx.lineTo(1,-1);ctx.bezierCurveTo(-2,-8,4,-12,9,-9);
    ctx.lineTo(5,-5);ctx.lineTo(8,-2);ctx.lineTo(12,-6);ctx.bezierCurveTo(13,0,8,4,3,2);
    ctx.lineTo(-6,11);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#32424a';ctx.beginPath();ctx.arc(-6,8,1.3,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
