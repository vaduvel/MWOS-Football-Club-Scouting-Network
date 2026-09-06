# Database deployment boundaries

Production frontend/API: Vercel `scout-report-builder`, https://mwos-hub.com.
Production database/Auth/Storage: Supabase `xpswwuhdodzzdvrxypdj`.
The `netlify/functions` folder is shared implementation code, not evidence of Netlify hosting.

## Fresh projects and previews

`20260518000000_fresh_project_foundation.sql` is intentionally ordered before the first incremental migration. It reconstructs the historical foundation and the missing announcement/Queens additions from the Git commits documented in its header. Apply the complete migrations directory in timestamp order.

The foundation does nothing if all original foundation tables exist. It refuses a partial/unrelated public schema or pre-existing Auth/Storage data. It never imports production users or data. Roles are provisioned by trusted administrators; neither signup metadata nor editable profile labels grant access.

`npm run verify:migrations` runs the whole chain in PGlite (PostgreSQL), checks repeat-bootstrap behavior, rejects unsafe bootstrap targets, and tests signup/profile privilege escalation. Auth and Storage service-owned structures are minimal test fixtures; this test does not replace a real Supabase preview check or live API QA.

## Existing production project

Do **not** run the entire canonical `schema.sql` against production or blindly re-run applied historical migrations. On 6 September 2026 the live schema was compared with the successful Supabase preview: columns, constraints, triggers, table grants and RLS flags matched; the only policy/function difference was roster viewing and the only index difference was notification event-key inference. Targeted migration `20260906124344` aligned those differences.

After this comparison, five historical ledger timestamps were mapped to their corresponding repository versions, and eight already-present migrations/foundation states were recorded without re-executing their SQL. Two announcement migrations were recovered from the original production ledger into Git. All 18 repository versions/names now match production. The pre-reconciliation ledger is preserved in the local QA evidence folder. Future deployment should apply only genuinely new migrations.

The trusted-role/report-authoring repair was applied directly via a targeted migration and is recorded as `20260905175056`. The local file has the same version. It is additive/restrictive authorization repair, not a data rewrite.

`schema.sql` documents the current setup, but the migrations are the executable path for fresh environments. The foundation is not a mechanism for repairing partially provisioned projects.
