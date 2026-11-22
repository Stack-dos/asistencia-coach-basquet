"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authErrorMessage } from "@/domain/auth-errors";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string };

// URL a la que vuelven los links de los emails. Supabase sólo acepta las de su lista de
// "Redirect URLs", así que un Origin falsificado no sirve para redirigir a otro sitio.
async function confirmUrl(type?: "recovery"): Promise<string> {
  const origin = (await headers()).get("origin");
  return `${origin}/auth/confirm${type ? `?type=${type}` : ""}`;
}

type Credentials = { email: string; password: string };

// El FormData llega del navegador: puede faltar un campo o venir un archivo.
function readCredentials(formData: FormData): Credentials | null {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") return null;
  return { email, password };
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const credentials = readCredentials(formData);
  if (!credentials) return { error: authErrorMessage(undefined) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) return { error: authErrorMessage(error.code) };

  redirect("/clubes");
}

export async function signUp(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const credentials = readCredentials(formData);
  if (!credentials) return { error: authErrorMessage(undefined) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...credentials,
    options: { emailRedirectTo: await confirmUrl() },
  });
  if (error) return { error: authErrorMessage(error.code) };

  // Mismo mensaje si el email ya tenía cuenta: Supabase responde éxito falso y no revela nada.
  return {
    success:
      "Te enviamos un email para confirmar tu cuenta. Revisá tu bandeja de entrada (y la carpeta de spam).",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email");
  if (typeof email !== "string") return { error: authErrorMessage(undefined) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await confirmUrl("recovery"),
  });
  if (error) return { error: authErrorMessage(error.code) };

  // Mismo mensaje exista o no la cuenta: no se revela qué emails están registrados.
  return {
    success:
      "Si el email tiene una cuenta, te enviamos un enlace para cambiar la contraseña. Revisá tu bandeja de entrada (y la carpeta de spam).",
  };
}

// Requiere la sesión de recuperación que crea /auth/confirm al abrir el link del email.
export async function updatePassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = formData.get("password");
  if (typeof password !== "string")
    return { error: authErrorMessage(undefined) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorMessage(error.code) };

  redirect("/clubes");
}
