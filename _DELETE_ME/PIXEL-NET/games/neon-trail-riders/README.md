# Neon Trail Riders

Neon Trail Riders is an original light‑cycle survival game built for the PIXEL‑NET arcade.  It takes inspiration from classic grid‑based “light bike” games but adds its own twist with pulsing orbs that clear your trail and ramping speed to keep the pressure high.  Everything — the code, artwork and effects — was crafted specifically for this project and does not reuse any third‑party assets.

## How to Play

* **Movement:** Use the arrow keys or **WASD** to change your bike’s direction.  The bike moves one grid cell at a time and leaves a glowing trail behind it.  You cannot reverse direction instantly — plan your turns ahead of time.
* **Objective:** Survive as long as possible without colliding with the arena walls or your own persistent trail.  Each step you take awards one point.
* **Orbs:** Pink pulsing orbs spawn randomly on free grid cells.  Driving over an orb gives you a **50‑point** bonus **and removes part of your oldest trail**, creating space to maneuver.  Collecting orbs also triggers a burst of particles and a brief screen shake for satisfying feedback.
* **Difficulty:** The pace gradually accelerates as you move.  The longer you survive, the faster you’ll need to think.
* **Game Over:** Crashing into the border or your trail ends the run.  Press **Enter** to start a new ride.  Your score is automatically submitted to the PIXEL‑NET leaderboard when the game ends.

## Scoring & Strategy

* **Basic Points:** Every cell traversed awards one point.  Staying alive is the key to building a high score.
* **Orb Bonus:** Each orb nets an extra 50 points and clears up to 25 of your oldest trail segments.  Going out of your way for an orb can free up much‑needed space but may force you into riskier lines.  Weigh the danger of reaching the orb against the payoff.
* **Speed Ramp:** The step interval decreases slowly over time, forcing quicker decisions and tighter maneuvers.  Learning to control the bike at high speeds is crucial for top scores.

## Implementation Notes

* The game uses a fixed grid (12 px cells) and a custom collision system to detect trail and wall impacts efficiently.  A `Set` of linearised cell indices tracks all occupied positions.
* Particles on orb collection are simple objects with position, velocity and decay; they fade over time to give a little extra polish.
* Score submission uses `PixelNet.submitScore('neon-trail-riders', score)` once at game over.  The leaderboard panel pulls the top scores using `PixelNet.getLeaderboard()`.

Enjoy carving neon trails and outmanoeuvring your own past!  Let us know if you discover creative strategies or reach impressive scores.