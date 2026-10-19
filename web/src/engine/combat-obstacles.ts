import {LST,MOVEMENT,indexGetTile,indexGetUnit,indexIsValid,packXY,type Unit} from './core.ts';
import {unitInfo} from './tables.ts';
import {mapGetLandscapeType} from './map.ts';

/** First wall crossed by a ground weapon, including tiles narrowly clipped by a diagonal ray. */
export function blockingWall(unit:Unit,target:number):number|null {
  if(!target||!indexIsValid(target)||unitInfo[unit.o.type].movementType===MOVEMENT.WINGER)return null;
  const victim=indexGetUnit(target);
  if(victim&&unitInfo[victim.o.type].movementType===MOVEMENT.WINGER)return null;
  const from=unit.o.position,to=indexGetTile(target);
  let x=Math.floor(from.x/256),y=Math.floor(from.y/256);
  const endX=Math.floor(to.x/256),endY=Math.floor(to.y/256),dx=to.x-from.x,dy=to.y-from.y;
  const ax=Math.abs(dx),ay=Math.abs(dy),sx=dx<0?-1:1,sy=dy<0?-1:1;
  let nextX=dx<0?from.x-x*256:(x+1)*256-from.x;
  let nextY=dy<0?from.y-y*256:(y+1)*256-from.y;
  for(let limit=Math.abs(endX-x)+Math.abs(endY-y)+2;limit>0&&(x!==endX||y!==endY);limit--){
    if(ay===0||(ax!==0&&nextX*ay<=nextY*ax)){x+=sx;nextX+=256;}
    else{y+=sy;nextY+=256;}
    const packed=packXY(x,y);
    if(mapGetLandscapeType(packed)===LST.WALL)return packed;
  }
  return null;
}
