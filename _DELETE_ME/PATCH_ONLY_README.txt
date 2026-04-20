PATCH_ONLY_neon-chase-v2

Drop-in replacements:
  PIXEL-NET/games/neon-chase-v2/wrapper-v2.html
  PIXEL-NET/games/neon-chase-v2/game.html

What changed (PIXEL-NET-only):
- Wrapper leaderboard is localStorage-only (LB_<folderSlug>), no API calls.
- Wrapper keeps initials keys: playerInitials + PIXELNET_INITIALS (read order primary→mirror, writes both).
- Wrapper keeps GAME_OVER_SCORE listener + dedupe.
- Wrapper enforces 'no scrolling' on mobile panels.
- Game keeps GAME_OVER_SCORE postScoreOnce on gameOver; 'n' dev win key requires ?dev=1.
