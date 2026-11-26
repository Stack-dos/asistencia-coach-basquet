import { isActiveOn } from "@/domain/players";
import { createClient } from "@/lib/supabase/server";
import { listPlayers, type Player } from "./players";
import type { Session } from "./sessions";

export type AttendanceRow = { player: Player; present: boolean };

// Lectura: sin "use server" a propósito. RLS oculta lo ajeno.
/**
 * AC1 + AC3: jugadores activos en la fecha de la clase (no "hoy": alguien dado de baja después
 * sigue figurando en sus clases viejas), cada uno con si quedó guardado como presente.
 */
export async function getSessionAttendance(
  session: Session,
): Promise<AttendanceRow[]> {
  const supabase = await createClient();
  // shortcut: trae todas las pertenencias de la categoría y filtra en JS (decenas de filas por
  // temporada); si crece, filtrar por fecha en la consulta.
  const [memberships, attendances] = await Promise.all([
    listPlayers(session.category_id, { includeInactive: true }),
    supabase
      .from("attendances")
      .select("player_id")
      .eq("session_id", session.id),
  ]);
  if (attendances.error) throw attendances.error;

  const present = new Set(attendances.data.map((row) => row.player_id));
  // listPlayers ya viene ordenado por apellido.
  return memberships
    .filter((membership) => isActiveOn(membership, session.held_on))
    .map(({ player }) => ({ player, present: present.has(player.id) }));
}
