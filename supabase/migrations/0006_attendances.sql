-- Asistencia (US-302). Sólo se guardan los presentes (D-09): ausente = activo en la fecha de la
-- clase y sin fila acá.

create table public.attendances (
  -- Borrar la clase o la persona borra sus asistencias. US-304 agrega las protecciones.
  session_id uuid        not null references public.sessions (id) on delete cascade,
  player_id  uuid        not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),

  -- PK compuesta: un jugador figura a lo sumo una vez por clase. Su índice (session_id primero)
  -- sirve para "presentes de la clase".
  primary key (session_id, player_id)
);

-- Para "asistencias del jugador" (ranking, trayectoria) y el borrado en cascada desde players.
create index attendances_player_id_idx on public.attendances (player_id);

-- RN-03: el jugador tiene una pertenencia en la categoría de la clase que incluye su fecha.
-- Mira otras tablas (sessions y category_players): no puede ser un check.
create function public.attendances_validate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category_id uuid;
  v_held_on date;
begin
  select category_id, held_on
    into v_category_id, v_held_on
    from public.sessions
    where id = new.session_id;
  -- Clase inexistente o ajena (RLS la oculta): que respondan la FK (23503) o RLS (42501).
  if not found then
    return new;
  end if;

  -- daterange(alta, baja, '[]') incluye ambos extremos; con baja null no tiene fin.
  -- @> es "contiene": ¿la fecha de la clase cae dentro de la pertenencia?
  if not exists (
    select 1
    from public.category_players
    where category_id = v_category_id
      and player_id = new.player_id
      and daterange(joined_on, left_on, '[]') @> v_held_on
  ) then
    raise exception 'El jugador no está en la categoría en la fecha de la clase'
      using errcode = '23514', constraint = 'attendances_membership';
  end if;

  return new;
end;
$$;

-- Sólo insert: la tabla no tiene nada que actualizar (ver grants).
create trigger attendances_validate
  before insert on public.attendances
  for each row execute function public.attendances_validate();

-- Guardar la asistencia de una clase = reemplazar el conjunto de presentes. Todo lo que pasa
-- dentro de una función corre en UNA transacción: si un insert falla (trigger), el delete
-- también se deshace y queda lo que estaba guardado.
create function public.set_session_attendance(
  p_session_id uuid,
  p_player_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Sin esto, una clase ajena con lista vacía "se guardaría" sin error (el delete no ve filas).
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'La clase no existe' using errcode = '42501';
  end if;

  delete from public.attendances where session_id = p_session_id;

  -- unnest despliega el array en filas; distinct evita chocar con la PK si un id vino repetido.
  insert into public.attendances (session_id, player_id)
    select distinct p_session_id, player_id
    from unnest(p_player_ids) as player_id;
end;
$$;

-- RLS: la asistencia es del dueño de la clase. El subselect a sessions también pasa por su RLS.
alter table public.attendances enable row level security;

create policy "attendances: coach manages attendance of own sessions"
  on public.attendances
  for all
  to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.owns_category(s.category_id)
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.owns_category(s.category_id)
    )
  );

-- Privilegios explícitos (ver 0002). Sin update: una fila es "estuvo presente", se crea o se borra.
revoke all on table public.attendances from anon, authenticated;
grant select, insert, delete on table public.attendances to authenticated;

revoke execute on function public.set_session_attendance(uuid, uuid[]) from public, anon;
grant execute on function public.set_session_attendance(uuid, uuid[]) to authenticated;

-- La función del trigger no se llama directo (ver 0004).
revoke execute on function public.attendances_validate() from public, anon, authenticated;
