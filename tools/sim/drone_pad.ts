// Звенья дронов у площадки: садятся по очереди (остальные ждут на земле вокруг), на земле заряд не тратится,
// приказ выпускает звено с площадки. node --experimental-transform-types tools/sim/drone_pad.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {ACTION,G,INDEX_INVALID,LST,STRUCTURE,UNIT,packXY,tileCenter,unpackTile,type Unit} from '../../web/src/engine/core.ts';
import {structureCreate} from '../../web/src/engine/structure.ts';
import {unitCreate,unitSetAction} from '../../web/src/engine/unit.ts';
import {iconLandscape} from '../../web/src/engine/tables.ts';
import {initializeDrone,tickDrone} from '../../web/src/engine/advanced-units.ts';

const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
game.loadNetwork({map:5,seed:7,credits:50000,local:1,players:[{slot:0,house:1,name:'A',team:0},{slot:1,house:0,name:'H',team:1}]});
G.mapScale=0;
const rock=iconLandscape.findIndex(k=>k===LST.ENTIRELY_ROCK);
for(let y=10;y<45;y++)for(let x=8;x<45;x++){const p=packXY(x,y),t=G.map[p];if(t.hasStructure||t.hasUnit)continue;t.groundTileID=rock;t.overlayTileID=0;t.isUnveiled=true;G.mapTileID[p]=rock;}
G.houses[1].structuresBuilt=0x7fffffff;G.houses[1].powerProduction=1000;G.houses[1].powerUsage=0;G.tickHousePowerMaintenance=Number.MAX_SAFE_INTEGER;
G.validateStrictIfZero++;const pad=structureCreate(INDEX_INVALID,STRUCTURE.DRONE_PAD,1,packXY(20,22))!;G.validateStrictIfZero--;assert.ok(pad);
const wings:Unit[]=[];
for(let i=0;i<3;i++){const u=unitCreate(INDEX_INVALID,UNIT.COMBAT_DRONE,1,tileCenter(unpackTile(packXY(28+i*2,22))),0)!;u.o.seenByHouses=0x3f;unitSetAction(u,ACTION.GUARD);initializeDrone(u,pad);u.o.position=tileCenter(unpackTile(packXY(28+i*2,22)));u.drone!.guardPosition={...u.o.position};wings.push(u);}
const step=(n:number)=>{for(let i=0;i<n;i++){G.timerGame++;for(const w of wings)tickDrone(w);}};

// 1) без дела звенья садятся на землю и не тратят заряд
step(200);
assert.ok(wings.every(w=>w.drone!.landed),'idle wings land');
const b0=wings.map(w=>w.drone!.battery);step(600);
assert.deepEqual(wings.map(w=>w.drone!.battery),b0,'landed wings keep their battery');

// 2) всем — вернуться: на площадке одно звено, остальные ждут в разных местах на земле
for(const w of wings){w.drone!.battery=30;w.drone!.phase='guard';}
for(const w of wings)w.drone!.battery=10;
step(300);
const docked=wings.filter(w=>w.drone!.phase==='dock');
const waiting=wings.filter(w=>w.drone!.phase==='return');
assert.equal(docked.length,1,'one wing on the pad at a time');
assert.equal(waiting.length,2);assert.ok(waiting.every(w=>w.drone!.landed),'waiting wings land');
const spots=new Set(waiting.map(w=>`${w.o.position.x>>6},${w.o.position.y>>6}`));assert.equal(spots.size,2,'waiting wings use different spots');
for(const w of wings)if(w!==docked[0])assert.ok(Math.hypot(w.o.position.x-docked[0].o.position.x,w.o.position.y-docked[0].o.position.y)>256,'no crowd on the pad');

// 3) по очереди: каждое звено заряжается, после зарядки освобождает площадку (не садится на неё)
step(3000);
// после зарядки 99% звено отлетает на своё место (немного заряда на перелёт) и садится — расход останавливается
assert.ok(wings.every(w=>w.drone!.battery>=90&&w.drone!.landed),'every wing got its turn on the pad and waits landed');
const padSpot=docked[0].drone!.homePosition;
assert.ok(wings.every(w=>w.drone!.phase==='dock'||Math.hypot(w.o.position.x-padSpot.x,w.o.position.y-padSpot.y-64)>256),'charged wings leave the pad free');

// 4) приказ выпускает звено с площадки, если хватает заряда
const onPad=wings.find(w=>w.drone!.phase==='dock')??wings[0];
onPad.drone!.phase='dock';onPad.drone!.battery=60;onPad.o.hitpoints=200;
game.order(onPad,ACTION.MOVE,packXY(26,26),1);step(5);
assert.notEqual(onPad.drone!.phase,'dock','an ordered wing launches from the pad');
console.log('drone pad: idle landing saves battery, one wing on the pad at a time, waiting wings land apart, order launches from the pad');
