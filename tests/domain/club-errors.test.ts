import { describe, expect, test } from "vitest";
import {
  assignErrorMessage,
  categoryErrorMessage,
  clubErrorMessage,
  leaveErrorMessage,
  playerErrorMessage,
} from "@/domain/club-errors";

describe("assignErrorMessage", () => {
  test("23P01: alguno ya estaba; 23514: fecha inválida; otro: genérico", () => {
    expect(assignErrorMessage("23P01")).toMatch(/ya está en esa categoría/);
    expect(assignErrorMessage("23514")).toMatch(/fecha de alta/);
    expect(assignErrorMessage(undefined)).toMatch(/error inesperado/);
  });
});

describe("leaveErrorMessage", () => {
  test("check_violation (23514): fecha de baja inválida", () => {
    expect(leaveErrorMessage("23514")).toMatch(/fecha de baja/);
  });

  test("cualquier otro código da un mensaje genérico", () => {
    expect(leaveErrorMessage(undefined)).toMatch(/error inesperado/);
  });
});

describe("playerErrorMessage", () => {
  test("exclusion_violation (23P01): ya está en la categoría en esas fechas", () => {
    expect(playerErrorMessage("23P01")).toMatch(/ya está en esta categoría/);
  });

  test("check_violation (23514): fecha inválida para la categoría", () => {
    expect(playerErrorMessage("23514")).toMatch(/fecha de alta/);
  });

  test("cualquier otro código da un mensaje genérico", () => {
    expect(playerErrorMessage("XX000")).toMatch(/error inesperado/);
  });
});

describe("clubErrorMessage", () => {
  test("unique_violation (23505) avisa que el nombre está repetido", () => {
    expect(clubErrorMessage("23505")).toBe("Ya tenés un club con ese nombre.");
  });

  test("cualquier otro código da un mensaje genérico", () => {
    expect(clubErrorMessage("42501")).toMatch(/error inesperado/);
    expect(clubErrorMessage(undefined)).toMatch(/error inesperado/);
  });
});

describe("categoryErrorMessage", () => {
  test("unique_violation (23505) avisa que el nombre está repetido en la temporada", () => {
    expect(categoryErrorMessage("23505")).toBe(
      "Ya tenés una categoría con ese nombre en esta temporada.",
    );
  });

  test("cualquier otro código da un mensaje genérico", () => {
    expect(categoryErrorMessage("23514")).toMatch(/error inesperado/);
    expect(categoryErrorMessage(undefined)).toMatch(/error inesperado/);
  });
});
