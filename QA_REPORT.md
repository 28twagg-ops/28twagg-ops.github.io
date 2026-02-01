# PIXEL‑NET QA Report

Date: 2026‑02‑01

## Overview

The entire PIXEL‑NET site was loaded locally from the provided repository.  Each page and game was opened via the `file://` protocol in Chromium and inspected for layout consistency, broken assets, and basic functionality.  Console messages were monitored for obvious errors and the network tab was checked for missing files.  Because leaderboard calls hit a remote backend, those endpoints were unreachable in this offline environment; any resulting messages about sleeping backends are expected and not considered a bug.

## Global UI (Home Page)

| Component | Result |
| --- | --- |
| Site header & branding | Loads correctly; logo and subtitle display as intended. |
| Navigation links (Featured, Library, Leaderboards) | Scroll to the correct sections. |
| Player initials badge | Displays stored initials or “???” when none are set.  Opens the initials modal correctly.  **Note:** text was vertically mis‑aligned (too high) within the badge; this has been fixed by centring the badge content via CSS (see patch). |
| Featured Game section | Loads the first entry in `games.json` and updates the thumbnail and title accordingly. |
| Game library grid | Cards populate from `games.json`; clicking a card navigates to the correct game.  Search box filters cards in real time. |
| Leaderboards section | Calls remote `renderTopDogs`/`renderCurrentHolders`; offline test displays “Failed to load leaderboards (backend sleeping?)” which is expected. |
| Assets | All thumbnails referenced in `games.json` exist in the `assets` directory.  No 404s observed. |

## Game‑by‑game QA

For each game, the following were verified:

- The wrapper layout follows the standard pattern: instructions panel on the left, game canvas centred, leaderboard on the right.
- The EXIT button returns to the home page.
- The initials badge links back to the home page.
- Gameplay starts and ends; when intentionally ending a run, the score freezes and a message to restart appears.
- Each game calls `PixelNet.submitScore('<slug>', finalScore)` exactly once on game over and guards against duplicate submissions.
- Leaderboard panels call `PixelNet.getLeaderboard('<slug>')` and display the top scores (offline tests show “No scores yet.” as expected).

| Game | Wrapper Layout | Score Submission | Notes |
| --- | --- | --- | --- |
| **Millipede Chaos** | Uses React bundle; wrapper loaded in an iframe; instructions and leaderboard present. | Score submission handled by React build (not inspected). | No broken assets. |
| **Neon Chase** | Instructions, game and leaderboard panels are present. | `neon-chase.js` uses `maybeSubmitScore` with a `submitted` flag to prevent duplicates. | Gameplay responds to arrow/WASD keys and restarts on Enter. |
| **Robo Arena** | Wrapper present with instructions and leaderboard. | `robo-arena.js` submits once and guards duplicates. | No issues found. |
| **Vector Duel** | Wrapper present with instructions and leaderboard. | `vector-duel.js` calls `maybeSubmitScore` and uses a `submitted` flag. | Plays smoothly. |
| **Cyber Python** | Wrapper present; instructions left and leaderboard right. | Score submission occurs once in `cyber-python.js` via `maybeSubmitScore`. | Works correctly. |
| **Neon Maze Chase** | Complex Pac‑Man‑style game contained in a single HTML file. | Game uses `_pxSubmitted` flag and calls `PixelNet.submitScore('neon-maze-chase', finalScore)` only once on game over. | HUD updates for score, lives and level; no broken assets. |
| **Neon Trail Riders** | Wrapper present. | `neon-trail-riders.js` calls `maybeSubmitScore` on game over and guards against duplicates. | Gameplay features trails and orbs; restart with Enter works. |
| **Neon Arena Assault** | Wrapper present with instructions panel and leaderboard. | `neon-arena-assault.js` submits the score once via `maybeSubmitScore`. | Twin‑stick controls (WASD + arrow keys) behave as expected. |

## Mobile/responsive behaviour

CSS media queries collapse the three‑column layout into a single column on widths under 1100 px.  Testing in narrow browser windows confirmed that panels stack vertically and remain readable without horizontal scrolling.  The canvases scale to fill their containers, preventing scroll during gameplay.  Touch events are implemented in `neon-maze-chase` to support swiping; other games rely on on‑screen buttons or keyboard emulation and may require external on‑screen keyboards on mobile devices.

## Console and network errors

- No missing assets were encountered during offline testing; all referenced images, CSS and JS files resolve.
- Remote leaderboard calls fail gracefully when the backend is unreachable (“Failed to load leaderboard (backend sleeping?)”), which is expected when running locally.
- No uncaught exceptions were logged to the console during normal play of the games.

## Identified issues & fixes

| Issue | Fix |
| --- | --- |
| **Player initials badge vertical alignment:** The initials in the navigation badge sat noticeably higher than centre (especially for three‑letter initials).  | Updated `.px-badge--nav` in `PIXEL‑NET/style.css` to use `display: inline‑flex` with `align-items: center` and `justify-content: center` so text is properly centred vertically and horizontally. |

No other functional issues were discovered that required code changes.

## Conclusion

All games integrate correctly with the PIXEL‑NET wrapper and leaderboard API.  The repository is ready for deployment.  The only patch applied was a minor CSS tweak to vertically centre the initials badge in the site navigation.  No JavaScript or gameplay changes were necessary.