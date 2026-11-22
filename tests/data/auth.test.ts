import { beforeEach, describe, expect, test, vi } from "vitest";
import { signIn, signOut, signUp } from "@/data/auth";
import { authErrorMessage } from "@/domain/auth-errors";

// Reemplazamos Supabase y redirect por "dobles" controlados: estos tests no tocan la red.
const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
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
