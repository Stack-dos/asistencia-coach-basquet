import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { localSupabase, signedInCoach } from "./helpers";

// Test de integración: usa la API real de Supabase LOCAL (requiere `npx supabase start`).
// Complementa a tests/db/categories.test.sql: acá probamos el camino de la app (supabase-js + sesión).

describe("categories: RLS y cascada desde clubs", () => {
  let admin: SupabaseClient;
  let coachA: SupabaseClient;
  let coachB: SupabaseClient;
  const userIds: string[] = [];

  async function createClub(coach: SupabaseClient, name: string) {
    const { data, error } = await coach
      .from("clubs")
      .insert({ name })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async function createCategory(
    coach: SupabaseClient,
    clubId: string,
    name: string,
  ) {
    const { data, error } = await coach
      .from("categories")
      .insert({ club_id: clubId, name, season_year: 2026 })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  beforeAll(async () => {
    const local = localSupabase();
    admin = local.admin;
    const a = await signedInCoach(admin, local.url, local.publishableKey);
    const b = await signedInCoach(admin, local.url, local.publishableKey);
    userIds.push(a.id, b.id);
    coachA = a.client;
    coachB = b.client;
  }, 30_000);

  // Borrar los usuarios borra sus clubes y, en cascada, sus categorías.
  afterAll(async () => {
    await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
  });

  describe("RLS", () => {
    let clubA: string;
    let categoryA: string;

    beforeAll(async () => {
      clubA = await createClub(coachA, "Club de A");
      categoryA = await createCategory(coachA, clubA, "U13");
    });

    test("A ve la categoría de su club", async () => {
      const { data } = await coachA
        .from("categories")
        .select("id")
        .eq("club_id", clubA);
      expect(data).toEqual([{ id: categoryA }]);
    });

    test("B no ve las categorías de A", async () => {
      const { data, error } = await coachB.from("categories").select("id");
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("B no puede renombrar ni borrar la categoría de A", async () => {
      // RLS no da error: el update y el delete no encuentran filas.
      const updated = await coachB
        .from("categories")
        .update({ name: "Hackeada" })
        .eq("id", categoryA)
        .select();
      expect(updated.data).toEqual([]);

      const deleted = await coachB
        .from("categories")
        .delete()
        .eq("id", categoryA)
        .select();
      expect(deleted.data).toEqual([]);

      const { data } = await coachA
        .from("categories")
        .select("name")
        .eq("id", categoryA);
      expect(data).toEqual([{ name: "U13" }]);
    });

    test("B no puede crear una categoría en el club de A", async () => {
      const { error } = await coachB
        .from("categories")
        .insert({ club_id: clubA, name: "Intrusa", season_year: 2026 });
      expect(error?.code).toBe("42501");
    });

    test("B no puede mover una categoría suya al club de A", async () => {
      const clubB = await createClub(coachB, "Club de B");
      const categoryB = await createCategory(coachB, clubB, "U15");

      const { error } = await coachB
        .from("categories")
        .update({ club_id: clubA })
        .eq("id", categoryB);
      expect(error?.code).toBe("42501");
    });
  });

  test("AC3: eliminar un club elimina sus categorías", async () => {
    const clubId = await createClub(coachA, "Club a borrar");
    const categoryId = await createCategory(coachA, clubId, "Mini");

    const { error } = await coachA.from("clubs").delete().eq("id", clubId);
    expect(error).toBeNull();

    // Con admin (sin RLS): la fila no existe, no es que esté oculta.
    const { data } = await admin
      .from("categories")
      .select("id")
      .eq("id", categoryId);
    expect(data).toEqual([]);
  });
});
