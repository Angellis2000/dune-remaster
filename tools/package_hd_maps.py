"""Verify exported map layouts/images and package the completed continuous HD set."""
import hashlib
import json
from pathlib import Path
import shutil
import struct
import zipfile
from PIL import Image

project = Path(__file__).resolve().parent.parent
workspace = project.parent
out = workspace / 'hd-map-graphics' / 'final'
report = json.loads((out / 'maps.json').read_text(encoding='utf-8'))
assert len(report) == 27
rom = (project / 'rom' / 'dune_usa.gen').read_bytes()
renderer = project / 'web/src/gfx/continuous-terrain.ts'
minimum_time = renderer.stat().st_mtime
checked = []
for row in report:
    number = row['index']
    stem = f'map_{number:02}'
    layout = json.loads((out / 'layouts' / (stem + '.json')).read_text(encoding='utf-8'))
    ptr, = struct.unpack_from('>I', rom, 0x1b27a + (number - 1) * 4)
    size = 32 if ptr & 0x80000000 else 64
    offset = 16 if size == 32 else 0
    data = rom[ptr & 0x7fffffff:(ptr & 0x7fffffff) + size * size]
    expected = [0] * 4096
    for y in range(size):
        for x in range(size):
            tile = data[y * size + x]
            expected[(y + offset) * 64 + x + offset] = {0xb0:0x7f,0xc0:0xbf}.get(tile,tile)
    assert layout['ground'] == expected, f'ROM layout mismatch: {number}'
    assert layout['bounds'] == {'x':offset,'y':offset,'w':size,'h':size}
    for folder, suffix in [('maps','base'),('spice','spice')]:
        filename = out / folder / f'{stem}_{suffix}.png'
        assert filename.stat().st_mtime >= minimum_time, f'Stale render: {filename}'
        with Image.open(filename) as image:
            assert image.size == (size * 64, size * 64), filename
            image.verify()
        if folder == 'spice':
            with Image.open(filename) as image:
                low,high = image.getchannel('A').getextrema()
                assert low == 0 and high > 0, f'Missing transparent spice layer: {number}'
    checked.append({'map':number,'romLayoutMatches':True,'imageSize':size*64,'spiceAlpha':True})

for name in ['verification.json','regressions.json','game_hd.png','effects_on_sand.png']:
    shutil.copy2(workspace/'hd-map-graphics/previews'/name,out/name)
validation = {
    'maps':checked,
    'romSHA256':hashlib.sha256(rom).hexdigest(),
    'rendererSHA256':hashlib.sha256(renderer.read_bytes()).hexdigest(),
    'generation':'Built-in ImageGen materials and transparent sprites; original ROM semantic masks',
    'originalMapDataChanged':False,
}
(out/'asset-validation.json').write_text(json.dumps(validation,indent=2),encoding='utf-8')
archive = workspace/'dune-continuous-hd.zip'
with zipfile.ZipFile(archive,'w') as z:
    for item in out.rglob('*'):
        if item.is_file():
            # PNG data is already compressed. Avoid spending time recompressing it.
            compression = zipfile.ZIP_STORED if item.suffix == '.png' else zipfile.ZIP_DEFLATED
            z.write(item,Path('dune-continuous-hd')/item.relative_to(out),compress_type=compression)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
print(json.dumps({'maps':27,'baseAndSpiceImages':54,'romLayoutsMatch':27,
                  'zipMB':round(archive.stat().st_size/1048576,1),'archive':str(archive)}))
