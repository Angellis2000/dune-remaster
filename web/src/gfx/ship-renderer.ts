/**
 * WebGL-рендер 3D-кораблей заставки (gfx/ship-models.ts): модель в любом ракурсе на прозрачный холст, дальше —
 * drawImage в кадр заставки. Плоское затенение по граням, тёплый ключевой свет «от солнца» и холодный
 * заполняющий, блик по блеску детали, контровая подсветка, свечение сопел и огней. Без внешних библиотек.
 *
 *   const r = new ShipRenderer();
 *   r.draw(ctx, model, { yaw: 0.6, pitch: -0.15, roll: 0.1 }, x, y, w, h);
 */
import type { ShipModel } from "./ship-models.ts";

export interface ShipPose {
  /** поворот вокруг вертикали, рад (0 — нос к зрителю справа налево не повёрнут: нос смотрит на +Z, в экран) */
  yaw: number;
  /** наклон носа вверх (+) / вниз (−), рад */
  pitch: number;
  /** крен, рад */
  roll: number;
  /** сила факела двигателей 0…1 (добавляет свечение соплам) */
  thrust?: number;
}

const VERTEX = `
attribute vec3 position;attribute vec3 normal;attribute vec3 color;attribute vec2 material;
uniform mat4 rotation;uniform mat4 projection;uniform float distance;
varying vec3 vNormal;varying vec3 vColor;varying vec2 vMaterial;varying vec3 vView;
void main(){
  vec4 p=rotation*vec4(position,1.);vec3 view=p.xyz-vec3(0.,0.,distance);
  vNormal=(rotation*vec4(normal,0.)).xyz;vColor=color;vMaterial=material;vView=view;
  gl_Position=projection*vec4(view,1.);
}`;
const FRAGMENT = `
precision mediump float;
varying vec3 vNormal;varying vec3 vColor;varying vec2 vMaterial;varying vec3 vView;
uniform float thrust;
void main(){
  vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
  vec3 v=normalize(-vView);
  vec3 key=normalize(vec3(-.55,.62,.55)),fill=normalize(vec3(.7,-.35,.4));
  float diffuse=max(dot(n,key),0.),back=max(dot(n,fill),0.);
  vec3 light=vec3(1.,.93,.8)*diffuse*1.05+vec3(.45,.6,.9)*back*.32+vec3(.16,.17,.2);
  float gloss=vMaterial.y,emissive=vMaterial.x;
  float spec=pow(max(dot(n,normalize(key+v)),0.),6.+gloss*90.)*(.15+gloss*.85);
  float rim=pow(1.-max(dot(n,v),0.),3.)*.35;
  vec3 c=vColor*light+vec3(1.,.95,.85)*spec+vec3(.55,.7,1.)*rim;
  float glow=clamp(emissive*(.75+.5*thrust),0.,1.4);
  c=mix(c,vColor*1.35+vec3(.15)*glow,clamp(glow,0.,1.));
  gl_FragColor=vec4(pow(c,vec3(1./1.1)),1.);
}`;

type Buffers = { buffer: WebGLBuffer; count: number; radius: number };

export class ShipRenderer {
  readonly canvas = document.createElement("canvas");
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private cache = new Map<ShipModel, Buffers>();

  constructor() {
    this.gl = this.canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (this.gl) this.program = this.link(this.gl);
  }

  /** Есть ли WebGL (иначе заставка остаётся на 2D-атласе). */
  get ready(): boolean {
    return !!this.gl && !!this.program;
  }

  private link(gl: WebGLRenderingContext): WebGLProgram | null {
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }

  /** Вершины модели: позиция, нормаль грани, цвет, [свечение, блеск] — 11 чисел на вершину. */
  private buffers(model: ShipModel): Buffers {
    const hit = this.cache.get(model);
    if (hit) return hit;
    const gl = this.gl!;
    const data: number[] = [];
    let radius = 0;
    for (const part of model.parts) {
      const p = part.positions;
      for (let i = 0; i < p.length; i += 9) {
        const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2];
        const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;
        for (let k = 0; k < 9; k += 3) {
          data.push(p[i + k], p[i + k + 1], p[i + k + 2], nx, ny, nz, ...part.color, part.emissive, part.gloss);
          radius = Math.max(radius, Math.hypot(p[i + k], p[i + k + 1], p[i + k + 2]));
        }
      }
    }
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    const b = { buffer, count: data.length / 11, radius };
    this.cache.set(model, b);
    return b;
  }

  /** Отрисовать модель на внутренний холст w×h (точек) и вернуть его. */
  render(model: ShipModel, pose: ShipPose, w: number, h: number): HTMLCanvasElement {
    const gl = this.gl, program = this.program;
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    if (!gl || !program) return this.canvas;
    const b = this.buffers(model);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 44, offset * 4);
    };
    attr("position", 3, 0); attr("normal", 3, 3); attr("color", 3, 6); attr("material", 2, 9);
    // поворот: крен (Z) → тангаж (X) → рыскание (Y)
    const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch), cr = Math.cos(pose.roll), sr = Math.sin(pose.roll);
    const rz = [cr, sr, 0, -sr, cr, 0, 0, 0, 1], rx = [1, 0, 0, 0, cp, sp, 0, -sp, cp], ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy];
    const mul = (a: number[], c: number[]) => { const o = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[j * 3 + i] += a[k * 3 + i] * c[j * 3 + k]; return o; };
    const r = mul(ry, mul(rx, rz));
    const rotation = new Float32Array([r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, 0, 0, 0, 1]);
    const fov = 0.5, aspect = w / h, f = 1 / Math.tan(fov / 2);
    const distance = (b.radius * 1.08) / Math.sin(fov / 2) / Math.min(1, aspect);
    const near = Math.max(0.1, distance - b.radius * 2), far = distance + b.radius * 2;
    const projection = new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "rotation"), false, rotation);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projection"), false, projection);
    gl.uniform1f(gl.getUniformLocation(program, "distance"), distance);
    gl.uniform1f(gl.getUniformLocation(program, "thrust"), pose.thrust ?? 1);
    gl.drawArrays(gl.TRIANGLES, 0, b.count);
    return this.canvas;
  }

  /** Отрисовать модель в прямоугольник 2D-холста. */
  draw(ctx: CanvasRenderingContext2D, model: ShipModel, pose: ShipPose, x: number, y: number, w: number, h: number): void {
    const scale = Math.min(2, window.devicePixelRatio || 1);
    ctx.drawImage(this.render(model, pose, w * scale, h * scale), x, y, w, h);
  }
}
