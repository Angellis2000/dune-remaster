// С какого расстояния юниты открывают огонь по приказу атаки — поодиночке и толпой.
// node --experimental-transform-types tools/sim/attack_range.ts [тип юнита] [сколько] [кадров] [group|each] [unit|ЗДАНИЕ]
// group — Game.orderGroup (рамкой), each — каждому order по отдельности (как было до групповых клеток атаки)
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {ACTION,G,INDEX_INVALID,LST,UNIT,packXY,tileCenter,unpackTile,type Unit} from '../../web/src/engine/core.ts';
import {unitCreate,unitSetAction} from '../../web/src/engine/unit.ts';
import {structureCreate} from '../../web/src/engine/structure.ts';
import {STRUCTURE,indexEncode,IT} from '../../web/src/engine/core.ts';
import {objectGetDistanceToEncoded} from '../../web/src/engine/object.ts';
import {iconLandscape,unitInfo} from '../../web/src/engine/tables.ts';

const [typeArg='TANK',countArg='1',framesArg='1500',mode='group',targetArg='unit']=process.argv.slice(2);
const type=(UNIT as Record<string,number>)[typeArg]??Number(typeArg),count=Number(countArg),frames=Number(framesArg);
const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
game.load('H',4);
const me=G.playerHouseID,enemy=G.houses.findIndex((h,i)=>h.flags.used&&i!==me);
// чистое поле 30×20 клеток вдали от баз
const X0=20,Y0=40;
const sand=iconLandscape.findIndex(k=>k===LST.NORMAL_SAND);
for(let y=Y0;y<Y0+16;y++)for(let x=X0;x<X0+30;x++){const p=packXY(x,y),t=G.map[p];if(t.hasStructure||t.hasUnit)continue;t.groundTileID=sand;t.overlayTileID=0;t.isUnveiled=true;G.mapTileID[p]=sand;}
const building=targetArg==='unit'?null:(STRUCTURE as Record<string,number>)[targetArg];
G.validateStrictIfZero++;
const target:any=building==null?unitCreate(INDEX_INVALID,UNIT.SIEGE_TANK,enemy,tileCenter(unpackTile(packXY(X0+22,Y0+8))),0)!:structureCreate(INDEX_INVALID,building,enemy,packXY(X0+22,Y0+8))!;
G.validateStrictIfZero--;
target.o.hitpoints=30000;if(building==null)unitSetAction(target,ACTION.STOP);target.o.seenByHouses=0xff;
const encodedTarget=building==null?indexEncode(target.o.index,IT.UNIT):indexEncode(target.o.index,IT.STRUCTURE);
const units:Unit[]=[];
for(let i=0;i<count;i++){
  const u=unitCreate(INDEX_INVALID,type,me,tileCenter(unpackTile(packXY(X0+2+(i%3),Y0+6+Math.floor(i/3)))),64)!;
  unitSetAction(u,ACTION.GUARD);units.push(u);
}
if(mode==='each')for(const u of units)game.order(u,ACTION.ATTACK,packXY(X0+22,Y0+8));
else game.orderGroup(units,ACTION.ATTACK,packXY(X0+22,Y0+8));
const first=new Map<Unit,{frame:number;dist:number}>();
// расстояние как у скрипта (у здания — до ближнего края), в клетках
const tiles=(u:Unit)=>objectGetDistanceToEncoded(u.o,encodedTarget)/256;
const track:string[]=[];
for(let f=0;f<frames;f++){
  const before=units.map(u=>u.fireDelay);
  game.tick();
  target.o.hitpoints=30000;
  units.forEach((u,i)=>{if(!first.has(u)&&u.o.flags.used&&u.fireDelay>before[i])first.set(u,{frame:f,dist:+tiles(u).toFixed(2)});});
  if(f%100===0)track.push(`${f}: `+units.map(u=>tiles(u).toFixed(1)).join(' '));
}
console.log(`${typeArg}×${count} ${mode}: дальность ${unitInfo[type].fireDistance} клеток; первый выстрел (кадр/расстояние):`);
console.log(units.map(u=>first.has(u)?`${first.get(u)!.frame}/${first.get(u)!.dist}`:'—').join('  '));
console.log(track.join('\n'));
