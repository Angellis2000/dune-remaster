import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,
 args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto('http://127.0.0.1:5187/?debug&skipIntro');
 const seams=await page.evaluate(async base64=>{
  const {DuneRom}=await import('/src/rom/dune.ts');
  const {IconSet}=await import('/src/gfx/icons.ts');
  const {ContinuousTerrain}=await import('/src/gfx/continuous-terrain.ts');
  const {MapEffects}=await import('/src/gfx/map-effects.ts');
  const rom=new DuneRom(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));
  const map={index:1,ground:new Uint16Array(4096).fill(127),bounds:{x:0,y:0,w:64,h:64}};
  rom.missionMap=()=>map;
  const terrain=await ContinuousTerrain.load(rom,new IconSet(rom));if(!terrain)throw Error('No WebGL');
  const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d');
  terrain.setMap(map);terrain.draw(g,0,0,2);
  const px=g.getImageData(0,0,1024,1024).data;
  const jump=(at,vertical)=>{
   let total=0;
   for(let p=1;p<1023;p++)for(let channel=0;channel<3;channel++){
    const a=vertical?(p*1024+at)*4+channel:(at*1024+p)*4+channel;
    const b=a-(vertical?4:4096);total+=Math.abs(px[a]-px[b]);
   }
   return total/(1022*3);
  };
  const ordinary=[];for(let at=10;at<1010;at+=17)ordinary.push(jump(at,true),jump(at,false));
  const baseline=ordinary.reduce((a,b)=>a+b)/ordinary.length;
  const boundaries=[250,500,750,1000].flatMap(at=>[jump(at,true),jump(at,false)]);
  const worst=Math.max(...boundaries);
  if(worst>baseline*1.6+2)throw Error(`Texture seam: ${worst}, normal ${baseline}`);
  const effects=await MapEffects.load();
  if(!effects?.icon(125)||effects.icon(125)!==effects.icon(33))throw Error('Missing wreckage alias125');
  return {baselineJump:baseline,worstBoundaryJump:worst,alias125:true};
 },(await readFile(path.join(root,'rom/dune_usa.gen'))).toString('base64'));
 await page.setInputFiles('#rom-file',path.join(root,'rom/dune_usa.gen'));
 await page.waitForFunction(()=>window.dune?.world?.game);
 const fallback=await page.evaluate(()=>{
  const {world,view}=window.dune;world.game.cheat('LOOKAROUND');world.sync();
  const b=world.map.bounds,x=b.x+Math.floor(b.w/2)+2,y=b.y+Math.floor(b.h/2)+2;
  world.map.ground[(y<<6)|x]=33;world.map.overlay.fill(0);world.units=[];world.structures=[];
  view.terrain=null;view.centerOn(x*32+16,y*32+16);view.draw();
  const z=view.pixelScale,px=x*32*z-Math.round(view.camX*z),py=y*32*z-Math.round(view.camY*z);
  const s=view.icons.source(33),c=document.createElement('canvas');c.width=c.height=32*z;
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(s.image,s.sx,s.sy,s.sw,s.sh,0,0,c.width,c.height);
  const expected=g.getImageData(0,0,c.width,c.height).data;
  const actual=view.ctx.getImageData(px,py,c.width,c.height).data;
  let different=0;for(let i=0;i<expected.length;i++)if(expected[i]!==actual[i])different++;
  return {different,opaqueGround:true};
 });
 assert.equal(fallback.different,0,'Fallback wreckage must preserve opaque original ground');
 const report={seams,fallback};
 await writeFile(path.resolve(root,'../hd-map-graphics/previews/regressions.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser.close();}
