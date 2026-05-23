# Match Day Transport Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link `Match Day` and `Transport` so staff can create or open a travel plan directly from a fixture.

**Architecture:** Keep `Transport` as the operational source of truth and let `Match Day` own a nullable `transport_plan_id` reference. Build the link through a small DB change, one creation helper, and one UI card in the match-day board.

**Tech Stack:** Supabase Postgres + RLS, React, TypeScript, Vite, existing `matchDayData.ts` and `transportData.ts` domain patterns.

---

### Task 1: Add the schema link

**Files:**
- Create: `supabase/migrations/20260522190000_link_match_day_to_transport.sql`
- Modify: `supabase/schema.sql`

- [ ] Add `transport_plan_id uuid null references public.transport_plans(id) on delete set null` to `match_days`.
- [ ] Add a unique partial index for non-null `transport_plan_id`.
- [ ] Mirror the same structure in `supabase/schema.sql`.

### Task 2: Extend match-day data layer

**Files:**
- Modify: `src/lib/matchDayData.ts`
- Test: `src/lib/matchDayDomain.test.ts`

- [ ] Extend match-day row/workspace types to carry linked transport plan information.
- [ ] Add a helper that creates a transport draft from a match day and writes back `transport_plan_id`.
- [ ] Add validation that linked transport and match day share the same team.

### Task 3: Expose transport link path

**Files:**
- Modify: `src/lib/transportData.ts`

- [ ] Export the existing transport workspace link builder so other modules can deep-link into `Transport`.

### Task 4: Add match-day transport card

**Files:**
- Modify: `src/pages/MatchDayPage.tsx`

- [ ] Add a `Transport` card below fixture setup / beside squad board.
- [ ] Show `Create transport plan` when no link exists.
- [ ] Show summary + `Open transport plan` when a link exists.
- [ ] Redirect to the transport workspace after creation.

### Task 5: Verify integration

**Files:**
- Modify if needed: `src/pages/TransportPage.tsx`

- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Smoke test the data path with QA accounts and clean any temporary records
