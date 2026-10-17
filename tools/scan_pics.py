#!/usr/bin/env python3
"""Поиск «картинок» формата: палитра(16 слов CRAM) + карта тайлов (N слов) + слово L + LCW(тайлы, L байт).
python3 scan_pics.py ROM OUT.json"""
import json, os, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lcw import decompress, LCWError
rom = open(sys.argv[1], "rb").read()
def cram_ok(o): return all((rom[o + i * 2] << 8 | rom[o + i * 2 + 1]) & 0xF111 == 0 for i in range(16))
res = []
o = 0
while o < len(rom) - 64:
    hit = None
    if cram_ok(o):
        for n in range(4, 1400):
            p = o + 32 + n * 2
            if p + 4 > len(rom): break
            L = rom[p] << 8 | rom[p + 1]
            if L >= 32:
                try:
                    data, cl = decompress(rom, p + 2)
                except (LCWError, IndexError):
                    continue
                # обычно L = длина распакованных тайлов; у части записей L другое, но карта 12x7
                if len(data) == L or (n == 84 and len(data) % 32 == 0):
                    words = struct.unpack(">%dH" % n, rom[o + 32:p])
                    if max(w & 0x7FF for w in words) * 32 < len(data):
                        hit = dict(off=o, map_words=n, tiles=len(data) // 32, lcw=p + 2, clen=cl)
                        break
    if hit:
        res.append(hit); o = hit["lcw"] + hit["clen"]; o += o & 1
    else:
        o += 2
json.dump(res, open(sys.argv[2], "w"), indent=0)
for r in res: print("%06X  карта=%4d слов  тайлов=%4d" % (r["off"], r["map_words"], r["tiles"]))
print("найдено:", len(res))
