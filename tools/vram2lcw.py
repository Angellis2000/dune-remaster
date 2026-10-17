#!/usr/bin/env python3
"""Сопоставить тайлы VRAM с распакованными LCW-потоками и сырыми данными ROM.
python3 vram2lcw.py ROM streams.json VRAM.bin"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lcw import decompress
rom = open(sys.argv[1], "rb").read()
streams = json.load(open(sys.argv[2])); vram = open(sys.argv[3], "rb").read()
idx = {}
for s in streams:
    data, _ = decompress(rom, s["src"])
    for o in range(0, len(data) - 31, 32):
        idx.setdefault(data[o:o + 32], ("lcw", s["src"], o // 32))
for o in range(0, len(rom) - 32, 2):
    idx.setdefault(rom[o:o + 32], ("raw", o, 0))
runs = []
for t in range(2048):
    tile = vram[t * 32:t * 32 + 32]
    if tile.count(tile[0]) == 32: continue
    m = idx.get(tile, ("?", 0, 0))
    if runs and runs[-1][1] == m[0] and runs[-1][2] == m[1] and (m[0] == "?" or m[2] - runs[-1][4] == t - runs[-1][3]) and t - runs[-1][5] <= 2:
        runs[-1][5] = t
    else:
        runs.append([t, m[0], m[1], t, m[2], t])
for t0, kind, src, _, sub, t1 in runs:
    print(f"VRAM {t0:03X}-{t1:03X}  {kind} {src:06X} тайл {sub}")
