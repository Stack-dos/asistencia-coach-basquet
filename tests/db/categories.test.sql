-- Tests de base (pgTAP) para la tabla categories y la función owns_club.
-- Correr: npx supabase test db tests/db
begin;

select plan(19);

-- Arrange (como postgres, sin RLS): A tiene dos clubes, B uno.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

insert into public.clubs (id, coach_id, name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Club A1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Club A2'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Club B1');

-- Estructura y privilegios
select has_table('public', 'categories', 'existe la tabla categories');
select is(
  (select relrowsecurity from pg_class where oid = 'public.categories'::regclass),
  true,
  'categories tiene RLS habilitado'
);
select table_privs_are(
  'public', 'categories', 'anon', array[]::text[],
  'anon no tiene ningún privilegio sobre categories'
);
select table_privs_are(
  'public', 'categories', 'authenticated',
  array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'authenticated sólo puede select, insert, update y delete en categories'
);
select function_privs_are(
  'public', 'owns_club', array['uuid'], 'anon', array[]::text[],
  'anon no puede ejecutar owns_club'
);
select function_privs_are(
  'public', 'owns_club', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated puede ejecutar owns_club'
);

-- Actuar como A.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select is(
  public.owns_club('00000000-0000-0000-0000-0000000000a1'), true,
  'owns_club: A es dueño de su club'
);
select is(
  public.owns_club('00000000-0000-0000-0000-0000000000b1'), false,
  'owns_club: A no es dueño del club de B'
);

select lives_ok(
  $$ insert into public.categories (club_id, name, season_year)
     values ('00000000-0000-0000-0000-0000000000a1', 'U13', 2026) $$,
  'A puede crear una categoría en su club'
);

-- AC2: el nombre es único por club y temporada.
select throws_ok(
  $$ insert into public.categories (club_id, name, season_year)
     values ('00000000-0000-0000-0000-0000000000a1', 'U13', 2026) $$,
  '23505', null,
  'no se repite el nombre en el mismo club y temporada'
);
select lives_ok(
  $$ insert into public.categories (club_id, name, season_year)
     values ('00000000-0000-0000-0000-0000000000a1', 'U13', 2025) $$,
  'el mismo nombre en otra temporada se permite'
);
select lives_ok(
  $$ insert into public.categories (club_id, name, season_year)
     values ('00000000-0000-0000-0000-0000000000a2', 'U13', 2026) $$,
  'el mismo nombre en otro club se permite'
);

-- Checks
select throws_ok(
  $$ insert into public.categories (club_id, name, season_year)
     values ('00000000-0000-0000-0000-0000000000a1', '   ', 2026) $$,
  '23514', null,
  'un nombre con sólo espacios viola el check'
);
select throws_ok(
  $$ insert into public.categories (club_id, name, season_year)
     values ('00000000-0000-0000-0000-0000000000a1', repeat('x', 81), 2026) $$,
  '23514', null,
  'un nombre de más de 80 caracteres viola el check'
);
select throws_ok(
  $$ insert into public.categories (club_id, name, season_year)
     values ('00000000-0000-0000-0000-0000000000a1', 'U15', 1999) $$,
  '23514', null,
  'una temporada fuera de 2000-2100 viola el check'
);

-- RLS (with check): A no puede crear ni mover categorías a un club de B.
select throws_ok(
  $$ insert into public.categories (club_id, name, season_year)
     values ('00000000-0000-0000-0000-0000000000b1', 'Intrusa', 2026) $$,
  '42501', null,
  'A no puede crear una categoría en un club de B'
);
select throws_ok(
  $$ update public.categories set club_id = '00000000-0000-0000-0000-0000000000b1' $$,
  '42501', null,
  'A no puede mover sus categorías a un club de B'
);

-- RLS (using): B no ve ni modifica las categorías de A. No da error: las filas son invisibles.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b"}';

select is_empty(
  $$ select 1 from public.categories $$,
  'B no ve las categorías de A'
);

update public.categories set name = 'Hackeada';
delete from public.categories;

-- AC3: borrar el club borra sus categorías (verificado como A, que es quien las ve).
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

delete from public.clubs where id = '00000000-0000-0000-0000-0000000000a1';

select results_eq(
  $$ select club_id::text, name, season_year from public.categories $$,
  $$ values ('00000000-0000-0000-0000-0000000000a2', 'U13', 2026::smallint) $$,
  'B no tocó nada y borrar el club A1 borró sólo sus categorías'
);

select * from finish();
rollback;
