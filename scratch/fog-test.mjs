// web/src/gfx/fog-of-war.ts
var FogOfWar = class {
  canvas = document.createElement("canvas");
  signature = "";
  draw(ctx, overlay, veiled, ox, oy, zoom) {
    if (!veiled) return;
    let signature = "";
    for (let p = 0; p < 4096; p++) signature += overlay[p] === veiled ? "1" : "0";
    if (signature !== this.signature) {
      this.signature = signature;
      this.rebuild(signature);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, -ox, -oy, 2048 * zoom, 2048 * zoom);
    ctx.restore();
  }
  rebuild(hidden) {
    const n = 512;
    this.canvas.width = this.canvas.height = n;
    const distanceField = (toHidden2) => {
      const distances = new Float32Array(n * n);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) distances[y * n + x] = hidden[(y >> 3) * 64 + (x >> 3)] === "1" === toHidden2 ? 0 : 9999;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const p = y * n + x;
        let d = distances[p];
        if (x) d = Math.min(d, distances[p - 1] + 1);
        if (y) {
          d = Math.min(d, distances[p - n] + 1);
          if (x) d = Math.min(d, distances[p - n - 1] + Math.SQRT2);
          if (x < n - 1) d = Math.min(d, distances[p - n + 1] + Math.SQRT2);
        }
        distances[p] = d;
      }
      for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) {
        const p = y * n + x;
        let d = distances[p];
        if (x < n - 1) d = Math.min(d, distances[p + 1] + 1);
        if (y < n - 1) {
          d = Math.min(d, distances[p + n] + 1);
          if (x) d = Math.min(d, distances[p + n - 1] + Math.SQRT2);
          if (x < n - 1) d = Math.min(d, distances[p + n + 1] + Math.SQRT2);
        }
        distances[p] = d;
      }
      return distances;
    };
    const toHidden = distanceField(true), toKnown = distanceField(false);
    const g = this.canvas.getContext("2d"), image = g.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const p = y * n + x, d = toKnown[p] - toHidden[p], t = Math.min(1, Math.max(0, (d + 12) / 28));
      const mist = Math.sin(x * 0.043 + Math.sin(y * 0.027) * 2) * Math.sin(y * 0.035 + x * 0.014);
      image.data[p * 4] = 18 + mist * 2;
      image.data[p * 4 + 1] = 26 + mist * 3;
      image.data[p * 4 + 2] = 32 + mist * 4;
      image.data[p * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
    }
    g.putImageData(image, 0, 0);
  }
};
export {
  FogOfWar
};
