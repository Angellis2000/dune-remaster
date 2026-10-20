const spice=typeof Image==='undefined'?null:new Image();
if(spice)spice.src=new URL('./assets/frontend/frame-spice-v1.png',import.meta.url).href;
/** Keep authored corners and thin rails intact at any HUD size. */
export function drawSpiceFrame(ctx:CanvasRenderingContext2D,w:number,h:number):void{
  if(!spice?.complete||!spice.naturalWidth)return;
  const cut=Math.floor(Math.min(spice.width,spice.height)*.15),border=4;
  const sx=[0,cut,spice.width-cut],sy=[0,cut,spice.height-cut];
  const sw=[cut,spice.width-2*cut,cut],sh=[cut,spice.height-2*cut,cut];
  const dx=[0,border,w-border],dy=[0,border,h-border];
  const dw=[border,w-2*border,border],dh=[border,h-2*border,border];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)if(row!==1||col!==1)
    ctx.drawImage(spice,sx[col],sy[row],sw[col],sh[row],dx[col],dy[row],dw[col],dh[row]);
}
