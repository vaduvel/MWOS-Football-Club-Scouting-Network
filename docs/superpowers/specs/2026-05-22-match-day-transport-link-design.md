# Match Day Transport Link Design

**Goal:** Let staff create or open a transport plan directly from a match day without turning transport into an automatic side effect of every fixture.

**Why this shape:** MWOS already has a working `Transport` workspace and a new `Match Day` workspace. The right move is to link them lightly so the football decision can open the operational plan, while transport stays the source of truth for departure, driver, and travel logistics.

## Product Decision

The first version uses an **optional one-to-one link**:

- a `match_day` can have `0` or `1` linked `transport_plan`
- a `transport_plan` can be linked to at most one `match_day`
- no transport plan is created automatically

This avoids polluting the transport module with empty drafts for home matches or local fixtures that do not need travel.

## Data Model

Add `transport_plan_id uuid null` to `public.match_days`, referencing `public.transport_plans(id)` with `on delete set null`.

Constraints:

- unique index on `match_days.transport_plan_id` where not null
- application-level validation that the linked transport plan belongs to the same `team_id` as the match day

No reciprocal `match_day_id` is needed on `transport_plans` in this slice. `match_days` owns the link.

## User Flow

### In Match Day

Add a new `Transport` card to the match-day board.

If there is no linked transport plan:

- show short helper copy
- show `Create transport plan`

If a transport plan exists:

- show plan summary: title, departure time, destination, driver, status
- show `Open transport plan`

### Create From Match Day

When a user creates transport from the match-day board:

1. create a transport draft immediately
2. prefill it from the match day:
   - `team`
   - `title` based on opponent
   - `context_type = match`
   - `event_date = match_date`
   - `destination` from `venue` first, then opponent fallback
3. save the new transport plan
4. save `match_days.transport_plan_id`
5. redirect user to the transport workspace for that new plan

This keeps the action atomic from the user point of view.

## Validation Rules

- only users who can manage the match day can create the linked transport plan from that surface
- if a linked transport plan already exists, `Create transport plan` is replaced by `Open transport plan`
- if the linked transport plan belongs to another team, reject the action and show a clear error

## Scope Exclusions

Not in this slice:

- automatic sync after both records already exist
- multiple transport plans per fixture
- auto-delete or cascade cleanup rules beyond `on delete set null`
- training-to-transport linking

## Success Criteria

- a coach/admin/technical director can create a transport draft from a match day
- the created plan opens in `Transport`
- the match day shows the linked transport summary afterward
- the link survives reload and respects existing role permissions
