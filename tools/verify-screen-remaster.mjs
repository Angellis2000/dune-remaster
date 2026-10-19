// Targeted renderer/flow verification on the user's ROM, without browser automation.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'web/package.json'));
const {build}=require('esbuild');
const canvasPath=process.env.CANVAS_MODULE ?? 'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas';
const {createCanvas,loadImage,ImageData,Path2D}=require(canvasPath);
const sharp=require(path.resolve(canvasPath,'../../sharp'));
const out=path.join(root,'hd-vehicles/previews/screens-v5');await mkdir(out,{recursive:true});
const mentatOnly=process.argv.includes('--mentat-only');
const modulePath=path.join(root,'scratch/screen-renderer-test.mjs');
await build({stdin:{contents:`export {EndPicture,Flyby,END_ROM,objectDef} from './src/ui/endgame.ts';export {ScoreScreen} from './src/ui/score.ts';export {MentatScreen} from './src/ui/mentat.ts';export {FinaleScreen} from './src/ui/finale.ts';export {WormArt} from './src/gfx/worm-art.ts';export {drawWall} from './src/gfx/wall-art.ts';export {VehicleArt} from './src/gfx/vehicle-art.ts';export {MapEffects} from './src/gfx/map-effects.ts';export {DuneRom} from './src/rom/dune.ts';export {explosionTable} from './src/engine/tables.ts';export {FactoryWindow,HD_STAT_SLOTS} from './src/ui/factory.ts';export {ScreenGfx} from './src/gfx/screens.ts';export {Portraits} from './src/gfx/portraits.ts';export {Skins} from './src/gfx/skins.ts';export {STRUCTURE_ART} from './src/gfx/structure-art.ts';export {InfantryArt} from './src/gfx/infantry-art.ts';export {MapView} from './src/view/mapview.ts';export {BuildingPortraits} from './src/gfx/building-portraits.ts';export {Hud,HUD_ROM} from './src/ui/hud.ts';export {Intro} from './src/ui/intro.ts';export {FrontEnd} from './src/ui/frontend.ts';export {prepareMenu} from './src/gfx/menu-canvas.ts';export {MentatMotion} from './src/gfx/mentat-motion.ts';`,resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:modulePath,plugins:[{name:'image-urls',setup(b){b.onResolve({filter:/\?.*url$/},args=>({path:path.resolve(args.resolveDir,args.path.split('?')[0]),namespace:'asset-url'}));b.onLoad({filter:/.*/,namespace:'asset-url'},args=>({contents:`export default ${JSON.stringify(args.path)}`,loader:'js'}));}}]});
globalThis.ImageData=ImageData;
globalThis.Path2D=Path2D;
globalThis.window={devicePixelRatio:1,addEventListener(){}};
globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};
globalThis.document={createElement(tag){
 const el=tag==='canvas'?createCanvas(1600,900):{};
 el.hidden=false;el.style={};el.dataset={};el.setAttribute=()=>{};el.addEventListener=()=>{};el.append=()=>{};
 el.getBoundingClientRect=()=>({left:0,top:0,width:1600,height:900});return el;
}};
globalThis.Audio=class{paused=true;ended=false;currentTime=0;duration=60;constructor(src){this.src=src;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){};};
const {EndPicture,Flyby,END_ROM,objectDef,ScoreScreen,MentatScreen,FinaleScreen,WormArt,drawWall,VehicleArt,MapEffects,DuneRom,explosionTable,FactoryWindow,HD_STAT_SLOTS,ScreenGfx,Portraits,Skins,STRUCTURE_ART,InfantryArt,MapView,BuildingPortraits,Hud,HUD_ROM,Intro,FrontEnd,prepareMenu,MentatMotion}=await import(pathToFileURL(modulePath));
const rom=new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen'))));
globalThis.fetch=async file=>new Response(await readFile(file));
// Decode authored PNGs through libvips: native Canvas misidentifies some embedded C2PA metadata as SVG.
globalThis.createImageBitmap=async blob=>{const im=await loadImage(await sharp(Buffer.from(await blob.arrayBuffer())).png().toBuffer());im.close=()=>{};return im;};
const images=new Map();
for(const [key,file] of Object.entries({arrakis:'arrakis-wide',victory:'victory-hd',defeat:'defeat-hd',mentatAtreides:'mentat-atreides-hd',mentatOrdos:'mentat-ordos-hd',mentatHarkonnen:'mentat-harkonnen-hd',operationsConsole:'operations-console-hd',strategicSurface:'strategic-relief-hd',productionConsole:'production-console-hd',buildingPortraitsA:'building-portraits-a',buildingPortraitsB:'building-portraits-b',buildingPortraitsC:'building-portraits-c',buildingPortraitsD:'building-portraits-d',buildingIconsA:'building-icons-a',buildingIconsB:'building-icons-b'}))images.set(key,await loadImage(path.join(root,'web/src/gfx/assets/frontend',file+'.png')));
const art={get:key=>images.get(key),background(ctx,key){const im=images.get(key),m=ctx.getTransform(),lw=ctx.canvas.width/m.a,lh=ctx.canvas.height/m.d,w=Math.max(lw,lh*im.width/im.height),h=w*im.height/im.width;ctx.drawImage(im,(320-w)/2,(224-h)/2,w,h);return true;}};
// Use decoded frames from the actual alpha WebM for portrait playback/state checks.
const idlePortrait=await loadImage(path.join(root,'web/public/video/mentat-harkonnen-idle.png'));
const talkPortrait=await loadImage(path.join(root,'scratch/mentat-video/speaking.png'));
const vid=createCanvas(idlePortrait.width,idlePortrait.height);vid.getContext('2d').drawImage(talkPortrait,0,0);
let videoPlays=0,videoPauses=0;
Object.assign(vid,{readyState:4,seeking:false,paused:true,play(){videoPlays++;this.paused=false;return Promise.resolve();},pause(){videoPauses++;this.paused=true;}});
const motion=new MentatMotion();Object.assign(motion,{prepared:true,video:vid,poster:idlePortrait});
const actor=createCanvas(320,224),ag=actor.getContext('2d');
assert.equal(motion.draw(ag,0,false),true);assert.equal(videoPlays,0);
motion.draw(ag,0,true);await Promise.resolve();assert.equal(videoPlays,1);
ag.clearRect(0,0,320,224);motion.draw(ag,0,true);
const talkingPixels=ag.getImageData(0,0,320,224).data;
assert.equal(vid.paused,false);motion.draw(ag,0,false);assert.equal(vid.paused,true);
ag.clearRect(0,0,320,224);motion.draw(ag,0,false);assert.ok(videoPauses>0);
assert.deepEqual(ag.getImageData(0,0,320,224).data,talkingPixels,'A speech pause must keep the actual pose without ghosting or snapping to another frame');
ag.clearRect(0,0,320,224);motion.draw(ag,0,true);await Promise.resolve();
assert.deepEqual(ag.getImageData(0,0,320,224).data,talkingPixels,'Resuming must retain the same pose and alpha');
const alphaCanvas=createCanvas(idlePortrait.width,idlePortrait.height),ac=alphaCanvas.getContext('2d');ac.drawImage(idlePortrait,0,0);
assert.equal(ac.getImageData(0,0,1,1).data[3],0);assert.equal(ac.getImageData(511,0,1,1).data[3],0);
assert.equal(ac.getImageData(250,130,1,1).data[3],255,'Face must remain opaque after white-background removal');
const videoScreen=new MentatScreen(rom,null,art);videoScreen.motion=motion;
videoScreen.open({house:'H',level:2,text:videoScreen.text('H',3),buttons:'accept'},()=>{});videoScreen.stepFrames(80);
videoScreen.phase='typer';videoScreen.talk=1;videoScreen.stepFrames(0);await Promise.resolve();videoScreen.stepFrames(0);
await writeFile(path.join(out,'harkonnen-video-speaking.png'),videoScreen.canvas.toBuffer('image/png'));
videoScreen.talk=2;videoScreen.stepFrames(0);
await writeFile(path.join(out,'harkonnen-video-idle.png'),videoScreen.canvas.toBuffer('image/png'));videoScreen.close();assert.equal(vid.paused,true);
// Each new portrait uses its own media and preserves its pose across pauses/house changes.
for(const[house,name,motionField,other,otherName]of[['A','atreides','atreidesMotion','O','ordos'],['O','ordos','ordosMotion','A','atreides']]){
 const createElement=document.createElement,fetchFile=globalThis.fetch,created=[];
 const talk=await loadImage(path.join(root,`scratch/mentat-${name}-video/speaking.png`));
 document.createElement=tag=>{
  if(tag!=='video')return createElement(tag);
  const video=createCanvas(512,384);video.getContext('2d').drawImage(talk,0,0);
  Object.assign(video,{readyState:4,seeking:false,paused:true,currentTime:0,setAttribute(){},addEventListener(){},play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}});
  created.push(video);return video;
 };
 globalThis.fetch=file=>fetchFile(file.startsWith('/video/')?path.join(root,'web/public',file):file);
 try{
  const screen=new MentatScreen(rom,null,art);
  screen.open({house,level:0,text:screen.text(house,1),buttons:'accept'},()=>{});screen.stepFrames(80);screen.stopVoice();
  for(let i=0;i<100&&!screen[motionField].poster;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.ok(screen[motionField].poster,'Portrait poster must load from its actual public path: '+name);
  assert.equal(created.length,1);assert.ok(created[0].src.endsWith(`mentat-${name}-alpha.webm`));
  assert.equal(created[0].muted,true);assert.equal(created[0].volume,0);assert.equal(created[0].loop,true);
  screen.phase='typer';screen.talk=1;screen.stepFrames(0);await Promise.resolve();screen.stepFrames(0);
  assert.equal(created[0].paused,false);
  const talking=screen.canvas.toBuffer('image/png');await writeFile(path.join(out,`${name}-video-speaking.png`),talking);
  screen.talk=2;screen.stepFrames(0);assert.equal(created[0].paused,true);
  assert.deepEqual(screen.canvas.toBuffer('image/png'),talking,'Speech pauses must not replace the pose or double the face');
  screen.open({house:'H',level:0,text:screen.text('H',1),buttons:'accept'},()=>{});
  assert.equal(created[0].paused,true);assert.ok(created[1].src.endsWith('mentat-harkonnen-alpha.webm'));
  screen.open({house:other,level:0,text:screen.text(other,1),buttons:'accept'},()=>{});
  assert.equal(created.length,3);assert.equal(created[1].paused,true);assert.ok(created[2].src.endsWith(`mentat-${otherName}-alpha.webm`));screen.close();
  assert.ok(created.every(video=>video.paused),'Changing/closing houses must stop every portrait');
 }finally{document.createElement=createElement;globalThis.fetch=fetchFile;}
}
for(const[house,name]of[['A','atreides'],['O','ordos'],['H','harkonnen']]){
 const ducking=[],screen=new MentatScreen(rom,{setVoiceDucking:active=>ducking.push(active)},art);
 screen.open({house,level:0,text:screen.text(house,1,3),buttons:'accept',again:true},()=>{});screen.stepFrames(80);
 assert.equal(screen.voiceAudio.src,`./voice/${name}-m01-advice.mp3`);assert.equal(screen.voiceAudio.paused,false);
 assert.deepEqual(screen.voicePlan,[{src:`./voice/${name}-m01-advice.mp3`,firstPage:0,endPage:screen.pages.length}]);
 const audio=screen.voiceAudio;assert.equal(ducking.at(-1),true);
 audio.currentTime=audio.duration-.51;screen.stepFrames(1);
 assert.deepEqual(screen.page,screen.pages.at(-1),'Advice narration must cover the last phrase');
 audio.ended=true;screen.stepFrames(1);assert.equal(screen.phase,'buttons');assert.equal(audio.paused,true);assert.equal(ducking.at(-1),false);
 screen.open({house,level:1,text:screen.text(house,2,3),buttons:'accept',again:true},()=>{});assert.deepEqual(screen.voicePlan,[],'Mission 1 advice must not play for later missions');
 screen.close();
}
if(mentatOnly){console.log('PASS: three mission-1 advice recordings, complete phrase progression, ending/ducking and later-mission isolation; video speech/pause and house switching.');process.exit(0);}
const shot=async(screen,name)=>{assert.equal(screen.canvas.width,1600);assert.equal(screen.canvas.height,900);await writeFile(path.join(out,name+'.png'),screen.canvas.toBuffer('image/png'));};
for(const result of ['won','lost']){
 const screen=new EndPicture(rom,art);let done=false;screen.open(result,()=>done=true);screen.stepFrames(220);await shot(screen,result);assert.equal(done,false);screen.handlePad('a');screen.stepFrames(1);assert.equal(done,true);
}
for(const house of ['H','A','O']){
 const screen=new MentatScreen(rom,null,art);screen.open({house,level:2,text:screen.text(house,3),buttons:'accept'},()=>{});screen.stepFrames(80);
 screen.stopVoice();screen.mouth=0;screen.eyes=0;screen.stepFrames(0);await shot(screen,'mentat-'+house);
 const body=screen.canvas.getContext('2d').getImageData(230,790,150,70).data;
 screen.mouth=4;screen.eyes=4;screen.stepFrames(0);const speaking=screen.canvas.getContext('2d').getImageData(230,790,150,70).data;
 assert.deepEqual(body,speaking,'Mouth animation must not move the body');
 screen.endText();screen.stepFrames(0);assert.equal(screen.phase,'buttons');await shot(screen,'buttons-'+house);screen.close();
}
const leave=new MentatScreen(rom,null,art);let left=false;leave.open({house:'A',level:2,text:leave.text('A',3),buttons:'accept',leave:true},()=>left=true);leave.stepFrames(80);leave.endText();leave.handlePad('a');leave.stepFrames(400);await shot(leave,'map-leave');leave.stepFrames(1600);assert.equal(left,true,'HD map transition must still enter the mission');
const mc=createCanvas(320,224),mg=mc.getContext('2d');for(let h=0;h<3;h++)for(let level=0;level<9;level++)for(let r=0;r<10;r++){mg.clearRect(0,0,320,224);leave.strategic.draw(mg,h,level,r);const source=new Uint32Array(320*224);leave.gfx.drawMap(source,h,level,leave.gfx.palette(h,level,0),1<<(9-r));const mask=mg.getImageData(0,0,320,224).data;let missing=0;for(let i=0;i<source.length;i++)if(source[i]&&!mask[i*4+3])missing++;assert.equal(missing,0,'HD region must cover every original region pixel: '+[h,level,r]);}
const stats={mission:3,house:1,won:true,score:4200,time:150000,spice:[1500,980],units:[21,7],structures:[8,2]};
const score=new ScoreScreen(rom,()=>{},art);score.open(stats,()=>{});score.stepFrames(2000);assert.deepEqual(score.shownValues,[stats.spice,stats.units,stats.structures]);assert.equal(score.page,'stats');await shot(score,'score');
score.handlePad('a');score.stepFrames(130);assert.equal(score.page,'password');assert.ok(score.passwordText.length>0);await shot(score,'password');score.close();
const final=new FinaleScreen(rom,null,art);final.open(1,()=>{});final.stepFrames(1100);await shot(final,'finale');final.close();
// All campaign variants retain the original ownership codes and recognizable faction hues.
for(let h=0;h<3;h++)for(let level=0;level<9;level++)for(let r=0;r<10;r++){
 mg.clearRect(0,0,320,224);leave.strategic.draw(mg,h,level,r);
 const px=mg.getImageData(0,0,320,224).data,sum=[0,0,0];
 for(let p=0;p<px.length;p+=4)if(px[p+3]>240)for(let j=0;j<3;j++)sum[j]+=px[p+j];
 const owner=leave.gfx.regionColor(h,level,r);
 if(owner===1)assert.ok(sum[0]>sum[1]*1.7&&sum[0]>sum[2]*1.7,'Harkonnen territories must be red');
 if(owner===2)assert.ok(sum[2]>sum[0]*2&&sum[2]>sum[1]*1.5,'Atreides territories must be blue');
 if(owner===3)assert.ok(sum[1]>sum[0]*1.5&&sum[1]>sum[2]*1.4,'Ordos territories must be green');
}
const campaign=createCanvas(1600,900),cg=campaign.getContext('2d');cg.scale(900/224,900/224);cg.translate((1600/(900/224)-320)/2,0);leave.strategic.backdrop(cg,true);
for(let r=0;r<10;r++)leave.strategic.draw(cg,1,2,r);
await writeFile(path.join(out,'campaign-atreides.png'),campaign.toBuffer('image/png'));
// Regions keep their original top silhouette and carry a separate solid lower edge.
for(let r=0;r<10;r++){
 const region=leave.strategic.region(1,2,r),test=createCanvas(region.w+2,region.h+4),g=test.getContext('2d');
 g.drawImage(region.image,0,0,region.w,region.h);const top=g.getImageData(0,0,test.width,test.height).data;
 g.clearRect(0,0,test.width,test.height);g.drawImage(region.depth,0,0,test.width,test.height);
 const side=g.getImageData(0,0,test.width,test.height).data;let visible=0;
 for(let i=3;i<side.length;i+=4)if(side[i]>200&&top[i]<10)visible++;
 assert.ok(visible>10,'Every region needs visible thickness below its unchanged top: '+r);
}
const zoomScreen=new MentatScreen(rom,null,art);zoomScreen.open({house:'A',level:2,text:zoomScreen.text('A',3),buttons:'accept',leave:true},()=>{});
zoomScreen.stepFrames(80);zoomScreen.endText();zoomScreen.handlePad('a');
for(let i=0;i<1800&&!zoomScreen.hdZoom;i++)zoomScreen.tick();
assert.ok(zoomScreen.hdZoom,'Mission transition must initialize the smooth HD camera');
await shot((zoomScreen.draw(),zoomScreen),'map-zoom-0');
for(const frame of [32,64,96]){while(zoomScreen.timer-zoomScreen.hdZoomStarted<frame)zoomScreen.tick();zoomScreen.draw();await shot(zoomScreen,'map-zoom-'+frame);}
zoomScreen.close();
const [vehicles,effects]=await Promise.all([VehicleArt.load(rom),MapEffects.load()]);assert.ok(vehicles);assert.ok(effects);
assert.ok(effects.constructionSite);
{
const decalIds=[...Array.from({length:19},(_,i)=>i+1),33,125,208,209];
const decalCell=createCanvas(256,256),dc=decalCell.getContext('2d');
for(const id of decalIds){
 const s=effects.icon(id);assert.ok(s);dc.clearRect(0,0,256,256);dc.drawImage(s.image,s.sx,s.sy,s.sw,s.sh,0,0,256,256);
 const data=dc.getImageData(0,0,256,256).data;let solid=0;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const alpha=data[(y*256+x)*4+3];if(alpha>200)solid++;
  if(x<2||y<2||x>=254||y>=254)assert.ok(alpha<=8,'Decal must be transparent around every edge, with no cut rim or square ground: '+id);
 }
 assert.ok(solid>1000,'Decal must retain an intact visible center: '+id);
}
const decalPreview=createCanvas(1200,480),dg=decalPreview.getContext('2d');
const sandDetail=await loadImage(path.join(root,'web/src/gfx/assets/map-hd/ground-detail.png'));
dg.drawImage(sandDetail,0,0,1200,480);dg.fillStyle='#df751b66';dg.fillRect(600,0,600,480);
const drawDecal=(id,x,y,size)=>{const s=effects.icon(id);dg.drawImage(s.image,s.sx,s.sy,s.sw,s.sh,x,y,size,size);};
for(let i=0;i<6;i++){drawDecal([1,7,19,33,208,209][i],20+i*195,120,180);}
await writeFile(path.join(out,'decals-sand-spice.png'),decalPreview.toBuffer('image/png'));
}
const skins=new Skins();
for(const entry of STRUCTURE_ART)skins.defaults.set('structure:'+entry.type,await skins.loadDefault(entry));
const infantry=await InfantryArt.load(rom);assert.ok(infantry);
const portraitWorm=new WormArt(await loadImage(path.join(root,'web/src/gfx/assets/vehicles-hd/sandworm-hd.png')));
const gfx=new ScreenGfx(rom);gfx.art=art;
const buildings=new BuildingPortraits(rom,gfx);
const portraits=new Portraits(skins,vehicles,infantry,effects,{},()=>1,portraitWorm,buildings);
const gallery=createCanvas(1792,1568),gg=gallery.getContext('2d');gg.fillStyle='#16191a';gg.fillRect(0,0,1792,1568);
for(const kind of ['unit','structure'])for(let type=0;type<(kind==='unit'?27:19);type++){
 const image=portraits.icon(kind,type),alpha=image.getContext('2d').getImageData(0,0,128,96).data;
 assert.ok(alpha.some((n,i)=>i%4===3&&n>32),'Empty live HD thumbnail '+kind+':'+type);
 const index=type+(kind==='unit'?0:28),x=index%7*256,y=Math.floor(index/7)*224;
 gg.drawImage(image,x,y,256,192);gg.fillStyle='#d4c7ad';gg.font='16px Arial';gg.fillText(kind+' '+type,x+10,y+212);
}
await writeFile(path.join(out,'all-objects.png'),gallery.toBuffer('image/png'));
// Every building UI uses its own original portrait camera, never a battlefield model.
const battlefieldArt=skins.structure.bind(skins);skins.structure=()=>{throw Error('UI reused overhead building art');};
const buildingSheet=createCanvas(1536,9*170),bs=buildingSheet.getContext('2d');bs.fillStyle='#14171a';bs.fillRect(0,0,buildingSheet.width,buildingSheet.height);
for(let type=0;type<19;type++){
 const large=portraits.image('structure',type),small=portraits.icon('structure',type);
 assert.deepEqual([large.width,large.height],[384,224]);assert.deepEqual([small.width,small.height],[128,96]);
 const x=type%3*512,y=Math.floor(type/3)*218;
 bs.drawImage(large,x+6,y+4,336,196);bs.drawImage(small,x+348,y+34,160,120);
 bs.font='14px Arial';bs.fillStyle='#ded2b5';bs.fillText(String(type),x+12,y+212);
}
skins.structure=battlefieldArt;
await writeFile(path.join(out,'building-portraits.png'),buildingSheet.toBuffer('image/png'));
const hud=new Hud(rom,portraits),data=new DataView(rom.bytes.buffer,rom.bytes.byteOffset,rom.bytes.byteLength);
const windtrapInfo=data.getUint32(HUD_ROM.structureInfo+9*4),windtrapFrame=data.getUint16(windtrapInfo+0x14);
assert.equal(hud.pictures.get(windtrapFrame).image(),portraits.icon('structure',9));
hud.credits.shown=780;hud.draw({portrait:windtrapFrame,hp:{value:200,max:200},order:null,bar:null,prohibited:false});
await writeFile(path.join(out,'hud-building.png'),hud.canvas.toBuffer('image/png'));
// Main menu retains the same live starfield and planet after the intro hands over.
const intro=new Intro(gfx),front=new FrontEnd(gfx,{newGame(){},options(){}});
const backdrop=createCanvas(1600,900);backdrop.getBoundingClientRect=()=>({width:1600,height:900});
intro.mode='title';intro.hsB=-704;intro.animationFrame=300;intro.showA=false;
intro.draw(prepareMenu(backdrop));
const oldLettering=gfx.drawTitleLettering;gfx.drawTitleLettering=()=>{};
front.mode='title';front.frame=300;front.item=-1000;front.draw();
assert.deepEqual(front.canvas.getContext('2d').getImageData(0,0,1600,900).data,backdrop.getContext('2d').getImageData(0,0,1600,900).data,'Title handover must retain the exact animated background');
front.frame=480;front.draw();assert.notDeepEqual(front.canvas.toBuffer('image/png'),backdrop.toBuffer('image/png'),'Menu stars and planet must keep animating');
gfx.drawTitleLettering=oldLettering;front.item=0;front.titleStartFrame=120;front.openTitle();assert.equal(front.titleStartFrame,120,'Returning from options must not restart title assembly');await shot(front,'title');
for(const scroll of [0,-80,-320,-600,-704]){const ctx=prepareMenu(backdrop);intro.drawBackdrop(ctx,300,scroll);const p=ctx.getImageData(0,0,1600,900).data;assert.ok(p.some((v,i)=>i%4!==3&&v>40),'Starfield must stay visible during camera travel: '+scroll);}
for(const type of [8,11]){
 const factory=new FactoryWindow(rom,gfx,{game:()=>({production:()=>null}),credits:()=>780,toggled(){},placing(){}},portraits);
 factory.s={o:{type,houseID:1,hitpoints:1000,linkedID:255,flags:{}},state:0};factory.orders=type===8?[{type:0,cost:5,available:0},{type:9,cost:300,available:0},{type:12,cost:400,available:0}]:[{type:9,cost:300,available:3},{type:16,cost:300,available:2}];
 factory.cursor=1;factory.root.hidden=false;factory.draw();await shot(factory,type===8?'production':'starport');
 if(type===8){
  const baseline=createCanvas(1600,900);baseline.getBoundingClientRect=()=>({width:1600,height:900});prepareMenu(baseline).drawImage(images.get('productionConsole'),0,0,320,224);
  const bp=baseline.getContext('2d').getImageData(0,0,1600,900).data,fp=factory.canvas.getContext('2d').getImageData(0,0,1600,900).data;
  const scale=900/224,left=(1600-320*scale)/2;
  for(const slot of HD_STAT_SLOTS){let minY=900,maxY=0,count=0;
   for(let y=Math.floor((slot.iconY-7)*scale);y<Math.ceil((slot.iconY+7)*scale);y++)for(let x=Math.floor(left+160*scale);x<left+177*scale;x++){
    const p=(y*1600+x)*4;if(Math.max(fp[p],fp[p+1],fp[p+2])>100&&Math.max(...[0,1,2].map(j=>Math.abs(fp[p+j]-bp[p+j])))>30){minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}
   }
   assert.ok(count>20);assert.ok(Math.abs((minY+maxY)/2/scale-slot.iconY)<.9,'Stat symbol must be centered in its actual aperture');
  }
 }
 factory.orders=Array.from({length:20},(_,i)=>({type:i%19,cost:100,available:0}));factory.cursor=19;factory.activate=()=>{};
 const scale=900/224,left=(1600-320*scale)/2;
 factory.onClick({clientX:left+80*scale,clientY:82*scale});assert.equal(factory.cursor,7,'Scrolled factory click must select the visible order');
 factory.onClick({clientX:left+80*scale,clientY:200*scale});assert.equal(factory.cursor,7,'Console hardware must not select a hidden order');
}
// Exercise the actual map renderer: HD construction must obey the original footprint and fog.
const field=createCanvas(800,600),fg=field.getContext('2d'),ground=new Uint16Array(4096),overlay=new Uint16Array(4096);
const structure={id:1,type:12,built:false,x:1,y:1,w:3,h:2,ref:{rotationSpriteDiff:0,o:{linkedID:255,index:0,houseID:1,script:{variables:new Uint16Array(16)}}}};
overlay[(1<<6)|2]=127;
const view=Object.assign(Object.create(MapView.prototype),{canvas:field,ctx:fg,zoom:4,pixelRatio:1,camX:0,camY:0,
 world:{units:[],blasts:[],structures:[structure],map:{ground,overlay,inBounds:(x,y)=>x>=0&&y>=0&&x<6&&y<4}},
 sprites:{mapEffects:effects},skins,terrain:{kinds:new Uint8Array(512),covers:()=>true,draw(ctx){ctx.fillStyle='#927e55';ctx.fillRect(0,0,800,600);}},
 tracks:{update(){},draw(){}},selectedUnits:new Set(),structureIcons:[],veiledIcon:127,cursorX:-100,cursorY:-100,cursorKind:'select'});
view.draw();const hidden=fg.getImageData(320,192,1,1).data;assert.deepEqual([...hidden],[0,0,0,255],'Construction must stay hidden by fog');
const before=fg.getImageData(192,192,1,1).data;assert.ok(before[0]!==146||before[1]!==126,'Visible construction must replace the old tile art');
await writeFile(path.join(out,'construction-fog.png'),field.toBuffer('image/png'));
overlay[(1<<6)|2]=0;view.draw();await writeFile(path.join(out,'construction.png'),field.toBuffer('image/png'));
structure.built=true;view.draw();await writeFile(path.join(out,'completed-building.png'),field.toBuffer('image/png'));
for(const commands of explosionTable)for(const [op,id]of commands)if(op===1&&id)assert.ok(effects.frame('frame:'+id),'Missing live HD effect '+id);
for(let dir=0;dir<8;dir++)for(let frame=0;frame<3;frame++)assert.ok(effects.frame(`dust:${dir}:${frame}`));
const savedRandom=Math.random;
try{
 for(let direction=0;direction<4;direction++)for(let house=0;house<3;house++){
  Math.random=()=>direction/4+.01;const calls=[];
  const fly=new Flyby(rom,{ornithopter:(_ctx,...args)=>calls.push(args)});fly.start(house);fly.tick(320,224,4);
  assert.equal(calls.length,7);assert.equal(fly.canvas.width,1280);assert.equal(fly.canvas.height,896);
  const defs=objectDef(rom.bytes,END_ROM.flyDefs[direction]);
  for(let i=0;i<7;i++){assert.equal(calls[i][0]-calls[3][0],defs[i].x-defs[3].x);assert.equal(calls[i][1]-calls[3][1],defs[i].y-defs[3].y);assert.equal(calls[i][3],house);}
  const real=new Flyby(rom,vehicles);real.start(house);for(let i=0;i<70;i++)real.tick(320,224,4);
  if(house===1)await writeFile(path.join(out,'flyby-'+direction+'.png'),real.canvas.toBuffer('image/png'));
  real.stop();assert.equal(real.canvas.hidden,true);
 }
}finally{Math.random=savedRandom;}
const wings=createCanvas(1280,400),wg=wings.getContext('2d');wg.scale(8,8);
for(let i=0;i<10;i++)vehicles.ornithopter(wg,8+i*16,25,0,1,i,0,false);
await writeFile(path.join(out,'wing-cycle.png'),wings.toBuffer('image/png'));
const detail=createCanvas(1600,900),dg=detail.getContext('2d');dg.drawImage(images.get('strategicSurface'),0,0,1254,1254,0,0,1600,900);const concrete=await loadImage(path.join(root,'web/src/gfx/assets/map-hd/concrete.png'));for(let i=0;i<16;i++)drawWall(dg,60+(i%8)*185,50+Math.floor(i/8)*160,128,i,concrete);const worm=new WormArt(await loadImage(path.join(root,'web/src/gfx/assets/vehicles-hd/sandworm-hd.png')));dg.save();dg.translate(0,450);dg.scale(5,5);for(let i=0;i<4;i++)worm.swallow(dg,35+i*82,42,i*4);dg.restore();await writeFile(path.join(out,'field-details.png'),detail.toBuffer('image/png'));
console.log('PASS: 19 original building portrait cameras and icons in menu/HUD, production scrolling and fog-safe construction, seamless animated title, all 27 campaign layouts/faction hues, 12 HD flybys, all explosion/dust frames, mentats and mission-end transitions. Previews: '+out);




