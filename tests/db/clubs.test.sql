-- Tests de base (pgTAP) para la tabla clubs. Correr: npx supabase test db tests/db
-- Todo corre dentro de una transacción que se deshace al final: no deja datos.
begin;

select plan(3); -- TODO(nico): actualizar con la cantidad total de asserts.

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

-- TODO(nico): escribí un assert por cada regla. Funciones útiles de pgTAP:
--   throws_ok($$ <sql> $$, '<código>', '<descripción>')  → el SQL falla con ese SQLSTATE
--   is(<valor real>, <valor esperado>, '<descripción>')    → compara valores
--   is_empty($$ <select> $$, '<descripción>')              → el select no devuelve filas
-- Casos:
--   1. A repite 'Unión'                          → 23505
--   2. A crea un club con nombre '   '            → 23514
--   3. A crea un club con 81 caracteres           → 23514
--   4. A crea un club con coach_id de B           → 42501
--   5. Como B: no ve el club de A                 (cambiar request.jwt.claims)
--   6. Como B: update/delete no afectan al club de A (volver a A y verificar que sigue igual)

select * from finish();
rollback;
