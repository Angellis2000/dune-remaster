/** One continuous world-space surface. The original ROM alone defines its contours.
 * Spice is an independent mask; harvesting uploads only the changed cells.
 */
import materialUrl from './assets/map-hd/materials.png?url';
import detailUrl from './assets/map-hd/ground-detail.png?url';
import type { IconSet } from './icons.ts';
import type { DuneRom } from '../rom/dune.ts';
import { terrainMask, type TerrainMask } from './terrain-masks.ts';

interface MapState {
  index: number;
  ground: Uint16Array;
  bounds: { x: number; y: number; w: number; h: number };
}
const SIZE = 64 * 32;
const VERTEX = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0., 1.); }`;
const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D materials, land, spice, detail;
uniform vec2 camera, viewport;
uniform float scale, detailAmount;
uniform int layer;
uniform vec4 bounds;
out vec4 color;
vec4 smoothMask(sampler2D tex, vec2 uv, float radius) {
  vec2 d = vec2(radius / 2048.);
  return texture(tex, uv) * .2 +
    (texture(tex, uv + vec2(d.x, 0.)) + texture(tex, uv - vec2(d.x, 0.)) +
     texture(tex, uv + vec2(0., d.y)) + texture(tex, uv - vec2(0., d.y))) * .12 +
    (texture(tex, uv + d) + texture(tex, uv - d) +
     texture(tex, uv + vec2(d.x, -d.y)) + texture(tex, uv + vec2(-d.x, d.y))) * .08;
}
vec3 sampleMaterial(vec2 local, vec2 offset, vec2 quadrant, vec2 dx, vec2 dy) {
  // Sample only inside an authored patch: no repeated or mirrored texture edges.
  vec2 uv = local * .38 + .5 + offset * .10;
  return textureGrad(materials, quadrant * .5 + uv * .5,
    dx * .19, dy * .19).rgb;
}
vec2 phase(vec2 cell) {
  return fract(sin(vec2(dot(cell,vec2(127.1,311.7)), dot(cell,vec2(269.5,183.3)))) * 43758.5453) * 2. - 1.;
}
vec3 material(vec2 world, vec2 quadrant) {
  vec2 p = world / 125., cell = floor(p), f = fract(p);
  // Derivatives must use continuous world coordinates, not fract() at patch boundaries.
  vec2 dx = dFdx(p), dy = dFdy(p);
  vec2 w = f * f * (3. - 2. * f);
  // Blend four independent texture phases in world space, never repeat one cell-sized picture.
  return mix(mix(sampleMaterial(f, phase(cell), quadrant, dx, dy),
                 sampleMaterial(f - vec2(1.,0.), phase(cell + vec2(1.,0.)), quadrant, dx, dy), w.x),
             mix(sampleMaterial(f - vec2(0.,1.), phase(cell + vec2(0.,1.)), quadrant, dx, dy),
                 sampleMaterial(f - vec2(1.,1.), phase(cell + vec2(1.,1.)), quadrant, dx, dy), w.x), w.y);
}
vec3 detailSample(vec2 local, vec2 offset, float rock, vec2 dx, vec2 dy) {
  vec2 uv = local * .38 + .5 + offset * .10;
  return textureGrad(detail, vec2((rock + uv.x) * .5, uv.y),
    dx * vec2(.19,.38), dy * vec2(.19,.38)).rgb;
}
vec3 groundDetail(vec2 world, float rock) {
  // A separate full-resolution close-up sample: over seven source texels per world pixel.
  vec2 p=world/58.,cell=floor(p),f=fract(p),dx=dFdx(p),dy=dFdy(p);
  vec2 w=f*f*(3.-2.*f);
  vec3 a=detailSample(f,phase(cell),rock,dx,dy);
  vec3 b=detailSample(f-vec2(1.,0.),phase(cell+vec2(1.,0.)),rock,dx,dy);
  vec3 c=detailSample(f-vec2(0.,1.),phase(cell+vec2(0.,1.)),rock,dx,dy);
  vec3 d=detailSample(f-vec2(1.,1.),phase(cell+vec2(1.,1.)),rock,dx,dy);
  // Narrow smooth transitions keep individual cracks and grains from being averaged away.
  vec4 weights=pow(vec4((1.-w.x)*(1.-w.y),w.x*(1.-w.y),(1.-w.x)*w.y,w.x*w.y),vec4(3.));
  weights/=dot(weights,vec4(1.));
  return a*weights.x+b*weights.y+c*weights.z+d*weights.w;
}
void main() {
  vec2 world = camera + vec2(gl_FragCoord.x, viewport.y - gl_FragCoord.y) / scale;
  if (any(lessThan(world, bounds.xy)) || any(greaterThanEqual(world, bounds.xy + bounds.zw))) {
    color = vec4(0., 0., 0., layer == 2 ? 0. : 1.); return;
  }
  vec2 uv = world / 2048.;
  vec4 mask = smoothMask(land, uv, 1.4);
  float rock = smoothstep(.26, .64, mask.r);
  vec3 base = mix(material(world, vec2(0.,0.)), material(world, vec2(1.,0.)), rock);
  vec3 detailed = mix(groundDetail(world,0.),groundDetail(world,1.),rock);
  base = mix(base,detailed,detailAmount*.9);
  // Original dune and mountain relief, gently filtered; no generated tile shapes.
  vec2 wind = vec2(sin(world.y * .022), cos(world.x * .017)) * .8 / 2048.;
  vec4 relief = smoothMask(land, uv + wind, 2.6);
  float duneVariation = .87 + .13 * sin(world.x * .006 + world.y * .008);
  float shade = 1. + (relief.g - .502) * 1.65 * duneVariation + (relief.b - .502) * 1.25;
  shade += clamp((dFdx(rock) - dFdy(rock)) * scale * .6, -.17, .12);
  base *= clamp(shade, .53, 1.32);
  // Recover the authored crater mouths and rims, which a single brightness field flattened.
  float pit=smoothMask(land,uv,.8).a;
  vec2 stepUV=vec2(.9/2048.,0.);
  vec2 slope=vec2(texture(land,uv+stepUV).a-texture(land,uv-stepUV).a,
    texture(land,uv+stepUV.yx).a-texture(land,uv-stepUV.yx).a);
  float rim=clamp(length(slope)*2.1,0.,1.);
  base *= mix(1.,.14,pow(pit,1.15))*(1.+rim*.32);
  vec4 mineral = smoothMask(spice, uv, 3.4);
  float coverage = smoothstep(.025, .27, mineral.r);
  float dense = smoothstep(.08, .65, mineral.g);
  vec3 dust = mix(material(world, vec2(0.,1.)), material(world, vec2(1.,1.)), dense);
  vec3 mineralGrain = mix(groundDetail(world,0.),groundDetail(world,1.),.35);
  float grain = dot(mineralGrain,vec3(.299,.587,.114));
  vec3 mineralColor = dust / max(.08,dot(dust,vec3(.299,.587,.114)));
  dust = mix(dust,mineralColor*grain,detailAmount*.92);
  // Broad, continuous tonal changes break repetition without a cell boundary or flicker.
  float lighting = 1. + .025 * sin(world.x * .017 + sin(world.y * .011)) * cos(world.y * .019);
  base *= lighting; dust *= lighting;
  float alpha = coverage * (1. - rock);
  if (layer == 1) color = vec4(base, 1.);
  else if (layer == 2) color = vec4(dust, alpha);
  else color = vec4(mix(base, dust, alpha), 1.);
}`;

export class ContinuousTerrain {
  readonly canvas = document.createElement('canvas');
  readonly kinds: Uint8Array;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniforms = new Map<string, WebGLUniformLocation>();
  private textures: WebGLTexture[] = [];
  private masks = new Map<number, TerrainMask>();
  private previous = new Uint16Array(4096).fill(0xffff);
  private currentMap: MapState | null = null;
  /** Also used by the visual comparison/export tools; never changes the semantic masks. */
  detailAmount = 1;

  private constructor(private rom: DuneRom, private icons: IconSet) {
    const gl = this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw Error('WebGL2 unavailable');
    this.gl = gl;
    this.kinds = rom.bytes.slice(0x581c, 0x581c + 358);
    const compile = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s) ?? 'Shader compile');
      return s;
    };
    this.program = gl.createProgram()!;
    const vs = compile(gl.VERTEX_SHADER, VERTEX), fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    gl.attachShader(this.program, vs); gl.attachShader(this.program, fs); gl.linkProgram(this.program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(this.program) ?? 'Shader link');
    gl.useProgram(this.program);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    for (const name of ['materials','land','spice','detail','camera','viewport','scale','bounds','layer','detailAmount']) {
      this.uniforms.set(name, gl.getUniformLocation(this.program, name)!);
    }
    for (let i = 0; i < 4; i++) {
      const texture = gl.createTexture()!; this.textures.push(texture);
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(this.uniforms.get(['materials','land','spice','detail'][i])!, i);
    }
  }

  static async load(rom: DuneRom, icons: IconSet): Promise<ContinuousTerrain | null> {
    try {
      const images = await Promise.all([materialUrl,detailUrl].map(async url=>{
        const response=await fetch(url);
        if(!response.ok)throw Error(`Terrain HTTP ${response.status}`);
        return createImageBitmap(await response.blob());
      }));
      const terrain = new ContinuousTerrain(rom, icons), gl = terrain.gl;
      for(const [i,image] of images.entries()){
        const slot=i===0?0:3;
        gl.activeTexture(gl.TEXTURE0+slot); gl.bindTexture(gl.TEXTURE_2D, terrain.textures[slot]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);image.close();
      }
      return terrain;
    } catch (error) {
      console.warn('HD landscape unavailable, using original graphics:', error);
      return null;
    }
  }

  /** Terrain and wreckage can reveal the immutable landscape below them. */
  covers(id: number): boolean {
    const kind = this.kinds[id];
    return kind <= 9 || kind === 13 || kind === 14;
  }

  private mask(id: number): TerrainMask {
    let mask = this.masks.get(id);
    if (mask) return mask;
    const image = this.icons.source(id), c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(image.image, image.sx, image.sy, image.sw, image.sh, 0, 0, 32, 32);
    mask = terrainMask(this.kinds[id] ?? 255, g.getImageData(0,0,32,32).data);
    this.masks.set(id, mask);
    return mask;
  }

  /** Original pixel mask, so debris at mixed shore tiles uses the material under the impact. */
  isRockAt(x: number, y: number): boolean {
    if (!this.currentMap || x < 0 || y < 0 || x >= 2048 || y >= 2048) return false;
    const id = this.currentMap.ground[((y >> 5) << 6) | (x >> 5)];
    return this.mask(id).land[(((y & 31) * 32) + (x & 31)) * 4] > 127;
  }

  setMap(map: MapState): void {
    this.currentMap = map;
    const original = this.rom.missionMap(map.index);
    const land = new Uint8Array(SIZE * SIZE * 4), spice = new Uint8Array(land.length);
    for (let p = 0; p < 4096; p++) {
      const x = (p & 63) * 32, y = (p >> 6) * 32;
      const base = this.mask(original.ground[p]).land, dynamic = this.mask(map.ground[p]).spice;
      for (let row = 0; row < 32; row++) {
        const dest = ((y + row) * SIZE + x) * 4;
        land.set(base.subarray(row * 128, row * 128 + 128), dest);
        spice.set(dynamic.subarray(row * 128, row * 128 + 128), dest);
      }
    }
    const gl = this.gl;
    for (const [index, pixels] of [[1, land], [2, spice]] as const) {
      gl.activeTexture(gl.TEXTURE0 + index); gl.bindTexture(gl.TEXTURE_2D, this.textures[index]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SIZE, SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
    this.previous.set(map.ground);
  }

  /** Called only when the game view redraws; unchanged frames upload nothing. */
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, scale: number,
    layer: 'combined' | 'base' | 'spice' = 'combined'): void {
    const map = this.currentMap;
    if (!map) return;
    const gl = this.gl;
    if (this.canvas.width !== ctx.canvas.width || this.canvas.height !== ctx.canvas.height) {
      this.canvas.width = ctx.canvas.width; this.canvas.height = ctx.canvas.height;
    }
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.textures[2]);
    for (let p = 0; p < 4096; p++) {
      if (this.previous[p] === map.ground[p]) continue;
      this.previous[p] = map.ground[p];
      gl.texSubImage2D(gl.TEXTURE_2D, 0, (p & 63) * 32, (p >> 6) * 32, 32, 32,
        gl.RGBA, gl.UNSIGNED_BYTE, this.mask(map.ground[p]).spice);
    }
    const b = map.bounds;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uniforms.get('camera')!, camX, camY);
    gl.uniform2f(this.uniforms.get('viewport')!, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.get('scale')!, scale);
    gl.uniform1f(this.uniforms.get('detailAmount')!, this.detailAmount);
    gl.uniform1i(this.uniforms.get('layer')!, layer === 'base' ? 1 : layer === 'spice' ? 2 : 0);
    gl.uniform4f(this.uniforms.get('bounds')!, b.x * 32, b.y * 32, b.w * 32, b.h * 32);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    ctx.drawImage(this.canvas, 0, 0);
  }
}
