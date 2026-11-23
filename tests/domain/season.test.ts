import { describe, expect, test } from "vitest";
import {
  currentSeasonYear,
  defaultDateInSeason,
  parseSeasonYear,
  todayInArgentina,
} from "@/domain/season";

describe("todayInArgentina", () => {
  test("devuelve AAAA-MM-DD en hora de Argentina", () => {
    // 2/3/2026 02:00 UTC = 1/3/2026 23:00 en Argentina.
    expect(todayInArgentina(new Date("2026-03-02T02:00:00Z"))).toBe(
      "2026-03-01",
    );
  });
});

describe("defaultDateInSeason", () => {
  test("hoy, si cae en la temporada", () => {
    expect(defaultDateInSeason(2026, "2026-11-23")).toBe("2026-11-23");
  });

  test("temporada pasada: su último día", () => {
    expect(defaultDateInSeason(2025, "2026-11-23")).toBe("2025-12-31");
  });

  test("temporada futura: su primer día", () => {
    expect(defaultDateInSeason(2027, "2026-11-23")).toBe("2027-01-01");
  });
});

describe("currentSeasonYear", () => {
  test("usa la hora de Argentina, no la de UTC", () => {
    // 1/1/2027 01:00 UTC = 31/12/2026 22:00 en Argentina (UTC-3).
    expect(currentSeasonYear(new Date("2027-01-01T01:00:00Z"))).toBe(2026);
    expect(currentSeasonYear(new Date("2027-01-01T03:00:00Z"))).toBe(2027);
  });
});

describe("parseSeasonYear", () => {
  test("un año válido se usa tal cual", () => {
    expect(parseSeasonYear("2025", 2026)).toBe(2025);
    expect(parseSeasonYear("2000", 2026)).toBe(2000);
    expect(parseSeasonYear("2100", 2026)).toBe(2100);
  });

  test("sin parámetro, el año actual", () => {
    expect(parseSeasonYear(undefined, 2026)).toBe(2026);
  });

  test("con el parámetro repetido (?temporada=a&temporada=b), el año actual", () => {
    expect(parseSeasonYear(["2025", "2024"], 2026)).toBe(2026);
  });

  test.each(["hola", "", "2026abc", "20.26", " 2026", "-2026", "1e3"])(
    "%j no es un año: el año actual",
    (raw) => {
      expect(parseSeasonYear(raw, 2026)).toBe(2026);
    },
  );

  test("fuera del rango de la base, el año actual", () => {
    expect(parseSeasonYear("1999", 2026)).toBe(2026);
    expect(parseSeasonYear("2101", 2026)).toBe(2026);
  });
});
