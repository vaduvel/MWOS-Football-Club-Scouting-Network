-- External scouting players need their own birth date; the internal club roster
-- is intentionally separate and already has date_of_birth.
alter table public.players
  add column if not exists date_of_birth date;

alter table public.players
  add constraint players_birth_date_not_future
  check (date_of_birth is null or (isfinite(date_of_birth) and date_of_birth <= current_date));
