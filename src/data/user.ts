import { createClient } from "@/lib/supabase/server";

// Lectura de datos: sin "use server" a propósito, para no exponerla como Server Action.
export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.email ?? null;
}
