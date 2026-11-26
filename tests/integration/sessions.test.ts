import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { localSupabase, signedInCoach } from "./helpers";

// Test de integración: usa la API real de Supabase LOCAL (requiere `npx supabase start`).
// Complementa a tests/db/sessions.test.sql: acá verificamos los códigos de error que la app
// va a traducir a mensajes (US-301 AC2 y AC5).

describe("sessions: unique por día y temporada", () => {
  let admin: SupabaseClient;
  let coach: SupabaseClient;
  let userId: string;
  let categoryId: string;

  beforeAll(async () => {
    const local = localSupabase();
    admin = local.admin;
    const a = await signedInCoach(admin, local.url, local.publishableKey);
    userId = a.id;
    coach = a.client;

    const club = await coach
      .from("clubs")
      .insert({ name: "Club" })
      .select("id")
      .single();
    if (club.error) throw club.error;
    const category = await coach
      .from("categories")
      .insert({ club_id: club.data.id, name: "U13", season_year: 2026 })
      .select("id")
      .single();
    if (category.error) throw category.error;
    categoryId = category.data.id;
  }, 30_000);

  // Borrar el usuario borra en cascada club, categoría y clases.
  afterAll(async () => {
    await admin.auth.admin.deleteUser(userId);
  });

  test("AC2: una fecha repetida en la misma categoría da 23505", async () => {
    const first = await coach
      .from("sessions")
      .insert({ category_id: categoryId, held_on: "2026-03-14" });
    expect(first.error).toBeNull();

    const repeated = await coach
      .from("sessions")
      .insert({ category_id: categoryId, held_on: "2026-03-14" });
    expect(repeated.error?.code).toBe("23505");
  });

  test("AC5: una fecha fuera de la temporada da 23514", async () => {
    const { error } = await coach
      .from("sessions")
      .insert({ category_id: categoryId, held_on: "2027-03-14" });
    expect(error?.code).toBe("23514");
  });
});
