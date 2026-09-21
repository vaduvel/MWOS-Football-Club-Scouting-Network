# Scout retest: four targeted fixes

Date: 2026-09-21. Target: the four findings from the September 20 Scout retest.

## Changes

1. **R1 — edits during save:** a per-editor coordinator serializes saves and only marks the latest acknowledged snapshot clean. Typing during a request or draft cleanup triggers another save. Failed requests retain newer typing; navigation flushes the latest browser backup immediately. Initial save preserves the selected step.
2. **R2 — draft ownership:** match drafts use versioned account/report-scoped keys and validated envelopes. Online recovery checks server access first. Ordered writes wait for transaction commit; conditional deletion preserves newer drafts. Legacy unowned drafts are not restored across accounts. Saved server reports are unchanged.
3. **R3 — incompatible score scales:** Player Hub averages only the eight scouting attributes (1–5); team-sheet match rating (1–10) remains a separate field.
4. **R4 — PDF scores:** match PDFs include all eight labelled /5 attributes. Each score block stays with the player's name, and long notes paginate without clipping.

## Verification before release

- `npm run verify`: 47 test files, 270 tests passed; migration/security/role checks, TypeScript and production build passed.
- New regressions cover concurrent saves, failure/retry, route/account deactivation, draft scope validation and IndexedDB commit/cleanup ordering, actual Player Hub data aggregation, and searchable PDF text/page geometry.
- Manual browser test as QA Scout against the local patched frontend and the existing synthetic report: edit A, save, type B while saving, reload → B retained.
- Immediate navigation after typing C, reopen → C recovered and subsequently saved.
- Player Hub: QA Home Player Retest displays average 3.3 and separate rating 7.0. The unreviewed away player is not tracked.
- PDF downloaded through the export UI contains Pace 5/5 and the other seven attributes 3/5.
- No warning/error console entries in the tested local browser flow.

## Scope and limitations

This is targeted regression verification, not a claim that every feature or role was manually retested. Cross-account draft isolation is covered by deterministic tests and source review, not a fresh two-account manual browser run. Live production confirmation must follow the deployment; a local pass alone is not production evidence.

Existing synthetic QA reports are retained. No real player records, accounts, permissions or database migrations were changed by these fixes.
