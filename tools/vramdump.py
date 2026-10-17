#!/usr/bin/env python3
"""Снять VDP из сохранённого состояния эмулятора: python3 vramdump.py ROM STATE OUTDIR [кадров]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emu import Emu
from mdrom import dump_vdp
from play import CORE
rom, st, out = sys.argv[1:4]
e = Emu(CORE, rom, out if os.path.isdir(out) else "/tmp")
e.run(1); e.load_state(open(st, "rb").read()); e.run(int(sys.argv[4]) if len(sys.argv) > 4 else 1)
vram, cram, regs = e.vdp()
dump_vdp(vram, cram, regs, out)
e.screenshot(os.path.join(out, "screen.png"))
