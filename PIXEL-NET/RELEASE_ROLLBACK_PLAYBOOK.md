# PIXEL-NET — Production release / rollback playbook
Updated: 2026-10-31. This is an OPERATOR RUNBOOK, not proof that a rollback has been rehearsed.

## Truth at time of writing
- Public branch: main, original release at f74b2ff86b1024f240623cae47f12782a8c9d05e.
- Immutable reference to original source: backup/original-pixelnet-2026-10-27.
- Improved candidate: work/container-fixes-2026-10-27, currently draft PR #1.
- Existing production Firebase RTDB: public read endpoints work; real authenticated scoreboard writes NOT deployed or end-to-end proven.
- No one may treat passing mock browser tests or local emulator rules as authorization to publish a new leaderboard.
- Do not force-push a rollback, overwrite the backup ref, or remove historical scores.

## Preflight gates (all required before promoting draft PR)
1. Record current main SHA, draft PR head SHA and merge strategy. Save the old rules JSON through authorized Firebase admin access; record Firebase project ID and rules version privately (not in Git).
2. Run final all-games / wrapper / PWA / read-only CI at identical source SHA. Run the Firebase RTDB emulator rules tests at that same SHA.
3. Configure Firebase Anonymous Auth and public Web API key with owner authorization. Rules should remain authenticated, create-only and validated. Never use publicly writable TEST mode.
4. On a controlled preview, complete a REAL game to its natural game-over, verify exactly one authenticated score write, then independently fetch the expected record on a clean browser. Verify unauthorized, malformed, overwrite and delete attempts are refused. Label and remove QA record with administrator permission.
5. Have at least a short human iOS Safari, Android Chrome and desktop play session. Verify title, touch, scoring, restart and PWA refresh. Document device, outcome and deviations.
6. Only after all previous gates pass, approve and merge PR #1. Confirm Pages deploy commit matches the planned revision and that user-visible routes, game assets and leaderboard reads are healthy.

## Detect regression
- GitHub Actions -> PIXEL-NET live production read-only audit. It checks 19 public catalog routes/thumbnails, core pages and selected leaderboard GET endpoints; after merge a daily cron can run on main.
- Check GitHub Pages deployment status, PWA/sw.js update, real-device game-over result, global ranking readback, browser console and Firebase auth/rules errors.
- Monitor client-side pending queue and production Firebase usage separately. Automated synthetic tests intentionally do NOT write fake production scores.

## Roll back web release (no data deletion)
1. Pause further PR merges and capture first failing URL, console error, Actions run and current main SHA.
2. If a standard merge commit was used: prepare a pull request reverting it (e.g. git revert -m 1 MERGE_SHA). If a squash or rebase merge was used, revert the actual resulting commit(s), not a guessed SHA. Review the generated diff.
3. Do NOT force-reset main. Merge the tested rollback PR after reviewing collateral changes; verify Pages redeploy and the 19 original routes, thumbnails and read-only boards.
4. The original main f74b2ff... and backup branch provide a reference for restoring frontend files, but do not blindly reset unrelated commits made after release.
5. If a broken service worker persists on client devices, publish a correctly versioned worker update to evict the bad cache and follow the device update flow; do not instruct indiscriminate clearing of players' unsent score data.

## Roll back Firebase rules only with authorized project access
1. Compare current published rules with the privately saved known-good JSON, preserve any legitimate later security changes, and deploy an approved restrictive ruleset.
2. Default to refusing new public score writes, not .write=true. Avoid schema migrations or destructive deletions without backed-up DB data and user approval.
3. Verify read-only historical rankings, anonymous/unauthorized write denial and authentication state after any rules rollback.
4. If game frontend and RTDB schemas diverge, roll back compatible frontend code first and treat queued scores as pending/local; do not fabricate a successful upload.

## Post-release / post-rollback evidence
Log timestamp, operator, old/new main SHAs, old/new rules version, relevant Actions URL, live GET results, 19 routes, 1 genuine labeled write and independent readback (only when authorized), denied-update check, device tests, observed errors, and final decision.

This runbook closes a documentation gap only. A real rollback rehearsal and owner-accessible Firebase snapshot are still OPEN acceptance criteria for R63.
