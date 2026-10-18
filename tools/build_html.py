#!/usr/bin/env python3
"""Pack web/dist into one offline HTML without the player's ROM.

Run npm run build in web first, then python3 tools/build_html.py [out/onboarding/Dune.html].
"""
import base64
import json
from pathlib import Path
import re
import sys


def bundle(destination: Path) -> None:
    root = Path(__file__).resolve().parents[1] / "web" / "dist"
    html = (root / "index.html").read_text()
    tag = re.search(r'<script\b[^>]*src="([^"]+)"[^>]*></script>', html)
    if not tag:
        raise ValueError("Built entry script not found; run npm run build in web")
    entry = root / tag[1].removeprefix("./")
    js = entry.read_text()

    def inline(match: re.Match) -> str:
        name = match[1]
        asset = entry.parent / name
        mime = {".png": "image/png", ".js": "text/javascript", ".woff2": "font/woff2"}.get(asset.suffix)
        if not mime:
            raise ValueError(f"Unsupported asset: {name}")
        uri = f"data:{mime};base64," + base64.b64encode(asset.read_bytes()).decode()
        return json.dumps(uri)

    js = re.sub(r'new URL\("([^\"]+)",import.meta.url\)\.href', inline, js)
    if "import.meta.url" in js:
        raise ValueError("Unresolved module URL in bundle")
    # The application has local system-font fallbacks; an offline copy needs no Google Fonts requests.
    html = re.sub(r"\s*<link\b[^>]*>", "", html)
    js = js.replace("</script", "<\\/script")
    html = re.sub(r'<script\b[^>]*src="[^"]+"[^>]*></script>', lambda _: '<script type="module">' + js + '</script>', html)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html)
    print(f"{destination}: {destination.stat().st_size:,} bytes, ROM not included")


if __name__ == "__main__":
    bundle(Path(sys.argv[1] if len(sys.argv) > 1 else "out/onboarding/Dune.html"))
