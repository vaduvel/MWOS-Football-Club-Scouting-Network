# Staff Accounts Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Invite Staff resilient when email delivery is unavailable, skipped, or delayed, while keeping admin onboarding self-service.

**Architecture:** Keep the invitation tables and role model unchanged, extend the serverless invite functions to return structured delivery outcomes and fresh action links, then expose those states in the admin UI and invitation acceptance flow.

**Tech Stack:** React, TypeScript, Netlify Functions, Supabase Auth/Admin, Vitest, Vite

---

### Task 1: Add delivery-domain helpers and tests

**Files:**
- Modify: `src/lib/inviteDomain.ts`
- Modify: `src/lib/inviteDomain.test.ts`

- [ ] Add delivery outcome types and presentation helpers.
- [ ] Add tests for sent/skipped/failed invite outcomes.

### Task 2: Harden invite-related functions

**Files:**
- Modify: `netlify/functions/_staff-invitations.js`
- Modify: `netlify/functions/invite-staff.js`
- Modify: `netlify/functions/resend-staff-invite.js`
- Create: `netlify/functions/issue-staff-invite-link.js`

- [ ] Return structured delivery results instead of failing the whole admin action on email-provider issues.
- [ ] Return activation links for new-user fallback.
- [ ] Add a dedicated function for copying a fresh activation link from a pending invite.

### Task 3: Wire new responses into the client data layer

**Files:**
- Modify: `src/lib/data.ts`

- [ ] Add typed response models for invite delivery.
- [ ] Add a client call for issuing a fresh activation link.

### Task 4: Upgrade Settings UI

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] Show delivery outcome clearly after sending/resending invites.
- [ ] Show a copyable activation-link fallback when needed.
- [ ] Add `Copy activation link` action to pending invites.

### Task 5: Improve Accept Invitation state messaging

**Files:**
- Modify: `src/pages/AcceptInvitation.tsx`

- [ ] Make pending, accepted, cancelled, expired, and invalid-session states clearer and more reassuring.

### Task 6: Verify

**Files:**
- Modify: `scripts/.tmp-invite-staff-smoke.mjs`

- [ ] Run tests, lint, build.
- [ ] Run a live invite smoke and verify fallback output is usable when email delivery is skipped or fails.
