import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { localSupabase, signedInCoach } from "./helpers";

// Test de integración: usa la API real de Supabase LOCAL (requiere `npx supabase start`).
// Complementa a tests/db/clubs.test.sql: acá probamos el camino de la app (supabase-js + sesión).

describe("RLS de clubs", () => {
  let admin: SupabaseClient;
  let coachA: SupabaseClient;
  let coachB: SupabaseClient;
  let coachAId: string;
  const userIds: string[] = [];
  let clubId: string;

  beforeAll(async () => {
    const local = localSupabase();
    admin = local.admin;
    const a = await signedInCoach(admin, local.url, local.publishableKey);
    const b = await signedInCoach(admin, local.url, local.publishableKey);
    userIds.push(a.id, b.id);
    coachA = a.client;
    coachAId = a.id;
    coachB = b.client;

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
    const { error } = await coachB
      .from("clubs")
      .insert({ coach_id: coachAId, name: "Robado" });
    expect(error?.code).toBe("42501");
  });
});
