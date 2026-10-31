# PIXEL-NET — All-game mobile, desktop, input, and leaderboard investigation
**Snapshot:** 2026-10-31 · **scope:** current public `main` at `1e90126687e8fe26da5131eb2e27b46a5f091ce3`; isolated repairs staged in draft PR #7 `audit/complete-arcade-qa-2026-10-31`.

## Release decision
**DO NOT MERGE / DO NOT CALL PRODUCTION SCORE SUBMISSIONS WORKING.** Public `main` was not modified by this audit. An isolated audit branch was created to test changes without deploying them. Existing release candidate PR #1 is **not** interchangeable with current public `main`: it has a 19-original-game catalog and separate advanced authentication implementation, whereas current public `main` has 18 originals + 10 licensed titles.

## Scope and what "tested" really means
1. Read the public catalog and the original and licensed source wrappers; compared public and older development branches.
2. Inspected existing GitHub Actions browser runs, including 28-game runtime health, 39/39 unified integration, 10/10 imported game launch and 20/20 simulated mobile licensed interactions.
3. Created a new test suite for 18 original games × 3 browser profiles (desktop Chromium, Android Chromium touch emulation, iPhone WebKit touch emulation) and a mocked score pipeline/security test. These run in GitHub Actions and save screenshots, JSON diagnostics, errors and control events. **A queued/running check does not count as a pass.**
4. Staged five native gameplay replacements that avoid emulator boot dependencies and expose a mobile D-pad and ACTION button. Existing old emulator files remain available for rollback.
5. Did **not** use a real iOS/Android physical device, complete hours-long game sessions, access production Firebase admin console, or post a real score to Firebase. Do not extrapolate green short smoke tests into those claims.

## Current 28-title game inventory

| Game | Current public `main` evidence | Audit-branch remediation / validation | Worldwide score status |
|---|---|---|---|
| Caked Up Cats | Browser frame/canvas clean in earlier health run; keyboard/touch code and game-over event present | Expanded desktop + Android + iOS smoke | Current public writes unverified |
| Creek Crosser | Frame/canvas clean; input/start and game-over code present | Exercise arrow/touch and cabinet tabs | Current public writes unverified |
| Astrotype | Frame/canvas clean; keyboard and score-event code present | Test mobile input and storage failure | Current public writes unverified |
| Knight Flight | Frame/canvas clean; keyboard, touch and score event present | Verify play overlay and inputs | Current public writes unverified |
| Logic Bomb | Frame/canvas clean; keyboard, touch and score event present | Verify start and interaction | Current public writes unverified |
| Neon Chase | Frame/canvas clean; direction and score event present | Mock score rejection, dedup, browser controls | Current public writes unverified |
| Robo-Arena | Frame/canvas clean; mobile control event code present | Test touch/control event and panel tabs | Current public writes unverified |
| Millipede Chaos | Previously missing `engine.js` fixed on public main; browser START validated in prior CI | New original game audit | Current public writes unverified |
| Spyder Casino | Terminal-style interface; original mode score path had duplicate write and lost Analysis records in wrapper | Remove duplicate score submit, send correct Standard/Analysis mode, separate full-history mode lists | **Production upload not certified** |
| Galaxy Swarm 2084 | Frame/canvas clean; score event code present | Expanded original game smoke | Current public writes unverified |
| Stack Drop DX | Frame/canvas clean; score event code present | Expanded original game smoke | Current public writes unverified |
| Dig Dug Delve | Legacy emulator reported running with browser permission errors; score event not proved | Native playable replacement + START assertion + mobile D-pad | Native score emits; live upload unverified |
| Combat 77 Arena | Legacy emulator reported running with browser permission errors | Native replacement + START assertion + mobile D-pad | Native score emits; live upload unverified |
| Atariforce Hyperlane | Frame/canvas clean; keyboard and score event present | Expanded original game smoke | Current public writes unverified |
| Jungle Jr Rescue | Legacy emulator reported running with browser permission errors | Native replacement + START assertion + mobile D-pad | Native score emits; live upload unverified |
| Kangaroo Climb | Frame/canvas clean; keyboard and score event present | Expanded original game smoke | Current public writes unverified |
| Track Field Blitz | Legacy C64 emulator showed loading screen, not confirmed complete gameplay | Native three-event athletics replacement; correct native 8:5 aspect + touch D-pad/ACTION | Native score emits; live upload unverified |
| Tower Rush | Legacy emulator reported running with browser permission errors | Native replacement + START assertion + mobile D-pad | Native score emits; live upload unverified |
| 2048 | Existing game and restart/swipe tested in simulated Android/iPhone WebKit | Maintain original MIT notice and game cabinet | **Original-device-only; no global upload by design** |
| Astroblast | Existing launch/PLAY/canvas tap tested in simulated mobile browsers | Keep creator attribution and local-only scoreboard | Original/local only |
| Missile Defense | Existing mobile landscape PLAY/canvas tap tested | Check rotation on physical devices | Original/local only |
| Pong | Existing mobile landscape PLAY/canvas tap tested | Check paddle/control responsiveness on physical devices | Original/local only |
| Snake | Existing mobile D-pad/start/restart tested | Preserve game source and license | Original/local only |
| Brickout | Existing mobile PLAY and canvas tap tested | Longer ball/paddle progression still needed | Original/local only |
| Moon Lander | Existing mobile PLAY and canvas tap tested | Full thrust/landing and fuel QA still needed | Original/local only |
| Emoji Survivors | Existing mobile PLAY, hero select, canvas tap tested | Longer upgrade/death/play progression still needed | Original/local only |
| Pool | Existing mobile PLAY/canvas tap tested | Full aiming/collision/potting QA still needed | Original/local only |
| Flap | Existing mobile PLAY/tap/restart tested | Score and repeated play QA still needed | Original/local only |

**Archived title:** Retro Kombat is hidden on public main because its active route is a coming-soon placeholder. The separately developed 19-original-title candidate has a playable replacement but was **not** automatically merged into this newer 28-game catalog.

## Issues and fixes

| ID | Priority | Evidence / problem | Action | State |
|---|---|---|---|---|
| A01 | P0 | Public Firebase uses unauthenticated REST POST; production auth/rules not confirmed; unsuccessful HTTP status had been discarded | Document authenticated create-only rules and full real-score test gate; explicitly log failed POST statuses | **BLOCKED: production verification** |
| A02 | P0 | No proof that a real gameplay score reaches production DB and appears on a second clean device | Must perform one legitimate test game-over upload, read back on independent browser and reject anonymous overwrite | **BLOCKED: Firebase admin/auth** |
| A03 | P1 | Main source had duplicate Casino direct FB write plus wrapper FB write | Route once through shared wrapper; retain mode in submission | **STAGED** |
| A04 | P1 | Casino wrapper truncated combined top10 prior to splitting Standard/Analysis | Fetch full mode data before filtering (pagination remains future issue) | **STAGED** |
| A05 | P1 | Any window message could impersonate a score; invalid scores accepted | Validate origin, iframe source, finite nonnegative safe integer | **STAGED; browser test added** |
| A06 | P1 | Scoreboard rows inserted untrusted initials into HTML | Build DOM text nodes; escape homepage ranking/record captions | **STAGED** |
| A07 | P1 | Five emulator-dependent titles report permission errors; original score chain not verified | Stage native counterparts, original game cabinet routes, touch buttons and earned-score handoff | **STAGED; new 54-case suite** |
| A08 | P2 | Public Firebase SETUP file recommended insecure TEST mode and `.write:true` | Remove dangerous instructions, document secure rollout | **STAGED** |
| A09 | P2 | Home showed "no scores yet" after failed fetch and invented prior champion from current runner-up | Differentiate unavailable vs empty; describe current lead instead of fictional history | **STAGED** |
| A10 | P2 | Cards were clickable divs, excluding native keyboard/link behavior | Replace with anchored game cards | **STAGED** |
| A11 | P2 | Shared wrapper could throw on restricted local/session storage | Guard read/write and hold initials in memory | **STAGED** |
| A12 | P2 | The ten imported games have no cross-device leaderboard | Continue local-only and attribute original creator/license; never fabricate global scores | **INTENTIONAL** |
| A13 | P2 | Actual iPhone/Android multi-touch, audio and frame-rate performance unproven | Real-device testing at portrait/landscape, slow device, touch hold/multitouch, restart and rotate | **OPEN** |
| A14 | P2 | Short start/test cases do not establish complete gameplay, win/lose, game-over correctness, or session durability | Full rounds per title, pause/resume, 10-minute input stress and game-over score QA | **OPEN** |
| A15 | P2 | Original emulator ROM redistribution rights still need review | Keep original files for rollback, audit license provenance before any future release | **OPEN** |
| A16 | P1 | Other forged scores, mass submissions and leaderboard abuse remain possible without trusted server validation | Add throttling, App Check, trusted gameplay verification, moderation and usage monitoring | **OPEN** |

## Release gate / next verification

- Inspect latest GitHub Actions at the current PR HEAD: `PIXEL-NET complete original desktop/mobile input audit`, `PIXEL-NET unified arcade floor integration`, `PIXEL-NET mobile gameplay QA (10 licensed games)`, `Public licensed game release test`. Check attached per-title screenshots and reports for failed inputs. A canceled run on an obsolete SHA is not evidence of failure or success.
- Fix any failing tests, especially native START transitions, ACTION taps, game-over events, source errors, mobile overflow and Casino mode isolation.
- Reconcile advanced Firebase code from draft PR #1 to **current catalog**, with real server auth/rules. Keep licensed titles excluded from global score upload until deliberately supported.
- Real device walkthrough + genuine production DB write and independent readback + score tamper rejection + rollback readiness; only then request release approval and merge.

**Current public site** https://28twagg-ops.github.io/PIXEL-NET/ · **Repair PR** https://github.com/28twagg-ops/28twagg-ops.github.io/pull/7 · **Previous backend candidate** https://github.com/28twagg-ops/28twagg-ops.github.io/pull/1
