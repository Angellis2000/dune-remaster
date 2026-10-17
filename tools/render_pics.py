#!/usr/bin/env python3
"""Отрисовка картинок (палитра + карта тайлов + LCW) в PNG. python3 render_pics.py ROM pics.json OUTDIR [W H]"""
import json, os, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lcw import decompress
from mdrom import cram_to_rgb, decode_tile
from PIL import Image

def render(rom, off, w=12, h=7):
    pal = [cram_to_rgb(rom[off + i * 2] << 8 | rom[off + i * 2 + 1]) for i in range(16)]
    n = w * h
    words = struct.unpack(">%dH" % n, rom[off + 32:off + 32 + n * 2])
    tiles, _ = decompress(rom, off + 32 + n * 2 + 2)
    img = Image.new("RGB", (w * 8, h * 8))
    for k, e in enumerate(words):
        t = e & 0x7FF
        px = decode_tile(tiles, t * 32) if t * 32 + 32 <= len(tiles) else [0] * 64
        hf, vf = e & 0x800, e & 0x1000
        for i, c in enumerate(px):
            x, y = i & 7, i >> 3
            if hf: x = 7 - x
            if vf: y = 7 - y
            img.putpixel(((k % w) * 8 + x, (k // w) * 8 + y), pal[c])
    return img

if __name__ == "__main__":
    rom = open(sys.argv[1], "rb").read(); pics = json.load(open(sys.argv[2])); out = sys.argv[3]
    os.makedirs(out, exist_ok=True)
    for i, p in enumerate(pics):
        render(rom, p["off"]).save(os.path.join(out, "pic_%02d_%06X.png" % (i, p["off"])))
