/**
 * WebGL-рендер 3D-кораблей заставки (gfx/ship-models.ts): модель в любом ракурсе на прозрачный холст, дальше —
 * drawImage в кадр заставки. Без внешних библиотек.
 *
 * Освещение (владелец: «выглядят как мыло — проработай цвет, блики и тени»):
 *  - свет считается в линейном пространстве, на выходе плёночная кривая ACES и гамма 2.2 — насыщенный, контрастный цвет;
 *  - тени от «солнца»: карта теней (глубина в RGBA, 2048²) из положения ключевого света, мягкий край 3×3 —
 *    крылья, надстройки и гондолы отбрасывают тени на корпус;
 *  - блики Блинна — Фонга по блеску детали и отражение окружения с френелем: сверху тёмный космос, снизу тёплый
 *    отсвет Арракиса;
 *  - у каждой грани немного свой тон (панели обшивки), сопла и огни светятся.
 * Пламя двигателей — отдельный проход: из каждого сопла (model.nozzles) ядро, факел и ореол цвета дома, складываются
 * по яркости, прозрачнее к концу и краям, дрожат во времени, длина — от тяги.
 *
 *   const r = new ShipRenderer();
 *   r.draw(ctx, model, { yaw: 0.6, pitch: -0.15, roll: 0.1, thrust: 1, time: now / 1000 }, x, y, w, h);
 */
import type { ShipModel } from "./ship-models.ts";

export interface ShipPose {
  /** поворот вокруг вертикали, рад (0 — нос смотрит на зрителя, +Z в экран) */
  yaw: number;
  /** наклон носа вверх (+) / вниз (−), рад */
  pitch: number;
  /** крен, рад */
  roll: number;
  /** тяга 0…1: длина пламени и свечение сопел (0 — двигатели выключены) */
  thrust?: number;
  /** время, с — для дрожания пламени (по умолчанию часы страницы) */
  time?: number;
  /** приближение (1 — корабль целиком в кадре) */
  zoom?: number;
}

/** длина пламени в полуразмерах сопла при полной тяге (факел; ядро — 0,45 от него) */
const FLAME_LENGTH = 9;
const SHADOW_SIZE = 2048;
/** ключевой свет («солнце») и заполняющий — в пространстве камеры */
const KEY = norm([-0.55, 0.62, 0.55]);

function norm(v: number[]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

const COMMON = `
uniform mat4 rotation;uniform mat4 projection;uniform float distance,radius;
uniform vec3 lightRight,lightUp,lightDir;
vec3 toLight(vec3 p){return vec3(dot(p,lightRight),dot(p,lightUp),dot(p,lightDir))/radius;}`;

const DEPTH_VERTEX = `
attribute vec3 position;${COMMON}
varying float vDepth;
void main(){vec3 l=toLight((rotation*vec4(position,1.)).xyz);vDepth=l.z*.5+.5;gl_Position=vec4(l.xy,l.z,1.);}`;
const DEPTH_FRAGMENT = `
precision highp float;varying float vDepth;
void main(){vec4 e=vec4(1.,255.,65025.,16581375.)*vDepth;e=fract(e);e-=e.yzww*vec4(1./255.,1./255.,1./255.,0.);gl_FragColor=e;}`;

const VERTEX = `
attribute vec3 position;attribute vec3 normal;attribute vec3 color;attribute vec3 material;attribute vec2 uv;${COMMON}
varying vec3 vNormal;varying vec3 vColor;varying vec3 vMaterial;varying vec3 vView;varying vec3 vLight;varying vec2 vUV;
void main(){
  vec4 p=rotation*vec4(position,1.);vec3 view=p.xyz-vec3(0.,0.,distance);
  vNormal=(rotation*vec4(normal,0.)).xyz;vColor=color;vMaterial=material;vView=view;vLight=toLight(p.xyz);vUV=uv;
  gl_Position=projection*vec4(view,1.);
}`;
const FRAGMENT = `
precision highp float;
varying vec3 vNormal;varying vec3 vColor;varying vec3 vMaterial;varying vec3 vView;varying vec3 vLight;varying vec2 vUV;
uniform mediump float thrust;uniform sampler2D shadowMap;uniform sampler2D albedo;uniform vec3 key;uniform float texel;
uniform vec3 paint;uniform float repaint;
vec3 hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x);}
vec3 rgb(vec3 c){vec3 p=abs(fract(c.xxx+vec3(1.,2./3.,1./3.))*6.-3.);return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y);}
/** текстура пака: насыщенная «краска» получает оттенок дома (paint), металл и тёмные детали — как есть */
vec3 texColor(){
  vec3 c=texture2D(albedo,vUV).rgb;
  if(repaint<.5)return c;
  vec3 h=hsv(c),ph=hsv(paint);
  float k=smoothstep(.18,.38,h.y)*smoothstep(.08,.2,h.z);
  vec3 painted=rgb(vec3(ph.x,clamp(h.y*.55+ph.y*.6,0.,1.),h.z*mix(1.,ph.z*1.25,.5)));
  // светлая неокрашенная обшивка (белые и светло-серые панели) — темнее, в тон кораблю (просьба владельца)
  float light=smoothstep(.3,.85,h.z)*(1.-k);
  c*=mix(1.,.42,light);
  return mix(c,painted,k);
}
float unpack(vec4 c){return dot(c,vec4(1.,1./255.,1./65025.,1./16581375.));}
float lit(vec3 l,float bias){
  vec2 uv=l.xy*.5+.5;float d=l.z*.5+.5-bias,s=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)s+=d>unpack(texture2D(shadowMap,uv+vec2(float(x),float(y))*texel))?0.:1.;
  return s/9.;
}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
  vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
  vec3 v=normalize(-vView);
  float emissive=vMaterial.x,gloss=vMaterial.y,panel=vMaterial.z;
  vec3 surface=vUV.x>=0.?texColor():vColor;
  vec3 base=pow(surface,vec3(2.2))*(vUV.x>=0.?1.:.86+.28*panel);
  float nl=dot(n,key);
  float shadow=nl>0.?lit(vLight,.004+.01*(1.-nl)):0.;
  vec3 sun=vec3(1.,.9,.74)*3.1,sky=vec3(.05,.08,.16),sand=vec3(.34,.17,.06);
  float up=n.y*.5+.5;
  vec3 ambient=mix(sand*.55,sky*1.4,up)+vec3(.012);
  vec3 diffuse=base*(sun*max(nl,0.)*shadow+ambient);
  // ободок «от планеты» снизу-справа: тёплый отсвет на теневой стороне
  diffuse+=base*sand*.9*pow(max(dot(n,normalize(vec3(.6,-.7,.2))),0.),2.);
  vec3 h=normalize(key+v);
  float spec=pow(max(dot(n,h),0.),12.+gloss*220.)*(.04+gloss*1.6)*shadow*(nl>0.?1.:0.);
  float fres=pow(1.-max(dot(n,v),0.),5.)*(.04+.6*gloss)+.04*gloss;
  vec3 r=reflect(-v,n);
  vec3 env=mix(sand*.8,sky*.6,smoothstep(-.35,.45,r.y))+vec3(1.,.85,.6)*.6*pow(max(dot(r,key),0.),24.)*gloss;
  vec3 c=diffuse+sun*spec*.35+env*fres;
  float glow=clamp(emissive*(.55+.6*thrust),0.,1.4);
  c=mix(c,pow(surface,vec3(2.2))*(1.6+2.4*glow),clamp(glow,0.,1.));
  c=aces(c*1.15);
  gl_FragColor=vec4(pow(c,vec3(1./2.2)),1.);
}`;
// пламя: center — срез сопла, ring — (cos, sin) угла по сечению, t — 0 в глубине сопла … 1 у конца,
// dims — [полуширина, полувысота, квадратность 0…1], info — [фаза, слой: 0 — факел, 1 — ядро, 2 — светящееся дно сопла]
const FLAME_VERTEX = `
attribute vec3 center;attribute vec2 ring;attribute float t;attribute vec3 dims;attribute vec2 info;attribute vec3 color;
uniform mat4 rotation;uniform mat4 projection;uniform float distance,time;uniform mediump float thrust;
varying float vT;varying float vLayer;varying vec3 vColor;varying float vFacing;varying float vPhase;varying float vAxial;varying float vRim;
void main(){
  float hw=dims.x,hh=dims.y,square=dims.z,phase=info.x,layer=info.y,r=min(hw,hh);
  float flick=.86+.08*sin(time*23.+phase)+.05*sin(time*57.+phase*2.3)+.04*sin(time*91.+phase*4.1);
  float core=step(.5,layer);
  float len=sqrt(hw*hh)*${FLAME_LENGTH.toFixed(1)}*thrust*flick*mix(1.,.45,core);
  // сечение — суперэллипс: у прямоугольного сопла прямоугольное, к концу струи округляется
  float n=mix(mix(2.,12.,square),2.,smoothstep(.12,.75,t));
  vec2 c=sign(ring)*pow(abs(ring),vec2(2./n));
  float body=(1.-pow(t,mix(1.5,.95,core)))*(1.+.06*sin(t*3.14159));
  float wobble=1.+.06*sin(time*41.+phase+t*13.);
  vec2 xy=c*vec2(hw,hh)*body*wobble*mix(.97,.55,core);
  // основание — в глубине сопла: корпус его закрывает, пламя выходит из среза
  float inset=r*.9+.12;
  vec3 local=center+vec3(xy,inset-t*(len+inset));
  // слой 2 — светящееся дно сопла (веер из центра): в глубине, по форме среза
  if(layer>1.5){local=center+vec3(c*vec2(hw,hh)*.98,inset*.55);}
  vRim=length(c);
  vAxial=abs(dot(normalize((rotation*vec4(0.,0.,1.,0.)).xyz),normalize(-(rotation*vec4(local,1.)).xyz+vec3(0.,0.,distance))));
  vec4 p=rotation*vec4(local,1.);vec3 view=p.xyz-vec3(0.,0.,distance);
  vec3 side=(rotation*vec4(normalize(c+1e-5),0.,0.)).xyz;
  vFacing=1.-abs(dot(normalize(side),normalize(-view)));
  vT=t;vLayer=layer;vColor=color;vPhase=phase;
  gl_Position=projection*vec4(view,1.);
}`;
const FLAME_FRAGMENT = `
precision mediump float;
varying float vT;varying float vLayer;varying vec3 vColor;varying float vFacing;varying float vPhase;varying float vAxial;varying float vRim;
uniform float thrust;uniform highp float time;
void main(){
  float edge=pow(vFacing,1.3);
  // ударные кольца вдоль струи
  float bands=1.+.18*sin(vT*42.-time*34.+vPhase)*(1.-vT);
  vec3 c;float a;
  if(vLayer>1.5){
    // дно сопла: горячий белый центр, к краю — цвет дома
    float k=clamp(vRim,0.,1.);
    gl_FragColor=vec4(mix(vec3(1.,1.,.96),vColor*1.2,smoothstep(.15,1.,k)),(1.-k*k*.55)*.95*clamp(thrust*1.4,0.,1.));
    return;
  }
  if(vLayer>.5){c=mix(vec3(1.,1.,.97),vColor*1.25+.25,smoothstep(.05,.85,vT));a=pow(1.-vT,1.15)*(.45+.55*edge);}
  else{c=mix(vColor*1.5+.18,vColor*.85,vT);a=pow(1.-vT,1.55)*.62*(.3+.7*edge)*bands;}
  a*=smoothstep(.0,.12,vT+.04);
  // вдоль оси (вид с кормы) стенки струи прозрачнее — видно светящееся дно, а не сплошную плашку
  a*=1.-.8*pow(vAxial,3.);
  gl_FragColor=vec4(c,a*clamp(thrust*1.4,0.,1.));
}`;

// огни: точка с ореолом; kind — 0 ровный, 1 маячок (пульсирует), 2 стробоскоп (двойная вспышка)
const LIGHT_VERTEX = `
attribute vec3 position;attribute vec3 color;attribute vec2 info;
uniform mat4 rotation;uniform mat4 projection;uniform float distance,pixels;uniform highp float time;
varying vec3 vColor;varying float vBright;
void main(){
  vec4 p=rotation*vec4(position,1.);vec3 view=p.xyz-vec3(0.,0.,distance);
  float kind=info.x,phase=info.y,b;
  if(kind<.5)b=.82+.18*sin(time*2.+phase);
  else if(kind<1.5)b=.12+.88*pow(.5+.5*sin(time*3.6+phase),3.);
  else{float f=fract(time*.8+phase);b=step(f,.045)+step(.11,f)*step(f,.155);}
  vBright=b;vColor=color;
  gl_Position=projection*vec4(view,1.);
  gl_PointSize=max(4.,2.6*pixels/max(.1,-view.z)*(.5+.5*b));
}`;
const LIGHT_FRAGMENT = `
precision mediump float;
varying vec3 vColor;varying float vBright;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  if(d>1.)discard;
  float core=smoothstep(.2,0.,d),glow=exp(-d*d*7.)*.7+exp(-d*d*2.)*.15;
  vec3 c=mix(vColor*1.4+.1,vec3(1.),core*.8);
  gl_FragColor=vec4(c,(core+glow)*vBright);
}`;

type Buffers = { body: WebGLBuffer; bodyCount: number; flame: WebGLBuffer; flameCount: number; lights: WebGLBuffer; lightCount: number; radius: number; texture: WebGLTexture | null };

export class ShipRenderer {
  readonly canvas = document.createElement("canvas");
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private depthProgram: WebGLProgram | null = null;
  private flameProgram: WebGLProgram | null = null;
  private lightProgram: WebGLProgram | null = null;
  private shadowTexture: WebGLTexture | null = null;
  private shadowFrame: WebGLFramebuffer | null = null;
  private cache = new Map<ShipModel, Buffers>();

  constructor() {
    this.gl = this.canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    const gl = this.gl;
    if (!gl) return;
    this.program = this.link(gl, VERTEX, FRAGMENT);
    this.depthProgram = this.link(gl, DEPTH_VERTEX, DEPTH_FRAGMENT);
    this.flameProgram = this.link(gl, FLAME_VERTEX, FLAME_FRAGMENT);
    this.lightProgram = this.link(gl, LIGHT_VERTEX, LIGHT_FRAGMENT);
    // карта теней: глубина, упакованная в RGBA
    this.shadowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOW_SIZE, SHADOW_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOW_SIZE, SHADOW_SIZE);
    this.shadowFrame = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFrame);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Есть ли WebGL (иначе заставка остаётся на 2D-атласе). */
  get ready(): boolean {
    return !!this.gl && !!this.program && !!this.depthProgram && !!this.flameProgram;
  }

  private link(gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram | null {
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
    return p;
  }

  /** Вершины корпуса (позиция, нормаль грани, цвет, [свечение, блеск, тон панели], UV — 14 чисел) и пламени (12 чисел). */
  private buffers(model: ShipModel): Buffers {
    const hit = this.cache.get(model);
    if (hit) return hit;
    const gl = this.gl!;
    const body: number[] = [];
    let radius = 0, seed = 0x9e3779b9;
    const random = () => { seed = Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) >>> 0; seed = (seed ^ (seed >>> 12)) >>> 0; return (seed & 0xffff) / 0xffff; };
    const face = (p: ArrayLike<number>, i: number, color: number[], emissive: number, gloss: number, uv: ArrayLike<number> | null) => {
      const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2];
      const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const panel = random();
      for (let k = 0; k < 9; k += 3) {
        const j = (i + k) / 3;
        body.push(p[i + k], p[i + k + 1], p[i + k + 2], nx, ny, nz, ...color, emissive, gloss, panel, uv ? uv[j * 2] : -1, uv ? uv[j * 2 + 1] : -1);
        radius = Math.max(radius, Math.hypot(p[i + k], p[i + k + 1], p[i + k + 2]));
      }
    };
    if (model.mesh) for (let i = 0; i < model.mesh.positions.length; i += 9) face(model.mesh.positions, i, [1, 1, 1], 0, 0.55, model.mesh.uvs);
    for (const part of model.parts) {
      const p = part.positions;
      for (let i = 0; i < p.length; i += 9) {
        face(p, i, part.color, part.emissive, part.gloss, null);
      }
    }
    // струи пламени: 20 точек по сечению × 10 колец по длине, два слоя (факел, ядро); 14 чисел на вершину
    const flame: number[] = [];
    const SEG = 20, RINGS = 10;
    model.nozzles.forEach((n, ni) => {
      const phase = ni * 1.7 + 0.3;
      const [hw, hh] = n.size ?? [n.radius, n.radius];
      // дно сопла: веер «центр — край среза»
      for (let i = 0; i < SEG; i++) {
        const rim = (j: number) => { const a = (j / SEG) * Math.PI * 2 + Math.PI / SEG; return [Math.cos(a), Math.sin(a)]; };
        for (const [cx, cy] of [[0, 0], rim(i), rim(i + 1)]) flame.push(n.at[0], n.at[1], n.at[2], cx, cy, 0, hw, hh, n.square ?? 0, phase, 2, ...n.color);
      }
      for (const layer of [0, 1]) {
        const vert = (i: number, k: number) => {
          const a = (i / SEG) * Math.PI * 2 + Math.PI / SEG;
          flame.push(n.at[0], n.at[1], n.at[2], Math.cos(a), Math.sin(a), k / RINGS, hw, hh, n.square ?? 0, phase, layer, ...n.color);
        };
        for (let k = 0; k < RINGS; k++) {
          for (let i = 0; i < SEG; i++) {
            vert(i, k); vert(i + 1, k); vert(i + 1, k + 1);
            vert(i, k); vert(i + 1, k + 1); vert(i, k + 1);
          }
        }
      }
      // пламя может выходить за кадр: в рамку берём только его начало
      radius = Math.max(radius, Math.hypot(n.at[0], n.at[1], n.at[2] - Math.sqrt(hw * hh) * FLAME_LENGTH * 0.3));
    });
    const bodyBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, bodyBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(body), gl.STATIC_DRAW);
    const flameBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, flameBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flame), gl.STATIC_DRAW);
    let texture: WebGLTexture | null = null;
    if (model.mesh) {
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, model.mesh.texture);
      const pot = (n: number) => (n & (n - 1)) === 0;
      const img = model.mesh.texture as { width: number; height: number };
      if (pot(img.width) && pot(img.height)) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
      else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    const lightData: number[] = [];
    for (const l of model.lights ?? []) lightData.push(...l.at, ...l.color, l.kind === "steady" ? 0 : l.kind === "beacon" ? 1 : 2, l.phase);
    const lightBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, lightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lightData.length ? lightData : [0]), gl.STATIC_DRAW);
    const b = { body: bodyBuffer, bodyCount: body.length / 14, flame: flameBuffer, flameCount: flame.length / 14, lights: lightBuffer, lightCount: lightData.length / 8, radius, texture };
    this.cache.set(model, b);
    return b;
  }

  /** Отрисовать модель на внутренний холст w×h (точек) и вернуть его. */
  render(model: ShipModel, pose: ShipPose, w: number, h: number): HTMLCanvasElement {
    const gl = this.gl, program = this.program, depthProgram = this.depthProgram, flameProgram = this.flameProgram;
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    if (!gl || !program || !depthProgram || !flameProgram) return this.canvas;
    const b = this.buffers(model);
    const thrust = Math.max(0, Math.min(1, pose.thrust ?? 1));
    const time = pose.time ?? performance.now() / 1000;
    // поворот: крен (Z) → тангаж (X) → рыскание (Y)
    const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch), cr = Math.cos(pose.roll), sr = Math.sin(pose.roll);
    const rz = [cr, sr, 0, -sr, cr, 0, 0, 0, 1], rx = [1, 0, 0, 0, cp, sp, 0, -sp, cp], ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy];
    const mul = (a: number[], c: number[]) => { const o = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[j * 3 + i] += a[k * 3 + i] * c[j * 3 + k]; return o; };
    const r = mul(ry, mul(rx, rz));
    const rotation = new Float32Array([r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, 0, 0, 0, 1]);
    const fov = 0.5, aspect = w / h, f = 1 / Math.tan(fov / 2);
    const distance = (b.radius * 1.02) / Math.sin(fov / 2) / Math.min(1, aspect) / Math.max(0.2, pose.zoom ?? 1);
    const near = Math.max(0.05, distance - b.radius * 2.5), far = distance + b.radius * 3;
    const projection = new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
    // базис света: смотрит вдоль −KEY (dir — к свету: больше — ближе к солнцу, глубина карты обратная)
    const dir = [-KEY[0], -KEY[1], -KEY[2]];
    const upGuess = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const right = norm([upGuess[1] * dir[2] - upGuess[2] * dir[1], upGuess[2] * dir[0] - upGuess[0] * dir[2], upGuess[0] * dir[1] - upGuess[1] * dir[0]]);
    const up = [dir[1] * right[2] - dir[2] * right[1], dir[2] * right[0] - dir[0] * right[2], dir[0] * right[1] - dir[1] * right[0]];
    const shadowRadius = b.radius * 1.02;
    const uniforms = (prog: WebGLProgram) => {
      const u = (n: string) => gl.getUniformLocation(prog, n);
      gl.uniformMatrix4fv(u("rotation"), false, rotation);
      gl.uniformMatrix4fv(u("projection"), false, projection);
      gl.uniform1f(u("distance"), distance);
      gl.uniform1f(u("radius"), shadowRadius);
      gl.uniform1f(u("thrust"), thrust);
      gl.uniform1f(u("time"), time);
      gl.uniform3fv(u("lightRight"), right);
      gl.uniform3fv(u("lightUp"), up);
      gl.uniform3fv(u("lightDir"), dir);
      gl.uniform3fv(u("key"), KEY);
      gl.uniform1f(u("texel"), 1 / SHADOW_SIZE);
      gl.uniform1f(u("pixels"), (h / 2) * f);
    };
    const attrs = (prog: WebGLProgram, stride: number, list: [string, number][]) => {
      let offset = 0;
      for (const [name, size] of list) {
        const loc = gl.getAttribLocation(prog, name);
        if (loc >= 0) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, offset * 4); }
        offset += size;
      }
    };
    const off = (prog: WebGLProgram, names: string[]) => { for (const n of names) { const loc = gl.getAttribLocation(prog, n); if (loc >= 0) gl.disableVertexAttribArray(loc); } };
    const BODY: [string, number][] = [["position", 3], ["normal", 3], ["color", 3], ["material", 3], ["uv", 2]];

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    // 1) карта теней
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFrame);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(depthProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.body);
    attrs(depthProgram, 14, BODY);
    uniforms(depthProgram);
    gl.drawArrays(gl.TRIANGLES, 0, b.bodyCount);
    off(depthProgram, ["position"]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // 2) корпус
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
    gl.uniform1i(gl.getUniformLocation(program, "shadowMap"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, b.texture ?? this.shadowTexture);
    gl.uniform1i(gl.getUniformLocation(program, "albedo"), 1);
    gl.uniform3fv(gl.getUniformLocation(program, "paint"), model.mesh?.paint ?? [1, 1, 1]);
    gl.uniform1f(gl.getUniformLocation(program, "repaint"), model.mesh?.paint ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.body);
    attrs(program, 14, BODY);
    uniforms(program);
    gl.drawArrays(gl.TRIANGLES, 0, b.bodyCount);
    off(program, ["position", "normal", "color", "material", "uv"]);
    // 3) пламя: по яркости поверх, корпус его загораживает (тест глубины), само в глубину не пишет
    if (thrust > 0.01 && b.flameCount) {
      gl.useProgram(flameProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.flame);
      attrs(flameProgram, 14, [["center", 3], ["ring", 2], ["t", 1], ["dims", 3], ["info", 2], ["color", 3]]);
      uniforms(flameProgram);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
      gl.depthMask(false);
      gl.drawArrays(gl.TRIANGLES, 0, b.flameCount);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      off(flameProgram, ["center", "ring", "t", "dims", "info", "color"]);
    }
    // 4) мигающие огни: поверх по яркости, корпус загораживает
    const lightProgram = this.lightProgram;
    if (lightProgram && b.lightCount) {
      gl.useProgram(lightProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.lights);
      attrs(lightProgram, 8, [["position", 3], ["color", 3], ["info", 2]]);
      uniforms(lightProgram);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
      gl.depthMask(false);
      gl.drawArrays(gl.POINTS, 0, b.lightCount);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      off(lightProgram, ["position", "color", "info"]);
    }
    return this.canvas;
  }

  /** Отрисовать модель в прямоугольник 2D-холста. */
  draw(ctx: CanvasRenderingContext2D, model: ShipModel, pose: ShipPose, x: number, y: number, w: number, h: number): void {
    const scale = Math.min(2, window.devicePixelRatio || 1);
    ctx.drawImage(this.render(model, pose, w * scale, h * scale), x, y, w, h);
  }
}
