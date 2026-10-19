// Место цветения спайса: приказ «Атака» по нему — танк стреляет, снаряд (TILE_DAMAGE) открывает поле спайса;
// наезд юнита на другое место цветения — юнит пропадает, на месте поле спайса (unitMove → mapBloomExplodeSpice).
// node --experimental-transform-types tools/sim/spice_bloom_shot.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {ACTION,G,INDEX_INVALID,LST,UNIT,packXY,tileCenter,unpackTile} from '../../web/src/engine/core.ts';
import {mapGetLandscapeType} from '../../web/src/engine/map.ts';
import {unitCreate,unitSetAction} from '../../web/src/engine/unit.ts';
const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
const sc=game.load('A',2);
const b=sc.bloom[0],p=packXY(b.x,b.y);
for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++){const q=packXY(b.x+x,b.y+y);G.map[q].isUnveiled=true;if(G.map[q].overlayTileID===G.veiledTileID)G.map[q].overlayTileID=0;}
const spice=()=>[...Array(4096).keys()].filter(q=>{const t=mapGetLandscapeType(q);return t===LST.SPICE||t===LST.THICK_SPICE;}).length;
const before=spice();
let at=0;for(const [dx,dy] of [[4,0],[-4,0],[0,4],[0,-4],[3,3],[-3,-3]]){const q=packXY(b.x+dx,b.y+dy);if(!G.map[q].hasUnit&&!G.map[q].hasStructure&&mapGetLandscapeType(q)!==LST.ENTIRELY_MOUNTAIN){at=q;break;}}
const tank=unitCreate(INDEX_INVALID,UNIT.TANK,G.playerHouseID,tileCenter(unpackTile(at)),64)!;unitSetAction(tank,ACTION.GUARD);
game.order(tank,ACTION.ATTACK,p);
for(let i=0;i<1500&&mapGetLandscapeType(p)===LST.BLOOM_FIELD;i++)game.tick();
const after=spice();
assert.notEqual(mapGetLandscapeType(p),LST.BLOOM_FIELD,'место цветения взорвано выстрелом');
assert.ok(after>before+10,`открылось поле спайса (${before} → ${after})`);
// 2) наезд: квадроцикл на второе место цветения
const b2=sc.bloom.find(x=>mapGetLandscapeType(packXY(x.x,x.y))===LST.BLOOM_FIELD);
assert.ok(b2,'есть второе место цветения');
const p2=packXY(b2!.x,b2!.y);
let st=0;for(const [dx,dy] of [[3,0],[-3,0],[0,3],[0,-3],[2,2],[-2,-2]]){const q=packXY(b2!.x+dx,b2!.y+dy);const k=mapGetLandscapeType(q);if(!G.map[q].hasUnit&&!G.map[q].hasStructure&&k!==LST.ENTIRELY_MOUNTAIN&&k!==LST.BLOOM_FIELD){st=q;break;}}
const quad=unitCreate(INDEX_INVALID,UNIT.QUAD,G.playerHouseID,tileCenter(unpackTile(st)),64)!;unitSetAction(quad,ACTION.GUARD);
const s2=spice();
game.order(quad,ACTION.MOVE,p2);
for(let i=0;i<1500&&quad.o.flags.used;i++)game.tick();
assert.ok(!quad.o.flags.used,'юнит, наехавший на место цветения, пропал');
assert.ok(spice()>s2+10,`на месте открылось поле спайса (${s2} → ${spice()})`);
console.log('spice bloom: a shot opens a field',before,'→',after,'; driving onto a bloom destroys the unit and opens a field',s2,'→',spice());
