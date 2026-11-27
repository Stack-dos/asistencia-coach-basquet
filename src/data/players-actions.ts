"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leaveErrorMessage, playerErrorMessage } from "@/domain/club-errors";
import {
  isSameName,
  joinedOnError,
  leftOnError,
  parsePlayerInput,
  rejoinDateError,
  type PlayerFields,
} from "@/domain/players";
import { currentSeasonYear } from "@/domain/season";
import { createClient } from "@/lib/supabase/server";
import { getCategory } from "./categories";
import { getMembership, listClubPlayers, type Player } from "./players";

export type PlayerFormState = {
  error?: string;
  // AC6: personas del club con el mismo nombre; la UI pregunta "¿Es este jugador?".
  matches?: Player[];
  // Lo que escribió el usuario: React vacía el form después de cada envío y la UI lo vuelve a
  // cargar con esto (para no perderlo si hubo error o hay que confirmar).
  values?: PlayerFields;
};

function refreshClubs() {
  revalidatePath("/clubes", "layout");
}

// El FormData llega del navegador: cada campo puede faltar o venir como archivo.
function readPlayerFields(formData: FormData): PlayerFields {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    firstName: text("first_name"),
    lastName: text("last_name"),
    birthYear: text("birth_year"),
    joinedOn: text("joined_on"),
    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),
  };
}

function readDate(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function playersPath(clubId: string, categoryId: string) {
  return `/clubes/${clubId}/categorias/${categoryId}/jugadores`;
}

/**
 * AC1 + AC6. Se usa con .bind(null, categoryId). La temporada y el club salen de la base (no del
 * navegador). Si hay alguien con el mismo nombre en el club, no crea: devuelve `matches` para que
 * el usuario elija. El mismo form se reenvía con el botón que tocó:
 *   - existing_player_id=<id>: es esa persona → addExistingPlayer;
 *   - force=1: es otra persona → crear igual.
 */
export async function createPlayer(
  categoryId: string,
  _prevState: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const values = readPlayerFields(formData);

  // "Sí, es este jugador": se tocó el botón de una de las coincidencias.
  const existingPlayerId = formData.get("existing_player_id");
  if (typeof existingPlayerId === "string") {
    const state = await addExistingPlayer(
      categoryId,
      existingPlayerId,
      values.joinedOn,
    );
    return state.error ? { ...state, values } : state;
  }

  const category = await getCategory(categoryId);
  if (!category) return { error: playerErrorMessage(undefined), values };

  const parsed = parsePlayerInput(
    values,
    category.season_year,
    currentSeasonYear(),
  );
  if (!parsed.ok) return { error: parsed.error, values };
  const input = parsed.value;

  if (formData.get("force") !== "1") {
    const matches = (await listClubPlayers(category.club_id)).filter((p) =>
      isSameName(input, { firstName: p.first_name, lastName: p.last_name }),
    );
    if (matches.length > 0) return { matches, values };
  }

  const supabase = await createClient();
  // rpc llama a una función de Postgres: persona + pertenencia en una sola transacción.
  const { error } = await supabase.rpc("create_player", {
    p_category_id: categoryId,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_birth_year: input.birthYear,
    p_joined_on: input.joinedOn,
    p_guardian_name: input.guardianName,
    p_guardian_phone: input.guardianPhone,
  });
  if (error) return { error: playerErrorMessage(error.code), values };

  refreshClubs();
  return {};
}

/** AC6: "Sí, es este jugador": pertenencia nueva para una persona que ya está en el club. */
export async function addExistingPlayer(
  categoryId: string,
  playerId: string,
  joinedOn: string,
): Promise<PlayerFormState> {
  const category = await getCategory(categoryId);
  if (!category) return { error: playerErrorMessage(undefined) };
  const dateError = joinedOnError(joinedOn, category.season_year);
  if (dateError) return { error: dateError };

  const supabase = await createClient();
  // Que el jugador sea del mismo club lo garantiza el trigger de la base (playerId viene del
  // navegador).
  const { error } = await supabase.from("category_players").insert({
    category_id: categoryId,
    player_id: playerId,
    joined_on: joinedOn,
  });
  if (error) return { error: playerErrorMessage(error.code) };

  refreshClubs();
  return {};
}

/** AC2. Se usa con .bind(null, membershipId). */
export async function updatePlayer(
  membershipId: string,
  _prevState: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const values = readPlayerFields(formData);
  const membership = await getMembership(membershipId);
  const category = membership && (await getCategory(membership.category_id));
  if (!membership || !category) {
    return { error: playerErrorMessage(undefined), values };
  }

  const parsed = parsePlayerInput(
    values,
    category.season_year,
    currentSeasonYear(),
  );
  if (!parsed.ok) return { error: parsed.error, values };
  const input = parsed.value;

  const supabase = await createClient();
  // Dos updates sin transacción: primero el que puede fallar por reglas de la base (fecha), así
  // un error no deja el nombre cambiado y la fecha no. El segundo ya está validado.
  const membershipUpdate = await supabase
    .from("category_players")
    .update({ joined_on: input.joinedOn })
    .eq("id", membershipId);
  if (membershipUpdate.error) {
    return { error: playerErrorMessage(membershipUpdate.error.code), values };
  }

  // La persona es la misma en todas sus categorías: el cambio se ve en todas.
  const playerUpdate = await supabase
    .from("players")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      birth_year: input.birthYear,
      guardian_name: input.guardianName,
      guardian_phone: input.guardianPhone,
    })
    .eq("id", membership.player.id);
  if (playerUpdate.error) {
    return { error: playerErrorMessage(playerUpdate.error.code), values };
  }

  refreshClubs();
  redirect(playersPath(category.club_id, category.id));
}

/** AC4. Borra la pertenencia (y la persona si no le quedan otras). Confirmación simple. */
export async function deletePlayer(
  membershipId: string,
): Promise<PlayerFormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_category_player", {
    p_category_player_id: membershipId,
  });
  if (error) return { error: playerErrorMessage(error.code) };

  refreshClubs();
  // data es el jsonb de la función: de dónde era la pertenencia (sale de la base). null si no
  // había nada que borrar (ajena o inexistente).
  const deleted = data as { club_id: string; category_id: string } | null;
  redirect(
    deleted ? playersPath(deleted.club_id, deleted.category_id) : "/clubes",
  );
}

/** Estado de los forms de una sola fecha (baja y vuelta). */
export type DateFormState = { error?: string };

/**
 * US-204: dar de baja (abandono, RN-10). Cierra la pertenencia con la fecha elegida; el historial
 * queda (RN-04). Se usa con .bind(null, membershipId). El alta y la temporada salen de la base.
 */
export async function markLeft(
  membershipId: string,
  _prevState: DateFormState,
  formData: FormData,
): Promise<DateFormState> {
  const leftOn = readDate(formData, "left_on");
  const membership = await getMembership(membershipId);
  const category = membership && (await getCategory(membership.category_id));
  if (!membership || !category) return { error: leaveErrorMessage(undefined) };

  // AC1: la base también lo rechaza (check left_on >= joined_on); acá, con un mensaje claro.
  const dateError = leftOnError(
    leftOn,
    membership.joined_on,
    category.season_year,
  );
  if (dateError) return { error: dateError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("category_players")
    .update({ left_on: leftOn })
    .eq("id", membershipId);
  if (error) return { error: leaveErrorMessage(error.code) };

  refreshClubs();
  redirect(playersPath(category.club_id, category.id));
}

/**
 * US-204: "Volver a cargar" (es addExistingPlayer de US-203). Crea una pertenencia NUEVA desde la
 * fecha elegida; el período de baja queda como hueco (AC3). Se usa con .bind(null, membershipId)
 * de la pertenencia dada de baja: el jugador, la categoría y la fecha de baja salen de la base.
 */
export async function rejoinPlayer(
  membershipId: string,
  _prevState: DateFormState,
  formData: FormData,
): Promise<DateFormState> {
  const joinedOn = readDate(formData, "joined_on");
  const membership = await getMembership(membershipId);
  const category = membership && (await getCategory(membership.category_id));
  if (!membership?.left_on || !category) {
    return { error: playerErrorMessage(undefined) };
  }

  const dateError = rejoinDateError(
    joinedOn,
    membership.left_on,
    category.season_year,
  );
  if (dateError) return { error: dateError };

  // Si igual se superpone con otra pertenencia (ej. ya lo habían vuelto a cargar), la base
  // responde 23P01 y addExistingPlayer lo traduce.
  const state = await addExistingPlayer(
    category.id,
    membership.player.id,
    joinedOn,
  );
  if (state.error) return { error: state.error };

  redirect(playersPath(category.club_id, category.id));
}
