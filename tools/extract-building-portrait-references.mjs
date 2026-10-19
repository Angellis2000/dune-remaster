// Run from the project root. Original references stay in scratch/, outside shipped assets.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'web/package.json'));
const {build}=require('esbuild');
const {createCanvas,ImageData,Path2D,loadImage}=require(process.env.CANVAS_MODULE??'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=path.join(root,'scratch/building-portrait-references');await mkdir(dir,{recursive:true});
const modulePath=path.join(root,'scratch/building-reference-decoder.mjs');
await build({stdin:{contents:"export {DuneRom} from './src/rom/dune.ts';export {ScreenGfx} from './src/gfx/screens.ts';",resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:modulePath,plugins:[{name:'urls',setup(b){b.onResolve({filter:/\?.*url$/},a=>({path:a.path,namespace:'url'}));b.onLoad({filter:/.*/,namespace:'url'},()=>({contents:'export default "unused"',loader:'js'}));}}]});
globalThis.ImageData=ImageData;globalThis.Path2D=Path2D;globalThis.document={createElement:()=>createCanvas(320,224)};
const {DuneRom,ScreenGfx}=await import(pathToFileURL(modulePath));
const rom=new DuneRom(new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen')))),gfx=new ScreenGfx(rom),pictures=rom.structurePictures();
const overview=createCanvas(1200,750),og=overview.getContext('2d');og.fillStyle='#16191b';og.fillRect(0,0,1200,750);og.imageSmoothingEnabled=false;
for(let type=0;type<19;type++){
 const small=gfx.factoryIcon(false,type),pic=pictures.find(p=>p.id===type),x=type%4*300,y=Math.floor(type/4)*150;
 og.fillStyle='#fff';og.font='14px Arial';og.fillText(String(type),x+6,y+18);
 if(small){og.drawImage(small,x+4,y+28,96,72);await writeFile(path.join(dir,`small-${type}.png`),small.toBuffer('image/png'));}
 if(pic){const c=createCanvas(pic.width,pic.height);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pic.pixels),pic.width,pic.height),0,0);og.drawImage(c,x+105,y+28,192,112);await writeFile(path.join(dir,`portrait-${type}.png`),c.toBuffer('image/png'));}
}
await writeFile(path.join(dir,'original-building-portraits.png'),overview.toBuffer('image/png'));
for(const [name,kind,ids,cols,rows,w,h]of [
 ['large-a','portrait',[0,2,8,9],2,2,768,448],['large-b','portrait',[3,5,7,10],2,2,768,448],
 ['large-c','portrait',[11,12,13,18],2,2,768,448],['large-d','portrait',[14,15,16,17],2,2,768,448],
 ['small-a','small',[0,2,3,5,7,8,9,11,12],3,3,512,384],['small-b','small',[13,14,15,16,17,18],3,2,512,384],
]){
 const c=createCanvas(cols*w,rows*h),g=c.getContext('2d');g.imageSmoothingEnabled=false;
 for(let i=0;i<ids.length;i++)g.drawImage(await loadImage(path.join(dir,`${kind}-${ids[i]}.png`)),i%cols*w,Math.floor(i/cols)*h,w,h);
 await writeFile(path.join(dir,name+'.png'),c.toBuffer('image/png'));
}
console.log('Extracted all 19 original building portraits/icons and six reference sheets: '+dir);
