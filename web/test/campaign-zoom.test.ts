import{test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{CampaignZoom}from'../src/gfx/campaign-zoom.ts';

const rom=readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url));
const frames=[8,13,18,23,28,33,38,43,48,53,58,64,71,79,88,98];
test('all ten region cameras retain original key poses with continuous fractional motion',()=>{
  for(let region=0;region<10;region++){
    const steps=Array.from({length:17},(_,i)=>{
      const p=0x24b8e+region*0xfc+i*12;
      return{dx:rom.readInt16BE(p),dy:rom.readInt16BE(p+2),step:rom.readUInt32BE(p+4)};
    });
    const camera=new CampaignZoom(80,35,steps,frames);
    let hs=80,vs=35;
    assert.deepEqual(camera.sample(-10),{hs,vs,scale:1});
    frames.forEach((frame,i)=>{
      hs-=steps[i+1].dx;vs-=steps[i+1].dy;
      assert.deepEqual(camera.sample(frame),{hs,vs,scale:65536/steps[i].step});
      if(i<frames.length-1){
        const e=.0001,a=camera.sample(frame-e),b=camera.sample(frame),c=camera.sample(frame+e);
        for(const key of ['hs','vs','scale']as const)
          assert.ok(Math.abs((b[key]-a[key])/e-(c[key]-b[key])/e)<.001,'Camera velocity must not jump at ROM keyframes');
      }
    });
    assert.deepEqual(camera.sample(1000),camera.sample(98));
    const knots=[0,...frames];
    for(let frame=0;frame<98;frame+=.25){
      const i=knots.findIndex((_,i)=>frame>=knots[i]&&frame<knots[i+1]);
      const p=camera.sample(frame),a=camera.sample(knots[i]),b=camera.sample(knots[i+1]);
      for(const key of ['hs','vs','scale']as const){
        assert.ok(Number.isFinite(p[key]));
        assert.ok(p[key]>=Math.min(a[key],b[key])-1e-8&&p[key]<=Math.max(a[key],b[key])+1e-8,'No overshoot at region boundaries');
      }
    }
    assert.notDeepEqual(camera.sample(24.25),camera.sample(24.5),'Motion must update between simulation frames');
  }
});
