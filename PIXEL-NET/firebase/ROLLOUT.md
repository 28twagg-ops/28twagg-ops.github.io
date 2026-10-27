# PIXEL-NET — authenticated anonymous leaderboard rollout (NOT DEPLOYED)
Date: 2026-10-27

The live read-only rule is currently the safe production state. **Do not publish the candidate rules below until authentication is wired and tested.**

## Recommended architecture
- No signup screen for players: Firebase Authentication anonymous sign-in.
- Public leaderboard GET access under `/lb` only.
- Authenticated, create-only leaderboard entries; existing scores cannot be edited or deleted by ordinary clients.
- Validate initials, integer score bounds, timestamp, and mode in Firebase rules.
- App Check, abuse monitoring, score plausibility and rate limiting require additional infrastructure. **Anonymous auth does not prove a score was legitimately earned.** Firebase Realtime Database rules alone cannot securely enforce score authenticity or per-user rate limits.
- A server-side verified-score endpoint is recommended for an actually tamper-resistant public leaderboard. Do not mistake anonymous auth for anti-cheat.

## Setup required in Firebase Console
1. Authentication → Sign-in method → enable **Anonymous**.
2. Project settings → General → Web app → retrieve the Firebase **Web API key** (public client configuration, not a service account secret). Never share private service account JSON.
3. Test anonymous sign-in using `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=API_KEY` with `{"returnSecureToken":true}` on a test project. The returned `idToken` is a user credential: never commit it.
4. Update the wrapper to use anonymous sign-in and submit `POST /lb/slug.json?auth=ID_TOKEN` (or Firebase SDK) with automatic token refresh. No changes to production are authorized by this document.
5. Validate the rule syntax and test read, authorized create, unauthenticated write denial, overwrites, malformed values, and abuse before publishing.
6. Only then deploy the development branch after approval, keeping `main` and backup untouched.

## Security caveat
A browser client can always forge a score. For genuine anti-cheat and rate limiting, deploy a trusted server-side score endpoint and verify gameplay events or apply appropriate abuse controls. The rules candidate is **interim protection against casual anonymous writes and record modification**, not cheat prevention.

## Production status
Global reads restored on 2026-10-27 (HTTP 200). Global writes remain disabled. This is deliberate.
