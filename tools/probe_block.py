import sys
sys.path.insert(0, sys.argv[1])
from mdrom import decode_tile, cram_to_rgb
from PIL import Image
rom = open(sys.argv[2], 'rb').read()
off = int(sys.argv[3], 0); ntiles = int(sys.argv[4]); out = sys.argv[5]
pal = [cram_to_rgb(rom[off+i*2] << 8 | rom[off+i*2+1]) for i in range(16)]
data = rom[off+32: off+32+ntiles*32]
imgs = []
for h in (2, 3, 4, 6, 7, 12):
    w = -(-ntiles // h)
    for order in ('col', 'row'):
        img = Image.new('RGB', (w*8, h*8), (255, 0, 255))
        for t in range(ntiles):
            if order == 'col': tx, ty = t // h, t % h
            else: tx, ty = t % w, t // w
            if tx >= w or ty >= h: continue
            p = decode_tile(data, t*32)
            for i, c in enumerate(p): img.putpixel((tx*8+(i & 7), ty*8+(i >> 3)), pal[c])
        imgs.append(img)
W = max(i.width for i in imgs); H = sum(i.height+4 for i in imgs)
sheet = Image.new('RGB', (W, H), (60, 60, 60)); y = 0
for i in imgs: sheet.paste(i, (0, y)); y += i.height+4
sheet.resize((W*2, H*2), Image.NEAREST).save(out)
