import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { localSupabase, signedInCoach } from "./helpers";

// US-205 contra Supabase LOCAL (requiere `npx supabase start`). Repite las consultas de
// src/data/seasons.ts y seasons-actions.ts (las acciones usan cookies de Next y no se pueden
// llamar desde acá).
describe("inicio de temporada", () => {
  let admin: SupabaseClient;
  let coachA: SupabaseClient;
  let coachB: SupabaseClient;
  const userIds: string[] = [];
  let club: string;
  let juan: string;
  let pedro: string;

  async function insertId(table: string, row: Record<string, unknown>) {
    const { data, error } = await coachA
      .from(table)
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async function createPlayer(category: string, first: string) {
    const { data, error } = await coachA.rpc("create_player", {
      p_category_id: category,
      p_first_name: first,
      p_last_name: "Test",
      p_birth_year: 2013,
      p_joined_on: "2026-03-02",
    });
    if (error) throw error;
    return data as string;
  }

  // La consulta de listSeasonMemberships.
  function seasonMemberships(coach: SupabaseClient, year: number) {
    return coach
      .from("category_players")
      .select(
        "player_id, joined_on, left_on, category:categories!inner(name, club_id, season_year)",
      )
      .eq("category.club_id", club)
      .eq("category.season_year", year)
      .order("joined_on")
      .order("player_id");
  }

  // La escritura de copyCategories.
  function copyCategories(names: string[]) {
    return coachA.from("categories").upsert(
      names.map((name) => ({ club_id: club, name, season_year: 2027 })),
      { onConflict: "club_id,name,season_year", ignoreDuplicates: true },
    );
  }

  beforeAll(async () => {
    const local = localSupabase();
    admin = local.admin;
    const a = await signedInCoach(admin, local.url, local.publishableKey);
    const b = await signedInCoach(admin, local.url, local.publishableKey);
    userIds.push(a.id, b.id);
    coachA = a.client;
    coachB = b.client;

    club = await insertId("clubs", { name: "Club" });
    const u13 = await insertId("categories", {
      club_id: club,
      name: "U13",
      season_year: 2026,
    });
    const u15 = await insertId("categories", {
      club_id: club,
      name: "U15",
      season_year: 2026,
    });
    juan = await createPlayer(u13, "Juan");
    pedro = await createPlayer(u15, "Pedro");
    const ana = await createPlayer(u13, "Ana");
    const { error } = await coachA
      .from("category_players")
      .update({ left_on: "2026-05-15" })
      .eq("player_id", ana);
    if (error) throw error;
  }, 30_000);

  afterAll(async () => {
    await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
  });

  test("AC1: copiar crea las categorías con los mismos nombres; repetirlo no duplica", async () => {
    expect((await copyCategories(["U13"])).error).toBeNull();
    expect((await copyCategories(["U13", "U15"])).error).toBeNull();

    const { data } = await coachA
      .from("categories")
      .select("name")
      .eq("club_id", club)
      .eq("season_year", 2027)
      .order("name");
    expect(data).toEqual([{ name: "U13" }, { name: "U15" }]);
  });

  test("la consulta por temporada trae sólo las pertenencias de ese año y ese club", async () => {
    const { data, error } = await seasonMemberships(coachA, 2026);
    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect((await seasonMemberships(coachA, 2027)).data).toEqual([]);
    // RLS: B no ve nada del club de A.
    expect((await seasonMemberships(coachB, 2026)).data).toEqual([]);
  });

  describe("asignar", () => {
    let before2026: unknown;
    let u15Of2027: string;

    beforeAll(async () => {
      before2026 = (await seasonMemberships(coachA, 2026)).data;
      const { data } = await coachA
        .from("categories")
        .select("id")
        .eq("club_id", club)
        .eq("season_year", 2027)
        .eq("name", "U15")
        .single();
      u15Of2027 = data!.id;
    });

    test("un insert con una fila inválida no crea ninguna (todo o nada)", async () => {
      const { error } = await coachA.from("category_players").insert([
        { category_id: u15Of2027, player_id: juan, joined_on: "2027-03-01" },
        // Pedro con fecha de 2026 en una categoría de 2027: el trigger lo rechaza.
        { category_id: u15Of2027, player_id: pedro, joined_on: "2026-12-01" },
      ]);
      expect(error?.code).toBe("23514");
      expect((await seasonMemberships(coachA, 2027)).data).toEqual([]);
    });

    test("AC2-AC4: Juan pasa a U15 2027; Pedro 'No sigue'; 2026 queda igual", async () => {
      const { error } = await coachA
        .from("category_players")
        .insert([
          { category_id: u15Of2027, player_id: juan, joined_on: "2027-03-01" },
        ]);
      expect(error).toBeNull();

      const { data: in2027 } = await seasonMemberships(coachA, 2027);
      expect(in2027).toEqual([
        expect.objectContaining({ player_id: juan, left_on: null }),
      ]);

      // AC3 y AC4: ninguna pertenencia de 2026 cambió (Pedro sigue sin baja: no es abandono).
      expect((await seasonMemberships(coachA, 2026)).data).toEqual(before2026);

      // AC2: su primera pertenencia en el club sigue siendo la de 2026 → no es nuevo en 2027.
      const { data: first } = await coachA
        .from("category_players")
        .select("joined_on")
        .eq("player_id", juan)
        .order("joined_on")
        .limit(1);
      expect(first).toEqual([{ joined_on: "2026-03-02" }]);
    });
  });
});
