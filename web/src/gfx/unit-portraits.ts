import combat from './assets/frontend/unit-combat-portraits-v1.png?url';
import utility from './assets/frontend/unit-utility-portraits-v1.png?url';
import infantry from './assets/frontend/unit-infantry-portraits-v1.png?url';
import air from './assets/frontend/unit-air-portraits-v1.png?url';
import special from './assets/frontend/unit-special-portraits-v2.png?url';
import custom from './assets/frontend/custom-unit-portraits-v2.png?url';

interface Source { image:HTMLImageElement; x:number; y:number; w:number; h:number }
const sources=new Map<number,Source>();
const images:HTMLImageElement[]=[];
function atlas(url:string,types:number[],rows:number[]=[0,1/3,2/3,1]):void {
  const image=new Image();image.src=url;images.push(image);
  types.forEach((type,i)=>{const row=i>>1;sources.set(type,{image,x:(i%2)/2,y:rows[row],w:.5,h:rows[row+1]-rows[row]});});
}
// Authored panel boundaries are recorded explicitly; no neighbouring portrait
// can bleed into a selection card when generation differs slightly from a grid.
atlas(combat,[7,8,9,10,11,12],[0,417/1254,813/1254,1]);
atlas(utility,[13,14,15,16,17,0],[0,378/1254,788/1254,1]);
atlas(infantry,[2,3,4,5,6,25]);
atlas(air,[1,26],[0,1]);
atlas(custom,[27,28],[0,1]);
atlas(special,[10,12],[0,1]);

export async function loadUnitPortraits():Promise<void> {
  await Promise.all(images.map(image=>image.decode().catch(()=>{})));
}
export function unitPortraitSource(type:number):Source|null {
  const source=sources.get(type);
  return source?.image.complete&&source.image.naturalWidth?source:null;
}
