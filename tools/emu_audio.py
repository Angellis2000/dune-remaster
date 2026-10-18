#!/usr/bin/env python3
"""Запись звука эмулятора в WAV: python3 tools/emu_audio.py LOAD|- START_FRAME FRAMES OUT.wav ["press кадр кнопка;..."]
Для сверки синтеза GEMS в браузере (sound/*.ts). Частота — из retro_get_system_av_info."""
import sys, wave, ctypes as C
sys.path.insert(0, 'tools')
from emu import Emu
load, start, frames, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
presses = {}
if len(sys.argv) > 5:
    for p in sys.argv[5].split(';'):
        if p.strip():
            f, b = p.split(); presses[int(f)] = b
e = Emu('third_party/gpgx_hook/gpgx_hook.so', 'rom/dune_usa.gen', '/tmp')
if load != '-': e.load_state(open(load, 'rb').read())
for f in range(start + frames):
    if f == start: e.audio = []
    if f in presses: e.hold(presses[f])
    if f - 3 in presses: e.release()
    e.run(1)
data = b''.join(e.audio)
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(int(sys.argv[6]) if len(sys.argv) > 6 else 44100); w.writeframes(data); w.close()
print('кадров звука', len(data) // 4, 'на', frames, 'кадров видео =', len(data) // 4 / frames * 60, 'Гц')
