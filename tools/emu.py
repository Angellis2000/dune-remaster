#!/usr/bin/env python3
"""Безголовый запуск ROM Mega Drive через Genesis Plus GX (libretro) для снятия
экранов, VRAM, CRAM и регистров VDP.

Использование как библиотеки:
    emu = Emu(core_so, rom)
    emu.run(60)                    # 60 кадров
    emu.press("START", frames=2)   # нажать и отпустить
    emu.screenshot("a.png")
    vram, cram, regs = emu.vdp()   # vram в порядке байт MD, cram — слова CRAM
"""
import ctypes as C
import struct

from PIL import Image

# RETRO_DEVICE_ID_JOYPAD_*
BTN = dict(B=0, Y=1, SELECT=2, START=3, UP=4, DOWN=5, LEFT=6, RIGHT=7, A=8, X=9, L=10, R=11)
# Раскладка gpgx (проверено по байту кнопок игры $FFE41B): retro B -> MD B, retro A -> MD C, retro Y -> MD A
MD = dict(A="Y", B="B", C="A", START="START", UP="UP", DOWN="DOWN", LEFT="LEFT", RIGHT="RIGHT",
          X="L", Y="X", Z="R", MODE="SELECT")

ENV_GET_SYSTEM_DIRECTORY = 9
ENV_SET_PIXEL_FORMAT = 10
ENV_GET_VARIABLE = 15
ENV_GET_SAVE_DIRECTORY = 31

ENV_CB = C.CFUNCTYPE(C.c_bool, C.c_uint, C.c_void_p)
VIDEO_CB = C.CFUNCTYPE(None, C.c_void_p, C.c_uint, C.c_uint, C.c_size_t)
AUDIO_CB = C.CFUNCTYPE(None, C.c_int16, C.c_int16)
AUDIO_BATCH_CB = C.CFUNCTYPE(C.c_size_t, C.c_void_p, C.c_size_t)
POLL_CB = C.CFUNCTYPE(None)
STATE_CB = C.CFUNCTYPE(C.c_int16, C.c_uint, C.c_uint, C.c_uint, C.c_uint)


class GameInfo(C.Structure):
    _fields_ = [("path", C.c_char_p), ("data", C.c_void_p), ("size", C.c_size_t), ("meta", C.c_char_p)]


class Variable(C.Structure):
    _fields_ = [("key", C.c_char_p), ("value", C.c_char_p)]


class Emu:
    def __init__(self, core, rom, tmpdir="/tmp"):
        self.lib = C.CDLL(core)
        self.held = set()
        self.frame = None
        self.fmt = 0  # 0=0RGB1555, 1=XRGB8888, 2=RGB565
        self._dir = C.c_char_p(tmpdir.encode())
        self._vars = {b"genesis_plus_gx_system_hw": b"mega drive / genesis",
                      b"genesis_plus_gx_region_detect": b"ntsc-u",
                      b"genesis_plus_gx_overscan": b"disabled",
                      b"genesis_plus_gx_blargg_ntsc_filter": b"disabled"}
        self._keep = []

        def env(cmd, data):
            cmd &= 0xFFFF
            if cmd == ENV_SET_PIXEL_FORMAT:
                self.fmt = C.cast(data, C.POINTER(C.c_uint))[0]
                return True
            if cmd in (ENV_GET_SYSTEM_DIRECTORY, ENV_GET_SAVE_DIRECTORY):
                C.cast(data, C.POINTER(C.c_char_p))[0] = self._dir.value
                return True
            if cmd == ENV_GET_VARIABLE:
                v = C.cast(data, C.POINTER(Variable))[0]
                if v.key in self._vars:
                    s = C.c_char_p(self._vars[v.key])
                    self._keep.append(s)
                    C.cast(data, C.POINTER(Variable))[0].value = s.value
                    return True
                return False
            return False

        def video(data, w, h, pitch):
            if data:
                self.frame = (C.string_at(data, pitch * h), w, h, pitch)

        def state(port, device, index, id_):
            return 1 if port == 0 and device == 1 and id_ in self.held else 0

        self._cbs = [ENV_CB(env), VIDEO_CB(video), AUDIO_CB(lambda l, r: None),
                     AUDIO_BATCH_CB(lambda d, n: n), POLL_CB(lambda: None), STATE_CB(state)]
        L = self.lib
        L.retro_set_environment(self._cbs[0])
        L.retro_init()
        L.retro_set_video_refresh(self._cbs[1])
        L.retro_set_audio_sample(self._cbs[2])
        L.retro_set_audio_sample_batch(self._cbs[3])
        L.retro_set_input_poll(self._cbs[4])
        L.retro_set_input_state(self._cbs[5])
        self._rom = open(rom, "rb").read()
        self._rombuf = C.create_string_buffer(self._rom, len(self._rom))
        gi = GameInfo(rom.encode(), C.cast(self._rombuf, C.c_void_p), len(self._rom), None)
        L.retro_load_game.argtypes = [C.POINTER(GameInfo)]
        if not L.retro_load_game(C.byref(gi)):
            raise RuntimeError("retro_load_game failed")
        L.retro_serialize_size.restype = C.c_size_t
        L.retro_serialize.argtypes = [C.c_void_p, C.c_size_t]
        L.retro_unserialize.argtypes = [C.c_void_p, C.c_size_t]

    # ---------------------------------------------------------- управление
    def run(self, n=1):
        for _ in range(n):
            self.lib.retro_run()

    def hold(self, *buttons):
        self.held = {BTN[MD[b]] for b in buttons}

    def release(self):
        self.held = set()

    def press(self, *buttons, frames=3, after=10):
        self.hold(*buttons)
        self.run(frames)
        self.release()
        self.run(after)

    def save_state(self):
        n = self.lib.retro_serialize_size()
        buf = C.create_string_buffer(n)
        self.lib.retro_serialize(buf, n)
        return buf.raw

    def load_state(self, raw):
        buf = C.create_string_buffer(raw, len(raw))
        self.lib.retro_unserialize(buf, len(raw))

    # ---------------------------------------------------------- снятие данных
    def image(self):
        data, w, h, pitch = self.frame
        img = Image.new("RGB", (w, h))
        px = img.load()
        if self.fmt == 1:
            for y in range(h):
                row = struct.unpack_from("<%dI" % w, data, y * pitch)
                for x, v in enumerate(row):
                    px[x, y] = ((v >> 16) & 255, (v >> 8) & 255, v & 255)
        else:
            for y in range(h):
                row = struct.unpack_from("<%dH" % w, data, y * pitch)
                for x, v in enumerate(row):
                    if self.fmt == 2:
                        px[x, y] = ((v >> 11) << 3, ((v >> 5) & 63) << 2, (v & 31) << 3)
                    else:
                        px[x, y] = (((v >> 10) & 31) << 3, ((v >> 5) & 31) << 3, (v & 31) << 3)
        return img

    def screenshot(self, path, scale=1):
        img = self.image()
        if scale > 1:
            img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
        img.save(path)

    def vdp(self):
        """-> (vram 64К в порядке байт MD, список 64 слов CRAM формата MD, регистры 0..23)."""
        raw = (C.c_uint8 * 0x10000).in_dll(self.lib, "vram")
        v = bytes(raw)
        # gpgx хранит VRAM словами в порядке хоста (little-endian) -> переставляем байты
        vram = bytearray(0x10000)
        vram[0::2] = v[1::2]
        vram[1::2] = v[0::2]
        c9 = (C.c_uint16 * 64).in_dll(self.lib, "cram")
        # gpgx: 9 бит BBBGGGRRR -> слово MD 0000BBB0GGG0RRR0
        cram = [((w & 0x1C0) << 3) | ((w & 0x38) << 2) | ((w & 7) << 1) for w in c9]
        regs = bytes((C.c_uint8 * 0x20).in_dll(self.lib, "reg"))[:24]
        return bytes(vram), cram, regs

    def ram(self):
        r = bytes((C.c_uint8 * 0x10000).in_dll(self.lib, "work_ram"))
        out = bytearray(0x10000)  # тоже словами little-endian
        out[0::2] = r[1::2]
        out[1::2] = r[0::2]
        return bytes(out)


M68K_DAR_OFF, M68K_PC_OFF = 10264, 10328  # offsetof(m68ki_cpu_core, dar/pc) для этой сборки gpgx


def cpu(emu):
    base = C.addressof(C.c_uint8.in_dll(emu.lib, "m68k"))
    dar = list((C.c_uint32 * 16).from_address(base + M68K_DAR_OFF))
    pc = C.c_uint32.from_address(base + M68K_PC_OFF).value
    return pc, dar


# ---------------------------------------------------------------- хуки CPU (нужна сборка gpgx_hook.so)
HOOK_CB = C.CFUNCTYPE(None, C.c_int, C.c_int, C.c_uint, C.c_uint)
HOOK_M68K_E, HOOK_M68K_R, HOOK_M68K_W, HOOK_VRAM_W = 1, 2, 4, 16


def set_hook(emu, fn):
    """fn(type, width, address, value) — вызывается на каждое событие. None — снять хук."""
    emu._hook = HOOK_CB(fn) if fn else None
    emu.lib.set_cpu_hook(emu._hook if fn else C.cast(None, HOOK_CB))
