// Assemble reference sheets without altering the original art.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(workspace, 'hd-map-graphics');
await mkdir(path.join(out, 'sources'), { recursive: true });
const ids = [
  ...Array.from({length:12},(_,i)=>60+i),
  ...Array.from({length:23},(_,i)=>80+i),
  ...Array.from({length:86},(_,i)=>124+i),
];
const sheets = [];
for (let start=0; start<ids.length; start+=64) {
  const batch=ids.slice(start,start+64);
  const cells=Array.from({length:64},(_,i)=>batch[i]??127);
  const composites=[];
  for (let i=0;i<cells.length;i++) {
    const buffer=await sharp(path.join(workspace,'extracted-map-graphics/map',`icon_${String(cells[i]).padStart(3,'0')}.png`))
      .resize(128,128,{kernel:'nearest'}).flatten({background:'#c4a36e'}).png().toBuffer();
    composites.push({input:buffer,left:(i%8)*128,top:Math.floor(i/8)*128});
  }
  const name=`terrain_${sheets.length+1}`;
  await sharp({create:{width:1024,height:1024,channels:3,background:'#c4a36e'}})
    .composite(composites).png().toFile(path.join(out,'sources',name+'.png'));
  sheets.push({name,columns:8,rows:8,ids:batch,cells});
}
await writeFile(path.join(out,'sources/sheets.json'),JSON.stringify(sheets,null,2));
await writeFile(path.join(out,'CHECKPOINT.md'),`Задача: реалистичная HD-перерисовка графики всех карт Dune.
Исходники сохранены в extracted-map-graphics, не менять.
Подготовлены два reference atlas (8x8) для 121 наземной клетки: 60..71,80..102,124..209.
Все 114 уникальных номеров исходных карт входят в набор.
Осталось: ImageGen-перерисовка, сохранение исходных ID, нарезка PNG, сборка карт и проверка стыков, ZIP для импорта.
Ожидается уточнение пользователя: поверхность карт или также здания/юниты.
`);
console.log(JSON.stringify({out,unique:ids.length,sheets:sheets.map(s=>({name:s.name,count:s.ids.length}))}));
