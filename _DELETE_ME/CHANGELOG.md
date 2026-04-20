# PIXEL-NET Patch Changelog

## Mobile + UI fixes
- **millipede-react**: Mobile now scrolls (page overflow enabled on small screens) so the bottom of the game/panels is reachable; panels scroll independently; game box gets a stable responsive height.
- **neon-chase**: Fix initials source (reads `px_player_initials`), allow scrolling in panels on touch (removed `touch-action:none` from body), and make mobile layout stack with a responsive game height while preventing page scroll only when swiping on the canvas.

## Games.json consistency
- **Caked Up Cats** entry was in a different schema (id/title/href). Converted to the standard `{name,type,path,thumb,description}` schema so it renders + clicks correctly.
- Updated **CYBER PYTHON** thumbnail path to `assets/cyber-python_thumb.png`.

## Caked Up Cats wrapper + leaderboard theme
- Added a PIXEL-NET wrapper (`games/caked-up-cats/index.html`) with themed green panels + working leaderboard.
- Kept the full game in an isolated iframe (`games/caked-up-cats/game.html`) and added PIXEL-NET score submit on Game Over.

## Thumbnails
- Generated and added `assets/cyber-python_thumb.png`.
- Added a consistent rounded neon border to `assets/caked-up-cats_thumb.png`.
