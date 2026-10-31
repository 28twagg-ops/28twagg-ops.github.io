# PIXEL-NET Mobile Cleanup — 2026-10-31

Release branch based on public `main`. Keeps existing 28 game routes and visual themes. Does **not** include the five native replacement experiments or generic new D-pads from draft PR #7.

Changes: single active game iframe (previously two rendered at once); compact title/header pills; dynamic viewport and landscape; maximize option; swipe/tap control for Creek Crosser; responsive character cards for Caked Up Cats; Astrotype HUD fix and optional keyboard-only mobile gate; terminal-themed Spyder Casino quick touch commands without changing desktop keyboard mode; iPhone crash cautions for Astroblast and Missile Defense; existing same-theme optimized WebP thumbnails.

Validation: 56 portrait/landscape browser cases, integrated arcade, score-security mocks and creator attribution. Browser startup checks do not certify full gameplay sessions or production database writes. Keep public Firebase rules secure.
