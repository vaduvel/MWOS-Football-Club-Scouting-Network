-- Fresh-project foundation recovered from 498035cdb32f70c950d4d0f8e59ef57c9ff23412.
-- Announcements/Queens additions recovered from a6f62595ff2039426ee9e3a805ae6aea9b2fa5d5.
-- Must run BEFORE 20260518080602. Existing complete foundations return unchanged.
-- Not a production repair: partial schemas or existing Auth/Storage data fail closed.
-- Deliberate security differences: user_roles is authoritative, signup role is Pending,
-- and table grants are explicit for projects without legacy automatic API exposure.

do $mwos_bootstrap$
declare
  expected_foundation constant text[] := array['profiles', 'user_settings', 'roles', 'teams', 'user_roles', 'user_team_assignments', 'staff_invitations', 'staff_invitation_roles', 'staff_invitation_teams', 'staff_access_events', 'training_plans', 'training_plan_days', 'training_plan_comments', 'transport_plans', 'transport_plan_comments', 'app_notifications', 'reports', 'players', 'player_reviews', 'watchlist_players', 'report_comments'];
  foundation_count integer;
  previous_check_function_bodies text := current_setting('check_function_bodies');
begin
  select count(*) into foundation_count
  from unnest(expected_foundation) as t(table_name)
  where to_regclass('public.' || table_name) is not null;

  if foundation_count = cardinality(expected_foundation) then
    raise notice 'MWOS foundation already exists; fresh-project bootstrap skipped without schema changes.';
    return;
  end if;

  if foundation_count > 0 or exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid and d.deptype = 'e'
      )
  ) then
    raise exception 'MWOS bootstrap refused: public contains a partial or unrelated schema. Reconcile it explicitly.';
  end if;

  if exists (select 1 from auth.users) or exists (select 1 from storage.objects) then
    raise exception 'MWOS bootstrap refused: Auth users or Storage objects already exist.';
  end if;

  -- The historical SQL declares some mutually referenced permission helpers later.
  -- Validate their definitions and RLS behavior after the complete migration chain.
  perform set_config('check_function_bodies', 'off', true);

  execute $mwos_foundation$
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  organization text,
  role text not null default 'Scout'
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  football_api_provider text not null default 'api-football',
  football_api_key text
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  age_group text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role_id)
);

create table if not exists public.user_team_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, team_id)
);

create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null,
  full_name text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled', 'expired', 'applied_existing')),
  invitation_token text not null unique,
  inviter_user_id uuid not null references auth.users (id) on delete cascade,
  resolved_user_id uuid references auth.users (id) on delete set null,
  message_type text not null default 'invite' check (message_type in ('invite', 'existing_access_update')),
  last_sent_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff_invitation_roles (
  invitation_id uuid not null references public.staff_invitations (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (invitation_id, role_id)
);

create table if not exists public.staff_invitation_teams (
  invitation_id uuid not null references public.staff_invitations (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (invitation_id, team_id)
);

create table if not exists public.staff_access_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_name text not null,
  actor_email text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  target_name text not null,
  target_email text not null,
  action_type text not null check (
    action_type in (
      'access_updated',
      'access_revoked',
      'invite_created',
      'invite_resent',
      'invite_cancelled',
      'invite_applied_existing',
      'invite_accepted'
    )
  ),
  role_labels text[] not null default array[]::text[],
  team_names text[] not null default array[]::text[],
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  week_start date not null,
  headline text,
  objective text,
  status text not null default 'draft' check (status in ('draft', 'published', 'updated', 'archived')),
  created_by uuid not null references auth.users (id) on delete cascade,
  updated_by uuid not null references auth.users (id) on delete cascade,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (team_id, week_start)
);

create table if not exists public.training_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans (id) on delete cascade,
  day_index integer not null check (day_index between 0 and 6),
  weekday_label text not null,
  calendar_date date not null,
  day_type text not null check (day_type in ('training', 'active_recovery', 'rest')),
  session_title text,
  session_type text not null default 'field' check (session_type in ('field', 'gym', 'conditioning', 'recovery', 'video', 'hybrid')),
  start_time time,
  end_time time,
  location text,
  focus_tags text[] not null default array[]::text[],
  intensity smallint not null default 1 check (intensity between 1 and 3),
  volume smallint not null default 1 check (volume between 1 and 3),
  objectives text,
  exercises text,
  notes text,
  reminder_sent_at timestamptz,
  last_major_change_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (plan_id, day_index)
);

create table if not exists public.training_plan_comments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans (id) on delete cascade,
  day_id uuid references public.training_plan_days (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  author_role_label text not null default '',
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transport_plans (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null,
  context_type text not null default 'match' check (context_type in ('match', 'training', 'other')),
  event_date date not null,
  departure_time time,
  arrival_target_time time,
  meeting_point text,
  destination text not null,
  driver_user_id uuid references auth.users (id) on delete set null,
  contact_notes text,
  travel_notes text,
  status text not null default 'draft' check (status in ('draft', 'published', 'updated', 'completed', 'cancelled')),
  created_by uuid not null references auth.users (id) on delete cascade,
  updated_by uuid not null references auth.users (id) on delete cascade,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transport_plan_comments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.transport_plans (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  author_role_label text not null default '',
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  type text not null check (type in ('training_plan_published', 'training_td_comment', 'training_session_reminder', 'training_schedule_changed', 'transport_plan_updated')),
  title text not null,
  message text not null,
  link_path text not null,
  team_id uuid references public.teams (id) on delete set null,
  training_plan_id uuid references public.training_plans (id) on delete cascade,
  training_day_id uuid references public.training_plan_days (id) on delete cascade,
  event_key text,
  email_enabled boolean not null default false,
  email_sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reports (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  competition text,
  date text,
  venue text,
  kickoff text,
  weather text,
  pitch text,
  home_team text,
  home_score integer,
  away_team text,
  away_score integer,
  scout_name text,
  focus text,
  general_notes text,
  home_manager text,
  away_manager text,
  formation_home text not null default '4-3-3',
  formation_away text not null default '4-3-3',
  video_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.reports add column if not exists video_url text;

create table if not exists public.players (
  id text primary key default gen_random_uuid()::text,
  report_id text not null references public.reports (id) on delete cascade,
  team_side text not null check (team_side in ('home', 'away')),
  shirt_number integer,
  name text,
  subbed text,
  goal text,
  rating numeric(3, 1),
  position_x numeric(5, 2) not null default 50,
  position_y numeric(5, 2) not null default 50,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.player_reviews (
  id text primary key default gen_random_uuid()::text,
  report_id text not null references public.reports (id) on delete cascade,
  player_id text references public.players (id) on delete cascade,
  overview text,
  strengths text,
  areas_to_improve text,
  pace integer not null default 3,
  strength integer not null default 3,
  stamina integer not null default 3,
  agility integer not null default 3,
  decision_making integer not null default 3,
  composure integer not null default 3,
  work_rate integer not null default 3,
  positioning integer not null default 3,
  recommendation_verdict text,
  potential_level text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.watchlist_players (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  player_key text not null,
  player_name text not null,
  club_label text,
  source_player_id text references public.players (id) on delete set null,
  source_report_id text references public.reports (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, player_key)
);

create table if not exists public.report_comments (
  id text primary key default gen_random_uuid()::text,
  report_id text not null references public.reports (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reports_user_id_idx on public.reports (user_id);
create index if not exists players_report_id_idx on public.players (report_id);
create index if not exists player_reviews_report_id_idx on public.player_reviews (report_id);
create index if not exists watchlist_players_user_id_idx on public.watchlist_players (user_id);
create index if not exists report_comments_report_id_idx on public.report_comments (report_id);
create index if not exists report_comments_author_id_idx on public.report_comments (author_id);
create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists user_roles_role_id_idx on public.user_roles (role_id);
create index if not exists user_team_assignments_user_id_idx on public.user_team_assignments (user_id);
create index if not exists user_team_assignments_team_id_idx on public.user_team_assignments (team_id);
create index if not exists staff_invitations_email_normalized_idx on public.staff_invitations (email_normalized);
create index if not exists staff_invitations_status_idx on public.staff_invitations (status);
create index if not exists staff_invitations_inviter_idx on public.staff_invitations (inviter_user_id);
create index if not exists staff_invitation_roles_role_id_idx on public.staff_invitation_roles (role_id);
create index if not exists staff_invitation_teams_team_id_idx on public.staff_invitation_teams (team_id);
create index if not exists staff_access_events_created_at_idx on public.staff_access_events (created_at desc);
create index if not exists staff_access_events_target_email_idx on public.staff_access_events (target_email);
create index if not exists training_plans_team_id_idx on public.training_plans (team_id);
create index if not exists training_plans_week_start_idx on public.training_plans (week_start);
create index if not exists training_plan_days_plan_id_idx on public.training_plan_days (plan_id);
create index if not exists training_plan_days_calendar_date_idx on public.training_plan_days (calendar_date);
create index if not exists training_plan_comments_plan_id_idx on public.training_plan_comments (plan_id);
create index if not exists training_plan_comments_author_id_idx on public.training_plan_comments (author_id);
create index if not exists transport_plans_team_id_idx on public.transport_plans (team_id);
create index if not exists transport_plans_event_date_idx on public.transport_plans (event_date);
create index if not exists transport_plans_driver_user_id_idx on public.transport_plans (driver_user_id);
create index if not exists transport_plans_status_idx on public.transport_plans (status);
create index if not exists transport_plan_comments_plan_id_idx on public.transport_plan_comments (plan_id);
create index if not exists transport_plan_comments_author_id_idx on public.transport_plan_comments (author_id);
create index if not exists app_notifications_recipient_idx on public.app_notifications (recipient_user_id, created_at desc);
drop index if exists public.app_notifications_event_key_idx;
create unique index if not exists app_notifications_event_key_idx on public.app_notifications (recipient_user_id, event_key);

insert into public.roles (slug, label, description)
values
  ('admin', 'Admin', 'Full club-wide access'),
  ('technical_director', 'Technical Director', 'Club-wide read and comment access'),
  ('coach', 'Coach', 'Team-specific training access'),
  ('driver', 'Driver', 'Transport-focused access'),
  ('scout', 'Scout', 'Scouting access'),
  ('board_observer', 'Board Observer', 'Read-only oversight access')
on conflict (slug) do update
set
  label = excluded.label,
  description = excluded.description;

insert into public.teams (slug, name, age_group, is_active, sort_order)
values
  ('u13', 'U13', 'U13', true, 10),
  ('u15', 'U15', 'U15', true, 20),
  ('u17', 'U17', 'U17', true, 30),
  ('u19', 'U19', 'U19', true, 40),
  ('first-team', 'First Team', 'Senior', true, 50),
  ('u11', 'U11', 'U11', false, 60),
  ('u9', 'U9', 'U9', false, 70)
on conflict (slug) do update
set
  name = excluded.name,
  age_group = excluded.age_group,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
before update on public.reports
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_training_plans_updated_at on public.training_plans;
create trigger set_training_plans_updated_at
before update on public.training_plans
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_staff_invitations_updated_at on public.staff_invitations;
create trigger set_staff_invitations_updated_at
before update on public.staff_invitations
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_training_plan_days_updated_at on public.training_plan_days;
create trigger set_training_plan_days_updated_at
before update on public.training_plan_days
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_transport_plans_updated_at on public.transport_plans;
create trigger set_transport_plans_updated_at
before update on public.transport_plans
for each row
execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, organization, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'organization', ''),
    'Pending'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    organization = excluded.organization,
    role = coalesce(nullif(public.profiles.role, ''), excluded.role, 'Pending');

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
exception
  when others then
    raise warning 'handle_new_user failed for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

create or replace function public.has_role(target_slug text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.slug = target_slug
  );
$$;

create or replace function public.has_any_role(target_slugs text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.slug = any (target_slugs)
  );
$$;

create or replace function public.belongs_to_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_team_assignments uta
    where uta.user_id = auth.uid()
      and uta.team_id = target_team_id
  );
$$;

create or replace function public.can_view_training_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or public.has_role('technical_director')
    or public.has_role('board_observer')
    or (public.has_role('coach') and public.belongs_to_team(target_team_id));
$$;

create or replace function public.can_manage_training_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or (public.has_role('coach') and public.belongs_to_team(target_team_id));
$$;

create or replace function public.can_comment_training_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or public.has_role('technical_director')
    or (public.has_role('coach') and public.belongs_to_team(target_team_id));
$$;

create or replace function public.can_create_transport_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or public.has_role('technical_director');
$$;

create or replace function public.can_view_transport_plan(target_plan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.transport_plans
    where transport_plans.id = target_plan_id
      and (
        public.is_admin()
        or public.has_role('technical_director')
        or public.has_role('board_observer')
        or (public.has_role('coach') and public.belongs_to_team(transport_plans.team_id))
        or transport_plans.driver_user_id = auth.uid()
      )
  );
$$;

create or replace function public.can_manage_transport_plan(target_plan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.transport_plans
    where transport_plans.id = target_plan_id
      and (
        public.is_admin()
        or public.has_role('technical_director')
        or transport_plans.driver_user_id = auth.uid()
      )
  );
$$;

create or replace function public.can_comment_transport_plan(target_plan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.transport_plans
    where transport_plans.id = target_plan_id
      and (
        public.is_admin()
        or public.has_role('technical_director')
        or (public.has_role('coach') and public.belongs_to_team(transport_plans.team_id))
        or transport_plans.driver_user_id = auth.uid()
      )
  );
$$;

create or replace function public.can_manage_staff_access()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin();
$$;

create or replace function public.role_requires_team(target_slug text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select lower(coalesce(target_slug, '')) in ('coach', 'driver', 'scout');
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.slug = 'admin'
  )
;
$$;

insert into public.user_roles (user_id, role_id)
select
  p.id,
  r.id
from public.profiles p
join public.roles r
  on r.slug = case
    when lower(p.role) = 'admin' then 'admin'
    else 'scout'
  end
on conflict (user_id, role_id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-videos',
  'report-videos',
  true,
  31457280,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "report_videos_public_read" on storage.objects;
create policy "report_videos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'report-videos');

drop policy if exists "report_videos_owner_insert" on storage.objects;
create policy "report_videos_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'report-videos'
  and exists (
    select 1
    from public.reports
    where reports.id = (storage.foldername(name))[1]
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "report_videos_owner_update" on storage.objects;
create policy "report_videos_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'report-videos'
  and exists (
    select 1
    from public.reports
    where reports.id = (storage.foldername(name))[1]
      and (reports.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  bucket_id = 'report-videos'
  and exists (
    select 1
    from public.reports
    where reports.id = (storage.foldername(name))[1]
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "report_videos_owner_delete" on storage.objects;
create policy "report_videos_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'report-videos'
  and exists (
    select 1
    from public.reports
    where reports.id = (storage.foldername(name))[1]
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.roles enable row level security;
alter table public.teams enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_team_assignments enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.staff_invitation_roles enable row level security;
alter table public.staff_invitation_teams enable row level security;
alter table public.staff_access_events enable row level security;
alter table public.training_plans enable row level security;
alter table public.training_plan_days enable row level security;
alter table public.training_plan_comments enable row level security;
alter table public.transport_plans enable row level security;
alter table public.transport_plan_comments enable row level security;
alter table public.app_notifications enable row level security;
alter table public.reports enable row level security;
alter table public.players enable row level security;
alter table public.player_reviews enable row level security;
alter table public.watchlist_players enable row level security;
alter table public.report_comments enable row level security;

alter table public.profiles alter column role set default 'Pending';
alter table public.user_settings add column if not exists email_training_plan_published boolean not null default true;
alter table public.user_settings add column if not exists email_training_td_comment boolean not null default true;
alter table public.user_settings add column if not exists email_training_reminder boolean not null default true;
alter table public.user_settings add column if not exists email_training_schedule_change boolean not null default true;
alter table public.user_settings add column if not exists email_transport_updates boolean not null default true;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (
  auth.uid() = id
  or public.has_any_role(array['admin', 'technical_director', 'board_observer'])
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "roles_select_authenticated" on public.roles;
create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

drop policy if exists "roles_mutate_admin" on public.roles;
create policy "roles_mutate_admin"
on public.roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "teams_select_authenticated" on public.teams;
create policy "teams_select_authenticated"
on public.teams
for select
to authenticated
using (true);

drop policy if exists "teams_mutate_admin" on public.teams;
create policy "teams_mutate_admin"
on public.teams
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "user_roles_select_accessible" on public.user_roles;
create policy "user_roles_select_accessible"
on public.user_roles
for select
to authenticated
using (
  auth.uid() = user_id
  or public.has_any_role(array['admin', 'technical_director'])
);

drop policy if exists "user_roles_mutate_admin" on public.user_roles;
create policy "user_roles_mutate_admin"
on public.user_roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "user_team_assignments_select_accessible" on public.user_team_assignments;
create policy "user_team_assignments_select_accessible"
on public.user_team_assignments
for select
to authenticated
using (
  auth.uid() = user_id
  or public.has_any_role(array['admin', 'technical_director'])
);

drop policy if exists "user_team_assignments_mutate_admin" on public.user_team_assignments;
create policy "user_team_assignments_mutate_admin"
on public.user_team_assignments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "staff_invitations_select_admin" on public.staff_invitations;
create policy "staff_invitations_select_admin"
on public.staff_invitations
for select
to authenticated
using (public.can_manage_staff_access());

drop policy if exists "staff_invitations_mutate_admin" on public.staff_invitations;
create policy "staff_invitations_mutate_admin"
on public.staff_invitations
for all
to authenticated
using (public.can_manage_staff_access())
with check (public.can_manage_staff_access());

drop policy if exists "staff_invitation_roles_select_admin" on public.staff_invitation_roles;
create policy "staff_invitation_roles_select_admin"
on public.staff_invitation_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_invitations
    where staff_invitations.id = staff_invitation_roles.invitation_id
      and public.can_manage_staff_access()
  )
);

drop policy if exists "staff_invitation_roles_mutate_admin" on public.staff_invitation_roles;
create policy "staff_invitation_roles_mutate_admin"
on public.staff_invitation_roles
for all
to authenticated
using (
  exists (
    select 1
    from public.staff_invitations
    where staff_invitations.id = staff_invitation_roles.invitation_id
      and public.can_manage_staff_access()
  )
)
with check (
  exists (
    select 1
    from public.staff_invitations
    where staff_invitations.id = staff_invitation_roles.invitation_id
      and public.can_manage_staff_access()
  )
);

drop policy if exists "staff_invitation_teams_select_admin" on public.staff_invitation_teams;
create policy "staff_invitation_teams_select_admin"
on public.staff_invitation_teams
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_invitations
    where staff_invitations.id = staff_invitation_teams.invitation_id
      and public.can_manage_staff_access()
  )
);

drop policy if exists "staff_invitation_teams_mutate_admin" on public.staff_invitation_teams;
create policy "staff_invitation_teams_mutate_admin"
on public.staff_invitation_teams
for all
to authenticated
using (
  exists (
    select 1
    from public.staff_invitations
    where staff_invitations.id = staff_invitation_teams.invitation_id
      and public.can_manage_staff_access()
  )
)
with check (
  exists (
    select 1
    from public.staff_invitations
    where staff_invitations.id = staff_invitation_teams.invitation_id
      and public.can_manage_staff_access()
  )
);

drop policy if exists "staff_access_events_select_admin" on public.staff_access_events;
create policy "staff_access_events_select_admin"
on public.staff_access_events
for select
to authenticated
using (public.can_manage_staff_access());

drop policy if exists "staff_access_events_insert_admin" on public.staff_access_events;
create policy "staff_access_events_insert_admin"
on public.staff_access_events
for insert
to authenticated
with check (public.can_manage_staff_access());

drop policy if exists "settings_select_own" on public.user_settings;
create policy "settings_select_own"
on public.user_settings
for select
using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.user_settings;
create policy "settings_insert_own"
on public.user_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.user_settings;
create policy "settings_update_own"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "training_plans_select_accessible" on public.training_plans;
create policy "training_plans_select_accessible"
on public.training_plans
for select
to authenticated
using (public.can_view_training_team(team_id));

drop policy if exists "training_plans_insert_accessible" on public.training_plans;
create policy "training_plans_insert_accessible"
on public.training_plans
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.can_manage_training_team(team_id)
);

drop policy if exists "training_plans_update_accessible" on public.training_plans;
create policy "training_plans_update_accessible"
on public.training_plans
for update
to authenticated
using (public.can_manage_training_team(team_id))
with check (
  updated_by = auth.uid()
  and public.can_manage_training_team(team_id)
);

drop policy if exists "training_plans_delete_accessible" on public.training_plans;
create policy "training_plans_delete_accessible"
on public.training_plans
for delete
to authenticated
using (public.is_admin() or public.can_manage_training_team(team_id));

drop policy if exists "training_plan_days_select_accessible" on public.training_plan_days;
create policy "training_plan_days_select_accessible"
on public.training_plan_days
for select
to authenticated
using (
  exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_days.plan_id
      and public.can_view_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_plan_days_insert_accessible" on public.training_plan_days;
create policy "training_plan_days_insert_accessible"
on public.training_plan_days
for insert
to authenticated
with check (
  exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_days.plan_id
      and public.can_manage_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_plan_days_update_accessible" on public.training_plan_days;
create policy "training_plan_days_update_accessible"
on public.training_plan_days
for update
to authenticated
using (
  exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_days.plan_id
      and public.can_manage_training_team(training_plans.team_id)
  )
)
with check (
  exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_days.plan_id
      and public.can_manage_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_plan_days_delete_accessible" on public.training_plan_days;
create policy "training_plan_days_delete_accessible"
on public.training_plan_days
for delete
to authenticated
using (
  exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_days.plan_id
      and public.can_manage_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_plan_comments_select_accessible" on public.training_plan_comments;
create policy "training_plan_comments_select_accessible"
on public.training_plan_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_comments.plan_id
      and public.can_view_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_plan_comments_insert_accessible" on public.training_plan_comments;
create policy "training_plan_comments_insert_accessible"
on public.training_plan_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_comments.plan_id
      and public.can_comment_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_plan_comments_delete_accessible" on public.training_plan_comments;
create policy "training_plan_comments_delete_accessible"
on public.training_plan_comments
for delete
to authenticated
using (author_id = auth.uid() or public.is_admin());

drop policy if exists "transport_plans_select_accessible" on public.transport_plans;
create policy "transport_plans_select_accessible"
on public.transport_plans
for select
to authenticated
using (public.can_view_transport_plan(id));

drop policy if exists "transport_plans_insert_accessible" on public.transport_plans;
create policy "transport_plans_insert_accessible"
on public.transport_plans
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.can_create_transport_team(team_id)
);

drop policy if exists "transport_plans_update_accessible" on public.transport_plans;
create policy "transport_plans_update_accessible"
on public.transport_plans
for update
to authenticated
using (public.can_manage_transport_plan(id))
with check (
  updated_by = auth.uid()
  and public.can_manage_transport_plan(id)
);

drop policy if exists "transport_plans_delete_accessible" on public.transport_plans;
create policy "transport_plans_delete_accessible"
on public.transport_plans
for delete
to authenticated
using (public.is_admin() or public.has_role('technical_director'));

drop policy if exists "transport_plan_comments_select_accessible" on public.transport_plan_comments;
create policy "transport_plan_comments_select_accessible"
on public.transport_plan_comments
for select
to authenticated
using (public.can_view_transport_plan(plan_id));

drop policy if exists "transport_plan_comments_insert_accessible" on public.transport_plan_comments;
create policy "transport_plan_comments_insert_accessible"
on public.transport_plan_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.can_comment_transport_plan(plan_id)
);

drop policy if exists "transport_plan_comments_delete_accessible" on public.transport_plan_comments;
create policy "transport_plan_comments_delete_accessible"
on public.transport_plan_comments
for delete
to authenticated
using (author_id = auth.uid() or public.is_admin());

drop policy if exists "app_notifications_select_own" on public.app_notifications;
create policy "app_notifications_select_own"
on public.app_notifications
for select
to authenticated
using (recipient_user_id = auth.uid());

drop policy if exists "app_notifications_insert_accessible" on public.app_notifications;
create policy "app_notifications_insert_accessible"
on public.app_notifications
for insert
to authenticated
with check (
  (actor_user_id = auth.uid() or actor_user_id is null)
  and (
    (team_id is not null and public.can_comment_training_team(team_id))
    or exists (
      select 1
      from public.training_plans
      where training_plans.id = app_notifications.training_plan_id
        and public.can_comment_training_team(training_plans.team_id)
    )
    or (
      type = 'transport_plan_updated'
      and team_id is not null
      and (
        public.is_admin()
        or public.has_role('technical_director')
      )
    )
  )
);

drop policy if exists "app_notifications_update_own" on public.app_notifications;
create policy "app_notifications_update_own"
on public.app_notifications
for update
to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports
for select
using (
  auth.uid() = user_id
  or public.is_admin()
  or public.has_any_role(array['technical_director', 'board_observer'])
);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports
for insert
with check (auth.uid() = user_id);

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own"
on public.reports
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own"
on public.reports
for delete
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "players_select_own" on public.players;
create policy "players_select_own"
on public.players
for select
using (
  exists (
    select 1
    from public.reports
    where reports.id = players.report_id
      and (
        reports.user_id = auth.uid()
        or public.is_admin()
        or public.has_any_role(array['technical_director', 'board_observer'])
      )
  )
);

drop policy if exists "players_insert_own" on public.players;
create policy "players_insert_own"
on public.players
for insert
with check (
  exists (
    select 1
    from public.reports
    where reports.id = players.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "players_delete_own" on public.players;
create policy "players_delete_own"
on public.players
for delete
using (
  exists (
    select 1
    from public.reports
    where reports.id = players.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "player_reviews_select_own" on public.player_reviews;
create policy "player_reviews_select_own"
on public.player_reviews
for select
using (
  exists (
    select 1
    from public.reports
    where reports.id = player_reviews.report_id
      and (
        reports.user_id = auth.uid()
        or public.is_admin()
        or public.has_any_role(array['technical_director', 'board_observer'])
      )
  )
);

drop policy if exists "player_reviews_insert_own" on public.player_reviews;
create policy "player_reviews_insert_own"
on public.player_reviews
for insert
with check (
  exists (
    select 1
    from public.reports
    where reports.id = player_reviews.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "player_reviews_delete_own" on public.player_reviews;
create policy "player_reviews_delete_own"
on public.player_reviews
for delete
using (
  exists (
    select 1
    from public.reports
    where reports.id = player_reviews.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "watchlist_players_select_own" on public.watchlist_players;
create policy "watchlist_players_select_own"
on public.watchlist_players
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "watchlist_players_insert_own" on public.watchlist_players;
create policy "watchlist_players_insert_own"
on public.watchlist_players
for insert
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "watchlist_players_update_own" on public.watchlist_players;
create policy "watchlist_players_update_own"
on public.watchlist_players
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "watchlist_players_delete_own" on public.watchlist_players;
create policy "watchlist_players_delete_own"
on public.watchlist_players
for delete
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "report_comments_select_accessible" on public.report_comments;
create policy "report_comments_select_accessible"
on public.report_comments
for select
using (
  exists (
    select 1
    from public.reports
    where reports.id = report_comments.report_id
      and (
        reports.user_id = auth.uid()
        or public.is_admin()
        or public.has_any_role(array['technical_director', 'board_observer'])
      )
  )
);

drop policy if exists "report_comments_insert_accessible" on public.report_comments;
create policy "report_comments_insert_accessible"
on public.report_comments
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.reports
    where reports.id = report_comments.report_id
      and (
        reports.user_id = auth.uid()
        or public.is_admin()
        or public.has_role('technical_director')
      )
  )
);

drop policy if exists "report_comments_delete_accessible" on public.report_comments;
create policy "report_comments_delete_accessible"
on public.report_comments
for delete
using (
  author_id = auth.uid()
  or public.is_admin()
);

$mwos_foundation$;

  -- These additions were shipped through schema.sql without repository migrations.
  execute $mwos_announcements$
create table if not exists public.club_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target_team_ids uuid[] not null default array[]::uuid[],
  is_pinned boolean not null default false,
  expires_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references auth.users (id) on delete cascade,
  updated_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.club_announcement_reads (
  announcement_id uuid not null references public.club_announcements (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  primary key (announcement_id, user_id)
);

grant select, insert, update, delete on public.club_announcements to authenticated;
grant select, insert, update on public.club_announcement_reads to authenticated;

create index if not exists club_announcements_created_at_idx on public.club_announcements (created_at desc);
create index if not exists club_announcements_pinned_idx on public.club_announcements (is_pinned desc, created_at desc);
create index if not exists club_announcements_target_team_ids_idx on public.club_announcements using gin (target_team_ids);
create index if not exists club_announcement_reads_user_id_idx on public.club_announcement_reads (user_id, read_at desc);

insert into public.teams (slug, name, age_group, is_active, sort_order)
values
  ('queens', 'Queens', 'Women', true, 55),
  ('queens-u15', 'Queens U15', 'Girls U15', true, 57)
on conflict (slug) do nothing;

drop trigger if exists set_club_announcements_updated_at on public.club_announcements;
create trigger set_club_announcements_updated_at
before update on public.club_announcements
for each row
execute procedure public.set_updated_at();

create or replace function public.can_manage_club_announcements()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or public.has_role('technical_director');
$$;

create or replace function public.can_view_club_announcement(
  target_team_ids uuid[],
  expires_at timestamptz,
  archived_at timestamptz
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    archived_at is null
    and (expires_at is null or expires_at > timezone('utc', now()))
    and public.has_any_role(array['admin', 'technical_director', 'board_observer', 'coach', 'driver', 'scout'])
    and (
      public.can_manage_club_announcements()
      or public.has_role('board_observer')
      or coalesce(array_length(target_team_ids, 1), 0) = 0
      or exists (
        select 1
        from public.user_team_assignments uta
        where uta.user_id = auth.uid()
          and uta.team_id = any (coalesce(target_team_ids, array[]::uuid[]))
      )
    );
$$;

alter table public.club_announcements enable row level security;
alter table public.club_announcement_reads enable row level security;

drop policy if exists "club_announcements_select_accessible" on public.club_announcements;
create policy "club_announcements_select_accessible"
on public.club_announcements
for select
to authenticated
using (public.can_view_club_announcement(target_team_ids, expires_at, archived_at));

drop policy if exists "club_announcements_insert_accessible" on public.club_announcements;
create policy "club_announcements_insert_accessible"
on public.club_announcements
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.can_manage_club_announcements()
);

drop policy if exists "club_announcements_update_accessible" on public.club_announcements;
create policy "club_announcements_update_accessible"
on public.club_announcements
for update
to authenticated
using (public.can_manage_club_announcements())
with check (
  updated_by = auth.uid()
  and public.can_manage_club_announcements()
);

drop policy if exists "club_announcements_delete_accessible" on public.club_announcements;
create policy "club_announcements_delete_accessible"
on public.club_announcements
for delete
to authenticated
using (public.can_manage_club_announcements());

drop policy if exists "club_announcement_reads_select_own" on public.club_announcement_reads;
create policy "club_announcement_reads_select_own"
on public.club_announcement_reads
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "club_announcement_reads_insert_own" on public.club_announcement_reads;
create policy "club_announcement_reads_insert_own"
on public.club_announcement_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.club_announcements
    where club_announcements.id = club_announcement_reads.announcement_id
      and public.can_view_club_announcement(
        club_announcements.target_team_ids,
        club_announcements.expires_at,
        club_announcements.archived_at
      )
  )
);

drop policy if exists "club_announcement_reads_update_own" on public.club_announcement_reads;
create policy "club_announcement_reads_update_own"
on public.club_announcement_reads
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());


$mwos_announcements$;

  -- API table grants are independent of the policies above. No anonymous grant.
  grant usage on schema public to authenticated, service_role;
  grant select, insert, update, delete on table
    public.profiles,
    public.user_settings,
    public.roles,
    public.teams,
    public.user_roles,
    public.user_team_assignments,
    public.staff_invitations,
    public.staff_invitation_roles,
    public.staff_invitation_teams,
    public.staff_access_events,
    public.training_plans,
    public.training_plan_days,
    public.training_plan_comments,
    public.transport_plans,
    public.transport_plan_comments,
    public.app_notifications,
    public.reports,
    public.players,
    public.player_reviews,
    public.watchlist_players,
    public.report_comments,
    public.club_announcements
  to authenticated;
  grant select, insert, update on table public.club_announcement_reads to authenticated;
  grant select, insert, update, delete on table
    public.profiles,
    public.user_settings,
    public.roles,
    public.teams,
    public.user_roles,
    public.user_team_assignments,
    public.staff_invitations,
    public.staff_invitation_roles,
    public.staff_invitation_teams,
    public.staff_access_events,
    public.training_plans,
    public.training_plan_days,
    public.training_plan_comments,
    public.transport_plans,
    public.transport_plan_comments,
    public.app_notifications,
    public.reports,
    public.players,
    public.player_reviews,
    public.watchlist_players,
    public.report_comments,
    public.club_announcements,
    public.club_announcement_reads
  to service_role;

  -- Subsequent historical migrations already grant authenticated access explicitly;
  -- service_role needs table privileges too, even though it bypasses row policies.
  alter default privileges in schema public
    grant select, insert, update, delete on tables to service_role;

  perform set_config('check_function_bodies', previous_check_function_bodies, true);
end;
$mwos_bootstrap$;
