# Invite Staff / Onboarding Design

## Goal

Add a production-ready `Invite Staff` and `Onboarding` flow to the club management application. Admins must be able to invite coaches, drivers, scouts, board observers, technical staff, and other club users directly from the UI, assign roles and teams up front, and let invited users complete access through email without touching the database.

## Scope

This slice covers:

- inviting staff by email from the admin UI
- pre-assigning one or more roles to the invited person
- pre-assigning one or more teams to the invited person
- handling both new emails and already-existing accounts
- sending invite or access-update emails from the server
- letting a new invited user set their password and complete access through the app
- showing invitation history and pending invitation state to admins
- allowing admins to resend or cancel invitations

This slice does **not** cover:

- WhatsApp onboarding
- bulk CSV import of staff
- SSO or enterprise identity
- board-approval workflows

## Product Model

### Admin workflow

Admins manage staff from `Settings > Club Access`.

The admin can:

- enter name and email
- choose one or more roles
- choose one or more teams
- send an invitation

After sending, the system must decide whether the email already belongs to an existing account.

### Existing user behavior

If the email already exists in the system:

- the system must attach the selected roles
- the system must attach the selected teams
- the system must not ask the user to sign up again
- the system must send an email confirming that access has been added or updated
- the invited user must see the new modules after their next login or session refresh

This is the agreed default behavior and should not be blocked behind a second admin confirmation.

### New user behavior

If the email does not exist yet:

- the system creates a pending invitation
- the invitation stores name, email, assigned roles, assigned teams, inviter, and status
- the system sends an email containing a secure access-completion link
- the invited person lands in the app and sets their password
- after successful password setup, the invitation is marked accepted
- the assigned roles and teams become active on the new account immediately

### Invitation statuses

Invitations use these statuses:

- `pending`
- `accepted`
- `cancelled`
- `expired`

Rules:

- newly created invitations start as `pending`
- password completion marks the invitation `accepted`
- admin cancellation marks the invitation `cancelled`
- old pending invitations can become `expired` based on token validity or explicit cleanup logic

## UX Design

### Club Access page

The existing `Club Access` section grows into three coordinated areas:

1. `Invite Staff`
2. `Pending Invitations`
3. `Current Staff Access`

#### Invite Staff

The invite form contains:

- full name
- email
- role multi-select
- team multi-select
- primary action button: `Send Invite`

Validation rules:

- email is required and normalized
- at least one role is required
- team selection is required only for team-scoped roles such as `coach`
- duplicate team or role selections are prevented

#### Pending Invitations

Admins must see:

- invited name
- email
- assigned roles
- assigned teams
- inviter
- created date
- current status

Available actions:

- `Resend Invite`
- `Cancel Invite`

#### Current Staff Access

This keeps the existing user-role-team assignment experience for users who already exist. It stays useful for manual adjustments after onboarding.

### Invite acceptance screen

When a new invited user opens the invite link, they land on an `Accept Invitation` screen.

The screen shows:

- club branding
- invited email
- assigned roles
- assigned teams
- password field
- confirm password field
- primary action: `Activate Account`

Behavior:

- if the invite token is valid, the user can set their password and activate the account
- if the invite is invalid, expired, or cancelled, the UI must show a clear recovery message
- if the account already exists and the invite has already been applied, the user is sent to login with a success message

## Technical Architecture

### Database model

New tables:

- `staff_invitations`
- `staff_invitation_roles`
- `staff_invitation_teams`

`staff_invitations` stores invitation metadata and lifecycle state.  
`staff_invitation_roles` stores the roles queued for the invitation.  
`staff_invitation_teams` stores the teams queued for the invitation.

The model must support both:

- pending invite to a not-yet-created account
- invitation metadata for audit/history even after acceptance

### Server-side responsibilities

Sensitive invitation logic must run on the server, not in the browser.

We need Netlify functions for:

- creating invitations
- resolving whether the email already exists
- assigning roles and teams to existing users
- sending invite emails
- resending invitations
- cancelling invitations
- completing invitation acceptance for new users

These functions use the service role and must validate that the caller is an authenticated admin before changing club access.

### Email behavior

Use the same email infrastructure already introduced for notifications.

Required email types:

- `staff_invited`
- `staff_access_updated`
- `staff_invite_resent`

The invite email must contain:

- club name
- invited roles
- invited teams
- access link
- short explanation of what the person is being invited to use

## Auth and account lifecycle

### Existing accounts

For existing accounts:

- no new auth user is created
- no signup flow runs
- roles and teams are assigned directly
- the system records the invitation as applied or accepted through the existing-user path

### New accounts

For new accounts:

- the system creates or prepares an auth invitation path
- the user completes password creation from the email link
- after password creation, the invitation is resolved against the new auth user id
- the roles and teams are written to `user_roles` and `user_team_assignments`

This flow must share the same trust boundary as password recovery and other auth-completion flows. We should reuse the existing reset-password style URL handling pattern instead of inventing a second unrelated mechanism.

## Security and access rules

RLS and server checks must enforce:

- only admins can create, resend, cancel, or apply invitations
- non-admin users cannot inspect all invitations
- invited users can only complete the invitation addressed to them
- invitation tokens cannot be reused after acceptance or cancellation
- role and team assignment writes happen only through validated admin operations

Audit fields are required:

- inviter id
- created at
- updated at
- accepted at
- cancelled at
- resolved user id when accepted

## Edge cases

The flow must handle these cases cleanly:

- email already exists
- invited user already has some of the selected roles
- invited user already has some of the selected teams
- repeated resend requests
- cancelled invite opened later
- expired invite opened later
- admin changes role strategy after invitation but before acceptance

Rule for repeated or overlapping access:

- role assignment is additive
- team assignment is additive
- no duplicates are created

## Verification requirements

This slice is only done when all of the following work:

- admin can invite a brand-new user from the UI
- invited user receives email and can set a password
- accepted invitation creates active app access with the right roles and teams
- admin can invite an email that already exists
- existing user receives updated access without signing up again
- admin can resend a pending invite
- admin can cancel a pending invite
- pending invitations are visible in the UI
- current staff access still works for post-onboarding edits
- all invitation writes are blocked for non-admin users
