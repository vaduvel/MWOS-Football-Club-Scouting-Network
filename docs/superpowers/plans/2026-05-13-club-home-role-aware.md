# Club Home Role-Aware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/` into a role-aware club home that shows the right work, alerts, and shortcuts for leadership, coaches, drivers, and scouts.

**Architecture:** Keep role-priority and metric logic in a pure domain helper with tests first. Add a dedicated data composer that reuses the existing training, transport, notification, scouting, and oversight data layers. Refactor the page to render role-aware sections without changing the database schema.

**Tech Stack:** React, TypeScript, Vitest, Supabase client data fetchers, existing MWOS UI shell

---

### Task 1: Define role-priority and metric logic

**Files:**
- Create: `src/lib/clubHomeDomain.ts`
- Create: `src/lib/clubHomeDomain.test.ts`

- [ ] Write failing tests for role priority, hero copy, and metric card composition
- [ ] Run targeted tests and confirm they fail for missing module/functions
- [ ] Implement the minimal pure helpers to satisfy the tests
- [ ] Re-run targeted tests and confirm they pass

### Task 2: Compose home workspace data

**Files:**
- Create: `src/lib/clubHomeData.ts`
- Modify: `src/lib/trainingData.ts` only if a tiny export/helper is required

- [ ] Build a workspace fetcher that loads current user, notifications, and the relevant module data by role
- [ ] Reuse `fetchOversightWorkspace()` for leadership roles instead of duplicating aggregation
- [ ] Return one typed workspace shape for the page to render

### Task 3: Refactor Club Home page

**Files:**
- Modify: `src/pages/ClubHomePage.tsx`

- [ ] Replace the generic home with role-aware summary cards and action sections
- [ ] Keep module shortcuts, but reorder emphasis based on current role
- [ ] Surface notifications and operational next steps for each role

### Task 4: Verify

**Files:**
- Optional create: `scripts/.tmp-club-home-smoke.mjs`

- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Add a smoke script if runtime validation needs a dedicated check
