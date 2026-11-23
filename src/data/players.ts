import { createClient } from "@/lib/supabase/server";

export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: number | null;
};

/** Una pertenencia (category_players) con la persona embebida. */
export type Membership = {
  id: string;
  category_id: string;
  joined_on: string;
  left_on: string | null;
  player: Player;
};

const PLAYER_COLUMNS = "id, first_name, last_name, birth_year";
// player:players(...) es un "embed" de PostgREST: trae la fila de players a la que apunta la FK
// player_id en la misma consulta (un JOIN). Como cada pertenencia tiene un solo jugador, llega
// como objeto, no como lista. supabase-js no lo sabe (no tenemos tipos generados de la base) y
// lo tipa como lista: por eso los "as unknown as Membership".
// shortcut: casts a mano; con `supabase gen types` los tipos saldrían del esquema real.
const MEMBERSHIP_COLUMNS = `id, category_id, joined_on, left_on, player:players(${PLAYER_COLUMNS})`;

// Lecturas: sin "use server" a propósito. RLS (owns_category / owns_club) filtra lo ajeno.

/** Pertenencias de la categoría ordenadas por apellido. Por defecto, sólo activas (AC3). */
export async function listPlayers(
  categoryId: string,
  { includeInactive = false }: { includeInactive?: boolean } = {},
): Promise<Membership[]> {
  const supabase = await createClient();
  let query = supabase
    .from("category_players")
    .select(MEMBERSHIP_COLUMNS)
    .eq("category_id", categoryId);
  // Activo = sin baja marcada (left_on null). La baja la carga US-204.
  if (!includeInactive) query = query.is("left_on", null);

  const { data, error } = await query;
  if (error) throw error;
  // shortcut: ordena en JS (un plantel son decenas de filas); si crece, ordenar en la consulta.
  return (data as unknown as Membership[]).sort(byLastName);
}

/** null si no existe, es ajena (RLS) o el id no es un uuid. */
export async function getMembership(
  membershipId: string,
): Promise<Membership | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category_players")
    .select(MEMBERSHIP_COLUMNS)
    .eq("id", membershipId)
    .maybeSingle();
  // 22P02 (invalid_text_representation): el id de la URL no es un uuid.
  if (error?.code === "22P02") return null;
  if (error) throw error;
  return data as unknown as Membership | null;
}

/** Todas las personas del club: candidatas para "¿Es este jugador?" (AC6). */
export async function listClubPlayers(clubId: string): Promise<Player[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_COLUMNS)
    .eq("club_id", clubId);
  if (error) throw error;
  return data;
}

// "es" ordena "Álvarez" junto a "Alvarez" y no después de la "Z" (como haría < con códigos Unicode).
function byLastName(a: Membership, b: Membership): number {
  return (
    a.player.last_name.localeCompare(b.player.last_name, "es") ||
    a.player.first_name.localeCompare(b.player.first_name, "es") ||
    a.joined_on.localeCompare(b.joined_on)
  );
}
