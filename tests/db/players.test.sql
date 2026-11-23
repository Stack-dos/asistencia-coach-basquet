-- Tests de base (pgTAP) para players, category_players y sus funciones.
-- Correr: npx supabase test db tests/db
begin;

select plan(39);

-- Arrange (como postgres, sin RLS).
-- A: clubes a1 (categorías c1 2026 y c2 2025) y a2 (c3 2026). B: club b1 (c4 2026).
-- Jugadores: d1 (Juan, de a1), d2 (de a2), d3 (de b1).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

insert into public.clubs (id, coach_id, name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Club A1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Club A2'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Club B1');

insert into public.categories (id, club_id, name, season_year) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'U13', 2026),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'U13', 2025),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a2', 'U13', 2026),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000b1', 'U13', 2026);

insert into public.players (id, club_id, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', 'Juan', 'Pérez'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a2', 'Otro', 'Club'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b1', 'De', 'B');

-- Estructura y privilegios
select has_table('public', 'players', 'existe la tabla players');
select has_table('public', 'category_players', 'existe la tabla category_players');
select is(
  (select relrowsecurity from pg_class where oid = 'public.players'::regclass),
  true, 'players tiene RLS habilitado'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.category_players'::regclass),
  true, 'category_players tiene RLS habilitado'
);
select table_privs_are('public', 'players', 'anon', array[]::text[],
  'anon no tiene privilegios sobre players');
select table_privs_are('public', 'players', 'authenticated',
  array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'authenticated: select, insert, update y delete en players');
select table_privs_are('public', 'category_players', 'anon', array[]::text[],
  'anon no tiene privilegios sobre category_players');
select table_privs_are('public', 'category_players', 'authenticated',
  array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'authenticated: select, insert, update y delete en category_players');
select function_privs_are('public', 'owns_category', array['uuid'], 'authenticated',
  array['EXECUTE'], 'authenticated puede ejecutar owns_category');
select function_privs_are('public', 'create_player',
  array['uuid', 'text', 'text', 'smallint', 'date'], 'anon', array[]::text[],
  'anon no puede ejecutar create_player');
select function_privs_are('public', 'create_player',
  array['uuid', 'text', 'text', 'smallint', 'date'], 'authenticated', array['EXECUTE'],
  'authenticated puede ejecutar create_player');
select function_privs_are('public', 'delete_category_player', array['uuid'], 'authenticated',
  array['EXECUTE'], 'authenticated puede ejecutar delete_category_player');
select function_privs_are('public', 'category_players_validate', array[]::text[],
  'authenticated', array[]::text[], 'nadie ejecuta directo la función del trigger');

-- Actuar como A.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select lives_ok(
  $$ insert into public.category_players (category_id, player_id, joined_on)
     values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '2026-03-02') $$,
  'A agrega a su jugador a su categoría (el trigger corre aunque nadie tenga execute)'
);

-- Restricción de exclusión: pertenencias superpuestas.
select throws_ok(
  $$ insert into public.category_players (category_id, player_id, joined_on)
     values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '2026-06-01') $$,
  '23P01', null,
  'dos pertenencias superpuestas en la misma categoría se rechazan'
);

update public.category_players set left_on = '2026-05-15'
  where player_id = '00000000-0000-0000-0000-0000000000d1';

select lives_ok(
  $$ insert into public.category_players (category_id, player_id, joined_on)
     values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '2026-09-07') $$,
  'después de una baja, una pertenencia nueva que no se superpone se permite'
);
select throws_ok(
  $$ update public.category_players set left_on = '2026-01-10'
     where player_id = '00000000-0000-0000-0000-0000000000d1' and joined_on = '2026-03-02' $$,
  '23514', null,
  'la baja no puede ser anterior al alta'
);

-- Trigger: temporada y club.
select throws_ok(
  $$ insert into public.category_players (category_id, player_id, joined_on)
     values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d1', '2026-03-02') $$,
  '23514', null,
  'AC5: un alta fuera de la temporada de la categoría se rechaza'
);
select lives_ok(
  $$ insert into public.category_players (category_id, player_id, joined_on)
     values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d1', '2025-03-03') $$,
  'el mismo jugador en la categoría de otra temporada, con fecha de esa temporada'
);
select throws_ok(
  $$ insert into public.category_players (category_id, player_id, joined_on)
     values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2', '2026-03-02') $$,
  '23514', null,
  'un jugador de otro club (aunque sea de A) no entra en la categoría'
);
select throws_ok(
  $$ insert into public.category_players (category_id, player_id, joined_on)
     values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d3', '2026-03-02') $$,
  '23514', null,
  'A no puede meter en su categoría a un jugador de B'
);

-- RLS (with check)
select throws_ok(
  $$ insert into public.category_players (category_id, player_id, joined_on)
     values ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000d1', '2026-03-02') $$,
  '42501', null,
  'A no puede agregar pertenencias en una categoría de B'
);
select throws_ok(
  $$ insert into public.players (club_id, first_name, last_name)
     values ('00000000-0000-0000-0000-0000000000b1', 'Intruso', 'X') $$,
  '42501', null,
  'A no puede crear jugadores en un club de B'
);
select throws_ok(
  $$ insert into public.players (club_id, first_name, last_name, birth_year)
     values ('00000000-0000-0000-0000-0000000000a1', 'Viejo', 'X', 1899) $$,
  '23514', null,
  'un año de nacimiento anterior a 1900 viola el check'
);

-- create_player: persona + pertenencia en una sola transacción.
select isnt(
  public.create_player('00000000-0000-0000-0000-0000000000c1', 'Ana', 'Gómez', 2013::smallint, '2026-04-01'),
  null,
  'create_player crea la persona y devuelve su id'
);
select is(
  (select count(*)::int from public.category_players cp
     join public.players p on p.id = cp.player_id
     where p.first_name = 'Ana' and cp.category_id = '00000000-0000-0000-0000-0000000000c1'),
  1,
  'create_player también crea la pertenencia'
);
select throws_ok(
  $$ select public.create_player('00000000-0000-0000-0000-0000000000c1', 'Fallida', 'X', null, '2025-04-01') $$,
  '23514', null,
  'create_player con fecha fuera de temporada falla'
);
select is(
  (select count(*)::int from public.players where first_name = 'Fallida'),
  0,
  'y no deja a la persona suelta (todo o nada)'
);
select throws_ok(
  $$ select public.create_player('00000000-0000-0000-0000-0000000000c4', 'Intruso', 'X', null, '2026-04-01') $$,
  '42501', null,
  'create_player en una categoría de B falla'
);

-- delete_category_player
select lives_ok(
  $$ select public.delete_category_player(
       (select cp.id from public.category_players cp
          join public.players p on p.id = cp.player_id where p.first_name = 'Ana')) $$,
  'se borra la única pertenencia de Ana'
);
select is(
  (select count(*)::int from public.players where first_name = 'Ana'),
  0,
  'sin pertenencias, la persona también se borra'
);
select lives_ok(
  $$ select public.delete_category_player(
       (select id from public.category_players
          where player_id = '00000000-0000-0000-0000-0000000000d1'
            and category_id = '00000000-0000-0000-0000-0000000000c2')) $$,
  'se borra una de las pertenencias de Juan'
);
select is(
  (select count(*)::int from public.players where id = '00000000-0000-0000-0000-0000000000d1'),
  1,
  'Juan sigue existiendo: tiene otras pertenencias'
);

-- RLS (using): B no ve ni modifica lo de A.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b"}';

select results_eq(
  $$ select id::text from public.players $$,
  $$ values ('00000000-0000-0000-0000-0000000000d3') $$,
  'B sólo ve a sus jugadores'
);
select is_empty(
  $$ select 1 from public.category_players $$,
  'B no ve las pertenencias de A'
);

update public.players set first_name = 'Hackeado';
delete from public.category_players;

-- Cascadas (verificado como A).
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select is(
  (select count(*)::int from public.category_players
     where player_id = '00000000-0000-0000-0000-0000000000d1'),
  2,
  'el update y el delete de B no afectaron a A'
);

delete from public.categories where id = '00000000-0000-0000-0000-0000000000c1';

select is_empty(
  $$ select 1 from public.category_players
     where category_id = '00000000-0000-0000-0000-0000000000c1' $$,
  'borrar la categoría borra sus pertenencias'
);
select is(
  (select first_name from public.players where id = '00000000-0000-0000-0000-0000000000d1'),
  'Juan',
  'pero no a la persona, que es del club'
);

delete from public.clubs where id = '00000000-0000-0000-0000-0000000000a1';

select is_empty(
  $$ select 1 from public.players
     where club_id = '00000000-0000-0000-0000-0000000000a1' $$,
  'borrar el club borra a sus jugadores'
);

select * from finish();
rollback;
