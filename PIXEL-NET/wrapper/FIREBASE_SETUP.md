# PIXEL-NET Firebase — production safety / release blocker

**Status (2026-10-31): GLOBAL SCORE WRITES NOT CERTIFIED.**

The public `main` shell uses a historical unauthenticated Firebase REST `POST` to `/lb/{game}.json`. Existing production rules may reject it. A local score appearing in the game does **not** prove the score reached Firebase or another device.

## Critical warning

**Never enable anonymous public `.write: true` or use Firebase TEST mode** to make score uploads appear to work. The previous instructions on this page were unsafe and have been retired. A public-write database permits score fabrication, mass spam, and overwrites/deletes unless additional rules or server-side controls block them.

## Correct target architecture

1. Use the separately developed authenticated, create-only candidate flow under [the 2026-10-27 release branch](https://github.com/28twagg-ops/28twagg-ops.github.io/tree/work/container-fixes-2026-10-27/PIXEL-NET/firebase), not the historic unauthenticated `POST` workflow. Merge the backend code only after reconciling its 19-title catalog with the **current 28-title public catalog**.
2. Enable Firebase Anonymous Authentication via authorized project administration; use public web-app config only, never service-account credentials in client code or git.
3. Apply reviewed Realtime Database rules that allow reads and authenticated, validated, **create-only** writes. Keep the ten independently licensed titles **local-only** until their score integration is explicitly implemented and tested.
4. Verify every original game and the Casino's four modes against the RTDB emulator. Reject unknown games, malformed records, overwrites, deletions, unauthorized requests, and invalid Casino modes.
5. On a controlled preview, earn a genuine test score through gameplay. Prove exactly one production write; read it from a second browser; confirm unauthorized and overwrite attempts fail; remove the labeled QA record using authorized admin tools.
6. Protect against abuse (rate limiting, quotas, plausibility checks, moderation), and set budget/usage alerts before public competition.
7. Only then announce that live worldwide score submissions work. Until that gate passes, clearly distinguish verified global scores, locally saved results, and failed/pending uploads.

## Development references

- [Candidate Firebase rollout](https://github.com/28twagg-ops/28twagg-ops.github.io/blob/work/container-fixes-2026-10-27/PIXEL-NET/firebase/ROLLOUT.md)
- [2026-10-31 release audit](https://github.com/28twagg-ops/28twagg-ops.github.io/blob/work/container-fixes-2026-10-27/PIXEL-NET/RELEASE_AUDIT_2026-10-31.md)

This audit branch makes no production database writes, changes no live Firebase rules, and does not publish new scores.