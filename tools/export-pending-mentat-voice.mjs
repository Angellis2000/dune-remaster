import{createRequire}from'node:module';
import{readFile,writeFile,mkdir}from'node:fs/promises';
import path from'node:path';
import{fileURLToPath,pathToFileURL}from'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(root,'web/package.json'));
const modulePath=path.join(root,'scratch/mentat-text-export.mjs');
await require('esbuild').build({stdin:{contents:"export{MentatGfx}from'./src/gfx/mentat.ts';export{DuneRom}from'./src/rom/dune.ts';export{decodeTextCodes}from'./src/gfx/screens.ts';",resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:modulePath,plugins:[{name:'asset-paths',setup(b){b.onResolve({filter:/\?url$/},a=>({path:path.resolve(a.resolveDir,a.path.split('?')[0]),namespace:'asset'}));b.onLoad({filter:/.*/,namespace:'asset'},a=>({contents:`export default ${JSON.stringify(a.path)}`,loader:'js'}));}}]});
const{MentatGfx,DuneRom,decodeTextCodes}=await import(pathToFileURL(modulePath));
const gfx=new MentatGfx(new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen')))));
const dir=path.join(root,'озвучка-ментатов-осталось');await mkdir(dir,{recursive:true});
const normalize=text=>text.replace(/[ABCEHKMOPTXY]/g,c=>({A:'А',B:'В',C:'С',E:'Е',H:'Н',K:'К',M:'М',O:'О',P:'Р',T:'Т',X:'Х',Y:'У'})[c]??c).replace(/АТРИДЕС/g,'АТРЕЙДЕС').replace(/\s+/g,' ').trim();
const houses=[{code:'A',id:1,name:'Атрейдесы',file:'atreides'},{code:'O',id:2,name:'Ордосы',file:'ordos'},{code:'H',id:0,name:'Харконнены',file:'harkonnen'}];
const kinds=[{id:0,key:'briefing',label:'Задание перед миссией'},{id:3,key:'advice',label:'Совет'},{id:1,key:'victory',label:'После победы'},{id:2,key:'defeat',label:'После поражения'}];
const scenes=[],recordings=new Map(),done=[];
for(const house of houses){
 for(const{mission,kind,scene}of[{mission:null,kind:0,scene:'house-choice'},{mission:1,kind:0,scene:'mission-01-briefing'},{mission:1,kind:3,scene:'mission-01-advice'}]){
  const pages=gfx.pages(gfx.textOf(house.id,mission,kind)).map(p=>normalize(decodeTextCodes(p)));
  done.push({house:house.code,scene,pages,text:pages.join(' ')});
 }
 for(let mission=1;mission<=9;mission++)for(const kind of kinds){
  if(mission===1&&(kind.id===0||kind.id===3))continue; // First briefing and first advice are recorded.
  const pages=gfx.pages(gfx.textOf(house.id,mission,kind.id)).map(p=>normalize(decodeTextCodes(p)));
  const text=pages.join(' '),key=house.code+':'+text;
  const name=`${house.file}-m${String(mission).padStart(2,'0')}-${kind.key}`;
  let recording=recordings.get(key);
  if(!recording){recording={name,house:house.code,text,pages,uses:[]};recordings.set(key,recording);}
  recording.uses.push({mission,kind:kind.key});
  scenes.push({house:house.code,mission,kind:kind.key,label:kind.label,recording:recording.name,text,pages});
 }
}
const intro='# Реплики ментатов, для которых ещё не подключена новая озвучка\n\nИзвлечено из ROM проекта. Уже сделанные выбор дома, первое задание (части 2 и 3) и совет первой миссии исключены. Заголовки и имена файлов не нужно произносить. Одинаковые полные реплики одного ментата достаточно записать один раз; назначения перечислены под именем записи. Фразы приведены целиком, в порядке игры, без добавления слов. Исправлено только отображение русских букв и названия Атрейдесов, как в игре.\n\n';
let combined=intro;
for(const house of houses){
 let block=`# ${house.name}\n\n`;
 for(const recording of recordings.values())if(recording.house===house.code){
  const uses=recording.uses.map(u=>`миссия ${u.mission} — ${kinds.find(k=>k.key===u.kind).label.toLowerCase()}`).join('; ');
  block+=`## ${recording.name}.mp3\n\n${uses}\n\n${recording.text}\n\n`;
 }
 combined+=block+'\n';
 await writeFile(path.join(dir,house.name+'.txt'),block,'utf8');
}
await writeFile(path.join(dir,'Все оставшиеся реплики.md'),combined,'utf8');
await writeFile(path.join(dir,'manifest.json'),JSON.stringify({scenes,recordings:[...recordings.values()],alreadyVoiced:done},null,2)+'\n','utf8');
console.log(JSON.stringify({directory:dir,scenes:scenes.length,recordings:recordings.size,perHouse:houses.map(h=>({house:h.name,recordings:[...recordings.values()].filter(r=>r.house===h.code).length})),sample:scenes.slice(0,2)},null,2));
