import { G } from '../engine/core.ts';
import { houseAreAllied } from '../engine/house.ts';
import { HOUSE_NAMES } from '../game/tables.ts';

export const RELATIONS = {
  own: {label:'Свои',color:'#80ceff'},
  ally: {label:'Союзник',color:'#53e2c4'},
  enemy: {label:'Враг',color:'#ff6659'},
  neutral: {label:'Наблюдение',color:'#c4cbd1'},
} as const;
export function playerRelation(house:number, viewer=G.playerHouseID):keyof typeof RELATIONS {
  if(viewer<0)return 'neutral';
  return house===viewer?'own':houseAreAllied(viewer,house)?'ally':'enemy';
}

/**
 * Кто управляет домом в сетевом матче — только для подписей (владелец 2026-10-20: «Союзник · Алексей · Ордосы»,
 * «Враг · Алексей · Харконнены», у компьютера — его имя). Состояние lockstep не трогает: заполняется при старте
 * матча из MatchStart.players, очищается при новом матче или кампании; выход игрока отмечает, у кого теперь база.
 */
const players = new Map<number, {name:string; ai:boolean; left?:string}>();
export function setMatchPlayers(list: readonly {house:number; name:string; ai?:boolean}[] | null): void {
  players.clear();
  for (const p of list ?? []) players.set(p.house, {name:p.name, ai:!!p.ai});
}
/** Игрок вышел; to — имя того, кому досталась база (или null — компьютеру). */
export function markPlayerLeft(house:number, to:string|null): void {
  const p = players.get(house);
  if (p) p.left = to ? `база у ${to}` : 'база у компьютера';
}
const short = (s:string, max=18) => s.length > max ? s.slice(0, max - 1) + '…' : s;

/**
 * Подпись чужого объекта: «Союзник · имя · дом», «Враг · имя · дом», наблюдателю — «имя · дом». У своих — пусто:
 * подпись «Свои» убрана (рамка и здоровье остаются).
 */
export function relationText(house:number, viewer=G.playerHouseID): string {
  const relation = playerRelation(house, viewer);
  if (relation === 'own') return '';
  const p = players.get(house), houseName = HOUSE_NAMES[house] ?? '';
  const who = p ? `${short(p.name)}${p.left ? ` (вышел, ${p.left})` : ''}` : '';
  return [relation === 'neutral' ? '' : RELATIONS[relation].label, who, houseName].filter(Boolean).join(' · ');
}
