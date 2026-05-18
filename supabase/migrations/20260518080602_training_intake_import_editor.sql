alter table public.training_plan_days
  add column if not exists import_review_state text not null default 'ready'
    check (import_review_state in ('ready', 'needs_review', 'missing_info'));

alter table public.training_plan_days
  add column if not exists imported_excerpt text;

create table if not exists public.training_plan_sources (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans (id) on delete cascade,
  source_kind text not null check (source_kind in ('manual', 'pdf_import', 'image_import')),
  file_name text,
  mime_type text,
  storage_path text,
  preview_text text,
  extracted_text text,
  extraction_status text not null default 'draft_generated'
    check (extraction_status in ('draft_generated', 'reviewed', 'replaced')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (plan_id)
);

create index if not exists training_plan_sources_plan_id_idx
  on public.training_plan_sources (plan_id);

create index if not exists training_plan_sources_created_by_idx
  on public.training_plan_sources (created_by);

grant select, insert, update, delete on public.training_plan_sources to authenticated;

drop trigger if exists set_training_plan_sources_updated_at on public.training_plan_sources;
create trigger set_training_plan_sources_updated_at
before update on public.training_plan_sources
for each row
execute procedure public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-plan-sources',
  'training-plan-sources',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "training_sources_select_accessible" on storage.objects;
create policy "training_sources_select_accessible"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'training-plan-sources'
  and exists (
    select 1
    from public.training_plans
    where training_plans.id::text = (storage.foldername(name))[1]
      and public.can_view_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_sources_owner_insert" on storage.objects;
create policy "training_sources_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'training-plan-sources'
  and exists (
    select 1
    from public.training_plans
    where training_plans.id::text = (storage.foldername(name))[1]
      and public.can_manage_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_sources_owner_update" on storage.objects;
create policy "training_sources_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'training-plan-sources'
  and exists (
    select 1
    from public.training_plans
    where training_plans.id::text = (storage.foldername(name))[1]
      and public.can_manage_training_team(training_plans.team_id)
  )
)
with check (
  bucket_id = 'training-plan-sources'
  and exists (
    select 1
    from public.training_plans
    where training_plans.id::text = (storage.foldername(name))[1]
      and public.can_manage_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_sources_owner_delete" on storage.objects;
create policy "training_sources_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'training-plan-sources'
  and exists (
    select 1
    from public.training_plans
    where training_plans.id::text = (storage.foldername(name))[1]
      and public.can_manage_training_team(training_plans.team_id)
  )
);

alter table public.training_plan_sources enable row level security;

drop policy if exists "training_plan_sources_select_accessible" on public.training_plan_sources;
create policy "training_plan_sources_select_accessible"
on public.training_plan_sources
for select
to authenticated
using (
  exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_sources.plan_id
      and public.can_view_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_plan_sources_insert_accessible" on public.training_plan_sources;
create policy "training_plan_sources_insert_accessible"
on public.training_plan_sources
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_sources.plan_id
      and public.can_manage_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_plan_sources_update_accessible" on public.training_plan_sources;
create policy "training_plan_sources_update_accessible"
on public.training_plan_sources
for update
to authenticated
using (
  exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_sources.plan_id
      and public.can_manage_training_team(training_plans.team_id)
  )
)
with check (
  exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_sources.plan_id
      and public.can_manage_training_team(training_plans.team_id)
  )
);

drop policy if exists "training_plan_sources_delete_accessible" on public.training_plan_sources;
create policy "training_plan_sources_delete_accessible"
on public.training_plan_sources
for delete
to authenticated
using (
  exists (
    select 1
    from public.training_plans
    where training_plans.id = training_plan_sources.plan_id
      and public.can_manage_training_team(training_plans.team_id)
  )
);
