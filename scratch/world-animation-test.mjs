// web/src/gfx/world-atmosphere.ts
var DAY_TICKS = 24 * 60 * 60;
var TAU = Math.PI * 2;
var mod = (v, n) => (v % n + n) % n;
var smooth = (v) => v * v * (3 - 2 * v);
var keys = [
  [0, 0.54, 0.64, 0.86],
  [5, 0.54, 0.64, 0.86],
  [7, 1, 0.88, 0.74],
  [10, 1, 1, 0.98],
  [16, 1, 1, 0.98],
  [18, 1, 0.83, 0.69],
  [20, 0.54, 0.64, 0.86],
  [24, 0.54, 0.64, 0.86]
];
function desertLight(tick) {
  const hour = mod(9 + Math.max(0, tick) / DAY_TICKS * 24, 24);
  const i = keys.findIndex((k, j) => j < keys.length - 1 && hour >= k[0] && hour < keys[j + 1][0]);
  const a = keys[Math.max(0, i)], b = keys[Math.max(0, i) + 1];
  const f = smooth((hour - a[0]) / (b[0] - a[0]));
  const rgb = [1, 2, 3].map((c) => a[c] + (b[c] - a[c]) * f);
  const sun = Math.max(0, Math.sin((hour - 6) / 24 * TAU));
  return { hour, rgb, night: 1 - smooth(Math.min(1, sun * 3)), sun };
}
function cloudPosition(i, tick) {
  const t = Math.max(0, tick) / 60;
  return {
    x: mod(i * 643 + 780 + t * 1.7, 3500) - 700,
    y: mod(i * 419 + 500 + t * 0.34, 3300) - 600,
    w: 370 + i % 3 * 90,
    h: 170 + i % 4 * 24
  };
}
var WorldAtmosphere = class {
  cloud = null;
  cloudMask() {
    if (this.cloud) return this.cloud;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const g = c.getContext("2d");
    for (let i = 0; i < 9; i++) {
      const x = 47 + i * 19, y = 64 + Math.sin(i * 2.3) * 15, r = 26 + i % 3 * 7;
      const p = g.createRadialGradient(x, y, 0, x, y, r);
      p.addColorStop(0, "rgba(0,0,0,.38)");
      p.addColorStop(0.5, "rgba(0,0,0,.2)");
      p.addColorStop(1, "transparent");
      g.fillStyle = p;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return this.cloud = c;
  }
  /** Caller clips to revealed world cells. UI and fog remain outside this pass. */
  draw(ctx, tick, ox, oy, z, width, height) {
    const light = desertLight(tick), seconds = Math.max(0, tick) / 60;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgb(${light.rgb.map((c) => Math.round(c * 255)).join(",")})`;
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    const mask = this.cloudMask();
    ctx.globalAlpha = 0.15 + 0.09 * light.sun;
    for (let i = 0; i < 11; i++) {
      const p = cloudPosition(i, tick), x = p.x * z - ox, y = p.y * z - oy, w = p.w * z, h = p.h * z;
      if (x > width || y > height || x + w < 0 || y + h < 0) continue;
      ctx.drawImage(mask, x, y, w, h);
    }
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 7 && light.sun > 0; i++) {
      const p = cloudPosition(i, tick), x = (p.x + 180) * z - ox, y = (p.y - 110) * z - oy;
      const w = (75 + 15 * Math.sin(seconds * 0.055 + i)) * z, h = 490 * z, slant = 150 * z;
      if (x + w + slant < 0 || x > width || y + h < 0 || y > height) continue;
      ctx.save();
      ctx.transform(1, 0, slant / h, 1, x, y);
      const grad = ctx.createLinearGradient(-w, 0, w, 0);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.45, "#ffe2a8");
      grad.addColorStop(0.6, "#fff1ce");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      for (let band = 0; band < 12; band++) {
        ctx.globalAlpha = light.sun * (0.026 + 9e-3 * Math.sin(seconds * 0.075 + i)) * Math.sin((band + 0.5) / 12 * Math.PI);
        ctx.fillRect(-w, band * h / 12, w * 2, h / 12 + 0.5);
      }
      ctx.restore();
    }
    ctx.restore();
  }
};

// web/src/gfx/building-activity.ts
var TAU2 = Math.PI * 2;
function rotor(ctx, image, s, x, y, r, angle) {
  const w = s.w * 32, h = s.h * 32, cx = w * x, cy = h * y;
  ctx.save();
  ctx.translate(s.x * 32 + cx, s.y * 32 + cy);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU2);
  ctx.clip();
  ctx.rotate(angle);
  ctx.drawImage(
    image,
    (cx - r) / w * image.width,
    (cy - r) / h * image.height,
    r * 2 / w * image.width,
    r * 2 / h * image.height,
    -r,
    -r,
    r * 2,
    r * 2
  );
  ctx.restore();
}
function drawBuildingActivity(ctx, s, image, tick, powered = true) {
  if (!s.built || s.hp <= 0) return;
  const t = tick / 60, phase = s.id * 0.71, w = s.w * 32, h = s.h * 32, x = s.x * 32, y = s.y * 32;
  const busy = s.ref.state === 1 && !s.ref.o.flags.onHold;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if (s.type === 12) for (const yy of [0.163, 0.423, 0.683]) rotor(ctx, image, s, 0.28, yy, Math.min(w, h) * 0.096, t * 1.25 + phase);
  if (powered) {
    if (s.type === 3 || s.type === 4) rotor(ctx, image, s, 0.322, 0.36, Math.min(w, h) * 0.108, t * 1.8 + phase);
    if (s.type === 9) {
      for (const [cx, cy] of [[0.275, 0.235], [0.71, 0.4], [0.51, 0.75]]) {
        ctx.save();
        ctx.translate(x + w * cx, y + h * cy);
        const r = w * 0.145;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, 0.15, 1.35);
        ctx.closePath();
        ctx.clip();
        ctx.strokeStyle = "rgba(191,210,218,.28)";
        ctx.lineWidth = 0.35;
        for (let j = 0; j < 6; j++) {
          const a = t * 2.2 + phase + j * TAU2 / 6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
          ctx.lineTo(Math.cos(a + 0.22) * r, Math.sin(a + 0.22) * r);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
  if (powered && [3, 4, 5, 8, 11, 12, 13, 18].includes(s.type)) {
    const alpha = 0.32 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2 + phase));
    ctx.fillStyle = `rgba(142,232,244,${alpha})`;
    const px = x + w * (s.type === 12 ? 0.48 : 0.79), py = y + h * (s.type === 12 ? 0.5 : 0.8);
    ctx.fillRect(px, py, w * 0.018, 0.45);
  }
  if (busy && powered && [3, 4, 5, 7, 8, 10, 13].includes(s.type)) {
    const pulse = Math.max(0, Math.sin(t * 3.3 + phase)) ** 8;
    const cx = x + w * 0.66, cy = y + h * 0.72;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 4);
    glow.addColorStop(0, `rgba(211,238,255,${pulse * 0.5})`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 4, cy - 4, 8, 8);
  }
  ctx.restore();
}
function drawBuildingNightLights(ctx, s, night) {
  if (!s.built || s.hp <= 0 || night < 0.03 || [0, 1, 14, 15, 16].includes(s.type)) return;
  const w = s.w * 32, h = s.h * 32, x = s.x * 32 + w * 0.6, y = s.y * 32 + h * 0.79;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 3.5);
  glow.addColorStop(0, `rgba(255,205,124,${night * 0.26})`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 3.5, y - 3.5, 7, 7);
  ctx.fillStyle = `rgba(255,224,163,${night * 0.8})`;
  ctx.fillRect(x - 0.8, y - 0.18, 1.6, 0.36);
  ctx.restore();
}

// web/src/engine/tables.gen.ts
var g_table_tilediff = [[[0, 0], [0, -1], [1, 0], [0, -1], [1, 0], [0, 0], [1, 0], [0, 0]], [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 16], [16, 0], [16, 16], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 32], [32, 0], [32, 32], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 48], [48, 0], [48, 48], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 64], [64, 0], [64, 64], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 80], [80, 0], [80, 80], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 96], [96, 0], [96, 96], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 112], [112, 0], [112, 112], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 128], [128, 0], [128, 128], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 144], [144, 0], [144, 144], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 160], [160, 0], [160, 160], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 176], [176, 0], [176, 176], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 192], [192, 0], [192, 192], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 208], [208, 0], [208, 208], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 224], [224, 0], [224, 224], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 240], [240, 0], [240, 240], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 256], [256, 0], [256, 256], [128, 0], [128, 256], [0, 128], [256, 128], [128, 128]], [[0, 272], [272, 0], [272, 272], [128, 0], [128, 272], [0, 128], [272, 128], [128, 128]], [[0, 288], [288, 0], [288, 288], [144, 0], [144, 288], [0, 144], [288, 144], [144, 144]], [[0, 304], [304, 0], [304, 304], [144, 0], [144, 304], [0, 144], [304, 144], [144, 144]], [[0, 320], [320, 0], [320, 320], [160, 0], [160, 320], [0, 160], [320, 160], [160, 160]], [[0, 336], [336, 0], [336, 336], [160, 0], [160, 336], [0, 160], [336, 160], [160, 160]], [[0, 352], [352, 0], [352, 352], [176, 0], [176, 352], [0, 176], [352, 176], [176, 176]], [[0, 368], [368, 0], [368, 368], [176, 0], [176, 368], [0, 176], [368, 176], [176, 176]], [[0, 384], [384, 0], [384, 384], [192, 0], [192, 384], [0, 192], [384, 192], [192, 192]], [[0, 400], [400, 0], [400, 400], [192, 0], [192, 400], [0, 192], [400, 192], [192, 192]], [[0, 416], [416, 0], [416, 416], [208, 0], [208, 416], [0, 208], [416, 208], [208, 208]], [[0, 432], [432, 0], [432, 432], [208, 0], [208, 432], [0, 208], [432, 208], [208, 208]], [[0, 448], [448, 0], [448, 448], [224, 0], [224, 448], [0, 224], [448, 224], [224, 224]], [[0, 464], [464, 0], [464, 464], [224, 0], [224, 464], [0, 224], [464, 224], [224, 224]], [[0, 480], [480, 0], [480, 480], [240, 0], [240, 480], [0, 240], [480, 240], [240, 240]], [[0, 496], [496, 0], [496, 496], [240, 0], [240, 496], [0, 240], [496, 240], [240, 240]], [[0, 768], [768, 0], [768, 768], [512, 0], [512, 512], [0, 512], [512, 256], [256, 256]]];
var g_table_animation_structure = [[[6, 1], [3, 300], [1, 0]], [[6, 0], [1, 0]], [[6, 2], [3, 300], [1, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [6, 4], [3, 30], [6, 5], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [4, 0]], [[6, 8], [3, 30], [6, 9], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 7], [3, 30], [6, 6], [3, 30], [6, 5], [3, 30], [6, 4], [3, 30], [7, -4]], [[6, 4], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 4], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 5], [3, 30], [6, 3], [3, 30], [6, 4], [3, 30], [6, 2], [3, 30], [6, 5], [3, 30], [6, 4], [3, 30], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [4, 0]], [[6, 8], [3, 30], [6, 9], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 8], [3, 60], [6, 9], [3, 60], [6, 6], [3, 60], [6, 5], [3, 60], [6, 2], [3, 60], [6, 3], [3, 60], [7, -4]], [[6, 2], [3, 60], [6, 3], [3, 60], [4, 0]], [[6, 2], [3, 60], [6, 5], [3, 60], [6, 6], [3, 60], [6, 9], [3, 60], [6, 8], [3, 60], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]]];
var g_table_unitInfo = [[{ "stringID_abbrev": 194, "name": "Carryall", "stringID_full": 195, "wsa": "carryall.wsa", "_4": { "hasShadow": 1, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 100, "fogUncoverRadius": 0, "spriteID": 89, "buildCredits": 800, "buildTime": 64, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 16, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 20, "priorityTarget": 16, "availableHouse": 63 }, 0, 10, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 1, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 32, 4, 0, 200, 3, 283, -1, 7, 1, 0, 0, 0, 0, 65535, 255, 42], [{ "stringID_abbrev": 196, "name": "'Thopter", "stringID_full": 197, "wsa": "orni.wsa", "_4": { "hasShadow": 1, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 25, "fogUncoverRadius": 5, "spriteID": 97, "buildCredits": 600, "buildTime": 96, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 28, "upgradeLevelRequired": 1, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 75, "priorityTarget": 30, "availableHouse": 62 }, 0, 10, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 1, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 4, 7, 150, 2, 289, -1, 7, 5, 0, 50, 50, 50, 0, 22, 42], [{ "stringID_abbrev": 198, "name": "Infantry", "stringID_full": 199, "wsa": "infantry.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 50, "fogUncoverRadius": 1, "spriteID": 93, "buildCredits": 100, "buildTime": 32, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 4, "upgradeLevelRequired": 1, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 20, "priorityTarget": 20, "availableHouse": 62 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 15, 5, 3, 329, -1, 11, 4, 0, 45, 2, 3, 0, 23, 58], [{ "stringID_abbrev": 200, "name": "Troopers", "stringID_full": 201, "wsa": "hyinfy.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 1, "priority": 1 }, "spawnChance": 0, "hitpoints": 110, "fogUncoverRadius": 1, "spriteID": 103, "buildCredits": 200, "buildTime": 56, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 8, "upgradeLevelRequired": 1, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 50, "priorityTarget": 50, "availableHouse": 61 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 15, 10, 3, 341, -1, 11, 4, 0, 50, 5, 5, 0, 23, 59], [{ "stringID_abbrev": 202, "name": "Soldier", "stringID_full": 203, "wsa": "infantry.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 20, "fogUncoverRadius": 1, "spriteID": 102, "buildCredits": 60, "buildTime": 32, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 2, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 10, "priorityTarget": 10, "availableHouse": 62 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 1, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 12, 8, 3, 311, -1, 11, 3, 0, 45, 2, 3, 0, 23, 58], [{ "stringID_abbrev": 204, "name": "Trooper", "stringID_full": 205, "wsa": "hyinfy.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 1, "priority": 1 }, "spawnChance": 0, "hitpoints": 45, "fogUncoverRadius": 1, "spriteID": 88, "buildCredits": 100, "buildTime": 56, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 6, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 20, "priorityTarget": 30, "availableHouse": 61 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 1, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 12, 15, 3, 320, -1, 11, 3, 0, 50, 5, 5, 0, 23, 59], [{ "stringID_abbrev": 44, "name": "Saboteur", "stringID_full": 44, "wsa": "saboture.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 10, "fogUncoverRadius": 1, "spriteID": 96, "buildCredits": 120, "buildTime": 48, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [9, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 700, "availableHouse": 4 }, 20, 21, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 8, 0, 7, 40, 3, 301, -1, 9, 3, 0, 45, 2, 2, 0, 23, 58], [{ "stringID_abbrev": 208, "name": "Launcher", "stringID_full": 209, "wsa": "rtank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 1, "priority": 1 }, "spawnChance": 64, "hitpoints": 100, "fogUncoverRadius": 5, "spriteID": 85, "buildCredits": 450, "buildTime": 72, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 26, "upgradeLevelRequired": 2, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 100, "priorityTarget": 150, "availableHouse": 59 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 30, 1, 111, 146, 11, 1, 162, 120, 9, 75, 3, 19, -1], [{ "stringID_abbrev": 210, "name": "Deviator", "stringID_full": 211, "wsa": "ordrtank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 120, "fogUncoverRadius": 5, "spriteID": 98, "buildCredits": 750, "buildTime": 80, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 30, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 50, "priorityTarget": 175, "availableHouse": 4 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 30, 1, 111, 146, 11, 1, 162, 180, 7, 0, 3, 21, -1], [{ "stringID_abbrev": 212, "name": "Tank", "stringID_full": 213, "wsa": "ltank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 1, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 3, "spriteID": 90, "buildCredits": 300, "buildTime": 64, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 22, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 80, "priorityTarget": 100, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 25, 1, 111, 116, 11, 1, 162, 80, 4, 25, 1, 23, 57], [{ "stringID_abbrev": 214, "name": "Siege Tank", "stringID_full": 215, "wsa": "htank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 1, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 300, "fogUncoverRadius": 4, "spriteID": 84, "buildCredits": 600, "buildTime": 96, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 24, "upgradeLevelRequired": 3, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 130, "priorityTarget": 150, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 1, 0, 20, 1, 121, 126, 11, 1, 162, 90, 5, 30, 1, 23, 57], [{ "stringID_abbrev": 216, "name": "Devastator", "stringID_full": 217, "wsa": "harktank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 400, "fogUncoverRadius": 4, "spriteID": 87, "buildCredits": 800, "buildTime": 104, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 32, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 13, 3], "available": 0, "hintStringID": 0, "priorityBuild": 175, "priorityTarget": 180, "availableHouse": 57 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 1, 0, 10, 1, 131, 136, 11, 1, 165, 100, 5, 40, 1, 23, 57], [{ "stringID_abbrev": 218, "name": "Sonic Tank", "stringID_full": 219, "wsa": "stank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 110, "fogUncoverRadius": 4, "spriteID": 91, "buildCredits": 600, "buildTime": 104, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 34, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 80, "priorityTarget": 110, "availableHouse": 58 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 1, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 30, 1, 111, 141, 11, 1, 162, 80, 8, 60, 65535, 24, 43], [{ "stringID_abbrev": 220, "name": "Trike", "stringID_full": 221, "wsa": "trike.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 100, "fogUncoverRadius": 2, "spriteID": 92, "buildCredits": 150, "buildTime": 40, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 10, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 50, "priorityTarget": 50, "availableHouse": 58 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 1, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 3, 0, 45, 2, 243, -1, 11, 1, 0, 50, 3, 5, 0, 23, 59], [{ "stringID_abbrev": 222, "name": "Raider Trike", "stringID_full": 223, "wsa": "otrike.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 80, "fogUncoverRadius": 2, "spriteID": 99, "buildCredits": 150, "buildTime": 40, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 12, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 55, "priorityTarget": 60, "availableHouse": 60 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 1, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 3, 0, 60, 2, 243, -1, 11, 1, 0, 50, 3, 5, 0, 23, 59], [{ "stringID_abbrev": 224, "name": "Quad", "stringID_full": 225, "wsa": "quad.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 130, "fogUncoverRadius": 2, "spriteID": 86, "buildCredits": 200, "buildTime": 48, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 14, "upgradeLevelRequired": 1, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 60, "priorityTarget": 60, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 1, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 3, 0, 40, 2, 238, -1, 11, 1, 0, 50, 3, 7, 0, 23, 59], [{ "stringID_abbrev": 226, "name": "Harvester", "stringID_full": 227, "wsa": "harvest.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 128, "hitpoints": 150, "fogUncoverRadius": 2, "spriteID": 100, "buildCredits": 300, "buildTime": 64, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 18, "upgradeLevelRequired": 0, "actionsPlayer": [5, 1, 6, 7], "available": 0, "hintStringID": 0, "priorityBuild": 10, "priorityTarget": 150, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 2, 0, 20, 1, 248, -1, 5, 1, 165, 0, 0, 0, 65535, 255, 0], [{ "stringID_abbrev": 228, "name": "MCV", "stringID_full": 229, "wsa": "mcv.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 150, "fogUncoverRadius": 2, "spriteID": 101, "buildCredits": 900, "buildTime": 80, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 20, "upgradeLevelRequired": 1, "actionsPlayer": [12, 1, 2, 7], "available": 0, "hintStringID": 0, "priorityBuild": 10, "priorityTarget": 150, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 1, 0, 20, 1, 253, -1, 11, 1, 0, 0, 0, 0, 65535, 255, 0], [{ "stringID_abbrev": 0, "name": "Death Hand", "stringID_full": 0, "wsa": "gold-bb.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 1 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 32, 4, 0, 250, 2, 278, -1, 255, 2, 0, 0, 15, 100, 11, 255, 42], [{ "stringID_abbrev": 0, "name": "Rocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 1, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 1, "isNormalUnit": 0 }, 16, 4, 7, 200, 2, 258, -1, 255, 2, 0, 0, 8, 75, 3, 255, 42], [{ "stringID_abbrev": 0, "name": "ARocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 1, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 0, "isNormalUnit": 0 }, 16, 4, 7, 160, 8, 258, -1, 255, 2, 0, 0, 60, 75, 3, 255, 42], [{ "stringID_abbrev": 0, "name": "GRocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 1, "isNormalUnit": 0 }, 16, 4, 7, 200, 2, 258, -1, 255, 2, 0, 0, 7, 75, 7, 255, 42], [{ "stringID_abbrev": 0, "name": "MiniRocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 0, "isNormalUnit": 0 }, 8, 4, 7, 180, 5, 268, -1, 255, 2, 0, 0, 3, 0, 18, 255, 64], [{ "stringID_abbrev": 0, "name": "Bullet", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 1, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 8, 4, 0, 250, 0, 174, -1, 255, 0, 0, 0, 0, 0, 0, 255, -1], [{ "stringID_abbrev": 0, "name": "Sonic Blast", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 1, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 1, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 32, 4, 7, 200, 0, 160, -1, 255, 0, 0, 0, 10, 25, 65535, 255, -1], [{ "stringID_abbrev": 230, "name": "Sandworm", "stringID_full": 231, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 1, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 1, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 1e3, "fogUncoverRadius": 0, "spriteID": 105, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 8 }, 16, 17, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 24, 5, 0, 35, 3, 161, -1, 255, 1, 0, 20, 0, 300, 13, 25, 63], [{ "stringID_abbrev": 0, "name": "Frigate", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 1, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 100, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 11, 11, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 32, 4, 0, 130, 2, 298, -1, 255, 1, 0, 0, 0, 0, 65535, 255, -1]];
var g_table_structureInfo = [[{ "stringID_abbrev": 232, "name": "Concrete", "stringID_full": 233, "wsa": "slab.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 1, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 20, "fogUncoverRadius": 1, "spriteID": 65, "buildCredits": 5, "buildTime": 16, "availableCampaign": 1, "structuresRequired": 0, "sortPriority": 2, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 341, "priorityBuild": 0, "priorityTarget": 5, "availableHouse": 63 }, 0, 0, 0, 0, 8, [2, 2, 2], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 234, "name": "Concrete4", "stringID_full": 235, "wsa": "4slab.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 1, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 20, "fogUncoverRadius": 1, "spriteID": 83, "buildCredits": 20, "buildTime": 16, "availableCampaign": 4, "structuresRequired": 0, "sortPriority": 4, "upgradeLevelRequired": 1, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 341, "priorityBuild": 0, "priorityTarget": 10, "availableHouse": 63 }, 0, 0, 0, 3, 8, [2, 2, 2], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 236, "name": "Palace", "stringID_full": 237, "wsa": "palace.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 1e3, "fogUncoverRadius": 5, "spriteID": 66, "buildCredits": 999, "buildTime": 130, "availableCampaign": 8, "structuresRequired": 2048, "sortPriority": 5, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 342, "priorityBuild": 0, "priorityTarget": 400, "availableHouse": 63 }, 0, 0, 80, 6, 11, [4, 4, 4], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 238, "name": "Light Fctry", "stringID_full": 239, "wsa": "liteftry.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 350, "fogUncoverRadius": 3, "spriteID": 67, "buildCredits": 400, "buildTime": 96, "availableCampaign": 3, "structuresRequired": 4608, "sortPriority": 14, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 343, "priorityBuild": 0, "priorityTarget": 200, "availableHouse": 63 }, 0, 0, 20, 3, 12, [14, 15, 16], [13, 15, 255, 255, 255, 255, 255, 255], [3, 0, 0]], [{ "stringID_abbrev": 240, "name": "Heavy Fctry", "stringID_full": 241, "wsa": "hvyftry.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 3, "spriteID": 68, "buildCredits": 600, "buildTime": 144, "availableCampaign": 4, "structuresRequired": 262664, "sortPriority": 28, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 344, "priorityBuild": 0, "priorityTarget": 600, "availableHouse": 63 }, 0, 0, 35, 5, 13, [11, 12, 13], [10, 7, 16, 9, 11, 8, 17, 12], [4, 5, 6]], [{ "stringID_abbrev": 242, "name": "Hi-Tech", "stringID_full": 243, "wsa": "hitcftry.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 69, "buildCredits": 500, "buildTime": 120, "availableCampaign": 5, "structuresRequired": 262664, "sortPriority": 30, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 345, "priorityBuild": 0, "priorityTarget": 200, "availableHouse": 63 }, 0, 0, 35, 5, 14, [8, 9, 10], [0, 1, 255, 255, 255, 255, 255, 255], [7, 0, 0]], [{ "stringID_abbrev": 244, "name": "IX", "stringID_full": 245, "wsa": "ix.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 192, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 70, "buildCredits": 500, "buildTime": 120, "availableCampaign": 7, "structuresRequired": 6656, "sortPriority": 34, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 346, "priorityBuild": 0, "priorityTarget": 100, "availableHouse": 63 }, 0, 0, 40, 3, 15, [20, 20, 20], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 246, "name": "WOR", "stringID_full": 247, "wsa": "wor.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 71, "buildCredits": 400, "buildTime": 104, "availableCampaign": 5, "structuresRequired": 263680, "sortPriority": 20, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 347, "priorityBuild": 0, "priorityTarget": 175, "availableHouse": 61 }, 0, 0, 20, 3, 16, [21, 21, 21], [5, 3, 255, 255, 255, 255, 255, 255], [6, 0, 0]], [{ "stringID_abbrev": 248, "name": "Const Yard", "stringID_full": 249, "wsa": "construc.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 1, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 72, "buildCredits": 400, "buildTime": 80, "availableCampaign": 99, "structuresRequired": -1, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 348, "priorityBuild": 0, "priorityTarget": 300, "availableHouse": 63 }, 0, 0, 0, 3, 17, [22, 22, 22], [255, 255, 255, 255, 255, 255, 255, 255], [4, 6, 0]], [{ "stringID_abbrev": 250, "name": "Windtrap", "stringID_full": 251, "wsa": "windtrap.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 2, "spriteID": 73, "buildCredits": 300, "buildTime": 48, "availableCampaign": 1, "structuresRequired": 0, "sortPriority": 6, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 349, "priorityBuild": 0, "priorityTarget": 300, "availableHouse": 63 }, 0, 0, -100, 3, 19, [26, 26, 26], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 252, "name": "Barracks", "stringID_full": 253, "wsa": "barrac.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 300, "fogUncoverRadius": 2, "spriteID": 74, "buildCredits": 300, "buildTime": 72, "availableCampaign": 2, "structuresRequired": 262656, "sortPriority": 18, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 350, "priorityBuild": 0, "priorityTarget": 100, "availableHouse": 62 }, 0, 0, 10, 3, 18, [28, 28, 28], [4, 2, 255, 255, 255, 255, 255, 255], [2, 0, 0]], [{ "stringID_abbrev": 254, "name": "Starport", "stringID_full": 255, "wsa": "starport.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 1, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 500, "fogUncoverRadius": 6, "spriteID": 75, "buildCredits": 500, "buildTime": 120, "availableCampaign": 6, "structuresRequired": 4608, "sortPriority": 32, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 351, "priorityBuild": 0, "priorityTarget": 250, "availableHouse": 63 }, 0, 0, 50, 6, 20, [5, 6, 7], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 256, "name": "Refinery", "stringID_full": 257, "wsa": "refinery.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 1, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 450, "fogUncoverRadius": 4, "spriteID": 76, "buildCredits": 400, "buildTime": 80, "availableCampaign": 1, "structuresRequired": 512, "sortPriority": 8, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 352, "priorityBuild": 0, "priorityTarget": 300, "availableHouse": 63 }, 65536, 1005, 30, 5, 21, [17, 18, 19], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 258, "name": "Repair", "stringID_full": 259, "wsa": "repair.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 200, "fogUncoverRadius": 3, "spriteID": 77, "buildCredits": 700, "buildTime": 80, "availableCampaign": 5, "structuresRequired": 262664, "sortPriority": 24, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 353, "priorityBuild": 0, "priorityTarget": 600, "availableHouse": 63 }, 130944, 0, 20, 5, 22, [23, 24, 25], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 260, "name": "Wall", "stringID_full": 261, "wsa": "wall.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 50, "fogUncoverRadius": 1, "spriteID": 78, "buildCredits": 50, "buildTime": 40, "availableCampaign": 4, "structuresRequired": 262656, "sortPriority": 16, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 354, "priorityBuild": 0, "priorityTarget": 30, "availableHouse": 63 }, 0, 0, 0, 0, 6, [255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 262, "name": "Turret", "stringID_full": 263, "wsa": "turret.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 2, "spriteID": 79, "buildCredits": 125, "buildTime": 64, "availableCampaign": 5, "structuresRequired": 262656, "sortPriority": 22, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 355, "priorityBuild": 75, "priorityTarget": 150, "availableHouse": 63 }, 0, 0, 10, 0, 23, [255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 264, "name": "R-Turret", "stringID_full": 265, "wsa": "rturret.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 5, "spriteID": 80, "buildCredits": 250, "buildTime": 96, "availableCampaign": 0, "structuresRequired": 262656, "sortPriority": 26, "upgradeLevelRequired": 2, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 356, "priorityBuild": 100, "priorityTarget": 75, "availableHouse": 63 }, 0, 0, 25, 0, 24, [255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 266, "name": "Spice Silo", "stringID_full": 267, "wsa": "storage.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 150, "fogUncoverRadius": 2, "spriteID": 81, "buildCredits": 150, "buildTime": 48, "availableCampaign": 2, "structuresRequired": 4608, "sortPriority": 12, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 357, "priorityBuild": 0, "priorityTarget": 150, "availableHouse": 63 }, 0, 1e3, 5, 3, 25, [27, 27, 27], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 268, "name": "Outpost", "stringID_full": 269, "wsa": "headqrts.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 500, "fogUncoverRadius": 10, "spriteID": 82, "buildCredits": 400, "buildTime": 80, "availableCampaign": 2, "structuresRequired": 512, "sortPriority": 10, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 358, "priorityBuild": 0, "priorityTarget": 275, "availableHouse": 63 }, 0, 0, 30, 3, 26, [3, 3, 3], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]]];
var g_table_structure_layoutTiles = { "_0": [0, 0, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x1": [0, 1, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x1": [0, 64, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x2": [0, 1, 64, 65, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x2": [0, 1, 64, 65, 128, 129, 0, 0, 0], "STRUCTURE_LAYOUT_2x3": [0, 1, 2, 64, 65, 66, 0, 0, 0], "STRUCTURE_LAYOUT_3x2": [0, 1, 2, 64, 65, 66, 128, 129, 130] };
var g_table_structure_layoutEdgeTiles = { "_0": [0, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x1": [0, 1, 1, 1, 1, 0, 0, 0], "STRUCTURE_LAYOUT_2x1": [0, 0, 0, 64, 64, 64, 0, 0], "STRUCTURE_LAYOUT_1x2": [0, 1, 1, 65, 65, 64, 64, 0], "STRUCTURE_LAYOUT_2x2": [0, 1, 65, 129, 129, 128, 64, 0], "STRUCTURE_LAYOUT_2x3": [1, 2, 2, 66, 65, 64, 0, 0], "STRUCTURE_LAYOUT_3x2": [1, 2, 66, 130, 129, 128, 64, 0] };
var g_table_structure_layoutTileCount = { "_0": 1, "STRUCTURE_LAYOUT_1x1": 2, "STRUCTURE_LAYOUT_2x1": 2, "STRUCTURE_LAYOUT_1x2": 4, "STRUCTURE_LAYOUT_2x2": 6, "STRUCTURE_LAYOUT_2x3": 6, "STRUCTURE_LAYOUT_3x2": 9 };
var g_table_structure_layoutTileDiff = { "_0": [128, 128], "STRUCTURE_LAYOUT_1x1": [256, 128], "STRUCTURE_LAYOUT_2x1": [128, 256], "STRUCTURE_LAYOUT_1x2": [256, 256], "STRUCTURE_LAYOUT_2x2": [256, 384], "STRUCTURE_LAYOUT_2x3": [640, 256], "STRUCTURE_LAYOUT_3x2": [384, 384] };
var g_table_structure_layoutSize = { "_0": [1, 1], "STRUCTURE_LAYOUT_1x1": [2, 1], "STRUCTURE_LAYOUT_2x1": [1, 2], "STRUCTURE_LAYOUT_1x2": [2, 2], "STRUCTURE_LAYOUT_2x2": [2, 3], "STRUCTURE_LAYOUT_2x3": [3, 2], "STRUCTURE_LAYOUT_3x2": [3, 3] };
var g_table_structure_layoutTilesAround = { "_0": [-64, -63, 1, 65, 64, 63, -1, -65, 0, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x1": [-64, -63, -62, 2, 66, 65, 64, 63, -1, -65, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x1": [-64, -63, 1, 65, 129, 128, 127, 63, -1, -65, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x2": [-64, -63, -62, 2, 66, 130, 129, 128, 127, 63, -1, -65, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x2": [-64, -63, -62, 2, 66, 130, 194, 193, 192, 191, 127, 63, -1, -65, 0, 0], "STRUCTURE_LAYOUT_2x3": [-64, -63, -62, -61, 3, 67, 131, 130, 129, 128, 127, 63, -1, -65, 0, 0], "STRUCTURE_LAYOUT_3x2": [-64, -63, -62, -61, 3, 67, 131, 195, 194, 193, 192, 191, 127, 63, -1, -65] };

// web/src/engine/tables.ts
function objectInfo(raw) {
  const o = { ...raw };
  o.flags = raw.flags ?? raw._4;
  delete o._4;
  return o;
}
function unitInfoFrom(raw) {
  const [o, indexStart, indexEnd, flags, dimension, movementType, animationSpeed, movingSpeedFactor, turningSpeed, groundSpriteID, turretSpriteID, actionAI, displayMode, destroyedSpriteID, fireDelay, fireDistance, damage, explosionType, bulletType, bulletSound] = raw;
  return {
    o: objectInfo(o),
    indexStart,
    indexEnd,
    flags,
    dimension,
    movementType,
    animationSpeed,
    movingSpeedFactor,
    turningSpeed,
    groundSpriteID,
    turretSpriteID: turretSpriteID & 65535,
    actionAI,
    displayMode,
    destroyedSpriteID,
    fireDelay,
    fireDistance,
    damage,
    explosionType: explosionType & 65535,
    bulletType: bulletType & 255,
    bulletSound
  };
}
function structureInfoFrom(raw) {
  const [o, enterFilter, creditsStorage, powerUsage, layout, iconGroup, animationIndex, buildableUnits, upgradeCampaign] = raw;
  return { o: objectInfo(o), animations: [null, null, null], enterFilter, creditsStorage, powerUsage, layout, iconGroup, animationIndex, buildableUnits, upgradeCampaign };
}
var arr = (v) => Array.isArray(v) ? v : Object.values(v);
var unitInfo = g_table_unitInfo.map(unitInfoFrom);
var structureInfo = g_table_structureInfo.map(structureInfoFrom);
var tableTileDiff = g_table_tilediff.map((row) => row.map(([x, y]) => ({ x, y })));
var layoutTiles = arr(g_table_structure_layoutTiles);
var layoutTileCount = arr(g_table_structure_layoutTileCount);
var layoutTileDiff = arr(g_table_structure_layoutTileDiff).map(([x, y]) => ({ x, y }));
var layoutSize = arr(g_table_structure_layoutSize).map(([width, height]) => ({ width, height }));
var layoutTilesAround = arr(g_table_structure_layoutTilesAround);
var layoutEdgeTiles = arr(g_table_structure_layoutEdgeTiles);
var iconLandscape = new Int8Array(512).fill(-1);
var animationStructureRubble = g_table_animation_structure[0];
var animationStructureBuild = g_table_animation_structure[1];

// web/src/engine/core.ts
var u16 = (v) => v & 65535;
var IT = /* @__PURE__ */ ((IT2) => {
  IT2[IT2["NONE"] = 0] = "NONE";
  IT2[IT2["TILE"] = 1] = "TILE";
  IT2[IT2["UNIT"] = 2] = "UNIT";
  IT2[IT2["STRUCTURE"] = 3] = "STRUCTURE";
  return IT2;
})(IT || {});
var UNIT_INDEX_MAX = 102;
var STRUCTURE_INDEX_MAX_HARD = 82;
var TEAM_INDEX_MAX = 16;
var HOUSE_MAX = 6;
var INDEX_INVALID = 65535;
var SELECTION = { MENTAT: 0, TARGET: 1, PLACE: 2, UNIT: 3, STRUCTURE: 4, DEBUG: 5 };
function newFlags() {
  return {
    used: false,
    allocated: false,
    isNotOnMap: false,
    isSmoking: false,
    fireTwiceFlip: false,
    animationFlip: false,
    bulletIsBig: false,
    isWobbling: false,
    inTransport: false,
    byScenario: false,
    degrades: false,
    isHighlighted: false,
    isDirty: false,
    repairing: false,
    onHold: false,
    isUnit: false,
    upgrading: false
  };
}
function newScript() {
  return { delay: 0, pc: -1, scriptInfo: null, returnValue: 0, framePointer: 2, stackPointer: 15, variables: [0, 0, 0, 0, 0], stack: new Array(15).fill(0), isSubroutine: 0 };
}
function newObject() {
  return { index: 0, type: 0, linkedID: 255, flags: newFlags(), houseID: 0, seenByHouses: 0, position: { x: 0, y: 0 }, hitpoints: 0, script: newScript() };
}
function newUnit() {
  return {
    o: newObject(),
    currentDestination: { x: 0, y: 0 },
    originEncoded: 0,
    repairTime: 0,
    actionID: 0,
    nextActionID: 0,
    fireDelay: 0,
    distanceToDestination: 0,
    targetAttack: 0,
    targetMove: 0,
    amount: 0,
    deviated: 0,
    deviatedHouse: 0,
    targetLast: { x: 0, y: 0 },
    targetPreLast: { x: 0, y: 0 },
    orientation: [{ speed: 0, target: 0, current: 0 }, { speed: 0, target: 0, current: 0 }],
    speedPerTick: 0,
    speedRemainder: 0,
    speed: 0,
    movingSpeed: 0,
    wobbleIndex: 0,
    spriteOffset: 0,
    blinkCounter: 0,
    recoil: false,
    recoilShown: false,
    team: 0,
    timer: 0,
    route: new Array(14).fill(0),
    patrolActive: false,
    patrolStart: { x: 0, y: 0 },
    patrolEnd: { x: 0, y: 0 },
    patrolToEnd: true,
    patrolEngaging: false
  };
}
function newStructure() {
  return { o: newObject(), creatorHouseID: 0, rotationSpriteDiff: 0, objectType: 0, upgradeLevel: 0, upgradeTimeLeft: 0, countDown: 0, buildCostRemainder: 0, state: 0, hitpointsMax: 0, specialWait: 0, spent: 0 };
}
function newHouse() {
  return {
    index: 0,
    harvestersIncoming: 0,
    flags: { used: false, human: false, doneFullScaleAttack: false, isAIActive: false, radarActivated: false },
    unitCount: 0,
    unitCountMax: 0,
    unitCountEnemy: 0,
    unitCountAllied: 0,
    structuresBuilt: 0,
    credits: 0,
    creditsStorage: 0,
    powerProduction: 0,
    powerUsage: 0,
    windtrapCount: 0,
    creditsQuota: 0,
    palacePosition: { x: 0, y: 0 },
    timerUnitAttack: 0,
    timerSandwormAttack: 0,
    timerStructureAttack: 0,
    starportTimeLeft: 0,
    starportLinkedID: INDEX_INVALID,
    ai_structureRebuild: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]
  };
}
function newTeam() {
  return { index: 0, flags: { used: false }, members: 0, minMembers: 0, maxMembers: 0, movementType: 0, action: 0, actionStart: 0, houseID: 0, position: { x: 0, y: 0 }, targetTile: 0, target: 0, script: newScript() };
}
function newTile() {
  return { groundTileID: 0, overlayTileID: 0, houseID: 0, isUnveiled: false, hasUnit: false, hasStructure: false, hasAnimation: false, hasExplosion: false, index: 0 };
}
var G = {
  map: Array.from({ length: 4096 }, newTile),
  mapTileID: new Uint16Array(4096),
  units: Array.from({ length: UNIT_INDEX_MAX }, newUnit),
  unitFind: [],
  structures: Array.from({ length: STRUCTURE_INDEX_MAX_HARD }, newStructure),
  structureFind: [],
  houses: Array.from({ length: HOUSE_MAX }, newHouse),
  houseFind: [],
  teams: Array.from({ length: TEAM_INDEX_MAX }, newTeam),
  teamFind: [],
  timerGame: 0,
  playerHouseID: 1,
  mapScale: 0,
  campaignID: 1,
  scenarioID: 1,
  validateStrictIfZero: 0,
  gameSpeed: 2,
  /** 0 — easy, 1 — normal, 2 — hard; set from the front-end before loading a campaign mission. */
  difficulty: 1,
  /** особые иконки (sprites.c) */
  veiledTileID: 0,
  bloomTileID: 0,
  builtSlabTileID: 0,
  landscapeTileID: 0,
  wallTileID: 0,
  /** группы иконок: g_iconMap[g_iconMap[group] + i] */
  iconGroups: [],
  unitSelected: null,
  structureActiveType: 65535,
  houseMissileCountdown: 0,
  unitHouseMissile: null,
  /** верхний левый угол видимой области, клетка (для проверок «в окне») */
  viewportPacked: 0,
  viewportTilesW: 15,
  viewportTilesH: 10,
  scriptCurrentObject: null,
  scriptCurrentUnit: null,
  scriptCurrentStructure: null,
  scriptCurrentTeam: null,
  starportAvailable: new Array(27).fill(0),
  /** скрипты EMC из ROM */
  scriptUnit: null,
  scriptStructure: null,
  scriptTeam: null,
  /** MD: тип ландшафта по номеру иконки ($00581C), −1 — не ландшафт */
  iconLandscape: new Int8Array(512).fill(-1),
  timerGUI: 0,
  tickScenarioStart: 0,
  selectionType: SELECTION.STRUCTURE,
  playerCredits: 65535,
  playerCreditsNoSilo: 0,
  tickHousePowerMaintenance: 0,
  structureIndex: 0,
  unitActive: null,
  activeAction: 65535,
  structureActive: null,
  structureActivePosition: 0,
  factoryWindowConstructionYard: false,
  musicInBattle: 0,
  /** код PLAYTESTER: юниты игрока гибнут только в пасти червя */
  playtester: false,
  /** код LOOKAROUND: туман не рисуется (в оригинале переключатель $FFC198 бит 0) */
  revealAll: false,
  scenario: newScenario(),
  /** звуки и сообщения уходят в интерфейс через эти обработчики */
  onSound: (_id, _pos) => {
  },
  /** Render notifications only; handlers must not change simulation state or consume RNG. */
  onUnitShot: (_unit, _bullet) => {
  },
  onVisualExplosion: (_type, _position) => {
  },
  onConstructionStart: () => {
  },
  onConstructionComplete: () => {
  },
  onFeedback: (_id) => {
  },
  onMessage: (_text, _priority = 0) => {
  },
  onSelect: () => {
  }
};
function newScenario() {
  return {
    winFlags: 0,
    loseFlags: 0,
    timeOut: 0,
    mapScale: 0,
    score: 0,
    killedAllied: 0,
    killedEnemy: 0,
    destroyedAllied: 0,
    destroyedEnemy: 0,
    harvestedAllied: 0,
    harvestedEnemy: 0,
    reinforcement: Array.from({ length: 16 }, () => ({ unitID: INDEX_INVALID, locationID: 0, timeLeft: 0, timeBetween: 0, repeat: 0 }))
  };
}
var packXY = (x, y) => u16(y << 6 | x);
var packedX = (p) => p & 63;
var packedY = (p) => p >> 6 & 63;
function indexGetType(encoded) {
  switch (encoded & 49152) {
    case 16384:
      return 2 /* UNIT */;
    case 32768:
      return 3 /* STRUCTURE */;
    case 49152:
      return 1 /* TILE */;
    default:
      return 0 /* NONE */;
  }
}
function indexDecode(encoded) {
  if (indexGetType(encoded) === 1 /* TILE */) return packXY(encoded >> 1 & 63, encoded >> 8 & 63);
  return encoded & 16383;
}
function indexEncode(index, type) {
  switch (type) {
    case 1 /* TILE */: {
      let ret = (packedX(index) << 1) + 1 << 0;
      ret |= (packedY(index) << 1) + 1 << 7;
      return u16(ret | 49152);
    }
    case 2 /* UNIT */:
      if (index >= UNIT_INDEX_MAX || !G.units[index].o.flags.allocated) return 0;
      return index | 16384;
    case 3 /* STRUCTURE */:
      return index | 32768;
    default:
      return 0;
  }
}
function indexGetUnit(encoded) {
  if (indexGetType(encoded) !== 2 /* UNIT */) return null;
  const i = indexDecode(encoded);
  return i < UNIT_INDEX_MAX ? G.units[i] : null;
}

// web/src/gfx/factory-activity.ts
var parkedRef = {};
function drawFactoryActivity(ctx, s, vehicles, tick, powered) {
  if (!vehicles || !s.built || s.type !== 3 && s.type !== 4) return;
  const produced = s.ref.o.linkedID !== 255 ? G.units[s.ref.o.linkedID] : null;
  const busy = s.ref.state === 1 && !s.ref.o.flags.onHold && powered;
  const types = s.type === 3 ? [13, 15] : [9, 10];
  if (produced?.o.flags.used) types[0] = produced.o.type;
  const w = s.w * 32, h = s.h * 32;
  const slots = [[0.655, 0.73], [0.835, 0.61]];
  ctx.save();
  ctx.beginPath();
  ctx.rect(s.x * 32 + w * 0.525, s.y * 32 + h * 0.48, w * 0.405, h * 0.415);
  ctx.clip();
  for (let i = 0; i < 2; i++) {
    const x = s.x * 32 + w * slots[i][0], y = s.y * 32 + h * slots[i][1];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.64, 0.64);
    const orientation = i === 0 ? 0 : 128, turret = orientation + (busy && i === 0 ? Math.sin(tick / 130) * 12 : 0);
    const unit = {
      id: -1e3 - s.id * 2 - i,
      ref: i === 0 && produced ? produced : parkedRef,
      type: types[i],
      house: s.house,
      x: 0,
      y: 2,
      orientation,
      turret,
      anim: 0,
      state: {},
      air: false,
      shadow: false,
      highlighted: false,
      hp: 256,
      smoke: -1,
      dust: -1
    };
    vehicles.draw(ctx, unit, tick);
    ctx.restore();
    if (busy && i === 0) {
      const a = tick / 45, cx = x + Math.cos(a) * 4, cy = y + Math.sin(a) * 5;
      const pulse = Math.max(0, Math.sin(tick / 11)) ** 4;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 2.6);
      glow.addColorStop(0, `rgba(220,243,255,${pulse * 0.85})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 2.6, cy - 2.6, 5.2, 5.2);
      ctx.strokeStyle = `rgba(255,203,126,${pulse})`;
      ctx.lineWidth = 0.18;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 1.2, cy + 1.6);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - 1, cy + 1.1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// web/src/gfx/refinery-activity.ts
function refineryPadLights(tick) {
  const head = (tick / 10 % 10 + 10) % 10;
  return Array.from({ length: 10 }, (_, i) => {
    const distance = (i - head + 15) % 10 - 5;
    return { x: [76.25, 83.75][i % 2], y: [26.75, 34.5, 42.5, 50.75, 58.9][Math.floor(i / 2)], strength: Math.exp(-distance * distance / 1.2) };
  });
}
function refineryActivity(s) {
  const linked = s.o.linkedID === 255 ? null : G.units[s.o.linkedID];
  const docked = linked?.o.flags.used && linked.o.type === 16 && linked.o.flags.isNotOnMap ? linked : null;
  const reserved = indexGetUnit(s.o.script.variables[4]);
  const destination = indexEncode(s.o.index, 3 /* STRUCTURE */);
  const incoming = G.unitFind.some((u) => u.o.flags.used && u.o.houseID === s.o.houseID && u.targetMove === destination && (u.o.type === 16 || u.o.type === 0 && u.o.linkedID !== 255 && G.units[u.o.linkedID]?.o.type === 16));
  return { active: !!docked || incoming || !!(reserved?.o.flags.used && (reserved.o.type === 16 || reserved.o.type === 0)), docked };
}
function drawRefineryActivity(ctx, s, vehicles, tick) {
  if (s.type !== 12) return;
  const { active, docked: u } = refineryActivity(s.ref);
  if (!active) return;
  const x = s.x * 32, y = s.y * 32;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if (active) {
    for (const light of refineryPadLights(tick)) {
      const xx = x + light.x, yy = y + light.y, pulse = light.strength;
      const glow = ctx.createRadialGradient(xx, yy, 0, xx, yy, 3.05);
      glow.addColorStop(0, `rgba(239,250,255,${0.1 + 0.7 * pulse})`);
      glow.addColorStop(0.62, `rgba(205,235,248,${0.06 + 0.4 * pulse})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(xx - 3.05, yy - 3.05, 6.1, 6.1);
      ctx.strokeStyle = `rgba(226,246,255,${0.08 + 0.65 * pulse})`;
      ctx.lineWidth = 0.22;
      ctx.beginPath();
      ctx.arc(xx, yy, 2.65, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (!u) {
    ctx.restore();
    return;
  }
  const harvester = {
    id: -1,
    ref: u,
    type: 16,
    house: s.house,
    x: x + 80,
    y: y + 48,
    orientation: 0,
    turret: 0,
    anim: 0,
    state: {},
    air: false,
    shadow: false,
    highlighted: false,
    hp: 256,
    smoke: -1,
    dust: -1
  };
  vehicles?.draw(ctx, harvester, tick);
  ctx.restore();
}

// web/src/gfx/cursors.ts
function drawSelection(ctx, x, y, w, h, z, tick = 0, strong = false) {
  const n = Math.min(6 * z, w * 0.22, h * 0.22), line = Math.max(1, z * (strong ? 1 : 0.7));
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const path = () => {
    ctx.beginPath();
    for (const [xx, yy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      ctx.moveTo(xx, yy + sy * n);
      ctx.lineTo(xx, yy);
      ctx.lineTo(xx + sx * n, yy);
    }
  };
  path();
  ctx.strokeStyle = strong ? "#07121af5" : "#14242ecc";
  ctx.lineWidth = line + Math.max(1, z * (strong ? 0.85 : 0.45));
  ctx.stroke();
  if (strong) {
    ctx.shadowColor = "#b5f5ff";
    ctx.shadowBlur = 2 * z;
  }
  path();
  ctx.strokeStyle = strong ? "#efffff" : `rgba(208,238,240,${0.82 + 0.12 * Math.sin(tick / 28)})`;
  ctx.lineWidth = line;
  ctx.stroke();
  ctx.restore();
}
function drawCursor(ctx, kind, x, y, size, tick = 0) {
  if (kind === "select") {
    const side = size * 0.92;
    drawSelection(ctx, x - side / 2, y - side / 2, side, side, side / 32, tick);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const accent = kind === "attack" ? "#ffb47d" : kind === "confirm" ? "#a5ebbd" : "#b9e6e8";
  ctx.strokeStyle = "#15232cd9";
  ctx.lineWidth = 2.2;
  const path = () => {
    ctx.beginPath();
    if (kind === "move") {
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
        const p = (u, v) => [u * c - v * s, u * s + v * c];
        const a0 = p(-3, -11), a1 = p(0, -7.5), a2 = p(3, -11);
        ctx.moveTo(a0[0], a0[1]);
        ctx.lineTo(a1[0], a1[1]);
        ctx.lineTo(a2[0], a2[1]);
      }
    } else if (kind === "attack") {
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      }
    } else {
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.moveTo(-6, 0);
      ctx.lineTo(-1, 5);
      ctx.lineTo(7, -5);
    }
  };
  path();
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 0.85;
  path();
  ctx.stroke();
  if (kind !== "confirm") {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// web/src/gfx/construction-activity.ts
function drawConstructionActivity(ctx, s, tick) {
  for (let site = 0; site < 3; site++) {
    const t = (tick + s.id * 13 + site * 43) % 137;
    if (t > 32) continue;
    const x = (s.x + s.w * (0.28 + site * 0.23)) * 32, y = (s.y + s.h * (0.57 + 0.14 * Math.sin(site * 2.6))) * 32;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = Math.sin(Math.PI * t / 32) ** 2;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 3.2);
    glow.addColorStop(0, "rgba(163,211,255,.32)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(-3.2, -3.2, 6.4, 6.4);
    ctx.shadowColor = "#b9ddff";
    ctx.shadowBlur = 2;
    ctx.fillStyle = "#f1f6ff";
    ctx.beginPath();
    ctx.arc(0, 0, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 0.22;
    ctx.strokeStyle = "#ffca71";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4 + s.id, r = 0.5 + t * 0.055 + i * 0.13, fall = t * t * 13e-4;
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r + fall);
      ctx.lineTo(Math.cos(a) * (r + 0.5), Math.sin(a) * (r + 0.5) + fall + 0.15);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// web/src/gfx/terrain-masks.ts
function visualHash(x, y) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return (n ^ n >>> 16) >>> 0;
}

// web/src/gfx/wall-art.ts
function drawWall(ctx, x, y, size, connections, texture) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  const footprint = () => {
    ctx.beginPath();
    ctx.rect(9, 9, 14, 14);
    if (connections & 1) ctx.rect(10, 0, 12, 16);
    if (connections & 2) ctx.rect(16, 10, 16, 12);
    if (connections & 4) ctx.rect(10, 16, 12, 16);
    if (connections & 8) ctx.rect(0, 10, 16, 12);
  };
  ctx.save();
  ctx.translate(1, 3);
  footprint();
  ctx.fillStyle = "#0a0b0c70";
  ctx.fill();
  ctx.restore();
  footprint();
  ctx.fillStyle = "#504c43";
  ctx.fill();
  ctx.save();
  ctx.translate(0, -2);
  footprint();
  const concrete = ctx.createLinearGradient(0, 4, 24, 27);
  concrete.addColorStop(0, "#d4c6a4");
  concrete.addColorStop(0.45, "#a89c82");
  concrete.addColorStop(1, "#817966");
  ctx.fillStyle = concrete;
  ctx.fill();
  ctx.clip();
  if (texture) {
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.drawImage(texture, 0, 0, 32, 32);
    ctx.restore();
  }
  ctx.strokeStyle = "#e7dcc0aa";
  ctx.lineWidth = 0.6;
  footprint();
  ctx.stroke();
  ctx.fillStyle = "#50595b";
  ctx.fillRect(11, 11, 10, 10);
  ctx.fillStyle = "#98a1a0";
  ctx.fillRect(11.5, 11.5, 9, 1);
  ctx.strokeStyle = "#302f2988";
  ctx.lineWidth = 0.45;
  for (const a of [4, 27]) {
    ctx.beginPath();
    ctx.moveTo(a, 7);
    ctx.lineTo(a, 25);
    ctx.moveTo(7, a);
    ctx.lineTo(25, a);
    ctx.stroke();
  }
  ctx.fillStyle = "#252a2b";
  for (const [bx, by] of [[12, 14], [20, 14], [12, 19], [20, 19]]) {
    ctx.beginPath();
    ctx.arc(bx, by, 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#eadcba35";
  for (let i = 0; i < 26; i++) ctx.fillRect(i * 13 % 29 + 1, i * 19 % 29 + 1, 0.35, 0.3);
  ctx.restore();
  ctx.restore();
}

// web/src/gfx/status-icons.ts
var wrench = new Path2D("M 1 -10 C -3 -11 -7 -7 -5 -3 L -11 3 C -14 6 -10 11 -7 8 L 0 1 C 5 3 10 -1 9 -6 L 5 -2 L 1 -3 L 0 -7 L 3 -10 Z");
var bolt = new Path2D("M 2 -12 L -9 2 L -2 2 L -4 12 L 10 -4 L 3 -4 L 5 -12 Z");
function drawStatusIcon(ctx, kind, x, y, size, tick, seed = 0) {
  const t = tick / 60, phase = t * 3.8 + seed * 0.61, pulse = 0.5 + 0.5 * Math.sin(phase);
  const accent = kind === "power" ? "#ffbd49" : kind === "repair" ? "#8cdad4" : "#9ddd7b";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "#0009";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1.4;
  const metal = ctx.createLinearGradient(0, -16, 0, 16);
  metal.addColorStop(0, "#43505a");
  metal.addColorStop(0.4, "#1c2930");
  metal.addColorStop(1, "#11191e");
  ctx.fillStyle = metal;
  ctx.strokeStyle = "#89969b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-15, -15, 30, 30, 6);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.22 + 0.3 * pulse;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-12.8, -12.8, 25.6, 25.6, 4.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (kind === "repair") {
    ctx.rotate(-0.34 + Math.sin(t * 4 + seed) * 0.13);
    const steel = ctx.createLinearGradient(-8, -8, 8, 8);
    steel.addColorStop(0, "#f3ffff");
    steel.addColorStop(0.5, "#9ebcc5");
    steel.addColorStop(1, "#4b8494");
    ctx.fillStyle = steel;
    ctx.strokeStyle = "#0c161c";
    ctx.lineWidth = 1.1;
    ctx.fill(wrench);
    ctx.stroke(wrench);
    ctx.fillStyle = "#20323a";
    ctx.beginPath();
    ctx.arc(-9, 5.5, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.25 + 0.65 * pulse;
    ctx.fillStyle = "#c6fff1";
    ctx.beginPath();
    ctx.arc(8, 8, 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "power") {
    ctx.globalAlpha = 0.8 + 0.2 * pulse;
    ctx.fillStyle = "#ffd670";
    ctx.strokeStyle = "#7b3e12";
    ctx.lineWidth = 1;
    ctx.fill(bolt);
    ctx.stroke(bolt);
    ctx.globalAlpha = 0.2 + 0.5 * pulse;
    ctx.strokeStyle = "#fff4ba";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(1, -9);
    ctx.lineTo(-6, 0);
    ctx.stroke();
  } else {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-2, 6);
    ctx.lineTo(9, -7);
    ctx.stroke();
  }
  ctx.restore();
}

// web/src/gfx/vehicle-geometry.ts
var angleRadians = (angle) => angle * Math.PI / 128;
function along(angle, distance) {
  const a = angleRadians(angle);
  return { x: Math.sin(a) * distance, y: -Math.cos(a) * distance };
}
function muzzlePoint(x, y, angle, distance = 16) {
  const d = along(angle, distance);
  return { x: x + d.x, y: y - 4 + d.y };
}
var VEHICLES = [
  { type: 0, cell: 0, w: 28, h: 32 },
  { type: 1, cell: 1, w: 9, h: 21 },
  { type: 7, cell: 2, w: 15, h: 18, mount: 2, mw: 11, muzzle: 10 },
  { type: 8, cell: 3, w: 15, h: 18, mount: 3, mw: 11, muzzle: 10 },
  { type: 9, cell: 4, w: 16, h: 19, mount: 0, mw: 10, muzzle: 16 },
  { type: 10, cell: 5, w: 22, h: 21, mount: 1, mw: 13, muzzle: 16 },
  { type: 11, cell: 6, w: 19, h: 22, mount: 4, mw: 13, muzzle: 16 },
  { type: 12, cell: 7, w: 15, h: 18, mount: 5, mw: 10, muzzle: 12 },
  { type: 13, cell: 8, w: 13, h: 15, mount: 6, mw: 6, muzzle: 11 },
  { type: 14, cell: 9, w: 13, h: 15, mount: 7, mw: 6, muzzle: 11 },
  { type: 15, cell: 10, w: 14, h: 14, mount: 8, mw: 8, muzzle: 12 },
  { type: 16, cell: 11, w: 18, h: 31 },
  { type: 17, cell: 12, w: 15, h: 24 },
  { type: 26, cell: 13, w: 21, h: 29 }
];

// web/src/gfx/vehicle-tracks.ts
var VehicleTracks = class {
  marks = [];
  last = /* @__PURE__ */ new WeakMap();
  tick = -1;
  stamps;
  constructor() {
    this.stamps = Array.from({ length: 4 }, (_, index) => {
      const c = document.createElement("canvas");
      c.width = 96;
      c.height = 32;
      const g = c.getContext("2d");
      g.scale(8, 8);
      const rock = index >= 2, wheel = !!(index % 2);
      g.strokeStyle = rock ? "#302c27" : "#49321e";
      g.lineWidth = wheel ? 0.35 : 0.42;
      g.lineCap = "round";
      if (wheel) {
        for (const x of [-4, 4]) {
          g.beginPath();
          g.moveTo(6 + x - 0.22, 0);
          g.lineTo(6 + x - 0.22, 4);
          g.moveTo(6 + x + 0.22, 0);
          g.lineTo(6 + x + 0.22, 4);
          g.stroke();
        }
      } else for (const x of [-4, 4]) {
        if (!rock) {
          g.fillStyle = "#70513055";
          g.fillRect(6 + x - 1, 0, 2, 4);
        }
        for (const y of [0.65, 2]) {
          g.beginPath();
          g.moveTo(6 + x - 0.8, y + 0.2);
          g.lineTo(6 + x + 0.8, y - 0.2);
          g.stroke();
        }
        if (!rock) {
          g.strokeStyle = "#e9ca8d";
          g.lineWidth = 0.18;
          g.beginPath();
          g.moveTo(6 + x - 0.8, 2.45);
          g.lineTo(6 + x + 0.8, 2.05);
          g.stroke();
          g.strokeStyle = "#49321e";
          g.lineWidth = 0.42;
        }
      }
      return c;
    });
  }
  reset() {
    this.marks = [];
    this.last = /* @__PURE__ */ new WeakMap();
    this.tick = -1;
  }
  update(units, tick, isRock) {
    if (tick === this.tick) return;
    this.tick = tick;
    this.marks = this.marks.filter((m) => tick >= m.tick && tick - m.tick < 1800);
    for (const u of units) {
      if (u.air || u.type < 7 || u.type > 17) continue;
      const old = this.last.get(u.ref), current = { x: u.x, y: u.y, tick, remainder: old?.remainder ?? 0 };
      this.last.set(u.ref, current);
      if (!old || tick - old.tick > 10) continue;
      const dx = u.x - old.x, dy = u.y - old.y, distance = Math.hypot(dx, dy);
      if (distance > 24) {
        current.remainder = 0;
        continue;
      }
      if (distance < 1e-3) continue;
      const wheel = u.type >= 13 && u.type <= 15, spacing = wheel ? 1.5 : 1.35;
      const heading = Math.atan2(dx, -dy) * 128 / Math.PI;
      const rear = along(heading, -(u.type === 16 ? 10 : 6));
      for (let d = spacing - old.remainder; d <= distance; d += spacing) {
        const f = d / distance, x = old.x + dx * f + rear.x, y = old.y + dy * f + rear.y;
        this.marks.push({ x, y, angle: heading, tick, rock: isRock(x, y), wheel, width: u.type === 10 ? 20 : u.type === 16 ? 17 : wheel ? 12 : 15 });
      }
      current.remainder = (old.remainder + distance) % spacing;
    }
    if (this.marks.length > 2200) this.marks.splice(0, this.marks.length - 2200);
  }
  draw(ctx, tick, isVisible) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (const m of this.marks) {
      if (!isVisible(m.x, m.y)) continue;
      const age = (tick - m.tick) / 1800;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(angleRadians(m.angle));
      ctx.globalAlpha = (m.rock ? 0.16 : 0.62) * Math.pow(Math.max(0, 1 - age), 1.4);
      ctx.drawImage(this.stamps[(m.rock ? 2 : 0) + (m.wheel ? 1 : 0)], -m.width / 2, -1, m.width, 2.6);
      ctx.restore();
    }
    ctx.restore();
  }
};

// web/src/rom/lcw.ts
var LcwError = class extends Error {
};
function lcwDecompress(src, start = 0, maxOut = 65536) {
  const out = new Uint8Array(maxOut);
  let o = 0;
  let i = start;
  for (; ; ) {
    if (i >= src.length) throw new LcwError("\u043F\u043E\u0442\u043E\u043A \u0432\u044B\u0448\u0435\u043B \u0437\u0430 \u043A\u043E\u043D\u0435\u0446 ROM");
    const cmd = src[i++];
    if ((cmd & 128) === 0) {
      const count = (cmd >> 4) + 3;
      const rel = (cmd & 15) << 8 | src[i++];
      let from = o - rel;
      if (from < 0 || rel === 0) throw new LcwError("\u043F\u043B\u043E\u0445\u043E\u0435 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u0435");
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      for (let k = 0; k < count; k++) out[o++] = out[from++];
    } else if ((cmd & 64) === 0) {
      if (cmd === 128) return { data: out.slice(0, o), consumed: i - start };
      const count = cmd & 63;
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      out.set(src.subarray(i, i + count), o);
      o += count;
      i += count;
    } else if (cmd === 254) {
      const count = src[i] | src[i + 1] << 8;
      const value = src[i + 2];
      i += 3;
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      out.fill(value, o, o + count);
      o += count;
    } else {
      let count;
      let from;
      if (cmd === 255) {
        count = src[i] | src[i + 1] << 8;
        from = src[i + 2] | src[i + 3] << 8;
        i += 4;
      } else {
        count = (cmd & 63) + 3;
        from = src[i] | src[i + 1] << 8;
        i += 2;
      }
      if (count && from >= o) throw new LcwError("\u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u043E\u0435 \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u043C\u0438");
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      for (let k = 0; k < count; k++) out[o++] = out[from++];
    }
  }
}

// web/src/rom/md.ts
var CRAM_LEVELS = [0, 52, 87, 116, 144, 172, 206, 255];
function cramToRGBA(word, alpha = 255) {
  const r = CRAM_LEVELS[word >> 1 & 7];
  const g = CRAM_LEVELS[word >> 5 & 7];
  const b = CRAM_LEVELS[word >> 9 & 7];
  return (alpha << 24 | b << 16 | g << 8 | r) >>> 0;
}
function readU16(b, at) {
  return b[at] << 8 | b[at + 1];
}
function readU32(b, at) {
  return (b[at] << 24 | b[at + 1] << 16 | b[at + 2] << 8 | b[at + 3]) >>> 0;
}

// web/src/rom/scenario.ts
var FILE_TABLE = 339028;
var FILE_COUNT = 33;
var HOUSE_SECTION = { 2: 0, 3: 1, 4: 2, 5: 4 };
function readFiles(rom) {
  const files = /* @__PURE__ */ new Map();
  for (let i = 0; i < FILE_COUNT; i++) {
    const namePtr = readU32(rom, FILE_TABLE + i * 8);
    const dataPtr = readU32(rom, FILE_TABLE + i * 8 + 4);
    let name = "";
    for (let p = namePtr; rom[p]; p++) name += String.fromCharCode(rom[p]);
    files.set(name, dataPtr);
  }
  return files;
}
function parseScenario(rom, name, start) {
  const sc = {
    name,
    losePicture: "",
    winPicture: "",
    briefPicture: "",
    timeOut: 0,
    mapScale: 0,
    mapIndex: 1,
    cursor: { x: 0, y: 0 },
    tactical: { x: 0, y: 0 },
    loseFlags: 0,
    winFlags: 0,
    bloom: [],
    field: [],
    houses: [],
    choam: /* @__PURE__ */ new Map(),
    teams: [],
    units: [],
    structures: [],
    reinforcements: []
  };
  let p = start;
  const word = () => {
    const v = readU16(rom, p);
    p += 2;
    return v;
  };
  let shift = 0;
  const xy = (packed) => ({ x: (packed & 63) + shift, y: (packed >> 6) + shift });
  const houses = /* @__PURE__ */ new Map();
  const house = (section) => {
    const id = HOUSE_SECTION[section];
    if (!houses.has(id)) houses.set(id, { id, credits: 0, quota: 0, brain: "cpu", maxUnits: 39 });
    return houses.get(id);
  };
  for (let guard = 0; guard < 1e4; guard++) {
    const head = word();
    if (head === 65535) break;
    const section = head >> 8;
    const key = head & 255;
    if (section === 0 && key <= 2) {
      const len = word();
      let s = "";
      for (let k = 0; k < len && rom[p + k]; k++) s += String.fromCharCode(rom[p + k]);
      p += len + (len & 1);
      if (key === 0) sc.losePicture = s;
      else if (key === 1) sc.winPicture = s;
      else sc.briefPicture = s;
      continue;
    }
    switch (section) {
      case 0: {
        const v = word();
        if (key === 3) sc.timeOut = v;
        else if (key === 4) {
          sc.mapScale = v;
          shift = v === 1 ? 16 : 0;
        } else if (key === 5) sc.cursor = xy(v);
        else if (key === 6) sc.tactical = xy(v);
        else if (key === 7) sc.loseFlags = v;
        else if (key === 8) sc.winFlags = v;
        break;
      }
      case 1: {
        if (key === 83) sc.mapIndex = word();
        else {
          const n = word();
          const list = [];
          for (let k = 0; k < n; k++) list.push(xy(word()));
          if (key === 66) sc.bloom.push(...list);
          else sc.field.push(...list);
        }
        break;
      }
      case 2:
      case 3:
      case 4:
      case 5: {
        const h = house(section);
        const v = word();
        if (key === 81) h.quota = v;
        else if (key === 67) h.credits = v;
        else if (key === 66) h.brain = v === 72 ? "human" : "cpu";
        else if (key === 77) h.maxUnits = v;
        break;
      }
      case 6:
        sc.choam.set(key, word());
        break;
      case 7: {
        const [h, aiMode, movement, min, max] = [word(), word(), word(), word(), word()];
        sc.teams.push({
          house: h,
          aiMode: String.fromCharCode(aiMode),
          movement: String.fromCharCode(movement),
          min,
          max
        });
        break;
      }
      case 8: {
        const [h, type, hp, pos, orientation, action] = [word(), word(), word(), word(), word(), word()];
        sc.units.push({ house: h, type, hp, ...xy(pos), orientation, action });
        break;
      }
      case 9:
        if (key === 73) {
          word();
          const [h, type, hp, pos] = [word(), word(), word(), word()];
          sc.structures.push({ house: h, type, hp, ...xy(pos) });
        } else {
          const [pos, h, type] = [word(), word(), word()];
          sc.structures.push({ house: h, type, hp: 256, ...xy(pos) });
        }
        break;
      case 10:
        sc.reinforcements.push({ values: [word(), word(), word(), word()] });
        break;
      default:
        throw new Error(`${name}: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0441\u0435\u043A\u0446\u0438\u044F ${section} \u043F\u043E \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u044E ${(p - start).toString(16)}`);
    }
  }
  sc.houses = [...houses.values()];
  return sc;
}

// web/src/rom/dune.ts
var ROM = {
  /** иконки клеток: 362 записи по 16 слов плоскости (4×4 тайла) */
  iconTable: 306672,
  iconCount: 362,
  /** тайлы ландшафта и зданий: 8 LCW-потоков → адрес в VRAM */
  terrainVram: [
    [771384, 0],
    [773442, 4096],
    [776052, 8192],
    [778764, 12288],
    [781612, 16384],
    [784630, 20480],
    [787712, 24576],
    [790416, 28672]
  ],
  /** игровая палитра, 4 строки CRAM */
  gamePalette: 683160,
  /** готовые карты миссий: 27 указателей, бит 31 — карта 32×32 */
  mapTable: 111226,
  mapCount: 27,
  /** картинки меню строительства 96×56 */
  structurePictureTable: 557732,
  structurePictureCount: 19,
  unitPictureTable: 586192,
  unitPictureCount: 19,
  /** группы иконок по типам (как iconMap в PC); сразу за ними идёт iconTable */
  iconGroups: 305712,
  /** список загрузки спрайтов в VRAM: [слово адрес VRAM][слово длина в словах][длинное слово источник, бит 31 — без сжатия] */
  spriteLoadTable: 42124,
  /** кадры спрайтов: [длинное слово источник тайлов, бит 31 — сырые тайлы в ROM][флаг<<24 | описание кусков] */
  frameTable: 396940,
  /** указатели на описания юнитов (+70 — первый кадр, +76 — способ выбора кадра) */
  unitInfoTable: 443836,
  unitTypeCount: 27,
  /** строка палитры по дому: слово плоскости, биты 13–14 */
  housePalette: 38280,
  /** направление → [смещение кадра, отражение] для 8 и 16 направлений и для пехоты */
  dir8: 444008,
  dir16: 444040,
  dirInfantry: 443976,
  /** фазы шага пехоты, 4 байта */
  infantryAnim: 444104,
  /** кадры звуковой волны по 16 направлениям (код $0124AC) */
  sonicFrames: 444108,
  /** башни танка и осадного танка: тип юнита → таблица кадров */
  turretFrames: { 9: 191610, 10: 193274 },
  /** то же сразу после выстрела (отдача башни): ставятся в $044B74 через $2EC6E/$2EC74 */
  recoilFrames: { 9: 194938, 10: 196602 },
  /**
   * Значки над зданиями игрока ($00DC9C): таблицы описаний кадров по индексу, индекс 3 — двор (центр 2×2),
   * 6 — дворец (центр 3×3). Смещение куска — от левого верхнего угла здания. Тайлы уже в VRAM спрайтов.
   */
  statusIcons: {
    /** «OK»: заказ двора готов, ракета дворца готова ($009A66) */
    ok: 39610,
    /** молоток: здание ремонтируется ($009B2A) */
    repair: 416254,
    /** молния над ветряком при нехватке энергии ($009ADA) — одно описание, не таблица */
    lightning: 415976
  },
  /** курсоры карты: атака, движение, рамка, подтверждение — по 0x100 байт сырых тайлов */
  cursorTiles: 411974,
  cursorPaletteLine: 3
};
var MAP_SIZE = 64;
var CELL_PX = 32;
var RomError = class extends Error {
};
var DuneRom = class _DuneRom {
  bytes;
  title;
  constructor(bytes) {
    this.bytes = bytes;
    this.title = _DuneRom.readTitle(bytes);
    _DuneRom.validate(bytes);
  }
  /** Имя игры из заголовка ($150, 48 байт). */
  static readTitle(bytes) {
    let s = "";
    for (let i = 336; i < 384; i++) s += String.fromCharCode(bytes[i]);
    return s.trim();
  }
  static validate(bytes) {
    if (bytes.length < 1048576) throw new RomError("\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u0439 \u0434\u043B\u044F ROM Mega Drive (\u043D\u0443\u0436\u0435\u043D 1 \u041C\u0411).");
    if (String.fromCharCode(...bytes.subarray(256, 260)) !== "SEGA")
      throw new RomError(
        "\u042D\u0442\u043E \u043D\u0435 ROM Mega Drive: \u043D\u0435\u0442 \u043F\u043E\u0434\u043F\u0438\u0441\u0438 SEGA \u043F\u043E \u0430\u0434\u0440\u0435\u0441\u0443 0x100. \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0444\u0430\u0439\u043B \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 .smd \u2014 \u043D\u0443\u0436\u0435\u043D .bin/.gen/.md."
      );
    if (!_DuneRom.readTitle(bytes).startsWith("DUNE"))
      throw new RomError(`\u042D\u0442\u043E \u0434\u0440\u0443\u0433\u0430\u044F \u0438\u0433\u0440\u0430: \xAB${_DuneRom.readTitle(bytes)}\xBB. \u041D\u0443\u0436\u043D\u0430 Dune: The Battle for Arrakis.`);
    try {
      for (const [src] of ROM.terrainVram) lcwDecompress(bytes, src);
    } catch {
      throw new RomError("\u0412\u0435\u0440\u0441\u0438\u044F ROM \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u043E\u0439: \u0442\u0430\u0439\u043B\u044B \u043B\u0430\u043D\u0434\u0448\u0430\u0444\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u043F\u043E \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u043C \u0430\u0434\u0440\u0435\u0441\u0430\u043C.");
    }
  }
  cache = /* @__PURE__ */ new Map();
  memo(key, make) {
    if (!this.cache.has(key)) this.cache.set(key, make());
    return this.cache.get(key);
  }
  /** VRAM с тайлами ландшафта и зданий, как после загрузки миссии. */
  terrainVram() {
    return this.memo("terrainVram", () => {
      const vram = new Uint8Array(65536);
      for (const [src, dst] of ROM.terrainVram) vram.set(lcwDecompress(this.bytes, src).data, dst);
      return vram;
    });
  }
  /** VRAM с тайлами спрайтов поверх тайлов ландшафта (список загрузки $00A48C). */
  spriteVram() {
    return this.memo("spriteVram", () => {
      const vram = this.terrainVram().slice();
      for (let p = ROM.spriteLoadTable; ; p += 8) {
        const dst = readU16(this.bytes, p);
        const words = readU16(this.bytes, p + 2);
        const src = readU32(this.bytes, p + 4);
        if (!dst && !words) break;
        const addr = src & 16777215;
        const data = src & 2147483648 ? this.bytes.subarray(addr, addr + words * 2) : lcwDecompress(this.bytes, addr).data.subarray(0, words * 2);
        vram.set(data, dst);
      }
      return vram;
    });
  }
  frame(index) {
    const p = ROM.frameTable + index * 8;
    const tiles = readU32(this.bytes, p);
    const def = readU32(this.bytes, p + 4);
    return this.frameDef(def & 16777215, index, def >>> 24, tiles & 2147483648 ? tiles & 16777215 : null);
  }
  /** Описание кадра: [слово кол-во кусков − 1], затем куски по 12 байт (y, размер, атрибуты, x). */
  frameDef(addr, index = -1, flag = 0, rawSource = null) {
    const count = readU16(this.bytes, addr) + 1;
    const pieces = [];
    const s16 = (at) => readU16(this.bytes, at) << 16 >> 16;
    for (let i = 0; i < count; i++) {
      const p = addr + 2 + i * 12;
      const size = readU16(this.bytes, p + 6);
      pieces.push({
        y: s16(p + 4),
        x: s16(p + 10),
        tw: (size >> 10 & 3) + 1,
        th: (size >> 8 & 3) + 1,
        attr: readU16(this.bytes, p + 8)
      });
    }
    return { index, pieces, flag, rawSource };
  }
  unitDisplay(type) {
    const info = readU32(this.bytes, ROM.unitInfoTable + type * 4);
    return {
      baseFrame: readU16(this.bytes, info + 70),
      mode: readU16(this.bytes, info + 76) << 16 >> 16
    };
  }
  housePaletteLine(house) {
    return readU16(this.bytes, ROM.housePalette + (house & 7) * 2) >> 13 & 3;
  }
  /** Номера иконок группы: в начале таблицы — 27 смещений групп (в словах), дальше сами номера. */
  iconGroup(group) {
    const base = ROM.iconGroups;
    const from = readU16(this.bytes, base + group * 2);
    const to = group + 1 < 27 ? readU16(this.bytes, base + (group + 1) * 2) : (ROM.iconTable - base) / 2;
    const out = new Uint16Array(to - from);
    for (let i = 0; i < out.length; i++) out[i] = readU16(this.bytes, base + (from + i) * 2);
    return out;
  }
  files() {
    return this.memo("files", () => readFiles(this.bytes));
  }
  /** Сценарий миссии: дом A/O/H, номер миссии 1..9. */
  scenario(house, mission) {
    const name = `SCEN${house}00${mission}.INI`;
    const at = this.files().get(name);
    if (at === void 0) throw new RomError(`\u0412 ROM \u043D\u0435\u0442 \u0444\u0430\u0439\u043B\u0430 ${name}`);
    return parseScenario(this.bytes, name, at);
  }
  gamePalette() {
    return this.memo("gamePalette", () => this.readPalette(ROM.gamePalette, 4));
  }
  readPalette(addr, lines) {
    const pal = new Uint32Array(lines * 16);
    for (let i = 0; i < lines * 16; i++) pal[i] = cramToRGBA(readU16(this.bytes, addr + i * 2));
    return pal;
  }
  icon(id) {
    const words = new Uint16Array(16);
    const p = ROM.iconTable + id * 32;
    for (let i = 0; i < 16; i++) words[i] = readU16(this.bytes, p + i * 2);
    return words;
  }
  /** Карта миссии 1..27. Загрузчик игры ($01B1DE) заменяет иконку B0 на 7F и C0 на BF. */
  missionMap(index) {
    if (index < 1 || index > ROM.mapCount) throw new RangeError(`\u043D\u0435\u0442 \u043A\u0430\u0440\u0442\u044B ${index}`);
    const ptr = readU32(this.bytes, ROM.mapTable + (index - 1) * 4);
    const small = ptr >>> 31 === 1;
    const addr = ptr & 2147483647;
    const size = small ? 32 : 64;
    const offset = small ? 16 : 0;
    const ground = new Uint16Array(MAP_SIZE * MAP_SIZE);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let id = this.bytes[addr + y * size + x];
        if (id === 176) id = 127;
        else if (id === 192) id = 191;
        ground[(y + offset) * MAP_SIZE + x + offset] = id;
      }
    return { index, ground, bounds: { x: offset, y: offset, w: size, h: size } };
  }
  unitPictures() {
    return this.memo("unitPictures", () => this.pictureTable(ROM.unitPictureTable, ROM.unitPictureCount));
  }
  structurePictures() {
    return this.memo(
      "structurePictures",
      () => this.pictureTable(ROM.structurePictureTable, ROM.structurePictureCount)
    );
  }
  pictureTable(table, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const pic = this.picture(readU32(this.bytes, table + i * 4), i);
      if (pic) list.push(pic);
    }
    return list;
  }
  /**
   * Картинка «палитра + карта тайлов + LCW-тайлы»: 16 слов CRAM, карта w×h слов (с отражениями),
   * слово длины, поток LCW. Если по адресу не палитра или поток не распаковывается — null.
   */
  picture(addr, id, w = 12, h = 7) {
    const b = this.bytes;
    for (let i = 0; i < 16; i++) if (readU16(b, addr + i * 2) & 61713) return null;
    const pal = this.readPalette(addr, 1);
    let tiles;
    try {
      tiles = lcwDecompress(b, addr + 32 + w * h * 2 + 2).data;
    } catch {
      return null;
    }
    const width = w * 8;
    const height = h * 8;
    const px = new Uint32Array(width * height);
    for (let t = 0; t < w * h; t++) {
      const word = readU16(b, addr + 32 + t * 2);
      const tile = word & 2047;
      if (tile * 32 + 32 > tiles.length) return null;
      const hflip = word & 2048;
      const vflip = word & 4096;
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 8; col++) {
          const sx = hflip ? 7 - col : col;
          const sy = vflip ? 7 - row : row;
          const byte = tiles[tile * 32 + sy * 4 + (sx >> 1)];
          const c = sx & 1 ? byte & 15 : byte >> 4;
          px[(t / w | 0) * 8 * width + row * width + t % w * 8 + col] = pal[c];
        }
    }
    return { id, width, height, pixels: new Uint8ClampedArray(px.buffer) };
  }
};

// web/src/view/mapview.ts
var ZOOMS = [1, 2, 3, 4, 5, 6];
var EDGE_PX = 10;
var MOUSE_SCROLL = 1100;
var FRAME = 1 / 60;
var CURSOR_MIN = 1;
var CURSOR_MAX = 3;
var CURSOR_ACCEL = 1 / 16;
var CURSOR_MARGIN = 64;
var FAST_SCROLL = [7, 14];
var FAST_SCROLL_DELAY = 60;
var DRAG_START = 6;
var MapView = class {
  constructor(canvas, icons, sprites, _cursors, pad, skins, terrain = null, vehicles = null, particles = null, infantry = null) {
    this.icons = icons;
    this.sprites = sprites;
    this.pad = pad;
    this.skins = skins;
    this.terrain = terrain;
    this.vehicles = vehicles;
    this.particles = particles;
    this.infantry = infantry;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.bindMouse();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    requestAnimationFrame((t) => this.tick(t));
  }
  icons;
  sprites;
  pad;
  skins;
  terrain;
  vehicles;
  particles;
  infantry;
  canvas;
  ctx;
  world = null;
  camX = 0;
  camY = 0;
  /** Экранных CSS-пикселей на мировой пиксель, одинаково на обычном и HiDPI-экране. */
  zoom = 2;
  pixelRatio = 1;
  /** Физических пикселей холста на мировой пиксель: HD-графика рисуется в нативном разрешении. */
  get pixelScale() {
    return this.zoom * this.pixelRatio;
  }
  showGrid = false;
  mouseMode = false;
  cursorX = 0;
  cursorY = 0;
  cursorKind = "select";
  selectedUnits = /* @__PURE__ */ new Set();
  selectedStructure = null;
  onChange = () => {
  };
  /** A: щелчок левой или кнопка 1 — мировые координаты точки */
  onPrimary = () => {
  };
  /** правая кнопка мыши */
  onSecondary = () => {
  };
  /** рамка выделения (мировые координаты) */
  onBox = () => {
  };
  /** каждый игровой кадр (1/60 с) */
  onFrame = () => {
  };
  mouse = { x: 0, y: 0, inside: false };
  pan = null;
  box = null;
  holdTime = 0;
  dirty = true;
  last = 0;
  acc = 0;
  tracks = new VehicleTracks();
  atmosphere = new WorldAtmosphere();
  /** клетка тумана (g_veiledTileID) — рисуется чёрной */
  veiledIcon = 0;
  /** постановка здания: размер и годность места (1 — да, <0 — без бетона, 0 — нельзя), cells — годность каждой клетки */
  placement = null;
  /** значки над зданиями («OK», молоток, молния): описание спрайта ROM */
  structureIcons = [];
  stripes = /* @__PURE__ */ new Map();
  drawIcon(id, x, y, size, allowHD = true) {
    if (this.skins.iconOverridden[id]) {
      this.ctx.drawImage(this.skins.scaled(`icon:${id}`, size, size), x, y);
      return;
    }
    const s = (allowHD ? this.sprites.mapEffects?.icon(id) : null) ?? this.icons.source(id);
    const smooth2 = this.ctx.imageSmoothingEnabled;
    if (s.sw > 32) this.ctx.imageSmoothingEnabled = true;
    this.ctx.drawImage(s.image, s.sx, s.sy, s.sw, s.sh, x, y, size, size);
    this.ctx.imageSmoothingEnabled = smooth2;
  }
  setWorld(world, focusX, focusY) {
    this.resize();
    this.world = world;
    this.vehicles?.reset();
    this.particles?.reset();
    this.tracks.reset();
    this.infantry?.reset();
    this.terrain?.setMap(world.map);
    this.selectedUnits.clear();
    this.selectedStructure = null;
    this.zoom = this.defaultZoom();
    this.cursorX = focusX;
    this.cursorY = focusY;
    this.centerOn(focusX, focusY);
    this.invalidate();
  }
  /** Масштаб, при котором по вертикали видно около 14 клеток. */
  defaultZoom() {
    const z = Math.round(this.canvas.height / this.pixelRatio / (14 * CELL_PX));
    return Math.min(Math.max(z, ZOOMS[0]), ZOOMS[ZOOMS.length - 1]);
  }
  viewSize() {
    return { w: this.canvas.width / this.pixelScale, h: this.canvas.height / this.pixelScale };
  }
  centerOn(wx, wy) {
    const v = this.viewSize();
    this.camX = wx - v.w / 2;
    this.camY = wy - v.h / 2;
    this.clampCamera();
  }
  setZoom(z, anchorX = this.canvas.width / 2, anchorY = this.canvas.height / 2) {
    z = Math.min(Math.max(z, ZOOMS[0]), ZOOMS[ZOOMS.length - 1]);
    if (z === this.zoom) return;
    const wx = this.camX + anchorX / this.pixelScale;
    const wy = this.camY + anchorY / this.pixelScale;
    this.zoom = z;
    this.camX = wx - anchorX / this.pixelScale;
    this.camY = wy - anchorY / this.pixelScale;
    this.clampCamera();
  }
  setMouseMode(on) {
    this.mouseMode = on;
    this.dirty = true;
    this.onChange();
  }
  cursorCell() {
    if (!this.world) return null;
    const x = Math.floor(this.cursorX / CELL_PX);
    const y = Math.floor(this.cursorY / CELL_PX);
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return null;
    return { x, y, icon: this.world.map.ground[y << 6 | x] };
  }
  invalidate() {
    this.dirty = true;
  }
  clampCamera() {
    if (!this.world) return;
    const b = this.world.map.bounds;
    const v = this.viewSize();
    const minX = b.x * CELL_PX;
    const minY = b.y * CELL_PX;
    const maxX = (b.x + b.w) * CELL_PX - v.w;
    const maxY = (b.y + b.h) * CELL_PX - v.h;
    this.camX = maxX < minX ? (minX + maxX) / 2 : Math.min(Math.max(this.camX, minX), maxX);
    this.camY = maxY < minY ? (minY + maxY) / 2 : Math.min(Math.max(this.camY, minY), maxY);
    this.dirty = true;
    this.onChange();
  }
  clampCursor() {
    if (!this.world) return;
    const b = this.world.map.bounds;
    this.cursorX = Math.min(Math.max(this.cursorX, b.x * CELL_PX), (b.x + b.w) * CELL_PX - 1);
    this.cursorY = Math.min(Math.max(this.cursorY, b.y * CELL_PX), (b.y + b.h) * CELL_PX - 1);
  }
  /** Камера догоняет курсор, если он подошёл к краю ближе CURSOR_MARGIN. */
  followCursor() {
    const v = this.viewSize();
    const m = Math.min(CURSOR_MARGIN, v.w / 3, v.h / 3);
    if (this.cursorX < this.camX + m) this.camX = this.cursorX - m;
    if (this.cursorX > this.camX + v.w - m) this.camX = this.cursorX - v.w + m;
    if (this.cursorY < this.camY + m) this.camY = this.cursorY - m;
    if (this.cursorY > this.camY + v.h - m) this.camY = this.cursorY - v.h + m;
    this.clampCamera();
  }
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (w === this.canvas.width && h === this.canvas.height && dpr === this.pixelRatio) return;
    const v = this.viewSize();
    const cx = this.camX + v.w / 2;
    const cy = this.camY + v.h / 2;
    this.pixelRatio = dpr;
    this.canvas.width = w;
    this.canvas.height = h;
    this.centerOn(cx, cy);
  }
  // ------------------------------------------------------------------ мышь
  toCanvas(e) {
    const c = this.canvas;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  toWorld(x, y) {
    return { x: this.camX + x / this.pixelScale, y: this.camY + y / this.pixelScale };
  }
  bindMouse() {
    const c = this.canvas;
    c.addEventListener("pointermove", (e) => {
      const p = this.toCanvas(e);
      this.mouse = { x: p.x, y: p.y, inside: true };
      if (this.pan && this.pan.id === e.pointerId) {
        this.camX = this.pan.cx - (p.x - this.pan.x) / this.pixelScale;
        this.camY = this.pan.cy - (p.y - this.pan.y) / this.pixelScale;
        this.clampCamera();
      }
      if (this.box && this.box.id === e.pointerId) {
        if (!this.box.active && Math.hypot(p.x - this.box.x, p.y - this.box.y) > DRAG_START * (window.devicePixelRatio || 1)) this.box.active = true;
        this.dirty = true;
      }
      if (this.mouseMode) this.cursorToMouse();
    });
    c.addEventListener("pointerleave", () => this.mouse.inside = false);
    c.addEventListener("pointerdown", (e) => {
      c.focus();
      const p = this.toCanvas(e);
      if (e.button === 1) {
        e.preventDefault();
        this.pan = { id: e.pointerId, x: p.x, y: p.y, cx: this.camX, cy: this.camY };
        c.setPointerCapture(e.pointerId);
        return;
      }
      if (!this.mouseMode) return;
      this.mouse = { x: p.x, y: p.y, inside: true };
      this.cursorToMouse();
      if (e.button === 0) {
        this.box = { id: e.pointerId, x: p.x, y: p.y, active: false };
        c.setPointerCapture(e.pointerId);
      } else if (e.button === 2) {
        this.onSecondary();
      }
    });
    const up = (e) => {
      if (this.pan?.id === e.pointerId) this.pan = null;
      if (this.box?.id === e.pointerId) {
        const b = this.box;
        this.box = null;
        this.dirty = true;
        if (e.type === "pointercancel") return;
        const p = this.toCanvas(e);
        if (b.active) {
          const a = this.toWorld(b.x, b.y);
          const z = this.toWorld(p.x, p.y);
          this.onBox({ x0: Math.min(a.x, z.x), y0: Math.min(a.y, z.y), x1: Math.max(a.x, z.x), y1: Math.max(a.y, z.y) });
        } else {
          this.onPrimary(this.cursorX, this.cursorY);
        }
      }
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    c.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const p = this.toCanvas(e);
        this.setZoom(this.zoom + (e.deltaY < 0 ? 1 : -1), p.x, p.y);
        if (this.mouseMode) this.cursorToMouse();
      },
      { passive: false }
    );
  }
  cursorToMouse() {
    const w = this.toWorld(this.mouse.x, this.mouse.y);
    this.cursorX = w.x;
    this.cursorY = w.y;
    this.clampCursor();
    this.dirty = true;
    this.onChange();
  }
  // ------------------------------------------------------------------ цикл
  tick(t) {
    if ((window.devicePixelRatio || 1) !== this.pixelRatio) this.resize();
    const dt = this.last ? Math.min((t - this.last) / 1e3, 0.1) : 0;
    this.last = t;
    this.acc += dt;
    while (this.acc >= FRAME) {
      this.acc -= FRAME;
      this.step();
      this.onFrame();
      this.dirty = true;
    }
    if (this.mouseMode && this.mouse.inside && !this.pan && document.hasFocus()) this.edgeScroll(dt);
    if (this.dirty) this.draw();
    requestAnimationFrame((tt) => this.tick(tt));
  }
  /** крестовина занята меню: курсор стоит */
  inputLocked = false;
  fastTime = 0;
  /** выбранный геймпадом юнит (метка «стрелки» над ним, как в оригинале) */
  markedUnit = null;
  /** Один кадр управления с крестовины. */
  step() {
    if (this.inputLocked) return;
    const p = this.pad;
    const dx = (p.isHeld("right") ? 1 : 0) - (p.isHeld("left") ? 1 : 0);
    const dy = (p.isHeld("down") ? 1 : 0) - (p.isHeld("up") ? 1 : 0);
    if (!dx && !dy) {
      this.holdTime = 0;
      this.fastTime = 0;
      return;
    }
    if (p.isHeld("c") || this.mouseMode) {
      const cx = this.camX;
      const cy = this.camY;
      const speed2 = FAST_SCROLL[this.fastTime < FAST_SCROLL_DELAY ? 0 : 1];
      this.fastTime++;
      this.camX += dx * speed2;
      this.camY += dy * speed2;
      this.clampCamera();
      this.cursorX += this.camX - cx;
      this.cursorY += this.camY - cy;
      this.clampCursor();
      this.onChange();
      return;
    }
    this.fastTime = 0;
    const speed = Math.min(CURSOR_MAX, CURSOR_MIN + this.holdTime * CURSOR_ACCEL);
    this.holdTime++;
    this.cursorX += dx * speed;
    this.cursorY += dy * speed;
    this.clampCursor();
    this.followCursor();
    this.onChange();
  }
  edgeScroll(dt) {
    const edge = EDGE_PX * (window.devicePixelRatio || 1);
    const dx = (this.mouse.x > this.canvas.width - edge ? 1 : 0) - (this.mouse.x < edge ? 1 : 0);
    const dy = (this.mouse.y > this.canvas.height - edge ? 1 : 0) - (this.mouse.y < edge ? 1 : 0);
    if (!dx && !dy) return;
    const s = MOUSE_SCROLL * dt / this.zoom;
    this.camX += dx * s;
    this.camY += dy * s;
    this.clampCamera();
    this.cursorToMouse();
  }
  // ------------------------------------------------------------------ отрисовка
  draw() {
    this.dirty = false;
    const ctx = this.ctx;
    const z = this.pixelScale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const world = this.world;
    if (!world) return;
    ctx.imageSmoothingEnabled = false;
    const ox = Math.round(this.camX * z);
    const oy = Math.round(this.camY * z);
    const v = this.viewSize();
    const x0 = Math.max(0, Math.floor(this.camX / CELL_PX));
    const y0 = Math.max(0, Math.floor(this.camY / CELL_PX));
    const x1 = Math.min(MAP_SIZE - 1, Math.floor((this.camX + v.w) / CELL_PX));
    const y1 = Math.min(MAP_SIZE - 1, Math.floor((this.camY + v.h) / CELL_PX));
    const size = CELL_PX * z;
    const map = world.map;
    const buildingFloor = new Uint8Array(4096);
    const buildingImages = /* @__PURE__ */ new Map();
    for (const st of world.structures) {
      if (st.x > x1 || st.y > y1 || st.x + st.w <= x0 || st.y + st.h <= y0) continue;
      const image = st.built ? this.skins.structure(st.type, st.w * size, st.h * size, st.ref.rotationSpriteDiff, G.timerGame) : [0, 1, 14].includes(st.type) ? null : this.sprites.mapEffects?.constructionSite;
      if (!image) continue;
      buildingImages.set(st, image);
      for (let row = 0; row < st.h; row++) for (let col = 0; col < st.w; col++) {
        if (map.inBounds(st.x + col, st.y + row)) buildingFloor[st.y + row << 6 | st.x + col] = 1;
      }
    }
    this.terrain?.draw(ctx, ox / z, oy / z, z);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!map.inBounds(x, y)) continue;
        const p = y << 6 | x;
        const ov = map.overlay[p];
        if (ov === this.veiledIcon && this.veiledIcon !== 0) {
          ctx.fillStyle = "#000";
          ctx.fillRect(x * size - ox, y * size - oy, size, size);
          continue;
        }
        const id = map.ground[p];
        if (this.terrain?.kinds[id] === 11 && !this.skins.iconOverridden[id]) {
          let connections = 0;
          for (const [dx, dy, bit] of [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]]) {
            const nx = x + dx, ny = y + dy;
            if (map.inBounds(nx, ny) && this.terrain.kinds[map.ground[ny << 6 | nx]] === 11) connections |= bit;
          }
          drawWall(ctx, x * size - ox, y * size - oy, size, connections, this.sprites.mapEffects?.icon(126)?.image);
        } else if (buildingFloor[p]) this.drawIcon(126, x * size - ox, y * size - oy, size);
        else if (!this.terrain || !this.terrain.covers(id) || this.skins.iconOverridden[id] || this.terrain.kinds[id] === 13 || this.terrain.kinds[id] === 14) {
          this.drawIcon(id, x * size - ox, y * size - oy, size, this.terrain !== null);
        }
        if (ov !== 0) this.drawIcon(ov, x * size - ox, y * size - oy, size);
      }
    }
    const isVisible = (x, y) => {
      const cx = Math.floor(x / CELL_PX), cy = Math.floor(y / CELL_PX);
      return map.inBounds(cx, cy) && (!this.veiledIcon || map.overlay[cy << 6 | cx] !== this.veiledIcon);
    };
    this.tracks.update(world.units, G.timerGame, (x, y) => this.terrain?.isRockAt(x, y) ?? false);
    ctx.save();
    ctx.setTransform(z, 0, 0, z, -ox, -oy);
    this.tracks.draw(ctx, G.timerGame, isVisible);
    ctx.restore();
    this.infantry?.update(world.units, G.timerGame);
    ctx.save();
    ctx.setTransform(z, 0, 0, z, -ox, -oy);
    this.infantry?.drawCorpses(ctx, G.timerGame, isVisible);
    ctx.restore();
    for (const st of world.structures) {
      if (st.x > x1 || st.y > y1 || st.x + st.w <= x0 || st.y + st.h <= y0) continue;
      const img = buildingImages.get(st);
      if (!img) continue;
      for (let row = 0; row < st.h; row++) for (let col = 0; col < st.w; col++) {
        const x = st.x + col;
        const y = st.y + row;
        if (x < x0 || x > x1 || y < y0 || y > y1 || !map.inBounds(x, y)) continue;
        const ov = map.overlay[y << 6 | x];
        if (ov === this.veiledIcon && this.veiledIcon !== 0) continue;
        const sw = img.width / st.w, sh = img.height / st.h;
        ctx.drawImage(img, col * sw, row * sh, sw, sh, x * size - ox, y * size - oy, size, size);
        if (ov !== 0) this.drawIcon(ov, x * size - ox, y * size - oy, size);
      }
      if (!st.built || !this.skins.hasStructure(st.type)) {
        ctx.save();
        ctx.beginPath();
        for (let row = 0; row < st.h; row++) for (let col = 0; col < st.w; col++) {
          const x = st.x + col, y = st.y + row;
          if (isVisible(x * 32 + 16, y * 32 + 16)) ctx.rect(x * size - ox, y * size - oy, size, size);
        }
        ctx.clip();
        ctx.setTransform(z, 0, 0, z, -ox, -oy);
        if (!st.built) drawConstructionActivity(ctx, st, G.timerGame);
        else {
          const house = G.houses[st.house], powered = st.type === 9 || !house || house.powerProduction >= house.powerUsage;
          drawBuildingActivity(ctx, st, img, G.timerGame, powered);
          drawFactoryActivity(ctx, st, this.vehicles, G.timerGame, powered);
          drawRefineryActivity(ctx, st, this.vehicles, G.timerGame);
        }
        ctx.restore();
      }
    }
    if (this.showGrid) this.drawGrid(x0, y0, x1, y1, size, ox, oy);
    const margin = 32;
    const visible = world.units.filter(
      (u) => u.x > this.camX - margin && u.x < this.camX + v.w + margin && u.y > this.camY - margin && u.y < this.camY + v.h + margin
    );
    visible.sort((a, b) => (a.air ? 1e5 : 0) + a.y - ((b.air ? 1e5 : 0) + b.y));
    const drawEffect = (spriteID, x, y, seed = 0) => {
      const img = this.sprites.effect(spriteID);
      if (!img) return;
      const hd = img.worldWidth !== void 0;
      ctx.save();
      ctx.imageSmoothingEnabled = hd;
      ctx.translate(Math.round(x * z) - ox, Math.round(y * z) - oy);
      if (hd && seed) {
        const variation = visualHash(seed, 73);
        const scale = 0.96 + (variation & 255) / 255 * 0.08;
        ctx.rotate((variation >>> 8 & 255) / 255 * 0.12 - 0.06);
        ctx.scale(scale, scale);
      }
      ctx.drawImage(
        img.canvas,
        img.ox * z,
        img.oy * z,
        (img.worldWidth ?? img.canvas.width) * z,
        (img.worldHeight ?? img.canvas.height) * z
      );
      ctx.restore();
    };
    const drawBlasts = () => {
      for (const b of world.blasts) {
        if (b.type === 13 && this.sprites.wormArt) {
          ctx.save();
          ctx.setTransform(z, 0, 0, z, -ox, -oy);
          this.sprites.wormArt.swallow(ctx, b.x, b.y, b.age);
          ctx.restore();
        } else drawEffect(b.spriteID, b.x, b.y, b.x * 8 ^ b.type * 997);
      }
      drawParticles("air");
    };
    const drawParticles = (layer) => {
      if (!this.particles) return;
      ctx.save();
      ctx.setTransform(z, 0, 0, z, -ox, -oy);
      this.particles.draw(ctx, G.timerGame, layer, isVisible);
      ctx.restore();
    };
    drawParticles("ground");
    let blastsDrawn = false;
    for (const u of visible) {
      if (u.air && !blastsDrawn) {
        drawBlasts();
        blastsDrawn = true;
      }
      if (u.type === 25 && world.blasts.some((b) => b.type === 13 && Math.hypot(b.x - u.x, b.y - u.y) < 16)) {
        continue;
      }
      const skin = this.sprites.unitSkin(u.type, u.orientation, u.anim >> 3, u.turret, u.state.recoil);
      if (skin) {
        const c = this.skins.scaled(skin.key, skin.box * z, skin.box * z);
        if (u.shadow) {
          ctx.globalAlpha = 0.35;
          ctx.filter = "brightness(0)";
          ctx.drawImage(c, Math.round((u.x - skin.box / 2 + 4) * z) - ox, Math.round((u.y - skin.box / 2 + 10) * z) - oy);
          ctx.filter = "none";
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(c, Math.round((u.x - skin.box / 2) * z) - ox, Math.round((u.y - skin.box / 2) * z) - oy);
      } else if ((this.vehicles || this.infantry || this.sprites.wormArt) && (() => {
        ctx.save();
        ctx.setTransform(z, 0, 0, z, -ox, -oy);
        const drawn = this.sprites.wormArt?.draw(ctx, u, G.timerGame) || this.vehicles?.draw(ctx, u, G.timerGame) || this.infantry?.draw(ctx, u, G.timerGame);
        ctx.restore();
        return drawn;
      })()) {
      } else {
        for (const f of this.sprites.unitFrames(u.type, u.orientation, u.anim >> 3, u.turret, u.state)) {
          const img = this.sprites.get(f, u.house);
          const dx = Math.round((u.x + img.ox) * z) - ox;
          const dy = Math.round((u.y + img.oy) * z) - oy;
          if (u.shadow) {
            ctx.globalAlpha = 0.35;
            ctx.filter = "brightness(0)";
            ctx.drawImage(img.canvas, dx + 4 * z, dy + 10 * z, img.canvas.width * z, img.canvas.height * z);
            ctx.filter = "none";
            ctx.globalAlpha = 1;
          }
          ctx.drawImage(img.canvas, dx, dy, img.canvas.width * z, img.canvas.height * z);
          if (u.highlighted) {
            ctx.globalAlpha = 0.5;
            ctx.globalCompositeOperation = "lighter";
            ctx.drawImage(img.canvas, dx, dy, img.canvas.width * z, img.canvas.height * z);
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
          }
        }
      }
      if (u.dust >= 0) {
        const img = this.sprites.harvestDust((u.orientation + 16 & 255) >> 5, u.dust);
        ctx.save();
        ctx.imageSmoothingEnabled = img.worldWidth !== void 0;
        ctx.drawImage(
          img.canvas,
          Math.round((u.x + img.ox) * z) - ox,
          Math.round((u.y + img.oy) * z) - oy,
          (img.worldWidth ?? img.canvas.width) * z,
          (img.worldHeight ?? img.canvas.height) * z
        );
        ctx.restore();
      }
      if (u.smoke >= 0) drawEffect(180 + u.smoke, u.x, u.y - 14);
    }
    if (!blastsDrawn) drawBlasts();
    if (this.atmosphere) {
      const elapsed = Math.max(0, G.timerGame - G.tickScenarioStart);
      ctx.save();
      ctx.beginPath();
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
        if (isVisible(x * 32 + 16, y * 32 + 16)) ctx.rect(x * size - ox, y * size - oy, size, size);
      ctx.clip();
      this.atmosphere.draw(ctx, elapsed, ox, oy, z, this.canvas.width, this.canvas.height);
      const { night } = desertLight(elapsed);
      if (night > 0.03) {
        ctx.setTransform(z, 0, 0, z, -ox, -oy);
        for (const st of buildingImages.keys()) {
          const house = G.houses[st.house];
          if (!this.skins.hasStructure(st.type) && (!house || house.powerProduction >= house.powerUsage)) drawBuildingNightLights(ctx, st, night);
        }
      }
      ctx.restore();
    }
    if (this.placement) {
      const pl = this.placement;
      const cx = Math.floor(this.cursorX / CELL_PX);
      const cy = Math.floor(this.cursorY / CELL_PX);
      ctx.save();
      for (let y = 0; y < pl.h; y++) {
        for (let x = 0; x < pl.w; x++) {
          const idx = y * pl.w + x;
          const ok = pl.cells ? !!pl.cells[idx] : pl.valid !== 0;
          ctx.fillStyle = this.stripePattern(ok ? "#2fa83a" : "#d02a1e", z);
          ctx.fillRect((cx + x) * size - ox, (cy + y) * size - oy, size, size);
        }
      }
      ctx.restore();
    }
    for (const { s: s2, def, kind } of this.structureIcons) {
      const img = this.sprites.statusDef(def);
      if (kind) {
        const x = (s2.x * CELL_PX + img.ox + img.canvas.width / 2) * z - ox;
        const y = (s2.y * CELL_PX + img.oy + img.canvas.height / 2) * z - oy;
        if (!map.inBounds(s2.x, s2.y) || this.veiledIcon && map.overlay[s2.y << 6 | s2.x] === this.veiledIcon) continue;
        drawStatusIcon(ctx, kind, x, y, 14 * z, G.timerGame, s2.ref.o.index);
        continue;
      }
      ctx.drawImage(img.canvas, Math.round((s2.x * CELL_PX + img.ox) * z) - ox, Math.round((s2.y * CELL_PX + img.oy) * z) - oy, img.canvas.width * z, img.canvas.height * z);
    }
    const s = this.selectedStructure;
    if (s) this.drawCorners(s.x * CELL_PX, s.y * CELL_PX, s.w * CELL_PX, s.h * CELL_PX, ox, oy, true);
    for (const u of this.selectedUnits) {
      if (u === this.markedUnit) continue;
      this.drawCorners(u.x - 14, u.y - 14, 28, 28, ox, oy);
    }
    if (this.markedUnit) {
      const u = this.markedUnit;
      drawCursor(ctx, "move", u.x * z - ox, u.y * z - oy, 32 * z, G.timerGame);
    }
    if (this.box?.active) {
      const a = this.box;
      ctx.strokeStyle = "#f4f4f4";
      ctx.lineWidth = Math.max(1, Math.round(z / 2));
      ctx.strokeRect(Math.min(a.x, this.mouse.x) + 0.5, Math.min(a.y, this.mouse.y) + 0.5, Math.abs(this.mouse.x - a.x), Math.abs(this.mouse.y - a.y));
    }
    if (this.placement) return;
    drawCursor(ctx, this.cursorKind, this.cursorX * z - ox, this.cursorY * z - oy, 32 * z, G.timerGame);
  }
  stripePattern(color, z) {
    const key = `${color}:${z}`;
    let p = this.stripes.get(key);
    if (!p) {
      const n = 4 * z;
      const c = document.createElement("canvas");
      c.width = c.height = n;
      const g = c.getContext("2d");
      g.fillStyle = color;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % n < n / 2) g.fillRect(i, j, 1, 1);
      p = this.ctx.createPattern(c, "repeat");
      this.stripes.set(key, p);
    }
    return p;
  }
  drawCorners(x, y, w, h, ox, oy, strong = false) {
    const z = this.pixelScale;
    drawSelection(this.ctx, x * z - ox, y * z - oy, w * z, h * z, z, G.timerGame, strong);
  }
  drawGrid(x0, y0, x1, y1, size, ox, oy) {
    const ctx = this.ctx;
    const map = this.world.map;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) {
      ctx.moveTo(x * size - ox + 0.5, y0 * size - oy);
      ctx.lineTo(x * size - ox + 0.5, (y1 + 1) * size - oy);
    }
    for (let y = y0; y <= y1 + 1; y++) {
      ctx.moveTo(x0 * size - ox, y * size - oy + 0.5);
      ctx.lineTo((x1 + 1) * size - ox, y * size - oy + 0.5);
    }
    ctx.stroke();
    if (size < 48) return;
    ctx.font = `${Math.round(size / 4)}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = "top";
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!map.inBounds(x, y)) continue;
        const label = String(map.ground[y << 6 | x]);
        const px = x * size - ox + 3;
        const py = y * size - oy + 3;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(px - 2, py - 1, ctx.measureText(label).width + 4, size / 4 + 2);
        ctx.fillStyle = "#f3d27a";
        ctx.fillText(label, px, py);
      }
    }
  }
};

// web/src/ui/romstore.ts
var DB = "dune-remaster";
var STORE = "rom";
var SKINS = "skins";
function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(SKINS)) db.createObjectStore(SKINS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function loadSkinFiles() {
  const out = /* @__PURE__ */ new Map();
  try {
    const db = await open();
    await new Promise((resolve) => {
      const req = db.transaction(SKINS).objectStore(SKINS).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return resolve();
        out.set(String(c.key), c.value);
        c.continue();
      };
      req.onerror = () => resolve();
    });
  } catch {
  }
  return out;
}
async function storeSkinFile(key, file) {
  try {
    const db = await open();
    const store = db.transaction(SKINS, "readwrite").objectStore(SKINS);
    if (file) store.put(file, key);
    else store.delete(key);
  } catch {
  }
}

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\palace.png
var palace_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\palace.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\vehicle-factory-transparent.png
var vehicle_factory_transparent_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\vehicle-factory-transparent.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\hightech-factory.png
var hightech_factory_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\hightech-factory.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\barracks.png
var barracks_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\barracks.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\construction-yard.png
var construction_yard_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\construction-yard.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\windtrap.png
var windtrap_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\windtrap.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\starport.png
var starport_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\starport.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\refinery-transparent.png
var refinery_transparent_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\refinery-transparent.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\repair-facility.png
var repair_facility_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\repair-facility.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\turret-directions.png
var turret_directions_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\turret-directions.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\rocket-turret-directions.png
var rocket_turret_directions_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\rocket-turret-directions.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\spice-silo-transparent.png
var spice_silo_transparent_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\spice-silo-transparent.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\radar-base.png
var radar_base_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\radar-base.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\radar-dish.png
var radar_dish_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\radar-dish.png";

// web/src/gfx/structure-art.ts
var STRUCTURE_ART = [
  { type: 2, url: palace_default },
  { type: 3, url: vehicle_factory_transparent_default },
  { type: 4, url: vehicle_factory_transparent_default },
  { type: 5, url: hightech_factory_default },
  { type: 7, url: barracks_default },
  { type: 8, url: construction_yard_default },
  { type: 9, url: windtrap_default },
  { type: 10, url: barracks_default },
  { type: 11, url: starport_default },
  { type: 12, url: refinery_transparent_default },
  { type: 13, url: repair_facility_default },
  { type: 15, url: turret_directions_default, directions: true },
  { type: 16, url: rocket_turret_directions_default, directions: true },
  { type: 17, url: spice_silo_transparent_default, align: { x: 42 / 1254, y: 7 / 1254 } },
  { type: 18, url: radar_base_default, layerUrl: radar_dish_default }
];

// web/src/gfx/radar-motion.ts
function drawRadarDish(ctx, image, w, h, tick = 0) {
  const px = w * 398 / 1254, py = h * 430 / 1254;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.translate(px, py);
  ctx.rotate(tick / 60 * Math.PI * 2 / 18);
  const width = w * 350 / 1254, height = h * 346 / 1254;
  ctx.drawImage(image, 142, 184, 447, 442, -(331 - 142) / 447 * width, -(406 - 184) / 442 * height, width, height);
  ctx.restore();
}

// web/src/gfx/skins.ts
var Skins = class {
  skins = /* @__PURE__ */ new Map();
  defaults = /* @__PURE__ */ new Map();
  /** клетки карты, у которых есть своя картинка (быстрая проверка при отрисовке) */
  iconOverridden = new Uint8Array(512);
  onChange = () => {
  };
  async load(_rom, _icons) {
    const pending = /* @__PURE__ */ new Map();
    await Promise.all(STRUCTURE_ART.map(async (art) => {
      try {
        let task = pending.get(art.url);
        if (!task) {
          task = this.loadDefault(art);
          pending.set(art.url, task);
        }
        this.defaults.set(`structure:${art.type}`, await task);
      } catch (error) {
        console.warn(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0433\u0440\u0430\u0444\u0438\u043A\u0443 \u0437\u0434\u0430\u043D\u0438\u044F ${art.type}`, error);
      }
    }));
    for (const [k, blob] of await loadSkinFiles()) {
      try {
        this.put(k, await createImageBitmap(blob));
      } catch {
      }
    }
  }
  async loadDefault(art) {
    const response = await fetch(art.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const image = await createImageBitmap(await response.blob());
    let layer;
    if (art.layerUrl) {
      const r = await fetch(art.layerUrl);
      if (!r.ok) throw new Error(`Layer HTTP ${r.status}`);
      layer = await createImageBitmap(await r.blob());
    }
    return { image, scaled: /* @__PURE__ */ new Map(), directions: art.directions, align: art.align, layer };
  }
  put(key, image) {
    if (image) this.skins.set(key, { image, scaled: /* @__PURE__ */ new Map() });
    else this.skins.delete(key);
    const m = /^icon:(\d+)$/.exec(key);
    if (m) this.iconOverridden[Number(m[1])] = image ? 1 : 0;
  }
  has(key) {
    return this.skins.has(key);
  }
  image(key) {
    return this.skins.get(key)?.image ?? null;
  }
  keys() {
    return [...this.skins.keys()];
  }
  async set(key, file, save = true) {
    this.put(key, await createImageBitmap(file));
    if (save) await storeSkinFile(key, file);
    this.onChange();
  }
  async clear(key) {
    this.put(key, null);
    await storeSkinFile(key, null);
    this.onChange();
  }
  async clearAll() {
    for (const k of this.keys()) {
      this.put(k, null);
      await storeSkinFile(k, null);
    }
    this.onChange();
  }
  /** Картинка, уменьшенная ровно до w×h экранных пикселей. */
  scaled(key, w, h, direction = 0, withLayer = true) {
    const s = this.skins.get(key) ?? this.defaults.get(key);
    if (!s) return null;
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const frame = s.directions ? direction & 7 : 0;
    const k = `${w}x${h}:${frame}:${withLayer}`;
    let c = s.scaled.get(k);
    if (!c) {
      if (s.directions) {
        const crop = document.createElement("canvas");
        crop.width = Math.round(s.image.width / 4);
        crop.height = Math.round(s.image.height / 2);
        crop.getContext("2d").drawImage(
          s.image,
          frame % 4 * s.image.width / 4,
          Math.floor(frame / 4) * s.image.height / 2,
          s.image.width / 4,
          s.image.height / 2,
          0,
          0,
          crop.width,
          crop.height
        );
        c = downscale(crop, w, h);
      } else c = downscale(s.image, w, h);
      if (s.align) {
        const aligned = document.createElement("canvas");
        aligned.width = w;
        aligned.height = h;
        aligned.getContext("2d").drawImage(c, s.align.x * w, s.align.y * h);
        c = aligned;
      }
      if (s.layer && withLayer) drawRadarDish(c.getContext("2d"), s.layer, w, h);
      if (s.scaled.size > (s.directions ? 64 : 16)) s.scaled.clear();
      s.scaled.set(k, c);
    }
    return c;
  }
  // совместимость с просмотром ресурсов
  hasStructure(type) {
    return this.has(`structure:${type}`);
  }
  structureImage(type) {
    return this.image(`structure:${type}`);
  }
  setStructure(type, file) {
    return this.set(`structure:${type}`, file);
  }
  clearStructure(type) {
    return this.clear(`structure:${type}`);
  }
  structure(type, w, h, direction = 0, tick) {
    const key = `structure:${type}`, skin = this.skins.get(key) ?? this.defaults.get(key);
    if (tick === void 0 || !skin?.layer) return this.scaled(key, w, h, direction);
    const base = this.scaled(key, w, h, direction, false);
    const size = `${base.width}x${base.height}`;
    skin.motion ??= /* @__PURE__ */ new Map();
    let c = skin.motion.get(size);
    if (!c) {
      c = document.createElement("canvas");
      c.width = base.width;
      c.height = base.height;
      if (skin.motion.size > 4) skin.motion.clear();
      skin.motion.set(size, c);
    }
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(base, 0, 0);
    drawRadarDish(ctx, skin.layer, c.width, c.height, tick);
    return c;
  }
};
function downscale(src, w, h) {
  if (w >= src.width && h >= src.height) {
    const out2 = document.createElement("canvas");
    out2.width = w;
    out2.height = h;
    const g2 = out2.getContext("2d");
    g2.imageSmoothingEnabled = false;
    g2.drawImage(src, 0, 0, w, h);
    return out2;
  }
  let cur = src;
  let cw = src.width;
  let ch = src.height;
  while (cw / 2 >= w && ch / 2 >= h) {
    const half = document.createElement("canvas");
    half.width = Math.ceil(cw / 2);
    half.height = Math.ceil(ch / 2);
    const g2 = half.getContext("2d");
    g2.imageSmoothingQuality = "high";
    g2.drawImage(cur, 0, 0, cw, ch, 0, 0, half.width, half.height);
    cur = half;
    cw = half.width;
    ch = half.height;
  }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const g = out.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(cur, 0, 0, cw, ch, 0, 0, w, h);
  return out;
}

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\vehicles-hd\bodies.png
var bodies_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\vehicles-hd\\bodies.png";

// asset:C:\Users\Admin\Downloads\dune-remaster-main\dune-remaster-main\web\src\gfx\assets\vehicles-hd\mounts.png
var mounts_default = "C:\\Users\\Admin\\Downloads\\dune-remaster-main\\dune-remaster-main\\web\\src\\gfx\\assets\\vehicles-hd\\mounts.png";

// web/src/gfx/vehicle-art.ts
async function loadSpriteCells(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`Vehicle art HTTP ${response.status}`);
  const image = await createImageBitmap(await response.blob());
  const cells = [];
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement("canvas");
    cell.width = cell.height = 256;
    const ctx = cell.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, i % 4 * 256, (i >> 2) * 256, 256, 256, 0, 0, 256, 256);
    const pixels = ctx.getImageData(0, 0, 256, 256).data;
    let x0 = 256, y0 = 256, x1 = 0, y1 = 0;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (pixels[(y * 256 + x) * 4 + 3] > 20) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const c = document.createElement("canvas");
    c.width = x1 - x0 + 1;
    c.height = y1 - y0 + 1;
    c.getContext("2d").drawImage(cell, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    cells.push(c);
  }
  image.close();
  return cells;
}
var VehicleArt = class _VehicleArt {
  constructor(rawMounts) {
    this.rawMounts = rawMounts;
  }
  rawMounts;
  bodies = [];
  mounts = [];
  shots = /* @__PURE__ */ new WeakMap();
  bullets = /* @__PURE__ */ new WeakMap();
  defs = new Map(VEHICLES.map((d) => [d.type, d]));
  static async load(rom) {
    try {
      const [bodies, mounts] = await Promise.all([loadSpriteCells(bodies_default), loadSpriteCells(mounts_default)]);
      const result = new _VehicleArt(mounts), palette = rom.gamePalette();
      for (let house = 0; house < 6; house++) {
        const base = rom.housePaletteLine(house) * 16;
        const colors = [15, 14, 13].map((i) => {
          const p = palette[base + i];
          return [p & 255, p >>> 8 & 255, p >>> 16 & 255];
        });
        const recolor = (source) => {
          const c = document.createElement("canvas");
          c.width = source.width;
          c.height = source.height;
          const g = c.getContext("2d");
          g.drawImage(source, 0, 0);
          if (rom.housePaletteLine(house) !== 1) {
            const im = g.getImageData(0, 0, c.width, c.height), p = im.data;
            for (let k = 0; k < p.length; k += 4) if (p[k + 3] && p[k + 2] > 60 && p[k + 2] > p[k] * 1.3 && p[k + 1] > p[k] * 1.15) {
              const light = Math.min(1, (Math.max(p[k + 1], p[k + 2]) - 25) / 225) * 2;
              const a = Math.min(1, Math.floor(light)), f = light - a;
              for (let j = 0; j < 3; j++) p[k + j] = colors[a][j] * (1 - f) + colors[a + 1][j] * f;
            }
            g.putImageData(im, 0, 0);
          }
          return c;
        };
        result.bodies.push(bodies.map(recolor));
        result.mounts.push(mounts.slice(0, 9).map(recolor));
      }
      return result;
    } catch (error) {
      console.warn("HD vehicles unavailable, using original sprites:", error);
      return null;
    }
  }
  reset() {
    this.shots = /* @__PURE__ */ new WeakMap();
    this.bullets = /* @__PURE__ */ new WeakMap();
  }
  shot(unit, bullet, tick) {
    const s = { tick, angle: bullet.orientation[0].current & 255, x: unit.o.position.x / 8, y: unit.o.position.y / 8, type: bullet.o.type };
    this.shots.set(unit, s);
    this.bullets.set(bullet, s);
  }
  /** Draw in original world pixels; the caller supplies the camera transform. */
  draw(ctx, u, tick) {
    if (u.type === 1) {
      this.ornithopter(ctx, u.x, u.y, u.orientation, u.house, tick, u.id, u.shadow, u.highlighted);
      return true;
    }
    const d = this.defs.get(u.type);
    if (!d) return this.projectile(ctx, u);
    const house = Math.min(5, u.house), body = this.bodies[house][d.cell];
    const shot = this.shots.get(u.ref), age = shot ? (tick - shot.tick) / 60 : 99;
    const firing = age >= 0 && age < 0.16;
    const aim = firing && shot ? shot.angle : u.turret;
    const recoil = firing ? Math.sin(Math.PI * Math.min(1, age / 0.16)) * 1.6 : 0;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(u.x, u.y);
    if (u.shadow) {
      ctx.save();
      ctx.translate(4, 10);
      ctx.globalAlpha = 0.26;
      ctx.filter = "brightness(0) blur(0.8px)";
      ctx.translate(0, -2);
      ctx.rotate(angleRadians(u.orientation));
      ctx.drawImage(body, -d.w / 2, -d.h / 2, d.w, d.h);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(0, -2);
    ctx.rotate(angleRadians(u.orientation));
    ctx.drawImage(body, -d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();
    if (d.mount !== void 0) {
      ctx.save();
      ctx.translate(0, -4);
      ctx.rotate(angleRadians(aim));
      const muzzle = d.muzzle, w = d.mw;
      ctx.drawImage(this.mounts[house][d.mount], -w / 2, -muzzle + recoil, w, muzzle + 5);
      ctx.restore();
      if (firing && shot && shot.type === 23) {
        const p = muzzlePoint(0, 0, shot.angle, d.muzzle);
        const phase = Math.min(3, Math.floor(age / 0.04)), twin = d.mount === 1 || d.mount === 4 || d.mount === 8;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angleRadians(shot.angle));
        ctx.globalAlpha = phase === 3 ? 0.35 : 1;
        const flash = this.rawMounts[12 + phase], width = twin ? 3.2 : 3.8;
        if (twin) {
          for (const x of [-w * 0.22, w * 0.22]) ctx.drawImage(flash, x - width / 2, -6 + recoil, width, 7);
        } else ctx.drawImage(flash, -width / 2, -7 + recoil, width, 8);
        ctx.restore();
      }
    }
    if (u.highlighted) {
      ctx.globalAlpha = 0.22;
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(0, -2);
      ctx.rotate(angleRadians(u.orientation));
      ctx.drawImage(body, -d.w / 2, -d.h / 2, d.w, d.h);
    }
    ctx.restore();
    return true;
  }
  /** Shared HD aircraft for the map and the original seven-craft victory formation. */
  ornithopter(ctx, x, y, orientation, house, tick, phase = 0, shadow = true, highlighted = false) {
    const cells = this.bodies[Math.max(0, Math.min(5, house))], body = cells[1], wing = cells[14];
    const flap = Math.sin(tick * Math.PI / 10 + phase * 1.7), reach = 9.5 + flap * 2.5;
    const model = () => {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.translate(-1, -4);
        ctx.rotate(flap * 0.1);
        ctx.drawImage(wing, -reach, -2, reach, 6);
        ctx.restore();
      }
      ctx.drawImage(body, -4.5, -12.5, 9, 21);
    };
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(x, y);
    if (shadow) {
      ctx.save();
      ctx.translate(4, 10);
      ctx.rotate(angleRadians(orientation));
      ctx.globalAlpha = 0.23;
      ctx.filter = "brightness(0) blur(0.8px)";
      model();
      ctx.restore();
    }
    ctx.rotate(angleRadians(orientation));
    model();
    if (highlighted) {
      ctx.globalAlpha = 0.22;
      ctx.globalCompositeOperation = "lighter";
      model();
    }
    ctx.restore();
  }
  projectile(ctx, u) {
    if (![18, 19, 20, 21, 22, 23, 24].includes(u.type)) return false;
    const shot = this.bullets.get(u.ref);
    if (u.type !== 23 && u.type !== 24 && shot && Math.hypot(u.x - shot.x, u.y - shot.y) < 11) return true;
    const index = u.type === 23 ? 10 : u.type === 24 ? 11 : 9;
    const [w, h] = u.type === 18 ? [6, 20] : u.type === 23 ? [u.state.big ? 2 : 1.2, 5] : u.type === 24 ? [16, 8] : [3, 10];
    const p = u.type === 23 ? along(u.orientation, -2) : { x: 0, y: 0 };
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(u.x + p.x, u.y + p.y);
    ctx.rotate(angleRadians(u.orientation));
    ctx.drawImage(this.rawMounts[index], -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }
};
export {
  DAY_TICKS,
  DuneRom,
  G,
  IT,
  MapView,
  STRUCTURE_ART,
  Skins,
  VehicleArt,
  WorldAtmosphere,
  cloudPosition,
  desertLight,
  drawBuildingActivity,
  drawCursor,
  drawFactoryActivity,
  drawRefineryActivity,
  drawSelection,
  indexEncode,
  refineryPadLights
};
