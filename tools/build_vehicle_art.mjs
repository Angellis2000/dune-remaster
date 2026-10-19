import {createRequire} from 'node:module';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(root,'../hd-vehicles');
const target=path.join(root,'web/src/gfx/assets/vehicles-hd');
await mkdir(target,{recursive:true});
const gen='C:/Users/Admin/.codex/generated_images/01a14eb3-be5c-7531-a765-77307948a05a';
const files={bodies:'exec-d517bfec-504e-48f2-8171-80cbc9210210.png',mounts:'exec-08e5cff1-f8eb-4eb8-bcab-129210a200c2.png',particles:'exec-8bc2542d-5ba7-46b4-b6d9-507429e1def6.png',infantry:'exec-5902a722-ed83-4ef4-b6d1-85ff6030ac33.png'};
const bounds={};
for(const [name,file] of Object.entries(files)){
 await copyFile(path.join(gen,file),path.join(out,'sources',`${name}-generated.png`));
 const {data,info}=await sharp(path.join(gen,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const tiles=[];bounds[name]=[];
 for(let i=0;i<16;i++){
  const left=Math.round(i%4*info.width/4),right=Math.round((i%4+1)*info.width/4);
  const top=Math.round((i>>2)*info.height/4),bottom=Math.round(((i>>2)+1)*info.height/4);
  let x0=right,y0=bottom,x1=left,y1=top;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(data[(y*info.width+x)*4+3]>20){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if((name==='bodies'&&i<14)||(name==='mounts'&&i<9)||name==='infantry'){
   // A few authored silhouettes cross an atlas cell edge. Exclude tiny disconnected
   // fragments from the neighbouring object, but retain substantial detached wheels.
   const cw=right-left,ch=bottom-top,seen=new Uint8Array(cw*ch),components=[];
   for(let sy=0;sy<ch;sy++)for(let sx=0;sx<cw;sx++){
    const start=sy*cw+sx;if(seen[start]||data[((top+sy)*info.width+left+sx)*4+3]<=40)continue;
    const queue=[start];seen[start]=1;let a=cw,b=ch,c=0,d=0;
    for(let q=0;q<queue.length;q++){
     const n=queue[q],x=n%cw,y=Math.floor(n/cw);a=Math.min(a,x);b=Math.min(b,y);c=Math.max(c,x);d=Math.max(d,y);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const xx=x+dx,yy=y+dy,k=yy*cw+xx;if(xx<0||yy<0||xx>=cw||yy>=ch||seen[k])continue;
      if(data[((top+yy)*info.width+left+xx)*4+3]>40){seen[k]=1;queue.push(k);}
     }
    }
    components.push({count:queue.length,a,b,c,d});
   }
   const largest=Math.max(...components.map(v=>v.count));
   const kept=components.filter(v=>v.count>=Math.max(100,largest*.02)&&
     ((v.b>2&&v.d<ch-3)||v.count>=largest*.5));
   x0=left+Math.min(...kept.map(v=>v.a));x1=left+Math.max(...kept.map(v=>v.c));
   y0=top+Math.min(...kept.map(v=>v.b));y1=top+Math.max(...kept.map(v=>v.d));
  }
  const w=x1-x0+1,h=y1-y0+1;
  const pixels=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:w,height:h}).resize({width:224,height:224,fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  tiles.push({input:pixels,left:i%4*256+16,top:(i>>2)*256+16});
  bounds[name].push({index:i,source:{x:x0,y:y0,w,h},aspect:w/h});
 }
 await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).png().toFile(path.join(target,`${name}.png`));
}
await writeFile(path.join(target,'bounds.json'),JSON.stringify(bounds));

console.log('Built 4 transparent 1024x1024 atlases, 64 isolated sprites.');
