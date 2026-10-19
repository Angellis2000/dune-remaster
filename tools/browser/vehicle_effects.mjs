import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.resolve(root,'../hd-vehicles');
await mkdir(path.join(out,'previews'),{recursive:true});
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,
  args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});

// Each run gets a fresh JS realm, because legacy engine globals survive Game.load().
async function simulateBattle({base64,enabled}){
 const {DuneRom}=await import('/src/rom/dune.ts');
 const {G,IT,indexEncode,indexGetTile,packTile,tileGetDirection,random256}=await import('/src/engine/core.ts');
 const {Game}=await import('/src/engine/game.ts');
 const {scriptFunctionsUnit}=await import('/src/engine/scriptfns.ts');
 const {explosionStart}=await import('/src/engine/explosion.ts');
 const {VehicleArt}=await import('/src/gfx/vehicle-art.ts');
 const {makeImpact}=await import('/src/gfx/impact-model.ts');
 const rom=new DuneRom(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));
 const art=enabled?await VehicleArt.load(rom):null;
 G.timerGame=0;G.timerGUI=0;
 const game=new Game(rom);game.load('H',5);
 let shots=0,impacts=0,origins=true;
 G.onUnitShot=(u,b)=>{if(enabled){shots++;origins&&=b.originEncoded===indexEncode(u.o.index,IT.UNIT);art.shot(u,b,G.timerGame);}};
 G.onVisualExplosion=(type,p)=>{if(enabled){impacts++;makeImpact(p.x/8,p.y/8,type,'rock',G.timerGame);}};
 const used=()=>G.units.filter(u=>u.o.flags.used&&!u.o.flags.isNotOnMap);
 const mine=used().filter(u=>[9,10].includes(u.o.type)&&u.o.houseID===G.playerHouseID);
 if(!mine.length)throw Error('No player tanks: '+JSON.stringify({player:G.playerHouseID,units:G.unitFind.map(u=>[u.o.type,u.o.houseID,u.o.flags.used,u.o.flags.isNotOnMap])}));
 for(let t=0;t<1200;t++){
   if(t%40===0)for(const u of mine)if(u.o.flags.used){
     const target={x:u.o.position.x,y:u.o.position.y-512};
     u.targetAttack=indexEncode(packTile(target),IT.TILE);u.fireDelay=0;
     u.orientation[1].current=tileGetDirection(u.o.position,indexGetTile(u.targetAttack));u.orientation[1].speed=0;
     G.scriptCurrentUnit=u;G.scriptCurrentObject=u.o;scriptFunctionsUnit[8](u.o.script);
     if(t%80===0)explosionStart(1,target);
   }
   game.tick();
 }
 return {shots,impacts,origins,state:JSON.stringify({units:used().map(u=>[u.o.index,u.o.type,u.o.position,u.o.hitpoints,u.fireDelay]),
  structures:G.structureFind.map(s=>[s.o.index,s.o.hitpoints]),map:G.map.map(t=>[t.groundTileID,t.overlayTileID]),random:random256()})};
}

const errors=[];
try{
 const base64=(await readFile(path.join(root,'rom/dune_usa.gen'))).toString('base64');
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('unavailable'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:5188/?debug&skipIntro');
 const baselinePage=await browser.newPage();await baselinePage.goto('http://127.0.0.1:5188/');
 const baseline=await baselinePage.evaluate(simulateBattle,{base64,enabled:false});await baselinePage.close();
 const withEffects=await page.evaluate(simulateBattle,{base64,enabled:true});
 assert.equal(baseline.state,withEffects.state,'Visual notifications changed simulation');
 assert.ok(withEffects.shots>0&&withEffects.impacts>0&&withEffects.origins,JSON.stringify({shots:withEffects.shots,impacts:withEffects.impacts,origins:withEffects.origins}));
 const result=await page.evaluate(async ({base64,withEffects})=>{
  const {DuneRom}=await import('/src/rom/dune.ts');
  const {VehicleArt}=await import('/src/gfx/vehicle-art.ts');
  const {ImpactParticles}=await import('/src/gfx/impact-particles.ts');
  const {makeImpact}=await import('/src/gfx/impact-model.ts');
  const {muzzlePoint,VEHICLES}=await import('/src/gfx/vehicle-geometry.ts');
  const {G}=await import('/src/engine/core.ts');
  const {World}=await import('/src/game/world.ts');
  const {MapEffects}=await import('/src/gfx/map-effects.ts');
  const rom=new DuneRom(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));
  const [art,particles,effects]=await Promise.all([VehicleArt.load(rom),ImpactParticles.load(),MapEffects.load()]);
  if(!art||!particles||!effects)throw Error('Missing HD assets');
  G.onUnitShot=()=>{};G.onVisualExplosion=()=>{};art.reset();

  const world=new World(rom);world.load('H',5);G.revealAll=true;world.sync();
  const moving=world.units.find(u=>[9,10].includes(u.type)),u=moving.ref;
  const oldPosition={...u.o.position};let drift=0;
  // Changing only the engine's legacy wobble index must leave the displayed centre fixed.
  for(let i=0;i<8;i++){u.wobbleIndex=i;world.sync();drift=Math.max(drift,Math.hypot(moving.x-oldPosition.x/8,moving.y-oldPosition.y/8));}
  if(drift>1e-9)throw Error(`Stationary drift ${drift}`);
  let backwards=0,lateral=0,previous=moving.x;
  for(let i=0;i<120;i++){
    u.o.position.x=oldPosition.x+i*4;u.wobbleIndex=i%8;world.sync();
    if(moving.x<previous-1e-9)backwards++;
    lateral=Math.max(lateral,Math.abs(moving.y-oldPosition.y/8));previous=moving.x;
  }
  if(lateral||backwards)throw Error('Straight movement wobbles or reverses');

  const images={};
  function canvas(w,h,title){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
    g.fillStyle='#54483a';g.fillRect(0,0,w,h);g.fillStyle='#eee0c8';g.font='22px sans-serif';g.fillText(title,24,32);return {c,g};}
  function unit(type,house=1,orientation=0,turret=orientation){return {type,house,orientation,turret,x:0,y:0,state:{wing:0},ref:{o:{position:{x:0,y:0}}},highlighted:false,shadow:[0,1,26].includes(type)};}
  const names=['Транспортник','Орнитоптер','Ракетница','Девиатор','Танк','Осадный танк','Девастатор','Звуковой танк','Трайк','Рейдер','Квад','Харвестер','MCV','Фрегат'];
  {
    const {c,g}=canvas(1400,490,'HD-техника · отдельные корпуса и оружие');
    VEHICLES.forEach((d,i)=>{const cx=100+i%7*200,cy=150+Math.floor(i/7)*220;
      g.save();g.translate(cx,cy);g.scale(5,5);if(!art.draw(g,unit(d.type,1,0,0),0))throw Error(`Missing type ${d.type}`);g.restore();
      g.fillStyle='#eee0c8';g.font='17px sans-serif';g.textAlign='center';g.fillText(names[i],cx,cy+100);g.textAlign='left';});
    images['vehicles.png']=c.toDataURL().split(',')[1];
  }
  {
    const {c,g}=canvas(1440,540,'Башня: 16 контрольных направлений из 256 · выстрел и отдача');
    for(let i=0;i<16;i++){
      const cx=90+i%8*180,cy=158+Math.floor(i/8)*245,angle=i*16,uu=unit(9,1,0,angle);
      art.shot(uu.ref,{orientation:[{current:angle}],o:{type:23}},0);
      g.save();g.translate(cx,cy);g.scale(5,5);art.draw(g,uu,3);g.restore();
      g.fillStyle='#eee0c8';g.font='16px sans-serif';g.textAlign='center';g.fillText(`${i*22.5}°`,cx,cy+110);g.textAlign='left';
    }
    images['turns-and-fire.png']=c.toDataURL().split(',')[1];
  }
  {
    const {c,g}=canvas(1440,640,'Взрыв: песок / скала · выброс, полёт и оседание');
    const ages=[3,8,16,30,50,78];
    for(let row=0;row<2;row++)for(let col=0;col<ages.length;col++){
      const cx=120+col*240,cy=180+row*290;
      g.fillStyle=row?'#6e5e4d':'#b19466';g.fillRect(col*240+5,cy-110,230,230);
      particles.reset();particles.burst(0,0,6,row?'rock':'sand',0);
      g.save();g.translate(cx,cy);g.scale(4,4);
      particles.draw(g,ages[col],'ground',()=>true);
      if(ages[col]<30){const s=effects.frame(`frame:${[183,184,185,186][Math.min(3,col)]}`);if(s)g.drawImage(s.canvas,s.ox,s.oy,s.worldWidth,s.worldHeight);}
      particles.draw(g,ages[col],'air',()=>true);g.restore();
      g.fillStyle='#eee0c8';g.font='17px sans-serif';g.textAlign='center';g.fillText(`${row?'Скала':'Песок'} · ${(ages[col]/60).toFixed(2)} c`,cx,cy+142);g.textAlign='left';
    }
    images['impacts.png']=c.toDataURL().split(',')[1];
  }
  // Fog clipping and bounded lifetime even under sustained heavy fire.
  particles.reset();for(let i=0;i<100;i++)particles.burst(30,30,11,'rock',0);
  const peak=particles.particles.length;if(peak>650)throw Error('Particle cap exceeded');
  const f=document.createElement('canvas');f.width=f.height=128;const fg=f.getContext('2d');
  particles.draw(fg,12,'air',()=>false);
  const hiddenPixels=fg.getImageData(0,0,128,128).data.filter((v,i)=>i%4===3&&v>0).length;
  if(hiddenPixels)throw Error('Particles leak into fog');
  particles.draw(fg,200,'air',()=>true);if(particles.particles.length)throw Error('Particles did not expire');
  return {images,checks:{vehicles:VEHICLES.length,headings:256,reviewHeadings:16,shots:withEffects.shots,impacts:withEffects.impacts,
    simulationUnchanged:true,stationaryDrift:drift,lateralDrift:lateral,backwardsSteps:backwards,particleCap:peak,hiddenPixels}};
 },{base64,withEffects:{shots:withEffects.shots,impacts:withEffects.impacts}});
 for(const [name,data]of Object.entries(result.images))await writeFile(path.join(out,'previews',name),Buffer.from(data,'base64'));
 assert.deepEqual(errors,[]);
 await writeFile(path.join(out,'verification.json'),JSON.stringify({...result.checks,errors},null,2));
 console.log(JSON.stringify(result.checks));
 // Exercise the real application wiring, rather than only the standalone renderer.
 await page.locator('input[type=file]').first().setInputFiles(path.join(root,'rom/dune_usa.gen'));
 await page.waitForFunction(()=>window.dune?.view?.vehicles&&window.dune?.view?.particles,{timeout:30000});
 await page.evaluate(()=>{window.dune.world.load('H',5);const {world,view,G}=window.dune;G.revealAll=true;world.sync();
   const u=world.units.find(u=>u.type===9||u.type===10);view.setWorld(world,u.x,u.y);view.setZoom(5);view.draw();});
 await page.screenshot({path:path.join(out,'previews','in-game.png')});
 assert.deepEqual(errors,[]);
 console.log('Real application: HD vehicles and particles loaded, screenshot saved, no JS errors.');
}finally{await browser.close();}
