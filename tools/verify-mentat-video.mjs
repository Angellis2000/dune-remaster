import assert from'node:assert/strict';
import{spawnSync}from'node:child_process';
import{fileURLToPath}from'node:url';
const house=process.argv[2]??'harkonnen';
assert.ok(['harkonnen','atreides','ordos'].includes(house));
const file=fileURLToPath(new URL(`../web/public/video/mentat-${house}-alpha.webm`,import.meta.url));
const probe=spawnSync('ffprobe',['-v','error','-show_streams','-of','json',file],{encoding:'utf8'});
assert.equal(probe.status,0,probe.stderr);
const streams=JSON.parse(probe.stdout).streams;
assert.equal(streams.length,1,'Cutout must have no audio stream');
assert.equal(streams[0].tags.alpha_mode,'1');
assert.equal(streams[0].width,512);assert.equal(streams[0].height,384);
const decoded=spawnSync('ffmpeg',['-v','error','-c:v','libvpx-vp9','-i',file,'-vf','scale=256:192:flags=area','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{maxBuffer:128*1024*1024});
assert.equal(decoded.status,0,decoded.stderr.toString());
const pixels=decoded.stdout,stride=256*192*4,count=pixels.length/stride;
assert.equal(count,house==='harkonnen'?234:466,'Expected the entire seamless loop');
let faceAlpha=255;
for(let frame=0;frame<count;frame++){
  const at=frame*stride;
  for(const[x,y]of[[0,0],[255,0],[0,100],[255,100]])assert.equal(pixels[at+(y*256+x)*4+3],0,'Background must remain transparent on every frame');
  const [x0,y0,x1,y1]=house==='harkonnen'?[103,33,145,95]:[120,55,140,90];
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)faceAlpha=Math.min(faceAlpha,pixels[at+(y*256+x)*4+3]);
}
assert.ok(faceAlpha>=253,'Skin must not develop translucent holes: '+faceAlpha);
const difference=(a,b)=>{
  let sum=0;
  for(let i=0;i<stride;i+=4){
    const aa=pixels[a*stride+i+3]/255,ab=pixels[b*stride+i+3]/255;
    for(let c=0;c<3;c++)sum+=Math.abs(pixels[a*stride+i+c]*aa-pixels[b*stride+i+c]*ab);
    sum+=Math.abs(aa-ab)*255;
  }
  return sum/stride;
};
const seam=difference(count-1,0),nearby=Math.max(difference(0,1),difference(count-2,count-1));
assert.ok(seam<=nearby*1.4+.05,`Loop boundary must not jump more than adjacent frames: ${seam} vs ${nearby}`);
console.log(`PASS: ${count} frames, transparent background, opaque face (min ${faceAlpha}), silent VP9; loop difference ${seam.toFixed(3)} vs adjacent ${nearby.toFixed(3)}.`);
