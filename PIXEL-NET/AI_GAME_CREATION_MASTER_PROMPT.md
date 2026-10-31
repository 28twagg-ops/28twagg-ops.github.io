# PIXEL-NET — AI-First Arcade Game Creation Master Prompt
**Version:** 2026-10-31. **Audience:** coding agents with repository access and a real browser test harness.

## Input variables — complete before running
- GAME_TITLE: [original name]
- GENRE: [platformer / shooter / puzzle / racer / rhythm / strategy / etc.]
- ORIGINAL_HOOK: [one distinctive mechanic, not a derivative title]
- PLAYER_FANTASY: [the feeling and actions within the first 15 seconds]
- REFERENCE_MOOD: [descriptive color/shape/tempo language, not another studio's IP]
- TARGET_PLAY_LENGTH: [e.g. 2–5 minutes per run]
- TARGET_INPUTS: keyboard + touch as baseline; gamepad optional
- TARGET_PATH: PIXEL-NET/games/[unique-slug]/game.html
- WRAPPER_PATH: PIXEL-NET/games/[unique-slug]/wrapper-v2.html
- SCORE_SLUG: [stable id coordinated with games.json and backend allowlist]

## Role and mission (copy this entire prompt to the coding agent)
Act simultaneously as an experienced arcade game director, gameplay programmer, 2D technical artist, responsive UX designer, security-minded integration engineer, and player-oriented QA tester.

Build a COMPLETE, visually distinctive and genuinely enjoyable original browser arcade game for PIXEL-NET. Deliver a playable, tested artifact, not a screenshot, wireframe, generic moving rectangle, placeholder, slideshow, or code-only answer.

Start by inspecting this repository's current files, game catalog, original game wrappers, existing game-over event contract, test harness, score backend constraints, service worker, and draft release branch. Work on a separate feature branch or current authorized development branch. Do not alter public main, production Firebase rules, shared score schema, other games, or backups without explicit approval and tests.

### 1. Design contract before implementation
Write a compact one-page design brief identifying:
- Gameplay loop: start -> decision -> action -> readable feedback -> reward/risk -> progression -> game-over -> restart.
- One novel differentiator and why players would replay.
- Genre conventions to preserve, plus original art, setting, mechanics, and naming.
- Exact controls for keyboard, touch, and optional gamepad, with pause and mute.
- Starting state, objectives, scoring formula, lives/health, lose/win conditions, enemy/hazard behavior, difficulty progression, and cap on uncontrolled escalation.
- HUD and accessibility, audio plan, sprite/asset inventory and license/provenance, performance budget, no-network fallback.
- Four deterministic acceptance scenarios with expected scores/states (including death and restart).
If source or design details are missing, choose reasonable defaults, document them, and proceed.

### 2. Implementation architecture
Prefer plain JavaScript with HTML5 Canvas 2D for compact original 2D arcade games already hosted as static HTML, or a pinned Phaser version when physics, tilemaps, animation pipelines, or many scenes materially justify it. Avoid React/complex dependencies for the inner game loop, avoid build tooling unless the repo already requires it, and do not introduce new backends.

Use explicit states: TITLE, READY, PLAYING, PAUSED, GAME_OVER (and VICTORY if applicable). Use one authoritative game state and a clearly separated update/draw/input lifecycle. Drive simulation through requestAnimationFrame with elapsed-time handling; clamp long frame deltas or use a bounded fixed-timestep accumulator. Cap entity counts; avoid unbounded arrays, event listeners, timers, recursion, and animation loops on retry. Pause/clear input appropriately on window blur and visibility change.

Render at devicePixelRatio with a logical resolution and uniform aspect-preserving scaling. Keep hitboxes consistent with visuals; handle swept collisions for fast projectiles if relevant, wall/world bounds, invulnerability intervals, collision edge cases, and no softlocks. Make mobile controls large and thumb-reachable; use pointer events correctly, prevent unintended page scrolling only on game controls, and avoid overlapping the Start/Replay actions.

Implement quality feedback rather than decoration alone: readable silhouettes, coherent palette, layered scenery, dynamic but inexpensive particles, motion easing, hit flash, feedback sounds started only after user gesture, screen shake capped/disabled for reduced motion, score popups, transitions, and consistent typography. Audio must have mute and no autoplay violations. Never allow effects to obscure objectives or controls.

### 3. Complete gameplay, not a demo
Players must be able to actually start, understand the objective without external explanation, move/act, interact with hazards/enemies, earn a real score, suffer failure and/or achieve victory, see a result screen, and replay without reloading. Make at least 3 distinct escalating phases, escalating enemy patterns, or comparable puzzle levels if genre permits. Make scoring exploit-resistant at the UX level, but never claim a browser client alone is cheat-proof.

Avoid copyrighted ROMs, brand logos, trademark-mimicking titles, recognizable ripped sprites, copyrighted music, or unlicensed external image/audio URLs. Generate original assets or use verified licensed resources; keep asset provenance and AI disclosure notes. No invented asset file paths or dependencies. The assistant must not assert legal ownership or copyright registration solely because it provided prompts.

### 4. PIXEL-NET integration contract
- Use the existing static game wrapper and explicit per-game config/theme instead of writing a second arcade shell.
- Register one unique game path and slug in PIXEL-NET/games.json using an optimized, original thumbnail.
- Every real game-over emits exactly one compatible score message to its same-origin parent, following existing GAME_OVER_SCORE / documented legacy contract and existing score normalization. Never allow score submissions from menus, tests, time-based demos, previews, or restarts before a finished run.
- Keep global ranking writes exclusively in the shared wrapper; do NOT embed Firebase privileged credentials or invent an unauthenticated write endpoint.
- Treat LOCAL, PENDING, and GLOBAL CONFIRMED as different states. Never manufacture a successful production score upload. Any test write must be mocked/emulated unless owner explicitly approves a production QA record and cleanup.
- If new slugs require backend authorization, update *candidate* rules and emulator tests only; do not deploy to production.
- Maintain the existing design system, mobile cabinet tabs, search, initials, reduced motion, and install/offline behavior.
- Keep changes isolated so the other 19 catalog games are unaffected.

### 5. Verify by actually PLAYING the game
Run the game on a local HTTP server, launch Chromium with Playwright, record console/page errors and broken network requests, and capture representative screenshots. Do not call it playable merely because HTML loads.

Required scenarios:
A. Fresh desktop: title -> start -> move/attack/jump/collect -> demonstrate numerical score increase -> suffer real game over -> restart -> second run.
B. Mobile touch: start and use the actual touch controls; validate hit targets, no scroll/canvas distortion and no button overlap at 390x844 and a narrower device.
C. Stress/edge: multiple rounds/levels, high score, pause/resume, tab hidden/visible, rapid input, window resizing, input release on blur, network loss, restricted storage.
D. Score: intercept same-origin game-to-wrapper message and assert a SINGLE authentic game-over result; simulate accepted/denied Firebase operations via mock and verify queue behavior. Never send fabricated score to the live public database.
E. Regression: all catalog wrappers still open, existing leaderboard cases pass, old game routes and controls work, and privacy/security assumptions are unchanged.
F. Visual quality: screenshot the title, a mid-game action scene, and game-over on desktop and mobile. Inspect visual hierarchy, sprite consistency, clipped text, HUD legibility, responsive scale, excessive empty space, and obvious placeholder visuals.

Use deterministic seeded game-state harnesses or test-only controls *locally* if needed for hard-to-reproduce transitions. Do not ship a cheat debug route to public gameplay. Avoid flaky sleep-only tests; wait for observable state. Fix defects, rerun the focused test, then rerun the affected regression suite.

Existing test entrypoints (from repository root; local server serves PIXEL-NET at 127.0.0.1:8765):
- node PIXEL-NET/tests/all-game-start-smoke.cjs
- node PIXEL-NET/tests/final-interface-audit.cjs
- node PIXEL-NET/tests/leaderboard-all-games.cjs
- node PIXEL-NET/tests/release-hardening.cjs
- node PIXEL-NET/tests/pwa-install.test.cjs
Check current CI workflow dependencies and the real branch before invoking.

### 6. Release gates
The new game is NOT complete until:
- All required routes and assets resolve with real HTTP 200s and zero unhandled JS exceptions.
- Title, start, gameplay, win/lose, score, and restart are demonstrably functional.
- No invisible hazards, softlocks, uncaught input, unfair collision handling, or duplicate game-over events in tested cases.
- Desktop and touch controls, canvas scale and focus pass tests.
- Visual screens reflect a unified art direction and real content rather than placeholders.
- Game-over event reaches the shared wrapper correctly, with mock backend verified.
- Related existing regression tests pass; changes and limitations are documented.
- No new unauthorized live database changes or compromised secrets.

Score your work using a documented, evidence-based 100-point rubric: gameplay/replayability 30, reliability/technical design 25, visual/audio polish 20, mobile/accessibility 15, integration/regression 10. Aim for >=85 in tested criteria but never claim 100%, full-device certification, or production score activation unless actually established. A failed critical gate blocks release regardless of numeric score.

### 7. Work in short, verifiable phases
Phase 0: Inspect and inventory existing source; decide whether reuse or new code is safer.
Phase 1: State the one-page game design brief, file changes and acceptance cases.
Phase 2: Build a single complete vertical slice and run it; patch actual failures.
Phase 3: Complete progression, visual/audio polish, score event and accessibility.
Phase 4: Browser gameplay QA, screenshots, regression and error fixes.
Phase 5: Final independent test, source/license review, and code handoff. Do not overwrite unrelated files.
Between phases, prioritize fixing actual failed mechanics and console errors over speculative large rewrites. Only pursue optional features after all critical gates pass.

### 8. Required final handoff
Give: (1) game concept and unique hook; (2) changed files and commit/PR URL; (3) controls and gameplay instructions; (4) desktop/mobile screenshots if available; (5) exact commands and passing/failing test evidence; (6) score event and global upload status (mock vs production clearly distinguished); (7) remaining defects with severity, reproduced steps and next action; (8) asset sources/AI usage disclosure; (9) release decision PASS / CONDITIONAL / BLOCKED with rationale.

**Absolute prohibitions:** no placeholder presented as finished; no test-only fake high scores in public data; no blanket Firebase .write=true; no secret tokens in Git; no ROMs or copied artwork without rights; no claimed full game QA without real interaction; no silent changes to other games or default branch.

## Evidence and rationale
- OpenGame: https://arxiv.org/abs/2604.18394 (template/debug skills, runtime verification)
- Play2Code / PlaytestArena: https://arxiv.org/abs/2605.28258 (GUI-agent feedback)
- GameCraft-Bench: https://arxiv.org/abs/2606.17861 (engine grounding and completeness)
- Phaser docs: https://www.phaser.io/oss/docs/
- MDN game loop: https://developer.mozilla.org/en-US/docs/Games/Anatomy
- MDN Canvas performance: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- Playwright tests: https://playwright.dev/docs/test-assertions
- Firebase rules: https://firebase.google.com/docs/database/security/core-syntax
- US Copyright Office AI report: https://www.copyright.gov/newsnet/2025/1060.html
- itch.io AI-content guidance: https://itch.io/docs/creators/quality-guidelines
