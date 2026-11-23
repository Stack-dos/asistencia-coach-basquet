import { beforeEach, describe, expect, test, vi } from "vitest";
import { getClub, listClubs } from "@/data/clubs";
import { createClub, deleteClub, renameClub } from "@/data/clubs-actions";
import { clubErrorMessage } from "@/domain/club-errors";

// Doble de la consulta de supabase-js: cada método encadenable se registra y devuelve la
// misma consulta; al hacer await resuelve con `mocks.result`.
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

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.state.result = { data: null, error: null };
});

describe("listClubs", () => {
  test("devuelve los clubes ordenados por nombre", async () => {
    const clubs = [{ id: "1", name: "Atenas" }];
    mocks.state.result = { data: clubs, error: null };

    expect(await listClubs()).toEqual(clubs);
    expect(mocks.from).toHaveBeenCalledWith("clubs");
    expect(mocks.calls).toEqual([
      ["select", ["id, name"]],
      ["order", ["name"]],
    ]);
  });

  test("si falla, lanza el error", async () => {
    mocks.state.result = { data: null, error: { code: "XX000" } };

    await expect(listClubs()).rejects.toEqual({ code: "XX000" });
  });
});

describe("getClub", () => {
  test("devuelve el club pedido", async () => {
    const club = { id: "club-1", name: "Atenas" };
    mocks.state.result = { data: club, error: null };

    expect(await getClub("club-1")).toEqual(club);
    expect(mocks.calls).toEqual([
      ["select", ["id, name"]],
      ["eq", ["id", "club-1"]],
      ["maybeSingle", []],
    ]);
  });

  test("si no existe o es ajeno (0 filas) devuelve null", async () => {
    mocks.state.result = { data: null, error: null };

    expect(await getClub("club-1")).toBeNull();
  });

  test("si el id no es un uuid (22P02) devuelve null", async () => {
    mocks.state.result = { data: null, error: { code: "22P02" } };

    expect(await getClub("hola")).toBeNull();
  });

  test("con otro error, lo lanza", async () => {
    mocks.state.result = { data: null, error: { code: "XX000" } };

    await expect(getClub("club-1")).rejects.toEqual({ code: "XX000" });
  });
});

describe("createClub", () => {
  test("inserta el nombre normalizado y refresca /clubes", async () => {
    const state = await createClub({}, form({ name: "  Club   Atenas " }));

    expect(state).toEqual({});
    expect(mocks.calls).toEqual([["insert", [{ name: "Club Atenas" }]]]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
  });

  test("con nombre vacío devuelve el error y no llama a Supabase", async () => {
    const state = await createClub({}, form({ name: "   " }));

    expect(state.error).toMatch(/vacío/);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  test("si el campo falta lo trata como vacío y no llama a Supabase", async () => {
    const state = await createClub({}, form({}));

    expect(state.error).toMatch(/vacío/);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  test("con nombre repetido devuelve el mensaje de AC2 y no refresca", async () => {
    mocks.state.result = { data: null, error: { code: "23505" } };

    const state = await createClub({}, form({ name: "Atenas" }));

    expect(state).toEqual({ error: "Ya tenés un club con ese nombre." });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("renameClub", () => {
  test("actualiza el club indicado con el nombre normalizado", async () => {
    const state = await renameClub("club-1", {}, form({ name: " Nuevo " }));

    expect(state).toEqual({});
    expect(mocks.calls).toEqual([
      ["update", [{ name: "Nuevo" }]],
      ["eq", ["id", "club-1"]],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
  });

  test("con nombre repetido devuelve el mensaje de AC2", async () => {
    mocks.state.result = { data: null, error: { code: "23505" } };

    const state = await renameClub("club-1", {}, form({ name: "Atenas" }));

    expect(state).toEqual({ error: clubErrorMessage("23505") });
  });
});

describe("deleteClub", () => {
  test("borra el club indicado, refresca y vuelve a /clubes", async () => {
    await deleteClub("club-1");

    expect(mocks.calls).toEqual([
      ["delete", []],
      ["eq", ["id", "club-1"]],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith("/clubes");
  });

  test("si falla devuelve un error genérico y no refresca", async () => {
    mocks.state.result = { data: null, error: { code: "XX000" } };

    const state = await deleteClub("club-1");

    expect(state).toEqual({ error: clubErrorMessage("XX000") });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
