# Club Management Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current scouting-first app into a role-aware Club Management foundation with multi-role users, team assignments, new club-wide navigation, and a production-safe migration path that preserves the existing scouting workflows.

**Architecture:** Extend Supabase with role and team tables, migrate existing users into the new access model, then refactor auth/bootstrap to load roles and team assignments. Build a new club-wide shell with role-aware home and module entry pages while preserving scouting under a dedicated route namespace and redirects.

**Tech Stack:** React, TypeScript, Vite, Zustand, Supabase Auth, Supabase Postgres, Tailwind utility classes, Netlify runtime.

---

### Task 1: Add the Club Management access model to Supabase

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/supabase/schema.sql`

- [ ] **Step 1: Add `roles`, `teams`, `user_roles`, and `user_team_assignments` tables**

Add schema blocks for:

```sql
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  age_group text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role_id)
);

create table if not exists public.user_team_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, team_id)
);
```

- [ ] **Step 2: Seed canonical roles and teams**

Add idempotent seed inserts for:

```sql
insert into public.roles (slug, label, description)
values
  ('admin', 'Admin', 'Full club-wide access'),
  ('technical_director', 'Technical Director', 'Club-wide read and comment access'),
  ('coach', 'Coach', 'Team-specific training access'),
  ('driver', 'Driver', 'Transport-focused access'),
  ('scout', 'Scout', 'Scouting access'),
  ('board_observer', 'Board Observer', 'Read-only oversight access')
on conflict (slug) do update
set
  label = excluded.label,
  description = excluded.description;

insert into public.teams (slug, name, age_group, is_active, sort_order)
values
  ('u13', 'U13', 'U13', true, 10),
  ('u15', 'U15', 'U15', true, 20),
  ('u17', 'U17', 'U17', true, 30),
  ('u19', 'U19', 'U19', true, 40),
  ('first-team', 'First Team', 'Senior', true, 50),
  ('u11', 'U11', 'U11', false, 60),
  ('u9', 'U9', 'U9', false, 70)
on conflict (slug) do update
set
  name = excluded.name,
  age_group = excluded.age_group,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;
```

- [ ] **Step 3: Add helper functions for role and team checks**

Add `public.has_role`, `public.has_any_role`, and `public.belongs_to_team`:

```sql
create or replace function public.has_role(target_slug text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.slug = target_slug
  );
$$;

create or replace function public.has_any_role(target_slugs text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.slug = any (target_slugs)
  );
$$;

create or replace function public.belongs_to_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_team_assignments uta
    where uta.user_id = auth.uid()
      and uta.team_id = target_team_id
  );
$$;
```

- [ ] **Step 4: Migrate current single-role users into `user_roles`**

Add an idempotent migration query:

```sql
insert into public.user_roles (user_id, role_id)
select
  p.id,
  r.id
from public.profiles p
join public.roles r
  on r.slug = case
    when lower(p.role) = 'admin' then 'admin'
    else 'scout'
  end
on conflict (user_id, role_id) do nothing;
```

- [ ] **Step 5: Update `handle_new_user` and admin helper behavior**

Change new user behavior so public sign-ups default to `Pending` in `profiles.role`, while the real access comes from `user_roles`:

```sql
role = coalesce(excluded.role, 'Pending')
```

and update `public.is_admin()` to also trust `user_roles`:

```sql
select exists (
  select 1
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid()
    and r.slug = 'admin'
)
or exists (
  select 1
  from public.profiles
  where id = auth.uid()
    and lower(role) = 'admin'
);
```

- [ ] **Step 6: Add RLS for the new access tables**

Allow:
- users to read their own roles and team assignments
- admins and technical directors to read club-wide role/team assignment data
- admins to insert/update/delete `user_roles` and `user_team_assignments`

Run after editing: `npm run lint`
Expected: PASS

- [ ] **Step 7: Commit database work**

```bash
git add supabase/schema.sql
git commit -m "feat: add club management access model"
```

### Task 2: Extend the application auth model

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/data.ts`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/store/auth.ts`

- [ ] **Step 1: Expand the `AppUser` type**

Replace the single-role app user shape with:

```ts
export interface AppRole {
  slug: string;
  label: string;
}

export interface AppTeam {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: string;
  roles: string[];
  roleLabels: string[];
  teams: AppTeam[];
}
```

- [ ] **Step 2: Load roles and teams during session bootstrap**

In the profile/session loader, fetch:
- `profiles`
- `user_roles -> roles`
- `user_team_assignments -> teams`

and map them into `AppUser`.

- [ ] **Step 3: Add role helpers in the auth store**

Add computed helpers:

```ts
hasRole: (role: string) => boolean;
hasAnyRole: (roles: string[]) => boolean;
```

and implement them against `user.roles`.

- [ ] **Step 4: Make sign-up create a neutral access request**

Remove privilege-oriented role creation during sign-up. Keep:
- full name
- organization
- email
- password

and let new sign-ups enter with no active `user_roles`.

- [ ] **Step 5: Commit auth model changes**

```bash
git add src/lib/data.ts src/store/auth.ts
git commit -m "feat: extend auth model with roles and teams"
```

### Task 3: Rebrand login and account request flow

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/Login.tsx`

- [ ] **Step 1: Replace scouting-only framing with club-wide framing**

Change visible product copy to:
- subtitle: `Club Management`
- main message: `One workspace for the whole MWOS staff.`
- body text about training, transport, scouting, and alignment

- [ ] **Step 2: Replace the old account-type chooser with club-wide cards**

Use four cards:
- Training Schedule
- Transport Plans
- Scouting Reports
- Admin Oversight

These are informational cards, not privilege buttons.

- [ ] **Step 3: Change sign-up copy into access-request copy**

Examples:
- button: `Request Access`
- toggle text: `Need club access? Request an account`
- success text: `Account request created. An admin can grant your club roles after sign-in is enabled.`

- [ ] **Step 4: Keep forgot password intact**

Do not remove the current recovery flow.

- [ ] **Step 5: Run lint and commit**

Run: `npm run lint`
Expected: PASS

```bash
git add src/pages/Login.tsx
git commit -m "feat: rebrand login for club management"
```

### Task 4: Add the club-wide route shell

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/App.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/ClubHomePage.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/TrainingPage.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/TransportPage.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/OversightPage.tsx`

- [ ] **Step 1: Introduce new top-level routes**

Add:
- `/`
- `/training`
- `/transport`
- `/scouting`
- `/oversight`

and redirect old routes:
- `/report/new` -> `/scouting/report/new`
- `/report/:id` -> `/scouting/report/:id`

- [ ] **Step 2: Keep the existing report editor alive under `/scouting`**

Mount:
- `/scouting/report/new`
- `/scouting/report/:id`

with the same `ReportEditor`.

- [ ] **Step 3: Build `ClubHomePage` as the new landing page**

The page should show:
- role-aware welcome
- assigned teams
- relevant module cards for the current user
- counts based on roles, teams, and scouting reports where available

- [ ] **Step 4: Build real module entry pages**

Each new page should be a real shell:
- permissions enforced
- assigned teams shown
- module purpose and next action shown
- no fake data tables

Training page:
- visible for admin, technical_director, coach

Transport page:
- visible for admin, technical_director, driver

Oversight page:
- visible for admin, technical_director, board_observer

- [ ] **Step 5: Commit route shell work**

```bash
git add src/App.tsx src/pages/ClubHomePage.tsx src/pages/TrainingPage.tsx src/pages/TransportPage.tsx src/pages/OversightPage.tsx
git commit -m "feat: add club management route shell"
```

### Task 5: Make navigation role-aware

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/components/AppSidebar.tsx`

- [ ] **Step 1: Replace the scouting-only sidebar contract**

Update props so the sidebar accepts:

```ts
current:
  | 'home'
  | 'training'
  | 'transport'
  | 'scouting'
  | 'players'
  | 'oversight'
  | 'settings';
```

and uses `user.roles` rather than a single `isAdmin` boolean.

- [ ] **Step 2: Render only allowed module items**

Visibility rules:
- Home: all authenticated users
- Training: admin, technical_director, coach
- Transport: admin, technical_director, driver
- Scouting: admin, technical_director, coach, scout
- Player Hub: admin, technical_director, coach, scout
- Oversight: admin, technical_director, board_observer
- Settings: all authenticated users

- [ ] **Step 3: Update labels**

Desktop title should shift from `Scouting Network` / `Admin Console` to a consistent `Club Management` framing.

- [ ] **Step 4: Update mobile bottom nav**

Keep it compact. No dead items. Prioritize:
- Home
- Scouting or Training depending on role
- Players or Transport depending on role
- Settings
- Account

- [ ] **Step 5: Commit sidebar changes**

```bash
git add src/components/AppSidebar.tsx
git commit -m "feat: make navigation role-aware"
```

### Task 6: Convert the current dashboard into the scouting module page

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/Dashboard.tsx`

- [ ] **Step 1: Reframe the page as the scouting module**

Change titles and copy so the page represents `Scouting Reports`, not the whole app landing page.

- [ ] **Step 2: Update navigation usage**

Point sidebar navigation to:
- home: `/`
- scouting: `/scouting`
- players: `/players`
- settings: `/settings`

- [ ] **Step 3: Keep admin scouting analytics inside this page**

The existing admin scouting insights stay here because they belong to the scouting module.

- [ ] **Step 4: Commit scouting page refactor**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: separate scouting page from club home"
```

### Task 7: Add an admin club access manager in Settings

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/SettingsPage.tsx`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/data.ts`

- [ ] **Step 1: Add data accessors for roles, teams, and member assignments**

Implement:
- fetch club roles
- fetch teams
- fetch member assignment list
- save member roles
- save member teams

Only admins should be able to change assignments.

- [ ] **Step 2: Add an admin-only Club Access section in Settings**

Show:
- member list
- current roles
- current team assignments
- multi-select controls or grouped toggles for roles and teams

This is the operational control point that makes the new model usable, not just theoretical.

- [ ] **Step 3: Preserve non-admin settings**

The football API configuration still stays available.

- [ ] **Step 4: Commit club access management**

```bash
git add src/pages/SettingsPage.tsx src/lib/data.ts
git commit -m "feat: add club access management"
```

### Task 8: Verify locally and prepare public rollout

**Files:**
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/README.md`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/.env.example`

- [ ] **Step 1: Update docs for the new access model**

Document:
- role migration
- team assignment flow
- admin setup steps
- required Supabase schema rerun

- [ ] **Step 2: Run local verification**

Run:
```bash
npm run lint
npm run build
```

Expected:
- both pass

- [ ] **Step 3: Smoke-check critical app flows**

Verify:
- login still works
- password recovery still works
- scout can access scouting
- admin can access oversight and settings club access section
- old scouting report URLs redirect correctly

- [ ] **Step 4: Commit final docs and verification-ready changes**

```bash
git add README.md .env.example
git commit -m "docs: document club management foundation rollout"
```

