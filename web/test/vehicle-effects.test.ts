import {test} from 'node:test';
import assert from 'node:assert/strict';
import {along,muzzlePoint,VEHICLES} from '../src/gfx/vehicle-geometry.ts';
import {makeImpact,particlePosition} from '../src/gfx/impact-model.ts';

test('256 headings keep muzzle, recoil and projectile on the same axis, including diagonals',()=>{
  for(let angle=0;angle<256;angle++){
    const p=muzzlePoint(100,200,angle),forward=along(angle,1),backward=along(angle,-1);
    assert.ok(Math.abs(Math.hypot(p.x-100,p.y-196)-16)<1e-10);
    assert.ok(Math.abs((p.x-100)*forward.y-(p.y-196)*forward.x)<1e-10);
    assert.ok(Math.abs(forward.x+backward.x)<1e-10&&Math.abs(forward.y+backward.y)<1e-10);
  }
  assert.equal(new Set(VEHICLES.map(d=>d.type)).size,14);
});

test('debris differs by material, follows an arc and stays on the ground after landing',()=>{
  const sand=makeImpact(60,90,6,'sand',100),rock=makeImpact(60,90,6,'rock',100);
  assert.deepEqual(sand,makeImpact(60,90,6,'sand',100));
  assert.notDeepEqual(sand,rock);
  assert.ok(sand.some(p=>p.dust&&p.frame<4));
  assert.ok(rock.some(p=>p.dust&&p.frame>=4&&p.frame<8));
  for(const p of rock.filter(p=>!p.dust)){
    assert.equal(particlePosition(p,0).height,0);
    assert.ok(particlePosition(p,p.vz/96).height>0);
    const landed=particlePosition(p,10),later=particlePosition(p,20);
    assert.equal(landed.height,0);assert.equal(landed.landed,true);assert.deepEqual(landed,later);
  }
  for(const type of [7,9,12,15])assert.deepEqual(makeImpact(0,0,type,'sand',0),[]);
});

