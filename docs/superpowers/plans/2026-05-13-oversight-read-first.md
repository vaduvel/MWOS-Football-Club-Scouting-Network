# Oversight Read-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old oversight dashboard with a real leadership workspace that summarizes training, transport, scouting, and onboarding in one read-only club view.

**Architecture:** Add a dedicated oversight aggregation layer instead of extending the old scouting dashboard helper. Keep readiness logic in a pure domain module with tests, then feed the page through a small set of focused UI components. Update RLS only where read-only visibility is required for `board_observer`.

**Tech Stack:** React, TypeScript, Supabase, Vitest, Vite

---

### Task 1: Add oversight domain helpers

**Files:**
- Create: `src/lib/oversightDomain.ts`
- Create: `src/lib/oversightDomain.test.ts`

- [ ] Add pure helpers for team readiness and attention generation
- [ ] Cover missing training, draft training, missing coach, and transport-without-driver cases
- [ ] Run: `npm test`

### Task 2: Build oversight data aggregation

**Files:**
- Create: `src/lib/oversightData.ts`
- Modify: `supabase/schema.sql`

- [ ] Add `fetchOversightWorkspace()` returning leadership-ready metrics, team cards, activity feeds, and optional invite data
- [ ] Extend read-only RLS for `board_observer` on training and transport visibility
- [ ] Keep invite visibility admin-only
- [ ] Run: `npm test`

### Task 3: Build oversight UI components

**Files:**
- Create: `src/components/oversight/OversightMetricStrip.tsx`
- Create: `src/components/oversight/OversightAttentionList.tsx`
- Create: `src/components/oversight/OversightTeamMatrix.tsx`

- [ ] Add a compact metric strip
- [ ] Add an attention list with severity styling and deep links
- [ ] Add a team readiness matrix that reads cleanly on desktop and mobile

### Task 4: Replace the old oversight page

**Files:**
- Modify: `src/pages/OversightPage.tsx`

- [ ] Switch the page to `fetchOversightWorkspace()`
- [ ] Replace scouting-only cards with leadership layout
- [ ] Keep role guard and loading/error states clean
- [ ] Preserve read-only behavior

### Task 5: Verify end-to-end

**Files:**
- Modify as needed during verification

- [ ] Run: `npm test`
- [ ] Run: `npm run lint`
- [ ] Run: `npm run build`
- [ ] Run one live oversight smoke check against Supabase with the current admin user
- [ ] Confirm the page loads for `admin`; note if `board_observer` still needs a manual smoke after schema refresh
