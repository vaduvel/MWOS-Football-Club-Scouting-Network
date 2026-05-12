# Club Management Foundation Design

## Goal

Transform the current scouting-first application into a club-wide management platform foundation that supports multiple staff roles, multiple teams, role-aware navigation, and role-aware dashboards without breaking the existing scouting workflows.

This slice must be production-grade for the foundation it introduces. It is not a visual mock and it is not a placeholder shell. It is the real access model and UI shell that future training and transport modules will build on.

## Scope

This slice includes:

- multi-role accounts
- team entities and user-to-team assignments
- role-aware navigation and role-aware home/dashboard entry points
- rebranded `Club Management` login and product framing
- preservation of the current scouting module as a first-class module inside the larger product
- database and application migration path for existing users

This slice does **not** include the full operational logic for:

- training microcycle planning
- transport planning
- WhatsApp notifications
- mobile push notifications

Those become the next slices and are intentionally excluded here so the foundation remains coherent and production-safe.

## Product Positioning

The application stops presenting itself as only a scouting tool and becomes a staff workspace for MWOS Football Club.

Top-level modules visible in the application shell:

- Training Schedule
- Transport Plans
- Scouting Reports
- Admin Oversight

The product message changes from “scouting network” to “club management,” while the scouting feature set remains fully available to users who have the scout role.

## User Model

### Core Rule

Each person has one account.

That account may have one or more roles.

The application does not ask the user to choose a role during login. After authentication, the app loads the user’s roles and team assignments and decides what they can see and do.

### Roles

The foundation supports these roles:

- `admin`
- `technical_director`
- `coach`
- `driver`
- `scout`
- `board_observer`

### Teams

The foundation supports these teams:

- U13
- U15
- U17
- U19
- First Team
- U11
- U9

The initial seeded state should include the first five as active and keep U11/U9 ready to enable.

## Permission Model

### Admin

Admin has full access across all teams and modules.

Capabilities:

- manage users
- assign roles
- assign users to teams
- view all club dashboards
- access scouting reports, training schedule, and transport plans

### Technical Director

Technical Director sees all teams and can comment across club planning surfaces.

Capabilities in this slice:

- read club-wide data
- access oversight views
- comment where comments are already supported
- receive a dedicated dashboard shell

Technical Director does not need approval workflows in this slice.

### Coach

Coach access is limited to assigned teams.

Capabilities in this slice:

- see assigned teams
- land in a coach-oriented dashboard shell
- access the future Training Schedule module entry point

### Driver

Driver access is intentionally narrow.

Capabilities in this slice:

- see a driver-oriented shell
- access the future Transport Plans module entry point

### Scout

Scout keeps access to the current scouting experience.

Capabilities in this slice:

- existing report creation/editing
- player hub
- watchlist
- report comments

### Board Observer

Board Observer is read-only and high-level.

Capabilities in this slice:

- read-only overview shell
- no editing
- no user management

## Data Model Design

### Existing Limitation

The current `profiles.role` single text field is not enough for multi-role access.

It can remain temporarily for backward compatibility, but it can no longer be the source of truth.

### New Tables

#### `roles`

Stores the supported role catalog.

Fields:

- `id`
- `slug`
- `label`
- `description`
- `created_at`

#### `teams`

Stores club teams.

Fields:

- `id`
- `slug`
- `name`
- `age_group`
- `is_active`
- `sort_order`
- `created_at`

#### `user_roles`

Joins users to roles.

Fields:

- `id`
- `user_id`
- `role_id`
- `created_at`

Unique constraint:

- one role per user only once

#### `user_team_assignments`

Joins users to teams.

Fields:

- `id`
- `user_id`
- `team_id`
- `created_at`

Unique constraint:

- one team assignment per user only once

### Existing Tables To Keep

Keep these as-is for scouting continuity:

- `profiles`
- `user_settings`
- `reports`
- `players`
- `player_reviews`
- `report_comments`
- `watchlist_players`

### Backward Compatibility

Existing users must continue to work after migration.

Migration behavior:

- existing `profiles.role = 'Admin'` becomes `user_roles -> admin`
- every other existing user gets `user_roles -> scout`
- `profiles.role` remains populated for now, but app logic switches to `user_roles`

## Auth And Session Design

Authentication remains Supabase email/password.

Recovery remains the same for all roles because auth is shared.

After sign-in:

1. load session
2. load profile
3. load roles
4. load team assignments
5. derive application permissions and landing view

The auth store should move from:

- `user.role`

to:

- `user.roles: string[]`
- `user.teams: TeamSummary[]`
- computed helpers like:
  - `isAdmin`
  - `isTechnicalDirector`
  - `isCoach`
  - `isDriver`
  - `isScout`
  - `isBoardObserver`

## Routing Design

### Current Problem

The current app routes are scouting-centric:

- `/`
- `/players`
- `/report/new`
- `/report/:id`
- `/settings`

### New Route Structure

This slice introduces a club-wide route shell:

- `/` -> role-aware home
- `/training`
- `/transport`
- `/scouting`
- `/scouting/report/new`
- `/scouting/report/:id`
- `/players`
- `/oversight`
- `/settings`

Backward compatibility redirects:

- `/report/new` -> `/scouting/report/new`
- `/report/:id` -> `/scouting/report/:id`

This avoids breaking existing links while making the architecture more coherent.

## Dashboard Design

### Role-Aware Landing

The root dashboard should change based on role priority.

Recommended priority order:

1. admin
2. technical_director
3. coach
4. driver
5. scout
6. board_observer

### Dashboard Variants

#### Admin Dashboard

Club-wide overview:

- users
- reports
- teams
- future module summaries

#### Technical Director Dashboard

Strategic oversight view:

- team summaries
- recent reports
- pending activity areas
- comment-oriented quick access

#### Coach Dashboard

Team-focused view:

- assigned teams
- shortcuts into planning and scouting

#### Driver Dashboard

Transport-focused shell:

- transport module entry
- assigned team summary

#### Scout Dashboard

Current scouting dashboard remains available, but framed under the club-wide shell.

#### Board Observer Dashboard

Read-only overview:

- simple, non-editable cards
- recent high-level activity

## Navigation Design

### Global Navigation

The app shell must show only the modules relevant to the current user.

Rules:

- `Scouting Reports` is shown only if the user is scout/admin/technical_director/coach where allowed
- `Training Schedule` is shown for admin, technical_director, coach
- `Transport Plans` is shown for admin, technical_director, driver
- `Admin Oversight` is shown for admin, technical_director, board_observer

### Mobile

The mobile-first work already started must be preserved.

Bottom navigation should stay compact and role-aware.

No dead items or fake placeholders should appear in navigation.

## Login And Product Framing

The login page must be updated from scouting-only framing to club-wide management framing.

Required content:

- product subtitle and copy changed to `Club Management`
- four cards:
  - Training Schedule
  - Transport Plans
  - Scouting Reports
  - Admin Oversight

The existing recovery flow remains.

Sign-up behavior:

- remove the misleading `Scout/Admin` chooser
- instead create a standard club account request flow
- actual roles are assigned by admin later

This avoids letting public sign-up imply self-assigned privilege.

## RLS And Security Design

### Principle

Permissions must remain enforced in the database, not only hidden in UI.

### For This Slice

We need DB helper functions that can answer:

- whether a user has a role
- whether a user belongs to a team

Examples:

- `has_role('admin')`
- `has_any_role(array['admin', 'technical_director'])`
- `belongs_to_team(team_id)`

Existing scouting RLS must keep working.

Training and transport tables are not added in this slice, so their RLS is deferred to future slices.

## Migration Strategy

### Database

1. create new role/team tables
2. seed roles
3. seed teams
4. migrate existing single-role users into `user_roles`
5. keep `profiles.role` for compatibility

### Application

1. extend user shape
2. update auth bootstrap
3. update route logic
4. update navigation
5. update dashboard branching
6. keep scouting editor working under redirected routes

## Testing Strategy

This slice must be verified with:

### Database

- migration applies cleanly on current Supabase project
- seeded roles and teams exist
- existing users remain able to sign in

### Auth

- login works
- password recovery still works
- existing scout user lands correctly
- admin user lands correctly

### Routing

- `/login`
- `/`
- `/scouting`
- `/scouting/report/new`
- `/players`
- `/settings`

### UI

- mobile navigation still works
- desktop navigation still works
- hidden modules do not appear for forbidden roles

## Implementation Boundary

If a screen would require real training or transport records to function, this slice should show a clean real module entry shell rather than fake production content.

That is acceptable because the foundation slice’s job is:

- real roles
- real teams
- real permissions
- real navigation
- real dashboards
- real product framing

The fake version would be a shell with no role logic underneath. We are explicitly **not** doing that.

## Success Criteria

This slice is complete when:

- the app is framed as `Club Management`
- a user can have multiple roles
- a user can be assigned to multiple teams
- the app loads permissions from the new data model
- role-aware dashboards and navigation are working
- the current scouting workflows still work
- recovery/login are still working
- the database is migrated without breaking existing accounts
