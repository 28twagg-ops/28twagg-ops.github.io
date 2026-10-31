# PIXEL-NET licensed-game collection

**Integrated release (v0.0.53):** All ten imported games also appear directly on the regular PIXEL-NET Arcade Floor in `games.json`, under `games/licensed-*/wrapper-v2.html`, using the original shared `wrapper/shell.css` and `wrapper/shell.js` cabinet. The prior `licensed/` gallery remains as a compatibility link, but is no longer the main user journey. Each shared cabinet shows a creator/license panel instead of an unauthorized global leaderboard. Scores remain in the imported game where supported.


These ten games are **third-party works**, NOT original AI-generated PIXEL-NET games. The source and its notices have been preserved, and the 19 original game definitions are preserved within the expanded 29-game catalog `PIXEL-NET/games.json`. Global Firebase score submissions are deliberately disabled for this gallery; locally saved scores are managed by the individual original games.

## Sources (pinned revisions)

- **2048** — Gabriele Cirulli, `https://github.com/gabrielecirulli/2048`, revision `478b6ec346e3787f589e4af751378d06ded4cbbc`, MIT; original license copied to `vendors/2048/LICENSE.txt`. Changes: removed unused home-screen icons and optional bundled font dependency (browser system font fallback), and replaced obsolete iPhone viewport flags with standards-based mobile sizing, leaving original game logic and credits.
- **Astroblast, Missile Defense, Pong, Brickout, Moon Lander, Emoji Survivors, Pool** — Frank Force, `https://github.com/KilledByAPixel/LittleJSArcade`, revision `c14102b706a5f1bbedbbe5087706d6425660300c`, MIT; license at `vendors/littlejs/LICENSE`. Only the minified engine distribution is copied; the upstream loader is adapted to select the included build. `Pool` also includes the original Box2D WebAssembly runtime. **Emoji Survivors:** rather than redistributing Twemoji font binaries, the game uses its documented OS-native emoji fallback; the upstream Twemoji credit/notice is preserved for provenance in `games/TWEMOJI-LICENSE.txt`, but that font itself is not included. Appearance may vary by device.
- **Snake, Flap** — OpenGames contributors, `https://github.com/opengames-dev/opengames-dev.github.io`, revision `930244aaaf13e029aae4dfd6900dee38a55af5d5`, MIT; license at `vendors/opengames/LICENSE`. Two navigation links changed to return to the PIXEL-NET licensed collection. Shared original CSS/JS/SVG assets included.

## Integration
- `licensed/index.html` remains available for old bookmarks, but all ten titles now appear on the main PIXEL-NET Arcade Floor; the source assets are still served from `PIXEL-NET/licensed/vendors/`.
- `licensed/play.html?game=ID` displays the original local HTML in a dedicated full-height iframe, with creator attribution, source repository and license link. Games run unmodified in behavior except for the documented launcher/font/navigation changes.
- No extra Firebase handlers or wrapper score messages are added. These games appear in the 29-game `games.json` catalog and use standard PIXEL-NET cabinets, but are excluded from Firebase score uploads and the Top Pixels competitive board. Any local best scores remain on the user's device.
- Third-party imports are pinned to recorded upstream revisions; future updates require rechecking license, assets, gameplay and original credit.

## Verification
Run from repository root:
```sh
python3 -m http.server 8765 --directory PIXEL-NET
node PIXEL-NET/tests/unified-arcade-smoke.cjs
node PIXEL-NET/tests/licensed-games-smoke.cjs
```
The browser test checks all ten routes and their required resources, loads the game, and rejects missing dependencies, unexpected Firebase calls, and browser errors. This does not certify complete playthroughs on every physical device.
