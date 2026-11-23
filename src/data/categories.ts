import { createClient } from "@/lib/supabase/server";

export type Category = {
  id: string;
  club_id: string;
  name: string;
  season_year: number;
};

const COLUMNS = "id, club_id, name, season_year";

// Lecturas: sin "use server" a propósito. RLS (owns_club) filtra las categorías de clubes ajenos.
export async function listCategories(
  clubId: string,
  seasonYear: number,
): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(COLUMNS)
    .eq("club_id", clubId)
    .eq("season_year", seasonYear)
    .order("name");
  if (error) throw error;
  return data;
}

// null si no existe, es de un club ajeno (RLS la oculta) o el id no es un uuid válido.
export async function getCategory(
  categoryId: string,
): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(COLUMNS)
    .eq("id", categoryId)
    .maybeSingle();
  // 22P02 (invalid_text_representation): el id de la URL no es un uuid.
  if (error?.code === "22P02") return null;
  if (error) throw error;
  return data;
}
