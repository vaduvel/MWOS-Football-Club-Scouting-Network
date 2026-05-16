# Training Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production-ready Training Schedule module with week planning, comments, in-app notifications, and email reminders.

**Architecture:** Extend the Supabase data model with training plan and notification tables, keep access enforcement in RLS, move email and reminder delivery to Netlify functions, and build the training UI as a role-aware workspace on top of Slice 1’s club shell.

**Tech Stack:** React, TypeScript, Vite, Supabase, Netlify Functions, Resend, Zustand, Tailwind.

---

## File map

### Database / backend model
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/supabase/schema.sql`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/trainingDomain.ts`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/trainingNotifications.ts`

### Data layer
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/data.ts`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/SettingsPage.tsx`

### UI
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/pages/TrainingPage.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/components/training/TrainingPlanBoard.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/components/training/TrainingDayEditor.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/components/training/TrainingCommentsPanel.tsx`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/components/NotificationCenter.tsx`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/components/AppSidebar.tsx`

### Functions
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify/functions/notify-email.js`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify/functions/training-reminders.js`
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/netlify.toml`

### Tests
- Modify: `/Users/vaduvageorge/Desktop/Scout Report Builder/package.json`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/vitest.config.ts`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/trainingDomain.test.ts`
- Create: `/Users/vaduvageorge/Desktop/Scout Report Builder/src/lib/trainingNotifications.test.ts`

---

## Task 1: Add test harness and domain tests first

- [ ] Add `vitest` and create a basic `npm test` script
- [ ] Write failing tests for:
  - building a 7-day training week shell
  - detecting major schedule changes
  - creating notification event drafts for the four training events in this slice
- [ ] Run tests and confirm they fail for the expected reason

## Task 2: Implement pure training and notification domain logic

- [ ] Create `trainingDomain.ts` for week/day defaults and change detection
- [ ] Create `trainingNotifications.ts` for event typing and message generation
- [ ] Run tests until green

## Task 3: Extend Supabase schema for training planning and notifications

- [ ] Add `training_plans`
- [ ] Add `training_plan_days`
- [ ] Add `training_plan_comments`
- [ ] Add `app_notifications`
- [ ] Add indexes, helper functions, and RLS policies
- [ ] Add trigger-safe or app-safe fields for reminder dedupe and email sent state

## Task 4: Extend data layer for training plans and notifications

- [ ] Add types for plans, days, comments, notifications
- [ ] Add plan CRUD functions
- [ ] Add comment functions
- [ ] Add notification read/list functions
- [ ] Add save logic that creates notification events for:
  - publish
  - Technical Director comment
  - major schedule change

## Task 5: Build the real Training Schedule UI

- [ ] Replace placeholder `TrainingPage` with a complete planning workspace
- [ ] Add team + week selection
- [ ] Add 7-day board
- [ ] Add day editor
- [ ] Add comments panel
- [ ] Add draft/publish/archive actions
- [ ] Make layout mobile-safe

## Task 6: Add a global notification center

- [ ] Create `NotificationCenter`
- [ ] Show unread count in the app shell
- [ ] Load recent notifications
- [ ] Mark one or all as read
- [ ] Link into related training records

## Task 7: Add email delivery and reminder functions

- [ ] Add `notify-email.js` with Resend integration
- [ ] Add `training-reminders.js` scheduled function
- [ ] Wire function routing / scheduling in `netlify.toml`
- [ ] Ensure functions degrade cleanly if env vars are missing locally

## Task 8: Verification

- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Run `npm test`
- [ ] Smoke-test training plan creation locally against Supabase
- [ ] Verify reminder/notification creation logic

