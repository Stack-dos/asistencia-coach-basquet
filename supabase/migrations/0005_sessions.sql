-- Clases (US-301): los días en que hubo entrenamiento en una categoría.

create table public.sessions (
  id          uuid        primary key default gen_random_uuid(),
  -- on delete cascade: borrar la categoría borra sus clases.
  category_id uuid        not null references public.categories (id) on delete cascade,
  -- date: día sin hora ni zona horaria, así el 14/3 no se corre al 13/3 por UTC.
  held_on     date        not null,
  created_at  timestamptz not null default now(),

  -- RN-06 / AC2: una clase por día y categoría. El índice que crea también sirve para
  -- "clases de la categoría en el mes" (where category_id = ? and held_on >= ? and held_on < ?).
  constraint sessions_category_id_held_on_key unique (category_id, held_on)
);

-- AC5: la fecha cae dentro de la temporada de la categoría. No puede ser un check porque mira
-- otra tabla (categories). Mismo patrón que category_players_validate (0004).
create function public.sessions_validate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_season_year smallint;
begin
  select season_year into v_season_year
    from public.categories
    where id = new.category_id;
  -- Categoría inexistente o ajena (RLS la oculta): que respondan la FK (23503) o RLS (42501).
  if not found then
    return new;
  end if;

  if extract(year from new.held_on) <> v_season_year then
    raise exception 'La fecha tiene que estar dentro de la temporada %', v_season_year
      using errcode = '23514', constraint = 'sessions_season';
  end if;

  return new;
end;
$$;

create trigger sessions_validate
  before insert or update on public.sessions
  for each row execute function public.sessions_validate();

-- RLS: owns_category (0004) ya estaba pensada para esta tabla.
alter table public.sessions enable row level security;

create policy "sessions: coach manages sessions of own categories"
  on public.sessions
  for all
  to authenticated
  using (public.owns_category(category_id))
  with check (public.owns_category(category_id));

-- Privilegios explícitos (ver 0002).
revoke all on table public.sessions from anon, authenticated;
grant select, insert, update, delete on table public.sessions to authenticated;

-- La función del trigger no se llama directo (ver 0004).
revoke execute on function public.sessions_validate() from public, anon, authenticated;
