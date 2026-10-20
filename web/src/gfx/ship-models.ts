/**
 * 3D-модели кораблей заставки — три дизайна и три цветовые схемы по домам (просьба владельца, 2026-10-20):
 *   Атрейдесы — вытянутый серебристо-синий крейсер со стреловидными крыльями и золотой отделкой;
 *   Харконнены — тяжёлая угловатая баржа: тёмный металл, красная броня, шипы, четыре красных двигателя;
 *   Ордосы — плоский зелёный «наконечник стрелы» с жёлтой отделкой, разведёнными килями и тремя двигателями.
 * Только геометрия (без DOM): треугольники с плоским затенением, цвет и свечение у каждой детали. Оси: +Z — нос,
 * +Y — верх, +X — правый борт; длина корабля около 11 единиц. Рисует gfx/ship-renderer.ts, выгрузка в OBJ —
 * shipModelToObj (tools/sim/ship_models_export.ts кладёт файлы в gfx/assets/ships/).
 */

export type Vec3 = [number, number, number];
export interface ShipPart {
  name: string;
  /** треугольники подряд: по 9 чисел (3 вершины × xyz) */
  positions: number[];
  /** цвет детали, 0…1 */
  color: Vec3;
  /** свечение 0…1: сопла двигателей, огни, стёкла */
  emissive: number;
  /** блеск 0…1 */
  gloss: number;
}
export interface ShipModel {
  id: "atreides" | "harkonnen" | "ordos";
  name: string;
  house: number;
  parts: ShipPart[];
  /** точки сопел (для факела в заставке): центр и радиус */
  nozzles: { at: Vec3; radius: number; color: Vec3 }[];
}

const hex = (h: string): Vec3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

class Builder {
  parts: ShipPart[] = [];
  private part(name: string, color: string, emissive = 0, gloss = 0.4): ShipPart {
    const p = { name, positions: [] as number[], color: hex(color), emissive, gloss };
    this.parts.push(p);
    return p;
  }
  private tri(p: ShipPart, a: Vec3, b: Vec3, c: Vec3): void {
    p.positions.push(...a, ...b, ...c);
  }
  private quad(p: ShipPart, a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
    this.tri(p, a, b, c);
    this.tri(p, a, c, d);
  }
  /**
   * Корпус-лофт: сечения вдоль Z (каждое — кольцо точек [x, y] против часовой при взгляде с носа), соседние
   * сечения соединяются гранями; концы закрываются (кольцо из одной точки — острый конец).
   */
  loft(name: string, color: string, sections: { z: number; ring: [number, number][] }[], opts: { emissive?: number; gloss?: number; mirror?: boolean; offset?: Vec3 } = {}): void {
    const p = this.part(name, color, opts.emissive, opts.gloss);
    const o = opts.offset ?? [0, 0, 0];
    const at = (s: { z: number; ring: [number, number][] }, i: number): Vec3 => {
      const r = s.ring[i % s.ring.length];
      return [r[0] + o[0], r[1] + o[1], s.z + o[2]];
    };
    for (let k = 0; k + 1 < sections.length; k++) {
      const a = sections[k], b = sections[k + 1];
      const n = Math.max(a.ring.length, b.ring.length);
      for (let i = 0; i < n; i++) {
        const ia = a.ring.length === 1 ? 0 : i, ja = a.ring.length === 1 ? 0 : i + 1;
        const ib = b.ring.length === 1 ? 0 : i, jb = b.ring.length === 1 ? 0 : i + 1;
        // a — ближе к корме (меньше z), b — к носу; обход наружу
        if (a.ring.length === 1) this.tri(p, at(a, 0), at(b, jb), at(b, ib));
        else if (b.ring.length === 1) this.tri(p, at(a, ia), at(a, ja), at(b, 0));
        else this.quad(p, at(a, ia), at(a, ja), at(b, jb), at(b, ib));
      }
    }
    const cap = (s: { z: number; ring: [number, number][] }, front: boolean) => {
      if (s.ring.length < 3) return;
      const c: Vec3 = [o[0] + s.ring.reduce((m, r) => m + r[0], 0) / s.ring.length, o[1] + s.ring.reduce((m, r) => m + r[1], 0) / s.ring.length, s.z + o[2]];
      for (let i = 0; i < s.ring.length; i++) {
        if (front) this.tri(p, c, at(s, i), at(s, i + 1));
        else this.tri(p, c, at(s, i + 1), at(s, i));
      }
    };
    cap(sections[0], false);
    cap(sections[sections.length - 1], true);
    if (opts.mirror) {
      const n = p.positions.length;
      for (let i = 0; i < n; i += 9) {
        // отражение по X с обратным обходом
        const v = p.positions.slice(i, i + 9);
        p.positions.push(-v[0], v[1], v[2], -v[6], v[7], v[8], -v[3], v[4], v[5]);
      }
    }
  }
  /** Плоская деталь (крыло, киль): контур в плоскости, толщина, ориентация plane: "xz" — горизонтальная, "yz" — вертикальная. */
  plate(name: string, color: string, outline: [number, number][], thickness: number, plane: "xz" | "yz", at: Vec3, opts: { mirror?: boolean; emissive?: number; gloss?: number; tilt?: number } = {}): void {
    const t = thickness / 2, tilt = opts.tilt ?? 0;
    // xz: u — вправо, v — вперёд, w — толщина вверх (tilt — подъём к концу крыла); yz: u — вверх, v — вперёд, w — вбок
    const P = (u: number, v: number, w: number): Vec3 => (plane === "xz" ? [at[0] + u, at[1] + w + u * tilt, at[2] + v] : [at[0] + w + u * tilt, at[1] + u, at[2] + v]);
    const p = this.part(name, color, opts.emissive, opts.gloss);
    const n = outline.length;
    const top = outline.map(([u, v]) => P(u, v, t)), bottom = outline.map(([u, v]) => P(u, v, -t));
    for (let i = 1; i + 1 < n; i++) {
      this.tri(p, top[0], top[i + 1], top[i]);
      this.tri(p, bottom[0], bottom[i], bottom[i + 1]);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      this.quad(p, top[i], top[j], bottom[j], bottom[i]);
    }
    if (opts.mirror) {
      const m = p.positions.length;
      for (let i = 0; i < m; i += 9) {
        const v = p.positions.slice(i, i + 9);
        p.positions.push(-v[0], v[1], v[2], -v[6], v[7], v[8], -v[3], v[4], v[5]);
      }
    }
  }
  /** Ящик по центру и размерам. */
  box(name: string, color: string, c: Vec3, s: Vec3, opts: { emissive?: number; gloss?: number; mirror?: boolean } = {}): void {
    const [x, y, z] = c, [w, h, d] = [s[0] / 2, s[1] / 2, s[2] / 2];
    this.loft(name, color, [
      { z: z - d, ring: [[x - w, y - h], [x + w, y - h], [x + w, y + h], [x - w, y + h]] },
      { z: z + d, ring: [[x - w, y - h], [x + w, y - h], [x + w, y + h], [x - w, y + h]] },
    ], opts);
  }
  /** Цилиндр вдоль Z (двигатель, орудие): r0 у кормы, r1 у носа. */
  cylinder(name: string, color: string, c: Vec3, z0: number, z1: number, r0: number, r1: number, segments = 10, opts: { emissive?: number; gloss?: number; mirror?: boolean } = {}): void {
    const ring = (r: number) => Array.from({ length: segments }, (_, i) => [c[0] + Math.cos((i / segments) * Math.PI * 2) * r, c[1] + Math.sin((i / segments) * Math.PI * 2) * r] as [number, number]);
    this.loft(name, color, [{ z: c[2] + z0, ring: ring(r0) }, { z: c[2] + z1, ring: ring(r1) }], opts);
  }
}

/** Кольцо-сечение: восьмиугольник шириной w и высотой h со срезом углов cut (0…0.5) и смещением вверх dy. */
function octo(w: number, h: number, cut = 0.3, dy = 0): [number, number][] {
  const x = w / 2, y = h / 2, cx = x * (1 - cut), cy = y * (1 - cut);
  return [[-cx, -y + dy], [cx, -y + dy], [x, -cy + dy], [x, cy + dy], [cx, y + dy], [-cx, y + dy], [-x, cy + dy], [-x, -cy + dy]];
}
/** Ромб-сечение (плоский корпус): ширина w, высота над/под осью up/down. */
function diamond(w: number, up: number, down: number): [number, number][] {
  return [[0, -down], [w * 0.5, -down * 0.25], [w * 0.5, up * 0.2], [0, up], [-w * 0.5, up * 0.2], [-w * 0.5, -down * 0.25]];
}

function atreides(): ShipModel {
  const b = new Builder();
  // корпус: вытянутый восьмигранник, сужается к острому носу
  b.loft("корпус", "#dfe6ee", [
    { z: -5.4, ring: octo(1.9, 1.3, 0.35) },
    { z: -2.5, ring: octo(2.5, 1.6, 0.3) },
    { z: 1.0, ring: octo(2.2, 1.45, 0.3) },
    { z: 3.6, ring: octo(1.3, 0.95, 0.35, 0.05) },
    { z: 5.6, ring: [[0, 0.05]] },
  ], { gloss: 0.75 });
  // синяя полоса по хребту и брюху
  b.loft("полоса", "#2f6fd6", [
    { z: -5.2, ring: [[-0.32, 0.6], [0.32, 0.6], [0.26, 0.86], [-0.26, 0.86]] },
    { z: 3.4, ring: [[-0.22, 0.4], [0.22, 0.4], [0.16, 0.6], [-0.16, 0.6]] },
  ], { gloss: 0.6 });
  // кабина
  b.loft("кабина", "#163450", [
    { z: 1.4, ring: [[-0.45, 0.62], [0.45, 0.62], [0.32, 0.92], [-0.32, 0.92]] },
    { z: 3.2, ring: [[-0.25, 0.42], [0.25, 0.42], [0.12, 0.55], [-0.12, 0.55]] },
  ], { emissive: 0.25, gloss: 0.95 });
  // стреловидные крылья с золотыми законцовками
  b.plate("крыло", "#2d63c8", [[1.0, 0.8], [1.0, -2.6], [4.9, -4.3], [5.1, -3.5]], 0.16, "xz", [0, -0.15, 0], { mirror: true, tilt: 0.06, gloss: 0.6 });
  b.plate("законцовка", "#d8b247", [[4.85, -4.4], [5.35, -4.6], [5.5, -3.2], [5.05, -3.35]], 0.2, "xz", [0, 0.12, 0], { mirror: true, gloss: 0.9 });
  // киль
  b.plate("киль", "#dfe6ee", [[0.6, -5.2], [2.3, -5.9], [2.4, -5.1], [0.6, -3.0]], 0.14, "yz", [0, 0, 0], { gloss: 0.7 });
  b.plate("киль, полоса", "#2f6fd6", [[1.9, -5.65], [2.35, -5.85], [2.4, -5.15], [1.95, -4.9]], 0.16, "yz", [0, 0, 0]);
  // двигатели в гондолах
  b.cylinder("гондола", "#c9d2dc", [1.55, -0.35, 0], -5.9, -2.2, 0.48, 0.42, 12, { mirror: true, gloss: 0.7 });
  b.cylinder("обод сопла", "#8d99a6", [1.55, -0.35, 0], -6.05, -5.85, 0.5, 0.5, 12, { mirror: true });
  b.cylinder("сопло", "#7fdcff", [1.55, -0.35, 0], -6.08, -6.02, 0.36, 0.36, 12, { mirror: true, emissive: 1 });
  b.cylinder("сопло центр", "#7fdcff", [0, 0, 0], -5.48, -5.42, 0.5, 0.5, 10, { emissive: 1 });
  // огни
  b.box("огонь", "#9fe8ff", [0, 0.05, 5.55], [0.12, 0.12, 0.12], { emissive: 1 });
  b.box("огонь крыла", "#ff4a4a", [5.3, 0.15, -3.9], [0.12, 0.08, 0.12], { emissive: 1, mirror: true });
  return {
    id: "atreides", name: "Атрейдесы — крейсер «Цапля»", house: 1, parts: b.parts,
    nozzles: [
      { at: [1.55, -0.35, -6.08], radius: 0.36, color: hex("#7fdcff") },
      { at: [-1.55, -0.35, -6.08], radius: 0.36, color: hex("#7fdcff") },
      { at: [0, 0, -5.48], radius: 0.5, color: hex("#7fdcff") },
    ],
  };
}

function harkonnen(): ShipModel {
  const b = new Builder();
  // тяжёлый корпус: широкие граненые сечения, тупой нос-таран
  b.loft("корпус", "#3a3d42", [
    { z: -5.2, ring: octo(3.0, 2.0, 0.18) },
    { z: -1.0, ring: octo(3.4, 2.3, 0.18) },
    { z: 2.6, ring: octo(3.0, 2.0, 0.2) },
    { z: 4.4, ring: octo(1.8, 1.3, 0.25, -0.1) },
    { z: 5.0, ring: octo(1.1, 0.8, 0.3, -0.1) },
  ], { gloss: 0.35 });
  // красные бронеплиты по бортам и на палубе
  b.loft("броня борта", "#9e1b1b", [
    { z: -4.6, ring: [[1.62, -0.7], [1.78, -0.7], [1.78, 0.7], [1.62, 0.7]] },
    { z: 2.4, ring: [[1.52, -0.6], [1.68, -0.6], [1.68, 0.6], [1.52, 0.6]] },
  ], { mirror: true, gloss: 0.5 });
  b.loft("броня палубы", "#9e1b1b", [
    { z: -4.0, ring: [[-0.9, 1.12], [0.9, 1.12], [0.75, 1.3], [-0.75, 1.3]] },
    { z: 1.8, ring: [[-0.7, 1.05], [0.7, 1.05], [0.6, 1.22], [-0.6, 1.22]] },
  ], { gloss: 0.5 });
  // рубка-надстройка с узкой красной щелью
  b.box("рубка", "#2b2d31", [0, 1.55, -1.5], [1.3, 0.8, 1.6], { gloss: 0.3 });
  b.box("смотровая щель", "#ff3b2f", [0, 1.7, -0.68], [0.9, 0.12, 0.05], { emissive: 0.9 });
  // шипы
  for (const [x, z] of [[0.55, -3.6], [-0.55, -3.6], [0.55, 0.6], [-0.55, 0.6]] as const) {
    b.loft("шип", "#1c1c1f", [
      { z: z - 0.5, ring: [[x - 0.2, 1.25], [x + 0.2, 1.25], [x + 0.2, 1.35], [x - 0.2, 1.35]] },
      { z: z + 0.3, ring: [[x, 2.2]] },
    ], { gloss: 0.6 });
  }
  // таран-шипы на носу
  b.loft("таран", "#1c1c1f", [
    { z: 4.9, ring: [[0.55, -0.6], [0.85, -0.6], [0.85, -0.3], [0.55, -0.3]] },
    { z: 6.2, ring: [[0.72, -0.48]] },
  ], { mirror: true, gloss: 0.6 });
  // орудийные подвески
  b.cylinder("орудие", "#2b2d31", [2.05, -0.55, 0], -0.8, 3.8, 0.3, 0.22, 8, { mirror: true });
  b.cylinder("дуло", "#ff5a1f", [2.05, -0.55, 0], 3.8, 3.86, 0.12, 0.12, 8, { mirror: true, emissive: 1 });
  // рёбра-плавники снизу
  b.plate("плавник", "#3a3d42", [[-0.9, -4.8], [-2.1, -5.6], [-2.0, -4.4], [-0.9, -2.0]], 0.2, "yz", [1.1, 0, 0], { mirror: true });
  // четыре двигателя 2×2
  for (const [x, y] of [[0.75, 0.45], [-0.75, 0.45], [0.75, -0.55], [-0.75, -0.55]] as const) {
    b.cylinder("двигатель", "#26282c", [x, y, 0], -5.9, -5.0, 0.52, 0.46, 10, { gloss: 0.4 });
    b.cylinder("сопло", "#ff5a1f", [x, y, 0], -5.95, -5.9, 0.4, 0.4, 10, { emissive: 1 });
  }
  b.box("огонь", "#ff2a1a", [0, 2.25, -3.5], [0.1, 0.1, 0.1], { emissive: 1 });
  return {
    id: "harkonnen", name: "Харконнены — баржа «Кулак»", house: 0, parts: b.parts,
    nozzles: [[0.75, 0.45], [-0.75, 0.45], [0.75, -0.55], [-0.75, -0.55]].map(([x, y]) => ({ at: [x, y, -5.95] as Vec3, radius: 0.4, color: hex("#ff5a1f") })),
  };
}

function ordos(): ShipModel {
  const b = new Builder();
  // плоский корпус-ромб, широкий у кормы, острый нос
  b.loft("корпус", "#2f8f4e", [
    { z: -4.8, ring: diamond(3.4, 0.9, 0.55) },
    { z: -1.0, ring: diamond(3.0, 1.05, 0.6) },
    { z: 2.5, ring: diamond(1.6, 0.75, 0.45) },
    { z: 5.6, ring: [[0, 0.1]] },
  ], { gloss: 0.7 });
  // дельта-крылья
  b.plate("крыло", "#2f8f4e", [[1.4, 1.6], [1.5, -3.6], [5.2, -4.6], [5.0, -3.6]], 0.14, "xz", [0, -0.1, 0], { mirror: true, tilt: -0.04, gloss: 0.65 });
  // жёлтая кромка крыла и шевроны
  b.plate("кромка", "#e3c33a", [[1.45, 1.55], [1.75, 1.2], [5.05, -3.55], [4.75, -3.45]], 0.16, "xz", [0, -0.08, 0], { mirror: true, gloss: 0.8 });
  b.loft("шеврон", "#e3c33a", [
    { z: -0.4, ring: [[-0.9, 0.62], [0.9, 0.62], [0.9, 0.7], [-0.9, 0.7]] },
    { z: 0.2, ring: [[-0.1, 0.78], [0.1, 0.78], [0.1, 0.86], [-0.1, 0.86]] },
  ], { gloss: 0.8 });
  // каплевидная кабина
  b.loft("кабина", "#4fe0c8", [
    { z: 0.6, ring: [[-0.42, 0.55], [0.42, 0.55], [0.3, 0.85], [-0.3, 0.85]] },
    { z: 2.6, ring: [[-0.18, 0.42], [0.18, 0.42], [0.08, 0.52], [-0.08, 0.52]] },
  ], { emissive: 0.35, gloss: 0.95 });
  // разведённые кили
  b.plate("киль", "#256f3d", [[0.4, -4.6], [1.9, -5.5], [2.0, -4.6], [0.4, -2.6]], 0.12, "yz", [1.15, 0.2, 0], { mirror: true, tilt: 0, gloss: 0.6 });
  b.plate("киль, кромка", "#e3c33a", [[1.6, -5.35], [2.0, -5.55], [2.05, -4.75], [1.65, -4.6]], 0.14, "yz", [1.15, 0.2, 0], { mirror: true });
  // передние «клыки»
  b.loft("клык", "#256f3d", [
    { z: 1.5, ring: [[0.95, -0.25], [1.25, -0.25], [1.25, 0.05], [0.95, 0.05]] },
    { z: 4.2, ring: [[1.05, -0.1]] },
  ], { mirror: true, gloss: 0.6 });
  // три двигателя в ряд
  for (const x of [-1.0, 0, 1.0]) {
    b.cylinder("двигатель", "#1f5a33", [x, 0.1, 0], -5.4, -4.4, 0.36, 0.32, 10, { gloss: 0.5 });
    b.cylinder("сопло", "#c8ff5a", [x, 0.1, 0], -5.46, -5.4, 0.28, 0.28, 10, { emissive: 1 });
  }
  b.box("огонь", "#c8ff5a", [5.1, -0.05, -4.2], [0.12, 0.08, 0.12], { emissive: 1, mirror: true });
  return {
    id: "ordos", name: "Ордосы — курьер «Гадюка»", house: 2, parts: b.parts,
    nozzles: [-1, 0, 1].map((x) => ({ at: [x, 0.1, -5.46] as Vec3, radius: 0.28, color: hex("#c8ff5a") })),
  };
}

/** Три корабля заставки: Атрейдесы, Харконнены, Ордосы. */
export function shipModels(): ShipModel[] {
  return [atreides(), harkonnen(), ordos()];
}

/** Модель в формате Wavefront OBJ + MTL (для Blender и других программ). */
export function shipModelToObj(model: ShipModel): { obj: string; mtl: string } {
  const obj: string[] = [`# ${model.name}`, `mtllib ${model.id}.mtl`, `o ${model.id}`];
  const mtl: string[] = [`# ${model.name}`];
  let v = 1;
  model.parts.forEach((p, i) => {
    const mat = `${model.id}_${i}`;
    mtl.push(`newmtl ${mat}`, `Kd ${p.color.map((c) => c.toFixed(4)).join(" ")}`, `Ke ${p.color.map((c) => (c * p.emissive).toFixed(4)).join(" ")}`, `Ns ${Math.round(10 + p.gloss * 240)}`, "");
    obj.push(`g ${p.name.replace(/\s+/g, "_")}`, `usemtl ${mat}`);
    for (let k = 0; k < p.positions.length; k += 9) {
      for (let j = 0; j < 9; j += 3) obj.push(`v ${p.positions[k + j].toFixed(4)} ${p.positions[k + j + 1].toFixed(4)} ${p.positions[k + j + 2].toFixed(4)}`);
      obj.push(`f ${v} ${v + 1} ${v + 2}`);
      v += 3;
    }
  });
  return { obj: obj.join("\n") + "\n", mtl: mtl.join("\n") };
}
