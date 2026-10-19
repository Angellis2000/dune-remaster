// Export all original layouts as continuous HD bases and independent transparent spice layers.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(root,'../hd-map-graphics/final');
for(const dir of ['maps','spice','previews','layouts','assets','prompts'])await mkdir(path.join(out,dir),{recursive:true});
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,
 args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:5187/');
 await page.exposeFunction('saveMapExport',async (name,data)=>{
  await writeFile(path.join(out,name),Buffer.from(data,'base64'));
 });
 await page.exposeFunction('saveMapLayout',async(name,layout)=>{
  await writeFile(path.join(out,name),JSON.stringify(layout));
 });
 const report=await page.evaluate(async base64=>{
  const {DuneRom}=await import('/src/rom/dune.ts');
  const {IconSet}=await import('/src/gfx/icons.ts');
  const {ContinuousTerrain}=await import('/src/gfx/continuous-terrain.ts');
  const rom=new DuneRom(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));
  const terrain=await ContinuousTerrain.load(rom,new IconSet(rom));if(!terrain)throw Error('HD terrain unavailable');
  const c=document.createElement('canvas'),g=c.getContext('2d');
  const report=[];
  for(let index=1;index<=27;index++){
   const map=rom.missionMap(index),b=map.bounds,stem=`map_${String(index).padStart(2,'0')}`;
   terrain.setMap(map);c.width=c.height=b.w*64;
   for(const layer of ['base','spice']){
    g.clearRect(0,0,c.width,c.height);terrain.draw(g,b.x*32,b.y*32,2,layer);
    await window.saveMapExport(`${layer==='base'?'maps':'spice'}/${stem}_${layer}.png`,c.toDataURL().split(',')[1]);
   }
   c.width=c.height=1024;terrain.draw(g,b.x*32,b.y*32,1024/(b.w*32));
   await window.saveMapExport(`previews/${stem}.png`,c.toDataURL().split(',')[1]);
   await window.saveMapLayout(`layouts/${stem}.json`,{index,bounds:b,cellWorldPixels:32,exportPixelsPerCell:64,ground:[...map.ground]});
   report.push({index,width:b.w*64,height:b.h*64});
  }
  return report;
 },(await readFile(path.join(root,'rom/dune_usa.gen'))).toString('base64'));
 await writeFile(path.join(out,'maps.json'),JSON.stringify(report,null,2));
 const names=['materials.png','effects.png','effects-meta.json','destruction-decals.png','destruction-ids.json','concrete.png','bloom.png','bloom-alt.png'];
 for(const name of names)await copyFile(path.join(root,'web/src/gfx/assets/map-hd',name),path.join(out,'assets',name));
 for(const name of ['materials.txt','effects.txt','destruction.txt','destruction-decals.txt'])await copyFile(path.join(out,'../prompts',name),path.join(out,'prompts',name));
 console.log(JSON.stringify({out,maps:report.length,baseAndSpicePng:report.length*2}));
}finally{await browser.close();}
