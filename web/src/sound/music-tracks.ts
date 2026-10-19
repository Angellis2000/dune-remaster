import type{SoundBank}from'./gems.ts';
interface RecordedMusic{name:string;battleSeconds?:number}
/** GEMS sequence numbers, not the Westwood music IDs or soundtrack file indices. */
const tracks:Record<SoundBank,Record<number,RecordedMusic>>={
  intro:{0:{name:'opening'}},
  game:{
    0:{name:'mentat-atreides'},
    6:{name:'mentat-harkonnen'},
    8:{name:'mentat-ordos'},
    1:{name:'spice-trip',battleSeconds:184.972},
    2:{name:'trenching',battleSeconds:201.702250},
    3:{name:'command-post',battleSeconds:179.765417},
    4:{name:'lego-tune',battleSeconds:212.450833},
    10:{name:'turbulence',battleSeconds:161.980667},
  },
};
export function recordedMusic(bank:SoundBank,sequence:number):RecordedMusic|undefined{return tracks[bank][sequence];}
export function isRecordedBattle(name:string):boolean{return Object.values(tracks.game).some(t=>t.name===name&&t.battleSeconds!==undefined);}
