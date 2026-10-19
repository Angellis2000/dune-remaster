import assert from 'node:assert/strict';import{readFile,mkdir,writeFile}from'node:fs/promises';import{createRequire}from'node:module';import path from'node:path';import{fileURLToPath,pathToFileURL}from'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(root,'web/package.json'));
const {createCanvas,Path2D}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');globalThis.Path2D=Path2D;
const listeners={};globalThis.window={devicePixelRatio:1,addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};
globalThis.HTMLInputElement=class{};globalThis.HTMLSelectElement=class{};
globalThis.document={createElement(tag){const el=tag==='canvas'?createCanvas(320,224):{};return Object.assign(el,{style:{},dataset:{},hidden:false,append(){},setAttribute(){},addEventListener(){},getBoundingClientRect:()=>({width:320,height:224,left:0,top:0})});}};
const file=path.join(root,'scratch/logistics-production-test.mjs');await mkdir(path.dirname(file),{recursive:true});
await require('esbuild').build({stdin:{contents:`export{Game}from'./src/engine/game.ts';export{DuneRom}from'./src/rom/dune.ts';export{G,ACTION,IT,UNIT,STRUCTURE,STATE,SELECTION,INDEX_INVALID,indexEncode,packXY,packTile,tileCenter,unpackTile}from'./src/engine/core.ts';export{structureCreate,structureDamage}from'./src/engine/structure.ts';export{unitCreate,unitHide,unitDamage}from'./src/engine/unit.ts';export{refineryExit}from'./src/engine/refinery-dock.ts';export{FactoryWindow}from'./src/ui/factory.ts';export{SettingsMenu}from'./src/ui/settings.ts';export{Pad}from'./src/input/pad.ts';export{ScreenGfx,MENU_ROM}from'./src/gfx/screens.ts';`,resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:file,plugins:[{name:'assets',setup(b){b.onResolve({filter:/\?url$/},a=>({path:a.path,namespace:'asset'}));b.onLoad({filter:/.*/,namespace:'asset'},()=>({contents:'export default ""'}));}}]});
const{Game,DuneRom,G,ACTION,IT,UNIT,STRUCTURE,STATE,SELECTION,INDEX_INVALID,indexEncode,packXY,packTile,tileCenter,unpackTile,structureCreate,structureDamage,unitCreate,unitHide,unitDamage,refineryExit,FactoryWindow,SettingsMenu,Pad,ScreenGfx,MENU_ROM}=await import(pathToFileURL(file));
const bytes=new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen'))),rom=new DuneRom(bytes),game=new Game(rom),gfx=new ScreenGfx(rom);
const installation=gfx.names(MENU_ROM.sounds).filter(sound=>sound.id===70);assert.equal(installation.length,1);assert.equal(installation[0].id,70);
const setup=(house='A')=>{game.load(house,1);G.playtester=false;G.revealAll=true;G.scenario.winFlags=G.scenario.loseFlags=0;for(const u of [...G.unitFind])unitHide(u);for(const s of G.structureFind)if(s.o.houseID!==G.playerHouseID)s.o.script.delay=65000;for(const h of G.houseFind){h.flags.isAIActive=false;h.credits=10000;}G.validateStrictIfZero=1;};
for(const house of ['A','H','O'])for(const [block,withPlane]of [[false,false],[true,true],[true,false]]){
 setup(house);const s=structureCreate(INDEX_INVALID,STRUCTURE.REFINERY,G.playerHouseID,packXY(20,20));s.state=STATE.IDLE;
 if(block)assert.ok(structureCreate(INDEX_INVALID,STRUCTURE.WALL,G.playerHouseID,packTile(refineryExit(s.o.position))));
 const u=unitCreate(INDEX_INVALID,UNIT.HARVESTER,G.playerHouseID,tileCenter(unpackTile(packXY(24,25))),0);assert.ok(u);u.amount=100;
 if(withPlane){const plane=unitCreate(INDEX_INVALID,UNIT.CARRYALL,G.playerHouseID,tileCenter(unpackTile(packXY(16,25))),0);assert.ok(plane);plane.o.flags.byScenario=true;}
 G.validateStrictIfZero=0;game.order(u,ACTION.RETURN,packTile(s.o.position));
 let carried=false,descended=false,previousHeight=new Map(),landedAt=new Map();
 for(let tick=0;tick<18000&&u.amount;tick++){
  game.tick();
  for(const plane of G.unitFind.filter(p=>p.o.type===UNIT.CARRYALL&&!p.o.flags.isNotOnMap)){
   const f=plane.carryallFlight;if(!f)continue;
   const before=previousHeight.get(plane);if(before!==undefined)assert.ok(Math.abs(f.height-before)<=.141,'Altitude must change gradually');previousHeight.set(plane,f.height);
   if(f.height<=.35){descended=true;if(!landedAt.has(plane))landedAt.set(plane,G.timerGame);}
   if(plane.o.linkedID===u.o.index&&!carried){carried=true;assert.ok(f.height<1,'Pickup must occur after descent');}
  }
 }
 assert.equal(u.amount,0,`Harvester must unload: ${house}, blocked=${block}, ownPlane=${withPlane}`);
 if(block){assert.ok(carried);assert.ok(descended);}
}
// Factory lifecycle uses the actual window open/close/activate methods, not a copied model.
setup();const yard=structureCreate(INDEX_INVALID,STRUCTURE.CONSTRUCTION_YARD,G.playerHouseID,packXY(9,9));assert.ok(yard);
const sounds=[],construction=[];G.onSound=id=>sounds.push(id);G.onConstructionStart=()=>construction.push('order');G.onConstructionComplete=()=>construction.push('ready');
const factory=new FactoryWindow(rom,gfx,{game:()=>game,credits:()=>10000,toggled(){},placing(){}});factory.loop=()=>{};
game.build(yard,STRUCTURE.WINDTRAP);const linked=yard.o.linkedID,initial=yard.countDown;factory.open(yard);factory.close();
for(let i=0;i<90;i++)game.tick();assert.ok(yard.countDown<initial&&yard.countDown>0);assert.equal(yard.o.linkedID,linked);
factory.open(yard);assert.equal(factory.orders[factory.cursor].type,STRUCTURE.WINDTRAP);const before=yard.countDown;factory.activate();assert.equal(yard.countDown,before);assert.equal(yard.o.linkedID,linked);
yard.countDown=1;for(let i=0;i<400&&!game.production(yard)?.ready;i++)game.tick();assert.ok(game.production(yard)?.ready);
for(let i=0;i<300;i++)game.tick();factory.open(yard);factory.close();assert.ok(game.production(yard)?.ready);assert.equal(yard.o.linkedID,linked);
assert.equal(construction.filter(x=>x==='order').length,1);assert.equal(construction.filter(x=>x==='ready').length,1);
const soundCount=sounds.length;assert.ok(game.placeIt(yard));assert.equal(G.selectionType,SELECTION.PLACE);assert.equal(sounds.length,soundCount,'Picking the ghost must not play installation');
game.cancelPlace();assert.ok(game.production(yard)?.ready);assert.ok(game.placeIt(yard));let location=0;while(location<4096&&!game.canPlaceAt(location))location++;assert.ok(location<4096);assert.ok(game.place(location));assert.equal(sounds.at(-1),0x14);assert.equal(bytes[0x6a87e+sounds.at(-1)],installation[0].id);
// Both keyboard consumers are installed in the same order as main.ts.
const pad=new Pad(),settings=new SettingsMenu(gfx,{});settings.root.hidden=false;settings.openPassword();pad.onPress(button=>settings.handlePad(button));
const key=code=>{const e={code,target:{},repeat:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){},stopPropagation(){}};for(const fn of listeners.keydown??[])fn(e);};
for(let i=0;i<10;i++){assert.equal(settings.cell,i);key('ArrowRight');}assert.equal(settings.cell,0);key('ArrowDown');assert.equal(settings.cell,10);key('ArrowRight');assert.equal(settings.cell,11);key('Digit1');assert.equal(settings.word[0],'L');
// Test cheats cover both troops and buildings, and can be turned off again.
const tank=unitCreate(INDEX_INVALID,UNIT.TANK,G.playerHouseID,tileCenter(unpackTile(packXY(18,24))),0);assert.ok(tank);game.cheat('PLAYTESTER');const hp=tank.o.hitpoints,bhp=yard.o.hitpoints;unitDamage(tank,20,0);structureDamage(yard,20,0);assert.equal(tank.o.hitpoints,hp);assert.equal(yard.o.hitpoints,bhp);game.cheat('PLAYTESTER');unitDamage(tank,20,0);assert.ok(tank.o.hitpoints<hp);
console.log('PASS: all houses unload with/without owned carryalls and blocked entrances; gradual descent; yard production survives repeated window closes and readiness; exact menu Installation effect on placement only; one keyboard event moves one letter; test invulnerability toggles.');

