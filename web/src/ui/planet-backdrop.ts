import { SpaceScene, type PlanetView } from '../gfx/space-scene.ts';
/** Camera follows ROM cues; a real sphere keeps rotating seamlessly into the menu. */
export class PlanetBackdrop {
  readonly scene=new SpaceScene();
  private firstFrame=-1;
  private frameCount=1;
  private seconds=0;
  private last=0;
  reset():void {this.seconds=0;this.last=0;this.firstFrame=-1;}
  pause():void {this.last=0;}
  begin(frame:number,frames:number):void {this.firstFrame=frame;this.frameCount=Math.max(1,frames-1);}
  draw(ctx:CanvasRenderingContext2D,frame:number,settled:boolean,view?:PlanetView):boolean {
    const now=performance.now();
    if(this.last)this.seconds+=Math.min(.1,(now-this.last)/1000);
    this.last=now;
    const progress=settled?1:this.firstFrame<0?0:Math.max(0,Math.min(1,(frame-this.firstFrame)/this.frameCount));
    return this.scene.draw(ctx,this.seconds,progress,undefined,undefined,view);
  }
}
