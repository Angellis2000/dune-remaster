#!/usr/bin/env python3
"""Перевод таблиц OpenDUNE (src/table/*.c) из C в TypeScript.

Разбирает инициализаторы C: вложенные { }, значения с комментариями /* имя */ становятся
полями объектов, идентификаторы из enum/define раскрываются в числа. Результат —
web/src/engine/tables.gen.ts (генерируется, руками не правится).
python3 ctables.py OPENDUNE_SRC OUT.ts"""
import json, os, re, sys

SRC, OUT = sys.argv[1], sys.argv[2]

def strip_comments_keep_fields(s):
    s = re.sub(r"//[^\n]*", "", s)
    # /* имя */ перед значением превращаем в маркер поля @имя@
    s = re.sub(r"/\*\s*([A-Za-z_][A-Za-z_0-9\[\]]*)\s*\*/", lambda m: " @%s@ " % m.group(1), s)
    s = re.sub(r"/\*.*?\*/", " ", s, flags=re.S)
    return s

# ---------------------------------------------------------------- enum-ы
consts = {"true": 1, "false": 0, "NULL": 0}
def collect_enums(path):
    t = open(path, encoding="latin-1").read()
    t = re.sub(r"/\*.*?\*/", " ", t, flags=re.S); t = re.sub(r"//[^\n]*", "", t)
    for body in re.findall(r"enum\s*[A-Za-z_0-9]*\s*\{(.*?)\}", t, flags=re.S):
        val = -1
        for item in body.split(","):
            item = item.strip()
            if not item: continue
            if "=" in item:
                name, expr = [x.strip() for x in item.split("=", 1)]
                try: val = evaluate(expr)
                except Exception: continue
            else:
                name = item; val += 1
            consts[name] = val
    for name, expr in re.findall(r"#define\s+([A-Z_][A-Z_0-9]*)\s+([^\n]+)", t):
        try: consts[name] = evaluate(expr)
        except Exception: pass

def evaluate(expr):
    e = expr.strip().rstrip(",")
    e = re.sub(r"\b0x([0-9A-Fa-f]+)\b", lambda m: str(int(m.group(1), 16)), e)
    e = re.sub(r"\(\s*(u?int(8|16|32)|int8|int16)\s*\)", "", e)
    def rep(m):
        n = m.group(0)
        if n in consts: return "(%d)" % consts[n]
        raise KeyError(n)
    e = re.sub(r"[A-Za-z_][A-Za-z_0-9]*", rep, e)
    if not re.fullmatch(r"[0-9()+\-*/|&<> ~^]*", e): raise ValueError(e)
    e = e.replace("/", "//")
    return int(eval(e))

for root, _, files in os.walk(SRC):
    for f in files:
        if f.endswith(".h"): collect_enums(os.path.join(root, f))

# ---------------------------------------------------------------- инициализаторы
TOK = re.compile(r'\s*(@[A-Za-z_0-9\[\]]+@|"(?:[^"\\]|\\.)*"|\{|\}|,|[^{},"@]+)')

def parse_value(tokens, i, statics):
    """-> (значение, i). Объект, если внутри есть поля @имя@, иначе массив."""
    t = tokens[i]
    if t == "{":
        i += 1; items = []; fields = []; pending = None
        while tokens[i] != "}":
            if tokens[i].startswith("@"):
                pending = tokens[i][1:-1]; i += 1; continue
            if tokens[i] == ",": i += 1; continue
            v, i = parse_value(tokens, i, statics)
            items.append(v); fields.append(pending); pending = None
        i += 1
        named = [f for f in fields if f]
        if named and len(named) >= len(items) - 1:
            obj = {}
            for k, (f, v) in enumerate(zip(fields, items)):
                obj[f or "_%d" % k] = v
            return obj, i
        return items, i
    if t.startswith('"'):
        return json.loads(t), i + 1
    expr = t.strip()
    if expr in statics: return statics[expr], i + 1
    if expr.startswith("&") and expr[1:] in statics: return statics[expr[1:]], i + 1
    try:
        return evaluate(expr), i + 1
    except Exception:
        return expr, i + 1

def tables_in(path, statics):
    t = strip_comments_keep_fields(open(path, encoding="latin-1").read())
    out = {}
    for m in re.finditer(r"(?:static\s+)?(?:const\s+)?[A-Za-z_0-9]+[\s\*]+(?:const\s+)?\**\s*\b([A-Za-z_][A-Za-z_0-9]*)\s*((?:\[[^\]]*\])*)\s*=\s*", t):
        name = m.group(1)
        start = m.end()
        if start >= len(t) or t[start] not in "{\"": continue
        depth = 0; j = start
        while True:
            if t[j] == "{": depth += 1
            elif t[j] == "}":
                depth -= 1
                if depth == 0: break
            elif t[j] == ";" and depth == 0: break
            j += 1
        body = t[start:j + 1]
        tokens = [x for x in TOK.findall(body) if x.strip()]
        val, _ = parse_value(tokens, 0, statics)
        statics[name] = val
        if name.startswith("g_table_"): out[name] = val
    return out

result = {}
statics = {}
for f in ["tilediff.c", "landscapeinfo.c", "actioninfo.c", "houseinfo.c", "movementtype.c", "teamaction.c",
          "explosion.c", "animation.c", "unitinfo.c", "structureinfo.c"]:
    result.update(tables_in(os.path.join(SRC, "table", f), statics))

with open(OUT, "w") as o:
    o.write("/* Сгенерировано tools/ctables.py из таблиц OpenDUNE (src/table/*.c). Не править вручную. */\n")
    o.write("/* eslint-disable */\n")
    for name, val in result.items():
        o.write("export const %s: any = %s;\n" % (name, json.dumps(val, ensure_ascii=False)))
print("таблиц:", len(result), ", ".join(result))
