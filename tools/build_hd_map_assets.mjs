// Slice generated atlases into importable assets; no generated art is synthesized here.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const workspace=path.dirname(root),out=path.join(workspace,'hd-map-graphics');
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const tile=128;
const source=path.join(out,'sources');
const assets=path.join(root,'web/src/gfx/assets/map-hd');
for(const dir of [assets,path.join(out,'map'),path.join(out,'effects'),path.join(out,'previews')])await mkdir(dir,{recursive:true});
const sheets=JSON.parse(await readFile(path.join(source,'sheets.json'),'utf8'));
const destruction=JSON.parse(await readFile(path.join(source,'destruction.json'),'utf8'));
const effectMeta=JSON.parse(await readFile(path.join(source,'effects.json'),'utf8'));
const definitions=[];
const icons=new Map();
for(const sheet of sheets){
 const filename=sheet.name+'.png';
 const buffer=await sharp(path.join(source,sheet.name+'_hd.png')).resize(1024,1024).png().toBuffer();
 await writeFile(path.join(assets,filename),buffer);
 for(let i=0;i<sheet.ids.length;i++){
  const id=sheet.ids[i],x=(i%8)*tile,y=Math.floor(i/8)*tile;
  const png=await sharp(buffer).extract({left:x,top:y,width:tile,height:tile}).png().toBuffer();
  icons.set(id,png);
  await writeFile(path.join(out,'map',`icon_${String(id).padStart(3,'0')}.png`),png);
  definitions.push({id,atlas:filename,x,y,size:tile});
 }
}
const destructionBuffer=await sharp(path.join(source,'destruction_hd.png')).resize(1024,1024).png().toBuffer();
await writeFile(path.join(assets,'destruction.png'),destructionBuffer);
for(let i=0;i<destruction.length;i++){
 const id=destruction[i],x=(i%8)*tile,y=Math.floor(i/8)*tile;
 const png=await sharp(destructionBuffer).extract({left:x,top:y,width:tile,height:tile}).png().toBuffer();
 icons.set(id,png);
 await writeFile(path.join(out,'map',`icon_${String(id).padStart(3,'0')}.png`),png);
 definitions.push({id,atlas:'destruction.png',x,y,size:tile});
}
const effectsBuffer=await sharp(path.join(source,'effects_hd_v1.png')).resize(1024,1024).png().toBuffer();
await writeFile(path.join(assets,'effects.png'),effectsBuffer);
for(const e of effectMeta){
 const x=(e.index%8)*tile,y=Math.floor(e.index/8)*tile;
 const png=await sharp(effectsBuffer).extract({left:x,top:y,width:tile,height:tile}).png().toBuffer();
 await writeFile(path.join(out,'effects',e.key.replaceAll(':','_')+'.png'),png);
}
const variants=[];
for(let i=sheets[1].ids.length;i<64;i++)variants.push({id:127,atlas:'terrain_2.png',x:(i%8)*tile,y:Math.floor(i/8)*tile,size:tile});
const manifest={tileSize:tile,terrain:definitions,effects:effectMeta,variants};
await writeFile(path.join(assets,'manifest.json'),JSON.stringify(manifest));
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
// Preview whole missions using the exact same tile IDs and authored artwork.
for(const number of [1,3,9]){
 const mission=JSON.parse(await readFile(path.join(workspace,'extracted-map-graphics/missions',`mission_${String(number).padStart(2,'0')}.json`),'utf8'));
 const cell=32,composites=[];
 const small=new Map();
 for(const row of mission.ground)for(const id of row)if(!small.has(id)){
  const image=icons.get(id);if(!image)throw Error(`Missing terrain ${id}`);
  small.set(id,await sharp(image).resize(cell,cell).png().toBuffer());
 }
 for(let y=0;y<mission.bounds.h;y++)for(let x=0;x<mission.bounds.w;x++)composites.push({input:small.get(mission.ground[y][x]),left:x*cell,top:y*cell});
 await sharp({create:{width:mission.bounds.w*cell,height:mission.bounds.h*cell,channels:3,background:'#000000'}})
  .composite(composites).png().toFile(path.join(out,'previews',`mission_${number}_draft.png`));
}
console.log(JSON.stringify({terrain:definitions.length,effects:effectMeta.length,sandVariants:variants.length+1,assets}));
