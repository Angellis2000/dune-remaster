import particlesUrl from './assets/vehicles-hd/particles.png?url';
import {loadSpriteCells} from './vehicle-art.ts';
import {makeImpact,particlePosition,type Particle,type Surface} from './impact-model.ts';

export class ImpactParticles {
  private particles:Particle[]=[];
  private constructor(private cells:HTMLCanvasElement[]) {}
  static async load():Promise<ImpactParticles|null> {
    try{return new ImpactParticles(await loadSpriteCells(particlesUrl));}
    catch(error){console.warn('HD particles unavailable:',error);return null;}
  }
  reset():void {this.particles=[];}
  burst(x:number,y:number,type:number,surface:Surface,tick:number):void {
    this.particles=this.particles.filter(p=>tick-p.born<p.life*60);
    this.particles.push(...makeImpact(x,y,type,surface,tick));
    if(this.particles.length>650)this.particles.splice(0,this.particles.length-650);
  }
  /** Ground rings below units; dust, debris and their small shadows above ground units. */
  draw(ctx:CanvasRenderingContext2D,tick:number,layer:'ground'|'air',isVisible:(x:number,y:number)=>boolean):void {
    this.particles=this.particles.filter(p=>tick>=p.born&&tick-p.born<p.life*60);
    ctx.save();ctx.imageSmoothingEnabled=true;
    for(const p of this.particles){
      if((layer==='ground')!==p.ring)continue;
      const t=(tick-p.born)/60,q=t/p.life;
      const pos=particlePosition(p,t);
      // Check both event origin and moving debris: dust must never reveal hidden cells.
      if(!isVisible(p.x,p.y)||!isVisible(pos.x,pos.y))continue;
      const size=p.size*(p.dust?1+t*1.8:1);
      if(!p.dust&&p.frame<12&&pos.height>1){
        ctx.globalAlpha=.2*(1-q);ctx.fillStyle='#302719';ctx.beginPath();
        ctx.ellipse(pos.x+1,pos.y+1,p.size*.45,p.size*.22,0,0,Math.PI*2);ctx.fill();
      }
      ctx.save();ctx.translate(pos.x,pos.y-pos.height);
      ctx.rotate(p.angle+p.spin*t);
      ctx.globalAlpha=p.dust?(p.ring?.22:.42)*Math.min(1,t*18)*Math.pow(1-q,1.5):Math.min(1,(1-q)*4);
      const image=this.cells[p.frame];
      const height=size*(p.ring?.55:image.height/image.width);
      ctx.drawImage(image,-size/2,-height/2,size,height);
      ctx.restore();
    }
    ctx.restore();
  }
}
