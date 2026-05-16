# Transport Plans Design

## Goal

Add a production-ready `Transport Plans` module to the club management application. The module must let admins and transport staff organize away travel for club teams, assign drivers, set departure timing, keep status updates visible to the right people, and generate in-app plus email notifications for the agreed high-priority transport events.

## Scope

This slice covers:

- full transport planning by team
- support for match, training, and other trip contexts
- driver assignment
- departure date and time
- destination, meeting point, and notes
- transport comments / updates
- in-app notifications
- email notifications for important transport updates

This slice does **not** cover:

- WhatsApp integration
- route maps / GPS tracking
- seat-by-seat roster management
- vehicle maintenance tracking

## Product Model

### Teams and roles

The access foundation from Slice 1 stays in place:

- `admin`: full access
- `technical_director`: club-wide visibility and update access
- `driver`: sees and updates assigned transport entries
- `coach`: can view transport entries relevant to teams they are assigned to
- other roles: no transport entry unless later extended

### Transport planning model

A transport plan belongs to a single team and represents one planned trip.

Each plan:

- belongs to a single team
- has one context type:
  - `match`
  - `training`
  - `other`
- has a travel status:
  - `draft`
  - `published`
  - `updated`
  - `completed`
  - `cancelled`
- can have one assigned driver
- can receive comments and updates

Each transport plan stores:

- title
- context type
- event date
- departure time
- arrival target time
- origin / meeting point
- destination
- driver assignment
- contact notes
- travel notes
- status

### Driver assignment model

The assigned driver must be a user who has:

- the `driver` role

and ideally is also assigned to the relevant team, although admin and technical director can still see every transport plan.

### Status model

Transport plans use these statuses:

- `draft`
- `published`
- `updated`
- `completed`
- `cancelled`

Rules:

- first save creates or updates a `draft`
- first publish moves the plan to `published`
- later edits to a published plan move it to `updated`
- `completed` is used after the trip is done
- `cancelled` keeps an audit trail but should disappear from the default active list

## Notification model

### In-app notifications

Notifications are persisted in the same `app_notifications` table introduced in Slice 2.

Transport uses notification type:

- `transport_plan_updated`

Recipients should include:

- assigned driver
- admins
- technical director
- coaches assigned to the relevant team

### Email notifications

Transport sends email for these important events:

1. a transport plan is first published
2. a major transport update changes departure time, destination, or assigned driver
3. a transport plan is cancelled

The email infrastructure already exists from Slice 2. This slice plugs into it using the same function layer.

### Major transport change

A major transport change means a published or updated transport plan changes one of these fields for a future trip:

- departure date
- departure time
- arrival target time
- destination
- assigned driver

That event produces:

- in-app notification
- email notification

## Technical architecture

### Database tables

New tables:

- `transport_plans`
- `transport_plan_comments`

`transport_plans` stores the trip definition and driver assignment.  
`transport_plan_comments` stores operational discussion and updates around the trip.

The existing `app_notifications` table is reused.

### Server responsibilities

Frontend remains responsible for:

- listing and filtering transport plans
- editing transport plans
- driver assignment UI
- reading comments

Netlify functions are responsible for:

- sending notification emails
- optionally scheduled reminder delivery later if needed

### Email provider

Use the same transport-safe transactional mail setup already introduced for training and onboarding.

Required env vars:

- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`

## UI design

### Transport page

The placeholder transport page becomes a real transport workspace with:

- team selector
- status filter
- plan list / mobile cards
- primary actions: save draft, publish, mark completed, cancel
- transport detail editor
- assigned driver selector
- comments panel

The page must work well on desktop and mobile PWA layouts.

### Driver experience

Drivers should land in a simpler view:

- assigned trips
- departure time
- destination
- quick notes / comments

Admins and technical director keep the full planning workspace.

## Security and access rules

RLS must enforce:

- admins can read and write everything
- technical director can read and update transport plans club-wide
- drivers can read only transport plans assigned to them
- coaches can read transport plans for teams assigned to them
- users can read only comments and notifications relevant to entries they can access

## Verification requirements

Slice 3 is only done when all of the following work:

- admin can create and publish a transport plan
- admin can assign a driver
- assigned driver can see the plan
- technical director can comment
- changing departure time / driver / destination on a published plan creates important notifications
- completed and cancelled states behave correctly
- transport notifications appear in-app
- email dispatch uses the existing function layer without frontend secrets
