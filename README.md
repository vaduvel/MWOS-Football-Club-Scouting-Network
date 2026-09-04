# MWOS Club Management

MWOS Club Management este workspace-ul intern al clubului pentru:

- `training planning`
- `transport coordination`
- `scouting reports`
- `leadership oversight`
- `staff onboarding`

Aplicația rulează cu:

- frontend React + Vite
- Supabase pentru auth și baza de date
- Netlify Functions pentru onboarding, notificări și integrări server-side

## Module livrate

- `Club Home`
  - homepage role-aware pentru admin, technical director, board observer, coach, driver și scout
- `Training`
  - plan săptămânal pe echipă
  - microciclu pe 7 zile
  - comentarii și notificări
- `Transport`
  - planuri de deplasare
  - comentarii și statusuri operaționale
- `Scouting`
  - reports
  - player hub
  - reviews
  - export
- `Oversight`
  - leadership workspace
  - attention rails
  - invitații, training și transport într-o vedere unificată
- `Settings`
  - club roles și team assignments
  - invite by email
  - manual invite links
  - WhatsApp-first onboarding
  - launch readiness / integration status

## Roluri

- `Admin`
- `Technical Director`
- `Coach`
- `Driver`
- `Scout`
- `Board Observer`

Un user poate avea mai multe roluri și mai multe echipe pe același cont.

## Setup local

1. Instalează dependențele:
   ```bash
   npm install
   ```
2. Copiază variabilele din [`.env.example`](/Users/vaduvageorge/Desktop/Scout%20Report%20Builder/.env.example) în `.env.local`.
3. Creează sau leagă proiectul Supabase.
4. Rulează schema din [supabase/schema.sql](/Users/vaduvageorge/Desktop/Scout%20Report%20Builder/supabase/schema.sql) în `SQL Editor`.
5. Completează minim:
   - `VITE_APP_URL`
   - `APP_BASE_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Pornește aplicația:
   ```bash
   npm run dev
   ```

## Variabile de mediu

### Client

- `VITE_APP_URL`
  - URL-ul public al aplicației pentru linkuri de invite și reset
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_NETLIFY_FUNCTIONS_BASE_URL`
  - implicit `/.netlify/functions`

### Server / Netlify Functions

- `APP_BASE_URL`
  - fallback server-side pentru linkuri publice
- `RELEASE_BRANCH`
  - opțional; folosit de runtime status pentru a compara buildul curent cu branchul de release urmărit
- `SUPABASE_SERVICE_ROLE_KEY`
  - necesar pentru onboarding și notificări server-side
- `GOOGLE_CLOUD_VISION_API_KEY`
  - OCR pentru rapoarte scrise de mână
- `GEMINI_API_KEY`
  - admin AI / leadership insights
- `RESEND_API_KEY`
  - doar dacă vrei email delivery real din aplicație
- `NOTIFICATION_FROM_EMAIL`
- `NOTIFICATION_REPLY_TO_EMAIL`

## Onboarding staff

Există trei moduri reale de onboarding:

1. `Send Email Invite`
   - cere email delivery configurat
2. `Create Share Link`
   - funcționează fără Resend
3. `Share on WhatsApp`
   - funcționează fără Resend

Important:

- dacă `Resend` nu e configurat, aplicația rămâne folosibilă
- adminul poate invita staff-ul prin `manual link` sau `WhatsApp`
- `Settings -> Launch Readiness` explică limpede în ce mod operează sistemul

## Arhitectură și deploy în producție

Platforma finală este:

- **Vercel** pentru frontendul Vite/React și funcțiile serverless din `/api`
- **Supabase** pentru Auth, PostgreSQL, roluri, echipe și RLS
- **Resend** pentru emailurile trimise din funcțiile serverless
- `https://mwos-hub.com` este domeniul Vercel de producție

Proiectul Vercel este `scout-report-builder`. Configurația versionată este în
[`vercel.json`](vercel.json), iar adaptorul API este în [`api/[...slug].ts`](api/%5B...slug%5D.ts).

Fluxul de release:

1. Se creează un branch `codex/*` sau `feat/*` și se publică în GitHub.
2. Integrarea GitHub–Vercel creează automat un **Preview Deployment**.
3. Se rulează smoke testele și testele browser pe URL-ul Preview.
4. Branch-ul se integrează în `main` numai după validare.
5. Vercel publică automat commitul din `main` pe `https://mwos-hub.com`.

Environment variables necesare în Vercel:

- `VITE_APP_URL=https://mwos-hub.com`
- `APP_BASE_URL=https://mwos-hub.com`
- `VITE_SERVERLESS_FUNCTIONS_BASE_URL=/api`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- opțional: `GEMINI_API_KEY`
- opțional: `RESEND_API_KEY`
- opțional: `NOTIFICATION_FROM_EMAIL`
- opțional: `NOTIFICATION_REPLY_TO_EMAIL`

`netlify.toml`, URL-urile Netlify și folderul istoric `netlify/functions` sunt păstrate temporar
doar pentru compatibilitate. Nu reprezintă fluxul curent de producție și nu trebuie folosite pentru
deploy-uri noi. Funcțiile din acel folder sunt executate în producție prin adaptorul Vercel `/api`.

## Configurare Supabase Auth

În `Authentication -> URL Configuration`:

- `Site URL`
  - `https://mwos-hub.com`

- `Redirect URLs`
  - `https://mwos-hub.com/accept-invite`
  - `https://mwos-hub.com/reset-password`
  - `https://www.mwos-hub.com/accept-invite`
  - `https://www.mwos-hub.com/reset-password`
  - `https://scout-report-builder.vercel.app/accept-invite`
  - `https://scout-report-builder.vercel.app/reset-password`
  - `https://club-management-preview--scout-report-builder.netlify.app/accept-invite`
  - `https://club-management-preview--scout-report-builder.netlify.app/reset-password`
  - `https://scout-report-builder.netlify.app/accept-invite`
  - `https://scout-report-builder.netlify.app/reset-password`
  - `http://127.0.0.1:3005/accept-invite`
  - `http://127.0.0.1:3005/reset-password`
  - opțional și `localhost:3005` dacă îl folosești

Fără asta:

- invite links
- reset password

pot cădea pe URL-uri greșite.

## Verificare înainte de lansare

Rulează:

```bash
npm run verify
```

Asta execută:

- `npm test`
- `npm run lint`
- `npm run build`

Pentru un snapshot de lansare cu un cont real de admin:

```bash
npm run smoke:release -- you@example.com your-password
```

Scriptul verifică:

- login admin
- roluri
- launch readiness verdict
- statusurile AI / email delivery
- counts pentru invites, training, transport și reports

În aplicație, verifică apoi:

- `Settings -> Launch Readiness`
- `Settings -> Deployment Runtime`
- `Settings -> Invite & Alert Delivery`
- `Settings -> Admin AI Integration`
- `Settings -> Club Access`

Pentru o verificare rapidă a role surface-urilor de QA:

```bash
npm run smoke:roles
```

Scriptul confirmă pentru conturile QA standard:

- `admin`
- `technical_director`
- `board_observer`
- `coach`
- `driver`
- `scout`

și validează:

- `Club Home` mode
- `Leadership` mode
- expunerea modulelor principale pe rol

Pentru snapshotul complet de lansare:

```bash
npm run smoke:final -- you@example.com your-password
```

Acesta combină:

- `smoke:release`
- `smoke:roles`

## Starea emailurilor

Fără domeniu verificat în Resend:

- onboardingul merge prin `manual links`
- onboardingul merge prin `WhatsApp sharing`
- email delivery automat rămâne opțional

Cu domeniu verificat în Resend:

- poți seta:
  - `NOTIFICATION_FROM_EMAIL=MWOS Club Management <notifications@your-domain.com>`
- invitațiile și alertele importante pleacă direct prin email

## Curățare operațională

Adminul poate acum:

- reasigna roluri și echipe
- revoca accesul fără a șterge userul
- re-emite linkuri
- expira invitațiile stale din pending queue

Pentru cleanup final înainte de go-live:

- șterge aliasurile/test users din Supabase Auth
- expiră sau anulează invite-urile vechi
- păstrează doar conturile reale ale staff-ului

Dry-run pentru cleanup de QA data:

```bash
npm run cleanup:test-data
```

Aplicare explicită:

```bash
npm run cleanup:test-data -- --apply --invitations
npm run cleanup:test-data -- --apply --users
npm run cleanup:test-data -- --apply --users --invitations
```

Scriptul este intenționat sigur:

- implicit doar raportează
- nu șterge nimic fără `--apply`
- nu șterge users dacă nu îi ceri explicit `--users`
