/**
 * Сверка TS-распаковщика с эталоном tools/lcw.py (а тот сверен с самой игрой в эмуляторе).
 * Нужен ROM в ../rom/dune_usa.gen; без него тест пропускается.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { lcwDecompress } from "../src/rom/lcw.ts";

const ROM_PATH = new URL("../../rom/dune_usa.gen", import.meta.url);
// длина распаковки, длина потока, sha256 — получено из tools/lcw.py
const REFERENCE: Record<string, [number, number, string]> = {"0xbc538": [4096, 2058, "8d57a9dc5f133439acac8bafe803c52a28391a1d09e4b694fbe3040251a76c05"], "0xc0f90": [832, 644, "18c6282cd2638a73630b28159bd055522899bea1281087c577d60aa326b0cc19"], "0x1914": [1568, 1046, "4503bf0b1b1d1d9f3c3fd602cf83cc15b5eea57a2ec96150dbded27f432a9c2c"], "0x63f52": [384, 331, "8f689bee1c8323ceb826a88c831db5487a82dc520d2ee16925fd0add3e2295be"]};

test("LCW: потоки из ROM распаковываются как в эталоне", { skip: !existsSync(ROM_PATH) && "нет ROM" }, () => {
  const rom = new Uint8Array(readFileSync(ROM_PATH));
  for (const [addr, [len, consumed, sha]] of Object.entries(REFERENCE)) {
    const r = lcwDecompress(rom, Number(addr));
    assert.equal(r.data.length, len, addr);
    assert.equal(r.consumed, consumed, addr);
    assert.equal(createHash("sha256").update(r.data).digest("hex"), sha, addr);
  }
});

test("LCW: мусор даёт ошибку, а не зависание", () => {
  assert.throws(() => lcwDecompress(new Uint8Array([0x00, 0x00, 0x80])));
});
