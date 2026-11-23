import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Helpers de los tests de integración: usan la API real de Supabase LOCAL
// (requiere `npx supabase start`).

const PASSWORD = "test-password-123";

// Las claves locales salen de `supabase status`; no sirven fuera de tu máquina / CI.
export function localSupabase() {
  const output = execSync("npx supabase status -o env", { encoding: "utf8" });
  const env = Object.fromEntries(
    [...output.matchAll(/^(\w+)="(.*)"$/gm)].map(([, key, value]) => [
      key,
      value,
    ]),
  );
  const url = env.API_URL;
  return {
    url,
    publishableKey: env.PUBLISHABLE_KEY,
    // Con la secret key: saltea RLS. Sólo para preparar y limpiar.
    admin: createClient(url, env.SECRET_KEY, {
      auth: { persistSession: false },
    }),
  };
}

// Crea un usuario confirmado y devuelve un cliente con su sesión iniciada.
// Borrar el usuario (admin.auth.admin.deleteUser) borra en cascada todo lo suyo.
export async function signedInCoach(
  admin: SupabaseClient,
  url: string,
  publishableKey: string,
): Promise<{ id: string; client: SupabaseClient }> {
  const email = `${randomUUID()}@test.local`; // único: el test se puede repetir
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;

  const client = createClient(url, publishableKey, {
    auth: { persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}
