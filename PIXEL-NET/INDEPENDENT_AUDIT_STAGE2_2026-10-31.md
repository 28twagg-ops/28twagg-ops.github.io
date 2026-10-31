# PIXEL-NET independent audit — Stage 2 evidence and release blockers

**2026-10-31 · Draft · NOT SAFE TO MERGE**

## Verified version references
- Public baseline: [main v0.0.54](https://github.com/28twagg-ops/28twagg-ops.github.io/tree/main/PIXEL-NET), commit `1e90126687e8fe26da5131eb2e27b46a5f091ce3`.
- Preserved earlier backup: [v0.0.52](https://github.com/28twagg-ops/28twagg-ops.github.io/tree/backup/original-pixelnet-2026-10-27/PIXEL-NET).
- [Earliest initial arcade setup](https://github.com/28twagg-ops/28twagg-ops.github.io/tree/232cd732ba062ffe56b973e58870f221cda8b2f8/PIXEL-NET) contains initial Millipede, not all 28 later titles.
- Backup → main has 32 commits ahead, 83 files changed. Most preexisting native `game.html` files were unchanged; a blanket rollback cannot be assumed to repair their gameplay.
- Older experimental draft PRs are NOT merged into this branch. This branch contains no broad emulator-to-native substitutions.

## Testing performed, with honest limitations
- Built a new five-profile input/evidence runner, not a reuse of green smoke-test claims: desktop Chromium, simulated iPhone WebKit portrait/landscape and Android Chromium portrait/landscape, all 28 public entries.
- In the original `main` baseline, **28/28 wrapper visits** completed without fatal navigation errors in desktop, iPhone portrait, iPhone landscape and Android landscape. Android portrait results were still pending at report creation.
- The original browser input probes observed canvas/HUD changes in only **10/28 desktop**, **11/28 iPhone portrait**, **8/28 iPhone landscape**, and **10/28 Android landscape**. These counts are NOT gameplay pass rates; an animated canvas can change without working controls, while a static game may need different scripted start actions.
- All environments above are **emulations**. No physical iPhone or Android was accessed, no complete gameplay round certified, and no production Firebase score was written.
- Before/after screenshots and per-game diagnostics are in GitHub Actions artifacts from the independent baseline, and additional scoring/phone-layout gates are staged on this PR.

## 28-game investigation matrix

| Public game | Engine | Owner screenshot / code finding | Independent repair / unresolved status |
|---|---|---|---|
| Caked Up Cats | Native | Character selection cut off on phones; direction buffering and score-save remain to verify | Selection grid staged; gameplay pending |
| Creek Crosser | Native | Directional pad obscures START/playfield; historical controls were disputed | Swipe/tap repair staged; touch moves to be verified |
| Astrotype | Native typing | Wave/shield HUD overlap; native iPhone typing obscures playfield | HUD spacing staged; mobile typing unresolved |
| Knight Flight | Native | Excess empty space and constrained 4:3 layout; control completion unverified | Shared wrapper repair; full-round pending |
| Logic Bomb | Native | Touch bomb action, level-one difficulty and score progression unverified | Full-round pending |
| Neon Chase | Native | Touch steering and scoring need actual gameplay confirmation | Wrapper/scoring repaired; gameplay pending |
| Robo-Arena | Native | Virtual joysticks overlap playfield; multi-touch needs testing | Unverified controls |
| Millipede Chaos | Native | Must verify firing, waves, scoring, audio rather than opening game | Gameplay pending |
| Spyder Casino | Native terminal | iOS keyboard obscures menu; direct+wrapper duplicate score writes; scores split after top-ten | Touch command bar and score dedup staged; full hands pending |
| Galaxy Swarm 2084 | Native | Keyboard controls only in baseline source; no confirmed touch movement | Mobile play unresolved |
| Stack Drop DX | Native | Keyboard actions not mapped to touch; rotate/hold/line clearing unverified | Mobile play unresolved |
| Dig Dug Delve | Commercial ROM emulator | Boot, controls, scoring and redistribution rights unverified | Do not certify |
| Combat 77 Arena | Commercial ROM emulator | Boot, controls, scoring and redistribution rights unverified | Do not certify |
| Atariforce Hyperlane | Native | Touch movement/fire/burst not independently verified | Mobile play unresolved |
| Jungle Jr Rescue | Commercial ROM emulator | Emulator boot/control and ROM rights unverified | Do not certify |
| Kangaroo Climb | Native (ROM also present) | Mobile movement/platforms and retained ROM rights unverified | Do not certify |
| Track Field Blitz | Commercial ROM emulator | C64 loading/round completion and rights unverified | Do not certify |
| Tower Rush | Commercial ROM emulator | Emulator progression, buttons, ROM rights unverified | Do not certify |
| 2048 | Licensed | Visible phone swipe and New Game function; maximize board without rewriting original | Full scoring session pending |
| Astroblast | Licensed | Physical iPhone repeatedly crashed per owner screenshots | Critical blocker; native crash fix unverified |
| Missile Defense | Licensed | Physical iPhone repeatedly crashed per owner screenshots | Critical blocker; native crash fix unverified |
| Pong | Licensed | Pointer/paddle control and complete match unverified | Round pending |
| Snake | Licensed | D-pad start/restart existed in prior smoke; real win/lose pending | Round pending |
| Brickout | Licensed | Paddle and ball collisions/complete level unverified | Round pending |
| Moon Lander | Licensed | Thrust, landing and fuel/full-round unverified | Round pending |
| Emoji Survivors | Licensed | Select hero/stage, upgrades, death/unlock unverified | Round pending |
| Pool | Licensed | Cue aiming, potting and match completion unverified | Round pending |
| Flap | Licensed | Touch flap, score growth, restart/death unverified | Round pending |

The baseline navigation result applies to **all 28** in the four completed emulated profiles. Every title's **actual playthrough, reliable input responsiveness, game-over state, and scored cross-device readback remain UNVERIFIED** except for targeted limited browser probes. Do not turn this matrix into '28 games passed gameplay'.

## Independently observed root causes and targeted changes

| Severity | Evidence | Isolated branch changes | Proof required |
|---|---|---|---|
| Critical | Shared wrapper originally assigned both `gd.src` and `gm.src`: two copies of every game run | `d8fb2ffe`: load one active iframe and unload hidden one | Memory/performance comparison and repeat iPhone crash checks |
| Major | Fixed top bar and `100vh` waste phone space; title badge wraps and overlaps | `91b0b348`: safe-area-aware `100dvh`, compact pills, landscape tabs | iPhone portrait/landscape visual snapshots |
| Moderate | Exit uses history.back even from external deep links; no maximize | `78dbaadb`: always return to arcade home; CSS maximize/restore | Browser navigation and focus test |
| Critical | Untrusted window messages could submit scores to any slug; negative/infinite values; failed HTTP writes look successful; leaderboard HTML injection | `c45d0b64`: current game source/origin check, score validation, safe DOM rows, truthful status and remote-response checks | Mocked denied-write, spoof/duplicate/cross-slug tests; production rules separate |
| Major | Casino posted scores directly and via wrapper; Standard/Analysis modes mixed by top-10 ordering | `d335c437`: single wrapper upload path; preserve game mode | Complete real Blackjack/Hold'em hands and Firebase readback |
| Major | Creek Crosser's overlay D-pad blocked the game | `248f8c8c`: hide overlay, add directional swipe and tap-to-advance | Real touch directions and collision/goal mechanics |
| Major | Cat selection cards clipped at phone widths | `c4a9e1c4`: responsive three-column cards, same sprites/colors | iPhone portrait/landscape screenshot review |
| Major | Casino keyboard pops up on phone, blocking terminal interface | `844957aa`: green-terminal mobile action strip, suppress auto focus | Test action controls and whole hands on actual touch |
| Major | Astrotype HUD 'WAVE' overlaps shield text | `e64a570c`: position WAVE below score/shields at narrow widths | Reinspect phone screenshot |

## Additional critical blockers
1. **Astroblast and Missile Defense:** repeated actual iPhone WebKit crashes have been photographed by the owner. No emulated test proves they are fixed. Do not advertise them as mobile-ready until real-device reproduction and memory/long-session verification.
2. **Firebase:** current production database authentication/rules, actual score upload, second-browser readback, data-tamper rejection, and local-save integrity are not certified. No public write rules may be enabled to force a pass.
3. **Commercial ROM provenance:** review redistribution rights for five active emulator titles and retained Kangaroo assets. A site working is not permission to publish copyrighted programs. Do not silently delete existing sources; hide or remove only after owner approval and legal review.
4. **Full gameplay and device matrix:** neither page load nor image checksum change is proof of real movement, win/lose, controls or progression. Full rounds and physical phone testing are still required.
5. **External dependencies and artwork:** EmulatorJS CDN/network failures can be sandbox artifacts; compare network-enabled runtime. Large thumbnail images remain unoptimized in this branch; do not add new art until the functional release is stable.

## Release recommendation
**DO NOT MERGE / DO NOT SHIP AS FINISHED.** Retain the public v0.0.54 until the targeted draft changes pass the current source-integrity, real gameplay, portrait/landscape, Firebase and real-device gates. Preserve existing visual themes. Avoid merging older AI branches wholesale or substituting games with simplified prototypes.

## Next test evidence needed (do not confuse with completed work)
- Script actual gameplay outcomes and movements per game, not just screenshots.
- Verify all 28 titles using desktop keyboard/mouse, iPhone and Android portrait/landscape. Record menus, interactions, pause/restart, actual game-over, scores, screenshots and console/network errors.
- Retest single iframe performance, iPhone crashes across multiple launch/exit/rotate cycles, Casino phone commands and keyboard desktop parity, and real Firebase readback with secure rules.
- Document per-game last known-good / breaking revision **only after a controlled historical playtest**. The source commit history is evidence of changes, not evidence a revision works.
