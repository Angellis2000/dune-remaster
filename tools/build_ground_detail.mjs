import {createRequire} from 'node:module';
import {mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.resolve(root,'../hd-vehicles/sources');await mkdir(dir,{recursive:true});
const gen='C:/Users/Admin/.codex/generated_images/01a14eb3-be5c-7531-a765-77307948a05a';
const parts=[];
for(const [index,name,file] of [[0,'sand-detail','exec-e3195e1d-c973-4153-8007-24c5303cfd32.png'],[1,'rock-detail','exec-59572237-361a-40d4-90ba-a2f802e57136.png']]){
  await copyFile(path.join(gen,file),path.join(dir,`${name}.png`));
  parts.push({input:await sharp(path.join(gen,file)).resize(1254,1254).toBuffer(),left:index*1254,top:0});
}
await sharp({create:{width:2508,height:1254,channels:3,background:'#a58a60'}}).composite(parts).png().toFile(path.join(root,'web/src/gfx/assets/map-hd/ground-detail.png'));
console.log('Ground detail: 2508x1254, independent sand and rock samples.');
