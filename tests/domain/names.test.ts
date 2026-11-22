import { describe, expect, test } from "vitest";
import { normalizeName } from "@/domain/names";

describe("normalizeName", () => {
  test.each([
    // [entrada, nombre esperado]
    ["Unión", "Unión"],
    ["  Unión  ", "Unión"],
    ["Club   Atlético  Unión", "Club Atlético Unión"],
    ["Club\tAtlético", "Club Atlético"],
    ["Club\nAtlético", "Club Atlético"],
    ["x".repeat(80), "x".repeat(80)],
    [`  ${"x".repeat(80)}  `, "x".repeat(80)], // el largo se mide después de recortar
    ["🏀".repeat(80), "🏀".repeat(80)], // 80 caracteres para Postgres (char_length)
  ])("acepta %j → %j", (input, expected) => {
    expect(normalizeName(input)).toEqual({ ok: true, name: expected });
  });

  test.each([
    ["", "vacío"],
    ["    ", "sólo espacios"],
    ["\t\n", "sólo tabs y saltos de línea"],
    ["x".repeat(81), "81 caracteres"],
    ["🏀".repeat(81), "81 emojis"],
  ])("rechaza %j (%s)", (input) => {
    const result = normalizeName(input);
    expect(result.ok).toBe(false);
    // El texto del mensaje es de la UI: sólo verificamos que exista.
    expect(result).toHaveProperty("error", expect.any(String));
  });
});
