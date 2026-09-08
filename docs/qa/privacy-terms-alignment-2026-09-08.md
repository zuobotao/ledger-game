# Privacy and Terms Alignment QA — 2026-09-08

## Scope

This check covers the privacy policy, terms, disclaimer, footer, and the local save / multiplayer room boundary.

## Expected product behavior

- Single-player saves and history stay in the browser (`localStorage` / `IndexedDB`).
- Multiplayer rooms send the entered nickname and room state to the room service for connection and synchronization.
- The product currently has no account feature.
- The product does not promise cloud history, cross-device sync, or long-term multiplayer history retention.

## Verification

- Static copy test: `npm test -- --run test/unit/privacy-copy.spec.ts` — passed (2 tests).
- Type check: `npm run type-check` — passed.
- `git diff --check` — passed.

The static test checks each user-facing legal surface for the local / multiplayer wording and rejects the previous absolute claim that all game data never leaves the device.

