import { createClient } from "@/lib/supabase/server";

export type Club = { id: string; name: string };

// Lectura de datos: sin "use server" a propósito, para no exponerla como Server Action.
// RLS filtra por coach_id: sólo vuelven los clubes del usuario logueado.
export async function listClubs(): Promise<Club[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("id, name")
    .order("name");
  // Una lectura fallida no tiene mensaje que mostrar en un form: que la ataje error.tsx.
  if (error) throw error;
  return data;
}

// null si no existe, es de otro entrenador (RLS lo oculta) o el id no es un uuid válido.
export async function getClub(clubId: string): Promise<Club | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("id", clubId)
    .maybeSingle();
  // 22P02 (invalid_text_representation): el id de la URL no es un uuid, ej. /clubes/hola.
  if (error?.code === "22P02") return null;
  if (error) throw error;
  return data;
}
