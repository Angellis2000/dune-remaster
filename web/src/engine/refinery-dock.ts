import type {Tile32} from './core.ts';
/** The original 3x2 refinery has its unloading pad in the lower-right cell. */
export function refineryDock(position:Tile32):Tile32 {
  return {x:(position.x&0xff00)+2*256+128,y:(position.y&0xff00)+256+128};
}
export function refineryExit(position:Tile32):Tile32 {
  const dock=refineryDock(position);return {x:dock.x,y:dock.y+256};
}
