# Manual Invite Links Design

## Goal

Make staff onboarding work reliably before the club has a verified email domain by treating manual invite links and WhatsApp sharing as first-class admin actions.

## Why This Slice Exists

The current invite flow already creates valid onboarding links, but email delivery still depends on Resend sandbox limits or a future verified domain. The club needs a real workflow now: admin creates access, copies or shares the link, and the staff member opens it directly on phone.

## Scope

This slice covers:

- creating a staff invite without attempting email delivery
- returning a valid activation link immediately
- first-class UI actions for:
  - `Send Email Invite`
  - `Create Share Link`
  - `Share on WhatsApp`
- sharing pending invites again from the admin workspace
- clear admin-facing copy that explains when email is optional vs required

This slice does not cover:

- phone-number auth
- SMS delivery
- custom WhatsApp Business API integration
- changing the underlying email/password identity model

## Product Rules

- Email remains the user identity for accounts.
- Admin can invite by email delivery or by manual link delivery.
- Manual-link delivery must not depend on Resend being configured.
- A manual link must be safe to share, expire with the invitation, and remain cancelable by admin.
- Existing users still get access applied immediately.
- New users invited through manual link still go through the same `Accept Invitation` flow and set their password there.

## User Flows

### 1. Manual invite for a new user

1. Admin enters name, email, roles, and teams.
2. Admin chooses `Create Share Link` or `Share on WhatsApp`.
3. App creates the invitation and generates the Supabase verification link with the correct `redirect_to` back into the app.
4. App shows the link immediately.
5. Admin copies it or shares it through WhatsApp.
6. Staff member opens the link, lands in `Accept Invitation`, sets password, and gets the assigned access.

### 2. Email invite for a new user

1. Admin chooses `Send Email Invite`.
2. App attempts email delivery.
3. If delivery fails or is skipped, the app still returns the activation link and offers copy/share actions.

### 3. Existing user access update

1. Admin invites an email that already has an account.
2. App applies access immediately.
3. If admin chose email, we still try confirmation email.
4. If admin chose manual share, we show a clean message that access is already live and offer the login URL instead of an activation flow.

### 4. Pending invitation follow-up

Admin can reopen a pending invite and:

- resend email
- copy a fresh activation link
- share the fresh link on WhatsApp
- cancel the invite

## Architecture

### Server

`invite-staff` accepts a delivery mode:

- `email`
- `manual_link`
- `whatsapp_share`

`manual_link` and `whatsapp_share` skip email delivery for new users and immediately return the activation link. For existing users they return a success payload plus the normal login URL.

`issue-staff-invite-link` remains the refresh path for pending invites and is reused by WhatsApp-share actions.

### Client

`SettingsPage` becomes explicit about delivery choice:

- primary button group instead of one generic submit button
- activation/share notice becomes richer and action-oriented
- pending invites get a dedicated WhatsApp button

Domain helpers centralize:

- invite delivery labels
- share text generation
- WhatsApp URL generation

## UX Copy

- `Send Email Invite`
- `Create Share Link`
- `Share on WhatsApp`
- `Activation link ready`
- `Share link ready`
- `Access updated — send login manually`

The admin should never be left guessing whether the invite was created, emailed, or needs manual sharing.

## Validation

- team-scoped roles still require at least one team
- manual-link mode must return a link for new users
- WhatsApp-share action must work even if clipboard/share APIs are unavailable by falling back to opening the `wa.me` URL

## Success Criteria

- Admin can onboard a new staff member without working email delivery.
- App can generate and reuse activation links safely.
- WhatsApp sharing is available directly from the admin workflow.
- Existing user and new user paths both remain clear and correct.
