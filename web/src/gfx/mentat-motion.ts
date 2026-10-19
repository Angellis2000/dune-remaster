/** Muted alpha-video portrait; the game's existing voice remains the only dialogue audio. */
export class MentatMotion {
  private video:HTMLVideoElement|null=null;
  private poster:ImageBitmap|null=null;
  private prepared=false;
  private failed=false;
  private blocked=false;
  private wanted=false;
  private pending=false;
  private played=false;

  constructor(private house:'harkonnen'|'atreides'|'ordos'='harkonnen'){}

  prepare():void{
    if(this.prepared)return;
    this.prepared=true;
    const video=document.createElement('video');
    if(typeof video.play!=='function')return;
    const base=import.meta.env?.BASE_URL??'/';
    const prefix=base.endsWith('/')?base:base+'/';
    video.src=prefix+`video/mentat-${this.house}-alpha.webm`;
    video.muted=true;video.defaultMuted=true;video.volume=0;
    video.loop=true;video.playsInline=true;video.preload='auto';video.disablePictureInPicture=true;
    video.setAttribute('muted','');video.setAttribute('playsinline','');
    video.addEventListener('error',()=>{this.failed=true;});
    this.video=video;
    void fetch(prefix+`video/mentat-${this.house}-idle.png`).then(response=>{
      if(!response.ok)throw Error('Mentat poster HTTP '+response.status);
      return response.blob();
    }).then(blob=>createImageBitmap(blob)).then(image=>{this.poster=image;}).catch(error=>{
      console.warn('Video portrait unavailable; retaining the illustrated mentat.',error);
    });
  }

  stop():void{
    this.wanted=false;this.played=false;this.blocked=false;this.video?.pause();
    if(this.video&&this.video.readyState>=1)this.video.currentTime=0;
  }

  draw(ctx:CanvasRenderingContext2D,offset:number,speaking:boolean):boolean{
    this.prepare();
    const video=this.video;
    if(speaking!==this.wanted){
      this.wanted=speaking;
      if(speaking)this.blocked=false;
      if(!speaking)video?.pause();
    }
    if(speaking&&video&&!this.failed&&!this.blocked&&video.paused&&!this.pending){
      this.pending=true;
      void video.play().then(()=>{this.pending=false;this.played=true;if(!this.wanted)video.pause();})
        .catch(()=>{this.pending=false;this.blocked=this.wanted;});
    }
    const ready=!!video&&video.readyState>=2&&!video.seeking&&!this.failed;
    const w=180,h=w*384/512,y=224-h,x=offset-10;
    ctx.save();ctx.imageSmoothingEnabled=true;
    // Keep the actual last pose during pauses; mixing a fixed poster with a moving
    // face produced doubled eyes/hands and snapped back to a different head position.
    if(ready&&this.played)ctx.drawImage(video,x,y,w,h);
    else if(this.poster)ctx.drawImage(this.poster,x,y,w,h);
    ctx.restore();
    return !!this.poster||(ready&&this.played);
  }
}
