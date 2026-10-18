// Рендер звука GEMS в WAV: node --experimental-transform-types tools/sim/sound_render.ts SEQ SECONDS OUT.wav
// (ROM из rom/dune_usa.gen; файл — в out/, в репозиторий не кладётся).
import { readFileSync, writeFileSync } from "node:fs";
import { GEMS, SoundMachine } from "../../web/src/sound/gems.ts";

const rom = new Uint8Array(readFileSync(new URL("../../rom/dune_usa.gen", import.meta.url)));
const [seq = "0", secs = "10", out = "out/snd.wav"] = process.argv.slice(2);
const m = new SoundMachine(rom, process.env.BANK === "intro" ? "intro" : "game");
const rate = 44100;
const n = Math.round(Number(secs) * rate);
const L = new Float32Array(n);
const R = new Float32Array(n);
// драйверу нужно время на разбор команды инициализации
const warm = new Float32Array(rate / 10);
m.render(warm, new Float32Array(warm.length), rate);
for (const s of seq.split(",")) m.command(GEMS.START, Number(s));
const t0 = performance.now();
const chunk = 1024;
for (let i = 0; i < n; i += chunk) m.render(L.subarray(i, i + chunk), R.subarray(i, i + chunk), rate);
console.log(`рендер ${secs} с за ${((performance.now() - t0) / 1000).toFixed(2)} с`);
const buf = Buffer.alloc(44 + n * 4);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + n * 4, 4);
buf.write("WAVEfmt ", 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(rate, 24);
buf.writeUInt32LE(rate * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(n * 4, 40);
let peak = 0;
for (let i = 0; i < n; i++) {
  buf.writeInt16LE(Math.round(L[i] * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * 32767), 46 + i * 4);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
writeFileSync(out, buf);
console.log("пик", peak.toFixed(3));
