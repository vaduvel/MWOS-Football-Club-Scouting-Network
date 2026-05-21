# Club Player Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real club-owned player database seeded from `MWOS FC Anthropometrics A-Z-1.xlsx`, without breaking the existing scouting `players` table or current Player Hub behavior.

**Architecture:** Keep the existing scouting data model untouched (`reports` -> `players` -> `player_reviews`) and introduce a separate `club_players` model for internal squad records. Import the Excel workbook into `club_players`, then extend the Player Hub so it can surface a club roster view alongside scouting-derived intelligence.

**Tech Stack:** Supabase Postgres, Vite/React, TypeScript, existing `src/lib/data.ts` data layer, new one-time XLSX import utility.

---

## File Structure

**Create**
- `src/lib/clubPlayersData.ts`
  Club player queries, roster fetchers, import helpers, and future match-day/player-profile data access.
- `src/lib/clubPlayersDomain.ts`
  Mapping helpers for footedness, positions, BMI formatting, empty-data labeling, and player display strings.
- `scripts/import-club-players-from-xlsx.mjs`
  One-time import script that reads the workbook and upserts club players into Supabase.
- `docs/data/club-player-import-mapping.md`
  Human-readable mapping from workbook columns to database columns, plus normalization rules.

**Modify**
- `supabase/schema.sql`
  Add `club_players` table, indexes, RLS, grants, and optional unique constraints for import safety.
- `src/pages/PlayersPage.tsx`
  Add a roster mode/section so the Player Hub can show internal club players in addition to scouting-derived tracked players.
- `src/components/AppSidebar.tsx`
  Keep naming consistent if the Player Hub becomes the entry point for both scouting players and club roster.
- `src/lib/data.ts`
  Wire high-level page loaders to the new `clubPlayersData` module only where shared app state is needed.

---

## Data Model

### New table: `public.club_players`

Purpose: canonical internal player records for MWOS squads.

Recommended fields:

- `id uuid primary key default gen_random_uuid()`
- `team_id uuid not null references public.teams (id) on delete restrict`
- `source_label text not null default 'anthropometrics_seed'`
- `source_row_number integer`
- `squad_number integer`
- `first_name text not null`
- `last_name text not null`
- `display_name text not null`
- `weight_kg numeric(5,2)`
- `height_cm numeric(5,2)`
- `bmi numeric(5,2)`
- `dominant_foot text check (dominant_foot in ('right', 'left', 'both', 'unknown')) default 'unknown'`
- `nationality text`
- `primary_position text`
- `secondary_position text`
- `is_active boolean not null default true`
- `notes text`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`

Recommended import-safety constraint:

- `unique (team_id, display_name)`

Rationale:
- this workbook is clearly roster-like data, not scouting-event data
- the workbook has no report context, so it does not belong in `public.players`
- future `match day` needs club-owned players by team, not report-attached players

### Important non-goal

Do **not** repurpose `public.players`. That table is currently scoped to players inside a scouting report and is referenced by `player_reviews` and watchlist logic.

---

## Workbook Mapping

### Source file

- `/Users/vaduvageorge/Downloads/MWOS%20FC%20Anthropometrics%20A-Z-1.xlsx`

### Worksheet structure

- sheet: `Sheet1`
- rows: 34 total
- columns used:
  - `NO`
  - `SURNAME`
  - `NAME`
  - `WEIGHT [KG]`
  - `HEIGHT [CM]`
  - `BODY MASS INDEX`
  - `FOOT`
  - `NATIONALITY`
  - `POSITION`
  - `ALTERNATIVE POSITION`

### Mapping rules

- `SURNAME` -> `last_name`
- `NAME` -> `first_name`
- `display_name` -> `trim(first_name + " " + last_name)`
- `WEIGHT [KG]` -> `weight_kg` numeric, nullable
- `HEIGHT [CM]` -> `height_cm` numeric, nullable
- `BODY MASS INDEX` -> `bmi` numeric, nullable
- `FOOT`
  - `R` -> `right`
  - `L` -> `left`
  - `R / L` -> `both`
  - empty -> `unknown`
- `NATIONALITY` -> `nationality`
- `POSITION` -> `primary_position`
- `ALTERNATIVE POSITION` -> `secondary_position`
- `NO` -> `source_row_number` or optional `squad_number` only if confirmed to be squad number

### Import assumption

This workbook has no explicit `team` column. First import should treat this file as:

- `team_id = first-team`

The import script should make this explicit with a `--team first-team` argument so later workbooks for `U13`, `Queens`, etc. can use the same path.

---

## UX Strategy

**Target user:** admin, technical director, coach, and scout on mobile, often moving fast and not thinking in database terms.

**Core insight:** internal player records should feel like a live roster, not like another scouting report.

**Key decisions:**
- Separate `Club roster` from `Scouting intelligence` in Player Hub so users understand whether they are looking at internal squad records or report-derived opinions.
- Import from workbook once, then let the app become the editable source of truth.
- Default first import to `First Team`, but keep the import path team-aware for future age groups and Queens squads.

**Biggest UX risk:** mixing internal roster players with report players so users stop trusting which data is “official”.

---

## Task 1: Add the new club player schema

**Files:**
- Modify: `supabase/schema.sql`

- [ ] Add the `public.club_players` table with the fields listed above.
- [ ] Add indexes:
  - `club_players_team_id_idx`
  - `club_players_display_name_idx`
  - `club_players_primary_position_idx`
- [ ] Add `updated_at` trigger using existing `public.set_updated_at()`.
- [ ] Grant `select, insert, update, delete` to `authenticated`.
- [ ] Enable RLS.
- [ ] Add policies aligned with existing club-wide access rules:
  - admins / technical director / coaches / scouts / board observers can read players for teams they can view
  - admins and technical director can manage all club players
  - coaches can manage players only for assigned teams

---

## Task 2: Create the roster-specific data layer

**Files:**
- Create: `src/lib/clubPlayersDomain.ts`
- Create: `src/lib/clubPlayersData.ts`

- [ ] Add domain helpers:
  - normalize dominant foot
  - build display name
  - format anthropometrics values
  - normalize/clean position strings
- [ ] Add data functions:
  - `fetchClubRoster(teamId?: string)`
  - `fetchClubPlayerById(id: string)`
  - `upsertClubPlayers(rows)`
  - `updateClubPlayer(input)`
- [ ] Keep these functions independent from current scouting `fetchPlayerHubData()` so the new roster can be integrated incrementally.

---

## Task 3: Build the one-time workbook import script

**Files:**
- Create: `scripts/import-club-players-from-xlsx.mjs`
- Create: `docs/data/club-player-import-mapping.md`
- Modify: `package.json`

- [ ] Add dependency: `xlsx`
- [ ] Add script command:
  - `"import:club-players": "tsx scripts/import-club-players-from-xlsx.mjs"`
- [ ] Script inputs:
  - workbook path
  - team slug
  - optional `--dry-run`
- [ ] Script behavior:
  - resolve `team_id` from `public.teams`
  - parse rows from workbook
  - normalize text and numeric values
  - print import summary:
    - total rows
    - imported rows
    - skipped rows
    - rows missing anthropometric fields
  - upsert into `public.club_players` by `(team_id, display_name)`

---

## Task 4: Add roster mode to Player Hub

**Files:**
- Modify: `src/pages/PlayersPage.tsx`
- Modify: `src/lib/data.ts`
- Possibly create: `src/components/players/ClubRosterPanel.tsx`

- [ ] Add a clear switch or segmented control:
  - `Scouting`
  - `Club roster`
- [ ] In `Club roster` mode show:
  - team selector
  - player count
  - missing-data count
  - searchable roster cards/list
- [ ] Each roster row/card should show:
  - name
  - primary + secondary position
  - foot
  - height
  - weight
  - BMI
  - nationality
- [ ] Empty state should tell the user to import a roster or add the first player manually.

---

## Task 5: Prepare the bridge to future features

**Files:**
- Modify: `src/lib/clubPlayersData.ts`
- Modify later when `match day` starts

- [ ] Keep `club_players` IDs stable and app-owned so future modules can reference them.
- [ ] Do **not** add match-day tables yet.
- [ ] Do **not** force-link club players to scouting report players yet.
- [ ] Make sure future work can add:
  - `club_player_id` on report players
  - `match_day_lineups`
  - `availability / injury / suspension`

---

## Definition of Done

- `club_players` exists in Supabase and is protected by RLS.
- Workbook can be imported for `first-team` without touching the old scouting tables.
- Player Hub can display a `Club roster` surface.
- Existing scouting report flows still work unchanged.
- Import output clearly reports rows with missing anthropometric values.

---

## Recommended execution order

1. Schema
2. Import script
3. Local dry run against workbook
4. Player Hub roster view
5. Live import into Supabase

