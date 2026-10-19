import {test} from 'node:test';
import assert from 'node:assert/strict';
import {G} from '../src/engine/core.ts';
import {CreditsTicker} from '../src/ui/hud.ts';

test('network credits counter handles balances above 16-bit and 32-bit limits',()=>{
  const previous=G.net;
  G.net={humans:3,team:[0,1]};
  try{
    const ticker=new CreditsTicker();
    for(const balance of [50000,1000000,5_000_000_000,4_999_999_700,0]){
      ticker.reset(balance);
      for(let i=0;i<240;i++)ticker.tick(balance);
      assert.equal(ticker.shown,balance);
    }
    ticker.reset(5_000_000_000);
    for(let i=0;i<240;i++)ticker.tick(5_000_000_000);
    for(let i=0;i<240;i++)ticker.tick(4_999_999_700);
    assert.equal(ticker.shown,4_999_999_700,'spending should animate downward without wrapping');
  }finally{G.net=previous;}
});
