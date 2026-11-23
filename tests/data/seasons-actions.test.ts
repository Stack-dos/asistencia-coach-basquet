import { beforeEach, describe, expect, test, vi } from "vitest";
import { assignPlayers, copyCategories } from "@/data/seasons-actions";
import { assignErrorMessage } from "@/domain/club-errors";

// Mismo esquema que players-actions.test.ts: listCategories es un doble y las escrituras usan un
// doble de supabase-js que resuelve con el siguiente resultado de `results`.
const mocks = vi.hoisted(() => {
  const calls: [string, unknown[]][] = [];
  const state = { results: [] as { error: unknown }[] };
  const query: Record<string, unknown> = {
    then: (resolve: (value: unknown) => void) =>
      resolve(state.results.shift() ?? { data: null, error: null }),
  };
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, args]);
      return query;
    };
  query.insert = record("insert");
  query.upsert = record("upsert");
  return {
    calls,
    state,
    from: record("from"),
    listCategories: vi.fn(),
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from }),
}));
vi.mock("@/data/categories", () => ({ listCategories: mocks.listCategories }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(data))
    formData.append(name, value);
  return formData;
}

const u13 = {
  id: "cat-u13",
  club_id: "club-1",
  name: "U13",
  season_year: 2027,
};
const u15 = {
  id: "cat-u15",
  club_id: "club-1",
  name: "U15",
  season_year: 2027,
};

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.state.results = [];
  vi.clearAllMocks();
});

describe("copyCategories (AC1)", () => {
  test("crea las del año nuevo con los mismos nombres, omitiendo las que ya existen", async () => {
    mocks.listCategories.mockResolvedValue([
      { ...u13, season_year: 2026 },
      { ...u15, season_year: 2026 },
    ]);

    await copyCategories("club-1", 2026, 2027);

    expect(mocks.listCategories).toHaveBeenCalledWith("club-1", 2026);
    expect(mocks.calls).toEqual([
      ["from", ["categories"]],
      [
        "upsert",
        [
          [
            { club_id: "club-1", name: "U13", season_year: 2027 },
            { club_id: "club-1", name: "U15", season_year: 2027 },
          ],
          { onConflict: "club_id,name,season_year", ignoreDuplicates: true },
        ],
      ],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  test("sin categorías en el año anterior no escribe nada", async () => {
    mocks.listCategories.mockResolvedValue([]);
    await copyCategories("club-1", 2026, 2027);
    expect(mocks.calls).toEqual([]);
  });

  test("un error de la base se lanza (lo muestra error.tsx)", async () => {
    mocks.listCategories.mockResolvedValue([u13]);
    mocks.state.results = [{ error: { code: "42501" } }];
    await expect(copyCategories("club-1", 2026, 2027)).rejects.toEqual({
      code: "42501",
    });
  });
});

describe("assignPlayers (AC2, AC3)", () => {
  beforeEach(() => {
    mocks.listCategories.mockResolvedValue([u13, u15]);
  });

  test("un solo insert con los elegidos; 'No sigue' no crea nada; vuelve al club", async () => {
    await assignPlayers(
      "club-1",
      2027,
      {},
      form({
        joined_on: "2027-03-01",
        "player:p1": "cat-u15",
        "player:p2": "", // No sigue
        "player:p3": "cat-u13",
      }),
    );

    expect(mocks.listCategories).toHaveBeenCalledWith("club-1", 2027);
    expect(mocks.calls).toEqual([
      ["from", ["category_players"]],
      [
        "insert",
        [
          [
            {
              category_id: "cat-u15",
              player_id: "p1",
              joined_on: "2027-03-01",
            },
            {
              category_id: "cat-u13",
              player_id: "p3",
              joined_on: "2027-03-01",
            },
          ],
        ],
      ],
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/clubes/club-1?temporada=2027",
    );
  });

  test("fecha fuera de la temporada nueva: error sin tocar la base", async () => {
    const values = { joined_on: "2026-12-01", "player:p1": "cat-u15" };
    const state = await assignPlayers("club-1", 2027, {}, form(values));
    expect(state).toEqual({ error: expect.stringMatching(/2027/), values });
    expect(mocks.calls).toEqual([]);
  });

  test("una categoría que no es de este club y temporada se rechaza", async () => {
    const state = await assignPlayers(
      "club-1",
      2027,
      {},
      form({ joined_on: "2027-03-01", "player:p1": "cat-de-2026" }),
    );
    expect(state.error).toBe(assignErrorMessage(undefined));
    expect(mocks.calls).toEqual([]);
  });

  test("todos en 'No sigue': pide elegir al menos uno", async () => {
    const state = await assignPlayers(
      "club-1",
      2027,
      {},
      form({ joined_on: "2027-03-01", "player:p1": "" }),
    );
    expect(state.error).toMatch(/al menos un jugador/);
    expect(mocks.calls).toEqual([]);
  });

  test("traduce el error de la base y devuelve lo elegido", async () => {
    mocks.state.results = [{ error: { code: "23P01" } }];
    const values = { joined_on: "2027-03-01", "player:p1": "cat-u15" };
    const state = await assignPlayers("club-1", 2027, {}, form(values));
    expect(state).toEqual({ error: assignErrorMessage("23P01"), values });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
