-- Optional TIPS methodology data for individual scouting reports.
-- Existing 1-5 player review scores remain unchanged and independent.
alter table public.reports
  add column if not exists tips_evaluation jsonb;

alter table public.players
  add column if not exists position text;

alter table public.reports
  add constraint reports_tips_evaluation_shape
  check (tips_evaluation is null or (report_type = 'individual' and jsonb_typeof(tips_evaluation) = 'object'));
