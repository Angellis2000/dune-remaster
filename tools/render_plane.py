import json, sys
from PIL import Image
name, base = sys.argv[1], int(sys.argv[2], 16)
width = int(sys.argv[3]) if len(sys.argv) > 3 else 64
vram = open(f'/home/user/dune-remaster/out/screens/{name}.vram', 'rb').read()
cram = json.load(open(f'/home/user/dune-remaster/out/screens/{name}.json'))['cram']
def rgb(w): return (((w >> 1) & 7) * 36, ((w >> 5) & 7) * 36, ((w >> 9) & 7) * 36)
img = Image.new('RGB', (320, 224))
px = img.load()
for cy in range(28):
    for cx in range(40):
        o = base + (cy * width + cx) * 2
        e = vram[o] << 8 | vram[o + 1]
        t, pal, hf, vf = e & 0x7ff, (e >> 13) & 3, (e >> 11) & 1, (e >> 12) & 1
        for y in range(8):
            for x in range(8):
                sx, sy = (7 - x if hf else x), (7 - y if vf else y)
                b = vram[t * 32 + sy * 4 + sx // 2]
                c = (b >> 4) if sx % 2 == 0 else b & 15
                if c: px[cx * 8 + x, cy * 8 + y] = rgb(cram[pal * 16 + c])
img.resize((640, 448), Image.NEAREST).save(f'/home/user/dune-remaster/out/screens/{name}_{base:04x}.png')
