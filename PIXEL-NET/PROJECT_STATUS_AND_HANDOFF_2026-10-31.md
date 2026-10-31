# PIXEL-NET — Project status, working/not-working matrix and handoff
**Snapshot:** Saturday, 2026-10-31 (America/Chicago), checked against the connected GitHub repository and available CI evidence.
**Verdict:** **DEVELOPMENT TESTS PASS / PRODUCTION AUTO-UPLOAD NOT LAUNCHED / DO NOT MERGE YET.**

> Start with this file for a quick current status. For **all 70 individual findings with severity, implemented fixes, proposed changes and acceptance criteria**, read [RELEASE_AUDIT_2026-10-31.md](RELEASE_AUDIT_2026-10-31.md). This status document supplements that register; it does not falsely declare every possible bug discovered or every live feature verified.

## Repository and release truth
| Item | Verified state |
| --- | --- |
| Repository | [28twagg-ops/28twagg-ops.github.io](https://github.com/28twagg-ops/28twagg-ops.github.io) |
| Public site branch | `main` at `f74b2ff86b1024f240623cae47f12782a8c9d05e`, original version |
| Protected original backup | `backup/original-pixelnet-2026-10-27`, same original SHA |
| Current development candidate | `work/container-fixes-2026-10-27` at `a8e20e5770bbc730148181232bc49d492e7f47d0` **before this documentation-only commit** |
| Release pull request | [PR #1](https://github.com/28twagg-ops/28twagg-ops.github.io/pull/1), **open, draft, mergeable, NOT merged** |
| Public GitHub Pages | Still uses original `main`, **not** the development improvements |
| Live historical leaderboard reads | Read-only GET tests passed; this is **not** proof that new submissions work |
| Live authenticated gameplay score uploads | **Not activated or end-to-end proven** |
| Owner/admin Firebase access | Not available through current connected tooling for this project; no production rule change performed |

**Do not confuse** (a) browser tests against a *mock* leaderboard, (b) rule tests using the **local Firebase RTDB emulator**, and (c) an actual authenticated write to the **production Firebase database**. Only (a) and (b) have passed.

## All 19 catalog games — development feature inventory
The catalog is `PIXEL-NET/games.json`. The current development tests start these 19 games in desktop and mobile Chromium and exercise their score contracts; this **does not certify full-length playthroughs, game balance, iPhone hardware or long sessions**.

| # | Catalog game | Slug | Development status / special note |
| ---: | --- | --- | --- |
| 1 | Caked Up Cats | `caked-up-cats` | Playable wrapper; auto-score contract tested |
| 2 | Creek Crosser | `creek-crosser` | Playable; mobile Start obstruction fixed |
| 3 | Astrotype | `astrotype` | Playable wrapper; guarded restricted browser storage |
| 4 | Knight Flight | `knight-flight` | Playable wrapper; score contract tested |
| 5 | Retro Kombat | `retro-kombat` | Former placeholder replaced by original fighting game; keyboard/touch gameplay smoke passed |
| 6 | Logic Bomb | `logic-bomb` | Playable wrapper; score contract tested |
| 7 | Neon Chase | `neon-chase` | Real Chromium gameplay smoke; game-over and mocked score write passed |
| 8 | Robo-Arena | `robo-arena` | Playable wrapper; score contract tested |
| 9 | Millipede Chaos | `millipede-chaos` | Playable wrapper; score contract tested |
| 10 | Spyder Casino | `spyder-casino` | Terminal UI; **four** contracts: Blackjack/Hold'em × Standard/Analysis |
| 11 | Galaxy Swarm 2084 | `galaxy-swarm-2084` | Playable wrapper; score contract tested |
| 12 | Stack Drop DX | `circuit-salvager` | Playable wrapper; score contract tested |
| 13 | Dig Dug Delve | `dig-dug-delve` | Native auto-scoring game replaced emulator/typed scores |
| 14 | Combat 77 Arena | `combat-cx2601` | Native auto-scoring game replaced emulator/typed scores |
| 15 | Atariforce Hyperlane | `atariforce-hyperlane` | Playable wrapper; score contract tested |
| 16 | Jungle Jr Rescue | `jungle-jr-rescue` | Native auto-scoring game replaced emulator/typed scores |
| 17 | Kangaroo Climb | `kangaroo-climb` | Playable wrapper; score contract tested |
| 18 | Track Field Blitz | `track-field-blitz` | Native auto-scoring game; small-phone canvas stretch fixed |
| 19 | Tower Rush | `orbit-siege` | Native auto-scoring game replaced emulator/typed scores |

**Why 22 leaderboard cases:** 18 non-Casino games + 4 distinct Casino modes = **22**.

## Confirmed implemented on DEVELOPMENT only
- **Gameplay:** 19 launchable titles; original Retro Kombat fighter; five ROM launcher replacements with earned automatic scores; game-over/restart paths; keyboard and touch behavior checked where tests exist.
- **Score pipeline:** event handoff from game to wrapper; anonymous-auth request logic in development; idempotent per-game-run record IDs; locally queued retries; no false claim that local pending scores are global. Handles offline or failed writes; queue capacity and storage failure warning improved.
- **Leaderboard correctness:** mode separation for Casino, safe text rendering, visible error state for failed reads, limits/index-aware ordinary-game reads; historic/malformed-record safety improved.
- **Security staging:** strict candidate RTDB validation (authenticated create-only, valid names, integer score, allowlisted game, valid timestamps/modes, reject overwrites/deletes), tested against RTDB emulator **but not deployed**.
- **Product and UX:** keyboard-accessible game cards; focus and initials dialog improvements; reduced motion; offline game unavailable message; responsive/mobile controls; PWA install flow tests.
- **Performance and cleanup:** 19 optimized WebP thumbnails reduced combined size from ~49.1 MB to ~1.49 MB (~97%); native image lazy loading; six unused ROM binaries removed from development branch, old emulator URLs redirected; original backup preserved.
- **Documentation:** privacy page, Firebase rollout, 70-issue full audit, and automated verification workflows.

## Test evidence (latest checks inspected, October 31, 2026)
| Check | Evidence | Interpretation |
| --- | --- | --- |
| 19 × desktop/mobile start scenarios | **38/38 passed**, [all-games CI](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41227456650) | Can actually launch each game in Chromium; not long-session certification |
| Per-game gameplay-to-leaderboard mock | **22/22 passed**, same [all-games CI](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41227456650) | Each game/mode generates expected mock authenticated write; second-browser simulated readback |
| Release hardening | **9/9 passed**, same CI | Scenarios around accessibility, redirects, unavailable storage, queue and catalog |
| Responsive all-game interface | **57/57 passed**, same CI | 19 games × 3 configured viewports |
| Neon Chase actual movement/points/game over | [all-games CI](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41227456650) step passed | Browser gameplay and simulated score pipeline |
| Retro Kombat keyboard/touch | [all-games CI](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41227456650) step passed | Game starts and responds to input |
| Firebase candidate rules | **22/22 prior emulator checks**, [Firebase rules CI](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41227002442) | Isolated policy simulation; **not production authentication/write success** |
| PWA/initials | [PWA CI success](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41227456640) | Automated Chromium installation and storage behavior only |
| Custom wrappers | [Wrapper CI success](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41227456665) | Automated wrapper audit |
| Existing live site GET only | [Read-only CI success](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41227456688) | Existing site/leaderboard reachable; never posts a fake public score |
| Catalog thumbnails | [Optimization CI](https://github.com/28twagg-ops/28twagg-ops.github.io/actions/runs/41225599543) | Optimized asset size verified |

**CI freshness caveat:** Comprehensive UI/PWA/wrapper/read-only runs above were verified on development SHA `a8e20e5`. Firebase security's last cited passing run was on an earlier candidate revision; it must run again at the **final release SHA**, preferably via manual dispatch, before merging. This documentation-only commit will trigger only workflows whose paths/conditions match.

## Not working live / P0 release blockers
These are tracked individually as **R01–R06** in the full audit:
1. **Release not public:** improvements remain in draft PR; do not merge before Firebase gate and short live-device checks.
2. **Web API config absent:** Firebase **public** Web API key is blank in `PIXEL-NET/wrapper/shell.js`. Owner must use authorized project configuration. **Never commit service-account secrets or identity tokens.**
3. **Production RTDB rules not published:** production permits historical reads but denies writes; tested replacement is only `PIXEL-NET/firebase/leaderboard-rules-candidate.json`.
4. **End-to-end live gameplay upload unproven:** no verified real authenticated game-over PUT plus independent second-client database readback and duplicate/deny checks.
5. **Authorized Firebase project control unavailable:** GitHub access does not confer Firebase administrative permissions. Connection or owner-authorized rules deployment is necessary.
6. **Release/rollout QA incomplete:** final production device verification, rollback rehearsal and postdeploy verification must happen after backend activation.

**Acceptance condition before public launch:** a genuinely played score reaches production RTDB exactly once with authenticated create-only permission; an independent clean device sees the correct rank; unauthorized/overwrite writes fail; final-SHA CI is green; the old site is recoverable.

## Remaining OPEN items — recommended repair plans (not falsely marked completed)
For the **specific rationale, evidence, severity and test plan for every ID** see [the complete 70-item register](RELEASE_AUDIT_2026-10-31.md).

| Priority | IDs | Remaining engineering / validation and intended repair |
| --- | --- | --- |
| P1 | R07–R08 | Client-side score fabrication and mass account abuse: trusted verification backend, plausibility checks, App Check, quotas/throttling, alerting; Firebase anonymous auth alone cannot solve cheating |
| P1 | R13 | Casino full-history reads: move to mode-scoped indexed leaderboard paths, migrate safely with backups and pagination |
| P1 | R21–R24 | Pending score loss on browser clearing, moderation, usage/billing alerts, old QA entries: transactional IndexedDB outbox, admin moderation/cleanup, production usage monitoring |
| P2 | R37 | Big original images remain as repo history/assets: selectively retire unused source assets after rights/design review; never rewrite protected backup history casually |
| P2 | R47–R52 | Offline pack, real device PWA/icon tests, resize/game state preservation, multitouch/audio/gamepad, long-session gameplay, Casino scaling: targeted QA and architecture improvements |
| P2 | R57–R60 | Privacy/copyright, historical score migration and accessibility: legal/rights review, legacy-record migration, VoiceOver/NVDA + contrast audits |
| P3 | R61–R63 | Synthetic postdeploy monitoring, per-game feature flags, tested rollback playbook |
| P3 | R66–R69 | Lighthouse metrics, cross-tab queue race safety, production upload telemetry, archived games outside 19-game test catalog |

**Risk classification counts in the detailed audit at snapshot:** **35 FIXED—DEV**, **4 TESTED—NOT LIVE**, **6 BLOCKED**, **25 OPEN** = **70 tracked findings**. These are audit finding statuses, **not** a 100% readiness score.

## Candidate code / developer entrypoints
- Arcade catalog: [games.json](games.json)
- Front page: [index.html](index.html)
- Shared wrapper score+auth logic: [wrapper/shell.js](wrapper/shell.js)
- Production Firebase handoff: [wrapper/FIREBASE_SETUP.md](wrapper/FIREBASE_SETUP.md)
- Firebase candidate rules: [firebase/leaderboard-rules-candidate.json](firebase/leaderboard-rules-candidate.json)
- Authorized rules rollout details: [firebase/ROLLOUT.md](firebase/ROLLOUT.md)
- Existing live deployment blocker: [LEADERBOARD_DEPLOYMENT_BLOCKER.md](LEADERBOARD_DEPLOYMENT_BLOCKER.md)
- Detailed 70-item investigation: [RELEASE_AUDIT_2026-10-31.md](RELEASE_AUDIT_2026-10-31.md)
- Tests and workflows: [tests/](tests/) and [GitHub Actions](https://github.com/28twagg-ops/28twagg-ops.github.io/actions)

## Exact continuation plan for the next engineering session
1. Read this file and the 70-item register. Check `main`, backup, draft PR and latest development HEAD. **Do not redo established investigations.**
2. Confirm the final development tree has green integration, UI, PWA, wrapper, emulator and live GET-only tests **at that exact SHA**. Fix regressions; attach exact run IDs.
3. With authorized Firebase access, confirm Anonymous Authentication, safely apply correct public web client config and reviewed create-only database rules. Never enable permissive public writes or commit credential tokens.
4. On a preview, play one real game, earn a labeled temporary score, confirm exactly one authenticated production PUT, fetch it from a fresh browser, verify rejected unauthorized/overwrite attempts, and clean the QA record with administrator permission.
5. Execute short real-device QA (iOS Safari, Android Chrome, desktop) and prioritized high-risk manual test matrix. Document untested areas.
6. Only after passing hard gates, explicitly approve/merge PR #1, check GitHub Pages and PWA refresh, retain `main` rollback commit and prior rules backup, and monitor production.
7. Improve R07/R08 server-side abuse protections and R13 Casino scaling before claiming robust competitive online ranking.

## The chat's “API core” error
The user separately reported an **“API core” error in the ChatGPT conversation** while requesting work. That is an observed chat/UI failure report, **not evidence of a PIXEL-NET game or Firebase bug**; we do not have the error code, service diagnostics or a confirmed root cause. This GitHub status page is a durable handoff so a new conversation can resume work without relying on an exceptionally long chat history.

**Update protocol:** When changing any finding, include the issue ID (R##), changed path, commit SHA, test run URL and new status here or in the detailed register. Distinguish simulated writes from authenticated production writes in every release note.
