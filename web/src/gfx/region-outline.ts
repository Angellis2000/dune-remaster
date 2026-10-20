type Point={x:number;y:number};
/** Trace the ROM silhouette, remove its one-pixel staircase, then round only
 * short local corners. Region coordinates and political ownership stay intact. */
export function smoothRegionOutline(outside:Uint8Array,w:number,h:number):Path2D {
  const edges=new Map<string,Point[]>(),key=(p:Point)=>`${p.x},${p.y}`;
  const add=(x:number,y:number,nx:number,ny:number)=>{const k=`${x},${y}`,list=edges.get(k)??[];list.push({x:nx,y:ny});edges.set(k,list);};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!outside[y*w+x]){
    if(!y||outside[(y-1)*w+x])add(x,y,x+1,y);
    if(x===w-1||outside[y*w+x+1])add(x+1,y,x+1,y+1);
    if(y===h-1||outside[(y+1)*w+x])add(x+1,y+1,x,y+1);
    if(!x||outside[y*w+x-1])add(x,y+1,x,y);
  }
  const simplify=(points:Point[]):Point[]=>{
    if(points.length<3)return points;
    const a=points[0],b=points.at(-1)!,dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
    let far=0,index=0;
    for(let i=1;i<points.length-1;i++){
      const p=points[i],t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
      const d=(p.x-a.x-t*dx)**2+(p.y-a.y-t*dy)**2;
      if(d>far){far=d;index=i;}
    }
    return far>.65**2?[...simplify(points.slice(0,index+1)).slice(0,-1),...simplify(points.slice(index))]:[a,b];
  };
  const path=new Path2D();
  while(edges.size){
    const start=edges.keys().next().value!,[x,y]=start.split(',').map(Number),points:Point[]=[{x,y}];
    let current=start;
    for(let count=0;count<w*h*4;count++){
      const list=edges.get(current);if(!list?.length)break;
      const next=list.pop()!;if(!list.length)edges.delete(current);current=key(next);
      if(current===start)break;points.push(next);
    }
    if(points.length<3)continue;
    let far=1;
    for(let i=2;i<points.length;i++)if((points[i].x-x)**2+(points[i].y-y)**2>(points[far].x-x)**2+(points[far].y-y)**2)far=i;
    const clean=[...simplify(points.slice(0,far+1)).slice(0,-1),...simplify([...points.slice(far),points[0]]).slice(0,-1)];
    let dense:Point[]=[];
    clean.forEach((a,i)=>{const b=clean[(i+1)%clean.length],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));
      for(let j=0;j<n;j++)dense.push({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n});});
    for(let pass=0;pass<2;pass++){
      const rounded:Point[]=[];dense.forEach((a,i)=>{const b=dense[(i+1)%dense.length];
        rounded.push({x:a.x*.75+b.x*.25,y:a.y*.75+b.y*.25},{x:a.x*.25+b.x*.75,y:a.y*.25+b.y*.75});});dense=rounded;
    }
    path.moveTo(dense[0].x,dense[0].y);for(const p of dense.slice(1))path.lineTo(p.x,p.y);path.closePath();
  }
  return path;
}
