import { describe, expect, test } from "vitest";
import { clubErrorMessage } from "@/domain/club-errors";

describe("clubErrorMessage", () => {
  test("unique_violation (23505) avisa que el nombre está repetido", () => {
    expect(clubErrorMessage("23505")).toBe("Ya tenés un club con ese nombre.");
  });

  test("cualquier otro código da un mensaje genérico", () => {
    expect(clubErrorMessage("42501")).toMatch(/error inesperado/);
    expect(clubErrorMessage(undefined)).toMatch(/error inesperado/);
  });
});
