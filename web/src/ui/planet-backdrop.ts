import approachUrl from '../gfx/assets/frontend/arrakis-approach-v1.mp4?url';
import orbitUrl from '../gfx/assets/frontend/arrakis-orbit-loop-v1.mp4?url';

/** Video follows the existing ROM camera cue; it never extends the intro's timeline. */
export class PlanetBackdrop {
  private approach=this.video(approachUrl,false);
  private orbit=this.video(orbitUrl,true);
  private firstFrame=-1;
  private frameCount=1;
  private pending=new WeakSet<HTMLVideoElement>();
  private failed=new WeakSet<HTMLVideoElement>();

  private video(url:string,loop:boolean):HTMLVideoElement {
    const video=document.createElement('video');
    video.src=url;video.muted=true;video.playsInline=true;video.preload='auto';video.loop=loop;
    return video;
  }
  reset():void {this.pause();this.firstFrame=-1;this.approach.currentTime=0;this.orbit.currentTime=0;}
  pause():void {this.approach.pause();this.orbit.pause();}
  begin(frame:number,frames:number):void {
    this.firstFrame=frame;this.frameCount=Math.max(1,frames-1);
    this.approach.currentTime=0;this.orbit.currentTime=0;this.orbit.pause();
  }
  alpha(frame:number,settled:boolean):number {return settled?1:Math.min(1,Math.max(0,(frame-this.firstFrame)/10));}
  draw(ctx:CanvasRenderingContext2D,frame:number,settled:boolean):boolean {
    const approaching=!settled&&this.firstFrame>=0;
    const video=approaching?this.approach:this.orbit;
    if(video.error||this.failed.has(video)||video.readyState<2)return false;
    if(approaching){
      this.orbit.pause();
      const duration=video.duration||10;
      video.playbackRate=duration*60/this.frameCount;
      const desired=Math.min(duration-1/24,Math.max(0,(frame-this.firstFrame)/this.frameCount*duration));
      // A suspended tab resumes at the ROM camera position, rather than adding time to the intro.
      if(!video.seeking&&Math.abs(video.currentTime-desired)>.25)video.currentTime=desired;
    }else this.approach.pause();
    if(video.paused&&!this.pending.has(video)){
      this.pending.add(video);
      void video.play().catch((error:unknown)=>{
        if(!(error instanceof DOMException&&error.name==='AbortError'))this.failed.add(video);
      }).finally(()=>this.pending.delete(video));
    }
    const matrix=ctx.getTransform(),logicalW=ctx.canvas.width/matrix.a,logicalH=ctx.canvas.height/matrix.d;
    const width=Math.max(logicalW,logicalH*video.videoWidth/video.videoHeight),height=width*video.videoHeight/video.videoWidth;
    ctx.save();ctx.globalAlpha*=this.alpha(frame,settled);
    ctx.drawImage(video,(320-width)/2,(224-height)/2,width,height);ctx.restore();
    return true;
  }
}
