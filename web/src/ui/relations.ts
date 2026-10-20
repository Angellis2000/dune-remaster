import { G } from '../engine/core.ts';
import { houseAreAllied } from '../engine/house.ts';

export const RELATIONS = {
  own: {label:'Свои',color:'#80ceff'},
  ally: {label:'Союзник',color:'#53e2c4'},
  enemy: {label:'Противник',color:'#ff6659'},
  neutral: {label:'Наблюдение',color:'#c4cbd1'},
} as const;
export function playerRelation(house:number, viewer=G.playerHouseID):keyof typeof RELATIONS {
  if(viewer<0)return 'neutral';
  return house===viewer?'own':houseAreAllied(viewer,house)?'ally':'enemy';
}
