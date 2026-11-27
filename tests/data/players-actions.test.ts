import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  addExistingPlayer,
  createPlayer,
  deletePlayer,
  markLeft,
  rejoinPlayer,
  updatePlayer,
} from "@/data/players-actions";
import { leaveErrorMessage, playerErrorMessage } from "@/domain/club-errors";

// Las lecturas (getCategory, getMembership, listClubPlayers) se reemplazan por dobles: acá se
// prueba la lógica de las acciones, no las consultas (esas tienen sus propios tests).
// Las escrituras usan un doble de supabase-js: cada consulta resuelve con el siguiente resultado
// de `results` (o "sin error" si no quedan).
const mocks = vi.hoisted(() => {
  const calls: [string, unknown[]][] = [];
  const state = {
    results: [] as { data?: unknown; error: unknown }[],
  };
  const query: Record<string, unknown> = {
    then: (resolve: (value: unknown) => void) =>
      resolve(state.results.shift() ?? { data: null, error: null }),
  };
  for (const method of ["insert", "update", "eq"]) {
    query[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return query;
    };
  }
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, args]);
      return query;
    };
  return {
    calls,
    state,
    from: vi.fn(record("from")),
    rpc: vi.fn(record("rpc")),
    getCategory: vi.fn(),
    getMembership: vi.fn(),
    listClubPlayers: vi.fn(),
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("@/data/categories", () => ({ getCategory: mocks.getCategory }));
vi.mock("@/data/players", () => ({
  getMembership: mocks.getMembership,
  listClubPlayers: mocks.listClubPlayers,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const category = {
  id: "cat-1",
  club_id: "club-1",
  name: "U13",
  season_year: 2026,
};
const juan = {
  id: "player-1",
  first_name: "Juan",
  last_name: "Pérez",
  birth_year: 2013,
};
const fields = {
  first_name: "Juan",
  last_name: "Perez",
  birth_year: "2013",
  joined_on: "2026-03-02",
  guardian_name: "Mamá – Laura",
  guardian_phone: "11 5555-1234",
};
const values = {
  firstName: "Juan",
  lastName: "Perez",
  birthYear: "2013",
  joinedOn: "2026-03-02",
  guardianName: "Mamá – Laura",
  guardianPhone: "11 5555-1234",
};

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(data))
    formData.append(name, value);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.state.results = [];
  mocks.getCategory.mockResolvedValue(category);
  mocks.listClubPlayers.mockResolvedValue([]);
});

describe("createPlayer", () => {
  test("AC1: crea persona + pertenencia con create_player y refresca", async () => {
    const state = await createPlayer("cat-1", {}, form(fields));

    expect(state).toEqual({});
    expect(mocks.getCategory).toHaveBeenCalledWith("cat-1");
    expect(mocks.listClubPlayers).toHaveBeenCalledWith("club-1");
    expect(mocks.calls).toEqual([
      [
        "rpc",
        [
          "create_player",
          {
            p_category_id: "cat-1",
            p_first_name: "Juan",
            p_last_name: "Perez",
            p_birth_year: 2013,
            p_joined_on: "2026-03-02",
            p_guardian_name: "Mamá – Laura",
            p_guardian_phone: "11 5555-1234",
          },
        ],
      ],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
  });

  test("si la validación falla, devuelve el error y lo escrito, sin tocar la base", async () => {
    const state = await createPlayer(
      "cat-1",
      {},
      form({ ...fields, joined_on: "2025-03-02" }),
    );

    expect(state.error).toMatch(/temporada 2026/);
    expect(state.values).toEqual({ ...values, joinedOn: "2025-03-02" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  test("AC6: con alguien del mismo nombre en el club, no crea y devuelve las coincidencias", async () => {
    mocks.listClubPlayers.mockResolvedValue([
      juan,
      { ...juan, id: "player-2", first_name: "Ana" },
    ]);

    const state = await createPlayer("cat-1", {}, form(fields));

    expect(state).toEqual({ matches: [juan], values });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  test("AC6: con force=1 (es otra persona) crea igual", async () => {
    mocks.listClubPlayers.mockResolvedValue([juan]);

    const state = await createPlayer(
      "cat-1",
      {},
      form({ ...fields, force: "1" }),
    );

    expect(state).toEqual({});
    expect(mocks.listClubPlayers).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("create_player", expect.anything());
  });

  test("AC6: con existing_player_id (es esa persona) agrega una pertenencia", async () => {
    const state = await createPlayer(
      "cat-1",
      {},
      form({ ...fields, existing_player_id: "player-1" }),
    );

    expect(state).toEqual({});
    expect(mocks.calls).toEqual([
      ["from", ["category_players"]],
      [
        "insert",
        [
          {
            category_id: "cat-1",
            player_id: "player-1",
            joined_on: "2026-03-02",
          },
        ],
      ],
    ]);
  });

  test("si la base rechaza, traduce el error y conserva lo escrito", async () => {
    mocks.state.results = [{ error: { code: "23514" } }];

    const state = await createPlayer("cat-1", {}, form(fields));

    expect(state).toEqual({ error: playerErrorMessage("23514"), values });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("con una categoría inexistente o ajena, error genérico", async () => {
    mocks.getCategory.mockResolvedValue(null);

    const state = await createPlayer("cat-1", {}, form(fields));

    expect(state.error).toBe(playerErrorMessage(undefined));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe("addExistingPlayer", () => {
  test("AC5: rechaza una fecha fuera de la temporada sin tocar la base", async () => {
    const state = await addExistingPlayer("cat-1", "player-1", "2025-03-02");

    expect(state.error).toMatch(/temporada 2026/);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  test("si ya está en la categoría en esas fechas (23P01), lo avisa", async () => {
    mocks.state.results = [{ error: { code: "23P01" } }];

    const state = await addExistingPlayer("cat-1", "player-1", "2026-03-02");

    expect(state).toEqual({ error: playerErrorMessage("23P01") });
  });
});

describe("updatePlayer", () => {
  const membership = {
    id: "m-1",
    category_id: "cat-1",
    joined_on: "2026-03-02",
    left_on: null,
    player: juan,
  };

  test("AC2: actualiza la fecha de la pertenencia y después a la persona", async () => {
    mocks.getMembership.mockResolvedValue(membership);

    await updatePlayer(
      "m-1",
      {},
      form({ ...fields, first_name: "Juan Martín", joined_on: "2026-04-01" }),
    );

    expect(mocks.calls).toEqual([
      ["from", ["category_players"]],
      ["update", [{ joined_on: "2026-04-01" }]],
      ["eq", ["id", "m-1"]],
      ["from", ["players"]],
      [
        "update",
        [
          {
            first_name: "Juan Martín",
            last_name: "Perez",
            birth_year: 2013,
            guardian_name: "Mamá – Laura",
            guardian_phone: "11 5555-1234",
          },
        ],
      ],
      ["eq", ["id", "player-1"]],
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/clubes/club-1/categorias/cat-1/jugadores",
    );
  });

  test("si la fecha falla en la base, no cambia el nombre", async () => {
    mocks.getMembership.mockResolvedValue(membership);
    mocks.state.results = [{ error: { code: "23514" } }];

    const state = await updatePlayer("m-1", {}, form(fields));

    expect(state.error).toBe(playerErrorMessage("23514"));
    expect(mocks.calls).not.toContainEqual(["from", ["players"]]);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  test("con una pertenencia inexistente o ajena, error genérico", async () => {
    mocks.getMembership.mockResolvedValue(null);

    const state = await updatePlayer("m-1", {}, form(fields));

    expect(state.error).toBe(playerErrorMessage(undefined));
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("deletePlayer", () => {
  test("AC4: llama a delete_category_player y vuelve al plantel de la base", async () => {
    mocks.state.results = [
      { data: { club_id: "club-1", category_id: "cat-1" }, error: null },
    ];

    await deletePlayer("m-1");

    expect(mocks.calls).toEqual([
      ["rpc", ["delete_category_player", { p_category_player_id: "m-1" }]],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/clubes/club-1/categorias/cat-1/jugadores",
    );
  });

  test("si no había nada que borrar, vuelve a /clubes", async () => {
    await deletePlayer("m-1");

    expect(mocks.redirect).toHaveBeenCalledWith("/clubes");
  });

  test("si falla, devuelve el error y no redirige", async () => {
    mocks.state.results = [{ error: { code: "XX000" } }];

    const state = await deletePlayer("m-1");

    expect(state).toEqual({ error: playerErrorMessage("XX000") });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("markLeft (US-204)", () => {
  const active = {
    id: "m-1",
    category_id: "cat-1",
    joined_on: "2026-03-02",
    left_on: null,
    player: juan,
  };

  test("cierra la pertenencia con la fecha y vuelve al plantel", async () => {
    mocks.getMembership.mockResolvedValue(active);

    await markLeft("m-1", {}, form({ left_on: "2026-05-15" }));

    expect(mocks.calls).toEqual([
      ["from", ["category_players"]],
      ["update", [{ left_on: "2026-05-15" }]],
      ["eq", ["id", "m-1"]],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/clubes/club-1/categorias/cat-1/jugadores",
    );
  });

  test("AC1: una baja anterior al alta se rechaza sin tocar la base", async () => {
    mocks.getMembership.mockResolvedValue(active);

    const state = await markLeft("m-1", {}, form({ left_on: "2026-03-01" }));

    expect(state.error).toMatch(/anterior al alta/);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  test("si la base rechaza (23514), traduce el error", async () => {
    mocks.getMembership.mockResolvedValue(active);
    mocks.state.results = [{ error: { code: "23514" } }];

    const state = await markLeft("m-1", {}, form({ left_on: "2026-05-15" }));

    expect(state).toEqual({ error: leaveErrorMessage("23514") });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  test("con una pertenencia inexistente o ajena, error genérico", async () => {
    mocks.getMembership.mockResolvedValue(null);

    const state = await markLeft("m-1", {}, form({ left_on: "2026-05-15" }));

    expect(state.error).toBe(leaveErrorMessage(undefined));
  });
});

describe("rejoinPlayer (US-204)", () => {
  const left = {
    id: "m-1",
    category_id: "cat-1",
    joined_on: "2026-03-02",
    left_on: "2026-05-15",
    player: juan,
  };

  test("AC3: crea una pertenencia NUEVA desde la fecha de vuelta", async () => {
    mocks.getMembership.mockResolvedValue(left);

    await rejoinPlayer("m-1", {}, form({ joined_on: "2026-09-07" }));

    expect(mocks.calls).toEqual([
      ["from", ["category_players"]],
      [
        "insert",
        [
          {
            category_id: "cat-1",
            player_id: "player-1",
            joined_on: "2026-09-07",
          },
        ],
      ],
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/clubes/club-1/categorias/cat-1/jugadores",
    );
  });

  test("una vuelta no posterior a la baja se rechaza sin tocar la base", async () => {
    mocks.getMembership.mockResolvedValue(left);

    const state = await rejoinPlayer(
      "m-1",
      {},
      form({ joined_on: "2026-05-15" }),
    );

    expect(state.error).toMatch(/posterior a la baja/);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  test("si la base detecta superposición (23P01), lo avisa", async () => {
    mocks.getMembership.mockResolvedValue(left);
    mocks.state.results = [{ error: { code: "23P01" } }];

    const state = await rejoinPlayer(
      "m-1",
      {},
      form({ joined_on: "2026-09-07" }),
    );

    expect(state).toEqual({ error: playerErrorMessage("23P01") });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  test("sobre una pertenencia que sigue activa, error genérico", async () => {
    mocks.getMembership.mockResolvedValue({ ...left, left_on: null });

    const state = await rejoinPlayer(
      "m-1",
      {},
      form({ joined_on: "2026-09-07" }),
    );

    expect(state.error).toBe(playerErrorMessage(undefined));
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
