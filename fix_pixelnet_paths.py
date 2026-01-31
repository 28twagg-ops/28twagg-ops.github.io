import json
import os
import re
import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
PX = REPO_ROOT / "PIXEL-NET"

ASSETS = PX / "assets"
JS_GAMES = PX / "js" / "games"
IFRAME_GAMES = PX / "games"
GAMES_JSON = PX / "games.json"

IMG_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
JS_EXTS = {".js"}

def slugify(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "game"

def safe_move(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        # If same file name already exists, skip move.
        return
    shutil.move(str(src), str(dst))

def find_by_basename(root: Path, basename: str):
    # Find first match anywhere under PIXEL-NET
    for p in root.rglob(basename):
        if p.is_file():
            return p
    return None

def normalize_rel(p: str) -> str:
    # Convert backslashes, strip leading ./, leading slashes, and any leading PIXEL-NET/
    p = p.replace("\\", "/").strip()
    p = re.sub(r"^\./+", "", p)
    p = re.sub(r"^/+", "", p)
    p = re.sub(r"^PIXEL-NET/+", "", p, flags=re.IGNORECASE)
    return p

def main():
    if not PX.exists():
        raise SystemExit("ERROR: PIXEL-NET folder not found at repo root.")

    if not GAMES_JSON.exists():
        raise SystemExit("ERROR: PIXEL-NET/games.json not found.")

    ASSETS.mkdir(parents=True, exist_ok=True)
    JS_GAMES.mkdir(parents=True, exist_ok=True)
    IFRAME_GAMES.mkdir(parents=True, exist_ok=True)

    data = json.loads(GAMES_JSON.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit("ERROR: games.json must be a JSON array (top-level []).")

    report = {"moved_images": [], "moved_js": [], "updated_entries": [], "unresolved": []}

    # 1) Move all images we can find under PIXEL-NET into assets/ (skip node_modules etc if present)
    for p in PX.rglob("*"):
        if not p.is_file():
            continue
        if any(part.lower() in {"node_modules", ".git"} for part in p.parts):
            continue
        if p.suffix.lower() in IMG_EXTS and "assets" not in p.parts:
            dst = ASSETS / p.name
            safe_move(p, dst)
            report["moved_images"].append(f"{p.relative_to(PX)} -> assets/{p.name}")

    # 2) Move all .js game files under PIXEL-NET into js/games/ (except engine.js or already in place)
    for p in PX.rglob("*.js"):
        if not p.is_file():
            continue
        if any(part.lower() in {"node_modules", ".git"} for part in p.parts):
            continue
        if p.name.lower() == "engine.js":
            continue
        if JS_GAMES in p.parents:
            continue
        # Avoid moving vendor libs if you have any; heuristic: only move files under "games" folders or named like a game
        dst = JS_GAMES / p.name
        safe_move(p, dst)
        report["moved_js"].append(f"{p.relative_to(PX)} -> js/games/{p.name}")

    # 3) Normalize games.json entries
    for i, game in enumerate(data):
        if not isinstance(game, dict):
            report["unresolved"].append(f"Entry {i} is not an object")
            continue

        original = dict(game)
        name = str(game.get("name", f"Game {i+1}"))
        gslug = slugify(name)

        # THUMB
        if "thumb" in game and isinstance(game["thumb"], str):
            thumb_rel = normalize_rel(game["thumb"])
            thumb_name = Path(thumb_rel).name
            # Ensure it exists in assets
            target = ASSETS / thumb_name
            if not target.exists():
                found = find_by_basename(PX, thumb_name)
                if found and found.is_file():
                    safe_move(found, target)
                    report["moved_images"].append(f"{found.relative_to(PX)} -> assets/{thumb_name}")
            if target.exists():
                game["thumb"] = f"assets/{thumb_name}"
            else:
                report["unresolved"].append(f"{name}: missing thumb file '{thumb_name}'")

        # IFRAME PATH
        gtype = str(game.get("type", "")).lower()
        if gtype == "iframe":
            # Normalize path to games/<slug>/index.html
            desired = f"games/{gslug}/index.html"
            # If existing path points to something, try to move that folder into games/<slug>/
            if "path" in game and isinstance(game["path"], str):
                path_rel = normalize_rel(game["path"])
                # locate referenced file
                candidate = PX / path_rel
                if candidate.exists():
                    # If it is a file index.html, move its parent folder
                    if candidate.is_file():
                        src_folder = candidate.parent
                        dst_folder = IFRAME_GAMES / gslug
                        if src_folder != dst_folder:
                            dst_folder.mkdir(parents=True, exist_ok=True)
                            # move entire folder contents
                            for item in src_folder.iterdir():
                                safe_move(item, dst_folder / item.name)
                            # try to remove empty source folder
                            try:
                                src_folder.rmdir()
                            except OSError:
                                pass
                else:
                    # If not found, try to find an index.html by basename
                    found = find_by_basename(PX, "index.html")
                    # too ambiguous to auto-pick; skip
                    pass
            game["path"] = desired

        # JS SCRIPT
        if "script" in game and isinstance(game["script"], str):
            script_rel = normalize_rel(game["script"])
            script_name = Path(script_rel).name
            target = JS_GAMES / script_name
            if not target.exists():
                found = find_by_basename(PX, script_name)
                if found and found.is_file():
                    safe_move(found, target)
                    report["moved_js"].append(f"{found.relative_to(PX)} -> js/games/{script_name}")
            if target.exists():
                game["script"] = f"js/games/{script_name}"
            else:
                report["unresolved"].append(f"{name}: missing script file '{script_name}'")

        if game != original:
            report["updated_entries"].append(f"{name}: updated")

    # Write games.json back
    GAMES_JSON.write_text(json.dumps(data, indent=2), encoding="utf-8")

    # Print report
    print("\n=== PIXEL-NET PATH FIX REPORT ===")
    print(f"Moved images: {len(report['moved_images'])}")
    for x in report["moved_images"][:50]:
        print("  -", x)
    if len(report["moved_images"]) > 50:
        print("  (more omitted)")

    print(f"\nMoved JS files: {len(report['moved_js'])}")
    for x in report["moved_js"][:50]:
        print("  -", x)
    if len(report["moved_js"]) > 50:
        print("  (more omitted)")

    print(f"\nUpdated games.json entries: {len(report['updated_entries'])}")
    for x in report["updated_entries"]:
        print("  -", x)

    if report["unresolved"]:
        print(f"\nUNRESOLVED ({len(report['unresolved'])}) — you must fix these manually:")
        for x in report["unresolved"]:
            print("  -", x)
    else:
        print("\nAll entries resolved ✅")

if __name__ == "__main__":
    main()
