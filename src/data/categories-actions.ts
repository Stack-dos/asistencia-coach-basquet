"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { categoryErrorMessage } from "@/domain/club-errors";
import { createClient } from "@/lib/supabase/server";
import { readName } from "./form";

export type CategoryState = { error?: string };

// Las categorías se ven debajo de /clubes: refresca esa ruta y todas sus páginas.
function refreshClubs() {
  revalidatePath("/clubes", "layout");
}

// Se usa con .bind(null, clubId, seasonYear) desde la página del club. Los dos valores vienen
// del navegador: RLS rechaza clubes ajenos (42501) y el check, años fuera de rango (23514).
export async function createCategory(
  clubId: string,
  seasonYear: number,
  _prevState: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const result = readName(formData);
  if (!result.ok) return { error: result.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ club_id: clubId, name: result.name, season_year: seasonYear });
  if (error) return { error: categoryErrorMessage(error.code) };

  refreshClubs();
  return {};
}

// Se usa con .bind(null, categoryId). Una categoría ajena da 0 filas afectadas, sin error.
export async function renameCategory(
  categoryId: string,
  _prevState: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const result = readName(formData);
  if (!result.ok) return { error: result.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: result.name })
    .eq("id", categoryId);
  if (error) return { error: categoryErrorMessage(error.code) };

  refreshClubs();
  return {};
}

// La confirmación escribiendo el nombre (RN-07) la hace ConfirmDialog antes de llamar acá.
export async function deleteCategory(
  categoryId: string,
): Promise<CategoryState> {
  const supabase = await createClient();
  // .select devuelve la fila borrada: el club y la temporada a los que volver salen de la
  // base, no del navegador.
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .select("club_id, season_year")
    .maybeSingle();
  if (error) return { error: categoryErrorMessage(error.code) };

  refreshClubs();
  // Sin fila (no existe o es ajena): no hay club al que volver.
  redirect(
    data ? `/clubes/${data.club_id}?temporada=${data.season_year}` : "/clubes",
  );
}
