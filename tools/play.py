#!/usr/bin/env python3
"""Сценарный прогон: python3 play.py ROM OUTDIR "cmd; cmd; ..." [--load state.bin] [--save state.bin]
Команды: w N (ждать кадров) | p BTN[+BTN] [held] (нажать) | h BTN N (держать N кадров) | s NAME (скриншот)
         | sheet NAME (собрать все скриншоты сценария в лист)"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emu import Emu
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CORE = os.path.join(HERE, "..", "third_party", "gpgx", "gpgx_full.so")

def main():
    rom, out, script = sys.argv[1], sys.argv[2], sys.argv[3]
    opts = dict(zip(sys.argv[4::2], sys.argv[5::2]))
    os.makedirs(out, exist_ok=True)
    e = Emu(CORE, rom, out)
    if "--load" in opts:
        e.run(1); e.load_state(open(opts["--load"], "rb").read())
    shots = []
    for cmd in [c.strip() for c in script.split(";") if c.strip()]:
        a = cmd.split()
        if a[0] == "w": e.run(int(a[1]))
        elif a[0] == "p": e.press(*a[1].split("+"), frames=int(a[2]) if len(a) > 2 else 3, after=int(a[3]) if len(a) > 3 else 10)
        elif a[0] == "h": e.hold(*a[1].split("+")); e.run(int(a[2])); e.release()
        elif a[0] == "s":
            p = os.path.join(out, a[1] + ".png"); e.screenshot(p); shots.append(p)
        elif a[0] == "sheet":
            ims = [Image.open(p) for p in shots]; w, h = ims[0].size; cols = 4
            s = Image.new("RGB", (w * cols, h * (-(-len(ims) // cols))))
            for i, im in enumerate(ims): s.paste(im, ((i % cols) * w, (i // cols) * h))
            s.save(os.path.join(out, a[1] + ".png"))
    if "--save" in opts:
        open(opts["--save"], "wb").write(e.save_state())

if __name__ == "__main__":
    main()
