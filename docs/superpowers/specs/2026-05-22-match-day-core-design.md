# Match Day Core Design

**Date:** 2026-05-22

## Goal
Add a first operational `match day` module that connects club fixtures to internal club players and gives coaches a simple way to mark each player as `available`, `starter`, `bench`, or `out`.

## Why This Scope
The app already has:
- `club_players` as the internal roster
- scouting profiles linked to `club_players`
- training and transport modules

What is missing is the operational bridge between roster and actual team selection for a given match. The first version should stay narrow and avoid tactical overload. We are intentionally not adding formations, minutes played, captaincy, medical workflows, or external players yet.

## Recommended Approach
Build a lean core made of:
- a `match_days` table for fixture-level records
- a `match_day_players` table for per-player selection state
- a dedicated `Match Day` page for team-level editing
- a `Match Day Status` card inside the dedicated player profile page

This keeps one clear source of truth:
- fixture record lives in `match_days`
- player selection lives in `match_day_players`
- player profile consumes it

## Data Model

### `public.match_days`
Purpose: one record per club fixture for one team.

Fields:
- `id`
- `team_id`
- `opponent`
- `competition`
- `match_date`
- `kickoff_time`
- `venue`
- `status`
- `created_by`
- `updated_by`
- `published_by`
- `published_at`
- `created_at`
- `updated_at`

Status values:
- `draft`
- `published`
- `completed`
- `cancelled`

### `public.match_day_players`
Purpose: one row per club player attached to one match day.

Fields:
- `match_day_id`
- `club_player_id`
- `availability_status`
- `selection_status`
- `notes`
- `created_at`
- `updated_at`

Availability values:
- `available`
- `doubtful`
- `unavailable`

Selection values:
- `starter`
- `bench`
- `out`

Notes:
- `club_player_id` is required so the module stays tied to the internal roster
- one player should only appear once per match day

## UX Shape

### Match Day Page
Audience:
- coaches
- technical director
- admin

Surface:
- team selector
- list of match days for that team
- create/edit fixture card
- roster list for the selected match day
- fast chips/toggles for `starter`, `bench`, `out`
- fast availability control
- summary strip for total starters, bench, out, unavailable

### Player Profile
Add a new section:
- `Match Day Status`

Contents:
- next relevant fixture
- team
- opponent
- competition
- kickoff date/time
- current availability status
- current selection status
- optional coach note

If no linked match day exists:
- show an empty-state note

## Permissions
- team-scoped manage roles should edit only their assigned teams
- view roles can read but not edit
- board observer can stay read-only

The exact policy should follow the same team access helpers already used by training and transport.

## Non-Goals For This Slice
- formations and tactical pitch view
- minutes played
- captain / vice-captain
- medical workflows
- attendance history
- auto-generation from reports

## Testing
- domain helpers for match day summaries and player status grouping
- data tests where practical
- full build, typecheck, and unit test run

## Success Criteria
- a coach can create a match day fixture for a team
- a coach can assign `starter`, `bench`, or `out` to internal players
- the player profile shows current match day status when present
- the data model is ready for future tactical and availability expansion without schema churn
