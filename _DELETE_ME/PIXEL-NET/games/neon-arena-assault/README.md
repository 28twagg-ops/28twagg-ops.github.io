# Neon Arena Assault

Neon Arena Assault is an original twin‑stick style shooter developed exclusively for PIXEL‑NET.  It’s a throwback to arcade arena shooters with fast reflexes, enemy waves and combo‑driven scoring, wrapped in a neon cyberpunk aesthetic.  All code and artwork were handcrafted for this release and do not reuse any copyrighted assets.

## How to Play

* **Movement:** Use **WASD** to dash around the arena.  You can move in any direction and strafe while firing.
* **Aim & Shoot:** Use the **arrow keys** to fire neon blasts.  Hold a direction to autofire, and combine multiple keys for diagonal shots.
* **Objective:** Survive as long as you can against incoming waves of homing enemies.  Each kill awards points, and chaining kills quickly increases your combo multiplier for bigger rewards.
* **Combo System:** If you destroy an enemy within 2 seconds of your previous kill your combo multiplier increases by one (max ×10).  Each kill scores `10 × current combo`.  Delaying too long resets the combo to ×1.
* **Difficulty:** Enemies spawn faster and move more quickly over time.  Stay on the move to dodge and reposition.
* **Game Over:** Colliding with an enemy ends the run.  Your final score is submitted automatically to the leaderboard.  Press **Enter** to start a new assault.

## Scoring & Strategy

* **Chain Your Kills:** Keep the pressure on enemies to build high multipliers.  A ×5 combo turns a 10‑point kill into 50 points.
* **Keep Moving:** Standing still makes you easy prey.  Strafe around enemies and lead your shots.
* **Manage Spawns:** Enemies appear from all four edges.  Glance at the borders to anticipate new threats.
* **Risk vs Reward:** Going for a high combo is dangerous; one misstep ends the game.  Decide when to play it safe and when to chase big points.

## Implementation Notes

* The player, bullets and enemies are represented as simple objects with positions, velocities and radii.  Collision detection uses distance checks.
* Enemies home towards the player each frame, with their base speed increasing slowly as the spawn interval decreases.
* Each arrow direction has its own firing cooldown to prevent spamming; diagonal shots are achieved by holding two arrow keys simultaneously.
* Particles add a satisfying explosion effect on enemy destruction.  All visual effects are drawn with Canvas gradients and glow colours.
* The game calls `PixelNet.submitScore('neon-arena-assault', score)` once on game over and fetches leaderboard data in the wrapper.

Good luck surviving the onslaught and climbing the leaderboard!