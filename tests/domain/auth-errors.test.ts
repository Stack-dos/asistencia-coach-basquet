import { describe, test, expect } from "vitest";
import { authErrorMessage } from "@/domain/auth-errors";

const KNOWN_CODES = [
  "invalid_credentials",
  "email_not_confirmed",
  "weak_password",
  "same_password",
  "over_email_send_rate_limit",
];

describe("authErrorMessage", () => {
  const genericMessage = authErrorMessage("codigo_inventado");

  test.each(KNOWN_CODES)("el código %s tiene un mensaje propio", (code) => {
    expect(authErrorMessage(code)).not.toBe(genericMessage);
  });

  test("cada código conocido tiene un mensaje distinto", () => {
    const messages = KNOWN_CODES.map(authErrorMessage);
    expect(new Set(messages).size).toBe(KNOWN_CODES.length);
  });

  test("un código desconocido devuelve el mensaje genérico", () => {
    expect(authErrorMessage("otro_codigo")).toBe(genericMessage);
  });

  test("un error sin código devuelve el mensaje genérico", () => {
    expect(authErrorMessage(undefined)).toBe(genericMessage);
  });

  test("invalid_credentials no revela si el email existe", () => {
    expect(authErrorMessage("invalid_credentials")).not.toMatch(
      /no existe|no está registrad|no encontrad/i,
    );
  });
});
