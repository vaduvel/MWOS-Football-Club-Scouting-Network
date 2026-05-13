# Invite Staff / Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins invite staff from the app, pre-assign roles and teams, handle both existing and new emails, and let new users activate access by email without SQL.

**Architecture:** Keep staff access management centered in `Settings > Club Access`, add invitation persistence in Supabase, and move all sensitive invitation/auth writes into Netlify functions that use the service role. Reuse the existing auth-completion pattern so invite acceptance feels like the current reset-password flow rather than a separate auth system.

**Tech Stack:** React, TypeScript, Vite, Supabase Auth + Postgres + RLS, Netlify Functions, Resend email infrastructure, Vitest.

---

## File Structure

- `supabase/schema.sql`
  Adds invitation tables, helper functions, indexes, and RLS for admin-only invite management plus invite self-resolution.
- `src/lib/inviteDomain.ts`
  Pure helpers for invite validation, team requirements by role, status display, and additive access resolution.
- `src/lib/inviteDomain.test.ts`
  TDD coverage for invite validation and normalization rules.
- `src/lib/data.ts`
  Frontend data access for fetching invitations and calling invite/resend/cancel/accept endpoints.
- `src/pages/SettingsPage.tsx`
  Admin UI for `Invite Staff`, `Pending Invitations`, and existing access controls.
- `src/pages/AcceptInvitation.tsx`
  New route for invite acceptance, password setup, and success/error handling.
- `src/App.tsx`
  Route registration for `/accept-invite`.
- `netlify/functions/_shared.js`
  Reuse auth extraction helpers if needed by invitation functions.
- `netlify/functions/_notification-core.js`
  Reuse email sending helper for invitation emails where practical.
- `netlify/functions/invite-staff.js`
  Create invitation, handle existing users immediately, and send email.
- `netlify/functions/resend-staff-invite.js`
  Resend pending invitations.
- `netlify/functions/cancel-staff-invite.js`
  Cancel pending invitations.
- `netlify/functions/accept-staff-invite.js`
  Complete invitation acceptance after user reaches the app and sets password.
- `scripts/.tmp-invite-staff-smoke.mjs`
  Live smoke test for admin invite, resend, cancel, existing-user attach, and cleanup.

### Task 1: Build the invitation schema and access rules

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/supabase/schema.sql`
- Test via: Supabase SQL Editor and live smoke script later

- [ ] **Step 1: Add invitation tables and indexes**

Add these structures near the other club-management tables:

```sql
create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null,
  full_name text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled', 'expired', 'applied_existing')),
  invitation_token text not null unique,
  inviter_user_id uuid not null references auth.users (id) on delete cascade,
  resolved_user_id uuid references auth.users (id) on delete set null,
  message_type text not null default 'invite' check (message_type in ('invite', 'existing_access_update')),
  last_sent_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff_invitation_roles (
  invitation_id uuid not null references public.staff_invitations (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  primary key (invitation_id, role_id)
);

create table if not exists public.staff_invitation_teams (
  invitation_id uuid not null references public.staff_invitations (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  primary key (invitation_id, team_id)
);

create index if not exists staff_invitations_email_normalized_idx on public.staff_invitations (email_normalized);
create index if not exists staff_invitations_status_idx on public.staff_invitations (status);
create index if not exists staff_invitations_inviter_idx on public.staff_invitations (inviter_user_id);
```

- [ ] **Step 2: Add helper functions for invite visibility and team-scoped validation**

Add SQL helpers:

```sql
create or replace function public.can_manage_staff_access()
returns boolean
language sql
stable
as $$
  select public.has_role('admin');
$$;

create or replace function public.role_requires_team(role_slug text)
returns boolean
language sql
stable
as $$
  select role_slug in ('coach', 'driver', 'scout');
$$;
```

- [ ] **Step 3: Enable RLS and admin policies**

Add policies:

```sql
alter table public.staff_invitations enable row level security;
alter table public.staff_invitation_roles enable row level security;
alter table public.staff_invitation_teams enable row level security;

create policy "staff_invitations_select_admin"
on public.staff_invitations
for select
using (public.can_manage_staff_access());

create policy "staff_invitations_mutate_admin"
on public.staff_invitations
for all
using (public.can_manage_staff_access())
with check (public.can_manage_staff_access());
```

Mirror equivalent admin-only policies for `staff_invitation_roles` and `staff_invitation_teams`.

- [ ] **Step 4: Add timestamp maintenance**

If the repo already uses manual `updated_at` writes, keep consistency; otherwise add a trigger or ensure server functions update `updated_at` on every mutation.

- [ ] **Step 5: Verify schema applies**

Run the full schema in Supabase SQL Editor.

Expected:
- `staff_invitations`
- `staff_invitation_roles`
- `staff_invitation_teams`

all exist with no SQL errors.

- [ ] **Step 6: Commit schema foundation**

```bash
git add supabase/schema.sql
git commit -m "feat: add staff invitation schema"
```

### Task 2: Add pure invitation domain rules with TDD

**Files:**
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/inviteDomain.ts`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/inviteDomain.test.ts`

- [ ] **Step 1: Write failing tests for invite validation**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeInviteEmail, validateInviteInput, roleRequiresTeam } from './inviteDomain';

describe('normalizeInviteEmail', () => {
  it('trims and lowercases invite emails', () => {
    expect(normalizeInviteEmail('  Coach@One.COM ')).toBe('coach@one.com');
  });
});

describe('validateInviteInput', () => {
  it('requires at least one role', () => {
    expect(() =>
      validateInviteInput({ fullName: 'Coach One', email: 'coach@one.com', roleSlugs: [], teamIds: [] }),
    ).toThrow(/at least one role/i);
  });

  it('requires teams for coach invitations', () => {
    expect(() =>
      validateInviteInput({ fullName: 'Coach One', email: 'coach@one.com', roleSlugs: ['coach'], teamIds: [] }),
    ).toThrow(/team/i);
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -- src/lib/inviteDomain.test.ts
```

Expected: fail because file/functions do not exist yet.

- [ ] **Step 3: Implement minimal invite domain helpers**

```ts
export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function roleRequiresTeam(roleSlug: string) {
  return ['coach', 'driver', 'scout'].includes(roleSlug);
}

export function validateInviteInput(input: {
  fullName: string;
  email: string;
  roleSlugs: string[];
  teamIds: string[];
}) {
  if (!input.fullName.trim()) throw new Error('Full name is required.');
  if (!normalizeInviteEmail(input.email)) throw new Error('Email is required.');
  if (input.roleSlugs.length === 0) throw new Error('Select at least one role.');
  if (input.roleSlugs.some(roleRequiresTeam) && input.teamIds.length === 0) {
    throw new Error('Select at least one team for team-scoped staff.');
  }
}
```

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```bash
npm test -- src/lib/inviteDomain.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit pure invite rules**

```bash
git add src/lib/inviteDomain.ts src/lib/inviteDomain.test.ts
git commit -m "feat: add invitation domain rules"
```

### Task 3: Build server-side invitation functions

**Files:**
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify/functions/invite-staff.js`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify/functions/resend-staff-invite.js`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify/functions/cancel-staff-invite.js`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify/functions/accept-staff-invite.js`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify/functions/_shared.js`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify/functions/_notification-core.js`

- [ ] **Step 1: Write the expected server contract in tests or smoke helpers**

Create a smoke-oriented expectation in `scripts/.tmp-invite-staff-smoke.mjs`:

```js
// expected flow:
// 1. invite-staff creates pending invite for new email
// 2. resend-staff-invite updates last_sent_at
// 3. cancel-staff-invite marks status cancelled
// 4. invite-staff on existing email applies roles/teams immediately
```

- [ ] **Step 2: Implement admin-only auth guard helper**

Add helper in `_shared.js` to extract Bearer token and verify admin role using the regular Supabase client plus service-role client when needed.

```js
export async function requireAdminUser(event) {
  const token = event.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing Authorization header.');
  // verify current user and roles
}
```

- [ ] **Step 3: Implement `invite-staff.js`**

Required flow:

```js
// pseudo-flow
// - validate admin
// - normalize email and payload
// - if auth user/profile exists for email:
//   - upsert user_roles
//   - upsert user_team_assignments
//   - insert staff_invitations row with status 'applied_existing'
//   - send access-updated email
// - else:
//   - create staff_invitations row with token
//   - add invitation roles and teams
//   - call supabase auth admin generateLink or invite flow for signup path
//   - send custom invite email with /accept-invite link
```

Use official Supabase admin invite/generate-link capability as the source for the auth action link. This is based on Supabase Auth Admin invite/generate-link docs.

- [ ] **Step 4: Implement resend and cancel functions**

`resend-staff-invite.js`:
- only works for `pending`
- refreshes `last_sent_at`
- sends the same invite email again

`cancel-staff-invite.js`:
- only works for `pending`
- marks `cancelled`
- stores `cancelled_at`

- [ ] **Step 5: Implement `accept-staff-invite.js`**

Required flow:
- verify current authenticated user from session token
- fetch pending invitation by token or email
- ensure invitation is valid and not expired/cancelled
- upsert selected `user_roles`
- upsert selected `user_team_assignments`
- mark invitation `accepted`

- [ ] **Step 6: Run targeted verification**

Run:

```bash
npm run lint
```

Expected: no TypeScript or JS import issues introduced by new function files.

- [ ] **Step 7: Commit function layer**

```bash
git add netlify/functions/invite-staff.js netlify/functions/resend-staff-invite.js netlify/functions/cancel-staff-invite.js netlify/functions/accept-staff-invite.js netlify/functions/_shared.js netlify/functions/_notification-core.js
git commit -m "feat: add staff invitation server functions"
```

### Task 4: Extend frontend data access and routing

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/data.ts`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/App.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/AcceptInvitation.tsx`

- [ ] **Step 1: Add failing smoke expectations for data methods**

Plan to add methods:

```ts
export async function fetchStaffInvitations() {}
export async function createStaffInvitation(input: StaffInvitationInput) {}
export async function resendStaffInvitation(invitationId: string) {}
export async function cancelStaffInvitation(invitationId: string) {}
export async function acceptStaffInvitation(input: { invitationToken: string; password: string }) {}
```

- [ ] **Step 2: Implement typed data methods**

In `data.ts`, add types:

```ts
export interface StaffInvitationRecord {
  id: string;
  email: string;
  fullName: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired' | 'applied_existing';
  roles: AppRole[];
  teams: AppTeam[];
  createdAt: string;
  expiresAt: string;
  inviterName: string;
}
```

Then implement fetch and mutation calls against the Netlify functions with the current session token.

- [ ] **Step 3: Add `/accept-invite` route**

In `App.tsx` add:

```tsx
<Route path="/accept-invite" element={<AcceptInvitation />} />
```

- [ ] **Step 4: Build `AcceptInvitation.tsx`**

Required behavior:
- read token from query string
- show invitation summary
- require password + confirm password
- call `acceptStaffInvitation`
- on success navigate to `/login?invite=success`

- [ ] **Step 5: Run verification**

Run:

```bash
npm test
npm run lint
```

Expected: all green.

- [ ] **Step 6: Commit frontend invite data + route**

```bash
git add src/lib/data.ts src/App.tsx src/pages/AcceptInvitation.tsx
git commit -m "feat: add invitation data access and accept route"
```

### Task 5: Implement admin UI in Settings

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add failing UI expectation mentally and in local verification checklist**

The page must support:
- send invite
- list pending invites
- resend invite
- cancel invite

- [ ] **Step 2: Add `Invite Staff` form state**

Add state for:

```ts
const [inviteName, setInviteName] = useState('');
const [inviteEmail, setInviteEmail] = useState('');
const [inviteRoleSlugs, setInviteRoleSlugs] = useState<string[]>([]);
const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
```

- [ ] **Step 3: Add `Pending Invitations` query and actions**

Load invitations alongside club access:

```ts
const [staffInvitations, setStaffInvitations] = useState<StaffInvitationRecord[]>([]);
```

Refresh invitation list after:
- create
- resend
- cancel

- [ ] **Step 4: Render admin sections**

Add three clear admin blocks:
- `Invite Staff`
- `Pending Invitations`
- existing `Club Access`

Existing access editor must remain intact.

- [ ] **Step 5: Verify locally**

Run:

```bash
npm run lint
npm run build
```

Expected: green build and no TS errors.

- [ ] **Step 6: Commit settings UI**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat: add staff invitation admin ui"
```

### Task 6: End-to-end verification and smoke test

**Files:**
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/scripts/.tmp-invite-staff-smoke.mjs`

- [ ] **Step 1: Add smoke script for existing-user path**

Script should:
- sign in as admin
- call invite endpoint for an existing email
- verify roles/teams were assigned
- verify invitation row stored as `applied_existing`
- cleanup invitation row if safe

- [ ] **Step 2: Add smoke script for pending-invite path**

Script should:
- invite a fresh test email
- verify `pending` row exists
- verify resend works
- verify cancel works

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
node scripts/.tmp-invite-staff-smoke.mjs
```

Expected:
- tests pass
- lint passes
- build passes
- live invite flow succeeds for both existing and new email cases

- [ ] **Step 4: Commit verification helpers**

```bash
git add scripts/.tmp-invite-staff-smoke.mjs
git commit -m "test: add invite staff smoke coverage"
```

## Self-Review

- Spec coverage: covers admin UI, pending list, resend/cancel, new-user onboarding, existing-user additive updates, server-side auth writes, and verification.
- Placeholder scan: no `TBD` or open implementation holes remain in the plan steps.
- Type consistency: invitation types, status values, and route names are aligned with the approved spec.

