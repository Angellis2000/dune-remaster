import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(root,'../hd-vehicles');
for(const name of ['sources','prompts','previews'])await mkdir(path.join(out,name),{recursive:true});
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5187/');
 const result=await page.evaluate(async base64=>{
  const {DuneRom,ROM}=await import('/src/rom/dune.ts');
  const {SpriteSet}=await import('/src/gfx/sprites.ts');
  const {Game}=await import('/src/engine/game.ts');
  const {unitInfo}=await import('/src/engine/tables.ts');
  const rom=new DuneRom(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));
  new Game(rom);
  const sprites=new SpriteSet(rom);
  const types=[0,1,7,8,9,10,11,12,13,14,15,16,17,26];
  const names=['carryall','ornithopter','launcher','deviator','tank','siege_tank','devastator','sonic_tank','trike','raider_trike','quad','harvester','mcv','frigate'];
  const sheet=document.createElement('canvas');sheet.width=sheet.height=1024;
  const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;
  const guns=document.createElement('canvas');guns.width=guns.height=1024;
  const gg=guns.getContext('2d');gg.imageSmoothingEnabled=false;
  const entries=[];
  function draw(target,s,index){
   const side=Math.max(s.canvas.width,s.canvas.height),scale=180/side;
   const x=(index%4)*256+128-s.canvas.width*scale/2;
   const y=Math.floor(index/4)*256+128-s.canvas.height*scale/2;
   target.drawImage(s.canvas,x,y,s.canvas.width*scale,s.canvas.height*scale);
  }
  for(let i=0;i<types.length;i++){
   const type=types[i],frames=sprites.unitFrames(type,0,0,0),refs=frames.map(f=>sprites.get(f,1));
   const box=document.createElement('canvas');box.width=box.height=128;
   const bg=box.getContext('2d');
   for(const s of refs)bg.drawImage(s.canvas,64+s.ox,64+s.oy);
   const combined={canvas:box,ox:-64,oy:-64};
   // Trim only transparent padding before arranging the reference contact sheet.
   const px=bg.getImageData(0,0,128,128).data;let x0=128,y0=128,x1=0,y1=0;
   for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(px[(y*128+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
   const c=document.createElement('canvas');c.width=x1-x0+1;c.height=y1-y0+1;c.getContext('2d').drawImage(box,x0,y0,c.width,c.height,0,0,c.width,c.height);
   let body={canvas:c,ox:x0-64,oy:y0-64};
   let pieces=[];
   if(ROM.turretFrames[type]!==undefined){
    const f=rom.frameDef(ROM.turretFrames[type]);pieces=f.pieces;
    if(f.pieces.length>1){
     const bodyFrame={...f,pieces:f.pieces.slice(1)};
     body=sprites.render(bodyFrame,0,rom.housePaletteLine(1));
     draw(gg,sprites.render({...f,pieces:f.pieces.slice(0,1)},0,rom.housePaletteLine(1)),type===9?0:1);
    }
   }
   draw(g,body,i);
   const ui=unitInfo[type];
   entries.push({type,name:names[i],cell:i,hasTurret:!!ui.o.flags.hasTurret,bulletType:ui.bulletType,
    width:c.width,height:c.height,ox:x0-64,oy:y0-64,bodyWidth:body.canvas.width,bodyHeight:body.canvas.height,
    pieces:pieces.map(p=>({x:p.x,y:p.y,tw:p.tw,th:p.th})),dimension:ui.dimension,box:Math.max(c.width,c.height)});
  }
  const gunTypes=[9,10,7,8,11,12,13,14,15];
  for(let i=2;i<gunTypes.length;i++){
   const frames=sprites.unitFrames(gunTypes[i],0,0,0),c=document.createElement('canvas');c.width=c.height=64;
   const cg=c.getContext('2d');for(const f of frames){const s=sprites.get(f,1);cg.drawImage(s.canvas,32+s.ox,32+s.oy);}
   draw(gg,{canvas:c},i);
  }
  for(let i=9;i<12;i++){
   const type=[19,23,24][i-9],refs=sprites.unitFrames(type,0,0,0);
   const s=sprites.get(refs[0],1);draw(gg,s,i);
  }
  for(let i=12;i<16;i++)draw(gg,sprites.effect([183,188,198,203][i-12]),i);
  // Last two body slots serve as wing references for an independently animated ornithopter.
  for(let i=14;i<16;i++){const refs=sprites.unitFrames(1,0,0,0,{wing:i-14});draw(g,sprites.get(refs[0],1),i);}
  return {bodies:sheet.toDataURL().split(',')[1],guns:guns.toDataURL().split(',')[1],entries};
 },(await readFile(path.join(root,'rom/dune_usa.gen'))).toString('base64'));
 await writeFile(path.join(out,'sources/bodies.png'),Buffer.from(result.bodies,'base64'));
 await writeFile(path.join(out,'sources/mounts.png'),Buffer.from(result.guns,'base64'));
 await writeFile(path.join(out,'sources/units.json'),JSON.stringify(result.entries,null,2));
 console.log(JSON.stringify(result.entries.map(({type,name,hasTurret,bulletType,width,height,ox,oy,pieces})=>({type,name,hasTurret,bulletType,width,height,ox,oy,pieces}))));
}finally{await browser.close();}
