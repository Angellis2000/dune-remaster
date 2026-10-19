// Вражеский перевозчик везёт харвестер, завод очистки уничтожают. В оригинале (скрипт ROM $1838) перевозчик
// кружил бы бесконечно; в ремейке без заводов он сбрасывает харвестер и улетает за край. Запуск: … carryall_no_refinery.ts A 4
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {G,IT,STRUCTURE,UNIT,indexEncode,packTile} from '../../web/src/engine/core.ts';
import {structureDamage} from '../../web/src/engine/structure.ts';
import {unitCreateWrapper} from '../../web/src/engine/unit.ts';
const game=new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
const [house,mission]=[process.argv[2]??'A',Number(process.argv[3]??4)];
game.load(house,mission);
const ai=G.structures.find(s=>s.o.flags.used&&s.o.type===STRUCTURE.REFINERY&&s.o.houseID!==G.playerHouseID);
if(!ai){console.log('нет вражеского завода');process.exit(0);}
const h=ai.o.houseID;console.log('враг',h,'завод',ai.o.position.x>>8,ai.o.position.y>>8);
const harv=unitCreateWrapper(h,UNIT.HARVESTER,indexEncode(ai.o.index,IT.STRUCTURE));
const ca=G.units.find(u=>u.o.flags.used&&u.o.type===UNIT.CARRYALL&&u.o.houseID===h&&u.o.linkedID!==0xff);
if(!ca){console.log('перевозчик не создан',!!harv);process.exit(0);}
const show=(f:number)=>console.log(f,`перевозчик ${ca.o.flags.used?'':'УДАЛЁН '} x${ca.o.position.x>>8} y${ca.o.position.y>>8} действие ${ca.actionID} targetMove ${ca.targetMove} груз ${ca.o.linkedID} скорость ${ca.speed} script.pc ${ca.o.script?.pc??'-'}`);
for(let f=1;f<=4000;f++){if(!ca.o.flags.used){console.log(f,"перевозчик улетел за край");break;}
  if(f===200){structureDamage(ai,5000,0);console.log('== завод уничтожен');}
  game.tick();
  if(f%250===0||f===201)show(f);
}
const dropped=G.units.filter(u=>u.o.flags.used&&u.o.type===UNIT.HARVESTER&&u.o.houseID===h&&!u.o.flags.isNotOnMap).length;
console.log('харвестеров врага на карте',dropped,'груз харвестера',G.units[ca.o.linkedID]?.amount,'тип груза',G.units[ca.o.linkedID]?.o.type);
