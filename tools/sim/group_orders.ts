// Приказы толпой (рамкой — добавка ремейка): движение и патруль раздают каждому свою клетку у точки приказа,
// атака — свою клетку на дальности огня. node --experimental-transform-types tools/sim/group_orders.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {ACTION,G,INDEX_INVALID,LST,UNIT,packTile,packXY,tileCenter,unpackTile,type Unit} from '../../web/src/engine/core.ts';
import {unitCreate,unitSetAction} from '../../web/src/engine/unit.ts';
import {iconLandscape} from '../../web/src/engine/tables.ts';
const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
game.load('H',4);
const me=G.playerHouseID,X0=20,Y0=40,sand=iconLandscape.findIndex(k=>k===LST.NORMAL_SAND);
G.houses[me].unitCountMax=100;
for(let y=Y0;y<Y0+16;y++)for(let x=X0;x<X0+30;x++){const p=packXY(x,y),t=G.map[p];if(t.hasStructure||t.hasUnit)continue;t.groundTileID=sand;t.overlayTileID=0;G.mapTileID[p]=sand;}
const make=(type:number,n:number,row:number)=>{const out:Unit[]=[];for(let i=0;i<n;i++){const u=unitCreate(INDEX_INVALID,type,me,tileCenter(unpackTile(packXY(X0+2+(i%3),Y0+row+Math.floor(i/3)))),64)!;assert.ok(u,'юнит создан');unitSetAction(u,ACTION.GUARD);out.push(u);}return out;};
const run=(n:number)=>{for(let i=0;i<n;i++)game.tick();};
const cells=(us:Unit[])=>new Set(us.map(u=>packTile(u.o.position))).size;

// 1) движение толпой: все доезжают, каждый в свою клетку рядом с точкой
const tanks=make(UNIT.TANK,6,3),goal=packXY(X0+20,Y0+8);
game.orderGroup(tanks,ACTION.MOVE,goal);
run(3500);
const far=Math.max(...tanks.map(u=>Math.hypot((packTile(u.o.position)&63)-(goal&63),(packTile(u.o.position)>>6)-(goal>>6))));
assert.equal(cells(tanks),6,'каждый в своей клетке');
assert.ok(far<=4,`все рядом с точкой приказа (дальше всех ${far.toFixed(1)} клетки)`);
assert.ok(tanks.every(u=>u.speed===0),'все остановились, никто не толкается');

// 2) патруль толпой: у каждого свой конец маршрута, ходят туда-обратно
const quads=make(UNIT.QUAD,6,10);
game.orderGroup(quads,ACTION.PATROL,packXY(X0+18,Y0+12));
assert.equal(new Set(quads.map(u=>`${u.patrolEnd!.x},${u.patrolEnd!.y}`)).size,6,'концы патруля разные');
let returned=0;
for(let i=0;i<6000;i++){game.tick();if(i%50===0)returned=Math.max(returned,quads.filter(u=>!u.patrolToEnd).length);}
assert.ok(quads.every(u=>u.patrolActive),'патруль не сброшен');
assert.ok(returned>=4,`патрульные доходят до конца и поворачивают назад (${returned} из 6)`);
console.log('group orders: move and patrol give each unit its own cell; units arrive apart and patrol back and forth');
