# Database deployment boundaries

Production frontend/API: Vercel `scout-report-builder`, https://mwos-hub.com.
Production database/Auth/Storage: Supabase `xpswwuhdodzzdvrxypdj`.
The `netlify/functions` folder is shared implementation code, not evidence of Netlify hosting.

## Fresh projects and previews

`20260518000000_fresh_project_foundation.sql` is intentionally ordered before the first incremental migration. It reconstructs the historical foundation and the missing announcement/Queens additions from the Git commits documented in its header. Apply the complete migrations directory in timestamp order.

The foundation does nothing if all original foundation tables exist. It refuses a partial/unrelated public schema or pre-existing Auth/Storage data. It never imports production users or data. Roles are provisioned by trusted administrators; neither signup metadata nor editable profile labels grant access.

`npm run verify:migrations` runs the whole chain in PGlite (PostgreSQL), checks repeat-bootstrap behavior, rejects unsafe bootstrap targets, and tests signup/profile privilege escalation. Auth and Storage service-owned structures are minimal test fixtures; this test does not replace a real Supabase preview check or live API QA.

## Existing production project

Do **not** run `db push --include-all` or the entire canonical `schema.sql` against production. The existing production migration ledger has historical timestamp differences and SQL-editor-applied changes. Reconcile it migration by migration with read-only schema comparison before adopting automatic full-chain production pushes.

The trusted-role/report-authoring repair was applied directly via a targeted migration and is recorded as `20260905175056`. The local file has the same version. It is additive/restrictive authorization repair, not a data rewrite.

`schema.sql` documents the current setup, but the migrations are the executable path for fresh environments. The foundation is not a mechanism for repairing partially provisioned projects.
