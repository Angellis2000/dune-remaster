#!/usr/bin/env python3
"""Извлечение графики из ROM Dune (Mega Drive) в PNG + JSON.

  python3 extract.py ROM OUTDIR
"""
import json
import os
import struct
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mdrom import cram_to_rgb, decode_tile  # noqa: E402


def u32(d, o):
    return struct.unpack(">I", d[o:o + 4])[0]


def read_pal(d, o):
    return [cram_to_rgb(d[o + i * 2] << 8 | d[o + i * 2 + 1]) for i in range(16)]


def tiles_to_image(d, o, w, h, pal, col_major=False, transparent0=False):
    img = Image.new("RGBA", (w * 8, h * 8), (0, 0, 0, 0))
    px = img.load()
    for t in range(w * h):
        tx, ty = (t // h, t % h) if col_major else (t % w, t // w)
        for i, c in enumerate(decode_tile(d, o + t * 32)):
            if transparent0 and c == 0:
                continue
            px[tx * 8 + (i & 7), ty * 8 + (i >> 3)] = pal[c] + (255,)
    return img


def build_pictures(d, out):
    """Картинки строительного меню: таблица указателей 0x63034 (63 записи),
    каждая запись -> 32 байта палитры + 84 тайла (12x7, построчно) = 96x56."""
    table, n = 0x63034, 63
    dst = os.path.join(out, "build_pictures")
    os.makedirs(dst, exist_ok=True)
    index, done = [], {}
    for k in range(n):
        p = u32(d, table + k * 4)
        if p not in done:
            done[p] = f"pic_{len(done):02d}_{p:06X}.png"
            tiles_to_image(d, p + 32, 12, 7, read_pal(d, p)).save(os.path.join(dst, done[p]))
        index.append({"id": k, "file": done[p]})
    json.dump(index, open(os.path.join(dst, "index.json"), "w"), indent=1)
    return len(done)


def main():
    rom, out = sys.argv[1], sys.argv[2]
    d = open(rom, "rb").read()
    print("Картинки меню строительства:", build_pictures(d, out))


if __name__ == "__main__":
    main()
