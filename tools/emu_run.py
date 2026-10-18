#!/usr/bin/env python3
"""python3 tools/emu_run.py LOAD SAVE OUTDIR "cmds" [VDP.json] — как play.py, плюс:
  poke ADDR BYTES VALUE   — записать в RAM (big-endian)
  house OFF BYTES VALUE   — поле дома игрока
  peek ADDR BYTES         — напечатать
  sel                     — показать выбранное здание (адрес, тип, $52, $56)
  unlock                  — хук: список двора видит все постройки дома ($00FE98), пункт улучшения — радар
  forceup                 — хук: здание «можно улучшить» ($00FB0E)
  trace on|off, dumptrace — записывать DMA ($00038E) и LCW ($000C32)
Окна любых зданий: выбрать двор и записать в его байт +2 нужный тип (poke ADDR+2 1 ТИП), затем A.
Нужна сборка gpgx_hook.so (tools/build_emu.sh). Пароль на экране ввода: см. out/pwtype.py в истории
(буквы 10 в ряд, курсор стрелками) или раздел HANDOFF «Окна зданий»."""
import os, sys, struct, ctypes as C
sys.path.insert(0, 'tools')
from emu import Emu, set_hook, HOOK_M68K_E, M68K_DAR_OFF
from PIL import Image
load, save, out, script = sys.argv[1:5]
os.makedirs(out, exist_ok=True)
e = Emu('third_party/gpgx_hook/gpgx_hook.so', 'rom/dune_usa.gen', '/tmp'); e.run(1)
if load != '-': e.load_state(open(load, 'rb').read()); e.run(1)
raw = (C.c_uint8 * 0x10000).in_dll(e.lib, 'work_ram')
def poke(a, n, v):
    for i in range(n): raw[((a + i) & 0xffff) ^ 1] = (v >> (8 * (n - 1 - i))) & 255
def peek(a, n):
    r = e.ram(); a &= 0xffff; return int.from_bytes(r[a:a + n], 'big')
def house(): return peek(0xffdc24, 4) + peek(0xffc274, 2) * 0x46
shots = []
def regs():
    base = C.addressof(C.c_uint8.in_dll(e.lib, 'm68k'))
    return (C.c_uint32 * 16).from_address(base + M68K_DAR_OFF)
TRACE = []
tracing = [False]
FRAME = [0]
force_up = [False]
def unlock_hook(t, w, a, v):
    # список двора $00FECC: d5 = постройки дома — открыть всё
    if t != HOOK_M68K_E: return
    if a == 0xfe98: regs()[5] = 0x7ffff
    if a in (0xfba2, 0xfc08): regs()[0] |= 1 << 18  # «радар построен» для пункта улучшения
    if a == 0xfb0e and force_up[0]: regs()[0] = 1
    if a in (0xfb0e, 0xfb36) and tracing[0]: TRACE.append(('up', hex(a), hex(regs()[0]), hex(regs()[5])))
    if tracing[0] and a in (0x38e, 0xc32):
        r = regs()
        if a == 0x38e: TRACE.append((FRAME[0], 'dma', r[0] & 0xffff, hex((r[1] >> 16) & 0xffff), r[1] & 0xffff, hex(r[8] & 0xffffff)))
        else: TRACE.append((FRAME[0], 'lcw', hex(r[8] & 0xffffff), hex(r[9] & 0xffffff)))
for cmd in [c.strip() for c in script.split(';') if c.strip()]:
    a = cmd.split()
    if a[0] == 'w':
        for _ in range(int(a[1])): e.run(1); FRAME[0] += 1
    elif a[0] == 'p': e.press(*a[1].split('+'), frames=int(a[2]) if len(a) > 2 else 3, after=int(a[3]) if len(a) > 3 else 10)
    elif a[0] == 'h': e.hold(*a[1].split('+')); e.run(int(a[2])); e.release()
    elif a[0] == 'poke': poke(int(a[1], 16), int(a[2]), int(a[3], 0))
    elif a[0] == 'house': poke(house() + int(a[1], 16), int(a[2]), int(a[3], 0))
    elif a[0] == 'unlock': set_hook(e, unlock_hook)
    elif a[0] == 'forceup': force_up[0] = True
    elif a[0] == 'trace': tracing[0] = a[1] == 'on'
    elif a[0] == 'dumptrace':
        for x in TRACE: print(*x)
    elif a[0] == 'peek': print(a[1], hex(peek(int(a[1], 16), int(a[2]))))
    elif a[0] == 'sel':
        s = peek(0xffc578, 4)
        print('sel', hex(s), 'type', peek(s + 2, 1) if s else None, '$52', peek(s + 0x52, 2) if s else None, '$56', peek(s + 0x56, 2) if s else None, '$6', hex(peek(s + 6, 2)) if s else None)
    elif a[0] == 's': p = os.path.join(out, a[1] + '.png'); e.screenshot(p); shots.append(p)
    elif a[0] == 'sheet':
        ims = [Image.open(p) for p in shots]; w, h = ims[0].size; cols = 4
        sh = Image.new('RGB', (w * cols, h * (-(-len(ims) // cols))))
        for i, im in enumerate(ims): sh.paste(im, ((i % cols) * w, (i // cols) * h))
        sh.save(os.path.join(out, a[1] + '.png'))
import json
if len(sys.argv) > 5: json.dump(dict(vram=list(e.vdp()[0]), cram=e.vdp()[1], regs=list(e.vdp()[2])), open(sys.argv[5], 'w'))
if save != '-': open(save, 'wb').write(e.save_state())
