# PIXEL-NET Firebase global leaderboard (secure deployment)

This project already has the Realtime Database at
`https://pixel-net-arcade-default-rtdb.firebaseio.com`. Existing global
scores can be read publicly. **Live score writes remain disabled until
authenticated rules are explicitly deployed and tested.**

## Score flow

1. A playable game reaches its genuine game-over sequence and sends a
   `GAME_OVER_SCORE` message to its same-origin wrapper.
2. The wrapper records the run locally, and queues an upload under an
   idempotent client-generated record ID.
3. Firebase Anonymous Authentication obtains an ID token without a login screen.
4. The wrapper performs an authenticated `PUT` to
   `/lb/{game-slug}/{record-id}.json`.
5. On success, global boards refresh. On failure, the run is marked **LOCAL**
   and stays queued for future retries. Queued submissions use the current
   server-window timestamp on retry.

The public Firebase Web API key (not a private service account key) must
be configured as `FIREBASE_WEB_API_KEY` in `PIXEL-NET/wrapper/shell.js`.
The key was intentionally left unconfigured on the development branch
until an authorized configuration update can be completed.

## Firebase console requirements

- Enable Firebase **Authentication → Sign-in method → Anonymous**.
- Under Realtime Database **Rules**, deploy a verified least-privilege policy
  based on `PIXEL-NET/firebase/leaderboard-rules-candidate.json` after testing
  against a separate QA path/project.
- The proposed policy allows public reads of `/lb/{game}` and authenticated,
  **create-only** score records on the explicit playable-game allowlist. It
  validates initials, integer score, timestamp, game ID, and Casino mode.
- Never publish blanket `.write: true` or temporary expired TEST-mode rules.
- Do not place Firebase service-account JSON or privileged credentials in
  GitHub Pages, HTML, JavaScript, or repository commits.

Firebase Anonymous Authentication and validation rules do **not** prove a
score was earned legitimately. Strong anti-cheat requires a trusted server
verifier and abuse controls. Additional Firebase billing or quota conditions
may apply; never assume permanently unlimited free usage.

## Scope

The arcade includes 18 playable game wrappers. The Casino has distinct
Blackjack/Hold'em Standard/Analysis rankings, yielding 21 automatic scoring
integration cases. Five games that previously used manually scored ROM
emulators now use their native, auto-scoring `game.html` implementations.
Retro Kombat is a non-playable placeholder and has no earned-score contract.

## Verification

- `node PIXEL-NET/tests/leaderboard-all-games.cjs` runs 21 browser-level
  game-over / authenticated-write / cross-browser ranking tests using a
  **mock backend**; no synthetic production scores are inserted.
- `node PIXEL-NET/tests/live-site-audit.cjs` verifies the published site and
  **read-only** Firebase records.
- `node PIXEL-NET/tests/leaderboard-regression.cjs` checks Firebase denied and
  healthy mock states.
- Real production write verification must be performed separately using a
  temporary QA record **after** authentication, client configuration, and
  appropriate server-side rules are deployed.

## Deployment

All code changes are on the separate development branch
`work/container-fixes-2026-10-27`. The original `main` branch and
`backup/original-pixelnet-2026-10-27` remain untouched. Only merge/publish
after a real authenticated QA score reaches Firebase and is displayed on a
second device.
