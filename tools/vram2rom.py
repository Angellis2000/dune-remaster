#!/usr/bin/env python3
"""Найти, откуда в ROM пришли тайлы VRAM: python3 vram2rom.py ROM VRAM.bin
Печатает непрерывные участки VRAM, найденные в ROM как есть (без сжатия)."""
import sys
rom = open(sys.argv[1], 'rb').read(); vram = open(sys.argv[2], 'rb').read()
idx = {}
for o in range(0, len(rom) - 32, 2):
    idx.setdefault(rom[o:o + 32], o)
runs, cur = [], None
for t in range(2048):
    tile = vram[t * 32:t * 32 + 32]
    if tile.count(tile[0]) == 32:  # пустые/залитые тайлы неинформативны
        cur = None; continue
    o = idx.get(tile)
    if o is None:
        cur = None; continue
    if cur and o == cur[1] + (t - cur[2]) * 32:
        cur[3] = t
    else:
        cur = [t, o, t, t]; runs.append(cur)
missing = sum(1 for t in range(2048) if vram[t*32:t*32+32].count(vram[t*32]) != 32 and vram[t*32:t*32+32] not in idx)
for t0, o, _, t1 in runs:
    if t1 - t0 >= 1:
        print(f"VRAM tile {t0:03X}-{t1:03X} ({t1 - t0 + 1:3d})  <- ROM {o:06X}-{o + (t1 - t0 + 1) * 32:06X}")
print("тайлов не найдено в ROM (сжатые/генерируемые):", missing)
