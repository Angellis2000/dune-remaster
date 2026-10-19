// Разбор байт-кода скрипта юнитов EMC из ROM: node --experimental-transform-types tools/sim/emc_unit_dump.ts ОТ ДО
// Начала скриптов по типам — offsets (перевозчик, тип 0, — 1743). Имена функций — из scriptFunctionsUnit.
import {readFileSync} from 'node:fs';
import {DuneRom} from '../../web/src/rom/dune.ts';
import {Game} from '../../web/src/engine/game.ts';
import {G} from '../../web/src/engine/core.ts';
new Game(new DuneRom(new Uint8Array(readFileSync(new URL('../../rom/dune_usa.gen',import.meta.url)))));
const info:any=G.scriptUnit;
const code:Uint16Array|number[]=info.start??info.data??info.code;
console.log('keys',Object.keys(info).join(','),'len',code?.length,'offsets',JSON.stringify((info.offsets??[]).slice?.(0,30)));
const OPS=["JUMP","SETRETURN","PUSH_RET/LOC","PUSH","PUSH2","PUSH_VAR","PUSH_LOCAL","PUSH_PARAM","POP_RET/LOC","POP_VAR","POP_LOCAL","POP_PARAM","STACK_REWIND","STACK_FORWARD","FUNCTION","JUMP_NE","UNARY","BINARY","RETURN"];
const [from,to]=[Number(process.argv[2]),Number(process.argv[3])];
let i=from;
while(i<to){const cur=code[i];const at=i;i++;let op=(cur>>8)&0x1f,par=0;
  if(cur&0x8000){op=0;par=cur&0x7fff;}else if(cur&0x4000){par=cur&0x80?(cur&0xff)-256:cur&0xff;}else if(cur&0x2000){par=code[i];i++;}
  const fn=op===14?(info.functions?.[par]?.name??'?'):'';
  console.log(at,OPS[op]??op,par,fn);}
