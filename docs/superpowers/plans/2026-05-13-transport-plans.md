# Transport Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production-ready Transport Plans module with trip planning, driver assignment, comments, and in-app/email notifications.

**Architecture:** Extend the Supabase data model with transport plan and comment tables, enforce access through RLS, reuse the shared notification infrastructure from Slice 2, and replace the placeholder transport page with a real role-aware transport workspace.

**Tech Stack:** React, TypeScript, Vite, Supabase, Netlify Functions, Resend, Zustand, Tailwind.

---

## File map

### Database / backend model
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/supabase/schema.sql`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/transportDomain.ts`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/transportNotifications.ts`

### Data layer
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/data.ts`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/trainingData.ts`

### UI
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/TransportPage.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/components/transport/TransportPlanList.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/components/transport/TransportPlanEditor.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/components/transport/TransportCommentsPanel.tsx`

### Functions
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify/functions/_notification-core.js`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify/functions/notify-email.js`

### Tests
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/transportDomain.test.ts`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/transportNotifications.test.ts`

---

## Task 1: Add pure transport domain tests first

- [ ] Write failing tests for:
  - normalizing a transport plan draft
  - validating required transport fields
  - detecting major transport changes
  - generating transport notification drafts
- [ ] Run tests and confirm they fail for expected reasons

## Task 2: Implement pure transport domain logic

- [ ] Create `transportDomain.ts`
- [ ] Create `transportNotifications.ts`
- [ ] Run tests until green

## Task 3: Extend Supabase schema for transport planning

- [ ] Add `transport_plans`
- [ ] Add `transport_plan_comments`
- [ ] Add indexes, helper functions, and RLS policies
- [ ] Reuse `app_notifications` instead of creating a second notification system

## Task 4: Extend data layer for transport plans and comments

- [ ] Add types for transport plans, comments, driver option lists
- [ ] Add transport plan CRUD functions
- [ ] Add comment functions
- [ ] Add save logic that creates notification events for:
  - publish
  - major transport change
  - cancellation

## Task 5: Build the real Transport Plans UI

- [ ] Replace placeholder `TransportPage`
- [ ] Add team + status filtering
- [ ] Add list / mobile card layout
- [ ] Add transport detail editor
- [ ] Add driver assignment selector
- [ ] Add comments panel
- [ ] Add draft/publish/complete/cancel actions
- [ ] Make layout mobile-safe

## Task 6: Hook transport notifications into the shared notification layer

- [ ] Emit `transport_plan_updated` notification events
- [ ] Reuse in-app notification center
- [ ] Reuse email dispatch layer from Slice 2

## Task 7: Verification

- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Run `npm test`
- [ ] Smoke-test transport plan creation locally against Supabase
- [ ] Verify assigned driver visibility and major-change notification logic
