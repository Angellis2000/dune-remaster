#!/usr/bin/env python3
"""Найти все LCW-потоки в ROM: кандидаты = цели 32-битных указателей + цепочки (поток сразу за потоком).
python3 scan_lcw.py ROM OUT.json"""
import json, os, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lcw import decompress, LCWError
rom = open(sys.argv[1], "rb").read()
cands = set()
for o in range(0, len(rom) - 4, 2):
    v = struct.unpack(">I", rom[o:o + 4])[0] & 0x7FFFFFFF
    if 0x200 <= v < len(rom):
        cands.add(v)
found = {}
def ok(o):
    try:
        data, n = decompress(rom, o)
    except (LCWError, IndexError):
        return None
    if len(data) < 64 or n < 8 or len(data) < n:
        return None
    return data, n
todo = sorted(cands)
while todo:
    o = todo.pop()
    if o in found: continue
    r = ok(o)
    if not r: continue
    data, n = r
    found[o] = dict(src=o, clen=n, ulen=len(data))
    for nxt in (o + n, (o + n + 1) & ~1):
        if nxt not in found: todo.append(nxt)
res = sorted(found.values(), key=lambda x: x["src"])
json.dump(res, open(sys.argv[2], "w"), indent=0)
tot = sum(x["clen"] for x in res)
print(f"потоков: {len(res)}, сжатых байт: {tot} ({tot * 100 // len(rom)}% ROM), распак.: {sum(x['ulen'] for x in res)}")
