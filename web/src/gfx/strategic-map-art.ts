import type { MentatGfx } from './mentat.ts';
import type { ScreenArt } from './screen-art.ts';
import {smoothRegionOutline} from './region-outline.ts';

// ROM ownership codes are fixed: neutral, Harkonnen, Atreides, Ordos.
export const TERRITORY_COLORS = ['#ca8e39', '#cc4431', '#286cbd', '#278f53'] as const;

interface RegionArt { image: HTMLCanvasElement; depth:HTMLCanvasElement; x: number; y: number; w: number; h: number; mapDx: number; mapDy: number }

/** Original region silhouettes and ownership, rendered with a detailed continuous terrain surface. */
export class StrategicMapArt {
  private scene = '';
  private regions = new Map<number, RegionArt>();
  private surfaces=new Map<number,HTMLCanvasElement>();
  constructor(private gfx: MentatGfx, private art?: ScreenArt) {}
  get ready(): boolean { return !!this.art?.get('strategicSurface'); }

  /** Preserve the authored directional light instead of flattening it with a soft-light tint. */
  private relief(owner:number):HTMLCanvasElement{
    const cached=this.surfaces.get(owner);if(cached)return cached;
    const source=this.art!.get('strategicSurface')!,c=document.createElement('canvas');
    c.width=source.width;c.height=source.height;
    const g=c.getContext('2d',{willReadFrequently:true})!;g.drawImage(source,0,0);
    if(owner===0){this.surfaces.set(owner,c);return c;}
    const im=g.getImageData(0,0,c.width,c.height),p=im.data;
    const hex=TERRITORY_COLORS[owner]??TERRITORY_COLORS[0];
    const base=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    for(let i=0;i<p.length;i+=4){
      const light=(p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722)/255;
      const q=Math.max(0,Math.min(1,(light-.06)/.85));
      const shade=.16+1.2*Math.pow(q,1.05);
      const glint=Math.max(0,(q-.78)/.22)*.07;
      p[i]=Math.min(255,base[0]*shade*.83+p[i]*.17+255*glint);
      p[i+1]=Math.min(255,base[1]*shade*.83+p[i+1]*.17+242*glint);
      p[i+2]=Math.min(255,base[2]*shade*.83+p[i+2]*.17+215*glint);
    }
    g.putImageData(im,0,0);this.surfaces.set(owner,c);return c;
  }

  private region(house: number, level: number, region: number): RegionArt {
    const scene = `${house}:${level}`;
    if (scene !== this.scene) { this.regions.clear(); this.scene = scene; }
    const cached = this.regions.get(region); if (cached) return cached;
    const palette = this.gfx.palette(house, level, 0);
    const pixels = new Uint32Array(320 * 224);
    this.gfx.drawRegion(pixels, region, this.gfx.pieceLine(this.gfx.regionColor(house, level, region)), 0, palette);
    const bounds = (data: Uint32Array) => {
      let x0 = 320, y0 = 224, x1 = 0, y1 = 0;
      for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) if (data[y * 320 + x] !== 0) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      return {x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1};
    };
    const box = bounds(pixels);
    const mapPixels = new Uint32Array(pixels.length);
    this.gfx.drawMap(mapPixels, house, level, palette, 1 << (9 - region));
    const mapBox = bounds(mapPixels);
    const w = box.w, h = box.h;
    // Flood only transparent pixels connected to the exterior: internal relief marks stay solid terrain.
    const outside = new Uint8Array(w * h), queue: number[] = [];
    const visit = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const p = y * w + x;
      if (outside[p] || pixels[(y + box.y) * 320 + x + box.x] !== 0) return;
      outside[p] = 1; queue.push(p);
    };
    for (let x = 0; x < w; x++) { visit(x, 0); visit(x, h - 1); }
    for (let y = 0; y < h; y++) { visit(0, y); visit(w - 1, y); }
    for (let i = 0; i < queue.length; i++) { const x = queue[i] % w, y = Math.floor(queue[i] / w); visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1); }
    const outline=smoothRegionOutline(outside,w,h);
    const mask = document.createElement('canvas'); mask.width = w*5; mask.height = h*5;
    const mg = mask.getContext('2d')!;mg.scale(5,5);mg.fillStyle='#fff';mg.fill(outline);
    const image = document.createElement('canvas'); image.width = w * 5; image.height = h * 5;
    const g = image.getContext('2d')!; g.scale(5, 5); g.imageSmoothingEnabled = true;
    const owner=this.gfx.regionColor(house,level,region);
    g.drawImage(this.relief(owner), -box.x, -box.y, 320, 224);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0,w,h);
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#070d16'; g.lineWidth = .8; g.lineCap = 'round'; g.lineJoin='round';
    g.stroke(outline);g.strokeStyle='#dde9f388';g.lineWidth=.15;g.stroke(outline);
    // The original regions have a solid lower edge, especially visible while falling.
    // Build that edge from the exact silhouette; never expand or move the top surface.
    const depth=document.createElement('canvas');depth.width=(w+2)*5;depth.height=(h+4)*5;
    const dg=depth.getContext('2d')!;dg.scale(5,5);
    const side=document.createElement('canvas');side.width=w;side.height=h;
    const sg=side.getContext('2d')!;
    const hex=TERRITORY_COLORS[owner]??TERRITORY_COLORS[0];
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    for(let y=3.5;y>=.5;y-=.5){
      sg.clearRect(0,0,w,h);sg.globalCompositeOperation='source-over';sg.drawImage(mask,0,0,w,h);
      sg.globalCompositeOperation='source-in';
      const shade=.18+(3.5-y)*.035;
      sg.fillStyle=`rgb(${rgb.map(c=>Math.round(c*shade)).join(',')})`;sg.fillRect(0,0,w,h);
      dg.drawImage(side,y*.24,y);
    }
    const result = {image,depth, ...box, mapDx: mapBox.x - box.x, mapDy: mapBox.y - box.y};
    this.regions.set(region, result); return result;
  }

  backdrop(ctx:CanvasRenderingContext2D,full:boolean):void{
    const glow=ctx.createRadialGradient(176,110,12,176,110,190);
    glow.addColorStop(0,'#15222c');glow.addColorStop(1,'#030609');
    ctx.fillStyle=glow;ctx.fillRect(-160,-100,640,424);
    ctx.save();ctx.strokeStyle='#6f9fae12';ctx.lineWidth=.2;
    for(let x=32;x<320;x+=16){ctx.beginPath();ctx.moveTo(x,24);ctx.lineTo(x,194);ctx.stroke();}
    for(let y=24;y<194;y+=16){ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(312,y);ctx.stroke();}
    if(full){
      ctx.textBaseline='top';ctx.textAlign='center';ctx.letterSpacing='.7px';
      ctx.font='600 7.5px Bahnschrift, "Segoe UI", sans-serif';ctx.fillStyle='#f1d59d';ctx.fillText('АРРАКИС',160,6);
      ctx.font='500 3.4px Bahnschrift, "Segoe UI", sans-serif';ctx.fillStyle='#a0b4c0';ctx.letterSpacing='.5px';ctx.fillText('КАРТА КАМПАНИИ',160,17);
      ctx.strokeStyle='#bb975f55';ctx.lineWidth=.3;ctx.beginPath();ctx.moveTo(24,16);ctx.lineTo(114,16);ctx.moveTo(206,16);ctx.lineTo(312,16);ctx.stroke();
      const names=['НЕЙТРАЛЬНО','ХАРКОННЕНЫ','АТРЕЙДЕСЫ','ОРДОСЫ'];
      ctx.textAlign='left';ctx.font='600 3.7px Bahnschrift, "Segoe UI", sans-serif';ctx.letterSpacing='.22px';
      names.forEach((name,i)=>{const x=27+i*72;ctx.fillStyle=TERRITORY_COLORS[i];ctx.fillRect(x,204,1.1,4.5);
        ctx.fillStyle='#c8d5dc';ctx.fillText(name,x+5,204.5);});
    }
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D, house: number, level: number, region: number, dx = 0, dy = 0, sprite = false): void {
    const r = this.region(house, level, region);
    const x=r.x+dx+(sprite?0:r.mapDx),y=r.y+dy+(sprite?0:r.mapDy);
    ctx.drawImage(r.depth,x,y,r.w+2,r.h+4);
    ctx.drawImage(r.image,x,y,r.w,r.h);
  }

  zoom(ctx: CanvasRenderingContext2D, house: number, level: number, region: number, hs: number, vs: number, scale: number): void {
    const r = this.region(house, level, region), own = this.gfx.regionPieces(true, region)[0];
    const x=48+hs+(r.x-own.x)*scale,y=72-vs+(r.y-own.y)*scale;
    ctx.drawImage(r.depth,x,y,(r.w+2)*scale,(r.h+4)*scale);
    ctx.drawImage(r.image,x,y,r.w*scale,r.h*scale);
  }
}
