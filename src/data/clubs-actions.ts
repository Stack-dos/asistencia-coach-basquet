"use server";

import { revalidatePath } from "next/cache";
import { clubErrorMessage } from "@/domain/club-errors";
import { normalizeName } from "@/domain/names";
import { createClient } from "@/lib/supabase/server";

export type ClubState = { error?: string };

// "layout" refresca /clubes y todas las páginas debajo (/clubes/[clubId]).
function refreshClubs() {
  revalidatePath("/clubes", "layout");
}

// El FormData llega del navegador: el campo puede faltar o venir como archivo.
function readName(formData: FormData) {
  const name = formData.get("name");
  if (typeof name !== "string") {
    return { ok: false as const, error: clubErrorMessage(undefined) };
  }
  return normalizeName(name);
}

export async function createClub(
  _prevState: ClubState,
  formData: FormData,
): Promise<ClubState> {
  const result = readName(formData);
  if (!result.ok) return { error: result.error };

  const supabase = await createClient();
  // coach_id no se manda: lo pone el default auth.uid() de la tabla.
  const { error } = await supabase.from("clubs").insert({ name: result.name });
  if (error) return { error: clubErrorMessage(error.code) };

  refreshClubs();
  return {};
}

// Se usa con .bind(null, clubId). El clubId también viene del navegador: no es confiable,
// pero RLS impide tocar clubes ajenos (0 filas afectadas, sin error).
export async function renameClub(
  clubId: string,
  _prevState: ClubState,
  formData: FormData,
): Promise<ClubState> {
  const result = readName(formData);
  if (!result.ok) return { error: result.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clubs")
    .update({ name: result.name })
    .eq("id", clubId);
  if (error) return { error: clubErrorMessage(error.code) };

  refreshClubs();
  return {};
}

// La confirmación escribiendo el nombre (RN-07) la hace ConfirmDialog antes de llamar acá.
export async function deleteClub(clubId: string): Promise<ClubState> {
  const supabase = await createClient();
  const { error } = await supabase.from("clubs").delete().eq("id", clubId);
  if (error) return { error: clubErrorMessage(error.code) };

  refreshClubs();
  return {};
}
