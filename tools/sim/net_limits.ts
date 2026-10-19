// node --experimental-transform-types tools/sim/net_limits.ts
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {G,INDEX_INVALID,IT,STRUCTURE,UNIT,UNIT_INDEX_MAX,STRUCTURE_INDEX_MAX_SOFT,indexEncode,indexGetUnit,networkUnitCount,unitAllocate,unitFree} from '../../web/src/engine/core.ts';
import {NETWORK_UNIT_LIMIT,NETWORK_STRUCTURE_LIMIT} from '../../web/src/engine/network-rules.ts';
import {networkStructureCount,structureCreate,structureStarportBuy} from '../../web/src/engine/structure.ts';

const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
game.loadNetwork({map:5,seed:123,credits:50000,local:1,players:[{slot:0,house:1,name:'A',team:0},{slot:1,house:0,name:'H',team:1}]});
for(const house of [1,0]){
  assert.equal(G.houses[house].unitCountMax,NETWORK_UNIT_LIMIT);
  while(networkUnitCount(house)<NETWORK_UNIT_LIMIT)assert.ok(unitAllocate(INDEX_INVALID,UNIT.TANK,house));
  assert.equal(unitAllocate(INDEX_INVALID,UNIT.TANK,house),null,`house ${house}: must stop at its own limit`);
  assert.equal(networkUnitCount(house),204);
}
assert.ok(G.unitFind.some(u=>u.o.index>255),'expanded unit pool must actually cross byte indices');
assert.ok(G.unitFind.every(u=>u.o.index!==255),'255 must remain the linked-list sentinel');
const high=G.unitFind.find(u=>u.o.index>255)!;
assert.equal(indexGetUnit(indexEncode(high.o.index,IT.UNIT)),high,'encoded references must retain high indices');
const bullet=unitAllocate(INDEX_INVALID,UNIT.BULLET,0);
assert.ok(bullet,'full army must still have room for projectiles');
assert.equal(networkUnitCount(0),204,'projectiles must not consume the army allowance');
const released=G.unitFind.filter(u=>u.o.houseID===0&&u.o.type===UNIT.TANK).at(-1)!;
unitFree(released);
G.houses[0].structuresBuilt=0x7ffff;
const factory=structureCreate(INDEX_INVALID,STRUCTURE.HEAVY_VEHICLE,0,INDEX_INVALID)!;factory.upgradeLevel=3;
assert.ok(game.build(factory,UNIT.TANK));
assert.ok(factory.o.linkedID>255,'factory must preserve a high unit index rather than truncate to a byte');
assert.equal(G.units[factory.o.linkedID].o.houseID,0);
for(const u of G.unitFind.filter(u=>u.o.houseID===0&&u.o.type===UNIT.TANK&&u.o.index!==factory.o.linkedID).slice(-2))unitFree(u);
const starport=structureCreate(INDEX_INVALID,STRUCTURE.STARPORT,0,INDEX_INVALID)!;
structureStarportBuy(starport,[UNIT.TANK,UNIT.TANK]);
const purchasedHead=G.units[G.houses[0].starportLinkedID];
assert.ok(purchasedHead.o.index>255,'starport must retain high unit indices');
assert.ok(purchasedHead.o.linkedID>255);
assert.equal(G.units[purchasedHead.o.linkedID].o.linkedID,0xff,'starport chain must terminate with the byte sentinel');
for(const house of [1,0]){
  while(networkStructureCount(house)<NETWORK_STRUCTURE_LIMIT)assert.ok(structureCreate(INDEX_INVALID,STRUCTURE.SILO,house,INDEX_INVALID));
  assert.equal(structureCreate(INDEX_INVALID,STRUCTURE.SILO,house,INDEX_INVALID),null);
  assert.equal(networkStructureCount(house),158);
}
assert.ok(G.structureFind.some(s=>s.o.index>255));
assert.ok(G.structureFind.every(s=>s.o.index!==255));
game.load('A',1);
assert.equal(UNIT_INDEX_MAX,102);
assert.equal(STRUCTURE_INDEX_MAX_SOFT,79);
assert.equal(G.units.length,102);
assert.equal(G.structures.length,82);
console.log('network limits: each player gets 204 units and 158 structures; high-index links and projectile reserve work; campaign pools restored');
