#!/usr/bin/env python3
"""Трассировка очереди DMA игры ($00038E: d0=тип, d1=адрес назначения<<16|длина в словах, a0=источник)
и вызовов распаковщика LCW ($000C32). Пишет JSON со списком событий по кадрам.
python3 trace_dma.py ROM STATE "сценарий как у play.py" OUT.json"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emu import Emu, cpu, set_hook, HOOK_M68K_E
HOOKCORE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "third_party", "gpgx_hook", "gpgx_hook.so")
DMA_QUEUE, LCW = 0x38E, 0xC32

def main():
    rom, state, script, out = sys.argv[1:5]
    e = Emu(HOOKCORE, rom, "/tmp"); e.run(1)
    if state != "-": e.load_state(open(state, "rb").read())
    ev, frame = [], [0]
    def hook(t, w, a, v):
        if t != HOOK_M68K_E or a not in (DMA_QUEUE, LCW): return
        _, r = cpu(e)
        if a == DMA_QUEUE:
            ev.append(dict(f=frame[0], kind="dma", type=r[0] & 0xFFFF, dst=(r[1] >> 16) & 0xFFFF, words=r[1] & 0xFFFF, src=r[8] & 0xFFFFFF))
        else:
            ev.append(dict(f=frame[0], kind="lcw", src=r[8] & 0xFFFFFF, dst=r[9] & 0xFFFFFF))
    set_hook(e, hook)
    def run(n):
        for _ in range(n): e.run(1); frame[0] += 1
    for cmd in [c.strip() for c in script.split(";") if c.strip()]:
        c = cmd.split()
        if c[0] == "w": run(int(c[1]))
        elif c[0] == "p": e.hold(*c[1].split("+")); run(3); e.release(); run(10)
        elif c[0] == "h": e.hold(*c[1].split("+")); run(int(c[2])); e.release()
        elif c[0] == "s": e.screenshot(c[1])
        elif c[0] == "save": open(c[1], "wb").write(e.save_state())
    json.dump(ev, open(out, "w"))
    print("событий:", len(ev))

if __name__ == "__main__":
    main()
