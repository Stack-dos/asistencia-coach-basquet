import { monthRange } from "@/domain/months";
import { createClient } from "@/lib/supabase/server";

export type Session = { id: string; category_id: string; held_on: string };

const COLUMNS = "id, category_id, held_on";

// Lecturas: sin "use server" a propósito. RLS (owns_category) oculta las clases ajenas.
export async function listSessions(
  categoryId: string,
  month: string,
): Promise<Session[]> {
  const { from, to } = monthRange(month);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(COLUMNS)
    .eq("category_id", categoryId)
    .gte("held_on", from)
    .lt("held_on", to)
    .order("held_on");
  if (error) throw error;
  return data;
}

// null si no existe, es ajena (RLS la oculta) o el id no es un uuid válido.
export async function getSession(sessionId: string): Promise<Session | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(COLUMNS)
    .eq("id", sessionId)
    .maybeSingle();
  // 22P02 (invalid_text_representation): el id de la URL no es un uuid.
  if (error?.code === "22P02") return null;
  if (error) throw error;
  return data;
}
