import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {drawRadarDish} from '../web/src/gfx/radar-motion.ts';
const require=createRequire(import.meta.url);
const {createCanvas}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
// A marker at the actual bowl centre detects orbital drift independently of the
// asymmetric rim/feed/bracket silhouettes seen at different bearings.
const source=createCanvas(1254,1254),sg=source.getContext('2d');
sg.fillStyle='#ff00ff';sg.beginPath();sg.arc(331,406,20,0,Math.PI*2);sg.fill();
for(const size of [128,384,768]){
  const c=createCanvas(size,size),g=c.getContext('2d'),positions=[];
  for(let i=0;i<32;i++){
    g.clearRect(0,0,size,size);drawRadarDish(g,source,size,size,i*1080/32);
    const p=g.getImageData(0,0,size,size).data;let mass=0,xMass=0,yMass=0;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const a=p[(y*size+x)*4+3];mass+=a;xMass+=(x+.5)*a;yMass+=(y+.5)*a;
    }
    assert.ok(mass>0);positions.push([xMass/mass,yMass/mass]);
  }
  for(const [x,y]of positions){
    assert.ok(Math.abs(x-size*398/1254)<.3,'Bowl centre must remain on the fixed bearing in X');
    assert.ok(Math.abs(y-size*430/1254)<.3,'Bowl centre must remain on the fixed bearing in Y');
  }
  const spread=axis=>Math.max(...positions.map(p=>p[axis]))-Math.min(...positions.map(p=>p[axis]));
  assert.ok(spread(0)<.35&&spread(1)<.35,'Full-turn centre drift must stay below a fraction of a screen pixel');
}
console.log('PASS: dish centre stays registered to its bearing over 32 angles at 3 scales; no orbital drift.');
