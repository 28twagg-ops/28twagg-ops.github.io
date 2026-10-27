# PIXEL-NET global leaderboard — verified production blocker

Audit date: 2026-10-27

## Verified facts
- The published arcade, game catalog, wrapper script, and sampled game URLs respond HTTP 200.
- Public REST reads for `/lb/neon-chase`, `/lb/millipede-chaos`,
  `/lb/spyder-blackjack`, and `/lb/spyder-holdem` all respond
  `HTTP 401 {"error":"Permission denied"}`.
- This means the current database rules reject the anonymous public client;
  the website cannot honestly show global scores, and browser-only code cannot
  change Firebase's server-side access rules.
- The updated development wrapper now marks the board **LOCAL ONLY** if
  Firebase refuses access. Client-side scores remain on the user's device.
- The Spyder Casino game and wrapper previously posted identical scores. The
  development patch routes a single mode-aware score event through the wrapper.

## Required authorized backend repair
1. Sign into the correct Firebase project as its authorized owner/admin.
2. Check Realtime Database URL, project status, billing/quota,
   and whether the database is configured for public intended reads.
3. Set **least-privilege read policies** on public leaderboard paths, not the
   entire database. Do not expose private user/profile data.
4. Do not turn on unrestricted anonymous writes. Instead provision a
   verified score-submission backend (e.g. Cloud Functions or another
   rate-limited server endpoint) or appropriate Firebase Authentication and
   security rules validating score range, shape, timestamp, and allowed paths.
   Client-side checks alone cannot stop fake leaderboard submissions.
5. Provide the arcade a supported authenticated write route; do not store
   privileged Firebase service-account keys in HTML/JavaScript/GitHub Pages.
6. Verify GET and authorized score POST using a **separate test leaderboard**.
   Never submit synthetic scores to production to test the UI.
7. Validate score ranking across two devices, including Standard/Analysis
   categories for each of Blackjack and Hold'em.
8. Only mark **GLOBAL LIVE** once a real backend read succeeds.

## QA already in the repository
- `PIXEL-NET/tests/live-site-audit.cjs` (production GET only)
- `PIXEL-NET/tests/wrapper-audit.cjs` (13 custom-game size tests)
- `PIXEL-NET/tests/final-interface-audit.cjs` (19 games × 3 viewports)
- `PIXEL-NET/tests/leaderboard-regression.cjs` (mock denied/read/write)
- `PIXEL-NET/tests/pwa-install.test.cjs` (installation, saved initials)

## Deploy policy
The original `main` branch and the archived original backup must remain
unchanged until development QA is approved. Browser tests use a local server
and mock score requests; the editing branch is not the public deployed site.
