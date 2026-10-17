#!/usr/bin/env python3
"""Рисует юниты из ROM по схеме игры (процедуры $0121F8 и $9598). python3 units.py ROM OUT.png"""
import os, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lcw import decompress
from mdrom import cram_to_rgb, decode_tile
from PIL import Image

UNIT_INFO = 0x06C5BC     # указатели на описания 27 типов юнитов
FRAMES = 0x060E8C        # кадры: (источник тайлов, описание кадра), по 8 байт
LOAD_TABLE = 0x00A48C    # что игра грузит в VRAM для спрайтов: (VRAM, слов, источник)
HOUSE_PAL = 0x009588     # строка палитры по дому (слово с битами 13-14)
DIR8, DIR16, DIR_INF = 0x06C668, 0x06C688, 0x06C648
TERRAIN = [(0x0BC538, 0x0000), (0x0BCD42, 0x1000), (0x0BD774, 0x2000), (0x0BE20C, 0x3000),
           (0x0BED2C, 0x4000), (0x0BF8F6, 0x5000), (0x0C0500, 0x6000), (0x0C0F90, 0x7000)]

def u16(b, o): return struct.unpack_from(">H", b, o)[0]
def s16(b, o): return struct.unpack_from(">h", b, o)[0]
def u32(b, o): return struct.unpack_from(">I", b, o)[0]

def build_vram(rom):
    v = bytearray(0x10000)
    for src, dst in TERRAIN:
        d, _ = decompress(rom, src); v[dst:dst + len(d)] = d
    o = LOAD_TABLE
    while True:
        dst, words, src = u16(rom, o), u16(rom, o + 2), u32(rom, o + 4)
        if dst == 0 and words == 0: break
        n = words * 2
        data = rom[src & 0xFFFFFF:(src & 0xFFFFFF) + n] if src & 0x80000000 else decompress(rom, src)[0][:n]
        v[dst:dst + len(data)] = data
        o += 8
    return bytes(v)

def frame(rom, idx):
    src, dfn = u32(rom, FRAMES + idx * 8), u32(rom, FRAMES + idx * 8 + 4)
    d = dfn & 0xFFFFFF
    n = u16(rom, d) + 1
    pieces = [dict(w=s16(rom, d + 2 + k * 12), h=s16(rom, d + 4 + k * 12), y=s16(rom, d + 6 + k * 12),
                   size=u16(rom, d + 8 + k * 12), attr=u16(rom, d + 10 + k * 12), x=s16(rom, d + 12 + k * 12))
              for k in range(n)]
    return dict(src=src, flag=dfn >> 24, pieces=pieces)

def draw_frame(img, rom, vram, pals, idx, cx, cy, house, flip):
    f = frame(rom, idx)
    dyn = f["src"] & 0x80000000
    srcbase = f["src"] & 0xFFFFFF
    first_tile = f["pieces"][0]["attr"] & 0x7FF
    for p in f["pieces"]:
        attr = p["attr"]
        pal = (attr >> 13) & 3 if f["flag"] == 0x0B else (u16(rom, HOUSE_PAL + (house & 7) * 2) >> 13) & 3
        hf = bool(attr & 0x800) ^ bool(flip & 1)
        vf = bool(attr & 0x1000) ^ bool(flip & 2)
        tw, th = ((p["size"] >> 10) & 3) + 1, ((p["size"] >> 8) & 3) + 1
        x0 = -(p["x"] + tw * 8) if flip & 1 else p["x"]
        y0 = -(p["y"] + th * 8) if flip & 2 else p["y"]
        for col in range(tw):
            for row in range(th):
                t = (attr & 0x7FF) + col * th + row
                px = decode_tile(rom, srcbase + (t - first_tile) * 32) if dyn else decode_tile(vram, t * 32)
                for i, c in enumerate(px):
                    if not c: continue
                    X, Y = col * 8 + (i & 7), row * 8 + (i >> 3)
                    if hf: X = tw * 8 - 1 - X
                    if vf: Y = th * 8 - 1 - Y
                    img.putpixel((cx + x0 + X, cy + y0 + Y), pals[pal][c])

def unit_frames(rom, utype, orient, anim=0):
    """-> список (кадр, отражение) по схеме $0121F8."""
    info = u32(rom, UNIT_INFO + utype * 4)
    base, mode = u16(rom, info + 0x46), s16(rom, info + 0x4C)
    if mode == 1 or mode == 5:
        d = ((orient + 16) & 0xFF) >> 5
        return [(base + s16(rom, DIR8 + d * 4), u16(rom, DIR8 + d * 4 + 2))]
    if mode == 2:
        d = ((orient + 8) & 0xFF) >> 4
        return [(base + s16(rom, DIR16 + d * 4), u16(rom, DIR16 + d * 4 + 2))]
    if mode in (3, 4):
        d = ((orient + 16) & 0xFF) >> 5
        off = s16(rom, DIR_INF + d * 4) * 3 + rom[0x6C6C8 + (anim & 3)]
        return [(base + off, u16(rom, DIR_INF + d * 4 + 2))]
    return [(base, 0)]

if __name__ == "__main__":
    rom = open(sys.argv[1], "rb").read()
    vram = build_vram(rom)
    pals = [[cram_to_rgb(u16(rom, 0x0A6C98 + (l * 16 + c) * 2)) for c in range(16)] for l in range(4)]
    img = Image.new("RGB", (8 * 48 + 40, 27 * 40), (60, 50, 30))
    for t in range(27):
        for d in range(8):
            for fi, fl in unit_frames(rom, t, d * 32):
                try: draw_frame(img, rom, vram, pals, fi, 40 + d * 48 + 16, t * 40 + 20, 1, fl)
                except Exception: pass
    img.resize((img.width * 2, img.height * 2), Image.NEAREST).save(sys.argv[2])
