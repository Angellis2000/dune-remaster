// Спайс под обстрелом и выработкой исчезает. В картах MD спайс нарисован в самой клетке, поэтому mapChangeSpiceAmount
// кладёт песок ландшафта, а не «исходную клетку» (она тоже спайс). node --experimental-transform-types tools/sim/spice_crater.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {G,LST,tileCenter,unpackTile} from '../../web/src/engine/core.ts';
import {mapChangeSpiceAmount,mapGetLandscapeType,mapMakeExplosion} from '../../web/src/engine/map.ts';
const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
game.load('H',4);
const tiles=(t:number)=>{const out:number[]=[];for(let p=0;p<4096;p++)if(mapGetLandscapeType(p)===t)out.push(p);return out;};
const spice=tiles(LST.SPICE),thick=tiles(LST.THICK_SPICE);
assert.ok(spice.length&&thick.length,'на карте H4 есть спайс и густой спайс');
// 1) взрыв снарядом (тип 3, как у танка) на открытой клетке спайса: спайс → песок
const p=spice[Math.floor(spice.length/2)],t=G.map[p];t.isUnveiled=true;t.overlayTileID=0;
mapMakeExplosion(3,tileCenter(unpackTile(p)),0,0);for(let i=0;i<40;i++)game.tick();
assert.equal(mapGetLandscapeType(p),LST.NORMAL_SAND,'спайс под взрывом исчезает');
// 2) густой спайс — ступенями: густой → спайс → песок
const q=thick[0];mapChangeSpiceAmount(q,-1);assert.equal(mapGetLandscapeType(q),LST.SPICE);
mapChangeSpiceAmount(q,-1);assert.equal(mapGetLandscapeType(q),LST.NORMAL_SAND,'выработанный спайс становится песком');
// 3) на песке спайс снова может вырасти (цветение)
mapChangeSpiceAmount(q,1);assert.equal(mapGetLandscapeType(q),LST.SPICE);
console.log('spice crater: explosions and harvesting turn spice into sand (MD maps draw spice into the base tile)');
