// Targeted native Canvas checks; does not automate or replace the user's browser tab.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(root,'web/package.json'));
const {createCanvas,loadImage,Path2D}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
globalThis.Path2D=Path2D;
const out=path.join(root,'hd-vehicles/previews/world-animation');await mkdir(out,{recursive:true});
const file=path.join(root,'scratch/world-animation-test.mjs');
await require('esbuild').build({stdin:{contents:`export{WorldAtmosphere,desertLight,cloudPosition,DAY_TICKS}from'./src/gfx/world-atmosphere.ts';export{drawBuildingActivity}from'./src/gfx/building-activity.ts';export{drawFactoryActivity}from'./src/gfx/factory-activity.ts';export{drawRefineryActivity,refineryPadLights}from'./src/gfx/refinery-activity.ts';export{drawCursor,drawSelection}from'./src/gfx/cursors.ts';export{MapView}from'./src/view/mapview.ts';export{Skins}from'./src/gfx/skins.ts';export{STRUCTURE_ART}from'./src/gfx/structure-art.ts';export{VehicleArt}from'./src/gfx/vehicle-art.ts';export{DuneRom}from'./src/rom/dune.ts';export{G,IT,indexEncode}from'./src/engine/core.ts';`,resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:file,plugins:[{name:'image-urls',setup(b){b.onResolve({filter:/\?url$/},a=>({path:path.resolve(a.resolveDir,a.path.split('?')[0]),namespace:'asset'}));b.onLoad({filter:/.*/,namespace:'asset'},a=>({contents:`export default ${JSON.stringify(a.path)}`,loader:'js'}));}}]});
globalThis.document={createElement:()=>createCanvas(32,32)};
globalThis.fetch=async url=>({ok:true,blob:async()=>new Blob([await readFile(url)])});
globalThis.createImageBitmap=async blob=>{const im=await loadImage(Buffer.from(await blob.arrayBuffer()));im.close=()=>{};return im;};
const {WorldAtmosphere,desertLight,cloudPosition,DAY_TICKS,drawBuildingActivity,drawFactoryActivity,drawRefineryActivity,refineryPadLights,drawCursor,drawSelection,MapView,Skins,STRUCTURE_ART,VehicleArt,DuneRom,G,IT,indexEncode}=await import(pathToFileURL(file));
const rom=new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen'))));
const vehicles=await VehicleArt.load(rom);assert.ok(vehicles);
const skins=new Skins(),loaded=new Map();
for(const art of STRUCTURE_ART){
  if(!loaded.has(art.url))loaded.set(art.url,{image:await loadImage(art.url),scaled:new Map(),directions:art.directions,align:art.align,layer:art.layerUrl?await loadImage(art.layerUrl):undefined});
  skins.defaults.set('structure:'+art.type,loaded.get(art.url));
}
const silo=skins.structure(17,192,192),siloData=silo.getContext('2d').getImageData(0,0,192,192).data;
let left=192,right=0,top=192,bottom=0;
for(let y=0;y<192;y++)for(let x=0;x<192;x++)if(siloData[(y*192+x)*4+3]>200){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
assert.ok(Math.abs((left+right)/2-95.5)<2,'Silo must be centered horizontally inside its unchanged footprint');
assert.ok(Math.abs((top+bottom)/2-95.5)<2,'Silo must be centered vertically');
const poses=createCanvas(1536,768),pg=poses.getContext('2d');
let firstRadar;
for(let i=0;i<8;i++){
  const radar=skins.structure(18,384,384,0,i*135),data=radar.getContext('2d').getImageData(280,110,60,140).data;
  const edge=radar.getContext('2d').getImageData(0,0,1,384).data;
  assert.ok(edge.every((v,p)=>p%4!==3||v===0),'Radar dish must fit without clipping at every bearing');
  if(i===0)firstRadar=Buffer.from(data);else assert.deepEqual(Buffer.from(data),firstRadar,'Fixed radar roof must not rotate with the dish');
  pg.fillStyle='#9a8762';pg.fillRect((i%4)*384,Math.floor(i/4)*384,384,384);
  pg.drawImage(radar,(i%4)*384,Math.floor(i/4)*384);
}
await writeFile(path.join(out,'radar-full-turn.png'),poses.toBuffer('image/png'));
const startRadar=Buffer.from(skins.structure(18,384,384,0,0).getContext('2d').getImageData(0,0,384,384).data);
assert.deepEqual(Buffer.from(skins.structure(18,384,384,0,1080).getContext('2d').getImageData(0,0,384,384).data),startRadar,'Radar must loop without a pose jump');
for(const name of ['radar-outpost','spice-silo','vehicle-factory','refinery']){
  const im=await loadImage(path.join(root,'web/src/gfx/assets',name+'-transparent.png'));
  const c=createCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);
  for(const [x,y]of [[0,0],[im.width-1,0],[0,im.height-1],[im.width-1,im.height-1]])assert.equal(g.getImageData(x,y,1,1).data[3],0,name+' must have no opaque background');
}
// Full cycle, wrap and all dawn/dusk transitions remain bounded and continuous.
for(let tick=0;tick<=DAY_TICKS;tick+=21){
  const a=desertLight(tick),b=desertLight(tick+.01);
  assert.ok(a.rgb.every(v=>v>=.53&&v<=1));assert.ok(a.rgb.every((v,i)=>Math.abs(v-b.rgb[i])<.00001));
  assert.ok(a.night>=0&&a.night<=1);
}
assert.deepEqual(desertLight(0),desertLight(DAY_TICKS));
for(let i=0;i<11;i++)assert.deepEqual(cloudPosition(i,100),cloudPosition(i,100));
const c=createCanvas(1152,672),g=c.getContext('2d'),ground=new Uint16Array(4096),overlay=new Uint16Array(4096);
const sand=await loadImage(path.join(root,'web/src/gfx/assets/map-hd/ground-detail.png'));
const concrete=await loadImage(path.join(root,'web/src/gfx/assets/map-hd/concrete.png'));
const structures=[[4,1,1,3,2],[12,5,1,3,2],[18,1,4,2,2],[9,4,4,2,2],[17,7,4,2,2]].map(([type,x,y,w,h],i)=>({id:i+1,type,x,y,w,h,hp:256,house:1,built:true,ref:{state:type===4?1:0,rotationSpriteDiff:0,objectType:9,o:{index:i,houseID:1,linkedID:255,flags:{onHold:false},script:{variables:new Uint16Array(16)}}}}));
G.unitFind=[{o:{flags:{used:true},houseID:1,type:16},targetMove:indexEncode(1,IT.STRUCTURE)}];
G.tickScenarioStart=0;
const world={units:[],blasts:[],structures,map:{ground,overlay,inBounds:(x,y)=>x>=0&&y>=0&&x<12&&y<7}};
const view=Object.assign(Object.create(MapView.prototype),{canvas:c,ctx:g,zoom:3,pixelRatio:1,camX:0,camY:0,world,vehicles,
 atmosphere:new WorldAtmosphere(),skins,icons:{source:()=>({image:concrete,sx:0,sy:0,sw:concrete.width,sh:concrete.height})},
 sprites:{},terrain:{kinds:new Uint8Array(512),covers:()=>true,draw(ctx){ctx.drawImage(sand,0,0,sand.width/2,sand.height,0,0,c.width,c.height);}},
 tracks:{update(){},draw(){}},selectedUnits:new Set(),selectedStructure:structures[0],structureIcons:[],veiledIcon:127,cursorX:350,cursorY:200,cursorKind:'select'});
const frames=new Map();
for(const [name,hour]of [['morning',7],['day',13],['evening',18.5],['night',23]]){
  G.timerGame=((hour-9+24)%24)/24*DAY_TICKS;view.draw();frames.set(name,g.getImageData(0,0,c.width,c.height).data);
  await writeFile(path.join(out,name+'.png'),c.toBuffer('image/png'));
}
assert.notDeepEqual(frames.get('day'),frames.get('night'));
view.draw();const pause=Buffer.from(g.getImageData(0,0,c.width,c.height).data);view.draw();
assert.deepEqual(Buffer.from(g.getImageData(0,0,c.width,c.height).data),pause,'Repeated render at paused game tick must be identical');
// Fog, zoom and world clipping: illuminated objects cannot reveal a hidden cell.
for(const zoom of [1,3,6])for(const hour of [7,13,18.5,23]){
  view.zoom=zoom;overlay[(1<<6)|2]=127;G.timerGame=((hour-9+24)%24)/24*DAY_TICKS;view.draw();
  assert.deepEqual([...g.getImageData(80*zoom,48*zoom,1,1).data],[0,0,0,255]);
}
overlay.fill(0);view.zoom=3;
// A custom building must not receive rotor/parking overlays designed for default art.
let customReads=0;const custom=createCanvas(96,64);custom.getContext('2d').fillRect(0,0,96,64);
skins.skins.set('structure:4',{image:custom,scaled:new Map()});
const oldDraw=vehicles.draw;vehicles.draw=function(ctx,u,t){if(u.id<-1000)customReads++;return oldDraw.call(this,ctx,u,t);};
view.draw();assert.equal(customReads,0);skins.skins.delete('structure:4');vehicles.draw=oldDraw;
const s=structures[0],image=skins.structure(4,288,192),small=createCanvas(96,64),sg=small.getContext('2d');
const local={...s,x:0,y:0};
function frame(tick){sg.clearRect(0,0,96,64);sg.drawImage(image,0,0,96,64);drawBuildingActivity(sg,local,image,tick);return Buffer.from(sg.getImageData(0,0,96,64).data);}
const f0=frame(0),f1=frame(18);assert.notDeepEqual(f0,f1,'Mechanisms must move');
for(const [x,y]of [[20,10],[50,5],[90,10]]){const p=(y*96+x)*4;assert.deepEqual(f0.subarray(p,p+4),f1.subarray(p,p+4),'Stationary walls must not wobble');}
assert.deepEqual(refineryPadLights(0),refineryPadLights(100));
const rs={...structures[1],x:0,y:0},ri=skins.structure(12,288,192),rf=createCanvas(96,64),rg=rf.getContext('2d');
function refineryFrame(t){rg.clearRect(0,0,96,64);rg.drawImage(ri,0,0,96,64);drawBuildingActivity(rg,rs,ri,t,false);return Buffer.from(rg.getImageData(0,0,96,64).data);}
const r0=refineryFrame(0),r1=refineryFrame(25);
for(const cy of [10,27,44]){
 let changes=0;for(let yy=cy-4;yy<=cy+4;yy++)for(let xx=23;xx<31;xx++){const p=(yy*96+xx)*4;if(r0[p]!==r1[p]||r0[p+1]!==r1[p+1])changes++;}
 assert.ok(changes>10,'All three refinery rotors run continuously even without an incoming harvester');
}
const parked=[];vehicles.draw=(ctx,u)=>{parked.push({...u});return true;};
drawFactoryActivity(sg,local,vehicles,0,true);assert.deepEqual(parked.map(u=>u.type),[9,10]);assert.ok(parked.every(u=>u.house===local.house));
const linked={o:{type:16,flags:{used:true}}};G.units[99]=linked;local.ref.o.linkedID=99;parked.length=0;
drawFactoryActivity(sg,local,vehicles,25,true);assert.equal(parked[0].type,16,'Assembly bay must show the actual produced unit type');
local.ref.o.linkedID=255;vehicles.draw=oldDraw;
for(let i=0;i<10;i++){
  const lights=refineryPadLights(i*10);assert.equal(lights.length,10);
  assert.equal(lights.reduce((best,p,j)=>p.strength>lights[best].strength?j:best,0),i);
}
const idle=createCanvas(96,64),ig=idle.getContext('2d'),refinery={...structures[1],x:0,y:0};
G.unitFind=[];drawRefineryActivity(ig,refinery,vehicles,0);assert.ok(ig.getImageData(0,0,96,64).data.every(v=>v===0),'Idle pad must remain dark');
G.unitFind=[{o:{flags:{used:true},houseID:1,type:16},targetMove:indexEncode(1,IT.STRUCTURE)}];
drawRefineryActivity(ig,refinery,vehicles,0);assert.ok(ig.getImageData(76,26,1,1).data[3]>0,'Incoming harvester activates actual wells');
const calls=[],rec={save(){},restore(){},beginPath(){},moveTo(x,y){calls.push([x,y]);},lineTo(){},stroke(){}};
drawCursor(rec,'select',100,100,100);const xs=calls.map(p=>p[0]);assert.equal(Math.min(...xs),54);assert.equal(Math.max(...xs),146);
const bright=createCanvas(200,200),bg=bright.getContext('2d');drawSelection(bg,30,30,100,100,3,0,true);
assert.ok(bg.getImageData(30,30,1,1).data[0]>220);
view.zoom=3;G.timerGame=0;
for(let i=0;i<24;i++){
  G.timerGame=i*4;view.draw();await writeFile(path.join(out,`motion-${String(i).padStart(3,'0')}.png`),c.toBuffer('image/png'));
}
console.log('PASS: native MapView lighting cycle/pause/fog at 3 zooms; fixed building walls, 3 continuous refinery fans, actual assembly vehicle types/house colors, custom-skin opt-out; 10 ordered pad lights, centered silo, 360-degree radar loop with fixed roof; 8% cursor reduction and brighter building frame.');
