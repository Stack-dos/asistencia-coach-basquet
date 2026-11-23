import { describe, expect, test } from "vitest";
import {
  formatDate,
  isSameName,
  isValidIsoDate,
  joinedOnError,
  parsePlayerInput,
  type PlayerFields,
} from "@/domain/players";

const valid: PlayerFields = {
  firstName: "Juan",
  lastName: "Pérez",
  birthYear: "2013",
  joinedOn: "2026-03-02",
};

describe("isValidIsoDate", () => {
  test.each(["2026-03-02", "2024-02-29", "2026-12-31"])("%s es válida", (d) => {
    expect(isValidIsoDate(d)).toBe(true);
  });

  test.each([
    "2026-02-30", // no existe
    "2026-02-29", // 2026 no es bisiesto
    "2026-13-01",
    "2026-3-2", // sin ceros
    "02/03/2026",
    "",
    "2026-03-02T00:00",
  ])("%j no es válida", (d) => {
    expect(isValidIsoDate(d)).toBe(false);
  });
});

describe("joinedOnError", () => {
  test("una fecha de la temporada no tiene error", () => {
    expect(joinedOnError("2026-01-01", 2026)).toBeNull();
    expect(joinedOnError("2026-12-31", 2026)).toBeNull();
  });

  test("AC5: una fecha de otra temporada se rechaza", () => {
    expect(joinedOnError("2025-12-31", 2026)).toMatch(/temporada 2026/);
    expect(joinedOnError("2027-01-01", 2026)).toMatch(/temporada 2026/);
  });

  test("una fecha inexistente se rechaza", () => {
    expect(joinedOnError("2026-02-30", 2026)).toMatch(/no es válida/);
  });
});

describe("parsePlayerInput", () => {
  test("AC1: normaliza nombres y convierte el año a número", () => {
    const result = parsePlayerInput(
      { ...valid, firstName: "  Juan  Martín ", lastName: " Pérez " },
      2026,
      2026,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        firstName: "Juan Martín",
        lastName: "Pérez",
        birthYear: 2013,
        joinedOn: "2026-03-02",
      },
    });
  });

  test("el año de nacimiento es opcional (D-25)", () => {
    const result = parsePlayerInput({ ...valid, birthYear: "  " }, 2026, 2026);
    expect(result).toMatchObject({ ok: true, value: { birthYear: null } });
  });

  test("nombre o apellido vacío: el mensaje dice cuál", () => {
    expect(parsePlayerInput({ ...valid, firstName: " " }, 2026, 2026)).toEqual({
      ok: false,
      error: "El nombre no puede estar vacío.",
    });
    expect(parsePlayerInput({ ...valid, lastName: "" }, 2026, 2026)).toEqual({
      ok: false,
      error: "El apellido no puede estar vacío.",
    });
  });

  test.each(["13", "20x3", "1899", "2027", "2013.0"])(
    "año de nacimiento %j se rechaza",
    (birthYear) => {
      const result = parsePlayerInput({ ...valid, birthYear }, 2026, 2026);
      expect(result).toEqual({
        ok: false,
        error: "El año de nacimiento tiene que estar entre 1900 y 2026.",
      });
    },
  );

  test("AC5: fecha de alta fuera de la temporada", () => {
    const result = parsePlayerInput(
      { ...valid, joinedOn: "2025-03-02" },
      2026,
      2026,
    );
    expect(result).toMatchObject({ ok: false });
  });
});

describe("isSameName", () => {
  test("AC6: ignora mayúsculas y acentos", () => {
    expect(
      isSameName(
        { firstName: "juan", lastName: "perez" },
        { firstName: "Juan", lastName: "Pérez" },
      ),
    ).toBe(true);
  });

  test("con otro nombre o apellido no es el mismo", () => {
    const juan = { firstName: "Juan", lastName: "Pérez" };
    expect(isSameName(juan, { firstName: "Juana", lastName: "Pérez" })).toBe(
      false,
    );
    expect(isSameName(juan, { firstName: "Juan", lastName: "Peres" })).toBe(
      false,
    );
  });
});

describe("formatDate", () => {
  test("AAAA-MM-DD → DD/MM/AAAA", () => {
    expect(formatDate("2026-03-02")).toBe("02/03/2026");
  });
});
