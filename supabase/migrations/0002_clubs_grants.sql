-- Privilegios explícitos: no depender de los default privileges del proyecto.
-- En local Supabase le da todo a anon y authenticated; en producción no da nada (error 42501).
-- GRANT decide si el rol puede usar la tabla; RLS (0001) decide qué filas.
revoke all on table public.clubs from anon, authenticated;
grant select, insert, update, delete on table public.clubs to authenticated;
