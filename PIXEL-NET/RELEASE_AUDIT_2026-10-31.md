# PIXEL-NET — Full release investigation, remediation and decision register

**Audit date:** 2026-10-31  
**Repository:** https://github.com/28twagg-ops/28twagg-ops.github.io  
**Draft PR:** https://github.com/28twagg-ops/28twagg-ops.github.io/pull/1  
**Candidate branch:** work/container-fixes-2026-10-27  
**Public branch:** main, still unchanged at f74b2ff86b1024f240623cae47f12782a8c9d05e  
**Original backup:** backup/original-pixelnet-2026-10-27, unchanged  
**Decision:** **NO-GO for full production leaderboard launch** pending an authorized real Firebase write test. Code/UX release candidate is feature complete and automated tests are passing. This report lists observable risks, not literally every conceivable software fault.

## Executive result

- **19 playable catalog games**; Retro Kombat now has an original working fighting game, and five prior emulator launchers now use native score-emitting games.
- **38/38 browser game-start cases** (19 games × desktop/mobile) passed after fixing Creek Crosser touch obstruction and the Casino terminal-only test path.
- **22/22 score-contract browser cases** passed: game-over event → wrapper → authenticated mock PUT → independent-browser leaderboard readback. **The database in this test is mocked; these results do not establish production uploads.**
- **9/9 expanded release hardening checks** passed, including access, game catalog, mode exhaustion, 500-record queue limit, disabled browser storage, and old URL redirects.
- **22/22 Firebase Realtime Database emulator security checks** passed on the tightened rules, including required Casino modes, rejected non-Casino modes, indexed queries, authorized score creates, and denial of overwrite/delete/unauthorized submissions.
- **97% preview size reduction** verified: 49,145,755 bytes → 1,488,498 bytes across 19 WebP thumbnails. This reduces actual catalog transfer size, but original larger assets remain in git for rollback.
- Live Firebase **public GET** works; **production authenticated PUT has NOT been enabled**. The public key is still blank and production rules are read-only.
- **70 targeted findings** in the prioritized register below. Status counts at report generation: BLOCKED 6; OPEN 25; TESTED — NOT LIVE 4; FIXED — DEV 35.

## What 100% means here

100% of a bounded automated test suite means every case we actually ran passed. It does **not** mean no bugs, full human playthrough certification, genuine score authenticity, accessibility certification, or public release readiness. Our release gate is binary: **production real-score write + second-client readback + permission-denial check + clean CI + rollback readiness**. R01–R06 are blockers even if all other items pass.

## Prioritized issue and remediation register

Statuses: FIXED — DEV = change applied to development branch, not public; TESTED — NOT LIVE = security policy is emulated but unshipped; BLOCKED = needs production authorization/real-data verification; OPEN = engineering, legal, or operational follow-up.

| ID | Priority | Status | Finding / risk | Implemented repair or exact next action |
|---|---|---|---|---|
| R01 | P0 | BLOCKED | Public GitHub Pages still serves original main commit | Keep draft PR #1; only publish after genuine production write and rollback rehearsal |
| R02 | P0 | BLOCKED | Firebase Web API key is blank in development shell | Authorized owner supplies the public web config via supported deployment mechanism; never add service-account credentials |
| R03 | P0 | BLOCKED | Live Firebase Realtime Database permits reads but rejects score writes | Publish emulator-tested authenticated create-only rules using authorized Firebase project access |
| R04 | P0 | BLOCKED | Real player game-over → Firebase write → second-device readback unverified | Perform one labeled real-score QA run after R02/R03; verify exact database ID and no duplicate; remove QA entry administratively |
| R05 | P0 | BLOCKED | Firebase administrative account is not connected to these tools | Owner connects an authorized integration; cannot publish rules or enable real writes via GitHub alone |
| R06 | P0 | BLOCKED | Public rollout and final production browser QA not executed | Approve clean draft PR only after R02-R04; then audit public paths, PWA update and real devices |
| R07 | P1 | OPEN | Anyone controlling game JavaScript can fabricate client scores | Use trusted server-side scoring authority / signed gameplay events, plausibility checks and independent game verification |
| R08 | P1 | OPEN | Anonymous authentication does not prevent many fake accounts or request floods | App Check, endpoint-level throttling, quotas, abuse alerts, optional Cloud Functions/Cloud Run verification |
| R09 | P1 | TESTED — NOT LIVE | No overwrite/delete by ordinary clients | Candidate RTDB rules enforce auth and create-only; 22 emulator security checks passed |
| R10 | P1 | TESTED — NOT LIVE | Invalid initials, fractional/oversized scores, timestamps and extra fields | Candidate RTDB .validate rules and negative tests; publish only after authorized production integration |
| R11 | P1 | TESTED — NOT LIVE | Unknown game IDs or malformed record keys could corrupt board | Allowlisted 20 score paths including two Casino boards; record-ID grammar checks in candidate rules |
| R12 | P1 | TESTED — NOT LIVE | Casino requires mode but other games should reject mode | New rule validation requires mode for Blackjack/Hold'em, forbids elsewhere; test added |
| R13 | P1 | OPEN | Casino still downloads entire historical board for each mode | Migrate to separate indexed /lb-v2/{game}/{mode}/{record} partitions; migrate old scores and query per-mode limits |
| R14 | P1 | FIXED — DEV | Ordinary leaderboard fetches scaled with full score-history size | Indexed score query and limitToLast(50) in game wrapper, limitToLast(25) in home; Firebase index in candidate rules |
| R15 | P1 | FIXED — DEV | 40-record cutoff could hide valid Casino Analysis rankings | Normalize each mode independently and fetch Casino terminal-lobby modes before truncation |
| R16 | P1 | FIXED — DEV | Unsent local scores were displayed as confirmed worldwide records | Global boards use only server-confirmed results; pending records stay local and are reported distinctly |
| R17 | P1 | FIXED — DEV | Interrupted uploads could create duplicate global entries | Stable per-run pn-record ID and idempotent PUT; mocked retry and duplicate tests pass |
| R18 | P1 | FIXED — DEV | Pending score queue silently discarded records beyond 100 | Preserve all pending submissions up to 500; expose storage-full error without deleting existing scores |
| R19 | P1 | FIXED — DEV | Browsers can reject local storage and crash games | Guard storage in shared wrapper, homepage, Cats, Astrotype and Casino; restricted-storage browser test |
| R20 | P1 | FIXED — DEV | One Firebase anonymous signup per game navigation wastes identities/quota | Reuse temporary anonymous session token until expiry; discard and reauthenticate after expiry |
| R21 | P1 | OPEN | Offline browser tab close / site-data clearing may erase pending scores | Expose pending-count and explicit warning; for stronger guarantees use IndexedDB with export and reconciliation |
| R22 | P1 | OPEN | No historical score moderation or individual score-removal workflow | Owner-admin review/delete, report-abuse channel, documented retention and appeal process |
| R23 | P1 | OPEN | Long-lived scores / quota / billing monitoring not configured | Usage dashboards, read/write budget alerts, retention/archival rules, paginated top-score retrieval |
| R24 | P1 | OPEN | Existing manually inserted TST / 123 test record can contaminate rankings | Mark QA entries separately or delete by project admin after production verification |
| R25 | P1 | FIXED — DEV | Some game-over paths previously duplicated score submission | One entry per game over; 22 mode-specific game-to-database browser integration tests |
| R26 | P1 | FIXED — DEV | Casino old unused unauthenticated fbPost offered misleading legacy write path | Removed unused direct score writer; all score events go through common authenticated wrapper |
| R27 | P1 | FIXED — DEV | Casino leaderboard HTML inserted historical initials unsafely | Use DOM nodes and textContent; sanitize alphanumeric initials and numeric scores |
| R28 | P1 | FIXED — DEV | Home Top Pixels inserted Firebase names and game names into HTML | Escape dynamic leaderboard and takeover strings before rendering |
| R29 | P2 | FIXED — DEV | Retro Kombat placeholder was not a playable game | Original Neon Circuit fighting game with AI enemies, touch/keyboard, scoring, 2-device gameplay smoke |
| R30 | P2 | FIXED — DEV | Five ROM games required manually typed self-reported scores | Changed to native playable game.html with automatic earned score events |
| R31 | P2 | FIXED — DEV | Archived emulator URLs would otherwise break existing bookmarks | Six emu.html routes now redirect to corresponding native games |
| R32 | P2 | FIXED — DEV | Unused legacy ROM binaries shipped in release tree | Removed six ROM binaries; original public main and backup unchanged |
| R33 | P2 | FIXED — DEV | Old Retro Kombat embed and coming-soon routes showed obsolete placeholder | Redirect both legacy URLs to playable game.html |
| R34 | P2 | FIXED — DEV | Catalog still called Retro Kombat coming soon | Updated catalog copy/tags for finished game; corrected Casino terminal-only wording |
| R35 | P2 | FIXED — DEV | 19 catalog thumbnails consumed roughly 49.1 MB | Generated 640px optimized WebP previews at 1.49 MB combined (97% smaller), validated via Actions |
| R36 | P2 | FIXED — DEV | Catalog thumbnails were eager CSS backgrounds | Native img elements with lazy loading, async decoding and object-fit |
| R37 | P2 | OPEN | Large original thumbnails remain in repo and Git history | Optionally remove unused originals after image-review approval; avoid history rewrite that damages backup |
| R38 | P2 | FIXED — DEV | Game cards were mouse-only clickable div elements | Accessible anchor links, visible focus and standard navigation / open-in-new-tab behavior |
| R39 | P2 | FIXED — DEV | Initials controls lacked correct keyboard/dialog semantics | Actual buttons, accessible dialog labels, sanitized input, Escape, focus trap and focus restoration |
| R40 | P2 | FIXED — DEV | Search empty results had no guidance | Explicit no-match message; searchable game metadata |
| R41 | P2 | FIXED — DEV | Animation ignored system reduced-motion preferences | CSS reduced-motion overrides on arcade hub and shared cabinet |
| R42 | P2 | FIXED — DEV | Game wrapper controls lacked clear focus indicator | Visible focus outlines for player, exit, tabs, modal and install controls |
| R43 | P2 | FIXED — DEV | Creek Crosser mobile D-pad covered Start Run | Hide floating controls before start; labeled button controls; re-tested mobile start |
| R44 | P2 | FIXED — DEV | Casino terminal-only interface was misdiagnosed as broken | Game start smoke tests use real terminal 1+Enter start path, not hidden graphical buttons |
| R45 | P2 | FIXED — DEV | Track Field Blitz canvas stretched on small phones | Scale both internal canvas axes uniformly; responsive UI regression |
| R46 | P2 | FIXED — DEV | PWA uncached-game offline navigation returned misleading home page | Show explicit offline game notice and return-to-arcade link; service worker cache version bumped |
| R47 | P2 | OPEN | Offline install does not precache all 19 games | PARTIAL DEV improvement: visited game HTML/JS/CSS and shared shell now cache for offline replay; full opt-in offline pack, external assets and real-device quota checks remain outstanding |
| R48 | P2 | OPEN | PWA icon maskable crop and iOS installed app not human tested | Validate icon safe zones and on-device home-screen flow on current iPhone/Android |
| R49 | P2 | OPEN | Game loses active state when crossing responsive breakpoint | Retain iframe across resizes where possible, or warn player before restart; needs architecture design |
| R50 | P2 | OPEN | Real-device multitouch, audio gesture unlock and focus are incompletely tested | Human Safari iOS / Chrome Android / low-end phone sessions and keyboard/gamepad checks |
| R51 | P2 | OPEN | Full-hour game progression, balance and collision edge cases not fully proven | Deterministic simulation + manual multi-round playtest per game with crash/performance thresholds |
| R52 | P2 | OPEN | Large Casino terminal board can become slow as DB grows | Implement mode-specific pagination, read limits and rate controls; no unbounded historical GET |
| R53 | P2 | FIXED — DEV | Homepage treated Firebase timeout as an empty leaderboard | Show distinct outage message rather than suggesting no high scores exist |
| R54 | P2 | FIXED — DEV | Takeover banner asserted unsupported historical events | Now describes current leads, not imagined record takeover history |
| R55 | P2 | FIXED — DEV | Share previews and site description were missing | Added description, OpenGraph title/description/type |
| R56 | P2 | FIXED — DEV | No public explanation of initials and shared score storage | Added privacy.html, scores/retention disclosure and footer link |
| R57 | P2 | OPEN | Formal privacy/legal review not done | Review provider policies, local retention, underage audience, data-removal process and jurisdiction rules |
| R58 | P2 | OPEN | Old game/ROM names and artwork may carry trademark or copyright concerns | Review each game/asset source, license and naming; replace with original art where rights uncertain |
| R59 | P2 | OPEN | Score and mode normalization rely on client-side historical data quality | Backend migration/report for malformed, duplicated and legacy records with immutable backup |
| R60 | P2 | OPEN | Automated UI tests cannot prove all WCAG behavior | Screen-reader VoiceOver/NVDA checks, focus order, contrast and touch target measurements |
| R61 | P3 | FIXED — DEV | No continuous post-deploy alerts for all 19 game routes | Public GET-only audit now fails if 19 published game routes, thumbnails, core pages or selected leaderboard reads fail; daily cron staged but only runs when workflow reaches default branch. Browser JS-error and staging game-end monitoring remain future scope |
| R62 | P3 | OPEN | No feature flags for per-game disabling when runtime regressions occur | Add central availability flags and release fallback per game; preserve historic scores |
| R63 | P3 | OPEN | No explicit release rollback playbook tested against public Pages | RELEASE_ROLLBACK_PLAYBOOK.md created with safe frontend and rules rollback steps; operator rehearsal and authorized Firebase backup remain outstanding |
| R64 | P3 | FIXED — DEV | Public and development catalog were confused during live URL checks | Live auditor now fetches public games.json separately to avoid false 404s for unpublished files |
| R65 | P3 | FIXED — DEV | Version tag did not identify unfinished public release | Development version 0.1.0-rc.1; main remains unchanged |
| R66 | P3 | OPEN | No independent Lighthouse/Core Web Vitals baseline | Run lab and field measurements after real deployment, track LCP/INP/CLS on mobile |
| R67 | P3 | OPEN | Local queue cross-tab editing and anonymous identity changes may race | Design IndexedDB transactional outbox and origin-stable identity; test multi-tab conflicts |
| R68 | P3 | OPEN | No authenticated production write telemetry or success ratio | Monitor Firebase sign-up, PUT failures, queued score counts, denied rules and end-to-end QA |
| R69 | P3 | OPEN | Catalog legacy standalone games aren't all in the 19-game release | Keep clearly marked as archive; evaluate separately before claiming coverage beyond catalog |
| R70 | P3 | FIXED — DEV | No permanent investigative handoff / coverage register | This audit and existing release blocker docs, draft PR and CI evidence preserve decisions |

## Detailed architecture and security notes

### Data flow and durability

Each game must send exactly one trusted-origin game-over message to the active wrapper; the wrapper creates an immutable local run record, adds an idempotent `pn-` database ID to its retry queue, gets an anonymous Firebase identity token, and issues authenticated `PUT /lb/{slug}/{id}.json?auth=...`. Successful server writes trigger global readback. Failed writes remain local and visibly pending, with no claim that the score is global. Browser clearing or storage restrictions can still lose an unsent score; a 500-record full queue now warns instead of silently truncating old records. A future IndexedDB transactional outbox is appropriate if higher durability is required.

For Casino, `spyder-blackjack` and `spyder-holdem` each have independent Standard and Analysis modes. Mixed-mode board reads are split before top-N selection to avoid losing Analysis scores when Standards dominate. Eventually migrate to mode-scoped database partitions for bounded reads. The homepage reads ordinary game scores with indexed limited queries; Casino still reads the full two boards and is a scalability gap.

### Permission model

The candidate Realtime Database rules are under `PIXEL-NET/firebase/leaderboard-rules-candidate.json` and are **not production rules**. They allow public scoreboard reads only, authenticated new record creation for allowlisted slugs, validate record schema, and reject updates/deletes. There are no private Firebase credentials in the source. Firebase anonymous user tokens can still be minted by attackers, and browser gameplay/score values are inherently forgeable. A trusted server verifier and abuse throttling are required for high-integrity competitive rankings. Do not temporarily enable unrestricted `.write:true` to rush release.

### Copyright, maintainability and catalog scope

This branch removes six bundled ROM binaries and redirects their legacy emulator pages; original binaries still exist in the untouched `main` / backup and git history. This is a source/package cleanup, **not a determination that every image, trademark, game mechanic or archived asset is properly licensed**. Other archived HTML games remain outside the audited 19-game catalog. Do not say every repository game was end-to-end certified.

## Final release gates — exact order

1. **Keep main / backup unchanged:** verify original commit SHA and draft PR status before any release action. Maintain branch-based rollback.
2. **Owner-authorized Firebase access:** establish a legitimate Firebase admin integration or have the owner deploy the reviewed authenticated create-only rules. Verify Anonymous Authentication already enabled; do not ask for service-account secrets in chat or embed private credentials.
3. **Configure public Firebase Web API key:** populate public Web app config in the development client through an authorized mechanism; never expose user ID tokens or server credentials. This is not yet completed.
4. **Run a real test score:** play an actual game from an isolated preview, score once, verify an authenticated PUT succeeds and exact record exists, read back from a second clean browser and validate overwrite/unauthenticated writes are denied. Remove the QA score administratively afterward.
5. **Complete latest CI:** all tests must pass at the exact SHA proposed for release: 38 starts, 22 score contracts, 9 hardening, Firebase emulator validation, responsive UI, PWA, live GET-only audit.
6. **Human QA:** run short games in desktop Chrome/Firefox and actual iOS Safari/Android touch, test audio, restarts, responsive breakpoint, no-network, score feedback, install/update, and CPU/battery behavior.
7. **Publish:** mark PR ready only after gates 2–6; merge to `main` and inspect GitHub Pages publication, PWA update, 19 routes, public assets, score uploads and user-visible ranking correctness.
8. **Monitor and rollback:** set usage/denied-write alerts; preserve a rollback path to prior `main` and earlier rules. Record release commit, timestamps, post-launch QA and any known limitations.

## Test evidence / useful links

- [Draft release PR #1](https://github.com/28twagg-ops/28twagg-ops.github.io/pull/1)
- [Comprehensive CI workflow](https://github.com/28twagg-ops/28twagg-ops.github.io/blob/work/container-fixes-2026-10-27/.github/workflows/pixelnet-final-audit.yml)
- [All-game score contract CI](https://github.com/28twagg-ops/28twagg-ops.github.io/blob/work/container-fixes-2026-10-27/.github/workflows/pixelnet-leaderboard-fast.yml)
- [Real Firebase database emulator CI](https://github.com/28twagg-ops/28twagg-ops.github.io/blob/work/container-fixes-2026-10-27/.github/workflows/pixelnet-firebase-rules.yml)
- [Verified thumbnail optimizer run](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41225599543)
- [Verified 38/38 starts, 9 hardening, 22 mock uploads run](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41226733364)
- [Latest Firebase emulator: 22/22 security checks](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41227002442)
- [Firebase setup/deployment requirements](https://github.com/28twagg-ops/28twagg-ops.github.io/blob/work/container-fixes-2026-10-27/PIXEL-NET/wrapper/FIREBASE_SETUP.md)

## Coverage gaps and confidence

- **Verified by instrumented Chromium:** rendered wrappers and score event chains, real start controls, mocked network and readback; not deep multi-hour play.
- **Verified by isolated Firebase emulator:** candidate validation/read/write denial semantics, not production server permission state.
- **Verified by GitHub Actions production read-only:** current publicly accessible Pages routes and historical scoreboard reads; no score modification.
- **Not verified:** anonymous account creation against actual Firebase, real authenticated score PUT, performance on actual low-power phones, browser storage loss during device restart, adversarial cheating, copyright/license clearance and all user journeys.
- **Explicit decision:** do not call the public site finished, do not claim perfect 100% quality, and do not silently merge.

This document is intended as a durable handoff so the user need not repeat audit history. Every future fix should cite its issue ID, exact commit, test run, and updated release gate.

## October 31 follow-up implementation addendum (this session)
This addendum supersedes the initial 70-item snapshot **only where noted**, and does not claim a completed production release.

- **R47 partial development:** PIXEL-NET/sw.js now network-first caches previously visited game HTML/JS/CSS and shared wrapper resources, allowing core files to replay offline after a successful online visit. The full all-game install pack, external resources, browser quota, and actual iPhone Safari behavior remain OPEN. A dedicated service-worker regression case was added to tests/pwa-install.test.cjs.
- **R61 fixed in development, not scheduled on main yet:** tests/live-site-audit.cjs now sets nonzero exit status for failing core HTTP routes, published game routes and thumbnail paths, missing catalog, or unreachable leaderboard reads. The read-only workflow has a daily schedule, which GitHub executes only on the default branch after merge. No fake public scores are written.
- **R63 partially documented:** see RELEASE_ROLLBACK_PLAYBOOK.md. Real rollback rehearsal and Firebase owner backup remain OPEN.
- **Additional fix (new R71, outside original 70):** Casino local score history now retains up to 30 entries per Standard and Analysis mode instead of allowing high Standard scores to evict Analysis results. See wrapper/shell.js and tests/release-hardening.cjs.
- **Additional fix (R72, outside original 70):** corrected an incorrectly escaped Firebase mock URL regular expression in the restricted-storage test. This makes the intended backend interception meaningful.
- **Research deliverables:** AI_GAME_CREATION_RESEARCH_2026-10-31.md and AI_GAME_CREATION_MASTER_PROMPT.md standardize evidence-grounded original arcade game creation and actual browser playtesting.
- **Separate historical backend warning:** 28twagg-ops/spyder-leaderboard (not called by the current Casino game) contains a public fallback signature secret, SPYDER2026, in server.py. If deployed, that historical service cannot treat such a signature as secure player proof. Needs owner-confirmed service inventory and credential rotation/hardening. No unverified alteration to that unrelated live deployment was made.

**Current classification for the original R01–R70 entries after R61 change:** 36 FIXED—DEV, 4 TESTED—NOT LIVE, 6 BLOCKED, 24 OPEN = 70. R47 and R63 are still OPEN despite partial improvements. R71 and R72 are additional fixes, not secretly counted within the original seventy.

**Release decision remains NO-GO:** real Firebase authenticated score submission/independent production readback, authorized rules deployment, real-device QA, and rollback rehearsal remain unproven. Developer CI confirms only precisely tested behaviors. Preserve main and the original backup.
