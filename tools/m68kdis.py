#!/usr/bin/env python3
"""Дизассемблер 68000: python3 dis.py ROM START [LEN]"""
import sys
from capstone import Cs, CS_ARCH_M68K, CS_MODE_M68K_000, CS_MODE_BIG_ENDIAN
rom = open(sys.argv[1], 'rb').read()
s = int(sys.argv[2], 0); n = int(sys.argv[3], 0) if len(sys.argv) > 3 else 0x80
md = Cs(CS_ARCH_M68K, CS_MODE_M68K_000 + CS_MODE_BIG_ENDIAN)
for i in md.disasm(rom[s:s + n], s):
    print(f"{i.address:06X}  {i.bytes.hex():20s} {i.mnemonic} {i.op_str}")
