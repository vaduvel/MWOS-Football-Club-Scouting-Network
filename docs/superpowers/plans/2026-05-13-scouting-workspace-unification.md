# Scouting Workspace Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `Scouting`, `Player Hub`, and `Report Editor` into a coherent club-management scouting module without changing the underlying scouting data model.

**Architecture:** Reuse the current report and player-hub data flows, add focused view-model helpers where needed, and reshape the page shells, copy, and action structure so the scouting experience aligns with the newer club-management modules. Keep routes stable and avoid schema work.

**Tech Stack:** React, TypeScript, Zustand, React Router, Supabase, Vitest, Vite

---

### Task 1: Define the scouting workspace page model

**Files:**
- Create: `src/lib/scoutingWorkspaceDomain.ts`
- Create: `src/lib/scoutingWorkspaceDomain.test.ts`
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Write the failing domain tests**

Add tests for:
- KPI card mapping from reports/admin overview
- role-aware quick actions
- empty-state messaging rules

- [ ] **Step 2: Run the domain test file and confirm failure**

Run: `npm test -- src/lib/scoutingWorkspaceDomain.test.ts`
Expected: FAIL because the new domain module does not exist yet.

- [ ] **Step 3: Implement the minimal workspace domain helpers**

Create helpers that:
- normalize KPI values
- choose quick actions by role
- expose section visibility booleans

- [ ] **Step 4: Re-run the domain test file**

Run: `npm test -- src/lib/scoutingWorkspaceDomain.test.ts`
Expected: PASS

### Task 2: Rebuild `Dashboard` as the scouting workspace

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Create: `src/components/scouting/ScoutingWorkspaceHero.tsx`
- Create: `src/components/scouting/ScoutingWorkspaceMetrics.tsx`
- Create: `src/components/scouting/ScoutingWorkspaceActions.tsx`

- [ ] **Step 1: Split the current page shell into focused components**

Move large shell sections out of `Dashboard.tsx` so the page becomes easier to maintain:
- hero
- metrics
- action rail

- [ ] **Step 2: Update copy and layout framing**

Change the page from “old scouting dashboard” framing to:
- scouting workspace
- club-integrated operations
- clearer report-first CTA hierarchy

- [ ] **Step 3: Preserve admin insight behavior**

Keep existing admin-only insight features working:
- AI insights block
- admin activity summary
- recent reports visibility

- [ ] **Step 4: Verify page behavior**

Run:
- `npm test`
- `npm run lint`
Expected: PASS

### Task 3: Align `Player Hub` with the scouting workspace

**Files:**
- Modify: `src/pages/PlayersPage.tsx`

- [ ] **Step 1: Reframe page copy and top actions**

Update hero/action structure so the page reads as part of scouting operations, not a detached player browser.

- [ ] **Step 2: Strengthen cross-links**

Keep or improve the flows for:
- create report
- open export
- open compare
- shortlist follow-up

- [ ] **Step 3: Keep watchlist and comparison behavior unchanged**

Do not change the underlying logic. Only improve framing, density, and integration.

- [ ] **Step 4: Verify page behavior**

Run:
- `npm test`
- `npm run lint`
Expected: PASS

### Task 4: Align `Report Editor` with the scouting workspace

**Files:**
- Modify: `src/pages/ReportEditor.tsx`

- [ ] **Step 1: Update top shell framing**

Adjust header copy and return flow so the editor clearly belongs to the scouting workspace.

- [ ] **Step 2: Improve draft/publish context**

Keep existing save logic, but improve the supporting shell text and status framing around drafts and movement between tabs.

- [ ] **Step 3: Preserve existing tab behavior**

Do not regress:
- match tab
- team sheets
- formations
- player reviews
- comments
- export

- [ ] **Step 4: Verify route safety**

Check that:
- `/scouting/report/new`
- `/scouting/report/:id`
still resolve and still save/load correctly.

### Task 5: Add a real smoke check for the scouting module

**Files:**
- Create: `scripts/.tmp-scouting-workspace-smoke.mjs`

- [ ] **Step 1: Implement a smoke script**

The smoke should:
- sign in
- fetch reports
- fetch player hub data
- confirm at least route-level/editor data dependencies are alive

- [ ] **Step 2: Run the smoke**

Run: `node scripts/.tmp-scouting-workspace-smoke.mjs <email> <password>`
Expected: JSON output with `ok: true`

### Task 6: Final verification

**Files:**
- Review only

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Run live smoke**

Run: `node scripts/.tmp-scouting-workspace-smoke.mjs <email> <password>`
Expected: PASS against live Supabase
