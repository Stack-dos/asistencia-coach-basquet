-- Tests de base (pgTAP) para la tabla sessions (US-301).
-- Correr: npx supabase test db tests/db
begin;

select plan(14);

-- Arrange (como postgres, sin RLS): A tiene una categoría 2026; B un club propio.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

insert into public.clubs (id, coach_id, name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Club A1'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Club B1');

insert into public.categories (id, club_id, name, season_year) values
  ('00000000-0000-0000-0000-000000000ca1', '00000000-0000-0000-0000-0000000000a1', 'U13', 2026);

-- Estructura y privilegios
select has_table('public', 'sessions', 'existe la tabla sessions');
select is(
  (select relrowsecurity from pg_class where oid = 'public.sessions'::regclass),
  true,
  'sessions tiene RLS habilitado'
);
select table_privs_are(
  'public', 'sessions', 'anon', array[]::text[],
  'anon no tiene ningún privilegio sobre sessions'
);
select table_privs_are(
  'public', 'sessions', 'authenticated',
  array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'authenticated sólo puede select, insert, update y delete en sessions'
);

-- Actuar como A.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select lives_ok(
  $$ insert into public.sessions (category_id, held_on)
     values ('00000000-0000-0000-0000-000000000ca1', '2026-03-14') $$,
  'A puede crear una clase en su categoría'
);

-- RN-06 / AC2
select throws_ok(
  $$ insert into public.sessions (category_id, held_on)
     values ('00000000-0000-0000-0000-000000000ca1', '2026-03-14') $$,
  '23505', null,
  'no puede haber dos clases el mismo día en la misma categoría'
);

-- AC5: bordes de la temporada.
select lives_ok(
  $$ insert into public.sessions (category_id, held_on) values
     ('00000000-0000-0000-0000-000000000ca1', '2026-01-01'),
     ('00000000-0000-0000-0000-000000000ca1', '2026-12-31') $$,
  'el 1/1 y el 31/12 de la temporada se aceptan'
);
select throws_ok(
  $$ insert into public.sessions (category_id, held_on)
     values ('00000000-0000-0000-0000-000000000ca1', '2025-12-31') $$,
  '23514', null,
  'una fecha anterior a la temporada se rechaza'
);
select throws_ok(
  $$ insert into public.sessions (category_id, held_on)
     values ('00000000-0000-0000-0000-000000000ca1', '2027-01-01') $$,
  '23514', null,
  'una fecha posterior a la temporada se rechaza'
);
-- AC3 + AC5: el trigger también corre al cambiar la fecha.
select throws_ok(
  $$ update public.sessions set held_on = '2027-03-14' where held_on = '2026-03-14' $$,
  '23514', null,
  'cambiar la fecha a otra temporada se rechaza'
);
select throws_ok(
  $$ update public.sessions set held_on = '2026-01-01' where held_on = '2026-03-14' $$,
  '23505', null,
  'cambiar la fecha a un día que ya tiene clase se rechaza'
);

-- RLS (using): B no ve ni modifica las clases de A.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b"}';

select is_empty(
  $$ select 1 from public.sessions $$,
  'B no ve las clases de A'
);
-- RLS (with check): B no puede crear clases en la categoría de A.
select throws_ok(
  $$ insert into public.sessions (category_id, held_on)
     values ('00000000-0000-0000-0000-000000000ca1', '2026-05-01') $$,
  '42501', null,
  'B no puede crear una clase en la categoría de A'
);

-- Cascada: borrar la categoría borra sus clases (como A).
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

delete from public.categories where id = '00000000-0000-0000-0000-000000000ca1';

select is_empty(
  $$ select 1 from public.sessions $$,
  'borrar la categoría borra sus clases'
);

select * from finish();
rollback;
