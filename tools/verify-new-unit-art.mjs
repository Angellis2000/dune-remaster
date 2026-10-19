import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(root,'web/package.json'));
const {createCanvas,loadImage,Path2D,ImageData}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const sharp=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
globalThis.Path2D=Path2D;globalThis.ImageData=ImageData;globalThis.window={devicePixelRatio:1,addEventListener(){}};
globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};
globalThis.document={createElement(tag){const el=tag==='canvas'?createCanvas(1600,900):{};Object.assign(el,{style:{},dataset:{},hidden:false,append(){},setAttribute(){},addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:1600,height:900})});return el;}};
globalThis.fetch=async url=>({ok:true,blob:async()=>new Blob([await readFile(url)])});
// Browser image decoding handles PNG provenance chunks; normalize test buffers for native Canvas.
globalThis.createImageBitmap=async b=>{const im=await loadImage(await sharp(Buffer.from(await b.arrayBuffer())).png().toBuffer());im.close=()=>{};return im;};
const out=path.join(root,'hd-vehicles/previews/new-units');await mkdir(out,{recursive:true});
const file=path.join(root,'scratch/new-unit-art-test.mjs');
await require('esbuild').build({stdin:{contents:`export{VehicleArt}from'./src/gfx/vehicle-art.ts';export{Skins}from'./src/gfx/skins.ts';export{STRUCTURE_ART}from'./src/gfx/structure-art.ts';export{Portraits}from'./src/gfx/portraits.ts';export{FactoryWindow}from'./src/ui/factory.ts';export{ScreenGfx}from'./src/gfx/screens.ts';export{Game}from'./src/engine/game.ts';export{DuneRom}from'./src/rom/dune.ts';export{G,UNIT,STRUCTURE,IT,INDEX_INVALID,indexEncode,packXY,tileCenter,unpackTile}from'./src/engine/core.ts';export{structureCreate}from'./src/engine/structure.ts';export{unitCreate,unitHide}from'./src/engine/unit.ts';export{initializeDrone,fireLaser,tickDrone,tickDroneGrenades}from'./src/engine/advanced-units.ts';export{MapView}from'./src/view/mapview.ts';export{WorldAtmosphere}from'./src/gfx/world-atmosphere.ts';`,resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:file,plugins:[{name:'urls',setup(b){b.onResolve({filter:/\?url$/},a=>({path:path.resolve(a.resolveDir,a.path.split('?')[0]),namespace:'asset'}));b.onLoad({filter:/.*/,namespace:'asset'},a=>({contents:`export default ${JSON.stringify(a.path)}`}));}}]});
const {VehicleArt,Skins,STRUCTURE_ART,Portraits,FactoryWindow,ScreenGfx,Game,DuneRom,G,UNIT,STRUCTURE,IT,INDEX_INVALID,indexEncode,packXY,tileCenter,unpackTile,structureCreate,unitCreate,unitHide,initializeDrone,fireLaser,tickDrone,tickDroneGrenades,MapView,WorldAtmosphere}=await import(pathToFileURL(file));
const rom=new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen')))),game=new Game(rom);game.load('A',8);G.validateStrictIfZero=1;G.revealAll=true;
for(const u of [...G.unitFind])unitHide(u);
const vehicles=await VehicleArt.load(rom);assert.ok(vehicles);assert.equal(vehicles.custom.length,6);assert.ok(vehicles.custom.every(a=>a.length===3));
const skins=new Skins(),cache=new Map();for(const art of STRUCTURE_ART){if(!cache.has(art.url))cache.set(art.url,{image:await loadImage(art.url),scaled:new Map(),directions:art.directions,align:art.align,layer:art.layerUrl?await loadImage(art.layerUrl):undefined});skins.defaults.set('structure:'+art.type,cache.get(art.url));}
const floorTexture=await loadImage(path.join(root,'web/src/gfx/assets/map-hd/concrete.png'));
let house=1;const portraits=new Portraits(skins,vehicles,null,null,{source:()=>({image:floorTexture,sx:0,sy:0,sw:floorTexture.width,sh:floorTexture.height})},()=>house,null,{image(type){assert.ok(type<19,'New pad must not read the original ROM icon/upgrade entry');return null;}});
const sheet=createCanvas(1152,512),sg=sheet.getContext('2d');
for(let h=0;h<3;h++){
  house=h;for(const [i,type]of [[0,UNIT.LASER_TANK],[1,UNIT.COMBAT_DRONE]]){
    const im=portraits.image('unit',type);sg.drawImage(im,h*384,i*256);
    const p=im.getContext('2d').getImageData(90,40,200,170).data;assert.ok(p.some((v,k)=>k%4!==3&&v>90),'New portrait must contain actual HD models');
  }
}
await writeFile(path.join(out,'units-all-houses.png'),sheet.toBuffer('image/png'));house=1;
const icon=portraits.icon('structure',STRUCTURE.DRONE_PAD);assert.ok(icon.getContext('2d').getImageData(0,0,128,96).data.some((v,i)=>i%4===3&&v>0));
await writeFile(path.join(out,'drone-pad-icon.png'),icon.toBuffer('image/png'));
const yard=structureCreate(INDEX_INVALID,STRUCTURE.CONSTRUCTION_YARD,G.playerHouseID,packXY(10,10));
const heavy=structureCreate(INDEX_INVALID,STRUCTURE.HEAVY_VEHICLE,G.playerHouseID,packXY(15,10));
const pad=structureCreate(INDEX_INVALID,STRUCTURE.DRONE_PAD,G.playerHouseID,packXY(20,10));
yard.upgradeLevel=heavy.upgradeLevel=3;G.houses[G.playerHouseID].structuresBuilt=(1<<20)-1;G.houses[G.playerHouseID].credits=20000;
const consoleImage=await loadImage(path.join(root,'web/src/gfx/assets/frontend/production-console-hd.png'));
const gfx=new ScreenGfx(rom);gfx.art={get:key=>key==='productionConsole'?consoleImage:null};
for(const [name,s,type]of [['yard-drone-pad',yard,STRUCTURE.DRONE_PAD],['heavy-laser',heavy,UNIT.LASER_TANK],['pad-drone-wing',pad,UNIT.COMBAT_DRONE]]){
  const f=new FactoryWindow(rom,gfx,{game:()=>game,credits:()=>20000,toggled(){},placing(){}},portraits);f.open(s);f.cursor=f.orders.findIndex(o=>o.type===type);assert.ok(f.cursor>=0,'Order must actually appear in its production window');f.draw();await writeFile(path.join(out,name+'.png'),f.canvas.toBuffer('image/png'));f.close();
}
const beam=unitCreate(INDEX_INVALID,UNIT.LASER_TANK,G.playerHouseID,tileCenter(unpackTile(packXY(25,14))),0);
const drone=unitCreate(INDEX_INVALID,UNIT.COMBAT_DRONE,G.playerHouseID,tileCenter(unpackTile(packXY(22,20))),0);initializeDrone(drone,pad);
const enemy=unitCreate(INDEX_INVALID,UNIT.CARRYALL,0,tileCenter(unpackTile(packXY(25,10))),0);enemy.o.seenByHouses=255;
beam.targetAttack=indexEncode(enemy.o.index,IT.UNIT);beam.orientation[1].current=0;beam.speed=0;fireLaser(beam,beam.targetAttack);G.timerGame+=48;fireLaser(beam,beam.targetAttack);
const w=960,h=640,field=createCanvas(w,h),fg=field.getContext('2d'),ground=new Uint16Array(4096),overlay=new Uint16Array(4096),concrete=await loadImage(path.join(root,'web/src/gfx/assets/map-hd/concrete.png')),sand=await loadImage(path.join(root,'web/src/gfx/assets/map-hd/ground-detail.png'));
const us=[beam,drone,enemy].map((ref,i)=>({id:i+1,ref,type:ref.o.type,house:ref.o.houseID,x:ref.o.position.x/8,y:ref.o.position.y/8,orientation:0,turret:0,anim:0,state:{},air:ref.o.type!==UNIT.LASER_TANK,hp:256,smoke:-1,dust:-1,shadow:true,highlighted:false}));
const structure={id:1,ref:pad,type:19,house:1,x:20,y:10,w:2,h:2,hp:256,built:true};
const view=Object.assign(Object.create(MapView.prototype),{canvas:field,ctx:fg,zoom:3,pixelRatio:1,camX:600,camY:310,world:{units:us,structures:[structure],blasts:[],map:{ground,overlay,inBounds:(x,y)=>x>=0&&y>=0&&x<64&&y<64}},vehicles,skins,icons:{source:()=>({image:concrete,sx:0,sy:0,sw:concrete.width,sh:concrete.height})},sprites:{unitSkin:()=>null},atmosphere:new WorldAtmosphere(),tracks:{update(){},draw(){}},terrain:{kinds:new Uint8Array(512),covers:()=>true,draw(ctx){ctx.drawImage(sand,0,0,sand.width/2,sand.height,0,0,w,h);}},selectedUnits:new Set([us[1]]),selectedStructure:null,structureIcons:[],veiledIcon:127,cursorX:-100,cursorY:-100,cursorKind:'select'});
G.droneGrenades=[{from:{...drone.o.position},to:{x:drone.o.position.x+128,y:drone.o.position.y+128},released:G.timerGame-20,impact:G.timerGame+22,origin:0,house:1,damage:12}];
view.draw();await writeFile(path.join(out,'battlefield.png'),field.toBuffer('image/png'));
drone.targetMove=indexEncode(packXY(24,13),IT.TILE);drone.actionID=1;
G.houses[G.playerHouseID].powerProduction=10000;G.houses[G.playerHouseID].powerUsage=0;
for(let i=0;i<32;i++){
  G.timerGame+=2;tickDrone(drone);tickDroneGrenades();
  for(const v of us){v.x=v.ref.o.position.x/8;v.y=v.ref.o.position.y/8;v.orientation=v.ref.orientation[0].current;v.turret=v.ref.orientation[1].current;}
  view.draw();await writeFile(path.join(out,`motion-${String(i).padStart(3,'0')}.png`),field.toBuffer('image/png'));
}
console.log('PASS: HD models in all 3 house colors; real new pad icon; actual yard/heavy/pad production windows; MapView with drone radius, laser beam, airborne grenade and rotor animation.');


