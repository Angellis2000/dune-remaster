import type {DuneRom} from '../rom/dune.ts';
import type {ScreenGfx} from './screens.ts';
import type {ScreenArtKey} from './screen-art.ts';

interface Sheet {key:ScreenArtKey;types:readonly number[];cols:number;rows:number}
export const BUILDING_PORTRAIT_SHEETS:readonly Sheet[]=[
  {key:'buildingPortraitsA',types:[0,2,8,9],cols:2,rows:2},
  {key:'buildingPortraitsB',types:[3,5,7,10],cols:2,rows:2},
  {key:'buildingPortraitsC',types:[11,12,13,18],cols:2,rows:2},
  {key:'buildingPortraitsD',types:[14,15,16,17],cols:2,rows:2},
];
export const BUILDING_ICON_SHEETS:readonly Sheet[]=[
  {key:'buildingIconsA',types:[0,2,3,5,7,8,9,11,12],cols:3,rows:3},
  {key:'buildingIconsB',types:[13,14,15,16,17,18],cols:3,rows:2},
];

// The ROM uses the same large illustration for these entries.
const SHARED:Record<number,number>={1:0,4:3,6:3};
// The small ROM icons have their own cameras and a different IX/barracks reuse table.
const SHARED_SMALL:Record<number,number>={1:0,4:3,6:8,10:7};

/** Separate portrait art restores the original camera; battlefield models remain independent. */
export class BuildingPortraits {
  private cache=new Map<string,HTMLCanvasElement>();
  constructor(private rom:DuneRom,private gfx:ScreenGfx){}

  image(type:number,small=false):HTMLCanvasElement|null{
    const key=`${type}:${small}`;const cached=this.cache.get(key);if(cached)return cached;
    const shared=small?SHARED_SMALL:SHARED;
    const sourceType=shared[type]??type;
    const sheet=(small?BUILDING_ICON_SHEETS:BUILDING_PORTRAIT_SHEETS).find(s=>s.types.includes(sourceType));
    const atlas=sheet&&this.gfx.art.get(sheet.key);
    const c=document.createElement('canvas');c.width=small?128:384;c.height=small?96:224;
    const g=c.getContext('2d')!;g.imageSmoothingEnabled=true;
    if(atlas&&sheet){
      const index=sheet.types.indexOf(sourceType),sw=atlas.width/sheet.cols,sh=atlas.height/sheet.rows;
      const sx=index%sheet.cols*sw,sy=Math.floor(index/sheet.cols)*sh;
      g.drawImage(atlas,sx,sy,sw,sh,0,0,c.width,c.height);
    }else if(small){
      const original=this.gfx.factoryIcon(false,type);if(!original)return null;
      g.drawImage(original,0,0,c.width,c.height);
    }else{
      const p=this.rom.structurePictures().find(p=>p.id===type);if(!p)return null;
      const original=document.createElement('canvas');original.width=p.width;original.height=p.height;
      original.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(p.pixels),p.width,p.height),0,0);
      g.drawImage(original,0,0,c.width,c.height);
    }
    this.cache.set(key,c);return c;
  }
}
