#!/usr/bin/env python3
"""Разбор скриптов Westwood EMC2 из ROM (FORM EMC2: TEXT?/ORDR/DATA) и дизассемблер байт-кода.
python3 emc.py ROM [адрес FORM] [-d]"""
import struct, sys, collections

OPS = ["JUMP", "SETRETURN", "PUSH_RET/LOC", "PUSH", "PUSH2", "PUSH_VAR", "PUSH_LOCAL", "PUSH_PARAM",
       "POP_RET/LOC", "POP_VAR", "POP_LOCAL", "POP_PARAM", "STACK_REWIND", "STACK_FORWARD", "FUNCTION",
       "JUMP_NE", "UNARY", "BINARY", "RETURN"]

def chunks(rom, form):
    assert rom[form:form + 4] == b"FORM" and rom[form + 8:form + 12] == b"EMC2"
    end = form + 8 + struct.unpack_from(">I", rom, form + 4)[0]
    o = form + 12; out = {}
    while o < end:
        if not rom[o:o + 4].isalpha(): break
        cid = rom[o:o + 4].decode(); ln = struct.unpack_from(">I", rom, o + 4)[0]
        out[cid] = rom[o + 8:o + 8 + ln]; o += 8 + ln + (ln & 1)
    return out

def decode(data):
    words = struct.unpack(">%dH" % (len(data) // 2), data)
    i = 0; res = []
    while i < len(words):
        cur = words[i]; at = i; i += 1
        op = (cur >> 8) & 0x1F; par = 0
        if cur & 0x8000: op, par = 0, cur & 0x7FFF
        elif cur & 0x4000: par = (cur & 0xFF) - 256 if cur & 0x80 else cur & 0xFF
        elif cur & 0x2000: par = words[i]; i += 1
        res.append((at, op, par))
    return res

if __name__ == "__main__":
    rom = open(sys.argv[1], "rb").read()
    forms = [i for i in range(len(rom)) if rom.startswith(b"FORM", i) and rom[i + 8:i + 12] == b"EMC2"]
    for f in forms:
        c = chunks(rom, f)
        ordr = struct.unpack(">%dH" % (len(c["ORDR"]) // 2), c["ORDR"])
        code = decode(c["DATA"])
        funcs = collections.Counter(p for _, op, p in code if op == 14)
        print("FORM %06X: TEXT=%s ORDR=%d входов DATA=%d слов; функции: %s" % (
            f, "TEXT" in c, len(ordr), len(c["DATA"]) // 2, sorted(funcs.items())))
        print("   входы:", ordr)
