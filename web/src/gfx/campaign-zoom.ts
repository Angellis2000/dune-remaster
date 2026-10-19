interface ZoomStep {dx:number;dy:number;step:number}
export interface CampaignCamera {hs:number;vs:number;scale:number}

/** Smooth monotone interpolation through the original camera poses and frame times. */
export class CampaignZoom {
  private frames:number[];
  private poses:CampaignCamera[];
  constructor(hs:number,vs:number,steps:ZoomStep[],frames:readonly number[]){
    this.frames=[0,...frames];this.poses=[{hs,vs,scale:1}];
    frames.forEach((_,i)=>{
      hs-=steps[i+1].dx;vs-=steps[i+1].dy;
      this.poses.push({hs,vs,scale:0x10000/Math.max(1,steps[i].step)});
    });
  }
  sample(frame:number):CampaignCamera{
    const times=this.frames,poses=this.poses;
    if(frame<=0)return {...poses[0]};
    if(frame>=times[times.length-1])return {...poses[poses.length-1]};
    let i=0;while(frame>times[i+1])i++;
    const span=times[i+1]-times[i],t=(frame-times[i])/span;
    const value=(key:keyof CampaignCamera)=>{
      const slope=(j:number)=>(poses[j+1][key]-poses[j][key])/(times[j+1]-times[j]);
      const tangent=(j:number)=>{
        if(j===0)return slope(0);if(j===poses.length-1)return slope(j-1);
        const a=slope(j-1),b=slope(j);if(a*b<=0)return 0;
        const prev=times[j]-times[j-1],next=times[j+1]-times[j];
        const w1=2*next+prev,w2=next+2*prev;
        return (w1+w2)/(w1/a+w2/b);
      };
      return (2*t**3-3*t*t+1)*poses[i][key]+(t**3-2*t*t+t)*span*tangent(i)
        +(-2*t**3+3*t*t)*poses[i+1][key]+(t**3-t*t)*span*tangent(i+1);
    };
    return {hs:value('hs'),vs:value('vs'),scale:value('scale')};
  }
}
