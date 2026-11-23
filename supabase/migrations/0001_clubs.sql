create table public.clubs (
  id         uuid        primary key default gen_random_uuid(),
  coach_id   uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now(),

  constraint clubs_coach_id_name_key unique (coach_id, name),
  -- Misma regla que normalizeName: la base la garantiza aunque no se pase por la app.
  constraint clubs_name_check check (btrim(name) <> '' and char_length(name) <= 80)
);

alter table public.clubs enable row level security;

create policy "clubs: coach manages own clubs"
  on public.clubs
  for all
  to authenticated
  using ((select auth.uid()) = coach_id)
  with check ((select auth.uid()) = coach_id);
