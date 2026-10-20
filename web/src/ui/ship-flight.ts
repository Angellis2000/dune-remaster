export type ShipPose = { x: number; y: number; w: number; h: number };

/** Presentation only: the original ROM still controls cues and flight duration. */
export class ShipFlight {
  private static framesByImage = new WeakMap<ImageBitmap, HTMLCanvasElement[][]>();
  private frames: HTMLCanvasElement[][] | null = null;
  private image: ImageBitmap | null = null;
  private composite = document.createElement('canvas');
  private axes=new WeakMap<HTMLCanvasElement,number>();
  private nozzles=new WeakMap<HTMLCanvasElement,{x:number;y:number}[]>();

  constructor(private poses: ShipPose[], private house: number, private firstFrame: number) {}

  static preload(image: ImageBitmap): void {
    new ShipFlight([], 0, 0).prepare(image);
  }

  private prepare(image: ImageBitmap): HTMLCanvasElement[][] {
    if (this.image === image && this.frames) return this.frames;
    const cached = ShipFlight.framesByImage.get(image);
    if (cached) { this.image = image; return this.frames = cached; }
    const atlas = document.createElement('canvas');
    atlas.width = image.width; atlas.height = image.height;
    const ctx = atlas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, atlas.width, atlas.height).data;
    this.image = image;
    this.frames = Array.from({ length: 3 }, (_, row) => Array.from({ length: 5 }, (_, col) => {
      // Generated silhouettes cross nominal grid lines. Use their authored
      // transparent gutters, never an equal-cell cut through a neighbouring hull.
      const columns=[[[25,341],[357,652],[688,931],[967,1261],[1279,1600]],[[23,342],[373,648],[673,946],[970,1248],[1279,1602]],[[19,366],[376,661],[693,927],[959,1246],[1254,1604]]];
      const rows=[[14,284],[319,610],[645,935]];
      const x0=Math.max(0,Math.floor((columns[row][col][0]-3)*atlas.width/1619)),x1=Math.min(atlas.width,Math.ceil((columns[row][col][1]+3)*atlas.width/1619));
      const y0=Math.max(0,Math.floor((rows[row][0]-3)*atlas.height/971)),y1=Math.min(atlas.height,Math.ceil((rows[row][1]+3)*atlas.height/971));
      let left = x1, right = x0, top = y1, bottom = y0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (pixels[(y * atlas.width + x) * 4 + 3] > 32) {
          left = Math.min(left, x); right = Math.max(right, x + 1);
          top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
        }
      }
      // Trim alpha padding independently, keeping every view centered on the hull.
      left = Math.max(x0, left - 2); right = Math.min(x1, right + 2);
      top = Math.max(y0, top - 2); bottom = Math.min(y1, bottom + 2);
      const frame = document.createElement('canvas');
      frame.width = Math.max(1, right - left); frame.height = Math.max(1, bottom - top);
      frame.getContext('2d')!.drawImage(image, left, top, frame.width, frame.height, 0, 0, frame.width, frame.height);
      return frame;
    }));
    ShipFlight.framesByImage.set(image, this.frames);
    return this.frames;
  }

  pose(frame: number): ShipPose & { progress: number; angle: number; rotation:number; heading:number; opacity: number } {
    const last = this.poses.length - 1;
    const progress = Math.max(0, Math.min(1, (frame-this.firstFrame)/(this.poses.length*3-1)));
    const f=progress;
    const center = (j: number, axis: 'x' | 'y') => {
      const p = this.poses[Math.max(0, Math.min(last, j))];
      const margin=5+50*(1-j/Math.max(1,last))**2;
      return Math.max(margin,Math.min((axis==='x'?320:224)-margin,p[axis]+(axis==='x'?p.w:p.h)/2));
    };
    // Four ROM landmarks form a continuous curve; following all sprite-bound
    // centres carried their original frame-to-frame trim wobble into HD motion.
    const points=[0,Math.round(last/3),Math.round(last*2/3),last];
    const b=[(1-f)**3,3*(1-f)**2*f,3*(1-f)*f*f,f**3];
    const db=[-3*(1-f)**2,3*(1-f)**2-6*(1-f)*f,6*(1-f)*f-3*f*f,3*f*f];
    let x = 0, y = 0,dx=0,dy=0;
    for (let j = 0; j < 4; j++) {
      x += center(points[j], 'x') * b[j]; y += center(points[j], 'y') * b[j];
      dx+=center(points[j],'x')*db[j];dy+=center(points[j],'y')*db[j];
    }
    if(Math.hypot(dx,dy)<.001){dx=center(last,'x')-center(last-1,'x');dy=center(last,'y')-center(last-1,'y');}
    const smooth = progress * progress * (3-2*progress);
    const w = this.poses[0].w * (Math.max(6, this.poses[last].w * .55) / this.poses[0].w) ** smooth;
    const heading=Math.atan2(dy,dx);
    const tx=center(last,'x')-center(0,'x'),ty=center(last,'y')-center(0,'y');
    const angle=Math.round(2+2*tx/Math.max(.001,Math.hypot(tx,ty)));
    // The atlas nose axis is -Y with ±55° yaw. Rotate the projected nose to
    // the actual path tangent; a time-based yaw made ships drift sideways.
    const yaw=(angle-2)*55*Math.PI/360;
    const rotation=heading+Math.PI/2-yaw;
    const opacity = Math.min(1,progress*12,(1-progress)*10);
    return { x, y, w, h: w, progress, angle, rotation,heading, opacity };
  }

  draw(ctx: CanvasRenderingContext2D, image: ImageBitmap, frame: number): void {
    const views = this.prepare(image)[this.house];
    const p = this.pose(frame), a = Math.floor(p.angle), mix = p.angle-a;
    // Blend in a separate surface: source-over on the scene would darken the first pose.
    const canvas = this.composite;
    if (canvas.width !== 512 || canvas.height!==512) { canvas.width = 512; canvas.height = 512; }
    const c = canvas.getContext('2d')!;
    c.clearRect(0,0,canvas.width,canvas.height);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1-mix;
    const draw=(view:HTMLCanvasElement)=>{
      const scale=480/Math.max(view.width,view.height),w=view.width*scale,h=view.height*scale;
      c.drawImage(view,(512-w)/2,(512-h)/2,w,h);
    };
    draw(views[a]);
    if (mix > 0) {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = mix;
      draw(views[Math.min(4,a+1)]);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalAlpha *= p.opacity;
    ctx.translate(p.x,p.y);
    let axis=this.axes.get(views[a]);
    if(axis===undefined){
      const view=views[a],px=view.getContext('2d')!.getImageData(0,0,view.width,view.height).data;
      let nx=0,ny=0,n=0,tx=0,ty=0,total=0;
      for(let y=0;y<view.height;y++)for(let x=0;x<view.width;x++){
        const i=(y*view.width+x)*4;if(px[i+3]<100)continue;
        if(y<view.height*.17){nx+=x;ny+=y;n++;}
        const channel=this.house===0?0:this.house===1?2:1;
        const light=px[i+channel],other=Math.max(px[i+(channel+1)%3],px[i+(channel+2)%3]);
        if(y>view.height*.4&&light>150&&light>other*1.65){const weight=light-other;tx+=x*weight;ty+=y*weight;total+=weight;}
      }
      axis=n&&total?Math.atan2(ny/n-ty/total,nx/n-tx/total):-Math.PI/2+(a-2)*55*Math.PI/360;
      this.axes.set(view,axis);
    }
    ctx.rotate(p.heading-axis);
    this.drawThrust(ctx,views[a],axis,p.w,frame);
    ctx.drawImage(canvas,-p.w/2,-p.h/2,p.w,p.h);
    ctx.restore();
  }

  private drawThrust(ctx:CanvasRenderingContext2D,view:HTMLCanvasElement,axis:number,size:number,frame:number):void {
    let points=this.nozzles.get(view);
    if(!points){
      const w=view.width,h=view.height,pixels=view.getContext('2d')!.getImageData(0,0,w,h).data;
      const mask=new Uint8Array(w*h),channel=this.house===0?0:this.house===1?2:1;
      for(let y=Math.floor(h*.4);y<h;y++)for(let x=0;x<w;x++){
        const i=(y*w+x)*4,light=pixels[i+channel],other=Math.max(pixels[i+(channel+1)%3],pixels[i+(channel+2)%3]);
        if(pixels[i+3]>100&&light>150&&light>other*1.65)mask[y*w+x]=1;
      }
      const clusters:{x:number;y:number;weight:number}[]=[];
      for(let start=0;start<mask.length;start++)if(mask[start]){
        const queue=[start];mask[start]=0;let x=0,y=0;
        for(let q=0;q<queue.length;q++){
          const i=queue[q],ix=i%w,iy=Math.floor(i/w);x+=ix;y+=iy;
          for(const j of [ix>0?i-1:-1,ix<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<mask.length&&mask[j]){mask[j]=0;queue.push(j);}
        }
        if(queue.length>=4)clusters.push({x:x/queue.length,y:y/queue.length,weight:queue.length});
      }
      clusters.sort((a,b)=>b.weight-a.weight);points=[];
      for(const candidate of clusters)if(points.every(p=>Math.hypot(p.x-candidate.x,p.y-candidate.y)>w*.12)){
        points.push(candidate);if(points.length===2)break;
      }
      this.nozzles.set(view,points);
    }
    const scale=480/Math.max(view.width,view.height)*size/512;
    const color=this.house===0?'255,55,24':this.house===1?'40,156,255':'65,235,115';
    ctx.save();ctx.globalCompositeOperation='lighter';
    points.forEach((point,k)=>{
      ctx.save();ctx.translate((point.x-view.width/2)*scale,(point.y-view.height/2)*scale);ctx.rotate(axis+Math.PI);
      const pulse=1+.12*Math.sin(frame*.63+k*1.7)+.07*Math.sin(frame*1.19+k);
      const length=size*.46*pulse,r=size*.055;
      const plume=ctx.createLinearGradient(0,0,length,0);
      plume.addColorStop(0,'rgba(235,248,255,.94)');plume.addColorStop(.18,`rgba(${color},.8)`);
      plume.addColorStop(.65,`rgba(${color},.19)`);plume.addColorStop(1,`rgba(${color},0)`);
      ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(-r*.3,-r);
      ctx.bezierCurveTo(length*.25,-r*1.4,length*.65,-r*.45,length,0);
      ctx.bezierCurveTo(length*.65,r*.45,length*.25,r*1.4,-r*.3,r);ctx.closePath();ctx.fill();
      const glow=ctx.createRadialGradient(0,0,0,0,0,r*2.7);glow.addColorStop(0,'#effbffdd');glow.addColorStop(.28,`rgba(${color},.6)`);glow.addColorStop(1,`rgba(${color},0)`);
      ctx.fillStyle=glow;ctx.fillRect(-r*2.7,-r*2.7,r*5.4,r*5.4);
      const opacity=ctx.globalAlpha;
      for(let j=0;j<4;j++){
        const age=(frame*.027+j*.25+k*.13)%1;ctx.globalAlpha=opacity*(1-age)*.3;
        ctx.fillStyle=`rgb(${color})`;ctx.beginPath();ctx.ellipse(length*(.7+age),Math.sin(j*2.3+k)*r*age,r*.2,r*.12,0,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    });ctx.restore();
  }
}
