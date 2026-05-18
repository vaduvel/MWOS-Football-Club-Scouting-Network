# Club Management Finalization Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this roadmap slice-by-slice. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry the MWOS Club Management app from feature-complete branch work to a launch-ready, admin-operable product with clear deployment, onboarding and QA paths.

**Architecture:** Treat the remaining work as final-mile productization, not greenfield feature work. Prioritize operational readiness, production-safe defaults, cleanup tooling, and one final full QA/deploy pass over adding speculative surface area.

**Tech Stack:** React, TypeScript, Vite, Supabase Auth/Postgres, Netlify Functions, Vitest, Netlify deploys

---

## Working assumptions

- The app is already feature-rich across training, transport, scouting, oversight, notifications and staff onboarding.
- The branch `feat/club-management` is the working release branch until final merge.
- The remaining work should optimize for safe real-world use by club staff, not more conceptual scope.

## Slice 8: Launch Readiness Center

**Purpose:** Give admins one place to see whether the app is ready to use broadly, including public URL, onboarding delivery mode, team import status and Admin AI readiness.

- [x] Build a launch-readiness domain model with test coverage.
- [x] Surface a launch-readiness verdict in `Settings`.
- [x] Add any small UI polish found during review.
- [x] Re-verify with `npm test`, `npm run lint`, `npm run build`.

## Slice 9: Production Operations & Cleanup

**Purpose:** Reduce support burden by giving admins safe ways to manage stale onboarding records and clean test residue before live rollout.

- [x] Add a lightweight admin cleanup/maintenance plan.
- [x] Add safe visibility for stale pending invites and test-only accounts/data.
- [x] Expose non-destructive actions first; keep destructive cleanup deliberate and explicit.
- [x] Add tests for any new domain logic.
- [x] Re-verify with `npm test`, `npm run lint`, `npm run build`.

## Slice 10: Final Deploy Readiness

**Purpose:** Make the branch easy to move into production once final QA is done.

- [x] Confirm Netlify branch preview matches `feat/club-management`.
- [x] Confirm Supabase Auth URL config matches production/public URLs.
- [x] Confirm email sender mode:
  - manual-link fallback is acceptable now
  - Resend domain flow remains documented for later
- [x] Confirm key runtime statuses from inside the app:
  - Invite & Alert Delivery
  - Admin AI
  - Team import provider
  - Public app URL
  - Deployment Runtime / branch-vs-public-link alignment

## Slice 11: Final QA Pass

**Purpose:** Run one last human-oriented pass over the app using the real production-like branch build.

- [ ] Auth
  - login
  - reset password
  - accept invite
- [ ] Staff admin
  - invite by email
  - invite by share link
  - WhatsApp share
  - role/team assignment
- [ ] Training
  - create
  - publish
  - comment
  - reminder settings
- [ ] Transport
  - create
  - update status
  - comment
- [ ] Scouting
  - create report
  - team sheets
  - formations
  - player reviews
  - export
- [ ] Oversight
  - leadership summaries
  - intervention shortcuts
- [ ] Role views
  - admin
  - technical director
  - board observer
  - coach
  - driver
  - scout

### Progress notes

- `2026-05-17`: runtime/deploy status is now surfaced inside `Settings`, not just inferred from env vars.
- `2026-05-17`: added `npm run smoke:roles` to verify the six supported QA role accounts against expected home/leadership modes and module exposure.
- `2026-05-17`: `npm run smoke:release -- <admin-email> <password>` now includes runtime URL status in the output snapshot.
- `2026-05-18`: created a stable Netlify preview alias at `https://club-management-preview--scout-report-builder.netlify.app` and added `/accept-invite` + `/reset-password` redirect URLs for that branch preview in Supabase Auth config.
- `2026-05-18`: invite, resend and manual-link flows are now request-aware, so branch preview actions can generate preview-safe onboarding URLs instead of always falling back to the production app URL.

## Slice 12: Release & Post-Launch Hygiene

**Purpose:** Move from feature branch to production with minimal ambiguity.

- [ ] Update any plan/spec docs that still look incomplete after implementation.
- [ ] Clean branch test data where safe:
  - stale invites
  - test users
  - test activity records
- [ ] Merge branch into `main` only after preview QA is clean.
- [ ] Redeploy production and rerun the short smoke test.
- [ ] Rotate sensitive tokens that were exposed during development.

## Commands to keep green

- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run build`

## Self-prompts for autonomous execution

Use these prompts internally when resuming work without the user present:

1. `What remaining work increases live usability more than it increases scope?`
2. `Can this next change be verified locally and with existing tests before touching deploy config?`
3. `Does this improve the admin's ability to operate the club without SQL, shell access or us?`
4. `If a setting is missing, does the UI explain the fallback instead of failing opaquely?`
5. `Before claiming a slice is done, have test, lint and build all passed again?`
