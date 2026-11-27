import { beforeEach, describe, expect, test, vi } from "vitest";
import { getMembership, listClubPlayers, listPlayers } from "@/data/players";

// Doble de la consulta de supabase-js (como en clubs.test.ts).
const mocks = vi.hoisted(() => {
  const calls: [string, unknown[]][] = [];
  const state = { result: { data: null as unknown, error: null as unknown } };
  const query: Record<string, unknown> = {
    then: (resolve: (value: unknown) => void) => resolve(state.result),
  };
  for (const method of ["select", "eq", "is", "maybeSingle"]) {
    query[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return query;
    };
  }
  return { calls, state, from: vi.fn(() => query) };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from }),
}));

const MEMBERSHIP_COLUMNS =
  "id, category_id, joined_on, left_on, player:players(id, first_name, last_name, birth_year, guardian_name, guardian_phone)";

function membership(id: string, lastName: string, firstName: string) {
  return {
    id,
    category_id: "cat-1",
    joined_on: "2026-03-02",
    left_on: null,
    player: {
      id: `p-${id}`,
      first_name: firstName,
      last_name: lastName,
      birth_year: null,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.state.result = { data: null, error: null };
});

describe("listPlayers", () => {
  test("AC3: por defecto sólo activos (left_on null)", async () => {
    mocks.state.result = { data: [], error: null };

    await listPlayers("cat-1");

    expect(mocks.from).toHaveBeenCalledWith("category_players");
    expect(mocks.calls).toEqual([
      ["select", [MEMBERSHIP_COLUMNS]],
      ["eq", ["category_id", "cat-1"]],
      ["is", ["left_on", null]],
    ]);
  });

  test("con includeInactive también trae a los dados de baja", async () => {
    mocks.state.result = { data: [], error: null };

    await listPlayers("cat-1", { includeInactive: true });

    expect(mocks.calls).not.toContainEqual(["is", ["left_on", null]]);
  });

  test("ordena por apellido y nombre, con reglas del español", async () => {
    mocks.state.result = {
      data: [
        membership("1", "Zárate", "Ana"),
        membership("2", "Álvarez", "Luis"),
        membership("3", "Álvarez", "Juan"),
      ],
      error: null,
    };

    const result = await listPlayers("cat-1");

    expect(result.map((m) => m.id)).toEqual(["3", "2", "1"]);
  });

  test("si falla, lanza el error", async () => {
    mocks.state.result = { data: null, error: { code: "XX000" } };

    await expect(listPlayers("cat-1")).rejects.toEqual({ code: "XX000" });
  });
});

describe("getMembership", () => {
  test("devuelve la pertenencia pedida", async () => {
    const m = membership("1", "Pérez", "Juan");
    mocks.state.result = { data: m, error: null };

    expect(await getMembership("1")).toEqual(m);
    expect(mocks.calls).toEqual([
      ["select", [MEMBERSHIP_COLUMNS]],
      ["eq", ["id", "1"]],
      ["maybeSingle", []],
    ]);
  });

  test("si el id no es un uuid (22P02) devuelve null", async () => {
    mocks.state.result = { data: null, error: { code: "22P02" } };

    expect(await getMembership("hola")).toBeNull();
  });
});

describe("listClubPlayers", () => {
  test("trae las personas del club", async () => {
    mocks.state.result = { data: [], error: null };

    await listClubPlayers("club-1");

    expect(mocks.from).toHaveBeenCalledWith("players");
    expect(mocks.calls).toEqual([
      [
        "select",
        [
          "id, first_name, last_name, birth_year, guardian_name, guardian_phone",
        ],
      ],
      ["eq", ["club_id", "club-1"]],
    ]);
  });
});
