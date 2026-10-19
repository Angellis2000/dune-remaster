/**
 * Оживление готовых зданий, у которых своей анимации не было: огни, иллюминаторы, шкалы, пар, маяки.
 * Только рисование поверх встроенного HD-набора (координаты — доли картинки здания); в игру ничего не пишет,
 * поэтому в сети и в кампании симуляция не меняется. Состояние, которое видно лишь хозяину (готовность дворца,
 * заполнение хранилищ, ждёт ли космопорт заказ), показывается только у зданий местного игрока.
 */
import {G,INDEX_INVALID,STATE,STRUCTURE} from '../engine/core.ts';
import {droneHome} from '../engine/advanced-units.ts';
import type {Structure} from '../game/world.ts';

const TAU=Math.PI*2;
type Ctx=CanvasRenderingContext2D;

function glow(ctx:Ctx,x:number,y:number,r:number,rgb:string,a:number):void{
  if(a<=.01)return;
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
/** Лампа: яркая точка и ореол (радиусы в вызовах — «на глаз» по картинке, на карте увеличены в 1,8 раза). */
function lamp(ctx:Ctx,x:number,y:number,r:number,rgb:string,a:number):void{
  if(a<=.01)return;
  r*=1.8;
  glow(ctx,x,y,r*3.4,rgb,a*.6);
  ctx.fillStyle=`rgba(${rgb},${Math.min(1,a)})`;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
}
/** Клуб пара или дыма: поднимается, расплывается и тает. */
function puffs(ctx:Ctx,x:number,y:number,size:number,t:number,seed:number,rgb='214,206,192',strength=1):void{
  for(let i=0;i<3;i++){
    const k=((t*.45+i/3+seed)%1+1)%1;
    const px=x+Math.sin((k+seed)*5+i)*size*.5,py=y-k*size*3.2;
    glow(ctx,px,py,size*(.6+k*1.4),rgb,(1-k)*(.32*strength)*Math.min(1,k*6));
  }
}
/** Блик на стекле: полоса, раз в несколько секунд проходящая по кругу. */
function glint(ctx:Ctx,x:number,y:number,r:number,t:number,period:number,seed:number):void{
  const k=((t/period+seed)%1+1)%1;if(k>.22)return;
  const p=k/.22,off=(p*2-1)*r*1.4;
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.clip();
  ctx.translate(x+off,y-off);ctx.rotate(-Math.PI/4);
  const g=ctx.createLinearGradient(-r*.25,0,r*.25,0);
  g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,`rgba(235,248,255,${.5*Math.sin(Math.PI*p)})`);g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(-r*.25,-r*1.6,r*.5,r*3.2);ctx.restore();
}
const wave=(t:number,phase=0)=>.5+.5*Math.sin(t+phase);

export function drawStructureLife(ctx:Ctx,s:Structure,tick:number,powered:boolean):void{
  if(!s.built||s.hp<=0)return;
  const e=s.ref,w=s.w*32,h=s.h*32,ox=s.x*32,oy=s.y*32,t=tick/60,ph=s.id*.37;
  const X=(n:number)=>ox+w*n,Y=(n:number)=>oy+h*n,R=(n:number)=>w*n;
  const own=s.house===G.playerHouseID,busy=e.state===STATE.BUSY&&!e.o.flags.onHold;
  ctx.save();ctx.imageSmoothingEnabled=true;
  switch(s.type){
    case STRUCTURE.PALACE:{
      // огни на куполах по кругу, пар из решётки, а у своего дворца — золотое сияние, когда оружие готово
      const domes=[[.18,.10],[.62,.10],[.79,.27],[.79,.61],[.19,.69]];
      if(powered)domes.forEach(([x,y],i)=>{const k=((t*.9-i/domes.length+ph)%1+1)%1;lamp(ctx,X(x),Y(y),R(.010),'255,214,130',Math.max(0,1-k*3.5)*.95);});
      puffs(ctx,X(.81),Y(.09),R(.03),t,ph);
      if(own&&e.countDown===0&&powered){
        for(let i=0;i<2;i++){const k=((t*.5+i/2)%1);ctx.strokeStyle=`rgba(255,218,120,${(1-k)*.55})`;ctx.lineWidth=R(.012);
          ctx.beginPath();ctx.arc(X(.41),Y(.33),R(.2+k*.12),0,TAU);ctx.stroke();}
        glow(ctx,X(.41),Y(.33),R(.24),'255,226,140',.18+.12*wave(t*4));
      }
      break;
    }
    case STRUCTURE.STARPORT:{
      // посадочные огни расходятся волной от центра; у своего порта при заказе — быстрее и янтарные, мигают стрелки
      const house=G.houses[s.house],incoming=own&&!!house&&(house.starportLinkedID!==INDEX_INVALID||house.starportTimeLeft>0);
      const lights=[[.765,.707,0],[.765,.61,1],[.68,.627,1],[.85,.627,1],[.68,.707,1],[.85,.707,1],[.68,.785,1],[.85,.785,1],[.765,.80,1],[.605,.707,2],[.93,.707,2]];
      const speed=incoming?3:1.2,rgb=incoming?'255,196,96':'150,215,255';
      if(powered)for(const [x,y,ring] of lights){const k=((t*speed-ring/3+ph)%1+1)%1;lamp(ctx,X(x),Y(y),R(ring===0?.016:.011),rgb,Math.max(0,1-k*2.6)*(incoming?1:.7));}
      if(powered&&incoming&&Math.floor(t*2.5)%2===0)
        for(const [x,y] of [[.63,.55],[.77,.53],[.93,.55],[.63,.88],[.77,.90],[.93,.88]])glow(ctx,X(x),Y(y),R(.035),'255,190,80',.55);
      [[.43,.17,.075],[.76,.27,.085],[.19,.42,.075]].forEach(([x,y,r],i)=>glint(ctx,X(x),Y(y),R(r),t,7,ph+i*.31));
      break;
    }
    case STRUCTURE.BARRACKS:case STRUCTURE.WOR_TROOPER:{
      // сигнальные огни на куполах; во время обучения — чаще и тёплым светом
      const domes=[[.19,.17],[.59,.17],[.19,.52],[.83,.65],[.46,.77]];
      if(powered)domes.forEach(([x,y],i)=>{const k=((t*(busy?1.6:.55)+i*.37+ph)%1+1)%1;
        lamp(ctx,X(x),Y(y),R(.014),busy?'255,210,140':'140,255,170',Math.max(0,1-k*4)*.9);});
      break;
    }
    case STRUCTURE.HIGH_TECH:{
      // иллюминаторы капсулы дышат светом, у самолётов мигают бортовые огни, при сборке по кругу бегут огни
      if(powered)[.23,.38,.52].forEach((y,i)=>glow(ctx,X(.16),Y(y),R(.05),'110,210,255',.28+.22*wave(t*1.7,i*1.3+ph)));
      const blink=Math.floor(t*1.4+ph)%2===0;
      for(const x of [.31,.425]){lamp(ctx,X(x-.055),Y(.85),R(.006),'255,80,70',blink?.9:.15);lamp(ctx,X(x+.055),Y(.85),R(.006),'90,255,120',blink?.15:.9);}
      if(powered&&busy){const a=t*2.4+ph;for(let i=0;i<3;i++){const b=a+i*TAU/3;lamp(ctx,X(.69)+Math.cos(b)*R(.16),Y(.67)+Math.sin(b)*R(.16),R(.009),'140,230,255',.85);}}
      if(powered)[.555,.61,.665,.72].forEach((x,i)=>glow(ctx,X(x),Y(.095),R(.025),'150,220,255',busy?.5*wave(t*6,i):.12));
      break;
    }
    case STRUCTURE.SILO:{
      // шкалы на баках показывают заполнение хранилищ своего дома; по дискам медленно ходит блик
      const house=G.houses[s.house];
      const fill=own&&house&&house.creditsStorage>0?Math.min(1,house.credits/house.creditsStorage):-1;
      for(const [x,y,i] of [[.32,.27,0],[.56,.64,1]]){
        const cx=X(x),cy=Y(y),r=R(.195),a0=.95,a1=-.55;
        ctx.lineWidth=R(.016);ctx.lineCap='round';
        if(fill>=0){ctx.strokeStyle='rgba(255,214,90,.85)';ctx.beginPath();ctx.arc(cx,cy,r,a0,a0+(a1-a0)*fill,true);ctx.stroke();}
        else{ctx.strokeStyle=`rgba(255,214,90,${.15+.15*wave(t*1.3,i+ph)})`;ctx.beginPath();ctx.arc(cx,cy,r,a0,a1,true);ctx.stroke();}
        glint(ctx,cx,cy,R(.17),t,9,ph+i*.5);
      }
      const valves=[[.66,.13],[.79,.13],[.66,.26],[.79,.26],[.79,.38],[.79,.51]];
      if(powered)valves.forEach(([x,y],i)=>{const on=fill>=0?i<Math.ceil(fill*valves.length):i===Math.floor(t+ph)%valves.length;lamp(ctx,X(x),Y(y),R(.008),'120,255,150',on?.8:0);});
      break;
    }
    case STRUCTURE.REPAIR:{
      // огни у ремонтного отсека бегут, пока внутри машина, и сыплются искры; иначе горят ровно
      const repairing=e.o.linkedID!==0xff;
      const lamps=[.365,.43,.495,.56,.63];
      if(powered)lamps.forEach((x,i)=>{const k=((t*2.2-i/lamps.length)%1+1)%1;lamp(ctx,X(x),Y(.745),R(.007),'255,200,90',repairing?Math.max(.15,1-k*2.5):.35);});
      if(powered&&repairing){
        for(let i=0;i<6;i++){const k=((t*1.7+i/6)%1),a=i*1.9+Math.floor(t*1.7)*.7,sx=X(.38+(i%3)*.11),sy=Y(.6);
          lamp(ctx,sx+Math.cos(a)*R(.03)*k,sy-R(.02)*k+k*k*R(.05),R(.004),'255,236,170',(1-k)*.9);}
        glow(ctx,X(.49),Y(.63),R(.06),'190,225,255',.35*wave(t*9));
      }
      puffs(ctx,X(.27),Y(.66),R(.018),t,ph,'225,225,225',repairing?1:.5);
      break;
    }
    case STRUCTURE.DRONE_PAD:{
      // красные огни на антеннах; кольца площадок светятся, пока звено заряжается, и мигают, когда оно летит на посадку
      const blink=Math.floor(t*1.1+ph)%2;
      lamp(ctx,X(.365),Y(.015),R(.009),'255,70,60',blink?.95:.15);lamp(ctx,X(.645),Y(.015),R(.009),'255,70,60',blink?.15:.95);
      let docked=false,returning=false;
      for(const u of G.unitFind){if(!u.drone||!u.o.flags.used||droneHome(u)!==e)continue;
        if(u.drone.phase==='dock')docked=true;else if(u.drone.phase==='return')returning=true;}
      const pads=[[.40,.49],[.615,.49],[.505,.70]];
      for(const [x,y] of pads){
        const cx=X(x),cy=Y(y),r=R(.085);
        if(docked&&powered){ctx.save();ctx.translate(cx,cy);ctx.rotate(t*2+ph);ctx.setLineDash([r*.5,r*.35]);ctx.lineWidth=R(.012);
          ctx.strokeStyle='rgba(120,220,255,.75)';ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();ctx.restore();glow(ctx,cx,cy,r,'120,220,255',.25+.2*wave(t*5));}
        else if(returning&&powered&&Math.floor(t*3)%2===0)glow(ctx,cx,cy,r*1.15,'255,190,80',.35);
        else if(powered)glow(ctx,cx,cy,r*.6,'255,190,80',.06+.05*wave(t,ph));
      }
      break;
    }
    case STRUCTURE.CONSTRUCTION_YARD:{
      // маяк на кране и огни вдоль стен работают при стройке; бульдозер дымит, над щебнем пыль
      if(busy&&powered){
        const a=t*5+ph;
        ctx.save();ctx.translate(X(.82),Y(.12));ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R(.14),a,a+.8);ctx.closePath();
        const g=ctx.createRadialGradient(0,0,0,0,0,R(.14));g.addColorStop(0,'rgba(255,170,50,.75)');g.addColorStop(1,'rgba(255,170,50,0)');
        ctx.fillStyle=g;ctx.fill();ctx.restore();
        lamp(ctx,X(.82),Y(.12),R(.01),'255,180,70',.9);
        puffs(ctx,X(.40),Y(.62),R(.025),t,ph,'90,86,80',1);
        for(let i=0;i<3;i++){const k=((t*.8+i/3+ph)%1);glow(ctx,X(.66+i*.09),Y(.58+.08*((i*7)%3))-k*R(.05),R(.03+k*.04),'200,170,120',(1-k)*.35);}
      }
      if(powered){const lights=[[.945,.57],[.945,.73],[.945,.885],[.27,.975],[.64,.975]];
        lights.forEach(([x,y],i)=>{const k=((t*(busy?2:.4)-i/lights.length)%1+1)%1;lamp(ctx,X(x),Y(y),R(.008),'255,190,90',busy?Math.max(.2,1-k*3):.3);});}
      break;
    }
  }
  ctx.restore();
}
