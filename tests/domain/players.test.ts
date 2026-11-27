import { describe, expect, test } from "vitest";
import {
  addDays,
  formatDate,
  isActiveOn,
  isSameName,
  parseGuardianPhone,
  phoneHref,
  isValidIsoDate,
  joinedOnError,
  leftOnError,
  parsePlayerInput,
  rejoinDateError,
  type PlayerFields,
} from "@/domain/players";

describe("addDays", () => {
  test("suma días cruzando fin de mes y de año", () => {
    expect(addDays("2026-05-15", 1)).toBe("2026-05-16");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("leftOnError (US-204)", () => {
  test("una baja dentro de la temporada y desde el alta es válida", () => {
    expect(leftOnError("2026-05-15", "2026-03-02", 2026)).toBeNull();
    expect(leftOnError("2026-03-02", "2026-03-02", 2026)).toBeNull(); // el mismo día
  });

  test("AC1: una baja anterior al alta se rechaza", () => {
    expect(leftOnError("2026-03-01", "2026-03-02", 2026)).toMatch(
      /anterior al alta \(02\/03\/2026\)/,
    );
  });

  test("una baja fuera de la temporada o inexistente se rechaza", () => {
    expect(leftOnError("2027-01-10", "2026-03-02", 2026)).toMatch(/temporada/);
    expect(leftOnError("2026-02-30", "2026-01-02", 2026)).toMatch(
      /no es válida/,
    );
  });
});

describe("rejoinDateError (US-204)", () => {
  test("AC3: una vuelta posterior a la baja es válida", () => {
    expect(rejoinDateError("2026-09-07", "2026-05-15", 2026)).toBeNull();
    expect(rejoinDateError("2026-05-16", "2026-05-15", 2026)).toBeNull();
  });

  test("el mismo día de la baja o antes se superpone y se rechaza", () => {
    expect(rejoinDateError("2026-05-15", "2026-05-15", 2026)).toMatch(
      /posterior a la baja \(15\/05\/2026\)/,
    );
    expect(rejoinDateError("2026-04-01", "2026-05-15", 2026)).toMatch(
      /posterior a la baja/,
    );
  });

  test("fuera de la temporada se rechaza", () => {
    expect(rejoinDateError("2027-02-01", "2026-05-15", 2026)).toMatch(
      /temporada 2026/,
    );
  });
});

const valid: PlayerFields = {
  firstName: "Juan",
  lastName: "Pérez",
  birthYear: "2013",
  joinedOn: "2026-03-02",
  guardianName: "",
  guardianPhone: "",
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
        guardianName: null,
        guardianPhone: null,
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

describe("isActiveOn (US-302 AC1)", () => {
  const membership = { joined_on: "2026-03-01", left_on: "2026-05-15" };

  test.each([
    ["el día del alta", "2026-03-01", true],
    ["en el medio", "2026-04-10", true],
    ["el día de la baja", "2026-05-15", true],
    ["antes del alta", "2026-02-28", false],
    ["después de la baja", "2026-05-16", false],
  ])("%s → %s", (_, date, expected) => {
    expect(isActiveOn(membership, date)).toBe(expected);
  });

  test("sin baja, sigue activo", () => {
    expect(isActiveOn({ ...membership, left_on: null }, "2026-12-31")).toBe(
      true,
    );
  });
});

describe("contacto del tutor (US-207)", () => {
  test("AC1: el contacto es opcional (vacío → null)", () => {
    const result = parsePlayerInput(
      { ...valid, guardianName: "  ", guardianPhone: " " },
      2026,
      2026,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { guardianName: null, guardianPhone: null },
    });
  });

  test("guarda el contacto sin espacios de más", () => {
    const result = parsePlayerInput(
      {
        ...valid,
        guardianName: "  Mamá   – Laura ",
        guardianPhone: " +54 9 11 5555-1234 ",
      },
      2026,
      2026,
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        guardianName: "Mamá – Laura",
        guardianPhone: "+54 9 11 5555-1234",
      },
    });
  });

  test("un contacto de más de 80 caracteres se rechaza", () => {
    const result = parsePlayerInput(
      { ...valid, guardianName: "x".repeat(81) },
      2026,
      2026,
    );
    expect(result).toMatchObject({ ok: false, error: /80 caracteres/ });
  });

  test.each(["+54 9 11 5555-1234", "(011) 4555-1234", "155551234", "123456"])(
    "%s es un teléfono válido",
    (phone) => {
      expect(parseGuardianPhone(phone)).toEqual({ ok: true, phone });
    },
  );

  test.each([
    ["con letras", "11 5555 abcd"],
    ["menos de 6 dígitos", "12345"],
    ["sólo símbolos", "+() --"],
    ["más de 30 caracteres", "1".repeat(31)],
  ])("AC2: %s se rechaza", (_, phone) => {
    expect(parseGuardianPhone(phone)).toMatchObject({
      ok: false,
      error: /al menos 6 dígitos/,
    });
  });

  test("AC3: el link para llamar no tiene espacios ni símbolos (salvo +)", () => {
    expect(phoneHref("+54 (11) 5555-1234")).toBe("tel:+541155551234");
  });
});
