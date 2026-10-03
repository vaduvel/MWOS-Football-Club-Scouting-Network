-- New scouting reports are actionable intelligence for the read-only leadership
-- audience. Deliver an in-app alert once per report, without notifying its author.
alter table public.app_notifications
  drop constraint if exists app_notifications_type_check;

alter table public.app_notifications
  add constraint app_notifications_type_check
  check (type in (
    'training_plan_published',
    'training_td_comment',
    'training_session_reminder',
    'training_schedule_changed',
    'transport_plan_updated',
    'scouting_report_created'
  ));

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.notify_leadership_of_new_scouting_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.report_type not in ('individual', 'match') then
    return new;
  end if;

  insert into public.app_notifications (
    recipient_user_id,
    actor_user_id,
    type,
    title,
    message,
    link_path,
    event_key,
    email_enabled
  )
  select distinct
    ur.user_id,
    new.user_id,
    'scouting_report_created',
    'New scouting report',
    case when new.report_type = 'individual'
      then 'A new individual player report is ready to review.'
      else 'A new match scouting report is ready to review.'
    end,
    case when new.report_type = 'individual'
      then '/scouting/individual/' || new.id
      else '/scouting/report/' || new.id
    end,
    'scouting_report_created:' || new.id,
    false
  from public.user_roles ur
  join public.roles role on role.id = ur.role_id
  where role.slug in ('admin', 'executive_director', 'technical_director', 'board_observer')
    and ur.user_id <> new.user_id
  on conflict (recipient_user_id, event_key) do nothing;

  return new;
exception when others then
  -- Notification delivery must not prevent a Scout from saving their report.
  raise warning 'Scouting report notification failed: %', sqlerrm;
  return new;
end;
$$;

revoke all on function private.notify_leadership_of_new_scouting_report()
  from public, anon, authenticated;

drop trigger if exists notify_leadership_of_new_scouting_report on public.reports;
create trigger notify_leadership_of_new_scouting_report
after insert on public.reports
for each row execute function private.notify_leadership_of_new_scouting_report();
