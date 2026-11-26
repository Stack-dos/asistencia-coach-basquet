import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createSession,
  deleteSession,
  updateSessionDate,
} from "@/data/sessions-actions";
import { sessionErrorMessage } from "@/domain/club-errors";

// Mismo doble que players-actions.test.ts: getCategory se reemplaza y cada consulta de
// supabase-js resuelve con el siguiente resultado de `results` (o "sin error" si no quedan).
const mocks = vi.hoisted(() => {
  const calls: [string, unknown[]][] = [];
  const state = {
    results: [] as { data?: unknown; error: unknown }[],
  };
  const query: Record<string, unknown> = {
    then: (resolve: (value: unknown) => void) =>
      resolve(state.results.shift() ?? { data: null, error: null }),
  };
  for (const method of ["insert", "update", "delete", "eq", "select"]) {
    query[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return query;
    };
  }
  return {
    calls,
    state,
    from: vi.fn((...args: unknown[]) => {
      calls.push(["from", args]);
      return query;
    }),
    getCategory: vi.fn(),
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from }),
}));
vi.mock("@/data/categories", () => ({ getCategory: mocks.getCategory }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const category = {
  id: "cat-1",
  club_id: "club-1",
  name: "U13",
  season_year: 2026,
};

function form(heldOn: string): FormData {
  const formData = new FormData();
  formData.append("held_on", heldOn);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.state.results = [];
  mocks.getCategory.mockResolvedValue(category);
});

describe("createSession", () => {
  test("AC1: inserta la clase y lleva al mes de la fecha elegida", async () => {
    await createSession("cat-1", {}, form("2026-05-10"));

    expect(mocks.calls).toEqual([
      ["from", ["sessions"]],
      ["insert", [{ category_id: "cat-1", held_on: "2026-05-10" }]],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/clubes/club-1/categorias/cat-1/clases?mes=2026-05",
    );
  });

  test("AC2: una fecha repetida devuelve el mensaje y no redirige", async () => {
    mocks.state.results = [{ error: { code: "23505" } }];

    const state = await createSession("cat-1", {}, form("2026-05-10"));

    expect(state).toEqual({ error: "Ya hay una clase ese día." });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  test("con una categoría inexistente o ajena, error genérico sin tocar la base", async () => {
    mocks.getCategory.mockResolvedValue(null);

    const state = await createSession("cat-1", {}, form("2026-05-10"));

    expect(state).toEqual({ error: sessionErrorMessage(undefined) });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("updateSessionDate", () => {
  test("AC3: cambia la fecha de la clase de esa categoría y lleva a su mes", async () => {
    mocks.state.results = [{ data: [{ id: "s-1" }], error: null }];

    await updateSessionDate("cat-1", "s-1", {}, form("2026-06-02"));

    expect(mocks.calls).toEqual([
      ["from", ["sessions"]],
      ["update", [{ held_on: "2026-06-02" }]],
      ["eq", ["id", "s-1"]],
      ["eq", ["category_id", "cat-1"]],
      ["select", ["id"]],
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/clubes/club-1/categorias/cat-1/clases?mes=2026-06",
    );
  });

  test("AC5: fuera de temporada devuelve el mensaje", async () => {
    mocks.state.results = [{ data: null, error: { code: "23514" } }];

    const state = await updateSessionDate(
      "cat-1",
      "s-1",
      {},
      form("2027-01-01"),
    );

    expect(state).toEqual({ error: sessionErrorMessage("23514") });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  test("si no actualizó ninguna fila (ajena o de otra categoría), error genérico", async () => {
    mocks.state.results = [{ data: [], error: null }];

    const state = await updateSessionDate(
      "cat-1",
      "s-1",
      {},
      form("2026-06-02"),
    );

    expect(state).toEqual({ error: sessionErrorMessage(undefined) });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("deleteSession", () => {
  test("AC3: borra la clase de esa categoría y refresca", async () => {
    const state = await deleteSession("cat-1", "s-1");

    expect(state).toEqual({});
    expect(mocks.calls).toEqual([
      ["from", ["sessions"]],
      ["delete", []],
      ["eq", ["id", "s-1"]],
      ["eq", ["category_id", "cat-1"]],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
  });
});
