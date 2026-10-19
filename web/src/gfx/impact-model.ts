import {visualHash} from './terrain-masks.ts';

export type Surface = 'sand'|'rock'|'spice'|'structure';
export interface Particle {
  x:number;y:number;vx:number;vy:number;vz:number;life:number;born:number;
  frame:number;size:number;angle:number;spin:number;dust:boolean;ring:boolean;
}
const GRAVITY=96;
export function particlePosition(p:Particle,seconds:number):{x:number;y:number;height:number;landed:boolean} {
  const flight=p.dust?seconds:Math.min(seconds,2*p.vz/GRAVITY);
  const drag=p.dust?(1-Math.exp(-seconds*1.7))/1.7:flight;
  const height=p.dust?Math.min(7,seconds*p.vz):Math.max(0,p.vz*flight-GRAVITY*flight*flight/2);
  return {x:p.x+p.vx*drag,y:p.y+p.vy*drag,height,landed:!p.dust&&seconds>=2*p.vz/GRAVITY};
}

/** Cosmetic hash only: effects never advance the game's random stream. */
export function makeImpact(x:number,y:number,type:number,surface:Surface,tick:number):Particle[] {
  if([7,9,12,15].includes(type)||type<0||type>19)return [];
  const large=[3,4,6,10,11,14,16,17,19].includes(type);
  const soft=[8,13,19].includes(type), rock=surface==='rock'||surface==='structure';
  const force=type===11?1.7:large?1.2:type===0?.45:.8;
  const seed=visualHash(Math.round(x*8)^tick,Math.round(y*8)^type*1009);
  const rand=(n:number)=>visualHash(seed,n)/4294967296;
  const result:Particle[]=[];
  const count=large?18:type===0?6:11;
  for(let i=0;i<count;i++){
    const a=rand(i*11)*Math.PI*2,speed=(8+rand(i*11+1)*22)*force;
    const dust=i%3===0||soft;
    const metal=!soft&&large&&i%7===1;
    const frame=dust?(rock?4:0)+Math.floor(rand(i*11+2)*4):metal?11:rock?9:8+(i%3===0?2:0);
    result.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed*.65,vz:(15+rand(i*11+3)*24)*force,
      life:dust?1.1+rand(i*11+4)*.7:.7+rand(i*11+4)*.6,born:tick,
      frame,size:dust?(8+rand(i*11+5)*8)*force:(.65+rand(i*11+5)*1.7)*force,
      angle:rand(i*11+6)*Math.PI*2,spin:(rand(i*11+7)-.5)*15,dust,ring:false});
  }
  if(large||soft)result.push({x,y,vx:0,vy:0,vz:0,life:.8,born:tick,frame:14,size:12*force,angle:0,spin:0,dust:true,ring:true});
  if(large&&!soft)for(let i=0;i<5;i++){
    const a=rand(400+i)*Math.PI*2;
    result.push({x,y,vx:Math.cos(a)*35*force,vy:Math.sin(a)*22*force,vz:25+rand(500+i)*20,
      life:.35+rand(600+i)*.35,born:tick,frame:i%2?15:12,size:i%2?1.4:2.5,
      angle:a,spin:2,dust:false,ring:false});
  }
  return result;
}

