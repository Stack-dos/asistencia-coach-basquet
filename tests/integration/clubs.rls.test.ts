import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

// Test de integración: usa la API real de Supabase LOCAL (requiere `npx supabase start`).
// Complementa a tests/db/clubs.test.sql: acá probamos el camino de la app (supabase-js + sesión).

// Las claves locales salen de `supabase status`; no sirven fuera de tu máquina / CI.
function localSupabase() {
  const output = execSync("npx supabase status -o env", { encoding: "utf8" });
  const env = Object.fromEntries(
    [...output.matchAll(/^(\w+)="(.*)"$/gm)].map(([, key, value]) => [
      key,
      value,
    ]),
  );
  return {
    url: env.API_URL,
    publishableKey: env.PUBLISHABLE_KEY,
    secretKey: env.SECRET_KEY,
  };
}

const PASSWORD = "test-password-123";

describe("RLS de clubs", () => {
  let admin: SupabaseClient; // con la secret key: saltea RLS. Sólo para preparar y limpiar.
  let coachA: SupabaseClient;
  let coachB: SupabaseClient;
  const userIds: string[] = [];
  let clubId: string;

  // Crea un usuario confirmado y devuelve un cliente con su sesión iniciada.
  async function signedInCoach(url: string, publishableKey: string) {
    const email = `${randomUUID()}@test.local`; // único: el test se puede repetir
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userIds.push(data.user.id);

    const client = createClient(url, publishableKey, {
      auth: { persistSession: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    if (signInError) throw signInError;
    return client;
  }

  beforeAll(async () => {
    const { url, publishableKey, secretKey } = localSupabase();
    admin = createClient(url, secretKey, { auth: { persistSession: false } });
    coachA = await signedInCoach(url, publishableKey);
    coachB = await signedInCoach(url, publishableKey);

    const { data, error } = await coachA
      .from("clubs")
      .insert({ name: "Unión" })
      .select("id")
      .single();
    if (error) throw error;
    clubId = data.id;
  }, 30_000);

  // Borrar los usuarios borra sus clubes (on delete cascade).
  afterAll(async () => {
    await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
  });

  test("A ve su club", async () => {
    const { data } = await coachA.from("clubs").select("id");
    expect(data).toEqual([{ id: clubId }]);
  });

  test("B no ve los clubes de A", async () => {
    const { data, error } = await coachB.from("clubs").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test("B no puede renombrar ni borrar el club de A", async () => {
    // RLS no da error: el update y el delete no encuentran filas.
    const updated = await coachB
      .from("clubs")
      .update({ name: "Hackeado" })
      .eq("id", clubId)
      .select();
    expect(updated.data).toEqual([]);

    const deleted = await coachB
      .from("clubs")
      .delete()
      .eq("id", clubId)
      .select();
    expect(deleted.data).toEqual([]);

    const { data } = await coachA.from("clubs").select("name").eq("id", clubId);
    expect(data).toEqual([{ name: "Unión" }]);
  });

  test("B no puede crear un club a nombre de A", async () => {
    const { data: userA } = await coachA.auth.getUser();
    const { error } = await coachB
      .from("clubs")
      .insert({ coach_id: userA.user!.id, name: "Robado" });
    expect(error?.code).toBe("42501");
  });
});
