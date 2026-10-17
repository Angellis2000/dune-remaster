#!/usr/bin/env python3
"""Трассировка вызовов распаковщика LCW ($C32) в оригинальном ROM + сверка с lcw.py.
python3 trace_lcw.py ROM SCRIPT OUT.json  (SCRIPT — как у play.py)"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emu import Emu, cpu, set_hook, HOOK_M68K_E
from lcw import decompress
HOOKCORE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "third_party", "gpgx_hook", "gpgx_hook.so")
LCW_ENTRY, LCW_EXIT = 0xC32, 0xCCA

def run(rom, script, out):
    e = Emu(HOOKCORE, rom, "/tmp")
    romb = open(rom, "rb").read()
    calls, pending = [], []
    def hook(t, w, a, v):
        if t != HOOK_M68K_E: return
        if a == LCW_ENTRY:
            pc, r = cpu(e)
            sp = r[15]; ram = e.ram()
            ret = int.from_bytes(ram[(sp & 0xFFFF):(sp & 0xFFFF) + 4], "big")
            pending.append((r[8], r[9], ret))
        elif a == LCW_EXIT and pending:
            src, dst, ret = pending.pop()
            _, r = cpu(e)
            n = (r[11] - dst) & 0xFFFFFFFF
            ram = e.ram(); got = ram[dst & 0xFFFF:(dst & 0xFFFF) + n] if dst >= 0xFF0000 else b""
            ok = None
            if src < len(romb):
                try: ok = decompress(romb, src)[0] == got
                except Exception: ok = False
            calls.append(dict(src=src, dst=dst, len=n, caller=ret, ok=ok, frame=e_frame[0]))
    e_frame = [0]
    set_hook(e, hook)
    for cmd in [c.strip() for c in script.split(";") if c.strip()]:
        a = cmd.split()
        if a[0] == "w":
            for _ in range(int(a[1])): e.run(1); e_frame[0] += 1
        elif a[0] == "h":
            e.hold(*a[1].split("+"))
            for _ in range(int(a[2])): e.run(1); e_frame[0] += 1
            e.release()
        elif a[0] == "p":
            e.hold(*a[1].split("+")); e.run(3); e.release(); e.run(10); e_frame[0] += 13
        elif a[0] == "s":
            e.screenshot(a[1])
    json.dump(calls, open(out, "w"), indent=0)
    srcs = {c["src"] for c in calls}
    print(f"вызовов: {len(calls)}, уникальных источников: {len(srcs)}, сверка ok: {sum(1 for c in calls if c['ok'])}/{len(calls)}")
    return e

if __name__ == "__main__":
    run(*sys.argv[1:4])
