// Выгрузка 3D-кораблей заставки (web/src/gfx/ship-models.ts) в OBJ + MTL: web/src/gfx/assets/ships/<дом>.obj
// node --experimental-transform-types tools/sim/ship_models_export.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { shipModelToObj, shipModels } from "../../web/src/gfx/ship-models.ts";

const dir = new URL("../../web/src/gfx/assets/ships/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const model of shipModels()) {
  const { obj, mtl } = shipModelToObj(model);
  writeFileSync(new URL(`${model.id}.obj`, dir), obj);
  writeFileSync(new URL(`${model.id}.mtl`, dir), mtl);
  const tris = model.parts.reduce((n, p) => n + p.positions.length / 9, 0);
  console.log(`${model.id}: ${model.parts.length} деталей, ${tris} треугольников`);
}
