import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const results=[];
 for(const mission of ['O9','A1']){
  const page=await browser.newPage();await page.goto('http://127.0.0.1:5188/');
  results.push(await page.evaluate(async ({data,mission})=>{
   const {DuneRom}=await import('/src/rom/dune.ts');const {Game}=await import('/src/engine/game.ts');
   const {G}=await import('/src/engine/core.ts');
   const {houseInfo}=await import('/src/engine/tables.ts');
   const {unitHouseUnitCountAdd}=await import('/src/engine/unit.ts');
   const rom=new DuneRom(Uint8Array.from(atob(data),c=>c.charCodeAt(0))),game=new Game(rom);
   const shots=[],feedback=[],missiles=[],messages=[];
   G.onUnitShot=(u,b)=>{if(shots.length<20)shots.push({tick:G.timerGame,type:u.o.type,house:u.o.houseID,x:u.o.position.x/256,y:u.o.position.y/256,target:u.targetAttack,bullet:b.o.type});};
   G.onFeedback=id=>{if(feedback.length<12)feedback.push({tick:G.timerGame,id});};
   G.onMessage=text=>{if(messages.length<10)messages.push({tick:G.timerGame,text});};
   game.load(mission[0],Number(mission.slice(1)));
   const initialPalaces=G.structureFind.filter(s=>s.o.type===2).map(s=>({house:s.o.houseID,countDown:s.countDown,wait:s.specialWait,weapon:houseInfo[s.o.houseID].specialWeapon}));
   const initialUnits=G.unitFind.map(u=>({type:u.o.type,house:u.o.houseID,action:u.actionID,x:u.o.position.x/256,y:u.o.position.y/256}));
   const seen=new Set();
   for(let i=0;i<1800;i++){
    game.tick();for(const u of G.unitFind)if(u.o.type===18&&!seen.has(u)){
      seen.add(u);missiles.push({tick:G.timerGame,house:u.o.houseID,target:u.targetAttack});
    }
   }
   const beforeContact={shots:shots.length,missiles:missiles.length};
   let wakeup=null;
   if(mission==='O9'){
     const enemy=G.unitFind.find(u=>u.o.houseID===4&&u.o.type>=2&&u.o.type<=17&&!u.o.flags.isNotOnMap);
     if(!enemy)throw Error('Missing contact unit');
     const before=G.houses[4].flags.isAIActive;
     unitHouseUnitCountAdd(enemy,G.playerHouseID);
     const after=G.houses[4].flags.isAIActive;
     for(let i=0;i<600;i++)game.tick();
     wakeup={before,after,palaceCharge:G.structureFind.find(s=>s.o.type===2&&s.o.houseID===4)?.countDown};
   }
   return {mission,player:G.playerHouseID,initialPalaces,initialUnits,shots,feedback,missiles,messages,beforeContact,wakeup};
  },{data:(await readFile(path.join(root,'rom/dune_usa.gen'))).toString('base64'),mission}));
  await page.close();
 }
 await writeFile(path.resolve(root,'../hd-vehicles/ai-startup.json'),JSON.stringify(results,null,2));
 assert.ok(results.every(r=>r.beforeContact.missiles===0&&r.beforeContact.shots===0));
 assert.equal(results[0].wakeup.before,false);assert.equal(results[0].wakeup.after,true);
 assert.ok(results[0].wakeup.palaceCharge>0,'Palace did not activate after contact');
 console.log(JSON.stringify(results.map(({mission,beforeContact,wakeup})=>({mission,beforeContact,wakeup}))));
}finally{await browser.close();}
