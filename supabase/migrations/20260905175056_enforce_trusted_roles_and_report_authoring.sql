-- Authorization comes only from admin-managed assignments, never editable profile metadata.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.slug = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, organization, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'organization', ''),
    'Pending'
  )
  on conflict (id) do update
  set email = excluded.email, name = excluded.name, organization = excluded.organization;

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
exception
  when others then
    raise warning 'handle_new_user failed for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

alter function public.set_updated_at() set search_path = public;
-- These routines are internal triggers, not callable application APIs.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports for insert to authenticated
with check (auth.uid() = user_id and public.has_any_role(array['admin', 'scout']));

drop policy if exists reports_update_own on public.reports;
create policy reports_update_own on public.reports for update to authenticated
using (public.is_admin() or (auth.uid() = user_id and public.has_role('scout')))
with check (public.is_admin() or (auth.uid() = user_id and public.has_role('scout')));

drop policy if exists reports_delete_own on public.reports;
create policy reports_delete_own on public.reports for delete to authenticated
using (public.is_admin() or (auth.uid() = user_id and public.has_role('scout')));

drop policy if exists players_insert_own on public.players;
create policy players_insert_own on public.players for insert to authenticated
with check (exists (
  select 1 from public.reports
  where reports.id = players.report_id
    and (public.is_admin() or (reports.user_id = auth.uid() and public.has_role('scout')))
));

drop policy if exists players_delete_own on public.players;
create policy players_delete_own on public.players for delete to authenticated
using (exists (
  select 1 from public.reports
  where reports.id = players.report_id
    and (public.is_admin() or (reports.user_id = auth.uid() and public.has_role('scout')))
));

drop policy if exists player_reviews_insert_own on public.player_reviews;
create policy player_reviews_insert_own on public.player_reviews for insert to authenticated
with check (exists (
  select 1 from public.reports
  where reports.id = player_reviews.report_id
    and (public.is_admin() or (reports.user_id = auth.uid() and public.has_role('scout')))
));

drop policy if exists player_reviews_delete_own on public.player_reviews;
create policy player_reviews_delete_own on public.player_reviews for delete to authenticated
using (exists (
  select 1 from public.reports
  where reports.id = player_reviews.report_id
    and (public.is_admin() or (reports.user_id = auth.uid() and public.has_role('scout')))
));

drop policy if exists report_videos_owner_insert on storage.objects;
create policy report_videos_owner_insert on storage.objects for insert to authenticated

with check (bucket_id = 'report-videos' and exists (
  select 1 from public.reports
  where reports.id::text = (storage.foldername(name))[1]
    and (public.is_admin() or (reports.user_id = auth.uid() and public.has_role('scout')))
));

drop policy if exists report_videos_owner_update on storage.objects;
create policy report_videos_owner_update on storage.objects for update to authenticated
using (bucket_id = 'report-videos' and exists (
  select 1 from public.reports
  where reports.id::text = (storage.foldername(name))[1]
    and (public.is_admin() or (reports.user_id = auth.uid() and public.has_role('scout')))
))
with check (bucket_id = 'report-videos' and exists (
  select 1 from public.reports
  where reports.id::text = (storage.foldername(name))[1]
    and (public.is_admin() or (reports.user_id = auth.uid() and public.has_role('scout')))
));

drop policy if exists report_videos_owner_delete on storage.objects;
create policy report_videos_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'report-videos' and exists (
  select 1 from public.reports
  where reports.id::text = (storage.foldername(name))[1]
    and (public.is_admin() or (reports.user_id = auth.uid() and public.has_role('scout')))
))
;
