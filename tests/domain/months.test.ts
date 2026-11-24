import { describe, expect, test } from "vitest";
import {
  monthRange,
  nextMonth,
  parseMonth,
  previousMonth,
} from "@/domain/months";

describe("monthRange", () => {
  test("mes común: del 1° al 1° del siguiente", () => {
    expect(monthRange("2026-03")).toEqual({
      from: "2026-03-01",
      to: "2026-04-01",
    });
  });

  test("febrero bisiesto: el 29 queda dentro sin calcularlo", () => {
    expect(monthRange("2024-02")).toEqual({
      from: "2024-02-01",
      to: "2024-03-01",
    });
  });

  test("diciembre termina el 1° de enero del año siguiente", () => {
    expect(monthRange("2026-12")).toEqual({
      from: "2026-12-01",
      to: "2027-01-01",
    });
  });
});

describe("nextMonth / previousMonth", () => {
  test.each([
    ["2026-03", "2026-04"],
    ["2026-09", "2026-10"],
    ["2026-12", "2027-01"],
  ])("nextMonth(%s) = %s", (month, expected) => {
    expect(nextMonth(month)).toBe(expected);
  });

  test.each([
    ["2026-04", "2026-03"],
    ["2026-10", "2026-09"],
    ["2026-01", "2025-12"],
  ])("previousMonth(%s) = %s", (month, expected) => {
    expect(previousMonth(month)).toBe(expected);
  });
});

describe("parseMonth", () => {
  const today = "2026-11-23";

  test("un mes válido de la temporada se usa tal cual", () => {
    expect(parseMonth("2026-05", 2026, today)).toBe("2026-05");
  });

  test.each([
    ["falta", undefined],
    ["otra temporada", "2025-05"],
    ["mes 13", "2026-13"],
    ["mes 00", "2026-00"],
    ["sin cero a la izquierda", "2026-5"],
    ["basura", "hola"],
    ["repetido en la URL", ["2026-05", "2026-06"]],
  ])("%s → mes actual", (_, raw) => {
    expect(parseMonth(raw, 2026, today)).toBe("2026-11");
  });

  test("temporada pasada sin ?mes= → diciembre", () => {
    expect(parseMonth(undefined, 2025, today)).toBe("2025-12");
  });

  test("temporada futura sin ?mes= → enero", () => {
    expect(parseMonth(undefined, 2027, today)).toBe("2027-01");
  });
});
