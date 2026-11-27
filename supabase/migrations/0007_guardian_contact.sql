-- Contacto del tutor (US-207): opcional, uno por persona (D-32). Va en players y no en la
-- pertenencia: el tutor es el mismo en todas las categorías y temporadas.

alter table public.players
  add column guardian_name  text,
  add column guardian_phone text,
  -- Un check con null pasa (null no es false): los dos campos son opcionales.
  -- Misma regla que guardianNameError / guardianPhoneError en src/domain/players.ts.
  add constraint players_guardian_name_check
    check (btrim(guardian_name) <> '' and char_length(guardian_name) <= 80),
  -- Se guarda como lo escribió el entrenador (D-32): sólo dígitos, espacios, +, -, paréntesis.
  -- El mínimo de 6 dígitos lo valida la app (un check con regex de "contar dígitos" no aporta).
  add constraint players_guardian_phone_check
    check (guardian_phone ~ '^[0-9 +()-]+$' and char_length(guardian_phone) <= 30);

-- create_player suma el contacto. Cambiar los parámetros de una función no se puede con
-- "create or replace": hay que borrarla y crearla de nuevo (y repetir los grants).
-- Los parámetros nuevos tienen default null: quien la llame con los 5 de antes sigue andando
-- (el código viejo mientras se despliega el nuevo, sección 13 del PRD).
drop function public.create_player(uuid, text, text, smallint, date);

create function public.create_player(
  p_category_id    uuid,
  p_first_name     text,
  p_last_name      text,
  p_birth_year     smallint,
  p_joined_on      date,
  p_guardian_name  text default null,
  p_guardian_phone text default null
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

  insert into public.players (club_id, first_name, last_name, birth_year, guardian_name, guardian_phone)
    values (v_club_id, p_first_name, p_last_name, p_birth_year, p_guardian_name, p_guardian_phone)
    returning id into v_player_id;

  insert into public.category_players (category_id, player_id, joined_on)
    values (p_category_id, v_player_id, p_joined_on);

  return v_player_id;
end;
$$;

revoke execute on function public.create_player(uuid, text, text, smallint, date, text, text)
  from public, anon;
grant execute on function public.create_player(uuid, text, text, smallint, date, text, text)
  to authenticated;
