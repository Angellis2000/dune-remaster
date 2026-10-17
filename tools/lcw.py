"""Westwood LCW (Format80) — распаковщик, как в процедуре ROM $000C32 (Dune MD) и в PC Dune II.

Команды потока:
  0cccpppp pppppppp      копировать (c+3) байт из выхода, отступив назад на p
  10cccccc               копировать c литералов (0x80 = конец)
  11cccccc pppp(LE)      копировать (c+3) байт из выхода по абсолютному смещению p
  FE nnnn(LE) vv         заполнить n байт значением v
  FF nnnn(LE) pppp(LE)   копировать n байт из выхода по абсолютному смещению p
"""


class LCWError(Exception):
    pass


def decompress(src, pos=0, limit=0x10000):
    """-> (данные, длина сжатого потока). Бросает LCWError на мусоре."""
    out = bytearray()
    start = pos
    n = len(src)
    while True:
        if pos >= n:
            raise LCWError("конец ROM")
        b = src[pos]
        pos += 1
        if b & 0x80 == 0:
            cnt = (b >> 4) + 3
            off = ((b & 0x0F) << 8) | src[pos]
            pos += 1
            p = len(out) - off
            if p < 0 or off == 0:
                raise LCWError("плохое относительное смещение")
            for _ in range(cnt):
                out.append(out[p])
                p += 1
        elif b & 0x40 == 0:
            if b == 0x80:
                return bytes(out), pos - start
            cnt = b & 0x3F
            out += src[pos:pos + cnt]
            pos += cnt
        elif b == 0xFE:
            cnt = src[pos] | src[pos + 1] << 8
            out += bytes([src[pos + 2]]) * cnt
            pos += 3
        else:
            if b == 0xFF:
                cnt = src[pos] | src[pos + 1] << 8
                p = src[pos + 2] | src[pos + 3] << 8
                pos += 4
            else:
                cnt = (b & 0x3F) + 3
                p = src[pos] | src[pos + 1] << 8
                pos += 2
            if p + 1 > len(out) and cnt:
                raise LCWError("абсолютное смещение за пределами")
            for _ in range(cnt):
                out.append(out[p])
                p += 1
        if len(out) > limit:
            raise LCWError("слишком длинный выход")
