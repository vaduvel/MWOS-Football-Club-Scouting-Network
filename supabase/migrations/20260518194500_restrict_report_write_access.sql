drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports
for insert
with check (
  auth.uid() = user_id
  and (
    public.is_admin()
    or public.has_any_role(array['technical_director', 'scout'])
  )
);

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own"
on public.reports
for update
using (
  public.is_admin()
  or public.has_role('technical_director')
  or (auth.uid() = user_id and public.has_role('scout'))
)
with check (
  public.is_admin()
  or public.has_role('technical_director')
  or (auth.uid() = user_id and public.has_role('scout'))
);

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own"
on public.reports
for delete
using (
  public.is_admin()
  or public.has_role('technical_director')
  or (auth.uid() = user_id and public.has_role('scout'))
);
