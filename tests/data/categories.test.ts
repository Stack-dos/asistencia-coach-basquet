import { beforeEach, describe, expect, test, vi } from "vitest";
import { getCategory, listCategories } from "@/data/categories";
import {
  createCategory,
  deleteCategory,
  renameCategory,
} from "@/data/categories-actions";
import { categoryErrorMessage } from "@/domain/club-errors";

// Doble de la consulta de supabase-js (igual que en clubs.test.ts): cada método encadenable se
// registra y devuelve la misma consulta; al hacer await resuelve con `mocks.state.result`.
const mocks = vi.hoisted(() => {
  const calls: [string, unknown[]][] = [];
  const state = { result: { data: null as unknown, error: null as unknown } };
  const query: Record<string, unknown> = {
    then: (resolve: (value: unknown) => void) => resolve(state.result),
  };
  for (const method of [
    "select",
    "order",
    "insert",
    "update",
    "delete",
    "eq",
    "maybeSingle",
  ]) {
    query[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return query;
    };
  }
  return {
    calls,
    state,
    from: vi.fn(() => query),
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
}

const COLUMNS = "id, club_id, name, season_year";
const u13 = { id: "cat-1", club_id: "club-1", name: "U13", season_year: 2026 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.state.result = { data: null, error: null };
});

describe("listCategories", () => {
  test("filtra por club y temporada y ordena por nombre", async () => {
    mocks.state.result = { data: [u13], error: null };

    expect(await listCategories("club-1", 2026)).toEqual([u13]);
    expect(mocks.from).toHaveBeenCalledWith("categories");
    expect(mocks.calls).toEqual([
      ["select", [COLUMNS]],
      ["eq", ["club_id", "club-1"]],
      ["eq", ["season_year", 2026]],
      ["order", ["name"]],
    ]);
  });

  test("si falla, lanza el error", async () => {
    mocks.state.result = { data: null, error: { code: "XX000" } };

    await expect(listCategories("club-1", 2026)).rejects.toEqual({
      code: "XX000",
    });
  });
});

describe("getCategory", () => {
  test("devuelve la categoría pedida", async () => {
    mocks.state.result = { data: u13, error: null };

    expect(await getCategory("cat-1")).toEqual(u13);
    expect(mocks.calls).toEqual([
      ["select", [COLUMNS]],
      ["eq", ["id", "cat-1"]],
      ["maybeSingle", []],
    ]);
  });

  test("si no existe o es ajena (0 filas) devuelve null", async () => {
    expect(await getCategory("cat-1")).toBeNull();
  });

  test("si el id no es un uuid (22P02) devuelve null", async () => {
    mocks.state.result = { data: null, error: { code: "22P02" } };

    expect(await getCategory("hola")).toBeNull();
  });

  test("con otro error, lo lanza", async () => {
    mocks.state.result = { data: null, error: { code: "XX000" } };

    await expect(getCategory("cat-1")).rejects.toEqual({ code: "XX000" });
  });
});

describe("createCategory", () => {
  test("inserta en el club y la temporada indicados, con el nombre normalizado", async () => {
    const state = await createCategory(
      "club-1",
      2026,
      {},
      form({ name: "  U13   Femenino " }),
    );

    expect(state).toEqual({});
    expect(mocks.calls).toEqual([
      [
        "insert",
        [{ club_id: "club-1", name: "U13 Femenino", season_year: 2026 }],
      ],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
  });

  test("con nombre vacío devuelve el error y no llama a Supabase", async () => {
    const state = await createCategory("club-1", 2026, {}, form({ name: " " }));

    expect(state.error).toMatch(/vacío/);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  test("con nombre repetido en la temporada devuelve el mensaje de AC2 y no refresca", async () => {
    mocks.state.result = { data: null, error: { code: "23505" } };

    const state = await createCategory(
      "club-1",
      2026,
      {},
      form({ name: "U13" }),
    );

    expect(state).toEqual({ error: categoryErrorMessage("23505") });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("renameCategory", () => {
  test("actualiza la categoría indicada con el nombre normalizado", async () => {
    const state = await renameCategory("cat-1", {}, form({ name: " U15 " }));

    expect(state).toEqual({});
    expect(mocks.calls).toEqual([
      ["update", [{ name: "U15" }]],
      ["eq", ["id", "cat-1"]],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
  });

  test("con nombre repetido devuelve el mensaje de AC2", async () => {
    mocks.state.result = { data: null, error: { code: "23505" } };

    const state = await renameCategory("cat-1", {}, form({ name: "U13" }));

    expect(state).toEqual({ error: categoryErrorMessage("23505") });
  });
});

describe("deleteCategory", () => {
  test("borra y vuelve al club y la temporada de la categoría borrada", async () => {
    mocks.state.result = {
      data: { club_id: "club-1", season_year: 2025 },
      error: null,
    };

    await deleteCategory("cat-1");

    expect(mocks.calls).toEqual([
      ["delete", []],
      ["eq", ["id", "cat-1"]],
      ["select", ["club_id, season_year"]],
      ["maybeSingle", []],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/clubes/club-1?temporada=2025",
    );
  });

  test("si no borró nada (ajena o inexistente) vuelve a /clubes", async () => {
    await deleteCategory("cat-1");

    expect(mocks.redirect).toHaveBeenCalledWith("/clubes");
  });

  test("si falla devuelve el error y no redirige", async () => {
    mocks.state.result = { data: null, error: { code: "XX000" } };

    const state = await deleteCategory("cat-1");

    expect(state).toEqual({ error: categoryErrorMessage("XX000") });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
