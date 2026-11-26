-- Tests de base (pgTAP) para attendances y set_session_attendance (US-302).
-- Correr: npx supabase test db tests/db
begin;

select plan(17);

-- Arrange (como postgres, sin RLS). Club de A con U13 y U15 (2026), una clase el 14/3 en U13.
--   p1: en U13 desde el 1/3, activo.
--   p2: en U13 desde el 20/3 (todavía no estaba el 14/3).
--   p3: en U13 del 1/2 al 10/3 (ya se había ido el 14/3).
--   p4: en U15 (otra categoría).
--   p5: en U13 desde el 14/3 (entró el día de la clase).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

insert into public.clubs (id, coach_id, name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Club A1');

insert into public.categories (id, club_id, name, season_year) values
  ('00000000-0000-0000-0000-000000000ca1', '00000000-0000-0000-0000-0000000000a1', 'U13', 2026),
  ('00000000-0000-0000-0000-000000000ca2', '00000000-0000-0000-0000-0000000000a1', 'U15', 2026);

insert into public.players (id, club_id, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'Uno', 'P'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a1', 'Dos', 'P'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000a1', 'Tres', 'P'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000a1', 'Cuatro', 'P'),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000a1', 'Cinco', 'P');

insert into public.category_players (category_id, player_id, joined_on, left_on) values
  ('00000000-0000-0000-0000-000000000ca1', '00000000-0000-0000-0000-0000000000f1', '2026-03-01', null),
  ('00000000-0000-0000-0000-000000000ca1', '00000000-0000-0000-0000-0000000000f2', '2026-03-20', null),
  ('00000000-0000-0000-0000-000000000ca1', '00000000-0000-0000-0000-0000000000f3', '2026-02-01', '2026-03-10'),
  ('00000000-0000-0000-0000-000000000ca2', '00000000-0000-0000-0000-0000000000f4', '2026-03-01', null),
  ('00000000-0000-0000-0000-000000000ca1', '00000000-0000-0000-0000-0000000000f5', '2026-03-14', null);

insert into public.sessions (id, category_id, held_on) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000ca1', '2026-03-14');

-- Estructura y privilegios
select has_table('public', 'attendances', 'existe la tabla attendances');
select col_is_pk(
  'public', 'attendances', array['session_id', 'player_id'],
  'la PK es (session_id, player_id)'
);
select table_privs_are(
  'public', 'attendances', 'anon', array[]::text[],
  'anon no tiene ningún privilegio sobre attendances'
);
select table_privs_are(
  'public', 'attendances', 'authenticated', array['SELECT', 'INSERT', 'DELETE'],
  'authenticated sólo puede select, insert y delete en attendances'
);
select function_privs_are(
  'public', 'set_session_attendance', array['uuid', 'uuid[]'], 'anon', array[]::text[],
  'anon no puede ejecutar set_session_attendance'
);

-- Actuar como A.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

-- RN-03 (trigger)
select lives_ok(
  $$ insert into public.attendances (session_id, player_id) values
     ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1') $$,
  'un jugador activo en la fecha puede estar presente'
);
select lives_ok(
  $$ insert into public.attendances (session_id, player_id) values
     ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f5') $$,
  'el día del alta ya cuenta (rango con extremos incluidos)'
);
select throws_ok(
  $$ insert into public.attendances (session_id, player_id) values
     ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f2') $$,
  '23514', null,
  'un jugador que entró después de la clase se rechaza'
);
select throws_ok(
  $$ insert into public.attendances (session_id, player_id) values
     ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f3') $$,
  '23514', null,
  'un jugador dado de baja antes de la clase se rechaza'
);
select throws_ok(
  $$ insert into public.attendances (session_id, player_id) values
     ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f4') $$,
  '23514', null,
  'un jugador de otra categoría se rechaza'
);

-- set_session_attendance: reemplaza el conjunto (f1 y f5 → sólo f5), ignora repetidos.
select lives_ok(
  $$ select public.set_session_attendance(
       '00000000-0000-0000-0000-0000000000e1',
       array['00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000f5']::uuid[]
     ) $$,
  'set_session_attendance acepta ids repetidos'
);
select results_eq(
  $$ select player_id::text from public.attendances $$,
  $$ values ('00000000-0000-0000-0000-0000000000f5') $$,
  'set_session_attendance reemplaza el conjunto de presentes'
);

-- Transacción: si un id es inválido, no se borra lo guardado.
select throws_ok(
  $$ select public.set_session_attendance(
       '00000000-0000-0000-0000-0000000000e1',
       array['00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f4']::uuid[]
     ) $$,
  '23514', null,
  'set_session_attendance rechaza el conjunto si un jugador no corresponde'
);
select results_eq(
  $$ select player_id::text from public.attendances $$,
  $$ values ('00000000-0000-0000-0000-0000000000f5') $$,
  'si falla, queda lo que estaba guardado'
);

-- RLS: B no ve ni modifica la asistencia de A.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b"}';

select is_empty(
  $$ select 1 from public.attendances $$,
  'B no ve la asistencia de A'
);
select throws_ok(
  $$ select public.set_session_attendance('00000000-0000-0000-0000-0000000000e1', array[]::uuid[]) $$,
  '42501', null,
  'B no puede vaciar la asistencia de una clase de A'
);

-- Cascada: borrar la clase borra su asistencia (como A).
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

delete from public.sessions where id = '00000000-0000-0000-0000-0000000000e1';

select is_empty(
  $$ select 1 from public.attendances $$,
  'borrar la clase borra su asistencia'
);

select * from finish();
rollback;
