"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assignErrorMessage } from "@/domain/club-errors";
import { joinedOnError } from "@/domain/players";
import { PLAYER_FIELD } from "@/domain/seasons";
import { createClient } from "@/lib/supabase/server";
import { listCategories } from "./categories";

export type AssignState = {
  error?: string;
  // Lo elegido en el form: React lo vacía después de cada envío y la UI lo vuelve a cargar.
  values?: Record<string, string>;
};

function refreshClubs() {
  revalidatePath("/clubes", "layout");
}

/**
 * AC1: crea en `toYear` las categorías de `fromYear` con los mismos nombres. Las que ya existen
 * se omiten (ON CONFLICT DO NOTHING sobre unique(club_id, name, season_year)), así que se puede
 * tocar dos veces sin duplicar ni fallar. Se usa con .bind(null, clubId, fromYear, toYear).
 */
export async function copyCategories(
  clubId: string,
  fromYear: number,
  toYear: number,
): Promise<void> {
  const previous = await listCategories(clubId, fromYear);
  if (previous.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from("categories").upsert(
    previous.map((c) => ({
      club_id: clubId,
      name: c.name,
      season_year: toYear,
    })),
    { onConflict: "club_id,name,season_year", ignoreDuplicates: true },
  );
  // RLS (club ajeno) o año fuera de rango: no son errores del usuario; los muestra error.tsx.
  if (error) throw error;

  refreshClubs();
}

/**
 * AC2 + AC3: crea las pertenencias nuevas de los jugadores con categoría elegida; "No sigue"
 * (valor "") no crea nada. Un solo INSERT de varias filas: Postgres lo hace en una transacción,
 * o entran todas o ninguna. Se usa con .bind(null, clubId, toYear).
 */
export async function assignPlayers(
  clubId: string,
  toYear: number,
  _prevState: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string") values[key] = value;
  }

  const joinedOn = values.joined_on ?? "";
  const dateError = joinedOnError(joinedOn, toYear);
  if (dateError) return { error: dateError, values };

  // Las categorías elegidas vienen del navegador: tienen que ser de este club y esta temporada.
  // (RLS y el trigger ya impiden lo ajeno y lo de otro club; esto cubre "otra temporada".)
  const allowed = new Set(
    (await listCategories(clubId, toYear)).map((c) => c.id),
  );
  const rows = [];
  for (const [key, categoryId] of Object.entries(values)) {
    if (!key.startsWith(PLAYER_FIELD) || categoryId === "") continue;
    if (!allowed.has(categoryId)) {
      return { error: assignErrorMessage(undefined), values };
    }
    rows.push({
      category_id: categoryId,
      player_id: key.slice(PLAYER_FIELD.length),
      joined_on: joinedOn,
    });
  }
  if (rows.length === 0) {
    return {
      error: "Elegí la categoría nueva de al menos un jugador.",
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("category_players").insert(rows);
  if (error) return { error: assignErrorMessage(error.code), values };

  refreshClubs();
  redirect(`/clubes/${clubId}?temporada=${toYear}`);
}
