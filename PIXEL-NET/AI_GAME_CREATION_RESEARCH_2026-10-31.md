# PIXEL-NET — Deep research on AI-created arcade games
**Date:** October 31, 2026. This is a scoped evidence review, not a guarantee that any particular AI agent can finish any requested game.

## Executive decision
PIXEL-NET should standardize an **AI design -> small runnable vertical slice -> browser playtest -> error/visual correction -> polish -> score integration -> regression gate** workflow. A giant instruction asking for a "perfect game" is not as dependable as a detailed spec combined with repeated real play and a verified architecture. Use the companion AI_GAME_CREATION_MASTER_PROMPT.md for an actionable engineering contract.

## Evidence tiers and critical limitations

### Tier A — direct academic game-generation studies
1. **OpenGame, April 2026 (arXiv:2604.18394)**: reports that multi-file state, cross-file wiring, and interaction verification frequently break LLM-created games; proposes reusable game scaffolds plus a memory of verified fixes and evaluates build/visual/intent alignment over 150 prompts. Implication: keep a working PIXEL-NET shell/template and centralized test harness.
   https://arxiv.org/abs/2604.18394
2. **Play2Code / PlaytestArena, May 2026 (arXiv:2605.28258)**: evaluates 200 browser-game tasks across eight genres using GUI playtest agents. Reports 66.8% rubric pass rate for its play-test-to-code method, improvement over the studied single-pass and agentic baselines. This is an experimental benchmark, not a universal success rate. Implication: test by actually pressing buttons, earning points, and dying—not by checking page loads.
   https://arxiv.org/abs/2605.28258
3. **GameCraft-Bench, June 2026 (arXiv:2606.17861)**: studies 140 Godot tasks across 15 families, with interaction-grounded evaluation. Strongest evaluated agent reaches 41.46% (per paper abstract) on its rubric; common failures are missing content, incomplete interaction, and poor feedback. Implication: complete states, progression and presentation must be acceptance gates, not aspirational polish.
   https://arxiv.org/abs/2606.17861
4. **OpenGameEval, October 2026**: evaluates agents with executable checks inside a stateful Roblox environment. Early evidence associates inspecting touched objects before editing with higher success. This is a different engine and task distribution; it supports repository-first inspection, not numerical predictions for PIXEL-NET.
   https://github.com/Roblox/open-game-eval

### Tier B — practical primary-source engineering guidance
5. **Phaser official docs**: supports browser games with JavaScript or TypeScript, scenes, input and Canvas/WebGL. Phaser is often valuable for physics and tilemaps but incurs dependency overhead in a single-file microgame arcade. For this repo, prefer plain Canvas unless more complex mechanics justify Phaser.
   https://www.phaser.io/oss/docs/
6. **MDN Anatomy of a Video Game**: model game loop as input -> update -> rendering -> repeating, with defined end conditions.
   https://developer.mozilla.org/en-US/docs/Games/Anatomy
7. **MDN Canvas optimization**: recommends offscreen prerendering for repeated work and careful pixel rendering; combine with logical resolution, devicePixelRatio, capped frame delta, event-listener cleanup and budgeted particles.
   https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
8. **Playwright assertion guidance**: prefer auto-retrying assertions and observable UI state; separately drive keyboard/touch/click, capture screenshot, record page errors and mock network failures.
   https://playwright.dev/docs/test-assertions
9. **Firebase security rules docs**: RTDB .read, .write, .validate and .indexOn have different semantics. Indexed queries and server-side checks matter, but anonymous auth alone cannot guarantee score authenticity.
   https://firebase.google.com/docs/database/security/core-syntax
   https://firebase.google.com/docs/database/security/indexing-data
10. **Meta iterative game development cookbook**: recommends inventorying real assets before coding, browser playtesting, looking at screenshots, and small targeted refinement passes. This is vendor guidance, not independent controlled evidence.
    https://dev.meta.ai/docs/cookbook/iterative-game-dev

### Tier C — product/rights guidance
11. **Unity AI (May 2026)**: editor-aware agent tooling for a traditional game engine; potentially useful for larger games, but not necessary to ship small static GitHub Pages arcade games.
    https://unity.com/blog/unity-ai-how-to-get-started
12. **GDevelop AI docs**: engine-specific AI can inspect objects/events for edits, but migrating the existing arcade introduces a new export/runtime surface.
    https://wiki.gdevelop.io/gdevelop5/interface/ask-ai/
13. **Godot web export docs**: WebAssembly/WebGL, mobile performance and audio/threads/export caveats. A larger exported build is not a free upgrade for small playable browser games.
    https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
14. **US Copyright Office (January 2025)**: mere prompting does not itself create protectable human authorship; human creative selection/arrangement/modification can matter. Avoid describing AI-generated code/images as necessarily copyright-protected.
    https://www.copyright.gov/newsnet/2025/1060.html
15. **itch.io quality/disclosure guidance**: disclose generative AI where required and avoid low-value mass-produced uploads; originality, thoughtful curation and license provenance matter.
    https://itch.io/docs/creators/quality-guidelines

## Why a one-pass "make perfect game" prompt underperforms
- A code-only answer can include a working title screen but no reachable fail state, no collision bounds, or score event.
- Models may make assumptions about file names, runtime engine versions, image paths, keyboard focus, mobile layout and database schema that are false.
- Visual screenshots can look attractive while gameplay is broken; static audits can pass while input mapping or game-over never executes.
- One-pass scores vary widely by task, model and benchmark. Never describe a vendor comparison or small informal benchmark as universal proof.

## Recommended format for a genuinely complete AI-generated arcade game
- Original playable idea: recognizable genre controls + a novel hook, not direct reproduction of ROMs or branded titles.
- One short design brief with measurable gameplay and UI states and target session length.
- One tiny, runnable vertical slice; working game loop and dynamic canvas scaling.
- Test movement, collisions, health, score, restart and progression before beautifying.
- Create original and visually consistent sprites/VFX and concise cues (hit flashes, particles, contrast, active frames, layered parallax).
- Use muted-by-default or gesture-initiated audio and reduced-motion accommodations.
- Include keyboard plus touch and prevent accidental browser scrolling on interactive controls.
- Score once on legitimate run end and delegate Firebase persistence to the trusted shared shell.
- Use tests that simulate denied Firebase writes, offline/retry and mobile; distinguish mock from production.
- Measure responsiveness and review full gameplay traces on real phones before public claims.

## Genre-specific AI prompting pattern
Use a single **mechanics paragraph** that is precise enough to test, e.g.:
- Maze chase: "Enemy states PATROL/CHASE/FRIGHTENED, no instant 180° turns, each collectible advances score, a collision consumes a life, board clears advance stage."
- Shooter: "Predictable bullet cadence, visible hitboxes/telegraphs, invulnerability window after damage, wave escalation, bounded particle/enemy counts, deterministic restart."
- Platformer: "Coyote-time and jump buffering, walkable ledges and no unreachable exits, collectible feedback, controlled camera, touch jump not covered."
- Puzzle: "Valid-state rules, reversible moves or loss condition, level objective, undo/pause where appropriate, clear win feedback and new-round generator."
- Racing: "Stable physics units, speed/traction feel, readable bounds, checkpoint logic, finish ranking, mobile turning and restart."
- Fighting: "Attack startup/active/recovery frames, simple hitbox/hurtbox separation, opponent tells, fair stun/knockback, round scoreboard."
- Casino-themed educational games: "Clear chance/probability and score rules, modes separated, simulated virtual points only, never link to real-money wagering."

## Suggested evaluation rubric
- **Gameplay and replayability (30)**: clear objective, real agency, skill-based decisions, progression, fair fail/retry.
- **Reliability/engineering (25)**: frame-independent logic, stable input, true game-over, no crashes, reset, collision and performance tests.
- **Visual/audio feel (20)**: original style, polished animation, meaningful feedback, readable HUD and sound handling.
- **Mobile/accessibility (15)**: thumb controls, no clipping/scroll traps, sizing and focus, sound/reduced-motion toggles.
- **Integration/regressions (10)**: single legitimate score event, existing wrapper, catalog/thumbnail, mock and existing-game regression.

Minimum for a release candidate: every critical interaction gate passing and >=85/100 across evidenced categories. Do not turn an untested category into a perfect score or claim general bug freedom.

## Scope-specific final decision
No "best AI model" ranking is defensible independent of the user's game genre, repository, time, budget, and access. For PIXEL-NET the highest-leverage prompt is one that:
1. grounds the agent in THIS repo and the actual score contract;
2. requires an original complete game not a clone or fake visual;
3. forces a tested vertical slice;
4. explicitly drives the browser and inspects screenshots and errors;
5. prevents unrelated game/backend regressions;
6. reports precise evidence and remaining limits.

See AI_GAME_CREATION_MASTER_PROMPT.md. The separate RELEASE_AUDIT_2026-10-31.md remains the full engineering backlog.
