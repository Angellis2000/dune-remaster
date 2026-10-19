// Ракета дворца Харконненов ждёт цели сколько угодно (MD $027D28/$027E90): A по дворцу — только прицел, ракета
// создаётся и летит по выбору клетки; отмена — без ракеты. node --experimental-transform-types tools/sim/palace_missile_aim.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {G,INDEX_INVALID,SELECTION,STRUCTURE,UNIT,packXY} from '../../web/src/engine/core.ts';
import {structureCreate} from '../../web/src/engine/structure.ts';
const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
game.load('H',8);
const me=G.playerHouseID;
let palace=G.structures.find(s=>s.o.flags.used&&s.o.houseID===me&&s.o.type===STRUCTURE.PALACE);
if(!palace){G.validateStrictIfZero++;palace=structureCreate(INDEX_INVALID,STRUCTURE.PALACE,me,packXY(20,20))!;G.validateStrictIfZero--;}
palace.countDown=0;
const missiles=()=>G.units.filter(u=>u.o.flags.used&&u.o.type===UNIT.MISSILE_HOUSE).length;
// 1) прицел 20 секунд — ракета не создана и не улетела
game.palaceSpecial(palace);
assert.equal(G.selectionType,SELECTION.TARGET,'включён прицел');
for(let i=0;i<1200;i++)game.tick();
assert.equal(missiles(),0,'пока игрок целится, ракета не летит');
assert.ok(game.missileAiming&&!G.unitHouseMissile,'ракета ещё не создана, прицел держится');
// 2) выбор клетки — ракета летит туда, отсчёт сброшен, дворец ушёл на перезарядку
const target=packXY(40,40);
game.targetClick(target);
assert.equal(missiles(),1,'ракета запущена по выбору цели');
assert.ok(!game.missileAiming&&G.houseMissileCountdown===0&&!G.unitHouseMissile,'прицел снят, отсчёта нет');
assert.ok(palace.countDown>0,'дворец перезаряжается');
// 3) отмена прицела — ракеты нет, дворец готов снова
for(let i=0;i<3000;i++)game.tick();
palace.countDown=0;game.palaceSpecial(palace);game.cancelTarget();
assert.ok(!game.missileAiming&&palace.countDown===0&&!G.unitHouseMissile,'отмена снимает прицел без пуска');
console.log('palace missile aim: waits for the target as long as needed, launches on the chosen cell, cancel keeps it ready');
