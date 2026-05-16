# Notifications Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing notification center into a full notifications workspace where staff can review, filter, and clear important club alerts.

**Architecture:** Keep notification categorization and filtering in a pure domain helper with tests first. Reuse the existing `app_notifications` data layer instead of introducing new schema, then add a dedicated page and wire it into navigation while preserving the floating drawer.

**Tech Stack:** React, TypeScript, Vitest, existing Supabase notification fetchers

---

### Task 1: Define notification workspace domain logic

**Files:**
- Create: `src/lib/notificationWorkspaceDomain.ts`
- Create: `src/lib/notificationWorkspaceDomain.test.ts`

- [ ] Write failing tests for category mapping, stats, and filtering
- [ ] Run targeted tests and confirm they fail
- [ ] Implement the minimal pure helpers
- [ ] Re-run targeted tests and confirm they pass

### Task 2: Add notification workspace data wrapper

**Files:**
- Create: `src/lib/notificationWorkspaceData.ts`

- [ ] Reuse the existing notification fetcher with a larger limit
- [ ] Return a page-ready shape that includes stats and filtered lists

### Task 3: Build the Notifications page

**Files:**
- Create: `src/pages/NotificationsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppSidebar.tsx`
- Modify: `src/components/NotificationCenter.tsx`

- [ ] Add a full inbox page with stats, filters, list rows, and clear actions
- [ ] Wire the page into routes and navigation
- [ ] Add an easy path from the floating drawer into the full workspace

### Task 4: Verify

**Files:**
- Optional create: `scripts/.tmp-notifications-workspace-smoke.mjs`

- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Run one runtime smoke check against live notifications
