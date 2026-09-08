# Team Manager and squad age — QA 2026-09-08

## Scope and environment

Application: mwos-hub.com (Vercel Git integration). Database: Supabase project xpswwuhdodzzdvrxypdj.
Feature branch: codex/team-manager-and-squad-age. This report distinguishes local application verification against the live database from production frontend verification.

## Implemented requirements

- Team Manager: assigned-team fixtures and transport, driver selection limited to shared teams; squad selection remains with coaches/technical director/admin. No scouting, training editing, oversight or staff-administration module access.
- Optional roster date of birth, with future/invalid dates rejected. Average completed age of active players with valid DOB appears below Shape of the squad. Missing dates are excluded and coverage is shown; no invented ages.
- Updated Code of Conduct is pending the actual PDF. The supplied screenshot contains only its filename.

## Verification completed before deployment

- 229 unit tests across 38 files passed; TypeScript and production build passed.
- Full isolated migration chain, eight-role access matrix, cross-team write denial, squad separation, driver revocation, team revocation, future DOB constraint, invitation acceptance/replay/cancellation/expiry passed.
- 89 live API assertions passed using local application handlers and production Supabase: eight roles invited using manual activation links (no email delivery), activation verified, access unavailable before acceptance, exact roles granted, replay idempotent, other-team access and privileged endpoint boundaries, manager fixture/transport creation, sporting selection denied, DOB response, same-token access revocation.
- Temporary accounts and records created by the API run were removed by exact ID; the retained manager account supports subsequent browser QA.
- Browser: admin Player Hub at 390px and 1440px, empty average state, QA roster creation/edit with native date keyboard interaction, recalculation to 26.0 years with 1/31 coverage. The browser automation's date fill alone did not dispatch the React change; native keyboard change verified persistence.
- Browser: manager login, role-specific mobile menu, only First Team available, transport draft creation and persisted list entry, eligible-driver dropdown, disabled squad controls, desktop layout without horizontal overflow.

## Defects found and corrected

1. Transport INSERT RETURNING failed RLS: SELECT policy re-read the newly inserted row via a STABLE helper. Replaced with direct row predicates without changing team/role scope. Added isolated INSERT RETURNING regression checks for admin, technical director, coach, manager and driver. Applied migration 20260908110941 in the correct live project.
2. Manager fixture save attempted sporting squad save after successfully creating the fixture, yielding a misleading permission error. Fixture flow now skips squad persistence when canManageSquad is false.
3. Manager driver names could be hidden by profile RLS. Names now use the restricted shared-team driver RPC; missing driver shows Unassigned.

## Limits

This is feature-focused QA, not proof that every historical application function has passed exhaustive manual testing. Live email delivery, password creation through the UI, every device/browser, and every publish/export workflow are not covered here. Test trips were drafts to avoid notifying real club staff. Production frontend deployment and post-deploy verification must be recorded separately before declaring the new features live.
