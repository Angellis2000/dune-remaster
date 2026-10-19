/** Vector cursor art, cached at 8x resolution for packs and drawn directly in the game. */
import type {DuneRom} from '../rom/dune.ts';
export type CursorKind='select'|'move'|'attack'|'confirm';

export function drawSelection(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,z:number,tick=0,strong=false):void {
  const n=Math.min(6*z,w*.22,h*.22),line=Math.max(1,z*(strong?1:.7));
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  const path=()=>{ctx.beginPath();for(const [xx,yy,sx,sy]of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){
    ctx.moveTo(xx,yy+sy*n);ctx.lineTo(xx,yy);ctx.lineTo(xx+sx*n,yy);
  }};
  path();ctx.strokeStyle=strong?'#07121af5':'#14242ecc';ctx.lineWidth=line+Math.max(1,z*(strong?.85:.45));ctx.stroke();
  if(strong){ctx.shadowColor='#b5f5ff';ctx.shadowBlur=2*z;}
  path();ctx.strokeStyle=strong?'#efffff':`rgba(208,238,240,${.82+.12*Math.sin(tick/28)})`;ctx.lineWidth=line;ctx.stroke();ctx.restore();
}
export function drawCursor(ctx:CanvasRenderingContext2D,kind:CursorKind,x:number,y:number,size:number,tick=0):void {
  if(kind==='select'){const side=size*.92;drawSelection(ctx,x-side/2,y-side/2,side,side,side/32,tick);return;}
  ctx.save();ctx.translate(x,y);ctx.scale(size/32,size/32);ctx.lineCap='round';ctx.lineJoin='round';
  const accent=kind==='attack'?'#ffb47d':kind==='confirm'?'#a5ebbd':'#b9e6e8';
  ctx.strokeStyle='#15232cd9';ctx.lineWidth=2.2;
  const path=()=>{
    ctx.beginPath();
    if(kind==='move'){
      for(let i=0;i<4;i++){const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
        const p=(u:number,v:number)=>[u*c-v*s,u*s+v*c];const a0=p(-3,-11),a1=p(0,-7.5),a2=p(3,-11);
        ctx.moveTo(a0[0],a0[1]);ctx.lineTo(a1[0],a1[1]);ctx.lineTo(a2[0],a2[1]);}
    }else if(kind==='attack'){
      ctx.arc(0,0,9,0,Math.PI*2);for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.moveTo(Math.cos(a)*11,Math.sin(a)*11);ctx.lineTo(Math.cos(a)*14,Math.sin(a)*14);}
    }else{ctx.arc(0,0,11,0,Math.PI*2);ctx.moveTo(-6,0);ctx.lineTo(-1,5);ctx.lineTo(7,-5);}
  };
  path();ctx.stroke();ctx.strokeStyle=accent;ctx.lineWidth=.85;path();ctx.stroke();
  if(kind!=='confirm'){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(0,0,.9,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
export function buildCursors(_rom:DuneRom):Record<CursorKind,HTMLCanvasElement>{
  const out={} as Record<CursorKind,HTMLCanvasElement>;
  for(const kind of ['select','move','attack','confirm'] as const){const c=document.createElement('canvas');c.width=c.height=256;
    drawCursor(c.getContext('2d')!,kind,128,128,240);out[kind]=c;}
  return out;
}
