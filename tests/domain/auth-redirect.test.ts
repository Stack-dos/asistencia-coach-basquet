import { describe, expect, test } from "vitest";
import { getAuthRedirect } from "@/domain/auth-redirect";

describe("getAuthRedirect", () => {
  test.each([
    // [pathname, isLoggedIn, esperado]
    // Landing: pública para todos.
    ["/", false, null],
    ["/", true, null],

    ["/login", false, null],
    ["/login", true, "/clubes"],
    ["/registro", false, null],
    ["/registro", true, "/clubes"],
    ["/recuperar", false, null],
    ["/recuperar", true, "/clubes"],

    ["/auth/confirm", false, null],
    ["/auth/confirm", true, null],

    ["/clubes", false, "/login"],
    ["/clubes", true, null],
    ["/nueva-contrasena", false, "/login"],
    ["/nueva-contrasena", true, null],
  ])("%s con sesión=%s → %s", (pathname, isLoggedIn, expected) => {
    expect(getAuthRedirect(pathname, isLoggedIn)).toBe(expected);
  });

  describe("casos borde: rutas que se parecen a las públicas son privadas", () => {
    test.each([
      "/loginx",
      "/login-falso",
      "/authentication",
      "/auth",
      "/LOGIN",
      "/clubes/123/categorias",
    ])("%s sin sesión → /login", (pathname) => {
      expect(getAuthRedirect(pathname, false)).toBe("/login");
    });
  });
});
