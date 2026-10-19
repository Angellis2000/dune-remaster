/** Angles and offsets use the original engine's north-zero, clockwise convention. */
export const angleRadians = (angle: number): number => angle * Math.PI / 128;
export function along(angle: number, distance: number): { x: number; y: number } {
  const a = angleRadians(angle);
  return { x: Math.sin(a) * distance, y: -Math.cos(a) * distance };
}

/** BULLET/SONIC start at a fixed north offset, then 16 pixels along the shot heading. */
export function muzzlePoint(x: number, y: number, angle: number, distance = 16): { x: number; y: number } {
  const d = along(angle, distance);
  return { x: x + d.x, y: y - 4 + d.y };
}

export interface VehicleDef { type: number; cell: number; w: number; h: number; mount?: number; mw?: number; muzzle?: number }
export const VEHICLES: readonly VehicleDef[] = [
  {type:0,cell:0,w:28,h:32}, {type:1,cell:1,w:9,h:21},
  {type:7,cell:2,w:15,h:18,mount:2,mw:11,muzzle:10},
  {type:8,cell:3,w:15,h:18,mount:3,mw:11,muzzle:10},
  {type:9,cell:4,w:16,h:19,mount:0,mw:10,muzzle:16},
  {type:10,cell:5,w:22,h:21,mount:1,mw:13,muzzle:16},
  {type:11,cell:6,w:19,h:22,mount:4,mw:13,muzzle:16},
  {type:12,cell:7,w:15,h:18,mount:5,mw:10,muzzle:12},
  {type:13,cell:8,w:13,h:15,mount:6,mw:6,muzzle:11},
  {type:14,cell:9,w:13,h:15,mount:7,mw:6,muzzle:11},
  {type:15,cell:10,w:14,h:14,mount:8,mw:8,muzzle:12},
  {type:16,cell:11,w:18,h:31}, {type:17,cell:12,w:15,h:24},
  {type:26,cell:13,w:21,h:29},
];
