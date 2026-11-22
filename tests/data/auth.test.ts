import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from "@/data/auth";
import { authErrorMessage } from "@/domain/auth-errors";

// Reemplazamos Supabase y redirect por "dobles" controlados: estos tests no tocan la red.
const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
    },
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
}

const validForm = () =>
  form({ email: "coach@example.com", password: "12345678" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signIn", () => {
  test("con credenciales válidas redirige a /clubes", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });

    await signIn({}, validForm());

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "coach@example.com",
      password: "12345678",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/clubes");
  });

  test("con credenciales inválidas devuelve el error traducido y no redirige", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { code: "invalid_credentials" },
    });

    const state = await signIn({}, validForm());

    expect(state).toEqual({ error: authErrorMessage("invalid_credentials") });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  test("si falta un campo no llama a Supabase", async () => {
    const state = await signIn({}, form({ email: "coach@example.com" }));

    expect(state).toEqual({ error: authErrorMessage(undefined) });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("signUp", () => {
  test("si sale bien devuelve un mensaje de éxito y no redirige", async () => {
    mocks.signUp.mockResolvedValue({ error: null });

    const state = await signUp({}, validForm());

    expect(state.success).toMatch(/email/i);
    expect(state.error).toBeUndefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  test("con contraseña débil devuelve el error traducido", async () => {
    mocks.signUp.mockResolvedValue({ error: { code: "weak_password" } });

    const state = await signUp({}, validForm());

    expect(state).toEqual({ error: authErrorMessage("weak_password") });
  });

  test("si un campo viene como archivo no llama a Supabase", async () => {
    const data = form({ email: "coach@example.com" });
    data.append("password", new Blob(["x"]));

    const state = await signUp({}, data);

    expect(state).toEqual({ error: authErrorMessage(undefined) });
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
});

describe("signOut", () => {
  test("cierra la sesión y redirige a /login", async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(mocks.signOut).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});

describe("requestPasswordReset", () => {
  test("devuelve el mismo mensaje de éxito exista o no la cuenta", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });

    const state = await requestPasswordReset(
      {},
      form({ email: "coach@example.com" }),
    );

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "coach@example.com",
    );
    expect(state.success).toMatch(/si el email tiene una cuenta/i);
  });

  test("con demasiados pedidos devuelve el error traducido", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({
      error: { code: "over_email_send_rate_limit" },
    });

    const state = await requestPasswordReset(
      {},
      form({ email: "coach@example.com" }),
    );

    expect(state).toEqual({
      error: authErrorMessage("over_email_send_rate_limit"),
    });
  });

  test("sin email no llama a Supabase", async () => {
    const state = await requestPasswordReset({}, form({}));

    expect(state).toEqual({ error: authErrorMessage(undefined) });
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("updatePassword", () => {
  test("si sale bien cambia la contraseña y redirige a /clubes", async () => {
    mocks.updateUser.mockResolvedValue({ error: null });

    await updatePassword({}, form({ password: "nueva-clave" }));

    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "nueva-clave" });
    expect(mocks.redirect).toHaveBeenCalledWith("/clubes");
  });

  test("con la misma contraseña devuelve el error traducido y no redirige", async () => {
    mocks.updateUser.mockResolvedValue({ error: { code: "same_password" } });

    const state = await updatePassword({}, form({ password: "12345678" }));

    expect(state).toEqual({ error: authErrorMessage("same_password") });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
