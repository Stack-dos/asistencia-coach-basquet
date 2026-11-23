-- Jugadores (US-203): la persona (players) y su paso por cada categoría (category_players).

-- btree_gist permite usar "=" sobre uuid dentro de un índice GiST: lo necesita la restricción
-- de exclusión de category_players, que mezcla igualdad (uuid) con superposición (rangos).
create extension if not exists btree_gist with schema extensions;

-- La persona: es la misma en todas las temporadas (D-24).
create table public.players (
  id          uuid        primary key default gen_random_uuid(),
  club_id     uuid        not null references public.clubs (id) on delete cascade,
  first_name  text        not null,
  last_name   text        not null,
  -- Opcional e informativo (D-25). Un check con null pasa: null between ... es null, no false.
  birth_year  smallint,
  created_at  timestamptz not null default now(),

  -- Misma regla que normalizeName.
  constraint players_first_name_check check (btrim(first_name) <> '' and char_length(first_name) <= 80),
  constraint players_last_name_check check (btrim(last_name) <> '' and char_length(last_name) <= 80),
  -- Límite fijo: un check no puede depender de la fecha de hoy (tiene que dar siempre lo mismo).
  -- "No después del año actual" lo valida la app.
  constraint players_birth_year_check check (birth_year between 1900 and 2100)
);

-- Postgres no indexa solo las FK. Este índice sirve para "jugadores del club" y para ordenar
-- por apellido.
create index players_club_id_last_name_idx on public.players (club_id, last_name, first_name);

-- La pertenencia: el período en que un jugador estuvo en una categoría.
create table public.category_players (
  id          uuid        primary key default gen_random_uuid(),
  category_id uuid        not null references public.categories (id) on delete cascade,
  player_id   uuid        not null references public.players (id) on delete cascade,
  joined_on   date        not null,
  -- null = sigue activo. La baja (US-204) la completa.
  left_on     date,
  created_at  timestamptz not null default now(),

  constraint category_players_dates_check check (left_on is null or left_on >= joined_on),
  -- Dos pertenencias del mismo jugador en la misma categoría no se pueden superponer.
  -- daterange(alta, baja, '[]') incluye ambos extremos; con baja null el rango no tiene fin.
  constraint category_players_no_overlap exclude using gist (
    category_id with =,
    player_id with =,
    daterange(joined_on, left_on, '[]') with &&
  )
);

-- La restricción de exclusión ya indexa category_id; falta player_id (borrado en cascada desde
-- players y, más adelante, la trayectoria del jugador).
create index category_players_player_id_idx on public.category_players (player_id);

-- ¿La categoría es de un club del usuario logueado? Para las políticas de las tablas que cuelgan
-- de una categoría (category_players, y después sessions y attendances).
create function public.owns_category(p_category_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.categories
    where id = p_category_id
      and public.owns_club(club_id)
  );
$$;

-- Reglas que un check no puede expresar porque miran otras tablas (sección 4.2 del PRD):
--   1. el jugador y la categoría son del mismo club;
--   2. alta y baja caen dentro de la temporada de la categoría (AC5).
create function public.category_players_validate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_season_year smallint;
  v_category_club_id uuid;
  v_player_club_id uuid;
begin
  select season_year, club_id
    into v_season_year, v_category_club_id
    from public.categories
    where id = new.category_id;
  -- Categoría inexistente o ajena (RLS la oculta): que respondan la FK (23503) o RLS (42501).
  if not found then
    return new;
  end if;

  -- Si el jugador es de otro entrenador, RLS lo oculta y v_player_club_id queda null.
  select club_id into v_player_club_id from public.players where id = new.player_id;
  if v_player_club_id is distinct from v_category_club_id then
    raise exception 'El jugador y la categoría tienen que ser del mismo club'
      using errcode = '23514', constraint = 'category_players_same_club';
  end if;

  if extract(year from new.joined_on) <> v_season_year
     or (new.left_on is not null and extract(year from new.left_on) <> v_season_year) then
    raise exception 'Las fechas tienen que estar dentro de la temporada %', v_season_year
      using errcode = '23514', constraint = 'category_players_season';
  end if;

  return new;
end;
$$;

-- before: valida antes de escribir la fila; si lanza, no se escribe nada.
create trigger category_players_validate
  before insert or update on public.category_players
  for each row execute function public.category_players_validate();

-- Crea la persona y su primera pertenencia en UNA transacción: si la pertenencia falla (fecha
-- fuera de temporada), tampoco queda la persona suelta en el club.
create function public.create_player(
  p_category_id uuid,
  p_first_name  text,
  p_last_name   text,
  p_birth_year  smallint,
  p_joined_on   date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_club_id uuid;
  v_player_id uuid;
begin
  select club_id into v_club_id from public.categories where id = p_category_id;
  if not found then
    raise exception 'La categoría no existe' using errcode = '42501';
  end if;

  insert into public.players (club_id, first_name, last_name, birth_year)
    values (v_club_id, p_first_name, p_last_name, p_birth_year)
    returning id into v_player_id;

  insert into public.category_players (category_id, player_id, joined_on)
    values (p_category_id, v_player_id, p_joined_on);

  return v_player_id;
end;
$$;

-- Borra una pertenencia y, si era la única, también a la persona (para corregir errores de
-- carga sin dejar personas sueltas que después se ofrezcan como "¿Es este jugador?").
-- Devuelve club y categoría para volver al listado; null si no había nada que borrar.
create function public.delete_category_player(p_category_player_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_player_id uuid;
  v_category_id uuid;
  v_club_id uuid;
begin
  delete from public.category_players
    where id = p_category_player_id
    returning player_id, category_id into v_player_id, v_category_id;
  if not found then
    return null;
  end if;

  delete from public.players
    where id = v_player_id
      and not exists (
        select 1 from public.category_players where player_id = v_player_id
      );

  select club_id into v_club_id from public.categories where id = v_category_id;
  return jsonb_build_object('club_id', v_club_id, 'category_id', v_category_id);
end;
$$;

-- RLS
alter table public.players enable row level security;
alter table public.category_players enable row level security;

create policy "players: coach manages players of own clubs"
  on public.players
  for all
  to authenticated
  using (public.owns_club(club_id))
  with check (public.owns_club(club_id));

create policy "category_players: coach manages memberships of own categories"
  on public.category_players
  for all
  to authenticated
  using (public.owns_category(category_id))
  with check (public.owns_category(category_id));

-- Privilegios explícitos (ver 0002).
revoke all on table public.players, public.category_players from anon, authenticated;
grant select, insert, update, delete on table public.players, public.category_players to authenticated;

revoke execute on function
  public.owns_category(uuid),
  public.create_player(uuid, text, text, smallint, date),
  public.delete_category_player(uuid)
  from public, anon;
grant execute on function
  public.owns_category(uuid),
  public.create_player(uuid, text, text, smallint, date),
  public.delete_category_player(uuid)
  to authenticated;

-- La función del trigger no se llama directo: nadie necesita execute (el trigger corre igual).
revoke execute on function public.category_players_validate() from public, anon, authenticated;
