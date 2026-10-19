import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DuneRom} from '../src/rom/dune.ts';
import {blitTile} from '../src/rom/md.ts';
import {terrainMask,visualHash} from '../src/gfx/terrain-masks.ts';

const rom = new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url))));
const palette = rom.gamePalette(),vram=rom.terrainVram();
function mask(id:number){
  const px=new Uint32Array(1024),words=rom.icon(id);
  for(let k=0;k<16;k++)blitTile(vram,words[k],palette,px,32,(k%4)*8,(k>>2)*8);
  return terrainMask(rom.bytes[0x581c+id],new Uint8ClampedArray(px.buffer));
}

test('harvesting only changes the spice layer, never the underlying terrain',()=>{
  const sand=mask(127),light=mask(191),dense=mask(207);
  assert.deepEqual(light.land,sand.land);
  assert.deepEqual(dense.land,sand.land);
  assert.ok(light.spice.some((v,i)=>i%4===0&&v>0));
  assert.ok(dense.spice.some((v,i)=>i%4===1&&v>0));
  assert.ok(sand.spice.every((v,i)=>i%4===3||v===0));
});

test('rock coastlines and dune relief come from the original graphics',()=>{
  const sand=mask(127),transition=mask(131),dune=mask(159);
  const rocks=[...transition.land].filter((_,i)=>i%4===0);
  assert.ok(rocks.includes(0)&&rocks.includes(255),'original mixed sand/rock shape is retained');
  assert.ok([...dune.land].some((v,i)=>i%4===1&&v<100),'original shadowed dune slipface remains');
  assert.ok([...dune.land].some((v,i)=>i%4===1&&v>150),'original lit dune crest remains');
  assert.ok([...sand.land].every((v,i)=>i%4!==1||v===128),'sand grain never becomes artificial relief');
});

test('original mountain crater interiors retain their own depth mask',()=>{
  const crater=mask(164),sand=mask(127);
  const depth=[...crater.land].filter((_,i)=>i%4===3);
  assert.ok(depth.includes(255)&&depth.includes(170)&&depth.includes(0));
  assert.ok([...sand.land].every((v,i)=>i%4!==3||v===0));
});

test('visual variation stays stable and independent of the game random generator',()=>{
  assert.equal(visualHash(512,3),visualHash(512,3));
  assert.notEqual(visualHash(512,3),visualHash(513,3));
  assert.ok(visualHash(512,3)>=0);
});
