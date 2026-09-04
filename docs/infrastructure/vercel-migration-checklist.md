# Vercel Migration Checklist

Last updated: 2026-09-04

## Goal

Keep MWOS Club Management standardized on Vercel production and finish removing the remaining Netlify-era naming and configuration without breaking `mwos-hub.com`.

## Current state

- Current production domain: `https://mwos-hub.com` on Vercel
- Vercel project: `daniels-projects-cb179d85/scout-report-builder`
- Vercel project id: `prj_od3xuvwheCXDXYIGWtDg9bYmoAwt`
- Vercel production URL: `https://scout-report-builder.vercel.app`
- GitHub `main` deployments are created by the Vercel Git integration
- Supabase provides Auth and PostgreSQL for the production runtime
- The former Netlify site remains reachable only as a legacy deployment

## Safe migration principle

Do not move the domain first.

Order:

1. Make Vercel production fully functional on its own URL.
2. Run feature smoke tests on the Vercel URL.
3. Confirm Supabase redirect URLs include the final domain and any Vercel URL used for invite/reset testing.
4. Switch `mwos-hub.com` DNS only after end-to-end verification passes.

## Required environment variables in Vercel

Frontend/runtime:

- `VITE_APP_URL`
- `APP_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SERVERLESS_FUNCTIONS_BASE_URL`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`
- `NOTIFICATION_REPLY_TO_EMAIL`
- `GOOGLE_CLOUD_VISION_API_KEY`
- `GEMINI_API_KEY`
- `RELEASE_BRANCH`

Recommended initial values:

- `VITE_APP_URL=https://mwos-hub.com`
- `APP_BASE_URL=https://mwos-hub.com`
- `VITE_SERVERLESS_FUNCTIONS_BASE_URL=/api`

## Current Netlify-specific frontend touchpoints

These are already partially abstracted by `VITE_SERVERLESS_FUNCTIONS_BASE_URL`:

- `src/lib/data.ts`
- `src/lib/trainingData.ts`
- `src/lib/transportData.ts`
- `src/components/MissingConfigScreen.tsx`
- `.env.example`

## Netlify functions to port

### Priority 1: core app flows

- `accept-staff-invite`
- `cancel-staff-invite`
- `invite-staff`
- `issue-staff-invite-link`
- `resend-staff-invite`
- `notify-email`
- `ocr-report`
- `admin-email-status`
- `admin-app-runtime-status`

### Priority 2: admin and AI helpers

- `admin-ai-chat`
- `admin-ai-insights`
- `admin-ai-status`

### Priority 3: maintenance and scheduled work

- `expire-staff-invites`
- `training-reminders`
- `football-search`
- `football-squad`

### Shared modules to keep aligned

- `_shared.js`
- `_staff-invitations.js`
- `_notification-core.js`

## Porting notes

### Straightforward to port

These are normal HTTP handlers using:

- request body parsing
- bearer auth
- Supabase clients
- external APIs such as Resend or Google Vision

They can move into Vercel Functions with request/response adaptation.

### Needs deliberate adaptation

- `training-reminders.js`
  - currently uses Netlify schedule config
  - should become a Vercel cron endpoint

- runtime URL logic in `_shared.js`
  - currently reads Netlify envs such as `URL`, `DEPLOY_PRIME_URL`, `CONTEXT`
  - should gain Vercel-aware fallbacks before cutover

- Supabase redirect URLs
  - currently include Netlify preview and production URLs
  - need Vercel accept-invite and reset-password URLs added before testing

## Suggested implementation phases

### Phase 1: prep without cutover

- add Vercel env vars
- add Vercel-aware runtime helpers
- port one function end-to-end as a reference
- verify frontend still works with `/api`

### Phase 2: port critical functions

- staff invite flows
- email status/runtime status
- OCR endpoint

### Phase 3: port scheduled jobs

- training reminders
- invitation expiry

### Phase 4: validation

Run on Vercel URL:

- login
- logout
- password reset
- accept invite
- issue invite link
- resend invite
- OCR import
- training publish and notification
- transport publish and notification

### Phase 5: cutover

- add `mwos-hub.com` to Vercel
- update DNS in Cloudflare
- set `VITE_APP_URL` and `APP_BASE_URL` to `https://mwos-hub.com`
- update Supabase redirect URLs again for final domain

## Current validation

- TypeScript lint passes.
- Production build passes.
- Latest Vercel preview serves the SPA login screen.
- Latest Vercel preview routes `/api/*` to the migrated function adapter.
- Legacy `/.netlify/functions/*` URLs are routed to the same Vercel adapter for compatibility.
- Release readiness and role surface smoke tests pass against the shared Supabase project.

## Remaining cleanup after cutover

- Confirm the Vercel billing plan before moving the 5-minute training reminder schedule. Hobby permits only daily cron jobs; Pro permits per-minute schedules.
- Add `CRON_SECRET` and validate it in the reminder endpoint before enabling a Vercel cron.
- Rename the historical `netlify/functions` folder to a platform-neutral handler folder in a separate refactor.
- Remove legacy Netlify URLs from Supabase redirects only after all old invite/reset links have expired.
- Confirm whether the optional `GEMINI_API_KEY` should be enabled for the club assistant.

## Immediate next actions

1. Push changes to a branch and validate the Vercel Preview.
2. Test login, role access, invite reconciliation, report save and notification endpoints on Preview.
3. Merge into `main` only after the full verification passes.
4. Re-test the same flows on `https://mwos-hub.com` and inspect Vercel runtime errors.
