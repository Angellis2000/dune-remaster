#!/usr/bin/env python3
"""Полный листинг ROM для поиска по адресам: python3 tools/dis_full.py ROM [КОНЕЦ] > out/dis_full.txt
Идёт подряд с $200; где capstone спотыкается (данные), пишет dc.w и идёт дальше. Нужен pip install capstone."""
import sys
from capstone import Cs, CS_ARCH_M68K, CS_MODE_M68K_000, CS_MODE_BIG_ENDIAN
rom = open(sys.argv[1], "rb").read()
end = int(sys.argv[2], 0) if len(sys.argv) > 2 else len(rom)
md = Cs(CS_ARCH_M68K, CS_MODE_M68K_000 + CS_MODE_BIG_ENDIAN)
out = sys.stdout
a = 0x200
while a < end:
    last = a
    for i in md.disasm(rom[a:end], a):
        out.write(f"{i.address:06X}  {i.bytes.hex():20s} {i.mnemonic} {i.op_str}\n")
        last = i.address + i.size
    if last == a:
        out.write(f"{a:06X}  {rom[a:a + 2].hex():20s} dc.w ${rom[a:a + 2].hex()}\n")
        a += 2
    else:
        a = last
