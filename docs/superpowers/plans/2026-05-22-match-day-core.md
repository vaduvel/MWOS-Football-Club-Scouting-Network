# Match Day Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first operational match-day module with fixture records, player selection states, and profile-level visibility for internal club players.

**Architecture:** Add two Supabase tables (`match_days`, `match_day_players`), then build a lean data layer and one mobile-first page for team-level match-day editing. Reuse existing team access and player profile surfaces so the new module plugs into the current club operating flow instead of standing alone.

**Tech Stack:** React, TypeScript, Vite, Supabase Postgres, existing MWOS UI system, Vitest

---

### Task 1: Extend the database schema

**Files:**
- Create: `supabase/migrations/20260522150000_add_match_day_core.sql`
- Modify: `supabase/schema.sql`

- [ ] Add `match_days` with team, fixture metadata, workflow status, and audit fields.
- [ ] Add `match_day_players` with one row per `club_player_id` per `match_day_id`.
- [ ] Add indexes and RLS/grants following the same team-scoped approach already used by training and transport.
- [ ] Mirror the schema changes into `supabase/schema.sql`.

### Task 2: Add match-day domain helpers and tests

**Files:**
- Create: `src/lib/matchDayDomain.ts`
- Create: `src/lib/matchDayDomain.test.ts`

- [ ] Add helpers for:
  - building status totals
  - grouping starters / bench / out
  - choosing the next relevant fixture for a player
- [ ] Add tests for the helpers before wiring them into UI.

### Task 3: Add the Supabase data layer

**Files:**
- Modify: `src/lib/data.ts`

- [ ] Add types for `MatchDaySummary`, `MatchDayPlayerSelection`, and `PlayerMatchDayStatus`.
- [ ] Add fetch/create/update methods for:
  - loading team match days
  - loading one selected match day with roster rows
  - saving fixture details
  - saving player availability/selection
  - loading player-level match-day status by `club_player_id`

### Task 4: Build the Match Day page

**Files:**
- Create: `src/pages/MatchDayPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppSidebar.tsx`

- [ ] Add a dedicated `/match-day` route guarded by team-scoped access.
- [ ] Add the sidebar entry using the same pattern as training and transport.
- [ ] Build a mobile-first page with:
  - team selector
  - match list
  - fixture form
  - roster selection board
  - summary strip for starters / bench / out / unavailable

### Task 5: Add player profile integration

**Files:**
- Modify: `src/pages/PlayerProfilePage.tsx`

- [ ] Add a `Match Day Status` section to the player profile.
- [ ] If `linkedClubPlayerId` exists, show the next relevant fixture and current status.
- [ ] If no status exists, show a clear empty state.

### Task 6: Verification

**Files:**
- Modify only if fixes are required from verification.

- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Smoke-test:
  - create fixture
  - assign player statuses
  - open linked player profile
  - confirm status shows up correctly
