create table public.categories (
  id          uuid        primary key default gen_random_uuid(),
  -- on delete cascade: borrar el club borra sus categorías (RN-07).
  club_id     uuid        not null references public.clubs (id) on delete cascade,
  name        text        not null,
  season_year smallint    not null,
  created_at  timestamptz not null default now(),

  constraint categories_club_id_name_season_year_key unique (club_id, name, season_year),
  -- Misma regla que clubs_name_check y normalizeName.
  constraint categories_name_check check (btrim(name) <> '' and char_length(name) <= 80),
  constraint categories_season_year_check check (season_year between 2000 and 2100)
);

alter table public.categories enable row level security;

-- ¿El club es del usuario logueado? La reusan las políticas de las tablas que cuelgan de un club.
-- invoker: corre con los permisos de quien consulta, así que la RLS de clubs también aplica.
create function public.owns_club(p_club_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.clubs
    where id = p_club_id
      and coach_id = (select auth.uid())
  );
$$;

create policy "categories: coach manages categories of own clubs"
  on public.categories
  for all
  to authenticated
  using (public.owns_club(club_id))
  with check (public.owns_club(club_id));

-- Privilegios explícitos (ver 0002).
revoke all on table public.categories from anon, authenticated;
grant select, insert, update, delete on table public.categories to authenticated;

-- Postgres le da execute a public en toda función nueva.
revoke execute on function public.owns_club(uuid) from public, anon;
grant execute on function public.owns_club(uuid) to authenticated;
