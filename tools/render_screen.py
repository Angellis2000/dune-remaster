#!/usr/bin/env python3
"""Собрать экран меню из ROM: тайлы (LCW-потоки), карта тайлов (LCW, 64 слова в строке) и палитра.
python3 render_screen.py ROM OUT.png PAL_ADDR MAP_ADDR TILE_ADDR[:VRAM] ..."""
import os, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lcw import decompress
from PIL import Image
rom = open(sys.argv[1], 'rb').read()
pal = [struct.unpack('>H', rom[int(sys.argv[3], 16) + i * 2:int(sys.argv[3], 16) + i * 2 + 2])[0] for i in range(64)]
tmap, _ = decompress(rom, int(sys.argv[4], 16))
vram = bytearray(0x10000)
dst = 0
for arg in sys.argv[5:]:
    src, _, d = arg.partition(':')
    if d: dst = int(d, 16)
    data, _ = decompress(rom, int(src, 16))
    vram[dst:dst + len(data)] = data
    dst += len(data)
def rgb(w): return (((w >> 1) & 7) * 36, ((w >> 5) & 7) * 36, ((w >> 9) & 7) * 36)
img = Image.new('RGB', (320, 224)); px = img.load()
for cy in range(28):
    for cx in range(40):
        e = tmap[(cy * 64 + cx) * 2] << 8 | tmap[(cy * 64 + cx) * 2 + 1]
        t, p, hf, vf = e & 0x7ff, (e >> 13) & 3, (e >> 11) & 1, (e >> 12) & 1
        for y in range(8):
            for x in range(8):
                sx, sy = (7 - x if hf else x), (7 - y if vf else y)
                b = vram[t * 32 + sy * 4 + sx // 2]
                c = (b >> 4) if sx % 2 == 0 else b & 15
                px[cx * 8 + x, cy * 8 + y] = rgb(pal[p * 16 + c])
img.resize((640, 448), Image.NEAREST).save(sys.argv[2])
