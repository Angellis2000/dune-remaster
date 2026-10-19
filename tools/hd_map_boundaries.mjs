// Diagnostic overlays only: original worm/building boundaries and original building footprints.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DuneRom} from '../web/src/rom/dune.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(root,'../hd-map-graphics/final');
await mkdir(path.join(out,'boundaries'),{recursive:true});
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const rom=new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen'))));
const r16=p=>(rom.bytes[p]<<8)|rom.bytes[p+1];
const scenarios=[];for(const h of ['A','O','H'])for(let m=1;m<=9;m++)scenarios.push(rom.scenario(h,m));
const layout=[[1,1],[2,1],[1,2],[2,2],[2,3],[3,2],[3,3]],contact=[];
for(let index=1;index<=27;index++){
 const map=rom.missionMap(index),b=map.bounds,cell=1024/b.w;
 const worm=[],build=[];
 for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
  const p=(y<<6)|x,kind=rom.bytes[0x581c+map.ground[p]],at=0x6ccb6+kind*0x1c;
  worm[p]=rom.bytes[at+5]>0;build[p]=r16(at+8)>0;
 }
 const paths=[[],[]];
 for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
  const p=(y<<6)|x,px=(x-b.x)*cell,py=(y-b.y)*cell;
  for(let layer=0;layer<2;layer++){
   const mask=layer?build:worm;
   if(x+1<b.x+b.w&&mask[p]!==mask[p+1])paths[layer].push(`M${px+cell},${py}v${cell}`);
   if(y+1<b.y+b.h&&mask[p]!==mask[p+64])paths[layer].push(`M${px},${py+cell}h${cell}`);
  }
 }
 const footprints=[];
 for(const sc of scenarios.filter(s=>s.mapIndex===index)){
  const player=sc.houses.find(h=>h.brain==='human')?.id;
  for(const s of sc.structures){
   if([0,1,14].includes(s.type))continue;
   const [w,h]=layout[r16(0x6afae+s.type*0x66+0x3c)]??[1,1];
   footprints.push(`<rect x="${(s.x-b.x)*cell}" y="${(s.y-b.y)*cell}" width="${w*cell}" height="${h*cell}" fill="none" stroke="${s.house===player?'#448aff':'#ff4f68'}" stroke-width="2"/>`);
  }
 }
 const svg=Buffer.from(`<svg width="1024" height="1024"><path d="${paths[0].join('')}" fill="none" stroke="#69dbff" stroke-width="1.8"/><path d="${paths[1].join('')}" fill="none" stroke="#8eff86" stroke-width=".8"/>${footprints.join('')}</svg>`);
 const filename=`map_${String(index).padStart(2,'0')}.png`;
 const image=await sharp(path.join(out,'previews',filename)).composite([{input:svg}]).png().toBuffer();
 await writeFile(path.join(out,'boundaries',filename),image);
 contact.push({input:await sharp(image).resize(256,256).png().toBuffer(),left:((index-1)%6)*256,top:Math.floor((index-1)/6)*280});
 const label=Buffer.from(`<svg width="256" height="24"><text x="8" y="17" font-family="Arial" font-size="14" fill="#eee2cc">Карта ${index}</text></svg>`);
 contact.push({input:label,left:((index-1)%6)*256,top:Math.floor((index-1)/6)*280+256});
}
await sharp({create:{width:1536,height:1400,channels:3,background:'#211e18'}})
 .composite(contact).png().toFile(path.join(out,'all_boundaries.png'));
console.log('27 boundary overlays and original structure footprints exported.');
