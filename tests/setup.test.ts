import { describe, test, expect } from "vitest";

// "describe" es una funcion que recibe el nombre del GRUPO de test y una funcion flecha/lambda hacia test
// "test" es una funcion individual de test, tambien recibe un nombre y una funcion flecha
describe("Configuración de Vitest", () => {
  test("ejecuta tests de la carpeta tests/", () => {
    expect(10).toBe(10);
  });
});

test("evalúa expresiones de TypeScript dentro de expect", () => {
  expect(20).toBe(10 * 2);
});
