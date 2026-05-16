# Staff Accounts Hardening Design

## Goal

Make staff onboarding and access management resilient enough for real club use even when the email provider is incomplete, rate-limited, or not yet fully branded.

## Scope

This slice covers:

- resilient invite delivery responses
- manual activation-link fallback for admins
- clearer invitation action states in `Settings`
- stronger pending-invitation handling
- clearer acceptance-state messaging in `AcceptInvitation`

This slice does **not** cover:

- new role types
- new access tables
- domain verification in Resend
- WhatsApp or SMS delivery

## Product Rules

- If email sends successfully, the admin sees a clean success response.
- If email is skipped or fails, the invitation still exists and the admin gets a fresh activation link they can copy manually.
- Existing users still get access applied immediately.
- Pending users can always be recovered through admin actions without SQL.

## Key Behaviors

### Invite creation

- `existing_user`
  - access is applied immediately
  - email delivery is best-effort
  - admin still sees whether delivery succeeded or not

- `new_user`
  - invitation is created
  - a Supabase auth action link is generated
  - email delivery is attempted
  - if delivery is skipped or fails, the admin receives the activation link in UI

### Pending invitation actions

Admin can:

- resend invite email
- cancel invite
- copy a fresh activation link

### Accept invitation

The accept page should explain:

- pending and ready
- already accepted
- cancelled
- expired
- invalid session / wrong device

## No Schema Changes

This slice reuses the current invitation tables and does not need new database migrations.
