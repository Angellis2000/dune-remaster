import planetUrl from './assets/frontend/arrakis-albedo-v3.png?url';
import starsUrl from './assets/frontend/starfield-v3.png?url';
const TAU=Math.PI*2;
const ease=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
export const ORBIT_SECONDS=120;
export function spaceCamera(progress:number){const p=ease(progress);return {x:440-222*p,y:88+16*p,radius:3+72*p,opacity:ease(progress*3)};}
const VERTEX=`attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const FRAGMENT=`precision highp float;
varying vec2 uv;uniform sampler2D surface;uniform float angle,resolution,tintAmount;uniform vec3 tint;
const float PI=3.14159265359;
vec3 surfaceAt(vec2 t){
 t.x=fract(t.x);t.y=clamp(t.y,.002,.998);
 float seam=1.-smoothstep(0.,.065,min(t.x,1.-t.x));
 // At either longitude edge sample the same interior texel; derivatives also match.
 return mix(texture2D(surface,t).rgb,texture2D(surface,vec2(fract(t.x+.5),t.y)).rgb,seam);
}
void main(){
 vec2 q=(uv-.5)*2.2;float r=length(q),aa=2.2/resolution;
 vec3 light=normalize(vec3(-.65,.4,.8)),rimColor=mix(vec3(.15,.43,1.),tint,.45*tintAmount);
 if(r>1.){
  float d=r-1.,sun=clamp(dot(normalize(q),normalize(vec2(-.65,.4)))*.5+.5,0.,1.);
  vec3 haze=mix(rimColor,vec3(.72,.79,1.),sun*.35);
  float a=(exp(-d*60.)*.32+exp(-d*22.)*.08)*(.35+.65*sun)*(1.-smoothstep(1.07,1.1,r));
  gl_FragColor=vec4(haze,a);return;
 }
 vec3 n=vec3(q,sqrt(max(0.,1.-dot(q,q))));
 vec3 t=vec3(n.x,n.y*.951-n.z*.309,n.z*.951+n.y*.309);
 vec2 coord=vec2(atan(t.x,t.z)/(2.*PI)+.5+angle/(2.*PI),asin(clamp(t.y,-1.,1.))/PI+.5);
 vec3 albedo=surfaceAt(coord);float lum=dot(albedo,vec3(.2126,.7152,.0722));
 albedo=mix(albedo,tint*pow(max(lum,.01),.85)*1.4,tintAmount);
 float day=max(0.,dot(n,light));vec3 color=albedo*(.035+.965*pow(day,.85));
 color+=rimColor*pow(1.-n.z,4.)*(.1+.55*day);
 gl_FragColor=vec4(color,1.-smoothstep(1.-aa,1.,r));
}`;

/** One continuous scene; no encoded frames, media seeking or loop cut. */
export class SpaceScene {
 private canvas=document.createElement('canvas');
 private gl:WebGLRenderingContext|null=null;
 private program:WebGLProgram|null=null;
 private nebula=new Image();private ready=false;
 private stars=Array.from({length:110},(_,i)=>{
  const hash=(n:number)=>{let h=(n+0x9e3779b9)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return (h>>>0)/4294967296;};
  return {x:hash(i*7),y:hash(i*7+1),depth:.2+hash(i*7+2)*.8,size:.18+hash(i*7+3)*.3,phase:hash(i*7+4)*TAU,speed:.35+hash(i*7+5)*.85};
 });
 constructor(){
  this.nebula.src=starsUrl;
  const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false});
  if(!gl)return;this.gl=gl;
  try{
   const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Space shader');return s;};
   const program=gl.createProgram()!,v=compile(gl.VERTEX_SHADER,VERTEX),f=compile(gl.FRAGMENT_SHADER,FRAGMENT);
   gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Space program');
   this.program=program;gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
   const image=new Image();image.onload=()=>{
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.ready=true;
   };image.src=planetUrl;
  }catch(error){console.warn('Space scene unavailable',error);this.gl=null;}
 }
 draw(ctx:CanvasRenderingContext2D,time:number,progress:number,tint:readonly number[]=[1,1,1],tintAmount=0):boolean{
  const gl=this.gl,program=this.program;
  if(!gl||!program||gl.isContextLost()||!this.ready||!this.nebula.complete||!this.nebula.naturalWidth)return false;
  const m=ctx.getTransform(),w=ctx.canvas.width/m.a,h=ctx.canvas.height/m.d,left=(320-w)/2,top=(224-h)/2;
  const camera=spaceCamera(progress),p=ease(progress);ctx.save();ctx.imageSmoothingEnabled=true;
  ctx.fillStyle='#02050a';ctx.fillRect(left,top,w,h);
  const bw=Math.max(w,h*this.nebula.naturalWidth/this.nebula.naturalHeight)*1.16,bh=bw*this.nebula.naturalHeight/this.nebula.naturalWidth;
  ctx.drawImage(this.nebula,left+(w-bw)*(.5+Math.sin(time*.012)*.32+p*.1),top+(h-bh)*.5,bw,bh);
  for(const s of this.stars){
   const drift=time*(.15+s.depth*.3)+p*35*s.depth;
   const x=left+((s.x*(w+24)-drift)%(w+24)+(w+24))%(w+24)-12,y=top+s.y*h+Math.sin(time*.035+s.phase)*s.depth;
   const pulse=.65+.22*Math.sin(time*s.speed+s.phase)+.1*Math.sin(time*.23+s.phase*3),r=s.size*(.8+.2*pulse);
   ctx.globalAlpha=pulse;ctx.fillStyle=s.depth>.7?'#d9e9ff':'#b5c8e8';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
   if(s.depth>.86){ctx.globalAlpha=pulse*.22;ctx.fillRect(x-1.7*r,y-.15*r,3.4*r,.3*r);ctx.fillRect(x-.15*r,y-1.7*r,.3*r,3.4*r);}
  }
  ctx.globalAlpha=1;
  if(camera.opacity>0){
   const size=768;
   if(this.canvas.width!==size){this.canvas.width=this.canvas.height=size;gl.viewport(0,0,size,size);}
   gl.useProgram(program);gl.uniform1f(gl.getUniformLocation(program,'angle'),((time/ORBIT_SECONDS)%1)*TAU);
   gl.uniform1f(gl.getUniformLocation(program,'resolution'),size);gl.uniform3f(gl.getUniformLocation(program,'tint'),tint[0],tint[1],tint[2]);
   gl.uniform1f(gl.getUniformLocation(program,'tintAmount'),Math.max(0,Math.min(1,tintAmount)));gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
   ctx.globalAlpha=camera.opacity;const d=camera.radius*2.2;ctx.drawImage(this.canvas,camera.x-d/2,camera.y-d/2,d,d);
  }
  ctx.restore();return true;
 }
}
