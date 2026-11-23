import type { SeasonMembership } from "@/domain/seasons";
import { createClient } from "@/lib/supabase/server";
import type { Player } from "./players";

// Lecturas: sin "use server" a propósito. RLS (owns_category / owns_club) filtra lo ajeno.

/**
 * Todas las pertenencias de las categorías del club en una temporada (con y sin baja).
 * categories!inner: el embed funciona como INNER JOIN, así los filtros sobre la categoría
 * (club y temporada) descartan la pertenencia entera y no sólo el objeto embebido.
 */
export async function listSeasonMemberships(
  clubId: string,
  seasonYear: number,
): Promise<SeasonMembership<Player>[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category_players")
    .select(
      "left_on, player:players(id, first_name, last_name, birth_year), category:categories!inner(name, club_id, season_year)",
    )
    .eq("category.club_id", clubId)
    .eq("category.season_year", seasonYear);
  if (error) throw error;
  // Embeds a uno: llegan como objeto (ver MEMBERSHIP_COLUMNS en players.ts).
  return data as unknown as SeasonMembership<Player>[];
}
