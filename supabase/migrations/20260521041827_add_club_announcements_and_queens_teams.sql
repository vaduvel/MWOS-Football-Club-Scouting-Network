-- Recovered verbatim from the production migration ledger during audited reconciliation.
insert into public.teams (slug, name, age_group, is_active, sort_order)
values
  ('queens', 'Queens', 'Women', true, 55),
  ('queens-u15', 'Queens U15', 'Girls U15', true, 57)
on conflict (slug) do update
set
  name = excluded.name,
  age_group = excluded.age_group,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

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
    and (
      coalesce(array_length(target_team_ids, 1), 0) = 0
      or public.is_admin()
      or public.has_role('technical_director')
      or exists (
        select 1
        from public.user_team_assignments
        where user_team_assignments.user_id = auth.uid()
          and user_team_assignments.team_id = any (target_team_ids)
      )
    );
$$;

drop trigger if exists set_club_announcements_updated_at on public.club_announcements;
create trigger set_club_announcements_updated_at
before update on public.club_announcements
for each row
execute procedure public.set_updated_at();

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
