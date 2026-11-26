import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { localSupabase, signedInCoach } from "./helpers";

// Test de integración: usa la API real de Supabase LOCAL (requiere `npx supabase start`).
// Complementa a tests/db/attendances.test.sql por el camino de la app (rpc de supabase-js).

describe("attendances: trigger y set_session_attendance", () => {
  let admin: SupabaseClient;
  let coach: SupabaseClient;
  let userId: string;
  let sessionId: string;
  let activeId: string;
  let lateId: string;

  async function createPlayer(categoryId: string, joinedOn: string) {
    const { data, error } = await coach.rpc("create_player", {
      p_category_id: categoryId,
      p_first_name: "Jugador",
      p_last_name: joinedOn,
      p_birth_year: null,
      p_joined_on: joinedOn,
    });
    if (error) throw error;
    return data as string;
  }

  async function presentIds() {
    const { data, error } = await coach
      .from("attendances")
      .select("player_id")
      .eq("session_id", sessionId);
    if (error) throw error;
    return data.map((row) => row.player_id).sort();
  }

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
    const session = await coach
      .from("sessions")
      .insert({ category_id: category.data.id, held_on: "2026-03-14" })
      .select("id")
      .single();
    if (session.error) throw session.error;
    sessionId = session.data.id;

    activeId = await createPlayer(category.data.id, "2026-03-01");
    lateId = await createPlayer(category.data.id, "2026-03-20");
  }, 30_000);

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userId);
  });

  test("set_session_attendance guarda y después reemplaza el conjunto", async () => {
    const saved = await coach.rpc("set_session_attendance", {
      p_session_id: sessionId,
      p_player_ids: [activeId],
    });
    expect(saved.error).toBeNull();
    expect(await presentIds()).toEqual([activeId]);

    const cleared = await coach.rpc("set_session_attendance", {
      p_session_id: sessionId,
      p_player_ids: [],
    });
    expect(cleared.error).toBeNull();
    expect(await presentIds()).toEqual([]);
  });

  test("RN-03: un jugador sin pertenencia en la fecha da 23514 y no borra lo guardado", async () => {
    await coach.rpc("set_session_attendance", {
      p_session_id: sessionId,
      p_player_ids: [activeId],
    });

    const { error } = await coach.rpc("set_session_attendance", {
      p_session_id: sessionId,
      p_player_ids: [lateId],
    });
    expect(error?.code).toBe("23514");
    expect(await presentIds()).toEqual([activeId]);
  });
});
