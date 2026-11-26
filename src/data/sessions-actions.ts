"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessionErrorMessage } from "@/domain/club-errors";
import { createClient } from "@/lib/supabase/server";
import { getCategory, type Category } from "./categories";

export type SessionFormState = { error?: string };

// La fecha la valida la base (formato, unique y temporada) y sessionErrorMessage la traduce.
function readHeldOn(formData: FormData): string {
  const value = formData.get("held_on");
  return typeof value === "string" ? value : "";
}

// Después de guardar, se muestra el mes de la fecha elegida (puede no ser el que se veía).
function sessionsPath(category: Category, heldOn: string) {
  return `/clubes/${category.club_id}/categorias/${category.id}/clases?mes=${heldOn.slice(0, 7)}`;
}

/** AC1, AC2, AC5. Se usa con .bind(null, categoryId). */
export async function createSession(
  categoryId: string,
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const heldOn = readHeldOn(formData);
  const category = await getCategory(categoryId);
  if (!category) return { error: sessionErrorMessage(undefined) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .insert({ category_id: categoryId, held_on: heldOn });
  if (error) return { error: sessionErrorMessage(error.code) };

  revalidatePath("/clubes", "layout");
  redirect(sessionsPath(category, heldOn));
}

/** AC3: cambiar la fecha. Se usa con .bind(null, categoryId, sessionId). */
export async function updateSessionDate(
  categoryId: string,
  sessionId: string,
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const heldOn = readHeldOn(formData);
  const category = await getCategory(categoryId);
  if (!category) return { error: sessionErrorMessage(undefined) };

  const supabase = await createClient();
  // .eq("category_id"): la clase tiene que ser de la categoría de la URL. select: para saber
  // si actualizó algo (RLS no da error, sólo no encuentra la fila).
  const { data, error } = await supabase
    .from("sessions")
    .update({ held_on: heldOn })
    .eq("id", sessionId)
    .eq("category_id", categoryId)
    .select("id");
  if (error) return { error: sessionErrorMessage(error.code) };
  if (data.length === 0) return { error: sessionErrorMessage(undefined) };

  revalidatePath("/clubes", "layout");
  redirect(sessionsPath(category, heldOn));
}

/** AC3: eliminar (confirmación simple). Se usa con .bind(null, categoryId, sessionId). */
export async function deleteSession(
  categoryId: string,
  sessionId: string,
): Promise<SessionFormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("category_id", categoryId);
  if (error) return { error: sessionErrorMessage(error.code) };

  // Se queda en la misma página: revalidar alcanza para que la clase desaparezca de la lista.
  revalidatePath("/clubes", "layout");
  return {};
}
