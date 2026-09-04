revoke all on table public.staff_access_events from anon, authenticated;
grant select, insert on table public.staff_access_events to authenticated;
grant select, insert, update, delete on table public.staff_access_events to service_role;
