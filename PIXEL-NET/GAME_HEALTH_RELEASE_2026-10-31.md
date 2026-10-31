# PIXEL-NET game-health triage — October 31, 2026

## Release decision

**Original catalog:** 29 game cards (19 originals and 10 attributed imports).  
**Public catalog after cleanup:** 28 game cards (18 originals and 10 imports).  
**Archived:** Retro Kombat, a definite non-game placeholder. **Fixed rather than archived:** Millipede Chaos (obsolete missing engine.js script request).

This is a **public catalog visibility change**: archived game source and history are retained, but visitors do not see an Arcade Floor card for an unplayable title. Do not claim a game is "beyond repair" simply because a first automated session reported a browser warning.

## Evidence

Full Playwright Chromium game-health inspection: [GitHub Actions run 41242166322](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41242166322). Runtime triage visited all **29** pre-cleanup titles, sampled their game frames, captured error states and screenshots, and recorded missing HTTP assets.

| Title | Evidence | Decision |
|---|---|---|
| **Retro Kombat** | `games/retro-kombat-v2/embed.html` redirects to `coming-soon.html`, which explicitly says it is a placeholder and contains no gameplay | **Archive immediately**; restore only after a real fighting game passes browser/mobile QA |
| **Millipede Chaos** | Browser requested nonexistent `/js/engine.js` (HTTP 404). Actual canvas and game code are self-contained in `game.html` | **Repair** by removing the obsolete dependency and test a real START click; keep visible if regression passes |
| Dig Dug Delve | Emulator renders a visible game board, and emulator reports started; the only page errors in CI were `Wake Lock permission request denied` | **Keep**; wake-lock denial is a browser-permission issue, not evidence of a failed ROM boot |
| Combat 77 Arena | Emulator board, tanks and controls visible; wake-lock denial only | **Keep** |
| Jungle Jr Rescue | Emulator visibly displays the game intro and sprites; wake-lock denial only | **Keep** |
| Track Field Blitz | Emulator loaded and rendered a C64 BASIC loading screen; wake-lock denial only. This snapshot is **not** proof the game completes loading or plays correctly | **Keep provisionally**; requires longer loading/gameplay testing, especially on phones |
| Tower Rush | Emulator renders platforms/player in a visible game; wake-lock denial only | **Keep** |

All other 22 titles in the initial sweep produced no flagged page errors or broken local resources in this limited audit. This is not a full game completion/quality certification.

**Important:** Some emulator-based titles use third-party game ROMs. A running emulator does not establish redistribution permission. Their licensing/provenance needs independent review, separate from this broken-game cleanup.

## Publication safeguards

- `archived-games.json` holds the complete original game metadata and a restoration criterion; it is not loaded by the homepage.
- `games.json` contains only visible game cards; existing game source directories remain unchanged.
- `tests/arcade-publish-guard.cjs` fails if archived games return to the public catalog, a wrapper/source/thumbnail is missing, or a visible entry redirects to a Coming Soon placeholder.
- `tests/unified-arcade-smoke.cjs` verifies all active cards/cabinets and a real Millipede start without missing asset requests.
- The ten imported games remain in the unified arcade with creator/license credits and **no global score uploads**.

## Follow-ups

The C64 loading-stage game and emulator titles should get longer mobile/keyboard gameplay tests and a provenance/licensing audit. If a game repeatedly fails to start, reproduce the failure and archive it with the same metadata-and-restoration procedure; don't silently delete code or player scores.
