#!/usr/bin/env python3
"""Инструменты для разбора ROM Sega Mega Drive (Dune: The Battle for Arrakis / Dune II).

Команды:
  header   ROM                      -- заголовок картриджа, контрольная сумма, размер
  tiles    ROM OUT.png [opts]       -- вывести весь ROM (или диапазон) как 4bpp тайлы 8x8
  palettes ROM [--min N]            -- найти кандидатов в палитры (формат CRAM 0000BBB0GGG0RRR0)
  state    SAVESTATE OUTDIR         -- снять VRAM/CRAM из сейва Gens/Kega (.gs0..gs9) и
                                       выгрузить все тайлы по 4 палитрам + спрайты + плоскости
  entropy  ROM [--block N]          -- карта энтропии: где сжатые данные, где сырые тайлы/код

Тайлы MD: 8x8, 4 бита на пиксель, 32 байта на тайл, старший полубайт = левый пиксель.
Цвет CRAM: слово big-endian 0000 BBB0 GGG0 RRR0.
"""
import argparse
import math
import os
import struct
import sys

from PIL import Image

# Уровни яркости VDP (нелинейные, как на реальном железе)
MD_LEVELS = [0, 52, 87, 116, 144, 172, 206, 255]


def cram_to_rgb(word):
    r = (word >> 1) & 7
    g = (word >> 5) & 7
    b = (word >> 9) & 7
    return (MD_LEVELS[r], MD_LEVELS[g], MD_LEVELS[b])


def is_cram_word(word):
    return (word & 0xF111) == 0


def gray_palette():
    return [(i * 17, i * 17, i * 17) for i in range(16)]


def decode_tile(data, off):
    """32 байта -> список из 64 индексов цвета."""
    px = []
    for row in range(8):
        for b in data[off + row * 4: off + row * 4 + 4]:
            px.append(b >> 4)
            px.append(b & 15)
    return px


def render_tiles(data, palette, cols=32, transparent0=False):
    n = len(data) // 32
    rows = max(1, math.ceil(n / cols))
    img = Image.new("RGBA", (cols * 8, rows * 8), (0, 0, 0, 0))
    pix = img.load()
    for t in range(n):
        tx, ty = (t % cols) * 8, (t // cols) * 8
        p = decode_tile(data, t * 32)
        for i, c in enumerate(p):
            if transparent0 and c == 0:
                continue
            r, g, b = palette[c]
            pix[tx + (i & 7), ty + (i >> 3)] = (r, g, b, 255)
    return img


# ---------------------------------------------------------------- header
def cmd_header(a):
    rom = open(a.rom, "rb").read()
    if rom[:4] != b"SEGA" and rom[0x100:0x104] != b"SEGA":
        if len(rom) % 1024 == 512:
            print("Похоже на .SMD с 512-байтным заголовком — конвертируйте: mdrom.py smd2bin")
        print("Предупреждение: нет 'SEGA' по адресу 0x100")
    f = lambda o, l: rom[o:o + l].decode("latin-1").rstrip()
    print("Размер файла     :", len(rom), f"({len(rom) // 1024} КБ)")
    print("Система          :", f(0x100, 16))
    print("Копирайт         :", f(0x110, 16))
    print("Имя (внутр.)     :", f(0x120, 48))
    print("Имя (межд.)      :", f(0x150, 48))
    print("Серийный номер   :", f(0x180, 14))
    stored = struct.unpack(">H", rom[0x18E:0x190])[0]
    calc = 0
    for i in range(0x200, len(rom) - 1, 2):
        calc = (calc + (rom[i] << 8 | rom[i + 1])) & 0xFFFF
    print(f"Контр. сумма     : {stored:04X} (расчёт {calc:04X}) {'OK' if stored == calc else 'НЕ СОВПАДАЕТ'}")
    print("I/O              :", f(0x190, 16))
    s, e = struct.unpack(">II", rom[0x1A0:0x1A8])
    print(f"ROM              : {s:06X}-{e:06X}")
    s, e = struct.unpack(">II", rom[0x1A8:0x1B0])
    print(f"RAM              : {s:06X}-{e:06X}")
    print("SRAM             :", rom[0x1B0:0x1BC])
    print("Регион           :", f(0x1F0, 16))
    sp, pc = struct.unpack(">II", rom[0:8])
    print(f"Начальный SP/PC  : {sp:08X} / {pc:08X}")
    for name, idx in (("VBlank (IRQ6)", 30), ("HBlank (IRQ4)", 28)):
        print(f"{name:17}: {struct.unpack('>I', rom[idx * 4: idx * 4 + 4])[0]:08X}")


def cmd_smd2bin(a):
    raw = open(a.rom, "rb").read()[512:]
    out = bytearray()
    for i in range(0, len(raw), 16384):
        blk = raw[i:i + 16384]
        half = len(blk) // 2
        for j in range(half):
            out.append(blk[half + j])
            out.append(blk[j])
    open(a.out, "wb").write(out)
    print("Записано", a.out)


# ---------------------------------------------------------------- tiles
def load_palette(spec, rom):
    if spec is None:
        return gray_palette()
    off = int(spec, 0)
    return [cram_to_rgb(struct.unpack(">H", rom[off + i * 2: off + i * 2 + 2])[0]) for i in range(16)]


def cmd_tiles(a):
    rom = open(a.rom, "rb").read()
    start = int(a.start, 0)
    end = int(a.end, 0) if a.end else len(rom)
    data = rom[start:end]
    data = data[: len(data) // 32 * 32]
    img = render_tiles(data, load_palette(a.palette, rom), cols=a.cols)
    if a.scale > 1:
        img = img.resize((img.width * a.scale, img.height * a.scale), Image.NEAREST)
    img.save(a.out)
    print(f"{len(data) // 32} тайлов, {start:06X}-{start + len(data):06X} -> {a.out}")


# ---------------------------------------------------------------- palettes
def cmd_palettes(a):
    rom = open(a.rom, "rb").read()
    i, found = 0, []
    while i < len(rom) - 32:
        n = 0
        while i + n * 2 + 1 < len(rom) and is_cram_word(rom[i + n * 2] << 8 | rom[i + n * 2 + 1]):
            n += 1
        if n >= a.min:
            words = [rom[i + k * 2] << 8 | rom[i + k * 2 + 1] for k in range(n)]
            distinct = len(set(words))
            # отсеиваем пустые/однородные блоки (нули, заливки)
            if distinct >= a.distinct:
                found.append((i, n, distinct))
            i += n * 2
        else:
            i += 2
    for off, n, d in found:
        print(f"{off:06X}  слов={n:4d}  разных={d:3d}")
    print(f"Найдено кандидатов: {len(found)}")
    if a.png and found:
        sw = 12
        img = Image.new("RGB", (16 * sw + 80, len(found) * sw), (40, 40, 40))
        from PIL import ImageDraw
        dr = ImageDraw.Draw(img)
        for row, (off, n, _) in enumerate(found):
            dr.text((2, row * sw), f"{off:06X}", fill=(255, 255, 255))
            for k in range(min(16, n)):
                w = rom[off + k * 2] << 8 | rom[off + k * 2 + 1]
                dr.rectangle([80 + k * sw, row * sw, 80 + k * sw + sw - 2, row * sw + sw - 2], fill=cram_to_rgb(w))
        img.save(a.png)
        print("Превью ->", a.png)


# ---------------------------------------------------------------- entropy
def cmd_entropy(a):
    rom = open(a.rom, "rb").read()
    bs = a.block
    w = 64
    n = math.ceil(len(rom) / bs)
    img = Image.new("RGB", (w, math.ceil(n / w)), (0, 0, 0))
    pix = img.load()
    for k in range(n):
        blk = rom[k * bs:(k + 1) * bs]
        cnt = [0] * 256
        for b in blk:
            cnt[b] += 1
        e = -sum(c / len(blk) * math.log2(c / len(blk)) for c in cnt if c)
        v = int(e / 8 * 255)
        # красный = высокая энтропия (сжатое), синий = низкая (заливки/таблицы)
        pix[k % w, k // w] = (v, 0, 255 - v)
        if a.verbose:
            print(f"{k * bs:06X} {e:4.2f}")
    img = img.resize((img.width * 8, img.height * 8), Image.NEAREST)
    img.save(a.out)
    print(f"Карта энтропии ({bs} байт/пиксель, {w} блоков в строке) -> {a.out}")


# ---------------------------------------------------------------- savestate
GENS_OFFS = dict(vdp_regs=0xFA, cram=0x112, vsram=0x192, ram=0x2478, vram=0x12478)


def read_gens_state(path, cram_le):
    st = open(path, "rb").read()
    if len(st) < GENS_OFFS["vram"] + 0x10000:
        sys.exit("Файл слишком мал для сейва Gens/Kega (ожидается GST формат)")
    vram = st[GENS_OFFS["vram"]:GENS_OFFS["vram"] + 0x10000]
    craw = st[GENS_OFFS["cram"]:GENS_OFFS["cram"] + 128]
    fmt = "<64H" if cram_le else ">64H"
    cram = list(struct.unpack(fmt, craw))
    regs = st[GENS_OFFS["vdp_regs"]:GENS_OFFS["vdp_regs"] + 24]
    return vram, cram, regs


def cmd_state(a):
    vram, cram, regs = read_gens_state(a.state, not a.cram_be)
    if not all(is_cram_word(w) for w in cram):
        print("Внимание: CRAM выглядит некорректно — попробуйте --cram-be")
    dump_vdp(vram, cram, regs, a.outdir)


def dump_vdp(vram, cram, regs, outdir):
    """Выгрузка VRAM/CRAM/плоскостей/спрайтов в PNG."""
    class _A:
        pass
    a = _A()
    a.outdir = outdir
    os.makedirs(outdir, exist_ok=True)
    pals = [[cram_to_rgb(w) for w in cram[p * 16:(p + 1) * 16]] for p in range(4)]
    open(os.path.join(a.outdir, "vram.bin"), "wb").write(vram)
    open(os.path.join(a.outdir, "cram.bin"), "wb").write(struct.pack(">64H", *cram))

    # палитры
    pimg = Image.new("RGB", (16 * 16, 4 * 16))
    for p in range(4):
        for c in range(16):
            pimg.paste(pals[p][c], (c * 16, p * 16, c * 16 + 16, p * 16 + 16))
    pimg.save(os.path.join(a.outdir, "palettes.png"))

    for p in range(4):
        render_tiles(vram, pals[p], cols=32).save(os.path.join(a.outdir, f"vram_pal{p}.png"))

    # регистры VDP -> адреса таблиц
    plane_a = (regs[2] & 0x38) << 10
    plane_b = (regs[4] & 0x07) << 13
    win = (regs[3] & 0x3E) << 10
    sat = (regs[5] & 0x7F) << 9
    sz = regs[16]
    pw = [32, 64, 32, 128][sz & 3]
    ph = [32, 64, 32, 128][(sz >> 4) & 3]
    h40 = bool(regs[12] & 0x81)
    info = (f"Plane A: {plane_a:04X}\nPlane B: {plane_b:04X}\nWindow: {win:04X}\n"
            f"Sprite table: {sat:04X}\nРазмер плоскостей: {pw}x{ph} тайлов\n"
            f"Режим: {'H40 (320px)' if h40 else 'H32 (256px)'}\nVDP regs: {regs.hex(' ')}\n")
    open(os.path.join(a.outdir, "vdp.txt"), "w").write(info)
    print(info)

    def render_plane(base, name):
        img = Image.new("RGBA", (pw * 8, ph * 8), (0, 0, 0, 0))
        for ty in range(ph):
            for tx in range(pw):
                o = (base + (ty * pw + tx) * 2) & 0xFFFF
                e = vram[o] << 8 | vram[o + 1]
                tile = e & 0x7FF
                pal = pals[(e >> 13) & 3]
                hf, vf = e & 0x800, e & 0x1000
                px = decode_tile(vram, tile * 32)
                for i, c in enumerate(px):
                    if c == 0:
                        continue
                    x, y = i & 7, i >> 3
                    if hf:
                        x = 7 - x
                    if vf:
                        y = 7 - y
                    img.putpixel((tx * 8 + x, ty * 8 + y), pal[c] + (255,))
        img.save(os.path.join(a.outdir, name))

    render_plane(plane_a, "plane_a.png")
    render_plane(plane_b, "plane_b.png")

    # спрайты: идём по связному списку SAT
    sprites, link, seen = [], 0, set()
    while link not in seen and len(sprites) < 80:
        seen.add(link)
        o = (sat + link * 8) & 0xFFFF
        y, szl, attr, x = struct.unpack(">HHHH", vram[o:o + 8])
        w, h = ((szl >> 10) & 3) + 1, ((szl >> 8) & 3) + 1
        sprites.append((x & 0x1FF, y & 0x3FF, w, h, attr))
        link = szl & 0x7F
        if link == 0:
            break
    sdir = os.path.join(a.outdir, "sprites")
    os.makedirs(sdir, exist_ok=True)
    with open(os.path.join(a.outdir, "sprites.txt"), "w") as f:
        for n, (x, y, w, h, attr) in enumerate(sprites):
            tile, pal = attr & 0x7FF, pals[(attr >> 13) & 3]
            hf, vf = attr & 0x800, attr & 0x1000
            img = Image.new("RGBA", (w * 8, h * 8), (0, 0, 0, 0))
            # тайлы спрайта идут по столбцам
            for cx in range(w):
                for cy in range(h):
                    px = decode_tile(vram, ((tile + cx * h + cy) & 0x7FF) * 32)
                    for i, c in enumerate(px):
                        if c:
                            img.putpixel((cx * 8 + (i & 7), cy * 8 + (i >> 3)), pal[c] + (255,))
            if hf:
                img = img.transpose(Image.FLIP_LEFT_RIGHT)
            if vf:
                img = img.transpose(Image.FLIP_TOP_BOTTOM)
            img.save(os.path.join(sdir, f"spr{n:02d}_t{tile:03X}.png"))
            f.write(f"{n:2d} x={x - 128:4d} y={y - 128:4d} {w}x{h} tile={tile:03X} pal={(attr >> 13) & 3} "
                    f"prio={attr >> 15} hflip={bool(hf)} vflip={bool(vf)}\n")
    print(f"Спрайтов: {len(sprites)}. Всё сохранено в {a.outdir}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)

    p = sp.add_parser("header"); p.add_argument("rom"); p.set_defaults(fn=cmd_header)
    p = sp.add_parser("smd2bin"); p.add_argument("rom"); p.add_argument("out"); p.set_defaults(fn=cmd_smd2bin)

    p = sp.add_parser("tiles"); p.add_argument("rom"); p.add_argument("out")
    p.add_argument("--start", default="0"); p.add_argument("--end")
    p.add_argument("--palette", help="смещение палитры в ROM (16 слов CRAM)")
    p.add_argument("--cols", type=int, default=32); p.add_argument("--scale", type=int, default=1)
    p.set_defaults(fn=cmd_tiles)

    p = sp.add_parser("palettes"); p.add_argument("rom")
    p.add_argument("--min", type=int, default=16); p.add_argument("--distinct", type=int, default=6)
    p.add_argument("--png"); p.set_defaults(fn=cmd_palettes)

    p = sp.add_parser("entropy"); p.add_argument("rom"); p.add_argument("out")
    p.add_argument("--block", type=int, default=1024); p.add_argument("-v", "--verbose", action="store_true")
    p.set_defaults(fn=cmd_entropy)

    p = sp.add_parser("state"); p.add_argument("state"); p.add_argument("outdir")
    p.add_argument("--cram-be", action="store_true", help="CRAM в сейве big-endian")
    p.set_defaults(fn=cmd_state)

    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
