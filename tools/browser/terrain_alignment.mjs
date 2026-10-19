// Exhaustive terrain-edge and original structure-coordinate check, without game ticks.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5187/');
 const report=await page.evaluate(async base64=>{
  const {DuneRom}=await import('/src/rom/dune.ts');
  const {World}=await import('/src/game/world.ts');
  const {G,UNIT,STRUCTURE}=await import('/src/engine/core.ts');
  const {landscapeInfo,unitInfo,iconLandscape}=await import('/src/engine/tables.ts');
  const rom=new DuneRom(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));
  const world=new World(rom),maps=[],missions=[],missing=[],unexpected=[],scenarioTerrainExceptions=[];
  const r16=p=>(rom.bytes[p]<<8)|rom.bytes[p+1];
  const wormType=unitInfo[UNIT.SANDWORM].movementType;
  for(let kind=0;kind<15;kind++){
   const at=0x6ccb6+kind*0x1c;
   if(landscapeInfo[kind].isValidForStructure!==(r16(at+8)?1:0))throw Error('Building rule differs from ROM');
   if(landscapeInfo[kind].movementSpeed[wormType]!==rom.bytes[at+wormType])throw Error('Worm rule differs from ROM');
  }
  for(let index=1;index<=27;index++){
   const map=rom.missionMap(index),b=map.bounds;
   let wormEdges=0,buildEdges=0,cells=0;
   const build=[],worm=[];
   for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
    const p=(y<<6)|x,id=map.ground[p],kind=rom.bytes[0x581c+id];
    if(iconLandscape[id]!==kind)throw Error(`Runtime terrain type changed: ${index}/${p}`);
    build[p]=!!landscapeInfo[kind].isValidForStructure;
    worm[p]=landscapeInfo[kind].movementSpeed[wormType]>0;
    if(worm[p]!==[0,2,3,8,9,14].includes(kind))throw Error(`Worm can cross solid terrain: ${index}/${p}`);
    cells++;
   }
   for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
    const p=(y<<6)|x;
    for(const n of [x+1<b.x+b.w?p+1:-1,y+1<b.y+b.h?p+64:-1])if(n>=0){
     if(worm[p]!==worm[n])wormEdges++;
     if(build[p]!==build[n])buildEdges++;
    }
   }
   maps.push({index,cells,wormEdges,buildEdges});
  }
  let structures=0,enemyStructures=0;
  for(const house of ['A','O','H'])for(let mission=1;mission<=9;mission++){
   const source=rom.scenario(house,mission),original=rom.missionMap(source.mapIndex);
   world.load(house,mission);
   if(world.map.index!==source.mapIndex)throw Error('Scenario/terrain map mismatch');
   const expected=source.structures.filter(s=>![STRUCTURE.SLAB_1x1,STRUCTURE.SLAB_2x2,STRUCTURE.WALL].includes(s.type));
   const key=s=>`${s.house}:${s.type}:${s.x}:${s.y}`;
   const expectedKeys=new Set(expected.map(key));
   const actualKeys=new Set(world.structures.map(key));
   for(const s of expected)if(!actualKeys.has(key(s)))missing.push({mission:house+mission,...s});
   for(const s of world.structures){
    if(!expectedKeys.has(key(s)))unexpected.push({mission:house+mission,type:s.type,house:s.house,x:s.x,y:s.y});
    structures++;if(s.house!==world.player)enemyStructures++;
    for(let dy=0;dy<s.h;dy++)for(let dx=0;dx<s.w;dx++){
     const p=((s.y+dy)<<6)|s.x+dx,id=original.ground[p],kind=rom.bytes[0x581c+id];
     if(!landscapeInfo[kind].isValidForStructure&&!landscapeInfo[kind].isValidForStructure2){
      scenarioTerrainExceptions.push({mission:house+mission,type:s.type,house:s.house,x:s.x+dx,y:s.y+dy,originalKind:kind});
     }
    }
   }
   missions.push({mission:house+mission,map:source.mapIndex,expected:expected.length,actual:world.structures.length});
  }
  return {maps,missions,structures,enemyStructures,missing,unexpected,scenarioTerrainExceptions,
   wormMovementType:wormType,buildingRulesMatchROM:true,wormRulesMatchROM:true,
   totalWormBoundaryEdges:maps.reduce((n,m)=>n+m.wormEdges,0),
   totalBuildingBoundaryEdges:maps.reduce((n,m)=>n+m.buildEdges,0)};
 },(await readFile(path.join(root,'rom/dune_usa.gen'))).toString('base64'));
 await writeFile(path.resolve(root,'../hd-map-graphics/final/alignment-verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({maps:report.maps.length,missions:report.missions.length,structures:report.structures,
  enemyStructures:report.enemyStructures,missing:report.missing.length,unexpected:report.unexpected.length,
  originalScenarioTerrainExceptions:report.scenarioTerrainExceptions.length,
  wormEdges:report.totalWormBoundaryEdges,buildingEdges:report.totalBuildingBoundaryEdges,
  wormRulesMatchROM:report.wormRulesMatchROM,buildingRulesMatchROM:report.buildingRulesMatchROM}));
}finally{await browser.close();}
