// Contact sheet and comparison layouts made from the already rendered images.
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(root,'../hd-map-graphics/final');
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const layers=[];
for(let i=1;i<=27;i++){
 const image=await sharp(path.join(out,'previews',`map_${String(i).padStart(2,'0')}.png`)).resize(256,256).png().toBuffer();
 const left=((i-1)%6)*256,top=Math.floor((i-1)/6)*280;
 layers.push({input:image,left,top});
 const label=Buffer.from(`<svg width="256" height="24"><text x="8" y="17" font-family="Arial" font-size="14" fill="#e8d9bc">Карта ${i}</text></svg>`);
 layers.push({input:label,left,top:top+256});
}
await sharp({create:{width:1536,height:1400,channels:3,background:'#211e18'}})
 .composite(layers).png().toFile(path.join(out,'all_maps.png'));
const old=await sharp(path.resolve(root,'../extracted-map-graphics/missions/mission_01.png')).resize(1024,1024,{kernel:'nearest'}).png().toBuffer();
const hd=await sharp(path.join(out,'previews/map_01.png')).png().toBuffer();
const labels=Buffer.from('<svg width="2048" height="44"><text x="18" y="29" font-family="Arial" font-size="21" fill="#efdfba">Оригинал</text><text x="1042" y="29" font-family="Arial" font-size="21" fill="#efdfba">Непрерывный HD-ландшафт</text></svg>');
await sharp({create:{width:2048,height:1068,channels:3,background:'#211e18'}})
 .composite([{input:labels,left:0,top:0},{input:old,left:0,top:44},{input:hd,left:1024,top:44}])
 .png().toFile(path.join(out,'before_after.png'));
console.log('Created all_maps.png and before_after.png');
