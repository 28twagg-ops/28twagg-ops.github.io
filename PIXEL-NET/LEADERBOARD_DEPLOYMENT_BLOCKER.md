# PIXEL-NET — Release status and remaining live Firebase gate

Updated: 2026-10-28

## Confirmed working on the isolated development branch

- 19 playable arcade games (including original Retro Kombat) now have
  game-over score events. Five ROM-emulator launchers switched to native games
  that report earned scores rather than asking players to type them.
- Blackjack and Hold'em retain separate Standard and Analysis rankings.
- Score submissions are local-first, queued when uploads fail, and retried
  under a stable database record ID to avoid duplicate entries.
- Every playable game and Casino mode passes the **22/22 browser score tests**.
  A fresh second browser retrieves the test score from the simulated database.
- The **real Firebase Realtime Database emulator** accepts the candidate rules
  and passes 18 positive/negative security checks.
- Responsive layouts, wrapper, PWA install and live read-only production
  checks pass on the development branch.
- Production Realtime Database GET requests are **HTTP 200** and return stored
  historical scores (the earlier expired-TEST-mode HTTP 401 was resolved).

## Still NOT a production-ready release

- `FIREBASE_WEB_API_KEY` is blank in `PIXEL-NET/wrapper/shell.js`. The
  project owner registered a Firebase web app, but its public client key
  has not been applied to the repository.
- The **live Firebase database rules** still allow leaderboard reads but
  block write requests. The candidate authenticated create-only policy in
  `firebase/leaderboard-rules-candidate.json` is tested but NOT published.
- No **real authenticated score upload** has been verified in production.
  Unit/browser tests use test backends or the isolated Firebase emulator.
- Full human device/gameplay QA and abuse monitoring remain recommended.
  Anonymous sign-in and validation do NOT prevent deliberate score forgery.

## Deployment order / safety

1. With authorized Firebase admin access, verify Anonymous Authentication is
   enabled and publish the reviewed create-only Realtime Database rules.
2. Configure the project's PUBLIC web API key in the development wrapper.
   Never publish Firebase service-account JSON or any private credentials.
3. Run one labeled, removable real QA score submission through gameplay and
   verify it appears in a separate browser. Confirm denied unauthenticated
   writes and absence of duplicates.
4. Approve the release PR, publish the development branch, and rerun live
   browsing/device checks.
5. Preserve the original branch backup for a tested rollback option.

**Do not merge/release before steps 1-3 succeed.**

`main` and `backup/original-pixelnet-2026-10-27` are intentionally unchanged.
Development branch: `work/container-fixes-2026-10-27`.
Draft release pull request: https://github.com/28twagg-ops/28twagg-ops.github.io/pull/1

GitHub Actions test workflows:
- `.github/workflows/pixelnet-final-audit.yml`
- `.github/workflows/pixelnet-leaderboard-fast.yml`
- `.github/workflows/pixelnet-firebase-rules.yml`
- `.github/workflows/pixelnet-live-readonly.yml`
