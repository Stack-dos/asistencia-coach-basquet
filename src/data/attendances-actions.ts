"use server";

import { revalidatePath } from "next/cache";
import { attendanceErrorMessage } from "@/domain/club-errors";
import { createClient } from "@/lib/supabase/server";

export type AttendanceFormState = { error?: string; saved?: boolean };

/**
 * AC2 + AC3: guarda los presentes de la clase (reemplaza lo anterior). Se usa con
 * .bind(null, sessionId). Los ids vienen del navegador: el trigger de la base comprueba que
 * cada uno esté en la categoría en la fecha de la clase (RN-03) y RLS que la clase sea propia.
 */
export async function saveSessionAttendance(
  sessionId: string,
  _prevState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  // Un checkbox por jugador con name="present": el form manda sólo los tildados.
  const playerIds = formData
    .getAll("present")
    .filter((value) => typeof value === "string");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_session_attendance", {
    p_session_id: sessionId,
    p_player_ids: playerIds,
  });
  if (error) return { error: attendanceErrorMessage(error.code) };

  revalidatePath("/clubes", "layout");
  return { saved: true };
}
