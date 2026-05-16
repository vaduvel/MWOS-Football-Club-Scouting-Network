# Oversight Read-First Design

## Goal

Turn `Oversight` into a real leadership workspace for `Admin`, `Technical Director`, and `Board Observer`. The page must summarize club activity across training, transport, scouting, and staff onboarding without requiring the user to jump between modules.

## Scope

This slice is intentionally read-first:

- club-wide summary metrics
- team readiness cards
- current-week training visibility
- upcoming transport visibility
- recent scouting activity
- pending invitation visibility for admin users
- attention items that point leadership to what needs follow-up

This slice does **not** add inline edit actions yet. Those belong to the next pass.

## Access Model

- `admin`: full oversight visibility
- `technical_director`: leadership visibility for training, transport, and scouting
- `board_observer`: read-only oversight visibility

To support `board_observer`, read access must include:

- training plan summaries
- transport plan summaries
- scouting overview data already visible through oversight

`board_observer` remains read-only. No create/update/delete permissions are added.

## UX Structure

The page should be split into five layers:

1. hero and context
2. summary metrics
3. attention rail
4. team readiness matrix
5. operational feeds

### 1. Hero and context

Keep the existing branded shell, but reposition the page as a leadership workspace rather than an admin-only report page.

### 2. Summary metrics

Show a compact metric strip with values leadership cares about immediately:

- staff accounts
- active teams
- teams with a current-week training plan
- upcoming transport plans
- scouting reports in the last 7 days
- pending invitations

If the current user is not `admin`, pending invitations can render as `0` or be replaced by a non-sensitive metric.

### 3. Attention rail

Build a prioritized list of items that need follow-up. Examples:

- team has no coach assigned
- team has no current-week training plan
- current-week training plan is still draft
- upcoming transport exists without assigned driver
- pending invite is still unresolved

Each item should include:

- severity
- short title
- supporting text
- deep link into the right module

### 4. Team readiness matrix

Each active team gets a compact readiness card that shows:

- team name
- assigned coach count when available
- current-week training status
- next transport status
- overall readiness state

Readiness should be derived from existing data, not manually stored.

### 5. Operational feeds

Show read-only feeds for:

- latest current-week training plans
- next transport plans
- recent scouting reports
- pending invitation activity when current user is admin

## Data Strategy

Do not add new database tables for this slice.

Create a dedicated oversight aggregation layer that reads from the existing domain tables:

- `profiles`
- `roles`
- `user_roles`
- `teams`
- `user_team_assignments`
- `training_plans`
- `transport_plans`
- `reports`
- `staff_invitations`

The page should not stitch together old admin dashboard data ad hoc. It should use a single oversight workspace fetch that returns the exact shape the page needs.

## Domain Rules

### Current-week training

Use the current Monday-start week as the leadership baseline.

- `missing`: no plan exists
- `draft`: plan exists but has not been published
- `published` or `updated`: leadership-ready

### Transport readiness

Only treat transport plans with upcoming dates and non-cancelled status as active.

- if a trip exists and no driver is assigned, flag it
- if no trip exists, do not create a transport alert automatically for every team

### Readiness state

Each team card should resolve to one of:

- `ready`
- `watch`
- `action`

Recommended rules:

- `action`: missing coach, missing training plan, or active transport without driver
- `watch`: draft training plan or recently updated transport needing monitoring
- `ready`: none of the above

## Technical Changes

### New files

- `src/lib/oversightDomain.ts`
- `src/lib/oversightDomain.test.ts`
- `src/lib/oversightData.ts`
- `src/components/oversight/OversightMetricStrip.tsx`
- `src/components/oversight/OversightAttentionList.tsx`
- `src/components/oversight/OversightTeamMatrix.tsx`

### Modified files

- `src/pages/OversightPage.tsx`
- `supabase/schema.sql`

## RLS Update

Extend read-only visibility to allow `board_observer` to read:

- training plan summaries
- transport plan summaries

Do not extend any write permissions.

## Success Criteria

This slice is complete when:

- `Oversight` no longer looks scouting-only
- leadership users can see club-wide training, transport, scouting, and onboarding signals from one page
- `board_observer` can load the oversight workspace read-only
- no new tables are required
- tests, lint, build, and one live oversight data smoke check pass
