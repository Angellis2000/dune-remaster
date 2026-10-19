import {test} from 'node:test';
import assert from 'node:assert/strict';
import {integerSqrt,fixedLength,fixedSqrt,integerPower} from '../src/engine/lockstep-math.ts';

test('fixed-point roots preserve integer bounds for small and map-sized vectors',()=>{
  for(const n of [...Array.from({length:1000},(_,i)=>i),2**40-1,2**40,2**40+1,2**50-1]){
    const r=integerSqrt(n);assert.ok(r*r<=n&&(r+1)*(r+1)>n);
  }
  assert.equal(fixedLength(3,4),5);assert.equal(fixedLength(.75,1),1.25);
  assert.equal(fixedSqrt(2.25),1.5);assert.equal(integerPower(.5,6),1/64);
});
