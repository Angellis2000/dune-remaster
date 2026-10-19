/** Connected concrete-and-steel defensive walls, drawn in screen resolution. N/E/S/W bits. */
export function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, connections: number, texture?: CanvasImageSource): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 32, size / 32);
  // The same visible concrete foundation used beneath base structures.
  ctx.fillStyle='#514e45';ctx.fillRect(0,2,32,30);
  const base=ctx.createLinearGradient(0,0,28,32);
  base.addColorStop(0,'#b4ad96');base.addColorStop(.5,'#928b78');base.addColorStop(1,'#746e60');
  ctx.fillStyle=base;ctx.fillRect(0,0,32,30);
  if(texture){ctx.save();ctx.globalAlpha=.22;ctx.drawImage(texture,0,0,32,30);ctx.restore();}
  ctx.strokeStyle='#ded7bd88';ctx.lineWidth=.6;ctx.strokeRect(.5,.5,31,29);
  ctx.strokeStyle='#5e594c66';ctx.lineWidth=.35;
  for(const cut of [8,24]){ctx.beginPath();ctx.moveTo(cut,0);ctx.lineTo(cut,30);ctx.stroke();}
  const footprint = () => {
    ctx.beginPath(); ctx.rect(9, 9, 14, 14);
    if (connections & 1) ctx.rect(10, 0, 12, 16);
    if (connections & 2) ctx.rect(16, 10, 16, 12);
    if (connections & 4) ctx.rect(10, 16, 12, 16);
    if (connections & 8) ctx.rect(0, 10, 16, 12);
  };
  ctx.save(); ctx.translate(1, 3); footprint(); ctx.fillStyle = '#0a0b0c70'; ctx.fill(); ctx.restore();
  footprint(); ctx.fillStyle = '#504c43'; ctx.fill();
  ctx.save(); ctx.translate(0, -2); footprint();
  const concrete = ctx.createLinearGradient(0, 4, 24, 27);
  concrete.addColorStop(0, '#d4c6a4'); concrete.addColorStop(.45, '#a89c82'); concrete.addColorStop(1, '#817966');
  ctx.fillStyle = concrete; ctx.fill(); ctx.clip();
  if (texture) {ctx.save();ctx.globalAlpha=.65;ctx.drawImage(texture,0,0,32,32);ctx.restore();}
  ctx.strokeStyle = '#e7dcc0aa'; ctx.lineWidth = .6; footprint(); ctx.stroke();
  ctx.fillStyle = '#50595b'; ctx.fillRect(11, 11, 10, 10);
  ctx.fillStyle = '#98a1a0'; ctx.fillRect(11.5, 11.5, 9, 1);
  ctx.strokeStyle = '#302f2988'; ctx.lineWidth = .45;
  for (const a of [4, 27]) {ctx.beginPath();ctx.moveTo(a, 7);ctx.lineTo(a, 25);ctx.moveTo(7, a);ctx.lineTo(25, a);ctx.stroke();}
  ctx.fillStyle = '#252a2b';
  for (const [bx, by] of [[12, 14], [20, 14], [12, 19], [20, 19]]) {ctx.beginPath();ctx.arc(bx, by, .55, 0, Math.PI * 2);ctx.fill();}
  ctx.fillStyle = '#eadcba35';
  for (let i = 0; i < 26; i++) ctx.fillRect((i * 13 % 29) + 1, (i * 19 % 29) + 1, .35, .3);
  ctx.restore(); ctx.restore();
}
