# Manual Invite Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class manual invite links and WhatsApp sharing so staff onboarding works without verified email delivery.

**Architecture:** Reuse the existing invitation tables and acceptance flow, extend the invite endpoints with a delivery mode, and surface delivery choice and sharing actions directly inside the admin settings UI. Keep share-copy logic centralized in invite-domain helpers so email and manual flows stay consistent.

**Tech Stack:** React, TypeScript, Netlify Functions, Supabase Auth/Admin, Vitest, Vite

---

### Task 1: Extend invite-domain helpers

**Files:**
- Modify: `src/lib/inviteDomain.ts`
- Modify: `src/lib/inviteDomain.test.ts`

- [ ] Add invite delivery mode types and labels.
- [ ] Add helpers for building admin-facing share text and WhatsApp URLs.
- [ ] Add tests for manual-link and WhatsApp share behaviors.

### Task 2: Teach invite functions about delivery mode

**Files:**
- Modify: `netlify/functions/invite-staff.js`
- Modify: `netlify/functions/resend-staff-invite.js`
- Modify: `netlify/functions/issue-staff-invite-link.js`

- [ ] Accept a delivery mode when creating invites.
- [ ] Skip email delivery intentionally for manual-link and WhatsApp-first invites.
- [ ] Return shareable link data cleanly for both new-user and existing-user paths.

### Task 3: Extend client invite API types

**Files:**
- Modify: `src/lib/data.ts`

- [ ] Add delivery mode to invite creation input.
- [ ] Return share URL/login URL metadata where needed.

### Task 4: Upgrade Settings UI into a real share workflow

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] Replace the single send button with delivery-specific actions.
- [ ] Add `Share on WhatsApp` in the invite result notice.
- [ ] Add `Share on WhatsApp` to pending invites alongside copy/resend/cancel.
- [ ] Keep the flow graceful when clipboard or navigator share is unavailable.

### Task 5: Verify end to end

**Files:**
- Modify: `scripts/.tmp-invite-staff-smoke.mjs`

- [ ] Run tests, lint, build.
- [ ] Smoke test a manual-link invite.
- [ ] Verify the returned activation link points to `/accept-invite`.
