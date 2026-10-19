// Focused visual and behavioral checks for the continuous HD landscape and effects.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.resolve(root,'../hd-map-graphics/previews');
await mkdir(out,{recursive:true});
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,
 args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('unavailable'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:5187/?debug&skipIntro');
 const result=await page.evaluate(async base64=>{
  const {DuneRom}=await import('/src/rom/dune.ts');
  const {IconSet}=await import('/src/gfx/icons.ts');
  const {ContinuousTerrain}=await import('/src/gfx/continuous-terrain.ts');
  const {MapEffects}=await import('/src/gfx/map-effects.ts');
  const {SpriteSet}=await import('/src/gfx/sprites.ts');
  const {g_table_explosion}=await import('/src/engine/tables.gen.ts');
  const rom=new DuneRom(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));
  const icons=new IconSet(rom),terrain=await ContinuousTerrain.load(rom,icons),effects=await MapEffects.load();
  if(!terrain||!effects)throw Error('HD assets did not load');
  const c=document.createElement('canvas');c.width=c.height=2048;const g=c.getContext('2d');
  const images={};
  const counters=[];
  for(let index=1;index<=27;index++){
   const map=rom.missionMap(index);
   for(const id of map.ground)if(!terrain.covers(id)&&id!==0)throw Error(`Missing terrain ${id}`);
   terrain.setMap(map);
   const b=map.bounds;
   if([1,3,9].includes(index)){
    c.width=c.height=b.w*32;
    terrain.draw(g,b.x*32,b.y*32,1);
    images[`mission_${index}_continuous.png`]=c.toDataURL().split(',')[1];
    terrain.draw(g,b.x*32,b.y*32,1);
    if(images[`mission_${index}_continuous.png`]!==c.toDataURL().split(',')[1])throw Error('Terrain flickered on unchanged frame');
   }
   counters.push({index,size:b.w,covered:true});
  }
  // Independent spice mask: harvesting changes spice pixels while immutable land remains untouched.
  const map=rom.missionMap(1);terrain.setMap(map);c.width=c.height=1024;
  terrain.draw(g,512,512,1,'base');const originalBase=c.toDataURL();
  terrain.draw(g,512,512,1);const before=g.getImageData(0,0,1024,1024).data;
  const p=map.ground.findIndex(id=>terrain.kinds[id]===9||terrain.kinds[id]===8);
  if(p<0)throw Error('No spice cell in test map');
  const idsBefore=map.ground.slice();map.ground[p]=127;
  terrain.draw(g,512,512,1);const after=g.getImageData(0,0,1024,1024).data;
  const x=(p&63)*32-512,y=(p>>6)*32-512;
  let changed=0,outside=0;
  for(let yy=0;yy<1024;yy++)for(let xx=0;xx<1024;xx++){
   const at=(yy*1024+xx)*4;
   if(before[at]===after[at]&&before[at+1]===after[at+1]&&before[at+2]===after[at+2])continue;
   changed++;if(xx<x-5||xx>x+37||yy<y-5||yy>y+37)outside++;
  }
  if(!changed||outside)throw Error(`Spice layer incorrect: changed=${changed}, outside=${outside}`);
  terrain.draw(g,512,512,1,'base');if(c.toDataURL()!==originalBase)throw Error('Harvesting changed static terrain');
  g.clearRect(0,0,1024,1024);terrain.draw(g,512,512,1,'spice');
  const alpha=g.getImageData(0,0,1024,1024).data;
  let transparent=0,painted=0;for(let i=3;i<alpha.length;i+=4){if(alpha[i]===0)transparent++;else painted++;}
  if(!transparent||!painted)throw Error('Spice layer must contain transparency and mineral patches');
  for(let i=0;i<4096;i++)if(i!==p&&map.ground[i]!==idsBefore[i])throw Error('Original map modified');
  const sprites=new SpriteSet(rom);sprites.mapEffects=effects;
  const frames=[...new Set(g_table_explosion.flat().filter(e=>e[0]===1).map(e=>e[1]))];
  for(const id of frames){
   const frame=sprites.effect(id);if(!frame?.worldWidth)throw Error(`Missing HD effect ${id}`);
   if(frame.worldWidth>84||frame.worldHeight>84)throw Error(`Incorrect effect world size ${id}`);
  }
  for(let d=0;d<8;d++)for(let f=0;f<3;f++)if(!sprites.harvestDust(d,f).worldWidth)throw Error('Missing HD dust');
  c.width=1200;c.height=800;g.fillStyle='#c6a573';g.fillRect(0,0,c.width,c.height);
  const show=[180,181,182,188,189,190,191,192,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,218,219,220,221,222];
  for(let i=0;i<show.length;i++){
   const im=sprites.effect(show[i]),x=(i%7)*165+80,y=Math.floor(i/7)*180+65;
   g.drawImage(im.canvas,x+im.ox*2,y+im.oy*2,im.worldWidth*2,im.worldHeight*2);
   g.fillStyle='#312719';g.font='14px sans-serif';g.fillText(String(show[i]),x-20,Math.floor(i/7)*180+165);
  }
  images['effects_on_sand.png']=c.toDataURL().split(',')[1];
  return {images,counters,changedSpicePixels:changed,outsideSpicePixels:outside,hdEffectFrames:frames.length};
 },(await readFile(path.join(root,'rom/dune_usa.gen'))).toString('base64'));
 for(const [name,data]of Object.entries(result.images))await writeFile(path.join(out,name),Buffer.from(data,'base64'));
 await page.setInputFiles('#rom-file',path.join(root,'rom/dune_usa.gen'));
 await page.waitForFunction(()=>window.dune?.world?.game);
 await page.evaluate(()=>{window.dune.world.game.cheat('LOOKAROUND');window.dune.world.sync();window.dune.view.draw();});
 await page.screenshot({path:path.join(out,'game_hd.png')});
 // Full fog must hide the continuous background too.
 const fog=await page.evaluate(()=>{
  const {view,world,G}=window.dune;
  G.revealAll=false;
  for(const t of G.map){t.isUnveiled=false;t.overlayTileID=view.veiledIcon;}
  world.sync();view.draw();
  const g=view.canvas.getContext('2d'),p=g.getImageData(view.canvas.width/2,view.canvas.height/2,1,1).data;
  return [...p];
 });
 assert.deepEqual(fog.slice(0,3),[0,0,0]);
 assert.equal(errors.length,0,errors.join('\n'));
 const report={maps:result.counters.length,changedSpicePixels:result.changedSpicePixels,
  outsideSpicePixels:result.outsideSpicePixels,hdEffectFrames:result.hdEffectFrames,fogHidden:true,errors};
 await writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser.close();}
