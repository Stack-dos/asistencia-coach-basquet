-- Tests de base (pgTAP) para la tabla clubs. Correr: npx supabase test db tests/db
-- Todo corre dentro de una transacción que se deshace al final: no deja datos.
begin;

select plan(9);

-- Arrange: dos entrenadores ficticios.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

-- Estructura
select has_table('public', 'clubs', 'existe la tabla clubs');
select is(
  (select relrowsecurity from pg_class where oid = 'public.clubs'::regclass),
  true,
  'clubs tiene RLS habilitado'
);

-- Actuar como el entrenador A (lo mismo que hace Supabase con el JWT de la sesión).
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select lives_ok(
  $$ insert into public.clubs (name) values ('Unión') $$,
  'A puede crear un club sin mandar coach_id'
);

-- Constraints (siendo A)
select throws_ok(
  $$ insert into public.clubs (name) values ('Unión') $$,
  '23505', null,
  'A no puede repetir el nombre de un club'
);
select throws_ok(
  $$ insert into public.clubs (name) values ('   ') $$,
  '23514', null,
  'un nombre con sólo espacios viola el check'
);
select throws_ok(
  $$ insert into public.clubs (name) values (repeat('x', 81)) $$,
  '23514', null,
  'un nombre de más de 80 caracteres viola el check'
);

-- RLS: A no puede crear un club a nombre de B (with check).
select throws_ok(
  $$ insert into public.clubs (coach_id, name)
     values ('00000000-0000-0000-0000-00000000000b', 'Robado') $$,
  '42501', null,
  'A no puede crear un club a nombre de B'
);

-- RLS: B no ve ni modifica el club de A (using). No da error: la fila es invisible.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b"}';

select is_empty(
  $$ select 1 from public.clubs $$,
  'B no ve los clubes de A'
);

update public.clubs set name = 'Hackeado';
delete from public.clubs;

-- Verificamos siendo A: como B, cualquier select daría vacío aunque el club se hubiera borrado.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select results_eq(
  $$ select name from public.clubs $$,
  $$ values ('Unión') $$,
  'el update y el delete de B no afectaron el club de A'
);

select * from finish();
rollback;
