import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(root,'../hd-map-graphics/sources');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:5187/');
 const result=await page.evaluate(async base64=>{
  const {DuneRom}=await import('/src/rom/dune.ts');
  const {SpriteSet}=await import('/src/gfx/sprites.ts');
  const {g_table_explosion}=await import('/src/engine/tables.gen.ts');
  const rom=new DuneRom(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));
  const sprites=new SpriteSet(rom);
  const fallback={151:153,152:154,156:223,157:224,158:225,168:180,169:181,170:182,214:218,215:219,216:220,217:221};
  const requested=[...new Set(g_table_explosion.flat().filter(c=>c[0]===1).map(c=>c[1]))].sort((a,b)=>a-b);
  const resolved=id=>sprites.hasFrame(id)?id:(fallback[id]??id);
  const ids=[...new Set(requested.map(resolved))].sort((a,b)=>a-b);
  const entries=ids.map(id=>({key:`frame:${id}`,sprite:sprites.effect(id),aliases:requested.filter(f=>resolved(f)===id)}));
  for(let d=0;d<8;d++)for(let f=0;f<3;f++)entries.push({key:`dust:${d}:${f}`,sprite:sprites.harvestDust(d,f)});
  const atlas=document.createElement('canvas');atlas.width=atlas.height=1024;
  const g=atlas.getContext('2d');g.imageSmoothingEnabled=false;
  const meta=[];
  for(let i=0;i<entries.length;i++){
   const {key,sprite:s,aliases}=entries[i];
   // The complete frame fits inside the same 64x64 world-pixel box in every cell.
   const max=Math.max(64,s.canvas.width,s.canvas.height);
   const scale=128/max;
   const x=(i%8)*128,y=Math.floor(i/8)*128;
   const left=(128-s.canvas.width*scale)/2,top=(128-s.canvas.height*scale)/2;
   g.drawImage(s.canvas,x+left,y+top,s.canvas.width*scale,s.canvas.height*scale);
   meta.push({key,aliases,index:i,boxWorld:max,ox:s.ox-left/scale,oy:s.oy-top/scale,worldWidth:max,worldHeight:max,
    original:{ox:s.ox,oy:s.oy,width:s.canvas.width,height:s.canvas.height}});
  }
  const overlays=document.createElement('canvas');overlays.width=overlays.height=1024;
  const og=overlays.getContext('2d');og.imageSmoothingEnabled=false;
  const {IconSet}=await import('/src/gfx/icons.ts');
  const icons=new IconSet(rom);
  const overlayIDs=[...Array.from({length:19},(_,i)=>i+1),33,...Array.from({length:20},(_,i)=>338+i)];
  for(let i=0;i<overlayIDs.length;i++){
    const s=icons.source(overlayIDs[i]);
    og.drawImage(s.image,s.sx,s.sy,s.sw,s.sh,(i%8)*128,Math.floor(i/8)*128,128,128);
  }
  return {png:atlas.toDataURL().split(',')[1],overlays:overlays.toDataURL().split(',')[1],meta,overlayIDs};
 },(await readFile(path.join(root,'rom/dune_usa.gen'))).toString('base64'));
 await writeFile(path.join(out,'effects.png'),Buffer.from(result.png,'base64'));
 await writeFile(path.join(out,'destruction.png'),Buffer.from(result.overlays,'base64'));
 await writeFile(path.join(out,'effects.json'),JSON.stringify(result.meta,null,2));
 await writeFile(path.join(out,'destruction.json'),JSON.stringify(result.overlayIDs));
 console.log(JSON.stringify({effects:result.meta.length,destruction:result.overlayIDs.length}));
} finally {await browser.close();}
