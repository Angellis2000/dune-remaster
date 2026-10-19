import assert from'node:assert/strict';
import{createRequire}from'node:module';
import{readFile,access}from'node:fs/promises';
import path from'node:path';
import{fileURLToPath,pathToFileURL}from'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(root,'web/package.json'));
const modulePath=path.join(root,'scratch/custom-music-test.mjs');
await require('esbuild').build({stdin:{contents:"export{Sound,MUSIC,SOUND_ROM}from'./src/sound/sound.ts';",resolveDir:path.join(root,'web')},bundle:true,platform:'node',format:'esm',outfile:modulePath,plugins:[{name:'worklet-url',setup(b){b.onResolve({filter:/\?worker&url$/},()=>({path:'worklet',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export default "worklet.js"',loader:'js'}));}}]});
const audios=[],delayed=[];
let delay=false;
globalThis.Audio=class{
  paused=true;ended=false;currentTime=0;duration=200;loop=false;volume=1;
  constructor(src){this.src=src;audios.push(this);}
  pause(){this.paused=true;}
  play(){if(delay)return new Promise(resolve=>delayed.push(()=>{this.paused=false;resolve();}));this.paused=false;return Promise.resolve();}
};
const{Sound,MUSIC,SOUND_ROM}=await import(pathToFileURL(modulePath));
const sound=new Sound({bytes:new Uint8Array(await readFile(path.join(root,'rom/dune_usa.gen')))});
const tick=async()=>{await Promise.resolve();await Promise.resolve();};
const current=()=>audios.filter(a=>!a.paused);
const expectTrack=async(name)=>{await tick();assert.equal(current().length,1,'Exactly one music source must play');assert.ok(current()[0].src.endsWith('/'+name+'.mp3'));await access(path.join(root,'web/public/music',name+'.mp3'));};
sound.useBank('intro');sound.playMusicSequence(0);await expectTrack('opening');
sound.useBank('game');
for(const[id,name]of[[25,'mentat-atreides'],[26,'mentat-ordos'],[24,'mentat-harkonnen'],[8,'spice-trip'],[9,'trenching'],[10,'command-post'],[11,'lego-tune'],[12,'turbulence']]){
 sound.playMusic(id);await expectTrack(name);assert.equal(sound.audibleMusic(),null,'GEMS must not duplicate an MP3');
}
let active=current()[0];active.duration=161.98;active.currentTime=160;
sound.frame();assert.equal(sound.battleLeft,119,'Battle timer must follow actual audio rather than cut at the old ROM duration');
sound.stopMusic();assert.equal(current().length,0);sound.frame();await tick();assert.equal(current().length,0);
sound.resumeMusic();await expectTrack('turbulence');assert.equal(active.currentTime,160,'Pause must retain playback position');
active.ended=true;sound.frame();assert.equal(sound.battleLeft,-1,'Finished battle recording must request a new song');active.ended=false;
sound.previewMusic(6);await expectTrack('mentat-harkonnen');sound.endPreview();await expectTrack('turbulence');
sound.stopMusic();sound.previewMusic(6);await expectTrack('mentat-harkonnen');sound.endPreview();await tick();
assert.equal(current().length,0,'Closing a preview must respect the options pause');sound.resumeMusic();await expectTrack('turbulence');
sound.setVoiceDucking(true);assert.equal(current()[0].volume,.22);sound.setVoiceDucking(false);assert.equal(current()[0].volume,1);
sound.setMusic(false);assert.equal(current().length,0);sound.playMusic(MUSIC.MENTAT[0]);await tick();assert.equal(current().length,0);
sound.setMusic(true);await expectTrack('mentat-harkonnen');
// Resolve stale play promises after switching houses; only the final selection may survive.
delay=true;sound.playMusic(25);sound.playMusic(26);sound.playMusic(24);
delayed.splice(0).forEach(resolve=>resolve());await expectTrack('mentat-harkonnen');delay=false;
sound.previewMusic(9);await tick();assert.equal(current().length,0,'Unreplaced ROM preview must stop all MP3s');assert.equal(sound.audibleMusic(),9);
sound.endPreview();await expectTrack('mentat-harkonnen');
sound.playMusic(MUSIC.STOP);await tick();assert.equal(current().length,0);
console.log('PASS: all 9 recordings, ROM preview fallback, house switches and stale play promises, single-source playback, pause/resume, voice ducking, mute and full-length battle rotation.');
