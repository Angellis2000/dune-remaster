#!/usr/bin/env python3
"""Разбор бинарных сценариев SCEN?00N.INI из ROM Dune (Mega Drive).

Файловая таблица ROM: $052C54, пары (имя, данные). Сценарий — поток слов:
  тег = (секция << 8) | ключ, дальше значения; FFFF — конец.
  Секция 0 [BASIC]: ключи 0..2 — строки (слово длины + байты), 3..8 — числа.
  Секция 1 [MAP]:   'S' (Seed) = номер карты из таблицы карт.
  Секции 2..? — дома (houseID + 2): 'Q' квота, 'C' кредиты, 'B' мозг ('H'/'C'), 'M' макс. юнитов.
  Остальные секции определяются по данным (см. SECTIONS ниже).
python3 scenario.py ROM [имя]"""
import json, struct, sys

FILES = 0x052C54
SECTIONS = {0: "BASIC", 1: "MAP", 2: "Harkonnen", 3: "Atreides", 4: "Ordos", 5: "Fremen",
            6: "CHOAM", 7: "TEAMS", 8: "UNITS", 9: "STRUCTURES", 10: "REINFORCEMENTS"}
BASIC = {0: "LosePicture", 1: "WinPicture", 2: "BriefPicture", 3: "TimeOut", 4: "MapScale",
         5: "CursorPos", 6: "TacticalPos", 7: "LoseFlags", 8: "WinFlags"}

def files(rom):
    out = {}
    for i in range(0, 66, 2):
        n, d = struct.unpack_from(">II", rom, FILES + i * 4)
        out[rom[n:rom.index(b"\0", n)].decode("latin-1")] = d
    return out

def arity(sec, key):
    """Сколько слов значений идёт за тегом. None — список: слово-счётчик, затем значения."""
    if sec == 1 and key != ord("S"): return None     # MAP Bloom/Field/Special — списки позиций
    if sec == 7: return 5                             # TEAMS: дом, режим ИИ, тип движения, мин, макс
    if sec == 8: return 6                             # UNITS: дом, тип, HP, позиция, направление, действие
    if sec == 9: return 5 if key == ord("I") else 3   # STRUCTURES: I = id,дом,тип,HP,поз; G = поз,дом,тип
    if sec == 10: return ARITY_REINF
    return 1

ARITY_REINF = 4

def parse(rom, addr):
    o = addr; recs = []
    while True:
        tag = struct.unpack_from(">H", rom, o)[0]; o += 2
        if tag == 0xFFFF: break
        sec, key = tag >> 8, tag & 0xFF
        if sec == 0 and key <= 2:
            ln = struct.unpack_from(">H", rom, o)[0]; o += 2
            val = rom[o:o + ln].split(b"\0")[0].decode("latin-1"); o += ln + (ln & 1)
        else:
            n = arity(sec, key)
            if n is None:
                n = struct.unpack_from(">H", rom, o)[0]; o += 2
                val = list(struct.unpack_from(">%dH" % n, rom, o)); o += 2 * n
            else:
                val = list(struct.unpack_from(">%dH" % n, rom, o)); o += 2 * n
                if n == 1: val = val[0]
        if sec not in SECTIONS: raise ValueError("неизвестная секция %d по смещению %X" % (sec, o - addr))
        recs.append((sec, key, val))
    return recs, o - addr

if __name__ == "__main__":
    rom = open(sys.argv[1], "rb").read()
    fs = files(rom)
    names = [sys.argv[2]] if len(sys.argv) > 2 else sorted(k for k in fs if k.startswith("SCEN"))
    for name in names:
        try:
            recs, ln = parse(rom, fs[name])
        except Exception as e:
            print(name, "ОШИБКА", e); continue
        secs = {}
        for s, k, v in recs: secs.setdefault(s, 0); secs[s] += 1
        print(name, "len", ln, "секции", {SECTIONS.get(s, s): c for s, c in sorted(secs.items())})
