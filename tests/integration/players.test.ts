import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { localSupabase, signedInCoach } from "./helpers";

// Test de integración: usa la API real de Supabase LOCAL (requiere `npx supabase start`).
// Complementa a tests/db/players.test.sql: acá probamos el camino de la app (supabase-js +
// sesión + PostgREST), incluido el pasaje de parámetros JSON a las funciones (rpc).

describe("players y category_players", () => {
  let admin: SupabaseClient;
  let coachA: SupabaseClient;
  let coachB: SupabaseClient;
  const userIds: string[] = [];
  let categoryA: string;
  let playerA: string;

  async function insertId(
    coach: SupabaseClient,
    table: string,
    row: Record<string, unknown>,
  ) {
    const { data, error } = await coach
      .from(table)
      .insert(row)
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

    const clubA = await insertId(coachA, "clubs", { name: "Club de A" });
    categoryA = await insertId(coachA, "categories", {
      club_id: clubA,
      name: "U13",
      season_year: 2026,
    });

    // create_player por rpc: los parámetros viajan como JSON (número y texto "AAAA-MM-DD").
    const { data, error } = await coachA.rpc("create_player", {
      p_category_id: categoryA,
      p_first_name: "Juan",
      p_last_name: "Pérez",
      p_birth_year: 2013,
      p_joined_on: "2026-03-02",
    });
    if (error) throw error;
    playerA = data as string;
  }, 30_000);

  // Borrar los usuarios borra en cascada clubes, categorías, jugadores y pertenencias.
  afterAll(async () => {
    await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
  });

  test("create_player creó la persona y su pertenencia (con el embed de la app)", async () => {
    const { data, error } = await coachA
      .from("category_players")
      .select("joined_on, player:players(first_name, birth_year)")
      .eq("category_id", categoryA);
    expect(error).toBeNull();
    expect(data).toEqual([
      {
        joined_on: "2026-03-02",
        player: { first_name: "Juan", birth_year: 2013 },
      },
    ]);
  });

  test("la restricción de exclusión rechaza dos pertenencias superpuestas", async () => {
    const { error } = await coachA.from("category_players").insert({
      category_id: categoryA,
      player_id: playerA,
      joined_on: "2026-06-01",
    });
    expect(error?.code).toBe("23P01");
  });

  test("AC5: un alta fuera de la temporada se rechaza", async () => {
    const { error } = await coachA.rpc("create_player", {
      p_category_id: categoryA,
      p_first_name: "Ana",
      p_last_name: "Gómez",
      p_birth_year: null,
      p_joined_on: "2025-03-02",
    });
    expect(error?.code).toBe("23514");
  });

  // Con su propio jugador, para no cambiar las pertenencias que miran los tests de RLS.
  describe("US-204: baja y vuelta", () => {
    let membershipId: string;
    let playerId: string;

    beforeAll(async () => {
      const { data, error } = await coachA.rpc("create_player", {
        p_category_id: categoryA,
        p_first_name: "Luz",
        p_last_name: "Baja",
        p_birth_year: null,
        p_joined_on: "2026-03-02",
      });
      if (error) throw error;
      playerId = data as string;
      const membership = await coachA
        .from("category_players")
        .select("id")
        .eq("player_id", playerId)
        .single();
      membershipId = membership.data!.id;
    });

    test("AC1: el check rechaza una baja anterior al alta", async () => {
      const { error } = await coachA
        .from("category_players")
        .update({ left_on: "2026-03-01" })
        .eq("id", membershipId);
      expect(error?.code).toBe("23514");
    });

    test("una baja válida cierra la pertenencia", async () => {
      const { error } = await coachA
        .from("category_players")
        .update({ left_on: "2026-05-15" })
        .eq("id", membershipId);
      expect(error).toBeNull();
    });

    test("volver a cargar con fecha anterior a la baja se rechaza (superposición)", async () => {
      const { error } = await coachA.from("category_players").insert({
        category_id: categoryA,
        player_id: playerId,
        joined_on: "2026-05-15",
      });
      expect(error?.code).toBe("23P01");
    });

    test("AC3: volver a cargar después de la baja crea otra pertenencia; queda el hueco", async () => {
      const { error } = await coachA.from("category_players").insert({
        category_id: categoryA,
        player_id: playerId,
        joined_on: "2026-09-07",
      });
      expect(error).toBeNull();

      const { data } = await coachA
        .from("category_players")
        .select("joined_on, left_on")
        .eq("player_id", playerId)
        .order("joined_on");
      expect(data).toEqual([
        { joined_on: "2026-03-02", left_on: "2026-05-15" },
        { joined_on: "2026-09-07", left_on: null },
      ]);
    });
  });

  describe("RLS", () => {
    test("B no ve los jugadores ni las pertenencias de A", async () => {
      const players = await coachB.from("players").select("id");
      const memberships = await coachB.from("category_players").select("id");
      expect(players.error).toBeNull();
      expect(players.data).toEqual([]);
      expect(memberships.data).toEqual([]);
    });

    test("B no puede modificar ni borrar a un jugador de A", async () => {
      const updated = await coachB
        .from("players")
        .update({ first_name: "Hackeado" })
        .eq("id", playerA)
        .select();
      const deleted = await coachB
        .from("category_players")
        .delete()
        .eq("player_id", playerA)
        .select();
      expect(updated.data).toEqual([]);
      expect(deleted.data).toEqual([]);

      const { data } = await coachA
        .from("players")
        .select("first_name")
        .eq("id", playerA);
      expect(data).toEqual([{ first_name: "Juan" }]);
    });

    test("B no puede agregar jugadores en la categoría de A", async () => {
      const { error } = await coachB.rpc("create_player", {
        p_category_id: categoryA,
        p_first_name: "Intruso",
        p_last_name: "X",
        p_birth_year: null,
        p_joined_on: "2026-03-02",
      });
      expect(error?.code).toBe("42501");
    });

    test("delete_category_player de B no borra nada de A", async () => {
      const { data: memberships } = await coachA
        .from("category_players")
        .select("id")
        .eq("player_id", playerA);
      const { data, error } = await coachB.rpc("delete_category_player", {
        p_category_player_id: memberships![0].id,
      });
      expect(error).toBeNull();
      expect(data).toBeNull();

      const { count } = await admin
        .from("category_players")
        .select("id", { count: "exact", head: true })
        .eq("player_id", playerA);
      expect(count).toBe(1);
    });
  });
});
