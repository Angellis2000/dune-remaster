/**
 * Фон за краем карты (виден, когда камера уходит из-под правого меню): «ночная пустыня» в тонах HUD — тёмно-бурый
 * песок с рябью дюн, редкие песчинки и слабая тактическая сетка; на границе поля — тень наружу и тонкая
 * золотистая рамка (#8B7650, как у панели «СПАЙС»). Узор привязан к миру и едет вместе с картой.
 */
import desertUrl from './assets/map-hd/outside-desert-v1.png?url';
const desert=new Image();desert.src=desertUrl;
const TILE = 256;
let pattern: HTMLCanvasElement | null = null;
desert.onload=()=>{pattern=null;};

function texture(): HTMLCanvasElement {
  if (pattern) return pattern;
  if(desert.complete&&desert.naturalWidth){
    const c=document.createElement('canvas');c.width=c.height=1024;
    const g=c.getContext('2d')!;
    // Mirrored neighbouring patches share exact edge texels, without hard tile seams.
    for(let y=0;y<2;y++)for(let x=0;x<2;x++){
      g.save();g.translate(x?1024:0,y?1024:0);g.scale(x?-1:1,y?-1:1);g.drawImage(desert,0,0,512,512);g.restore();
    }
    g.fillStyle='#17212c40';g.fillRect(0,0,1024,1024);
    return pattern=c;
  }
  const c = document.createElement('canvas'); c.width = c.height = TILE;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1e1913'; g.fillRect(0, 0, TILE, TILE);
  // рябь дюн: пологие волны, бесшовные по ширине (целое число периодов на 256)
  g.lineWidth = 1.2;
  for (let row = 0; row < 16; row++) {
    const y0 = row * 16 + 4;
    g.strokeStyle = row % 2 ? 'rgba(150,120,78,.22)' : 'rgba(176,142,92,.14)';
    g.beginPath();
    for (let x = 0; x <= TILE; x += 4) {
      const y = y0 + Math.sin((x / TILE) * Math.PI * 4 + row * 1.7) * 3 + Math.sin((x / TILE) * Math.PI * 2 + row) * 2;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  // песчинки — детерминированный хеш, без Math.random
  for (let i = 0; i < 260; i++) {
    let h = Math.imul(i + 1, 0x9e3779b1) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0;
    const x = h % TILE, y = (h >>> 8) % TILE, a = .08 + ((h >>> 16) & 15) / 120;
    g.fillStyle = `rgba(214,180,120,${a})`; g.fillRect(x, y, 1, 1);
  }
  // тактическая сетка раз в 2 клетки
  g.strokeStyle = 'rgba(195,184,158,.08)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(.5, 0); g.lineTo(.5, TILE); g.moveTo(0, .5); g.lineTo(TILE, .5);
  g.moveTo(TILE / 2 + .5, 0); g.lineTo(TILE / 2 + .5, TILE); g.moveTo(0, TILE / 2 + .5); g.lineTo(TILE, TILE / 2 + .5); g.stroke();
  return pattern = c;
}

/**
 * Закрасить всё вне поля (bx…bx+bw, by…by+bh — мировые точки) и обвести поле. Экран: x = мир·z − ox.
 */
export function drawMapBackdrop(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number,
  z: number, ox: number, oy: number, width: number, height: number): void {
  const x = bx * z - ox, y = by * z - oy, w = bw * z, h = bh * z;
  if (x <= 0 && y <= 0 && x + w >= width && y + h >= height) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, width, height); ctx.rect(x, y, w, h); ctx.clip('evenodd');
  const p = ctx.createPattern(texture(), 'repeat')!;
  const scale=desert.complete&&desert.naturalWidth?z*2:z/2;
  p.setTransform(new DOMMatrix([scale, 0, 0, scale, -ox, -oy]));
  ctx.fillStyle = p; ctx.fillRect(0, 0, width, height);
  // тень от края поля наружу
  const d = 28 * z;
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [
    [x, 0, x - d, 0, x - d, y - d, d, h + 2 * d], [x + w, 0, x + w + d, 0, x + w, y - d, d, h + 2 * d],
    [0, y, 0, y - d, x - d, y - d, w + 2 * d, d], [0, y + h, 0, y + h + d, x - d, y + h, w + 2 * d, d],
  ] as const) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
  }
  ctx.restore();
  // рамка поля
  ctx.save();
  ctx.strokeStyle = '#8b7650'; ctx.lineWidth = Math.max(1, z * .6);
  ctx.strokeRect(x - ctx.lineWidth / 2, y - ctx.lineWidth / 2, w + ctx.lineWidth, h + ctx.lineWidth);
  ctx.strokeStyle = 'rgba(255,228,170,.18)'; ctx.lineWidth = 1;
  ctx.strokeRect(x - z * 1.6, y - z * 1.6, w + z * 3.2, h + z * 3.2);
  ctx.restore();
}
