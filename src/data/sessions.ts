import { monthRange } from "@/domain/months";
import { createClient } from "@/lib/supabase/server";

export type Session = { id: string; held_on: string };

// Lectura: sin "use server" a propósito. RLS (owns_category) oculta las clases ajenas.
export async function listSessions(
  categoryId: string,
  month: string,
): Promise<Session[]> {
  const { from, to } = monthRange(month);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, held_on")
    .eq("category_id", categoryId)
    .gte("held_on", from)
    .lt("held_on", to)
    .order("held_on");
  if (error) throw error;
  return data;
}
