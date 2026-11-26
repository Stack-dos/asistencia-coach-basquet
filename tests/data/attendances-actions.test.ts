import { beforeEach, describe, expect, test, vi } from "vitest";
import { saveSessionAttendance } from "@/data/attendances-actions";
import { attendanceErrorMessage } from "@/domain/club-errors";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: mocks.rpc }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

function form(presentIds: string[]): FormData {
  const formData = new FormData();
  for (const id of presentIds) formData.append("present", id);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: null, error: null });
});

describe("saveSessionAttendance", () => {
  test("AC2: manda los tildados a set_session_attendance y refresca", async () => {
    const state = await saveSessionAttendance("s-1", {}, form(["p-1", "p-2"]));

    expect(state).toEqual({ saved: true });
    expect(mocks.rpc).toHaveBeenCalledWith("set_session_attendance", {
      p_session_id: "s-1",
      p_player_ids: ["p-1", "p-2"],
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/clubes", "layout");
  });

  test("AC3: sin tildados, manda la lista vacía (todos ausentes)", async () => {
    await saveSessionAttendance("s-1", {}, form([]));

    expect(mocks.rpc).toHaveBeenCalledWith("set_session_attendance", {
      p_session_id: "s-1",
      p_player_ids: [],
    });
  });

  test("ignora valores que no son texto (archivos)", async () => {
    const formData = form(["p-1"]);
    formData.append("present", new Blob(["x"]));

    await saveSessionAttendance("s-1", {}, formData);

    expect(mocks.rpc).toHaveBeenCalledWith("set_session_attendance", {
      p_session_id: "s-1",
      p_player_ids: ["p-1"],
    });
  });

  test("si la base rechaza, traduce el error y no refresca", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23514" } });

    const state = await saveSessionAttendance("s-1", {}, form(["p-1"]));

    expect(state).toEqual({ error: attendanceErrorMessage("23514") });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
