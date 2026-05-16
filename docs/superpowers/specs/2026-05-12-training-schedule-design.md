# Training Schedule Design

## Goal

Add a production-ready `Training Schedule` module to the club management application. The module must let coaches build and update weekly microcycles for their assigned teams, allow the Technical Director to review and comment, and generate in-app plus email notifications for the agreed high-priority events.

## Scope

This slice covers:

- full weekly training planning by team
- 7-day microcycle structure
- support for training, active recovery, and rest days
- daily session planning with focus, type, intensity, volume, time, location, exercises, and notes
- comments on plans from coaches, admins, and Technical Director
- in-app notifications
- email notifications for high-priority events
- a scheduled reminder flow for sessions starting in 30 minutes

This slice does **not** cover:

- transport planning screens
- WhatsApp integration
- native push notifications

## Product Model

### Teams and roles

The access foundation from Slice 1 stays in place:

- `admin`: full access
- `technical_director`: club-wide access to training plans and comments
- `coach`: can manage plans for assigned teams
- other roles: no entry to training planning unless later extended

### Training planning model

A training plan belongs to a single team and a single week.

Each plan:

- has a `week_start` date
- covers exactly 7 ordered days
- is authored and maintained by staff users
- may be updated after publication
- can receive comments

Each day can be one of:

- `training`
- `active_recovery`
- `rest`

When the day is `training`, the system stores:

- session title
- session type
- start time
- end time
- location
- focus tags
- intensity
- volume
- objectives
- exercises / content
- coach notes

When the day is `active_recovery` or `rest`, the system stores:

- label / title
- optional notes

### Status model

Training plans use these statuses:

- `draft`
- `published`
- `updated`
- `archived`

Rules:

- first save creates or updates a `draft`
- first publish moves the plan to `published`
- later edits to a published plan move it to `updated`
- archived plans become read-only in normal coach workflow

## Notification model

### In-app notifications

Notifications are persisted in the database and shown inside the application through a notification center.

Each notification stores:

- recipient
- type
- title
- message
- link path
- related team
- related training plan
- related day when applicable
- actor
- read state
- email delivery state

### Email notifications

The same notification event is the source of truth for email delivery.

Email is sent only for these high-priority events:

1. training plan published
2. Technical Director comment on a training plan
3. training reminder 30 minutes before a training session
4. major schedule change on a published training session
5. transport plan new or updated

In this slice, we implement email sending for the first four because the transport module is still a later slice. The notification infrastructure must still support the transport event type so Slice 3 can plug into it directly.

### Major schedule change

A major schedule change means a published or updated training day changes one of these fields for a future `training` session:

- date
- start time
- end time
- location

That event produces:

- in-app notification
- email notification

### Reminder job

A scheduled function checks upcoming training days and emits notifications for sessions starting in the next 30 minutes. Each day stores reminder state so reminders are not duplicated.

## Technical architecture

### Database tables

New tables:

- `training_plans`
- `training_plan_days`
- `training_plan_comments`
- `app_notifications`

`training_plans` represents the weekly shell.  
`training_plan_days` stores the 7 ordered days for the week.  
`training_plan_comments` stores discussion and Technical Director feedback.  
`app_notifications` stores in-app and email delivery events.

### Server responsibilities

Frontend remains responsible for:

- plan editing
- listing and filtering
- reading notifications
- marking notifications as read

Netlify functions are responsible for:

- sending email notifications
- scheduled training reminders

### Email provider

Use `Resend` for transactional mail. It has a free tier and keeps delivery responsibilities out of the frontend. The app uses environment variables, not hard-coded credentials.

Required env vars:

- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`

Optional:

- `NOTIFICATION_REPLY_TO_EMAIL`

## UI design

### Training page

The placeholder training page becomes a real planning workspace with:

- team selector
- week selector
- plan status
- primary actions: save draft, publish, archive
- 7-day microcycle board
- detail editor for the selected day
- comments panel
- activity summary

The page must work well on desktop and mobile PWA layouts.

### Notification center

Add a global notification center accessible from the app shell. It shows:

- unread count
- grouped recent notifications
- read/unread state
- quick link into the related screen

## Security and access rules

RLS must enforce:

- coaches can read and write only plans for teams assigned to them
- technical director can read all plans and write comments, but cannot impersonate coaches
- admins can read and write everything
- non-training roles have no access to training tables unless explicitly allowed later
- recipients can read only their own notifications

## Verification requirements

Slice 2 is only done when all of the following work:

- coach can create a weekly plan for an assigned team
- coach can publish the plan
- Technical Director can comment
- comments create notifications
- editing a published session time/location creates important-change notifications
- reminder job can emit a 30-minute reminder
- unread notifications appear in-app and can be marked read
- email dispatch runs through the function layer without frontend secrets

