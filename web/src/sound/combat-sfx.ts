/** New effects use IDs outside the MD ROM sound table. No music/voice sequences are replaced. */
export const COMBAT_SFX={LASER_FIRE:0x80,DRONE_EXPLOSION:0x81} as const;
export function isCombatSfx(id:number):boolean{return id===COMBAT_SFX.LASER_FIRE||id===COMBAT_SFX.DRONE_EXPLOSION;}

/** Deterministic PCM synthesis, also used to export the review WAVs. */
export function combatSfxSamples(id:number,sampleRate=44100):Float32Array{
  if(!isCombatSfx(id))return new Float32Array();
  const laser=id===COMBAT_SFX.LASER_FIRE,duration=laser?.62:1.12,out=new Float32Array(Math.ceil(duration*sampleRate));
  let seed=laser?739391:104729,low=0,previous=0,phase=0,subPhase=0;
  const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/2147483648-1;};
  const ringHits=[.065,.13,.225,.36,.51];
  for(let i=0;i<out.length;i++){
    const t=i/sampleRate,n=noise();low+=(n-low)*(laser?.16:.065);const high=n-previous;previous=n;
    const attack=Math.min(1,t/.0025);let value=0;
    if(laser){
      const frequency=t<.024?480+2200*t/.024:210+2200*Math.exp(-(t-.024)*15);
      phase+=2*Math.PI*frequency/sampleRate;subPhase+=2*Math.PI*(55+90*Math.exp(-t*17))/sampleRate;
      value=.46*Math.sin(phase+1.1*Math.sin(phase*.487))*Math.exp(-t*10)
        +.27*Math.sin(subPhase)*Math.exp(-t*15)+.11*high*Math.exp(-t*31)
        +.085*Math.sin(2*Math.PI*2380*t)*Math.exp(-t*8);
    }else{
      phase+=2*Math.PI*(90+1380*Math.exp(-t*11))/sampleRate;subPhase+=2*Math.PI*(38+83*Math.exp(-t*19))/sampleRate;
      value=.8*low*Math.exp(-t*7)+.30*Math.sin(subPhase)*Math.exp(-t*10)
        +.12*Math.sin(phase+1.8*Math.sin(phase*.22))*Math.exp(-t*7)+.13*n*Math.exp(-t*11);
      for(let h=0;h<ringHits.length;h++){
        const age=t-ringHits[h];if(age<0)continue;const envelope=Math.min(1,age/.0015)*Math.exp(-age*(12+h*3));
        value+=envelope*(.07*Math.sin(2*Math.PI*(1170+h*181)*age)+.04*Math.sin(2*Math.PI*(2040+h*317)*age)+.06*high);
      }
    }
    out[i]=Math.tanh(value*1.5)*attack;
  }
  if(laser)for(let i=out.length-1;i>=0;i--){const delay=Math.round(.055*sampleRate);if(i>=delay)out[i]+=.18*out[i-delay];}
  let peak=0,mean=0;for(const sample of out){peak=Math.max(peak,Math.abs(sample));mean+=sample;}mean/=out.length;
  for(let i=0;i<out.length;i++)out[i]=(out[i]-mean)*(.82/Math.max(.001,peak))*Math.min(1,i/64,(out.length-1-i)/256);
  return out;
}
