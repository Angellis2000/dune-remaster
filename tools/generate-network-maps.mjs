import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';import{fileURLToPath}from'node:url';
import{createRequire}from'node:module';
const root=fileURLToPath(new URL('../',import.meta.url));
const {createCanvas,loadImage}=createRequire('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('@napi-rs/canvas');
const out=path.join(root,'web/public/maps/network');await mkdir(out,{recursive:true});
const definitions=[['rift-valley','Долина раскола',192,173,'Разорванные горные гряды, ущелья и большие плато'],['worm-ring','Кольцо Шаи-Хулуда',256,821,'Скалистые дуги вокруг спайсового бассейна и длинные обходы'],['imperial-frontier','Рубеж императора',320,2026,'Просторные дюнные поля, горные хребты и узкие проходы']];
const hash=(x,y,s)=>{let n=Math.imul(x+307,374761393)^Math.imul(y+719,668265263)^s;n=Math.imul(n^(n>>>13),1274126177);return(n^(n>>>16))>>>0;};
const mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
function noise(x,y,s){const ix=Math.floor(x),iy=Math.floor(y),tx=smooth(x-ix),ty=smooth(y-iy);return mix(mix(hash(ix,iy,s)/4294967295,hash(ix+1,iy,s)/4294967295,tx),mix(hash(ix,iy+1,s)/4294967295,hash(ix+1,iy+1,s)/4294967295,tx),ty);}
const fbm=(x,y,s)=>noise(x*.05,y*.05,s)*.6+noise(x*.13,y*.13,s+7)*.3+noise(x*.3,y*.3,s+19)*.1;
const source=await loadImage(path.join(root,'web/src/gfx/assets/map-hd/materials.png')),texture=createCanvas(768,768);
texture.getContext('2d').drawImage(source,0,0,768,768);const tex=texture.getContext('2d').getImageData(0,0,768,768).data;
// Crossfade overlapping texture borders; retain dune direction instead of mirror tiling.
const period=352,seam=32,tileTex=new Uint8Array(4*period*period*3);
for(let m=0;m<4;m++)for(let y=0;y<period;y++)for(let x=0;x<period;x++){
 const ax=x<seam?smooth(x/seam):1,ay=y<seam?smooth(y/seam):1;
 for(let c=0;c<3;c++){let value=0;for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++){
  const w=(sx?1-ax:ax)*(sy?1-ay:ay);if(!w)continue;
  value+=tex[((y+sy*period+(m>>1)*384)*768+x+sx*period+(m%2)*384)*4+c]*w;
 }tileTex[((m*period+y)*period+x)*3+c]=Math.round(value);}
}
const catalog=[];
for(const teamSize of [1,2,3,4])for(const[baseId,name,baseSize,baseSeed,description]of definitions){
 const id=teamSize===4?baseId:`${baseId}-${teamSize}v${teamSize}`,n=Math.round(baseSize*Math.sqrt(teamSize/4)/32)*32,seed=baseSeed+(4-teamSize)*1097;
 const terrain=new Uint8Array(n*n),heights=new Float32Array(n*n),spawns=[];
 const naturalHeight=(x,y)=>{
  const wx=x+(noise(x*.03,y*.03,seed+7)-.5)*18,wy=y+(noise(x*.03,y*.03,seed+13)-.5)*18,r=Math.hypot(wx-n/2,wy-n/2)/n;
  let h=fbm(wx,wy,seed)*7.7;
  if(baseId==='rift-valley')h+=Math.exp(-Math.pow((wx-n*.46)/(n*.085),2))*2.3;
  if(baseId==='worm-ring')h+=Math.exp(-Math.pow((r-.28)/.045,2))*3;
  if(baseId==='imperial-frontier')h+=Math.max(0,Math.sin(wx*.12+wy*.055+noise(wx*.05,wy*.05,seed)*4))*1.8;
  return h;
 };
 // Average two continuous fields everywhere instead of joining unrelated half-maps.
 for(let y=0;y<n;y++)for(let x=0;x<n/2;x++){
  const h=Math.min(9,(naturalHeight(x,y)+naturalHeight(n-1-x,n-1-y))*.5);
  const dune=(fbm(x+90,y+80,seed)+fbm(n-1-x+90,n-1-y+80,seed))*.5;
  const kind=h>6.3?3:h>4.65?2:dune>.51?1:0;
  for(const p of [y*n+x,(n-1-y)*n+(n-1-x)]){terrain[p]=kind;heights[p]=h;}
 }
 const disc=(x,y,r,kind,height)=>{for(let yy=Math.max(0,y-r-4);yy<=Math.min(n-1,y+r+4);yy++)for(let xx=Math.max(0,x-r-4);xx<=Math.min(n-1,x+r+4);xx++){
   const d=Math.hypot(xx-x,(yy-y)*1.15),edge=r+(noise(xx*.24,yy*.24,seed+x+y)-.5)*6;
   if(d>edge&&!(kind===2&&d<6))continue;
   const p=yy*n+xx;if(kind===0&&terrain[p]!==3)continue;
   terrain[p]=kind===0?2:kind;heights[p]=height+noise(xx*.2,yy*.2,seed)*.4;
 }};
 const line=(x1,y1,x2,y2,r)=>{const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=steps;i++){
   const t=i/steps,bend=Math.sin(t*Math.PI)*Math.sin(t*Math.PI*2+x1*.1)*n*.035;
   disc(Math.round(x1+(x2-x1)*t),Math.round(y1+(y2-y1)*t+bend),r,0,5.4);
 }};
 const cornerStarts=teamSize===1?[[.19,.19]]:teamSize===2?[[.16,.16],[.16,.84]]:teamSize===3?[[.14,.14],[.12,.5],[.14,.86]]:[[.12,.16],[.30,.10],[.12,.84],[.30,.90]];
 for(const [id,[sx,sy]]of cornerStarts.entries()){
  const x=Math.round(n*sx),y=Math.round(n*sy);
  spawns.push({id,team:0,x,y},{id:teamSize+id,team:1,x:n-1-x,y:n-1-y});
 }
 line(n/2,8,n/2,n-9,4);
 for(const s of spawns)line(s.x,s.y,n/2,s.y,3);
 // Every player gets the same protected plateau mask, including identical clear corners.
 const baseRadius=Math.max(14,Math.round(n*.06)),baseCells=[];
 for(let dy=-baseRadius;dy<=baseRadius;dy++)for(let dx=-baseRadius;dx<=baseRadius;dx++){
  const edge=baseRadius-1+(noise(dx*.21+20,dy*.21+20,240)-.5)*4;
  if(Math.hypot(dx,dy*1.05)>edge)continue;baseCells.push({dx,dy});
 }
 const startingBuildAreas=[];
 for(const s of spawns){
  for(let dy=-baseRadius-2;dy<=baseRadius+2;dy++)for(let dx=-baseRadius-2;dx<=baseRadius+2;dx++){
   const edge=baseRadius+2+(noise(dx*.21+20,dy*.21+20,240)-.5)*4;
   if(Math.hypot(dx,dy*1.05)>edge)continue;
   const p=(s.y+dy)*n+s.x+dx;terrain[p]=0;heights[p]=4.65;
  }
  const cells=baseCells.map(({dx,dy})=>({x:s.x+(s.team?-dx:dx),y:s.y+(s.team?-dy:dy)}));
  for(const {x,y}of cells){terrain[y*n+x]=2;heights[y*n+x]=5;}
  startingBuildAreas.push({spawn:s.id,tiles:cells.length,cells});
 }
 const insideBase=(x,y)=>spawns.some(s=>{const dx=(x-s.x)*(s.team?-1:1),dy=(y-s.y)*(s.team?-1:1),edge=baseRadius+2+(noise(dx*.21+20,dy*.21+20,240)-.5)*4;return Math.hypot(dx,dy*1.05)<=edge;});
 const reachable=new Uint8Array(n*n),route=new Int32Array(n*n);let head=0,tail=1;route[0]=spawns[0].y*n+spawns[0].x;reachable[route[0]]=1;
 while(head<tail){const p=route[head++],x=p%n,y=Math.floor(p/n);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,q=yy*n+xx;if(xx<0||xx>=n||yy<0||yy>=n||reachable[q]||terrain[q]===3||Math.abs(Math.round(heights[p])-Math.round(heights[q]))>=3)continue;reachable[q]=1;route[tail++]=q;}}
 const startingResources=[];
 for(const s of spawns.filter(s=>s.team===0)){
  const budget=Math.max(240,Math.floor(n*n*.048/teamSize)),radius=Math.ceil(Math.sqrt(budget)*1.15);
  const inward=s.y<n/2?1:-1,vertical=s.id%2===1||teamSize===1;
  const cx=s.x+(vertical?0:baseRadius+10),cy=s.y+(vertical?inward*(baseRadius+10):-6),candidates=[];
  for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++){
   if(x<1||y<1||x>=n/2||y>=n-1||!reachable[y*n+x]||insideBase(x,y)||terrain[y*n+x]===3||terrain[y*n+x]>=4)continue;
   candidates.push({x,y,score:Math.hypot((x-cx)*.8,(y-cy)*1.2)+(noise(x*.3,y*.3,seed+s.id)-.5)*6});
  }
  candidates.sort((a,b)=>a.score-b.score);if(candidates.length<budget)throw Error(`${id}: resource budget for start ${s.id}`);
  const rich=Math.floor(budget*.2),normal=budget-rich,cells=candidates.slice(0,budget).map(({x,y},i)=>({x,y,terrain:i<rich?5:4}));
  for(const cell of cells)terrain[cell.y*n+cell.x]=cell.terrain;
  startingResources.push({spawn:s.id,normal,rich,cells},{spawn:s.id+teamSize,normal,rich,cells:cells.map(cell=>({...cell,x:n-1-cell.x,y:n-1-cell.y}))});
 }
 // Broad irregular neutral fields reward map control; keep home plateaus and mountains intact.
 for(const yy of [.25,.5,.75]){const cx=Math.round(n*.40),cy=Math.round(n*yy),r=n*.055;
  for(let y=Math.floor(cy-r*1.4);y<=cy+r*1.4;y++)for(let x=Math.floor(cx-r*1.4);x<n/2&&x<=cx+r*1.4;x++){
   if(x<1||y<1||y>=n-1||insideBase(x,y))continue;
   const p=y*n+x,d=Math.hypot((x-cx)*.85,(y-cy)*1.15),edge=r+(noise(x*.19,y*.19,seed+cy)-.5)*r*.65;
   if(d>edge||terrain[p]===3||terrain[p]>=4)continue;terrain[p]=d<r*.35?5:4;
  }
 }
 // Rotational symmetry preserves natural contours and identical opposing terrain.
 for(let y=0;y<n;y++)for(let x=0;x<n/2;x++){const from=y*n+x,to=(n-1-y)*n+n-1-x;terrain[to]=terrain[from];heights[to]=heights[from];}
 spawns.sort((a,b)=>a.id-b.id);
 const rows=data=>Array.from({length:n},(_,y)=>Array.from(data.slice(y*n,(y+1)*n),v=>String(Math.round(v))).join(''));
const map={schema:'dune-network-map/v1',id,name,description,width:n,height:n,seed,capacity:teamSize*2,teams:[teamSize,teamSize],tileSize:32,rules:{infiniteSpice:true,friendlyFire:false},terrainLegend:{0:'sand',1:'dunes',2:'buildable-rock',3:'impassable-mountain',4:'spice',5:'rich-spice'},impassableTerrain:[3],cliffRule:{minimumHeightDelta:3,requiresRamp:true},terrain:rows(terrain),heightmap:rows(heights),spawns,spawnPolicy:'shuffle-within-team',startingBuildAreas,startingResources,neutralExpansions:6};
 await writeFile(path.join(out,id+'.json'),JSON.stringify(map));
 const previewSize=1536,canvas=createCanvas(previewSize,previewSize),ctx=canvas.getContext('2d'),image=ctx.createImageData(previewSize,previewSize);
 const at=(data,x,y)=>data[Math.max(0,Math.min(n-1,y))*n+Math.max(0,Math.min(n-1,x))];
 const height=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);return mix(mix(at(heights,ix,iy),at(heights,ix+1,iy),x-ix),mix(at(heights,ix,iy+1),at(heights,ix+1,iy+1),x-ix),y-iy);};
 for(let yy=0;yy<previewSize;yy++)for(let xx=0;xx<previewSize;xx++){
  const x=xx*n/previewSize,y=yy*n/previewSize,ix=Math.floor(x),iy=Math.floor(y),h=height(x,y),dx=h-height(x-.5,y),dy=h-height(x,y-.5);
  const weights=[0,0,0,0];
  for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++){const kind=at(terrain,ix+sx,iy+sy),w=(sx?x-ix:1-x+ix)*(sy?y-iy:1-y+iy);weights[kind>=4?kind-2:kind>=2?1:0]+=w;}
  const tx=(Math.floor(xx*.95+Math.sin(yy*.019)*17)%period+period)%period,ty=(Math.floor(yy*.95+Math.cos(xx*.017)*17)%period+period)%period;
  const shade=Math.max(.52,Math.min(1.32,1+(dx+dy)*.24+(h-4)*.025)),j=(yy*previewSize+xx)*4;
  for(let c=0;c<3;c++){let color=0;for(let m=0;m<4;m++)color+=tileTex[((m*period+ty)*period+tx)*3+c]*weights[m];image.data[j+c]=Math.min(255,color*shade);}image.data[j+3]=255;
 }
 ctx.putImageData(image,0,0);
 for(const s of spawns){const x=(s.x+.5)/n*previewSize,y=(s.y+.5)/n*previewSize;ctx.beginPath();ctx.arc(x,y,16,0,Math.PI*2);ctx.fillStyle=s.team?'#bf4939':'#3575b8';ctx.fill();ctx.strokeStyle='#ffe2a1';ctx.lineWidth=2;ctx.stroke();ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff5d7';ctx.fillText(String(s.id+1),x,y);}
 await writeFile(path.join(out,id+'.png'),canvas.toBuffer('image/png'));
 catalog.push({id,name,description,width:n,height:n,teamSize,capacity:teamSize*2,preview:`./maps/network/${id}.png?v=${n}-continuous6`,data:`./maps/network/${id}.json`});
}
await writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2));
console.log('Generated 12 distinct natural maps: three landscapes for each format 1v1, 2v2, 3v3, 4v4.');

