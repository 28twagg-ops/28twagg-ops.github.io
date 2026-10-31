#!/usr/bin/env python3
"""Make small, high-quality, web-friendly preview thumbnails.

Only images loaded by games.json are processed. Original assets remain in the
repository for rollback/reference. Never touches gameplay screenshots or ROMs.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "games.json"
MAX_SIZE = 640
TARGET_KB = 130

def main() -> None:
    games = json.loads(CATALOG.read_text(encoding="utf-8"))
    before = 0
    after = 0
    converted = 0
    for game in games:
        name = game.get("thumb")
        if not name:
            continue
        old = ROOT / name
        if not old.exists():
            raise FileNotFoundError(f"missing catalog thumbnail for {game['slug']}: {name}")
        if old.suffix.lower() == ".svg":
            continue
        # Can be rerun safely; generated paths become the catalog inputs.
        target = old.with_name(old.stem.removesuffix("-optimized") + "-optimized.webp")
        if old.suffix.lower() == ".webp" and old == target:
            continue
        with Image.open(old) as original:
            im = ImageOps.exif_transpose(original)
            before += old.stat().st_size
            im.thumbnail((MAX_SIZE, MAX_SIZE), Image.Resampling.LANCZOS)
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
            if im.mode == "RGBA":
                im.save(target, "WEBP", quality=76, method=6)
            else:
                im.convert("RGB").save(target, "WEBP", quality=77, method=6)
            if target.stat().st_size > TARGET_KB * 1024:
                im.save(target, "WEBP", quality=64, method=6)
            after += target.stat().st_size
            converted += 1
            game["thumb"] = "assets/" + target.name

    CATALOG.write_text(json.dumps(games, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if converted:
        ratio = 100 * (1 - after / before) if before else 0
        print(f"THUMBNAILS converted={converted} original_bytes={before} optimized_bytes={after} reduction={ratio:.1f}%")
    else:
        print("THUMBNAILS already optimized; no changes")

if __name__ == "__main__":
    main()
