import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../src/rom/dune.ts';
import {Game} from '../src/engine/game.ts';
import {ACTION,G,INDEX_INVALID,IT,LST,STRUCTURE,UNIT,indexEncode,packXY,tileCenter,unpackTile,type Unit} from '../src/engine/core.ts';
import {unitCreate,unitRemove,unitStartMovement} from '../src/engine/unit.ts';
import {structureCreate,structureRemove} from '../src/engine/structure.ts';
import {objectGetDistanceToEncoded} from '../src/engine/object.ts';
import {iconLandscape,unitInfo} from '../src/engine/tables.ts';
import {scriptFunctionsUnit} from '../src/engine/scriptfns.ts';

const rom=new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url))));
function scene(network:boolean,local=1){
  const game=new Game(rom);
  if(network)game.loadNetwork({map:5,seed:77,credits:50000,local,players:[{slot:0,house:1,team:0,name:'A'},{slot:1,house:0,team:1,name:'H'}]});
  else game.load('A',8);
  for(const u of [...G.unitFind])unitRemove(u);
  for(const s of [...G.structureFind])structureRemove(s);
  G.mapScale=0;const rock=iconLandscape.findIndex(k=>k===LST.ENTIRELY_ROCK);
  for(const t of G.map){t.groundTileID=rock;t.overlayTileID=0;t.isUnveiled=true;t.unveiledHouses=3;t.hasStructure=false;t.hasUnit=false;t.index=0;}
  G.validateStrictIfZero++;
  const nearby=structureCreate(INDEX_INVALID,STRUCTURE.REFINERY,0,packXY(39,30))!;
  const target=structureCreate(INDEX_INVALID,STRUCTURE.REFINERY,0,packXY(44,30))!;
  G.validateStrictIfZero--;assert.ok(nearby&&target);
  const units=[[UNIT.LAUNCHER,36,32],[UNIT.SONIC_TANK,37,34],[UNIT.TANK,35,34]].map(([type,x,y])=>unitCreate(INDEX_INVALID,type,1,tileCenter(unpackTile(packXY(x,y))),64)!);
  assert.ok(units.every(Boolean));nearby.o.hitpoints=target.o.hitpoints=30000;
  return {game,units,nearby,target,encoded:indexEncode(target.o.index,IT.STRUCTURE)};
}

test('moving mixed group retains the clicked building; launcher stops at its own firing distance in both modes',()=>{
  for(const network of [false,true]){
    const {game,units,nearby,target,encoded}=scene(network),launcher=units[0];
    for(const u of units)assert.ok(unitStartMovement(u),'fixture has an active movement cell with a GUARD script');
    game.orderGroup(units,ACTION.ATTACK,packXY(45,31));
    assert.ok(units.every(u=>u.nextActionID===ACTION.ATTACK));
    assert.ok(units[1].attackSpot,'the pending sonic attack also gets a range position');
    const shots=new Set<Unit>(),saved=G.onUnitShot;let launcherSpot:{x:number;y:number}|undefined;
    G.onUnitShot=u=>{
      if(!units.includes(u))return;
      assert.equal(u.targetAttack,encoded,'shot aimed at the clicked building');shots.add(u);
      if(u===launcher&&!launcherSpot){
        launcherSpot={...u.o.position};
        const range=objectGetDistanceToEncoded(u.o,encoded)/256;
        assert.ok(range>=8&&range<=9,`launcher fires from ${range} cells`);
      }
    };
    try{
      for(let f=0;f<1200;f++){
        game.tick();nearby.o.hitpoints=target.o.hitpoints=30000;
        for(const u of units)assert.equal(u.targetAttack,encoded,`target changed at frame ${f}, type ${u.o.type}, network=${network}`);
        if(launcherSpot)assert.deepEqual(launcher.o.position,launcherSpot,'launcher does not accompany the short-range tank toward the building');
      }
      assert.equal(shots.size,3,'all three unit types fire');
    }finally{G.onUnitShot=saved;}
  }
});

test('route calculation holds at exact maximum range and turns toward the target instead of taking another step',()=>{
  const {game,units,encoded}=scene(true),u=units[0];
  game.orderGroup(units,ACTION.ATTACK,packXY(45,31));
  assert.equal(objectGetDistanceToEncoded(u.o,encoded),unitInfo[UNIT.LAUNCHER].fireDistance*256);
  const before={...u.o.position};u.targetMove=encoded;
  const route=scriptFunctionsUnit.find(fn=>fn.name==='unitCalculateRoute')!;assert.ok(route);
  G.scriptCurrentUnit=u;G.scriptCurrentObject=u.o;u.o.script.stackPointer=14;u.o.script.stack[14]=encoded;
  route(u.o.script);
  assert.equal(u.speed,0);assert.deepEqual(u.currentDestination,{x:0,y:0});assert.equal(u.targetMove,0);
  u.o.script.stackPointer=15;u.o.script.stack[14]=0;
  for(let f=0;f<400;f++)game.tick();
  assert.deepEqual(u.o.position,before);
});

test('mixed-group attack during movement has identical hashes for both network viewers',()=>{
  function run(local:number){
    const {game,units,nearby,target}=scene(true,local);
    for(const u of units)unitStartMovement(u);
    game.execNet(1,{k:'order',u:units.map(u=>u.o.index),a:ACTION.ATTACK,p:packXY(45,31)});
    const hashes=[];
    for(let f=0;f<1800;f++){game.tick();nearby.o.hitpoints=target.o.hitpoints=30000;if(f%300===0)hashes.push(game.netHash());}
    return hashes;
  }
  assert.deepEqual(run(1),run(0));
});
