# Scouting Workspace Unification Design

## Goal

Turn the existing scouting surfaces into a coherent club-management module so that `Scouting`, `Player Hub`, and `Report Editor` feel like one aligned workspace inside the new club shell rather than a legacy app embedded beside it.

## Scope

This slice covers:

- re-framing the current `Dashboard` page as the primary `Scouting Workspace`
- aligning `Player Hub` copy, actions, and navigation with the new scouting workspace
- aligning `Report Editor` shell and action flow with the same scouting workspace
- strengthening cross-links between scouting, player hub, training, transport, and oversight where those links already make sense
- making the module feel role-aware for:
  - `Scout`
  - `Coach`
  - `Admin`
  - `Technical Director`

This slice does **not** cover:

- new scouting data tables
- new AI/report generation features
- transport or training data model changes
- new export formats
- board-only reporting or analytics redesign outside the existing oversight workspace

## Why This Slice Now

The club shell is already in place:

- `Club Home`
- `Training`
- `Transport`
- `Notifications`
- `Oversight`
- `Invite Staff`

The scouting stack is the main area that still feels visually and structurally older. That creates a product mismatch:

- the club modules feel modern and operational
- the scouting module still feels like the original standalone product

This slice fixes that mismatch without destabilizing the already-working scouting logic.

## Product Outcome

After this slice:

- `Scouting` is the clear landing space for scouting operations
- `Player Hub` feels like a sub-workspace of scouting, not a separate app
- `Report Editor` feels like the authoring flow inside the same system
- users can move more naturally between:
  - scouting reports
  - player comparisons
  - training/transport context
  - leadership visibility

## Route Model

The route structure stays stable:

- `/scouting`
- `/players`
- `/scouting/report/new`
- `/scouting/report/:id`

We keep these routes because:

- they already work
- links already exist across the app
- the user has already validated major behavior on these flows

The change is not route invention. The change is route coherence and role-aware module framing.

## Module Boundaries

### Scouting Workspace (`Dashboard`)

This page becomes the clear operational landing page for scouting.

It should answer:

- what scouting work is active now
- what needs review
- what has been filed recently
- where the user should go next

Expected sections:

- workspace hero
- search / quick create
- operational KPI strip
- recent reports
- admin insights block where allowed
- next actions / module shortcuts

For `Scout` and `Coach`, the page should bias toward:

- report creation
- report follow-up
- recent report history

For `Admin` and `Technical Director`, the page should also expose:

- club-wide scouting visibility
- insight/quality patterns
- strongest recent players
- report activity trends

### Player Hub

This page remains the player-centric analysis surface.

It should feel explicitly connected to scouting by:

- using scouting-framed copy
- keeping report creation prominent
- treating comparison and shortlist as scouting actions
- giving clearer links back into report work

It should answer:

- who is worth following
- who is trending up/down
- what reports were filed recently
- what player comparison needs to happen next

### Report Editor

The editor remains the core authoring flow, but the shell should align with the new workspace.

It should feel like:

- a dedicated scouting authoring space inside club management
- not a detached page with a separate identity

The top shell and supporting copy should better reinforce:

- scouting workspace context
- draft vs published state
- fast movement between authoring steps
- clear return path back to scouting

## Role Behavior

### Scout

Can:

- open scouting workspace
- create/edit own reports
- use player hub
- compare players
- maintain shortlist/watchlist

Should see:

- report-first actions
- recent own work
- concise player signals

### Coach

Can:

- access scouting workspace where allowed by the foundation slice
- view player hub
- create or contribute to scouting reports if assigned in practice

Should see:

- practical scouting outputs
- players worth watching
- links that connect scouting with training context

### Admin

Can:

- see all scouting activity
- use admin insight surfaces
- manage access from settings

Should see:

- wider performance / activity signals
- strongest recent reports
- easiest route to oversight or player hub

### Technical Director

Can:

- view club-wide scouting work
- use scouting to guide player and training decisions

Should see:

- higher-level scouting visibility
- strong routes between scouting and the wider club operation

## Data Strategy

No new database tables are required for this slice.

This slice should reuse:

- `reports`
- `players`
- `reviews`
- `watchlists`
- `user_settings`
- current admin analytics queries
- current player hub aggregation

New work should stay in:

- view-model helpers
- page composition
- copy, emphasis, and action structure

## Integration Rules

### With Club Home

`Club Home` already routes users into the right module based on role. This slice strengthens the destination once they reach scouting.

### With Oversight

`Oversight` remains the leadership workspace. Scouting should provide clean paths into it, but should not duplicate the entire oversight surface.

### With Training and Transport

We do not merge the modules. We add only practical bridges where useful:

- contextual shortcuts
- coordinated module navigation
- phrasing that reinforces one club system

## UX Direction

The scouting module should still feel premium and productized, but less like a separate brand.

Rules:

- keep the strong MWOS visual language
- reduce wording that implies “this whole product is only for scouts”
- emphasize workspace and operations
- keep mobile-first density standards from recent slices
- favor operational clarity over decorative hero space

## Testing Expectations

This slice is only done when all of the following work:

- `Scouting` page loads correctly for allowed roles
- `Player Hub` still loads and existing compare/watchlist flows still work
- `Report Editor` still creates, edits, and saves reports
- existing links across scouting pages still work
- tests, lint, and build all pass
- a live smoke confirms:
  - report list loads
  - player hub loads
  - report editor route still resolves

## Definition of Done

This slice is complete when:

- the scouting stack feels like one coherent module inside `Club Management`
- no existing scouting functionality regresses
- cross-module navigation is cleaner and more intentional
- the user no longer sees a strong “old app vs new app” split between scouting and the rest of the product
